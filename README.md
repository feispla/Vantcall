<div align="center">
  <img src="assets/brand/vants-lockup-light.png" alt="VANTS" width="360" />

  # VANTS — Plataforma de Esports

  Plataforma competitiva de esports: torneos, ranking, perfiles con cuentas vinculadas (Steam, Riot, FACEIT), planes de pago y bot de Discord.

  [![Auth0](https://img.shields.io/badge/Auth0-Identidad-EB5424?logo=auth0)](https://auth0.com)
  [![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E599)](https://neon.tech)
  [![Stripe](https://img.shields.io/badge/Stripe-Pagos-008CDD?logo=stripe)](https://stripe.com)
  [![Discord](https://img.shields.io/badge/Discord-Bot-5865F2?logo=discord)](https://discord.com)
</div>

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + JavaScript + CSS, sin build (GitHub Pages / Netlify) |
| Identidad | Auth0 (tenant `vants`) |
| Datos | Neon (PostgreSQL) mediante Neon Data API y Neon Functions |
| Pagos | Stripe (Payment Links + webhook en una Neon Function) |
| Apps | Desktop con Tauri (`desktop/`), Android con TWA (`android/`) |
| Bot | Python + discord.py (`bot/`) |

La descripción completa está en [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Características

- Inicio de sesión con Auth0.
- Vinculación de Steam (OpenID 2.0), Riot, FACEIT, Spotify y redes sociales.
- Torneos, ranking por temporada y perfiles públicos.
- Planes BASIC, PRO y ELITE con zona exclusiva.
- Panel de administración para staff.
- Notificaciones a Discord.
- PWA instalable, app de escritorio y app Android.

## Estructura

```
├── index.html, app.js, auth.js, auth0-config.js, ...   # Frontend estático
├── *.css                    # Estilos
├── neon-functions/          # Neon Functions: steam-login, stripe-webhook, discord-notify
├── bot/                     # Bot de Discord (Python)
├── desktop/                 # App de escritorio (Tauri)
├── android/                 # App Android (TWA)
├── assets/                  # Marca y emblemas de rango
└── .github/workflows/       # Compilación de las apps
```

## Desarrollo local

El frontend es estático, no hay `package.json` ni paso de build.

```bash
python3 -m http.server 8080
# Abrir http://localhost:8080
```

Al cambiar un `.js` o `.css`, sube su `?v=` en `index.html` para romper la caché.

## Neon Functions

Están en `neon-functions/` y se definen en `neon-functions/neon.ts`. Usan `DATABASE_URL` y el resto de secretos como variables de la propia función, nunca en el repo.

| Variable | Función | Uso |
|---|---|---|
| `DATABASE_URL` | todas | Conexión a PostgreSQL |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Firma de webhooks |
| `STEAM_WEB_API_KEY` | `steam-login` | API de Steam |
| `DISCORD_TOKEN` | `discord-notify` | Mensajes a Discord |

## Bot de Discord

```bash
cd bot
pip install -r requirements.txt
cp .env.example .env
python main.py
```

> El bot todavía usa un cliente de la antigua base de datos y no funciona con el stack actual. Está pendiente migrarlo a Neon (ver `ARCHITECTURE.md`).

## Despliegue

Los cambios entran por Pull Request a `main`; GitHub Pages publica la raíz tal cual. Desktop y Android cargan la URL de la web, así que se actualizan solos. Se recompilan únicamente si cambian `desktop/**` o `android/**`.

## Licencia

MIT.

**Contacto:** [feisplaa@gmail.com](mailto:feisplaa@gmail.com)
