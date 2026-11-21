import asyncio
import uuid
from dataclasses import dataclass

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.ingestion.pipeline import IngestError, run_ingest_pipeline
from app.providers.factory import get_embedding_provider
from app.schemas import IngestRequest

log = structlog.get_logger(__name__)


@dataclass(frozen=True)
class IngestJob:
    job_id: str
    request: IngestRequest


class IngestWorkerPool:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[IngestJob] = asyncio.Queue()
        self._tasks: list[asyncio.Task[None]] = []

    async def start(self) -> None:
        if self._tasks:
            return
        concurrency = max(1, get_settings().ingest_concurrency)
        for i in range(concurrency):
            self._tasks.append(asyncio.create_task(self._worker_loop(i)))

    async def stop(self) -> None:
        for t in self._tasks:
            t.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()

    async def enqueue(self, req: IngestRequest) -> str:
        job_id = str(uuid.uuid4())
        await self._queue.put(IngestJob(job_id=job_id, request=req))
        return job_id

    async def _worker_loop(self, worker_idx: int) -> None:
        while True:
            job = await self._queue.get()
            try:
                await self._process_job(job)
            except Exception as exc:  # pragma: no cover
                log.exception("worker_unhandled_error", worker=worker_idx, error=str(exc))
            finally:
                self._queue.task_done()

    async def _process_job(self, job: IngestJob) -> None:
        req = job.request
        embedder = get_embedding_provider()
        try:
            outcome = await run_ingest_pipeline(req, embedder)
            payload = {
                "tenantId": str(req.tenantId),
                "status": "INDEXED",
                "chunkCount": outcome.chunk_count,
                "pageCount": outcome.page_count,
                "ocrPageCount": outcome.ocr_page_count,
                "embeddingModel": outcome.embedding_model,
                "embeddingDim": outcome.embedding_dim,
            }
        except IngestError as err:
            log.warning("ingest_domain_error", doc_id=str(req.documentId), code=err.code)
            payload = {
                "tenantId": str(req.tenantId),
                "status": "FAILED",
                "chunkCount": 0,
                "ocrPageCount": 0,
                "errorCode": err.code[:60],
                "errorMessage": err.message[:500],
            }
        except Exception as exc:
            log.exception("ingest_unexpected_error", doc_id=str(req.documentId))
            payload = {
                "tenantId": str(req.tenantId),
                "status": "FAILED",
                "chunkCount": 0,
                "ocrPageCount": 0,
                "errorCode": "INGEST_EXCEPTION",
                "errorMessage": str(exc)[:500],
            }

        await _send_callback(req.documentId, payload)


@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=0.5, max=4), reraise=True)
async def _send_callback(document_id: uuid.UUID, payload: dict[str, object]) -> None:
    settings = get_settings()
    url = (
        f"{settings.backend_callback_base_url.rstrip('/')}"
        f"/internal/v1/documents/{document_id}/ingestion-result"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            url,
            json=payload,
            headers={"X-Internal-Token": settings.internal_api_token},
        )
        resp.raise_for_status()


_worker_pool = IngestWorkerPool()


def get_worker_pool() -> IngestWorkerPool:
    return _worker_pool
