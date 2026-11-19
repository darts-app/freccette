(function () {
  const TR = D.train, B = D.board, d = B.dart, X = B.MISS;
  const turns = (list) => list.map((ds) => ({ darts: ds }));
  T.group('allenamenti');

  // giro del mondo: 1 → 20, poi bull (25 o 50)
  let st = TR.replay('world', turns([[d(1, 1), d(2, 3), d(3, 1)], [d(4, 1), X, d(5, 2)]]));
  T.eq([st.i, st.darts, st.hits], [5, 6, 5], 'giro del mondo: qualsiasi settore del numero vale');
  const all = []; for (let n = 1; n <= 20; n++) all.push(d(n, 1)); all.push(d(25, 1));
  const tw = []; for (let k = 0; k < all.length; k += 3) tw.push(all.slice(k, k + 3));
  st = TR.replay('world', turns(tw));
  T.eq([st.done, TR.result('world', st)], [true, 21], 'giro del mondo perfetto: 21 freccette');
  const near = TR.replay('world', turns(tw.slice(0, 6).concat([[d(19, 1), d(20, 1)]])));
  T.eq(TR.drill('world').turn(near, [d(25, 2), X, X]).endAt, 0, 'giro del mondo: col bull finisce subito');

  // giro dei doppi e dei tripli
  st = TR.replay('dbl', turns([[d(1, 1), d(1, 2), d(2, 3)]]));
  T.eq([st.i, st.darts], [1, 3], 'doppi: vale solo il doppio');
  T.eq(TR.drill('dbl').turn(st, [d(2, 2), d(3, 1), d(3, 2)]).marks, [true, false, true], 'doppi: tiri a segno');
  const tpl = TR.drill('tpl');
  let t20 = TR.replay('tpl', []); t20 = Object.assign({}, t20, { i: 20 });
  T.eq([tpl.turn(t20, [d(25, 1)]).marks, tpl.turn(t20, [d(25, 2)]).st.done], [[false], true], 'tripli: alla fine serve il bull (50)');
  T.eq(TR.view('tpl', TR.replay('tpl', [])).big, 'T1', 'tripli: si parte da T1');

  // Bob's 27
  st = TR.replay('bob', turns([[d(1, 2), X, X], [X, X, X]]));
  T.eq([st.r, st.score], [2, 25], "Bob's 27: +2 col D1, -4 mancando il D2");
  st = TR.replay('bob', turns([[X, X, X], [X, X, X], [X, X, X], [X, X, X], [X, X, X], [X, X, X]]));
  T.eq([st.done, st.lost, st.r, TR.result('bob', st)], [true, true, 5, 0], "Bob's 27: sotto zero al D5 = finito");
  st = TR.replay('bob', turns([[d(1, 2), d(1, 2), d(1, 2)]]));
  T.eq(st.score, 33, "Bob's 27: 3 volte D1 = +6");

  // Chiusura 121: 9 freccette per chiudere
  const co = TR.drill('co121');
  let c0 = TR.replay('co121', []);
  const bust = co.turn(c0, [d(20, 3), d(20, 3), d(1, 1)]);
  T.eq([bust.endAt, bust.bust, bust.st.rem, bust.st.used], [1, true, 121, 2], '121: T20 T20 lascia 1 = sballo al secondo');
  st = TR.replay('co121', turns([[d(20, 3), d(19, 3), d(4, 1)], [d(20, 3), d(17, 3), d(5, 2)]]));
  T.eq([st.ok, st.best, st.t, st.rem, st.k], [1, 121, 122, 122, 1], '121: chiusa al secondo turno → 122');
  st = TR.replay('co121', turns([[d(20, 3), d(17, 3), d(5, 2)], [X, X, X], [X, X, X], [X, X, X]]));
  T.eq([st.t, st.k, st.log], [121, 2, ['f', 'x']], '121: 9 freccette senza chiudere → si torna indietro (mai sotto 121)');

  // Tiro al 20: 10 turni
  const ten = []; for (let k = 0; k < 10; k++) ten.push([d(20, 3), d(20, 1), d(5, 1)]);
  st = TR.replay('t20', turns(ten));
  T.eq([st.done, st.t20, TR.result('t20', st)], [true, 10, 85], 'tiro al 20: media 85, 10 tripli');
  T.eq(TR.fmt('t20', 61.25), '61,3', 'tiro al 20: media con la virgola');

  // record
  const ses = [{ drill: 'world', player: 'a', done: true, result: 40 }, { drill: 'world', player: 'a', done: true, result: 33 },
    { drill: 'world', player: 'a', done: false, result: 10 }, { drill: 'bob', player: 'a', done: true, result: 120 }];
  T.eq([TR.best(ses, 'world', 'a'), TR.best(ses, 'bob', 'a'), TR.best(ses, 't20', 'a')], [33, 120, null], 'record: il minimo per i giri, il massimo per gli altri');
})();
