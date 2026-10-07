// VANTS — Service Worker: cache de la app shell para carga rapida y soporte offline basico
const VERSION = 'vants-v4';
const SHELL = [
  './',
  './index.html',
  './bundle.css',
  './vantcall-cls-fixes.css',
  './app.js',
  './db.js',
  './auth.js',
  './zona.js',
  './premium.js',
  './ranks.js',
  './vendor/supabase-2.57.4.min.js',
  './assets/brand/favicon.svg',
  './assets/brand/vants-mark.svg',
  './assets/hero-arena.webp',
  './privacidad.html',
  './terminos.html',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  // Precache tolerante: un asset que falle NO rompe la instalacion completa.
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      // Avisar a las pestañas abiertas que hay version nueva para que recarguen.
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: VERSION })))
  );
});

// La pagina pide activar el SW nuevo en cuanto esta listo.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Solo GET de nuestro origen. Supabase y otras APIs van siempre a red.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegacion: network-first con fallback a la app shell cacheada (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Estaticos: network-first (los despliegues nuevos se ven al instante),
  // con fallback a cache si no hay conexion.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
