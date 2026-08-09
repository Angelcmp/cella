# Cella — Estado del Proyecto (Agosto 2026)

## Rediseño /zen — Studio, tipografía y Diagrama visual (09/08/2026)

### Tipografía y layout de lectura
- Nuevas clases utilitarias en `globals.css`: `.zen-read-text`, `.zen-text-body`, `.zen-text-heading`, `.zen-textarea` (usar `!important` para sortear problemas de recompilación de Tailwind v4/Turbopack).
- `ChatInterface.tsx`: citas colapsables, eliminado texto inline de citas, párrafos/headings usan `--zen-read-text`.
- `ChatInput.tsx`, `ChatPanel.tsx`, `ZenLayout.tsx`: input sin borde con sombra, sin header central, layout de tres columnas limpio.
- `LeftSidebar.tsx`: botones "Nueva Conversación" y selector de modelo reubicados desde el header central.
- `DocumentSummary.tsx`, `StudyGuideTab.tsx`, `FaqTab.tsx`: aplicadas clases de tipografía zen.

### Studio (RightSidebar.tsx)
- Renombrado "Mapping Conceptual" → "Grafo de Ideas" (Obsidian-style force-directed graph).
- Nuevo tab "Diagrama" (`DiagramTab.tsx`) separado del grafo: editor Mermaid + vista visual.
- Quiz interactivo con validación de respuestas (verde/rojo).

### Diagrama visual (MermaidRenderer.tsx)
- Reemplazado renderizador Mermaid (mostraba solo texto) por `markmap-lib` + `markmap-view`.
- Convierte sintaxis Mermaid `mindmap` a markdown de markmap y renderiza un árbol/mapa mental visual.
- Mantiene zoom, ajustar, export SVG/PNG y clic en nodos para navegar a páginas del documento.
- `package.json`: agregadas dependencias `markmap-lib` y `markmap-view`.

### Aside izquierdo (LeftSidebar.tsx, ConversationItem.tsx, SourceCard.tsx)
- Logo: solo SVG rombo + texto "Cella" (sin caja de fondo).
- `SourceCard.tsx`: diseño compacto — sombra 0.02, sin icono PDF, sin línea de páginas/estado, solo punto de estado + título (10px) + check.
- `ConversationItem.tsx`: dropdown estilo Claude/Perplexity con "⋯" (Renombrar / Fijar / Eliminar con confirmación dentro del menú). Al hacer click, activa el documento y restaura `chatDocumentIds`.
- Proyectos: filtra documentos y conversaciones por proyecto activo; cada proyecto expandido muestra sus PDFs con botón "✕" para quitarlos y "+ Añadir documento". Botón eliminar proyecto con `confirm()` (proyecto por defecto no eliminable).
- Quitado botón "+ Añadir fuente" del footer.

### Conversaciones con backend (ChatInterface.tsx, ChatPanel.tsx, store.ts)
- `ChatInterface.tsx`: prop `conversationId` (backendId); al cambiar, fetches `GET /conversations/{id}` y carga mensajes; al primer envío registra conversación en store.
- `ChatPanel.tsx`: pasa `activeConversation?.backendId`; subidas de PDF van al proyecto activo.
- `store.ts`: `Conversation` con `backendId?` y `documentIds?`; acciones `setConversations`, `removeProject`, `addDocToProject`, `removeDocFromProject`.

### Eliminación persistente de conversaciones
- `exports.py`: nuevo endpoint `DELETE /conversations/{conversation_id}` → verifica ownership (`user_id`), elimina `Message`s + `Conversation`, `db.commit()`, 204.
- `store.ts`: `removeConversation` llama `DELETE /conversations/{backendId}` (best-effort, non-blocking) si la conversación tiene `backendId`, luego elimina localmente como antes.
- Resultado: conversaciones eliminadas en UI no reaparecen al recargar la página.

### Fix subida de PDFs
- `DocumentViewer.tsx`: `fetchDocument()` solo llama `fetchDocumentContent()` si el archivo no es `.pdf`, evitando error 400 y toast falso durante procesamiento.

## Sprint worker/observabilidad/E2E (08/08/2026)

