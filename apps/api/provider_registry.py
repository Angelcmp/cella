"""Singleton provider router that loads stored UI-managed configurations."""

from __future__ import annotations

import json
import logging
import threading
from typing import Any, Dict, List, Optional

from providers import ProviderRouter
from security.encryption import decrypt_value

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_router: Optional[ProviderRouter] = None


def _load_stored_configs() -> List[Dict[str, Any]]:
    """Load stored provider configs from the DB, decrypting API keys."""
    try:
        from database_simple import ProviderConfig, SessionLocal

        stored: List[Dict[str, Any]] = []
        with SessionLocal() as db:
            rows = db.query(ProviderConfig).order_by(ProviderConfig.created_at).all()
            for row in rows:
                try:
                    data = json.loads(decrypt_value(row.config) or "{}")
                except Exception:
                    continue
                data["name"] = row.name
                data["provider_type"] = row.provider_type
                data["id"] = row.id
                stored.append(data)
        return stored
    except Exception as exc:
        logger.warning(f"Failed to load stored provider configs: {exc}")
        return []


def _build() -> ProviderRouter:
    return ProviderRouter(_load_stored_configs())


def get_router() -> ProviderRouter:
    global _router
    with _lock:
        if _router is None:
            _router = _build()
        return _router


def reload_router() -> ProviderRouter:
    global _router
    with _lock:
        _router = _build()
        return _router


def list_models() -> List[Dict[str, Any]]:
    return get_router().list_chat_models()
