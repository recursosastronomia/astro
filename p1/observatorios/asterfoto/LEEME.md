# Planificador de asteroides (asterfoto)

> **Versión p1 del portal** (`GithubUE/p1/observatorios/asterfoto`, copiada el 24/11/2026 desde `GithubUE/observatorios/asterfoto`).
> Usa los recursos compartidos de p1 en lugar de la carpeta `ue/` de la versión actual del sitio:
>
> | Recurso | De dónde viene |
> |---|---|
> | Paleta, tipografías (Bricolage Grotesque y Atkinson Hyperlegible), modo noche y alto contraste, botón Inicio, marca EDyTIC, barra `.l-barra` y botones `.l-tema`, pie `.sitio-pie` | `../../css/astro.css` (con `../../fonts/`) |
> | Botones «Modo noche» (`#tema`) y «Alto contraste» (`#contraste`), claves `astro-tema` y `astro-contraste` | `../../js/tema.js` |
> | Logo EDyTIC, logo de Uruguay Educa, íconos de la pestaña | `../../img/` |
> | Traducción de las variables `--ue-*` de `css/app.css` a las de p1, y valores que p1 no define | `css/p1.css` (propio) |
> | `data-ue-theme` («light», «dark», «hc») a partir de los atributos que deja `tema.js` | `js/p1-modo.js` (propio) |
>
> - La elección de modo es la misma que en el resto de p1. El idioma (español/inglés) sigue siendo propio de la app.
> - El botón Inicio lleva a la portada de la herramienta; todavía no hay enlace desde la portada de p1.
> - La caché del service worker se llama `asterfoto-p1-…`, para no borrar la de la versión actual del sitio (`asterfoto-…`).
> - Los cambios de funciones se hacen en las dos copias; los de estilo de p1 llegan solos desde `css/astro.css`.


Aplicación web instalable (PWA) del portal *Astronomía para todos* (Uruguay Educa · ANEP-DGES · EDyTIC).
Responde a esta pregunta: **¿qué asteroides puedo fotografiar esta noche desde mi lugar, con mi cámara, y cuánto tiempo dejar entre fotos?**

Todo se calcula en el navegador, también sin conexión. No hace falta un servidor ni consultar las API de JPL en vivo. Esas API no aceptan llamadas desde páginas web (CORS), así que la app usa los elementos orbitales descargados en dos archivos JSON.

## Páginas

