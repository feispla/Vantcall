
## Integraciones reales (septiembre 2026)

- **Auth**: Supabase Auth (proyecto `https://qtetsgwwsvqzquxssudj.supabase.co`) con correo + contraseña (verificación por email, recuperación) y Discord OAuth. Código en `auth.js` (flujo PKCE).
- **Pagos**: Stripe live, Payment Links BASIC 9 €, PRO 19 €, ELITE 39 € (IVA incluido). El checkout envía `client_reference_id` = id del usuario.
- **Webhook**: `supabase/functions/stripe-webhook` verifica la firma de Stripe, inserta en `purchases` y un trigger sube el plan del perfil.
- **Eventos**: todo se registra en `public.web_events`; el bot de Railway (`feispla/vantcall-admin`, `integrations/vantbot/web_events.py`) los publica en Discord #web-eventos.
- Ninguna clave secreta está en este repositorio: el secreto del webhook y el del bot viven en Supabase Vault.
