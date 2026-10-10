// ============================================
// VANTS — Páginas de autenticación (Auth0)
// Restaura login, registro, recuperar, cuenta y checkout, que se perdieron
// al migrar auth.js a Auth0. Los botones usan data-oauth y los formularios
// data-form, que auth.js ya enlaza en afterRender().
// Cargar DESPUÉS de app.js.
// ============================================
(function () {
  'use strict';
  if (typeof DOC_CONTENT !== 'object') return;

  // [clave usada por auth.js, nombre visible]
  var PROVIDERS = [
    ['google', 'Google'],
    ['discord', 'Discord'],
    ['kick', 'Kick'],
  ];
  var PLANS = {
    basic: { name: 'VANT BASIC', price: 9 },
    pro: { name: 'VANT PRO', price: 19 },
    elite: { name: 'VANT ELITE', price: 39 },
  };

  function buttons(verb) {
    return '<div class="login-methods">' + PROVIDERS.map(function (p) {
      return '<button type="button" class="login-btn login-btn-' + p[0] + '" data-oauth="' + p[0] + '">' + verb + ' con ' + p[1] + '</button>';
    }).join('') + '</div>';
  }
  var MSG = '<div class="auth-msg" data-auth-msg role="status" aria-live="polite" hidden></div>';
  function field(id, label, name, type, extra) {
    return '<div class="login-form-group"><label class="login-form-label" for="' + id + '">' + label + '</label>' +
      '<input id="' + id + '" name="' + name + '" type="' + type + '" class="login-form-input" ' + (extra || '') + ' required></div>';
  }

  var PAGES = {
    'login': {
      title: 'Iniciar sesión — VANTCALL Esports',
      content: '<div class="login-page"><h1>Iniciar sesión</h1>' +
        '<p class="login-sub">Accede con Google, Discord, Kick o tu correo</p>' + MSG +
        buttons('Continuar') +
        '<div class="login-divider"><span>o con correo</span></div>' +
        '<form class="login-form" data-form="login" novalidate>' +
        field('li-email', 'Correo electrónico', 'email', 'email', 'placeholder="tu@correo.com" autocomplete="email"') +
        field('li-pass', 'Contraseña', 'password', 'password', 'placeholder="••••••••••••" autocomplete="current-password"') +
        '<div class="login-form-actions"><span></span><a href="#/recuperar">¿Olvidaste tu contraseña?</a></div>' +
        '<button type="submit" class="btn btn-primary login-submit">Iniciar sesión</button></form>' +
        '<p class="login-note">VANTS nunca te pedirá tu contraseña de Google, Discord o Kick: el acceso ocurre en su propia web y tu sesión la gestiona Auth0.</p>' +
        '<p class="login-switch">¿No tienes cuenta? <a href="#/registro">Regístrate gratis</a></p></div>',
    },
    'registro': {
      title: 'Registro — VANTCALL Esports',
      content: '<div class="login-page"><h1>Crear cuenta</h1>' +
        '<p class="login-sub">Tu identidad de competidor para VALORANT, CS2 y LoL</p>' + MSG +
        buttons('Registrarse') +
        '<div class="login-divider"><span>o con correo</span></div>' +
        '<form class="login-form" data-form="registro" novalidate>' +
        field('rg-user', 'Nickname', 'username', 'text', 'placeholder="3-16 caracteres, sin espacios" minlength="3" maxlength="16" autocomplete="nickname"') +
        field('rg-email', 'Correo electrónico', 'email', 'email', 'placeholder="tu@correo.com" autocomplete="email"') +
        field('rg-pass', 'Contraseña', 'password', 'password', 'placeholder="Mínimo 12, con mayúscula, minúscula y número" minlength="12" autocomplete="new-password"') +
        field('rg-pass2', 'Confirmar contraseña', 'password2', 'password', 'autocomplete="new-password"') +
        '<label class="check-row"><input type="checkbox" name="age" required> Tengo 16 años o más y acepto los términos y el código de conducta.</label>' +
        '<button type="submit" class="btn btn-primary login-submit">Crear cuenta</button></form>' +
        '<p class="login-switch">¿Ya tienes cuenta? <a href="#/login">Inicia sesión</a></p></div>',
    },
    'recuperar': {
      title: 'Recuperar contraseña — VANTCALL Esports',
      content: '<div class="login-page"><h1>Recuperar contraseña</h1>' +
        '<p class="login-sub">Te enviaremos un enlace de un solo uso</p>' + MSG +
        '<form class="login-form" data-form="recuperar" novalidate>' +
        field('rc-email', 'Correo electrónico', 'email', 'email', 'placeholder="tu@correo.com" autocomplete="email"') +
        '<button type="submit" class="btn btn-primary login-submit">Enviar enlace</button></form>' +
        '<p class="login-switch"><a href="#/login">Volver a iniciar sesión</a></p></div>',
    },
    'cuenta': {
      title: 'Mi cuenta — VANTCALL Esports',
      content: '<div class="account-page" data-account><div class="skeleton-list"><div class="skeleton-row"></div><div class="skeleton-row"></div></div></div>',
    },
    'checkout/exito': {
      title: 'Pago recibido — VANTCALL Esports',
      content: '<div class="login-page"><h1>Pago recibido</h1><p class="login-sub">Gracias por apoyar VANTCALL.</p>' +
        '<div class="auth-msg auth-msg-info" data-auth-msg role="status" aria-live="polite">Confirmando el pago con Stripe…</div>' +
        '<p class="login-switch"><a href="#/cuenta" class="btn btn-primary">Ver mi cuenta</a></p></div>',
    },
  };
  Object.keys(PLANS).forEach(function (k) {
    var p = PLANS[k];
    PAGES['checkout/' + k] = {
      title: 'Checkout — ' + p.name,
      content: '<h1>Checkout — ' + p.name + '</h1>' +
        '<p class="breadcrumb"><a href="#/precios">Precios</a> <span>/</span> Checkout</p>' +
        '<div class="checkout-box"><div class="checkout-summary"><h3>Resumen del pedido</h3>' +
        '<div class="checkout-line"><span>' + p.name + ' — Pago único</span><span>€' + p.price.toFixed(2) + '</span></div>' +
        '<div class="checkout-line"><span>IVA</span><span>Incluido</span></div>' +
        '<div class="checkout-line checkout-total"><span>Total</span><span>€' + p.price.toFixed(2) + '</span></div></div>' +
        '<div class="checkout-actions">' + MSG +
        '<p>Serás redirigido a la pasarela segura de Stripe. El plan se activa en tu cuenta cuando Stripe confirma el pago.</p>' +
        '<button type="button" class="btn btn-primary checkout-pay-btn" data-checkout="' + k + '">Pagar con Stripe</button>' +
        '<a href="#/precios" class="btn btn-secondary">Volver</a></div></div>',
    };
  });
  Object.assign(DOC_CONTENT, PAGES);
})();
