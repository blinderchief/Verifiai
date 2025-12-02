"""Redis client for caching and pub/sub"""

from typing import Optional
import structlog

from redis.asyncio import Redis, ConnectionPool
from src.core.config import settings

logger = structlog.get_logger()

# Global connection pool and client
_pool: Optional[ConnectionPool] = None
_redis: Optional[Redis] = None


async def init_redis() -> Optional[Redis]:
    """Initialize Redis connection pool and client"""
    global _pool, _redis
    
    if not settings.REDIS_URL:
        logger.warning("redis_disabled", message="REDIS_URL not configured")
        return None
    
    try:
        _pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
            decode_responses=True,
        )
        _redis = Redis(connection_pool=_pool)
        
        # Test connection
        await _redis.ping()
        logger.info("redis_connected", url=settings.REDIS_URL.split("@")[-1])
        
        return _redis
    
    except Exception as e:
        logger.error("redis_connection_error", error=str(e))
        _redis = None
        return None


async def close_redis():
    """Close Redis connection pool"""
    global _pool, _redis
    
    if _redis:
        await _redis.close()
        _redis = None
    
    if _pool:
        await _pool.disconnect()
        _pool = None
    
    logger.info("redis_disconnected")


async def get_redis() -> Optional[Redis]:
    """Get Redis client instance"""
    global _redis
    
    if _redis is None:
        await init_redis()
    
    return _redis


# ============================================================================
# Caching Utilities
# ============================================================================

class RedisCache:
    """Redis-based caching utilities"""
    
    def __init__(self, prefix: str = "verifiai"):
        self.prefix = prefix
    
    def _key(self, key: str) -> str:
        return f"{self.prefix}:{key}"
    
    async def get(self, key: str) -> Optional[str]:
        """Get cached value"""
        redis = await get_redis()
        if not redis:
            return None
        
        try:
            return await redis.get(self._key(key))
        except Exception as e:
            logger.error("cache_get_error", key=key, error=str(e))
            return None
    
    async def set(self, key: str, value: str, ttl: int = 3600) -> bool:
        """Set cached value with TTL (default 1 hour)"""
        redis = await get_redis()
        if not redis:
            return False
        
        try:
            await redis.set(self._key(key), value, ex=ttl)
            return True
        except Exception as e:
            logger.error("cache_set_error", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete cached value"""
        redis = await get_redis()
        if not redis:
            return False
        
        try:
            await redis.delete(self._key(key))
            return True
        except Exception as e:
            logger.error("cache_delete_error", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        redis = await get_redis()
        if not redis:
            return False
        
        try:
            return bool(await redis.exists(self._key(key)))
        except Exception as e:
            logger.error("cache_exists_error", key=key, error=str(e))
            return False
    
    async def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter"""
        redis = await get_redis()
        if not redis:
            return None
        
        try:
            return await redis.incrby(self._key(key), amount)
        except Exception as e:
            logger.error("cache_incr_error", key=key, error=str(e))
            return None
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set TTL on existing key"""
        redis = await get_redis()
        if not redis:
            return False
        
        try:
            return bool(await redis.expire(self._key(key), ttl))
        except Exception as e:
            logger.error("cache_expire_error", key=key, error=str(e))
            return False


# ============================================================================
# Rate Limiting
# ============================================================================

class RateLimiter:
    """Redis-based rate limiter using sliding window"""
    
    def __init__(self, prefix: str = "ratelimit"):
        self.prefix = prefix
    
    def _key(self, identifier: str, window: str) -> str:
        return f"{self.prefix}:{identifier}:{window}"
    
    async def is_allowed(
        self,
        identifier: str,
        max_requests: int,
        window_seconds: int = 60,
    ) -> tuple[bool, int, int]:
        """
        Check if request is allowed under rate limit
        
        Returns:
            (allowed, remaining, reset_in_seconds)
        """
        redis = await get_redis()
        if not redis:
            # If Redis unavailable, allow all requests
            return True, max_requests, window_seconds
        
        import time
        now = int(time.time())
        window = str(now // window_seconds)
        key = self._key(identifier, window)
        
        try:
            # Increment counter
            count = await redis.incr(key)
            
            # Set expiry on first request in window
            if count == 1:
                await redis.expire(key, window_seconds)
            
            # Check limit
            allowed = count <= max_requests
            remaining = max(0, max_requests - count)
            
            # Calculate reset time
            ttl = await redis.ttl(key)
            reset_in = ttl if ttl > 0 else window_seconds
            
            return allowed, remaining, reset_in
        
        except Exception as e:
            logger.error("ratelimit_error", identifier=identifier, error=str(e))
            return True, max_requests, window_seconds
    
    async def reset(self, identifier: str):
        """Reset rate limit for identifier"""
        redis = await get_redis()
        if not redis:
            return
        
        try:
            # Delete all windows for this identifier
            pattern = f"{self.prefix}:{identifier}:*"
            cursor = 0
            while True:
                cursor, keys = await redis.scan(cursor, match=pattern)
                if keys:
                    await redis.delete(*keys)
                if cursor == 0:
                    break
        except Exception as e:
            logger.error("ratelimit_reset_error", identifier=identifier, error=str(e))


# ============================================================================
# Distributed Locking
# ============================================================================

class DistributedLock:
    """Redis-based distributed lock"""
    
    def __init__(self, name: str, timeout: int = 30):
        self.name = f"lock:{name}"
        self.timeout = timeout
        self._token: Optional[str] = None
    
    async def acquire(self) -> bool:
        """Acquire lock"""
        import uuid
        redis = await get_redis()
        if not redis:
            return True  # No Redis = no locking
        
        self._token = str(uuid.uuid4())
        
        try:
            acquired = await redis.set(
                self.name,
                self._token,
                nx=True,  # Only set if not exists
                ex=self.timeout,
            )
            return bool(acquired)
        except Exception as e:
            logger.error("lock_acquire_error", name=self.name, error=str(e))
            return False
    
    async def release(self) -> bool:
        """Release lock (only if we own it)"""
        redis = await get_redis()
        if not redis or not self._token:
            return True
        
        try:
            # Lua script to atomically check and delete
            script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """
            result = await redis.eval(script, 1, self.name, self._token)
            return bool(result)
        except Exception as e:
            logger.error("lock_release_error", name=self.name, error=str(e))
            return False
    
    async def __aenter__(self):
        await self.acquire()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.release()


# Default instances
cache = RedisCache()
rate_limiter = RateLimiter()
