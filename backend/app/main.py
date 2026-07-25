import os

# Disable Chroma anonymized telemetry (must happen before chromadb imports anywhere).
os.environ.setdefault("ANONYMIZED_TELEMETRY", "FALSE")
os.environ.setdefault("CHROMA_TELEMETRY", "FALSE")
os.environ.setdefault("CHROMA_PRODUCT_TELEMETRY", "FALSE")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.admin.routes import router as admin_router
from app.api.routes import router
from app.auth.routes import router as auth_router
from app.auth.service import seed_default_users
from app.core.config import get_settings
from app.db.database import init_db

settings = get_settings()

app = FastAPI(title=settings.app_name, version=settings.app_version)

# Bearer tokens (not cookies) carry auth, so wildcard CORS without credentials is fine.
_origins = settings.cors_origin_list
_allow_credentials = _origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()
    seed_default_users()


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(router)
