import base64
import hashlib
import hmac
import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

import config as cfg
from database_simple import Document, DocumentChunk, User, get_db
from rag_system import MindmapGenerator, QuizGenerator, StudyGuideGenerator, SummaryGenerator
from routers.auth import get_current_user
from schemas import DocumentResponse, Message
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
    
    # Guest quota: limit number of documents for demo/guest users
    try:
        if getattr(current_user, "plan", None) == "demo":
            max_docs = int(getattr(cfg, "GUEST_MAX_DOCUMENTS", 1) or 1)
            doc_count = (
                db.query(func.count(Document.id))
                .filter(Document.user_id == current_user.id)
                .scalar() or 0
            )
            if doc_count >= max_docs:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"Guest limit reached: max {max_docs} document(s). Elimina un documento para subir otro."
                )
    except HTTPException:
        raise
    except Exception:
        # Do not block if quota check fails unexpectedly; fail-open for demo robustness
        pass
    
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

@router.delete("/{document_id}", response_model=Message)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Delete a document"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete file from storage
    if document.storage_url and os.path.exists(document.storage_url):
        os.remove(document.storage_url)
    
    # Delete from database
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}


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


class StudyGuideRequest(BaseModel):
    pages: Optional[dict] = None  # {"start": int, "end": int}
    query: Optional[str] = None
    format: Optional[str] = "json"  # json | markdown


@router.post("/{document_id}/study-guide")
async def generate_study_guide(
    document_id: str,
    request: StudyGuideRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Generate a study guide for a document or a page range.

    - Accepts optional page range {start, end} to focus the guide.
    - Returns a structured JSON guide (default) or Markdown.
    """

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

    if document.status != "indexed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document must be indexed before generating a study guide. Current status: {document.status}"
        )

    # Normalize page range
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

    generator = StudyGuideGenerator()
    result = generator.generate_study_guide(
        db=db,
        document_id=document_id,
        document_title=document.title,
        start_page=start_page,
        end_page=end_page,
        user_query=request.query,
        output_format=request.format or "json",
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=f"Failed to generate study guide: {result.get('error', 'unknown error')}")

    return result


class MindmapRequest(BaseModel):
    pages: Optional[dict] = None  # {"start": int, "end": int}
    query: Optional[str] = None
    focus_mode: Optional[str] = None  # definitions | processes | actors | timeline
    detail_level: Optional[int] = 2   # 1..3


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


@router.get("/{document_id}/file")
async def get_document_file(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Serve the actual document file for PDF viewing"""
    
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
    
    # Check if file exists
    if not document.storage_url or not os.path.exists(document.storage_url):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found on server"
        )
    
    # Infer media type by file extension to enable inline viewing in browsers
    _, ext = os.path.splitext(document.storage_url)
    ext = ext.lower()
    media_type = "application/octet-stream"
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext == ".txt":
        media_type = "text/plain"
    elif ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif ext == ".pptx":
        media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

    # Prefer inline display where possible (e.g., PDF viewers)
    headers = {"Content-Disposition": f"inline; filename=\"{os.path.basename(document.filename)}\""}

    return FileResponse(
        path=document.storage_url,
        filename=os.path.basename(document.filename),
        media_type=media_type,
        headers=headers,
    )


def _sign_payload(secret: str, data: str) -> str:
    mac = hmac.new(secret.encode("utf-8"), msg=data.encode("utf-8"), digestmod=hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode("utf-8").rstrip("=")


@router.post("/{document_id}/file/signed-url")
async def create_signed_file_url(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Issue a short-lived signed URL to fetch the file without cookies (for iframe embedding)."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Expire in 2 minutes
    exp = int(time.time()) + 120
    payload = f"doc:{document_id}|usr:{current_user.id}|exp:{exp}"
    sig = _sign_payload(cfg.SIGNING_SECRET, payload)
    token = base64.urlsafe_b64encode(f"{payload}|sig:{sig}".encode("utf-8")).decode("utf-8").rstrip("=")
    return {"url": f"/documents/{document_id}/file/signed?token={token}", "expires_at": exp}


@router.get("/{document_id}/file/signed")
async def get_document_file_signed(
    document_id: str,
    token: str,
    db: Session = Depends(get_db)
):
    """Serve document file validating a signed token; no cookies required."""
    try:
        pad = "=" * ((4 - (len(token) % 4)) % 4)
        raw = base64.urlsafe_b64decode(token + pad).decode("utf-8")
        parts = dict(p.split(":", 1) for p in raw.split("|") if ":" in p)
        if parts.get("doc") != document_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        exp = int(parts.get("exp", "0"))
        if exp < int(time.time()):
            raise HTTPException(status_code=401, detail="Token expired")
        sig = parts.get("sig")
        base_payload = "|".join([f"doc:{parts.get('doc')}", f"usr:{parts.get('usr')}", f"exp:{parts.get('exp')}"])
        expected = _sign_payload(cfg.SIGNING_SECRET, base_payload)
        if not hmac.compare_digest(sig or "", expected):
            raise HTTPException(status_code=401, detail="Invalid signature")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token format")

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.storage_url or not os.path.exists(document.storage_url):
        raise HTTPException(status_code=404, detail="Document file not found on server")

    _, ext = os.path.splitext(document.storage_url)
    ext = ext.lower()
    media_type = "application/octet-stream"
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext == ".txt":
        media_type = "text/plain"
    elif ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif ext == ".pptx":
        media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

    headers = {"Content-Disposition": f"inline; filename=\"{os.path.basename(document.filename)}\""}
    return FileResponse(
        path=document.storage_url,
        filename=os.path.basename(document.filename),
        media_type=media_type,
        headers=headers,
    )
