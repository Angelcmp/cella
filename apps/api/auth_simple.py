import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database_simple import get_db, User

# Simple authentication without external dependencies
security = HTTPBearer()

# In-memory token store (replace with Redis in production)
active_tokens = {}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Simple password verification using hashlib"""
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def get_password_hash(password: str) -> str:
    """Simple password hashing using hashlib"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(user_id: str) -> str:
    """Create simple access token"""
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=24)
    active_tokens[token] = {"user_id": user_id, "expires": expires}
    return token

def verify_token(token: str) -> Optional[str]:
    """Verify token and return user ID"""
    if token not in active_tokens:
        return None
    
    token_data = active_tokens[token]
    if datetime.utcnow() > token_data["expires"]:
        del active_tokens[token]
        return None
    
    return token_data["user_id"]

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    user_id = verify_token(credentials.credentials)
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user