# -*- coding: utf-8 -*-
"""在每一頁的頁尾上方放一塊「其他免費資源」，讓任兩個工具之間都連得到。

跑法（在 jenfoo/ 底下）：python tools/build_related.py

為什麼要這支：各個子站的 header 長得都不一樣（practice、voc、落點、備審都有
自己的 CSS，沒有載 site.css），靠手改會漏。這支產生的區塊自己帶樣式，
用 <!--related--> … <!--/related--> 包起來，重跑會整塊換掉，不會越疊越多。

加新工具只要改 ITEMS（和 NEXT），再跑一次，所有頁面同時更新。
"""
import io
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (鍵, 標題, 網址, 一句話)　鍵同時也是頁面自己的代號，用來把自己從清單裡拿掉
ITEMS = [
    ("practice", "數學線上練習", "practice/", "國中到技高 133 單元，答完馬上批改"),
    ("quiz", "數學練習卷", "quiz/", "164 單元一鍵出卷，可列印"),
    ("exam", "會考・統測真題", "practice/#/exam", "原題作答，官方答案與詳解"),
    ("voc", "技高專業科目", "voc/", "電機電子群八科＋統測專業科目"),
    ("cards", "段考重點圖卡", "cards/", "考前只看這 12 格"),
    ("videos", "影片專區", "videos/", "段考複習、一分鐘觀念"),
    ("science", "國中自然", "science/", "影片＋講義 PDF"),
    ("social", "國中社會", "social/", "18 冊重點漫畫＋講義"),
    ("apcs", "APCS 程式設計", "apcs/", "12 單元 36 支影片＋講義"),
    ("apcspractice", "APCS 特訓站", "apcs/practice/", "觀念題＋實作題線上練習"),
    ("luodian", "學測落點分析", "luodian/", "一階通過機率、推薦志願"),
    ("portfolio", "備審小幫手", "portfolio/", "學習歷程、動機、面試"),
    ("tc", "統測落點分析", "luodian/tc.html", "四技二專甄選・登記分發機率"),
    ("ast", "分科落點分析", "luodian/#ast", "分科測驗登記分發錄取機率"),
]

# 這一頁看完最可能想去的下一站，排在最前面並且標起來
NEXT = {
    "luodian": ("portfolio", "志願排好了，接著整理備審"),
    "portfolio": ("luodian", "還沒算落點？先看哪些校系有機會"),
    "tc": ("portfolio", "志願排好了，接著準備二階備審"),
    "practice": ("quiz", "想印成紙本？這裡可以出卷"),
    "quiz": ("practice", "想線上作答、馬上批改？"),
    "voc": ("exam", "統測數學 C 的歷屆真題在這"),
    "apcs": ("apcspractice", "看完影片，來這裡刷題"),
    "apcspractice": ("apcs", "觀念不熟？先看影片和講義"),
    "videos": ("practice", "看完影片，馬上練一題"),
    "cards": ("practice", "重點看完了，練一下"),
    "science": ("social", "國中社會也整理好了"),
    "social": ("science", "國中自然也整理好了"),
    "learn": (None, None),
}

# 檔案 → (自己的代號, 相對站根的前綴)
# 首頁（磚牆）和學習中心（完整清單）本來就把所有資源列完了，不放這一塊，
# 不然同一頁會講兩次——莊老師最不喜歡這個。
PAGES = {
    "classes/index.html": ("classes", "../"),
    "teacher/index.html": ("teacher", "../"),
    "news/index.html": ("news", "../"),
    "search/index.html": ("search", "../"),
    "practice/index.html": ("practice", "../"),
    "quiz/index.html": ("quiz", "../"),
    "voc/index.html": ("voc", "../"),
    "videos/index.html": ("videos", "../"),
    "cards/index.html": ("cards", "../"),
    "science/index.html": ("science", "../"),
    "social/index.html": ("social", "../"),
    "apcs/index.html": ("apcs", "../"),
    "apcs/practice/index.html": ("apcspractice", "../../"),
    "luodian/index.html": ("luodian", "../"),
    "portfolio/index.html": ("portfolio", "../"),
    "luodian/tc.html": ("tc", "../"),
}

