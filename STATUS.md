# Cella — Estado del Proyecto (Agosto 2026)

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

## Verificación

- `py_compile`: ✅ todos los `.py` del backend y worker OK
- `tsc --noEmit`: ✅ sin errores
- `next build`: ✅ 13 páginas estáticas, 100KB first load JS

---

## Configuración actual

```
PROVIDER_LLM=deepseek
PROVIDER_EMBEDDINGS=local
DEEPSEEK_API_KEY=sk-...
ZHIPU_API_KEY=...
DATABASE_URL=sqlite:///./docai.db
DEMO_PUBLIC=true
DEMO_GUEST_ENABLED=true
INFRA=light  # start.sh: solo Redis
```
