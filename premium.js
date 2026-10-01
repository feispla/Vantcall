// ============================================
// VANTS — Interacciones premium (solo presentación)
// Header con estado de scroll, aparición de secciones,
// foco de luz en tarjetas y contador animado de estadísticas.
// ============================================
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header: sombra y fondo más sólido al hacer scroll
  const header = document.querySelector('.header');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Aparición al entrar en pantalla
  const REVEAL_SELECTOR = [
    '.content-home > .valorant-section',
    '.content-home > .valorant-banner',
    '.content-home > .stats-strip',
    '.pricing-card',
    '.login-method-card',
    '.rank-tile',
    '.dash-card',
    '.section-head',
  ].join(',');

  const io = 'IntersectionObserver' in window && !reduceMotion
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

  function applyReveal(root) {
    if (!io) return;
    const groups = new Map();
    root.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
      if (el.classList.contains('reveal')) return;
      // Escalonado entre hermanos (tarjetas de una misma rejilla)
      const parent = el.parentElement;
      const i = groups.get(parent) || 0;
      groups.set(parent, i + 1);
      el.style.setProperty('--reveal-delay', Math.min(i, 7) * 60 + 'ms');
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  // Contador animado para las cifras de la home
  function animateCounts(root) {
    if (reduceMotion) return;
    root.querySelectorAll('.stat-num').forEach((el) => {
      if (el.dataset.counted) return;
      const target = parseInt(el.textContent.replace(/\D/g, ''), 10);
      el.dataset.counted = '1';
      if (!target || target > 100000) return;
      const start = performance.now();
      const dur = 1100;
      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    });
  }

  // Foco de luz que sigue al cursor dentro de las tarjetas
  const SPOT = '.pricing-card, .login-method-card, .dash-card, .player-card';
  document.addEventListener('pointermove', (ev) => {
    const card = ev.target.closest && ev.target.closest(SPOT);
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((ev.clientX - r.left) / r.width) * 100 + '%');
    card.style.setProperty('--my', ((ev.clientY - r.top) / r.height) * 100 + '%');
  }, { passive: true });

  // app.js re-renderiza #main en cada ruta y en cada carga de datos
  const main = document.getElementById('main');
  if (!main) return;
  let scheduled = false;
  const refresh = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; applyReveal(main); animateCounts(main); });
  };
  new MutationObserver(refresh).observe(main, { childList: true, subtree: true });
  refresh();
})();
