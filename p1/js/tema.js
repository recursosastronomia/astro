/* Modo noche de "Astronomía para todos", común a todas las páginas.
   La elección es una sola para todo el portal: se guarda en localStorage ("astro-tema": "noche" o "dia").
   El <head> de cada página la aplica antes de pintar; este archivo maneja el botón #tema y además
   vuelve a aplicarla cuando la página reaparece con «Atrás» (caché del navegador) o cuando
   se cambia en otra pestaña, para que nunca quede una página con el tema viejo. */
(() => {
  const root = document.documentElement;
  const btn = document.getElementById('tema');
  const leer = () => { try { return localStorage.getItem('astro-tema'); } catch (e) { return null; } };
  const aplicar = () => {
    const t = leer();
    const noche = t === 'noche' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
    if (noche) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    if (btn) btn.setAttribute('aria-pressed', String(noche));
  };
  aplicar();
  addEventListener('pageshow', aplicar);                                       // volver con «Atrás»
  addEventListener('storage', e => { if (e.key === 'astro-tema') aplicar(); }); // otra pestaña
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!leer()) aplicar(); });
  if (!btn) return;
  btn.addEventListener('click', () => {
    const noche = root.getAttribute('data-theme') !== 'dark';
    try { localStorage.setItem('astro-tema', noche ? 'noche' : 'dia'); } catch (e) {}
    aplicar();
    if (leer() === null) { // sin almacenamiento (modo privado estricto): al menos cambia en esta página
      if (noche) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      btn.setAttribute('aria-pressed', String(noche));
    }
  });
})();
