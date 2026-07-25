from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.core.config import get_settings

# We use one connection-per-operation (opened/closed per request). SQLite handles
# this fine for an MVP and it sidesteps FastAPI's multi-threaded executor entirely.


def _db_path() -> Path:
    return Path(get_settings().resolved_sqlite_path)


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    tenant_id     TEXT NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS query_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id   TEXT NOT NULL,
    user_email  TEXT NOT NULL DEFAULT '',
    query       TEXT NOT NULL DEFAULT '',
    intent      TEXT NOT NULL DEFAULT '',
    latency_ms  REAL NOT NULL DEFAULT 0,
    num_sources INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_tenant ON query_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON query_events(created_at);
"""


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(SCHEMA)
