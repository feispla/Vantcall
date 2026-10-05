# Arquitectura de VANTS (VantsportsOficial)

> Documento descriptivo basado en la lectura estática del commit `498435eb15b9784f70cb17d986b04562074e8618` (rama `main`). No se ejecutó la aplicación, el bot, las Edge Functions ni las migraciones. Lo que depende de configuración externa figura como *no determinable*.

## 1. Alcance y estado de la organización

- Esta revisión **no mueve ni renombra archivos**. El repositorio conserva su disposición original.
- Motivo: el frontend se compone de scripts clásicos que comparten variables globales y un orden de carga; varios archivos contienen restos de integración de ramas; no hay pruebas ni forma de verificar el arranque antes y después de un traslado. Un movimiento no sería verificable (ver sección 9).

## 2. Árbol del repositorio

```text
.
├── README.md
├── ARCHITECTURE.md
├── index.html                 # documento y punto de entrada web
├── app.js                     # router por hash y páginas públicas
├── db.js                      # cliente Supabase y consultas (window.VantDB)
├── auth.js                    # sesión, cuenta, Steam, checkout (window.VantAuth)
├── admin.js                   # panel de administración (DOC_CONTENT['admin'])
├── zona.js                    # zona por plan (DOC_CONTENT['zona'])
├── ranks.js                   # emblemas SVG (window.VantsRanks / CommonJS)
├── premium.js                 # efectos de presentación
├── data.js                    # datos ficticios; no se carga desde index.html
├── base.css  style.css  vip.css  premium.css
├── config.toml                # verify_jwt de Edge Functions
├── security_review_report.md  # informe previo (desactualizado, ver §8)
├── .gitignore
├── assets/
│   ├── BRAND.md
│   ├── banner-setup.jpg  hero-arena.jpg
│   ├── brand/                 # logos, favicon, iconos, imagen social
│   └── ranks/                 # 8 emblemas (.svg/.png) + rank-sheet.png
├── vendor/
│   └── supabase-2.57.4.min.js
├── bot/
│   ├── main.py                # bot gateway (discord.py)
│   ├── register_commands.py   # registro HTTP de comandos slash
│   ├── requirements.txt  .env.example  SETUP.md
│   ├── commands/              # perfil.py, vincular.py
│   └── utils/                 # health.py, supabase_client.py
└── supabase/
    ├── schema.sql  seed.sql
    ├── functions/
    │   ├── steam-login/index.ts
    │   ├── discord-commands/index.ts
    │   ├── discord-admin/index.ts
    │   └── discord-notify/index.ts
    └── migrations/
        ├── 20261001040000_steam_login_and_plan_zone.sql
        ├── 20261001050000_discord_notifications.sql
        ├── 20261001_admin_bot_premium.sql
        └── 20261001_owner_identities.sql
```

No existen en el árbol: `package.json`, archivos de bloqueo, `Dockerfile`, workflows de CI, pruebas ni `LICENSE`.

## 3. Lenguajes

HTML, JavaScript (navegador y CommonJS en `ranks.js`), Python (bot), TypeScript/Deno (Edge Functions), SQL PostgreSQL, CSS, TOML, Markdown, SVG/PNG/JPEG.

## 4. Componentes

| Componente | Archivos | Responsabilidad |
|---|---|---|
| Documento web | `index.html` | Estructura, navegación, contenedor `#main`, carga de scripts y estilos |
| Aplicación | `app.js` | Router, páginas de inicio, calendario, ranked, torneos, jugadores y precios |
| Datos | `db.js` | Cliente Supabase (PKCE), consultas y caché en memoria de 30 s |
| Cuenta | `auth.js` | Correo/Discord/Google/Steam, perfil, checkout, inscripciones, RSVP, soporte |
| Administración | `admin.js` | Nueve secciones; RPC `web_admin_role`, `admin_*`; invoca `discord-admin` |
| Zona por plan | `zona.js` | Ventajas y torneos según BASIC/PRO/ELITE |
| Presentación | `ranks.js`, `premium.js`, CSS, `assets/` | Emblemas, animaciones, temas |
| Datos de demostración | `data.js` | Equipos, jugadores y torneos ficticios |
| Bot gateway | `bot/main.py`, `commands/`, `utils/` | `/perfil`, `/vincular riot`, `/setup`, `/valorant ...`; healthcheck `GET /` |
| Registro de comandos | `bot/register_commands.py` | `PUT` a Discord API v10 (reemplaza el catálogo completo) |
| Edge Functions | `supabase/functions/*` | Steam OpenID, comandos Discord HTTP, administración del bot, notificaciones |
| Base de datos | `supabase/*.sql` | Roles, planes, comandos, canales, outbox de eventos, triggers y cron |

## 5. Relaciones

```text
Navegador
 ├─ db.js → Supabase (Auth, tablas, RPC)
 ├─ auth.js → steam-login (Edge) ; enlaces de pago Stripe
 └─ admin.js → discord-admin (Edge) → Discord API

Discord
 ├─ Gateway: bot/main.py → Supabase (service_role)
 └─ HTTP Interactions: discord-commands (firma Ed25519) → Supabase

PostgreSQL
 └─ triggers → vant_sync_events → pg_net / cron (5 min) → discord-notify → Discord
```

Orden de scripts en `index.html` (debe conservarse): `vendor/supabase` → `ranks.js` → `db.js` → `app.js` → `auth.js` → `zona.js` → `admin.js` → `premium.js`. Todos con `defer`, sin módulos ES. Los módulos comparten `DOC_CONTENT`, `esc`, `router`, `window.VantDB`, `window.VantAuth`, `window.VantsRanks`.

