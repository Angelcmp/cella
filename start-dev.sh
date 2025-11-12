#!/bin/bash

echo "🚀 Iniciando DocAI - Frontend y Backend"
echo "======================================"

# Función para limpiar procesos al salir
cleanup() {
    echo "🔥 Cerrando servidores..."
    kill -TERM "$backend_pid" "$frontend_pid" 2>/dev/null
    exit 0
}

# Capturar señal de salida
trap cleanup SIGINT SIGTERM

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📡 Iniciando Backend (FastAPI)...${NC}"
cd /home/angel/DocAI/apps/api

if [ ! -d .venv311 ]; then
  echo "${RED}⚠️  No se encontró .venv311. Crea la venv con Python 3.11 antes de usar este script.${NC}"
  exit 1
fi

. .venv311/bin/activate

python main.py &
backend_pid=$!

echo -e "${GREEN}✅ Backend iniciado en PID: $backend_pid${NC}"
echo -e "${BLUE}📱 Esperando 3 segundos antes de iniciar el Frontend...${NC}"
sleep 3

echo -e "${BLUE}🌐 Iniciando Frontend (Next.js)...${NC}"
cd /home/angel/DocAI/apps/web
npm run dev &
frontend_pid=$!

echo -e "${GREEN}✅ Frontend iniciado en PID: $frontend_pid${NC}"

echo ""
echo -e "${YELLOW}🎉 ¡Ambos servidores están corriendo!${NC}"
echo -e "${YELLOW}📊 Backend:  http://localhost:8000${NC}"
echo -e "${YELLOW}🖥️  Frontend: http://localhost:3000${NC}"
echo -e "${YELLOW}📚 Docs:     http://localhost:8000/docs${NC}"
echo ""
echo -e "${RED}Presiona Ctrl+C para detener ambos servidores${NC}"

# Esperar indefinidamente hasta que se interrumpa
wait
