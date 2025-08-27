# SaaS de Análisis Inteligente de Documentos
*Para estudiantes y profesionales*

## ¿Qué hace?

- El usuario sube un **PDF, Word o PPT**.
- La IA lo analiza y responde preguntas sobre el contenido (tipo "chat con el documento").
- Genera resúmenes, mapas mentales y preguntas de repaso automáticamente.

## Stack recomendado:

**Frontend:** Next.js (con TailwindCSS).  
**Backend:** Python con FastAPI.  
**BD:** PostgreSQL (para usuarios y documentos).  
**IA:** OpenAI GPT-4o o modelos open-source con LangChain.

## Monetización:

- **Plan gratuito:** hasta 3 documentos/mes.
- **Plan premium:** ilimitado + exportar resúmenes en Word/PDF.

---

# Plan de Proyecto — SaaS de Análisis Inteligente de Documentos

**Objetivo:** construir un SaaS que permita **subir documentos (PDF/DOCX/PPTX)**, **consultarlos por chat**, **generar resúmenes** y **exportar resultados**, con un MVP listo para usuarios tempranos y base sólida para escalar/monetizar.

## 0) Resumen ejecutivo

**Público objetivo:** estudiantes, académicos, abogados, consultores; usuarios que lidian con lectura intensiva.

**Propuesta de valor:** respuestas rápidas y citadas sobre el contenido del documento, resúmenes de calidad y exportables.

**Modelo de negocio:** freemium (límite de docs/mes y tokens) + planes de pago por suscripción o por créditos.

### Stack recomendado:

- **Frontend:** Next.js + Tailwind + shadcn/ui.
- **Backend:** FastAPI (Python) + Celery (tareas asíncronas) + Redis (cola/cache).
- **Datos:** PostgreSQL + pgvector (embeddings) + Object Storage (S3/R2/Supabase Storage).
- **IA:** LLM (p. ej., GPT‑4o) + Embeddings (text‑embedding‑3‑large/small) + LangChain/LlamaIndex (opcional).
- **Infra:** Vercel (frontend), Railway/Render/Fly.io (backend/worker/DB), Cloudflare R2/S3 compatible (archivos).

## 1) Alcance del MVP (funciones mínimas)

- **Autenticación** (email/contraseña + OAuth opcional).
- **Subida de documentos** (PDF primero; luego DOCX/PPTX). Límite por tamaño.
- **Extracción de texto** + OCR básico para PDFs escaneados.
- **Indexación:** división en chunks, generación de embeddings y almacenamiento en pgvector.
- **Chat con el documento** (RAG): respuestas con **citas** (páginas/fragmentos relevantes).
- **Resumen automático** del documento completo o por secciones.
- **Gestión básica:** listado/eliminación de documentos, consumo de créditos, perfil.
- **Exportación:** resumen a **PDF/Word** (mínimo uno).
- **Límites:** número de documentos y tamaño total por usuario en plan gratuito.

**Pospuesto para v2:** carpetas/espacios de trabajo, compartir con equipo, soporte avanzado a imágenes/tablas complejas, historial de conversaciones persistente multi-doc, integraciones (Drive/Dropbox), móvil.

## 2) Arquitectura (visión general)

- **Cliente (Next.js):** Dashboard, uploader, viewer con panel de chat y citas.
- **API (FastAPI):** endpoints REST/JSON para auth, documentos, chat y resúmenes.
- **Worker** (Celery): pipeline de ingestión (parse → chunk → embed → almacenar) y tareas pesadas.
- **DB** (Postgres + pgvector): usuarios, documentos, chunks, embeddings, sesiones de chat.
- **Almacenamiento de archivos** (S3/R2/Supabase): documento original y artefactos (texto/JSON).
- **Caching** (Redis): resultados recientes de búsqueda y rate limiting.
- **Telemetría:** logs estructurados, trazas y métricas (ej. OpenTelemetry + Prometheus/Grafana o servicio gestionado).

```
Next.js ──► FastAPI (API) ──► Postgres/pgvector
    │             │         └─► Redis (cache/cola)
    │             └─► Celery Worker ──► Storage S3/R2
    └─► Auth (JWT/Supabase Auth/Auth0)
```

## 3) Esquema de datos (MVP)

