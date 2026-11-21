/* =========================================================================
   Comparador de parpadeo (blink comparator)
   - Lee de 2 a 8 fotos (JPG/PNG/WebP) y su hora (EXIF DateTimeOriginal).
   - Detecta estrellas, encuentra el giro y el corrimiento de cada foto
     respecto de la primera (transformación rígida por votación de pares
     de estrellas y ajuste por mínimos cuadrados) y las alinea.
   - Muestra la secuencia (máx. 3 fotos por segundo), en negativo o
     resaltando los cambios (cada foto menos la mediana de todas).
   - Permite marcar el objeto en cada foto y mide su desplazamiento.
   Todo ocurre en el navegador: las fotos no se envían a ningún lado.
   ========================================================================= */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var P = function () { return window.Pagina; };
  var t = function (k, v) { return P().t(k, v); };
  var nf = function (x, d) { return P().nf(x, d); };
  var MAXW = 1600, MAXN = 8;

  var S = { items: [], frames: [], W: 0, H: 0, scale: 1, cur: 0, timer: null, mode: 'normal', stretch: 5,
    z: 1, cx: 0.5, cy: 0.5, marking: false, cross: null, loupe: 1, lp: null, normalize: true, marks: [], cache: {}, median: null, logs: [] };

  /* ---------- EXIF: hora de la toma ---------- */
  function exifDate(buf) {
    try {
      var v = new DataView(buf);
      if (v.getUint16(0) !== 0xFFD8) return null;
      var o = 2;
      while (o + 4 < v.byteLength) {
        var mk = v.getUint16(o), len = v.getUint16(o + 2);
        if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) {           // "Exif"
          var T = o + 10, le = v.getUint16(T) === 0x4949;
          var u16 = function (p) { return v.getUint16(p, le); }, u32 = function (p) { return v.getUint32(p, le); };
          var readTag = function (ifd, tag) {
            var n = u16(T + ifd);
            for (var i = 0; i < n; i++) {
              var e = T + ifd + 2 + i * 12;
              if (u16(e) === tag) return { type: u16(e + 2), count: u32(e + 4), val: u32(e + 8), at: e + 8 };
            }
            return null;
          };
          var str = function (tg) { if (!tg) return null; var p = tg.count > 4 ? T + tg.val : tg.at, s = ''; for (var i = 0; i < tg.count - 1; i++) s += String.fromCharCode(v.getUint8(p + i)); return s; };
          var ifd0 = u32(T + 4), ex = readTag(ifd0, 0x8769), s = null;
          if (ex) s = str(readTag(ex.val, 0x9003));
          if (!s) s = str(readTag(ifd0, 0x0132));
          if (!s) return null;
          var m = s.match(/(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
          return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
        }
        if ((mk & 0xFF00) !== 0xFF00) break;
        o += 2 + len;
      }
    } catch (e) { /* sin EXIF */ }
    return null;
  }
  function hms(d) { return d ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0') : t('c.unknownTime'); }

  /* ---------- Carga ---------- */
  function setStatus(s, err) { var e = $('c-status'); e.textContent = s; e.classList.toggle('ue-err', !!err); }
  function reset() {
    stop(); S.items = []; S.frames = []; S.cache = {}; S.median = null; S.marks = []; S.logs = [];
    $('thumbs').innerHTML = ''; $('align-log').innerHTML = ''; $('viewer').hidden = true;
  }
  function loadFiles(list) {
    reset();
    var files = Array.prototype.slice.call(list).filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name); });
    if (files.length < 2) { setStatus(t('c.needTwo'), true); updateAlignBtn(); return; }
    var extra = files.length > MAXN ? ' ' + t('c.tooMany') : '';
    files = files.slice(0, MAXN);
    setStatus(t('c.reading'));
    Promise.all(files.map(function (f) {
      return Promise.all([
        f.slice(0, 262144).arrayBuffer().then(exifDate).catch(function () { return null; }),
        createImageBitmap(f, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(f); })
      ]).then(function (r) { return { name: f.name, time: r[0], src: r[1], w: r[1].width, h: r[1].height }; });
    })).then(function (items) {
      if (items.every(function (it) { return it.time; })) items.sort(function (a, b) { return a.time - b.time; });
      else items.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
      S.items = items; renderThumbs();
      setStatus(t('c.loaded', { n: items.length }) + extra);
      updateAlignBtn();
    }).catch(function () { setStatus(t('c.needTwo'), true); });
  }
  function renderThumbs() {
    var ol = $('thumbs'); ol.innerHTML = '';
    S.items.forEach(function (it, i) {
      var li = document.createElement('li'), c = document.createElement('canvas'), k = 120 / Math.max(it.w, it.h);
      c.width = Math.round(it.w * k); c.height = Math.round(it.h * k); c.setAttribute('aria-hidden', 'true');
      c.getContext('2d').drawImage(it.src, 0, 0, c.width, c.height);
      var p = document.createElement('p'); p.innerHTML = '<strong>' + t('c.frame', { i: i + 1, n: S.items.length }) + '</strong><br>' + esc(it.name) + '<br>' + hms(it.time);
      li.appendChild(c); li.appendChild(p); ol.appendChild(li);
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function updateAlignBtn() { $('btn-align').disabled = S.items.length < 2; }

  /* ---------- Fotos de ejemplo (simuladas) ---------- */
  /* Fotos de ejemplo: el cielo real alrededor de (217628) Lugh la noche del 22 al 23/11/2026 desde Montevideo,
     como con un teleobjetivo de 300 mm reducido a 1600 px (11,1″ por píxel). Las estrellas salen del catálogo
     Hipparcos; el asteroide se mueve según su órbita (su brillo se aumenta para que se vea en el ejemplo). */
  var DEMO = { pdes: '217628', name: '(217628) Lugh', lat: -34.905, lon: -56.191, scale: 11.1, t0: Date.UTC(2026, 10, 23, 3, 40, 0), dt: 10 };
  function demo() {
    reset(); setStatus(t('c.demoLoading'));
    Promise.all([loadStars(), findAsteroid(DEMO.pdes)]).then(function (r) {
      var o = r[1]; if (!o) throw new Error('no');
      demoSky(o);
    }).catch(function () { demoRandom(); });
  }
  function demoSky(o) {
    var W = 1600, H = 1066, N = 5, rnd = mulberry(20261122), E = window.ESTRELLAS8, A = window.Astro, site = { lat: DEMO.lat, lon: DEMO.lon };
    var jd0 = A.jdFromDate(new Date(DEMO.t0)), c0 = A.observe(o, jd0 + 2 * DEMO.dt / 1440, site);   // centro: el asteroide en la foto 3
    var sc = DEMO.scale, rot0 = 20 * Math.PI / 180, cat = [];
    for (var i = 0; i < E.ra.length; i++) {
      var q = tangent(E.ra[i] / 1000, E.dec[i] / 1000, c0.ra, c0.dec); if (!q || Math.abs(q[0]) > 4 * 3600 || Math.abs(q[1]) > 3 * 3600) continue;
      cat.push([q[0] / sc, q[1] / sc, E.mag[i] / 100]);
    }
    for (var f2 = 0; f2 < 900; f2++) cat.push([(rnd() - 0.5) * 2000, (rnd() - 0.5) * 1500, 8.2 + 3 * Math.pow(rnd(), 0.6)]);   // estrellas débiles al azar
    var items = [], base = new Date(DEMO.t0);
    for (var k = 0; k < N; k++) {
      var jd = jd0 + k * DEMO.dt / 1440, ob = A.observe(o, jd, site), qa = tangent(ob.ra, ob.dec, c0.ra, c0.dec);
      var th = rot0 + (k - 2) * 0.45 * Math.PI / 180, sx = (rnd() - 0.5) * 60, sy = (rnd() - 0.5) * 60;
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d'), im = ctx.createImageData(W, H), d = im.data, f = new Float32Array(W * H);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) f[y * W + x] = 22 + 10 * x / W + gauss(rnd) * 4;
      var put = function (u, v, mag) {
        // cielo → foto: el este a la izquierda y el norte arriba, girado th, más el corrimiento de la cámara
        var X0 = -u, Y0 = -v, X = Math.cos(th) * X0 - Math.sin(th) * Y0 + W / 2 + sx, Y = Math.sin(th) * X0 + Math.cos(th) * Y0 + H / 2 + sy;
        if (X < -8 || Y < -8 || X > W + 8 || Y > H + 8) return;
        var flux = 900 * Math.pow(10, -0.4 * (mag - 6)), s2 = 2 * 1.5 * 1.5, Am = flux / (Math.PI * s2);
        for (var yy = Math.floor(Y) - 6; yy <= Math.floor(Y) + 6; yy++) for (var xx = Math.floor(X) - 6; xx <= Math.floor(X) + 6; xx++) {
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          f[yy * W + xx] += Am * Math.exp(-((xx - X) * (xx - X) + (yy - Y) * (yy - Y)) / s2);
        }
      };
      cat.forEach(function (s0) { put(s0[0], s0[1], s0[2]); });
      put(qa[0] / sc, qa[1] / sc, 7.6);                                  // Lugh (brillo aumentado para el ejemplo)
      f[300 * W + 1200] += 160; f[301 * W + 1200] += 60;                 // píxel caliente (fijo en el sensor)
      if (k === 3) for (var q2 = 0; q2 < 700; q2++) { var lx = 200 + q2, ly = Math.round(900 - q2 * 0.55); if (ly > 0) { f[ly * W + lx] += 55; f[(ly + 1) * W + lx] += 25; } }  // satélite
      if (k === 4) for (var hz = 0; hz < W * H; hz++) f[hz] = f[hz] * 0.7 + 28 + 18 * (hz % W) / W;   // foto 5 con bruma
      for (var p = 0; p < W * H; p++) { var v = Math.max(0, Math.min(255, f[p])); d[p * 4] = v; d[p * 4 + 1] = v; d[p * 4 + 2] = v * 1.03; d[p * 4 + 3] = 255; }
      ctx.putImageData(im, 0, 0);
      items.push({ name: t('c.ex') + ' ' + (k + 1), time: new Date(base.getTime() + k * DEMO.dt * 60000), src: c, w: W, h: H, demo: true });
    }
    S.items = items; renderThumbs(); setStatus(t('c.loaded', { n: N })); updateAlignBtn();
    $('ast-name').value = DEMO.name; $('id-lat').value = DEMO.lat; $('id-lon').value = DEMO.lon;
    $('id-f').value = ''; $('id-pix').value = ''; $('id-scale').value = DEMO.scale; updateTags(); saveIdent();
  }
  function demoRandom() {
    reset();
    var W = 1600, H = 1066, N = 5, rnd = mulberry(20261121), stars = [];
    for (var i = 0; i < 420; i++) stars.push([rnd() * (W + 200) - 100, rnd() * (H + 200) - 100, 60 * Math.pow(rnd(), -1.1)]);
    var base = new Date(2026, 10, 21, 22, 0, 0), items = [];
    for (var k = 0; k < N; k++) {
      var th = (k - 2) * 0.45 * Math.PI / 180, sx = (rnd() - 0.5) * 60, sy = (rnd() - 0.5) * 60;
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d'), im = ctx.createImageData(W, H), d = im.data, f = new Float32Array(W * H);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) f[y * W + x] = 22 + 10 * x / W + gauss(rnd) * 4;
      var put = function (px, py, flux) {
        var X = Math.cos(th) * (px - W / 2) - Math.sin(th) * (py - H / 2) + W / 2 + sx;
        var Y = Math.sin(th) * (px - W / 2) + Math.cos(th) * (py - H / 2) + H / 2 + sy;
        var s2 = 2 * 1.4 * 1.4, A = flux / (Math.PI * s2);
        for (var yy = Math.floor(Y) - 5; yy <= Math.floor(Y) + 5; yy++) for (var xx = Math.floor(X) - 5; xx <= Math.floor(X) + 5; xx++) {
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          f[yy * W + xx] += A * Math.exp(-((xx - X) * (xx - X) + (yy - Y) * (yy - Y)) / s2);
        }
      };
      stars.forEach(function (s) { put(s[0], s[1], s[2]); });
      put(720 + k * 11, 470 + k * 6, 420);                         // el asteroide
      f[300 * W + 1200] += 160; f[301 * W + 1200] += 60;            // píxel caliente (fijo en el sensor)
      if (k === 3) for (var q = 0; q < 700; q++) { var lx = 200 + q, ly = Math.round(900 - q * 0.55); if (ly > 0) { f[ly * W + lx] += 55; f[(ly + 1) * W + lx] += 25; } }  // satélite
      if (k === 4) for (var hz = 0; hz < W * H; hz++) f[hz] = f[hz] * 0.7 + 28 + 18 * (hz % W) / W;   // foto 5 con bruma: más clara y con menos contraste
      for (var p = 0; p < W * H; p++) { var v = Math.max(0, Math.min(255, f[p])); d[p * 4] = v; d[p * 4 + 1] = v; d[p * 4 + 2] = v * 1.03; d[p * 4 + 3] = 255; }
      ctx.putImageData(im, 0, 0);
      items.push({ name: t('c.ex') + ' ' + (k + 1), time: new Date(base.getTime() + k * 600000), src: c, w: W, h: H, demo: true });
    }
    S.items = items; renderThumbs(); setStatus(t('c.loaded', { n: N })); updateAlignBtn();
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var r = Math.imul(a ^ a >>> 15, 1 | a); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ---------- Estrellas ---------- */
  function grayOf(img) {
    var d = img.data, n = img.width * img.height, g = new Float32Array(n);
    for (var i = 0; i < n; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    return g;
  }
  function detect(g, W, H) {
    // fondo: media en una ventana de 51×51 (imagen integral)
    var I = new Float64Array((W + 1) * (H + 1)), r = 25;
    for (var y = 0; y < H; y++) { var row = 0; for (var x = 0; x < W; x++) { row += g[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
    var res = new Float32Array(W * H);
    for (y = 0; y < H; y++) {
      var y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      for (x = 0; x < W; x++) {
        var x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1);
        var s = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
        res[y * W + x] = g[y * W + x] - s / ((x1 - x0) * (y1 - y0));
      }
    }
    var smp = []; for (var i = 0; i < res.length; i += 37) smp.push(Math.abs(res[i]));
    smp.sort(function (a, b) { return a - b; });
    var sigma = Math.max(0.6, 1.4826 * smp[smp.length >> 1]), thr = Math.max(5 * sigma, 4);
    var out = [], B = 12;
    for (y = B; y < H - B; y++) for (x = B; x < W - B; x++) {
      var v = res[y * W + x]; if (v < thr) continue;
      var mx = true;
      for (var dy = -3; dy <= 3 && mx; dy++) for (var dx = -3; dx <= 3; dx++) { if ((dx || dy) && res[(y + dy) * W + x + dx] > v) { mx = false; break; } }
      if (!mx) continue;
      var sw = 0, sx = 0, sy = 0;
      for (dy = -2; dy <= 2; dy++) for (dx = -2; dx <= 2; dx++) { var w = Math.max(0, res[(y + dy) * W + x + dx]); sw += w; sx += w * dx; sy += w * dy; }
      out.push({ x: x + sx / sw, y: y + sy / sw, f: sw });
    }
    out.sort(function (a, b) { return b.f - a.f; });
    return out.slice(0, 80);
  }

  /* ---------- Alineación: giro + corrimiento ---------- */
  function rigid(pairs) {          // mínimos cuadrados: [ [tx,ty, rx,ry], ... ] → {c, s, tx, ty}
    var n = pairs.length, ax = 0, ay = 0, bx = 0, by = 0;
    pairs.forEach(function (p) { ax += p[0]; ay += p[1]; bx += p[2]; by += p[3]; });
    ax /= n; ay /= n; bx /= n; by /= n;
    var sc = 0, ss = 0;
    pairs.forEach(function (p) { var x = p[0] - ax, y = p[1] - ay, u = p[2] - bx, w = p[3] - by; sc += x * u + y * w; ss += x * w - y * u; });
    var th = Math.atan2(ss, sc), c = Math.cos(th), s = Math.sin(th);
    return { c: c, s: s, tx: bx - (c * ax - s * ay), ty: by - (s * ax + c * ay) };
  }
  function match(R, T) {
    var NR = Math.min(R.length, 40), NT = Math.min(T.length, 40);
    if (NR < 3 || NT < 3) return null;
    var cell = 8, grid = {};
    for (var i = 0; i < R.length; i++) { var key = Math.floor(R[i].x / cell) + ',' + Math.floor(R[i].y / cell); (grid[key] = grid[key] || []).push(i); }
    function nearest(x, y, tol) {
      var gx = Math.floor(x / cell), gy = Math.floor(y / cell), best = -1, bd = tol * tol;
      for (var a = gx - 1; a <= gx + 1; a++) for (var b = gy - 1; b <= gy + 1; b++) {
        var L = grid[a + ',' + b]; if (!L) continue;
        for (var k = 0; k < L.length; k++) { var q = R[L[k]], d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (d < bd) { bd = d; best = L[k]; } }
      }
      return best;
    }
    function score(tr, tol, nT) {
      var pairs = [], used = {};
      for (var j = 0; j < nT; j++) {
        var p = T[j], x = tr.c * p.x - tr.s * p.y + tr.tx, y = tr.s * p.x + tr.c * p.y + tr.ty;
        var k = nearest(x, y, tol); if (k >= 0 && !used[k]) { used[k] = 1; pairs.push([p.x, p.y, R[k].x, R[k].y, R[k].f / p.f]); }
      }
      return pairs;
    }
    function pairList(A, N) {
      var L = [];
      for (var i = 0; i < N; i++) for (var j = i + 1; j < N; j++) {
        var dx = A[j].x - A[i].x, dy = A[j].y - A[i].y, d = Math.hypot(dx, dy);
        if (d > 25) L.push({ i: i, j: j, d: d, a: Math.atan2(dy, dx) });
      }
      return L.sort(function (p, q) { return p.d - q.d; });
    }
    var PR = pairList(R, NR), PT = pairList(T, NT), best = null, bestN = 0, tries = 0;
    for (var m = 0; m < PT.length && tries < 40000; m++) {
      var pt = PT[m], tol = Math.max(1.5, pt.d * 0.004);
      var lo = 0, hi = PR.length;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (PR[mid].d < pt.d - tol) lo = mid + 1; else hi = mid; }
      for (var q = lo; q < PR.length && PR[q].d <= pt.d + tol; q++) {
        var pr = PR[q];
        for (var sw = 0; sw < 2; sw++) {
          tries++;
          var ti = sw ? T[pt.j] : T[pt.i], ang = (sw ? pt.a + Math.PI : pt.a);
          var th = pr.a - ang, c = Math.cos(th), s = Math.sin(th), ri = R[pr.i];
          var tr = { c: c, s: s, tx: ri.x - (c * ti.x - s * ti.y), ty: ri.y - (s * ti.x + c * ti.y) };
          var n = score(tr, 3, NT).length;
          if (n > bestN) { bestN = n; best = tr; }
        }
      }
    }
    if (!best || bestN < Math.min(6, Math.max(3, Math.floor(Math.min(NR, NT) / 3)))) return null;
    var pr2 = score(best, 3, T.length); best = rigid(pr2);
    pr2 = score(best, 2, T.length); if (pr2.length >= 3) best = rigid(pr2);
    best.n = pr2.length;
    // relación de brillo entre las mismas estrellas (mediana): sirve para normalizar el contraste
    var ratios = pr2.map(function (q) { return q[4]; }).filter(isFinite).sort(function (a, b) { return a - b; });
    best.fac = ratios.length >= 3 ? ratios[ratios.length >> 1] : null;
    return best;
  }

  /* ---------- Proceso completo ---------- */
  function align() {
    stop();
    var items = S.items, N = items.length; if (N < 2) return;
    $('btn-align').disabled = true; $('align-log').innerHTML = '';
    var w0 = items[0].w, h0 = items[0].h;
    var sizeWarn = items.some(function (it) { return it.w !== w0 || it.h !== h0; });
    var k = Math.min(1, MAXW / Math.max(w0, h0)), W = Math.round(w0 * k), H = Math.round(h0 * k);
    S.W = W; S.H = H; S.scale = k; S.frames = []; S.cache = {}; S.median = null; S.marks = []; S.logs = []; S.normDone = false; S.lutRef = null; S.normList = null;
    var work = items.map(function (it) {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d').drawImage(it.src, 0, 0, W, H);
      return c;
    });
    var stars = [], i = 0;
    function step() {
      if (i < N) {
        setStatus(t('c.detecting', { i: i + 1, n: N }));
        var img = work[i].getContext('2d').getImageData(0, 0, W, H);
        stars[i] = detect(grayOf(img), W, H);
        i++; setTimeout(step, 10); return;
      }
      var ok = 1, logs = [t('c.alignRef', { m: stars[0].length })];
      items.forEach(function (it, j) {
        var tr = j === 0 ? { c: 1, s: 0, tx: 0, ty: 0, n: stars[0].length } : match(stars[0], stars[j]);
        if (j > 0) {
          if (tr) { ok++; logs.push(t('c.alignInfo', { i: j + 1, m: tr.n, rot: nf(Math.atan2(tr.s, tr.c) * 180 / Math.PI, 2), dx: nf(tr.tx / k, 0), dy: nf(tr.ty / k, 0) })); }
          else { logs.push(t('c.alignFail', { i: j + 1 })); tr = { c: 1, s: 0, tx: 0, ty: 0, n: 0 }; }
        }
        var c = document.createElement('canvas'); c.width = W; c.height = H;
        var ctx = c.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.setTransform(tr.c, tr.s, -tr.s, tr.c, tr.tx, tr.ty); ctx.drawImage(work[j], 0, 0);
        var img = ctx.getImageData(0, 0, W, H);
        S.frames.push({ img: img, gray: grayOf(img), time: it.time, name: it.name, tr: tr });
      });
      if (sizeWarn) logs.push(t('c.sizeWarn'));
      S.logs = logs; renderLog();
      if (S.normalize) { normalizeAll(); addNormLog(); }
      S.stars0 = stars[0]; S.field = null; $('id-result').innerHTML = ''; $('id-status').textContent = ''; renderTimes();
      setStatus(t('c.done', { ok: ok, n: N }));
      $('btn-align').disabled = false;
      $('viewer').hidden = false; S.cur = 0; S.z = 1; S.cx = 0.5; S.cy = 0.5;
      var v = $('view'); v.width = W; v.height = H;
      draw(); renderMarks();
      $('c2-h').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(step, 20);
  }
  function addNormLog() { if (S.normList && S.normList.length) { $('align-log').insertAdjacentHTML('beforeend', '<li>' + esc(t('c.normLog', { list: S.normList.join(', ') })) + '</li>'); } }
  function renderLog() { $('align-log').innerHTML = S.logs.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join(''); }

  /* ---------- Normalización de brillo y contraste ----------
     Para cada foto: fondo local (media 65×65 con imagen integral) que se resta,
     y escala del contraste (percentil 99,9 del residuo) igualada a la de la foto 1. */
  function flatten(g, alphaImg, W, H) {
    // media local solo sobre los píxeles con imagen (las esquinas vacías del giro no cuentan)
    var W1 = W + 1, I = new Float64Array(W1 * (H + 1)), C = new Float64Array(W1 * (H + 1)), r = 32, x, y, ad = alphaImg.data;
    for (y = 0; y < H; y++) {
      var row = 0, rc = 0;
      for (x = 0; x < W; x++) { var q = y * W + x, m = ad[q * 4 + 3] > 0 ? 1 : 0; row += m * g[q]; rc += m; I[(y + 1) * W1 + x + 1] = I[y * W1 + x + 1] + row; C[(y + 1) * W1 + x + 1] = C[y * W1 + x + 1] + rc; }
    }
    var res = new Float32Array(W * H);
    for (y = 0; y < H; y++) {
      var y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      for (x = 0; x < W; x++) {
        var x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1);
        var sm = I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0];
        var cn = C[y1 * W1 + x1] - C[y0 * W1 + x1] - C[y1 * W1 + x0] + C[y0 * W1 + x0];
        res[y * W + x] = cn > 0 ? g[y * W + x] - sm / cn : 0;
      }
    }
    var smp = [];
    for (var i = 0; i < res.length; i += 19) if (alphaImg.data[i * 4 + 3]) smp.push(res[i]);
    smp.sort(function (a, b) { return a - b; });
    return { res: res, hi: Math.max(1, smp[Math.floor(smp.length * 0.999)] - smp[smp.length >> 1]), mid: smp[smp.length >> 1] };
  }
  function normalizeAll() {
    if (S.normDone) return;
    var W = S.W, H = S.H, ref = null, items = [];
    S.frames.forEach(function (fr, k) {
      var f = flatten(fr.gray, fr.img, W, H);
      if (!ref) ref = f;
      var fac = k === 0 ? 1 : (fr.tr && fr.tr.fac ? fr.tr.fac : ref.hi / f.hi), out = new Float32Array(W * H), base = 30;
      for (var p = 0; p < out.length; p++) out[p] = fr.img.data[p * 4 + 3] ? base + (f.res[p] - f.mid) * fac : 0;
      fr.norm = out; fr.normFac = fac;
      if (k > 0) items.push(t('c.normItem', { i: k + 1, f: nf(fac, 2) }));
    });
    S.normDone = true;
    S.normList = items;
  }
  function grayOfFrame(k) { if (S.normalize) { normalizeAll(); return S.frames[k].norm; } return S.frames[k].gray; }

  /* ---------- Imágenes para mostrar ---------- */
  function lut(gray, alphaImg) {
    var smp = [];
    for (var i = 0; i < gray.length; i += 23) if (alphaImg.data[i * 4 + 3] > 0) smp.push(gray[i]);
    smp.sort(function (a, b) { return a - b; });
    var lo = smp[Math.floor(smp.length * 0.6)] || 0, hi = smp[Math.floor(smp.length * 0.9995)] || 255;
    if (hi - lo < 8) hi = lo + 8;
    var gamma = 1 - S.stretch * 0.055, L = new Uint8ClampedArray(256);
    for (var v = 0; v < 256; v++) L[v] = 255 * Math.pow(Math.max(0, Math.min(1, (v - lo) / (hi - lo))), gamma);
    return L;
  }
  function medianImg() {
    if (S.median && S.median.norm === S.normalize) return S.median;
    var G = S.frames.map(function (f, k) { return grayOfFrame(k); });
    var N = S.frames.length, n = S.W * S.H, M = new Float32Array(n), cov = new Uint8Array(n), tmp = new Float32Array(N);
    for (var p = 0; p < n; p++) {
      var all = 1;
      for (var k = 0; k < N; k++) { if (!S.frames[k].img.data[p * 4 + 3]) { all = 0; break; } tmp[k] = G[k][p]; }
      cov[p] = all; if (!all) continue;
      var a = Array.prototype.slice.call(tmp).sort(function (x, y) { return x - y; });
      M[p] = N % 2 ? a[N >> 1] : (a[N / 2 - 1] + a[N / 2]) / 2;
    }
    S.median = { M: M, cov: cov, norm: S.normalize };
    return S.median;
  }
  function display(k) {
    var key = k + '|' + S.mode + '|' + S.stretch + '|' + S.normalize;
    if (S.cache[key]) return S.cache[key];
    var fr = S.frames[k], W = S.W, H = S.H, c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d'), out = ctx.createImageData(W, H), o = out.data, d = fr.img.data, n = W * H, p;
    if (S.mode === 'diff') {
      // diferencia con la mediana, suavizada 3×3 y sin el ruido de fondo
      var med = medianImg(), raw = new Float32Array(n), sm = new Float32Array(n), smp = [], x, y;
      var gk = grayOfFrame(k);
      for (p = 0; p < n; p++) if (med.cov[p]) raw[p] = gk[p] - med.M[p];
      for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
        p = y * W + x;
        sm[p] = (raw[p - W - 1] + raw[p - W] + raw[p - W + 1] + raw[p - 1] + raw[p] + raw[p + 1] + raw[p + W - 1] + raw[p + W] + raw[p + W + 1]) / 9;
      }
      for (p = 0; p < n; p += 31) if (med.cov[p]) smp.push(Math.abs(sm[p]));
      smp.sort(function (a, b) { return a - b; });
      var sig = Math.max(0.3, 1.4826 * (smp[smp.length >> 1] || 1)), thr = 4 * sig;
      var hi = Math.max(10 * sig, 1) * (1.6 - S.stretch * 0.12);
      var vv = new Float32Array(n);
      for (p = 0; p < n; p++) { var q0 = med.cov[p] ? Math.sqrt(Math.max(0, Math.min(1, (sm[p] - thr) / hi))) : 0; vv[p] = q0 < 0.3 ? 0 : q0; }
      // se agranda cada punto (máximo en 5×5) para que se vea aun sin acercar
      var dil = new Float32Array(n), tmpR = new Float32Array(n);
      for (y = 0; y < H; y++) for (x = 2; x < W - 2; x++) { p = y * W + x; tmpR[p] = Math.max(vv[p - 2], vv[p - 1], vv[p], vv[p + 1], vv[p + 2]); }
      for (y = 2; y < H - 2; y++) for (x = 0; x < W; x++) { p = y * W + x; dil[p] = Math.max(tmpR[p - 2 * W], tmpR[p - W], tmpR[p], tmpR[p + W], tmpR[p + 2 * W]); }
      for (p = 0; p < n; p++) { var v = dil[p]; o[p * 4] = 255 * v; o[p * 4 + 1] = 214 * v; o[p * 4 + 2] = 90 * v; o[p * 4 + 3] = 255; }
    } else {
      // un mismo realce para todas las fotos (el de la foto 1), así se comparan de igual a igual
      var inv = S.mode === 'invert';
      if (!S.lutRef || S.lutRef.key !== S.normalize + '|' + S.stretch) {
        var g0 = grayOfFrame(0), gq = new Float32Array(g0.length);
        for (p = 0; p < g0.length; p++) gq[p] = Math.max(0, Math.min(255, g0[p]));
        S.lutRef = { key: S.normalize + '|' + S.stretch, L: lut(gq, S.frames[0].img) };
      }
      var L = S.lutRef.L;
      if (S.normalize) {
        var gn = grayOfFrame(k);
        for (p = 0; p < n; p++) { var gv = d[p * 4 + 3] ? L[Math.max(0, Math.min(255, Math.round(gn[p])))] : 0; if (inv) gv = 255 - gv; o[p * 4] = o[p * 4 + 1] = o[p * 4 + 2] = gv; o[p * 4 + 3] = 255; }
      } else {
        for (p = 0; p < n; p++) {
          var a = d[p * 4 + 3];
          for (var ch = 0; ch < 3; ch++) { var val = a ? L[d[p * 4 + ch]] : 0; o[p * 4 + ch] = inv ? 255 - val : val; }
          o[p * 4 + 3] = 255;
        }
      }
    }
    ctx.putImageData(out, 0, 0);
    S.cache[key] = c;
    return c;
  }
  function viewRect() {
    var w = S.W / S.z, h = S.H / S.z;
    var x = Math.max(0, Math.min(S.W - w, S.cx * S.W - w / 2)), y = Math.max(0, Math.min(S.H - h, S.cy * S.H - h / 2));
    return { x: x, y: y, w: w, h: h };
  }
  function draw() {
    if (!S.frames.length) return;
    var v = $('view'), ctx = v.getContext('2d'), r = viewRect(), img = display(S.cur);
    ctx.imageSmoothingEnabled = S.z < 3;
    ctx.clearRect(0, 0, v.width, v.height);
    ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, v.width, v.height);
    var sc = v.width / r.w, toV = function (x, y) { return [(x - r.x) * sc, (y - r.y) * sc]; };
    // trayectoria marcada
    var pts = S.marks.map(function (m, i) { return m ? { i: i, p: toV(m.x, m.y) } : null; }).filter(Boolean);
    var light = S.mode === 'invert';
    if (pts.length > 1) {
      ctx.strokeStyle = light ? 'rgba(194,65,12,.8)' : 'rgba(255,182,39,.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath();
      pts.forEach(function (q, j) { if (j) ctx.lineTo(q.p[0], q.p[1]); else ctx.moveTo(q.p[0], q.p[1]); }); ctx.stroke(); ctx.setLineDash([]);
    }
    pts.forEach(function (q) {
      var on = q.i === S.cur;
      ctx.strokeStyle = on ? (light ? '#c2410c' : '#ffb627') : (light ? 'rgba(20,38,75,.6)' : 'rgba(238,242,250,.6)');
      var km = Math.max(1, v.width / (v.getBoundingClientRect().width || v.width));
      ctx.lineWidth = (on ? 3 : 1.5) * Math.max(1, km / 2); ctx.beginPath(); ctx.arc(q.p[0], q.p[1], (on ? 18 : 10) * Math.max(1, km / 2), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.font = '700 ' + Math.round(Math.max(22, 13 * km)) + 'px "Atkinson Hyperlegible", sans-serif'; ctx.fillText(String(q.i + 1), q.p[0] + 20 * Math.max(1, km / 2), q.p[1] - 14 * Math.max(1, km / 2));
    });
    if (S.marking && S.cross) {
      var cp = toV(S.cross.x, S.cross.y); ctx.strokeStyle = light ? '#14264b' : '#8cc0ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cp[0] - 26, cp[1]); ctx.lineTo(cp[0] - 8, cp[1]); ctx.moveTo(cp[0] + 8, cp[1]); ctx.lineTo(cp[0] + 26, cp[1]);
      ctx.moveTo(cp[0], cp[1] - 26); ctx.lineTo(cp[0], cp[1] - 8); ctx.moveTo(cp[0], cp[1] + 8); ctx.lineTo(cp[0], cp[1] + 26); ctx.stroke();
    }
    if (S.field && $('show-labels').checked) drawField(ctx, toV, light);
    if (S.loupe > 1 && S.lp) {
      var lc = toV(S.lp.x, S.lp.y), LR = Math.round(Math.min(v.width, v.height) * 0.2), sw2 = 2 * LR / sc / S.loupe;
      ctx.save(); ctx.beginPath(); ctx.arc(lc[0], lc[1], LR, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      ctx.fillStyle = '#000'; ctx.fillRect(lc[0] - LR, lc[1] - LR, 2 * LR, 2 * LR);
      ctx.imageSmoothingEnabled = S.loupe * sc < 3;
      ctx.drawImage(img, S.lp.x - sw2 / 2, S.lp.y - sw2 / 2, sw2, sw2, lc[0] - LR, lc[1] - LR, 2 * LR, 2 * LR);
      // marcas dentro de la lupa
      var k2 = S.loupe * sc;
      S.marks.forEach(function (m, i) { if (!m) return; var mx = lc[0] + (m.x - S.lp.x) * k2, my = lc[1] + (m.y - S.lp.y) * k2;
        ctx.strokeStyle = i === S.cur ? (light ? '#c2410c' : '#ffb627') : (light ? 'rgba(20,38,75,.6)' : 'rgba(238,242,250,.6)'); ctx.lineWidth = i === S.cur ? 3 : 1.5;
        ctx.beginPath(); ctx.arc(mx, my, i === S.cur ? 18 : 10, 0, Math.PI * 2); ctx.stroke(); });
      ctx.restore();
      ctx.strokeStyle = light ? '#14264b' : '#ffb627'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(lc[0], lc[1], LR, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.font = '700 24px "Atkinson Hyperlegible", sans-serif'; ctx.fillText(S.loupe + '×', lc[0] + LR * 0.72, lc[1] + LR * 0.95);
    }
    var fr = S.frames[S.cur], N = S.frames.length;
    var lbl = t('c.frame', { i: S.cur + 1, n: N }) + ' · ' + hms(fr.time) + ' · ' + fr.name;
    $('frame-label').textContent = lbl;
    $('frame-sr').textContent = S.timer ? '' : lbl;
    $('view').setAttribute('aria-label', t('c.canvasLbl', { i: S.cur + 1, n: N, time: hms(fr.time), mode: t(S.mode === 'diff' ? 'c.mDiff' : (S.mode === 'invert' ? 'c.mInvert' : 'c.mNormal')).toLowerCase(), z: S.z }) + (S.loupe > 1 ? ' ' + t('c.loupeLbl', { l: S.loupe }) + '.' : ''));
    $('z-out-v').textContent = S.z + '×';
  }

  /* ---------- Reproducción ---------- */
  function go(k) { S.cur = (k + S.frames.length) % S.frames.length; draw(); }
  function play() {
    if (S.timer || S.frames.length < 2) return;
    var fps = Math.max(0.5, Math.min(3, +$('speed').value || 2));
    S.timer = setInterval(function () { go(S.cur + 1); }, 1000 / fps);
    $('btn-play').setAttribute('aria-pressed', 'true'); $('play-txt').textContent = t('c.pause');
    $('ic-play').toggleAttribute('hidden', true); $('ic-pause').toggleAttribute('hidden', false); draw();
  }
  function stop() {
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    var b = $('btn-play'); if (!b) return;
    b.setAttribute('aria-pressed', 'false'); $('play-txt').textContent = t('c.play');
    $('ic-play').toggleAttribute('hidden', false); $('ic-pause').toggleAttribute('hidden', true);
    if (S.frames.length) draw();
  }

  /* ---------- Acercar, mover, marcar ---------- */
  function zoom(z) { S.z = Math.max(1, Math.min(16, z)); draw(); }
  function toImage(ev) {
    var v = $('view'), b = v.getBoundingClientRect(), r = viewRect();
    return { x: r.x + (ev.clientX - b.left) / b.width * r.w, y: r.y + (ev.clientY - b.top) / b.height * r.h };
  }
  function mark(x, y) {
    S.marks[S.cur] = { x: x, y: y }; renderMarks(); draw();
  }
  function renderMarks() {
    var box = $('marks'), ms = S.marks, k = S.scale, rows = [], prev = null, first = null, last = null;
    ms.forEach(function (m, i) {
      if (!m) return;
      var row = t('c.markRow', { i: i + 1, x: nf(m.x / k, 0), y: nf(m.y / k, 0) });
      if (prev) {
        var px = Math.hypot(m.x - prev.m.x, m.y - prev.m.y) / k, txt = t('c.markMove', { px: nf(px, 1) });
        var t1 = S.frames[i].time, t0 = S.frames[prev.i].time;
        if (t1 && t0 && t1 - t0 > 0) txt += t('c.markRate', { r: nf(px / ((t1 - t0) / 60000), 2) });
        row += ' — ' + txt;
      }
      rows.push('<li>' + row + '</li>'); prev = { i: i, m: m }; if (!first) first = m; last = m;
    });
    var html = rows.length ? '<ol>' + rows.join('') + '</ol>' : '<p class="hint">' + t('c.marksNone') + '</p>';
    if (first && last && first !== last) html += '<p>' + t('c.markTotal', { px: nf(Math.hypot(last.x - first.x, last.y - first.y) / k, 1) }) + '</p>';
    box.innerHTML = html;
  }

  /* ---------- Identificar estrellas y el asteroide ----------
     Con la hora, el lugar y el nombre del asteroide se sabe hacia dónde apuntaba la cámara.
     Se proyectan las estrellas del catálogo alrededor de esa posición y se buscan coincidencias
     con las estrellas detectadas en la foto 1 (escala ±20 %, cualquier giro, imagen directa o espejada). */
  var RAW = null, STARP = null;
  function loadScript(src) { return new Promise(function (res, rej) { var e = document.createElement('script'); e.src = src; e.onload = res; e.onerror = rej; document.head.appendChild(e); }); }
  function loadStars() { if (window.ESTRELLAS8) return Promise.resolve(); if (!STARP) STARP = loadScript('js/estrellas8.js?v=1'); return STARP; }
  function loadSbdb() {
    if (RAW) return Promise.resolve(RAW);
    return Promise.all(['sbdb_brillantes.json', 'sbdb_neo.json'].map(function (u) { return fetch(u).then(function (r) { return r.json(); }); }))
      .then(function (js) { RAW = js; return js; });
  }
  function findAsteroid(q) {
    q = String(q || '').trim(); if (!q) return Promise.resolve(null);
    var m = q.match(/^\((\d+)\)\s*(.*)$/), num = m ? m[1] : (/^\d+$/.test(q) ? q : null), nm = (m ? m[2] : q).toLowerCase().replace(/\s+/g, ' ');
    return loadSbdb().then(function (js) {
      for (var j = 0; j < js.length; j++) {
        var f = js[j].fields, ix = {}; f.forEach(function (k, i) { ix[k] = i; });
        for (var r = 0; r < js[j].data.length; r++) {
          var row = js[j].data[r], pd = row[ix.pdes], na = (row[ix.name] || '').toLowerCase();
          if ((num && pd === num) || pd.toLowerCase() === nm || (na && na === nm)) {
            var o = { pdes: pd, name: row[ix.name] || '' };
            ['epoch', 'e', 'a', 'i', 'om', 'w', 'ma', 'H'].forEach(function (k) { o[k] = +row[ix[k]]; });
            o.G = row[ix.G] == null ? null : +row[ix.G];
            if (!(o.e < 1)) return null;
            return window.Astro.prepare(o);
          }
        }
      }
      return null;
    });
  }
  function tangent(ra, dec, ra0, dec0) {      // proyección gnomónica, en segundos de arco (ξ hacia el este, η hacia el norte)
    var D = Math.PI / 180, a = (ra - ra0) * D, d = dec * D, d0 = dec0 * D;
    var cc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a);
    if (cc < 0.2) return null;
    return [Math.cos(d) * Math.sin(a) / cc * 206264.806, (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a)) / cc * 206264.806];
  }
  function frameTimes() {
    var N = S.frames.length, out = [];
    if (S.frames.every(function (f) { return f.time; })) return S.frames.map(function (f) { return f.time; });
    var t0 = $('id-t0').value, dt = +$('id-dt').value || 10;
    if (!t0) return null;
    var b = new Date(t0); for (var k = 0; k < N; k++) out.push(new Date(b.getTime() + k * dt * 60000));
    return out;
  }
  function renderTimes() {
    var all = S.frames.length && S.frames.every(function (f) { return f.time; });
    $('id-manual').hidden = !!all || !S.frames.length;
    $('id-times').textContent = !S.frames.length ? '' : (all ? t('c.idTimesExif', { a: hms(S.frames[0].time), b: hms(S.frames[S.frames.length - 1].time) }) : t('c.idTimesManual'));
  }
  function updScale() {
    var f = +$('id-f').value, px = +$('id-pix').value;
    if (f > 0 && px > 0) $('id-scale').value = (206.265 * px / f).toFixed(2);
  }
  function saveIdent() {
    try { localStorage.setItem('asterfoto.ident', JSON.stringify({ lat: $('id-lat').value, lon: $('id-lon').value, f: $('id-f').value, pix: $('id-pix').value, scale: $('id-scale').value })); } catch (e) { /* sin guardar */ }
  }
  function solveField(img, cat) {
    // img: estrellas de la foto [{x,y,f}] (ordenadas por brillo); cat: [{u,v,m}] en píxeles de trabajo, ordenadas por brillo
    var NI = Math.min(img.length, 25), NC = Math.min(cat.length, 40), cell = 10, grid = {};
    img.forEach(function (p, i) { var k = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell); (grid[k] = grid[k] || []).push(i); });
    function near(x, y, tol) {
      var gx = Math.floor(x / cell), gy = Math.floor(y / cell), best = -1, bd = tol * tol;
      for (var a = gx - 1; a <= gx + 1; a++) for (var b = gy - 1; b <= gy + 1; b++) { var L = grid[a + ',' + b]; if (!L) continue;
        for (var k = 0; k < L.length; k++) { var q = img[L[k]], d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (d < bd) { bd = d; best = L[k]; } } }
      return best;
    }
    function pairs(P, N) {
      var L = []; for (var i = 0; i < N; i++) for (var j = i + 1; j < N; j++) { var dx = P[j].x - P[i].x, dy = P[j].y - P[i].y, d = Math.hypot(dx, dy); if (d > 20) L.push({ i: i, j: j, d: d, a: Math.atan2(dy, dx) }); }
      return L.sort(function (p, q) { return p.d - q.d; });
    }
    function apply(T, c) { return { x: T.a * c.x - T.b * c.y + T.tx, y: T.b * c.x + T.a * c.y + T.ty }; }
    function score(T, C, n, tol) {
      var used = {}, m = [];
      for (var k = 0; k < n; k++) { var q = apply(T, C[k]); if (q.x < -20 || q.y < -20 || q.x > S.W + 20 || q.y > S.H + 20) continue;
        var i = near(q.x, q.y, tol); if (i >= 0 && !used[i]) { used[i] = 1; m.push([C[k].x, C[k].y, img[i].x, img[i].y]); } }
      return m;
    }
    function fit(m) {      // semejanza por mínimos cuadrados (números complejos)
      var n = m.length, cx = 0, cy = 0, ix = 0, iy = 0; m.forEach(function (p) { cx += p[0]; cy += p[1]; ix += p[2]; iy += p[3]; }); cx /= n; cy /= n; ix /= n; iy /= n;
      var nr = 0, ni = 0, dd = 0; m.forEach(function (p) { var ux = p[0] - cx, uy = p[1] - cy, vx = p[2] - ix, vy = p[3] - iy; nr += vx * ux + vy * uy; ni += vy * ux - vx * uy; dd += ux * ux + uy * uy; });
      var a = nr / dd, b = ni / dd; return { a: a, b: b, tx: ix - (a * cx - b * cy), ty: iy - (b * cx + a * cy) };
    }
    var PI = pairs(img, NI), best = null, bestN = 0, bestP = 1;
    [1, -1].forEach(function (par) {
      var C = cat.slice(0, NC).map(function (c) { return { x: c.u, y: par * c.v }; }), PC = pairs(C, C.length);
      PI.forEach(function (pi) {
        var lo = pi.d / 1.22, hi = pi.d / 0.82, l = 0, h = PC.length;
        while (l < h) { var md = (l + h) >> 1; if (PC[md].d < lo) l = md + 1; else h = md; }
        for (var q = l; q < PC.length && PC[q].d <= hi; q++) {
          var pc = PC[q], s0 = pi.d / pc.d;
          for (var sw = 0; sw < 2; sw++) {
            var ca = sw ? C[pc.j] : C[pc.i], ang = sw ? pc.a + Math.PI : pc.a, th = pi.a - ang, ii = img[pi.i];
            var T = { a: s0 * Math.cos(th), b: s0 * Math.sin(th) }; T.tx = ii.x - (T.a * ca.x - T.b * ca.y); T.ty = ii.y - (T.b * ca.x + T.a * ca.y);
            var n = score(T, C, C.length, 4).length;
            if (n > bestN) { bestN = n; best = T; bestP = par; }
          }
        }
      });
    });
    if (!best || bestN < 5) return null;
    var Call = cat.map(function (c) { return { x: c.u, y: bestP * c.v }; });
    var m = score(best, Call, Call.length, 4); best = fit(m);
    m = score(best, Call, Call.length, 3); if (m.length >= 5) best = fit(m);
    best.par = bestP; best.n = m.length; best.scale = Math.hypot(best.a, best.b);
    return best.n >= 5 ? best : null;
  }
  function identify() {
    if (!S.frames.length || !S.stars0) return;
    var st = $('id-status'), times = frameTimes(), lat = parseFloat($('id-lat').value), lon = parseFloat($('id-lon').value), sc = parseFloat($('id-scale').value);
    if (!$('ast-name').value.trim()) { st.textContent = t('c.idNeedAst'); return; }
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) { st.textContent = t('c.idNeedPlace'); return; }
    if (!(sc > 0)) { st.textContent = t('c.idNeedScale'); return; }
    if (!times) { st.textContent = t('c.idNeedTime'); return; }
    saveIdent(); st.textContent = t('c.idWorking'); $('btn-ident').disabled = true;
    Promise.all([loadStars(), findAsteroid($('ast-name').value)]).then(function (r) {
      var o = r[1], A = window.Astro, E = window.ESTRELLAS8, site = { lat: lat, lon: lon };
      if (!o) { st.textContent = t('c.idNoAst', { n: $('ast-name').value }); return; }
      var pos = times.map(function (tm) { return A.observe(o, A.jdFromDate(tm), site); });
      var c0 = pos[0], scW = sc / S.scale;                                     // ″ por píxel de trabajo
      var rad = Math.hypot(S.W, S.H) / 2 * scW / 3600 * 1.6 + 0.4;            // grados alrededor del asteroide
      var cat = [];
      for (var i = 0; i < E.ra.length; i++) {
        var ra = E.ra[i] / 1000, de = E.dec[i] / 1000;
        if (Math.abs(de - c0.dec) > rad) continue;
        var q = tangent(ra, de, c0.ra, c0.dec); if (!q || Math.hypot(q[0], q[1]) > rad * 3600) continue;
        cat.push({ u: q[0] / scW, v: q[1] / scW, m: E.mag[i] / 100, i: i });
      }
      cat.sort(function (a, b) { return a.m - b.m; });
      setTimeout(function () {
        var T = cat.length >= 5 ? solveField(S.stars0, cat) : null;
        $('btn-ident').disabled = false;
        if (!T) { S.field = null; draw(); st.textContent = t(cat.length < 5 ? 'c.idFewStars' : 'c.idFail'); $('id-result').innerHTML = ''; return; }
        var toImg = function (ra, de) { var q = tangent(ra, de, c0.ra, c0.dec); if (!q) return null; var u = q[0] / scW, v = T.par * q[1] / scW; return { x: T.a * u - T.b * v + T.tx, y: T.b * u + T.a * v + T.ty }; };
        // rótulos: las estrellas con nombre o designación y las más brillantes del campo
        var labels = [];
        cat.forEach(function (c) {
          var p = toImg(E.ra[c.i] / 1000, E.dec[c.i] / 1000); if (!p || p.x < 0 || p.y < 0 || p.x > S.W || p.y > S.H) return;
          var hip = E.hip[c.i], lab = E.lab[hip] || ('HIP ' + hip);
          labels.push({ x: p.x, y: p.y, m: c.m, t: lab });
        });
        labels = labels.slice(0, 14);
        var ast = pos.map(function (q) { return toImg(q.ra, q.dec); });
        // centro de la foto y dirección del norte
        var cx = S.W / 2 - T.tx, cy = S.H / 2 - T.ty, det = T.a * T.a + T.b * T.b;
        var u0 = (T.a * cx + T.b * cy) / det, v0 = (-T.b * cx + T.a * cy) / det * T.par;
        var ra0 = c0.ra - u0 * scW / 3600 / Math.cos(c0.dec * Math.PI / 180), de0 = c0.dec + v0 * scW / 3600;
        var nx = -T.b * T.par, ny = T.a * T.par, nAng = (Math.atan2(nx, -ny) * 180 / Math.PI + 360) % 360;
        S.field = { labels: labels, ast: ast, name: o.name || o.pdes, times: times };
        draw();
        var html = '<p class="ok-line">' + t('c.idOk', { n: T.n }) + '</p><ul>' +
          '<li>' + t('c.idCenter', { ra: raStr(ra0), dec: decStr(de0) }) + '</li>' +
          '<li>' + t('c.idScaleRes', { s: nf(scW / T.scale * S.scale, 2), g: nf(sc, 2) }) + '</li>' +
          '<li>' + t('c.idNorth', { dir: t('mv.' + (Math.round(nAng / 45) % 8)) }) + (T.par < 0 ? ' ' + t('c.idMirror') : '') + '</li>' +
          '<li>' + t('c.idAst', { n: o.name || o.pdes }) + '</li></ul>';
        // ¿coincide lo marcado con lo previsto?
        var dists = [];
        S.marks.forEach(function (mk, k) { if (mk && ast[k]) dists.push(Math.hypot(mk.x - ast[k].x, mk.y - ast[k].y)); });
        if (dists.length) {
          dists.sort(function (a, b) { return a - b; });   // mediana: una marca equivocada no arruina la comparación
          var dm = dists.length % 2 ? dists[dists.length >> 1] : (dists[dists.length / 2 - 1] + dists[dists.length / 2]) / 2, pxo = dm / S.scale, arc = dm * scW;
          html += '<p class="' + (arc < 90 ? 'ok-line' : 'warn') + '">' + t(arc < 90 ? 'c.idMatch' : 'c.idNoMatch', { px: nf(pxo, 0), as: nf(arc, 0), n: o.name || o.pdes }) + '</p>';
        } else html += '<p class="hint">' + t('c.idMarkTip') + '</p>';
        $('id-result').innerHTML = html; st.textContent = '';
      }, 30);
    }).catch(function () { $('btn-ident').disabled = false; st.textContent = t('c.idLoadFail'); });
  }
  function raStr(ra) { ra = (ra + 360) % 360; var h = ra / 15, H = Math.floor(h), m = Math.round((h - H) * 60); if (m === 60) { H = (H + 1) % 24; m = 0; } return H + 'h ' + String(m).padStart(2, '0') + 'm'; }
  function decStr(d) { var s = d < 0 ? '−' : '+', a = Math.abs(d), D = Math.floor(a), m = Math.round((a - D) * 60); if (m === 60) { D++; m = 0; } return s + D + '° ' + String(m).padStart(2, '0') + '′'; }
  function drawField(ctx, toV, light) {
    var F = S.field, star = light ? '#14264b' : '#8cc0ff', amb = light ? '#c2410c' : '#ffb627';
    // tamaño en pantalla parejo: en un celular el lienzo se ve mucho más chico que su resolución
    var cw = $('view').getBoundingClientRect().width || $('view').width, k = Math.max(1, $('view').width / cw);
    var fs = Math.round(Math.max(20, 13 * k)), R1 = Math.max(14, 9 * k), R2 = Math.max(30, 16 * k);
    ctx.save(); ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", sans-serif'; ctx.lineWidth = Math.max(2, 1.2 * k);
    var boxes = [], pa = F.ast[S.cur] ? toV(F.ast[S.cur].x, F.ast[S.cur].y) : null;
    if (pa) { var wl = ctx.measureText(F.name + ' · ' + t('c.idPred')).width; boxes.push([pa[0] - R2, pa[1] - R2, pa[0] + R2 + 10 + wl, pa[1] + R2 + fs]); }   // el rótulo del asteroide tiene prioridad
    F.labels.forEach(function (l) {
      var p = toV(l.x, l.y); ctx.strokeStyle = star; ctx.beginPath(); ctx.arc(p[0], p[1], R1, 0, Math.PI * 2); ctx.stroke();
      var txt = l.t + ' · ' + nf(l.m, 1), w = ctx.measureText(txt).width, bx = [p[0] + R1 + 2, p[1] - R1 - fs, p[0] + R1 + 6 + w, p[1] - R1 + 4];
      if (boxes.some(function (b) { return bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1]; })) return;   // sin rótulos encimados
      boxes.push(bx); ctx.lineWidth = Math.max(5, fs / 4); ctx.strokeStyle = light ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.8)'; ctx.strokeText(txt, p[0] + R1 + 4, p[1] - R1 + 2);
      ctx.fillStyle = star; ctx.fillText(txt, p[0] + R1 + 4, p[1] - R1 + 2); ctx.lineWidth = Math.max(2, 1.2 * k);
    });
    // trayectoria prevista del asteroide
    var pts = F.ast.map(function (a) { return a ? toV(a.x, a.y) : null; });
    ctx.strokeStyle = amb; ctx.globalAlpha = .55; ctx.setLineDash([3, 6]); ctx.beginPath();
    pts.forEach(function (p, k) { if (!p) return; if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
    ctx.globalAlpha = 1; var pc = pts[S.cur];
    if (pc) {
      ctx.setLineDash([8 * k / 2 + 4, 6 * k / 2 + 3]); ctx.lineWidth = Math.max(3, 1.6 * k); ctx.beginPath(); ctx.arc(pc[0], pc[1], R2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      var txt2 = F.name + ' · ' + t('c.idPred'); ctx.lineWidth = Math.max(5, fs / 4); ctx.strokeStyle = light ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.8)';
      ctx.strokeText(txt2, pc[0] + R2 + 6, pc[1] + R2 + fs * 0.4); ctx.fillStyle = amb; ctx.fillText(txt2, pc[0] + R2 + 6, pc[1] + R2 + fs * 0.4);
    }
    ctx.restore();
  }

  /* ---------- Video MP4 para redes sociales ---------- */
  function hashtag(name) {
    var s0 = String(name || '').trim().replace(/^\(\d+\)\s*/, '');
    s0 = s0.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]/g, '');
    return s0 ? '#' + s0 : '';
  }
  function tags() { var h = hashtag($('ast-name').value); return '#asterfoto' + (h ? ' ' + h : ''); }
  function updateTags() { $('tags-out').textContent = t('c.tagsOut', { tags: tags() }); }
  function vstatus(s, err) { var e = $('vid-status'); e.textContent = s; e.classList.toggle('ue-err', !!err); }

  function renderVideoFrames(outW, outH) {
    // dibuja cada foto con la vista actual (modo, acercamiento) y le agrega la marca de agua
    var keep = { cur: S.cur, loupe: S.loupe, marking: S.marking, marks: S.marks };
    S.loupe = 1; S.marking = false; if (!$('vid-marks').checked) S.marks = [];
    var out = [], tg = tags(), N = S.frames.length, showTime = $('vid-time').checked;
    for (var k = 0; k < N; k++) {
      S.cur = k; draw();
      var c = document.createElement('canvas'); c.width = outW; c.height = outH;
      var x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
      x.drawImage($('view'), 0, 0, outW, outH);
      var u = outW / 1280, fs = Math.round(46 * u), pad = Math.round(28 * u);
      var grd = x.createLinearGradient(0, outH - fs * 3, 0, outH);
      grd.addColorStop(0, 'rgba(11,23,48,0)'); grd.addColorStop(1, 'rgba(11,23,48,.85)');
      x.fillStyle = grd; x.fillRect(0, outH - fs * 3, outW, fs * 3);
      x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
      x.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      x.strokeStyle = 'rgba(0,0,0,.75)'; x.lineWidth = Math.max(3, fs / 8);
      x.strokeText(tg, pad, outH - pad); x.fillStyle = '#ffb627'; x.fillText(tg, pad, outH - pad);
      var info = t('c.frame', { i: k + 1, n: N }) + (showTime && S.frames[k].time ? ' · ' + hms(S.frames[k].time) : '');
      var fs2 = Math.round(30 * u); x.font = '700 ' + fs2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      x.textAlign = 'right'; x.lineWidth = Math.max(3, fs2 / 8);
      x.strokeText(info, outW - pad, outH - pad); x.fillStyle = '#eef2fa'; x.fillText(info, outW - pad, outH - pad);
      x.textAlign = 'left';
      out.push(c);
    }
    S.cur = keep.cur; S.loupe = keep.loupe; S.marking = keep.marking; S.marks = keep.marks; draw();
    return out;
  }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function videoName(ext) {
    var h = hashtag($('ast-name').value).slice(1) || 'secuencia', d = S.frames[0].time || new Date();
    return 'asterfoto-' + h + '-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.' + ext;
  }
  function plan() {
    var fps = Math.max(0.5, Math.min(3, +$('speed').value || 2)), FPS = 30, per = Math.round(FPS / fps), N = S.frames.length;
    var loop = per * N, loops = Math.max(2, Math.ceil(8 * FPS / loop));
    while (loops > 2 && loop * loops > 15 * FPS) loops--;
    return { FPS: FPS, per: per, total: loop * loops, N: N };
  }
  async function exportMp4() {
    if (!S.frames.length) return;
    stop(); $('btn-video').disabled = true;
    try {
      var r = viewRect(), outW = Math.min(1280, Math.round(r.w * Math.max(1, S.z)));
      outW = Math.max(320, outW - outW % 2); var outH = Math.round(outW * r.h / r.w); outH -= outH % 2;
      vstatus(t('c.vidPrep'));
      await new Promise(function (res) { setTimeout(res, 20); });
      var frames = renderVideoFrames(outW, outH), pl = plan();
      if (window.VideoEncoder && window.Mp4Muxer) {
        var codecs = ['avc1.640028', 'avc1.4d0028', 'avc1.42001f'], cfg = null;
        for (var i = 0; i < codecs.length && !cfg; i++) {
          var c = { codec: codecs[i], width: outW, height: outH, bitrate: 6e6, framerate: pl.FPS, avc: { format: 'avc' } };
          try { var sup = await VideoEncoder.isConfigSupported(c); if (sup.supported) cfg = c; } catch (e) { /* siguiente */ }
        }
        if (cfg) { await encodeWebCodecs(frames, pl, cfg); $('btn-video').disabled = false; return; }
      }
      await encodeRecorder(frames, pl);
    } catch (e) {
      vstatus(t('c.vidFail'), true);
    }
    $('btn-video').disabled = false;
  }
  async function encodeWebCodecs(frames, pl, cfg) {
    var muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: cfg.width, height: cfg.height, frameRate: pl.FPS }, fastStart: 'in-memory' });
    var err = null;
    var enc = new VideoEncoder({ output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); }, error: function (e) { err = e; } });
    enc.configure(cfg);
    var us = 1e6 / pl.FPS;
    for (var i = 0; i < pl.total; i++) {
      if (err) throw err;
      var k = Math.floor(i / pl.per) % pl.N;
      var vf = new VideoFrame(frames[k], { timestamp: Math.round(i * us), duration: Math.round(us) });
      enc.encode(vf, { keyFrame: i % pl.FPS === 0 }); vf.close();
      if (i % 15 === 0) vstatus(t('c.vidEnc', { p: Math.round(100 * i / pl.total) }));
      while (enc.encodeQueueSize > 8) await new Promise(function (res) { setTimeout(res, 4); });
    }
    await enc.flush(); enc.close(); muxer.finalize();
    var blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    download(blob, videoName('mp4'));
    vstatus(t('c.vidDone', { s: nf(pl.total / pl.FPS, 0), mb: nf(blob.size / 1048576, 1) }));
  }
  function encodeRecorder(frames, pl) {
    return new Promise(function (resolve, reject) {
      if (!window.MediaRecorder) { vstatus(t('c.vidNo'), true); resolve(); return; }
      var c = document.createElement('canvas'); c.width = frames[0].width; c.height = frames[0].height;
      var x = c.getContext('2d'), stream = c.captureStream(pl.FPS);
      var types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'], mime = '';
      for (var i = 0; i < types.length; i++) if (MediaRecorder.isTypeSupported(types[i])) { mime = types[i]; break; }
      var rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined), parts = [];
      rec.ondataavailable = function (e) { if (e.data.size) parts.push(e.data); };
      rec.onstop = function () {
        var isMp4 = /mp4/.test(rec.mimeType || mime), blob = new Blob(parts, { type: rec.mimeType || mime || 'video/webm' });
        download(blob, videoName(isMp4 ? 'mp4' : 'webm'));
        vstatus(isMp4 ? t('c.vidDone', { s: nf(pl.total / pl.FPS, 0), mb: nf(blob.size / 1048576, 1) }) : t('c.vidWebm'));
        resolve();
      };
      rec.onerror = reject;
      var i = 0; x.drawImage(frames[0], 0, 0); rec.start();
      var timer = setInterval(function () {
        i++;
        if (i >= pl.total) { clearInterval(timer); rec.stop(); return; }
        x.drawImage(frames[Math.floor(i / pl.per) % pl.N], 0, 0);
        if (i % 15 === 0) vstatus(t('c.vidRec', { p: Math.round(100 * i / pl.total) }));
      }, 1000 / pl.FPS);
    });
  }

  function init() {
    P().onLang(function () {
      if (S.items.length) renderThumbs();
      if (S.logs.length) {
        // se rehace el informe en el nuevo idioma solo si ya se alineó
        S.logs = S.frames.map(function (f, j) {
          if (j === 0) return t('c.alignRef', { m: f.tr.n });
          return f.tr.n ? t('c.alignInfo', { i: j + 1, m: f.tr.n, rot: nf(Math.atan2(f.tr.s, f.tr.c) * 180 / Math.PI, 2), dx: nf(f.tr.tx / S.scale, 0), dy: nf(f.tr.ty / S.scale, 0) }) : t('c.alignFail', { i: j + 1 });
        });
        renderLog();
        if (S.normDone) { S.normList = S.frames.slice(1).map(function (f, j) { return t('c.normItem', { i: j + 2, f: nf(f.normFac, 2) }); }); if (S.normalize) addNormLog(); }
      }
      $('play-txt').textContent = t(S.timer ? 'c.pause' : 'c.play');
      $('mark-txt').textContent = t(S.marking ? 'c.markOff' : 'c.markOn');
      $('stretch-out').textContent = String(S.stretch);
      updateTags(); renderTimes();
      if (S.frames.length) { draw(); renderMarks(); }
    });
    var qs = new URLSearchParams(location.search), qp = qs.get('ast'); if (qp) $('ast-name').value = qp.slice(0, 60);
    var sv = {}; try { sv = JSON.parse(localStorage.getItem('asterfoto.ident')) || {}; } catch (e) { sv = {}; }
    var pl = {}; try { pl = JSON.parse(localStorage.getItem('asterfoto.state')) || {}; } catch (e) { pl = {}; }
    $('id-lat').value = qs.get('lat') || sv.lat || pl.lat || '';
    $('id-lon').value = qs.get('lon') || sv.lon || pl.lon || '';
    $('id-f').value = qs.get('f') || sv.f || (pl.gear && pl.gear.f) || '';
    $('id-pix').value = qs.get('pix') || sv.pix || (pl.gear && pl.gear.pix) || '';
    if (qs.get('f') || !sv.scale) updScale(); else $('id-scale').value = sv.scale;
    ['id-f', 'id-pix'].forEach(function (id) { $(id).addEventListener('input', updScale); });
    $('btn-ident').addEventListener('click', identify);
    $('show-labels').addEventListener('change', draw);
    $('ast-name').addEventListener('input', updateTags); updateTags();
    $('btn-video').addEventListener('click', exportMp4);
    $('files').addEventListener('change', function () { if (this.files && this.files.length) loadFiles(this.files); });
    $('btn-demo').addEventListener('click', demo);
    $('btn-align').addEventListener('click', align);
    $('btn-prev').addEventListener('click', function () { stop(); go(S.cur - 1); });
    $('btn-next').addEventListener('click', function () { stop(); go(S.cur + 1); });
    $('btn-play').addEventListener('click', function () { if (S.timer) stop(); else play(); });
    $('speed').addEventListener('change', function () { if (S.timer) { stop(); play(); } });
    document.querySelectorAll('input[name="vmode"]').forEach(function (r) { r.addEventListener('change', function () { S.mode = this.value; draw(); }); });
    $('norm').addEventListener('change', function () {
      S.normalize = this.checked; S.cache = {}; S.lutRef = null;
      if (S.frames.length) { setStatus(t('c.reading')); setTimeout(function () { draw(); renderLog(); if (S.normalize) addNormLog(); setStatus(''); }, 20); }
    });
    $('stretch').addEventListener('change', function () { S.stretch = +this.value; $('stretch-out').textContent = this.value; S.cache = {}; S.lutRef = null; draw(); });
    $('stretch').addEventListener('input', function () { $('stretch-out').textContent = this.value; });
    $('stretch-out').textContent = $('stretch').value;
    document.querySelectorAll('input[name="loupe"]').forEach(function (r) { r.addEventListener('change', function () {
      S.loupe = +this.value;
      if (S.loupe > 1 && !S.lp) { var rr = viewRect(); S.lp = { x: rr.x + rr.w / 2, y: rr.y + rr.h / 2 }; }
      $('view').classList.toggle('loupe', S.loupe > 1); draw();
    }); });
    $('z-in').addEventListener('click', function () { zoom(S.z * 2); });
    $('z-out').addEventListener('click', function () { zoom(S.z / 2); });
    $('z-reset').addEventListener('click', function () { S.cx = 0.5; S.cy = 0.5; zoom(1); });
    $('btn-mark').addEventListener('click', function () {
      S.marking = !S.marking; this.setAttribute('aria-pressed', String(S.marking));
      $('mark-txt').textContent = t(S.marking ? 'c.markOff' : 'c.markOn');
      if (S.marking && !S.cross) { var r = viewRect(); S.cross = { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
      $('view').classList.toggle('marking', S.marking); draw();
    });
    $('btn-clear').addEventListener('click', function () { S.marks = []; renderMarks(); draw(); });
    // arrastrar para mover; tocar para marcar
    var v = $('view'), drag = null;
    v.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, cx: S.cx, cy: S.cy, moved: false }; v.setPointerCapture(e.pointerId); });
    v.addEventListener('pointermove', function (e) {
      if (S.loupe > 1 && (e.pointerType === 'mouse' || drag)) { S.lp = toImage(e); if (!S.timer) draw(); else draw(); if (drag) drag.moved = true; return; }
      if (!drag) return;
      var b = v.getBoundingClientRect(), dx = (e.clientX - drag.x) / b.width / S.z, dy = (e.clientY - drag.y) / b.height / S.z;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 6) drag.moved = true;
      if (drag.moved && S.z > 1) { S.cx = Math.max(0, Math.min(1, drag.cx - dx)); S.cy = Math.max(0, Math.min(1, drag.cy - dy)); draw(); }
    });
    v.addEventListener('pointerup', function (e) {
      if (drag && S.marking && (!drag.moved || S.loupe > 1)) { var p = toImage(e); if (S.loupe > 1 && drag.moved) p = null; if (p) { S.cross = p; mark(p.x, p.y); } }
      drag = null;
    });
    v.addEventListener('keydown', function (e) {
      var step = (e.shiftKey ? 40 : 8) / S.z, used = true;
      if (e.key === ' ' || e.key === 'Spacebar') { if (S.timer) stop(); else play(); }
      else if (e.key === '+' || e.key === '=') zoom(S.z * 2);
      else if (e.key === '-' || e.key === '_') zoom(S.z / 2);
      else if (e.key === 'PageDown' || e.key === '.') { stop(); go(S.cur + 1); }
      else if (e.key === 'PageUp' || e.key === ',') { stop(); go(S.cur - 1); }
      else if (/^Arrow/.test(e.key)) {
        var ddx = e.key === 'ArrowLeft' ? -1 : (e.key === 'ArrowRight' ? 1 : 0), ddy = e.key === 'ArrowUp' ? -1 : (e.key === 'ArrowDown' ? 1 : 0);
        if (S.loupe > 1 && !S.marking) { S.lp.x = Math.max(0, Math.min(S.W, S.lp.x + ddx * step)); S.lp.y = Math.max(0, Math.min(S.H, S.lp.y + ddy * step)); draw(); }
        else if (S.marking) { S.cross.x = Math.max(0, Math.min(S.W, S.cross.x + ddx * step)); S.cross.y = Math.max(0, Math.min(S.H, S.cross.y + ddy * step)); var r = viewRect(); if (S.cross.x < r.x || S.cross.x > r.x + r.w || S.cross.y < r.y || S.cross.y > r.y + r.h) { S.cx = S.cross.x / S.W; S.cy = S.cross.y / S.H; } draw(); }
        else if (S.z > 1) { S.cx = Math.max(0, Math.min(1, S.cx + ddx * 0.05 / S.z)); S.cy = Math.max(0, Math.min(1, S.cy + ddy * 0.05 / S.z)); draw(); }
        else used = false;
      }
      else if (e.key === 'Enter' && S.marking && S.cross) mark(S.cross.x, S.cross.y);
      else used = false;
      if (used) e.preventDefault();
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
