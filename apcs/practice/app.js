/* APCS 特訓站 主程式 */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('apcs_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { if (v && (k === 'isession' || k === 'ilast')) v = stripTests(v); try { localStorage.setItem('apcs_' + k, JSON.stringify(v)); } catch (e) { toast('瀏覽器無法儲存（可能是無痕模式），紀錄不會保留'); } },
};
/* 實作題測資很大：localStorage 只存題號＋種子，測資放記憶體（同種子重新產生結果相同） */
const PCACHE = {};
const pkey = (p) => p.tid + ':' + p.seed;
function stripTests(s) { return { ...s, probs: s.probs.map((p) => ({ ...p, tests: p.tests.map((t) => ({ sub: t.sub })) })) }; }
function fillTests(s) { s.probs = s.probs.map((p) => PCACHE[pkey(p)] || p); return s; }
async function hydrate(s) { for (const p of s.probs) if (!PCACHE[pkey(p)]) PCACHE[pkey(p)] = await Gen.impl(p.tid, p.seed); return fillTests(s); }
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
const rnd = () => Math.floor(Math.random() * 1e9);

const CH = {
  c01: '輸入輸出與運算', c02: '條件判斷', c03: '迴圈', c04: '一維串列', c05: '字串處理', c06: '二維串列', c07: '函式',
  c08: '排序與搜尋', c09: '模擬題技巧', c10: '計數、字典與前綴和', c11: '遞迴', c12: '堆疊與佇列', c13: '枚舉與貪心',
  c14: '動態規劃入門', c15: '圖與 BFS/DFS',
};
const LEVELS = ['初', '中', '中高', '高'];
const LEVEL_NAME = { 初: '初級', 中: '中級', 中高: '中高級', 高: '高級' };
const EXAM = new Date('2027-01-10T09:00:00+08:00');
const LIMIT = 3; // 本站每筆測資時限（秒）；瀏覽器執行比正式環境慢

function readingGrade(score) { return score >= 90 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : score >= 30 ? 2 : 1; }
function implGrade(level, total) {
  const t = { 初: [[150, 2]], 中: [[150, 3], [100, 2]], 中高: [[150, 4], [100, 3]], 高: [[150, 5], [100, 4]] }[level];
  for (const [s, g] of t) if (total >= s) return g;
  return 1;
}

/* ---------------- Python／C++ 執行引擎 ---------------- */
function callWorker(w, msg, onMsg) {
  return new Promise((res, rej) => {
    const id = Math.random();
    const h = (e) => {
      const d = e.data; if (d.id !== id) return;
      if (d.partial || d.progress !== undefined) { onMsg && onMsg(d); return; }
      w.removeEventListener('message', h);
      d.ok ? res(d) : rej(new Error(d.error));
    };
    w.addEventListener('message', h);
    w.postMessage({ ...msg, id });
  });
}
const Gen = {
  w: null, ready: null, catalog: null,
  init() {
    if (!this.ready) {
      this.w = new Worker('py-worker.js?v=1118164916');
      this.ready = callWorker(this.w, { type: 'init', files: BUNDLE.gens }).then((r) => (this.catalog = r.catalog));
    }
    return this.ready;
  },
  async reading(tid, seed) { await this.init(); return (await callWorker(this.w, { type: 'genReading', tid, seed })).data; },
  async impl(tid, seed) { await this.init(); return (await callWorker(this.w, { type: 'genImpl', tid, seed })).data; },
};
const Runner = {
  py: null, pyReady: null, cpp: null, spare: null,
  makePy() { const w = new Worker('py-worker.js?v=1118164916'); return callWorker(w, { type: 'init' }).then(() => w); },
  getPy() {
    if (!this.pyReady) { this.pyReady = this.spare || this.makePy(); this.spare = null; this.pyReady.then((w) => (this.py = w)); }
    return this.pyReady;
  },
  warmSpare() { if (!this.spare) this.spare = this.makePy(); },
  /* 逐筆執行；某筆超時就換備用 worker 繼續跑剩下的。回傳 [{out,err,sec,tle}] */
  async run(lang, code, inputs, onEach, maxTle = Infinity) {
    if (!inputs.length) return [];
    if (maxTle <= 0) { const rs = inputs.map(() => ({ out: '', err: '', sec: 0, tle: true, skipped: true })); rs.forEach((r, i) => onEach && onEach(i, r)); return rs; }
    if (lang === 'py' && inputs.length > 1) this.warmSpare();
    const w = lang === 'py' ? await this.getPy() : (this.cpp || (this.cpp = new Worker('cpp-worker.js?v=1118164916')));
    return new Promise((resolve) => {
      const id = Math.random(); const results = []; let timer = null; let cur = 0;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          w.removeEventListener('message', h); w.terminate();
          if (lang === 'py') { this.py = null; this.pyReady = null; } else this.cpp = null;
          results[cur] = { out: '', err: '', sec: LIMIT, tle: true }; onEach && onEach(cur, results[cur]);
          const rest = inputs.slice(cur + 1);
          if (!rest.length) return resolve(results);
          const base = cur + 1;
          this.run(lang, code, rest, (i, r) => onEach && onEach(base + i, r), maxTle - 1).then((rs) => { rs.forEach((r, i) => (results[base + i] = r)); resolve(results); });
        }, LIMIT * 1000 + 1500);
      };
      const h = (e) => {
        const d = e.data; if (d.id !== id) return;
        if (d.progress !== undefined) { cur = d.progress; arm(); return; }
        if (d.partial) { const r = d.partial; r.tle = r.sec > LIMIT; results[r.i] = r; onEach && onEach(r.i, r); return; }
        clearTimeout(timer); w.removeEventListener('message', h);
        if (!d.ok) inputs.forEach((_, i) => { if (!results[i]) results[i] = { out: '', err: d.error, sec: 0 }; });
        resolve(results);
      };
      w.addEventListener('message', h);
      w.postMessage({ type: 'run', code, inputs, id });
      arm();
    });
  },
};
const norm = (s) => String(s ?? '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
function verdict(r, expect) {
  if (r.tle) return 'TLE';
  if (norm(r.out) === norm(expect)) return 'AC';
  if (r.err) return 'RE';
  return 'WA';
}
const VNAME = { AC: '正確', WA: '答案錯誤', TLE: '超過時間', RE: '執行錯誤' };

/* ---------------- 路由 ---------------- */
const views = {};
let curView = '';
function go(name, ...args) {
  $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === name));
  window.scrollTo(0, 0);
  curView = name;
  if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  views[name](...args);
}
window.addEventListener('hashchange', () => { const n = location.hash.slice(1); if (views[n] && n !== curView) go(n); });
document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });
$('#shareBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  const data = { title: 'APCS 特訓站', text: 'APCS 觀念題＋實作題線上練習，題目刷不完、還能直接寫程式測資驗證', url: location.href.split('#')[0] };
  try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); toast('網址已複製，貼給同學吧！'); } } catch (_) {}
});
const V = () => $('#view');
function loadingHTML(t) { return `<div class="card loading"><div class="spin"></div><div>${t}</div></div>`; }
const ENGINE_NOTE = '第一次開啟需要下載 Python 引擎（約 10～20 秒，之後會快很多）…';

