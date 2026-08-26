// CIM service worker — PWA 安裝 + 離線推播通知。
// 推播為「無內容喚醒」：伺服器不送訊息內容，這裡只顯示中性的提醒（也顧及低調需求）。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

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
