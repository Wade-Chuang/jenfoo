# -*- coding: utf-8 -*-
"""讓 Google Fonts 的樣式表不要擋住畫面繪製。

為什麼要這支：
  全站 142 頁用 <link rel="stylesheet"> 載 Noto Sans TC + Noto Serif TC。
  那個 css2 樣式表光自己就 173 KB（中文字型要展開上百個 unicode 子集），
  而樣式表會擋住繪製——學生在手機上點 LINE 連結進來，要等它下載完
  才看得到任何東西。實測首頁的字型相關下載總共 2.8 MB（42 個檔）。

  改成 media="print" + onload 切回 all，瀏覽器就當成非必要樣式先放著，
  畫面立刻用系統字型畫出來，字型到了再換上去。
  **最終外觀完全一樣**：原本就有 display=swap，字型晚到本來就會先用備用字型。
  差別只在「先看到東西」還是「先看到白畫面」。
  關掉 JavaScript 的瀏覽器吃不到 onload，所以補一份 <noscript>。

兩個踩過的坑（第一版都中了）：
  ・站上有兩種屬性順序：`<link rel=… href=…>`（15 頁）和 `<link href=… rel=…>`（127 頁），
    只配其中一種會漏掉大部分頁面。
  ・重跑時會把 <noscript> 裡那份再包一次，變成巢狀。所以改成先看整頁有沒有
    處理過的記號（onload="this.media），有就整頁跳過。

落點那幾頁（luodian/、explore/）本來就只用系統字型，沒有這個問題，不會被動到。

跑法（在 jenfoo/ 底下）：python tools/optimize_fonts.py
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

MARK = 'onload="this.media'          # 處理過的記號
FONT = re.compile(
    r'<link\s+(?:rel="stylesheet"\s+href="(https://fonts\.googleapis\.com/css2[^"]*)"'
    r'|href="(https://fonts\.googleapis\.com/css2[^"]*)"\s+rel="stylesheet")\s*/?>')
PRECONNECT = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
              '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n')


def pages():
    out = []
    for r, dirs, fs in os.walk("."):
        dirs[:] = [d for d in dirs if d != ".git"]
        for f in fs:
            if f.endswith(".html"):
                out.append(os.path.join(r, f).replace(os.sep, "/")[2:])
    return sorted(out)


def main():
    done = already = pre_added = nolink = 0
    for p in pages():
        s = io.open(p, encoding="utf-8", errors="replace").read()
        if "fonts.googleapis.com/css2" not in s:
            continue
        if MARK in s:
            already += 1
            continue
        orig = s

        m = FONT.search(s)
        if not m:
            nolink += 1
            print("   ！配不到 link 標籤：", p)
        else:
            href = m.group(1) or m.group(2)
            s = s[:m.start()] + (
                '<link rel="stylesheet" href="%s" media="print" onload="this.media=\'all\'">\n'
                '<noscript><link rel="stylesheet" href="%s"></noscript>' % (href, href)
            ) + s[m.end():]
            done += 1

        if "fonts.gstatic.com" not in s:
            i = s.find("<link")
            if i < 0:
                i = s.find("<head")
                i = s.find(">", i) + 1 if i >= 0 else 0
            s = s[:i] + PRECONNECT + s[i:]
            pre_added += 1

        if s != orig:
            io.open(p, "w", encoding="utf-8", newline="").write(s)

    print("改成不擋畫面：%d 頁" % done)
    print("之前已經改過、跳過：%d 頁" % already)
    print("補上 preconnect：%d 頁" % pre_added)
    if nolink:
        print("配不到標籤、要手動看：%d 頁" % nolink)


main()
