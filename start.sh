#!/bin/bash
set -e

echo "🚀 Iniciando DocAI"
echo "=================="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker no instalado"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 no instalado"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js no instalado"; exit 1; }

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo ""
    echo "🔥 Cerrando servicios..."
    kill $BACKEND_PID $WORKER_PID $FRONTEND_PID 2>/dev/null
    docker compose stop 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── 1. Infraestructura ──
echo "📦 Levantando PostgreSQL + Redis + MinIO..."
docker compose up -d
echo "   Esperando que PostgreSQL esté listo..."
until docker compose exec -T postgres pg_isready -U docai -d docai 2>/dev/null; do
  sleep 1
done
echo "   ✅ Infraestructura lista"

# ── 2. Backend ──
echo ""
echo "📡 Iniciando Backend (FastAPI)..."
cd "$ROOT_DIR/apps/api"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt -q
else
  source .venv/bin/activate
fi

# Create tables if they don't exist (skip alembic for simplicity)
python -c "
from database import Base, engine
try:
    Base.metadata.create_all(bind=engine)
    print('   DB tables verified')
except Exception as e:
    print(f'   DB notice: {e}')
"

uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd "$ROOT_DIR"
echo "   ✅ Backend en :8000 (PID $BACKEND_PID)"

# ── 3. Worker ──
echo ""
echo "⚙️  Iniciando Worker (Celery)..."
cd "$ROOT_DIR/apps/worker"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt -q
else
  source .venv/bin/activate
fi
python worker.py &
WORKER_PID=$!
cd "$ROOT_DIR"
echo "   ✅ Worker (PID $WORKER_PID)"

# ── 4. Frontend ──
echo ""
echo "🌐 Iniciando Frontend (Next.js)..."
cd "$ROOT_DIR/apps/web"
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd "$ROOT_DIR"
echo "   ✅ Frontend en :3000 (PID $FRONTEND_PID)"

# ── Ready ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 DocAI está corriendo"
echo ""
echo "  Frontend : http://localhost:3000"
echo "  Zen App  : http://localhost:3000/zen"
echo "  Backend  : http://localhost:8000"
echo "  API Docs : http://localhost:8000/docs"
echo "  MinIO    : http://localhost:9001 (minioadmin/minioadmin)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Presiona Ctrl+C para detener todo"
echo ""

wait
