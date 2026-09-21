# Cella — Estado del Proyecto (Agosto–Septiembre 2026)

## `/zen`: composición final de 3 paneles (17/09/2026)

Objetivo: acercar la composición de `/zen` a la referencia visual del cliente (UI tipo Claude/Anthropic): 3 paneles contiguos con headers uniformes, sin tocar funciones.

- **`ZenLayout.tsx`**: izquierda **288px**, derecha responsive **440px** base / **480px** (`lg`) / **620px** (`2xl`) — colapsada **72px** —, centro flexible. Se mantienen divisores de 1px y superficies planas (sin sombras).
- **Headers uniformes `h-12`** (título + acción) en los 3 paneles:
  - Izquierdo (`LeftSidebar`): "Fuentes" + `+` (subir); se elimina el label duplicado del cuerpo.
  - Central (`ChatPanel`): título del documento (+ nombre del proyecto) y acción de selección multi-doc; header también en los estados welcome/procesando/fallido.
  - Derecho (`RightSidebar`): "Studio" + acción colapsar/expandir.
- **`ChatInput.tsx`**: barra única redondeada (`+` adjuntar · textarea · chip de modelo · **botón teal circular**), en lugar de la caja con dos filas.
- **Tarjetas neutras con acento teal** (borde izquierdo): citas en `ChatInterface` y tool-cards del Studio en `RightSidebar`.
- Tipografía de la respuesta IA: se mantiene **Inter** (decisión del cliente); paleta teal intacta.

### Ajustes de visibilidad y compacidad (17/09/2026)
- **Historial**: `HistoryModal` no tenía disparador; se añadió botón en el pie del aside izquierdo (`setShowHistory(true)`). Iconos del pie (Ajustes · Modelos · Historial) a `w-4` y con contraste.
- **`SettingsPopover`** y **`ThinkingBlock`**: migrados de tokens legacy a tokens zen (contraste AA; texto 10→11/13px).
- **Studio**: tool-cards adaptativas (2 columnas en paneles angostos, 3 en `2xl`) sin truncar labels; estado vacío a `max-w-[240px]` y texto `/80`.
- **`ChatInput`**: selector de modelo `max-w-[160px]`.
- **Header central**: botón de nueva conversación (`+`).
- **Pulido visual**: header del aside izquierdo vuelve a "Cella" (+ label "Fuentes" en el cuerpo); items de Fuentes/Conversaciones con más aire y `rounded-lg`; burbuja de usuario `rounded-2xl` y más espacio entre mensajes/párrafos; `code`/`blockquote` migrados a tokens zen (borde de acento); foco del input con sombra sutil; botones de navegación del `PdfViewer` con hover.
- **Asides plegables + scroll oculto**: scrollbars ocultas en `/zen` (scroll funcional por rueda/teclado); botón colapsar/expandir en el aside izquierdo con rail de iconos; secciones **Fuentes** y **Conversaciones** plegables.
- **Studio ghost**: botones sin relleno ni borde (hover `--zen-hover`, activo con acento tenue); `ChatInput` con borde `--outline-variant` y foco sutil.
- **Modales**: `HistoryModal` a **760px** con filas/tipografía mayores y tokens zen; `CellaDialog` al 100% hasta `maxWidth` y backdrop más sutil; `SettingsPopover` sin icono en "Uso (24h)", etiquetas completas alineadas y menú en un solo color.
- **ChatInput y detalles**: el foco ya no pinta borde celeste; selector de modelo simplificado (sin punto/acento) y dropdown alineado a la derecha; bordes de separación de asides en **gris transparente** (`--zen-line` = `rgba(11,21,21,0.10)`); botón de **Historial** movido al header del aside izquierdo; iconos de acción en **negro suave**; "Nueva conversación" con fondo transparente y **hover teal**; la confirmación de borrado de conversación pasa de dropdown inline a **modal centrado**.
- *No se migraron `ZenUploadZone` ni los modales de proveedores (fuera del alcance acordado).*

### Verificación (17/09/2026)
- `npm run typecheck` ✅ · `eslint` de tocados sin errores nuevos ✅ · `npm run build` ✅ (`/zen` 49.4 kB / 163 kB First Load) · `npm run test:e2e` ✅ 4/4 · capturas en 1280 y 1600 ✅.

## Diseño unificado de la suite y retiro del modo oscuro (18/09/2026)

Objetivo: llevar el lenguaje minimalista de `/zen` a la **landing** y **`/docs`**, conservando la paleta teal y **sin romper funcionalidades** (rutas, CTAs, anchors, búsqueda). Modo claro único.

