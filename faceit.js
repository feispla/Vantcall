// ============================================
// VANTS — Vincular FACEIT (CS2 nivel + ELO)
// Habla con la Neon Function vantsdata (/faceit/*). La clave de FACEIT vive solo en el servidor.
// Añade un bloque en #/cuenta y una insignia en #/jugador/<username>.
// ============================================
(function () {
  'use strict';
  var API = 'https://br-sweet-shape-b42xhogj-vantsdata.compute.c-6.us-east-2.aws.neon.tech/faceit';
  var LEVEL_COLORS = { 1: '#eee', 2: '#1ce400', 3: '#1ce400', 4: '#ffc800', 5: '#ffc800', 6: '#ffc800', 7: '#ffc800', 8: '#ff6309', 9: '#ff6309', 10: '#fe1f00' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function css() {
    if (document.getElementById('faceit-css')) return;
    var st = document.createElement('style');
    st.id = 'faceit-css';
    st.textContent =
      '.faceit-box{border:1px solid rgba(255,85,0,.35);background:rgba(255,85,0,.06);border-radius:12px;padding:16px;margin:16px 0}' +
      '.faceit-box h2{margin:0 0 10px;font-size:1.05rem;display:flex;align-items:center;gap:8px}' +
      '.faceit-dot{width:10px;height:10px;border-radius:50%;background:#ff5500;display:inline-block}' +
      '.faceit-acc{display:flex;align-items:center;gap:12px;flex-wrap:wrap}' +
      '.faceit-acc img{width:44px;height:44px;border-radius:8px;object-fit:cover}' +
      '.faceit-lvl{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;border-radius:50%;border:3px solid currentColor;font-weight:800;font-size:.95rem}' +
      '.faceit-elo{font-weight:700}.faceit-muted{opacity:.7;font-size:.85rem}' +
      '.faceit-form{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.faceit-form input{flex:1;min-width:180px}' +
      '.faceit-msg{margin-top:8px;font-size:.9rem}.faceit-msg.err{color:#ff6b6b}.faceit-msg.ok{color:#5fd38d}' +
      '.faceit-badge{display:inline-flex;align-items:center;gap:8px;margin-top:10px;padding:6px 10px;border-radius:999px;background:rgba(255,85,0,.1);border:1px solid rgba(255,85,0,.35);text-decoration:none;color:inherit;font-size:.9rem}' +
      '.faceit-badge .faceit-lvl{min-width:24px;height:24px;border-width:2px;font-size:.75rem}';
    document.head.appendChild(st);
  }

  function lvlHtml(level) {
    if (level == null) return '';
    var c = LEVEL_COLORS[level] || '#ff5500';
    return '<span class="faceit-lvl" style="color:' + c + '" title="Nivel FACEIT ' + esc(level) + '">' + esc(level) + '</span>';
  }

  async function token() {
    try { return window.VantDB && window.VantDB.getToken ? await window.VantDB.getToken() : null; } catch (e) { return null; }
  }

  async function call(path, opts) {
    opts = opts || {};
    var headers = {};
    if (opts.auth) {
      var t = await token();
      if (!t) throw new Error('Inicia sesión para vincular FACEIT');
      headers.Authorization = 'Bearer ' + t;
    }
    if (opts.body) headers['Content-Type'] = 'application/json';
    var res = await fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    var data = await res.json().catch(function () { return null; });
    if (!res.ok) throw new Error((data && data.message) || 'Error ' + res.status);
    return data;
  }

  // ---------- Mi cuenta ----------
  function renderAccountBox(box, acc, msg, msgType) {
    var inner;
    if (acc) {
      inner =
        '<div class="faceit-acc">' +
        (acc.avatar ? '<img src="' + esc(acc.avatar) + '" alt="">' : '') +
        lvlHtml(acc.level) +
        '<div><div><a href="' + esc(acc.url) + '" target="_blank" rel="noopener noreferrer"><strong>' + esc(acc.nickname) + '</strong></a></div>' +
        '<div class="faceit-muted">' + (acc.elo != null ? '<span class="faceit-elo">' + esc(acc.elo) + ' ELO</span> · ' : '') + (acc.game ? esc(acc.game.toUpperCase()) : 'Sin CS2') + '</div></div>' +
        '<div style="margin-left:auto;display:flex;gap:8px">' +
        '<button type="button" class="btn btn-secondary btn-sm" data-faceit-refresh>Actualizar</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-faceit-unlink>Desvincular</button></div></div>';
    } else {
      inner =
        '<p class="faceit-muted">Muestra tu nivel y ELO de CS2 en tu perfil. Escribe tu apodo exacto de FACEIT.</p>' +
        '<form class="faceit-form" data-faceit-form><input class="login-form-input" name="nickname" placeholder="Tu apodo en FACEIT" maxlength="32" autocomplete="off" required>' +
        '<button type="submit" class="btn btn-primary btn-sm">Vincular FACEIT</button></form>';
    }
    box.innerHTML = '<h2><span class="faceit-dot"></span>FACEIT</h2>' + inner + (msg ? '<div class="faceit-msg ' + (msgType || '') + '">' + esc(msg) + '</div>' : '');

    var form = box.querySelector('[data-faceit-form]');
    if (form) form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var nick = form.nickname.value.trim();
      if (!nick) return;
      form.querySelector('button').disabled = true;
      try {
        var f = await call('/link', { method: 'POST', auth: true, body: { nickname: nick } });
        renderAccountBox(box, f, 'Cuenta de FACEIT vinculada.', 'ok');
      } catch (err) {
        renderAccountBox(box, null, err.message, 'err');
      }
    });
    var un = box.querySelector('[data-faceit-unlink]');
    if (un) un.addEventListener('click', async function () {
      un.disabled = true;
      try { await call('/unlink', { method: 'POST', auth: true }); renderAccountBox(box, null, 'FACEIT desvinculado.', 'ok'); }
      catch (err) { renderAccountBox(box, acc, err.message, 'err'); }
    });
    var rf = box.querySelector('[data-faceit-refresh]');
    if (rf) rf.addEventListener('click', async function () {
      rf.disabled = true;
      try { var f = await call('/link', { method: 'POST', auth: true, body: { nickname: acc.nickname } }); renderAccountBox(box, f, 'Datos actualizados.', 'ok'); }
      catch (err) { renderAccountBox(box, acc, err.message, 'err'); }
    });
  }

  async function mountAccount(root) {
    if (root.querySelector('[data-faceit-box]')) return;
    var grid = root.querySelector('.account-grid');
    if (!grid) return;
    var box = document.createElement('div');
    box.className = 'faceit-box';
    box.setAttribute('data-faceit-box', '');
    box.innerHTML = '<h2><span class="faceit-dot"></span>FACEIT</h2><p class="faceit-muted">Cargando…</p>';
    grid.insertAdjacentElement('afterend', box);
    try { renderAccountBox(box, await call('/me', { auth: true })); }
    catch (err) { renderAccountBox(box, null, /sesi/i.test(err.message) ? '' : err.message, 'err'); }
  }

  // ---------- Perfil público ----------
  async function mountPlayer(main, username) {
    var head = main.querySelector('.profile-head');
    if (!head || head.querySelector('[data-faceit-badge]')) return;
    head.setAttribute('data-faceit-pending', '1');
    try {
      var acc = await call('/player?username=' + encodeURIComponent(username));
      if (!acc || head.querySelector('[data-faceit-badge]')) return;
      var target = head.querySelector('div:last-child') || head;
      var a = document.createElement('a');
      a.className = 'faceit-badge';
      a.setAttribute('data-faceit-badge', '');
      a.href = acc.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.innerHTML = lvlHtml(acc.level) + '<span><strong>FACEIT</strong> ' + esc(acc.nickname) + (acc.elo != null ? ' · ' + esc(acc.elo) + ' ELO' : '') + '</span>';
      target.appendChild(a);
    } catch (e) { /* silencioso */ }
  }

  // ---------- Observador ----------
  function scan() {
    var hash = decodeURIComponent((window.location.hash || '').replace(/^#\/?/, ''));
    var main = document.querySelector('main') || document.body;
    if (hash === 'cuenta') {
      var grid0 = main.querySelector('.account-grid');
      var root = main.querySelector('[data-account]') || (grid0 && grid0.parentElement);
      if (root && root.querySelector('.account-grid')) mountAccount(root);
    } else if (hash.indexOf('jugador/') === 0) {
      var head = main.querySelector('.profile-head');
      if (head && !head.getAttribute('data-faceit-pending')) mountPlayer(main, hash.slice(8));
    }
  }

  css();
  var t = null;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 150); }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', function () { setTimeout(scan, 300); });
  setTimeout(scan, 800);
  window.VantFaceit = { lookup: function (n) { return call('/lookup?nickname=' + encodeURIComponent(n)); } };
})();
