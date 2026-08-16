"""
Lightweight Redis cache for the RAG pipeline.

Caches:
- Query embeddings per document
- Chat responses per (document, query, model)

If REDIS_URL is not set or Redis is unreachable, falls back to an
in-process (thread-safe) memory cache. If the fallback is also disabled
(CACHE_ENABLED=false), caching is disabled entirely.
"""

from __future__ import annotations

import os
import json
import hashlib
import logging
import threading
import time
from collections import OrderedDict
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MemoryCache:
    """Thread-safe in-memory LRU cache with per-entry TTL."""

    def __init__(self, max_entries: int = 2048) -> None:
        self._lock = threading.Lock()
        self._data: "OrderedDict[str, tuple[float, Any]]" = OrderedDict()
        self._max = max_entries

    def _evict(self) -> None:
        now = time.time()
        while self._data and (len(self._data) > self._max or self._expired_head(now)):
            oldest_key = next(iter(self._data))
            expires, _ = self._data[oldest_key]
            if expires > now and len(self._data) <= self._max:
                break
            self._data.popitem(last=False)

    def _expired_head(self, now: float) -> bool:
        if not self._data:
            return False
        expires, _ = next(iter(self._data.values()))
        return expires <= now

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._data:
                return None
            expires, value = self._data[key]
            if expires <= time.time():
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return value

    def set(self, key: str, value: Any, ttl: int) -> None:
        with self._lock:
            self._data[key] = (time.time() + ttl, value)
            self._evict()

    def delete(self, key: str) -> None:
        with self._lock:
            self._data.pop(key, None)

    def scan_keys(self, pattern: str) -> List[str]:
        """Return keys matching a simple '*' glob on the suffix."""
        prefix = pattern.split("*", 1)[0]
        with self._lock:
            return [k for k in self._data if k.startswith(prefix)]


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
        logger.warning(f"Redis cache unavailable: {exc}")
        return None


class RAGCache:
    """Cache for RAG operations backed by Redis, falling back to memory."""

    def __init__(self) -> None:
        cache_enabled = os.getenv("CACHE_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}
        self.client = _redis_client() if cache_enabled else None
        self.memory = MemoryCache() if cache_enabled else None
        self.enabled = self.client is not None or self.memory is not None
        self.default_ttl = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
        if cache_enabled and self.client is None:
            logger.info("RAG cache using in-memory fallback (no Redis)")

    def _query_hash(self, query: str) -> str:
        return hashlib.sha256(query.encode("utf-8")).hexdigest()[:16]

    def _get(self, key: str):
        if not self.enabled:
            return None
        if self.client is not None:
            try:
                value = self.client.get(key)
                return json.loads(value) if value else None
            except Exception as exc:
                logger.warning(f"Redis get failed: {exc}")
                return None
        return self.memory.get(key)

    def _set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        if not self.enabled:
            return
        ttl = ttl or self.default_ttl
        if self.client is not None:
            try:
                self.client.setex(key, ttl, json.dumps(value))
            except Exception as exc:
                logger.warning(f"Redis set failed: {exc}")
            return
        self.memory.set(key, value, ttl)

    def get_query_embedding(
        self,
        document_id: str,
        query: str,
    ) -> Optional[List[float]]:
        key = f"cella:query_emb:{document_id}:{self._query_hash(query)}"
        return self._get(key)

    def set_query_embedding(
        self,
        document_id: str,
        query: str,
        embedding: List[float],
        ttl: Optional[int] = None,
    ) -> None:
        key = f"cella:query_emb:{document_id}:{self._query_hash(query)}"
        self._set(key, embedding, ttl)

    def get_chat_response(
        self,
        document_id: str,
        query: str,
        model: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        model_key = model or "default"
        key = f"cella:chat_resp:{document_id}:{self._query_hash(query)}:{model_key}"
        return self._get(key)

    def set_chat_response(
        self,
        document_id: str,
        query: str,
        response: Dict[str, Any],
        model: Optional[str] = None,
        ttl: Optional[int] = None,
    ) -> None:
        model_key = model or "default"
        key = f"cella:chat_resp:{document_id}:{self._query_hash(query)}:{model_key}"
        self._set(key, response, ttl)

    def invalidate_document(self, document_id: str) -> None:
        """Invalidate all cached entries for a document (e.g. on re-indexing)."""
        if not self.enabled:
            return
        try:
            if self.client is not None:
                for pattern in (
                    f"cella:query_emb:{document_id}:*",
                    f"cella:chat_resp:{document_id}:*",
                ):
                    cursor = 0
                    while True:
                        cursor, keys = self.client.scan(cursor, match=pattern, count=100)
                        if keys:
                            self.client.delete(*keys)
                        if cursor == 0:
                            break
                return
            for pattern in (
                f"cella:query_emb:{document_id}:",
                f"cella:chat_resp:{document_id}:",
            ):
                for key in self.memory.scan_keys(pattern):
                    self.memory.delete(key)
        except Exception as exc:
            logger.warning(f"Cache invalidate_document failed: {exc}")

    # ── Text-keyed embedding cache (worker-side dedupe) ──
    # Keyed by (model, sha256(text)[:16]) so it survives across documents and
    # uploads of the same content. Different embedding models get different
    # cache buckets so a provider swap doesn't return wrong-dim vectors.

    def get_text_embedding(
        self,
        text: str,
        model: str,
    ) -> Optional[List[float]]:
        """Return a cached embedding for the exact text + model, or None."""
        if not self.enabled:
            return None
        key = f"cella:text_emb:{model}:{self._query_hash(text)}"
        return self._get(key)

    def set_text_embedding(
        self,
        text: str,
        model: str,
        embedding: List[float],
        ttl: Optional[int] = None,
    ) -> None:
        """Cache an embedding for the exact text + model."""
        if not self.enabled:
            return
        key = f"cella:text_emb:{model}:{self._query_hash(text)}"
        self._set(key, embedding, ttl)
