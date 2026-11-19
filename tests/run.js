/* Test da riga di comando, dalla cartella App/freccette:
   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/run.js */
load('tests/t.js');
load('tests/files.js');
SRC.forEach((f) => load(f));
TESTS.forEach((f) => load(f));
T.failed().forEach((r) => print('FALLITO  [' + r.g + '] ' + r.name + '  ' + r.info));
print(T.results.length + ' controlli, ' + T.failed().length + ' falliti');
