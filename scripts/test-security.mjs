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
// 停用帳號與改密碼後 token 失效、照片簽章網址的授權、家族牧場的權限與即時連線。

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

console.log('\n--- 家族牧場 ---');
// 牧場視窗的即時連線（大家走來走去）。回傳 { ok, code, msg }：ok=有沒有連上，code=被關掉時的代碼
const WSB = B.replace(/^http/, 'ws');
const farmWs = (cid, tok, { holdMs = 400, onOpen } = {}) => new Promise((done) => {
  let ws, opened = false, first = null;
  try { ws = new WebSocket(`${WSB}/ws?farm=${cid}`, ['cim.v1', 'token.' + tok]); }
  catch { return done({ ok: false }); }
  const timer = setTimeout(() => { try { ws.close(); } catch {} done({ ok: opened, msg: first }); }, holdMs);
  ws.onopen = () => { opened = true; onOpen && onOpen(ws); };
  ws.onmessage = (e) => { if (!first) first = JSON.parse(e.data); };
  ws.onclose = (e) => { clearTimeout(timer); done({ ok: opened, code: e.code, msg: first }); };
  ws.onerror = () => {};
});
check('別人打不開我的牧場（404）', (await j(`/api/farm/${dm.id}`, {}, TC)).status === 404);
check('別人不能在我的牧場翻土（404）', (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'till', x: 4, y: 9 } }, TC)).status === 404);
check('沒登入打不開牧場', (await j(`/api/farm/${dm.id}`)).status === 401);
check('不存在的聊天室沒有牧場', (await j('/api/farm/999999', {}, TA)).status === 404);
let fw = await farmWs(dm.id, TC);
check('別人連不上我的牧場即時連線', !fw.ok);
fw = await farmWs(dm.id, 'f'.repeat(64));
check('假 token 連不上牧場即時連線', !fw.ok);
fw = await farmWs(dm.id, TA);
check('自己連得上，並收到「誰在牧場」', fw.ok && fw.msg?.type === 'farm-presence');
// ▼ 小遊戲（只有 CIM 有；搬到朋友的版本時整段拿掉）
console.log('\n--- 小遊戲：藏起來的資訊、別人的聊天室 ---');
const newT = (kind, tok, cid = dm.id) => j(`/api/games/${cid}`, { method: 'POST', body: { kind } }, tok);
const sk = (await newT('sudoku', TA)).data.table;
check('數獨：答案、每個人的盤面不在封包裡', !!sk && sk.game.solution === undefined && sk.game.players === undefined && sk.game.board === null);
const ms = (await newT('mine', TA)).data.table;
await j(`/api/games/${dm.id}/${ms.id}`, { method: 'POST', body: { action: 'move', i: 40 } }, TA);
const msSeen = ((await j(`/api/games/${dm.id}`, {}, ADMIN)).data.tables || []).find((t) => t.id === ms.id);
check('踩地雷：翻開之後雷區也不在封包裡（別人看的也一樣）', !!msSeen && !JSON.stringify(msSeen).includes('layout') && msSeen.game.view.length === 81);
check('猜數字：答案不在封包裡', (await newT('guess', TA)).data.table?.game?.secret === null);
const mem = (await newT('memory', TA)).data.table;
check('記憶翻翻樂：蓋著的牌面不在封包裡', mem.game.cards.every((c) => c === null));
check('別人打不開我聊天室的小遊戲（404）', (await j(`/api/games/${dm.id}`, {}, TC)).status === 404);
check('別人不能在我的聊天室開桌、下棋、收桌（404）', (await newT('ooxx', TC)).status === 404
  && (await j(`/api/games/${dm.id}/${mem.id}`, { method: 'POST', body: { action: 'join' } }, TC)).status === 404
  && (await j(`/api/games/${dm.id}/${mem.id}`, { method: 'DELETE' }, TC)).status === 404);
