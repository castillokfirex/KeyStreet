import hashlib
import hmac
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

import numpy as np
from psycopg.types.json import Jsonb

from app.config import get_settings
from app.db import tenant_tx
from app.ingestion.chunker import ChunkDraft, build_chunks
from app.ingestion.extractor import extract_pdf_pages
from app.ingestion.ocr import apply_ocr_where_needed
from app.ingestion.sections import segment_by_sections
from app.providers.base import EmbeddingProvider
from app.schemas import IngestRequest


class IngestError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class IngestOutcome:
    chunk_count: int
    page_count: int
    ocr_page_count: int
    embedding_model: str
    embedding_dim: int


def _validate_temp_path(tenant_id: UUID, raw_file_path: str, base_tmp_dir: str) -> Path:
    tenant_root = (Path(base_tmp_dir).resolve() / str(tenant_id)).resolve()
    target = Path(raw_file_path).resolve()
    if not target.is_relative_to(tenant_root):
        raise IngestError("PATH_TRAVERSAL", "Ruta de archivo fuera del directorio del tenant")
    if not target.is_file():
        raise IngestError("TEMP_FILE_MISSING", "No se encontro el archivo PDF temporal")
    return target


def _verify_sha256(path: Path, expected_hex: str) -> None:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while block := f.read(65536):
            h.update(block)
    if not hmac.compare_digest(h.hexdigest().lower(), expected_hex.lower()):
        raise IngestError("SHA256_MISMATCH", "El hash SHA-256 del archivo temporal no coincide")


async def run_ingest_pipeline(req: IngestRequest, embedder: EmbeddingProvider) -> IngestOutcome:
    settings = get_settings()
    pdf_path = _validate_temp_path(req.tenantId, req.filePath, settings.pdf_tmp_dir)
    _verify_sha256(pdf_path, req.sha256)

    pages = extract_pdf_pages(str(pdf_path))
    if not pages:
        raise IngestError("PDF_EMPTY", "El PDF no contiene paginas legibles")

    pages, ocr_page_count = await apply_ocr_where_needed(str(pdf_path), pages)
    sections = segment_by_sections(pages)
    drafts: list[ChunkDraft] = build_chunks(
        sections,
        document_id=req.documentId,
        document_title=req.title,
    )
    if not drafts:
        raise IngestError("NO_TEXT_EXTRACTED", "No se pudo extraer texto util del PDF")

    vectors = embedder.embed_documents([d.content for d in drafts])
    if len(vectors) != len(drafts):
        raise IngestError("EMBEDDING_COUNT_MISMATCH", "Conteo de embeddings inesperado")
    for v in vectors:
        if len(v) != settings.embedding_dim:
            raise IngestError("EMBEDDING_DIM_MISMATCH", f"Dimension invalida: {len(v)}")

    async with tenant_tx(req.tenantId) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM document_chunks WHERE document_id = %s",
                (str(req.documentId),),
            )
            rows = [
                (
                    str(req.tenantId),
                    str(req.documentId),
                    d.chunk_order,
                    d.content,
                    d.token_count,
                    d.page_number,
                    d.page_end,
                    d.section_title,
                    d.ocr_applied,
                    Jsonb(d.metadata),
                    np.asarray(vec, dtype=np.float32),
                    embedder.model_name,
                )
                for d, vec in zip(drafts, vectors, strict=True)
            ]
            await cur.executemany(
                """
                INSERT INTO document_chunks (
                  tenant_id, document_id, chunk_order, content, token_count,
                  page_number, page_end, section_title, ocr_applied, metadata,
                  embedding, embedding_model
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector, %s)
                """,
                rows,
            )

    return IngestOutcome(
        chunk_count=len(drafts),
        page_count=len(pages),
        ocr_page_count=ocr_page_count,
        embedding_model=embedder.model_name,
        embedding_dim=embedder.dim,
    )
