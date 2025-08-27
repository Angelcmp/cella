from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Auth schemas
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    plan: str
    credits_remaining: int
    created_at: datetime
    full_name: Optional[str] = None
    username: Optional[str] = None
    profile_picture: Optional[str] = None
    last_activity: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Document schemas
class DocumentUpload(BaseModel):
    title: str
    filename: str

class DocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_size: Optional[int]
    pages: Optional[int]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Chat schemas
class ChatQuestion(BaseModel):
    question: str
    conversation_id: Optional[str] = None

class Citation(BaseModel):
    page: int
    text: str
    similarity: float

class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    conversation_id: str

# General response schemas
class Message(BaseModel):
    message: str

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None

# Profile schemas
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserStats(BaseModel):
    total_documents: int
    total_chats: int
    total_uploads: int
    storage_used: int
    last_activity: Optional[datetime] = None

# Preferences schemas
class UserPreferencesUpdate(BaseModel):
    notify_document_processing: Optional[bool] = None
    notify_new_features: Optional[bool] = None
    notify_promotions: Optional[bool] = None
    show_document_citations: Optional[bool] = None
    save_conversation_history: Optional[bool] = None
    auto_generate_summaries: Optional[bool] = None
    auto_delete_after_days: Optional[int] = None

class UserPreferencesResponse(BaseModel):
    notify_document_processing: bool
    notify_new_features: bool
    notify_promotions: bool
    show_document_citations: bool
    save_conversation_history: bool
    auto_generate_summaries: bool
    auto_delete_after_days: int
    
    class Config:
        from_attributes = True