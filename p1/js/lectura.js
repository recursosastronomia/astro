/* Páginas de lectura de "Astronomía para todos".
   Barra de progreso, índice y trivia con estrellas (el modo noche está en js/tema.js).
   Cada página define sus preguntas en window.TRIVIA antes de cargar este archivo
   (y, si quiere, un mensaje final propio en window.TRIVIA_RESULTADO).
   Si además define window.TRIVIA_META ({ id, titulo, ideas, mezclar }), la trivia:
   - mezcla el orden de las opciones en cada intento,
   - guarda el resultado en el registro de estrellas del portal (localStorage «astro-registro»),
     pensado para el futuro medallero (ver AstroRegistro más abajo),
   - ofrece descargar un certificado en PDF con el nombre de quien la completó (js/certificado.js). */

/* ---------- Medallero: raíz del sitio, carga de js/medallas.js y acceso en la barra ---------- */
window.ASTRO_RAIZ = window.ASTRO_RAIZ || ((document.currentScript && document.currentScript.src) || '').replace(/js\/lectura\.js(\?.*)?$/, '');
(() => {
  const raiz = window.ASTRO_RAIZ;
  if (!window.AstroMedallas && raiz) {
    const sc = document.createElement('script');
    sc.src = raiz + 'js/medallas.js';
    sc.addEventListener('load', () => document.dispatchEvent(new Event('astro:medallas-listas')));
    document.head.appendChild(sc);
  }
  // Acceso «Mi medallero» junto al botón de modo noche (no en el propio medallero)
  const barra = document.querySelector('.l-barra-in');
  const tema = document.getElementById('tema');
  if (!barra || !tema || document.documentElement.dataset.pagina === 'medallero' || document.querySelector('.l-medallas')) return;
  const a = document.createElement('a');
  a.className = 'l-medallas';
  a.href = raiz + 'medallero.html';
  a.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3h8l-2 6h-4z"/><circle cx="12" cy="15" r="6"/><path d="M12 12.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z"/></svg><span class="l-tema-txt">Mi medallero</span>';
  const acciones = document.createElement('div');
  acciones.className = 'l-barra-acciones';
  tema.replaceWith(acciones);
  acciones.append(a, tema);
})();

/* ---------- Progreso de lectura e índice ---------- */
(() => {
  const barra = document.getElementById('progreso');
  if (barra) {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      barra.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  const enlaces = [...document.querySelectorAll('.l-indice a')];
  const secciones = enlaces.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  // Marca la sección que se está leyendo: la última cuyo título ya pasó el primer cuarto
  // de la pantalla. Arriba del todo (antes de la primera) no se marca ninguna.
  if (secciones.length) {
    let pendiente = false;
    const marcar = () => {
      pendiente = false;
      const linea = innerHeight * 0.25;
      let actual = -1;
      secciones.forEach((s, i) => { if (s.getBoundingClientRect().top <= linea) actual = i; });
      const id = actual >= 0 ? '#' + secciones[actual].id : '';
      enlaces.forEach(a => {
        if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    };
    addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(marcar); } }, { passive: true });
    addEventListener('resize', marcar);
    marcar();
  }
  // En el celular, el índice empieza cerrado y se cierra al elegir una sección
  const indice = document.getElementById('indice');
  if (!indice) return;
  const movil = matchMedia('(max-width: 63.99rem)');
  if (movil.matches) indice.open = false;
  enlaces.forEach(a => a.addEventListener('click', () => { if (movil.matches) indice.open = false; }));
})();

/* ---------- Registro de estrellas (base del futuro medallero) ----------
   Estructura guardada en localStorage, clave «astro-registro»:
   { version: 1, dias: ['AAAA-MM-DD', …], trivias: { [id]: { titulo, ideas, pagina, total, mejor, ultima, primerResultado, intentos, primera, fecha } } }
   - mejor: mayor cantidad de estrellas lograda; ultima: las del último intento; primerResultado: las del primer intento
   - primera / fecha: fecha ISO del primer y del último intento; dias: días distintos en que se jugó
   Todas las trivias del portal se anotan aquí; el medallero (js/medallas.js y medallero.html) las lee.
   Al terminar una trivia se emite el evento «astro:trivia» en document con el detalle del intento. */
