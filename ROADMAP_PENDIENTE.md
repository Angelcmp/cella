# Roadmap Pendiente – Cella

Resumen de mejoras priorizadas para Cella (antes DocAI). Enfocado en seguridad, búsqueda vectorial, fiabilidad del worker, observabilidad, producto y despliegue. Estado verificado al 16/08/2026 tras el sprint de DB cleanup + embeddings cache + SSE robustez + rediseño del modal "Ajustes de modelos" con wizard 3 pasos (la app es 100% local en `LOCAL_MODE`).

## 0. Notación y Alcance
- Prioridad: Alta (A), Media (M), Baja (B)
- Tipo: Seguridad, Backend, Frontend, Infra, Observabilidad, Producto, Docs, Testing
- Entregables: issues/tareas discretas con criterios de aceptación
- **Posicionamiento**: la app es 100% local (`LOCAL_MODE=true`). Las piezas cloud (pgvector gestionado, AV externo, multi-tenant, límites por plan) están **fuera de alcance local** salvo que se vuelva a SaaS.

## 1) Seguridad (A) [Tipo: Seguridad, Backend, Infra]

### Ya implementado
- [x] Auth por cookies `httpOnly` + `SameSite=Lax` + `Secure` en demo/prod (`config.py`)
- [x] CSRF token en peticiones mutadoras (`security/csrf.py`)
- [x] Rate limiting por IP y por usuario (`_rate_key` en `main.py`, `RATE_LIMIT_PER_USER=true`) con ventana deslizante, Redis-backed con fallback en memoria (`rate_limit.py`) + headers `X-RateLimit-*`
- [x] Security headers + HSTS + CSP estricta activable (`ENABLE_CSP_STRICT`)
- [x] Validación de firma/MIME en uploads (`documents.py`)
- [x] Scan antivirus integrado y activable (`ENABLE_FILE_AV_SCAN`, `_av_scan_ok` en `documents.py`)
- [x] Blacklist/invalidación de tokens persistente: SQLite (`RevokedToken` en `auth_simple.py`) **+ espejo en Redis** (`redis_client.py`, TTL) para invalidación inmediata y supervivencia a reinicios
- [x] Métricas de rate limit expuestas (`rate_limited_total` en `/metrics`)

### Pendiente
- [x] Antivirus: sustituir ClamAV por un servicio gestionado o firmar proveedor
  - Aceptación: logs de auditoría de cada escaneo
  - ✅ `security/av.py`: provider `clamav` | `http` (managed API); cada escaneo se registra en `av_scan_logs` (nombre, provider, resultado, error, duración, request_id)
- [x] Política de expiración/TTL de tokens de sesión
  - ✅ `SESSION_TTL_MINUTES`, `purge_expired_revoked_tokens()` ejecutado por worker y startup; limpieza periódica en SQLite + Redis de tokens revocados expirados

### Notas de Entorno (no romper dev)
- Cookies en dev sin `Secure` (solo `ENVIRONMENT=production` o `COOKIE_SECURE=true`)
- CSP estricta solo en prod; `RATE_LIMIT_ENABLED=false` desactiva límites en dev
- Redis opcional (`INFRA=light`): si cae, rate limit y blacklist hacen fallback a SQLite/en memoria

## 2) Búsqueda Vectorial en Postgres (B) [Tipo: Backend, Infra] — Fuera de alcance local

**Estado actual (LOCAL_MODE=true, `DATABASE_URL=sqlite:///./docai.db`):**
- Tabla `doc_embeddings` con `embedding = Column(Text)` que almacena JSON serializado del vector (`apps/api/database_simple.py:78-84`).
- Modelo de embeddings: `BAAI/bge-small-en-v1.5` (384-dim) vía `fastembed` (`apps/api/providers.py:34-72`).
- Búsqueda: brute-force NumPy sobre todos los chunks del documento, similaridad coseno + MMR en Python (`apps/api/rag_system.py:77-163`, `cosine_similarity` en `:41-48`).
- Ingesta: `apps/worker/worker.py:73-81` escribe `embedding=json.dumps(list)` por chunk.

