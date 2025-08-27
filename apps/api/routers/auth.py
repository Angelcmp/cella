from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
import uuid
from database_simple import get_db, User, Document, Message as DBMessage, Conversation, UserPreferences
from auth_simple import (
    authenticate_user, 
    create_access_token, 
    get_password_hash, 
    get_current_user,
    verify_password
)
from schemas import (
    UserCreate, UserLogin, Token, UserResponse, Message, 
    UserProfileUpdate, PasswordChange, UserStats,
    UserPreferencesUpdate, UserPreferencesResponse
)

router = APIRouter()

# Directory for profile pictures
PROFILE_PICS_DIR = "profile_pics"
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token"""
    user = authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(user.id)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.post("/logout", response_model=Message)
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserProfileUpdate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile information"""
    # Check if email is being changed and if it's already in use
    if profile_data.email and profile_data.email != current_user.email:
        existing_user = db.query(User).filter(
            User.email == profile_data.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        current_user.email = profile_data.email
    
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    
    # Update last activity
    current_user.last_activity = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.put("/change-password", response_model=Message)
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.last_activity = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.get("/profile/stats", response_model=dict)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user usage statistics with enhanced data"""
    from collections import Counter
    from datetime import datetime, timedelta
    
    # Count total documents
    total_documents = db.query(func.count(Document.id)).filter(
        Document.user_id == current_user.id
    ).scalar() or 0
    
    # Count total conversations
    total_chats = db.query(func.count(Conversation.id)).filter(
        Conversation.user_id == current_user.id
    ).scalar() or 0
    
    # Count total uploads (same as documents for now)
    total_uploads = total_documents
    
    # Calculate storage used (sum of all document file sizes)
    storage_used = db.query(func.sum(Document.file_size)).filter(
        Document.user_id == current_user.id,
        Document.file_size.isnot(None)
    ).scalar() or 0
    
    # Get documents by status
    docs_by_status = db.query(Document.status, func.count(Document.id)).filter(
        Document.user_id == current_user.id
    ).group_by(Document.status).all()
    
    status_data = [{"name": status.title(), "value": count} for status, count in docs_by_status]
    
    # Get recent activity (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_docs = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.created_at >= week_ago
    ).all()
    
    # Activity by day
    activity_data = []
    for i in range(7):
        date = datetime.utcnow() - timedelta(days=i)
        day_docs = [d for d in recent_docs if d.created_at.date() == date.date()]
        activity_data.append({
            "date": date.strftime("%d/%m"),
            "documents": len(day_docs),
            "day": date.strftime("%a")
        })
    
    activity_data.reverse()  # Most recent last
    
    # Document types (based on file extension)
    doc_types = Counter()
    for doc in db.query(Document.filename).filter(Document.user_id == current_user.id).all():
        ext = doc.filename.split('.')[-1].upper() if '.' in doc.filename else 'OTHER'
        doc_types[ext] += 1
    
    type_data = [{"name": ext, "value": count} for ext, count in doc_types.items()]
    
    # Storage breakdown
    storage_breakdown = []
    total_size = storage_used or 1  # Avoid division by zero
    for ext, count in doc_types.items():
        # Estimate size per type (simplified)
        avg_size = total_size / total_documents if total_documents > 0 else 0
        type_size = avg_size * count
        storage_breakdown.append({
            "name": ext,
            "size": int(type_size),
            "percentage": round((type_size / total_size) * 100, 1) if total_size > 0 else 0
        })
    
    return {
        "totals": {
            "total_documents": total_documents,
            "total_chats": total_chats,
            "total_uploads": total_uploads,
            "storage_used": storage_used,
            "last_activity": current_user.last_activity
        },
        "charts": {
            "status_distribution": status_data,
            "activity_timeline": activity_data,
            "document_types": type_data,
            "storage_breakdown": storage_breakdown
        }
    }

@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user preferences"""
    preferences = db.query(UserPreferences).filter(
        UserPreferences.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create default preferences if they don't exist
        preferences = UserPreferences(user_id=current_user.id)
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return preferences

@router.put("/preferences", response_model=UserPreferencesResponse)
async def update_user_preferences(
    preferences_data: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user preferences"""
    preferences = db.query(UserPreferences).filter(
        UserPreferences.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create new preferences if they don't exist
        preferences = UserPreferences(user_id=current_user.id)
        db.add(preferences)
    
    # Update preferences with provided values
    update_data = preferences_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preferences, field, value)
    
    preferences.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(preferences)
    
    return preferences

@router.post("/upload-profile-picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile picture"""
    # Validate file type (only images)
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG and WebP images are allowed"
        )
    
    # Validate file size (max 5MB)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size exceeds 5MB limit"
        )
    
    # Delete old profile picture if exists
    if current_user.profile_picture:
        old_path = os.path.join(PROFILE_PICS_DIR, current_user.profile_picture)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # Save new profile picture
    file_extension = os.path.splitext(file.filename)[1]
    new_filename = f"{current_user.id}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(PROFILE_PICS_DIR, new_filename)
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Update user profile picture path
    current_user.profile_picture = new_filename
    current_user.last_activity = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.get("/profile-picture/{filename}")
async def get_profile_picture(filename: str):
    """Serve profile pictures"""
    file_path = os.path.join(PROFILE_PICS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile picture not found"
        )
    
    from fastapi.responses import FileResponse
    return FileResponse(file_path)