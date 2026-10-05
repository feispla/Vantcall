// ============================================
// discord-admin — Conecta y gestiona el bot de Discord desde el panel admin de la web
//
// Requiere el JWT de un usuario que esté en public.web_admins.
//   POST { action: 'status' }                       → estado del bot, app, endpoint, canales y comandos
//   POST { action: 'connect', token }               → guarda token + clave pública en Vault, fija el
//                                                     Interactions Endpoint y registra los comandos
//   POST { action: 'sync' }                         → vuelve a registrar los comandos de public.bot_commands
//   POST { action: 'announce', category|channel_id, title, body } → publica un anuncio
// ============================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const service = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
const API = 'https://discord.com/api/v10';
const DEFAULT_GUILD = '1546641331927908472';
const ENDPOINT = `${SUPABASE_URL}/functions/v1/discord-commands`;
const SITE = (Deno.env.get('VANTS_SITE_URL') ?? 'https://vantsbetaa.pplx.app').replace(/\/$/, '');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

async function secret(name: string): Promise<string | null> {
  const { data } = await service.rpc('get_bot_secret', { p_name: name });
  return typeof data === 'string' && data ? data : null;
}

async function discord(token: string, path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'VANTS-Admin (https://vantsbetaa.pplx.app, 1.0)', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(10000),
  });
  const text = await r.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: r.ok, status: r.status, body: body as Record<string, unknown> & unknown[] };
}

// ---------- definición de slash commands ----------
const S = 3, I = 4, U = 6, C = 7, SUB = 1;
const opt = (type: number, name: string, description: string, extra: Record<string, unknown> = {}) => ({ type, name, description, ...extra });
const choices = (arr: [string, string][]) => arr.map(([name, value]) => ({ name, value }));

const BUILTIN_OPTIONS: Record<string, unknown[]> = {
  perfil: [opt(U, 'usuario', 'Jugador a consultar (por defecto tú)')],
  torneo: [opt(SUB, 'inscribir', 'Inscríbete en un torneo', { options: [opt(S, 'torneo', 'Identificador del torneo (usa /torneos)', { required: true })] })],
  vants: [
    opt(SUB, 'canal', 'Elige dónde publica el bot cada tipo de aviso', { options: [
      opt(S, 'categoria', 'Tipo de aviso', { required: true, choices: choices([['Anuncios', 'anuncios'], ['Registros', 'registros'], ['Ranked', 'ranked'], ['Staff', 'staff'], ['Logs', 'logs']]) }),
      opt(C, 'canal', 'Canal de texto', { required: true, channel_types: [0, 5] }),
    ] }),
    opt(SUB, 'torneo-crear', 'Publica un torneo en la web', { options: [
      opt(S, 'nombre', 'Nombre del torneo', { required: true }),
      opt(S, 'inicio', 'Fecha de inicio AAAA-MM-DD HH:MM', { required: true }),
      opt(S, 'descripcion', 'Descripción'),
      opt(S, 'formato', 'Formato', { choices: choices([['Eliminación simple', 'single_elimination'], ['Doble eliminación', 'double_elimination'], ['Liga', 'round_robin'], ['Suizo', 'swiss']]) }),
      opt(I, 'plazas', 'Plazas máximas', { min_value: 2, max_value: 512 }),
      opt(S, 'premio', 'Premio'),
      opt(S, 'nivel', 'Plan mínimo', { choices: choices([['Abierto', 'basic'], ['PRO', 'pro'], ['ELITE', 'elite']]) }),
      opt(S, 'cierre', 'Cierre de inscripción AAAA-MM-DD HH:MM'),
    ] }),
    opt(SUB, 'torneo-estado', 'Cambia el estado de un torneo', { options: [
      opt(S, 'torneo', 'Identificador del torneo', { required: true }),
      opt(S, 'estado', 'Nuevo estado', { required: true, choices: choices([['Inscripción abierta', 'registration'], ['Inscripción cerrada', 'closed'], ['En curso', 'in_progress'], ['Finalizado', 'completed'], ['Cancelado', 'cancelled']]) }),
    ] }),
    opt(SUB, 'evento-crear', 'Publica un evento en el calendario', { options: [
      opt(S, 'titulo', 'Título', { required: true }),
      opt(S, 'inicio', 'Inicio AAAA-MM-DD HH:MM', { required: true }),
      opt(S, 'fin', 'Fin AAAA-MM-DD HH:MM'),
      opt(S, 'descripcion', 'Descripción'),
      opt(S, 'tipo', 'Tipo', { choices: choices([['Comunidad', 'comunidad'], ['Scrim', 'scrim'], ['Stream', 'stream'], ['Tryout', 'tryout']]) }),
      opt(S, 'lugar', 'Lugar (por defecto Discord)'),
      opt(I, 'aforo', 'Aforo máximo', { min_value: 1 }),
    ] }),
    opt(SUB, 'temporada-iniciar', 'Cierra la temporada actual y abre una nueva', { options: [
      opt(S, 'fin', 'Fin AAAA-MM-DD HH:MM', { required: true }),
      opt(S, 'nombre', 'Nombre de la temporada'),
    ] }),
    opt(SUB, 'estado', 'Estado de las notificaciones del bot'),
  ],
};

