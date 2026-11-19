/* Voce (Safari: webkitSpeechRecognition) e bip. È l'unica parte legata alle funzioni del browser. */
(function (D) {
  'use strict';
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  let rec = null, want = false, mode = 'tap', h = {}, denied = false, startedAt = 0;
  const emit = (s) => { if (h.onState) h.onState(s); };
  function supported() { return !!SR; }
  function make() {
    const r = new SR();
    r.lang = 'it-IT'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = mode === 'always';
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (!res.isFinal) continue;
        const alts = [];
        for (let j = 0; j < res.length; j++) alts.push(res[j].transcript);
        if (h.onResult) h.onResult(alts);
      }
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { want = false; denied = true; }
      if (h.onError) h.onError(e.error);
    };
    r.onend = () => {
      if (rec && rec !== r) return;                          // fine di un ascolto vecchio: si ignora
      rec = null;
      if (want && mode === 'always') {                     // sempre in ascolto: riparte da solo
        if (Date.now() - startedAt < 1000) { want = false; emit('paused'); return; }   // si chiude subito: niente giri a vuoto
        try { rec = make(); rec.start(); startedAt = Date.now(); emit('listening'); return; } catch (err) { rec = null; emit('paused'); return; }
      }
      want = false; emit(denied ? 'denied' : 'idle');
    };
    return r;
  }
  // opts = { mode: 'tap'|'always', onResult(alts), onState(s), onError(code) }
  function start(opts) {
    h = opts; mode = opts.mode || 'tap';
    if (!SR) { emit('unsupported'); return false; }
    want = true; denied = false;
    if (rec) return true;
    try { rec = make(); rec.start(); startedAt = Date.now(); emit('listening'); return true; } catch (e) { rec = null; emit('paused'); return false; }
  }
  function stop() {
    want = false;
    if (rec) { const r = rec; rec = null; try { r.abort(); } catch (e) { /* già fermo */ } }
    emit('idle');
  }
  // bip: il contesto audio si sblocca al primo tocco (regola di iOS)
  let ac = null;
  function unlock() {
    const C = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!C) return;
    if (!ac) { try { ac = new C(); } catch (e) { ac = null; return; } }
    if (ac.state === 'suspended') ac.resume();
  }
  function beep(ok) {
    if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = ok ? 'sine' : 'square';
    o.frequency.value = ok ? 1320 : 300;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ok ? 0.3 : 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (ok ? 0.12 : 0.28));
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + 0.3);
  }
  D.voice = { supported, start, stop, unlock, beep };
})(globalThis.D = globalThis.D || {});
