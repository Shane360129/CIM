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
  check('重開伺服器後：天數、格子、背包、錢、所在的地圖、造型都還在', !!snap && snap.farm.day >= 6 && snap.tiles.length >= 1 && snap.self.inv.some((x) => x && x.id === 'seed_strawberry') && snap.farm.money === 352 && snap.you.map === 'house' && !!snap.you.look, snap && `第 ${snap.farm.day} 天、${snap.tiles.length} 格、${snap.farm.money} 元、${snap.objs.length} 個東西`);
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
const cf3 = await req(A, { t: 'fish', slot: slot(A, 'rod'), x: 32, y: 6 }); await sleep(cf3.wait + 120); const n3 = A.self.inv.filter(Boolean).reduce((n, x) => n + x.n, 0);
check('小遊戲沒過：什麼都沒拿到', (await req(A, { t: 'reel', win: false })).got === null && A.self.inv.filter(Boolean).reduce((n, x) => n + x.n, 0) === n3);
check('沒有拋竿就收竿：不算', (await req(A, { t: 'reel', win: true })).reason === 'gone');
// 背包搬位置
const s1 = slot(A, 'wood'); await req(A, { t: 'swap', slot: s1, b: 20 }); check('背包可以搬位置', A.self.inv[20] && A.self.inv[20].id === 'wood' && !A.self.inv[s1]);

// ---- 出貨箱（在家門口旁邊 12,9）----
check('離出貨箱太遠不能出貨', (await req(A, { t: 'ship', slot: 20, n: 99 })).reason === 'far');
await go(A, 12.5, 10.4);
check('工具不能賣', (await req(A, { t: 'ship', slot: slot(A, 'hoe'), n: 1 })).reason === 'unsellable');
Bc.clear(); check('木材放進出貨箱：背包少了，兩個人都看得到箱子裡有什麼', (await req(A, { t: 'ship', slot: 20, n: 4 })).t === 'ok' && has(A, 'wood') === 2 && !!(await Bc.wait('farm', (m) => m.ship.length === 1 && m.ship[0].id === 'wood' && m.ship[0].n === 4)));

// ---- 換地圖、種子攤 ----
check('沒走到出入口不能換地圖', (await req(A, { t: 'warp', i: 0 })).reason === 'far');
await go(A, 42.5, 16); Bc.clear();
check('走到東邊的出口：到「往小鎮的路」，對方看到你離開', (await req(A, { t: 'warp', i: 0 })).t === 'ok' && !!(await Bc.wait('warp', (m) => m.id === a.user.id && m.map === 'road')));
check('還沒開放的出口過不去', (await (async () => { await go(A, 28.5, 7); return req(A, { t: 'warp', i: 1 }); })()).reason === 'closed');
check('離攤位太遠不能買', (await req(A, { t: 'buy', item: 'seed_cabbage', n: 1 })).reason === 'far');
await go(A, 14, 6.6);
check('買種子：錢是共用的（兩個人都看到變少），背包多了種子', (await req(A, { t: 'buy', item: 'seed_strawberry', n: 2 })).t === 'ok' && has(A, 'seed_strawberry') === 2 && A.farm.money === 320 && !!(await Bc.wait('farm', (m) => m.money === 320)));
check('錢不夠買不了、清單以外的東西買不了', (await req(A, { t: 'buy', item: 'seed_cauliflower', n: 50 })).reason === 'money' && (await req(A, { t: 'buy', item: 'hoe', n: 1 })).reason === 'unknown');
await go(A, 0.5, 7); await req(A, { t: 'warp', i: 0 });
check('走回農場', A.log.some((m) => m.t === 'warp' && m.id === a.user.id && m.map === 'farm'));

