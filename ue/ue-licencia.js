/* =========================================================================
   Astronomía para todos — aviso de licencia CC BY-SA 4.0 (política de Uruguay Educa)
   -------------------------------------------------------------------------
   Agrega en cada producto una línea discreta:
     [íconos CC · BY · SA en gris]  Contenidos bajo licencia CC BY-SA 4.0, salvo que se indique otra cosa.
   - Si la página tiene un elemento con el atributo data-ue-license, la línea va ahí.
   - Si no, va justo debajo de la declaración de accesibilidad (.a11y-declaracion), con su mismo fondo y color,
     como última línea de esa franja de cierre que comparten todas las páginas del portal.
   - Si no hay declaración, va al final del último <footer> que sea hijo directo de <body>.
   - Si tampoco hay, se agrega un <footer> propio al final de <body>.
   Sigue el idioma de <html lang> (seis idiomas) y cambia si la página cambia de idioma.
   Los íconos son SVG propios en escala de gris; el texto usa el color de la página (contraste AA).
   Lo carga ue/ue.js en todas las páginas; las que no usan ue.js lo cargan directamente.
   ========================================================================= */
(function () {
  'use strict';
  if (window.__ueLicense) return;
  window.__ueLicense = true;
  var root = document.documentElement;

  var T = {
    es: { pre: 'Contenidos bajo licencia', post: ', salvo que se indique otra cosa.', name: 'Creative Commons Atribución-CompartirIgual 4.0 Internacional', nw: '(se abre en una pestaña nueva)', deed: 'es' },
    en: { pre: 'Content licensed under', post: ', unless otherwise stated.', name: 'Creative Commons Attribution-ShareAlike 4.0 International', nw: '(opens in a new tab)', deed: 'en' },
    pt: { pre: 'Conteúdo sob licença', post: ', salvo indicação em contrário.', name: 'Creative Commons Atribuição-CompartilhaIgual 4.0 Internacional', nw: '(abre em uma nova aba)', deed: 'pt' },
    fr: { pre: 'Contenus sous licence', post: ', sauf mention contraire.', name: 'Creative Commons Attribution - Partage dans les mêmes conditions 4.0 International', nw: '(s’ouvre dans un nouvel onglet)', deed: 'fr' },
    it: { pre: 'Contenuti con licenza', post: ', salvo diversa indicazione.', name: 'Creative Commons Attribuzione - Condividi allo stesso modo 4.0 Internazionale', nw: '(si apre in una nuova scheda)', deed: 'it' },
    de: { pre: 'Inhalte unter der Lizenz', post: ', sofern nicht anders angegeben.', name: 'Creative Commons Namensnennung - Weitergabe unter gleichen Bedingungen 4.0 International', nw: '(öffnet in einem neuen Tab)', deed: 'de' }
  };
  function tx() { var l = (root.getAttribute('lang') || 'es').slice(0, 2).toLowerCase(); return T[l] || T.es; }

  // Íconos compactos (CC, BY, SA), dibujados con trazos para que se vean nítidos a tamaño de texto
  var ICONS =
    '<svg class="ue-lic-ico" viewBox="0 0 66 20" width="56" height="17" aria-hidden="true" focusable="false">' +
      '<g fill="none" stroke="currentColor" stroke-width="1.6">' +
        '<circle cx="10" cy="10" r="8.6"/><circle cx="33" cy="10" r="8.6"/><circle cx="56" cy="10" r="8.6"/>' +
        // CC
        '<path d="M8.6 7.6a2.6 2.6 0 1 0 0 4.8M13.4 7.6a2.6 2.6 0 1 0 0 4.8" stroke-width="1.5"/>' +
        // SA: flecha circular
        '<path d="M52.4 10a3.6 3.6 0 1 0 1.1-2.6" stroke-width="1.6"/>' +
      '</g>' +
      // BY: persona
      '<g fill="currentColor"><circle cx="33" cy="5.4" r="1.6"/><path d="M30.6 8.2h4.8a.8.8 0 0 1 .8.8v3.6h-1.4v3.6h-3.6v-3.6h-1.4V9a.8.8 0 0 1 .8-.8z"/>' +
      '<path d="M51.2 6.9l2.9 0.9-0.9 2.7z"/></g>' +
    '</svg>';

  var CSS =
    '.ue-lic{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.35rem .5rem;margin:.6rem auto 0;padding:.25rem 1rem;' +
      'font:inherit;font-size:.8rem;line-height:1.4;text-align:center;color:inherit;max-width:60rem}' +
    '.ue-lic-ico{flex:none;color:#6b7280;vertical-align:middle}' +
    'html[data-ue-base="dark"] .ue-lic-ico,html.dark .ue-lic-ico,html[data-theme="dark"] .ue-lic-ico{color:#a3a9b3}' +
    'html[data-ue-theme="hc"] .ue-lic-ico,html[data-theme="hc"] .ue-lic-ico{color:#fff}' +
    '.ue-lic a{color:inherit;text-decoration:underline;text-underline-offset:2px;font-weight:600}' +
    '.ue-lic a:focus-visible{outline:2px solid currentColor;outline-offset:2px;border-radius:2px}' +
    '.ue-lic-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
    'footer.ue-lic-foot{padding:.25rem 0 1rem}' +
    '.ue-lic.ue-lic-bar{margin:0;max-width:none;width:100%;box-sizing:border-box;padding:0 16px 12px}' +
    '@media print{.ue-lic-ico{color:#555!important}}';

  var box = null, bar = null;
  function lum(rgb) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || ''); if (!m) return 1;
    return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
  }
  // Toma el fondo y el color de la franja de accesibilidad (cambian con el modo claro / noche / alto contraste)
  function matchBar() {
    if (!bar || !box) return;
    var cs = getComputedStyle(bar);
    box.style.background = cs.backgroundColor;
    box.style.color = cs.color;
    var hcOn = root.getAttribute('data-ue-theme') === 'hc' || root.getAttribute('data-theme') === 'hc';
    var ico = box.querySelector('.ue-lic-ico');
    if (ico) ico.style.color = hcOn ? cs.color : (lum(cs.backgroundColor) < 0.5 ? '#a3a9b3' : '#6b7280');
  }
  function paint() {
    if (!box) return;
    var t = tx();
    box.innerHTML = ICONS + '<span>' + t.pre + ' <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.' + t.deed +
      '" target="_blank" rel="license noopener" title="' + t.name + '">CC BY-SA 4.0<span class="ue-lic-sr"> ' + t.nw + '</span></a>' + t.post + '</span>';
    matchBar();
  }

  function init() {
    if (!document.getElementById('ue-lic-css')) {
      var st = document.createElement('style'); st.id = 'ue-lic-css'; st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    var slot = document.querySelector('[data-ue-license]');
    box = document.createElement('p');
    box.className = 'ue-lic';
    var decls = document.querySelectorAll('.a11y-declaracion');
    bar = slot ? null : decls[decls.length - 1] || null;
    if (slot) slot.appendChild(box);
    else if (bar) {
      box.className = 'ue-lic ue-lic-bar';
      bar.parentNode.insertBefore(box, bar.nextSibling);
    }
    else {
      var foots = document.querySelectorAll('body > footer'), last = foots[foots.length - 1];
      var cs = last && window.getComputedStyle ? getComputedStyle(last) : null;
      // Un pie en fila que no envuelve dejaría el aviso al costado: en ese caso va en una línea propia, debajo
      var row = cs && /flex/.test(cs.display) && !/column/.test(cs.flexDirection) && cs.flexWrap === 'nowrap';
      if (last && !row) last.appendChild(box);
      else {
        var f = document.createElement('footer'); f.className = 'ue-lic-foot';
        f.appendChild(box);
        if (last) last.parentNode.insertBefore(f, last.nextSibling); else document.body.appendChild(f);
      }
    }
    paint();
    if (window.MutationObserver) new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['lang', 'data-ue-theme', 'data-theme', 'class'] });
    document.addEventListener('ue:theme', function () { setTimeout(matchBar, 0); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
