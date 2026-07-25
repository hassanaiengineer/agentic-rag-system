from __future__ import annotations

import hashlib
import time

from app.core.logger import logger
from app.schemas.response import QueryResponse, SourceItem
from app.services.llm import LLMService
from app.services.prompt_engine import PromptEngine
from app.services.retrieval import RetrievalService, RetrievedChunk


class QAEngine:
    def __init__(self, retrieval_service: RetrievalService, llm_service: LLMService, max_context_chars: int = 12000):
        self.retrieval_service = retrieval_service
        self.llm_service = llm_service
        self.max_context_chars = max_context_chars

    def _deduplicate_chunks(self, chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
        seen: set[str] = set()
        deduped: list[RetrievedChunk] = []
        for chunk in chunks:
            signature = hashlib.md5(chunk.text.encode("utf-8", errors="ignore")).hexdigest()
            if signature in seen:
                continue
            seen.add(signature)
            deduped.append(chunk)
        return deduped

    def _build_context(self, chunks: list[RetrievedChunk]) -> tuple[str, list[RetrievedChunk]]:
        selected: list[RetrievedChunk] = []
        context_parts: list[str] = []
        current_size = 0

        for item in chunks:
            block = (
                f"[doc={item.metadata.get('document_name', 'unknown')} "
                f"page={item.metadata.get('page_number', '?')} "
                f"chunk={item.metadata.get('chunk_id', -1)}]\n{item.text}"
            )
            block_len = len(block)
            if current_size + block_len > self.max_context_chars and selected:
                break
            selected.append(item)
            context_parts.append(block)
            current_size += block_len

        return "\n\n---\n\n".join(context_parts), selected

    def run(self, query: str, mode: str, top_k: int) -> QueryResponse:
        retrieval_start = time.perf_counter()
        available = self.retrieval_service.available_chunks()
        top_k_used = max(1, min(int(top_k), max(available, 1)))
        retrieved = self.retrieval_service.retrieve(query=query, top_k=top_k_used)
        retrieved = self._deduplicate_chunks(retrieved)
        context, selected_sources = self._build_context(retrieved)

        retrieval_ms = round((time.perf_counter() - retrieval_start) * 1000, 2)
        logger.info(
            "retrieval_complete",
            extra={
                "extra": {
                    "retrieval_ms": retrieval_ms,
                    "chunks": len(selected_sources),
                    "context_chars": len(context),
                    "top_k_used": top_k_used,
                    "available_chunks": available,
                }
            },
        )

        if not context.strip():
            return QueryResponse(answer="NOT FOUND", mode=mode, sources=[])

        prompt = PromptEngine.build_messages(mode=mode, query=query, context=context)

        llm_start = time.perf_counter()
        answer = self.llm_service.generate(prompt)
        llm_ms = round((time.perf_counter() - llm_start) * 1000, 2)
        logger.info("llm_complete", extra={"extra": {"llm_ms": llm_ms, "mode": mode}})

        sources = [
            SourceItem(
                document=item.metadata.get("document_name", "unknown"),
                chunk_id=int(item.metadata.get("chunk_id", -1)),
                text=item.text,
                score=round(item.score, 4),
                section=item.metadata.get("section") or None,
                page_number=int(item.metadata.get("page_number", 1)),
            )
            for item in selected_sources
        ]

        return QueryResponse(answer=answer, mode=mode, sources=sources)
