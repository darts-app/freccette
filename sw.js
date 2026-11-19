/* Darts (ex Freccette) — service worker: tiene l'app nel telefono così funziona senza rete (come Flow) */
const VERSION = '0.3.0';           // tenere uguale a VERSION in js/app.js
const CACHE = 'freccette-' + VERSION;
const FILES = ['./', 'index.html', 'app.css', 'manifest.json', 'img/darts-180.png', 'img/darts-512.png',
  'js/board.js', 'js/checkout.js', 'js/parse.js', 'js/game.js', 'js/bot.js', 'js/stats.js', 'js/store.js',
  'js/voice.js', 'js/app.js', 'js/views.js', 'js/play.js', 'js/train.js', 'js/drill.js'];

self.addEventListener('install', (e) => {
  // cache: 'reload' = prende i file freschi dal sito, non copie vecchie del browser
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('freccette-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Prima la copia nel telefono, poi la rete
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
