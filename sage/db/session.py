"""
Async SQLAlchemy engine + session factory.

Usage:
    async with get_session() as session:
        result = await session.execute(select(Task))
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from sage.config.settings import get_settings
from sage.db.models import Base

settings = get_settings()

# aiosqlite for local dev, asyncpg for AlloyDB
_connect_args = {"check_same_thread": False} if settings.use_sqlite else {}

engine = create_async_engine(
    settings.database_url,
    echo=settings.env == "local",
    connect_args=_connect_args,
)

AsyncSessionFactory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create all tables (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
