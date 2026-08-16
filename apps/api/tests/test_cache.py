"""Tests for the text-keyed embedding cache in apps/api/cache.py."""

from __future__ import annotations

import time

from cache import RAGCache


def _make_cache():
    """Build a fresh cache with the in-memory backend (no Redis required)."""
    import os

    os.environ.pop("REDIS_URL", None)
    os.environ["CACHE_ENABLED"] = "true"
    return RAGCache()


def test_get_text_embedding_returns_none_when_disabled():
    import os

    os.environ["CACHE_ENABLED"] = "false"
    try:
        cache = RAGCache()
        cache.set_text_embedding("hello", "model-x", [0.1, 0.2, 0.3])
        assert cache.get_text_embedding("hello", "model-x") is None
    finally:
        os.environ["CACHE_ENABLED"] = "true"


def test_set_then_get_text_embedding():
    cache = _make_cache()
    vec = [0.1] * 384
    cache.set_text_embedding("hello world", "model-x", vec)
    assert cache.get_text_embedding("hello world", "model-x") == vec


def test_get_text_embedding_returns_none_for_miss():
    cache = _make_cache()
    assert cache.get_text_embedding("nothing here", "model-x") is None


def test_get_text_embedding_keys_per_model():
    """Same text, different model → different cache entries."""
    cache = _make_cache()
    vec_x = [0.1] * 4
    vec_y = [0.9] * 4
    cache.set_text_embedding("shared text", "model-x", vec_x)
    cache.set_text_embedding("shared text", "model-y", vec_y)
    assert cache.get_text_embedding("shared text", "model-x") == vec_x
    assert cache.get_text_embedding("shared text", "model-y") == vec_y


def test_get_text_embedding_keys_per_text():
    """Different text → different cache entries."""
    cache = _make_cache()
    vec_a = [0.1] * 4
    vec_b = [0.2] * 4
    cache.set_text_embedding("text a", "model-x", vec_a)
    cache.set_text_embedding("text b", "model-x", vec_b)
    assert cache.get_text_embedding("text a", "model-x") == vec_a
    assert cache.get_text_embedding("text b", "model-x") == vec_b


def test_get_text_embedding_ttl_expiry():
    """Entries with a very short TTL expire."""
    cache = _make_cache()
    cache.set_text_embedding("ephemeral", "model-x", [0.0], ttl=1)
    assert cache.get_text_embedding("ephemeral", "model-x") == [0.0]
    time.sleep(1.2)
    assert cache.get_text_embedding("ephemeral", "model-x") is None


def test_cache_hit_does_not_reembed(monkeypatch):
    """DocumentProcessor.generate_embeddings should NOT call embed_batch
    when every text is already in the cache."""
    import sys as _sys
    import os as _os

    _worker_dir = _os.path.abspath(
        _os.path.join(_os.path.dirname(__file__), "..", "..", "worker")
    )
    if _worker_dir not in _sys.path:
        _sys.path.insert(0, _worker_dir)

    from document_processor import DocumentProcessor

    # Build a processor and pre-populate the cache for its embedding model
    proc = DocumentProcessor()
    proc.router.embeddings_provider = type("P", (), {"name": proc.embed_provider_name})()
    # Build a fake router whose embed_batch counts calls
    call_count = {"n": 0}

    def fake_embed_batch(texts):
        call_count["n"] += 1
        return [[0.1] * proc.embed_dim for _ in texts]

    proc.router.embed_batch = fake_embed_batch  # type: ignore[attr-defined]

    texts_a = ["alpha", "beta", "gamma"]
    texts_b = ["alpha", "beta", "gamma"]  # same texts → all cache hits

    chunks1 = [{"text": t} for t in texts_a]
    chunks2 = [{"text": t} for t in texts_b]

    out1 = proc.generate_embeddings(chunks1)
    out2 = proc.generate_embeddings(chunks2)

    # First call → all misses → 1 batch call
    assert call_count["n"] == 1
    # Second call → all hits → 0 batch calls
    assert call_count["n"] == 1, f"Expected 0 batch calls on second run, got {call_count['n']}"

    # Both runs must produce the same vectors
    for c1, c2 in zip(out1, out2):
        assert c1["embedding"] == c2["embedding"]


def test_cache_partial_hit_only_embeds_misses(monkeypatch):
    """When 2/3 chunks hit cache, embed_batch is called with only 1 text."""
    import sys as _sys
    import os as _os

    _worker_dir = _os.path.abspath(
        _os.path.join(_os.path.dirname(__file__), "..", "..", "worker")
    )
    if _worker_dir not in _sys.path:
        _sys.path.insert(0, _worker_dir)

    from document_processor import DocumentProcessor

    proc = DocumentProcessor()
    proc.router.embeddings_provider = type("P", (), {"name": proc.embed_provider_name})()

    batch_calls: list[list[str]] = []

    def fake_embed_batch(texts):
        batch_calls.append(list(texts))
        return [[0.1 * (i + 1)] * proc.embed_dim for i in range(len(texts))]

    proc.router.embed_batch = fake_embed_batch  # type: ignore[attr-defined]

    # Pre-cache two of three texts
    proc.embed_cache.set_text_embedding("alpha", proc.embed_provider_name, [9.9] * proc.embed_dim)
    proc.embed_cache.set_text_embedding("beta", proc.embed_provider_name, [8.8] * proc.embed_dim)

    chunks = [{"text": t} for t in ["alpha", "beta", "gamma"]]
    out = proc.generate_embeddings(chunks)

    # Only "gamma" was sent to the embedder
    assert len(batch_calls) == 1
    assert batch_calls[0] == ["gamma"]

    # Cached chunks returned their cached vectors; the miss got the new one
    assert out[0]["embedding"][0] == 9.9
    assert out[1]["embedding"][0] == 8.8
    # gamma was the miss
    assert out[2]["embedding"][0] == 0.1