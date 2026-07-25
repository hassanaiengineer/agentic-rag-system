from __future__ import annotations

from collections import Counter
import os
from pathlib import Path

# Hard-disable telemetry (must be set before importing chromadb).
os.environ.setdefault("ANONYMIZED_TELEMETRY", "FALSE")
os.environ.setdefault("CHROMA_TELEMETRY", "FALSE")
os.environ.setdefault("CHROMA_PRODUCT_TELEMETRY", "FALSE")

import chromadb
from chromadb.api.models.Collection import Collection
from chromadb.config import Settings as ChromaSettings


class VectorStoreService:
    def __init__(self, persist_path: str, collection_name: str):
        Path(persist_path).mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=persist_path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection: Collection = self.client.get_or_create_collection(name=collection_name)

    def add_chunks(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict],
    ) -> None:
        self.collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

    def query(self, query_embedding: list[float], top_k: int, tenant_id: str = "system_default") -> dict:
        return self.collection.query(
            query_embeddings=[query_embedding], 
            n_results=top_k,
            where={"tenant_id": tenant_id}
        )

    def count(self, tenant_id: str = "system_default") -> int:
        payload = self.collection.get(where={"tenant_id": tenant_id}, include=[])
        return len(payload.get("ids", []))

    def get_all_chunks(self, tenant_id: str = "system_default") -> dict[str, list]:
        payload = self.collection.get(where={"tenant_id": tenant_id}, include=["documents", "metadatas"])
        return {
            "ids": payload.get("ids", []),
            "documents": payload.get("documents", []),
            "metadatas": payload.get("metadatas", []),
        }

    def document_exists(self, document_name: str, tenant_id: str = "system_default") -> bool:
        payload = self.collection.get(where={"$and": [{"document_name": document_name}, {"tenant_id": tenant_id}]}, include=["metadatas"])
        return len(payload.get("ids", [])) > 0

    def document_hash_exists(self, document_hash: str, tenant_id: str = "system_default") -> bool:
        payload = self.collection.get(where={"$and": [{"document_hash": document_hash}, {"tenant_id": tenant_id}]}, include=["metadatas"])
        return len(payload.get("ids", [])) > 0

    def count_by_hash(self, document_hash: str, tenant_id: str = "system_default") -> int:
        payload = self.collection.get(where={"$and": [{"document_hash": document_hash}, {"tenant_id": tenant_id}]}, include=[])
        return len(payload.get("ids", []))

    def delete_by_hash(self, document_hash: str, tenant_id: str = "system_default") -> None:
        self.collection.delete(where={"$and": [{"document_hash": document_hash}, {"tenant_id": tenant_id}]})

    def delete_by_name(self, document_name: str, tenant_id: str = "system_default") -> None:
        self.collection.delete(where={"$and": [{"document_name": document_name}, {"tenant_id": tenant_id}]})

    def list_documents(self, tenant_id: str = "system_default") -> list[dict[str, int]]:
        all_meta = self.collection.get(where={"tenant_id": tenant_id}, include=["metadatas"]).get("metadatas", [])
        names = [m.get("document_name", "unknown") for m in all_meta if isinstance(m, dict)]
        count = Counter(names)
        return [{"name": k, "chunks": v} for k, v in sorted(count.items())]
