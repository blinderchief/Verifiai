"""Application configuration using Pydantic Settings"""

from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the backend directory path
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    # Application
    APP_NAME: str = "VerifiAI Protocol"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    
    # API
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://verifiai.io"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/verifiai"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_ECHO: bool = False
    
    # Redis
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 50
    
    # Authentication - Clerk
    CLERK_SECRET_KEY: str = ""
    CLERK_FRONTEND_API: str = ""  # e.g., "clerk.your-domain.com"
    CLERK_WEBHOOK_SECRET: str = ""
    CLERK_DOMAIN: str = ""  # e.g., "integral-hare-7.clerk.accounts.dev"
    CLERK_AUDIENCE: str = ""  # Optional audience for JWT verification
    
    # Legacy JWT (for backwards compatibility)
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # Aptos Blockchain
    APTOS_NODE_URL: str = "https://fullnode.testnet.aptoslabs.com/v1"
    APTOS_FAUCET_URL: str = "https://faucet.testnet.aptoslabs.com"
    APTOS_PRIVATE_KEY: str = ""
    APTOS_ACCOUNT_ADDRESS: str = ""
    VERIFIAI_MODULE_ADDRESS: str = ""
    
    # External Services - Shelby Protocol
    SHELBY_API_URL: str = "https://rpc.testnet.shelby.xyz"
    SHELBY_API_KEY: str = ""
    
    # External Services - Photon
    PHOTON_API_URL: str = "https://stage-api.getstan.app/identity-service/api/v1"
    PHOTON_API_KEY: str = ""
    PHOTON_CAMPAIGN_ID: str = ""
    
    # Storage (S3-compatible)
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "verifiai-storage"
    S3_REGION: str = "us-east-1"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_BURST: int = 100
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_ENABLED: bool = True
    
    # Celery
    CELERY_BROKER_URL: Optional[str] = None  # Falls back to REDIS_URL
    CELERY_RESULT_BACKEND: Optional[str] = None  # Falls back to REDIS_URL
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def celery_broker(self) -> str:
        return self.CELERY_BROKER_URL or self.REDIS_URL or "redis://localhost:6379/0"
    
    @property
    def celery_backend(self) -> str:
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL or "redis://localhost:6379/0"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
