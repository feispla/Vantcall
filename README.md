
## Integraciones reales (septiembre 2026)

- **Auth**: Supabase Auth (proyecto `qtetsgwwsvqzquxssudj`) con correo + contraseña (verificación por email, recuperación) y Discord OAuth. Código en `auth.js` (flujo PKCE).
- **Pagos**: Stripe live, Payment Links BASIC 9 €, PRO 19 €, ELITE 39 € (IVA incluido). El checkout envía `client_reference_id` = id del usuario.
- **Webhook**: `supabase/functions/stripe-webhook` verifica la firma de Stripe, inserta en `purchases` y un trigger sube el plan del perfil.
- **Eventos**: todo se registra en `public.web_events`; el bot de Railway (`feispla/vantcall-admin`, `integrations/vantbot/web_events.py`) los publica en Discord #web-eventos.
- Ninguna clave secreta está en este repositorio: el secreto del webhook y el del bot viven en Supabase Vault.

## vantcall Discord bot

The `bot/` service provides guild-scoped `/vincular riot` and `/perfil` commands. It uses the Supabase `service_role` key only on the server (Railway), never in the desktop client.

Run locally with `cd bot && pip install -r requirements.txt && cp .env.example .env` followed by `python main.py`. Railway should use `python bot/main.py` from the repository root, or set `bot/` as the working directory and run `python main.py`.

The connected VANTSBETA schema links Discord through `players.discord_user_id` and external accounts through `user_game_accounts.user_id` to `players.auth_user_id`. The required unique index is `user_game_accounts_user_game_unique` on `(user_id, game)`. Tournament counts prefer `tournament_participants` and fall back to `tournament_entries`; if neither optional table is available, the profile command returns zero tournaments.
