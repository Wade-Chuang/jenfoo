# -*- coding: utf-8 -*-
"""把網站分析的程式碼裝到每一個網頁（可重複執行，裝過的不會重複裝）。

用法：
    python tools/add_analytics.py            # 裝到這個資料夾底下所有 .html
    python tools/add_analytics.py <資料夾>    # 裝到指定資料夾

裝的是：
  1. Google Analytics（GA4，編號 G-NSNBQNLSDN，資源「正賦＋啟賦」）
  2. Cloudflare Web Analytics（TOKEN 填好才會裝；沒填就只裝 GA）

重新產生網頁之後（跑過 build.py 之類的）要再跑一次這支，新頁面才會有追蹤碼。
"""
import os
import re
import sys

GA_ID = "G-NSNBQNLSDN"
CF_TOKEN = ""          # Cloudflare Web Analytics 的 token，拿到再填

GA = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '%s');
</script>
""" % (GA_ID, GA_ID)

CF = """<!-- Cloudflare Web Analytics -->
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "%s"}'></script>
"""


def snippet():
    s = GA
    if CF_TOKEN:
        s += CF % CF_TOKEN
    return s


def main(root):
    add = snippet()
    done = skip = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != ".git" and not d.startswith(".")]
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            p = os.path.join(dirpath, fn)
            html = open(p, encoding="utf-8", errors="ignore").read()
            if GA_ID in html and (not CF_TOKEN or CF_TOKEN in html):
                skip += 1
                continue
            if GA_ID in html and CF_TOKEN and CF_TOKEN not in html:   # 只補 Cloudflare
                html = html.replace(GA, GA + CF % CF_TOKEN, 1)
            else:
                m = re.search(r"<head[^>]*>", html, re.I)
                if not m:
                    print("  跳過（沒有 head）：", os.path.relpath(p, root))
                    skip += 1
                    continue
                html = html[:m.end()] + "\n" + add + html[m.end():]
            open(p, "w", encoding="utf-8", newline="").write(html)
            done += 1
    print("裝好 %d 頁，原本就有的 %d 頁" % (done, skip))
    print("GA：%s　Cloudflare：%s" % (GA_ID, CF_TOKEN or "（尚未設定）"))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(os.path.abspath(sys.argv[1]) if len(sys.argv) > 1
         else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
