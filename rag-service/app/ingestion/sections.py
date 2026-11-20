import re
from dataclasses import dataclass

import numpy as np

from app.ingestion.extractor import ExtractedPage, TextBlock

_NUM_HEADING_RE = re.compile(r"^\d+(\.\d+)*\.?\s+\S+")


@dataclass(frozen=True)
class SectionSlice:
    section_title: str
    page_start: int
    page_end: int
    ocr_applied: bool
    page_segments: list[tuple[int, str, bool]]  # (page_number, text, ocr_applied)


def _is_heading(blk: TextBlock, p85_font: float) -> bool:
    txt = " ".join(blk.text.split())
    if not txt or len(txt) > 120 or txt.endswith("."):
        return False
    words = txt.split()
    if len(words) > 14:
        return False
    if blk.font_size >= p85_font and p85_font > 11.5:
        return True
    if _NUM_HEADING_RE.match(txt) and len(words) <= 10:
        return True
    if blk.is_bold and len(words) <= 8:
        return True
    if txt.isupper() and len(txt) >= 4 and len(words) <= 8:
        return True
    return False


def segment_by_sections(pages: list[ExtractedPage]) -> list[SectionSlice]:
    all_sizes = [b.font_size for p in pages for b in p.blocks if b.text.strip()]
    p85 = float(np.percentile(all_sizes, 85)) if all_sizes else 14.0

    current_title = "Documento general"
    sections: list[SectionSlice] = []
    cur_segments: list[tuple[int, str, bool]] = []

    def flush() -> None:
        nonlocal cur_segments
        if not cur_segments:
            return
        p_start = cur_segments[0][0]
        p_end = cur_segments[-1][0]
        any_ocr = any(s[2] for s in cur_segments)
        sections.append(
            SectionSlice(
                section_title=current_title[:300],
                page_start=p_start,
                page_end=p_end,
                ocr_applied=any_ocr,
                page_segments=list(cur_segments),
            )
        )
        cur_segments = []

    for page in pages:
        for blk in page.blocks:
            if _is_heading(blk, p85):
                flush()
                current_title = " ".join(blk.text.split())[:300]
            else:
                cur_segments.append((page.page_number, blk.text, page.ocr_applied))

    flush()
    return sections
