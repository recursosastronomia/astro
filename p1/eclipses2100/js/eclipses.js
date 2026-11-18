/* Sombras sonoras — cálculo de eclipses
   Usa la biblioteca Astronomy Engine (Don Cross, licencia MIT; js/astronomy.browser.min.js).
   Todo se calcula en el dispositivo, sin conexión.

   EclipseList.forPlace({lat, lon}) → lista de eclipses de Sol y de Luna (no penumbrales) visibles
   desde el lugar entre 2020 y 2100. Cada eclipse:
     { id, body: 'sun'|'moon', kind: 'total'|'annular'|'partial', peak, start, end, c2, c3 (ms o null),
       cover (0–1, cobertura en el máximo), vis: 'full'|'rise'|'set'|'part' }
   EclipseList.view(ev, place, ms) → estado en un instante: { cover, alt, phase, disc } para el sonido
   y el dibujo (disc: posición de la Luna respecto del Sol, o de la sombra respecto de la Luna). */
var EclipseList = (function () {
  'use strict';
  var A = Astronomy;
  var RAD = Math.PI / 180, DEG = 180 / Math.PI;
  var FROM = Date.UTC(2020, 0, 1), TO = Date.UTC(2101, 0, 1);
  var KM_AU = A.KM_PER_AU;
  var R_SUN = 695700, R_MOON = 1737.4, R_EARTH = 6378.14;

  /* Área común de dos círculos de radios r1, r2 con centros a distancia s (misma unidad). */
  function lens(r1, r2, s) {
    if (s >= r1 + r2) return 0;
    if (s <= Math.abs(r1 - r2)) return Math.PI * Math.pow(Math.min(r1, r2), 2);
    var a1 = Math.acos((s * s + r1 * r1 - r2 * r2) / (2 * s * r1));
    var a2 = Math.acos((s * s + r2 * r2 - r1 * r1) / (2 * s * r2));
    return r1 * r1 * (a1 - Math.sin(2 * a1) / 2) + r2 * r2 * (a2 - Math.sin(2 * a2) / 2);
  }
  /* Separación angular y ángulo de posición (de b respecto de a, desde el norte hacia el este), en grados. */
  function sepPA(ra1, de1, ra2, de2) {
    var d1 = de1 * RAD, d2 = de2 * RAD, dr = (ra2 - ra1) * 15 * RAD;
    var c = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(dr);
    var sep = Math.acos(Math.max(-1, Math.min(1, c))) * DEG;
    var pa = Math.atan2(Math.sin(dr), Math.cos(d1) * Math.tan(d2) - Math.sin(d1) * Math.cos(dr)) * DEG;
    return { sep: sep, pa: pa };
  }
  /* Ángulo paraláctico de un astro: giro entre el norte celeste y la vertical del lugar. */
  function parallactic(time, obs, ra, dec) {
    var lst = A.SiderealTime(time) + obs.longitude / 15;
    var ha = (lst - ra) * 15 * RAD, phi = obs.latitude * RAD, d = dec * RAD;
    return Math.atan2(Math.sin(ha), Math.tan(phi) * Math.cos(d) - Math.sin(d) * Math.cos(ha)) * DEG;
  }
  function altitude(body, time, obs) {
    var eq = A.Equator(body, time, obs, true, true);
    return A.Horizon(time, obs, eq.ra, eq.dec, 'normal').altitude;
  }

  /* ---------- Sol: estado en un instante para un observador ---------- */
  function solarState(time, obs) {
    var s = A.Equator(A.Body.Sun, time, obs, true, true);
    var m = A.Equator(A.Body.Moon, time, obs, true, true);
    var rs = Math.asin(R_SUN / (s.dist * KM_AU)) * DEG;
    var rm = Math.asin(R_MOON / (m.dist * KM_AU)) * DEG;
    var g = sepPA(s.ra, s.dec, m.ra, m.dec);
    var cover = lens(rs, rm, g.sep) / (Math.PI * rs * rs);
    var alt = A.Horizon(time, obs, s.ra, s.dec, 'normal').altitude;
    return { cover: Math.min(1, cover), alt: alt, sep: g.sep / rs, ratio: rm / rs, pa: g.pa, q: parallactic(time, obs, s.ra, s.dec) };
  }

  /* ---------- Luna: sombra de la Tierra (método de Danjon, como en el Astronomical Almanac) ---------- */
  function lunarState(time, obs) {
    var mv = A.GeoVector(A.Body.Moon, time, true), sv = A.GeoVector(A.Body.Sun, time, true);
    var me = A.EquatorFromVector(mv), se = A.EquatorFromVector(sv);
    var distM = mv.Length() * KM_AU, distS = sv.Length() * KM_AU;
    var piM = Math.asin(R_EARTH / distM) * DEG, piS = Math.asin(R_EARTH / distS) * DEG;
    var ss = Math.asin(R_SUN / distS) * DEG;
    var ru = 1.02 * (0.99834 * piM - ss + piS);           // radio de la umbra
    var rp = 1.02 * (0.99834 * piM + ss + piS);           // radio de la penumbra
    var rm = Math.asin(R_MOON / distM) * DEG;
    var shRa = (se.ra + 12) % 24, shDec = -se.dec;        // centro de la sombra: punto opuesto al Sol
    var g = sepPA(me.ra, me.dec, shRa, shDec);
    var cover = lens(rm, ru, g.sep) / (Math.PI * rm * rm);
    var mq = A.Equator(A.Body.Moon, time, obs, true, true);
    var alt = A.Horizon(time, obs, mq.ra, mq.dec, 'normal').altitude;
    return { cover: Math.min(1, cover), alt: alt, sep: g.sep / rm, ru: ru / rm, rp: rp / rm, pa: g.pa, q: parallactic(time, obs, mq.ra, mq.dec) };
  }

  /* Muestra la altura del astro entre el inicio y el final para saber si se ve y cómo. */
  function visibility(body, start, end, obs) {
    var n = 24, up = [], any = false;
    for (var i = 0; i <= n; i++) {
      var tm = A.MakeTime(new Date(start + (end - start) * i / n));
      var a = altitude(body, tm, obs) > -0.6;     // con refracción, el borde superior asoma en ≈ −0,6°
      up.push(a); if (a) any = true;
    }
    if (!any) return null;
    var first = up[0], last = up[n];
    if (first && last) return up.every(Boolean) ? 'full' : 'part';
    if (!first && last) return 'rise';
    if (first && !last) return 'set';
    return 'part';
  }

  var ms = function (t) { return t.date.getTime(); };

  function solarList(obs) {
    var out = [], t = A.MakeTime(new Date(FROM));
    for (;;) {
      var e = A.SearchLocalSolarEclipse(t, obs);
      var peak = ms(e.peak.time);
      if (peak >= TO) break;
      t = e.peak.time.AddDays(10);
      var start = ms(e.partial_begin.time), end = ms(e.partial_end.time);
      var vis = visibility(A.Body.Sun, start, end, obs);
      if (!vis) continue;
      out.push({
        id: 's' + new Date(peak).toISOString().slice(0, 10), body: 'sun', kind: e.kind,
        start: start, end: end, peak: peak,
        c2: e.total_begin ? ms(e.total_begin.time) : null, c3: e.total_end ? ms(e.total_end.time) : null,
        cover: e.obscuration, vis: vis
      });
    }
    return out;
  }

  var lunarGlobal = null;   // la lista mundial de eclipses de Luna es igual para todos los lugares
  function lunarAll() {
    if (lunarGlobal) return lunarGlobal;
    lunarGlobal = [];
    var t = A.MakeTime(new Date(FROM));
    for (;;) {
      var e = A.SearchLunarEclipse(t);
      var peak = ms(e.peak);
      if (peak >= TO) break;
      t = e.peak.AddDays(10);
      if (e.kind === 'penumbral') continue;           // no se incluyen los penumbrales
      lunarGlobal.push({
        kind: e.kind, peak: peak, start: peak - e.sd_partial * 60000, end: peak + e.sd_partial * 60000,
        c2: e.kind === 'total' ? peak - e.sd_total * 60000 : null, c3: e.kind === 'total' ? peak + e.sd_total * 60000 : null,
        cover: e.obscuration
      });
    }
    return lunarGlobal;
  }
  function lunarList(obs) {
    return lunarAll().map(function (e) {
      var vis = visibility(A.Body.Moon, e.start, e.end, obs);
      if (!vis) return null;
      return { id: 'm' + new Date(e.peak).toISOString().slice(0, 10), body: 'moon', kind: e.kind,
        start: e.start, end: e.end, peak: e.peak, c2: e.c2, c3: e.c3, cover: e.cover, vis: vis };
    }).filter(Boolean);
  }

  var cache = {};
  function forPlace(place) {
    var key = place.lat.toFixed(2) + ',' + place.lon.toFixed(2);
    if (cache[key]) return cache[key];
    var obs = new A.Observer(place.lat, place.lon, 0);
    var list = solarList(obs).concat(lunarList(obs)).sort(function (a, b) { return a.peak - b.peak; });
    cache[key] = list;
    return list;
  }

  /* Fase en un instante: claves de texto del archivo de idiomas. */
  function phaseOf(ev, t) {
    if (t < ev.start) return 'before';
    if (t > ev.end) return 'after';
    if (ev.c2 && t >= ev.c2 && t <= ev.c3) return ev.body === 'moon' ? 'total_moon' : (ev.kind === 'annular' ? 'annular' : 'total_sun');
    return t < ev.peak ? 'partial_in' : 'partial_out';
  }

  function view(ev, place, t) {
    var obs = new A.Observer(place.lat, place.lon, 0);
    var time = A.MakeTime(new Date(t));
    var st = ev.body === 'sun' ? solarState(time, obs) : lunarState(time, obs);
    var phase = phaseOf(ev, t);
    // Fuera del eclipse no hay cobertura (evita restos numéricos)
    if (phase === 'before' || phase === 'after') st.cover = 0;
    // Dentro de la fase central, la cobertura que se muestra es la del eclipse (total = 100 %)
    if (phase === 'total_sun' || phase === 'total_moon') st.cover = 1;
    st.phase = phase;
    return st;
  }

  /* Ángulo de posición del eje de rotación solar (P), para girar la imagen de SDO (Meeus, cap. 29). */
  function sunP(t) {
    var jd = t / 86400000 + 2440587.5;
    var T = (jd - 2451545) / 36525;
    var L0 = 280.46646 + 36000.76983 * T, M = (357.52911 + 35999.05029 * T) * RAD;
    var C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M);
    var omega = (125.04 - 1934.136 * T) * RAD;
    var lam = (L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
    var eps = (23.439291 - 0.0130042 * T + 0.00256 * Math.cos(omega)) * RAD;
    var K = (73.6667 + 1.3958333 * (jd - 2396758) / 36525) * RAD;
    var x = Math.atan(-Math.cos(lam) * Math.tan(eps));
    var y = Math.atan(-Math.cos(lam - K) * Math.tan(7.25 * RAD));
    return (x + y) * DEG;
  }
  /* Distancia Tierra–Sol en UA (para escalar la imagen de SDO del día). */
  function sunDist(t) { return A.Equator(A.Body.Sun, A.MakeTime(new Date(t)), new A.Observer(0, 0, 0), true, false).dist; }

  /* Orientación de la Luna tal como la ve a simple vista un observador del lugar (para la imagen realista).
     Todo en vectores J2000: d = dirección observador→Luna; U = «arriba» en el cielo (hacia el cenit);
     R = «derecha» del observador que mira la Luna; xb, yb, zb = ejes del cuerpo lunar (zb = polo norte,
     xb = meridiano 0, el centro medio de la cara visible), según el modelo IAU de rotación de la Luna.
     Así la libración, la inclinación del eje y el giro del campo visual (latitud, hemisferio, hora) salen solos. */
  function moonFrame(place, t) {
    var obs = new A.Observer(place.lat, place.lon, 0), time = A.MakeTime(new Date(t));
    var eq = A.Equator(A.Body.Moon, time, obs, false, true);
    var d = unit([eq.vec.x, eq.vec.y, eq.vec.z]);
    var z = A.RotateVector(A.Rotation_HOR_EQJ(time, obs), new A.Vector(0, 0, 1, time));
    var zen = [z.x, z.y, z.z];
    var U = sub(zen, mul(d, dot(zen, d)));
    if (len(U) < 1e-4) U = sub([0, 0, 1], mul(d, d[2]));     // Luna en el cenit: se toma el norte celeste
    U = unit(U);
    var R = cross(d, U);
    var ax = A.RotationAxis(A.Body.Moon, time);
    var zb = unit([ax.north.x, ax.north.y, ax.north.z]);
    var node = unit([-zb[1], zb[0], 0]), w = ax.spin * RAD;
    var xb = add(mul(node, Math.cos(w)), mul(cross(zb, node), Math.sin(w)));
    var yb = cross(zb, xb);
    return { d: d, U: U, R: R, xb: xb, yb: yb, zb: zb };
  }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function unit(a) { var l = len(a); return [a[0] / l, a[1] / l, a[2] / l]; }

  return { forPlace: forPlace, view: view, phaseOf: phaseOf, moonFrame: moonFrame, dot: dot, sunP: sunP, sunDist: sunDist, range: [FROM, TO] };
})();
if (typeof module !== 'undefined') module.exports = EclipseList;
