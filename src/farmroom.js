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
import MAP_FOREST from '../public/games/farm/data/maps/forest.json';
import MAP_BEACH from '../public/games/farm/data/maps/beach.json';
import MAP_GREENHOUSE from '../public/games/farm/data/maps/greenhouse.json';
import MAP_UPTOWN from '../public/games/farm/data/maps/uptown.json';
import FISH from '../public/games/farm/data/fish.json';
import MAP_TOWN from '../public/games/farm/data/maps/town.json';
import NPCS from '../public/games/farm/data/npcs/residents.json';
import SHOPS from '../public/games/farm/data/shops.json';
import HEART_EVENTS from '../public/games/farm/data/events/hearts.json';
import STORY_EVENTS from '../public/games/farm/data/events/story.json';
import DUO_EVENTS from '../public/games/farm/data/events/duo.json';
import FESTIVALS from '../public/games/farm/data/festivals.json';
import RESTORE from '../public/games/farm/data/restore.json';
import ACHIEVEMENTS from '../public/games/farm/data/achievements.json';
import { groundAt, seasonId, rng, weatherOf, isWet, cropStage, cropTotal, levelOf, rollQuality, invAdd, invTake, sellPrice, makeItems, matches, planTake, shopItems, absMinute, animalPos, genFloor, monPos, mineMap, npcPos, walkGrid, giftTaste, seasonIndex } from '../public/games/farm/shared/rules.js';
import { upgradeLook } from '../public/games/farm/shared/look.js';
import { eventReady, farmStat, mergeEvents } from '../public/games/farm/shared/rules.js';

const ITEMS = makeItems(RAW_ITEMS, MACHINES); // 加工品（g:機器:原料）的名字和價錢是算出來的
const EVENTS = mergeEvents(HEART_EVENTS, STORY_EVENTS, DUO_EVENTS); // 劇情：居民的心事件、主線、兩個人的劇情