window.AstroRegistro = (() => {
  const CLAVE = 'astro-registro';
  const vacio = () => ({ version: 1, trivias: {} });
  const leer = () => {
    try { const r = JSON.parse(localStorage.getItem(CLAVE)); return r && r.trivias ? r : vacio(); } catch (e) { return vacio(); }
  };
  // Sello de control: detecta si el registro se editó a mano (fuera del portal)
  const hash = str => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const sellar = r => hash('astro|' + (r.dispositivo || '') + '|' + JSON.stringify(r.trivias || {}) + '|' + JSON.stringify(r.dias || []));
  const guardar = r => { try { r.dispositivo = dispositivo(); r.sello = sellar(r); localStorage.setItem(CLAVE, JSON.stringify(r)); return true; } catch (e) { return false; } };
  // true si el registro está vacío o su sello coincide (no se tocó a mano)
  const integro = () => { const r = leer(); return !Object.keys(r.trivias).length || r.sello === sellar(r); };

  /* Código único de este navegador (AST-XXXX-XXXX). Se crea una vez y no cambia al borrar el progreso:
     aparece en certificados y resúmenes para que el docente detecte si varios estudiantes usaron el mismo navegador. */
  const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sin 0/O, 1/I/L para que no se confundan al copiarlo
  function dispositivo() {
    let id = null;
    try { id = localStorage.getItem('astro-id'); } catch (e) {}
    if (!id || !/^AST-[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(id)) {
      try { const r = JSON.parse(localStorage.getItem(CLAVE)); if (r && /^AST-/.test(r.dispositivo || '')) id = r.dispositivo; } catch (e) {}
    }
    if (!id || !/^AST-[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(id)) {
      const b = new Uint8Array(8);
      (window.crypto || window.msCrypto).getRandomValues(b);
      const c = [...b].map(x => ALFABETO[x % ALFABETO.length]).join('');
      id = `AST-${c.slice(0, 4)}-${c.slice(4)}`;
    }
    try { localStorage.setItem('astro-id', id); } catch (e) {}
    return id;
  }
  // Nombres usados para emitir certificados o resúmenes en este navegador
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const nombresUsados = () => { try { const l = JSON.parse(localStorage.getItem('astro-nombres')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  function anotarNombre(n) {
    const l = nombresUsados();
    const ya = l.find(x => norm(x.nombre) === norm(n));
    if (ya) ya.ultimo = new Date().toISOString(); else l.push({ nombre: n, primero: new Date().toISOString(), ultimo: new Date().toISOString() });
    try { localStorage.setItem('astro-nombres', JSON.stringify(l)); } catch (e) {}
    return l;
  }
  // ¿Es un nombre distinto de los que ya se usaron en este navegador?
  const nombreNuevo = n => { const l = nombresUsados(); return l.length > 0 && !l.some(x => norm(x.nombre) === norm(n)); };
  const borrados = () => { try { return Number(localStorage.getItem('astro-borrados')) || 0; } catch (e) { return 0; } };
  // Datos de control que van en cada certificado y resumen
  const control = () => ({ id: dispositivo(), nombres: nombresUsados().map(x => x.nombre), borrados: borrados(), integro: integro() });
  function anotar({ id, titulo, ideas, total, estrellas }) {
    const r = leer();
    const ahora = new Date().toISOString();
    const t = r.trivias[id] || { intentos: 0, mejor: 0, primera: ahora, primerResultado: estrellas };
    const d = new Date(), dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    r.dias = Array.isArray(r.dias) ? r.dias : [];
    if (!r.dias.includes(dia)) r.dias.push(dia);
    Object.assign(t, { titulo, ideas: ideas || '', pagina: location.pathname.split('/').slice(-2).join('/'), total, ultima: estrellas, fecha: ahora });
    t.intentos += 1;
    t.mejor = Math.max(t.mejor || 0, estrellas);
    r.trivias[id] = t;
    const ok = guardar(r);
    document.dispatchEvent(new CustomEvent('astro:trivia', { detail: { id, ...t, guardado: ok } }));
    return t;
  }
  // Resumen para mostrar al final de cada trivia (y, más adelante, en el medallero)
  function resumen() {
    const lista = Object.values(leer().trivias);
    return {
      trivias: lista.length,
      estrellas: lista.reduce((a, t) => a + (t.mejor || 0), 0),
      posibles: lista.reduce((a, t) => a + (t.total || 0), 0),
      completas: lista.filter(t => t.mejor === t.total).length
    };
  }
  const nombre = v => {
    try { if (v === undefined) return localStorage.getItem('astro-nombre') || ''; localStorage.setItem('astro-nombre', v); } catch (e) {}
    return v || '';
  };
  // Borra las medallas, pero no el código del navegador ni los nombres usados; cuenta cuántas veces se borró
  const borrar = () => { try { localStorage.removeItem(CLAVE); localStorage.setItem('astro-borrados', String(borrados() + 1)); return true; } catch (e) { return false; } };
  // Migración única: los registros anteriores a los sellos (de antes de existir el código del navegador) se sellan una vez
  try {
    if (!localStorage.getItem('astro-id')) {
      const r = leer();
      if (Object.keys(r.trivias).length && !r.sello) guardar(r); else dispositivo();
    }
  } catch (e) {}
  return { leer, anotar, resumen, nombre, borrar, dispositivo, integro, anotarNombre, nombresUsados, nombreNuevo, control };
})();

/* ---------- Trivia ---------- */
(() => {
  const questions = window.TRIVIA;
  const meta = window.TRIVIA_META || null;
  const quizBody = document.getElementById('quiz-body');
  const quizResult = document.getElementById('quiz-result');
  if (!questions || !quizBody || !quizResult) return;

  let score = 0;
  let isVerified = false;
  let orden = [];   // orden[i] = índices de las opciones de la pregunta i tal como se muestran
  const icono = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  const FELICITA = ['¡Correcto!', '¡Muy bien!', '¡Excelente!', '¡Así es!', '¡Bien hecho!', '¡Exacto!', '¡Impecable!'];
  const mezclar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function buildQuiz() {
    orden = questions.map(q => {
      const idx = q.options.map((_, i) => i);
      return meta && meta.mezclar !== false ? mezclar(idx) : idx;
    });
    quizBody.innerHTML = `<div class="l-trivia-meta"><span id="quiz-paso">Pregunta 1 de ${questions.length}</span><div class="l-trivia-barra" aria-hidden="true"><span id="quiz-barra" style="width:${100 / questions.length}%"></span></div></div>`;
    questions.forEach((q, index) => {
      const div = document.createElement('div');
      div.className = 'l-pregunta' + (index === 0 ? ' activa' : '');
      div.id = `question-${index}`;
      div.innerHTML = `
        <fieldset style="border:0;margin:0;padding:0">
          <legend class="sr-only">${q.question}</legend>
          <h3 aria-hidden="true">${q.question}</h3>
          <div class="l-opciones">
            ${orden[index].map(i => `
              <label class="l-opcion" id="label-${index}-${i}">
                <input type="radio" name="q${index}" value="${i}">
                <span>${q.options[i]}</span>
              </label>`).join('')}
          </div>
        </fieldset>
        <div class="l-fb" id="feedback-${index}" role="status"></div>
        <button class="l-btn" type="button" id="action-btn-${index}" disabled>Verificar respuesta</button>`;
      div.querySelectorAll('input').forEach(input => input.addEventListener('change', () => selectOption(index, Number(input.value))));
      div.querySelector('.l-btn').addEventListener('click', () => isVerified ? advanceQuestion(index) : verifyAnswer(index));
      quizBody.appendChild(div);
    });
  }

  function selectOption(qIndex, optIndex) {
    if (isVerified) return;
    document.getElementById(`action-btn-${qIndex}`).disabled = false;
    questions[qIndex].options.forEach((_, i) => document.getElementById(`label-${qIndex}-${i}`).classList.toggle('elegida', i === optIndex));
  }

  // Texto de la retroalimentación según el formato de la pregunta
  function textos(q, selected, index) {
    if (q.explicacion) { // formato de las guías «Grandes ideas»: una explicación formativa por pregunta
      return {
        bien: `<b>${FELICITA[index % FELICITA.length]}</b> ${q.explicacion}`,
        mal: `<b>No es esa.</b> La respuesta correcta es: <b>«${q.options[q.correct]}»</b>. <span class="l-fb-sig"><b>Para recordar:</b> ${q.explicacion}</span>`
      };
    }
    const exp = q.explanations; // explicación por opción (si la pregunta la trae)
    return {
      bien: exp ? `¡Correcto! ${exp[selected]}` : q.feedbackCorrect,
      mal: exp ? `Incorrecto: ${exp[selected]} <span class="l-fb-sig">La opción correcta: ${exp[q.correct]}</span>` : q.feedbackIncorrect
    };
  }

  function verifyAnswer(index) {
    isVerified = true;
    const selected = Number(document.querySelector(`input[name="q${index}"]:checked`).value);
    const q = questions[index];
    const ok = selected === q.correct;
    const feedback = document.getElementById(`feedback-${index}`);
    document.querySelectorAll(`input[name="q${index}"]`).forEach(i => i.disabled = true);
    q.options.forEach((_, i) => document.getElementById(`label-${index}-${i}`).classList.remove('elegida'));
    const t = textos(q, selected, index);
    if (ok) {
      document.getElementById(`label-${index}-${selected}`).classList.add('bien');
      feedback.innerHTML = `${icono('i-bien')}<span>${t.bien}</span>`;
      feedback.className = 'l-fb bien';
      score++;
    } else {
      document.getElementById(`label-${index}-${selected}`).classList.add('mal');
      document.getElementById(`label-${index}-${q.correct}`).classList.add('bien');
      feedback.innerHTML = `${icono('i-mal')}<span>${t.mal}</span>`;
      feedback.className = 'l-fb mal';
    }
    const btn = document.getElementById(`action-btn-${index}`);
    btn.innerHTML = index === questions.length - 1 ? `Ver mis estrellas ${icono('i-estrella')}` : `Siguiente pregunta ${icono('i-flecha')}`;
    btn.focus();
  }

  function advanceQuestion(index) {
    isVerified = false;
    document.getElementById(`question-${index}`).classList.remove('activa');
    if (index + 1 < questions.length) {
      const next = document.getElementById(`question-${index + 1}`);
      next.classList.add('activa');
      document.getElementById('quiz-paso').textContent = `Pregunta ${index + 2} de ${questions.length}`;
      document.getElementById('quiz-barra').style.width = `${(index + 2) / questions.length * 100}%`;
      next.querySelector('input').focus();
    } else {
      showResults();
    }
  }

  // Certificado y registro: solo en las páginas que declaran window.TRIVIA_META
  function bloqueCertificado() {
    let caja = document.getElementById('quiz-cert');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'quiz-cert';
      document.getElementById('reintentar').before(caja);
    }
    const r = window.AstroRegistro.resumen();
    caja.innerHTML = `
      <p class="l-registro">${icono('i-estrella')}<span>En este dispositivo llevas <b>${r.estrellas} de ${r.posibles}</b> estrellas posibles en ${r.trivias} ${r.trivias === 1 ? 'trivia' : 'trivias'} de Astronomía para todos.</span></p>
      <form class="l-cert" id="cert-form" novalidate>
        <h4 class="l-cert-t">Descarga tu certificado</h4>
        <p id="cert-ayuda">Escribe tu nombre tal como quieres que aparezca. El certificado se crea en tu dispositivo con la fecha de hoy: tu nombre no se envía a ningún lado. Lleva el código de este navegador, <b>${window.AstroRegistro.dispositivo()}</b>.</p>
        <label for="cert-nombre">Nombre y apellido</label>
        <input id="cert-nombre" name="nombre" type="text" autocomplete="name" maxlength="60" spellcheck="false" aria-describedby="cert-ayuda cert-msg" required>
        <p id="cert-msg" class="l-cert-msg" role="status" aria-live="polite"></p>
        <button class="l-btn" type="submit">Descargar certificado (PDF)</button>
      </form>`;
    const form = caja.querySelector('form');
    const input = caja.querySelector('input');
    const msg = caja.querySelector('#cert-msg');
    input.value = window.AstroRegistro.nombre();
    form.addEventListener('submit', e => {
      e.preventDefault();
      const nombre = input.value.replace(/\s+/g, ' ').trim();
      if (nombre.length < 2) {
        input.setAttribute('aria-invalid', 'true'); msg.dataset.error = 'true';
        msg.textContent = 'Escribe tu nombre (al menos 2 letras) para crear el certificado.';
        input.focus(); return;
      }
      input.removeAttribute('aria-invalid'); msg.dataset.error = 'false';
      const R = window.AstroRegistro;
      if (R.nombreNuevo(nombre) && form.dataset.confirmar !== nombre) {
        form.dataset.confirmar = nombre; msg.dataset.error = 'true';
        msg.textContent = `En este navegador ya se emitieron documentos a nombre de ${R.nombresUsados().map(x => x.nombre).join(', ')}. Cada estudiante debe usar su propio navegador: si continúas, tu docente verá todos los nombres en el certificado. Para continuar igual, vuelve a tocar «Descargar certificado».`;
        return;
      }
      delete form.dataset.confirmar;
      if (!window.AstroCertificado) { msg.dataset.error = 'true'; msg.textContent = 'No se pudo crear el certificado. Recarga la página e intenta de nuevo.'; return; }
      window.AstroRegistro.nombre(nombre);
      window.AstroRegistro.anotarNombre(nombre);
      const fecha = new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
      const limpio = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
      window.AstroCertificado.descargar({
        nombre, titulo: meta.titulo, ideas: meta.ideas, estrellas: score, total: questions.length, fecha,
        control: window.AstroRegistro.control(), url: location.href.split('#')[0], archivo: `certificado-${limpio(meta.id)}-${limpio(nombre) || 'astronomia'}.pdf`
      });
      msg.textContent = `Listo: se está descargando el certificado a nombre de ${nombre}, con fecha ${fecha}.`;
    });
  }

  // Medalla ganada en esta trivia, logros nuevos y acceso al medallero
  function bloqueMedalla(id, antes) {
    const M = window.AstroMedallas;
    if (!M) return;
    let caja = document.getElementById('quiz-medalla');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'quiz-medalla';
      caja.className = 'l-medalla-fin';
      document.getElementById('reintentar').before(caja);
    }
    const ahora = M.estado();
    const g = ahora.guias.find(x => x.id === id);
    if (!g) { caja.innerHTML = ''; return; }  // trivia fuera del medallero
    const previa = antes && antes.guias.find(x => x.id === id);
    const subio = g.medalla && (!previa || !previa.medalla || M.NIVELES.indexOf(previa.medalla) > M.NIVELES.indexOf(g.medalla));
    const nuevos = antes ? ahora.logros.filter(l => l.ok && !antes.logros.find(x => x.id === l.id).ok) : [];
    const rangoNuevo = antes && antes.rango.nombre !== ahora.rango.nombre;
    let txt;
    if (subio) txt = `<b>¡Ganaste la medalla de ${g.medalla.nombre.toLowerCase()}!</b> Ya está guardada en tu medallero.`;
    else if (g.medalla) txt = `Tu mejor medalla en esta guía sigue siendo la de <b>${g.medalla.nombre.toLowerCase()}</b> (${g.mejor} de ${g.total} estrellas).`;
    else txt = `Con <b>${Math.ceil(questions.length * 0.5)} respuestas correctas</b> ganas la medalla de bronce. ¡Inténtalo de nuevo!`;
    const extra = g.medalla && g.medalla.id !== 'oro' ? ` Si respondes todo bien, ganas el oro.` : '';
    caja.innerHTML = `
      <div class="l-medalla-fila">${M.svgMedalla(g.medalla, 72)}<p>${txt}${extra}</p></div>
      ${rangoNuevo ? `<p class="l-logro-nuevo"><b>¡Subiste de rango!</b> Ahora eres <b>${ahora.rango.nombre}</b>.</p>` : ''}
      ${nuevos.map(l => `<p class="l-logro-nuevo"><b>Logro desbloqueado: ${l.nombre}.</b> ${l.texto}</p>`).join('')}
      <p><a class="l-btn-medallero" href="${window.ASTRO_RAIZ}medallero.html">Ver mi medallero (${ahora.conMedalla} ${ahora.conMedalla === 1 ? 'medalla' : 'medallas'})</a></p>`;
  }

  function showResults() {
    quizBody.hidden = true;
    quizResult.hidden = false;
    const star = (on, i) => `<svg viewBox="0 0 24 24" class="${on ? 'gano' : ''}" style="--i:${i}" aria-hidden="true"><path class="${on ? 'llena' : 'vacia'}" d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`;
    const sc = document.getElementById('stars-container');
    sc.innerHTML = questions.map((_, i) => star(i < score, i)).join('');
    sc.setAttribute('role', 'img');
    sc.setAttribute('aria-label', `${score} de ${questions.length} estrellas`);
    document.getElementById('score-text').textContent = `Lograste ${score} de ${questions.length} respuestas correctas.`;
    const h = quizResult.querySelector('h3');
    // Todas las trivias se anotan: con TRIVIA_META o, si no, con el nombre del archivo y el título de la página
    const M = window.AstroMedallas;
    const antes = M ? M.estado() : null;
    const id = (meta && meta.id) || location.pathname.split('/').pop().replace(/\.html?$/, '') || 'inicio';
    const h1 = document.querySelector('h1');
    window.AstroRegistro.anotar({ id, titulo: (meta && meta.titulo) || (h1 ? h1.textContent.trim() : document.title), ideas: meta ? meta.ideas : '', total: questions.length, estrellas: score });
    bloqueMedalla(id, antes);
    // Mensaje final propio de la página (opcional): window.TRIVIA_RESULTADO(aciertos, total) → { titulo, html }
    const extra = document.getElementById('score-extra');
    if (typeof window.TRIVIA_RESULTADO === 'function') {
      const r = window.TRIVIA_RESULTADO(score, questions.length) || {};
      if (r.titulo) h.textContent = r.titulo;
      if (extra) extra.innerHTML = r.html || '';
    }
    if (meta) bloqueCertificado();
    h.setAttribute('tabindex', '-1');
    h.focus();
  }

  function resetQuiz() {
    score = 0;
    isVerified = false;
    quizBody.hidden = false;
    quizResult.hidden = true;
    buildQuiz();
    quizBody.querySelector('input').focus();
  }
  document.getElementById('reintentar').addEventListener('click', resetQuiz);

  buildQuiz();
})();
