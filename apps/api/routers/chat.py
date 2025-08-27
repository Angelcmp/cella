from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging

from database_simple import get_db, User, Document, Conversation, Message
from routers.auth import get_current_user
from rag_system import RAGSystem

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

# Pydantic models
class ChatRequest(BaseModel):
    message: str

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

class ConversationResponse(BaseModel):
    conversation_id: str
    document_id: str
    document_title: str
    created_at: str

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    citations: Optional[List[Dict[str, Any]]] = []
    created_at: str

# Initialize RAG system
rag_system = RAGSystem()

@router.post("/documents/{document_id}", response_model=ChatResponse)
async def chat_with_document(
    document_id: str,
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chat with a specific document"""
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
        
        # Find or create conversation
        conversation = db.query(Conversation).filter(
            Conversation.user_id == current_user.id,
            Conversation.document_id == document_id
        ).first()
        
        if not conversation:
            conversation = Conversation(
                user_id=current_user.id,
                document_id=document_id
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
        
        # Save user message
        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=chat_request.message
        )
        db.add(user_message)
        db.commit()
        
        # Generate AI response using RAG
        logger.info(f"Processing chat request for document {document_id}")
        rag_result = rag_system.chat_with_document(
            db=db,
            document_id=document_id,
            document_title=document.title,
            user_query=chat_request.message
        )
        
        # Save AI response
        ai_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=rag_result["response"],
            citations=rag_result["citations"]
        )
        db.add(ai_message)
        db.commit()
        
        # Convert citations to response format
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
            error=rag_result.get("error")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_user_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all conversations for the current user"""
    try:
        conversations = db.query(Conversation, Document).join(
            Document, Conversation.document_id == Document.id
        ).filter(
            Conversation.user_id == current_user.id
        ).order_by(Conversation.created_at.desc()).all()
        
        return [
            ConversationResponse(
                conversation_id=conv.id,
                document_id=conv.document_id,
                document_title=doc.title,
                created_at=conv.created_at.isoformat()
            )
            for conv, doc in conversations
        ]
        
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch conversations"
        )

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all messages in a conversation"""
    try:
        # Verify conversation belongs to user
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )
        
        # Get messages
        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at).all()
        
        return [
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                citations=msg.citations or [],
                created_at=msg.created_at.isoformat()
            )
            for msg in messages
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch messages"
        )

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation and all its messages"""
    try:
        # Verify conversation belongs to user
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )
        
        # Delete messages first
        db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).delete()
        
        # Delete conversation
        db.delete(conversation)
        db.commit()
        
        return {"message": "Conversation deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete conversation"
        )