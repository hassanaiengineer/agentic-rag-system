from typing import Literal

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=5000)
    mode: Literal["qa", "summary", "insights"] = "qa"
    top_k: int | None = Field(default=None, ge=1, le=10)
