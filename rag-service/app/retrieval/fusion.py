from uuid import UUID

from app.retrieval.hybrid_sql import HybridHit


def deduplicate_and_filter(
    hits: list[HybridHit],
    *,
    top_k: int,
    min_cos_sim: float = 0.55,
) -> list[HybridHit]:
    seen_pages: set[tuple[UUID, int]] = set()
    deduped: list[HybridHit] = []
    for hit in hits:
        key = (hit.document_id, hit.page_number)
        if key in seen_pages:
            continue
        seen_pages.add(key)
        deduped.append(hit)
        if len(deduped) >= top_k:
            break

    if not has_sufficient_evidence(deduped, min_cos_sim=min_cos_sim):
        return []
    return deduped


def has_sufficient_evidence(hits: list[HybridHit], *, min_cos_sim: float) -> bool:
    for h in hits:
        if h.ts_score is not None and h.ts_score > 0:
            return True
        if h.cos_sim is not None and h.cos_sim >= min_cos_sim:
            return True
    return False
