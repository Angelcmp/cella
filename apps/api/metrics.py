"""
Prometheus metrics for Cella API.

Exposed under /metrics when ENABLE_METRICS=true. Collects HTTP request counters
and latencies plus rate-limit rejection counters per key/route.
"""

from __future__ import annotations

from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
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

documents_by_status = Gauge(
    "cella_documents_by_status",
    "Documents count per status",
    ["status"],
)

dlq_total = Gauge(
    "cella_dlq_total",
    "Documents in Dead Letter Queue (dlq=true)",
)

processing_stale = Gauge(
    "cella_processing_stale",
    "Documents stuck in processing (no worker assigned)",
)


def update_worker_gauges(db_session):
    """Refresh worker-related gauges from the database."""
    try:
        from sqlalchemy import func
        from database_simple import Document

        for row in db_session.query(
            Document.status, func.count(Document.id)
        ).group_by(Document.status).all():
            documents_by_status.labels(status=row[0]).set(row[1])

        _dlq = db_session.query(func.count(Document.id)).filter(
            Document.dlq.is_(True)
        ).scalar() or 0
        dlq_total.set(_dlq)

        _stale = db_session.query(func.count(Document.id)).filter(
            Document.status == "processing",
        ).scalar() or 0
        processing_stale.set(_stale)
    except Exception:
        pass


def render_metrics() -> tuple[bytes, str]:
    """Return (body, content_type) for the /metrics endpoint."""
    return generate_latest(), CONTENT_TYPE_LATEST
