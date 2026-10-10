// VANTS — Últimas partidas FACEIT (CS2) en #/jugador/<username>
(function () {
  'use strict';
  var API = 'https://br-sweet-shape-b42xhogj-vantsdata.compute.c-6.us-east-2.aws.neon.tech/faceit/matches?username=';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var st = document.createElement('style');
  st.textContent =
    '.fm-box{margin:16px 0;padding:16px;border-radius:18px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03)}' +
    '.fm-box h2{margin:0 0 10px;font-size:1.05rem}.fm-row{display:grid;grid-template-columns:60px 1fr 80px 70px 60px;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;margin-top:6px;background:rgba(255,255,255,.03);font-size:.9rem}' +
    '.fm-w{color:#5fd38d;font-weight:800}.fm-l{color:#ff6b6b;font-weight:800}.fm-m{opacity:.65;font-size:.8rem}';
  document.head.appendChild(st);

  async function mount(main, user) {
    var head = main.querySelector('.profile-head');
    if (!head || main.querySelector('[data-fm]')) return;
    var box = document.createElement('section');
    box.className = 'fm-box'; box.setAttribute('data-fm', '');
    box.innerHTML = '<h2>Últimas partidas FACEIT · CS2</h2><p class="fm-m">Cargando…</p>';
    head.insertAdjacentElement('afterend', box);
    try {
      var r = await fetch(API + encodeURIComponent(user));
      var list = r.ok ? await r.json() : [];
      if (!list.length) { box.remove(); return; }
      box.innerHTML = '<h2>Últimas partidas FACEIT · CS2</h2>' + list.map(function (m) {
        var d = m.date ? new Date(isNaN(m.date) ? m.date : +m.date).toLocaleDateString('es') : '';
        return '<a class="fm-row" href="https://www.faceit.com/es/cs2/room/' + esc(m.id) + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none">' +
          '<span class="' + (m.win ? 'fm-w">VICTORIA' : 'fm-l">DERROTA') + '</span>' +
          '<span>' + esc((m.map || '').replace('de_', '')) + ' <span class="fm-m">' + esc(m.score || '') + '</span></span>' +
          '<span>' + esc(m.kills) + ' / ' + esc(m.deaths) + '</span><span>K/D ' + esc(m.kd) + '</span><span class="fm-m">' + esc(d) + '</span></a>';
      }).join('');
    } catch (e) { box.remove(); }
  }

  function scan() {
    var h = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
    if (h.indexOf('jugador/') === 0) mount(document.querySelector('main') || document.body, h.slice(8));
  }
  var t;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 200); }).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(scan, 900);
})();
