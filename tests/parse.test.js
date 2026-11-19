(function () {
  const B = D.board;
  // fine turno con chiusura doppio, come nel gioco (copia semplice per non dipendere da game.js)
  const endsFor = (rem) => (ds) => { let s = rem; for (let i = 0; i < ds.length; i++) { s -= B.score(ds[i]); if (s <= 1) return i; } return -1; };
  const ctx = (need, rem) => ({ need: need, ends: endsFor(rem || 501) });
  const S = (ds) => ds.map(B.label).join(' ');
  function P(alts, c) {
    const r = D.parse.choose(Array.isArray(alts) ? alts : [alts], c || ctx(3));
    return r.kind + (r.darts ? ':' + S(r.darts) : '') + (r.options ? ':' + r.options.map(S).join('|') : '') + (r.cmd ? ':' + r.cmd : '');
  }
  T.group('lettura voce');
  const cases = [
    ['triplo venti, cinque, doppio sedici', 'ok:T20 5 D16'],
    ['Triplo 20 5 doppio 16', 'ok:T20 5 D16'],
    ['tripla 20 5 doppia 16', 'ok:T20 5 D16'],
    ['T20 5 D16', 'ok:T20 5 D16'],
    ['venti venti venti', 'ok:20 20 20'],
    ['20 20 20', 'ok:20 20 20'],
    ['triplo 20 triplo 20 triplo 20', 'ok:T20 T20 T20'],
    ['tre volte venti, uno, cinque', 'ok:T20 1 5'],
    ['centro, 25, fuori', 'ok:Bull 25 0'],
    ['bull 20 1', 'ok:Bull 20 1'],
    ['mezzo centro 20 20', 'ok:25 20 20'],
    ['venticinque cinque', 'ok:20 5 5'],
    ['25', 'partial:25'],
    ['fuori fuori fuori', 'ok:0 0 0'],
    ['zero, zero, venti', 'ok:0 0 20'],
    ['sei sei sei', 'ok:6 6 6'],
    ['annulla', 'cmd:undo'],
    ['per favore annulla', 'cmd:undo'],
    ['correggi', 'cmd:fix'],
    ['ho fatto triplo diciannove, sette e doppio otto', 'ok:T19 7 D8'],
    ['diciannove diciannove diciotto', 'ok:19 19 18'],
    ['triplo 25', 'partial:T20 5'],
    ['doppio centro', 'partial:Bull'],
    ['sessanta', 'none'],
    ['', 'none'],
    ['triplo', 'none'],
    ['60 20 1', 'none'],
    ['2016 5', 'ok:20 16 5'],
    ['Doppio 16, doppio 8', 'partial:D16 D8'],
    ['19 tripla 19 19', 'ok:19 T19 19'],
    ['singolo venti, triplo venti, venti', 'ok:20 T20 20'],
    ['uno uno uno', 'ok:1 1 1'],
    ['venti e venti e triplo uno', 'ok:20 20 T1'],
    ['diciassette diciassette diciassette', 'ok:17 17 17'],
    ['quattordici, nove, dodici', 'ok:14 9 12'],
    ['Triplo Diciotto Fuori Bull', 'ok:T18 0 Bull'],
    ['tre 3 tre', 'ok:3 3 3'],
    ['doppia tre', 'partial:D3'],
    ['due volte sedici', 'partial:D16'],
    ['cinquanta venti venti', 'ok:Bull 20 20'],
    ['quattro, tredici, sei', 'ok:4 13 6'],
    ['undici quindici dieci', 'ok:11 15 10'],
    ['triplo venti triplo diciannove triplo diciotto', 'ok:T20 T19 T18'],
  ];
  cases.forEach((c) => T.eq(P(c[0]), c[1], '«' + c[0] + '»'));
  // con il punteggio: chiusure, sballi, ambiguità
  T.eq(P('doppio sedici', ctx(3, 32)), 'ok:D16', '32: «doppio sedici» chiude');
  T.eq(P('cinque', ctx(3, 32)), 'partial:5', '32: «cinque» = turno a metà');
  T.eq(P('triplo venti', ctx(3, 40)), 'ok:T20', '40: «triplo venti» sballa con 1 freccetta');
  T.eq(P('triplo venti cinque cinque', ctx(3, 40)), 'none', '40: tiri dopo lo sballo = non valido');
  T.eq(P('venticinque doppio dieci', ctx(3, 45)), 'ambiguous:25 D10|20 5 D10', '45: «venticinque doppio dieci» chiede');
  T.eq(P('venti', ctx(1)), 'ok:20', 'manca 1 tiro: «venti»');
  T.eq(P('25', ctx(1)), 'ok:25', 'manca 1 tiro: «25» = 25');
  T.eq(P(['tripla venti cinque doppio', 'triplo venti cinque doppio sedici']), 'ok:T20 5 D16', 'seconda ipotesi se la prima non va');
  T.eq(P(['triplo venti', 'triplo venti cinque doppio sedici']), 'ok:T20 5 D16', 'ipotesi completa prima di quella a metà');
})();
