// VANTS — Service Worker: cache de la app shell para carga rapida y soporte offline basico
const VERSION = 'vants-v5';
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
  './privacidad.html',
  './terminos.html',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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

  // Estaticos: cache-first, actualiza en segundo plano
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const net = fetch(event.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
