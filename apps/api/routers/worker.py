"""Worker status API: queue stats + DLQ resumen.

Exposes GET /worker/status so the operator / frontend can check
the state of the document pipeline without querying the DB directly.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database_simple import Document, User, get_db
from routers.auth import get_current_user

router = APIRouter(tags=["worker"])


@router.get("/worker/status")
async def worker_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = db.query(func.count(Document.id)).filter(
        Document.user_id == current_user.id,
    ).scalar() or 0

    status_counts = {
        row[0]: row[1]
        for row in db.query(Document.status, func.count(Document.id))
        .filter(Document.user_id == current_user.id)
        .group_by(Document.status)
        .all()
    }

    dlq_count = (
        db.query(func.count(Document.id))
        .filter(
            Document.user_id == current_user.id,
            Document.status == "failed",
            Document.dlq.is_(True),
        )
        .scalar()
        or 0
    )

    processing_stale = (
        db.query(func.count(Document.id))
        .filter(
            Document.user_id == current_user.id,
            Document.status == "processing",
        )
        .scalar()
        or 0
    )

    dlq_docs = (
        db.query(Document)
        .filter(
            Document.user_id == current_user.id,
            Document.status == "failed",
            Document.dlq.is_(True),
        )
        .order_by(Document.last_attempt_at.asc())
        .limit(20)
        .all()
    )

    return {
        "total": total,
        "by_status": status_counts,
        "dlq": dlq_count,
        "processing_stale": processing_stale,
        "dlq_entries": [
            {
                "id": d.id,
                "title": d.title,
                "attempts": d.attempts or 0,
                "last_error": d.last_error,
                "last_attempt_at": d.last_attempt_at.isoformat()
                if d.last_attempt_at
                else None,
            }
            for d in dlq_docs
        ],
    }