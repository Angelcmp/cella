# Roadmap Pendiente – Cella

Resumen de mejoras priorizadas para Cella (antes DocAI). Enfocado en seguridad, búsqueda vectorial, fiabilidad del worker, observabilidad, producto y despliegue. Estado verificado al 08/08/2026 tras la limpieza de código muerto, la reconciliación docs↔código y el sprint de worker/observabilidad/E2E (el flujo guest/demo fue retirado; la app es 100% local en `LOCAL_MODE`).

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
- [ ] Antivirus: sustituir ClamAV por un servicio gestionado o firmar proveedor
  - Aceptación: logs de auditoría de cada escaneo
- [ ] Política de expiración/TTL de tokens de sesión

### Notas de Entorno (no romper dev)
- Cookies en dev sin `Secure` (solo `ENVIRONMENT=production` o `COOKIE_SECURE=true`)
- CSP estricta solo en prod; `RATE_LIMIT_ENABLED=false` desactiva límites en dev
- Redis opcional (`INFRA=light`): si cae, rate limit y blacklist hacen fallback a SQLite/en memoria

## 2) Búsqueda Vectorial en Postgres (B) [Tipo: Backend, Infra] — Fuera de alcance local
- Migrar embeddings de SQLite (`database_simple`) a `pgvector` con índices IVFFlat/HNSW
- Proceso de indexación y mantenimiento
- **Nota**: requiere pasar a Postgres en modo local (hoy `DATABASE_URL=sqlite`). Aplazado; relevante solo si se reactiva el modo servidor/despliegue.

## 3) Cola de Trabajos Robusta (A) [Tipo: Backend, Infra]

### Ya implementado
- [x] Retries con backoff exponencial en `apps/worker/worker.py` (`backoff_for`, `due_for_retry`)
  - Hasta `WORKER_MAX_ATTEMPTS` (default 3), `WORKER_BACKOFF_BASE_SECONDS` (default 5)
  - Documentos en `failed` se reencolan automáticamente cuando vence la ventana de backoff; tras agotar intentos quedan en estado `failed` con `last_error`
- [x] Reprueba manual: `POST /api/documents/{document_id}/reprocess` + botón "Reprocesar documento" en la UI (`ChatPanel.tsx`)
- [x] Visibilidad del estado: columnas `attempts`, `last_error`, `last_attempt_at` en `Document` (SQLite, migración aditiva) expuestas en la API y mostradas en `LeftSidebar`
- [x] Tests de backoff en `apps/api/tests/test_worker.py`

### Pendiente
- [ ] DLQ explícita o panel de estado del worker (hoy se consulta vía documentos en `failed`)
- [ ] Idempotencia garantizada si el proceso muere a mitad de un job

## 4) Observabilidad End-to-End (M) [Tipo: Observabilidad, Backend, Infra]

### Ya implementado
- [x] Métricas Prometheus en `/metrics` (`ENABLE_METRICS=true`): `http_requests_total` (status/method), `http_request_duration_seconds` (histograma), `rate_limited_total` (`apps/api/metrics.py`)
- [x] Logs estructurados: JSON opcional (`ENABLE_JSON_LOGS=true`), request-id en cada petición, logs de inicio/finalización de petición en `main.py`
- [x] Tests de métricas y request-id en `apps/api/tests/test_security.py`

### Pendiente
- [ ] Dashboards Grafana y alertas (requiere despliegue Prometheus + Grafana)
- [ ] Tracing distribuido (OpenTelemetry/OTLP): spans en auth, upload, RAG
  - Aceptación: traces visibles con latencias por segmento

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

### Pendiente
- [ ] OCR: idiomas configurable, colas y calidad medible
- [ ] Límites por plan y contadores (solo si se reactiva modo servidor/SaaS)
  - Aceptación: respuestas 402/429 correctas; UI muestra estado de uso

## 6) Testing y Calidad (M)
- [x] Tests de seguridad (cookies/rate/CSRF/métricas/request-id) en `apps/api/tests/test_security.py`
- [x] Tests RAG (ranking y citas) en `apps/api/tests/test_rag.py`
- [x] Tests de worker (backoff/reencolado) en `apps/api/tests/test_worker.py`
- [x] E2E Playwright: `apps/web/tests/e2e/smoke.spec.ts` (landing, /docs, /zen) con `playwright.config.ts` (puerto 3100)
- [x] CI/CD en `.github/workflows/ci.yml`: jobs backend (pytest), frontend (typecheck+lint+build) y e2e (Playwright chromium)

## 7) Despliegue y Entorno (M)
- [x] Demo Mode retirado — la app es 100% local (`LOCAL_MODE=true`), sin registro ni cuentas
- [ ] Nginx/TLS (HSTS) en prod (solo si despliegue servidor)
- [x] Pipeline CI/CD con gates de calidad

## 8) Documentación (B)
- [x] STATUS.md actualizado con la limpieza y el rediseño
- [x] README.md actualizado con el sprint (stack, funcionalidades, API, testing/CI, docs adicionales)
- [x] Runbooks de incidentes en `docs/RUNBOOKS.md` (arranque/parada, troubleshooting Redis, worker, doc en `failed`)

## Estado actual del hito de seguridad
- Avance estimado: ~90% (falta solo AV gestionado y expiración de sesión)

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
