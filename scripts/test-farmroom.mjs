#!/usr/bin/env node
// 晴耕谷伺服器（FarmRoom）的測試：驗證、快照、走動轉送、搶同一格、睡覺換日、備份回復、離線摘要、存檔。
// 用法：rm -rf .wrangler/state && npm run dev，另開終端機：
//   npm run test:farmroom            # 第一輪（要乾淨的資料庫）
//   重開 npm run dev（不要刪資料）
//   npm run test:farmroom -- after-restart   # 確認重開後狀態還在
//   停掉 npm run dev → node scripts/corrupt-farm-save.mjs farm（再跑一次 player、chunk）→ 重開 → npm run test:farmroom -- after-corrupt   # 存檔壞掉也打得開
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
  ws.onmessage = (e) => { if (e.data === 'pong') return; const m = JSON.parse(e.data); c.log.push(m);
    if (m.t === 'snapshot') { c.self = m.self; c.farm = m.farm; c.objs = m.objs; c.you = m.you; } if (m.t === 'self') c.self = m; if (m.t === 'newday') { c.self = m.self; c.farm = m.farm; c.you = m.you; } if (m.t === 'farm') Object.assign(c.farm || {}, m); c.waiters = c.waiters.filter((w) => !(w.test(m) && (w.resolve(m), true))); };
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
  check('重開伺服器後：天數、格子、背包、錢、所在的地圖、造型都還在', !!snap && snap.farm.day >= 6 && snap.tiles.length >= 1 && snap.self.inv.some((x) => x && x.id === 'seed_strawberry') && snap.farm.animals.length === 1 && snap.you.map === 'house' && !!snap.you.look, snap && `第 ${snap.farm.day} 天、${snap.tiles.length} 格、${snap.farm.money} 元、${snap.objs.length} 個東西`);
  A.ws.close(); await sleep(200);
  console.log(`\n結果：${pass} 通過，${fail} 失敗`); process.exit(fail ? 1 : 0);
}

if (process.argv[2] === 'after-corrupt') {
  const a = await login('fr_a'), b = await login('fr_b'); const convs = (await j('/api/conversations', {}, a.token)).data.conversations;
  const dm = convs.find((c) => c.type === 'dm' && c.members.length === 2 && c.members.some((m) => m.userId === b.user.id));
  const backups = (await j(`/api/farmroom/backups?conv=${dm.id}`, {}, a.token)).data.backups || [];
  const A = open(dm.id, a.token); const snap = await A.wait('snapshot');
  check('存檔主檔壞掉：農場照樣打得開，回到最近一份每日備份，錢和田都在', !!snap && backups.length > 0 && snap.farm.day === backups[0].day && snap.farm.money > 0 && snap.tiles.length >= 1, snap ? `第 ${snap.farm.day} 天、${snap.farm.money} 元、${snap.tiles.length} 格、備份 ${backups.map((x) => x.day).join()}` : '沒有快照');
  check('角色資料壞掉的那個人：當成新玩家重新發工具，不會卡住', !!snap && snap.self.inv.some((x) => x && x.id === 'hoe'));
  const Bc = open(dm.id, b.token); const sb = await Bc.wait('snapshot');
  check('另一個人的背包沒有受影響；壞掉之後還能繼續玩（翻土或澆水有回應）', !!sb && sb.self.inv.filter(Boolean).length >= 7 && ['ok', 'no'].includes((await new Promise((res) => { A.ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id === 9001) res(m.t); }); A.send({ t: 'note', text: 'x', id: 9001 }); setTimeout(() => res('none'), 3000); }))));
  A.ws.close(); Bc.ws.close(); await sleep(200);
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
check('連上就收到快照：第 1 天早上 6 點、春天、晴天、500 元', !!sa && sa.you.id === a.user.id && sa.you.map === 'farm' && sa.players.length === 0 && sa.farm.day === 1 && sa.farm.minute >= 360 && sa.farm.season === 'spring' && sa.farm.weather === 'sun' && sa.farm.money === 500 && sa.tiles.length === 0 && sa.partner.id === b.user.id, sa && JSON.stringify({ ...sa.farm, chest: 0 }));
const has = (c, id) => (c.self.inv.find((x) => x && x.id === id) || { n: 0 }).n, slot = (c, id) => c.self.inv.findIndex((x) => x && x.id === id);
check('新玩家有五樣工具和一點種子、體力 100', ['hoe', 'can', 'axe', 'pick', 'sickle'].every((t) => has(A, t) === 1) && has(A, 'seed_carrot') === 8 && sa.self.energy === 100);
check('農場上有樹、石頭、樹枝、雜草可以清', ['tree', 'rock', 'branch', 'weed'].every((t) => sa.objs.some((o) => o.type === t && o.map === 'farm')));
const Bc = open(dm.id, b.token); const sb = await Bc.wait('snapshot');
check('第二個人的快照裡看得到第一個人', !!sb && sb.players.length === 1 && sb.players[0].id === a.user.id);
check('第一個人收到「對方來了」', !!(await A.wait('join', (m) => m.p.id === b.user.id)));

// ---- 走動 ----
const go = async (c, x, y, dir = 'down') => { await sleep(50); c.send({ t: 'move', x, y, dir, vx: 0, vy: 0 }); await sleep(50); };
A.send({ t: 'move', x: 15.5, y: 11.5, dir: 'right', vx: 1, vy: 0 });
const mv = await Bc.wait('move', (m) => m.id === a.user.id);
check('走動會轉給對方（位置＋速度）', !!mv && mv.x === 15.5 && mv.y === 11.5 && mv.vx === 1 && mv.dir === 'right' && mv.map === 'farm');
check('走動不會回送給自己', !A.log.some((m) => m.t === 'move'));
await sleep(60); A.send({ t: 'move', x: 99999, y: -5, dir: 'up', vx: 9, vy: 0 });
const mv2 = await Bc.wait('move', (m) => m.id === a.user.id && m.dir === 'up');
check('超出地圖的位置、太大的速度會被夾住', !!mv2 && mv2.x < 44 && mv2.y > 0 && mv2.vx === 1, mv2 && `${mv2.x},${mv2.y}`);

