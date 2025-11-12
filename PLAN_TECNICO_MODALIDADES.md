# Plan Técnico – Modalidades de Presentación (Instalador Local y Demo Online)

Documento de referencia para decidir y ejecutar la presentación de DocAI en dos modalidades: instalador local y demo online. Incluye arquitectura, opciones de IA, seguridad, empaquetado, fases y estimaciones.

## Objetivo
- Ofrecer DocAI en dos formas:
  - Instalador local (offline/semioffline) para uso individual en equipos personales.
  - Demo online en servidor, accesible desde escritorio y móvil (vía código QR).

## Resumen Ejecutivo
- Es viable entregar ambas modalidades con la base actual del proyecto.
- Tamaño del instalador depende del enfoque IA: con APIs de IA es liviano; con LLM local crece a varios GB.
- En servidor, usar contenedores existentes (Postgres+pgvector, Redis, MinIO) y endurecer seguridad.

## Modalidad 1: Instalador Local
### Arquitectura
- Backend: FastAPI + worker local (ya implementado), BD local (SQLite para simplicidad; opcional Postgres local si se requiere escala).
- Frontend: build de Next.js servido por el propio backend o empaquetado con Electron para app de escritorio.
- Almacenamiento: PDFs y datos en carpeta de usuario (configurable). Embeddings almacenados localmente.

### Opciones de IA (impacto en tamaño)
- Con APIs (OpenAI/Gemini): instalador liviano (~200–400 MB). Requiere red para IA.
- Embeddings locales: modelos tipo sentence-transformers (MiniLM/e5) (~100–300 MB adicionales).
- LLM local: Llama 3/3.1 7–8B cuantizado (GGUF) ~3–6 GB; vía llama.cpp u Ollama. 100% offline, pero peso elevado.
- Híbrido: embeddings locales + LLM por API como fallback.

### Búsqueda vectorial local
- Volúmenes pequeños: SQLite + embeddings en JSON + cosine (ya implementado).
- Mejor rendimiento: integrar FAISS local (rápido y sin Postgres).

### Empaquetado
- Opción A (recomendada): Electron Builder (Win/macOS/Linux) + PyInstaller para FastAPI/worker. UI se comunica con `http://127.0.0.1:<puerto>`.
- Opción B: Distribución “portable” con scripts; o bundle Docker offline (más pesado pero aislado).

### Estimación de peso
- Sin modelos locales: 200–400 MB.
- + Embeddings locales: +100–300 MB.
- + LLM local 7–8B: +3–6 GB.

## Modalidad 2: Demo Online (Servidor)
### Infraestructura
- Contenedores existentes: `docker-compose` con Postgres (pgvector), Redis y MinIO.
- Añadir Nginx (TLS, reverse proxy) y servir frontend (Next build estático) o desplegar en Vercel y apuntar API al dominio.
- Worker: Celery/RQ con Redis (ideal) o worker actual con polling para demo simple.

### Acceso por QR y móviles
- Generar QR con la URL pública del demo. UI responsive (Next+Tailwind).
- Cookies seguras (`Secure`, `SameSite=Lax`) y HTTPS obligatorio.

### Multiusuario y seguridad
- Rate limiting (login/upload/chat), cookies httpOnly, headers de seguridad y CSP estricta.

## Seguridad Común (ambas modalidades)
- Autenticación por cookies httpOnly + `SameSite=Lax` (en prod: `Secure`).
- Rate limiting por endpoint crítico (login, upload, chat) con flags por entorno.
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- CSP estricta en prod (sin `unsafe-inline`); en dev, permitir excepciones controladas.
- Validación de archivos: tamaño, MIME real (firma), y escaneo AV (ClamAV) opcional por flag.

## Proveedores y Feature Flags
- Variables de entorno:
  - `PROVIDER_LLM={gemini|openai|local}`
  - `PROVIDER_EMBEDDINGS={api|local}`
  - `ENABLE_CSP_STRICT=true|false`
  - `RATE_LIMIT_ENABLED=true|false`
  - `ENABLE_FILE_AV_SCAN=true|false`
