"""Tests for the providers router: /providers/test (unsaved), auth gate,
health columns persistence."""

from __future__ import annotations

import json
from datetime import datetime
from unittest.mock import patch

import config as cfg
import main as app_main
from database_simple import (
    OcrScanLog,
    ProviderConfig,
    SessionLocal,
)


def _create_test_provider(name: str = "test-openai", provider_type: str = "openai") -> str:
    """Insert a ProviderConfig row directly (bypassing the auth-protected POST)
    and return its id. Used to test health recording + provider-test endpoint."""
    from security.encryption import encrypt_value

    data = {
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-fake",
        "models": ["gpt-4o-mini"],
        "default_model": "gpt-4o-mini",
        "is_default": False,
        "use_for_embeddings": False,
    }
    with SessionLocal() as db:
        row = ProviderConfig(
            name=name,
            provider_type=provider_type,
            config=encrypt_value(json.dumps(data)),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.id


def test_providers_test_unsaved_missing_key(client):
    """POST /providers/test for anthropic without api_key → 400 with explicit error."""
    resp = client.post(
        "/providers/test",
        json={
            "name": "test-anthropic",
            "provider_type": "anthropic",
        },
    )
    assert resp.status_code == 400, resp.text
    assert "API key" in resp.json()["detail"]


def test_providers_test_unsaved_invalid_type(client):
    """POST /providers/test with a non-catalog provider_type → 400."""
    resp = client.post(
        "/providers/test",
        json={
            "name": "test-bad",
            "provider_type": "totally-fake",
        },
    )
    assert resp.status_code == 400, resp.text
    assert "provider_type" in resp.json()["detail"]


def test_providers_test_unsaved_ollama_no_server(client):
    """Ollama test against a non-existent host → returns ok=False (no exception)."""
    resp = client.post(
        "/providers/test",
        json={
            "name": "test-ollama",
            "provider_type": "ollama",
            "base_url": "http://127.0.0.1:1/v1",
            "default_model": "llama3.1:8b",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is False
    assert body["error"]


def test_providers_test_unsaved_ollama_no_model(client):
    """Ollama without default_model and no catalog → 400 'no model'."""
    resp = client.post(
        "/providers/test",
        json={
            "name": "test-ollama-nomodel",
            "provider_type": "ollama",
            "base_url": "http://127.0.0.1:1/v1",
        },
    )
    assert resp.status_code == 400, resp.text
    assert "modelo" in resp.json()["detail"].lower()


def test_providers_test_unsaved_openai_mock_success(client):
    """Mock LLMProvider.chat_completion to simulate a successful test."""
    from routers import providers as prov_router

    fake_provider = type(
        "FakeProv",
        (),
        {
            "config": {"default_chat_model": "gpt-4o-mini", "chat_models": ["gpt-4o-mini"]},
            "is_available": lambda self: True,
            "chat_completion": lambda self, prompt, model, max_tokens: ("OK", []),
        },
    )()

    with patch.object(prov_router, "_build_provider_from_payload", return_value=(fake_provider, None)):
        resp = client.post(
            "/providers/test",
            json={
                "name": "test-openai",
                "provider_type": "openai",
                "api_key": "sk-fake",
                "default_model": "gpt-4o-mini",
            },
        )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is True
    assert body["model"] == "gpt-4o-mini"
    assert body["response"] == "OK"
    assert body["latency_ms"] is not None
    assert body["latency_ms"] >= 0


def test_providers_test_unsaved_openai_mock_failure(client):
    """Mock provider raises → returns ok=False with error string, no 500."""
    from routers import providers as prov_router

    fake_provider = type(
        "FakeProv",
        (),
        {
            "config": {"default_chat_model": "gpt-4o-mini", "chat_models": ["gpt-4o-mini"]},
            "is_available": lambda self: True,
            "chat_completion": lambda self, prompt, model, max_tokens: (_ for _ in ()).throw(
                RuntimeError("rate limited")
            ),
        },
    )()

    with patch.object(prov_router, "_build_provider_from_payload", return_value=(fake_provider, None)):
        resp = client.post(
            "/providers/test",
            json={
                "name": "test-openai-fail",
                "provider_type": "openai",
                "api_key": "sk-fake",
                "default_model": "gpt-4o-mini",
            },
        )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is False
    assert "rate limited" in (body["error"] or "")


def test_provider_health_columns_persist_after_test(client, db_session):
    """POST /providers/{id}/test writes last_test_at, last_test_ok, latency, error."""
    from routers import providers as prov_router
    from provider_registry import get_router

    pid = _create_test_provider(name="health-cols-test", provider_type="openai")

    # Reset router cache so the new provider is picked up
    get_router()

    fake_provider = type(
        "FakeProv",
        (),
        {
            "config": {"default_chat_model": "gpt-4o-mini", "chat_models": ["gpt-4o-mini"]},
            "is_available": lambda self: True,
            "chat_completion": lambda self, prompt, model, max_tokens: ("OK", []),
        },
    )()

    fake_router = type(
        "FakeRouter",
        (),
        {"providers": {"health-cols-test": fake_provider}},
    )()

    with patch.object(prov_router, "get_router", return_value=fake_router):
        resp = client.post(f"/providers/{pid}/test")
    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True

    db_session.expire_all()
    row = db_session.query(ProviderConfig).filter(ProviderConfig.id == pid).first()
    assert row.last_test_at is not None
    assert row.last_test_ok is True
    assert row.last_test_latency_ms is not None
    assert row.last_test_error is None


def test_provider_health_failure_records_error(client, db_session):
    """Failed /providers/{id}/test records ok=False + error message."""
    from routers import providers as prov_router
    from provider_registry import get_router

    pid = _create_test_provider(name="health-fail-test", provider_type="openai")
    get_router()

    fake_provider = type(
        "FakeProv",
        (),
        {
            "config": {"default_chat_model": "gpt-4o-mini", "chat_models": ["gpt-4o-mini"]},
            "is_available": lambda self: False,
        },
    )()

    fake_router = type("FakeRouter", (), {"providers": {"health-fail-test": fake_provider}})()

    with patch.object(prov_router, "get_router", return_value=fake_router):
        resp = client.post(f"/providers/{pid}/test")
    assert resp.status_code == 400, resp.text

    db_session.expire_all()
    row = db_session.query(ProviderConfig).filter(ProviderConfig.id == pid).first()
    assert row.last_test_ok is False
    assert row.last_test_error is not None
    assert "disponible" in row.last_test_error.lower() or "API key" in row.last_test_error.lower()


def test_provider_list_includes_health_columns(client, db_session):
    """GET /providers returns last_test_* fields after a test."""
    from routers import providers as prov_router
    from provider_registry import get_router

    pid = _create_test_provider(name="health-list-test", provider_type="openai")
    get_router()

    fake_provider = type(
        "FakeProv",
        (),
        {
            "config": {"default_chat_model": "gpt-4o-mini", "chat_models": ["gpt-4o-mini"]},
            "is_available": lambda self: True,
            "chat_completion": lambda self, prompt, model, max_tokens: ("OK", []),
        },
    )()
    fake_router = type("FakeRouter", (), {"providers": {"health-list-test": fake_provider}})()

    with patch.object(prov_router, "get_router", return_value=fake_router):
        client.post(f"/providers/{pid}/test")

    resp = client.get("/providers")
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    target = next((r for r in rows if r["id"] == pid), None)
    assert target is not None
    assert target["last_test_ok"] is True
    assert target["last_test_at"] is not None


def test_provider_catalog_includes_capabilities(client):
    """GET /providers/catalog returns capabilities per provider_type."""
    resp = client.get("/providers/catalog")
    assert resp.status_code == 200, resp.text
    catalog = resp.json()
    # OpenAI supports embeddings, vision, streaming
    assert catalog["openai"]["capabilities"]["has_embeddings"] is True
    assert catalog["openai"]["capabilities"]["supports_streaming"] is True
    # Anthropic does NOT support embeddings but does support vision + tools
    assert catalog["anthropic"]["capabilities"]["has_embeddings"] is False
    assert catalog["anthropic"]["capabilities"]["supports_vision"] is True
    # Ollama has no embeddings by default; needs_key is at the top level
    assert catalog["ollama"]["capabilities"]["has_embeddings"] is False
    assert catalog["ollama"]["needs_key"] is False
    # openai_compat has no defaults
    assert catalog["openai_compat"]["capabilities"]["has_embeddings"] is False
    assert catalog["openai_compat"]["needs_key"] is True


def test_provider_requires_auth(client):
    """LOCAL_MODE returns the local user automatically, so this passes.
    Verifies the dep is wired (no 500/ImportError)."""
    resp = client.get("/providers")
    assert resp.status_code == 200, resp.text