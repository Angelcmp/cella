import logging
import os
import shutil
import subprocess
import tempfile
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import config as cfg
from database_simple import (
    Document,
    DocumentChunk,
    DocumentFaq,
    DocumentStudyGuide,
    Note,
    User,
    get_db,
)
from rag_system import FAQGenerator, MindmapGenerator, QuizGenerator, StudyGuideGenerator, SummaryGenerator
from routers.auth import get_current_user
from schemas import DocumentResponse
from security.csrf import verify_csrf as csrf_protect

def _valid_signature(content: bytes, mime: str) -> bool:
    if mime == "application/pdf":
        return content.startswith(b"%PDF-")
    if mime in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
    ):
        # .docx/.pptx are ZIP files
        return content.startswith(b"PK\x03\x04")
    if mime == "text/plain":
        try:
            content[:4096].decode("utf-8")
            return True
        except Exception:
            return False
    # Default: reject unknown types
    return False

logger = logging.getLogger(__name__)


def _av_scan_ok(content: bytes) -> bool:
    clamav_path = os.getenv("CLAMAV_PATH", "clamscan")
    if not clamav_path:
        raise RuntimeError("CLAMAV_PATH is not configured.")
    if shutil.which(clamav_path) is None:
        raise RuntimeError(f"Antivirus executable '{clamav_path}' not found in PATH.")

    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        tmp_file.write(content)
        tmp_path = tmp_file.name
    try:
        result = subprocess.run(
            [clamav_path, "--no-summary", tmp_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            text=True,
        )
        if result.returncode == 0:
            return True
        if result.returncode == 1:
            logger.warning("ClamAV detected malware: %s", result.stdout.strip())
            return False
        raise RuntimeError(f"ClamAV scan error (code {result.returncode}): {result.stderr.strip() or result.stdout.strip()}")
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            logger.warning("Failed to remove temporary scan file %s", tmp_path)

router = APIRouter()

# Simple file storage (will replace with S3/R2 later)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Upload a document and set status to pending"""
    
    # Validate file type (allowing text for development testing)
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "text/plain"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOCX, PPTX, and TXT files are allowed"
        )
    
    # Validate file size (max 30MB)
    file_content = await file.read()
    if len(file_content) > 30 * 1024 * 1024:  # 30MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 30MB limit"
        )
    # Validate signature/magic bytes
    if not _valid_signature(file_content, file.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File signature does not match declared type"
        )
    # Optional AV scan
    if cfg.ENABLE_FILE_AV_SCAN:
        try:
            if not _av_scan_ok(file_content):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File failed antivirus scan"
                )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Antivirus scan could not be completed: {exc}"
            ) from exc

    # Save file locally (temporary solution)
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1]
    local_filename = f"{file_id}{file_extension}"
    local_path = os.path.join(UPLOAD_DIR, local_filename)
    
    with open(local_path, "wb") as f:
        f.write(file_content)
    
    # Create document record in database
    new_document = Document(
        user_id=current_user.id,
        title=file.filename,
        filename=local_filename,
        storage_url=local_path,
        file_size=len(file_content),
        status="pending"  # Will be processed by worker
    )
    
    db.add(new_document)
    db.commit()
    db.refresh(new_document)
    
    # TODO: Send to worker queue for processing
    print(f"📄 Document uploaded: {file.filename} ({len(file_content)} bytes)")
    print(f"🔄 Status: pending - will be processed by worker")
    
    return new_document

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's documents"""
    documents = db.query(Document).filter(Document.user_id == current_user.id).all()
    return documents

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific document"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return document


@router.post("/{document_id}/reprocess", response_model=DocumentResponse)
async def reprocess_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Reset a failed document back to pending so the worker re-processes it."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document.status == "indexed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is already indexed"
        )

    document.status = "pending"
    document.attempts = 0
    document.last_error = None
    document.last_attempt_at = None
    db.commit()
    db.refresh(document)
    return document


