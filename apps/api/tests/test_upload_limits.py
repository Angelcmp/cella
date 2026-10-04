"""Upload limits: type/size validation, PDF page count, signature checks."""

from __future__ import annotations

import io

from routers.documents import _pdf_page_count, _valid_signature


def test_valid_signature_pdf():
    assert _valid_signature(b"%PDF-1.7 whatever", "application/pdf")
    assert not _valid_signature(b"garbage", "application/pdf")


def test_valid_signature_zip_types():
    zipish = b"PK\x03\x04rest"
    assert _valid_signature(zipish, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    assert _valid_signature(zipish, "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    assert _valid_signature(zipish, "application/vnd.ms-powerpoint")


def test_valid_signature_text():
    assert _valid_signature("hola mundo".encode("utf-8"), "text/plain")
    assert not _valid_signature(b"\xff\xfe\x00", "text/plain")


def test_pdf_page_count_garbage_returns_none():
    assert _pdf_page_count(b"not a pdf at all") is None


def test_pdf_page_count_positive():
    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    assert _pdf_page_count(buf.getvalue()) == 1


def test_upload_rejects_unsupported_type(client):
    # Images have a defined limit but are not yet enabled for upload.
    resp = client.post(
        "/documents/upload",
        files={"file": ("img.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    assert resp.status_code == 400
    assert "Only PDF" in resp.json()["detail"]


def test_upload_rejects_bad_signature(client):
    resp = client.post(
        "/documents/upload",
        files={"file": ("a.txt", b"\xff\xfe\x00", "text/plain")},
    )
    assert resp.status_code == 400
    assert "signature" in resp.json()["detail"]
