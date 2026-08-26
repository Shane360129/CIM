// CIM Worker 入口：/api/* 與 /ws 轉送到唯一的 ChatServer Durable Object，
// 其餘路徑由靜態資源（public/）供應。
export { ChatServer } from './chatserver.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws' || url.pathname.startsWith('/api/')) {
      const stub = env.CHAT.get(env.CHAT.idFromName('main'));
      return stub.fetch(request);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
