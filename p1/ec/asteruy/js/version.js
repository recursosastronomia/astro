/*
 * ÚNICA fuente de la versión del álbum. La usan la página y el service worker.
 * Cada vez que cambies CUALQUIER archivo de la app (cromos, imágenes, estilos...)
 * sube APP_VERSION y agrega una nota: así los visitantes ven el aviso "Nueva versión".
 */
self.APP_VERSION = '1.6.2';
self.APP_NOTES = [
    'La órbita también se gira con botones, sin arrastrar.',
    'Nuevo diseño, igual al del resto de «Astronomía para todos»: letra más fácil de leer, modo noche y los cromos que faltan como huecos numerados del álbum.',
    'Ahora explica de dónde salen los códigos: te los da tu docente o los encuentras en ferias de ciencias.',
    'Mejoras de accesibilidad: etiqueta visible para el código, botón para pausar las animaciones y botón «Inicio» del portal.',
    'Fotos nuevas de Yamandú Fernández, Juan Ángel Viera, Andrea Sosa Oyarzabal, Alejandro Galli, Lágrima Ríos, Félix Cernuschi, Martha Nieves, Julia Venturini, Sebastián Bruzzone y Adrián Rodríguez Colucci.',
    'La órbita ahora es un modelo 3D: gíralo con un dedo y mira su inclinación.',
    'Fotos nuevas de Javier Licandro, Tabaré Gallardo y Pablo Lemos.',
    '¡40 cromos: 39 asteroides con nombres uruguayos y un cromo de regalo!',
    'El cromo N.º 01 se gana al instalar el álbum.',
    'Funciona sin conexión.',
    'Disponible en español, inglés, francés, portugués, italiano y alemán.',
    'Nueva sección «Instituciones» en Fuentes y créditos.',
    'Estadísticas anónimas de uso con GoatCounter (sin cookies ni datos personales).'
];
