(function () {
  const B = D.board, d = B.dart;
  T.group('bersaglio');
  T.eq(B.score(d(20, 3)), 60, 'T20 = 60');
  T.eq(B.score(d(25, 2)), 50, 'Bull = 50');
  T.eq(B.score(B.MISS), 0, 'fuori = 0');
  T.eq([d(20, 3), d(16, 2), d(5, 1), d(25, 1), d(25, 2), B.MISS].map(B.label), ['T20', 'D16', '5', '25', 'Bull', '0'], 'nomi');
  T.eq([d(25, 3), d(21, 1), d(0, 1), d(20, 4)].map(B.valid), [false, false, false, false], 'tiri non validi');
  T.eq([d(25, 1), d(1, 3), B.MISS].map(B.valid), [true, true, true], 'tiri validi');
  T.eq(B.sum([d(20, 3), d(5, 1), d(16, 2)]), 97, 'somma turno');
  T.eq(B.label(B.hit(0, 0)), 'Bull', 'centro = Bull');
  T.eq(B.label(B.hit(0, 10)), '25', 'anello 25');
  T.eq(B.label(B.hit(0, 103)), 'T20', 'in alto sul triplo = T20');
  T.eq(B.label(B.hit(103, 0)), 'T6', 'a destra sul triplo = T6');
  T.eq(B.label(B.hit(0, -166)), 'D3', 'in basso sul doppio = D3');
  T.eq(B.label(B.hit(-134, 0)), '11', 'a sinistra singolo = 11');
  T.eq(B.label(B.hit(0, 175)), '0', 'fuori dal bersaglio');
  // mirare al centro di ogni tiro senza errore lo colpisce
  const all = [];
  for (let s = 1; s <= 20; s++) for (let m = 1; m <= 3; m++) all.push(d(s, m));
  all.push(d(25, 1), d(25, 2));
  const miss = all.filter((t) => { const a = B.aim(t); const h = B.hit(a.x, a.y); return t.s === 25 ? h.s !== 25 : B.label(h) !== B.label(t); });
  T.eq(miss.map(B.label), [], 'mirando al centro di un tiro senza errore lo si prende');
})();
