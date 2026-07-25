from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.auth import service
from app.auth.dependencies import get_current_user
from app.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from app.auth.security import create_access_token
from app.auth.service import User

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=user.tenant_id,
        is_active=user.is_active,
        created_at=user.created_at,
    )


def _token_response(user: User) -> TokenResponse:
    token = create_access_token(subject=user.id, extra={"role": user.role})
    return TokenResponse(access_token=token, user=_to_public(user))


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest) -> TokenResponse:
    if service.get_user_by_email(payload.email) is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = service.create_user(
        email=payload.email,
        password=payload.password,
        name=payload.name or payload.email.split("@")[0],
    )
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = service.authenticate(payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_response(user)


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return _to_public(current_user)
