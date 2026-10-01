
## Integraciones reales (septiembre 2026)

- **Auth**: Supabase Auth (proyecto `qtetsgwwsvqzquxssudj`, URL `https://qtetsgwwsvqzquxssudj.supabase.co`) con correo + contraseña (verificación por email, recuperación) y Discord OAuth. Código en `auth.js` (flujo PKCE).
- **Pagos**: Stripe live, Payment Links BASIC 9 €, PRO 19 €, ELITE 39 € (IVA incluido). El checkout envía `client_reference_id` = id del usuario.
- **Webhook de pagos**: `supabase/functions/stripe-webhook` verifica la firma de Stripe, inserta en `purchases` y un trigger sube el plan del perfil.
- **Vinculación de Steam**: `supabase/functions/link-steam-start`, `link-steam-callback` y `unlink-steam` implementan el flujo OpenID 2.0 con Valve. Guardan en `user_game_accounts` con `verified = true`. El state temporal vive en `steam_link_state` (10 min, un solo uso). La `STEAM_WEB_API_KEY` nunca sale del backend.
- **Bot de Discord vantcall**: repositorio [`feispla/VantsportsOficial`](https://github.com/feispla/VantsportsOficial), carpeta `bot/`. El servicio se puede desplegar en Railway/Render. Comandos `/vincular riot` y `/perfil` conectados a `players`, `user_game_accounts` y las tablas de torneos disponibles del mismo proyecto Supabase. La `SUPABASE_SERVICE_ROLE_KEY` vive solo en el servicio backend, nunca en el cliente desktop ni en el repo.
- **ValoTracker**: bot externo invitado al servidor Discord de VANTS para stats de ranked de Valorant. Convive con vantcall; no hay API entre ambos, el usuario los usa en paralelo.
- **Eventos web**: todo se registra en `public.web_events`; un bot de backend los publica en Discord `#web-eventos`.
- **Secretos**: ninguna clave secreta está en los repositorios. Los secretos (`STRIPE_WEBHOOK_SECRET`, `STEAM_WEB_API_KEY`, `DISCORD_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`) viven en Supabase Vault y en variables de entorno del servicio.

## vantcall Discord bot

The `bot/` service provides guild-scoped `/vincular riot` and `/perfil` commands. It uses the Supabase `service_role` key only on the server, never in the desktop client.

Run locally with `cd bot && pip install -r requirements.txt && cp .env.example .env` followed by `python main.py`. The service should use `python bot/main.py` from the repository root, or set `bot/` as the working directory and run `python main.py`.

The connected VANTSBETA schema links Discord through `players.discord_user_id` and external accounts through `user_game_accounts.user_id` to `players.auth_user_id`. The required unique index is `user_game_accounts_user_game_unique` on `(user_id, game)`. Tournament counts prefer `tournament_participants` and fall back to `tournament_entries`; if neither optional table is available, the profile command returns zero tournaments.

## Diseño premium y rangos

- Nuevo logo VANTS (`assets/brand/`), favicon, icono de Discord e imagen social.
- 8 emblemas de rango premium (`assets/ranks/`) generados por `ranks.js` y usados en la web: escalera de rangos, insignias del leaderboard y perfiles.
- Guía completa en [`assets/BRAND.md`](assets/BRAND.md).

## Acceso: Google, Discord, Steam y correo (octubre 2026)

- Web publicada: `https://vantsbetaa.pplx.app/`.
- **Google y Discord** usan Supabase OAuth (PKCE). En Supabase → Authentication → URL Configuration deben estar `https://vantsbetaa.pplx.app` (Site URL) y `https://vantsbetaa.pplx.app/**` (Redirect URLs).
- **Google Cloud**: el cliente OAuth debe tener como *Authorized redirect URI* `https://qtetsgwwsvqzquxssudj.supabase.co/auth/v1/callback`.
- **Steam** usa la Edge Function `steam-login` (OpenID 2.0). Devuelve `steam_token` (magic link de un solo uso que el cliente canjea con `verifyOtp`), `steam_linked=1` o `steam_error`. La lista de destinos permitidos incluye `https://vantsbetaa.pplx.app/` y se puede ampliar con el secreto `STEAM_LOGIN_REDIRECTS`.
- En **Mi cuenta** se puede vincular Google, Discord y Steam, y ver las ventajas del plan desde `plan_content`.

## Panel admin, Zona VIP y bot de Discord (oct 2026)

- **Panel admin** en `#/admin` (`admin.js`). Solo lo ven las cuentas de `public.web_admins` (propietaria: feisplaa@gmail.com). RLS impide cualquier lectura/escritura a quien no sea admin. Pestañas: Resumen, Jugadores (planes y verificación), Torneos, Eventos, Ranked (temporadas y reglas), Zona y planes (`plan_content`), Soporte, Bot Discord y Actividad.
- **Zona VIP** en `#/zona` (`zona.js`): contenido exclusivo según plan (BASIC/PRO/ELITE). Gratis o sin sesión ve la vista bloqueada (`plan_content_teaser`).
- **Bot de Discord por HTTP Interactions** (Edge Functions, sin servidor propio):
  - `discord-commands`: responde los slash commands. El catálogo vive en `public.bot_commands` (activar/desactivar, solo staff, plan mínimo y comandos personalizados desde el panel).
  - `discord-admin`: acciones del panel (`status`, `connect`, `sync`, `announce`). `connect` guarda el token en Supabase Vault, apunta el Interactions Endpoint a `.../functions/v1/discord-commands` y registra los comandos en el servidor.
  - `discord-notify`: publica torneos, eventos y temporadas en los canales de `discord_channels`.
  - El bot Python de `bot/` (gateway) es la versión antigua; si se usa a la vez que el endpoint HTTP, Discord solo envía las interacciones al endpoint.
- **Arreglo del login con Discord**: el error `invalid_client` venía del Client Secret de Discord guardado en Supabase. Hay que regenerarlo en Discord Developer Portal → OAuth2 → Reset Secret y pegarlo en Supabase → Authentication → Providers → Discord (Client ID `1552959749891297320`). Redirect obligatoria en Discord: `https://qtetsgwwsvqzquxssudj.supabase.co/auth/v1/callback`. La web ahora cierra sesión solo en local, limpia el estado PKCE antes de cada OAuth y pide `prompt=consent` a Discord para que se pueda volver a entrar tras cerrar sesión.
