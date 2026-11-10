// 晴耕谷的伺服器：FarmRoom。每個一對一對話一個實例（idFromName('farm:' + 對話 id)），自己的 SQLite，跟聊天資料完全分開。
// 身分由 src/index.js 先向 ChatServer 驗證過，寫在 x-farm-auth 標頭；這裡不直接相信瀏覽器。
// 一切以這裡為準：格子、錢、時間由這裡決定；玩家的走動在各自畫面先動，這裡只轉給對方。協定見 docs/farm-game/協定.md。
import MAP from '../public/games/farm/data/map-test.json';
import BAL from '../public/games/farm/data/balance.json';

const TICK_MS = 10000;                 // 有人在線時，每 10 秒推進一次遊戲時鐘
const DAY_SPAN = BAL.dayEndMinute - BAL.dayStartMinute;            // 一天有幾個遊戲分鐘（早上 6 點到凌晨 2 點）
const MIN_PER_MS = DAY_SPAN / (BAL.dayMinutesReal * 60000);         // 現實一毫秒等於幾個遊戲分鐘
const CHUNK = 16, BACKUP_DAYS = 7, MOVE_MIN_MS = 40;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const groundAt = (x, y) => { let t = MAP.ground || 'grass'; for (const p of MAP.patches || []) if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) t = p.type; return t; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class FarmRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS chunks (cx INTEGER NOT NULL, cy INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (cx, cy));
      CREATE TABLE IF NOT EXISTS players (user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL, last_seen INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, day INTEGER NOT NULL, user_id INTEGER NOT NULL, type TEXT NOT NULL, data TEXT);
      CREATE TABLE IF NOT EXISTS backups (day INTEGER PRIMARY KEY, ts INTEGER NOT NULL, data TEXT NOT NULL);
    `);
    // 連線保持用的 ping 由系統自動回，不會把休眠中的實例叫醒
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.farm = null; this.tiles = null; this.dirty = new Set();
  }

  // ---------- 資料：讀進記憶體、改完整塊寫回 ----------
  load() {
    if (this.farm) return;
    const row = this.sql.exec(`SELECT value FROM meta WHERE key = 'farm'`).toArray()[0];
    this.farm = row ? JSON.parse(row.value) : { created: Date.now(), convId: 0, day: 1, minute: BAL.dayStartMinute, money: 500, lastTick: 0 };
    this.tiles = new Map();
    for (const r of this.sql.exec(`SELECT data FROM chunks`).toArray()) for (const [k, v] of Object.entries(JSON.parse(r.data))) this.tiles.set(k, v);
  }
  saveFarm() { this.sql.exec(`INSERT OR REPLACE INTO meta (key, value) VALUES ('farm', ?)`, JSON.stringify(this.farm)); }
  touch(x, y) { this.dirty.add(Math.floor(x / CHUNK) + ',' + Math.floor(y / CHUNK)); }
  // 地圖格子分區塊存（16×16 一塊）：一個動作改很多格也只寫幾列，不會每格寫一次
  flush() {
    for (const key of this.dirty) {
      const [cx, cy] = key.split(',').map(Number), data = {};
      for (const [k, v] of this.tiles) { const [x, y] = k.split(',').map(Number); if (Math.floor(x / CHUNK) === cx && Math.floor(y / CHUNK) === cy) data[k] = v; }
      if (Object.keys(data).length) this.sql.exec(`INSERT OR REPLACE INTO chunks (cx, cy, data) VALUES (?, ?, ?)`, cx, cy, JSON.stringify(data));
      else this.sql.exec(`DELETE FROM chunks WHERE cx = ? AND cy = ?`, cx, cy);
    }
    this.dirty.clear();
  }
  logEvent(userId, type, data) { this.sql.exec(`INSERT INTO events (ts, day, user_id, type, data) VALUES (?, ?, ?, ?, ?)`, Date.now(), this.farm.day, userId, type, data ? JSON.stringify(data) : null); }
  tileList() { return [...this.tiles].map(([k, v]) => { const [x, y] = k.split(',').map(Number); return { x, y, ...v, w: v.w === this.farm.day ? 1 : 0 }; }); }

  // ---------- 連線 ----------
  sockets() { return this.ctx.getWebSockets(); }
  online() { return this.sockets().map((ws) => ({ ws, a: ws.deserializeAttachment() })).filter((s) => s.a && !s.a.gone); } // gone：被自己的新分頁換掉的舊連線
  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch { /* 對方剛好斷線 */ } }
  broadcast(msg, exceptId = 0) { const text = JSON.stringify(msg); for (const { ws, a } of this.online()) if (a.id !== exceptId) { try { ws.send(text); } catch {} } }
  pub(a) { return { id: a.id, name: a.name, color: a.color, x: a.x, y: a.y, dir: a.dir, vx: a.vx || 0, vy: a.vy || 0, asleep: !!a.asleep }; }

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
    const row = this.sql.exec(`SELECT data, last_seen FROM players WHERE user_id = ?`, me.id).toArray()[0];
    const saved = row ? JSON.parse(row.data) : null;
    const others = this.online().filter((s) => s.a.id !== me.id);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const a = { id: me.id, name: me.name, color: me.color, x: saved ? saved.x : MAP.spawn.x, y: saved ? saved.y : MAP.spawn.y, dir: saved ? saved.dir : 'down', vx: 0, vy: 0, asleep: false, mt: 0 };
    server.serializeAttachment(a);
    // 時鐘只在有人的時候走：第一個人進來，從現在開始算
    if (!others.length) { this.farm.lastTick = now; this.saveFarm(); await this.ctx.storage.setAlarm(now + TICK_MS); }
    const summary = row ? this.summaryFor(me.id, saved, row.last_seen) : null;
    this.sql.exec(`INSERT OR REPLACE INTO players (user_id, name, data, last_seen) VALUES (?, ?, ?, ?)`, me.id, me.name,
      JSON.stringify({ x: a.x, y: a.y, dir: a.dir, lastDay: this.farm.day, lastMoney: this.farm.money }), now);
    this.send(server, { t: 'snapshot', you: this.pub(a), partner: who.partner, players: others.map((s) => this.pub(s.a)), farm: this.pubFarm(), tiles: this.tileList(), summary, map: MAP.name });
    this.broadcast({ t: 'join', p: this.pub(a) }, me.id);
    const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map((s) => s.trim());
    return new Response(null, { status: 101, webSocket: client, headers: protocols.includes('farm.v1') ? { 'Sec-WebSocket-Protocol': 'farm.v1' } : {} });
  }
  // 現在的遊戲時間：上次記下的分鐘，加上從那之後過了多久（兩次 tick 之間也準）
  minuteNow(now = Date.now()) { return this.farm.lastTick && this.online().length ? this.farm.minute + Math.min(now - this.farm.lastTick, TICK_MS * 3) * MIN_PER_MS : this.farm.minute; }
  pubFarm() { return { day: this.farm.day, minute: this.minuteNow(), money: this.farm.money, minutesPerSecond: MIN_PER_MS * 1000, dayStart: BAL.dayStartMinute, dayEnd: BAL.dayEndMinute }; }

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
    if (m.t === 'act') { this.onAct(ws, a, m); this.flush(); return; }
    if (m.t === 'bubble') { const text = String(m.text || '').replace(/\s+/g, ' ').trim().slice(0, BAL.bubbleMaxChars); if (text) this.broadcast({ t: 'bubble', id: a.id, text }); return; }
    if (m.t === 'emote') { if (BAL.emotes.includes(m.e)) this.broadcast({ t: 'emote', id: a.id, e: m.e }); return; }
    if (m.t === 'sleep') { a.asleep = !!m.on; ws.serializeAttachment(a); this.broadcast({ t: 'sleep', id: a.id, on: a.asleep }); if (a.asleep) await this.maybeNewDay('sleep'); }
  }
  // 走動：各自畫面先動，這裡只記位置、轉給對方。送的是「位置＋速度」，對方照速度往前推，所以不必每一步都送
  onMove(ws, a, m) {
    const now = Date.now(); if (now - a.mt < MOVE_MIN_MS) return; // 送太快的丟掉
    const x = Number(m.x), y = Number(m.y); if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    a.x = clamp(x, 0.3, MAP.w - 0.3); a.y = clamp(y, 0.3, MAP.h - 0.3); a.mt = now;
    a.vx = clamp(Number(m.vx) || 0, -1, 1); a.vy = clamp(Number(m.vy) || 0, -1, 1);
    if (['up', 'down', 'left', 'right'].includes(m.dir)) a.dir = m.dir;
    if (a.asleep && (a.vx || a.vy)) { a.asleep = false; this.broadcast({ t: 'sleep', id: a.id, on: false }); } // 起來走動就不算睡了
    ws.serializeAttachment(a);
    this.broadcast({ t: 'move', id: a.id, x: a.x, y: a.y, dir: a.dir, vx: a.vx, vy: a.vy }, a.id);
  }
  // 動作：客戶端送「請求」，這裡檢查合不合法再廣播結果。兩個人搶同一格，先到的成功，後到的收到 no
  onAct(ws, a, m) {
    const id = Number(m.id) || 0, x = Math.floor(Number(m.x)), y = Math.floor(Number(m.y)), kind = m.kind;
    const no = (reason) => this.send(ws, { t: 'no', id, reason, tile: this.pubTile(x, y) });
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= MAP.w || y >= MAP.h) return no('out');
    if (Math.hypot(x + 0.5 - a.x, y + 0.5 - a.y) > BAL.reach) return no('far');
    if (groundAt(x, y) !== 'soil') return no('ground');
    const key = x + ',' + y, cur = this.tiles.get(key);
    if (kind === 'till') { if (cur) return no('already'); this.tiles.set(key, { t: 1, w: 0, by: a.id }); }
    else if (kind === 'water') { if (!cur) return no('untilled'); if (cur.w === this.farm.day) return no('already'); cur.w = this.farm.day; }
    else if (kind === 'clear') { if (!cur) return no('already'); this.tiles.delete(key); }
    else return no('unknown');
    this.touch(x, y); this.logEvent(a.id, kind, { x, y });
    this.send(ws, { t: 'ok', id });
    this.broadcast({ t: 'tiles', by: a.id, kind, list: [this.pubTile(x, y)] });
  }
  pubTile(x, y) { const v = this.tiles.get(x + ',' + y); return v ? { x, y, t: v.t, w: v.w === this.farm.day ? 1 : 0 } : { x, y, t: 0, w: 0 }; }

  // ---------- 時間 ----------
  async alarm() {
    this.load();
    const now = Date.now(), n = this.online().length;
    if (!n) { this.flush(); this.saveFarm(); return; } // 沒有人了：時鐘停下來，不再排下一次
    this.farm.minute += Math.min(now - (this.farm.lastTick || now), TICK_MS * 3) * MIN_PER_MS; this.farm.lastTick = now;
    if (this.farm.minute >= BAL.dayEndMinute) await this.newDay('late'); // 凌晨 2 點還沒睡：昏倒，直接隔天
    else { this.saveFarm(); this.broadcast({ t: 'time', day: this.farm.day, minute: this.farm.minute }); }
    await this.ctx.storage.setAlarm(now + TICK_MS);
  }
  // 在線的人都上床了才換日（只有一個人在線就是他自己決定）
  async maybeNewDay(reason) { const on = this.online(); if (on.length && on.every((s) => s.a.asleep)) await this.newDay(reason); }
  async newDay(reason) {
    // 換日前先備份「今天結束時」的樣子，只留最近 7 天
    this.flush();
    this.sql.exec(`INSERT OR REPLACE INTO backups (day, ts, data) VALUES (?, ?, ?)`, this.farm.day, Date.now(), JSON.stringify({ farm: this.farm, tiles: [...this.tiles] }));
    this.sql.exec(`DELETE FROM backups WHERE day <= ?`, this.farm.day - BACKUP_DAYS);
    this.sql.exec(`DELETE FROM events WHERE day < ?`, this.farm.day - 30);
    this.farm.day += 1; this.farm.minute = BAL.dayStartMinute; this.farm.lastTick = Date.now();
    this.saveFarm(); this.logEvent(0, 'newday', { reason });
    for (const { ws, a } of this.online()) { a.asleep = false; ws.serializeAttachment(a); }
    this.broadcast({ t: 'newday', reason, farm: this.pubFarm(), tiles: this.tileList() }); // 澆的水乾了，整張格子重送
  }
  async restore(request, who) {
    const body = await request.json().catch(() => ({})), day = Number(body.day) || 0;
    const row = this.sql.exec(`SELECT data FROM backups WHERE day = ?`, day).toArray()[0];
    if (!row) return json({ error: '沒有這一天的備份' }, 404);
    const b = JSON.parse(row.data);
    this.farm = { ...b.farm, lastTick: Date.now() }; this.tiles = new Map(b.tiles);
    this.sql.exec(`DELETE FROM chunks`);
    for (const k of this.tiles.keys()) { const [x, y] = k.split(',').map(Number); this.touch(x, y); }
    this.flush(); this.saveFarm(); this.logEvent(who.user.id, 'restore', { day });
    this.broadcast({ t: 'newday', reason: 'restore', farm: this.pubFarm(), tiles: this.tileList() });
    return json({ ok: true, day: this.farm.day });
  }

  // ---------- 離線 ----------
  async webSocketClose(ws) {
    try { ws.close(1000, 'bye'); } catch { /* 已經關了 */ } // 回對方一個關閉，交握才算完成；不回的話瀏覽器要等很久才知道斷線
    const a = ws.deserializeAttachment(); if (!a) return;
    if (a.gone) return; // 被新分頁換掉的：人還在，什麼都不用做
    this.load();
    const still = this.online().some((s) => s.ws !== ws && s.a.id === a.id); // 被自己的新分頁換掉的不算離開
    if (!still) {
      this.sql.exec(`INSERT OR REPLACE INTO players (user_id, name, data, last_seen) VALUES (?, ?, ?, ?)`, a.id, a.name,
        JSON.stringify({ x: a.x, y: a.y, dir: a.dir, lastDay: this.farm.day, lastMoney: this.farm.money }), Date.now());
      this.broadcast({ t: 'leave', id: a.id }, a.id);
    }
    const left = this.online().filter((s) => s.ws !== ws);
    if (!left.length) { // 最後一個人走了：把時間記到現在，時鐘停下來
      const now = Date.now();
      this.farm.minute += Math.min(now - (this.farm.lastTick || now), TICK_MS * 3) * MIN_PER_MS; this.farm.lastTick = 0;
      this.flush(); this.saveFarm(); await this.ctx.storage.deleteAlarm();
    } else if (left.every((s) => s.a.asleep)) await this.newDay('sleep'); // 沒睡的那個離開了，剩下的人都睡了
  }
  webSocketError() {}
}
