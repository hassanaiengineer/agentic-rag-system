from __future__ import annotations

import json
import shutil
import time
import hashlib
from pathlib import Path
from typing import Any, AsyncGenerator

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from app.auth.dependencies import get_current_user
from app.auth.service import User
from app.core.config import Settings, get_settings
from app.core.logger import logger
from app.schemas.request import QueryRequest
from app.schemas.response import DocumentListResponse, UploadResponse
from app.services.analytics import log_query_event
from app.services.bm25_index import BM25IndexService
from app.services.chunking import ChunkingService
from app.services.embedding import EmbeddingService
from app.services.ingestion import IngestionService
from app.services.llm import LLMService
from app.services.retrieval import RetrievalService
from app.services.runtime_config import RuntimeConfig
from app.services.vector_store import VectorStoreService
from app.agents.graph import AgenticRAGGraph

router = APIRouter()


class ServiceContainer:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.runtime_config = RuntimeConfig(settings)
        self.vector_store = VectorStoreService(settings.chroma_path, settings.collection_name)
        self.embedding = EmbeddingService(settings.embedding_model)
        self.bm25 = BM25IndexService(persist_dir=settings.chroma_path + "/bm25")

        self.retrieval = RetrievalService(
            embedding_service=self.embedding,
            vector_store=self.vector_store,
            bm25_index=self.bm25,
            runtime_config=self.runtime_config,
        )
        self.llm = LLMService()
        self.graph = AgenticRAGGraph(retrieval_service=self.retrieval, llm_service=self.llm)
        self.ingestion = IngestionService(
            min_page_chars=settings.pdf_min_page_chars,
            density_threshold=settings.pdf_density_threshold,
        )

    def build_chunker(self) -> ChunkingService:
        # Rebuilt per-upload so live RAG-config changes take effect immediately.
        return ChunkingService(
            self.runtime_config.chunk_size_tokens,
            self.runtime_config.chunk_overlap_tokens,
        )


_CONTAINER: ServiceContainer | None = None


def get_container(settings: Settings = Depends(get_settings)) -> ServiceContainer:
    global _CONTAINER
    if _CONTAINER is None:
        _CONTAINER = ServiceContainer(settings)
    return _CONTAINER


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    container: ServiceContainer = Depends(get_container),
    current_user: User = Depends(get_current_user),
) -> UploadResponse:
    tenant_id = current_user.tenant_id
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".docx"}:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX are supported")

    settings = container.settings
    upload_dir = Path(settings.upload_path) / tenant_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    saved_path = upload_dir / (file.filename or f"upload{suffix}")

    with saved_path.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    file_hash = hashlib.sha256(saved_path.read_bytes()).hexdigest()
    if container.vector_store.document_hash_exists(file_hash, tenant_id=tenant_id):
        existing_chunks = container.vector_store.count_by_hash(file_hash, tenant_id=tenant_id)
        if existing_chunks >= 1:
            saved_path.unlink(missing_ok=True)
            return UploadResponse(
                message="Document content already indexed; skipped reprocessing",
                document=file.filename or "uploaded_document",
                chunks_indexed=existing_chunks,
                processing_path="cached",
            )
        container.vector_store.delete_by_hash(file_hash, tenant_id=tenant_id)

    ingest_start = time.perf_counter()
    structured = container.ingestion.extract_structured(saved_path)
    chunks = container.build_chunker().chunk_structured_document(structured)

    if not chunks:
        raise HTTPException(status_code=400, detail="No extractable text found in document")

    docs = [c.text for c in chunks]
    embeddings = container.embedding.embed(docs)
    ids = [f"{tenant_id}:{saved_path.stem}:{c.chunk_id}" for c in chunks]

    metas: list[dict[str, Any]] = []
    for c in chunks:
        metas.append(
            {
                "document_name": saved_path.name,
                "chunk_id": c.chunk_id,
                "section": c.section or "",
                "page_number": c.page_number,
                "processing_path": structured.processing_path,
                "document_hash": file_hash,
                "tenant_id": tenant_id,
            }
        )

    container.vector_store.add_chunks(ids=ids, embeddings=embeddings, documents=docs, metadatas=metas)
    container.bm25.rebuild_from_vector_store(container.vector_store, tenant_id=tenant_id)

    ingest_ms = round((time.perf_counter() - ingest_start) * 1000, 2)
    logger.info(
        "ingestion_complete",
        extra={
            "extra": {
                "document": saved_path.name,
                "chunks_indexed": len(chunks),
                "ingestion_ms": ingest_ms,
                "processing_path": structured.processing_path,
                "tenant_id": tenant_id,
            }
        },
    )

    return UploadResponse(
        message="Document indexed successfully",
        document=saved_path.name,
        chunks_indexed=len(chunks),
        processing_path=structured.processing_path,
    )


