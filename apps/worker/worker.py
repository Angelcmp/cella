#!/usr/bin/env python3
"""
Real worker for document processing
Handles text extraction, chunking, and embeddings
"""

import time
import os
import sys
import uuid
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
import config as cfg  # OCR_LOG_ENABLED, TESSERACT_LANGS

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

def store_ocr_log(document_id: str, processing_result: dict):
    """Persist OCR stats (one row per document) when OCR ran.

    Best-effort: never raises. The worker keeps running even if logging
    fails — OCR stats are observability, not source of truth.
    """
    try:
        from database_simple import SessionLocal, OcrScanLog

        if not cfg.OCR_LOG_ENABLED:
            return False

        ocr_stats = processing_result.get("ocr_stats") or {}
        if not ocr_stats.get("pages_ocr") and not ocr_stats.get("pages_failed"):
            return False

        filename = processing_result.get("filename") or processing_result.get("extraction_metadata", {}).get("filename")
        request_id = processing_result.get("request_id")
        langs = processing_result.get("ocr_langs") or cfg.TESSERACT_LANGS

        db = SessionLocal()
        try:
            log = OcrScanLog(
                document_id=document_id,
                filename=filename,
                langs=langs,
                pages_total=processing_result.get("total_pages", 0) or 0,
                pages_ocr=int(ocr_stats.get("pages_ocr", 0)),
                pages_failed=int(ocr_stats.get("pages_failed", 0)),
                chars_extracted=int(ocr_stats.get("chars_ocr", 0)),
                duration_ms=int(processing_result.get("ocr_duration_ms", 0) or 0),
                request_id=request_id,
            )
            db.add(log)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"⚠️ Failed to persist OCR log for {document_id}: {e}")
            return False
        finally:
            db.close()
    except Exception as e:
        print(f"⚠️ OCR logging skipped (import/lookup failed): {e}")
        return False


def report_ocr_metrics(processing_result: dict):
    """Push OCR counters to the API process so /metrics reflects them.

    The worker is a separate process from the API, so prometheus_client
    counters are not shared. We post to /internal/ocr-metrics (best-effort).
    """
    try:
        ocr_stats = processing_result.get("ocr_stats") or {}
        pages_ocr = int(ocr_stats.get("pages_ocr", 0))
        chars_ocr = int(ocr_stats.get("chars_ocr", 0))
        pages_failed = int(ocr_stats.get("pages_failed", 0))
        if pages_ocr == 0 and pages_failed == 0 and chars_ocr == 0:
            return

        import json
        import httpx

        host = os.getenv("API_HOST", "127.0.0.1")
        port = int(os.getenv("API_PORT", "8000"))
        payload = {
            "pages_ocr": pages_ocr,
            "chars_ocr": chars_ocr,
            "pages_failed": pages_failed,
        }
        try:
            httpx.post(
                f"http://{host}:{port}/internal/ocr-metrics",
                json=payload,
                timeout=2.0,
            )
        except Exception:
            # API may be down or running in a different host; metrics are
            # observability, not critical.
            pass
    except Exception:
        pass


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

                # OCR telemetry: persist log row + push counters to /metrics.
                # Both are best-effort; failures must not fail the job.
                if result.get("ocr_stats"):
                    ocr_stats = result["ocr_stats"]
                    if ocr_stats.get("pages_ocr") or ocr_stats.get("pages_failed"):
                        print(
                            f"   🔍 OCR: langs={result.get('ocr_langs')} "
                            f"pages_ocr={ocr_stats['pages_ocr']} "
                            f"pages_failed={ocr_stats['pages_failed']} "
                            f"chars={ocr_stats['chars_ocr']}"
                        )
                store_ocr_log(document_id, result)
                report_ocr_metrics(result)

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


def _claim_pending_doc(db, doc, *, worker_id: str) -> bool:
    """Atomically transition `doc` from 'pending' to 'processing'.

    Returns True if this caller now owns the row; False if another worker (or
    a previous loop iteration) already moved it out of 'pending'. The caller
    MUST check the return value and only mutate `doc` on success — otherwise
    a stale snapshot would demote the row to 'processing'.
    """
    from sqlalchemy import text as _sa_text

    claim_now = datetime.utcnow()
    claimed = db.execute(
        _sa_text(
            "UPDATE documents SET status=:status, worker_id=:wid, "
            "claimed_at=:cat WHERE id=:id AND status='pending'"
        ),
        {
            "status": "processing",
            "wid": worker_id,
            "cat": claim_now,
            "id": doc.id,
        },
    ).rowcount
    if not claimed:
        return False
    doc.status = "processing"
    doc.worker_id = worker_id
    doc.claimed_at = claim_now
    return True

