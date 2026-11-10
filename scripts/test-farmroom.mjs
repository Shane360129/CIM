#!/usr/bin/env node
// 晴耕谷伺服器（FarmRoom）的測試：驗證、快照、走動轉送、搶同一格、睡覺換日、備份回復、離線摘要、存檔。
// 用法：rm -rf .wrangler/state && npm run dev，另開終端機：
//   npm run test:farmroom            # 第一輪（要乾淨的資料庫）
//   重開 npm run dev（不要刪資料）
//   npm run test:farmroom -- after-restart   # 確認重開後狀態還在
const B = process.env.BASE_URL || 'http://127.0.0.1:8787', WSB = B.replace(/^http/, 'ws'), PASS = 'pass123456';
const j = async (path, opts = {}, token) => {
  const r = await fetch(B + path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
let pass = 0, fail = 0;
const check = (label, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✅' : '❌'} ${label}${extra ? '  →  ' + extra : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 一條連線：收到的訊息都留著，wait() 等某一種訊息出現
function open(conv, token) {
  const ws = new WebSocket(`${WSB}/farm/ws?conv=${conv}`, ['farm.v1', 'token.' + token]);
  const c = { ws, log: [], closed: null, waiters: [] };
  ws.onmessage = (e) => { if (e.data === 'pong') return; const m = JSON.parse(e.data); c.log.push(m); c.waiters = c.waiters.filter((w) => !(w.test(m) && (w.resolve(m), true))); };
  ws.onclose = (e) => { c.closed = e.code; };
  c.opened = new Promise((res) => { ws.onopen = () => res(true); ws.onerror = () => res(false); });
  c.wait = (t, pred = () => true, ms = 4000) => new Promise((resolve) => {
    const test = (m) => m.t === t && pred(m), hit = c.log.find(test);
    if (hit) return resolve(hit);
    c.waiters.push({ test, resolve }); setTimeout(() => resolve(null), ms);
  });
  c.send = (m) => ws.send(JSON.stringify(m));
  c.clear = () => { c.log.length = 0; };
  return c;
}
const login = async (u) => (await j('/api/login', { body: { username: u, password: PASS } })).data;

if (process.argv[2] === 'after-restart') {
  const a = await login('fr_a'); const convs = (await j('/api/conversations', {}, a.token)).data.conversations;
  const b = await login('fr_b');
  const dm = convs.find((c) => c.type === 'dm' && c.members.length === 2 && c.members.some((m) => m.userId === b.user.id));
  const A = open(dm.id, a.token); const snap = await A.wait('snapshot');
  check('重開伺服器後：格子、天數、位置都還在', !!snap && snap.tiles.some((t) => t.x === 16 && t.y === 14) && snap.farm.day >= 2 && Math.abs(snap.you.x - 15.5) < 0.01, snap && `第 ${snap.farm.day} 天、${snap.tiles.length} 格、位置 ${snap.you.x},${snap.you.y}`);
  A.ws.close(); await sleep(200);
  console.log(`\n結果：${pass} 通過，${fail} 失敗`); process.exit(fail ? 1 : 0);
}

const a = (await j('/api/register', { body: { username: 'fr_a', password: PASS, displayName: '小晴' } })).data;
if (!a.token) { console.error('要用乾淨的資料庫：rm -rf .wrangler/state'); process.exit(2); }
await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: 'fr-inv' } }, a.token);
const b = (await j('/api/register', { body: { username: 'fr_b', password: PASS, displayName: '阿耕', inviteCode: 'fr-inv' } })).data;
const c3 = (await j('/api/register', { body: { username: 'fr_c', password: PASS, displayName: '路人', inviteCode: 'fr-inv' } })).data;
const dm = (await j('/api/conversations', { body: { type: 'dm', userId: b.user.id } }, a.token)).data.conversation;
const grp = (await j('/api/conversations', { body: { type: 'group', name: '三人', memberIds: [b.user.id, c3.user.id] } }, a.token)).data.conversation;
const memo = (await j('/api/conversations', { body: { type: 'dm', userId: a.user.id } }, a.token)).data.conversation;

// ---- 驗證 ----
check('沒有 token 連不上', (await j(`/api/farmroom/backups?conv=${dm.id}`)).status === 401);
check('假 token 連不上', (await j(`/api/farmroom/backups?conv=${dm.id}`, {}, 'x'.repeat(40))).status === 401);
check('不是成員連不上', (await j(`/api/farmroom/backups?conv=${dm.id}`, {}, c3.token)).status === 403);
check('群組不能開農場', (await j(`/api/farmroom/backups?conv=${grp.id}`, {}, a.token)).status === 403);
check('只有自己的記事本不能開農場', (await j(`/api/farmroom/backups?conv=${memo.id}`, {}, a.token)).status === 403);
check('自己帶 x-farm-auth 標頭冒充沒有用', (await j(`/api/farmroom/backups?conv=${dm.id}`, { headers: { 'x-farm-auth': encodeURIComponent(JSON.stringify({ convId: dm.id, user: { id: a.user.id, name: 'x' } })) } })).status === 401);
check('內部端點不對外', (await j(`/internal/farm-auth?conv=${dm.id}`, { headers: { 'x-farm-token': a.token } })).status === 404);
{ const X = open(dm.id, c3.token); check('不是成員的 WebSocket 被拒絕', (await X.opened) === false || X.closed != null || !(await X.wait('snapshot', undefined, 800))); try { X.ws.close(); } catch {} }

