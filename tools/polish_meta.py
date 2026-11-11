# -*- coding: utf-8 -*-
"""把每一頁缺的基本標籤補齊（可重複執行，有的不會重複加）。

跑過任何一支 build 之後跑這一支就好，它取代了只裝分析碼的 add_analytics.py。

會補的東西：
  1. Google Analytics（GA4 G-NSNBQNLSDN）—— 沒裝的頁面等於完全沒有數據
  2. og:image / og:url / og:title / og:description —— LINE、FB 貼連結才有預覽圖
  3. canonical —— 告訴 Google 哪一個網址才是正本，避免同一頁被當成好幾頁
  4. viewport、theme-color、referrer —— 手機顯示、瀏覽器上緣顏色、瀏覽計數

用法：
    python tools/polish_meta.py          # 檢查並補齊全站
    python tools/polish_meta.py --dry    # 只看會改哪些，不真的改
"""
import os
import re
import sys

GA_ID = "G-NSNBQNLSDN"
SITE = "https://wade-chuang.github.io/jenfoo/"
BRAND = "正賦文理短期補習班"
THEME = "#1b2430"            # CI 深藍，手機瀏覽器上緣會跟著變色
DEFAULT_OG = SITE + "img/og.jpg"

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

GA = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '%s');
</script>
""" % (GA_ID, GA_ID)


def page_url(rel):
    """檔案路徑 → 正式網址。資料夾的 index.html 用資料夾網址，不要帶檔名。"""
    rel = rel.replace(os.sep, "/")
    if rel == "index.html":
        return SITE
    if rel.endswith("/index.html"):
        return SITE + rel[:-len("index.html")]
    return SITE + rel


def og_image(rel):
    """國中社會漫畫每一冊有自己的預覽圖，其他用官網通用圖。"""
    rel = rel.replace(os.sep, "/")
    m = re.match(r"social/([a-z]{3}\d[ab])/", rel)
    if m:
        p = os.path.join(ROOT, "img", "og", "og-%s.jpg" % m.group(1))
        if os.path.exists(p):
            return SITE + "img/og/og-%s.jpg" % m.group(1)
    if rel == "social/index.html" and os.path.exists(
            os.path.join(ROOT, "img", "og", "og-social.jpg")):
        return SITE + "img/og/og-social.jpg"
    return DEFAULT_OG


def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def grab(html, pattern):
    m = re.search(pattern, html, re.I | re.S)
    return m.group(1).strip() if m else ""


def fix(path):
    rel = os.path.relpath(path, ROOT)
    html = open(path, encoding="utf-8", errors="ignore").read()
    added = []

    # 1. 分析碼：接在 <head> 後面，越早越好
    if GA_ID not in html:
        m = re.search(r"<head[^>]*>", html, re.I)
        if not m:
            return rel, ["沒有 head，跳過"], html, False
        html = html[:m.end()] + "\n" + GA + html[m.end():]
        added.append("GA")

    title = grab(html, r"<title>(.*?)</title>")
    desc = grab(html, r'<meta\s+name="description"\s+content="(.*?)"')
    url = page_url(rel)
    img = og_image(rel)

    # 改過標題或說明之後，分享預覽的 og 也要跟著換，否則 LINE 上還是舊的
    for prop, want in (("og:title", title), ("og:description", desc)):
        if not want:
            continue
        pat = r'(<meta\s+property="%s"\s+content=")(.*?)(")' % prop
        m = re.search(pat, html, re.I | re.S)
        if m and m.group(2) != esc(want):
            html = html[:m.start()] + m.group(1) + esc(want) + m.group(3) + html[m.end():]
            added.append(prop + "（更新）")

    # 2. head 裡缺什麼就補什麼
    block = []
    def need(mark, line):
        if mark not in html:
            block.append(line)
            added.append(mark.split('"')[1] if '"' in mark else mark)

    need('name="viewport"',
         '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">')
    need('name="referrer"',
         '<meta name="referrer" content="no-referrer-when-downgrade">')
    need('name="theme-color"', '<meta name="theme-color" content="%s">' % THEME)
    need('property="og:type"', '<meta property="og:type" content="website">')
    need('property="og:site_name"',
         '<meta property="og:site_name" content="%s">' % BRAND)
    if title:
        need('property="og:title"',
             '<meta property="og:title" content="%s">' % esc(title))
    if desc:
        need('property="og:description"',
             '<meta property="og:description" content="%s">' % esc(desc))
    need('property="og:image"',
         '<meta property="og:image" content="%s">\n'
         '<meta property="og:image:width" content="1200">'
         '<meta property="og:image:height" content="630">' % img)
    # noindex 的頁面（404）不給 canonical／og:url，免得又叫 Google 不要收錄、又指一個正本
    if 'name="robots"' not in html or "noindex" not in html:
        need('property="og:url"', '<meta property="og:url" content="%s">' % url)
        need('rel="canonical"', '<link rel="canonical" href="%s">' % url)
    need('property="og:locale"', '<meta property="og:locale" content="zh_TW">')
    need('name="twitter:card"',
         '<meta name="twitter:card" content="summary_large_image">')

    if block:
        # 有些頁面沒寫 </head>（瀏覽器容忍，但要有個插入點），
        # 就退而求其次插在 <body> 或第一個 <style> 之前。
        m = None
        for pat in (r"</head>", r"<body\b", r"<style\b"):
            m = re.search(pat, html, re.I)
            if m:
                break
        if not m:
            return rel, ["找不到 head 結尾，跳過"], html, False
        html = html[:m.start()] + "\n".join(block) + "\n" + html[m.start():]

    return rel, added, html, bool(added)


def main(dry):
    changed = clean = 0
    counts = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for fn in sorted(filenames):
            if not fn.endswith(".html"):
                continue
            p = os.path.join(dirpath, fn)
            rel, added, html, dirty = fix(p)
            if not dirty:
                clean += 1
                continue
            for a in added:
                counts[a] = counts.get(a, 0) + 1
            if not dry:
                open(p, "w", encoding="utf-8", newline="").write(html)
            changed += 1
            if changed <= 12:
                print("  %-34s ← %s" % (rel, "、".join(added)))
    if changed > 12:
        print("  …另外還有 %d 頁" % (changed - 12))
    print()
    print("補過 %d 頁，本來就齊全的 %d 頁%s" % (changed, clean, "（--dry 沒有真的寫入）" if dry else ""))
    if counts:
        print("\n補了什麼：")
        for k, v in sorted(counts.items(), key=lambda kv: -kv[1]):
            print("  %-22s %d 頁" % (k, v))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main("--dry" in sys.argv)
