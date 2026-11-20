from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import UUID

from pgvector.psycopg import register_vector_async
from psycopg import AsyncConnection
from psycopg_pool import AsyncConnectionPool

from app.config import get_settings

_pool: AsyncConnectionPool | None = None


async def _configure_connection(conn: AsyncConnection) -> None:
    await register_vector_async(conn)


async def init_pool() -> AsyncConnectionPool:
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = AsyncConnectionPool(
            conninfo=settings.database_url,
            min_size=1,
            max_size=10,
            open=False,
            configure=_configure_connection,
        )
        await _pool.open()
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> AsyncConnectionPool:
    if _pool is None:
        raise RuntimeError("Pool de PostgreSQL no inicializado")
    return _pool


@asynccontextmanager
async def tenant_tx(tenant_id: UUID | str) -> AsyncIterator[AsyncConnection]:
    pool = get_pool()
    async with pool.connection() as conn:
        async with conn.transaction():
            await conn.execute(
                "SELECT set_config('app.tenant_id', %s, true)",
                (str(tenant_id),),
            )
            yield conn
