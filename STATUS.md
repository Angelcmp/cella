# DocAI - Estado del Proyecto (Actualizado al 22 Febrero 2026)

## 🆕 Actualización reciente (Febrero 2026)
- ✅ Fase 3 (Superficies públicas) completada:
  - Landing reescrita con hero IA-First, CTAs gradient y footer premium.
  - Auth (/auth/login y /auth/register) con formularios XL y storytelling DocZen.
  - Docs: sidebar fijo, sin bordes duros; TOC flotante; estilos de código/print y mejoras de legibilidad.
  - Demo pública (/new) con quick steps, uploader mejorado, estados y header “Midnight Focus”.
  - Se añadieron páginas de marketing: `/pricing` (selector mensual/anual con persistencia y ahorro equivalente) y `/features`.
- ✅ Fase 4 (Dashboard autenticado) completada:
  - Home con tarjetas KPI, zona de subida, accesos rápidos y consejos.
  - Documentos (tabla/grid/list), toolbar y badges de estado con glow/spinner; visor con chat lateral y acciones IA.
  - Chat selector y chat por documento con acciones inline (Guía/Mapa/Quiz) estilizadas.
  - Uploader y Perfil remaquetados al sistema DocZen.
- 🔧 Pulidos globales: footer global removido del layout (evita duplicados), headers “Midnight Focus” en dark, badges “Demo Mode” unificados, aside del dashboard/Docs con comportamiento y visual refinados, oculto el icono de Next.js en dev.


