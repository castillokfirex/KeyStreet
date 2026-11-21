from uuid import UUID

from langchain_core.callbacks import AsyncCallbackManagerForRetrieverRun, CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from pydantic import ConfigDict

from app.config import get_settings
from app.db import tenant_tx
from app.providers.base import EmbeddingProvider
from app.retrieval.fusion import deduplicate_and_filter
from app.retrieval.hybrid_sql import HybridHit, run_hybrid_search


class TenantHybridRetriever(BaseRetriever):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    tenant_id: UUID
    embedder: EmbeddingProvider
    top_k: int = 6

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> list[Document]:
        raise NotImplementedError("Use async ainvoke / aget_relevant_documents")

    async def _aget_relevant_documents(
        self, query: str, *, run_manager: AsyncCallbackManagerForRetrieverRun
    ) -> list[Document]:
        settings = get_settings()
        q_vec = self.embedder.embed_query(query)
        async with tenant_tx(self.tenant_id) as conn:
            raw_hits = await run_hybrid_search(
                conn,
                query_vec=q_vec,
                query_text=query,
                tenant_id=self.tenant_id,
                embedding_model=self.embedder.model_name,
                candidate_limit=max(self.top_k * 3, 18),
            )
        selected = deduplicate_and_filter(
            raw_hits, top_k=self.top_k, min_cos_sim=settings.min_cos_sim
        )
        return [_hit_to_lc_doc(h) for h in selected]


def _hit_to_lc_doc(h: HybridHit) -> Document:
    return Document(
        page_content=h.content,
        metadata={
            "chunk_id": h.chunk_id,
            "document_id": h.document_id,
            "document_title": h.document_title,
            "page_number": h.page_number,
            "page_end": h.page_end,
            "section_title": h.section_title,
            "chunk_order": h.chunk_order,
            "rrf": h.rrf,
            "cos_sim": h.cos_sim,
            "ts_score": h.ts_score,
        },
    )
