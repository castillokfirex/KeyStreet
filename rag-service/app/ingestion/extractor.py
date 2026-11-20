from dataclasses import dataclass

import pymupdf as fitz


@dataclass(frozen=True)
class TextSpan:
    text: str
    font_size: float
    is_bold: bool
    page_number: int


@dataclass(frozen=True)
class TextBlock:
    text: str
    font_size: float
    is_bold: bool
    page_number: int


@dataclass
class ExtractedPage:
    page_number: int
    blocks: list[TextBlock]
    char_count: int
    image_area_ratio: float
    width: float
    height: float
    ocr_applied: bool = False


def extract_pdf_pages(file_path: str) -> list[ExtractedPage]:
    pages: list[ExtractedPage] = []
    with fitz.open(file_path) as doc:
        for idx, page in enumerate(doc, start=1):
            rect = page.rect
            page_area = max(1.0, float(rect.width * rect.height))
            raw = page.get_text("dict")
            blocks: list[TextBlock] = []
            image_area = 0.0
            char_count = 0

            for blk in raw.get("blocks", []):
                btype = blk.get("type", 0)
                if btype == 1:  # imagen
                    bbox = blk.get("bbox", [0, 0, 0, 0])
                    w = max(0.0, float(bbox[2]) - float(bbox[0]))
                    h = max(0.0, float(bbox[3]) - float(bbox[1]))
                    image_area += w * h
                    continue
                if btype != 0:
                    continue

                lines_text: list[str] = []
                max_size = 0.0
                bold_chars = 0
                total_chars = 0
                for line in blk.get("lines", []):
                    span_parts: list[str] = []
                    for sp in line.get("spans", []):
                        txt = sp.get("text", "")
                        if not txt:
                            continue
                        span_parts.append(txt)
                        sz = float(sp.get("size", 11.0))
                        max_size = max(max_size, sz)
                        flags = int(sp.get("flags", 0))
                        font_name = str(sp.get("font", "")).lower()
                        is_b = bool(flags & 16) or "bold" in font_name or "black" in font_name
                        n = len(txt.strip())
                        total_chars += n
                        if is_b:
                            bold_chars += n
                    joined = "".join(span_parts).strip()
                    if joined:
                        lines_text.append(joined)

                block_txt = "\n".join(lines_text).strip()
                if block_txt:
                    non_ws = len("".join(block_txt.split()))
                    char_count += non_ws
                    blocks.append(
                        TextBlock(
                            text=block_txt,
                            font_size=max_size or 11.0,
                            is_bold=(total_chars > 0 and bold_chars / total_chars >= 0.6),
                            page_number=idx,
                        )
                    )

            pages.append(
                ExtractedPage(
                    page_number=idx,
                    blocks=blocks,
                    char_count=char_count,
                    image_area_ratio=min(1.0, image_area / page_area),
                    width=float(rect.width),
                    height=float(rect.height),
                )
            )
    return pages
