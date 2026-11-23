/* Partita: tabellone, tiri del turno, voce, tastiera, bot, fine partita. */
(function (D) {
  'use strict';
  const A = D.app, esc = D.esc, acts = D.acts, B = D.board, G = D.game;
  const BOT_MS = 900;          // pausa tra i tiri del bot
  let m = null, st = null;     // partita aperta e suo stato ricostruito
  let pending = [];            // tiri del turno in corso
  let mult = 1;                // tastiera: 1, 2 (D) o 3 (T) per il prossimo numero
  const CONFIRM_MS = 1500;     // dopo il terzo tiro (dalla 0.6.1; 0.5.3 era subito)
  let confirmT = 0, botT = 0, busy = false, msg = '', vstate = 'idle', opts = null, lock = null;
  let fixing = false;          // «Correggi turno»: l'ultimo turno è riaperto e aspetta una modifica o «Conferma»
  // voce in diretta: uKey = frase che sta riempiendo il turno, uN = quanti tiri di «pending» vengono da lei
  // (la frase che continua o si corregge li sostituisce); gone = frasi chiuse (turno registrato o cambiato a mano)
  let uKey = '', uN = 0, gone = {};
  const unbind = () => { if (uKey) gone[uKey] = 1; uKey = ''; uN = 0; };
  const num = (x) => String(x).replace('.', ',');

  function refresh() { m = A.data.matches.find((x) => x.id === A.sel); st = G.replay(m.cfg, m.turns); }
  const who = () => m.cfg.players[st.cur];
  const opened = () => G.isOpen(m.cfg, st.rem[st.cur]);      // Double in: già partito?
  const clearT = () => { clearTimeout(confirmT); confirmT = 0; clearTimeout(botT); botT = 0; };

  function create(cfg) {
    const mt = { id: D.store.uid('m'), created: Date.now(), cfg: cfg, turns: [], done: false, winner: -1 };
    A.data.matches.push(mt); A.persist();
    open(mt.id);
  }
  function open(id) {
    clearT(); A.sel = id; pending = []; mult = 1; msg = ''; busy = false; fixing = false; unbind();
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
    const ds = D.bot.turn(st.rem[st.cur], m.cfg.out, lv.sigma, Math.random, opened());
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
    unbind();
    setPending(pending.concat(ds));
  }
  function setPending(ds) {
    clearTimeout(confirmT); confirmT = 0; fixing = false;
    pending = ds.slice(0, 3);
    const e = G.turnEnd(st.rem[st.cur], pending, m.cfg.out, opened());
    if (e >= 0) pending = pending.slice(0, e + 1);
    // turno pieno (3 tiri, chiusura o sballo): CONFIRM_MS di attesa (si vede se è giusto, «annulla»/tocco sul tiro correggono), poi avversario
    if (e >= 0 || pending.length === 3) { confirmT = setTimeout(commit, CONFIRM_MS); A.render(); return true; }
    A.render(); return false;
  }
  function commit() {
    clearTimeout(confirmT); confirmT = 0;
    if (!pending.length) return;
    unbind();
    const p = m.cfg.players[st.cur], legs = st.legs.length;
    m.turns.push({ darts: pending });
    pending = []; mult = 1; msg = '';
    refresh();
    const last = st.legs[st.legs.length - 1].turns.slice(-1)[0] || st.legs[legs - 1].turns.slice(-1)[0];
    m.done = st.done; m.winner = st.winner;
    A.persist();
    if (last) D.voice.chime(last.win ? 'win' : last.bust ? 'bust' : last.before - last.after === 180 ? '180' : '');
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
      fast: A.data.settings.fast === 'off' ? null : fast,
      onState: (s) => { vstate = s; if (A.view === 'partita') A.render(); },
      onError: (err) => { if (err === 'not-allowed' || err === 'service-not-allowed') { vstate = 'denied'; A.render(); } },
    });
  }
  function read(alts, pend, more, interim) {
    const base = st.rem[st.cur], op = opened();
    return D.parse.choose(alts, {
      need: 3 - pend.length,
      ends: (c) => { const e = G.turnEnd(base, pend.concat(c), m.cfg.out, op); return e < 0 ? -1 : e - pend.length; },
      busts: (c) => G.applyTurn(base, pend.concat(c), m.cfg.out, op).bust,
      interim: interim,
    }, more);
  }
  // risposta veloce (testo provvisorio fermo): part = false solo turno completo, part = true anche tiri a metà
  function fast(alts, key, part, more) { return hear(alts, key, false, part, more); }
  function heard(alts, key, more) { hear(alts, key, true, true, more); }
  function hear(alts, key, final, part, more) {
    if (A.view !== 'partita' || busy || st.done || (key && gone[key])) return false;
    const mine = !!key && key === uKey;
    if (confirmT && !mine && !final) return false;
    // la frase che sta già riempiendo il turno si rilegge da capo, dai tiri che c'erano prima di lei
    const pend = mine ? pending.slice(0, pending.length - uN) : fixing ? [] : pending;
    const r = read(alts, pend, more, !final);
    if (r.kind === 'cmd') {
      if (!final) return false;
      D.voice.beep(true); unbind();
      if (r.cmd === 'undo') acts.fix(); else { clearTimeout(confirmT); confirmT = 0; pending = []; fixing = false; A.render(); }
      return true;
    }
    if (!final && !(r.kind === 'ok' || (part && r.kind === 'partial'))) return false;
    if (confirmT && !mine) return false;                   // turno già pieno: si aspetta la conferma
    if (r.kind === 'ok' || r.kind === 'partial') {
      const nd = pend.concat(r.darts), same = mine && nd.map(B.label).join() === pending.map(B.label).join();
      msg = '«' + (alts[0] || '') + '»';
      if (same) { if (final) unbind(); A.render(); return confirmT ? 'full' : true; }
      D.voice.beep(true);
      // frase ancora aperta: resta legata ai suoi tiri; frase finale: i tiri restano e la frase si chiude
      if (key && !final) { if (uKey && uKey !== key) gone[uKey] = 1; uKey = key; uN = r.darts.length; } else unbind();
      return setPending(nd) ? 'full' : true;
    }
    if (mine) { if (final) unbind(); return false; }        // frase già segnata in parte: si tiene quello che c'è
    if (r.kind === 'ambiguous') {
      if (fixing) { pending = []; fixing = false; }
      D.voice.beep(true); opts = r.options;
      A.sheet('<b class="stitle">Cosa hai detto?</b>' + r.options.map((o, i) => `<button class="btn ghost" data-act="pick" data-i="${i}">${o.map(B.label).join(' · ')}</button>`).join(''));
      return false;
    }
    D.voice.beep(false); msg = 'Non ho capito: «' + (alts[0] || '') + '»'; A.render();
    return false;
  }
  acts.pick = (el) => { const o = opts[+el.dataset.i]; A.closeSheet(); addDarts(o); };
  acts.mic = () => {
    if (busy) return;
    if (vstate === 'listening') { if (A.data.settings.listen === 'tap') D.voice.stop(); return; }
    startVoice();
  };
  // voce in partita: «Un tocco» ↔ «Sempre in ascolto»
  acts.vmode = () => {
    const s = A.data.settings;
    s.listen = s.listen === 'always' ? 'tap' : 'always'; A.persist();
    D.voice.stop();
    if (s.listen === 'always' && !busy && !who().bot) startVoice();
    A.toast(s.listen === 'always' ? 'Sempre in ascolto' : 'Un tocco');
    A.render();
  };

  /* ---------- Tastiera e correzioni ---------- */
  acts.k = (el) => {
    const v = +el.dataset.v;
    const d = v === 0 ? B.MISS : v === 50 ? B.dart(25, 2) : v === 25 ? B.dart(25, mult === 2 ? 2 : 1) : B.dart(v, mult);
    mult = 1; addDarts([d]);
  };
  acts.pad = () => { A.data.settings.pad = !A.data.settings.pad; A.persist(); A.render(); };
  acts.mult = (el) => { const v = +el.dataset.v; mult = mult === v ? 1 : v; A.render(); };
  acts.slot = (el) => {
    const i = +el.dataset.i;
    if (busy || i >= pending.length) return;
    unbind(); clearTimeout(confirmT); confirmT = 0; fixing = false; pending = pending.slice(0, i); A.render();
  };
  // «Correggi turno»: con tiri in corso li cancella; se no riapre l'ultimo turno di una persona (anche dopo i bot)
  acts.fix = () => {
    if (busy) return;
    unbind(); clearTimeout(confirmT); confirmT = 0; mult = 1; msg = '';
    if (pending.length && !fixing) { pending = []; A.render(); return; }
    fixing = false; pending = [];
    let back = null;
    while (m.turns.length) {
      const p = lastP(st);
      const t = m.turns.pop(); refresh();
      if (p >= 0 && !m.cfg.players[p].bot) { back = t.darts.slice(); break; }
    }
    m.done = false; m.winner = -1; A.persist();
    if (back) { pending = back; fixing = true; }
    next();
  };
  acts.fixok = () => { fixing = false; commit(); };
  // ⌫ Indietro: ogni tocco cancella un tiro; a turno vuoto riapre l'ultimo turno di una persona senza il suo ultimo tiro
  acts.back = () => {
    if (busy) return;
    unbind(); clearTimeout(confirmT); confirmT = 0; mult = 1; msg = '';
    if (pending.length) { pending = pending.slice(0, -1); fixing = false; A.render(); return; }
    fixing = false;
    let back = null;
    while (m.turns.length) {
      const p = lastP(st);
      const t = m.turns.pop(); refresh();
      if (p >= 0 && !m.cfg.players[p].bot) { back = t.darts.slice(0, -1); break; }
    }
    m.done = false; m.winner = -1; A.persist();
    pending = back || [];
    next();
  };
  acts.undo = acts.fix;
  acts.undoEnd = () => { A.view = 'partita'; keepAwake(); acts.fix(); };
  acts.exit = () => {
    if (fixing && pending.length) { m.turns.push({ darts: pending }); refresh(); m.done = st.done; m.winner = st.winner; A.persist(); }   // turno riaperto e non cambiato: torna com'era
    clearT(); busy = false; pending = []; fixing = false; D.voice.stop(); sleepOk(); A.tab = 'gioca'; A.go('home');
  };
  acts.again = () => {
    const c = m.cfg;
    create(rematchCfg(c));
  };
  // rivincita: stesse regole, inizia il giocatore dopo
  function rematchCfg(c) { return { start: c.start, in: c.in || 'straight', out: c.out, legs: c.legs, legsMode: c.legsMode || 'best', sets: c.sets, setsMode: c.setsMode || 'best', players: c.players.slice(1).concat(c.players.slice(0, 1)) }; }

  /* ---------- Schermo acceso durante la partita ---------- */
  async function keepAwake() {
    if (!('wakeLock' in navigator) || lock) return;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch (e) { lock = null; }
  }
  function sleepOk() { try { if (lock) lock.release(); } catch (e) { /* niente */ } lock = null; }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && A.view === 'partita') keepAwake();
    if (document.visibilityState === 'hidden') saveFixing();
  });
  window.addEventListener('pagehide', saveFixing);
  // app chiusa o in tasca durante «Correggi turno»: nel telefono resta salvato il turno intero
  function saveFixing() {
    if (!fixing || !pending.length || !m) return;
    m.turns.push({ darts: pending }); A.persist(); m.turns.pop();
  }

  /* ---------- Schermate ---------- */
  D.views.partita = function () {
    const c = m.cfg, base = st.rem[st.cur], left = 3 - pending.length, op = opened();
    const r = pending.length ? G.applyTurn(base, pending, c.out, op) : null;
    const bust = !!(r && r.bust);
    const now = r && !bust ? r.after : base;
    const openNow = G.isOpen(c, now);
    const route = !bust && openNow && left > 0 && now <= 170 ? D.checkout.route(now, left, c.out) : null;
    const hint = bust ? '' : !openNow ? 'serve un doppio' : route ? D.checkout.text(route) : '';
    const leg = st.legs[st.legs.length - 1];
    const where = (c.sets ? `Set ${st.set + 1} · ` : '') + `Leg ${st.leg + 1}`;
    const pips = (lab, n, k) => `<span class="pip">${lab}${Array.from({ length: k }, (_, j) => `<i class="${j < n ? 'f' : ''}"></i>`).join('')}</span>`;
    const P = c.players.length;
    const lastOf = (i) => { for (let k = leg.turns.length - 1; k >= 0; k--) if (leg.turns[k].p === i) return leg.turns[k]; return null; };
    // una riga intera per giocatore, tutte uguali: chi tira ha il bordo verde; in fondo l'ultimo turno in grigio
    const rows = c.players.map((p, i) => {
      const on = i === st.cur;
      const darts = leg.turns.reduce((a, t) => a + (t.p === i ? t.darts.length : 0), 0) + (on ? pending.length : 0);
      const sc = on ? (bust ? 'Sballo' : now) : st.rem[i];
      // set e leg sempre in vista (senza set: «Set –»)
      const pp = (c.sets ? pips('Set', st.setsWon[i], G.setsToWin(c)) : '<span class="pip">Set <em>–</em></span>') + pips('Leg', st.legsWon[i], G.legsToWin(c));
      const lt = lastOf(i);
      // chi tira: solo la chiusura (il suo turno precedente confonderebbe); gli altri: il loro ultimo turno
      const last = on ? (hint ? `<span class="co ${!openNow ? 'need' : ''}">${hint}</span>` : '')
        : lt ? `<span class="lbl">${P >= 3 ? 'ultimo' : 'ultimo turno'}</span>${lt.darts.map((d) => `<span class="d">${B.label(d)}</span>`).join('')}<b>${lt.bust ? 'sballo' : '= ' + (lt.before - lt.after)}</b>` : '';
      return `<div class="pr ${on ? 'on' : ''}"><span class="nm">${A.avatar(p, 'xs')}<span class="nmt">${esc(p.name)}</span>${on ? '<span class="dot"></span>' : ''}</span><span class="pips">${pp}</span>
        <b class="sc num ${on && bust ? 'bust' : ''}">${sc}</b><span class="st">media <b class="num">${num(D.stats.matchAvg(st, i) || '–')}</b>${P >= 3 ? ' · ' : '<br>'}frecce <b class="num">${darts}</b></span>
        <span class="last">${last || '&nbsp;'}</span></div>`;
    }).join('');
    const slots = [0, 1, 2].map((i) => { const d = pending[i]; return `<button class="slot ${d ? 'f' : ''}" data-act="slot" data-i="${i}">${d ? B.label(d) : '–'}</button>`; }).join('');
    // barra del turno: i 3 tiri con i loro punti (con Double in valgono solo dal primo doppio) e il totale
    let on = op;
    const val = pending.map((d) => { if (!on && !B.isDouble(d)) return 0; on = true; return B.score(d); });
    const tbar = `<div class="tbar">${[0, 1, 2].map((i) => { const d = pending[i]; return `<button class="tcell ${d ? 'f' : 'e'}" data-act="slot" data-i="${i}"><b class="num">${d ? B.label(d) : '–'}</b><small class="num">${d ? val[i] : '&nbsp;'}</small></button>`; }).join('')}
      <div class="ttot ${bust ? 'bust' : ''}"><b class="num">${bust ? '✗' : base - now}</b><small>${bust ? 'sballo' : 'turno'}</small></div></div>`;
    const status = fixing ? 'Tocca il tiro sbagliato, oppure Conferma' : confirmT ? '✓' : esc(msg);
    const human = !who().bot;
    const voiceOk = human && vstate !== 'unsupported' && vstate !== 'denied';
    const always = A.data.settings.listen === 'always';
    const state = busy ? 'Tira ' + esc(who().name) + '…' : !human ? '' : vstate === 'unsupported' ? 'Voce non disponibile: usa la tastiera' :
      vstate === 'denied' ? 'Microfono non permesso' : vstate === 'listening' ? 'Ti ascolto…' : vstate === 'paused' ? 'Tocca per riprendere' : 'Tocca il microfono e detta i tiri';
    const padOpen = human && (A.data.settings.pad || !voiceOk);
    let keys = '';
    for (let n = 1; n <= 20; n++) keys += `<button class="key" data-act="k" data-v="${n}">${n}</button>`;
    keys += '<button class="key" data-act="k" data-v="25">25</button><button class="key" data-act="k" data-v="50">Bull</button><button class="key" data-act="k" data-v="0">0</button>' +
      `<button class="key m ${mult === 2 ? 'on' : ''}" data-act="mult" data-v="2">D</button><button class="key m ${mult === 3 ? 'on' : ''}" data-act="mult" data-v="3">T</button>`;
    const canFix = !busy && (pending.length > 0 || m.turns.length > 0);
    const fixBtn = fixing ? `<button class="btn1" data-act="fixok">${D.icon('check')}Conferma</button>`
      : `<button class="btn2" data-act="back" ${canFix ? '' : 'disabled'}>${D.icon('bksp')}Indietro</button>`;
    return `<header class="ptop"><button class="x" data-act="exit">‹ Esci</button><div class="mid"><b>${where}</b><span>${A.rules(c, true)}</span></div>
        <button class="vbtn" data-act="vmode" aria-label="Cambia modo della voce">${D.icon('mic')}${always ? 'Sempre' : 'Un tocco'}</button></header>
      <div class="prs n${P} ${padOpen ? 'kp' : ''}">${rows}</div>
      ${tbar}<p class="status">${status || '&nbsp;'}</p>
      <div class="micwrap ${P >= 3 ? 'sm' : ''}">${voiceOk ? `<button class="mic ${vstate}" data-act="mic" aria-label="Parla">${D.icon('mic')}</button>` : ''}<p class="hint">${state}</p></div>
      <div class="pfoot">${human ? `<button class="btn2" data-act="pad">${D.icon('kbd')}Tastiera</button>` : '<span></span>'}${fixBtn}</div>
      <div class="kpad ${padOpen ? 'open' : ''}"><div class="khead"><span class="kwho"><b>${esc(who().name)}</b><span class="num ${bust ? 'bust' : ''}">${bust ? 'Sballo' : now}</span><em class="${!openNow ? 'need' : ''}">${hint}</em></span><div class="kslots">${slots}</div></div>${keys}<button class="key bk ${voiceOk ? '' : 'wide'}" data-act="back" aria-label="Cancella l'ultimo tiro">${D.icon('bksp')}</button>${voiceOk ? '<button class="key close" data-act="pad">Chiudi</button>' : ''}</div>`;
  };
  D.views.fine = function () {
    const c = m.cfg, w = c.players[st.winner];
    const rows = c.players.map((p) => {
      const s = D.stats.forPlayer([m], p.id);
      return `<tr><th>${esc(p.name)}</th><td>${num(s.avg)}</td><td>${s.f9d ? num(s.f9) : '–'}</td><td>${c.out === 'double' && s.dblTry ? s.dblPct + '%' : '–'}</td><td>${s.t180}</td><td>${s.hiOut || '–'}</td></tr>`;
    }).join('');
    return `<div class="win"><em>Partita vinta da</em><b>${esc(w.name)}</b></div>
      <table class="sum"><tr><th></th><th>media</th><th>prime 9</th><th>doppi</th><th>180</th><th>chiusura</th></tr>${rows}</table>
      <button class="btn big" data-act="again">Rivincita</button>
      <div class="row2"><button class="btn ghost" data-act="undoEnd">${D.icon('undo')}Correggi</button><button class="btn ghost" data-act="exit">Home</button></div>`;
  };
  D.play = { create, open, heard, rematchCfg, awake: (on) => (on ? keepAwake() : sleepOk()) };            // heard: anche per provare la voce dal Mac
})(globalThis.D = globalThis.D || {});
