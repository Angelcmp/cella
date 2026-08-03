"""
Unified LLM provider abstraction using OpenAI-compatible APIs.

Supports providers with OpenAI-compatible endpoints:
- DeepSeek (chat only, no embeddings API)
- Zhipu / GLM (chat + embeddings)
- OpenAI (chat + embeddings)

All providers are configured from environment variables. The router selects the
appropriate provider based on the requested model id or the default configured
provider.
"""

from __future__ import annotations

import os
import logging
from typing import Any, Dict, Iterator, List, Optional, Tuple

from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI

logger = logging.getLogger(__name__)


class LocalEmbeddingProvider:
    """Lightweight local embedding provider using fastembed.

    Used as a fallback when remote embedding providers (Zhipu/OpenAI) are not
    available or their configured model does not exist. It runs entirely on the
    local machine without requiring external API keys.
    """

    def __init__(self) -> None:
        self.name = "local"
        self.model = None
        self.dim = 384
        self.available = False
        try:
            from fastembed import TextEmbedding
            # Lightweight multilingual model suitable for mixed Spanish/English content
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
        # fastembed returns a generator of numpy ndarrays; convert to plain Python lists
        raw = list(self.model.embed(texts))
        return [emb.tolist() if hasattr(emb, "tolist") else list(emb) for emb in raw]

    def generate_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        if not text:
            return [0.0] * self.dim
        return self.generate_embeddings_batch([text])[0]

# Provider configuration
# Each provider exposes an OpenAI-compatible base_url. We keep the model names
# exactly as consumed by the provider API. The frontend uses "deepseek-v4-flash"
# which is passed through to DeepSeek as the model name.
PROVIDER_CONFIG: Dict[str, Dict[str, Any]] = {
    "deepseek": {
        "env_key": "DEEPSEEK_API_KEY",
        "base_url": "https://api.deepseek.com/v1",
        "chat_models": [
            "deepseek-v4-flash",
            "deepseek-chat",
            "deepseek-reasoner",
        ],
        "default_chat_model": "deepseek-v4-flash",
        "has_embeddings": False,
    },
    "zhipu": {
        "env_key": "ZHIPU_API_KEY",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "chat_models": [
            "glm-4.5-flash",
            "glm-4.5-air",
            "glm-4.7",
            "glm-4.7-flash",
            "glm-4-plus",
            "glm-4-flash",
            "glm-4-air",
            "glm-4",
            "embedding-2",
        ],
        "default_chat_model": "glm-4.7-flash",
        "has_embeddings": True,
        "default_embed_model": "embedding-3",
        "embed_dim": 1024,
    },
    "openai": {
        "env_key": "OPENAI_API_KEY",
        "base_url": "https://api.openai.com/v1",
        "chat_models": [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-3.5-turbo",
        ],
        "default_chat_model": "gpt-4o-mini",
        "has_embeddings": True,
        "default_embed_model": "text-embedding-ada-002",
        "embed_dim": 1536,
    },
}


def _getenv(name: str) -> Optional[str]:
    value = os.getenv(name)
    if value and value.strip():
        return value.strip()
    return None


