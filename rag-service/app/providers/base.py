from dataclasses import dataclass
from typing import Protocol, runtime_checkable
from uuid import UUID

from pydantic import BaseModel, Field


@dataclass(frozen=True)
class ContextBlock:
    n: int
    chunk_id: UUID
    document_id: UUID
    document_title: str
    page_number: int
    page_end: int
    section_title: str | None
    content: str
    cos_sim: float | None
    ts_score: float | None
    rrf: float


class GroundedAnswer(BaseModel):
    answer: str = Field(description="Respuesta en español claro con marcadores de cita [n].")
    cited_sources: list[int] = Field(
        default_factory=list,
        description="Lista de indices [n] del contexto utilizados en la respuesta.",
    )
    insufficient_context: bool = Field(
        default=False,
        description="True si el contexto no contiene informacion suficiente para responder.",
    )


@runtime_checkable
class EmbeddingProvider(Protocol):
    model_name: str
    dim: int

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...


@runtime_checkable
class ChatProvider(Protocol):
    model_name: str

    def grounded_answer(
        self,
        question: str,
        context_blocks: list[ContextBlock],
        product_note: str | None = None,
    ) -> GroundedAnswer: ...
