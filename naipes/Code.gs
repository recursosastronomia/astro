/**
 * Cartas astronómicas — servidor de partidas en Google Apps Script
 * Planilla: adriancartas
 *   https://docs.google.com/spreadsheets/d/1FufzI9K0DzNpW6vYBhNP6ddsmZZS-scbxc-9uCUt40o/edit
 *
 * Naipes y mecánica de juego: Prof. Adrián Basedas (DGES - Observatorio Astronómico Liceo n°9).
 * Juego entre dispositivos: con la colaboración del plantel UE
 * (Astronomía para todos · DGES - EDyTIC).
 *
 * Instalación (una sola vez):
 *  1. En la planilla: Extensiones > Apps Script. Borrar el contenido y pegar este archivo. Guardar.
 *  2. Elegir la función setup y tocar Ejecutar (pide permisos la primera vez).
 *     Crea las hojas Mazo (30 cartas), Parámetros, Partidas, Jugadas, Finales, Jugadores y Ranking.
 *  3. Implementar > Nueva implementación > Tipo: Aplicación web.
 *     Ejecutar como: Yo.  Quién tiene acceso: Cualquier persona.
 *  4. Copiar la URL que termina en /exec y pegarla en naipes/config.js (window.NAIPES_API).
 *
 * Si se cambia este código: Implementar > Gestionar implementaciones > Editar > Versión nueva.
 */

/* Planilla donde se guardan mazo, parámetros, partidas, jugadas, finales, jugadores y ranking.
   Si algún día se cambia de planilla, alcanza con cambiar este ID (la parte de la URL entre /d/ y /edit). */
const ID_PLANILLA = '1FufzI9K0DzNpW6vYBhNP6ddsmZZS-scbxc-9uCUt40o';
let LIBRO_ = null;
function libro() { return LIBRO_ || (LIBRO_ = SpreadsheetApp.openById(ID_PLANILLA)); }

const HOJA_MAZO = 'Mazo';
const HOJA_PART = 'Partidas';

/* ---------- Mazo del Prof. Adrián Basedas (DGES - Observatorio Astronómico Liceo n°9) ----------
   Valores con coma decimal y punto de miles, como en las cartas impresas.
   "|" separa el valor de una nota corta (semieje, var., prom., ☉). */
