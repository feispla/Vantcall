// VANTS — FACEIT en #/jugador/<username>
// - Tarjetas de ELO / nivel FACEIT dentro del bloque de stats ranked
// - Sección "Historial FACEIT · CS2" (victorias / derrotas) justo después de "Historial ranked"
(function () {
  'use strict';
  var BASE = 'https://br-sweet-shape-b42xhogj-vantsdata.compute.c-6.us-east-2.aws.neon.tech/faceit';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var st = document.createElement('style');
  st.textContent =
    '.fm-box{margin:16px 0;padding:16px;border-radius:18px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03)}' +
    '.fm-box h2{margin:0 0 10px;font-size:1.05rem}.fm-row{display:grid;grid-template-columns:80px 1fr 80px 70px 70px;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;margin-top:6px;background:rgba(255,255,255,.03);font-size:.9rem}' +
    '.fm-sum{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:6px;font-size:.9rem}' +
    '.fm-w{color:#5fd38d;font-weight:800}.fm-l{color:#ff6b6b;font-weight:800}.fm-m{opacity:.65;font-size:.8rem}' +
    '.dash-card.fm-card .value{color:#ff5500}';
  document.head.appendChild(st);

  function findHeading(main, text) {
    var hs = main.querySelectorAll('h2');
    for (var i = 0; i < hs.length; i++) if (hs[i].textContent.trim().toLowerCase() === text) return hs[i];
    return null;
  }

  async function mount(main, user) {
    var head = main.querySelector('.profile-head');
    if (!head || main.querySelector('[data-fm]')) return;
    var box = document.createElement('section');
    box.className = 'fm-box'; box.setAttribute('data-fm', '');
    box.innerHTML = '<h2>Historial FACEIT · CS2</h2><p class="fm-m">Cargando…</p>';
    // Colocar después del historial ranked (o tras la cabecera si no existe)
    var rankedH = findHeading(main, 'historial ranked');
    var anchor = rankedH && rankedH.nextElementSibling;
    if (anchor) anchor.insertAdjacentElement('afterend', box); else head.insertAdjacentElement('afterend', box);

    try {
      var res = await Promise.all([
        fetch(BASE + '/player?username=' + encodeURIComponent(user)).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        fetch(BASE + '/matches?username=' + encodeURIComponent(user)).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      ]);
      var acc = res[0];
      var list = Array.isArray(res[1]) ? res[1] : [];

      // ELO en el bloque ranked
      var grid = main.querySelector('.dash-grid');
      if (acc && grid && !grid.querySelector('[data-fm-elo]')) {
        grid.insertAdjacentHTML('afterbegin',
          '<div class="dash-card fm-card" data-fm-elo><div class="label">ELO FACEIT</div><div class="value">' + esc(acc.elo != null ? acc.elo : '—') + '</div><div class="sub">Nivel ' + esc(acc.level != null ? acc.level : '—') + ' · ' + esc(acc.nickname || '') + '</div></div>');
      }

      if (!acc && !list.length) { box.remove(); return; }
      var w = list.filter(function (m) { return m.win; }).length, l = list.length - w;
      var wr = list.length ? Math.round((w / list.length) * 100) : 0;
      box.innerHTML = '<h2>Historial FACEIT · CS2</h2>' +
        '<div class="fm-sum"><span class="fm-w">' + w + ' victorias</span><span class="fm-l">' + l + ' derrotas</span><span>Winrate ' + wr + '%</span>' +
        (acc ? '<span>ELO ' + esc(acc.elo) + ' · Nivel ' + esc(acc.level) + '</span><a href="' + esc(acc.url) + '" target="_blank" rel="noopener noreferrer">Ver en FACEIT</a>' : '') + '</div>' +
        (list.length ? list.map(function (m) {
          var d = m.date ? new Date(isNaN(m.date) ? m.date : +m.date).toLocaleDateString('es') : '';
          return '<a class="fm-row" href="https://www.faceit.com/es/cs2/room/' + esc(m.id) + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none">' +
            '<span class="' + (m.win ? 'fm-w">VICTORIA' : 'fm-l">DERROTA') + '</span>' +
            '<span>' + esc((m.map || '').replace('de_', '')) + ' <span class="fm-m">' + esc(m.score || '') + '</span></span>' +
            '<span>' + esc(m.kills) + ' / ' + esc(m.deaths) + '</span><span>K/D ' + esc(m.kd) + '</span><span class="fm-m">' + esc(d) + '</span></a>';
        }).join('') : '<p class="fm-m">Sin partidas recientes en FACEIT.</p>');
    } catch (e) { box.remove(); }
  }

  function scan() {
    var h = decodeURIComponent((location.hash || '').replace(/^#\/?/, '')).split('?')[0];
    if (h.indexOf('jugador/') === 0) mount(document.querySelector('main') || document.body, h.slice(8));
  }
  var t;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 200); }).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(scan, 900);
})();
