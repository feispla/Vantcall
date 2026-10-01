
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
