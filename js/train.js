/* Allenamenti: regole pure, come la partita si ricostruiscono dai turni salvati.
   Ogni allenamento: init() → stato; turn(stato, tiri) → { st, used, marks, endAt, bust }; view(stato) → cosa mostrare.
   endAt = indice del tiro con cui il turno finisce prima del terzo (o -1). */
(function (D) {
  'use strict';
  const B = D.board, G = D.game;
  const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '–');
  const round1 = (x) => Math.round(x * 10) / 10;
  const copy = (o) => JSON.parse(JSON.stringify(o));

  // Giri: 1 → 20 e poi il bull. kind: 'any' (qualsiasi settore), 'double', 'triple' (alla fine il bull da 50)
  function around(kind) {
    const SEQ = []; for (let n = 1; n <= 20; n++) SEQ.push(n); SEQ.push(25);
    const hit = (n, d) => (kind === 'any' ? d.s === n : n === 25 ? d.s === 25 && d.m === 2 : d.s === n && d.m === (kind === 'double' ? 2 : 3));
    const name = (n) => (n === 25 ? 'Bull' : (kind === 'double' ? 'D' : kind === 'triple' ? 'T' : '') + n);
    return {
      init: () => ({ i: 0, darts: 0, hits: 0, done: false }),
      turn(st0, ds) {
        const st = copy(st0), marks = [];
        let used = 0;
        for (const d of ds) {
          if (st.done) break;
          used++; st.darts++;
          const ok = hit(SEQ[st.i], d);
          marks.push(ok);
          if (ok) { st.hits++; st.i++; if (st.i >= SEQ.length) st.done = true; }
        }
        return { st: st, used: used, marks: marks, endAt: st.done ? used - 1 : -1, bust: false };
      },
      view: (st) => ({ label: 'Bersaglio', big: st.done ? '✓' : name(SEQ[st.i]), sub: '',
        prog: SEQ.map((_, k) => (k < st.i ? 'f' : k === st.i ? 'c' : '')),
        kv: [[st.i, 'fatti su 21'], [st.darts, 'freccette'], [pct(st.hits, st.darts), 'precisione']] }),
      result: (st) => st.darts,
    };
  }

  // Bob's 27: si parte da 27; 3 freccette per ogni doppio da D1 a D20 e poi il bull.
  // Ogni doppio colpito vale il suo punteggio; se si mancano tutte e tre si perde il valore del doppio. Sotto zero = finito.
  const bobVal = (r) => (r === 20 ? 50 : 2 * (r + 1));
  const bobHit = (r, d) => d.m === 2 && d.s === (r === 20 ? 25 : r + 1);
  const bob = {
    init: () => ({ r: 0, score: 27, hits: 0, done: false, lost: false }),
    turn(st0, ds) {
      const st = copy(st0), marks = ds.slice(0, 3).map((d) => bobHit(st.r, d));
      if (ds.length >= 3 && !st.done) {
        const h = marks.filter(Boolean).length;
        st.hits += h;
        st.score += h ? h * bobVal(st.r) : -bobVal(st.r);
        st.r++;
        if (st.score <= 0) { st.done = true; st.lost = true; } else if (st.r > 20) st.done = true;
      }
      return { st: st, used: Math.min(3, ds.length), marks: marks, endAt: -1, bust: false };
    },
    view: (st) => ({ label: 'Bersaglio', big: st.done ? (st.lost ? '✗' : '✓') : (st.r === 20 ? 'Bull' : 'D' + (st.r + 1)), sub: st.done ? '' : 'vale ' + bobVal(st.r),
      prog: Array.from({ length: 21 }, (_, k) => (k < st.r ? 'f' : k === st.r && !st.done ? 'c' : '')),
      kv: [[st.score, 'punti'], [Math.min(st.r + 1, 21) + '/21', 'doppio'], [st.hits, 'colpiti']] }),
    result: (st) => (st.lost ? 0 : st.score),
  };

  // Chiusura 121: 10 tentativi da 9 freccette (3 turni), chiusura sul doppio. Chiusa → si sale di 1, se no si scende (mai sotto 121).
  const ATT = 10, START = 121;
  const co121 = {
    init: () => ({ t: START, rem: START, used: 0, k: 0, ok: 0, best: 0, log: [], done: false }),
    turn(st0, ds) {
      const st = copy(st0);
      if (st.done) return { st: st, used: 0, marks: [], endAt: -1, bust: false };
      const left = 9 - st.used, r = G.applyTurn(st.rem, ds.slice(0, left), 'double');
      st.used += r.used;
      if (!r.bust) st.rem = r.after;
      const marks = ds.slice(0, r.used).map((_, i) => r.win && i === r.used - 1);
      let over = false;
      if (r.win) { st.ok++; st.best = Math.max(st.best, st.t); st.log.push('f'); st.t++; over = true; }
      else if (st.used >= 9) { st.log.push('x'); st.t = Math.max(START, st.t - 1); over = true; }
      if (over) { st.k++; st.rem = st.t; st.used = 0; if (st.k >= ATT) st.done = true; }
      return { st: st, used: r.used, marks: marks, endAt: r.win || r.bust || over ? r.used - 1 : -1, bust: r.bust };
    },
    view(st) {
      const left = Math.min(3, 9 - st.used), route = !st.done && st.rem <= 170 ? D.checkout.route(st.rem, left, 'double') : null;
      return { label: st.done ? 'Finito' : 'Chiudi ' + st.t, big: st.done ? '✓' : String(st.rem),
        sub: st.done ? '' : (route ? D.checkout.text(route) + ' · ' : '') + 'freccetta ' + (st.used + 1) + ' di 9',
        prog: Array.from({ length: ATT }, (_, k) => (k < st.log.length ? st.log[k] : k === st.k && !st.done ? 'c' : '')),
        kv: [[Math.min(st.k + 1, ATT) + '/' + ATT, 'tentativo'], [st.ok, 'chiuse'], [st.best || '–', 'più alta']] };
    },
    result: (st) => st.best,
  };

  // Tiro al 20: 10 turni sul triplo 20; conta la media su 3 freccette e i tripli
  const TURNS = 10;
  const t20 = {
    init: () => ({ k: 0, pts: 0, t20: 0, done: false }),
    turn(st0, ds) {
      const st = copy(st0), marks = ds.slice(0, 3).map((d) => d.s === 20 && d.m === 3);
      if (ds.length >= 3 && !st.done) {
        st.pts += B.sum(ds.slice(0, 3)); st.t20 += marks.filter(Boolean).length; st.k++;
        if (st.k >= TURNS) st.done = true;
      }
      return { st: st, used: Math.min(3, ds.length), marks: marks, endAt: -1, bust: false };
    },
    view: (st) => ({ label: 'Mira', big: st.done ? '✓' : 'T20', sub: '',
      prog: Array.from({ length: TURNS }, (_, k) => (k < st.k ? 'f' : k === st.k && !st.done ? 'c' : '')),
      kv: [[Math.min(st.k + 1, TURNS) + '/' + TURNS, 'turno'], [st.k ? String(round1(st.pts / st.k)).replace('.', ',') : '–', 'media'], [st.t20, 'tripli 20']] }),
    result: (st) => (st.k ? round1(st.pts / st.k) : 0),
  };

  // better: 'low' = meglio meno (freccette), 'high' = meglio di più
  const DRILLS = [
    Object.assign({ id: 'world', name: 'Giro del mondo', desc: "dall'1 al 20, poi il bull", icon: 'clock', unit: 'freccette', better: 'low' }, around('any')),
    Object.assign({ id: 'dbl', name: 'Giro dei doppi', desc: 'D1 → D20, poi il bull', icon: 'two', unit: 'freccette', better: 'low' }, around('double')),
    Object.assign({ id: 'tpl', name: 'Giro dei tripli', desc: 'T1 → T20, poi il bull', icon: 'three', unit: 'freccette', better: 'low' }, around('triple')),
    Object.assign({ id: 'bob', name: "Bob's 27", desc: 'doppi: se manchi perdi punti', icon: 'heart', unit: 'punti', better: 'high' }, bob),
    Object.assign({ id: 'co121', name: 'Chiusura 121', desc: '9 freccette per chiudere', icon: 'flag', unit: 'più alta', better: 'high' }, co121),
    Object.assign({ id: 't20', name: 'Tiro al 20', desc: '10 turni sul triplo 20', icon: 'bolt', unit: 'media', better: 'high' }, t20),
  ];
  const drill = (id) => DRILLS.find((x) => x.id === id);
  function replay(id, turns) {
    const dr = drill(id);
    let st = dr.init();
    for (const t of turns) { if (st.done) break; st = dr.turn(st, t.darts).st; }
    return st;
  }
  const result = (id, st) => drill(id).result(st);
  const view = (id, st) => drill(id).view(st);
  const fmt = (id, v) => (v === null || v === undefined ? '–' : String(id === 't20' ? round1(v) : v).replace('.', ','));
  // record di un giocatore (solo allenamenti finiti); null se mai fatto
  function best(sessions, id, pid) {
    const rs = sessions.filter((s) => s.drill === id && s.player === pid && s.done && typeof s.result === 'number').map((s) => s.result);
    if (!rs.length) return null;
    return drill(id).better === 'low' ? Math.min.apply(null, rs) : Math.max.apply(null, rs);
  }
  D.train = { DRILLS, drill, replay, result, view, fmt, best };
})(globalThis.D = globalThis.D || {});