### Sistema de diseño (`apps/web/src/app/globals.css`)
- **Modo oscuro retirado por completo**: eliminados los bloques `.dark` (tokens, selection, glass, `.cyber`, `text-chrome`); sin script de tema ni `data-theme` en `layout.tsx`; sin toggle en `SettingsPopover`; `sonner` fijado en claro. No hay variantes Tailwind `dark:`.
- Una sola fuente mono: `--font-mono` mapeado a `--font-mono-stack` (JetBrains); variable de `next/font` renombrada a `--font-jetbrains`.
- Eliminada la textura de papel global (`body::before` / `--paper-texture`).
- Accesibilidad: `:focus-visible` consistente y `prefers-reduced-motion` global.
- Limpieza: fuera utilidades muertas (`.technical-grid`, `.scanlines`, `.text-chrome`, `.y2k-*`, `.pixel-corners`, `.glass*`, `.hover-*`, `.reveal-*`, `.tilt-hover`, `.wipe-in`, `.h2-underline`, `.animate-*` sin uso, `.badge-*`, `.tablet-pill`, `.chat-input`) y variables `--gradient-*`.

### Landing (`app/page.tsx`, `components/landing/*`)
- Fuera overlays fijos (grid + scanlines + aurora) y cian hardcodeado; fondo plano.
- Hero sin gradiente ni `drop-shadow` y **fix del H1** (se quitó el `fontSize` inline que anulaba el `clamp`); CTA sólido + outline; header plano con borde 1px.
- Cards de pasos, footer y `MarqueeTicker` planos; `HeroDemo` con chrome claro, `STUDIO_TOOLS` monocromo y tokens zen.

### `/docs` (`app/docs/*`)
- Tokens zen en toda la sección; header/sidebar planos (sin blur); prosa/código/tablas planas; `styles.css` sin ámbar/marrón; progreso de lectura sólido.
- **Fix TOC**: el índice ahora se genera (deriva de las secciones/divs con `id`) y observa esas secciones.
- **Fix estado activo del sidebar**: por `hashchange` + `IntersectionObserver` (antes usaba `usePathname`, que nunca incluye el hash).

### Eliminación de código muerto
- `components/landing/FeaturePanels.tsx` (no importado) y la fuente Work Sans.
- Variantes `glow` (badge) y `gradient` (button) sin uso; `DocumentViewer` usa `variant="default"` para el modo lectura.

### Verificación (18/09/2026)
- `npm run typecheck` ✅ · `eslint` de archivos tocados sin errores nuevos ✅ · `npm run build` ✅ (`/` 109 kB, `/docs` 117 kB, `/zen` 163 kB First Load) · `npm run test:e2e` ✅ 4/4.

*Nota: la sección siguiente ("Rediseño minimalista de /zen") documenta su dark mode persistente, que quedó **retirado** en este cambio.*

## Cierre de pendientes (14/09/2026)

### Salto a la página citada en el visor PDF (cierre del pendiente)
- `apps/web/src/components/zen/store.ts`: nuevo estado `highlightPage: { page, nonce }` + acciones `setHighlightPage(page)` y `clearHighlightPage()`. El `nonce` se incrementa en cada llamada para forzar el re-salto aunque se vuelva a clicar la misma cita.
- `apps/web/src/components/zen/ChatPanel.tsx`: `onCitationClick` llama `setHighlightPage(page)` + `setRightTab("document")`; eliminado el stash muerto `window.__pendingCitationPage` (nadie lo leía).
- `apps/web/src/components/zen/RightSidebar.tsx`: `highlightPage` pasa de estado local (solo lo usaba el grafo) al store; se reenvía a `DocumentViewer` y se resetea con `clearHighlightPage()` al cambiar de documento (evita abrir otro PDF en la página de la cita anterior).
- `apps/web/src/components/DocumentViewer.tsx`: nuevas props `highlightPage`/`highlightNonce`, reenviadas a `PdfViewer`; el efecto de página usa deps `[highlightPage, highlightNonce]` (aplica también al visor de texto).
- `apps/web/src/components/PdfViewer.tsx`: props `initialPage` + `highlightNonce`; `onLoadSuccess` salta a la página pedida clampada a `[1, numPages]` en lugar de resetear a 1, y un `useEffect` cubre los saltos posteriores (misma cita o distinta).
- Flujo completo: clic en la cita `P.N` del chat → `store.highlightPage = { page: N, nonce }` → tab `document` → `DocumentViewer` → `PdfViewer` renderiza la página N.

