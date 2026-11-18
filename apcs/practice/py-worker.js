/* Pyodide 工作執行緒：
   - mode=gen：載入題目產生器（gens/），產生觀念題／實作題
   - mode=run：執行學生程式（每筆測資一個乾淨的命名空間），逐筆回報
   主執行緒若一段時間沒收到回報（無窮迴圈），會直接 terminate 這個 worker 再重開。 */
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');

let py = null;
const ready = (async () => {
  py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' });
  return true;
})();

const RUNNER = `
import sys, io, time, traceback, builtins
def __run_student(code, stdin_text):
    out = io.StringIO()
    old_out, old_in = sys.stdout, sys.stdin
    sys.stdout = out
    sys.stdin = io.StringIO(stdin_text)
    old_input = builtins.input
    def _inp(prompt=''):
        line = sys.stdin.readline()
        if line == '':
            raise EOFError('EOF when reading a line（輸入已經讀完了，卻還在讀）')
        return line.rstrip('\\n')
    builtins.input = _inp
    err = ''
    t0 = time.perf_counter()
    try:
        g = {'__name__': '__main__'}
        exec(compile(code, 'main.py', 'exec'), g)
    except SystemExit:
        pass
    except BaseException:
        et, ev, tb = sys.exc_info()
        lines = traceback.format_exception(et, ev, tb)
        lines = [l for l in lines if '__run_student' not in l and 'File "<exec>"' not in l]
        err = ''.join(lines[-6:])
    finally:
        sys.stdout, sys.stdin = old_out, old_in
        builtins.input = old_input
        sys.setrecursionlimit(1000)
    return out.getvalue(), err, time.perf_counter() - t0
`;

let gensLoaded = false;
async function loadGens(files) {
  if (gensLoaded) return;
  py.FS.mkdirTree('/gens/reading');
  py.FS.mkdirTree('/gens/impl');
  for (const [path, src] of Object.entries(files)) py.FS.writeFile('/gens/' + path, src);
  await py.runPythonAsync(`
import sys, os, json, random, importlib
for d in ('/gens', '/gens/reading', '/gens/impl'):
    sys.path.insert(0, d)
READ = {}
BROKEN = []
for fn in sorted(os.listdir('/gens/reading')):
    if fn.endswith('.py') and not fn.startswith('_'):
        try:
            m = importlib.import_module(fn[:-3])
            for t in getattr(m, 'TEMPLATES', []):
                READ[t['id']] = t
        except Exception as ex:
            BROKEN.append(fn + ': ' + repr(ex))
IMPL = {}
for fn in sorted(os.listdir('/gens/impl')):
    if fn.endswith('.py') and not fn.startswith('_'):
        try:
            m = importlib.import_module(fn[:-3])
            if hasattr(m, 'META') and hasattr(m, 'gen'):
                IMPL[m.META['id']] = m
        except Exception as ex:
            BROKEN.append(fn + ': ' + repr(ex))
def catalog():
    r = [{k: v for k, v in t.items() if k != 'gen'} for t in READ.values()]
    i = [dict(m.META) for m in IMPL.values()]
    return json.dumps({'reading': r, 'impl': i}, ensure_ascii=False)
def gen_reading(tid, seed):
    q = READ[tid]['gen'](random.Random(seed))
    meta = {k: v for k, v in READ[tid].items() if k != 'gen'}
    q.update({'tid': tid, 'seed': seed, 'chapter': meta['chapter'], 'level': meta['level'], 'ttitle': meta.get('title', '')})
    return json.dumps(q, ensure_ascii=False)
def gen_impl(tid, seed):
    m = IMPL[tid]
    p = m.gen(random.Random(seed))
    p.update({'tid': tid, 'seed': seed, 'meta': dict(m.META), 'solution_py': getattr(m, 'SOLUTION_PY', '')})
    return json.dumps(p, ensure_ascii=False)
`);
  gensLoaded = true;
}

self.onmessage = async (e) => {
  const msg = e.data;
  try {
    await ready;
    if (msg.type === 'init') {
      await py.runPythonAsync(RUNNER);
      if (msg.files) await loadGens(msg.files);
      const cat = msg.files ? py.runPython('catalog()') : null;
      self.postMessage({ id: msg.id, ok: true, catalog: cat ? JSON.parse(cat) : null });
    } else if (msg.type === 'genReading') {
      const f = py.globals.get('gen_reading');
      const s = f(msg.tid, msg.seed); f.destroy();
      self.postMessage({ id: msg.id, ok: true, data: JSON.parse(s) });
    } else if (msg.type === 'genImpl') {
      const f = py.globals.get('gen_impl');
      const s = f(msg.tid, msg.seed); f.destroy();
      self.postMessage({ id: msg.id, ok: true, data: JSON.parse(s) });
    } else if (msg.type === 'run') {
      const f = py.globals.get('__run_student');
      const results = [];
      for (let i = 0; i < msg.inputs.length; i++) {
        self.postMessage({ id: msg.id, progress: i });
        const r = f(msg.code, msg.inputs[i]);
        const [out, err, sec] = r.toJs(); r.destroy();
        results.push({ out, err, sec });
        self.postMessage({ id: msg.id, partial: { i, out, err, sec } });
      }
      f.destroy();
      self.postMessage({ id: msg.id, ok: true, results });
    }
  } catch (err) {
    self.postMessage({ id: msg.id, ok: false, error: String(err && err.message || err) });
  }
};
