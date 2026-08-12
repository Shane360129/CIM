# CIM · 私密即時聊天 🔒

一個**不需要後端伺服器**、**端對端加密**、可以直接部署在 GitHub Pages 上的即時聊天室。

- 🔗 **只有拿到你網址的人進得來** — 房間金鑰藏在網址 `#` 後面，永遠不會傳到任何伺服器。
- 🔐 **端對端加密** — 訊息在你的瀏覽器裡用 AES-256-GCM 加密後才送出，中繼伺服器只看得到亂碼。
- 🚫 **比較不會被公司網頁擋掉** — 網站放在 `github.io`（開發／技術類網域，通常不在公司封鎖名單裡），也不需要連到任何「聊天／社群」類網站。
- 🪶 **零安裝、零後端** — 只有靜態的 HTML / CSS / JS，打開網址就能用。

> ⚠️ 使用前請留意：這是給個人與朋友之間的私訊工具。請遵守你所在公司或網路的使用規範，別用它來做違反規定的事。

---

## 🚀 怎麼用（3 步驟）

1. 依照下面「部署到 GitHub Pages」把網站上線，得到一個網址，例如
   `https://<你的帳號>.github.io/cim/`
2. 用瀏覽器打開它。網址後面會自動長出一段 `#xxxxxxxx`，那就是這間房間的**秘密金鑰**。
3. 點右上角 **「🔗 邀請」** 複製完整網址，傳給你想聊天的對象。
   對方打開同一條網址，你們就在同一間加密房間了。

> 想開一間全新的房間？把網址 `#` 後面那段刪掉再重新整理，就會產生一把新金鑰。

---

## 🛠️ 部署到 GitHub Pages

網站的檔案已經在這個 repo 的根目錄，選一種方式讓 GitHub Pages 上線即可。

### 方法 A：直接從分支發布（最快，不用合併）

1. 進到 repo 的 **Settings → Pages**。
2. **Build and deployment → Source** 選 **「Deploy from a branch」**。
3. **Branch** 選這個工作分支 `claude/bypass-corporate-chat-dg8d38`，資料夾選 **`/ (root)`**，按 **Save**。
4. 等一兩分鐘，頁面上方會出現網址 `https://<你的帳號>.github.io/cim/`。完成！

### 方法 B：用 GitHub Actions 自動部署（合併到 `main` 後）

本 repo 已附上 `.github/workflows/deploy.yml`。當你把這個分支合併（或推送）到 `main` 後：

1. 進到 **Settings → Pages**，**Source** 選 **「GitHub Actions」**。
2. 之後每次 `main` 有更新，都會自動重新部署。

> 小提醒：GitHub Pages 的 `github-pages` 環境預設只允許從**預設分支**（通常是 `main`）用 Actions 部署。
> 所以還沒合併到 `main` 之前，請先用**方法 A** 立即上線。

---

## 🔐 它是怎麼做到「私密」的？

| 環節 | 做法 |
|------|------|
| **誰能進房間** | 房間由網址 `#` 後面的隨機金鑰決定。瀏覽器**不會**把 `#` 之後的內容送給任何伺服器，所以只有拿到完整網址的人知道金鑰。 |
| **訊息內容** | 每則訊息在送出前，先用從金鑰導出的 AES-256-GCM 金鑰在你的瀏覽器裡加密。中繼站只看得到 base64 亂碼。 |
| **中繼站看得到房間名稱嗎** | 看不到。MQTT 主題是金鑰的 SHA-256 雜湊值，中繼站無法從主題反推金鑰，也分不出哪間是哪間。 |
| **拿不到網址的人** | 就算他連上同一個公開中繼站，也不知道正確主題可訂閱；就算矇到，沒有金鑰也解不開任何一則訊息。 |

換句話說：**進得來 + 看得懂，兩件事都需要你的邀請網址。** 金鑰（`#` 之後那段）請只透過你信任的管道傳給對方（例如當面、或另一個你信任的 App）。

---

## ⚙️ 技術架構

```
你的瀏覽器 ──(AES-GCM 加密)──►  公開 MQTT 中繼站 (WSS)  ──►  對方的瀏覽器 ──(解密)──►
   ▲                              只看得到亂碼與雜湊主題                          │
   └──────────────────  金鑰只存在網址 #，兩邊各自導出，不經過網路  ─────────────────┘
```

