#!/usr/bin/env node
// 晴耕谷：高級工具的伺服器測試（一次翻土、澆水、施肥、播種一片；金的斧頭、十字鎬一下打掉；鐮刀一次割一片、一次收成一片；
// 晶的十字鎬在礦坑一次敲一片；升到晶）。
// 工具要升級才看得到效果，所以分兩段，中間用 scripts/farm-give-tools.mjs 直接把第一個玩家的工具升到金（十字鎬升到晶）：
//   rm -rf .wrangler/state && npm run dev，另開終端機：node scripts/test-farmroom-tools.mjs setup
//   停掉 npm run dev → node scripts/farm-give-tools.mjs 4 pick=5 → 重開 npm run dev → node scripts/test-farmroom-tools.mjs
import { readFileSync } from 'node:fs';
const B = process.env.BASE_URL || 'http://127.0.0.1:8787', WSB = B.replace(/^http/, 'ws'), PASS = 'pass123456';
const D = (p) => JSON.parse(readFileSync(new URL('../public/games/farm/data/' + p, import.meta.url), 'utf8'));
const BAL = D('balance.json'), FARM = D('maps/farm.json'), OBJECTS = D('objects.json');
const { areaTiles, toolShapes } = await import('../public/games/farm/shared/rules.js');
const j = async (path, opts = {}, token) => { const r = await fetch(B + path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
let pass = 0, fail = 0;
const check = (label, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✅' : '❌'} ${label}${!ok && extra ? '  →  ' + extra : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function open(conv, token) {
  const ws = new WebSocket(`${WSB}/farm/ws?conv=${conv}`, ['farm.v1', 'token.' + token]), c = { ws, log: [], waiters: [] };
  ws.onmessage = (e) => { if (e.data === 'pong') return; const m = JSON.parse(e.data); c.log.push(m);
    if (m.t === 'snapshot') { c.self = m.self; c.farm = m.farm; c.objs = m.objs; c.tiles = m.tiles; } if (m.t === 'self') c.self = m; if (m.t === 'farm') Object.assign(c.farm || {}, m);
    if (m.t === 'newday') { c.self = m.self; c.farm = m.farm; }
    c.waiters = c.waiters.filter((w) => (w.test(m) ? (w.resolve(m), false) : true)); };
  c.wait = (t, pred = () => true, ms = 4000) => new Promise((resolve) => { const hit = c.log.find((m) => m.t === t && pred(m)); if (hit) return resolve(hit); c.waiters.push({ test: (m) => m.t === t && pred(m), resolve }); setTimeout(() => resolve(null), ms); });
  c.send = (m) => ws.send(JSON.stringify(m)); c.clear = () => { c.log.length = 0; };
  return c;
}
let rid = 500; const req = async (c, msg) => { const id = ++rid; c.send({ ...msg, id }); return Promise.race([c.wait('ok', (m) => m.id === id), c.wait('no', (m) => m.id === id)]); };
const go = async (c, x, y, dir = 'down') => { await sleep(50); c.send({ t: 'move', x, y, dir, vx: 0, vy: 0 }); await sleep(60); };
const has = (c, id) => c.self.inv.filter((x) => x && x.id === id).reduce((s, x) => s + x.n, 0), slot = (c, id) => c.self.inv.findIndex((x) => x && x.id === id);
const login = async (u) => (await j('/api/login', { body: { username: u, password: PASS } })).data;

if (process.argv[2] === 'setup') {
  const a = (await j('/api/register', { body: { username: 'ft_a', password: PASS, displayName: '小晴' } })).data;
  if (!a.token) { console.error('要用乾淨的資料庫：rm -rf .wrangler/state'); process.exit(2); }
  await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: 'ft-inv' } }, a.token);
  const b = (await j('/api/register', { body: { username: 'ft_b', password: PASS, displayName: '阿耕', inviteCode: 'ft-inv' } })).data;
  const dm = (await j('/api/conversations', { body: { type: 'dm', userId: b.user.id } }, a.token)).data.conversation;
  const A = open(dm.id, a.token); await A.wait('snapshot'); const Bc = open(dm.id, b.token); await Bc.wait('snapshot');
  check('兩個人都進過農場（建好玩家資料）', !!A.self && !!Bc.self && A.self.inv.some((x) => x && x.id === 'hoe'));
  A.ws.close(); Bc.ws.close(); await sleep(600);
  console.log(`\n結果：${pass} 通過，${fail} 失敗。接著停掉 npm run dev，跑 node scripts/farm-give-tools.mjs 4 pick=5，重開 npm run dev，再跑 node scripts/test-farmroom-tools.mjs`);
  process.exit(fail ? 1 : 0);
}

