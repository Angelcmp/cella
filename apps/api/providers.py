"""
Unified LLM provider abstraction for Cella Local.

Supports:
- OpenAI-compatible providers (OpenAI, DeepSeek, Zhipu/GLM, Gemini, Qwen/DashScope,
  Kimi/Moonshot, MiniMax, and any generic OpenAI-compatible endpoint such as
  LM Studio, vLLM, LocalAI, Ollama's /v1 API...).
- Anthropic (Claude) via its native SDK (not OpenAI-compatible).
- Local embeddings via fastembed (default) or any OpenAI-compatible embeddings
  endpoint.

Providers can be configured:
  1. From stored configurations (ProviderConfig table, encrypted API keys) that
     the user manages from the UI.
  2. From environment variables (backwards compatible).
"""

from __future__ import annotations

import os
import logging
from typing import Any, Dict, Iterator, List, Optional, Tuple

from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI

import config as cfg

logger = logging.getLogger(__name__)


class LocalEmbeddingProvider:
    """Lightweight local embedding provider using fastembed.

    Runs entirely on the local machine without requiring external API keys.
    """

    def __init__(self) -> None:
        self.name = "local"
        self.model = None
        self.dim = 384
        self.available = False
        try:
            from fastembed import TextEmbedding
            self.model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
            self.available = True
            logger.info("LocalEmbeddingProvider initialized with BAAI/bge-small-en-v1.5")
        except Exception as exc:
            logger.warning(f"LocalEmbeddingProvider failed to initialize: {exc}")

    def is_available(self) -> bool:
        return self.available and self.model is not None

    def generate_embeddings_batch(
        self,
        texts: List[str],
        model: Optional[str] = None,
        batch_size: int = 100,
    ) -> List[List[float]]:
        if not self.is_available():
            raise RuntimeError("LocalEmbeddingProvider is not available")
        if not texts:
            return []
        raw = list(self.model.embed(texts))
        return [emb.tolist() if hasattr(emb, "tolist") else list(emb) for emb in raw]

    def generate_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        if not text:
            return [0.0] * self.dim
        return self.generate_embeddings_batch([text])[0]


# ---------------------------------------------------------------------------
# Provider catalog: known providers and their OpenAI-compatible endpoints.
# ---------------------------------------------------------------------------

PROVIDER_CATALOG: Dict[str, Dict[str, Any]] = {
    "openai": {
        "label": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "env_key": "OPENAI_API_KEY",
        "chat_models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini"],
        "default_chat_model": "gpt-4o-mini",
        "has_embeddings": True,
        "default_embed_model": "text-embedding-ada-002",
        "embed_dim": 1536,
    },
    "deepseek": {
        "label": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "env_key": "DEEPSEEK_API_KEY",
        "chat_models": ["deepseek-chat", "deepseek-reasoner"],
        "default_chat_model": "deepseek-chat",
        "has_embeddings": False,
    },
    "zhipu": {
        "label": "Zhipu (GLM)",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "env_key": "ZHIPU_API_KEY",
        "chat_models": [
            "glm-4.7-flash", "glm-4.7", "glm-4.5-flash", "glm-4.5-air",
            "glm-4-plus", "glm-4-flash", "glm-4-air",
        ],
        "default_chat_model": "glm-4.7-flash",
        "has_embeddings": True,
        "default_embed_model": "embedding-3",
        "embed_dim": 1024,
    },
    "gemini": {
        "label": "Google Gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY",
        "chat_models": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
        "default_chat_model": "gemini-2.5-flash",
        "has_embeddings": True,
        "default_embed_model": "text-embedding-004",
        "embed_dim": 768,
    },
    "qwen": {
        "label": "Qwen (Alibaba DashScope)",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "env_key": "DASHSCOPE_API_KEY",
        "chat_models": ["qwen-plus", "qwen-turbo", "qwen-max", "qwen3"],
        "default_chat_model": "qwen-plus",
        "has_embeddings": False,
    },
    "moonshot": {
        "label": "Kimi (Moonshot)",
        "base_url": "https://api.moonshot.cn/v1",
        "env_key": "MOONSHOT_API_KEY",
        "chat_models": ["kimi-k2-0711-preview", "moonshot-v1-8k", "moonshot-v1-32k"],
        "default_chat_model": "kimi-k2-0711-preview",
        "has_embeddings": False,
    },
    "minimax": {
        "label": "MiniMax",
        "base_url": "https://api.minimax.chat/v1",
        "env_key": "MINIMAX_API_KEY",
        "chat_models": ["MiniMax-Text-01", "abab6.5s-chat"],
        "default_chat_model": "MiniMax-Text-01",
        "has_embeddings": False,
    },
}

