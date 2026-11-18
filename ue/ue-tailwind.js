/* =========================================================================
   Astronomía para todos — ajustes compartidos para las páginas con Tailwind
   -------------------------------------------------------------------------
   Se carga DESPUÉS de ue/vendor/tailwindcss/tailwindcss-play-3.4.5.js (copia local del Play CDN) y ANTES de «tailwind.config».
   Uso en la página:
       tailwind.config = UE_TW.config();                      // lo habitual
       tailwind.config = UE_TW.config({ neutral: ['slate', 'gray', 'blue'] });
       tailwind.config = UE_TW.config({ extend: { colors: {...} } });   // extras propios
       tailwind.config = UE_TW.config({ fixed: true });       // la página ya resuelve su modo claro
       tailwind.config = UE_TW.config({ space: true });       // paleta «space» / «solar» (Misión Helios anterior)
       tailwind.config = UE_TW.config({ accent: false });     // conservar los colores de acento propios

   Qué hace:
   - Tipografías del portal (Atkinson Hyperlegible y Fraunces).
   - Las escalas de grises indicadas en «neutral» pasan a la paleta tinta/papel
     y cambian solas con el modo claro / noche (variables --ue-n-* de ue.css).
   - Los textos de color claros (text-sky-300, text-yellow-400…) se oscurecen
     en modo claro para mantener el contraste (variables --ue-t-*).
   - Todos los colores de acento (violeta, índigo, cian, celeste, azul, amarillo, naranja…) pasan a
     ser el ámbar del portal; verde y rojo se conservan porque indican acierto y error.
   - Con { fixed: true } los grises pasan a la paleta tinta pero con valores fijos (no cambian
     con el modo): para páginas que ya tienen sus propias reglas de modo claro o clases «dark:».
   ========================================================================= */
(function () {
  'use strict';
  var v = function (n) { return 'rgb(var(--ue-' + n + ') / <alpha-value>)'; };
  var SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950];
  var HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

  // Acento único del portal: ámbar (el de Misión Helios). Reemplaza violetas, cianes, azules, amarillos…
  // No se tocan verde/esmeralda/lima ni rojo/rosa: indican acierto y error.
  var AMBER = { 50: '#fff8e6', 100: '#fff3d6', 200: '#ffe3a3', 300: '#ffd88a', 400: '#ffc85a', 500: '#ffb627', 600: '#f0a00a', 700: '#c98a0f', 800: '#5a4410', 900: '#3d2e0c', 950: '#2a1f08' };
  var ACCENTS = ['purple', 'violet', 'indigo', 'fuchsia', 'pink', 'cyan', 'sky', 'teal', 'blue', 'yellow', 'orange', 'amber'];
  function accentText() {
    // Texto ámbar legible en papel y en noche (variable --ue-t-solar de ue.css); los tonos muy oscuros, tinta
    var o = {};
    [50, 100, 200, 300, 400, 500, 600, 700].forEach(function (s) { o[s] = v('t-solar'); });
    [800, 900, 950].forEach(function (s) { o[s] = '#14264b'; });
    return o;
  }
  function addAccents(colors, text, neutral) {
    ACCENTS.forEach(function (h) {
      if (neutral.indexOf(h) >= 0) return;   // p. ej. «blue» usado como fondo neutro en los juegos
      colors[h] = AMBER;
      text[h] = accentText();
    });
  }

  function neutralScale(only) {
    var o = {};
    (only || SHADES).forEach(function (s) { o[s] = v('n-' + s); });
    return o;
  }
  function merge(a, b) {
    for (var k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = merge(a[k] && typeof a[k] === 'object' ? a[k] : {}, b[k]);
      else a[k] = b[k];
    }
    return a;
  }

  window.UE_TW = {
    config: function (opt) {
      opt = opt || {};
      var neutral = opt.neutral || ['slate', 'gray'];
      if (opt.fixed) {
        var INK = { 50: '#f8fafd', 100: '#eef2fa', 200: '#e2e8f4', 300: '#cdd6e8', 400: '#b4c0d9', 500: '#8f9bb3', 600: '#4b5f8a', 700: '#2e4472', 800: '#1c3260', 850: '#182b56', 900: '#14264b', 950: '#0b1730' };
        var fxColors = { slate: INK, gray: INK }, fxText = {};
        if (opt.accent !== false) addAccents(fxColors, fxText, []);
        var fx = { darkMode: 'class', theme: { extend: { colors: fxColors, textColor: fxText, fontFamily: {
          sans: ['"Atkinson Hyperlegible"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
          display: ['Fraunces', '"Iowan Old Style"', 'Georgia', 'serif'] } } } };
        if (opt.extend) merge(fx.theme.extend, opt.extend);
        return fx;
      }
      var colors = {};
      var text = { white: v('t-white') };
      HUES.forEach(function (h) { text[h] = { 200: v('t-' + h + '-200'), 300: v('t-' + h + '-300'), 400: v('t-' + h + '-400') }; });
      neutral.forEach(function (name) {
        // «blue» usado como fondo general: solo sus tonos muy oscuros y muy claros son neutros
        colors[name] = name === 'blue' ? neutralScale([100, 200, 300, 700, 800, 900, 950]) : neutralScale();
        if (name !== 'blue') delete text[name];
        else {
          // los tonos medios de «blue» (botones, resaltados) son acento: ámbar
          if (opt.accent !== false) { colors.blue[400] = AMBER[400]; colors.blue[500] = AMBER[500]; colors.blue[600] = AMBER[600]; text.blue = { 400: v('t-solar'), 500: v('t-solar'), 600: v('t-solar') }; }
          else text.blue = { 400: v('t-blue-400') };
        }
      });
      if (opt.accent !== false) addAccents(colors, text, neutral);
      if (opt.space) {
        // Fondos «space» = escala neutra del portal; acento «solar» = ámbar del portal
        colors.space = neutralScale([600, 700, 800, 850, 900, 950]);
        colors.solar = { 300: '#ffd88a', 400: '#ffc85a', 500: '#ffb627', glow: '#f0a00a' };
        text.solar = { 300: v('t-solar'), 400: v('t-solar'), 500: v('t-solar') };
        text.space = { 900: v('n-900'), 950: v('n-950') };
      }
      var cfg = {
        darkMode: 'class',
        theme: { extend: {
          colors: colors,
          textColor: text,
          fontFamily: {
            sans: ['"Atkinson Hyperlegible"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
            display: ['Fraunces', '"Iowan Old Style"', 'Georgia', 'serif'],
            mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
          }
        } }
      };
      if (opt.extend) merge(cfg.theme.extend, opt.extend);
      return cfg;
    }
  };
})();
