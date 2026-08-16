import json
import time

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

import config as cfg
from auth_simple import get_current_user
from database_simple import ProviderConfig, SessionLocal, User, get_db
from provider_registry import get_router, reload_router
from providers import ANTHROPIC_CATALOG, PROVIDER_CATALOG
from security.csrf import verify_csrf as csrf_protect
from security.encryption import decrypt_value, encrypt_value
from sqlalchemy.orm import Session

router = APIRouter()


VALID_PROVIDER_TYPES = {
    "openai",
    "anthropic",
    "ollama",
    "openai_compat",
    "qwen",
    "gemini",
    "moonshot",
    "minimax",
    "deepseek",
    "zhipu",
}


class ProviderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    provider_type: str = Field(...)
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    models: Optional[List[str]] = None
    default_model: Optional[str] = None
    is_default: bool = False
    use_for_embeddings: bool = False


class ProviderUpdate(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    models: Optional[List[str]] = None
    default_model: Optional[str] = None
    is_default: Optional[bool] = None
    use_for_embeddings: Optional[bool] = None


class ProviderTestRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    provider_type: str
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    models: Optional[List[str]] = None
    default_model: Optional[str] = None
    use_for_embeddings: bool = False


class ProviderTestResponse(BaseModel):
    ok: bool
    model: Optional[str] = None
    latency_ms: Optional[int] = None
    response: Optional[str] = None
    error: Optional[str] = None


class ProviderOut(BaseModel):
    id: str
    name: str
    provider_type: str
    label: str
    base_url: Optional[str] = None
    models: List[str] = []
    default_model: Optional[str] = None
    is_default: bool = False
    use_for_embeddings: bool = False
    has_api_key: bool = False
    last_test_at: Optional[str] = None
    last_test_ok: Optional[bool] = None
    last_test_latency_ms: Optional[int] = None
    last_test_error: Optional[str] = None


class ModelOut(BaseModel):
    id: str
    name: str
    provider: str


def _provider_label(provider_type: str) -> str:
    if provider_type == "anthropic":
        return ANTHROPIC_CATALOG.get("label", "Anthropic")
    if provider_type in PROVIDER_CATALOG:
        return PROVIDER_CATALOG[provider_type].get("label", provider_type)
    return {"openai_compat": "OpenAI-compatible", "ollama": "Ollama"}.get(provider_type, provider_type)


def _provider_capabilities(provider_type: str) -> dict:
    """Return boolean capability flags for UI badges."""
    has_embeddings = False
    if provider_type == "ollama":
        has_embeddings = False
    elif provider_type == "anthropic":
        has_embeddings = False
    elif provider_type in PROVIDER_CATALOG:
        has_embeddings = bool(PROVIDER_CATALOG[provider_type].get("has_embeddings"))
    return {
        "has_embeddings": has_embeddings,
        "supports_streaming": True,
        "supports_vision": provider_type in {"openai", "anthropic", "gemini", "openai_compat"},
        "supports_tools": provider_type in {"openai", "anthropic", "gemini", "qwen", "zhipu", "deepseek"},
    }


def _load_provider(id: str) -> ProviderConfig:
    with SessionLocal() as db:
        row = db.query(ProviderConfig).filter(ProviderConfig.id == id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Provider not found")
        return row


def _row_to_out(row: ProviderConfig, data: dict) -> ProviderOut:
    return ProviderOut(
        id=row.id,
        name=row.name,
        provider_type=row.provider_type,
        label=_provider_label(row.provider_type),
        base_url=data.get("base_url"),
        models=data.get("models") or [],
        default_model=data.get("default_model"),
        is_default=bool(data.get("is_default")),
        use_for_embeddings=bool(data.get("use_for_embeddings")),
        has_api_key=bool(data.get("api_key")),
        last_test_at=row.last_test_at.isoformat() if getattr(row, "last_test_at", None) else None,
        last_test_ok=getattr(row, "last_test_ok", None),
        last_test_latency_ms=getattr(row, "last_test_latency_ms", None),
        last_test_error=getattr(row, "last_test_error", None),
    )


def _build_provider_from_payload(payload) -> tuple:
    """Build an ad-hoc LLMProvider (or OllamaProvider / AnthropicProvider) from
    a payload without persisting it. Returns (provider, error_str)."""
    from providers import LLMProvider, OllamaProvider, AnthropicProvider

    ptype = payload.provider_type
    name = payload.name
    base_url = (payload.base_url or "").strip() or None
    api_key = (payload.api_key or "").strip() or None

    if ptype == "ollama":
        url = base_url or cfg.OLLAMA_BASE_URL
        prov = OllamaProvider(base_url=url)
        prov.config["default_chat_model"] = payload.default_model or ""
        if payload.models:
            prov.config["chat_models"] = list(payload.models)
        return prov, None

    if ptype == "anthropic":
        if not api_key:
            return None, "Anthropic requiere API key"
        prov = AnthropicProvider(api_key=api_key)
        prov.config["default_chat_model"] = payload.default_model or ANTHROPIC_CATALOG["default_chat_model"]
        if payload.models:
            prov.config["chat_models"] = list(payload.models)
        else:
            prov.config["chat_models"] = list(ANTHROPIC_CATALOG["chat_models"])
        return prov, None

    # OpenAI-compatible family (openai, deepseek, zhipu, qwen, moonshot, gemini, minimax, openai_compat)
    if not base_url:
        if ptype in PROVIDER_CATALOG:
            base_url = PROVIDER_CATALOG[ptype]["base_url"]
        elif ptype == "openai_compat":
            return None, "Proveedor OpenAI-compatible requiere base_url"
        else:
            return None, f"provider_type '{ptype}' sin base_url por defecto"

    if ptype != "ollama" and not api_key and ptype in PROVIDER_CATALOG and PROVIDER_CATALOG[ptype].get("env_key"):
        env_val = __import__("os").getenv(PROVIDER_CATALOG[ptype]["env_key"])
        if env_val:
            api_key = env_val

    prov = LLMProvider(api_key=api_key or "no-key", base_url=base_url, provider_name=name)
    prov.config["default_chat_model"] = payload.default_model or ""
    if payload.models:
        prov.config["chat_models"] = list(payload.models)
    elif ptype in PROVIDER_CATALOG:
        prov.config["chat_models"] = list(PROVIDER_CATALOG[ptype]["chat_models"])
    return prov, None


@router.get("/providers", response_model=List[ProviderOut])
async def list_providers(current_user: User = Depends(get_current_user)):
    out = []
    with SessionLocal() as db:
        rows = db.query(ProviderConfig).order_by(ProviderConfig.created_at).all()
        for row in rows:
            try:
                data = json.loads(decrypt_value(row.config) or "{}")
            except Exception:
                data = {}
            out.append(_row_to_out(row, data))
    return out


@router.get("/providers/catalog")
async def provider_catalog(current_user: User = Depends(get_current_user)):
    """Available provider types and their known models (for the UI)."""
    catalog = {}
    for key, p in PROVIDER_CATALOG.items():
        catalog[key] = {
            "label": p["label"],
            "base_url": p["base_url"],
            "models": p["chat_models"],
            "needs_key": True,
            "capabilities": {
                "has_embeddings": bool(p.get("has_embeddings")),
                "supports_streaming": True,
                "supports_vision": key in {"openai", "gemini"},
                "supports_tools": key in {"openai", "qwen", "zhipu", "deepseek"},
            },
        }
    catalog["anthropic"] = {
        "label": ANTHROPIC_CATALOG["label"],
        "base_url": ANTHROPIC_CATALOG["base_url"],
        "models": ANTHROPIC_CATALOG["chat_models"],
        "needs_key": True,
        "capabilities": {
            "has_embeddings": False,
            "supports_streaming": True,
            "supports_vision": True,
            "supports_tools": True,
        },
    }
    catalog["ollama"] = {
        "label": "Ollama (local)",
        "base_url": cfg.OLLAMA_BASE_URL,
        "models": [],
        "needs_key": False,
        "capabilities": {
            "has_embeddings": False,
            "supports_streaming": True,
            "supports_vision": False,
            "supports_tools": False,
        },
    }
    catalog["openai_compat"] = {
        "label": "OpenAI-compatible (LM Studio, vLLM, LocalAI...)",
        "base_url": "",
        "models": [],
        "needs_key": True,
        "capabilities": {
            "has_embeddings": False,
            "supports_streaming": True,
            "supports_vision": False,
            "supports_tools": False,
        },
    }
    return catalog


@router.post("/providers/test", response_model=ProviderTestResponse)
async def test_provider_unsaved(
    payload: ProviderTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Validate a provider config WITHOUT saving it. Used by the wizard's
    'Probar conexión' button before 'Guardar'."""
    if payload.provider_type not in VALID_PROVIDER_TYPES:
        raise HTTPException(status_code=400, detail=f"provider_type inválido: {payload.provider_type}")

    provider, err = _build_provider_from_payload(payload)
    if err:
        raise HTTPException(status_code=400, detail=err)

    model = provider.config.get("default_chat_model") or (provider.config.get("chat_models") or [""])[0]
    if not model:
        raise HTTPException(status_code=400, detail="Sin modelo para probar. Configura un modelo primero.")

    start = time.perf_counter()
    try:
        text, _ = provider.chat_completion(
            prompt="Responde solo con: OK",
            model=model,
            max_tokens=10,
        )
        latency_ms = int((time.perf_counter() - start) * 1000)
        return ProviderTestResponse(ok=True, model=model, latency_ms=latency_ms, response=(text or "")[:200])
    except Exception as exc:
        latency_ms = int((time.perf_counter() - start) * 1000)
        return ProviderTestResponse(ok=False, model=model, latency_ms=latency_ms, error=str(exc)[:400])


@router.post("/providers", response_model=ProviderOut, status_code=status.HTTP_201_CREATED)
async def create_provider(
    payload: ProviderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    if payload.provider_type not in VALID_PROVIDER_TYPES:
        raise HTTPException(status_code=400, detail=f"provider_type inválido: {payload.provider_type}")

    with SessionLocal() as db:
        existing = db.query(ProviderConfig).filter(ProviderConfig.name == payload.name).first()
        if existing:
            raise HTTPException(status_code=409, detail="A provider with that name already exists")

        if payload.is_default:
            _clear_defaults(db)

        data = {
            "base_url": payload.base_url,
            "api_key": payload.api_key or "",
            "models": payload.models or [],
            "default_model": payload.default_model,
            "is_default": payload.is_default,
            "use_for_embeddings": payload.use_for_embeddings,
        }
        row = ProviderConfig(
            name=payload.name,
            provider_type=payload.provider_type,
            config=encrypt_value(json.dumps(data)),
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    reload_router()
    return _row_to_out(row, data)


@router.put("/providers/{provider_id}", response_model=ProviderOut)
async def update_provider(
    provider_id: str,
    payload: ProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    row = _load_provider(provider_id)
    with SessionLocal() as db:
        data = json.loads(decrypt_value(row.config) or "{}")
        if payload.base_url is not None:
            data["base_url"] = payload.base_url
        if payload.api_key is not None:
            data["api_key"] = payload.api_key
        if payload.models is not None:
            data["models"] = payload.models
        if payload.default_model is not None:
            data["default_model"] = payload.default_model
        if payload.is_default is not None:
            if payload.is_default:
                _clear_defaults(db)
            data["is_default"] = payload.is_default
        if payload.use_for_embeddings is not None:
            data["use_for_embeddings"] = payload.use_for_embeddings
        row.config = encrypt_value(json.dumps(data))
        from datetime import datetime
        row.updated_at = datetime.utcnow()
        db.commit()

    reload_router()
    return _row_to_out(row, data)


@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(
    provider_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    _load_provider(provider_id)
    with SessionLocal() as db:
        db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).delete()
        db.commit()
    reload_router()
    return None


@router.post("/providers/{provider_id}/test")
async def test_provider(
    provider_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Test a stored provider by attempting a minimal chat completion.
    Persists health columns (last_test_at, last_test_ok, latency_ms, error)."""
    from datetime import datetime

    row = _load_provider(provider_id)
    pr = get_router()
    provider = pr.providers.get(row.name)
    if not provider or not provider.is_available():
        _record_health(row, ok=False, latency_ms=None, error="Provider no disponible (revisa API key y conexión)")
        raise HTTPException(status_code=400, detail="Provider is not available (check API key and connection)")

    try:
        default = provider.config.get("default_chat_model") or ""
        models = provider.config.get("chat_models") or []
        model = default or (models[0] if models else None)
        if not model:
            _record_health(row, ok=False, latency_ms=None, error="Sin modelo configurado. Ejecuta 'Sincronizar modelos'.")
            raise HTTPException(status_code=400, detail="No model configured. Run 'Sync models' first.")
        start = time.perf_counter()
        text, _ = provider.chat_completion(
            prompt="Responde solo con: OK",
            model=model,
            max_tokens=10,
        )
        latency_ms = int((time.perf_counter() - start) * 1000)
        _record_health(row, ok=True, latency_ms=latency_ms, error=None)
        return {"ok": True, "model": model, "response": text[:100], "latency_ms": latency_ms}
    except HTTPException:
        raise
    except Exception as exc:
        _record_health(row, ok=False, latency_ms=None, error=str(exc)[:400])
        raise HTTPException(status_code=400, detail=f"Test failed: {exc}")


def _record_health(row: ProviderConfig, *, ok: bool, latency_ms: Optional[int], error: Optional[str]) -> None:
    from datetime import datetime

    with SessionLocal() as db:
        r = db.query(ProviderConfig).filter(ProviderConfig.id == row.id).first()
        if not r:
            return
        r.last_test_at = datetime.utcnow()
        r.last_test_ok = ok
        r.last_test_latency_ms = latency_ms
        r.last_test_error = error
        r.updated_at = datetime.utcnow()
        db.commit()


@router.post("/providers/{provider_id}/sync-models")
async def sync_models(
    provider_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _=Depends(csrf_protect),
):
    """Discover models (Ollama) or confirm the configured list."""
    row = _load_provider(provider_id)
    data = json.loads(decrypt_value(row.config) or "{}")

    if row.provider_type == "ollama":
        from providers import OllamaProvider
        base = data.get("base_url") or cfg.OLLAMA_BASE_URL
        ollama = OllamaProvider(base_url=base)
        ids = ollama.discover_models()
        if not ids:
            raise HTTPException(status_code=400, detail="Ollama no respondió. ¿Está corriendo en " + base + "?")
        data["models"] = ids
        if not data.get("default_model") and ids:
            data["default_model"] = ids[0]
    else:
        catalog = PROVIDER_CATALOG.get(row.provider_type)
        if catalog:
            data["models"] = list(catalog["chat_models"])
        if not data.get("default_model") and data.get("models"):
            data["default_model"] = data["models"][0]

    with SessionLocal() as db:
        row.config = encrypt_value(json.dumps(data))
        from datetime import datetime
        row.updated_at = datetime.utcnow()
        db.commit()

    reload_router()
    return {"models": data.get("models") or []}


@router.get("/models", response_model=List[ModelOut])
async def get_models(current_user: User = Depends(get_current_user)):
    """List all available chat models across configured providers."""
    return get_router().list_chat_models()


def _clear_defaults(db):
    rows = db.query(ProviderConfig).all()
    for r in rows:
        try:
            d = json.loads(decrypt_value(r.config) or "{}")
        except Exception:
            continue
        if d.get("is_default"):
            d["is_default"] = False
            r.config = encrypt_value(json.dumps(d))
    db.commit()