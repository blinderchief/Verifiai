"""Database configuration and session management"""

from typing import AsyncGenerator

import structlog
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from src.config import settings

logger = structlog.get_logger()


class Base(DeclarativeBase):
    """Base class for all database models"""
    pass


# Create async engine - handle missing DATABASE_URL gracefully
_database_url = settings.DATABASE_URL or "postgresql+asyncpg://postgres:password@localhost:5432/verifiai"

engine = create_async_engine(
    _database_url,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,  # Enable connection health checks
)

# Create async session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

# Alias for backwards compatibility
async_session_maker = async_session_factory


async def init_db() -> None:
    """Initialize database tables"""
    try:
        async with engine.begin() as conn:
            # In production, use Alembic migrations instead
            if settings.ENVIRONMENT == "development":
                await conn.run_sync(Base.metadata.create_all)
        logger.info("database_initialized")
    except Exception as e:
        logger.error("database_initialization_failed", error=str(e))
        if settings.ENVIRONMENT == "production":
            raise
        # In development, allow startup without DB
        logger.warning("continuing_without_database")


async def close_db() -> None:
    """Close database connections"""
    await engine.dispose()
    logger.info("database_connections_closed")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database sessions (legacy name)"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database sessions"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
