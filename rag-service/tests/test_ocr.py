from pathlib import Path

import pytest

from app.ingestion.extractor import extract_pdf_pages
from app.ingestion.ocr import apply_ocr_where_needed
from tests.fixtures.generate_fixtures import main as generate_all

FIXTURES = Path(__file__).resolve().parent / "fixtures"


@pytest.mark.ocr
async def test_ocr_extracts_text_from_scanned_pdf() -> None:
    if not (FIXTURES / "ficha_escaneada.pdf").exists():
        generate_all()
    pdf = FIXTURES / "ficha_escaneada.pdf"
    pages = extract_pdf_pages(str(pdf))
    pages, ocr_cnt = await apply_ocr_where_needed(str(pdf), pages)
    assert ocr_cnt == 2
    full_text = "\n".join(b.text for p in pages for b in p.blocks).lower()
    assert "garantia" in full_text or "bogota" in full_text or "gamuza" in full_text
