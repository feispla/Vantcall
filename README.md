
## Funciones

- **Acceso**: Discord o correo y contraseña. El registro pide nombre de usuario (3-24 caracteres) y contraseña de al menos 8 caracteres, con verificación por email.
- **Mi cuenta**: plan, correo verificado, Discord, métodos de acceso y perfil de competidor (nombre visible, país, región, juego principal, bio y visibilidad pública o privada).
- **Planes** (pago único, IVA incluido):
  - VANT BASIC: 9 €
  - VANT PRO: 19 €
  - VANT ELITE: 39 €
- **Torneos por plan**: VANT Open (BASIC+), Pro Series (PRO+) y Elite Invitational (ELITE).
- **Bot de Discord**: comandos `/ranked`, `/jugador` y `/torneo`, sincronizados con la web.

## Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta `supabase/schema.sql` y luego `supabase/seed.sql` (el seed es opcional, son datos de demo).
3. En **Project Settings → API** copia la **URL** y la **clave publicable** (pública).
4. En **Authentication → URL Configuration**:
   - **Site URL**: `https://vantcall-esports.pplx.app`
   - **Redirect URLs**: añade `https://vantcall-esports.pplx.app/**`
5. Edita `auth.js` (constantes `SUPABASE_URL` y `SUPABASE_KEY` al inicio) con tu URL y clave publicable. Esta clave es pública por diseño; la seguridad depende de que **todas las tablas tengan RLS activado**.
6. En **Authentication → Providers**, activa **Discord** con tu Client ID y Client Secret (se guardan en Supabase, nunca en este repo).
7. Despliega la función `stripe-webhook` y guarda el secreto del webhook de Stripe en Supabase, no en el código.

## Pagos con Stripe

- Cada plan usa un Payment Link de Stripe. La web envía `client_reference_id` con el ID del usuario.
- El plan solo se activa cuando Stripe confirma el pago por **webhook**, no por la redirección del navegador.
- PayPal aparece en el checkout si está activo en la cuenta de Stripe.
- Si la activación tarda, el usuario puede escribir a feispla@hotmail.com.

## OAuth

**Implementado:**
- Login con Discord mediante Supabase Auth, con Authorization Code Flow + PKCE.
- Scopes: `identify email`.

**Pendiente (plan de diseño):**
- Login con Google.
- Verificación en dos pasos (2FA) con pantalla en la web.
- Vínculo por identificador permanente del proveedor (Google `sub`, Discord `id`), nunca por correo.
- Reautenticación reciente (10 min) para acciones sensibles: desvincular proveedores, cambiar correo, revocar sesiones.
- Desvinculación bloqueada si eliminaría el último método de acceso.

## Seguridad

- La clave `service_role`, el secreto del webhook de Stripe, el Client Secret de Discord y las URLs de webhooks de Discord **nunca** se suben a este repositorio. Se guardan en Supabase o en las variables del servidor.
- Todas las tablas deben tener RLS activado.

## Derechos de autor

© 2026 VANTS (Feispla). Todos los derechos reservados. Consulta el archivo `LICENSE`.

VANTCALL es una plataforma independiente. No está afiliada, patrocinada ni respaldada por Riot Games ni Valve. VALORANT y League of Legends son marcas de Riot Games, Inc. Counter-Strike es una marca de Valve Corporation.
