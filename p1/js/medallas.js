/* Medallero de "Astronomía para todos": catálogo de trivias, medallas, logros y rangos.
   Lo usan js/lectura.js (al terminar una trivia) y medallero.html.
   Los resultados se guardan en el navegador con AstroRegistro (js/lectura.js), clave «astro-registro».
   Fuera del medallero: Misión Helios y los álbumes de cromos, que tienen sus propias medallas. */
window.AstroMedallas = (() => {
  // Trivias que cuentan para el medallero (archivo relativo a la raíz del sitio)
  const GUIAS = [
    {
      "id": "biia11to16",
      "titulo": "Los orígenes de la observación del cielo",
      "archivo": "ec/biia11to16version.html",
      "grupo": "1",
      "tramo": "1.1 a 1.6",
      "preguntas": 7
    },
    {
      "id": "biia17to110",
      "titulo": "De la Tierra al Sol: cambiar el centro del Universo",
      "archivo": "ec/biia17to110version.html",
      "grupo": "1",
      "tramo": "1.7 a 1.10",
      "preguntas": 7
    },
    {
      "id": "biia21to25",
      "titulo": "El cielo de todos los días",
      "archivo": "ec/biia21to25version.html",
      "grupo": "2",
      "tramo": "2.1 a 2.5",
      "preguntas": 7
    },
    {
      "id": "biia26to28",
      "titulo": "El Sol, las auroras y la tecnología del espacio",
      "archivo": "ec/biia26to28version.html",
      "grupo": "2",
      "tramo": "2.6 a 2.8",
      "preguntas": 7
    },
    {
      "id": "biia31to37",
      "titulo": "Un cielo nocturno lleno de sorpresas",
      "archivo": "ec/biia31to37version.html",
      "grupo": "3",
      "tramo": "3.1 a 3.7",
      "preguntas": 7
    },
    {
      "id": "biia41to44",
      "titulo": "Mensajeros del Universo: luz, gravedad y más",
      "archivo": "ec/biia41to44version.html",
      "grupo": "4",
      "tramo": "4.1 a 4.4",
      "preguntas": 7
    },
    {
      "id": "biia45to48",
      "titulo": "Una ciencia de equipo, distancias gigantes y arcoíris de luz",
      "archivo": "ec/biia45to48version.html",
      "grupo": "4",
      "tramo": "4.5 a 4.8",
      "preguntas": 7
    },
    {
      "id": "biia51to54",
      "titulo": "Telescopios: ojos gigantes para mirar el cielo",
      "archivo": "ec/biia51to54version.html",
      "grupo": "5",
      "tramo": "5.1 a 5.4",
      "preguntas": 7
    },
    {
      "id": "biia55to58",
      "titulo": "Gran ciencia: datos, supercomputadoras y sondas espaciales",
      "archivo": "ec/biia55to58version.html",
      "grupo": "5",
      "tramo": "5.5 a 5.8",
      "preguntas": 7
    },
    {
      "id": "biia61to64",
      "titulo": "La edad del Universo y el viaje de la luz",
      "archivo": "ec/biia61to64version.html",
      "grupo": "6",
      "tramo": "6.1 a 6.4",
      "preguntas": 7
    },
    {
      "id": "biia65to611",
      "titulo": "Lo que no vemos: materia oscura, expansión y Big Bang",
      "archivo": "ec/biia65to611version.html",
      "grupo": "6",
      "tramo": "6.5 a 6.11",
      "preguntas": 7
    },
    {
      "id": "biia71to75",
      "titulo": "Nuestro vecindario: el Sistema Solar",
      "archivo": "ec/biia71to75version.html",
      "grupo": "7",
      "tramo": "7.1 a 7.5",
      "preguntas": 7
    },
    {
      "id": "biia76to710",
      "titulo": "Lunas, asteroides, cometas y la frontera del Sistema Solar",
      "archivo": "ec/biia76to710version.html",
      "grupo": "7",
      "tramo": "7.6 a 7.10",
      "preguntas": 7
    },
    {
      "id": "biia81to84",
      "titulo": "Estrellas: fábricas de luz",
      "archivo": "ec/biia81to84version.html",
      "grupo": "8",
      "tramo": "8.1 a 8.4",
      "preguntas": 7
    },
    {
      "id": "biia85to810",
      "titulo": "Vida y muerte de las estrellas: somos polvo de estrellas",
      "archivo": "ec/biia85to810version.html",
      "grupo": "8",
      "tramo": "8.5 a 8.10",
      "preguntas": 7
    },
    {
      "id": "biia91to95",
      "titulo": "Galaxias: islas de estrellas",
      "archivo": "ec/biia91to95version.html",
      "grupo": "9",
      "tramo": "9.1 a 9.5",
      "preguntas": 7
    },
    {
      "id": "biia96to910",
      "titulo": "Brazos espirales, agujeros negros y cúmulos de galaxias",
      "archivo": "ec/biia96to910version.html",
      "grupo": "9",
      "tramo": "9.6 a 9.10",
      "preguntas": 7
    },
    {
      "id": "biia101to104",
      "titulo": "¿Hay vida más allá de la Tierra? Dónde buscar",
      "archivo": "ec/biia101to104version.html",
      "grupo": "10",
      "tramo": "10.1 a 10.4",
      "preguntas": 7
    },
    {
      "id": "biia105to108",
      "titulo": "Exoplanetas y la búsqueda de otras civilizaciones",
      "archivo": "ec/biia105to108version.html",
      "grupo": "10",
      "tramo": "10.5 a 10.8",
      "preguntas": 7
    },
    {
      "id": "biia111to117",
      "titulo": "Cuidar la Tierra, nuestro único hogar",
      "archivo": "ec/biia111to117version.html",
      "grupo": "11",
      "tramo": "11.1 a 11.7",
      "preguntas": 7
    },
    {
      "id": "astronomia",
      "titulo": "¿Qué es la astronomía?",
      "archivo": "ec/astronomia.html",
      "grupo": "temas",
      "tramo": "",
      "preguntas": 7
    },
    {
      "id": "constelacionesV3",
      "titulo": "Constelaciones",
      "archivo": "ec/constelacionesV3.html",
      "grupo": "temas",
      "tramo": "",
      "preguntas": 5
    },
    {
      "id": "movimientogeneraldiario",
      "titulo": "Movimiento general diario",
      "archivo": "ec/movimientogeneraldiario.html",
      "grupo": "temas",
      "tramo": "",
      "preguntas": 5
    },
    {
      "id": "contlumv1",
      "titulo": "Contaminación lumínica",
      "archivo": "ec/contlumv1.html",
      "grupo": "temas",
      "tramo": "",
      "preguntas": 5
    },
    {
      "id": "exoplanetas",
      "titulo": "Exoplanetas",
      "archivo": "ec/exoplanetas.html",
      "grupo": "temas",
      "tramo": "",
      "preguntas": 7
    },
    {
      "id": "sondas_voyager",
      "titulo": "Sondas Voyager",
      "archivo": "ec/sondas_voyager.html",
      "grupo": "temas",
      "tramo": "",
      "preguntas": 5
    },
    {
      "id": "astrocelular",
      "titulo": "Astrofotografía con celular",
      "archivo": "ec/astrocelular.html",
      "grupo": "temas",
      "tramo": "",
      "preguntas": 5
    }
  ];
  const GRUPOS = [
    {
      "id": "1",
      "titulo": "Gran idea 1: La astronomía es una de las ciencias más antiguas de la humanidad"
    },
    {
      "id": "2",
      "titulo": "Gran idea 2: Experimentamos fenómenos astronómicos en nuestra vida cotidiana"
    },
    {
      "id": "3",
      "titulo": "Gran idea 3: El cielo nocturno es rico y dinámico"
    },
    {
      "id": "4",
      "titulo": "Gran idea 4: La astronomía es la ciencia que estudia los objetos celestes y los fenómenos en el Universo"
    },
    {
      "id": "5",
      "titulo": "Gran idea 5: La astronomía estimula el desarrollo tecnológico y se beneficia de él"
    },
    {
      "id": "6",
      "titulo": "Gran idea 6: La cosmología es la ciencia que explora el Universo como un todo"
    },
    {
      "id": "7",
      "titulo": "Gran idea 7: Todos vivimos en un pequeño planeta dentro del Sistema Solar"
    },
    {
      "id": "8",
      "titulo": "Gran idea 8: Estamos hechos de polvo de estrellas"
    },
    {
      "id": "9",
      "titulo": "Gran idea 9: Hay cientos de miles de millones de galaxias en el Universo"
    },
    {
      "id": "10",
      "titulo": "Gran idea 10: Puede que no estemos solos en el Universo"
    },
    {
      "id": "11",
      "titulo": "Gran idea 11: Debemos preservar la Tierra, nuestro único hogar en el Universo"
    },
    {
      "id": "temas",
      "titulo": "Guías temáticas"
    }
  ];

  // Medalla según el mejor resultado: oro con todo bien, plata desde 80 %, bronce desde 50 %
  const NIVELES = [
    { id: 'oro', nombre: 'Oro', min: 1, color: '#e8a400' },
    { id: 'plata', nombre: 'Plata', min: 0.8, color: '#9aa7b8' },
    { id: 'bronce', nombre: 'Bronce', min: 0.5, color: '#b8723d' }
  ];
  const medalla = (mejor, total) => {
    if (!total) return null;
    const r = mejor / total;
    return NIVELES.find(n => r >= n.min - 1e-9) || null;
  };

  // Rangos según las estrellas acumuladas (mejor resultado de cada trivia)
  const RANGOS = [
    { min: 0, nombre: 'Polvo de estrellas', texto: 'Todo empieza aquí: de este polvo nacen las estrellas.' },
    { min: 10, nombre: 'Meteoro', texto: 'Ya dejaste tu primer rastro de luz en el cielo.' },
    { min: 30, nombre: 'Cometa', texto: 'Tu cola de conocimientos ya se ve desde lejos.' },
    { min: 60, nombre: 'Planeta', texto: 'Tienes tu propia órbita de saberes.' },
    { min: 90, nombre: 'Estrella', texto: 'Brillas con luz propia.' },
    { min: 125, nombre: 'Galaxia', texto: 'Reúnes miles de millones de ideas.' },
    { min: 160, nombre: 'Supercúmulo', texto: 'El rango máximo: dominas todo el Universo del portal.' }
  ];

  const porId = Object.fromEntries(GUIAS.map(g => [g.id, g]));
  const estrellasPosibles = GUIAS.reduce((a, g) => a + g.preguntas, 0);

  // Estado del medallero a partir del registro guardado
  function estado(registro) {
    const r = registro || (window.AstroRegistro ? window.AstroRegistro.leer() : { trivias: {} });
    const guias = GUIAS.map(g => {
      const t = r.trivias[g.id];
      const total = (t && t.total) || g.preguntas;
      const mejor = t ? Math.min(t.mejor || 0, total) : 0;
      return { ...g, jugada: !!t, mejor, total, intentos: t ? t.intentos || 0 : 0, fecha: t ? t.fecha : null,
               primera: t && typeof t.primerResultado === 'number' ? t.primerResultado : null, medalla: t ? medalla(mejor, total) : null };
    });
    const estrellas = guias.reduce((a, g) => a + g.mejor, 0);
    const cuenta = id => guias.filter(g => g.medalla && g.medalla.id === id).length;
    const conMedalla = guias.filter(g => g.medalla).length;
    const rango = [...RANGOS].reverse().find(x => estrellas >= x.min);
    const siguiente = RANGOS.find(x => x.min > estrellas) || null;
    const dias = Array.isArray(r.dias) ? r.dias : [];
    const est = { guias, estrellas, posibles: estrellasPosibles, oro: cuenta('oro'), plata: cuenta('plata'), bronce: cuenta('bronce'),
                  conMedalla, jugadas: guias.filter(g => g.jugada).length, rango, siguiente, dias };
    est.logros = LOGROS.map(l => ({ ...l, ok: !!l.cumple(est) }));
    est.mision = mision(est);
    return est;
  }

  const enGrupo = (est, grupo) => est.guias.filter(g => g.grupo === grupo);
  const todasConMedalla = lista => lista.length > 0 && lista.every(g => g.medalla);

  // Logros especiales: premian empezar, persistir, mejorar y completar colecciones
  const LOGROS = [
    { id: 'despegue', nombre: 'Primer despegue', texto: 'Completa tu primera trivia.', cumple: e => e.jugadas >= 1 },
    { id: 'perfeccion', nombre: 'Perfección', texto: 'Consigue tu primera medalla de oro.', cumple: e => e.oro >= 1 },
    { id: 'persistencia', nombre: 'Nunca te rindas', texto: 'Mejora tu resultado al volver a jugar una trivia.', cumple: e => e.guias.some(g => g.primera !== null && g.mejor > g.primera) },
    { id: 'constancia', nombre: 'Constancia', texto: 'Juega trivias en 3 días distintos.', cumple: e => e.dias.length >= 3 },
    { id: 'coleccion5', nombre: 'Coleccionista', texto: 'Reúne 5 medallas.', cumple: e => e.conMedalla >= 5 },
    { id: 'idea', nombre: 'Gran idea completa', texto: 'Consigue medalla en todas las guías de una gran idea.', cumple: e => GRUPOS.some(gr => gr.id !== 'temas' && todasConMedalla(enGrupo(e, gr.id))) },
    { id: 'temas', nombre: 'Explorador de temas', texto: 'Consigue medalla en las 7 guías temáticas.', cumple: e => todasConMedalla(enGrupo(e, 'temas')) },
    { id: 'oro10', nombre: 'Lluvia de oro', texto: 'Reúne 10 medallas de oro.', cumple: e => e.oro >= 10 },
    { id: 'grandes', nombre: 'Todas las grandes ideas', texto: 'Consigue medalla en las 20 guías de Grandes ideas.', cumple: e => todasConMedalla(e.guias.filter(g => g.grupo !== 'temas')) },
    { id: 'todo', nombre: 'Astronomía para todos', texto: 'Consigue medalla en las 27 trivias del portal.', cumple: e => e.conMedalla === e.guias.length }
  ];

  // Próxima misión sugerida: primero mejorar lo que está cerca, después seguir el recorrido
  function mision(e) {
    const sinJugar = e.guias.find(g => !g.jugada);
    const casiOro = e.guias.filter(g => g.jugada && g.medalla && g.medalla.id !== 'oro').sort((a, b) => (b.mejor / b.total) - (a.mejor / a.total))[0];
    const sinMedalla = e.guias.find(g => g.jugada && !g.medalla);
    if (sinMedalla) return { guia: sinMedalla, texto: `Vuelve a jugar «${sinMedalla.titulo}»: con ${Math.ceil(sinMedalla.total * 0.5)} respuestas correctas ganas tu medalla de bronce.` };
    if (sinJugar && (!casiOro || e.jugadas < 3)) return { guia: sinJugar, texto: `Juega la trivia de «${sinJugar.titulo}» y suma una medalla nueva a tu colección.` };
    if (casiOro) return { guia: casiOro, texto: `Te falta${casiOro.total - casiOro.mejor === 1 ? '' : 'n'} ${casiOro.total - casiOro.mejor} respuesta${casiOro.total - casiOro.mejor === 1 ? '' : 's'} para el oro en «${casiOro.titulo}».` };
    if (sinJugar) return { guia: sinJugar, texto: `Juega la trivia de «${sinJugar.titulo}».` };
    return null;
  }

  // Dibujo de una medalla (SVG); sin nivel, un hueco punteado para la medalla que falta
  let nSvg = 0;
  function svgMedalla(nivel, tam = 56, etiqueta) {
    const t = etiqueta ? `role="img" aria-label="${etiqueta}"` : 'aria-hidden="true" focusable="false"';
    if (!nivel) return `<svg class="medalla vacia" width="${tam}" height="${tam}" viewBox="0 0 64 64" ${t}><circle cx="32" cy="38" r="19" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/><path d="M32 30.5l2.3 4.7 5.2.8-3.75 3.65.9 5.15L32 42.4l-4.65 2.4.9-5.15-3.75-3.65 5.2-.8z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
    const id = 'mg' + (++nSvg);
    return `<svg class="medalla ${nivel.id}" width="${tam}" height="${tam}" viewBox="0 0 64 64" ${t}>
      <defs><radialGradient id="${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="${nivel.color}"/><stop offset="1" stop-color="${nivel.color}" stop-opacity=".9"/></radialGradient></defs>
      <path d="M20 2h10l6 17h-10z" fill="#1b4fa8"/><path d="M44 2H34l-6 17h10z" fill="#c2410c"/>
      <circle cx="32" cy="38" r="20" fill="url(#${id})" stroke="#0b1730" stroke-opacity=".35" stroke-width="1.5"/>
      <circle cx="32" cy="38" r="14.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/>
      <path d="M32 29.5l2.6 5.3 5.8.85-4.2 4.1 1 5.8L32 42.8l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85z" fill="#fff" fill-opacity=".92"/>
    </svg>`;
  }

  return { svgMedalla, GUIAS, GRUPOS, NIVELES, RANGOS, LOGROS, porId, medalla, estado, estrellasPosibles };
})();
