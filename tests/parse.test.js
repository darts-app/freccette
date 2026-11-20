(function () {
  const B = D.board;
  // fine turno con chiusura doppio, come nel gioco (copia semplice per non dipendere da game.js)
  const endsFor = (rem) => (ds) => { let s = rem; for (let i = 0; i < ds.length; i++) { s -= B.score(ds[i]); if (s <= 1) return i; } return -1; };
  const bustsFor = (rem) => (ds) => { let s = rem; for (const d of ds) s -= B.score(d); return s < 0 || s === 1 || (s === 0 && !B.isDouble(ds[ds.length - 1])); };
  const ctx = (need, rem) => ({ need: need, ends: endsFor(rem || 501), busts: bustsFor(rem || 501) });
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
    ['venticinque cinque', 'partial:25 5'],                // «25» vale 25 (prima era 20 e 5)
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
  T.eq(P('triplo venti cinque cinque', ctx(3, 40)), 'ok:T20', '40: si dicono tutti e 3 i tiri ma sballa al primo = sballo');
  T.eq(P('venti venti venti', ctx(3, 30)), 'ok:20 20', '30: «venti venti venti» sballa al secondo');
  T.eq(P('diciannove venti uno', ctx(3, 40)), 'ok:19 20', '40: 19 e 20 lasciano 1 = sballo');
  T.eq(P('doppio sedici venti', ctx(3, 32)), 'none', '32: dopo la chiusura non si tira: non valido');
  T.eq(P('venticinque doppio dieci', ctx(3, 45)), 'ok:25 D10', '45: «venticinque doppio dieci» = 25 e D10, chiude');
  T.eq(P('venti', ctx(1)), 'ok:20', 'manca 1 tiro: «venti»');
  T.eq(P('25', ctx(1)), 'ok:25', 'manca 1 tiro: «25» = 25');
  T.eq(P(['tripla venti cinque doppio', 'triplo venti cinque doppio sedici']), 'ok:T20 5 D16', 'seconda ipotesi se la prima non va');
  T.eq(P(['triplo venti', 'triplo venti cinque doppio sedici']), 'ok:T20 5 D16', 'ipotesi completa prima di quella a metà');

  // prova vera sull'iPhone (Safari iOS 18, 2026-11-19): testi esatti del riconoscitore
  T.group('voce vera iPhone');
  const real = [
    [['Libro 20 cinque doppio 16', 'Triplo 20 cinque doppio 16', 'Proventi cinque doppio 16', 'Pro 20 cinque doppio 16'], 'ok:T20 5 D16'],
    [['Proventi cinque doppio 16', 'Triplo 20 cinque doppio 16'], 'ok:T20 5 D16'],
    [['Vitro 20 cinque doppio 16', 'Triplo 20 cinque doppio 16'], 'ok:T20 5 D16'],   // vince l'ipotesi senza parole strane
    ['Libro 19 sette doppio otto', 'ok:T19 7 D8'],
    ['Pro 20 cinque doppio 16', 'ok:T20 5 D16'],
    ['20 20 20', 'ok:20 20 20'],
    ['Centro 25 fuori', 'ok:Bull 25 0'],
    ['Doppio 10', 'partial:D10'],
    ['666', 'ok:6 6 6'],
    ['Triplo 20 triplo 20 triplo 20', 'ok:T20 T20 T20'],
    ['18 14', 'partial:18 14'],                         // 0.5.4: un numero detto non si divide più
    ['Triplo 17 tre doppia 12', 'ok:T17 3 D12'],
    ['Mezzo centro 20 uno', 'ok:25 20 1'],
    ['14912', 'ok:14 9 12'],
    ['Doppio 16 doppio otto', 'partial:D16 D8'],
    ['11 15 10', 'ok:11 15 10'],
    ['Fuori fuori 20', 'ok:0 0 20'],
    ['Triplo 13 16 doppio quattro', 'ok:T13 16 D4'],
    ['Annulla', 'cmd:undo'],
    ['25 55', 'ok:25 5 5'],
    ['21913', 'ok:2 19 13'],
    ['Triplo 18 otto doppio 20', 'ok:T18 8 D20'],
    [['Pool', 'Bull'], 'partial:Bull'],
    ['Pool', 'partial:Bull'],
  ];
  real.forEach((c) => T.eq(P(c[0]), c[1], '«' + [].concat(c[0]).join(' | ') + '»'));
  // cifre attaccate e numeri a due cifre: niente sorprese
  T.eq(P('2016'), 'partial:20 16', '«2016» = 20 e 16 (prima in 2 pezzi)');
  T.eq(P('doppio 2016 5'), 'ok:D20 16 5', '«doppio 2016 5»: il doppio va al primo pezzo');
  T.eq(P('11920'), 'ambiguous:1 19 20|11 9 20', '«11920»: due divisioni possibili = chiede');
  T.eq(P('20 18'), 'partial:20 18', '«20 18» = 20 e 18 (non si divide più)');
  T.eq(P('venti diciotto'), 'partial:20 18', 'detto a parole: non si divide');
  T.eq(P('18 14', ctx(2)), 'ok:18 14', 'mancano 2 tiri: «18 14» = 18 e 14');
  T.eq(P('14', ctx(1)), 'ok:14', 'manca 1 tiro: «14» = 14');
  T.eq(P('doppio 14 3'), 'partial:D14 3', 'dopo «doppio» il numero non si divide');

  // seconda prova sull'iPhone (Safari, «Sempre in ascolto», 2026-11-19)
  T.group('voce vera iPhone 2');
  const real2 = [
    [['Proventi cinque doppio 16', 'Riprovanti cinque doppio 16', 'Pro 20 cinque doppio 16'], 'ok:T20 5 D16'],
    [['125 fuori', 'Centro25 fuori', 'Entro25 fuori'], 'ok:Bull 25 0'],   // vince l'ipotesi chiara, non quella in dubbio
    ['Entro25 fuori', 'ok:Bull 25 0'],
    ['125 fuori', 'ambiguous:1 25 0|12 5 0'],
    [['Doppio 10', 'Do doppio 10'], 'partial:D10'],
    [['11 15 10', '11:15 10', '11 15:10', '11 e 15:10'], 'ok:11 15 10'],
    [['21913', 'Due1913', '219:13'], 'ok:2 19 13'],
    ['Due1913', 'ok:2 19 13'],
    ['219:13', 'ok:2 19 13'],
    [['Libro 18 otto doppio 20', '18 otto doppio 20'], 'ok:T18 8 D20'],
    [['Triplo 20 cinque doppio 16', 'Triplo 20 25 doppio 16'], 'ok:T20 5 D16'],
    ['Tripla 17 tre doppia 12', 'ok:T17 3 D12'],
  ];
  real2.forEach((c) => T.eq(P(c[0]), c[1], '«' + [].concat(c[0]).join(' | ') + '»'));
  // come si parla di solito: «zero» o «0» = fuori, «bull» = 50, «25» = 25
  T.eq(P('20 0 0'), 'ok:20 0 0', '«20 0 0»');
  T.eq(P('2000'), 'ok:20 0 0', '«2000» = 20, 0, 0 (zeri attaccati)');
  T.eq(P('200 20'), 'ok:20 0 20', '«200 20» = 20, 0, 20');
  T.eq(P('0 bull 25'), 'ok:0 Bull 25', '«0 bull 25»');
  T.eq(P('bull bull bull'), 'ok:Bull Bull Bull', '«bull bull bull»');
  T.eq(P('zero zero zero'), 'ok:0 0 0', '«zero zero zero»');
  // «25» = 25: mai più 20 e 5 se il 25 ha senso (anche a metà frase, con la risposta veloce)
  T.eq(P('25 20'), 'partial:25 20', '«25 20» = 25 e 20, manca il terzo (non 20 5 20)');
  T.eq(P('venticinque venti venti'), 'ok:25 20 20', '«venticinque venti venti»');
  T.eq(P('20 25'), 'partial:20 25', '«20 25» = 20 e 25');
  T.eq(P('doppio 25 venti'), 'partial:Bull 20', '«doppio 25» = bull');
  T.eq(P('triplo 25'), 'partial:T20 5', '«triplo 25» resta T20 e 5 (il T25 non esiste)');
  T.eq(P('25 25 25'), 'ok:25 25 25', '«25 25 25»');
  // «uno uno uno» scritto «111»: 3 cifre attaccate = 3 tiri da una cifra (prima di 1·11 o 11·1)
  T.eq(P('111'), 'ok:1 1 1', '«111» = 1, 1, 1');
  T.eq(P('111', ctx(3, 3)), 'ok:1 1', 'manca 3: «111» = 1, 1 → sballo');
  T.eq(P('123'), 'ok:1 2 3', '«123» = 1, 2, 3');
  T.eq(P('555'), 'ok:5 5 5', '«555» = 5, 5, 5');
  // terza prova vera (2026-11-19): «13» con 2 tiri da fare diventava 1 e 3; «20 e 5» diventava 25
  T.group('voce vera iPhone 3');
  T.eq(P('13', ctx(2)), 'partial:13', 'mancano 2 tiri: «13» resta 13');
  T.eq(P('18', ctx(2)), 'partial:18', 'mancano 2 tiri: «18» resta 18');
  T.eq(P('13', ctx(3)), 'partial:13', 'mancano 3 tiri: «13» resta 13');
  T.eq(P('18 14'), 'partial:18 14', '«18 14» = 18 e 14');
  T.eq(P('20 13'), 'partial:20 13', '«20 13» = 20 e 13, non 20 1 3');
  T.eq(P(['13', '1 3'], ctx(2)), 'partial:13', 'prima ipotesi «13», riserva «1 3»: vale 13');
  T.eq(P(['13', 'Uno tre'], ctx(2)), 'partial:13', 'prima ipotesi «13», riserva «uno tre»: vale 13');
  T.eq(P(['20 13', '20 1 3']), 'partial:20 13', '«20 13» | «20 1 3»: vale 20 13');
  T.eq(P(['Tredici', '1 3'], ctx(2)), 'partial:13', '«tredici» | «1 3»: vale 13');
  const Q = (alts, more, c) => { const r = D.parse.choose(alts, c || ctx(3), more); return r.kind + (r.darts ? ':' + S(r.darts) : ''); };
  T.eq(Q(['25'], ['20', '20 e 5'], ctx(2)), 'ok:20 5', 'finale «25», provvisorio «20 e 5», mancano 2 = 20 e 5');
  T.eq(Q(['25'], ['20', '20 e 5']), 'partial:20 5', 'finale «25», provvisorio «20 e 5», mancano 3 = 20 e 5');
  T.eq(Q(['25'], ['venti', '25']), 'partial:25', '«venticinque» detto di fila resta 25');
  T.eq(Q(['25'], []), 'partial:25', 'senza provvisori: 25');
  T.eq(Q(['13'], ['1', '1 3'], ctx(2)), 'partial:13', 'finale «13», provvisorio «1 3»: vale 13');
  T.eq(Q(['triplo 20 5 doppio 16'], ['triplo 20']), 'ok:T20 5 D16', 'il finale completo vince sempre');
  T.eq(P('111', ctx(2)), 'ambiguous:1 11|11 1', 'mancano 2 tiri: «111» chiede');
  T.eq(P(['111', '1 1 1']), 'ok:1 1 1', '«111 | 1 1 1»');
})();