# Anthropic (Claude) — native SDK, not OpenAI-compatible.
ANTHROPIC_CATALOG: Dict[str, Dict[str, Any]] = {
    "label": "Anthropic (Claude)",
    "base_url": "https://api.anthropic.com/v1",
    "env_key": "ANTHROPIC_API_KEY",
    "chat_models": [
        "claude-sonnet-4-20250514",
        "claude-haiku-4-20250514",
        "claude-opus-4-20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
    ],
    "default_chat_model": "claude-sonnet-4-20250514",
    "has_embeddings": False,
}


def _getenv(name: str) -> Optional[str]:
    value = os.getenv(name)
    if value and value.strip():
        return value.strip()
    return None


# ---------------------------------------------------------------------------
# OpenAI-compatible provider
# ---------------------------------------------------------------------------

class LLMProvider:
    """Wrapper around a single OpenAI-compatible provider."""

    def __init__(
        self,
        name: str,
        config: Dict[str, Any],
        api_key: Optional[str] = None,
    ) -> None:
        self.name = name
        self.config = config
        self.api_key = api_key if api_key else _getenv(config.get("env_key", ""))
        self.client: Optional[OpenAI] = None
        self.available = False

        base_url = config.get("base_url") or cfg.OLLAMA_BASE_URL
        if self.api_key:
            try:
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url=base_url,
                    timeout=120,
                    max_retries=3,
                )
                self.available = True
                logger.info(f"Provider '{name}' initialized at {base_url}")
            except Exception as exc:  # pragma: no cover
                logger.warning(f"Provider '{name}' failed to initialize: {exc}")
        else:
            logger.info(f"Provider '{name}' skipped: missing API key")

    def is_available(self) -> bool:
        return self.available and self.client is not None

    def normalize_model(self, model: Optional[str]) -> str:
        if not model:
            return self.config.get("default_chat_model", "gpt-4o-mini")
        return model

    def chat_completion(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
        stream: bool = False,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        if not self.client:
            raise RuntimeError(f"Provider '{self.name}' is not available")

        model_name = self.normalize_model(model)
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = self.client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False,
            )
        except Exception as exc:
            logger.error(f"Provider '{self.name}' chat completion failed: {exc}")
            raise

        text = response.choices[0].message.content or ""
        return text, []

    def chat_completion_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> Iterator[Tuple[str, str]]:
        if not self.client:
            raise RuntimeError(f"Provider '{self.name}' is not available")

        model_name = self.normalize_model(model)
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            stream = self.client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            for chunk in stream:
                choice = chunk.choices[0] if chunk.choices else None
                if not choice:
                    continue
                delta = choice.delta
                reasoning = getattr(delta, "reasoning_content", None)
                if reasoning:
                    yield ("thinking", reasoning)
                content = getattr(delta, "content", None)
                if content:
                    yield ("text", content)
        except Exception as exc:
            logger.error(f"Provider '{self.name}' chat stream failed: {exc}")
            raise

    def generate_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        if not self.client:
            raise RuntimeError(f"Provider '{self.name}' is not available")
        if not self.config.get("has_embeddings"):
            raise RuntimeError(f"Provider '{self.name}' does not support embeddings")

        embed_model = model or self.config.get("default_embed_model", "text-embedding-ada-002")
        try:
            response = self.client.embeddings.create(
                model=embed_model,
                input=text,
            )
        except Exception as exc:
            logger.error(f"Provider '{self.name}' embedding failed: {exc}")
            raise

        return response.data[0].embedding

    def generate_embeddings_batch(
        self,
        texts: List[str],
        model: Optional[str] = None,
        batch_size: int = 100,
    ) -> List[List[float]]:
        if not self.client:
            raise RuntimeError(f"Provider '{self.name}' is not available")
        if not self.config.get("has_embeddings"):
            raise RuntimeError(f"Provider '{self.name}' does not support embeddings")
        if not texts:
            return []

        embed_model = model or self.config.get("default_embed_model", "text-embedding-ada-002")
        results: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                response = self.client.embeddings.create(
                    model=embed_model,
                    input=batch,
                )
            except Exception as exc:
                logger.error(f"Provider '{self.name}' batch embedding failed for batch {i}: {exc}")
                raise
            results.extend([item.embedding for item in response.data])

        return results


