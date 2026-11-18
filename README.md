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

## 頁與頁之間的連結

每一頁（首頁與學習中心除外，那兩頁本來就是完整清單）頁尾上方有一塊
「其他免費資源」深藍區：12 個工具的卡片＋右上角整站小選單（首頁／班別課程／
莊老師／最新消息／學習中心／搜尋站內）。某些頁面會把「最可能想去的下一站」
標成金色放第一個，例如落點分析 →「志願排好了，接著整理備審」。

用 `python tools/build_related.py` 產生，整塊用 `<!--related-->` 包起來，
重跑會換掉不會疊加。加新工具改那支的 ITEMS（要標下一站就改 NEXT）再跑一次，
所有頁面同時更新。目前 18 頁對 17 個目的地，每一頁都是一次點擊可達。
