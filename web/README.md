# VANTS web (Vue 3 + Vite) — fase 1

Nueva interfaz, en paralelo a la web estática de la raíz. No la reemplaza todavía:
cada fase migra más vistas (Inicio y Cuenta en la fase 1).

## Comandos

```bash
cd web
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # genera web/dist con nombres con hash (sin ?v=N)
npm test           # pruebas unitarias (Vitest)
npx playwright install chromium
npm run test:e2e   # pruebas en navegador (Playwright, sesión simulada)
```

## Estructura

- `src/config.js` — dominio y client id de Auth0 (públicos por diseño), URL de la Neon Data API.
- `src/lib/auth.js` — sesión Auth0 reactiva.
- `src/lib/db.js` — lecturas PostgREST: con sesión a la Data API, sin sesión al proxy público.
- `src/views/` — Inicio y Cuenta. `src/components/` — barra, pie, tarjetas.
- `e2e/` — el test que cubre el bug del botón Streamer.

## Notas

- Rutas con hash (`#/cuenta`), igual que la web actual.
- Los enlaces a Ranked, Torneos, etc. apuntan a la web antigua hasta migrar esas vistas.
- Modo `--mode e2e`: sesión simulada con `window.__E2E_USER__`. Solo existe en ese build.
