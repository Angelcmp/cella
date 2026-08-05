"""Authentication helpers with secure password hashing and HMAC-signed tokens."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from passlib.context import CryptContext
from sqlalchemy import func
from sqlalchemy.orm import Session

import config as cfg
from database_simple import RevokedToken, SessionLocal, User, get_db

# Password hashing context (bcrypt)
_pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    deprecated="auto",
)


@dataclass
class TokenPayload:
    user_id: str
    jti: str
    expires_at: datetime


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def _is_bcrypt_hash(hashed_password: str) -> bool:
    return hashed_password.startswith("$2") or hashed_password.startswith("$bcrypt")


def _legacy_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if _is_bcrypt_hash(hashed_password):
        try:
            return _pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False
    # Legacy SHA256 fallback
    return _legacy_hash(plain_password) == hashed_password


def get_password_hash(password: str) -> str:
    return _pwd_context.hash(password)


# ---------------------------------------------------------------------------
# Token utilities (HMAC signed, compact token)
# ---------------------------------------------------------------------------

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _token_expiry(minutes: Optional[int] = None) -> datetime:
    minutes = minutes or cfg.ACCESS_TOKEN_EXPIRE_MINUTES
    return datetime.utcnow() + timedelta(minutes=minutes)


def _sign(data: str) -> str:
    signature = hmac.new(
        cfg.SIGNING_SECRET.encode("utf-8"),
        data.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(signature)


def create_access_token(user_id: str, expires_minutes: Optional[int] = None) -> str:
    issued_at = datetime.utcnow()
    expires_at = _token_expiry(expires_minutes)
    payload = {
        "sub": user_id,
        "jti": str(uuid.uuid4()),
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    payload_b64 = _b64url_encode(payload_json.encode("utf-8"))
    signature = _sign(payload_b64)
    return f"{payload_b64}.{signature}"


def _decode_token_str(
    token: str,
    *,
    allow_expired: bool = False,
    verify_revocation: bool = True,
) -> Optional[TokenPayload]:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None

    expected_signature = _sign(payload_b64)
    if not hmac.compare_digest(signature, expected_signature):
        return None

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (ValueError, json.JSONDecodeError):
        return None

    user_id = payload.get("sub")
    jti = payload.get("jti")
    exp = payload.get("exp")
    if not user_id or not jti or exp is None:
        return None

    expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
    if not allow_expired and expires_at < datetime.now(tz=timezone.utc):
        return None

    if verify_revocation and _is_token_revoked(jti):
        return None

    return TokenPayload(user_id=user_id, jti=jti, expires_at=expires_at)


def _is_token_revoked(jti: str) -> bool:
    with SessionLocal() as db:
        record = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
        if not record:
            return False
        if record.expires_at < datetime.utcnow():
            db.delete(record)
            db.commit()
            return False
        return True


def revoke_token(token: str) -> None:
    payload = _decode_token_str(token, allow_expired=True, verify_revocation=False)
    if not payload:
        return
    with SessionLocal() as db:
        expires_at = payload.expires_at.astimezone(timezone.utc).replace(tzinfo=None)
        existing = db.query(RevokedToken).filter(RevokedToken.jti == payload.jti).first()
        if existing:
            existing.expires_at = expires_at
        else:
            db.add(RevokedToken(jti=payload.jti, expires_at=expires_at))
        db.commit()


def verify_token(token: str) -> Optional[TokenPayload]:
    return _decode_token_str(token)


# ---------------------------------------------------------------------------
# FastAPI helpers
# ---------------------------------------------------------------------------

def get_or_create_local_user(db: Session) -> User:
    """Return (creating if needed) the single local system user."""
    user = (
        db.query(User)
        .filter(func.lower(User.email) == cfg.LOCAL_USER_EMAIL.lower())
        .first()
    )
    if user:
        return user
    user = User(
        email=cfg.LOCAL_USER_EMAIL,
        hashed_password="local-no-password",
        plan=cfg.LOCAL_USER_PLAN,
        full_name="Cella Local",
        username="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    if cfg.LOCAL_MODE:
        return get_or_create_local_user(db)

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split()[1]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise credentials_exception

    payload = verify_token(token)
    if not payload:
        raise credentials_exception

    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None or not getattr(user, "is_active", True):
        raise credentials_exception
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    email_normalized = email.strip().lower()
    user = (
        db.query(User)
        .filter(func.lower(User.email) == email_normalized)
        .first()
    )
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not _is_bcrypt_hash(user.hashed_password):
        user.hashed_password = get_password_hash(password)
        db.add(user)
        try:
            db.commit()
        except Exception:
            db.rollback()
        else:
            db.refresh(user)
    if user.email != email_normalized:
        user.email = email_normalized
        try:
            db.commit()
        except Exception:
            db.rollback()
        else:
            db.refresh(user)
    return user
