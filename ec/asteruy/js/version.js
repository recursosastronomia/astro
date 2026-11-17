/*
 * ÚNICA fuente de la versión del álbum. La usan la página y el service worker.
 * Cada vez que cambies CUALQUIER archivo de la app (cromos, imágenes, estilos...)
 * sube APP_VERSION y agrega una nota: así los visitantes ven el aviso "Nueva versión".
 */
self.APP_VERSION = '1.6.2';
self.APP_NOTES = [
    'Aviso de licencia: los contenidos se comparten bajo CC BY-SA 4.0.',
    'Se quitó el botón de pausar animaciones, que se confundía con un botón de reproducir. Si tu dispositivo tiene activado «reducir movimiento», las animaciones se apagan solas.',
    'Nuevo aspecto, igual al del resto del portal (acentos en ámbar), con modo claro, modo noche y alto contraste para baja visión. El modo elegido se mantiene al pasar de una sección a otra.',
    'Mejoras de accesibilidad: etiqueta visible para el código y botón «Inicio» del portal.',
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