// ---- 動作：伺服器把關、先到先得 ----
// 田是 x 14～29、y 12～21；找三格沒有東西擋著、連在一起的田
const blocked = new Set(sa.objs.filter((o) => o.map === 'farm').map((o) => o.x + ',' + o.y));
let F = null; for (let y = 13; y < 21 && !F; y++) for (let x = 15; x < 27 && !F; x++) if ([0, 1, 2].every((d) => !blocked.has((x + d) + ',' + y))) F = { x, y };
let rid = 100; const req = async (c, msg) => { const id = ++rid; c.send({ ...msg, id }); return Promise.race([c.wait('ok', (m) => m.id === id), c.wait('no', (m) => m.id === id)]); };
const use = (c, item, x, y) => req(c, { t: 'use', slot: slot(c, item), x, y });
await go(A, F.x + 0.5, F.y - 0.5); await go(Bc, F.x + 1.5, F.y - 0.5);
A.send({ t: 'use', id: 1, slot: slot(A, 'hoe'), x: F.x, y: F.y }); Bc.send({ t: 'use', id: 1, slot: slot(Bc, 'hoe'), x: F.x, y: F.y });
const ra = await Promise.race([A.wait('ok', (m) => m.id === 1), A.wait('no', (m) => m.id === 1)]), rb = await Promise.race([Bc.wait('ok', (m) => m.id === 1), Bc.wait('no', (m) => m.id === 1)]);
check('兩人搶同一格翻土：一個成功、一個被拒絕（already）', !!ra && !!rb && ra.t !== rb.t && [ra, rb].find((m) => m.t === 'no').reason === 'already', `${ra && ra.t}/${rb && rb.t}`);
check('結果廣播給兩個人，對方看得到動作', !!(await A.wait('tiles', (m) => m.list[0].x === F.x && m.list[0].t === 1)) && !!(await Bc.wait('tiles', (m) => m.list[0].x === F.x)) && !!(await Bc.wait('fx', (m) => m.kind === 'till')));
check('翻土花體力（只扣成功的那個人）', A.self.energy + Bc.self.energy === 198, `${A.self.energy}+${Bc.self.energy}`);
check('太遠的格子不能做', (await use(A, 'hoe', F.x + 9, F.y + 5)).reason === 'far');
await go(A, 12.5, 14.5); check('不是田的地方不能翻土', (await use(A, 'hoe', 12, 15)).reason === 'ground');
await go(A, 15.5, 23.5); check('還沒開墾的地不能翻土', (await use(A, 'hoe', 15, 24)).reason === 'locked');
await go(A, F.x + 0.5, F.y - 0.5);
check('沒翻過的土不能澆水、不能播種', (await use(A, 'can', F.x + 2, F.y)).reason === 'untilled' && (await use(A, 'seed_carrot', F.x + 2, F.y)).reason === 'untilled');
check('播種：種子少一顆，格子上有剛種下的作物', (await use(A, 'seed_carrot', F.x, F.y)).t === 'ok' && has(A, 'seed_carrot') === 7 && !!(await Bc.wait('tiles', (m) => m.kind === 'plant' && m.list[0].c && m.list[0].c.id === 'carrot' && m.list[0].c.s === 0)));
check('已經種了不能再種', (await use(A, 'seed_spinach', F.x, F.y)).reason === 'already');
check('澆水成功', (await use(A, 'can', F.x, F.y)).t === 'ok' && !!(await Bc.wait('tiles', (m) => m.kind === 'water' && m.list[0].w === 1)));
check('同一天不能澆兩次', (await use(Bc, 'can', F.x, F.y)).reason === 'already');
await use(A, 'hoe', F.x + 1, F.y); await use(A, 'seed_carrot', F.x + 1, F.y); // 第二格：種了但不澆水
check('還沒成熟不能收成、有作物的土不能整平', (await use(A, 'axe', F.x, F.y)).reason === 'nothing' && (await use(A, 'pick', F.x, F.y)).reason === 'crop');
// 清障礙：要用對的工具
const near = (type) => sa.objs.filter((o) => o.map === 'farm' && o.type === type).sort((p, q) => Math.hypot(p.x - F.x, p.y - F.y) - Math.hypot(q.x - F.x, q.y - F.y))[0];
const weed = near('weed'), rock = near('rock'), tree = near('tree');
await go(A, weed.x + 0.5, weed.y + 1.4);
check('雜草用鋤頭清不掉，會說要用鐮刀', (await use(A, 'hoe', weed.x, weed.y)).reason === 'tool:sickle');
Bc.clear(); check('鐮刀割雜草：東西消失、拿到纖維、對方也看到', (await use(A, 'sickle', weed.x, weed.y)).t === 'ok' && has(A, 'fiber') === 1 && !!(await Bc.wait('objs', (m) => m.list[0].x === weed.x && m.list[0].type === null)));
await go(A, rock.x + 0.5, rock.y + 1.4); const r1 = await use(A, 'pick', rock.x, rock.y);
check('石頭要敲兩下：第一下還在', r1.t === 'ok' && has(A, 'stone') === 0); await use(A, 'pick', rock.x, rock.y);
check('第二下敲碎，拿到石頭', has(A, 'stone') === 2);
await go(A, tree.x + 0.5, tree.y + 1.4); for (let i = 0; i < 5; i++) await use(A, 'axe', tree.x, tree.y);
check('樹砍五下倒下，拿到木材和樹液，採集有經驗', has(A, 'wood') === 6 && has(A, 'sap') === 1 && A.self.skills.foraging > 0, JSON.stringify(A.self.skills));
check('清掉的地方可以走過去翻土嗎（東西真的不見了）', (await use(A, 'axe', tree.x, tree.y)).reason !== 'tool:axe');
const e0 = A.self.energy; check('做事會累：體力變少了', e0 < 100, String(e0));
check('不認得的格子座標被拒絕', (await req(A, { t: 'use', slot: 0, x: 'a', y: 3 })).reason === 'out');
// ---- 採集、釣魚 ----
const fo = sa.objs.find((o) => o.map === 'farm' && o.type === 'forage');
check('農場上每天有這一季的採集物', !!fo && ['wildberry', 'dandelion', 'wild_scallion', 'fern_shoot', 'bamboo_shoot'].includes(fo.item), fo && fo.item);
await go(A, fo.x + 0.5, fo.y + 1.2); const fx0 = A.self.skills.foraging; Bc.clear();
check('採集物手上拿什麼都能撿：背包多一個、採集有經驗、對方看到它不見', (await use(A, 'hoe', fo.x, fo.y)).t === 'ok' && has(A, fo.item) === 1 && A.self.skills.foraging === fx0 + 3 && !!(await Bc.wait('objs', (m) => m.list[0].x === fo.x && m.list[0].type === null)));
await go(A, 31.5, 6.5, 'right'); // 池塘在 x 32～38、y 4～8
check('沒拿釣竿不能釣、不是水面不能釣、太遠不能釣', (await req(A, { t: 'fish', slot: slot(A, 'hoe'), x: 32, y: 6 })).reason === 'tool:rod' && (await req(A, { t: 'fish', slot: slot(A, 'rod'), x: 30, y: 6 })).reason === 'ground' && (await req(A, { t: 'fish', slot: slot(A, 'rod'), x: 38, y: 6 })).reason === 'far');
Bc.clear(); const c1 = await req(A, { t: 'fish', slot: slot(A, 'rod'), x: 32, y: 6 });
check('拋竿：伺服器回多久上鉤和難度，對方看得到你在釣魚', c1.t === 'ok' && c1.wait >= 1500 && c1.wait <= 5000 && c1.diff >= 1 && !!(await Bc.wait('fx', (m) => m.kind === 'cast' && m.x === 32)));
check('還沒上鉤就說釣到了：不算', (await req(A, { t: 'reel', win: true })).reason === 'gone');
const c2 = await req(A, { t: 'fish', slot: slot(A, 'rod'), x: 32, y: 6 }); await sleep(c2.wait + 120); const rl = await req(A, { t: 'reel', win: true });
check('上鉤後拉上來：背包多一條（魚有尺寸和紀錄，釣魚有經驗；也可能是水草）', rl.t === 'ok' && !!rl.got && has(A, rl.got.id) === 1 && (rl.got.id === 'junk' || (rl.got.size > 0 && rl.got.record && A.self.fishRec[rl.got.id.slice(5)] === rl.got.size && A.self.skills.fishing > 0)), JSON.stringify(rl.got));
// 兩個人才釣得到的魚：對方在旁邊也放了竿，後下竿的那個人這一竿就是比翼魚；一天一條
const cA = await req(A, { t: 'fish', slot: slot(A, 'rod'), x: 32, y: 6 }); await go(Bc, 31.5, 5.5, 'right');
const cB = await req(Bc, { t: 'fish', slot: slot(Bc, 'rod'), x: 32, y: 5 }); await sleep(Math.max(cA.wait, cB.wait) + 150);
const rB = await req(Bc, { t: 'reel', win: true }); await req(A, { t: 'reel', win: false });
check('兩個人並肩下竿：先下的那竿照常，後下的那竿是比翼魚（難度 4），拉上來記進紀念冊', cA.duo === false && cB.duo === true && cB.diff === 4 && rB.t === 'ok' && rB.got.id === 'fish_twin' && rB.got.size >= 45 && !!(await A.wait('stat', (m) => m.key === 'duofish')), JSON.stringify([cA, cB, rB.got]));
const cA2 = await req(A, { t: 'fish', slot: slot(A, 'rod'), x: 32, y: 6 }), cB2 = await req(Bc, { t: 'fish', slot: slot(Bc, 'rod'), x: 32, y: 5 }); await sleep(Math.max(cA2.wait, cB2.wait) + 150);
check('比翼魚一天只有一條：同一天再一起下竿就是普通的魚', cB2.duo === false && (await req(Bc, { t: 'reel', win: false })).t === 'ok' && (await req(A, { t: 'reel', win: false })).t === 'ok');
const cf3 = await req(A, { t: 'fish', slot: slot(A, 'rod'), x: 32, y: 6 }); await sleep(cf3.wait + 120); const n3 = A.self.inv.filter(Boolean).reduce((n, x) => n + x.n, 0);
check('小遊戲沒過：什麼都沒拿到', (await req(A, { t: 'reel', win: false })).got === null && A.self.inv.filter(Boolean).reduce((n, x) => n + x.n, 0) === n3);
check('沒有拋竿就收竿：不算', (await req(A, { t: 'reel', win: true })).reason === 'gone');
// ---- 製作台、加工機 ----
// 乾燥架要木材 12、樹枝 6：再砍一棵樹、劈六根樹枝
const tree2 = sa.objs.filter((o) => o.map === 'farm' && o.type === 'tree' && !(o.x === tree.x && o.y === tree.y)).sort((p, q) => Math.hypot(p.x - 20, p.y - 16) - Math.hypot(q.x - 20, q.y - 16))[0];
await go(A, tree2.x + 0.5, tree2.y + 1.4); for (let i = 0; i < 5; i++) await use(A, 'axe', tree2.x, tree2.y);
for (const br of sa.objs.filter((o) => o.map === 'farm' && o.type === 'branch').slice(0, 6)) { await go(A, br.x + 0.5, br.y + 1.4); await use(A, 'axe', br.x, br.y); }
check('離製作台太遠不能做、沒有的機器不能做', (await req(A, { t: 'craft', kind: 'dryer' })).reason === 'far' && (await (async () => { await go(A, 14.5, 10.4); return req(A, { t: 'craft', kind: 'robot' }); })()).reason === 'unknown');
check('材料不夠不能做', (await req(A, { t: 'craft', kind: 'jam' })).reason === 'materials');
const w0 = has(A, 'wood'); check('做乾燥架：木材少 12、樹枝少 6，背包多一台', (await req(A, { t: 'craft', kind: 'dryer' })).t === 'ok' && has(A, 'm_dryer') === 1 && has(A, 'wood') === w0 - 12 && has(A, 'branch') === 0, `${w0} → ${has(A, 'wood')}`);
check('加工機不能放在田裡', (await (async () => { await go(A, F.x + 0.5, F.y - 0.5); return use(A, 'm_dryer', F.x + 2, F.y); })()).reason === 'place');
await go(A, 16.5, 10.4); Bc.clear();
check('放在空地上：對方看得到多了一台機器', (await use(A, 'm_dryer', 16, 10)).t === 'ok' && has(A, 'm_dryer') === 0 && !!(await Bc.wait('objs', (m) => m.list[0].type === 'machine' && m.list[0].kind === 'dryer' && m.list[0].x === 16)));
const wrong = await use(A, 'stone', 16, 10); check('不對的原料放不進去', wrong.reason === 'machine', JSON.stringify(wrong).slice(0, 200) + ' 石頭在第 ' + slot(A, 'stone') + ' 格');
const put = await use(A, fo.item, 16, 10); check('放採集物進去開始曬：背包少一個，機器記下什麼時候好 ' + JSON.stringify(put).slice(0, 160) + ' 有 ' + has(A, fo.item), put.t === 'ok' && has(A, fo.item) === 0 && !!(await Bc.wait('objs', (m) => m.list[0].out === `g:dryer:${fo.item}` && m.list[0].doneAt > 0)));
const busy = await use(A, 'hoe', 16, 10); check('還沒好不能拿，會說還要多久', busy.reason === 'busy' && busy.left > 800 && busy.left <= 900, String(busy.left));
// 背包搬位置
const s1 = slot(A, 'wood'); await req(A, { t: 'swap', slot: s1, b: 20 }); check('背包可以搬位置', A.self.inv[20] && A.self.inv[20].id === 'wood' && !A.self.inv[s1]);