| Página | Para qué |
|---|---|
| `index.html` | Portada en español e inglés: finalidad, qué son los asteroides y los NEO, cómo se detecta un asteroide con fotos, guía paso a paso de 11 pasos (incluye pasajes cercanos e identificación del campo), invitación a compartir los resultados (#asterfoto), 16 preguntas frecuentes, cálculos y datos, nota de transparencia sobre el uso de IA (con el pedido de reportar errores a recursosastronomia@uruguayeduca.edu.uy) y fuentes |
| `planificador.html` | Planificador de la observación (detallado abajo) |
| `comparador.html` | Comparador de parpadeo: alinea de 2 a 8 fotos de una sesión y las muestra en secuencia |
| `fuentes.html` | Métodos y fuentes científicas: datos, cada algoritmo con su referencia, validación con JPL Horizons, cómo rehacer la propuesta, créditos de imágenes, licencias y 21 referencias bibliográficas |

El idioma elegido se recuerda en las cuatro páginas (`localStorage` `asterfoto.lang`).

## Comparador de fotos

- Lee fotos JPG, PNG o WebP. Los archivos RAW hay que exportarlos antes. Ordena las fotos por la hora EXIF (DateTimeOriginal) y, si alguna no la tiene, por el nombre del archivo.
- Trabaja con las fotos reducidas a 1600 píxeles de lado mayor. Detecta hasta 80 estrellas por foto: resta el fondo local, busca máximos de más de 5 σ y calcula su centroide.
- Calcula el giro y el corrimiento de cada foto respecto de la primera. Vota sobre pares de estrellas de igual separación y ajusta por mínimos cuadrados con las estrellas coincidentes. No corrige cambios de escala, porque las fotos deben venir de la misma cámara.
- «Normalizar brillo y contraste de las imágenes» (activada por defecto): a cada foto le resta el fondo local (media 65×65), así quita el resplandor y los degradés. Después iguala su contraste con el de la foto 1, usando el percentil 99,9 del residuo, y aplica a todas el mismo realce. Con la opción activada las fotos se ven en blanco y negro; sin ella se ven tal como salieron, en color y con un mismo realce. «Resaltar cambios» usa las fotos normalizadas si la opción está activada.
- Ofrece tres vistas: la foto con realce del brillo, el negativo y «Resaltar cambios». Esta última toma cada foto, le resta la mediana de todas, la suaviza en 3×3, descarta lo que esté por debajo de 4 σ y agranda los puntos.
- La secuencia avanza a 0,5, 1, 2 o 3 fotos por segundo, nunca más, por la pauta WCAG 2.3.1 sobre destellos. Nunca arranca sola y se detiene si la pestaña queda oculta.
- La lupa dinámica (1× apagada, 2×, 4×, 8×) agranda un círculo que sigue al mouse, al dedo o a las flechas, también mientras corre la secuencia. Es independiente del zoom general (hasta 16×).
- Para marcar el objeto se toca la imagen o se usan las flechas del teclado más Enter. La app informa el desplazamiento en píxeles de la foto original y, si hay hora EXIF, en píxeles por minuto.
- Las fotos de ejemplo son simuladas: 420 estrellas, un asteroide que avanza 11 × 6 píxeles cada 10 minutos, un píxel caliente fijo en el sensor, el trazo de un satélite en la foto 4 y bruma en la foto 5. Entre tomas, la «cámara» gira 0,45° y se corre al azar.
- **Video MP4 para redes sociales.** Usa la vista actual (modo, zoom y encuadre) y la velocidad elegida. Agrega la marca de agua `#asterfoto #<NombreDelAsteroide>` y, si se pide, la hora de cada foto y las marcas del objeto.
  - Formato: 1280 píxeles de ancho, 30 cuadros por segundo, entre 8 y 15 segundos, con la secuencia repetida.
  - Se codifica en H.264 con WebCodecs y se arma el archivo con [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT, en `js/vendor/`).
  - Si el navegador no ofrece WebCodecs, se graba con MediaRecorder: sale en MP4 donde se pueda y, si no, en WebM, con aviso.
  - El nombre del asteroide llega solo desde el planificador (`comparador.html?ast=...`).
- Las fotos se procesan en el navegador y no se envían a ningún servidor.

## Qué hace el planificador

- **Lugar:** GPS del celular, la ciudad más cercana (Uruguay y América del Sur) o coordenadas exactas.
- **Fechas:** «Desde la noche del» y «Hasta el amanecer del». Al cambiar «Desde», «Hasta» pasa al día siguiente (una noche). Se puede extender hasta 31 noches; si «Hasta» queda antes de «Desde» o el período pasa de 31 noches, se corrige y se avisa.
- **Noche:** puesta y salida del Sol, la noche cerrada (Sol a más de 18° bajo el horizonte), y la fase y las horas de la Luna. Con varias noches, una tabla con la oscuridad y la Luna de cada una.
- **Planetas enanos:** Ceres, Plutón, Haumea, Eris y Makemake están en el catálogo de cuerpos menores. En la lista llevan la etiqueta «Planeta enano» y, en el detalle, la aclaración «Actualmente recategorizado como planeta enano». En todos los textos donde se los nombra se agrega esa aclaración.
- **Varias noches:** cada asteroide aparece una sola vez, con su noche recomendada (la de mayor brillo; para un NEO, la de menor distancia a la Tierra). Al abrirlo, la tabla «Noche por noche» lista las noches en que se puede fotografiar (hora, rumbo, altura, brillo, velocidad y, para los NEO, distancia) y el botón «Ver» cambia el plan a esa noche. Con 31 noches y el perfil de telescopio, la búsqueda tarda alrededor de 1 s.
- **Plan para NEO:** nunca «una foto por noche». La serie se hace en la misma noche; si el tiempo en que el NEO está alto no alcanza para el desplazamiento pedido, se ajusta el intervalo y se sugiere una focal mayor o la noche de mayor acercamiento. Se agregan la exposición máxima sin trazo (2 px), el aviso de confirmar la posición y un botón con las efemérides de JPL Horizons (API en texto) para esa noche y ese lugar. Con una sola noche, si el NEO pasa más cerca otro día, se avisa.
- **Equipo:** cuatro perfiles (celular, réflex con 50 mm, réflex con 300 mm, telescopio de 800 mm) o datos propios. El perfil fija la magnitud límite inicial.
- **Lista de asteroides:** brillo estimado, mejor momento, rumbo con 16 puntos cardinales, altura en grados y en «puños», movimiento en ″/min y ventana horaria.
- **Para cada asteroide:**
  - una frase en lenguaje llano;
  - una rosa de los vientos y un arco de altura;
  - una carta del cielo local, mirando hacia el asteroide o con el Norte arriba;
  - una brújula del celular con corrección magnética;
  - el encuadre de la cámara y un acercamiento en píxeles;
  - un plan de 3 o 5 fotos, con el intervalo calculado según el equipo (o una foto por noche si el asteroide se mueve muy poco);
  - los datos técnicos, la exportación a CSV, la impresión y enlaces a Stellarium Web y a JPL.
- **Idiomas:** español e inglés. Modos claro, noche y alto contraste del portal (`../../ue/`). WCAG 2.2 AA.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html`, `planificador.html`, `comparador.html`, `fuentes.html` | Las cuatro páginas |
| `css/app.css` | Estilos propios (sobre `../../ue/ue.css`) |
| `js/astro.js` | Motor de cálculo (Kepler, precesión, alt/az, Luna, crepúsculos, magnitud H-G) |
| `js/app.js` | Interfaz del planificador |
| `js/comparador.js` | Comparador de fotos |
| `js/pagina.js` | Idioma de la portada y del comparador |
| `js/i18n-extra.js` | Textos de la portada y del comparador |
| `js/vendor/mp4-muxer.js` | Arma el archivo MP4 del video (MIT; ver `LICENCIA-mp4-muxer.txt`) |
| `js/i18n.js` | Textos en español e inglés |
| `js/lugares.js` | Ciudades con coordenadas y zona horaria |
| `js/cielo.js` | Estrellas hasta magnitud 6 y constelaciones (d3-celestial, BSD-3; ver `LICENCIA-d3-celestial.txt`) |
| `sbdb_brillantes.json` | Asteroides con H < 13 (JPL SBDB) |
| `sbdb_neo.json` | Asteroides cercanos a la Tierra con H < 20 (JPL SBDB) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Instalación y funcionamiento sin conexión |

## Actualizar los elementos orbitales (cada 6 meses)

Los elementos orbitales envejecen. Con más de un año desde la época, los errores empiezan a crecer, sobre todo en los asteroides cercanos a la Tierra.

1. Abre cada enlace en el navegador. Guárdalo con Ctrl+S en esta carpeta, con el nombre exacto y el tipo «Todos los archivos»:
   - `sbdb_brillantes.json`:
     <https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=pdes,name,epoch,e,a,i,om,w,ma,H,G,neo,class&sb-kind=a&full-prec=1&sb-cdata=%7B%22AND%22%3A%5B%22H%7CLT%7C13%22%5D%7D>
   - `sbdb_neo.json`:
     <https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=pdes,name,epoch,e,a,i,om,w,ma,H,G,neo,class&sb-kind=a&sb-group=neo&full-prec=1&sb-cdata=%7B%22AND%22%3A%5B%22H%7CLT%7C20%22%5D%7D>
2. En `sw.js`, sube el número de `CACHE_VERSION` (por ejemplo, `asterfoto-v2`). Así los celulares con la app instalada descargan los datos nuevos.

El parámetro `full-prec=1` es importante. Sin él, JPL redondea los elementos y la posición de un asteroide que pasa cerca de la Tierra puede errar en medio grado.

## Precisión (comparada con JPL Horizons, 22/11/2026, Montevideo)

| Objeto | Error de posición | Error de magnitud | Error del movimiento |
|---|---|---|---|
| (1) Ceres (actualmente recategorizado como planeta enano), (4) Vesta | 0,15′ (9″) | ≤ 0,01 | < 1 % |
| (433) Eros | 0,11′ (7″) | 0,00 | < 1 % |
| (217628) Lugh, NEO a 0,09 UA | 2,5′ | 0,01 | 1 % |

El cálculo no incluye las perturbaciones de los planetas, la nutación ni la aberración. Para encuadrar una foto alcanza de sobra. Para un asteroide que pasa muy cerca de la Tierra, la app recomienda confirmar la posición en JPL Horizons.

## Publicación

La carpeta va en `GithubUE/observatorios/asterfoto/`. Usa `../../ue/` (estilos, fuentes, modos y licencia) y `../../img/logo-edytic-marca.png`. Hay que publicarla por HTTPS (GitHub Pages sirve) para que funcionen el GPS, la brújula y el modo sin conexión.

## Control de los datos

Al cargar los archivos, la app descarta:

- las filas con algún elemento orbital vacío;
- las órbitas abiertas (e ≥ 1, como los objetos interestelares);
- en cada búsqueda, los objetos cuyos elementos tienen más de 3 años de antigüedad respecto de la fecha elegida.

Esos objetos son, en general, asteroides perdidos o transneptunianos. Con elementos tan viejos, y sin las perturbaciones de los planetas, su posición calculada no es confiable. Eso deja afuera, por ejemplo, a Plutón (actualmente recategorizado como planeta enano): su época en la SBDB es de 2016.

Revisión del 21/11/2026: `sbdb_brillantes.json` tiene 16.291 filas y `sbdb_neo.json`, 4.810. Los dos coinciden con el `count` declarado por JPL y están en precisión completa. Se descartan 3 filas: 1 incompleta y 2 órbitas abiertas. Hay 1.532 objetos con época anterior a octubre de 2024, casi todos transneptunianos. La época principal es el 9 de junio de 2026.

## Encabezado, pie y licencia (iguales en las cuatro páginas)

- **Encabezado:** la barra de EDyTIC del portal (`ue-appbar`), con el botón de inicio, el logo de Educación y TIC, «Astronomía para todos · DGES - EDyTIC», el botón de idioma y los botones de modo noche y alto contraste de `ue.js`.
- **Pie:**
  - la tarjeta de Uruguay Educa;
  - la franja de accesibilidad (`.a11y-declaracion`, con el mismo estilo que `index.html` y `mhp` del portal);
  - debajo, con el mismo fondo, la línea **CC BY-SA 4.0** con sus íconos. La agrega `ue/ue-licencia.js`, que se carga desde `ue.js`.
- **Botón de inicio:** por ahora lleva a la portada de esta herramienta (`index.html`), porque todavía no está integrada en la página de inicio de GithubUE. Al integrarla, cambiar en las cuatro páginas `href="index.html" class="ue-home"` por `href="../../index.html" class="ue-home"`, y en `js/i18n.js` el texto `homeLabel` por «Volver al inicio del portal».

## Video de demostración

- Está en `demo/`:
  - `asterfoto-demo-web.mp4`: 1280 × 720, 17,8 MB. Es el que se ve en la portada.
  - `asterfoto-demo.mp4`: 1920 × 1080, 48 MB. Se descarga desde la portada.
  - `asterfoto-demo-poster.jpg`: imagen de portada del reproductor.
- Dura 2 min 48 s y no tiene sonido; los subtítulos están en la imagen.
- El reproductor de la portada está en la sección `#demo` (al final), con su script `js/demo.js`. Tiene:
  - los controles del navegador;
  - controles propios: reproducir o pausar, 10 s atrás o adelante, velocidad de 0,5× a 2× y la hora del video;
  - botones para ir a cada capítulo (portada en 0:04, planificador en 1:01, comparador en 1:44);
  - una descripción del video en texto, en español e inglés, para cumplir WCAG 1.2.1 (video sin sonido).
- El service worker no guarda la carpeta `demo/` para usar sin conexión: el video es grande y el navegador lo pide por partes.
- Para saltar a un capítulo, el servidor tiene que aceptar descargas por partes (Range). GitHub Pages las acepta.

## Pasajes cercanos (planificador)

- Después de cada búsqueda se recorren los NEO, día por día, durante los 30 días siguientes a la fecha elegida.
- Se listan los que pasan a menos de 0,1 UA (unos 15 millones de km) y llegan a la magnitud límite del equipo. Para cada uno se muestran:
  - la fecha y la distancia del máximo acercamiento (refinada hora por hora), en millones de km y en distancias Tierra-Luna;
  - la noche y la magnitud de mayor brillo;
  - la velocidad en el cielo;
  - si se ve desde el lugar, con la mejor hora, el rumbo y la altura.
- «Planificar esa noche» cambia la fecha, busca y abre el plan de ese asteroide. En la lista general llevan la insignia «Pasaje cercano».
- Se comparó con JPL Horizons el 21/11/2026 y coincide en la fecha del acercamiento, la distancia y el brillo máximo:
  - (217628) Lugh: 0,071 UA el 28/11, 0 h UT;
  - 2016 NV: 0,037 UA el 9/12.
- Para pasajes a menos de 0,02 UA la app avisa que la gravedad de la Tierra curva la órbita y sugiere confirmar con JPL Horizons. La lista oficial está en NASA CNEOS.

## Identificar estrellas y el asteroide (comparador)

- **Datos que necesita:** el nombre del asteroide, el lugar, la hora de las fotos (EXIF o ingresada a mano) y la escala en ″/px (de la distancia focal y el píxel).
  - Desde el planificador, el enlace «Comparar mis fotos de este asteroide» los pasa en la URL (`ast`, `pdes`, `lat`, `lon`, `f`, `pix`).
  - Si no, se toman del último uso o de las preferencias del planificador.
- **Cómo reconoce el campo:**
  - Calcula dónde estaba el asteroide en la foto 1.
  - Proyecta alrededor las estrellas de `js/estrellas8.js` (41.411 estrellas de Hipparcos hasta magnitud ~8; se carga solo al usar esta función).
  - Busca la semejanza que mejor lleva el catálogo a las estrellas detectadas en la foto: escala ±20 %, cualquier giro, imagen directa o espejada. Usa votación por pares y ajuste por mínimos cuadrados.
- **Qué muestra:**
  - rótulos con nombre o designación y magnitud de las 14 estrellas más brillantes del campo, sin encimarse;
  - un círculo punteado con la posición prevista del asteroide en cada foto y su recorrido;
  - el centro de la foto (ascensión recta y declinación), la escala medida y hacia dónde está el norte.
  - Si hay marcas, compara la distancia mediana entre las marcas y lo previsto. Por debajo de 90″ informa «¡Coincide!».
- **Límite:** en campos muy chicos (telescopios de foco largo) hay pocas estrellas del catálogo y puede no reconocerse.
- **Fotos de ejemplo:** ahora usan el cielo real: Lugh la noche del 22 al 23/11/2026 desde Montevideo, a 11,1″/px. En la prueba se reconocieron 11 estrellas, la escala medida fue exacta y las marcas quedaron a 3 píxeles de la posición prevista.

## Idioma

Los textos en español usan tuteo neutro, sin voseo (por ejemplo «elige», «mira», «puedes»).

## Imágenes de Wikimedia Commons

Se muestran directamente desde `upload.wikimedia.org` (carga diferida, con texto alternativo y pie con autoría, licencia y enlace a la ficha). Todas son de dominio público; licencias verificadas en la API de Commons el 21/11/2026.

| Imagen | Dónde | Autoría | Ficha |
|---|---|---|---|
| (1) Ceres (actualmente recategorizado como planeta enano), Dawn 2015 | Portada, «¿Qué es un asteroide?» | NASA/JPL-Caltech/UCLA/MPS/DLR/IDA | `File:PIA19562-Ceres-DwarfPlanet-Dawn-RC3-image19-20150506.jpg` |
| (4) Vesta, Dawn 2012 | Portada, ídem | NASA/JPL-Caltech/UCLA/MPS/DLR/IDA | `File:Vesta_full_mosaic.jpg` |
| (433) Eros, NEAR 2001 | Portada, ídem | NASA/NEAR Project (JHU/APL) | `File:433eros.jpg` |
| Dimorphos, DART 2022 | Portada, «Asteroides cercanos a la Tierra» | NASA/Johns Hopkins APL | `File:All_dimorphos_dart_0401930040_12262_01_iof_imagedisplay-final.png` |
| Placas del descubrimiento de Plutón (actualmente recategorizado como planeta enano), 1930 | Portada, «¿Cómo se ve?», y comparador | Clyde Tombaugh, Observatorio Lowell | `File:Pluto_discovery_plates.png` |

- El service worker no guarda imágenes de otro origen. Sin conexión, cada figura se oculta sola (`onerror`).
- Los créditos están en tres lugares: el pie de cada figura, «Créditos y fuentes» de la portada (y del comparador) y la sección 6 de `fuentes.html`.

## Métodos y fuentes (`fuentes.html`)

- Un bloque por idioma (`.lang-block[data-lang]`); `js/pagina.js` muestra el que corresponde.
- Las referencias se numeran por orden alfabético. Si se agrega una, conviene regenerar la numeración de las citas `[n]` (cada cita enlaza a `#es-r-…` o `#en-r-…`).
- En pantallas angostas las tablas de métodos se ven como tarjetas (cada celda lleva `data-label`).
- Al cambiar un algoritmo en `js/astro.js` o `js/comparador.js`, actualizar también su fila en `fuentes.html`.