**Objetivo (cuando se reactive modo servidor):**
- Migrar `doc_embeddings` a pgvector con columna `Vector(dim)` e índice HNSW (`vector_cosine_ops`).
- Mantener `LOCAL_MODE` (SQLite + brute-force) intacto — la rama pgvector solo se activa cuando `engine.dialect.name == "postgresql"`.

**Diseño:**
1. **Modelo**: `DocumentEmbedding.embedding` con tipo dialect-aware. En Postgres: `pgvector.sqlalchemy.Vector(dim)` donde `dim` viene de `providers.PROVIDER_CATALOG[provider].embed_dim` (384 bge, 768 gemini, 1024 zhipu, 1536 openai). En SQLite: `Column(Text)` con JSON (como hoy).
2. **Índice** (Postgres only, vía `__table_args__` o migración): `Index("ix_doc_embeddings_vec_hnsw", "embedding", postgresql_using="hnsw", postgresql_ops={"embedding": "vector_cosine_ops"})`. HNSW preferido sobre IVFFlat: no requiere training, mejor para <1M vectores, suficiente hasta escala SaaS inicial.
3. **Escritura** (`apps/worker/worker.py:73-81`): helper `embedding_to_db(vec, dialect)` — pasa `list[float]` en Postgres, `json.dumps(list)` en SQLite. Idempotencia ya implementada (delete previo).
4. **Lectura** (`apps/api/rag_system.py:88-118`): reemplazar el JOIN + JSON.loads + NumPy por `ORDER BY DocumentEmbedding.embedding.cosine_distance(:qvec) LIMIT top_k`. MMR (`:127-153`) se mantiene en Python encima del resultado — es post-re-ranking, independiente del backend.
5. **Tests**: `apps/api/tests/test_rag.py:77-79` siembra `embedding=json.dumps(...)` (válido en ambos dialects). Nuevo test opt-in `RUN_PGVECTOR_TESTS=1` levanta Postgres ephemeral y verifica el operador `<=>` directamente.
6. **Dependencias a añadir** (`apps/api/requirements.txt`): `pgvector`, `psycopg[binary]`, pin `numpy`.
7. **Infra**: `docker-compose.yml` ya declara `pgvector/pgvector:pg16` + `docker/postgres/init.sql` con `CREATE EXTENSION vector`. Solo falta arrancar el servicio en `start.sh` cuando `INFRA=full` y exponer `DATABASE_URL=postgresql://docai:password@postgres:5432/docai`.

**Criterios de aceptación (cuando se implemente):**
- [ ] `DATABASE_URL=sqlite:///./...` sigue funcionando idéntico a hoy (todos los tests verdes).
- [ ] `DATABASE_URL=postgresql://...` levanta, migra, ingiere y busca vía `<=>`.
- [ ] Top-k recall igual o mejor que el brute-force actual en un set de prueba fijo.
- [ ] MMR, citas, anclaje de sentencias, RAG multi-doc — sin cambios de comportamiento.

**Fuera de alcance de este item:** multi-tenant, cross-encoder re-ranking, IVFFlat (se reevalúa si >5M vectores).

## 3) Cola de Trabajos Robusta (A) [Tipo: Backend, Infra]

### Ya implementado
- [x] Retries con backoff exponencial en `apps/worker/worker.py` (`backoff_for`, `due_for_retry`)
  - Hasta `WORKER_MAX_ATTEMPTS` (default 3), `WORKER_BACKOFF_BASE_SECONDS` (default 5)
  - Documentos en `failed` se reencolan automáticamente cuando vence la ventana de backoff; tras agotar intentos quedan en estado `failed` con `last_error`
- [x] Reprueba manual: `POST /api/documents/{document_id}/reprocess` + botón "Reprocesar documento" en la UI (`ChatPanel.tsx`)
- [x] Visibilidad del estado: columnas `attempts`, `last_error`, `last_attempt_at` en `Document` (SQLite, migración aditiva) expuestas en la API y mostradas en `LeftSidebar`
- [x] Tests de backoff en `apps/api/tests/test_worker.py`

### Pendiente
- [x] DLQ explícita o panel de estado del worker (hoy se consulta vía documentos en `failed`)
  - ✅ `Document.dlq` flag en `database_simple.py`; `GET /worker/status` con `dlq` count + `dlq_entries` en `routers/worker.py`; worker marca `dlq=True` tras agotar `WORKER_MAX_ATTEMPTS`