### Dependencia pdfjs-dist
- Eliminada la dependencia directa `pdfjs-dist@6.2.108` en `apps/web/package.json` (no se importaba; era redundante con la que trae `react-pdf@10.4.1` → `5.4.296`). El worker sigue fijado a `5.4.296`, ahora coincidente con la versión bundleada. `npm uninstall` actualizó `package-lock.json` (−4 paquetes).

### Docs versionados
- `.gitignore`: negaciones `!STATUS.md`, `!docs/*.md`, `!docs/**/*.md` (la regla `*.md` dejaba `docs/` sin trackear).
- `docs/RUNBOOKS.md`, `docs/SCREENSHOTS.md`, `docs/DEMO_TUNNEL.md` añadidos al control de versiones (staging).
- `README.md`: 28→64 tests, 3→4 specs E2E, endpoints de la API completados (`/providers/test`, `/providers/{id}/test`, `/providers/catalog`, `/chat/stats/usage`, `DELETE /conversations/{id}`, `/internal/ocr-metrics`) y nota sobre la carga del `.env` desde la raíz.
- `ROADMAP_PENDIENTE.md`: item del salto a la página citada marcado como implementado.

### Verificación (14/09/2026)
- `npm run typecheck` ✅ · `eslint` de archivos tocados ✅ (0 errores/warnings) · `npm run build` ✅ (12 páginas, `/zen` 165 kB).

## Rediseño minimalista de `/zen` (14/09/2026)

Objetivo: lenguaje visual plano y sencillo (estilo DeepSeek), conservando la paleta teal de Cella. Solo cosmético: sin cambios de layout, anchos ni navegación.

### Tokens (`apps/web/src/app/globals.css`)
- Nuevos: `--zen-canvas`, `--zen-panel`, `--zen-panel-alt`, `--zen-line`, `--zen-hover`, `--zen-elev-1/2`.
- Nuevo bloque `.dark .cyber` que remapea los tokens zen/Material3 (antes, en oscuro, el shell de `/zen` seguía usando superficies claras).
- `.cyber [data-slot="card"]`: superficies shadcn planas (anula `shadow-card`).
- Se dejan de usar en `/zen`: `.technical-grid`, `.scanlines`, `.text-chrome`, `.glass*`, `--gradient-zen-glow`, `--paper-texture` (siguen disponibles para la landing/docs).

### Shell (`ZenLayout.tsx`)
- Eliminado el fondo "cyber" (grid técnico, blob `blur-[120px]`, scanlines `mix-blend-overlay`).
- Asides opacos con borde 1px `--zen-line`, sin `backdrop-blur` ni sombras de color. Anchos y posicionamiento intactos.

### Componentes
- **Sidebar izquierdo** (`LeftSidebar`, `SourceCard`, `ConversationItem`): listas planas, etiquetas sans (sin mono uppercase), hover `--zen-hover`, sin rojos decorativos.
- **Centro** (`ChatPanel`, `ChatInterface`, `ChatInput`): welcome sin gradientes/glows; botón enviar sólido `--primary-fixed`; input con borde 1px; burbuja de usuario `--zen-hover`.
- **Studio** (`RightSidebar`): las 8 paletas de tool-cards colapsan a monocromo (activa `--primary-container`/`--primary-fixed`, borde `--zen-line`).
- **Visor** (`DocumentViewer`, `PdfViewer`, `DocumentSummary`, `ObsidianGraph`): fuera textura de papel, `--gradient-zen-glow` y sombras multicapa.
- **Tabs y modales** (`DiagramTab`, `StudyGuideTab`, `FaqTab`, `NotesTab`, `TimelineRenderer`, `UploadModal`, `CellaDialog`, `SettingsPopover`): alineados a los tokens zen.

### Dark mode
- `app/layout.tsx`: script bloqueante que aplica `cella-theme` desde `localStorage` antes del primer paint (evita FOUC); `suppressHydrationWarning` en `<html>`.

### Verificación
- `npm run typecheck` ✅ · `eslint` de archivos tocados sin errores nuevos ✅ · `npm run build` ✅ (`/zen` 50 kB, 164 kB First Load).

## Sprint DB cleanup + SSE robustez + embeddings cache + UX modelos (16/08/2026)

