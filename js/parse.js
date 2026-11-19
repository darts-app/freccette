/* Dal testo riconosciuto ai tiri. Funzioni pure. */
(function (D) {
  'use strict';
  const B = D.board;
  const NUM = { zero: 0, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
    undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18,
    diciannove: 19, venti: 20, venticinque: 25, cinquanta: 50 };
  // «libro», «pro» = come Safari sente «triplo»; «pool» = «bull» (prova vera sull'iPhone)
  const MULT = { triplo: 3, tripla: 3, tripli: 3, triple: 3, t: 3, libro: 3, pro: 3, doppio: 2, doppia: 2, doppi: 2, doppie: 2, d: 2,
    singolo: 1, singola: 1, singoli: 1 };
  const BULL = { centro: 1, bull: 1, bullseye: 1, bulls: 1, bul: 1, bullet: 1, pool: 1 };
  const MISS = { fuori: 1, niente: 1, mancato: 1, mancata: 1, miss: 1, nulla: 1 };
  const CMD = { annulla: 'undo', indietro: 'undo', correggi: 'fix', cancella: 'fix' };

  function words(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2')
      .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  }
  const okNum = (v) => (v >= 1 && v <= 20) || v === 25 || v === 50;

  // cifre attaccate («666», «14912»): tutti i modi di dividerle in k numeri validi
  function splits(x, k) {
    if (k === 1) return x[0] !== '0' && okNum(+x) ? [[+x]] : [];
    const out = [];
    for (let i = 1; i < x.length; i++) {
      const a = x.slice(0, i);
      if (a[0] === '0' || !okNum(+a)) continue;
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
        if (/^[1-9]{2}$/.test(x) && v <= 19) tk.sp = [+x[0], +x[1]];   // «14» scritto in cifre: forse era «uno, quattro»
        out.push(tk); continue;
      }
      // cifre attaccate: prima in 2 numeri («2016» = 20 e 16), se no in 3 («666» = 6, 6, 6)
      const op = /^\d+$/.test(x) ? (splits(x, 2).length ? splits(x, 2) : splits(x, 3)) : [];
      out.push(op.length ? { t: 'g', op: op } : { t: 'bad' });
    }
    return out;
  }

  // segni → letture possibili (liste di tiri). «25» può essere 25 oppure 20 e 5.
  const one = (v, mu) => (v === 50 ? B.dart(25, 2) : B.dart(v, mu || 1));
  function readings(tk) {
    let outs = [[]];
    const add = (opts) => { const n = []; outs.forEach((o) => opts.forEach((op) => n.push(o.concat(op)))); outs = n.slice(0, 16); };
    for (let i = 0; i < tk.length; i++) {
      const x = tk[i];
      if (x.t === 'bad') return [];
      if (x.t === 'bull') { add([[B.dart(25, 2)]]); continue; }
      if (x.t === 'miss') { add([[B.MISS]]); continue; }
      if (x.t === 'g') { add(x.op.map((o) => o.map((v) => one(v)))); continue; }
      if (x.t === 'm') {
        const n = tk[i + 1];
        i++;
        if (!n) return [];
        if (n.t === 'bull') { if (x.v === 3) return []; add([[B.dart(25, x.v)]]); continue; }
        if (n.t === 'g') {                                   // «doppio 2016» = D20 16: il moltiplicatore va al primo pezzo
          const op = n.op.filter((o) => o[0] !== 50 && !(o[0] === 25 && x.v === 3));
          if (!op.length) return [];
          add(op.map((o) => o.map((v, k) => one(v, k ? 1 : x.v)))); continue;
        }
        if (n.t !== 'n' || n.v === 0 || n.v === 50) return [];
        if (n.v === 25) add(x.v === 3 ? [[B.dart(20, 3), B.dart(5, 1)]] : [[B.dart(25, x.v)], [B.dart(20, x.v), B.dart(5, 1)]]);
        else add([[B.dart(n.v, x.v)]]);
        continue;
      }
      if (x.t === 'n') {
        if (x.v === 0) add([[B.MISS]]);
        else if (x.v === 50) add([[B.dart(25, 2)]]);
        else if (x.v === 25) add([[B.dart(25, 1)], [B.dart(20, 1), B.dart(5, 1)]]);
        else add([[B.dart(x.v, 1)]]);
      }
    }
    return outs.filter((o) => o.length);
  }

  function parse(text) {
    const tk = tokens(text);
    const c = tk.find((x) => x.t === 'cmd');
    if (c) return { cmd: c.v, skip: tk.skip };
    return { cands: readings(tk), tk: tk, skip: tk.skip };
  }

  const key = (ds) => ds.map(B.label).join(' ');
  // alts = ipotesi del riconoscitore; ctx = { need: tiri mancanti, ends(tiri) → indice di fine turno o -1 }
  function choose(alts, ctx) {
    let partial = null, partialTk = null;
    const isFull = (c) => { if (c.length > ctx.need) return false; const e = ctx.ends(c); return e === c.length - 1 || (e === -1 && c.length === ctx.need); };
    // prima le ipotesi con meno parole sconosciute («Proventi…», «Vitro 20…» vanno in fondo); a parità, l'ordine di Safari
    const ps = alts.map((text, i) => ({ p: parse(text), i: i })).sort((a, b) => (a.p.skip - b.p.skip) || (a.i - b.i));
    for (const { p } of ps) {
      if (p.cmd) return { kind: 'cmd', cmd: p.cmd };
      const complete = [], seen = {};
      p.cands.forEach((c) => {
        if (c.length > ctx.need) return;
        const e = ctx.ends(c);
        if (isFull(c)) { if (!seen[key(c)]) { seen[key(c)] = 1; complete.push(c); } }
        else if (e === -1 && !partial) { partial = c; partialTk = p.tk; }
      });
      if (complete.length === 1) return { kind: 'ok', darts: complete[0] };
      if (complete.length > 1) return { kind: 'ambiguous', options: complete };
    }
    if (!partial) return { kind: 'none' };
    // turno a metà con un numero in cifre («18 14»): forse Safari ha attaccato «uno, quattro». Si chiede.
    const options = [partial], seen = {};
    seen[key(partial)] = 1;
    for (let j = partialTk.length - 1; j >= 0; j--) {
      const x = partialTk[j];
      if (!x.sp || (j > 0 && partialTk[j - 1].t === 'm')) continue;
      const tk2 = partialTk.slice(0, j).concat([{ t: 'n', v: x.sp[0] }, { t: 'n', v: x.sp[1] }], partialTk.slice(j + 1));
      readings(tk2).forEach((c) => { if (isFull(c) && !seen[key(c)]) { seen[key(c)] = 1; options.push(c); } });
    }
    return options.length > 1 ? { kind: 'ambiguous', options: options } : { kind: 'partial', darts: partial };
  }
  D.parse = { words, tokens, readings, parse, choose };
})(globalThis.D = globalThis.D || {});
