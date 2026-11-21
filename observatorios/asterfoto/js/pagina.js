/* Idioma compartido por las páginas (portada, comparador y fuentes). El planificador usa la misma clave. */
(function () {
  'use strict';
  var KEY = 'asterfoto.lang', subs = [];
  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* sin guardar */ } }
  var lang = read();
  if (lang !== 'es' && lang !== 'en') lang = (navigator.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es';

  function t(k, v) {
    var L = window.I18N[lang] || window.I18N.es, s = L[k];
    if (s == null) s = window.I18N.es[k];
    if (s == null) return k;
    if (v) s = s.replace(/\{(\w+)\}/g, function (_, n) { return v[n] != null ? v[n] : ''; });
    return s;
  }
  function apply() {
    var root = document.documentElement;
    root.lang = lang;
    var dt = document.body.getAttribute('data-doc-title'); if (dt) document.title = t(dt);
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (p) { var kv = p.split(':'); el.setAttribute(kv[0], t(kv[1])); });
    });
    // páginas con un bloque por idioma (fuentes.html)
    document.querySelectorAll('.lang-block').forEach(function (el) { el.hidden = el.getAttribute('data-lang') !== lang; });
    var other = lang === 'es' ? 'en' : 'es', b = document.getElementById('btn-lang');
    if (b) {
      b.setAttribute('lang', other);
      b.setAttribute('aria-label', other === 'en' ? 'English version' : 'Versión en español');
      document.getElementById('btn-lang-txt').textContent = other === 'en' ? 'English' : 'Español';
    }
    subs.forEach(function (f) { f(lang); });
  }
  function init() {
    var b = document.getElementById('btn-lang');
    if (b) b.addEventListener('click', function () { lang = lang === 'es' ? 'en' : 'es'; write(lang); apply(); });
    apply();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  window.Pagina = {
    t: t, lang: function () { return lang; },
    onLang: function (f) { subs.push(f); },
    nf: function (x, d) { return Number(x).toLocaleString(lang === 'en' ? 'en-US' : 'es-UY', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