- Adaptadores:
  - LLM: Gemini/OpenAI/local (llama.cpp/Ollama).
  - Embeddings: API (OpenAI/Gemini) o locales (sentence-transformers).

## Búsqueda Vectorial
- Local/Instalador: SQLite + cosine o FAISS para mejor rendimiento.
- Servidor: Postgres + pgvector (índices IVFFlat/HNSW), migraciones Alembic y consultas KNN.

## Worker/Procesamiento
- Local: worker actual (polling) suficiente para demo.
- Servidor: Redis + RQ/Celery con reintentos/backoff, DLQ y panel de estado.

## Empaquetado y Distribución (Local)
- Build de Next.js (estático) + PyInstaller para API/worker.
- Electron Builder para generar instaladores (.exe, .dmg, .AppImage).
- Carpeta de datos de usuario configurable y script de arranque.

## Fases de Implementación
### Fase 1: Seguridad Base
- Cookies httpOnly, refresh/rotación, logout que limpia cookies.
- Rate limiting básico (login/upload/chat) con thresholds por entorno.
- Headers de seguridad + CSP por entorno.
- Validación de archivos reforzada (firma MIME) y AV opcional.

### Fase 2: Dual-Mode (Local/Servidor)
- Abstracción de proveedores (LLM y embeddings) y activación por env.
- Local: mantener SQLite o integrar FAISS según volumen.
- Servidor: activar Postgres+pgvector y migraciones Alembic.

### Fase 3: Packaging
- Empaquetado de API/worker (PyInstaller) y UI (Next build). Opcional Electron.
- Scripts de instalación y configuración (carpeta de datos, puertos, logging).
- Generación de QR en demo online.

### Fase 4: Pulido de Demo

## Criterios de Aceptación
- Login/refresh/logout con cookies httpOnly; sin tokens accesibles desde JS.
- Rate limits efectivos con respuestas 429 y cabeceras informativas.
- Headers de seguridad y CSP verificados en respuestas (prod).
- Upload bloquea tipos/tamaños no permitidos; logs de auditoría.
- Local: flujo E2E (registro/login → upload → chat → resumen → export) estable sin dependencias externas si IA por API está configurada.
- Servidor: consultas KNN en pgvector con latencia <50 ms en dataset de prueba.

## Estimaciones de Tamaño
- Instalador sin modelos locales: 200–400 MB.
- + Embeddings locales: +100–300 MB.
- + LLM local 7–8B cuantizado: +3–6 GB.

## Requisitos y Dependencias
- Local: Python 3.10+, Node 18+, opcional Electron Builder, PyInstaller, (opcional) Ollama/llama.cpp.
- Servidor: Docker, docker-compose, dominio y TLS (Nginx/Let’s Encrypt), Postgres+pgvector, Redis, MinIO.

## Riesgos y Mitigaciones
- Peso del instalador con LLM local: comunicar variantes (liviano vs 100% offline).
- Costos/cuotas de APIs IA: caché de embeddings y límites por plan/usuario.
- Seguridad en demo pública: endurecer cookies, CSP, rate limiting y escaneo AV.

## Decisiones Pendientes
- ¿Instalador liviano (APIs IA) o 100% offline (LLM local)?
- ¿SQLite+FAISS en local o Postgres local?
- ¿Electron (app de escritorio) o navegador con servidor local?

## Próximos Pasos Recomendados
1) Implementar Fase 1 (seguridad base) compartida.
2) Añadir flags de proveedores y seleccionar por entorno.
3) Preparar empaquetado mínimo (sin LLM local) y demo online con QR.
4) Evaluar experiencia y decidir sobre modelo local y FAISS/pgvector.

## Decisiones Cerradas (28 Sep 2025)
- Cookies: `SameSite=Lax` (cookies httpOnly + Secure en prod/demo pública).
- Rate limits: Umbrales iniciales por endpoint (login/upload/chat) habilitados; activos por defecto en demo pública.
- AV: Escaneo de archivos habilitable por flag; habilitado por defecto en demo pública.
- Modalidad local: Mantener SQLite simple por ahora (FAISS opcional en fases posteriores).
- Flags dados de alta en `.env.example` y disponibles en `apps/api/config.py`.
