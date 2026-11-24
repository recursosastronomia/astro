# Cartas astronómicas · Sistema Solar

Juego de naipes de astronomía: un duelo de datos con 30 astros del Sistema Solar. Se juega entre dos celulares, que se invitan con un código QR. Las partidas y las jugadas se guardan en la planilla **adriancartas** (https://docs.google.com/spreadsheets/d/1FufzI9K0DzNpW6vYBhNP6ddsmZZS-scbxc-9uCUt40o/edit) en el momento en que ocurren.

**Naipes y mecánica de juego:** Prof. Adrián Basedas · DGES - Observatorio Astronómico Liceo n°9
**Juego entre dispositivos:** con la colaboración del plantel UE · Astronomía para todos · DGES - EDyTIC
Contacto: recursosastronomia@uruguayeduca.edu.uy · Contenidos bajo licencia CC BY-SA 4.0.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | **El juego: es el archivo que se abre para jugar.** Partidas entre dos celulares, práctica contra la computadora, catálogo, ranking e impresión de naipes. Usa la capa visual del portal (`../ue/`). |
| `config.js` | La URL del servidor (Apps Script). Se completa una sola vez; con eso el juego se conecta solo. |
| `data.js` | Mazo original del Prof. Basedas (30 cartas, 10 datos cada una). Lo usan la práctica y el catálogo cuando no hay planilla conectada. |
| `img/` | Imágenes de las cartas (`<id>.jpg`). |
| `Code.gs` | El servidor: se pega en Apps Script, dentro de la planilla. Ya trae el ID de la planilla *adriancartas* (constante `ID_PLANILLA`). |
| `manifest.json`, `sw.js`, `icon.svg` | Instalación como app y funcionamiento sin conexión de la práctica y el catálogo. |

Las dos versiones anteriores están en `versiones_anteriores/`: `cartas-astronomicas/Cartas Astronómicas.html` (catálogo original del Prof. Basedas, sigue funcionando con `data.js` e `img/`) y `duelo-de-astros/index2.html` (primer prototipo). `index.html` las reemplaza. En `video/` está la demostración de 2 minutos.

## Puesta en marcha (una sola vez)

1. **Planilla.** Abrir la planilla, ir a *Extensiones › Apps Script*, borrar lo que haya y pegar todo `Code.gs`. Guardar.
2. **Crear las hojas.** Elegir la función `setup` y tocar *Ejecutar*. Aceptar los permisos con tu cuenta. Se crean:
   - **Mazo**: las 30 cartas de Basedas, con los valores en el mismo formato que en las cartas impresas (`0,387`, `1.407,6`, `2,2e-12`). Una nota corta va después de `|`, por ejemplo `2,21|semieje`.
   - **Parámetros**: `rondas_tope`, `segundos_actualizacion`, `segundos_cache_mazo`, `segundos_turno` (tiempo para elegir; al terminar se elige un dato al azar; 0 = sin límite) y `ver_mano` (1 = cada jugador recorre su pila en el carrusel; 0 = solo ve la carta de arriba, regla clásica).
   - **Partidas**: una fila por partida (código, estado, turno, jugadores, cartas de cada uno, centro de la mesa, última jugada).
   - **Jugadas**: el historial de cada ronda, con los valores comparados.
   - **Finales**: una fila por partida terminada, con el ganador, el motivo (juntó todas las cartas, tope de rondas o abandono), las rondas y la duración.
   - **Jugadores**: partidas jugadas, ganadas, perdidas, empatadas y abandonadas de cada nombre.
   - **Ranking**: iniciales, modalidad, jugadas y segundos de cada partida ganada juntando todo el mazo.
3. **Publicar el servidor.** *Implementar › Nueva implementación ›* **Aplicación web**. *Ejecutar como:* **Yo**. *Quién tiene acceso:* **Cualquier persona**. Copiar la URL que termina en `/exec`.
4. **Conectar (una sola vez).** Abrir `config.js` y pegar la URL entre las comillas:
   `window.NAIPES_API = "https://script.google.com/macros/s/…/exec";`
   Subir el cambio a GitHub. Desde ese momento el juego se conecta solo: los estudiantes no configuran nada y no ven el panel *Conexión con la planilla*.
   Para revisar la conexión como docente: abrir `…/naipes/?docente`. Aparece el panel y debe decir "Conectada: 30 cartas".

El juego tiene que estar publicado dentro del portal (por ejemplo `GithubUE/naipes/`), porque toma la barra, los modos y las tipografías de `../ue/`.

## Una partida

1. Primer celular: escribir el nombre y tocar **Crear partida e invitar**. Aparecen un QR y un código de 4 letras.
2. Segundo celular: escanear el QR con la cámara. El juego se abre con la invitación y la conexión ya cargadas; solo hay que escribir el nombre. Sin cámara, se puede escribir el código.
3. Se reparten todas las cartas. Quien tiene el turno toca un dato de su carta y **gana el valor más alto**. El ganador se lleva las dos cartas al fondo de su pila y vuelve a elegir. En empate, las cartas van al centro, sigue eligiendo el mismo jugador y el próximo ganador se las lleva.
4. Gana quien junta todo el mazo. Si se llega a `rondas_tope`, gana quien tenga más cartas.

Si un celular se cierra o se recarga, en el inicio aparece **Volver a la partida XXXX**.

## Ranking

- Entra quien gana **juntando las 30 cartas** (no cuentan el tope de rondas ni los abandonos). Escribe 3 iniciales; se rechazan combinaciones inconvenientes, tanto en el juego como en la planilla.
- Orden principal: **menos jugadas** (mínimo posible: 15), y a igual cantidad, **menos tiempo**. También se puede ver ordenado por tiempo.
- Las partidas entre dos celulares y las de práctica (por nivel) van en tablas separadas. En las partidas entre celulares, las jugadas y el tiempo los mide la planilla, no el teléfono.
- El ranking se muestra como los créditos de una película: los primeros 15 pasan despacio y después acelera hasta la fila de quien acaba de terminar, que queda resaltada. Tiene botones para pausar y saltar.
- Para borrar una entrada inconveniente, se elimina su fila en la hoja **Ranking**.

## Modificar desde la planilla

- **Mazo**: se pueden corregir valores o agregar cartas (`id` en minúsculas, igual al nombre de su imagen en `img/`). Los cambios llegan al juego en unos 30 segundos. Si el mazo queda impar, un jugador recibe una carta más. El tipo tiene que ser uno de los seis de `data.js` para tomar su color.
- **Partidas**: `mano_anfitrion`, `mano_invitado` y `pozo` son listas de `id` separadas por comas; la primera es la carta visible. `turno` vale `anfitrion` o `invitado`; `estado` vale `esperando`, `jugando` o `fin`. Las columnas ocultas guardan los tokens de cada celular: no hay que tocarlas.
- **Parámetros**: con muchas parejas jugando a la vez conviene subir `segundos_actualizacion` a 3 o 4.

Si se cambia `Code.gs`: *Implementar › Gestionar implementaciones › Editar › Versión nueva*. Así la URL `/exec` no cambia.

## Imprimir los naipes

En *Catálogo › Imprimir naipes* se imprimen las 30 cartas en 63 × 88 mm, 9 por hoja A4 (4 hojas). Conviene activar "Gráficos de fondo" en el diálogo de impresión.