const dmCg = (await j('/api/conversations', { method: 'POST', body: { type: 'dm', userId: adminUser.id } }, TC)).data.conversation;
check('拿自己聊天室的網址、別人的桌號也動不了（404）', (await j(`/api/games/${dmCg.id}/${mem.id}`, { method: 'POST', body: { action: 'join' } }, TC)).status === 404);
check('奇怪的遊戲名稱被擋（__proto__、constructor、toString）', (await newT('__proto__', TA)).status === 400 && (await newT('constructor', TA)).status === 400 && (await newT('toString', TA)).status === 400);
check('沒登入打不開小遊戲', (await j(`/api/games/${dm.id}`)).status === 401);
const gameWs = (cid, tok) => new Promise((done) => {
  let ws, opened = false;
  try { ws = new WebSocket(`${WSB}/ws?games=${cid}`, ['cim.v1', 'token.' + tok]); } catch { return done({ ok: false }); }
  const timer = setTimeout(() => { try { ws.close(); } catch {} done({ ok: opened }); }, 400);
  ws.onopen = () => { opened = true; };
  ws.onclose = () => { clearTimeout(timer); done({ ok: opened }); };
  ws.onerror = () => {};
});
check('別人連不上我聊天室的小遊戲即時連線', !(await gameWs(dm.id, TC)).ok);
// 管理員開著小遊戲頁面，A 開始解數獨：管理員收到的那一份一樣沒有答案、也看不到 A 的盤面
const gameEvs = await new Promise((done) => {
  const evs = [];
  const ws = new WebSocket(`${WSB}/ws?games=${dm.id}`, ['cim.v1', 'token.' + ADMIN]);
  ws.onmessage = (e) => evs.push(JSON.parse(e.data));
  ws.onopen = async () => {
    await j(`/api/games/${dm.id}/${sk.id}`, { method: 'POST', body: { action: 'start' } }, TA);
    setTimeout(() => { try { ws.close(); } catch {} done(evs); }, 400);
  };
  ws.onerror = () => {};
  setTimeout(() => done(evs), 3000);
});
const skEv = gameEvs.find((e) => e.type === 'gametable' && e.table?.id === sk.id);
check('即時連線送來的數獨也沒有答案、看不到 A 的盤面', !!skEv && skEv.table.game.solution === undefined && skEv.table.game.board === null && skEv.table.game.playing === 1,
  JSON.stringify(gameEvs.map((e) => e.type)));
// ▲ 小遊戲
// 表情泡泡（第二十一期）：只轉給同一座牧場的人，亂填的不轉，一秒最多一個
const emotesGot = await new Promise((done) => {
  const got = [];
  const rx = new WebSocket(`${WSB}/ws?farm=${dm.id}`, ['cim.v1', 'token.' + ADMIN]);
  const stop = setTimeout(() => done(got), 6000);
  rx.onmessage = (e) => { const m = JSON.parse(e.data); if (m.type === 'farm-emote') got.push(m); };
  rx.onopen = () => {
    const tx = new WebSocket(`${WSB}/ws?farm=${dm.id}`, ['cim.v1', 'token.' + TA]);
    tx.onopen = async () => {
      for (const e of [99, -1, 'x', 1.5, null, '__proto__']) tx.send(JSON.stringify({ t: 'emote', e }));
      tx.send(JSON.stringify({ t: 'emote', e: 2 }));
      tx.send(JSON.stringify({ t: 'emote', e: 3 })); // 太快了，不轉
      await new Promise((ok) => setTimeout(ok, 1100));
      tx.send(JSON.stringify({ t: 'emote', e: 4 }));
      setTimeout(() => { clearTimeout(stop); try { tx.close(); rx.close(); } catch {} done(got); }, 600);
    };
  };
});
check('表情：亂填的不轉、一秒最多一個，寫著是誰發的', JSON.stringify(emotesGot.map((m) => m.e)) === '[2,4]' && emotesGot.every((m) => m.userId === IA),
  JSON.stringify(emotesGot));
check('別人不能在我的牧場留言板留言、拿掉留言（404）', (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'note_add', text: '嗨' } }, TC)).status === 404
  && (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'note_del', id: 1 } }, TC)).status === 404);
const r0 = await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'buy_animal', kind: 'chicken', name: '\u202e花\u200b小\u0007' } }, TA);
check('動物名字裡的隱藏字元（反向文字、零寬、控制字元）會被拿掉', r0.status === 200 && r0.data.animals?.[0]?.name === '花小', JSON.stringify(r0.data.animals?.[0]?.name));
check('別人不能摸我牧場的動物（404）',
  (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'pet', animalId: r0.data.animals?.[0]?.id } }, TC)).status === 404);
check('送禮的東西亂填（原型鏈、飼料、種子）被擋', (await Promise.all(['crop:__proto__', 'prod:constructor', 'feed', 'seed:bokchoy', 'crop:']
  .map((item) => j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'gift', villager: 'ama', item } }, TA)))).every((x) => x.status === 400));
check('別人不能在我的牧場交委託、買工具（404）',
  (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'request_fill' } }, TC)).status === 404
  && (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'upgrade_tool', tool: 'can' } }, TC)).status === 404);
check('別人不能用我的牧場領節慶禮物、加行事曆（404）',
  (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'festival_claim' } }, TC)).status === 404
  && (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'festival_calendar' } }, TC)).status === 404
  && !((await j('/api/events', {}, TA)).data.events || []).some((e) => e.note === '家族牧場加的節慶'));
