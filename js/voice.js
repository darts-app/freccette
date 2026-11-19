/* Voce (Safari: webkitSpeechRecognition) e bip. È l'unica parte legata alle funzioni del browser. */
(function (D) {
  'use strict';
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  let rec = null, want = false, mode = 'tap', h = {}, denied = false, startedAt = 0;
  // Risposta veloce: Safari manda il testo anche mentre parli (risultati «provvisori»). Se un testo provvisorio
  // resta uguale per FAST_MS e h.fast(alts) lo accetta (turno completo), i tiri si segnano subito e la frase finale si ignora.
  const FAST_MS = 350;
  let sess = 0, taken = {}, fastT = 0, fastKey = '', fastText = '';
  const emit = (s) => { if (h.onState) h.onState(s); };
  function supported() { return !!SR; }
  function make() {
    const r = new SR(), id = ++sess;
    r.lang = 'it-IT'; r.interimResults = !!h.fast; r.maxAlternatives = 5; r.continuous = mode === 'always';
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i], key = id + ':' + i;
        const alts = [];
        for (let j = 0; j < res.length; j++) alts.push(res[j].transcript);
        if (!res.isFinal) { if (h.fast && !taken[key]) interim(alts, key); continue; }
        if (fastKey === key) { clearTimeout(fastT); fastKey = ''; }
        if (taken[key]) continue;                            // già segnato con la risposta veloce
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
  function interim(alts, key) {
    const text = (alts[0] || '').trim();
    if (!text || (key === fastKey && text === fastText)) return;
    clearTimeout(fastT); fastKey = key; fastText = text;
    fastT = setTimeout(() => {
      fastKey = '';
      if (taken[key] || !h.fast || !h.fast(alts)) return;
      taken[key] = true;
      if (mode === 'tap') stop();                            // un tocco: il microfono si libera subito
    }, FAST_MS);
  }
  // opts = { mode: 'tap'|'always', onResult(alts), fast(alts) → true se ha segnato i tiri (facoltativo), onState(s), onError(code) }
  function start(opts) {
    h = opts; mode = opts.mode || 'tap';
    if (!SR) { emit('unsupported'); return false; }
    want = true; denied = false;
    if (rec) return true;
    try { rec = make(); rec.start(); startedAt = Date.now(); emit('listening'); return true; } catch (e) { rec = null; emit('paused'); return false; }
  }
  function stop() {
    want = false; clearTimeout(fastT); fastKey = '';
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
  // bip speciali (solo suoni, niente voce): '180' tre note in salita, 'win' chiusura, 'bust' due note in discesa
  function tone(f, t, dur, type, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function chime(kind) {
    if (!ac || !kind) return;
    const t = ac.currentTime + 0.05;
    if (kind === '180') [880, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.11, 0.14, 'sine', 0.3));
    else if (kind === 'win') [988, 1319, 1976].forEach((f, i) => tone(f, t + i * 0.13, i === 2 ? 0.45 : 0.15, 'sine', 0.3));
    else if (kind === 'bust') [330, 220].forEach((f, i) => tone(f, t + i * 0.17, 0.22, 'square', 0.12));
  }
  D.voice = { supported, start, stop, unlock, beep, chime };
})(globalThis.D = globalThis.D || {});
