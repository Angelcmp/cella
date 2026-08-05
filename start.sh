#!/bin/bash
set -e

# ── Cella Local ──
# App 100% local: sin nube, sin auth, sin pagos.
# Uso: ./start.sh
#      SKIP_REDIS=1 ./start.sh   → sin Redis (cache en memoria)
INFRA="${INFRA:-light}"

echo "🚀 Iniciando Cella (local)"
echo "=========================="

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 no instalado"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js no instalado"; exit 1; }

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web"
WORKER_DIR="$ROOT_DIR/apps/worker"

# Elegir venv existente (.venv311 preferido, donde están las deps)
if [ -d "$API_DIR/.venv311" ]; then
  VENV="$API_DIR/.venv311"
elif [ -d "$API_DIR/.venv" ]; then
  VENV="$API_DIR/.venv"
else
  echo "❌ No se encontró virtualenv en apps/api (.venv311 o .venv)."
  echo "   Crea uno con: python3 -m venv apps/api/.venv311 && pip install -r apps/api/requirements.txt"
  exit 1
fi

cleanup() {
    echo ""
    echo "🔥 Cerrando servicios..."
    kill $BACKEND_PID $WORKER_PID $FRONTEND_PID 2>/dev/null
    if [ -n "${REDIS_PID:-}" ]; then kill $REDIS_PID 2>/dev/null; fi
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── 1. Redis (opcional) ──
if [ -n "${SKIP_REDIS:-}" ]; then
    echo "⚠️  Redis omitido (SKIP_REDIS=1) — usando cache en memoria"
elif command -v redis-server >/dev/null 2>&1; then
    echo "📦 Redis local disponible — iniciando en :6379"
    redis-server --daemonize yes --port 6379 >/dev/null 2>&1 || true
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "📦 Levantando Redis vía Docker (modo light)..."
    docker compose up -d redis
else
    echo "⚠️  Redis no disponible — usando cache en memoria"
fi

# ── 2. Backend ──
echo ""
echo "📡 Iniciando Backend (FastAPI)..."
source "$VENV/bin/activate"

python -c "
from database_simple import create_tables
try:
    create_tables()
    print('   DB tables verified')
except Exception as e:
    print(f'   DB notice: {e}')
"

(cd "$API_DIR" && uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!
echo "   ✅ Backend en :8000 (PID $BACKEND_PID)"

# ── 3. Worker ──
echo ""
echo "⚙️  Iniciando Worker (procesamiento de documentos)..."
(cd "$WORKER_DIR" && source "$VENV/bin/activate" && python worker.py) &
WORKER_PID=$!
echo "   ✅ Worker (PID $WORKER_PID)"

# ── 4. Frontend ──
echo ""
echo "🌐 Iniciando Frontend (Next.js)..."
(cd "$WEB_DIR" && npm run dev) &
FRONTEND_PID=$!
echo "   ✅ Frontend en :3000 (PID $FRONTEND_PID)"

# ── Ready ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 Cella Local está corriendo"
echo ""
echo "  App      : http://localhost:3000/zen"
echo "  Backend  : http://localhost:8000"
echo "  API Docs : http://localhost:8000/docs"
echo ""
echo "  Modelos: configura Ollama (o API keys) en la UI de Ajustes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Presiona Ctrl+C para detener todo"
echo ""

wait
