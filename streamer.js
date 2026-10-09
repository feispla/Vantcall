// ============================================
// VANTCALL — Módulo Streamer (perfil de streamer, editar foto, solicitudes de amigo)
// Se carga desde auth0-config.js y se usa en la página de cuenta
// ============================================

(function () {
  'use strict';

  const DB = window.VantDB;

  // ---------- Streamer: perfil público de streamer ----------
  async function getStreamerProfile(playerId) {
    const { data } = await DB.from('players').select('id, username, display_name, avatar_url, main_game, verified, created_at').eq('id', playerId).maybeSingle();
    if (!data) return null;
    const [kick, steam, discord] = await Promise.all([
      DB.from('user_game_accounts').select('handle, display_name, avatar_url, profile_url, verified').eq('user_id', data.id).eq('game', 'kick').maybeSingle(),
      DB.from('user_game_accounts').select('handle, display_name, avatar_url, profile_url, verified').eq('user_id', data.id).eq('game', 'steam').maybeSingle(),
      DB.from('player_discord_accounts').select('discord_username, avatar_url').eq('player_id', data.id).maybeSingle(),
    ]);
    return { ...data, kick: kick.data || null, steam: steam.data || null, discord: discord.data || null };
  }

  function renderStreamerCard(profile) {
    if (!profile) return '<p class="login-note">Perfil no encontrado.</p>';
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const hasKick = profile.kick && profile.kick.handle;
    const hasSteam = profile.steam && profile.steam.handle;
    const hasDiscord = profile.discord && profile.discord.discord_username;

    return `
      <div class="streamer-card">
        <div class="streamer-head">
          <div class="streamer-avatar">${profile.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : esc((profile.display_name || profile.username || '?').slice(0, 2).toUpperCase())}</div>
          <div class="streamer-info">
            <h2>${esc(profile.display_name || profile.username)}</h2>
            <p class="streamer-sub">@${esc(profile.username)}${profile.main_game ? ' · ' + esc(profile.main_game) : ''}${profile.verified ? ' <span class="verified-badge">VERIFICADO</span>' : ''}</p>
          </div>
        </div>
        <div class="streamer-links">
          ${hasKick ? `<a href="https://kick.com/${esc(profile.kick.handle)}" target="_blank" rel="noopener noreferrer" class="streamer-link streamer-kick">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            <span>Kick</span><strong>${esc(profile.kick.display_name || profile.kick.handle)}</strong></a>` : ''}
          ${hasSteam ? `<a href="${esc(profile.steam.profile_url || '#')}" target="_blank" rel="noopener noreferrer" class="streamer-link streamer-steam">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.98 0C5.67 0 .5 4.86.02 11.04l6.43 2.66a3.38 3.38 0 0 1 1.92-.6l.19.01 2.86-4.15v-.06a4.52 4.52 0 1 1 4.52 4.52h-.1l-4.08 2.91v.16a3.39 3.39 0 0 1-6.72.63L.4 15.5A12 12 0 1 0 11.98 0z"/></svg>
            <span>Steam</span><strong>${esc(profile.steam.display_name || profile.steam.handle)}</strong></a>` : ''}
          ${hasDiscord ? `<div class="streamer-link streamer-discord">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.93-1.51 13.8 13.8 0 0 0-.64 1.28 18.3 18.3 0 0 0-5.5 0 13.8 13.8 0 0 0-.64-1.28c-1.71.29-3.37.8-4.93 1.51A20.3 20.3 0 0 0 .1 18.06a19.9 19.9 0 0 0 6.07 3.03c.49-.67.93-1.38 1.3-2.13a12.9 12.9 0 0 1-2.05-.98c.17-.12.34-.25.5-.38a14.2 14.2 0 0 0 12.16 0c.16.13.33.26.5.38-.65.39-1.34.72-2.05.98.37.75.81 1.46 1.3 2.13a19.9 19.9 0 0 0 6.07-3.03 20.3 20.3 0 0 0-3.58-13.69zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42 2.18 1.09 2.16 2.42c0 1.34-.95 2.42-2.16 2.42zm7.96 0c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42 2.18 1.09 2.16 2.42c0 1.34-.95 2.42-2.16 2.42z"/></svg>
            <span>Discord</span><strong>${esc(profile.discord.discord_username)}</strong></div>` : ''}
        </div>
        ${!hasKick && !hasSteam && !hasDiscord ? '<p class="login-note">Vincula tu Kick, Steam o Discord desde tu cuenta para mostrar tu perfil de streamer.</p>' : ''}
      </div>
    `;
  }

  // ---------- Editar foto de perfil ----------
  async function updateAvatar(playerId, avatarUrl) {
    const { error } = await DB.from('players').update({ avatar_url: avatarUrl }).eq('id', playerId);
    return { error };
  }

  function renderAvatarEditor(player) {
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return `
      <div class="avatar-editor">
        <h3>Foto de perfil</h3>
        <div class="avatar-preview">
          <div class="avatar-current">${player.avatar_url ? `<img src="${esc(player.avatar_url)}" alt="" id="avatar-preview-img">` : '<span id="avatar-preview-img">?</span>'}</div>
          <div class="avatar-actions">
            <input type="url" id="avatar-url-input" class="login-form-input" placeholder="https://ejemplo.com/mi-foto.jpg" value="${esc(player.avatar_url || '')}">
            <button type="button" class="btn btn-secondary btn-sm" id="avatar-save-btn">Guardar foto</button>
            <p class="login-note">Pega la URL de una imagen (JPG, PNG, WebP). Máximo 2 MB recomendado.</p>
          </div>
        </div>
      </div>
    `;
  }

  function bindAvatarEditor(player, onSave) {
    const btn = document.getElementById('avatar-save-btn');
    const input = document.getElementById('avatar-url-input');
    const preview = document.getElementById('avatar-preview-img');
    if (!btn || !input) return;

    input.addEventListener('input', () => {
      if (preview && input.value.trim()) {
        if (preview.tagName === 'IMG') preview.src = input.value.trim();
        else preview.textContent = '?';
      }
    });

    btn.addEventListener('click', async () => {
      const url = input.value.trim();
      if (!url) return;
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      const { error } = await updateAvatar(player.id, url);
      btn.disabled = false;
      btn.textContent = error ? 'Error' : 'Guardado';
      if (!error && onSave) onSave(url);
      setTimeout(() => { btn.textContent = 'Guardar foto'; }, 2000);
    });
  }

  // ---------- Solicitud de amigo ----------
  async function sendFriendRequest(fromPlayerId, toUsername) {
    const { data: toPlayer, error: findErr } = await DB.from('players').select('id, username').eq('username', toUsername.toLowerCase().trim()).maybeSingle();
    if (findErr || !toPlayer) return { error: { message: 'Usuario no encontrado' } };
    if (toPlayer.id === fromPlayerId) return { error: { message: 'No puedes agregarte a ti mismo' } };

    const { data: existing } = await DB.from('player_friendships')
      .select('id, status')
      .or(`requester_player_id.eq.${fromPlayerId},addressee_player_id.eq.${fromPlayerId}`)
      .or(`requester_player_id.eq.${toPlayer.id},addressee_player_id.eq.${toPlayer.id}`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') return { error: { message: 'Ya hay una solicitud pendiente' } };
      if (existing.status === 'accepted') return { error: { message: 'Ya sois amigos' } };
    }

    const { error } = await DB.from('player_friendships').insert({
      requester_player_id: fromPlayerId,
      addressee_player_id: toPlayer.id,
      status: 'pending',
    });
    return { error, toPlayer };
  }

  async function getFriends(playerId) {
    const { data } = await DB.from('player_friendships')
      .select('id, status, requester:players!player_friendships_requester_player_id_fkey(id, username, display_name, avatar_url), addressee:players!player_friendships_addressee_player_id_fkey(id, username, display_name, avatar_url)')
      .or(`requester_player_id.eq.${playerId},addressee_player_id.eq.${playerId}`)
      .eq('status', 'accepted');
    return data || [];
  }

  async function getPendingRequests(playerId) {
    const { data } = await DB.from('player_friendships')
      .select('id, status, requester:players!player_friendships_requester_player_id_fkey(id, username, display_name, avatar_url)')
      .eq('addressee_player_id', playerId)
      .eq('status', 'pending');
    return data || [];
  }

  async function acceptFriendRequest(friendshipId) {
    const { error } = await DB.from('player_friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    return { error };
  }

  async function declineFriendRequest(friendshipId) {
    const { error } = await DB.from('player_friendships').update({ status: 'declined' }).eq('id', friendshipId);
    return { error };
  }

  function renderFriendSection(friends, pending, currentPlayerId) {
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return `
      <div class="friends-section">
        <h3>Amigos</h3>
        ${pending.length ? `<div class="friend-pending">
          <h4>Solicitudes pendientes (${pending.length})</h4>
          ${pending.map((f) => `
            <div class="friend-request" data-friendship-id="${f.id}">
              <div class="friend-avatar">${f.requester.avatar_url ? `<img src="${esc(f.requester.avatar_url)}" alt="">` : esc((f.requester.display_name || f.requester.username || '?').slice(0, 2).toUpperCase())}</div>
              <span>@${esc(f.requester.username)}</span>
              <div class="friend-actions">
                <button type="button" class="btn btn-sm btn-primary" data-accept-friend="${f.id}">Aceptar</button>
                <button type="button" class="btn btn-sm btn-secondary" data-decline-friend="${f.id}">Rechazar</button>
              </div>
            </div>
          `).join('')}
        </div>` : ''}
        ${friends.length ? `<div class="friend-list">
          ${friends.map((f) => {
            const friend = f.requester.id === currentPlayerId ? f.addressee : f.requester;
            return `<div class="friend-item">
              <div class="friend-avatar">${friend.avatar_url ? `<img src="${esc(friend.avatar_url)}" alt="">` : esc((friend.display_name || friend.username || '?').slice(0, 2).toUpperCase())}</div>
              <span>@${esc(friend.username)}</span>
              <a href="#/jugador/${encodeURIComponent(friend.username)}" class="link-inline">Ver perfil</a>
            </div>`;
          }).join('')}
        </div>` : '<p class="login-note">Aún no tienes amigos. Busca jugadores y envía solicitudes.</p>'}
        <div class="friend-add">
          <input type="text" id="friend-username-input" class="login-form-input" placeholder="Nombre de usuario">
          <button type="button" class="btn btn-primary btn-sm" id="friend-send-btn">Enviar solicitud</button>
          <p class="login-note" id="friend-msg"></p>
        </div>
      </div>
    `;
  }

  function bindFriendSection(currentPlayerId, onUpdate) {
    const sendBtn = document.getElementById('friend-send-btn');
    const input = document.getElementById('friend-username-input');
    const msg = document.getElementById('friend-msg');

    if (sendBtn && input) {
      sendBtn.addEventListener('click', async () => {
        const username = input.value.trim();
        if (!username) return;
        sendBtn.disabled = true;
        const { error, toPlayer } = await sendFriendRequest(currentPlayerId, username);
        sendBtn.disabled = false;
        if (error) {
          if (msg) { msg.textContent = error.message || 'Error al enviar'; msg.className = 'login-note auth-msg-error'; }
        } else {
          if (msg) { msg.textContent = 'Solicitud enviada a @' + toPlayer.username; msg.className = 'login-note auth-msg-success'; }
          input.value = '';
          if (onUpdate) onUpdate();
        }
      });
    }

    document.querySelectorAll('[data-accept-friend]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        await acceptFriendRequest(btn.dataset.acceptFriend);
        if (onUpdate) onUpdate();
      });
    });

    document.querySelectorAll('[data-decline-friend]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        await declineFriendRequest(btn.dataset.declineFriend);
        if (onUpdate) onUpdate();
      });
    });
  }

  // ---------- Exportar ----------
  window.VantStreamer = {
    getStreamerProfile,
    renderStreamerCard,
    renderAvatarEditor,
    bindAvatarEditor,
    sendFriendRequest,
    getFriends,
    getPendingRequests,
    acceptFriendRequest,
    declineFriendRequest,
    renderFriendSection,
    bindFriendSection,
  };
})();