### Worker robusto (`apps/worker/worker.py`, `apps/api`)
- Retries con backoff exponencial (`backoff_for`, `due_for_retry`), `WORKER_MAX_ATTEMPTS` (default 3), `WORKER_BACKOFF_BASE_SECONDS` (default 5), `WORKER_POLL_SECONDS` (default 10).
- Columnas `attempts`, `last_error`, `last_attempt_at` en `Document` (migración aditiva en `database_simple.py`) + expuestas en `DocumentResponse`.
- Reproceso manual: `POST /api/documents/{id}/reprocess` + botón en `ChatPanel.tsx`; `last_error`/`attempts` visibles en la UI (`store.ts`, `LeftSidebar.tsx`).
- Tests: `apps/api/tests/test_worker.py`.

### Observabilidad ligera (`apps/api`)
- `metrics.py` (prometheus-client): `http_requests_total`, `http_request_duration_seconds`, `rate_limited_total`.
- `main.py`: `request_context_middleware` (request-id, logs JSON opcionales, métricas), endpoint `/metrics` (activable con `ENABLE_METRICS`), contador de rate-limited.
- Config: `ENABLE_METRICS`, `ENABLE_JSON_LOGS` (`.env.example`).

### Blacklist de tokens con Redis (`apps/api`)
- `redis_client.py` (helper compartido), `auth_simple.py`: `_is_token_revoked` consulta Redis con fallback SQLite; `revoke_token` escribe en Redis con TTL.
- `rate_limit.py` reusa `redis_client`.

### Export PDF (frontend)
- `ChatInterface.tsx`: export PDF vía `window.open` + `window.print()`; botones MD/JSON/PDF.

### E2E + CI/CD
- Playwright: `playwright.config.ts` (puerto 3100) + `tests/e2e/smoke.spec.ts` (landing, /docs, /zen).
- `package.json`: scripts `lint` (→ `eslint .`), `typecheck`, `test:e2e`, `test:e2e:install`.
- CI: `.github/workflows/ci.yml` (backend pytest, frontend typecheck+lint+build, e2e chromium).

### Docs
- `ROADMAP_PENDIENTE.md` actualizado (worker, observabilidad, blacklist Redis, PDF, E2E/CI como implementados; pgvector y límites por plan fuera de alcance local).
- `docs/RUNBOOKS.md` creado (arranque/parada, troubleshooting Redis/worker/doc en `failed`, métricas, migraciones inline).
- `README.md` actualizado (stack, funcionalidades, API, testing/CI y docs adicionales).

### Fix de CI (`7f16ba7`)
- `requirements.txt`: `fastembed==0.3.6→0.8.0` y `pillow==10.1.0→12.3.0` (fastembed 0.3.6 exigía `pillow>=10.3,<11`, incompatible con el pin de 10.1.0; los nuevos pins coinciden con el venv local).
- `.gitignore`: `lib/` y `lib64/` pasan a root-only (`/lib/`, `/lib64/`), des-ignorando `apps/web/src/lib/` — `utils.ts`, `csrf.ts` y `metadata.ts` no estaban trackeados, lo que rompía `tsc` en CI.

## Reconciliación docs ↔ código (08/08/2026)

- El flujo guest/demo (rutas `/auth/guest`, `/new`, cuotas invitado, magic link, `demo.py`, flags `DEMO_PUBLIC`/`DEMO_GUEST_ENABLED`) **no existía** en el código — la app corre 100% en `LOCAL_MODE` (usuario local). Se eliminó de `ROADMAP_PENDIENTE.md`, `README.md` y `.env.example`.
- El rate limit ya es **Redis-backed con fallback en memoria** (`rate_limit.py`) y emite headers `X-RateLimit-*`; se corrigió el roadmap que lo describía como "en memoria".
- El scan antivirus (`_av_scan_ok` + `ENABLE_FILE_AV_SCAN`) **ya está integrado** en `documents.py`; se corrigió el roadmap.
- La blacklist de tokens ya está en SQLite (`RevokedToken`); pendiente solo migrarla a Redis.

## Limpieza de código muerto y features sin uso

### Backend — Eliminado

