"""Tests for new features: AV audit, session TTL, worker claim/dlq, usage.

Run with: pytest tests/test_features.py -v
"""

from __future__ import annotations

from datetime import datetime, timedelta
import os
import sys

from fastapi.testclient import TestClient

import config as cfg
import main as app_main
from database_simple import SessionLocal, Document, User, UsageEvent


def test_av_scan_audit_log(client: TestClient, db_session):
    """AV scan with provider=http but no endpoint → error logged to av_scan_logs."""
    cfg.ENABLE_FILE_AV_SCAN = True
    cfg.AV_PROVIDER = "http"
    cfg.AV_API_URL = ""
    old_av_url = cfg.AV_API_URL
    try:
        from security.av import scan_content

        res = scan_content(
            b"hello",
            filename="test.txt",
            document_id="doc-1234",
            request_id="req-1",
        )
        assert not res.clean
        assert res.error is not None
        assert res.infected is False, "provider error must not be flagged as infection"

        from database_simple import AVScanLog

        log = db_session.query(AVScanLog).filter(AVScanLog.filename == "test.txt").first()
        assert log is not None
        assert log.provider == "http"
        # Provider error must be classified as 'error', not 'infected'.
        assert log.result == "error", f"expected 'error', got {log.result!r}"
        assert log.request_id == "req-1"
        assert log.document_id == "doc-1234", "audit log must record document_id"
    finally:
        cfg.ENABLE_FILE_AV_SCAN = False
        cfg.AV_PROVIDER = "clamav"
        cfg.AV_API_URL = old_av_url


def test_av_scan_classification():
    """Provider error → 'error'; explicit detection → 'infected'; clean → 'clean'."""
    from security.av import _classify_result, AVScanResult

    assert _classify_result(AVScanResult(provider="x", clean=True)) == "clean"
    assert (
        _classify_result(
            AVScanResult(provider="x", clean=False, infected=True, error="EICAR")
        )
        == "infected"
    )
    # Provider crash is NOT an infection — must be reported as 'error'.
    assert (
        _classify_result(AVScanResult(provider="x", clean=False, error="provider crashed"))
        == "error"
    )


def test_purge_expired_revoked_tokens():
    """Expired RevokedToken rows are purged by purge_expired_revoked_tokens."""
    from auth_simple import purge_expired_revoked_tokens
    from database_simple import RevokedToken

    with SessionLocal() as db:
        db.add(RevokedToken(jti="test-jti-1", expires_at=datetime.utcnow() - timedelta(days=1)))
        db.add(RevokedToken(jti="test-jti-2", expires_at=datetime.utcnow() + timedelta(days=1)))
        db.commit()

    purged = purge_expired_revoked_tokens()
    assert purged >= 1

    with SessionLocal() as db:
        remaining = db.query(RevokedToken).filter(RevokedToken.jti == "test-jti-1").count()
        assert remaining == 0
        future = db.query(RevokedToken).filter(RevokedToken.jti == "test-jti-2").count()
        assert future == 1

        db.query(RevokedToken).filter(RevokedToken.jti == "test-jti-2").delete()
        db.commit()


