// ============================================
// VANTS — App principal (router + vistas)
// SPA estática con hash routing
// ============================================

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DISCORD_INVITE = 'https://discord.gg/rCHE7jvRS4';

// Rangos VANTS (8 niveles)
const VANTS_RANKS = [
  { key: 'hierro', name: 'Hierro', min: 0, color: '#8b939c' },
  { key: 'bronce', name: 'Bronce', min: 1100, color: '#c27a3a' },
  { key: 'plata', name: 'Plata', min: 1300, color: '#c4ccd6' },
  { key: 'oro', name: 'Oro', min: 1500, color: '#e8b53a' },
  { key: 'platino', name: 'Platino', min: 1700, color: '#35cbbd' },
  { key: 'diamante', name: 'Diamante', min: 1900, color: '#a179ff' },
  { key: 'titan', name: 'Titán', min: 2100, color: '#3ddc84' },
  { key: 'escarlata', name: 'Escarlata', min: 2300, color: '#ff3b4e' },
];

const RANK_SHADES = {};
for (const r of VANTS_RANKS) RANK_SHADES[r.key] = ['#fff', r.color, '#000'];

function rankFor(stat) {
  let r = VANTS_RANKS[0];
  for (const x of VANTS_RANKS) if ((stat && stat.mmr || 0) >= x.min) r = x;
  return r;
}

function rankEmblem(r, size) {
  const id = 're-' + r.key + '-' + (size || 22);
  const [hi, mid, lo] = RANK_SHADES[r.key] || ['#fff', r.color, '#000'];
  const big = (size || 22) > 40;
  const crown = ['titan', 'escarlata'].includes(r.key);
  const chev = `<path d="M39 43 H52 L60 59 L68 43 H81 L60 82 Z" fill="${hi}" opacity=".9"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
      <linearGradient id="${id}-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd86b"/><stop offset="1" stop-color="#b8860b"/></linearGradient>
    </defs>
    <path d="M60 14 L92 26 V60 C92 81 78 95 60 106 C42 95 28 81 28 60 V26 Z" fill="url(#${id}-m)" stroke="${lo}" stroke-width="2"/>
    ${chev}
    ${crown ? `<path d="M22 8 L26 2 L29 6 L32 0 L35 6 L38 2 L42 8 Z" fill="url(#${id}-l)"/>` : ''}
  </svg>`;
}
function rankBadge(stat) {
  const r = rankFor(stat);
  const icon = window.VantsRanks ? VantsRanks.emblemUse(r.key, 'rank-badge-emblem') : '<span class="rank-gem"></span>';
  return `<span class="rank-badge" style="--rank:${r.color}">${icon}${esc(stat && stat.rank ? stat.rank : r.name)}</span>`;
}

