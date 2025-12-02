"""VerifiAI Backend - Main FastAPI Application"""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from src.core.config import settings
from src.core.database import init_db, close_db
from src.core.redis import init_redis, close_redis
from src.api import router as api_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager"""
    # Startup
    logger.info("application_starting", environment=settings.ENVIRONMENT)
    
    await init_db()
    await init_redis()
    
    # Start WebSocket Redis listener in background
    try:
        from src.api.routes.websocket import start_redis_listener
        asyncio.create_task(start_redis_listener())
    except Exception as e:
        logger.warning("websocket_redis_listener_failed", error=str(e))
    
    logger.info("application_started")
    
    yield
    
    # Shutdown
    logger.info("application_shutting_down")
    await close_redis()
    await close_db()
    logger.info("application_stopped")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Trustless AI Verification Protocol on Aptos Blockchain",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )
    
    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    )
    
    # Gzip Middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("unhandled_exception", 
                    path=request.url.path, 
                    method=request.method,
                    error=str(exc))
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
    
    # Include API routes
    app.include_router(api_router, prefix=settings.API_PREFIX)
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
        }
    
    # Ready check endpoint (checks dependencies)
    @app.get("/ready")
    async def readiness_check():
        from sqlalchemy import text
        from src.core.database import async_session_factory
        from src.core.redis import get_redis
        
        checks = {
            "database": False,
            "redis": False,
        }
        
        # Check database
        try:
            async with async_session_factory() as session:
                await session.execute(text("SELECT 1"))
            checks["database"] = True
        except Exception as e:
            logger.warning("database_health_check_failed", error=str(e))
        
        # Check Redis
        try:
            redis = await get_redis()
            if redis:
                await redis.ping()
                checks["redis"] = True
        except Exception:
            pass
        
        all_ready = all(checks.values())
        
        return JSONResponse(
            status_code=200 if all_ready else 503,
            content={
                "ready": all_ready,
                "checks": checks,
            },
        )
    
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else 4,
        log_level="info",
    )
