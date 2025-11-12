# Roadmap Pendiente – DocAI
Resumen de mejoras priorizadas derivadas del análisis de DOCUMENTACION.md. Enfocado en seguridad, búsqueda vectorial, fiabilidad del worker, observabilidad, producto y despliegue.

## 0. Notación y Alcance
- Prioridad: Alta (A), Media (M), Baja (B)
- Tipo: Seguridad, Backend, Frontend, Infra, Observabilidad, Producto, Docs, Testing
- Entregables: issues/tareas discretas con criterios de aceptación

## 1) Seguridad Crítica (A) [Tipo: Seguridad, Backend, Frontend]
- Migrar autenticación a cookies httpOnly + SameSite (Lax/Strict) y Secure en prod
  - Backend: endpoint para set-cookie/refresh, rotación de tokens, invalidación (blacklist/Redis)
  - Frontend: remover uso de localStorage; adaptar cliente HTTP a cookies
  - Aceptación: login/refresh/logout funcionan solo con cookies, sin exposición a JS
- Rate limiting por endpoint (login, upload, chat)
  - Implementar `slowapi` o capa en gateway/reverso (Nginx/Cloud)
  - Aceptación: 429 ante exceso; métricas por IP/usuario
- Security headers y CSP estricta (sin 'unsafe-inline' en prod)
  - HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
  - Aceptación: verificados en respuestas; reporte CSP opcional
- Escaneo y validación de archivos
  - Mimetype y firma; integración ClamAV/servicio AV
  - Aceptación: bloquea archivos maliciosos; logs de auditoría
- Sanitización y escape de contenido en frontend
  - Aceptación: sin XSS reflejado/almacenado en vistas de chat/visor

### Notas de Implementación Segura en Localhost (no romper dev)
- Cookies en dev: usar cookies sin `Secure` solo en `ENV=development`; en producción forzar `Secure`, `httpOnly`, `SameSite=Lax/Strict`.
- CORS + credenciales: mantener `allow_origins=["http://localhost:3000"]` y `allow_credentials=True`; en frontend usar `fetch(..., { credentials: 'include' })`.
- CSP por entorno: aplicar CSP estricta solo en producción; en dev permitir `unsafe-inline` temporalmente si es necesario para no romper el UI.
- Migración gradual de tokens: conservar compatibilidad temporal leyendo `localStorage.token` y migrarlo a cookies en el primer login/visita; luego retirar su uso.
- Rate limiting en dev: desactivable o con umbrales altos vía `RATE_LIMIT_ENABLED=false` o límites amplios; activar límites reales solo en prod.
- Feature flags: proteger escaneo AV y nuevas validaciones con flags para habilitar/deshabilitar por entorno.

## 2) Búsqueda Vectorial en Postgres (A) [Tipo: Backend, Infra]
- Migrar embeddings a `pgvector` con índices apropiados (IVFFlat/HNSW)
  - Alembic: crear extensión, tablas y columnas vector
  - Aceptación: consultas KNN con latencia <50 ms en dataset de ejemplo
- Proceso de indexación y mantenimiento
  - Normalización de dimensiones, manejo de versiones de embeddings
  - Aceptación: reindex sin downtime; tareas programadas de vacuum/analyze

## 3) Cola de Trabajos Robusta (A) [Tipo: Backend, Infra]
- Introducir Redis + RQ/Celery para procesamiento
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
  - Aceptación: botón en UI; endpoints de export; metadatos incluidos
- Límites por plan y contadores
  - Backend: enforcement por usuario (documentos, tamaño, chats); headers de cuota
  - Frontend: feedback de límites y upsell
  - Aceptación: respuestas 402/429 correctas; UI muestra estado de uso
- OCR configurable
  - Integración Tesseract/servicio; idiomas; costos; colas
  - Aceptación: PDFs escaneados procesados con calidad medible

### Opcionales útiles (Demo invitado `/new`) (M)
- Cerrar sesión de invitado desde `/new`
  - Botón que borra cookie y crea una nueva sesión guest.
  - Aceptación: nueva identidad guest tras pulsar, sin dejar residuos del anterior.
- Límites por invitado (cuotas)
  - Máx. documentos activos, tamaño total y/o chats por minuto; headers de cuota y toasts.
  - Aceptación: rechazos 429/402 consistentes; UI informa límite y sugiere registro.