- [x] Idempotencia garantizada si el proceso muere a mitad de un job
  - ✅ Claim atómico con `worker_id` + `claimed_at` en `worker.py`; reclaim automático de docs stuck en `processing` tras `WORKER_CLAIM_TIMEOUT_SECONDS`

## 4) Observabilidad End-to-End (M) [Tipo: Observabilidad, Backend, Infra]

### Ya implementado
- [x] Métricas Prometheus en `/metrics` (`ENABLE_METRICS=true`): `http_requests_total` (status/method), `http_request_duration_seconds` (histograma), `rate_limited_total` (`apps/api/metrics.py`)
- [x] Logs estructurados: JSON opcional (`ENABLE_JSON_LOGS=true`), request-id en cada petición, logs de inicio/finalización de petición en `main.py`
- [x] Tests de métricas y request-id en `apps/api/tests/test_security.py`
- [x] Tracing distribuido (OpenTelemetry/OTLP): spans en auth, upload, RAG
  - ✅ `telemetry.py`: `span()` context manager + `inject_tracing_middleware()`; lazy init con `ENABLE_TRACING=true`; OTLP gRPC/HTTP configurable (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`); no-op sin deps
- [x] Dashboards Grafana y alertas (requiere despliegue Prometheus + Grafana)
  - ✅ `deploy/monitoring/grafana/`: dashboard `cella.json` (DLQ, 5xx, latencia, stale), alertas `cella.yml`, datasources y provisioning
  - ✅ `deploy/monitoring/prometheus/prometheus.yml`: scrape config para `cella-api:8000`
  - ✅ `docker-compose.yml`: profile `monitoring` con Prometheus + Grafana

## 5) Producto y Experiencia (M) [Tipo: Producto, Frontend, Backend]

### Ya implementado
- [x] Exportación de conversaciones y resúmenes en Markdown/JSON (`routers/exports.py`)
- [x] Export PDF vía frontend (`window.open` + `window.print()` en `ChatInterface.tsx`) — botones MD/JSON/PDF en la UI
- [x] OCR integrado y activable (pytesseract en `document_processor.py`)
- [x] Modo lectura en `/zen`: fondo blanco (`--zen-read-bg`), texto 14px (Inter), headings 16px serif con parsing de markdown `#` a `<h1>`…`<h6>` (`ChatInterface.tsx`, `globals.css`)
- [x] Chat input compacto: consola blanca, sin banner ni metadatos (Fuentes/Tkn), toolbar única con selector de modelo + iconos + enviar; textarea 14px auto-expande hasta 200px (`ChatInput.tsx`)
- [x] Visor PDF inline con react-pdf v10 + pdfjs-dist 5.4.296, `ssr: false`, navegación de páginas, endpoint `GET /documents/{id}/file` con `content_disposition_type=inline` (`PdfViewer.tsx`, `documents.py`)
- [x] Studio 3-columnas: rail 72px / aside 620px, cards glass sin borde, botones CTAs fondo `--primary-fixed` (`RightSidebar.tsx`, `ZenLayout.tsx`)
- [x] Docs y landing: escala tipográfica reducida en `/docs`, logo actualizado a `#A7D8DE`
- [x] Límites por plan y contadores (solo si se reactiva modo servidor/SaaS)
  - ✅ `usage.py`: `enforce_limit` (plan cap=402, window=429) + `record_usage` + `usage_summary`; `ENFORCE_PLAN_LIMITS` off en LOCAL_MODE; model `UsageEvent`; endpoint `GET /usage`; frontend muestra usados/límites en `SettingsPopover`

### Pendiente
- [x] OCR: idiomas configurable, colas y calidad medible
  - ✅ `TESSERACT_LANGS` (default `spa+eng`) configurable vía env; `DocumentProcessor` propaga el idioma a `pytesseract.image_to_string`
  - ✅ Tabla `ocr_scan_logs` (`OcrScanLog` en `database_simple.py`) con contadores por documento: `pages_total`, `pages_ocr`, `pages_failed`, `chars_extracted`, `duration_ms`, `request_id`
  - ✅ Worker (`store_ocr_log` en `worker.py`) persiste la fila tras el procesamiento; skip si `OCR_LOG_ENABLED=false` o si no hubo OCR
  - ✅ Counters Prometheus `cella_ocr_pages_total`, `cella_ocr_chars_total`, `cella_ocr_failures_total` (`apps/api/metrics.py`) incrementados vía endpoint interno `POST /internal/ocr-metrics` desde el worker
  - ✅ `apps/api/tests/test_ocr.py`: 6 tests (langs desde config, log persistido, log desactivado, métricas incrementadas, payload vacío, helper `_ocr_image`)

## 6) Testing y Calidad (M)
- [x] Tests de seguridad (cookies/rate/CSRF/métricas/request-id) en `apps/api/tests/test_security.py`
- [x] Tests RAG (ranking y citas) en `apps/api/tests/test_rag.py`
- [x] Tests de worker (backoff/reencolado) en `apps/api/tests/test_worker.py`
- [x] E2E Playwright: `apps/web/tests/e2e/smoke.spec.ts` (landing, /docs, /zen) con `playwright.config.ts` (puerto 3100)
- [x] CI/CD en `.github/workflows/ci.yml`: jobs backend (pytest), frontend (typecheck+lint+build) y e2e (Playwright chromium)

## 7) Despliegue y Entorno (M)
- [x] Demo Mode retirado — la app es 100% local (`LOCAL_MODE=true`), sin registro ni cuentas
- [x] Nginx/TLS (HSTS) en prod (solo si despliegue servidor)
  - ✅ `deploy/nginx/cella.conf`: reverse proxy con TLS (Let's Encrypt), HSTS, proxy a frontend :3000 + FastAPI :8000, SSE streaming, métricas accesibles solo desde localhost
- [x] Pipeline CI/CD con gates de calidad

## 8) Documentación (B)
- [x] STATUS.md actualizado con la limpieza y el rediseño
- [x] README.md actualizado con el sprint (stack, funcionalidades, API, testing/CI, docs adicionales)
- [x] Runbooks de incidentes en `docs/RUNBOOKS.md` (arranque/parada, troubleshooting Redis, worker, doc en `failed`)

## 9) Sprint 2026-08-16 — DB health + SSE robustez + embeddings cache + UX modelos
- [x] **DB cleanup (mínimo)** — `apps/api/database_simple.py:_data_integrity_backfills()` ejecutado por `_migrate()` al startup:
  - Backfill `conversations.document_ids = 'null'` (literal 4-byte ASCII) → NULL real. Bug que duplicaba filas en cada turno de chat.
  - Reclamar docs `processing` con `claimed_at` > 30 min → `failed` con `last_error='reclaimed_by_cleanup'`.
  - DELETE huérfanos defensivo en `doc_faqs`, `doc_study_guides`, `doc_mindmaps`, `doc_summaries`, `doc_chunks`, `doc_embeddings`.
  - `_create_indexes_if_missing()` añade 5 índices idempotentes (`CREATE INDEX IF NOT EXISTS`): `ix_doc_chunks_document_id`, `ix_doc_embeddings_chunk_id`, `ix_messages_conversation_id`, `ix_conversations_user_id`, `ix_documents_user_id`.
  - ✅ `apps/api/tests/test_db_cleanup.py`: 5 tests verde.
- [x] **Embeddings cache (worker)** — `apps/api/cache.py:RAGCache.get_text_embedding/set_text_embedding` con key `cella:text_emb:{model}:{sha256(text)[:16]}` (Redis-first, fallback MemoryCache LRU 2048). `DocumentProcessor.generate_embeddings()` consulta cache antes de embedir, envía batch solo de misses y rellena el cache. Re-indexings del mismo texto ahora son gratis.
  - ✅ `apps/api/tests/test_cache.py`: 8 tests verde (incluye verificación de que `embed_batch` no se llama cuando todos son hits).
- [x] **SSE streaming robusto** — `apps/api/routers/chat.py`:
  - `_chat_event_stream` extraído como generador único compartido por single + multi-doc.
  - Heartbeat `event: ping` cada `STREAM_HEARTBEAT_SECONDS` (env, default 15) entre yields para mantener viva la conexión durante razonamiento largo (DeepSeek-R / GLM-4.6).
  - `event: done` ahora SIEMPRE es el último evento (incluso tras error). Antes, un error dejaba el bubble del asistente vacío.
  - `event: summary` con `duration_ms`, `tokens_estimated`, `model` antes del done (telemetría).
  - `GeneratorExit`/`abort`: cliente desconecta → salida limpia sin emitir error/done.
  - Dedupe query embedding multi-doc en `rag_system._retrieve_multi`: una sola llamada `embed(query)` reutilizada para todos los documentos.
  - ✅ 64 tests backend verde.
- [x] **AbortController + botón Stop en /zen** — `apps/web/src/components/ChatInterface.tsx`: `streamControllerRef` con `AbortController` por mensaje, `stopStreaming()` expuesta al padre, listener `abort` cancela el reader, ping ignorado, mensaje cancelado marcado como `_(respuesta detenida)_`. `apps/web/src/components/zen/ChatInput.tsx`: prop `onStop`, botón rojo con `Square` durante `isLoading`, click → abort. `apps/web/src/components/zen/ChatPanel.tsx`: `onCitationClick` ahora real (activa tab `document` del right sidebar + stash de `__pendingCitationPage` para scroll futuro del visor).
- [x] **Rediseño del modal "Ajustes de modelos"** — alcance B completo:
  - Backend: `POST /providers/test` (test sin guardar, devuelve `ok`, `latency_ms`, `response`, `error`); auth/CSRF (`Depends(get_current_user)` + `csrf_protect`) en todos los endpoints de `routers/providers.py`; catálogo con `capabilities` (`has_embeddings`, `supports_streaming`, `supports_vision`, `supports_tools`); columnas health en `ProviderConfig` (`last_test_at`, `last_test_ok`, `last_test_latency_ms`, `last_test_error`) persistidas en cada test.
  - Frontend: `apps/web/src/components/zen/store.ts` con slice `providers` (`refreshProviders`, `refreshCatalog`, `createProvider`, `updateProvider`, `deleteProvider`, `testProviderConfig`, `testSavedProvider`, `syncProviderModels`, `setDefaultProvider`); nuevos componentes `CapabilityBadges.tsx`, `ProviderCard.tsx`, `AddProviderWizard.tsx` (3 pasos: elegir tipo / credenciales con test-before-save / modelo por defecto), `EditProviderModal.tsx`; `ProviderSettingsModal.tsx` reescrito con tabs `Proveedores (N) | Modelos | Avanzado`, toasts en lugar de banner global, stats reales en Avanzado (`/chat/stats/usage` endpoint nuevo), advertencia de cifrado con `LOCAL_ENCRYPTION_KEY` / `SIGNING_SECRET`. `ChatInput.tsx`: dropdown agrupado por proveedor con health dot + latency.
- [x] **HeroDemo al estilo /zen** — `apps/web/src/components/landing/HeroDemo.tsx` reescrito a client component con secuencia typewriter (query + respuesta), ThinkingBlock con timer elapsed, citations, ChatInput. Reducción de tamaño del header (`h-12`), branding `logo + CELLA` con hover fade. Paleta refactorizada a `@theme` + aliases (`apps/web/src/app/globals.css`) para administración centralizada.
- [x] **OCR configurable y medible** (sprint previo 2026-08-16) — `TESSERACT_LANGS` + tabla `ocr_scan_logs` + counters Prometheus `cella_ocr_*` + endpoint interno `/internal/ocr-metrics`.

## Estado actual del hito de seguridad
- Avance: 100% — todos los items de seguridad implementados (AV gestionado con auditoría, TTL de sesión, blacklist Redis, CSRF, rate limiting, security headers)

## Configuración actual (referencia)
```
PROVIDER_LLM=deepseek
PROVIDER_EMBEDDINGS=local
DATABASE_URL=sqlite:///./docai.db
LOCAL_MODE=true
RATE_LIMIT_ENABLED=false  # dev; activar en despliegue
RATE_LIMIT_PER_USER=true
ENABLE_METRICS=false      # activar para exponer /metrics
ENABLE_JSON_LOGS=false    # activar para logs JSON + request-id
INFRA=light  # solo Redis (cache RAG + rate limit, opcional)
```