// ---- 雙人：合力搬超大樹根、便條板、互送東西 ----
await go(A, 24.5, 22.4); await go(Bc, 25.4, 22.4);
check('超大樹根用錯工具不行', (await use(A, 'pick', 24, 23)).reason === 'tool:axe');
Bc.clear(); const p1 = await use(A, 'axe', 24, 23), p1b = await use(A, 'axe', 24, 23);
check('一個人砍不動：要等對方（對方會看到你在搬）；同一個人連按也沒用', p1.t === 'ok' && p1.waiting === true && p1b.waiting === true && !!(await Bc.wait('fx', (m) => m.kind === 'push')));
A.clear(); const p2 = await use(Bc, 'axe', 24, 23);
check('對方在幾秒內也動手：樹根搬開了，東西給後動手的人，兩邊都看到它不見', p2.t === 'ok' && !p2.waiting && has(Bc, 'wood') === 25 && has(Bc, 'sap') === 3 && !!(await A.wait('objs', (m) => m.list[0].x === 24 && m.list[0].type === null)));
check('離便條板太遠不能留言', (await req(A, { t: 'note', text: '記得澆水' })).reason === 'far');
await go(A, 13.5, 10.4); Bc.clear();
check('留便條：對方收到；空白的不行；太長會截短', (await req(A, { t: 'note', text: '  記得   澆水喔 ' })).t === 'ok' && (await Bc.wait('notes')).notes[0].text === '記得 澆水喔' && !!(await Bc.wait('stat', (m) => m.key === 'note')) && (await req(A, { t: 'note', text: '   ' })).reason === 'slot' && (await req(A, { t: 'note', text: '好'.repeat(200) })).t === 'ok' && (await Bc.wait('notes', (m) => m.notes.length === 2)).notes[1].text.length === 60);
Bc.clear();
check('一天的長度（兩人共用的設定）：只能選設定檔列的幾種；改了兩邊的時鐘速度一起變，時間不會跳', (await req(A, { t: 'set', key: 'dayLen', value: 7 })).reason === 'unknown' && (await req(A, { t: 'set', key: 'money', value: 15 })).reason === 'unknown' && (await req(A, { t: 'set', key: 'dayLen', value: 30 })).t === 'ok' && Math.abs((await Bc.wait('opts')).minutesPerSecond - 1200 / 1800) < 1e-6 && (await req(A, { t: 'set', key: 'dayLen', value: 15 })).t === 'ok');
check('對方站太遠不能送東西', (await req(A, { t: 'give', slot: slot(A, 'fiber'), n: 1 })).reason === 'far');
await go(Bc, 12.5, 10.6); Bc.clear();
check('站在一起可以送：我少一個、對方多一個並收到通知', (await req(A, { t: 'give', slot: slot(A, 'fiber'), n: 1 })).t === 'ok' && has(A, 'fiber') === 0 && !!(await Bc.wait('given', (m) => m.item === 'fiber' && m.n === 1)) && has(Bc, 'fiber') === 1);
// ---- 出貨箱（在家門口旁邊 12,9）----
await go(A, 20.5, 14.5);
check('離出貨箱太遠不能出貨', (await req(A, { t: 'ship', slot: 20, n: 99 })).reason === 'far');
await go(A, 12.5, 10.4);
check('工具不能賣', (await req(A, { t: 'ship', slot: slot(A, 'hoe'), n: 1 })).reason === 'unsellable');
Bc.clear(); check('木材放進出貨箱：背包少了，兩個人都看得到箱子裡有什麼', (await req(A, { t: 'ship', slot: 20, n: 4 })).t === 'ok' && has(A, 'wood') === 2 && !!(await Bc.wait('farm', (m) => m.ship.length === 1 && m.ship[0].id === 'wood' && m.ship[0].n === 4)));

