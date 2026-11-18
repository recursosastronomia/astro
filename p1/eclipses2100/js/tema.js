/* Sombras sonoras (versión p1) — botones de modo noche y alto contraste.
   La elección es la misma para todo el portal p1 (copia del criterio de ../js/tema.js; la app
   guarda su propia copia para funcionar sin conexión desde su carpeta):
     localStorage "astro-tema"      → "noche" | "dia"
     localStorage "astro-contraste" → "1" | "0"
   En <html> deja data-theme="dark" (noche o alto contraste), data-contrast="alto" y
   data-ue-theme = "light" | "dark" | "hc" (lo usa css/app.css). El primer paso se hace
   en el <head> de index.html, antes de pintar; este archivo maneja los botones y
   vuelve a aplicar la elección al volver con «Atrás» o si cambia en otra pestaña. */
(function () {
  'use strict';
  var root = document.documentElement;
  var memTema = null, memHc = null;
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado: vale para esta página */ } }
  function mm(q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } }
  function tema() { return leer('astro-tema') || memTema; }
  function hcOn() { return (leer('astro-contraste') || memHc) === '1'; }
  function btns() { return { t: document.getElementById('tema-btn'), h: document.getElementById('hc-btn') }; }

  function aplicar() {
    var t = tema(), hc = hcOn();
    var noche = hc || t === 'noche' || (!t && mm('(prefers-color-scheme: dark)'));
    if (noche) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    if (hc) root.setAttribute('data-contrast', 'alto'); else root.removeAttribute('data-contrast');
    root.setAttribute('data-ue-theme', hc ? 'hc' : (noche ? 'dark' : 'light'));
    var b = btns();
    if (b.t) b.t.setAttribute('aria-pressed', String(noche && !hc));
    if (b.h) b.h.setAttribute('aria-pressed', String(hc));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', hc ? '#000000' : '#0b1730');
  }
  window.AstroTema = { aplicar: aplicar };
  aplicar();

  window.addEventListener('pageshow', aplicar);
  window.addEventListener('storage', function (e) { if (e.key === 'astro-tema' || e.key === 'astro-contraste') aplicar(); });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (!tema()) aplicar(); }); } catch (e) { /* navegadores antiguos */ }

  function avisar(clave) {
    var live = document.getElementById('live');
    if (!live || typeof STRINGS === 'undefined') return;
    var lang = (root.getAttribute('lang') || 'es').slice(0, 2);
    var s = (STRINGS[lang] && STRINGS[lang][clave]) || (STRINGS.es && STRINGS.es[clave]);
    if (s) { live.textContent = ''; setTimeout(function () { live.textContent = s; }, 50); }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var b = btns();
    aplicar();
    if (b.t) b.t.addEventListener('click', function () {
      // Desde alto contraste, «Modo noche» vuelve al modo noche normal
      var noche = hcOn() ? true : root.getAttribute('data-theme') !== 'dark';
      memTema = noche ? 'noche' : 'dia'; memHc = '0';
      guardar('astro-tema', memTema); guardar('astro-contraste', '0');
      aplicar(); avisar(noche ? 'mode_night_on' : 'mode_light_on');
    });
    if (b.h) b.h.addEventListener('click', function () {
      var on = !hcOn();
      memHc = on ? '1' : '0'; guardar('astro-contraste', memHc);
      aplicar(); avisar(on ? 'mode_hc_on' : 'mode_hc_off');
    });
  });
})();