## 🆕 Actualización reciente (Noviembre 2025)
- ✅ 12/11/2025: Se documentó `docs/DEMO_TUNNEL.md` con el flujo oficial para exponer DocAI mediante `ENABLE_TUNNEL=true ./start-dev.sh`, usando Cloudflare Quick Tunnels (o binario alternativo vía `TUNNEL_BIN`) y fijando `COOKIE_SECURE=true`, `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_PUBLIC_URL` y `CSRF_ALLOWED_ORIGINS` al dominio HTTPS generado para mantener la demo pública cifrada.
- ✅ 13/11/2025: Se agregaron perfiles duplicados de entorno para alternar rápidamente entre la demo LAN y el uso local aislado:
  - Backend: `apps/api/.env.demo` (IP 192.168.8.102 expuesta en `0.0.0.0`) y `apps/api/.env.local` (solo loopback, `DEMO_PUBLIC=false`, `CSRF_ALLOWED_ORIGINS=localhost`).
  - Frontend: `apps/web/.env.demo` (API pública en la LAN) y `apps/web/.env.localhost` (API/UI en `http://localhost` con demo auto-login/QR desactivados).
  - Para cambiar de perfil basta con copiar el archivo correspondiente antes de iniciar servicios, por ejemplo `cp apps/api/.env.demo apps/api/.env && cp apps/web/.env.demo apps/web/.env.local` para el concurso, o sus equivalentes `*.local*` para trabajar sin exponer el puerto en la red.
  - 🔁 Si cambia la IP LAN (p. ej. nuevo router), actualiza la IP en `/.env` (`CSRF_ALLOWED_ORIGINS`, `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`), en `apps/api/.env.demo` (y el `.env` activo si lo copias) y en `apps/web/.env.demo`/`.env.local` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PUBLIC_URL`, `CSRF_ALLOWED_ORIGINS`). Reinicia API/worker/frontend tras copiar los perfiles para aplicar la nueva dirección.
- ✅ 13/11/2025: La demo pública `/new` ahora permite generar resúmenes completos del documento cuando el procesamiento termina:
  - Se añadió un botón “Resumen” junto a Guía/Mapa/Quiz que invoca `POST /documents/{id}/summary` con protección CSRF y, al concluir, redirige a la nueva vista dedicada.
  - Nueva página ligera `apps/web/src/app/new/summary/[documentId]/page.tsx` que muestra, solo para invitados, el resumen ejecutivo, puntos clave, temas principales y métricas del documento generado, manteniendo la estética del dashboard sin exponer el resto de la app.
- ☑ PRIORIDAD CAMBIO 18/11: Se estabilizaron los embeddings de Gemini en entornos LAN con certificados inconsistentes.
  - `.env`, `apps/api/.env` y `apps/worker/.env` ahora fijan `GEMINI_MODEL_EMBED=models/text-embedding-004` para cumplir con el prefijo obligatorio del SDK y evitar errores `Model names should start with models/`.
  - `start-dev.sh` fuerza `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH` a la ruta que provee `python -m certifi`, mostrando advertencia si no está disponible; así gRPC valida certificados aunque la distro no tenga CAs actualizadas.
  - `apps/api/requirements.txt` incluye `certifi==2024.7.4`, asegurando que el paquete esté presente en la venv sin depender del sistema.

## 🎨 Plan de Rediseño DocZen (IA-First)
Referencia: `DocZen-Sistema-Visual.md`. El objetivo es migrar progresivamente toda la experiencia a la identidad “Inteligencia Orgánica”.

### Fase 1 · Fundamentos visuales y tokens
- [x] Incorporar nuevas familias tipográficas (Fraunces, Space Grotesk, Inter/Satoshi, JetBrains Mono) en `src/app/layout.tsx` y asegurar fallback accesibles.
- [x] Reestructurar `src/app/globals.css` con los tokens `--bg-primary`, `--accent-primary`, gradientes (Zen Glow, Midnight Focus) y texturas (paper-noise.png) para ambos modos.
- [x] Actualizar theme provider/`ThemeToggle` para respetar los nuevos tokens y sincronizar la clase `.dark`.
- [x] Preparar assets compartidos (texturas, ilustraciones IA, iconografía refinada) dentro de `public/` y documentar su uso.

### Fase 2 · Componentes y shell compartida
- [ ] Rediseñar `components/ui` (Button, Card, Badge, Input, Accordion, Dialog, Tooltip, Progress, Switch) siguiendo tamaños, radios y estados definidos.
- [ ] Actualizar `Sidebar.tsx`, `Footer.tsx`, `ThemeToggle.tsx`, `QrButton.tsx` y `StructuredData.tsx` con el nuevo look (tipografía, badges Demo/Pronto, métricas de almacenamiento).
- [x] Ajustar `ChatInterface`, `DocumentViewer` y modales IA (StudyGuide/Mindmap/Quiz) para usar las nuevas burbujas, gradientes y patrones de interacción.
- [ ] Definir tokens de espaciado/z-index y guidelines de motion (hover-lift 2.0, delays, skeletons) reutilizables.

### Fase 3 · Superficies públicas (marketing + docs + demo)
- [x] Reescribir la landing (`src/app/page.tsx`) con el nuevo hero IA, grids de diferenciales, carrusel “Featured”, pricing editorial y footer premium.
- [x] Actualizar páginas de auth (`/auth/login|register`) con storytelling IA, disclaimers de demo y formularios XL.
- [x] Modernizar `/docs` (sidebar, buscador `⌘K`, TOC flotante, callouts, código numerado, estilos imprimibles) acorde al sistema.
- [x] Rediseñar `/new` (demo pública) con los módulos de Quick Steps, uploader, panel de estado, viewer/chat embebidos y CTA Pro.

### Fase 4 · Dashboard y flujos autenticados
- [x] Dashboard Home: tarjetas KPI, barra de acciones (Subir, Chat global, Análisis), zona de subida rápida, accesos rápidos y tips onboarding con el nuevo lenguaje visual.
- [x] Documentos (`/dashboard/documents`, `/viewer`, `/summary`): toolbar refinada, vistas tabla/grid/list actualizadas, visor bicolor con panel de chat y CTA Guía/Mapa/Quiz coherentes.
- [x] Chat (`/dashboard/chat`, `/chat/[id]`): tarjetas selector, badges “Listo”, burbujas IA/usuario y acciones inline (guía/mapa/quiz) con los nuevos estilos.
- [x] Uploader dedicado y Perfil: formularios, cards métricas, switches y módulos de preferencias remaquetados.

### Fase 5 · QA integral y handoff
- [ ] Revisiones cruzadas en desktop/mobile para cada superficie (landing, docs, demo, dashboard).
- [ ] Validar accesibilidad (contrastes AA, estados de foco, navegación con teclado).
- [ ] Documentar en `FRONTEND_STATUS.md` los componentes migrados y abrir issues restantes por página.
- [ ] Preparar capturas + storybook/Playroom ligero para compartir el sistema visual con el equipo de negocio/marketing.

## 🆕 Actualización reciente (Octubre 2025)
- ✅ Backend FastAPI habilitado nuevamente y operando en entorno local
- ✅ Paquetería backend reinstalada en `.venv311` (FastAPI, Uvicorn, SQLAlchemy, Passlib, etc.)
- ✅ Flujo completo de autenticación/login verificado tras ajuste de dependencias

## ✅ COMPLETADO - MVP FUNCIONAL AL 100%

### 1. Estructura del proyecto
- ✅ Estructura de monorepo con `apps/web`, `apps/api`, `apps/worker`
- ✅ Configuración Docker Compose para desarrollo
- ✅ Archivos base: README.md, .gitignore, .env.example

### 2. Backend API (FastAPI) - COMPLETO
- ✅ Configuración FastAPI con SQLAlchemy y esquema completo
- ✅ Base de datos SQLite con nuevos campos de perfil de usuario
- ✅ Sistema de autenticación JWT completo (registro, login, me)
- ✅ **NUEVO:** Endpoints de perfil de usuario (actualizar, cambiar password, estadísticas)
- ✅ CRUD de documentos con upload/download
- ✅ Validación de archivos (PDF, DOCX, PPTX, TXT)
- ✅ Estados de documentos (pending, processing, indexed, failed)
- ✅ Sistema RAG completo con Gemini AI
- ✅ Chat endpoints funcionales con citas automáticas
- ✅ Resúmenes automáticos de documentos

### 3. Worker de procesamiento - COMPLETO
- ✅ Procesamiento real de documentos (PDF, DOCX, PPTX, TXT)
- ✅ Extracción de texto con pdfplumber y OCR
- ✅ Chunking inteligente con overlap
- ✅ Generación de embeddings con Gemini
- ✅ Cola de trabajos automática en background

### 4. Frontend (Next.js 15) - COMPLETO
- ✅ Landing page profesional con tema oscuro
- ✅ Autenticación completa (login/register)
- ✅ Dashboard funcional con navegación
- ✅ Upload de documentos con drag & drop
- ✅ Chat interface RAG funcional
- ✅ Document viewer con zoom y búsqueda
- ✅ **NUEVO:** Página de perfil de usuario completa (4 pestañas)
- ✅ **NUEVO:** UserDropdown con navegación mejorada
- ✅ Responsive design móvil y desktop
- ✅ **NUEVO:** Página única de demo pública `/new` (auto‑sesión invitado, QR, Reset Demo, cuota guest)
- ✅ **NUEVO:** Visor PDF estable por URL firmada (soporta `?page=N`) con fallback a visor procesado
- ✅ **NUEVO:** Outputs educativos (Guía de Estudio, Mapa Mental – Mermaid y Vista Conceptual –, y Cuestionario) con descarga `.md`
- ✅ **NUEVO:** Exportación de conversaciones (PDF/DOCX/TXT) y de artefactos (study guide)

### 5. **NUEVAS FUNCIONALIDADES - 24 AGOSTO 2025:**
- ✅ **Perfil de Usuario Completo:**
  - Página `/dashboard/profile` con 4 pestañas
  - Actualizar información personal
  - Cambiar contraseña con validación
  - Estadísticas de uso (documentos, chats, storage)
  - Configuraciones y preferencias
- ✅ **UserDropdown Navigation:**
  - Dropdown profesional en header
  - Avatar con iniciales automáticas
  - Badges de planes (Free/Premium/Enterprise)
  - Navegación directa a perfil y logout
  - Z-index y animaciones optimizadas
- ✅ **Base de datos actualizada:**
  - Nuevos campos: full_name, username, profile_picture, last_activity
  - API endpoints para estadísticas y perfil

### 6. Pruebas y validación
- ✅ API funcionando en http://localhost:8000 con todos los endpoints
- ✅ Frontend funcionando en http://localhost:3000 completamente
- ✅ Worker procesando documentos automáticamente
- ✅ Flujo completo: registro → login → upload → chat → perfil → logout
- ✅ Gemini AI integrado y funcionando
- ✅ **Demo pública `/new`** verificada (auto‑guest, QR, upload→indexed→visor→chat→outputs)

## 🔧 Siguientes pasos (según roadmap)

### Semana 1-2: Fundaciones ➡️ **COMPLETADO**
- ✅ Repos y estructura base + Docker Compose
- ✅ Auth básica + UI de registro/login
- ✅ Backend para documentos + validaciones

### Semana 2-3: Procesamiento real ➡️ **COMPLETADO**
- ✅ Implementar extracción de texto real (pdfplumber, pypdf)
- ✅ OCR para PDFs escaneados (Tesseract)
- ✅ Chunking configurable
- ✅ Embeddings con Gemini text-embedding-004
- ✅ Integración con SQLite (ready para pgvector)

### Semana 3-4: Chat RAG ➡️ **COMPLETADO**
- ✅ Búsqueda vectorial con similitud coseno
- ✅ Prompt engineering para respuestas con citas
- ✅ Endpoint de chat funcional
- ✅ Cache de respuestas y conversaciones

### Semana 4-5: Frontend Next.js ➡️ **COMPLETADO**
- ✅ Setup de Next.js 15 + TypeScript + Tailwind + shadcn/ui
- ✅ Dashboard completo con todas las funciones
- ✅ Componente de chat RAG avanzado
- ✅ Uploader con drag & drop y estados
- ✅ Autenticación frontend completa

## 🏗️ Arquitectura actual

```
DocAI/
├── apps/
│   ├── api/          ✅ FastAPI completo con RAG y perfiles
│   ├── web/          ✅ Next.js 15 completo con todas las páginas
│   └── worker/       ✅ Worker avanzado de procesamiento
├── docker/           ✅ PostgreSQL + Redis + MinIO ready
├── scripts/          ✅ Scripts de desarrollo
└── docs/            ✅ Documentación completa actualizada
```

## 🚀 Cómo ejecutar

```bash
# 1. Iniciar servicios (si Docker disponible)
docker-compose up -d

