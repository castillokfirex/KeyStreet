from fastapi import APIRouter, Depends, status

from app.ingestion.worker import get_worker_pool
from app.schemas import IngestAcceptedResponse, IngestRequest
from app.security import verify_internal_token

router = APIRouter(prefix="/internal/v1", dependencies=[Depends(verify_internal_token)])


@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED, response_model=IngestAcceptedResponse)
async def ingest(req: IngestRequest) -> IngestAcceptedResponse:
    job_id = await get_worker_pool().enqueue(req)
    return IngestAcceptedResponse(jobId=job_id)