check('別人不能在我的牧場蓋房子、買加工機、拿加工品（404）',
  (await Promise.all([{ action: 'build', what: 'greenhouse' }, { action: 'buy_machine', machine: 'mayo' }, { action: 'machine_take', machine: 'mayo' },
    { action: 'till', x: 2, y: 2, map: 'gh' }].map((b) => j(`/api/farm/${dm.id}`, { method: 'POST', body: b }, TC)))).every((x) => x.status === 404));
check('加工機亂填（原型鏈、數量）被擋', (await Promise.all([
  { action: 'machine_put', machine: '__proto__', item: 'prod:egg', qty: 1 }, { action: 'buy_machine', machine: 'toString' },
  { action: 'build', what: 'constructor' }, { action: 'machine_put', machine: 'mayo', item: 'prod:egg', qty: -5 }]
  .map((b) => j(`/api/farm/${dm.id}`, { method: 'POST', body: b }, TA)))).every((x) => x.status === 400));
check('別人不能在我的牧場領養寵物、摸寵物、幫動物改名（404）',
  (await Promise.all([{ action: 'adopt_pet', pet: 'dog', name: '偷養' }, { action: 'pat', pet: 'dog' }, { action: 'rename_animal', animalId: r0.data.animals?.[0]?.id, name: '偷改' }]
    .map((b) => j(`/api/farm/${dm.id}`, { method: 'POST', body: b }, TC)))).every((x) => x.status === 404));
check('寵物名字裡的隱藏字元也會被拿掉', (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'adopt_pet', pet: 'cat', name: '\u202e咪\u200b咪' } }, TA)).data.pets?.cat?.name === '咪咪');
check('別人不能用我的牧場玩節慶活動（404）', (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'festival_play', score: 6 } }, TC)).status === 404);
check('別人不能在我的牧場種果樹、摘水果、買蜂箱、收蜂蜜（404）', (await Promise.all([{ action: 'buy_sapling', tree: 'guava' }, { action: 'plant_tree', spot: 0, tree: 'guava' },
  { action: 'pick', spot: 0 }, { action: 'buy_hive' }, { action: 'collect_honey', spot: 0 }].map((b) => j(`/api/farm/${dm.id}`, { method: 'POST', body: b }, TC)))).every((x) => x.status === 404));
check('別人不能在我的牧場逛夜市、幫動物報名選美、進洞窟、在海邊釣魚撿東西、交修復清單、拜拜泡溫泉、擺裝飾（404）', (await Promise.all([{ action: 'market', stall: 'goldfish', score: 3 },
  { action: 'market', stall: 'snack', food: 'tea' }, { action: 'beauty_enter', animalId: 1 }, { action: 'cave_go', floor: 1 },
  { action: 'cave_mine', floor: 1, x: 5, y: 5 }, { action: 'cave_chest', floor: 5 }, { action: 'forage', area: 'beach', x: 12, y: 9 },
  { action: 'fish', area: 'beach', x: 22, y: 0, hooked: true }, { action: 'donate', bundle: 'ores', item: 'ore:gold' }, { action: 'pray' }, { action: 'onsen' },
  { action: 'buy_deco', kind: 'bench' }, { action: 'place_deco', kind: 'bench', area: 'farm', x: 12, y: 5 }, { action: 'pickup_deco', id: 1 }].map((b) => j(`/api/farm/${dm.id}`, { method: 'POST', body: b }, TC)))).every((x) => x.status === 404));
check('牧場內容大小有上限（超大請求被擋）',
  (await j(`/api/farm/${dm.id}`, { method: 'POST', body: { action: 'till', x: 4, y: 9, junk: 'x'.repeat(5000) } }, TA)).status >= 400);

console.log('\n--- 非管理員越權 ---');
check('不能讀管理員設定', (await j('/api/admin/settings', {}, TA)).status === 403);
check('不能改邀請碼', (await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: 'hack' } }, TA)).status === 403);
check('不能下載整份聊天備份', (await j('/api/admin/export', {}, TA)).status === 403);
check('也不能分頁偷拿備份', (await j('/api/admin/export?after=0', {}, TA)).status === 403);
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

