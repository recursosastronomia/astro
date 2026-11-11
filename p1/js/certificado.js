/* Certificado en PDF de "Astronomía para todos" y herramientas PDF comunes (AstroPDF).
   Se genera en el navegador, sin bibliotecas externas ni conexión: el nombre nunca sale del dispositivo.
   Uso: AstroCertificado.descargar({ nombre, titulo, ideas, estrellas, total, fecha, url, archivo })
   Fuentes estándar del PDF (Helvetica) con codificación WinAnsi: cubre el español y los acentos. */
(() => {
  const ANCHOS = { F1: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,0,556,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,222,222,333,333,350,556,1000,0,0,0,0,0,0,0,0,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500], F2: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,0,556,0,0,0,0,1000,0,0,0,0,0,0,0,0,0,0,0,278,278,500,500,350,556,1000,0,0,0,0,0,0,0,0,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556] };
  const WIN = { 0x20AC: 0x80, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97 };
  const codigos = s => [...String(s).normalize('NFC')].map(ch => {
    const c = ch.codePointAt(0);
    if ((c >= 32 && c < 127) || (c >= 160 && c < 256)) return c;
    return WIN[c] || 63; // «?» para lo que la fuente estándar no tiene
  });
  const ancho = (s, f, t) => codigos(s).reduce((a, c) => a + (ANCHOS[f][c - 32] || 556), 0) * t / 1000;
  const lit = s => '(' + codigos(s).map(c => c === 40 || c === 41 || c === 92 ? '\\' + String.fromCharCode(c)
    : c > 126 ? '\\' + c.toString(8).padStart(3, '0') : String.fromCharCode(c)).join('') + ')';
  const n = x => (Math.round(x * 100) / 100).toString();
  const rgb = h => [1, 3, 5].map(i => n(parseInt(h.slice(i, i + 2), 16) / 255)).join(' ');

  // Página A4 apaisada (842 × 595 pt)
  const PW = 842, PH = 595;
  const TINTA = '#0b1730', TINTA2 = '#14264b', AMBAR = '#ffb627', GRIS = '#3b4a66', LINEA = '#cbd2de';

  function texto(ops, s, f, t, x, y, color, alinear) {
    const w = ancho(s, f, t);
    const xx = alinear === 'centro' ? x - w / 2 : alinear === 'derecha' ? x - w : x;
    ops.push(`BT /${f} ${n(t)} Tf ${rgb(color)} rg ${n(xx)} ${n(y)} Td ${lit(s)} Tj ET`);
  }
  // Ajusta el tamaño para que el texto quepa en el ancho dado
  const ajustar = (s, f, t, max, min) => { while (t > min && ancho(s, f, t) > max) t -= 0.5; return t; };
  // Parte un texto en renglones que quepan en el ancho
  function renglones(s, f, t, max) {
    const out = []; let r = '';
    for (const p of String(s).split(/\s+/)) {
      const prueba = r ? r + ' ' + p : p;
      if (ancho(prueba, f, t) > max && r) { out.push(r); r = p; } else r = prueba;
    }
    if (r) out.push(r);
    return out;
  }
  function estrella(ops, cx, cy, R, llena) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.45 : R;
      pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
    }
    const d = pts.map((p, i) => `${n(p[0])} ${n(p[1])} ${i ? 'l' : 'm'}`).join(' ') + ' h';
    ops.push(llena ? `${rgb(AMBAR)} rg ${rgb('#f0a00a')} RG 1 w ${d} B` : `${rgb('#8f9bb3')} RG 1.4 w ${d} S`);
  }

  function contenido(d) {
    const o = [];
    // Fondo y marcos
    o.push(`${rgb('#ffffff')} rg 0 0 ${PW} ${PH} re f`);
    o.push(`${rgb(TINTA)} rg 0 ${PH - 150} ${PW} 150 re f`);
    o.push(`${rgb(AMBAR)} rg 0 ${PH - 154} ${PW} 4 re f`);
    o.push(`${rgb(AMBAR)} RG 2 w 18 18 ${PW - 36} ${PH - 36} re S`);
    o.push(`${rgb(LINEA)} RG 0.75 w 26 26 ${PW - 52} ${PH - 52} re S`);
    // Cielo de la banda: puntos de estrellas fijos
    const cielo = [[60, 560, 1.2], [118, 520, 0.8], [190, 548, 1], [700, 556, 1.3], [760, 515, 0.8], [800, 548, 1], [640, 528, 0.7], [250, 515, 0.7], [560, 562, 0.9], [330, 560, 0.6]];
    o.push(`${rgb('#eef2fa')} rg`);
    cielo.forEach(([x, y, r]) => o.push(`${n(x - r)} ${n(y - r)} ${n(2 * r)} ${n(2 * r)} re f`));
    texto(o, 'ASTRONOMÍA PARA TODOS · DGES · EDyTIC', 'F2', 11, PW / 2, PH - 58, AMBAR, 'centro');
    texto(o, 'Certificado de logro', 'F2', 34, PW / 2, PH - 102, '#ffffff', 'centro');
    texto(o, 'Grandes ideas de la astronomía', 'F1', 14, PW / 2, PH - 128, '#b4c0d9', 'centro');

    // Cuerpo
    let y = PH - 200;
    texto(o, 'Se otorga a', 'F1', 15, PW / 2, y, GRIS, 'centro');
    y -= 46;
    const tn = ajustar(d.nombre, 'F2', 36, 680, 16);
    texto(o, d.nombre, 'F2', tn, PW / 2, y, TINTA2, 'centro');
    o.push(`${rgb(AMBAR)} RG 1.5 w ${n(PW / 2 - 220)} ${n(y - 14)} m ${n(PW / 2 + 220)} ${n(y - 14)} l S`);
    y -= 44;
    texto(o, 'por completar la trivia de la guía', 'F1', 15, PW / 2, y, GRIS, 'centro');
    y -= 28;
    const tt = 19;
    for (const r of renglones('«' + d.titulo + '»', 'F2', tt, 680).slice(0, 2)) { texto(o, r, 'F2', tt, PW / 2, y, TINTA2, 'centro'); y -= 25; }
    if (d.ideas) { texto(o, d.ideas, 'F1', 12.5, PW / 2, y, GRIS, 'centro'); y -= 22; }

    // Estrellas obtenidas
    const total = Math.max(1, d.total | 0), tiene = Math.max(0, Math.min(total, d.estrellas | 0));
    const paso = 34, x0 = PW / 2 - (total - 1) * paso / 2;
    y -= 22;
    for (let i = 0; i < total; i++) estrella(o, x0 + i * paso, y, 13, i < tiene);
    y -= 36;
    texto(o, `Estrellas obtenidas: ${tiene} de ${total}`, 'F2', 14, PW / 2, y, TINTA2, 'centro');

    // Pie
    texto(o, `Fecha de emisión: ${d.fecha}`, 'F1', 11.5, 52, 48, GRIS);
    // Datos de control para el docente
    const k = d.control;
    if (k) {
      texto(o, `Código del navegador: ${k.id}`, 'F2', 10, 52, 64, TINTA2);
      const avisos = [];
      if (k.nombres && k.nombres.length > 1) avisos.push(`En este navegador se emitieron documentos a nombre de: ${k.nombres.join(', ')}.`);
      if (k.borrados) avisos.push(`El progreso se borró ${k.borrados} ${k.borrados === 1 ? 'vez' : 'veces'} en este navegador.`);
      if (k.integro === false) avisos.push('Registro modificado fuera del portal.');
      if (avisos.length) {
        let yy = 112;
        for (const r of renglones('Atención docente: ' + avisos.join(' '), 'F2', 9.5, 700).slice(0, 3)) { texto(o, r, 'F2', 9.5, PW / 2, yy, '#b3261e', 'centro'); yy -= 12; }
      }
    }
    texto(o, 'Portal Uruguay Educa · ANEP · DGES · EDyTIC', 'F1', 11.5, PW - 52, 48, GRIS, 'derecha');
    if (d.url) texto(o, d.url.length > 110 ? d.url.slice(0, 107) + '...' : d.url, 'F1', 8.5, PW / 2, 34, '#5b6f99', 'centro');
    return o.join('\n');
  }

  // Arma un PDF con una o más páginas (cada página es una lista de operaciones de dibujo)
  function documento(paginas, info) {
    const W = info.ancho || PW, H = info.alto || PH;
    const n0 = 5; // 1 catálogo, 2 páginas, 3 y 4 fuentes, 5 info; después, página + contenido
    const obj = [
      '<< /Type /Catalog /Pages 2 0 R /Lang (es-UY) /ViewerPreferences << /DisplayDocTitle true >> >>',
      `<< /Type /Pages /Kids [${paginas.map((_, i) => `${n0 + 1 + i * 2} 0 R`).join(' ')}] /Count ${paginas.length} >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      `<< /Title ${lit(info.titulo || '')} /Author ${lit(info.autor || '')} /Subject ${lit(info.asunto || '')} /Creator (Astronomia para todos) >>`
    ];
    paginas.forEach((ops, i) => {
      const stream = Array.isArray(ops) ? ops.join('\n') : ops;
      obj.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${n0 + 2 + i * 2} 0 R >>`);
      obj.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    });
    let s = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const off = [];
    obj.forEach((o, i) => { off.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const x = s.length;
    s += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n` + off.map(v => String(v).padStart(10, '0') + ' 00000 n \n').join('');
    s += `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${x}\n%%EOF`;
    // Todo el archivo es ASCII salvo la línea binaria de cabecera: se escribe byte a byte
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 255;
    return new Blob([bytes], { type: 'application/pdf' });
  }

  function pdf(d) {
    return documento([contenido(d)], { titulo: 'Certificado: ' + d.titulo, autor: d.nombre, asunto: 'Astronomía para todos · Grandes ideas de la astronomía' });
  }

  function bajar(blob, archivo) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: archivo });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  const descargar = d => bajar(pdf(d), d.archivo || 'certificado.pdf');

  window.AstroCertificado = { descargar, pdf };
  // Herramientas comunes para otros PDF del portal (por ejemplo, el resumen del medallero)
  window.AstroPDF = { documento, bajar, texto, ancho, renglones, ajustar, estrella, rgb, n, lit };
})();
