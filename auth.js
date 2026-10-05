// ============================================
// VANTCALL Esports — Auth (Supabase: correo, Discord, Google y Steam) + cuenta + zona de plan + Stripe
// Usa el cliente compartido de db.js (proyecto qtetsgwwsvqzquxssudj)
// ============================================
(function () {
  'use strict';

  const PLANS = {
    basic: { name: 'VANT BASIC', price: 9, link: 'https://buy.stripe.com/aFaaEX7Ff9FufJ4gQlebu01' },
    pro:   { name: 'VANT PRO',   price: 19, link: 'https://buy.stripe.com/4gMeVd3oZ2d2eF0eIdebu02' },
    elite: { name: 'VANT ELITE', price: 39, link: 'https://buy.stripe.com/aFa4gz7Ff6ti68u7fLebu03' },
  };
  const PLAN_RANK = { free: 0, basic: 1, pro: 2, elite: 3 };
  const PLAYER_COLS = 'id, username, display_name, avatar_url, region, summoner_name, verified, created_at, main_game, country';
  const USERNAME_RE = /^[A-Za-z0-9_.\-]{3,16}$/;

  const sb = window.VantDB && window.VantDB.client;
  const SUPABASE_URL = window.VantDB && window.VantDB.url;
  const SUPABASE_KEY = window.VantDB && window.VantDB.key;

  let session = null;
  let me = null; // { player, discord, plan, profile, steam, perks }
  let providers = null;

  const mem = new Map();
  const flags = { get: (k) => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, String(v)), del: (k) => mem.delete(k) };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const baseUrl = () => window.location.origin + window.location.pathname;
  const go = (route) => { if (window.location.hash !== '#/' + route) window.location.hash = '#/' + route; else if (typeof router === 'function') router(); };

  const ERRORS = [
    [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
    [/email not confirmed/i, 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada (y spam).'],
    [/user already registered|already been registered/i, 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.'],
    [/password should be|weak password|password is too weak/i, 'La contraseña es demasiado débil.'],
    [/rate limit|too many|security purposes/i, 'Demasiados intentos. Espera un minuto y vuelve a probar.'],
    [/provider is not enabled|unsupported provider/i, 'Este método de inicio de sesión no está activado en este momento.'],
    [/flow state|code verifier|both auth code and code verifier/i, 'El inicio de sesión anterior quedó a medias. Pulsa de nuevo el botón para empezar uno nuevo.'],
    [/manual linking is disabled/i, 'La vinculación manual de cuentas está desactivada en Supabase (Authentication → Sign In / Providers → Allow manual linking).'],
    [/identity is already linked|already linked to another user/i, 'Esa cuenta ya está vinculada a otro usuario de VANTS.'],
    [/same.*password|different from the old/i, 'La nueva contraseña debe ser distinta a la anterior.'],
    [/invalid email|unable to validate email/i, 'El correo no es válido.'],
    [/duplicate key|unique/i, 'Ya existe un registro igual.'],
    [/row-level security|permission denied/i, 'No tienes permiso para esta acción. Inicia sesión de nuevo.'],
    [/failed to fetch|network/i, 'Sin conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.'],
    [/unable to exchange external code|invalid_client/i, 'El proveedor rechazó el inicio de sesión (configuración OAuth). Prueba con otro método mientras el equipo lo revisa.'],
    [/flow state|flow_state|code verifier|both auth code and code verifier/i, 'La sesión de inicio caducó. Pulsa de nuevo el botón para entrar.'],
    [/state parameter missing|bad_oauth_state/i, 'El inicio de sesión se interrumpió. Vuelve a intentarlo desde este navegador.'],
  ];
  const humanError = (e) => {
    const msg = (e && (e.message || e.error_description || e.msg)) || String(e);
    for (const [re, txt] of ERRORS) if (re.test(msg)) return txt;
    return 'No se pudo completar la operación: ' + msg;
  };

  function showMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = 'auth-msg auth-msg-' + (kind || 'info');
    el.hidden = !text;
  }

  function setBusy(form, busy, label) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (busy) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Procesando…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }

  function passwordProblem(p) {
    if (p.length < 12) return 'La contraseña debe tener al menos 12 caracteres.';
    if (!/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/[0-9]/.test(p)) return 'Usa al menos una mayúscula, una minúscula y un número.';
    return '';
  }

  async function logEvent(type, data) {
    if (!sb || !session) return;
    try { await sb.rpc('log_web_event', { event_type: type, data: data || {} }); } catch (_) { /* no bloquear la UI */ }
  }

  async function loadMe() {
    if (!sb || !session) { me = null; return null; }
    const { data: pid } = await sb.rpc('current_player_id');
    const { data: player } = pid ? await sb.from('players').select(PLAYER_COLS).eq('id', pid).maybeSingle() : { data: null };
    if (!player) { me = { player: null, discord: null, plan: 'free', profile: null, steam: null, perks: [], adminRole: null }; return me; }
    const [disc, prof, ent, steam, perks] = await Promise.all([
      sb.from('player_discord_accounts').select('discord_id, discord_username, avatar_url').eq('player_id', player.id).maybeSingle(),
      sb.from('profiles').select('bio, visibility').eq('player_id', player.id).maybeSingle(),
      sb.from('entitlements').select('tier, is_active, expires_at').eq('player_id', player.id).eq('is_active', true),
      sb.from('user_game_accounts').select('handle, display_name, avatar_url, profile_url, verified').eq('user_id', session.user.id).eq('game', 'steam').maybeSingle(),
      sb.from('plan_content').select('tier, kind, title, body, cta_label, cta_url, sort_order').eq('published', true).order('tier').order('sort_order'),
    ]);
    let plan = 'free';
    for (const e of ent.data || []) {
      const t = String(e.tier || '').toLowerCase();
      if (PLAN_RANK[t] > PLAN_RANK[plan] && (!e.expires_at || new Date(e.expires_at) > new Date())) plan = t;
    }
    let adminRole = null;
    try { const r = await sb.rpc('web_admin_role'); adminRole = r.data || null; } catch (_) { adminRole = null; }
    // El dueño y los admins ven siempre la zona completa (ELITE), entren con el método que entren
    if (adminRole === 'owner' || adminRole === 'admin') plan = 'elite';
    me = { player, discord: disc.data || null, profile: prof.data || null, plan, steam: (steam && steam.data) || null, perks: (perks && perks.data) || [], adminRole };
    return me;
  }

  async function loadProviders() {
    if (providers) return providers;
    try {
      const r = await fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_KEY } });
      providers = (await r.json()).external || {};
    } catch (_) { providers = {}; }
    return providers;
  }

  function displayName() {
    if (!session) return '';
    const u = session.user;
    return (me && me.player && (me.player.display_name || me.player.username)) || (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || (u.email || '').split('@')[0];
  }

  function updateHeader() {
    const link = document.getElementById('auth-link');
    const label = document.getElementById('auth-link-label');
    if (!link || !label) return;
    if (session) {
      const plan = me && me.plan !== 'free' ? ' · ' + me.plan.toUpperCase() : '';
      label.textContent = displayName() + plan;
      link.setAttribute('href', '#/cuenta');
      link.setAttribute('aria-label', 'Mi cuenta');
    } else {
      label.textContent = 'Login';
      link.setAttribute('href', '#/login');
      link.setAttribute('aria-label', 'Iniciar sesión');
    }
    const adminLink = document.getElementById('admin-link');
    if (adminLink) adminLink.hidden = !(session && me && me.adminRole);
    document.querySelectorAll('[data-zona-link]').forEach((a) => a.classList.toggle('is-unlocked', Boolean(session && me && me.plan !== 'free')));
    document.querySelectorAll('[data-auth-cta]').forEach((a) => {
      a.setAttribute('href', session ? '#/cuenta' : '#/login');
      a.textContent = session ? 'MI CUENTA' : 'JUGAR GRATIS';
    });
  }

  const ICON_DISCORD = typeof DISCORD_SVG === 'string' ? DISCORD_SVG : '';
  const ICON_GOOGLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.5 5.5 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z"/></svg>';
  const ICON_STEAM = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.98 0C5.67 0 .5 4.86.02 11.04l6.43 2.66a3.38 3.38 0 0 1 1.92-.6l.19.01 2.86-4.15v-.06a4.52 4.52 0 1 1 4.52 4.52h-.1l-4.08 2.91v.16a3.39 3.39 0 0 1-6.72.63L.4 15.5A12 12 0 1 0 11.98 0zM7.54 18.21l-1.47-.61a2.54 2.54 0 1 0 1.39-3.46l1.52.63a1.87 1.87 0 1 1-1.44 3.44zm11.42-9.3a3.02 3.02 0 1 0-6.03 0 3.02 3.02 0 0 0 6.03 0zm-5.27 0a2.26 2.26 0 1 1 4.53 0 2.26 2.26 0 0 1-4.53 0z"/></svg>';
  const METHOD_BUTTONS = (verb) => `
        <div class="login-methods">
          <button type="button" class="login-btn login-btn-google" data-oauth="google">${ICON_GOOGLE} ${verb} con Google</button>
          <button type="button" class="login-btn login-btn-discord" data-oauth="discord">${ICON_DISCORD} ${verb} con Discord</button>
          <button type="button" class="login-btn login-btn-steam" data-oauth="steam">${ICON_STEAM} ${verb} con Steam</button>
        </div>`;
  const PROVIDER_NAME = { email: 'Correo', discord: 'Discord', google: 'Google', steam: 'Steam' };
  const STEAM_ERRORS = {
    cancelled: 'Cancelaste el inicio con Steam.',
    verification_failed: 'Steam no pudo verificar tu identidad. Inténtalo de nuevo.',
    already_linked: 'Esa cuenta de Steam ya está vinculada a otro usuario VANTS.',
    link_failed: 'No se pudo vincular Steam. Inténtalo de nuevo en unos minutos.',
    account_create_failed: 'No se pudo crear tu cuenta con Steam. Inténtalo de nuevo.',
    login_failed: 'No se pudo iniciar sesión con Steam. Inténtalo de nuevo.',
    start_failed: 'No se pudo iniciar la conexión con Steam.',
  };
  const isPlaceholderEmail = (e) => /\.invalid$/i.test(e || '');

  // ---------- páginas de auth ----------
  const PAGES = {
    'login': {
      title: 'Iniciar sesión — VANTCALL Esports',
      content: `
      <div class="login-page">
        <h1>Iniciar sesión</h1>
        <p class="login-sub">Accede con Google, Discord, Steam o tu correo</p>
        <div class="auth-msg" data-auth-msg role="status" aria-live="polite" hidden></div>
${METHOD_BUTTONS('Continuar')}
        <div class="login-divider"><span>o con correo</span></div>
        <form class="login-form" data-form="login" novalidate>
          <div class="login-form-group">
            <label class="login-form-label" for="li-email">Correo electrónico</label>
            <input id="li-email" name="email" type="email" class="login-form-input" placeholder="tu@correo.com" autocomplete="email" required>
          </div>
          <div class="login-form-group">
            <label class="login-form-label" for="li-pass">Contraseña</label>
            <input id="li-pass" name="password" type="password" class="login-form-input" placeholder="••••••••••••" autocomplete="current-password" required>
          </div>
          <div class="login-form-actions"><span></span><a href="#/recuperar">¿Olvidaste tu contraseña?</a></div>
          <button type="submit" class="btn btn-primary login-submit">Iniciar sesión</button>
        </form>
        <p class="login-note">VANTS nunca te pedirá tu contraseña de Google, Discord o Steam: el acceso ocurre en su propia web y tu sesión la gestiona Supabase Auth.</p>
        <p class="login-switch">¿No tienes cuenta? <a href="#/registro">Regístrate gratis</a></p>
      </div>`,
    },

    'registro': {
      title: 'Registro — VANTCALL Esports',
      content: `
      <div class="login-page">
        <h1>Crear cuenta</h1>
        <p class="login-sub">Tu identidad de competidor para VALORANT, CS2 y LoL</p>
        <div class="auth-msg" data-auth-msg role="status" aria-live="polite" hidden></div>
${METHOD_BUTTONS('Registrarse')}
        <div class="login-divider"><span>o con correo</span></div>
        <form class="login-form" data-form="registro" novalidate>
          <div class="login-form-group">
            <label class="login-form-label" for="rg-user">Nickname</label>
            <input id="rg-user" name="username" type="text" class="login-form-input" placeholder="3-16 caracteres, sin espacios" minlength="3" maxlength="16" autocomplete="nickname" required>
          </div>
          <div class="login-form-group">
            <label class="login-form-label" for="rg-email">Correo electrónico</label>
            <input id="rg-email" name="email" type="email" class="login-form-input" placeholder="tu@correo.com" autocomplete="email" required>
          </div>
          <div class="login-form-group">
            <label class="login-form-label" for="rg-pass">Contraseña</label>
            <input id="rg-pass" name="password" type="password" class="login-form-input" placeholder="Mínimo 12, con mayúscula, minúscula y número" minlength="12" autocomplete="new-password" required>
          </div>
          <div class="login-form-group">
            <label class="login-form-label" for="rg-pass2">Confirmar contraseña</label>
            <input id="rg-pass2" name="password2" type="password" class="login-form-input" autocomplete="new-password" required>
          </div>
          <label class="check-row"><input type="checkbox" name="age" required> Tengo 16 años o más y acepto los términos y el código de conducta.</label>
          <button type="submit" class="btn btn-primary login-submit">Crear cuenta</button>
        </form>
        <p class="login-note">Recibirás un correo de verificación (válido 24 h). Debes confirmarlo antes de inscribirte en torneos.</p>
        <p class="login-switch">¿Ya tienes cuenta? <a href="#/login">Inicia sesión</a></p>
      </div>`,
    },

    'recuperar': {
      title: 'Recuperar contraseña — VANTCALL Esports',
      content: `
      <div class="login-page">
        <h1>Recuperar contraseña</h1>
        <p class="login-sub">Te enviaremos un enlace de un solo uso</p>
        <div class="auth-msg" data-auth-msg role="status" aria-live="polite" hidden></div>
        <form class="login-form" data-form="recuperar" novalidate>
          <div class="login-form-group">
            <label class="login-form-label" for="rc-email">Correo electrónico</label>
            <input id="rc-email" name="email" type="email" class="login-form-input" placeholder="tu@correo.com" autocomplete="email" required>
          </div>
          <button type="submit" class="btn btn-primary login-submit">Enviar enlace</button>
        </form>
        <p class="login-note">Abre el enlace en este mismo navegador. ¿Perdiste acceso al correo? Escribe a feispla@hotmail.com.</p>
        <p class="login-switch"><a href="#/login">Volver a iniciar sesión</a></p>
      </div>`,
    },

    'nueva-contrasena': {
      title: 'Nueva contraseña — VANTCALL Esports',
      content: `
      <div class="login-page">
        <h1>Nueva contraseña</h1>
        <p class="login-sub">Mínimo 12 caracteres, con mayúscula, minúscula y número</p>
        <div class="auth-msg" data-auth-msg role="status" aria-live="polite" hidden></div>
        <form class="login-form" data-form="nueva-contrasena" novalidate>
          <div class="login-form-group">
            <label class="login-form-label" for="nc-pass">Nueva contraseña</label>
            <input id="nc-pass" name="password" type="password" class="login-form-input" minlength="12" autocomplete="new-password" required>
          </div>
          <div class="login-form-group">
            <label class="login-form-label" for="nc-pass2">Repite la contraseña</label>
            <input id="nc-pass2" name="password2" type="password" class="login-form-input" minlength="12" autocomplete="new-password" required>
          </div>
          <button type="submit" class="btn btn-primary login-submit">Guardar contraseña</button>
        </form>
      </div>`,
    },

    'cuenta': {
      title: 'Mi cuenta — VANTCALL Esports',
      content: `<div class="account-page" data-account><div class="skeleton-list"><div class="skeleton-row"></div><div class="skeleton-row"></div></div></div>`,
    },

    'checkout/exito': {
      title: 'Pago recibido — VANTCALL Esports',
      content: `
      <div class="login-page">
        <h1>Pago recibido</h1>
        <p class="login-sub">Gracias por apoyar VANTCALL.</p>
        <div class="auth-msg auth-msg-info" data-auth-msg role="status" aria-live="polite">Confirmando el pago con Stripe…</div>
        <p class="login-switch"><a href="#/cuenta" class="btn btn-primary">Ver mi cuenta</a></p>
      </div>`,
    },
  };

  function checkoutPage(key) {
    const p = PLANS[key];
    return {
      title: 'Checkout — ' + p.name,
      content: `
      <h1>Checkout — ${p.name}</h1>
      <p class="breadcrumb"><a href="#/precios">Precios</a> <span>/</span> Checkout</p>
      <div class="checkout-box">
        <div class="checkout-summary">
          <h3>Resumen del pedido</h3>
          <div class="checkout-line"><span>${p.name} — Pago único</span><span>€${p.price.toFixed(2)}</span></div>
          <div class="checkout-line"><span>IVA</span><span>Incluido</span></div>
          <div class="checkout-line checkout-total"><span>Total</span><span>€${p.price.toFixed(2)}</span></div>
        </div>
        <div class="checkout-actions">
          <div class="auth-msg" data-auth-msg role="status" aria-live="polite" hidden></div>
          <p>Serás redirigido a la pasarela segura de Stripe. El plan se activa en tu cuenta cuando Stripe confirma el pago.</p>
          <button type="button" class="btn btn-primary checkout-pay-btn" data-checkout="${key}">Pagar con Stripe</button>
          <a href="#/precios" class="btn btn-secondary">Volver</a>
        </div>
      </div>`,
    };
  }
  Object.keys(PLANS).forEach((k) => { PAGES['checkout/' + k] = checkoutPage(k); });
  if (typeof DOC_CONTENT === 'object') Object.assign(DOC_CONTENT, PAGES);

  // ---------- acciones ----------
  const OAUTH_OPTS = { discord: { scopes: 'identify email', queryParams: { prompt: 'consent' } }, google: { queryParams: { prompt: 'select_account' } } };
  const topGo = (url) => { try { window.top.location.href = url; } catch (_) { window.location.href = url; } };

  async function oauth(provider, msgEl) {
    if (!sb) return showMsg(msgEl, 'No se pudo cargar el sistema de inicio de sesión. Recarga la página.', 'error');
    if (provider === 'steam') return steamLogin(msgEl);
    const prov = await loadProviders();
    // Si quedó una sesión rota de un intento anterior, se limpia antes de volver a entrar
    if (!session) { try { await sb.auth.signOut({ scope: 'local' }); } catch (_) { /* sin sesión */ } }
    if (!prov[provider]) return showMsg(msgEl, 'El inicio con ' + PROVIDER_NAME[provider] + ' no está activo. Usa otro método mientras tanto.', 'warning');
    const { data, error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: baseUrl() + '?next=cuenta', skipBrowserRedirect: true, ...(OAUTH_OPTS[provider] || {}) },
    });
    if (error) return showMsg(msgEl, humanError(error), 'error');
    if (data && data.url) topGo(data.url);
  }

  function steamLogin(msgEl) {
    showMsg(msgEl, 'Conectando con Steam…', 'info');
    topGo(SUPABASE_URL + '/functions/v1/steam-login?redirect_to=' + encodeURIComponent(baseUrl()));
  }

  async function linkProvider(provider, msgEl) {
    const { data, error } = await sb.auth.linkIdentity({ provider, options: { redirectTo: baseUrl() + '?next=cuenta', skipBrowserRedirect: true, ...(OAUTH_OPTS[provider] || {}) } });
    if (error) return showMsg(msgEl, humanError(error), 'error');
    if (data && data.url) topGo(data.url);
  }

  async function linkSteam(msgEl, btn) {
    if (!session) return;
    btn && (btn.disabled = true);
    try {
      const r = await fetch(SUPABASE_URL + '/functions/v1/steam-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ redirect_to: baseUrl() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.login_url) throw new Error(j.error === 'redirect_not_allowed' ? 'Esta dirección web aún no está autorizada para Steam.' : 'No se pudo iniciar la vinculación con Steam.');
      topGo(j.login_url);
    } catch (e) { showMsg(msgEl, e.message, 'error'); btn && (btn.disabled = false); }
  }

  async function unlinkSteam(msgEl, btn) {
    btn && (btn.disabled = true);
    const { error } = await sb.functions.invoke('unlink-steam', { method: 'POST' });
    if (error) { btn && (btn.disabled = false); return showMsg(msgEl, 'No se pudo desvincular Steam.', 'error'); }
    await loadMe();
    flags.set('vant_flash', JSON.stringify({ text: 'Steam desvinculado.', kind: 'info' }));
    if (typeof router === 'function') router();
  }

  const HANDLERS = {
    async login(form, msg) {
      const email = form.email.value.trim(), password = form.password.value;
      if (!email || !password) return showMsg(msg, 'Introduce tu correo y tu contraseña.', 'error');
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return showMsg(msg, humanError(error), 'error');
      showMsg(msg, 'Sesión iniciada.', 'success');
      const next = flags.get('vant_next'); flags.del('vant_next');
      go(next || 'cuenta');
    },
    async registro(form, msg) {
      const username = form.username.value.trim(), email = form.email.value.trim();
      const password = form.password.value, password2 = form.password2.value;
      if (!USERNAME_RE.test(username)) return showMsg(msg, 'El nickname debe tener 3-16 caracteres: letras, números, punto, guion o guion bajo.', 'error');
      if (!email) return showMsg(msg, 'Introduce tu correo.', 'error');
      const pp = passwordProblem(password); if (pp) return showMsg(msg, pp, 'error');
      if (password !== password2) return showMsg(msg, 'Las contraseñas no coinciden.', 'error');
      if (!form.age.checked) return showMsg(msg, 'Debes confirmar la edad mínima y aceptar los términos.', 'error');
      const { data: taken } = await sb.from('players').select('id').eq('username', username.toLowerCase()).maybeSingle();
      if (taken) return showMsg(msg, 'Ese nickname ya está en uso.', 'error');
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: baseUrl() + '?next=cuenta' } });
      if (error) return showMsg(msg, humanError(error), 'error');
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return showMsg(msg, 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.', 'error');
      }
      form.reset();
      if (data.session) { showMsg(msg, 'Cuenta creada.', 'success'); return go('cuenta'); }
      showMsg(msg, 'Cuenta creada. Te hemos enviado un correo a ' + email + ' para confirmarla.', 'success');
    },
    async recuperar(form, msg) {
      const email = form.email.value.trim();
      if (!email) return showMsg(msg, 'Introduce tu correo.', 'error');
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: baseUrl() + '?next=nueva-contrasena' });
      if (error) return showMsg(msg, humanError(error), 'error');
      showMsg(msg, 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.', 'success');
    },
    async 'nueva-contrasena'(form, msg) {
      if (!session) return showMsg(msg, 'El enlace ha caducado o se abrió en otro navegador. Solicita uno nuevo.', 'error');
      const password = form.password.value, password2 = form.password2.value;
      const pp = passwordProblem(password); if (pp) return showMsg(msg, pp, 'error');
      if (password !== password2) return showMsg(msg, 'Las contraseñas no coinciden.', 'error');
      const { error } = await sb.auth.updateUser({ password });
      if (error) return showMsg(msg, humanError(error), 'error');
      form.reset();
      showMsg(msg, 'Contraseña actualizada.', 'success');
    },
    async perfil(form, msg) {
      if (!me || !me.player) return showMsg(msg, 'Tu perfil de jugador aún no está creado.', 'error');
      const upd = {
        display_name: form.display_name.value.trim().slice(0, 32) || null,
        region: form.region.value || null,
        main_game: form.main_game.value || null,
        country: form.country.value.trim().slice(0, 56) || null,
      };
      const { error } = await sb.from('players').update(upd).eq('id', me.player.id);
      if (error) return showMsg(msg, humanError(error), 'error');
      const bio = form.bio.value.trim().slice(0, 280);
      const vis = form.visibility.value;
      const { error: e2 } = await sb.from('profiles').update({ bio, visibility: vis }).eq('player_id', me.player.id);
      if (e2) return showMsg(msg, humanError(e2), 'error');
      window.VantDB.invalidate('p:'); window.VantDB.invalidate('players');
      await loadMe(); updateHeader();
      showMsg(msg, 'Perfil actualizado.', 'success');
    },
    async soporte(form, msg) {
      if (!me || !me.player) return showMsg(msg, 'Tu perfil de jugador aún no está creado.', 'error');
      const subject = form.subject.value.trim(), description = form.description.value.trim();
      if (subject.length < 4 || description.length < 10) return showMsg(msg, 'Añade un asunto y una descripción más detallada.', 'error');
      const { error } = await sb.from('support_tickets').insert({
        player_id: me.player.id, discord_id: me.discord ? me.discord.discord_id : null,
        subject: subject.slice(0, 120), description: description.slice(0, 2000), category: form.category.value, priority: 'normal', status: 'open',
      });
      if (error) return showMsg(msg, humanError(error), 'error');
      logEvent('ticket_soporte', { asunto: subject.slice(0, 120) });
      form.reset();
      showMsg(msg, 'Ticket enviado. El equipo te responderá por correo o Discord.', 'success');
      loadAccountLists(document.querySelector('[data-account]'));
    },
  };

  async function startCheckout(key, msgEl, btn) {
    const plan = PLANS[key];
    if (!plan) return;
    if (!sb) return showMsg(msgEl, 'No se pudo cargar el sistema de pagos. Recarga la página.', 'error');
    if (!session) {
      flags.set('vant_next', 'checkout/' + key);
      showMsg(msgEl, 'Inicia sesión para que el plan quede asociado a tu cuenta. Redirigiendo…', 'info');
      setTimeout(() => go('login'), 900);
      return;
    }
    const current = (me && me.plan) || 'free';
    if (PLAN_RANK[current] >= PLAN_RANK[key]) return showMsg(msgEl, 'Ya tienes el plan ' + current.toUpperCase() + ', que incluye este.', 'info');
    btn.disabled = true; btn.textContent = 'Abriendo Stripe…';
    await logEvent('checkout_iniciado', { plan: key.toUpperCase(), precio: '€' + plan.price });
    const url = new URL(plan.link);
    url.searchParams.set('client_reference_id', session.user.id);
    if (session.user.email) url.searchParams.set('prefilled_email', session.user.email);
    url.searchParams.set('locale', 'es');
    try { window.top.location.href = url.toString(); } catch (_) { window.location.href = url.toString(); }
  }

  // ---------- inscripción a torneos / RSVP ----------
  async function requirePlayer(msgEl) {
    if (!session) { flags.set('vant_next', window.location.hash.replace('#/', '')); showMsg(msgEl, 'Inicia sesión para continuar. Redirigiendo…', 'info'); setTimeout(() => go('login'), 900); return null; }
    if (!me) await loadMe();
    if (!me || !me.player) { showMsg(msgEl, 'Tu perfil de jugador aún no está listo. Recarga la página en unos segundos.', 'warning'); return null; }
    if (!session.user.email_confirmed_at && (session.user.app_metadata || {}).provider === 'email') { showMsg(msgEl, 'Confirma tu correo antes de inscribirte.', 'warning'); return null; }
    return me.player;
  }

  async function bindTournament(main, t) {
    const reg = main.querySelector('[data-register]');
    const unreg = main.querySelector('[data-unregister]');
    const msg = main.querySelector('[data-page-msg]');
    if (!reg) return;
    const mine = me && me.player && t.entries.some((e) => e.player && e.player.id === me.player.id);
    if (mine) { reg.hidden = true; unreg.hidden = false; }
    reg.addEventListener('click', async () => {
      const p = await requirePlayer(msg); if (!p) return;
      if (t.max_participants && t.entries.length >= t.max_participants) return showMsg(msg, 'El torneo está completo.', 'warning');
      reg.disabled = true;
      const { error } = await sb.from('tournament_entries').insert({ tournament_id: t.id, player_id: p.id, status: 'registered' });
      reg.disabled = false;
      if (error) return showMsg(msg, /duplicate|unique/i.test(error.message) ? 'Ya estás inscrito en este torneo.' : humanError(error), 'error');
      logEvent('inscripcion_torneo', { torneo: t.name });
      window.VantDB.invalidate('t:'); window.VantDB.invalidate('tournaments');
      showMsg(msg, 'Inscripción confirmada.', 'success');
      setTimeout(() => router(), 700);
    });
    unreg.addEventListener('click', async () => {
      const p = await requirePlayer(msg); if (!p) return;
      const { error } = await sb.from('tournament_entries').delete().eq('tournament_id', t.id).eq('player_id', p.id);
      if (error) return showMsg(msg, humanError(error), 'error');
      window.VantDB.invalidate('t:'); window.VantDB.invalidate('tournaments');
      showMsg(msg, 'Inscripción cancelada.', 'info');
      setTimeout(() => router(), 700);
    });
  }

  async function rsvp(eventId, btn, msgEl) {
    const p = await requirePlayer(msgEl); if (!p) return;
    btn.disabled = true;
    const { error } = await sb.from('event_rsvps').insert({ event_id: eventId, player_id: p.id, status: 'going' });
    btn.disabled = false;
    if (error && !/duplicate|unique/i.test(error.message)) return showMsg(msgEl, humanError(error), 'error');
    logEvent('rsvp_evento', { evento: eventId });
    btn.textContent = 'Confirmado'; btn.disabled = true;
    showMsg(msgEl, 'Asistencia confirmada.', 'success');
  }

  // ---------- cuenta ----------
  function renderAccount(root) {
    if (!session) {
      root.innerHTML = `<div class="login-page"><h1>Mi cuenta</h1><p class="login-sub">Necesitas iniciar sesión.</p><p class="login-switch"><a href="#/login" class="btn btn-primary">Iniciar sesión</a></p></div>`;
      return;
    }
    const u = session.user;
    const p = me && me.player;
    const identities = (u.identities || []).map((i) => i.provider).filter((i) => !(i === 'email' && isPlaceholderEmail(u.email)));
    const steamAcc = me && me.steam;
    const hasGoogle = identities.includes('google');
    if (steamAcc || (u.app_metadata || {}).steam_id) identities.push('steam');
    const hasDiscord = identities.includes('discord') || (me && me.discord);
    const plan = (me && me.plan) || 'free';
    const opt = (v, cur, label) => `<option value="${v}"${v === (cur || '') ? ' selected' : ''}>${label}</option>`;
    root.innerHTML = `
      <div class="account-head">
        <div class="player-avatar player-avatar-lg">${p && p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="">` : esc((displayName() || '?').slice(0, 2).toUpperCase())}</div>
        <div><h1>${esc(displayName())}</h1><div class="player-sub">${p ? '@' + esc(p.username) : ''}${!isPlaceholderEmail(u.email) && u.email ? (p ? ' · ' : '') + esc(u.email) : ''}</div>
        ${p ? `<a class="link-inline" href="#/jugador/${encodeURIComponent(p.username)}">Ver perfil público</a>` : ''}
        <div class="account-quick"><a class="btn btn-sm ${plan !== 'free' ? 'btn-gold' : 'btn-secondary'}" href="#/zona">${plan !== 'free' ? 'Entrar a mi zona ' + esc(plan.toUpperCase()) : 'Desbloquear zona exclusiva'}</a>${me && me.adminRole ? '<a class="btn btn-sm btn-primary" href="#/admin">Panel admin</a>' : ''}</div></div>
      </div>
      <div class="auth-msg" data-auth-msg role="status" aria-live="polite" hidden></div>
      ${!p ? '<div class="auth-msg auth-msg-warning">Estamos creando tu perfil de jugador. Si no aparece en unos segundos, recarga la página.</div>' : ''}
      <div class="account-grid">
        <div class="account-item"><span>Plan</span><strong class="account-plan account-plan-${esc(plan)}">${esc(plan.toUpperCase())}</strong></div>
        <div class="account-item"><span>Correo</span><strong>${isPlaceholderEmail(u.email) ? 'Sin correo (cuenta Steam)' : u.email_confirmed_at ? 'Verificado' : 'Pendiente de verificar'}</strong></div>
        <div class="account-item"><span>Discord</span><strong>${hasDiscord ? esc((me && me.discord && me.discord.discord_username) || 'Vinculado') : 'No vinculado'}</strong>
          ${hasDiscord ? '' : `<button type="button" class="btn btn-secondary btn-sm" data-link-discord>Vincular Discord</button>`}</div>
        <div class="account-item"><span>Google</span><strong>${hasGoogle ? 'Vinculado' : 'No vinculado'}</strong>
          ${hasGoogle ? '' : `<button type="button" class="btn btn-secondary btn-sm" data-link-google>Vincular Google</button>`}</div>
        <div class="account-item account-item-steam"><span>Steam</span>
          ${steamAcc ? `<strong class="steam-acc">${steamAcc.avatar_url ? `<img src="${esc(steamAcc.avatar_url)}" alt="" width="22" height="22">` : ''}${steamAcc.profile_url ? `<a href="${esc(steamAcc.profile_url)}" target="_blank" rel="noopener noreferrer">${esc(steamAcc.display_name || steamAcc.handle)}</a>` : esc(steamAcc.display_name || steamAcc.handle)}</strong>
            ${isPlaceholderEmail(u.email) ? '' : '<button type="button" class="btn btn-secondary btn-sm" data-unlink-steam>Desvincular</button>'}`
          : `<strong>No vinculado</strong><button type="button" class="btn btn-secondary btn-sm" data-link-steam>Vincular Steam</button>`}</div>
        <div class="account-item"><span>Métodos de acceso</span><strong>${[...new Set(identities)].map((i) => PROVIDER_NAME[i] || i).join(' + ') || 'Correo'}</strong></div>
      </div>
      ${plan !== 'free' && me && me.perks && me.perks.length ? `
      <h2 class="account-h2">Tus ventajas ${esc(plan.toUpperCase())}</h2>
      <div class="perk-grid">${me.perks.map((k) => `<div class="perk-card perk-${esc(k.tier)}"><span class="perk-tier">${esc(String(k.tier).toUpperCase())}</span><h3>${esc(k.title)}</h3><p>${esc(k.body || '')}</p>${k.cta_url && k.cta_label ? `<a class="link-inline" href="${esc(k.cta_url)}"${/^https?:/.test(k.cta_url) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(k.cta_label)}</a>` : ''}</div>`).join('')}</div>` : ''}

      ${p ? `
      <h2 class="account-h2">Perfil de competidor</h2>
      <form class="login-form account-form" data-form="perfil" novalidate>
        <div class="form-row">
          <div class="login-form-group"><label class="login-form-label" for="pf-dn">Nombre visible</label><input id="pf-dn" name="display_name" class="login-form-input" maxlength="32" value="${esc(p.display_name || '')}"></div>
          <div class="login-form-group"><label class="login-form-label" for="pf-country">País</label><input id="pf-country" name="country" class="login-form-input" maxlength="56" value="${esc(p.country || '')}"></div>
        </div>
        <div class="form-row">
          <div class="login-form-group"><label class="login-form-label" for="pf-region">Región</label><select id="pf-region" name="region" class="login-form-input">${opt('', p.region, '—')}${opt('EU', p.region, 'Europa')}${opt('LATAM', p.region, 'LATAM')}${opt('NA', p.region, 'Norteamérica')}${opt('BR', p.region, 'Brasil')}${opt('APAC', p.region, 'Asia-Pacífico')}</select></div>
          <div class="login-form-group"><label class="login-form-label" for="pf-game">Juego principal</label><select id="pf-game" name="main_game" class="login-form-input">${opt('', p.main_game, '—')}${opt('valorant', p.main_game, 'VALORANT')}${opt('cs2', p.main_game, 'Counter-Strike 2')}${opt('lol', p.main_game, 'League of Legends')}</select></div>
        </div>
        <div class="login-form-group"><label class="login-form-label" for="pf-bio">Bio</label><textarea id="pf-bio" name="bio" class="login-form-input" maxlength="280" rows="3">${esc((me.profile && me.profile.bio) || '')}</textarea></div>
        <div class="login-form-group"><label class="login-form-label" for="pf-vis">Visibilidad del perfil</label><select id="pf-vis" name="visibility" class="login-form-input">${opt('public', me.profile && me.profile.visibility, 'Público')}${opt('friends', me.profile && me.profile.visibility, 'Solo amigos')}${opt('private', me.profile && me.profile.visibility, 'Privado')}</select></div>
        <button type="submit" class="btn btn-secondary login-submit">Guardar perfil</button>
      </form>` : ''}

      <h2 class="account-h2">Mis torneos</h2>
      <div data-list="entries"><p class="login-note">Cargando…</p></div>
      <h2 class="account-h2">Compras y tickets</h2>
      <div data-list="purchases"><p class="login-note">Cargando…</p></div>
      <h2 class="account-h2">Soporte</h2>
      <div data-list="support"><p class="login-note">Cargando…</p></div>
      ${p ? `
      <details class="support-box"><summary>Abrir un ticket de soporte</summary>
        <div class="auth-msg" data-support-msg role="status" aria-live="polite" hidden></div>
        <form class="login-form" data-form="soporte" novalidate>
          <div class="login-form-group"><label class="login-form-label" for="st-cat">Categoría</label><select id="st-cat" name="category" class="login-form-input"><option value="cuenta">Cuenta y acceso</option><option value="pagos">Pagos</option><option value="torneos">Torneos</option><option value="ranked">Ranked</option><option value="otro">Otro</option></select></div>
          <div class="login-form-group"><label class="login-form-label" for="st-sub">Asunto</label><input id="st-sub" name="subject" class="login-form-input" maxlength="120" required></div>
          <div class="login-form-group"><label class="login-form-label" for="st-desc">Descripción</label><textarea id="st-desc" name="description" class="login-form-input" rows="4" maxlength="2000" required></textarea></div>
          <button type="submit" class="btn btn-secondary login-submit">Enviar ticket</button>
        </form>
      </details>` : ''}

      <div class="account-actions">
        ${plan !== 'elite' ? '<a href="#/precios" class="btn btn-primary">Mejorar plan</a>' : ''}
        <button type="button" class="btn btn-secondary" data-logout>Cerrar sesión</button>
      </div>`;
    loadAccountLists(root);
  }

  async function loadAccountLists(root) {
    if (!root || !me || !me.player) {
      root && root.querySelectorAll('[data-list]').forEach((el) => { el.innerHTML = '<p class="login-note">Disponible cuando tu perfil de jugador esté listo.</p>'; });
      return;
    }
    const pid = me.player.id;
    const set = (k, h) => { const el = root.querySelector(`[data-list="${k}"]`); if (el) el.innerHTML = h; };
    const [en, pu, tk, su] = await Promise.all([
      sb.from('tournament_entries').select('status, registered_at, tournament:tournaments(name, slug, starts_at)').eq('player_id', pid),
      sb.from('purchases').select('tier, amount_cents, currency, payment_status, paid_at, created_at').eq('player_id', pid).order('created_at', { ascending: false }),
      sb.from('tickets').select('tier, status, amount_cents, currency, purchased_at').eq('player_id', pid),
      sb.from('support_tickets').select('subject, status, category, created_at').eq('player_id', pid).order('created_at', { ascending: false }),
    ]);
    set('entries', (en.data || []).length ? `<ul class="account-purchases">${en.data.map((e) => e.tournament ? `<li><a href="#/torneo/${encodeURIComponent(e.tournament.slug)}">${esc(e.tournament.name)}</a><span>${esc(e.status)}</span><span>${e.tournament.starts_at ? new Date(e.tournament.starts_at).toLocaleDateString('es-ES') : '—'}</span><span></span></li>` : '').join('')}</ul>` : '<p class="login-note">No estás inscrito en ningún torneo. <a href="#/torneos">Ver torneos</a></p>');
    const buys = [...(pu.data || []).map((x) => ({ t: x.tier, a: x.amount_cents, c: x.currency, s: x.payment_status, d: x.paid_at || x.created_at })), ...(tk.data || []).map((x) => ({ t: x.tier, a: x.amount_cents, c: x.currency, s: x.status, d: x.purchased_at }))];
    set('purchases', buys.length ? `<ul class="account-purchases">${buys.map((b) => `<li><span>${esc(String(b.t || '').toUpperCase())}</span><span>${b.a != null ? (b.a / 100).toFixed(2) + ' ' + esc(String(b.c || 'eur').toUpperCase()) : '—'}</span><span>${esc(b.s === 'paid' || b.s === 'succeeded' ? 'Pagado' : b.s || '—')}</span><span>${b.d ? new Date(b.d).toLocaleDateString('es-ES') : ''}</span></li>`).join('')}</ul>` : '<p class="login-note">Aún no tienes compras.</p>');
    set('support', (su.data || []).length ? `<ul class="account-purchases">${su.data.map((s) => `<li><span>${esc(s.subject)}</span><span>${esc(s.category || '')}</span><span>${esc(s.status)}</span><span>${new Date(s.created_at).toLocaleDateString('es-ES')}</span></li>`).join('')}</ul>` : '<p class="login-note">No tienes tickets abiertos.</p>');
  }

  async function pollPlan(msgEl) {
    for (let i = 0; i < 10; i++) {
      await loadMe();
      if (me && me.plan !== 'free') { updateHeader(); return showMsg(msgEl, 'Pago confirmado. Tu plan ' + me.plan.toUpperCase() + ' ya está activo.', 'success'); }
      await new Promise((r) => setTimeout(r, 3000));
    }
    showMsg(msgEl, 'Stripe ha recibido tu pago. La activación puede tardar unos minutos; si no aparece, escríbenos a feispla@hotmail.com.', 'info');
  }

  // ---------- enlazado tras cada render ----------
  function bindForm(form, msg) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const h = HANDLERS[form.dataset.form];
      if (!h || !sb) return;
      showMsg(msg, '', 'info');
      setBusy(form, true);
      try { await h(form, msg); } catch (err) { showMsg(msg, humanError(err), 'error'); } finally { setBusy(form, false); }
    });
  }

  function afterRender(pageId) {
    const main = document.getElementById('main');
    if (!main) return;
    updateHeader();
    const msg = main.querySelector('[data-auth-msg]');
    if (!sb && main.querySelector('[data-form],[data-oauth],[data-checkout]')) showMsg(msg, 'No se pudo cargar el sistema de inicio de sesión. Recarga la página.', 'error');
    if ((pageId === 'login' || pageId === 'registro') && session) showMsg(msg, 'Ya tienes la sesión iniciada como ' + displayName() + '.', 'info');
    const flash = flags.get('vant_flash');
    if (flash && msg) { const f = JSON.parse(flash); flags.del('vant_flash'); showMsg(msg, f.text, f.kind); }

    main.querySelectorAll('[data-oauth]').forEach((b) => b.addEventListener('click', () => oauth(b.dataset.oauth, msg)));
    if (pageId !== 'cuenta') main.querySelectorAll('form[data-form]').forEach((f) => bindForm(f, msg));
    main.querySelectorAll('[data-checkout]').forEach((b) => b.addEventListener('click', () => startCheckout(b.dataset.checkout, msg, b)));

    if (pageId === 'cuenta') {
      const root = main.querySelector('[data-account]');
      const draw = () => {
        renderAccount(root);
        const m = root.querySelector('[data-auth-msg]');
        const lo = root.querySelector('[data-logout]');
        if (lo) lo.addEventListener('click', () => logout());
        const ld = root.querySelector('[data-link-discord]');
        if (ld) ld.addEventListener('click', () => linkProvider('discord', m));
        const lg = root.querySelector('[data-link-google]');
        if (lg) lg.addEventListener('click', () => linkProvider('google', m));
        const ls = root.querySelector('[data-link-steam]');
        if (ls) ls.addEventListener('click', () => linkSteam(m, ls));
        const us = root.querySelector('[data-unlink-steam]');
        if (us) us.addEventListener('click', () => unlinkSteam(m, us));
        const pf = root.querySelector('form[data-form="perfil"]'); if (pf) bindForm(pf, m);
        const st = root.querySelector('form[data-form="soporte"]'); if (st) bindForm(st, root.querySelector('[data-support-msg]'));
        const fl = flags.get('vant_flash'); if (fl && m) { const f = JSON.parse(fl); flags.del('vant_flash'); showMsg(m, f.text, f.kind); }
      };
      if (session && !me) loadMe().then(draw); else draw();
      if (session && me && !me.player) setTimeout(() => loadMe().then(() => { if (window.location.hash === '#/cuenta') draw(); }), 2500);
    }
    if (pageId === 'precios' && session && !flags.get('vant_vp')) { flags.set('vant_vp', '1'); logEvent('visita_precios', {}); }
    if (pageId === 'checkout/exito') {
      if (session) pollPlan(msg); else showMsg(msg, 'Stripe ha recibido tu pago. Inicia sesión para ver tu plan activo.', 'info');
    }
  }

  // Cierre de sesión robusto: aunque falle la red, se borra la sesión local para poder
  // volver a entrar con Discord, Google o Steam sin quedarse bloqueado.
  async function logout() {
    await logEvent('cierre_sesion', {});
    try { await sb.auth.signOut({ scope: 'local' }); } catch (_) { /* se limpia igualmente */ }
    session = null; me = null; providers = null;
    if (window.VantDB && window.VantDB.invalidate) window.VantDB.invalidate();
    updateHeader();
    go('inicio');
  }

  window.VantAuth = { logout, isAdmin: () => Boolean(me && me.adminRole), get adminRole() { return me && me.adminRole; }, plan: () => (me ? me.plan : 'free'), loadMe, afterRender, bindTournament, rsvp, client: sb, get session() { return session; }, get me() { return me; } };

  // ---------- arranque ----------
  async function boot() {
    if (!sb) { updateHeader(); return; }
    const params = new URLSearchParams(window.location.search);
    // Supabase puede devolver el error en el hash (#error=...&error_description=...)
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    if (/^(error|error_code|error_description)=/.test(rawHash)) {
      new URLSearchParams(rawHash).forEach((v, k) => { if (!params.has(k)) params.set(k, v); });
      if (!params.has('next')) params.set('next', 'login');
    }
    const next = params.get('next');
    const authErr = params.get('error_description');
    const steamToken = params.get('steam_token');
    const steamErr = params.get('steam_error');
    const steamLinked = params.get('steam_linked');

    if (steamToken) {
      const { error } = await sb.auth.verifyOtp({ token_hash: steamToken, type: params.get('steam_type') || 'magiclink' });
      if (error) flags.set('vant_flash', JSON.stringify({ text: STEAM_ERRORS.login_failed, kind: 'error' }));
      else flags.set('vant_flash', JSON.stringify({ text: 'Sesión iniciada con Steam.', kind: 'success' }));
    }
    if (steamErr) flags.set('vant_flash', JSON.stringify({ text: STEAM_ERRORS[steamErr] || STEAM_ERRORS.login_failed, kind: steamErr === 'cancelled' ? 'info' : 'error' }));
    if (steamLinked) flags.set('vant_flash', JSON.stringify({ text: 'Cuenta de Steam vinculada y verificada.', kind: 'success' }));

    const { data } = await sb.auth.getSession();
    session = data.session;
    if (session) await loadMe();
    updateHeader();

    if (next || authErr || params.get('code') || steamToken || steamErr || steamLinked) {
      if (authErr) {
        flags.set('vant_flash', JSON.stringify({ text: /exchange external code|flow.state|state parameter/i.test(authErr) ? humanError({ message: authErr }) : /expired|invalid/i.test(authErr) ? 'El enlace ha caducado o ya se usó. Solicita uno nuevo.' : humanError({ message: authErr }), kind: 'error' }));
      } else if (!session && params.get('code') && !steamToken) {
        flags.set('vant_flash', JSON.stringify({ text: 'Correo confirmado. Inicia sesión con tu contraseña (el enlace se abrió en otro navegador).', kind: 'info' }));
      }
      const target = session ? (next || 'cuenta') : (next === 'nueva-contrasena' ? 'recuperar' : 'login');
      window.history.replaceState(null, '', baseUrl() + '#/' + target);
      if (typeof router === 'function') router();
    } else if (typeof router === 'function') {
      const cur = window.location.hash.replace('#/', '').split('?')[0];
      if (['cuenta', 'login', 'registro', 'checkout/exito', 'nueva-contrasena', 'admin', 'zona'].includes(cur) || cur.startsWith('torneo/')) router();
    }

    sb.auth.onAuthStateChange(async (event, s) => {
      const prev = session;
      session = s;
      if (event === 'PASSWORD_RECOVERY') { go('nueva-contrasena'); return; }
      if (event === 'SIGNED_OUT' || (s && (!prev || prev.user.id !== s.user.id))) {
        if (s) { await loadMe(); logEvent('inicio_sesion', { proveedor: (s.user.app_metadata || {}).provider || 'email' }); } else me = null;
        updateHeader();
        const cur = window.location.hash.replace('#/', '');
        if (['cuenta', 'admin', 'zona'].includes(cur) && typeof router === 'function') router();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
