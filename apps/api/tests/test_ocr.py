"""Tests for OCR configurability and observability.

Covers:
- TESSERACT_LANGS propagation into DocumentProcessor
- OcrScanLog persistence path (via a synthetic processing_result)
- /internal/ocr-metrics endpoint incrementing Prometheus counters
"""

from __future__ import annotations

import importlib
from unittest.mock import patch

from fastapi.testclient import TestClient

import config as cfg
import main as app_main
from database_simple import SessionLocal, OcrScanLog


def _reload_config():
    """Reload config module so monkey-patched env vars take effect."""
    importlib.reload(cfg)


def test_tesseract_langs_from_config():
    """DocumentProcessor must read TESSERACT_LANGS from config (no hardcoded value)."""
    # Save and restore around the test so we don't poison other tests.
    original = cfg.TESSERACT_LANGS
    try:
        cfg.TESSERACT_LANGS = "eng+fra"
        # Import the worker module fresh so __init__ picks up the patched value.
        sys_path = __import__("sys")
        worker_dir = __import__("os").path.abspath(
            __import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..", "worker")
        )
        if worker_dir not in sys_path.path:
            sys_path.path.insert(0, worker_dir)
        from document_processor import DocumentProcessor

        processor = DocumentProcessor()
        assert processor.tesseract_langs == "eng+fra", (
            f"expected DocumentProcessor to use cfg.TESSERACT_LANGS='eng+fra', "
            f"got {processor.tesseract_langs!r}"
        )
    finally:
        cfg.TESSERACT_LANGS = original


def test_ocr_log_persisted_on_ocr_path(db_session):
    """store_ocr_log must insert one row per document with the OCR counters."""
    cfg.OCR_LOG_ENABLED = True

    # Lazy import (worker.py appends to sys.path at runtime; importing here is
    # the same way `process_document` does it).
    import sys as _sys
    import os as _os

    _worker_dir = _os.path.abspath(
        _os.path.join(_os.path.dirname(__file__), "..", "..", "worker")
    )
    if _worker_dir not in _sys.path:
        _sys.path.insert(0, _worker_dir)
    from worker import store_ocr_log

    processing_result = {
        "total_pages": 12,
        "ocr_stats": {"pages_ocr": 4, "pages_failed": 1, "chars_ocr": 12345},
        "ocr_langs": "spa+eng",
        "extraction_metadata": {"filename": "sample.pdf"},
    }

    ok = store_ocr_log("doc-ocr-test-1", processing_result)
    assert ok is True, "store_ocr_log must succeed when OCR ran and log is enabled"

    log = (
        db_session.query(OcrScanLog)
        .filter(OcrScanLog.document_id == "doc-ocr-test-1")
        .first()
    )
    assert log is not None, "OcrScanLog row must be persisted"
    assert log.langs == "spa+eng"
    assert log.pages_total == 12
    assert log.pages_ocr == 4
    assert log.pages_failed == 1
    assert log.chars_extracted == 12345
    assert log.filename == "sample.pdf"


def test_ocr_log_skipped_when_disabled(db_session):
    """OCR_LOG_ENABLED=false → no row is written even if pages_ocr > 0."""
    cfg.OCR_LOG_ENABLED = False
    try:
        import sys as _sys
        import os as _os

        _worker_dir = _os.path.abspath(
            _os.path.join(_os.path.dirname(__file__), "..", "..", "worker")
        )
        if _worker_dir not in _sys.path:
            _sys.path.insert(0, _worker_dir)
        from worker import store_ocr_log

        processing_result = {
            "total_pages": 5,
            "ocr_stats": {"pages_ocr": 3, "pages_failed": 0, "chars_ocr": 999},
            "ocr_langs": "spa+eng",
        }
        ok = store_ocr_log("doc-ocr-disabled-1", processing_result)
        assert ok is False
        log = (
            db_session.query(OcrScanLog)
            .filter(OcrScanLog.document_id == "doc-ocr-disabled-1")
            .first()
        )
        assert log is None, "row must not be persisted when OCR_LOG_ENABLED=false"
    finally:
        cfg.OCR_LOG_ENABLED = True


def test_ocr_metrics_endpoint_increments_counters(client: TestClient):
    """POST /internal/ocr-metrics increments cella_ocr_* counters visible at /metrics."""
    from metrics import (
        ocr_pages_total,
        ocr_chars_total,
        ocr_failures_total,
    )

    pages_before = ocr_pages_total._value.get()
    chars_before = ocr_chars_total._value.get()
    failed_before = ocr_failures_total._value.get()

    resp = client.post(
        "/internal/ocr-metrics",
        json={"pages_ocr": 7, "chars_ocr": 4321, "pages_failed": 2},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"ok": True}

    assert ocr_pages_total._value.get() == pages_before + 7
    assert ocr_chars_total._value.get() == chars_before + 4321
    assert ocr_failures_total._value.get() == failed_before + 2


def test_ocr_metrics_endpoint_handles_zeros(client: TestClient):
    """Zero-valued payload is a no-op (no over-incrementing)."""
    from metrics import ocr_pages_total

    before = ocr_pages_total._value.get()
    resp = client.post("/internal/ocr-metrics", json={"pages_ocr": 0})
    assert resp.status_code == 200
    assert ocr_pages_total._value.get() == before


def test_processor_ocr_image_returns_counts():
    """_ocr_image returns success/chars without raising on pytesseract errors."""
    import sys as _sys
    import os as _os

    _worker_dir = _os.path.abspath(
        _os.path.join(_os.path.dirname(__file__), "..", "..", "worker")
    )
    if _worker_dir not in _sys.path:
        _sys.path.insert(0, _worker_dir)
    from document_processor import DocumentProcessor

    processor = DocumentProcessor()

    class FakeImage:
        pass

    # Happy path: pytesseract returns text
    with patch("document_processor.pytesseract.image_to_string", return_value="hello world"):
        result = processor._ocr_image(FakeImage())
    assert result["success"] is True
    assert result["chars"] == len("hello world")
    assert result["text"]

    # Failure path: pytesseract raises
    with patch(
        "document_processor.pytesseract.image_to_string",
        side_effect=RuntimeError("tesseract missing"),
    ):
        result = processor._ocr_image(FakeImage())
    assert result["success"] is False
    assert result["chars"] == 0
    assert result["text"] == ""

    # Empty path: pytesseract returns whitespace only
    with patch("document_processor.pytesseract.image_to_string", return_value="   \n  "):
        result = processor._ocr_image(FakeImage())
    assert result["success"] is False