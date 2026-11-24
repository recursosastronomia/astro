// Cartas astronómicas: la práctica y el catálogo funcionan sin conexión; las partidas en línea siempre van a la planilla.
const C = "naipes-v4";
const F = ["./", "index.html", "config.js", "data.js", "manifest.json", "icon.svg",
  "../ue/ue.css", "../ue/ue.js", "../ue/ue-licencia.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => Promise.all(F.map(u => c.add(u).catch(() => {}))))); });
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || e.request.url.includes("script.google")) return; // nunca guardar datos de partidas
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
