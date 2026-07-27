from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Document Intelligence RAG"
    app_version: str = "2.0.0"
    environment: str = Field(default="development")

    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")

    # Allow environment variables to override paths (crucial for Docker/Railway Volumes)
    chroma_path: str = Field(default_factory=lambda: str(Path(__file__).resolve().parents[3] / "data" / "chroma"), alias="CHROMA_PATH")
    upload_path: str = Field(default_factory=lambda: str(Path(__file__).resolve().parents[3] / "data" / "uploads"), alias="UPLOAD_PATH")
    # SQLite lives next to the Chroma store so it follows the same persistent volume.
    sqlite_path: str = Field(default="", alias="SQLITE_PATH")
    collection_name: str = "global_documents"

    # --- Auth / security ---
    jwt_secret: str = Field(default="dev-insecure-secret-change-me", alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = Field(default=60 * 24 * 7, alias="JWT_EXPIRE_MINUTES")  # 7 days

    # Seed accounts (so the demo "just works" for recruiters/clients).
    seed_demo_email: str = Field(default="demo@rag.ai", alias="SEED_DEMO_EMAIL")
    seed_demo_password: str = Field(default="demo123", alias="SEED_DEMO_PASSWORD")
    seed_admin_email: str = Field(default="admin@rag.ai", alias="SEED_ADMIN_EMAIL")
    seed_admin_password: str = Field(default="admin123", alias="SEED_ADMIN_PASSWORD")

    # CORS: comma-separated origins. "*" allows all (dev only; disables credentials).
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    # Chunking guardrails: target 500-700 tokens, overlap 100 tokens.
    chunk_size_tokens: int = 600
    chunk_overlap_tokens: int = 100
    retrieval_top_k: int = 4
    fusion_alpha: float = 0.7

    pdf_min_page_chars: int = 100
    pdf_density_threshold: float = 0.0005

    gemini_model_name: str = "gemini-2.5-flash"
    # Low temperature keeps answers grounded and reduces embellishment / hallucination.
    gemini_temperature: float = 0.0
    gemini_timeout_seconds: int = 45

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[3] / ".env"),
        env_file_encoding="utf-8",
        populate_by_name=True,
        extra="ignore",
    )

    @property
    def resolved_sqlite_path(self) -> str:
        """SQLite path, defaulting to a file alongside the Chroma store."""
        if self.sqlite_path:
            return self.sqlite_path
        return str(Path(self.chroma_path).parent / "app.db")

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return origins or ["*"]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