// ---- 快照、上線 ----
const A = open(dm.id, a.token); const sa = await A.wait('snapshot');
check('連上就收到快照', !!sa && sa.you.id === a.user.id && sa.players.length === 0 && sa.farm.day === 1 && sa.farm.minute >= 360 && sa.tiles.length === 0 && sa.partner.id === b.user.id, sa && JSON.stringify(sa.farm));
const Bc = open(dm.id, b.token); const sb = await Bc.wait('snapshot');
check('第二個人的快照裡看得到第一個人', !!sb && sb.players.length === 1 && sb.players[0].id === a.user.id);
check('第一個人收到「對方來了」', !!(await A.wait('join', (m) => m.p.id === b.user.id)));

// ---- 走動 ----
A.send({ t: 'move', x: 15.5, y: 12.5, dir: 'right', vx: 1, vy: 0 });
const mv = await Bc.wait('move', (m) => m.id === a.user.id);
check('走動會轉給對方（位置＋速度）', !!mv && mv.x === 15.5 && mv.y === 12.5 && mv.vx === 1 && mv.dir === 'right');
check('走動不會回送給自己', !A.log.some((m) => m.t === 'move'));
await sleep(60); A.send({ t: 'move', x: 99999, y: -5, dir: 'up', vx: 9, vy: 0 });
const mv2 = await Bc.wait('move', (m) => m.id === a.user.id && m.dir === 'up');
check('超出地圖的位置、太大的速度會被夾住', !!mv2 && mv2.x < 40 && mv2.y > 0 && mv2.vx === 1, mv2 && `${mv2.x},${mv2.y}`);
await sleep(60); A.send({ t: 'move', x: 15.5, y: 12.5, dir: 'down', vx: 0, vy: 0 });
await sleep(60); Bc.send({ t: 'move', x: 16.5, y: 12.5, dir: 'down', vx: 0, vy: 0 }); await A.wait('move', (m) => m.id === b.user.id);

// ---- 動作：伺服器把關、先到先得 ----
A.send({ t: 'act', id: 1, kind: 'till', x: 16, y: 14 }); Bc.send({ t: 'act', id: 1, kind: 'till', x: 16, y: 14 });
const ra = await A.wait(undefined, undefined, 1) || (await Promise.race([A.wait('ok', (m) => m.id === 1), A.wait('no', (m) => m.id === 1)]));
const rb = await Promise.race([Bc.wait('ok', (m) => m.id === 1), Bc.wait('no', (m) => m.id === 1)]);
check('兩人搶同一格：一個成功、一個被拒絕（already）', !!ra && !!rb && ra.t !== rb.t && [ra, rb].find((m) => m.t === 'no').reason === 'already', `${ra && ra.t}/${rb && rb.t}`);
check('結果廣播給兩個人', !!(await A.wait('tiles', (m) => m.list[0].x === 16 && m.list[0].t === 1)) && !!(await Bc.wait('tiles', (m) => m.list[0].x === 16)));
const act = async (c, id, kind, x, y) => { c.send({ t: 'act', id, kind, x, y }); return Promise.race([c.wait('ok', (m) => m.id === id), c.wait('no', (m) => m.id === id)]); };
check('太遠的格子不能做', (await act(A, 2, 'till', 21, 17)).reason === 'far');
check('不是田的地方不能翻土', (await act(A, 3, 'till', 15, 12)).reason === 'ground');
check('沒翻過的土不能澆水', (await act(A, 4, 'water', 15, 14)).reason === 'untilled');
check('澆水成功', (await act(A, 5, 'water', 16, 14)).t === 'ok' && !!(await Bc.wait('tiles', (m) => m.kind === 'water' && m.list[0].w === 1)));
check('同一天不能澆兩次', (await act(Bc, 6, 'water', 16, 14)).reason === 'already');
check('不認得的動作被拒絕', (await act(A, 7, 'nuke', 16, 14)).reason === 'unknown');
await act(A, 8, 'till', 15, 14);

