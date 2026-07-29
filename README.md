# Cella — Biblioteca IA

<p align="center">
  <img src="apps/web/public/cella-logo.svg" width="80" alt="Cella Logo" />
</p>

Tu biblioteca digital privada con inteligencia artificial. Sube documentos, chatea con ellos, genera resúmenes y mapas mentales — todo desde tu máquina, sin depender de la nube.

## Estructura

```
cella/
├── apps/
│   ├── web/          # Frontend Next.js 15 + Tailwind + shadcn/ui
│   ├── api/          # Backend FastAPI + SQLAlchemy
│   └── worker/       # Procesamiento de documentos (Celery)
├── docker/
│   └── postgres/     # init.sql para pgvector
├── docker-compose.yml  # PostgreSQL + Redis + MinIO
├── scripts/
├── start.sh          # Arranque rápido
└── .env.example      # Template de variables de entorno
```

## Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4, shadcn/ui, zustand |
| **Backend** | FastAPI, SQLAlchemy, Celery |
| **Base de datos** | PostgreSQL 16 + pgvector (embeddings) |
| **Cache / Queue** | Redis |
| **Storage** | MinIO (S3-compatible) |
| **IA / LLM** | Google Gemini, DeepSeek, Zhipu GLM |
| **Infra** | Docker Compose, Python 3.11+, Node.js 18+ |

## Instalación

```bash
# 1. Clonar
git clone https://github.com/Angelcmp/cella.git && cd cella

# 2. Variables de entorno
cp .env.example .env.local
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.localhost apps/web/.env.local

# 3. Agregar al menos una API key en apps/api/.env.local
#    GEMINI_API_KEY=... (recomendado para desarrollo, gratis)

# 4. Arrancar todo
bash start.sh
```

El script levanta Docker Compose (PostgreSQL + Redis + MinIO), instala dependencias de Python/Node si no existen, y arranca backend, worker y frontend.

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Zen App | http://localhost:3000/zen |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| MinIO | http://localhost:9001 (minioadmin / minioadmin) |

## Páginas

| Ruta | Descripción |
|---|---|
| `/` | Landing page — hero, features, pricing, FAQ |
| `/pricing` | Planes (Pro próximamente) |
| `/docs` | Documentación técnica |
| `/zen` | App principal — 3 columnas: proyectos, chat IA, visor de documentos |

## Funcionalidades

- **Chat con documentos** — RAG híbrido con citas exactas del texto
- **Selector de modelos** — DeepSeek V4 Flash, GLM-4.5 Air, GLM-4.7, GLM-4.7 Flash
- **Resúmenes editoriales** — IA genera resúmenes con puntos clave y tópicos
- **Mapas mentales** — Visualización interactiva de conceptos del documento
- **Quizzes** — Evaluación de comprensión generada por IA
- **Proyectos** — Carpetas para organizar documentos y conversaciones
- **Conversaciones** — Editar título, anclar, eliminar, historial completo
- **Exportación** — Conversaciones a PDF, DOCX o TXT
- **Sesiones guest** — Sin registro, tus documentos son locales
- **Tema claro/oscuro** — Paleta editorial cálida (espresso, taupe, ámbar)

## Requisitos

- Docker + Docker Compose
- Python ≥ 3.10
- Node.js ≥ 18
- Una API key de Gemini (gratis en [Google AI Studio](https://aistudio.google.com/app/apikey))

## Licencia

MIT
