"""Tests for the data integrity backfills + index creation in _migrate().

These run against an isolated SQLite test DB (see conftest.py). Each test
seeds bad data, calls the backfill helpers, and asserts the cleanup.
"""

from __future__ import annotations

from sqlalchemy import text

from database_simple import SessionLocal, _create_indexes_if_missing, _data_integrity_backfills, engine


def test_backfill_null_string_to_actual_null(db_session):
    """Conversations with document_ids='null' literal string → NULL.

    Reproduces the production bug where the literal ASCII string 'null'
    (4 bytes: 6E 75 6C 6C) was stored in the JSON column instead of NULL.
    We must seed via raw SQL to bypass SQLAlchemy's JSON coercion."""
    from database_simple import Conversation

    # Seed via raw SQL so the literal 'null' string reaches the column as-is
    with engine.begin() as conn:
        bad_id = "conv-bad"
        good_id = "conv-good"
        conn.execute(
            text(
                "INSERT INTO conversations (id, user_id, document_id, document_ids, created_at) "
                "VALUES (:id, :uid, :doc, :dids, :ts)"
            ),
            {
                "id": bad_id,
                "uid": "local-user",
                "doc": "doc-1",
                "dids": "null",  # literal 4-byte ASCII string
                "ts": "2026-08-16 00:00:00",
            },
        )
        conn.execute(
            text(
                "INSERT INTO conversations (id, user_id, document_id, document_ids, created_at) "
                "VALUES (:id, :uid, :doc, :dids, :ts)"
            ),
            {
                "id": good_id,
                "uid": "local-user",
                "doc": "doc-2",
                "dids": None,  # proper NULL
                "ts": "2026-08-16 00:00:00",
            },
        )

    # Verify the bug is reproduced before the backfill
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, document_ids FROM conversations WHERE id IN (:a, :b)"),
            {"a": bad_id, "b": good_id},
        ).fetchall()
        bad_before = next(r for r in rows if r[0] == bad_id)
        assert bad_before[1] == "null", "Test fixture failed: literal 'null' should be stored"

    _data_integrity_backfills()

    db_session.expire_all()
    bad_row = db_session.query(Conversation).filter(Conversation.id == bad_id).first()
    good_row = db_session.query(Conversation).filter(Conversation.id == good_id).first()
    assert bad_row.document_ids is None, f"Expected None, got {bad_row.document_ids!r}"
    assert good_row.document_ids is None


def test_backfill_reclaim_stuck_processing(db_session):
    """Docs stuck in 'processing' with old claim_at → 'failed'."""
    from datetime import datetime, timedelta

    from database_simple import Document

    # Stuck for > 30 min
    stuck = Document(
        user_id="local-user",
        title="stuck.doc",
        filename="stuck.doc",
        status="processing",
        claimed_at=datetime.utcnow() - timedelta(hours=2),
        attempts=0,
        file_size=100,
    )
    # Stuck but claimed recently (worker is alive)
    recent = Document(
        user_id="local-user",
        title="recent.doc",
        filename="recent.doc",
        status="processing",
        claimed_at=datetime.utcnow() - timedelta(minutes=1),
        attempts=0,
        file_size=100,
    )
    db_session.add_all([stuck, recent])
    db_session.commit()

    _data_integrity_backfills()

    db_session.expire_all()
    assert db_session.query(Document).filter(Document.id == stuck.id).first().status == "failed"
    assert db_session.query(Document).filter(Document.id == recent.id).first().status == "processing"


def test_backfill_delete_orphan_faqs(db_session):
    """doc_faqs row whose document_id doesn't exist → deleted."""
    from database_simple import Document, DocumentFaq

    # A real doc + a real faq
    real_doc = Document(
        user_id="local-user",
        title="real.doc",
        filename="real.doc",
        status="indexed",
        file_size=100,
    )
    db_session.add(real_doc)
    db_session.flush()

    real_faq = DocumentFaq(document_id=real_doc.id, faqs=[{"q": "a", "a": "b"}], markdown="")
    orphan_faq = DocumentFaq(document_id="ghost-doc-id-that-does-not-exist", faqs=[], markdown="")
    db_session.add_all([real_faq, orphan_faq])
    db_session.commit()

    _data_integrity_backfills()

    db_session.expire_all()
    remaining = db_session.query(DocumentFaq).all()
    assert len(remaining) == 1
    assert remaining[0].document_id == real_doc.id


def test_backfill_delete_orphan_embeddings(db_session):
    """doc_embeddings row whose chunk_id doesn't exist → deleted."""
    from database_simple import Document, DocumentChunk, DocumentEmbedding

    real_doc = Document(
        user_id="local-user",
        title="d.doc",
        filename="d.doc",
        status="indexed",
        file_size=100,
    )
    db_session.add(real_doc)
    db_session.flush()

    real_chunk = DocumentChunk(document_id=real_doc.id, chunk_index=0, text="hello", tokens=1)
    db_session.add(real_chunk)
    db_session.flush()

    real_emb = DocumentEmbedding(chunk_id=real_chunk.id, embedding="[0.1, 0.2]", dim=2)
    orphan_emb = DocumentEmbedding(chunk_id="ghost-chunk-id", embedding="[0.0]", dim=1)
    db_session.add_all([real_emb, orphan_emb])
    db_session.commit()

    _data_integrity_backfills()

    db_session.expire_all()
    remaining = db_session.query(DocumentEmbedding).all()
    assert len(remaining) == 1


def test_create_indexes_if_missing_idempotent(db_session):
    """Index creation is idempotent — calling twice doesn't error and the
    indexes are present after the first call."""
    _create_indexes_if_missing()

    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'ix_%'")
        ).fetchall()
        names = {r[0] for r in rows}
        assert "ix_doc_chunks_document_id" in names
        assert "ix_doc_embeddings_chunk_id" in names
        assert "ix_messages_conversation_id" in names
        assert "ix_conversations_user_id" in names
        assert "ix_documents_user_id" in names

    # Second call must not raise
    _create_indexes_if_missing()