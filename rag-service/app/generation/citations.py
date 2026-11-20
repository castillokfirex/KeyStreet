import re

from app.providers.base import ContextBlock
from app.schemas import Citation

_CITE_MARKER_RE = re.compile(r"\[(\d+)\]")


def _make_snippet(content: str, max_len: int = 240) -> str:
    clean = " ".join(content.strip().split())
    if len(clean) <= max_len:
        return clean
    return clean[: max_len - 3].rstrip() + "..."


def build_verified_citations(
    answer_text: str,
    model_cited: list[int],
    context_blocks: list[ContextBlock],
) -> tuple[str, list[Citation]]:
    by_n = {b.n: b for b in context_blocks}

    in_text = [int(m) for m in _CITE_MARKER_RE.findall(answer_text)]
    valid_nums: list[int] = []
    seen: set[int] = set()
    for n in in_text + list(model_cited):
        if n in by_n and n not in seen:
            seen.add(n)
            valid_nums.append(n)

    # Eliminar del texto cualquier marcador [k] inventado que no este en los bloques recuperados
    def _filter_marker(match: re.Match[str]) -> str:
        num = int(match.group(1))
        return match.group(0) if num in by_n else ""

    cleaned_answer = _CITE_MARKER_RE.sub(_filter_marker, answer_text)
    cleaned_answer = re.sub(r"\s{2,}", " ", cleaned_answer).strip()

    citations = [
        Citation(
            n=n,
            documentId=by_n[n].document_id,
            documentTitle=by_n[n].document_title,
            pageNumber=by_n[n].page_number,
            pageEnd=by_n[n].page_end,
            sectionTitle=by_n[n].section_title,
            snippet=_make_snippet(by_n[n].content),
            chunkId=by_n[n].chunk_id,
        )
        for n in valid_nums
    ]
    return cleaned_answer, citations
