Cella – Guía rápida de capturas
================================

Genera capturas consistentes (light/dark) de las vistas principales usando Playwright.

> Nota: el script `scripts/capture_screenshots.mjs` fue eliminado en la limpieza de código
> muerto (Agosto 2026). Esta guía queda como referencia si se reimplementa el flujo.

Requisitos
- Frontend corriendo en `http://localhost:3000` (y API en `:8000`).
- Node.js 18+ instalado.

Instalación (una sola vez)
```bash
cd apps/web
npm i -D playwright
npx playwright install chromium
```

Salida
- Se guardan en `docs/screenshots/{light|dark}/*.png`.
- Rutas cubiertas: `/`, `/pricing`, `/docs`, `/zen` (app local sin login).