| Archivo | Motivo |
|---|---|
| `apps/api/database.py` | PostgreSQL/pgvector, nunca usado (todo usa `database_simple` SQLite) |
| `apps/api/routers/exports.py` | Exportaciones (PDF/DOCX/TXT), ruta hardcodeada a DocAI |
| `apps/api/routers/admin.py` | Admin demo reset, no usado |
| `apps/api/requirements_minimal.txt` | Obsoleto |
| `apps/api/wheels/` | Vacío |
| `apps/api/exports/*` | Artefactos Oct 2025 |
| `apps/api/apps/api/` | Directorio anidado vacío |
| `apps/worker/docai.db` | DB vacía (0 bytes) |
| `eval/` | Datasets de evaluación RAG |
| `scripts/dev.py`, `capture_screenshots.mjs`, `install_minimal_deps.sh`, `seed_demo.py`, `rag_eval.py` | Scripts obsoletos |

### Backend — Recortado

| Archivo | Qué se eliminó |
|---|---|
| `routers/auth.py` | Reescrito: solo `/auth/guest` + `/auth/me`. Eliminados: register, login, refresh, logout, profile, change-password, stats, preferences, upload-profile-picture |
| `routers/chat.py` | 3 endpoints `/conversations*` (frontend usa localStorage) + modelos `ConversationResponse`/`MessageResponse` |
| `routers/documents.py` | POST `/study-guide`, GET `/file`, POST `/file/signed-url`, GET `/file/signed`, DELETE `/{id}` + imports (StudyGuideGenerator, FileResponse, Message, signed utils) |
| `schemas.py` | Eliminados: UserCreate, UserLogin, DocumentUpload, ChatQuestion, Citation, ChatResponse, ErrorResponse, Message, UserProfileUpdate, PasswordChange, UserStats, UserPreferencesUpdate, UserPreferencesResponse |
| `database_simple.py` | Modelos eliminados: UsageEvent, UserPreferences, ExportHistory |
| `demo.py` | Limpieza de ExportHistory removida |
| `main.py` | Desregistrados routers exports + admin. Eliminado rate limit `/auth/login`. Branding DocAI→Cella |
| `requirements.txt` | 8 paquetes eliminados: alembic, psycopg2-binary, pgvector, celery, boto3, langchain, langchain-openai, reportlab |

### Backend — Branding

| Cambio |
|---|
| `main.py`: título/descripción DocAI→Cella, mensaje health |
| `.env.example`: comentarios Gemini actualizados |
| `.gitignore`: Quitado `!SETUP_GEMINI.md`, `capture_screenshots.mjs`, docs aleatorios, md files sin README |

### Frontend — Componentes eliminados

| Componente | Motivo |
|---|---|
| CountUp.tsx, Footer.tsx, MindmapDialog.tsx, QrButton.tsx, QuizDialog.tsx, StudyGuideDialog.tsx, ThemeToggle.tsx, ExportDialog.tsx | Sin uso |
| ChatInterface.module.css | Sin uso |
| FAQSection.tsx, FeaturesSection.tsx, PricingSection.tsx (landing) | Sin uso |
| `ui/accordion`, `ui/dialog`, `ui/form`, `ui/input`, `ui/label`, `ui/progress`, `ui/skeleton`, `ui/table`, `ui/tooltip` | Sin uso |
| `hooks/useGuestSession.ts`, `hooks/useSidebarState.ts` | Sin uso (carpeta hooks eliminada) |

### Frontend — Fixes

| Archivo | Cambio |
|---|---|
| `store.ts` | Restaurados 4 métodos usados (add/update/remove/togglePinConversation). Eliminados 4 muertos (removeProject, removeDocument, setConversations, syncStorage) |
| `ChatInterface.tsx` | Quitados imports rotos (Copy, ExportDialog) |
| `DocumentViewer.tsx` | Quitados 6 iconos sin uso (Download, Clock, Hash, FileIcon, Search, Maximize2) |
| `SettingsPopover.tsx` | Quitados 2 iconos sin uso (Settings, X). localStorage key `docai-theme` → `cella-theme` |
| `LeftSidebar.tsx` | Import `type Project` sin uso removido |
| `ui/sonner.tsx` | Reescrito sin next-themes (no había ThemeProvider montado) |
| `layout.tsx` | `<Toaster />` montado (toasts eran invisibles) |