const MAZO_INICIAL = [
 {id:"mercurio",n:"Mercurio",t:"Planeta",m:"0,055",d:"4.879",au:"0,387",rho:"5,43",T:"167",g:"3,7",ve:"15.300",day:"1.407,6",yr:"0,24",vo:"170.500"},
 {id:"venus",n:"Venus",t:"Planeta",m:"0,815",d:"12.104",au:"0,723",rho:"5,24",T:"464",g:"8,87",ve:"37.290",day:"5.832",yr:"0,615",vo:"126.072"},
 {id:"tierra",n:"Tierra",t:"Planeta",m:"1",d:"12.742",au:"1",rho:"5,51",T:"15",g:"9,81",ve:"40.270",day:"24",yr:"1",vo:"107.200"},
 {id:"marte",n:"Marte",t:"Planeta",m:"0,107",d:"6.779",au:"1,524",rho:"3,93",T:"-60",g:"3,71",ve:"18.100",day:"24,6",yr:"1,88",vo:"86.868"},
 {id:"encke",n:"Cometa Encke",sub:"2P/Encke",t:"Cometa",m:"2,2e-12",d:"4,8",au:"2,21|semieje",rho:"0,5",T:"-70|var.",g:"0,0003",ve:"7,2",day:"15",yr:"3,3",vo:"106.000|prom.",fit:"cover"},
 {id:"vesta",n:"4 Vesta",t:"Asteroide",m:"4,35e-5",d:"525",au:"2,36",rho:"3,45",T:"-140",g:"0,25",ve:"1.260",day:"5,34",yr:"3,63",vo:"69.800"},
 {id:"ceres",n:"Ceres",t:"Planeta enano",m:"0,00016",d:"940",au:"2,77",rho:"2,16",T:"-105",g:"0,27",ve:"1.836",day:"9,07",yr:"4,6",vo:"64.400"},
 {id:"pallas",n:"2 Pallas",t:"Asteroide",m:"3,4e-5",d:"512",au:"2,77",rho:"2,89",T:"-110",g:"0,21",ve:"1.152",day:"7,81",yr:"4,62",vo:"64.300"},
 {id:"jupiter",n:"Júpiter",t:"Planeta",m:"317,8",d:"139.820",au:"5,20",rho:"1,33",T:"-110",g:"24,79",ve:"214.200",day:"9,93",yr:"11,86",vo:"47.000",fit:"cover",size:"175%"},
 {id:"saturno",n:"Saturno",t:"Planeta",m:"95,2",d:"116.460",au:"9,58",rho:"0,69",T:"-140",g:"10,44",ve:"129.960",day:"10,7",yr:"29,46",vo:"34.884",fit:"cover"},
 {id:"halley",n:"Cometa Halley",sub:"1P/Halley",t:"Cometa",m:"3,7e-11",d:"11",au:"17,8|semieje",rho:"0,6",T:"-200|var.",g:"0,001",ve:"7,2",day:"52,8",yr:"75,3",vo:"25.000|prom.",fit:"cover"},
 {id:"urano",n:"Urano",t:"Planeta",m:"14,5",d:"50.724",au:"19,22",rho:"1,27",T:"-195",g:"8,69",ve:"76.968",day:"17,2",yr:"84",vo:"24.516"},
 {id:"neptuno",n:"Neptuno",t:"Planeta",m:"17,1",d:"49.244",au:"30,07",rho:"1,64",T:"-200",g:"11,15",ve:"84.816",day:"16,1",yr:"164,8",vo:"19.548",fit:"cover",size:"150%"},
 {id:"pluton",n:"Plutón",t:"Planeta enano",m:"0,0022",d:"2.377",au:"39,48",rho:"1,85",T:"-229",g:"0,62",ve:"4.356",day:"153,3",yr:"248",vo:"17.064"},
 {id:"haumea",n:"Haumea",t:"Planeta enano",m:"0,00067",d:"1.595|medio",au:"43,2",rho:"2,01",T:"-223",g:"0,44",ve:"3.024",day:"3,91",yr:"284",vo:"16.200",fit:"cover",art:1},
 {id:"makemake",n:"Makemake",t:"Planeta enano",m:"0,0005",d:"1.430",au:"45,8",rho:"1,7",T:"-230",g:"0,5",ve:"2.880",day:"22,8",yr:"305",vo:"15.876",art:1},
 {id:"eris",n:"Eris",t:"Planeta enano",m:"0,0028",d:"2.326",au:"67,7",rho:"2,52",T:"-243",g:"0,82",ve:"4.968",day:"25,9",yr:"559",vo:"12.348",fit:"cover",pos:"30% 50%",art:1},
 {id:"gonggong",n:"Gonggong",sub:"2007 OR10",t:"Objeto transneptuniano",m:"0,00029",d:"1.230",au:"67,5",rho:"1,74",T:"-240",g:"0,38",ve:"2.232",day:"22,4",yr:"554",vo:"12.384",art:1},
 {id:"sedna",n:"Sedna",t:"Objeto transneptuniano",m:"0,00017",d:"995",au:"506|semieje",rho:"2,0",T:"-261",g:"0,33",ve:"1.800",day:"10,3",yr:"11.400",vo:"3.744",fit:"cover",pos:"45% 55%",art:1},
 {id:"luna",n:"Luna",t:"Satélite natural",host:"la Tierra",m:"0,0123",d:"3.474",au:"1,00",rho:"3,34",T:"-20",g:"1,62",ve:"8.568",day:"655,7",yr:"1|☉",vo:"107.200|☉",vo2:"3.680"},
 {id:"titan",n:"Titán",t:"Satélite natural",host:"Saturno",m:"0,0225",d:"5.150",au:"9,58",rho:"1,88",T:"-179",g:"1,35",ve:"9.504",day:"382,7",yr:"29,46|☉",vo:"34.884|☉",vo2:"20.052",fit:"cover",size:"130%"},
 {id:"europa",n:"Europa",t:"Satélite natural",host:"Júpiter",m:"0,008",d:"3.122",au:"5,20",rho:"3,01",T:"-170",g:"1,31",ve:"7.290",day:"85,2",yr:"11,86|☉",vo:"47.000|☉",vo2:"49.464",fit:"cover",pos:"50% 50%"},
 {id:"bennu",n:"101955 Bennu",t:"Asteroide",m:"1,2e-14",d:"0,49",au:"1,12",rho:"1,19",T:"-23",g:"0,00001",ve:"0,72",day:"4,3",yr:"1,2",vo:"101.000"},
 {id:"io",n:"Ío",t:"Satélite natural",host:"Júpiter",m:"0,015",d:"3.643",au:"5,20",rho:"3,53",T:"-143",g:"1,79",ve:"9.216",day:"42,5",yr:"11,86|☉",vo:"47.000|☉",vo2:"62.424"},
 {id:"triton",n:"Tritón",t:"Satélite natural",host:"Neptuno",m:"0,0035",d:"2.706",au:"30,07",rho:"2,06",T:"-235",g:"0,78",ve:"5.220",day:"141",yr:"164,8|☉",vo:"19.548|☉",vo2:"15.804"},
 {id:"psyche",n:"16 Psyche",t:"Asteroide",m:"3,8e-6",d:"220",au:"2,92",rho:"3,9",T:"-113",g:"0,14",ve:"648",day:"4,2",yr:"5,0",vo:"62.280",art:1},
 {id:"hygiea",n:"10 Hygiea",t:"Asteroide",m:"1,4e-5",d:"434",au:"3,14",rho:"1,94",T:"-109",g:"0,09",ve:"576",day:"13,8",yr:"5,56",vo:"60.120",fit:"cover",size:"240%",pos:"92% 90%"},
 {id:"halebopp",n:"Cometa Hale-Bopp",sub:"C/1995 O1",t:"Cometa",m:"2,2e-10",d:"60",au:"186|semieje",rho:"0,6",T:"-220|var.",g:"0,005",ve:"36",day:"11,3",yr:"2.530",vo:"7.800|prom.",fit:"cover"},
 {id:"67p",n:"Cometa 67P",sub:"Churyumov-Gerasimenko",t:"Cometa",m:"1,67e-12",d:"4,1",au:"3,46|semieje",rho:"0,53",T:"-70|var.",g:"0,0001",ve:"3,6",day:"12,4",yr:"6,44",vo:"48.600|prom."},
 {id:"quaoar",n:"Quaoar",t:"Objeto transneptuniano",m:"0,0002",d:"1.110",au:"43,7",rho:"2,0",T:"-230",g:"0,26",ve:"1.800",day:"17,7",yr:"288",vo:"16.200",fit:"cover",art:1}
];

