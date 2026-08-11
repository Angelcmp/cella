from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from starlette.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Iterator
import re
import json
import logging
import os

from database_simple import get_db, User, Document, Conversation, Message
from routers.auth import get_current_user
from rag_system import RAGSystem
from security.csrf import verify_csrf as csrf_protect

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


@router.post("/documents/{document_id}")
async def chat_with_document(
    document_id: str,
    chat_request: ChatRequest,
    background_tasks: BackgroundTasks,
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
        # Determine target documents (multi-doc or single)
        is_multi = bool(chat_request.document_ids and len(chat_request.document_ids) > 1)
        if is_multi:
            document_titles = _validate_documents(db, current_user.id, chat_request.document_ids)
            document_id = chat_request.document_ids[0]
            document_title = document_titles[document_id]
        else:
            document_id = chat_request.document_ids[0] if chat_request.document_ids else document_id
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
            content=sanitized_message
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
                )
            return _stream_chat_response(
                db,
                conversation.id,
                document_id,
                document_title,
                sanitized_message,
                chat_request.model,
                background_tasks,
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
            )
            db.add(ai_message)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to save streamed AI message: {e}")


def _stream_chat_response(
    db: Session,
    conversation_id: str,
    document_id: str,
    document_title: str,
    user_query: str,
    model: Optional[str],
    background_tasks: BackgroundTasks,
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

    def event_stream() -> Iterator[str]:
        full_response = ""
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

            if metadata_response:
                # Precomputed answer (metadata, abstention, etc.)
                full_response = metadata_response
                payload = json.dumps({"event": "text_delta", "delta": metadata_response}, ensure_ascii=False)
                yield f"event: text_delta\ndata: {payload}\n\n"
                yield f"event: delta\ndata: {payload}\n\n"
            else:
                prompt = ctx.get("prompt")
                if prompt:
                    # Fallback: synthetic thinking phase for models without reasoning
                    thinking_open = False
                    if THINKING_ENABLED and not _is_reasoning_model(model):
                        yield "event: thinking_start\ndata: {}\n\n"
                        thinking_open = True
                        for step in _synthetic_thinking():
                            payload = json.dumps({"event": "thinking_delta", "delta": step}, ensure_ascii=False)
                            yield f"event: thinking_delta\ndata: {payload}\n\n"
                    try:
                        for kind, token in rag_system.chat_stream(prompt, model=model):
                            if kind == "thinking":
                                if not thinking_open:
                                    yield "event: thinking_start\ndata: {}\n\n"
                                    thinking_open = True
                                payload = json.dumps({"event": "thinking_delta", "delta": token}, ensure_ascii=False)
                                yield f"event: thinking_delta\ndata: {payload}\n\n"
                            else:
                                if thinking_open:
                                    yield "event: thinking_end\ndata: {}\n\n"
                                    thinking_open = False
                                full_response += token
                                payload = json.dumps({"event": "text_delta", "delta": token}, ensure_ascii=False)
                                yield f"event: text_delta\ndata: {payload}\n\n"
                    finally:
                        if thinking_open:
                            yield "event: thinking_end\ndata: {}\n\n"

            yield f"event: done\ndata: {json.dumps({'event': 'done', 'done': True}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Streaming chat error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            background_tasks.add_task(
                _save_ai_message,
                conversation_id,
                full_response,
                citations,
                chunks_found,
                coverage,
            )

    return StreamingResponse(
        event_stream(),
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

    def event_stream() -> Iterator[str]:
        full_response = ""
        try:
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

            if metadata_response:
                full_response = metadata_response
                payload = json.dumps({"event": "text_delta", "delta": metadata_response}, ensure_ascii=False)
                yield f"event: text_delta\ndata: {payload}\n\n"
                yield f"event: delta\ndata: {payload}\n\n"
            else:
                prompt = ctx.get("prompt")
                if prompt:
                    thinking_open = False
                    if THINKING_ENABLED and not _is_reasoning_model(model):
                        yield "event: thinking_start\ndata: {}\n\n"
                        thinking_open = True
                        for step in _synthetic_thinking():
                            payload = json.dumps({"event": "thinking_delta", "delta": step}, ensure_ascii=False)
                            yield f"event: thinking_delta\ndata: {payload}\n\n"
                    try:
                        for kind, token in rag_system.chat_stream(prompt, model=model):
                            if kind == "thinking":
                                if not thinking_open:
                                    yield "event: thinking_start\ndata: {}\n\n"
                                    thinking_open = True
                                payload = json.dumps({"event": "thinking_delta", "delta": token}, ensure_ascii=False)
                                yield f"event: thinking_delta\ndata: {payload}\n\n"
                            else:
                                if thinking_open:
                                    yield "event: thinking_end\ndata: {}\n\n"
                                    thinking_open = False
                                full_response += token
                                payload = json.dumps({"event": "text_delta", "delta": token}, ensure_ascii=False)
                                yield f"event: text_delta\ndata: {payload}\n\n"
                    finally:
                        if thinking_open:
                            yield "event: thinking_end\ndata: {}\n\n"

            yield f"event: done\ndata: {json.dumps({'event': 'done', 'done': True}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Multi streaming chat error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            background_tasks.add_task(
                _save_ai_message,
                conversation_id,
                full_response,
                citations,
                chunks_found,
                coverage,
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