// ---- 農舍、倉庫箱 ----
const enter = async (c) => { await go(c, 9.5, 9.3, 'up'); return req(c, { t: 'warp', i: 1 }); };
check('從門口進農舍', (await enter(A)).t === 'ok' && A.log.some((m) => m.t === 'warp' && m.map === 'house'));
check('離倉庫箱太遠不能用', (await req(A, { t: 'chest', dir: 'in', slot: slot(A, 'stone'), n: 99 })).reason === 'far');
await go(A, 6.5, 2.5); Bc.clear();
check('石頭放進倉庫箱：兩個人共用', (await req(A, { t: 'chest', dir: 'in', slot: slot(A, 'stone'), n: 99 })).t === 'ok' && has(A, 'stone') === 0 && !!(await Bc.wait('farm', (m) => m.chest[0] && m.chest[0].id === 'stone' && m.chest[0].n === 2)));
await enter(Bc); await go(Bc, 6.5, 2.5);
check('另一個人可以拿出來', (await req(Bc, { t: 'chest', dir: 'out', slot: 0, n: 1 })).t === 'ok' && has(Bc, 'stone') === 1 && Bc.farm.chest[0].n === 1);

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

// ---- 離線：一個人照顧作物到收成 ----
Bc.clear(); A.ws.close(); check('離線時對方收到通知', !!(await Bc.wait('leave', (m) => m.id === a.user.id)));
const outAndWater = async () => { await go(Bc, 5, 7.6); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, F.x + 0.5, F.y - 0.5); const r = await use(Bc, 'can', F.x, F.y); await enter(Bc); await go(Bc, 2.6, 3.4); return r; };
let lastND = null, rainy = 0;
for (let d = 0; d < 4; d++) { const r = await outAndWater(); if (r.t === 'no' && r.reason === 'already') rainy++; Bc.clear(); const sr = await req(Bc, { t: 'sleep', on: true }); const ndx = await Bc.wait('newday'); if (process.env.DEBUG) console.log('day loop', d, JSON.stringify(r).slice(0, 80), JSON.stringify(sr), ndx && ndx.farm.day, JSON.stringify(Bc.log.filter((m) => m.t === 'warp' || m.t === 'no').slice(-4))); if (ndx) lastND = ndx; }
check('只有一個人在線：他自己睡就換日（連續 4 天）', !!lastND && lastND.farm.day === 6, lastND && `第 ${lastND.farm.day} 天，其中 ${rainy} 天下雨不用澆`);
check('紅蘿蔔 4 天成熟（每天有澆水或下雨）', !!lastND && tileOf(lastND, F.x, F.y).c.s === 4, lastND && JSON.stringify(tileOf(lastND, F.x, F.y).c));
await go(Bc, 5, 7.6); await req(Bc, { t: 'warp', i: 0 }); await go(Bc, F.x + 0.5, F.y - 0.5);
const hv = await use(Bc, 'hoe', F.x, F.y);
check('收成：拿到紅蘿蔔、農耕有經驗、那一格變回空的翻過的土', hv.t === 'ok' && hv.got.id === 'carrot' && has(Bc, 'carrot') === 1 && Bc.self.skills.farming === 6 && Bc.log.some((m) => m.t === 'tiles' && m.kind === 'harvest' && m.list[0].t === 1 && !m.list[0].c));
const A2 = open(dm.id, a.token); const s2 = await A2.wait('snapshot');
check('重新上線：造型和名字還在', !!s2 && !!s2.you.look && s2.you.look.hair === 'twin' && s2.you.name.startsWith('晴b晴'));
check('重新上線：人還在農舍裡、背包還在、看得到離線時的變化', !!s2 && s2.you.map === 'house' && s2.self.inv.some((x) => x && x.id === 'seed_strawberry') && s2.farm.day === 6);
check('「你不在時發生的事」：過了 4 天、對方澆水和收成', !!s2 && !!s2.summary && s2.summary.days === 4 && s2.summary.acts.harvest === 1 && s2.summary.acts.water >= 1, s2 && JSON.stringify(s2.summary));
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
