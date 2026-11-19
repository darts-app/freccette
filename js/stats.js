/* Statistiche dei giocatori, ricalcolate dai tiri salvati. */
(function (D) {
  'use strict';
  const B = D.board;
  const round1 = (x) => Math.round(x * 10) / 10;
  // un tiro è «sul doppio» se prima di tirarlo il punteggio si chiudeva con una freccetta
  function onDouble(rem) { return rem === 50 || (rem >= 2 && rem <= 40 && rem % 2 === 0); }
  function empty() {
    return { darts: 0, points: 0, dblTry: 0, dblHit: 0, t100: 0, t140: 0, t180: 0, hiOut: 0, bestLeg: 0,
      legsWon: 0, matches: 0, wins: 0, trend: [], avg: 0, dblPct: 0, f9d: 0, f9p: 0, f9: 0 };
  }
  function addMatch(acc, m, pid) {
    const pi = m.cfg.players.findIndex((p) => p.id === pid);
    if (pi < 0) return;
    const st = D.game.replay(m.cfg, m.turns);
    let md = 0, mp = 0;
    st.legs.forEach((leg) => {
      let legDarts = 0, legTurns = 0;
      leg.turns.forEach((t) => {
        if (t.p !== pi) return;
        legDarts += t.darts.length; md += t.darts.length;
        const pts = t.bust ? 0 : t.before - t.after;
        mp += pts;
        if (legTurns++ < 3) { acc.f9d += t.darts.length; acc.f9p += pts; }   // prime 9 freccette della leg
        if (pts === 180) acc.t180++; else if (pts >= 140) acc.t140++; else if (pts >= 100) acc.t100++;
        if (m.cfg.out === 'double') {
          let r = t.before;
          t.darts.forEach((d, i) => {
            if (onDouble(r)) { acc.dblTry++; if (t.win && i === t.darts.length - 1) acc.dblHit++; }
            r -= B.score(d);
          });
        }
        if (t.win) acc.hiOut = Math.max(acc.hiOut, t.before);
      });
      if (leg.winner === pi) { acc.legsWon++; if (!acc.bestLeg || legDarts < acc.bestLeg) acc.bestLeg = legDarts; }
    });
    acc.darts += md; acc.points += mp;
    if (st.done) { acc.matches++; if (st.winner === pi) acc.wins++; }
    if (md) acc.trend.push({ at: m.created, avg: round1(mp / md * 3) });
  }
  function forPlayer(matches, pid) {
    const acc = empty();
    matches.slice().sort((a, b) => a.created - b.created).forEach((m) => addMatch(acc, m, pid));
    acc.avg = acc.darts ? round1(acc.points / acc.darts * 3) : 0;
    acc.dblPct = acc.dblTry ? Math.round(acc.dblHit / acc.dblTry * 100) : 0;
    acc.f9 = acc.f9d ? round1(acc.f9p / acc.f9d * 3) : 0;
    return acc;
  }
  // media su 3 freccette di un giocatore nella partita in corso (stato di D.game.replay)
  function matchAvg(st, pi) {
    let d = 0, p = 0;
    st.legs.forEach((l) => l.turns.forEach((t) => { if (t.p === pi) { d += t.darts.length; p += t.bust ? 0 : t.before - t.after; } }));
    return d ? round1(p / d * 3) : 0;
  }
  D.stats = { onDouble, forPlayer, matchAvg };
})(globalThis.D = globalThis.D || {});
