# Roadmap Pendiente – Cella

Resumen de mejoras priorizadas para Cella (antes DocAI). Enfocado en seguridad, búsqueda vectorial, fiabilidad del worker, observabilidad, producto y despliegue. Estado verificado al 08/08/2026 tras la limpieza de código muerto y la reconciliación docs↔código (el flujo guest/demo fue retirado; la app es 100% local en `LOCAL_MODE`).

## 0. Notación y Alcance
- Prioridad: Alta (A), Media (M), Baja (B)
- Tipo: Seguridad, Backend, Frontend, Infra, Observabilidad, Producto, Docs, Testing
- Entregables: issues/tareas discretas con criterios de aceptación

## 1) Seguridad (A) [Tipo: Seguridad, Backend, Infra]

### Ya implementado
- [x] Auth por cookies `httpOnly` + `SameSite=Lax` + `Secure` en demo/prod (`config.py`)
- [x] CSRF token en peticiones mutadoras (`security/csrf.py`)
- [x] Rate limiting por IP/ruta con ventana deslizante, Redis-backed con fallback en memoria (`rate_limit.py`, `main.py`) + headers `X-RateLimit-*`
- [x] Security headers + HSTS + CSP estricta activable (`ENABLE_CSP_STRICT`)
- [x] Validación de firma/MIME en uploads (`documents.py`)
- [x] Scan antivirus integrado y activable (`ENABLE_FILE_AV_SCAN`, `_av_scan_ok` en `documents.py`)
- [x] Blacklist/invalidación de tokens persistente en SQLite (`RevokedToken` en `auth_simple.py`)

### Pendiente
- [ ] Antivirus: sustituir ClamAV por un servicio gestionado o firmar proveedor
  - Aceptación: logs de auditoría de cada escaneo
- [ ] Rate limiting persistente por usuario (hoy se limita por IP; la clave puede incluir `user_id` cuando exista token)
  - Aceptación: límites sobreviven reinicios con Redis; 429 consistente; métricas por IP/usuario
- [ ] Migrar blacklist de tokens de SQLite a Redis
  - Aceptación: logout/revocación invalidan tokens incluso con SIGINT/reinicio

### Notas de Entorno (no romper dev)
- Cookies en dev sin `Secure` (solo `ENVIRONMENT=production` o `COOKIE_SECURE=true`)
- CSP estricta solo en prod; `RATE_LIMIT_ENABLED=false` desactiva límites en dev

## 2) Búsqueda Vectorial en Postgres (A) [Tipo: Backend, Infra]
- Migrar embeddings de SQLite (`database_simple`) a `pgvector` con índices IVFFlat/HNSW
  - Alembic: crear extensión, tablas y columnas vector
  - Aceptación: consultas KNN con latencia <50 ms en dataset de ejemplo
- Proceso de indexación y mantenimiento
  - Normalización de dimensiones, manejo de versiones de embeddings
  - Aceptación: reindex sin downtime; tareas programadas de vacuum/analyze

## 3) Cola de Trabajos Robusta (A) [Tipo: Backend, Infra]
- Introducir Redis + RQ/Celery para procesamiento de documentos (hoy síncrono en `apps/worker`)
  - Retries con backoff, DLQ, observabilidad del estado
  - Aceptación: reintentos automáticos; panel de estado; idempotencia garantizada
- Contratos de jobs
  - Estructurar payloads, timeouts, límites de memoria/tiempo por tipo de documento
  - Aceptación: jobs grandes no bloquean; cancelación y reanudación

## 4) Observabilidad End-to-End (A) [Tipo: Observabilidad, Backend, Infra]
- Métricas (Prometheus/FastAPI Instrumentator) y dashboards (Grafana)
  - p50/p95/p99, error rate, throughput, colas, uso de tokens
  - Aceptación: tableros listos; alertas disparan según umbrales definidos
- Logs estructurados y correlación
  - JSON logs, request-id, correlación frontend-backend-worker
  - Aceptación: trazabilidad de una petición desde el UI a la respuesta IA
- Tracing distribuido (OpenTelemetry)
  - Exportadores a OTLP; spans en auth, upload, RAG
  - Aceptación: traces visibles con latencias por segmento

## 5) Producto y Experiencia (M) [Tipo: Producto, Frontend, Backend]
- Exportación de conversaciones y resúmenes (Markdown/JSON)
  - Implementado en `routers/exports.py` (MD/JSON con citas); PDF pendiente vía frontend (`window.print()`/lib en navegador, `reportlab` fue retirado)
  - Aceptación: botón en UI; endpoints de export; metadatos incluidos
- Límites por plan y contadores
  - Backend: enforcement por usuario (documentos, tamaño, chats); headers de cuota
  - Frontend: feedback de límites y upsell
  - Aceptación: respuestas 402/429 correctas; UI muestra estado de uso
- OCR configurable
  - Integración Tesseract/servicio; idiomas; costos; colas
  - Aceptación: PDFs escaneados procesados con calidad medible

## 6) Testing y Calidad (M)
- [x] Tests de seguridad (cookies/rate/CSRF) en `apps/api/tests/test_security.py`
- [x] Tests RAG (ranking y citas) en `apps/api/tests/test_rag.py`
- [ ] E2E (Playwright) estable en CI

## 7) Despliegue y Entorno (M)
- [x] Demo Mode retirado — la app es 100% local (`LOCAL_MODE=true`), sin registro ni cuentas
- [ ] Nginx/TLS (HSTS) en prod
- [ ] Pipeline CI/CD con gates de calidad

## 8) Documentación (B)
- [x] STATUS.md actualizado con la limpieza y el rediseño
- [ ] Guía Alembic y runbooks de incidentes

## Estado actual del hito de seguridad
- Avance estimado: ~80% (faltan AV gestionado, rate limit por usuario con Redis y blacklist en Redis)

## Configuración actual (referencia)
```
PROVIDER_LLM=deepseek
PROVIDER_EMBEDDINGS=local
DATABASE_URL=sqlite:///./docai.db
LOCAL_MODE=true
RATE_LIMIT_ENABLED=false  # dev; activar en despliegue
INFRA=light  # solo Redis (cache RAG + rate limit, opcional)
```