/* Columnas de la hoja Mazo: [columna, clave interna] */
const MAPA_MAZO = [
  ['id','id'],['nombre','n'],['subtitulo','sub'],['tipo','t'],['orbita','host'],
  ['masa_tierra','m'],['diametro_km','d'],['dist_sol_ua','au'],['densidad_g_cm3','rho'],['temperatura_C','T'],
  ['gravedad_m_s2','g'],['vel_escape_km_h','ve'],['dia_h','day'],['anio_anios','yr'],['vel_orbital_km_h','vo'],['vel_orbital_planeta_km_h','vo2'],
  ['img_ajuste','fit'],['img_tamano','size'],['img_posicion','pos'],['ilustracion','art']
];
const COLS_MAZO = MAPA_MAZO.map(c => c[0]);
const COLS_PART = ['codigo','estado','tope_rondas','ronda','turno','anfitrion','invitado',
  'n_anfitrion','n_invitado','mano_anfitrion','mano_invitado','pozo','ultima_jugada',
  'ganador','motivo_fin','iniciales_ranking','creada','iniciada','finalizada','actualizada','version',
  'activa_anfitrion','activa_invitado','token_anfitrion','token_invitado'];
const COLS_FIN = ['finalizada','codigo','anfitrion','invitado','cartas_anfitrion','cartas_invitado','rondas','ganador','motivo_fin','duracion_min'];
const COLS_RANK = ['fecha','iniciales','modalidad','jugadas','segundos','codigo','rival'];
const COLS_JUGADORES = ['nombre','partidas','ganadas','perdidas','empatadas','abandonadas','cartas_ganadas_total','ultima_partida','ultimo_codigo'];
const COLS_JUG = ['fecha','codigo','ronda','eligio','dato','carta_anfitrion','valor_anfitrion','carta_invitado','valor_invitado','resultado'];
const PARAMS_INICIALES = [
  ['rondas_tope', 300, 'Tope de seguridad: si nadie junta todas las cartas antes, gana quien tenga más'],
  ['segundos_actualizacion', 2, 'Cada cuántos segundos los celulares consultan la planilla'],
  ['segundos_cache_mazo', 30, 'Tiempo que tarda en verse un cambio hecho a mano en la hoja Mazo'],
  ['segundos_turno', 30, 'Tiempo para elegir un dato; al terminar se elige uno al azar (0 = sin límite)']
];
const ATTRS = ['m','d','au','rho','T','g','ve','day','yr','vo'];
const NOM_ATTR = { m: 'Masa', d: 'Diámetro', au: 'Distancia al Sol', rho: 'Densidad media', T: 'Temperatura media',
  g: 'Gravedad', ve: 'Vel. de escape', day: 'Duración del día', yr: 'Duración del año', vo: 'Vel. orbital' };

