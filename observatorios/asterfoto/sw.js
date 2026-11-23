/* Service worker — Planificador de asteroides
   Cambiar CACHE_VERSION cada vez que se publiquen cambios (también al actualizar los archivos sbdb_*.json).
   El número ?v= de estilos y scripts debe ser el mismo que en index.html. */
const CACHE_VERSION = 'asterfoto-v18';
const SHELL = [
  './', './index.html', './planificador.html', './comparador.html', './fuentes.html', './manifest.webmanifest',
  './css/app.css?v=2.8',
  './js/i18n.js?v=2.8', './js/i18n-extra.js?v=2.8', './js/pagina.js?v=2.8', './js/comparador.js?v=2.8', './js/vendor/mp4-muxer.js?v=5.2.2', './js/demo.js?v=2.8',
  './js/lugares.js?v=2.8', './js/cielo.js?v=2.8', './js/astro.js?v=2.8', './js/app.js?v=2.8',
  './sbdb_brillantes.json', './sbdb_neo.json'
];
const EXTRAS = [
  '../../ue/ue.css', '../../ue/ue.js', '../../ue/ue-licencia.js', '../../img/logo-edytic-marca.png',
  '../../ue/fonts/atkinson-hyperlegible-latin-400-normal.woff2', '../../ue/fonts/atkinson-hyperlegible-latin-400-italic.woff2',
  '../../ue/fonts/atkinson-hyperlegible-latin-700-normal.woff2', '../../ue/fonts/fraunces-latin-wght-normal.woff2',
  './icons/icon-192.png', './js/estrellas8.js?v=1'
];
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(SHELL);
    await Promise.all(EXTRAS.map((u) => cache.add(u).catch(() => null)));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE_VERSION && k.startsWith('asterfoto-')) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Las imágenes de Wikimedia Commons (otro origen) tampoco se guardan: sin conexión, las figuras se ocultan
  // El video de demostración no se guarda para usar sin conexión (es grande y se pide por partes)
  if (req.headers.has('range') || /\/demo\//.test(new URL(req.url).pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