/* ---------------- 首頁 ---------------- */
views.home = () => {
  const days = Math.max(0, Math.ceil((EXAM - new Date()) / 86400000));
  const hist = store.get('history', []);
  const rd = hist.filter((h) => h.type === 'reading'), im = hist.filter((h) => h.type === 'impl');
  const best = (a, f) => (a.length ? Math.max(...a.map(f)) : '—');
  V().innerHTML = `
  <section class="hero">
    <span class="pill gold">2027/01/10 APCS 檢測</span>
    <h1>APCS 特訓站：觀念題＋實作題，刷不完的練習</h1>
    <p>題目依 APCS 官方題本格式與歷屆考法隨機生成，每次都不一樣。網頁上直接寫 Python，按一下就帶入全部測資驗證，錯在哪一筆、差在哪一行都告訴你。</p>
    <div class="count">
      <div class="box"><b>${days}</b>天後考試</div>
      <div class="box"><b>${rd.length + im.length}</b>次練習紀錄</div>
      <div class="box"><b>${best(rd, (h) => h.score)}</b>觀念題最高分</div>
      <div class="box"><b>${best(im, (h) => h.total)}</b>實作最高分／300</div>
    </div>
  </section>
  <div class="grid g3" style="margin-top:20px">
    <div class="card feature" data-go="reading"><div class="ico">📝</div><h3>觀念題（程式識讀）</h3><p class="muted">選題數與目標級分，答錯立刻看詳解，最後打分、分析弱點章節。</p><span class="pill">滿分 100</span></div>
    <div class="card feature" data-go="impl"><div class="ico">💻</div><h3>實作題（一次三題）</h3><p class="muted">選初級／中級／中高級／高級，網頁寫程式、執行、全部測資驗證，送出後詳細分析。</p><span class="pill">滿分 300</span></div>
    <div class="card feature" data-go="learn"><div class="ico">📘</div><h3>觀念學習</h3><p class="muted">15 章教材，每個觀念都有比喻、輸入輸出範例、什麼時候用、常見錯誤。</p><span class="pill">從零開始也看得懂</span></div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><h3>官方計分對照（2025 新制）</h3>
      <table class="list"><tr><th>題本</th><th>100–149 分</th><th>150–300 分</th></tr>
      <tr><td>初級</td><td>1 級分</td><td>2 級分</td></tr><tr><td><b>中級</b></td><td>2 級分</td><td><b>3 級分</b></td></tr>
      <tr><td>中高級</td><td>3 級分</td><td>4 級分</td></tr><tr><td>高級</td><td>4 級分</td><td>5 級分</td></tr></table>
      <p class="small muted">程式識讀：90↑5、70↑4、50↑3、30↑2 級分。實作每題 100 分，依子題組通過的測資給分。</p></div>
    <div class="card"><h3>拿分策略</h3>
      <p>每題第 1 子題組通常 <b>60 分</b>，條件比較簡單（例如 n = 1）。<br>三題都先把第 1 子題組拿下＝<b>180 分</b>，已經超過 150。</p>
      <p class="muted small">建議：觀念題每天 10 題暖身 → 實作每天 1 題 → 週末一回完整三題（120 分鐘）。<br>錯題記得到「錯題本」重做，弱點章節回「觀念學習」複習。</p>
      <div class="row"><button class="btn gold" data-go="impl">開始實作練習</button><button class="btn ghost" data-go="reading">先做觀念題</button></div>
      <p class="small muted" style="margin-top:12px">想看影片從頭學？<a href="../">APCS 12 單元講解影片＋講義（官網 APCS 專區）</a></p></div>
  </div>`;
};

