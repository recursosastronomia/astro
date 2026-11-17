/*
 * ÚNICA fuente de la versión del álbum. La usan la página y el service worker.
 * Cada vez que cambies CUALQUIER archivo de la app (cromos, imágenes, estilos...)
 * sube APP_VERSION y agrega una nota: así los visitantes ven el aviso "Nueva versión".
 */
self.APP_VERSION = '1.1.1';
self.APP_NOTES = [
    'Aviso de licencia: los contenidos se comparten bajo CC BY-SA 4.0.',
    'Nuevo aspecto, igual al del portal de astronomía, con modo claro, modo noche y alto contraste para baja visión.',
    '¡16 cromos de grandes personalidades de la ciencia!',
    'Retratos incluidos: funciona sin conexión.',
    'El botón "Instalar" ya no aparece cuando el álbum está instalado.'
];
