/* Schermate: Gioca, Nuova partita, Giocatori, Storico. */
(function (D) {
  'use strict';
  const A = D.app, esc = D.esc, acts = D.acts, B = D.board;
  const DAY = 86400000;
  const fmt = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ' · ' +
    new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const num = (x) => String(x).replace('.', ',');
  function top(title, back) {
    return `<header class="top">${back ? '<button class="back" data-act="home" aria-label="Indietro">‹</button>' : ''}<h1>${esc(title)}</h1>${back ? '' : `<button class="ver" id="ver">v${A.VERSION}</button>`}</header>`;
  }
  function score(m) {
    const st = D.game.replay(m.cfg, m.turns), won = m.cfg.sets ? st.setsWon : st.legsWon;
    return m.cfg.players.map((p, i) => `${esc(p.name)} <b>${won[i]}</b>`).join('<i> · </i>');
  }
  function title(m) { return m.cfg.start + (m.cfg.out === 'double' ? '' : ' libera') + (m.cfg.sets ? ` · set al meglio di ${m.cfg.sets}` : ` · al meglio di ${m.cfg.legs}`); }

  /* ---------- Gioca ---------- */
  D.views.gioca = function () {
    const d = A.data, cur = D.store.current(d);
    let h = top('Freccette');
    if (!d.players.length && !d.matches.length) h += `<button class="card bk" data-act="restore"><b>Hai reinstallato l'app?</b><span>Tocca per ripristinare il backup</span></button>`;
    else if (d.matches.some((m) => m.done) && Date.now() - (d.backupAt || 0) > 7 * DAY) h += `<button class="card bk" data-act="backup"><b>Salva il backup</b><span>L'ultimo ha più di 7 giorni</span></button>`;
    if (cur) h += `<button class="card resume" data-act="resume" data-id="${cur.id}"><em>Riprendi</em><b>${score(cur)}</b><span>${title(cur)}</span></button>`;
    h += '<button class="btn big" data-act="nuova">Nuova partita</button>';
    return h;
  };
  acts.resume = (el) => D.play.open(el.dataset.id);
  acts.nuova = () => A.go('nuova');

  /* ---------- Nuova partita ---------- */
  D.views.nuova = function () {
    const s = A.data.settings;
    const line = s.lineup.map(A.playerById).filter(Boolean);
    const seg = (k, opts) => `<div class="seg">${opts.map((o) => `<button class="${s[k] === o[0] ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;
    let h = top('Nuova partita', true);
    h += `<div class="field"><label>Punteggio</label>${seg('start', [[501, '501'], [301, '301']])}</div>`;
    h += `<div class="field"><label>Chiusura</label>${seg('out', [['double', 'Doppio'], ['single', 'Libera']])}</div>`;
    h += `<div class="field"><label>Leg (al meglio di)</label>${seg('legs', [[1, '1'], [3, '3'], [5, '5'], [7, '7']])}</div>`;
    h += `<div class="field"><label>Set (al meglio di)</label>${seg('sets', [[0, 'No'], [3, '3'], [5, '5']])}</div>`;
    h += '<div class="field"><label>Giocatori, in ordine di tiro</label><div class="lineup">';
    h += line.length ? line.map((p, i) => `<div class="pl"><span class="n">${i + 1}</span><b>${esc(p.name)}</b><button data-act="up" data-i="${i}" ${i ? '' : 'disabled'} aria-label="Sposta su">↑</button><button data-act="rm" data-i="${i}" aria-label="Togli">✕</button></div>`).join('')
      : '<p class="muted">Aggiungi almeno un giocatore.</p>';
    h += '</div>';
    if (line.length < 4) {
      const humans = A.data.players.filter((p) => s.lineup.indexOf(p.id) < 0);
      const bots = D.bot.LEVELS.map(A.botPlayer).filter((p) => s.lineup.indexOf(p.id) < 0);
      h += '<div class="chips">' + humans.map((p) => `<button class="chip" data-act="add" data-id="${p.id}">+ ${esc(p.name)}</button>`).join('') +
        '<button class="chip new" data-act="newp">+ Nuovo giocatore</button></div>';
      h += '<div class="chips">' + bots.map((p) => `<button class="chip bot" data-act="add" data-id="${p.id}">+ ${esc(p.name)} <i>~${D.bot.level(p.bot).avg}</i></button>`).join('') + '</div>';
    }
    h += '</div>';
    h += `<div class="field"><label>Voce</label>${seg('listen', [['tap', 'Un tocco'], ['always', 'Sempre in ascolto']])}</div>`;
    h += `<button class="btn big" data-act="start" ${line.length ? '' : 'disabled'}>Inizia</button>`;
    return h;
  };
  acts.set = (el) => {
    const k = el.dataset.k;
    A.data.settings[k] = (k === 'out' || k === 'listen') ? el.dataset.v : +el.dataset.v;
    A.persist(); A.render();
  };
  acts.add = (el) => { const l = A.data.settings.lineup; if (l.length < 4 && l.indexOf(el.dataset.id) < 0) l.push(el.dataset.id); A.persist(); A.render(); };
  acts.rm = (el) => { A.data.settings.lineup.splice(+el.dataset.i, 1); A.persist(); A.render(); };
  acts.up = (el) => { const l = A.data.settings.lineup, i = +el.dataset.i; if (i > 0) { const x = l[i]; l[i] = l[i - 1]; l[i - 1] = x; } A.persist(); A.render(); };
  function newPlayer(then) {
    A.ask('Nome del giocatore', '', (name) => {
      const p = { id: D.store.uid('p'), name: name, created: Date.now() };
      A.data.players.push(p);
      if (then) then(p);
      A.persist(); A.render();
    });
  }
  acts.newp = () => newPlayer((p) => { const l = A.data.settings.lineup; if (l.length < 4) l.push(p.id); });
  acts.start = () => {
    const s = A.data.settings;
    const players = s.lineup.map(A.playerById).filter(Boolean).map((p) => (p.bot ? { id: p.id, name: p.name, bot: p.bot } : { id: p.id, name: p.name }));
    if (!players.length) return;
    D.play.create({ start: s.start, out: s.out, legs: s.legs, sets: s.sets, players: players });
  };

  /* ---------- Giocatori ---------- */
  D.views.giocatori = function () {
    let h = top('Giocatori');
    const ps = A.data.players;
    if (!ps.length) h += '<p class="muted">Ancora nessun giocatore. Crealo qui o da «Nuova partita».</p>';
    h += ps.map((p) => {
      const s = D.stats.forPlayer(A.data.matches, p.id);
      return `<button class="card prow2" data-act="player" data-id="${p.id}"><b>${esc(p.name)}</b><span>${s.darts ? 'media ' + num(s.avg) + ' · ' + s.matches + (s.matches === 1 ? ' partita' : ' partite') : 'nessuna partita'}</span></button>`;
    }).join('');
    h += '<button class="btn ghost" data-act="newp2">+ Nuovo giocatore</button>';
    return h;
  };
  acts.newp2 = () => newPlayer(null);
  acts.player = (el) => A.go('giocatore', el.dataset.id);
  function chart(trend) {
    if (trend.length < 2) return '<p class="muted">Il grafico compare dopo due partite.</p>';
    const W = 340, H = 120, P = 10, pts = trend.slice(-30);
    const lo = Math.min.apply(null, pts.map((t) => t.avg)), hi = Math.max.apply(null, pts.map((t) => t.avg));
    const y = (v) => hi === lo ? H / 2 : H - P - (v - lo) / (hi - lo) * (H - 2 * P);
    const x = (i) => P + i * (W - 2 * P) / (pts.length - 1);
    const line = pts.map((t, i) => x(i).toFixed(1) + ',' + y(t.avg).toFixed(1)).join(' ');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Media nelle ultime partite"><polyline points="${line}"/>${pts.map((t, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(t.avg).toFixed(1)}" r="3"/>`).join('')}<text x="${W - P}" y="12" text-anchor="end">${num(hi)}</text><text x="${W - P}" y="${H - 2}" text-anchor="end">${num(lo)}</text></svg>`;
  }
  D.views.giocatore = function () {
    const p = A.data.players.find((x) => x.id === A.sel);
    if (!p) { A.view = 'home'; return D.views.giocatori(); }
    const s = D.stats.forPlayer(A.data.matches, p.id);
    const box = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    let h = top(p.name, true);
    h += '<div class="stats">' + box(num(s.avg), 'media 3 freccette') + box(s.dblPct + '%', 'sui doppi') + box(s.t180, '180') +
      box(s.t140, '140+') + box(s.t100, '100+') + box(s.hiOut || '–', 'chiusura più alta') + box(s.bestLeg || '–', 'leg più corta') +
      box(s.wins + '/' + s.matches, 'partite vinte') + box(s.legsWon, 'leg vinte') + '</div>';
    h += '<h2>Media per partita</h2>' + chart(s.trend);
    h += '<div class="row2"><button class="btn ghost" data-act="ren">Rinomina</button><button class="btn ghost danger" data-act="delp">Elimina</button></div>';
    return h;
  };
  acts.ren = () => { const p = A.data.players.find((x) => x.id === A.sel); A.ask('Nuovo nome', p.name, (n) => { p.name = n; A.persist(); A.render(); }); };
  acts.delp = () => {
    const p = A.data.players.find((x) => x.id === A.sel);
    A.confirm(`Eliminare ${p.name}? Le partite restano nello storico, le statistiche no.`, 'Elimina', () => {
      A.data.players = A.data.players.filter((x) => x.id !== p.id);
      A.data.settings.lineup = A.data.settings.lineup.filter((id) => id !== p.id);
      A.persist(); A.tab = 'giocatori'; A.go('home');
    }, true);
  };

  /* ---------- Storico ---------- */
  D.views.storico = function () {
    let h = top('Storico');
    h += '<div class="row2"><button class="btn ghost" data-act="backup">Salva backup</button><button class="btn ghost" data-act="restore">Ripristina</button></div>';
    const ms = A.data.matches.slice().reverse();
    if (!ms.length) h += '<p class="muted">Le partite giocate compaiono qui.</p>';
    h += ms.map((m) => `<button class="card mrow" data-act="det" data-id="${m.id}"><span class="when">${fmt(m.created)}${m.done ? '' : ' · <em>in corso</em>'}</span><b>${score(m)}</b><span>${title(m)}</span></button>`).join('');
    return h;
  };
  acts.det = (el) => A.go('dettaglio', el.dataset.id);
  D.views.dettaglio = function () {
    const m = A.data.matches.find((x) => x.id === A.sel);
    if (!m) { A.view = 'home'; return D.views.storico(); }
    const st = D.game.replay(m.cfg, m.turns), P = m.cfg.players.length;
    let h = top(fmt(m.created), true) + `<p class="sub">${title(m)}</p><div class="card big2">${score(m)}</div>`;
    st.legs.forEach((leg) => {
      if (!leg.turns.length) return;
      const order = []; for (let i = 0; i < P; i++) order.push((leg.starter + i) % P);
      const w = leg.winner >= 0 ? m.cfg.players[leg.winner] : null;
      const wd = w ? leg.turns.filter((t) => t.p === leg.winner).reduce((a, t) => a + t.darts.length, 0) : 0;
      h += `<h2>${m.cfg.sets ? 'Set ' + (leg.set + 1) + ' · ' : ''}Leg ${leg.leg + 1}${w ? ` — ${esc(w.name)} in ${wd} freccette` : ' — in corso'}</h2>`;
      h += `<table class="legt"><tr>${order.map((i) => `<th>${esc(m.cfg.players[i].name)}</th>`).join('')}</tr>`;
      for (let r = 0; r * P < leg.turns.length; r++) {
        h += '<tr>' + order.map((_, j) => {
          const t = leg.turns[r * P + j];
          if (!t) return '<td></td>';
          const pts = t.bust ? '<s>sballo</s>' : (t.before - t.after);
          return `<td class="${t.win ? 'win' : ''}"><b>${pts}</b><small>${t.darts.map(B.label).join(' ')}</small></td>`;
        }).join('') + '</tr>';
      }
      h += '</table>';
    });
    h += `<div class="row2">${m.done ? '' : `<button class="btn" data-act="resume" data-id="${m.id}">Riprendi</button>`}<button class="btn ghost danger" data-act="delm">Elimina</button></div>`;
    return h;
  };
  acts.delm = () => A.confirm('Eliminare questa partita? Sparisce anche dalle statistiche.', 'Elimina', () => {
    A.data.matches = A.data.matches.filter((x) => x.id !== A.sel);
    A.persist(); A.tab = 'storico'; A.go('home');
  }, true);
})(globalThis.D = globalThis.D || {});
