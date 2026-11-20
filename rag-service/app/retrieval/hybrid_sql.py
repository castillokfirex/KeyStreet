import re
from dataclasses import dataclass
from uuid import UUID

import numpy as np
from psycopg import AsyncConnection

_STOPWORDS_ES = frozenset(
    {
        "al",
        "algo",
        "como",
        "con",
        "cual",
        "cuales",
        "cuando",
        "cuanto",
        "cuantos",
        "de",
        "del",
        "donde",
        "el",
        "ella",
        "ellas",
        "ellos",
        "en",
        "entre",
        "era",
        "es",
        "esa",
        "esas",
        "ese",
        "eso",
        "esos",
        "esta",
        "están",
        "estan",
        "estas",
        "este",
        "esto",
        "estos",
        "fue",
        "ha",
        "han",
        "hay",
        "la",
        "las",
        "le",
        "les",
        "lo",
        "los",
        "mas",
        "más",
        "me",
        "mi",
        "mis",
        "muy",
        "ni",
        "no",
        "normal",
        "nos",
        "o",
        "or",
        "otra",
        "otro",
        "para",
        "pero",
        "por",
        "que",
        "qué",
        "quien",
        "se",
        "ser",
        "si",
        "sí",
        "sin",
        "sobre",
        "son",
        "su",
        "sus",
        "tan",
        "te",
        "tiene",
        "tienen",
        "tu",
        "tus",
        "un",
        "una",
        "unas",
        "uno",
        "unos",
        "y",
        "ya",
    }
)
_TOKEN_RE = re.compile(r"[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")


def _build_or_tsquery(query_text: str) -> str:
    """Convierte preguntas naturales en una consulta OR para websearch_to_tsquery.

    websearch_to_tsquery enlaza palabras sueltas con AND estricto; si una pregunta
    incluye términos conversacionales ausentes del documento (p. ej. 'normal' frente
    a 'estrecha'), la rama textual devolvería 0 filas.
    """
    seen: list[str] = []
    for raw in _TOKEN_RE.findall(query_text.lower()):
        if raw in _STOPWORDS_ES:
            continue
        if len(raw) < 2 and not raw.isdigit():
            continue
        if raw not in seen:
            seen.append(raw)
    if not seen:
        return query_text
    return " OR ".join(seen)


@dataclass(frozen=True)
class HybridHit:
    chunk_id: UUID
    document_id: UUID
    document_title: str
    content: str
    page_number: int
    page_end: int
    section_title: str | None
    chunk_order: int
    rrf: float
    cos_sim: float | None
    ts_score: float | None
    vec_rank: int | None
    text_rank: int | None


HYBRID_QUERY_SQL = """
WITH vec AS MATERIALIZED (
  SELECT id, cos_sim, row_number() OVER (ORDER BY cos_sim DESC) AS rnk FROM (
    SELECT c.id, 1 - (c.embedding <=> %(vec)s::vector) AS cos_sim
    FROM document_chunks c
    WHERE c.tenant_id = %(tenant)s::uuid AND c.embedding_model = %(model)s
    ORDER BY c.embedding <=> %(vec)s::vector
    LIMIT 30
  ) s
),
txt AS MATERIALIZED (
  SELECT id, ts_score, row_number() OVER (ORDER BY ts_score DESC) AS rnk FROM (
    SELECT c.id, ts_rank_cd(c.search_vector, websearch_to_tsquery('es_unaccent', %(query)s)) AS ts_score
    FROM document_chunks c
    WHERE c.tenant_id = %(tenant)s::uuid
      AND c.search_vector @@ websearch_to_tsquery('es_unaccent', %(query)s)
    ORDER BY ts_score DESC
    LIMIT 30
  ) s
),
fused AS (
  SELECT COALESCE(v.id, t.id) AS id,
         COALESCE(1.0 / (60 + v.rnk), 0.0) + COALESCE(1.0 / (60 + t.rnk), 0.0) AS rrf,
         v.cos_sim,
         t.ts_score,
         v.rnk AS vec_rank,
         t.rnk AS text_rank
  FROM vec v FULL OUTER JOIN txt t ON v.id = t.id
)
SELECT f.id, f.rrf, f.cos_sim, f.ts_score, f.vec_rank, f.text_rank,
       c.content, c.page_number, c.page_end, c.section_title, c.chunk_order,
       d.id AS document_id, d.title AS document_title
FROM fused f
JOIN document_chunks c ON c.id = f.id AND c.tenant_id = %(tenant)s::uuid
JOIN documents d ON d.id = c.document_id AND d.tenant_id = %(tenant)s::uuid AND d.status = 'INDEXED'
ORDER BY f.rrf DESC
LIMIT %(limit)s;
"""


async def run_hybrid_search(
    conn: AsyncConnection,
    *,
    query_vec: list[float],
    query_text: str,
    tenant_id: UUID,
    embedding_model: str,
    candidate_limit: int = 18,
) -> list[HybridHit]:
    vec_param = np.asarray(query_vec, dtype=np.float32)
    async with conn.cursor() as cur:
        await cur.execute("SET LOCAL hnsw.ef_search = 100")
        await cur.execute("SET LOCAL hnsw.iterative_scan = relaxed_order")
        ts_query = _build_or_tsquery(query_text)
        await cur.execute(
            HYBRID_QUERY_SQL,
            {
                "vec": vec_param,
                "query": ts_query,
                "tenant": str(tenant_id),
                "model": embedding_model,
                "limit": candidate_limit,
            },
        )
        rows = await cur.fetchall()

    hits: list[HybridHit] = []
    for r in rows:
        hits.append(
            HybridHit(
                chunk_id=r[0],
                rrf=float(r[1]),
                cos_sim=float(r[2]) if r[2] is not None else None,
                ts_score=float(r[3]) if r[3] is not None else None,
                vec_rank=int(r[4]) if r[4] is not None else None,
                text_rank=int(r[5]) if r[5] is not None else None,
                content=r[6],
                page_number=int(r[7]),
                page_end=int(r[8]),
                section_title=r[9],
                chunk_order=int(r[10]),
                document_id=r[11],
                document_title=r[12],
            )
        )
    return hits