async function commandPayload() {
  const { data } = await service.from('bot_commands').select('name, description, kind, enabled, staff_only').eq('enabled', true).order('sort_order');
  return (data ?? []).map((c) => ({
    name: c.name,
    description: String(c.description).slice(0, 100),
    type: 1,
    options: c.kind === 'builtin' ? (BUILTIN_OPTIONS[c.name] ?? []) : [],
    ...(c.staff_only ? { default_member_permissions: '8192' } : {}),
    dm_permission: false,
  }));
}

async function syncCommands(token: string, appId: string, guildId: string) {
  const payload = await commandPayload();
  const r = await discord(token, `/applications/${appId}/guilds/${guildId}/commands`, { method: 'PUT', body: JSON.stringify(payload) });
  if (!r.ok) return { ok: false, error: `Discord ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}` };
  return { ok: true, count: Array.isArray(r.body) ? r.body.length : payload.length };
}

const CATEGORIES = ['anuncios', 'registros', 'ranked', 'staff', 'logs'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Solo administradores de la web
  const auth = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: role } = await userClient.rpc('web_admin_role');
  if (!role) return json({ error: 'solo_admin' }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? 'status');
  const guildId = (await secret('discord_guild_id')) ?? DEFAULT_GUILD;

  try {
    if (action === 'connect') {
      if (!['owner', 'admin'].includes(role)) return json({ error: 'solo_admin' }, 403);
      const token = String(body?.token ?? '').trim().replace(/^Bot\s+/i, '');
      if (!/^[\w-]{20,}\.[\w-]{4,}\.[\w-]{20,}$/.test(token)) return json({ error: 'El token no tiene el formato de un token de bot de Discord.' }, 400);
      const me = await discord(token, '/users/@me');
      if (!me.ok) return json({ error: 'Discord rechazó el token (401). Copia de nuevo el token desde Developer Portal → Bot → Reset Token.' }, 400);
      const app = await discord(token, '/applications/@me');
      if (!app.ok) return json({ error: 'No se pudo leer la aplicación del bot.' }, 400);
      const appId = String(app.body.id), verifyKey = String(app.body.verify_key);
      for (const [n, v] of [['discord_bot_token', token], ['discord_application_id', appId], ['discord_public_key', verifyKey]]) {
        const { error } = await userClient.rpc('admin_set_bot_secret', { p_name: n, p_value: v });
        if (error) return json({ error: `No se pudo guardar ${n}: ${error.message}` }, 500);
      }
      if (body?.guild_id && /^\d{17,20}$/.test(String(body.guild_id))) await userClient.rpc('admin_set_bot_secret', { p_name: 'discord_guild_id', p_value: String(body.guild_id) });
      // Endpoint de interacciones → Discord envía un PING firmado a discord-commands
      const patch = await discord(token, '/applications/@me', { method: 'PATCH', body: JSON.stringify({ interactions_endpoint_url: ENDPOINT }) });
      const sync = await syncCommands(token, appId, guildId);
      await service.from('audit_logs').insert({ actor_type: 'web_admin', actor_id: 'panel', action: 'discord_connect', target_type: 'discord_app', target_id: appId, metadata: { endpoint: patch.ok, commands: sync } });
      return json({ ok: true, bot: { id: me.body.id, username: me.body.username }, application: { id: appId, name: app.body.name }, endpoint: patch.ok ? 'ok' : `error ${patch.status}: ${JSON.stringify(patch.body).slice(0, 200)}`, commands: sync });
    }

    const token = await secret('discord_bot_token') ?? Deno.env.get('DISCORD_BOT_TOKEN') ?? Deno.env.get('DISCORD_TOKEN') ?? null;
    if (!token) return json({ connected: false, guild_id: guildId, endpoint: ENDPOINT });

    if (action === 'status') {
      const [me, app, channels] = await Promise.all([discord(token, '/users/@me'), discord(token, '/applications/@me'), discord(token, `/guilds/${guildId}/channels`)]);
      const appId = app.ok ? String(app.body.id) : await secret('discord_application_id');
      const registered = appId ? await discord(token, `/applications/${appId}/guilds/${guildId}/commands`) : null;
      return json({
        connected: me.ok,
        bot: me.ok ? { id: me.body.id, username: me.body.username, avatar: me.body.avatar } : null,
        application: app.ok ? { id: app.body.id, name: app.body.name, interactions_endpoint_url: app.body.interactions_endpoint_url, approximate_guild_count: app.body.approximate_guild_count } : null,
        endpoint_ok: app.ok && app.body.interactions_endpoint_url === ENDPOINT,
        endpoint: ENDPOINT,
        guild_id: guildId,
        in_guild: channels.ok,
        channels: channels.ok && Array.isArray(channels.body) ? channels.body.filter((c: { type: number }) => c.type === 0 || c.type === 5).map((c: { id: string; name: string; parent_id: string | null }) => ({ id: c.id, name: c.name })) : [],
        registered: registered && registered.ok && Array.isArray(registered.body) ? registered.body.map((c: { name: string }) => c.name) : [],
        invite: appId ? `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot%20applications.commands&permissions=277025508352&guild_id=${guildId}` : null,
      });
    }

    if (action === 'sync') {
      const appId = await secret('discord_application_id') ?? String((await discord(token, '/applications/@me')).body?.id ?? '');
      if (!appId) return json({ error: 'Falta el ID de la aplicación. Conecta el bot de nuevo.' }, 400);
      const sync = await syncCommands(token, appId, guildId);
      return json(sync, sync.ok ? 200 : 502);
    }

    if (action === 'announce') {
      let channel = String(body?.channel_id ?? '');
      if (!/^\d{17,20}$/.test(channel)) {
        const cat = String(body?.category ?? 'anuncios');
        if (!CATEGORIES.includes(cat)) return json({ error: 'Categoría no válida' }, 400);
        const { data } = await service.from('discord_channels').select('channel_id').eq('category', cat).maybeSingle();
        channel = data?.channel_id ?? '';
      }
      if (!channel) return json({ error: 'No hay canal configurado para esa categoría.' }, 400);
      const title = String(body?.title ?? '').slice(0, 256).trim();
      const text = String(body?.body ?? '').replace(/@(everyone|here)/g, '@\u200b$1').slice(0, 3500);
      if (title.length < 2) return json({ error: 'Escribe un título.' }, 400);
      const r = await discord(token, `/channels/${channel}/messages`, { method: 'POST', body: JSON.stringify({ embeds: [{ title, description: text, color: 0xff4655, url: SITE, footer: { text: 'VANTS · vantcall esports' }, timestamp: new Date().toISOString() }], allowed_mentions: { parse: [] } }) });
      if (!r.ok) return json({ error: `Discord ${r.status}: el bot necesita ver el canal y enviar mensajes.` }, 502);
      await service.from('audit_logs').insert({ actor_type: 'web_admin', actor_id: 'panel', action: 'discord_announce', target_type: 'discord_channel', target_id: channel, metadata: { title } });
      return json({ ok: true });
    }

    return json({ error: 'accion_desconocida' }, 400);
  } catch (e) {
    console.error('discord-admin', action, e);
    return json({ error: 'Error inesperado hablando con Discord.' }, 500);
  }
});