/* "1.407,6" -> 1407.6 ; "2,2e-12" -> 2.2e-12 ; "2,21|semieje" -> 2.21 */
function num(s) { return parseFloat(String(s).split('|')[0].replace(/\./g, '').replace(',', '.')); }

function encabezar(hoja, cols, color) {
  hoja.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground(color).setFontColor('#ffffff');
  hoja.setFrozenRows(1);
}

/** Ejecutar una vez desde el editor. Vuelve a cargar el mazo; no borra partidas ni jugadas. */
function setup() {
  const ss = libro();
  const h1 = ss.getSheetByName('Hoja 1');
  let m = ss.getSheetByName(HOJA_MAZO);
  if (!m) m = h1 && h1.getLastRow() === 0 ? h1.setName(HOJA_MAZO) : ss.insertSheet(HOJA_MAZO);
  m.clear();
  encabezar(m, COLS_MAZO, '#14264b');
  const filas = MAZO_INICIAL.map(a => MAPA_MAZO.map(([, k]) => a[k] === undefined ? '' : String(a[k])));
  const r = m.getRange(2, 1, filas.length, COLS_MAZO.length);
  r.setNumberFormat('@');           // texto: conserva comas decimales, puntos de miles y notas
  r.setValues(filas);
  m.autoResizeColumns(1, 5);

  let pa = ss.getSheetByName('Parámetros');
  if (!pa) {
    pa = ss.insertSheet('Parámetros');
    encabezar(pa, ['parametro', 'valor', 'descripcion'], '#8a5300');
    pa.getRange(2, 1, PARAMS_INICIALES.length, 3).setValues(PARAMS_INICIALES);
    pa.autoResizeColumns(1, 3);
  }
  let p = ss.getSheetByName(HOJA_PART);
  if (!p) { p = ss.insertSheet(HOJA_PART); encabezar(p, COLS_PART, '#14264b'); p.hideColumns(COLS_PART.indexOf('token_anfitrion') + 1, 2); }
  let j = ss.getSheetByName('Jugadas');
  if (!j) { j = ss.insertSheet('Jugadas'); encabezar(j, COLS_JUG, '#243a68'); }
  let f = ss.getSheetByName('Finales');
  if (!f) { f = ss.insertSheet('Finales'); encabezar(f, COLS_FIN, '#0c7561'); }
  let g = ss.getSheetByName('Jugadores');
  if (!g) { g = ss.insertSheet('Jugadores'); encabezar(g, COLS_JUGADORES, '#8a5300'); }
  let rk = ss.getSheetByName('Ranking');
  if (!rk) { rk = ss.insertSheet('Ranking'); encabezar(rk, COLS_RANK, '#c2410c'); }
  CacheService.getScriptCache().removeAll(['mazo', 'params']);
  const msg = 'Listo: hojas creadas (Mazo con ' + MAZO_INICIAL.length + ' cartas, Parámetros, Partidas, Jugadas, Finales, Jugadores y Ranking).';
  Logger.log(msg);
  try { ss.toast(msg, 'Cartas astronómicas', 8); } catch (e) { /* ejecutado desde el editor sin la planilla abierta */ }
}

/* Menú en la planilla: Cartas › Preparar hojas. Aparece al abrir (o recargar) la planilla. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Cartas')
    .addItem('Preparar hojas (setup)', 'setup')
    .addItem('Probar conexión', 'probar')
    .addToUi();
}
/* Muestra cuántas cartas lee el servidor: sirve para comprobar que todo está en su lugar. */
function probar() {
  const n = leerMazo().length;
  const msg = n ? 'Todo bien: el mazo tiene ' + n + ' cartas.' : 'La hoja Mazo está vacía: usá Cartas › Preparar hojas.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { }
}

/* ---------- lectura ---------- */
function leerParams() {
  const cache = CacheService.getScriptCache(), c = cache.get('params');
  if (c) return JSON.parse(c);
  const P = {};
  PARAMS_INICIALES.forEach(r => P[r[0]] = r[1]);
  const h = libro().getSheetByName('Parámetros');
  if (h) h.getDataRange().getValues().slice(1).forEach(r => { if (r[0] !== '' && r[1] !== '') P[r[0]] = Number(r[1]); });
  cache.put('params', JSON.stringify(P), 30);
  return P;
}
/* Devuelve las cartas con las claves cortas de data.js (id, n, t, m, d, au…), como texto */
function leerMazo() {
  const cache = CacheService.getScriptCache(), c = cache.get('mazo');
  if (c) return JSON.parse(c);
  const v = libro().getSheetByName(HOJA_MAZO).getDataRange().getDisplayValues();
  const cols = v[0];
  const cartas = v.slice(1).filter(r => String(r[0]).trim() && String(r[1]).trim()).map(r => {
    const a = {};
    MAPA_MAZO.forEach(([col, k]) => { const i = cols.indexOf(col); const x = i < 0 ? '' : String(r[i]).trim(); if (x !== '') a[k] = x; });
    a.id = String(a.id).toLowerCase();
    if (a.art !== undefined) a.art = a.art === '1' || a.art.toLowerCase() === 'sí' || a.art.toLowerCase() === 'si' ? 1 : 0;
    if (a.fit !== undefined) a.fit = 1;
    return a;
  });
  cache.put('mazo', JSON.stringify(cartas), Math.max(1, leerParams().segundos_cache_mazo || 30));
  return cartas;
}
function valores(a) { const v = {}; ATTRS.forEach(k => v[k] = num(a[k])); return v; }

