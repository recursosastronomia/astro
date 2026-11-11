/* Páginas de lectura de "Astronomía para todos".
   Barra de progreso, índice y trivia con estrellas (el modo noche está en js/tema.js).
   Cada página define sus preguntas en window.TRIVIA antes de cargar este archivo
   (y, si quiere, un mensaje final propio en window.TRIVIA_RESULTADO).
   Si además define window.TRIVIA_META ({ id, titulo, ideas, mezclar }), la trivia:
   - mezcla el orden de las opciones en cada intento,
   - guarda el resultado en el registro de estrellas del portal (localStorage «astro-registro»),
     pensado para el futuro medallero (ver AstroRegistro más abajo),
   - ofrece descargar un certificado en PDF con el nombre de quien la completó (js/certificado.js). */

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
   { version: 1, trivias: { [id]: { titulo, ideas, pagina, total, mejor, ultima, intentos, primera, fecha } } }
   - mejor: mayor cantidad de estrellas lograda; ultima: las del último intento
   - primera / fecha: fecha ISO del primer y del último intento
   Al terminar una trivia se emite el evento «astro:trivia» en document con el detalle del intento. */
window.AstroRegistro = (() => {
  const CLAVE = 'astro-registro';
  const vacio = () => ({ version: 1, trivias: {} });
  const leer = () => {
    try { const r = JSON.parse(localStorage.getItem(CLAVE)); return r && r.trivias ? r : vacio(); } catch (e) { return vacio(); }
  };
  const guardar = r => { try { localStorage.setItem(CLAVE, JSON.stringify(r)); return true; } catch (e) { return false; } };
  function anotar({ id, titulo, ideas, total, estrellas }) {
    const r = leer();
    const ahora = new Date().toISOString();
    const t = r.trivias[id] || { intentos: 0, mejor: 0, primera: ahora };
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
  return { leer, anotar, resumen, nombre };
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
        <p id="cert-ayuda">Escribe tu nombre tal como quieres que aparezca. El certificado se crea en tu dispositivo con la fecha de hoy: tu nombre no se envía a ningún lado.</p>
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
      if (!window.AstroCertificado) { msg.dataset.error = 'true'; msg.textContent = 'No se pudo crear el certificado. Recarga la página e intenta de nuevo.'; return; }
      window.AstroRegistro.nombre(nombre);
      const fecha = new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
      const limpio = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
      window.AstroCertificado.descargar({
        nombre, titulo: meta.titulo, ideas: meta.ideas, estrellas: score, total: questions.length, fecha,
        url: location.href.split('#')[0], archivo: `certificado-${limpio(meta.id)}-${limpio(nombre) || 'astronomia'}.pdf`
      });
      msg.textContent = `Listo: se está descargando el certificado a nombre de ${nombre}, con fecha ${fecha}.`;
    });
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
    if (meta) window.AstroRegistro.anotar({ id: meta.id, titulo: meta.titulo, ideas: meta.ideas, total: questions.length, estrellas: score });
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
