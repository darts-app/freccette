/* Regole 501/301: turni, sballo, leg e set. La partita si ricostruisce sempre dai turni. */
(function (D) {
  'use strict';
  const B = D.board;
  // Double in: finché il giocatore non è partito (opened === false) i tiri contano solo dal primo doppio, bull compreso
  // indice del tiro con cui il turno finisce (chiusura o sballo), -1 se non finisce
  function turnEnd(rem, darts, out, opened) {
    let s = rem, on = opened !== false;
    for (let i = 0; i < darts.length; i++) {
      if (!on) { if (!B.isDouble(darts[i])) continue; on = true; }
      s -= B.score(darts[i]);
      if (s <= 0 || (out === 'double' && s === 1)) return i;
    }
    return -1;
  }
  // applica un turno: { after, bust, win, used }
  function applyTurn(rem, darts, out, opened) {
    let s = rem, on = opened !== false;
    for (let i = 0; i < darts.length; i++) {
      const d = darts[i];
      if (!on) { if (!B.isDouble(d)) continue; on = true; }
      s -= B.score(d);
      if (s === 0 && (out !== 'double' || B.isDouble(d))) return { after: 0, bust: false, win: true, used: i + 1 };
      if (s <= 0 || (out === 'double' && s === 1)) return { after: rem, bust: true, win: false, used: i + 1 };
    }
    return { after: s, bust: false, win: false, used: darts.length };
  }
  const toWin = (n) => Math.floor(n / 2) + 1;
  // leg e set: «al meglio di n» (legsMode/setsMode mancante o 'best') oppure «primo a n» ('first')
  const legsToWin = (cfg) => (cfg.legsMode === 'first' ? cfg.legs : toWin(cfg.legs));
  const setsToWin = (cfg) => (cfg.setsMode === 'first' ? cfg.sets : toWin(cfg.sets));
  // partito? Con Double in si parte al primo doppio: da lì il punteggio non torna più al valore iniziale
  const isOpen = (cfg, rem) => cfg.in !== 'double' || rem !== cfg.start;
  // cfg = { start, in: 'straight'|'double' (manca = normale), out: 'double'|'single', legs, sets (0 = senza set), players: [...] }; turns = [{ darts }]
  function replay(cfg, turns) {
    const P = cfg.players.length;
    const st = { legs: [], rem: [], cur: 0, set: 0, leg: 0, legsWon: Array(P).fill(0), setsWon: Array(P).fill(0), done: false, winner: -1 };
    let legNo = 0;
    function newLeg() {
      const starter = cfg.sets ? (st.set + st.leg) % P : legNo % P;
      st.legs.push({ set: st.set, leg: st.leg, starter: starter, turns: [], winner: -1 });
      st.rem = Array(P).fill(cfg.start);
      st.cur = starter;
    }
    newLeg();
    for (const t of turns) {
      if (st.done) break;
      const leg = st.legs[st.legs.length - 1];
      const p = st.cur, before = st.rem[p];
      const r = applyTurn(before, t.darts, cfg.out, isOpen(cfg, before));
      leg.turns.push({ p: p, darts: t.darts.slice(0, r.used), before: before, after: r.after, bust: r.bust, win: r.win });
      st.rem[p] = r.after;
      if (!r.win) { st.cur = (p + 1) % P; continue; }
      leg.winner = p; st.legsWon[p]++; legNo++;
      if (st.legsWon[p] < legsToWin(cfg)) { st.leg++; newLeg(); continue; }
      if (!cfg.sets) { st.done = true; st.winner = p; break; }
      st.setsWon[p]++;
      if (st.setsWon[p] >= setsToWin(cfg)) { st.done = true; st.winner = p; break; }
      st.set++; st.leg = 0; st.legsWon = Array(P).fill(0); newLeg();
    }
    return st;
  }
  D.game = { turnEnd, applyTurn, replay, toWin, legsToWin, setsToWin, isOpen };
})(globalThis.D = globalThis.D || {});
