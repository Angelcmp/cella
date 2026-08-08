#!/usr/bin/env python3
"""
RAG (Retrieval-Augmented Generation) system for DocAI
Handles document search and response generation with citations
Supports DeepSeek, Zhipu (GLM) and OpenAI via OpenAI-compatible APIs
"""

import os
import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple, Iterator
import numpy as np
from sqlalchemy.orm import Session

from database_simple import DocumentChunk, DocumentEmbedding, DocumentSummary, Document, DocumentMindmap
from provider_registry import get_router
from cache import RAGCache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RAGSystem:
    """Handles retrieval-augmented generation for document chat"""
    
    def __init__(self):
        self.router = get_router()
        self.cache = RAGCache()
        # Keep a provider readout for compatibility with loggers
        chat_provider = self.router.chat_provider
        embed_provider = self.router.embeddings_provider
        self.provider = chat_provider.name if chat_provider else "mock"
        self.embed_provider = embed_provider.name if embed_provider else "mock"
        logger.info(
            f"RAGSystem initialized: chat_provider={self.provider}, "
            f"embed_provider={self.embed_provider}, cache_enabled={self.cache.enabled}"
        )
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            a = np.array(vec1)
            b = np.array(vec2)
            return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
        except:
            return 0.0
    
    def generate_query_embedding(
        self,
        query: str,
        document_id: Optional[str] = None,
    ) -> Optional[List[float]]:
        """Generate embedding for user query using the configured embeddings provider.

        If document_id is provided, the embedding is cached in Redis for faster
        repeated queries on the same document.
        """
        if document_id:
            cached = self.cache.get_query_embedding(document_id, query)
            if cached is not None:
                logger.info("Using cached query embedding")
                return cached

        try:
            embedding = self.router.embed(query)
            if document_id and embedding:
                self.cache.set_query_embedding(document_id, query, embedding)
            return embedding
        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            # Fallback to mock embedding matching the configured dimension
            dim = self.router.get_embed_dim() if self.router.embeddings_provider else 1024
            return [0.1] * dim
    
    def search_relevant_chunks(
        self, 
        db: Session, 
        document_id: str, 
        query_embedding: List[float], 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for most relevant chunks using cosine similarity + MMR re-ranking.
        - Computes similarity(query, chunk)
        - Applies Maximal Marginal Relevance to improve diversity and reduce redundancy
        """
        try:
            # Get all chunks for the document with their embeddings
            chunks_with_embeddings = db.query(DocumentChunk, DocumentEmbedding).join(
                DocumentEmbedding, DocumentChunk.id == DocumentEmbedding.chunk_id
            ).filter(DocumentChunk.document_id == document_id).all()
            
            if not chunks_with_embeddings:
                logger.warning(f"No chunks found for document {document_id}")
                return []
            
            # Calculate similarities and keep embeddings for MMR
            chunk_candidates = []
            for chunk, embedding in chunks_with_embeddings:
                try:
                    # Parse embedding JSON
                    chunk_embedding = json.loads(embedding.embedding)
                    similarity = self.cosine_similarity(query_embedding, chunk_embedding)

                    chunk_candidates.append({
                        "chunk": chunk,
                        "similarity": similarity,
                        "chunk_id": chunk.id,
                        "text": chunk.text,
                        "page_start": chunk.page_start,
                        "page_end": chunk.page_end,
                        "tokens": chunk.tokens,
                        "embedding": chunk_embedding,
                    })
                except Exception as e:
                    logger.warning(f"Failed to process chunk {chunk.id}: {e}")
                    continue

            if not chunk_candidates:
                return []

            # Sort candidates by similarity desc as a starting point
            chunk_candidates.sort(key=lambda x: x["similarity"], reverse=True)

            # Apply MMR selection
            lambda_param = float(os.getenv("RAG_MMR_LAMBDA", "0.7"))
            selected: List[Dict[str, Any]] = []
            remaining = chunk_candidates.copy()

            def emb_sim(a: List[float], b: List[float]) -> float:
                try:
                    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
                except Exception:
                    return 0.0

            while remaining and len(selected) < top_k:
                best_item = None
                best_score = -1e9
                for cand in remaining:
                    # Diversity term: max similarity with already selected
                    if selected:
                        max_div = max(emb_sim(cand["embedding"], s["embedding"]) for s in selected)
                    else:
                        max_div = 0.0
                    mmr_score = lambda_param * cand["similarity"] - (1 - lambda_param) * max_div
                    if mmr_score > best_score:
                        best_score = mmr_score
                        best_item = cand
                if best_item is None:
                    break
                selected.append(best_item)
                remaining.remove(best_item)

            logger.info(f"Found {len(chunk_candidates)} chunks, returning MMR top {len(selected)}")
            # Remove embeddings from output
            for s in selected:
                s.pop("embedding", None)
            return selected
            
        except Exception as e:
            logger.error(f"Failed to search chunks: {e}")
            return []
    
    def create_rag_prompt(self, query: str, relevant_chunks: List[Dict[str, Any]], document_title: str) -> str:
        """Create a prompt for the LLM with context from relevant chunks"""
        
        # Build context from chunks
        context_parts = []
        for i, chunk_data in enumerate(relevant_chunks):
            page_info = f"Página {chunk_data['page_start']}"
            if chunk_data['page_end'] != chunk_data['page_start']:
                page_info += f"-{chunk_data['page_end']}"
            
            context_parts.append(f"[Fragmento {i+1} - {page_info}]\n{chunk_data['text']}\n")
        
        context = "\n".join(context_parts)
        
        prompt = f"""Eres un asistente de IA experto en análisis de documentos. Responde sobre el documento "{document_title}" basándote ÚNICAMENTE en la información de los fragmentos.

INSTRUCCIONES IMPORTANTES:
1. Responde SOLO con información que aparece en los fragmentos proporcionados.
2. Si no hay información suficiente, responde: "No hay suficiente información en los fragmentos para responder con certeza." y sugiere qué buscar.
3. Incluye citas indicando la página exacta en cada idea importante.
4. Tono profesional y conciso.
5. No inventes ni extrapoles más allá de los fragmentos.
6. FORMATO: párrafos separados por \n\n. Al final, incluye una sección "Citas" con el formato: [Página X]: breve extracto.

FRAGMENTOS DEL DOCUMENTO:
{context}

PREGUNTA DEL USUARIO: {query}

RESPUESTA:"""

        return prompt

    def _anchor_sentences_to_chunks(self, text: str, chunks: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], float]:
        """Anchor each sentence in the response to the most similar chunk by n-gram overlap.
        Returns (citations, anchored_ratio).
        """
        import re
        sentences = [s.strip() for s in re.split(r"(?<=[\.!?])\s+", text) if s.strip()]
        if not sentences:
            return [], 0.0

        def ngrams(s: str, n: int = 3) -> set:
            tokens = re.findall(r"\w+", s.lower())
            return set(tuple(tokens[i:i+n]) for i in range(max(len(tokens)-n+1, 1)))

        chunk_ngrams = []
        for ch in chunks:
            chunk_ngrams.append((ch, ngrams(ch["text"])) )

        anchored = 0
        used = []
        for sent in sentences:
            sng = ngrams(sent)
            best = None
            best_score = 0.0
            for ch, cng in chunk_ngrams:
                if not cng:
                    continue
                inter = len(sng & cng)
                union = len(sng | cng)
                score = inter / union if union else 0.0
                if score > best_score:
                    best_score = score
                    best = ch
            if best and best_score >= float(os.getenv("RAG_SENTENCE_ANCHOR_MIN_JACCARD", "0.05")):
                anchored += 1
                used.append({
                    "page": best["page_start"],
                    "snippet": best["text"][:150] + ("..." if len(best["text"])>150 else ""),
                    "similarity": round(best.get("similarity", 0.0), 3)
                })

        anchored_ratio = anchored / max(len(sentences), 1)
        # Deduplicate by page/snippet
        dedup = []
        seen = set()
        for u in used:
            key = (u["page"], u["snippet"][:50])
            if key in seen:
                continue
            seen.add(key)
            dedup.append(u)
        return dedup, anchored_ratio
    
    def generate_response(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.3,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Generate response using configured AI provider.

        Args:
            prompt: The full prompt to send.
            model: Optional model id from the frontend (e.g. deepseek-v4-flash).
            max_tokens: Maximum tokens to generate.
            temperature: Sampling temperature.
        """
        try:
            text, _ = self.router.chat(
                prompt,
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return text, []
        except Exception as e:
            logger.error(f"Failed to generate chat response: {e}")
            return f"Lo siento, ocurrió un error al generar la respuesta: {str(e)}", []
    
    def extract_citations_from_chunks(
        self,
        relevant_chunks: List[Dict[str, Any]],
        document_title: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Extract citation information from relevant chunks"""
        citations = []
        
        for chunk_data in relevant_chunks:
            # Create a snippet (first 150 characters)
            snippet = chunk_data["text"][:150]
            if len(chunk_data["text"]) > 150:
                snippet += "..."
            
            citation = {
                "page": chunk_data["page_start"],
                "snippet": snippet,
                "similarity": round(chunk_data["similarity"], 3)
            }
            doc_title = chunk_data.get("document_title") or document_title
            if doc_title:
                citation["document"] = doc_title
            
            citations.append(citation)
        
        return citations
    
    def is_metadata_question(self, query: str) -> bool:
        """Check if the query is asking about global document metadata (counts/length),
        not page-specific content. Be conservative to avoid false positives.
        """
        q = query.lower().strip()
        # If the user refers to a specific page or range, it's NOT metadata
        import re
        page_ref_patterns = [
            r"p[aá]gina\s*\d+",   # página 2
            r"p[aá]g\.?\s*\d+",  # pág. 2
            r"p[aá]ginas?\s*\d+\s*(?:a|–|-|al)\s*\d+",  # páginas 2-3
        ]
        for pat in page_ref_patterns:
            if re.search(pat, q):
                return False

        # Detect only explicit questions about counts/length
        explicit_meta = [
            'cuántas páginas', 'cuantas paginas',
            'número de páginas', 'numero de paginas',
            'total de páginas', 'total de paginas',
            'cuál es la longitud', 'cual es la longitud',
            'tamaño del documento', 'tamano del documento',
            'extensión del documento', 'extension del documento',
        ]
        return any(k in q for k in explicit_meta)

    def parse_page_request(self, query: str) -> Optional[Tuple[int, int]]:
        """Detect explicit requests for specific page or page ranges.
        Returns (start_page, end_page) if found, else None.
        Examples: "¿Qué dice la página 2?", "contenido de páginas 3-4", "pág. 10 a 12".
        """
        import re
        q = query.lower().strip()
        # Normalize separators
        q = q.replace("–", "-").replace("—", "-")
        # Patterns for single page and ranges
        patterns = [
            r"p[aá]g(?:ina|\.|)\s*(\d+)\s*(?:a|al|-)\s*(\d+)",  # página 2-3 / pág. 2 a 3
            r"p[aá]ginas?\s*(\d+)\s*(?:a|al|-)\s*(\d+)",        # paginas 2-3
            r"p[aá]g(?:ina|\.|)\s*(\d+)",                        # página 2 / pág. 2
            r"p[aá]ginas?\s*(\d+)",                               # paginas 2
        ]
        for pat in patterns:
            m = re.search(pat, q)
            if m:
                if len(m.groups()) == 2:
                    try:
                        a = int(m.group(1)); b = int(m.group(2))
                        if a > 0 and b > 0:
                            return (min(a, b), max(a, b))
                    except ValueError:
                        return None
                elif len(m.groups()) == 1:
                    try:
                        p = int(m.group(1))
                        if p > 0:
                            return (p, p)
                    except ValueError:
                        return None
        return None

    def get_chunks_for_pages(
        self,
        db: Session,
        document_id: str,
        start_page: int,
        end_page: int,
    ) -> List[Dict[str, Any]]:
        """Retrieve chunks that overlap with the given page interval, ordered by chunk_index.
        Returns list compatible with create_rag_prompt and extract_citations_from_chunks.
        """
        try:
            chunks = db.query(DocumentChunk).filter(
                DocumentChunk.document_id == document_id,
                DocumentChunk.page_start <= end_page,
                DocumentChunk.page_end >= start_page,
            ).order_by(DocumentChunk.chunk_index).all()
            results: List[Dict[str, Any]] = []
            for ch in chunks:
                results.append({
                    "text": ch.text or "",
                    "page_start": ch.page_start,
                    "page_end": ch.page_end,
                    "similarity": 1.0,
                })
            return results
        except Exception as e:
            logger.error(f"Error fetching chunks for pages {start_page}-{end_page}: {e}")
            return []

    def get_document_metadata(self, db: Session, document_id: str) -> Dict[str, Any]:
        """Get comprehensive document metadata"""
        try:
            # Get document info
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                return {}
            
            # Count total chunks and get page info
            from sqlalchemy import func
            chunks_info = db.query(
                func.count(DocumentChunk.id).label('total_chunks'),
                func.min(DocumentChunk.page_start).label('first_page'),
                func.max(DocumentChunk.page_end).label('last_page'),
                func.count(func.distinct(DocumentChunk.page_start)).label('unique_pages')
            ).filter(DocumentChunk.document_id == document_id).first()
            
            return {
                'title': document.title,
                'total_chunks': chunks_info.total_chunks if chunks_info else 0,
                'first_page': chunks_info.first_page if chunks_info else 0,
                'last_page': chunks_info.last_page if chunks_info else 0,
                'total_pages': chunks_info.unique_pages if chunks_info else 0,
                'status': document.status
            }
        except Exception as e:
            logger.error(f"Error getting document metadata: {e}")
            return {}

    def chat_with_document(
        self,
        db: Session,
        document_id: str,
        document_title: str,
        user_query: str,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Complete RAG pipeline for document chat"""

        logger.info(f"Starting chat with document {document_id}")
        logger.info(f"User query: {user_query}")

        try:
            # Check cache for repeated queries
            cached = self.cache.get_chat_response(document_id, user_query, model)
            if cached:
                logger.info("Using cached chat response")
                return cached

            # Check if this is a metadata question
            # First, see if the question targets specific page(s)
            page_req = self.parse_page_request(user_query)
            if page_req:
                start_p, end_p = page_req
                logger.info(f"Detected page-specific question for pages {start_p}-{end_p}")
                page_chunks = self.get_chunks_for_pages(db, document_id, start_p, end_p)
                if not page_chunks:
                    return {
                        "response": f"No encontré contenido para las páginas {start_p}-{end_p}. Verifica el rango y vuelve a intentar.",
                        "citations": [],
                        "success": True,
                        "chunks_found": 0,
                    }
                prompt = self.create_rag_prompt(
                    query=f"Limítate a responder usando únicamente el contenido de las páginas {start_p}-{end_p}. {user_query}",
                    relevant_chunks=page_chunks,
                    document_title=document_title,
                )
                ai_text, _ = self.generate_response(prompt, model=model)
                citations = self.extract_citations_from_chunks(page_chunks, document_title)
                return {
                    "response": ai_text,
                    "citations": citations,
                    "success": True,
                    "chunks_found": len(page_chunks),
                }

            if self.is_metadata_question(user_query):
                logger.info("Detected metadata question, providing comprehensive document info")
                metadata = self.get_document_metadata(db, document_id)
                
                if metadata and metadata.get('total_pages', 0) > 0:
                    response = f"""Basándome en el análisis completo del documento "{document_title}":

**Información del documento:**
- **Total de páginas:** {metadata['total_pages']} páginas
- **Rango de páginas:** De la página {metadata['first_page']} a la página {metadata['last_page']}
- **Fragmentos procesados:** {metadata['total_chunks']} fragmentos de texto
- **Estado del procesamiento:** {metadata['status']}

El documento ha sido completamente procesado y indexado. Todas las páginas están disponibles para consultas y análisis."""
                    
                    # Create citations showing the page range
                    citations = [
                        {
                            "page": metadata['first_page'],
                            "snippet": f"Primera página del documento: página {metadata['first_page']}",
                            "similarity": 1.0
                        },
                        {
                            "page": metadata['last_page'],
                            "snippet": f"Última página del documento: página {metadata['last_page']}",
                            "similarity": 1.0
                        }
                    ]
                    
                    return {
                        "response": response,
                        "citations": citations,
                        "success": True,
                        "chunks_found": metadata['total_chunks']
                    }
            
            # Step 1: Generate query embedding
            query_embedding = self.generate_query_embedding(user_query, document_id)
            if not query_embedding:
                raise ValueError("Failed to generate query embedding")

            # Step 2: Search for relevant chunks - increase top_k for better coverage
            top_k = 10 if len(user_query.split()) > 5 else 5  # More chunks for complex queries
            relevant_chunks = self.search_relevant_chunks(
                db, document_id, query_embedding, top_k=top_k
            )
            
            if not relevant_chunks:
                return {
                    "response": "Lo siento, no encontré información relevante en el documento para responder tu pregunta. Intenta reformular la pregunta o verifica que el documento contenga información relacionada con tu consulta.",
                    "citations": [],
                    "success": True,
                    "confidence": 0.0
                }

            # Compute simple coverage score (mean of top-3 similarities)
            sims = [c.get("similarity", 0.0) for c in relevant_chunks]
            sims_top = sims[: min(3, len(sims))]
            coverage = float(sum(sims_top) / max(len(sims_top), 1))
            min_cov = float(os.getenv("RAG_MIN_COVERAGE", "0.22"))

            # Step 3: Create prompt with context
            prompt = self.create_rag_prompt(user_query, relevant_chunks, document_title)
            
            # Step 4: Generate response (or abstain if coverage is too low)
            if coverage < min_cov:
                safe_msg = (
                    "No hay suficiente información en los fragmentos recuperados para responder con certeza. "
                    "Prueba hacer una pregunta más específica (por ejemplo, mencionando una página o sección), "
                    "o amplía el contexto subiendo más contenido relacionado."
                )
                citations = self.extract_citations_from_chunks(relevant_chunks[:2], document_title)
                return {
                    "response": safe_msg,
                    "citations": citations,
                    "success": True,
                    "confidence": round(coverage, 3),
                    "chunks_found": len(relevant_chunks)
                }

            # Normal path: ask LLM
            response_text, llm_citations = self.generate_response(prompt, model=model)

            # Step 5: Anchor sentences to retrieved chunks and derive citations
            anchored_citations, anchored_ratio = self._anchor_sentences_to_chunks(response_text, relevant_chunks)
            chunk_citations = anchored_citations or self.extract_citations_from_chunks(relevant_chunks, document_title)

            # Combine citations (prefer LLM citations if available, otherwise use chunk citations)
            final_citations = llm_citations if llm_citations else chunk_citations
            # Stamp document title on every citation for single-doc chat
            for c in final_citations:
                if not c.get("document"):
                    c["document"] = document_title

            logger.info(f"Generated response with {len(final_citations)} citations")

            result = {
                "response": response_text,
                "citations": final_citations,
                "success": True,
                "chunks_found": len(relevant_chunks),
                "confidence": round(0.5 * coverage + 0.5 * anchored_ratio, 3),
                "coverage": round(coverage, 3)
            }
            self.cache.set_chat_response(document_id, user_query, result, model)
            return result

        except Exception as e:
            logger.error(f"Chat failed: {e}")
            return {
                "response": f"Lo siento, ocurrió un error al procesar tu pregunta: {str(e)}",
                "citations": [],
                "success": False,
                "error": str(e)
            }

    def prepare_chat_prompt(
        self,
        db: Session,
        document_id: str,
        document_title: str,
        user_query: str,
    ) -> Dict[str, Any]:
        """Build the RAG prompt and retrieve context for streaming.

        Returns a dict with the keys:
        - prompt: string prompt ready for the LLM
        - relevant_chunks: list of chunk dicts for citations
        - chunks_found: number of chunks retrieved
        - coverage: mean similarity of top-3 chunks
        - metadata_response: optional precomputed response (for metadata questions)
        """
        # Page-specific questions
        page_req = self.parse_page_request(user_query)
        if page_req:
            start_p, end_p = page_req
            page_chunks = self.get_chunks_for_pages(db, document_id, start_p, end_p)
            if not page_chunks:
                return {
                    "prompt": None,
                    "relevant_chunks": [],
                    "chunks_found": 0,
                    "coverage": 0.0,
                    "metadata_response": f"No encontré contenido para las páginas {start_p}-{end_p}. Verifica el rango y vuelve a intentar.",
                }
            prompt = self.create_rag_prompt(
                query=f"Limítate a responder usando únicamente el contenido de las páginas {start_p}-{end_p}. {user_query}",
                relevant_chunks=page_chunks,
                document_title=document_title,
            )
            return {
                "prompt": prompt,
                "relevant_chunks": page_chunks,
                "chunks_found": len(page_chunks),
                "coverage": 1.0,
                "metadata_response": None,
            }

        # Metadata questions
        if self.is_metadata_question(user_query):
            metadata = self.get_document_metadata(db, document_id)
            if metadata and metadata.get("total_pages", 0) > 0:
                response = f"""Basándome en el análisis completo del documento "{document_title}":

**Información del documento:**
- **Total de páginas:** {metadata['total_pages']} páginas
- **Rango de páginas:** De la página {metadata['first_page']} a la página {metadata['last_page']}
- **Fragmentos procesados:** {metadata['total_chunks']} fragmentos de texto
- **Estado del procesamiento:** {metadata['status']}

El documento ha sido completamente procesado e indexado. Todas las páginas están disponibles para consultas y análisis."""
                return {
                    "prompt": None,
                    "relevant_chunks": [
                        {
                            "page": metadata["first_page"],
                            "snippet": f"Primera página del documento: página {metadata['first_page']}",
                            "similarity": 1.0,
                        },
                        {
                            "page": metadata["last_page"],
                            "snippet": f"Última página del documento: página {metadata['last_page']}",
                            "similarity": 1.0,
                        },
                    ],
                    "chunks_found": metadata["total_chunks"],
                    "coverage": 1.0,
                    "metadata_response": response,
                }

        # Normal RAG path
        query_embedding = self.generate_query_embedding(user_query, document_id)
        if not query_embedding:
            raise ValueError("Failed to generate query embedding")

        top_k = 10 if len(user_query.split()) > 5 else 5
        relevant_chunks = self.search_relevant_chunks(
            db, document_id, query_embedding, top_k=top_k
        )

        if not relevant_chunks:
            return {
                "prompt": None,
                "relevant_chunks": [],
                "chunks_found": 0,
                "coverage": 0.0,
                "metadata_response": (
                    "Lo siento, no encontré información relevante en el documento para responder tu pregunta. "
                    "Intenta reformular la pregunta o verifica que el documento contenga información relacionada con tu consulta."
                ),
            }

        sims = [c.get("similarity", 0.0) for c in relevant_chunks]
        sims_top = sims[: min(3, len(sims))]
        coverage = float(sum(sims_top) / max(len(sims_top), 1))
        min_cov = float(os.getenv("RAG_MIN_COVERAGE", "0.22"))

        if coverage < min_cov:
            safe_msg = (
                "No hay suficiente información en los fragmentos recuperados para responder con certeza. "
                "Prueba hacer una pregunta más específica (por ejemplo, mencionando una página o sección), "
                "o amplía el contexto subiendo más contenido relacionado."
            )
            return {
                "prompt": None,
                "relevant_chunks": relevant_chunks[:2],
                "chunks_found": len(relevant_chunks),
                "coverage": coverage,
                "metadata_response": safe_msg,
            }

        prompt = self.create_rag_prompt(user_query, relevant_chunks, document_title)
        return {
            "prompt": prompt,
            "relevant_chunks": relevant_chunks,
            "chunks_found": len(relevant_chunks),
            "coverage": coverage,
            "metadata_response": None,
        }

    # ------------------------------------------------------------------
    # Multi-document retrieval & chat
    # ------------------------------------------------------------------

    def _retrieve_multi(
        self,
        db: Session,
        document_ids: List[str],
        document_titles: Dict[str, str],
        user_query: str,
        top_k_per_doc: int = 4,
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant chunks across multiple documents, tagging source info."""
        all_chunks: List[Dict[str, Any]] = []
        for doc_id in document_ids:
            qemb = self.generate_query_embedding(user_query, doc_id)
            if not qemb:
                continue
            chunks = self.search_relevant_chunks(db, doc_id, qemb, top_k=top_k_per_doc)
            for c in chunks:
                c["document_id"] = doc_id
                c["document_title"] = document_titles.get(doc_id, "Documento")
            all_chunks.extend(chunks)
        # Global relevance ordering (MMR already applied per document)
        all_chunks.sort(key=lambda x: x.get("similarity", 0.0), reverse=True)
        return all_chunks

    def create_multi_rag_prompt(self, query: str, relevant_chunks: List[Dict[str, Any]]) -> str:
        """Create a RAG prompt for context spanning multiple documents."""
        context_parts = []
        for i, chunk_data in enumerate(relevant_chunks):
            page_info = f"Página {chunk_data['page_start']}"
            if chunk_data['page_end'] != chunk_data['page_start']:
                page_info += f"-{chunk_data['page_end']}"
            title = chunk_data.get("document_title", "Documento")
            context_parts.append(f"[Fragmento {i+1} - {title} - {page_info}]\n{chunk_data['text']}\n")
        context = "\n".join(context_parts)

        return f"""Eres un asistente de IA experto en análisis de documentos. Responde basándote ÚNICAMENTE en la información de los fragmentos, que provienen de varios documentos.

INSTRUCCIONES IMPORTANTES:
1. Responde SOLO con información que aparece en los fragmentos proporcionados.
2. Cuando uses información de un documento concreto, indica su título entre paréntesis.
3. Si no hay información suficiente, responde: "No hay suficiente información en los fragmentos para responder con certeza." y sugiere qué buscar.
4. Incluye citas indicando la página exacta en cada idea importante.
5. Tono profesional y conciso.
6. No inventes ni extrapoles más allá de los fragmentos.
7. FORMATO: párrafos separados por \n\n. Al final, incluye una sección "Citas" con el formato: [Documento, Página X]: breve extracto.

FRAGMENTOS DE LOS DOCUMENTOS:
{context}

PREGUNTA DEL USUARIO: {query}

RESPUESTA:"""

    def prepare_multi_chat_prompt(
        self,
        db: Session,
        document_ids: List[str],
        document_titles: Dict[str, str],
        user_query: str,
    ) -> Dict[str, Any]:
        """Build a RAG prompt across multiple documents for streaming chat."""
        relevant_chunks = self._retrieve_multi(db, document_ids, document_titles, user_query)
        if not relevant_chunks:
            return {
                "prompt": None,
                "relevant_chunks": [],
                "chunks_found": 0,
                "coverage": 0.0,
                "metadata_response": (
                    "Lo siento, no encontré información relevante en los documentos para responder tu pregunta. "
                    "Intenta reformular la pregunta o verifica que los documentos contengan información relacionada con tu consulta."
                ),
            }

        sims = [c.get("similarity", 0.0) for c in relevant_chunks]
        sims_top = sims[: min(3, len(sims))]
        coverage = float(sum(sims_top) / max(len(sims_top), 1))
        min_cov = float(os.getenv("RAG_MIN_COVERAGE", "0.22"))

        if coverage < min_cov:
            safe_msg = (
                "No hay suficiente información en los fragmentos recuperados para responder con certeza. "
                "Prueba hacer una pregunta más específica, o amplía el contexto añadiendo más documentos."
            )
            return {
                "prompt": None,
                "relevant_chunks": relevant_chunks[:3],
                "chunks_found": len(relevant_chunks),
                "coverage": coverage,
                "metadata_response": safe_msg,
            }

        prompt = self.create_multi_rag_prompt(user_query, relevant_chunks)
        return {
            "prompt": prompt,
            "relevant_chunks": relevant_chunks,
            "chunks_found": len(relevant_chunks),
            "coverage": coverage,
            "metadata_response": None,
        }

    def chat_with_documents(
        self,
        db: Session,
        document_ids: List[str],
        document_titles: Dict[str, str],
        user_query: str,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Complete non-streaming RAG pipeline across multiple documents."""
        try:
            relevant_chunks = self._retrieve_multi(db, document_ids, document_titles, user_query)
            if not relevant_chunks:
                return {
                    "response": "Lo siento, no encontré información relevante en los documentos para responder tu pregunta. Intenta reformular la pregunta o verifica que los documentos contengan información relacionada con tu consulta.",
                    "citations": [],
                    "success": True,
                    "confidence": 0.0,
                }

            sims = [c.get("similarity", 0.0) for c in relevant_chunks]
            sims_top = sims[: min(3, len(sims))]
            coverage = float(sum(sims_top) / max(len(sims_top), 1))
            min_cov = float(os.getenv("RAG_MIN_COVERAGE", "0.22"))

            if coverage < min_cov:
                safe_msg = (
                    "No hay suficiente información en los fragmentos recuperados para responder con certeza. "
                    "Prueba hacer una pregunta más específica, o amplía el contexto añadiendo más documentos."
                )
                citations = self.extract_citations_from_chunks(relevant_chunks[:3])
                return {
                    "response": safe_msg,
                    "citations": citations,
                    "success": True,
                    "confidence": round(coverage, 3),
                    "chunks_found": len(relevant_chunks),
                }

            prompt = self.create_multi_rag_prompt(user_query, relevant_chunks)
            response_text, _ = self.generate_response(prompt, model=model)
            citations = self.extract_citations_from_chunks(relevant_chunks)

            return {
                "response": response_text,
                "citations": citations,
                "success": True,
                "chunks_found": len(relevant_chunks),
                "confidence": round(coverage, 3),
                "coverage": round(coverage, 3),
            }
        except Exception as e:
            logger.error(f"Multi-doc chat failed: {e}")
            return {
                "response": f"Lo siento, ocurrió un error al procesar tu pregunta: {str(e)}",
                "citations": [],
                "success": False,
                "error": str(e),
            }

    def chat_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.3,
    ) -> Iterator[Tuple[str, str]]:
        """Stream a chat response from the configured LLM.

        Yields (kind, text) tuples where kind is "thinking" (reasoning content,
        if the model exposes it) or "text" (final answer).
        """
        yield from self.router.chat_stream(
            prompt,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )


class SummaryGenerator:
    """Handles automatic document summarization using the configured LLM provider"""

    def __init__(self):
        self.router = get_router()
        logger.info("SummaryGenerator initialized")
    
    def create_summary_prompt(self, document_title: str, full_content: str, summary_type: str = "comprehensive") -> str:
        """Create a prompt for document summarization"""
        
        if summary_type == "comprehensive":
            prompt = f"""Eres un asistente experto en análisis y resumen de documentos. Tu tarea es generar un resumen estructurado y completo del siguiente documento.

DOCUMENTO: "{document_title}"

CONTENIDO DEL DOCUMENTO:
{full_content}

INSTRUCCIONES:
1. Genera un resumen ejecutivo de 2-3 párrafos que capture la esencia del documento
2. Identifica entre 5-8 puntos clave principales del documento
3. Determina los 3-5 temas centrales más importantes
4. Mantén un tono profesional y objetivo
5. Asegúrate de que el resumen sea comprensible sin leer el documento original

FORMATO DE RESPUESTA (JSON):
{{
    "executive_summary": "Resumen ejecutivo del documento en 2-3 párrafos...",
    "key_points": [
        "Primer punto clave identificado",
        "Segundo punto clave identificado",
        "Tercer punto clave identificado"
    ],
    "main_topics": [
        "Primer tema principal",
        "Segundo tema principal",
        "Tercer tema principal"
    ]
}}

IMPORTANTE: Responde únicamente con el JSON válido, sin texto adicional antes o después."""

        elif summary_type == "brief":
            prompt = f"""Genera un resumen breve del documento "{document_title}".

CONTENIDO:
{full_content}

Crea un resumen de 1 párrafo y 3-4 puntos clave principales.

FORMATO JSON:
{{
    "executive_summary": "Resumen breve de 1 párrafo...",
    "key_points": ["Punto 1", "Punto 2", "Punto 3"],
    "main_topics": ["Tema 1", "Tema 2"]
}}

Responde solo con JSON válido."""

        return prompt
    
    def _extract_json(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Try to parse JSON from an LLM response, cleaning fenced blocks if needed.

        Falls back to extracting a structured summary from plain text if no JSON
        is found.
        """
        response_text = response_text.strip()
        logger.info(f"Summary raw response (first 500 chars): {response_text[:500]!r}")

        # 1. Strip fenced ```json ... ``` blocks
        cleaned = response_text
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # 2. Try to parse the whole response
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # 3. Try to extract the first JSON object
        start = cleaned.find('{')
        end = cleaned.rfind('}') + 1
        if start != -1 and end != 0:
            try:
                return json.loads(cleaned[start:end])
            except Exception:
                pass

        # 4. Fallback: parse plain text into structured summary
        return self._parse_text_summary(response_text)

    def _parse_text_summary(self, text: str) -> Optional[Dict[str, Any]]:
        """Convert a plain text summary into the expected JSON structure."""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if not lines:
            return None

        # First paragraph(s) as executive summary
        executive_summary_lines = []
        for line in lines:
            if line.startswith('-') or line.startswith('*') or line.startswith('•') or line.startswith('1.') or line.startswith('2.') or 'Tema:' in line or 'Punto clave:' in line:
                break
            executive_summary_lines.append(line)
        executive_summary = ' '.join(executive_summary_lines) if executive_summary_lines else lines[0]

        # Extract bullet points as key_points
        key_points = [line.lstrip('-*•').strip() for line in lines if line.startswith('-') or line.startswith('*') or line.startswith('•')]
        if not key_points and len(lines) > 1:
            key_points = [line for line in lines[1:] if len(line) > 20 and not line.lower().startswith('resumen')]
        key_points = key_points[:8]

        # Infer topics from key_points or from lines containing 'Tema:' or numbered lists
        main_topics = []
        for line in lines:
            if line.startswith('1.') or line.startswith('2.') or line.startswith('3.') or line.startswith('4.') or line.startswith('5.'):
                main_topics.append(line.split('.', 1)[-1].strip())
        if not main_topics and key_points:
            main_topics = [kp.split(':', 1)[0].strip() for kp in key_points if ':' in kp][:5]
        if not main_topics:
            main_topics = [lines[0][:60]]
        main_topics = main_topics[:5]

        return {
            "executive_summary": executive_summary,
            "key_points": key_points,
            "main_topics": main_topics,
        }

    def generate_summary_with_llm(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Generate summary using the configured LLM provider"""
        try:
            text, _ = self.router.chat(
                prompt,
                temperature=0.3,
                max_tokens=1000,
            )
            summary_data = self._extract_json(text)
            if summary_data:
                logger.info("Successfully generated summary")
                return summary_data
            logger.warning("Summary response did not contain valid JSON")
            return None
        except Exception as e:
            logger.error(f"Failed to generate summary with LLM: {e}")
            return None
    
    def get_document_full_content(self, db: Session, document_id: str) -> Optional[str]:
        """Get complete document content from all chunks"""
        try:
            chunks = db.query(DocumentChunk).filter(
                DocumentChunk.document_id == document_id
            ).order_by(DocumentChunk.chunk_index).all()
            
            if not chunks:
                logger.warning(f"No chunks found for document {document_id}")
                return None
            
            # Combine all chunks into full content
            full_content = "\n\n".join([chunk.text for chunk in chunks])
            logger.info(f"Retrieved {len(chunks)} chunks for document {document_id}")
            return full_content
            
        except Exception as e:
            logger.error(f"Failed to get document content: {e}")
            return None
    
    def generate_document_summary(
        self, 
        db: Session, 
        document_id: str, 
        summary_type: str = "comprehensive"
    ) -> Dict[str, Any]:
        """Generate complete summary for a document"""
        
        logger.info(f"Starting summary generation for document {document_id}")
        
        try:
            # Get document info
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError(f"Document {document_id} not found")
            
            # Check if summary already exists
            existing_summary = db.query(DocumentSummary).filter(
                DocumentSummary.document_id == document_id
            ).first()
            
            if existing_summary:
                logger.info(f"Summary already exists for document {document_id}")
                return {
                    "summary_id": existing_summary.id,
                    "summary": existing_summary.executive_summary,
                    "executive_summary": existing_summary.executive_summary,
                    "key_points": existing_summary.key_points,
                    "keyPoints": existing_summary.key_points,
                    "main_topics": existing_summary.main_topics,
                    "topics": existing_summary.main_topics,
                    "generatedAt": existing_summary.created_at.isoformat(),
                    "created_at": existing_summary.created_at.isoformat(),
                    "success": True,
                    "was_existing": True
                }
            
            # Get full document content
            full_content = self.get_document_full_content(db, document_id)
            if not full_content:
                raise ValueError("Could not retrieve document content")
            
            # Estimate tokens (rough estimation: 1 token ≈ 4 chars)
            estimated_tokens = len(full_content) // 4
            logger.info(f"Document content length: {len(full_content)} chars (~{estimated_tokens} tokens)")
            
            # Create summary prompt
            prompt = self.create_summary_prompt(document.title, full_content, summary_type)
            
            # Generate summary using configured LLM
            summary_data = self.generate_summary_with_llm(prompt)
            if not summary_data:
                raise ValueError("Failed to generate summary with LLM")
            
            # Save summary to database
            new_summary = DocumentSummary(
                document_id=document_id,
                executive_summary=summary_data["executive_summary"],
                key_points=summary_data["key_points"],
                main_topics=summary_data["main_topics"],
                summary_length=summary_type,
                tokens_used=estimated_tokens
            )
            
            db.add(new_summary)
            db.commit()
            db.refresh(new_summary)
            
            logger.info(f"Summary successfully saved for document {document_id}")
            
            return {
                "summary_id": new_summary.id,
                "summary": new_summary.executive_summary,
                "executive_summary": new_summary.executive_summary,
                "key_points": new_summary.key_points,
                "keyPoints": new_summary.key_points,
                "main_topics": new_summary.main_topics,
                "topics": new_summary.main_topics,
                "generatedAt": new_summary.created_at.isoformat(),
                "created_at": new_summary.created_at.isoformat(),
                "tokens_used": new_summary.tokens_used,
                "success": True,
                "was_existing": False
            }
            
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_document_summary(self, db: Session, document_id: str) -> Optional[Dict[str, Any]]:
        """Get existing summary for a document"""
        try:
            summary = db.query(DocumentSummary).filter(
                DocumentSummary.document_id == document_id
            ).first()
            
            if not summary:
                return None
            
            return {
                "summary_id": summary.id,
                "summary": summary.executive_summary,
                "executive_summary": summary.executive_summary,
                "keyPoints": summary.key_points,
                "key_points": summary.key_points,
                "mainTopics": summary.main_topics,
                "main_topics": summary.main_topics,
                "generatedAt": summary.created_at.isoformat(),
                "created_at": summary.created_at.isoformat(),
                "tokens_used": summary.tokens_used
            }
            
        except Exception as e:
            logger.error(f"Failed to get summary: {e}")
            return None


class StudyGuideGenerator:
    """Genera guías de estudio a partir de un documento o rango de páginas usando el LLM configurado"""

    def __init__(self):
        self.router = get_router()
        logger.info("StudyGuideGenerator initialized")

    def _fetch_context(
        self,
        db: Session,
        document_id: str,
        start_page: Optional[int],
        end_page: Optional[int],
        char_limit: int = 12000,
    ) -> Tuple[str, Optional[int], Optional[int]]:
        """Obtiene texto contextual concatenado desde chunks respetando un límite de caracteres.
        Devuelve (contexto, start_page_used, end_page_used).
        """
        try:
            query = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id)
            if start_page is not None and end_page is not None:
                query = query.filter(
                    DocumentChunk.page_start <= end_page,
                    DocumentChunk.page_end >= start_page,
                )

            chunks = query.order_by(DocumentChunk.chunk_index).all()
            if not chunks:
                return "", None, None

            texts = []
            total = 0
            min_p = None
            max_p = None
            for ch in chunks:
                t = (ch.text or "").strip()
                if not t:
                    continue
                if total + len(t) > char_limit:
                    # truncate last piece to fit roughly
                    remaining = max(char_limit - total, 0)
                    if remaining > 0:
                        texts.append(t[:remaining])
                        total += remaining
                    break
                texts.append(t)
                total += len(t)
                min_p = ch.page_start if min_p is None else min(min_p, ch.page_start)
                max_p = ch.page_end if max_p is None else max(max_p, ch.page_end)

            context = "\n\n".join(texts)
            return context, min_p, max_p
        except Exception as e:
            logger.error(f"StudyGuide: error fetching context: {e}")
            return "", None, None

    def _create_prompt(
        self,
        document_title: str,
        context: str,
        pages_used: Optional[Tuple[int, int]],
        user_query: Optional[str],
        output_format: str = "json",
    ) -> str:
        page_hint = (
            f"(Limítate al rango de páginas {pages_used[0]}–{pages_used[1]})"
            if pages_used and pages_used[0] and pages_used[1]
            else "(Limítate estrictamente al contexto proporcionado)"
        )

        focus = f"ENFOQUE: {user_query}\n" if user_query else ""

        if output_format == "markdown":
            # Permitiremos que el modelo devuelva Markdown directo
            fmt_instructions = """FORMATO SALIDA: Markdown estructurado con títulos (##), listas de viñetas y referencias de páginas en cada ítem entre [pág. X–Y]. No añadas texto fuera de la guía."""
        else:
            fmt_instructions = """FORMATO JSON (válido, sin bloque de código):
{
  "title": "Guía de estudio – {titulo}",
  "objectives": ["objetivo 1", "objetivo 2"],
  "key_concepts": [
    {"term": "concepto", "definition": "definición breve", "pages": "X–Y"}
  ],
  "sections": [
    {
      "title": "Sección/tema",
      "summary": "síntesis de 4–6 líneas basada en el contexto",
      "pages": "X–Y",
      "key_points": ["punto 1", "punto 2", "punto 3"],
      "examples": ["ejemplo breve con mención de página"]
    }
  ],
  "checkpoints": ["verifica que puedes…", "explica…"],
  "review_questions": [
    {"question": "pregunta de repaso/desarrollo", "pages": "X–Y"}
  ],
  "estimated_time_minutes": 45
}"""

        prompt = f"""
Eres un asistente experto en elaboración de guías de estudio basadas en documentos.
Trabaja ÚNICAMENTE con el CONTEXTO provisto de "{document_title}" {page_hint}.

{focus}INSTRUCCIONES:
1) No inventes contenidos: si el concepto no está en el contexto, omítelo.
2) Incluye referencia de páginas en cada concepto, sección, ejemplo y pregunta, como rango "X–Y".
3) Redacta de forma clara, didáctica y accionable.
4) Mantén la guía concisa y práctica (2–4 secciones).

CONTEXTO DEL DOCUMENTO:
{context}

{fmt_instructions}

DEVUELVE SOLO EL {('Markdown' if output_format=='markdown' else 'JSON')} SOLICITADO.
"""
        return prompt

    def _call_llm(self, prompt: str) -> Optional[str]:
        try:
            text, _ = self.router.chat(
                prompt,
                temperature=0.3,
                max_tokens=3000,
            )
            return (text or "").strip()
        except Exception as e:
            logger.error(f"StudyGuide: LLM call failed: {e}")
            return None

    @staticmethod
    def _repair_truncated_json(text: str) -> Optional[Dict[str, Any]]:
        """Salvage truncated JSON: close unterminated string/brackets, else longest valid prefix."""
        if not text:
            return None

        stack: List[str] = []
        in_str = False
        esc = False
        for ch in text:
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch in "[{":
                stack.append(ch)
            elif ch in "]}":
                if stack and stack[-1] == ("[" if ch == "]" else "{"):
                    stack.pop()
                else:
                    stack = []
                    break

        suffix = '"' if in_str else ""
        for opener in reversed(stack):
            suffix += "}" if opener == "{" else "]"

        try:
            obj = json.loads(text + suffix)
            return obj if isinstance(obj, dict) else None
        except Exception:
            pass

        # Fall back to the longest valid JSON prefix.
        for cut in range(len(text), 0, -1):
            try:
                obj = json.loads(text[:cut])
                return obj if isinstance(obj, dict) else None
            except Exception:
                continue
        return None

    def _json_to_markdown(self, guide: Dict[str, Any]) -> str:
        parts: List[str] = []
        title = guide.get("title") or "Guía de estudio"
        parts.append(f"## {title}")

        if guide.get("objectives"):
            parts.append("\n### Objetivos")
            for o in guide["objectives"]:
                parts.append(f"- {o}")

        if guide.get("key_concepts"):
            parts.append("\n### Conceptos clave")
            for kc in guide["key_concepts"]:
                term = kc.get("term", "Concepto")
                definition = kc.get("definition", "")
                pages = kc.get("pages", "")
                ext = f" [{pages}]" if pages else ""
                parts.append(f"- {term}: {definition}{ext}")

        if guide.get("sections"):
            parts.append("\n### Secciones")
            for s in guide["sections"]:
                stitle = s.get("title", "Sección")
                pages = s.get("pages", "")
                parts.append(f"- {stitle} {('['+pages+']' if pages else '')}")
                summary = s.get("summary")
                if summary:
                    parts.append(f"  - Síntesis: {summary}")
                kps = s.get("key_points") or []
                if kps:
                    parts.append("  - Puntos clave:")
                    for kp in kps:
                        parts.append(f"    - {kp}")
                exs = s.get("examples") or []
                if exs:
                    parts.append("  - Ejemplos:")
                    for ex in exs:
                        parts.append(f"    - {ex}")

        if guide.get("checkpoints"):
            parts.append("\n### Checkpoints")
            for c in guide["checkpoints"]:
                parts.append(f"- {c}")

        if guide.get("review_questions"):
            parts.append("\n### Preguntas de repaso")
            for q in guide["review_questions"]:
                txt = q.get("question", "Pregunta")
                pages = q.get("pages", "")
                parts.append(f"- {txt} {('['+pages+']' if pages else '')}")

        if guide.get("estimated_time_minutes"):
            parts.append("\n> Tiempo estimado: {} min".format(guide["estimated_time_minutes"]))

        return "\n".join(parts)

    def generate_study_guide(
        self,
        db: Session,
        document_id: str,
        document_title: str,
        start_page: Optional[int] = None,
        end_page: Optional[int] = None,
        user_query: Optional[str] = None,
        output_format: str = "json",
    ) -> Dict[str, Any]:
        try:
            context, min_p, max_p = self._fetch_context(db, document_id, start_page, end_page)
            if not context:
                return {"success": False, "error": "No context available for the requested range"}

            used_range = (min_p, max_p) if (min_p and max_p) else None
            prompt = self._create_prompt(document_title, context, used_range, user_query, output_format)

            resp_text = self._call_llm(prompt)
            if not resp_text:
                # Fallback mock minimal guide
                mock = {
                    "title": f"Guía de estudio – {document_title}",
                    "objectives": ["Comprender los conceptos principales", "Identificar las ideas clave"],
                    "key_concepts": [{"term": "Concepto", "definition": "Definición de ejemplo", "pages": f"{min_p}-{max_p}" if used_range else ""}],
                    "sections": [
                        {
                            "title": "Tema principal",
                            "summary": "Síntesis breve basada en el contexto disponible.",
                            "pages": f"{min_p}-{max_p}" if used_range else "",
                            "key_points": ["Punto 1", "Punto 2"],
                            "examples": ["Ejemplo con referencia de página"]
                        }
                    ],
                    "checkpoints": ["Explica con tus palabras el tema"],
                    "review_questions": [{"question": "¿Cuál es la idea central?", "pages": f"{min_p}-{max_p}" if used_range else ""}],
                    "estimated_time_minutes": 45,
                }
                out = {"success": True, "guide": mock}
                if output_format == "markdown":
                    out["markdown"] = self._json_to_markdown(mock)
                if used_range:
                    out["pages_used"] = {"start": used_range[0], "end": used_range[1]}
                return out

            if output_format == "markdown":
                # Return markdown as-is
                result = {"success": True, "markdown": resp_text}
                if used_range:
                    result["pages_used"] = {"start": used_range[0], "end": used_range[1]}
                return result

            # Expect JSON; clean fenced blocks if present
            text = resp_text
            if text.startswith("```json"):
                text = text.replace("```json", "").replace("```", "").strip()
            try:
                guide = json.loads(text)
            except json.JSONDecodeError:
                guide = self._repair_truncated_json(text)
                if guide is None:
                    raise

            result = {"success": True, "guide": guide}
            if used_range:
                result["pages_used"] = {"start": used_range[0], "end": used_range[1]}
            return result

        except json.JSONDecodeError as e:
            logger.error(f"StudyGuide: JSON parse error: {e}")
            return {"success": False, "error": "LLM did not return valid JSON"}
        except Exception as e:
            logger.error(f"StudyGuide: generation failed: {e}")
            return {"success": False, "error": str(e)}


class MindmapGenerator:
    """Genera mapas mentales (Mermaid) a partir de un documento o rango de páginas usando el LLM configurado"""

    def __init__(self):
        self.router = get_router()
        logger.info("MindmapGenerator initialized")

    def get_document_mindmap(
        self,
        db: Session,
        document_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Return the persisted default mindmap for a document, if it exists."""
        try:
            mindmap = db.query(DocumentMindmap).filter(
                DocumentMindmap.document_id == document_id
            ).first()
            if not mindmap:
                return None
            return {
                "success": True,
                "markdown": mindmap.markdown,
                "metadata": mindmap.mindmap_metadata,
                "pages_used": mindmap.pages_used,
                "was_existing": True,
            }
        except Exception as e:
            logger.error(f"Failed to get mindmap: {e}")
            return None

    def _fetch_context(
        self,
        db: Session,
        document_id: str,
        start_page: Optional[int],
        end_page: Optional[int],
        char_limit: int = 4000,
    ) -> Tuple[str, Optional[int], Optional[int]]:
        try:
            query = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id)
            if start_page is not None and end_page is not None:
                query = query.filter(
                    DocumentChunk.page_start <= end_page,
                    DocumentChunk.page_end >= start_page,
                )
            chunks = query.order_by(DocumentChunk.chunk_index).all()
            if not chunks:
                return "", None, None
            texts = []
            total = 0
            min_p = None
            max_p = None
            for ch in chunks:
                t = (ch.text or "").strip()
                if not t:
                    continue
                if total + len(t) > char_limit:
                    remaining = max(char_limit - total, 0)
                    if remaining > 0:
                        texts.append(t[:remaining])
                        total += remaining
                    break
                texts.append(t)
                total += len(t)
                min_p = ch.page_start if min_p is None else min(min_p, ch.page_start)
                max_p = ch.page_end if max_p is None else max(max_p, ch.page_end)
            return "\n\n".join(texts), min_p, max_p
        except Exception as e:
            logger.error(f"Mindmap: error fetching context: {e}")
            return "", None, None

    def _create_prompt(
        self,
        document_title: str,
        context: str,
        pages_used: Optional[Tuple[int, int]],
        user_query: Optional[str],
        focus_mode: Optional[str] = None,
        detail_level: int = 2,
    ) -> str:
        page_hint = (
            f"(Limítate al rango de páginas {pages_used[0]}–{pages_used[1]})"
            if pages_used and pages_used[0] and pages_used[1]
            else "(Limítate estrictamente al contexto proporcionado)"
        )
        focus = f"ENFOQUE: {user_query}\n" if user_query else ""
        focus_mode_text = ""
        fm = (focus_mode or "").strip().lower()
        if fm in {"definitions", "procesos", "processes", "actors", "timeline"}:
            lookup = {
                "definitions": "definiciones y conceptos",
                "procesos": "procesos y etapas",
                "processes": "procesos y etapas",
                "actors": "actores, roles y relaciones",
                "timeline": "línea de tiempo (eventos/fechas)",
            }
            focus_mode_text = f"Modo de enfoque: {lookup.get(fm, fm)}.\n"
        # Controlar nivel de detalle → límite de nodos aprox.
        try:
            dl = max(1, min(3, int(detail_level)))
        except Exception:
            dl = 2
        max_nodes = {1: 6, 2: 10, 3: 14}[dl]
        # Mermaid mindmap format: https://mermaid.js.org/syntax/mindmap.html
        return f"""
Eres un asistente que elabora mapas mentales en sintaxis Mermaid basados en documentos.
Trabaja ÚNICAMENTE con el CONTEXTO de "{document_title}" {page_hint}.

{focus}{focus_mode_text}INSTRUCCIONES:
- Devuelve SOLO un bloque Markdown con código mermaid, sin texto adicional.
- Usa sintaxis: ```mermaid\nmindmap\n  root) Título\n    :: Rama\n      ::: Subrama\n``` (hasta 3 niveles).
- Máximo {max_nodes} nodos totales. Incluye páginas de sustento entre corchetes en cada rama, ej: Tema [pág. 3–4].
- No inventes nada que no esté en el contexto.
 - Estilo de etiquetas: nombres cortos (3–5 palabras), en Título (Capitalización), sin frases largas ni puntuación innecesaria.
 - Evita duplicados; agrupa ideas relacionadas bajo la misma rama.

CONTEXTO:
{context}

SALIDA (ESCRIBE SOLO EL BLOQUE MERMAID, SIN TEXTO ADICIONAL):"""

    def _call_llm(self, prompt: str) -> Optional[str]:
        try:
            text, _ = self.router.chat(
                prompt,
                temperature=0.2,
                max_tokens=2500,
            )
            text = (text or "").strip()
            if text:
                logger.info(f"Mindmap raw response (first 500 chars): {text[:500]!r}")
            return text if text else None
        except Exception as e:
            logger.error(f"Mindmap: LLM call failed: {e}")
            return None

    def generate_mindmap(
        self,
        db: Session,
        document_id: str,
        document_title: str,
        start_page: Optional[int] = None,
        end_page: Optional[int] = None,
        user_query: Optional[str] = None,
        focus_mode: Optional[str] = None,
        detail_level: int = 2,
    ) -> Dict[str, Any]:
        def _extract_pages(label: str) -> Tuple[Optional[int], Optional[int]]:
            import re
            s = label.lower()
            m = re.search(r"p[aá]g(?:\.|ina|inas)?\s*(\d+)(?:\s*[–\-]\s*(\d+))?", s)
            if not m:
                return None, None
            try:
                a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else None
                if b is not None:
                    return (min(a, b), max(a, b))
                return (a, a)
            except Exception:
                return None, None

        def _strip_pages(label: str) -> str:
            import re
            return re.sub(r"\s*\[?p[aá]g(?:\.|ina|inas)?[^\]]*\]?\s*$", "", label).strip()

        def _parse_nodes_from_mermaid(md: str) -> List[Dict[str, Any]]:
            import re
            # Extract fenced block
            start = md.find("```mermaid"); end = md.find("```", start + 1)
            code = md[start+11:end].strip() if start != -1 and end != -1 else md
            lines = [l.replace('\t','    ') for l in code.splitlines()]
            # Skip 'mindmap' header
            idx = 0
            while idx < len(lines) and not lines[idx].strip(): idx += 1
            if idx < len(lines) and lines[idx].strip().lower().startswith('mindmap'):
                idx += 1
            # Root line
            while idx < len(lines) and not lines[idx].strip(): idx += 1
            nodes: List[Dict[str, Any]] = []
            if idx < len(lines):
                root = lines[idx].strip()
                root_label = root.replace('root)', '').strip()
                p1,p2 = _extract_pages(root_label)
                nodes.append({
                    'label': root_label,
                    'clean_label': _strip_pages(root_label),
                    'level': 0,
                    'pages': ({'start': p1, 'end': p2} if p1 else None)
                })
            # Children
            for j in range(idx+1, len(lines)):
                raw = lines[j]
                if not raw.strip():
                    continue
                m = re.match(r"^(\s*)(:+)\s+(.*)$", raw)
                if not m:
                    continue
                lvl = max(1, min(3, len(m.group(2))))
                label = (m.group(3) or '').strip()
                p1,p2 = _extract_pages(label)
                nodes.append({
                    'label': label,
                    'clean_label': _strip_pages(label),
                    'level': lvl,
                    'pages': ({'start': p1, 'end': p2} if p1 else None)
                })
            return nodes

        def _find_snippet(context: str, query_label: str) -> Optional[str]:
            import re
            # Use words > 3 letters as anchors
            words = [w for w in re.findall(r"\w+", _strip_pages(query_label)) if len(w) > 3]
            if not words:
                return None
            pattern = re.compile(r"(.{0,120}\b" + re.escape(words[0]) + r"\b.{0,120})", re.IGNORECASE | re.DOTALL)
            m = pattern.search(context)
            if m:
                snippet = m.group(1)
                return snippet.strip().replace('\n', ' ')
            return None
        try:
            context, min_p, max_p = self._fetch_context(db, document_id, start_page, end_page)
            if not context:
                return {"success": False, "error": "No context available for the requested range"}
            used_range = (min_p, max_p) if (min_p and max_p) else None
            prompt = self._create_prompt(document_title, context, used_range, user_query, focus_mode=focus_mode, detail_level=detail_level)
            text = self._call_llm(prompt)
            if not text and len(context) > 2500:
                # DeepSeek sometimes returns empty for long prompts; retry once
                # with a truncated (head) context to fit a tighter window.
                logger.info("Mindmap: empty LLM response, retrying with truncated context")
                short_context = context[:2500]
                retry_prompt = self._create_prompt(
                    document_title, short_context, used_range, user_query,
                    focus_mode=focus_mode, detail_level=detail_level,
                )
                text = self._call_llm(retry_prompt)
            if not text:
                # Fallback minimal example
                md = f"""```mermaid
mindmap
  root) {document_title}
    :: Tema principal [pág. {min_p}-{max_p}]
      ::: Subtema 1
      ::: Subtema 2
    :: Segundo tema [pág. {min_p}-{max_p}]
```"""
                # Build minimal metadata too
                meta_nodes = _parse_nodes_from_mermaid(md)
                for n in meta_nodes:
                    n['snippet'] = _find_snippet(context, n['label'])
                out = {"success": False, "error": "LLM call failed: No response from provider", "markdown": md, "metadata": {"nodes": meta_nodes}}
                if used_range:
                    out["pages_used"] = {"start": used_range[0], "end": used_range[1]}
                return out
            # Ensure only the mermaid block is returned; if model added text, extract code block
            if "```" in text:
                start = text.find("```mermaid")
                end = text.find("```", start + 1)
                if start != -1 and end != -1:
                    text = text[start:end+3]
            # Parse nodes for metadata
            meta_nodes = _parse_nodes_from_mermaid(text)
            for n in meta_nodes:
                n['snippet'] = _find_snippet(context, n['label'])
            result = {"success": True, "markdown": text, "metadata": {"nodes": meta_nodes}}
            if used_range:
                result["pages_used"] = {"start": used_range[0], "end": used_range[1]}

            # Persist default (full-document) mindmap for fast retrieval
            is_default = (
                start_page is None and end_page is None
                and not user_query
                and not focus_mode
                and detail_level == 2
            )
            if is_default:
                try:
                    existing = db.query(DocumentMindmap).filter(
                        DocumentMindmap.document_id == document_id
                    ).first()
                    if existing:
                        existing.markdown = result["markdown"]
                        existing.mindmap_metadata = result.get("metadata")
                        existing.pages_used = result.get("pages_used")
                        existing.updated_at = datetime.utcnow()
                    else:
                        new_mindmap = DocumentMindmap(
                            document_id=document_id,
                            markdown=result["markdown"],
                            mindmap_metadata=result.get("metadata"),
                            pages_used=result.get("pages_used"),
                        )
                        db.add(new_mindmap)
                    db.commit()
                except Exception as persist_error:
                    logger.warning(f"Mindmap: failed to persist default mindmap: {persist_error}")
                    db.rollback()

            return result
        except Exception as e:
            logger.error(f"Mindmap: generation failed: {e}")
            return {"success": False, "error": str(e)}


class QuizGenerator:
    """Genera cuestionarios (opción múltiple) en Markdown a partir de un documento o rango de páginas usando el LLM configurado"""

    def __init__(self):
        self.router = get_router()
        logger.info("QuizGenerator initialized")

    def _fetch_context(
        self,
        db: Session,
        document_id: str,
        start_page: Optional[int],
        end_page: Optional[int],
        char_limit: int = 9000,
    ) -> Tuple[str, Optional[int], Optional[int]]:
        try:
            query = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id)
            if start_page is not None and end_page is not None:
                query = query.filter(
                    DocumentChunk.page_start <= end_page,
                    DocumentChunk.page_end >= start_page,
                )
            chunks = query.order_by(DocumentChunk.chunk_index).all()
            if not chunks:
                return "", None, None
            texts = []
            total = 0
            min_p = None
            max_p = None
            for ch in chunks:
                t = (ch.text or "").strip()
                if not t:
                    continue
                if total + len(t) > char_limit:
                    remaining = max(char_limit - total, 0)
                    if remaining > 0:
                        texts.append(t[:remaining])
                        total += remaining
                    break
                texts.append(t)
                total += len(t)
                min_p = ch.page_start if min_p is None else min(min_p, ch.page_start)
                max_p = ch.page_end if max_p is None else max(max_p, ch.page_end)
            return "\n\n".join(texts), min_p, max_p
        except Exception as e:
            logger.error(f"Quiz: error fetching context: {e}")
            return "", None, None

    def _create_prompt(
        self,
        document_title: str,
        context: str,
        pages_used: Optional[Tuple[int, int]],
        user_query: Optional[str],
        num_questions: int = 10,
    ) -> str:
        page_hint = (
            f"(Limítate al rango de páginas {pages_used[0]}–{pages_used[1]})"
            if pages_used and pages_used[0] and pages_used[1]
            else "(Limítate estrictamente al contexto proporcionado)"
        )
        focus = f"ENFOQUE: {user_query}\n" if user_query else ""
        return f"""
Eres un asistente que elabora cuestionarios de opción múltiple basados en documentos.
Trabaja ÚNICAMENTE con el CONTEXTO de "{document_title}" {page_hint}.

{focus}INSTRUCCIONES:
- Devuelve SOLO Markdown, con {num_questions} preguntas numeradas.
- Para cada pregunta incluye cuatro opciones A-D (una correcta).
- Incluye líneas "Correcta: X" y "Justificación: ..." y "Páginas: ...".
- Preguntas claras y específicas, sin ambigüedades, sin inventar.

FORMATO EJEMPLO (Markdown):
1) Enunciado de la pregunta...
   - A) opción
   - B) opción
   - C) opción
   - D) opción
   Correcta: B
   Justificación: breve justificación exacta del documento
   Páginas: 3–4

