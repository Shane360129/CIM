// CIM Worker 入口：/api/* 與 /ws 轉送到唯一的 ChatServer Durable Object，
// 其餘路徑由靜態資源（public/）供應。
export { ChatServer } from './chatserver.js';

// 靜態頁面的安全標頭：防點擊劫持、referrer 洩漏、瀏覽器功能濫用
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',                       // 禁止被 <iframe> 嵌入（防釣魚頁包裝）
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), payment=(), usb=(), interest-cohort=()',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws' || url.pathname.startsWith('/api/')) {
      const stub = env.CHAT.get(env.CHAT.idFromName('main'));
      return stub.fetch(request);
    }
    if (env.ASSETS) {
      const resp = await env.ASSETS.fetch(request);
      const headers = new Headers(resp.headers);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
      return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
    }
    return new Response('Not found', { status: 404 });
  },
};
