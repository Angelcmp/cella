import os

def _env_bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return str(val).strip().lower() in {"1", "true", "yes", "on"}


# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
DEMO_PUBLIC = _env_bool("DEMO_PUBLIC", False)
DEMO_REGISTRATION_ENABLED = _env_bool("DEMO_REGISTRATION_ENABLED", True)
DEMO_AUTO_CLEAN_HOURS = int(os.getenv("DEMO_AUTO_CLEAN_HOURS", "0"))
DEMO_WHITELIST_EMAILS = [e.strip().lower() for e in os.getenv("DEMO_WHITELIST_EMAILS", "").split(",") if e.strip()]

# Security & CSP
ENABLE_CSP_STRICT = _env_bool("ENABLE_CSP_STRICT", False)
# Signing secret requirements
_raw_signing_secret = os.getenv("SIGNING_SECRET") or os.getenv("SECRET_KEY")
if not _raw_signing_secret:
    if ENVIRONMENT == "development" and not DEMO_PUBLIC:
        _raw_signing_secret = "dev-only-signing-secret-change-me-please-32-bytes"
    else:
        raise RuntimeError(
            "SIGNING_SECRET environment variable must be set to a random 256-bit string in demo/production."
        )
if len(_raw_signing_secret) < 32:
    raise RuntimeError("SIGNING_SECRET must be at least 32 characters long for security.")
SIGNING_SECRET = _raw_signing_secret

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# CSRF secret shares same strength requirements
_raw_csrf_secret = os.getenv("CSRF_SECRET_KEY")
if not _raw_csrf_secret:
    if ENVIRONMENT == "development" and not DEMO_PUBLIC:
        _raw_csrf_secret = SIGNING_SECRET
    else:
        raise RuntimeError(
            "CSRF_SECRET_KEY environment variable must be set for demo/production deployments."
        )
if len(_raw_csrf_secret) < 32:
    raise RuntimeError("CSRF_SECRET_KEY must be at least 32 characters long.")
CSRF_SECRET_KEY = _raw_csrf_secret

# Rate limiting
RATE_LIMIT_ENABLED = _env_bool("RATE_LIMIT_ENABLED", True)
RATE_LIMIT_LOGIN_PER_MIN = int(os.getenv("RATE_LIMIT_LOGIN_PER_MIN", "5"))
RATE_LIMIT_UPLOAD_PER_MIN = int(os.getenv("RATE_LIMIT_UPLOAD_PER_MIN", "10"))
RATE_LIMIT_CHAT_PER_MIN = int(os.getenv("RATE_LIMIT_CHAT_PER_MIN", "30"))

# Files / AV
ENABLE_FILE_AV_SCAN = _env_bool("ENABLE_FILE_AV_SCAN", False)

# Cookies
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")  # Acordado: Lax
COOKIE_SECURE = _env_bool(
    "COOKIE_SECURE",
    True if ENVIRONMENT == "production" or DEMO_PUBLIC else False,
)

# Providers
PROVIDER_LLM = os.getenv("PROVIDER_LLM", "gemini")
PROVIDER_EMBEDDINGS = os.getenv("PROVIDER_EMBEDDINGS", "api")

# Guest quotas
GUEST_MAX_DOCUMENTS = int(os.getenv("GUEST_MAX_DOCUMENTS", "1"))
