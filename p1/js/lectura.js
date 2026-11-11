/* Páginas de lectura de "Astronomía para todos".
   Barra de progreso, índice y trivia con estrellas (el modo noche está en js/tema.js).
   Cada página define sus preguntas en window.TRIVIA antes de cargar este archivo
   (y, si quiere, un mensaje final propio en window.TRIVIA_RESULTADO). */

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

/* ---------- Trivia ---------- */
(() => {
  const questions = window.TRIVIA;
  const quizBody = document.getElementById('quiz-body');
  const quizResult = document.getElementById('quiz-result');
  if (!questions || !quizBody || !quizResult) return;

  let score = 0;
  let isVerified = false;
  const icono = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;

  function buildQuiz() {
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
            ${q.options.map((opt, i) => `
              <label class="l-opcion" id="label-${index}-${i}">
                <input type="radio" name="q${index}" value="${i}">
                <span>${opt}</span>
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

  function verifyAnswer(index) {
    isVerified = true;
    const selected = Number(document.querySelector(`input[name="q${index}"]:checked`).value);
    const q = questions[index];
    const ok = selected === q.correct;
    const feedback = document.getElementById(`feedback-${index}`);
    document.querySelectorAll(`input[name="q${index}"]`).forEach(i => i.disabled = true);
    q.options.forEach((_, i) => document.getElementById(`label-${index}-${i}`).classList.remove('elegida'));
    // Si la pregunta trae una explicación por opción (q.explanations), se usa la de la opción elegida
    const exp = q.explanations;
    const txtBien = exp ? `¡Correcto! ${exp[selected]}` : q.feedbackCorrect;
    const txtMal = exp ? `Incorrecto: ${exp[selected]} <span class="l-fb-sig">La opción correcta: ${exp[q.correct]}</span>` : q.feedbackIncorrect;
    if (ok) {
      document.getElementById(`label-${index}-${selected}`).classList.add('bien');
      feedback.innerHTML = `${icono('i-bien')}<span>${txtBien}</span>`;
      feedback.className = 'l-fb bien';
      score++;
    } else {
      document.getElementById(`label-${index}-${selected}`).classList.add('mal');
      document.getElementById(`label-${index}-${q.correct}`).classList.add('bien');
      feedback.innerHTML = `${icono('i-mal')}<span>${txtMal}</span>`;
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

  function showResults() {
    quizBody.hidden = true;
    quizResult.hidden = false;
    const star = (on, i) => `<svg viewBox="0 0 24 24" class="${on ? 'gano' : ''}" style="--i:${i}" aria-hidden="true"><path class="${on ? 'llena' : 'vacia'}" d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`;
    document.getElementById('stars-container').innerHTML = questions.map((_, i) => star(i < score, i)).join('');
    document.getElementById('score-text').textContent = `Lograste ${score} de ${questions.length} respuestas correctas.`;
    const h = quizResult.querySelector('h3');
    // Mensaje final propio de la página (opcional): window.TRIVIA_RESULTADO(aciertos, total) → { titulo, html }
    const extra = document.getElementById('score-extra');
    if (typeof window.TRIVIA_RESULTADO === 'function') {
      const r = window.TRIVIA_RESULTADO(score, questions.length) || {};
      if (r.titulo) h.textContent = r.titulo;
      if (extra) extra.innerHTML = r.html || '';
    }
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
