(function () {
  const S = D.store;
  const fake = () => ({ m: {}, getItem(k) { return k in this.m ? this.m[k] : null; }, setItem(k, v) { this.m[k] = String(v); } });
  T.group('dati');
  const ls = fake();
  T.eq(S.load(ls), S.fresh(), 'vuoto = dati nuovi');
  const data = S.fresh();
  data.players.push({ id: 'p1', name: 'Anna' });
  data.matches.push({ id: 'm1', created: 1, cfg: { players: [] }, turns: [], done: true });
  data.matches.push({ id: 'm2', created: 2, cfg: { players: [] }, turns: [], done: false });
  T.ok(S.save(ls, data), 'salva');
  T.eq(S.load(ls).players, [{ id: 'p1', name: 'Anna' }], 'ricarica');
  ls.setItem(S.KEY, '{rotto');
  T.eq(S.load(ls), S.fresh(), 'dati rovinati = dati nuovi');
  T.eq(S.current(data).id, 'm2', 'partita da riprendere');
  const other = S.fresh();
  other.players.push({ id: 'p1', name: 'Anna' }, { id: 'p2', name: 'Bruno' });
  other.matches.push({ id: 'm1', created: 1, cfg: { players: [] }, turns: [], done: true }, { id: 'm0', created: 0, cfg: { players: [] }, turns: [], done: true });
  const res = S.importJSON(data, S.exportJSON(other, 5));
  T.eq([res, data.players.length, data.matches.map((m) => m.id)], [{ players: 1, matches: 1 }, 2, ['m0', 'm1', 'm2']], 'importa senza doppioni');
  let err = '';
  try { S.importJSON(data, '{"app":"sport"}'); } catch (e) { err = e.message; }
  T.eq(err, 'file', 'file di un\'altra app rifiutato');
  T.ok(S.uid('p') !== S.uid('p'), 'id diversi');
})();
