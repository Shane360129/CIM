// CIM service worker — PWA 安裝 + 離線推播通知。
// 推播為「無內容喚醒」：伺服器不送訊息內容，這裡只顯示中性的提醒（也顧及低調需求）。
self.addEventListener('install', () => self.skipWaiting());
// 靜態檔（app.js / style.css / 圖示）先用快取、背景再更新：
// 這幾支加起來約 250KB，原本每次開 App 都要重新驗證一輪。
// API 與 WebSocket 一律不碰快取，訊息永遠是最新的。
const CACHE = 'cim-static-v1';
const STATIC = /\.(?:js|css|png|svg|ico|webmanifest)$/;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;              // service worker 自己不進快取
  if (url.pathname.startsWith('/api/') || !STATIC.test(url.pathname)) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const fresh = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => hit);
    return hit || fresh;
  })());
});

// 接管既有分頁，順便把舊版本的快取清掉
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener('push', (e) => {
  e.waitUntil(
    self.registration.showNotification('新訊息', {
      body: '有人傳訊息給你，打開看看吧',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'cim-push',
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.length) return list[0].focus();
    return self.clients.openWindow('/');
  })());
});