### Frontend — Branding DocAI→Cella

| Archivo | Cambio |
|---|---|
| `layout.tsx` | Metadata completa: title, description, keywords, openGraph, twitter |
| `lib/metadata.ts` | Base URL cella.ai, twitter handles |
| `StructuredData.tsx` | DocAI→Cella, docai.app→cella.ai, screenshot URL |
| `pricing/page.tsx` | ogImage alt actualizado |
| `PricingClient.tsx` | mailto:ventas@docai.com → ventas@cella.ai |
| `page.tsx` | Footer: link /privacy (404) removido |

### Frontend — /docs reescrita

- `DocsContent.tsx`: Contenido completo reescrito (Cella: DeepSeek/GLM, /zen, sin dashboard/auth/export/Gemini)
- `DocsSidebar.tsx`: Secciones actualizadas, eliminado /docs/demo, logo D→C
- `/docs/demo/`: Directorio eliminado
- `LandingHeader.tsx`: Link /docs/demo removido
- `docs/layout.tsx`: Metadata DocAI→Cella

### Frontend — Assets públicos

| Conservados | Eliminados |
|---|---|
| `dashboard1.png` (ogImage), `icon.svg` (manifest) | dash1.png, dashboard2-5.png, login.png, register.png, portada1.png, cella-logo.svg, favicon.svg, file.svg, globe.svg, next.svg, vercel.svg, window.svg |

### Frontend — npm deps

| Eliminados (15 paquetes) |
|---|
| @hookform/resolvers, @radix-ui/react-accordion, react-dialog, react-label, react-progress, react-tooltip, docx, file-saver, html2canvas, jspdf, next-themes, react-hook-form, recharts, zod, tailwindcss-animate, tw-animate-css |

→ 127 sub-dependencias podadas. `npm install` verificado.

---

## Rediseño Landing — Estilo emdash.ai

### Paleta de colores (Purple + White + Slate)

| Token | Antes (warm earth) | Ahora (cool clean) |
|---|---|---|
| `--bg-primary` | `#FAF9F5` | `#F8FAFC` |
| `--bg-muted` | `#F5F0E8` | `#F1F5F9` |
| `--text-primary` | `#1C1917` | `#0F172A` |
| `--text-secondary` | `#5F5B58` | `#475569` |
| `--text-muted` | `#8C8884` | `#94A3B8` |
| `--accent-brand` | `#9966CC` | `#7C3AED` |
| `--accent-primary` | `#7E57C2` | `#8B5CF6` |
| `--border-subtle` | `#E7E2DA` | `#E2E8F0` |
| `--bubble-user` | `#EEE7DB` | `#F1F5F9` |
| `--bubble-ai` | `#FBF8F1` | `#FFFFFF` |
| `--gradient-zen-glow` | purple viejo | `#8B5CF6 → #7C3AED → #A78BFA` |

Dark mode: fondos slate-900/800, texto slate-100, accent violet-300/400.

### Header (LandingHeader.tsx)
- Emdash-style: `border-b`, `sticky`, `backdrop-blur-xl`
- `max-w-6xl`, `h-12`, logo SVG violet, nav pills hover
- Work Sans, `tracking-[-0.03em]`

### Hero (HeroDemo.tsx — NUEVO)
- Ventana simulada del chat /zen con browser chrome (dots + URL)
- Animación secuencial CSS: doc badge → user msg → thinking dots → AI response + citations → 2nd exchange
- Palabras clave en violeta, citas con badges numerados
- Keyframes: `fadeInUp`, `typingPulse`, `windowPop`, `cursorBlink`

### Sección [ Features ]
- 6 bloques horizontales alternando texto↔panel visual
- Paneles CSS puro (FeaturePanels.tsx): chat citations, resumen, mindmap SVG, quiz MCQ, thinking block, model selector

### Sección [ How it Works ]
- 3 columnas con panel visual arriba + step number + texto
- Paneles: upload drag-drop, terminal indexing, chat explore con tabs

