import hmac
import os
import time
from hashlib import sha256
from typing import Optional, Set

from fastapi import Header, HTTPException, Request, status

import config as cfg


def _secret_key() -> bytes:
    return cfg.CSRF_SECRET_KEY.encode()


def create_csrf_token(subject: str) -> str:
    """Create a signed CSRF token bound to a subject (e.g., user_id).
    Format: version|timestamp|subject|nonce|signature
    signature = HMAC-SHA256(secret, f"v1|ts|sub|nonce")
    """
    ts = str(int(time.time()))
    nonce = os.urandom(8).hex()
    payload = f"v1|{ts}|{subject}|{nonce}"
    sig = hmac.new(_secret_key(), payload.encode(), sha256).hexdigest()
    return f"{payload}|{sig}"


def _verify_signature(token: str) -> Optional[str]:
    try:
        parts = token.split("|")
        if len(parts) != 5:
            return None
        version, ts, subject, nonce, sig = parts
        if version != "v1":
            return None
        payload = f"{version}|{ts}|{subject}|{nonce}"
        expected = hmac.new(_secret_key(), payload.encode(), sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return None
        # Optional: token lifetime window (e.g., 24h)
        try:
            ts_i = int(ts)
        except ValueError:
            return None
        max_age = int(os.getenv("CSRF_MAX_AGE_SECONDS", "86400"))
        if max_age > 0 and (time.time() - ts_i) > max_age:
            return None
        return subject
    except Exception:
        return None


def _is_mutating_method(method: str) -> bool:
    return method.upper() in {"POST", "PUT", "PATCH", "DELETE"}


def _is_exempt_path(path: str) -> bool:
    # Paths that must be exempt (auth and pre-login flows)
    EXEMPT: Set[str] = {
        "/auth/login",
        "/auth/refresh",
        "/auth/logout",
        "/auth/register",
        "/auth/guest",
    }
    # Prefix-based exemptions can be added here if needed
    return path in EXEMPT


async def verify_csrf(
    request: Request,
    x_csrf_token: Optional[str] = Header(None, alias=os.getenv("CSRF_HEADER_NAME", "x-csrf-token")),
):
    """FastAPI dependency to enforce CSRF on mutating requests.
    - Exempts OPTIONS and selected auth endpoints.
    - Validates Origin/Referer against allowed origins.
    - Implements double-submit cookie + header with HMAC token.
    """
    if not cfg.CSRF_ENABLED:
        return

    method = request.method.upper()
    if method == "OPTIONS":
        return
    if not _is_mutating_method(method):
        return

    path = request.url.path
    if _is_exempt_path(path):
        return

    # Validate Origin/Referer when available
    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")

    # Allowed origins derived from CORS config
    allowed = {"http://localhost:3000", "http://127.0.0.1:3000"}
    # Allow override via env (comma-separated)
    extra = os.getenv("CSRF_ALLOWED_ORIGINS", "")
    if extra:
        allowed.update({o.strip() for o in extra.split(",") if o.strip()})
    # Also honor NEXT_PUBLIC_PUBLIC_URL if provided (used by frontend)
    public_url = os.getenv("NEXT_PUBLIC_PUBLIC_URL")
    if public_url:
        try:
            from urllib.parse import urlparse
            pu = urlparse(public_url)
            if pu.scheme and pu.netloc:
                allowed.add(f"{pu.scheme}://{pu.netloc}")
        except Exception:
            pass

    if origin and origin not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Origin header")
    if not origin and referer:
        # Basic referer host check
        try:
            from urllib.parse import urlparse

            ref = urlparse(referer)
            ref_origin = f"{ref.scheme}://{ref.netloc}"
            if ref_origin not in allowed:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Referer header")
        except Exception:
            # If parsing fails, reject to be safe
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Referer header")

    # Double submit cookie check
    cookie_name = os.getenv("CSRF_COOKIE_NAME", "XSRF-TOKEN")
    header_name = os.getenv("CSRF_HEADER_NAME", "x-csrf-token")
    cookie_token = request.cookies.get(cookie_name)
    if not cookie_token or not x_csrf_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing CSRF token")
    if cookie_token != x_csrf_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token mismatch")

    # Verify signature
    subject = _verify_signature(cookie_token)
    if not subject:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")

    return


def set_csrf_cookie(response, subject: str):
    """Helper to set CSRF cookie after login/refresh."""
    cookie_name = os.getenv("CSRF_COOKIE_NAME", "XSRF-TOKEN")
    token = create_csrf_token(subject)
    response.set_cookie(
        key=cookie_name,
        value=token,
        httponly=False,  # must be readable by JS to send header
        secure=cfg.COOKIE_SECURE,
        samesite=os.getenv("CSRF_SAMESITE", cfg.COOKIE_SAMESITE),
        path="/",
        max_age=int(os.getenv("CSRF_MAX_AGE_SECONDS", "86400")),
    )


def clear_csrf_cookie(response):
    cookie_name = os.getenv("CSRF_COOKIE_NAME", "XSRF-TOKEN")
    response.delete_cookie(
        key=cookie_name,
        samesite=os.getenv("CSRF_SAMESITE", cfg.COOKIE_SAMESITE),
        secure=cfg.COOKIE_SECURE,
        path="/",
    )
