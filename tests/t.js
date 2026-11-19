/* Mini framework di test: funziona in jsc (Mac, riga di comando) e nel browser (test.html). */
var T = (function () {
  const results = [];
  let group = '';
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return {
    results: results,
    group(name) { group = name; },
    ok(cond, name) { results.push({ g: group, name: name, pass: !!cond, info: '' }); },
    eq(actual, expected, name) {
      const pass = same(actual, expected);
      results.push({ g: group, name: name, pass: pass, info: pass ? '' : 'atteso ' + JSON.stringify(expected) + ', avuto ' + JSON.stringify(actual) });
    },
    failed() { return results.filter((r) => !r.pass); },
  };
})();
