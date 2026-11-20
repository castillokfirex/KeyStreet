from fastapi import APIRouter, Depends

from app.generation.answer_chain import execute_rag_query
from app.providers.factory import get_chat_provider, get_embedding_provider
from app.schemas import QueryRequest, QueryResponse
from app.security import verify_internal_token

router = APIRouter(prefix="/internal/v1", dependencies=[Depends(verify_internal_token)])


@router.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest) -> QueryResponse:
    return await execute_rag_query(
        req,
        embedder=get_embedding_provider(),
        chat=get_chat_provider(),
    )
