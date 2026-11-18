/* Modo noche y alto contraste de "Astronomía para todos", comunes a todas las páginas.
   La elección es una sola para todo el portal y se guarda en localStorage:
     "astro-tema"      → "noche" | "dia"
     "astro-contraste" → "1" | "0"   (alto contraste: blanco y amarillo sobre negro, para baja visión)
   En <html> deja data-theme="dark" (modo noche o alto contraste) y data-contrast="alto" (alto contraste).
   El alto contraste parte del modo noche, así que todo lo que ya se ve bien de noche se mantiene.
   El <head> de cada página aplica la elección antes de pintar; este archivo maneja los botones
   #tema y #contraste y vuelve a aplicarla cuando la página reaparece con «Atrás» (caché del navegador)
   o cuando se cambia en otra pestaña, para que nunca quede una página con el modo viejo. */
(() => {
  const root = document.documentElement;
  const btn = document.getElementById('tema');
  const btnHc = document.getElementById('contraste');
  const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  // Si no hay almacenamiento (modo privado estricto), la elección vale al menos para esta página
  let memTema = null, memHc = null;
  const tema = () => leer('astro-tema') || memTema;
  const hcOn = () => (leer('astro-contraste') || memHc) === '1';
  const avisar = msg => {
    let v = document.getElementById('tema-aviso');
    if (!v) {
      v = document.createElement('span'); v.id = 'tema-aviso'; v.setAttribute('role', 'status');
      v.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
      document.body.appendChild(v);
    }
    v.textContent = ''; setTimeout(() => { v.textContent = msg; }, 50);
  };
  const aplicar = () => {
    const t = tema(), hc = hcOn();
    const noche = hc || t === 'noche' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
    if (noche) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    if (hc) root.setAttribute('data-contrast', 'alto'); else root.removeAttribute('data-contrast');
    if (btn) btn.setAttribute('aria-pressed', String(noche && !hc));
    if (btnHc) btnHc.setAttribute('aria-pressed', String(hc));
  };
  aplicar();
  addEventListener('pageshow', aplicar);                                       // volver con «Atrás»
  addEventListener('storage', e => { if (e.key === 'astro-tema' || e.key === 'astro-contraste') aplicar(); }); // otra pestaña
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!tema()) aplicar(); });
  if (btn) btn.addEventListener('click', () => {
    // Desde alto contraste, «Modo noche» vuelve al modo noche normal
    const noche = hcOn() ? true : root.getAttribute('data-theme') !== 'dark';
    memTema = noche ? 'noche' : 'dia'; memHc = '0';
    guardar('astro-tema', memTema); guardar('astro-contraste', '0');
    aplicar(); avisar(noche ? 'Modo noche activado.' : 'Modo claro activado.');
  });
  if (btnHc) btnHc.addEventListener('click', () => {
    const on = !hcOn();
    memHc = on ? '1' : '0'; guardar('astro-contraste', memHc);
    aplicar(); avisar(on ? 'Alto contraste activado.' : 'Alto contraste desactivado.');
  });
})();
