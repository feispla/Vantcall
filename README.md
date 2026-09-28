
## Funciones

- **Acceso**: Discord o correo y contraseña. El registro pide nombre de usuario (3-24 caracteres) y contraseña de al menos 8 caracteres, con verificación por email.
- **Mi cuenta**: plan, correo verificado, Discord, métodos de acceso y perfil de competidor (nombre visible, país, región, juego principal, bio y visibilidad pública o privada).
- **Planes** (pago único, IVA incluido):
  - VANT BASIC: 9 €
  - VANT PRO: 19 €
  - VANT ELITE: 39 €
- **Torneos por plan**: VANT Open (BASIC+), Pro Series (PRO+) y Elite Invitational (ELITE).
- **Bot de Discord**: comandos `/ranked`, `/jugador` y `/torneo`, sincronizados con la web en tiempo real.

## Configuración de Supabase

1. En **Authentication → URL Configuration**:
   - **Site URL**: `https://vantcall-esports.pplx.app`
   - **Redirect URLs**: `https://vantcall-esports1.pplx.app/**`
2. `auth.js` usa la URL del proyecto y la **clave publicable**, que es pública por diseño. La seguridad depende de que **todas las tablas tengan RLS activado**.
3. En **Authentication → Providers**, Discord está activo. El Client Secret se guarda en Supabase, nunca en este repo.
4. La función `stripe-webhook` verifica la firma de Stripe y activa el plan. Su secreto se guarda en Supabase, no en el código.

## Pagos con Stripe

- Cada plan usa un Payment Link de Stripe. La web envía `client_reference_id` con el ID del usuario.
- El plan solo se activa cuando Stripe confirma el pago por **webhook**, no por la redirección del navegador.
- PayPal aparece en el checkout si está activo en la cuenta de Stripe.
- Si la activación tarda, el usuario puede escribir a feispla@hotmail.com.

## OAuth

**Implementado:**
- Login con Discord mediante Supabase Auth, con Authorization Code Flow + PKCE.
- Scopes: `identify email`.

**Pendiente:**
- Login con Google.
- Verificación en dos pasos (2FA) con pantalla en la web.
- Reautenticación reciente (10 min) para acciones sensibles: desvincular proveedores, cambiar correo, revocar sesiones.
- Desvinculación bloqueada si eliminaría el último método de acceso.

## Seguridad

- La clave `service_role`, el secreto del webhook de Stripe, el Client Secret de Discord y las URLs de webhooks de Discord **nunca** se suben a este repositorio.
- Todas las tablas deben tener RLS activado.
## Modo demo (solo pruebas)

La web oficial usa **datos reales**. El modo demo existe solo para probar la web en local o enseñarla sin conectar Supabase.

- **Archivos de demo:**
  - `data.js`: equipos, jugadores y partidos ficticios.
  - `supabase/seed.sql`: datos de ejemplo para cargar en un proyecto Supabase de pruebas.
- **Cómo funciona:** si abres `index.html` sin conexión a Supabase, la web muestra los datos de `data.js`.
- **Versión original:** la etiqueta `v1.0-creacion` contiene la web inicial completa en modo demo.

> Nunca ejecutes `seed.sql` en el proyecto de producción: mezclaría datos ficticios con los reales.

## Derechos de autor

© 2026 VANTS (Feispla). Todos los derechos reservados. Consulta el archivo `LICENSE`.

VANTCALL es una plataforma independiente. No está afiliada, patrocinada ni respaldada por Riot Games ni Valve. VALORANT y League of Legends son marcas de Riot Games, Inc. Counter-Strike es una marca de Valve Corporation.