CSS = (
    ".jrel{background:#16223a;color:#fff;padding:34px 0 30px;font-family:system-ui,'Noto Sans TC',sans-serif}"
    ".jrel *{box-sizing:border-box}"
    ".jrel-in{max-width:1120px;margin:0 auto;padding:0 20px}"
    ".jrel-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;"
    "margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:.08em;color:#c7cedb}"
    ".jrel-h a{color:#c69e46;text-decoration:none;font-weight:700;letter-spacing:0}"
    ".jrel-h a:hover{text-decoration:underline}"
    ".jrel-h nav{display:flex;flex-wrap:wrap;gap:4px 14px;letter-spacing:0}"
    ".jrel-h nav a{color:#c7cedb;font-weight:500}"
    ".jrel-h nav a:hover{color:#c69e46}"
    ".jrel-g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}"
    "@media (max-width:900px){.jrel-g{grid-template-columns:1fr 1fr}}"
    "@media (max-width:520px){.jrel-g{grid-template-columns:1fr}}"
    ".jrel-g a{display:block;padding:11px 13px;border:1px solid rgba(255,255,255,.14);border-radius:12px;"
    "text-decoration:none;color:#fff;background:rgba(255,255,255,.03)}"
    ".jrel-g a:hover{border-color:#c69e46;background:rgba(198,158,70,.12)}"
    ".jrel-g b{display:block;font-size:15px;font-weight:700;margin-bottom:2px}"
    ".jrel-g span{display:block;font-size:12.5px;color:#aab3c4;line-height:1.5}"
    ".jrel-g a.next{grid-column:span 2;border-color:#c69e46;background:rgba(198,158,70,.14)}"
    "@media (max-width:520px){.jrel-g a.next{grid-column:span 1}}"
    ".jrel-g a.next em{display:block;font-style:normal;font-size:12px;font-weight:700;color:#e6c879;margin-bottom:3px}"
)

BEGIN, END = "<!--related-->", "<!--/related-->"


def block(me, pre):
    nxt_key, nxt_say = NEXT.get(me, (None, None))
    order = [i for i in ITEMS if i[0] != me]
    if nxt_key:
        order.sort(key=lambda i: 0 if i[0] == nxt_key else 1)
    cards = []
    for key, title, url, desc in order:
        cls, lead = "", ""
        if key == nxt_key:
            cls, lead = ' class="next"', "<em>%s</em>" % nxt_say
        cards.append('<a href="%s%s"%s>%s<b>%s</b><span>%s</span></a>'
                     % (pre, url, cls, lead, title, desc))
    # 右邊這排小字是整站的備援選單：工具頁本來連不到班別、莊老師、最新消息、搜尋
    mini = "".join('<a href="%s%s">%s</a>' % (pre, u, t) for u, t in
                   (("", "首頁"), ("classes/", "班別課程"), ("teacher/", "莊老師"),
                    ("news/", "最新消息"), ("learn/", "學習中心"), ("search/", "搜尋站內")))
    return (BEGIN + "\n<style>" + CSS + "</style>\n"
            '<section class="jrel" aria-label="其他免費資源"><div class="jrel-in">'
            '<div class="jrel-h"><span>其他免費資源・全部免費不用註冊</span>'
            '<nav aria-label="網站其他頁">%s</nav></div>'
            '<div class="jrel-g">%s</div></div></section>\n' % (mini, "".join(cards)) + END)


def put(path, html):
    s = io.open(path, encoding="utf-8").read()
    if BEGIN in s:                                   # 重跑：整塊換掉
        a = s.index(BEGIN)
        b = s.index(END, a) + len(END)
        s = s[:a] + html + s[b:]
        how = "換掉"
    elif "<footer" in s:
        i = s.index("<footer")
        s = s[:i] + html + "\n" + s[i:]
        how = "放在 footer 上面"
    else:
        return "找不到 footer，沒放"
    io.open(path, "w", encoding="utf-8", newline="").write(s)
    return how


def main():
    for rel, (me, pre) in PAGES.items():
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            print("－ 沒有這個檔：", rel); continue
        print("%-26s %s" % (rel, put(p, block(me, pre))))


main()
