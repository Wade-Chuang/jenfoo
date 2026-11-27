# -*- coding: utf-8 -*-
"""在各工具頁放一張「加 LINE 傳關鍵字領免費講義」的卡片。

為什麼要這支：
  學習中心 learn/#handouts 早就有這張卡（11/13 上線，莊老師看過），但**只有那一頁有**。
  學生從 IG 或 LINE 連結進來，落在落點分析、練習站、技高站這些工具頁，
  整頁沒有任何一個地方可以領講義，也就沒有理由加 LINE。
  IG 39.7 萬觀看換到 0 私訊，缺的就是這一步。

和學習中心那張的差別：
  ・那張是整條 band ＋ 180px QR，工具頁放不下也太搶戲，這張是窄卡
  ・關鍵字依該頁的對象篩選——高三生不需要看到「國中圖解」
  ・自己帶樣式（各子站都沒有載 site.css），用 <!--handout--> 包起來，重跑整塊換掉

關鍵字沿用學習中心那張已經上線的那組，沒有自己發明新的——
寫錯關鍵字學生傳了沒反應，比沒做更糟。

跑法（在 jenfoo/ 底下）：python tools/build_handout_card.py
"""
import io
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

LINE_URL = "https://line.me/R/ti/p/@chuanglaomath"
LINE_ID = "@chuanglaomath"

# 關鍵字 → 一句話說明（和 learn/#handouts 那張一致）
KW = {
    "國中生": "國中數學 一到三冊重點整理（每單元附影片 QR）",
    "國中圖解": "國中數學圖解筆記 試閱版",
    "高中生": "學測數學圖解筆記 試閱版（數A／數B）",
    "總複習A": "學測數A 第一到三冊總複習（講義＋模擬卷＋詳解）",
    "總複習B": "學測數B 第一到三冊總複習（講義＋模擬卷＋詳解）",
    "學測自然": "學測自然重點整理（57 頁）",
    "技高生": "統測數學 A・B・C 真題線上練習",
    "社會": "國中社會 18 冊重點漫畫＋講義",
}

# 每一頁放哪幾個關鍵字：挑這一頁的讀者真的用得到的，最多四個
PAGES = {
    "luodian/index.html":      ("../", ["高中生", "總複習A", "總複習B", "學測自然"]),
    "luodian/tc.html":         ("../", ["技高生", "高中生"]),
    "portfolio/index.html":    ("../", ["高中生", "總複習A", "總複習B"]),
    "explore/index.html":      ("../", ["高中生", "總複習A", "總複習B"]),
    "practice/index.html":     ("../", ["國中生", "國中圖解", "高中生", "技高生"]),
    "quiz/index.html":         ("../", ["國中生", "國中圖解", "高中生"]),
    "voc/index.html":          ("../", ["技高生", "高中生"]),
    "science/index.html":      ("../", ["學測自然", "國中生"]),
    "social/index.html":       ("../", ["社會", "國中生"]),
    "cards/index.html":        ("../", ["國中生", "國中圖解", "高中生"]),
    "videos/index.html":       ("../", ["國中生", "高中生", "技高生"]),
    "apcs/index.html":         ("../", ["高中生", "技高生"]),
    "apcs/practice/index.html": ("../../", ["高中生", "技高生"]),
}

CSS = (
    ".jhc{background:#0f1b30;color:#fff;padding:26px 0;font-family:system-ui,'Noto Sans TC',sans-serif}"
    ".jhc *{box-sizing:border-box}"
    ".jhc-in{max-width:1120px;margin:0 auto;padding:0 20px;display:flex;gap:22px;align-items:center;flex-wrap:wrap}"
    ".jhc-t{flex:1 1 340px;min-width:0}"
    ".jhc-lab{font-size:12.5px;letter-spacing:.12em;color:#c69e46;font-weight:700;margin:0}"
    ".jhc h2{margin:6px 0 6px;font-size:21px;line-height:1.45}"
    ".jhc p.sub{margin:0 0 12px;font-size:14px;color:#aab3c4;line-height:1.7}"
    ".jhc ul{list-style:none;margin:0;padding:0;display:grid;gap:7px}"
    ".jhc li{display:flex;gap:9px;align-items:baseline;font-size:13.5px;color:#dfe4ec;line-height:1.6}"
    ".jhc code{background:rgba(198,158,70,.16);border:1px solid rgba(198,158,70,.45);color:#f0d389;"
    "border-radius:6px;padding:2px 9px;font-size:13.5px;font-weight:700;white-space:nowrap;font-family:inherit}"
    ".jhc .note{margin:12px 0 0;font-size:12.5px;color:#8e98ab}"
    ".jhc-q{flex:0 0 auto;text-align:center}"
    ".jhc-q img{display:block;width:132px;height:132px;border-radius:10px;background:#fff;padding:6px}"
    ".jhc-q b{display:block;margin-top:6px;font-size:13px;color:#dfe4ec}"
    ".jhc-q a{display:inline-block;margin-top:8px;background:#06c755;color:#fff;text-decoration:none;"
    "border-radius:9px;padding:9px 16px;font-size:14.5px;font-weight:700}"
    "@media (max-width:640px){.jhc-in{gap:16px}.jhc-q{flex:1 1 100%}.jhc-q img{margin:0 auto}}"
)

BEGIN, END = "<!--handout-->", "<!--/handout-->"


def block(pre, kws):
    items = "".join(
        "<li><code>%s</code><span>%s</span></li>" % (k, KW[k]) for k in kws if k in KW
    )
    return (
        BEGIN + "\n<style>" + CSS + "</style>\n"
        '<section class="jhc no-print" aria-label="免費講義">'
        '<div class="jhc-in">'
        '<div class="jhc-t">'
        '<p class="jhc-lab">免費講義・全台都能領</p>'
        "<h2>加 LINE 傳關鍵字，莊老師直接把講義給你。</h2>"
        '<p class="sub">不用註冊、不用留 email，加好友後傳下面的關鍵字，馬上收到下載連結。</p>'
        "<ul>%s</ul>"
        '<p class="note">不知道傳什麼？傳「講義」看全部清單。</p>'
        "</div>"
        '<div class="jhc-q">'
        '<img src="%simg/line-qr.png" width="132" height="132" '
        'alt="LINE 官方帳號 %s 加好友 QR Code" loading="lazy">'
        "<b>%s</b>"
        '<a href="%s" target="_blank" rel="noopener">加 LINE 領講義</a>'
        "</div>"
        "</div></section>\n" % (items, pre, LINE_ID, LINE_ID, LINE_URL)
        + END
    )


def put(path, html):
    s = io.open(path, encoding="utf-8").read()
    if BEGIN in s:                                   # 重跑：整塊換掉
        a = s.index(BEGIN)
        b = s.index(END, a) + len(END)
        return s[:a] + html + s[b:], "換掉"
    # 放在「其他免費資源」那一塊前面；沒有的話退回 footer 前面
    for anchor in ("<!--related-->", "<footer"):
        if anchor in s:
            i = s.index(anchor)
            return s[:i] + html + "\n" + s[i:], "放在 %s 前面" % anchor.strip("<!-")
    return None, "找不到放的位置"


def main():
    for rel, (pre, kws) in PAGES.items():
        if not os.path.exists(rel):
            print("－ 沒有這個檔：", rel)
            continue
        out, how = put(rel, block(pre, kws))
        if out is None:
            print("%-28s %s" % (rel, how))
            continue
        io.open(rel, "w", encoding="utf-8", newline="").write(out)
        print("%-28s %-18s %s" % (rel, how, "、".join(kws)))


main()
