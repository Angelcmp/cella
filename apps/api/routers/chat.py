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
    model: str = "deepseek-v4-flash"
    stream: bool = False

class CitationResponse(BaseModel):
    page: int
    snippet: str
    similarity: Optional[float] = None

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
) -> Conversation:
    conversation = db.query(Conversation).filter(
        Conversation.user_id == user_id,
        Conversation.document_id == document_id
    ).first()
    if not conversation:
        conversation = Conversation(user_id=user_id, document_id=document_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    return conversation


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

    If chat_request.stream is True, returns a Server-Sent Events stream with the
    AI response. Otherwise returns a JSON ChatResponse.
    """
    try:
        # Verify document exists and belongs to user
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

        # Find or create conversation and save user message
        conversation = _get_or_create_conversation(db, current_user.id, document_id)
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
            f"Processing chat request for document {document_id}, "
            f"stream={chat_request.stream}, model={chat_request.model}"
        )

        if chat_request.stream:
            return _stream_chat_response(
                db,
                conversation.id,
                document_id,
                document.title,
                sanitized_message,
                chat_request.model,
                background_tasks,
            )

        # Non-streaming path
        rag_result = rag_system.chat_with_document(
            db=db,
            document_id=document_id,
            document_title=document.title,
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
                similarity=citation.get("similarity")
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

    citations = ctx.get("relevant_chunks", [])
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
