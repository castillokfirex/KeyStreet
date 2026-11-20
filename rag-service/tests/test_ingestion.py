import hashlib
from pathlib import Path
from uuid import UUID

import pytest

from app.ingestion.chunker import build_chunks
from app.ingestion.extractor import extract_pdf_pages
from app.ingestion.ocr import needs_ocr
from app.ingestion.pipeline import IngestError, _validate_temp_path, _verify_sha256
from app.ingestion.sections import segment_by_sections
from tests.fixtures.generate_fixtures import main as generate_all

FIXTURES = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture(scope="module", autouse=True)
def ensure_fixtures() -> None:
    if not (FIXTURES / "guia_tallas.pdf").exists():
        generate_all()


def test_extractor_sections_and_chunk_ranges() -> None:
    pdf = FIXTURES / "guia_tallas.pdf"
    pages = extract_pdf_pages(str(pdf))
    assert len(pages) >= 3
    assert all(not needs_ocr(p) for p in pages)

    sections = segment_by_sections(pages)
    assert len(sections) >= 3
    titles = [s.section_title for s in sections]
    assert any("Nike" in t for t in titles)
    assert any("Adidas" in t for t in titles)

    doc_id = UUID("00000000-0000-4000-8000-000000000777")
    chunks = build_chunks(sections, document_id=doc_id, document_title="Guía de tallas 2026")
    assert len(chunks) >= 3
    orders = [c.chunk_order for c in chunks]
    assert orders == list(range(len(chunks)))
    for c in chunks:
        assert 1 <= c.token_count <= 1050
        assert c.page_number >= 1
        assert c.page_end >= c.page_number
        assert c.metadata["document"] == "Guía de tallas 2026"
        assert c.metadata["document_id"] == str(doc_id)
        assert c.section_title


def test_scanned_pdf_triggers_ocr_heuristic() -> None:
    pdf = FIXTURES / "ficha_escaneada.pdf"
    pages = extract_pdf_pages(str(pdf))
    assert len(pages) == 2
    assert all(needs_ocr(p) for p in pages)


def test_path_traversal_and_sha_mismatch_rejected(tmp_path: Path) -> None:
    tid = UUID("00000000-0000-4000-8000-000000000001")
    tdir = tmp_path / str(tid)
    tdir.mkdir()
    good = tdir / "doc.pdf"
    good.write_bytes(b"%PDF-1.4\ntest")
    outside = tmp_path / "other.pdf"
    outside.write_bytes(b"%PDF-1.4\nother")

    assert _validate_temp_path(tid, str(good), str(tmp_path)) == good.resolve()
    with pytest.raises(IngestError) as exc:
        _validate_temp_path(tid, str(outside), str(tmp_path))
    assert exc.value.code == "PATH_TRAVERSAL"

    good_sha = hashlib.sha256(good.read_bytes()).hexdigest()
    _verify_sha256(good, good_sha)
    with pytest.raises(IngestError) as sha_exc:
        _verify_sha256(good, "0" * 64)
    assert sha_exc.value.code == "SHA256_MISMATCH"