# 2. Iniciar API
cd apps/api && python main.py

# 3. Iniciar Worker (en otra terminal)
python apps/worker/worker.py

# 4. Probar el sistema
python test_upload.py
```

## 📊 API Endpoints disponibles

### Autenticación
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Login y cookies httpOnly
- `POST /auth/refresh` - Refresca sesión y emite `XSRF-TOKEN`
- `POST /auth/logout` - Cierra sesión (limpia cookies)
- `POST /auth/guest` - Crea sesión invitado (demo pública)
- `GET /auth/me` - Información del usuario actual
- `PUT /auth/profile` - Actualizar perfil de usuario
- `PUT /auth/change-password` - Cambiar contraseña
- `GET /auth/profile/stats` - Estadísticas del usuario

### Documentos
- `POST /documents/upload` - Subir documento
- `GET /documents/` - Listar documentos del usuario
- `GET /documents/{id}` - Obtener documento específico
- `GET /documents/{id}/content` - Contenido del documento
- `GET /documents/{id}/summary` - Resumen del documento
- `POST /documents/{id}/study-guide` - Generar guía de estudio
- `POST /documents/{id}/mindmap` - Generar mapa mental (Mermaid + metadata)
- `POST /documents/{id}/quiz` - Generar cuestionario MCQ
- `POST /documents/{id}/file/signed-url` - Solicitar URL firmada para PDF
- `GET /documents/{id}/file/signed?token=...` - Descarga/iframe de PDF con token
- `DELETE /documents/{id}` - Eliminar documento

### Chat RAG
- `POST /chat/{document_id}` - Chat con documento
- `GET /chat/conversations/{document_id}` - Historial de conversaciones

### Exportaciones
- `POST /exports/conversations/export` - Exportar conversación (PDF/DOCX/TXT)
- `POST /exports/artifacts/export` - Exportar artefactos (p. ej., study guide)

### Admin / Demo
- `POST /admin/demo/reset` - Reiniciar datos de la demo (admins whitelisted)

### Sistema
- `GET /` - Información de la API
- `GET /health` - Estado de salud
- `GET /docs` - Documentación Swagger

## 💾 Base de datos

### Tablas Principales
- `users` - Usuarios con perfiles completos (full_name, username, profile_picture, last_activity)
- `documents` - Metadatos de documentos con estados y resúmenes
- `doc_chunks` - Fragmentos de texto con embeddings
- `doc_embeddings` - Embeddings vectoriales con Gemini
- `conversations` - Conversaciones de chat persistentes
- `messages` - Mensajes con citas automáticas
- `usage_events` - Eventos de uso para analytics

### Nuevos Campos de Perfil (24 Agosto 2025)
- `full_name` - Nombre completo del usuario
- `username` - Nombre de usuario único
- `profile_picture` - URL de foto de perfil
- `last_activity` - Última actividad registrada

## ✨ DocAI está 100% funcional!

**Status:** Aplicación SaaS completa lista para producción. Sistema RAG, chat inteligente, procesamiento de documentos, perfiles de usuario y UI profesional implementados.

**Estado actual:** MVP completado al 100% con todas las funcionalidades core operativas. Próximos pasos son mejoras opcionales para versiones comerciales.

---

## Anexo – Actualización 08/10/2025 (Mapas Mentales + Guías + Quiz + UX Visor)

Mejoras centradas en outputs educativos y visualización avanzada.

- Guía de Estudio
  - Backend: `POST /documents/{id}/study-guide` (`pages?`, `query?`, `format: json|markdown`).
  - Frontend: modal en Visor, Resumen y Chat. Descarga `.md` (simple y portable).

- Mapa Mental (Mermaid + Vista Conceptual)
  - Backend: `POST /documents/{id}/mindmap` (`pages?`, `query?`, `focus_mode?`, `detail_level?`). Devuelve `markdown` (bloque mermaid) y `metadata.nodes` (label/clean_label/pages/snippet).
  - Frontend: modal con dos vistas:
    - Vista Conceptual (por defecto): Cytoscape (sin editor), layout orgánico (fcose con fallback), minimapa, zoom/ajustar, export PNG, tooltips con snippet y páginas, click de nodo abre el visor en la página. Las etiquetas no muestran páginas (solo en tooltip).
    - Vista Mermaid: contraste alto, zoom/ajustar, export SVG/PNG, tooltips, click a página.
  - UI reordenada: controles compactos a la izquierda, viewer a la derecha (70–78vh). Modal ampliado (`max-w-6xl`, `max-h-90vh`).
  - Persistencia por documento (localStorage `docai:mindmap:{documentId}`): detalle, enfoque, páginas, vista y zoom.

- Cuestionario (MCQ)
  - Backend: `POST /documents/{id}/quiz` (`pages?`, `query?`, `num_questions?`). Devuelve Markdown con opciones A–D, respuesta correcta, justificación y páginas.
  - Frontend: modal en Visor, Resumen y Chat. Descarga `.md`.

- Acciones rápidas en Chat
  - En respuestas del asistente (con citas) aparece al hover “Guía | Mapa | Quiz”, con prefill de páginas según citas.

- Visor PDF estable en iframe
  - Signed URL: `POST /documents/{id}/file/signed-url` → `GET /documents/{id}/file/signed?token=...` (sin cookies en iframe).
  - Ajustes de seguridad: X-Frame-Options/CSP permiten iframing solo en rutas de archivo.
  - `?page=N` soportado para abrir la página exacta desde nodos/citas.

- Exportación de artefactos (backend)
  - `POST /exports/artifacts/export` para `study_guide` (`pdf|docx|txt`). Sanitización de nombres. La UI actual prioriza `.md`.

- Correcciones y UX
  - Fix de sintaxis en `exports.py` y sanitización de filenames (evita duplicar extensiones).
  - Renderer mermaid con tema neutral / CSS forzado (texto negro sobre blanco, líneas visibles).
  - Toolbars con fondo sólido; tooltips alineados al nodo en vista conceptual.
  - Rejilla de modal que maximiza el área visual del mapa.

Checklist
- Guía de estudio: generar/descargar `.md` en Visor/Resumen/Chat.
- Mapa mental: generar (focus/detalle), ver en “Conceptual” (minimapa, zoom, PNG) o “Mermaid” (zoom, SVG/PNG), tooltips/snippets/páginas, click abre visor en página.
- Cuestionario: generar/descargar `.md` en Visor/Resumen/Chat.
- Chat: acciones rápidas con prefill de páginas.
- Visor PDF: iframes con signed URL, `?page=N` funcional.
- Persistencia Mindmap por documento: vista/zoom/detalle/enfoque/páginas.

## Anexo – Actualización 29/09/2025 (Fase 1 Seguridad + Demo Mode)

Resumen conciso de lo añadido para la demo de conferencia.

- Backend
  - Cookies httpOnly en auth: `/auth/login` (set-cookie), `/auth/refresh`, `/auth/logout`.
  - Headers de seguridad + CSP opcional (`ENABLE_CSP_STRICT`).
  - Rate limiting por ruta (login/upload/chat) con cabeceras `X-RateLimit-*`.
  - Validación de archivos por firma/MIME; AV opcional `ENABLE_FILE_AV_SCAN`.
  - Config centralizada en `apps/api/config.py`.
- Demo Mode
  - Flags: `DEMO_PUBLIC`, `DEMO_REGISTRATION_ENABLED`, `DEMO_AUTO_CLEAN_HOURS`, `DEMO_WHITELIST_EMAILS`.
  - Limpieza periódica (`apps/api/demo.py`) y endpoint admin `POST /admin/demo/reset` (whitelist).
  - Semillas: `python scripts/seed_demo.py` (demo1/demo2 + docs indexados).
- Frontend
  - Migración a cookies (`credentials: 'include'`), sin `localStorage`.
  - Señalización Demo: badges + banners; página `/docs/demo`. Footer global con enlace.
  - QR modal para acceso móvil (Landing y Dashboard) con `NEXT_PUBLIC_PUBLIC_URL` y `NEXT_PUBLIC_ENABLE_QR`.
  - Botón “Reset Demo” en Dashboard para admins (`NEXT_PUBLIC_SHOW_DEMO_RESET` + flag `is_demo_admin` entregado por la API).
- Env recomendadas demo
  - Backend: ver DOCUMENTACION.md (bloques .env con CSP/limits/AV/cookies/whitelist).
  - Frontend: `NEXT_PUBLIC_DEMO_PUBLIC=true`, `NEXT_PUBLIC_PUBLIC_URL=https://tudominio`, `NEXT_PUBLIC_ENABLE_QR=true`.