def _build_sources(documents: list, limit: int = 6) -> list[dict]:
    """Collapse retrieved chunks into distinct (document, page) citations."""
    seen: dict[tuple, dict] = {}
    for d in documents:
        meta = getattr(d, "metadata", {}) or {}
        key = (meta.get("document_name", "unknown"), meta.get("page_number", 1))
        score = float(getattr(d, "score", 0.0))
        if key not in seen or score > seen[key]["score"]:
            seen[key] = {
                "document": meta.get("document_name", "unknown"),
                "page_number": int(meta.get("page_number", 1) or 1),
                "section": meta.get("section") or None,
                "score": round(score, 4),
                "text": (getattr(d, "text", "") or "")[:400],
            }
    ordered = sorted(seen.values(), key=lambda s: s["score"], reverse=True)
    return ordered[:limit]


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    container: ServiceContainer = Depends(get_container),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio upload")
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio too large (max 20MB)")
    mime_type = file.content_type or "audio/wav"
    try:
        text = container.llm.transcribe(data, mime_type=mime_type)
    except Exception as e:
        logger.error("transcription_failed", extra={"extra": {"error": str(e)}})
        raise HTTPException(status_code=502, detail="Transcription failed")
    return {"text": text}


async def generate_stream(
    request: QueryRequest, container: ServiceContainer, current_user: User
) -> AsyncGenerator[str, None]:
    tenant_id = current_user.tenant_id
    started = time.perf_counter()

    docs = container.vector_store.list_documents(tenant_id=tenant_id)
    doc_names = [d["name"] for d in docs]

    state = {
        "question": request.query,
        "tenant_id": tenant_id,
        "context": "",
        "documents": [],
        "search_queries": [request.query],
        "iteration_count": 0,
        "is_relevant": False,
        "available_documents": doc_names,
    }

    final_prompt = None
    intent = "document"
    is_relevant = False
    retrieved_documents: list = []

    async for event in container.graph.app.astream_events(state, version="v2"):
        kind = event["event"]
        name = event["name"]
        if kind == "on_chain_start":
            if name != "AgenticRAGGraph" and not name.startswith("LangGraph"):
                yield f"data: {json.dumps({'type': 'node', 'node_name': name})}\n\n"
        elif kind == "on_chain_end":
            output = event["data"].get("output")
            if not isinstance(output, dict):
                continue
            if name == "classify":
                intent = output.get("intent", intent)
            elif name == "retrieve":
                retrieved_documents = output.get("documents", []) or retrieved_documents
            elif name == "grade_context":
                is_relevant = output.get("is_relevant", is_relevant)
            elif name == "generate" and "question" in output:
                final_prompt = output["question"]

    # Emit citations for genuine document answers (not chit-chat / not-found).
    sources = _build_sources(retrieved_documents) if (intent == "document" and is_relevant) else []
    if sources:
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

    if final_prompt:
        try:
            async for chunk in container.llm.chat_model.astream(final_prompt):
                if chunk.content:
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'token', 'content': f'\\n\\n[Error: {str(e)}]'})}\n\n"

    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    log_query_event(
        tenant_id=tenant_id,
        user_email=current_user.email,
        query=request.query,
        intent=intent,
        latency_ms=latency_ms,
        num_sources=len(sources),
    )

    yield "data: [DONE]\n\n"


@router.post("/query")
async def query_documents(
    request: QueryRequest,
    container: ServiceContainer = Depends(get_container),
    current_user: User = Depends(get_current_user),
):
    tenant_id = current_user.tenant_id
    if not container.bm25.is_ready(tenant_id=tenant_id):
        container.bm25.load(tenant_id=tenant_id)

    return StreamingResponse(
        generate_stream(request, container, current_user),
        media_type="text/event-stream",
    )


@router.get("/documents", response_model=DocumentListResponse)
def list_documents(
    container: ServiceContainer = Depends(get_container),
    current_user: User = Depends(get_current_user),
) -> DocumentListResponse:
    docs = container.vector_store.list_documents(tenant_id=current_user.tenant_id)
    return DocumentListResponse(documents=docs)


@router.get("/files/{document_name}")
def get_document_file(
    document_name: str,
    container: ServiceContainer = Depends(get_container),
    current_user: User = Depends(get_current_user),
):
    # Only ever resolve a bare filename inside the caller's own tenant directory.
    safe_name = Path(document_name).name
    file_path = Path(container.settings.upload_path) / current_user.tenant_id / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    media_type = "application/pdf" if file_path.suffix.lower() == ".pdf" else "application/octet-stream"
    return FileResponse(str(file_path), media_type=media_type, filename=safe_name)


@router.delete("/documents/{document_name}")
def delete_document(
    document_name: str,
    container: ServiceContainer = Depends(get_container),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    tenant_id = current_user.tenant_id
    if not container.vector_store.document_exists(document_name, tenant_id=tenant_id):
        raise HTTPException(status_code=404, detail="Document not found")

    container.vector_store.delete_by_name(document_name, tenant_id=tenant_id)
    # Best-effort removal of the stored original too.
    stored = Path(container.settings.upload_path) / tenant_id / Path(document_name).name
    stored.unlink(missing_ok=True)
    # Rebuild BM25 index after deletion to keep it in sync
    container.bm25.rebuild_from_vector_store(container.vector_store, tenant_id=tenant_id)

    return {"message": f"Document {document_name} deleted successfully"}