/* ---------- partidas: una fila por partida, columnas legibles ---------- */
const lista = s => String(s === undefined || s === null ? '' : s).split(',').map(x => x.trim().toLowerCase()).filter(x => x !== '');
const ROL = { anfitrion: 'h', invitado: 'g', empate: 'e' }, NOMROL = { h: 'anfitrion', g: 'invitado', e: 'empate' };

function filaAPartida(r) {
  const o = {}; COLS_PART.forEach((c, i) => o[c] = r[i]);
  let ult = null;
  try { ult = o.ultima_jugada ? JSON.parse(String(o.ultima_jugada).split(' ¦ ')[1] || 'null') : null; } catch (e) { ult = null; }
  return {
    cod: String(o.codigo), estado: String(o.estado), max: Number(o.tope_rondas) || 300,
    ronda: Number(o.ronda) || 0, turno: ROL[o.turno] || null, ver: Number(o.version) || 0, creada: o.creada || new Date(),
    h: { nom: String(o.anfitrion), tok: String(o.token_anfitrion) },
    g: o.token_invitado ? { nom: String(o.invitado), tok: String(o.token_invitado) } : null,
    manos: { h: lista(o.mano_anfitrion), g: lista(o.mano_invitado) }, pot: lista(o.pozo), ult,
    ganador: String(o.ganador || ''), motivo: String(o.motivo_fin || ''), finalizada: o.finalizada || '',
    iniciada: o.iniciada || '', rankIni: String(o.iniciales_ranking || ''),
    activa: { h: String(o.activa_anfitrion || '').trim().toLowerCase(), g: String(o.activa_invitado || '').trim().toLowerCase() }
  };
}
function textoUlt(S, mazo) {
  if (!S.ult) return '';
  const u = S.ult, nom = id => (mazo.find(c => c.id === id) || {}).n || id;
  const quien = S[u.quien].nom, gana = u.res === 'e' ? 'empate' : 'gana ' + S[u.res].nom;
  return `R${u.ronda}: ${quien} eligió ${NOM_ATTR[u.k]} · ${nom(u.cartas.h)} vs ${nom(u.cartas.g)} · ${gana} ¦ ` + JSON.stringify(u);
}
function partidaAFila(S, mazo) {
  return [S.cod, S.estado, S.max, S.ronda, S.turno ? NOMROL[S.turno] : '', S.h.nom, S.g ? S.g.nom : '',
    S.manos.h.length, S.manos.g.length, S.manos.h.join(','), S.manos.g.join(','), S.pot.join(','),
    textoUlt(S, mazo), S.ganador || '', S.motivo || '', S.rankIni || '', S.creada, S.iniciada || '', S.finalizada || '', new Date(), S.ver,
    (S.activa && S.activa.h) || '', (S.activa && S.activa.g) || '', S.h.tok, S.g ? S.g.tok : ''];
}
function hojaPart() { return libro().getSheetByName(HOJA_PART); }
function buscar(cod) {
  const h = hojaPart(), f = h.getRange('A:A').createTextFinder(String(cod).toUpperCase()).matchEntireCell(true).findNext();
  if (!f) throw new Error('No existe una partida con el código ' + cod);
  const fila = f.getRow();
  return { h, fila, S: filaAPartida(h.getRange(fila, 1, 1, COLS_PART.length).getValues()[0]) };
}
function guardar(h, fila, S, mazo) {
  S.ver = (S.ver || 0) + 1;
  const r = h.getRange(fila, 1, 1, COLS_PART.length);
  r.offset(0, 9, 1, 3).setNumberFormat('@'); // manos y pozo como texto
  r.setValues([partidaAFila(S, mazo)]);
}
const azar = n => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
function mezclar(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function rolDe(S, tok) { if (S.h.tok === tok) return 'h'; if (S.g && S.g.tok === tok) return 'g'; throw new Error('No sos jugador de esta partida'); }
const otro = r => r === 'h' ? 'g' : 'h';

/* Lo que ve cada jugador: nunca la mano del rival */
function vista(S, rol) {
  const o = otro(rol), rel = x => x === 'e' ? 'e' : x === rol ? 'yo' : 'riv';
  const v = {
    cod: S.cod, estado: S.estado, ver: S.ver, ronda: S.ronda, max: S.max, pozo: S.pot.length, rol,
    yo: { nom: S[rol].nom, n: S.manos[rol].length, top: S.manos[rol].length ? S.manos[rol][0] : null,
          mano: S.manos[rol].slice() },
    riv: S[o] ? { nom: S[o].nom, n: S.manos[o].length } : null,
    turno: S.turno ? rel(S.turno) : null, ult: null, motivo: S.motivo || '',
    gano: S.estado !== 'fin' || !S.g ? null : S.ganador === 'empate' ? 'e' : S.ganador === S[rol].nom ? 'yo' : 'riv',
    rankeable: S.estado === 'fin' && S.motivo === 'juntó todas las cartas' && S.manos[rol].length > 0 && !S.rankIni,
    segundos: S.estado === 'fin' && S.iniciada ? Math.max(1, Math.round((new Date(S.finalizada) - new Date(S.iniciada)) / 1000)) : null
  };
  if (S.ult) v.ult = { ronda: S.ult.ronda, k: S.ult.k, pozo: S.ult.pozo || 0, quien: rel(S.ult.quien), res: rel(S.ult.res), mia: S.ult.cartas[rol], suya: S.ult.cartas[o] };
  return v;
}

/* ---------- final de partida: ganador, hoja Finales y hoja Jugadores ---------- */
function cerrar(S, motivo, quienAbandona) {
  S.estado = 'fin'; S.finalizada = new Date();
  const nh = S.manos.h.length, ng = S.manos.g.length;
  let gan = nh > ng ? 'h' : ng > nh ? 'g' : 'e';
  if (quienAbandona && S.g) gan = otro(quienAbandona);
  S.motivo = motivo;
  S.ganador = !S.g ? '' : gan === 'e' ? 'empate' : S[gan].nom;
  if (!S.g) return; // partida cancelada antes de que alguien se uniera: no cuenta
  const ss = libro();
  const min = Math.round((S.finalizada - new Date(S.creada)) / 60000);
  ss.getSheetByName('Finales').appendRow([S.finalizada, S.cod, S.h.nom, S.g.nom, nh, ng, S.ronda, S.ganador, motivo, isNaN(min) ? '' : min]);
  const hj = ss.getSheetByName('Jugadores'), datos = hj.getDataRange().getValues();
  ['h', 'g'].forEach(r => {
    const nom = S[r].nom, clave = nom.trim().toLowerCase();
    let fila = datos.findIndex((x, i) => i > 0 && String(x[0]).trim().toLowerCase() === clave);
    let v = fila > 0 ? datos[fila].slice(0, COLS_JUGADORES.length) : [nom, 0, 0, 0, 0, 0, 0, '', ''];
    v = v.map((x, i) => i >= 1 && i <= 6 ? Number(x) || 0 : x);
    v[1]++;
    if (gan === 'e') v[4]++; else if (gan === r) v[2]++; else v[3]++;
    if (quienAbandona === r) v[5]++;
    v[6] += S.manos[r].length; v[7] = S.finalizada; v[8] = S.cod;
    if (fila > 0) { hj.getRange(fila + 1, 1, 1, v.length).setValues([v]); datos[fila] = v; }
    else { hj.appendRow(v); datos.push(v); }
  });
}

/* ---------- ranking ---------- */
// Iniciales: 3 letras A-Z. Se rechazan combinaciones inconvenientes (también se controla en el juego).
const BLOQUEADAS = ['PUT','PTA','PTO','CUL','CLO','KUL','ANO','CUM','FUK','FCK','FUC','FUX','SEX','SXO','XXX','KKK','NAZ','ASS','PIJ','PJA','PIC',
  'MRD','MRA','CAC','CAG','CGO','CGD','CHP','CHT','VRG','VRS','PNE','PEN','ORT','TET','TTA','COJ','CJO','HDP','HIJ','PAJ','SUK','SUC','DIK','DIC',
  'COK','FAG','NIG','NGR','JOD','JDR','GIL','BOB','TNT','LCA','LOC','MAM','MMA','MMO','CNO','CON','CRL','FEO','FEA','GOR','IMB','IDT','TRL','WTF','OTP','PTS','PTR','PUA'];
function inicialesValidas(x) {
  const t = String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  if (t.length !== 3) throw new Error('Escribí exactamente 3 letras.');
  if (BLOQUEADAS.includes(t)) throw new Error('Esas iniciales no están permitidas. Probá con otras.');
  return t;
}
function hojaRanking() { return libro().getSheetByName('Ranking'); }

/* ---------- acciones ---------- */
const ACC = {
  mazo: () => ({ cartas: leerMazo(), params: leerParams() }),
  crear(p) {
    const P = leerParams(), h = hojaPart(), usados = h.getRange('A:A').getValues().flat();
    let cod; do { cod = azar(4); } while (usados.includes(cod));
    const S = { cod, estado: 'esperando', max: P.rondas_tope || 300, ronda: 0, pot: [], creada: new Date(),
      h: { nom: String(p.nom || 'Jugador 1').slice(0, 20), tok: azar(16) }, g: null, manos: { h: [], g: [] }, turno: null, ult: null, ver: 0 };
    h.appendRow([cod]);
    guardar(h, h.getLastRow(), S, leerMazo());
    return { tok: S.h.tok, vista: vista(S, 'h') };
  },
  unir(p) {
    const { h, fila, S } = buscar(p.cod);
    if (S.g) throw new Error('Esta partida ya tiene dos jugadores');
    if (S.estado !== 'esperando') throw new Error('Esta partida ya no acepta jugadores');
    const mazo = leerMazo(), d = mezclar(mazo.map(c => c.id));
    S.g = { nom: String(p.nom || 'Jugador 2').slice(0, 20), tok: azar(16) };
    // se reparte todo el mazo, una carta a cada uno, lo más parejo posible
    S.manos = { h: d.filter((_, i) => i % 2 === 0), g: d.filter((_, i) => i % 2 === 1) };
    S.turno = Math.random() < .5 ? 'h' : 'g'; S.estado = 'jugando'; S.iniciada = new Date();
    guardar(h, fila, S, mazo);
    return { tok: S.g.tok, vista: vista(S, 'g') };
  },
  estado(p) { const { S } = buscar(p.cod); return { vista: vista(S, rolDe(S, p.tok)) }; },
  jugar(p) {
    const { h, fila, S } = buscar(p.cod), rol = rolDe(S, p.tok), o = otro(rol);
    if (S.estado !== 'jugando') throw new Error('La partida no está en juego');
    if (S.turno !== rol) throw new Error('No es tu turno');
    if (!ATTRS.includes(p.k)) throw new Error('Dato no válido');
    const mazo = leerMazo(), V = {};
    mazo.forEach(c => V[c.id] = valores(c));
    /* Selección silenciosa: el atacante juega la carta que tiene en el centro de su carrusel;
       la del rival es la carta activa que su celular informó por última vez (si no hay, la primera de su mano). */
    const carta = String(p.carta || '').toLowerCase();
    const mia = S.manos[rol].includes(carta) ? carta : S.manos[rol][0];
    const act = S.activa && S.activa[o];
    const suya = act && S.manos[o].includes(act) ? act : S.manos[o][0];
    S.manos[rol].splice(S.manos[rol].indexOf(mia), 1);
    S.manos[o].splice(S.manos[o].indexOf(suya), 1);
    const enCentro = S.pot.length;
    if (!V[mia] || !V[suya]) throw new Error('Hay una carta que ya no está en la hoja Mazo');
    S.activa = S.activa || { h: '', g: '' };
    S.activa[rol] = ''; if (!S.manos[o].includes(S.activa[o])) S.activa[o] = '';
    const diff = V[mia][p.k] - V[suya][p.k]; // gana el valor más alto
    const res = diff > 0 ? rol : diff < 0 ? o : 'e';
    if (res === 'e') S.pot.push(mia, suya);
    else { S.manos[res].push(mia, suya, ...S.pot); S.pot = []; S.turno = res; } // en empate el turno sigue con quien eligió
    S.ronda++;
    S.ult = { ronda: S.ronda, k: p.k, quien: rol, res, pozo: res === 'e' ? 0 : enCentro, cartas: { [rol]: mia, [o]: suya } };
    if (!S.manos.h.length || !S.manos.g.length) cerrar(S, 'juntó todas las cartas');
    else if (S.ronda >= S.max) cerrar(S, 'tope de rondas');
    guardar(h, fila, S, mazo);
    const nom = id => mazo.find(c => c.id === id).n, ch = S.ult.cartas.h, cg = S.ult.cartas.g;
    libro().getSheetByName('Jugadas').appendRow([new Date(), S.cod, S.ronda, S[rol].nom, NOM_ATTR[p.k],
      nom(ch), String(mazo.find(c => c.id === ch)[p.k]), nom(cg), String(mazo.find(c => c.id === cg)[p.k]), res === 'e' ? 'empate' : 'gana ' + S[res].nom]);
    return { vista: vista(S, rol) };
  },
  /* Cada celular informa en silencio su carta activa (la del centro del carrusel). No cambia la versión:
     el rival no se entera. */
  activa(p) {
    const { h, fila, S } = buscar(p.cod), rol = rolDe(S, p.tok), id = String(p.id || '').toLowerCase();
    if (S.estado !== 'jugando' || !S.manos[rol].includes(id)) return { ok: false };
    h.getRange(fila, COLS_PART.indexOf(rol === 'h' ? 'activa_anfitrion' : 'activa_invitado') + 1).setValue(id);
    return { ok: true };
  },
  /* Ganador de una partida entre dos celulares: jugadas y tiempo los toma de la planilla */
  rankear(p) {
    const { h, fila, S } = buscar(p.cod), rol = rolDe(S, p.tok), ini = inicialesValidas(p.ini);
    if (S.estado !== 'fin' || S.motivo !== 'juntó todas las cartas' || S.manos[rol].length === 0) throw new Error('Solo entra al ranking quien gana juntando todas las cartas.');
    if (S.rankIni) throw new Error('Esta partida ya está en el ranking.');
    const seg = Math.max(1, Math.round((new Date(S.finalizada) - new Date(S.iniciada)) / 1000));
    const hr = hojaRanking();
    hr.appendRow([new Date(), ini, '2 jugadores', S.ronda, seg, S.cod, S[otro(rol)].nom]);
    S.rankIni = ini; guardar(h, fila, S, leerMazo());
    return { ok: true, id: hr.getLastRow(), modalidad: '2 jugadores', jugadas: S.ronda, segundos: seg };
  },
  /* Práctica contra la computadora: la partida corre en el celular */
  rankear_practica(p) {
    const ini = inicialesValidas(p.ini), j = Math.round(Number(p.jugadas)), seg = Math.round(Number(p.segundos));
    const nivel = { f: 'principiante', i: 'intermedia', d: 'experta' }[p.nivel];
    const minimo = Math.floor(leerMazo().length / 2);
    if (!nivel) throw new Error('Nivel no válido');
    if (!(j >= minimo && j < 2000) || !(seg >= j && seg < 86400)) throw new Error('Resultado no válido');
    const hr = hojaRanking();
    hr.appendRow([new Date(), ini, 'práctica · ' + nivel, j, seg, '', 'la computadora']);
    return { ok: true, id: hr.getLastRow(), modalidad: 'práctica · ' + nivel, jugadas: j, segundos: seg };
  },
  ranking() {
    const v = hojaRanking().getDataRange().getValues().map((r, i) => [i + 1, r]).slice(1).filter(x => x[1][1] !== '').map(([id, r]) => ({
      id, ini: String(r[1]), mod: String(r[2]), j: Number(r[3]), s: Number(r[4]), f: r[0] instanceof Date ? r[0].toISOString() : String(r[0]) }));
    const out = {};
    v.forEach(r => { (out[r.mod] = out[r.mod] || []).push(r); });
    const res = {};
    Object.keys(out).forEach(m => {
      res[m] = {
        jugadas: out[m].slice().sort((a, b) => a.j - b.j || a.s - b.s || a.id - b.id).slice(0, 300),
        tiempo: out[m].slice().sort((a, b) => a.s - b.s || a.j - b.j || a.id - b.id).slice(0, 300)
      };
    });
    return { ranking: res };
  },
  abandonar(p) {
    const { h, fila, S } = buscar(p.cod), rol = rolDe(S, p.tok);
    if (S.estado !== 'fin') {
      if (S.estado === 'esperando') cerrar(S, 'cancelada');
      else cerrar(S, 'abandono de ' + S[rol].nom, rol);
      guardar(h, fila, S, leerMazo());
    }
    return { ok: true };
  }
};

function doGet(e) {
  const p = e.parameter || {}, escribe = ['crear', 'unir', 'jugar', 'abandonar', 'rankear', 'rankear_practica', 'activa'].includes(p.accion);
  const lock = LockService.getScriptLock();
  let r;
  try {
    if (escribe) lock.waitLock(15000);
    if (!ACC[p.accion]) throw new Error('Acción desconocida');
    r = ACC[p.accion](p);
  } catch (err) {
    r = { error: String(err && err.message || err) };
  } finally {
    if (escribe) lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}