const a = await login('ft_a'), b = await login('ft_b');
const dm = (await j('/api/conversations', {}, a.token)).data.conversations.find((c) => c.type === 'dm' && c.members.length === 2 && c.members.some((m) => m.userId === b.user.id));
const A = open(dm.id, a.token); const sa = await A.wait('snapshot'); const Bc = open(dm.id, b.token); await Bc.wait('snapshot');
check('第一個玩家的工具都是金（十字鎬是晶）、背包有播種器', !!sa && sa.self.toolLv.hoe === 4 && sa.self.toolLv.seeder === 4 && sa.self.toolLv.pick === 5 && has(A, 'seeder') === 1, JSON.stringify(sa && sa.self.toolLv));
// 田（soil）上沒有東西擋著的格子：一次弄一片時算得出應該動到幾格
const soil = FARM.patches.find((p) => p.type === 'soil' && !p.locked), objAt = new Set(sa.objs.filter((o) => o.map === 'farm').map((o) => o.x + ',' + o.y));
const isSoil = (x, y) => x >= soil.x && x < soil.x + soil.w && y >= soil.y && y < soil.y + soil.h;
let spot = null; // 找一塊 5×5 都是田、都沒有東西的地方（站在上面一格，面向下）
for (let y = soil.y + 1; y < soil.y + soil.h - 5 && !spot; y++) for (let x = soil.x + 2; x < soil.x + soil.w - 2 && !spot; x++) if (areaTiles(x, y, 'down', [5, 5]).every((q) => isSoil(q.x, q.y) && !objAt.has(q.x + ',' + q.y))) spot = { x, y };
check('田上找得到一塊空的 5×5', !!spot, JSON.stringify(soil));
const shapes = (k) => toolShapes(BAL, k, 4), big = (k) => shapes(k).length - 1;
await go(A, spot.x + 0.5, spot.y - 0.5, 'down');
// 1. 鋤頭（金：3×5）
const e0 = A.self.energy; Bc.clear();
const t1 = await req(A, { t: 'use', slot: slot(A, 'hoe'), x: spot.x, y: spot.y, dir: 'down', size: big('hoe') }), till = await Bc.wait('tiles', (m) => m.kind === 'till');
const [hw, hd] = shapes('hoe')[big('hoe')];
check(`金的鋤頭一次翻 ${hw}×${hd}＝${hw * hd} 格，對方一次收到整片`, t1.t === 'ok' && t1.n === hw * hd && !!till && till.list.length === hw * hd, JSON.stringify(t1));
check('體力照格數扣（金的鋤頭一格 1 點）', A.self.energy === e0 - hw * hd, `${e0} → ${A.self.energy}`);
// 2. 肥料（帶著播種器，金：5×5，只撒在翻過的那幾格）
const f0 = has(A, 'fertilizer'), t2 = await req(A, { t: 'use', slot: slot(A, 'fertilizer'), x: spot.x, y: spot.y, dir: 'down', size: big('seeder') });
check('帶著播種器拿肥料：一次撒一片（只撒在翻過的格子上），肥料照格數少', t2.t === 'ok' && t2.n === hw * hd && has(A, 'fertilizer') === f0 - hw * hd, JSON.stringify(t2));
// 3. 種子（帶著播種器）
const s0 = has(A, 'seed_carrot'), t3 = await req(A, { t: 'use', slot: slot(A, 'seed_carrot'), x: spot.x, y: spot.y, dir: 'down', size: big('seeder') });
check('帶著播種器拿種子：一次播一片，種子照格數少', t3.t === 'ok' && t3.n === hw * hd && has(A, 'seed_carrot') === s0 - hw * hd, JSON.stringify(t3));
// 4. 澆水壺
const t4 = await req(A, { t: 'use', slot: slot(A, 'can'), x: spot.x, y: spot.y, dir: 'down', size: big('can') });
check('金的澆水壺一次澆一片', t4.t === 'ok' && t4.n === hw * hd, JSON.stringify(t4));
check('同一片再澆一次：都澆過了（照一格的規則回報 already）', (await req(A, { t: 'use', slot: slot(A, 'can'), x: spot.x, y: spot.y, dir: 'down', size: big('can') })).reason === 'already');
// 5. 選小一點的範圍：size 0 就是一格
const side = { x: spot.x + 2, y: spot.y }; await go(A, side.x + 0.5, side.y - 0.5, 'down'); // 空的 5×5 裡、剛剛沒翻到的那一行
const t5 = await req(A, { t: 'use', slot: slot(A, 'hoe'), x: side.x, y: side.y, dir: 'down', size: 0 });
check('範圍選 1×1：只翻那一格', t5.t === 'ok' && !t5.n && (await Bc.wait('tiles', (m) => m.kind === 'till' && m.list.length === 1 && m.list[0].x === side.x)) !== null);
// 6. 金的斧頭一下砍倒樹、金的十字鎬一下敲碎石頭
const near = (type) => sa.objs.filter((o) => o.map === 'farm' && o.type === type).sort((p, q) => Math.hypot(p.x - spot.x, p.y - spot.y) - Math.hypot(q.x - spot.x, q.y - spot.y))[0];
const tree = near('tree'), rock = near('rock');
await go(A, tree.x + 0.5, tree.y + 1.4, 'up'); const w0 = has(A, 'wood');
check('金的斧頭：樹一下就倒（拿到木材）', (await req(A, { t: 'use', slot: slot(A, 'axe'), x: tree.x, y: tree.y, dir: 'up', size: 0 })).t === 'ok' && has(A, 'wood') === w0 + OBJECTS.tree.drops.wood);
await go(A, rock.x + 0.5, rock.y + 1.4, 'up'); const st0 = has(A, 'stone');
check('十字鎬（金以上）：石頭一下就碎', (await req(A, { t: 'use', slot: slot(A, 'pick'), x: rock.x, y: rock.y, dir: 'up', size: 0 })).t === 'ok' && has(A, 'stone') === st0 + OBJECTS.rock.drops.stone);
// 7. 鐮刀（金：3×3）一次割一片雜草，不會割到長著的作物
const weeds = sa.objs.filter((o) => o.map === 'farm' && o.type === 'weed'); let best = null;
for (const wd of weeds) for (const dir of ['down', 'up', 'left', 'right']) { const f = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir], at = { x: wd.x, y: wd.y }, area = areaTiles(at.x, at.y, dir, [3, 3]), n = area.filter((q) => weeds.some((w2) => w2.x === q.x && w2.y === q.y)).length; if (!best || n > best.n) best = { at, dir, n, stand: { x: at.x - f[0] + 0.5, y: at.y - f[1] + 0.5 } }; }
await go(A, best.stand.x, best.stand.y, best.dir); const fb0 = has(A, 'fiber');
const t7 = await req(A, { t: 'use', slot: slot(A, 'sickle'), x: best.at.x, y: best.at.y, dir: best.dir, size: big('sickle') });
check(`金的鐮刀一次割 3×3 裡的雜草（這裡有 ${best.n} 根）`, t7.t === 'ok' && (best.n === 1 ? true : t7.n === best.n) && has(A, 'fiber') === fb0 + best.n, JSON.stringify({ t7, n: best.n }));
// 8. 第二個玩家沒升級：一次只能一格；沒有播種器不能升播種器
await go(Bc, spot.x - 1.5, spot.y - 0.5, 'down');
const t8 = await req(Bc, { t: 'use', slot: slot(Bc, 'hoe'), x: spot.x - 2, y: spot.y, dir: 'down', size: 3 });
check('沒升級的鋤頭：範圍送多大都只翻一格', t8.t === 'ok' && !t8.n);
// 9. 過幾天讓紅蘿蔔長大（每天澆一片），金的鐮刀一次收成 3×3；一次割一片時不會割掉還在長的作物
const enterHouse = async (c) => { await go(c, 9.5, 9.3, 'up'); return req(c, { t: 'warp', i: 1 }); };
const exitHouse = async (c) => { await go(c, 4.5, 8.2, 'down'); return req(c, { t: 'warp', i: 0 }); };
const water = async () => { await go(A, spot.x + 0.5, spot.y - 0.5, 'down'); return req(A, { t: 'use', slot: slot(A, 'can'), x: spot.x, y: spot.y, dir: 'down', size: big('can') }); };
for (let d = 1; d <= 4; d++) { // 第 1 天已經澆過；睡四晚，中間三天各澆一次
  await enterHouse(A); await enterHouse(Bc); await go(A, 2, 3.4); await go(Bc, 2.6, 3.4); A.clear();
  await req(A, { t: 'sleep', on: true }); await req(Bc, { t: 'sleep', on: true }); await A.wait('newday', () => true, 8000);
  await exitHouse(A); await exitHouse(Bc); if (d < 4) await water();
}
await go(A, spot.x + 0.5, spot.y - 0.5, 'down'); const c0 = has(A, 'carrot'); Bc.clear();
const hv = await req(A, { t: 'use', slot: slot(A, 'sickle'), x: spot.x, y: spot.y, dir: 'down', size: big('sickle') });
check(`第 ${A.farm.day} 天紅蘿蔔熟了：金的鐮刀一次收成 3×3＝9 個，對方收到一整片`, hv.t === 'ok' && hv.harvested === 9 && has(A, 'carrot') === c0 + 9 && !!(await Bc.wait('tiles', (m) => m.kind === 'harvest' && m.list.length === 9)), JSON.stringify(hv));
const replant = await req(A, { t: 'use', slot: slot(A, 'seed_carrot'), x: spot.x, y: spot.y, dir: 'down', size: big('seeder') });
check('收完的那 9 格再播一次（5×5 裡還有左右兩邊各一格剛才單獨翻的，也一起播：一共 11 格）', replant.t === 'ok' && replant.n === 11, JSON.stringify(replant));
check('鐮刀一次割一片：剛種下去的不會被割掉', (await req(A, { t: 'use', slot: slot(A, 'sickle'), x: spot.x, y: spot.y, dir: 'down', size: big('sickle') })).reason === 'nothing');
check('範圍切成 1×1 才會割掉那一株（要割的時候還是割得掉）', (await req(A, { t: 'use', slot: slot(A, 'sickle'), x: spot.x, y: spot.y, dir: 'down', size: 0 })).t === 'ok');
// 10. 晶的十字鎬在礦坑一次敲一片
await go(A, 42.5, 16); await req(A, { t: 'warp', i: 0 }); await go(A, 20.6, 0.7); await req(A, { t: 'warp', i: 2 }); await go(A, 31.5, 18.6);
A.clear(); await req(A, { t: 'mine-enter', floor: 1 }); const ms = ((await A.wait('mine')) || {}).state;
let mb = null; const isRock = (x, y) => ms.rocks.some((k) => k.x === x && k.y === y);
for (const r of ms.rocks) for (const dir of ['down', 'up', 'left', 'right']) {
  const f = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir], sx = r.x - f[0], sy = r.y - f[1]; if (isRock(sx, sy)) continue;
  const n = areaTiles(r.x, r.y, dir, [3, 3]).filter((q) => isRock(q.x, q.y)).length; if (!mb || n > mb.n) mb = { r, dir, n, sx, sy };
}
await go(A, mb.sx + 0.5, mb.sy + 0.5, mb.dir); const me0 = A.self.energy; A.clear();
const mh = await req(A, { t: 'mine-hit', x: mb.r.x, y: mb.r.y, slot: slot(A, 'pick'), dir: mb.dir, size: 1 }), mu = await A.wait('mine-upd');
check(`晶的十字鎬在礦坑一次敲 3×3（這裡有 ${mb.n} 顆石頭），一下就碎、這一層的人收到一整片`, !!ms && mh.t === 'ok' && mh.n === mb.n && !!mu && mu.rocks.length === mb.n && mu.rocks.every((k) => k.hp === 0), JSON.stringify({ mh, n: mb.n }));
check('體力照顆數扣', A.self.energy === me0 - mb.n * BAL.mine.energy, `${me0} → ${A.self.energy}`);
await go(A, ms.spawn.x + 0.5, ms.spawn.y + 0.5); await req(A, { t: 'mine-exit' });
// 11. 到鐵匠鋪升到晶：要金錠 10 個、鑽石 1、月光石 2（從湖邊走回路上，再到小鎮）
await go(A, 17.5, 25.4); await req(A, { t: 'warp', i: 0 }); await go(A, 28.5, 7); await req(A, { t: 'warp', i: 1 }); await go(A, 30, 9.7);
const g0 = has(A, 'gold_bar'), up = await req(A, { t: 'upgrade', tool: 'hoe' });
check('鐵匠鋪：鋤頭從金升到晶（用掉金錠 10、鑽石 1、月光石 2）', up.t === 'ok' && up.lv === 5 && A.self.toolLv.hoe === 5 && has(A, 'gold_bar') === g0 - 10 && has(A, 'diamond') === 0 && has(A, 'moonstone') === 0, JSON.stringify(up));
check('晶已經是最高級', (await req(A, { t: 'upgrade', tool: 'hoe' })).reason === 'max');
check('晶的鋤頭可以選到 5×5', JSON.stringify(toolShapes(BAL, 'hoe', 5).pop()) === '[5,5]');
const B2 = Bc; await go(B2, 42.5, 16); await req(B2, { t: 'warp', i: 0 }); await go(B2, 28.5, 7); await req(B2, { t: 'warp', i: 1 }); await go(B2, 30, 9.7);
check('沒有播種器的人不能升播種器', (await req(B2, { t: 'upgrade', tool: 'seeder' })).reason === 'unknown');
A.ws.close(); Bc.ws.close(); await sleep(300);
console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