class OllamaProvider:
    """Ollama via its OpenAI-compatible /v1 endpoint. No API key required."""

    def __init__(self, base_url: Optional[str] = None) -> None:
        self.name = "ollama"
        self.base_url = (base_url or cfg.OLLAMA_BASE_URL).rstrip("/")
        self.config: Dict[str, Any] = {
            "base_url": self.base_url,
            "chat_models": [],
            "default_chat_model": "llama3",
            "has_embeddings": False,
        }
        self.client: Optional[OpenAI] = None
        self.available = False
        try:
            self.client = OpenAI(
                api_key="ollama",
                base_url=self.base_url,
                timeout=120,
                max_retries=0,
            )
            self.available = True
        except Exception as exc:  # pragma: no cover
            logger.warning(f"Ollama failed to initialize: {exc}")

    def is_available(self) -> bool:
        return self.available and self.client is not None

    def discover_models(self) -> List[str]:
        """Fetch the list of installed models from Ollama's /models endpoint."""
        if not self.client:
            return []
        try:
            resp = self.client.models.list()
            ids = [m.id for m in resp.data]
            self.config["chat_models"] = ids
            if ids:
                self.config["default_chat_model"] = ids[0]
            return ids
        except Exception as exc:
            logger.warning(f"Ollama model discovery failed: {exc}")
            return []

    def normalize_model(self, model: Optional[str]) -> str:
        if not model:
            return self.config.get("default_chat_model", "llama3")
        return model

    def chat_completion(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
        stream: bool = False,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        if not self.client:
            raise RuntimeError("Ollama is not available")

        model_name = self.normalize_model(model)
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = self.client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False,
            )
        except Exception as exc:
            logger.error(f"Ollama chat completion failed: {exc}")
            raise

        return response.choices[0].message.content or "", []

    def chat_completion_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> Iterator[Tuple[str, str]]:
        if not self.client:
            raise RuntimeError("Ollama is not available")

        model_name = self.normalize_model(model)
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            stream = self.client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            for chunk in stream:
                choice = chunk.choices[0] if chunk.choices else None
                if not choice:
                    continue
                delta = choice.delta
                reasoning = getattr(delta, "reasoning_content", None)
                if reasoning:
                    yield ("thinking", reasoning)
                content = getattr(delta, "content", None)
                if content:
                    yield ("text", content)
        except Exception as exc:
            logger.error(f"Ollama chat stream failed: {exc}")
            raise


# ---------------------------------------------------------------------------
# Anthropic (Claude) provider — native SDK
# ---------------------------------------------------------------------------

