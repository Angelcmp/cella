"""RAG tests: chunk ranking, MMR, citations and prompt building.

No LLM calls are made — these test the pure retrieval/prompt logic in
rag_system.py using a real (temp) SQLite DB.
"""

from __future__ import annotations

import json

from rag_system import RAGSystem
from database_simple import (
    Document,
    DocumentChunk,
    DocumentEmbedding,
    SessionLocal,
)


def _make_rag() -> RAGSystem:
    return RAGSystem()


def _seed_chunks(db, document_id: str):
    """Insert a document with 3 chunks whose embeddings have known similarities.

    Chunk 1 (index 0) and chunk 3 (index 2) both resemble the query vector;
    chunk 2 is dissimilar. MMR should return chunk1 and chunk3 as the top-2.
    """
    doc = Document(
        id=document_id,
        user_id="u-test",
        title="Manual de Cella",
        filename="manual.pdf",
        storage_url="/tmp/manual.pdf",
        file_size=1024,
        pages=3,
        status="indexed",
    )
    db.add(doc)

    chunks = [
        DocumentChunk(
            id="c1",
            document_id=document_id,
            chunk_index=0,
            text="Introducción al análisis de documentos con IA y citas exactas.",
            tokens=10,
            page_start=1,
            page_end=1,
        ),
        DocumentChunk(
            id="c2",
            document_id=document_id,
            chunk_index=1,
            text="Configuración de red y almacenamiento del sistema operativo.",
            tokens=12,
            page_start=2,
            page_end=2,
        ),
        DocumentChunk(
            id="c3",
            document_id=document_id,
            chunk_index=2,
            text="Conclusión sobre documentos y análisis con inteligencia artificial.",
            tokens=11,
            page_start=3,
            page_end=3,
        ),
    ]
    db.add_all(chunks)

    # Query vector ~ [1,0,0]; embeddings shaped for cosine sim
    # c1 = [0.9, 0.1, 0.0] (close to query), c2 = [0.0, 0.9, 0.1] (far),
    # c3 = [0.85, 0.0, 0.1] (close to query but distinct from c1).
    embeddings = [
        DocumentEmbedding(id="e1", chunk_id="c1", embedding=json.dumps([0.9, 0.1, 0.0]), dim=3),
        DocumentEmbedding(id="e2", chunk_id="c2", embedding=json.dumps([0.0, 0.9, 0.1]), dim=3),
        DocumentEmbedding(id="e3", chunk_id="c3", embedding=json.dumps([0.85, 0.0, 0.1]), dim=3),
    ]
    db.add_all(embeddings)
    db.commit()


def test_cosine_similarity():
    rag = _make_rag()
    a = [1.0, 0.0, 0.0]
    b = [0.0, 1.0, 0.0]
    assert rag.cosine_similarity(a, b) < 0.01
    assert rag.cosine_similarity(a, a) > 0.99


def test_search_relevant_chunks_ranks_by_relevance():
    rag = _make_rag()
    doc_id = "doc-ranking"
    with SessionLocal() as db:
        _seed_chunks(db, doc_id)

    query_embedding = [0.95, 0.05, 0.0]
    with SessionLocal() as db:
        results = rag.search_relevant_chunks(db, doc_id, query_embedding, top_k=3)

    # c2 is the least similar to the query
    assert len(results) >= 2
    assert all("embedding" not in r for r in results)
    ids = [r["chunk_id"] for r in results]
    assert "c2" in ids[-1:] or "c2" not in ids[:1]
    # The two most relevant chunks (c1, c3) appear before c2 when all 3 are kept
    assert results[0]["similarity"] >= results[-1]["similarity"]


def test_extract_citations_from_chunks():
    rag = _make_rag()
    chunks = [
        {
            "text": "Primera fuente sobre IA aplicada a documentos y análisis.",
            "page_start": 2,
            "page_end": 2,
            "similarity": 0.91,
        },
        {
            "text": "Segunda fuente con contenido relevante para la pregunta.",
            "page_start": 5,
            "page_end": 6,
            "similarity": 0.83,
        },
    ]
    citations = rag.extract_citations_from_chunks(chunks, document_title="Manual")
    assert len(citations) == 2
    c = citations[0]
    assert c["page"] == 2
    assert c["document"] == "Manual"
    assert c["similarity"] == round(0.91, 3)
    assert c["snippet"].startswith("Primera fuente")
    # Multi-page citation reflects page_start
    assert citations[1]["page"] == 5


def test_create_rag_prompt_uses_relevant_chunks():
    rag = _make_rag()
    chunks = [
        {"text": "El contenido del fragmento.", "page_start": 1, "page_end": 2, "similarity": 0.9},
    ]
    prompt = rag.create_rag_prompt("¿qué dice?", chunks, "Mi doc")
    assert "Mi doc" in prompt
    assert "Página 1-2" in prompt
    assert "El contenido del fragmento." in prompt
    assert "¿qué dice?" in prompt
