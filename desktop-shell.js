// VANTS Desktop shell — barra de título, sidebar y barra derecha estilo FACEIT.
// Solo se activa dentro de la app de escritorio (Tauri) o con ?desktop=1 para probar en el navegador.
(function () {
  'use strict';
  var params = new URLSearchParams(window.location.search);
  var stored = false;
  try { stored = localStorage.getItem('vantsDesktop') === '1'; } catch (e) {}
  var isDesktop = Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__) || stored || params.get('desktop') === '1';
  // La app de escritorio avisa con este evento al cargar la página (por si este script corrió antes)
  window.addEventListener('vants-desktop', function () { if (!document.querySelector('.vd-titlebar')) start(); });
  if (!isDesktop) return;
  start();

  function start() {

  var root = document.documentElement;
  root.classList.add('vants-desktop');
  root.setAttribute('data-theme', 'dark');

  var I = {
    play: '<path d="M8 5v14l11-7z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    ranked: '<path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5-5-5.7"/>',
    tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    crown: '<path d="M3 18h18l-2-11-5 5-2-7-2 7-5-5z"/>',
    shield: '<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/>',
    discord: '<path d="M8 8c2.5-1 5.5-1 8 0M7.5 16c3 1.5 6 1.5 9 0"/><path d="M6 6c-2 3-3 6-3 10 2 2 4 3 5 3l1-2M18 6c2 3 3 6 3 10-2 2-4 3-5 3l-1-2"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>',
    kick: '<path d="M5 3h5v6l4-6h5l-5 9 5 9h-5l-4-6v6H5z"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
    min: '<path d="M2 6h8"/>',
    max: '<rect x="2" y="2" width="8" height="8"/>',
    close: '<path d="M2 2l8 8M10 2l-8 8"/>'
  };
  function svg(name, vb) {
    return '<svg viewBox="' + (vb || '0 0 24 24') + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[name] + '</svg>';
  }

  var NAV = [
    ['inicio', 'Inicio', 'home'],
    ['calendario', 'Calendario', 'cal'],
    ['ranked', 'Ranked', 'ranked'],
    ['torneos', 'Torneos', 'trophy'],
    ['jugadores', 'Jugadores', 'users'],
    ['precios', 'Precios', 'tag'],
    ['zona', 'Zona VIP', 'crown']
  ];

  function build() {
    if (document.querySelector('.vd-titlebar')) return;

    var tb = document.createElement('div');
    tb.className = 'vd-titlebar';
    tb.setAttribute('data-tauri-drag-region', '');
    tb.innerHTML =
      '<div class="vd-titlebar-brand"><img src="./assets/brand/vants-mark.svg" alt="">VANTS</div>' +
      '<div class="vd-titlebar-drag" data-tauri-drag-region></div>' +
      '<div class="vd-winbtns">' +
      '<button class="vd-winbtn" data-win="min" aria-label="Minimizar">' + svg('min', '0 0 12 12') + '</button>' +
      '<button class="vd-winbtn" data-win="max" aria-label="Maximizar">' + svg('max', '0 0 12 12') + '</button>' +
      '<button class="vd-winbtn vd-close" data-win="close" aria-label="Cerrar">' + svg('close', '0 0 12 12') + '</button>' +
      '</div>';

    var sb = document.createElement('aside');
    sb.className = 'vd-sidebar';
    sb.setAttribute('aria-label', 'Navegación');
    sb.innerHTML =
      '<a href="#/inicio" class="vd-logo"><img src="./assets/brand/vants-mark.svg" alt=""><span>VANTS</span></a>' +
      '<a href="#/ranked" class="vd-play">' + svg('play') + '<span>Jugar</span></a>' +
      '<div class="vd-section">Competir</div>' +
      NAV.map(function (n) {
        return '<a href="#/' + n[0] + '" class="vd-link" data-page="' + n[0] + '">' + svg(n[2]) + '<span>' + n[1] + '</span></a>';
      }).join('') +
      '<a href="#/admin" class="vd-link" data-page="admin" data-vd-admin hidden>' + svg('shield') + '<span>Admin</span></a>' +
      '<div class="vd-spacer"></div>' +
      '<a href="#/login" class="vd-account" data-vd-account><span class="vd-avatar">V</span><div><span data-vd-name>Iniciar sesión</span><small data-vd-sub>Entra para jugar</small></div></a>';

    var rail = document.createElement('aside');
    rail.className = 'vd-rail';
    rail.setAttribute('aria-label', 'Comunidad');
    rail.innerHTML =
      '<a href="https://discord.gg/rCHE7jvRS4" target="_blank" rel="noopener" title="Discord">' + svg('discord') + '</a>' +
      '<a href="https://kick.com/feispla" target="_blank" rel="noopener" title="Kick">' + svg('kick') + '</a>' +
      '<a href="https://x.com/feispla" target="_blank" rel="noopener" title="X">' + svg('x') + '</a>' +
      '<div class="vd-rail-sep"></div>' +
      '<a href="#/cuenta" title="Mi cuenta">' + svg('users') + '</a>';

    document.body.prepend(rail);
    document.body.prepend(sb);
    document.body.prepend(tb);

    tb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-win]');
      if (!b) return;
      var T = window.__TAURI__;
      if (!T || !T.window) return;
      var w = T.window.getCurrentWindow();
      var a = b.getAttribute('data-win');
      if (a === 'min') w.minimize();
      else if (a === 'max') w.toggleMaximize();
      else if (a === 'close') w.close();
    });
    // Sin API de Tauri (vista previa en navegador) ocultamos los botones de ventana
    if (!(window.__TAURI__ && window.__TAURI__.window)) {
      tb.querySelector('.vd-winbtns').style.visibility = 'hidden';
    }

    syncActive();
    syncAccount();
    watchAccount();
  }

  function syncActive() {
    var page = (window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]) || 'inicio';
    document.querySelectorAll('.vd-link').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-page') === page);
    });
  }

  function syncAccount() {
    var link = document.getElementById('auth-link');
    var label = document.getElementById('auth-link-label');
    var acc = document.querySelector('[data-vd-account]');
    if (!acc) return;
    var href = link ? link.getAttribute('href') : '#/login';
    var logged = href === '#/cuenta';
    var name = label ? label.textContent.trim() : '';
    acc.setAttribute('href', href || '#/login');
    acc.querySelector('[data-vd-name]').textContent = logged ? (name || 'Mi cuenta') : 'Iniciar sesión';
    acc.querySelector('[data-vd-sub]').textContent = logged ? 'Ver perfil' : 'Entra para jugar';
    acc.querySelector('.vd-avatar').textContent = logged && name ? name.charAt(0).toUpperCase() : 'V';
    var admin = document.getElementById('admin-link');
    var vdAdmin = document.querySelector('[data-vd-admin]');
    if (vdAdmin) vdAdmin.hidden = !admin || admin.hidden;
  }

  function watchAccount() {
    var header = document.querySelector('.header-right');
    if (!header || !window.MutationObserver) return;
    new MutationObserver(syncAccount).observe(header, { subtree: true, childList: true, characterData: true, attributes: true });
  }

  window.addEventListener('hashchange', function () { syncActive(); syncAccount(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  }
})();
