from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from app.auth.security import hash_password, verify_password
from app.core.config import get_settings
from app.db.database import get_connection


@dataclass
class User:
    id: str
    email: str
    name: str
    role: str
    tenant_id: str
    is_active: bool
    created_at: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def _row_to_user(row) -> User:
    return User(
        id=row["id"],
        email=row["email"],
        name=row["name"],
        role=row["role"],
        tenant_id=row["tenant_id"],
        is_active=bool(row["is_active"]),
        created_at=row["created_at"],
    )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_user_by_email(email: str) -> User | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email.lower().strip(),)
        ).fetchone()
    return _row_to_user(row) if row else None


def get_user_by_id(user_id: str) -> User | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _row_to_user(row) if row else None


def create_user(
    email: str,
    password: str,
    name: str = "",
    role: str = "user",
    tenant_id: str | None = None,
) -> User:
    email = email.lower().strip()
    user_id = uuid.uuid4().hex
    tenant = tenant_id or user_id
    created = _now()
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO users (id, email, name, password_hash, role, tenant_id, is_active, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, 1, ?)""",
            (user_id, email, name, hash_password(password), role, tenant, created),
        )
    return User(
        id=user_id, email=email, name=name, role=role,
        tenant_id=tenant, is_active=True, created_at=created,
    )


def authenticate(email: str, password: str) -> User | None:
    email = email.lower().strip()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        return None
    user = _row_to_user(row)
    return user if user.is_active else None


def list_users() -> list[User]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM users ORDER BY created_at ASC").fetchall()
    return [_row_to_user(r) for r in rows]


def set_user_active(user_id: str, is_active: bool) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET is_active = ? WHERE id = ?", (1 if is_active else 0, user_id)
        )


def delete_user(user_id: str) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))


def seed_default_users() -> None:
    """Create demo + admin accounts on first boot so the demo works out of the box.

    The demo account is intentionally pinned to the 'system_default' tenant so it
    inherits any documents that ship pre-indexed with the repo.
    """
    settings = get_settings()
    if get_user_by_email(settings.seed_demo_email) is None:
        create_user(
            email=settings.seed_demo_email,
            password=settings.seed_demo_password,
            name="Demo User",
            role="user",
            tenant_id="system_default",
        )
    if get_user_by_email(settings.seed_admin_email) is None:
        create_user(
            email=settings.seed_admin_email,
            password=settings.seed_admin_password,
            name="Administrator",
            role="admin",
            tenant_id="admin_workspace",
        )
