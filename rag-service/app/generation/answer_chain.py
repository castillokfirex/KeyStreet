import time
from typing import Any
from uuid import UUID

import structlog

from app.audit import log_rag_audit
from app.config import get_settings
from app.db import tenant_tx
from app.generation.citations import build_verified_citations
from app.providers.base import ChatProvider, ContextBlock, EmbeddingProvider
from app.retrieval.hybrid_retriever import TenantHybridRetriever
from app.schemas import Citation, QueryRequest, QueryResponse

log = structlog.get_logger(__name__)


def _format_product_note(ctx: dict[str, Any] | None) -> str | None:
    if not ctx:
        return None
    specs = ctx.get("materialSpecs") or {}
    return (
        f"Producto: {ctx.get('name', '')} | Marca: {ctx.get('brand', '')} | "
        f"Silueta: {ctx.get('silhouette', '')} | Horma: {specs.get('fit', 'TRUE_TO_SIZE')} | "
        f"Capellada: {specs.get('upper', '')} | Suela: {specs.get('outsole', '')}"
    )


async def execute_rag_query(
    req: QueryRequest,
    embedder: EmbeddingProvider,
    chat: ChatProvider,
) -> QueryResponse:
    t0 = time.perf_counter()
    settings = get_settings()
    product_slug = str((req.productContext or {}).get("slug")) if req.productContext else None

    try:
        retriever = TenantHybridRetriever(
            tenant_id=req.tenantId,
            embedder=embedder,
            top_k=req.topK,
        )
        docs = await retriever.ainvoke(req.question)

        if not docs:
            latency = int((time.perf_counter() - t0) * 1000)
            answer = (
                "No encontré evidencia suficiente en los documentos indexados de la tienda "
                "para responder esa pregunta."
            )
            audit_id = await _save_audit(
                req,
                answer=answer,
                status="NO_EVIDENCE",
                blocks=[],
                citations=[],
                embed_model=embedder.model_name,
                chat_model=chat.model_name,
                latency_ms=latency,
                product_slug=product_slug,
            )
            return QueryResponse(
                status="NO_EVIDENCE",
                answer=answer,
                citations=[],
                auditId=audit_id,
                latencyMs=latency,
            )

        blocks = [
            ContextBlock(
                n=idx,
                chunk_id=UUID(str(d.metadata["chunk_id"])),
                document_id=UUID(str(d.metadata["document_id"])),
                document_title=str(d.metadata["document_title"]),
                page_number=int(d.metadata["page_number"]),
                page_end=int(d.metadata["page_end"]),
                section_title=d.metadata.get("section_title"),
                content=d.page_content,
                cos_sim=d.metadata.get("cos_sim"),
                ts_score=d.metadata.get("ts_score"),
                rrf=float(d.metadata.get("rrf", 0.0)),
            )
            for idx, d in enumerate(docs, start=1)
        ]

        product_note = _format_product_note(req.productContext)
        grounded = chat.grounded_answer(req.question, blocks, product_note=product_note)
        latency = int((time.perf_counter() - t0) * 1000)

        if grounded.insufficient_context:
            audit_id = await _save_audit(
                req,
                answer=grounded.answer,
                status="NO_EVIDENCE",
                blocks=blocks,
                citations=[],
                embed_model=embedder.model_name,
                chat_model=chat.model_name,
                latency_ms=latency,
                product_slug=product_slug,
            )
            return QueryResponse(
                status="NO_EVIDENCE",
                answer=grounded.answer,
                citations=[],
                auditId=audit_id,
                latencyMs=latency,
            )

        cleaned_answer, citations = build_verified_citations(
            grounded.answer, grounded.cited_sources, blocks
        )
        audit_id = await _save_audit(
            req,
            answer=cleaned_answer,
            status="ANSWERED",
            blocks=blocks,
            citations=citations,
            embed_model=embedder.model_name,
            chat_model=chat.model_name,
            latency_ms=latency,
            product_slug=product_slug,
        )
        return QueryResponse(
            status="ANSWERED",
            answer=cleaned_answer,
            citations=citations,
            auditId=audit_id,
            latencyMs=latency,
        )
    except Exception as exc:
        log.exception("rag_query_failed", tenant_id=str(req.tenantId), provider=settings.ai_provider)
        latency = int((time.perf_counter() - t0) * 1000)
        err_msg = "Ocurrió un error al consultar la base de conocimiento."
        audit_id = None
        try:
            audit_id = await _save_audit(
                req,
                answer=f"ERROR: {str(exc)[:300]}",
                status="ERROR",
                blocks=[],
                citations=[],
                embed_model=embedder.model_name,
                chat_model=chat.model_name,
                latency_ms=latency,
                product_slug=product_slug,
            )
        except Exception:
            pass
        return QueryResponse(
            status="ERROR",
            answer=err_msg,
            citations=[],
            auditId=audit_id,
            latencyMs=latency,
        )


async def _save_audit(
    req: QueryRequest,
    *,
    answer: str,
    status: str,
    blocks: list[ContextBlock],
    citations: list[Citation],
    embed_model: str,
    chat_model: str,
    latency_ms: int,
    product_slug: str | None,
) -> UUID:
    async with tenant_tx(req.tenantId) as conn:
        return await log_rag_audit(
            conn,
            tenant_id=req.tenantId,
            user_id=req.userId,
            session_id=req.sessionId,
            channel=req.channel,
            question=req.question,
            product_slug=product_slug,
            answer=answer,
            status=status,
            blocks=blocks,
            citations=citations,
            embedding_model=embed_model,
            chat_model=chat_model,
            latency_ms=latency_ms,
            client_ip_hash=req.clientIpHash,
        )