@router.post("/{document_id}/summary")
async def generate_document_summary(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Generate or retrieve summary for a document"""
    
    # Verify document ownership
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if document is processed
    if document.status != "indexed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document must be indexed before generating summary. Current status: {document.status}"
        )
    
    # Initialize summary generator
    summary_generator = SummaryGenerator()
    
    # Generate summary
    result = summary_generator.generate_document_summary(db, document_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {result.get('error', 'Unknown error')}"
        )
    
    return result


@router.get("/{document_id}/summary")
async def get_document_summary(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get existing summary for a document"""
    
    # Verify document ownership
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Initialize summary generator
    summary_generator = SummaryGenerator()
    
    # Get existing summary
    summary = summary_generator.get_document_summary(db, document_id)
    
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found for this document"
        )
    
    return summary


@router.get("/{document_id}/content")
async def get_document_content(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document content organized by pages for document viewer"""
    
    # Verify document ownership
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if document is processed
    if document.status != "indexed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document must be indexed before viewing content. Current status: {document.status}"
        )
    
    # Get all chunks for the document
    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document_id
    ).order_by(DocumentChunk.chunk_index).all()
    
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No content found for this document"
        )
    
    # Organize chunks by pages
    pages = {}
    for chunk in chunks:
        for page_num in range(chunk.page_start, chunk.page_end + 1):
            if page_num not in pages:
                pages[page_num] = {
                    "page_number": page_num,
                    "chunks": [],
                    "full_text": ""
                }
            
            pages[page_num]["chunks"].append({
                "chunk_id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
                "tokens": chunk.tokens,
                "page_start": chunk.page_start,
                "page_end": chunk.page_end
            })
    
    # Build full text for each page with better formatting preservation
    for page_num in pages:
        page_chunks = sorted(pages[page_num]["chunks"], key=lambda x: x["chunk_index"])
        
        # Join chunks more intelligently to preserve paragraph structure
        chunk_texts = []
        for chunk in page_chunks:
            chunk_text = chunk["text"].strip()
            if chunk_text:
                chunk_texts.append(chunk_text)
        
        # Join with double newlines to preserve paragraph separation
        # But avoid excessive spacing by checking if chunks already end with newlines
        full_text = ""
        for i, chunk_text in enumerate(chunk_texts):
            if i == 0:
                full_text = chunk_text
            else:
                # Smart joining - check if previous chunk ends with punctuation or newline
                prev_chunk = chunk_texts[i-1]
                if prev_chunk.endswith(('.', '!', '?', '\n')):
                    # Add appropriate spacing
                    if chunk_text.startswith(('\n', ' ')) or prev_chunk.endswith('\n'):
                        full_text += "\n\n" + chunk_text
                    else:
                        full_text += "\n\n" + chunk_text
                else:
                    # Continue same paragraph
                    full_text += " " + chunk_text
        
        pages[page_num]["full_text"] = full_text
    
    # Convert to sorted list
    pages_list = [pages[page_num] for page_num in sorted(pages.keys())]
    
    return {
        "document_id": document_id,
        "document_title": document.title,
        "total_pages": len(pages_list),
        "pages": pages_list
    }


class MindmapRequest(BaseModel):
    pages: Optional[dict] = None  # {"start": int, "end": int}
    query: Optional[str] = None
    focus_mode: Optional[str] = None  # definitions | processes | actors | timeline
    detail_level: Optional[int] = 2   # 1..3


@router.get("/{document_id}/mindmap")
async def get_mindmap(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the persisted default mindmap for a document, if available."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    generator = MindmapGenerator()
    result = generator.get_document_mindmap(db, document_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mindmap not generated yet")
    return result


@router.post("/{document_id}/mindmap")
async def generate_mindmap(
    document_id: str,
    request: MindmapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Generate a mindmap (Mermaid in Markdown) for a document or page range."""
    # Verify document ownership
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document.status != "indexed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Document must be indexed before generating mindmap. Current status: {document.status}")

    start_page: Optional[int] = None
    end_page: Optional[int] = None
    if request.pages and isinstance(request.pages, dict):
        try:
            start_page = int(request.pages.get("start")) if request.pages.get("start") is not None else None
            end_page = int(request.pages.get("end")) if request.pages.get("end") is not None else None
            if start_page is not None and end_page is not None and start_page > end_page:
                start_page, end_page = end_page, start_page
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid pages object. Use {start:int, end:int}")

    generator = MindmapGenerator()
    result = generator.generate_mindmap(
        db=db,
        document_id=document_id,
        document_title=document.title,
        start_page=start_page,
        end_page=end_page,
        user_query=request.query,
        focus_mode=(request.focus_mode or None),
        detail_level=int(request.detail_level or 2),
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=f"Failed to generate mindmap: {result.get('error', 'unknown error')}")

    return result


