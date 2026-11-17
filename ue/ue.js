/* =========================================================================
   Astronomía para todos — modo visual compartido del portal
   -------------------------------------------------------------------------
   Guarda UNA sola preferencia para todo el sitio y la aplica en cada página:
     localStorage "ue.theme" = "light" | "dark"
     localStorage "ue.hc"    = "1" | "0"        (alto contraste)
   Así, al pasar de la portada a una sección (o al revés) se hereda el modo.

   En <html> deja:
     data-ue-theme = "light" | "dark" | "hc"
     data-ue-base  = "light" | "dark"
     class "dark"  (modo noche o alto contraste; lo usan las páginas con Tailwind)
     data-theme    (solo si la página ya lo usaba: "light" | "dark")

   Botones: se dibujan dentro de cada elemento con el atributo data-ue-tools.
   Si la página no tiene ninguno y <body> lleva data-ue-bar, se agrega la barra
   superior del portal completa (inicio + marca + botones).

   Para reaccionar desde una página:
     document.addEventListener('ue:theme', e => e.detail  // {theme, base, hc, dark}
     window.UETheme.get() / .setBase('dark') / .toggleBase() / .toggleHc()

   Este archivo se carga en el <head> sin "defer" para aplicar el modo antes
   de pintar la página.
   ========================================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var K_THEME = 'ue.theme', K_HC = 'ue.hc';

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado: se sigue sin guardar */ } }
  function mm(q) { try { return window.matchMedia && window.matchMedia(q).matches; } catch (e) { return false; } }

  // ---------- Estado inicial ----------
  var base = read(K_THEME), hcSaved = read(K_HC);
  if (base !== 'light' && base !== 'dark') {
    // Preferencias anteriores (portada y Eclipse), para no perder lo ya elegido
    var old = read('astro-tema'), oldE = read('eclipse.theme');
    if (old === 'dia') base = 'light';
    else if (old === 'noche') base = 'dark';
    else if (oldE === 'light' || oldE === 'dark') base = oldE;
    else base = mm('(prefers-color-scheme: dark)') ? 'dark' : 'light';
  }
  if (hcSaved !== '1' && hcSaved !== '0') {
    var oldHc = read('eclipse.hc');
    hcSaved = (oldHc === '1' || oldHc === '0') ? oldHc : (mm('(prefers-contrast: more)') ? '1' : '0');
  }
  var hc = hcSaved === '1';
  var usesDataTheme = root.hasAttribute('data-theme');
  var native = root.hasAttribute('data-ue-native');

  // ---------- Textos (según el idioma de la página) ----------
  var T = {
    es: { dark: 'Modo noche', light: 'Modo claro', hc: 'Alto contraste', std: 'Contraste normal', nDark: 'Modo noche activado.', nLight: 'Modo claro activado.', nHc: 'Alto contraste activado.', home: 'Volver al inicio del portal', group: 'Modo de visualización' },
    en: { dark: 'Night mode', light: 'Light mode', hc: 'High contrast', std: 'Normal contrast', nDark: 'Night mode on.', nLight: 'Light mode on.', nHc: 'High contrast on.', home: 'Back to the portal home', group: 'Display mode' },
    pt: { dark: 'Modo noite', light: 'Modo claro', hc: 'Alto contraste', std: 'Contraste normal', nDark: 'Modo noite ativado.', nLight: 'Modo claro ativado.', nHc: 'Alto contraste ativado.', home: 'Voltar ao início do portal', group: 'Modo de visualização' },
    fr: { dark: 'Mode nuit', light: 'Mode clair', hc: 'Contraste élevé', std: 'Contraste normal', nDark: 'Mode nuit activé.', nLight: 'Mode clair activé.', nHc: 'Contraste élevé activé.', home: 'Retour à l’accueil du portail', group: 'Mode d’affichage' },
    it: { dark: 'Modalità notte', light: 'Modalità chiara', hc: 'Alto contrasto', std: 'Contrasto normale', nDark: 'Modalità notte attivata.', nLight: 'Modalità chiara attivata.', nHc: 'Alto contrasto attivato.', home: 'Torna alla pagina iniziale del portale', group: 'Modalità di visualizzazione' },
    de: { dark: 'Nachtmodus', light: 'Heller Modus', hc: 'Hoher Kontrast', std: 'Normaler Kontrast', nDark: 'Nachtmodus aktiviert.', nLight: 'Heller Modus aktiviert.', nHc: 'Hoher Kontrast aktiviert.', home: 'Zurück zur Startseite des Portals', group: 'Anzeigemodus' }
  };
  function tx() { var l = (root.getAttribute('lang') || 'es').slice(0, 2).toLowerCase(); return T[l] || T.es; }

  var ICON = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    contrast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>'
  };

  // ---------- Aplicar ----------
  function state() { return { theme: hc ? 'hc' : base, base: base, hc: hc, dark: hc || base === 'dark' }; }

  function applyRoot() {
    var s = state();
    root.setAttribute('data-ue-theme', s.theme);
    root.setAttribute('data-ue-base', s.base);
    if (root.classList) { if (s.dark) root.classList.add('dark'); else root.classList.remove('dark'); }
    if (usesDataTheme) root.setAttribute('data-theme', native ? s.theme : (s.dark ? 'dark' : 'light'));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', s.theme === 'hc' ? '#000000' : '#14264b');
  }

  var buttons = [];   // [{theme: <button>, hc: <button>}]
  function label(btn, icon, text) {
    btn.innerHTML = icon + '<span class="ue-tool-txt">' + text + '</span>';
    btn.setAttribute('title', text);
  }
  function paintButtons() {
    var t = tx(), toLight = !hc && base === 'dark';
    for (var i = 0; i < buttons.length; i++) {
      // El texto dice a qué modo se pasa (igual que en Eclipse sonoro 2027)
      label(buttons[i].theme, toLight ? ICON.sun : ICON.moon, toLight ? t.light : t.dark);
      label(buttons[i].hc, ICON.contrast, hc ? t.std : t.hc);
      buttons[i].hc.setAttribute('aria-pressed', hc ? 'true' : 'false');
      buttons[i].box.setAttribute('aria-label', t.group);
    }
  }

  var live = null;
  function announce(msg) {
    if (!document.body) return;
    if (!live) {
      live = document.createElement('div');
      live.className = 'ue-sr'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 60);
  }

  function emit() {
    var ev;
    try { ev = new CustomEvent('ue:theme', { detail: state() }); }
    catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('ue:theme', false, false, state()); }
    document.dispatchEvent(ev);
  }

  function apply(say) {
    applyRoot(); paintButtons(); emit();
    if (say) { var t = tx(); announce(hc ? t.nHc : (base === 'dark' ? t.nDark : t.nLight)); }
  }

  // ---------- Acciones ----------
  function toggleBase() {
    if (hc) { hc = false; base = 'dark'; write(K_HC, '0'); }   // desde alto contraste se vuelve al modo noche
    else base = base === 'dark' ? 'light' : 'dark';
    write(K_THEME, base); apply(true);
  }
  function toggleHc() { hc = !hc; write(K_HC, hc ? '1' : '0'); write(K_THEME, base); apply(true); }
  function setBase(b) { if (b === 'light' || b === 'dark') { base = b; write(K_THEME, base); apply(false); } }

  // ---------- Botones ----------
  function mount(box) {
    if (box.getAttribute('data-ue-mounted')) return;
    box.setAttribute('data-ue-mounted', '1');
    box.classList.add('ue-tools');
    box.setAttribute('role', 'group');
    var b1 = document.createElement('button'), b2 = document.createElement('button');
    b1.type = 'button'; b1.className = 'ue-tool ue-tool-theme';
    b2.type = 'button'; b2.className = 'ue-tool ue-tool-hc';
    b1.addEventListener('click', toggleBase);
    b2.addEventListener('click', toggleHc);
    box.appendChild(b1); box.appendChild(b2);
    buttons.push({ box: box, theme: b1, hc: b2 });
  }

  function autoBar() {
    // Barra del portal para páginas que no la traían
    var home = document.body.getAttribute('data-ue-bar') || '../index.html';
    var logo = home.replace(/index\.html$/, '') + 'img/logo-edytic-marca.png';
    var bar = document.createElement('header');
    bar.className = 'ue-appbar ue-appbar-auto';
    bar.innerHTML =
      '<div class="ue-appbar-in"><div class="ue-brand-row">' +
      '<a href="' + home + '" class="ue-home" aria-label="' + tx().home + '" title="' + tx().home + '">' + ICON.home + '</a>' +
      '<div class="ue-brand"><img class="ue-brand-logo" src="' + logo + '" width="650" height="96" alt="Educación y TIC">' +
      '<span class="ue-brand-sep" aria-hidden="true"></span><span class="ue-brand-text"><span class="ue-brand-title">Astronomía para todos</span>' +
      '<span class="ue-brand-sub">DGES - EDyTIC</span></span></div></div><div data-ue-tools></div></div>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function init() {
    var boxes = document.querySelectorAll('[data-ue-tools]');
    if (!boxes.length && document.body.hasAttribute('data-ue-bar')) { autoBar(); boxes = document.querySelectorAll('[data-ue-tools]'); }
    for (var i = 0; i < boxes.length; i++) mount(boxes[i]);
    apply(false);
    // Si la página cambia de idioma, los botones también
    if (window.MutationObserver) new MutationObserver(paintButtons).observe(root, { attributes: true, attributeFilter: ['lang'] });
  }

  // Otra pestaña del portal cambió el modo: esta lo acompaña
  window.addEventListener('storage', function (e) {
    if (e.key !== K_THEME && e.key !== K_HC) return;
    var b = read(K_THEME), h = read(K_HC);
    if (b === 'light' || b === 'dark') base = b;
    hc = h === '1';
    apply(false);
  });
  // Al volver con «Atrás» la página puede salir de la memoria del navegador con el modo viejo
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var b = read(K_THEME), h = read(K_HC);
    if (b === 'light' || b === 'dark') base = b;
    if (h === '1' || h === '0') hc = h === '1';
    apply(false);
  });

  window.UETheme = { get: state, setBase: setBase, toggleBase: toggleBase, toggleHc: toggleHc, mount: mount };

  applyRoot();   // antes de pintar
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