// ---- 泡泡、表情 ----
A.send({ t: 'bubble', text: '  今天   種什麼？' + '好'.repeat(80) });
const bub = await Bc.wait('bubble'); check('聊天泡泡：去掉多餘空白、最多 40 個字', !!bub && bub.text.startsWith('今天 種什麼？') && bub.text.length === 40, bub && String(bub.text.length));
A.send({ t: 'emote', e: '😊' }); check('表情會送到', !!(await Bc.wait('emote', (m) => m.e === '😊')));
Bc.clear(); A.send({ t: 'emote', e: '<script>' }); await sleep(250); check('清單以外的表情不會送', !Bc.log.some((m) => m.t === 'emote'));

// ---- 睡覺、換日、備份 ----
A.clear(); Bc.clear(); A.send({ t: 'sleep', on: true });
check('一個人上床：對方看得到，還不會換日', !!(await Bc.wait('sleep', (m) => m.on)) && !(await A.wait('newday', undefined, 500)));
Bc.send({ t: 'sleep', on: true }); const nd = await A.wait('newday');
check('兩個人都上床才換日：第 2 天早上 6 點，澆的水乾了', !!nd && nd.farm.day === 2 && Math.abs(nd.farm.minute - 360) < 2 && nd.tiles.length === 2 && nd.tiles.every((t) => t.w === 0), nd && JSON.stringify(nd.farm));
const bk = (await j(`/api/farmroom/backups?conv=${dm.id}`, {}, a.token)).data.backups;
check('換日時自動備份', bk.length === 1 && bk[0].day === 1);
await act(A, 9, 'clear', 15, 14);
A.clear(); const rs = await j(`/api/farmroom/restore?conv=${dm.id}`, { body: { day: 1 } }, a.token); const rnd = await A.wait('newday', (m) => m.reason === 'restore');
check('可以回復到備份（第 1 天結束時：兩格都在）', rs.status === 200 && !!rnd && rnd.farm.day === 1 && rnd.tiles.length === 2, JSON.stringify(rs.data));
check('沒有的備份回復不了', (await j(`/api/farmroom/restore?conv=${dm.id}`, { body: { day: 99 } }, a.token)).status === 404);
A.clear(); Bc.clear(); A.send({ t: 'sleep', on: true }); Bc.send({ t: 'sleep', on: true }); await Bc.wait('newday', (m) => m.farm.day === 2); await A.wait('newday', (m) => m.farm.day === 2);

// ---- 離線、摘要、重連 ----
Bc.clear(); A.ws.close(); check('離線時對方收到通知', !!(await Bc.wait('leave', (m) => m.id === a.user.id)));
await act(Bc, 20, 'till', 17, 14); await act(Bc, 21, 'water', 17, 14);
Bc.send({ t: 'sleep', on: true }); await Bc.wait('newday', (m) => m.farm.day === 3);
check('只有一個人在線：他自己睡就換日', Bc.log.some((m) => m.t === 'newday' && m.farm.day === 3));
const A2 = open(dm.id, a.token); const s2 = await A2.wait('snapshot');
check('重新上線：位置還在、看得到離線時的變化', !!s2 && Math.abs(s2.you.x - 15.5) < 0.01 && s2.tiles.length === 3 && s2.farm.day === 3);
check('「你不在時發生的事」：過了 1 天、對方翻土 1 次澆水 1 次', !!s2 && !!s2.summary && s2.summary.days === 1 && s2.summary.acts.till === 1 && s2.summary.acts.water === 1, s2 && JSON.stringify(s2.summary));
const A3 = open(dm.id, a.token); await A3.wait('snapshot'); await sleep(300);
check('同一個人開第二個分頁：舊的收到 replaced，對方不會以為他離開', A2.log.some((m) => m.t === 'replaced') && !Bc.log.some((m) => m.t === 'leave' && m.id === a.user.id && Bc.log.indexOf(m) > Bc.log.findIndex((x) => x.t === 'newday')));
// 時鐘只在有人的時候走
const t0 = (await (async () => { const X = open(dm.id, a.token); const s = await X.wait('snapshot'); await sleep(200); return { X, s }; })());
A3.ws.close(); t0.X.ws.close(); Bc.ws.close(); await sleep(1500);
const A4 = open(dm.id, a.token); const s4 = await A4.wait('snapshot');
check('沒有人在線時時鐘不走', !!s4 && s4.farm.minute - t0.s.farm.minute < 1.2, s4 && `${t0.s.farm.minute.toFixed(2)} → ${s4.farm.minute.toFixed(2)}`);
await sleep(1500); A4.clear(); A4.send({ t: 'move', x: 15.5, y: 12.5, dir: 'down', vx: 0, vy: 0 });
A4.ws.close(); await sleep(300);
const A5 = open(dm.id, a.token); const s5 = await A5.wait('snapshot');
check('有人在線時時鐘會走（1.5 秒約 2 個遊戲分鐘）', !!s5 && s5.farm.minute - s4.farm.minute > 1.5 && s5.farm.minute - s4.farm.minute < 4, s5 && (s5.farm.minute - s4.farm.minute).toFixed(2));
A5.ws.close(); await sleep(300);
console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
