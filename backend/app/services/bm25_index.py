from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import bm25s

from app.services.vector_store import VectorStoreService


@dataclass
class BM25Result:
    index: int
    score: float
    chunk_id: str


class BM25IndexService:
    def __init__(self, persist_dir: str = "data/bm25") -> None:
        self.persist_dir = Path(persist_dir)
        self._indexes: dict[str, bm25s.BM25] = {}
        self._documents: dict[str, list[str]] = {}
        self._metadatas: dict[str, list[dict]] = {}
        self._ids: dict[str, list[str]] = {}

    def _get_tenant_dir(self, tenant_id: str) -> Path:
        return self.persist_dir / tenant_id

    def load(self, tenant_id: str = "system_default") -> None:
        tenant_dir = self._get_tenant_dir(tenant_id)
        if not tenant_dir.exists():
            return

        try:
            self._indexes[tenant_id] = bm25s.BM25.load(str(tenant_dir), mmap=True)
            
            meta_path = tenant_dir / "index.json"
            if meta_path.exists():
                with open(meta_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._documents[tenant_id] = data.get("documents", [])
                    self._metadatas[tenant_id] = data.get("metadatas", [])
                    self._ids[tenant_id] = data.get("ids", [])
        except Exception as e:
            print(f"Error loading BM25 for tenant {tenant_id}: {e}")

    def save(self, tenant_id: str = "system_default") -> None:
        tenant_dir = self._get_tenant_dir(tenant_id)
        tenant_dir.mkdir(parents=True, exist_ok=True)
        
        if tenant_id in self._indexes and self._indexes[tenant_id] is not None:
            self._indexes[tenant_id].save(str(tenant_dir))
            
            meta_path = tenant_dir / "index.json"
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump({
                    "documents": self._documents.get(tenant_id, []),
                    "metadatas": self._metadatas.get(tenant_id, []),
                    "ids": self._ids.get(tenant_id, [])
                }, f)

    def rebuild_from_vector_store(self, vector_store: VectorStoreService, tenant_id: str = "system_default") -> None:
        payload = vector_store.get_all_chunks(tenant_id=tenant_id)
        docs = payload.get("documents", [])
        metas = payload.get("metadatas", [])
        ids = payload.get("ids", [])
        
        self._documents[tenant_id] = docs
        self._metadatas[tenant_id] = metas
        self._ids[tenant_id] = ids
        
        if docs:
            corpus_tokens = bm25s.tokenize(docs)
            retriever = bm25s.BM25()
            retriever.index(corpus_tokens)
            self._indexes[tenant_id] = retriever
        else:
            self._indexes[tenant_id] = None
            
        self.save(tenant_id)

    def is_ready(self, tenant_id: str = "system_default") -> bool:
        return tenant_id in self._indexes and self._indexes[tenant_id] is not None and bool(self._documents.get(tenant_id))

    def search(self, query: str, top_k: int, tenant_id: str = "system_default") -> list[BM25Result]:
        if not self.is_ready(tenant_id):
            return []
            
        retriever = self._indexes[tenant_id]
        query_tokens = bm25s.tokenize([query])
        
        # Adjust top_k based on corpus size
        corpus_size = len(self._documents[tenant_id])
        k = min(top_k, corpus_size)
        if k == 0:
            return []
            
        # bm25s returns (results, scores) where results are indices or documents
        results, scores = retriever.retrieve(query_tokens, k=k)
        
        output = []
        for i in range(len(results[0])):
            idx = int(results[0][i])
            score = float(scores[0][i])
            chunk_id = self._ids[tenant_id][idx]
            output.append(BM25Result(index=idx, score=score, chunk_id=chunk_id))
            
        return output

    def get_chunk(self, idx: int, tenant_id: str = "system_default") -> tuple[str, dict, str]:
        return self._documents[tenant_id][idx], self._metadatas[tenant_id][idx], self._ids[tenant_id][idx]
