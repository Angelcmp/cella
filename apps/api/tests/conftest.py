"""Shared test fixtures for the Cella API.

Imports are done lazily inside fixtures so environment variables can be set
before app modules are imported (config.py reads them at import time).
"""

from __future__ import annotations

import os
import sys
import tempfile

import pytest

# Ensure the API package is importable regardless of CWD
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_API_DIR = os.path.abspath(os.path.join(_THIS_DIR, ".."))
if _API_DIR not in sys.path:
    sys.path.insert(0, _API_DIR)

# Isolated DB for tests
_TMP_DB = os.path.join(tempfile.gettempdir(), "cella_test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["LOCAL_MODE"] = "true"
os.environ["ENABLE_FILE_AV_SCAN"] = "false"
os.environ["RATE_LIMIT_ENABLED"] = "false"

import config as cfg  # noqa: E402
import main as app_main  # noqa: E402
from database_simple import Base, SessionLocal, engine  # noqa: E402


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    with TestClient(app_main.app) as c:
        yield c


@pytest.fixture()
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def _clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
