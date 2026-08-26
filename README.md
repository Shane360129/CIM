# CHAT · 親友專屬聊天室 💙

一個部署在 **Cloudflare** 上、介面仿 **LINE** 的網頁聊天室（App 名稱：**CHAT**，程式庫沿用 CIM）。
專為「上班不能用手機、只能開網頁」的情境設計：你在公司用瀏覽器開網頁，
親友在手機把它「加到主畫面」當 App 用，隨時都能聯絡上你。

| | |
|---|---|
| 💬 **1 對 1 與群組聊天** | 訊息永久保存在你自己的 Cloudflare 帳號裡，換裝置、重新整理都不會消失 |
| ✅ **已讀回條** | 跟 LINE 一樣顯示「已讀」（群組顯示「已讀 N」） |
| ⌨️ **即時體驗** | WebSocket 即時推播、「正在輸入…」提示、新訊息通知與音效 |
| 🖼️ **豐富訊息** | 圖片（自動壓縮）、語音訊息、貼圖、表情符號、收回訊息（24 小時內） |
| 💛 **互動** | 表情回應（對訊息按 ❤️👍）、回覆引用、投票、群組公告置頂、訊息搜尋 |
| 🔔 **離線推播** | 網頁沒開也收得到通知（Web Push，金鑰全自動產生、零設定） |
| 🏠 **家庭小工具** | 全家共用購物清單、家庭行事曆（到時自動提醒所有人） |
| 🌙 **外觀** | 深色模式（自動／手動）、四段字體大小（長輩友善）、上班低調模式 |
| 🔐 **邀請碼註冊** | 只有拿到邀請碼的親友能註冊；第一位註冊者（你）自動成為管理員，可管理成員 |
| 📝 **我的記事本** | 跟自己聊天，當備忘錄用 |
| 📱 **PWA** | 手機瀏覽器「加入主畫面」後就像原生 App |
| 💸 **免費** | Cloudflare 免費方案即可運行，不需要信用卡 |

---

## 🚀 部署（約 5 分鐘）

兩種方式擇一。共同前提：一個 [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)（免費，不用信用卡）。

> 💡 建議在**自己的電腦**（家裡）部署，公司電腦之後只需要瀏覽器開網址就能用。
> 部署是一次性的動作，之後只有要更新程式時才需要再做。

### 方法 A：用自己的電腦部署

