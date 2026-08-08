#!/usr/bin/env python3
"""
Real worker for document processing
Handles text extraction, chunking, and embeddings
"""

import time
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import from API
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'api'))

# Add worker directory to path for document_processor
sys.path.append(os.path.dirname(__file__))

# Change working directory to API directory to use the same database
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'api'))

from document_processor import DocumentProcessor
from rag_system import SummaryGenerator, MindmapGenerator

def get_file_type_from_path(file_path: str) -> str:
    """Determine file type from file path"""
    extension = Path(file_path).suffix.lower()
    
    extension_map = {
        '.pdf': 'pdf',
        '.docx': 'docx', 
        '.pptx': 'pptx',
        '.txt': 'txt'
    }
    
    return extension_map.get(extension, 'unknown')

def store_chunks_in_database(document_id: str, processing_result: dict):
    """Store processed chunks and embeddings in database"""
    try:
        from database_simple import SessionLocal, DocumentChunk, DocumentEmbedding
        
        if processing_result["processing_status"] != "success":
            raise ValueError(f"Processing failed: {processing_result.get('error', 'Unknown error')}")
        
        db = SessionLocal()
        try:
            # Clear existing chunks for this document
            db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
            db.query(DocumentEmbedding).filter(DocumentEmbedding.chunk_id.in_(
                db.query(DocumentChunk.id).filter(DocumentChunk.document_id == document_id)
            )).delete()
            
            # Store new chunks and embeddings
            for chunk_data in processing_result["chunks"]:
                # Create chunk record
                chunk = DocumentChunk(
                    document_id=document_id,
                    chunk_index=chunk_data["chunk_id"],
                    text=chunk_data["text"],
                    tokens=chunk_data["tokens"],
                    page_start=chunk_data["page_start"],
                    page_end=chunk_data["page_end"],
                    doc_metadata={
                        "start_word": chunk_data["start_word"],
                        "end_word": chunk_data["end_word"]
                    }
                )
                db.add(chunk)
                db.flush()  # Get the chunk ID
                
                # Create embedding record
                if "embedding" in chunk_data:
                    import json
                    embedding = DocumentEmbedding(
                        chunk_id=chunk.id,
                        embedding=json.dumps(chunk_data["embedding"]),
                        dim=len(chunk_data["embedding"])
                    )
                    db.add(embedding)
            
            db.commit()
            print(f"✅ Stored {len(processing_result['chunks'])} chunks in database")
            return True
            
        except Exception as e:
            db.rollback()
            print(f"❌ Database storage failed: {e}")
            raise
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Failed to store chunks: {e}")
        return False

def generate_document_summary(document_id: str):
    """Generate automatic summary after document processing"""
    try:
        from database_simple import SessionLocal
        
        print(f"📝 Generating automatic summary for document {document_id}")
        
        # Initialize summary generator
        summary_generator = SummaryGenerator()
        
        db = SessionLocal()
        try:
            # Generate summary
            result = summary_generator.generate_document_summary(db, document_id, "comprehensive")
            
            if result["success"]:
                if result.get("was_existing", False):
                    print(f"📋 Summary already existed for document {document_id}")
                else:
                    print(f"✅ Summary generated successfully for document {document_id}")
                    print(f"   🔤 Tokens used: {result.get('tokens_used', 'N/A')}")
                return True
            else:
                print(f"⚠️ Summary generation failed: {result.get('error', 'Unknown error')}")
                # Don't fail the entire process if summary fails
                return True
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"⚠️ Summary generation error: {e}")
        # Don't fail the entire process if summary fails
        return True


def generate_document_mindmap(document_id: str):
    """Generate automatic mindmap after document processing"""
    try:
        from database_simple import SessionLocal, Document
        
        print(f"🧠 Generating automatic mindmap for document {document_id}")
        
        mindmap_generator = MindmapGenerator()
        
        db = SessionLocal()
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                print(f"⚠️ Document {document_id} not found for mindmap generation")
                return True
            
            result = mindmap_generator.generate_mindmap(
                db=db,
                document_id=document_id,
                document_title=document.title,
            )
            
            if result["success"]:
                print(f"✅ Mindmap generated successfully for document {document_id}")
                return True
            else:
                print(f"⚠️ Mindmap generation failed: {result.get('error', 'Unknown error')}")
                # Don't fail the entire process if mindmap fails
                return True
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"⚠️ Mindmap generation error: {e}")
        # Don't fail the entire process if mindmap fails
        return True