- 前端：純靜態 `index.html` / `styles.css` / `app.js`
- 加密：瀏覽器內建 **Web Crypto API**（HKDF 導出金鑰 + AES-256-GCM）
- 即時傳輸：**MQTT over Secure WebSocket**，用了公開中繼站（EMQX、HiveMQ），主程式會自動在它們之間備援。
- MQTT 用戶端：`mqtt.min.js` 已內建在 repo 裡（沒有依賴任何 CDN，少一個可能被擋的外部網域）。

**已知限制**

- 訊息是「當下即時」的：新加入的人**不會**看到他加入之前的歷史訊息（你自己的裝置會用 `localStorage` 保留你看過的訊息，重新整理不會消失）。
- 公開 MQTT 中繼站是免費、盡力而為的服務，偶爾可能較慢或短暫中斷。若要更穩定，見下方 Firebase 方案。

---

## 🧯 如果公司網路還是把它擋掉了

網站本身在 `github.io`（通常不會被以「分類」為主的公司過濾器封鎖）。真正可能被擋的是那條到 MQTT 中繼站的連線（走的是 `8084` / `8884` 埠）。若你的公司只放行 `443` 埠，可以改用 **Firebase Realtime Database** 當中繼 —— 它走 `443`、網域是 `*.firebaseio.com`（一般不在封鎖名單），而且更穩定。

**做法**（免費，約 5 分鐘）：

1. 到 <https://console.firebase.google.com> 建一個專案，開啟 **Realtime Database**（測試模式即可）。
2. 專案設定裡拿到 `firebaseConfig`（那串金鑰是設計給前端公開用的，放進網頁沒問題）。
3. 在 `index.html` 的 `mqtt.min.js` 那行**上面**，加入 Firebase 的 SDK：

   ```html
   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
   ```

4. 在 `app.js` 貼上這個對應同一組介面的傳輸層（放在 `MqttTransport` 附近）：

   ```js
   // 需先在 index.html 載入 firebase-app-compat / firebase-database-compat
   var FIREBASE_CONFIG = { /* 這裡貼上你的 firebaseConfig */ };

   function FirebaseTransport(topic, clientId, willPayload) {
     var handlers = { message: function () {}, status: function () {} };
     var ref = null;
     return {
       connect: function () {
         handlers.status("connecting");
         if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
         var db = firebase.database();
         ref = db.ref("rooms/" + topic.replace(/[.#$/\[\]]/g, "_"));
         db.ref(".info/connected").on("value", function (s) {
           handlers.status(s.val() ? "online" : "offline");
         });
         // 只轉發最近 250 則；重複與自己的訊息由 app 層自動過濾
         ref.limitToLast(250).on("child_added", function (snap) {
           var v = snap.val();
           if (v && v.p) handlers.message(v.p);
         });
       },
       publish: function (str) {
         if (ref) ref.push({ p: str, t: firebase.database.ServerValue.TIMESTAMP });
       },
       close: function () { if (ref) ref.off(); },
       onMessage: function (fn) { handlers.message = fn; },
       onStatus: function (fn) { handlers.status = fn; },
     };
   }
   ```

5. 在 `app.js` 的 `boot()` 裡，把這行

   ```js
   state.transport = MqttTransport(state.topic, state.clientId, willPayload);
   ```

   改成

   ```js
   state.transport = FirebaseTransport(state.topic, state.clientId, willPayload);
   ```

> Firebase 版本有個附帶好處：訊息會（以加密後的亂碼形式）存在資料庫裡，所以**新加入的人也看得到之前的歷史訊息**。內容一樣是端對端加密，Firebase 也只存得到亂碼。

---

## 📁 檔案結構

```
index.html   聊天室介面
styles.css   樣式（深／淺色自動切換、支援手機）
app.js       加密、傳輸、UI 邏輯（含可替換的 Transport 介面）
mqtt.min.js  內建的 MQTT 用戶端（無外部 CDN 依賴）
.github/workflows/deploy.yml   GitHub Pages 自動部署（合併到 main 後生效）
.nojekyll    讓 GitHub Pages 原樣提供靜態檔
```
