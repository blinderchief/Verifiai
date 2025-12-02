"""Database configuration - Re-exports from core.database for backwards compatibility"""

from src.core.database import (
    Base,
    engine,
    async_session_factory,
    async_session_maker,
    init_db,
    close_db,
    get_db,
    get_session,
)

__all__ = [
    "Base",
    "engine",
    "async_session_factory",
    "async_session_maker",
    "init_db",
    "close_db",
    "get_db",
    "get_session",
]
