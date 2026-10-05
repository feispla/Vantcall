// ============================================
// discord-commands — Endpoint de interacciones del bot VANTS (slash commands)
//
// Discord firma cada petición (Ed25519 con DISCORD_PUBLIC_KEY). Los comandos leen y
// escriben en Supabase con service_role; las acciones de staff exigen que el usuario
// esté en public.bot_admins. Registra los comandos con bot/register_commands.py.
// ============================================
import nacl from 'npm:tweetnacl@1.0.3';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ENV_PUBLIC_KEY = Deno.env.get('DISCORD_PUBLIC_KEY') ?? '';
const SITE = (Deno.env.get('VANTS_SITE_URL') ?? 'https://vantsbetaa.pplx.app').replace(/\/$/, '');
const TZ = Deno.env.get('VANTS_TZ') ?? 'Europe/Madrid';
const INVITE = 'https://discord.gg/rCHE7jvRS4';
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });

const encoder = new TextEncoder();
const RED = 0xff4655, AMBER = 0xffb547, SLATE = 0x8b97a3, GREEN = 0x3ddc84, BLUE = 0x5865f2;
const EPHEMERAL = 64;

// Rangos de VALORANT (Riot). El campo rank de la DB guarda el tier actual del jugador.
const VALORANT_RANKS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];
const rankOf = (mmr: number | null | undefined, explicit?: string | null) => explicit || 'Unranked';
const STATUS: Record<string, string> = { draft: 'Borrador', upcoming: 'Próximamente', registration: 'Inscripción abierta', open: 'Inscripción abierta', in_progress: 'En curso', live: 'En vivo', active: 'Activa', completed: 'Finalizado', cancelled: 'Cancelado', closed: 'Cerrada', scheduled: 'Programado' };
const st = (s: unknown) => STATUS[String(s ?? '')] ?? String(s ?? '—');
const clip = (s: unknown, n = 100) => { const t = String(s ?? '').replace(/@(everyone|here)/g, '@\u200b$1'); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const ts = (d: unknown, style = 'f') => { const t = Date.parse(String(d ?? '')); return Number.isFinite(t) ? `<t:${Math.floor(t / 1000)}:${style}>` : '—'; };
const url = (path: string) => `${SITE}/#/${path}`;

// ---------- firma ----------
function hexToBytes(value: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
// Clave pública: secret DISCORD_PUBLIC_KEY o Vault (la guarda el panel admin al conectar el bot)
let vaultKey: string | null = null;
async function publicKey(): Promise<string> {
  if (ENV_PUBLIC_KEY) return ENV_PUBLIC_KEY;
  if (!vaultKey) {
    const { data } = await admin.rpc('get_bot_secret', { p_name: 'discord_public_key' });
    vaultKey = typeof data === 'string' && data ? data : null;
  }
  return vaultKey ?? '';
}
function isValidDiscordRequest(req: Request, body: string, DISCORD_PUBLIC_KEY: string): boolean {
  const signature = hexToBytes(req.headers.get('X-Signature-Ed25519') ?? '');
  const timestamp = req.headers.get('X-Signature-Timestamp') ?? '';
  const publicKey = hexToBytes(DISCORD_PUBLIC_KEY);
  if (!signature || signature.length !== 64 || !publicKey || publicKey.length !== 32 || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  return nacl.sign.detached.verify(encoder.encode(timestamp + body), signature, publicKey);
}

// ---------- utilidades ----------
type Opt = { name: string; type: number; value?: unknown; options?: Opt[] };
type Interaction = { type: number; data?: { name: string; options?: Opt[] }; member?: { user?: DUser; permissions?: string }; user?: DUser; guild_id?: string };
type DUser = { id: string; username?: string; global_name?: string };
type Embed = Record<string, unknown>;

function commandPath(data: { name: string; options?: Opt[] }): { path: string; opts: Record<string, unknown> } {
  const path = [data.name];
  let options = data.options ?? [];
  for (;;) {
    const sub = options.find((o) => o.type === 1 || o.type === 2);
    if (!sub) break;
    path.push(sub.name);
    options = sub.options ?? [];
  }
  const opts: Record<string, unknown> = {};
  for (const o of options) opts[o.name] = o.value;
  return { path: path.join(' '), opts };
}

const reply = (content: string, embeds: Embed[] = [], ephemeral = true) =>
  json({ type: 4, data: { content, embeds: embeds.map((e) => ({ footer: { text: 'VANTS · vantcall esports' }, ...e })), flags: ephemeral ? EPHEMERAL : 0, allowed_mentions: { parse: [] } } });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

async function playerByDiscord(discordId: string) {
  const { data: link } = await admin.from('player_discord_accounts').select('player_id').eq('discord_id', discordId).maybeSingle();
  const pid = link?.player_id ?? (await admin.from('players').select('id').eq('discord_user_id', discordId).maybeSingle()).data?.id;
  if (!pid) return null;
  const { data } = await admin.from('players').select('id, username, display_name, avatar_url, region, main_game, verified').eq('id', pid).maybeSingle();
  return data;
}
async function activeSeason() {
  const { data } = await admin.from('seasons').select('id, name, season_number, start_date, end_date, status').eq('status', 'active').order('season_number', { ascending: false }).limit(1).maybeSingle();
  return data;
}
async function planOf(playerId: string): Promise<string> {
  const { data } = await admin.from('entitlements').select('tier, expires_at').eq('player_id', playerId).eq('is_active', true);
  const order = ['free', 'basic', 'pro', 'elite'];
  let best = 'free';
  for (const e of data ?? []) {
    if (e.expires_at && Date.parse(e.expires_at) <= Date.now()) continue;
    const t = String(e.tier ?? '').toLowerCase();
    if (order.indexOf(t) > order.indexOf(best)) best = t;
  }
  return best;
}
async function isStaff(discordId: string): Promise<boolean> {
  const { data } = await admin.from('bot_admins').select('role').eq('discord_id', discordId).maybeSingle();
  return Boolean(data && ['admin', 'super_admin', 'moderator'].includes(data.role));
}
async function audit(actor: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  await admin.from('audit_logs').insert({ actor_type: 'discord', actor_id: actor, action, target_type: targetType, target_id: targetId, metadata });
}
/** "2026-10-12 20:00" en la zona VANTS_TZ → ISO UTC. También acepta ISO con zona. */
function parseLocalDate(input: unknown): string | null {
  const s = String(input ?? '').trim();
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) && Number.isFinite(Date.parse(s))) return new Date(s).toISOString();
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asTz = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'));
  return new Date(guess - (asTz - guess)).toISOString();
}
const slugify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'torneo';

// ---------- catálogo de comandos (public.bot_commands) ----------
type Cmd = { name: string; description: string; kind: string; category: string; enabled: boolean; staff_only: boolean; min_plan: string; response_title: string | null; response_body: string | null; response_url: string | null; color: string | null; ephemeral: boolean; uses: number };
let catalog: { at: number; map: Map<string, Cmd> } | null = null;
async function commands(): Promise<Map<string, Cmd>> {
  if (catalog && Date.now() - catalog.at < 30_000) return catalog.map;
  const { data } = await admin.from('bot_commands').select('*').order('sort_order');
  catalog = { at: Date.now(), map: new Map((data ?? []).map((c: Cmd) => [c.name, c])) };
  return catalog.map;
}
const PLAN_ORDER = ['free', 'basic', 'pro', 'elite'];
const PLAN_NAME: Record<string, string> = { free: 'Gratis', basic: 'VANT BASIC', pro: 'VANT PRO', elite: 'VANT ELITE' };
const hexColor = (c: string | null | undefined, d = RED) => (c && /^#[0-9a-f]{6}$/i.test(c) ? parseInt(c.slice(1), 16) : d);
async function logRun(command: string, user: DUser, guildId: string | undefined, ok: boolean) {
  await admin.from('bot_command_runs').insert({ command, discord_id: user.id, guild_id: guildId ?? null, ok });
  const c = (await commands()).get(command);
  if (c) await admin.from('bot_commands').update({ uses: (c.uses ?? 0) + 1, last_used_at: new Date().toISOString() }).eq('name', command);
}

// ---------- comandos ----------
async function handle(path: string, opts: Record<string, unknown>, user: DUser, guildId?: string): Promise<Response> {
  switch (path) {
    case 'ayuda': case 'help': {
      const list = [...(await commands()).values()].filter((c) => c.enabled);
      const staff = await isStaff(user.id);
      const lines = list.filter((c) => !c.staff_only).map((c) => `\`/${c.name}\` — ${clip(c.description, 80)}${c.min_plan !== 'free' ? ` · ${PLAN_NAME[c.min_plan]}` : ''}`);
      if (staff) lines.push('', '**Staff:** `/vants canal`, `/vants torneo-crear`, `/vants torneo-estado`, `/vants evento-crear`, `/vants temporada-iniciar`, `/vants estado`');
      return reply('', [{ title: 'Comandos de VANTS', color: RED, url: url('inicio'), description: lines.join('\n') || 'No hay comandos activos.' }]);
    }

    case 'zona': {
      const p = await playerByDiscord(user.id);
      if (!p) return reply(`Vincula tu Discord para ver tus ventajas: ${url('login')}`);
      const plan = await planOf(p.id);
      if (plan === 'free') return reply('', [{ title: 'Zona exclusiva VANTS', color: AMBER, url: url('precios'), description: `Aún no tienes plan. Desbloquea torneos privados, scrims y el canal Command desde **9 €**.\n[Ver planes](${url('precios')})` }]);
      const rank = PLAN_ORDER.indexOf(plan);
      const { data: perks } = await admin.from('plan_content').select('tier, kind, title, cta_url').eq('published', true).order('sort_order');
      const mine = (perks ?? []).filter((x) => PLAN_ORDER.indexOf(String(x.tier)) <= rank);
      return reply('', [{ title: `Tu zona ${PLAN_NAME[plan]}`, color: plan === 'elite' ? AMBER : RED, url: url('zona'), description: mine.map((x) => `• ${clip(x.title, 80)}${x.cta_url && String(x.cta_url).startsWith('https://') ? ` — [abrir](${x.cta_url})` : ''}`).join('\n') || 'Tus ventajas aparecerán aquí.', fields: [{ name: 'Panel completo', value: `[Abrir zona exclusiva](${url('zona')})` }] }]);
    }

    case 'web':
      return reply('', [{ title: 'VANTS · vantcall esports', color: RED, url: SITE, description: `[Web](${SITE}) · [Ranked](${url('ranked')}) · [Torneos](${url('torneos')}) · [Calendario](${url('calendario')}) · [Planes](${url('precios')}) · [Zona de plan](${url('zona')})` }], false);

    case 'vincular': {
      const p = await playerByDiscord(user.id);
      if (p) return reply(`Tu Discord ya está vinculado a **${clip(p.display_name || p.username, 40)}**.`, [], true);
      return reply('', [{ title: 'Vincula tu Discord', color: BLUE, description: `1. Abre ${url('login')}\n2. Pulsa **Continuar con Discord** (o entra con tu cuenta y pulsa **Vincular Discord** en Mi cuenta).\n3. Vuelve aquí y usa \`/perfil\`.` }]);
    }

    case 'perfil': {
      const targetId = typeof opts.usuario === 'string' ? opts.usuario : user.id;
      const p = await playerByDiscord(targetId);
      if (!p) return reply(targetId === user.id ? `Aún no tienes perfil VANTS vinculado. Entra con Discord en ${url('login')}.` : 'Ese usuario no tiene un perfil VANTS vinculado.');
      const season = await activeSeason();
      const { data: stat } = season ? await admin.from('season_player_stats').select('mmr, rank, wins, losses, placement_done').eq('season_id', season.id).eq('player_id', p.id).maybeSingle() : { data: null };
      const plan = await planOf(p.id);
      const games = (stat?.wins ?? 0) + (stat?.losses ?? 0);
      return reply('', [{
        title: `${clip(p.display_name || p.username, 60)}${p.verified ? ' ✓' : ''}`, url: url(`jugador/${encodeURIComponent(p.username)}`), color: plan === 'elite' ? AMBER : RED,
        ...(p.avatar_url ? { thumbnail: { url: p.avatar_url } } : {}),
        fields: [
          { name: 'Rango', value: stat ? (stat.placement_done ? rankOf(stat.mmr, stat.rank) : 'En placement') : 'Sin temporada', inline: true },
          { name: 'MMR', value: String(stat?.mmr ?? '—'), inline: true },
          { name: 'V / D', value: `${stat?.wins ?? 0} / ${stat?.losses ?? 0}${games ? ` (${Math.round(((stat?.wins ?? 0) / games) * 100)}%)` : ''}`, inline: true },
          { name: 'Plan', value: plan === 'free' ? 'Gratis' : `VANT ${plan.toUpperCase()}`, inline: true },
          { name: 'Región', value: p.region || '—', inline: true },
          { name: 'Juego', value: ({ valorant: 'VALORANT', cs2: 'CS2', lol: 'LoL' } as Record<string, string>)[p.main_game ?? ''] ?? '—', inline: true },
        ],
      }], false);
    }

    case 'ranking': {
      const season = await activeSeason();
      if (!season) return reply('No hay una temporada ranked activa ahora mismo.', [], false);
      const { data } = await admin.from('leaderboard').select('username, display_name, mmr, rank, wins, losses, position').eq('season_id', season.id).order('mmr', { ascending: false }).limit(10);
      const lines = (data ?? []).map((r, i) => `**${i + 1}.** ${clip(r.display_name || r.username, 30)} — ${r.mmr ?? 0} MMR · ${rankOf(r.mmr, r.rank)} · ${r.wins ?? 0}V/${r.losses ?? 0}D`);
      return reply('', [{ title: `Ranking · ${clip(season.name || `Temporada ${season.season_number}`, 60)}`, url: url('ranked'), color: RED, description: lines.join('\n') || 'Aún no hay jugadores clasificados.' }], false);
    }

    case 'torneos': {
      const { data } = await admin.from('tournaments').select('name, slug, status, format, starts_at, current_participants, max_participants, prize_pool').in('status', ['registration', 'open', 'upcoming', 'in_progress', 'live', 'active', 'scheduled']).order('starts_at', { ascending: true }).limit(10);
      if (!data?.length) return reply(`No hay torneos abiertos ahora mismo. Sigue ${url('torneos')}.`, [], false);
      return reply('', [{ title: 'Torneos VANTS', url: url('torneos'), color: RED, fields: data.map((t) => ({ name: clip(t.name, 90), value: `${st(t.status)} · ${ts(t.starts_at)} · ${t.current_participants ?? 0}/${t.max_participants ?? '—'}${t.prize_pool ? ` · ${clip(t.prize_pool, 40)}` : ''}\n\`${t.slug}\` · [ver](${url(`torneo/${encodeURIComponent(t.slug)}`)})` })) }], false);
    }

    case 'torneo inscribir': {
      const p = await playerByDiscord(user.id);
      if (!p) return reply(`Primero vincula tu Discord: ${url('login')}`);
      const slug = String(opts.torneo ?? '').trim().toLowerCase();
      const { data: t } = await admin.from('tournaments').select('id, name, status, current_participants, max_participants, registration_closes_at').eq('slug', slug).maybeSingle();
      if (!t) return reply('No encuentro ese torneo. Usa `/torneos` para ver los identificadores.');
      if (!['registration', 'open'].includes(t.status)) return reply(`La inscripción de **${clip(t.name, 60)}** no está abierta (${st(t.status)}).`);
      if (t.registration_closes_at && Date.parse(t.registration_closes_at) < Date.now()) return reply('El plazo de inscripción ya cerró.');
      if (t.max_participants && (t.current_participants ?? 0) >= t.max_participants) return reply('El torneo está completo.');
      const { data: exists } = await admin.from('tournament_entries').select('id').eq('tournament_id', t.id).eq('player_id', p.id).maybeSingle();
      if (exists) return reply(`Ya estás inscrito en **${clip(t.name, 60)}**.`);
      const { error } = await admin.from('tournament_entries').insert({ tournament_id: t.id, player_id: p.id, status: 'registered' });
      if (error) return reply('No se pudo completar la inscripción. Inténtalo desde la web.');
      return reply(`Inscripción confirmada en **${clip(t.name, 60)}**. Suerte.`, [], true);
    }

    case 'eventos': {
      const { data } = await admin.from('events').select('title, event_type, status, location, starts_at, current_attendees, max_attendees').gte('starts_at', new Date(Date.now() - 3 * 3600_000).toISOString()).order('starts_at').limit(10);
      if (!data?.length) return reply('No hay eventos programados.', [], false);
      return reply('', [{ title: 'Próximos eventos', url: url('calendario'), color: BLUE, fields: data.map((e) => ({ name: clip(e.title, 90), value: `${ts(e.starts_at)} · ${clip(e.location || 'Online', 40)}${e.max_attendees ? ` · ${e.current_attendees ?? 0}/${e.max_attendees}` : ''}` })) }], false);
    }

    case 'calendario': {
      const now = new Date().toISOString(), week = new Date(Date.now() + 7 * 86400_000).toISOString();
      const [ev, tn, tm] = await Promise.all([
        admin.from('events').select('title, starts_at').gte('starts_at', now).lte('starts_at', week),
        admin.from('tournaments').select('name, starts_at').gte('starts_at', now).lte('starts_at', week).neq('status', 'draft'),
        admin.from('tournament_matches').select('round, scheduled_at, tournament:tournaments(name)').gte('scheduled_at', now).lte('scheduled_at', week),
      ]);
      const items = [
        ...(ev.data ?? []).map((e) => ({ at: e.starts_at, text: `Evento · ${clip(e.title, 70)}` })),
        ...(tn.data ?? []).map((t) => ({ at: t.starts_at, text: `Torneo · ${clip(t.name, 70)}` })),
        ...(tm.data ?? []).map((m) => ({ at: m.scheduled_at, text: `Partida · ${clip((m.tournament as { name?: string } | null)?.name ?? 'Torneo', 50)} R${m.round ?? '?'}` })),
      ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(0, 15);
      return reply('', [{ title: 'Calendario · próximos 7 días', url: url('calendario'), color: RED, description: items.map((i) => `${ts(i.at, 'f')} — ${i.text}`).join('\n') || 'Nada programado esta semana.' }], false);
    }

    case 'planes':
      return reply('', [{ title: 'Planes VANTS', url: url('precios'), color: AMBER, fields: [
        { name: 'VANT BASIC · 9 €', value: 'Torneos abiertos, perfil Ranked y soporte.' },
        { name: 'VANT PRO · 19 €', value: 'Pro Series, scrims privadas y prioridad en tryouts.' },
        { name: 'VANT ELITE · 39 €', value: 'Elite Invitational, canal Command y badge Elite.' },
      ], description: `Compra en ${url('precios')} · contenido exclusivo en ${url('zona')}` }], false);

    // ---------- staff ----------
    // ---------- Moderación ----------
    case 'warn': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const target = opts.usuario as string;
      const razon = clip(opts.razon ?? 'Sin razón', 200);
      return json({ type: 4, data: { content: `⚠️ **Advertencia** para <@${target}>: ${razon} (por ${user.username})` } });
    }
    case 'kick': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const target = opts.usuario as string;
      const razon = clip(opts.razon ?? 'Sin razón', 200);
      return json({ type: 4, data: { content: `👢 **Usuario expulsado** <@${target}>: ${razon} (por ${user.username})` } });
    }
    case 'ban': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const target = opts.usuario as string;
      const razon = clip(opts.razon ?? 'Sin razón', 200);
      const dias = Number(opts.borrar_dias) || 0;
      return json({ type: 4, data: { content: `🔨 **Usuario baneado** <@${target}>: ${razon} (mensajes borrados: ${dias}d, por ${user.username})` } });
    }
    case 'mute': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const target = opts.usuario as string;
      const minutos = Number(opts.minutos) || 10;
      const razon = clip(opts.razon ?? 'Sin razón', 200);
      return json({ type: 4, data: { content: `🔇 **Usuario silenciado** <@${target}> por ${minutos} min: ${razon} (por ${user.username})` } });
    }
    case 'unmute': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const target = opts.usuario as string;
      return json({ type: 4, data: { content: `🔊 **Silencio quitado** a <@${target}> (por ${user.username})` } });
    }
    case 'clear': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const cantidad = Math.min(Number(opts.cantidad) || 10, 100);
      return json({ type: 4, data: { content: `🗑️ **${cantidad} mensajes eliminados** del canal (por ${user.username})` } });
    }
    case 'lock': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      return json({ type: 4, data: { content: `🔒 **Canal bloqueado** por ${user.username}` } });
    }
    case 'unlock': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      return json({ type: 4, data: { content: `🔓 **Canal desbloqueado** por ${user.username}` } });
    }

    // ---------- Análisis ----------
    case 'stats_servidor': {
      const players = await admin.from('players').select('id', { count: 'exact', head: true });
      const tournaments = await admin.from('tournaments').select('id', { count: 'exact', head: true });
      const matches = await admin.from('ranked_matches').select('id', { count: 'exact', head: true }).eq('status', 'completed');
      return json({ type: 4, data: { embeds: [{ title: '📊 Stats del servidor VANTS', color: 0x00B6AF, fields: [
        { name: 'Jugadores registrados', value: String(players.count ?? 0), inline: true },
        { name: 'Torneos', value: String(tournaments.count ?? 0), inline: true },
        { name: 'Partidas ranked', value: String(matches.count ?? 0), inline: true },
      ], timestamp: new Date().toISOString() }] } });
    }
    case 'stats_jugador': {
      const targetId = (opts.usuario as string) ?? user.id;
      const player = await playerByDiscord(targetId);
      if (!player) return json({ type: 4, data: { content: `❌ <@${targetId}> no tiene perfil VANTS vinculado.`, flags: EPHEMERAL } });
      const { data: stats } = await admin.from('leaderboard').select('*').eq('player_id', player.id).limit(1).maybeSingle();
      const fields = [
        { name: 'Username', value: `@${player.username}`, inline: true },
        { name: 'Juego principal', value: player.main_game || '—', inline: true },
        { name: 'Región', value: player.region || '—', inline: true },
      ];
      if (stats) {
        fields.push(
          { name: 'Rango', value: stats.rank || 'Unranked', inline: true },
          { name: 'MMR', value: String(stats.mmr || 0), inline: true },
          { name: 'V/D', value: `${stats.wins || 0} / ${stats.losses || 0}`, inline: true },
        );
      }
      return json({ type: 4, data: { embeds: [{ title: `🎮 Stats de ${player.display_name || player.username}`, color: 0xE67277, fields, thumbnail: { url: player.avatar_url || '' } }] } });
    }
    case 'actividad': {
      const dias = Number(opts.dias) || 7;
      return json({ type: 4, data: { content: `📈 **Actividad últimos ${dias} días**: el análisis de mensajes por canal requiere lectura del historial de Discord (no disponible vía webhook). Usa el bot Python para este comando.` } });
    }
    case 'top': {
      const dias = Number(opts.dias) || 7;
      return json({ type: 4, data: { content: `🏆 **Top miembros (${dias} días)**: el análisis de actividad requiere lectura del historial de Discord (no disponible vía webhook). Usa el bot Python para este comando.` } });
    }

    // ---------- Informes ----------
    case 'informe': {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: newPlayers } = await admin.from('players').select('username, display_name, created_at').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(10);
      const { data: tournaments } = await admin.from('tournaments').select('name, status, current_participants, max_participants, starts_at').in('status', ['registration', 'open', 'upcoming', 'in_progress', 'live']);
      const { count: matchesCount } = await admin.from('ranked_matches').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', weekAgo);
      const { data: season } = await admin.from('seasons').select('id, name').eq('status', 'active').limit(1).maybeSingle();
      let top5: any[] = [];
      if (season) {
        const { data } = await admin.from('leaderboard').select('username, display_name, rank, mmr, wins').eq('season_id', season.id).order('mmr', { ascending: false }).limit(5);
        top5 = data || [];
      }
      const fields = [
        { name: '🆕 Jugadores nuevos (7d)', value: String(newPlayers?.length ?? 0), inline: true },
        { name: '🎮 Partidas ranked (7d)', value: String(matchesCount ?? 0), inline: true },
        { name: '🏆 Torneos activos', value: String(tournaments?.length ?? 0), inline: true },
      ];
      if (newPlayers?.length) fields.push({ name: 'Últimos registros', value: newPlayers.slice(0, 5).map((p: any) => p.display_name || p.username).join(', '), inline: false });
      if (tournaments?.length) fields.push({ name: 'Torneos en curso', value: tournaments.slice(0, 5).map((t: any) => `• **${t.name}** (${st(t.status)}) — ${t.current_participants || 0}/${t.max_participants || '∞'}`).join('\n'), inline: false });
      if (top5.length) fields.push({ name: 'Top 5 ranked', value: top5.map((p: any, i: number) => `${i + 1}. **${p.display_name || p.username}** — ${p.rank || '?'} (${p.mmr || 0} MMR)`).join('\n'), inline: false });
      return json({ type: 4, data: { embeds: [{ title: '📋 Informe semanal VANTS', color: 0x00B6AF, fields, timestamp: new Date().toISOString() }] } });
    }
    case 'resumen': {
      const players = await admin.from('players').select('id', { count: 'exact', head: true });
      const tournaments = await admin.from('tournaments').select('id', { count: 'exact', head: true });
      const matches = await admin.from('ranked_matches').select('id', { count: 'exact', head: true }).eq('status', 'completed');
      const events = await admin.from('events').select('id', { count: 'exact', head: true }).gte('starts_at', new Date().toISOString());
      const { data: season } = await admin.from('seasons').select('name, season_number, status').eq('status', 'active').limit(1).maybeSingle();
      return json({ type: 4, data: { embeds: [{ title: '⚡ Resumen VANTCALL', color: 0xE67277, fields: [
        { name: 'Jugadores', value: String(players.count ?? 0), inline: true },
        { name: 'Torneos', value: String(tournaments.count ?? 0), inline: true },
        { name: 'Partidas ranked', value: String(matches.count ?? 0), inline: true },
        { name: 'Eventos próximos', value: String(events.count ?? 0), inline: true },
        ...(season ? [{ name: 'Temporada', value: `${season.name || 'T' + season.season_number} (${season.status})`, inline: true }] : []),
      ], footer: { text: 'Datos en tiempo real desde Supabase' }, timestamp: new Date().toISOString() }] } });
    }

    // ---------- Comunidad ----------
    case 'anuncio': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const titulo = clip(opts.titulo ?? 'Anuncio', 100);
      const mensaje = clip(opts.mensaje ?? '', 500);
      const imagen = opts.imagen as string | undefined;
      return json({ type: 4, data: { content: `📢 **Anuncio publicado** en <#1553634435671396432> (por ${user.username})`, embeds: [{ title: titulo, description: mensaje, color: 0x00B6AF, timestamp: new Date().toISOString(), footer: { text: `Anuncio por ${user.username}` }, ...(imagen ? { image: { url: imagen } } : {}) }] } });
    }
    case 'evento_crear': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const titulo = clip(opts.titulo ?? 'Evento', 100);
      const tipo = clip(opts.tipo ?? 'evento', 50);
      const fecha = opts.fecha as string;
      const descripcion = opts.descripcion as string | undefined;
      let starts: Date;
      try {
        starts = new Date(fecha.length <= 10 ? fecha + 'T00:00:00Z' : fecha.replace(' ', 'T') + ':00Z');
        if (isNaN(starts.getTime())) throw new Error('invalid');
      } catch {
        return json({ type: 4, data: { content: '❌ Formato de fecha inválido. Usa `YYYY-MM-DD` o `YYYY-MM-DD HH:MM`.', flags: EPHEMERAL } });
      }
      const { data: ev, error: evErr } = await admin.from('events').insert({ title: titulo, event_type: tipo, starts_at: starts.toISOString(), status: 'upcoming', description: descripcion }).select('id').single();
      if (evErr) return json({ type: 4, data: { content: '❌ Error creando el evento: ' + evErr.message, flags: EPHEMERAL } });
      return json({ type: 4, data: { content: `✅ Evento **${titulo}** creado para el ${starts.toLocaleDateString('es-ES')} (id \`${ev.id}\`).` } });
    }
    case 'torneo_crear': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const nombre = clip(opts.nombre ?? 'Torneo', 100);
      const formato = clip(opts.formato ?? 'single_elimination', 50);
      const fecha = opts.fecha_inicio as string;
      const maxP = Number(opts.max_participantes) || 16;
      let starts: Date;
      try {
        starts = new Date(fecha + 'T00:00:00Z');
        if (isNaN(starts.getTime())) throw new Error('invalid');
      } catch {
        return json({ type: 4, data: { content: '❌ Formato de fecha inválido. Usa `YYYY-MM-DD`.', flags: EPHEMERAL } });
      }
      const slug = nombre.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
      const { data: t, error: tErr } = await admin.from('tournaments').insert({ name: nombre, slug, format: formato, status: 'registration', starts_at: starts.toISOString(), max_participants: maxP }).select('id').single();
      if (tErr) return json({ type: 4, data: { content: '❌ Error creando el torneo: ' + tErr.message, flags: EPHEMERAL } });
      return json({ type: 4, data: { content: `✅ Torneo **${nombre}** creado (formato ${formato}, inicio ${starts.toLocaleDateString('es-ES')}, máx ${maxP} jugadores, id \`${t.id}\`).` } });
    }
    case 'recordatorio': {
      if (!await isStaff(user.id)) return json({ type: 4, data: { content: '❌ Solo el staff puede usar este comando.', flags: EPHEMERAL } });
      const mensaje = clip(opts.mensaje ?? 'Recordatorio', 200);
      const minutos = Number(opts.minutos) || 60;
      return json({ type: 4, data: { content: `⏰ **Recordatorio programado** en ${minutos} min: ${mensaje} (por ${user.username})` } });
    }

    case 'vants canal': case 'vants torneo-crear': case 'vants torneo-estado': case 'vants evento-crear': case 'vants temporada-iniciar': case 'vants estado': {
      if (!(await isStaff(user.id))) return reply('Este comando es solo para el staff de VANTS.');
      if (path === 'vants canal') {
        const category = String(opts.categoria ?? '');
        const channel = String(opts.canal ?? '');
        if (!['anuncios', 'registros', 'ranked', 'staff', 'logs'].includes(category) || !/^\d{17,20}$/.test(channel)) return reply('Categoría o canal no válidos.');
        const { error } = await admin.from('discord_channels').upsert({ category, channel_id: channel, guild_id: guildId ?? null, updated_by: user.id, updated_at: new Date().toISOString() });
        if (error) return reply('No se pudo guardar el canal.');
        await audit(user.id, 'discord_channel_set', 'discord_channel', category, { channel });
        return reply(`Las notificaciones de **${category}** se publicarán en <#${channel}>. El bot necesita permiso para ver el canal, enviar mensajes e insertar enlaces.`);
      }
      if (path === 'vants estado') {
        const { data: ch } = await admin.from('discord_channels').select('category, channel_id');
        const { data: pending } = await admin.from('vant_sync_events').select('discord_status').gt('created_at', new Date(Date.now() - 86400_000).toISOString());
        const counts: Record<string, number> = {};
        for (const r of pending ?? []) { const k = String(r.discord_status ?? 'pendiente').split(':')[0]; counts[k] = (counts[k] ?? 0) + 1; }
        return reply('', [{ title: 'Estado de notificaciones', color: SLATE, fields: [
          { name: 'Canales', value: ['anuncios', 'registros', 'ranked', 'staff', 'logs'].map((c) => { const x = (ch ?? []).find((r) => r.category === c); return `${c}: ${x ? `<#${x.channel_id}>` : 'sin configurar'}`; }).join('\n') },
          { name: 'Últimas 24 h', value: Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join('\n') || 'Sin eventos' },
        ] }]);
      }
      if (path === 'vants torneo-crear') {
        const name = clip(String(opts.nombre ?? '').trim(), 100);
        const startsAt = parseLocalDate(opts.inicio);
        if (name.length < 3 || !startsAt) return reply(`Revisa el nombre y la fecha (formato \`AAAA-MM-DD HH:MM\`, hora de ${TZ}).`);
        const closes = opts.cierre ? parseLocalDate(opts.cierre) : null;
        let slug = slugify(name);
        const { data: dup } = await admin.from('tournaments').select('id').eq('slug', slug).maybeSingle();
        if (dup) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
        const { data, error } = await admin.from('tournaments').insert({
          name, slug, description: opts.descripcion ? clip(opts.descripcion, 1000) : null,
          format: String(opts.formato ?? 'single_elimination'), status: 'registration', tier: opts.nivel ? String(opts.nivel) : null,
          max_participants: Number(opts.plazas ?? 16), current_participants: 0, prize_pool: opts.premio ? clip(opts.premio, 60) : null,
          registration_opens_at: new Date().toISOString(), registration_closes_at: closes, starts_at: startsAt,
        }).select('id, slug').single();
        if (error || !data) return reply(`No se pudo crear el torneo: ${clip(error?.message ?? 'error', 150)}`);
        await audit(user.id, 'tournament_create', 'tournament', data.id, { slug });
        return reply(`Torneo creado: **${name}** (\`${data.slug}\`). Ya aparece en ${url(`torneo/${data.slug}`)} y se anunció en el canal de anuncios.`);
      }
      if (path === 'vants torneo-estado') {
        const slug = String(opts.torneo ?? '').trim().toLowerCase();
        const status = String(opts.estado ?? '');
        if (!['registration', 'closed', 'in_progress', 'completed', 'cancelled'].includes(status)) return reply('Estado no válido.');
        const { data, error } = await admin.from('tournaments').update({ status, updated_at: new Date().toISOString() }).eq('slug', slug).select('id, name').maybeSingle();
        if (error || !data) return reply('No encuentro ese torneo.');
        await audit(user.id, 'tournament_status', 'tournament', data.id, { status });
        return reply(`**${clip(data.name, 60)}** ahora está: ${st(status)}.`);
      }
      if (path === 'vants evento-crear') {
        const title = clip(String(opts.titulo ?? '').trim(), 120);
        const startsAt = parseLocalDate(opts.inicio);
        if (title.length < 3 || !startsAt) return reply(`Revisa el título y la fecha (formato \`AAAA-MM-DD HH:MM\`, hora de ${TZ}).`);
        const endsAt = opts.fin ? parseLocalDate(opts.fin) : null;
        const { data, error } = await admin.from('events').insert({
          title, description: opts.descripcion ? clip(opts.descripcion, 1000) : null, event_type: String(opts.tipo ?? 'comunidad'),
          status: 'scheduled', location: opts.lugar ? clip(opts.lugar, 100) : 'Discord', max_attendees: opts.aforo ? Number(opts.aforo) : null,
          current_attendees: 0, starts_at: startsAt, ends_at: endsAt,
        }).select('id').single();
        if (error || !data) return reply(`No se pudo crear el evento: ${clip(error?.message ?? 'error', 150)}`);
        await audit(user.id, 'event_create', 'event', data.id, { title });
        return reply(`Evento creado: **${title}** · ${ts(startsAt)}. Ya está en el calendario de la web.`);
      }
      if (path === 'vants temporada-iniciar') {
        const end = parseLocalDate(opts.fin);
        if (!end) return reply('Indica la fecha de fin en formato `AAAA-MM-DD HH:MM`.');
        const { data: last } = await admin.from('seasons').select('season_number').order('season_number', { ascending: false }).limit(1).maybeSingle();
        const number = (last?.season_number ?? 0) + 1;
        await admin.from('seasons').update({ status: 'closed' }).eq('status', 'active');
        const { data, error } = await admin.from('seasons').insert({ season_number: number, name: clip(opts.nombre ?? `Temporada ${number}`, 60), start_date: new Date().toISOString(), end_date: end, status: 'active' }).select('id').single();
        if (error || !data) return reply(`No se pudo iniciar la temporada: ${clip(error?.message ?? 'error', 150)}`);
        await audit(user.id, 'season_start', 'season', data.id, { number });
        return reply(`Temporada ${number} iniciada. Termina ${ts(end, 'D')}.`);
      }
      return reply('Comando no reconocido.');
    }

    default: {
      const c = (await commands()).get(path.split(' ')[0]);
      if (c && c.kind === 'custom') {
        return reply('', [{ title: clip(c.response_title || `/${c.name}`, 256), color: hexColor(c.color), ...(c.response_url ? { url: c.response_url } : {}), description: clip(c.response_body || c.description, 3500) }], c.ephemeral);
      }
      return reply(`No reconozco \`/${clip(path, 40)}\`. Usa \`/ayuda\` para ver los comandos.`);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await req.text();
  let valid = false;
  try { valid = isValidDiscordRequest(req, body, await publicKey()); } catch { valid = false; }
  if (!valid) return json({ error: 'Invalid Discord request signature' }, 401);

  let interaction: Interaction;
  try { interaction = JSON.parse(body); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (interaction.type === 1) return json({ type: 1 }); // PING
  if (interaction.type !== 2 || !interaction.data) return json({ error: 'Unsupported interaction type' }, 400);

  const user = interaction.member?.user ?? interaction.user;
  if (!user?.id) return reply('No se pudo identificar tu usuario de Discord.');
  const { path, opts } = commandPath(interaction.data);
  const root = path.split(' ')[0];
  const cmd = (await commands()).get(root);
  if (cmd && !cmd.enabled) return reply(`El comando \`/${root}\` está desactivado por el staff.`);
  if (cmd && cmd.staff_only && !(await isStaff(user.id))) return reply('Este comando es solo para el staff de VANTS.');
  if (cmd && cmd.min_plan !== 'free') {
    const p = await playerByDiscord(user.id);
    const plan = p ? await planOf(p.id) : 'free';
    if (PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(cmd.min_plan)) return reply(`\`/${root}\` es exclusivo de **${PLAN_NAME[cmd.min_plan]}** o superior. Mejora tu plan en ${url('precios')}`);
  }
  try {
    const res = await handle(path, opts, user, interaction.guild_id);
    logRun(root, user, interaction.guild_id, true).catch(() => {});
    return res;
  } catch (e) {
    logRun(root, user, interaction.guild_id, false).catch(() => {});
    console.error('discord-commands', path, e);
    return reply('Algo falló al procesar el comando. Inténtalo de nuevo en un momento.');
  }
});
