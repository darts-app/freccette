(function () {
  const d = D.board.dart, T20 = d(20, 3), S1 = d(1, 1), D20 = d(20, 2), M = D.board.MISS;
  T.group('statistiche');
  T.eq([50, 40, 2, 41, 42, 1].map(D.stats.onDouble), [true, true, true, false, false, false], 'tiri sul doppio');
  const players = [{ id: 'anna' }, { id: 'bot2', bot: 2 }];
  // 141 con chiusura doppio: Anna fa 121, il bot 0, poi Anna chiude su D10 al secondo tiro
  const cfg = { start: 141, out: 'double', legs: 1, sets: 0, players: players };
  const m = { id: 'm1', created: 1000, cfg: cfg, done: true, turns: [
    { darts: [T20, T20, S1] },            // anna 121 → resta 20
    { darts: [M, M, M] },                 // bot
    { darts: [M, d(10, 2)] },             // anna: 2 tiri sul doppio (20), chiude al secondo
  ] };
  const s = D.stats.forPlayer([m], 'anna');
  T.eq([s.darts, s.points, s.avg], [5, 141, 84.6], 'freccette, punti, media');
  T.eq([s.dblTry, s.dblHit, s.dblPct], [2, 1, 50], 'doppi: 2 tentativi, 1 preso');
  T.eq([s.t100, s.t140, s.t180], [1, 0, 0], '121 conta come 100+');
  T.eq([s.hiOut, s.bestLeg, s.legsWon, s.matches, s.wins], [20, 5, 1, 1, 1], 'chiusura, leg più corta, vittorie');
  T.eq(s.trend, [{ at: 1000, avg: 84.6 }], 'andamento');
  const st = D.game.replay(cfg, m.turns);
  T.eq(D.stats.matchAvg(st, 0), 84.6, 'media nella partita');
  T.eq(D.stats.forPlayer([m], 'nessuno').darts, 0, 'giocatore senza partite');
  const m2 = { id: 'm2', created: 2000, cfg: Object.assign({}, cfg, { start: 501 }), done: false, turns: [{ darts: [T20, T20, T20] }] };
  const s2 = D.stats.forPlayer([m2, m], 'anna');
  T.eq([s2.t180, s2.matches, s2.trend.map((x) => x.at)], [1, 1, [1000, 2000]], 'partita in corso: conta i tiri, non la partita; ordine per data');
  // media delle prime 9 freccette di ogni leg
  const S20 = d(20, 1), m3 = { id: 'm3', created: 3000, cfg: Object.assign({}, cfg, { start: 501 }), done: false, turns: [
    { darts: [T20, T20, T20] }, { darts: [M, M, M] }, { darts: [S20, S20, S20] }, { darts: [M, M, M] },
    { darts: [S1, S1, S1] }, { darts: [M, M, M] }, { darts: [T20, T20, T20] }] };
  const s3 = D.stats.forPlayer([m3], 'anna');
  T.eq([s3.f9, s3.avg], [81, 105.8], 'prime 9: (180+60+3)/9×3 = 81; media su 12 = 105,8');
  T.eq(s.f9, 84.6, 'prime 9 con meno di 9 freccette = media di quelle tirate');
})();
