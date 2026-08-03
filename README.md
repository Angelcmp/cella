# Cella — Biblioteca IA

Tu biblioteca digital privada con inteligencia artificial. Sube documentos, chatea con su contenido y genera resúmenes, mapas mentales y quiz — todo local, sin depender de la nube.

## Estructura

```
cella/
├── apps/
│   ├── web/          # Frontend Next.js 15 + Tailwind CSS 4 + TypeScript
│   ├── api/          # Backend FastAPI + SQLite (database_simple)
│   └── worker/       # Worker de procesamiento (polling, sin Celery)
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
| **Worker** | Polling loop (no Celery) |
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
- **Sesiones guest** — Sin registro, entrada directa
- **Embeddings locales** — FastEmbed, sin API key externa
- **Tema claro/oscuro** — Paleta purple + slate + white

## API

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/guest` | Sesión de invitado |
| `GET` | `/auth/me` | Usuario actual |
| `POST` | `/documents/upload` | Subir documento |
| `GET` | `/documents/` | Listar documentos |
| `GET` | `/documents/{id}` | Obtener documento |
| `GET` | `/documents/{id}/content` | Contenido paginado |
| `GET/POST` | `/documents/{id}/summary` | Resumen del documento |
| `POST` | `/documents/{id}/mindmap` | Mapa mental |
| `GET` | `/documents/{id}/mindmap` | Recuperar mindmap guardado |
| `POST` | `/documents/{id}/quiz` | Quiz |
| `POST` | `/chat/documents/{id}` | Chat RAG (SSE opcional) |
| `GET` | `/health` | Estado del servicio |

## Requisitos

- Python ≥ 3.11
- Node.js ≥ 18
- DeepSeek API key ([platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys))
- Zhipu API key ([open.bigmodel.cn](https://open.bigmodel.cn)) — embeddings GLM
- Redis (opcional con `INFRA=light`)
- Docker (opcional, solo para prod)

## Licencia

MIT
