from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    documentId: UUID
    tenantId: UUID
    filePath: str
    sha256: str = Field(min_length=64, max_length=64)
    title: str = Field(min_length=1, max_length=200)


class IngestAcceptedResponse(BaseModel):
    jobId: str


class QueryRequest(BaseModel):
    tenantId: UUID
    question: str = Field(min_length=3, max_length=1000)
    userId: UUID | None = None
    sessionId: UUID | None = None
    channel: Literal["STOREFRONT", "ADMIN"] = "STOREFRONT"
    productContext: dict[str, Any] | None = None
    topK: int = Field(default=6, ge=1, le=20)
    clientIpHash: str | None = None


class Citation(BaseModel):
    n: int
    documentId: UUID
    documentTitle: str
    pageNumber: int
    pageEnd: int
    sectionTitle: str | None = None
    snippet: str
    chunkId: UUID


class QueryResponse(BaseModel):
    status: Literal["ANSWERED", "NO_EVIDENCE", "REJECTED", "ERROR"]
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    auditId: UUID | None = None
    latencyMs: int = 0
