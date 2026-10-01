// ============================================
// VANTS — Zona exclusiva para miembros BASIC / PRO / ELITE
// El contenido sale de public.plan_content (RLS: solo se lee lo de tu plan o inferior).
// ============================================
(function () {
  'use strict';
  if (typeof DOC_CONTENT !== 'object') return;

  const RANK = { free: 0, basic: 1, pro: 2, elite: 3 };
  const TIERS = [
    { key: 'basic', name: 'BASIC', emblem: 'plata', price: 9 },
    { key: 'pro', name: 'PRO', emblem: 'diamante', price: 19 },
    { key: 'elite', name: 'ELITE', emblem: 'escarlata', price: 39 },
  ];
  const KIND = { perk: 'Ventaja', link: 'Acceso', announcement: 'Aviso', code: 'Código' };
  const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const e = (v) => (typeof esc === 'function' ? esc(v) : String(v ?? ''));
  const ext = (u) => /^https?:/.test(u || '');

  async function teaser(sb) {
    const { data } = await sb.rpc('plan_content_teaser');
    return data || [];
  }

  function lockedColumns(items, fromRank) {
    return `<div class="zn-tiers">${TIERS.map((t) => {
      const unlocked = RANK[t.key] <= fromRank;
      const list = items.filter((i) => i.tier === t.key);
      return `<div class="zn-tier zn-tier-${t.key}${unlocked ? ' is-open' : ''}">
        <div class="zn-tier-head"><img src="./assets/ranks/${t.emblem}.png" alt="" width="44" height="44" loading="lazy"><div><b>VANT ${t.name}</b><span>${unlocked ? 'Desbloqueado' : 'Desde ' + t.price + ' €'}</span></div></div>
        <ul>${list.map((i) => `<li>${unlocked ? '' : LOCK}<span>${e(i.title)}</span></li>`).join('') || '<li><span>Próximamente</span></li>'}</ul>
        ${unlocked ? '' : `<a class="btn btn-sm ${t.key === 'elite' ? 'btn-gold' : 'btn-primary'}" href="#/checkout/${t.key}">Desbloquear ${t.name}</a>`}
      </div>`;
    }).join('')}</div>`;
  }

  DOC_CONTENT['zona'] = {
    title: 'Zona exclusiva — VANTS',
    content: `<div class="zona" data-zona><div class="skeleton-list"><div class="skeleton-row"></div><div class="skeleton-row"></div></div></div>`,
    async load(main) {
      const root = main.querySelector('[data-zona]');
      const A = window.VantAuth;
      const sb = window.VantDB && window.VantDB.client;
      if (!sb) return;
      try {
        const items = await teaser(sb);
        if (!A || !A.session) {
          root.innerHTML = `
            <section class="zn-hero zn-hero-locked">
              <div class="zn-kicker">${LOCK} Zona exclusiva</div>
              <h1>Contenido solo para <span class="hero-accent">miembros VANT</span></h1>
              <p>Torneos privados, scrims, canales de Discord reservados y ventajas que se desbloquean con tu plan.</p>
              <div class="hero-cta"><a class="btn btn-primary btn-lg" href="#/login">Iniciar sesión</a><a class="btn btn-secondary btn-lg" href="#/precios">Ver planes</a></div>
            </section>${lockedColumns(items, 0)}`;
          return;
        }
        let me = A.me;
        if (!me) me = await A.loadMe();
        const plan = (me && me.plan) || 'free';
        const rank = RANK[plan] || 0;
        const p = me && me.player;
        if (rank === 0) {
          root.innerHTML = `
            <section class="zn-hero zn-hero-locked">
              <div class="zn-kicker">${LOCK} Zona exclusiva</div>
              <h1>Tu zona está <span class="hero-accent">bloqueada</span></h1>
              <p>Hola ${e((p && (p.display_name || p.username)) || 'jugador')}. Elige un plan y todo lo de abajo se abre al instante, en la web y en Discord.</p>
              <div class="hero-cta"><a class="btn btn-primary btn-lg" href="#/precios">Elegir plan</a></div>
            </section>${lockedColumns(items, 0)}`;
          return;
        }
        const tier = TIERS.find((t) => t.key === plan);
        const perks = (me.perks || []).filter((k) => RANK[k.tier] <= rank);
        const { data: tours } = await sb.from('tournaments').select('name, slug, status, tier, starts_at, max_participants, current_participants, prize_pool')
          .in('tier', ['pro', 'elite']).not('status', 'in', '(completed,cancelled,draft)').order('starts_at', { ascending: true }).limit(6);
        const mine = (tours || []).filter((t) => RANK[t.tier] <= rank);
        const next = TIERS.find((t) => RANK[t.key] === rank + 1);
        root.innerHTML = `
          <section class="zn-hero zn-hero-${plan}">
            <div class="zn-member">
              <div class="zn-card zn-card-${plan}">
                <div class="zn-card-top"><img src="./assets/brand/vants-mark.svg" alt="" width="28" height="28"><span>VANT ${tier.name}</span></div>
                <img class="zn-card-emblem" src="./assets/ranks/${tier.emblem}.png" alt="" width="84" height="84">
                <div class="zn-card-name">${e((p && (p.display_name || p.username)) || 'Miembro')}</div>
                <div class="zn-card-meta"><span>@${e(p ? p.username : '')}</span><span>Nº ${e(p ? p.id.slice(0, 8).toUpperCase() : '—')}</span></div>
              </div>
              <div class="zn-welcome">
                <div class="zn-kicker">Zona exclusiva · ${tier.name}</div>
                <h1>Bienvenido a tu <span class="hero-accent">zona ${tier.name}</span></h1>
                <p>Todo lo que incluye tu plan, en un solo sitio. Usa <code>/zona</code> en Discord para verlo también allí.</p>
                <div class="hero-cta"><a class="btn btn-primary" href="https://discord.gg/rCHE7jvRS4" target="_blank" rel="noopener noreferrer">Abrir Discord</a><a class="btn btn-secondary" href="#/torneos">Ver torneos</a></div>
              </div>
            </div>
          </section>

          <h2 class="zn-h2">Tus ventajas</h2>
          <div class="zn-perks">${perks.map((k) => `
            <article class="zn-perk zn-perk-${e(k.tier)}">
              <div class="zn-perk-top"><span class="zn-perk-kind">${e(KIND[k.kind] || k.kind)}</span><span class="zn-perk-tier">${e(String(k.tier).toUpperCase())}</span></div>
              <h3>${e(k.title)}</h3>
              ${k.body ? `<p>${e(k.body)}</p>` : ''}
              ${k.cta_url && k.cta_label ? `<a class="link-inline" href="${e(k.cta_url)}"${ext(k.cta_url) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${e(k.cta_label)} →</a>` : ''}
            </article>`).join('') || '<p class="login-note">El staff está preparando tu contenido.</p>'}</div>

          <h2 class="zn-h2">Torneos exclusivos</h2>
          ${mine.length ? `<div class="t-grid">${mine.map((t) => (typeof tournamentCard === 'function' ? tournamentCard(t) : '')).join('')}</div>`
            : (typeof emptyState === 'function' ? emptyState('Sin torneos privados ahora mismo', 'Te avisaremos en Discord en cuanto se abra la próxima Pro Series o Elite Invitational.') : '')}

          ${next ? `<h2 class="zn-h2">Sube a ${next.name}</h2>${lockedColumns(items, rank)}` : `<div class="zn-top"><b>Tienes el plan más alto.</b> Gracias por impulsar VANTS.</div>`}`;
      } catch (err) {
        root.innerHTML = typeof errorState === 'function' ? errorState(err) : 'Error';
      }
    },
  };
})();