- Magic link opcional (portar sesión entre dispositivos)
  - Token de un solo uso y TTL corto para cargar la misma sesión guest en móvil.
  - Aceptación: re‑asigna sesión sin exponer credenciales, auditable.
- Mejoras QR en `/new`
  - Mostrar botón QR también en móviles (visibilidad condicional por viewport) y copiar enlace público.
  - Aceptación: QR visible en todas las vistas; copia al portapapeles.
- Helper común de fetch con CSRF
  - Unificar `credentials: 'include'` y cabecera `x-csrf-token` en mutaciones.
  - Aceptación: todas las mutaciones usan el helper; menos duplicación.
- Rate limiting por invitado
  - Parámetros diferenciados para invitados (upload/chat) con métricas.
  - Aceptación: límites activos por usuario guest; cabeceras `X-RateLimit-*` coherentes.
- Retención y auto‑borrado
  - Auto‑delete de documentos guest tras N horas/días (además de limpieza por usuario).
  - Aceptación: documentos eliminados según política; logs y métricas.

## 6) Testing y Calidad (M) [Tipo: Testing]
- Tests de seguridad
  - CSRF, rate limit, cookies httpOnly, subida de archivos
  - Aceptación: cobertura mínima 80% en módulos sensibles
- Tests RAG
  - Mocks de Gemini; ranking y citas reproducibles; casos de borde
  - Aceptación: precisión mínima en top-k sobre dataset de prueba
- E2E Frontend (Playwright)
  - Flujos: registro/login, upload, chat, exportación
  - Aceptación: suite estable en CI con artefactos de screenshots

## 7) Despliegue y Entorno (M) [Tipo: Infra, DevOps]
- Docker endurecido
  - Imágenes slim, non-root, healthchecks, redes separadas, read-only fs donde aplique
  - Aceptación: contenedores pasan `docker scout`/linters básicos
- Gestión de secretos y configuraciones
  - `.env` solo para dev; en prod usar secrets manager/vars del proveedor
  - Aceptación: sin secretos en imagen; rotación documentada
- Pipelines CI/CD
  - Gates de calidad, escaneo de dependencias, migrations automáticas con aprobación
  - Aceptación: despliegue reproducible y auditable

## 8) Documentación y Migraciones (B) [Tipo: Docs]
- Guía de migraciones Alembic (DB versioning)
  - Aceptación: pasos para crear/aplicar/revertir; políticas de cambio
- Runbooks de incidentes
  - Aceptación: SOP para caídas de worker, picos en colas, errores 5xx
- Política de backups y DR
  - Aceptación: RPO/RTO definidos; pruebas de restore documentadas

## Hitos Sugeridos
- Hito 1 (2–3 semanas): Seguridad crítica + cookies httpOnly + rate limiting + headers + validación de archivos
- Hito 2 (2 semanas): pgvector + migraciones Alembic + consultas KNN + dashboards básicos
- Hito 3 (2 semanas): Redis + RQ/Celery con retries + observabilidad (métricas, logs, tracing)
- Hito 4 (2 semanas): Exportaciones + límites por plan + OCR configurable + E2E

## Dependencias y Riesgos
- Gemini/embeddings: versionado y posibles cambios de cuota
- React/Next versiones recientes: compatibilidad de dependencias
- Costos de infraestructura (Redis, monitoreo, almacenamiento)

## Métricas de Éxito
- Tasa de errores < 1% en API crítica
- p95 upload < 1.5s (sin procesamiento), p95 chat < 2.5s
- Tiempo de procesamiento promedio por documento < N segundos según tamaño
- Disponibilidad 99.9% servicios públicos

---

## Actualización 29/09/2025 – Progreso Fase 1 + Demo Mode

Resumen de avance realizado para preparar la demo en conferencia. Detalla qué puntos del roadmap se han cubierto parcial o totalmente y cuáles quedan pendientes.

