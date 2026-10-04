"""Embedding storage helpers + pgvector plumbing.

The default (SQLite) path is always exercised. The Postgres/pgvector branch
is opt-in: run a disposable PostgreSQL with the `vector` extension, then

    RUN_PGVECTOR_TESTS=1 \
    DATABASE_URL=postgresql+psycopg://docai:password@localhost:5432/docai \
    pytest tests/test_pgvector.py

Without RUN_PGVECTOR_TESTS=1 those tests are skipped.
"""

from __future__ import annotations

import json
import os

import numpy as np
import pytest
from sqlalchemy import Text

from database_simple import (
    EMBEDDING_DIM,
    IS_POSTGRES,
    DocumentEmbedding,
    embedding_from_db,
    embedding_to_db,
)

_RUN_PGVECTOR = os.getenv("RUN_PGVECTOR_TESTS") == "1"
_pg_only = pytest.mark.skipif(
    not (_RUN_PGVECTOR and IS_POSTGRES),
    reason="set RUN_PGVECTOR_TESTS=1 with DATABASE_URL pointing to PostgreSQL+pgvector",
)


def test_embedding_to_db_sqlite_is_json():
    if IS_POSTGRES:
        pytest.skip("SQLite serialization check")
    payload = embedding_to_db([1, 2.5, 3])
    assert isinstance(payload, str)
    assert json.loads(payload) == [1.0, 2.5, 3.0]


def test_embedding_from_db_roundtrip():
    vec = [0.1, 0.2, 0.3]
    assert embedding_from_db(embedding_to_db(vec)) == vec
    # tuple, numpy array and raw JSON text all normalize to list[float]
    assert embedding_from_db((1, 2)) == [1.0, 2.0]
    assert embedding_from_db(np.array([0.5, 0.25])) == [0.5, 0.25]
    assert embedding_from_db(json.dumps([9, 8])) == [9.0, 8.0]
    assert embedding_from_db(None) is None


def test_embedding_dim_default_matches_local_provider():
    assert EMBEDDING_DIM == int(os.getenv("EMBEDDING_DIM", "384"))


def test_document_embedding_column_is_text_on_sqlite():
    if IS_POSTGRES:
        pytest.skip("SQLite column type check")
    assert isinstance(DocumentEmbedding.__table__.c.embedding.type, Text)


@_pg_only
def test_pgvector_orders_by_cosine_distance():
    """Live probe: the pgvector column supports the cosine operator."""
    from database_simple import Document, DocumentChunk, SessionLocal

    with SessionLocal() as db:
        db.add(
            Document(
                id="doc-pg",
                user_id="u-test",
                title="PG",
                filename="pg.pdf",
                storage_url="/tmp/pg.pdf",
                status="indexed",
            )
        )
        db.add_all(
            [
                DocumentChunk(id="pc1", document_id="doc-pg", chunk_index=0, text="a", page_start=1, page_end=1),
                DocumentChunk(id="pc2", document_id="doc-pg", chunk_index=1, text="b", page_start=1, page_end=1),
            ]
        )
        db.add_all(
            [
                DocumentEmbedding(id="pe1", chunk_id="pc1", embedding=embedding_to_db([1.0, 0.0, 0.0]), dim=3),
                DocumentEmbedding(id="pe2", chunk_id="pc2", embedding=embedding_to_db([0.0, 1.0, 0.0]), dim=3),
            ]
        )
        db.commit()

        nearest = (
            db.query(DocumentEmbedding)
            .order_by(DocumentEmbedding.embedding.cosine_distance([1.0, 0.0, 0.0]))
            .first()
        )
        assert nearest.chunk_id == "pc1"
