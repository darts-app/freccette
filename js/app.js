/* App freccette: dati, schermate, menu, finestrelle, backup, aggiornamenti. */
(function (D) {
  'use strict';
  const VERSION = '0.5.2';                                  // tenere uguale a VERSION in sw.js
  const $ = (id) => document.getElementById(id);
  const root = $('app'), body = document.body;
  const ls = (() => { try { return window.localStorage; } catch (e) { return { getItem() { return null; }, setItem() {} }; } })();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  D.esc = esc;
  D.views = {};                                             // nome → funzione che dà l'HTML
  D.acts = {};                                              // data-act → funzione(elemento)
  const A = D.app = {
    VERSION: VERSION,
    data: D.store.load(ls),
    view: 'home',     // home (con menu) | nuova | partita | fine | giocatore | dettaglio | allenamento | allfine
    tab: 'gioca',     // gioca | allena | giocatori | storico
    sel: null,        // id del giocatore o della partita aperta
    wantReload: false,
    persist() { D.store.save(ls, A.data); },
    render() { render(); },
    go(view, sel) { A.view = view; if (sel !== undefined) A.sel = sel; render(); },
  };

  const ICON = {
    gioca: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/></svg>',
    giocatori: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/></svg>',
    storico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
    allena: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
  };
  const TABS = [{ k: 'gioca', name: 'Gioca' }, { k: 'allena', name: 'Allenamento' }, { k: 'giocatori', name: 'Giocatori' }, { k: 'storico', name: 'Storico' }];

  function render() {
    const tabs = A.view === 'home';
    const v = tabs ? A.tab : A.view;
    body.className = tabs ? 'has-tabs' : 'v-' + v;
    root.innerHTML = D.views[v]();
    $('tabbar').hidden = !tabs;
    if (tabs) $('tabbar').innerHTML = TABS.map((t) => `<button class="${t.k === A.tab ? 'on' : ''}" data-act="tab" data-k="${t.k}">${ICON[t.k]}<span>${t.name}</span></button>`).join('');
    root.scrollTop = 0;
    if (A.wantReload && A.view !== 'partita' && A.view !== 'allenamento') location.reload();
  }

  // Giocatori: umani salvati + bot (id «bot1»…«bot5»)
  A.botPlayer = (lv) => ({ id: 'bot' + lv.id, name: 'Bot ' + lv.name, bot: lv.id });
  A.playerById = (id) => {
    if (/^bot\d$/.test(id)) return A.botPlayer(D.bot.level(+id.slice(3)));
    return A.data.players.find((p) => p.id === id) || null;
  };

  // Icone (tratto, colore del testo)
  const PATH = {
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    dart: '<path d="M4 20l9-9"/><path d="M13 11l2-6 4 4-6 2z"/><path d="M4 20l-1-3M4 20l3 1"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
    crown: '<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z"/>',
    robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    kbd: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
    replay: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    bksp: '<path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
    dumb: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    two: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6.5"/>',
    three: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
  };
  D.icon = (k, cls) => `<svg class="i ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${PATH[k]}</svg>`;
  // Tondo del giocatore: un colore fisso per persona (dall'ordine di creazione), iniziale; i bot hanno il robot grigio
  A.tint = (p) => {
    if (p.bot) return 'ab';
    let i = A.data.players.findIndex((x) => x.id === p.id);
    if (i < 0) { i = 0; for (const ch of String(p.id)) i = (i * 31 + ch.charCodeAt(0)) >>> 0; }
    return 'a' + (i % 4 + 1);
  };
  A.avatar = (p, size) => `<span class="av ${size || ''} ${A.tint(p)}">${p.bot ? D.icon('robot') : esc(String(p.name || '?').trim().charAt(0).toUpperCase())}</span>`;
  // regole in breve: «501 · double in · double out · al meglio di 3 leg»
  // short = per la testata della partita (senza «double out», che è il normale)
  const howMany = (n, mode, what) => (mode === 'first' ? 'primo a ' : 'al meglio di ') + n + ' ' + what;
  A.rules = (c, short) => [c.start, c.in === 'double' ? 'double in' : '', c.out === 'double' ? (short ? '' : 'double out') : 'chiusura libera',
    c.sets ? howMany(c.sets, c.setsMode, 'set') + (short ? '' : ' · set ' + howMany(c.legs, c.legsMode, 'leg')) : howMany(c.legs, c.legsMode, 'leg')].filter(Boolean).join(' · ');

  // Finestrelle
  let onOk = null, onAsk = null;
  A.sheet = (html) => { const s = $('sheet'); s.innerHTML = '<div class="card sheetbox">' + html + '</div>'; s.hidden = false; };
  A.closeSheet = () => { const s = $('sheet'); s.hidden = true; s.innerHTML = ''; };
  A.confirm = (text, okLabel, fn, danger) => {
    onOk = fn;
    A.sheet(`<p>${esc(text)}</p><div class="row2">${fn ? '<button class="btn ghost" data-act="sheetx">Annulla</button>' : ''}<button class="btn ${danger ? 'danger' : ''}" data-act="sheetok">${esc(okLabel)}</button></div>`);
  };
  A.ask = (title, value, fn) => {
    onAsk = fn;
    A.sheet(`<b class="stitle">${esc(title)}</b><input id="askin" class="input" maxlength="20" autocomplete="off" value="${esc(value || '')}"><div class="row2"><button class="btn ghost" data-act="sheetx">Annulla</button><button class="btn" data-act="askok">Ok</button></div>`);
    setTimeout(() => { const i = $('askin'); if (i) i.focus(); }, 60);
  };
  D.acts.sheetx = () => A.closeSheet();
  D.acts.sheetok = () => { const f = onOk; onOk = null; A.closeSheet(); if (f) f(); };
  D.acts.askok = () => { const v = ($('askin').value || '').trim(); if (!v) return; const f = onAsk; onAsk = null; A.closeSheet(); f(v); };
  $('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') A.closeSheet(); });
  $('sheet').addEventListener('keydown', (e) => { if (e.key === 'Enter' && $('askin')) D.acts.askok(); });

  // Avviso breve in basso
  let toastT = 0;
  A.toast = (text) => {
    let t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; body.appendChild(t); }
    t.textContent = text; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800);
  };

  // Tocchi: ogni elemento con data-act chiama D.acts[nome]
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    D.voice.unlock();
    const f = D.acts[el.dataset.act];
    if (f) f(el, e);
  });
  D.acts.tab = (el) => { A.tab = el.dataset.k; A.view = 'home'; render(); };
  D.acts.home = () => { A.view = 'home'; render(); };

  // Backup (come Flow): file sempre con lo stesso nome, Condividi → Salva su File
  D.acts.backup = async () => {
    const name = 'freccette-backup.json';
    const file = new File([D.store.exportJSON(A.data, Date.now())], name, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Backup freccette' });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      A.data.backupAt = Date.now(); A.persist(); render();
    } catch (e) { /* annullato */ }
  };
  D.acts.restore = () => $('impfile').click();
  $('impfile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const r = D.store.importJSON(A.data, rd.result);
        A.persist(); render();
        A.confirm(`Importati: ${r.players} giocatori, ${r.matches} partite e ${r.trainings} allenamenti.`, 'Ok', null);
      } catch (err) { A.confirm('Questo file non è un backup delle freccette.', 'Ok', null); }
    };
    rd.readAsText(f);
  });

  // Offline e aggiornamenti (come Flow): mai ricaricare durante una partita
  if ('serviceWorker' in navigator) {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update(); });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#ver')) return;
        const v = $('ver'); v.textContent = 'controllo…';
        reg.update().then(() => setTimeout(() => { const el = $('ver'); if (el) el.textContent = 'v' + VERSION + ' ✓'; }, 1500))
          .catch(() => { const el = $('ver'); if (el) el.textContent = 'v' + VERSION + ' · offline'; });
      });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had) return;
      if (A.view === 'partita' || A.view === 'allenamento') A.wantReload = true; else location.reload();
    });
  }

  document.addEventListener('DOMContentLoaded', render);    // dopo che tutti i file hanno registrato le schermate
})(globalThis.D = globalThis.D || {});
