import asyncio
from datetime import datetime, timedelta
import os
from typing import List

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

import config as cfg
from database_simple import (
    SessionLocal, User, Document, DocumentChunk, DocumentEmbedding,
    DocumentSummary, Conversation, Message, ExportHistory
)

UPLOAD_DIR = "uploads"
PROFILE_PICS_DIR = "profile_pics"


def _is_whitelisted(email: str) -> bool:
    return email.lower() in set(cfg.DEMO_WHITELIST_EMAILS)


def _delete_user_data(db: Session, user: User):
    # Delete conversations and messages
    convs = db.query(Conversation).filter(Conversation.user_id == user.id).all()
    conv_ids = [c.id for c in convs]
    if conv_ids:
        db.query(Message).filter(Message.conversation_id.in_(conv_ids)).delete(synchronize_session=False)
        db.query(Conversation).filter(Conversation.id.in_(conv_ids)).delete(synchronize_session=False)

    # Documents and related
    docs = db.query(Document).filter(Document.user_id == user.id).all()
    doc_ids = [d.id for d in docs]
    chunk_ids = []
    if doc_ids:
        # Delete files
        for d in docs:
            if d.storage_url and os.path.exists(d.storage_url):
                try:
                    os.remove(d.storage_url)
                except Exception:
                    pass
        # Chunks and embeddings
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(doc_ids)).all()
        chunk_ids = [c.id for c in chunks]
        if chunk_ids:
            db.query(DocumentEmbedding).filter(DocumentEmbedding.chunk_id.in_(chunk_ids)).delete(synchronize_session=False)
            db.query(DocumentChunk).filter(DocumentChunk.id.in_(chunk_ids)).delete(synchronize_session=False)
        # Summaries
        db.query(DocumentSummary).filter(DocumentSummary.document_id.in_(doc_ids)).delete(synchronize_session=False)
        # Documents
        db.query(Document).filter(Document.id.in_(doc_ids)).delete(synchronize_session=False)

    # Export history
    db.query(ExportHistory).filter(ExportHistory.user_id == user.id).delete(synchronize_session=False)

    # Profile picture
    if user.profile_picture:
        path = os.path.join(PROFILE_PICS_DIR, user.profile_picture)
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass

    # Finally, delete user
    db.delete(user)


def run_cleanup_once():
    db = SessionLocal()
    try:
        threshold = datetime.utcnow() - timedelta(hours=cfg.DEMO_AUTO_CLEAN_HOURS or 2)
        # target users: non-whitelisted AND (plan == 'demo' OR created_at older than threshold)
        candidates = db.query(User).filter(
            and_(
                User.is_active == True,
                User.created_at < threshold,
                or_(User.plan == 'demo', User.email.like('guest-%@demo.local'))
            )
        ).all()

        deleted = 0
        for u in candidates:
            if _is_whitelisted(u.email):
                continue
            _delete_user_data(db, u)
            deleted += 1
        db.commit()
        return deleted
    except Exception:
        db.rollback()
        return 0
    finally:
        db.close()


async def periodic_cleanup_task():
    # Run periodically while app is alive
    interval = 3600  # 1h
    while True:
        try:
            if cfg.DEMO_PUBLIC and (cfg.DEMO_AUTO_CLEAN_HOURS or 0) > 0:
                run_cleanup_once()
        except Exception:
            pass
        await asyncio.sleep(interval)


def run_full_reset():
    """Delete all non-whitelisted users and their data immediately."""
    db = SessionLocal()
    try:
        users = db.query(User).filter(or_(User.plan == 'demo', User.email.like('guest-%@demo.local'))).all()
        deleted = 0
        for u in users:
            if _is_whitelisted(u.email):
                continue
            _delete_user_data(db, u)
            deleted += 1
        db.commit()
        return deleted
    except Exception:
        db.rollback()
        return 0
    finally:
        db.close()