CONTEXTO:
{context}

SALIDA: (SOLO EL CUESTIONARIO EN MARKDOWN)
"""

    def _call_llm(self, prompt: str) -> Optional[str]:
        try:
            text, _ = self.router.chat(
                prompt,
                temperature=0.2,
                max_tokens=900,
            )
            return (text or "").strip()
        except Exception as e:
            logger.error(f"Quiz: LLM call failed: {e}")
            return None

    @staticmethod
    def _parse_quiz_markdown(markdown: str) -> List[Dict[str, Any]]:
        """Parse the Markdown quiz output into structured questions."""
        if not markdown:
            return []
        questions: List[Dict[str, Any]] = []
        current: Optional[Dict[str, Any]] = None
        option_re = re.compile(r"^\s*[-*]?\s*\(?([A-Da-d])[).]\s+(.*)$")
        question_start_re = re.compile(r"^\s*(?:\*\*)?\s*(\d+)[).]\s*(.*)$")

        for line in markdown.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            m = question_start_re.match(line)
            if m:
                if current and current.get("question"):
                    questions.append(current)
                current = {
                    "question": m.group(2).strip(),
                    "options": [],
                    "correct": "",
                    "justification": "",
                }
                continue
            if current is None:
                continue
            lower = stripped.lower()
            if lower.startswith("correcta:"):
                current["correct"] = stripped.split(":", 1)[1].strip()
                continue
            if lower.startswith("justificaci"):
                current["justification"] = stripped.split(":", 1)[1].strip()
                continue
            if lower.startswith("páginas") or lower.startswith("paginas"):
                # "Páginas: ..." metadata lines
                continue
            om = option_re.match(line)
            if om:
                current["options"].append(om.group(2).strip())

        if current and current.get("question"):
            questions.append(current)
        return questions

    def generate_quiz(
        self,
        db: Session,
        document_id: str,
        document_title: str,
        start_page: Optional[int] = None,
        end_page: Optional[int] = None,
        user_query: Optional[str] = None,
        num_questions: int = 10,
    ) -> Dict[str, Any]:
        try:
            context, min_p, max_p = self._fetch_context(db, document_id, start_page, end_page)
            if not context:
                return {"success": False, "error": "No context available for the requested range"}
            used_range = (min_p, max_p) if (min_p and max_p) else None
            prompt = self._create_prompt(document_title, context, used_range, user_query, num_questions=num_questions)
            text = self._call_llm(prompt)
            if not text:
                # Fallback minimal quiz
                md = "\n".join([
                    "1) Pregunta de ejemplo",
                    "   - A) Uno",
                    "   - B) Dos",
                    "   - C) Tres",
                    "   - D) Cuatro",
                    "   Correcta: B",
                    "   Justificación: Basada en el texto",
                    f"   Páginas: {min_p}-{max_p}",
                ])
                out = {"success": False, "error": "LLM call failed: No response from provider", "markdown": md}
                if used_range:
                    out["pages_used"] = {"start": used_range[0], "end": used_range[1]}
                return out
            result = {"success": True, "markdown": text, "questions": self._parse_quiz_markdown(text)}
            if used_range:
                result["pages_used"] = {"start": used_range[0], "end": used_range[1]}
            return result
        except Exception as e:
            logger.error(f"Quiz: generation failed: {e}")
            return {"success": False, "error": str(e)}


class FAQGenerator:
    """Genera preguntas frecuentes (FAQ) con respuestas con cita de página a partir de un documento."""

    def __init__(self):
        self.router = get_router()
        logger.info("FAQGenerator initialized")

    def _fetch_context(
        self,
        db: Session,
        document_id: str,
        start_page: Optional[int],
        end_page: Optional[int],
        char_limit: int = 12000,
    ) -> Tuple[str, Optional[int], Optional[int]]:
        try:
            query = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id)
            if start_page is not None and end_page is not None:
                query = query.filter(
                    DocumentChunk.page_start <= end_page,
                    DocumentChunk.page_end >= start_page,
                )
            chunks = query.order_by(DocumentChunk.chunk_index).all()
            if not chunks:
                return "", None, None
            texts = []
            total = 0
            min_p = None
            max_p = None
            for ch in chunks:
                t = (ch.text or "").strip()
                if not t:
                    continue
                if total + len(t) > char_limit:
                    remaining = max(char_limit - total, 0)
                    if remaining > 0:
                        texts.append(t[:remaining])
                        total += remaining
                    break
                texts.append(t)
                total += len(t)
                min_p = ch.page_start if min_p is None else min(min_p, ch.page_start)
                max_p = ch.page_end if max_p is None else max(max_p, ch.page_end)
            return "\n\n".join(texts), min_p, max_p
        except Exception as e:
            logger.error(f"FAQ: error fetching context: {e}")
            return "", None, None

    def _create_prompt(
        self,
        document_title: str,
        context: str,
        pages_used: Optional[Tuple[int, int]],
        user_query: Optional[str],
        num_faqs: int = 8,
    ) -> str:
        page_hint = (
            f"(Limítate al rango de páginas {pages_used[0]}–{pages_used[1]})"
            if pages_used and pages_used[0] and pages_used[1]
            else "(Limítate estrictamente al contexto proporcionado)"
        )
        focus = f"ENFOQUE: {user_query}\n" if user_query else ""
        return f"""
