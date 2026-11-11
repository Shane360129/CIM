// 晴耕谷的伺服器：FarmRoom。每個一對一對話一個實例（idFromName('farm:' + 對話 id)），自己的 SQLite，跟聊天資料完全分開。
// 身分由 src/index.js 先向 ChatServer 驗證過，寫在 x-farm-auth 標頭；這裡不直接相信瀏覽器。
// 一切以這裡為準：格子、物品、錢、時間由這裡決定；玩家的走動在各自畫面先動，這裡只轉給對方。協定見 docs/farm-game/協定.md。
// 內容（地圖、作物、物品、數值）都讀 public/games/farm/data/ 的 JSON，跟畫面用同一份；規則的計算在 shared/rules.js。
import BAL from '../public/games/farm/data/balance.json';
import PARTS from '../public/games/farm/data/doll/parts.json';
import RAW_ITEMS from '../public/games/farm/data/items.json';
import MACHINES from '../public/games/farm/data/machines.json';
import RECIPES from '../public/games/farm/data/recipes.json';
import ANIMALS from '../public/games/farm/data/animals.json';
import CROPS from '../public/games/farm/data/crops.json';
import OBJECTS from '../public/games/farm/data/objects.json';
import MAP_FARM from '../public/games/farm/data/maps/farm.json';
import MAP_HOUSE from '../public/games/farm/data/maps/house.json';
import MAP_ROAD from '../public/games/farm/data/maps/road.json';
import MAP_LAKE from '../public/games/farm/data/maps/lake.json';
import FISH from '../public/games/farm/data/fish.json';
import MAP_TOWN from '../public/games/farm/data/maps/town.json';
import NPCS from '../public/games/farm/data/npcs/residents.json';
import { groundAt, seasonId, rng, weatherOf, isWet, cropStage, cropTotal, levelOf, rollQuality, invAdd, invTake, sellPrice, makeItems, matches, planTake, absMinute, animalPos, genFloor, monPos, mineMap, npcPos, giftTaste, seasonIndex } from '../public/games/farm/shared/rules.js';

const ITEMS = makeItems(RAW_ITEMS, MACHINES); // 加工品（g:機器:原料）的名字和價錢是算出來的

const MAPS = { farm: MAP_FARM, house: MAP_HOUSE, road: MAP_ROAD, lake: MAP_LAKE, town: MAP_TOWN };
// 每張地圖上不會動的東西（房子、長椅…）佔了哪些格子：採集物、雜草不會長在這些格子上
const STATIC = Object.fromEntries(Object.entries(MAPS).map(([id, m]) => [id, new Set(m.objects.flatMap((o) => { const [tw, th] = OBJECTS[o.type].tiles || [1, 1], out = []; for (let x = 0; x < tw; x++) for (let y = 0; y < th; y++) out.push((o.x + x) + ',' + (o.y - y)); return out; }))]));
const TICK_MS = 10000;                 // 有人在線時，每 10 秒推進一次遊戲時鐘
const DAY_SPAN = BAL.dayEndMinute - BAL.dayStartMinute;            // 一天有幾個遊戲分鐘（早上 6 點到凌晨 2 點）
const MIN_PER_MS = DAY_SPAN / (BAL.dayMinutesReal * 60000);         // 現實一毫秒等於幾個遊戲分鐘
const CHUNK = 16, BACKUP_DAYS = 7, MOVE_MIN_MS = 40;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MINE_MAP = mineMap(BAL, 0), MINE_EXIT = { map: 'lake', x: 31.5, y: 18.7 }; // 礦坑每一層一樣大；出來的地方是湖邊的入口前面
const K = (map, x, y) => `${map}:${x},${y}`;
const unK = (k) => { const [map, xy] = k.split(':'), [x, y] = xy.split(',').map(Number); return { map, x, y }; };
// 外觀只收清單裡有的零件和顏色（data/doll/parts.json），其他一律不收
const LOOK_IDS = ['eyes', 'brows', 'mouths', 'hair', 'top', 'bottom', 'shoes', 'hat', 'acc'];
const LOOK_COLORS = { skin: 'skin', hairColor: 'hair', topColor: 'cloth', bottomColor: 'cloth', shoesColor: 'cloth', hatColor: 'cloth' };
export function cleanLook(look) {
  if (!look || typeof look !== 'object' || !['boy', 'girl'].includes(look.gender)) return null;
  const out = { gender: look.gender };
  for (const k of LOOK_IDS) { if (!PARTS[k].some((v) => v.id === look[k])) return null; out[k] = look[k]; }
  for (const [k, list] of Object.entries(LOOK_COLORS)) { if (!PARTS.colors[list].includes(look[k])) return null; out[k] = look[k]; }
  return out;
}
const cleanName = (name) => String(name || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 10);

