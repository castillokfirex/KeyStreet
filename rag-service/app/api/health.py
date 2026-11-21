from fastapi import APIRouter

from app.config import get_settings
from app.db import get_pool

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    settings = get_settings()
    db_status = "ok"
    try:
        pool = get_pool()
        async with pool.connection() as conn:
            await conn.execute("SELECT 1")
    except Exception:
        db_status = "error"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "provider": settings.ai_provider,
        "embeddingModel": settings.gemini_embedding_model,
        "chatModel": settings.gemini_chat_model,
        "db": db_status,
    }