def simulate_worker():
    """
    Poll for pending documents and process them with retries, backoff,
    claim/lease idempotency, explicit DLQ flag and periodic session cleanup.

    - Claims: atomically sets status=processing + worker_id + claimed_at and
      verifies rowcount, preventing two workers or a crash mid-job from
      duplicating work.

    - Self-heal: any doc stuck in `processing` whose `claimed_at` is older
      than WORKER_CLAIM_TIMEOUT_SECONDS is reclaimed (reset to pending).

    - DLQ: when attempt budget is exhausted, `dlq=True` on the doc.

    - Session TTL: periodically purges expired RevokedToken rows (SQLite + Redis).
    """
    from database_simple import SessionLocal, Document, create_tables
    from sqlalchemy import text

    max_attempts = int(os.getenv("WORKER_MAX_ATTEMPTS", "3"))
    base_backoff = int(os.getenv("WORKER_BACKOFF_BASE_SECONDS", "5"))
    poll_interval = int(os.getenv("WORKER_POLL_SECONDS", "10"))
    claim_timeout = int(os.getenv("WORKER_CLAIM_TIMEOUT_SECONDS", "600"))
    session_cleanup = int(os.getenv("SESSION_CLEANUP_MINUTES", "60"))

    worker_id = str(uuid.uuid4())[:12]
    last_cleanup = time.time()

    print("🚀 Cella Worker started")
    print(f"📋 worker_id={worker_id}, max_attempts={max_attempts}, "
          f"backoff={base_backoff}s, poll={poll_interval}s, "
          f"claim_timeout={claim_timeout}s, cleanup_every={session_cleanup}m")

    def due(doc) -> bool:
        return due_for_retry(
            attempts=doc.attempts or 0,
            last_attempt_at=doc.last_attempt_at,
            max_attempts=max_attempts,
            base_backoff=base_backoff,
        )

    def session_cleanup_due(now_ts: float) -> bool:
        return (now_ts - last_cleanup) >= session_cleanup * 60

    create_tables()

    try:
        while True:
            db = SessionLocal()
            now_ts = time.time()
            try:
                # ── Reclaim stale processing docs (crash recovery) ──
                cutoff = datetime.utcfromtimestamp(now_ts - claim_timeout)
                stale = (
                    db.query(Document)
                    .filter(
                        Document.status == "processing",
                        Document.claimed_at.isnot(None),
                        Document.claimed_at < cutoff,
                    )
                    .all()
                )
                for doc in stale:
                    doc.status = "pending"
                    doc.worker_id = None
                    doc.claimed_at = None
                if stale:
                    db.commit()
                    print(f"🔁 Reclaimed {len(stale)} stale processing doc(s)")

                # ── Requeue failed docs whose backoff elapsed (not DLQ) ──
                retried = 0
                for doc in db.query(Document).filter(
                    Document.status == "failed", Document.dlq.isnot(True)
                ).all():
                    if due(doc):
                        doc.status = "pending"
                        db.commit()
                        retried += 1
                if retried:
                    print(f"🔁 Requeued {retried} failed document(s) after backoff")

                # ── Claim & process ──
                pending_docs = db.query(Document).filter(
                    Document.status == "pending"
                ).limit(5).all()

                if pending_docs:
                    print(f"📄 Found {len(pending_docs)} pending documents")

                    for doc in pending_docs:
                        # Atomically claim. If another worker/loop already
                        # grabbed the row we skip without touching the ORM
                        # object (which would otherwise demote a non-pending
                        # doc to 'processing').
                        if not _claim_pending_doc(db, doc, worker_id=worker_id):
                            continue
                        db.commit()

                        try:
                            process_document(doc.id, doc.storage_url)

                            doc.status = "indexed"
                            doc.worker_id = None
                            doc.claimed_at = None
                            doc.dlq = False
                            db.commit()

                        except Exception as e:
                            print(f"❌ Error processing document {doc.id}: {e}")
                            doc.attempts = (doc.attempts or 0) + 1
                            doc.last_error = str(e)[:500]
                            doc.last_attempt_at = datetime.utcnow()
                            doc.worker_id = None
                            doc.claimed_at = None

                            if doc.attempts >= max_attempts:
                                doc.status = "failed"
                                doc.dlq = True
                                print(
                                    f"   ⛔ Document {doc.id} DLQ after {doc.attempts} attempts: {e}"
                                )
                            else:
                                doc.status = "failed"
                                print(
                                    f"   🔁 Retry {doc.attempts}/{max_attempts} for {doc.id} "
                                    f"in {backoff_for(doc.attempts, base_backoff)}s"
                                )
                            db.commit()
                else:
                    print("💤 No pending documents, waiting...")

                # ── Periodic session TTL cleanup ──
                if session_cleanup_due(now_ts):
                    try:
                        from auth_simple import purge_expired_revoked_tokens
                        purge_expired_revoked_tokens()
                    except Exception as exc:
                        print(f"⚠️  Session cleanup error: {exc}")
                    last_cleanup = now_ts

            finally:
                db.close()

            time.sleep(poll_interval)

    except KeyboardInterrupt:
        print("\n⭐ Worker shutting down...")
    except Exception as e:
        print(f"❌ Worker error: {e}")

if __name__ == "__main__":
    simulate_worker()