class QuizRequest(BaseModel):
    pages: Optional[dict] = None  # {"start": int, "end": int}
    query: Optional[str] = None
    num_questions: Optional[int] = 10


@router.post("/{document_id}/quiz")
async def generate_quiz(
    document_id: str,
    request: QuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Generate a multiple-choice quiz (Markdown) for a document or page range."""
    # Verify document ownership
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document.status != "indexed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Document must be indexed before generating quiz. Current status: {document.status}")

    start_page: Optional[int] = None
    end_page: Optional[int] = None
    if request.pages and isinstance(request.pages, dict):
        try:
            start_page = int(request.pages.get("start")) if request.pages.get("start") is not None else None
            end_page = int(request.pages.get("end")) if request.pages.get("end") is not None else None
            if start_page is not None and end_page is not None and start_page > end_page:
                start_page, end_page = end_page, start_page
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid pages object. Use {start:int, end:int}")

    generator = QuizGenerator()
    result = generator.generate_quiz(
        db=db,
        document_id=document_id,
        document_title=document.title,
        start_page=start_page,
        end_page=end_page,
        user_query=request.query,
        num_questions=int(request.num_questions or 10),
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {result.get('error', 'unknown error')}")

    return result


def _get_owned_document(db: Session, document_id: str, user_id: str) -> Document:
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user_id
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


class StudyGuideRequest(BaseModel):
    pages: Optional[dict] = None  # {"start": int, "end": int}
    query: Optional[str] = None
    output_format: Optional[str] = "json"  # json | markdown


@router.get("/{document_id}/study-guide")
async def get_study_guide(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a persisted study guide for a document, if available."""
    _get_owned_document(db, document_id, current_user.id)
    guide = db.query(DocumentStudyGuide).filter(
        DocumentStudyGuide.document_id == document_id
    ).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Study guide not generated yet")
    return {
        "study_guide_id": guide.id,
        "document_id": guide.document_id,
        "guide": guide.content,
        "markdown": guide.markdown,
        "pages_used": guide.pages_used,
        "created_at": guide.created_at.isoformat() if guide.created_at else None,
        "updated_at": guide.updated_at.isoformat() if guide.updated_at else None,
        "success": True,
    }


@router.post("/{document_id}/study-guide")
async def generate_study_guide(
    document_id: str,
    request: StudyGuideRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Generate (and persist) a study guide for a document or page range."""
    document = _get_owned_document(db, document_id, current_user.id)
    if document.status != "indexed":
        raise HTTPException(status_code=400, detail=f"Document must be indexed before generating a study guide. Current status: {document.status}")

    start_page, end_page = _parse_page_range(request.pages)

    generator = StudyGuideGenerator()
    result = generator.generate_study_guide(
        db=db,
        document_id=document_id,
        document_title=document.title,
        start_page=start_page,
        end_page=end_page,
        user_query=request.query,
        output_format=request.output_format or "json",
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=f"Failed to generate study guide: {result.get('error', 'unknown error')}")

    # Persist (upsert) the guide
    existing = db.query(DocumentStudyGuide).filter(
        DocumentStudyGuide.document_id == document_id
    ).first()
    if existing:
        existing.content = result.get("guide")
        existing.markdown = result.get("markdown")
        existing.pages_used = result.get("pages_used")
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        result["study_guide_id"] = existing.id
    else:
        record = DocumentStudyGuide(
            document_id=document_id,
            content=result.get("guide"),
            markdown=result.get("markdown"),
            pages_used=result.get("pages_used"),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        result["study_guide_id"] = record.id

    return result


class FaqRequest(BaseModel):
    pages: Optional[dict] = None  # {"start": int, "end": int}
    query: Optional[str] = None
    num_faqs: Optional[int] = 8


@router.get("/{document_id}/faq")
async def get_faqs(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get persisted FAQs for a document, if available."""
    _get_owned_document(db, document_id, current_user.id)
    faq = db.query(DocumentFaq).filter(
        DocumentFaq.document_id == document_id
    ).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not generated yet")
    return {
        "faq_id": faq.id,
        "document_id": faq.document_id,
        "faqs": faq.faqs,
        "markdown": faq.markdown,
        "pages_used": faq.pages_used,
        "created_at": faq.created_at.isoformat() if faq.created_at else None,
        "updated_at": faq.updated_at.isoformat() if faq.updated_at else None,
        "success": True,
    }


@router.post("/{document_id}/faq")
async def generate_faqs(
    document_id: str,
    request: FaqRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Generate (and persist) FAQs for a document or page range."""
    document = _get_owned_document(db, document_id, current_user.id)
    if document.status != "indexed":
        raise HTTPException(status_code=400, detail=f"Document must be indexed before generating FAQs. Current status: {document.status}")

    start_page, end_page = _parse_page_range(request.pages)

    generator = FAQGenerator()
    result = generator.generate_faqs(
        db=db,
        document_id=document_id,
        document_title=document.title,
        start_page=start_page,
        end_page=end_page,
        user_query=request.query,
        num_faqs=int(request.num_faqs or 8),
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=f"Failed to generate FAQs: {result.get('error', 'unknown error')}")

    existing = db.query(DocumentFaq).filter(
        DocumentFaq.document_id == document_id
    ).first()
    if existing:
        existing.faqs = result.get("faqs")
        existing.markdown = result.get("markdown")
        existing.pages_used = result.get("pages_used")
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        result["faq_id"] = existing.id
    else:
        record = DocumentFaq(
            document_id=document_id,
            faqs=result.get("faqs"),
            markdown=result.get("markdown"),
            pages_used=result.get("pages_used"),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        result["faq_id"] = record.id

    return result


class NoteRequest(BaseModel):
    content: str


@router.post("/{document_id}/notes")
async def create_note(
    document_id: str,
    request: NoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Create a note for a document."""
    _get_owned_document(db, document_id, current_user.id)
    content = (request.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Note content cannot be empty")

    note = Note(
        user_id=current_user.id,
        document_id=document_id,
        content=content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return {
        "id": note.id,
        "document_id": note.document_id,
        "content": note.content,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
    }


@router.get("/{document_id}/notes")
async def list_notes(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notes for a document."""
    _get_owned_document(db, document_id, current_user.id)
    notes = db.query(Note).filter(
        Note.document_id == document_id,
        Note.user_id == current_user.id,
    ).order_by(Note.created_at.desc()).all()
    return [
        {
            "id": n.id,
            "document_id": n.document_id,
            "content": n.content,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "updated_at": n.updated_at.isoformat() if n.updated_at else None,
        }
        for n in notes
    ]


@router.put("/{document_id}/notes/{note_id}")
async def update_note(
    document_id: str,
    note_id: str,
    request: NoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Update a note for a document."""
    _get_owned_document(db, document_id, current_user.id)
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.document_id == document_id,
        Note.user_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    content = (request.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Note content cannot be empty")

    note.content = content
    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return {
        "id": note.id,
        "document_id": note.document_id,
        "content": note.content,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
    }


@router.delete("/{document_id}/notes/{note_id}")
async def delete_note(
    document_id: str,
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Delete a note for a document."""
    _get_owned_document(db, document_id, current_user.id)
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.document_id == document_id,
        Note.user_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"success": True, "deleted_id": note_id}


def _parse_page_range(pages: Optional[dict]):
    """Parse the optional {start, end} pages dict. Returns (start_page, end_page)."""
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    if pages and isinstance(pages, dict):
        try:
            start_page = int(pages.get("start")) if pages.get("start") is not None else None
            end_page = int(pages.get("end")) if pages.get("end") is not None else None
            if start_page is not None and end_page is not None and start_page > end_page:
                start_page, end_page = end_page, start_page
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid pages object. Use {start:int, end:int}")
    return start_page, end_page
