"""Encryption helpers for locally-stored provider API keys (Fernet)."""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

import config as cfg


def _fernet_key() -> bytes:
    secret = cfg.LOCAL_ENCRYPTION_KEY or cfg.SIGNING_SECRET
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_value(plaintext: str) -> str:
    """Encrypt a secret (e.g. an API key) for storage."""
    if not plaintext:
        return ""
    return Fernet(_fernet_key()).encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_value(token: str) -> str:
    """Decrypt a stored secret. Returns '' if the token is empty/invalid."""
    if not token:
        return ""
    try:
        return Fernet(_fernet_key()).decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken:
        return ""
    except Exception:
        return ""
