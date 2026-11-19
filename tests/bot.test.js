(function () {
  const Bt = D.bot, B = D.board;
  T.group('bot');
  T.eq(B.label(Bt.target(501, 3, 'double')), 'T20', 'lontano: mira T20');
  T.eq(B.label(Bt.target(100, 3, 'double')), 'T20', '100: mira T20 (percorso)');
  T.eq(B.label(Bt.target(40, 1, 'double')), 'D20', '40: mira D20');
  T.eq(B.label(Bt.target(41, 1, 'double')), '1', '41 con 1: lascia 40');
  T.eq(B.label(Bt.target(61, 1, 'double')), '20', '61 con 1: singolo 20, non T20');
  const r = Bt.rng(7), ds = Bt.turn(501, 'double', 10, r);
  T.ok(ds.length === 3 && ds.every(B.valid), 'turno di 3 tiri validi');
  T.eq(B.label(Bt.target(501, 3, 'double', false)), 'D20', 'double in, non partito: mira D20');
  const din = Bt.turn(501, 'double', 0.01, Bt.rng(3), false);
  T.eq(din.map(B.label), ['D20', 'T20', 'T20'], 'double in: apre con D20, poi T20');
  const ds2 = Bt.turn(40, 'double', 0.01, Bt.rng(1));
  T.eq(ds2.map(B.label), ['D20'], 'senza errore chiude 40 al primo');
  Bt.LEVELS.forEach((l) => {
    const a = Bt.simAvg(l.sigma, 300, 11);
    T.ok(Math.abs(a - l.avg) <= 3, l.name + ': media ' + a.toFixed(1) + ' vicina a ' + l.avg);
  });
})();
