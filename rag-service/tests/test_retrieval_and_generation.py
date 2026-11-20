from pathlib import Path
from uuid import UUID, uuid4

import psycopg
import pytest
from testcontainers.postgres import PostgresContainer

from app.config import get_settings
from app.db import close_pool, init_pool
from app.generation.answer_chain import execute_rag_query
from app.generation.citations import build_verified_citations
from app.providers.base import ChatProvider, ContextBlock, GroundedAnswer
from app.providers.fake import FakeChatProvider, FakeEmbeddingProvider
from app.schemas import QueryRequest

TENANT_A = UUID("00000000-0000-4000-8000-000000000001")
TENANT_B = UUID("00000000-0000-4000-8000-000000000002")


def _locate_schema_sql() -> Path:
    p = Path(__file__).resolve()
    for parent in p.parents:
        candidate = parent / "db" / "schema.sql"
        if candidate.exists():
            return candidate
    raise FileNotFoundError("db/schema.sql no encontrado")


@pytest.fixture(scope="module")
def pg_container():
    with PostgresContainer("pgvector/pgvector:pg16") as pg:
        raw_url = pg.get_connection_url().replace("postgresql+psycopg2://", "postgresql://")
        schema_sql = _locate_schema_sql().read_text(encoding="utf-8")
        with psycopg.connect(raw_url, autocommit=True) as conn:
            conn.execute(
                "CREATE ROLE keystreet_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD 'app_pw';"
                "CREATE ROLE keystreet_rag LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD 'rag_pw';"
            )
            conn.execute(schema_sql)
            conn.execute(
                """
                INSERT INTO tenants (id, slug, name, whatsapp_phone)
                VALUES
                  ('00000000-0000-4000-8000-000000000001', 'key-street', 'Key Street', '573000000000'),
                  ('00000000-0000-4000-8000-000000000002', 'tenant-b', 'Tienda B', '573111111111');
                """
            )
            emb = FakeEmbeddingProvider(model_name="fake-emb", dim=768)
            doc_a = UUID("00000000-0000-4000-8000-000000000a01")
            doc_b = UUID("00000000-0000-4000-8000-000000000b01")
            conn.execute(
                """
                INSERT INTO documents (
                  id, tenant_id, title, original_filename, size_bytes, sha256_hash,
                  status, page_count, chunk_count, embedding_model, embedding_dim
                )
                VALUES
                  (%s, %s, 'Guía de tallas 2026', 'guia.pdf', 1234, repeat('a', 64), 'INDEXED', 5, 1, 'fake-emb', 768),
                  (%s, %s, 'Secreto Tenant B', 'b.pdf', 1234, repeat('b', 64), 'INDEXED', 2, 1, 'fake-emb', 768)
                """,
                (str(doc_a), str(TENANT_A), str(doc_b), str(TENANT_B)),
            )
            text_a = "Guía oficial: el Adidas Samba OG tiene horma estrecha y se recomienda subir una talla."
            text_b = "Documento confidencial exclusivo de Tienda B sobre zapatillas Reebok Classic."
            vec_a = "[" + ",".join(f"{x:.6f}" for x in emb.embed_documents([text_a])[0]) + "]"
            vec_b = "[" + ",".join(f"{x:.6f}" for x in emb.embed_documents([text_b])[0]) + "]"
            conn.execute(
                """
                INSERT INTO document_chunks (
                  tenant_id, document_id, chunk_order, content, token_count,
                  page_number, page_end, section_title, embedding, embedding_model
                )
                VALUES
                  (%s, %s, 0, %s, 550, 4, 4, 'Adidas — Horma', %s::vector(768), 'fake-emb'),
                  (%s, %s, 0, %s, 550, 1, 1, 'Privado B', %s::vector(768), 'fake-emb')
                """,
                (str(TENANT_A), str(doc_a), text_a, vec_a, str(TENANT_B), str(doc_b), text_b, vec_b),
            )
        rag_url = raw_url.replace(
            f"{pg.username}:{pg.password}@",
            "keystreet_rag:rag_pw@",
        )
        app_url = raw_url.replace(
            f"{pg.username}:{pg.password}@",
            "keystreet_app:app_pw@",
        )
        yield (rag_url, app_url)