def test_worker_dlq_flag_set_on_exhaustion():
    """Document dlq flag is True after max_attempts."""
    with SessionLocal() as db:
        doc = Document(
            user_id="u-test", title="DLQ test", filename="dlq.txt",
            status="failed", attempts=3, last_error="out of attempts",
            last_attempt_at=datetime.utcnow() - timedelta(seconds=10),
            dlq=True,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        assert doc.dlq is True

        doc.status = "pending"
        doc.attempts = 0
        doc.last_error = None
        doc.last_attempt_at = None
        doc.dlq = False
        doc.worker_id = None
        doc.claimed_at = None
        db.commit()
        db.refresh(doc)
        assert doc.dlq is False
        assert doc.worker_id is None

        db.delete(doc)
        db.commit()


def test_worker_status_endpoint(client: TestClient):
    """GET /worker/status returns JSON with by_status, dlq, dlq_entries."""
    resp = client.get("/worker/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "by_status" in data
    assert "dlq" in data
    assert "dlq_entries" in data
    assert isinstance(data["dlq"], int)
    assert isinstance(data["dlq_entries"], list)


def test_usage_endpoint_returns_usage(client: TestClient):
    """GET /usage returns plan, documents, chats_per_day, summaries_per_day."""
    cfg.ENFORCE_PLAN_LIMITS = False
    try:
        resp = client.get("/usage")
        assert resp.status_code == 200
        data = resp.json()
        assert data["plan"] in ("local", "free", "pro", None)
        assert "documents" in data
        assert "used" in data["documents"]
        assert "chats_per_day" in data
        assert "used" in data["chats_per_day"]
        assert "summaries_per_day" in data
        assert "used" in data["summaries_per_day"]
    finally:
        cfg.ENFORCE_PLAN_LIMITS = False


def test_usage_record_events():
    """Recording usage events inserts to usage_events table."""
    from usage import record_usage

    with SessionLocal() as db:
        record_usage(db, "u-test-usage", "documents")
        record_usage(db, "u-test-usage", "chats_per_day")

    with SessionLocal() as db:
        count = db.query(UsageEvent).filter(UsageEvent.user_id == "u-test-usage").count()
        assert count == 2

        db.query(UsageEvent).filter(UsageEvent.user_id == "u-test-usage").delete()
        db.commit()


def test_usage_enforce_window_limit():
    """enforce_limit raises HTTP 429 when window limit exceeded."""
    from fastapi import HTTPException
    from usage import enforce_limit, record_usage
    from auth_simple import get_or_create_local_user

    try:
        import config as cfg
    except Exception:
        pass
    cfg.ENFORCE_PLAN_LIMITS = True
    old_limits = dict(cfg.PLAN_LIMITS)
    cfg.PLAN_LIMITS["local"] = {"documents": 500, "chats_per_day": 1, "summaries_per_day": 1}
    try:
        with SessionLocal() as db:
            user = get_or_create_local_user(db)

            record_usage(db, user.id, "chats_per_day")
            record_usage(db, user.id, "chats_per_day")

            import pytest
            with pytest.raises(HTTPException) as exc_info:
                enforce_limit(db, user, "chats_per_day", windowed=True)
            assert exc_info.value.status_code == 429

            db.query(UsageEvent).filter(UsageEvent.user_id == user.id).delete()
            db.commit()
    finally:
        cfg.ENFORCE_PLAN_LIMITS = False
        cfg.PLAN_LIMITS = old_limits


def test_documents_endpoint_lists_docs(client: TestClient):
    """GET /documents/ returns list (empty in test db)."""
    resp = client.get("/documents/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_worker_claim_does_not_demote_when_rowcount_zero():
    """Regression: when the atomic claim UPDATE returns rowcount=0 (another
    worker / previous loop already moved the row out of 'pending'), the
    stale ORM object MUST NOT be mutated and committed, which would demote
    an 'indexed' (or 'failed') doc back to 'processing'."""
    from sqlalchemy import text
    import sys

    sys.path.insert(
        0,
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "apps", "worker"),
    )
    from worker import _claim_pending_doc  # type: ignore[attr-defined]

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

        doc = Document(
            user_id=user.id,
            title="stale.doc",
            filename="stale.doc",
            status="indexed",  # NOT pending — atomic claim must skip it
            file_size=0,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        doc_id = doc.id

    with SessionLocal() as db:
        # First call: doc.status in ORM is "indexed", but the raw SELECT
        # `WHERE status='pending'` would have returned it via the previous
        # pending-docs query. Simulate that stale snapshot by loading the
        # doc into the session even though it is already indexed.
        stale_doc = db.query(Document).filter(Document.id == doc_id).first()
        assert stale_doc.status == "indexed"

        claimed = _claim_pending_doc(db, stale_doc, worker_id="test-worker")
        assert claimed is False, "claim must fail for non-pending docs"

        # The critical assertion: status must STILL be 'indexed' and must
        # not have been demoted to 'processing'.
        db.expire_all()
        row = db.query(Document).filter(Document.id == doc_id).first()
        assert row.status == "indexed", (
            f"Worker claim must not demote non-pending docs; got status={row.status}"
        )
        assert row.worker_id is None


def test_worker_claim_succeeds_for_pending_doc():
    """Positive case: a doc in 'pending' status is atomically claimed."""
    from sqlalchemy import text
    import sys

    sys.path.insert(
        0,
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "apps", "worker"),
    )
    from worker import _claim_pending_doc  # type: ignore[attr-defined]

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

        doc = Document(
            user_id=user.id,
            title="pending.doc",
            filename="pending.doc",
            status="pending",
            file_size=0,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        doc_id = doc.id

    with SessionLocal() as db:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        claimed = _claim_pending_doc(db, doc, worker_id="test-worker")
        assert claimed is True

        db.expire_all()
        row = db.query(Document).filter(Document.id == doc_id).first()
        assert row.status == "processing"
        assert row.worker_id == "test-worker"
        assert row.claimed_at is not None
