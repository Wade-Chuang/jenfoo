/* 站內搜尋。只要在頁面尾端放這一行就會自己長出來，不必改版面：
     <script src="（相對路徑）assets/search.js" defer></script>
   它會在 header.top 的選單旁邊加一顆放大鏡，點了開全螢幕搜尋框。
   樣式也由這支自己注入，不碰 site.css，子頁有自己的 CSS 也不會打架。

   索引 assets/search-index.json 是第一次打開搜尋才下載（68KB），
   不會拖慢首頁。索引怎麼產生看 tools/build_search.py。 */
(function () {
  "use strict";
  var me = document.currentScript;
  if (!me) return;
  // 站根路徑從自己的 src 推回去，子頁、子子頁都不用各自設定
  var BASE = me.src.replace(/assets\/search\.js.*$/, "");
  var DATA = null, LOADING = null, LAST = "";

  var CSS = '' +
    '.jsx-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(0,0,0,.14);background:#fff;' +
    'color:#16223a;border-radius:999px;padding:7px 14px;font-family:inherit;font-size:14px;font-weight:500;line-height:1;cursor:pointer}' +
    '.jsx-btn:hover{border-color:#a8822a;color:#a8822a}' +
    '.jsx-btn svg{width:15px;height:15px}' +
    '@media (max-width:720px){.jsx-btn .jsx-btn-t{display:none}.jsx-btn{padding:7px 10px}}' +
    '.jsx-wrap{position:fixed;inset:0;z-index:9999;display:none}' +
    '.jsx-wrap.on{display:block}' +
    '.jsx-bg{position:absolute;inset:0;background:rgba(10,16,28,.55)}' +
    '.jsx-box{position:relative;max-width:680px;margin:8vh auto 0;background:#fff;border-radius:18px;overflow:hidden;' +
    'box-shadow:0 30px 70px -20px rgba(0,0,0,.5);font:400 15px/1.5 system-ui,"Noto Sans TC",sans-serif;color:#16223a}' +
    '@media (max-width:720px){.jsx-box{margin:0;max-width:none;height:100%;border-radius:0}}' +
    '.jsx-top{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #e8e6e0}' +
    '.jsx-top svg{width:18px;height:18px;flex:none;color:#8d9099}' +
    '.jsx-in{flex:1;border:0;outline:0;font-family:inherit;font-size:17px;font-weight:500;line-height:1.4;color:inherit;background:none;min-width:0}' +
    '.jsx-x{border:0;background:#f1efea;color:#5a6070;border-radius:8px;padding:5px 9px;font-family:inherit;font-size:13px;font-weight:500;line-height:1;cursor:pointer}' +
    '.jsx-list{max-height:62vh;overflow:auto;-webkit-overflow-scrolling:touch}' +
    '@media (max-width:720px){.jsx-list{max-height:none;height:calc(100% - 108px)}}' +
    '.jsx-it{display:block;padding:11px 16px;text-decoration:none;color:inherit;border-bottom:1px solid #f2f0ec}' +
    '.jsx-it:hover,.jsx-it.sel{background:#f7f4ec}' +
    '.jsx-it b{display:block;font-family:inherit;font-size:15px;font-weight:700;line-height:1.4}' +
    '.jsx-it b mark{background:#ffe9a8;color:inherit;padding:0 1px;border-radius:3px}' +
    '.jsx-it .jsx-s{font-size:12px;color:#a8822a;font-weight:700}' +
    '.jsx-it .jsx-d{font-size:13px;color:#5a6070;margin-top:2px;' +
    'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.jsx-empty{padding:28px 16px;text-align:center;color:#5a6070;font-size:14px}' +
    '.jsx-empty a{color:#a8822a}' +
    '.jsx-foot{padding:9px 16px;border-top:1px solid #e8e6e0;font-size:12px;color:#8d9099;display:flex;' +
    'justify-content:space-between;gap:10px;flex-wrap:wrap}' +
    '.jsx-tags{padding:12px 16px 16px}' +
    '.jsx-tags p{margin:0 0 8px;font-size:12px;color:#8d9099}' +
    '.jsx-tags button{border:1px solid #e3ded2;background:#faf8f3;border-radius:999px;padding:6px 12px;margin:0 6px 6px 0;' +
    'font-family:inherit;font-size:13px;font-weight:500;line-height:1;color:#16223a;cursor:pointer}' +
    '.jsx-tags button:hover{border-color:#a8822a;color:#a8822a}';

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  var HOT = ["落點分析", "備審", "APCS", "三角函數", "因式分解", "會考真題", "練習卷", "段考重點"];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // 中文沒有空白分詞，所以用「每個詞都要出現」的子字串比對，不切詞
  function terms(q) {
    return q.toLowerCase().replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  }

  function score(row, ts) {
    var t = row.t.toLowerCase(), s = (row.s || "").toLowerCase(),
        d = (row.d || "").toLowerCase(), k = (row.k || "").toLowerCase();
    var sum = 0;
    for (var i = 0; i < ts.length; i++) {
      var q = ts[i], p = t.indexOf(q);
      if (p === 0) sum += 100;              // 標題開頭最準
      else if (p > 0) sum += 70;
      else if (s.indexOf(q) >= 0) sum += 40;
      else if (k.indexOf(q) >= 0) sum += 30;
      else if (d.indexOf(q) >= 0) sum += 15;
      else return -1;                       // 有一個詞完全沒中就不算
    }
    return sum + (row.w || 0);
  }

  function search(q, limit) {
    var ts = terms(q);
    if (!ts.length || !DATA) return [];
    var out = [];
    for (var i = 0; i < DATA.length; i++) {
      var sc = score(DATA[i], ts);
      if (sc >= 0) out.push([sc, i, DATA[i]]);
    }
    out.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    return out.slice(0, limit || 30).map(function (x) { return x[2]; });
  }

  function hl(text, ts) {
    var h = esc(text);
    ts.forEach(function (q) {
      if (!q) return;
      var i = h.toLowerCase().indexOf(q.toLowerCase());
      if (i >= 0) h = h.slice(0, i) + "<mark>" + h.slice(i, i + q.length) + "</mark>" + h.slice(i + q.length);
    });
    return h;
  }

  function href(u) {
    return /^https?:/.test(u) ? u : BASE + u;
  }

  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (!LOADING) {
      LOADING = fetch(BASE + "assets/search-index.json")
        .then(function (r) { return r.json(); })
        .then(function (j) { DATA = j.d; return DATA; })
        .catch(function () { DATA = []; return DATA; });
    }
    return LOADING;
  }

  // ── 介面
  var st = document.createElement("style"); st.textContent = CSS;
  document.head.appendChild(st);

  var wrap = document.createElement("div");
  wrap.className = "jsx-wrap";
  wrap.innerHTML =
    '<div class="jsx-bg"></div><div class="jsx-box" role="dialog" aria-modal="true" aria-label="站內搜尋">' +
    '<div class="jsx-top">' + ICON +
    '<input class="jsx-in" type="search" placeholder="搜尋單元、真題、講義、工具…" aria-label="搜尋站內" autocomplete="off">' +
    '<button class="jsx-x" type="button">關閉</button></div>' +
    '<div class="jsx-list"></div>' +
    '<div class="jsx-foot"><span>↑↓ 選擇・Enter 開啟・Esc 關閉</span><span>正賦文理站內搜尋</span></div></div>';
  document.body.appendChild(wrap);

  var input = wrap.querySelector(".jsx-in"),
      list = wrap.querySelector(".jsx-list"),
      sel = 0;

  function tagsHTML() {
    return '<div class="jsx-tags"><p>大家在找：</p>' +
      HOT.map(function (h) { return '<button type="button" data-q="' + esc(h) + '">' + esc(h) + "</button>"; }).join("") +
      "</div>";
  }

  function render() {
    var q = input.value.trim();
    LAST = q;
    if (!q) { list.innerHTML = tagsHTML(); sel = 0; return; }
    var ts = terms(q), res = search(q);
    if (!res.length) {
      list.innerHTML = '<div class="jsx-empty">找不到「' + esc(q) + '」。<br>' +
        '換個說法試試，或看 <a href="' + BASE + 'learn/">學習中心</a> 的完整清單。</div>';
      return;
    }
    sel = 0;
    list.innerHTML = res.map(function (r, i) {
      return '<a class="jsx-it' + (i === 0 ? " sel" : "") + '" href="' + esc(href(r.u)) + '"' +
        (/^https?:/.test(r.u) ? ' target="_blank" rel="noopener"' : "") + ">" +
        '<span class="jsx-s">' + esc(r.s) + "</span>" +
        "<b>" + hl(r.t, ts) + "</b>" +
        '<span class="jsx-d">' + esc(r.d) + "</span></a>";
    }).join("");
  }

  function open() {
    wrap.classList.add("on");
    document.documentElement.style.overflow = "hidden";
    load().then(function () { if (input.value.trim() !== LAST) render(); });
    render();
    setTimeout(function () { input.focus(); }, 30);
  }
  function close() {
    wrap.classList.remove("on");
    document.documentElement.style.overflow = "";
  }

  input.addEventListener("input", function () {
    load().then(render);
    if (DATA) render();
  });
  input.addEventListener("keydown", function (e) {
    var items = list.querySelectorAll(".jsx-it");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!items.length) return;
      e.preventDefault();
      items[sel] && items[sel].classList.remove("sel");
      sel = (sel + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
      items[sel].classList.add("sel");
      items[sel].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      if (items[sel]) { e.preventDefault(); items[sel].click(); }
    } else if (e.key === "Escape") {
      close();
    }
  });
  list.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-q]");
    if (b) { input.value = b.dataset.q; load().then(render); if (DATA) render(); input.focus(); }
  });
  wrap.querySelector(".jsx-bg").addEventListener("click", close);
  wrap.querySelector(".jsx-x").addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open(); }
  });

  // 放大鏡放進站內選單；子頁的 header 結構不一樣時退而求其次掛在 header 最後
  var cta = document.querySelector("header.top .wrap .top-cta");
  var host = cta ||
             document.querySelector("header.top .wrap nav") ||
             document.querySelector("header.top .wrap") ||
             document.querySelector("header .wrap") ||
             document.querySelector("header");
  if (host) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jsx-btn";
    btn.setAttribute("aria-label", "搜尋站內");
    btn.innerHTML = ICON + '<span class="jsx-btn-t">搜尋</span>';
    btn.addEventListener("click", open);
    // 有 .top-cta 的頁面放在「免費練習」左邊；其他頁面的 header 結構不一定，
    // 一律接在最後面，不然會跑到 logo 前面去。
    var brand = document.querySelector("header .brand");
    if (cta) cta.insertBefore(btn, cta.firstChild);
    else if (brand && brand.tagName === "DIV") {
      // 落點分析那種「整個 header 就是一張大 hero」的頁面，接在品牌那一行後面，
      // 不然會掉到標題與徽章中間，看起來像誤觸的按鈕。
      btn.style.marginLeft = "10px";
      btn.style.verticalAlign = "middle";
      brand.appendChild(btn);
    } else host.appendChild(btn);
  }

  // 其他地方想開搜尋：連結寫 href="...#search" 或加 class="js-open-search"
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href$="#search"], .js-open-search');
    if (a) { e.preventDefault(); open(); }
  });
  if (location.hash === "#search") open();
  window.jenfooSearch = { open: open, close: close };
})();
