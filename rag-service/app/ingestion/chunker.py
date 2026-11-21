from dataclasses import dataclass
from typing import Any
from uuid import UUID

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.ingestion.sections import SectionSlice
from app.ingestion.token_counter import TokenCounter


@dataclass(frozen=True)
class ChunkDraft:
    chunk_order: int
    content: str
    token_count: int
    page_number: int
    page_end: int
    section_title: str
    ocr_applied: bool
    metadata: dict[str, Any]


def build_chunks(
    sections: list[SectionSlice],
    document_id: UUID,
    document_title: str,
    target_tokens: int = 800,
    min_tokens: int = 500,
    max_tokens: int = 1000,
    overlap_tokens: int = 120,
) -> list[ChunkDraft]:
    counter = TokenCounter()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=target_tokens,
        chunk_overlap=overlap_tokens,
        length_function=counter.count,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    drafts: list[ChunkDraft] = []
    order = 0

    for sec in sections:
        # Construir texto continuo de la seccion con mapa de offsets -> pagina
        parts: list[str] = []
        spans: list[tuple[int, int, int, bool]] = []  # (start, end, page, ocr)
        cursor = 0
        for page_num, txt, ocr_flag in sec.page_segments:
            clean = txt.strip()
            if not clean:
                continue
            if parts:
                parts.append("\n\n")
                cursor += 2
            start = cursor
            parts.append(clean)
            cursor += len(clean)
            spans.append((start, cursor, page_num, ocr_flag))

        full_sec = "".join(parts).strip()
        if not full_sec:
            continue

        pieces = splitter.split_text(full_sec)
        # Fusionar cola muy corta dentro de la misma seccion si no excede max_tokens
        if len(pieces) >= 2 and counter.count(pieces[-1]) < min_tokens:
            merged = pieces[-2] + "\n" + pieces[-1]
            if counter.count(merged) <= max_tokens:
                pieces[-2] = merged
                pieces.pop()

        search_pos = 0
        for piece in pieces:
            p_text = piece.strip()
            if not p_text:
                continue
            # Acotar si algun split excediera max_tokens
            idx = full_sec.find(p_text[: min(60, len(p_text))], max(0, search_pos - 600))
            if idx < 0:
                idx = search_pos
            end_idx = idx + len(p_text)
            search_pos = idx + max(1, len(p_text) // 2)

            overlapping = [sp for sp in spans if sp[1] > idx and sp[0] < end_idx]
            if overlapping:
                p_start = overlapping[0][2]
                p_end = max(overlapping[-1][2], p_start)
                ocr_used = any(sp[3] for sp in overlapping)
            else:
                p_start = sec.page_start
                p_end = sec.page_end
                ocr_used = sec.ocr_applied

            tok_cnt = counter.count(p_text)
            drafts.append(
                ChunkDraft(
                    chunk_order=order,
                    content=p_text,
                    token_count=tok_cnt,
                    page_number=p_start,
                    page_end=p_end,
                    section_title=sec.section_title,
                    ocr_applied=ocr_used,
                    metadata={
                        "document": document_title,
                        "document_id": str(document_id),
                        "page_number": p_start,
                        "page_end": p_end,
                        "section_title": sec.section_title,
                        "chunk_order": order,
                        "ocr_applied": ocr_used,
                    },
                )
            )
            order += 1

    return drafts