class LLMProvider:
    """Wrapper around a single OpenAI-compatible provider."""

    def __init__(self, name: str, config: Dict[str, Any]) -> None:
        self.name = name
        self.config = config
        self.api_key = _getenv(config["env_key"])
        self.client: Optional[OpenAI] = None
        self.available = False

        if self.api_key:
            try:
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url=config["base_url"],
                    timeout=120,
                    max_retries=3,
                )
                self.available = True
                logger.info(f"Provider '{name}' initialized at {config['base_url']}")
            except Exception as exc:  # pragma: no cover
                logger.warning(f"Provider '{name}' failed to initialize: {exc}")
        else:
            logger.info(f"Provider '{name}' skipped: missing {config['env_key']}")

    def is_available(self) -> bool:
        return self.available and self.client is not None

    def normalize_model(self, model: Optional[str]) -> str:
        """Return the model name to use. If unknown, pass through to the API."""
        if not model:
            return self.config["default_chat_model"]
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
        """Generate a non-streaming chat completion.

        Returns a tuple of (assistant_text, citations). Citations are not
        produced by this layer; callers attach them from the RAG pipeline.
        """
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
        """Yield (kind, text) chunks as they arrive from the provider.

        kind is "thinking" for reasoning content (when the model exposes it,
        e.g. DeepSeek reasoner via ``reasoning_content``) and "text" for the
        final answer content.
        """
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
        """Generate a single embedding vector."""
        if not self.client:
            raise RuntimeError(f"Provider '{self.name}' is not available")
        if not self.config.get("has_embeddings"):
            raise RuntimeError(f"Provider '{self.name}' does not support embeddings")

        embed_model = model or self.config["default_embed_model"]
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
        """Generate embeddings for many texts in batches.

        The OpenAI-compatible embeddings endpoint supports sending a list of
        inputs in a single call, which is much faster than individual calls.
        """
        if not self.client:
            raise RuntimeError(f"Provider '{self.name}' is not available")
        if not self.config.get("has_embeddings"):
            raise RuntimeError(f"Provider '{self.name}' does not support embeddings")
        if not texts:
            return []

        embed_model = model or self.config["default_embed_model"]
        results: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                response = self.client.embeddings.create(
                    model=embed_model,
                    input=batch,
                )
            except Exception as exc:
                logger.error(
                    f"Provider '{self.name}' batch embedding failed for batch {i}: {exc}"
                )
                raise
            results.extend([item.embedding for item in response.data])

        return results


class ProviderRouter:
    """Routes chat and embedding requests to the appropriate provider."""

    def __init__(self) -> None:
        # Initialize every provider for which we have configuration.
        self.providers: Dict[str, LLMProvider] = {}
        for name, config in PROVIDER_CONFIG.items():
            provider = LLMProvider(name, config)
            if provider.is_available():
                self.providers[name] = provider

        # Local embedding provider requires no API key, so initialize it separately.
        self.local_embed = LocalEmbeddingProvider()

        # Build model id -> provider mapping based on available providers.
        self.model_routing: Dict[str, str] = {}
        for name, provider in self.providers.items():
            for model in provider.config["chat_models"]:
                self.model_routing[model] = name

        # Fallback provider for chat when no specific model is requested.
        default_llm = os.getenv("PROVIDER_LLM", "deepseek")
        if default_llm in self.providers:
            self.chat_provider = self.providers[default_llm]
        elif self.providers:
            self.chat_provider = next(iter(self.providers.values()))
        else:
            self.chat_provider = None

        # Provider for embeddings. DeepSeek does not support embeddings. We default
        # to local fastembed for robustness. If the user explicitly requests
        # zhipu/openai and those providers are available, we use them instead.
        default_embed = os.getenv("PROVIDER_EMBEDDINGS", "local")
        if default_embed == "local" and self.local_embed.is_available():
            self.embeddings_provider = self.local_embed
        elif default_embed in self.providers:
            candidate = self.providers[default_embed]
            if candidate.config.get("has_embeddings"):
                self.embeddings_provider = candidate
            else:
                self.embeddings_provider = self._first_with_embeddings() or self.local_embed
        else:
            self.embeddings_provider = self._first_with_embeddings() or self.local_embed

        # If local embeddings are selected, ensure they are actually available.
        if self.embeddings_provider is None:
            self.embeddings_provider = self.local_embed

        logger.info(
            f"ProviderRouter ready: chat={self.chat_provider.name if self.chat_provider else 'none'}, "
            f"embeddings={self.embeddings_provider.name if self.embeddings_provider else 'none'}"
        )

    def _first_with_embeddings(self) -> Optional[LLMProvider]:
        for provider in self.providers.values():
            if provider.config.get("has_embeddings"):
                return provider
        return None

    def resolve_chat_provider(self, model: Optional[str] = None) -> LLMProvider:
        """Select the provider for a chat request.

        If model is provided and known, use its provider. Otherwise use the
        default chat provider.
        """
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