- **Tabla users:** id, email, hash_password, created_at, plan, credits_remaining.
- **Tabla documents:** id, user_id, title, filename, storage_url, file_size, pages, status, created_at.
- **Tabla doc_chunks:** id, document_id, chunk_index, text, tokens, page_start, page_end, metadata(jsonb).
- **Tabla doc_embeddings:** id, chunk_id, embedding **vector(1536/3072)** (pgvector), dim.
- **Tabla conversations:** id, user_id, document_id, created_at.
- **Tabla messages:** id, conversation_id, role(user/assistant), content, citations(jsonb), created_at.
- **Tabla usage_events:** id, user_id, type(upload/index/query/summary), tokens_in, tokens_out, cost_est, created_at.
- **Tabla billing_plans** y **subscriptions** (si implementas suscripciones desde el MVP).

**Índices clave:** GIN para **metadata**, **pgvector** para **embedding**, FK en cascada por **document_id** y **conversation_id**.

## 4) Pipeline de ingestión

1. **Upload** → guardar archivo en Storage.
2. **Extracción:**
   - PDF texto: **pdfplumber**/**pypdf**.
   - PDF escaneado: **Tesseract** (OCR) o servicio OCR gestionado.
   - Normalización: limpiar saltos/encabezados, conservar numeración de página.
3. **Chunking:** 800–1200 tokens con solape 100–200 (ajustable). Alternativa: chunking semántico por títulos.
4. **Embeddings:** generar embedding por chunk con modelo económico/rápido.
5. **Persistencia:** guardar chunks + embeddings y marcar documento como **indexed**.
6. **Validación:** conteos, tasa de cobertura (tokens extraídos vs tamaño esperado), logs.

## 5) Flujo de pregunta-respuesta (RAG)

1. Usuario pregunta → normalizar idioma y detectar intención.
2. **Búsqueda vectorial:** **K = 8–15** chunks; re-rank opcional por similitud + heurística de páginas.
3. **Construcción de prompt:** instrucciones del sistema, pregunta del usuario, contexto (chunks), formato de salida + **citas** (páginas y % de similitud).
4. LLM responde → post-procesar: adjuntar citas y fragmentos; controlar longitud.
5. **Cache:** cachear últimas N preguntas por documento.
6. **Seguridad:** si no hay contexto relevante (umbral de similitud), responder con desconocimiento y sugerir subir documento adecuado.

## 6) API (borrador de endpoints)

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`.
- `GET /me` → perfil y créditos.
- `POST /documents` → pre‑signed URL y metadatos (start ingest job).
- `GET /documents` / `GET /documents/{id}` / `DELETE /documents/{id}`.
- `POST /chat/start` → crea conversación (opcional, también se puede implícito).
- `POST /chat/{conversation_id}/ask` → `{ question }` → `{ answer, citations[] }`.
- `POST /documents/{id}/summarize` → `{ summary, outline }`.
- `GET /usage` → uso por tipo y estimación de costo.

**Rate limiting** (ej. 60 RPM por usuario) y protección CSRF para endpoints de sesión.

## 7) Frontend (UX del MVP)

- **Onboarding** simple: registrar, mensaje de bienvenida y CTA a subir documento.
- **Dashboard:** listado de documentos (estado: subiendo, procesando, listo, error), consumo de créditos.
- **Vista de documento:** panel izquierdo con miniaturas/páginas (opcional), panel derecho chat. Cada respuesta muestra **citas** (p.ej. "p. 3, p. 7–8").
- **Resumen:** botón "Generar resumen" con modal de parámetros (breve/extendido; por secciones).
- **Exportar:** descargar PDF/Docx.
- **Errores guiados:** si el PDF es escaneado, sugerir OCR; si excede tamaño, proponer dividir.

## 8) Prompts base (guía)

- **Sistema:** "Eres un asistente que responde **exclusivamente** con información del documento cuando exista. Devuelve siempre citas de página. Si no hay evidencia suficiente, dilo claramente."
- **Formato de salida:** breve → bullets + citas; extendido → secciones con encabezados.
- **Políticas:** sin alucinaciones, no inventar páginas; respetar idioma original del usuario.

## 9) Métricas clave (producto y técnica)

- **Tasa de éxito** de respuestas con citas válidas.
- **Cobertura de ingestión** (tokens extraídos vs esperados).
- **Latencia p95** de respuesta.
- **Costo por usuario** (tokens in/out + almacenamiento) vs **ARPU**.
- **Activación:** % usuarios que suben ≥1 documento el día 1.

## 10) Seguridad y privacidad

- **Cifrado en tránsito** (HTTPS) y **en reposo** (SSE en S3/R2, discos cifrados en DB).
- **Eliminación:** endpoint para borrar documento y todos sus artefactos.
- **Retención:** política clara (p.ej. 30 días en plan gratuito, configurable en Premium).
- **Aislamiento:** datos por usuario; no mezclar contextos.
- **Registro** de accesos y acciones sensibles.
- **Avisos:** Términos y Política de privacidad desde el MVP.

## 11) Pagos y planes

- **Planes:** Free (3 docs/mes, 30MB/doc, 50 preguntas), Pro (ilimitado razonable, mayor tamaño), Business (espacios de trabajo + prioridad).
- **Cobro:** suscripción o **créditos** por uso de IA.
- **Pasarela:** elegir según disponibilidad local/internacional (Stripe/Paddle/Lemon Squeezy/PayPal). Implementar una capa de **uso de créditos** desacoplada de la pasarela para poder cambiarla sin reescribir lógica.

## 12) Roadmap sugerido (8 semanas)

### Semana 1 — Fundaciones
- Repos mono o multi: **apps/web (Next.js)**, **apps/api (FastAPI)**, **worker**, **infra**.
- Docker Compose dev; **.env** y gestión de secretos.
- Auth básica (JWT o Supabase Auth) + UI de registro/login.

### Semana 2 — Documentos & Storage
- Uploader con barra de progreso + validaciones.
- Backend para pre‑signed URLs; guardar metadatos en **documents**.
- Servicio de extracción para PDFs con texto.

### Semana 3 — OCR + Chunking + Embeddings
- OCR opcional para escaneados.
- Chunking configurable + embeddings → pgvector.
- Métricas de ingestión & reintentos.

### Semana 4 — Chat RAG
- Endpoint **/chat/ask** con recuperación y citas.
- UI de chat con render de citas (páginas y previews).
- Cache y límites por usuario.

