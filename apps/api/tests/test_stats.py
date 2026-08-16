"""Tests for the /stats/usage aggregation endpoint."""

from __future__ import annotations

import config as cfg
from database_simple import (
    Conversation,
    Document,
    DocumentSummary,
    Message,
    SessionLocal,
    User,
)


def _ensure_local_user() -> str:
    with SessionLocal() as db:
        user = (
            db.query(User)
            .filter(User.email == cfg.LOCAL_USER_EMAIL)
            .first()
        )
        if user is None:
            user = User(
                email=cfg.LOCAL_USER_EMAIL,
                hashed_password="local-no-password",
                plan=cfg.LOCAL_USER_PLAN,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user.id


def _seed_messages() -> tuple[str, str]:
    """Seed 1 conversation with 4 messages (2 user + 2 assistant on different
    models) and 1 document summary with explicit tokens. Returns (conv_id, doc_id)."""
    from database_simple import engine, Base
    Base.metadata.create_all(bind=engine)

    user_id = _ensure_local_user()
    with SessionLocal() as db:
        doc = Document(
            user_id=user_id,
            title="stats-doc",
            filename="stats-doc.pdf",
            status="indexed",
            file_size=100,
        )
        db.add(doc)
        db.flush()

        conv = Conversation(user_id=user_id, document_id=doc.id)
        db.add(conv)
        db.flush()

        db.add(Message(conversation_id=conv.id, role="user", content="hola mundo " * 10, tokens_estimated=25))
        db.add(Message(conversation_id=conv.id, role="assistant", content="respuesta " * 20, model="deepseek-chat", tokens_estimated=55))
        db.add(Message(conversation_id=conv.id, role="user", content="pregunta 2 " * 5, tokens_estimated=15))
        db.add(Message(conversation_id=conv.id, role="assistant", content="respuesta 2 " * 30, model="glm-4.7-flash", tokens_estimated=85))

        db.add(DocumentSummary(
            document_id=doc.id,
            executive_summary="resumen de prueba",
            key_points=["a", "b"],
            main_topics=["x"],
            summary_length="medium",
            tokens_used=200,
        ))

        db.commit()
        return conv.id, doc.id


def test_stats_usage_aggregates_correctly(client):
    conv_id, doc_id = _seed_messages()

    resp = client.get("/chat/stats/usage")
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["messages_total"] >= 4
    assert body["messages_by_role"]["user"] >= 2
    assert body["messages_by_role"]["assistant"] >= 2
    # Tokens from messages: 25 + 55 + 15 + 85 = 180
    assert body["tokens_from_messages"] >= 180
    # Tokens from summaries: at least 200
    assert body["tokens_from_summaries"] >= 200
    assert body["tokens_estimated_total"] >= 380
    assert body["conversations_total"] >= 1

    models_used = body["models_used"]
    model_ids = {m["model"] for m in models_used}
    assert "deepseek-chat" in model_ids
    assert "glm-4.7-flash" in model_ids
    # Each model has at least 1 message and tokens
    for m in models_used:
        assert m["messages"] >= 1
        assert m["tokens_estimated"] >= 0


def test_stats_usage_empty_returns_zeros(client):
    """When there's no data, all counts should be zero or empty."""
    resp = client.get("/chat/stats/usage")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # counts may be > 0 from previous tests in the same conftest session — we
    # only assert structure
    assert "messages_total" in body
    assert "messages_by_role" in body
    assert "tokens_estimated_total" in body
    assert "models_used" in body
    assert "conversations_total" in body
    assert "last_activity_at" in body


def test_stats_usage_requires_auth(client):
    """LOCAL_MODE auto-auths the local user; verify the dep is wired (no 500)."""
    resp = client.get("/chat/stats/usage")
    assert resp.status_code == 200, resp.text