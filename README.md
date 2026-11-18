# 正賦文理短期補習班 官網

宜蘭縣羅東鎮純精路二段262號｜數學專門（國小高年級～大一先修）

靜態網站：index.html + img/，直接由 GitHub Pages 服務。
改內容就改 index.html，commit 後 push 即上線。

## 站內搜尋

- 每一頁 header 右邊的放大鏡（`assets/search.js`，只要頁尾有 `<script src="…assets/search.js" defer>` 就會自己長出來，不必改版面）。
- 獨立頁 `search/`，網址帶 `?q=` 可以把搜尋結果貼給別人。
- 索引 `assets/search-index.json`，用 `python tools/build_search.py` 產生。
  頁面清單與同義詞寫在那支裡面；數學練習單元與技高章節是 `tools/search/*.json` 快照，
  單元有增減要重倒一次（怎麼倒看 build_search.py 的檔頭說明）。