Checklist: login → `/auth/me` OK con cookie; upload con firma válida; 429 en límites; reset demo OK; UI muestra “Demo Mode” + política y QR.

## Anexo – Actualización 10/10/2025 (Demo one‑page `/new` + Guest)

Objetivo: habilitar una demo pública, sin registro, que concentre todo el flujo en una sola página (`/new`).

- Guest (invitado) sin login
  - Backend: `POST /auth/guest` crea un usuario temporal (plan `demo`) y emite cookies (`access_token` + `XSRF-TOKEN`).
  - Seguridad: `/auth/guest` exento de CSRF; el resto de mutaciones mantienen CSRF + Origin/Referer.
  - Limpieza: `apps/api/demo.py` ahora elimina solo usuarios demo/guest (plan=`demo` o `guest-*@demo.local`), respetando whitelist y umbral `DEMO_AUTO_CLEAN_HOURS`.

- Página única `/new` (demo):
  - Auto‑sesión: si no hay sesión activa, intenta `POST /auth/guest` y rota `XSRF-TOKEN` con `POST /auth/refresh`.
  - Upload + procesamiento + chat + visor + outputs (guía, mapa, quiz) en una sola vista.
  - Restauración al refrescar: una vez con sesión, la página carga el último documento del invitado y hace polling hasta `indexed`.
  - Banner “Demo pública” con botón “Ver QR” (usa `NEXT_PUBLIC_PUBLIC_URL`) y “Reset Demo” (solo admins whitelisted y con `NEXT_PUBLIC_SHOW_DEMO_RESET=true`).
  - UX upload: botón siempre activo (se desactiva solo mientras sube) con `input` oculto + `ref`.
  - Cuota básica de invitado: límite de documentos por usuario guest (configurable) con error 402 al exceder.