export class FarmRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql;
    // chunks 是階段 2 的舊表（沒有分地圖），留著不動；階段 4 起格子存在 mapchunks
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS chunks (cx INTEGER NOT NULL, cy INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (cx, cy));
      CREATE TABLE IF NOT EXISTS mapchunks (map TEXT NOT NULL, cx INTEGER NOT NULL, cy INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (map, cx, cy));
      CREATE TABLE IF NOT EXISTS objs (k TEXT PRIMARY KEY, data TEXT);
      CREATE TABLE IF NOT EXISTS players (user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL, last_seen INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, day INTEGER NOT NULL, user_id INTEGER NOT NULL, type TEXT NOT NULL, data TEXT);
      CREATE TABLE IF NOT EXISTS backups (day INTEGER PRIMARY KEY, ts INTEGER NOT NULL, data TEXT NOT NULL);
    `);
    // 連線保持用的 ping 由系統自動回，不會把休眠中的實例叫醒
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.farm = null; this.tiles = null; this.objs = null; this.pl = new Map(); this.dirty = new Set(); this.dirtyObjs = new Set(); this.dirtyPl = new Set(); this.farmDirty = false;
  }

  // ---------- 資料：讀進記憶體，改過的在每個訊息處理完時寫回 ----------
  load() {
    if (this.farm) return;
    const row = this.sql.exec(`SELECT value FROM meta WHERE key = 'farm'`).toArray()[0];
    this.farm = row ? JSON.parse(row.value) : { v: 4, created: Date.now(), convId: 0, seed: Math.floor(Math.random() * 1e9), day: 1, minute: BAL.dayStartMinute, money: BAL.startMoney, lastTick: 0, ship: [], lastShip: null, chest: [] };
    if (!this.farm.v) Object.assign(this.farm, { v: 4, seed: this.farm.seed || Math.floor(Math.random() * 1e9), ship: [], lastShip: null, chest: [], money: this.farm.money ?? BAL.startMoney }); // 階段 2 留下的農場：補上新欄位
    this.tiles = new Map();
    for (const r of this.sql.exec(`SELECT data FROM mapchunks`).toArray()) for (const [k, v] of Object.entries(JSON.parse(r.data))) this.tiles.set(k, v);
    // 可以清掉的東西（樹、石頭、樹枝、雜草）：地圖檔裡原本有的，加上之後的變化（被清掉、被砍了幾下）
    this.objs = new Map();
    for (const [id, m] of Object.entries(MAPS)) for (const o of m.objects) if (OBJECTS[o.type].tool) this.objs.set(K(id, o.x, o.y), { type: o.type, hp: OBJECTS[o.type].hp });
    for (const r of this.sql.exec(`SELECT k, data FROM objs`).toArray()) { if (r.data) this.objs.set(r.k, JSON.parse(r.data)); else this.objs.delete(r.k); }
    if (this.farm.forageDay !== this.farm.day) { this.spawnDaily(); this.flush(); } // 新農場的第一天也要有東西可以撿
  }
  // 每天早上：野外長出這一季的採集物（昨天沒撿的會不見），農場多幾根雜草。位置用農場的種子算，同一天重算結果一樣
  spawnDaily() {
    const f = this.farm, list = BAL.forage.bySeason[seasonId(f.day, BAL)] || [];
    for (const [k, o] of this.objs) if (o.type === 'forage') { this.objs.delete(k); this.dirtyObjs.add(k); }
    const place = (map, rand, make) => {
      const m = MAPS[map];
      for (let tries = 0; tries < 60; tries++) {
        const x = 2 + Math.floor(rand() * (m.w - 4)), y = 2 + Math.floor(rand() * (m.h - 4)), k = K(map, x, y), g = groundAt(m, x, y);
        if (!make.grounds.includes(g) || STATIC[map].has(x + ',' + y) || this.objs.has(k) || this.tiles.has(k)) continue;
        this.objs.set(k, make.obj()); this.dirtyObjs.add(k); return;
      }
    };
    Object.entries(BAL.forage.perMap).forEach(([map, n], mi) => {
      if (!MAPS[map] || !list.length) return; const rand = rng(f.seed + f.day * 131 + mi * 17);
      for (let i = 0; i < n; i++) place(map, rand, { grounds: ['grass'], obj: () => ({ type: 'forage', item: list[Math.floor(rand() * list.length)], hp: 1 }) });
    });
    const weeds = [...this.objs.values()].filter((o) => o.type === 'weed').length, rand = rng(f.seed + f.day * 977);
    if (f.day > 1) for (let i = 0; i < BAL.forage.weedsPerDay && weeds + i < BAL.forage.weedsMax; i++) place('farm', rand, { grounds: ['grass', 'soil'], obj: () => ({ type: 'weed', hp: OBJECTS.weed.hp }) });
    f.forageDay = f.day; this.farmDirty = true;
  }
  touch(map, x, y) { this.dirty.add(`${map}:${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`); }
  // 格子分區塊存（16×16 一塊）：一個動作、一次換日改很多格也只寫幾列，不會每格寫一次
  flush() {
    for (const key of this.dirty) {
      const { map, x: cx, y: cy } = unK(key), data = {};
      for (const [k, v] of this.tiles) { const t = unK(k); if (t.map === map && Math.floor(t.x / CHUNK) === cx && Math.floor(t.y / CHUNK) === cy) data[k] = v; }
      if (Object.keys(data).length) this.sql.exec(`INSERT OR REPLACE INTO mapchunks (map, cx, cy, data) VALUES (?, ?, ?, ?)`, map, cx, cy, JSON.stringify(data));
      else this.sql.exec(`DELETE FROM mapchunks WHERE map = ? AND cx = ? AND cy = ?`, map, cx, cy);
    }
    for (const k of this.dirtyObjs) { const o = this.objs.get(k); this.sql.exec(`INSERT OR REPLACE INTO objs (k, data) VALUES (?, ?)`, k, o ? JSON.stringify(o) : null); }
    for (const id of this.dirtyPl) { const p = this.pl.get(id); if (p) this.sql.exec(`UPDATE players SET data = ? WHERE user_id = ?`, JSON.stringify(p), id); }
    if (this.farmDirty) this.sql.exec(`INSERT OR REPLACE INTO meta (key, value) VALUES ('farm', ?)`, JSON.stringify(this.farm));
    this.dirty.clear(); this.dirtyObjs.clear(); this.dirtyPl.clear(); this.farmDirty = false;
  }
  saveFarm() { this.farmDirty = true; this.flush(); }
  // 玩家的東西（背包、體力、技能、外觀）：比較大，不放在連線的附註裡（那個有 2KB 上限），放在記憶體，改了就寫回
  player(id, name = '') {
    let p = this.pl.get(id); if (p) return p;
    const row = this.sql.exec(`SELECT data FROM players WHERE user_id = ?`, id).toArray()[0];
    p = row ? JSON.parse(row.data) : null;
    if (!p || !p.inv) { // 新玩家（或階段 2 留下的舊資料）：發工具和一點種子
      p = { x: MAPS.farm.spawn.x, y: MAPS.farm.spawn.y, dir: 'down', map: 'farm', look: null, nick: '', lastDay: this.farm.day, lastMoney: this.farm.money, ...(p || {}), inv: [], energy: BAL.energyMax, skills: {} };
      if (!MAPS[p.map]) { p.map = 'farm'; p.x = MAPS.farm.spawn.x; p.y = MAPS.farm.spawn.y; }
      for (const [item, n] of BAL.startItems) invAdd(p.inv, BAL.invSlots, item, n);
      this.sql.exec(`INSERT OR REPLACE INTO players (user_id, name, data, last_seen) VALUES (?, ?, ?, ?)`, id, name, JSON.stringify(p), row ? Date.now() : 0);
    }
    this.pl.set(id, p); return p;
  }
  logEvent(userId, type, data) { this.sql.exec(`INSERT INTO events (ts, day, user_id, type, data) VALUES (?, ?, ?, ?, ?)`, Date.now(), this.farm.day, userId, type, data ? JSON.stringify(data) : null); }
  pubTile(k) { const v = this.tiles.get(k), t = unK(k); return v ? { ...t, t: 1, w: v.w === this.farm.day ? 1 : 0, f: v.f || 0, c: v.c ? { id: v.c.id, s: v.c.dead ? -1 : cropStage(CROPS[v.c.id], v.c.g) } : null } : { ...t, t: 0 }; }
  pubObj(k) { const o = this.objs.get(k); return o ? { ...unK(k), type: o.type, hp: o.hp, ...(o.item ? { item: o.item } : {}), ...(o.kind ? { kind: o.kind, out: o.out || null, doneAt: o.doneAt || 0 } : {}) } : { ...unK(k), type: null }; }
  absNow() { return absMinute(this.farm.day, this.minuteNow(), BAL); }
  pubSelf(a) { const p = this.player(a.id); return { inv: p.inv, energy: p.energy, energyMax: BAL.energyMax, skills: p.skills, fishRec: p.fishRec || {}, buffs: p.buffs || {}, hp: p.hp ?? BAL.mine.hpMax, hpMax: BAL.mine.hpMax, friend: p.friend || {} }; }

  // ---------- 連線 ----------
  sockets() { return this.ctx.getWebSockets(); }
  online() { return this.sockets().map((ws) => ({ ws, a: ws.deserializeAttachment() })).filter((s) => s.a && !s.a.gone); } // gone：被自己的新分頁換掉的舊連線
  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch { /* 對方剛好斷線 */ } }
  broadcast(msg, exceptId = 0) { const text = JSON.stringify(msg); for (const { ws, a } of this.online()) if (a.id !== exceptId) { try { ws.send(text); } catch {} } }
  mapOf(a) { return a.map === 'mine' ? MINE_MAP : MAPS[a.map]; }
  pub(a) { const p = this.player(a.id); return { id: a.id, name: p.nick || a.name, look: p.look || null, color: a.color, map: a.map, floor: a.floor || 0, x: a.x, y: a.y, dir: a.dir, vx: a.vx || 0, vy: a.vy || 0, asleep: !!a.asleep }; }

  async fetch(request) {
    const url = new URL(request.url);
    let who;
    try { who = JSON.parse(decodeURIComponent(request.headers.get('x-farm-auth') || '')); } catch { return json({ error: '沒有通過驗證' }, 401); }
    if (!who || !who.user || !who.convId) return json({ error: '沒有通過驗證' }, 401);
    this.load();
    if (!this.farm.convId) { this.farm.convId = who.convId; this.saveFarm(); }
    if (url.pathname === '/farm/ws') return this.connect(request, who);
    if (request.method === 'GET' && url.pathname === '/api/farmroom/backups')
      return json({ backups: this.sql.exec(`SELECT day, ts FROM backups ORDER BY day DESC`).toArray() });
    if (request.method === 'POST' && url.pathname === '/api/farmroom/restore') return this.restore(request, who);
    return json({ error: '找不到這個端點' }, 404);
  }

  async connect(request, who) {
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: '需要 WebSocket 連線' }, 426);
    const me = who.user, now = Date.now();
    // 同一個人開第二個分頁：舊的那個請它離開，不然會有兩個自己
    for (const { ws, a } of this.online()) if (a.id === me.id) { this.send(ws, { t: 'replaced' }); ws.serializeAttachment({ ...a, gone: true }); try { ws.close(4001, 'replaced'); } catch {} }
    const row = this.sql.exec(`SELECT last_seen FROM players WHERE user_id = ?`, me.id).toArray()[0];
    const p = this.player(me.id, me.name);
    const others = this.online().filter((s) => s.a.id !== me.id);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const a = { id: me.id, name: me.name, color: me.color, map: p.map, x: p.x, y: p.y, dir: p.dir, vx: 0, vy: 0, asleep: false, mt: 0 };
    server.serializeAttachment(a);
    // 時鐘只在有人的時候走：第一個人進來，從現在開始算
    if (!others.length) { this.farm.lastTick = now; this.saveFarm(); await this.ctx.storage.setAlarm(now + TICK_MS); }
    const summary = row && row.last_seen ? this.summaryFor(me.id, p, row.last_seen) : null;
    p.lastDay = this.farm.day; p.lastMoney = this.farm.money; this.dirtyPl.add(me.id); this.flush();
    this.sql.exec(`UPDATE players SET last_seen = ?, name = ? WHERE user_id = ?`, now, me.name, me.id);
    this.send(server, { t: 'snapshot', you: this.pub(a), self: this.pubSelf(a), partner: who.partner, players: others.map((s) => this.pub(s.a)), farm: this.pubFarm(),
      tiles: [...this.tiles.keys()].map((k) => this.pubTile(k)), objs: [...this.objs.keys()].map((k) => this.pubObj(k)), summary });
    this.broadcast({ t: 'join', p: this.pub(a) }, me.id);
    const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map((s) => s.trim());
    return new Response(null, { status: 101, webSocket: client, headers: protocols.includes('farm.v1') ? { 'Sec-WebSocket-Protocol': 'farm.v1' } : {} });
  }
  // 現在的遊戲時間：上次記下的分鐘，加上從那之後過了多久（兩次 tick 之間也準）
  minuteNow(now = Date.now()) { return this.farm.lastTick && this.online().length ? this.farm.minute + Math.min(now - this.farm.lastTick, TICK_MS * 3) * MIN_PER_MS : this.farm.minute; }
  pubFarm() {
    const f = this.farm;
    return { day: f.day, minute: this.minuteNow(), money: f.money, season: seasonId(f.day, BAL), weather: weatherOf(f.seed, f.day, BAL), minutesPerSecond: MIN_PER_MS * 1000, dayStart: BAL.dayStartMinute, dayEnd: BAL.dayEndMinute,
      now: Date.now(), mineDeepest: f.mineDeepest || 1, ship: f.ship, lastShip: f.lastShip, chest: f.chest, newborn: f.newborn || [], animals: f.animals || [], pets: f.pets || [], graze: !!f.graze };
  }
  // 「你不在時發生的事」：過了幾天、錢差多少、對方做了什麼
  summaryFor(userId, saved, lastSeen) {
    const acts = this.sql.exec(`SELECT type, COUNT(*) AS n FROM events WHERE ts > ? AND user_id != ? AND user_id != 0 GROUP BY type`, lastSeen, userId).toArray();
    const days = this.farm.day - ((saved && saved.lastDay) || this.farm.day), money = this.farm.money - ((saved && saved.lastMoney) ?? this.farm.money);
    if (!days && !money && !acts.length) return null;
    return { days, money, acts: Object.fromEntries(acts.map((r) => [r.type, r.n])), since: lastSeen };
  }

  // ---------- 收到訊息 ----------
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 2000) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    const a = ws.deserializeAttachment(); if (!a || a.gone || !m || typeof m.t !== 'string') return;
    this.load();
    if (m.t === 'move') return this.onMove(ws, a, m);
    const p = this.player(a.id, a.name), id = Number(m.id) || 0;
    const no = (reason, extra) => this.send(ws, { t: 'no', id, reason, ...extra });
    const done = (extra) => { this.send(ws, { t: 'ok', id, ...extra }); };
    const self = () => { this.dirtyPl.add(a.id); this.send(ws, { t: 'self', ...this.pubSelf(a) }); };   // 背包、體力、技能變了：只告訴本人
    const farmChanged = () => { this.farmDirty = true; this.broadcast({ t: 'farm', money: this.farm.money, ship: this.farm.ship, chest: this.farm.chest }); }; // 錢、出貨箱、倉庫是兩個人共用的
    const near = (use) => this.nearUse(a, use);
    const n = clamp(Math.floor(Number(m.n) || 1), 1, 999), slot = Math.floor(Number(m.slot));
    if (m.t === 'use') this.onUse(ws, a, p, m, { no, done, self });
    else if (m.t === 'swap') { // 背包裡搬東西：兩格對調，同一種就疊起來
      const b = Math.floor(Number(m.b)); if (![slot, b].every((i) => i >= 0 && i < BAL.invSlots) || slot === b) return no('slot');
      const x = p.inv[slot], y = p.inv[b];
      if (x && y && x.id === y.id && (x.q || 0) === (y.q || 0) && y.n < 99) { const k = Math.min(x.n, 99 - y.n); y.n += k; x.n -= k; if (!x.n) p.inv[slot] = null; } else { p.inv[slot] = y || null; p.inv[b] = x || null; }
      self(); done();
    } else if (m.t === 'ship') { // 放進出貨箱：隔天早上結算
      const s = p.inv[slot]; if (!near('bin')) return no('far'); if (!s || !(ITEMS[s.id].sell > 0) || ITEMS[s.id].kind === 'tool') return no('unsellable');
      const k = Math.min(n, s.n), q = s.q || 0, line = this.farm.ship.find((l) => l.id === s.id && l.q === q && l.by === a.id);
      invTake(p.inv, slot, k); if (line) line.n += k; else this.farm.ship.push({ id: s.id, q, n: k, by: a.id });
      this.logEvent(a.id, 'ship', { id: s.id, n: k }); self(); farmChanged(); done();
    } else if (m.t === 'buy') { // 種子攤：營業時間內才買得到，錢是兩個人共用的
      const item = ITEMS[m.item], min = this.minuteNow(); if (!near('shop')) return no('far'); if (!item || !BAL.shop.items.includes(m.item)) return no('unknown');
      if (min < BAL.shop.open || min >= BAL.shop.close) return no('closed'); if (this.farm.money < item.buy * n) return no('money');
      if (!invAdd(p.inv, BAL.invSlots, m.item, n)) return no('full');
      this.farm.money -= item.buy * n; this.logEvent(a.id, 'buy', { id: m.item, n }); self(); farmChanged(); done();
    } else if (m.t === 'chest') { // 家裡的倉庫箱（兩個人共用）：in 放進去、out 拿出來
      if (!near('chest')) return no('far');
      const from = m.dir === 'in' ? p.inv : this.farm.chest, to = m.dir === 'in' ? this.farm.chest : p.inv, cap = m.dir === 'in' ? BAL.chestSlots : BAL.invSlots, s = from[slot];
      if (!s) return no('slot'); const k = Math.min(n, s.n);
      if (!invAdd(to, cap, s.id, k, s.q || 0)) return no('full');
      invTake(from, slot, k); self(); farmChanged(); done();
    } else if (m.t === 'warp') this.onWarp(ws, a, p, m, { no, done });
    else if (m.t === 'craft') { // 製作台：用材料做加工機
      const mc = MACHINES[m.kind]; if (!near('workbench')) return no('far'); if (!mc) return no('unknown');
      const plan = planTake(ITEMS, p.inv, mc.craft); if (!plan) return no('materials');
      const inv = JSON.parse(JSON.stringify(p.inv)); for (const [i, k] of plan) invTake(inv, i, k);
      if (!invAdd(inv, BAL.invSlots, 'm_' + m.kind, 1)) return no('full');
      p.inv = inv; this.logEvent(a.id, 'craft', { kind: m.kind }); self(); done();
    } else if (m.t === 'cook') { // 爐灶：照食譜煮。料理等級夠才會煮；對方也在旁邊的話，一起煮出來的比較好吃
      const rc = RECIPES[m.recipe]; if (!near('stove')) return no('far'); if (!rc) return no('unknown');
      if (levelOf(p.skills.cooking || 0, BAL).lv < rc.level) return no('level');
      const plan = planTake(ITEMS, p.inv, rc.in); if (!plan) return no('materials');
      const inv = JSON.parse(JSON.stringify(p.inv)); for (const [i, k] of plan) invTake(inv, i, k);
      const together = this.online().some((s) => s.a.id !== a.id && s.a.map === a.map && Math.hypot(s.a.x - a.x, s.a.y - a.y) <= BAL.cooking.togetherReach);
      if (!invAdd(inv, BAL.invSlots, 'dish_' + m.recipe, 1, together ? 1 : 0)) return no('full');
      p.inv = inv; p.skills.cooking = (p.skills.cooking || 0) + BAL.cooking.xp; this.logEvent(a.id, 'cook', { id: m.recipe });
      self(); this.broadcast({ t: 'fx', id: a.id, kind: 'cook', map: a.map, x: Math.floor(a.x), y: Math.floor(a.y), item: 'dish_' + m.recipe }); done({ together });
    } else if (m.t === 'eat') { // 吃料理：補體力，有些有一段時間的效果
      const sl = p.inv[slot], it = sl && ITEMS[sl.id]; if (!it || it.kind !== 'dish') return no('slot');
      const k = 1 + 0.25 * (sl.q || 0); invTake(p.inv, slot, 1);
      p.energy = Math.min(BAL.energyMax, p.energy + Math.round(it.energy * k));
      if (it.buff) { p.buffs ||= {}; p.buffs[it.buff[0]] = this.absNow() + Math.round(it.buff[1] * k); }
      self(); this.broadcast({ t: 'fx', id: a.id, kind: 'eat', map: a.map, x: Math.floor(a.x), y: Math.floor(a.y) }); done({ buff: it.buff || null });
    }
    else if (['animal-buy', 'animal', 'feed', 'graze', 'adopt', 'pet'].includes(m.t)) this.onAnimal(a, p, m, { no, done, self, near, farmChanged });
    else if (m.t === 'talk' || m.t === 'gift') this.onNpc(a, p, m, { no, done, self });
    else if (m.t.startsWith('mine-') || m.t === 'mon-hit' || m.t === 'hurt') this.onMine(ws, a, p, m, { no, done, self, near });
    else if (m.t === 'fish') this.onFish(a, p, m, { no, done, self });
    else if (m.t === 'reel') this.onReel(a, p, m, { no, done, self });
    else if (m.t === 'look') { // 建立角色、換裝：存起來，對方馬上看到
      const look = cleanLook(m.look); if (!look) return no('look');
      p.look = look; p.nick = cleanName(m.name) || p.nick; this.dirtyPl.add(a.id);
      this.broadcast({ t: 'look', id: a.id, look, name: p.nick || a.name });
    } else if (m.t === 'bubble') { const text = String(m.text || '').replace(/\s+/g, ' ').trim().slice(0, BAL.bubbleMaxChars); if (text) this.broadcast({ t: 'bubble', id: a.id, text }); }
    else if (m.t === 'emote') { if (BAL.emotes.includes(m.e)) this.broadcast({ t: 'emote', id: a.id, e: m.e }); }
    else if (m.t === 'sleep') {
      if (m.on && !near('bed')) return no('far');
      a.asleep = !!m.on; a.sleptAt = this.minuteNow(); ws.serializeAttachment(a); this.broadcast({ t: 'sleep', id: a.id, on: a.asleep }); done();
      if (a.asleep) { this.flush(); await this.maybeNewDay('sleep'); }
    }
    this.flush();
  }
  // ---------- 居民 ----------
  // 好感是每個玩家各算各的。居民在哪裡是照行程用時間算的（shared/rules.js 的 npcPos），這裡只檢查你是不是站在他旁邊
  onNpc(a, p, m, { no, done, self }) {
    const npc = NPCS[m.npc], F = BAL.friend, f = this.farm; if (!npc || !npc.full) return no('unknown');
    const pos = npcPos(npc, this.minuteNow(), F.walkMinutes); if (a.map !== 'town' || Math.hypot(pos.x - a.x, pos.y - a.y) > BAL.reach + 1.5) return no('far');
    const fr = ((p.friend ||= {})[m.npc] ||= { pts: 0, talk: 0, giftDay: 0, week: 0, gifts: 0, met: false });
    const bday = npc.birthday && npc.birthday[0] === seasonIndex(f.day, BAL) && npc.birthday[1] === ((f.day - 1) % BAL.seasonDays) + 1;
    if (m.t === 'talk') { // 每天第一次聊天會增加好感
      const first = !fr.met, daily = fr.talk !== f.day; fr.met = true;
      if (daily) { fr.talk = f.day; fr.pts = clamp(fr.pts + F.talk, 0, F.max); this.logEvent(a.id, 'talk', { npc: m.npc }); }
      self(); return done({ first, daily, pts: fr.pts, bday });
    }
    // 送禮：一天一次、一週兩次（生日那天好感加四倍）
    const slot = Math.floor(Number(m.slot)), held = p.inv[slot], it = held && ITEMS[held.id]; if (!it || it.kind === 'tool') return no('slot');
    const week = Math.floor((f.day - 1) / 7); if (fr.week !== week) { fr.week = week; fr.gifts = 0; }
    if (fr.giftDay === f.day) return no('giftday'); if (fr.gifts >= F.giftsPerWeek) return no('giftweek');
    const taste = giftTaste(ITEMS, npc, held.id), gain = F.gift[taste] * (bday ? F.birthdayMult : 1) * (1 + 0.25 * (held.q || 0));
    invTake(p.inv, slot, 1); fr.met = true; fr.giftDay = f.day; fr.gifts += 1; fr.pts = clamp(fr.pts + Math.round(gain), 0, F.max);
    this.logEvent(a.id, 'gift', { npc: m.npc, id: held.id }); self(); this.broadcast({ t: 'fx', id: a.id, kind: 'eat', map: a.map, x: Math.floor(a.x), y: Math.floor(a.y) });
    return done({ taste, pts: fr.pts, bday });
  }

  // ---------- 礦坑 ----------
  // 每一層用種子生成（shared/rules.js 的 genFloor），當天敲掉了哪些石頭記在農場上，隔天重新長出來。人在礦坑裡時 a.map 是 'mine'、a.floor 是第幾層
  floorState(n) { const f = this.farm; if (!f.mine || f.mine.day !== f.day) f.mine = { day: f.day, floors: {} }; return (f.mine.floors[n] ||= genFloor(f.seed, n, f.day, BAL)); }
  toFloor(n, msg) { const text = JSON.stringify(msg); for (const { ws, a } of this.online()) if (a.map === 'mine' && a.floor === n) { try { ws.send(text); } catch {} } }
  onMine(ws, a, p, m, { no, done, self, near }) {
    const f = this.farm, M = BAL.mine, inMine = a.map === 'mine', st = inMine ? this.floorState(a.floor) : null;
    const goTo = (floor) => {
      const s2 = this.floorState(floor); a.map = 'mine'; a.floor = floor; a.x = s2.spawn.x + 0.5; a.y = s2.spawn.y + 0.5; a.vx = a.vy = 0; ws.serializeAttachment(a);
      f.mineDeepest = Math.max(f.mineDeepest || 1, floor); this.farmDirty = true;
      this.broadcast({ t: 'warp', id: a.id, map: 'mine', floor, x: a.x, y: a.y, dir: 'up' }); this.send(ws, { t: 'mine', state: s2, deepest: f.mineDeepest });
    };
    const leave = (faint) => { Object.assign(a, { ...MINE_EXIT, floor: 0, vx: 0, vy: 0 }); ws.serializeAttachment(a); Object.assign(p, MINE_EXIT); this.dirtyPl.add(a.id); this.broadcast({ t: 'warp', id: a.id, map: a.map, x: a.x, y: a.y, dir: 'down', faint: !!faint }); };
    if (m.t === 'mine-enter') { // 從入口進去：第 1 層，或坐電梯到去過的第 5、10、15… 層
      const floor = Math.floor(Number(m.floor)) || 1; if (inMine ? Math.hypot(st.spawn.x + 0.5 - a.x, st.spawn.y + 0.5 - a.y) > 2.5 : !near('mine')) return no('far');
      if (floor < 1 || floor > M.floors || (floor > 1 && (floor % M.elevatorEvery !== 0 || floor > (f.mineDeepest || 1)))) return no('closed');
      goTo(floor); return done();
    }
    if (!inMine) return no('far');
    if (m.t === 'mine-exit') { if (Math.hypot(st.spawn.x + 0.5 - a.x, st.spawn.y + 0.5 - a.y) > 2.5) return no('far'); leave(false); return done(); }
    if (m.t === 'mine-down') {
      if (!st.stairs.open) return no('nothing'); if (Math.hypot(st.stairs.x + 0.5 - a.x, st.stairs.y + 0.5 - a.y) > 2.2) return no('far');
      if (a.floor >= M.floors) return no('closed'); goTo(a.floor + 1); return done();
    }
    const held = p.inv[Math.floor(Number(m.slot))], tool = held && ITEMS[held.id].tool;
    if (m.t === 'mine-hit') { // 敲石頭：要用十字鎬。敲碎了掉石頭、礦石或寶石；樓梯藏在其中一顆下面
      const x = Math.floor(Number(m.x)), y = Math.floor(Number(m.y)), rock = st.rocks.find((r) => r.x === x && r.y === y); if (!rock) return no('nothing');
      if (tool !== 'pick') return no('tool:pick'); if (Math.hypot(x + 0.5 - a.x, y + 0.5 - a.y) > BAL.reach) return no('far');
      const T = M.rockTypes[rock.type]; let drops = null;
      if (rock.hp <= 1) {
        drops = T.gems ? (() => { const pool = M.gems.filter(([, from]) => a.floor >= from); let k = Math.random() * pool.reduce((s2, g) => s2 + g[2], 0); for (const [id, , w] of pool) { k -= w; if (k <= 0) return { [id]: 1 }; } return { quartz: 1 }; })() : T.drops;
        const inv = JSON.parse(JSON.stringify(p.inv)); for (const [id, n] of Object.entries(drops)) if (!invAdd(inv, BAL.invSlots, id, n)) return no('full');
        if (p.energy < M.energy) return no('tired'); p.energy -= M.energy; p.inv = inv; p.skills.mining = (p.skills.mining || 0) + T.xp;
        st.rocks = st.rocks.filter((r) => r !== rock); if (st.stairs.x === x && st.stairs.y === y) st.stairs.open = true; this.logEvent(a.id, 'mine', { type: rock.type });
      } else { if (p.energy < M.energy) return no('tired'); p.energy -= M.energy; rock.hp -= 1; }
      this.farmDirty = true; self(); this.broadcast({ t: 'fx', id: a.id, kind: 'pick', map: 'mine', x, y });
      this.toFloor(a.floor, { t: 'mine-upd', floor: a.floor, rock: { x, y, hp: drops ? 0 : rock.hp }, stairs: st.stairs, by: a.id, drops }); return done({ drops });
    }
    const mon = st.mons.find((x) => x.id === Number(m.mid)); if (!mon) return no('nothing');
    const D = M.monsters[mon.type], pos = monPos(mon, Date.now());
    if (m.t === 'mon-hit') { // 揮劍：打到沒血就不見、掉東西
      if (tool !== 'sword') return no('tool:sword'); if (Math.hypot(pos.x - a.x, pos.y - a.y) > BAL.reach + 0.8) return no('far');
      mon.hp -= 1 + Math.floor(levelOf(p.skills.combat || 0, BAL).lv / 20); let drops = null;
      if (mon.hp <= 0) { drops = D.drops; for (const [id, n] of Object.entries(drops)) invAdd(p.inv, BAL.invSlots, id, n); st.mons = st.mons.filter((x) => x !== mon); p.skills.combat = (p.skills.combat || 0) + D.xp; this.logEvent(a.id, 'monster', { type: mon.type }); }
      this.farmDirty = true; self(); this.broadcast({ t: 'fx', id: a.id, kind: 'sword', map: 'mine', x: Math.floor(pos.x), y: Math.floor(pos.y) });
      this.toFloor(a.floor, { t: 'mine-upd', floor: a.floor, mon: { id: mon.id, hp: Math.max(0, mon.hp) }, by: a.id, drops }); return done({ drops });
    }
    if (m.t === 'hurt') { // 碰到怪物會痛（畫面發現碰到了來報告）。沒血了就昏倒，被送回入口，體力剩一半，東西不會掉
      const now = Date.now(); if (now - (a.ht || 0) < M.hurtEveryMs - 100 || Math.hypot(pos.x - a.x, pos.y - a.y) > 1.6) return no('far');
      a.ht = now; ws.serializeAttachment(a); p.hp = (p.hp ?? M.hpMax) - D.dmg;
      if (p.hp <= 0) { p.hp = Math.round(M.hpMax / 2); p.energy = Math.floor(p.energy * M.faintEnergy); leave(true); self(); return done({ faint: true }); }
      self(); return done({ hp: p.hp });
    }
  }

  // ---------- 畜牧與寵物 ----------
  // 家畜和寵物是兩個人共有的（記在農場上）。牠們在圍欄裡的位置是用時間算的（shared/rules.js 的 animalPos），這裡不用存位置
  onAnimal(a, p, m, { no, done, self, near, farmChanged }) {
    const f = this.farm, AB = BAL.animals, day = f.day; f.animals ||= []; f.pets ||= [];
    const tell = () => { this.farmDirty = true; this.broadcast({ t: 'animals', animals: f.animals, pets: f.pets, graze: !!f.graze, money: f.money }); };
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    if (m.t === 'animal-buy') {
      const d = ANIMALS.livestock[m.kind]; if (!d) return no('unknown'); if (!near(d.home)) return no('far');
      if (f.animals.filter((x) => ANIMALS.livestock[x.kind].home === d.home).length >= AB.capacity[d.home]) return no('housefull');
      if (f.money < d.price) return no('money');
      f.money -= d.price; f.nextAnimal = (f.nextAnimal || 0) + 1;
      f.animals.push({ id: f.nextAnimal, kind: m.kind, name: cleanName(m.name).slice(0, 6) || d.name + f.nextAnimal, love: 0, born: day - d.growDays, color: pick(d.colors), traits: [pick(ANIMALS.traits)], fedDay: 0, petDay: 0, brushDay: 0, lastProd: day, ready: false });
      this.logEvent(a.id, 'animal-buy', { kind: m.kind }); tell(); return done();
    }
    if (m.t === 'adopt') { // 寵物：貓、狗各一隻，不用錢，可以選毛色
      const d = ANIMALS.pets[m.kind]; if (!d) return no('unknown'); if (!near('coop') && !near('barn') && !near('door')) return no('far');
      if (f.pets.some((x) => x.kind === m.kind)) return no('already');
      f.pets.push({ id: 900 + f.pets.length, kind: m.kind, name: cleanName(m.name).slice(0, 6) || d.name, color: d.colors.includes(m.color) ? m.color : d.colors[0], love: 0, petDay: 0 });
      this.logEvent(a.id, 'adopt', { kind: m.kind }); tell(); return done();
    }
    if (m.t === 'graze') { if (!near('coop') && !near('barn')) return no('far'); f.graze = !!m.on; tell(); return done(); } // 放牧：天氣好的日子牠們自己在外面吃草，不用餵
    if (m.t === 'feed') { // 餵這一棟裡還沒吃的：乾草先從背包拿，不夠再從倉庫箱拿
      if (!['coop', 'barn'].includes(m.home) || !near(m.home)) return no('far');
      const hungry = f.animals.filter((x) => ANIMALS.livestock[x.kind].home === m.home && x.fedDay !== day); if (!hungry.length) return no('already');
      let fed = 0;
      for (const an of hungry) {
        let i = p.inv.findIndex((x) => x && x.id === 'hay'), from = p.inv; if (i < 0) { i = (f.chest || []).findIndex((x) => x && x.id === 'hay'); from = f.chest; }
        if (i < 0) break; invTake(from, i, 1); an.fedDay = day; fed++;
      }
      if (!fed) return no('nohay');
      self(); farmChanged(); tell(); return done({ fed, left: hungry.length - fed });
    }
    if (a.map !== 'farm') return no('far');
    if (m.t === 'pet') { // 摸寵物
      const pet = f.pets.find((x) => x.id === Number(m.aid)); if (!pet) return no('unknown');
      if (pet.petDay === day) return no('already'); pet.petDay = day; pet.love = Math.min(AB.loveMax, pet.love + AB.petLove); tell(); return done({ love: pet.love });
    }
    const an = f.animals.find((x) => x.id === Number(m.aid)); if (!an) return no('unknown');
    const d = ANIMALS.livestock[an.kind], pos = animalPos(MAPS.farm.pens[d.home], an.id, this.absNow());
    if (Math.hypot(pos.x - a.x, pos.y - a.y) > BAL.reach + 1.5) return no('far');
    if (m.act === 'collect') { // 收蛋、擠奶、剪毛：越喜歡你，品質越好
      if (!an.ready) return no('nothing');
      const q = AB.qualityAt.filter((v) => an.love >= v).length;
      if (!invAdd(p.inv, BAL.invSlots, d.product, 1, q)) return no('full');
      an.ready = false; p.skills.ranching = (p.skills.ranching || 0) + 6; this.logEvent(a.id, 'collect', { id: d.product });
      self(); tell(); this.broadcast({ t: 'fx', id: a.id, kind: 'harvest', map: a.map, x: Math.floor(pos.x), y: Math.floor(pos.y), item: d.product }); return done({ got: { id: d.product, q } });
    }
    if (m.act === 'pet') { if (an.petDay === day) return no('already'); an.petDay = day; an.love = Math.min(AB.loveMax, an.love + AB.pet); p.skills.ranching = (p.skills.ranching || 0) + 2; self(); tell(); return done({ love: an.love }); }
    if (m.act === 'brush') {
      const held = p.inv[Math.floor(Number(m.slot))]; if (!held || ITEMS[held.id].tool !== 'brush') return no('tool:brush');
      if (an.brushDay === day) return no('already'); an.brushDay = day; an.love = Math.min(AB.loveMax, an.love + AB.brush); p.skills.ranching = (p.skills.ranching || 0) + 2; self(); tell(); return done({ love: an.love });
    }
    return no('unknown');
  }
  // 換日：有吃的更喜歡你、沒吃的不開心；長大的、有吃的、時間到了就有產品；很喜歡你又有空位的話可能生小孩（毛色、特性會像爸媽）
  animalsNewDay(old) {
    const f = this.farm, AB = BAL.animals, wet = isWet(weatherOf(f.seed, old, BAL)), winter = seasonId(old, BAL) === 'winter', babies = [];
    for (const an of f.animals || []) {
      const d = ANIMALS.livestock[an.kind], grazed = f.graze && !wet && !winter, fed = an.fedDay === old || grazed, adult = f.day - an.born >= d.growDays;
      an.love = clamp(an.love + (fed ? AB.fed + (grazed ? AB.graze : 0) : AB.hungry), 0, AB.loveMax);
      if (adult && fed && f.day - an.lastProd >= d.every) { an.ready = true; an.lastProd = f.day; }
      const room = (f.animals.length + babies.length) && f.animals.filter((x) => ANIMALS.livestock[x.kind].home === d.home).length + babies.filter((x) => ANIMALS.livestock[x.kind].home === d.home).length < AB.capacity[d.home];
      if (adult && room && an.love >= AB.babyLove && Math.random() < AB.babyChance) {
        f.nextAnimal = (f.nextAnimal || 0) + 1;
        const trait = Math.random() < 0.7 ? an.traits[0] : ANIMALS.traits[Math.floor(Math.random() * ANIMALS.traits.length)];
        babies.push({ id: f.nextAnimal, kind: an.kind, name: '小' + an.name.slice(0, 5), love: 100, born: f.day, color: Math.random() < 0.8 ? an.color : d.colors[Math.floor(Math.random() * d.colors.length)], traits: [trait], parent: an.id, fedDay: 0, petDay: 0, brushDay: 0, lastProd: f.day, ready: false });
      }
    }
    if (babies.length) { f.animals.push(...babies); this.logEvent(0, 'born', { n: babies.length }); }
    return babies;
  }

  // 釣魚：拋竿時伺服器就決定好是哪條魚、多久上鉤；小遊戲在畫面上玩，玩完告訴伺服器有沒有拉上來。
  // 伺服器把關的是：真的拿著釣竿、對著水、體力夠、沒有在上鉤前就說釣到了
  onFish(a, p, m, { no, done, self }) {
    const x = Math.floor(Number(m.x)), y = Math.floor(Number(m.y)), map = this.mapOf(a), held = p.inv[Math.floor(Number(m.slot))], F = BAL.fishing;
    if (!held || ITEMS[held.id].tool !== 'rod') return no('tool:rod');
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.w || y >= map.h || groundAt(map, x, y) !== 'water') return no('ground');
    if (Math.hypot(x + 0.5 - a.x, y + 0.5 - a.y) > F.reach) return no('far');
    if (p.energy < F.energy) return no('tired');
    p.energy -= F.energy;
    // 這裡、這一季、這個天氣、這個時間釣得到的魚，照稀有度抽一條
    const f = this.farm, season = seasonId(f.day, BAL), wet = isWet(weatherOf(f.seed, f.day, BAL)), min = this.minuteNow();
    const pool = Object.entries(FISH).filter(([, d]) => d.maps.includes(a.map) && d.seasons.includes(season) && min >= d.time[0] && min < d.time[1] && (!d.rain || wet));
    let pick = null; if (pool.length && Math.random() >= F.junkChance) { let r = Math.random() * pool.reduce((s, [, d]) => s + d.weight, 0); for (const [id, d] of pool) { r -= d.weight; if (r <= 0) { pick = id; break; } } }
    const wait = Math.round(F.waitMs[0] + Math.random() * (F.waitMs[1] - F.waitMs[0]));
    (this.casts ||= new Map()).set(a.id, { fish: pick, at: Date.now(), wait, x, y });
    self(); this.broadcast({ t: 'fx', id: a.id, kind: 'cast', map: a.map, x, y });
    done({ wait, diff: pick ? FISH[pick].diff : 1 });
  }
  onReel(a, p, m, { no, done, self }) {
    const c = this.casts && this.casts.get(a.id), F = BAL.fishing; if (!c) return no('gone');
    this.casts.delete(a.id);
    const t = Date.now() - c.at; if (t < c.wait - 150 || t > c.wait + 20000) return no('gone'); // 還沒上鉤就說釣到、或拖太久：不算
    if (!m.win) return done({ got: null });
    const item = c.fish ? 'fish_' + c.fish : 'junk', d = c.fish && FISH[c.fish];
    if (!invAdd(p.inv, BAL.invSlots, item, 1)) return no('full');
    let size = 0, record = false;
    if (d) { size = Math.round((d.size[0] + Math.pow(Math.random(), 1.6) * (d.size[1] - d.size[0])) * 10) / 10; p.fishRec ||= {}; record = size > (p.fishRec[c.fish] || 0); if (record) p.fishRec[c.fish] = size; p.skills.fishing = (p.skills.fishing || 0) + d.diff * F.xpPerDiff; }
    this.logEvent(a.id, 'fish', { id: item, size }); self();
    this.broadcast({ t: 'fx', id: a.id, kind: 'harvest', map: a.map, x: c.x, y: c.y, item });
    done({ got: { id: item, size, record } });
  }
  // 離某種可以互動的東西（出貨箱、床、倉庫箱、種子攤）夠不夠近
  nearUse(a, use) { return this.mapOf(a).objects.some((o) => { const d = OBJECTS[o.type]; if (d.use !== use) return false; const [tw] = d.tiles || [1, 1]; return Math.hypot(o.x + tw / 2 - a.x, o.y + 0.5 - a.y) <= BAL.reach + tw / 2; }); }
  // 走動：各自畫面先動，這裡只記位置、轉給對方。送的是「位置＋速度」，對方照速度往前推，所以不必每一步都送
  onMove(ws, a, m) {
    const now = Date.now(); if (now - a.mt < MOVE_MIN_MS) return; // 送太快的丟掉
    const x = Number(m.x), y = Number(m.y), map = this.mapOf(a); if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    a.x = clamp(x, 0.3, map.w - 0.3); a.y = clamp(y, 0.3, map.h - 0.3); a.mt = now;
    a.vx = clamp(Number(m.vx) || 0, -1, 1); a.vy = clamp(Number(m.vy) || 0, -1, 1);
    if (['up', 'down', 'left', 'right'].includes(m.dir)) a.dir = m.dir;
    if (a.asleep && (a.vx || a.vy)) { a.asleep = false; this.broadcast({ t: 'sleep', id: a.id, on: false }); } // 起來走動就不算睡了
    ws.serializeAttachment(a);
    this.broadcast({ t: 'move', id: a.id, map: a.map, x: a.x, y: a.y, dir: a.dir, vx: a.vx, vy: a.vy }, a.id);
  }
  // 換地圖：走到出入口（或門）才過得去
  onWarp(ws, a, p, m, { no, done }) {
    const map = this.mapOf(a), list = [...(map.exits || []), ...(map.doors || []).map((d) => ({ ...d, w: 1, h: 1 }))], e = list[Math.floor(Number(m.i))];
    if (!e || !e.to || !MAPS[e.to]) return no('closed');
    if (a.x < e.x - 1.6 || a.x > e.x + e.w + 1.6 || a.y < e.y - 1.6 || a.y > e.y + e.h + 1.6) return no('far');
    a.map = e.to; a.x = e.tx; a.y = e.ty; a.vx = a.vy = 0; a.asleep = false; ws.serializeAttachment(a);
    Object.assign(p, { map: a.map, x: a.x, y: a.y }); this.dirtyPl.add(a.id);
    this.broadcast({ t: 'warp', id: a.id, map: a.map, x: a.x, y: a.y, dir: a.dir }); done();
  }
  // 用手上的東西對某一格做事：先看那一格有沒有可以清掉的東西，再看手上拿的是什麼。伺服器檢查都合法才生效；兩個人搶同一格，先到的成功
  onUse(ws, a, p, m, { no, done, self }) {
    if (a.map === 'mine') return no('nothing'); // 礦坑裡的事走 mine-* 訊息
    const x = Math.floor(Number(m.x)), y = Math.floor(Number(m.y)), map = this.mapOf(a), k = K(a.map, x, y);
    const bad = (reason) => no(reason, { tile: this.pubTile(k), obj: this.pubObj(k) });
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.w || y >= map.h) return no('out');
    if (Math.hypot(x + 0.5 - a.x, y + 0.5 - a.y) > BAL.reach) return bad('far');
    const held = p.inv[Math.floor(Number(m.slot))] || null, item = held ? ITEMS[held.id] : null, tool = item && item.kind === 'tool' ? item.tool : null;
    const day = this.farm.day, level = (skill) => levelOf((p.skills[skill] || 0), BAL).lv;
    const spend = (e) => { if (p.energy < e) return false; p.energy -= e; return true; };
    const xp = (skill, n) => { p.skills[skill] = (p.skills[skill] || 0) + n; };
    const fx = (kind, extra) => this.broadcast({ t: 'fx', id: a.id, kind, map: a.map, x, y, ...extra }); // 讓對方看到你在做什麼
    const obj = this.objs.get(k);
    if (obj && obj.type === 'forage') { // 野外的採集物：手上拿什麼都可以撿
      if (!invAdd(p.inv, BAL.invSlots, obj.item, 1)) return bad('full');
      this.objs.delete(k); this.dirtyObjs.add(k); xp('foraging', BAL.forage.xp); this.logEvent(a.id, 'forage', { id: obj.item }); self(); fx('harvest', { item: obj.item });
      this.broadcast({ t: 'objs', by: a.id, list: [this.pubObj(k)], drops: { [obj.item]: 1 } }); return done();
    }
    if (obj && obj.type === 'machine') { // 加工機：好了就拿、空的就放原料進去、拿斧頭或十字鎬對著空的機器可以收回背包
      const mc = MACHINES[obj.kind], now = this.absNow(), upd = (kind) => { this.dirtyObjs.add(k); self(); fx(kind); this.broadcast({ t: 'objs', by: a.id, list: [this.pubObj(k)] }); done(); };
      if (obj.out && now >= obj.doneAt) {
        if (!invAdd(p.inv, BAL.invSlots, obj.out, obj.n || 1)) return bad('full');
        this.logEvent(a.id, 'collect', { id: obj.out }); const got = obj.out;
        if (mc.gives) obj.doneAt = now + mc.minutes; else { obj.out = null; obj.doneAt = 0; }
        this.dirtyObjs.add(k); self(); fx('harvest', { item: got }); this.broadcast({ t: 'objs', by: a.id, list: [this.pubObj(k)] }); return done({ got: { id: got, q: 0 } });
      }
      if (obj.out) return no('busy', { left: Math.ceil(obj.doneAt - now) });
      if ((tool === 'axe' || tool === 'pick') && !mc.gives) { if (!invAdd(p.inv, BAL.invSlots, 'm_' + obj.kind, 1)) return bad('full'); this.objs.delete(k); return upd('clear'); }
      const fit = held && mc.in.some((spec) => matches(ITEMS, held.id, spec.startsWith('@') ? spec : '@' + spec)); if (!fit) return bad('machine'); // 機器收的是「類別」，所以前面補上 @
      const src = held.id; if (mc.map && !mc.map[src]) return bad('machine');
      invTake(p.inv, Math.floor(Number(m.slot)), 1);
      if (mc.map) { obj.out = mc.map[src]; obj.n = 1; } else if (mc.seeds) { obj.out = 'seed_' + src; obj.n = mc.seeds; } else { obj.out = `g:${obj.kind}:${src}`; obj.n = 1; }
      obj.doneAt = now + mc.minutes; this.logEvent(a.id, 'process', { kind: obj.kind }); return upd('plant');
    }
    if (obj) { // 樹、石頭、樹枝、雜草：要用對的工具，打到沒血就清掉、掉材料
      const d = OBJECTS[obj.type]; if (tool !== d.tool) return bad('tool:' + d.tool);
      if (obj.hp <= 1) { const inv = JSON.parse(JSON.stringify(p.inv)); for (const [id, n] of Object.entries(d.drops)) if (!invAdd(inv, BAL.invSlots, id, n)) return bad('full'); if (!spend(d.energy)) return bad('tired'); p.inv = inv; this.objs.delete(k); xp(d.xp[0], d.xp[1]); this.logEvent(a.id, 'clear', { type: obj.type }); }
      else { if (!spend(d.energy)) return bad('tired'); obj.hp -= 1; }
      this.dirtyObjs.add(k); self(); fx(tool); this.broadcast({ t: 'objs', by: a.id, list: [this.pubObj(k)], drops: this.objs.has(k) ? null : d.drops }); return done();
    }
    const ground = groundAt(map, x, y), tile = this.tiles.get(k), crop = tile && tile.c, def = crop && CROPS[crop.id];
    const changed = (kind) => { this.touch(a.map, x, y); this.logEvent(a.id, kind, { x, y }); self(); fx(kind); this.broadcast({ t: 'tiles', by: a.id, kind, list: [this.pubTile(k)] }); done(); };
    const mature = crop && !crop.dead && cropStage(def, crop.g) === 4;
    if (tool === 'can' && tile && tile.w !== day) { if (!spend(BAL.energy.can)) return bad('tired'); tile.w = day; return changed('water'); }
    if (mature) { // 收成：品質看肥料和農耕等級
      const lucky = p.buffs && p.buffs.luck > this.absNow() ? BAL.buffs.luck : 0; // 吃了有運氣效果的料理：等於多一層肥料
      const q = rollQuality(Math.random, (tile.f || 0) + lucky, level('farming'), BAL);
      if (!invAdd(p.inv, BAL.invSlots, crop.id, 1, q)) return bad('full');
      xp('farming', def.xp); if (def.regrowDays) crop.g = cropTotal(def) - def.regrowDays; else { tile.c = null; tile.f = 0; }
      this.touch(a.map, x, y); this.logEvent(a.id, 'harvest', { id: crop.id, q }); self(); fx('harvest', { item: crop.id, q });
      this.broadcast({ t: 'tiles', by: a.id, kind: 'harvest', list: [this.pubTile(k)] }); return done({ got: { id: crop.id, q } });
    }
    if (tool === 'can') return bad(tile ? 'already' : 'untilled');
    if (tool === 'hoe') { if (ground !== 'soil') return bad(ground === 'locked' ? 'locked' : 'ground'); if (tile) return bad('already'); if (!spend(BAL.energy.hoe)) return bad('tired'); this.tiles.set(k, { w: 0 }); return changed('till'); }
    if (tool === 'pick') { if (!tile) return bad('nothing'); if (crop) return bad('crop'); if (!spend(1)) return bad('tired'); this.tiles.delete(k); return changed('clear'); }
    if (tool === 'sickle') { if (!crop) return bad('nothing'); if (!spend(1)) return bad('tired'); tile.c = null; return changed('cut'); }
    if (item && item.kind === 'seed') {
      if (!tile) return bad('untilled'); if (crop) return bad('already');
      if (map.outdoor && !CROPS[item.crop].seasons.includes(seasonId(day, BAL))) return bad('season');
      invTake(p.inv, Math.floor(Number(m.slot)), 1); tile.c = { id: item.crop, g: 0 }; return changed('plant');
    }
    if (item && item.kind === 'machine') { // 把加工機放在農場的空地上
      if (a.map !== 'farm' || !['grass', 'path'].includes(ground) || tile || STATIC[a.map].has(x + ',' + y)) return bad('place');
      const mc = MACHINES[item.machine]; invTake(p.inv, Math.floor(Number(m.slot)), 1);
      this.objs.set(k, { type: 'machine', kind: item.machine, hp: 1, ...(mc.gives ? { out: mc.gives, n: 1, doneAt: this.absNow() + mc.minutes } : {}) });
      this.dirtyObjs.add(k); self(); fx('plant'); this.broadcast({ t: 'objs', by: a.id, list: [this.pubObj(k)] }); return done();
    }
    if (item && item.kind === 'fertilizer') { if (!tile) return bad('untilled'); if (tile.f) return bad('already'); if (crop && cropStage(def, crop.g) > 0) return bad('late'); invTake(p.inv, Math.floor(Number(m.slot)), 1); tile.f = item.power; return changed('fertilize'); }
    return bad('nothing');
  }

  // ---------- 時間 ----------
  async alarm() {
    this.load();
    const now = Date.now(), n = this.online().length;
    if (!n) { this.saveFarm(); return; } // 沒有人了：時鐘停下來，不再排下一次
    this.farm.minute += Math.min(now - (this.farm.lastTick || now), TICK_MS * 3) * MIN_PER_MS; this.farm.lastTick = now;
    if (this.farm.minute >= BAL.dayEndMinute) await this.newDay('late'); // 凌晨 2 點還沒睡：昏倒，直接隔天
    else { this.saveFarm(); this.broadcast({ t: 'time', day: this.farm.day, minute: this.farm.minute }); }
    await this.ctx.storage.setAlarm(now + TICK_MS);
  }
  // 在線的人都上床了才換日（只有一個人在線就是他自己決定）
  async maybeNewDay(reason) { const on = this.online(); if (on.length && on.every((s) => s.a.asleep)) await this.newDay(reason); }
  async newDay(reason) {
    const f = this.farm, old = f.day;
    // 換日前先備份「今天結束時」的樣子，只留最近 7 天
    this.flush();
    const players = this.sql.exec(`SELECT user_id, data FROM players`).toArray();
    this.sql.exec(`INSERT OR REPLACE INTO backups (day, ts, data) VALUES (?, ?, ?)`, old, Date.now(), JSON.stringify({ farm: f, tiles: [...this.tiles], objs: [...this.objs], players }));
    this.sql.exec(`DELETE FROM backups WHERE day <= ?`, old - BACKUP_DAYS);
    this.sql.exec(`DELETE FROM events WHERE day < ?`, old - 30);
    // 出貨箱結算：收入進共用的錢包，明細留給兩個人看
    const lines = f.ship.map((l) => ({ ...l, sum: sellPrice(ITEMS[l.id], l.q, BAL) * l.n })), total = lines.reduce((s, l) => s + l.sum, 0);
    f.lastShip = lines.length ? { day: old, total, lines } : null; f.money += total; f.ship = [];
    f.day += 1; f.minute = BAL.dayStartMinute; f.lastTick = Date.now();
    const season = seasonId(f.day, BAL), seasonChanged = season !== seasonId(old, BAL), rain = isWet(weatherOf(f.seed, f.day, BAL));
    // 作物：昨天有澆水的長一天；換季時不是這一季的枯掉；今天下雨的話戶外的田自動澆好
    for (const [k, t] of this.tiles) {
      const { map, x, y } = unK(k), c = t.c; let ch = false;
      if (c && !c.dead) { if (t.w === old) { c.g += 1; ch = true; } if (seasonChanged && MAPS[map].outdoor && !CROPS[c.id].seasons.includes(season)) { c.dead = true; ch = true; } }
      if (rain && MAPS[map].outdoor) { t.w = f.day; ch = true; }
      if (ch) this.touch(map, x, y);
    }
    // 體力：早睡補滿、熬夜補比較少、昏倒的只補一半；不在線的人補滿
    const awake = new Map(this.online().map((s) => [s.a.id, s.a]));
    for (const r of players) {
      const p = this.player(r.user_id), a = awake.get(r.user_id);
      const k = !a ? 1 : !a.asleep ? BAL.sleepRestore.passout : (a.sleptAt || 0) >= BAL.lateMinute ? BAL.sleepRestore.late : BAL.sleepRestore.early;
      p.energy = Math.max(p.energy, Math.round(BAL.energyMax * k)); p.hp = BAL.mine.hpMax; this.dirtyPl.add(r.user_id);
    }
    f.newborn = this.animalsNewDay(old).map((b) => b.name);
    this.spawnDaily();
    this.farmDirty = true; this.logEvent(0, 'newday', { reason, total });
    for (const { ws, a } of this.online()) {
      if (reason === 'late' && !a.asleep) { a.map = 'house'; a.x = MAPS.house.spawn.x; a.y = MAPS.house.spawn.y; Object.assign(this.player(a.id), { map: a.map, x: a.x, y: a.y }); } // 昏倒的人被送回家
      if (a.map === 'mine') { Object.assign(a, MINE_EXIT, { floor: 0 }); Object.assign(this.player(a.id), MINE_EXIT); } // 礦坑隔天會重新長：還在裡面的人送回入口
      a.asleep = false; ws.serializeAttachment(a);
    }
    this.flush();
    for (const { ws, a } of this.online()) this.send(ws, { t: 'newday', reason, farm: this.pubFarm(), tiles: [...this.tiles.keys()].map((k) => this.pubTile(k)), objs: [...this.objs.keys()].map((k) => this.pubObj(k)), self: this.pubSelf(a), you: this.pub(a), players: this.online().filter((s) => s.a.id !== a.id).map((s) => this.pub(s.a)) });
  }
  async restore(request, who) {
    const body = await request.json().catch(() => ({})), day = Number(body.day) || 0;
    const row = this.sql.exec(`SELECT data FROM backups WHERE day = ?`, day).toArray()[0];
    if (!row) return json({ error: '沒有這一天的備份' }, 404);
    const b = JSON.parse(row.data);
    this.farm = { ...b.farm, lastTick: Date.now() }; this.tiles = new Map(b.tiles); this.pl.clear();
    this.sql.exec(`DELETE FROM mapchunks`); this.sql.exec(`DELETE FROM objs`);
    for (const k of this.tiles.keys()) { const t = unK(k); this.touch(t.map, t.x, t.y); }
    if (b.objs) { const now = new Map(b.objs); for (const k of this.objs.keys()) if (!now.has(k)) this.sql.exec(`INSERT OR REPLACE INTO objs (k, data) VALUES (?, NULL)`, k); for (const [k, o] of now) this.sql.exec(`INSERT OR REPLACE INTO objs (k, data) VALUES (?, ?)`, k, JSON.stringify(o)); this.objs = now; }
    for (const r of b.players || []) this.sql.exec(`UPDATE players SET data = ? WHERE user_id = ?`, r.data, r.user_id);
    this.farmDirty = true; this.flush(); this.logEvent(who.user.id, 'restore', { day });
    // 人留在原地（備份只回復農場和背包，不把人搬走）
    for (const { ws, a } of this.online()) { const p = this.player(a.id); if (a.map === 'mine') Object.assign(a, MINE_EXIT, { floor: 0 }); Object.assign(p, { map: a.map, x: a.x, y: a.y }); this.dirtyPl.add(a.id); a.asleep = false; ws.serializeAttachment(a); }
    this.flush();
    for (const { ws, a } of this.online()) this.send(ws, { t: 'newday', reason: 'restore', farm: this.pubFarm(), tiles: [...this.tiles.keys()].map((k) => this.pubTile(k)), objs: [...this.objs.keys()].map((k) => this.pubObj(k)), self: this.pubSelf(a), you: this.pub(a), players: this.online().filter((s) => s.a.id !== a.id).map((s) => this.pub(s.a)) });
    return json({ ok: true, day: this.farm.day });
  }

  // ---------- 離線 ----------
  async webSocketClose(ws) {
    try { ws.close(1000, 'bye'); } catch { /* 已經關了 */ } // 回對方一個關閉，交握才算完成；不回的話瀏覽器要等很久才知道斷線
    const a = ws.deserializeAttachment(); if (!a) return;
    if (a.gone) return; // 被新分頁換掉的：人還在，什麼都不用做
    this.load();
    const still = this.online().some((s) => s.ws !== ws && s.a.id === a.id);
    if (!still) {
      const p = this.player(a.id, a.name); Object.assign(p, a.map === 'mine' ? MINE_EXIT : { map: a.map, x: a.x, y: a.y }, { dir: a.dir, lastDay: this.farm.day, lastMoney: this.farm.money }); this.dirtyPl.add(a.id); this.flush();
      this.sql.exec(`UPDATE players SET last_seen = ? WHERE user_id = ?`, Date.now(), a.id);
      this.broadcast({ t: 'leave', id: a.id }, a.id);
    }
    const left = this.online().filter((s) => s.ws !== ws);
    if (!left.length) { // 最後一個人走了：把時間記到現在，時鐘停下來
      const now = Date.now();
      this.farm.minute += Math.min(now - (this.farm.lastTick || now), TICK_MS * 3) * MIN_PER_MS; this.farm.lastTick = 0;
      this.saveFarm(); await this.ctx.storage.deleteAlarm();
    } else if (left.every((s) => s.a.asleep)) await this.newDay('sleep'); // 沒睡的那個離開了，剩下的人都睡了
  }
  webSocketError() {}
}
