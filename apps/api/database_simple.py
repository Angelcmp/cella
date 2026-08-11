from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, JSON, Float, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import uuid
from datetime import datetime
import os
from typing import Generator

from dotenv import load_dotenv
load_dotenv()

# For now, use SQLite for development (will change to PostgreSQL later)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./docai.db")

# SQLAlchemy setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Simplified Database Models (without pgvector for now)
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    plan = Column(String, default="free")
    credits_remaining = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)
    full_name = Column(String, nullable=True)
    username = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)
    last_activity = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    storage_url = Column(String)
    file_size = Column(Integer)
    pages = Column(Integer)
    status = Column(String, default="pending")  # pending, processing, indexed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    doc_metadata = Column(JSON)
    # Worker reliability: retry bookkeeping
    attempts = Column(Integer, default=0)
    last_error = Column(Text)
    last_attempt_at = Column(DateTime)
    # Worker: lease de reclamación (idempotencia) y flag de DLQ explícita
    worker_id = Column(String, nullable=True)
    claimed_at = Column(DateTime, nullable=True)
    dlq = Column(Boolean, default=False)

class DocumentChunk(Base):
    __tablename__ = "doc_chunks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    tokens = Column(Integer)
    page_start = Column(Integer)
    page_end = Column(Integer)
    doc_metadata = Column(JSON)

class DocumentEmbedding(Base):
    __tablename__ = "doc_embeddings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    chunk_id = Column(String, nullable=False)
    embedding = Column(Text)  # JSON string for now, will be Vector later
    dim = Column(Integer, default=384)

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    document_id = Column(String, nullable=False)
    # Optional list of document ids for multi-document chats
    document_ids = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, nullable=False)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    citations = Column(JSON)
    chunks_found = Column(Integer, default=0)
    coverage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class DocumentSummary(Base):
    __tablename__ = "doc_summaries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, nullable=False, unique=True)
    executive_summary = Column(Text, nullable=False)
    key_points = Column(JSON)  # List of key points
    main_topics = Column(JSON)  # List of main topics
    summary_length = Column(String)  # short, medium, long
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class DocumentMindmap(Base):
    __tablename__ = "doc_mindmaps"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, nullable=False, unique=True)
    markdown = Column(Text, nullable=False)
    mindmap_metadata = Column(JSON)
    pages_used = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class DocumentStudyGuide(Base):
    __tablename__ = "doc_study_guides"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, nullable=False, unique=True)
    content = Column(JSON)  # structured guide (objectives, key_concepts, sections, ...)
    markdown = Column(Text)
    pages_used = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class DocumentFaq(Base):
    __tablename__ = "doc_faqs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, nullable=False, unique=True)
    faqs = Column(JSON)  # list of {question, answer, pages}
    markdown = Column(Text)
    pages_used = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    document_id = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"
    
    jti = Column(String, primary_key=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_revoked_tokens_expires_at", "expires_at"),
    )


class AVScanLog(Base):
    """Auditoría de cada escaneo antivirus (aceptación: log por escaneo)."""

    __tablename__ = "av_scan_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, nullable=True)
    filename = Column(String, nullable=True)
    provider = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    result = Column(String, nullable=False)  # clean | infected | error
    error = Column(Text, nullable=True)
    duration_ms = Column(Integer, default=0)
    request_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class UsageEvent(Base):
    """Contador de uso por usuario (limites por plan, ventana 24h)."""

    __tablename__ = "usage_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    action = Column(String, nullable=False)  # documents | chats_per_day | summaries_per_day
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_usage_events_user_action", "user_id", "action"),
    )


class ProviderConfig(Base):
    __tablename__ = "provider_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True)
    # provider type: openai | anthropic | openai_compat (generic OpenAI-compatible endpoint)
    provider_type = Column(String, nullable=False)
    # JSON string (encrypted with Fernet) with api_key, base_url, models, default_model, is_default
    config = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)
    _migrate()


def _migrate():
    """Lightweight schema migrations for SQLite (additive only)."""
    try:
        from sqlalchemy import inspect, text

        insp = inspect(engine)
        conv_columns = {c["name"] for c in insp.get_columns("conversations")}
        if "document_ids" not in conv_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE conversations ADD COLUMN document_ids JSON"))

        doc_columns = {c["name"] for c in insp.get_columns("documents")}
        for col, ddl in (
            ("attempts", "ALTER TABLE documents ADD COLUMN attempts INTEGER DEFAULT 0"),
            ("last_error", "ALTER TABLE documents ADD COLUMN last_error TEXT"),
            ("last_attempt_at", "ALTER TABLE documents ADD COLUMN last_attempt_at DATETIME"),
            ("worker_id", "ALTER TABLE documents ADD COLUMN worker_id VARCHAR"),
            ("claimed_at", "ALTER TABLE documents ADD COLUMN claimed_at DATETIME"),
            ("dlq", "ALTER TABLE documents ADD COLUMN dlq BOOLEAN DEFAULT 0"),
        ):
            if col not in doc_columns:
                with engine.begin() as conn:
                    conn.execute(text(ddl))

        # Usage events: add 'action' column for plan-limit tracking
        if "usage_events" in insp.get_table_names():
            usage_cols = {c["name"] for c in insp.get_columns("usage_events")}
            if "action" not in usage_cols:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE usage_events ADD COLUMN action VARCHAR"))
    except Exception as e:
        print(f"   Migration notice (non-fatal): {e}")
