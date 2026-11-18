/* Sombras sonoras — sonido
   Todo se sintetiza en el navegador (Web Audio), sin archivos de audio.

   Melodía: notas al azar de una escala pentatónica mayor (siempre suena agradable),
   que caminan muy cerca de un tono central. El tono central sigue a la luz:
   astro descubierto = agudo; astro cubierto al 100 % = grave (tres octavas de diferencia).
   El descenso es proporcional a la cobertura: un eclipse que cubre el 10 % o el 20 %
   baja apenas unas notas, mientras que uno del 80 %, 90 % o 100 % baja casi o del todo
   las tres octavas. La melodía se mueve solo un paso alrededor del centro para que
   el cambio de altura se oiga con claridad.

   Instrumentos: piano, arpa, xilófono y violín (síntesis aditiva y sustractiva).
   Marcas: sonidos propios para comienzo, máximo, fase central (totalidad o anillo),
   final, avisos previos en el modo en vivo y, si se activa, cada 10 % de cobertura. Durante la totalidad de la Luna
   el timbre se vuelve más opaco («Luna roja»); en la del Sol suena un acorde grave. */
var Sound = (function () {
  'use strict';
  var ctx = null, master = null, instBus = null, instFilter = null, marksBus = null;
  var instrument = 'piano';
  var timer = null, running = false;
  var light = 1;            // 0 = astro cubierto, 1 = descubierto
  var step = 15;            // posición actual en la escala (índice de la «escalera» pentatónica)
  var drone = null;         // acorde sostenido de la totalidad de Sol
  var annularTimer = null;
  var PENTA = [0, 2, 4, 7, 9];
  var BASE = 130.81;        // do 3 (C3): tono del centro con el astro cubierto al 100 %
  var SPAN = 15;            // pasos de la escala entre luz plena y cobertura total: tres octavas

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createDynamicsCompressor();
      master.threshold.value = -18; master.ratio.value = 4;
      var out = ctx.createGain(); out.gain.value = 0.9;
      master.connect(out); out.connect(ctx.destination);
      instFilter = ctx.createBiquadFilter(); instFilter.type = 'lowpass'; instFilter.frequency.value = 9000; instFilter.Q.value = 0.5;
      instBus = ctx.createGain(); instBus.gain.value = 0.8;
      instBus.connect(instFilter); instFilter.connect(master);
      marksBus = ctx.createGain(); marksBus.gain.value = 0.7; marksBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function hz(stepIndex) {
    var oct = Math.floor(stepIndex / 5), deg = ((stepIndex % 5) + 5) % 5;
    return BASE * Math.pow(2, (oct * 12 + PENTA[deg]) / 12);
  }

  /* ---------- Instrumentos ---------- */
  function env(g, t0, attack, peak, decay) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }
  function partial(f, type, t0, attack, peak, decay, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    env(g, t0, attack, peak, decay);
    o.connect(g); g.connect(dest || instBus);
    o.start(t0); o.stop(t0 + attack + decay + 0.05);
    return o;
  }
  var INSTR = {
    piano: function (f, t0, dur) {
      var d = 1.2 + dur * 0.6;
      partial(f, 'triangle', t0, 0.005, 0.22, d);
      partial(f * 1.003, 'sine', t0, 0.005, 0.12, d * 0.9);
      partial(f * 2, 'sine', t0, 0.004, 0.06, d * 0.5);
      partial(f * 3, 'sine', t0, 0.003, 0.025, d * 0.3);
    },
    harp: function (f, t0, dur) {
      var d = 1.8 + dur * 0.5;
      partial(f, 'sine', t0, 0.003, 0.24, d);
      partial(f * 2, 'sine', t0, 0.002, 0.10, d * 0.45);
      partial(f * 3, 'sine', t0, 0.002, 0.04, d * 0.25);
      partial(f * 4, 'sine', t0, 0.001, 0.02, d * 0.15);
    },
    xylo: function (f, t0) {
      var g = f * 2;                       // el xilófono suena una octava más arriba
      partial(g, 'sine', t0, 0.002, 0.26, 0.45);
      partial(g * 3.93, 'sine', t0, 0.001, 0.07, 0.12);   // parcial inarmónico de la lámina
      partial(g * 9.2, 'sine', t0, 0.001, 0.03, 0.05);
    },
    violin: function (f, t0, dur) {
      var len = Math.max(0.5, dur * 0.95);
      var o = ctx.createOscillator(), filt = ctx.createBiquadFilter(), g = ctx.createGain();
      var lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0);
      lfo.frequency.value = 5.5; lfoGain.gain.setValueAtTime(0, t0);
      lfoGain.gain.linearRampToValueAtTime(f * 0.006, t0 + 0.35);     // vibrato que aparece de a poco
      lfo.connect(lfoGain); lfoGain.connect(o.frequency);
      filt.type = 'lowpass'; filt.frequency.value = Math.min(4000, f * 6); filt.Q.value = 1.2;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.15);
      g.gain.setValueAtTime(0.11, t0 + len - 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + len + 0.25);
      o.connect(filt); filt.connect(g); g.connect(instBus);
      o.start(t0); lfo.start(t0); o.stop(t0 + len + 0.3); lfo.stop(t0 + len + 0.3);
    }
  };
  var BEAT = { piano: 0.42, harp: 0.36, xylo: 0.3, violin: 0.8 };

  /* ---------- Melodía ---------- */
  function center() { return Math.round(light * SPAN); }  // 0–15 pasos: tres octavas, proporcional a la cobertura
  function nextStep() {
    var c = center();
    if (Math.abs(step - c) > 1) {         // si la luz cambió, la melodía va hacia el nuevo centro
      step += step > c ? -1 : 1;
      return step;
    }
    var moves = [-1, 0, 0, 1];            // camina solo un paso alrededor del centro
    var s = step + moves[Math.floor(Math.random() * moves.length)];
    step = Math.max(c - 1, Math.min(c + 1, Math.max(-1, Math.min(SPAN + 1, s))));
    return step;
  }
  function tick() {
    if (!running) return;
    var beat = BEAT[instrument] || 0.4;
    if (!drone) {
      var len = Math.random() < 0.25 ? 2 : 1;                // de vez en cuando, una nota larga
      if (Math.random() > 0.12) INSTR[instrument](hz(nextStep()), ctx.currentTime + 0.02, beat * len);
      timer = setTimeout(tick, beat * len * 1000);
    } else {
      timer = setTimeout(tick, 600);
    }
  }

  /* ---------- Marcas ---------- */
  function bell(freqs, vol, decay) {
    var t0 = ctx.currentTime;
    freqs.forEach(function (f, i) { partial(f, 'sine', t0, 0.008, vol / (i + 1), decay, marksBus); });
  }
  function seq(freqs, gap, vol) {
    var t0 = ctx.currentTime;
    freqs.forEach(function (f, i) { partial(f, 'sine', t0 + i * gap, 0.01, vol, 0.25, marksBus); });
  }
  var MARK = {
    start: function () { seq([523.25, 659.25, 783.99], 0.13, 0.16); },          // arpegio que sube
    end: function () { seq([783.99, 659.25, 523.25], 0.13, 0.16); },            // arpegio que baja
    max: function () { seq([1046.5, 1046.5, 1046.5], 0.16, 0.12); },            // tres toques
    central_in: function () { bell([392, 784, 1176, 1568], 0.18, 2.4); },        // campana grave
    central_out: function () { bell([523.25, 1046.5, 1569.8], 0.14, 1.8); },
    tick: function () { seq([1760], 0.1, 0.05); },
    pre: function () { seq([880, 1174.7], 0.22, 0.12); }                        // aviso previo (modo en vivo): dos notas suaves
  };

  return {
    setInstrument: function (name) { if (INSTR[name]) instrument = name; },
    getInstrument: function () { return instrument; },
    /** Llamar seguido: nivel de luz (0–1) y fase actual. */
    update: function (lightLevel, phase, body) {
      light = Math.max(0, Math.min(1, lightLevel));
      if (!ctx) return;
      var now = ctx.currentTime;
      // Totalidad de Luna: timbre opaco («Luna roja»)
      instFilter.frequency.setTargetAtTime(phase === 'total_moon' ? 900 : 9000, now, 0.6);
      // Totalidad de Sol: acorde grave sostenido en lugar de la melodía
      if (phase === 'total_sun' && !drone && running) {
        drone = [98, 147, 196].map(function (f) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.07, now + 1.5);
          o.connect(g); g.connect(instBus); o.start(); return { o: o, g: g };
        });
      } else if ((phase !== 'total_sun' || !running) && drone) {
        drone.forEach(function (d) { d.g.gain.setTargetAtTime(0.0001, now, 0.4); d.o.stop(now + 2); });
        drone = null;
      }
      // Anillo de fuego: campanita cada 3 s
      if (phase === 'annular' && running && !annularTimer) {
        MARK.central_out(); annularTimer = setInterval(function () { MARK.central_out(); }, 3000);
      } else if ((phase !== 'annular' || !running) && annularTimer) {
        clearInterval(annularTimer); annularTimer = null;
      }
    },
    start: function () {
      if (!ensure()) return false;
      if (running) return true;
      running = true; step = center(); tick();
      return true;
    },
    stop: function () {
      running = false; clearTimeout(timer);
      if (ctx) this.update(light, 'none');
    },
    isRunning: function () { return running; },
    mark: function (name) { if (ensure() && MARK[name]) MARK[name](); },
    /** Habilita el audio con un toque del usuario, sin empezar la melodía (modo en vivo, antes del eclipse). */
    unlock: function () { return ensure(); },
    /** Muestra breve del instrumento elegido (al cambiarlo). */
    preview: function () {
      if (!ensure()) return;
      var t0 = ctx.currentTime + 0.02, b = BEAT[instrument];
      [5, 7, 9].forEach(function (s, i) { INSTR[instrument](hz(s), t0 + i * b, b); });
    }
  };
})();