### Database cleanup (`apps/api/database_simple.py`)
- Nuevos helpers `_data_integrity_backfills()` y `_create_indexes_if_missing()` ejecutados por `_migrate()` al startup (idempotentes).
- **Bug crítico corregido**: `conversations.document_ids` se almacenaba como la cadena literal `'null'` (4 bytes ASCII: `6E 75 6C 6C`) en vez de NULL real, lo que duplicaba filas en cada turno de chat. El backfill convierte esos valores a NULL real.
- Reclama defensiva de documentos `processing` con `claimed_at` > 30 min → `failed` (estos quedaban atascados por crashes de worker).
- Borrado de huérfanos en `doc_faqs`, `doc_study_guides`, `doc_mindmaps`, `doc_summaries`, `doc_chunks`, `doc_embeddings` (defensive; ninguno en este DB pero backstop para futuras).
- 5 índices nuevos (`CREATE INDEX IF NOT EXISTS`): `ix_doc_chunks_document_id`, `ix_doc_embeddings_chunk_id`, `ix_messages_conversation_id`, `ix_conversations_user_id`, `ix_documents_user_id`. Reduce drásticamente el coste del JOIN en `search_relevant_chunks`.
- Tests: `apps/api/tests/test_db_cleanup.py` (5 verde).

### Embeddings cache en el worker (`apps/api/cache.py` + `apps/worker/document_processor.py`)
- Nuevos métodos `RAGCache.get_text_embedding(text, model)` / `set_text_embedding(text, model, vec, ttl=None)` con key `cella:text_emb:{model}:{sha256(text)[:16]}`. Redis-first con fallback a MemoryCache LRU 2048 (mismo backend que el resto del cache RAG).
- `DocumentProcessor.__init__` instancia `self.embed_cache = RAGCache()` y loggea `cache_enabled=...` al boot.
- `generate_embeddings(chunks)` rediseñado: lookup cache por chunk → embed batch solo de misses → escribe nuevos vectores al cache. Re-indexings del mismo texto son ahora gratis; chunks con overlap entre documentos también.
- Tests: `apps/api/tests/test_cache.py` (8 verde): disabled, set/get, miss, keys per-model, keys per-text, TTL expiry, full hit no re-embed, partial hit solo misses.
- Impacto esperado: en un flujo típico de re-indexing el coste de embeddings cae a 0; en el primer indexado cae a 0 en cualquier documento con chunks repetidos.

### SSE streaming robusto (`apps/api/routers/chat.py` + `apps/api/config.py`)
- `_chat_event_stream` extraído como generador único compartido por single + multi-doc.
- **Heartbeat** `event: ping` cada `STREAM_HEARTBEAT_SECONDS` (env, default 15) entre yields. Evita que proxies (nginx, Cloudflare) cierren conexiones durante razonamiento largo de DeepSeek-R / GLM-4.6.
- **`event: done` ahora SIEMPRE es el último evento**, incluso tras error. Antes, un stream roto dejaba el bubble del asistente vacío y el frontend solo se enteraba cuando el reader cerraba.
- **`event: summary`** con `duration_ms`, `tokens_estimated`, `model` antes del done (telemetría). Frontend lo guarda en `window.__lastStreamSummary` para futuro debug.
- **`GeneratorExit`/`abort`**: cliente desconecta → salida limpia sin emitir error/done. El worker de background save sigue corriendo.
- **Dedupe query embedding multi-doc** en `rag_system._retrieve_multi`: calcula una vez al inicio, reutiliza para todos los documentos. Antes hacía N llamadas `embed(query)` por turno multi-doc (1 por doc).
- `STREAM_HEARTBEAT_SECONDS` añadido a `apps/api/config.py`.
- Tests: 64/64 backend verde.

### AbortController + botón Stop en /zen
- `apps/web/src/components/ChatInterface.tsx`: `streamControllerRef` con `AbortController` por mensaje; `stopStreaming()` expuesta al padre; `fetch` con `signal: controller.signal`; listener `abort` cancela el reader; ping ignorado; mensaje cancelado marcado como `_(respuesta detenida)_`; `AbortError` diferenciado de otros errores.
- `apps/web/src/components/zen/ChatInput.tsx`: prop `onStop?: () => void`; durante `isLoading && onStop` el botón enviar se reemplaza por un botón rojo con `Square` (stop visual claro); click → `onStop()`.
- `apps/web/src/components/zen/ChatPanel.tsx`: `onCitationClick` ahora real — activa tab `document` del right sidebar y hace scroll a la página citada (`setHighlightPage` → store → `DocumentViewer` → `PdfViewer`).

