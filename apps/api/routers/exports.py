"""Conversation listing and export (Markdown / JSON).

Conversations and their messages are persisted in the DB by the chat router
(routers/chat.py). This module exposes read-only endpoints so the frontend can
list a user's conversations and export them as readable transcripts.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database_simple import Conversation, Document, Message, User, get_db
from routers.auth import get_current_user

router = APIRouter(tags=["conversations"])


class ConversationOut(BaseModel):
    id: str
    document_id: str
    document_ids: Optional[List[str]] = None
    document_title: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    message_count: int = 0


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    citations: Optional[list] = None
    created_at: Optional[datetime] = None


class ConversationDetailOut(BaseModel):
    id: str
    document_id: str
    document_ids: Optional[List[str]] = None
    document_title: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    messages: List[MessageOut] = []


def _conversation_title(db: Session, conv: Conversation) -> Optional[str]:
    """Best-effort title: the primary document's title, else first title."""
    titles = []
    for doc_id in [conv.document_id, *(conv.document_ids or [])]:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            titles.append(doc.title)
    return titles[0] if titles else None


def _last_message_at(db: Session, conv: Conversation) -> Optional[datetime]:
    message = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    return message.created_at if message else None


@router.get("/conversations", response_model=List[ConversationOut])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's conversations, newest first."""
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    result: List[ConversationOut] = []
    for conv in conversations:
        count = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .count()
        )
        result.append(
            ConversationOut(
                id=conv.id,
                document_id=conv.document_id,
                document_ids=conv.document_ids,
                document_title=_conversation_title(db, conv),
                created_at=conv.created_at,
                updated_at=_last_message_at(db, conv),
                message_count=count,
            )
        )
    return result


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailOut)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a conversation with its full message history."""
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return ConversationDetailOut(
        id=conv.id,
        document_id=conv.document_id,
        document_ids=conv.document_ids,
        document_title=_conversation_title(db, conv),
        created_at=conv.created_at,
        updated_at=_last_message_at(db, conv),
        messages=[
            MessageOut(
                id=m.id,
                role=m.role,
                content=m.content,
                citations=m.citations,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


def _build_markdown(conv: ConversationDetailOut) -> str:
    lines: List[str] = []
    title = conv.document_title or "Conversación"
    lines.append(f"# {title}\n")
    lines.append(f"- Conversación: `{conv.id}`")
    if conv.document_ids:
        lines.append(f"- Documentos: {len(conv.document_ids)}")
    if conv.created_at:
        lines.append(f"- Creada: {conv.created_at.isoformat()}")
    if conv.updated_at:
        lines.append(f"- Última actividad: {conv.updated_at.isoformat()}")
    lines.append("")

    for msg in conv.messages:
        if msg.role == "user":
            lines.append("## Usuario\n")
            lines.append(f"{msg.content}\n")
        else:
            lines.append("## Cella (IA)\n")
            lines.append(f"{msg.content}\n")
            if msg.citations:
                lines.append("### Citas\n")
                for i, c in enumerate(msg.citations, start=1):
                    page = c.get("page")
                    snippet = c.get("snippet", "")
                    doc = c.get("document")
                    where = f"p.{page}" if page else ""
                    if doc:
                        where = f"{doc} {where}".strip()
                    lines.append(f"[{i}] ({where}) “{snippet}”\n")
    return "\n".join(lines).rstrip() + "\n"


def _build_json(conv: ConversationDetailOut) -> str:
    data = {
        "id": conv.id,
        "document_title": conv.document_title,
        "document_ids": conv.document_ids,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "citations": m.citations,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in conv.messages
        ],
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


@router.get("/conversations/{conversation_id}/export")
async def export_conversation(
    conversation_id: str,
    request: Request,
    format: str = "md",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export a conversation as Markdown ('md') or JSON ('json')."""
    conv = await get_conversation(conversation_id, current_user, db)
    if format not in ("md", "markdown", "json"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Use 'md' or 'json'.",
        )

    if format == "json":
        filename = f"cella-conversation-{conversation_id}.json"
        return JSONResponse(
            json.loads(_build_json(conv)),
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    filename = f"cella-conversation-{conversation_id}.md"
    return PlainTextResponse(
        _build_markdown(conv),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
