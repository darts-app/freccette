/* Dati sul telefono (localStorage) e backup. ls = localStorage (nei test: finto). */
(function (D) {
  'use strict';
  const KEY = 'freccette.data.v1';
  function fresh() {
    return { v: 1, players: [], matches: [], trainings: [], backupAt: 0,
      settings: { listen: 'tap', start: 501, in: 'straight', out: 'double', legs: 3, legsMode: 'best', sets: 0, setsMode: 'best', lineup: [], pad: false, trainP: '', fast: 'on' } };
  }
  function load(ls) {
    try {
      const d = JSON.parse(ls.getItem(KEY));
      if (d && d.v === 1) return Object.assign(fresh(), d, { settings: Object.assign(fresh().settings, d.settings) });
    } catch (e) { /* dati rovinati: si riparte */ }
    return fresh();
  }
  function save(ls, data) { try { ls.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } }
  function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function exportJSON(data, now) { return JSON.stringify({ app: 'freccette', v: 1, at: now, players: data.players, matches: data.matches, trainings: data.trainings || [] }); }
  // unisce senza doppioni (per id); ritorna quanti nuovi
  function importJSON(data, text) {
    let f = null;
    try { f = JSON.parse(text); } catch (e) { f = null; }
    if (!f || f.app !== 'freccette' || !Array.isArray(f.players) || !Array.isArray(f.matches)) throw new Error('file');
    let np = 0, nm = 0;
    f.players.forEach((p) => { if (p && p.id && !data.players.some((q) => q.id === p.id)) { data.players.push(p); np++; } });
    f.matches.forEach((m) => { if (m && m.id && m.cfg && !data.matches.some((q) => q.id === m.id)) { data.matches.push(m); nm++; } });
    data.matches.sort((a, b) => a.created - b.created);
    let nt = 0;                                              // allenamenti (dalla 0.3.0; i backup vecchi non li hanno)
    if (!Array.isArray(data.trainings)) data.trainings = [];
    (Array.isArray(f.trainings) ? f.trainings : []).forEach((t) => { if (t && t.id && t.drill && !data.trainings.some((q) => q.id === t.id)) { data.trainings.push(t); nt++; } });
    data.trainings.sort((a, b) => a.created - b.created);
    return { players: np, matches: nm, trainings: nt };
  }
  // ultima partita non finita
  function current(data) { for (let i = data.matches.length - 1; i >= 0; i--) if (!data.matches[i].done) return data.matches[i]; return null; }
  D.store = { KEY, fresh, load, save, uid, exportJSON, importJSON, current };
})(globalThis.D = globalThis.D || {});
