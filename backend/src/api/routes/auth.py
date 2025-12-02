"""Authentication routes with Clerk integration"""

from datetime import datetime, timedelta
from typing import Annotated, Optional
import json
import httpx
import jwt
from jwt import PyJWTError as JWTError
from jwt.algorithms import RSAAlgorithm

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.models.user import User

router = APIRouter()
# Make security optional in debug mode - allows requests without auth header
security = HTTPBearer(auto_error=not settings.DEBUG)


# Clerk JWKS cache
_jwks_cache: dict = {}
_jwks_cache_time: Optional[datetime] = None
JWKS_CACHE_TTL = timedelta(hours=1)


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: str
    exp: int
    iat: int
    azp: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema"""
    id: str
    clerk_id: str
    email: Optional[str]
    name: Optional[str]
    avatar_url: Optional[str]
    wallet_address: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """User creation from Clerk webhook"""
    clerk_id: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None


async def get_clerk_jwks() -> dict:
    """Fetch Clerk JWKS with caching"""
    global _jwks_cache, _jwks_cache_time
    
    now = datetime.utcnow()
    if _jwks_cache and _jwks_cache_time and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://{settings.CLERK_DOMAIN}/.well-known/jwks.json"
        )
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = now
        return _jwks_cache


async def verify_clerk_token(token: str) -> TokenPayload:
    """Verify Clerk JWT token"""
    try:
        # For development, allow mock tokens
        if settings.DEBUG and token.startswith("dev_"):
            return TokenPayload(
                sub=f"user_{token[4:]}",
                exp=int((datetime.utcnow() + timedelta(hours=24)).timestamp()),
                iat=int(datetime.utcnow().timestamp()),
            )
        
        # Get JWKS and verify token
        jwks = await get_clerk_jwks()
        
        # Decode header to get key ID
        unverified_header = jwt.get_unverified_header(token)
        
        # Find matching key
        rsa_key = None
        for key in jwks.get("keys", []):
            if key["kid"] == unverified_header["kid"]:
                # Convert JWK to RSA public key using PyJWT's RSAAlgorithm
                rsa_key = RSAAlgorithm.from_jwk(json.dumps(key))
                break
        
        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate key",
            )
        
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.CLERK_AUDIENCE,
            options={"verify_aud": bool(settings.CLERK_AUDIENCE)},
        )
        
        return TokenPayload(**payload)
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
        )


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Get current user if authenticated, None otherwise (for dev mode)"""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        # In debug mode, return a dev user if no auth header
        if settings.DEBUG:
            # Get or create dev user - clerk_id is stored in settings JSONB
            result = await db.execute(
                select(User).where(
                    User.settings["clerk_id"].astext == "dev_user"
                )
            )
            user = result.scalar_one_or_none()
            if not user:
                user = User(
                    email="dev@verifiai.local",
                    username="dev_user",
                    hashed_password="dev_mode",
                    full_name="Development User",
                    settings={"clerk_id": "dev_user"},
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
            return user
        return None
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            return None
    except ValueError:
        return None
    
    try:
        token_payload = await verify_clerk_token(token)
        
        # Find or create user - clerk_id is stored in settings JSONB
        result = await db.execute(
            select(User).where(
                User.settings["clerk_id"].astext == token_payload.sub
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                email=token_payload.email or f"{token_payload.sub}@clerk.local",
                username=token_payload.sub[:20],
                hashed_password="clerk_auth",
                full_name=token_payload.name or "Clerk User",
                avatar_url=token_payload.picture,
                settings={"clerk_id": token_payload.sub},
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        return user if user.is_active else None
    except HTTPException:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user"""
    # In DEBUG mode without credentials, use dev user
    if not credentials:
        if settings.DEBUG:
            # Get or create dev user - clerk_id is stored in settings JSONB
            result = await db.execute(
                select(User).where(
                    User.settings["clerk_id"].astext == "dev_user"
                )
            )
            user = result.scalar_one_or_none()
            if not user:
                user = User(
                    email="dev@verifiai.local",
                    username="dev_user",
                    hashed_password="dev_mode",
                    full_name="Development User",
                    settings={"clerk_id": "dev_user"},
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    
    token_payload = await verify_clerk_token(credentials.credentials)
    
    # Find or create user - clerk_id is stored in settings JSONB
    result = await db.execute(
        select(User).where(
            User.settings["clerk_id"].astext == token_payload.sub
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Auto-create user on first API call
        user = User(
            email=token_payload.email or f"{token_payload.sub}@clerk.local",
            username=token_payload.sub[:20],
            hashed_password="clerk_auth",
            full_name=token_payload.name or "Clerk User",
            avatar_url=token_payload.picture,
            settings={"clerk_id": token_payload.sub},
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    
    return user


# Dependency type aliases
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[Optional[User], Depends(get_current_user_optional)]


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    """Get current user profile"""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    name: Optional[str] = None,
    wallet_address: Optional[str] = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile"""
    if name is not None:
        current_user.name = name
    if wallet_address is not None:
        current_user.wallet_address = wallet_address
    
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/webhook/clerk")
async def clerk_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svix_id: str = Header(None, alias="svix-id"),
    svix_timestamp: str = Header(None, alias="svix-timestamp"),
    svix_signature: str = Header(None, alias="svix-signature"),
):
    """Handle Clerk webhooks for user sync"""
    # In production, verify Svix signature
    body = await request.json()
    event_type = body.get("type")
    data = body.get("data", {})
    
    if event_type == "user.created":
        user = User(
            clerk_id=data["id"],
            email=data.get("email_addresses", [{}])[0].get("email_address"),
            name=f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or None,
            avatar_url=data.get("image_url"),
        )
        db.add(user)
        await db.commit()
        
    elif event_type == "user.updated":
        result = await db.execute(
            select(User).where(User.clerk_id == data["id"])
        )
        user = result.scalar_one_or_none()
        if user:
            user.email = data.get("email_addresses", [{}])[0].get("email_address")
            user.name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or None
            user.avatar_url = data.get("image_url")
            await db.commit()
            
    elif event_type == "user.deleted":
        result = await db.execute(
            select(User).where(User.clerk_id == data["id"])
        )
        user = result.scalar_one_or_none()
        if user:
            user.is_active = False
            await db.commit()
    
    return {"status": "ok"}
