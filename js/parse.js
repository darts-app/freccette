/* Dal testo riconosciuto ai tiri. Funzioni pure. */
(function (D) {
  'use strict';
  const B = D.board;
  const NUM = { zero: 0, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
    undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18,
    diciannove: 19, venti: 20, venticinque: 25, cinquanta: 50 };
  // «libro», «pro» = come Safari sente «triplo»; «pool», «entro» = «bull», «centro» (prove vere sull'iPhone)
  const MULT = { triplo: 3, tripla: 3, tripli: 3, triple: 3, t: 3, libro: 3, pro: 3, doppio: 2, doppia: 2, doppi: 2, doppie: 2, d: 2,
    singolo: 1, singola: 1, singoli: 1 };
  const BULL = { centro: 1, bull: 1, bullseye: 1, bulls: 1, bul: 1, bullet: 1, pool: 1, entro: 1 };
  const MISS = { fuori: 1, niente: 1, mancato: 1, mancata: 1, miss: 1, nulla: 1 };
  const CMD = { annulla: 'undo', indietro: 'undo', correggi: 'fix', cancella: 'fix' };

  function words(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2')
      .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  }
  const okNum = (v) => (v >= 1 && v <= 20) || v === 25 || v === 50;

  // cifre attaccate («666», «14912», «2000»): tutti i modi di dividerle in k numeri validi (anche «0» = fuori)
  const okPart = (a) => a === '0' || (a[0] !== '0' && okNum(+a));
  function splits(x, k) {
    if (k === 1) return okPart(x) ? [[+x]] : [];
    const out = [];
    for (let i = 1; i < x.length; i++) {
      const a = x.slice(0, i);
      if (!okPart(a)) continue;
      splits(x.slice(i), k - 1).forEach((r) => out.push([+a].concat(r)));
    }
    return out;
  }

  // parole → segni: m (moltiplicatore), n (numero; «sp» = come dividerlo se Safari ha attaccato due cifre),
  // g (cifre attaccate: «op» = divisioni possibili), bull, miss, cmd, bad. out.skip = parole ignorate.
  function tokens(text) {
    const w = words(text), out = [];
    out.skip = 0;
    for (let i = 0; i < w.length; i++) {
      const x = w[i], nx = w[i + 1];
      if (CMD[x]) { out.push({ t: 'cmd', v: CMD[x] }); continue; }
      if (x === 'mezzo' && nx === 'centro') { out.push({ t: 'n', v: 25 }); i++; continue; }
      if (MULT[x]) { out.push({ t: 'm', v: MULT[x] }); continue; }
      if (BULL[x]) { out.push({ t: 'bull' }); continue; }
      if (MISS[x]) { out.push({ t: 'miss' }); continue; }
      let v = null;
      if (x in NUM) v = NUM[x];
      else if (/^\d+$/.test(x)) v = parseInt(x, 10);
      if (v === null) { out.skip++; continue; }              // parola di contorno: si ignora
      if ((v === 2 || v === 3) && (nx === 'volte' || nx === 'per')) { out.push({ t: 'm', v: v }); i++; continue; }
      if (v === 0 || okNum(v)) {
        const tk = { t: 'n', v: v };
        out.push(tk); continue;
      }
      // cifre attaccate: prima in 2 numeri («2016» = 20 e 16), se no in 3 («666» = 6, 6, 6).
      // 3 cifre senza zeri («111», «123»): prima 3 tiri da una cifra, poi i 2 numeri (p = penalità: si preferisce la più bassa)
      let op = [];
      if (/^[1-9]{3}$/.test(x)) op = [{ v: [+x[0], +x[1], +x[2]], p: 0 }].concat(splits(x, 2).map((v) => ({ v: v, p: 1 })));
      else if (/^\d+$/.test(x)) op = (splits(x, 2).length ? splits(x, 2) : splits(x, 3)).map((v) => ({ v: v, p: 0 }));
      out.push(op.length ? { t: 'g', op: op, raw: x } : { t: 'bad' });
    }
    return out;
  }

  // segni → letture possibili (liste di tiri). «25» è 25; come ripiego (penalità 1) anche 20 e 5.
  const one = (v, mu) => (v === 0 ? B.MISS : v === 50 ? B.dart(25, 2) : B.dart(v, mu || 1));
  // ogni lettura porta una penalità (lettura.pen): a parità di turno completo vince quella con la penalità più bassa
  function readings(tk) {
    let outs = [{ d: [], p: 0 }];
    const add = (opts) => {
      const n = [];
      outs.forEach((o) => opts.forEach((op) => { const q = Array.isArray(op) ? { d: op, p: 0 } : op; n.push({ d: o.d.concat(q.d), p: o.p + q.p }); }));
      outs = n.slice(0, 24);
    };
    for (let i = 0; i < tk.length; i++) {
      const x = tk[i];
      if (x.t === 'bad') return [];
      if (x.t === 'bull') { add([[B.dart(25, 2)]]); continue; }
      if (x.t === 'miss') { add([[B.MISS]]); continue; }
      if (x.t === 'g') { add(x.op.map((o) => ({ d: o.v.map((v) => one(v)), p: o.p }))); continue; }
      if (x.t === 'm') {
        const n = tk[i + 1];
        i++;
        if (!n) return [];
        if (n.t === 'bull') { if (x.v === 3) return []; add([[B.dart(25, x.v)]]); continue; }
        if (n.t === 'g') {                                   // «doppio 2016» = D20 16: il moltiplicatore va al primo pezzo
          const op = n.op.filter((o) => o.v[0] !== 0 && o.v[0] !== 50 && !(o.v[0] === 25 && x.v === 3));
          if (!op.length) return [];
          add(op.map((o) => ({ d: o.v.map((v, k) => one(v, k ? 1 : x.v)), p: o.p }))); continue;
        }
        if (n.t !== 'n' || n.v === 0 || n.v === 50) return [];
        if (n.v === 25) add(x.v === 3 ? [[B.dart(20, 3), B.dart(5, 1)]] : [[B.dart(25, x.v)], { d: [B.dart(20, x.v), B.dart(5, 1)], p: 1 }]);
        else add([[B.dart(n.v, x.v)]]);
        continue;
      }
      if (x.t === 'n') {
        if (x.v === 0) add([[B.MISS]]);
        else if (x.v === 50) add([[B.dart(25, 2)]]);
        else if (x.v === 25) add([[B.dart(25, 1)], { d: [B.dart(20, 1), B.dart(5, 1)], p: 1 }]);   // «25» = 25; 20 e 5 solo se non c'è altro
        else add([[B.dart(x.v, 1)]]);
      }
    }
    return outs.filter((o) => o.d.length).map((o) => { const d = o.d; d.pen = o.p; return d; });
  }

  function parse(text) {
    const tk = tokens(text);
    const c = tk.find((x) => x.t === 'cmd');
    if (c) return { cmd: c.v, skip: tk.skip };
    return { cands: readings(tk), tk: tk, skip: tk.skip };
  }

  const key = (ds) => ds.map(B.label).join(' ');
  // alts = ipotesi del riconoscitore; ctx = { need: tiri mancanti, ends(tiri) → indice di fine turno o -1, busts(tiri) → è sballo? (facoltativo) }
  // more = testi provvisori della stessa frase (prima che Safari li «aggiusti»): «20 e 5» provvisorio, «25» finale.
  // Si usano solo se la frase finale non dà un turno completo: vince un turno completo o un turno a metà più lungo.
  // «firma» di una frase: le cifre e i segni in fila, senza spazi. «13», «tredici», «1 3» e «uno tre» hanno la stessa firma:
  // è la stessa voce raggruppata in modo diverso, e allora vale come la raggruppa Safari nella prima ipotesi.
  const sigOf = (tk) => tk.map((x) => x.t === 'n' ? String(x.v) : x.t === 'g' ? x.raw : x.t === 'm' ? 'm' + x.v : x.t === 'bull' ? 'b' : x.t === 'miss' ? 'x' : '?').join('');
  function choose(alts, ctx, more) {
    const r = choose1(alts, ctx);
    if (!more || !more.length || r.kind === 'ok' || r.kind === 'cmd' || r.kind === 'ambiguous') return r;
    const sig0 = alts.length ? sigOf(tokens(alts[0])) : '';
    let best = r;
    for (const t of more) {
      if (sigOf(tokens(t)) === sig0) continue;              // provvisorio «1 3», finale «13»: vale il finale
      const r2 = choose1([t], ctx);
      if (r2.kind === 'ok' && !r2.darts.pen) return r2;
      if (r2.kind === 'partial' && (best.kind === 'none' || r2.darts.length > best.darts.length)) best = r2;
    }
    return best;
  }
  function choose1(alts, ctx) {
    let partial = null, partialTk = null, amb = null;
    const isFull = (c) => { if (c.length > ctx.need) return false; const e = ctx.ends(c); return e === c.length - 1 || (e === -1 && c.length === ctx.need); };
    // prima le ipotesi con meno parole sconosciute («Proventi…», «Vitro 20…» vanno in fondo); a parità, l'ordine di Safari
    const ps = alts.map((text, i) => ({ p: parse(text), i: i })).sort((a, b) => (a.p.skip - b.p.skip) || (a.i - b.i));
    const sig0 = ps.length && ps[0].p.tk ? sigOf(ps[0].p.tk) : null, ok0 = ps.length && ps[0].p.cands && ps[0].p.cands.length > 0;
    for (let k = 0; k < ps.length; k++) {
      const p = ps[k].p;
      // ipotesi di riserva con le stesse cifre raggruppate diversamente («13» → «1 3»): si ignora, vale la prima
      if (k > 0 && ok0 && p.tk && sigOf(p.tk) === sig0) continue;
      if (p.cmd) return { kind: 'cmd', cmd: p.cmd };
      const complete = [], seen = {};
      p.cands.slice().sort((a, b) => a.pen - b.pen).forEach((c0) => {
        // sballo a metà turno: si dicono lo stesso tutti e 3 i tiri, valgono quelli fino allo sballo (ctx.busts dice se è sballo)
        let c = c0;
        if (ctx.busts) { const e0 = ctx.ends(c); if (e0 >= 0 && e0 < c.length - 1 && ctx.busts(c.slice(0, e0 + 1))) { c = c.slice(0, e0 + 1); c.pen = c0.pen; } }
        if (c.length > ctx.need) return;
        const e = ctx.ends(c);
        if (isFull(c)) { if (!seen[key(c)]) { seen[key(c)] = 1; complete.push(c); } }
        else if (e === -1 && !partial) { partial = c; partialTk = p.tk; }
      });
      // un turno a metà letto «pulito» (penalità più bassa) vince su un turno completo letto di ripiego:
      // «25 20» resta 25 e 20 (manca un tiro), non diventa 20 5 20
      const halfPen = p.cands.filter((c) => c.length <= ctx.need && ctx.ends(c) === -1 && c.length < ctx.need).reduce((m, c) => Math.min(m, c.pen || 0), Infinity);
      let low = complete.filter((c) => (c.pen || 0) === Math.min.apply(null, complete.map((x) => x.pen || 0)));
      if (low.length && (low[0].pen || 0) > halfPen) low = [];
      if (low.length === 1) return { kind: 'ok', darts: low[0] };
      if (low.length > 1 && !amb) amb = low;       // in dubbio: prima si guarda se un'altra ipotesi è chiara («125 fuori» / «Centro25 fuori»)
    }
    if (amb) return { kind: 'ambiguous', options: amb };
    if (!partial) return { kind: 'none' };
    // (fino alla 0.5.3 qui un numero in cifre si divideva da solo: «20 13» → 20 1 3. Tolto: un numero detto resta quel numero)
    return { kind: 'partial', darts: partial };
  }
  D.parse = { words, tokens, readings, parse, choose };
})(globalThis.D = globalThis.D || {});
