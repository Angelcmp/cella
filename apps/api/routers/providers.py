from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

import config as cfg
from database_simple import ProviderConfig, SessionLocal, get_db
from provider_registry import reload_router
from providers import PROVIDER_CATALOG, ANTHROPIC_CATALOG
from security.encryption import decrypt_value, encrypt_value

router = APIRouter()


class ProviderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    provider_type: str = Field(..., description="openai | anthropic | ollama | openai_compat | qwen | gemini | moonshot | minimax | deepseek | zhipu")
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


def _load_provider(id: str) -> ProviderConfig:
    with SessionLocal() as db:
        row = db.query(ProviderConfig).filter(ProviderConfig.id == id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Provider not found")
        return row


@router.get("/providers", response_model=List[ProviderOut])
async def list_providers():
    out = []
    with SessionLocal() as db:
        rows = db.query(ProviderConfig).order_by(ProviderConfig.created_at).all()
        for row in rows:
            data = decrypt_value(row.config)
            import json
            try:
                data = json.loads(data or "{}")
            except Exception:
                data = {}
            out.append(ProviderOut(
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
            ))
    return out


@router.get("/providers/catalog")
async def provider_catalog():
    """Available provider types and their known models (for the UI)."""
    catalog = {}
    for key, p in PROVIDER_CATALOG.items():
        catalog[key] = {
            "label": p["label"],
            "base_url": p["base_url"],
            "models": p["chat_models"],
            "needs_key": True,
        }
    catalog["anthropic"] = {
        "label": ANTHROPIC_CATALOG["label"],
        "base_url": ANTHROPIC_CATALOG["base_url"],
        "models": ANTHROPIC_CATALOG["chat_models"],
        "needs_key": True,
    }
    catalog["ollama"] = {
        "label": "Ollama (local)",
        "base_url": cfg.OLLAMA_BASE_URL,
        "models": [],
        "needs_key": False,
    }
    catalog["openai_compat"] = {
        "label": "OpenAI-compatible (LM Studio, vLLM, LocalAI...)",
        "base_url": "",
        "models": [],
        "needs_key": True,
    }
    return catalog


@router.post("/providers", response_model=ProviderOut, status_code=status.HTTP_201_CREATED)
async def create_provider(payload: ProviderCreate):
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
            config=encrypt_value(__import__("json").dumps(data)),
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    reload_router()
    return ProviderOut(
        id=row.id,
        name=row.name,
        provider_type=row.provider_type,
        label=_provider_label(row.provider_type),
        base_url=payload.base_url,
        models=payload.models or [],
        default_model=payload.default_model,
        is_default=payload.is_default,
        use_for_embeddings=payload.use_for_embeddings,
        has_api_key=bool(payload.api_key),
    )


@router.put("/providers/{provider_id}", response_model=ProviderOut)
async def update_provider(provider_id: str, payload: ProviderUpdate):
    row = _load_provider(provider_id)
    with SessionLocal() as db:
        data = __import__("json").loads(decrypt_value(row.config) or "{}")
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
        row.config = encrypt_value(__import__("json").dumps(data))
        db.commit()

    reload_router()
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
    )


@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(provider_id: str):
    row = _load_provider(provider_id)
    with SessionLocal() as db:
        db.delete(db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).first())
        db.commit()
    reload_router()
    return None


@router.post("/providers/{provider_id}/test")
async def test_provider(provider_id: str):
    """Test a stored provider by attempting a minimal chat completion."""
    row = _load_provider(provider_id)
    from provider_registry import get_router
    router = get_router()
    provider = router.providers.get(row.name)
    if not provider or not provider.is_available():
        raise HTTPException(status_code=400, detail="Provider is not available (check API key and connection)")
    try:
        default = provider.config.get("default_chat_model") or ""
        models = provider.config.get("chat_models") or []
        model = default or (models[0] if models else None)
        if not model:
            raise HTTPException(status_code=400, detail="No model configured. Run 'Sync models' first.")
        text, _ = provider.chat_completion(
            prompt="Responde solo con: OK",
            model=model,
            max_tokens=10,
        )
        return {"ok": True, "model": model, "response": text[:100]}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Test failed: {exc}")


@router.post("/providers/{provider_id}/sync-models")
async def sync_models(provider_id: str):
    """Discover models (Ollama) or confirm the configured list."""
    row = _load_provider(provider_id)
    import json

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
            data["models"] = catalog["chat_models"]
        if not data.get("default_model") and data.get("models"):
            data["default_model"] = data["models"][0]

    with SessionLocal() as db:
        row.config = encrypt_value(json.dumps(data))
        db.commit()

    reload_router()
    return {"models": data.get("models") or []}


@router.get("/models", response_model=List[ModelOut])
async def get_models():
    """List all available chat models across configured providers."""
    from provider_registry import get_router
    return get_router().list_chat_models()


def _clear_defaults(db):
    rows = db.query(ProviderConfig).all()
    for r in rows:
        try:
            d = __import__("json").loads(decrypt_value(r.config) or "{}")
        except Exception:
            continue
        if d.get("is_default"):
            d["is_default"] = False
            r.config = encrypt_value(__import__("json").dumps(d))
    db.commit()
