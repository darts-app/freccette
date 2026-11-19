/* Bot: mira a un punto del bersaglio e sbaglia con un errore casuale (gaussiano). */
(function (D) {
  'use strict';
  const B = D.board;
  // sigma in mm, tarati con tests/calibra.js (media su 3 freccette, 501 chiusura doppio)
  const LEVELS = [
    { id: 1, name: 'Principiante', avg: 30, sigma: 28.6 },
    { id: 2, name: 'Medio', avg: 45, sigma: 18.4 },
    { id: 3, name: 'Bravo', avg: 60, sigma: 13.3 },
    { id: 4, name: 'Forte', avg: 75, sigma: 10.2 },
    { id: 5, name: 'Pro', avg: 90, sigma: 7.6 },
  ];
  // punteggi comodi da lasciare per la chiusura
  const GOOD = [40, 32, 36, 24, 16, 20, 8, 12, 28, 4, 38, 34, 30, 26, 22, 18, 14, 10, 6, 2];
  function rng(seed) {                                        // mulberry32: casuale ripetibile nei test
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }
  function target(rem, left, out) {
    const r = D.checkout.route(rem, left, out);
    if (r) return r[0];
    if (out === 'double') {
      if (rem <= 60) for (const g of GOOD) { const s = rem - g; if (s >= 1 && s <= 20) return B.dart(s, 1); }
      return rem >= 62 ? B.dart(20, 3) : B.dart(20, 1);
    }
    return rem > 60 ? B.dart(20, 3) : B.dart(Math.min(20, rem - 1), 1);
  }
  function throwAt(t, sigma, rnd) { const a = B.aim(t); return B.hit(a.x + gauss(rnd) * sigma, a.y + gauss(rnd) * sigma); }
  // un turno intero del bot: si ferma se chiude o sballa
  function turn(rem, out, sigma, rnd) {
    const darts = [];
    let s = rem;
    for (let i = 0; i < 3; i++) {
      const d = throwAt(target(s, 3 - i, out), sigma, rnd);
      darts.push(d);
      if (D.game.turnEnd(rem, darts, out) >= 0) break;
      s -= B.score(d);
    }
    return darts;
  }
  // media su 3 freccette simulata (per la taratura e i test)
  function simAvg(sigma, legs, seed) {
    const rnd = rng(seed);
    let pts = 0, n = 0;
    for (let l = 0; l < legs; l++) {
      let rem = 501;
      for (let k = 0; k < 400 && rem > 0; k++) {
        const ds = turn(rem, 'double', sigma, rnd);
        const r = D.game.applyTurn(rem, ds, 'double');
        n += ds.length;
        if (!r.bust) pts += rem - r.after;
        rem = r.after;
      }
    }
    return pts / n * 3;
  }
  function level(id) { return LEVELS.find((l) => l.id === id) || LEVELS[1]; }
  D.bot = { LEVELS, rng, target, throwAt, turn, simAvg, level };
})(globalThis.D = globalThis.D || {});