### Rediseño del modal "Ajustes de modelos" (alcance B completo)
- Backend `apps/api/routers/providers.py`: `POST /providers/test` (test sin guardar, devuelve `ok`, `latency_ms`, `response`, `error`); auth/CSRF en todos los endpoints (`Depends(get_current_user)` + `csrf_protect`); catálogo ahora expone `capabilities` (`has_embeddings`, `supports_streaming`, `supports_vision`, `supports_tools`); columnas health en `ProviderConfig` (`last_test_at`, `last_test_ok`, `last_test_latency_ms`, `last_test_error`) persistidas en cada `POST /providers/{id}/test`.
- Migración SQLite aditiva de las 4 columnas health + validación `provider_type` contra enum.
- Frontend `apps/web/src/components/zen/store.ts`: slice `providers` con `refreshProviders`, `refreshCatalog`, `createProvider`, `updateProvider`, `deleteProvider`, `testProviderConfig`, `testSavedProvider`, `syncProviderModels`, `setDefaultProvider`.
- Componentes nuevos:
  - `CapabilityBadges.tsx` — badges color-coded (Embeddings / Streaming / Visión / Tools).
  - `ProviderCard.tsx` — health dot + latency + capability badges + acciones (Probar / Editar / Sync / Default / Eliminar).
  - `AddProviderWizard.tsx` — 3 pasos (elegir tipo / credenciales con test-before-save / modelo por defecto) con toasts.
  - `EditProviderModal.tsx` — sub-modal de edición con test-before-save.
- `ProviderSettingsModal.tsx` reescrito con tabs `Proveedores (N) | Modelos | Avanzado`; toasts en lugar de banner global; stats reales en Avanzado (`/chat/stats/usage`); advertencia sobre `LOCAL_ENCRYPTION_KEY` rotation.
- `ChatInput.tsx`: dropdown de modelos agrupado por proveedor con health dot + latency; link "Configurar modelos…" siempre visible.
- Tests: `apps/api/tests/test_providers.py` (11 verde).

### Stats reales en modal Avanzado (`apps/api/routers/chat.py`)
- Nuevo endpoint `GET /chat/stats/usage` agrega:
  - `messages_total`, `messages_by_role` (user / assistant).
  - `tokens_estimated_total` (suma de `Message.tokens_estimated` + `DocumentSummary.tokens_used`).
  - `tokens_from_messages`, `tokens_from_summaries` (desglose).
  - `models_used` top-10: `[{model, messages, tokens_estimated}]` ordenados por uso desc.
  - `conversations_total`, `last_activity_at`.
- Modelo `Message` extendido con `model` y `tokens_estimated` (aditivo). `chat.py` ahora setea estos campos al guardar (user y assistant, streaming y no-streaming).
- Tests: `apps/api/tests/test_stats.py` (3 verde).

### Landing: rediseño HeroDemo + paleta centralizada
- `apps/web/src/components/landing/HeroDemo.tsx` reescrito a client component con secuencia typewriter (query + respuesta), ThinkingBlock con timer elapsed en vivo, citas, dropdown agrupado por proveedor con health dot, paleta /zen (Material3 teal).
- `LandingHeader.tsx`: `h-12`, branding `logo + CELLA` centrado a la izquierda, hover con opacidad + scale + color shift, fondo transparente.
- `apps/web/src/app/globals.css`: paleta refactorizada a `@theme` con hex únicos + aliases semánticos en `:root` (antes duplicada en `:root` + `.dark` + `.cyber` → fuente única).
- `apps/web/src/app/page.tsx`: pill `100% local · open source · estilo NotebookLM` eliminado; `py-24 md:py-32` → `py-6 md:py-8` (demo inmediatamente debajo del hero); h1 clamp mínimo `1.5rem` (24 px); footer `© 2026 Cella` (antes `© 2024 Cella Core. Inc.`).
- Build OK: `/` 5.46 kB / 110 kB First Load.

### OCR configurable y medible (sprint previo 2026-08-16)
- `TESSERACT_LANGS` (default `spa+eng`) configurable vía env.
- `OcrScanLog` (database_simple.py) con `pages_total`, `pages_ocr`, `pages_failed`, `chars_extracted`, `duration_ms`, `request_id`.
- `store_ocr_log` en worker.py; counters Prometheus `cella_ocr_*` via endpoint interno `/internal/ocr-metrics`.
- 6 tests verde (`tests/test_ocr.py`).