- Fixes y ajustes relacionados:
  - Frontend documentos: `DELETE /documents/{id}` ahora envía header CSRF.
  - `/new` upload: asegura CSRF antes de subir y envía `x-csrf-token`.
- CORS/CSRF: ejemplos de `.env` para local (`COOKIE_SECURE=false`, orígenes localhost) y servidor.
- Guest quota (backend): `GUEST_MAX_DOCUMENTS` (por defecto 1) aplicado en `POST /documents/upload` para `plan='demo'`.
- Nota operativa: durante pruebas LAN, bajamos `COOKIE_SECURE=false` en `.env` y `apps/api/.env` para que las cookies guest funcionen sobre HTTP. Antes de exponer la demo pública, vuelve a `true` o usa el túnel HTTPS (`ENABLE_TUNNEL=true ./start-dev.sh`).

Variables relevantes (.env):
- Backend: `DEMO_PUBLIC`, `DEMO_AUTO_CLEAN_HOURS`, `DEMO_WHITELIST_EMAILS`, `DEMO_GUEST_ENABLED`, `COOKIE_SECURE`, `CSRF_ENABLED`, `CSRF_ALLOWED_ORIGINS`.
  - `GUEST_MAX_DOCUMENTS` (cuota básica por invitado), `GUEST_RATE_LIMIT_PER_MIN` (throttle per-IP para `/auth/guest`)
- Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_AUTO_LOGIN`, `NEXT_PUBLIC_PUBLIC_URL`, `NEXT_PUBLIC_ENABLE_QR`, `NEXT_PUBLIC_SHOW_DEMO_RESET`.

---

## Anexo – Refuerzo de Seguridad Backend (Octubre 2025)

- Claves obligatorias y configuración
  - `SIGNING_SECRET` y `CSRF_SECRET_KEY` deben configurarse (mín. 32 caracteres) en demo/producción; la API falla en el arranque si faltan (ver `apps/api/config.py`).
  - `.env.example` actualizado con `SIGNING_SECRET`, `CSRF_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES=1440`, `CLAMAV_PATH`.
- Tokens y contraseñas
  - Tokens ahora firmados con HMAC propio (sin `python-jose`), incluyen `jti`, `iat`, `exp`; revocación persistente via tabla `revoked_tokens`.
  - Login migra hashes SHA-256 antiguos a bcrypt automáticamente tras un inicio de sesión válido.
- Sanitización y antivirus
  - Chat limpia caracteres de control antes de guardar/enviar al RAG.
  - Upload integra ClamAV real cuando `ENABLE_FILE_AV_SCAN=true` (errores claros si no se encuentra el ejecutable).
- Herramientas / infraestructura dev
  - Script `scripts/install_minimal_deps.sh` para crear `.venv` con dependencias mínimas (FastAPI + SQLite + extracción docs).
  - `start-dev.sh` ajustado para usar la venv existente sin reinstalar paquetes en cada ejecución.

## Nota Operativa – Entorno Dev (Octubre 2025)

- Backend ejecutándose sobre **Python 3.11** en `apps/api/.venv311` (FastAPI 0.103.x + Pydantic 1.10).  
  - Lanzar manualmente:  
    ```bash
    cd apps/api
    source .venv311/bin/activate
    python main.py
    ```  
  - El script `start-dev.sh` ya no reinstala dependencias, pero arranca con `reload` y puede fallar según permisos; usar el arranque manual hasta pulirlo.
- Dependencias clave confirmadas en `.venv311`: `fastapi 0.103.2`, `uvicorn 0.23.2`, `sqlalchemy 2.0.21`, `python-multipart 0.0.6`, `pydantic 1.10.13`, `passlib 1.7.4 (bcrypt_sha256)`, `bcrypt 4.0.1`, `reportlab 3.6.13`, `python-docx`, `python-pptx`, `pdfplumber`, `pypdf`, `pytesseract`, `numpy 1.26.4`, `langchain`, `openai 1.6.1`, `google-generativeai`.
- Login legacy migrado: al autenticar un usuario con hash SHA-256 se actualiza automáticamente a bcrypt_sha256 + revocación en tabla `revoked_tokens`.
- Login/productivo validado con `bcrypt 4.0.1` reinstalado en `.venv311`; se eliminaron los warnings/excepciones de Passlib.
***
## Anexo – Actualización 06/10/2025 (CSRF + Gemini + Eval)

---

## Anexo – Actualización 07/10/2025 (RAG Quick Wins + Visor PDF)

Cambios aplicados para elevar la calidad del chat y la visualización de documentos.

- RAG (recuperación y generación)
  - MMR re-ranking en búsqueda de fragmentos: selección diversa con λ configurable (`RAG_MMR_LAMBDA`, default 0.7).
  - Umbral de cobertura: si la evidencia media (top-3) < `RAG_MIN_COVERAGE` (default 0.22) el sistema se abstiene y sugiere reformulación.
  - Prompt mejorado: sección “Citas” explícita, reglas de abstención y formato más consistente.
  - Anclaje por oración: se mapea cada oración de la respuesta a fragmentos (n-gram Jaccard), se derivan citas más fieles y un `confidence` agregado.
  - Señales en API: `confidence`, `coverage` y `chunks_found` añadidos al payload de respuesta del chat.

- Visor de documentos
  - Vista original por defecto para PDFs: `GET /documents/{id}/file` con `Content-Disposition:inline` y media-type correcto; el visor embebe el PDF sin transformar.
  - Se removió “Pantalla Completa” y el buscador en el visor cuando está en modo PDF.

Próximos pasos sugeridos (nivel LLM mejorado)
- Recuperación
  - Híbrido BM25 + vectorial (rank fusion) y migración a Postgres + pgvector (HNSW/IVFFlat).
  - Query expansion y sub-queries para preguntas compuestas.
- Generación
  - Cadena de evidencia (chain-of-evidence): plan → evidencias → respuesta.
  - Verificación de fidelidad por oración y reintentos dirigidos.
  - Streaming en chat.
- Resúmenes
  - Resumen jerárquico (map-reduce por secciones) con control de tokens.
- Evaluación
  - Extender `scripts/rag_eval.py` con métricas de recuperación (P@k) y RAGAS (faithfulness/support), y datasets de QA.
- UX/Producto
  - Mostrar barra de confianza/cobertura en UI y sugerencias de follow-up.

Resumen de los ajustes realizados para estabilizar chat/resúmenes y endurecer la seguridad.

- Gemini
  - Estabilizado el uso de modelos: por defecto `gemini-2.0-flash` con override por env (`GEMINI_MODEL_CHAT`).
  - Corrección de embeddings: lectura consistente de `text-embedding-004` y extracción `result['embedding']['values']`.
  - Logs de preferencia de modelos en API/worker y carga de `.env` en worker.
- CSRF (double-submit cookie + Origin/Referer)
  - Backend: cookie `XSRF-TOKEN` emitida en `POST /auth/login` y `POST /auth/refresh`; dependencia CSRF aplicada a rutas mutadoras (upload, chat, exports, perfil, delete, resumen, admin reset); exclusiones en auth y `OPTIONS`.
  - Frontend: envío de header `x-csrf-token` en todas las mutaciones (chat, upload, perfil, exportaciones, resumen, admin reset) con `credentials: 'include'`.
  - CORS/CSRF Origins: soporte para `http://localhost:3000`, `http://127.0.0.1:3000`, `NEXT_PUBLIC_PUBLIC_URL` y `CSRF_ALLOWED_ORIGINS`.
