from __future__ import annotations

from typing import Sequence

import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    def __init__(self, model_name: str):
        # Force CPU to avoid CUDA warnings and ensure deterministic deployment behavior.
        self.model = SentenceTransformer(model_name, device="cpu")
        self._cache: dict[str, list[float]] = {}

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        pending: list[str] = []
        pending_idx: list[int] = []
        output: list[list[float] | None] = [None] * len(texts)

        for i, text in enumerate(texts):
            if text in self._cache:
                output[i] = self._cache[text]
            else:
                pending.append(text)
                pending_idx.append(i)

        if pending:
            vectors = self.model.encode(
                list(pending),
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            vectors = np.asarray(vectors, dtype=np.float32)
            for i, vec in enumerate(vectors.tolist()):
                txt = pending[i]
                self._cache[txt] = vec
                output[pending_idx[i]] = vec

        return [vec if vec is not None else [] for vec in output]
