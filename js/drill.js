/* Allenamento: scheda con gli allenamenti, allenamento in corso, risultato. Le regole sono in train.js. */
(function (D) {
  'use strict';
  const A = D.app, esc = D.esc, acts = D.acts, B = D.board, TR = D.train;
  const CONFIRM_MS = 500;      // allenamento: mezzo secondo dopo il terzo tiro (in partita dalla 0.5.3 si passa subito)
  let s = null, st = null;     // allenamento aperto e suo stato ricostruito
  let pending = [], mult = 1, confirmT = 0, msg = '', vstate = 'idle', opts = null;
  const dr = () => TR.drill(s.drill);
  function refresh() { s = A.data.trainings.find((x) => x.id === A.sel); st = TR.replay(s.drill, s.turns); }
  const me = () => A.data.players.find((p) => p.id === A.data.settings.trainP) || A.data.players[0] || null;
  const unfinished = (id, pid) => TR.unfinished(A.data.trainings, id, pid);
  const group = (label, inner) => `<section class="group"><div class="ghead"><span class="t-label">${label}</span></div>${inner}</section>`;

  /* ---------- Scheda ---------- */
  D.views.allena = function () {
    let h = `<header class="top"><h1>Allenamento</h1><button class="ver" id="ver">v${A.VERSION}</button></header>`;
    const ps = A.data.players, p = me();
    if (!p) return h + `<p class="muted">Crea prima un giocatore: ognuno ha i suoi record.</p><button class="btn ghost" data-act="newp2">${D.icon('plus')}Nuovo giocatore</button>`;
    h += group('Chi si allena', '<div class="pick">' + ps.map((x) => `<button class="pk ${x === p ? 'in' : ''}" data-act="trainp" data-id="${x.id}">${A.avatar(x, 'l')}<span>${esc(x.name)}</span></button>`).join('') + '</div>');
    h += group('Scegli un allenamento · record di ' + esc(p.name), '<div class="list">' + TR.DRILLS.map((x) => {
      const b = TR.best(A.data.trainings, x.id, p.id), open = unfinished(x.id, p.id);
      return `<button class="dr" data-act="dstart" data-id="${x.id}"><span class="ic">${D.icon(x.icon)}</span><span class="t"><b>${x.name}</b><span>${open ? '<em>in corso</em> · tocca per riprendere' : x.desc}</span></span>
        ${open ? `<span class="dx" data-act="ddrop" data-id="${x.id}" role="button" aria-label="Abbandona ${x.name}"><i>✕</i></span>`
    : `<span class="rec"><b class="num">${TR.fmt(x.id, b)}</b><span>${b === null ? 'mai fatto' : x.unit}</span></span>`}<span class="chev">›</span></button>`;
    }).join('') + '</div>');
    return h;
  };
  // ✕ nella riga «in corso»: abbandona dopo conferma (il record resta)
  acts.ddrop = (el) => {
    const p = me(), x = TR.drill(el.dataset.id);
    if (!p || !x) return;
    A.confirm(`Abbandonare ${x.name}? I tiri fatti finora si cancellano, il record resta.`, 'Elimina', () => {
      A.data.trainings = TR.drop(A.data.trainings, x.id, p.id); A.persist(); A.render();
    }, true);
  };
  acts.trainp = (el) => { A.data.settings.trainP = el.dataset.id; A.persist(); A.render(); };
  acts.dstart = (el) => {
    const p = me(), id = el.dataset.id;
    let t = unfinished(id, p.id);
    if (!t) { t = { id: D.store.uid('t'), created: Date.now(), drill: id, player: p.id, name: p.name, turns: [], done: false, result: null }; A.data.trainings.push(t); A.persist(); }
    open(t.id);
  };
  function open(id) {
    clearTimeout(confirmT); confirmT = 0; A.sel = id; pending = []; mult = 1; msg = '';
    refresh();
    A.view = 'allenamento'; D.play.awake(true);
    if (A.data.settings.listen === 'always') startVoice();
    A.render();
  }

  /* ---------- Tiri, voce, conferma ---------- */
  function addDarts(ds) {
    if (!s || s.done) return;
    clearTimeout(confirmT); confirmT = 0;
    pending = pending.concat(ds).slice(0, 3);
    const r = dr().turn(st, pending);
    if (r.used < pending.length) pending = pending.slice(0, r.used);   // dopo la fine del turno non si tira
    if (r.endAt >= 0 || pending.length === 3) confirmT = setTimeout(commit, CONFIRM_MS);
    A.render();
  }
  function save() {                                          // registra il turno in corso (senza disegnare)
    clearTimeout(confirmT); confirmT = 0;
    if (!pending.length) return;
    s.turns.push({ darts: pending }); pending = []; mult = 1; msg = '';
    refresh();
    if (st.done) { s.done = true; s.result = TR.result(s.drill, st); s.ended = Date.now(); }
    A.persist();
  }
  function commit() {
    const r = pending.length ? dr().turn(st, pending) : null, ok0 = st.ok || 0;
    save();
    // bip speciali: sballo, chiusura (121), 180 (tiro al 20), nuovo record a fine allenamento
    const prev = s.done ? TR.best(A.data.trainings.filter((t) => t !== s), s.drill, s.player) : null;
    const rec = s.done && (prev === null || (dr().better === 'low' ? s.result < prev : s.result > prev));
    if (r) D.voice.chime(r.bust ? 'bust' : rec || (st.ok || 0) > ok0 ? 'win' : B.sum(pending.length ? pending : s.turns[s.turns.length - 1].darts) === 180 ? '180' : '');
    if (r && r.bust) A.toast('Sballato');
    if (s.done) { D.voice.stop(); D.play.awake(false); A.view = 'allfine'; A.render(); return; }
    if (A.data.settings.listen === 'always') startVoice();
    A.render();
  }
  function startVoice() {
    if (!D.voice.supported()) { vstate = 'unsupported'; return; }
    D.voice.start({
      mode: A.data.settings.listen,
      onResult: heard,
      fast: A.data.settings.fast === 'off' ? null : fast,
      onState: (x) => { vstate = x; if (A.view === 'allenamento') A.render(); },
      onError: (err) => { if (err === 'not-allowed' || err === 'service-not-allowed') { vstate = 'denied'; A.render(); } },
    });
  }
  let taken = {};              // frasi già segnate con la risposta veloce: la frase finale si ignora
  function read(alts, more) {
    const x = dr();
    return D.parse.choose(alts, {
      need: 3 - pending.length,
      ends: (c) => { const t = x.turn(st, pending.concat(c)); return t.endAt < 0 ? -1 : t.endAt - pending.length; },
      busts: (c) => x.turn(st, pending.concat(c)).bust,
    }, more);
  }
  function fast(alts, key, part) {
    if (part || taken[key] || A.view !== 'allenamento' || !s || s.done || confirmT) return false;
    if (read(alts).kind !== 'ok') return false;
    heard(alts); taken[key] = 1; return 'full';
  }
  function heard(alts, key, more) {
    if (key && taken[key]) return;
    if (A.view !== 'allenamento' || !s || s.done || confirmT) return;
    const r = read(alts, more);
    if (r.kind === 'cmd') { D.voice.beep(true); acts.dback(); return; }
    if (r.kind === 'ok' || r.kind === 'partial') { msg = '«' + (alts[0] || '') + '»'; D.voice.beep(true); addDarts(r.darts); return; }
    if (r.kind === 'ambiguous') {
      D.voice.beep(true); opts = r.options;
      A.sheet('<b class="stitle">Cosa hai detto?</b>' + r.options.map((o, i) => `<button class="btn ghost" data-act="dpick" data-i="${i}">${o.map(B.label).join(' · ')}</button>`).join(''));
      return;
    }
    D.voice.beep(false); msg = 'Non ho capito: «' + (alts[0] || '') + '»'; A.render();
  }
  acts.dpick = (el) => { const o = opts[+el.dataset.i]; A.closeSheet(); addDarts(o); };
  acts.dmic = () => {
    if (vstate === 'listening') { if (A.data.settings.listen === 'tap') D.voice.stop(); return; }
    startVoice();
  };
  acts.dvmode = () => {
    const x = A.data.settings;
    x.listen = x.listen === 'always' ? 'tap' : 'always'; A.persist();
    D.voice.stop();
    if (x.listen === 'always') startVoice();
    A.toast(x.listen === 'always' ? 'Sempre in ascolto' : 'Un tocco');
    A.render();
  };
  acts.dk = (el) => {
    const v = +el.dataset.v;
    const d = v === 0 ? B.MISS : v === 50 ? B.dart(25, 2) : v === 25 ? B.dart(25, mult === 2 ? 2 : 1) : B.dart(v, mult);
    mult = 1; addDarts([d]);
  };
  acts.dmult = (el) => { const v = +el.dataset.v; mult = mult === v ? 1 : v; A.render(); };
  acts.dpad = () => { A.data.settings.pad = !A.data.settings.pad; A.persist(); A.render(); };
  acts.dslot = (el) => { const i = +el.dataset.i; if (i >= pending.length) return; clearTimeout(confirmT); confirmT = 0; pending = pending.slice(0, i); A.render(); };
  // ⌫: un tiro alla volta, anche dentro i turni già registrati
  acts.dback = () => {
    clearTimeout(confirmT); confirmT = 0; mult = 1; msg = '';
    if (pending.length) pending = pending.slice(0, -1);
    else if (s.turns.length) { const t = s.turns.pop(); refresh(); pending = t.darts.slice(0, -1); A.persist(); }
    A.render();
  };
  acts.dexit = () => {
    save();
    if (!s.done && !s.turns.length) { A.data.trainings = A.data.trainings.filter((t) => t !== s); A.persist(); }   // senza tiri: non resta «in corso»
    D.voice.stop(); D.play.awake(false); A.tab = 'allena'; A.view = 'home'; A.render(); };
  acts.dagain = () => { const p = A.data.players.find((x) => x.id === s.player); if (p) A.data.settings.trainP = p.id; acts.dstart({ dataset: { id: s.drill } }); };
  acts.dend = () => { A.tab = 'allena'; A.view = 'home'; A.render(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && A.view === 'allenamento' && confirmT) save(); });

  /* ---------- Allenamento in corso ---------- */
  D.views.allenamento = function () {
    const x = dr(), pr = x.turn(st, pending), v = x.view(pr.st);
    const b = TR.best(A.data.trainings.filter((t) => t !== s), s.drill, s.player);
    const slots = [0, 1, 2].map((i) => { const d = pending[i]; return `<button class="slot ${d ? 'f' : ''} ${d && pr.marks[i] ? 'hit' : ''}" data-act="dslot" data-i="${i}">${d ? B.label(d) : '–'}</button>`; }).join('');
    // barra del turno: nei giri e in Bob's 27 conta i tiri a segno, negli altri i punti
    const pts = x.id === 'co121' || x.id === 't20', hits = pr.marks.filter(Boolean).length;
    const tbar = `<div class="tbar">${[0, 1, 2].map((i) => { const d = pending[i]; return `<button class="tcell ${d ? 'f' : 'e'} ${d && pr.marks[i] ? 'hit' : ''}" data-act="dslot" data-i="${i}"><b class="num">${d ? B.label(d) : '–'}</b><small class="num">${d ? (pts ? B.score(d) : pr.marks[i] ? 'a segno' : '') || '&nbsp;' : '&nbsp;'}</small></button>`; }).join('')}
      <div class="ttot ${pr.bust ? 'bust' : ''}"><b class="num">${pr.bust ? '✗' : pts ? B.sum(pending) : hits}</b><small>${pr.bust ? 'sballo' : pts ? 'turno' : 'a segno'}</small></div></div>`;
    const voiceOk = vstate !== 'unsupported' && vstate !== 'denied';
    const always = A.data.settings.listen === 'always';
    const state = vstate === 'unsupported' ? 'Voce non disponibile: usa la tastiera' : vstate === 'denied' ? 'Microfono non permesso' :
      vstate === 'listening' ? 'Ti ascolto…' : vstate === 'paused' ? 'Tocca per riprendere' : 'Tocca il microfono e detta i tiri';
    const padOpen = A.data.settings.pad || !voiceOk;
    let keys = '';
    for (let n = 1; n <= 20; n++) keys += `<button class="key" data-act="dk" data-v="${n}">${n}</button>`;
    keys += '<button class="key" data-act="dk" data-v="25">25</button><button class="key" data-act="dk" data-v="50">Bull</button><button class="key" data-act="dk" data-v="0">0</button>' +
      `<button class="key m ${mult === 2 ? 'on' : ''}" data-act="dmult" data-v="2">D</button><button class="key m ${mult === 3 ? 'on' : ''}" data-act="dmult" data-v="3">T</button>`;
    const can = pending.length > 0 || s.turns.length > 0;
    return `<header class="ptop"><button class="x" data-act="dexit">‹ Esci</button><div class="mid"><b>${x.name}</b><span>${esc(s.name)} · ${b === null ? 'primo record' : 'record ' + TR.fmt(s.drill, b) + ' ' + x.unit}</span></div>
        <button class="vbtn" data-act="dvmode" aria-label="Cambia modo della voce">${D.icon('mic')}${always ? 'Sempre' : 'Un tocco'}</button></header>
      <div class="tgt"><span class="lab">${v.label}</span><b class="big num">${v.big}</b>${v.sub ? `<span class="tsub">${v.sub}</span>` : ''}<div class="prog">${v.prog.map((c) => `<i class="${c}"></i>`).join('')}</div></div>
      <div class="kv">${v.kv.map((k) => `<div><b class="num">${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
      ${tbar}<p class="status">${confirmT ? '✓' : esc(msg) || '&nbsp;'}</p>
      <div class="micwrap">${voiceOk ? `<button class="mic ${vstate}" data-act="dmic" aria-label="Parla">${D.icon('mic')}</button>` : ''}<p class="hint">${state}</p></div>
      <div class="pfoot"><button class="btn2" data-act="dpad">${D.icon('kbd')}Tastiera</button><button class="btn2" data-act="dback" ${can ? '' : 'disabled'}>${D.icon('bksp')}Indietro</button></div>
      <div class="kpad ${padOpen ? 'open' : ''}"><div class="khead"><span class="kwho"><b>${esc(s.name)}</b><span class="num">${v.big}</span><em>${v.sub ? esc(v.sub) : ''}</em></span><div class="kslots">${slots}</div></div>${keys}<button class="key bk ${voiceOk ? '' : 'wide'}" data-act="dback" aria-label="Cancella l'ultimo tiro">${D.icon('bksp')}</button>${voiceOk ? '<button class="key close" data-act="dpad">Chiudi</button>' : ''}</div>`;
  };

  /* ---------- Risultato ---------- */
  D.views.allfine = function () {
    const x = dr(), v = x.view(st), prev = TR.best(A.data.trainings.filter((t) => t !== s), s.drill, s.player);
    const better = prev !== null && (x.better === 'low' ? s.result < prev : s.result > prev);
    const badge = prev === null ? '<span class="badge">Primo record</span>' : better ? `<span class="badge">Nuovo record (prima ${TR.fmt(s.drill, prev)})</span>` : `<span class="t-meta">record ${TR.fmt(s.drill, prev)}</span>`;
    const hist = A.data.trainings.filter((t) => t.drill === s.drill && t.player === s.player && t.done).slice(-8);
    const top = Math.max.apply(null, hist.map((t) => t.result).concat([1]));
    const bars = hist.map((t) => `<i class="${t === s ? 'now' : ''}" style="height:${Math.max(6, Math.round(t.result / top * 100))}%" title="${TR.fmt(s.drill, t.result)}"></i>`).join('');
    return `<div class="res"><em>${x.name} · ${esc(s.name)}</em><b class="num">${TR.fmt(s.drill, s.result)}</b><em>${x.unit}${st.lost ? ' · finito al ' + (st.r === 21 ? 'bull' : 'D' + st.r) : ''}</em>${badge}</div>
      <div class="kv">${v.kv.map((k) => `<div><b class="num">${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
      ${hist.length > 1 ? `<p class="t-label hl">Ultime volte</p><div class="hist">${bars}</div>` : ''}
      <button class="btn big" data-act="dagain">${D.icon('replay')}Rifai</button>
      <button class="btn ghost" data-act="dend">Fine</button>`;
  };
  D.drill = { open, heard };                  // heard: anche per provare la voce dal Mac
})(globalThis.D = globalThis.D || {});
