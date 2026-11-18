/* C/C++ 直譯器工作執行緒（JSCPP，支援基本語法：cin/cout/printf/scanf、陣列、函式；不支援大部分 STL）。 */
self.window = self;
importScripts('https://cdn.jsdelivr.net/npm/JSCPP@2.0.6/dist/JSCPP.es5.min.js');

self.onmessage = (e) => {
  const msg = e.data;
  const JS = self.JSCPP && (self.JSCPP.default || self.JSCPP);
  const results = [];
  for (let i = 0; i < msg.inputs.length; i++) {
    self.postMessage({ id: msg.id, progress: i });
    let out = '', err = '';
    const t0 = performance.now();
    try {
      JS.run(msg.code, msg.inputs[i], { stdio: { write: (s) => { out += s; } }, maxTimeout: 20000 });
    } catch (ex) {
      err = String(ex && ex.message || ex);
    }
    const sec = (performance.now() - t0) / 1000;
    results.push({ out, err, sec });
    self.postMessage({ id: msg.id, partial: { i, out, err, sec } });
  }
  self.postMessage({ id: msg.id, ok: true, results });
};
