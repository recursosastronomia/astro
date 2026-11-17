/* Sombras sonoras — service worker: guarda la app para que funcione sin conexión.
   Al cambiar cualquier archivo, subir VERSION: así se instala la versión nueva y aparece el aviso «Actualizar». */
const VERSION = 'sombras-1.3.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/strings.js', 'js/cities.js', 'js/astronomy.browser.min.js', 'js/eclipses.js', 'js/luna.js', 'js/audio.js', 'js/app.js', 'js/worker.js',
  'img/sol/sol-respaldo.jpg', 'img/luna/luna-lroc-cercana.jpg', 'img/seguridad/lentes.jpg',
  'icons/icon-192.png', 'icons/favicon-48.png', 'icons/apple-touch-icon.png'
];
// Archivos compartidos del portal y fotos que pueden faltar: se guardan si están, sin impedir la instalación
const OPTIONAL = [
  '../ue/ue.css', '../ue/ue.js',
  '../ue/fonts/fraunces-latin-wght-normal.woff2',
  '../ue/fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  '../ue/fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  'img/seguridad/proyeccion.jpg', 'img/seguridad/telescopio-filtro.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache =>
    cache.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))
      .then(() => Promise.all(OPTIONAL.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {}))))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('sombras-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', event => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // la imagen del Sol de SDO va directo a la red
  event.respondWith(caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
