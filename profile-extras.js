// ============================================
// VANTS — Extras del perfil
// - Foto de perfil desde el ordenador (clic en el avatar)
// - Botones junto a "Ver perfil público": Agregar amigos, FACEIT, Streamer
// - Canal de Kick / Twitch y aviso "EN VIVO" en la cuenta y en el perfil público
// Sin bot: el estado en vivo se consulta directamente a Kick y a Twitch (decapi.me).
// ============================================
(function () {
  'use strict';

  var DB = function () { return window.VantDB; };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var me = function () { return window.VantAuth && window.VantAuth.me; };

  function css() {
    if (document.getElementById('pfx-css')) return;
    var st = document.createElement('style');
    st.id = 'pfx-css';
    st.textContent =
      '.pfx-avatar{position:relative;cursor:pointer}' +
      '.pfx-avatar:hover::after{content:"Cambiar foto";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:700;text-align:center;border-radius:inherit}' +
      '.pfx-avatar.pfx-busy::after{content:"Subiendo…";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);color:#fff;font-size:11px;border-radius:inherit}' +
      '.pfx-live{display:inline-flex;align-items:center;gap:6px;margin-left:10px;padding:2px 10px;border-radius:999px;background:#9146ff;color:#fff;font-size:11px;font-weight:800;letter-spacing:.08em;text-decoration:none;vertical-align:middle}' +
      '.pfx-live::before{content:"";width:7px;height:7px;border-radius:50%;background:#ff2d3d;animation:pfxPulse 1.2s infinite}' +
      '.pfx-live.kick{background:#53fc18;color:#0b0b0b}' +
      '.pfx-avatar-live{box-shadow:0 0 0 3px #ff2d3d}' +
      '@keyframes pfxPulse{0%,100%{opacity:1}50%{opacity:.3}}' +
      '.pfx-links{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:4px}' +
      '.pfx-links button{background:none;border:0;padding:0;color:var(--color-primary);font:inherit;font-size:var(--text-sm);cursor:pointer;text-decoration:underline}' +
      '.pfx-links button.on{font-weight:800}' +
      '.pfx-panel{border:1px solid var(--color-border);background:var(--color-surface);border-radius:12px;padding:16px;margin:0 0 16px}' +
      '.pfx-panel[hidden]{display:none}' +
      '.pfx-panel h3{margin:0 0 10px;font-size:1rem}.pfx-panel h4{margin:12px 0 4px;font-size:.9rem}' +
      '.pfx-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}.pfx-row input{flex:1;min-width:180px}' +
      '.pfx-list{display:grid;gap:8px;margin:8px 0}' +
      '.pfx-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--color-divider);border-radius:8px}' +
      '.pfx-item .player-avatar{width:32px;height:32px}' +
      '.pfx-item .pfx-actions{margin-left:auto;display:flex;gap:6px;align-items:center}' +
      '.pfx-msg{font-size:.9rem;margin-top:8px}.pfx-msg.err{color:#ff6b6b}.pfx-msg.ok{color:#5fd38d}' +
      '.pfx-muted{opacity:.7;font-size:.85rem}';
    document.head.appendChild(st);
  }

  // ---------- estado en vivo ----------
  var liveCache = {};
  function cleanChannel(v, host) {
    v = String(v || '').trim();
    if (!v) return '';
    v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(new RegExp('^' + host.replace('.', '\\.') + '/', 'i'), '').replace(/^@/, '');
    v = v.split(/[/?#]/)[0];
    return /^[A-Za-z0-9_\-]{2,40}$/.test(v) ? v.toLowerCase() : '';
  }
  async function kickLive(ch) {
    try {
      var r = await fetch('https://kick.com/api/v2/channels/' + encodeURIComponent(ch));
      if (!r.ok) return null;
      var d = await r.json();
      return d && d.livestream && d.livestream.is_live !== false
        ? { platform: 'kick', url: 'https://kick.com/' + ch, title: d.livestream.session_title || '' } : null;
    } catch (e) { return null; }
  }
  async function twitchLive(ch) {
    try {
      var r = await fetch('https://decapi.me/twitch/uptime/' + encodeURIComponent(ch));
      if (!r.ok) return null;
      var t = (await r.text()).trim().toLowerCase();
      if (!t || /offline|error|not found|no user|invalid/.test(t)) return null;
      return { platform: 'twitch', url: 'https://twitch.tv/' + ch, title: '' };
    } catch (e) { return null; }
  }
  async function liveStatus(kick, twitch) {
    var key = (kick || '') + '|' + (twitch || '');
    var c = liveCache[key];
    if (c && Date.now() - c.t < 60000) return c.v;
    var v = null;
    if (kick) v = await kickLive(kick);
    if (!v && twitch) v = await twitchLive(twitch);
    liveCache[key] = { t: Date.now(), v: v };
    return v;
  }
  function liveBadge(v) {
    if (!v) return '';
    return '<a class="pfx-live ' + v.platform + '" data-pfx-live href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(v.title || 'En directo') + '">EN VIVO</a>';
  }
  async function showLive(head, kick, twitch) {
    if (!head) return;
    var h1 = head.querySelector('h1');
    var av = head.querySelector('.player-avatar');
    var old = head.querySelector('[data-pfx-live]');
    if (old) old.remove();
    if (av) av.classList.remove('pfx-avatar-live');
    if (!kick && !twitch) return;
    var v = await liveStatus(kick, twitch);
    if (v && h1 && !head.querySelector('[data-pfx-live]')) {
      h1.insertAdjacentHTML('beforeend', liveBadge(v));
      if (av) av.classList.add('pfx-avatar-live');
    }
  }

  // ---------- foto de perfil desde el ordenador ----------
  function resizeImage(file, size) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(img.width, img.height);
        var cv = document.createElement('canvas');
        cv.width = size; cv.height = size;
        cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Imagen no válida')); };
      img.src = url;
    });
  }
  function bindAvatar(head, player) {
    var av = head.querySelector('.player-avatar');
    if (!av || av.dataset.pfx) return;
    av.dataset.pfx = '1';
    av.classList.add('pfx-avatar');
    av.title = 'Cambiar foto de perfil';
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
    head.appendChild(input);
    av.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', async function () {
      var f = input.files && input.files[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) { alert('La imagen es demasiado grande (máx. 10 MB).'); return; }
      av.classList.add('pfx-busy');
      try {
        var data = await resizeImage(f, 256);
        var r = await DB().from('players').update({ avatar_url: data }).eq('id', player.id);
        if (r.error) throw new Error(r.error.message);
        av.innerHTML = '<img src="' + data + '" alt="">';
        player.avatar_url = data;
        if (DB().invalidate) DB().invalidate();
      } catch (e) {
        alert('No se pudo guardar la foto: ' + e.message);
      } finally {
        av.classList.remove('pfx-busy');
        input.value = '';
      }
    });
  }

  // ---------- amigos ----------
  var FCOLS = 'id,status,requester_player_id,addressee_player_id,' +
    'requester:players!player_friendships_requester_fkey(id,username,display_name,avatar_url),' +
    'addressee:players!player_friendships_addressee_fkey(id,username,display_name,avatar_url)';
  function avatarHtml(p) {
    return '<div class="player-avatar">' + (p && p.avatar_url ? '<img src="' + esc(p.avatar_url) + '" alt="">' : esc(((p && (p.display_name || p.username)) || '?').slice(0, 2).toUpperCase())) + '</div>';
  }
  async function renderFriends(box, pid, msg, kind) {
    box.innerHTML = '<h3>Amigos</h3><p class="pfx-muted">Cargando…</p>';
    var r = await DB().from('player_friendships').select(FCOLS).or('(requester_player_id.eq.' + pid + ',addressee_player_id.eq.' + pid + ')');
    var rows = (r && r.data) || [];
    var pending = rows.filter(function (f) { return f.status === 'pending' && f.addressee_player_id === pid; });
    var sent = rows.filter(function (f) { return f.status === 'pending' && f.requester_player_id === pid; });
    var friends = rows.filter(function (f) { return f.status === 'accepted'; });
    var other = function (f) { return f.requester_player_id === pid ? f.addressee : f.requester; };
    var item = function (p, actions) {
      return '<div class="pfx-item">' + avatarHtml(p) + '<div><strong>' + esc((p && (p.display_name || p.username)) || '?') + '</strong><div class="pfx-muted">@' + esc(p && p.username) + '</div></div><div class="pfx-actions">' + actions + '</div></div>';
    };
    box.innerHTML = '<h3>Amigos</h3>' +
      '<div class="pfx-row"><input class="login-form-input" data-pfx-fuser placeholder="Usuario del jugador (ej. feisplaa)" maxlength="32"><button type="button" class="btn btn-primary btn-sm" data-pfx-fadd>Enviar solicitud</button></div>' +
      (msg ? '<div class="pfx-msg ' + (kind || '') + '">' + esc(msg) + '</div>' : '') +
      (r && r.error ? '<div class="pfx-msg err">' + esc(r.error.message) + '</div>' : '') +
      (pending.length ? '<h4>Solicitudes recibidas</h4><div class="pfx-list">' + pending.map(function (f) { return item(f.requester, '<button type="button" class="btn btn-primary btn-sm" data-pfx-accept="' + f.id + '">Aceptar</button><button type="button" class="btn btn-secondary btn-sm" data-pfx-del="' + f.id + '">Rechazar</button>'); }).join('') + '</div>' : '') +
      (sent.length ? '<h4>Solicitudes enviadas</h4><div class="pfx-list">' + sent.map(function (f) { return item(f.addressee, '<span class="pfx-muted">Pendiente</span><button type="button" class="btn btn-secondary btn-sm" data-pfx-del="' + f.id + '">Cancelar</button>'); }).join('') + '</div>' : '') +
      '<h4>Mis amigos (' + friends.length + ')</h4>' +
      (friends.length ? '<div class="pfx-list">' + friends.map(function (f) { var o = other(f); return item(o, '<a class="btn btn-secondary btn-sm" href="#/jugador/' + encodeURIComponent((o && o.username) || '') + '">Ver perfil</a><button type="button" class="btn btn-secondary btn-sm" data-pfx-del="' + f.id + '">Eliminar</button>'); }).join('') + '</div>' : '<p class="pfx-muted">Aún no tienes amigos. Envía una solicitud con su nombre de usuario.</p>');

    var input = box.querySelector('[data-pfx-fuser]');
    var add = box.querySelector('[data-pfx-fadd]');
    var send = async function () {
      var u = input.value.trim().replace(/^@/, '').toLowerCase();
      if (!u) return;
      add.disabled = true;
      var t = await DB().from('players').select('id,username').eq('username', u).maybeSingle();
      if (!t.data) return renderFriends(box, pid, 'No existe ningún jugador con ese usuario.', 'err');
      if (t.data.id === pid) return renderFriends(box, pid, 'No puedes agregarte a ti mismo.', 'err');
      var dup = rows.find(function (f) { return f.requester_player_id === t.data.id || f.addressee_player_id === t.data.id; });
      if (dup) return renderFriends(box, pid, dup.status === 'accepted' ? 'Ya sois amigos.' : 'Ya hay una solicitud pendiente con ese jugador.', 'err');
      var ins = await DB().from('player_friendships').insert({ requester_player_id: pid, addressee_player_id: t.data.id, status: 'pending' });
      renderFriends(box, pid, ins.error ? 'No se pudo enviar: ' + ins.error.message : 'Solicitud enviada a @' + t.data.username + '.', ins.error ? 'err' : 'ok');
    };
    add.addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    box.querySelectorAll('[data-pfx-accept]').forEach(function (b) {
      b.addEventListener('click', async function () {
        b.disabled = true;
        var x = await DB().from('player_friendships').update({ status: 'accepted' }).eq('id', b.dataset.pfxAccept);
        renderFriends(box, pid, x.error ? 'Error: ' + x.error.message : 'Solicitud aceptada.', x.error ? 'err' : 'ok');
      });
    });
    box.querySelectorAll('[data-pfx-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        b.disabled = true;
        var x = await DB().from('player_friendships').delete().eq('id', b.dataset.pfxDel);
        renderFriends(box, pid, x.error ? 'Error: ' + x.error.message : '', x.error ? 'err' : '');
      });
    });
  }

  // ---------- streamer ----------
  async function renderStreamer(box, player, msg, kind) {
    var r = await DB().from('players').select('kick_channel,twitch_channel').eq('id', player.id).maybeSingle();
    var d = (r && r.data) || {};
    var live = await liveStatus(d.kick_channel, d.twitch_channel);
    box.innerHTML = '<h3>Streamer</h3>' +
      '<p class="pfx-muted">Pon tu canal de Kick y/o Twitch. Cuando estés en directo, tu perfil mostrará <strong>EN VIVO</strong> junto a tu nombre.</p>' +
      '<div class="form-row">' +
      '<div class="login-form-group"><label class="login-form-label">Kick</label><input class="login-form-input" data-pfx-kick placeholder="https://kick.com/tucanal" value="' + esc(d.kick_channel ? 'https://kick.com/' + d.kick_channel : '') + '"></div>' +
      '<div class="login-form-group"><label class="login-form-label">Twitch</label><input class="login-form-input" data-pfx-twitch placeholder="https://twitch.tv/tucanal" value="' + esc(d.twitch_channel ? 'https://twitch.tv/' + d.twitch_channel : '') + '"></div>' +
      '</div>' +
      '<div class="pfx-row"><button type="button" class="btn btn-primary btn-sm" data-pfx-ssave>Guardar canales</button>' +
      (d.kick_channel || d.twitch_channel ? '<span class="pfx-muted">Estado ahora: ' + (live ? 'en directo en ' + (live.platform === 'kick' ? 'Kick' : 'Twitch') : 'desconectado') + '</span>' : '') + '</div>' +
      (msg ? '<div class="pfx-msg ' + (kind || '') + '">' + esc(msg) + '</div>' : '');
    box.querySelector('[data-pfx-ssave]').addEventListener('click', async function (ev) {
      var kRaw = box.querySelector('[data-pfx-kick]').value, tRaw = box.querySelector('[data-pfx-twitch]').value;
      var k = cleanChannel(kRaw, 'kick.com'), t = cleanChannel(tRaw, 'twitch.tv');
      if (kRaw.trim() && !k) return renderStreamer(box, player, 'El canal de Kick no es válido.', 'err');
      if (tRaw.trim() && !t) return renderStreamer(box, player, 'El canal de Twitch no es válido.', 'err');
      ev.target.disabled = true;
      var u = await DB().from('players').update({ kick_channel: k || null, twitch_channel: t || null }).eq('id', player.id);
      liveCache = {};
      renderStreamer(box, player, u.error ? 'No se pudo guardar: ' + u.error.message : 'Canales guardados.', u.error ? 'err' : 'ok');
      if (!u.error) showLive(document.querySelector('.account-head'), k, t);
    });
  }

  // ---------- Mi cuenta ----------
  function mountAccount(root) {
    var head = root.querySelector('.account-head');
    var m = me();
    var player = m && m.player;
    if (!head || head.dataset.pfx) return;
    if (!player) { setTimeout(scan, 1000); return; }
    head.dataset.pfx = '1';
    bindAvatar(head, player);

    var link = head.querySelector('a.link-inline[href^="#/jugador/"]');
    var bar = document.createElement('div');
    bar.className = 'pfx-links';
    if (link) { link.parentNode.insertBefore(bar, link); bar.appendChild(link); }
    else { var info = head.children[1] || head; info.appendChild(bar); }
    bar.insertAdjacentHTML('beforeend',
      '<button type="button" data-pfx-tab="friends">Agregar amigos</button>' +
      '<button type="button" data-pfx-tab="faceit">FACEIT</button>' +
      '<button type="button" data-pfx-tab="streamer">Streamer</button>');

    var panels = document.createElement('div');
    panels.setAttribute('data-pfx-panels', '');
    panels.innerHTML =
      '<div class="pfx-panel" data-pfx-panel="friends" hidden></div>' +
      '<div class="pfx-panel" data-pfx-panel="faceit" hidden><div data-pfx-faceit-slot><p class="pfx-muted">Cargando FACEIT…</p></div></div>' +
      '<div class="pfx-panel" data-pfx-panel="streamer" hidden></div>';
    head.insertAdjacentElement('afterend', panels);

    var loaded = {};
    bar.querySelectorAll('[data-pfx-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.pfxTab;
        var p = panels.querySelector('[data-pfx-panel="' + k + '"]');
        var open = p.hidden;
        panels.querySelectorAll('[data-pfx-panel]').forEach(function (x) { x.hidden = true; });
        bar.querySelectorAll('[data-pfx-tab]').forEach(function (x) { x.classList.remove('on'); });
        if (!open) return;
        p.hidden = false; b.classList.add('on');
        if (!loaded[k]) {
          loaded[k] = true;
          if (k === 'friends') renderFriends(p, player.id);
          if (k === 'streamer') renderStreamer(p, player);
        }
      });
    });

    DB().from('players').select('kick_channel,twitch_channel').eq('id', player.id).maybeSingle().then(function (r) {
      var d = (r && r.data) || {};
      showLive(head, d.kick_channel, d.twitch_channel);
    });
  }

  function moveFaceit(root) {
    var slot = root.querySelector('[data-pfx-faceit-slot]');
    var box = root.querySelector('[data-faceit-box]');
    if (slot && box && box.parentNode !== slot) { slot.innerHTML = ''; slot.appendChild(box); box.style.margin = '0'; }
  }

  // ---------- Perfil público ----------
  // Visible para todos los visitantes: Ver perfil público · Agregar amigo · FACEIT · Streamer.
  async function mountPlayer(main, username) {
    var head = main.querySelector('.profile-head');
    if (!head || head.dataset.pfxLive) return;
    head.dataset.pfxLive = '1';
    var r = await DB().from('players').select('id,username,avatar_url,kick_channel,twitch_channel').eq('username', username).maybeSingle();
    var d = (r && r.data) || {};
    var info = head.children[1] || head;
    var m = me();
    var mine = m && m.player;
    var isOwner = Boolean(mine && d.id && mine.id === d.id);

    // Foto: el dueño del perfil también puede cambiarla desde su perfil público
    if (isOwner) bindAvatar(head, mine);

    if (!head.querySelector('.pfx-links')) {
      var bar = document.createElement('div');
      bar.className = 'pfx-links';
      bar.innerHTML =
        '<a class="link-inline" href="#/jugador/' + encodeURIComponent(username) + '">Ver perfil público</a>' +
        (isOwner ? '<a class="link-inline" href="#/cuenta">Editar perfil</a>' : '<button type="button" data-pfx-addfriend>Agregar amigo</button>') +
        '<button type="button" data-pfx-goto="fm">FACEIT</button>' +
        (d.kick_channel ? '<a class="link-inline" href="https://kick.com/' + esc(d.kick_channel) + '" target="_blank" rel="noopener noreferrer">Streamer · Kick</a>' : '') +
        (d.twitch_channel ? '<a class="link-inline" href="https://twitch.tv/' + esc(d.twitch_channel) + '" target="_blank" rel="noopener noreferrer">Streamer · Twitch</a>' : '') +
        (!d.kick_channel && !d.twitch_channel ? '<span class="pfx-muted">Streamer: sin canal</span>' : '') +
        '<span class="pfx-msg" data-pfx-pubmsg></span>';
      info.appendChild(bar);

      var go = bar.querySelector('[data-pfx-goto]');
      go.addEventListener('click', function () {
        var t = main.querySelector('[data-fm]') || main.querySelector('[data-faceit-badge]');
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else { var mm = bar.querySelector('[data-pfx-pubmsg]'); mm.className = 'pfx-msg'; mm.textContent = 'Este jugador no tiene FACEIT vinculado.'; }
      });

      var add = bar.querySelector('[data-pfx-addfriend]');
      if (add) add.addEventListener('click', async function () {
        var msg = bar.querySelector('[data-pfx-pubmsg]');
        var say = function (t, k) { msg.className = 'pfx-msg ' + (k || ''); msg.textContent = t; };
        if (!mine) { window.location.hash = '#/login'; return; }
        if (!d.id) return say('Jugador no encontrado.', 'err');
        add.disabled = true;
        var ex = await DB().from('player_friendships').select('id,status')
          .or('(and(requester_player_id.eq.' + mine.id + ',addressee_player_id.eq.' + d.id + '),and(requester_player_id.eq.' + d.id + ',addressee_player_id.eq.' + mine.id + '))');
        var row = ex && ex.data && ex.data[0];
        if (row) { add.disabled = false; return say(row.status === 'accepted' ? 'Ya sois amigos.' : 'Ya hay una solicitud pendiente.', 'ok'); }
        var ins = await DB().from('player_friendships').insert({ requester_player_id: mine.id, addressee_player_id: d.id, status: 'pending' });
        if (ins.error) { add.disabled = false; return say('No se pudo enviar: ' + ins.error.message, 'err'); }
        add.textContent = 'Solicitud enviada';
        say('', '');
      });
    }

    if (d.kick_channel || d.twitch_channel) showLive(head, d.kick_channel, d.twitch_channel);
  }

  // ---------- observador ----------
  function scan() {
    var hash = decodeURIComponent((window.location.hash || '').replace(/^#\/?/, '')).split('?')[0];
    var main = document.querySelector('main') || document.body;
    if (hash === 'cuenta') {
      var head = main.querySelector('.account-head');
      if (head) { var root = head.parentElement; mountAccount(root); moveFaceit(root); }
    } else if (hash.indexOf('jugador/') === 0) {
      mountPlayer(main, hash.slice(8));
    }
  }

  css();
  var t = null;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 150); }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', function () { setTimeout(scan, 300); });
  setTimeout(scan, 800);
  window.VantProfileExtras = { liveStatus: liveStatus, mountAccount: function (root) { try { mountAccount(root); moveFaceit(root); } catch (e) { console.error(e); } } };
})();
