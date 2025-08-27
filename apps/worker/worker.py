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
from rag_system import SummaryGenerator

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
                
                # Generate automatic summary
                generate_document_summary(document_id)
                
                return True
            else:
                raise ValueError("Failed to store chunks in database")
        else:
            raise ValueError(f"Processing failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Document processing failed: {e}")
        return False

def simulate_worker():
    """
    Simulate a worker checking for pending documents
    In real implementation, this would be Celery with Redis
    """
    print("🚀 DocAI Worker started")
    print("📋 Checking for pending documents...")
    
    try:
        from database_simple import SessionLocal, Document
        
        while True:
            db = SessionLocal()
            try:
                # Find pending documents
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
                            doc.status = "failed"
                            db.commit()
                else:
                    print("💤 No pending documents, waiting...")
                
            finally:
                db.close()
            
            # Wait before checking again
            time.sleep(10)
            
    except KeyboardInterrupt:
        print("\n⭐ Worker shutting down...")
    except Exception as e:
        print(f"❌ Worker error: {e}")

if __name__ == "__main__":
    simulate_worker()