// ---- 換地圖、種子攤 ----
check('沒走到出入口不能換地圖', (await req(A, { t: 'warp', i: 0 })).reason === 'far');
await go(A, 42.5, 16); Bc.clear();
check('走到東邊的出口：到「往小鎮的路」，對方看到你離開', (await req(A, { t: 'warp', i: 0 })).t === 'ok' && !!(await Bc.wait('warp', (m) => m.id === a.user.id && m.map === 'road')));
// ---- 小鎮與居民 ----
await go(A, 28.5, 7);
check('路的東邊通到小鎮', (await req(A, { t: 'warp', i: 1 })).t === 'ok' && A.log.some((m) => m.t === 'warp' && m.id === a.user.id && m.map === 'town'));
check('沒有的居民、還沒寫好的居民不能聊；站太遠也不行', (await req(A, { t: 'talk', npc: 'nobody' })).reason === 'unknown' && (await req(A, { t: 'talk', npc: 'yunxiu' })).reason === 'unknown' && (await req(A, { t: 'talk', npc: 'ahe' })).reason === 'far');
await go(A, 6.5, 25.5); // 早上 8 點前阿禾在家門口（6.5, 24.5）
const tk = await req(A, { t: 'talk', npc: 'ahe' }), tk2 = await req(A, { t: 'talk', npc: 'ahe' });
check('第一次見面：好感 +20；同一天再聊不會再加', tk.t === 'ok' && tk.first === true && tk.daily === true && tk.pts === 20 && tk2.first === false && tk2.daily === false && tk2.pts === 20 && A.self.friend.ahe.pts === 20);
check('工具不能送', (await req(A, { t: 'gift', npc: 'ahe', slot: slot(A, 'hoe') })).reason === 'slot');
const gf = await req(A, { t: 'gift', npc: 'ahe', slot: slot(A, 'stone') });
check('送他討厭的東西（石頭）：東西少一個、好感倒扣', gf.t === 'ok' && gf.taste === 'dislike' && gf.pts === 0 && has(A, 'stone') === 1, JSON.stringify(gf));
check('一天只能送一次', (await req(A, { t: 'gift', npc: 'ahe', slot: slot(A, 'stone') })).reason === 'giftday');
check('好感是各算各的：另一個人沒有紀錄', !Bc.self.friend || !Bc.self.friend.ahe);
// 小鎮的店、鐵匠鋪、佈告欄
await go(A, 7, 9.7);
check('雜貨店早上 8 點才開：現在買不到；不在漁具店旁邊不能買漁具', (await req(A, { t: 'buy', shop: 'store', item: 'seed_cauliflower', n: 1 })).reason === 'closed' && (await req(A, { t: 'buy', shop: 'tackle', item: 'rod_fiber', n: 1 })).reason === 'far');
await go(A, 14, 9.7); const m1 = A.farm.money; const din = await req(A, { t: 'buy', shop: 'diner', item: 'dish_salad', n: 1 });
check('餐館早上 7 點開：' + (din.t === 'ok' ? '買一份生菜沙拉，錢變少、背包多一份' : '還沒開'), din.t === 'ok' ? has(A, 'dish_salad') === 1 && A.farm.money < m1 : din.reason === 'closed');
if (din.t === 'ok') { const e9 = A.self.energy; const ea = await req(A, { t: 'eat', slot: slot(A, 'dish_salad') }); check('吃掉補體力', ea.t === 'ok' && A.self.energy >= e9 && has(A, 'dish_salad') === 0); A.farm.money = m1; }
await go(A, 30, 9.7);
check('鐵匠鋪：沒有的工具不能升、沒有錠不能升', (await req(A, { t: 'upgrade', tool: 'spoon' })).reason === 'unknown' && ['materials', 'money'].includes((await req(A, { t: 'upgrade', tool: 'hoe' })).reason));
await go(A, 25.5, 14.4); const quest = A.farm.quest, qd = await req(A, { t: 'quest-done' });
check('佈告欄有今天的委託（哪位居民要幾個什麼、報酬多少）；東西不夠交不了', !!quest && !!quest.npc && quest.n >= 2 && quest.reward > 0 && (qd.reason === 'materials' || qd.t === 'ok'), JSON.stringify(quest) + ' ' + JSON.stringify(qd));
if (qd.t === 'ok') A.farm.money -= quest.reward;
// 木工屋：擴建、開墾
check('不在木工屋旁邊不能動工', (await req(A, { t: 'build', what: 'house' })).reason === 'far');
await go(A, 37, 9.7);
check('錢不夠不能擴建農舍、不能開墾；沒有的項目不能做', (await req(A, { t: 'build', what: 'house' })).reason === 'money' && (await req(A, { t: 'build', what: 'field2' })).reason === 'money' && (await req(A, { t: 'build', what: 'castle' })).reason === 'unknown');
await go(A, 25.5, 14.4);
// 修復小鎮：捐東西
check('沒有的設施不能捐、設施不需要的東西不收', (await req(A, { t: 'donate', fac: 'castle', slot: 0, n: 1 })).reason === 'unknown' && (await req(A, { t: 'donate', fac: 'clocktower', slot: slot(A, 'hoe'), n: 1 })).reason === 'unneeded');
const wd = has(A, 'wood'); Bc.clear(); const dnt = await req(A, { t: 'donate', fac: 'clocktower', slot: slot(A, 'wood'), n: 1 });
check('捐 1 個木材給鐘樓：背包少 1 個，兩個人都看得到進度', dnt.t === 'ok' && dnt.given === 1 && dnt.done === false && has(A, 'wood') === wd - 1 && (await Bc.wait('farm', (m) => m.restore && m.restore.clocktower && m.restore.clocktower.given.wood === 1)) !== null);
await go(A, 0.6, 15.5); await req(A, { t: 'warp', i: 0 });
check('從小鎮西邊走回路上', A.log.filter((m) => m.t === 'warp' && m.id === a.user.id).pop().map === 'road');
check('離攤位太遠不能買', (await req(A, { t: 'buy', item: 'seed_cabbage', n: 1 })).reason === 'far');
await go(A, 14, 6.6);
check('種子照季節賣：春天買不到夏天的番茄種子，攤子上也沒有雜貨店才有的花椰菜種子', (await req(A, { t: 'buy', item: 'seed_tomato', n: 1 })).reason === 'unknown' && (await req(A, { t: 'buy', item: 'seed_cauliflower', n: 1 })).reason === 'unknown');
check('買種子：錢是共用的（兩個人都看到變少），背包多了種子', (await req(A, { t: 'buy', item: 'seed_strawberry', n: 2 })).t === 'ok' && has(A, 'seed_strawberry') === 2 && A.farm.money === 320 && !!(await Bc.wait('farm', (m) => m.money === 320)));
check('錢不夠買不了、清單以外的東西買不了', (await req(A, { t: 'buy', item: 'seed_strawberry', n: 50 })).reason === 'money' && (await req(A, { t: 'buy', shop: 'nowhere', item: 'hay', n: 1 })).reason === 'unknown' && (await req(A, { t: 'buy', item: 'seed_cauliflower', n: 1 })).reason === 'unknown' && (await req(A, { t: 'buy', item: 'hoe', n: 1 })).reason === 'unknown');
await go(A, 0.5, 7); await req(A, { t: 'warp', i: 0 });
check('走回農場', A.log.some((m) => m.t === 'warp' && m.id === a.user.id && m.map === 'farm'));

