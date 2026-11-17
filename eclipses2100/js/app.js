/* Sombras sonoras — aplicación
   Tres pasos: Lugar → Eclipses → Escuchar. Más: ¿Qué es un eclipse?, Observar sin riesgo, Acerca de.
   Rutas: #/  #/eclipses  #/escuchar/<id>  #/eclipse  #/seguridad  #/acerca */
(function () {
  'use strict';
  var APP = { version: '1.0', year: 2026 };
  var $ = function (id) { return document.getElementById(id); };
  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- Almacenamiento ---------------- */
  var store = {
    get: function (k, def) { try { var v = localStorage.getItem('sombras.' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem('sombras.' + k, JSON.stringify(v)); } catch (e) { /* modo privado */ } }
  };

  /* ---------------- Idioma ---------------- */
  var lang = 'es';
  function langInfo() { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === lang) return LANGS[i]; return LANGS[0]; }
  function detectLang() {
    var saved = store.get('lang', null);
    if (saved && STRINGS[saved]) return saved;
    var list = navigator.languages || [navigator.language || 'es'];
    for (var i = 0; i < list.length; i++) {
      var base = String(list[i]).toLowerCase().split('-')[0];
      if (STRINGS[base]) return base;
    }
    return 'es';
  }
  function t(key, params) {
    var s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.es[key] || key;
    if (params) Object.keys(params).forEach(function (k) { s = s.split('{' + k + '}').join(params[k]); });
    return s;
  }
  function tn(key, n, params) {
    var cat = 'other';
    try { cat = new Intl.PluralRules(langInfo().tag).select(n) === 'one' ? 'one' : 'other'; } catch (e) { cat = n === 1 ? 'one' : 'other'; }
    var p = params || {}; p.n = n;
    return t(key + '_' + cat, p);
  }
  function applyI18n() {
    qsa('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    qsa('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    qsa('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':'); if (p[0] && p[1]) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
    document.title = t('doc_title');
    $('about-version').textContent = t('about_version', { v: APP.version }) + ' (' + APP.year + ')';
  }
  function setLang(code, persist) {
    lang = STRINGS[code] ? code : 'es';
    if (persist) store.set('lang', lang);
    document.documentElement.lang = langInfo().tag;   // ue.js traduce sus botones al ver este cambio
    applyI18n();
    $('lang-select').value = lang;
    fillCountrySelect();
    renderPlaceHelpers();
    if (route.name === 'events') renderEvents();
    if (route.name === 'listen' && current.ev) renderListenStatic();
  }
  function fillLangSelect() {
    var sel = $('lang-select');
    sel.innerHTML = LANGS.map(function (l) { return '<option value="' + l.code + '" lang="' + l.tag + '">' + l.label + '</option>'; }).join('');
    sel.addEventListener('change', function () { setLang(sel.value, true); announce(sel.options[sel.selectedIndex].text); });
  }

  /* ---------------- Formatos ---------------- */
  function fmt(ms, tz, opts) {
    var o = {}; for (var k in opts) o[k] = opts[k];
    try { o.timeZone = tz; return new Intl.DateTimeFormat(langInfo().tag, o).format(ms); }
    catch (e) { delete o.timeZone; return new Intl.DateTimeFormat(langInfo().tag, o).format(ms); }
  }
  var fDate = function (ms, tz) { return fmt(ms, tz, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); };
  var fLongDate = function (ms, tz) { return fmt(ms, tz, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
  var fHM = function (ms, tz) { return fmt(ms, tz, { hour: '2-digit', minute: '2-digit', hour12: false }); };
  var fHMS = function (ms, tz) { return fmt(ms, tz, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); };
  var pct = function (x) { return Math.round(x * 100); };
  function countryName(cc) {
    try { if (window.Intl && Intl.DisplayNames) return new Intl.DisplayNames([langInfo().tag], { type: 'region' }).of(cc); } catch (e) { /* respaldo */ }
    return COUNTRY_ES[cc] || cc;
  }
  function cityName(c) { return (lang === 'es' || lang === 'pt' || !c[1]) ? c[0] : c[1]; }
  function norm(s) { return String(s).toLowerCase().normalize ? String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : String(s).toLowerCase(); }

  /* ---------------- Avisos accesibles y voz ---------------- */
  function announce(text) {
    var live = $('live'); live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 60);
  }
  function speak(text) {
    if (!$('opt-voice').checked || !('speechSynthesis' in window)) { announce(text); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text); u.lang = langInfo().tag;
      window.speechSynthesis.speak(u);
    } catch (e) { announce(text); }
  }
  function buzz(p) { if ($('opt-vibrate').checked && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* sin vibración */ } } }

  /* ---------------- Lugar ---------------- */
  var place = store.get('place', null);
  var deviceTz = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
  function placeFromCity(c) { return { name: c[0], en: c[1] || '', cc: c[2], lat: c[3], lon: c[4], tz: c[5] }; }
  function placeLabel(p) {
    if (!p) return '';
    if (p.gps) return t('gps_place', { city: p.near ? ((lang === 'es' || lang === 'pt' || !p.nearEn) ? p.near : p.nearEn) : '—' });
    var n = (lang === 'es' || lang === 'pt' || !p.en) ? p.name : p.en;
    return n + ', ' + countryName(p.cc);
  }
  function choosePlace(p) {
    place = p; store.set('place', p);
    if (!p.gps) {
      var rec = store.get('recent', []).filter(function (r) { return r.name !== p.name || r.cc !== p.cc; });
      rec.unshift(p); store.set('recent', rec.slice(0, 5));
    }
    announce(t('place_set', { place: placeLabel(p) }));
    go('#/eclipses');
  }
  var detectedCC = (function () {
    for (var i = 0; i < CITIES.length; i++) if (CITIES[i][5] === deviceTz) return CITIES[i][2];
    return null;
  })();

  function chip(c, p) {
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'chip';
    b.textContent = p ? placeLabel(p) : cityName(c);
    b.addEventListener('click', function () { choosePlace(p || placeFromCity(c)); });
    li.appendChild(b); return li;
  }
  function renderPlaceHelpers() {
    var rec = store.get('recent', []);
    $('recent-wrap').hidden = !rec.length;
    var rl = $('recent-list'); rl.innerHTML = '';
    rec.forEach(function (p) { rl.appendChild(chip(null, p)); });
    var cw = $('country-wrap');
    if (detectedCC) {
      cw.hidden = false;
      $('country-h').textContent = t('country_h', { country: countryName(detectedCC) });
      var cl = $('country-list'); cl.innerHTML = '';
      CITIES.filter(function (c) { return c[2] === detectedCC; }).slice(0, 8).forEach(function (c) { cl.appendChild(chip(c)); });
    } else cw.hidden = true;
  }

  /* Buscador (patrón «combobox» con lista de sugerencias, WAI-ARIA) */
  var searchIdx = -1, searchHits = [];
  function doSearch() {
    var input = $('city-search'), list = $('city-results'), q = norm(input.value.trim());
    searchIdx = -1; list.innerHTML = '';
    if (q.length < 2) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); $('search-status').textContent = ''; input.removeAttribute('aria-activedescendant'); return; }
    searchHits = CITIES.filter(function (c) {
      var hay = [c[0], c[1], countryName(c[2]), COUNTRY_ES[c[2]]].map(norm);
      return hay.some(function (h) { return h.indexOf(q) === 0 || h.indexOf(' ' + q) >= 0 || h.indexOf('(' + q) >= 0; });
    }).sort(function (a, b) { return (a[2] === detectedCC ? 0 : 1) - (b[2] === detectedCC ? 0 : 1); }).slice(0, 7);
    searchHits.forEach(function (c, i) {
      var li = document.createElement('li');
      li.id = 'opt-' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
      li.innerHTML = '<span class="r-city"></span> <span class="r-country"></span>';
      li.querySelector('.r-city').textContent = cityName(c);
      li.querySelector('.r-country').textContent = countryName(c[2]);
      li.addEventListener('mousedown', function (e) { e.preventDefault(); });
      li.addEventListener('click', function () { choosePlace(placeFromCity(c)); });
      list.appendChild(li);
    });
    if (!searchHits.length) {
      var none = document.createElement('li'); none.className = 'r-none'; none.textContent = t('search_none'); list.appendChild(none);
    }
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
    $('search-status').textContent = searchHits.length ? tn('search_n', searchHits.length) : t('search_none');
  }
  function moveSearch(d) {
    if (!searchHits.length) return;
    searchIdx = (searchIdx + d + searchHits.length) % searchHits.length;
    qsa('#city-results [role=option]').forEach(function (li, i) { li.setAttribute('aria-selected', i === searchIdx ? 'true' : 'false'); });
    $('city-search').setAttribute('aria-activedescendant', 'opt-' + searchIdx);
    var el = $('opt-' + searchIdx); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function initSearch() {
    var input = $('city-search');
    input.addEventListener('input', doSearch);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if ($('city-results').hidden) doSearch(); moveSearch(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearch(-1); }
      else if (e.key === 'Enter') { var c = searchHits[searchIdx >= 0 ? searchIdx : 0]; if (c && input.value.trim().length >= 2) { e.preventDefault(); choosePlace(placeFromCity(c)); } }
      else if (e.key === 'Escape') { $('city-results').hidden = true; input.setAttribute('aria-expanded', 'false'); }
    });
    input.addEventListener('blur', function () { setTimeout(function () { $('city-results').hidden = true; input.setAttribute('aria-expanded', 'false'); }, 150); });
  }

  /* Elegir por país: país → ciudad */
  function fillCountrySelect() {
    var sel = $('country-select'), prev = sel.value;
    var codes = []; CITIES.forEach(function (c) { if (codes.indexOf(c[2]) < 0) codes.push(c[2]); });
    var coll; try { coll = new Intl.Collator(langInfo().tag); } catch (e) { coll = { compare: function (a, b) { return a < b ? -1 : 1; } }; }
    codes.sort(function (a, b) { return coll.compare(countryName(a), countryName(b)); });
    sel.innerHTML = '<option value="">' + t('choose') + '</option>' + codes.map(function (cc) { return '<option value="' + cc + '">' + countryName(cc) + '</option>'; }).join('');
    sel.value = prev || detectedCC || '';
    fillCitySelect();
  }
  function fillCitySelect() {
    var cc = $('country-select').value, sel = $('city-select');
    if (!cc) { sel.innerHTML = '<option value="">' + t('choose') + '</option>'; sel.disabled = true; $('country-go').disabled = true; return; }
    sel.innerHTML = CITIES.map(function (c, i) { return c[2] === cc ? '<option value="' + i + '">' + cityName(c) + '</option>' : ''; }).join('');
    sel.disabled = false; $('country-go').disabled = false;
  }
  function initByCountry() {
    $('country-select').addEventListener('change', fillCitySelect);
    $('country-go').addEventListener('click', function () { var i = +$('city-select').value; if (CITIES[i]) choosePlace(placeFromCity(CITIES[i])); });
  }

  /* GPS */
  function km(a1, o1, a2, o2) {
    var r = Math.PI / 180, dA = (a2 - a1) * r, dO = (o2 - o1) * r;
    var h = Math.sin(dA / 2) * Math.sin(dA / 2) + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) * Math.sin(dO / 2);
    return 12742 * Math.asin(Math.sqrt(h));
  }
  function initGps() {
    $('gps-btn').addEventListener('click', function () {
      var msg = $('gps-msg');
      if (!navigator.geolocation) { msg.textContent = t('gps_err'); return; }
      msg.textContent = t('gps_wait');
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude, lon = pos.coords.longitude, best = null, bd = 1e9;
        CITIES.forEach(function (c) { var d = km(lat, lon, c[3], c[4]); if (d < bd) { bd = d; best = c; } });
        msg.textContent = t('gps_note');
        choosePlace({ gps: true, lat: +lat.toFixed(3), lon: +lon.toFixed(3), tz: deviceTz, cc: best ? best[2] : '', near: best ? best[0] : '', nearEn: best ? best[1] : '' });
      }, function (err) {
        msg.textContent = t(err && err.code === 1 ? 'gps_denied' : 'gps_err');
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });
  }

  /* ---------------- Lista de eclipses ---------------- */
  var events = [], eventsKey = '', filter = store.get('filter', 'all');
  var CACHE_V = 1;
  var worker = null;
  function computeList(p, cb) {
    var key = p.lat.toFixed(2) + ',' + p.lon.toFixed(2);
    var cached = store.get('cache', null);
    if (cached && cached.k === key && cached.v === CACHE_V) { cb(cached.list); return; }
    var done = function (list) { store.set('cache', { k: key, v: CACHE_V, list: list }); cb(list); };
    if (window.Worker && location.protocol !== 'file:') {
      try {
        if (!worker) worker = new Worker('js/worker.js');
        worker.onmessage = function (e) { if (e.data && e.data.ok) done(e.data.list); else fallback(); };
        worker.onerror = function () { worker = null; fallback(); };
        worker.postMessage({ lat: p.lat, lon: p.lon });
        return;
      } catch (e) { /* sin worker */ }
    }
    fallback();
    function fallback() { setTimeout(function () { done(EclipseList.forPlace(p)); }, 30); }
  }
  function ensureEvents(cb) {
    var key = place.lat.toFixed(2) + ',' + place.lon.toFixed(2);
    if (eventsKey === key && events.length) { cb(); return; }
    $('ev-status').textContent = t('calculating');
    $('ev-status').classList.add('busy');
    computeList(place, function (list) { events = list; eventsKey = key; $('ev-status').classList.remove('busy'); cb(); });
  }
  function kindKey(ev) { return 'kind_' + ev.body + '_' + ev.kind; }
  function covText(ev) {
    if (ev.body === 'moon') return ev.kind === 'total' ? t('cov_moon_total') : t('cov_moon', { p: pct(ev.cover) });
    return t('cov_sun', { p: pct(ev.cover) });
  }
  function visText(ev) {
    if (ev.vis === 'full') return '';
    if (ev.vis === 'part') return t('vis_part');
    return t('vis_' + ev.vis + '_' + ev.body);
  }
  var ICON = {
    sun: '<svg class="ev-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" class="ico-sun"/><circle cx="15.5" cy="10" r="7.6" class="ico-moon-dark"/></svg>',
    moon: '<svg class="ev-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" class="ico-moon-red"/><circle cx="12" cy="12" r="9" fill="none" class="ico-ring"/></svg>'
  };
  function evItem(ev, now, badge) {
    var li = document.createElement('li'), a = document.createElement('a');
    a.href = '#/escuchar/' + ev.id; a.className = 'ev' + (ev.peak < now - 3 * 3600000 ? ' ev-past' : '');
    var vis = visText(ev);
    a.innerHTML = ICON[ev.body] +
      '<span class="ev-main"><span class="ev-title"></span><span class="ev-date"></span><span class="ev-meta"></span></span>' +
      (badge ? '<span class="badge"></span>' : '');
    a.querySelector('.ev-title').textContent = t(kindKey(ev));
    a.querySelector('.ev-date').textContent = fDate(ev.peak, place.tz) + ' · ' + fHM(ev.peak, place.tz);
    a.querySelector('.ev-meta').textContent = covText(ev) + (vis ? ' · ' + vis : '');
    if (badge) a.querySelector('.badge').textContent = badge;
    li.appendChild(a); return li;
  }
  function filtered() { return events.filter(function (e) { return filter === 'all' || e.body === filter; }); }
  function renderEvents() {
    if (!place) return;
    $('ev-place').textContent = t('ev_from', { place: placeLabel(place) });
    ensureEvents(function () {
      var now = Date.now(), list = filtered();
      var next = list.filter(function (e) { return e.end > now; });
      var past = list.filter(function (e) { return e.end <= now; }).reverse();
      $('ev-status').textContent = tn('ev_count', list.length);
      var ul = $('ev-next'); ul.innerHTML = '';
      next.forEach(function (e, i) {
        var badge = (e.start <= now && e.end > now) ? t('badge_now') : (i === 0 ? t('badge_next') : '');
        ul.appendChild(evItem(e, now, badge));
      });
      $('ev-none').hidden = next.length > 0;
      var pu = $('ev-past'); pu.innerHTML = '';
      past.forEach(function (e) { pu.appendChild(evItem(e, now, '')); });
      $('past-wrap').hidden = !past.length;
      $('past-sum').textContent = t('past_h', { n: past.length });
    });
  }
  function initFilter() {
    qsa('#filter input').forEach(function (r) {
      r.checked = r.value === filter;
      r.addEventListener('change', function () { filter = r.value; store.set('filter', filter); renderEvents(); });
    });
  }

  /* ---------------- Escuchar ---------------- */
  var current = { ev: null, t: 0, w0: 0, w1: 0, playing: false, live: false, last: 0, lastTen: -1, lastAlt: null, frame: null };
  var speed = store.get('speed', '60');
  var MARK_VIB = { start: [200], end: [200, 120, 200], max: [100, 80, 100, 80, 100], central_in: [300, 120, 300], central_out: [300] };

  function moments(ev) {
    var m = [{ k: 'start', t: ev.start, label: 'm_start' }];
    if (ev.c2) m.push({ k: 'central_in', t: ev.c2, label: ev.body === 'sun' && ev.kind === 'annular' ? 'm_c2_annular' : 'm_c2_total' });
    m.push({ k: 'max', t: ev.peak, label: 'm_max' });
    if (ev.c3) m.push({ k: 'central_out', t: ev.c3, label: ev.body === 'sun' && ev.kind === 'annular' ? 'm_c3_annular' : 'm_c3_total' });
    m.push({ k: 'end', t: ev.end, label: 'm_end' });
    return m;
  }
  function renderListenStatic() {
    var ev = current.ev;
    $('ls-h').textContent = t(kindKey(ev));
    $('ls-sub').textContent = fLongDate(ev.peak, place.tz) + ' · ' + placeLabel(place);
    var dl = $('moments'); dl.innerHTML = '';
    moments(ev).forEach(function (m) {
      var d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = t(m.label); dd.textContent = fHM(m.t, place.tz) + (m.k === 'max' ? ' · ' + covText(ev) : '');
      d.appendChild(dt); d.appendChild(dd); dl.appendChild(d);
    });
    // Marcas en la línea de tiempo
    var marks = $('marks'); marks.innerHTML = '';
    moments(ev).forEach(function (m) {
      var s = document.createElement('span'); s.className = 'tick tick-' + m.k;
      s.style.left = ((m.t - current.w0) / (current.w1 - current.w0) * 100).toFixed(2) + '%';
      marks.appendChild(s);
    });
    $('sun-safety').hidden = ev.body !== 'sun';
    $('moon-safety').hidden = ev.body !== 'moon';
    $('what-link').href = '#/eclipse/' + ev.body + '-' + ev.kind;
    // En SVG la propiedad «hidden» no existe: se usa el atributo
    $('g-sun').toggleAttribute('hidden', ev.body !== 'sun');
    $('g-moon').toggleAttribute('hidden', ev.body !== 'moon');
    $('disc-cap').textContent = ev.body === 'sun' ? (sunImg.live ? t('sun_img_live') : t('sun_img_saved', { d: fmt(sunImg.date, 'UTC', { day: 'numeric', month: 'long', year: 'numeric' }) })) : t('moon_drawn');
    var list = filtered(), i = list.indexOf(ev);
    $('prev-ev').disabled = i <= 0; $('next-ev').disabled = i < 0 || i >= list.length - 1;
    updatePlayButton();
    drawAt(current.t, true);
  }
  function openEvent(id) {
    var ev = null;
    for (var i = 0; i < events.length; i++) if (events[i].id === id) ev = events[i];
    if (!ev) { go('#/eclipses'); return; }
    stopPlay(true);
    var span = ev.end - ev.start, pad = Math.max(3 * 60000, span * 0.06);
    current.ev = ev; current.w0 = ev.start - pad; current.w1 = ev.end + pad;
    var now = Date.now();
    current.live = now >= current.w0 && now <= current.w1;
    current.t = current.live ? now : current.w0;
    current.lastTen = -1; current.lastAlt = null;
    $('live-badge').hidden = !current.live;
    if (current.live) setSpeed('real');
    renderListenStatic();
  }

  function stateAt(ms) { return EclipseList.view(current.ev, place, ms); }
  function phaseText(st) {
    var ev = current.ev, txt = t('ph_' + st.phase);
    if (st.alt < -0.6 && st.phase !== 'before' && st.phase !== 'after') txt += ' · ' + t(ev.body === 'sun' ? 'below_sun' : 'below_moon');
    return txt;
  }
  function drawAt(ms, force) {
    var ev = current.ev; if (!ev) return null;
    var st = stateAt(ms);
    var ang = (st.pa - st.q) * Math.PI / 180;
    if (ev.body === 'sun') {
      var mo = $('moon-over');
      var dist = Math.min(4, st.sep);
      mo.setAttribute('r', (100 * st.ratio).toFixed(2));
      mo.setAttribute('cx', (-Math.sin(ang) * dist * 100).toFixed(2));
      mo.setAttribute('cy', (-Math.cos(ang) * dist * 100).toFixed(2));
      $('sun-img').setAttribute('transform', 'rotate(' + (st.q - sunImg.p).toFixed(1) + ')');
    } else {
      var d2 = Math.min(6, st.sep), cx = (-Math.sin(ang) * d2 * 100).toFixed(2), cy = (-Math.cos(ang) * d2 * 100).toFixed(2);
      ['umbra', 'penumbra'].forEach(function (id) { $(id).setAttribute('cx', cx); $(id).setAttribute('cy', cy); });
      $('umbra').setAttribute('r', (st.ru * 100).toFixed(1));
      $('penumbra').setAttribute('r', (st.rp * 100).toFixed(1));
      $('g-moon').classList.toggle('is-total', st.phase === 'total_moon');
      updateMoonImage(ms, force);
    }
    var p = pct(st.cover);
    $('pct').textContent = p + '%';
    $('phase').textContent = phaseText(st);
    $('clock').textContent = fHMS(ms, place.tz);
    var sc = $('scrub');
    sc.value = Math.round((ms - current.w0) / (current.w1 - current.w0) * 1000);
    sc.setAttribute('aria-valuetext', fHM(ms, place.tz) + ', ' + phaseText(st) + ', ' + p + ' %');
    return st;
  }

  /* Imagen realista de la Luna (js/luna.js): se dibuja con la orientación de un instante y, mientras pasa el
     tiempo, solo se gira para seguir el giro del campo visual. Se vuelve a dibujar cada 10 minutos simulados
     (libración diaria) o al cambiar de eclipse o de lugar. */
  var moonPic = { U: null, t: 0, key: '', busy: false, url: null, failed: false };
  function moonPx() {
    var w = $('disc').getBoundingClientRect().width || 280;
    return Math.max(256, Math.min(1024, Math.round(w * 200 / 260 * (window.devicePixelRatio || 1) * 1.25)));
  }
  function rotateMoonImage(f) {
    if (!moonPic.U) return;
    var th = Math.atan2(EclipseList.dot(moonPic.U, f.R), EclipseList.dot(moonPic.U, f.U)) * 180 / Math.PI;
    $('moon-img').setAttribute('transform', 'rotate(' + th.toFixed(2) + ')');
  }
  function updateMoonImage(ms, force) {
    if (moonPic.failed || !place) return;
    var key = current.ev.id + '|' + place.lat + ',' + place.lon;
    var f = EclipseList.moonFrame(place, ms);
    rotateMoonImage(f);
    var stale = force || moonPic.key !== key || Math.abs(ms - moonPic.t) > 10 * 60000;
    if (!stale || moonPic.busy) return;
    moonPic.busy = true;
    if (moonPic.key !== key) { $('moon-img').removeAttribute('href'); moonPic.U = null; }
    MoonImage.load(function (ok) {
      if (!ok) { moonPic.failed = true; moonPic.busy = false; return; }
      setTimeout(function () {
        var t = current.t, fr = EclipseList.moonFrame(place, t), k = current.ev.id + '|' + place.lat + ',' + place.lon;
        MoonImage.render(fr, moonPx()).toBlob(function (blob) {
          moonPic.busy = false;
          if (!blob) return;
          if (moonPic.url) URL.revokeObjectURL(moonPic.url);
          moonPic.url = URL.createObjectURL(blob);
          moonPic.U = fr.U; moonPic.t = t; moonPic.key = k;
          $('moon-img').setAttribute('href', moonPic.url);
          if (current.ev && current.ev.body === 'moon') updateMoonImage(current.t, false);
        }, 'image/jpeg', 0.92);
      }, 0);
    });
  }

  /* Bucle de reproducción: avanza el tiempo, dibuja, suena y marca los momentos */
  function rate() { return speed === 'real' ? 1 : (current.w1 - current.w0) / (+speed * 1000); }
  function crossMarks(from, to, st) {
    if (to <= from) return;
    moments(current.ev).forEach(function (m) {
      if (m.t > from && m.t <= to) {
        Sound.mark(m.k); buzz(MARK_VIB[m.k]);
        speak(m.k === 'max' ? t('say_max', { p: pct(current.ev.cover) }) : t(m.label));
      }
    });
    var ten = Math.floor(st.cover * 10 + 1e-6);
    if ($('opt-ticks').checked && current.lastTen >= 0 && ten !== current.lastTen && st.phase.indexOf('partial') === 0) Sound.mark('tick');
    current.lastTen = ten;
  }
  function loop() {
    if (!current.playing) return;
    var nowReal = performance.now(), dt = (nowReal - current.last) / 1000; current.last = nowReal;
    var prev = current.t;
    current.t = current.live && speed === 'real' ? Date.now() : current.t + dt * 1000 * rate();
    if (current.t >= current.w1) { current.t = current.w1; }
    var st = drawAt(current.t);
    crossMarks(prev, current.t, st);
    Sound.update(1 - st.cover, st.phase, current.ev.body);
    if (current.t >= current.w1) { stopPlay(); return; }
    current.frame = setTimeout(loop, 100);
  }
  function startPlay() {
    if (!current.ev) return;
    if (current.t >= current.w1) current.t = current.w0;
    if (!Sound.start()) return;
    current.playing = true; current.last = performance.now(); current.lastTen = -1;
    updatePlayButton(); loop();
  }
  function stopPlay(silent) {
    current.playing = false; clearTimeout(current.frame);
    Sound.stop();
    if ('speechSynthesis' in window && silent) { try { window.speechSynthesis.cancel(); } catch (e) { /* ok */ } }
    updatePlayButton();
  }
  function updatePlayButton() {
    var b = $('play'); b.setAttribute('aria-pressed', current.playing ? 'true' : 'false');
    b.classList.toggle('is-playing', current.playing);
    $('play-txt').textContent = t(current.playing ? 'pause' : 'play');
  }
  function setSpeed(v) {
    speed = v; qsa('#speed input').forEach(function (r) { r.checked = r.value === v; });
  }
  function initListen() {
    $('play').addEventListener('click', function () { if (current.playing) stopPlay(true); else startPlay(); });
    $('restart').addEventListener('click', function () { current.t = current.w0; current.lastTen = -1; drawAt(current.t); });
    $('scrub').addEventListener('input', function () {
      current.t = current.w0 + (+this.value / 1000) * (current.w1 - current.w0);
      current.live = false; $('live-badge').hidden = true;
      var st = drawAt(current.t); current.lastTen = Math.floor(st.cover * 10);
      if (current.playing) Sound.update(1 - st.cover, st.phase, current.ev.body);
    });
    qsa('#speed input').forEach(function (r) {
      r.checked = r.value === speed;
      r.addEventListener('change', function () { speed = r.value; if (speed !== 'real') { store.set('speed', speed); } });
    });
    var instr = $('instr'); instr.value = store.get('instr', 'piano'); Sound.setInstrument(instr.value);
    instr.addEventListener('change', function () { Sound.setInstrument(instr.value); store.set('instr', instr.value); if (!current.playing) Sound.preview(); });
    ['voice', 'ticks', 'vibrate'].forEach(function (k) {
      var el = $('opt-' + k), v = store.get('opt.' + k, null);
      if (v !== null) el.checked = v;
      el.addEventListener('change', function () { store.set('opt.' + k, el.checked); });
    });
    $('prev-ev').addEventListener('click', function () { step(-1); });
    $('next-ev').addEventListener('click', function () { step(1); });
  }
  function step(d) {
    var list = filtered(), i = list.indexOf(current.ev);
    if (list[i + d]) go('#/escuchar/' + list[i + d].id);
  }

  /* ---------------- Imagen del Sol: la del día (SDO) o la guardada ---------------- */
  var SDO_URL = 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIIC.jpg';
  var sunImg = { live: false, date: Date.UTC(2026, 10, 16, 16, 10), p: 0 };
  function placeSunImage(dateMs) {
    // Radio del disco solar en las imágenes de 1024 px de SDO: 0,941 de la mitad del ancho a 0,9858 UA (febrero)
    var ratio = 0.941 * 0.9858 / EclipseList.sunDist(dateMs);
    var size = (2 * 100 / ratio).toFixed(1), img = $('sun-img');
    ['width', 'height'].forEach(function (a) { img.setAttribute(a, size); });
    ['x', 'y'].forEach(function (a) { img.setAttribute(a, (-size / 2).toFixed(1)); });
    sunImg.p = EclipseList.sunP(dateMs);
  }
  function loadLiveSun() {
    if (navigator.onLine === false) return;
    var url = SDO_URL + '?d=' + new Date().toISOString().slice(0, 10), probe = new Image();
    probe.onload = function () {
      var img = $('sun-img');
      img.setAttribute('href', url);
      sunImg.live = true; sunImg.date = Date.now(); placeSunImage(sunImg.date);
      if (route.name === 'listen' && current.ev) renderListenStatic();
    };
    probe.src = url;
  }

  /* ---------------- Rutas ---------------- */
  var route = { name: '' };
  var VIEWS = { '': 'place', 'eclipses': 'events', 'escuchar': 'listen', 'eclipse': 'info', 'seguridad': 'safety', 'acerca': 'about' };
  function go(hash) { if (location.hash === hash) onRoute(); else location.hash = hash; }
  function onRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var name = VIEWS[parts[0]] || 'place';
    if ((name === 'events' || name === 'listen') && !place) name = 'place';
    if (route.name === 'listen' && name !== 'listen') stopPlay(true);
    var changed = route.name !== name;
    route = { name: name, arg: parts[1] || '' };
    qsa('.view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== name; });
    if (name === 'place') renderPlaceHelpers();
    if (name === 'events') renderEvents();
    if (name === 'listen') ensureEvents(function () { openEvent(route.arg); });
    if (name === 'info' && route.arg) {
      qsa('.kinds li').forEach(function (li) { li.classList.toggle('is-current', li.id === 'k-' + route.arg); });
    }
    window.scrollTo(0, 0);
    // El foco va al título de la pantalla nueva (lectores de pantalla y teclado)
    var h = document.querySelector('.view:not([hidden]) h1');
    if (h && (changed || name === 'listen')) setTimeout(function () { h.focus({ preventScroll: true }); }, 30);
    if (name === 'info' && route.arg) {
      var cur = document.getElementById('k-' + route.arg);
      if (cur) setTimeout(function () { cur.scrollIntoView({ block: 'center' }); }, 60);
    }
  }

  /* ---------------- Instalación y actualización ---------------- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; $('install-btn').hidden = false; });
  function initInstall() {
    $('install-btn').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; $('install-btn').hidden = true; });
    });
  }
  function initSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      function waiting(w) {
        $('update-bar').hidden = false;
        $('update-btn').onclick = function () { w.postMessage({ type: 'SKIP_WAITING' }); };
      }
      if (reg.waiting && navigator.serviceWorker.controller) waiting(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        nw && nw.addEventListener('statechange', function () { if (nw.state === 'installed' && navigator.serviceWorker.controller) waiting(nw); });
      });
    }).catch(function () { /* sin service worker */ });
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!reloaded) { reloaded = true; location.reload(); } });
  }

  /* ---------------- Inicio ---------------- */
  function init() {
    fillLangSelect();
    lang = detectLang();
    placeSunImage(sunImg.date);
    initSearch(); initByCountry(); initGps(); initFilter(); initListen(); initInstall();
    setLang(lang, false);
    window.addEventListener('hashchange', onRoute);
    if (!location.hash && place) location.replace('#/eclipses');
    onRoute();
    loadLiveSun();
    initSW();
  }
  init();
})();
