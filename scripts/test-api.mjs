#!/usr/bin/env node
// API 煙霧測試：驗證帳號可見性（隱私）規則與核心流程。
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

console.log('\n--- 小遊戲 ---');
const newGame = (kind, tok) =>
  j(`/api/conversations/${groupId}/messages`, { method: 'POST', body: { type: 'game', content: '', game: { kind } } }, tok);
const act = (mid, body, tok) => j(`/api/messages/${mid}/game`, { method: 'POST', body }, tok);

r = await newGame('ooxx', TA);
const ooxxId = r.data.message?.id;
check('開一局圈圈叉叉，開局者自動入座', r.status === 200 && r.data.message?.game?.seats?.[0] === IA);
check('不支援的遊戲被擋', (await newGame('chess', TA)).status === 400);
check('非成員不能在別人的聊天室開遊戲', (await j(`/api/conversations/${dmAdminA.id}/messages`, { method: 'POST', body: { type: 'game', content: '', game: { kind: 'ooxx' } } }, TB)).status === 404);
check('沒入座不能下', (await act(ooxxId, { action: 'move', i: 0 }, TC)).status === 403);
check('對手加入座位', (await act(ooxxId, { action: 'join' }, TB)).data.game?.seats?.[1] === IB);
check('座位滿了不能再加入', (await act(ooxxId, { action: 'join' }, TC)).status === 400);
await act(ooxxId, { action: 'move', i: 0 }, TA);
check('還沒輪到不能下', (await act(ooxxId, { action: 'move', i: 1 }, TA)).status === 400);
check('已經有子的格子不能下', (await act(ooxxId, { action: 'move', i: 0 }, TB)).status === 400);
await act(ooxxId, { action: 'move', i: 3 }, TB);
await act(ooxxId, { action: 'move', i: 1 }, TA);
await act(ooxxId, { action: 'move', i: 4 }, TB);
r = await act(ooxxId, { action: 'move', i: 2 }, TA);
check('連成一線就判勝', r.data.game?.winner === 0 && r.data.game?.score?.[0] === 1 && r.data.game?.line?.length === 3);
check('分出勝負後不能再下', (await act(ooxxId, { action: 'move', i: 5 }, TB)).status === 400);
r = await act(ooxxId, { action: 'restart' }, TB);
check('再來一局：換先手、戰績留著', r.data.game?.turn === 1 && r.data.game?.round === 2 && r.data.game?.score?.[0] === 1);

r = await newGame('2048', TA);
const g2048 = r.data.message?.id;
check('開一局 2048（開局兩格、開局者先操作）',
  r.data.message?.game?.tiles?.filter(Boolean).length === 2 && r.data.message?.game?.holder === IA);
check('不是操作者不能動', (await act(g2048, { action: 'move', dir: 'left' }, TB)).status === 403);
check('別人操作中不能硬搶', (await act(g2048, { action: 'claim' }, TB)).status === 400);
check('方向不合法被擋', (await act(g2048, { action: 'move', dir: 'sideways' }, TA)).status === 400);
check('操作者可以換手', (await act(g2048, { action: 'release' }, TA)).status === 200);
check('換手後別人接得到', (await act(g2048, { action: 'claim' }, TB)).data.game?.holder === IB);
check('接手後可以操作', (await act(g2048, { action: 'move', dir: 'left' }, TB)).status === 200);
r = await j(`/api/conversations/${groupId}/messages`, {}, TC);
check('讀訊息會一起帶出遊戲狀態',
  r.data.messages?.filter((m) => m.type === 'game').every((m) => m.game && m.game.kind));

// 收尾：關閉邀請碼
await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: '' } }, A0);

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
