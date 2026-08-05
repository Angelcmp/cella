"""
Redis-backed sliding-window rate limiter with in-memory fallback.

Keys: cella:ratelimit:{ip}:{route_key} -> Redis Sorted Set of request timestamps.

If REDIS_URL is not set or Redis is unreachable, falls back to an in-process
(thread-safe) memory store. Disabled entirely unless RATE_LIMIT_ENABLED=true.
"""

from __future__ import annotations

import os
import logging
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

DEFAULT_WINDOW_SECONDS = 60.0


class MemoryRateStore:
    """Thread-safe in-memory sliding-window store."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._data: Dict[str, List[float]] = {}

    def allow(self, key: str, limit: int, window: float) -> Tuple[bool, int, int]:
        """Record a request; return (allowed, count_in_window, retry_after)."""
        now = time.time()
        cutoff = now - window
        with self._lock:
            bucket = [t for t in self._data.get(key, []) if t > cutoff]
            if len(bucket) >= limit:
                self._data[key] = bucket
                retry = int(window - (now - bucket[0])) if bucket else int(window)
                return False, len(bucket), max(retry, 1)
            bucket.append(now)
            self._data[key] = bucket
            return True, len(bucket), 0


class RedisRateStore:
    """Redis sliding-window store using a Sorted Set of timestamps."""

    def __init__(self, client: Any) -> None:
        self.client = client

    def allow(self, key: str, limit: int, window: float) -> Tuple[bool, int, int]:
        now = time.time()
        min_score = now - window
        try:
            pipe = self.client.pipeline(transaction=True)
            pipe.zremrangebyscore(key, 0, min_score)
            pipe.zcard(key)
            count = pipe.execute()[1]
            if count >= limit:
                oldest = self.client.zrange(key, 0, 0, withscores=True)
                retry = int(window - (now - oldest[0][1])) if oldest else int(window)
                return False, count, max(retry, 1)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, int(window) + 1)
            pipe.execute()
            return True, count + 1, 0
        except Exception as exc:
            logger.warning(f"Redis rate-limit check failed: {exc}")
            return True, 0, 0


def _redis_client() -> Optional[Any]:
    """Return a Redis client if REDIS_URL is set and reachable."""
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None
    try:
        import redis as _redis

        client = _redis.from_url(redis_url, decode_responses=True)
        client.ping()
        return client
    except Exception as exc:
        logger.warning(f"Redis unavailable for rate limiting: {exc}")
        return None


class RateLimiter:
    """Sliding-window rate limiter backed by Redis, falling back to memory."""

    def __init__(self) -> None:
        client = _redis_client()
        if client is not None:
            self._store: Any = RedisRateStore(client)
            logger.info("Rate limiter using Redis")
        else:
            self._store = MemoryRateStore()
            logger.info("Rate limiter using in-memory fallback (no Redis)")

    def allow(self, key: str, limit: int, window: float = DEFAULT_WINDOW_SECONDS) -> Tuple[bool, int, int]:
        return self._store.allow(f"cella:ratelimit:{key}", limit, window)
