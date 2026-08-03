from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
import uuid

from database_simple import get_db, User
from auth_simple import (
    create_access_token,
    get_current_user,
    get_password_hash,
)
import config as cfg
from schemas import Token, UserResponse
from security.csrf import set_csrf_cookie

router = APIRouter()

_DEMO_ADMIN_SET = set(cfg.DEMO_WHITELIST_EMAILS)

def _is_demo_admin(email: str) -> bool:
    if not email:
        return False
    return email.strip().lower() in _DEMO_ADMIN_SET

def _attach_demo_flag(user: User) -> User:
    if user is None:
        return user
    setattr(user, "is_demo_admin", _is_demo_admin(getattr(user, "email", "")))
    return user

@router.post("/guest", response_model=Token)
async def guest_login(response: Response, db: Session = Depends(get_db)):
    """Issue a temporary guest session (demo only).
    - Requires DEMO_PUBLIC=true.
    - Creates a throwaway user and returns cookies.
    """
    if not cfg.DEMO_PUBLIC:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guest mode disabled")
    if not cfg.DEMO_GUEST_ENABLED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guest sessions are disabled")

    # Create a random guest user
    import secrets
    guest_id = str(uuid.uuid4())
    email = f"guest-{guest_id[:8]}@demo.local"
    # Random password; not used, but kept for completeness
    pwd = secrets.token_urlsafe(16)
    hashed_password = get_password_hash(pwd)

    # Persist user
    new_user = User(email=email, hashed_password=hashed_password, plan="demo")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue access token cookie
    access_token = create_access_token(new_user.id)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=cfg.COOKIE_SECURE,
        samesite=cfg.COOKIE_SAMESITE,
        max_age=24*3600,
        path="/",
    )
    # CSRF token cookie for mutating routes
    try:
        set_csrf_cookie(response, subject=str(new_user.id))
    except Exception:
        pass
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return _attach_demo_flag(current_user)
