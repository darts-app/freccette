/* Schermate: Gioca, Nuova partita, Giocatori, Storico. */
(function (D) {
  'use strict';
  const A = D.app, esc = D.esc, acts = D.acts, B = D.board;
  const DAY = 86400000;
  const fmt = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ' · ' +
    new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const num = (x) => String(x).replace('.', ',');
  function top(title, back, logo) {
    return `<header class="top">${back ? '<button class="back" data-act="home" aria-label="Indietro">‹</button>' : ''}${logo ? '<img class="logo" src="img/darts-180.png" alt="">' : ''}<h1>${esc(title)}</h1>${back ? '' : `<button class="ver" id="ver">v${A.VERSION}</button>`}</header>`;
  }
  function score(m) {
    const st = D.game.replay(m.cfg, m.turns), won = m.cfg.sets ? st.setsWon : st.legsWon;
    return m.cfg.players.map((p, i) => `${esc(p.name)} <b>${won[i]}</b>`).join('<i> · </i>');
  }
  const title = (m) => A.rules(m.cfg);
  const names = (ps) => ps.length === 2 ? esc(ps[0].name) + ' contro ' + esc(ps[1].name)
    : ps.length === 1 ? esc(ps[0].name) : ps.slice(0, -1).map((p) => esc(p.name)).join(', ') + ' e ' + esc(ps[ps.length - 1].name);
  const day = (x) => { const z = new Date(x); z.setHours(0, 0, 0, 0); return z.getTime(); };
  const ago = (t) => { const n = Math.round((day(Date.now()) - day(t)) / DAY); return n <= 0 ? 'oggi' : n === 1 ? 'ieri' : new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }); };

  /* ---------- Gioca ---------- */
  // Gioca vuota (bozza A «Bersaglio»): bersaglio grigio e 3 freccette del logo che arrivano una alla volta (solo CSS, una volta)
  let ART = '';
  function art() {
    if (ART) return ART;
    const cx = 115, cy = 115, R = 92, f = (x) => x.toFixed(1);
    const pt = (r, a) => f(cx + r * Math.sin(a)) + ' ' + f(cy - r * Math.cos(a));
    const arc = (r0, r1, a0, a1) => `M${pt(r0, a0)}L${pt(r1, a0)}A${r1} ${r1} 0 0 1 ${pt(r1, a1)}L${pt(r0, a1)}A${r0} ${r0} 0 0 0 ${pt(r0, a0)}Z`;
    let b = `<circle cx="${cx}" cy="${cy}" r="${R * 1.32}" fill="url(#hglow)"/><circle cx="${cx}" cy="${cy}" r="${R * 1.12}" fill="#15151B"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="#1C1C24"/>`;
    for (let k = 0; k < 20; k++) {
      const a0 = (k - 0.5) * Math.PI / 10, a1 = (k + 0.5) * Math.PI / 10, ring = k % 2 ? '#3A3A46' : '#2E2E38';
      b += `<path d="${arc(R * 0.16, R * 0.95, a0, a1)}" fill="${k % 2 ? '#262630' : '#1C1C24'}"/><path d="${arc(R * 0.95, R, a0, a1)}" fill="${ring}"/><path d="${arc(R * 0.58, R * 0.63, a0, a1)}" fill="${ring}"/>`;
    }
    b += `<circle cx="${cx}" cy="${cy}" r="${R * 0.16}" fill="#2E2E38"/><circle cx="${cx}" cy="${cy}" r="${R * 0.07}" fill="#6C6C78"/>`;
    // freccetta del logo con la punta in (0,0); piantata in (x,y), arriva da in alto a destra
    const dart = '<path d="M0 0L-11 -1.8L-11 1.8Z" fill="#F4F4F6"/><rect x="-34" y="-4.5" width="23" height="9" rx="4.5" fill="#F4F4F6"/><rect x="-59" y="-1.4" width="25" height="2.8" rx="1.4" fill="#A3A3AE"/>' +
      '<path d="M-56 0L-69 -16H-84L-77 0Z" fill="url(#hvol)"/><path d="M-56 0L-69 16H-84L-77 0Z" fill="url(#hvol)" opacity=".75"/>';
    const stuck = (x, y, k) => `<g class="d${k}" transform="translate(${x} ${y}) rotate(150) scale(.6)"><g class="fly">${dart}</g></g>`;
    ART = '<svg width="230" height="230" viewBox="0 0 230 230" aria-hidden="true"><defs>' +
      '<linearGradient id="hvol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#32D74B"/><stop offset="1" stop-color="#64F0C8"/></linearGradient>' +
      '<radialGradient id="hglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#32D74B" stop-opacity=".22"/><stop offset="1" stop-color="#32D74B" stop-opacity="0"/></radialGradient></defs>' +
      b + '<circle class="pulse" cx="72" cy="102" r="6" fill="none" stroke="#32D74B" stroke-width="1.5"/>' + stuck(72, 102, 1) + stuck(116, 140, 2) + stuck(146, 96, 3) + '</svg>';
    return ART;
  }
  D.views.gioca = function () {
    const d = A.data, cur = D.store.current(d);
    let h = top('Darts', false, true);
    if (!d.players.length && !d.matches.length) h += `<button class="card bk" data-act="restore"><b>Hai reinstallato l'app?</b><span>Tocca per ripristinare il backup</span></button>`;
    else if (d.matches.some((m) => m.done) && Date.now() - (d.backupAt || 0) > 7 * DAY) h += `<button class="card bk" data-act="backup"><b>Salva il backup</b><span>L'ultimo ha più di 7 giorni</span></button>`;
    // in evidenza: la partita in corso, se no la rivincita dell'ultima finita
    const last = d.matches.slice().reverse().find((x) => x.done);
    const hero = (m, label, extra, act, icon, btn) => `<div class="hero"><div class="head"><div class="stack">${m.cfg.players.slice(0, 3).map((p) => A.avatar(p, 'l')).join('')}</div>
      <div class="t"><span class="t-label">${label}</span><span class="t-body">${names(m.cfg.players)}</span><span class="t-meta">${extra}</span></div></div>
      <button class="btn" data-act="${act}" data-id="${m.id}">${D.icon(icon)}${btn}</button></div>`;
    if (cur) h += hero(cur, 'Partita in corso', score(cur), 'resume', 'play', 'Riprendi');
    else if (last) h += hero(last, 'Ultima partita · ' + ago(last.created), title(last), 'rematch', 'replay', 'Rivincita');
    // i numeri di un giocatore (prima chi ha giocato di più); «Cambia» passa al prossimo
    const ss = d.players.map((p) => ({ p: p, s: D.stats.forPlayer(d.matches, p.id) })).filter((x) => x.s.darts).sort((a, b) => b.s.matches - a.s.matches);
    const empty = !cur && !last && !ss.length;
    if (empty) h += `<div class="art">${art()}</div><div class="empty-t"><b>Pronto a lanciare?</b><span>Scegli chi gioca e di' i tiri a voce.</span></div>`;
    h += `<button class="btn ${cur || last ? 'ghost' : 'big'}" data-act="nuova">${D.icon('plus')}Nuova partita</button>`;
    if (empty) h += '<p class="say">Prova a dire <q>triplo venti, cinque, doppio sedici</q></p>';
    if (ss.length) {
      const x = ss[(A.statIdx || 0) % ss.length], tile = (v, l) => `<div class="tile"><b class="num">${v}</b><span>${l}</span></div>`;
      h += `<div class="rowhead"><span class="t-label">I numeri di ${esc(x.p.name)}</span>${ss.length > 1 ? '<button class="link" data-act="statnext">Cambia</button>' : ''}</div>
        <div class="tiles">${tile(num(x.s.avg), 'media')}${tile(x.s.hiOut || '–', 'chiusura top')}${tile(x.s.t180, 'volte 180')}</div>`;
    }
    return h;
  };
  acts.resume = (el) => D.play.open(el.dataset.id);
  acts.rematch = (el) => { const mm = A.data.matches.find((x) => x.id === el.dataset.id); if (mm) D.play.create(D.play.rematchCfg(mm.cfg)); };
  acts.statnext = () => { A.statIdx = (A.statIdx || 0) + 1; A.render(); };
  acts.nuova = () => A.go('nuova');

  /* ---------- Nuova partita: chi gioca → regole → voce → Inizia ---------- */
  D.views.nuova = function () {
    const s = A.data.settings;
    const line = s.lineup.map(A.playerById).filter(Boolean), full = line.length >= 4;
    const inL = (id) => s.lineup.indexOf(id) >= 0;
    const seg = (k, opts) => `<div class="seg">${opts.map((o) => `<button class="${String(s[k]) === String(o[0]) ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;
    const row = (label, small, ctl) => `<div class="set"><span>${label}${small ? `<small>${small}</small>` : ''}</span>${ctl}</div>`;
    // numero libero con − / +; i set vanno da «No» (0) a 13, saltando 1 (un set solo = senza set)
    const step = (k, label, small, min, max) => `<div class="set"><span>${label}${small ? `<small>${small}</small>` : ''}</span><div class="step">
      <button data-act="step" data-k="${k}" data-d="-1" ${s[k] <= min ? 'disabled' : ''} aria-label="Meno">−</button><b class="num">${k === 'sets' && !s[k] ? 'No' : s[k]}</b>
      <button data-act="step" data-k="${k}" data-d="1" ${s[k] >= max ? 'disabled' : ''} aria-label="Più">+</button></div></div>`;
    const mode = (k) => `<div class="sub2">${seg(k, [['best', 'Al meglio di'], ['first', 'Primo a']])}</div>`;
    const group = (label, right, inner) => `<section class="group"><div class="ghead"><span class="t-label">${label}</span>${right || ''}</div>${inner}</section>`;
    let h = top('Nuova partita', true);
    h += group('Giocatori · in ordine di tiro', `<span class="cnt">${line.length} di 4</span>`, '<div class="list">' + (line.length
      ? line.map((p, i) => `<div class="li"><span class="o">${i + 1}</span>${A.avatar(p)}<span class="name">${esc(p.name)}</span>${line.length > 1 ? `<span class="grip" data-grip="${i}" aria-label="Trascina per cambiare l'ordine">⋮⋮</span>` : ''}<button class="rm" data-act="rm" data-i="${i}" aria-label="Togli">✕</button></div>`).join('')
      : '<div class="li empty">Tocca un amico o un bot qui sotto</div>') + '</div>');
    h += group('Aggiungi amici', '', '<div class="pick">' + A.data.players.map((p) => `<button class="pk ${inL(p.id) ? 'in' : ''}" data-act="toggle" data-id="${p.id}" ${!inL(p.id) && full ? 'disabled' : ''}>${A.avatar(p, 'l')}<span>${esc(p.name)}</span></button>`).join('') +
      `<button class="pk add" data-act="newp" ${full ? 'disabled' : ''}><span class="av l">+</span><span>Nuovo</span></button></div>`);
    h += group('Aggiungi un bot · media', '', '<div class="bots">' + D.bot.LEVELS.map((lv) => {
      const id = 'bot' + lv.id;
      return `<button class="bot ${inL(id) ? 'in' : ''}" data-act="toggle" data-id="${id}" ${!inL(id) && full ? 'disabled' : ''}><b class="num">${lv.avg}</b><span>${lv.name}</span><span class="meter">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= lv.id ? 'f' : ''}"></i>`).join('')}</span></button>`;
    }).join('') + '</div>');
    h += group('Regole', '', '<div class="list">' + row('Punteggio', '', seg('start', [[501, '501'], [301, '301']])) +
      row('Apertura', 'come si inizia a contare', seg('in', [['straight', 'Normale'], ['double', 'Double in']])) +
      row('Chiusura', 'come si finisce', seg('out', [['double', 'Doppio'], ['single', 'Libera']])) +
      step('legs', 'Leg', s.sets ? 'in ogni set' : '', 1, 21) + mode('legsMode') +
      step('sets', 'Set', '', 0, 13) + (s.sets ? mode('setsMode') : '') + '</div>');
    h += group('Voce', '', '<div class="list">' + row('Microfono', '', seg('listen', [['tap', 'Un tocco'], ['always', 'Sempre']])) +
      row('Risposta veloce', 'segna i tiri senza aspettare la fine della frase', seg('fast', [['on', 'Sì'], ['off', 'No']])) + '</div>');
    h += `<div class="foot"><p class="summary">${A.rules(s)}</p><button class="btn big" data-act="start" ${line.length ? '' : 'disabled'}>Inizia</button></div>`;
    return h;
  };
  acts.set = (el) => {
    const k = el.dataset.k;
    A.data.settings[k] = ['out', 'listen', 'in', 'legsMode', 'setsMode', 'fast'].indexOf(k) >= 0 ? el.dataset.v : +el.dataset.v;
    A.persist(); A.render();
  };
  acts.step = (el) => {
    const s = A.data.settings, k = el.dataset.k, d = +el.dataset.d;
    if (k === 'legs') s.legs = Math.max(1, Math.min(21, s.legs + d));
    else { let v = s.sets + d; if (v === 1) v = d > 0 ? 2 : 0; s.sets = Math.max(0, Math.min(13, v)); }
    A.persist(); A.render();
  };
  // tocco su un amico o un bot: entra in partita, oppure esce se c'era già
  acts.toggle = (el) => {
    const l = A.data.settings.lineup, i = l.indexOf(el.dataset.id);
    if (i >= 0) l.splice(i, 1); else if (l.length < 4) l.push(el.dataset.id);
    A.persist(); A.render();
  };
  acts.rm = (el) => { A.data.settings.lineup.splice(+el.dataset.i, 1); A.persist(); A.render(); };
  // ordine di tiro: si trascina la maniglia ⋮⋮
  document.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('[data-grip]');
    if (!g) return;
    e.preventDefault();
    const row = g.closest('.li'), rows = Array.prototype.slice.call(row.parentElement.children), from = +g.dataset.grip;
    const y0 = e.clientY, hgt = row.getBoundingClientRect().height;
    let to = from;
    row.classList.add('drag');
    try { g.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
    const move = (ev) => {
      const dy = ev.clientY - y0;
      to = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / hgt)));
      row.style.transform = `translateY(${dy}px)`;
      rows.forEach((r, k) => {
        if (r === row) return;
        const sh = from < to && k > from && k <= to ? -hgt : from > to && k < from && k >= to ? hgt : 0;
        r.style.transform = sh ? `translateY(${sh}px)` : '';
      });
    };
    const up = () => {
      g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
      const l = A.data.settings.lineup;
      if (to !== from) { const x = l.splice(from, 1)[0]; l.splice(to, 0, x); A.persist(); }
      A.render();
    };
    g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
  });
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
    D.play.create({ start: s.start, in: s.in || 'straight', out: s.out, legs: s.legs, legsMode: s.legsMode || 'best', sets: s.sets, setsMode: s.setsMode || 'best', players: players });
  };

  /* ---------- Giocatori ---------- */
  D.views.giocatori = function () {
    let h = top('Giocatori');
    const rows = A.data.players.map((p) => ({ p: p, s: D.stats.forPlayer(A.data.matches, p.id) }));
    if (!rows.length) h += '<p class="muted">Ancora nessun giocatore. Crealo qui o da «Nuova partita».</p>';
    const played = rows.filter((r) => r.s.darts), best = played.length > 1 ? played.slice().sort((a, b) => b.s.avg - a.s.avg)[0].p : null;
    if (rows.length) h += '<div class="list">' + rows.map((r) => `<button class="prow" data-act="player" data-id="${r.p.id}">${A.avatar(r.p, 'l')}<span class="t"><span class="t-body">${esc(r.p.name)}${r.p === best ? D.icon('crown', 'crown') : ''}</span>
      <span class="meta">${r.s.darts ? `<span>${D.icon('target')}<b class="num">${num(r.s.avg)}</b></span><span>${D.icon('trophy')}<b class="num">${r.s.wins}</b> vinte</span><span>${D.icon('dart')}<b class="num">${r.s.matches}</b> ${r.s.matches === 1 ? 'partita' : 'partite'}</span>` : '<span>nessuna partita</span>'}</span></span><span class="chev">›</span></button>`).join('') + '</div>';
    h += `<button class="btn ghost" data-act="newp2">${D.icon('plus')}Nuovo giocatore</button>`;
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
    h += '<div class="stats">' + box(num(s.avg), 'media 3 freccette') + box(s.f9d ? num(s.f9) : '–', 'prime 9 freccette') + box(s.dblPct + '%', 'sui doppi') +
      box(s.t180, '180') + box(s.t140, '140+') + box(s.t100, '100+') + box(s.hiOut || '–', 'chiusura più alta') + box(s.bestLeg || '–', 'leg più corta') +
      box(s.wins + '/' + s.matches, 'partite vinte') + '</div>';
    h += '<h2>Media per partita</h2>' + chart(s.trend);
    // record degli allenamenti
    const tr = D.train.DRILLS.map((x) => ({ x: x, n: A.data.trainings.filter((t) => t.drill === x.id && t.player === p.id && t.done).length, b: D.train.best(A.data.trainings, x.id, p.id) })).filter((r) => r.n);
    h += '<h2>Allenamenti</h2>' + (tr.length ? '<div class="list">' + tr.map((r) => `<div class="dr"><span class="ic">${D.icon(r.x.icon)}</span><span class="t"><b>${r.x.name}</b><span>${r.n} ${r.n === 1 ? 'volta' : 'volte'}</span></span><span class="rec"><b class="num">${D.train.fmt(r.x.id, r.b)}</b><span>${r.x.unit}</span></span></div>`).join('') + '</div>'
      : '<p class="muted">Ancora nessun allenamento finito.</p>');
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
