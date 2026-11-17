/* Sombras sonoras — cálculo de la lista de eclipses en segundo plano (no traba la pantalla en celulares lentos) */
importScripts('astronomy.browser.min.js', 'eclipses.js');
self.onmessage = function (e) {
  try { self.postMessage({ ok: true, list: EclipseList.forPlace(e.data) }); }
  catch (err) { self.postMessage({ ok: false, error: String(err) }); }
};