- Configuración/Entorno
  - `.env` en la raíz del repo con claves clave (`GEMINI_*`, `CSRF_*`, `PROVIDER_LLM`), cargado por API y worker.
  - `.env.example` actualizado con variables CSRF/Gemini.
- Evaluación RAG (offline)
  - Nuevo script `scripts/rag_eval.py` para evaluar soporte de respuestas y (opcional) F1 vs expected.
  - Dataset de ejemplo `eval/qa_trabajo_practico3.jsonl` para ejecutar preguntas típicas sobre un documento real.

Verificación realizada
- Login/`/auth/me` y navegación OK.
- Upload de documento OK (200) con validación de firma/MIME.
- Chat con documento OK (200), usando `gemini-2.0-flash` y devolviendo citas.
- Generación y consulta de resúmenes OK tras alinear endpoints y CSRF.

Pendientes inmediatos (seguridad/infra)
- Integrar Redis para blacklist de tokens/rotación robusta y para rate limiting centralizado.
- Antivirus real (ClamAV/servicio) detrás de flag con timeouts y logs.
- Observabilidad: métricas (p50/p95/p99), logs estructurados y tracing distribuido (OTel).
- Rate limiting dedicado para `/auth/guest`:
  1. Extender `LIMITS` en `apps/api/main.py` con la ruta `/auth/guest` usando un umbral más holgado (15-20 req/min/IP).
  2. Evaluar escenarios multiusuario (eventos/demo) y ajustar el límite o añadir un “cooldown” adicional por cookie/User-Agent.
  3. Validar que las respuestas incluyan cabeceras `X-RateLimit-*` y documentar el comportamiento en la guía demo.
