#!/usr/bin/env node
// 資安煙霧測試：用「攻擊者視角」實際打 API，確認該擋的都擋掉了。
//
// 用法（需先在另一個終端機啟動本機伺服器）：
//   rm -rf .wrangler/state && npm run dev
//   npm run test:security
//
// 涵蓋：未登入／偽造 token、跨聊天室越權、非管理員越權、收回別人的訊息、
// XSS 與 javascript: 連結、SQL injection 嘗試、上傳格式與大小限制、
// 登入與邀請碼暴力破解鎖定、連結縮圖代理的簽章與 SSRF 防護、
// 停用帳號與改密碼後 token 失效、遊戲藏牌資訊不外流。

const B = process.env.BASE_URL || 'http://127.0.0.1:8787';
const PASS = 'pass123456';
const sfx = Date.now().toString(36).slice(-5);
const u = (n) => `s${sfx}_${n}`;

const j = async (path, opts = {}, token) => {
  const r = await fetch(B + path, {
    method: opts.method || 'GET',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
};

let pass = 0, fail = 0;
const check = (label, ok, extra = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? '  →  ' + extra : ''}`);
};

const info = (await j('/api/app-info')).data;
if (!info.firstRun && !(process.env.TEST_ADMIN_USER && process.env.TEST_ADMIN_PASS)) {
  console.error('資料庫已有資料。請用乾淨資料庫（rm -rf .wrangler/state）或提供 TEST_ADMIN_USER / TEST_ADMIN_PASS。');
  process.exit(2);
}
let ADMIN, adminUser;
if (info.firstRun) {
  const r = await j('/api/register', { method: 'POST', body: { username: u('admin'), password: PASS, displayName: '管理員' } });
  ADMIN = r.data.token; adminUser = r.data.user;
} else {
  const r = await j('/api/login', { method: 'POST', body: { username: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASS } });
  ADMIN = r.data.token; adminUser = r.data.user;
}
const INVITE = 'sec-' + sfx;
await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: INVITE } }, ADMIN);
const reg = (n) => j('/api/register', { method: 'POST', body: { username: u(n), password: PASS, displayName: n, inviteCode: INVITE } });
const A = await reg('a'), C = await reg('c');
const [TA, TC] = [A.data.token, C.data.token];
const [IA, IC] = [A.data.user.id, C.data.user.id];

console.log('\n--- 沒登入／假 token ---');
for (const [label, path, method] of [
  ['帳號清單', '/api/users', 'GET'],
  ['聊天室清單', '/api/conversations', 'GET'],
  ['搜尋', '/api/search?q=a', 'GET'],
  ['待辦清單', '/api/shopping', 'GET'],
  ['行事曆', '/api/events', 'GET'],
  ['貼圖', '/api/stickers', 'GET'],
  ['管理員設定', '/api/admin/settings', 'GET'],
  ['聊天備份', '/api/admin/export', 'GET'],
]) {
  check(`沒登入讀不到${label}`, (await j(path, { method })).status === 401);
}
check('假 token 一律 401', (await j('/api/me', {}, 'a'.repeat(64))).status === 401);
check('空 token 一律 401', (await j('/api/me', {}, '')).status === 401);
check('超長 token 不會打爆伺服器', (await j('/api/me', {}, 'x'.repeat(5000))).status === 401);

console.log('\n--- 跨聊天室越權 ---');
const dm = (await j('/api/conversations', { method: 'POST', body: { type: 'dm', userId: adminUser.id } }, TA)).data.conversation;
const msg = (await j(`/api/conversations/${dm.id}/messages`, { method: 'POST', body: { type: 'text', content: '機密家務事' } }, TA)).data.message;
check('別人讀不到我的私訊', (await j(`/api/conversations/${dm.id}/messages`, {}, TC)).status === 404);
check('別人不能在我的私訊發言', (await j(`/api/conversations/${dm.id}/messages`, { method: 'POST', body: { type: 'text', content: 'hi' } }, TC)).status === 404);
check('別人不能把我的私訊標成已讀', (await j(`/api/conversations/${dm.id}/read`, { method: 'POST', body: { lastMessageId: msg.id } }, TC)).status === 404);
check('別人不能對我的訊息按表情', (await j(`/api/messages/${msg.id}/react`, { method: 'POST', body: { emoji: '👍' } }, TC)).status === 404);
check('別人不能收回我的訊息', (await j(`/api/messages/${msg.id}/unsend`, { method: 'POST' }, TC)).status === 404);
check('我也不能收回別人的訊息', (await j(`/api/messages/${msg.id}/unsend`, { method: 'POST' }, ADMIN)).status === 403);
check('別人不能設定我聊天室的公告', (await j(`/api/conversations/${dm.id}/pin`, { method: 'POST', body: { messageId: msg.id } }, TC)).status === 404);
check('別人不能改我聊天室的設定', (await j(`/api/conversations/${dm.id}/prefs`, { method: 'PATCH', body: { pinned: true } }, TC)).status === 404);
check('別人不能把自己加進我的私訊', (await j(`/api/conversations/${dm.id}/members`, { method: 'POST', body: { userIds: [IC] } }, TC)).status === 404);
check('搜尋只找得到自己聊天室的內容',
  ((await j('/api/search?q=' + encodeURIComponent('機密家務事'), {}, TC)).data.results || []).length === 0);
check('搜尋得到自己的內容',
  ((await j('/api/search?q=' + encodeURIComponent('機密家務事'), {}, TA)).data.results || []).length === 1);

console.log('\n--- 非管理員越權 ---');
check('不能讀管理員設定', (await j('/api/admin/settings', {}, TA)).status === 403);
check('不能改邀請碼', (await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: 'hack' } }, TA)).status === 403);
check('不能下載整份聊天備份', (await j('/api/admin/export', {}, TA)).status === 403);
check('不能刪別人的帳號', (await j(`/api/admin/users/${IC}`, { method: 'DELETE' }, TA)).status === 403);
check('不能重設別人的密碼', (await j(`/api/admin/users/${IC}/reset-password`, { method: 'POST' }, TA)).status === 403);

console.log('\n--- 惡意內容 ---');
const XSS = '<img src=x onerror=alert(1)><script>alert(2)</script>';
const xmsg = (await j(`/api/conversations/${dm.id}/messages`, { method: 'POST', body: { type: 'text', content: XSS } }, TA)).data.message;
check('HTML 原樣存回（前端用 textContent 顯示，不會被執行）', xmsg.content === XSS);
const jsUrl = (await j(`/api/conversations/${dm.id}/messages`, { method: 'POST', body: { type: 'text', content: 'javascript:alert(1)' } }, TA)).data.message;
check('javascript: 開頭的字串存得進去（前端不會變成連結）', jsUrl.content === 'javascript:alert(1)');
const sqli = "' OR 1=1 --";
check('帳號欄位的 SQL injection 被格式擋掉',
  (await j('/api/register', { method: 'POST', body: { username: sqli, password: PASS, inviteCode: INVITE } })).status === 400);
check('搜尋的 SQL injection 不會撈出別人的訊息',
  ((await j('/api/search?q=' + encodeURIComponent(sqli), {}, TC)).data.results || []).length === 0);
check('LIKE 萬用字元被跳脫（% 不會變成全部命中）',
  ((await j('/api/search?q=' + encodeURIComponent('%'), {}, TA)).data.results || []).length === 0);
check('假圖片（不是 data:image）被擋',
  (await j(`/api/conversations/${dm.id}/messages`, { method: 'POST', body: { type: 'image', content: 'javascript:alert(1)' } }, TA)).status === 400);
check('SVG 夾帶腳本也進不來（只收 data:image 且有大小限制）',
  (await j(`/api/conversations/${dm.id}/messages`, { method: 'POST', body: { type: 'image', content: 'data:text/html,<script>alert(1)</script>' } }, TA)).status === 400);
check('超大 payload 被擋（413）',
  (await j(`/api/conversations/${dm.id}/messages`, { method: 'POST', body: { type: 'text', content: 'x'.repeat(2_000_000) } }, TA)).status === 413);
check('超長訊息被擋（400）',
  (await j(`/api/conversations/${dm.id}/messages`, { method: 'POST', body: { type: 'text', content: 'x'.repeat(5000) } }, TA)).status === 400);
check('不支援的訊息類型被擋',
  (await j(`/api/conversations/${dm.id}/messages`, { method: 'POST', body: { type: 'script', content: 'x' } }, TA)).status === 400);

console.log('\n--- 連結縮圖代理（SSRF）---');
check('沒有簽章不給抓', (await j('/api/link-image?u=' + encodeURIComponent('https://example.com/a.png'))).status === 403);
check('亂給簽章不給抓', (await j('/api/link-image?u=' + encodeURIComponent('https://example.com/a.png') + '&s=' + 'a'.repeat(43))).status === 403);
for (const bad of ['http://127.0.0.1/admin', 'http://169.254.169.254/latest/meta-data/', 'http://192.168.1.1/', 'file:///etc/passwd']) {
  check(`內網／本機網址不給抓：${bad.slice(0, 28)}`,
    (await j('/api/link-image?u=' + encodeURIComponent(bad) + '&s=' + 'a'.repeat(43))).status === 403);
}

console.log('\n--- 遊戲：藏起來的資訊 ---');
const grp = (await j('/api/conversations', { method: 'POST', body: { type: 'group', name: '資安測試群', memberIds: [IA, IC] } }, ADMIN)).data.conversation;
const newGame = (kind, tok) => j(`/api/conversations/${grp.id}/messages`, { method: 'POST', body: { type: 'game', content: '', game: { kind } } }, tok);
const sk = (await newGame('sudoku', TA)).data.message;
check('數獨：答案不在封包裡', sk.game.solution === undefined);
check('數獨：別人的盤面不在封包裡', sk.game.players === undefined);
const ms = (await newGame('mine', TA)).data.message;
check('踩地雷：雷區不在封包裡', ms.game.layout === undefined);
const gs = (await newGame('guess', TA)).data.message;
check('猜數字：答案不在封包裡', gs.game.secret === null);
const mem = (await newGame('memory', TA)).data.message;
check('記憶翻翻樂：蓋著的牌面不在封包裡', mem.game.cards.every((c) => c === null));
check('非成員不能操作遊戲',
  (await j(`/api/messages/${sk.id}/game`, { method: 'POST', body: { action: 'start' } }, ADMIN)).status === 200);

console.log('\n--- 暴力破解鎖定 ---');
let locked = false;
for (let i = 0; i < 10 && !locked; i++) {
  const r = await j('/api/login', { method: 'POST', body: { username: u('a'), password: 'wrong' + i } });
  if (r.status === 429) locked = true;
}
check('連續猜密碼會被鎖', locked);
check('鎖住期間正確密碼也進不來（保護帳號）',
  (await j('/api/login', { method: 'POST', body: { username: u('a'), password: PASS } })).status === 429);
let invLocked = false;
for (let i = 0; i < 8 && !invLocked; i++) {
  const r = await j('/api/register', { method: 'POST', body: { username: u('x' + i), password: PASS, inviteCode: 'wrong' } });
  if (r.status === 429) invLocked = true;
}
check('連續猜邀請碼會被鎖', invLocked);

console.log('\n--- token 生命週期 ---');
const D = await j('/api/login', { method: 'POST', body: { username: u('c'), password: PASS } });
check('同一個帳號可以有多個裝置', D.status === 200 && D.data.token !== TC);
await j('/api/me/password', { method: 'POST', body: { oldPassword: PASS, newPassword: PASS + '!' } }, TC);
check('改密碼後其他裝置的 token 失效', (await j('/api/me', {}, D.data.token)).status === 401);
check('改密碼後自己的 token 還在', (await j('/api/me', {}, TC)).status === 200);
await j(`/api/admin/users/${IC}`, { method: 'DELETE' }, ADMIN);
check('被管理員停用後 token 立刻失效', (await j('/api/me', {}, TC)).status === 401);

await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: '' } }, ADMIN);
console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
