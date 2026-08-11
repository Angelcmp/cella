"""Límites por plan y contadores de uso (ventana 24h).

ENFORCE_PLAN_LIMITS=false (default LOCAL_MODE): solo registra contadores sin
bloquear acciones. Los contadores se exponen en GET /usage y en el popover de
ajustes del frontend.

Cuando ENFORCE_PLAN_LIMITS=true (modo servidor):
- Documentos: límite total de documentos (hard cap, no ventana).
- Chats y summaries: límites por ventana de 24h sliding.

La respuesta de límite excedido es 402 (plan sin acceso a la acción) o 429
(ventana temporal excedida), según dice el roadmap.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

import config as cfg
from database_simple import UsageEvent, User


def _plan_limits(plan: str) -> dict:
    plans = cfg.PLAN_LIMITS or {}
    return plans.get(plan, {})


def _window_start() -> datetime:
    return datetime.utcnow() - timedelta(hours=24)


def _count_since(db: Session, user_id: str, action: str, since: datetime) -> int:
    return (
        db.query(func.count(UsageEvent.id))
        .filter(
            UsageEvent.user_id == user_id,
            UsageEvent.action == action,
            UsageEvent.created_at >= since,
        )
        .scalar()
        or 0
    )


def record_usage(db: Session, user_id: str, action: str) -> None:
    db.add(UsageEvent(user_id=user_id, action=action))
    db.commit()


def enforce_limit(
    db: Session,
    user: User,
    action: str,
    *,
    windowed: bool = True,
) -> None:
    """Raise 402/429 if the user plan limits are exceeded.

    Pass `windowed=False` for absolute caps (e.g. total documents).
    """
    if not cfg.ENFORCE_PLAN_LIMITS:
        return
    plan_limits = _plan_limits(user.plan)
    if not plan_limits:
        return

    key = action
    limit = plan_limits.get(key)
    if limit is None:
        return

    if not windowed:
        total = (
            db.query(func.count(UsageEvent.id))
            .filter(UsageEvent.user_id == user.id, UsageEvent.action == action)
            .scalar()
            or 0
        )
        if total >= limit:
            raise HTTPException(
                status_code=402,
                detail=f"Plan '{user.plan}' limit reached: {limit} {action}(s)",
            )
        return

    since = _window_start()
    count = _count_since(db, user.id, action, since)
    if count >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit reached ({limit} per 24h) for action '{action}'",
        )


def usage_summary(db: Session, user: User) -> dict:
    """Return current usage counts and remaining for the user's plan."""
    plan = user.plan
    limits = _plan_limits(plan)
    doc_limit = limits.get("documents")
    chat_limit = limits.get("chats_per_day")
    summary_limit = limits.get("summaries_per_day")

    since = _window_start()
    chats_used = _count_since(db, user.id, "chat", since)
    summaries_used = _count_since(db, user.id, "summary", since)

    total_docs = (
        db.query(func.count(UsageEvent.id))
        .filter(UsageEvent.user_id == user.id, UsageEvent.action == "document_upload")
        .scalar()
        or 0
    )

    return {
        "plan": plan,
        "enforced": cfg.ENFORCE_PLAN_LIMITS,
        "window_hours": 24,
        "window_start": since.isoformat(),
        "documents": {
            "used": total_docs,
            "limit": doc_limit,
            "remaining": None if doc_limit is None else max(doc_limit - total_docs, 0),
        },
        "chats_per_day": {
            "used": chats_used,
            "limit": chat_limit,
            "remaining": None if chat_limit is None else max(chat_limit - chats_used, 0),
        },
        "summaries_per_day": {
            "used": summaries_used,
            "limit": summary_limit,
            "remaining": None if summary_limit is None else max(summary_limit - summaries_used, 0),
        },
    }