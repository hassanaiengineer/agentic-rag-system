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
    collection_name: str = "global_documents"

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    # Chunking guardrails: target 500-700 tokens, overlap 100 tokens.
    chunk_size_tokens: int = 600
    chunk_overlap_tokens: int = 100
    retrieval_top_k: int = 4
    fusion_alpha: float = 0.7

    pdf_min_page_chars: int = 100
    pdf_density_threshold: float = 0.0005

    gemini_model_name: str = "gemini-2.5-flash"
    gemini_temperature: float = 0.2
    gemini_timeout_seconds: int = 45

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[3] / ".env"),
        env_file_encoding="utf-8",
        populate_by_name=True,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