### Configuración nueva
- `apps/api/config.py`: `TESSERACT_LANGS`, `OCR_LOG_ENABLED`, `STREAM_HEARTBEAT_SECONDS`.
- `apps/api/.env.example`: bloque OCR documentado.

## Sprint seguridad + observabilidad + despliegue (10/08/2026)

### Antivirus gestionado con auditoría (`security/av.py`)
- Providers: `clamav` (binario local), `http` (servicio gestionado vía API), `none` (desactivado).
- Cada escaneo se registra en la tabla `av_scan_logs` (document_id, filename, provider, result, error, duration_ms, request_id).
- Config: `AV_PROVIDER`, `AV_API_URL`, `AV_API_KEY`, `AV_AUDIT_LOG`, `AV_RETENTION_DAYS`.
- Test: `test_av_scan_audit_log` en `test_features.py`.

### TTL de sesión y limpieza de tokens (`auth_simple.py`)
- `SESSION_TTL_MINUTES` controla la expiración de tokens de sesión.
- `purge_expired_revoked_tokens()`: elimina tokens revocados expirados de SQLite + Redis; ejecutado por worker y en startup.
- `SESSION_CLEANUP_MINUTES`: intervalo de limpieza periódica.
- Test: `test_purge_expired_revoked_tokens`.

### Worker DLQ + idempotencia (`worker.py`, `routers/worker.py`)
- Claim atómico: `worker_id` + `claimed_at` en `Document`; reclaim automático de docs stuck tras `WORKER_CLAIM_TIMEOUT_SECONDS`.
- DLQ explícita: `Document.dlq` flag; worker marca `dlq=True` tras agotar `WORKER_MAX_ATTEMPTS`.
- `GET /worker/status`: resumen con `by_status`, `dlq` count, `dlq_entries`.
- Tests: `test_worker_dlq_flag_set_on_exhaustion`, `test_worker_status_endpoint`.

### OpenTelemetry tracing (`telemetry.py`)
- `span()` context manager + `inject_tracing_middleware()` para FastAPI.
- Lazy init: no-op sin deps de OpenTelemetry; activable con `ENABLE_TRACING=true`.
- OTLP gRPC/HTTP configurable: `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`.
- Config: `ENABLE_TRACING`, `OTEL_SERVICE_NAME`.

### Límites por plan y contadores (`usage.py`)
- `enforce_limit(db, user, action)`: raise 402 (plan cap) o 429 (ventana 24h) cuando `ENFORCE_PLAN_LIMITS=true`.
- `record_usage(db, user_id, action)`: persiste `UsageEvent`.
- `usage_summary(db, user)`: contadores actuales + restantes por plan.
- `GET /usage`: endpoint público.
- `SettingsPopover.tsx`: muestra usados/límites en el frontend.
- `ENFORCE_PLAN_LIMITS=false` por defecto en LOCAL_MODE (solo cuenta, no bloquea).
- Tests: `test_usage_endpoint_returns_usage`, `test_usage_record_events`, `test_usage_enforce_window_limit`.

### Grafana + Prometheus (`deploy/monitoring/`)
- `grafana/`: dashboard `cella.json` (DLQ, 5xx, latencia, stale docs), alertas `cella.yml`, provisioning automático.
- `prometheus/prometheus.yml`: scrape config para `cella-api:8000/metrics`.
- `docker-compose.yml`: profile `monitoring` con servicios Prometheus + Grafana.

### Nginx + TLS (`deploy/nginx/cella.conf`)
- Reverse proxy: frontend `:3000` + FastAPI `:8000`, SSE streaming, métricas solo localhost.
- TLS con Let's Encrypt, HSTS, `ssl_protocols TLSv1.2 TLSv1.3`.
- Redirect HTTP→HTTPS.

### Tests
- 8 tests nuevos en `test_features.py`: AV audit, purge TTL, DLQ flag, worker status, usage (3), documents list.
- Total: 28 tests (20 anteriores + 8 nuevos).

### Configuración nueva (`config.py`, `.env.example`)
- `SESSION_TTL_MINUTES`, `SESSION_CLEANUP_MINUTES`
- `AV_PROVIDER`, `AV_API_URL`, `AV_API_KEY`, `AV_AUDIT_LOG`, `AV_RETENTION_DAYS`
- `ENABLE_TRACING`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`
- `ENFORCE_PLAN_LIMITS`, `PLAN_LIMITS_JSON`, `PLAN_LIMITS` (local/free/pro)
- `WORKER_CLAIM_TIMEOUT_SECONDS`

---

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
