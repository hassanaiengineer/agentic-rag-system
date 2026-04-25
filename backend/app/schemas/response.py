from pydantic import BaseModel


class SourceItem(BaseModel):
    document: str
    chunk_id: int
    text: str
    score: float
    section: str | None = None
    page_number: int = 1


class QueryResponse(BaseModel):
    answer: str
    mode: str
    sources: list[SourceItem]


class UploadResponse(BaseModel):
    message: str
    document: str
    chunks_indexed: int
    processing_path: str


class DocumentItem(BaseModel):
    name: str
    chunks: int


class DocumentListResponse(BaseModel):
    documents: list[DocumentItem]
