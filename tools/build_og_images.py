# -*- coding: utf-8 -*-
"""產生各區專屬的分享預覽圖（og:image）。

為什麼要這支：
  LINE、FB 貼連結時會抓 og:image 當預覽圖。原本只有一張 img/og.jpg（官網通用），
  國中社會漫畫那 127 頁完全沒有 og:image → 貼到群組只有一行藍字，沒人點。
  這支為 18 冊各產一張專屬預覽圖，貼哪一冊就顯示那一冊。

沿用 段考重點圖卡/build_ig_cards.py 的深藍金 CI（正賦文理品牌色）。

用法：python tools/build_og_images.py
輸出：img/og/og-<代號>.jpg（1200x630），以及 img/og/og-social.jpg
"""
import os
import sys

sys.path.insert(0, r"C:\Users\user\Desktop\龍蝦專案\段考重點圖卡")

from PIL import Image, ImageDraw

import build_ig_cards as G

sys.stdout.reconfigure(encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "img", "og")
os.makedirs(OUT, exist_ok=True)

W, H = 1200, 630
GOLD, GOLD_L, WHITE = G.GOLD, G.GOLD_L, G.WHITE
DIM = (170, 182, 200)

SUBJ = {"civ": "公民", "geo": "地理", "his": "歷史"}
GRADE = {"7a": "國一上", "7b": "國一下", "8a": "國二上",
         "8b": "國二下", "9a": "國三上", "9b": "國三下"}


def backdrop():
    im = Image.new("RGB", (W, H), G.BG)
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        c = tuple(int(G.BG[i] + (G.BG2[i] - G.BG[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    m = 20
    d.rectangle([m, m, W - m - 1, H - m - 1], outline=GOLD, width=3)
    d.rectangle([m + 8, m + 8, W - m - 9, H - m - 9], outline=(58, 70, 90), width=1)
    return im, d


def pill(d, x, y, text, size, fg, bg, padx=26, pady=11):
    f = G.font(G.F_BOLD, size)
    w = d.textlength(text, font=f) + padx * 2
    hh = size + pady * 2
    d.rounded_rectangle([x, y, x + w, y + hh], radius=hh / 2, fill=bg)
    d.text((x + w / 2, y + hh / 2), text, font=f, fill=fg, anchor="mm")
    return y + hh


def brand(im, d):
    """右下角：莊老師頭像＋品牌，被轉傳時還認得出是誰。"""
    size = 96
    cx, cy = W - 108, H - 104
    d.ellipse([cx - size // 2 - 6, cy - size // 2 - 6,
               cx + size // 2 + 6, cy + size // 2 + 6], fill=GOLD_L)
    av = G.avatar(size)
    if av:
        im.paste(av, (cx - size // 2, cy - size // 2), av)
    d.text((cx - size // 2 - 20, cy - 26), "正賦文理",
           font=G.font(G.F_BOLD, 32), fill=GOLD_L, anchor="ra")
    d.text((cx - size // 2 - 20, cy + 14), "莊老師",
           font=G.font(G.F_REG, 26), fill=DIM, anchor="ra")


def card(path, tag, big, sub, note):
    im, d = backdrop()
    x = 72
    y = pill(d, x, 86, tag, 34, G.BG, GOLD_L) + 28

    d.text((x, y), big, font=G.font(G.F_BOLD, 104), fill=WHITE, anchor="la")
    y += 126

    f = G.font(G.F_BOLD, 60)
    x0, y0, x1, y1 = d.textbbox((x, y), sub, font=f, anchor="la")
    d.rectangle([x0 - 16, y0 - 10, x1 + 16, y1 + 12], fill=GOLD)
    d.text((x, y), sub, font=f, fill=G.BG, anchor="la")
    y = y1 + 12 + 34

    d.text((x, y), note, font=G.font(G.F_REG, 34), fill=DIM, anchor="la")

    d.text((x, H - 62), "wade-chuang.github.io/jenfoo",
           font=G.font(G.F_REG, 26), fill=(126, 140, 160), anchor="la")

    brand(im, d)
    im.save(path, quality=88, optimize=True)
    return path


def main():
    made = []
    for code, s in SUBJ.items():
        for g, gname in GRADE.items():
            p = os.path.join(OUT, "og-%s%s.jpg" % (code, g))
            made.append(card(p, "國中社會 重點漫畫", "%s %s" % (gname, s),
                             "6 話看完一冊", "圖解＋隨堂測驗　免費，不用註冊"))
    made.append(card(os.path.join(OUT, "og-social.jpg"),
                     "正賦文理　免費資源", "國中社會",
                     "18 冊 108 話漫畫",
                     "地理・公民・歷史　圖解＋隨堂測驗　全部免費"))
    for p in made:
        print("%s　%s" % (Image.open(p).size, os.path.relpath(p, ROOT)))
    print("\n共 %d 張" % len(made))


if __name__ == "__main__":
    main()
