from __future__ import annotations

import json
from threading import Lock

from app.core.config import Settings
from app.db.database import get_connection

# Runtime-tunable RAG knobs. Defaults come from Settings but admins can override
# them live from the dashboard; overrides persist in the app_config SQLite table.

_ALLOWED_KEYS = {
    "fusion_alpha": float,
    "retrieval_top_k": int,
    "chunk_size_tokens": int,
    "chunk_overlap_tokens": int,
    "grader_enabled": bool,
    "max_iterations": int,
}


class RuntimeConfig:
    def __init__(self, settings: Settings):
        self._lock = Lock()
        self._values: dict = {
            "fusion_alpha": settings.fusion_alpha,
            "retrieval_top_k": max(5, settings.retrieval_top_k),
            "chunk_size_tokens": settings.chunk_size_tokens,
            "chunk_overlap_tokens": settings.chunk_overlap_tokens,
            "grader_enabled": True,
            "max_iterations": 2,
        }
        self._load()

    def _load(self) -> None:
        with get_connection() as conn:
            rows = conn.execute("SELECT key, value FROM app_config").fetchall()
        for row in rows:
            key = row["key"]
            if key in _ALLOWED_KEYS:
                try:
                    self._values[key] = json.loads(row["value"])
                except (ValueError, TypeError):
                    pass

    def to_dict(self) -> dict:
        with self._lock:
            return dict(self._values)

    def update(self, updates: dict) -> dict:
        cleaned: dict = {}
        for key, raw in updates.items():
            if key not in _ALLOWED_KEYS:
                continue
            caster = _ALLOWED_KEYS[key]
            try:
                value = caster(raw) if caster is not bool else bool(raw)
            except (ValueError, TypeError):
                continue
            cleaned[key] = self._clamp(key, value)

        with self._lock:
            self._values.update(cleaned)
            with get_connection() as conn:
                for key, value in cleaned.items():
                    conn.execute(
                        "INSERT INTO app_config (key, value) VALUES (?, ?) "
                        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                        (key, json.dumps(value)),
                    )
            return dict(self._values)

    @staticmethod
    def _clamp(key: str, value):
        if key == "fusion_alpha":
            return min(1.0, max(0.0, float(value)))
        if key == "retrieval_top_k":
            return min(20, max(1, int(value)))
        if key == "chunk_size_tokens":
            return min(700, max(500, int(value)))
        if key == "chunk_overlap_tokens":
            return min(300, max(0, int(value)))
        if key == "max_iterations":
            return min(4, max(0, int(value)))
        return value

    # Convenience accessors used across services.
    @property
    def fusion_alpha(self) -> float:
        return float(self._values["fusion_alpha"])

    @property
    def retrieval_top_k(self) -> int:
        return int(self._values["retrieval_top_k"])

    @property
    def chunk_size_tokens(self) -> int:
        return int(self._values["chunk_size_tokens"])

    @property
    def chunk_overlap_tokens(self) -> int:
        return int(self._values["chunk_overlap_tokens"])

    @property
    def grader_enabled(self) -> bool:
        return bool(self._values["grader_enabled"])

    @property
    def max_iterations(self) -> int:
        return int(self._values["max_iterations"])
