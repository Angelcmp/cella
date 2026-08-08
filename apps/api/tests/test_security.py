"""Security tests: cookies, CSRF, rate limiting."""

from __future__ import annotations

from fastapi.testclient import TestClient

import config as cfg
import main as app_main


def _enable_csrf():
    cfg.CSRF_ENABLED = True
    app_main.app.dependency_overrides.clear()
    # Force a fresh set of default headers by re-importing routers? Not needed:
    # verify_csrf reads cfg.CSRF_ENABLED at request time.


def _disable_csrf():
    cfg.CSRF_ENABLED = False


def _csrf_token(subject: str = "test") -> str:
    from security.csrf import create_csrf_token

    return create_csrf_token(subject)


def test_security_headers_present(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("Referrer-Policy") == "no-referrer"


def test_security_headers_hsts_only_production(client: TestClient):
    cfg.ENVIRONMENT = "development"
    resp = client.get("/health")
    assert "Strict-Transport-Security" not in resp.headers
    cfg.ENVIRONMENT = "development"


def test_csrf_blocks_mutation_without_token(client: TestClient):
    _enable_csrf()
    try:
        # POST to a mutating endpoint without CSRF token
        resp = client.post(
            "/documents/upload",
            files={"file": ("a.txt", b"hello", "text/plain")},
        )
        assert resp.status_code == 403
        assert "CSRF" in resp.text
    finally:
        _disable_csrf()


def test_csrf_blocks_bad_origin(client: TestClient):
    _enable_csrf()
    try:
        token = _csrf_token()
        resp = client.post(
            "/documents/upload",
            files={"file": ("a.txt", b"hello", "text/plain")},
            headers={
                "x-csrf-token": token,
                "Origin": "https://evil.example.com",
            },
            cookies={"XSRF-TOKEN": token},
        )
        assert resp.status_code == 403
    finally:
        _disable_csrf()


def test_csrf_allows_valid_token_and_origin(client: TestClient):
    _enable_csrf()
    try:
        token = _csrf_token()
        resp = client.post(
            "/documents/upload",
            files={"file": ("a.txt", b"hello", "text/plain")},
            headers={
                "x-csrf-token": token,
                "Origin": "http://localhost:3000",
            },
            cookies={"XSRF-TOKEN": token},
        )
        # Should pass CSRF; then upload validation may 400 for size/signature
        # or succeed. Either way it must NOT be a CSRF 403.
        assert resp.status_code != 403
    finally:
        _disable_csrf()


def test_rate_limit_429_and_headers(client: TestClient):
    cfg.RATE_LIMIT_ENABLED = True
    # Use a low per-minute limit for the upload endpoint
    original_limit = app_main.LIMITS.get("/documents/upload")
    app_main.LIMITS["/documents/upload"] = 3
    try:
        for _ in range(4):
            resp = client.post(
                "/documents/upload",
                files={"file": ("a.txt", b"hello", "text/plain")},
            )
        assert resp.status_code == 429
        assert resp.headers.get("X-RateLimit-Limit") == "3"
        assert resp.headers.get("X-RateLimit-Remaining") == "0"
        assert resp.headers.get("Retry-After")
    finally:
        app_main.LIMITS["/documents/upload"] = original_limit
        cfg.RATE_LIMIT_ENABLED = False


def test_rate_limit_isolates_users_by_token(client: TestClient):
    """Two distinct user tokens on the same IP get independent windows."""
    from auth_simple import create_access_token
    from database_simple import SessionLocal, User

    cfg.RATE_LIMIT_ENABLED = True
    cfg.RATE_LIMIT_PER_USER = True
    original_limit = app_main.LIMITS.get("/documents/upload")
    app_main.LIMITS["/documents/upload"] = 3
    try:
        with SessionLocal() as db:
            u1 = User(email="u1@test.local", hashed_password="x", full_name="U1", username="u1")
            u2 = User(email="u2@test.local", hashed_password="x", full_name="U2", username="u2")
            db.add_all([u1, u2])
            db.commit()
            db.refresh(u1)
            db.refresh(u2)
        token1 = create_access_token(u1.id)
        token2 = create_access_token(u2.id)

        # Exhaust user1's window
        for _ in range(4):
            resp = client.post(
                "/documents/upload",
                files={"file": ("a.txt", b"hello", "text/plain")},
                headers={"Authorization": f"Bearer {token1}"},
            )
        assert resp.status_code == 429

        # user2 with the same IP must still pass
        resp2 = client.post(
            "/documents/upload",
            files={"file": ("a.txt", b"hello", "text/plain")},
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert resp2.status_code != 429
    finally:
        app_main.LIMITS["/documents/upload"] = original_limit
        cfg.RATE_LIMIT_ENABLED = False
        cfg.RATE_LIMIT_PER_USER = True
