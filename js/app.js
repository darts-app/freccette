/* App freccette: dati, schermate, menu, finestrelle, backup, aggiornamenti. */
(function (D) {
  'use strict';
  const VERSION = '0.1.1';                                  // tenere uguale a VERSION in sw.js
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
    view: 'home',     // home (con menu) | nuova | partita | fine | giocatore | dettaglio
    tab: 'gioca',     // gioca | giocatori | storico
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
  };
  const TABS = [{ k: 'gioca', name: 'Gioca' }, { k: 'giocatori', name: 'Giocatori' }, { k: 'storico', name: 'Storico' }];

  function render() {
    const tabs = A.view === 'home';
    const v = tabs ? A.tab : A.view;
    body.className = tabs ? 'has-tabs' : 'v-' + v;
    root.innerHTML = D.views[v]();
    $('tabbar').hidden = !tabs;
    if (tabs) $('tabbar').innerHTML = TABS.map((t) => `<button class="${t.k === A.tab ? 'on' : ''}" data-act="tab" data-k="${t.k}">${ICON[t.k]}<span>${t.name}</span></button>`).join('');
    root.scrollTop = 0;
    if (A.wantReload && A.view !== 'partita') location.reload();
  }

  // Giocatori: umani salvati + bot (id «bot1»…«bot5»)
  A.botPlayer = (lv) => ({ id: 'bot' + lv.id, name: 'Bot ' + lv.name, bot: lv.id });
  A.playerById = (id) => {
    if (/^bot\d$/.test(id)) return A.botPlayer(D.bot.level(+id.slice(3)));
    return A.data.players.find((p) => p.id === id) || null;
  };

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
        A.confirm(`Importati: ${r.players} giocatori e ${r.matches} partite.`, 'Ok', null);
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
      if (A.view === 'partita') A.wantReload = true; else location.reload();
    });
  }

  document.addEventListener('DOMContentLoaded', render);    // dopo che tutti i file hanno registrato le schermate
})(globalThis.D = globalThis.D || {});
