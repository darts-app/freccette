/* Chiusure calcolate (non scritte a mano). route(punti, freccette, uscita) → [tiri] oppure null */
(function (D) {
  'use strict';
  const B = D.board;
  const THROWS = [];
  for (let s = 20; s >= 1; s--) THROWS.push(B.dart(s, 3));
  for (let s = 20; s >= 1; s--) THROWS.push(B.dart(s, 1));
  THROWS.push(B.dart(25, 1), B.dart(25, 2));
  for (let s = 20; s >= 1; s--) THROWS.push(B.dart(s, 2));
  // doppi preferiti per chiudere, dal migliore (25 = Bull)
  const DBL = [20, 16, 8, 10, 18, 12, 4, 6, 14, 2, 25, 9, 5, 13, 7, 19, 17, 15, 11, 3, 1];
  // costo dell'ultimo tiro; -1 = non chiude
  function finishCost(d, out) {
    if (out === 'double') return d.m === 2 ? DBL.indexOf(d.s) * 3 : -1;
    if (d.m === 1 && d.s !== 25) return 0;
    if (d.m === 2) return 2 + DBL.indexOf(d.s);
    return 6;                                                // tripli e 25
  }
  // costo dei tiri di preparazione: tripli alti prima, poi singoli; doppi e bull da evitare
  function setupCost(d) {
    if (d.m === 3) return d.s >= 13 ? 20 - d.s : 12;
    if (d.m === 1) return d.s === 25 ? 20 : 2;
    return 30;
  }
  const cache = {};
  function build(out) {
    const best = [null, {}, {}, {}];                         // best[k][punti] = { r, c }
    const fin = THROWS.filter((d) => finishCost(d, out) >= 0);
    function put(k, n, r, c) { const b = best[k][n]; if (!b || c < b.c) best[k][n] = { r: r, c: c }; }
    fin.forEach((f) => put(1, B.score(f), [f], finishCost(f, out)));
    THROWS.forEach((a) => fin.forEach((f) => put(2, B.score(a) + B.score(f), [a, f], setupCost(a) + finishCost(f, out))));
    THROWS.forEach((a) => THROWS.forEach((b) => fin.forEach((f) =>
      put(3, B.score(a) + B.score(b) + B.score(f), [a, b, f], setupCost(a) + setupCost(b) + finishCost(f, out)))));
    return best;
  }
  function route(n, left, out) {
    out = out || 'double';
    const best = cache[out] || (cache[out] = build(out));
    for (let k = 1; k <= Math.min(3, left); k++) { const b = best[k][n]; if (b) return b.r.slice(); }
    return null;
  }
  function text(r) { return r ? r.map(B.label).join(' · ') : ''; }
  D.checkout = { route, text };
})(globalThis.D = globalThis.D || {});
