from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Auth schemas
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
class DocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_size: Optional[int]
    pages: Optional[int]
    status: str
    created_at: datetime
    attempts: Optional[int] = 0
    last_error: Optional[str] = None
    last_attempt_at: Optional[datetime] = None

    class Config:
        from_attributes = True
