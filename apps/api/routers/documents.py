from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from database_simple import get_db, User, Document, DocumentChunk
from auth_simple import get_current_user
from schemas import DocumentResponse, Message
from rag_system import SummaryGenerator
import uuid
import os

router = APIRouter()

# Simple file storage (will replace with S3/R2 later)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    
    # Return the file
    return FileResponse(
        path=document.storage_url,
        filename=document.filename,
        media_type="application/octet-stream"
    )