// ---- 農舍、倉庫箱 ----
const enter = async (c) => { await go(c, 9.5, 9.3, 'up'); return req(c, { t: 'warp', i: 1 }); };
check('從門口進農舍', (await enter(A)).t === 'ok' && A.log.some((m) => m.t === 'warp' && m.map === 'house'));
check('離倉庫箱太遠不能用', (await req(A, { t: 'chest', dir: 'in', slot: slot(A, 'stone'), n: 99 })).reason === 'far');
await go(A, 6.5, 2.5); Bc.clear();
check('石頭放進倉庫箱：兩個人共用', (await req(A, { t: 'chest', dir: 'in', slot: slot(A, 'stone'), n: 99 })).t === 'ok' && has(A, 'stone') === 0 && !!(await Bc.wait('farm', (m) => m.chest[0] && m.chest[0].id === 'stone' && m.chest[0].n === 1)));
await enter(Bc); await go(Bc, 6.5, 2.5);
check('另一個人可以拿出來', (await req(Bc, { t: 'chest', dir: 'out', slot: 0, n: 1 })).t === 'ok' && has(Bc, 'stone') === 1 && !Bc.farm.chest[0]);

// ---- 泡泡、表情 ----
Bc.clear(); A.send({ t: 'bubble', text: '  今天   種什麼？' + '好'.repeat(80) });
const bub = await Bc.wait('bubble'); check('聊天泡泡：去掉多餘空白、最多 40 個字', !!bub && bub.text.startsWith('今天 種什麼？') && bub.text.length === 40, bub && String(bub.text.length));
A.send({ t: 'emote', e: '😊' }); check('表情會送到', !!(await Bc.wait('emote', (m) => m.e === '😊')));
Bc.clear(); A.send({ t: 'emote', e: '<script>' }); await sleep(250); check('清單以外的表情不會送', !Bc.log.some((m) => m.t === 'emote'));

// ---- 外觀（建立角色、換裝）----
const LOOK = { gender: 'girl', skin: '#ffe0bd', eyes: 'lash', brows: 'thin', mouths: 'smile', hair: 'twin', hairColor: '#8a5a34', top: 'stripe', topColor: '#e88ab0', bottom: 'skirt', bottomColor: '#3b6ea8', shoes: 'boot', shoesColor: '#8a5a34', hat: 'none', hatColor: '#f6d34a', acc: 'none' };
Bc.clear(); A.send({ t: 'look', look: LOOK, name: '  晴<b>晴  ' + '長'.repeat(30) });
const lk = await Bc.wait('look'); check('外觀存起來並通知對方；名字去掉奇怪的字、最多 10 個字', !!lk && lk.look.hair === 'twin' && lk.name.startsWith('晴b晴') && lk.name.length === 10, lk && lk.name);
Bc.clear(); A.send({ t: 'look', look: { ...LOOK, hair: 'dragon' } }); A.send({ t: 'look', look: { ...LOOK, topColor: 'url(x)' } }); A.send({ t: 'look', look: { ...LOOK, extra: 1, top: undefined } }); await sleep(300);
check('清單以外的零件、顏色不收', !Bc.log.some((m) => m.t === 'look'));

// ---- 睡覺、換日、成長、出貨結算、備份 ----
check('不在床邊不能睡', (await req(A, { t: 'sleep', on: true })).reason === 'far');
await go(A, 2, 3.4); await go(Bc, 2.6, 3.4); A.clear(); Bc.clear(); A.send({ t: 'sleep', on: true });
check('一個人上床：對方看得到，還不會換日', !!(await Bc.wait('sleep', (m) => m.on)) && !(await A.wait('newday', undefined, 500)));
Bc.send({ t: 'sleep', on: true }); const nd = await A.wait('newday');
const tileOf = (m, x, y) => m.tiles.find((t) => t.map === 'farm' && t.x === x && t.y === y);
check('兩個人都上床才換日：第 2 天早上 6 點', !!nd && nd.farm.day === 2 && Math.abs(nd.farm.minute - 360) < 2, nd && `第 ${nd.farm.day} 天 ${nd.farm.minute}`);
if (process.env.DEBUG) console.log('tiles', JSON.stringify(nd.tiles), JSON.stringify(F), nd.farm.weather);
check('有澆水的作物長了一階段，沒澆水的沒長', !!nd && tileOf(nd, F.x, F.y).c.s === 1 && tileOf(nd, F.x + 1, F.y).c.s === 0);
check('出貨箱結算：木材 4 個 32 元進共用的錢包，明細看得到是誰放的', !!nd && nd.farm.money === 352 && nd.farm.lastShip.total === 32 && nd.farm.lastShip.lines[0].by === a.user.id && nd.farm.ship.length === 0, nd && String(nd.farm.money));
check('睡覺補滿體力', !!nd && nd.self.energy === 100);
const bk = (await j(`/api/farmroom/backups?conv=${dm.id}`, {}, a.token)).data.backups;
check('換日時自動備份', bk.length === 1 && bk[0].day === 1);
await req(A, { t: 'chest', dir: 'out', slot: 0, n: 1 });
A.clear(); const rs = await j(`/api/farmroom/restore?conv=${dm.id}`, { body: { day: 1 } }, a.token); const rnd = await A.wait('newday', (m) => m.reason === 'restore');
check('可以回復到備份（第 1 天結束時：錢、出貨箱、背包都回到那時候）', rs.status === 200 && !!rnd && rnd.farm.day === 1 && rnd.farm.money === 320 && rnd.farm.ship.length === 1 && rnd.self.inv.some((x) => x && x.id === 'wood'), JSON.stringify(rs.data));
check('沒有的備份回復不了', (await j(`/api/farmroom/restore?conv=${dm.id}`, { body: { day: 99 } }, a.token)).status === 404);
A.clear(); Bc.clear(); A.send({ t: 'sleep', on: true }); Bc.send({ t: 'sleep', on: true }); await Bc.wait('newday', (m) => m.farm.day === 2); await A.wait('newday', (m) => m.farm.day === 2);