/* ---------------- 觀念題 ---------------- */
const RW = { 2: { 1: 4, 2: 4, 3: 1 }, 3: { 1: 2, 2: 4, 3: 3, 4: 1 }, 4: { 2: 2, 3: 4, 4: 3, 5: 1 }, 5: { 3: 2, 4: 4, 5: 4 } };
function pickTemplate(list, weights, used) {
  let pool = list.filter((t) => weights[t.level] && !used.has(t.id));
  if (!pool.length) pool = list.filter((t) => weights[t.level]);
  if (!pool.length) pool = list;
  let sum = pool.reduce((s, t) => s + (weights[t.level] || 1), 0), x = Math.random() * sum;
  for (const t of pool) { x -= weights[t.level] || 1; if (x <= 0) return t; }
  return pool[pool.length - 1];
}
views.reading = async () => {
  const s = store.get('rsession', null);
  if (s && !s.done) return readingRun();
  V().innerHTML = `<div class="card" style="max-width:760px;margin:0 auto">
    <h2>📝 觀念題（程式識讀）設定</h2>
    <p class="muted">APCS 正式考試：30 題單選、90 分鐘。題目每次隨機生成，不會被刷完。</p>
    <div class="field"><label>題目數量</label><div class="choice" id="cN">${[5, 10, 20, 30].map((n) => `<button data-v="${n}" class="${n === 10 ? 'on' : ''}">${n} 題</button>`).join('')}</div></div>
    <div class="field"><label>想要達到的級分（決定題目難度）</label><div class="choice" id="cG">${[2, 3, 4, 5].map((g) => `<button data-v="${g}" class="${g === 3 ? 'on' : ''}">${g} 級分</button>`).join('')}</div></div>
    <div class="field"><label>程式碼顯示語言</label><div class="choice" id="cL"><button data-v="py" class="on">Python 題本</button><button data-v="c">C 題本</button></div></div>
    <div class="row"><button class="btn gold" id="go">開始作答</button><span class="muted small" id="st"></span></div></div>`;
  $$('.choice').forEach((c) => c.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', c).forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
  $('#go').onclick = async () => {
    const n = +$('#cN .on').dataset.v, target = +$('#cG .on').dataset.v, lang = $('#cL .on').dataset.v;
    $('#go').disabled = true; $('#st').innerHTML = '<span class="spin" style="display:inline-block;vertical-align:middle"></span> ' + ENGINE_NOTE;
    try {
      const cat = await Gen.init();
      const used = new Set(), plan = [];
      for (let i = 0; i < n; i++) { const t = pickTemplate(cat.reading, RW[target], used); used.add(t.id); plan.push({ tid: t.id, seed: rnd() }); }
      store.set('rsession', { n, target, lang, plan, qs: [], ans: [], i: 0, start: Date.now() });
      readingRun();
    } catch (err) { $('#st').textContent = '載入失敗：' + err.message + '（請確認網路後重新整理）'; $('#go').disabled = false; }
  };
};
function codeBlock(code) {
  return `<pre class="code">${esc(code).split('\n').map((l, i) => `<span class="ln">${i + 1}</span>${l}`).join('\n')}</pre>`;
}
async function readingRun() {
  const s = store.get('rsession');
  if (s.i >= s.n) return readingResult();
  V().innerHTML = loadingHTML(Gen.catalog ? '產生題目中…' : ENGINE_NOTE);
  if (!s.qs[s.i]) {
    try { s.qs[s.i] = await Gen.reading(s.plan[s.i].tid, s.plan[s.i].seed); }
    catch (err) { s.plan[s.i].seed = rnd(); store.set('rsession', s); return readingRun(); }
    store.set('rsession', s);
  }
  const q = s.qs[s.i], answered = s.ans[s.i] != null;
  const code = s.lang === 'c' && q.code_c ? q.code_c : q.code_py;
  V().innerHTML = `<div class="card" style="max-width:900px;margin:0 auto">
    <div class="qhead"><b>第 ${s.i + 1} / ${s.n} 題</b><div class="progress"><i style="width:${(s.i / s.n) * 100}%"></i></div>
      <span class="pill">${CH[q.chapter] || ''}</span><span class="pill gold">難度 ${'★'.repeat(q.level)}</span></div>
    <p style="white-space:pre-wrap;font-weight:600">${esc(q.stem)}</p>
    ${s.lang === 'c' && !q.code_c ? '<p class="small muted">（本題只有 Python 版本）</p>' : ''}
    ${codeBlock(code)}
    <div class="opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${'ABCD'[k]}</span><span class="mono">${esc(o)}</span></button>`).join('')}</div>
    <div class="row" style="margin-top:14px"><button class="btn" id="ok" disabled>確認答案</button><span class="spacer"></span>
      <button class="btn ghost sm" id="quit">結束並看成績</button></div>
    <div id="fb"></div></div>`;
  let pick = null;
  const opts = $$('.opt');
  const show = () => {
    const a = s.ans[s.i];
    opts.forEach((b, k) => { b.disabled = true; if (k === q.answer) b.classList.add('right'); else if (k === a) b.classList.add('wrong'); });
    const right = a === q.answer;
    $('#fb').innerHTML = `<div class="explain"><b>${right ? '✅ 答對了！' : `❌ 答錯了，正確答案是 ${'ABCD'[q.answer]}`}</b>\n\n${esc(q.explain)}</div>`;
    $('#ok').textContent = s.i + 1 >= s.n ? '看成績 →' : '下一題 →'; $('#ok').disabled = false; $('#ok').className = 'btn gold';
    $('#ok').onclick = () => { s.i++; store.set('rsession', s); readingRun(); };
  };
  if (answered) show();
  else {
    opts.forEach((b) => b.onclick = () => { pick = +b.dataset.k; opts.forEach((x) => x.classList.toggle('sel', x === b)); $('#ok').disabled = false; });
    $('#ok').onclick = () => {
      s.ans[s.i] = pick;
      if (pick !== q.answer) {
        const wb = store.get('wrongbook', []);
        wb.unshift({ q, chosen: pick, lang: s.lang, at: Date.now() });
        store.set('wrongbook', wb.slice(0, 300));
      }
      store.set('rsession', s); show();
    };
  }
  $('#quit').onclick = () => { if (confirm('確定結束？沒作答的題目不計分（以已作答題數計算）。')) { s.n = s.ans.filter((x) => x != null).length || 0; s.i = s.n; store.set('rsession', s); readingResult(); } };
}
function chapterBars(stats) {
  return Object.entries(stats).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([c, v]) => {
    const p = Math.round((v.ok / v.n) * 100), col = p >= 80 ? 'var(--ok)' : p >= 60 ? 'var(--gold)' : 'var(--bad)';
    return `<div class="bar"><span class="t">${CH[c] || c}</span><span class="b"><i style="width:${p}%;background:${col}"></i></span><span class="v">${v.ok}/${v.n}</span></div>`;
  }).join('');
}
function readingResult() {
  const s = store.get('rsession');
  const n = s.n; let ok = 0; const stats = {};
  for (let i = 0; i < n; i++) {
    const q = s.qs[i]; if (!q) continue;
    const st = stats[q.chapter] || (stats[q.chapter] = { n: 0, ok: 0 });
    st.n++; if (s.ans[i] === q.answer) { st.ok++; ok++; }
  }
  const score = n ? Math.round((ok * 100) / n) : 0, g = readingGrade(score);
  if (!s.done) {
    s.done = true; store.set('rsession', s);
    const h = store.get('history', []); h.unshift({ type: 'reading', at: Date.now(), n, ok, score, grade: g, target: s.target, stats }); store.set('history', h.slice(0, 200));
  }
  const weak = Object.entries(stats).filter(([, v]) => v.ok / v.n < 0.7).map(([c]) => c);
  V().innerHTML = `<div class="card" style="max-width:900px;margin:0 auto">
    <h2>觀念題成績</h2>
    <div class="result-big"><div class="ring" style="--p:${score}"><div><div><b>${score}</b><br><span class="small muted">/ 100</span></div></div></div>
      <div><p style="font-size:20px;margin:0">答對 <b>${ok}</b> / ${n} 題</p><p style="margin:4px 0">相當於 <span class="pill gold" style="font-size:16px">${g} 級分</span>（目標 ${s.target} 級分）</p>
      <p class="muted small">程式識讀級分：90↑5、70↑4、50↑3、30↑2</p></div></div>
    <h3 style="margin-top:22px">各章節答對率</h3>${chapterBars(stats)}
    ${weak.length ? `<div class="notice" style="margin-top:14px"><b>建議多複習：</b>${weak.map((c) => `<a href="#" data-lesson="${c}">${CH[c]}</a>`).join('、')}（點章節名稱直接打開觀念學習）</div>` : '<div class="notice" style="background:var(--okbg);color:var(--ok);margin-top:14px">每一章答對率都在 70% 以上，可以把目標級分往上調一級！</div>'}
    <div class="row" style="margin-top:18px"><button class="btn gold" id="again">再練一回</button><button class="btn ghost" data-go="wrong">去錯題本</button><button class="btn ghost" id="review">回顧本回題目</button></div>
    <div id="rv"></div></div>`;
  bindLessonLinks();
  $('#again').onclick = () => { store.set('rsession', null); views.reading(); };
  $('#review').onclick = () => {
    $('#rv').innerHTML = s.qs.slice(0, n).map((q, i) => `<div class="card" style="margin-top:14px;box-shadow:none"><b>第 ${i + 1} 題</b> ${s.ans[i] === q.answer ? '<span class="pill ok">答對</span>' : `<span class="pill bad">答錯（你選 ${s.ans[i] == null ? '未作答' : 'ABCD'[s.ans[i]]}）</span>`}
      <p style="white-space:pre-wrap">${esc(q.stem)}</p>${codeBlock(s.lang === 'c' && q.code_c ? q.code_c : q.code_py)}
      <p>${q.options.map((o, k) => `${'ABCD'[k]}. ${esc(o)}`).join('　')}</p><div class="explain">正確答案 ${'ABCD'[q.answer]}\n\n${esc(q.explain)}</div></div>`).join('');
  };
}
function bindLessonLinks() { $$('[data-lesson]').forEach((a) => a.onclick = (e) => { e.preventDefault(); go('learn', a.dataset.lesson); }); }

/* ---------------- 錯題本 ---------------- */
views.wrong = () => {
  const wb = store.get('wrongbook', []);
  V().innerHTML = `<div class="card"><div class="row"><h2 style="margin:0">📒 錯題本</h2><span class="pill">${wb.length} 題</span><span class="spacer"></span>
    ${wb.length ? '<button class="btn ghost sm" id="clr">全部清空</button>' : ''}</div>
    <p class="muted small">觀念題答錯會自動收進來。重做答對了就可以按「我會了」移除。</p>
    ${wb.length ? '' : '<p>目前沒有錯題，太棒了！去做一回觀念題吧。</p>'}<div id="wl"></div></div>`;
  $('#wl').innerHTML = wb.map((w, i) => {
    const q = w.q;
    return `<div class="card" style="margin-top:14px;box-shadow:none" data-i="${i}">
      <div class="row"><span class="pill">${CH[q.chapter] || ''}</span><span class="pill gold">難度 ${'★'.repeat(q.level)}</span><span class="small muted">${new Date(w.at).toLocaleDateString()}</span></div>
      <p style="white-space:pre-wrap;font-weight:600">${esc(q.stem)}</p>${codeBlock(w.lang === 'c' && q.code_c ? q.code_c : q.code_py)}
      <div class="opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${'ABCD'[k]}</span><span class="mono">${esc(o)}</span></button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><span class="small muted">上次選 ${'ABCD'[w.chosen] ?? '—'}，再做一次看看</span><span class="spacer"></span>
        <a href="#" data-lesson="${q.chapter}" class="small">複習「${CH[q.chapter]}」</a><button class="btn ghost sm rm">我會了，移除</button></div><div class="fb"></div></div>`;
  }).join('');
  bindLessonLinks();
  $$('#wl > .card').forEach((card) => {
    const w = wb[+card.dataset.i], q = w.q;
    $$('.opt', card).forEach((b) => b.onclick = () => {
      const k = +b.dataset.k;
      $$('.opt', card).forEach((x, j) => { x.disabled = true; if (j === q.answer) x.classList.add('right'); else if (j === k) x.classList.add('wrong'); });
      $('.fb', card).innerHTML = `<div class="explain"><b>${k === q.answer ? '✅ 這次答對了！' : '❌ 還是錯了，看看詳解'}</b>\n\n${esc(q.explain)}</div>`;
    });
    $('.rm', card).onclick = () => { const all = store.get('wrongbook', []); all.splice(+card.dataset.i, 1); store.set('wrongbook', all); views.wrong(); };
  });
  const c = $('#clr'); if (c) c.onclick = () => { if (confirm('確定清空錯題本？')) { store.set('wrongbook', []); views.wrong(); } };
};

/* ---------------- 實作題 ---------------- */
const STARTER = {
  py: '# 在這裡寫你的 Python 程式\n# 讀一行整數：n = int(input())\n# 讀一行多個整數：a = list(map(int, input().split()))\n\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
};
views.impl = async () => {
  const s = store.get('isession', null);
  if (s && !s.done) return implWorkspace();
  V().innerHTML = `<div class="card" style="max-width:760px;margin:0 auto">
    <h2>💻 實作題設定</h2>
    <p class="muted">APCS 正式考試：一次 3 題、120 分鐘、每題 100 分（依子題組通過的測資給分）。</p>
    <div class="field"><label>題本等級</label><div class="choice" id="cLv">${LEVELS.map((l) => `<button data-v="${l}" class="${l === '中' ? 'on' : ''}">${LEVEL_NAME[l]}</button>`).join('')}</div></div>
    <div class="field"><label>計時</label><div class="choice" id="cT"><button data-v="120" class="on">模擬考 120 分鐘</button><button data-v="0">不計時（練習）</button></div></div>
    <div class="row"><button class="btn gold" id="go">產生三題並開始</button><span class="muted small" id="st"></span></div>
    <p class="small muted" style="margin-top:16px">說明：程式在你的瀏覽器裡執行。Python 完整支援；C++ 為簡易直譯器（支援 cin/cout、陣列、函式，不支援大部分 STL）。
    本站每筆測資時限 ${LIMIT} 秒（瀏覽器比正式考場慢），正式考試是 1 秒。</p></div>`;
  $$('.choice').forEach((c) => c.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', c).forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
  $('#go').onclick = async () => {
    const level = $('#cLv .on').dataset.v, mins = +$('#cT .on').dataset.v;
    $('#go').disabled = true; $('#st').innerHTML = '<span class="spin" style="display:inline-block;vertical-align:middle"></span> ' + ENGINE_NOTE;
    try {
      const cat = await Gen.init();
      let pool = cat.impl.filter((t) => t.level === level);
      if (!pool.length) throw new Error('這個等級的題目還在製作中');
      pool = pool.sort(() => Math.random() - 0.5);
      const picks = [];
      for (const t of pool) { if (picks.length < 3 && !picks.some((p) => (p.chapters || [])[0] === (t.chapters || [])[0])) picks.push(t); }
      for (const t of pool) if (picks.length < 3 && !picks.includes(t)) picks.push(t);
      while (picks.length < 3) picks.push(pool[picks.length % pool.length]);
      $('#st').innerHTML = '<span class="spin" style="display:inline-block;vertical-align:middle"></span> 產生題目與測資中…';
      const probs = [];
      for (const t of picks) { const pr = await Gen.impl(t.id, rnd()); PCACHE[pkey(pr)] = pr; probs.push(pr); }
      store.set('isession', {
        level, probs, cur: 0, lang: ['py', 'py', 'py'], code: probs.map(() => ({ py: STARTER.py, cpp: STARTER.cpp })),
        saved: [false, false, false], tests: [null, null, null], start: Date.now(), mins, done: false,
      });
      implWorkspace();
    } catch (err) { $('#st').textContent = '失敗：' + err.message; $('#go').disabled = false; }
  };
};
function stmtHTML(p, k) {
  return `<h3 style="margin-top:0">第 ${k + 1} 題：${esc(p.title)}</h3>
    <h4>問題描述</h4><p>${esc(p.desc)}</p><h4>輸入格式</h4><p>${esc(p.input_fmt)}</p><h4>輸出格式</h4><p>${esc(p.output_fmt)}</p>
    ${p.samples.map((sm, i) => `<table class="io"><tr><th>範例${'一二三四'[i]}：輸入 <button class="copy" data-copy="${i}">複製</button></th><th>範例${'一二三四'[i]}：正確輸出</th></tr>
      <tr><td><pre>${esc(sm.in)}</pre></td><td><pre>${esc(sm.out)}</pre></td></tr></table>${sm.note ? `<p class="small muted">範例${'一二三四'[i]}說明：${esc(sm.note)}</p>` : ''}`).join('')}
    <h4>評分說明</h4><p>輸入包含若干筆測試資料，每一筆測試資料的執行時間限制均為 1 秒，依正確通過測資筆數給分。其中：\n${p.subtasks.map((st, i) => `第 ${i + 1} 子題組 ${st.score} 分：${st.desc}`).join('\n')}</p>`;
}
let cm = null, clockT = null;
async function implWorkspace() {
  let s = store.get('isession');
  if (s.probs.some((p) => !PCACHE[pkey(p)])) { V().innerHTML = loadingHTML(Gen.catalog ? '載入題目中…' : ENGINE_NOTE); s = await hydrate(s); }
  else fillTests(s);
  const k = s.cur, p = s.probs[k];
  V().innerHTML = `
  <div class="row" style="margin-bottom:12px">
    <h2 style="margin:0">${LEVEL_NAME[s.level]}題本</h2><span class="pill gold" id="clock"></span>
    <div class="tabs3" style="margin-left:8px">${s.probs.map((pp, i) => `<button data-k="${i}" class="${i === k ? 'on' : ''}"><span class="dot ${s.saved[i] ? 'saved' : (s.code[i].py !== STARTER.py ? 'edit' : '')}"></span>第 ${i + 1} 題</button>`).join('')}</div>
    <span class="spacer"></span>
    <button class="btn ghost sm" id="dl">⬇ 下載題目（Word）</button>
    <button class="btn gold sm" id="submitAll">最終送出</button>
  </div>
  <div class="ws">
    <div class="card stmt">${stmtHTML(p, k)}</div>
    <div>
      <div class="card editor-card">
        <div class="ebar">
          <select id="lang"><option value="py">Python 3</option><option value="cpp">C++（簡易）</option></select>
          <button class="btn sm" id="run">▶ 執行</button>
          <button class="btn sm ok" id="test">✔ 測試全部測資</button>
          <span class="spacer"></span>
          <button class="btn gold sm" id="save">💾 儲存／繳交本題</button>
        </div>
        <textarea id="ed"></textarea>
        <div class="io2">
          <div><label>輸入（stdin）</label><textarea id="stdin"></textarea></div>
          <div><label>輸出 <span id="rt" class="small"></span></label><pre id="stdout"></pre></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px" id="tp"><b>測試結果</b><p class="small muted">按「測試全部測資」會帶入本題全部 ${p.tests.length} 筆測資（含隱藏測資）逐筆比對，輸出只要有一點不同就算錯（每行行尾空白不計）。</p><div id="tres"></div></div>
    </div>
  </div>`;
  $('#lang').value = s.lang[k];
  cm = CodeMirror.fromTextArea($('#ed'), { lineNumbers: true, mode: s.lang[k] === 'py' ? 'python' : 'text/x-c++src', theme: 'dracula', indentUnit: 4, tabSize: 4, matchBrackets: true, autoCloseBrackets: true, extraKeys: { Tab: (c) => c.replaceSelection('    ') } });
  cm.setValue(s.code[k][s.lang[k]]);
  let saveT = null;
  cm.on('change', () => { clearTimeout(saveT); saveT = setTimeout(() => { const ss = store.get('isession'); ss.code[k][ss.lang[k]] = cm.getValue(); ss.saved[k] = false; store.set('isession', ss); }, 400); });
  $('#stdin').value = p.samples[0].in;
  if (s.tests[k]) renderTests(p, s.tests[k]);
  $$('.tabs3 button').forEach((b) => b.onclick = () => { flush(); const ss = store.get('isession'); ss.cur = +b.dataset.k; store.set('isession', ss); implWorkspace(); });
  $$('[data-copy]').forEach((b) => b.onclick = () => { $('#stdin').value = p.samples[+b.dataset.copy].in; toast('已放進輸入框'); });
  $('#lang').onchange = () => { flush(); const ss = store.get('isession'); ss.lang[k] = $('#lang').value; store.set('isession', ss); implWorkspace(); };
  function flush() { const ss = store.get('isession'); ss.code[k][ss.lang[k]] = cm.getValue(); store.set('isession', ss); return ss; }
  $('#run').onclick = async () => {
    flush(); const lang = $('#lang').value;
    $('#stdout').textContent = ''; $('#rt').innerHTML = '<span class="spin" style="display:inline-block;vertical-align:middle;width:12px;height:12px"></span> 執行中' + (Runner.py || lang !== 'py' ? '' : '（第一次要載入 Python 引擎）');
    const [r] = await Runner.run(lang, cm.getValue(), [$('#stdin').value]);
    $('#stdout').textContent = r.tle ? `超過 ${LIMIT} 秒，已強制停止（是不是有無窮迴圈？）` : (r.out + (r.err ? '\n——錯誤訊息——\n' + r.err : ''));
    $('#rt').textContent = r.tle ? '超時' : `${(r.sec * 1000).toFixed(0)} ms`;
    const smp = p.samples.find((x) => x.in.trim() === $('#stdin').value.trim());
    if (smp && !r.tle) $('#rt').innerHTML += norm(r.out) === norm(smp.out) ? '　<span class="pill ok">與範例輸出相同</span>' : '　<span class="pill bad">與範例輸出不同</span>';
  };
  $('#test').onclick = async () => {
    flush(); const lang = $('#lang').value; $('#test').disabled = true;
    const res = await runTests(p, lang, cm.getValue(), (done) => { $('#tres').innerHTML = `<div class="loading"><div class="spin"></div>測試中 ${done}/${p.tests.length}…（超過時間的測資每筆要等 ${LIMIT} 秒）</div>`; }, true);
    const ss = store.get('isession'); ss.tests[k] = res; store.set('isession', ss);
    renderTests(p, res); $('#test').disabled = false;
  };
  $('#save').onclick = () => {
    const ss = flush(); ss.saved[k] = true; store.set('isession', ss); toast(`第 ${k + 1} 題已儲存`);
    $$('.tabs3 .dot')[k].className = 'dot saved';
    if (ss.saved.every(Boolean)) confirmSubmit();
  };
  $('#submitAll').onclick = () => { flush(); confirmSubmit(); };
  $('#dl').onclick = () => downloadDoc(store.get('isession'));
  clearInterval(clockT);
  const tick = () => {
    const ss = store.get('isession'); const el = $('#clock'); if (!el || !ss) return clearInterval(clockT);
    const used = Math.floor((Date.now() - ss.start) / 1000);
    if (ss.mins) { const left = ss.mins * 60 - used; el.textContent = left > 0 ? `剩餘 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '時間到！請送出'; el.className = 'pill ' + (left < 600 ? 'bad' : 'gold'); }
    else el.textContent = `已作答 ${Math.floor(used / 60)} 分`;
  };
  tick(); clockT = setInterval(tick, 1000);
}
async function runTests(p, lang, code, onProg, quick) {
  let done = 0; onProg && onProg(0);
  const rs = await Runner.run(lang, code, p.tests.map((t) => t.in), () => { done++; onProg && onProg(done); }, quick ? 3 : Infinity);
  return rs.map((r, i) => ({ v: verdict(r, p.tests[i].out), out: (r.out || '').slice(0, 4000), err: r.err || '', sec: r.sec || 0, skipped: !!r.skipped }));
}
function scoreOf(p, res) {
  const subs = p.subtasks.map((st, si) => {
    const idx = p.tests.map((t, i) => [t, i]).filter(([t]) => t.sub === si).map(([, i]) => i);
    const pass = idx.filter((i) => res && res[i] && res[i].v === 'AC').length;
    return { score: st.score, desc: st.desc, n: idx.length, pass, got: idx.length ? Math.round((st.score * pass) / idx.length) : 0 };
  });
  return { subs, total: subs.reduce((a, b) => a + b.got, 0) };
}
function renderTests(p, res) {
  const sc = scoreOf(p, res);
  const bad = res.map((r, i) => [r, i]).filter(([r]) => r.v !== 'AC');
  $('#tres').innerHTML = `<div class="row"><span class="stat">${sc.total}</span><span class="muted">/ 100 分</span>${sc.subs.map((s, i) => `<span class="pill ${s.pass === s.n ? 'ok' : 'bad'}">子題 ${i + 1}：${s.pass}/${s.n} 筆，${s.got}/${s.score} 分</span>`).join('')}</div>
    <div class="tests">${res.map((r, i) => `<div class="tbox ${r.v}" title="第 ${i + 1} 筆：${VNAME[r.v]}" data-t="${i}">${r.v === 'AC' ? '✓' : r.v}</div>`).join('')}</div>
    <div class="legend">✓ 正確　WA 答案錯誤　TLE 超過時間　RE 執行錯誤　（點方塊看細節）</div>
    ${res.some((r) => r.skipped) ? '<div class="notice" style="margin-top:8px">已經有 3 筆超過時間，剩下的測資先略過（直接算超時），請先檢查有沒有無窮迴圈或太慢的寫法。最終送出時會全部重新評分。</div>' : ''}
    ${bad.length ? `<p style="margin:8px 0 0"><b>錯誤的測資：</b>${bad.map(([r, i]) => `第 ${i + 1} 筆（子題 ${p.tests[i].sub + 1}，${VNAME[r.v]}）`).join('、')}</p>` : '<p style="color:var(--ok);font-weight:700;margin:8px 0 0">全部通過！🎉</p>'}
    <div id="tdet"></div>`;
  const det = (i) => {
    const r = res[i], t = p.tests[i];
    $('#tdet').innerHTML = `<div style="margin-top:10px"><b>第 ${i + 1} 筆測資（子題 ${t.sub + 1}）：${VNAME[r.v]}</b>　<span class="small muted">${(r.sec * 1000).toFixed(0)} ms</span>
      ${r.err ? `<pre class="plain" style="color:var(--bad)">${esc(r.err)}</pre>` : ''}
      <div class="diff"><div><span class="small muted">輸入（前 800 字）</span><pre>${esc(t.in.slice(0, 800))}</pre></div><div></div>
      <div><span class="small muted">正確輸出</span><pre>${esc(t.out.slice(0, 1500))}</pre></div><div><span class="small muted">你的輸出</span><pre>${esc((r.out || '').slice(0, 1500))}</pre></div></div>
      ${r.v === 'WA' ? `<p class="small">${firstDiff(t.out, r.out)}</p>` : ''}</div>`;
  };
  $$('.tbox').forEach((b) => b.onclick = () => det(+b.dataset.t));
  if (bad.length) det(bad[0][1]);
}
function firstDiff(a, b) {
  const x = norm(a).split('\n'), y = norm(b).split('\n');
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) {
      if (y[i] === undefined) return `👉 第 ${i + 1} 行開始你少輸出了（正確答案共 ${x.length} 行，你只有 ${y.length} 行）。`;
      if (x[i] === undefined) return `👉 你多輸出了第 ${i + 1} 行以後的內容（正確答案只有 ${x.length} 行）。`;
      return `👉 第一個不同在第 ${i + 1} 行：正確是「${esc(x[i].slice(0, 80))}」，你的是「${esc(y[i].slice(0, 80))}」。`;
    }
  }
  return '';
}
function confirmSubmit() {
  const s = store.get('isession');
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="card"><h3>確定最終送出？</h3>
    <p>${s.saved.every(Boolean) ? '三題都已儲存，可以送出了！' : `還有 ${s.saved.filter((x) => !x).length} 題沒按「儲存」，送出時會以目前編輯器裡的程式評分。`}</p>
    <p class="small muted">送出後會用全部測資評分，並分析每題錯在哪裡、該複習什麼。</p>
    <div class="row"><button class="btn gold" id="yes">最終送出</button><button class="btn ghost" id="no">再檢查一下</button></div></div>`;
  document.body.appendChild(m);
  $('#no', m).onclick = () => m.remove();
  $('#yes', m).onclick = async () => {
    $('#yes', m).disabled = true;
    const ss = fillTests(store.get('isession'));
    for (let k = 0; k < 3; k++) {
      const p = ss.probs[k];
      ss.tests[k] = await runTests(p, ss.lang[k], ss.code[k][ss.lang[k]], (d) => { $('.card p', m).innerHTML = `<span class="spin" style="display:inline-block;vertical-align:middle"></span> 評分第 ${k + 1} 題：${d}/${p.tests.length}`; });
    }
    ss.done = true; ss.end = Date.now(); store.set('isession', ss);
    const totals = ss.probs.map((p, k) => scoreOf(p, ss.tests[k]).total), total = totals.reduce((a, b) => a + b, 0);
    const h = store.get('history', []); h.unshift({ type: 'impl', at: Date.now(), level: ss.level, totals, total, grade: implGrade(ss.level, total), titles: ss.probs.map((p) => p.title) }); store.set('history', h.slice(0, 200));
    store.set('ilast', ss);
    m.remove(); clearInterval(clockT); implResult(ss);
  };
}
async function implResult(ss) {
  if (ss.probs.some((p) => !PCACHE[pkey(p)])) { V().innerHTML = loadingHTML('載入題目中…'); await hydrate(ss); } else fillTests(ss);
  const sc = ss.probs.map((p, k) => scoreOf(p, ss.tests[k]));
  const total = sc.reduce((a, b) => a + b.total, 0), g = implGrade(ss.level, total);
  const review = new Set();
  const blocks = ss.probs.map((p, k) => {
    const res = ss.tests[k], cnt = { AC: 0, WA: 0, TLE: 0, RE: 0 }; res.forEach((r) => cnt[r.v]++);
    const tips = [];
    if (cnt.RE) { const e = res.find((r) => r.v === 'RE'); tips.push(`有 ${cnt.RE} 筆<b>執行錯誤</b>：${esc((e.err.trim().split('\n').pop() || '').slice(0, 160))}。常見原因：輸入讀法跟格式不合、串列索引超出範圍、除以 0。→ 複習「${CH.c01}」「${CH.c04}」。`); review.add('c01'); review.add('c04'); }
    if (cnt.TLE) { tips.push(`有 ${cnt.TLE} 筆<b>超過時間</b>：方法太慢或有無窮迴圈。大測資要避免多層迴圈重算，考慮排序、前綴和、字典計數或二分搜。→ 複習「${CH.c08}」「${CH.c10}」。`); review.add('c08'); review.add('c10'); }
    if (cnt.WA) {
      const s1 = sc[k].subs[0];
      tips.push(s1 && s1.pass < s1.n ? `第 1 子題組（${esc(s1.desc)}）就有錯：代表基本規則還沒寫對，先用範例一步一步手算對照。` : `基本情況正確，但一般情況有 ${cnt.WA} 筆答錯：檢查邊界（最小值、最大值、只有 1 個）、輸出格式、排序的先後規則。`);
      (p.meta.chapters || []).forEach((c) => review.add(c));
    }
    if (!tips.length) tips.push('全部正確，做得好！可以試試看更高一級的題本。');
    return `<div class="card" style="margin-top:16px">
      <div class="row"><h3 style="margin:0">第 ${k + 1} 題：${esc(p.title)}</h3><span class="spacer"></span><span class="stat">${sc[k].total}</span><span class="muted">/ 100</span></div>
      <div class="row" style="margin:6px 0">${sc[k].subs.map((s, i) => `<span class="pill ${s.pass === s.n ? 'ok' : 'bad'}">第 ${i + 1} 子題組（${esc(s.desc)}）：${s.pass}/${s.n} 筆 → ${s.got}/${s.score} 分</span>`).join('')}<span class="pill">${ss.lang[k] === 'py' ? 'Python' : 'C++'}</span></div>
      <div class="tests">${res.map((r, i) => `<div class="tbox ${r.v}" title="第 ${i + 1} 筆">${r.v === 'AC' ? '✓' : r.v}</div>`).join('')}</div>
      <h4 style="color:var(--navy)">錯在哪裡、怎麼改</h4><ul>${tips.map((t) => `<li>${t}</li>`).join('')}</ul>
      ${res.some((r) => r.v === 'WA') ? (() => { const i = res.findIndex((r) => r.v === 'WA'); return `<p class="small">第 ${i + 1} 筆測資：${firstDiff(p.tests[i].out, res[i].out)}</p>`; })() : ''}
      <details class="check"><summary>解題重點、常見錯誤與參考解答</summary>
        <p style="white-space:pre-wrap"><b>解題重點：</b>${esc(p.hint)}</p>
        ${(p.pitfalls || []).length ? `<p><b>常見錯誤：</b></p><ul>${p.pitfalls.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <p><b>參考解答（Python）：</b></p>${codeBlock(p.solution_py || '')}
        <p class="small">相關章節：${(p.meta.chapters || []).map((c) => `<a href="#" data-lesson="${c}">${CH[c]}</a>`).join('、')}</p></details></div>`;
  });
  V().innerHTML = `<div class="card">
    <h2>實作題成績｜${LEVEL_NAME[ss.level]}題本</h2>
    <div class="result-big"><div class="ring" style="--p:${Math.round(total / 3)}"><div><div><b>${total}</b><br><span class="small muted">/ 300</span></div></div></div>
      <div><p style="font-size:20px;margin:0">換算 <span class="pill gold" style="font-size:17px">${g} 級分</span></p>
      <p class="muted">${ss.level === '中' ? (total >= 150 ? '已達 150 分＝中級題本最高的 3 級分！' : `距離 150 分（3 級分）還差 ${150 - total} 分。先確保三題的第 1 子題組都拿到。`) : ''}</p>
      <p class="small muted">用時 ${Math.round(((ss.end || Date.now()) - ss.start) / 60000)} 分鐘</p></div></div>
    ${review.size ? `<div class="notice" style="margin-top:12px"><b>建議複習的章節：</b>${[...review].map((c) => `<a href="#" data-lesson="${c}">${CH[c]}</a>`).join('、')}</div>` : ''}
    <div class="row" style="margin-top:14px"><button class="btn gold" id="again">再來三題</button><button class="btn ghost" id="dl2">⬇ 下載本回題目（Word）</button></div></div>${blocks.join('')}`;
  bindLessonLinks();
  $('#again').onclick = () => { store.set('isession', null); views.impl(); };
  $('#dl2').onclick = () => downloadDoc(ss);
}
function downloadDoc(s) {
  const css = `body{font-family:"微軟正黑體","Microsoft JhengHei";font-size:12pt;line-height:1.6} h1{color:#1F3A5F;text-align:center;font-size:18pt}
    h2{color:#1F3A5F;font-size:15pt;border-bottom:2px solid #C9A227;padding-bottom:3pt;page-break-before:always} h2.first{page-break-before:auto}
    h3{color:#1F3A5F;font-size:12.5pt;margin:12pt 0 3pt} p{margin:3pt 0;white-space:pre-wrap} table{border-collapse:collapse;width:100%;margin:6pt 0}
    th{background:#1F3A5F;color:#fff;text-align:left;padding:4pt 6pt;font-size:11pt} td{border:1px solid #9AA8BC;padding:4pt 6pt;vertical-align:top}
    pre{font-family:Consolas,monospace;font-size:10.5pt;margin:0;white-space:pre-wrap}`;
  const body = s.probs.map((p, k) => `<h2 class="${k ? '' : 'first'}">第 ${k + 1} 題　${esc(p.title)}</h2>
    <h3>問題描述</h3><p>${esc(p.desc)}</p><h3>輸入格式</h3><p>${esc(p.input_fmt)}</p><h3>輸出格式</h3><p>${esc(p.output_fmt)}</p>
    ${p.samples.map((sm, i) => `<table><tr><th>範例${'一二三四'[i]}：輸入</th><th>範例${'一二三四'[i]}：正確輸出</th></tr><tr><td><pre>${esc(sm.in)}</pre></td><td><pre>${esc(sm.out)}</pre></td></tr></table>${sm.note ? `<p>範例${'一二三四'[i]}說明：${esc(sm.note)}</p>` : ''}`).join('')}
    <h3>評分說明</h3><p>輸入包含若干筆測試資料，每一筆測試資料的執行時間限制均為 1 秒，依正確通過測資筆數給分。其中：</p>${p.subtasks.map((st, i) => `<p>第 ${i + 1} 子題組 ${st.score} 分：${esc(st.desc)}</p>`).join('')}`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>${css}</style></head><body>
    <h1>APCS 程式實作 ${LEVEL_NAME[s.level]}題本（模擬）</h1><p style="text-align:center">作答時間 120 分鐘・共 3 題・每題 100 分｜莊老數學教室 APCS 特訓站</p>${body}</body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `APCS_${LEVEL_NAME[s.level]}題本_${new Date().toISOString().slice(0, 10)}.doc`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/* ---------------- 觀念學習 ---------------- */
views.learn = (chap) => {
  const L = (window.BUNDLE && BUNDLE.lessons) || {};
  if (chap && L[chap]) return lessonPage(L[chap]);
  V().innerHTML = `<h2>📘 觀念學習</h2><p class="muted">從第 1 章照順序讀最穩；觀念題或實作題分析出弱點時，也可以直接點進來。中級題本重點是第 1～10 章。</p>
    <div class="grid g3">${Object.keys(CH).map((c, i) => {
      const l = L[c];
      return `<div class="card feature chap" data-c="${c}"><div class="n">${String(i + 1).padStart(2, '0')}</div><div><b>${CH[c]}</b><br><span class="small muted">${l ? `${l.items.length} 個觀念・${esc(l.goal || '')}` : '製作中'}</span></div></div>`;
    }).join('')}</div>`;
  $$('.chap').forEach((d) => d.onclick = () => { if (L[d.dataset.c]) go('learn', d.dataset.c); else toast('這章還在製作中'); });
};
function lessonPage(l) {
  const keys = Object.keys(CH), i = keys.indexOf(l.id);
  V().innerHTML = `<div class="row"><button class="btn ghost sm" id="back">← 章節列表</button><span class="spacer"></span>
      ${i > 0 ? `<button class="btn ghost sm" data-c="${keys[i - 1]}">← ${CH[keys[i - 1]]}</button>` : ''}${i < keys.length - 1 ? `<button class="btn ghost sm" data-c="${keys[i + 1]}">${CH[keys[i + 1]]} →</button>` : ''}</div>
    <div class="hero" style="margin:14px 0 18px;padding:24px 28px"><span class="pill gold">第 ${i + 1} 章</span><h1 style="font-size:26px">${esc(l.title)}</h1><p>${esc(l.goal || '')}</p>
      <div class="row">${l.items.map((it, j) => `<a href="#it${j}" class="pill" style="text-decoration:none">${j + 1}. ${esc(it.title)}</a>`).join('')}</div></div>
    ${l.items.map((it, j) => `<div class="card lesson-item" id="it${j}">
      <h3><span class="num">${j + 1}</span>${esc(it.title)}</h3>
      ${it.analogy ? `<div class="box analogy"><b class="lab">💡 想像一下</b>${esc(it.analogy)}</div>` : ''}
      ${it.explain ? `<p style="white-space:pre-wrap">${esc(it.explain)}</p>` : ''}
      ${it.syntax ? `<div class="small muted" style="font-weight:700">語法</div>${codeBlock(it.syntax)}` : ''}
      ${it.example ? `<div class="ex3"><div><div class="lab">範例程式</div>${codeBlock(it.example.code)}</div>
        <div><div class="lab">輸入範例</div><pre class="plain">${esc(it.example.input || '（不需輸入）')}</pre></div>
        <div><div class="lab">輸出範例</div><pre class="plain">${esc(it.example.output)}</pre><button class="btn sm ghost tryrun" data-j="${j}">▶ 在網頁上執行</button><pre class="plain tryout" style="display:none"></pre></div></div>` : ''}
      ${it.when ? `<div class="box when"><b class="lab">✅ 什麼時候用</b>${esc(it.when)}</div>` : ''}
      ${(it.pitfalls || []).length ? `<div class="box pit"><b class="lab">⚠ 常見錯誤</b>${it.pitfalls.map((x) => '・' + esc(x)).join('\n')}</div>` : ''}
      ${it.check ? `<details class="check"><summary>小測驗：${esc(it.check.q).split('\n')[0]}</summary><div style="white-space:pre-wrap;margin-top:6px">${esc(it.check.q)}</div><div class="explain">${esc(it.check.a)}</div></details>` : ''}
    </div>`).join('')}`;
  $('#back').onclick = () => go('learn');
  $$('[data-c]').forEach((b) => b.onclick = () => go('learn', b.dataset.c));
  $$('.tryrun').forEach((b) => b.onclick = async () => {
    const it = l.items[+b.dataset.j], out = b.nextElementSibling;
    out.style.display = 'block'; out.textContent = Runner.py ? '執行中…' : ENGINE_NOTE;
    const [r] = await Runner.run('py', it.example.code, [it.example.input || '']);
    out.textContent = r.tle ? '超時' : (r.out + (r.err ? '\n' + r.err : ''));
  });
}

/* ---------------- 我的紀錄 ---------------- */
views.record = () => {
  const h = store.get('history', []);
  const last = store.get('ilast', null);
  V().innerHTML = `<div class="card"><div class="row"><h2 style="margin:0">📈 我的紀錄</h2><span class="spacer"></span>${last ? '<button class="btn ghost sm" id="lastR">看上一回實作分析</button>' : ''}</div>
    <p class="muted small">紀錄只存在這台裝置的瀏覽器裡（換電腦或清除瀏覽資料就會不見）。</p>
    ${h.length ? `<table class="list"><tr><th>時間</th><th>類型</th><th>內容</th><th>分數</th><th>級分</th></tr>${h.map((x) => `<tr><td>${new Date(x.at).toLocaleString()}</td>
      <td>${x.type === 'reading' ? '觀念題' : '實作・' + LEVEL_NAME[x.level]}</td>
      <td class="small">${x.type === 'reading' ? `${x.n} 題，答對 ${x.ok}（目標 ${x.target} 級分）` : esc((x.titles || []).join('／'))}</td>
      <td><b>${x.type === 'reading' ? x.score + ' / 100' : x.total + ' / 300'}</b>${x.type === 'impl' ? `<br><span class="small muted">${x.totals.join('＋')}</span>` : ''}</td><td><span class="pill gold">${x.grade}</span></td></tr>`).join('')}</table>` : '<p>還沒有紀錄，先去練一回吧！</p>'}</div>`;
  const b = $('#lastR'); if (b) b.onclick = () => implResult(last);
};

/* ---------------- 啟動 ---------------- */
const start = (location.hash || '#home').slice(1);
go(views[start] ? start : 'home');
