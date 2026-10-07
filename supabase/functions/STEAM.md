# Flujo de Steam en VANTS

VANTS usa **Steam OpenID 2.0** para autenticar jugadores con su cuenta de Steam. Hay **dos flujos independientes** que NO se mezclan: login web y vinculación móvil.

## Las tres Edge Functions

### 1. `steam-login` — Login web (entrar a VANTS con Steam)

- **Para qué**: iniciar sesión en la web (`feispla.github.io/Vantcall`). Si el usuario no existe, **crea la cuenta** automáticamente.
- **Rutas**:
  - `GET /steam-login?redirect_to=<url>` → 302 a Steam (sin sesión)
  - `GET /steam-login?state=<uuid>&openid.*` → callback de Steam
  - `POST /steam-login {redirect_to}` + `Authorization: Bearer <jwt>` → vincular Steam a una cuenta web ya iniciada
- **Config**: `verify_jwt = false` en `supabase/config.toml` (el navegador no puede mandar JWT en la redirección a Steam; el POST valida el JWT manualmente con `admin.auth.getUser(jwt)`).
- **Redirects permitidos**: lista cerrada en `DEFAULT_REDIRECTS` (github.io + dominios viejos + `vants://auth/callback`).
- **Al volver de Steam**: redirige a `redirect_to` con `?steam_token=<hash>&steam_type=magiclink` (el cliente hace `verifyOtp`) o `?steam_error=<motivo>`.
- **Tabla**: `public.steam_login_state` (states de un solo uso, 10 min).

### 2. `link-steam` — Inicio de vinculación (app móvil)

- **Para qué**: un usuario **ya autenticado** en la app móvil quiere vincular su cuenta de Steam.
- **Ruta**: `POST /link-steam` + JWT de usuario → devuelve `{ login_url, expires_in }` con la URL de Steam OpenID.
- **Autenticación**: requiere usuario (`auth: 'user'`), rate limit de 5 intentos/hora vía RPC `create_steam_link_state`.
- **Tabla**: `public.steam_link_state` (NOTA: tabla distinta a la de login).

### 3. `link-steam-callback` — Callback de Steam (app móvil)

- **Para qué**: Steam devuelve al usuario tras autenticarse; valida la respuesta OpenID y **graba la vinculación** en `user_game_accounts`.
- **Ruta**: `GET /link-steam-callback?state=<uuid>&openid.*`
- **Al terminar**: redirige a deep links de la app móvil:
  - `vants://link-success?game=steam`
  - `vants://link-error?reason=<motivo>`
- **Config**: `auth: 'none'` (la petición viene de Steam, no del usuario).
- **Tabla**: `public.steam_link_state` (DELETE atómico = state de un solo uso).

## Diferencias clave (no confundir)

| | `steam-login` | `link-steam` + `link-steam-callback` |
|---|---|---|
| Objetivo | Entrar a VANTS (web) | Vincular Steam a cuenta existente (app móvil) |
| Crea usuarios | Sí, si no existe | No (requiere sesión previa) |
| Tabla de states | `steam_login_state` | `steam_link_state` |
| Destino final | URL web (`redirect_to`) | Deep link `vants://` |
| JWT en gateway | `verify_jwt = false` | link-steam: requerido · callback: `auth: 'none'` |

## Seguridad (aplica a ambos flujos)

- State UUID de un solo uso, 10 minutos de vida, DELETE atómico (anti-replay, anti-concurrencia).
- Verificación OpenID completa: `return_to` exacto, campos firmados obligatorios, nonce reciente (±10 min), `check_authentication` contra `steamcommunity.com`.
- `STEAM_WEB_API_KEY` y `service_role` solo existen en el backend (secrets de Supabase).
- Steam **no comparte el correo**: las cuentas creadas por login usan email interno `steam_<id>@steam.vants.invalid`; el usuario puede añadir su correo real después.
