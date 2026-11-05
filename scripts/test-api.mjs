#!/usr/bin/env node
// API 煙霧測試：驗證帳號可見性（隱私）規則、聊天核心功能、待辦行事曆、管理員功能，以及速度與備份上限。
//
// 用法（需先在另一個終端機啟動本機伺服器）：
//   rm -rf .wrangler/state && npm run dev      # 乾淨資料庫，第一位註冊者自動成為管理員
//   npm test                                    # 預設打 http://127.0.0.1:8787
//
// 若資料庫已有資料，請提供既有管理員帳密：
//   TEST_ADMIN_USER=shane TEST_ADMIN_PASS=xxxxxx npm test

const B = process.env.BASE_URL || 'http://127.0.0.1:8787';
const PASS = 'pass123456';
const suffix = Date.now().toString(36).slice(-5);
const u = (n) => `t${suffix}_${n}`;

const j = async (path, opts = {}, token) => {
  const r = await fetch(B + path, {
    method: opts.method || 'GET',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const reg = (username, displayName, inviteCode) =>
  j('/api/register', { method: 'POST', body: { username, password: PASS, displayName, inviteCode } });
const seen = async (tok) => (await j('/api/users', {}, tok)).data.users.map((x) => x.username);
const has = (arr, name) => arr.includes(name);

let pass = 0, fail = 0;
const check = (label, ok, extra = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? '  →  ' + extra : ''}`);
};

const info = (await j('/api/app-info')).data;
let A0, adminUser;
if (info.firstRun) {
  const r = await reg(u('admin'), '測試管理員');
  A0 = r.data.token; adminUser = r.data.user;
  check('第一位註冊者自動成為管理員', !!adminUser?.isAdmin);
} else {
  const user = process.env.TEST_ADMIN_USER, pw = process.env.TEST_ADMIN_PASS;
  if (!user || !pw) {
    console.error('資料庫已有資料。請用乾淨資料庫（rm -rf .wrangler/state）或提供 TEST_ADMIN_USER / TEST_ADMIN_PASS。');
    process.exit(2);
  }
  const r = await j('/api/login', { method: 'POST', body: { username: user, password: pw } });
  if (r.status !== 200 || !r.data.user?.isAdmin) { console.error('管理員登入失敗或不是管理員'); process.exit(2); }
  A0 = r.data.token; adminUser = r.data.user;
}
const INVITE = 'test-' + suffix;
check('管理員設定邀請碼', (await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: INVITE } }, A0)).status === 200);

const fa = await reg(u('a'), '朋友A', INVITE);
const fb = await reg(u('b'), '朋友B', INVITE);
const fc = await reg(u('c'), '朋友C', INVITE);
check('朋友用邀請碼註冊', fa.status === 200 && fb.status === 200 && fc.status === 200);
check('沒有邀請碼不能註冊', (await reg(u('x'), 'X')).status >= 400);
const [TA, TB, TC] = [fa.data.token, fb.data.token, fc.data.token];
const [IA, IB, IC] = [fa.data.user.id, fb.data.user.id, fc.data.user.id];

console.log('\n--- 帳號可見性 ---');
const adminSees = await seen(A0);
check('管理員看得到所有新成員', has(adminSees, u('a')) && has(adminSees, u('b')) && has(adminSees, u('c')));
const aSees = await seen(TA);
check('朋友A 只看到管理員與自己', has(aSees, adminUser.username) && has(aSees, u('a')) && !has(aSees, u('b')) && !has(aSees, u('c')), aSees.join(', '));
let r = await j('/api/conversations', { method: 'POST', body: { type: 'dm', userId: IB } }, TA);
check('朋友A 私訊朋友B 被擋（403）', r.status === 403);
r = await j('/api/conversations', { method: 'POST', body: { type: 'group', name: '偷偷建群', memberIds: [IB, IC] } }, TA);
check('朋友A 建群拉 B、C 被擋（403）', r.status === 403);
r = await j('/api/conversations', { method: 'POST', body: { type: 'dm', userId: adminUser.id } }, TA);
check('朋友A 可以私訊管理員', r.status === 200);

console.log('\n--- 管理員把 A、B 拉進同一群組 ---');
r = await j('/api/conversations', { method: 'POST', body: { type: 'group', name: '測試群', memberIds: [IA, IB] } }, A0);
check('管理員建群', r.status === 200);
const groupId = r.data.conversation?.id;
check('朋友A 現在看得到 B', has(await seen(TA), u('b')));
check('朋友B 現在看得到 A', has(await seen(TB), u('a')));
check('朋友C 仍看不到 A、B', !has(await seen(TC), u('a')) && !has(await seen(TC), u('b')));
r = await j(`/api/conversations/${groupId}/members`, { method: 'POST', body: { userIds: [IC] } }, TA);
check('朋友A 想拉看不到的 C 進群被擋（403）', r.status === 403);
r = await j(`/api/conversations/${groupId}/members`, { method: 'POST', body: { userIds: [IC] } }, A0);
check('管理員可以拉 C 進群', r.status === 200);
check('C 進群後看得到 A、B', has(await seen(TC), u('a')) && has(await seen(TC), u('b')));

console.log('\n--- 訊息與權限 ---');
r = await j(`/api/conversations/${groupId}/messages`, { method: 'POST', body: { type: 'text', content: '哈囉' } }, TA);
check('群組傳訊息', r.status === 200);
const dmAdminA = (await j('/api/conversations', {}, TA)).data.conversations.find((c) => c.type === 'dm');
r = await j(`/api/conversations/${dmAdminA.id}/messages`, {}, TB);
check('朋友B 讀不到 A 與管理員的私訊（404）', r.status === 404);
check('無效 token → 401', (await j('/api/users', {}, 'bogus')).status === 401);
check('一般成員存取管理員設定 → 403', (await j('/api/admin/settings', {}, TA)).status === 403);
check('錯誤密碼登入 → 401', (await j('/api/login', { method: 'POST', body: { username: u('a'), password: 'wrong' } })).status === 401);
check('正確密碼登入 → 200', (await j('/api/login', { method: 'POST', body: { username: u('a'), password: PASS } })).status === 200);
r = await j('/api/shopping', { method: 'POST', body: { text: '測試品項 ' + suffix } }, TC);
check('購物清單附上建立者名稱', r.data.item?.createdByName === '朋友C');

console.log('\n--- 聊天核心功能 ---');
const postIn = (cid, body, tok) => j(`/api/conversations/${cid}/messages`, { method: 'POST', body }, tok);
const listIn = async (cid, tok) => (await j(`/api/conversations/${cid}/messages`, {}, tok)).data.messages || [];

r = await postIn(groupId, { type: 'text', content: '晚上回家吃飯嗎？' }, TA);
const askMsg = r.data.message;
check('傳文字訊息', r.status === 200 && askMsg?.content === '晚上回家吃飯嗎？');

r = await postIn(groupId, { type: 'text', content: '會！', replyTo: askMsg.id }, TB);
check('回覆會帶著被引用訊息的摘要', r.data.message?.meta?.reply?.text === '晚上回家吃飯嗎？');

r = await j(`/api/messages/${askMsg.id}/react`, { method: 'POST', body: { emoji: '👍' } }, TB);
check('表情回應', r.status === 200 && r.data.reactions?.some((x) => x.emoji === '👍' && x.users.includes(IB)));

r = await j(`/api/conversations/${groupId}/read`, { method: 'POST', body: { lastMessageId: askMsg.id } }, TC);
const readInfo = await j(`/api/conversations/${groupId}/messages`, {}, TA);
check('已讀進度有記錄', readInfo.data.members?.some((x) => x.userId === IC && x.lastReadId >= askMsg.id));

r = await postIn(groupId, { type: 'poll', content: '', poll: { q: '週末去哪？', options: ['爬山', '看電影'] } }, TA);
const pollMsg = r.data.message;
check('發起投票', r.status === 200 && pollMsg?.type === 'poll');
r = await j(`/api/messages/${pollMsg.id}/vote`, { method: 'POST', body: { opt: 1 } }, TB);
check('投票', r.status === 200 && r.data.votes?.some((v) => v.userId === IB && v.opt === 1));
check('投不存在的選項被擋', (await j(`/api/messages/${pollMsg.id}/vote`, { method: 'POST', body: { opt: 9 } }, TB)).status === 400);

r = await j(`/api/conversations/${groupId}/pin`, { method: 'POST', body: { messageId: askMsg.id } }, TA);
check('設定公告', r.status === 200);
check('公告出現在聊天室資訊裡',
  (await j(`/api/conversations/${groupId}/messages`, {}, TB)).data.pinned?.id === askMsg.id);

r = await postIn(groupId, { type: 'text', content: '打錯字了' }, TA);
const oops = r.data.message;
check('收回自己的訊息', (await j(`/api/messages/${oops.id}/unsend`, { method: 'POST' }, TA)).status === 200);
check('收回後內容清空', (await listIn(groupId, TB)).find((x) => x.id === oops.id)?.deleted === true);

r = await j('/api/search?q=' + encodeURIComponent('回家吃飯'), {}, TB);
check('搜尋得到群組裡的訊息', (r.data.results || []).some((x) => x.id === askMsg.id));

// 1×1 的 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
r = await postIn(groupId, { type: 'image', content: PNG }, TA);
const imgMsg = r.data.message;
check('傳照片後訊息只帶網址、不夾帶圖片內容', imgMsg?.content === '' && String(imgMsg?.meta?.media).startsWith('/api/media/'));
const fetched = await fetch(B + imgMsg.meta.media);
check('照片網址拿得到圖', fetched.status === 200 && fetched.headers.get('content-type') === 'image/png');
const convList = (await j('/api/conversations', {}, TB)).data.conversations || [];
check('聊天室清單的最後一則不夾帶圖片內容', convList.find((c) => c.id === groupId)?.lastMessage?.content === '');

const AUDIO = 'data:audio/webm;base64,' + Buffer.from('fake-audio').toString('base64');
r = await postIn(groupId, { type: 'audio', content: AUDIO, duration: 3 }, TA);
check('傳語音訊息', r.status === 200 && r.data.message?.meta?.duration === 3);

check('已移除的小遊戲訊息類型會被拒絕', (await postIn(groupId, { type: 'game', content: '', game: { kind: 'ooxx' } }, TA)).status === 400);

console.log('\n--- 貼圖、待辦、行事曆 ---');
r = await j('/api/stickers', { method: 'POST', body: { image: PNG } }, TA);
const stk = r.data.sticker;
check('新增自訂貼圖', r.status === 200 && !!stk?.id);
check('別人不能刪我的貼圖', (await j(`/api/stickers/${stk.id}`, { method: 'DELETE' }, TB)).status === 403);
check('自己可以刪自己的貼圖', (await j(`/api/stickers/${stk.id}`, { method: 'DELETE' }, TA)).status === 200);

r = await j('/api/shopping', { method: 'POST', body: { text: '買牛奶' } }, TA);
const item = r.data.item;
r = await j(`/api/shopping/${item.id}`, { method: 'PATCH', body: { done: true } }, TB);
check('待辦打勾並記下是誰完成的', r.data.item?.done === true && r.data.item?.doneByName === '朋友B');
check('刪除待辦', (await j(`/api/shopping/${item.id}`, { method: 'DELETE' }, TA)).status === 200);

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
r = await j('/api/events', { method: 'POST', body: { title: '阿嬤生日', date: tomorrow, time: '18:00', remindAt: Date.now() + 86400000 } }, TA);
const ev = r.data.event;
check('新增行事曆', r.status === 200 && ev?.title === '阿嬤生日' && ev?.reminded === false);
check('行事曆所有人都看得到', ((await j('/api/events', {}, TB)).data.events || []).some((x) => x.id === ev.id));
check('日期格式錯誤被擋', (await j('/api/events', { method: 'POST', body: { title: 'x', date: '明天', remindAt: Date.now() } }, TA)).status === 400);
check('刪除行事曆', (await j(`/api/events/${ev.id}`, { method: 'DELETE' }, TA)).status === 200);

console.log('\n--- 管理員 ---');
r = await j(`/api/admin/users/${IC}/reset-password`, { method: 'POST' }, A0);
const temp = r.data.tempPassword;
check('管理員幫成員重設密碼', r.status === 200 && typeof temp === 'string' && temp.length >= 6);
check('舊密碼不能用了', (await j('/api/login', { method: 'POST', body: { username: u('c'), password: PASS } })).status === 401);
check('臨時密碼可以登入', (await j('/api/login', { method: 'POST', body: { username: u('c'), password: temp } })).status === 200);
r = await j('/api/admin/export', {}, A0);
check('管理員可以下載備份', r.status === 200 && Array.isArray(r.data.users) && r.data.messageCount > 0);

console.log('\n--- 速度與備份上限（防止效能退步）---');
// 這段會放 30 張約 450KB 的照片進去，量「打開聊天室」與「取照片」的時間，並檢查備份每頁大小有上限。
// 門檻抓得很寬（正常值的十倍左右），只抓「慢了好幾倍」這種退步，不會因為電腦慢一點就失敗。
// 例：曾經因為列訊息時把每張照片整張解碼，打開這個聊天室從 21ms 變成 1289ms。
const SPEED_PHOTO = 'data:image/jpeg;base64,' + Buffer.alloc(460000, 7).toString('base64');
const speedConv = (await j('/api/conversations', { method: 'POST', body: { type: 'group', name: '速度測試', memberIds: [IA, IB] } }, A0)).data.conversation.id;
for (let k = 0; k < 30; k++)
  await j(`/api/conversations/${speedConv}/messages`, { method: 'POST', body: { type: 'image', content: SPEED_PHOTO } }, A0);
const medianMs = async (fn, reps = 7) => {
  const t = [];
  for (let k = 0; k < reps; k++) { const s0 = performance.now(); await fn(); t.push(performance.now() - s0); }
  return t.sort((x, y) => x - y)[Math.floor(reps / 2)];
};
let speedList;
const openMs = await medianMs(async () => { speedList = await j(`/api/conversations/${speedConv}/messages`, {}, A0); });
check(`打開 30 張照片的聊天室在 300ms 內（實測 ${openMs.toFixed(0)}ms）`, openMs < 300);
const speedMedia = speedList.data.messages.find((m) => m.type === 'image')?.meta?.media;
const photoMs = await medianMs(() => fetch(B + speedMedia).then((res) => res.arrayBuffer()));
check(`取一張照片在 50ms 內（實測 ${photoMs.toFixed(0)}ms）`, photoMs < 50);
// 備份：每頁內容要有上限（伺服器記憶體 128MB；一次全拿的話照片一多就會失敗）
const exMeta = (await j('/api/admin/export', {}, A0)).data;
let exAfter = 0, exTotal = 0, exMaxPage = 0;
for (;;) {
  const res = await fetch(`${B}/api/admin/export?after=${exAfter}`, { headers: { authorization: 'Bearer ' + A0 } });
  const text = await res.text();
  const page = JSON.parse(text);
  exTotal += page.messages.length;
  exMaxPage = Math.max(exMaxPage, text.length);
  if (page.next == null) break;
  exAfter = page.next;
}
check(`備份分頁拿完全部訊息（${exTotal} / ${exMeta.messageCount}）`, exTotal === exMeta.messageCount);
check(`備份每頁不超過 10.5MB（最大一頁 ${(exMaxPage / 1048576).toFixed(1)}MB）`, exMaxPage <= 10.5 * 1048576);

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