電腦需裝好 [Node.js](https://nodejs.org/)（18 以上）。

```bash
# 1. 下載這個專案
git clone https://github.com/Shane360129/CIM.git
cd CIM

# 2. 安裝工具
npm install

# 3. 登入 Cloudflare（會開瀏覽器讓你授權）
npx wrangler login

# 4. 部署！
npx wrangler deploy
```

Windows 小提醒：如果在 PowerShell 執行 `npm` / `npx` 出現「**因為這個系統上已停用指令碼執行**」，
那是公司或系統的 PowerShell 執行原則擋住了 `.ps1` 捷徑 —— 改開「**命令提示字元（cmd）**」執行
同樣的指令，或把指令改成 `npm.cmd install`、`npx.cmd wrangler deploy` 就能繞過。

### 方法 B：完全用瀏覽器部署（GitHub Actions，零安裝）

公司電腦被限制、不能裝 Node.js？這個方式**從頭到尾只需要瀏覽器**：

1. 登入 [Cloudflare Dash](https://dash.cloudflare.com/) → 進入 **Workers & Pages** 頁一次
   （第一次進入會請你取一個 `*.workers.dev` 子網域名稱，取好就好）。
2. 在 Workers & Pages 首頁右側複製 **Account ID**。
3. 到右上角頭像 → **My Profile → API Tokens** → **Create Token** →
   選 **Edit Cloudflare Workers** 範本 → 建立，複製產生的 token（只會顯示一次）。
4. 回到 GitHub 這個 repo → **Settings → Secrets and variables → Actions** →
   **New repository secret**，新增兩個：
   - 名稱 `CLOUDFLARE_API_TOKEN`，值＝第 3 步的 token
   - 名稱 `CLOUDFLARE_ACCOUNT_ID`，值＝第 2 步的 Account ID
5. 到 repo 的 **Actions** 分頁 → 左側選「**部署到 Cloudflare**」→ **Run workflow**。
   約一分鐘跑完，打開「部署」步驟的紀錄就能看到你的網址。

之後想更新版本，再按一次 Run workflow 即可。

### 部署完成後

你的網址長得像：

```
https://chat.<你的子網域>.workers.dev
```

**不需要**建資料庫、**不需要**設定任何金鑰 —— 所有資料都存在
Worker 附帶的 Durable Object（SQLite）裡；重新部署不會弄丟資料。

---

## 👨‍👩‍👧 開始使用（3 步驟）

1. **你先註冊**：打開網址 → 「註冊」→ 建立帳號。
   第一位註冊的人自動成為**管理員**（在這之前不會有別人能註冊）。
2. **設定邀請碼**：進「設定」→「管理員」→ 輸入一組邀請碼（例如 `family888`）→ 儲存。
   然後點「**複製邀請訊息**」，把網址＋邀請碼傳給親友。
3. **親友註冊**：親友打開網址 → 註冊時輸入邀請碼。
   註冊完系統會**自動幫他們建立與你的聊天室**，一進來就找得到你。

小提醒：

- **公司電腦**：把網頁開著（瀏覽器分頁），有訊息時分頁標題會顯示未讀數
  `(3) CHAT`，也可以開啟桌面通知與音效。
- **親友手機**：用瀏覽器打開網址 → 選單 → 「**加入主畫面**」，
  之後點圖示開啟就是全螢幕 App 體驗。
- **想關閉註冊**：邀請碼清空再按儲存，就沒有人能再註冊（已註冊的不受影響）。

---

## 🧱 技術架構

```
瀏覽器（前端 SPA，public/）
   │  HTTPS（REST API：登入、傳訊息、已讀…）
   │  WebSocket（即時接收：新訊息、已讀、輸入中…）
   ▼
Cloudflare Worker（src/index.js）── 靜態檔由 Cloudflare Assets 供應
   ▼
ChatServer Durable Object（src/chatserver.js）
   ├─ SQLite 儲存：使用者、聊天室、訊息、已讀進度、邀請碼
   └─ WebSocket Hibernation：所有線上成員的即時連線
```

設計重點：

- **單一 Durable Object 實例**承載全部狀態。親友規模（數十人）下這是最簡單、
  最一致的架構：沒有分散式競態、免設定 D1/KV/R2、部署零設定。
- **密碼**以 PBKDF2-SHA256（10 萬次迭代＋隨機鹽，為 Cloudflare 執行環境上限）雜湊儲存；登入與邀請碼嘗試皆有次數鎖定。
- **Session** 為隨機 token 存伺服器端，60 天未使用自動失效；改密碼會踢掉其他裝置。
- WebSocket 使用 **Hibernation API**，沒人講話時 DO 休眠，幾乎不耗用量。
- 圖片在**瀏覽器端壓縮**成 JPEG（最長邊 1280px、約 450KB 內）後以 data URL 存進資料庫。

### 免費方案夠用嗎？

夠。Workers 免費方案每天 10 萬次請求、Durable Objects（SQLite 版）含 5GB 儲存。
以家人朋友的訊息量（即使天天貼圖傳照片）通常連免費額度的邊都碰不到。

---

## 🛠️ 常用操作

| 想做什麼 | 指令／位置 |
|---|---|
| 本機開發預覽 | `npm run dev` → http://localhost:8787 |
| 部署／更新 | `npx wrangler deploy` |
| 重新產生 App 圖示 | `npm run icons`（改 `scripts/gen-icons.mjs` 配色後執行） |
| 備份聊天資料 | 網頁「設定」→「管理員」→「下載聊天備份」 |
| 換自己的網域 | Cloudflare Dash → Workers → chat → Settings → Domains & Routes |

## 📁 檔案結構

```
wrangler.jsonc        Cloudflare 設定（Worker、Durable Object、靜態資源）
src/index.js          Worker 入口（路由轉送）
src/chatserver.js     聊天伺服器：帳號、訊息、群組、WebSocket（Durable Object）
public/index.html     前端頁面骨架
public/app.js         前端邏輯（登入、聊天、已讀、通知、貼圖…）
public/style.css      LINE 風格樣式（桌面／手機自適應）
public/manifest.webmanifest + sw.js + icons/   PWA（加到主畫面）
scripts/gen-icons.mjs 產生 PNG 圖示的小工具（零相依）
legacy-github-pages/  舊版（GitHub Pages + MQTT 端對端加密版）留存
```

## 🔔 離線推播小抄

在「設定 → 通知 → 離線推播」開啟後，網頁完全關閉也會收到「新訊息」提醒
（內容一律不顯示聊天文字，兼顧隱私與低調）：

- **Android／電腦 Chrome、Edge**：直接開啟即可。
- **iPhone**：iOS 16.4 以上，需先用 Safari「**加入主畫面**」，再從主畫面圖示開啟 CHAT，
  才能開啟離線推播（這是 Apple 的限制）。
- 為避免轟炸，離線推播每人最多每分鐘一則。

## ⚠️ 已知限制

- 沒有語音／視訊通話。
- 傳一般檔案（文件、影片）尚未支援（適合之後掛 Cloudflare R2 再加）。
- 訊息在伺服器上以明文儲存於**你自己**的 Cloudflare 帳號（跟 LINE 一樣是伺服器可讀的模式）；
  若需要端對端加密，`legacy-github-pages/` 裡的舊版是加密的（但無帳號、無歷史訊息）。
- 請遵守你所在公司的網路使用規範。