### Tipografía
- Fuente: **Work Sans** (`--font-landing`) para landing, Inter para /zen
- Escala ultra-compacta: hero `text-3xl`, cards `text-[12px]`, body `text-[11px]`
- `tracking-[-0.03em]`, `leading-snug`

### Footer
- 3 columnas: Brand (Cella violeta) + Producto + Proyecto
- SVG `#8B5CF6`, fondo `bg-[var(--bg-muted)]` sólido

---

## Rediseño modo lectura + input compacto + PDF inline (08/08/2026)

### Modo lectura `/zen` (`globals.css`, `ZenLayout.tsx`, `ChatInterface.tsx`)
- Token `--zen-read-bg: #FFFFFF` aplicado a la columna central → página blanca tipo lector.
- Token `--zen-fs-read: 14px` para párrafos y burbujas del chat (Inter).
- Token `--zen-fs-read-heading: 16px` para headings h1-h6 (Source Serif 4), con parser de markdown `#` → `<h1>`…`<h6>` en `renderTextSegment` (`ChatInterface.tsx`).
- Texto del chat (respuestas y preguntas) usa token dedicado `--zen-text-read: #111827` (negro lectura gray-900), aplicado a párrafos, headings y negritas; la regla global `p { color: var(--text-secondary) }` de `globals.css` se sobrescribe con la clase `text-[var(--zen-text-read)]` en cada `<p>` de `ChatInterface.tsx`.

### Chat input compacto (`ChatInput.tsx`)
- Eliminado banner "Cella Notebooks ahora es más inteligente" y fila de metadatos (Fuentes Activas, Tkn_Usage).
- Consola `bg-[var(--zen-read-bg)]` blanca con borde fino `outline-variant/40`, sin backdrop blur.
- Toolbar única: selector de modelo (chip compacto) a la izquierda, iconos (📎 🎙 ⌨) + botón enviar a la derecha.
- Textarea `--zen-fs-read` (14px), placeholder oscuro, `max-h-[200px] overflow-y-auto`, JS sincronizado a 200px.
- Wrapper reducido a `pb-2`.

### Visor PDF inline
- `PdfViewer.tsx` (nuevo): react-pdf v10 con `dynamic(ssr: false)`, header con título + navegación de páginas.
- Endpoint API `GET /api/documents/{id}/file` con `FileResponse(content_disposition_type="inline")`.
- Dependencias: `pdfjs-dist@5.4.296` (bundleado con react-pdf), `react-pdf@10.4.1`.

### Studio 3-columnas (`RightSidebar.tsx`, `ZenLayout.tsx`)
- Rail colapsado 72px, aside expandido 620px, grid de 3 columnas.
- Cards glass sin borde, hover pastel, botones CTAs con `bg-[var(--primary-fixed)] text-white`.

### Docs y landing
- Escala tipográfica reducida en `DocsContent.tsx` (h2: text-3xl→text-2xl, h3: text-xl→text-lg, h4: text-lg→text-base).
- Logo actualizado a `#A7D8DE` en favicon + apple-icon + icon.svg.

---

## Verificación

- `py_compile`: ✅ todos los `.py` del backend y worker OK
- `pytest`: ✅ 20 tests verdes (seguridad, RAG, worker)
- `tsc --noEmit`: ✅ sin errores
- `next build`: ✅ 13 páginas estáticas, 100KB first load JS
- `playwright test`: ✅ 4 specs E2E verdes (landing, /docs, /zen empty state, root redirect)
- CI/CD: ✅ los 3 jobs verdes (backend, frontend, e2e) en GitHub Actions

---

## Configuración actual

```
PROVIDER_LLM=deepseek
PROVIDER_EMBEDDINGS=local
DEEPSEEK_API_KEY=sk-...
ZHIPU_API_KEY=...
DATABASE_URL=sqlite:///./docai.db
LOCAL_MODE=true
RATE_LIMIT_ENABLED=false
RATE_LIMIT_PER_USER=true
ENABLE_METRICS=false    # activar para exponer /metrics
ENABLE_JSON_LOGS=false  # activar para logs JSON + request-id
INFRA=light  # start.sh: solo Redis
```
