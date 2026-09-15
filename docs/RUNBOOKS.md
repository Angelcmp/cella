# Runbooks – Cella

Guías operativas para arrancar, detener y resolver incidentes de Cella en modo local (`LOCAL_MODE=true`). El despliegue es monoproceso por servicio; todo corre en la misma máquina.

## Arquitectura en local

| Servicio | Comando | Puerto |
|---|---|---|
| Backend (FastAPI/uvicorn) | `apps/api/main.py` (vía `start.sh`) | 8000 |
| Worker (procesamiento de docs) | `apps/worker/worker.py` (vía `start.sh`) | — (polling) |
| Frontend (Next.js) | `apps/web` (`npm run dev`) | 3000 |
| Redis (opcional) | `redis-server` o Docker (modo `INFRA=light`) | 6379 |

Datos: SQLite en `docai.db` (backend). Cache RAG + rate limit + blacklist de tokens usan Redis si está disponible; si no, hacen fallback en memoria/SQLite.

## Arranque

```bash
./start.sh                    # todo (backend + worker + frontend + Redis si existe)
SKIP_REDIS=1 ./start.sh       # sin Redis (cache en memoria)
docker compose up redis       # solo Redis (opcional)
# Monitoring (opcional, profiles):
docker compose --profile monitoring up prometheus grafana
```

Luego visita:
- App: http://localhost:3000/zen
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
- Métricas (con ENABLE_METRICS=true): http://localhost:8000/metrics
- Grafana (con monitoring): http://localhost:3001 (anon, sin login)
- Worker status (JSON): http://localhost:8000/worker/status
- Uso (JSON): http://localhost:8000/usage

Verificación rápida:

```bash
curl -s localhost:8000/health              # backend
curl -s -o /dev/null -w "%{http_code}" localhost:3000/zen   # frontend (200)
```

## Parada

`Ctrl+C` sobre `start.sh` cierra backend, worker y frontend (y Redis si lo levantó el propio script). Si quedan procesos huérfanos:

```bash
pkill -f "uvicorn main:app"; pkill -f "apps/worker/worker.py"; pkill -f "next dev"
```

## Workers y documentación

El worker hace polling de documentos `pending` y `failed` cada `WORKER_POLL_SECONDS` (default 10).

- Documentos en `failed` se reintentan automáticamente con backoff exponencial (`WORKER_BACKOFF_BASE_SECONDS`, default 5) hasta `WORKER_MAX_ATTEMPTS` (default 3).
- Reproceso manual: botón "Reprocesar documento" en la UI o `POST /api/documents/{id}/reprocess`.
- Estado por documento: `attempts`, `last_error`, `last_attempt_at` (visibles en la API y en el sidebar).

Variables útiles del worker:

```bash
WORKER_POLL_SECONDS=10        # intervalo de polling
WORKER_BACKOFF_BASE_SECONDS=5 # base del backoff exponencial
WORKER_MAX_ATTEMPTS=3         # intentos máximos antes de fallo definitivo
```

## Runbooks de incidentes

### 1. El frontend carga pero el backend no responde

Síntoma: errores de red en `/zen`, `/health` no responde en :8000.

1. ¿Está corriendo? `curl -s localhost:8000/health` o `ps aux | grep uvicorn`.
2. Arranca: `cd apps/api && .venv311/bin/uvicorn main:app --port 8000` (o reinicia `start.sh`).
3. Si el puerto está ocupado: `lsof -i :8000` para ver el PID.

### 2. Redis caído (o no disponible)

Síntoma: la app funciona, pero con caché en memoria; la blacklist de tokens usa SQLite; el rate limit usa contadores en memoria (se resetean al reiniciar el backend).

1. Esto es **fallback esperado** — no bloquea la app.
2. Para restaurar Redis: `redis-server --daemonize yes --port 6379` o `docker compose up -d redis`.
3. Verificar: `redis-cli ping` → `PONG`.

Nota: en modo local no hay tokens externos, así que la blacklist rara vez es crítica; en despliegue servidor conviene tener Redis siempre disponible.

### 3. Un documento se queda en `failed` o `pending` indefinidamente

1. Consultar el error: `GET /api/documents` (incluye `last_error`, `attempts`).
2. Causas típicas:
   - El modelo LLM/embeddings no está disponible (Ollama apagado o API key inválida). Comprobarlo en Ajustes de la UI.
   - Archivo corrupto o formato no soportado.
   - El worker no está corriendo (`ps aux | grep worker.py`).
3. Corrección: arreglar el modelo/config, y luego:
   - Botón "Reprocesar documento" en la UI, o
   - `curl -X POST localhost:8000/api/documents/<id>/reprocess`.
4. Si tras 3 intentos sigue fallando, `last_error` persistirá; revisar el stack y corregir el documento o borrarlo y subirlo de nuevo.

### 4. El worker no arranca

1. `ps aux | grep worker.py` — ¿está el proceso?
2. Arrancar manualmente con logs a la vista:
   `cd apps/worker && ../api/.venv311/bin/python worker.py`
3. Errores típicos:
   - Falta de dependencias → `pip install -r apps/api/requirements.txt` en el venv.
   - DB corrupta o bloqueada por otro proceso → cerrar otros backend y reiniciar.
   - Excepción al procesar → aparece en consola con el stack.

