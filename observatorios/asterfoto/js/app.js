/* =========================================================================
   Planificador de asteroides — interfaz
   ========================================================================= */
(function () {
  'use strict';
  var A = window.Astro, D = A.D, R = A.R;
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var KEY = 'asterfoto.state';
  var PAGE = 25;
  var MAX_AGE = 1100;   // días: se omiten los objetos con elementos orbitales de más de 3 años

  var PROFILES = {
    celular:    { f: 5.5, pix: 1.2,  w: 4000, h: 3000, exp: 10, lim: 8 },
    normal:     { f: 50,  pix: 4.3,  w: 6000, h: 4000, exp: 10, lim: 9.5 },
    tele:       { f: 300, pix: 4.3,  w: 6000, h: 4000, exp: 60, lim: 12 },
    telescopio: { f: 800, pix: 3.76, w: 4144, h: 2822, exp: 60, lim: 15 }
  };

  var S = {
    lang: 'es', catalog: [], epoch: null,
    site: null, results: [], shown: 0, night: null,
    sel: null, track: [], tIdx: 0, orient: 'face', nshots: 5, px: 10
  };

  /* ---------- Idioma ---------- */
  function t(k, v) {
    var L = window.I18N[S.lang] || window.I18N.es;
    var s = L[k]; if (s == null) s = window.I18N.es[k]; if (s == null) return k;
    if (v) s = s.replace(/\{(\w+)\}/g, function (_, n) { return v[n] != null ? v[n] : ''; });
    return s;
  }
  function nf(x, d) { return Number(x).toLocaleString(S.lang === 'en' ? 'en-US' : 'es-UY', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function applyI18n() {
    document.documentElement.lang = S.lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (p) { var kv = p.split(':'); el.setAttribute(kv[0], t(kv[1])); });
    });
    var other = S.lang === 'es' ? 'en' : 'es';
    var b = $('btn-lang'); b.setAttribute('lang', other);
    b.setAttribute('aria-label', other === 'en' ? 'English version' : 'Versión en español');
    $('btn-lang-txt').textContent = other === 'en' ? 'English' : 'Español';
    // Los botones del portal (modo claro/noche, alto contraste) siguen solos el atributo lang de <html> (ue.js)
    fillCities();
    updateProfileHint(); updateGearOut(); updateOutputs();
    if (S.catalog.length) dataStatusReady();
    if (S.night) renderNight();
    if (S.close) renderClose();
    if (S.results.length || !$('results').hidden) renderResults(false);
    if (S.sel) renderDetail();
  }

  /* ---------- Formatos ---------- */
  function tz() { return (S.site && S.site.tz) || Intl.DateTimeFormat().resolvedOptions().timeZone; }
  function hm(jd) {
    return new Intl.DateTimeFormat(S.lang === 'en' ? 'en-GB' : 'es-UY', { timeZone: tz(), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(A.dateFromJd(jd));
  }
  function dayLabel(jd) {
    return new Intl.DateTimeFormat(S.lang === 'en' ? 'en-GB' : 'es-UY', { timeZone: tz(), weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(A.dateFromJd(jd));
  }
  var DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function dirIndex(az) { return Math.round(A.norm360(az) / 22.5) % 16; }
  function dirShort(az) { return t('d.s.' + DIRS[dirIndex(az)]); }
  function dirLong(az) { return t('d.l.' + DIRS[dirIndex(az)]); }
  function altWord(h) {
    if (h < 15) return t('alt.vlow'); if (h < 30) return t('alt.low'); if (h < 50) return t('alt.mid');
    if (h < 70) return t('alt.high'); return t('alt.zenith');
  }
  function altShort(h) {
    if (h < 15) return t('alt.s.vlow'); if (h < 30) return t('alt.s.low'); if (h < 50) return t('alt.s.mid');
    if (h < 70) return t('alt.s.high'); return t('alt.s.zenith');
  }
  function fists(h) { return nf(Math.round(h / 5) / 2, Math.round(h / 5) % 2 ? 1 : 0); }
  function raHms(ra) { var h = ra / 15, H = Math.floor(h), m = (h - H) * 60, M = Math.floor(m), s = Math.round((m - M) * 60); if (s === 60) { s = 0; M++; } if (M === 60) { M = 0; H = (H + 1) % 24; } return H + 'h ' + String(M).padStart(2, '0') + 'm ' + String(s).padStart(2, '0') + 's'; }
  function decDms(d) { var sg = d < 0 ? '−' : '+', a = Math.abs(d), D0 = Math.floor(a), m = Math.round((a - D0) * 60); if (m === 60) { m = 0; D0++; } return sg + D0 + '° ' + String(m).padStart(2, '0') + '′'; }
  function displayName(o) { return o.name ? (/^\d+$/.test(o.pdes) ? '(' + o.pdes + ') ' + o.name : o.name) : (/^\d+$/.test(o.pdes) ? '(' + o.pdes + ')' : o.pdes); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clearSvg(svg) { Array.prototype.slice.call(svg.childNodes).forEach(function (n) { if (n.nodeName !== 'title' && n.nodeName !== 'desc') svg.removeChild(n); }); }

  /* ---------- Estado guardado ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        lang: S.lang, city: $('city').value, lat: $('lat').value, lon: $('lon').value, gps: S.site && S.site.gps,
        profile: $('profile').value, gear: gear(), mag: $('mag').value, minalt: $('minalt').value, neo: $('neo').checked,
        nshots: S.nshots, px: S.px, decl: $('decl').value
      }));
    } catch (e) { /* sin guardar */ }
  }

  /* ---------- Lugares ---------- */
  function fillCities() {
    var sel = $('city'), v = sel.value;
    sel.innerHTML = '';
    var o0 = document.createElement('option'); o0.value = 'gps'; o0.textContent = t('gpsOption'); o0.hidden = !(S.site && S.site.gps);
    sel.appendChild(o0);
    [['uy', t('grpUy')], ['sa', t('grpSa')]].forEach(function (g) {
      var og = document.createElement('optgroup'); og.label = g[1];
      window.LUGARES.forEach(function (c, i) {
        if (c[4] !== g[0]) return;
        var o = document.createElement('option'); o.value = String(i); o.textContent = c[0]; og.appendChild(o);
      });
      sel.appendChild(og);
    });
    if (v) sel.value = v;
  }
  function haversine(a, b, c, d) {
    var p = Math.sin((c - a) * D / 2), q = Math.sin((d - b) * D / 2);
    return 2 * 6371 * Math.asin(Math.sqrt(p * p + Math.cos(a * D) * Math.cos(c * D) * q * q));
  }
  function nearestCity(lat, lon) {
    var best = null, bd = 1e9;
    window.LUGARES.forEach(function (c) { var d = haversine(lat, lon, c[1], c[2]); if (d < bd) { bd = d; best = c; } });
    return { city: best, km: bd };
  }
  function setCity(i) {
    var c = window.LUGARES[i];
    S.site = { lat: c[1], lon: c[2], tz: c[3], name: c[0], gps: false };
    $('lat').value = c[1]; $('lon').value = c[2];
    showPlace();
  }
  function showPlace(extra) {
    var s = S.site; if (!s) return;
    $('place-info').textContent = t('placeInfo', { name: s.name, lat: nf(Math.abs(s.lat), 3) + '° ' + (s.lat < 0 ? 'S' : 'N'), lon: nf(Math.abs(s.lon), 3) + '° ' + (s.lon < 0 ? t('westAbbr') : 'E') }) + (extra ? ' ' + extra : '');
  }
  function useGps() {
    if (!navigator.geolocation) { $('place-info').textContent = t('gpsNo'); return; }
    $('place-info').textContent = t('gpsWait');
    navigator.geolocation.getCurrentPosition(function (p) {
      var lat = +p.coords.latitude.toFixed(4), lon = +p.coords.longitude.toFixed(4);
      var n = nearestCity(lat, lon);
      S.site = { lat: lat, lon: lon, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, name: t('myPlace'), gps: true };
      fillCities(); $('city').value = 'gps';
      $('lat').value = lat; $('lon').value = lon;
      showPlace(t('nearest', { city: n.city[0], km: nf(n.km, 0) }));
      save(); invalidate();
    }, function (e) {
      $('place-info').textContent = e.code === 1 ? t('gpsDenied') : t('gpsFail');
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }
  function manualCoords() {
    var lat = parseFloat($('lat').value), lon = parseFloat($('lon').value);
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return;
    var n = nearestCity(lat, lon);
    S.site = { lat: lat, lon: lon, tz: n.km < 600 ? n.city[3] : Intl.DateTimeFormat().resolvedOptions().timeZone, name: t('customPlace'), gps: true };
    fillCities(); $('city').value = 'gps';
    showPlace(t('nearest', { city: n.city[0], km: nf(n.km, 0) }));
    save(); invalidate();
  }

  /* ---------- Equipo ---------- */
  function gear() {
    return { f: +$('g-f').value || 50, pix: +$('g-pix').value || 4, w: +$('g-w').value || 4000, h: +$('g-h').value || 3000, exp: +$('g-exp').value || 10 };
  }
  function scale(g) { return 206.265 * g.pix / g.f; }   // ″ por píxel
  function fov(g) { return [2 * Math.atan(g.w * g.pix / 1000 / 2 / g.f) * R, 2 * Math.atan(g.h * g.pix / 1000 / 2 / g.f) * R]; }
  function setProfile(p, keepMag) {
    var P = PROFILES[p]; if (!P) return;
    $('g-f').value = P.f; $('g-pix').value = P.pix; $('g-w').value = P.w; $('g-h').value = P.h; $('g-exp').value = P.exp;
    if (!keepMag) $('mag').value = P.lim;
    updateGearOut(); updateOutputs();
  }
  function updateProfileHint() { $('profile-hint').textContent = t('ph.' + $('profile').value); }
  function updateGearOut() {
    var g = gear(), f = fov(g);
    $('gear-out').textContent = t('gearOut', { s: nf(scale(g), scale(g) < 10 ? 2 : 1), fw: nf(f[0], f[0] < 5 ? 2 : 1), fh: nf(f[1], f[1] < 5 ? 2 : 1) });
  }
  function updateOutputs() {
    $('mag-out').textContent = nf(+$('mag').value, 1);
    $('minalt-out').textContent = $('minalt').value + '°';
    $('pxmove-out').textContent = t('pxN', { n: $('pxmove').value });
  }

  /* ---------- Catálogo ---------- */
  function parseSbdb(j, map) {
    var f = j.fields, ix = {}; f.forEach(function (k, i) { ix[k] = i; });
    j.data.forEach(function (r) {
      var pdes = r[ix.pdes]; if (map[pdes]) return;
      // Filas incompletas (algún elemento vacío) u órbitas abiertas: se descartan
      if (['epoch', 'e', 'a', 'i', 'om', 'w', 'ma', 'H'].some(function (k) { return r[ix[k]] == null || r[ix[k]] === '' || !isFinite(+r[ix[k]]); })) return;
      var e = +r[ix.e], a = +r[ix.a];
      if (!(e < 1 && a > 0)) return;
      var o = { pdes: pdes, name: r[ix.name] || '', epoch: +r[ix.epoch], e: e, a: a, i: +r[ix.i], om: +r[ix.om], w: +r[ix.w], ma: +r[ix.ma],
        H: +r[ix.H], G: r[ix.G] == null ? null : +r[ix.G], neo: r[ix.neo] === 'Y', cls: r[ix['class']] };
      if (!isFinite(o.H)) return;
      map[pdes] = A.prepare(o);
    });
  }
  function loadCatalog() {
    $('data-status').textContent = t('loading');
    Promise.all(['sbdb_brillantes.json', 'sbdb_neo.json'].map(function (u) {
      return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); });
    })).then(function (js) {
      var map = {};
      js.forEach(function (j) { parseSbdb(j, map); });
      S.catalog = Object.keys(map).map(function (k) { return map[k]; });
      var ep = {}; S.catalog.forEach(function (o) { ep[o.epoch] = (ep[o.epoch] || 0) + 1; });
      S.epoch = +Object.keys(ep).sort(function (a, b) { return ep[b] - ep[a]; })[0];
      dataStatusReady();
      $('btn-search').disabled = false;
    }).catch(function () {
      $('data-status').textContent = t('loadFail');
      $('data-status').classList.add('ue-err');
    });
  }
  function dataStatusReady() {
    $('data-status').textContent = t('loaded', { n: nf(S.catalog.length, 0) });
    if (S.epoch) $('cred-epoch').textContent = t('cred.epoch', { d: new Intl.DateTimeFormat(S.lang === 'en' ? 'en-GB' : 'es-UY', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(A.dateFromJd(S.epoch)) });
  }

  /* ---------- Búsqueda ---------- */
  function invalidate() { /* al cambiar lugar o fecha, los resultados viejos dejan de valer */
    if (!$('results').hidden) { $('results-status').textContent = t('stale'); }
  }

  function search() {
    if (!S.site || !S.catalog.length) return;
    var date = $('date').value; if (!date) return;
    var site = S.site, lim = +$('mag').value, minAlt = +$('minalt').value, neoOnly = $('neo').checked;
    var N = A.night(date, site); S.night = N;
    renderNight();
    S.results = []; S.sel = null; $('detail').hidden = true;
    if (N.kind === 'none') { renderResults(true); return; }
    var step = 10 / 1440, samples = [];
    for (var jd = N.start; jd <= N.end + 1e-9; jd += step) samples.push(jd);
    if (samples[samples.length - 1] < N.end - 1e-6) samples.push(N.end);
    var mid = N.mid, Emid = A.earth(mid + A.DT_DAYS);
    var out = [];
    for (var k = 0; k < S.catalog.length; k++) {
      var o = S.catalog[k];
      if (neoOnly && !o.neo) continue;
      if (Math.abs(mid - o.epoch) > MAX_AGE) continue;   // órbita muy vieja (objetos perdidos): posición poco confiable
      var g = A.observe(o, mid, null, Emid);
      if (g.V > lim + (o.neo ? 1.5 : 0.4) || g.elong < 35) continue;
      var best = -1, bestAlt = -90, alts = new Array(samples.length);
      var pd = o.neo ? null : A.precess(g.ra, g.dec, mid + A.DT_DAYS);
      for (var s = 0; s < samples.length; s++) {
        var h = o.neo ? A.observe(o, samples[s], site).alt : A.horizontal(pd.ra, pd.dec, samples[s], site.lat, site.lon).alt;
        alts[s] = h;
        if (h > bestAlt) { bestAlt = h; best = s; }
      }
      if (bestAlt < minAlt) continue;
      var tb = samples[best], ob = A.observe(o, tb, site);
      if (ob.V > lim) continue;
      var a0 = best, a1 = best;
      while (a0 > 0 && alts[a0 - 1] >= minAlt) a0--;
      while (a1 < samples.length - 1 && alts[a1 + 1] >= minAlt) a1++;
      var mo = A.motion(o, tb, site);
      out.push({ o: o, best: tb, alt: ob.alt, az: ob.az, V: ob.V, rate: mo.rate, pa: mo.pa, w0: samples[a0], w1: samples[a1], obs: ob });
    }
    S.results = out;
    sortResults();
    closeApproaches();
    renderResults(true);
    save();
  }

  /* ---------- Pasajes cercanos de NEO en los próximos 30 días ---------- */
  var LD = 384400 / 149597870.7;   // distancia media Tierra-Luna en UA
  function localDateStr(jd) {
    // fecha local de la noche (la tarde anterior a la medianoche)
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(A.dateFromJd(jd - 0.5));
    var g = function (t) { return p.filter(function (x) { return x.type === t; })[0].value; };
    return g('year') + '-' + g('month') + '-' + g('day');
  }
  function closeApproaches() {
    var N = S.night, site = S.site, lim = +$('mag').value, minAlt = +$('minalt').value;
    S.close = []; S.closeSet = {};
    if (!N) { renderClose(); return; }
    var days = 30, t0 = N.jdNoon + 0.5, Es = [];
    for (var d = 0; d <= days; d++) Es.push(A.earth(t0 + d + A.DT_DAYS));
    var found = [];
    S.catalog.forEach(function (o) {
      if (!o.neo || Math.abs(t0 - o.epoch) > MAX_AGE) return;
      var dmin = 9, ddi = 0, vmin = 99, dvi = 0;
      for (var d = 0; d <= days; d++) {
        var g = A.observe(o, t0 + d, null, Es[d]);
        if (g.delta < dmin) { dmin = g.delta; ddi = d; }
        if (g.V < vmin && g.elong > 40) { vmin = g.V; dvi = d; }
      }
      if (dmin > 0.1 || vmin > lim) return;
      // momento del máximo acercamiento, con paso de una hora
      var best = t0 + ddi, bd = dmin;
      for (var h = -24; h <= 24; h++) { var jj = t0 + ddi + h / 24, gg = A.observe(o, jj, null); if (gg.delta < bd) { bd = gg.delta; best = jj; } }
      found.push({ o: o, jdCa: best, dmin: bd, jdV: t0 + dvi, V: vmin });
    });
    // visibilidad desde el lugar en la noche de mayor brillo
    found.forEach(function (c) {
      var ds = localDateStr(c.jdV), Nn = A.night(ds, site);
      c.dateStr = ds; c.vis = null;
      if (Nn.kind === 'none') return;
      var bestAlt = -90, bj = 0, bo = null;
      for (var jd = Nn.start; jd <= Nn.end; jd += 15 / 1440) { var ob = A.observe(c.o, jd, site); if (ob.alt > bestAlt) { bestAlt = ob.alt; bj = jd; bo = ob; } }
      if (bestAlt >= minAlt) c.vis = { jd: bj, alt: bo.alt, az: bo.az, V: bo.V, rate: A.motion(c.o, bj, site).rate };
      else c.rate = A.motion(c.o, c.jdV, site).rate;
    });
    found.sort(function (a, b) { return a.jdCa - b.jdCa; });
    S.close = found.slice(0, 12);
    S.close.forEach(function (c) { S.closeSet[c.o.pdes] = 1; });
    renderClose();
  }
  function renderClose() {
    var sec = $('close'), ol = $('close-list');
    if (!S.night || S.night.kind === 'none') { sec.hidden = true; return; }
    sec.hidden = false; ol.innerHTML = '';
    $('close-status').textContent = S.close.length ? t('ca.found', { n: S.close.length, m: nf(+$('mag').value, 1) }) : t('ca.none', { m: nf(+$('mag').value, 1) });
    S.close.forEach(function (c) {
      var li = document.createElement('li'); li.className = 'card close-card';
      var mkm = c.dmin * 149.5978707, ld = c.dmin / LD;
      var html = '<h3>' + esc(displayName(c.o)) + ' <span class="badge">NEO</span></h3>' +
        '<p>' + t('ca.ca', { d: dayShort(c.jdCa), mkm: nf(mkm, mkm < 10 ? 1 : 0), ld: nf(ld, ld < 10 ? 1 : 0) }) + '</p>' +
        '<p>' + t('ca.bright', { d: dayShort(c.jdV), v: nf(c.V, 1) }) + '</p>';
      if (c.vis) html += '<p>' + t('ca.rate', { r: nf(c.vis.rate, c.vis.rate < 10 ? 1 : 0) }) + '</p><p class="ok-line">' + t('ca.vis', { h: hm(c.vis.jd), dir: dirLong(c.vis.az), alt: nf(c.vis.alt, 0) }) + '</p>';
      else html += '<p class="warn">' + t('ca.novis') + '</p>';
      if (c.dmin < 0.02) html += '<p class="hint">' + t('ca.veryClose') + '</p>';
      li.innerHTML = html;
      if (c.vis) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary';
        b.innerHTML = '<span>' + t('ca.plan') + '</span><span class="ue-sr">: ' + esc(displayName(c.o)) + '</span>';
        b.addEventListener('click', function () { planNight(c); });
        li.appendChild(b);
      }
      ol.appendChild(li);
    });
  }
  function planNight(c) {
    $('date').value = c.dateStr; search();
    var i = -1; S.results.forEach(function (r, k) { if (r.o.pdes === c.o.pdes) i = k; });
    if (i >= 0) openDetail(i);
    else { $('results-status').textContent = t('ca.notInList', { n: displayName(c.o) }); $('results-h').scrollIntoView({ block: 'start' }); }
  }
  function sortResults() {
    var k = $('sort').value;
    S.results.sort(function (a, b) {
      if (k === 'alt') return b.alt - a.alt;
      if (k === 'rate') return b.rate - a.rate;
      if (k === 'time') return a.best - b.best;
      return a.V - b.V;
    });
  }

  /* ---------- La noche ---------- */
  function moonDuring(N, site) {
    var up = [], illum = 0, waxing = true;
    for (var jd = N.start; jd <= N.end; jd += 10 / 1440) {
      var m = A.moon(jd, site); up.push([jd, m.alt > 0]); illum = m.illum; waxing = m.waxing;
    }
    var m0 = A.moon(N.mid, site);
    var first = null, last = null;
    up.forEach(function (u) { if (u[1]) { if (first == null) first = u[0]; last = u[0]; } });
    return { illum: m0.illum, waxing: m0.waxing, first: first, last: last, all: up.every(function (u) { return u[1]; }) };
  }
  function phaseName(m) {
    if (m.illum < 0.03) return t('ph.new');
    if (m.illum > 0.97) return t('ph.full');
    if (m.illum < 0.4) return m.waxing ? t('ph.wxc') : t('ph.wnc');
    if (m.illum < 0.6) return m.waxing ? t('ph.fq') : t('ph.lq');
    return m.waxing ? t('ph.wxg') : t('ph.wng');
  }
  function renderNight() {
    var N = S.night, site = S.site, b = $('night-body');
    $('night').hidden = false;
    var html = '<p class="nightday">' + t('nightOf', { d: dayLabel(N.jdNoon), place: site.name }) + '</p><ul class="facts">';
    if (N.events.sunsetDown) html += '<li><span class="k">' + t('sunset') + '</span> <span class="v">' + hm(N.events.sunsetDown) + '</span></li>';
    if (N.kind === 'astro') html += '<li><span class="k">' + t('dark') + '</span> <span class="v">' + t('fromTo', { a: hm(N.start), b: hm(N.end) }) + '</span></li>';
    else if (N.kind === 'nautical') html += '<li><span class="k">' + t('darkNaut') + '</span> <span class="v">' + t('fromTo', { a: hm(N.start), b: hm(N.end) }) + '</span></li>';
    else if (N.kind === 'night') html += '<li><span class="k">' + t('darkNone') + '</span> <span class="v">' + t('fromTo', { a: hm(N.start), b: hm(N.end) }) + '</span></li>';
    if (N.events.sunsetUp) html += '<li><span class="k">' + t('sunrise') + '</span> <span class="v">' + hm(N.events.sunsetUp) + '</span></li>';
    if (N.kind !== 'none') {
      var m = moonDuring(N, site); S.moonInfo = m;
      var when = m.first == null ? t('moonNo') : (m.all ? t('moonAll') : t('moonFromTo', { a: hm(m.first), b: hm(m.last) }));
      html += '<li><span class="k">' + t('moon') + '</span> <span class="v">' + t('moonLine', { ph: phaseName(m), p: nf(m.illum * 100, 0), when: when }) + '</span></li>';
    }
    html += '</ul>';
    if (N.kind === 'astro') html += '<p class="hint">' + t('darkHelp') + '</p>';
    if (N.kind === 'none') html += '<p class="ue-err box">' + t('noNight') + '</p>';
    if (S.moonInfo && S.moonInfo.illum > 0.6 && S.moonInfo.first != null) html += '<p class="hint">' + t('moonBright') + '</p>';
    b.innerHTML = html;
  }

  /* ---------- Lista de resultados ---------- */
  function renderResults(reset) {
    var sec = $('results'); sec.hidden = false;
    var ol = $('results-list');
    if (reset) { S.shown = 0; ol.innerHTML = ''; }
    else { ol.innerHTML = ''; var keep = S.shown; S.shown = 0; addCards(Math.max(keep, PAGE)); updateStatus(); return; }
    addCards(PAGE); updateStatus();
    if (reset) $('results-h').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function updateStatus() {
    var n = S.results.length;
    $('results-status').textContent = S.night && S.night.kind === 'none' ? t('noNightShort') :
      (n === 0 ? t('none', { m: nf(+$('mag').value, 1) }) : t('found', { n: nf(n, 0), s: nf(Math.min(S.shown, n), 0) }));
    $('btn-more').hidden = S.shown >= n;
  }
  function addCards(k) {
    var ol = $('results-list'), end = Math.min(S.results.length, S.shown + k);
    for (var i = S.shown; i < end; i++) ol.appendChild(card(S.results[i], i));
    S.shown = end;
  }
  function card(r, i) {
    var li = document.createElement('li'); li.className = 'card';
    var neo = (r.o.neo ? ' <span class="badge">NEO</span>' : '') + (S.closeSet && S.closeSet[r.o.pdes] ? ' <span class="badge badge-close">' + t('ca.badge') + '</span>' : '');
    var moonWarn = '';
    var mo = A.moon(r.best, S.site);
    if (mo.alt > 0 && mo.illum > 0.5 && A.separation(mo.raDate, mo.decDate, r.obs.raDate, r.obs.decDate) < 30) moonWarn = '<p class="warn">' + t('moonNear') + '</p>';
    li.innerHTML =
      '<h3>' + esc(displayName(r.o)) + neo + '</h3>' +
      '<p class="lead">' + t('cardLead', { h: hm(r.best), dir: dirLong(r.az), alt: nf(r.alt, 0), word: altShort(r.alt) }) + '</p>' +
      '<dl class="stats">' +
      stat(t('st.V'), nf(r.V, 1)) + stat(t('st.alt'), nf(r.alt, 0) + '°') + stat(t('st.dir'), dirShort(r.az) + ' · ' + nf(r.az, 0) + '°') +
      stat(t('st.rate'), nf(r.rate, r.rate < 1 ? 2 : 1) + '″/min') + stat(t('st.win'), hm(r.w0) + '–' + hm(r.w1)) +
      '</dl>' + moonWarn;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary';
    b.innerHTML = '<span>' + t('open') + '</span><span class="ue-sr">: ' + esc(displayName(r.o)) + '</span>';
    b.addEventListener('click', function () { openDetail(i); });
    li.appendChild(b);
    return li;
  }
  function stat(k, v) { return '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Detalle ---------- */
  function openDetail(i) {
    var r = S.results[i]; S.sel = r; S.selIdx = i;
    var N = S.night, tr = [];
    for (var jd = N.start; jd <= N.end + 1e-9; jd += 10 / 1440) {
      var ob = A.observe(r.o, jd, S.site); ob.jd = jd; tr.push(ob);
    }
    S.track = tr;
    var bi = 0; tr.forEach(function (p, k) { if (Math.abs(p.jd - r.best) < Math.abs(tr[bi].jd - r.best)) bi = k; });
    S.bestIdx = bi; S.tIdx = bi;
    var ts = $('tsel'); ts.max = tr.length - 1; ts.value = bi;
    $('detail').hidden = false;
    renderDetail();
    $('detail').focus(); $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function cur() { return S.track[S.tIdx]; }
  function renderDetail() {
    var r = S.sel; if (!r) return;
    $('detail-h').textContent = displayName(r.o) + (r.o.neo ? ' · NEO' : '');
    $('print-meta').textContent = t('printMeta', { place: S.site.name, d: dayLabel(S.night.jdNoon) });
    var p = cur();
    $('tsel-out').textContent = hm(p.jd) + (S.tIdx === S.bestIdx ? ' · ' + t('bestTag') : '');
    var low = p.alt < +$('minalt').value;
    var say = t(p.alt < 0 ? 'sayBelow' : 'say', { h: hm(p.jd), dir: dirLong(p.az), az: nf(p.az, 0), alt: nf(p.alt, 0), word: altWord(p.alt), f: fists(p.alt) });
    if (p.alt >= 0 && low) say += ' ' + t('sayLow');
    if (r.o.neo && p.delta < 0.3) say += ' ' + t('neoClose', { d: nf(p.delta * 149.5978707, 0) });
    $('say').textContent = say;
    drawRose(p); drawArc(p); drawChart(); drawMotion(); renderPlan(); renderData(); renderTrackTable(); links();
  }

  /* Rosa de los vientos de 16 rumbos */
  function drawRose(p) {
    var svg = $('rose'); clearSvg(svg);
    $('rose-t').textContent = t('roseT', { dir: dirLong(p.az), az: nf(p.az, 0) });
    var c = 160, R0 = 120;
    el('circle', { cx: c, cy: c, r: R0 + 22, class: 'rose-bg' }, svg);
    el('circle', { cx: c, cy: c, r: R0, class: 'rose-ring' }, svg);
    for (var k = 0; k < 16; k++) {
      var a = k * 22.5 * D, main = k % 4 === 0, mid = k % 2 === 0;
      var r1 = main ? R0 - 26 : (mid ? R0 - 16 : R0 - 9);
      el('line', { x1: c + Math.sin(a) * r1, y1: c - Math.cos(a) * r1, x2: c + Math.sin(a) * R0, y2: c - Math.cos(a) * R0, class: 'rose-tick' }, svg);
      if (mid) {
        var tx = el('text', { x: c + Math.sin(a) * (R0 + (main ? 16 : 14)), y: c - Math.cos(a) * (R0 + (main ? 16 : 14)) + (main ? 7 : 5), class: main ? 'rose-lbl main' : 'rose-lbl', 'text-anchor': 'middle' }, svg);
        tx.textContent = t('d.s.' + DIRS[k]);
      }
    }
    var a2 = p.az * D, pr = R0 - 30;
    var g = el('g', { class: 'rose-needle', transform: 'rotate(' + p.az + ' ' + c + ' ' + c + ')' }, svg);
    el('path', { d: 'M' + c + ' ' + (c - pr) + ' L' + (c + 12) + ' ' + (c - pr + 34) + ' L' + (c + 4) + ' ' + (c - pr + 30) + ' L' + (c + 4) + ' ' + (c + 10) + ' L' + (c - 4) + ' ' + (c + 10) + ' L' + (c - 4) + ' ' + (c - pr + 30) + ' L' + (c - 12) + ' ' + (c - pr + 34) + ' Z' }, g);
    el('circle', { cx: c, cy: c, r: 7, class: 'rose-hub' }, svg);
    var lab = el('text', { x: c, y: c + 48, 'text-anchor': 'middle', class: 'rose-val' }, svg);
    lab.textContent = dirShort(p.az) + ' · ' + nf(p.az, 0) + '°';
    void a2;
  }

  /* Arco de altura (cuarto de círculo) con una persona mirando */
  function drawArc(p) {
    var svg = $('arc'); clearSvg(svg);
    $('arc-t').textContent = t('arcT', { alt: nf(p.alt, 0), f: fists(Math.max(0, p.alt)) });
    var x0 = 60, y0 = 270, Rr = 220;
    el('line', { x1: 20, y1: y0, x2: 300, y2: y0, class: 'arc-ground' }, svg);
    el('path', { d: 'M' + (x0 + Rr) + ' ' + y0 + ' A ' + Rr + ' ' + Rr + ' 0 0 0 ' + x0 + ' ' + (y0 - Rr), class: 'arc-path' }, svg);
    [0, 30, 60, 90].forEach(function (h) {
      var a = h * D, x1 = x0 + Math.cos(a) * (Rr - 8), y1 = y0 - Math.sin(a) * (Rr - 8), x2 = x0 + Math.cos(a) * (Rr + 8), y2 = y0 - Math.sin(a) * (Rr + 8);
      el('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'arc-tick' }, svg);
      var lx = h === 90 ? x0 - 28 : (h === 0 ? x0 + Rr : x0 + Math.cos(a) * (Rr + 22)), ly = h === 90 ? y0 - Rr + 5 : (h === 0 ? y0 + 24 : y0 - Math.sin(a) * (Rr + 22) + 5);
      var tx = el('text', { x: lx, y: ly, 'text-anchor': 'middle', class: 'arc-lbl' }, svg);
      tx.textContent = h + '°';
    });
    var lh = el('text', { x: 20, y: y0 + 24, class: 'arc-cap' }, svg); lh.textContent = t('horizon');
    var lz = el('text', { x: x0 + 14, y: y0 - Rr - 14, class: 'arc-cap' }, svg); lz.textContent = t('zenithW');
    // observador
    el('circle', { cx: x0, cy: y0 - 34, r: 9, class: 'arc-person' }, svg);
    el('path', { d: 'M' + x0 + ' ' + (y0 - 25) + ' L' + x0 + ' ' + (y0 - 4) + ' M' + (x0 - 10) + ' ' + y0 + ' L' + x0 + ' ' + (y0 - 4) + ' L' + (x0 + 10) + ' ' + y0, class: 'arc-person-l' }, svg);
    var h = Math.max(-5, Math.min(90, p.alt)) * D, ex = x0, ey = y0 - 34;
    el('line', { x1: ex, y1: ey, x2: x0 + Math.cos(h) * Rr, y2: y0 - Math.sin(h) * Rr, class: 'arc-ray' }, svg);
    if (p.alt > 0) el('path', { d: 'M' + (x0 + 70) + ' ' + y0 + ' A 70 70 0 0 0 ' + (x0 + Math.cos(h) * 70) + ' ' + (y0 - Math.sin(h) * 70), class: 'arc-angle' }, svg);
    el('circle', { cx: x0 + Math.cos(h) * Rr, cy: y0 - Math.sin(h) * Rr, r: 10, class: 'arc-target' }, svg);
    var v = el('text', { x: x0 + 86, y: y0 - 14, class: 'arc-val' }, svg); v.textContent = nf(p.alt, 0) + '°';
  }

  /* ---------- Carta del cielo local ---------- */
  var starCache = null;
  function starsDate(jd) {
    if (starCache && Math.abs(starCache.jd - jd) < 30) return starCache;
    var C = window.CIELO, T = function (ra, de) { return A.precess(ra, de, jd); };
    starCache = {
      jd: jd,
      stars: C.stars.map(function (s) { var p = T(s[0], s[1]); return [p.ra, p.dec, s[2]]; }),
      names: C.names.map(function (s) { var p = T(s[0], s[1]); return [p.ra, p.dec, s[2]]; }),
      lines: C.lines.map(function (l) { return [l[0]].concat(l.slice(1).map(function (q) { var p = T(q[0], q[1]); return [p.ra, p.dec]; })); })
    };
    return starCache;
  }
  function drawChart() {
    var svg = $('chart'); clearSvg(svg);
    var p = cur(), site = S.site, jd = p.jd, sc = starsDate(jd + A.DT_DAYS);
    var c = 320, Rr = 280, rot = S.orient === 'face' ? p.az : 180;  // azimut que queda abajo
    function proj(alt, az) {
      var r = (90 - alt) / 90 * Rr, a = (az - rot + 180) * D;
      return [c - r * Math.sin(a), c - r * Math.cos(a)];
    }
    function hz(ra, de) { return A.horizontal(ra, de, jd, site.lat, site.lon); }
    el('circle', { cx: c, cy: c, r: Rr, class: 'sky-bg' }, svg);
    [30, 60].forEach(function (h) { el('circle', { cx: c, cy: c, r: (90 - h) / 90 * Rr, class: 'sky-grid' }, svg); });
    for (var k = 0; k < 8; k++) { var q1 = proj(0, k * 45), q0 = proj(90, 0); el('line', { x1: q0[0], y1: q0[1], x2: q1[0], y2: q1[1], class: 'sky-grid' }, svg); }
    // líneas de constelaciones
    var gL = el('g', { class: 'sky-lines' }, svg), near = { d: 999, id: null };
    sc.lines.forEach(function (l) {
      var pts = [], d = '';
      for (var j = 1; j < l.length; j++) {
        var h = hz(l[j][0], l[j][1]);
        var sep = A.separation(l[j][0], l[j][1], p.raDate, p.decDate);
        if (sep < near.d) { near.d = sep; near.id = l[0]; }
        if (h.alt > 0) { var q = proj(h.alt, h.az); d += (pts.length && pts[pts.length - 1] ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); pts.push(true); }
        else pts.push(false);
      }
      if (d) el('path', { d: d }, gL);
    });
    // estrellas
    var gS = el('g', { class: 'sky-stars' }, svg);
    sc.stars.forEach(function (s) {
      if (s[2] > 5) return;
      var h = hz(s[0], s[1]); if (h.alt <= 0) return;
      var q = proj(h.alt, h.az);
      el('circle', { cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: Math.max(0.7, 4.2 - 0.7 * s[2]).toFixed(2) }, gS);
    });
    // nombres de estrellas brillantes y la más cercana
    var gN = el('g', { class: 'sky-names' }, svg), ns = null, boxes = [];
    if (p.alt > 0) { var qa0 = proj(p.alt, p.az); boxes.push([qa0[0] - 20, qa0[1] - 20, qa0[0] + 60, qa0[1] + 20]); }
    sc.names.slice().sort(function (a, b) { return a[3] - b[3]; }).forEach(function (s) {
      var h = hz(s[0], s[1]); if (h.alt <= 3) return;
      var sep = A.separation(s[0], s[1], p.raDate, p.decDate);
      if (!ns || sep < ns.d) ns = { d: sep, name: s[2], az: h.az, alt: h.alt };
      if (s[3] > 1.9) return;
      var q = proj(h.alt, h.az), w = s[2].length * 6.6, bx = [q[0] + 5, q[1] - 17, q[0] + 7 + w, q[1] - 1];
      if (boxes.some(function (b) { return bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1]; })) return;
      boxes.push(bx);
      var tx = el('text', { x: (q[0] + 6).toFixed(1), y: (q[1] - 5).toFixed(1) }, gN); tx.textContent = s[2];
    });
    // nombre de la constelación cercana
    var cons = near.id && window.CIELO.cons[near.id];
    // Luna
    var mo = A.moon(jd, site);
    if (mo.alt > 0) {
      var qm = proj(mo.alt, mo.az);
      el('circle', { cx: qm[0], cy: qm[1], r: 11, class: 'sky-moon' }, svg);
      var tm = el('text', { x: qm[0] + 15, y: qm[1] + 5, class: 'sky-moon-l' }, svg); tm.textContent = t('moon');
    }
    // trayectoria del asteroide durante la ventana
    var gT = el('g', { class: 'sky-track' }, svg), d2 = '', lastH = null;
    S.track.forEach(function (tp) {
      if (tp.alt <= 0) { lastH = null; return; }
      var q = proj(tp.alt, tp.az); d2 += (lastH ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); lastH = tp;
    });
    if (d2) el('path', { d: d2 }, gT);
    S.track.forEach(function (tp, k) {
      if (tp.alt <= 0 || k % 6 !== 0) return;
      var q = proj(tp.alt, tp.az);
      el('circle', { cx: q[0], cy: q[1], r: 3.5, class: 'sky-tick' }, gT);
      var tx = el('text', { x: q[0] + 7, y: q[1] + 14, class: 'sky-time' }, gT); tx.textContent = hm(tp.jd);
    });
    if (p.alt > 0) {
      var qa = proj(p.alt, p.az);
      el('circle', { cx: qa[0], cy: qa[1], r: 16, class: 'sky-target' }, svg);
      el('circle', { cx: qa[0], cy: qa[1], r: 5, class: 'sky-target-dot' }, svg);
    }
    // horizonte y puntos cardinales
    el('circle', { cx: c, cy: c, r: Rr, class: 'sky-horizon' }, svg);
    for (var j = 0; j < 16; j += 2) {
      var az = j * 22.5, q2 = proj(-7.5, az), main = j % 4 === 0;
      var tt = el('text', { x: q2[0], y: q2[1] + 6, 'text-anchor': 'middle', class: main ? 'sky-card main' : 'sky-card' }, svg);
      tt.textContent = t('d.s.' + DIRS[j]);
    }
    var z = el('text', { x: c, y: c - 8, 'text-anchor': 'middle', class: 'sky-zen' }, svg); z.textContent = '+ ' + t('zenithW');
    // textos accesibles
    $('chart-t').textContent = t('chartT', { name: displayName(S.sel.o), h: hm(jd) });
    var consName = cons ? (S.lang === 'en' ? cons[3] : cons[2]) : '';
    var desc = p.alt > 0 ? t('chartD', { dir: dirLong(p.az), alt: nf(p.alt, 0) }) : t('sayBelowShort');
    if (consName && p.alt > 0) desc += ' ' + t('chartCons', { c: consName });
    if (ns && p.alt > 0) desc += ' ' + t('chartStar', { s: ns.name, d: nf(ns.d, 0), sdir: dirLong(ns.az), salt: nf(ns.alt, 0) });
    $('chart-d').textContent = desc;
    $('chart-say').textContent = desc;
    $('chart-cap').textContent = S.orient === 'face' ? t('capFace', { dir: dirLong(p.az) }) : t('capNorth');
  }

  /* ---------- Movimiento: encuadre de la cámara y acercamiento en píxeles ---------- */
  function localOffsets(p0, list) {
    /* Proyección gnomónica en el marco local (arriba = cenit, derecha = azimut creciente),
       con el cielo "congelado" a la hora p0: muestra el cambio respecto de las estrellas. */
    var jd = p0.jd, site = S.site, h0 = A.horizontal(p0.raDate, p0.decDate, jd, site.lat, site.lon, false);
    var a0 = h0.alt * D, z0 = h0.az * D;
    return list.map(function (q) {
      var h = A.horizontal(q[0], q[1], jd, site.lat, site.lon, false), a = h.alt * D, z = h.az * D;
      var cc = Math.sin(a0) * Math.sin(a) + Math.cos(a0) * Math.cos(a) * Math.cos(z - z0);
      if (cc <= 0.05) return null;
      return [Math.cos(a) * Math.sin(z - z0) / cc * R, (Math.cos(a0) * Math.sin(a) - Math.sin(a0) * Math.cos(a) * Math.cos(z - z0)) / cc * R];
    });
  }
  function motionWords(dx, dy) {
    var ang = A.norm360(Math.atan2(dx, dy) * R);   // 0 = arriba, 90 = derecha
    var k = Math.round(ang / 45) % 8;
    return t('mv.' + k);
  }
  function drawMotion() {
    var p = cur(), g = gear(), sc = scale(g), fv = fov(g), plan = computePlan();
    var svg = $('frame'); clearSvg(svg);
    var W = 400, H = 300, fw = Math.min(Math.max(fv[0], 1), 60), fh = fw * H / W;
    var sx = W / fw;
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'frame-bg' }, svg);
    var sd = starsDate(p.jd + A.DT_DAYS);
    var cand = sd.stars.filter(function (s) { return A.separation(s[0], s[1], p.raDate, p.decDate) < fw * 0.75; });
    var offs = localOffsets(p, cand.map(function (s) { return [s[0], s[1]]; }));
    var gS = el('g', { class: 'frame-stars' }, svg);
    offs.forEach(function (o, k) {
      if (!o) return;
      var x = W / 2 + o[0] * sx, y = H / 2 - o[1] * sx;
      if (x < 0 || x > W || y < 0 || y > H) return;
      el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: Math.max(0.8, 4.5 - 0.65 * cand[k][2]).toFixed(2) }, gS);
    });
    // camino del asteroide durante el plan
    var pos = localOffsets(p, plan.shots.map(function (s) { return [s.obs.raDate, s.obs.decDate]; }));
    var mvx = 0, mvy = 0;
    if (pos[0] && pos[pos.length - 1]) { mvx = pos[pos.length - 1][0] - pos[0][0]; mvy = pos[pos.length - 1][1] - pos[0][1]; }
    var len = Math.hypot(mvx, mvy) * sx;
    var ux = len > 0 ? mvx / Math.hypot(mvx, mvy) : 0, uy = len > 0 ? mvy / Math.hypot(mvx, mvy) : 0;
    var L = Math.max(len, 40);
    el('circle', { cx: W / 2, cy: H / 2, r: 9, class: 'frame-target' }, svg);
    if (len > 0 || L) {
      var x2 = W / 2 + ux * L, y2 = H / 2 - uy * L;
      el('line', { x1: W / 2, y1: H / 2, x2: x2, y2: y2, class: 'frame-arrow' }, svg);
      var ah = Math.atan2(-(uy), ux);
      el('path', { d: 'M' + x2 + ' ' + y2 + ' L' + (x2 - 12 * Math.cos(ah - 0.45)) + ' ' + (y2 - 12 * Math.sin(ah - 0.45)) + ' L' + (x2 - 12 * Math.cos(ah + 0.45)) + ' ' + (y2 - 12 * Math.sin(ah + 0.45)) + ' Z', class: 'frame-arrowhead' }, svg);
    }
    var up = el('text', { x: 8, y: 20, class: 'frame-lbl' }, svg); up.textContent = '↑ ' + t('upZen');
    var fl = el('text', { x: W - 8, y: H - 10, 'text-anchor': 'end', class: 'frame-lbl' }, svg); fl.textContent = t('fovLbl', { w: nf(fw, fw < 5 ? 1 : 0), h: nf(fh, fh < 5 ? 1 : 0) });
    $('frame-t').textContent = t('frameT');
    $('frame-cap').textContent = fv[0] > 60 ? t('frameCapWide') : t('frameCap');
    // acercamiento en píxeles
    var z = $('zoom'); clearSvg(z);
    var Z = 300; el('rect', { x: 0, y: 0, width: Z, height: Z, class: 'frame-bg' }, z);
    var pxs = pos.map(function (q) { return q ? [(q[0] - pos[0][0]) * 3600 / sc, (q[1] - pos[0][1]) * 3600 / sc] : null; }).filter(Boolean);
    var span = Math.max(10, Math.max.apply(null, pxs.map(function (q) { return Math.max(Math.abs(q[0]), Math.abs(q[1])); })) * 2.4);
    var k2 = Z / span, cx = Z / 2 - (pxs.length ? pxs[pxs.length - 1][0] / 2 * k2 : 0), cy = Z / 2 + (pxs.length ? pxs[pxs.length - 1][1] / 2 * k2 : 0);
    var gstep = span > 200 ? 50 : (span > 60 ? 10 : 5);
    var gG = el('g', { class: 'zoom-grid' }, z);
    for (var gx = -Math.ceil(span / gstep) * gstep; gx <= span; gx += gstep) {
      el('line', { x1: cx + gx * k2, y1: 0, x2: cx + gx * k2, y2: Z }, gG);
      el('line', { x1: 0, y1: cy + gx * k2, x2: Z, y2: cy + gx * k2 }, gG);
    }
    pxs.forEach(function (q, i) {
      var x = cx + q[0] * k2, y = cy - q[1] * k2;
      el('circle', { cx: x, cy: y, r: 7, class: 'zoom-dot' }, z);
      var tx = el('text', { x: x + 10, y: y - 9, class: 'zoom-lbl' }, z); tx.textContent = String(i + 1);
    });
    var gl = el('text', { x: 8, y: Z - 10, class: 'frame-lbl' }, z); gl.textContent = t('gridLbl', { n: gstep });
    $('zoom-t').textContent = t('zoomT', { n: plan.shots.length });
    $('zoom-cap').textContent = t('zoomCap');
    var r = S.sel;
    var mv = A.motion(r.o, p.jd, S.site);
    $('move-say').textContent = t('moveSay', { rate: nf(mv.rate, mv.rate < 1 ? 2 : 1), hour: nf(mv.rate * 60 / 60, 1), deg: nf(mv.rate * 60 * 24 / 3600, 2), way: len > 0 ? motionWords(mvx, mvy) : '—', pxh: nf(mv.rate * 60 / sc, mv.rate * 60 / sc < 10 ? 1 : 0) });
  }

  /* ---------- Plan de fotos ---------- */
  function niceMinutes(m) {
    if (m < 1) return Math.max(0.5, Math.ceil(m * 2) / 2);
    if (m < 10) return Math.round(m);
    if (m < 60) return Math.round(m / 5) * 5;
    return Math.round(m / 10) * 10;
  }
  function computePlan() {
    var r = S.sel, g = gear(), sc = scale(g), p = cur();
    var mv = A.motion(r.o, p.jd, S.site);
    var n = S.nshots, px = S.px;
    var pxPerMin = mv.rate / sc;
    var raw = pxPerMin > 0 ? px / pxPerMin : 1e9;
    var minGap = g.exp / 60 + 0.5;
    var interval = niceMinutes(Math.max(raw, minGap));
    var total = interval * (n - 1);
    var N = S.night, nightMin = (N.end - N.start) * 1440;
    var multi = total > Math.min(nightMin * 0.8, 360);
    var shots = [], warn = [];
    if (multi) {
      // una foto por noche, a la misma hora: avanza rate × 1440 min
      var perDayPx = pxPerMin * 1440;
      var days = Math.max(1, Math.ceil(px / perDayPx));
      for (var k = 0; k < n; k++) { var jd = p.jd + k * days; var o = A.observe(r.o, jd, S.site); shots.push({ jd: jd, obs: o, day: k * days }); }
      return { multi: true, days: days, n: n, perDayPx: perDayPx, interval: interval, shots: shots, warn: warn, pxPerMin: pxPerMin, sc: sc, g: g };
    }
    var start = p.jd - total / 2 / 1440;
    start = Math.max(N.start, Math.min(start, N.end - total / 1440));
    for (var j = 0; j < n; j++) { var jj = start + j * interval / 1440; shots.push({ jd: jj, obs: A.observe(r.o, jj, S.site) }); }
    var minAlt = +$('minalt').value;
    if (shots.some(function (s) { return s.obs.alt < minAlt; })) warn.push(t('w.low'));
    var trail = pxPerMin * g.exp / 60;
    if (trail > 3) warn.push(t('w.trail', { n: nf(trail, 0) }));
    var totalPx = pxPerMin * total, side = Math.min(g.w, g.h);
    if (totalPx > side * 0.4) warn.push(t('w.frame'));
    if (raw < minGap) warn.push(t('w.fast'));
    return { multi: false, n: n, interval: interval, total: total, shots: shots, warn: warn, pxPerMin: pxPerMin, sc: sc, g: g };
  }
  function renderPlan() {
    var P = computePlan(), box = $('plan'), html = '';
    var shotWord = function (k) { return k === 0 ? t('sh.first') : (k === P.n - 1 ? t('sh.last') : (k === (P.n - 1) / 2 ? t('sh.mid') : t('sh.next'))); };
    if (P.multi) {
      html += '<div class="kpis">' + kpi(P.n, t('k.shots')) + kpi(P.days === 1 ? t('k.everyNight') : t('k.everyN', { n: P.days }), t('k.gap')) + kpi(nf(P.perDayPx, 0) + ' px', t('k.perDay')) + '</div>';
      html += '<p class="box">' + t('multiNote', { h: hm(P.shots[0].jd) }) + '</p><ol class="shots">';
      P.shots.forEach(function (s, k) {
        html += '<li><span class="n" aria-hidden="true">' + (k + 1) + '</span><div><strong>' + t('shotN', { n: k + 1 }) + '</strong> · ' + dayShort(s.jd) + ' ' + hm(s.jd) + '<br><span class="hint">' + t('shotLine', { dir: dirShort(s.obs.az), az: nf(s.obs.az, 0), alt: nf(s.obs.alt, 0), what: shotWord(k) }) + '</span></div></li>';
      });
      html += '</ol>';
    } else {
      html += '<div class="kpis">' + kpi(P.n, t('k.shots')) + kpi(P.interval < 1 ? nf(P.interval * 60, 0) + ' s' : nf(P.interval, P.interval % 1 ? 1 : 0) + ' min', t('k.gap')) + kpi(fmtDur(P.total), t('k.total')) + '</div><ol class="shots">';
      P.shots.forEach(function (s, k) {
        html += '<li><span class="n" aria-hidden="true">' + (k + 1) + '</span><div><strong>' + t('shotN', { n: k + 1 }) + '</strong> · ' + hm(s.jd) + '<br><span class="hint">' + t('shotLine', { dir: dirShort(s.obs.az), az: nf(s.obs.az, 0), alt: nf(s.obs.alt, 0), what: shotWord(k) }) + '</span></div></li>';
      });
      html += '</ol>';
    }
    html += '<p class="hint">' + t('planWhy', { rate: nf(P.pxPerMin * P.sc, 2), s: nf(P.sc, P.sc < 10 ? 2 : 1), px: S.px, ppm: nf(P.pxPerMin, 2) }) + '</p>';
    P.warn.forEach(function (w) { html += '<p class="warn">' + w + '</p>'; });
    html += '<p class="hint">' + t('planTip') + '</p>';
    box.innerHTML = html;
    S.plan = P;
  }
  function dayShort(jd) { return new Intl.DateTimeFormat(S.lang === 'en' ? 'en-GB' : 'es-UY', { timeZone: tz(), weekday: 'short', day: 'numeric', month: 'short' }).format(A.dateFromJd(jd)); }
  function kpi(v, k) { return '<div class="kpi"><span class="v">' + v + '</span><span class="k">' + k + '</span></div>'; }
  function fmtDur(min) { if (min < 60) return nf(min, min % 1 ? 1 : 0) + ' min'; var h = Math.floor(min / 60), m = Math.round(min % 60); return h + ' h' + (m ? ' ' + m + ' min' : ''); }

  function renderData() {
    var p = cur(), r = S.sel, mo = A.moon(p.jd, S.site);
    var rows = [
      [t('dt.ra'), raHms(p.ra)], [t('dt.dec'), decDms(p.dec)],
      [t('dt.alt'), nf(p.alt, 1) + '°'], [t('dt.az'), nf(p.az, 1) + '° (' + dirShort(p.az) + ')'],
      [t('dt.V'), nf(p.V, 1) + ' ' + t('dt.Vnote')], [t('dt.H'), nf(r.o.H, 2)],
      [t('dt.delta'), nf(p.delta, 3) + ' UA (' + nf(p.delta * 149.5978707, 1) + ' ' + t('mkm') + ')'], [t('dt.r'), nf(p.r, 3) + ' UA'],
      [t('dt.phase'), nf(p.phase, 0) + '°'], [t('dt.elong'), nf(p.elong, 0) + '°'],
      [t('dt.moon'), mo.alt > 0 ? t('dt.moonSep', { d: nf(A.separation(mo.raDate, mo.decDate, p.raDate, p.decDate), 0), p: nf(mo.illum * 100, 0) }) : t('dt.moonDown')],
      [t('dt.class'), (r.o.cls || '—') + (r.o.neo ? ' · NEO' : '')], [t('dt.orbit'), 'a = ' + nf(r.o.a, 3) + ' UA · e = ' + nf(r.o.e, 3) + ' · i = ' + nf(r.o.i, 1) + '°']
    ];
    $('data-table').innerHTML = '<tbody>' + rows.map(function (q) { return '<tr><th scope="row">' + q[0] + '</th><td>' + q[1] + '</td></tr>'; }).join('') + '</tbody>';
  }
  function renderTrackTable() {
    var rows = S.track.filter(function (q, k) { return k % 3 === 0; });
    var html = '<caption class="ue-sr">' + t('trackCap') + '</caption><thead><tr><th scope="col">' + t('tt.h') + '</th><th scope="col">' + t('tt.dir') + '</th><th scope="col">' + t('tt.az') + '</th><th scope="col">' + t('tt.alt') + '</th><th scope="col">' + t('tt.V') + '</th></tr></thead><tbody>';
    rows.forEach(function (q) { html += '<tr' + (q.alt < 0 ? ' class="dim"' : '') + '><th scope="row">' + hm(q.jd) + '</th><td>' + dirLong(q.az) + '</td><td>' + nf(q.az, 0) + '°</td><td>' + nf(q.alt, 0) + '°</td><td>' + nf(q.V, 1) + '</td></tr>'; });
    $('track-table').innerHTML = html + '</tbody>';
  }
  function links() {
    var r = S.sel, p = cur();
    var nm = r.o.name || r.o.pdes;
    $('lnk-stellarium').href = 'https://stellarium-web.org/skysource/' + encodeURIComponent(nm) + '?fov=20&date=' + A.dateFromJd(p.jd).toISOString().slice(0, 19) + 'Z&lat=' + S.site.lat + '&lng=' + S.site.lon;
    var g = gear();
    $('lnk-compare').href = 'comparador.html?ast=' + encodeURIComponent(displayName(r.o)) + '&pdes=' + encodeURIComponent(r.o.pdes) +
      '&lat=' + S.site.lat + '&lon=' + S.site.lon + '&f=' + g.f + '&pix=' + g.pix;
    $('lnk-jpl').href = 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=' + encodeURIComponent(r.o.pdes);
  }

  /* ---------- CSV ---------- */
  function csv() {
    var r = S.sel, es = S.lang !== 'en', sep = es ? ';' : ',';
    var num = function (x, d) { var s = x.toFixed(d); return es ? s.replace('.', ',') : s; };
    var shotAt = {};
    (S.plan ? S.plan.shots : []).forEach(function (s, k) { shotAt[k] = s; });
    var head = es ? ['hora_local', 'fecha_hora_UTC', 'ascension_recta_J2000_h', 'declinacion_J2000_grados', 'altura_grados', 'azimut_grados', 'rumbo', 'magnitud_V', 'foto'] :
      ['local_time', 'UTC_datetime', 'right_ascension_J2000_h', 'declination_J2000_deg', 'altitude_deg', 'azimuth_deg', 'direction', 'V_magnitude', 'shot'];
    var lines = [head.join(sep)];
    function row(q, shot) { return [hm(q.jd), A.dateFromJd(q.jd).toISOString().slice(0, 16).replace('T', ' '), num(q.ra / 15, 5), num(q.dec, 4), num(q.alt, 2), num(q.az, 2), dirShort(q.az), num(q.V, 2), shot || ''].join(sep); }
    S.track.forEach(function (q) { lines.push(row(q, '')); });
    lines.push('');
    lines.push(es ? '# Plan de fotos' : '# Shot plan');
    Object.keys(shotAt).forEach(function (k) { var s = shotAt[k]; s.obs.jd = s.jd; lines.push(row(s.obs, String(+k + 1))); });
    lines.push('');
    lines.push((es ? '# Lugar: ' : '# Site: ') + S.site.name + ' (' + S.site.lat + ', ' + S.site.lon + ') · ' + (es ? 'Cálculo propio con elementos de JPL SBDB; valores estimados.' : 'Computed from JPL SBDB elements; estimated values.'));
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'asteroide-' + (r.o.name || r.o.pdes).replace(/[^\w-]+/g, '_') + '-' + $('date').value + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Brújula ---------- */
  var comp = { on: false, heading: null, beta: null };
  function openCompass() {
    var p = cur(), d = $('compass');
    $('compass-target').textContent = t('compTarget', { dir: dirLong(p.az), az: nf(p.az, 0), alt: nf(p.alt, 0) });
    $('compass-say').textContent = ('DeviceOrientationEvent' in window) ? t('compPress') : t('compNo');
    drawCompass(null);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function startCompass() {
    var DOE = window.DeviceOrientationEvent;
    if (!DOE) { $('compass-say').textContent = t('compNo'); return; }
    var go = function () {
      if (comp.on) return; comp.on = true;
      var abs = 'ondeviceorientationabsolute' in window;
      window.addEventListener(abs ? 'deviceorientationabsolute' : 'deviceorientation', onOrient, true);
      $('compass-say').textContent = t('compWait');
      setTimeout(function () { if (comp.heading == null) $('compass-say').textContent = t('compNoData'); }, 3000);
    };
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then(function (s) { if (s === 'granted') go(); else $('compass-say').textContent = t('compDenied'); }).catch(function () { $('compass-say').textContent = t('compDenied'); });
    } else go();
  }
  function onOrient(e) {
    var h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if (e.absolute !== false && typeof e.alpha === 'number') h = 360 - e.alpha;
    if (h == null) return;
    var so = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    h = A.norm360(h + so + (+$('decl').value || 0));
    comp.heading = h; comp.beta = e.beta;
    drawCompass(h);
  }
  var lastSay = 0;
  function drawCompass(h) {
    var svg = $('compass-svg'); clearSvg(svg);
    var p = cur(), c = 150;
    el('circle', { cx: c, cy: c, r: 130, class: 'comp-bg' }, svg);
    var diff = h == null ? 0 : ((p.az - h + 540) % 360) - 180;
    var ok = h != null && Math.abs(diff) <= 10;
    var g = el('g', { transform: 'rotate(' + diff + ' ' + c + ' ' + c + ')', class: ok ? 'comp-arrow ok' : 'comp-arrow' }, svg);
    el('path', { d: 'M150 30 L190 110 L163 102 L163 230 L137 230 L137 102 L110 110 Z' }, g);
    if (h == null) return;
    var now = Date.now();
    if (now - lastSay > 800) {
      lastSay = now;
      $('compass-say').textContent = ok ? t('compOk') : (diff > 0 ? t('compRight', { d: nf(Math.abs(diff), 0) }) : t('compLeft', { d: nf(Math.abs(diff), 0) }));
      if (typeof comp.beta === 'number') {
        var tilt = comp.beta - 90;
        $('compass-tilt').textContent = t('compTilt', { now: nf(tilt, 0), want: nf(p.alt, 0) });
      }
    }
  }
  function closeCompass() {
    window.removeEventListener('deviceorientationabsolute', onOrient, true);
    window.removeEventListener('deviceorientation', onOrient, true);
    comp.on = false; comp.heading = null;
    var d = $('compass'); if (d.close) d.close(); else d.removeAttribute('open');
  }

  /* ---------- Inicio ---------- */
  function todayStr() {
    var now = new Date(); if (now.getHours() < 8) now = new Date(now.getTime() - 86400000);
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }
  function init() {
    var st = load();
    var L0 = null; try { L0 = localStorage.getItem('asterfoto.lang'); } catch (e) { /* sin guardar */ }
    S.lang = (L0 || st.lang) === 'en' ? 'en' : ((L0 || st.lang) === 'es' ? 'es' : ((navigator.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es'));
    fillCities();
    $('profile').value = PROFILES[st.profile] || st.profile === 'custom' ? st.profile : 'normal';
    if (st.profile === 'custom' && st.gear) { $('g-f').value = st.gear.f; $('g-pix').value = st.gear.pix; $('g-w').value = st.gear.w; $('g-h').value = st.gear.h; $('g-exp').value = st.gear.exp; }
    else setProfile($('profile').value, false);
    if (st.mag) $('mag').value = st.mag;
    $('minalt').value = st.minalt || 20;
    $('neo').checked = !!st.neo;
    S.nshots = st.nshots === 3 ? 3 : 5; S.px = st.px || 10;
    document.querySelector('input[name="nshots"][value="' + S.nshots + '"]').checked = true;
    $('pxmove').value = S.px;
    $('decl').value = st.decl != null && st.decl !== '' ? st.decl : -9;
    $('date').value = todayStr();
    if (st.gps && st.lat && st.lon) {
      $('lat').value = st.lat; $('lon').value = st.lon; manualCoords();
    } else {
      var ci = st.city != null && window.LUGARES[+st.city] ? +st.city : 0;
      $('city').value = String(ci); setCity(ci);
    }
    applyI18n();

    $('btn-lang').addEventListener('click', function () { S.lang = S.lang === 'es' ? 'en' : 'es'; try { localStorage.setItem('asterfoto.lang', S.lang); } catch (e) { /* sin guardar */ } applyI18n(); save(); });
    $('btn-gps').addEventListener('click', useGps);
    $('city').addEventListener('change', function () { if (this.value !== 'gps') { setCity(+this.value); save(); invalidate(); } });
    $('lat').addEventListener('change', manualCoords); $('lon').addEventListener('change', manualCoords);
    $('date').addEventListener('change', invalidate);
    $('profile').addEventListener('change', function () { if (this.value !== 'custom') setProfile(this.value, false); updateProfileHint(); if (this.value === 'custom') $('gear-details').open = true; save(); if (S.sel) renderDetail(); });
    ['g-f', 'g-pix', 'g-w', 'g-h', 'g-exp'].forEach(function (id) { $(id).addEventListener('input', function () { $('profile').value = 'custom'; updateProfileHint(); updateGearOut(); save(); if (S.sel) { drawMotion(); renderPlan(); } }); });
    ['mag', 'minalt'].forEach(function (id) { $(id).addEventListener('input', function () { updateOutputs(); save(); }); });
    $('neo').addEventListener('change', save);
    $('planner').addEventListener('submit', function (e) { e.preventDefault(); search(); });
    $('sort').addEventListener('change', function () { sortResults(); renderResults(true); });
    $('btn-more').addEventListener('click', function () { var k = S.shown; addCards(PAGE); updateStatus(); var li = $('results-list').children[k]; if (li) { var b = li.querySelector('button'); if (b) b.focus(); } });
    $('btn-back').addEventListener('click', function () {
      $('detail').hidden = true; var li = $('results-list').children[S.selIdx];
      if (li) { li.scrollIntoView({ block: 'center' }); var b = li.querySelector('button'); if (b) b.focus(); }
    });
    $('tsel').addEventListener('input', function () { S.tIdx = +this.value; renderDetail(); });
    $('btn-best').addEventListener('click', function () { S.tIdx = S.bestIdx; $('tsel').value = S.bestIdx; renderDetail(); });
    $('orient-face').addEventListener('click', function () { S.orient = 'face'; this.setAttribute('aria-pressed', 'true'); $('orient-north').setAttribute('aria-pressed', 'false'); drawChart(); });
    $('orient-north').addEventListener('click', function () { S.orient = 'north'; this.setAttribute('aria-pressed', 'true'); $('orient-face').setAttribute('aria-pressed', 'false'); drawChart(); });
    document.querySelectorAll('input[name="nshots"]').forEach(function (r) { r.addEventListener('change', function () { S.nshots = +this.value; save(); drawMotion(); renderPlan(); }); });
    $('pxmove').addEventListener('input', function () { S.px = +this.value; updateOutputs(); save(); drawMotion(); renderPlan(); });
    $('btn-csv').addEventListener('click', csv);
    $('btn-print').addEventListener('click', function () { window.print(); });
    $('btn-compass').addEventListener('click', openCompass);
    $('btn-compass-start').addEventListener('click', startCompass);
    $('btn-compass-close').addEventListener('click', closeCompass);
    $('compass').addEventListener('close', closeCompass);
    $('decl').addEventListener('change', save);

    loadCatalog();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
