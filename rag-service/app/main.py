from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.ingest import router as ingest_router
from app.api.query import router as query_router
from app.config import get_settings
from app.db import close_pool, init_pool
from app.ingestion.worker import get_worker_pool


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    get_settings()  # valida config al arranque
    await init_pool()
    await get_worker_pool().start()
    try:
        yield
    finally:
        await get_worker_pool().stop()
        await close_pool()


app = FastAPI(title="Key Street RAG", version="0.1.0", lifespan=lifespan)
app.include_router(health_router)
app.include_router(ingest_router)
app.include_router(query_router)
