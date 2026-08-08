"""
Prometheus metrics for Cella API.

Exposed under /metrics when ENABLE_METRICS=true. Collects HTTP request counters
and latencies plus rate-limit rejection counters per key/route.
"""

from __future__ import annotations

from prometheus_client import (
    Counter,
    Histogram,
    CONTENT_TYPE_LATEST,
    generate_latest,
)

http_requests_total = Counter(
    "cella_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

http_request_duration_seconds = Histogram(
    "cella_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

rate_limited_total = Counter(
    "cella_rate_limited_total",
    "Requests rejected by rate limiting",
    ["key"],
)


def render_metrics() -> tuple[bytes, str]:
    """Return (body, content_type) for the /metrics endpoint."""
    return generate_latest(), CONTENT_TYPE_LATEST