Hay dos modalidades Discord independientes (gateway Python e Interactions HTTP). `bot/SETUP.md` indica que, al configurar el endpoint de interacciones, el proceso gateway deja de recibir comandos. Modalidad activa: *no determinable*.

## 6. Puntos de entrada

- **Web:** `index.html`; arranque en `app.js` con `DOMContentLoaded` y `hashchange`.
- **Rutas hash:** `#/inicio`, `#/calendario`, `#/ranked`, `#/torneos`, `#/jugadores`, `#/precios`, `#/torneo/<slug>`, `#/jugador/<username>`, `#/login`, `#/registro`, `#/recuperar`, `#/nueva-contrasena`, `#/cuenta`, `#/checkout/<plan>`, `#/checkout/exito`, `#/zona`, `#/admin`.
- **Bot gateway:** `python bot/main.py` (variables: `DISCORD_TOKEN`, `DISCORD_GUILD_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`).
- **Registro de comandos:** `python bot/register_commands.py` (`DISCORD_TOKEN`, `DISCORD_APP_ID`, `DISCORD_GUILD_ID` opcional).
- **Edge Functions (`Deno.serve`):** `steam-login` (GET/POST), `discord-commands` (POST), `discord-admin` (POST: `status`, `connect`, `sync`, `announce`), `discord-notify` (GET diagnóstico, POST entrega/reintento).
- **SQL:** `schema.sql`, `seed.sql` y las cuatro migraciones.

## 7. Dependencias

| Ámbito | Dependencia |
|---|---|
| Navegador | `vendor/supabase-2.57.4.min.js`; fuentes de Google Fonts y Fontshare |
| Edge Functions | `npm:@supabase/supabase-js@2`; `npm:tweetnacl@1.0.3` (`discord-commands`) |
| Python | `discord.py>=2.3.2,<3`, `supabase>=2.4.0,<3`, `python-dotenv>=1.0.1,<2`, `aiohttp>=3.9.0,<4` |
| Servicios | Supabase (Auth, PostgreSQL, Edge Functions, Vault), Discord API v10, Steam OpenID y API, Stripe (enlaces de pago), tracker.gg/ValoTracker (enlaces) |
| PostgreSQL | `pg_net`, cron, Vault, generación de bytes aleatorios |

Variables de Edge Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `STEAM_WEB_API_KEY`, `STEAM_LOGIN_REDIRECTS`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`/`DISCORD_TOKEN`, `VANTS_SITE_URL`, `VANTS_TZ`, `DISCORD_CHANNEL_*`, `DISCORD_WEBHOOK_*`. Los valores no se documentan aquí.

## 8. Inconsistencias conocidas (sin corregir)

1. Restos de ramas (`feat/diseno-premium`, `main`) y declaraciones duplicadas en `index.html`, `app.js`, `auth.js` y Edge Functions.
2. `premium.css` contiene JavaScript de autenticación truncado, pero se carga como hoja de estilos.
3. `config.toml` tiene `verify_jwt = false.` y la sección `steam-login` duplicada.
4. `auth.js` invoca `unlink-steam`, que no existe en el árbol; `stripe-webhook` tampoco está (el README indica despliegue aparte).
5. `schema.sql`/`seed.sql` no coinciden con las columnas consultadas por el frontend; el esquema completo no está versionado.
6. `discord_channels` se define con categorías y restricciones distintas en `schema.sql` y en las migraciones.
7. `bot/commands/perfil.py` envía la misma respuesta dos veces.
8. `security_review_report.md` afirma que no hay backend, `requirements.txt` ni endpoints: no describe el estado actual.
9. `.gitignore` no excluye `.env`.
10. El README declara licencia MIT y enlaza `LICENSE`, que no existe.

## 9. Reorganizaciones evaluadas y no aplicadas

| Propuesta | Decisión | Razón |
|---|---|---|
| Mover JS/CSS a `frontend/...` | No aplicada | Scripts clásicos con globales y orden de carga; la herramienta disponible no mueve archivos, solo crea/borra contenido completo, con riesgo de alterar archivos de 30–60 KB; no se puede comprobar el arranque antes/después |
| Mover `data.js` a una carpeta demo | No aplicada | Posibles referencias no localizadas; sin verificación |
| Mover `security_review_report.md` a `docs/` | No aplicada | Sin ganancia funcional; se conserva como evidencia con su ruta original |
| Reordenar `bot/` o `supabase/` | No aplicada | Imports Python relativos a `bot/`; nombres de funciones y migraciones son contratos externos |
| Editar `.gitignore`, `config.toml`, `premium.css`, README | No aplicada | Son correcciones de contenido, no reorganizaciones; requieren decisión del responsable |

## 10. Información no determinable desde el repositorio

- Commit y configuración del despliegue de la beta publicada.
- Esquema real de Supabase, migraciones aplicadas y políticas RLS efectivas.
- Modalidad Discord activa y catálogo de comandos desplegado.
- Proveedores OAuth habilitados y secretos configurados.
- Implementación del webhook de Stripe y de `unlink-steam`.
- Proceso que alimenta `valorant_stats` y `valorant_leaderboard_public`.
- Versiones resueltas de dependencias Python y de Supabase JS en Edge Functions.
- Resultados de ejecución o pruebas (no hay suite versionada).
