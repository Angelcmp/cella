#!/usr/bin/env python3
"""
RAG (Retrieval-Augmented Generation) system for DocAI
Handles document search and response generation with citations
Supports both OpenAI and Google Gemini APIs
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session

# OpenAI for embeddings and chat
from openai import OpenAI

# Google Gemini for embeddings and chat
import google.generativeai as genai

from database_simple import DocumentChunk, DocumentEmbedding, DocumentSummary, Document

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RAGSystem:
    """Handles retrieval-augmented generation for document chat"""
    
    def __init__(self):
        # Initialize OpenAI client
        self.openai_client = None
        if os.getenv("OPENAI_API_KEY"):
            self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            logger.info("OpenAI client initialized")
        
        # Initialize Gemini client
        self.gemini_client = None
        if os.getenv("GEMINI_API_KEY"):
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            self.gemini_client = genai
            logger.info("Gemini client initialized")
        
        # Determine which provider to use
        if self.gemini_client:
            self.provider = "gemini"
            logger.info("Using Gemini as primary provider")
        elif self.openai_client:
            self.provider = "openai"
            logger.info("Using OpenAI as primary provider")
        else:
            self.provider = "mock"
            logger.warning("No API keys found, using mock responses")
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            a = np.array(vec1)
            b = np.array(vec2)
            return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
        except:
            return 0.0
    
    def generate_query_embedding(self, query: str) -> Optional[List[float]]:
        """Generate embedding for user query"""
        if self.provider == "gemini":
            return self._generate_gemini_embedding(query)
        elif self.provider == "openai":
            return self._generate_openai_embedding(query)
        else:
            logger.warning("No API client available, returning mock embedding")
            return [0.1] * 768  # Standard embedding size for mock
    
    def _generate_gemini_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding using Gemini API"""
        try:
            # Try multiple embedding model names
            embedding_models = [
                "text-embedding-004",
                "models/text-embedding-004", 
                "models/embedding-001"
            ]
            
            for model_name in embedding_models:
                try:
                    result = self.gemini_client.embed_content(
                        model=model_name,
                        content=text
                    )
                    logger.info(f"Successfully used embedding model: {model_name}")
                    return result['embedding']
                except Exception as model_error:
                    logger.warning(f"Embedding model {model_name} failed: {model_error}")
                    continue
            
            # If all embedding models fail
            raise Exception("All Gemini embedding models failed")
            
        except Exception as e:
            logger.error(f"Failed to generate Gemini embedding: {e}")
            return [0.1] * 768  # Mock embedding as fallback
    
    def _generate_openai_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding using OpenAI API"""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate OpenAI embedding: {e}")
            return [0.1] * 1536  # Mock embedding as fallback
    
    def search_relevant_chunks(
        self, 
        db: Session, 
        document_id: str, 
        query_embedding: List[float], 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for most relevant chunks using cosine similarity"""
        try:
            # Get all chunks for the document with their embeddings
            chunks_with_embeddings = db.query(DocumentChunk, DocumentEmbedding).join(
                DocumentEmbedding, DocumentChunk.id == DocumentEmbedding.chunk_id
            ).filter(DocumentChunk.document_id == document_id).all()
            
            if not chunks_with_embeddings:
                logger.warning(f"No chunks found for document {document_id}")
                return []
            
            # Calculate similarities
            chunk_similarities = []
            for chunk, embedding in chunks_with_embeddings:
                try:
                    # Parse embedding JSON
                    chunk_embedding = json.loads(embedding.embedding)
                    similarity = self.cosine_similarity(query_embedding, chunk_embedding)
                    
                    chunk_similarities.append({
                        "chunk": chunk,
                        "similarity": similarity,
                        "chunk_id": chunk.id,
                        "text": chunk.text,
                        "page_start": chunk.page_start,
                        "page_end": chunk.page_end,
                        "tokens": chunk.tokens
                    })
                except Exception as e:
                    logger.warning(f"Failed to process chunk {chunk.id}: {e}")
                    continue
            
            # Sort by similarity and return top_k
            chunk_similarities.sort(key=lambda x: x["similarity"], reverse=True)
            
            logger.info(f"Found {len(chunk_similarities)} chunks, returning top {min(top_k, len(chunk_similarities))}")
            return chunk_similarities[:top_k]
            
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
        
        prompt = f"""Eres un asistente de IA experto en análisis de documentos. Tu trabajo es responder preguntas sobre el documento "{document_title}" basándote ÚNICAMENTE en la información proporcionada en los fragmentos del documento.

INSTRUCCIONES IMPORTANTES:
1. Responde SOLO con información que aparece en los fragmentos proporcionados
2. Si no tienes suficiente información para responder, dilo claramente
3. Siempre incluye citas específicas indicando de qué página proviene la información
4. Mantén un tono profesional y útil
5. No inventes información que no esté en los fragmentos
6. FORMATO DE RESPUESTA: Organiza tu respuesta en párrafos claros y bien separados. Usa saltos de línea (\n\n) entre párrafos para mejorar la legibilidad. Cada idea principal debe estar en un párrafo separado.

FRAGMENTOS DEL DOCUMENTO:
{context}

PREGUNTA DEL USUARIO: {query}

RESPUESTA (en párrafos bien formateados con citas de página):"""
        
        return prompt
    
    def generate_response(self, prompt: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Generate response using configured AI provider"""
        if self.provider == "gemini":
            return self._generate_gemini_response(prompt)
        elif self.provider == "openai":
            return self._generate_openai_response(prompt)
        else:
            # Mock response for development
            mock_response = f"Esta es una respuesta simulada a su pregunta. En el momento no tengo acceso a APIs de IA, pero puedo mostrar cómo funcionaría el sistema de citas.\n\nBasándome en los fragmentos del documento, puedo proporcionar información relevante con citas específicas de las páginas correspondientes."
            mock_citations = [
                {"page": 1, "snippet": "Fragmento relevante del documento...", "similarity": 0.85},
                {"page": 2, "snippet": "Otro fragmento relacionado...", "similarity": 0.72}
            ]
            return mock_response, mock_citations
    
    def _generate_gemini_response(self, prompt: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Generate response using Gemini API"""
        try:
            # Try multiple model names in order of preference
            model_names = [
                'gemini-1.5-flash',
                'gemini-1.5-pro', 
                'models/gemini-1.5-flash',
                'models/gemini-1.5-pro',
                'gemini-pro'  # fallback
            ]
            
            for model_name in model_names:
                try:
                    model = self.gemini_client.GenerativeModel(model_name)
                    response = model.generate_content(prompt)
                    logger.info(f"Successfully used model: {model_name}")
                    return response.text, []
                except Exception as model_error:
                    logger.warning(f"Model {model_name} failed: {model_error}")
                    continue
            
            # If all models fail
            raise Exception("All Gemini models failed")
            
        except Exception as e:
            logger.error(f"Failed to generate Gemini response: {e}")
            return f"Lo siento, ocurrió un error al generar la respuesta: {str(e)}", []
    
    def _generate_openai_response(self, prompt: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Generate response using OpenAI API"""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Eres un asistente experto en análisis de documentos que proporciona respuestas precisas con citas."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            return response.choices[0].message.content, []
        except Exception as e:
            logger.error(f"Failed to generate OpenAI response: {e}")
            return f"Lo siento, ocurrió un error al generar la respuesta: {str(e)}", []
    
    def extract_citations_from_chunks(self, relevant_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
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
            
            citations.append(citation)
        
        return citations
    
    def is_metadata_question(self, query: str) -> bool:
        """Check if the query is asking about document metadata (pages, length, structure)"""
        metadata_keywords = [
            'páginas', 'paginas', 'página', 'pagina', 'cuántas páginas', 'cuantas paginas',
            'total de páginas', 'total de paginas', 'número de páginas', 'numero de paginas',
            'largo del documento', 'longitud', 'tamaño', 'extensión', 'extension',
            'capítulos', 'capitulos', 'secciones', 'estructura'
        ]
        
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in metadata_keywords)

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
        user_query: str
    ) -> Dict[str, Any]:
        """Complete RAG pipeline for document chat"""
        
        logger.info(f"Starting chat with document {document_id}")
        logger.info(f"User query: {user_query}")
        
        try:
            # Check if this is a metadata question
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
            query_embedding = self.generate_query_embedding(user_query)
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
                    "success": True
                }
            
            # Step 3: Create prompt with context
            prompt = self.create_rag_prompt(user_query, relevant_chunks, document_title)
            
            # Step 4: Generate response
            response_text, llm_citations = self.generate_response(prompt)
            
            # Step 5: Extract citations from chunks
            chunk_citations = self.extract_citations_from_chunks(relevant_chunks)
            
            # Combine citations (prefer LLM citations if available, otherwise use chunk citations)
            final_citations = llm_citations if llm_citations else chunk_citations
            
            logger.info(f"Generated response with {len(final_citations)} citations")
            
            return {
                "response": response_text,
                "citations": final_citations,
                "success": True,
                "chunks_found": len(relevant_chunks)
            }
            
        except Exception as e:
            logger.error(f"Chat failed: {e}")
            return {
                "response": f"Lo siento, ocurrió un error al procesar tu pregunta: {str(e)}",
                "citations": [],
                "success": False,
                "error": str(e)
            }


class SummaryGenerator:
    """Handles automatic document summarization using Gemini API"""
    
    def __init__(self):
        # Initialize Gemini client
        self.gemini_client = None
        if os.getenv("GEMINI_API_KEY"):
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            self.gemini_client = genai
            logger.info("SummaryGenerator: Gemini client initialized")
        else:
            logger.warning("SummaryGenerator: No Gemini API key found")
    
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
    
    def generate_summary_with_gemini(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Generate summary using Gemini API"""
        if not self.gemini_client:
            logger.error("Gemini client not available")
            return None
            
        try:
            # Try multiple model names in order of preference
            model_names = [
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'models/gemini-1.5-flash',
                'models/gemini-1.5-pro',
                'gemini-pro'
            ]
            
            for model_name in model_names:
                try:
                    model = self.gemini_client.GenerativeModel(model_name)
                    response = model.generate_content(
                        prompt,
                        generation_config=genai.GenerationConfig(
                            temperature=0.3,
                            max_output_tokens=1000,
                        )
                    )
                    
                    # Parse JSON response
                    response_text = response.text.strip()
                    
                    # Clean up response if it has markdown formatting
                    if response_text.startswith("```json"):
                        response_text = response_text.replace("```json", "").replace("```", "").strip()
                    
                    summary_data = json.loads(response_text)
                    logger.info(f"Successfully generated summary using model: {model_name}")
                    return summary_data
                    
                except json.JSONDecodeError as e:
                    logger.warning(f"JSON parse error with model {model_name}: {e}")
                    # Try to extract JSON from the response
                    try:
                        start = response.text.find('{')
                        end = response.text.rfind('}') + 1
                        if start != -1 and end != 0:
                            clean_json = response.text[start:end]
                            summary_data = json.loads(clean_json)
                            return summary_data
                    except:
                        pass
                    continue
                except Exception as model_error:
                    logger.warning(f"Model {model_name} failed: {model_error}")
                    continue
            
            # If all models fail
            raise Exception("All Gemini models failed for summary generation")
            
        except Exception as e:
            logger.error(f"Failed to generate summary with Gemini: {e}")
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
                    "executive_summary": existing_summary.executive_summary,
                    "key_points": existing_summary.key_points,
                    "main_topics": existing_summary.main_topics,
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
            
            # Generate summary using Gemini
            summary_data = self.generate_summary_with_gemini(prompt)
            if not summary_data:
                raise ValueError("Failed to generate summary with Gemini")
            
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
                "executive_summary": new_summary.executive_summary,
                "key_points": new_summary.key_points,
                "main_topics": new_summary.main_topics,
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
                "executive_summary": summary.executive_summary,
                "key_points": summary.key_points,
                "main_topics": summary.main_topics,
                "created_at": summary.created_at.isoformat(),
                "tokens_used": summary.tokens_used
            }
            
        except Exception as e:
            logger.error(f"Failed to get summary: {e}")
            return None