console.log('\n--- 圖片端點（簽章網址）---');
// 一張最小的合法 JPEG（1×1 灰點）
const TINY_JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';
const gconv = (await j('/api/conversations', { method: 'POST', body: { type: 'group', name: '相簿', memberIds: [IA, IC] } }, ADMIN)).data.conversation;
const imgMsg = (await j(`/api/conversations/${gconv.id}/messages`, { method: 'POST', body: { type: 'image', content: TINY_JPG } }, ADMIN)).data.message;
const mediaUrl = imgMsg.meta && imgMsg.meta.media;
const raw = async (path, token) => {
  const r = await fetch(B + path, { headers: token ? { authorization: 'Bearer ' + token } : {} });
  return { status: r.status, ctype: r.headers.get('content-type') || '', len: (await r.arrayBuffer()).byteLength };
};
check('訊息清單不再夾帶圖片內容', imgMsg.content === '' && typeof mediaUrl === 'string' && mediaUrl.startsWith('/api/media/'));
const good = await raw(mediaUrl);
check('簽章正確就拿得到圖（而且是二進位、不是 base64）', good.status === 200 && good.ctype === 'image/jpeg' && good.len > 0 && good.len < TINY_JPG.length);
check('沒有簽章不給拿', (await raw(`/api/media/${imgMsg.id}`)).status === 403);
// 把簽章第一個字換掉（本來就是 A 的話換成 B，不然網址根本沒變）
check('竄改簽章不給拿', (await raw(mediaUrl.replace(/&s=(.)/, (m, c) => '&s=' + (c === 'A' ? 'B' : 'A')))).status === 403);
check('改成別人的 id 不給拿（簽章綁了收件者）',
  (await raw(mediaUrl.replace(/u=\d+/, `u=${IC}`))).status === 403);
check('把到期日改長一點不給拿', (await raw(mediaUrl.replace(/e=\d+/, 'e=99999999999999'))).status === 403);
check('過期的網址不給拿', await (async () => {
  // 拿一個「已經過期」但其他部分合法的網址：伺服器先看到期日就會擋
  const expired = mediaUrl.replace(/e=\d+/, 'e=1');
  return (await raw(expired)).status === 403;
})());
check('不存在的訊息拿不到', (await raw(mediaUrl.replace(/\/api\/media\/\d+/, '/api/media/999999'))).status === 403);
// 把管理員以外的人移出聊天室後，他手上的舊網址要立刻失效
const cUrl = ((await j(`/api/conversations/${gconv.id}/messages`, {}, TC)).data.messages || [])
  .filter((m) => m.type === 'image').pop().meta.media;
check('成員自己的網址本來拿得到', (await raw(cUrl)).status === 200);
await j(`/api/conversations/${gconv.id}/leave`, { method: 'POST' }, TC);
check('退出聊天室後，手上的舊網址立刻失效', (await raw(cUrl)).status === 403);
// 收回訊息後也不該再拿得到
await j(`/api/messages/${imgMsg.id}/unsend`, { method: 'POST' }, ADMIN);
check('訊息收回後圖片也拿不到', (await raw(mediaUrl)).status === 404);

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
const dmC = (await j('/api/conversations', { method: 'POST', body: { type: 'dm', userId: adminUser.id } }, TC)).data.conversation;
// 被停用時，開著的牧場視窗要被伺服器斷線，之後也收不到這座牧場的消息。
// （瀏覽器會收到關閉代碼 4003；Node 內建的 WebSocket 在本機開發環境會停在「關閉中」，所以這裡看狀態）
const kws = new WebSocket(`${WSB}/ws?farm=${dmC.id}`, ['cim.v1', 'token.' + TC]);
const kmsgs = [];
let kcode = null;
kws.onmessage = (e) => kmsgs.push(JSON.parse(e.data).type);
kws.onclose = (e) => { kcode = e.code; };
kws.onerror = () => {};
const kOpened = await new Promise((ok) => { kws.onopen = () => ok(true); setTimeout(() => ok(false), 2000); });
await j(`/api/admin/users/${IC}`, { method: 'DELETE' }, ADMIN);
await new Promise((ok) => setTimeout(ok, 500));
const kState = kws.readyState;
const kBefore = kmsgs.length;
await j(`/api/farm/${dmC.id}`, { method: 'POST', body: { action: 'till', x: 4, y: 9 } }, ADMIN);
await new Promise((ok) => setTimeout(ok, 300));
check('被管理員停用後 token 立刻失效', (await j('/api/me', {}, TC)).status === 401);
check('被停用時開著的牧場視窗被伺服器斷線，之後收不到牧場消息',
  kOpened && (kcode === 4003 || kState >= 2) && kmsgs.length === kBefore,
  `opened=${kOpened} code=${kcode} state=${kState} 之後收到 ${kmsgs.length - kBefore} 則`);
try { kws.close(); } catch {}

await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: '' } }, ADMIN);
console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