Eres un asistente que elabora preguntas frecuentes (FAQ) basadas en documentos.
Trabaja ÚNICAMENTE con el CONTEXTO de "{document_title}" {page_hint}.

{focus}INSTRUCCIONES:
1) Genera {num_faqs} preguntas frecuentes relevantes y sus respuestas claras y concisas.
2) Cada respuesta debe basarse únicamente en el contenido del contexto, sin inventar.
3) Incluye el rango de páginas en el que se encuentra cada respuesta, formato "X–Y".
4) Devuelve SOLO JSON válido, sin bloque de código.

FORMATO JSON:
{{
  "faqs": [
    {{"question": "pregunta frecuente", "answer": "respuesta concisa y precisa", "pages": "X–Y"}}
  ]
}}

CONTEXTO DEL DOCUMENTO:
{context}

DEVUELVE SOLO EL JSON SOLICITADO.
"""

    def _call_llm(self, prompt: str) -> Optional[str]:
        try:
            text, _ = self.router.chat(
                prompt,
                temperature=0.3,
                max_tokens=1200,
            )
            return (text or "").strip()
        except Exception as e:
            logger.error(f"FAQ: LLM call failed: {e}")
            return None

    def _faqs_to_markdown(self, faqs: List[Dict[str, Any]]) -> str:
        if not faqs:
            return ""
        parts = ["## Preguntas frecuentes"]
        for i, faq in enumerate(faqs, start=1):
            q = faq.get("question", f"Pregunta {i}")
            a = faq.get("answer", "")
            pages = faq.get("pages", "")
            parts.append(f"\n### {i}. {q}")
            parts.append(a)
            if pages:
                parts.append(f"\n> Páginas: {pages}")
        return "\n".join(parts)

    def generate_faqs(
        self,
        db: Session,
        document_id: str,
        document_title: str,
        start_page: Optional[int] = None,
        end_page: Optional[int] = None,
        user_query: Optional[str] = None,
        num_faqs: int = 8,
    ) -> Dict[str, Any]:
        try:
            context, min_p, max_p = self._fetch_context(db, document_id, start_page, end_page)
            if not context:
                return {"success": False, "error": "No context available for the requested range"}
            used_range = (min_p, max_p) if (min_p and max_p) else None
            prompt = self._create_prompt(document_title, context, used_range, user_query, num_faqs=num_faqs)
            resp_text = self._call_llm(prompt)

            if not resp_text:
                # Fallback minimal FAQ
                faqs = [
                    {
                        "question": "¿De qué trata el documento?",
                        "answer": "Síntesis breve basada en el contexto disponible del documento.",
                        "pages": f"{min_p}-{max_p}" if used_range else "",
                    }
                ]
                out = {"success": True, "faqs": faqs, "markdown": self._faqs_to_markdown(faqs)}
                if used_range:
                    out["pages_used"] = {"start": used_range[0], "end": used_range[1]}
                return out

            text = resp_text
            if text.startswith("```json"):
                text = text.replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            faqs = data.get("faqs") or []

            result = {"success": True, "faqs": faqs, "markdown": self._faqs_to_markdown(faqs)}
            if used_range:
                result["pages_used"] = {"start": used_range[0], "end": used_range[1]}
            return result

        except json.JSONDecodeError as e:
            logger.error(f"FAQ: JSON parse error: {e}")
            return {"success": False, "error": "LLM did not return valid JSON"}
        except Exception as e:
            logger.error(f"FAQ: generation failed: {e}")
            return {"success": False, "error": str(e)}
