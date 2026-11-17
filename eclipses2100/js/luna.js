/* Sombras sonoras — imagen realista de la Luna
   Toma el mapa de color de la Luna del LRO (NASA/GSFC/Arizona State University, CGI Moon Kit; recorte de la cara
   visible, longitudes −110° a +110°) y lo proyecta sobre una esfera vista desde el lugar elegido, con la
   orientación que da EclipseList.moonFrame: libración, eje lunar y giro del campo visual. «Arriba» es siempre
   el cenit del observador, como se ve la Luna a simple vista, en cualquier latitud y hemisferio.

   MoonImage.load(cb)            carga el mapa una sola vez (cb recibe true si se pudo)
   MoonImage.render(frame, n)    devuelve un canvas n×n con el disco lunar (fuera del disco repite el borde) */
var MoonImage = (function () {
  'use strict';
  var URL_MAP = 'img/luna/luna-lroc-cercana.jpg';
  var LON0 = 796 * 360 / 4096 - 180, SPAN = 2504 * 360 / 4096;   // el recorte del mapa de 4096 × 2048 px
  var DEG = 180 / Math.PI;
  var tex = null, state = 'idle', waiters = [];

  function load(cb) {
    if (state === 'ok') { cb(true); return; }
    if (state === 'error') { cb(false); return; }
    waiters.push(cb);
    if (state === 'loading') return;
    state = 'loading';
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        var g = c.getContext('2d'); g.drawImage(img, 0, 0);
        tex = { w: c.width, h: c.height, px: g.getImageData(0, 0, c.width, c.height).data };
        state = 'ok';
      } catch (e) { state = 'error'; }
      done();
    };
    img.onerror = function () { state = 'error'; done(); };
    img.src = URL_MAP;
  }
  function done() { var w = waiters; waiters = []; w.forEach(function (f) { f(state === 'ok'); }); }

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  function render(f, n, canvas) {
    var c = canvas || document.createElement('canvas'); c.width = c.height = n;
    var g = c.getContext('2d'), out = g.createImageData(n, n), o = out.data;
    var W = tex.w, H = tex.h, src = tex.px, kx = W / SPAN, ky = H / 180;
    // Matriz pantalla → cuerpo lunar: columnas R (derecha), U (arriba), −d (hacia el observador)
    var a0 = dot(f.R, f.xb), a1 = dot(f.U, f.xb), a2 = -dot(f.d, f.xb);
    var b0 = dot(f.R, f.yb), b1 = dot(f.U, f.yb), b2 = -dot(f.d, f.yb);
    var c0 = dot(f.R, f.zb), c1 = dot(f.U, f.zb), c2 = -dot(f.d, f.zb);
    var h = n / 2, i = 0;
    for (var py = 0; py < n; py++) {
      var y = (h - py - 0.5) / h;
      for (var px = 0; px < n; px++, i += 4) {
        var x = (px + 0.5 - h) / h, r2 = x * x + y * y, xx = x, yy = y, z = 0;
        if (r2 >= 1) { var k = 0.9999 / Math.sqrt(r2); xx = x * k; yy = y * k; } else z = Math.sqrt(1 - r2);
        var bx = a0 * xx + a1 * yy + a2 * z, by = b0 * xx + b1 * yy + b2 * z, bz = c0 * xx + c1 * yy + c2 * z;
        var lat = Math.asin(Math.max(-1, Math.min(1, bz))) * DEG, lon = Math.atan2(by, bx) * DEG;
        var u = (lon - LON0) * kx - 0.5, v = (90 - lat) * ky - 0.5;
        if (u < 0) u = 0; else if (u > W - 1.001) u = W - 1.001;
        if (v < 0) v = 0; else if (v > H - 1.001) v = H - 1.001;
        var x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0;
        var p00 = (y0 * W + x0) * 4, p01 = p00 + 4, p10 = p00 + W * 4, p11 = p10 + 4;
        var w00 = (1 - fx) * (1 - fy), w01 = fx * (1 - fy), w10 = (1 - fx) * fy, w11 = fx * fy;
        // Luna llena: casi sin oscurecimiento hacia el borde
        var lum = 0.9 + 0.1 * Math.sqrt(z);
        o[i] = (src[p00] * w00 + src[p01] * w01 + src[p10] * w10 + src[p11] * w11) * lum;
        o[i + 1] = (src[p00 + 1] * w00 + src[p01 + 1] * w01 + src[p10 + 1] * w10 + src[p11 + 1] * w11) * lum;
        o[i + 2] = (src[p00 + 2] * w00 + src[p01 + 2] * w01 + src[p10 + 2] * w10 + src[p11 + 2] * w11) * lum;
        o[i + 3] = 255;
      }
    }
    g.putImageData(out, 0, 0);
    return c;
  }

  return { load: load, render: render, ready: function () { return state === 'ok'; } };
})();
