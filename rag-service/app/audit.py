from uuid import UUID, uuid4

from psycopg import AsyncConnection
from psycopg.types.json import Jsonb

from app.providers.base import ContextBlock
from app.schemas import Citation


async def log_rag_audit(
    conn: AsyncConnection,
    *,
    tenant_id: UUID,
    user_id: UUID | None,
    session_id: UUID | None,
    channel: str,
    question: str,
    product_slug: str | None,
    answer: str,
    status: str,
    blocks: list[ContextBlock],
    citations: list[Citation],
    embedding_model: str,
    chat_model: str,
    latency_ms: int,
    client_ip_hash: str | None,
) -> UUID:
    audit_id = uuid4()
    retrieved_json = [
        {
            "chunkId": str(b.chunk_id),
            "documentId": str(b.document_id),
            "page": b.page_number,
            "rrf": round(b.rrf, 6),
            "cosSim": round(b.cos_sim, 6) if b.cos_sim is not None else None,
            "tsScore": round(b.ts_score, 6) if b.ts_score is not None else None,
        }
        for b in blocks
    ]
    citations_json = [
        {
            "n": c.n,
            "documentId": str(c.documentId),
            "title": c.documentTitle,
            "page": c.pageNumber,
            "pageEnd": c.pageEnd,
            "section": c.sectionTitle,
            "chunkId": str(c.chunkId),
        }
        for c in citations
    ]
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO rag_audit_logs (
              id, tenant_id, user_id, session_id, channel, question, product_slug,
              answer, status, retrieved, citations, embedding_model, chat_model,
              latency_ms, client_ip_hash
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                str(audit_id),
                str(tenant_id),
                str(user_id) if user_id else None,
                str(session_id) if session_id else None,
                channel,
                question,
                product_slug,
                answer,
                status,
                Jsonb(retrieved_json),
                Jsonb(citations_json),
                embedding_model,
                chat_model,
                latency_ms,
                client_ip_hash,
            ),
        )
    return audit_id