// ---- 信箱（第 2 天起有阿禾的歡迎信）----
check('第 2 天收到歡迎信', Bc.self.mail.length === 1 && Bc.self.mail[0].from === 'ahe' && !Bc.self.mail[0].got);
check('不在信箱旁邊不能開信', (await req(Bc, { t: 'mail-open', mid: Bc.self.mail[0].id })).reason === 'far');
await go(Bc, 5, 7.6); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, 6.5, 10.4);
check('在信箱打開信：附的馬鈴薯種子放進背包；沒有的信打不開', (await req(Bc, { t: 'mail-open', mid: Bc.self.mail[0].id })).t === 'ok' && has(Bc, 'seed_potato') === 5 && Bc.self.mail[0].got === true && (await req(Bc, { t: 'mail-open', mid: 99 })).reason === 'unknown');
await enter(Bc); await go(Bc, 2.6, 3.4);
// ---- 離線：一個人照顧作物到收成 ----
Bc.clear(); A.ws.close(); check('離線時對方收到通知', !!(await Bc.wait('leave', (m) => m.id === a.user.id)));
const outAndWater = async () => { await go(Bc, 5, 7.6); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, F.x + 0.5, F.y - 0.5); const wet = ['rain', 'storm'].includes(Bc.farm.weather); /* 下雨天田已經是濕的：這時候拿澆水壺對成熟的作物按會變成收成，所以下雨天不澆 */ const r = wet ? { t: 'no', reason: 'already' } : await use(Bc, 'can', F.x, F.y); if (!wet) await use(Bc, 'can', F.x + 1, F.y); await enter(Bc); await go(Bc, 2.6, 3.4); return r; };
let lastND = null, rainy = 0;
for (let d = 0; d < 4; d++) { const r = await outAndWater(); if (r.t === 'no' && r.reason === 'already') rainy++; Bc.clear(); const sr = await req(Bc, { t: 'sleep', on: true }); const ndx = await Bc.wait('newday'); if (process.env.DEBUG) console.log('day loop', d, JSON.stringify(r).slice(0, 80), JSON.stringify(sr), ndx && ndx.farm.day, JSON.stringify(Bc.log.filter((m) => m.t === 'warp' || m.t === 'no').slice(-4))); if (ndx) lastND = ndx; }
check('只有一個人在線：他自己睡就換日（連續 4 天）', !!lastND && lastND.farm.day === 6, lastND && `第 ${lastND.farm.day} 天，其中 ${rainy} 天下雨不用澆`);
check('紅蘿蔔 4 天成熟（每天有澆水或下雨）', !!lastND && tileOf(lastND, F.x, F.y).c.s === 4, lastND && JSON.stringify(tileOf(lastND, F.x, F.y).c));
await go(Bc, 5, 7.6); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, F.x + 0.5, F.y - 0.5);
const hv = await use(Bc, 'hoe', F.x, F.y);
check('收成：拿到紅蘿蔔、農耕有經驗、那一格變回空的翻過的土', hv.t === 'ok' && hv.got.id === 'carrot' && has(Bc, 'carrot') === 1 && Bc.self.skills.farming === 6 && Bc.log.some((m) => m.t === 'tiles' && m.kind === 'harvest' && m.list[0].t === 1 && !m.list[0].c));
// ---- 加工品、料理 ----
await go(Bc, 16.5, 10.9); const col = await use(Bc, 'hoe', 16, 10);
check('過了幾天乾燥架做好了：拿到加工品（名字和價錢是算出來的）', col.t === 'ok' && !!col.got && col.got.id === `g:dryer:${fo.item}` && has(Bc, col.got.id) === 1, JSON.stringify(col));
const gid = `g:dryer:${fo.item}`; await go(Bc, 12.5, 10.4); Bc.clear(); await req(Bc, { t: 'ship', slot: slot(Bc, gid), n: 1 });
check('加工品可以出貨', Bc.farm.ship.some((l) => l.id === gid));
await go(Bc, F.x + 1.5, F.y - 0.5); const hv2 = await use(Bc, 'hoe', F.x + 1, F.y);
check('第二格紅蘿蔔（第 3 天種回來的話會晚一點）：有就收', hv2.t === 'ok' || hv2.reason === 'nothing', JSON.stringify(hv2).slice(0, 80));
await enter(Bc);
check('離爐灶太遠不能煮', (await req(Bc, { t: 'cook', recipe: 'veg_soup' })).reason === 'far');
await go(Bc, 8.5, 2.5);
check('材料不夠不能煮、等級不夠的食譜不能煮', (await req(Bc, { t: 'cook', recipe: 'stew' })).reason === 'materials' && (await req(Bc, { t: 'cook', recipe: 'strawberry_cake' })).reason === 'level');
if (has(Bc, 'carrot') >= 2) {
  const ck = await req(Bc, { t: 'cook', recipe: 'veg_soup' });
  check('兩根紅蘿蔔煮蔬菜湯：材料用掉、背包多一碗、料理有經驗', ck.t === 'ok' && has(Bc, 'carrot') === 0 && has(Bc, 'dish_veg_soup') === 1 && Bc.self.skills.cooking === 8);
  const e1 = Bc.self.energy; await use(Bc, 'hoe', 0, 0); const et = await req(Bc, { t: 'eat', slot: slot(Bc, 'dish_veg_soup') });
  check('吃掉：料理少一碗、體力不會超過上限', et.t === 'ok' && has(Bc, 'dish_veg_soup') === 0 && Bc.self.energy >= e1 && Bc.self.energy <= 100);
} else check('（這次紅蘿蔔不到兩根，煮湯的檢查跳過）', true);
check('不是料理的東西不能吃', (await req(Bc, { t: 'eat', slot: slot(Bc, 'hoe') })).reason === 'slot');
// ---- 畜牧與寵物 ----
const { animalPos } = await import('../public/games/farm/shared/rules.js');
const PENS = JSON.parse((await import('node:fs')).readFileSync(new URL('../public/games/farm/data/maps/farm.json', import.meta.url), 'utf8')).pens;
check('不在雞舍旁邊不能買', (await req(Bc, { t: 'animal-buy', kind: 'chicken', name: '小白' })).reason === 'far');
await go(Bc, 5, 7.6); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, 34, 22.7);
check('沒有的動物不能買、乳牛要到畜舍買、錢不夠不能買', (await req(Bc, { t: 'animal-buy', kind: 'dragon' })).reason === 'unknown' && (await req(Bc, { t: 'animal-buy', kind: 'cow' })).reason === 'far' && (await req(Bc, { t: 'animal-buy', kind: 'duck', name: 'x' })).reason === 'money');
const m0 = Bc.farm.money; Bc.clear(); const buy = await req(Bc, { t: 'animal-buy', kind: 'chicken', name: '小白<>' }); const am = await Bc.wait('animals');
check('買一隻雞：錢少 300、雞舍多一隻、名字會清乾淨', buy.t === 'ok' && !!am && am.money === m0 - 300 && am.animals.length === 1 && am.animals[0].name === '小白' && am.animals[0].love === 0, `${m0} → ${am && am.money}`);
const hen = am.animals[0]; await go(Bc, PENS.coop.x + 2, PENS.coop.y + 2.5); // 圍欄只有 4×5，站中間一定摸得到
check('摸摸牠：更喜歡你；一天只能摸一次', (await req(Bc, { t: 'animal', aid: hen.id, act: 'pet' })).love === 15 && (await req(Bc, { t: 'animal', aid: hen.id, act: 'pet' })).reason === 'already');
check('還沒有蛋不能收、沒拿刷子不能刷、沒有的動物摸不到', (await req(Bc, { t: 'animal', aid: hen.id, act: 'collect' })).reason === 'nothing' && (await req(Bc, { t: 'animal', aid: hen.id, act: 'brush', slot: slot(Bc, 'hoe') })).reason === 'tool:brush' && (await req(Bc, { t: 'animal', aid: 999, act: 'pet' })).reason === 'unknown');
await go(Bc, 34, 22.7);
check('沒有乾草不能餵', (await req(Bc, { t: 'feed', home: 'coop' })).reason === 'nohay');
Bc.clear(); check('打開放牧', (await req(Bc, { t: 'graze', on: true })).t === 'ok' && (await Bc.wait('animals')).graze === true);
Bc.clear(); check('領養一隻小狗（不用錢），同一種不能養第二隻', (await req(Bc, { t: 'adopt', kind: 'dog', name: '阿福' })).t === 'ok' && (await Bc.wait('animals')).pets[0].name === '阿福' && (await req(Bc, { t: 'adopt', kind: 'dog' })).reason === 'already');
check('摸小狗', (await req(Bc, { t: 'pet', aid: 900 })).love === 12);
const wasWet = ['rain', 'storm'].includes(Bc.farm.weather);
await enter(Bc); await go(Bc, 2.6, 3.4); Bc.clear(); await req(Bc, { t: 'sleep', on: true }); const nd7 = await Bc.wait('newday'); const hen7 = nd7 && nd7.farm.animals[0];
check(wasWet ? '（昨天下雨，放牧的雞沒吃到：不開心、沒有蛋）' : '放牧的晴天算有吃：隔天更喜歡你、有蛋可以收', !!hen7 && (wasWet ? hen7.love === 0 && !hen7.ready : hen7.love === 23 && hen7.ready), JSON.stringify(hen7));
if (hen7 && hen7.ready) {
  await go(Bc, 5, 7.6); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, PENS.coop.x + 2, PENS.coop.y + 2.5);
  const eg = await req(Bc, { t: 'animal', aid: hen.id, act: 'collect' });
  check('收雞蛋：背包多一顆、畜牧有經驗；收過就沒了', eg.t === 'ok' && has(Bc, 'egg') === 1 && Bc.self.skills.ranching > 0 && (await req(Bc, { t: 'animal', aid: hen.id, act: 'collect' })).reason === 'nothing');
}
// ---- 礦坑（入口在湖邊）----
const { monPos } = await import('../public/games/farm/shared/rules.js');
if (Bc.you.map !== 'farm' && !Bc.log.some((m) => m.t === 'warp' && m.id === b.user.id && m.map === 'farm')) { await go(Bc, 5, 7.6); await req(Bc, { t: 'warp', i: 0 }); }
check('不在礦坑入口不能進去', (await req(Bc, { t: 'mine-enter', floor: 1 })).reason === 'far');
await go(Bc, 42.5, 16); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, 20.6, 0.7); await req(Bc, { t: 'warp', i: 2 }); await go(Bc, 31.5, 18.6);
check('還沒到過的樓層電梯不能坐', (await req(Bc, { t: 'mine-enter', floor: 5 })).reason === 'closed' && (await req(Bc, { t: 'mine-enter', floor: 3 })).reason === 'closed');
Bc.clear(); const en = await req(Bc, { t: 'mine-enter', floor: 1 }); const fl = (await Bc.wait('mine')) || {}; let st = fl.state;
check('進礦坑第 1 層：拿到這一層的樣子（石頭、藏起來的樓梯、怪物）', en.t === 'ok' && !!st && st.floor === 1 && st.rocks.length >= 30 && st.mons.length >= 1 && st.stairs.open === false && st.rocks.some((r) => r.x === st.stairs.x && r.y === st.stairs.y), st && `${st.rocks.length} 顆石頭、${st.mons.length} 隻怪物`);
const mineHit = (x, y, item = 'pick') => req(Bc, { t: 'mine-hit', x, y, slot: slot(Bc, item) });
const rk = st.rocks.find((r) => r.type === 'stone' && !(r.x === st.stairs.x && r.y === st.stairs.y));
await go(Bc, rk.x + 0.5, rk.y + 1.5); check('沒拿十字鎬敲不動', (await mineHit(rk.x, rk.y, 'hoe')).reason === 'tool:pick');
const st0 = has(Bc, 'stone'), en0 = Bc.self.energy; Bc.clear(); const h1 = await mineHit(rk.x, rk.y), h2 = await mineHit(rk.x, rk.y);
check('石頭敲兩下碎掉：拿到石頭、花體力、採礦有經驗，這一層的人都收到更新', h1.t === 'ok' && !h1.drops && h2.drops && h2.drops.stone === 1 && has(Bc, 'stone') === st0 + 1 && Bc.self.energy === en0 - 4 && Bc.self.skills.mining === 2 && !!(await Bc.wait('mine-upd', (m) => m.rock.hp === 0)));
check('敲掉的石頭不能再敲', (await mineHit(rk.x, rk.y)).reason === 'nothing');
check('樓梯還沒露出來不能下去', (await req(Bc, { t: 'mine-down' })).reason === 'nothing');
// 怪物：碰到會痛、用劍打
const mon = st.mons[0], mp = () => monPos(mon, Date.now()); let q = mp(); await go(Bc, q.x, q.y + 0.3);
const hurt = await req(Bc, { t: 'hurt', mid: mon.id }); check('碰到怪物會痛：血變少', hurt.t === 'ok' && hurt.hp < 100 && Bc.self.hp === hurt.hp, JSON.stringify(hurt));
check('連續碰不會一直扣（有間隔）', (await req(Bc, { t: 'hurt', mid: mon.id })).reason === 'far');
check('沒拿劍打不了', (await req(Bc, { t: 'mon-hit', mid: mon.id, slot: slot(Bc, 'hoe') })).reason === 'tool:sword');
let kill = null; for (let i = 0; i < 8 && !(kill && kill.drops); i++) { q = mp(); await go(Bc, q.x, q.y + 0.3); kill = await req(Bc, { t: 'mon-hit', mid: mon.id, slot: slot(Bc, 'sword') }); }
check('用劍打幾下怪物就不見：掉東西、戰鬥有經驗', !!kill && !!kill.drops && Bc.self.skills.combat > 0 && (await req(Bc, { t: 'mon-hit', mid: mon.id, slot: slot(Bc, 'sword') })).reason === 'nothing', JSON.stringify(kill));
// 樓梯藏在其中一顆石頭下面
await go(Bc, st.stairs.x + 0.5, st.stairs.y + 1.5); let last = null; for (let i = 0; i < 6; i++) { last = await mineHit(st.stairs.x, st.stairs.y); if (last.drops) break; }
const up = Bc.log.filter((m) => m.t === 'mine-upd').pop();
check('敲掉藏著樓梯的那顆石頭：樓梯露出來', !!last.drops && up.stairs.open === true);
Bc.clear(); const dn = await req(Bc, { t: 'mine-down' }); const f2 = await Bc.wait('mine');
check('走樓梯到第 2 層：新的一層，最深紀錄變成 2', dn.t === 'ok' && !!f2 && f2.state.floor === 2 && f2.deepest === 2 && f2.state.rocks.length >= 30);
check('沒走到梯子不能出去', (await (async () => { await go(Bc, 3, 3); return req(Bc, { t: 'mine-exit' }); })()).reason === 'far');
await go(Bc, 10.5, 12.5); Bc.clear();
check('從梯子出去：回到湖邊的入口前面', (await req(Bc, { t: 'mine-exit' })).t === 'ok' && !!(await Bc.wait('warp', (m) => m.id === b.user.id && m.map === 'lake')));
check('在外面不能敲礦坑的石頭', (await mineHit(5, 5)).reason === 'far');
// ---- 劇情事件、節慶 ----
check('沒有的劇情不能完成、好感不夠的劇情不算數', (await req(Bc, { t: 'event-done', event: 'nope', picks: [] })).reason === 'unknown' && (await req(Bc, { t: 'event-done', event: 'xiaoman_2', picks: [{ step: 3, opt: 1 }] })).reason === 'hearts');
check('不是節慶的日子不能交成績', Bc.farm.festival === null && (await req(Bc, { t: 'fest-score', fest: 'flower', score: 50 })).reason === 'closed');
await go(Bc, 17.6, 25.3); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, 0.6, 7); await req(Bc, { t: 'warp', i: 0 }); await enter(Bc); await go(Bc, 2.6, 3.4);
let ndf = null; for (let d = Bc.farm.day; d < 10; d++) { Bc.clear(); await req(Bc, { t: 'sleep', on: true }); ndf = await Bc.wait('newday'); }
check('春天第 10 天是花見祭', !!ndf && ndf.farm.day === 10 && ndf.farm.festival === 'flower', ndf && `第 ${ndf.farm.day} 天 ${ndf.farm.festival}`);
check('不在小鎮不能交成績', (await req(Bc, { t: 'fest-score', fest: 'flower', score: 20 })).reason === 'far');
await go(Bc, 5, 7.6); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, 42.5, 16); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, 28.5, 7); await req(Bc, { t: 'warp', i: 1 });
const fm = Bc.farm.money, fs = await req(Bc, { t: 'fest-score', fest: 'flower', score: 20 });
check('接花瓣 20 分：拿到第二級的獎（150 元和鬱金香種子 3 包）；一年只能領一次；別的節慶今天不能交', fs.t === 'ok' && fs.tier === 1 && Bc.farm.money === fm + 150 && has(Bc, 'seed_tulip') === 3 && (await req(Bc, { t: 'fest-score', fest: 'flower', score: 99 })).reason === 'already' && (await req(Bc, { t: 'fest-score', fest: 'egg', score: 5 })).reason === 'closed', JSON.stringify(fs));
const A2 = open(dm.id, a.token); const s2 = await A2.wait('snapshot');
check('重新上線：造型和名字還在', !!s2 && !!s2.you.look && s2.you.look.hair === 'twin' && s2.you.name.startsWith('晴b晴'));
check('重新上線：人還在農舍裡、背包還在、看得到離線時的變化', !!s2 && s2.you.map === 'house' && s2.self.inv.some((x) => x && x.id === 'seed_strawberry') && s2.farm.day === 10 && s2.farm.animals.length === 1 && s2.farm.pets.length === 1);
check('「你不在時發生的事」：過了 8 天、對方澆水和收成', !!s2 && !!s2.summary && s2.summary.days === 8 && s2.summary.acts.harvest >= 1 && s2.summary.acts.water >= 1, s2 && JSON.stringify(s2.summary));
check('圖鑑記下拿到過的東西、統計記下做過的事（兩個人共用）', Object.keys(s2.farm.codex).length >= 15 && !!s2.farm.codex.carrot && s2.farm.stats.harvest >= 1 && s2.farm.stats.fish >= 1 && s2.farm.houseLv === 1, `圖鑑 ${Object.keys(s2.farm.codex).length} 種`);
check('紀念冊記下第一次發生的事（第一次收成、第一次合力、第一隻動物…）', ['harvest', 'duo', 'animal-buy', 'fish', 'note'].every((k) => s2.farm.album.some((e) => e.key === k)) && s2.farm.notes.length === 2, s2.farm.album.map((e) => e.key).join(','));
const A3 = open(dm.id, a.token); await A3.wait('snapshot'); await sleep(300);
check('同一個人開第二個分頁：舊的收到 replaced，對方不會以為他離開', A2.log.some((m) => m.t === 'replaced') && !Bc.log.some((m) => m.t === 'leave' && m.id === a.user.id));
// 時鐘只在有人的時候走
const t0 = (await (async () => { const X = open(dm.id, a.token); const s = await X.wait('snapshot'); await sleep(200); return { X, s }; })());
A3.ws.close(); t0.X.ws.close(); Bc.ws.close(); await sleep(1500);
const A4 = open(dm.id, a.token); const s4 = await A4.wait('snapshot');
check('沒有人在線時時鐘不走', !!s4 && s4.farm.minute - t0.s.farm.minute < 1.2, s4 && `${t0.s.farm.minute.toFixed(2)} → ${s4.farm.minute.toFixed(2)}`);
await sleep(1500); A4.ws.close(); await sleep(300);
const A5 = open(dm.id, a.token); const s5 = await A5.wait('snapshot');
check('有人在線時時鐘會走（1.5 秒約 2 個遊戲分鐘）', !!s5 && s5.farm.minute - s4.farm.minute > 1.5 && s5.farm.minute - s4.farm.minute < 4, s5 && (s5.farm.minute - s4.farm.minute).toFixed(2));
A5.ws.close(); await sleep(300);
console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
