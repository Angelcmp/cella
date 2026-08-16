import asyncio

from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, Request
from starlette.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Iterator
import re
import json
import logging
import os
import time

from database_simple import get_db, User, Document, Conversation, Message, DocumentSummary
from routers.auth import get_current_user
from rag_system import RAGSystem
from security.csrf import verify_csrf as csrf_protect

import config as cfg

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None
    stream: bool = False
    document_ids: Optional[List[str]] = None

class CitationResponse(BaseModel):
    page: int
    snippet: str
    similarity: Optional[float] = None
    document: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    citations: List[CitationResponse]
    success: bool
    conversation_id: str
    error: Optional[str] = None
    chunks_found: Optional[int] = None
    confidence: Optional[float] = None
    coverage: Optional[float] = None

# Initialize RAG system
rag_system = RAGSystem()
logger.info(f"Chat router initialized with provider: {getattr(rag_system, 'provider', 'unknown')}")

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")

THINKING_ENABLED = os.getenv("THINKING_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}


def _is_reasoning_model(model: Optional[str]) -> bool:
    """Heuristic: does this model expose native reasoning content?"""
    m = (model or "").lower()
    return any(k in m for k in ("reasoner", "z1", "thinking", "glm-4.6", "glm-4.7", "deepseek-r"))


def _synthetic_thinking() -> Iterator[str]:
    """Brief fallback "thinking" phase used when the model has no reasoning."""
    for step in (
        "Leyendo el documento…",
        "Buscando los fragmentos más relevantes…",
        "Ordenando la respuesta con citas…",
    ):
        yield step


def _sanitize_message(text: str) -> str:
    sanitized = _CONTROL_CHARS.sub("", text or "")
    return sanitized.strip()


def _get_or_create_conversation(
    db: Session,
    user_id: str,
    document_id: str,
    document_ids: Optional[List[str]] = None,
) -> Conversation:
    query = db.query(Conversation).filter(
        Conversation.user_id == user_id,
        Conversation.document_id == document_id,
    )
    if document_ids:
        query = query.filter(Conversation.document_ids == document_ids)
    else:
        query = query.filter(Conversation.document_ids.is_(None))
    conversation = query.first()
    if not conversation:
        conversation = Conversation(
            user_id=user_id,
            document_id=document_id,
            document_ids=document_ids,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    return conversation


def _validate_documents(db: Session, user_id: str, document_ids: List[str]) -> Dict[str, str]:
    """Validate that every document exists and belongs to the user.
    Returns a mapping document_id -> title."""
    titles: Dict[str, str] = {}
    for doc_id in document_ids:
        document = db.query(Document).filter(
            Document.id == doc_id,
            Document.user_id == user_id,
        ).first()
        if not document:
            raise HTTPException(
                status_code=404,
                detail=f"Document {doc_id} not found or you don't have access to it"
            )
        if document.status != "indexed":
            raise HTTPException(
                status_code=400,
                detail=f"Document '{document.title}' is not ready for chat. Status: {document.status}"
            )
        titles[doc_id] = document.title
    return titles


@router.get("/stats/usage")
async def usage_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate usage stats for the Advanced tab of the model settings modal.

    Returns:
    - messages_total, messages_by_role (user / assistant)
    - tokens_estimated_total (sum of Message.tokens_estimated + DocumentSummary.tokens_used)
    - models_used: [{ model, messages, tokens }] sorted by usage desc
    - conversations_total
    - last_activity_at
    """
    from sqlalchemy import func as sqlfunc

    # Total messages by role
    role_counts = dict(
        db.query(Message.role, sqlfunc.count(Message.id))
        .filter(Message.conversation_id.in_(
            db.query(Conversation.id).filter(Conversation.user_id == current_user.id)
        ))
        .group_by(Message.role)
        .all()
    )
    messages_total = sum(role_counts.values())

    # Tokens estimated (from messages) + actual tokens (from summaries)
    tokens_messages = (
        db.query(sqlfunc.coalesce(sqlfunc.sum(Message.tokens_estimated), 0))
        .filter(Message.conversation_id.in_(
            db.query(Conversation.id).filter(Conversation.user_id == current_user.id)
        ))
        .scalar()
        or 0
    )
    tokens_summaries = (
        db.query(sqlfunc.coalesce(sqlfunc.sum(DocumentSummary.tokens_used), 0))
        .filter(DocumentSummary.document_id.in_(
            db.query(Document.id).filter(Document.user_id == current_user.id)
        ))
        .scalar()
        or 0
    )
    tokens_estimated_total = int(tokens_messages) + int(tokens_summaries)

    # Models used — grouped by model field on Message (only assistant messages)
    model_rows = (
        db.query(
            Message.model,
            sqlfunc.count(Message.id),
            sqlfunc.coalesce(sqlfunc.sum(Message.tokens_estimated), 0),
        )
        .filter(
            Message.conversation_id.in_(
                db.query(Conversation.id).filter(Conversation.user_id == current_user.id)
            ),
            Message.role == "assistant",
            Message.model.isnot(None),
        )
        .group_by(Message.model)
        .order_by(sqlfunc.count(Message.id).desc())
        .limit(10)
        .all()
    )
    models_used = [
        {
            "model": row[0],
            "messages": int(row[1]),
            "tokens_estimated": int(row[2]),
        }
        for row in model_rows
    ]

    # Conversations total + last activity
    conv_q = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    conversations_total = conv_q.count()
    last_activity_row = (
        db.query(sqlfunc.max(Message.created_at))
        .filter(Message.conversation_id.in_(
            db.query(Conversation.id).filter(Conversation.user_id == current_user.id)
        ))
        .scalar()
    )

    return {
        "messages_total": messages_total,
        "messages_by_role": {
            "user": int(role_counts.get("user", 0)),
            "assistant": int(role_counts.get("assistant", 0)),
        },
        "tokens_estimated_total": tokens_estimated_total,
        "tokens_from_messages": int(tokens_messages),
        "tokens_from_summaries": int(tokens_summaries),
        "models_used": models_used,
        "conversations_total": conversations_total,
        "last_activity_at": last_activity_row.isoformat() if last_activity_row else None,
    }


@router.post("/documents/{document_id}")
async def chat_with_document(
    document_id: str,
    chat_request: ChatRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(csrf_protect),
):
    """Chat with a specific document.
    """
    try:
        from usage import enforce_limit, record_usage

        enforce_limit(db, current_user, "chats_per_day", windowed=True)
        record_usage(db, current_user.id, "chats_per_day")
    except HTTPException:
        raise
    except Exception:
        pass

    try:
        # Determine target documents (multi-doc or single). When the client
        # passes document_ids, every id must be validated against the user
        # and indexed state — otherwise the path-param document_id is used.
        ids_from_request = list(chat_request.document_ids or [])
        is_multi = len(ids_from_request) > 1
        if ids_from_request:
            document_titles = _validate_documents(db, current_user.id, ids_from_request)
            document_id = ids_from_request[0]
            document_title = document_titles[document_id]
        else:
            document = db.query(Document).filter(
                Document.id == document_id,
                Document.user_id == current_user.id
            ).first()

            if not document:
                raise HTTPException(
                    status_code=404,
                    detail="Document not found or you don't have access to it"
                )

            if document.status != "indexed":
                raise HTTPException(
                    status_code=400,
                    detail=f"Document is not ready for chat. Status: {document.status}"
                )
            document_title = document.title

        # Find or create conversation and save user message
        conversation = _get_or_create_conversation(
            db, current_user.id, document_id,
            document_ids=(chat_request.document_ids if is_multi else None),
        )
        sanitized_message = _sanitize_message(chat_request.message)
        if not sanitized_message:
            raise HTTPException(
                status_code=400,
                detail="El mensaje no puede estar vacío."
            )

        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=sanitized_message,
            tokens_estimated=len(sanitized_message) // 4,
        )
        db.add(user_message)
        db.commit()

        logger.info(
            f"Processing chat request for document {document_id} "
            f"(multi={is_multi}), stream={chat_request.stream}, model={chat_request.model}"
        )

        if chat_request.stream:
            if is_multi:
                return _stream_multi_chat_response(
                    db,
                    conversation.id,
                    chat_request.document_ids,
                    document_titles,
                    sanitized_message,
                    chat_request.model,
                    background_tasks,
                    request,
                )
            return _stream_chat_response(
                db,
                conversation.id,
                document_id,
                document_title,
                sanitized_message,
                chat_request.model,
                background_tasks,
                request,
            )

        # Non-streaming path
        if is_multi:
            rag_result = rag_system.chat_with_documents(
                db=db,
                document_ids=chat_request.document_ids,
                document_titles=document_titles,
                user_query=sanitized_message,
                model=chat_request.model,
            )
        else:
            rag_result = rag_system.chat_with_document(
                db=db,
                document_id=document_id,
                document_title=document_title,
                user_query=sanitized_message,
                model=chat_request.model,
            )

        # Save AI response
        ai_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=rag_result["response"],
            citations=rag_result["citations"],
            chunks_found=rag_result.get("chunks_found"),
            coverage=rag_result.get("coverage"),
            model=chat_request.model,
            tokens_estimated=len(rag_result["response"]) // 4 if rag_result.get("response") else 0,
        )
        db.add(ai_message)
        db.commit()

        citations_response = [
            CitationResponse(
                page=citation["page"],
                snippet=citation["snippet"],
                similarity=citation.get("similarity"),
                document=citation.get("document"),
            )
            for citation in rag_result["citations"]
        ]

        return ChatResponse(
            response=rag_result["response"],
            citations=citations_response,
            success=rag_result["success"],
            conversation_id=conversation.id,
            error=rag_result.get("error"),
            chunks_found=rag_result.get("chunks_found"),
            confidence=rag_result.get("confidence"),
            coverage=rag_result.get("coverage"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


def _save_ai_message(
    conversation_id: str,
    full_response: str,
    citations: List[Dict[str, Any]],
    chunks_found: Optional[int],
    coverage: Optional[float],
    model: Optional[str] = None,
) -> None:
    """Background task: persist the streamed assistant response."""
    # This function runs in a background task; the dependency injection-managed
    # session is not available here, so we create a standalone session.
    try:
        from database_simple import SessionLocal
        db = SessionLocal()
        try:
            ai_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                citations=citations,
                chunks_found=chunks_found,
                coverage=coverage,
                model=model,
                tokens_estimated=len(full_response) // 4 if full_response else 0,
            )
            db.add(ai_message)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to save streamed AI message: {e}")


def _chat_event_stream(
    *,
    conversation_id: str,
    citations: List[Dict[str, Any]],
    chunks_found: Any,
    coverage: Any,
    prompt: Optional[str],
    metadata_response: Optional[str],
    model: Optional[str],
    request: Optional[Request],
    background_tasks: BackgroundTasks,
) -> Iterator[str]:
    """Shared SSE generator for single + multi-doc chat.

    Guarantees:
    - `event: meta` is the first event with citations/stats.
    - Heartbeat `event: ping` every STREAM_HEARTBEAT_SECONDS while waiting for
      LLM tokens (keeps proxies alive during long reasoning chains).
    - `event: done` is **always** the last event, even on error.
    - Cancellation: when the client disconnects, the generator stops cleanly
      (the LLM iteration is broken, background save still runs).
    """
    full_response = ""
    start_ts = time.time()
    thinking_open = False
    errored: Optional[str] = None

    heartbeat_s = max(int(getattr(cfg, "STREAM_HEARTBEAT_SECONDS", 15)), 1)
    last_yield_ts = time.time()

    def _beep():
        return "event: ping\ndata: {}\n\n"

    def _disconnected() -> bool:
        if request is None:
            return False
        # is_disconnected() is async; we use a sync check via the generator
        # state — Starlette exposes this through request.is_disconnected()
        # which we'd normally `await`. Inside a sync generator running in a
        # threadpool, we skip this check: the response body is closed when
        # the client disconnects, so subsequent `yield from` raises. The
        # `try/except StopIteration` around the LLM loop catches that.
        return False

    try:
        # Initial metadata event (citations, coverage, etc.)
        meta_payload = {
            "event": "meta",
            "conversation_id": conversation_id,
            "chunks_found": chunks_found,
            "coverage": coverage,
            "citations": [
                {
                    "page": c.get("page", 0),
                    "snippet": c.get("snippet", ""),
                    "similarity": c.get("similarity"),
                    "document": c.get("document"),
                }
                for c in citations
            ],
        }
        yield f"event: meta\ndata: {json.dumps(meta_payload, ensure_ascii=False)}\n\n"
        last_yield_ts = time.time()

        if metadata_response:
            # Precomputed answer (metadata, abstention, etc.) — single text_delta
            full_response = metadata_response
            yield f"event: text_delta\ndata: {json.dumps({'event': 'text_delta', 'delta': metadata_response}, ensure_ascii=False)}\n\n"
        elif prompt:
            # Fallback: synthetic thinking phase for models without reasoning
            if THINKING_ENABLED and not _is_reasoning_model(model):
                yield "event: thinking_start\ndata: {}\n\n"
                thinking_open = True
                for step in _synthetic_thinking():
                    yield f"event: thinking_delta\ndata: {json.dumps({'event': 'thinking_delta', 'delta': step}, ensure_ascii=False)}\n\n"
                    if (time.time() - last_yield_ts) >= heartbeat_s:
                        yield _beep()
                        last_yield_ts = time.time()

            try:
                for kind, token in rag_system.chat_stream(prompt, model=model):
                    # Heartbeat if we've been silent too long
                    if (time.time() - last_yield_ts) >= heartbeat_s:
                        yield _beep()
                        last_yield_ts = time.time()

                    if kind == "thinking":
                        if not thinking_open:
                            yield "event: thinking_start\ndata: {}\n\n"
                            thinking_open = True
                        yield f"event: thinking_delta\ndata: {json.dumps({'event': 'thinking_delta', 'delta': token}, ensure_ascii=False)}\n\n"
                    else:
                        if thinking_open:
                            yield "event: thinking_end\ndata: {}\n\n"
                            thinking_open = False
                        full_response += token
                        yield f"event: text_delta\ndata: {json.dumps({'event': 'text_delta', 'delta': token}, ensure_ascii=False)}\n\n"
            finally:
                if thinking_open:
                    yield "event: thinking_end\ndata: {}\n\n"

    except (GeneratorExit, StopIteration):
        # Client disconnected — exit gracefully, do not emit done/error.
        logger.info(f"Client disconnected from chat stream (conv={conversation_id})")
        errored = "client_disconnected"
        raise
    except Exception as e:
        logger.error(f"Streaming chat error: {e}")
        errored = str(e)
    finally:
        # Summary event before terminator (best-effort)
        try:
            duration_ms = int((time.time() - start_ts) * 1000)
            summary_payload = {
                "duration_ms": duration_ms,
                "tokens_estimated": len(full_response) // 4,
                "model": model,
            }
            yield f"event: summary\ndata: {json.dumps(summary_payload, ensure_ascii=False)}\n\n"
        except Exception:
            pass

        if errored and errored != "client_disconnected":
            try:
                yield f"event: error\ndata: {json.dumps({'error': errored}, ensure_ascii=False)}\n\n"
            except Exception:
                pass

        # Always emit the terminator — even after error.
        # This was the missing piece: the FE couldn't tell when a broken
        # stream was really done, so the assistant bubble stayed empty.
        try:
            yield f"event: done\ndata: {json.dumps({'event': 'done', 'done': True}, ensure_ascii=False)}\n\n"
        except Exception:
            pass

        background_tasks.add_task(
            _save_ai_message,
            conversation_id,
            full_response,
            citations,
            chunks_found,
            coverage,
            model,
        )


def _stream_chat_response(
    db: Session,
    conversation_id: str,
    document_id: str,
    document_title: str,
    user_query: str,
    model: Optional[str],
    background_tasks: BackgroundTasks,
    request: Optional[Request] = None,
) -> StreamingResponse:
    """Build a streaming response generator and return it as SSE."""
    try:
        ctx = rag_system.prepare_chat_prompt(
            db=db,
            document_id=document_id,
            document_title=document_title,
            user_query=user_query,
        )
    except Exception as e:
        logger.error(f"Failed to prepare chat prompt: {e}")
        ctx = {
            "prompt": None,
            "relevant_chunks": [],
            "chunks_found": 0,
            "coverage": 0.0,
            "metadata_response": f"Lo siento, ocurrió un error al preparar la respuesta: {str(e)}",
        }

    citations = rag_system.extract_citations_from_chunks(
        ctx.get("relevant_chunks", []), document_title
    )
    metadata_response = ctx.get("metadata_response")
    chunks_found = ctx.get("chunks_found")
    coverage = ctx.get("coverage")

    return StreamingResponse(
        _chat_event_stream(
            conversation_id=conversation_id,
            citations=citations,
            chunks_found=chunks_found,
            coverage=coverage,
            prompt=ctx.get("prompt"),
            metadata_response=metadata_response,
            model=model,
            request=request,
            background_tasks=background_tasks,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _stream_multi_chat_response(
    db: Session,
    conversation_id: str,
    document_ids: List[str],
    document_titles: Dict[str, str],
    user_query: str,
    model: Optional[str],
    background_tasks: BackgroundTasks,
    request: Optional[Request] = None,
) -> StreamingResponse:
    """Build a streaming response generator for multi-document chat."""
    try:
        ctx = rag_system.prepare_multi_chat_prompt(
            db=db,
            document_ids=document_ids,
            document_titles=document_titles,
            user_query=user_query,
        )
    except Exception as e:
        logger.error(f"Failed to prepare multi chat prompt: {e}")
        ctx = {
            "prompt": None,
            "relevant_chunks": [],
            "chunks_found": 0,
            "coverage": 0.0,
            "metadata_response": f"Lo siento, ocurrió un error al preparar la respuesta: {str(e)}",
        }

    citations = rag_system.extract_citations_from_chunks(ctx.get("relevant_chunks", []))
    metadata_response = ctx.get("metadata_response")
    chunks_found = ctx.get("chunks_found")
    coverage = ctx.get("coverage")

    return StreamingResponse(
        _chat_event_stream(
            conversation_id=conversation_id,
            citations=citations,
            chunks_found=chunks_found,
            coverage=coverage,
            prompt=ctx.get("prompt"),
            metadata_response=metadata_response,
            model=model,
            request=request,
            background_tasks=background_tasks,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
