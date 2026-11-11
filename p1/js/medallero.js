/* Página del medallero: muestra medallas, logros y rango a partir de lo guardado en este navegador,
   y genera el resumen en PDF para el docente (con fecha de emisión). Necesita js/lectura.js,
   js/medallas.js y js/certificado.js (AstroPDF). */
(() => {
  const M = window.AstroMedallas, R = window.AstroRegistro;
  if (!M || !R) return;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const raiz = window.ASTRO_RAIZ || '';
  const fechaCorta = iso => iso ? new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const ico = id => `<svg class="ico" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

  function pintar() {
    const e = M.estado();
    const total = e.guias.length;
    // Rango
    const hacia = e.siguiente ? Math.round((e.estrellas - e.rango.min) / (e.siguiente.min - e.rango.min) * 100) : 100;
    $('#rango').innerHTML = `
      <p class="m-rango-k">Tu rango</p>
      <p class="m-rango-t">${esc(e.rango.nombre)}</p>
      <p>${esc(e.rango.texto)}</p>
      <div class="m-barra" role="progressbar" aria-label="Avance hacia el próximo rango" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${hacia}"><i style="--v:${hacia}%"></i></div>
      <p>${e.siguiente ? `Llevas <b>${e.estrellas}</b> estrellas. Te faltan <b>${e.siguiente.min - e.estrellas}</b> para el rango <b>${esc(e.siguiente.nombre)}</b>.` : `Llevas <b>${e.estrellas}</b> estrellas: ¡alcanzaste el rango máximo!`}</p>`;
    // Resumen
    const pct = Math.round(e.conMedalla / total * 100);
    $('#resumen-datos').innerHTML = `
      <ul class="m-podio" aria-label="Medallas por tipo">
        ${M.NIVELES.map(n => `<li>${M.svgMedalla(n, 44)}<span><b>${e[n.id]}</b> de ${n.nombre.toLowerCase()}</span></li>`).join('')}
      </ul>
      <ul class="l-cifras" aria-label="Tu progreso">
        <li><strong>${e.conMedalla}/${total}</strong><span>trivias con medalla</span></li>
        <li><strong>${e.estrellas}</strong><span>estrellas de ${e.posibles} posibles</span></li>
        <li><strong>${e.logros.filter(l => l.ok).length}/${e.logros.length}</strong><span>logros desbloqueados</span></li>
      </ul>
      <p id="m-col-t">Colección completada: ${pct} %</p>
      <div class="m-barra m-barra-sec" role="progressbar" aria-labelledby="m-col-t" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="--v:${pct}%"></i></div>
      ${e.jugadas ? '' : '<p class="l-nota" style="margin-top:1.25rem">Todavía no hay trivias registradas en este navegador. ¡Elige una guía, léela y juega su trivia para ganar tu primera medalla!</p>'}`;
    // Próxima misión
    $('#mision-datos').innerHTML = e.mision ? `
      <div class="m-mision">${ico('i-brujula')}<div><h3>Tu próxima misión</h3><p>${esc(e.mision.texto)}</p><a href="${raiz}${e.mision.guia.archivo}#quiz">Ir a la guía «${esc(e.mision.guia.titulo)}»</a></div></div>`
      : `<div class="m-mision">${ico('i-estrella')}<div><h3>¡Misión cumplida!</h3><p>Tienes medalla de oro en todas las trivias del portal. Eres parte del Supercúmulo de Astronomía para todos.</p></div></div>`;
    // Logros
    $('#logros-lista').innerHTML = e.logros.map(l => `
      <li class="m-logro${l.ok ? ' ok' : ''}"><span class="m-logro-ico">${ico(l.ok ? 'i-estrella' : 'i-candado')}</span>
        <div><h3>${esc(l.nombre)}</h3><p>${esc(l.texto)}</p><span class="m-logro-estado">${l.ok ? 'Desbloqueado' : 'Bloqueado'}</span></div></li>`).join('');
    // Colección por grupo
    $('#coleccion-lista').innerHTML = M.GRUPOS.map(gr => {
      const gs = e.guias.filter(g => g.grupo === gr.id);
      const con = gs.filter(g => g.medalla).length;
      return `<section class="m-grupo" aria-labelledby="g-${gr.id}">
        <div class="m-grupo-cab"><h3 id="g-${gr.id}">${esc(gr.titulo)}</h3><span>${con} de ${plural(gs.length, 'guía', 'guías')} con medalla</span></div>
        <ul class="m-lista">${gs.map(g => {
          const etiqueta = g.medalla ? `Medalla de ${g.medalla.nombre.toLowerCase()}` : (g.jugada ? 'Todavía sin medalla' : 'Sin jugar');
          const det = g.jugada ? `${etiqueta} · ${plural(g.intentos, 'intento', 'intentos')} · último: ${fechaCorta(g.fecha)}` : 'Sin jugar todavía';
          return `<li class="m-item">${M.svgMedalla(g.medalla, 56, etiqueta)}
            <span><a href="${raiz}${g.archivo}#quiz"><span class="m-item-t">${esc(g.titulo)}</span></a><span class="m-item-d">${g.tramo ? 'Grandes ideas ' + esc(g.tramo) + ' · ' : ''}${det}</span></span>
            <span class="m-item-est" aria-label="${g.mejor} de ${g.total} estrellas">${g.jugada ? `${g.mejor}/${g.total} ★` : '—'}</span></li>`;
        }).join('')}</ul></section>`;
    }).join('');
  }

  /* ---------- Resumen en PDF para el docente (A4 vertical) ---------- */
  function resumenPDF({ nombre, grupo, docente, fecha }) {
    const P = window.AstroPDF;
    const e = M.estado();
    const k = R.control();
    const W = 595, H = 842, X0 = 40, X1 = W - 40;
    const TINTA = '#0b1730', T2 = '#14264b', GRIS = '#3b4a66', CLARO = '#5b6f99', LINEA = '#cbd2de', AMBAR = '#ffb627';
    const paginas = [];
    let o, y;
    const circulo = (cx, cy, r, color, borde) => {
      const k = 0.5523 * r, n = P.n;
      o.push(`${P.rgb(color)} rg ${P.rgb(borde || color)} RG 0.8 w ${n(cx + r)} ${n(cy)} m ${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c ${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)} c ${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c ${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)} c B`);
    };
    const corta = (s, f, t, max) => { if (P.ancho(s, f, t) <= max) return s; while (s.length > 1 && P.ancho(s + '…', f, t) > max) s = s.slice(0, -1); return s.trimEnd() + '…'; };
    const nuevaPagina = () => {
      o = []; paginas.push(o);
      o.push(`${P.rgb('#ffffff')} rg 0 0 ${W} ${H} re f`);
      if (paginas.length === 1) {
        o.push(`${P.rgb(TINTA)} rg 0 ${H - 112} ${W} 112 re f`, `${P.rgb(AMBAR)} rg 0 ${H - 115} ${W} 3 re f`);
        P.texto(o, 'ASTRONOMÍA PARA TODOS · DGES · EDyTIC', 'F2', 9.5, X0, H - 40, AMBAR);
        P.texto(o, 'Resumen del medallero', 'F2', 25, X0, H - 72, '#ffffff');
        P.texto(o, 'Trivias de las guías de lectura · informe para el docente', 'F1', 11, X0, H - 94, '#b4c0d9');
        y = H - 145;
      } else {
        P.texto(o, `Resumen del medallero · ${nombre} (continuación)`, 'F2', 11, X0, H - 50, T2);
        y = H - 75;
      }
    };
    const fila = (cols, f, t, color) => cols.forEach(([s, x, al]) => P.texto(o, s, f, t, x, y, color, al));
    nuevaPagina();
    // Datos del estudiante
    const dato = (et, v, x, yy) => { P.texto(o, et, 'F2', 10, x, yy, GRIS); if (v !== '') P.texto(o, corta(v || '—', 'F1', 10.5, 165), 'F1', 10.5, x + 95, yy, T2); };
    dato('Estudiante:', nombre, X0, y); dato('Fecha de emisión:', fecha, 310, y);
    y -= 18; dato('Grupo / clase:', grupo || '—', X0, y); dato('Docente:', docente || '—', 310, y);
    y -= 18; dato('Código del navegador:', '', X0, y); P.texto(o, k.id, 'F2', 11, X0 + 120, y, T2);
    // Avisos de control para el docente
    const avisos = [];
    if (k.nombres.length > 1) avisos.push(`En este navegador se emitieron documentos a nombre de ${k.nombres.length} personas: ${k.nombres.join(', ')}.`);
    if (k.borrados) avisos.push(`El progreso se borró ${k.borrados} ${k.borrados === 1 ? 'vez' : 'veces'} en este navegador.`);
    if (!k.integro) avisos.push('Registro modificado fuera del portal: los resultados guardados se editaron a mano.');
    if (avisos.length) {
      const lineas = P.renglones('Atención docente: ' + avisos.join(' '), 'F2', 9, X1 - X0 - 20);
      const alto = lineas.length * 12 + 12;
      y -= 10;
      o.push(`${P.rgb('#fbe6e4')} rg ${P.rgb('#b3261e')} RG 0.8 w ${P.n(X0)} ${P.n(y - alto + 8)} ${P.n(X1 - X0)} ${P.n(alto)} re B`);
      for (const r of lineas) { P.texto(o, r, 'F2', 9, X0 + 10, y - 4, '#b3261e'); y -= 12; }
      y -= 8;
    }
    // Cifras
    y -= 26;
    if (!avisos.length) y += 4;
    const cajas = [['Rango', e.rango.nombre], ['Estrellas', `${e.estrellas} de ${e.posibles}`], ['Trivias con medalla', `${e.conMedalla} de ${e.guias.length}`], ['Oro · Plata · Bronce', `${e.oro} · ${e.plata} · ${e.bronce}`]];
    const cw = (X1 - X0 - 18) / 4;
    cajas.forEach(([k, v], i) => {
      const x = X0 + i * (cw + 6);
      o.push(`${P.rgb('#f1f3f6')} rg ${P.rgb(LINEA)} RG 0.75 w ${P.n(x)} ${P.n(y - 40)} ${P.n(cw)} 44 re B`);
      P.texto(o, k, 'F1', 8.5, x + 8, y - 10, GRIS);
      P.texto(o, v, 'F2', P.ajustar(v, 'F2', 13, cw - 14, 8), x + 8, y - 29, T2);
    });
    y -= 64;
    // Tabla de trivias
    const C = { guia: X0 + 4, tramo: 282, est: 352, med: 384, int: 462, fec: X1 - 4 };
    const cabecera = () => {
      o.push(`${P.rgb('#e1e6ee')} rg ${P.n(X0)} ${P.n(y - 5)} ${P.n(X1 - X0)} 18 re f`);
      fila([['Guía', C.guia], ['Tramo', C.tramo], ['Estrellas', C.est, 'centro'], ['Medalla', C.med], ['Intentos', C.int, 'centro'], ['Último intento', C.fec, 'derecha']], 'F2', 8.5, T2);
      y -= 18;
    };
    cabecera();
    let grupoPrev = null;
    for (const g of e.guias) {
      if (y < 100) { nuevaPagina(); cabecera(); }
      if (g.grupo !== grupoPrev && (g.grupo === 'temas' || grupoPrev === null)) {
        P.texto(o, g.grupo === 'temas' ? 'Guías temáticas' : 'Grandes ideas de la astronomía', 'F2', 9, X0, y, CLARO);
        y -= 13;
      }
      grupoPrev = g.grupo;
      const color = g.jugada ? T2 : CLARO;
      fila([[corta(g.titulo, 'F1', 8.5, C.tramo - C.guia - 8), C.guia], [g.tramo || '—', C.tramo], [g.jugada ? `${g.mejor}/${g.total}` : '—', C.est, 'centro'],
            [g.medalla ? g.medalla.nombre : (g.jugada ? 'Sin medalla' : 'Sin jugar'), C.med + 12], [g.jugada ? String(g.intentos) : '—', C.int, 'centro'], [g.jugada ? fechaCorta(g.fecha) : '—', C.fec, 'derecha']], 'F1', 8.5, color);
      if (g.medalla) circulo(C.med + 4, y + 3, 4, g.medalla.color, '#0b1730');
      o.push(`${P.rgb(LINEA)} RG 0.4 w ${P.n(X0)} ${P.n(y - 5)} m ${P.n(X1)} ${P.n(y - 5)} l S`);
      y -= 13;
    }
    // Logros
    const logros = e.logros.filter(l => l.ok).map(l => l.nombre);
    if (y < 110) nuevaPagina();
    y -= 14;
    P.texto(o, `Logros desbloqueados (${logros.length} de ${e.logros.length})`, 'F2', 10.5, X0, y, T2);
    y -= 15;
    for (const r of P.renglones(logros.length ? logros.join(' · ') : 'Todavía ninguno.', 'F1', 9.5, X1 - X0)) { P.texto(o, r, 'F1', 9.5, X0, y, GRIS); y -= 13; }
    y -= 6;
    P.texto(o, 'Medallas: oro = todas las respuestas correctas; plata = 80 % o más; bronce = 50 % o más (se toma el mejor intento).', 'F1', 8.5, X0, y, CLARO);
    // Pie de cada página
    paginas.forEach((pg, i) => {
      o = pg;
      o.push(`${P.rgb(LINEA)} RG 0.5 w ${X0} 58 m ${X1} 58 l S`);
      P.texto(o, `Fecha de emisión: ${fecha} · Código del navegador: ${k.id}`, 'F2', 7.5, X0, 46, GRIS);
      P.texto(o, 'Generado en el dispositivo del estudiante con el progreso guardado en su navegador.', 'F1', 7.5, X0, 36, CLARO);
      P.texto(o, 'Portal Uruguay Educa · ANEP · DGES · EDyTIC', 'F1', 7.5, X0, 26, CLARO);
      P.texto(o, `Página ${i + 1} de ${paginas.length}`, 'F1', 7.5, X1, 26, CLARO, 'derecha');
    });
    return P.documento(paginas, { ancho: W, alto: H, titulo: `Resumen del medallero: ${nombre}`, autor: nombre, asunto: 'Astronomía para todos · Medallero' });
  }

  // Formulario del informe
  const form = $('#informe-form');
  const nombre = $('#inf-nombre'), grupo = $('#inf-grupo'), docente = $('#inf-docente'), msg = $('#inf-msg');
  let previos = {};
  try { previos = JSON.parse(localStorage.getItem('astro-informe')) || {}; } catch (e) {}
  document.querySelectorAll('.m-id').forEach(el => { el.textContent = R.dispositivo(); });
  nombre.value = R.nombre(); grupo.value = previos.grupo || ''; docente.value = previos.docente || '';
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const n = nombre.value.replace(/\s+/g, ' ').trim();
    if (n.length < 2) {
      nombre.setAttribute('aria-invalid', 'true'); msg.dataset.error = 'true';
      msg.textContent = 'Escribe tu nombre (al menos 2 letras) para crear el resumen.'; nombre.focus(); return;
    }
    nombre.removeAttribute('aria-invalid'); msg.dataset.error = 'false';
    if (R.nombreNuevo(n) && form.dataset.confirmar !== n) {
      form.dataset.confirmar = n; msg.dataset.error = 'true';
      msg.textContent = `En este navegador ya se emitieron documentos a nombre de ${R.nombresUsados().map(x => x.nombre).join(', ')}. Cada estudiante debe usar su propio navegador: si continúas, tu docente verá todos los nombres en el resumen. Para continuar igual, vuelve a tocar «Descargar resumen».`;
      return;
    }
    delete form.dataset.confirmar;
    if (!window.AstroPDF) { msg.dataset.error = 'true'; msg.textContent = 'No se pudo crear el PDF. Recarga la página e intenta de nuevo.'; return; }
    const g = grupo.value.trim(), d = docente.value.trim();
    R.nombre(n);
    R.anotarNombre(n);
    try { localStorage.setItem('astro-informe', JSON.stringify({ grupo: g, docente: d })); } catch (e) {}
    const fecha = new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
    const limpio = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    window.AstroPDF.bajar(resumenPDF({ nombre: n, grupo: g, docente: d, fecha }), `medallero-${limpio(n) || 'astronomia'}.pdf`);
    msg.textContent = `Listo: se está descargando el resumen de ${n}, con fecha de emisión ${fecha}. Puedes enviárselo a tu docente por correo o por la plataforma de clase.`;
  });

  // Borrar el progreso (con confirmación)
  const dlg = $('#borrar-dialogo');
  $('#borrar-btn').addEventListener('click', () => dlg.showModal());
  $('#borrar-no').addEventListener('click', () => dlg.close());
  $('#borrar-si').addEventListener('click', () => {
    R.borrar(); dlg.close(); pintar();
    $('#borrar-msg').textContent = `Listo: se borró tu progreso de este navegador. El código ${R.dispositivo()} se mantiene, y tus próximos resúmenes indicarán que el progreso se borró.`;
  });

  // Si se juega en otra pestaña, el medallero se actualiza solo
  addEventListener('storage', ev => { if (ev.key === 'astro-registro') pintar(); });
  addEventListener('pageshow', pintar);
  pintar();
})();