const MAPS = { farm: MAP_FARM, house: MAP_HOUSE, road: MAP_ROAD, lake: MAP_LAKE, town: MAP_TOWN, forest: MAP_FOREST, beach: MAP_BEACH, greenhouse: MAP_GREENHOUSE, uptown: MAP_UPTOWN };
// 每張地圖上不會動的東西（房子、長椅…）佔了哪些格子：採集物、雜草不會長在這些格子上
const NPC_MAPS = ['town', ...Object.keys(MAPS).filter((m) => MAPS[m].npcEntry)]; // 居民會去的地圖：小鎮，加上地圖檔裡寫了 npcEntry（居民從哪裡走進來）的
const GRIDS = Object.fromEntries(NPC_MAPS.map((m) => [m, walkGrid(MAPS[m], OBJECTS)])); // 居民找路用：每張地圖哪些格子走得到
const NPC_ENTRIES = Object.fromEntries(NPC_MAPS.filter((m) => MAPS[m].npcEntry).map((m) => [m, MAPS[m].npcEntry]));
const STATIC = Object.fromEntries(Object.entries(MAPS).map(([id, m]) => [id, new Set(m.objects.flatMap((o) => { const [tw, th] = OBJECTS[o.type].tiles || [1, 1], out = []; for (let x = 0; x < tw; x++) for (let y = 0; y < th; y++) out.push((o.x + x) + ',' + (o.y - y)); return out; }))]));
const TICK_MS = 10000;                 // 有人在線時，每 10 秒推進一次遊戲時鐘
const DAY_SPAN = BAL.dayEndMinute - BAL.dayStartMinute;            // 一天有幾個遊戲分鐘（早上 6 點到凌晨 2 點）
const tryParse = (text) => { try { return JSON.parse(text); } catch { return undefined; } }; // 存檔壞掉時回傳 undefined，不讓整個農場打不開
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
  // 體型、臉型：可以不給（照男生／女生）；給了就要是清單上的
  for (const [k, list] of [['body', PARTS.bodies || []], ['head', PARTS.heads || []]]) { if (look[k] == null) continue; if (!list.some((v) => v.id === look[k])) return null; out[k] = look[k]; }
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
    let saved = row ? tryParse(row.value) : null;
    if (row && (!saved || typeof saved !== 'object' || !(saved.day >= 1))) { // 存檔壞了：原樣留一份，改用最近一份讀得出來的每日備份；連備份都沒有才開新農場
      this.sql.exec(`INSERT OR REPLACE INTO meta (key, value) VALUES ('farm-corrupt', ?)`, row.value); saved = null;
      for (const b of this.sql.exec(`SELECT data FROM backups ORDER BY day DESC`).toArray()) { const d = tryParse(b.data); if (d && d.farm && d.farm.day >= 1) { this.farm = { ...d.farm, lastTick: 0, recovered: Date.now() }; this.tiles = new Map(); this.objs = this.baseObjs(); this.applyBackup(d); this.flush(); return; } }
    }
    this.farm = saved ? saved : { v: 4, created: Date.now(), convId: 0, seed: Math.floor(Math.random() * 1e9), day: 1, minute: BAL.dayStartMinute, money: BAL.startMoney, lastTick: 0, ship: [], lastShip: null, chest: [] };
    if (!this.farm.v) Object.assign(this.farm, { v: 4, seed: this.farm.seed || Math.floor(Math.random() * 1e9), ship: [], lastShip: null, chest: [], money: this.farm.money ?? BAL.startMoney }); // 階段 2 留下的農場：補上新欄位
    this.tiles = new Map();
    for (const r of this.sql.exec(`SELECT data FROM mapchunks`).toArray()) for (const [k, v] of Object.entries(tryParse(r.data) || {})) this.tiles.set(k, v); // 壞掉的那一塊當成沒翻過的地
    // 可以清掉的東西（樹、石頭、樹枝、雜草）：地圖檔裡原本有的，加上之後的變化（被清掉、被砍了幾下）
    this.objs = this.baseObjs();
    for (const r of this.sql.exec(`SELECT k, data FROM objs`).toArray()) { const o = r.data ? tryParse(r.data) : null; if (o && OBJECTS[o.type]) this.objs.set(r.k, o); else if (!r.data) this.objs.delete(r.k); }
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
      const own = (BAL.forage.byMap || {})[map], pool = own ? own.items : list; // 有些地方撿得到的東西不一樣（海邊是貝殼）
      if (!MAPS[map] || !pool.length) return; const rand = rng(f.seed + f.day * 131 + mi * 17);
      for (let i = 0; i < n; i++) place(map, rand, { grounds: own ? own.grounds : ['grass'], obj: () => ({ type: 'forage', item: pool[Math.floor(rand() * pool.length)], hp: 1 }) });
    });
    const weeds = [...this.objs.values()].filter((o) => o.type === 'weed').length, rand = rng(f.seed + f.day * 977);
    if (f.day > 1) for (let i = 0; i < BAL.forage.weedsPerDay && weeds + i < BAL.forage.weedsMax; i++) place('farm', rand, { grounds: ['grass', 'soil'], obj: () => ({ type: 'weed', hp: OBJECTS.weed.hp }) });
    // 佈告欄的每日委託：某位居民想要幾個某種東西（用種子算，同一天固定）
    const Q = BAL.quest, qr = rng(f.seed + f.day * 613), ids = Object.keys(NPCS).filter((k) => NPCS[k].full), item = Q.pool[Math.floor(qr() * Q.pool.length)], qn = Q.n[0] + Math.floor(qr() * (Q.n[1] - Q.n[0] + 1));
    f.quest = { day: f.day, npc: ids[Math.floor(qr() * ids.length)], item, n: qn, reward: Math.round((ITEMS[item].sell || 10) * qn * Q.rewardMult + Q.rewardAdd), done: 0 };
    f.forageDay = f.day; this.farmDirty = true;
  }
  // 該寄給這個玩家的信：歡迎信（第 2 天起）、跟居民好感到 2 心、4 心時的信（附禮物）
  mailCheck(id, p) {
    const f = this.farm, M = BAL.mail, flags = (p.mailFlags ||= {}), push = (key, from, text, item) => { if (flags[key]) return; flags[key] = 1; (p.mail ||= []).push({ id: (p.mailN = (p.mailN || 0) + 1), from, text, item: item || null, got: false, day: f.day }); this.dirtyPl.add(id); };
    if (f.day >= M.welcome.day) push('welcome', M.welcome.from, M.welcome.text, M.welcome.item);
    for (const [npc, fr] of Object.entries(p.friend || {})) for (const [h, text] of Object.entries(M.hearts)) if (fr.pts >= Number(h) * BAL.friend.heart && NPCS[npc]) push(`h${h}:${npc}`, npc, text, NPCS[npc].mailGift);
  }
  baseObjs() { const objs = new Map(); for (const [id, m] of Object.entries(MAPS)) for (const o of m.objects) if (OBJECTS[o.type].tool) objs.set(K(id, o.x, o.y), { type: o.type, hp: OBJECTS[o.type].hp }); return objs; }
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
    for (const id of this.dirtyPl) { const p = this.pl.get(id); if (!p) continue; const cx = (this.farm.codex ||= {}); for (const it of p.inv) if (it && !cx[it.id]) { cx[it.id] = this.farm.day; this.farmDirty = true; } this.sql.exec(`UPDATE players SET data = ? WHERE user_id = ?`, JSON.stringify(p), id); } // 順便記圖鑑：背包裡出現過的東西
    if (this.farmDirty) this.sql.exec(`INSERT OR REPLACE INTO meta (key, value) VALUES ('farm', ?)`, JSON.stringify(this.farm));
    this.dirty.clear(); this.dirtyObjs.clear(); this.dirtyPl.clear(); this.farmDirty = false;
  }
  saveFarm() { this.farmDirty = true; this.flush(); }
  // 玩家的東西（背包、體力、技能、外觀）：比較大，不放在連線的附註裡（那個有 2KB 上限），放在記憶體，改了就寫回
  player(id, name = '') {
    let p = this.pl.get(id); if (p) return p;
    const row = this.sql.exec(`SELECT data FROM players WHERE user_id = ?`, id).toArray()[0];
    p = row ? tryParse(row.data) || null : null; // 壞掉的角色資料當成新玩家，重新發工具
    if (!p || !p.inv) { // 新玩家（或階段 2 留下的舊資料）：發工具和一點種子
      p = { x: MAPS.farm.spawn.x, y: MAPS.farm.spawn.y, dir: 'down', map: 'farm', look: null, nick: '', lastDay: this.farm.day, lastMoney: this.farm.money, ...(p || {}), inv: [], energy: BAL.energyMax, skills: {} };
      if (!MAPS[p.map]) { p.map = 'farm'; p.x = MAPS.farm.spawn.x; p.y = MAPS.farm.spawn.y; }
      for (const [item, n] of BAL.startItems) invAdd(p.inv, BAL.invSlots, item, n);
      this.sql.exec(`INSERT OR REPLACE INTO players (user_id, name, data, last_seen) VALUES (?, ?, ?, ?)`, id, name, JSON.stringify(p), row ? Date.now() : 0);
    }
    // 美術換成 LPC 之後零件名稱都換了：舊角色的外觀讀進來時換成新的零件（存回去，之後換裝伺服器才收）
    if (p.look) { const up = cleanLook(upgradeLook(p.look, PARTS)); if (up && JSON.stringify(up) !== JSON.stringify(p.look)) { p.look = up; this.dirtyPl.add(id); } }
    if (Array.isArray(p.outfits)) { const ups = p.outfits.map((o) => ({ name: o.name, look: cleanLook(upgradeLook(o.look, PARTS)) })).filter((o) => o.look); if (JSON.stringify(ups) !== JSON.stringify(p.outfits)) { p.outfits = ups; this.dirtyPl.add(id); } } // 存起來的穿搭也一樣
    this.pl.set(id, p); return p;
  }
  // 每做一件事：統計 +1（成就用）；某種事第一次發生時，在紀念冊記一筆
  logEvent(userId, type, data) { const st = (this.farm.stats ||= {}); st[type] = (st[type] || 0) + 1; this.farmDirty = true; if (st[type] === 1 && BAL.album[type]) (this.farm.album ||= []).push({ day: this.farm.day, key: type, by: userId }); if (st[type] === 1) this.broadcast({ t: 'stat', key: type, album: this.farm.album || [] }); this.sql.exec(`INSERT INTO events (ts, day, user_id, type, data) VALUES (?, ?, ?, ?, ?)`, Date.now(), this.farm.day, userId, type, data ? JSON.stringify(data) : null); }
  pubTile(k) { const v = this.tiles.get(k), t = unK(k); return v ? { ...t, t: 1, w: v.w === this.farm.day ? 1 : 0, f: v.f || 0, c: v.c ? { id: v.c.id, s: v.c.dead ? -1 : cropStage(CROPS[v.c.id], v.c.g) } : null } : { ...t, t: 0 }; }
  pubObj(k) { const o = this.objs.get(k); return o ? { ...unK(k), type: o.type, hp: o.hp, ...(o.item ? { item: o.item } : {}), ...(o.kind ? { kind: o.kind, out: o.out || null, doneAt: o.doneAt || 0 } : {}) } : { ...unK(k), type: null }; }
  // 一天在現實裡是幾分鐘：兩個人共用的設定，只能選平衡設定檔列出來的幾種
  dayLen() { const v = (this.farm.opts || {}).dayLen; return BAL.dayLenOptions.includes(v) ? v : BAL.dayMinutesReal; }
  minPerMs() { return DAY_SPAN / (this.dayLen() * 60000); } // 現實一毫秒等於幾個遊戲分鐘
  absNow() { return absMinute(this.farm.day, this.minuteNow(), BAL); }
  pubSelf(a) { const p = this.player(a.id); return { inv: p.inv, energy: p.energy, energyMax: this.energyMax(), skills: p.skills, fishRec: p.fishRec || {}, buffs: p.buffs || {}, hp: p.hp ?? BAL.mine.hpMax, hpMax: BAL.mine.hpMax, friend: p.friend || {}, toolLv: p.toolLv || {}, mail: p.mail || [], events: p.events || {}, fest: p.fest || {}, outfits: p.outfits || [], evOpen: p.evOpen || null, flags: p.flags || {} }; }

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
    this.mailCheck(me.id, p);
    p.lastDay = this.farm.day; p.lastMoney = this.farm.money; this.dirtyPl.add(me.id); this.flush();
    this.sql.exec(`UPDATE players SET last_seen = ?, name = ? WHERE user_id = ?`, now, me.name, me.id);
    this.send(server, { t: 'snapshot', you: this.pub(a), self: this.pubSelf(a), partner: who.partner, players: others.map((s) => this.pub(s.a)), farm: this.pubFarm(),
      tiles: [...this.tiles.keys()].map((k) => this.pubTile(k)), objs: [...this.objs.keys()].map((k) => this.pubObj(k)), summary });
    this.broadcast({ t: 'join', p: this.pub(a) }, me.id);
    const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map((s) => s.trim());
    return new Response(null, { status: 101, webSocket: client, headers: protocols.includes('farm.v1') ? { 'Sec-WebSocket-Protocol': 'farm.v1' } : {} });
  }
  // 現在的遊戲時間：上次記下的分鐘，加上從那之後過了多久（兩次 tick 之間也準）
  minuteNow(now = Date.now()) { return this.farm.lastTick && this.online().length ? this.farm.minute + Math.min(now - this.farm.lastTick, TICK_MS * 3) * this.minPerMs() : this.farm.minute; }
  pubFarm() {
    const f = this.farm;
    return { day: f.day, minute: this.minuteNow(), money: f.money, season: seasonId(f.day, BAL), weather: weatherOf(f.seed, f.day, BAL), minutesPerSecond: this.minPerMs() * 1000, opts: { dayLen: this.dayLen() }, dayStart: BAL.dayStartMinute, dayEnd: BAL.dayEndMinute,
      notes: f.notes || [], album: f.album || [], newAchievements: f.newAchievements || [], houseLv: this.houseLv(), land: f.land || {}, codex: f.codex || {}, achieved: f.achieved || {}, stats: f.stats || {}, restore: f.restore || {}, quest: f.quest || null, festival: this.festivalToday(), now: Date.now(), mineDeepest: f.mineDeepest || 1, ship: f.ship, lastShip: f.lastShip, chest: f.chest, newborn: f.newborn || [], animals: f.animals || [], pets: f.pets || [], graze: !!f.graze };
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
    const farmChanged = () => { this.farmDirty = true; this.broadcast({ t: 'farm', money: this.farm.money, ship: this.farm.ship, chest: this.farm.chest, quest: this.farm.quest || null, restore: this.farm.restore || {}, houseLv: this.houseLv(), land: this.farm.land || {} }); }; // 錢、出貨箱、倉庫是兩個人共用的
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
    } else if (m.t === 'buy') { // 買東西：要站在那間店（或攤位）旁邊、營業時間內；錢是兩個人共用的
      const shop = SHOPS[m.shop || 'stall'], item = ITEMS[m.item], min = this.minuteNow(); if (!shop) return no('unknown'); if (!near(shop.use)) return no('far');
      if (!item || !shopItems(shop, seasonId(this.farm.day, BAL), CROPS).includes(m.item)) return no('unknown');
      if (min < shop.open || min >= shop.close + this.perk('shopHours')) return no('closed'); if (this.farm.money < item.buy * n) return no('money');
      if (!invAdd(p.inv, BAL.invSlots, m.item, n)) return no('full');
      this.farm.money -= item.buy * n; this.logEvent(a.id, 'buy', { id: m.item, n }); self(); farmChanged(); done();
    } else if (m.t === 'upgrade') { // 鐵匠鋪：用錠和錢把工具升一級（木 → 銅 → 鐵 → 金）。越高級越省體力，斧頭、十字鎬、鐮刀、劍一下打得比較多
      const T = BAL.tools, tool = m.tool; if (!near('smith')) return no('far'); if (!T.upgradable.includes(tool) || !p.inv.some((x) => x && ITEMS[x.id].tool === tool)) return no('unknown');
      const lv = (p.toolLv ||= {})[tool] || 1, cost = T.cost[lv]; if (!cost) return no('max');
      if (this.farm.money < cost.money) return no('money'); const plan = planTake(ITEMS, p.inv, { [cost.bar]: cost.n }); if (!plan) return no('materials');
      for (const [i, k] of plan) invTake(p.inv, i, k); this.farm.money -= cost.money; p.toolLv[tool] = lv + 1;
      this.logEvent(a.id, 'upgrade', { tool, lv: lv + 1 }); self(); farmChanged(); done({ lv: lv + 1 });
    } else if (m.t === 'quest-done') { // 佈告欄的每日委託：東西交齊就拿到報酬，交的人跟委託人的好感也會增加
      const q = this.farm.quest; if (!near('board')) return no('far'); if (!q || q.day !== this.farm.day || q.done) return no('nothing');
      const plan = planTake(ITEMS, p.inv, { [q.item]: q.n }); if (!plan) return no('materials');
      for (const [i, k] of plan) invTake(p.inv, i, k); q.done = a.id; q.reward = Math.round(q.reward * (1 + this.perk('questReward'))); this.farm.money += q.reward;
      const fr = ((p.friend ||= {})[q.npc] ||= { pts: 0, talk: 0, giftDay: 0, week: 0, gifts: 0, met: false }); fr.pts = clamp(fr.pts + BAL.quest.friend, 0, BAL.friend.max);
      this.logEvent(a.id, 'quest', { npc: q.npc }); this.mailCheck(a.id, p); self(); farmChanged(); done({ reward: q.reward });
    } else if (m.t === 'note') { // 農場的便條板：留一句話給對方（留最近 20 張）
      const text = String(m.text || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, BAL.duo.noteMaxChars); if (!near('notes')) return no('far'); if (!text) return no('slot');
      const f = this.farm; f.noteN = (f.noteN || 0) + 1; (f.notes ||= []).push({ id: f.noteN, by: a.id, name: p.nick || a.name, text, day: f.day }); f.notes = f.notes.slice(-BAL.duo.notesKeep);
      this.logEvent(a.id, 'note'); this.farmDirty = true; this.broadcast({ t: 'notes', notes: f.notes }); done();
    } else if (m.t === 'give') { // 把東西送給對方：兩個人要站得夠近
      const other = this.online().find((s) => s.a.id !== a.id && s.a.map === a.map && (a.map !== 'mine' || s.a.floor === a.floor) && Math.hypot(s.a.x - a.x, s.a.y - a.y) <= BAL.duo.giveReach); if (!other) return no('far');
      const held = p.inv[slot]; if (!held) return no('slot'); const k = Math.min(n, held.n), q = this.player(other.a.id);
      if (!invAdd(q.inv, BAL.invSlots, held.id, k, held.q || 0)) return no('full');
      invTake(p.inv, slot, k); this.dirtyPl.add(other.a.id); this.logEvent(a.id, 'give', { id: held.id, n: k }); self();
      this.send(other.ws, { t: 'self', ...this.pubSelf(other.a) }); this.send(other.ws, { t: 'given', from: a.id, item: held.id, n: k }); done();
    } else if (m.t === 'build') { // 木工屋：擴建農舍（倉庫箱變大、體力上限變多）、開墾新的田。錢和材料都要夠
      if (!near('carpenter')) return no('far');
      const cost = m.what === 'house' ? BAL.house.levels[this.houseLv()] : BAL.land[m.what]; if (!cost) return no(m.what === 'house' ? 'max' : 'unknown');
      if (m.what !== 'house' && (this.farm.land || {})[m.what]) return no('already');
      const { money, name, desc, ...mats } = cost; if (this.farm.money < money) return no('money'); const plan = planTake(ITEMS, p.inv, mats); if (!plan) return no('materials');
      for (const [i, k] of plan) invTake(p.inv, i, k); this.farm.money -= money;
      if (m.what === 'house') this.farm.houseLv = this.houseLv() + 1; else (this.farm.land ||= {})[m.what] = this.farm.day;
      this.logEvent(a.id, 'build', { what: m.what }); self(); farmChanged(); this.broadcast({ t: 'built', what: m.what, by: a.id, houseLv: this.houseLv(), land: this.farm.land || {} }); done();
    } else if (m.t === 'donate') { // 修復小鎮：把東西捐給某個設施。清單上的每一項都交齊，設施就修好了（兩個人一起累積）
      const R = RESTORE[m.fac]; if (!near('board')) return no('far'); if (!R) return no('unknown');
      const st = ((this.farm.restore ||= {})[m.fac] ||= { given: {}, done: 0 }); if (st.done) return no('already');
      const held = p.inv[slot]; if (!held) return no('slot');
      const spec = Object.keys(R.need).find((k) => (st.given[k] || 0) < R.need[k] && matches(ITEMS, held.id, k)); if (!spec) return no('unneeded');
      const k = Math.min(n, held.n, R.need[spec] - (st.given[spec] || 0)); invTake(p.inv, slot, k); st.given[spec] = (st.given[spec] || 0) + k;
      this.logEvent(a.id, 'donate', { fac: m.fac, n: k });
      if (Object.entries(R.need).every(([key, need]) => (st.given[key] || 0) >= need)) {
        st.done = this.farm.day; this.logEvent(0, 'restored', { fac: m.fac });
        const all = Object.keys(RESTORE).every((id) => this.farm.restore[id] && this.farm.restore[id].done); if (all) this.farm.money += BAL.restore.allDone.money;
        this.broadcast({ t: 'restored', fac: m.fac, by: a.id, all });
      }
      self(); farmChanged(); done({ given: k, done: !!st.done });
    } else if (m.t === 'mail-open') { // 信箱：打開信，裡面附的東西放進背包
      const mail = (p.mail || []).find((x) => x.id === Number(m.mid)); if (!near('mail')) return no('far'); if (!mail) return no('unknown');
      if (mail.item && !mail.got) { if (!invAdd(p.inv, BAL.invSlots, mail.item[0], mail.item[1])) return no('full'); }
      mail.got = true; self(); done();
    } else if (m.t === 'chest') { // 家裡的倉庫箱（兩個人共用）：in 放進去、out 拿出來
      if (!near('chest')) return no('far');
      const from = m.dir === 'in' ? p.inv : this.farm.chest, to = m.dir === 'in' ? this.farm.chest : p.inv, cap = m.dir === 'in' ? this.chestSlots() : BAL.invSlots, s = from[slot];
      if (!s) return no('slot'); const k = Math.min(n, s.n);
      if (!invAdd(to, cap, s.id, k, s.q || 0)) return no('full');
      invTake(from, slot, k); self(); farmChanged(); done();
    } else if (m.t === 'warp') this.onWarp(ws, a, p, m, { no, done });
    else if (m.t === 'craft') { // 製作台：用材料做加工機
      const mc = MACHINES[m.kind]; if (!near('workbench')) return no('far'); if (!mc || !mc.craft) return no('unknown'); // 果樹不是做出來的，要買樹苗
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
      p.energy = Math.min(this.energyMax(), p.energy + Math.round(it.energy * k)); if (it.heal) p.hp = Math.min(BAL.mine.hpMax, (p.hp ?? BAL.mine.hpMax) + it.heal);
      if (it.buff) { p.buffs ||= {}; p.buffs[it.buff[0]] = this.absNow() + Math.round(it.buff[1] * k); }
      self(); this.broadcast({ t: 'fx', id: a.id, kind: 'eat', map: a.map, x: Math.floor(a.x), y: Math.floor(a.y) }); done({ buff: it.buff || null });
    }
    else if (['animal-buy', 'animal', 'feed', 'graze', 'adopt', 'pet'].includes(m.t)) this.onAnimal(a, p, m, { no, done, self, near, farmChanged });
    else if (m.t === 'talk' || m.t === 'gift') this.onNpc(a, p, m, { no, done, self });
    else if (m.t === 'event-start') { // 主線、兩個人的劇情要開始了：在這裡照 when 檢查一次（演的時候時間會過，所以開始時檢查），記下正在演哪一段
      const ev = EVENTS[m.event]; if (!ev || ev.kind === 'heart') return no('unknown'); if ((p.events ||= {})[m.event]) return no('already');
      // together：一定要兩個人都在；shared（主線的大事）：對方剛好在旁邊就一起看，不在就自己看、對方之後自己遇到
      const need = !!(ev.when && ev.when.together), mate = need || ev.shared ? this.mateNear(a) : null, mp = mate && this.player(mate.a.id);
      if (!eventReady(ev, this.evState(a, p, !!mate))) return no('when');
      // 對方也要符合條件（例如看過前面那一章）才拉他一起看；位置算自己的（他就站在旁邊）。對方正在演別段就不打擾
      const mateSeen = mp && !!(mp.events || {})[m.event], mateOk = mp && !mateSeen && eventReady(ev, { ...this.evState(mate.a, mp, true), x: a.x, y: a.y });
      const mateBusy = mateOk && mp.evOpen && mp.evOpen.id !== m.event && EVENTS[mp.evOpen.id] && !(mp.events || {})[mp.evOpen.id];
      if (need && !mateSeen && !mateOk) return no('when');
      if (need && mateBusy) return no('busy');
      // a 是先開始的人，b 是對方：兩邊畫面上誰說哪句都一樣
      const cast = mate ? { a: { id: a.id, name: p.nick || a.name, look: p.look }, b: { id: mate.a.id, name: mp.nick || mate.a.name, look: mp.look } } : null;
      if (mateOk && !mateBusy) { mp.evOpen = { id: m.event, cast }; this.dirtyPl.add(mate.a.id); this.send(mate.ws, { t: 'self', ...this.pubSelf(mate.a) }); }
      p.evOpen = { id: m.event, ...(cast ? { cast } : {}) }; self(); done({ open: p.evOpen });
    } else if (m.t === 'event-done') { // 看完一段劇情：記下來（每段只看一次），照選的選項加好感、記旗標；有獎勵的給獎勵、寫進紀念冊
      const ev = EVENTS[m.event]; if (!ev) return no('unknown'); if ((p.events ||= {})[m.event]) return no('already');
      if (ev.kind === 'heart') { const fr0 = (p.friend || {})[ev.npc]; if (!fr0 || fr0.pts < ev.hearts * BAL.friend.heart) return no('hearts'); }
      else if (!p.evOpen || p.evOpen.id !== m.event) return no('closed'); // 主線、兩個人的劇情：要先 event-start
      const gains = {}, seen = new Set(), add = (npc, n) => { if (npc && NPCS[npc] && n) gains[npc] = (gains[npc] || 0) + n; };
      for (const pk of Array.isArray(m.picks) ? m.picks.slice(0, 12) : []) { const st = ev.steps[Number(pk.step)], opt = st && st.choice && st.choice[Number(pk.opt)]; if (!opt || seen.has(pk.step)) continue; seen.add(pk.step); add(opt.npc || ev.npc, opt.pts || 0); if (opt.flag) (p.flags ||= {})[opt.flag] = 1; }
      const R = ev.reward || {}, got = [], f = this.farm; for (const [npc, n] of Object.entries(R.pts || {})) add(npc, n);
      for (const [npc, n] of Object.entries(gains)) { const fr = ((p.friend ||= {})[npc] ||= { pts: 0, talk: 0, giftDay: 0, week: 0, gifts: 0, met: false }); fr.pts = clamp(fr.pts + n, 0, BAL.friend.max); }
      // 東西進自己的背包；背包滿了放進倉庫箱；錢進共用的錢包，兩個人只給一次
      for (const [item, k] of R.items || []) { if (!ITEMS[item]) continue; if (invAdd(p.inv, BAL.invSlots, item, k)) got.push({ id: item, n: k }); else if (invAdd(f.chest, this.chestSlots(), item, k)) got.push({ id: item, n: k, chest: true }); }
      let money = 0; if (R.money && !(f.evPaid ||= {})[m.event]) { f.evPaid[m.event] = f.day; f.money += R.money; money = R.money; }
      if (ev.album && !(f.album ||= []).some((e) => e.key === 'ev:' + m.event)) { f.album.push({ day: f.day, key: 'ev:' + m.event, by: a.id }); this.broadcast({ t: 'stat', key: 'storyev', album: f.album }); }
      p.events[m.event] = f.day; if (p.evOpen && p.evOpen.id === m.event) p.evOpen = null;
      this.logEvent(a.id, { heart: 'event', story: 'storyev', duo: 'duoev' }[ev.kind], { id: m.event }); this.mailCheck(a.id, p); self();
      if (money || got.some((g) => g.chest)) farmChanged();
      done({ gain: gains[ev.npc] || 0, gains, got, money, pts: ev.npc && p.friend[ev.npc] ? p.friend[ev.npc].pts : 0 });
    } else if (m.t === 'fest-score') { // 節慶小遊戲的成績：一年一次，照分數給獎（錢進共用的錢包、東西進自己的背包）
      const id = this.festivalToday(), F = FESTIVALS[id]; if (!id || id !== m.fest) return no('closed'); if (a.map !== F.map) return no('far');
      const key = `${Math.floor((this.farm.day - 1) / (BAL.seasonDays * 4))}:${id}`; if ((p.fest ||= {})[key] != null) return no('already');
      const score = clamp(Math.floor(Number(m.score)) || 0, 0, 200), tier = F.prizes.filter(([need]) => score >= need).length - 1, prize = F.prizes[tier][1];
      if (prize.item && !invAdd(p.inv, BAL.invSlots, prize.item[0], prize.item[1])) return no('full');
      p.fest[key] = score; this.farm.money += prize.money || 0; this.logEvent(a.id, 'festival', { id, score }); self(); farmChanged();
      this.broadcast({ t: 'fest', id: a.id, fest: id, score }); done({ prize, tier, score });
    }
    else if (m.t.startsWith('mine-') || m.t === 'mon-hit' || m.t === 'hurt') this.onMine(ws, a, p, m, { no, done, self, near });
    else if (m.t === 'fish') this.onFish(a, p, m, { no, done, self });
    else if (m.t === 'reel') this.onReel(a, p, m, { no, done, self });
    else if (m.t === 'look') { // 建立角色、換裝：存起來，對方馬上看到
      const look = cleanLook(m.look); if (!look) return no('look');
      p.look = look; p.nick = cleanName(m.name) || p.nick; this.dirtyPl.add(a.id);
      this.broadcast({ t: 'look', id: a.id, look, name: p.nick || a.name });
    } else if (m.t === 'outfit') { // 我的穿搭：把現在這套存起來（或蓋掉某一套、刪掉某一套），之後一鍵換上。換上還是用上面的 look
      const list = (p.outfits ||= []), i = Math.floor(Number(m.slot));
      if (m.op === 'del') { if (!(i >= 0 && i < list.length)) return no('slot'); list.splice(i, 1); }
      else {
        const look = cleanLook(m.look); if (!look) return no('look');
        const name = cleanName(m.name).slice(0, 8) || `穿搭 ${list.length + 1}`;
        if (i >= 0 && i < list.length) list[i] = { name, look }; else { if (list.length >= BAL.outfits.max) return no('full'); list.push({ name, look }); }
      }
      self(); done({ n: list.length });
    } else if (m.t === 'bubble') { const text = String(m.text || '').replace(/\s+/g, ' ').trim().slice(0, BAL.bubbleMaxChars); if (text) this.broadcast({ t: 'bubble', id: a.id, text }); }
    else if (m.t === 'emote') { if (BAL.emotes.includes(m.e)) this.broadcast({ t: 'emote', id: a.id, e: m.e }); }
    else if (m.t === 'set') { // 兩個人共用的設定（目前只有一天的長度）：先把時鐘結算到現在再換速度，時間不會跳
      if (m.key !== 'dayLen' || !BAL.dayLenOptions.includes(m.value)) return no('unknown');
      const now = Date.now(); if (this.farm.lastTick) { this.farm.minute = this.minuteNow(now); this.farm.lastTick = now; }
      (this.farm.opts ||= {}).dayLen = m.value; this.farmDirty = true;
      this.broadcast({ t: 'opts', by: a.id, opts: { dayLen: m.value }, minute: this.farm.minute, minutesPerSecond: this.minPerMs() * 1000 }); done();
    }
    else if (m.t === 'sleep') {
      if (m.on && !near('bed')) return no('far');
      a.asleep = !!m.on; a.sleptAt = this.minuteNow(); ws.serializeAttachment(a); this.broadcast({ t: 'sleep', id: a.id, on: a.asleep }); done();
      if (a.asleep) { this.flush(); await this.maybeNewDay('sleep'); }
    }
    this.flush();
  }
  // 成就用的數字：統計次數，加上幾個算出來的
  statOf(k) { return farmStat(this.farm, k); }
  // 劇情的條件要看的現在狀況（shared/rules.js 的 eventReady）
  evState(a, p, together) {
    const f = this.farm;
    return { map: a.map, x: a.x, y: a.y, minute: this.minuteNow(), day: f.day, season: seasonId(f.day, BAL), weather: weatherOf(f.seed, f.day, BAL), seen: p.events || {}, flags: p.flags || {},
      stat: (k) => this.statOf(k), restored: Object.values(f.restore || {}).filter((r) => r && r.done).length, houseLv: this.houseLv(), together,
      fixed: Object.fromEntries(Object.entries(f.restore || {}).filter(([, r]) => r && r.done).map(([k]) => [k, 1])),
      hearts: Object.fromEntries(Object.entries(p.friend || {}).map(([k, v]) => [k, Math.floor(v.pts / BAL.friend.heart)])) };
  }
  // 對方在不在旁邊（同一張地圖、沒睡著、幾格之內）：兩個人的劇情要兩個人都在
  mateNear(a) { return this.online().find((s) => s.a.id !== a.id && s.a.map === a.map && (a.map !== 'mine' || s.a.floor === a.floor) && !s.a.asleep && Math.hypot(s.a.x - a.x, s.a.y - a.y) <= BAL.story.togetherReach) || null; }
  // 檢查有沒有新達成的成就：獎金進共用的錢包，回傳這次達成的
  checkAchievements() { const f = this.farm, got = (f.achieved ||= {}), fresh = []; for (const a of ACHIEVEMENTS) if (!got[a.id] && this.statOf(a.stat) >= a.need) { got[a.id] = f.day; f.money += a.money; fresh.push(a.id); } if (fresh.length) this.farmDirty = true; return fresh; }
  houseLv() { return this.farm.houseLv || 1; }
  energyMax() { return BAL.energyMax + this.perk('energyMax') + (this.houseLv() - 1) * BAL.house.perLevel.energyMax; }
  chestSlots() { return BAL.chestSlots + (this.houseLv() - 1) * BAL.house.perLevel.chestSlots; }
  // 修好的設施帶來的好處：把同一種的加起來（例如兩個都加經驗就疊加）
  perk(type) { const done = this.farm.restore || {}; return Object.entries(RESTORE).reduce((s, [id, r]) => s + (done[id] && done[id].done && r.perk.type === type ? r.perk.v : 0), 0); }
  // 今天是不是節慶（回傳節慶的 id，不是就回傳 null）
  festivalToday() { const f = this.farm, season = seasonIndex(f.day, BAL), d = ((f.day - 1) % BAL.seasonDays) + 1; return Object.keys(FESTIVALS).find((k) => FESTIVALS[k].season === season && FESTIVALS[k].day === d) || null; }

  // ---------- 居民 ----------
  // 好感是每個玩家各算各的。居民在哪裡是照行程用時間算的（shared/rules.js 的 npcPos），這裡只檢查你是不是站在他旁邊
  onNpc(a, p, m, { no, done, self }) {
    const npc = NPCS[m.npc], F = BAL.friend, f = this.farm; if (!npc || !npc.full) return no('unknown');
    const fid = this.festivalToday(), pos = npcPos(npc, this.minuteNow(), F.walkMinutes, GRIDS, { entries: NPC_ENTRIES, wet: isWet(weatherOf(f.seed, f.day, BAL)), fest: fid && FESTIVALS[fid].map === 'town' ? FESTIVALS[fid].stage : null }); if (a.map !== pos.map || Math.hypot(pos.x - a.x, pos.y - a.y) > BAL.reach + 1.5) return no('far');
    const fr = ((p.friend ||= {})[m.npc] ||= { pts: 0, talk: 0, giftDay: 0, week: 0, gifts: 0, met: false });
    const bday = npc.birthday && npc.birthday[0] === seasonIndex(f.day, BAL) && npc.birthday[1] === ((f.day - 1) % BAL.seasonDays) + 1;
    if (m.t === 'talk') { // 每天第一次聊天會增加好感
      const first = !fr.met, daily = fr.talk !== f.day; fr.met = true;
      if (daily) { fr.talk = f.day; fr.pts = clamp(fr.pts + F.talk + this.perk('talk'), 0, F.max); this.logEvent(a.id, 'talk', { npc: m.npc }); }
      this.mailCheck(a.id, p); self(); return done({ first, daily, pts: fr.pts, bday });
    }
    // 送禮：一天一次、一週兩次（生日那天好感加四倍）
    const slot = Math.floor(Number(m.slot)), held = p.inv[slot], it = held && ITEMS[held.id]; if (!it || it.kind === 'tool') return no('slot');
    const week = Math.floor((f.day - 1) / 7); if (fr.week !== week) { fr.week = week; fr.gifts = 0; }
    if (fr.giftDay === f.day) return no('giftday'); if (fr.gifts >= F.giftsPerWeek) return no('giftweek');
    const taste = giftTaste(ITEMS, npc, held.id), gain = F.gift[taste] * (bday ? F.birthdayMult : 1) * (1 + 0.25 * (held.q || 0));
    invTake(p.inv, slot, 1); fr.met = true; fr.giftDay = f.day; fr.gifts += 1; fr.pts = clamp(fr.pts + Math.round(gain), 0, F.max);
    this.logEvent(a.id, 'gift', { npc: m.npc, id: held.id }); this.mailCheck(a.id, p); self(); this.broadcast({ t: 'fx', id: a.id, kind: 'eat', map: a.map, x: Math.floor(a.x), y: Math.floor(a.y) });
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
      const T = M.rockTypes[rock.type], pw = (p.toolLv && p.toolLv.pick) || 1; let drops = null;
      if (rock.hp <= pw) {
        drops = T.gems ? (() => { const pool = M.gems.filter(([, from]) => a.floor >= from); let k = Math.random() * pool.reduce((s2, g) => s2 + g[2], 0); for (const [id, , w] of pool) { k -= w; if (k <= 0) return { [id]: 1 }; } return { quartz: 1 }; })() : T.drops;
        const inv = JSON.parse(JSON.stringify(p.inv)); for (const [id, n] of Object.entries(drops)) if (!invAdd(inv, BAL.invSlots, id, n)) return no('full');
        if (p.energy < M.energy) return no('tired'); p.energy -= M.energy; p.inv = inv; p.skills.mining = (p.skills.mining || 0) + T.xp;
        st.rocks = st.rocks.filter((r) => r !== rock); if (st.stairs.x === x && st.stairs.y === y) st.stairs.open = true; this.logEvent(a.id, 'mine', { type: rock.type });
      } else { if (p.energy < M.energy) return no('tired'); p.energy -= M.energy; rock.hp -= pw; }
      this.farmDirty = true; self(); this.broadcast({ t: 'fx', id: a.id, kind: 'pick', map: 'mine', x, y });
      this.toFloor(a.floor, { t: 'mine-upd', floor: a.floor, rock: { x, y, hp: drops ? 0 : rock.hp }, stairs: st.stairs, by: a.id, drops }); return done({ drops });
    }
    const mon = st.mons.find((x) => x.id === Number(m.mid)); if (!mon) return no('nothing');
    const D = M.monsters[mon.type], pos = monPos(mon, Date.now());
    if (m.t === 'mon-hit') { // 揮劍：打到沒血就不見、掉東西
      if (tool !== 'sword') return no('tool:sword'); if (Math.hypot(pos.x - a.x, pos.y - a.y) > BAL.reach + 0.8) return no('far');
      mon.hp -= ((p.toolLv && p.toolLv.sword) || 1) + Math.floor(levelOf(p.skills.combat || 0, BAL).lv / 20); let drops = null;
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
    const pool = Object.entries(FISH).filter(([, d]) => !d.duo && d.maps.includes(a.map) && d.seasons.includes(season) && min >= d.time[0] && min < d.time[1] && (!d.rain || wet));
    let pick = null; if (pool.length && (this.perk('fishSize') || Math.random() >= F.junkChance)) { let r = Math.random() * pool.reduce((s, [, d]) => s + d.weight, 0); for (const [id, d] of pool) { r -= d.weight; if (r <= 0) { pick = id; break; } } }
    // 兩個人才釣得到的魚：對方就在旁邊、也正把竿子放在水裡，而且今天還沒釣到過，這一竿就是牠
    const mate = this.online().find((s) => s.a.id !== a.id && s.a.map === a.map && Math.hypot(s.a.x - a.x, s.a.y - a.y) <= BAL.duo.fishReach), mc = mate && this.casts && this.casts.get(mate.a.id);
    const duoFish = mc && Date.now() - mc.at < mc.wait + 20000 && f.duoFishDay !== f.day && Object.entries(FISH).find(([, d]) => d.duo && d.maps.includes(a.map) && d.seasons.includes(season));
    if (duoFish) pick = duoFish[0];
    const wait = Math.round(F.waitMs[0] + Math.random() * (F.waitMs[1] - F.waitMs[0]));
    (this.casts ||= new Map()).set(a.id, { fish: pick, at: Date.now(), wait, x, y });
    self(); this.broadcast({ t: 'fx', id: a.id, kind: 'cast', map: a.map, x, y });
    done({ wait, diff: pick ? FISH[pick].diff : 1, duo: !!duoFish });
  }
  onReel(a, p, m, { no, done, self }) {
    const c = this.casts && this.casts.get(a.id), F = BAL.fishing; if (!c) return no('gone');
    this.casts.delete(a.id);
    const t = Date.now() - c.at; if (t < c.wait - 150 || t > c.wait + 20000) return no('gone'); // 還沒上鉤就說釣到、或拖太久：不算
    if (!m.win) return done({ got: null });
    const item = c.fish ? 'fish_' + c.fish : 'junk', d = c.fish && FISH[c.fish];
    if (!invAdd(p.inv, BAL.invSlots, item, 1)) return no('full');
    let size = 0, record = false;
    if (d) { size = Math.round((d.size[0] + Math.min(1, Math.pow(Math.random(), 1.6) + this.perk('fishSize')) * (d.size[1] - d.size[0])) * 10) / 10; p.fishRec ||= {}; record = size > (p.fishRec[c.fish] || 0); if (record) p.fishRec[c.fish] = size; p.skills.fishing = (p.skills.fishing || 0) + d.diff * F.xpPerDiff; }
    this.logEvent(a.id, 'fish', { id: item, size }); if (d && d.duo) { this.farm.duoFishDay = this.farm.day; this.farmDirty = true; this.logEvent(a.id, 'duofish', { size }); } self();
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
    if (e.to === 'greenhouse' && !(this.farm.land || {}).greenhouse) return no('greenhouse'); // 溫室要先找木工屋蓋
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
    const lvOf = (t) => (p.toolLv && p.toolLv[t]) || 1, power = tool ? lvOf(tool) : 1; // 工具等級：越高越省體力、一下打得比較多
    const spend = (e) => { e = Math.max(1, Math.round(e * (1 - BAL.tools.energyCut * (power - 1)))); if (p.energy < e) return false; p.energy -= e; return true; };
    const xp = (skill, n) => { p.skills[skill] = (p.skills[skill] || 0) + Math.round(n * (1 + this.perk('xp'))); };
    const fx = (kind, extra) => this.broadcast({ t: 'fx', id: a.id, kind, map: a.map, x, y, ...extra }); // 讓對方看到你在做什麼
    const obj = this.objs.get(k);
    if (obj && obj.type === 'forage') { // 野外的採集物：手上拿什麼都可以撿
      if (!invAdd(p.inv, BAL.invSlots, obj.item, 1)) return bad('full');
      this.objs.delete(k); this.dirtyObjs.add(k); xp('foraging', BAL.forage.xp); this.logEvent(a.id, 'forage', { id: obj.item }); self(); fx('harvest', { item: obj.item });
      this.broadcast({ t: 'objs', by: a.id, list: [this.pubObj(k)], drops: { [obj.item]: 1 } }); return done();
    }
    if (obj && obj.type === 'machine') { // 加工機：好了就拿、空的就放原料進去、拿斧頭或十字鎬對著空的機器可以收回背包
      const mc = MACHINES[obj.kind], now = this.absNow(), upd = (kind) => { this.dirtyObjs.add(k); self(); fx(kind); this.broadcast({ t: 'objs', by: a.id, list: [this.pubObj(k)] }); done(); };
      if (obj.out && now >= obj.doneAt && mc.seasons && !mc.seasons.includes(seasonId(this.farm.day, BAL))) return no('season'); // 果樹：不是結果的季節
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
      if (d.duo) { // 要兩個人在幾秒內都對它動手才搬得開
        const now = Date.now(), push = (this.pushes ||= new Map()).get(k), mate = push && push.id !== a.id && now - push.at <= BAL.duo.pushWindowMs;
        if (!mate) { this.pushes.set(k, { id: a.id, at: now }); this.broadcast({ t: 'fx', id: a.id, kind: 'push', map: a.map, x, y }); return done({ waiting: true }); }
        this.pushes.delete(k); this.logEvent(a.id, 'duo', { type: obj.type });
      }
      if (obj.hp <= power) { const inv = JSON.parse(JSON.stringify(p.inv)); for (const [id, n] of Object.entries(d.drops)) if (!invAdd(inv, BAL.invSlots, id, n)) return bad('full'); if (!spend(d.energy)) return bad('tired'); p.inv = inv; this.objs.delete(k); xp(d.xp[0], d.xp[1]); this.logEvent(a.id, 'clear', { type: obj.type }); }
      else { if (!spend(d.energy)) return bad('tired'); obj.hp -= power; }
      this.dirtyObjs.add(k); self(); fx(tool); this.broadcast({ t: 'objs', by: a.id, list: [this.pubObj(k)], drops: this.objs.has(k) ? null : d.drops }); return done();
    }
    let ground = groundAt(map, x, y); if (ground === 'locked' && a.map === 'farm' && (this.farm.land || {}).field2) ground = 'soil'; // 開墾過的田
    const tile = this.tiles.get(k), crop = tile && tile.c, def = crop && CROPS[crop.id];
    const changed = (kind) => { this.touch(a.map, x, y); this.logEvent(a.id, kind, { x, y }); self(); fx(kind); this.broadcast({ t: 'tiles', by: a.id, kind, list: [this.pubTile(k)] }); done(); };
    const mature = crop && !crop.dead && cropStage(def, crop.g) === 4;
    if (tool === 'can' && tile && tile.w !== day) { if (!spend(BAL.energy.can)) return bad('tired'); tile.w = day; return changed('water'); }
    if (mature) { // 收成：品質看肥料和農耕等級
      const lucky = p.buffs && p.buffs.luck > this.absNow() ? BAL.buffs.luck : 0; // 吃了有運氣效果的料理：等於多一層肥料
      const q = rollQuality(Math.random, (tile.f || 0) + lucky + this.perk('luck'), level('farming'), BAL);
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
      this.objs.set(k, { type: 'machine', kind: item.machine, hp: 1, ...(mc.gives ? { out: mc.gives, n: 1, doneAt: this.absNow() + (mc.grow || mc.minutes) } : {}) }); // 果樹第一次要先長大（grow），之後每隔 minutes 結一次果
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
    this.farm.minute += Math.min(now - (this.farm.lastTick || now), TICK_MS * 3) * this.minPerMs(); this.farm.lastTick = now;
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
    const lines = f.ship.map((l) => ({ ...l, sum: Math.round(sellPrice(ITEMS[l.id], l.q, BAL) * l.n * (1 + this.perk('ship'))) })), total = lines.reduce((s, l) => s + l.sum, 0);
    f.lastShip = lines.length ? { day: old, total, lines } : null; f.money += total; f.ship = []; (f.stats ||= {}).shipMoney = (f.stats.shipMoney || 0) + total;
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
      p.energy = Math.max(p.energy, Math.round((this.energyMax()) * k)); p.hp = BAL.mine.hpMax; this.dirtyPl.add(r.user_id);
    }
    f.newborn = this.animalsNewDay(old).map((b) => b.name);
    this.spawnDaily();
    for (const r of players) this.mailCheck(r.user_id, this.player(r.user_id));
    f.newAchievements = this.checkAchievements();
    this.farmDirty = true; this.logEvent(0, 'newday', { reason, total });
    for (const { ws, a } of this.online()) {
      if (reason === 'late' && !a.asleep) { a.map = 'house'; a.x = MAPS.house.spawn.x; a.y = MAPS.house.spawn.y; Object.assign(this.player(a.id), { map: a.map, x: a.x, y: a.y }); } // 昏倒的人被送回家
      if (a.map === 'mine') { Object.assign(a, MINE_EXIT, { floor: 0 }); Object.assign(this.player(a.id), MINE_EXIT); } // 礦坑隔天會重新長：還在裡面的人送回入口
      a.asleep = false; ws.serializeAttachment(a);
    }
    this.flush();
    for (const { ws, a } of this.online()) this.send(ws, { t: 'newday', reason, farm: this.pubFarm(), tiles: [...this.tiles.keys()].map((k) => this.pubTile(k)), objs: [...this.objs.keys()].map((k) => this.pubObj(k)), self: this.pubSelf(a), you: this.pub(a), players: this.online().filter((s) => s.a.id !== a.id).map((s) => this.pub(s.a)) });
  }
  // 把一份備份的田、物件、角色寫回去（this.farm 由呼叫的人先設好）
  applyBackup(b) {
    this.tiles = new Map(b.tiles); this.pl.clear();
    this.sql.exec(`DELETE FROM mapchunks`); this.sql.exec(`DELETE FROM objs`);
    for (const k of this.tiles.keys()) { const t = unK(k); this.touch(t.map, t.x, t.y); }
    if (b.objs) { const now = new Map(b.objs); for (const k of this.objs.keys()) if (!now.has(k)) this.sql.exec(`INSERT OR REPLACE INTO objs (k, data) VALUES (?, NULL)`, k); for (const [k, o] of now) this.sql.exec(`INSERT OR REPLACE INTO objs (k, data) VALUES (?, ?)`, k, JSON.stringify(o)); this.objs = now; }
    for (const r of b.players || []) this.sql.exec(`UPDATE players SET data = ? WHERE user_id = ?`, r.data, r.user_id);
    this.farmDirty = true;
  }
  async restore(request, who) {
    const body = await request.json().catch(() => ({})), day = Number(body.day) || 0;
    const row = this.sql.exec(`SELECT data FROM backups WHERE day = ?`, day).toArray()[0];
    if (!row) return json({ error: '沒有這一天的備份' }, 404);
    const b = tryParse(row.data); if (!b || !b.farm) return json({ error: '這一天的備份讀不出來' }, 500);
    this.farm = { ...b.farm, lastTick: Date.now() }; this.applyBackup(b);
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
      this.farm.minute += Math.min(now - (this.farm.lastTick || now), TICK_MS * 3) * this.minPerMs(); this.farm.lastTick = 0;
      this.saveFarm(); await this.ctx.storage.deleteAlarm();
    } else if (left.every((s) => s.a.asleep)) await this.newDay('sleep'); // 沒睡的那個離開了，剩下的人都睡了
  }
  webSocketError() {}
}
