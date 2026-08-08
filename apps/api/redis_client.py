"""
Shared Redis client helper.

Centralizes Redis connection so rate limiting, token blacklist and any other
feature can share one cached client. Returns None (callers fall back to their
in-process fallback) when REDIS_URL is unset or Redis is unreachable.
"""

from __future__ import annotations

import logging
import os
import threading
from typing import Any, Optional

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_client: Optional[Any] = None


def get_redis_client() -> Optional[Any]:
    """Return a shared Redis client, or None if unavailable/unconfigured."""
    global _client
    if _client is not None:
        return _client
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None
    with _lock:
        if _client is not None:
            return _client
        try:
            import redis as _redis

            candidate = _redis.from_url(redis_url, decode_responses=True)
            candidate.ping()
            _client = candidate
            logger.info("Redis client initialized")
            return _client
        except Exception as exc:
            logger.warning(f"Redis unavailable: {exc}")
            return None
