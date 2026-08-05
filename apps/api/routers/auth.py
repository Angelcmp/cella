from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database_simple import get_db, User
from auth_simple import get_current_user, get_or_create_local_user
from schemas import UserResponse

router = APIRouter()


@router.get("/local", response_model=UserResponse)
async def local_user(db: Session = Depends(get_db)):
    """Return the single local system user (LOCAL_MODE)."""
    return get_or_create_local_user(db)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user