async def test_hybrid_search_tenant_isolation_unaccent_no_evidence_and_audit(
    pg_container: tuple[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    rag_url, app_url = pg_container
    monkeypatch.setenv("DATABASE_URL", rag_url)
    monkeypatch.setenv("AI_PROVIDER", "fake")
    monkeypatch.setenv("GEMINI_EMBEDDING_MODEL", "fake-emb")
    monkeypatch.setenv("MIN_COS_SIM", "0.55")
    get_settings.cache_clear()
    await init_pool()
    try:
        embedder = FakeEmbeddingProvider(model_name="fake-emb", dim=768)
        chat = FakeChatProvider()

        # 1. Consulta sin tildes ("guia Samba") encuentra chunk de tenant A con citas reales
        res_a = await execute_rag_query(
            QueryRequest(tenantId=TENANT_A, question="¿La guia indica si el Samba tiene horma estrecha?"),
            embedder=embedder,
            chat=chat,
        )
        assert res_a.status == "ANSWERED"
        assert len(res_a.citations) == 1
        assert res_a.citations[0].documentTitle == "Guía de tallas 2026"
        assert res_a.citations[0].pageNumber == 4
        assert res_a.citations[0].sectionTitle == "Adidas — Horma"
        assert res_a.auditId is not None

        # 1b. Término ausente ('amplia') no rompe FTS y pregunta fuera de dominio da NO_EVIDENCE
        res_extra = await execute_rag_query(
            QueryRequest(tenantId=TENANT_A, question="¿El Adidas Samba OG tiene horma estrecha o amplia?"),
            embedder=embedder,
            chat=chat,
        )
        assert res_extra.status == "ANSWERED"
        assert len(res_extra.citations) == 1
        assert res_extra.citations[0].pageNumber == 4

        res_oob = await execute_rag_query(
            QueryRequest(tenantId=TENANT_A, question="¿Cuanto cuesta una pizza napolitana?"),
            embedder=embedder,
            chat=chat,
        )
        assert res_oob.status == "NO_EVIDENCE"
        assert res_oob.citations == []

        # 2. Tenant B nunca recibe fragmentos del documento de Tenant A
        res_b = await execute_rag_query(
            QueryRequest(tenantId=TENANT_B, question="¿La guia indica si el Samba tiene horma estrecha?"),
            embedder=embedder,
            chat=chat,
        )
        assert res_b.status == "NO_EVIDENCE"
        assert res_b.citations == []

        # 3. Verificar fila de auditoria en rag_audit_logs bajo RLS como keystreet_app
        with psycopg.connect(app_url) as conn:
            conn.execute("SELECT set_config('app.tenant_id', %s, true)", (str(TENANT_A),))
            row = conn.execute(
                "SELECT status, jsonb_array_length(citations) FROM rag_audit_logs WHERE id = %s",
                (str(res_a.auditId),),
            ).fetchone()
        assert row == ("ANSWERED", 1)
    finally:
        await close_pool()
        get_settings.cache_clear()


class _HallucinatingChat(ChatProvider):
    model_name = "hallucinating-mock"

    def grounded_answer(
        self, question: str, context_blocks: list[ContextBlock], product_note: str | None = None
    ) -> GroundedAnswer:
        return GroundedAnswer(
            answer="El par talla estrecho [1] y tambien viene en caja dorada [99].",
            cited_sources=[1, 99],
            insufficient_context=False,
        )


def test_hallucinated_citations_are_discarded() -> None:
    blk = ContextBlock(
        n=1,
        chunk_id=uuid4(),
        document_id=uuid4(),
        document_title="Guía de tallas 2026",
        page_number=4,
        page_end=4,
        section_title="Adidas — Horma",
        content="Samba OG tiene horma estrecha.",
        cos_sim=0.8,
        ts_score=0.4,
        rrf=0.03,
    )
    ans = _HallucinatingChat().grounded_answer("¿Como talla?", [blk])
    cleaned, cites = build_verified_citations(ans.answer, ans.cited_sources, [blk])
    assert "[99]" not in cleaned
    assert "[1]" in cleaned
    assert [c.n for c in cites] == [1]
