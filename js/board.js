/* Bersaglio: tiri, punteggi, nomi, geometria. Funzioni pure. */
(function (D) {
  'use strict';
  // settori in senso orario partendo dall'alto
  const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  // raggi in mm (bersaglio standard)
  const R = { bull: 6.35, outer: 15.9, tripIn: 99, tripOut: 107, dblIn: 162, dblOut: 170 };
  function dart(s, m) { return { s: s, m: m }; }
  const MISS = { s: 0, m: 0 };
  function score(d) { return d.s * d.m; }
  function isDouble(d) { return d.m === 2; }               // comprende il bull (25×2)
  function valid(d) {
    if (d.m === 0) return d.s === 0;
    if (d.s === 25) return d.m === 1 || d.m === 2;
    return d.s >= 1 && d.s <= 20 && d.m >= 1 && d.m <= 3;
  }
  function label(d) {
    if (d.m === 0) return '0';
    if (d.s === 25) return d.m === 2 ? 'Bull' : '25';
    return (d.m === 3 ? 'T' : d.m === 2 ? 'D' : '') + d.s;
  }
  function sum(darts) { return darts.reduce((a, d) => a + score(d), 0); }
  // punto (x, y) in mm dal centro, y verso l'alto → tiro colpito
  function hit(x, y) {
    const r = Math.hypot(x, y);
    if (r <= R.bull) return dart(25, 2);
    if (r <= R.outer) return dart(25, 1);
    if (r > R.dblOut) return MISS;
    let ang = Math.atan2(x, y) * 180 / Math.PI;           // 0 = in alto, cresce in senso orario
    if (ang < 0) ang += 360;
    const s = ORDER[Math.floor(((ang + 9) % 360) / 18)];
    const m = r >= R.dblIn ? 2 : (r >= R.tripIn && r <= R.tripOut ? 3 : 1);
    return dart(s, m);
  }
  // punto da mirare per un tiro
  function aim(d) {
    if (d.s === 25 || d.m === 0) return { x: 0, y: 0 };
    const a = ORDER.indexOf(d.s) * 18 * Math.PI / 180;
    const r = d.m === 3 ? 103 : d.m === 2 ? 166 : 134;    // singolo: zona larga esterna
    return { x: r * Math.sin(a), y: r * Math.cos(a) };
  }
  D.board = { ORDER, R, dart, MISS, score, isDouble, valid, label, sum, hit, aim };
})(globalThis.D = globalThis.D || {});
