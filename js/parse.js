/* Dal testo riconosciuto ai tiri. Funzioni pure. */
(function (D) {
  'use strict';
  const B = D.board;
  const NUM = { zero: 0, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
    undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18,
    diciannove: 19, venti: 20, venticinque: 25, cinquanta: 50 };
  const MULT = { triplo: 3, tripla: 3, tripli: 3, triple: 3, t: 3, doppio: 2, doppia: 2, doppi: 2, doppie: 2, d: 2,
    singolo: 1, singola: 1, singoli: 1 };
  const BULL = { centro: 1, bull: 1, bullseye: 1, bulls: 1, bul: 1, bullet: 1 };
  const MISS = { fuori: 1, niente: 1, mancato: 1, mancata: 1, miss: 1, nulla: 1 };
  const CMD = { annulla: 'undo', indietro: 'undo', correggi: 'fix', cancella: 'fix' };

  function words(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2')
      .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  }
  const okNum = (v) => (v >= 1 && v <= 20) || v === 25 || v === 50;

  // parole → segni: m (moltiplicatore), n (numero), bull, miss, cmd, bad
  function tokens(text) {
    const w = words(text), out = [];
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
      if (v === null) continue;                              // parola di contorno: si ignora
      if ((v === 2 || v === 3) && (nx === 'volte' || nx === 'per')) { out.push({ t: 'm', v: v }); i++; continue; }
      if (v === 0 || okNum(v)) { out.push({ t: 'n', v: v }); continue; }
      // cifre attaccate («2016» = 20 e 16): prima divisione valida
      let split = null;
      for (let k = 1; k < x.length && !split; k++) {
        const a = x.slice(0, k), b = x.slice(k);
        if (b[0] !== '0' && okNum(+a) && okNum(+b)) split = [+a, +b];
      }
      if (split) split.forEach((s) => out.push({ t: 'n', v: s }));
      else out.push({ t: 'bad' });
    }
    return out;
  }

  // segni → letture possibili (liste di tiri). «25» può essere 25 oppure 20 e 5.
  function readings(tk) {
    let outs = [[]];
    const add = (opts) => { const n = []; outs.forEach((o) => opts.forEach((op) => n.push(o.concat(op)))); outs = n.slice(0, 16); };
    for (let i = 0; i < tk.length; i++) {
      const x = tk[i];
      if (x.t === 'bad') return [];
      if (x.t === 'bull') { add([[B.dart(25, 2)]]); continue; }
      if (x.t === 'miss') { add([[B.MISS]]); continue; }
      if (x.t === 'm') {
        const n = tk[i + 1];
        i++;
        if (!n) return [];
        if (n.t === 'bull') { if (x.v === 3) return []; add([[B.dart(25, x.v)]]); continue; }
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
    if (c) return { cmd: c.v };
    return { cands: readings(tk) };
  }

  const key = (ds) => ds.map(B.label).join(' ');
  // alts = ipotesi del riconoscitore; ctx = { need: tiri mancanti, ends(tiri) → indice di fine turno o -1 }
  function choose(alts, ctx) {
    let partial = null;
    for (const text of alts) {
      const p = parse(text);
      if (p.cmd) return { kind: 'cmd', cmd: p.cmd };
      const complete = [], seen = {};
      p.cands.forEach((c) => {
        if (c.length > ctx.need) return;
        const e = ctx.ends(c);
        if (e === c.length - 1 || (e === -1 && c.length === ctx.need)) { if (!seen[key(c)]) { seen[key(c)] = 1; complete.push(c); } }
        else if (e === -1 && !partial) partial = c;
      });
      if (complete.length === 1) return { kind: 'ok', darts: complete[0] };
      if (complete.length > 1) return { kind: 'ambiguous', options: complete };
    }
    return partial ? { kind: 'partial', darts: partial } : { kind: 'none' };
  }
  D.parse = { words, tokens, readings, parse, choose };
})(globalThis.D = globalThis.D || {});