### 5. `/metrics` devuelve 404

Síntoma: `curl localhost:8000/metrics` → 404.

Causa: `ENABLE_METRICS=false` (default). Activar en `.env`:

```bash
ENABLE_METRICS=true
```

Reiniciar el backend. Métricas disponibles: `http_requests_total`, `http_request_duration_seconds`, `rate_limited_total` (formato Prometheus).

### 6. Tests

```bash
cd apps/api && .venv311/bin/python -m pytest -q      # backend (seguridad + RAG + worker)
cd apps/web && npm run typecheck                      # TS
cd apps/web && npm run test:e2e                       # Playwright (requiere chromium)
```

## Migraciones de esquema

No se usa Alembic. Los cambios de esquema son **migraciones aditivas inline** en `database_simple.py` (`_migrate()`), que añaden columnas/tablas si no existen al arrancar. Para añadir un campo: agregarlo al modelo y crear la columna con `ALTER TABLE ... ADD COLUMN` (si no existe) en `_migrate()`.

## Antivirus

- Activar: `ENABLE_FILE_AV_SCAN=true` en `.env`.
- Provider: `AV_PROVIDER=clamav` (por defecto, usa `clamscan` local) o `AV_PROVIDER=http` (servicio gestionado vía API, necesita `AV_API_URL` y `AV_API_KEY`).
- **Cada escaneo genera un registro de auditoría** en la tabla `av_scan_logs` (nombre, provider, resultado, error si hubo, duración, request_id). Aunque el escaneo falle, queda el registro.
- Si `ClamAV` no está instalado: `sudo apt install clamav clamav-daemon` (Linux) o `brew install clamav` (macOS). Luego `freshclam` para actualizar firmas.

## Worker (DLQ + Idempotencia)

- **Status**: `GET /worker/status` devuelve un resumen de la cola: docs por estado, contador DLQ (docs con `dlq=True` tras agotar intentos), y lista de entradas DLQ.
- **Claim/lease**: cada doc es reclamado por un worker atómicamente (`UPDATE ... WHERE status='pending'`). Tras `WORKER_CLAIM_TIMEOUT_SECONDS` (default 600s) los docs atascados en `processing` se recuperan a `pending` automáticamente.
- **Idempotencia**: `store_chunks_in_database` borra chunks viejos antes de insertar nuevos → procesar dos veces no duplica datos. Si un worker muere a mitad del job, el doc se reclama y reprocesa desde cero sin dañar.
- **DLQ explícita**: cuando `attempts >= WORKER_MAX_ATTEMPTS`, el doc se marca con `dlq=True` y queda como `status=failed`. El endpoint `POST /documents/{id}/reprocess` limpia el flag DLQ y reencola.

## Tracing (OpenTelemetry)

- Activar: `ENABLE_TRACING=true` y configurar `OTEL_EXPORTER_OTLP_ENDPOINT` (default `http://localhost:4317` para colector OTLP gRPC). Protocolos: `grpc` o `http/protobuf` (`OTEL_EXPORTER_OTLP_PROTOCOL`).
- Paquetes requeridos (ya en `requirements.txt`): `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp-proto-grpc`, `opentelemetry-exporter-otlp-proto-http`.
- Si están ausentes o `ENABLE_TRACING=false`, todas las llamadas a la API de tracing son no-ops.

## Límites por plan

- **Solo contadores** por defecto (`ENFORCE_PLAN_LIMITS=false`): todas las acciones se registran en `usage_events` pero no se bloquean. Visibles en `GET /usage` (API) y en el popover de Ajustes (frontend).
- **Bloqueo activo**: `ENFORCE_PLAN_LIMITS=true` → el plan del usuario (`User.plan`) dicta los límites. El mapa por defecto está en `config.py` (`PLAN_LIMITS`) y puede sobrescribirse con `PLAN_LIMITS_JSON`.
  - `documents`: límite absoluto (402 Payment Required al exceder).
  - `chats_per_day`, `summaries_per_day`: ventana de 24h (429 Too Many Requests al exceder).
- Limpiar eventos viejos: la columna `created_at` marca la ventana; los eventos tienen index por (`user_id`, `action`).

## Deploy (Nginx/TLS)

Configuración de referencia en `deploy/nginx/cella.conf`:
- Proxy reverso con TLS (Let's Encrypt vía certbot) en :443.
- Redirección HTTP→HTTPS (:80→:443).
- HSTS (`Strict-Transport-Security`), cabeceras X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- Rutas: `/` → Next.js :3000, `/api/` → FastAPI :8000, SSE streaming sin buffering, `/metrics` solo desde localhost.
- Instalación: `cp deploy/nginx/cella.conf /etc/nginx/sites-available/cella && ln -s ... /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx`.

## Monitoring (Prometheus + Grafana)

- Arranque opcional: `docker compose --profile monitoring up prometheus grafana`.
- Prometheus: http://localhost:9090 — scrapea métricas del backend (`/metrics`, requiere `ENABLE_METRICS=true` en el host con `host.docker.internal:8000`).
- Grafana: http://localhost:3001 — dashboard "Cella" con paneles de throughput, latencia, rate limits, DLQ, docs por estado, stale processing. Alertas preconfiguradas: DLQ > 0, 5xx > 5%, p95 latency > 2.5s, stale processing > 3.
