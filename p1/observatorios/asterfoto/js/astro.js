/* =========================================================================
   Planificador de asteroides — motor de cálculo astronómico
   -------------------------------------------------------------------------
   Todo se calcula en el navegador, sin conexión:
   - Asteroides: problema de dos cuerpos con los elementos orbitales de la
     JPL Small-Body Database (eclíptica y equinoccio J2000).
   - Tierra: elementos keplerianos aproximados del baricentro Tierra-Luna
     (E. M. Standish, JPL, válidos 1800–2050).
   - Precesión J2000 → fecha: IAU 1976 (J. Meeus, Astronomical Algorithms, cap. 21).
   - Luna: fórmulas de baja precisión del Astronomical Almanac (≈ 0,3°).
   - Magnitud aparente: sistema H-G (Bowell et al., 1989).
   Precisión esperada: unos minutos de arco en la posición de un asteroide del
   cinturón principal y ±1 magnitud en el brillo; menos precisa para objetos
   cercanos a la Tierra en una aproximación muy cercana.
   ========================================================================= */
(function () {
  'use strict';
  var D = Math.PI / 180, R = 180 / Math.PI;
  var K = 0.01720209895;                    // constante de Gauss (rad/día)
  var EPS0 = 23.4392911 * D;                // oblicuidad J2000
  var CE = Math.cos(EPS0), SE = Math.sin(EPS0);
  var LIGHT_DAY_PER_AU = 0.0057755183;      // días que tarda la luz en recorrer 1 UA
  var EARTH_R_AU = 6378.137 / 149597870.7;
  var DT_DAYS = 69.2 / 86400;               // ΔT aproximado (TT − UT)

  function norm360(x) { x %= 360; return x < 0 ? x + 360 : x; }
  function jdFromDate(d) { return d.getTime() / 86400000 + 2440587.5; }
  function dateFromJd(jd) { return new Date((jd - 2440587.5) * 86400000); }

  /* ---------- Kepler ---------- */
  function solveKepler(M, e) {
    M = M % (2 * Math.PI);
    var E = e < 0.8 ? M + e * Math.sin(M) : Math.PI;
    for (var k = 0; k < 30; k++) {
      var f = E - e * Math.sin(E) - M, dE = f / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-12) break;
    }
    return E;
  }

  /* Prepara un cuerpo: vectores P y Q del plano orbital (eclíptica J2000) */
  function prepare(o) {
    var w = o.w * D, om = o.om * D, i = o.i * D;
    var cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(om), so = Math.sin(om), ci = Math.cos(i), si = Math.sin(i);
    o.P = [cw * co - sw * so * ci, cw * so + sw * co * ci, sw * si];
    o.Q = [-sw * co - cw * so * ci, -sw * so + cw * co * ci, cw * si];
    o.n = K / Math.pow(o.a, 1.5);
    o.b = o.a * Math.sqrt(1 - o.e * o.e);
    o.M0 = o.ma * D;
    return o;
  }

  /* Posición heliocéntrica eclíptica J2000 (UA) en el instante jd (TT) */
  function helio(o, jd) {
    var M = o.M0 + o.n * (jd - o.epoch);
    var E = solveKepler(M, o.e);
    var x = o.a * (Math.cos(E) - o.e), y = o.b * Math.sin(E);
    return [o.P[0] * x + o.Q[0] * y, o.P[1] * x + o.Q[1] * y, o.P[2] * x + o.Q[2] * y];
  }

  /* ---------- Tierra (baricentro Tierra-Luna) ---------- */
  function earth(jd) {
    var T = (jd - 2451545.0) / 36525;
    var a = 1.00000261 + 0.00000562 * T;
    var e = 0.01671123 - 0.00004392 * T;
    var i = (-0.00001531 - 0.01294668 * T) * D;
    var L = 100.46457166 + 35999.37244981 * T;
    var wbar = 102.93768193 + 0.32327364 * T;
    var M = norm360(L - wbar) * D, w = wbar * D;   // Ω = 0
    var E = solveKepler(M, e);
    var x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E);
    var cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
    return [cw * x - sw * y, (sw * x + cw * y) * ci, (sw * x + cw * y) * si];
  }

  function eclToEq(v) { return [v[0], v[1] * CE - v[2] * SE, v[1] * SE + v[2] * CE]; }

  function sph(v) {
    var r = Math.hypot(v[0], v[1], v[2]);
    return { ra: norm360(Math.atan2(v[1], v[0]) * R), dec: Math.asin(v[2] / r) * R, dist: r };
  }

  /* ---------- Tiempo sidéreo, precesión, coordenadas horizontales ---------- */
  function gmst(jdUt) {
    var T = (jdUt - 2451545.0) / 36525;
    return norm360(280.46061837 + 360.98564736629 * (jdUt - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
  }

  function precess(ra, dec, jd) {
    var T = (jd - 2451545.0) / 36525;
    var z1 = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) / 3600 * D;
    var z2 = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) / 3600 * D;
    var th = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) / 3600 * D;
    var a = ra * D, d = dec * D;
    var A = Math.cos(d) * Math.sin(a + z1);
    var B = Math.cos(th) * Math.cos(d) * Math.cos(a + z1) - Math.sin(th) * Math.sin(d);
    var C = Math.sin(th) * Math.cos(d) * Math.cos(a + z1) + Math.cos(th) * Math.sin(d);
    return { ra: norm360((Math.atan2(A, B) + z2) * R), dec: Math.asin(C) * R };
  }

  function refraction(h) {          // h: altura verdadera (grados) → corrección (grados)
    if (h < -1.5) return 0;
    return 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * D) / 60;
  }

  /* RA/Dec del equinoccio de la fecha → altura y azimut (desde el Norte hacia el Este) */
  function horizontal(raDate, decDate, jdUt, lat, lon, refr) {
    var H = (gmst(jdUt) + lon - raDate) * D, d = decDate * D, f = lat * D;
    var sh = Math.sin(f) * Math.sin(d) + Math.cos(f) * Math.cos(d) * Math.cos(H);
    var h = Math.asin(Math.max(-1, Math.min(1, sh))) * R;
    var az = norm360(Math.atan2(-Math.sin(H) * Math.cos(d), Math.sin(d) * Math.cos(f) - Math.cos(d) * Math.sin(f) * Math.cos(H)) * R);
    if (refr !== false) h += refraction(h);
    return { alt: h, az: az };
  }

  /* Altura y azimut → RA/Dec de la fecha (para dibujar el campo de la cámara) */
  function equatorialFromHorizontal(alt, az, jdUt, lat, lon) {
    var h = alt * D, A = az * D, f = lat * D;
    var sd = Math.sin(f) * Math.sin(h) + Math.cos(f) * Math.cos(h) * Math.cos(A);
    var d = Math.asin(sd);
    var H = Math.atan2(-Math.sin(A) * Math.cos(h), Math.sin(h) * Math.cos(f) - Math.cos(h) * Math.sin(f) * Math.cos(A));
    return { ra: norm360(gmst(jdUt) + lon - H * R), dec: d * R };
  }

  /* Vector geocéntrico del observador (ecuatorial, UA) */
  function observer(jdUt, lat, lon) {
    var t = (gmst(jdUt) + lon) * D, f = lat * D;
    return [EARTH_R_AU * Math.cos(f) * Math.cos(t), EARTH_R_AU * Math.cos(f) * Math.sin(t), EARTH_R_AU * 0.99664719 * Math.sin(f)];
  }

  /* ---------- Magnitud H-G ---------- */
  function magHG(H, G, r, delta, alpha) {
    var t = Math.tan(alpha / 2);
    var p1 = Math.exp(-3.33 * Math.pow(t, 0.63)), p2 = Math.exp(-1.87 * Math.pow(t, 1.22));
    var s = (1 - G) * p1 + G * p2;
    return H + 5 * Math.log10(r * delta) - 2.5 * Math.log10(Math.max(s, 1e-9));
  }

  /* ---------- Asteroide visto desde un lugar ----------
     Devuelve RA/Dec J2000 topocéntricas (con tiempo de luz), RA/Dec de la fecha,
     distancias, ángulo de fase, elongación y magnitud. */
  function observe(o, jdUt, site, E) {
    var jd = jdUt + DT_DAYS;
    E = E || earth(jd);
    var p = helio(o, jd), g = [p[0] - E[0], p[1] - E[1], p[2] - E[2]];
    var delta = Math.hypot(g[0], g[1], g[2]);
    p = helio(o, jd - delta * LIGHT_DAY_PER_AU);       // corrección por tiempo de luz
    g = [p[0] - E[0], p[1] - E[1], p[2] - E[2]];
    var q = eclToEq(g);
    if (site) {
      var ob = observer(jdUt, site.lat, site.lon);
      q = [q[0] - ob[0], q[1] - ob[1], q[2] - ob[2]];
    }
    var s = sph(q), r = Math.hypot(p[0], p[1], p[2]), Rs = Math.hypot(E[0], E[1], E[2]);
    delta = s.dist;
    var cosA = (r * r + delta * delta - Rs * Rs) / (2 * r * delta);
    var alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));
    var cosE = (Rs * Rs + delta * delta - r * r) / (2 * Rs * delta);
    var res = { ra: s.ra, dec: s.dec, r: r, delta: delta, phase: alpha * R, elong: Math.acos(Math.max(-1, Math.min(1, cosE))) * R };
    res.V = magHG(o.H, o.G == null ? 0.15 : o.G, r, delta, alpha);
    if (site) {
      var pd = precess(s.ra, s.dec, jd);
      res.raDate = pd.ra; res.decDate = pd.dec;
      var hz = horizontal(pd.ra, pd.dec, jdUt, site.lat, site.lon);
      res.alt = hz.alt; res.az = hz.az;
    }
    return res;
  }

  /* Movimiento aparente respecto de las estrellas: ″/min y ángulo de posición (desde el Norte hacia el Este) */
  function motion(o, jdUt, site) {
    var dt = 30 / 1440;
    var a = observe(o, jdUt - dt / 2, site), b = observe(o, jdUt + dt / 2, site);
    var dra = ((b.ra - a.ra + 540) % 360) - 180;
    var x = dra * Math.cos(((a.dec + b.dec) / 2) * D), y = b.dec - a.dec;
    var rate = Math.hypot(x, y) * 3600 / 30;          // segundos de arco por minuto
    var pa = norm360(Math.atan2(x, y) * R);
    return { rate: rate, pa: pa };
  }

  /* ---------- Sol ---------- */
  function sun(jdUt, site) {
    var jd = jdUt + DT_DAYS, E = earth(jd);
    var s = sph(eclToEq([-E[0], -E[1], -E[2]]));
    var pd = precess(s.ra, s.dec, jd);
    var out = { ra: s.ra, dec: s.dec, raDate: pd.ra, decDate: pd.dec, lonEcl: norm360(Math.atan2(-E[1], -E[0]) * R) };
    if (site) { var h = horizontal(pd.ra, pd.dec, jdUt, site.lat, site.lon, false); out.alt = h.alt; out.az = h.az; }
    return out;
  }

  /* ---------- Luna (baja precisión) ---------- */
  function moon(jdUt, site) {
    var T = (jdUt + DT_DAYS - 2451545.0) / 36525;
    function s(x) { return Math.sin(x * D); }
    function c(x) { return Math.cos(x * D); }
    var lam = 218.32 + 481267.881 * T + 6.29 * s(135.0 + 477198.87 * T) - 1.27 * s(259.3 - 413335.36 * T) +
      0.66 * s(235.7 + 890534.22 * T) + 0.21 * s(269.9 + 954397.74 * T) - 0.19 * s(357.5 + 35999.05 * T) - 0.11 * s(186.5 + 966404.03 * T);
    var bet = 5.13 * s(93.3 + 483202.02 * T) + 0.28 * s(228.2 + 960400.89 * T) - 0.28 * s(318.3 + 6003.15 * T) - 0.17 * s(217.6 - 407332.21 * T);
    var par = 0.9508 + 0.0518 * c(135.0 + 477198.87 * T) + 0.0095 * c(259.3 - 413335.36 * T) + 0.0078 * c(235.7 + 890534.22 * T) + 0.0028 * c(269.9 + 954397.74 * T);
    lam = norm360(lam);
    var dist = EARTH_R_AU / Math.sin(par * D);
    var eps = (23.439291 - 0.0130042 * T) * D;
    var l = lam * D, b = bet * D;
    var v = [dist * Math.cos(b) * Math.cos(l), dist * Math.cos(b) * Math.sin(l), dist * Math.sin(b)];
    v = [v[0], v[1] * Math.cos(eps) - v[2] * Math.sin(eps), v[1] * Math.sin(eps) + v[2] * Math.cos(eps)];   // ecuatorial de la fecha
    if (site) { var ob = observer(jdUt, site.lat, site.lon); v = [v[0] - ob[0], v[1] - ob[1], v[2] - ob[2]]; }
    var sp = sph(v);
    var sn = sun(jdUt, site);
    var lsun = norm360(sn.lonEcl + 1.3969713 * T);             // longitud del Sol de la fecha
    var cosPsi = Math.cos(b) * Math.cos((lam - lsun) * D);
    var illum = (1 - cosPsi) / 2;                               // fracción iluminada (aprox.)
    var waxing = norm360(lam - lsun) < 180;
    var out = { raDate: sp.ra, decDate: sp.dec, illum: illum, waxing: waxing, age: norm360(lam - lsun) };
    if (site) { var h = horizontal(sp.ra, sp.dec, jdUt, site.lat, site.lon); out.alt = h.alt; out.az = h.az; }
    return out;
  }

  /* Separación angular (grados) */
  function separation(ra1, de1, ra2, de2) {
    var a = Math.sin(de1 * D) * Math.sin(de2 * D) + Math.cos(de1 * D) * Math.cos(de2 * D) * Math.cos((ra1 - ra2) * D);
    return Math.acos(Math.max(-1, Math.min(1, a))) * R;
  }

  /* ---------- La noche: puesta, crepúsculos y salida del Sol ----------
     dateStr "AAAA-MM-DD": noche que empieza esa tarde. */
  function night(dateStr, site) {
    var p = dateStr.split('-').map(Number);
    var jd0 = jdFromDate(new Date(Date.UTC(p[0], p[1] - 1, p[2])));
    var start = jd0 + 0.5 - site.lon / 360, step = 5 / 1440, n = 288;
    var prev = sun(start, site).alt, events = {}, minAlt = prev, minJd = start;
    var marks = [['sunset', -0.833], ['civil', -6], ['nautical', -12], ['astro', -18]];
    for (var k = 1; k <= n; k++) {
      var jd = start + k * step, h = sun(jd, site).alt;
      if (h < minAlt) { minAlt = h; minJd = jd; }
      marks.forEach(function (m) {
        var lvl = m[1], f;
        if (prev >= lvl && h < lvl && !events[m[0] + 'Down']) { f = (prev - lvl) / (prev - h); events[m[0] + 'Down'] = jd - step + f * step; }
        if (prev < lvl && h >= lvl && !events[m[0] + 'Up']) { f = (lvl - prev) / (h - prev); events[m[0] + 'Up'] = jd - step + f * step; }
      });
      prev = h;
    }
    var kind, a, b;
    if (events.astroDown && events.astroUp) { kind = 'astro'; a = events.astroDown; b = events.astroUp; }
    else if (events.nauticalDown && events.nauticalUp) { kind = 'nautical'; a = events.nauticalDown; b = events.nauticalUp; }
    else if (events.sunsetDown && events.sunsetUp) { kind = 'night'; a = events.sunsetDown; b = events.sunsetUp; }
    else { kind = 'none'; a = minJd - 1 / 24; b = minJd + 1 / 24; }
    return { kind: kind, start: a, end: b, mid: (a + b) / 2, events: events, sunMin: minAlt, jdNoon: start };
  }

  window.Astro = {
    D: D, R: R, norm360: norm360, jdFromDate: jdFromDate, dateFromJd: dateFromJd,
    prepare: prepare, helio: helio, earth: earth, observe: observe, motion: motion,
    sun: sun, moon: moon, night: night, separation: separation, precess: precess,
    horizontal: horizontal, equatorialFromHorizontal: equatorialFromHorizontal, gmst: gmst, DT_DAYS: DT_DAYS
  };
})();
