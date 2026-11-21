import asyncio
import io
from concurrent.futures import ProcessPoolExecutor

import pymupdf as fitz
import pytesseract
from PIL import Image

from app.ingestion.extractor import ExtractedPage, TextBlock


def needs_ocr(page: ExtractedPage) -> bool:
    return page.char_count < 50 or page.image_area_ratio > 0.80


def _ocr_png_bytes(png_bytes: bytes, lang: str = "spa+eng") -> str:
    with Image.open(io.BytesIO(png_bytes)) as img:
        text = pytesseract.image_to_string(img, lang=lang)
    return text.strip()


async def apply_ocr_where_needed(
    file_path: str, pages: list[ExtractedPage], lang: str = "spa+eng"
) -> tuple[list[ExtractedPage], int]:
    targets = [p for p in pages if needs_ocr(p)]
    if not targets:
        return pages, 0

    rendered: list[tuple[ExtractedPage, bytes]] = []
    with fitz.open(file_path) as doc:
        for p in targets:
            fitz_page = doc[p.page_number - 1]
            pix = fitz_page.get_pixmap(dpi=300, alpha=False)
            rendered.append((p, pix.tobytes("png")))

    loop = asyncio.get_running_loop()
    with ProcessPoolExecutor(max_workers=2) as pool:
        tasks = [loop.run_in_executor(pool, _ocr_png_bytes, png, lang) for _, png in rendered]
        ocr_texts = await asyncio.gather(*tasks)

    ocr_count = 0
    for (page, _), text in zip(rendered, ocr_texts, strict=True):
        if text:
            ocr_count += 1
            page.ocr_applied = True
            ocr_blocks = [
                TextBlock(
                    text=para.strip(),
                    font_size=11.0,
                    is_bold=False,
                    page_number=page.page_number,
                )
                for para in text.split("\n\n")
                if para.strip()
            ]
            if page.char_count < 50:
                page.blocks = ocr_blocks
                page.char_count = len("".join(text.split()))
            else:
                page.blocks.extend(ocr_blocks)
                page.char_count += len("".join(text.split()))

    return pages, ocr_count