def process_document(document_id: str, file_path: str):
    """
    Real document processing: extract text, create chunks, generate embeddings, and create summary
    """
    print(f"🔄 Processing document {document_id}")
    print(f"📄 File: {file_path}")
    
    try:
        # Initialize processor
        processor = DocumentProcessor()
        
        # Determine file type
        file_type = get_file_type_from_path(file_path)
        if file_type == 'unknown':
            raise ValueError(f"Unsupported file type: {Path(file_path).suffix}")
        
        print(f"📋 File type detected: {file_type}")
        
        # Process document
        result = processor.process_document_full(file_path, file_type, document_id)
        
        if result["processing_status"] == "success":
            # Store in database
            print("💾 Storing chunks in database...")
            if store_chunks_in_database(document_id, result):
                print(f"✅ Document {document_id} processed successfully")
                print(f"   📄 Pages: {result['total_pages']}")
                print(f"   🔤 Tokens: {result['total_tokens']}")
                print(f"   📦 Chunks: {result['total_chunks']}")
                
                # Generate automatic summary and mindmap
                generate_document_summary(document_id)
                generate_document_mindmap(document_id)
                
                return True
            else:
                raise ValueError("Failed to store chunks in database")
        else:
            raise ValueError(f"Processing failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Document processing failed: {e}")
        return False


def backoff_for(attempts: int, base_backoff: int = 5) -> int:
    """Exponential backoff seconds for a given attempt count (1-based)."""
    return base_backoff * (2 ** (max(attempts, 1) - 1))


def due_for_retry(attempts: int, last_attempt_at, max_attempts: int, base_backoff: int = 5, now=None) -> bool:
    """True when a failed doc's backoff window has elapsed."""
    if attempts >= max_attempts:
        return False
    if last_attempt_at is None:
        return True
    now = now or datetime.utcnow()
    elapsed = (now - last_attempt_at).total_seconds()
    return elapsed >= backoff_for(attempts, base_backoff)

def simulate_worker():
    """
    Poll for pending documents and process them with retries and backoff.

    Failed documents are retried up to MAX_ATTEMPTS with exponential backoff
    derived from `attempts`. When the attempt budget is exhausted the document
    stays in `failed` with `last_error` populated for manual reprocessing.
    """
    from database_simple import SessionLocal, Document, create_tables

    max_attempts = int(os.getenv("WORKER_MAX_ATTEMPTS", "3"))
    base_backoff = int(os.getenv("WORKER_BACKOFF_BASE_SECONDS", "5"))
    poll_interval = int(os.getenv("WORKER_POLL_SECONDS", "10"))

    print("🚀 Cella Worker started")
    print(f"📋 Max attempts: {max_attempts}, backoff base: {base_backoff}s, poll: {poll_interval}s")

    def due(doc) -> bool:
        return due_for_retry(
            attempts=doc.attempts or 0,
            last_attempt_at=doc.last_attempt_at,
            max_attempts=max_attempts,
            base_backoff=base_backoff,
        )

    # Ensure tables exist before polling
    create_tables()

    try:
        while True:
            db = SessionLocal()
            try:
                # First, requeue failed docs whose backoff window has elapsed.
                retried = 0
                for doc in db.query(Document).filter(Document.status == "failed").all():
                    if due(doc):
                        doc.status = "pending"
                        db.commit()
                        retried += 1
                if retried:
                    print(f"🔁 Requeued {retried} failed document(s) after backoff")

                # Then pick up pending documents
                pending_docs = db.query(Document).filter(
                    Document.status == "pending"
                ).limit(5).all()

                if pending_docs:
                    print(f"📄 Found {len(pending_docs)} pending documents")

                    for doc in pending_docs:
                        # Update status to processing
                        doc.status = "processing"
                        db.commit()

                        # Process document
                        try:
                            process_document(doc.id, doc.storage_url)

                            # Update status to indexed
                            doc.status = "indexed"
                            db.commit()

                        except Exception as e:
                            print(f"❌ Error processing document {doc.id}: {e}")
                            doc.attempts = (doc.attempts or 0) + 1
                            doc.last_error = str(e)[:500]
                            doc.last_attempt_at = datetime.utcnow()

                            if doc.attempts >= max_attempts:
                                doc.status = "failed"
                                print(
                                    f"   ⛔ Document {doc.id} failed after {doc.attempts} attempts: {e}"
                                )
                            else:
                                # Backoff applies before the next retry
                                doc.status = "failed"
                                print(
                                    f"   🔁 Retry {doc.attempts}/{max_attempts} for {doc.id} "
                                    f"in {backoff_for(doc.attempts, base_backoff)}s"
                                )
                            db.commit()
                else:
                    print("💤 No pending documents, waiting...")

            finally:
                db.close()

            # Wait before checking again
            time.sleep(poll_interval)

    except KeyboardInterrupt:
        print("\n⭐ Worker shutting down...")
    except Exception as e:
        print(f"❌ Worker error: {e}")

if __name__ == "__main__":
    simulate_worker()