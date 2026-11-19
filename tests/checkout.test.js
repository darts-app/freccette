(function () {
  const C = D.checkout, B = D.board;
  const L = (r) => r && r.map(B.label).join(' ');
  T.group('chiusure');
  T.eq(L(C.route(170, 3)), 'T20 T20 Bull', '170');
  T.eq(L(C.route(160, 3)), 'T20 T20 D20', '160');
  T.eq(L(C.route(100, 3)), 'T20 D20', '100 in due');
  T.eq(L(C.route(40, 3)), 'D20', '40 in una');
  T.eq(L(C.route(32, 1)), 'D16', '32 con 1');
  T.eq(L(C.route(50, 1)), 'Bull', '50 con 1');
  T.eq(C.route(41, 1), null, '41 con 1: niente');
  T.eq(L(C.route(110, 2)), 'T20 Bull', '110 con 2');
  T.eq(C.route(111, 2), null, '111 con 2: niente');
  T.eq(C.route(171, 3), null, '171: niente');
  T.eq(C.route(1, 3), null, '1: niente');
  const none = [];
  for (let n = 2; n <= 170; n++) if (!C.route(n, 3)) none.push(n);
  T.eq(none, [159, 162, 163, 165, 166, 168, 169], 'senza chiusura solo i 7 noti');
  const bad = [];
  for (let n = 2; n <= 170; n++) for (let k = 1; k <= 3; k++) {
    const r = C.route(n, k);
    if (r && (B.sum(r) !== n || r.length > k || r[r.length - 1].m !== 2)) bad.push(n + '/' + k);
  }
  T.eq(bad, [], 'ogni percorso fa il punteggio giusto e finisce su un doppio');
  T.eq(L(C.route(3, 1, 'single')), '3', 'uscita libera: 3 con 1');
  T.eq(L(C.route(180, 3, 'single')), 'T20 T20 T20', 'uscita libera: 180');
  T.eq(C.text(C.route(100, 3)), 'T20 · D20', 'testo');
})();
