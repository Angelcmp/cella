from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import uvicorn
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from typing import Callable, Awaitable

try:
    # Local import without package context
    import config as cfg
except Exception:
    from apps.api import config as cfg  # type: ignore

# Load environment variables
load_dotenv()

# Import routers
from routers import auth, documents, chat, providers

# Database
from database_simple import engine, Base, create_tables

security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Cella API...")
    create_tables()
    print("📊 Database tables created/verified")
    yield
    # Shutdown
    print("⭐ Shutting down Cella API...")

app = FastAPI(
    title="Cella API",
    description="API para análisis inteligente de documentos",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
# Build CORS allowed origins from defaults + env
_cors_origins = {"http://localhost:3000", "http://127.0.0.1:3000"}
_extra = os.getenv("CSRF_ALLOWED_ORIGINS", "")
if _extra:
    _cors_origins.update({o.strip() for o in _extra.split(",") if o.strip()})
_public_url = os.getenv("NEXT_PUBLIC_PUBLIC_URL")
if _public_url:
    try:
        from urllib.parse import urlparse
        pu = urlparse(_public_url)
        if pu.scheme and pu.netloc:
            _cors_origins.add(f"{pu.scheme}://{pu.netloc}")
    except Exception:
        pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(_cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Security headers & CSP middleware
@app.middleware("http")
async def security_headers(request: Request, call_next: Callable[[Request], Awaitable]):
    response = await call_next(request)
    # Core security headers
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    # Allow embedding only for signed file endpoints to enable PDF viewer in app
    path = request.url.path
    if path.startswith("/documents/") and (path.endswith("/file") or path.endswith("/file/signed")):
        # Skip setting X-Frame-Options so CSP (if any) can control framing
        pass
    else:
        response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    # HSTS only when secure context is expected (prod)
    if cfg.ENVIRONMENT == "production" or cfg.COOKIE_SECURE:
        # 6 months, includeSubDomains
        response.headers.setdefault("Strict-Transport-Security", "max-age=15552000; includeSubDomains")
    # CSP (strict in prod if enabled)
    if cfg.ENABLE_CSP_STRICT:
        # Build allowed frame ancestors for document file endpoints
        if path.startswith("/documents/") and (path.endswith("/file") or path.endswith("/file/signed")):
            allowed = {"http://localhost:3000", "http://127.0.0.1:3000"}
            extra = os.getenv("CSRF_ALLOWED_ORIGINS", "")
            if extra:
                allowed.update({o.strip() for o in extra.split(",") if o.strip()})
            pu = os.getenv("NEXT_PUBLIC_PUBLIC_URL")
            if pu:
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(pu)
                    if parsed.scheme and parsed.netloc:
                        allowed.add(f"{parsed.scheme}://{parsed.netloc}")
                except Exception:
                    pass
            fa = " ".join(sorted(allowed))
            csp = f"default-src 'none'; frame-ancestors {fa}; base-uri 'none'; img-src 'self' data:; connect-src 'self'"
            response.headers["Content-Security-Policy"] = csp
        else:
            # Restrictive policy for other endpoints
            csp = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; img-src 'self' data:; connect-src 'self'"
            response.headers.setdefault("Content-Security-Policy", csp)
    return response

# Redis-backed sliding-window rate limiting (falls back to in-memory)
from rate_limit import RateLimiter

_rate_limiter = RateLimiter()

LIMITS = {
    "/documents/upload": cfg.RATE_LIMIT_UPLOAD_PER_MIN,
    "/auth/local": cfg.RATE_LIMIT_LOGIN_PER_MIN,
}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next: Callable[[Request], Awaitable]):
    if not cfg.RATE_LIMIT_ENABLED:
        return await call_next(request)
    path = request.url.path
    # Normalize to match prefixes (e.g., /chat/documents/{id})
    if path.startswith("/chat"):
        limit = cfg.RATE_LIMIT_CHAT_PER_MIN
        key_path = "/chat"
    else:
        limit = LIMITS.get(path)
        key_path = path
    if not limit:
        return await call_next(request)
    ip = request.client.host if request.client else "unknown"
    key = f"{ip}:{key_path}"
    allowed, count, retry_after = _rate_limiter.allow(key, int(limit))
    if not allowed:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            content={"detail": "Too Many Requests"},
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(max(int(limit) - count, 0))
    return response

@app.get("/")
async def root():
    return {"message": "Cella API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "cella-api"}

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(providers.router, prefix="", tags=["providers"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000)),
        reload=True
    )
