# Sombras sonoras

Eclipses de Sol y de Luna (sin los penumbrales) entre 2020 y 2100, para escuchar desde cualquier lugar.
Funciona sin conexión una vez abierta (PWA). Seis idiomas embebidos: es, en, pt, fr, it, de.

DGES – EDyTIC – Contenidistas de Astronomía 2026 · recursosastronomia@gmail.com

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Todas las pantallas (lugar, lista, escuchar, qué es un eclipse, seguridad, acerca de) |
| `css/app.css` | Estilos propios; usa las variables `--ue-*` de `../ue/ue.css` (tema claro/oscuro/alto contraste del portal) |
| `js/strings.js` | Textos en los seis idiomas (mismas claves en todos) |
| `js/cities.js` | 233 ciudades de 100 países (incluye las 19 capitales departamentales de Uruguay y Punta del Este) |
| `js/eclipses.js` | Cálculo de eclipses y de la vista en cada instante |
| `js/luna.js` | Imagen realista de la Luna: proyecta el mapa del LRO sobre una esfera con la orientación del lugar |
| `js/worker.js` | Calcula la lista en segundo plano |
| `js/audio.js` | Sonido: instrumentos (piano, arpa, xilófono, violín), melodía y marcas |
| `js/app.js` | Interfaz, idioma, rutas, ubicación, imagen del Sol |
| `sw.js`, `manifest.webmanifest`, `icons/` | Instalación y uso sin conexión |

Depende de la carpeta compartida `../ue/` (ue.css, ue.js). Debe publicarse junto al resto de GithubUE.

## Al modificar algo

Subir `VERSION` en `sw.js` (por ejemplo `sombras-1.0.1`). Así los dispositivos que ya la instalaron
reciben la versión nueva y ven el aviso «Actualizar».

## Cálculo

- Astronomy Engine 2.1.19, de Don Cross, licencia MIT (`js/astronomy.browser.min.js`, incluye la licencia).
- Eclipses solares: búsqueda local para el lugar elegido; porcentaje = área del Sol cubierta por la Luna vista desde ese lugar.
- Eclipses lunares: sombra de la Tierra según el método de Danjon. Se omiten los penumbrales.
- Contrastado con los catálogos de F. Espenak (NASA) con diferencias de segundos.

## Imágenes

- Sol: imagen del día de SDO/HMI (NASA/SDO). Sin conexión se usa `img/sol/sol-respaldo.jpg` (SDO, 16/11/2026).
- Luna: `img/luna/luna-lroc-cercana.jpg`, recorte de la cara visible (longitudes −110° a +110°, 2504 × 2048 px)
  del mapa `lroc_color_poles_4k.tif` del CGI Moon Kit (NASA/GSFC/Arizona State University, LROC; dominio público,
  https://svs.gsfc.nasa.gov/4720). Se proyecta en el dispositivo con la libración, el eje lunar (modelo IAU) y el
  giro del campo visual: «arriba» es el cenit del observador, como se ve a simple vista en cualquier latitud.
  En los eclipses de Sol la misma imagen, con la misma orientación, forma el disco que pasa delante del Sol,
  oscurecida al 85 % (Luna nueva: cara no iluminada). En el tema de alto contraste se mantiene el disco negro liso.
- `img/seguridad/lentes.jpg`: NASA Scientific Visualization Studio, eclipse del 14/10/2023. Dominio público.
- `img/seguridad/proyeccion.jpg`: Tofeiku, Wikimedia Commons, CC BY-SA 4.0
  (https://commons.wikimedia.org/wiki/File:Partial_solar_eclipse_pinhole_projector.jpg).
- `img/seguridad/telescopio-filtro.jpg`: NASA/Bill Ingalls, 8/4/2024. Dominio público
  (https://commons.wikimedia.org/wiki/File:2024_Total_Solar_Eclipse_(NHQ202404080207).jpg).

Los créditos también aparecen dentro de la app, en «Acerca de».

## Accesibilidad

Pensada para WCAG 2.2 AA: contraste verificado en claro, oscuro y alto contraste; navegación completa con teclado;
anuncios por lector de pantalla (fases, porcentaje); voz y vibración opcionales; respeta «reducir movimiento».

## Portada y licencia

Enlazada desde la portada del portal (`../index.html`) en segundo lugar, como «Sombras sonoras hasta 2100».
Los contenidos se comparten bajo licencia CC BY-SA 4.0 (política de Uruguay Educa), salvo las imágenes de terceros,
que conservan la licencia indicada en sus créditos. El aviso lo agrega `../ue/ue-licencia.js` al pie de la app.
