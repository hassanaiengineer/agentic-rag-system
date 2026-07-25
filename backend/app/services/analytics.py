from __future__ import annotations

from datetime import datetime, timezone

from app.db.database import get_connection


def log_query_event(
    tenant_id: str,
    user_email: str,
    query: str,
    intent: str,
    latency_ms: float,
    num_sources: int,
) -> None:
    try:
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO query_events
                       (tenant_id, user_email, query, intent, latency_ms, num_sources, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    tenant_id,
                    user_email,
                    query[:500],
                    intent,
                    round(float(latency_ms), 2),
                    int(num_sources),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
    except Exception:
        # Analytics must never break the query path.
        pass


def get_analytics_summary() -> dict:
    with get_connection() as conn:
        total_queries = conn.execute("SELECT COUNT(*) AS c FROM query_events").fetchone()["c"]
        total_users = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        active_users = conn.execute(
            "SELECT COUNT(DISTINCT tenant_id) AS c FROM query_events"
        ).fetchone()["c"]
        avg_latency = conn.execute(
            "SELECT COALESCE(AVG(latency_ms), 0) AS a FROM query_events"
        ).fetchone()["a"]

        intent_rows = conn.execute(
            "SELECT intent, COUNT(*) AS c FROM query_events GROUP BY intent"
        ).fetchall()

        # Queries per day for the last 14 days (date is the ISO prefix).
        daily_rows = conn.execute(
            """SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS c
                   FROM query_events
                   GROUP BY day
                   ORDER BY day DESC
                   LIMIT 14"""
        ).fetchall()

        recent_rows = conn.execute(
            """SELECT query, intent, latency_ms, num_sources, user_email, created_at
                   FROM query_events
                   ORDER BY id DESC
                   LIMIT 15"""
        ).fetchall()

    return {
        "total_queries": total_queries,
        "total_users": total_users,
        "active_users": active_users,
        "avg_latency_ms": round(float(avg_latency), 2),
        "intent_breakdown": [{"intent": r["intent"] or "unknown", "count": r["c"]} for r in intent_rows],
        "daily_queries": [{"day": r["day"], "count": r["c"]} for r in reversed(daily_rows)],
        "recent_queries": [
            {
                "query": r["query"],
                "intent": r["intent"],
                "latency_ms": r["latency_ms"],
                "num_sources": r["num_sources"],
                "user_email": r["user_email"],
                "created_at": r["created_at"],
            }
            for r in recent_rows
        ],
    }
