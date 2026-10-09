// ============================================
// VANTCALL — Módulo de Redes Sociales
// Muestra y gestiona las redes vinculadas: Discord, Steam, Kick, Google, GitHub, Twitch, Spotify
// ============================================

const SOCIAL_PROVIDERS = [
  { id: 'discord', name: 'Discord', icon: 'discord', color: '#5865F2', description: 'Conecta tu cuenta de Discord para el bot y notificaciones' },
  { id: 'steam', name: 'Steam', icon: 'steam', color: '#1b2838', description: 'Vincula tu Steam para ver tu actividad de juego' },
  { id: 'kick', name: 'Kick', icon: 'kick', color: '#53FC18', description: 'Conecta tu canal de Kick para los directos' },
  { id: 'google', name: 'Google', icon: 'google', color: '#4285F4', description: 'Inicia sesión con tu cuenta de Google' },
  { id: 'github', name: 'GitHub', icon: 'github', color: '#333', description: 'Conecta tu GitHub para el código' },
  { id: 'twitch', name: 'Twitch', icon: 'twitch', color: '#9146FF', description: 'Conecta tu canal de Twitch' },
  { id: 'spotify', name: 'Spotify', icon: 'spotify', color: '#1DB954', description: 'Escucha música mientras compites' },
];

function getSocialIcon(providerId, size = 24) {
  const icons = {
    discord: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.93-1.51 13.8 13.8 0 0 0-.64 1.28 18.3 18.3 0 0 0-5.5 0 13.8 13.8 0 0 0-.64-1.28c-1.71.29-3.37.8-4.93 1.51A20.3 20.3 0 0 0 .1 18.06a19.9 19.9 0 0 0 6.07 3.03c.49-.67.93-1.38 1.3-2.13a12.9 12.9 0 0 1-2.05-.98c.17-.12.34-.25.5-.38a14.2 14.2 0 0 0 12.16 0c.16.13.33.26.5.38-.65.39-1.34.72-2.05.98.37.75.81 1.46 1.3 2.13a19.9 19.9 0 0 0 6.07-3.03 20.3 20.3 0 0 0-3.58-13.69zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42 2.18 1.09 2.16 2.42c0 1.34-.95 2.42-2.16 2.42zm7.96 0c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42 2.18 1.09 2.16 2.42c0 1.34-.95 2.42-2.16 2.42z"/></svg>`,
    steam: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M11.98 0C5.67 0 .5 4.86.02 11.04l6.43 2.66a3.38 3.38 0 0 1 1.92-.6l.19.01 2.86-4.15v-.06a4.52 4.52 0 1 1 4.52 4.52h-.1l-4.08 2.91v.16a3.39 3.39 0 0 1-6.72.63L.4 15.5A12 12 0 1 0 11.98 0z"/></svg>`,
    kick: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
    google: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.5 5.5 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z"/></svg>`,
    github: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.76 2.62 3.85 1.87.1-.72.4-1.22.7-1.5-2.48-.28-5.09-1.25-5.09-5.54 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.07-1.15 3.07-1.15.61 1.54.23 2.68.12 2.96.72.78 1.14 1.78 1.14 3.01 0 4.3-2.62 5.25-5.11 5.53.4.35.75 1.03.75 2.08v3.12c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"/></svg>`,
    twitch: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2 2 6v14h5v3h3l3-3h4l5-5V2H4Zm16 12-3 3h-5l-3 3v-3H5V4h15v10ZM11 7h2v6h-2V7Zm5 0h2v6h-2V7Z"/></svg>`,
    spotify: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1.03.25c-2.82-1.72-6.38-2.1-10.56-1.15a.75.75 0 1 1-.33-1.46c4.58-1.04 8.52-.59 11.67 1.33.35.21.46.67.25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.99-8.15-2.57-11.97-1.41a.94.94 0 1 1-.55-1.8c4.36-1.32 9.78-.68 13.5 1.61.44.27.58.85.31 1.29Zm.13-3.4C15.23 8.3 8.82 8.1 5.1 9.23a1.13 1.13 0 0 1-.66-2.16c4.27-1.3 11.37-1.05 15.86 1.62a1.13 1.13 0 1 1-1.2 1.94Z"/></svg>`,
  };
  return icons[providerId] || `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`;
}

function renderSocialCard(provider, linkedData, onLink, onUnlink) {
  const isLinked = Boolean(linkedData);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return `
    <div class="social-card ${isLinked ? 'social-linked' : ''}" style="border:1px solid ${isLinked ? provider.color : '#333'};border-radius:12px;padding:16px;background:${isLinked ? 'rgba(' + hexToRgb(provider.color) + ',0.08)' : '#1a1a1a'};transition:all 0.2s;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:40px;height:40px;border-radius:8px;background:${provider.color};display:flex;align-items:center;justify-content:center;color:#fff;">
          ${getSocialIcon(provider.id, 20)}
        </div>
        <div style="flex:1;">
          <h4 style="margin:0;color:#fff;">${provider.name}</h4>
          <p style="margin:4px 0 0;font-size:12px;color:#888;">${provider.description}</p>
        </div>
        <div style="font-size:12px;font-weight:700;color:${isLinked ? '#3ddc84' : '#888'};">
          ${isLinked ? 'VINCULADO' : 'NO VINCULADO'}
        </div>
      </div>
      ${isLinked ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px;background:#111;border-radius:8px;">
          ${linkedData.avatar_url ? `<img src="${esc(linkedData.avatar_url)}" alt="" width="24" height="24" style="border-radius:50%;">` : ''}
          <span style="font-size:14px;color:#fff;">${esc(linkedData.display_name || linkedData.username || linkedData.handle || 'Cuenta vinculada')}</span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-unlink-social="${provider.id}">Desvincular</button>
      ` : `
        <button type="button" class="btn btn-primary btn-sm" data-link-social="${provider.id}">Vincular ${provider.name}</button>
      `}
    </div>`;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function renderSocialsSection(socialsData, onLink, onUnlink) {
  return `
    <div class="socials-section">
      <h3>Redes sociales</h3>
      <p class="login-note">Vincula tus redes para personalizar tu perfil, recibir notificaciones y mostrar tu actividad.</p>
      <div class="socials-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:16px;">
        ${SOCIAL_PROVIDERS.map((p) => renderSocialCard(p, socialsData[p.id], onLink, onUnlink)).join('')}
      </div>
    </div>`;
}

function bindSocialsSection(onLink, onUnlink) {
  document.querySelectorAll('[data-link-social]').forEach((btn) => {
    btn.addEventListener('click', () => onLink(btn.dataset.linkSocial));
  });
  document.querySelectorAll('[data-unlink-social]').forEach((btn) => {
    btn.addEventListener('click', () => onUnlink(btn.dataset.unlinkSocial));
  });
}

// ---------- Exportar ----------
window.VantSocials = {
  SOCIAL_PROVIDERS,
  getSocialIcon,
  renderSocialCard,
  renderSocialsSection,
  bindSocialsSection,
};
