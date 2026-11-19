(function () {
  const G = D.game, B = D.board, d = B.dart;
  const T20 = d(20, 3), D20 = d(20, 2), S1 = d(1, 1);
  T.group('partita');
  T.eq(G.applyTurn(501, [T20, T20, T20], 'double'), { after: 321, bust: false, win: false, used: 3 }, '180 da 501');
  T.eq(G.applyTurn(40, [T20, S1, S1], 'double'), { after: 40, bust: true, win: false, used: 1 }, 'sballo sotto zero');
  T.eq(G.applyTurn(41, [D20], 'double'), { after: 41, bust: true, win: false, used: 1 }, 'sballo: resta 1');
  T.eq(G.applyTurn(20, [d(20, 1)], 'double'), { after: 20, bust: true, win: false, used: 1 }, 'sballo: zero senza doppio');
  T.eq(G.applyTurn(20, [d(20, 1)], 'single'), { after: 0, bust: false, win: true, used: 1 }, 'uscita libera: chiude col singolo');
  T.eq(G.applyTurn(36, [d(4, 1), d(16, 2)], 'double'), { after: 0, bust: false, win: true, used: 2 }, 'chiude con 2 freccette');
  T.eq(G.applyTurn(50, [d(25, 2)], 'double'), { after: 0, bust: false, win: true, used: 1 }, 'chiude sul Bull');
  T.eq(G.turnEnd(40, [T20, S1, S1], 'double'), 0, 'fine turno: sballo al primo');
  T.eq(G.turnEnd(100, [T20, D20], 'double'), 1, 'fine turno: chiusura al secondo');
  T.eq(G.turnEnd(501, [T20, T20, T20], 'double'), -1, 'fine turno: nessuna');

  const two = [{ id: 'a' }, { id: 'b' }];
  const win = { darts: [T20, S1, D20] };                    // 101 in un turno
  const cfg = { start: 101, out: 'double', legs: 3, sets: 0, players: two };
  let st = G.replay(cfg, []);
  T.eq([st.cur, st.rem], [0, [101, 101]], 'inizio');
  st = G.replay(cfg, [{ darts: [T20, S1, S1] }]);
  T.eq([st.cur, st.rem], [1, [39, 101]], 'dopo un turno tocca a b');
  st = G.replay(cfg, [{ darts: [T20, S1, S1] }, { darts: [S1] }, { darts: [T20] }]);
  T.eq([st.cur, st.rem, st.legs[0].turns[2].bust], [1, [39, 100], true], 'sballo: punteggio resta');
  st = G.replay(cfg, [win, win, win]);
  T.eq([st.done, st.winner, st.legsWon, st.legs.map((l) => l.starter)], [true, 0, [2, 1], [0, 1, 0]], 'al meglio di 3: inizia a turno');
  const cs = Object.assign({}, cfg, { sets: 3 });
  st = G.replay(cs, [win, { darts: [S1] }, win]);
  T.eq([st.set, st.leg, st.setsWon, st.legsWon, st.cur], [1, 0, [1, 0], [0, 0], 1], 'set: dopo 2 leg vinte si passa al set 2, inizia b');
  st = G.replay(cfg, [win, win, win, win]);
  T.eq(st.legs.length, 3, 'turni dopo la fine ignorati');
  const three = { start: 101, out: 'double', legs: 1, sets: 0, players: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
  st = G.replay(three, [{ darts: [S1] }, { darts: [S1] }, { darts: [S1] }, { darts: [S1] }]);
  T.eq([st.cur, st.rem], [1, [99, 100, 100]], 'tre giocatori a giro');
  T.eq(G.toWin(5), 3, 'al meglio di 5 = 3 vinte');
})();
