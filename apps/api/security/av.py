"""Antivirus pluggable con auditoría de cada escaneo.

El escaneo se realiza con un provider seleccionado por `AV_PROVIDER`:
  - "clamav": binario local (`clamscan`), provider por defecto.
  - "http"  : servicio gestionado vía API HTTP (multipart `file`, cabecera
              `Authorization: Bearer`). Contrato: 200 + {"status": "clean"} /
              {"status": "infected"}.
  - "none"  : desactivado (equivalente a ENABLE_FILE_AV_SCAN=false).

Cada escaneo (independientemente del resultado) se registra en la tabla
`av_scan_logs` — criterio de aceptación "logs de auditoría de cada escaneo".
Los tokens/IDS se loguean, nunca la clave de la API.
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass
from typing import Optional

import config as cfg
from database_simple import AVScanLog, SessionLocal

logger = logging.getLogger(__name__)


@dataclass
class AVScanResult:
    provider: str
    clean: bool
    error: Optional[str] = None
    duration_ms: int = 0
    # True only when the provider explicitly flagged the file as infected
    # (returncode=1 / status=infected). False for clean files AND for
    # provider failures (timeouts, missing binary, etc.).
    infected: bool = False


class _HttpProviderError(RuntimeError):
    pass


def _scan_clamav(content: bytes) -> AVScanResult:
    clamav_path = os.getenv("CLAMAV_PATH", "clamscan")
    if not clamav_path:
        raise RuntimeError("CLAMAV_PATH is not configured.")
    if shutil.which(clamav_path) is None:
        raise RuntimeError(f"Antivirus executable '{clamav_path}' not found in PATH.")

    start = time.perf_counter()
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        tmp_file.write(content)
        tmp_path = tmp_file.name
    try:
        result = subprocess.run(
            [clamav_path, "--no-summary", tmp_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            text=True,
            timeout=cfg.AV_API_TIMEOUT_SECONDS,
        )
        try:
            os.remove(tmp_path)
        except OSError:
            logger.warning("Failed to remove temporary scan file %s", tmp_path)

        duration_ms = int((time.perf_counter() - start) * 1000)
        if result.returncode == 0:
            return AVScanResult(provider="clamav", clean=True, duration_ms=duration_ms)
        if result.returncode == 1:
            detail = result.stdout.strip() or "malware detected"
            return AVScanResult(
                provider="clamav",
                clean=False,
                infected=True,
                error=detail,
                duration_ms=duration_ms,
            )
        raise RuntimeError(
            f"ClamAV scan error (code {result.returncode}): "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )
    except subprocess.TimeoutExpired:
        logger.warning("ClamAV scan timed out after %ss", cfg.AV_API_TIMEOUT_SECONDS)
        raise RuntimeError("Antivirus scan timed out")


def _scan_http(content: bytes) -> AVScanResult:
    """Escaneo contra un servicio AV gestionado (multipart POST)."""
    if not cfg.AV_API_URL:
        raise RuntimeError("AV_API_URL is required when AV_PROVIDER=http")
    start = time.perf_counter()
    try:
        import httpx

        headers = {
            "User-Agent": "cella/av-backend",
        }
        if cfg.AV_API_KEY:
            headers["Authorization"] = f"Bearer {cfg.AV_API_KEY}"
        with tempfile.NamedTemporaryFile(suffix=".bin") as tmp_file:
            tmp_file.write(content)
            tmp_file.flush()
            with open(tmp_file.name, "rb") as fh:
                response = httpx.post(
                    cfg.AV_API_URL,
                    headers=headers,
                    files={"file": ("upload.bin", fh, "application/octet-stream")},
                    timeout=cfg.AV_API_TIMEOUT_SECONDS,
                )
        duration_ms = int((time.perf_counter() - start) * 1000)
        if response.status_code == 200:
            try:
                data = response.json()
            except Exception:
                data = {}
            status = str(data.get("status", "")).lower()
            if status == "clean":
                return AVScanResult(
                    provider="http", clean=True, duration_ms=duration_ms
                )
            if status == "infected":
                return AVScanResult(
                    provider="http",
                    clean=False,
                    infected=True,
                    error=data.get("detail") or "malware detected",
                    duration_ms=duration_ms,
                )
            raise _HttpProviderError(
                f"AV service returned unexpected payload: {response.text[:200]}"
            )
        raise _HttpProviderError(
            f"AV service returned HTTP {response.status_code}: {response.text[:200]}"
        )
    except _HttpProviderError:
        raise
    except Exception as exc:
        raise RuntimeError(f"AV HTTP scan failed: {exc}") from exc


_PROVIDERS = {
    "clamav": _scan_clamav,
    "clamscan": _scan_clamav,
    "http": _scan_http,
    "managed": _scan_http,
}


def _classify_result(result: AVScanResult) -> str:
    """Derive the audit label from a scan result.

    Priority order:
      1. 'infected' when the provider explicitly flagged the file.
      2. 'error' when the provider raised (timeout, missing binary, etc.).
      3. 'clean' otherwise.
    """
    if result.infected:
        return "infected"
    if result.error:
        return "error"
    return "clean" if result.clean else "error"


def _audit(result: AVScanResult, *, document_id, filename, file_size, request_id) -> None:
    """Persiste el registro de auditoría del escaneo (best-effort)."""
    if not cfg.AV_AUDIT_LOG:
        return
    try:
        with SessionLocal() as db:
            db.add(
                AVScanLog(
                    document_id=document_id,
                    filename=filename,
                    provider=result.provider,
                    file_size=file_size or 0,
                    result=_classify_result(result),
                    error=result.error[:500] if result.error else None,
                    duration_ms=result.duration_ms,
                    request_id=request_id,
                )
            )
            db.commit()
    except Exception as exc:
        logger.warning("Failed to audit AV scan: %s", exc)


def scan_content(
    content: bytes,
    *,
    filename: Optional[str] = None,
    document_id: Optional[str] = None,
    request_id: Optional[str] = None,
) -> AVScanResult:
    """Escanea `content`, audita el resultado y lo devuelve."""
    provider = cfg.AV_PROVIDER or "clamav"
    runner = _PROVIDERS.get(provider, _scan_clamav)
    result: Optional[AVScanResult] = None
    try:
        result = runner(content)
    except Exception as exc:
        result = AVScanResult(
            provider=provider, clean=False, error=str(exc), duration_ms=0
        )
        logger.warning("AV scan failed via '%s': %s", provider, exc)
    _audit(
        result,
        document_id=document_id,
        filename=filename,
        file_size=len(content) if content else 0,
        request_id=request_id,
    )
    return result