class AnthropicProvider:
    """Claude via the anthropic SDK. LLM only (no embeddings)."""

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.name = "anthropic"
        self.config = dict(ANTHROPIC_CATALOG)
        self.api_key = api_key or _getenv("ANTHROPIC_API_KEY")
        self.client = None
        self.available = False
        if self.api_key:
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=self.api_key, timeout=120)
                self.available = True
                logger.info("Anthropic provider initialized")
            except Exception as exc:  # pragma: no cover
                logger.warning(f"Anthropic failed to initialize: {exc}")
        else:
            logger.info("Anthropic provider skipped: missing ANTHROPIC_API_KEY")

    def is_available(self) -> bool:
        return self.available and self.client is not None

    def normalize_model(self, model: Optional[str]) -> str:
        if not model:
            return self.config.get("default_chat_model", "claude-sonnet-4-20250514")
        return model

    def chat_completion(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
        stream: bool = False,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        if not self.client:
            raise RuntimeError("Anthropic provider is not available")

        model_name = self.normalize_model(model)
        kwargs: Dict[str, Any] = {
            "model": model_name,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        try:
            response = self.client.messages.create(**kwargs)
        except Exception as exc:
            logger.error(f"Anthropic chat completion failed: {exc}")
            raise

        text = "".join(
            block.text for block in response.content if getattr(block, "type", "") == "text"
        )
        return text, []

    def chat_completion_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> Iterator[Tuple[str, str]]:
        if not self.client:
            raise RuntimeError("Anthropic provider is not available")

        model_name = self.normalize_model(model)
        kwargs: Dict[str, Any] = {
            "model": model_name,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        try:
            with self.client.messages.stream(**kwargs) as stream:
                for text in stream.text_stream:
                    if text:
                        yield ("text", text)
        except Exception as exc:
            logger.error(f"Anthropic chat stream failed: {exc}")
            raise


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

class ProviderRouter:
    """Routes chat and embedding requests to the appropriate provider.

    Builds providers from:
      - stored configurations (list of dicts, from the UI-managed DB table)
      - environment variables (fallback for known providers with env keys)
      - Ollama (local, always attempted)
    """

    def __init__(self, stored_configs: Optional[List[Dict[str, Any]]] = None) -> None:
        self.providers: Dict[str, Any] = {}

        # 1) Stored UI-managed configurations
        for scfg in stored_configs or []:
            provider = self._build_from_stored(scfg)
            if provider is not None:
                self.providers[scfg["name"]] = provider

        # 2) Environment fallback for known providers
        for name, pcfg in PROVIDER_CATALOG.items():
            if name in self.providers:
                continue
            if _getenv(pcfg.get("env_key", "")):
                provider = LLMProvider(name, pcfg)
                if provider.is_available():
                    self.providers[name] = provider

        # Anthropic from env
        if "anthropic" not in self.providers and _getenv("ANTHROPIC_API_KEY"):
            provider = AnthropicProvider()
            if provider.is_available():
                self.providers["anthropic"] = provider

        # 3) Ollama (local, no key required) unless a stored ollama exists
        if "ollama" not in self.providers:
            ollama = OllamaProvider()
            if ollama.is_available():
                self.providers["ollama"] = ollama

        # Local embeddings provider requires no API key.
        self.local_embed = LocalEmbeddingProvider()

        # Build model id -> provider mapping based on available providers.
        self.model_routing: Dict[str, str] = {}
        for name, provider in self.providers.items():
            for model in provider.config.get("chat_models", []):
                if model:
                    self.model_routing[model] = name

        # Default chat provider: stored default, then PROVIDER_LLM env, then first available.
        default_llm = os.getenv("PROVIDER_LLM", "ollama")
        self.chat_provider = self.providers.get(default_llm)
        if self.chat_provider is None:
            # Prefer a stored provider marked as default
            for scfg in stored_configs or []:
                if scfg.get("is_default") and scfg["name"] in self.providers:
                    self.chat_provider = self.providers[scfg["name"]]
                    break
        if self.chat_provider is None and self.providers:
            self.chat_provider = next(iter(self.providers.values()))

        # Embedding provider: stored one with embeddings, env one, or local.
        self.embeddings_provider = self._pick_embeddings_provider(stored_configs or [])

        logger.info(
            f"ProviderRouter ready: chat={getattr(self.chat_provider, 'name', 'none')}, "
            f"embeddings={getattr(self.embeddings_provider, 'name', 'none')}, "
            f"providers={list(self.providers.keys())}"
        )

    def _build_from_stored(self, scfg: Dict[str, Any]) -> Optional[Any]:
        ptype = scfg.get("provider_type", "openai_compat")
        name = scfg["name"]
        api_key = scfg.get("api_key")
        base_url = scfg.get("base_url") or ""
        models = scfg.get("models") or []
        default_model = scfg.get("default_model")

        if ptype == "anthropic":
            provider = AnthropicProvider(api_key=api_key)
            if models:
                provider.config["chat_models"] = models
            if default_model:
                provider.config["default_chat_model"] = default_model
            return provider if provider.is_available() else None

        if ptype == "ollama":
            provider = OllamaProvider(base_url=base_url or None)
            if models:
                provider.config["chat_models"] = models
            if default_model:
                provider.config["default_chat_model"] = default_model
            return provider if provider.is_available() else None

        # OpenAI-compatible
        catalog = PROVIDER_CATALOG.get(ptype)
        pcfg = dict(catalog) if catalog else {
            "base_url": base_url,
            "chat_models": [],
            "default_chat_model": default_model or "gpt-4o-mini",
            "has_embeddings": False,
        }
        if base_url:
            pcfg["base_url"] = base_url
        if models:
            pcfg["chat_models"] = models
        if default_model:
            pcfg["default_chat_model"] = default_model
        provider = LLMProvider(name, pcfg, api_key=api_key)
        return provider if provider.is_available() else None

    def _pick_embeddings_provider(self, stored_configs: List[Dict[str, Any]]) -> Any:
        # Prefer a stored provider that explicitly supports embeddings
        for scfg in stored_configs:
            if scfg.get("use_for_embeddings") and scfg["name"] in self.providers:
                provider = self.providers[scfg["name"]]
                if provider.config.get("has_embeddings"):
                    return provider
        # Then env-based provider with embeddings
        default_embed = os.getenv("PROVIDER_EMBEDDINGS", "local")
        if default_embed != "local":
            candidate = self.providers.get(default_embed)
            if candidate and candidate.config.get("has_embeddings"):
                return candidate
            for provider in self.providers.values():
                if provider.config.get("has_embeddings"):
                    return provider
        # Finally local fastembed
        if self.local_embed.is_available():
            return self.local_embed
        # Fallback: any provider with embeddings
        for provider in self.providers.values():
            if provider.config.get("has_embeddings"):
                return provider
        return self.local_embed

    def resolve_chat_provider(self, model: Optional[str] = None) -> Any:
        if model and model in self.model_routing:
            provider_name = self.model_routing[model]
            if provider_name in self.providers:
                return self.providers[provider_name]
        if self.chat_provider:
            return self.chat_provider
        if not self.providers:
            raise RuntimeError("No LLM providers are configured")
        return next(iter(self.providers.values()))

    def chat(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        provider = self.resolve_chat_provider(model)
        return provider.chat_completion(
            prompt,
            model=model,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )

    def chat_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> Iterator[str]:
        provider = self.resolve_chat_provider(model)
        yield from provider.chat_completion_stream(
            prompt,
            model=model,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def embed(self, text: str, model: Optional[str] = None) -> List[float]:
        if not self.embeddings_provider:
            raise RuntimeError("No embedding provider is configured")
        return self.embeddings_provider.generate_embedding(text, model)

    def embed_batch(
        self,
        texts: List[str],
        model: Optional[str] = None,
        batch_size: int = 100,
    ) -> List[List[float]]:
        if not self.embeddings_provider:
            raise RuntimeError("No embedding provider is configured")
        return self.embeddings_provider.generate_embeddings_batch(
            texts, model, batch_size
        )

    def get_embed_dim(self) -> int:
        if not self.embeddings_provider:
            return 384
        if hasattr(self.embeddings_provider, "config"):
            return self.embeddings_provider.config.get("embed_dim", 384)
        return getattr(self.embeddings_provider, "dim", 384)

    def list_chat_models(self) -> List[Dict[str, Any]]:
        """Return available chat models: [{id, name, provider}]."""
        out: List[Dict[str, Any]] = []
        for name, provider in self.providers.items():
            models = provider.config.get("chat_models", []) or []
            for mid in models:
                if mid and mid not in {m["id"] for m in out}:
                    out.append({"id": mid, "name": mid, "provider": name})
        return out


def build_router(stored_configs: Optional[List[Dict[str, Any]]] = None) -> ProviderRouter:
    return ProviderRouter(stored_configs)
