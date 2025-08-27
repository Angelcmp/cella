from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime
import os
from typing import Generator

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://docai:password@localhost:5432/docai")

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

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    plan = Column(String, default="free")
    credits_remaining = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    storage_url = Column(String)
    file_size = Column(Integer)
    pages = Column(Integer)
    status = Column(String, default="pending")  # pending, processing, indexed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    metadata = Column(JSON)

class DocumentChunk(Base):
    __tablename__ = "doc_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    tokens = Column(Integer)
    page_start = Column(Integer)
    page_end = Column(Integer)
    metadata = Column(JSON)

class DocumentEmbedding(Base):
    __tablename__ = "doc_embeddings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id = Column(UUID(as_uuid=True), nullable=False)
    embedding = Column(Vector(1536))  # OpenAI ada-002 dimension
    dim = Column(Integer, default=1536)

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    document_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), nullable=False)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    citations = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class UsageEvent(Base):
    __tablename__ = "usage_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    type = Column(String, nullable=False)  # upload, index, query, summary
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    cost_estimate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)