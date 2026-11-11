# CIM

親友用的網頁聊天室（Cloudflare Workers + Durable Objects）。沒有打包工具，`public/` 裡的檔案直接部署。

## 農場遊戲（晴耕谷）

在一對一聊天裡的雙人農場生活遊戲。規格、內容量表、架構計畫、進度都在 `docs/farm-game/`，開工前先讀 `進度.md`。
跟既有的「家族牧場」（`src/farm.js`、`public/farm.*`）是兩款不同的遊戲。

### 開發規則

1. 只在 feature/farm-game 分支工作。每個階段做完、經我測過才 commit，commit 訊息用中文。
2. 不能弄壞現有聊天功能。改到既有檔案（app.js、chatserver.js、index.js、index.html、style.css、sw.js、wrangler.jsonc）時，回報改了哪些函式、為什麼。
3. 遵守現有 CSP；不用 CDN、不用打包工具；要加任何函式庫先問我，並放進專案內。
4. 遊戲內容全部放 public/games/farm/data/ 的 JSON，程式不寫死內容；數值集中在平衡設定檔。
5. 美術還沒到時用暫代圖（色塊＋名稱），遊戲照樣能跑；素材到了只要放進去、跑素材工具就能替換。
6. 每個階段結束更新 docs/farm-game/進度.md。
7. 測試方法：wrangler dev，兩個瀏覽器（一般視窗＋無痕視窗）登入兩個互為好友的帳號。手機用瀏覽器開發者工具的手機模擬，能的話用真手機連區網測。
8. 部署前一定先問我。資料庫結構變更要有轉移方式，不能清掉現有聊天資料。
9. 不確定的事先問我，不要自己猜。

### 補充

- 規則 1 的分支：雲端工作階段只能推被指定的分支，以當次指定的為準。
- 生圖的清單和做法在 `art-src/farm/待生成/`，每張圖的狀況記在 `art-src/farm/生圖紀錄.jsonl`。
