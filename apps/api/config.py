import os
from dotenv import load_dotenv
load_dotenv()

def _env_bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return str(val).strip().lower() in {"1", "true", "yes", "on"}


# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Local single-user mode: no auth, no cookies, no demo. The app runs entirely on
# the user's machine and everything belongs to a single local system user.
LOCAL_MODE = _env_bool("LOCAL_MODE", True)
LOCAL_USER_EMAIL = os.getenv("LOCAL_USER_EMAIL", "local@cella.local")
LOCAL_USER_PLAN = os.getenv("LOCAL_USER_PLAN", "local")

# Security & CSP
ENABLE_CSP_STRICT = _env_bool("ENABLE_CSP_STRICT", False)
# CSRF is off by default in LOCAL_MODE (single user, same machine)
CSRF_ENABLED = _env_bool("CSRF_ENABLED", False)
# Signing secret requirements
_raw_signing_secret = os.getenv("SIGNING_SECRET") or os.getenv("SECRET_KEY")
if not _raw_signing_secret:
    if ENVIRONMENT == "development":
        _raw_signing_secret = "dev-only-signing-secret-change-me-please-32-bytes"
    else:
        raise RuntimeError(
            "SIGNING_SECRET environment variable must be set to a random 256-bit string."
        )
if len(_raw_signing_secret) < 32:
    raise RuntimeError("SIGNING_SECRET must be at least 32 characters long for security.")
SIGNING_SECRET = _raw_signing_secret

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# CSRF secret shares same strength requirements
_raw_csrf_secret = os.getenv("CSRF_SECRET_KEY")
if not _raw_csrf_secret:
    if ENVIRONMENT == "development":
        _raw_csrf_secret = SIGNING_SECRET
    else:
        raise RuntimeError(
            "CSRF_SECRET_KEY environment variable must be set for deployments."
        )
if len(_raw_csrf_secret) < 32:
    raise RuntimeError("CSRF_SECRET_KEY must be at least 32 characters long.")
CSRF_SECRET_KEY = _raw_csrf_secret

# Rate limiting
RATE_LIMIT_ENABLED = _env_bool("RATE_LIMIT_ENABLED", False)
RATE_LIMIT_LOGIN_PER_MIN = int(os.getenv("RATE_LIMIT_LOGIN_PER_MIN", "5"))
RATE_LIMIT_UPLOAD_PER_MIN = int(os.getenv("RATE_LIMIT_UPLOAD_PER_MIN", "10"))
RATE_LIMIT_CHAT_PER_MIN = int(os.getenv("RATE_LIMIT_CHAT_PER_MIN", "30"))
# When true, the rate-limit key also includes the authenticated user id (when a
# token is present), so users sharing an IP don't block each other.
RATE_LIMIT_PER_USER = _env_bool("RATE_LIMIT_PER_USER", True)

# Antivirus (opcional): ENABLE_FILE_AV_SCAN activa el escaneo; AV_PROVIDER elige
# la implementación ("clamav" local | "http" servicio gestionado | "none").
# Cada escaneo se registra siempre en la tabla `av_scan_logs` (auditoría).
ENABLE_FILE_AV_SCAN = _env_bool("ENABLE_FILE_AV_SCAN", False)
AV_PROVIDER = os.getenv("AV_PROVIDER", "clamav").lower()
AV_AUDIT_LOG = _env_bool("AV_AUDIT_LOG", True)
AV_RETENTION_DAYS = int(os.getenv("AV_RETENTION_DAYS", "90"))
# Servicio AV gestionado (provider "http")
AV_API_URL = os.getenv("AV_API_URL", "")
AV_API_KEY = os.getenv("AV_API_KEY", "")
AV_API_TIMEOUT_SECONDS = int(os.getenv("AV_API_TIMEOUT_SECONDS", "30"))

# Sessions: TTL de los tokens de sesión y limpieza de tokens revocados
SESSION_TTL_MINUTES = int(os.getenv("SESSION_TTL_MINUTES", os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")))
SESSION_CLEANUP_MINUTES = int(os.getenv("SESSION_CLEANUP_MINUTES", "60"))

# Observabilidad
ENABLE_METRICS = _env_bool("ENABLE_METRICS", False)
# Structured JSON logs + request-id correlation
ENABLE_JSON_LOGS = _env_bool("ENABLE_JSON_LOGS", False)

# Tracing distribuido (OpenTelemetry/OTLP) — opcional, lazy
ENABLE_TRACING = _env_bool("ENABLE_TRACING", False)
OTEL_SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "cella-api")
OTEL_EXPORTER_OTLP_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
OTEL_EXPORTER_OTLP_PROTOCOL = os.getenv("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc")

# Cookies (kept for compatibility; not used in LOCAL_MODE)
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")
COOKIE_SECURE = _env_bool("COOKIE_SECURE", True if ENVIRONMENT == "production" else False)

# Providers
PROVIDER_LLM = os.getenv("PROVIDER_LLM", "ollama")
PROVIDER_EMBEDDINGS = os.getenv("PROVIDER_EMBEDDINGS", "local")

# Límites por plan (vencos por ventana de 24h). El plan se lee de User.plan.
# ENFORCE_PLAN_LIMITS=false (default LOCAL_MODE) solo registra contadores en /usage.
import json as _json

_ENFORCE_PLAN_LIMITS = _env_bool("ENFORCE_PLAN_LIMITS", False)
PLAN_LIMITS = {
    "local": {"documents": 500, "chats_per_day": 1000, "summaries_per_day": 200},
    "free": {"documents": 5, "chats_per_day": 50, "summaries_per_day": 10},
    "pro": {"documents": 200, "chats_per_day": 1000, "summaries_per_day": 500},
}
try:
    _override = os.getenv("PLAN_LIMITS_JSON")
    if _override:
        parsed = _json.loads(_override)
        if isinstance(parsed, dict):
            PLAN_LIMITS.update(parsed)
except Exception:
    pass
ENFORCE_PLAN_LIMITS = _ENFORCE_PLAN_LIMITS
# Worker: lease de reclamación de jobs (idempotencia frente a crashes)
WORKER_CLAIM_TIMEOUT_SECONDS = int(os.getenv("WORKER_CLAIM_TIMEOUT_SECONDS", "600"))

# Ollama
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")

# Encryption secret for stored provider API keys (Fernet)
LOCAL_ENCRYPTION_KEY = os.getenv("LOCAL_ENCRYPTION_KEY", "")
