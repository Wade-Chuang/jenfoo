# -*- coding: utf-8 -*-
"""把 <script src="x.js?v=...">　的版本戳改成檔案的 crc32，瀏覽器才會重新抓。
用法：python tools/stamp.py <宿主html> <js檔名> [<js檔名> ...]
js 檔名是 html 裡 src 的寫法（相對 html 所在目錄）。
"""
import io
import os
import re
import sys
import zlib

sys.stdout.reconfigure(encoding="utf-8")
host = sys.argv[1]
base = os.path.dirname(os.path.abspath(host))
s = io.open(host, encoding="utf-8").read()
for name in sys.argv[2:]:
    p = os.path.join(base, name)
    v = "%08x" % (zlib.crc32(io.open(p, "rb").read()) & 0xFFFFFFFF)
    s, n = re.subn(r'(src="%s)(\?v=[0-9a-f]+)?"' % re.escape(name), r'\1?v=%s"' % v, s)
    print("%-22s %s  (%d 處)" % (name, v, n))
    if not n:
        print("   ！html 裡找不到這個 src，沒改到")
io.open(host, "w", encoding="utf-8", newline="").write(s)
