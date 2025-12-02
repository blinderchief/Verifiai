"""API dependencies for authentication and authorization"""

from typing import Optional
from uuid import UUID

import jwt
import httpx
import structlog
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.core.config import settings
from src.models.user import User

logger = structlog.get_logger()

# JWKS client for Clerk token verification
_jwks_client = None


def get_jwks_client():
    """Get or create JWKS client for Clerk"""
    global _jwks_client
    if _jwks_client is None:
        try:
            from jwt import PyJWKClient
            _jwks_client = PyJWKClient(
                f"https://{settings.CLERK_FRONTEND_API}/.well-known/jwks.json",
                cache_keys=True,
                max_cached_keys=16,
            )
        except Exception as e:
            logger.error("jwks_client_init_error", error=str(e))
    return _jwks_client


async def verify_clerk_token(token: str) -> Optional[dict]:
    """Verify Clerk JWT token and return claims"""
    try:
        jwks_client = get_jwks_client()
        if not jwks_client:
            logger.error("jwks_client_not_available")
            return None
        
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.CLERK_FRONTEND_API,
            options={"verify_exp": True},
        )
        
        return payload
    
    except jwt.ExpiredSignatureError:
        logger.warning("token_expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("token_invalid", error=str(e))
        return None
    except Exception as e:
        logger.error("token_verification_error", error=str(e))
        return None


async def get_current_user(
    authorization: str = Header(..., description="Bearer token"),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Get current authenticated user from JWT token"""
    
    # Extract token from header
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    # Verify token with Clerk
    claims = await verify_clerk_token(token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    clerk_id = claims.get("sub")
    if not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )
    
    # Look up user by clerk_id (stored in settings JSON or a dedicated column)
    result = await session.execute(
        select(User).where(
            User.settings["clerk_id"].astext == clerk_id
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Auto-create user on first login
        user = User(
            email=claims.get("email", f"{clerk_id}@clerk.local"),
            username=claims.get("username") or clerk_id[:16],
            hashed_password="clerk_managed",  # Clerk handles passwords
            is_verified=claims.get("email_verified", False),
            full_name=claims.get("name"),
            avatar_url=claims.get("image_url"),
            settings={"clerk_id": clerk_id},
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        logger.info("user_auto_created", user_id=str(user.id), clerk_id=clerk_id)
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    
    return user


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization, session)
    except HTTPException:
        return None


async def verify_ws_token(token: str) -> Optional[User]:
    """Verify WebSocket token and return user"""
    claims = await verify_clerk_token(token)
    if not claims:
        return None
    
    clerk_id = claims.get("sub")
    if not clerk_id:
        return None
    
    # Get user from database
    from src.core.database import async_session_factory
    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(
                User.settings["clerk_id"].astext == clerk_id
            )
        )
        user = result.scalar_one_or_none()
        
        if user and user.is_active:
            return user
    
    return None


def require_superuser(user: User = Depends(get_current_user)) -> User:
    """Require superuser privileges"""
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required",
        )
    return user


def require_verified(user: User = Depends(get_current_user)) -> User:
    """Require verified email"""
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required",
        )
    return user


class RateLimitDependency:
    """Rate limiting dependency"""
    
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def __call__(
        self,
        user: User = Depends(get_current_user),
    ):
        from src.core.redis import rate_limiter
        
        identifier = f"user:{user.id}"
        allowed, remaining, reset_in = await rate_limiter.is_allowed(
            identifier,
            self.max_requests,
            self.window_seconds,
        )
        
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Reset": str(reset_in),
                },
            )
        
        return user


# Common rate limiters
rate_limit_standard = RateLimitDependency(max_requests=60, window_seconds=60)
rate_limit_strict = RateLimitDependency(max_requests=10, window_seconds=60)
rate_limit_relaxed = RateLimitDependency(max_requests=200, window_seconds=60)
