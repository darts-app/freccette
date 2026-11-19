/* Partita: tabellone, tiri del turno, voce, tastiera, bot, fine partita. */
(function (D) {
  'use strict';
  const A = D.app, esc = D.esc, acts = D.acts, B = D.board, G = D.game;
  const CONFIRM_MS = 2000;     // tiri visibili prima di registrarli
  const BOT_MS = 900;          // pausa tra i tiri del bot
  let m = null, st = null;     // partita aperta e suo stato ricostruito
  let pending = [];            // tiri del turno in corso
  let mult = 1;                // tastiera: 1, 2 (D) o 3 (T) per il prossimo numero
  let confirmT = 0, botT = 0, busy = false, msg = '', vstate = 'idle', opts = null, lock = null;
  const num = (x) => String(x).replace('.', ',');

  function refresh() { m = A.data.matches.find((x) => x.id === A.sel); st = G.replay(m.cfg, m.turns); }
  const who = () => m.cfg.players[st.cur];
  const clearT = () => { clearTimeout(confirmT); confirmT = 0; clearTimeout(botT); botT = 0; };

  function create(cfg) {
    const mt = { id: D.store.uid('m'), created: Date.now(), cfg: cfg, turns: [], done: false, winner: -1 };
    A.data.matches.push(mt); A.persist();
    open(mt.id);
  }
  function open(id) {
    clearT(); A.sel = id; pending = []; mult = 1; msg = ''; busy = false;
    A.view = 'partita'; keepAwake(); next();
  }
  // dopo ogni cambio: fine partita, turno del bot oppure turno di una persona
  function next() {
    refresh();
    if (st.done) { finish(); return; }
    if (who().bot) { D.voice.stop(); runBot(); }
    else if (A.data.settings.listen === 'always') startVoice();
    A.render();
  }
  function runBot() {
    busy = true; pending = [];
    const lv = D.bot.level(who().bot);
    const ds = D.bot.turn(st.rem[st.cur], m.cfg.out, lv.sigma, Math.random);
    const id = m.id;
    let i = 0;
    const step = () => {
      if (A.view !== 'partita' || A.sel !== id) { busy = false; pending = []; return; }
      if (i < ds.length) { pending.push(ds[i++]); A.render(); botT = setTimeout(step, BOT_MS); return; }
      busy = false; commit();
    };
    botT = setTimeout(step, BOT_MS / 2);
  }
  function addDarts(ds) {
    if (busy || st.done) return;
    clearTimeout(confirmT); confirmT = 0;
    pending = pending.concat(ds).slice(0, 3);
    const e = G.turnEnd(st.rem[st.cur], pending, m.cfg.out);
    if (e >= 0) pending = pending.slice(0, e + 1);
    if (e >= 0 || pending.length === 3) confirmT = setTimeout(commit, CONFIRM_MS);
    A.render();
  }
  function commit() {
    clearTimeout(confirmT); confirmT = 0;
    if (!pending.length) return;
    const p = m.cfg.players[st.cur], legs = st.legs.length;
    m.turns.push({ darts: pending });
    pending = []; mult = 1; msg = '';
    refresh();
    const last = st.legs[st.legs.length - 1].turns.slice(-1)[0] || st.legs[legs - 1].turns.slice(-1)[0];
    m.done = st.done; m.winner = st.winner;
    A.persist();
    if (!st.done && st.legs.length > legs) A.toast('Leg a ' + p.name);
    else if (last && last.bust) A.toast('Sballato');
    next();
  }
  function finish() { clearT(); busy = false; D.voice.stop(); sleepOk(); A.view = 'fine'; A.render(); }
  function lastP(s) { for (let i = s.legs.length - 1; i >= 0; i--) { const t = s.legs[i].turns; if (t.length) return t[t.length - 1].p; } return -1; }

  /* ---------- Voce ---------- */
  function startVoice() {
    if (!D.voice.supported()) { vstate = 'unsupported'; return; }
    D.voice.start({
      mode: A.data.settings.listen,
      onResult: heard,
      onState: (s) => { vstate = s; if (A.view === 'partita') A.render(); },
      onError: (err) => { if (err === 'not-allowed' || err === 'service-not-allowed') { vstate = 'denied'; A.render(); } },
    });
  }
  function heard(alts) {
    if (A.view !== 'partita' || busy || st.done) return;
    const full = confirmT !== 0, base = st.rem[st.cur];
    const r = D.parse.choose(alts, {
      need: full ? 0 : 3 - pending.length,
      ends: (c) => { const e = G.turnEnd(base, pending.concat(c), m.cfg.out); return e < 0 ? -1 : e - pending.length; },
    });
    if (r.kind === 'cmd') {
      D.voice.beep(true);
      if (r.cmd === 'undo') acts.undo(); else { clearTimeout(confirmT); confirmT = 0; pending = []; A.render(); }
      return;
    }
    if (full) return;                                        // turno già pieno: si aspetta la conferma
    if (r.kind === 'ok' || r.kind === 'partial') { msg = ''; D.voice.beep(true); addDarts(r.darts); return; }
    if (r.kind === 'ambiguous') {
      D.voice.beep(true); opts = r.options;
      A.sheet('<b class="stitle">Cosa hai detto?</b>' + r.options.map((o, i) => `<button class="btn ghost" data-act="pick" data-i="${i}">${o.map(B.label).join(' · ')}</button>`).join(''));
      return;
    }
    D.voice.beep(false); msg = 'Non ho capito: «' + (alts[0] || '') + '»'; A.render();
  }
  acts.pick = (el) => { const o = opts[+el.dataset.i]; A.closeSheet(); addDarts(o); };
  acts.mic = () => {
    if (busy) return;
    if (vstate === 'listening') { if (A.data.settings.listen === 'tap') D.voice.stop(); return; }
    startVoice();
  };

  /* ---------- Tastiera e correzioni ---------- */
  acts.k = (el) => {
    const v = +el.dataset.v;
    const d = v === 0 ? B.MISS : v === 50 ? B.dart(25, 2) : v === 25 ? B.dart(25, mult === 2 ? 2 : 1) : B.dart(v, mult);
    mult = 1; addDarts([d]);
  };
  acts.mult = (el) => { const v = +el.dataset.v; mult = mult === v ? 1 : v; A.render(); };
  acts.slot = (el) => {
    const i = +el.dataset.i;
    if (busy || i >= pending.length) return;
    clearTimeout(confirmT); confirmT = 0; pending = pending.slice(0, i); A.render();
  };
  acts.undo = () => {
    if (busy) return;
    clearTimeout(confirmT); confirmT = 0;
    if (pending.length) { pending = []; mult = 1; A.render(); return; }
    while (m.turns.length) {                                 // torna all'ultimo turno di una persona
      const p = lastP(st);
      m.turns.pop(); refresh();
      if (p >= 0 && !m.cfg.players[p].bot) break;
    }
    m.done = false; m.winner = -1; A.persist(); next();
  };
  acts.undoEnd = () => { A.view = 'partita'; keepAwake(); acts.undo(); };
  acts.exit = () => { clearT(); busy = false; pending = []; D.voice.stop(); sleepOk(); A.tab = 'gioca'; A.go('home'); };
  acts.again = () => {
    const c = m.cfg;
    create({ start: c.start, out: c.out, legs: c.legs, sets: c.sets, players: c.players.slice(1).concat(c.players.slice(0, 1)) });
  };

  /* ---------- Schermo acceso durante la partita ---------- */
  async function keepAwake() {
    if (!('wakeLock' in navigator) || lock) return;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch (e) { lock = null; }
  }
  function sleepOk() { try { if (lock) lock.release(); } catch (e) { /* niente */ } lock = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && A.view === 'partita') keepAwake(); });

  /* ---------- Schermate ---------- */
  D.views.partita = function () {
    const c = m.cfg, base = st.rem[st.cur], left = 3 - pending.length;
    const where = (c.sets ? `Set ${st.set + 1} · ` : '') + `Leg ${st.leg + 1}`;
    const rows = c.players.map((p, i) => `<div class="prow ${i === st.cur ? 'on' : ''}"><b>${esc(p.name)}</b><span class="won">${c.sets ? st.setsWon[i] + ' · ' : ''}${st.legsWon[i]}</span><span class="avg">${num(D.stats.matchAvg(st, i) || '–')}</span><span class="rem num">${st.rem[i]}</span></div>`).join('');
    const r = pending.length ? G.applyTurn(base, pending, c.out) : null;
    const bust = !!(r && r.bust);
    const now = base - B.sum(pending);
    const route = !bust && left > 0 && now <= 170 ? D.checkout.route(now, left, c.out) : null;
    const slots = [0, 1, 2].map((i) => { const d = pending[i]; return `<button class="slot ${d ? 'f' : ''}" data-act="slot" data-i="${i}">${d ? B.label(d) : '–'}</button>`; }).join('');
    const status = busy ? 'Tira ' + esc(who().name) + '…' : confirmT ? `✓ ${bust ? 'sballo' : B.sum(pending)} · tocca un tiro per correggere` : esc(msg);
    const human = !who().bot;
    const mic = !human ? '' : vstate === 'unsupported' ? '<p class="muted small">Voce non disponibile qui: usa la tastiera.</p>' :
      `<button class="mic ${vstate}" data-act="mic">${vstate === 'listening' ? 'Ti ascolto…' : vstate === 'paused' ? 'Tocca per riprendere' : vstate === 'denied' ? 'Microfono non permesso' : 'Tocca e parla'}</button>`;
    let keys = '';
    for (let n = 1; n <= 20; n++) keys += `<button class="key" data-act="k" data-v="${n}">${n}</button>`;
    keys += '<button class="key" data-act="k" data-v="25">25</button><button class="key" data-act="k" data-v="50">Bull</button><button class="key" data-act="k" data-v="0">0</button>' +
      `<button class="key m ${mult === 2 ? 'on' : ''}" data-act="mult" data-v="2">D</button><button class="key m ${mult === 3 ? 'on' : ''}" data-act="mult" data-v="3">T</button>`;
    return `<header class="ptop"><button data-act="exit">‹ Esci</button><span>${c.start} · ${where}</span><button data-act="undo">↶ Annulla</button></header>
      <div class="board"><div class="prow head"><span></span><span>${c.sets ? 'set · leg' : 'leg'}</span><span>media</span><span>resta</span></div>${rows}</div>
      <div class="now"><span class="name">${esc(who().name)}</span><b class="num ${bust ? 'bust' : ''}">${bust ? 'Sballo' : now}</b><span class="hint">${route ? D.checkout.text(route) : '&nbsp;'}</span></div>
      <div class="slots">${slots}</div><p class="status">${status || '&nbsp;'}</p>
      ${mic}<div class="pad ${human ? '' : 'off'}">${keys}</div>`;
  };
  D.views.fine = function () {
    const c = m.cfg, w = c.players[st.winner];
    const rows = c.players.map((p) => {
      const s = D.stats.forPlayer([m], p.id);
      return `<tr><th>${esc(p.name)}</th><td>${num(s.avg)}</td><td>${s.t180}</td><td>${s.hiOut || '–'}</td><td>${s.legsWon}</td></tr>`;
    }).join('');
    return `<div class="win"><em>Partita vinta da</em><b>${esc(w.name)}</b></div>
      <table class="sum"><tr><th></th><th>media</th><th>180</th><th>chiusura</th><th>leg</th></tr>${rows}</table>
      <button class="btn big" data-act="again">Rivincita</button>
      <div class="row2"><button class="btn ghost" data-act="undoEnd">↶ Annulla l'ultimo turno</button><button class="btn ghost" data-act="exit">Home</button></div>`;
  };
  D.play = { create, open, heard };            // heard: anche per provare la voce dal Mac
})(globalThis.D = globalThis.D || {});