1) Seguridad Crítica (A)
- Cookies httpOnly + SameSite=Lax + Secure en prod/demo: Implementado (backend emite set‑cookie; frontend migra a `credentials: 'include'`). Refresh/rotación y logout con invalidación en memoria. Pendiente: CSRF y blacklist persistente (Redis).
- Rate limiting por endpoint (login/upload/chat): Implementado middleware in‑memory con umbrales configurables por `.env`. Pendiente: sustitución por slowapi/Redis para producción.
- Security headers y CSP estricta: Implementado middleware con HSTS (prod/demo) y CSP activable por flag (`ENABLE_CSP_STRICT`).
- Validación de archivos: Firmas/MIME verificados (PDF/DOCX/PPTX/TXT). AV opcional por flag (`ENABLE_FILE_AV_SCAN`). Pendiente: integración real con ClamAV/servicio AV.
- Sanitización/escape frontend: Pendiente revisión de vistas (chat/visor) para XSS almacenado/reflejado.

2) Búsqueda Vectorial en Postgres (A)
- Sin cambios en esta iteración (se mantiene SQLite simple para la demo). Pendiente: pgvector, índices y Alembic.

3) Cola de Trabajos Robusta (A)
- No abordado aún. Pendiente: Redis + RQ/Celery, retries y DLQ.

4) Observabilidad End‑to‑End (A)
- No abordado aún. Pendiente: métricas, logs estructurados y tracing.

5) Producto y Experiencia (M)
- Exportaciones: UI y endpoints presentes; uso migrado a cookies. Pendiente consolidar formatos/artefactos y límites por plan.

6) Testing y Calidad (M)
- Pendiente: tests de seguridad (cookies/rate/CSRF), RAG y E2E.

7) Despliegue y Entorno (M)
- Demo Mode implementado (hardening, flags, limpieza periódica, reset admin, QR en UI). Pendiente: Nginx/TLS y pipeline CI/CD para prod.

8) Documentación y Migraciones (B)
- Documentación actualizada: anexo en `DOCUMENTACION.md` y `STATUS.md`, política de demo en `/docs/demo`. Pendiente: guía de Alembic y runbooks de incidentes.

Notas Demo Mode
- Flags: `DEMO_PUBLIC`, `DEMO_REGISTRATION_ENABLED`, `DEMO_AUTO_CLEAN_HOURS`, `DEMO_WHITELIST_EMAILS`.
- Endpoint admin: `POST /admin/demo/reset` (whitelist requerido).
- Semillas: `scripts/seed_demo.py` (demo1@docai.local / demo1234).
- UI: badges/avisos Demo y QR modal en landing/dashboard; footer con “Política de Demo”.

Estado del Hito 1
- Avance estimado: ~80% (faltan CSRF, AV real y endurecer rate limiting en infraestructura).

### Checklist Visual (29/09/2025)

- Seguridad Crítica
  - [x] Cookies httpOnly + `SameSite=Lax` + `Secure` en prod/demo
  - [x] Rate limiting básico por endpoint (login/upload/chat)
  - [x] Security headers + CSP (activable por flag)
  - [x] Validación de firma/MIME en uploads
  - [ ] Antivirus real integrado (ClamAV/servicio)
  - [x] CSRF tokens en peticiones mutadoras
  - [ ] Blacklist/invalidación persistente (Redis)

- Búsqueda Vectorial (pgvector)
  - [ ] Migraciones Alembic + extensión pgvector
  - [ ] Índices IVFFlat/HNSW y consultas KNN

- Cola de Trabajos
  - [ ] Redis + RQ/Celery con retries/backoff
  - [ ] DLQ + panel de estado

- Observabilidad
  - [ ] Métricas (p50/p95/p99), error rate, throughput
  - [ ] Logs estructurados + correlación request-id
  - [ ] Tracing distribuido (OpenTelemetry)

- Producto/Experiencia
  - [ ] Exportaciones consolidadas (formatos/artefactos) y límites por plan

- Testing
  - [ ] Tests de seguridad (cookies/rate/CSRF)
  - [ ] Tests RAG (ranking y citas)
  - [ ] E2E (Playwright) estable en CI

- Despliegue/Entorno
  - [x] Demo Mode (flags, limpieza periódica, reset admin, QR)
  - [ ] Nginx + TLS (HSTS) en prod
  - [ ] Pipelines CI/CD con gates de calidad

- Documentación
  - [x] Anexos actualizados + política de demo (/docs/demo)
  - [ ] Guía Alembic + runbooks de incidentes
