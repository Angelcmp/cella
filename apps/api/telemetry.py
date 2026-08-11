"""OpenTelemetry tracing (opcional, lazy import).

Cuando ENABLE_TRACING=true y los paquetes opentelemetry están instalados,
instrumenta las peticiones con spans anidables. Si no, todas las llamadas son
no-ops seguras sin depender de otel.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Callable, Iterator, Optional

logger = logging.getLogger(__name__)

_tracer: Any = None
_initialized = False


def _init() -> None:
    global _tracer, _initialized
    if _initialized:
        return
    _initialized = True
    try:
        import config as cfg  # lazy to avoid circular import at module level
    except Exception:
        return
    if not cfg.ENABLE_TRACING:
        return
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import SERVICE_NAME, Resource

        provider = TracerProvider(
            resource=Resource.create({SERVICE_NAME: cfg.OTEL_SERVICE_NAME})
        )

        if cfg.OTEL_EXPORTER_OTLP_PROTOCOL == "grpc":
            exporter = OTLPSpanExporter(
                endpoint=cfg.OTEL_EXPORTER_OTLP_ENDPOINT,
                insecure=True,
            )
        else:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as HttpExporter

            exporter = HttpExporter(endpoint=cfg.OTEL_EXPORTER_OTLP_ENDPOINT)

        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        _tracer = trace.get_tracer(__name__)
        logger.info("OpenTelemetry tracing enabled (service=%s)", cfg.OTEL_SERVICE_NAME)
    except Exception as exc:
        logger.warning(f"OpenTelemetry init failed (tracing disabled): {exc}")
        _tracer = None


@contextmanager
def span(name: str, **attrs: Any) -> Iterator[Any]:
    _init()
    if _tracer is None:
        yield None
        return
    try:
        from opentelemetry import trace as otel_trace

        current = otel_trace.trace.get_current_span()
        with _tracer.start_as_current_span(
            name,
            attributes=attrs or None,
        ) as s:
            yield s
    except Exception:
        yield None


def inject_tracing_middleware() -> Optional[Callable]:
    """Return a FastAPI middleware callable that creates spans per request,
    or None if tracing is disabled/unavailable."""
    _init()
    if _tracer is None:
        return None

    async def _otel_middleware(request, call_next):
        with span(
            f"HTTP {request.method} {request.url.path}",
            **{
                "http.method": request.method,
                "http.url": str(request.url.path),
                "http.request_id": getattr(request.state, "request_id", None),
            },
        ):
            return await call_next(request)

    return _otel_middleware