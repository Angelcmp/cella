from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import config as cfg
from database_simple import get_db, User
from auth_simple import get_current_user
from demo import run_full_reset
from security.csrf import verify_csrf as csrf_protect

router = APIRouter()


def _is_admin_email(email: str) -> bool:
    return email.lower() in set(cfg.DEMO_WHITELIST_EMAILS)


@router.post("/demo/reset")
async def demo_reset(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Administrative endpoint to reset demo data immediately.
    Only available in demo mode and for whitelisted emails.
    """
    if not cfg.DEMO_PUBLIC:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo mode is not enabled")
    if not _is_admin_email(current_user.email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    deleted = run_full_reset()
    return {"success": True, "deleted_users": deleted}
