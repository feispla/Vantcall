# VANTS — Plataforma competitiva de esports

Plataforma web para VALORANT, Counter-Strike 2 y League of Legends: calendario de partidos, torneos con bracket y clasificación, rankings, estadísticas, noticias, perfiles de equipos y jugadores.

## Estado

- **Demo local**: `index.html` funciona sin backend con `data.js` (datos ficticios).
- **Datos reales (Supabase)**: la web consulta tu proyecto Supabase vía REST. Ver `supabase/`.
- **Publicado**: https://vants.pplx.app

## Estructura

```
├── index.html        Shell de la app (header, nav, footer)
├── base.css          Estilos base
├── style.css         Sistema de diseño VANTS (tema claro/oscuro)
├── app.js            Enrutador hash + vistas
├── data.js           Datos ficticios de demostración (fallback)
└── supabase/
    ├── schema.sql    Tablas + RLS (ejecutar en SQL Editor)
    └── seed.sql      Datos iniciales de ejemplo
```

## Conectar datos reales de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta `supabase/schema.sql` y luego `supabase/seed.sql` (el seed es opcional, son datos de demo).
3. En **Project Settings → API** copia la **URL** y la **clave anon** (pública).
4. Configura el origen permitido en **Authentication → URL Configuration**: añade `https://vants.pplx.app`.
5. Edita `app.js` (sección `SUPABASE` al inicio) y coloca tu URL y clave anon. La clave anon es pública por diseño; las tablas competitivas solo permiten lectura (`select`) gracias a las políticas RLS del esquema. La escritura se hace con la clave `service_role`, que nunca va en el frontend.
6. Al recargar la web, si Supabase responde, la plataforma usa tus datos reales; si no, cae al modo demo.

## OAuth (Google y Discord) — plan de implementación

El diseño de identidad definido para VANTS:

- Authorization Code Flow + PKCE (S256), `state` y `nonce` por operación.
- Vínculo por identificador permanente del proveedor (Google `sub`, Discord `id`), nunca por correo.
- Tablas `oauth_accounts` y `oauth_link_requests` con tokens cifrados (AES-256-GCM) y `UNIQUE(provider, provider_account_id)`.
- Reautenticación reciente (10 min) para acciones sensibles: desvincular proveedores, cambiar correo, revocar sesiones.
- Desvinculación bloqueada si eliminaría el último método de acceso.

> Este repositorio es la capa estática de presentación. El backend de OAuth requiere un servidor (Vercel/Node) con los `CLIENT_SECRET` como variables de entorno; no deben subirse nunca a este repo.

## Marcas

VANTS es una plataforma independiente. No está afiliada, patrocinada ni respaldada por Riot Games ni Valve. VALORANT y League of Legends son marcas de Riot Games, Inc. Counter-Strike es una marca de Valve Corporation.
