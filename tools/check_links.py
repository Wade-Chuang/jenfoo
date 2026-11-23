# -*- coding: utf-8 -*-
"""全站內部連結檢查：抓真的連到不存在檔案的 href/src。

為什麼要寫成一支：
  147 頁互相連來連去（關聯資源區塊、學習中心、麵包屑），手改一定會漏。
  改完網址或搬資料夾之後跑這支，比等學生回報快。

容易誤判、這裡特別處理掉的五種：
  ・`../` 從子資料夾回到站根 → 要對應到根目錄的 index.html
  ・`/jenfoo/…` 絕對路徑 → 線上是掛在 /jenfoo/ 下，要先把前綴拿掉
  ・JS 範本字串裡的 `${…}` → 那是程式碼不是連結
  ・`<script>` 裡的東西 → `R.src='mix'` 這種賦值、`src="img/'+it.img` 這種組字串
    都會被誤當成連結，整個 script／style 區塊先拿掉再掃
  ・資料夾連結 → 看它有沒有 index.html

跑法（在 jenfoo/ 底下）：python tools/check_links.py
"""
import io
import os
import re
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
BASE_PREFIX = "/jenfoo/"          # GitHub Pages 的掛載路徑

files, pages = set(), []
for r, dirs, fs in os.walk("."):
    dirs[:] = [d for d in dirs if d != ".git"]
    for f in fs:
        p = os.path.join(r, f).replace(os.sep, "/")[2:]
        files.add(p)
        if f.endswith(".html"):
            pages.append(p)

dirs_with_index = {p[:-len("index.html")].rstrip("/") for p in files if p.endswith("index.html")}


def resolve(src_page, url):
    """回傳 (實際路徑, 是否存在)。站外或非連結回 None。"""
    if re.match(r"^(https?:|mailto:|tel:|data:|javascript:|#|//)", url):
        return None
    if "${" in url or "{{" in url:          # JS 範本字串，不是真的連結
        return None
    path = url.split("#")[0].split("?")[0]
    if not path:
        return None
    if path.startswith(BASE_PREFIX):        # 線上的絕對路徑
        tgt = path[len(BASE_PREFIX):]
    elif path.startswith("/"):
        tgt = path.lstrip("/")
    else:
        tgt = os.path.normpath(os.path.join(os.path.dirname(src_page), path)).replace(os.sep, "/")
    if tgt in (".", ""):                    # 指到站根
        tgt = "index.html"
    if tgt.startswith("../"):               # 真的跳出站外了
        return (tgt, False)
    if tgt in files:
        return (tgt, True)
    folder = tgt.rstrip("/")
    if folder in dirs_with_index or (folder + "/index.html") in files:
        return (tgt, True)
    return (tgt, False)


def main():
    pat = re.compile(r'(?:href|src)=["\']([^"\']+)["\']')
    strip = re.compile('<(script|style)[^>]*>.*?</(?:script|style)>', re.S | re.I)
    bad = defaultdict(set)
    checked = 0
    for p in pages:
        s = strip.sub(" ", io.open(p, encoding="utf-8", errors="replace").read())
        for u in pat.findall(s):
            r = resolve(p, u)
            if r is None:
                continue
            checked += 1
            if not r[1]:
                bad[p].add((u, r[0]))
    total = sum(len(v) for v in bad.values())
    print("%d 頁、%d 條內部連結，壞掉 %d 條" % (len(pages), checked, total))
    for p in sorted(bad):
        print("\n  " + p)
        for u, tgt in sorted(bad[p]):
            print("     %-44s → %s" % (u[:44], tgt))
    if not total:
        print("\n全部都連得到。")


main()
