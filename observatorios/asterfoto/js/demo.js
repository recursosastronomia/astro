/* Reproductor del video de demostración (portada): controles propios además de los del navegador */
(function () {
  'use strict';
  function init() {
    var v = document.getElementById('demo-video'); if (!v) return;
    var $ = function (id) { return document.getElementById(id); };
    var t = function (k) { return window.Pagina ? window.Pagina.t(k) : k; };
    function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    function paint() {
      var on = !v.paused && !v.ended;
      $('v-play').setAttribute('aria-pressed', String(on));
      $('v-play-txt').textContent = t(on ? 'v.pause' : 'v.play');
      $('v-ic-play').toggleAttribute('hidden', on); $('v-ic-pause').toggleAttribute('hidden', !on);
      $('v-time').textContent = fmt(v.currentTime) + ' / ' + fmt(v.duration || 168);
    }
    function seek(s) {
      var go = function () { v.currentTime = Math.max(0, Math.min((v.duration || 168) - 0.1, s)); paint(); };
      if (v.readyState >= 1) go(); else { v.addEventListener('loadedmetadata', go, { once: true }); v.preload = 'metadata'; v.load(); }
    }
    $('v-play').addEventListener('click', function () { if (v.paused || v.ended) v.play(); else v.pause(); });
    $('v-back').addEventListener('click', function () { seek(v.currentTime - 10); });
    $('v-fwd').addEventListener('click', function () { seek(v.currentTime + 10); });
    $('v-rate').addEventListener('change', function () { v.playbackRate = +this.value; });
    document.querySelectorAll('.vchap [data-t]').forEach(function (b) {
      b.addEventListener('click', function () { seek(+b.getAttribute('data-t')); if (v.paused) v.play(); });
    });
    ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata'].forEach(function (e) { v.addEventListener(e, paint); });
    v.addEventListener('ratechange', function () { $('v-rate').value = String(v.playbackRate); });
    if (window.Pagina) window.Pagina.onLang(paint);
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
