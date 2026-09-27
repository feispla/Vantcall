/* ============================================================
   VANTS — Enrutador y vistas (SPA con hash routing)
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     SUPABASE — Datos reales
     Configura SUPABASE_URL y SUPABASE_ANON_KEY con los valores de
     tu proyecto (Project Settings → API). La clave anon es pública
     por diseño; las políticas RLS del esquema solo permiten lectura.
     Si no está configurado o falla, la web usa los datos demo.
     ============================================================ */

  const SUPABASE = {
    url: '',            // ej. 'https://xxxxxxxx.supabase.co'
    anonKey: '',        // clave anon (pública)
  };

  const sb = {
    enabled: Boolean(SUPABASE.url && SUPABASE.anonKey),
    url: SUPABASE.url.replace(/\/$/, ''),
    key: SUPABASE.anonKey,
    async get(table, params = '') {
      const res = await fetch(`${this.url}/rest/v1/${table}?select=*${params}`, {
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) throw new Error(`Supabase ${table}: HTTP ${res.status}`);
      return res.json();
    },
  };

  // Estado de datos: 'live' (Supabase) | 'demo' (ficticios)
  let dataMode = 'demo';

  async function loadLiveData() {
    if (!sb.enabled) return false;
    try {
      const [teams, players, tournaments, series, maps, standings, news] = await Promise.all([
        sb.get('teams'),
        sb.get('players'),
        sb.get('tournaments'),
        sb.get('match_series', '&order=scheduled_at.asc'),
        sb.get('match_maps', '&order=sequence.asc'),
        sb.get('standings', '&order=position.asc'),
        sb.get('news_articles', '&status=eq.published&order=published_at.desc'),
      ]);
      // Equipos por slug para los joins
      const teamBySlug = Object.fromEntries(teams.map((t) => [t.slug, t]));
      const live = {
        teams: teams.map((t) => ({
          id: t.slug, slug: t.slug, name: t.name, tag: t.tag, game: t.game,
          region: t.region, crest: t.crest || '#3a3f4a', motto: t.motto || '',
        })),
        players: players.map((p) => ({
          slug: p.slug, name: p.name,
          team: p.team_id ? (teams.find((t) => t.id === p.team_id) || {}).slug : null,
          game: p.game, role: p.role, rating: p.rating, trend: p.trend,
          ...(p.stats || {}),
        })),
        tournaments: tournaments.map((t) => ({
          slug: t.slug, name: t.name, game: t.game, region: t.region, format: t.format,
          status: t.status, prize: t.prize, dates: t.dates, participants: t.participants,
          hue: t.hue, description: t.description, registration: t.registration_status,
        })),
        matches: series.map((m) => {
          const teamA = teams.find((t) => t.id === m.team_a_id);
          const teamB = teams.find((t) => t.id === m.team_b_id);
          const t = tournaments.find((x) => x.id === m.tournament_id);
          const maps = mapsFor(m.id, maps);
          return {
            id: m.public_id, tournament: t ? t.slug : null, game: m.game, stage: m.stage,
            bestOf: m.best_of, status: m.status,
            dayOffset: null, scheduledAt: m.scheduled_at,
            time: m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '',
            teamA: teamA ? teamA.slug : null, teamB: teamB ? teamB.slug : null,
            teamAName: m.team_a_label, teamBName: m.team_b_label,
            scoreA: m.score_a, scoreB: m.score_b,
            winner: m.winner, mvp: m.mvp, currentMap: m.current_map,
            maps: maps.length ? maps : null,
          };
        }),
        standings: Object.fromEntries(standings.reduce((acc, s) => {
          const key = (tournaments.find((t) => t.id === s.tournament_id) || {}).slug;
          if (!key) return acc;
          const row = { team: (teams.find((t) => t.id === s.team_id) || {}).slug, played: s.played, wins: s.wins, losses: s.losses, mapsFor: s.maps_for, mapsAgainst: s.maps_against, points: s.points };
          acc.push([key, [...(acc.find(([k]) => k === key) || [])[1] || [], row]]);
          return acc.filter(([k], i) => acc.findIndex(([k2]) => k2 === k) === i).map(([k, rows]) => [k, rows.concat(row).filter((r, idx, arr) => arr.findIndex((x) => x.team === r.team) === idx)]);
        }, [])),
        news: news.map((n) => ({
          slug: n.slug, title: n.title, excerpt: n.excerpt,
          body: Array.isArray(n.body) ? n.body : [], author: n.author,
          game: n.game, hue: n.hue,
          date: timeAgo(n.published_at),
        })),
      };
      // Normalizar standings al formato {slug: [rows]}
      const st = {};
      standings.forEach((s) => {
        const key = (tournaments.find((t) => t.id === s.tournament_id) || {}).slug;
        if (!key) return;
        (st[key] = st[key] || []).push({ team: (teams.find((t) => t.id === s.team_id) || {}).slug, played: s.played, wins: s.wins, losses: s.losses, mapsFor: s.maps_for, mapsAgainst: s.maps_against, points: s.points });
      });
      live.standings = st;
      if (!live.teams.length && !live.matches.length) return false;
      Object.assign(window, {
        TEAMS: live.teams, PLAYERS: live.players, TOURNAMENTS: live.tournaments,
        MATCHES: live.matches, STANDINGS: st, NEWS: live.news,
        GAMES: { valorant: { slug: 'valorant', name: 'VALORANT', short: 'VAL', dot: 'dot--valorant' }, cs2: { slug: 'cs2', name: 'Counter-Strike 2', short: 'CS2', dot: 'dot--cs2' }, lol: { slug: 'lol', name: 'League of Legends', short: 'LoL', dot: 'dot--lol' } },
        REGIONS: { latam: 'LATAM', na: 'Norteamérica', eu: 'Europa', br: 'Brasil', apac: 'Asia-Pacífico' },
      });
      dataMode = 'live';
      return true;
    } catch (err) {
      console.warn('[VANTS] Supabase no disponible, usando datos demo:', err.message);
      return false;
    }
  }

  function mapsFor(seriesId, allMaps) {
    return allMaps.filter((m) => m.series_id === seriesId)
      .map((m) => ({ name: m.name, scoreA: m.score_a, scoreB: m.score_b, winner: m.winner }));
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    const days = Math.round(hours / 24);
    if (days < 30) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
    return new Date(dateStr).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const app = document.getElementById('app');

  /* ---------- Utilidades ---------- */

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const gameTag = (slug) => {
    if (!slug) return '';
    const g = GAMES[slug];
    return `<span class="game-tag"><span class="dot ${g.dot}" aria-hidden="true"></span>${g.short}</span>`;
  };

  const statusBadge = (status) => {
    if (status === 'live') return '<span class="badge badge--live">En vivo</span>';
    if (status === 'upcoming') return '<span class="badge badge--upcoming">Próximo</span>';
    if (status === 'completed') return '<span class="badge badge--done">Finalizado</span>';
    return '<span class="badge">—</span>';
  };

  const crest = (team, size) => {
    if (!team) return `<span class="team-crest" style="background:#3a3f4a">—</span>`;
    const color = team.crest || '#3a3f4a';
    return `<span class="team-crest" style="background:${color}${size ? `;width:${size}px;height:${size}px` : ''}">${esc(team.tag)}</span>`;
  };

  const trend = (change) => {
    if (change > 0) return `<span class="trend-up num">▲ +${change}</span>`;
    if (change < 0) return `<span class="trend-down num">▼ ${change}</span>`;
    return '<span class="trend-same num">—</span>';
  };

  const bannerStyle = (hue) => {
    return `background:linear-gradient(135deg, oklch(0.32 0.11 ${hue}), oklch(0.2 0.05 ${hue + 30}) 55%, oklch(0.15 0.02 ${hue + 60}))`;
  };

  /* ---------- Tarjeta de partido ---------- */

  function matchCard(m) {
    const t = tournamentBySlug(m.tournament);
    const tm = matchTeams(m);
    const aWin = m.winner === 'a' || (m.status === 'completed' && m.scoreA > m.scoreB);
    const bWin = m.status === 'completed' && m.scoreB > m.scoreA;
    const showScore = m.status !== 'upcoming';
    const whenLabel = m.scheduledAt
      ? new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(m.scheduledAt))
      : (m.status === 'live' ? m.time : dateLabel(m.dayOffset) + ' · ' + m.time);
    return `
      <a class="card match-card" href="#/match/${m.id}">
        <div class="match-card__top">
          ${gameTag(m.game)}
          <span class="match-card__event">${esc(t.name)}</span>
          <span class="match-card__time">${whenLabel}</span>
        </div>
        <div class="match-card__row">
          <div class="match-card__team">
            ${crest({ tag: tm.aTag, crest: tm.aCrest })}
            <span class="match-card__name">${esc(tm.aName)}</span>
          </div>
          <div class="match-card__score">
            ${showScore
              ? `<span class="${aWin ? 'win' : ''} num">${m.scoreA}</span><span class="sep">—</span><span class="${bWin ? 'win' : ''} num">${m.scoreB}</span>`
              : '<span class="badge badge--upcoming">vs</span>'}
          </div>
          <div class="match-card__team match-card__team--right">
            <span class="match-card__name">${esc(tm.bName)}</span>
            ${crest({ tag: tm.bTag, crest: tm.bCrest })}
          </div>
        </div>
        <div class="match-card__foot">
          ${statusBadge(m.status)}
          <span class="match-card__stage">${esc(m.stage)}</span>
          <span>BO${m.bestOf}</span>
          ${m.status === 'live' && m.currentMap ? `<span>· ${esc(m.currentMap)}</span>` : ''}
          ${m.status === 'live' ? `<span>· Comenzó hace ${esc(m.elapsed)}</span>` : ''}
          ${m.status === 'completed' && m.mvp ? `<span>· MVP: ${esc(m.mvp)}</span>` : ''}
        </div>
      </a>`;
  }

  /* ---------- Vistas ---------- */

  function viewHome() {
    const live = MATCHES.filter((m) => m.status === 'live');
    const upcoming = MATCHES.filter((m) => m.status === 'upcoming').sort((a, b) => a.dayOffset - b.dayOffset);
    const featured = TOURNAMENTS[0];
    const heroMatch = live[0];
    const hm = matchTeams(heroMatch);

    return `
      ${demoNote()}
      <section class="hero" aria-label="Evento destacado">
        <div class="hero__art">
          <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <g opacity="0.5">
              <path d="M0 450 L800 450 L800 320 Q400 250 0 340 Z" fill="oklch(0.35 0.1 ${featured.hue} / 0.35)"/>
              <path d="M0 450 L800 450 L800 400 Q400 330 0 400 Z" fill="oklch(0.25 0.06 ${featured.hue} / 0.5)"/>
            </g>
            <g stroke="oklch(0.9 0.2 ${featured.hue} / 0.16)" stroke-width="1">
              ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${-100 + i * 200}" y1="450" x2="${100 + i * 180}" y2="0"/>`).join('')}
              ${[0, 1, 2, 3, 4].map((i) => `<line x1="0" y1="${i * 110}" x2="800" y2="${i * 110 - 60}"/>`).join('')}
            </g>
            <circle cx="640" cy="90" r="46" fill="oklch(from var(--color-accent) l c h / 0.16)"/>
            <circle cx="640" cy="90" r="26" fill="oklch(from var(--color-accent) l c h / 0.24)"/>
          </svg>
          <div class="hero__body">
            ${statusBadge(heroMatch.status)}
            <h2 class="hero__title">${esc(featured.name)}</h2>
            <div class="hero__teams">
              <span>${esc(hm.aName)}</span>
              <span class="hero__vs num">VS ${heroMatch.scoreA} — ${heroMatch.scoreB}</span>
              <span>${esc(hm.bName)}</span>
            </div>
            <div class="hero__meta">
              ${gameTag(heroMatch.game)}
              <span>${esc(heroMatch.stage)} · BO${heroMatch.bestOf}</span>
              <span class="num">${esc(heroMatch.currentMap)}</span>
            </div>
            <div class="hero__actions">
              <a class="btn btn--primary" href="#/match/${heroMatch.id}">Ver partido en vivo</a>
              <a class="btn btn--ghost" href="#/tournament/${featured.slug}">Ver torneo</a>
            </div>
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="live-h">
        <div class="section__head">
          <h2 id="live-h">En vivo ahora</h2>
          <a class="section__link" href="#/matches">Calendario completo →</a>
        </div>
        <div class="match-list">${live.map(matchCard).join('')}</div>
      </section>

      <section class="section" aria-labelledby="up-h">
        <div class="section__head">
          <h2 id="up-h">Próximos partidos</h2>
          <a class="section__link" href="#/matches">Ver todos →</a>
        </div>
        <div class="match-list">${upcoming.slice(0, 4).map(matchCard).join('')}</div>
      </section>

      <section class="section" aria-labelledby="tour-h">
        <div class="section__head">
          <h2 id="tour-h">Torneos destacados</h2>
          <a class="section__link" href="#/tournaments">Todos los torneos →</a>
        </div>
        <div class="grid">${TOURNAMENTS.slice(0, 3).map(tournamentCard).join('')}</div>
      </section>

      <section class="section" aria-labelledby="rank-h">
        <div class="section__head">
          <h2 id="rank-h">Rankings VANTS</h2>
          <a class="section__link" href="#/rankings">Rankings completos →</a>
        </div>
        ${rankingsPreview('valorant')}
      </section>

      <section class="section" aria-labelledby="news-h">
        <div class="section__head">
          <h2 id="news-h">Noticias recientes</h2>
          <a class="section__link" href="#/news">Todas las noticias →</a>
        </div>
        ${newsHeroCard(NEWS[0])}
        <div class="grid" style="margin-top:var(--space-4)">
          ${NEWS.slice(1, 4).map(newsCard).join('')}
        </div>
      </section>

      <section class="section" aria-labelledby="stats-h">
        <div class="section__head">
          <h2 id="stats-h">Destacados de la semana</h2>
          <a class="section__link" href="#/stats">Todas las estadísticas →</a>
        </div>
        <div class="stat-pills">
          ${statPill('MVP de la semana', 'Kryoz', 'VALORANT · 1.31 K/D')}
          ${statPill('Mejor equipo', 'Eclipse Core', 'LoL · 83% win rate')}
          ${statPill('Mayor subida', 'Fenrira', '+6 puestos · VALORANT')}
          ${statPill('Racha más larga', 'Iron Wolves', 'CS2 · 8 series ganadas')}
        </div>
      </section>`;
  }

  const statPill = (label, value, meta) => `
    <div class="card stat-pill">
      <span class="stat-pill__label">${esc(label)}</span>
      <span class="stat-pill__value">${esc(value)}</span>
      <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${esc(meta)}</span>
    </div>`;

  const demoNote = () => `
    <div class="demo-note" role="note">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16.5v.5"/></svg>
      ${dataMode === 'live'
        ? 'Datos en vivo desde Supabase.'
        : 'Datos de demostración: equipos, jugadores, torneos y resultados son ficticios.'}
    </div>`;

  /* ---------- Torneos ---------- */

  function tournamentCard(t) {
    const statusLabel = { live: 'En curso', upcoming: 'Próximo', completed: 'Finalizado' }[t.status];
    return `
      <a class="card tournament-card" href="#/tournament/${t.slug}">
        <div class="tournament-card__banner" style="${bannerStyle(t.hue)}">
          ${gameTag(t.game)}
        </div>
        <div class="tournament-card__body">
          <span class="tournament-card__name">${esc(t.name)}</span>
          <div class="tournament-card__meta">
            <span>${esc(REGIONS[t.region])}</span>
            <span>${esc(t.format)}</span>
            <span class="num">${esc(t.dates)}</span>
          </div>
          <div class="tournament-card__foot">
            <span>${esc(t.prize)}</span>
            <span class="badge ${t.status === 'live' ? 'badge--live' : t.status === 'upcoming' ? 'badge--upcoming' : 'badge--done'}">${statusLabel}</span>
          </div>
        </div>
      </a>`;
  }

  function viewTournaments() {
    const order = { live: 0, upcoming: 1, completed: 2 };
    const list = [...TOURNAMENTS].sort((a, b) => order[a.status] - order[b.status]);
    return `
      ${demoNote()}
      <div class="page-head">
        <p class="page-head__kicker">Competición</p>
        <h1>Torneos</h1>
        <p>Circuitos profesionales, copas y clasificatorios abiertos de VANTS en las tres disciplinas.</p>
      </div>
      <div class="grid">${list.map(tournamentCard).join('')}</div>`;
  }

  function viewTournament(slug, tab = 'resumen') {
    const t = tournamentBySlug(slug);
    if (!t) return view404();
    const matches = MATCHES.filter((m) => m.tournament === slug);
    const standings = STANDINGS[slug];
    const bracket = BRACKETS[slug];
    const tabs = [
      ['resumen', 'Resumen'],
      ['partidos', 'Partidos'],
      ...(standings ? [['clasificacion', 'Clasificación']] : []),
      ...(bracket ? [['bracket', 'Bracket']] : []),
    ];
    return `
      ${demoNote()}
      <nav class="crumbs" aria-label="Miga de pan"><a href="#/tournaments">Torneos</a><span>/</span><span>${esc(t.name)}</span></nav>
      <section class="card" style="margin-bottom:var(--space-6)">
        <div class="tournament-card__banner" style="${bannerStyle(t.hue)};aspect-ratio:21/6;border-radius:var(--radius-lg) var(--radius-lg) 0 0">${gameTag(t.game)}</div>
        <div style="padding:var(--space-6)">
          <h1 style="font-family:var(--font-display);font-size:var(--text-xl)">${esc(t.name)}</h1>
          <p style="color:var(--color-text-muted);margin-top:var(--space-2);max-width:60ch">${esc(t.description)}</p>
          <div class="stat-pills" style="margin-top:var(--space-5)">
            ${statPill('Premio', t.prize.split(' USD')[0], t.prize.includes('USD') ? 'USD' : '')}
            ${statPill('Formato', t.format, REGIONS[t.region])}
            ${statPill('Fechas', t.dates.split(' — ')[0], t.dates.split(' — ')[1] || '')}
            ${statPill('Participantes', String(t.participants), 'equipos inscritos')}
          </div>
        </div>
      </section>
      <div class="tabs" role="tablist">
        ${tabs.map(([id, label]) => `<button role="tab" aria-selected="${tab === id}" data-goto="#/tournament/${slug}/${id}">${label}</button>`).join('')}
      </div>
      ${tab === 'partidos' ? tournamentMatches(t, matches) : ''}
      ${tab === 'clasificacion' && standings ? standingsTable(standings) : ''}
      ${tab === 'bracket' && bracket ? bracketView(bracket) : ''}
      ${tab === 'resumen' ? `
        <div class="match-list">
          ${matches.filter((m) => m.status !== 'upcoming').map(matchCard).join('')}
        </div>` : ''}
    `;
  }

  function tournamentMatches(t, matches) {
    if (!matches.length) return emptyState('Sin partidos registrados', 'Los partidos de este torneo aparecerán aquí cuando se publiquen.');
    const groups = {};
    matches.forEach((m) => {
      const key = m.dayOffset;
      (groups[key] = groups[key] || []).push(m);
    });
    const keys = Object.keys(groups).map(Number).sort((a, b) => a - b);
    return keys.map((k) => `
      <div class="date-group">
        <p class="date-group__title">${dayLabel(k)}</p>
        <div class="match-list">${groups[k].map(matchCard).join('')}</div>
      </div>`).join('');
  }

  function standingsTable(rows) {
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th scope="col">#</th><th scope="col">Equipo</th><th scope="col">PJ</th>
            <th scope="col">G</th><th scope="col">P</th><th scope="col">MF</th>
            <th scope="col">MC</th><th scope="col">Dif</th><th scope="col">Pts</th>
          </tr></thead>
          <tbody>
            ${rows.map((r, i) => {
              const team = teamById(r.team);
              const dif = r.mapsFor - r.mapsAgainst;
              return `<tr>
                <td><span class="pos">${i + 1}</span></td>
                <td><a class="plain team-cell" href="#/team/${team.slug}">${crest(team)}<span>${esc(team.name)}</span></a></td>
                <td class="num">${r.played}</td>
                <td class="num win-col">${r.wins}</td>
                <td class="num">${r.losses}</td>
                <td class="num">${r.mapsFor}</td>
                <td class="num">${r.mapsAgainst}</td>
                <td class="num">${dif > 0 ? '+' + dif : dif}</td>
                <td class="num" style="font-weight:700">${r.points}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function bracketView(bracket) {
    return `
      <div class="bracket" role="region" aria-label="Bracket del torneo">
        ${bracket.map((round) => `
          <div class="bracket__round">
            <p class="bracket__round-title">${esc(round.round)}</p>
            ${round.matches.map((bm) => {
              const a = bm.a ? teamById(bm.a) : null;
              const b = bm.b ? teamById(bm.b) : null;
              const link = bm.id ? `href="#/match/${bm.id}"` : '';
              return `<a class="bracket__match" ${link}>
                <div class="bracket__slot ${bm.status === 'completed' && bm.scoreA > bm.scoreB ? 'winner' : ''}">
                  <span class="who">${a ? crest(a) : ''}<span>${a ? esc(a.name) : `<span class="tbd">${esc(bm.labelA || 'Por definir')}</span>`}</span></span>
                  <span class="pts">${bm.scoreA ?? ''}</span>
                </div>
                <div class="bracket__slot ${bm.status === 'completed' && bm.scoreB > bm.scoreA ? 'winner' : ''}">
                  <span class="who">${b ? crest(b) : ''}<span>${b ? esc(b.name) : `<span class="tbd">${esc(bm.labelB || 'Por definir')}</span>`}</span></span>
                  <span class="pts">${bm.scoreB ?? ''}</span>
                </div>
              </a>`;
            }).join('')}
          </div>`).join('')}
      </div>`;
  }

  /* ---------- Partidos ---------- */

  function viewMatches(params) {
    const game = params.get('game') || 'all';
    const status = params.get('status') || 'all';
    let list = [...MATCHES];
    if (game !== 'all') list = list.filter((m) => m.game === game);
    if (status !== 'all') list = list.filter((m) => m.status === status);
    list.sort((a, b) => {
      const aT = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Date.now() + a.dayOffset * 86400000;
      const bT = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Date.now() + b.dayOffset * 86400000;
      return aT - bT;
    });

    const chip = (kind, value, label) => {
      const params2 = new URLSearchParams(params);
      params2.set(kind, value);
      return `<a class="chip" role="button" aria-pressed="${params.get(kind) === value || (value === 'all' && !params.get(kind))}" href="#/matches?${params2.toString()}">${label}</a>`;
    };

    const groups = {};
    list.forEach((m) => {
      const key = m.scheduledAt
        ? new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(m.scheduledAt))
        : dayLabel(m.dayOffset);
      (groups[key] = groups[key] || []).push(m);
    });
    const keys = Object.keys(groups);

    return `
      ${demoNote()}
      <div class="page-head">
        <p class="page-head__kicker">Calendario</p>
        <h1>Partidos</h1>
        <p>Agenda de VANTS por fecha, juego y estado. Las horas se muestran en tu zona horaria local.</p>
      </div>
      <div class="section">
        <div class="chips" style="margin-bottom:var(--space-2)" role="group" aria-label="Filtro por juego">
          ${chip('game', 'all', 'Todos los juegos')}
          ${chip('game', 'valorant', 'VALORANT')}
          ${chip('game', 'cs2', 'CS2')}
          ${chip('game', 'lol', 'LoL')}
        </div>
        <div class="chips" role="group" aria-label="Filtro por estado">
          ${chip('status', 'all', 'Todos')}
          ${chip('status', 'live', 'En vivo')}
          ${chip('status', 'upcoming', 'Próximos')}
          ${chip('status', 'completed', 'Finalizados')}
        </div>
      </div>
      ${keys.length === 0
        ? emptyState('No hay partidos con estos filtros', 'Prueba a cambiar el juego o el estado para ver más partidos del calendario.')
        : keys.map((k) => `
          <div class="date-group">
            <p class="date-group__title">${esc(k)}</p>
            <div class="match-list">${groups[k].map(matchCard).join('')}</div>
          </div>`).join('')}`;
  }

  function viewMatch(id) {
    const m = matchById(id);
    if (!m) return view404();
    const t = tournamentBySlug(m.tournament);
    const tm = matchTeams(m);
    const aTeam = m.teamA ? teamById(m.teamA) : null;
    const bTeam = m.teamB ? teamById(m.teamB) : null;
    const rosterA = aTeam ? PLAYERS.filter((p) => p.team === aTeam.id).slice(0, 5) : [];
    const rosterB = bTeam ? PLAYERS.filter((p) => p.team === bTeam.id).slice(0, 5) : [];

    return `
      ${demoNote()}
      <nav class="crumbs" aria-label="Miga de pan">
        <a href="#/matches">Partidos</a><span>/</span>
        <a href="#/tournament/${t.slug}">${esc(t.name)}</a><span>/</span><span>${esc(m.stage)}</span>
      </nav>
      <section class="match-hero">
        <div class="match-hero__meta" style="justify-content:center">
          ${statusBadge(m.status)} ${gameTag(m.game)}
          <a class="plain" href="#/tournament/${t.slug}">${esc(t.name)}</a>
          <span>${esc(m.stage)}</span><span>BO${m.bestOf}</span>
          <span class="num">${m.status === 'upcoming' ? whenLabel : m.time} (hora local)</span>
        </div>
        <div class="match-hero__teams">
          <div class="match-hero__team">
            ${crest(aTeam, 64)}
            <span class="match-hero__team-name">${esc(tm.aName)}</span>
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${aTeam ? esc(REGIONS[aTeam.region]) : ''}</span>
          </div>
          <div class="match-hero__score" aria-label="Marcador de la serie">
            <span class="${m.status === 'completed' && m.scoreA > m.scoreB ? 'win-col' : ''}">${m.scoreA ?? '—'}</span>
            <span class="sep">:</span>
            <span class="${m.status === 'completed' && m.scoreB > m.scoreA ? 'win-col' : ''}">${m.scoreB ?? '—'}</span>
          </div>
          <div class="match-hero__team">
            ${crest(bTeam, 64)}
            <span class="match-hero__team-name">${esc(tm.bName)}</span>
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${bTeam ? esc(REGIONS[bTeam.region]) : ''}</span>
          </div>
        </div>
        ${m.status === 'live' && m.currentMap ? `<p style="text-align:center;color:var(--color-live);font-family:var(--font-mono);font-size:var(--text-sm)">● Ahora: ${esc(m.currentMap)} · ${esc(m.elapsed)} de juego</p>` : ''}
        ${m.status === 'completed' && m.mvp ? `<p style="text-align:center;color:var(--color-text-muted);font-size:var(--text-sm)">MVP de la serie: <strong style="color:var(--color-text)">${esc(m.mvp)}</strong></p>` : ''}
      </section>

      ${m.maps ? `
      <section class="section" aria-labelledby="maps-h">
        <div class="section__head"><h2 id="maps-h">Mapas de la serie</h2></div>
        <div class="maps-grid">
          ${m.maps.map((map, i) => `
            <div class="card map-card">
              <div class="map-card__head">
                <span class="map-card__name">${esc(map.name)}</span>
                <span class="map-card__pick">Mapa ${i + 1}</span>
              </div>
              <div class="map-card__score">
                <span style="color:${map.winner === 'A' ? 'var(--color-accent-dim)' : 'var(--color-text)'}">${map.scoreA ?? '—'}</span>
                <span style="color:var(--color-text-faint)">·</span>
                <span style="color:${map.winner === 'B' ? 'var(--color-accent-dim)' : 'var(--color-text)'}">${map.scoreB ?? '—'}</span>
              </div>
            </div>`).join('')}
        </div>
      </section>` : ''}

      ${(rosterA.length || rosterB.length) ? `
      <section class="section" aria-labelledby="roster-h">
        <div class="section__head"><h2 id="roster-h">Alineaciones</h2></div>
        <div style="display:grid;gap:var(--space-4);grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))">
          ${rosterA.length ? rosterCol(aTeam, rosterA) : ''}
          ${rosterB.length ? rosterCol(bTeam, rosterB) : ''}
        </div>
      </section>` : ''}`;
  }

  const rosterCol = (team, roster) => `
    <div>
      <p style="font-family:var(--font-mono);font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.12em;color:var(--color-text-faint);margin-bottom:var(--space-3)">${esc(team.name)}</p>
      <div class="roster-grid" style="grid-template-columns:1fr">
        ${roster.map((p) => `
          <a class="card player-card" href="#/player/${p.slug}">
            <span class="player-card__avatar" style="background:${team.crest}">${esc(p.name.slice(0, 2).toUpperCase())}</span>
            <span><span class="player-card__name">${esc(p.name)}</span><br><span class="player-card__meta">${esc(p.role)} · ${esc(GAMES[p.game].short)}</span></span>
          </a>`).join('')}
      </div>
    </div>`;

  /* ---------- Rankings ---------- */

  function rankingsPreview(game) {
    const r = RANKINGS[game];
    return `
      <div class="table-wrap">
        <table class="data-table" style="min-width:0">
          <thead><tr><th scope="col">#</th><th scope="col">Equipo</th><th scope="col">Rating</th><th scope="col">Win rate</th><th scope="col">Semana</th></tr></thead>
          <tbody>
            ${r.teams.map((row, i) => {
              const team = teamById(row.team);
              return `<tr>
                <td><span class="pos">${i + 1}</span></td>
                <td><a class="plain team-cell" href="#/team/${team.slug}">${crest(team)}<span>${esc(team.name)}</span></a></td>
                <td class="num" style="font-weight:700">${row.rating}</td>
                <td class="num">${row.winRate}%</td>
                <td>${trend(row.change)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function viewRankings(params) {
    const game = params.get('game') || 'valorant';
    const kind = params.get('tab') || 'teams';
    const r = RANKINGS[game];
    const rows = kind === 'teams' ? r.teams : r.players;
    return `
      ${demoNote()}
      <div class="page-head">
        <p class="page-head__kicker">Escala VANTS</p>
        <h1>Rankings</h1>
        <p>Rating VANTS por juego y temporada. Cada disciplina tiene su propia escala: los puntos nunca se mezclan entre juegos.</p>
      </div>
      <div class="section">
        <div class="chips" role="group" aria-label="Filtro por juego">
          ${['valorant', 'cs2', 'lol'].map((g) => `<a class="chip" aria-pressed="${game === g}" href="#/rankings?game=${g}&tab=${kind}">${GAMES[g].short}</a>`).join('')}
        </div>
        <div class="chips" style="margin-top:var(--space-2)" role="group" aria-label="Tipo de ranking">
          <a class="chip" aria-pressed="${kind === 'teams'}" href="#/rankings?game=${game}&tab=teams">Equipos</a>
          <a class="chip" aria-pressed="${kind === 'players'}" href="#/rankings?game=${game}&tab=players">Jugadores</a>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th scope="col">#</th><th scope="col">${kind === 'teams' ? 'Equipo' : 'Jugador'}</th>
            <th scope="col">Rating</th><th scope="col">Partidos</th><th scope="col">Win rate</th><th scope="col">Semana</th>
          </tr></thead>
          <tbody>
            ${rows.map((row, i) => {
              const isTeam = kind === 'teams';
              const entity = isTeam ? teamById(row.team) : playerBySlug(row.player);
              const href = isTeam ? `#/team/${entity.slug}` : `#/player/${entity.slug}`;
              return `<tr>
                <td><span class="pos">${i + 1}</span></td>
                <td><a class="plain team-cell" href="${href}">${isTeam ? crest(entity) : `<span class="player-card__avatar" style="background:${teamById(entity.team).crest};width:34px;height:34px">${esc(entity.name.slice(0, 2).toUpperCase())}</span>`}<span>${esc(entity.name)}</span></a></td>
                <td class="num" style="font-weight:700">${row.rating}</td>
                <td class="num">${row.matches}</td>
                <td class="num">${row.winRate}%</td>
                <td>${trend(row.change)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ---------- Estadísticas ---------- */

  function viewStats(params) {
    const game = params.get('game') || 'valorant';
    const players = PLAYERS.filter((p) => p.game === game).slice(0, 10);
    const isVal = game === 'valorant';
    const isCs = game === 'cs2';
    const cols = isVal
      ? [['K/D', 'kd'], ['ACS', 'acs'], ['HS %', 'hs']]
      : isCs
        ? [['K/D', 'kd'], ['ADR', 'adr'], ['KAST %', 'kast'], ['HS %', 'hs']]
        : [['K/D/A', 'kda'], ['CS/min', 'csmin'], ['Daño/min', 'dpm']];
    return `
      ${demoNote()}
      <div class="page-head">
        <p class="page-head__kicker">Datos de rendimiento</p>
        <h1>Estadísticas</h1>
        <p>Líderes individuales por juego, según torneos oficiales registrados en VANTS.</p>
      </div>
      <div class="chips section" role="group" aria-label="Filtro por juego">
        ${['valorant', 'cs2', 'lol'].map((g) => `<a class="chip" aria-pressed="${game === g}" href="#/stats?game=${g}">${GAMES[g].short}</a>`).join('')}
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th scope="col">#</th><th scope="col">Jugador</th><th scope="col">Equipo</th>
            ${cols.map(([label]) => `<th scope="col">${label}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${players.map((p, i) => {
              const team = teamById(p.team);
              return `<tr>
                <td><span class="pos">${i + 1}</span></td>
                <td><a class="plain" href="#/player/${p.slug}">${esc(p.name)}</a></td>
                <td><a class="plain" href="#/team/${team.slug}">${esc(team.tag)}</a></td>
                ${cols.map(([, key]) => `<td class="num">${p[key]}</td>`).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ---------- Noticias ---------- */

  function newsCard(n) {
    return `
      <a class="card news-card" href="#/news/${n.slug}">
        <div class="news-card__cover" style="${bannerStyle(n.hue)}"></div>
        <div class="news-card__body">
          ${n.game ? gameTag(n.game) : '<span class="badge">Plataforma</span>'}
          <span class="news-card__title">${esc(n.title)}</span>
          <span class="news-card__excerpt">${esc(n.excerpt)}</span>
          <span class="news-card__meta"><span>${esc(n.author)}</span><span>·</span><span>${esc(n.date)}</span></span>
        </div>
      </a>`;
  }

  function newsHeroCard(n) {
    return `
      <a class="card news-hero" href="#/news/${n.slug}">
        <div class="news-hero__cover" style="${bannerStyle(n.hue)}"></div>
        <div class="news-hero__body">
          ${n.game ? gameTag(n.game) : '<span class="badge">Plataforma</span>'}
          <span class="news-hero__title">${esc(n.title)}</span>
          <span style="color:var(--color-text-muted);font-size:var(--text-sm)">${esc(n.excerpt)}</span>
          <span class="news-card__meta"><span>${esc(n.author)}</span><span>·</span><span>${esc(n.date)}</span></span>
        </div>
      </a>`;
  }

  function viewNews() {
    return `
      ${demoNote()}
      <div class="page-head">
        <p class="page-head__kicker">Sala de redacción</p>
        <h1>Noticias</h1>
        <p>Cobertura de torneos, equipos y actualidad competitiva de la plataforma.</p>
      </div>
      ${newsHeroCard(NEWS[0])}
      <div class="grid" style="margin-top:var(--space-4)">${NEWS.slice(1).map(newsCard).join('')}</div>`;
  }

  function viewArticle(slug) {
    const n = NEWS.find((a) => a.slug === slug);
    if (!n) return view404();
    const related = NEWS.filter((a) => a.slug !== slug && (a.game === n.game || a.tournament === n.tournament)).slice(0, 3);
    return `
      ${demoNote()}
      <div class="article">
        <nav class="crumbs" aria-label="Miga de pan"><a href="#/news">Noticias</a><span>/</span><span>${esc(n.title)}</span></nav>
        <div class="article__head">
          ${n.game ? gameTag(n.game) : '<span class="badge">Plataforma</span>'}
          <h1>${esc(n.title)}</h1>
          <p class="news-card__meta" style="margin-top:var(--space-3)"><span>${esc(n.author)}</span><span>·</span><span>${esc(n.date)}</span></p>
        </div>
        <div class="article__cover" style="${bannerStyle(n.hue)}"></div>
        <div class="article__body">
          ${n.body.map((p) => `<p>${esc(p)}</p>`).join('')}
        </div>
      </div>
      ${related.length ? `
      <section class="section" style="max-width:72ch;margin-inline:auto" aria-labelledby="rel-h">
        <div class="section__head"><h2 id="rel-h">Relacionadas</h2></div>
        <div class="grid">${related.map(newsCard).join('')}</div>
      </section>` : ''}`;
  }

  /* ---------- Equipos y jugadores ---------- */

  function viewTeams() {
    return `
      ${demoNote()}
      <div class="page-head">
        <p class="page-head__kicker">Plantillas</p>
        <h1>Equipos</h1>
        <p>Organizaciones registradas en VANTS. Escudos y nombres ficticios de demostración.</p>
      </div>
      <div class="grid">
        ${TEAMS.map((t) => `
          <a class="card tournament-card" href="#/team/${t.slug}">
            <div class="tournament-card__banner" style="background:linear-gradient(135deg,${t.crest},oklch(0.18 0.02 250))">
              ${crest(t, 44)}
            </div>
            <div class="tournament-card__body">
              <span class="tournament-card__name">${esc(t.name)}</span>
              <div class="tournament-card__meta">
                <span>${gameTag(t.game)}</span><span>${esc(REGIONS[t.region])}</span>
              </div>
              <div class="tournament-card__foot"><span>${esc(t.motto)}</span><span class="num">${t.tag}</span></div>
            </div>
          </a>`).join('')}
      </div>`;
  }

  function viewTeam(slug) {
    const t = teamById(slug);
    if (!t) return view404();
    const roster = PLAYERS.filter((p) => p.team === t.id);
    const matches = MATCHES.filter((m) => m.teamA === t.id || m.teamB === t.id);
    const rank = RANKINGS[t.game].teams.findIndex((r) => r.team === t.id) + 1;
    const rating = rank ? RANKINGS[t.game].teams[rank - 1].rating : null;
    return `
      ${demoNote()}
      <nav class="crumbs" aria-label="Miga de pan"><a href="#/teams">Equipos</a><span>/</span><span>${esc(t.name)}</span></nav>
      <section class="card profile-head">
        ${crest(t, 72)}
        <div class="profile-head__info">
          <h1>${esc(t.name)}</h1>
          <div class="profile-head__tags">
            ${gameTag(t.game)}
            <span class="badge">${esc(REGIONS[t.region])}</span>
            ${rank ? `<span class="badge badge--upcoming">#${rank} ${GAMES[t.game].short}</span>` : ''}
          </div>
        </div>
        <div class="stat-pills" style="flex:1;min-width:220px">
          ${rating ? statPill('Rating VANTS', String(rating), GAMES[t.game].short) : ''}
          ${statPill('Roster', String(roster.length || 5), 'jugadores')}
        </div>
      </section>
      <section class="section" aria-labelledby="roster-h">
        <div class="section__head"><h2 id="roster-h">Roster</h2></div>
        <div class="roster-grid">
          ${roster.map((p) => `
            <a class="card player-card" href="#/player/${p.slug}">
              <span class="player-card__avatar" style="background:${t.crest}">${esc(p.name.slice(0, 2).toUpperCase())}</span>
              <span><span class="player-card__name">${esc(p.name)}</span><br><span class="player-card__meta">${esc(p.role)} · ${esc(GAMES[p.game].short)}</span></span>
              <span class="num" style="margin-left:auto;color:var(--color-text-muted)">${p.rating}</span>
            </a>`).join('') || `<p style="color:var(--color-text-muted)">Roster no publicado.</p>`}
        </div>
      </section>
      ${matches.length ? `
      <section class="section" aria-labelledby="matches-h">
        <div class="section__head"><h2 id="matches-h">Partidos</h2></div>
        <div class="match-list">${matches.map(matchCard).join('')}</div>
      </section>` : ''}`;
  }

  function viewPlayers(params) {
    const game = params.get('game') || 'all';
    let list = game === 'all' ? PLAYERS : PLAYERS.filter((p) => p.game === game);
    list = [...list].sort((a, b) => b.rating - a.rating);
    return `
      ${demoNote()}
      <div class="page-head">
        <p class="page-head__kicker">Talento</p>
        <h1>Jugadores</h1>
        <p>Perfiles competitivos con rating VANTS por juego. Identidades ficticias de demostración.</p>
      </div>
      <div class="chips section" role="group" aria-label="Filtro por juego">
        <a class="chip" aria-pressed="${game === 'all'}" href="#/players">Todos</a>
        ${['valorant', 'cs2', 'lol'].map((g) => `<a class="chip" aria-pressed="${game === g}" href="#/players?game=${g}">${GAMES[g].short}</a>`).join('')}
      </div>
      <div class="roster-grid">
        ${list.map((p) => {
          const team = teamById(p.team);
          return `
          <a class="card player-card" href="#/player/${p.slug}">
            <span class="player-card__avatar" style="background:${team.crest}">${esc(p.name.slice(0, 2).toUpperCase())}</span>
            <span style="min-width:0"><span class="player-card__name">${esc(p.name)}</span><br><span class="player-card__meta">${esc(p.role)} · ${esc(team.name)}</span></span>
            <span class="num" style="margin-left:auto;color:var(--color-text-muted)">${p.rating}</span>
          </a>`;
        }).join('')}
      </div>`;
  }

  function viewPlayer(slug) {
    const p = playerBySlug(slug);
    if (!p) return view404();
    const team = teamById(p.team);
    const isVal = p.game === 'valorant';
    const isCs = p.game === 'cs2';
    return `
      ${demoNote()}
      <nav class="crumbs" aria-label="Miga de pan"><a href="#/players">Jugadores</a><span>/</span><span>${esc(p.name)}</span></nav>
      <section class="card profile-head">
        <span class="team-crest" style="background:${team.crest};width:72px;height:72px;font-size:1.2rem">${esc(p.name.slice(0, 2).toUpperCase())}</span>
        <div class="profile-head__info">
          <h1>${esc(p.name)}</h1>
          <div class="profile-head__tags">
            ${gameTag(p.game)}
            <span class="badge">${esc(p.role)}</span>
            <a class="badge" style="text-decoration:none" href="#/team/${team.slug}">${esc(team.name)}</a>
            <span class="badge">${esc(REGIONS[team.region])}</span>
          </div>
        </div>
        <div class="stat-pills" style="flex:1;min-width:220px">
          ${statPill('Rating VANTS', String(p.rating), GAMES[p.game].short)}
          ${trend(p.trend)}
        </div>
      </section>
      <section class="section" aria-labelledby="perf-h">
        <div class="section__head"><h2 id="perf-h">Rendimiento</h2></div>
        <div class="stat-pills">
          ${isVal || isCs ? statPill('K/D', String(p.kd ?? '—'), 'por mapa') : statPill('K/D/A', String(p.kda ?? '—'), 'promedio')}
          ${isVal ? statPill('ACS', String(p.acs ?? '—'), 'por ronda') : ''}
          ${isCs ? statPill('ADR', String(p.adr ?? '—'), 'daño por ronda') : ''}
          ${isCs ? statPill('KAST', String(p.kast ?? '—') + '%', 'rondas con impacto') : ''}
          ${p.hs != null ? statPill('HS %', String(p.hs), 'precisión') : ''}
          ${p.game === 'lol' ? statPill('CS/min', String(p.csmin ?? '—'), 'farmeo') : ''}
          ${p.game === 'lol' ? statPill('Daño/min', String(p.dpm ?? '—'), 'DPM') : ''}
        </div>
      </section>
      <section class="section" aria-labelledby="pm-h">
        <div class="section__head"><h2 id="pm-h">Últimos partidos</h2></div>
        <div class="match-list">
          ${MATCHES.filter((m) => m.teamA === p.team || m.teamB === p.team).slice(0, 3).map(matchCard).join('') || emptyState('Sin partidos recientes', 'Los partidos de este jugador aparecerán aquí cuando su equipo juegue.')}
        </div>
      </section>`;
  }

  /* ---------- Login y conexiones ---------- */

  function viewLogin() {
    return `
      <div class="auth-panel card">
        <h1>Entrar a VANTS</h1>
        <p>Accede con tu cuenta para seguir equipos, guardar favoritos y competir.</p>
        <a class="auth-btn" href="#/settings/connections">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuar con Google
        </a>
        <a class="auth-btn" href="#/settings/connections">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#5865F2" d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.5 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13 13 0 0 1-1.88-.9.08.08 0 0 1 .01-.13 10 10 0 0 0 .4-.31.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08 0l.4.32a.08.08 0 0 1 0 .13 12.4 12.4 0 0 1-1.88.9.08.08 0 0 0-.04.1c.36.7.77 1.36 1.22 2a.08.08 0 0 0 .08.02 19.8 19.8 0 0 0 6.01-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42z"/></svg>
          Continuar con Discord
        </a>
        <p class="auth-note">Al continuar aceptas los <a href="#/terms" class="plain" style="text-decoration:underline">Términos</a> y la <a href="#/privacy" class="plain" style="text-decoration:underline">Política de privacidad</a> de VANTS. Cada proveedor se vincula a tu perfil por su identificador permanente, no por el correo.</p>
        <p class="auth-note">Demostración de interfaz: la autenticación real requiere la integración OAuth descrita en la documentación del proyecto.</p>
      </div>`;
  }

  function viewConnections() {
    const rows = [
      { name: 'Google', meta: 'player@gmail.com · vinculado el 27 sep 2026', on: true },
      { name: 'Discord', meta: 'vantsplayer@outlook.com · vinculado el 27 sep 2026', on: true },
      { name: 'Riot Games', meta: 'Disponible cuando la integración esté aprobada', on: false, soon: true },
      { name: 'Steam / CS2', meta: 'Próximamente', on: false, soon: true },
      { name: 'FACEIT', meta: 'Próximamente', on: false, soon: true },
    ];
    return `
      <div style="max-width:640px;margin-inline:auto">
        <div class="page-head">
          <p class="page-head__kicker">Ajustes</p>
          <h1>Cuentas vinculadas</h1>
          <p>Gestiona tus métodos de acceso. Los correos distintos pueden coexistir en el mismo perfil VANTS; el identificador del proveedor es el que define el vínculo.</p>
        </div>
        <div class="match-list">
          ${rows.map((r) => `
            <div class="card connection-row">
              <span class="status-dot ${r.on ? 'status-dot--on' : 'status-dot--off'}" aria-hidden="true"></span>
              <div class="connection-row__info">
                <p class="connection-row__name">${esc(r.name)}</p>
                <p class="connection-row__meta">${esc(r.meta)}</p>
              </div>
              ${r.on
                ? '<button class="btn btn--ghost btn--small" disabled title="Requiere reautenticación">Desconectar</button>'
                : '<button class="btn btn--ghost btn--small" disabled>Próximamente</button>'}
            </div>`).join('')}
        </div>
        <div class="demo-note" style="margin-top:var(--space-6)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Desvincular exige reautenticación reciente y conservar al menos un método de acceso alternativo.
        </div>
      </div>`;
  }

  /* ---------- Legales ---------- */

  function viewLegal(kind) {
    const content = {
      privacy: {
        title: 'Política de privacidad',
        intro: 'VANTS es una plataforma independiente. Esta política explica qué datos recibimos de los proveedores de acceso, cómo los usamos y cómo ejercer tus derechos.',
        sections: [
          ['Datos que recibimos', 'Al iniciar sesión con Google o Discord recibimos tu identificador permanente del proveedor, nombre público, avatar y, si está disponible, el correo. El identificador (no el correo) es lo que mantiene tu vínculo con la cuenta.'],
          ['Uso de los datos', 'Usamos estos datos para crear tu perfil, mantener tu sesión, mostrar tu identidad en torneos y enviar notificaciones de seguridad. No vendemos datos personales.'],
          ['Tokens de acceso', 'Si guardamos tokens de proveedores, se cifran en reposo (AES-256-GCM), se rotan con versión de clave y se revocan al desvincular la cuenta. Nunca llegan al navegador ni a los registros.'],
          ['Conservación', 'Los datos de perfil se conservan mientras la cuenta esté activa. Puedes solicitar la exportación o eliminación desde Ajustes; el borrado completo puede tardar hasta 30 días.'],
          ['Cookies y sesión', 'Usamos cookies HttpOnly de sesión. No usamos publicidad de terceros. Puedes revocar todas las sesiones desde Ajustes de seguridad.'],
          ['Terceros', 'VANTS no está afiliada a Riot Games, Valve, Discord ni Google. Los nombres y marcas pertenecen a sus respectivos dueños.'],
        ],
      },
      terms: {
        title: 'Términos de uso',
        intro: 'Estos términos regulan el uso de la plataforma VANTS, sus torneos y sus herramientas competitivas.',
        sections: [
          ['Cuenta', 'Debes tener edad mínima según tu jurisdicción y proporcionar información veraz. Cada persona mantiene una identidad VANTS; la creación de cuentas alternativas para eludir sanciones está prohibida.'],
          ['Conducta', 'Trampa, acoso, abuso verbal, conducta antideportiva y toda forma de fraude competitivo conllevan sanciones que pueden incluir la expulsión de torneos y el cierre de cuenta.'],
          ['Torneos', 'La inscripción implica aceptar el formato, horarios y reglas publicadas de cada torneo. Las decisiones administrativas documentadas son finales.'],
          ['Contenido', 'Conservas los derechos de lo que publiques y nos concedes licencia para mostrarlo dentro de la plataforma.'],
          ['Suspensión del servicio', 'Podemos suspender cuentas que incumplan estos términos. Puedes apelar mediante el proceso de soporte.'],
        ],
      },
      security: {
        title: 'Seguridad',
        intro: 'Cómo protegemos tu cuenta VANTS y qué controles tienes disponibles.',
        sections: [
          ['Identidad y vínculos', 'Cada proveedor externo se vincula por su identificador permanente (Google sub, Discord id, PUUID, SteamID64), nunca por el correo. Un mismo perfil puede tener correos distintos por proveedor.'],
          ['Reautenticación', 'Las acciones sensibles (desvincular proveedores, cambiar correo, revocar sesiones) exigen reautenticación reciente, válida por 10 minutos.'],
          ['Sesiones', 'Cookies HttpOnly + Secure, rotación de identificador de sesión y revocación total desde Ajustes de seguridad.'],
          ['Tokens', 'Cifrado AES-256-GCM en reposo, claves en gestor de secretos, rotación por versión y revocación al desvincular.'],
          ['Notificaciones', 'Vinculaciones, desvinculaciones, cambios de correo y accesos inusuales generan avisos al correo principal verificado.'],
          ['Reportar problemas', 'Si detectas actividad sospechosa en tu cuenta, cierra todas las sesiones, cambia tu método de acceso y contacta a soporte.'],
        ],
      },
    }[kind];
    return `
      <div class="page-head">
        <p class="page-head__kicker">Legal</p>
        <h1>${content.title}</h1>
        <p>${content.intro}</p>
      </div>
      <div class="legal-body">
        ${content.sections.map(([h, p]) => `<h2>${esc(h)}</h2><p>${esc(p)}</p>`).join('')}
      </div>`;
  }

  /* ---------- 404 ---------- */

  function view404() {
    return emptyState(
      'Página no encontrada',
      'El enlace que buscas no existe o cambió de dirección.',
      '<a class="btn btn--primary" href="#/">Volver al inicio</a>'
    );
  }

  function emptyState(title, text, action) {
    return `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="color:var(--color-text-faint);margin-bottom:var(--space-4)"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
        <h3>${esc(title)}</h3>
        <p>${esc(text)}</p>
        ${action || ''}
      </div>`;
  }

  /* ---------- Router ---------- */

  function parseHash() {
    const raw = location.hash.slice(1) || '/';
    const [path, query] = raw.split('?');
    return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(query || '') };
  }

  function render() {
    const { parts, params } = parseHash();
    let html;
    let navKey = null;
    if (parts.length === 0) { html = viewHome(); navKey = 'home'; }
    else if (parts[0] === 'matches') { html = viewMatches(params); navKey = 'matches'; }
    else if (parts[0] === 'match' && parts[1]) { html = viewMatch(parts[1]); navKey = 'matches'; }
    else if (parts[0] === 'tournaments' && !parts[1]) { html = viewTournaments(); navKey = 'tournaments'; }
    else if (parts[0] === 'tournament' && parts[1]) { html = viewTournament(parts[1], parts[2] || 'resumen'); navKey = 'tournaments'; }
    else if (parts[0] === 'rankings') { html = viewRankings(params); navKey = 'rankings'; }
    else if (parts[0] === 'stats') { html = viewStats(params); navKey = 'stats'; }
    else if (parts[0] === 'news' && !parts[1]) { html = viewNews(); navKey = 'news'; }
    else if (parts[0] === 'news' && parts[1]) { html = viewArticle(parts[1]); navKey = 'news'; }
    else if (parts[0] === 'teams' && !parts[1]) { html = viewTeams(); navKey = 'teams'; }
    else if (parts[0] === 'team' && parts[1]) { html = viewTeam(parts[1]); navKey = 'teams'; }
    else if (parts[0] === 'players' && !parts[1]) { html = viewPlayers(params); navKey = 'teams'; }
    else if (parts[0] === 'player' && parts[1]) { html = viewPlayer(parts[1]); navKey = 'teams'; }
    else if (parts[0] === 'login') { html = viewLogin(); }
    else if (parts[0] === 'settings' && parts[1] === 'connections') { html = viewConnections(); }
    else if (parts[0] === 'privacy') { html = viewLegal('privacy'); }
    else if (parts[0] === 'terms') { html = viewLegal('terms'); }
    else if (parts[0] === 'security') { html = viewLegal('security'); }
    else { html = view404(); }

    app.innerHTML = html;

    document.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    document.querySelectorAll('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => { location.hash = btn.dataset.goto.slice(1); });
    });

    const main = document.getElementById('main');
    if (main) { main.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  window.addEventListener('hashchange', render);

  // Arranque: intentar datos reales de Supabase antes del primer render
  loadLiveData().finally(() => render());

  /* ---------- Toggle de tema ---------- */

  (function () {
    const t = document.querySelector('[data-theme-toggle]');
    const r = document.documentElement;
    let d = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    r.setAttribute('data-theme', d);
    const update = () => {
      t && t.setAttribute('aria-label', 'Cambiar a modo ' + (d === 'dark' ? 'claro' : 'oscuro'));
      if (t) t.innerHTML = d === 'dark'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    };
    update();
    t && t.addEventListener('click', () => {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
      update();
    });
  })();
})();
