# Roadmap Pendiente – Cella

Resumen de mejoras priorizadas para Cella (antes DocAI). Enfocado en seguridad, búsqueda vectorial, fiabilidad del worker, observabilidad, producto y despliegue. Estado verificado al 04/08/2026 tras la limpieza de código muerto.

## 0. Notación y Alcance
- Prioridad: Alta (A), Media (M), Baja (B)
- Tipo: Seguridad, Backend, Frontend, Infra, Observabilidad, Producto, Docs, Testing
- Entregables: issues/tareas discretas con criterios de aceptación

## 1) Seguridad (A) [Tipo: Seguridad, Backend, Infra]

### Ya implementado
- [x] Auth por cookies `httpOnly` + `SameSite=Lax` + `Secure` en demo/prod (`config.py`, `/auth/guest`)
- [x] CSRF token en peticiones mutadoras (`security/csrf.py`)
- [x] Rate limiting básico por IP/ruta en memoria (login, upload, chat, guest)
- [x] Security headers + HSTS + CSP estricta activable (`ENABLE_CSP_STRICT`)
- [x] Validación de firma/MIME en uploads

### Pendiente
- [ ] Antivirus real integrado (ClamAV/servicio) en uploads
  - Flag `ENABLE_FILE_AV_SCAN` existe pero no hay integración real
  - Aceptación: bloquea archivos maliciosos; logs de auditoría
- [ ] Rate limiting persistente y por usuario (hoy es en memoria, solo por IP)
  - Mover de `defaultdict` en `main.py` a Redis con ventana deslizante
  - Aceptación: límites sobreviven reinicios; 429 consistente; métricas por IP/usuario
- [ ] Blacklist/invalidación persistente de tokens (Redis)
  - Aceptación: logout/revocación invalidan tokens incluso con SIGINT/reinicio

### Notas de Entorno (no romper dev)
- Cookies en dev sin `Secure` (solo `ENVIRONMENT=production` o `DEMO_PUBLIC=true`)
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
- Exportación de conversaciones y resúmenes (PDF/Markdown/JSON)
  - Router `exports` eliminado en la limpieza; decidir si se reimplementa
  - Aceptación: botón en UI; endpoints de export; metadatos incluidos
- Límites por plan y contadores
  - Backend: enforcement por usuario (documentos, tamaño, chats); headers de cuota
  - Frontend: feedback de límites y upsell
  - Aceptación: respuestas 402/429 correctas; UI muestra estado de uso
- OCR configurable
  - Integración Tesseract/servicio; idiomas; costos; colas
  - Aceptación: PDFs escaneados procesados con calidad medible

### Invitado (demo `/new`) (M)
- [x] Cuota de documentos por invitado (`GUEST_MAX_DOCUMENTS=1` en `documents.py`)
- [ ] Cerrar sesión de invitado desde `/new`
  - Botón que borra cookie y crea una nueva sesión guest
  - Aceptación: nueva identidad guest tras pulsar, sin dejar residuos
- [ ] Límites por invitado ampliados (tamaño total y/o chats por minuto)
  - Headers de cuota y toasts; rechazos 429/402 consistentes
- [ ] Magic link opcional (portar sesión entre dispositivos)
  - Token de un solo uso y TTL corto para cargar la misma sesión guest en móvil

## 6) Testing y Calidad (M)
- [ ] Tests de seguridad (cookies/rate/CSRF)
- [ ] Tests RAG (ranking y citas)
- [ ] E2E (Playwright) estable en CI

## 7) Despliegue y Entorno (M)
- [x] Demo Mode (flags, limpieza periódica, guest, cuotas)
- [ ] Nginx/TLS (HSTS) en prod
- [ ] Pipeline CI/CD con gates de calidad

## 8) Documentación (B)
- [x] STATUS.md actualizado con la limpieza y el rediseño
- [ ] Guía Alembic y runbooks de incidentes

## Estado actual del hito de seguridad
- Avance estimado: ~70% (faltan AV real, rate limiting persistente y blacklist Redis)

## Configuración actual (referencia)
```
PROVIDER_LLM=deepseek
PROVIDER_EMBEDDINGS=local
DATABASE_URL=sqlite:///./docai.db
DEMO_PUBLIC=true
DEMO_GUEST_ENABLED=true
INFRA=light  # solo Redis (cache RAG, opcional)
```
