/* Taratura dei bot: trova sigma (mm) per ogni media. Dalla cartella App/freccette:
   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/calibra.js */
load('js/board.js'); load('js/checkout.js'); load('js/game.js'); load('js/bot.js');
[30, 45, 60, 75, 90].forEach((avg) => {
  let lo = 1, hi = 150;
  for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (D.bot.simAvg(mid, 400, 3) > avg) lo = mid; else hi = mid; }
  const s = Math.round((lo + hi) / 2 * 10) / 10;
  print('media ' + avg + ' → sigma ' + s + '  (controllo: ' + D.bot.simAvg(s, 1000, 99).toFixed(1) + ')');
});
