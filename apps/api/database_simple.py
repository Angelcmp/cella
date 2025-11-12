from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, JSON, Float, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import uuid
from datetime import datetime
import os
from typing import Generator

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
    dim = Column(Integer, default=1536)

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    document_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, nullable=False)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    citations = Column(JSON)
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

class UsageEvent(Base):
    __tablename__ = "usage_events"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    type = Column(String, nullable=False)  # upload, index, query, summary
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    cost_estimate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, unique=True)
    
    # Notifications preferences
    notify_document_processing = Column(Boolean, default=True)
    notify_new_features = Column(Boolean, default=True)
    notify_promotions = Column(Boolean, default=False)
    
    # Chat preferences
    show_document_citations = Column(Boolean, default=True)
    save_conversation_history = Column(Boolean, default=True)
    
    # Document preferences
    auto_generate_summaries = Column(Boolean, default=True)
    auto_delete_after_days = Column(Integer, default=0)  # 0 = never delete
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class ExportHistory(Base):
    __tablename__ = "export_history"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    conversation_id = Column(String, nullable=False)
    document_id = Column(String, nullable=False)
    export_type = Column(String, nullable=False)  # pdf, docx, txt
    filename = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    status = Column(String, default="completed")  # generating, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"
    
    jti = Column(String, primary_key=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_revoked_tokens_expires_at", "expires_at"),
    )

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)
