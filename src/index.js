// CIM Worker 入口：/api/* 與 /ws 轉送到唯一的 ChatServer Durable Object，
// 其餘路徑由靜態資源（public/）供應。
export { ChatServer } from './chatserver.js';
export { FarmRoom } from './farmroom.js';

// 靜態頁面的安全標頭：防點擊劫持、referrer 洩漏、瀏覽器功能濫用
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',                       // 禁止被 <iframe> 嵌入（防釣魚頁包裝）
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), payment=(), usb=(), interest-cohort=()',
};

async function farmRoomFetch(request, env, url) {
  const isWs = url.pathname === '/farm/ws';
  // WebSocket 帶不了自訂標頭，token 放在子協定欄位（跟聊天室的 /ws 同一種做法）
  const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map((s) => s.trim());
  const token = isWs
    ? (protocols.find((p) => p.startsWith('token.')) || '').slice(6)
    : (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const convId = Number(url.searchParams.get('conv')) || 0;
  const chat = env.CHAT.get(env.CHAT.idFromName('main'));
  const auth = await chat.fetch(new Request(`https://chat/internal/farm-auth?conv=${convId}`, { headers: { 'x-farm-token': token } }));
  if (!auth.ok) return new Response(await auth.text(), { status: auth.status, headers: { 'content-type': 'application/json; charset=utf-8' } });
  const who = await auth.json();
  const headers = new Headers(request.headers);
  for (const k of [...headers.keys()]) if (k.startsWith('x-farm-')) headers.delete(k);
  headers.set('x-farm-auth', encodeURIComponent(JSON.stringify(who)));
  const room = env.FARM.get(env.FARM.idFromName('farm:' + convId));
  return room.fetch(new Request(request, { headers }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // 晴耕谷：每個一對一對話一個 FarmRoom。先請 ChatServer 驗證身分，通過才轉給 FarmRoom，
    // 並把驗證過的身分寫在標頭裡（瀏覽器自己帶來的同名標頭一律丟掉，FarmRoom 只信這裡寫的）
    if (url.pathname === '/farm/ws' || url.pathname.startsWith('/api/farmroom/')) return farmRoomFetch(request, env, url);
    if (url.pathname.startsWith('/internal/')) return new Response('Not found', { status: 404 }); // 內部端點不對外
    if (url.pathname === '/ws' || url.pathname.startsWith('/api/')) {
      const stub = env.CHAT.get(env.CHAT.idFromName('main'));
      return stub.fetch(request);
    }
    if (env.ASSETS) {
      const resp = await env.ASSETS.fetch(request);
      const headers = new Headers(resp.headers);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
      // 晴耕谷（/games/farm/）是用同源 iframe 開在聊天室裡的：只有這個路徑允許被自己的網域嵌入，其他頁面照舊完全禁止
      if (url.pathname.startsWith('/games/farm/')) headers.set('X-Frame-Options', 'SAMEORIGIN');
      return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
    }
    return new Response('Not found', { status: 404 });
  },
};
