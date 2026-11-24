/* Acceso al buscador de recursos desde la barra superior (la lupa).
   Marcado esperado (ver index.html):
     <div class="busca"> <button class="l-tema busca-btn" aria-expanded aria-controls="busca-panel">
     <form class="busca-panel" id="busca-panel" action="buscador.html" method="get" role="search" hidden> …
   - La lupa abre y cierra la cajita; Esc o un clic fuera la cierran y el foco vuelve a la lupa.
   - Se puede abrir con la tecla «/» desde cualquier parte de la página (salvo al escribir en un campo).
   - Pide al menos 4 letras (lo mismo que el buscador). Vacía, abre el buscador completo. */
(() => {
  const btn = document.querySelector('.busca-btn');
  const panel = document.getElementById('busca-panel');
  if (!btn || !panel) return;
  const input = panel.querySelector('input[name="q"]');
  const ayuda = panel.querySelector('.busca-ayuda');
  const MIN = 4;
  const textoAyuda = ayuda ? ayuda.textContent : '';

  const abrir = () => {
    panel.hidden = false; btn.setAttribute('aria-expanded', 'true');
    input.focus(); input.select();
  };
  const cerrar = (devolverFoco) => {
    if (panel.hidden) return;
    panel.hidden = true; btn.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-invalid');
    if (ayuda) { ayuda.textContent = textoAyuda; ayuda.removeAttribute('data-error'); }
    if (devolverFoco) btn.focus();
  };

  btn.addEventListener('click', () => (panel.hidden ? abrir() : cerrar(true)));
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); cerrar(true); } });
  document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) cerrar(false); });
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault(); abrir();
  });
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true' && (input.value.trim().length >= MIN || !input.value.trim())) {
      input.removeAttribute('aria-invalid');
      if (ayuda) { ayuda.textContent = textoAyuda; ayuda.removeAttribute('data-error'); }
    }
  });
  panel.addEventListener('submit', e => {
    const q = input.value.trim();
    if (q && q.length < MIN) {
      e.preventDefault();
      input.setAttribute('aria-invalid', 'true');
      if (ayuda) {
        const faltan = MIN - q.length;
        ayuda.textContent = `Escribe al menos ${MIN} letras (faltan ${faltan}).`;
        ayuda.setAttribute('data-error', 'true');
      }
      input.focus();
      return;
    }
    if (!q) { e.preventDefault(); location.href = panel.getAttribute('action'); }
  });
})();