const fmtDate = (d, opts) => d ? new Date(d).toLocaleDateString('es-ES', opts || { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const initials = (s) => esc(String(s || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?');

const STATUS_LABEL = { live: 'En vivo', completed: 'Finalizado', finished: 'Finalizado', cancelled: 'Cancelado', draft: 'Borrador', open: 'Abierto', upcoming: 'Próximo', in_progress: 'En curso', scheduled: 'Programado', active: 'Activa', closed: 'Cerrada', registered: 'Inscrito', confirmed: 'Confirmado', waitlisted: 'Lista de espera' };
const statusLabel = (s) => STATUS_LABEL[s] || (s ? String(s) : '—');
const statusPill = (s) => `<span class="pill pill-${esc(s || 'none')}">${esc(statusLabel(s))}</span>`;

function emptyState(title, text, cta) {
  return `<div class="empty-state">
    <h3>${esc(title)}</h3><p>${esc(text)}</p>${cta || ''}</div>`;
}
function errorState(e) {
  return emptyState('No se pudieron cargar los datos', (e && e.message) || 'Error inesperado. Inténtalo de nuevo.');
}
function skeleton(rows = 3) {
  return `<div class="skeleton-list">${'<div class="skeleton-row"></div>'.repeat(rows)}</div>`;
}
function liveTag() {
  return `<span class="live-data-tag" title="Datos en tiempo real desde Supabase"><span class="dot"></span>Datos en vivo</span>`;
}

// ============================================
// BLOQUES REUTILIZABLES
// ============================================

function tournamentCard(t) {
  return `<a class="t-card" href="#/torneo/${encodeURIComponent(t.slug)}">
    <div class="t-card-top">${statusPill(t.status)}${t.tier ? `<span class="t-tier">${esc(String(t.tier).toUpperCase())}</span>` : ''}</div>
    <h3>${esc(t.name)}</h3>
    <p>${esc(t.description || 'Torneo VANTCALL')}</p>
    <div class="t-card-meta">
      <span>${esc(statusLabel(t.format) || 'Formato por definir')}</span>
      <span>${t.current_participants || 0}${t.max_participants ? ' / ' + t.max_participants : ''} jugadores</span>
      <span>${fmtDate(t.starts_at)}</span>
    </div>
    ${t.prize_pool ? `<div class="t-prize">Premio: ${esc(t.prize_pool)}</div>` : ''}
  </a>`;
}

function leaderboardRows(rows) {
  return rows.map((r, i) => `
    <a class="ranking-row" href="#/jugador/${encodeURIComponent(r.username)}">
      <div class="ranking-pos${i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : ''}">${String(r.position || i + 1).padStart(2, '0')}</div>
      <div class="ranking-team">
        <div class="ranking-team-logo">${r.avatar_url ? `<img src="${esc(r.avatar_url)}" alt="" loading="lazy">` : initials(r.username)}</div>
        <div><div class="ranking-team-name">${esc(r.display_name || r.username)}</div><div class="ranking-sub">@${esc(r.username)} · ${r.wins || 0}V ${r.losses || 0}D</div></div>
      </div>
      <div class="ranking-right">${rankBadge(r)}<div class="ranking-points">${r.mmr || 0} MMR</div></div>
    </a>`).join('');
}

function matchRow(m) {
  const n1 = m.p1 ? (m.p1.display_name || m.p1.username) : 'Por determinar';
  const n2 = m.p2 ? (m.p2.display_name || m.p2.username) : 'Por determinar';
  const has = ['completed', 'finished', 'in_progress', 'live'].includes(m.status) && m.player1_score != null && m.player2_score != null;
  const w1 = m.winner_id && m.winner_id === m.player1_id;
  const w2 = m.winner_id && m.winner_id === m.player2_id;
  const live = m.status === 'in_progress' || m.status === 'live';
  return `<div class="match-card">
    <div class="match-time${live ? ' live' : ''}">${live ? '<span class="live-indicator">LIVE</span>' : fmtTime(m.scheduled_at)}</div>
    <div class="match-team"><div class="match-team-logo">${initials(n1)}</div><span class="match-team-name${m.p1 ? '' : ' tbd'}">${esc(n1)}</span></div>
    <div class="match-score">${has ? `<span class="match-score-num${w1 ? ' winner' : ''}">${m.player1_score}</span><span class="match-score-sep">:</span><span class="match-score-num${w2 ? ' winner' : ''}">${m.player2_score}</span>` : '<span class="match-score-sep">VS</span>'}</div>
    <div class="match-team right"><span class="match-team-name${m.p2 ? '' : ' tbd'}">${esc(n2)}</span><div class="match-team-logo">${initials(n2)}</div></div>
    <div class="match-format">
      ${m.tournament ? `<a class="match-comp" href="#/torneo/${encodeURIComponent(m.tournament.slug)}">${esc(m.tournament.name)}</a>` : ''}
      <span class="match-phase">Ronda ${m.round || 1} · Partida ${m.match_number || 1}</span>
      <span class="match-format-tag">${esc(statusLabel(m.status))}</span>
    </div>
  </div>`;
}

function eventRow(e) {
  return `<div class="match-card event-card" data-event="${esc(e.id)}">
    <div class="match-time">${fmtTime(e.starts_at)}</div>
    <div class="event-body">
      <div class="event-title">${esc(e.title || e.name)}</div>
      <div class="event-sub">${esc(e.event_type || 'Evento')}${e.location ? ' · ' + esc(e.location) : ''}${e.max_attendees ? ` · ${e.current_attendees || 0}/${e.max_attendees} plazas` : ''}</div>
    </div>
    <div class="match-format">${statusPill(e.status)}</div>
  </div>`;
}

function groupByLocalDay(items, dateKey) {
  const groups = new Map();
  for (const it of items) {
    const k = localDayKey(it[dateKey]);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  return [...groups.entries()];
}
function localDayKey(d) {
  if (!d) return 'sin-fecha';
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

const RANKS_STRIP = `<div class="ranks-strip">${VANTS_RANKS.map((r, i) => `
  <div class="rank-tile${i >= 5 ? ' rank-tile-elite' : ''}${i === 7 ? ' rank-tile-apex' : ''}" style="--rank:${r.color}">
    <span class="rank-tier">${window.VantsRanks ? VantsRanks.RANK_ART[r.key].tier : i + 1}</span>
    <div class="rank-emblem">${window.VantsRanks ? VantsRanks.emblemUse(r.key, 'rank-svg') : ''}</div>
    <div class="rank-name">${r.name}</div><div class="rank-min">${i === 7 ? 'Top global' : r.min + '+ MMR'}</div>
  </div>`).join('')}</div>`;

const DISCORD_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';

const PLAN_CARDS = [
  { key: 'basic', name: 'BASIC', tier: 'T1', price: 9, emblem: 'plata', tag: 'Para empezar a competir', pitch: 'Tu pase a la escena: torneos abiertos, perfil Ranked y la comunidad VANTS.',
    features: ['Inscripción a VANT Open', 'Perfil Ranked (Bronce–Oro)', 'Zona exclusiva BASIC', 'Rol BASIC en Discord', 'Soporte estándar'], cta: 'Empezar con BASIC' },
  { key: 'pro', name: 'PRO', tier: 'T2', price: 19, emblem: 'diamante', tag: 'El favorito de los equipos', pitch: 'Ranked completo, Pro Series y scrims privadas para subir de nivel cada semana.', badge: 'MÁS POPULAR',
    features: ['Todo lo de BASIC', 'Ranked completo (Hierro–Titán)', 'Pro Series mensual', 'Scrims privadas', 'Estadísticas avanzadas', 'Soporte prioritario'], cta: 'Subir a PRO' },
  { key: 'elite', name: 'ELITE', tier: 'T3', price: 39, emblem: 'escarlata', tag: 'Acceso total', pitch: 'Elite Invitational, canal Command y tu marca visible en todo el Ranked.', badge: 'ACCESO TOTAL',
    features: ['Todo lo de PRO', 'Elite Invitational', 'Canal Command en Discord', 'Badge ELITE en tu perfil', 'Verificación prioritaria', 'Acceso anticipado a funciones'], cta: 'Ser ELITE' },
];

function planCards() {
  return `<div class="pricing-grid">${PLAN_CARDS.map((p) => `
    <div class="plan-card plan-${p.key}">
      ${p.badge ? `<div class="plan-badge">${esc(p.badge)}</div>` : ''}
      <div class="plan-head">
        <span class="plan-tier">${esc(p.tier)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="plan-price">$${p.price}<span>/mes</span></div>
        <p class="plan-tag">${esc(p.tag)}</p>
      </div>
      <p class="plan-pitch">${esc(p.pitch)}</p>
      <ul class="plan-features">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <a class="btn btn-primary plan-cta" href="#/precios">${esc(p.cta)}</a>
    </div>`).join('')}</div>`;
}

function pageHero(num, title, accent, text, chip) {
  return `<section class="page-hero">
    <div class="page-hero-num">${esc(num)}</div>
    <div class="page-hero-body">
      <h1>${esc(title)}</h1>
      <h2 class="page-hero-accent">${accent}</h2>
      <p>${esc(text)}</p>
      ${chip || ''}
    </div>
  </section>`;
}

// ============================================
// VISTAS
// ============================================

const VIEWS = {
  'inicio': {
    title: 'VANTCALL Esports — Ranked, torneos y eventos',
    content: `
      <section class="valorant-hero">
        <div class="hero-media" aria-hidden="true"></div>
        <div class="hero-grid" aria-hidden="true"></div>
        <div class="hero-badge"><span class="live-dot"></span> BETA ABIERTA · VALORANT · CS2 · LOL</div>
        <h1>VANT<span class="hero-accent">CALL</span></h1>
        <p class="hero-tagline">La liga competitiva de la comunidad: ranked con MMR real, torneos con premios y un bot de Discord conectado a tu perfil. Entra con Google, Discord, Steam o correo.</p>
        <div class="hero-cta">
          <a href="#/login" class="btn btn-primary btn-lg" data-auth-cta>JUGAR GRATIS</a>
          <a href="#/torneos" class="btn btn-secondary btn-lg">VER TORNEOS</a>
        </div>
        <div class="hero-meta" aria-label="Lo que incluye VANTS">
          <span>Ranked con MMR</span><span>Torneos con premio</span><span>Bot de Discord en vivo</span><span>Zona exclusiva para miembros</span>
        </div>
      </section>

      <div class="marquee" aria-hidden="true"><div class="marquee-track">
        ${Array(2).fill(['VALORANT', 'Counter-Strike 2', 'League of Legends', 'Ranked VANTS', 'Torneos', 'Ligas', 'Scrims']).flat().map((t) => `<span class="marquee-item">${t}</span>`).join('')}
      </div></div>

      <section class="valorant-section">
        <div class="section-head"><h2>TOP RANKED</h2><a href="#/ranked">Leaderboard</a></div>
        <div class="rankings-list" data-async="home-leaderboard">${skeleton(5)}</div>
      </section>

      <section class="valorant-section">
        <div class="section-head"><h2>TORNEOS</h2><a href="#/torneos">Ver todos</a></div>
        <div data-async="home-tournaments">${skeleton(3)}</div>
      </section>

      <section class="valorant-section">
        <div class="section-head"><h2>LA PLATAFORMA EN NÚMEROS</h2></div>
        <div class="stats-row" data-async="home-stats">${skeleton(1)}</div>
      </section>

      <section class="valorant-section">
        <div class="section-head"><h2>PLANES</h2><a href="#/precios">Comparativa</a></div>
        ${planCards()}
        <p class="pricing-note" style="text-align:center; margin-top: var(--space-6);"><a href="#/precios" class="link-inline">Ver la comparativa completa</a></p>
      </section>

      <!-- Login Methods -->
      <section class="valorant-section">
        <div class="section-header"><h2>ENTRA COMO QUIERAS</h2></div>
        <div class="login-methods-home login-methods-4">
          <a href="#/login" class="login-method-card"><div class="login-method-icon google-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.5 5.5 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z"/></svg></div><h3>Google</h3><p>Un clic con tu cuenta de Google</p></a>
          <a href="#/login" class="login-method-card"><div class="login-method-icon discord-icon">${DISCORD_SVG}</div><h3>Discord</h3><p>Tu perfil queda conectado al bot VANTS</p></a>
          <a href="#/login" class="login-method-card"><div class="login-method-icon steam-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.98 0C5.67 0 .5 4.86.02 11.04l6.43 2.66a3.38 3.38 0 0 1 1.92-.6l.19.01 2.86-4.15v-.06a4.52 4.52 0 1 1 4.52 4.52h-.1l-4.08 2.91v.16a3.39 3.39 0 0 1-6.72.63L.4 15.5A12 12 0 1 0 11.98 0z"/></svg></div><h3>Steam</h3><p>Ideal para CS2: cuenta verificada por Valve</p></a>
          <a href="#/registro" class="login-method-card"><div class="login-method-icon mail-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></div><h3>Correo</h3><p>Registro clásico con verificación por email</p></a>
        </div>
      </section>

    `,
    async load(main) {
      const DB = window.VantDB;
      const set = (k, html) => { const el = main.querySelector(`[data-async="${k}"]`); if (el) el.innerHTML = html; };
      DB.stats().then((s) => set('home-stats', `
        <div class="stat"><div class="stat-num">${s.players}</div><div class="stat-label">Jugadores registrados</div></div>
        <div class="stat"><div class="stat-num">${s.tournaments}</div><div class="stat-label">Torneos</div></div>
        <div class="stat"><div class="stat-num">${s.events}</div><div class="stat-label">Eventos próximos</div></div>
        <div class="stat"><div class="stat-num">${s.matches}</div><div class="stat-label">Partidas ranked</div></div>
        <div class="stat stat-live">${liveTag()}</div>`)).catch((e) => set('home-stats', errorState(e)));
      DB.tournaments().then((ts) => {
        const up = ts.filter((t) => !['completed', 'finished', 'cancelled', 'draft'].includes(t.status)).slice(0, 3);
        set('home-tournaments', up.length ? `<div class="t-grid t-grid-stack">${up.map(tournamentCard).join('')}</div>` : emptyState('Sin torneos abiertos', 'Aún no hay torneos publicados. Los anunciamos primero en Discord.', `<a class="btn btn-secondary" href="${DISCORD_INVITE}" target="_blank" rel="noopener noreferrer">Avisarme en Discord</a>`));
      }).catch((e) => set('home-tournaments', errorState(e)));
      DB.activeSeason().then(async (s) => {
        const rows = s ? await DB.leaderboard(s.id, 5) : [];
        set('home-leaderboard', rows.length ? leaderboardRows(rows) : emptyState('Leaderboard vacío', s ? 'Juega tus partidas de placement para aparecer aquí.' : 'La primera temporada ranked aún no ha comenzado.', '<a class="btn btn-secondary" href="#/ranked">Cómo funciona</a>'));
      }).catch((e) => set('home-leaderboard', errorState(e)));
    },
  },

  'calendario': {
    title: 'Calendario — VANTCALL Esports',
    content: `
      <h1>Calendario</h1>
      <p class="breadcrumb"><a href="#/inicio">VANTCALL</a> <span>/</span> Calendario ${liveTag()}</p>
      <div class="cal-toolbar">
        <div class="cal-nav">
          <button type="button" class="cal-nav-btn" data-cal-prev aria-label="Mes anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>
          <h2 class="cal-month" data-cal-title aria-live="polite">—</h2>
          <button type="button" class="cal-nav-btn" data-cal-next aria-label="Mes siguiente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg></button>
          <button type="button" class="btn btn-secondary btn-sm" data-cal-today>Hoy</button>
        </div>
        <div class="calendar-filters" role="tablist" aria-label="Filtrar calendario">
          <button type="button" class="calendar-filter active" data-filter="all" role="tab" aria-selected="true">TODO</button>
          <button type="button" class="calendar-filter" data-filter="match" role="tab" aria-selected="false"><span class="cal-dot cal-dot-match"></span>PARTIDAS</button>
          <button type="button" class="calendar-filter" data-filter="event" role="tab" aria-selected="false"><span class="cal-dot cal-dot-event"></span>EVENTOS</button>
          <button type="button" class="calendar-filter" data-filter="tournament" role="tab" aria-selected="false"><span class="cal-dot cal-dot-tournament"></span>TORNEOS</button>
        </div>
      </div>
      <div class="auth-msg" data-page-msg role="status" aria-live="polite" hidden></div>
      <div class="cal-layout">
        <div class="cal-grid-wrap" data-cal-grid>${skeleton(5)}</div>
        <div class="cal-agenda">
          <div class="cal-agenda-head"><h3 data-cal-agenda-title>Próximos</h3><button type="button" class="link-btn" data-cal-clear hidden>Ver todo el mes</button></div>
          <div data-async="calendar">${skeleton(4)}</div>
        </div>
      </div>
      <p class="login-note cal-tz">Horas mostradas en tu zona horaria (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || 'local')}).</p>`,
    async load(main) {
      const DB = window.VantDB;
      const set = (k, h) => { const el = main.querySelector(`[data-async="${k}"]`); if (el) el.innerHTML = h; };
      const titleEl = main.querySelector('[data-cal-title]');
      const agendaTitle = main.querySelector('[data-cal-agenda-title]');
      const clearBtn = main.querySelector('[data-cal-clear]');
      let view = new Date();
      view = new Date(view.getFullYear(), view.getMonth(), 1);
      let items = [];
      let filter = 'all';
      let selectedDay = null;
      const now = new Date();
      const todayKey = localDayKey(now);

      function render() {
        const y = view.getFullYear(), m = view.getMonth();
        titleEl.textContent = view.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const first = new Date(y, m, 1);
        const startCol = (first.getDay() + 6) % 7;
        const days = new Date(y, m + 1, 0).getDate();
        const byDay = new Map();
        for (const it of items) {
          if (filter !== 'all' && it.kind !== filter) continue;
          const k = localDayKey(it.at);
          if (!byDay.has(k)) byDay.set(k, []);
          byDay.get(k).push(it);
        }
        let cells = '';
        for (let i = 0; i < startCol; i++) cells += '<div class="cal-cell cal-cell-empty"></div>';
        for (let d = 1; d <= days; d++) {
          const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayItems = byDay.get(k) || [];
          cells += `<button type="button" class="cal-cell${dayItems.length ? ' has-items' : ''}${k === todayKey ? ' is-today' : ''}${k === selectedDay ? ' is-selected' : ''}" data-day="${k}">
            <span class="cal-day-num">${d}</span>
            ${dayItems.slice(0, 3).map((it) => `<span class="cal-dot cal-dot-${it.kind}"></span>`).join('')}
          </button>`;
        }
        main.querySelector('[data-cal-grid]').innerHTML = cells;
        main.querySelectorAll('[data-day]').forEach((c) => c.addEventListener('click', () => {
          selectedDay = selectedDay === c.dataset.day ? null : c.dataset.day;
          clearBtn.hidden = !selectedDay;
          render();
        }));

        const list = items
          .filter((it) => (filter === 'all' || it.kind === filter))
          .filter((it) => !selectedDay || localDayKey(it.at) === selectedDay)
          .sort((a, b) => new Date(a.at) - new Date(b.at));
        agendaTitle.textContent = selectedDay ? `Día ${Number(selectedDay.slice(-2))}` : 'Próximos';
        set('calendar', list.length ? list.map((it) => it.html).join('') : emptyState('Nada por aquí', selectedDay ? 'No hay nada programado ese día.' : 'El calendario se llenará con torneos y eventos.'));
      }

      try {
        const [tms, evs, matches] = await Promise.all([
          DB.tournaments().catch(() => []),
          DB.events().catch(() => []),
          DB.scheduledMatches().catch(() => []),
        ]);
        items = [
          ...tms.map((t) => ({ kind: 'tournament', at: t.starts_at, html: tournamentRow(t) })),
          ...evs.map((e) => ({ kind: 'event', at: e.starts_at, html: eventRow(e) })),
          ...matches.map((mm) => ({ kind: 'match', at: mm.scheduled_at, html: matchRow(mm) })),
        ];
        render();
      } catch (e) { set('calendar', errorState(e)); }

      main.querySelector('[data-cal-prev]').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); selectedDay = null; render(); });
      main.querySelector('[data-cal-next]').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); selectedDay = null; render(); });
      main.querySelector('[data-cal-today]').addEventListener('click', () => { view = new Date(now.getFullYear(), now.getMonth(), 1); selectedDay = items.some((i) => localDayKey(i.at) === todayKey) ? todayKey : null; render(); });
      clearBtn.addEventListener('click', () => { selectedDay = null; render(); });
      main.querySelectorAll('.calendar-filter').forEach((b) => b.addEventListener('click', () => {
        main.querySelectorAll('.calendar-filter').forEach((x) => { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
        b.classList.add('active'); b.setAttribute('aria-selected', 'true'); filter = b.dataset.filter; render();
      }));
      render();
    },
  },

  'ranked': {
    title: 'Ranked — VANTCALL Esports',
    content: `
      ${pageHero('03', 'Ranked VANTS', 'Sube de <span class="hero-accent">Hierro a Escarlata</span>', 'Cada partida mueve tu MMR. Ocho rangos, temporadas con recompensas y un leaderboard que se actualiza en tiempo real.', '<span class="page-hero-chip">Usa /ranking y /perfil en Discord</span>')}
      <div class="dash-grid" data-async="ranked-season">${skeleton(1)}</div>
      <h2>Rango VANTS</h2>
      ${RANKS_STRIP}
      <h2>Leaderboard</h2>
      <div class="rankings-list rankings-full" data-async="ranked-lb">${skeleton(6)}</div>
      <h2>Reglas vigentes</h2>
      <div data-async="ranked-rules">${skeleton(2)}</div>
      <div class="bot-panel">
        <h3>Comandos del bot VANTS en Discord</h3>
        <div class="bot-commands" data-async="bot-commands">${skeleton(2)}</div>
        <p class="login-note">Los comandos se gestionan desde Supabase y responden con tus datos reales de la web. Entra con Discord o vincúlalo en Mi cuenta para usarlos.</p>
      </div>`,
    async load(main) {
      const DB = window.VantDB;
      const set = (k, h) => { const el = main.querySelector(`[data-async="${k}"]`); if (el) el.innerHTML = h; };
      DB.client.from('bot_commands').select('name, description, min_plan, category').order('sort_order').then(({ data, error }) => {
        if (error) return set('bot-commands', errorState(error));
        set('bot-commands', (data || []).map((c) => `<div class="bot-cmd"><code>/${esc(c.name)}</code><span class="desc">${esc(c.description)}${c.min_plan !== 'free' ? ` · <b class="cmd-plan cmd-plan-${esc(c.min_plan)}">${esc(c.min_plan.toUpperCase())}</b>` : ''}</span></div>`).join('') || emptyState('Sin comandos', 'El staff aún no ha activado comandos.'));
      });
      const RULE_LABEL = { placement_matches: 'Partidas de placement', mmr_per_win: 'MMR por victoria', mmr_per_loss: 'MMR por derrota', queue_timeout: 'Tiempo máximo en cola (s)', min_players_per_match: 'Jugadores mínimos por partida' };
      DB.rules().then((rs) => set('ranked-rules', rs.length ? `<div class="rules-grid">${rs.map((r) => `<div class="rule"><div class="rule-val">${esc(r.rule_value)}</div><div class="rule-key">${esc(RULE_LABEL[r.rule_key] || r.description || r.rule_key)}</div></div>`).join('')}</div>` : emptyState('Sin reglas', 'Las reglas se publicarán al abrir la temporada.'))).catch((e) => set('ranked-rules', errorState(e)));
      try {
        const s = await DB.activeSeason();
        set('ranked-season', s ? `
          <div class="dash-card"><div class="label">Temporada</div><div class="value">${esc(s.name || 'T' + s.season_number)}</div><div class="sub">${statusPill(s.status)}</div></div>
          <div class="dash-card"><div class="label">Inicio</div><div class="value">${fmtDate(s.start_date, { day: 'numeric', month: 'short' })}</div><div class="sub">${fmtDate(s.start_date)}</div></div>
          <div class="dash-card"><div class="label">Fin</div><div class="value">${fmtDate(s.end_date, { day: 'numeric', month: 'short' })}</div><div class="sub">${fmtDate(s.end_date)}</div></div>`
          : `<div class="dash-card dash-card-wide"><div class="label">Temporada</div><div class="value">Próximamente</div><div class="sub">La temporada 1 se anunciará en Discord.</div></div>`);
        const rows = s ? await DB.leaderboard(s.id, 50) : [];
        set('ranked-lb', rows.length ? leaderboardRows(rows) : emptyState('Aún no hay jugadores clasificados', 'Completa las partidas de placement desde el bot de Discord para entrar en el leaderboard.', `<a class="btn btn-secondary" href="${DISCORD_INVITE}" target="_blank" rel="noopener noreferrer">Abrir Discord</a>`));
      } catch (e) { set('ranked-season', errorState(e)); set('ranked-lb', ''); }
    },
  },

  'torneos': {
    title: 'Torneos — VANTCALL Esports',
    content: `
      ${pageHero('04', 'Torneos', 'Compite por <span class="hero-accent">premios reales</span>', 'VANT Open para todos, Pro Series para PRO y Elite Invitational para ELITE. Inscríbete en la web o con /torneo inscribir en Discord.', '<a class="page-hero-chip page-hero-chip-link" href="#/precios">Desbloquear torneos privados</a>')}
      <div data-async="tournaments">${skeleton(4)}</div>`,
    async load(main) {
      const DB = window.VantDB;
      const set = (k, h) => { const el = main.querySelector(`[data-async="${k}"]`); if (el) el.innerHTML = h; };
      DB.tournaments().then((ts) => {
        set('tournaments', ts.length ? `<div class="t-grid">${ts.map(tournamentCard).join('')}</div>` : emptyState('Sin torneos', 'Aún no hay torneos publicados. Los anunciamos primero en Discord.', `<a class="btn btn-secondary" href="${DISCORD_INVITE}" target="_blank" rel="noopener noreferrer">Avisarme en Discord</a>`));
      }).catch((e) => set('tournaments', errorState(e)));
    },
  },

  'jugadores': {
    title: 'Jugadores — VANTCALL Esports',
    content: `
      ${pageHero('05', 'Jugadores', 'La comunidad <span class="hero-accent">VANTS</span>', 'Busca rivales, compañeros de equipo y fichajes. Cada perfil muestra rango, MMR, historial ranked y torneos jugados.', '<span class="page-hero-chip">Usa /perfil @jugador en Discord</span>')}
      <div class="players-search"><input type="search" class="input" data-player-search placeholder="Buscar jugador por nombre…" aria-label="Buscar jugador"></div>
      <div data-async="players">${skeleton(6)}</div>`,
    async load(main) {
      const DB = window.VantDB;
      const set = (k, h) => { const el = main.querySelector(`[data-async="${k}"]`); if (el) el.innerHTML = h; };
      const input = main.querySelector('[data-player-search]');
      let timer = null;
      const load = (q) => DB.players(q).then((ps) => {
        set('players', ps.length ? `<div class="players-grid">${ps.map((p) => `
          <a class="player-card" href="#/jugador/${encodeURIComponent(p.username)}">
            <div class="player-avatar">${p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" loading="lazy">` : initials(p.username)}</div>
            <div class="player-body">
              <div class="player-name">${esc(p.display_name || p.username)}${p.verified ? ' <span class="verified-badge" title="Verificado">✓</span>' : ''}</div>
              <div class="player-sub">@${esc(p.username)}${p.region ? ' · ' + esc(p.region) : ''}${p.main_game ? ' · ' + esc(p.main_game) : ''}</div>
            </div>
          </a>`).join('')}</div>` : emptyState('Sin resultados', 'Prueba con otro nombre o revisa la ortografía.'));
      }).catch((e) => set('players', errorState(e)));
      load('');
      input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => load(input.value.trim()), 250); });
    },
  },

  'jugador': {
    title: 'Perfil — VANTCALL Esports',
    content: `<div data-async="profile">${skeleton(4)}</div>`,
    async load(main, param) {
      const DB = window.VantDB;
      const set = (k, h) => { const el = main.querySelector(`[data-async="${k}"]`); if (el) el.innerHTML = h; };
      try {
        const p = await DB.player(param);
        if (!p) { set('profile', emptyState('Jugador no encontrado', 'Revisa el nombre o vuelve a la lista de jugadores.', '<a class="btn btn-secondary" href="#/jugadores">Ver jugadores</a>')); return; }
        const st = (p.stats || []).find((s) => s.season && s.season.status === 'active') || (p.stats || [])[0] || {};
        const bio = p.profile && p.profile.bio ? p.profile.bio : 'Sin biografía todavía.';
        set('profile', `
          <div class="profile-head">
            <div class="player-avatar player-avatar-lg">${p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="">` : initials(p.username)}</div>
            <div>
              <h1>${esc(p.display_name || p.username)}${p.verified ? ' <span class="verified-badge">✓</span>' : ''}</h1>
              <p class="player-sub">@${esc(p.username)}${p.region ? ' · ' + esc(p.region) : ''}${p.country ? ' · ' + esc(p.country) : ''}</p>
              <div class="profile-rank">${rankBadge({ ...st, rank: st.rank })}<span class="ranking-points">${st.mmr || 0} MMR</span></div>
            </div>
          </div>
          <p class="profile-bio">${esc(bio)}</p>
          <div class="dash-grid">
            <div class="dash-card"><div class="label">Victorias</div><div class="value">${st.wins || 0}</div></div>
            <div class="dash-card"><div class="label">Derrotas</div><div class="value">${st.losses || 0}</div></div>
            <div class="dash-card"><div class="label">Miembro desde</div><div class="value">${fmtDate(p.created_at, { month: 'short', year: 'numeric' })}</div></div>
          </div>
          <h2>Historial ranked</h2>
          <div class="rankings-list">${(p.matches || []).length ? p.matches.map((mm) => matchRow({ ...mm, p1: mm.player1_id === p.id ? { display_name: p.display_name, username: p.username } : null, p2: mm.player2_id === p.id ? { display_name: p.display_name, username: p.username } : null })).join('') : emptyState('Sin partidas', 'Aún no ha jugado partidas ranked esta temporada.')}</div>
          <h2>Torneos</h2>
          <div>${(p.entries || []).length ? p.entries.map((e2) => `<div class="match-card"><div class="event-body"><div class="event-title">${esc(e2.tournament ? e2.tournament.name : 'Torneo')}</div><div class="event-sub">${esc(statusLabel(e2.status))} · ${fmtDate(e2.registered_at)}</div></div>${e2.tournament ? `<a class="btn btn-secondary btn-sm" href="#/torneo/${encodeURIComponent(e2.tournament.slug)}">Ver</a>` : ''}</div>`).join('') : emptyState('Sin torneos', 'Todavía no se ha inscrito en ningún torneo.')}</div>
        `);
      } catch (e) { set('profile', errorState(e)); }
    },
  },

  'precios': {
    title: 'Precios — VANTCALL Esports',
    content: `
      ${pageHero('06', 'Precios', 'Elige tu <span class="hero-accent">nivel</span>', 'Tres planes, una escena. Empieza gratis en torneos abiertos y sube cuando quieras más.', '<span class="page-hero-chip">Cancela cuando quieras</span>')}
      ${planCards()}
      <div class="compare-wrap">
        <h2>Comparativa completa</h2>
        <table class="compare-table">
          <thead><tr><th>Función</th><th>BASIC</th><th>PRO</th><th>ELITE</th></tr></thead>
          <tbody>
            <tr><td>VANT Open (torneos abiertos)</td><td class="check">✓</td><td class="check">✓</td><td class="check">✓</td></tr>
            <tr><td>Perfil Ranked</td><td class="check">✓</td><td class="check">✓</td><td class="check">✓</td></tr>
            <tr><td>Ranked completo (8 rangos)</td><td>—</td><td class="check">✓</td><td class="check">✓</td></tr>
            <tr><td>Pro Series</td><td>—</td><td class="check">✓</td><td class="check">✓</td></tr>
            <tr><td>Scrims privadas</td><td>—</td><td class="check">✓</td><td class="check">✓</td></tr>
            <tr><td>Elite Invitational</td><td>—</td><td>—</td><td class="check">✓</td></tr>
            <tr><td>Canal Command</td><td>—</td><td>—</td><td class="check">✓</td></tr>
            <tr><td>Badge en perfil</td><td>—</td><td>—</td><td class="check">✓</td></tr>
          </tbody>
        </table>
      </div>`,
    async load() {},
  },

  'vip': {
    title: 'Zona VIP — VANTCALL Esports',
    content: `<div data-async="vip">${skeleton(3)}</div>`,
    async load(main) {
      const set = (k, h) => { const el = main.querySelector(`[data-async="${k}"]`); if (el) el.innerHTML = h; };
      set('vip', emptyState('Zona exclusiva', 'La Zona VIP está disponible para miembros con plan activo. Inicia sesión para ver tu contenido.', '<a class="btn btn-primary" href="#/login">Entrar</a>'));
    },
  },
};

// ============================================
// ROUTER
// ============================================

function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, ...rest] = h.split('/');
  return { name: name || 'inicio', param: rest.join('/') ? decodeURIComponent(rest.join('/')) : null };
}

async function renderRoute() {
  const { name, param } = parseRoute();
  const view = VIEWS[name] || VIEWS['inicio'];
  document.title = view.title;
  const main = $('#app');
  main.innerHTML = view.content;
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  if (view.load) await view.load(main, param);
  $$('a[href^="#/"]', main).forEach((a) => a.addEventListener('click', () => {}));
}

window.addEventListener('hashchange', renderRoute);
document.addEventListener('DOMContentLoaded', renderRoute);
