# Cella — Biblioteca IA

Tu biblioteca digital privada con inteligencia artificial. Sube documentos, chatea con su contenido y genera resúmenes, mapas mentales y quiz — todo local, sin depender de la nube.

## Estructura

```
cella/
├── apps/
│   ├── web/          # Frontend Next.js 15 + Tailwind CSS 4 + TypeScript
│   ├── api/          # Backend FastAPI + SQLite (database_simple)
│   └── worker/       # Worker de procesamiento (polling con retries y backoff)
├── .github/workflows/ci.yml # CI/CD: pytest + typecheck + build + E2E Playwright
├── docs/RUNBOOKS.md # Guías de arranque/parada y troubleshooting
├── start.sh          # Arranque rápido (INFRA=light)
├── .env.example      # Template de variables de entorno
└── docker-compose.yml # PostgreSQL + Redis + MinIO (opcional, prod)
```

## Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4, zustand, sonner, cytoscape, lucide |
| **Backend** | FastAPI, SQLAlchemy |
| **Base de datos** | SQLite (activa, `docai.db`) |
| **Cache** | Redis (opcional, modo light) |
| **Storage** | Sistema de archivos local (uploads/) |
| **IA / LLM** | DeepSeek V4 Flash (chat principal), GLM-4.5/4.7 (Zhipu) |
| **Embeddings** | FastEmbed local (`BAAI/bge-small-en-v1.5`, 384-dim), sin API key |
| **Worker** | Polling loop con retries exponenciales y reencolado de fallidos (no Celery) |
| **Font** | Work Sans (landing), Inter (app) + JetBrains Mono (code) |

## Instalación

```bash
# 1. Clonar
git clone https://github.com/Angelcmp/cella.git && cd cella

# 2. Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
# Editar: DEEPSEEK_API_KEY, ZHIPU_API_KEY

# 3. Arrancar (modo light: solo Redis)
INFRA=light bash start.sh
# O manual:
#   Terminal 1: cd apps/api && python main.py
#   Terminal 2: cd apps/worker && python worker.py
#   Terminal 3: cd apps/web && npm run dev
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Zen App | http://localhost:3000/zen |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Páginas

| Ruta | Descripción |
|---|---|
| `/` | Landing page — hero con demo del chat, features, flujo de trabajo |
| `/pricing` | Planes |
| `/docs` | Documentación técnica |
| `/zen` | App principal — upload, chat RAG, resúmenes, mapas mentales, quiz |

## Funcionalidades

- **Chat RAG con citas** — Preguntas con fragmentos exactos y número de página
- **Streaming SSE** — Respuestas en tiempo real con thinking blocks visibles
- **Resúmenes** — Síntesis ejecutivas con puntos clave generados por IA
- **Mapas mentales** — Grafos interactivos con Cytoscape.js
- **Quiz** — Preguntas de opción múltiple desde el contenido
- **Multi-modelo** — DeepSeek V4 Flash, GLM-4.5 Flash, GLM-4.7
- **Embeddings locales** — FastEmbed, sin API key externa
- **Exportar conversaciones** — Markdown/JSON/PDF con citas
- **Reproceso de documentos fallidos** — reintentos automáticos con backoff + botón manual
- **Observabilidad** — métricas Prometheus (`/metrics`), request-id y logs JSON
- **Tema claro/oscuro** — Paleta purple + slate + white

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/auth/me` | Usuario actual |
| `POST` | `/documents/upload` | Subir documento |
| `GET` | `/documents/` | Listar documentos |
| `GET` | `/documents/{id}` | Obtener documento |
| `POST` | `/documents/{id}/reprocess` | Reprocesar documento (reintentar) |
| `GET` | `/documents/{id}/content` | Contenido paginado |
| `GET/POST` | `/documents/{id}/summary` | Resumen del documento |
| `POST` | `/documents/{id}/mindmap` | Mapa mental |
| `GET` | `/documents/{id}/mindmap` | Recuperar mindmap guardado |
| `POST` | `/documents/{id}/quiz` | Quiz |
| `GET/POST` | `/documents/{id}/study-guide` | Guía de estudio |
| `GET/POST` | `/documents/{id}/faq` | FAQ |
| `GET/POST/DELETE` | `/documents/{id}/notes` | Notas por documento |
| `POST` | `/chat/documents/{id}` | Chat RAG (SSE opcional) |
| `GET` | `/conversations` | Listar conversaciones |
| `GET` | `/conversations/{id}/export?format=md\|json` | Exportar conversación |
| `GET` | `/models` | Modelos disponibles |
| `GET` | `/providers` | Proveedores/configuración |
| `GET` | `/metrics` | Métricas Prometheus (solo si `ENABLE_METRICS=true`) |
| `GET` | `/health` | Estado del servicio |

## Testing y CI

| Suite | Comando | Estado |
|---|---|---|
| Backend (seguridad, RAG, worker) | `cd apps/api && .venv311/bin/python -m pytest -q` | 20 tests verdes |
| TypeScript | `cd apps/web && npm run typecheck` | Sin errores |
| E2E (Playwright) | `cd apps/web && npm run test:e2e` | 3 specs verdes |

CI/CD automatizado en `.github/workflows/ci.yml`: jobs **backend** (pytest), **frontend** (typecheck + lint + build) y **e2e** (Playwright chromium).

## Requisitos

- Python ≥ 3.11
- Node.js ≥ 18
- DeepSeek API key ([platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys))
- Zhipu API key ([open.bigmodel.cn](https://open.bigmodel.cn)) — embeddings GLM
- Redis (opcional con `INFRA=light`)
- Docker (opcional, solo para prod)

## Documentación adicional

- `docs/RUNBOOKS.md` — arranque/parada, troubleshooting de Redis, worker y documentos en `failed`, y notas de migraciones
- `ROADMAP_PENDIENTE.md` — roadmap priorizado y estado de implementación

## Licencia

MIT
