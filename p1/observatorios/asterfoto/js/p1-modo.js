/* Asteroides a la vista (versión p1) — puente de modos.
   El modo noche y el alto contraste los maneja ../../js/tema.js de p1 (claves astro-tema y
   astro-contraste, atributos data-theme y data-contrast en <html>). Los estilos propios de la app
   (css/app.css) usan además data-ue-theme = "light" | "dark" | "hc": este archivo lo mantiene
   al día cada vez que tema.js cambia el modo. Va en el <head>, después del script que aplica la
   elección antes de pintar. */
(function () {
  var r = document.documentElement;
  function sync() {
    var hc = r.getAttribute('data-contrast') === 'alto', dark = r.getAttribute('data-theme') === 'dark';
    var v = hc ? 'hc' : (dark ? 'dark' : 'light');
    if (r.getAttribute('data-ue-theme') !== v) r.setAttribute('data-ue-theme', v);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', hc ? '#000000' : '#0b1730');
  }
  sync();
  if (window.MutationObserver) new MutationObserver(sync).observe(r, { attributes: true, attributeFilter: ['data-theme', 'data-contrast'] });
})();
