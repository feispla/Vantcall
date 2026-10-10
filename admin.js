// ============================================
// VANTS — Panel de administración (solo admins de public.web_admins)
// Todo se lee y escribe en Neon (Data API + JWT de Auth0) con RLS: un usuario que no sea admin
// no puede ver ni modificar nada aunque abra esta ruta.
// ============================================
(function () {
  'use strict';
  if (typeof DOC_CONTENT !== 'object') return;

  const e = (v) => (typeof esc === 'function' ? esc(v) : String(v ?? ''));
  const sb = () => window.VantDB && window.VantDB.client;
  const dt = (d) => (d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
  const toLocalInput = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
  const sel = (name, options, cur, cls = '') => `<select name="${name}" class="adm-input ${cls}">${options.map(([v, l]) => `<option value="${e(v)}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${e(l)}</option>`).join('')}</select>`;
  const PLANS = [['free', 'Gratis'], ['basic', 'BASIC'], ['pro', 'PRO'], ['elite', 'ELITE']];
  const T_STATUS = [['draft', 'Borrador'], ['upcoming', 'Próximamente'], ['registration', 'Inscripción abierta'], ['closed', 'Inscripción cerrada'], ['in_progress', 'En curso'], ['completed', 'Finalizado'], ['cancelled', 'Cancelado']];
  const T_FORMAT = [['single_elimination', 'Eliminación simple'], ['double_elimination', 'Doble eliminación'], ['round_robin', 'Liga'], ['swiss', 'Suizo']];
  const E_STATUS = [['scheduled', 'Programado'], ['upcoming', 'Próximo'], ['live', 'En vivo'], ['completed', 'Finalizado'], ['cancelled', 'Cancelado']];
  const CATS = [['anuncios', 'Anuncios'], ['registros', 'Registros'], ['ranked', 'Ranked'], ['staff', 'Staff'], ['logs', 'Logs']];
  const ICON = {
    resumen: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    jugadores: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6"/>',
    torneos: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    eventos: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    ranked: '<path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z"/>',
    planes: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    soporte: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    bot: '<rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V4M8 14h.01M16 14h.01M9 18h6"/>',
    actividad: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  };
  const TABS = [['resumen', 'Resumen'], ['jugadores', 'Jugadores'], ['torneos', 'Torneos'], ['eventos', 'Eventos'], ['ranked', 'Ranked'], ['planes', 'Zona y planes'], ['soporte', 'Soporte'], ['bot', 'Bot Discord'], ['actividad', 'Actividad']];
  let tab = 'resumen';
  let role = null;

  // ---------- utilidades ----------
  function toast(text, kind = 'success') {
    let t = document.querySelector('.adm-toast');
    if (!t) { t = document.createElement('div'); t.className = 'adm-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text; t.dataset.kind = kind; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3200);
  }
  async function run(promise, okText) {
    const { data, error } = await promise;
    if (error) { toast(error.message || 'Error', 'error'); throw error; }
    if (okText) toast(okText);
    return data;
  }
  async function bot(action, extra = {}) {
    const { data, error } = await sb().functions.invoke('discord-admin', { body: { action, ...extra } });
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); msg = j.error || msg; } catch (_) { /* sin cuerpo */ }
      throw new Error(msg);
    }
    return data;
  }
  const formData = (form) => Object.fromEntries(new FormData(form).entries());
  const kpi = (label, value, sub = '', cls = '') => `<div class="adm-kpi ${cls}"><div class="adm-kpi-label">${label}</div><div class="adm-kpi-value">${value}</div>${sub ? `<div class="adm-kpi-sub">${sub}</div>` : ''}</div>`;
  const card = (title, body, actions = '') => `<section class="adm-card"><header class="adm-card-head"><h3>${title}</h3>${actions}</header>${body}</section>`;

  // ---------- pestañas ----------
  const VIEWS = {
    async resumen(el) {
      const o = await run(sb().rpc('admin_overview'));
      const ev = await run(sb().from('vant_sync_events').select('event_type, discord_status, created_at').order('created_at', { ascending: false }).limit(10));
      const max = Math.max(1, ...o.signups_14d.map((x) => x.n));
      const plans = o.plans || {};
      const prov = o.providers || {};
      el.innerHTML = `
        <div class="adm-kpis">
          ${kpi('Usuarios', o.users, `+${o.users_7d} en 7 días`)}
          ${kpi('Jugadores', o.players, `${o.logins_24h} activos en 24 h`)}
          ${kpi('Ingresos', ((o.revenue_cents || 0) / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), `${o.purchases} compras`, 'adm-kpi-gold')}
          ${kpi('Miembros de pago', (plans.basic || 0) + (plans.pro || 0) + (plans.elite || 0), `B ${plans.basic || 0} · P ${plans.pro || 0} · E ${plans.elite || 0}`)}
          ${kpi('Torneos activos', o.tournaments_live, `${o.events_upcoming} eventos próximos`)}
          ${kpi('Tickets abiertos', o.tickets_open, `${o.commands_7d} comandos del bot (7 d)`, o.tickets_open ? 'adm-kpi-alert' : '')}
        </div>
        <div class="adm-cols">
          ${card('Registros · últimos 14 días', `<div class="adm-bars">${o.signups_14d.map((x) => `<div class="adm-bar" title="${e(x.d)}: ${x.n}"><span style="height:${Math.round((x.n / max) * 100)}%"></span><em>${new Date(x.d).getDate()}</em></div>`).join('')}</div>`)}
          ${card('Métodos de acceso', `<ul class="adm-list">${['email', 'google', 'discord', 'steam'].map((k) => `<li><span>${({ email: 'Correo', google: 'Google', discord: 'Discord', steam: 'Steam' })[k]}</span><b>${prov[k] || 0}</b></li>`).join('')}</ul>
            ${!prov.discord ? '<p class="adm-warn">Ningún usuario ha podido entrar aún con Discord. Revisa la conexión de Discord en Auth0 → Authentication → Social.</p>' : ''}`)}
        </div>
        ${card('Últimos eventos de la plataforma', `<table class="adm-table"><thead><tr><th>Evento</th><th>Discord</th><th>Fecha</th></tr></thead><tbody>${ev.map((x) => `<tr><td>${e(x.event_type)}</td><td><span class="adm-pill">${e(x.discord_status || 'pendiente')}</span></td><td>${dt(x.created_at)}</td></tr>`).join('')}</tbody></table>`)}`;
    },

    async jugadores(el, search = '') {
      const rows = await run(sb().rpc('admin_players', { p_search: search || null }));
      el.innerHTML = card(`Jugadores (${rows.length})`, `
        <form class="adm-search" data-f="search"><input class="adm-input" name="q" placeholder="Buscar por nick o correo" value="${e(search)}"><button class="btn btn-secondary btn-sm">Buscar</button></form>
        <div class="adm-scroll"><table class="adm-table"><thead><tr><th>Jugador</th><th>Correo</th><th>Acceso</th><th>Discord</th><th>Último acceso</th><th>Verificado</th><th>Plan</th></tr></thead><tbody>
        ${rows.map((r) => `<tr data-id="${e(r.player_id)}">
          <td><a href="#/jugador/${encodeURIComponent(r.username)}"><b>${e(r.display_name || r.username)}</b></a><div class="adm-sub">@${e(r.username)}${r.is_admin ? ' · <span class="adm-pill adm-pill-red">admin</span>' : ''}</div></td>
          <td>${e(r.email || '—')}</td>
          <td>${(r.providers || []).map((p) => `<span class="adm-pill">${e(p)}</span>`).join(' ')}</td>
          <td>${r.discord_user_id ? `<code>${e(r.discord_user_id)}</code>` : '—'}</td>
          <td>${dt(r.last_sign_in_at)}</td>
          <td><label class="adm-switch"><input type="checkbox" data-verify${r.verified ? ' checked' : ''}><span></span></label></td>
          <td>${sel('plan', PLANS, r.plan, 'adm-plan-' + r.plan)}</td>
        </tr>`).join('')}</tbody></table></div>
        <p class="adm-note">Cambiar el plan aquí crea un permiso manual (origen “admin”). Los planes comprados con Stripe se asignan solos.</p>`);
      el.querySelector('[data-f="search"]').addEventListener('submit', (ev) => { ev.preventDefault(); VIEWS.jugadores(el, ev.target.q.value.trim()); });
      el.querySelectorAll('tr[data-id]').forEach((tr) => {
        const id = tr.dataset.id;
        tr.querySelector('[data-verify]').addEventListener('change', (ev) => run(sb().from('players').update({ verified: ev.target.checked }).eq('id', id), ev.target.checked ? 'Jugador verificado' : 'Verificación retirada'));
        tr.querySelector('select[name="plan"]').addEventListener('change', (ev) => run(sb().rpc('admin_set_plan', { p_player: id, p_tier: ev.target.value }), 'Plan actualizado: ' + ev.target.value.toUpperCase()));
      });
    },

    async torneos(el) {
      const rows = await run(sb().from('tournaments').select('*').order('starts_at', { ascending: false, nullsFirst: false }));
      el.innerHTML = card('Crear torneo', `
        <form class="adm-form" data-f="new">
          <label>Nombre<input class="adm-input" name="name" required minlength="3" maxlength="100"></label>
          <label>Formato${sel('format', T_FORMAT, 'single_elimination')}</label>
          <label>Plan mínimo${sel('tier', [['basic', 'Abierto (BASIC)'], ['pro', 'PRO'], ['elite', 'ELITE']], 'basic')}</label>
          <label>Plazas<input class="adm-input" name="max_participants" type="number" min="2" max="512" value="16"></label>
          <label>Inicio<input class="adm-input" name="starts_at" type="datetime-local" required></label>
          <label>Cierre de inscripción<input class="adm-input" name="registration_closes_at" type="datetime-local"></label>
          <label>Premio<input class="adm-input" name="prize_pool" maxlength="60" placeholder="Ej. 100 € + roles"></label>
          <label>Estado${sel('status', T_STATUS, 'registration')}</label>
          <label class="adm-wide">Descripción<textarea class="adm-input" name="description" rows="2" maxlength="1000"></textarea></label>
          <label class="adm-wide">Reglas<textarea class="adm-input" name="rules" rows="3"></textarea></label>
          <div class="adm-wide adm-actions"><button class="btn btn-primary">Publicar torneo</button><span class="adm-note">Se anuncia solo en Discord (canal de anuncios).</span></div>
        </form>`) + card(`Torneos (${rows.length})`, `<div class="adm-scroll"><table class="adm-table"><thead><tr><th>Torneo</th><th>Inicio</th><th>Plan</th><th>Inscritos</th><th>Estado</th><th></th></tr></thead><tbody>
        ${rows.map((t) => `<tr data-id="${e(t.id)}"><td><a href="#/torneo/${encodeURIComponent(t.slug)}"><b>${e(t.name)}</b></a><div class="adm-sub"><code>${e(t.slug)}</code></div></td><td>${dt(t.starts_at)}</td><td>${e(String(t.tier || '').toUpperCase())}</td><td>${t.current_participants || 0}/${t.max_participants || '—'}</td><td>${sel('status', T_STATUS, t.status)}</td><td><button class="adm-icon-btn" data-del title="Eliminar">✕</button></td></tr>`).join('') || '<tr><td colspan="6">Aún no hay torneos.</td></tr>'}
        </tbody></table></div>`);
      el.querySelector('[data-f="new"]').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = formData(ev.target);
        const slugBase = f.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'torneo';
        await run(sb().from('tournaments').insert({
          name: f.name, slug: slugBase + '-' + Date.now().toString(36).slice(-4), format: f.format, tier: f.tier, status: f.status,
          max_participants: Number(f.max_participants) || 16, current_participants: 0, prize_pool: f.prize_pool || null,
          description: f.description || null, rules: f.rules || null, starts_at: fromLocalInput(f.starts_at),
          registration_opens_at: new Date().toISOString(), registration_closes_at: fromLocalInput(f.registration_closes_at),
        }), 'Torneo publicado');
        window.VantDB.invalidate(); VIEWS.torneos(el);
      });
      el.querySelectorAll('tr[data-id]').forEach((tr) => {
        tr.querySelector('select').addEventListener('change', (ev) => run(sb().from('tournaments').update({ status: ev.target.value, updated_at: new Date().toISOString() }).eq('id', tr.dataset.id), 'Estado actualizado').then(() => window.VantDB.invalidate()));
        tr.querySelector('[data-del]').addEventListener('click', async () => {
          if (!confirm('¿Eliminar este torneo y sus inscripciones?')) return;
          await run(sb().from('tournament_matches').delete().eq('tournament_id', tr.dataset.id));
          await run(sb().from('tournament_entries').delete().eq('tournament_id', tr.dataset.id));
          await run(sb().from('tournaments').delete().eq('id', tr.dataset.id), 'Torneo eliminado');
          window.VantDB.invalidate(); VIEWS.torneos(el);
        });
      });
    },

    async eventos(el) {
      const rows = await run(sb().from('events').select('*').order('starts_at', { ascending: false }));
      el.innerHTML = card('Crear evento', `
        <form class="adm-form" data-f="new">
          <label>Título<input class="adm-input" name="title" required minlength="3" maxlength="120"></label>
          <label>Tipo${sel('event_type', [['comunidad', 'Comunidad'], ['scrim', 'Scrim'], ['stream', 'Stream'], ['tryout', 'Tryout'], ['torneo', 'Torneo']], 'comunidad')}</label>
          <label>Inicio<input class="adm-input" name="starts_at" type="datetime-local" required></label>
          <label>Fin<input class="adm-input" name="ends_at" type="datetime-local"></label>
          <label>Lugar<input class="adm-input" name="location" value="Discord" maxlength="100"></label>
          <label>Aforo<input class="adm-input" name="max_attendees" type="number" min="1"></label>
          <label class="adm-wide">Descripción<textarea class="adm-input" name="description" rows="2" maxlength="1000"></textarea></label>
          <div class="adm-wide adm-actions"><button class="btn btn-primary">Publicar evento</button></div>
        </form>`) + card(`Eventos (${rows.length})`, `<div class="adm-scroll"><table class="adm-table"><thead><tr><th>Evento</th><th>Fecha</th><th>Asistentes</th><th>Estado</th><th></th></tr></thead><tbody>
        ${rows.map((x) => `<tr data-id="${e(x.id)}"><td><b>${e(x.title)}</b><div class="adm-sub">${e(x.event_type)} · ${e(x.location || '')}</div></td><td>${dt(x.starts_at)}</td><td>${x.current_attendees || 0}${x.max_attendees ? '/' + x.max_attendees : ''}</td><td>${sel('status', E_STATUS, x.status)}</td><td><button class="adm-icon-btn" data-del title="Eliminar">✕</button></td></tr>`).join('') || '<tr><td colspan="5">Aún no hay eventos.</td></tr>'}
        </tbody></table></div>`);
      el.querySelector('[data-f="new"]').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = formData(ev.target);
        await run(sb().from('events').insert({ title: f.title, event_type: f.event_type, status: 'scheduled', location: f.location || 'Discord', max_attendees: f.max_attendees ? Number(f.max_attendees) : null, current_attendees: 0, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at), description: f.description || null }), 'Evento publicado');
        window.VantDB.invalidate(); VIEWS.eventos(el);
      });
      el.querySelectorAll('tr[data-id]').forEach((tr) => {
        tr.querySelector('select').addEventListener('change', (ev) => run(sb().from('events').update({ status: ev.target.value, updated_at: new Date().toISOString() }).eq('id', tr.dataset.id), 'Estado actualizado'));
        tr.querySelector('[data-del]').addEventListener('click', async () => {
          if (!confirm('¿Eliminar este evento?')) return;
          await run(sb().from('event_rsvps').delete().eq('event_id', tr.dataset.id));
          await run(sb().from('events').delete().eq('id', tr.dataset.id), 'Evento eliminado');
          window.VantDB.invalidate(); VIEWS.eventos(el);
        });
      });
    },

    async ranked(el) {
      const [seasons, rules] = await Promise.all([
        run(sb().from('seasons').select('*').order('season_number', { ascending: false })),
        run(sb().from('ranked_rules').select('*').order('rule_key')),
      ]);
      const active = seasons.find((s) => s.status === 'active');
      el.innerHTML = `<div class="adm-cols">` + card('Temporada', `
        ${active ? `<div class="adm-season"><b>${e(active.name)}</b><span>Del ${dt(active.start_date)} al ${dt(active.end_date)}</span></div>` : '<p class="adm-note">No hay temporada activa.</p>'}
        <form class="adm-form adm-form-2" data-f="season">
          <label>Nombre<input class="adm-input" name="name" placeholder="Temporada ${(seasons[0] ? seasons[0].season_number : 0) + 1}"></label>
          <label>Fin<input class="adm-input" name="end_date" type="datetime-local" required></label>
          <div class="adm-wide adm-actions"><button class="btn btn-primary">Iniciar nueva temporada</button><span class="adm-note">Cierra la actual.</span></div>
        </form>
        <ul class="adm-list">${seasons.map((s) => `<li><span>T${s.season_number} · ${e(s.name)}</span><b>${e(s.status)}</b></li>`).join('')}</ul>`)
        + card('Reglas ranked', `<form class="adm-form adm-form-2" data-f="rules">${rules.map((r) => `<label>${e(r.description || r.rule_key)}<input class="adm-input" name="${e(r.rule_key)}" value="${e(r.rule_value)}"></label>`).join('')}
          <div class="adm-wide adm-actions"><button class="btn btn-secondary">Guardar reglas</button></div></form>`) + `</div>`;
      el.querySelector('[data-f="season"]').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = formData(ev.target);
        const num = (seasons[0] ? seasons[0].season_number : 0) + 1;
        if (!confirm(`¿Cerrar la temporada actual e iniciar la temporada ${num}?`)) return;
        await run(sb().from('seasons').update({ status: 'closed' }).eq('status', 'active'));
        await run(sb().from('seasons').insert({ season_number: num, name: f.name || `Temporada ${num}`, start_date: new Date().toISOString(), end_date: fromLocalInput(f.end_date), status: 'active' }), `Temporada ${num} iniciada`);
        window.VantDB.invalidate(); VIEWS.ranked(el);
      });
      el.querySelector('[data-f="rules"]').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = formData(ev.target);
        for (const r of rules) if (f[r.rule_key] !== undefined && f[r.rule_key] !== r.rule_value) await run(sb().from('ranked_rules').update({ rule_value: f[r.rule_key], updated_at: new Date().toISOString() }).eq('id', r.id));
        toast('Reglas guardadas'); window.VantDB.invalidate();
      });
    },

    async planes(el) {
      const rows = await run(sb().from('plan_content').select('*').order('tier').order('sort_order'));
      const KINDS = [['perk', 'Ventaja'], ['link', 'Acceso / enlace'], ['announcement', 'Aviso'], ['code', 'Código']];
      const TIERS = [['basic', 'BASIC'], ['pro', 'PRO'], ['elite', 'ELITE']];
      const row = (r) => `<form class="adm-form adm-form-plan" data-id="${e(r.id || '')}">
          <label>Plan${sel('tier', TIERS, r.tier || 'basic')}</label>
          <label>Tipo${sel('kind', KINDS, r.kind || 'perk')}</label>
          <label class="adm-span2">Título<input class="adm-input" name="title" value="${e(r.title || '')}" required minlength="2" maxlength="120"></label>
          <label class="adm-wide">Contenido (solo lo ven los miembros)<textarea class="adm-input" name="body" rows="2" maxlength="2000">${e(r.body || '')}</textarea></label>
          <label>Texto del botón<input class="adm-input" name="cta_label" value="${e(r.cta_label || '')}" maxlength="40"></label>
          <label class="adm-span2">Enlace (https:// o #/ruta)<input class="adm-input" name="cta_url" value="${e(r.cta_url || '')}"></label>
          <label>Orden<input class="adm-input" name="sort_order" type="number" value="${e(r.sort_order ?? 100)}"></label>
          <div class="adm-wide adm-actions"><label class="adm-switch-label"><span class="adm-switch"><input type="checkbox" name="published"${r.published !== false ? ' checked' : ''}><span></span></span> Publicado</label>
            <button class="btn btn-${r.id ? 'secondary' : 'primary'} btn-sm">${r.id ? 'Guardar' : 'Añadir a la zona'}</button>${r.id ? '<button type="button" class="adm-icon-btn" data-del title="Eliminar">✕</button>' : ''}</div>
        </form>`;
      el.innerHTML = card('Añadir contenido exclusivo', row({}) + '<p class="adm-note">Lo publicado aparece en la Zona exclusiva, en Mi cuenta y con /zona en Discord, según el plan de cada miembro.</p>')
        + card(`Contenido de la zona (${rows.length})`, rows.map(row).join('<hr class="adm-hr">') || '<p class="adm-note">Sin contenido.</p>');
      el.querySelectorAll('form.adm-form-plan').forEach((f) => {
        f.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const d = formData(f);
          const payload = { tier: d.tier, kind: d.kind, title: d.title, body: d.body || null, cta_label: d.cta_label || null, cta_url: d.cta_url || null, sort_order: Number(d.sort_order) || 100, published: Boolean(d.published), updated_at: new Date().toISOString() };
          if (f.dataset.id) await run(sb().from('plan_content').update(payload).eq('id', f.dataset.id), 'Contenido guardado');
          else { await run(sb().from('plan_content').insert(payload), 'Contenido añadido'); VIEWS.planes(el); }
        });
        const del = f.querySelector('[data-del]');
        if (del) del.addEventListener('click', async () => { if (!confirm('¿Eliminar este contenido?')) return; await run(sb().from('plan_content').delete().eq('id', f.dataset.id), 'Eliminado'); VIEWS.planes(el); });
      });
    },

    async soporte(el) {
      const rows = await run(sb().from('support_tickets').select('*, player:players(username, display_name)').order('created_at', { ascending: false }).limit(100));
      el.innerHTML = card(`Tickets de soporte (${rows.length})`, `<div class="adm-tickets">${rows.map((t) => `
        <article class="adm-ticket" data-id="${e(t.id)}">
          <header><b>${e(t.subject)}</b><span>${dt(t.created_at)}</span></header>
          <div class="adm-sub">${t.player ? '@' + e(t.player.username) : 'Sin jugador'} · ${e(t.category)}${t.discord_id ? ' · Discord <code>' + e(t.discord_id) + '</code>' : ''}</div>
          ${t.description ? `<p>${e(t.description)}</p>` : ''}
          <div class="adm-actions">${sel('status', [['open', 'Abierto'], ['in_progress', 'En curso'], ['waiting', 'Esperando usuario'], ['resolved', 'Resuelto'], ['closed', 'Cerrado']], t.status)}${sel('priority', [['low', 'Baja'], ['normal', 'Normal'], ['high', 'Alta'], ['urgent', 'Urgente']], t.priority)}</div>
        </article>`).join('') || '<p class="adm-note">No hay tickets.</p>'}</div>`);
      el.querySelectorAll('.adm-ticket').forEach((a) => a.querySelectorAll('select').forEach((s) => s.addEventListener('change', () => {
        const patch = { [s.name]: s.value, updated_at: new Date().toISOString() };
        if (s.name === 'status' && ['resolved', 'closed'].includes(s.value)) patch.resolved_at = new Date().toISOString();
        run(sb().from('support_tickets').update(patch).eq('id', a.dataset.id), 'Ticket actualizado');
      })));
    },

    async bot(el) {
      el.innerHTML = `<div class="skeleton-list"><div class="skeleton-row"></div><div class="skeleton-row"></div></div>`;
      let st = null, stErr = null;
      try { st = await bot('status'); } catch (err) { stErr = err.message; }
      const [cmds, chans, staff, runs] = await Promise.all([
        run(sb().from('bot_commands').select('*').order('sort_order')),
        run(sb().from('discord_channels').select('*')),
        run(sb().from('bot_admins').select('*').order('created_at')),
        run(sb().from('bot_command_runs').select('*').order('created_at', { ascending: false }).limit(15)),
      ]);
      const channels = (st && st.channels) || [];
      const chanName = (id) => { const c = channels.find((x) => x.id === id); return c ? '#' + c.name : id; };
      const connected = st && st.connected;
      const statusBody = connected ? `
          <div class="adm-bot-head"><div class="adm-bot-avatar">${st.bot.avatar ? `<img src="https://cdn.discordapp.com/avatars/${e(st.bot.id)}/${e(st.bot.avatar)}.png?size=64" alt="">` : 'BOT'}</div>
            <div><b>${e(st.bot.username)}</b><div class="adm-sub">App ${e(st.application && st.application.id)} · Servidor ${e(st.guild_id)}</div></div></div>
          <ul class="adm-checks">
            <li class="${st.in_guild ? 'ok' : 'bad'}">${st.in_guild ? 'El bot está en el servidor VANTS' : 'El bot no está en el servidor'}${!st.in_guild && st.invite ? ` · <a href="${e(st.invite)}" target="_blank" rel="noopener noreferrer">Invitarlo</a>` : ''}</li>
            <li class="${st.endpoint_ok ? 'ok' : 'bad'}">${st.endpoint_ok ? 'Interactions Endpoint conectado' : 'El Interactions Endpoint no está conectado'}</li>
            <li class="${st.registered.length ? 'ok' : 'bad'}">${st.registered.length} comandos registrados en Discord</li>
          </ul>
          <div class="adm-actions"><button class="btn btn-primary btn-sm" data-sync>Sincronizar comandos con Discord</button><button class="btn btn-secondary btn-sm" data-reconnect>Cambiar token</button></div>`
        : `<p>${stErr ? e(stErr) : 'El bot aún no está conectado.'} Pega el token de tu bot y VANTS hará el resto: guarda el token cifrado en el servidor, conecta el Interactions Endpoint y registra todos los comandos.</p>`;
      const connectForm = `<form class="adm-form adm-form-2" data-f="connect"${connected ? ' hidden' : ''}>
          <label class="adm-span2">Token del bot (Developer Portal → Bot → Reset Token)<input class="adm-input" name="token" type="password" autocomplete="off" required placeholder="MTU1Mj..."></label>
          <label>ID del servidor<input class="adm-input" name="guild_id" value="${e((st && st.guild_id) || '1546641331927908472')}"></label>
          <div class="adm-wide adm-actions"><button class="btn btn-primary">Conectar bot</button><span class="adm-note">El token nunca se muestra ni se guarda en el navegador.</span></div>
        </form>`;
      const cmdRow = (c) => `<tr data-name="${e(c.name)}">
          <td><code>/${e(c.name)}</code><div class="adm-sub">${c.kind === 'builtin' ? 'Integrado' : 'Personalizado'} · ${c.uses || 0} usos</div></td>
          <td><input class="adm-input" name="description" value="${e(c.description)}" maxlength="100"></td>
          <td>${sel('min_plan', PLANS, c.min_plan)}</td>
          <td><label class="adm-switch"><input type="checkbox" name="staff_only"${c.staff_only ? ' checked' : ''}><span></span></label></td>
          <td><label class="adm-switch"><input type="checkbox" name="enabled"${c.enabled ? ' checked' : ''}><span></span></label></td>
          <td>${c.kind === 'custom' ? '<button class="adm-icon-btn" data-edit title="Editar respuesta">✎</button><button class="adm-icon-btn" data-del title="Eliminar">✕</button>' : ''}</td>
        </tr>${c.kind === 'custom' ? `<tr class="adm-cmd-edit" data-for="${e(c.name)}" hidden><td colspan="6"><form class="adm-form adm-form-2">
          <label>Título de la respuesta<input class="adm-input" name="response_title" value="${e(c.response_title || '')}" maxlength="256"></label>
          <label>Color<input class="adm-input" name="color" type="color" value="${e(c.color || '#ff4655')}"></label>
          <label class="adm-wide">Texto (admite **negrita** de Discord)<textarea class="adm-input" name="response_body" rows="4" maxlength="3500">${e(c.response_body || '')}</textarea></label>
          <label>Enlace (https://)<input class="adm-input" name="response_url" value="${e(c.response_url || '')}"></label>
          <label class="adm-switch-label"><span class="adm-switch"><input type="checkbox" name="ephemeral"${c.ephemeral ? ' checked' : ''}><span></span></span> Respuesta privada</label>
          <div class="adm-wide adm-actions"><button class="btn btn-secondary btn-sm">Guardar respuesta</button></div></form></td></tr>` : ''}`;

      el.innerHTML = `<div class="adm-cols">${card('Conexión con Discord', statusBody + connectForm)}
        ${card('Publicar anuncio', `<form class="adm-form" data-f="announce">
          <label>Canal${sel('category', CATS, 'anuncios')}</label>
          <label class="adm-span2">Título<input class="adm-input" name="title" required maxlength="256"></label>
          <label class="adm-wide">Mensaje<textarea class="adm-input" name="body" rows="3" maxlength="3500"></textarea></label>
          <div class="adm-wide adm-actions"><button class="btn btn-primary btn-sm"${connected ? '' : ' disabled'}>Publicar en Discord</button></div></form>`)}</div>
        ${card('Comandos del bot', `<div class="adm-scroll"><table class="adm-table adm-cmds"><thead><tr><th>Comando</th><th>Descripción</th><th>Plan mínimo</th><th>Solo staff</th><th>Activo</th><th></th></tr></thead><tbody>${cmds.map(cmdRow).join('')}</tbody></table></div>
          <form class="adm-form adm-form-new-cmd" data-f="newcmd">
            <label>Nuevo comando<input class="adm-input" name="name" required pattern="[a-z0-9_-]{1,32}" placeholder="ej. horarios"></label>
            <label class="adm-span2">Descripción<input class="adm-input" name="description" required maxlength="100" placeholder="Lo que verá el usuario en Discord"></label>
            <label class="adm-wide">Respuesta<textarea class="adm-input" name="response_body" rows="2" maxlength="3500" placeholder="Texto que responderá el bot"></textarea></label>
            <div class="adm-wide adm-actions"><button class="btn btn-secondary btn-sm">Crear comando</button><span class="adm-note">Después pulsa “Sincronizar comandos con Discord”.</span></div>
          </form>`)}
        <div class="adm-cols">
          ${card('Canales de notificaciones', `<form class="adm-form adm-form-2" data-f="channels">${CATS.map(([k, l]) => {
            const cur = (chans.find((c) => c.category === k) || {}).channel_id || '';
            return `<label>${l}${channels.length ? sel(k, [['', '— Sin canal —'], ...channels.map((c) => [c.id, '#' + c.name])], cur) : `<input class="adm-input" name="${k}" value="${e(cur)}" placeholder="ID del canal">`}${cur && !channels.length ? `<span class="adm-sub">${e(chanName(cur))}</span>` : ''}</label>`;
          }).join('')}<div class="adm-wide adm-actions"><button class="btn btn-secondary btn-sm">Guardar canales</button></div></form>`)}
          ${card('Staff del bot', `<ul class="adm-list">${staff.map((s) => `<li data-id="${e(s.id)}"><span><code>${e(s.discord_id)}</code> · ${e(s.role)}</span>${s.discord_id === 'BOT_SERVICE' ? '<b>sistema</b>' : '<button class="adm-icon-btn" data-del title="Quitar">✕</button>'}</li>`).join('')}</ul>
            <form class="adm-form adm-form-2" data-f="staff"><label>ID de Discord<input class="adm-input" name="discord_id" required pattern="\\d{17,20}" placeholder="626152052963147787"></label><label>Rol${sel('role', [['moderator', 'Moderador'], ['admin', 'Admin'], ['super_admin', 'Super admin']], 'moderator')}</label>
            <div class="adm-wide adm-actions"><button class="btn btn-secondary btn-sm">Añadir al staff</button><span class="adm-note">Pueden usar /vants en Discord.</span></div></form>`)}
        </div>
        ${card('Últimos comandos usados', `<table class="adm-table"><thead><tr><th>Comando</th><th>Usuario</th><th>Resultado</th><th>Fecha</th></tr></thead><tbody>${runs.map((r) => `<tr><td><code>/${e(r.command)}</code></td><td><code>${e(r.discord_id || '—')}</code></td><td>${r.ok ? 'OK' : 'Error'}</td><td>${dt(r.created_at)}</td></tr>`).join('') || '<tr><td colspan="4">Aún no se ha usado ningún comando.</td></tr>'}</tbody></table>`)}`;

      const reload = () => VIEWS.bot(el);
      const q = (s) => el.querySelector(s);
      const cf = q('[data-f="connect"]');
      cf.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = formData(cf);
        const btn = cf.querySelector('button'); btn.disabled = true; btn.textContent = 'Conectando…';
        try {
          const r = await bot('connect', { token: f.token, guild_id: f.guild_id });
          toast(`Bot ${r.bot.username} conectado · endpoint ${r.endpoint} · ${r.commands.ok ? r.commands.count + ' comandos' : r.commands.error}`, r.commands.ok && r.endpoint === 'ok' ? 'success' : 'error');
          reload();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Conectar bot'; }
      });
      const rc = q('[data-reconnect]'); if (rc) rc.addEventListener('click', () => { cf.hidden = !cf.hidden; });
      const sy = q('[data-sync]'); if (sy) sy.addEventListener('click', async () => {
        sy.disabled = true;
        try { const r = await bot('sync'); toast(`${r.count} comandos sincronizados con Discord`); reload(); } catch (err) { toast(err.message, 'error'); sy.disabled = false; }
      });
      q('[data-f="announce"]').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        try { await bot('announce', formData(ev.target)); toast('Anuncio publicado en Discord'); ev.target.reset(); } catch (err) { toast(err.message, 'error'); }
      });
      el.querySelectorAll('tr[data-name]').forEach((tr) => {
        const name = tr.dataset.name;
        const upd = (patch, msg) => run(sb().from('bot_commands').update({ ...patch, updated_at: new Date().toISOString() }).eq('name', name), msg);
        tr.querySelector('[name="description"]').addEventListener('change', (ev) => upd({ description: ev.target.value }, 'Descripción guardada'));
        tr.querySelector('[name="min_plan"]').addEventListener('change', (ev) => upd({ min_plan: ev.target.value }, 'Plan mínimo actualizado'));
        tr.querySelector('[name="staff_only"]').addEventListener('change', (ev) => upd({ staff_only: ev.target.checked }, 'Guardado'));
        tr.querySelector('[name="enabled"]').addEventListener('change', (ev) => upd({ enabled: ev.target.checked }, ev.target.checked ? `/${name} activado` : `/${name} desactivado`));
        const ed = tr.querySelector('[data-edit]'); if (ed) ed.addEventListener('click', () => { const x = el.querySelector(`tr[data-for="${name}"]`); x.hidden = !x.hidden; });
        const del = tr.querySelector('[data-del]'); if (del) del.addEventListener('click', async () => { if (!confirm(`¿Eliminar /${name}?`)) return; await run(sb().from('bot_commands').delete().eq('name', name), 'Comando eliminado'); reload(); });
      });
      el.querySelectorAll('tr.adm-cmd-edit form').forEach((f) => f.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = formData(f);
        await run(sb().from('bot_commands').update({ response_title: d.response_title || null, response_body: d.response_body || null, response_url: d.response_url || null, color: d.color || null, ephemeral: Boolean(d.ephemeral), updated_at: new Date().toISOString() }).eq('name', f.closest('tr').dataset.for), 'Respuesta guardada');
      }));
      q('[data-f="newcmd"]').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = formData(ev.target);
        await run(sb().from('bot_commands').insert({ name: d.name.toLowerCase(), description: d.description, kind: 'custom', response_title: '/' + d.name.toLowerCase(), response_body: d.response_body || d.description }), `/${d.name} creado`);
        reload();
      });
      q('[data-f="channels"]').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = formData(ev.target);
        for (const [k] of CATS) {
          const v = String(d[k] || '').trim();
          if (v) await run(sb().from('discord_channels').upsert({ category: k, channel_id: v, guild_id: (st && st.guild_id) || null, updated_by: 'panel', updated_at: new Date().toISOString() }));
          else await run(sb().from('discord_channels').delete().eq('category', k));
        }
        toast('Canales guardados');
      });
      q('[data-f="staff"]').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = formData(ev.target);
        await run(sb().from('bot_admins').insert({ discord_id: d.discord_id, role: d.role }), 'Añadido al staff');
        reload();
      });
      el.querySelectorAll('li[data-id] [data-del]').forEach((b) => b.addEventListener('click', async () => { await run(sb().from('bot_admins').delete().eq('id', b.closest('li').dataset.id), 'Quitado del staff'); reload(); }));
    },

    async actividad(el) {
      const [logs, ev] = await Promise.all([
        run(sb().from('audit_logs').select('*').order('created_at', { ascending: false }).limit(40)),
        run(sb().from('vant_sync_events').select('event_type, discord_status, discord_error, created_at').order('created_at', { ascending: false }).limit(40)),
      ]);
      el.innerHTML = `<div class="adm-cols">` + card('Acciones del staff', `<table class="adm-table"><thead><tr><th>Acción</th><th>Por</th><th>Fecha</th></tr></thead><tbody>${logs.map((l) => `<tr><td>${e(l.action)}<div class="adm-sub">${e(l.target_type)} ${e(String(l.target_id || '').slice(0, 12))}</div></td><td>${e(l.actor_type)}</td><td>${dt(l.created_at)}</td></tr>`).join('') || '<tr><td colspan="3">Sin acciones.</td></tr>'}</tbody></table>`)
        + card('Eventos enviados a Discord', `<table class="adm-table"><thead><tr><th>Evento</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>${ev.map((x) => `<tr><td>${e(x.event_type)}${x.discord_error ? `<div class="adm-sub">${e(x.discord_error.slice(0, 80))}</div>` : ''}</td><td><span class="adm-pill">${e(x.discord_status || 'pendiente')}</span></td><td>${dt(x.created_at)}</td></tr>`).join('')}</tbody></table>`) + `</div>`;
    },
  };

  async function show(main) {
    const panel = main.querySelector('[data-adm-panel]');
    main.querySelectorAll('[data-adm-tab]').forEach((b) => b.classList.toggle('active', b.dataset.admTab === tab));
    const title = main.querySelector('[data-adm-title]');
    if (title) title.textContent = (TABS.find((t) => t[0] === tab) || [])[1] || '';
    panel.innerHTML = `<div class="skeleton-list"><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div></div>`;
    try { await VIEWS[tab](panel); } catch (err) { panel.innerHTML = typeof errorState === 'function' ? errorState(err) : e(err.message); }
  }

  DOC_CONTENT['admin'] = {
    title: 'Panel admin — VANTS',
    content: `<div class="adm" data-adm><div class="skeleton-list"><div class="skeleton-row"></div></div></div>`,
    async load(main) {
      const root = main.querySelector('[data-adm]');
      const A = window.VantAuth;
      if (!A || !A.session) {
        root.innerHTML = `<div class="login-page"><h1>Panel admin</h1><p class="login-sub">Inicia sesión con tu cuenta de administrador.</p><p class="login-switch"><a class="btn btn-primary" href="#/login">Iniciar sesión</a></p></div>`;
        return;
      }
      const { data } = await sb().rpc('web_admin_role');
      role = data || null;
      if (!role) {
        root.innerHTML = `<div class="login-page"><h1>Acceso restringido</h1><p class="login-sub">Esta zona es solo para el equipo de VANTS.</p><p class="login-switch"><a class="btn btn-secondary" href="#/inicio">Volver al inicio</a></p></div>`;
        return;
      }
      root.innerHTML = `
        <aside class="adm-side">
          <div class="adm-brand"><img src="./assets/brand/vants-mark.svg" alt="" width="28" height="28"><div><b>VANTS</b><span>Panel · ${e(role)}</span></div></div>
          <nav>${TABS.map(([k, l]) => `<button type="button" class="adm-tab" data-adm-tab="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>${l}</button>`).join('')}</nav>
          <div class="adm-side-foot"><span class="dot"></span> Neon en vivo</div>
        </aside>
        <section class="adm-main">
          <header class="adm-top"><div><div class="adm-kicker">Administración</div><h1 data-adm-title></h1></div><button type="button" class="btn btn-secondary btn-sm" data-adm-refresh>Actualizar</button></header>
          <div data-adm-panel></div>
        </section>`;
      root.querySelectorAll('[data-adm-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.admTab; show(main); }));
      root.querySelector('[data-adm-refresh]').addEventListener('click', () => show(main));
      show(main);
    },
  };
})();
