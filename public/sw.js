// CIM service worker — 讓瀏覽器允許「加到主畫面」安裝為 App。
// 訊息永遠即時走網路，不做離線快取，避免看到過期內容。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
