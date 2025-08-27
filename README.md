# DocAI - SaaS de Análisis Inteligente de Documentos

Plataforma SaaS para análisis inteligente de documentos con IA. Permite subir documentos (PDF/Word/PPT), hacer preguntas mediante chat y generar resúmenes automáticos.

## Estructura del proyecto

```
/
├── apps/
│   ├── web/          # Frontend Next.js
│   ├── api/          # Backend FastAPI
│   └── worker/       # Celery workers
├── docker/           # Docker configurations
├── docs/            # Documentación
└── scripts/         # Scripts de desarrollo
```

## Stack Tecnológico

- **Frontend:** Next.js + Tailwind + shadcn/ui
- **Backend:** FastAPI + Celery + Redis
- **Base de datos:** PostgreSQL + pgvector
- **IA:** OpenAI GPT-4o + embeddings
- **Storage:** S3/R2 compatible
- **Infra:** Docker, Vercel, Railway

## Desarrollo local

```bash
# Iniciar servicios con Docker Compose
docker-compose up -d

# Frontend (puerto 3000)
cd apps/web && npm run dev

# Backend (puerto 8000)
cd apps/api && uvicorn main:app --reload

# Worker
cd apps/worker && celery -A worker worker --loglevel=info
```

## Funcionalidades principales

1. **Upload de documentos** - PDFs, Word, PowerPoint
2. **Chat con documentos** - RAG con citas y referencias
3. **Resúmenes automáticos** - Generación inteligente de resúmenes
4. **Exportación** - PDF/Word de resultados
5. **Gestión de usuarios** - Planes freemium y premium