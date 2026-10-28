# -*- coding: utf-8 -*-
"""產生 sitemap.xml 與 robots.txt（給 Google 用的網站地圖）。

用法（在 jenfoo 資料夾下）：
    python tools/build_sitemap.py

規則：
  · 掃全站 *.html，排除 noindex 的頁、以及 demo/ 試玩頁
  · 每頁的 lastmod 取該檔案最後一次 commit 的日期（沒有 git 就用檔案時間）
  · 首頁 1.0；主要分頁 0.8；教材內頁（漫畫各話等）0.5
  · 目錄下的 index.html 會寫成乾淨網址（例如 /practice/）
新增頁面後重跑這支即可，不需要手動維護清單。
"""
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://wade-chuang.github.io/jenfoo/"
SKIP_DIRS = {".git", "img", "assets", "pdf", "data", "tools"}
SKIP_FILES = {"count.html"}
TOP = 0.8          # 各專區首頁
INNER = 0.5        # 教材內頁


def git_date(path):
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", path],
                             cwd=ROOT, capture_output=True, text=True, timeout=20)
        d = out.stdout.strip()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d):
            return d
    except Exception:
        pass
    ts = os.path.getmtime(os.path.join(ROOT, path))
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d")


def pages():
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fn in filenames:
            if not fn.endswith(".html") or fn in SKIP_FILES:
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT).replace("\\", "/")
            html = open(full, encoding="utf-8", errors="ignore").read(4000)
            if re.search(r'name=["\']robots["\'][^>]*noindex', html):
                continue
            if rel == "index.html":
                url, pri = BASE, 1.0
            elif fn == "index.html":
                url, pri = BASE + rel[:-len("index.html")], TOP
            else:
                url, pri = BASE + rel, INNER
            out.append((url, git_date(rel), pri))
    out.sort(key=lambda r: (-r[2], r[0]))
    return out


def main():
    rows = pages()
    xml = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">'.replace("sitemap.org", "sitemaps.org")]
    for url, date, pri in rows:
        xml += ["  <url>",
                "    <loc>%s</loc>" % url,
                "    <lastmod>%s</lastmod>" % date,
                "    <priority>%.1f</priority>" % pri,
                "  </url>"]
    xml.append("</urlset>")
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n").write("\n".join(xml) + "\n")

    robots = ["User-agent: *",
              "Allow: /",
              "",
              "# 瀏覽計數頁不需要收錄",
              "Disallow: /count.html",
              "",
              "Sitemap: " + BASE + "sitemap.xml",
              ""]
    open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8", newline="\n").write("\n".join(robots))

    print("sitemap.xml：%d 頁（首頁 1 頁、專區 %d 頁、內頁 %d 頁）"
          % (len(rows), sum(1 for r in rows if r[2] == TOP), sum(1 for r in rows if r[2] == INNER)))
    print("robots.txt：已指向 " + BASE + "sitemap.xml")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