### Semana 5 — Resúmenes & Exportación
- Endpoint de resumen (breve/extendido/índice).
- Exportar a PDF/DOCX.

### Semana 6 — Pulido y Observabilidad
- Logs, métricas, trazas; manejo de errores de usuario.
- QA manual con docs de prueba variados.

### Semana 7 — Pagos/Límites
- Implementar créditos/planes.
- Portal de suscripción/billing básico.

### Semana 8 — Beta pública
- Despliegues gestionados; CDN para archivos.
- Página de marketing + onboarding.
- Recoger feedback de 10–30 usuarios.

## 13) Backlog técnico (priorizado)

- Normalización avanzada por secciones/encabezados.
- Re‑rank con modelos ligeros (cross‑encoder) para mejorar precisión.
- Detección de tablas y extracción estructurada.
- Soporte DOCX/PPTX + imágenes.
- Historial de conversaciones y multi‑doc.
- Indexación incremental (actualizaciones de archivo).
- Panel admin (moderación, métricas, soporte).

## 14) Estimación de costos (orientativo)

- **LLM y embeddings:** coste variable por tokens (usar modo económico para ingestión; modelo mejor para respuesta final).
- **Infra ligera en desarrollo:** 20–60 USD/mes (DB/hosting/storage mínimos).
- **Almacenamiento:** ~0.015–0.03 USD/GB/mes (proveedores S3‑compatibles).

Controla el costo usando **créditos**, límites por usuario y compresión/limpieza de embeddings.

## 15) Calidad y pruebas

- **Unitarias:** parsing, chunking, formateo de prompts.
- **Integración:** RAG end‑to‑end con set de preguntas esperadas.
- **E2E:** Playwright (subida → pregunta → respuesta con citas → exportación).
- **Conjunto de evaluación:** 10–20 documentos públicos con respuestas esperadas (para medir precisión/cobertura).

## 16) Entregables iniciales (siguientes 3–5 días)

- Repos y estructura base + Docker Compose.
- Esquema de DB (migraciones)

## Siguiente paso práctico (hoy)

1. Crea repos y entorno (**apps/web**, **apps/api**, **apps/worker**).
2. Despliega **Next.js vacío** en Vercel y **FastAPI** en Railway.
3. Integra **Auth** y crea tablas **orgs**, **documents**, **chunks**.
4. Implementa **upload → estado pending** y una **cola** que imprima "procesando X" (stub).

Con eso, en 1–2 días ya tendrás el esqueleto funcional para iterar rápido. 💪