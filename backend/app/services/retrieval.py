from __future__ import annotations

from dataclasses import dataclass

from app.services.bm25_index import BM25IndexService
from app.services.embedding import EmbeddingService
from app.services.runtime_config import RuntimeConfig
from app.services.vector_store import VectorStoreService


@dataclass
class RetrievedChunk:
    text: str
    metadata: dict
    score: float


class RetrievalService:
    def __init__(
        self,
        embedding_service: EmbeddingService,
        vector_store: VectorStoreService,
        bm25_index: BM25IndexService,
        runtime_config: RuntimeConfig,
    ):
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.bm25_index = bm25_index
        self.runtime_config = runtime_config

    @property
    def fusion_alpha(self) -> float:
        return self.runtime_config.fusion_alpha

    @staticmethod
    def _normalize_scores(scores: dict[str, float]) -> dict[str, float]:
        if not scores:
            return {}
        values = list(scores.values())
        min_v = min(values)
        max_v = max(values)
        if abs(max_v - min_v) < 1e-9:
            return {k: 1.0 for k in scores}
        return {k: (v - min_v) / (max_v - min_v) for k, v in scores.items()}

    def retrieve(self, query: str, top_k: int, rerank: bool = True, tenant_id: str = "system_default") -> list[RetrievedChunk]:
        # Adjust top_k dynamically based on available chunks.
        available = self.vector_store.count(tenant_id=tenant_id)
        if available <= 0:
            return []
        top_k = max(1, min(int(top_k), available))

        # Never request more results than exist (avoids Chroma warnings).
        semantic_pool = min(available, max(top_k * 3, 10))
        q_emb = self.embedding_service.embed([query])[0]
        sem_result = self.vector_store.query(q_emb, semantic_pool, tenant_id=tenant_id)

        sem_docs = sem_result.get("documents", [[]])[0]
        sem_meta = sem_result.get("metadatas", [[]])[0]
        sem_ids = sem_result.get("ids", [[]])[0]

        # In Chroma, distances are lower is better. Results are already sorted by distance.
        semantic_items: dict[str, tuple[str, dict]] = {}
        semantic_ranks: dict[str, int] = {}
        for rank, (cid, txt, meta) in enumerate(zip(sem_ids, sem_docs, sem_meta), start=1):
            semantic_ranks[cid] = rank
            semantic_items[cid] = (txt, meta or {})

        keyword_ranks: dict[str, int] = {}
        if self.bm25_index.is_ready(tenant_id=tenant_id):
            kw_results = self.bm25_index.search(query, semantic_pool, tenant_id=tenant_id)
            for rank, hit in enumerate(kw_results, start=1):
                txt, meta, cid = self.bm25_index.get_chunk(hit.index, tenant_id=tenant_id)
                keyword_ranks[cid] = rank
                if cid not in semantic_items:
                    semantic_items[cid] = (txt, meta or {})

        # Reciprocal Rank Fusion (RRF)
        all_ids = set(semantic_ranks) | set(keyword_ranks)
        fused: list[RetrievedChunk] = []
        k = 60  # standard RRF constant
        alpha = self.fusion_alpha

        for cid in all_ids:
            sem_rank = semantic_ranks.get(cid)
            kw_rank = keyword_ranks.get(cid)

            sem_score = 1.0 / (k + sem_rank) if sem_rank else 0.0
            kw_score = 1.0 / (k + kw_rank) if kw_rank else 0.0

            # Weighted RRF
            score = alpha * sem_score + (1.0 - alpha) * kw_score

            text, meta = semantic_items[cid]
            fused.append(RetrievedChunk(text=text, metadata=meta, score=score))

        fused.sort(key=lambda c: c.score, reverse=True)

        if rerank:
            rerank_pool = fused[: min(len(fused), 10)]
            query_terms = set(query.lower().split())
            if query_terms:
                rerank_pool.sort(
                    key=lambda c: (c.score + 0.01 * len(query_terms.intersection(set(c.text.lower().split())))),
                    reverse=True,
                )
            fused = rerank_pool + fused[len(rerank_pool) :]

        return fused[:top_k]

    def debug_retrieve(self, query: str, top_k: int = 10, tenant_id: str = "system_default") -> dict:
        """Return the raw semantic pool, BM25 pool, and the fused RRF result side by side.

        Powers the admin Retrieval Inspector so you can literally see how dense and
        sparse signals combine under Reciprocal Rank Fusion.
        """
        available = self.vector_store.count(tenant_id=tenant_id)
        if available <= 0:
            return {"query": query, "fusion_alpha": self.fusion_alpha, "available_chunks": 0,
                    "semantic": [], "keyword": [], "fused": []}

        pool = min(available, max(top_k * 3, 10))
        q_emb = self.embedding_service.embed([query])[0]
        sem_result = self.vector_store.query(q_emb, pool, tenant_id=tenant_id)
        sem_docs = sem_result.get("documents", [[]])[0]
        sem_meta = sem_result.get("metadatas", [[]])[0]
        sem_ids = sem_result.get("ids", [[]])[0]
        sem_dist = sem_result.get("distances", [[]])[0]

        def _label(meta: dict) -> str:
            return f"{meta.get('document_name', '?')} · p{meta.get('page_number', '?')} · c{meta.get('chunk_id', '?')}"

        semantic_ranks: dict[str, int] = {}
        semantic_items: dict[str, tuple[str, dict]] = {}
        semantic_out = []
        for rank, (cid, txt, meta, dist) in enumerate(
            zip(sem_ids, sem_docs, sem_meta, sem_dist or [None] * len(sem_ids)), start=1
        ):
            meta = meta or {}
            semantic_ranks[cid] = rank
            semantic_items[cid] = (txt, meta)
            semantic_out.append({
                "rank": rank, "id": cid, "label": _label(meta),
                "distance": round(float(dist), 4) if dist is not None else None,
                "preview": (txt or "")[:220],
            })

        keyword_ranks: dict[str, int] = {}
        keyword_out = []
        if self.bm25_index.is_ready(tenant_id=tenant_id):
            for rank, hit in enumerate(self.bm25_index.search(query, pool, tenant_id=tenant_id), start=1):
                txt, meta, cid = self.bm25_index.get_chunk(hit.index, tenant_id=tenant_id)
                meta = meta or {}
                keyword_ranks[cid] = rank
                if cid not in semantic_items:
                    semantic_items[cid] = (txt, meta)
                keyword_out.append({
                    "rank": rank, "id": cid, "label": _label(meta),
                    "bm25_score": round(float(hit.score), 4),
                    "preview": (txt or "")[:220],
                })

        alpha = self.fusion_alpha
        k = 60
        fused = []
        for cid in set(semantic_ranks) | set(keyword_ranks):
            sr = semantic_ranks.get(cid)
            kr = keyword_ranks.get(cid)
            sem_score = 1.0 / (k + sr) if sr else 0.0
            kw_score = 1.0 / (k + kr) if kr else 0.0
            _, meta = semantic_items[cid]
            fused.append({
                "id": cid, "label": _label(meta),
                "semantic_rank": sr, "keyword_rank": kr,
                "semantic_contrib": round(alpha * sem_score, 6),
                "keyword_contrib": round((1.0 - alpha) * kw_score, 6),
                "fused_score": round(alpha * sem_score + (1.0 - alpha) * kw_score, 6),
            })
        fused.sort(key=lambda x: x["fused_score"], reverse=True)

        return {
            "query": query,
            "fusion_alpha": alpha,
            "available_chunks": available,
            "semantic": semantic_out[:top_k],
            "keyword": keyword_out[:top_k],
            "fused": fused[:top_k],
        }

    def available_chunks(self, tenant_id: str = "system_default") -> int:
        return self.vector_store.count(tenant_id=tenant_id)
