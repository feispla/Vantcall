// VALORANT — Emblemas de rango (SVG generado)
// 8 rangos de VALORANT (Iron-Radiant) con silueta, metal y ornamento.
// Se usa en la web (sprite inline) y para exportar /assets/ranks/*.svg
// ============================================
(function (root) {
  'use strict';

  // Paleta por rango: luz, medio, sombra, profundo, acento
  const RANK_ART = {
    iron:      { tier: 'I',    hi: '#e3e7eb', mid: '#8b939c', lo: '#3a4048', deep: '#14171b', acc: '#c3c9cf' },
    bronze:    { tier: 'II',   hi: '#ffd4ae', mid: '#c27a3a', lo: '#5a2c10', deep: '#1c0d05', acc: '#f0a868' },
    silver:    { tier: 'III',  hi: '#ffffff', mid: '#c4ccd6', lo: '#5d6774', deep: '#151a21', acc: '#e8eef5' },
    gold:      { tier: 'IV',   hi: '#fff4c2', mid: '#e8b53a', lo: '#7a5108', deep: '#1f1503', acc: '#ffd86b' },
    platinum:  { tier: 'V',    hi: '#d4fff8', mid: '#35cbbd', lo: '#0c5852', deep: '#04201e', acc: '#8ff5ea' },
    diamond:   { tier: 'VI',   hi: '#efe6ff', mid: '#a179ff', lo: '#3a1d8a', deep: '#120830', acc: '#cdb6ff' },
    ascendant: { tier: 'VII',  hi: '#dcffe9', mid: '#3ddc84', lo: '#0d5a33', deep: '#03190e', acc: '#9dffc6' },
    radiant:   { tier: 'VIII', hi: '#ffd9dc', mid: '#ff3b4e', lo: '#6e0714', deep: '#1e0205', acc: '#ffd27a' },
  };
  const ORDER = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ascendant', 'radiant'];

  // Siluetas del cuerpo (viewBox 0 0 120 120)
  const BODY = {
    shield:  'M60 14 L92 26 V60 C92 81 78 95 60 106 C42 95 28 81 28 60 V26 Z',
    notched: 'M60 10 L71 19 L93 23 V60 C93 82 78 96 60 107 C42 96 27 82 27 60 V23 L49 19 Z',
    hex:     'M60 9 L94 28 V70 L60 109 L26 70 V28 Z',
    gem:     'M60 7 L97 44 L60 112 L23 44 Z',
    horned:  'M60 12 L78 20 L99 12 L94 28 V70 L60 109 L26 70 V28 Z',
  };
  const BODY_FOR = ['shield', 'shield', 'notched', 'notched', 'hex', 'gem', 'horned', 'horned'];

  function defs(key, p) {
    const c = RANK_ART[key];
    const top = key === 'radiant';
    return `<defs>
      <linearGradient id="${p}-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.hi}"/><stop offset=".45" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.lo}"/>
      </linearGradient>
      <linearGradient id="${p}-rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${top ? '#fff3c4' : c.hi}"/><stop offset=".5" stop-color="${top ? '#f2b843' : c.mid}"/><stop offset="1" stop-color="${top ? '#8a5a12' : c.lo}"/>
      </linearGradient>
      <radialGradient id="${p}-glow" cx=".5" cy=".45" r=".55">
        <stop offset="0" stop-color="${c.mid}" stop-opacity=".55"/><stop offset="1" stop-color="${c.mid}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${p}-gem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${c.acc}"/>
      </linearGradient>
    </defs>`;
  }

  function svg(key, size, id) {
    const c = RANK_ART[key];
    const idx = ORDER.indexOf(key);
    const chevrons = Math.min(3, (idx % 3) + 1);
    const wings = idx >= 3;
    const gem = idx >= 5;
    const crown = idx >= 6;
    const halo = idx === 7;
    let chev = '';
    for (let i = 0; i < chevrons; i++) {
      const y = 40 + i * 7 - (chevrons - 1) * 3.5;
      chev += `<path d="M39 ${y} H52 L60 59 L68 43 H81 L60 82 Z" fill="url(#${id}-gem)" opacity=".9"/>`;
    }
    const crownSvg = crown ? `<path d="M22 8 L26 2 L29 6 L32 0 L35 6 L38 2 L42 8 Z" fill="url(#${id}-gem)"/>` : '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
      ${defs(key, id)}
      ${halo ? `<circle cx="60" cy="60" r="58" fill="url(#${id}-glow)"/>` : ''}
      ${wings ? `<path d="M14 24 L2 20 L7 30 L3 36 L13 36 Z" fill="url(#${id}-metal)" opacity=".85"/><path d="M106 24 L118 20 L113 30 L117 36 L107 36 Z" fill="url(#${id}-metal)" opacity=".85"/>` : ''}
      <path d="${BODY[BODY_FOR[idx]]}" fill="url(#${id}-metal)" stroke="url(#${id}-rim)" stroke-width="2"/>
      <path d="M60 10 L46 16.5 L46 33.5 C46 42 40 48.5 60 52.5 C80 48.5 74 42 74 33.5 L74 16.5 Z" fill="none" stroke="${c.hi}" stroke-opacity=".28" stroke-width="1"/>
      ${gem ? `<path d="M60 18 L38 24 L60 32 L26 24 Z" fill="url(#${id}-gem)"/>` : `<path d="M60 17 L35 22 L60 27 L29 22 Z" fill="url(#${id}-gem)" opacity=".9"/>`}
      ${chev}
      ${crownSvg}
    </svg>`;
  }

  function sprite() {
    const defs = ORDER.map((k) => `<symbol id="rank-${k}" viewBox="0 0 120 120">${svg(k, 120, 'r-' + k)}</symbol>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${defs}</svg>`;
  }

  function emblemUse(key, cls) {
    return `<svg class="${cls || ''}" aria-hidden="true"><use href="#rank-${key}"></use></svg>`;
  }

  root.VantsRanks = { RANK_ART, ORDER, svg, sprite, emblemUse };
})(window);