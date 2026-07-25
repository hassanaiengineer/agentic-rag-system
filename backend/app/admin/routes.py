from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.routes import ServiceContainer, get_container
from app.auth import service as user_service
from app.auth.dependencies import require_admin
from app.auth.service import User
from app.services.analytics import get_analytics_summary

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# --------------------------- Users ---------------------------

class AdminUser(BaseModel):
    id: str
    email: str
    name: str
    role: str
    tenant_id: str
    is_active: bool
    created_at: str
    documents: int
    chunks: int


class UpdateUserRequest(BaseModel):
    is_active: bool


@router.get("/users", response_model=list[AdminUser])
def admin_list_users(container: ServiceContainer = Depends(get_container)) -> list[AdminUser]:
    out: list[AdminUser] = []
    for u in user_service.list_users():
        docs = container.vector_store.list_documents(tenant_id=u.tenant_id)
        out.append(
            AdminUser(
                id=u.id, email=u.email, name=u.name, role=u.role,
                tenant_id=u.tenant_id, is_active=u.is_active, created_at=u.created_at,
                documents=len(docs), chunks=sum(d.get("chunks", 0) for d in docs),
            )
        )
    return out


@router.patch("/users/{user_id}")
def admin_update_user(
    user_id: str,
    payload: UpdateUserRequest,
    current_user: User = Depends(require_admin),
) -> dict[str, str]:
    target = user_service.get_user_by_id(user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    user_service.set_user_active(user_id, payload.is_active)
    return {"message": "updated"}


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: str,
    current_user: User = Depends(require_admin),
) -> dict[str, str]:
    target = user_service.get_user_by_id(user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    user_service.delete_user(user_id)
    return {"message": "deleted"}


# --------------------------- Analytics ---------------------------

@router.get("/analytics")
def admin_analytics(container: ServiceContainer = Depends(get_container)) -> dict:
    summary = get_analytics_summary()
    tenants = []
    total_docs = 0
    total_chunks = 0
    for u in user_service.list_users():
        docs = container.vector_store.list_documents(tenant_id=u.tenant_id)
        chunks = sum(d.get("chunks", 0) for d in docs)
        total_docs += len(docs)
        total_chunks += chunks
        tenants.append({"email": u.email, "tenant_id": u.tenant_id, "documents": len(docs), "chunks": chunks})
    summary["total_documents"] = total_docs
    summary["total_chunks"] = total_chunks
    summary["tenants"] = tenants
    return summary


# --------------------------- RAG Config ---------------------------

@router.get("/config")
def admin_get_config(container: ServiceContainer = Depends(get_container)) -> dict:
    return container.runtime_config.to_dict()


@router.put("/config")
def admin_update_config(
    payload: dict,
    container: ServiceContainer = Depends(get_container),
) -> dict:
    return container.runtime_config.update(payload)


# --------------------------- Retrieval Inspector ---------------------------

class InspectRequest(BaseModel):
    query: str
    tenant_id: str = "system_default"
    top_k: int = 10


@router.post("/retrieval-inspect")
def admin_retrieval_inspect(
    payload: InspectRequest,
    container: ServiceContainer = Depends(get_container),
) -> dict:
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="query is required")
    if not container.bm25.is_ready(tenant_id=payload.tenant_id):
        container.bm25.load(tenant_id=payload.tenant_id)
    return container.retrieval.debug_retrieve(
        query=payload.query, top_k=payload.top_k, tenant_id=payload.tenant_id
    )
