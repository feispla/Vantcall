// ============================================
// VANTS — Emblemas de rango premium (SVG generado)
// 8 niveles con silueta, metal y ornamento propios.
// Se usa en la web (sprite inline) y para exportar /assets/ranks/*.svg
// ============================================
(function (root) {
  'use strict';

  // Paleta por rango: luz, medio, sombra, profundo, acento
  const RANK_ART = {
    hierro:    { tier: 'I',    hi: '#e3e7eb', mid: '#8b939c', lo: '#3a4048', deep: '#14171b', acc: '#c3c9cf' },
    bronce:    { tier: 'II',   hi: '#ffd4ae', mid: '#c27a3a', lo: '#5a2c10', deep: '#1c0d05', acc: '#f0a868' },
    plata:     { tier: 'III',  hi: '#ffffff', mid: '#c4ccd6', lo: '#5d6774', deep: '#151a21', acc: '#e8eef5' },
    oro:       { tier: 'IV',   hi: '#fff4c2', mid: '#e8b53a', lo: '#7a5108', deep: '#1f1503', acc: '#ffd86b' },
    platino:   { tier: 'V',    hi: '#d4fff8', mid: '#35cbbd', lo: '#0c5852', deep: '#04201e', acc: '#8ff5ea' },
    diamante:  { tier: 'VI',   hi: '#efe6ff', mid: '#a179ff', lo: '#3a1d8a', deep: '#120830', acc: '#cdb6ff' },
    titan:     { tier: 'VII',  hi: '#dcffe9', mid: '#3ddc84', lo: '#0d5a33', deep: '#03190e', acc: '#9dffc6' },
    escarlata: { tier: 'VIII', hi: '#ffd9dc', mid: '#ff3b4e', lo: '#6e0714', deep: '#1e0205', acc: '#ffd27a' },
  };
  const ORDER = ['hierro', 'bronce', 'plata', 'oro', 'platino', 'diamante', 'titan', 'escarlata'];

  // Siluetas del cuerpo (viewBox 0 0 120 120)
  const BODY = {
    shield:  'M60 14 L92 26 V60 C92 81 78 95 60 106 C42 95 28 81 28 60 V26 Z',
    notched: 'M60 10 L71 19 L93 23 V60 C93 82 78 96 60 107 C42 96 27 82 27 60 V23 L49 19 Z',
    hex:     'M60 9 L94 28 V70 L60 109 L26 70 V28 Z',
    gem:     'M60 7 L97 44 L60 112 L23 44 Z',
    horned:  'M60 12 L78 20 L99 12 L94 40 V62 C94 84 78 98 60 110 C42 98 26 84 26 62 V40 L21 12 L42 20 Z',
  };
  const BODY_FOR = ['shield', 'shield', 'notched', 'notched', 'hex', 'gem', 'horned', 'horned'];

  // Chevron central (la V de VANTS)
  const CHEVRON = 'M39 43 H52 L60 59 L68 43 H81 L60 82 Z';

  function wings(level, p) {
    if (level < 1) return '';
    const n = Math.min(level, 4);
    let left = '';
    for (let k = n - 1; k >= 0; k--) {
      const y = 34 + k * 11;
      const tipX = 4 + k * 5 + (4 - n) * 4;
      const tipY = 24 + k * 15;
      left += `<path d="M36 ${y} L${tipX} ${tipY} Q${tipX + 6} ${tipY + 14} ${tipX + 20} ${tipY + 17} L36 ${y + 15} Z" fill="url(#${p}-wing)" stroke="url(#${p}-rim)" stroke-width="1.3" stroke-linejoin="round"/>`;
      left += `<path d="M36 ${y + 3} L${tipX + 4} ${tipY + 2}" stroke="url(#${p}-hi)" stroke-width="1" opacity=".6"/>`;
    }
    return `<g>${left}</g><g transform="translate(120 0) scale(-1 1)">${left}</g>`;
  }

  function crown(p, big) {
    const d = big
      ? 'M36 26 L40 4 L50 15 L60 -2 L70 15 L80 4 L84 26 Z'
      : 'M41 24 L45 9 L53 17 L60 6 L67 17 L75 9 L79 24 Z';
    return `<path d="${d}" fill="url(#${p}-${big ? 'gold' : 'metal'})" stroke="url(#${p}-dark)" stroke-width="1.4" stroke-linejoin="round"/>
      <circle cx="60" cy="${big ? 6 : 12}" r="${big ? 3.2 : 2.4}" fill="url(#${p}-acc)"/>`;
  }

  function rays(p) {
    let r = '';
    for (let i = 0; i < 16; i++) {
      const a = (i * 22.5);
      const len = i % 2 ? 50 : 60;
      r += `<path d="M60 60 L58 ${60 - len} L62 ${60 - len} Z" transform="rotate(${a} 60 60)"/>`;
    }
    return `<g fill="url(#${p}-ray)" opacity=".9">${r}</g>`;
  }

  function flames(p) {
    // Llamas laterales de Escarlata
    const f = 'M34 104 C14 94 4 72 10 48 C14 62 20 70 27 72 C19 56 21 38 33 22 C33 42 38 54 46 62 Z';
    const g = 'M38 100 C24 92 18 76 22 62 C26 72 31 76 36 77 C31 66 33 54 40 46 C41 60 44 68 50 72 Z';
    const pair = (d, fill) => `<path d="${d}" fill="${fill}"/><path d="${d}" fill="${fill}" transform="translate(120 0) scale(-1 1)"/>`;
    return `<g stroke="url(#${p}-dark)" stroke-width="1" stroke-linejoin="round">${pair(f, `url(#${p}-flame)`)}${pair(g, `url(#${p}-gold)`)}</g>`;
  }

  function facets(kind, p) {
    if (kind === 'gem') {
      return `<g stroke="url(#${p}-hi)" stroke-width=".9" fill="none" opacity=".55">
        <path d="M23 44 H97"/><path d="M42 25 L50 44 L60 112 L70 44 L78 25"/><path d="M60 7 L50 44 M60 7 L70 44"/></g>`;
    }
    if (kind === 'hex') {
      return `<g stroke="url(#${p}-hi)" stroke-width=".9" fill="none" opacity=".45">
        <path d="M60 9 V30 M26 28 L44 38 M94 28 L76 38 M26 70 L44 62 M94 70 L76 62 M60 109 V88"/></g>`;
    }
    return '';
  }

  function defs(key, p) {
    const c = RANK_ART[key];
    const top = key === 'escarlata';
    return `<defs>
      <linearGradient id="${p}-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.hi}"/><stop offset=".45" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.lo}"/>
      </linearGradient>
      <linearGradient id="${p}-rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${top ? '#fff3c4' : c.hi}"/><stop offset=".5" stop-color="${top ? '#f2b843' : c.mid}"/><stop offset="1" stop-color="${top ? '#8a5a12' : c.lo}"/>
      </linearGradient>
      <linearGradient id="${p}-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.lo}"/><stop offset="1" stop-color="${c.deep}"/>
      </linearGradient>
      <radialGradient id="${p}-face" cx=".5" cy=".3" r=".8">
        <stop offset="0" stop-color="${c.lo}"/><stop offset=".7" stop-color="${c.deep}"/><stop offset="1" stop-color="#050608"/>
      </radialGradient>
      <linearGradient id="${p}-wing" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.lo}"/>
      </linearGradient>
      <linearGradient id="${p}-hi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.hi}"/><stop offset="1" stop-color="${c.hi}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${p}-acc" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${c.acc}"/>
      </linearGradient>
      <linearGradient id="${p}-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="${p}-ray" cx=".5" cy=".5" r=".5">
        <stop offset=".2" stop-color="${c.acc}" stop-opacity=".9"/><stop offset="1" stop-color="${c.mid}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${p}-flame" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="${c.lo}"/><stop offset=".5" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.acc}"/>
      </linearGradient>
      <linearGradient id="${p}-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#f2b843"/><stop offset="1" stop-color="#7a4a06"/>
      </linearGradient>
      <radialGradient id="${p}-halo" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="${c.mid}" stop-opacity=".55"/><stop offset="1" stop-color="${c.mid}" stop-opacity="0"/>
      </radialGradient>
    </defs>`;
  }

  // Devuelve el contenido interior (sin <svg>) de un emblema
  function emblemInner(key, p) {
    const i = ORDER.indexOf(key);
    const kind = BODY_FOR[i];
    const body = BODY[kind];
    const scaled = i >= 6; // deja sitio para la corona
    const inner = `translate(60 ${scaled ? 64 : 60}) scale(${scaled ? 0.86 : 1}) translate(-60 -60)`;
    const face = `translate(60 60) scale(.8) translate(-60 -60)`;

    let out = defs(key, p);
    if (i >= 5) out += `<circle cx="60" cy="60" r="58" fill="url(#${p}-halo)"/>`;
    if (i === 7) out += rays(p);
    if (i === 7) out += flames(p);
    out += wings([0, 1, 2, 2, 3, 4, 4, 4][i], p);
    out += `<g transform="${inner}">`;
    // Sombra de profundidad
    out += `<path d="${body}" transform="translate(0 3)" fill="#000" opacity=".45"/>`;
    // Aro metálico + cara interior
    out += `<path d="${body}" fill="url(#${p}-rim)" stroke="url(#${p}-dark)" stroke-width="1.5" stroke-linejoin="round"/>`;
    out += `<path d="${body}" transform="${face}" fill="url(#${p}-face)" stroke="url(#${p}-hi)" stroke-width="1.2" stroke-linejoin="round"/>`;
    out += facets(kind, p);
    // Chevron
    out += `<path d="${CHEVRON}" fill="url(#${p}-metal)" stroke="url(#${p}-dark)" stroke-width="1.2" stroke-linejoin="round"/>`;
    out += `<path d="M39 43 H52 L60 59 L57 59 Z" fill="#fff" opacity=".35"/>`;
    // Pips de división por nivel (1 a 4)
    const pips = Math.min(4, Math.floor(i / 2) + 1);
    for (let k = 0; k < pips; k++) {
      const x = 60 + (k - (pips - 1) / 2) * 8;
      out += `<path d="M${x} 87 l3 3 l-3 3 l-3 -3 Z" fill="url(#${p}-acc)"/>`;
    }
    // Gema superior desde Oro
    if (i >= 3 && i < 6) out += `<path d="M60 ${kind === 'gem' ? 14 : 16} l5 6 l-5 6 l-5 -6 Z" fill="url(#${p}-acc)" stroke="url(#${p}-dark)" stroke-width=".8"/>`;
    // Brillo especular
    out += `<path d="${body}" fill="url(#${p}-sheen)" opacity=".5"/>`;
    out += `</g>`;
    if (i >= 6) out += crown(p, i === 7);
    return out;
  }

  let uid = 0;
  function emblemSVG(key, opts) {
    const o = opts || {};
    const p = `vr-${key}-${o.id || ++uid}`;
    const size = o.size ? ` width="${o.size}" height="${o.size}"` : '';
    const cls = o.className ? ` class="${o.className}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -6 128 128"${size}${cls} role="img" aria-label="Rango ${key}">${emblemInner(key, p)}</svg>`;
  }

  // Sprite reutilizable: cada <use> reaprovecha los mismos gradientes
  function spriteSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">${
      ORDER.map((k) => `<symbol id="rank-${k}" viewBox="-4 -6 128 128">${emblemInner(k, 'vs-' + k)}</symbol>`).join('')
    }</svg>`;
  }
  function emblemUse(key, cls) {
    return `<svg class="${cls || 'rank-svg'}" viewBox="-4 -6 128 128" aria-hidden="true"><use href="#rank-${key}"/></svg>`;
  }

  const api = { RANK_ART, ORDER, emblemSVG, spriteSVG, emblemUse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VantsRanks = api;

  if (typeof document !== 'undefined') {
    const inject = () => {
      if (document.getElementById('vants-rank-sprite')) return;
      const wrap = document.createElement('div');
      wrap.id = 'vants-rank-sprite';
      wrap.innerHTML = spriteSVG();
      document.body.prepend(wrap);
    };
    if (document.body) inject(); else document.addEventListener('DOMContentLoaded', inject);
  }
})(typeof window !== 'undefined' ? window : globalThis);
