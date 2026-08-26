// CIM 聊天伺服器 — 單一 Durable Object（SQLite 儲存 + WebSocket Hibernation）。
// Worker 會把所有 /api/* 與 /ws 請求轉送到名為 "main" 的唯一實例。
// 家庭／親友規模（數十人）用單一實例最簡單也最一致：所有資料與連線都在同一處，
// 不需要 D1、不需要設定任何密鑰，`wrangler deploy` 完即可使用。

const SESSION_TTL = 1000 * 60 * 60 * 24 * 60; // 60 天未使用即需重新登入
const UNSEND_WINDOW = 1000 * 60 * 60 * 24; // 送出後 24 小時內可收回
const MAX_TEXT = 4000;
const MAX_IMAGE = 700000; // data URL 長度上限（約 500KB 圖檔）
const MAX_AVATAR = 80000;
const MAX_STICKER = 20;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  avatar TEXT,
  avatar_color TEXT NOT NULL,
  status_message TEXT NOT NULL DEFAULT '',
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  name TEXT,
  dm_key TEXT UNIQUE,
  created_by INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS members (
  conversation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at INTEGER NOT NULL,
  last_read_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, id);
CREATE INDEX IF NOT EXISTS idx_members_user ON members (user_id);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`;

const AVATAR_COLORS = [
  '#F76C6C', '#F7906C', '#E8A93A', '#7BC24A', '#06C755',
  '#2BB3A3', '#4A9FF5', '#6C7CF7', '#9B6CF7', '#E56CC0',
];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randomHex = (bytes) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));

async function hashPassword(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return toHex(bits);
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const pubUser = (row) => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  statusMessage: row.status_message,
  avatar: row.avatar || null,
  avatarColor: row.avatar_color,
  isAdmin: !!row.is_admin,
  createdAt: row.created_at,
});

const pubMessage = (row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  type: row.type,
  content: row.deleted ? '' : row.content,
  createdAt: row.created_at,
  deleted: !!row.deleted,
});

export class ChatServer {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.loginGuard = new Map(); // username -> {fails, lockedUntil}（記憶體內、盡力而為）
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(SCHEMA);
    });
    // 心跳不喚醒 DO：客戶端送 "ping"，執行環境自動回 "pong"
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    let response;
    try {
      response = await this.route(request, new URL(request.url));
    } catch (e) {
      if (e instanceof HttpError) {
        response = json({ error: e.message }, e.status);
      } else {
        console.error('unhandled error:', e && (e.stack || e.message || e));
        response = json({ error: '伺服器發生錯誤，請稍後再試' }, 500);
      }
    }
    // workerd 要求 request body 被消耗；沒讀完就回應會拋出
    // "Can't read from request stream after response has been sent"
    if (request.body && !request.bodyUsed) {
      try { await request.body.cancel(); } catch {}
    }
    return response;
  }

  // ---------- 路由 ----------

  async route(request, url) {
    const { pathname } = url;
    const method = request.method;

    if (pathname === '/ws') return this.handleWs(request);

    // 公開端點
    if (method === 'GET' && pathname === '/api/app-info') return this.appInfo();
    if (method === 'POST' && pathname === '/api/register') return this.register(request);
    if (method === 'POST' && pathname === '/api/login') return this.login(request);

    // 其餘皆需登入
    const me = this.requireAuth(request);
    let m;

    if (method === 'POST' && pathname === '/api/logout') return this.logout(me);
    if (method === 'GET' && pathname === '/api/me') return json({ user: pubUser(me) });
    if (method === 'PATCH' && pathname === '/api/me') return this.updateMe(request, me);
    if (method === 'POST' && pathname === '/api/me/password') return this.changePassword(request, me);
    if (method === 'GET' && pathname === '/api/users') return this.listUsers();
    if (method === 'GET' && pathname === '/api/conversations') return this.listConversations(me);
    if (method === 'POST' && pathname === '/api/conversations') return this.createConversation(request, me);

    if ((m = pathname.match(/^\/api\/conversations\/(\d+)\/messages$/))) {
      if (method === 'GET') return this.listMessages(url, me, +m[1]);
      if (method === 'POST') return this.postMessage(request, me, +m[1]);
    }
    if ((m = pathname.match(/^\/api\/conversations\/(\d+)\/read$/)) && method === 'POST')
      return this.markRead(request, me, +m[1]);
    if ((m = pathname.match(/^\/api\/conversations\/(\d+)\/typing$/)) && method === 'POST')
      return this.typing(me, +m[1]);
    if ((m = pathname.match(/^\/api\/conversations\/(\d+)\/members$/)) && method === 'POST')
      return this.addMembers(request, me, +m[1]);
    if ((m = pathname.match(/^\/api\/conversations\/(\d+)\/leave$/)) && method === 'POST')
      return this.leaveGroup(me, +m[1]);
    if ((m = pathname.match(/^\/api\/conversations\/(\d+)$/)) && method === 'PATCH')
      return this.renameGroup(request, me, +m[1]);
    if ((m = pathname.match(/^\/api\/messages\/(\d+)\/unsend$/)) && method === 'POST')
      return this.unsend(me, +m[1]);

    if (pathname === '/api/admin/settings') {
      this.requireAdmin(me);
      if (method === 'GET') return json({ inviteCode: this.getSetting('invite_code') });
      if (method === 'PATCH') return this.updateAdminSettings(request);
    }
    if (method === 'GET' && pathname === '/api/admin/export') {
      this.requireAdmin(me);
      return this.exportData();
    }

    throw new HttpError(404, '找不到這個端點');
  }

  async readJson(request, maxBytes = 900000) {
    const text = await request.text();
    if (text.length > maxBytes) throw new HttpError(413, '傳送的內容太大');
    try {
      return JSON.parse(text || '{}');
    } catch {
      throw new HttpError(400, '請求格式錯誤');
    }
  }

  // ---------- 認證 ----------

  requireAuth(request) {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const user = this.userByToken(token);
    if (!user) throw new HttpError(401, '請重新登入');
    return user;
  }

  requireAdmin(me) {
    if (!me.is_admin) throw new HttpError(403, '需要管理員權限');
  }

  userByToken(token) {
    if (!token || token.length > 200) return null;
    const row = this.sql
      .exec(
        `SELECT u.*, s.token AS session_token, s.last_seen AS session_seen
         FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
        token)
      .toArray()[0];
    if (!row) return null;
    const now = Date.now();
    if (now - row.session_seen > SESSION_TTL) {
      this.sql.exec(`DELETE FROM sessions WHERE token = ?`, token);
      return null;
    }
    if (now - row.session_seen > 1000 * 60 * 60)
      this.sql.exec(`UPDATE sessions SET last_seen = ? WHERE token = ?`, now, token);
    return row;
  }

  createSession(userId) {
    const token = randomHex(32);
    const now = Date.now();
    this.sql.exec(
      `INSERT INTO sessions (token, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)`,
      token, userId, now, now);
    this.sql.exec(`DELETE FROM sessions WHERE last_seen < ?`, now - SESSION_TTL);
    return token;
  }

  getSetting(key) {
    const row = this.sql.exec(`SELECT value FROM settings WHERE key = ?`, key).toArray()[0];
    return row ? row.value : null;
  }

  setSetting(key, value) {
    if (value === null)
      this.sql.exec(`DELETE FROM settings WHERE key = ?`, key);
    else
      this.sql.exec(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, value);
  }

  userCount() {
    return this.sql.exec(`SELECT COUNT(*) AS c FROM users`).one().c;
  }

  appInfo() {
    const count = this.userCount();
    const inviteCode = this.getSetting('invite_code');
    return json({
      name: 'CIM',
      firstRun: count === 0,
      registrationOpen: count === 0 || !!inviteCode,
    });
  }

  async register(request) {
    const body = await this.readJson(request, 20000);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    let displayName = String(body.displayName || '').trim();

    if (!/^[a-z0-9_]{3,20}$/.test(username))
      throw new HttpError(400, '帳號需為 3–20 個小寫英文字母、數字或底線');
    if (password.length < 6 || password.length > 200)
      throw new HttpError(400, '密碼至少需要 6 個字元');
    if (!displayName) displayName = username;
    if ([...displayName].length > 30) throw new HttpError(400, '暱稱最長 30 個字');

    const count = this.userCount();
    if (count > 0) {
      const invite = this.getSetting('invite_code');
      if (!invite) throw new HttpError(403, '目前未開放註冊，請聯絡管理員');
      if (String(body.inviteCode || '').trim() !== invite)
        throw new HttpError(403, '邀請碼不正確');
    }
    if (this.sql.exec(`SELECT id FROM users WHERE username = ?`, username).toArray().length)
      throw new HttpError(409, '這個帳號已經有人使用了');

    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const now = Date.now();
    const row = this.sql
      .exec(
        `INSERT INTO users (username, display_name, password_hash, salt, avatar_color, is_admin, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        username, displayName, hash, salt, color, count === 0 ? 1 : 0, now)
      .one();

    // 新成員自動與管理員建立 1 對 1 聊天室，讓親友一進來就找得到你
    if (count > 0) {
      const admin = this.sql
        .exec(`SELECT id FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1`).toArray()[0];
      if (admin && admin.id !== row.id) {
        this.ensureDm(row.id, admin.id);
        this.sendToUsers([admin.id], { type: 'conversations-changed' });
      }
    }

    this.broadcastAll({ type: 'user', user: pubUser(row) });
    const token = this.createSession(row.id);
    return json({ token, user: pubUser(row) });
  }

  async login(request) {
    const body = await this.readJson(request, 20000);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const now = Date.now();

    const guard = this.loginGuard.get(username);
    if (guard && guard.lockedUntil > now)
      throw new HttpError(429, '嘗試次數過多，請 10 分鐘後再試');

    const row = this.sql.exec(`SELECT * FROM users WHERE username = ?`, username).toArray()[0];
    const hash = row ? await hashPassword(password, row.salt) : null;
    if (!row || !timingSafeEqual(hash, row.password_hash)) {
      const g = this.loginGuard.get(username) || { fails: 0, lockedUntil: 0 };
      g.fails += 1;
      if (g.fails >= 8) {
        g.lockedUntil = now + 1000 * 60 * 10;
        g.fails = 0;
      }
      this.loginGuard.set(username, g);
      throw new HttpError(401, '帳號或密碼錯誤');
    }
    this.loginGuard.delete(username);
    const token = this.createSession(row.id);
    return json({ token, user: pubUser(row) });
  }

  logout(me) {
    this.sql.exec(`DELETE FROM sessions WHERE token = ?`, me.session_token);
    return json({ ok: true });
  }

  async updateMe(request, me) {
    const body = await this.readJson(request, MAX_AVATAR + 20000);
    const sets = [];
    const args = [];

    if (body.displayName !== undefined) {
      const name = String(body.displayName).trim();
      if (!name || [...name].length > 30) throw new HttpError(400, '暱稱需為 1–30 個字');
      sets.push('display_name = ?');
      args.push(name);
    }
    if (body.statusMessage !== undefined) {
      const s = String(body.statusMessage).trim();
      if ([...s].length > 100) throw new HttpError(400, '狀態消息最長 100 個字');
      sets.push('status_message = ?');
      args.push(s);
    }
    if (body.avatar !== undefined) {
      if (body.avatar === null) {
        sets.push('avatar = NULL');
      } else {
        const a = String(body.avatar);
        if (!a.startsWith('data:image/') || a.length > MAX_AVATAR)
          throw new HttpError(400, '頭像圖片格式不符或太大');
        sets.push('avatar = ?');
        args.push(a);
      }
    }
    if (!sets.length) throw new HttpError(400, '沒有要更新的欄位');

    const row = this.sql
      .exec(`UPDATE users SET ${sets.join(', ')} WHERE id = ? RETURNING *`, ...args, me.id)
      .one();
    this.broadcastAll({ type: 'user', user: pubUser(row) });
    return json({ user: pubUser(row) });
  }

  async changePassword(request, me) {
    const body = await this.readJson(request, 20000);
    const oldHash = await hashPassword(String(body.oldPassword || ''), me.salt);
    if (!timingSafeEqual(oldHash, me.password_hash))
      throw new HttpError(403, '目前密碼不正確');
    const next = String(body.newPassword || '');
    if (next.length < 6 || next.length > 200)
      throw new HttpError(400, '新密碼至少需要 6 個字元');
    const salt = randomHex(16);
    const hash = await hashPassword(next, salt);
    this.sql.exec(`UPDATE users SET password_hash = ?, salt = ? WHERE id = ?`, hash, salt, me.id);
    // 密碼變更後，其他裝置的登入全部失效
    this.sql.exec(
      `DELETE FROM sessions WHERE user_id = ? AND token != ?`, me.id, me.session_token);
    return json({ ok: true });
  }

  listUsers() {
    const rows = this.sql.exec(`SELECT * FROM users ORDER BY created_at`).toArray();
    return json({ users: rows.map(pubUser) });
  }

  // ---------- 聊天室 ----------

  memberOf(conversationId, userId) {
    return this.sql
      .exec(
        `SELECT * FROM members WHERE conversation_id = ? AND user_id = ?`,
        conversationId, userId)
      .toArray()[0];
  }

  requireMember(conversationId, userId) {
    const conv = this.sql
      .exec(`SELECT * FROM conversations WHERE id = ?`, conversationId).toArray()[0];
    if (!conv || !this.memberOf(conversationId, userId))
      throw new HttpError(404, '找不到這個聊天室，或你不是它的成員');
    return conv;
  }

  memberIds(conversationId) {
    return this.sql
      .exec(`SELECT user_id FROM members WHERE conversation_id = ?`, conversationId)
      .toArray()
      .map((r) => r.user_id);
  }

  convFor(conv, userId) {
    const members = this.sql
      .exec(
        `SELECT user_id, last_read_id FROM members WHERE conversation_id = ?`, conv.id)
      .toArray()
      .map((r) => ({ userId: r.user_id, lastReadId: r.last_read_id }));
    const last = this.sql
      .exec(
        `SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1`, conv.id)
      .toArray()[0];
    const mine = members.find((x) => x.userId === userId);
    const unread = mine
      ? this.sql
          .exec(
            `SELECT COUNT(*) AS c FROM messages
             WHERE conversation_id = ? AND id > ? AND sender_id != ?`,
            conv.id, mine.lastReadId, userId)
          .one().c
      : 0;
    return {
      id: conv.id,
      type: conv.type,
      name: conv.name,
      createdBy: conv.created_by,
      createdAt: conv.created_at,
      members,
      lastMessage: last ? pubMessage(last) : null,
      lastActivity: last ? last.created_at : conv.created_at,
      unread,
    };
  }

  listConversations(me) {
    const rows = this.sql
      .exec(
        `SELECT c.* FROM conversations c
         JOIN members m ON m.conversation_id = c.id WHERE m.user_id = ?`, me.id)
      .toArray();
    const list = rows.map((c) => this.convFor(c, me.id));
    list.sort((a, b) => b.lastActivity - a.lastActivity);
    return json({ conversations: list });
  }

  ensureDm(a, b) {
    const key = `dm:${Math.min(a, b)}:${Math.max(a, b)}`;
    const existing = this.sql
      .exec(`SELECT * FROM conversations WHERE dm_key = ?`, key).toArray()[0];
    if (existing) return existing;
    const now = Date.now();
    return this.ctx.storage.transactionSync(() => {
      const conv = this.sql
        .exec(
          `INSERT INTO conversations (type, dm_key, created_by, created_at)
           VALUES ('dm', ?, ?, ?) RETURNING *`, key, a, now)
        .one();
      for (const uid of new Set([a, b]))
        this.sql.exec(
          `INSERT INTO members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`,
          conv.id, uid, now);
      return conv;
    });
  }

  async createConversation(request, me) {
    const body = await this.readJson(request, 20000);

    if (body.type === 'dm') {
      const otherId = Number(body.userId);
      const other = this.sql.exec(`SELECT id FROM users WHERE id = ?`, otherId).toArray()[0];
      if (!other) throw new HttpError(404, '找不到這位使用者');
      const conv = this.ensureDm(me.id, otherId);
      if (otherId !== me.id) this.sendToUsers([otherId], { type: 'conversations-changed' });
      return json({ conversation: this.convFor(conv, me.id) });
    }

    if (body.type === 'group') {
      let name = String(body.name || '').trim();
      if (!name) name = '未命名群組';
      if ([...name].length > 30) throw new HttpError(400, '群組名稱最長 30 個字');
      const ids = new Set(
        (Array.isArray(body.memberIds) ? body.memberIds : []).map(Number).filter(Number.isInteger));
      ids.add(me.id);
      if (ids.size < 2) throw new HttpError(400, '請至少選擇一位成員');
      for (const uid of ids)
        if (!this.sql.exec(`SELECT id FROM users WHERE id = ?`, uid).toArray().length)
          throw new HttpError(404, '有成員不存在，請重新整理後再試');

      const now = Date.now();
      const conv = this.ctx.storage.transactionSync(() => {
        const c = this.sql
          .exec(
            `INSERT INTO conversations (type, name, created_by, created_at)
             VALUES ('group', ?, ?, ?) RETURNING *`, name, me.id, now)
          .one();
        for (const uid of ids)
          this.sql.exec(
            `INSERT INTO members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`,
            c.id, uid, now);
        return c;
      });
      this.addSystemMessage(conv.id, `${me.display_name} 建立了群組「${name}」`);
      this.sendToUsers([...ids], { type: 'conversations-changed' });
      return json({ conversation: this.convFor(conv, me.id) });
    }

    throw new HttpError(400, '不支援的聊天室類型');
  }

  listMessages(url, me, conversationId) {
    const conv = this.requireMember(conversationId, me.id);
    const before = Number(url.searchParams.get('before')) || null;
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);
    const rows = before
      ? this.sql
          .exec(
            `SELECT * FROM messages WHERE conversation_id = ? AND id < ?
             ORDER BY id DESC LIMIT ?`, conversationId, before, limit + 1)
          .toArray()
      : this.sql
          .exec(
            `SELECT * FROM messages WHERE conversation_id = ?
             ORDER BY id DESC LIMIT ?`, conversationId, limit + 1)
          .toArray();
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    rows.reverse();
    const members = this.sql
      .exec(`SELECT user_id, last_read_id FROM members WHERE conversation_id = ?`, conversationId)
      .toArray()
      .map((r) => ({ userId: r.user_id, lastReadId: r.last_read_id }));
    return json({
      conversation: { id: conv.id, type: conv.type, name: conv.name },
      messages: rows.map(pubMessage),
      members,
      hasMore,
    });
  }

  async postMessage(request, me, conversationId) {
    this.requireMember(conversationId, me.id);
    const body = await this.readJson(request);
    const type = String(body.type || 'text');
    let content = String(body.content || '');

    if (type === 'text') {
      content = content.replace(/\r\n/g, '\n');
      if (!content.trim()) throw new HttpError(400, '訊息不能是空的');
      if (content.length > MAX_TEXT) throw new HttpError(400, '訊息太長了（上限 4000 字）');
    } else if (type === 'image') {
      if (!content.startsWith('data:image/') || content.length > MAX_IMAGE)
        throw new HttpError(400, '圖片格式不符或太大');
    } else if (type === 'sticker') {
      if (!content.trim() || content.length > MAX_STICKER)
        throw new HttpError(400, '貼圖格式不符');
    } else {
      throw new HttpError(400, '不支援的訊息類型');
    }

    const row = this.sql
      .exec(
        `INSERT INTO messages (conversation_id, sender_id, type, content, created_at)
         VALUES (?, ?, ?, ?, ?) RETURNING *`,
        conversationId, me.id, type, content, Date.now())
      .one();
    // 自己送出的訊息視同已讀
    this.sql.exec(
      `UPDATE members SET last_read_id = MAX(last_read_id, ?)
       WHERE conversation_id = ? AND user_id = ?`, row.id, conversationId, me.id);

    const message = pubMessage(row);
    this.sendToUsers(this.memberIds(conversationId), { type: 'message', message });
    return json({ message });
  }

  addSystemMessage(conversationId, text) {
    const row = this.sql
      .exec(
        `INSERT INTO messages (conversation_id, sender_id, type, content, created_at)
         VALUES (?, 0, 'system', ?, ?) RETURNING *`,
        conversationId, text, Date.now())
      .one();
    this.sendToUsers(this.memberIds(conversationId), { type: 'message', message: pubMessage(row) });
  }

  async markRead(request, me, conversationId) {
    this.requireMember(conversationId, me.id);
    const body = await this.readJson(request, 10000);
    const lastId = Number(body.lastMessageId);
    if (!Number.isInteger(lastId) || lastId <= 0) throw new HttpError(400, '參數錯誤');
    const row = this.sql
      .exec(
        `UPDATE members SET last_read_id = MAX(last_read_id, ?)
         WHERE conversation_id = ? AND user_id = ? RETURNING last_read_id`,
        lastId, conversationId, me.id)
      .one();
    this.sendToUsers(this.memberIds(conversationId), {
      type: 'read',
      conversationId,
      userId: me.id,
      lastReadId: row.last_read_id,
    });
    return json({ ok: true });
  }

  typing(me, conversationId) {
    this.requireMember(conversationId, me.id);
    const others = this.memberIds(conversationId).filter((id) => id !== me.id);
    this.sendToUsers(others, {
      type: 'typing',
      conversationId,
      userId: me.id,
      displayName: me.display_name,
    });
    return json({ ok: true });
  }

  async addMembers(request, me, conversationId) {
    const conv = this.requireMember(conversationId, me.id);
    if (conv.type !== 'group') throw new HttpError(400, '只有群組可以加入成員');
    const body = await this.readJson(request, 20000);
    const ids = (Array.isArray(body.userIds) ? body.userIds : [])
      .map(Number)
      .filter(Number.isInteger);
    const now = Date.now();
    const added = [];
    for (const uid of new Set(ids)) {
      const user = this.sql.exec(`SELECT * FROM users WHERE id = ?`, uid).toArray()[0];
      if (!user || this.memberOf(conversationId, uid)) continue;
      this.sql.exec(
        `INSERT INTO members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`,
        conversationId, uid, now);
      added.push(user);
    }
    if (added.length) {
      const names = added.map((u) => u.display_name).join('、');
      this.addSystemMessage(conversationId, `${me.display_name} 邀請 ${names} 加入群組`);
      this.sendToUsers(this.memberIds(conversationId), { type: 'conversations-changed' });
    }
    return json({ ok: true, added: added.map((u) => u.id) });
  }

  leaveGroup(me, conversationId) {
    const conv = this.requireMember(conversationId, me.id);
    if (conv.type !== 'group') throw new HttpError(400, '無法離開 1 對 1 聊天室');
    this.sql.exec(
      `DELETE FROM members WHERE conversation_id = ? AND user_id = ?`, conversationId, me.id);
    const remaining = this.memberIds(conversationId);
    if (remaining.length === 0) {
      this.sql.exec(`DELETE FROM messages WHERE conversation_id = ?`, conversationId);
      this.sql.exec(`DELETE FROM conversations WHERE id = ?`, conversationId);
    } else {
      this.addSystemMessage(conversationId, `${me.display_name} 離開了群組`);
      this.sendToUsers(remaining, { type: 'conversations-changed' });
    }
    this.sendToUsers([me.id], { type: 'conversations-changed' });
    return json({ ok: true });
  }

  async renameGroup(request, me, conversationId) {
    const conv = this.requireMember(conversationId, me.id);
    if (conv.type !== 'group') throw new HttpError(400, '只有群組可以改名稱');
    const body = await this.readJson(request, 10000);
    const name = String(body.name || '').trim();
    if (!name || [...name].length > 30) throw new HttpError(400, '群組名稱需為 1–30 個字');
    this.sql.exec(`UPDATE conversations SET name = ? WHERE id = ?`, name, conversationId);
    this.addSystemMessage(conversationId, `${me.display_name} 將群組名稱改為「${name}」`);
    this.sendToUsers(this.memberIds(conversationId), { type: 'conversations-changed' });
    return json({ ok: true });
  }

  unsend(me, messageId) {
    const row = this.sql.exec(`SELECT * FROM messages WHERE id = ?`, messageId).toArray()[0];
    if (!row || row.deleted) throw new HttpError(404, '找不到這則訊息');
    this.requireMember(row.conversation_id, me.id);
    if (row.sender_id !== me.id) throw new HttpError(403, '只能收回自己的訊息');
    if (Date.now() - row.created_at > UNSEND_WINDOW)
      throw new HttpError(403, '已超過 24 小時，無法收回');
    this.sql.exec(
      `UPDATE messages SET deleted = 1, content = '' WHERE id = ?`, messageId);
    this.sendToUsers(this.memberIds(row.conversation_id), {
      type: 'unsend',
      conversationId: row.conversation_id,
      messageId,
    });
    return json({ ok: true });
  }

  // ---------- 管理員 ----------

  async updateAdminSettings(request) {
    const body = await this.readJson(request, 10000);
    if (body.inviteCode !== undefined) {
      const code = String(body.inviteCode || '').trim();
      if (code.length > 50) throw new HttpError(400, '邀請碼最長 50 個字');
      this.setSetting('invite_code', code || null);
    }
    return json({ inviteCode: this.getSetting('invite_code') });
  }

  exportData() {
    const users = this.sql
      .exec(`SELECT id, username, display_name, status_message, avatar_color, is_admin, created_at FROM users`)
      .toArray();
    const conversations = this.sql.exec(`SELECT * FROM conversations`).toArray();
    const members = this.sql.exec(`SELECT * FROM members`).toArray();
    const messages = this.sql.exec(`SELECT * FROM messages`).toArray();
    return json({ exportedAt: Date.now(), users, conversations, members, messages });
  }

  // ---------- WebSocket ----------

  handleWs(request) {
    if (request.headers.get('Upgrade') !== 'websocket')
      throw new HttpError(426, '需要 WebSocket 連線');
    // 瀏覽器無法為 WebSocket 加自訂 header，token 改放在子協定欄位
    const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '')
      .split(',')
      .map((s) => s.trim());
    const tokenPart = protocols.find((p) => p.startsWith('token.'));
    const user = this.userByToken(tokenPart ? tokenPart.slice(6) : null);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [`u:${user.id}`]);
    server.serializeAttachment({ userId: user.id });

    const headers = {};
    if (protocols.includes('cim.v1')) headers['Sec-WebSocket-Protocol'] = 'cim.v1';
    return new Response(null, { status: 101, webSocket: client, headers });
  }

  webSocketMessage() {
    // 客戶端到伺服器一律走 HTTP API；"ping" 由 auto-response 處理，其餘忽略
  }

  webSocketClose(ws) {
    // 客戶端發起關閉時，伺服器須回應 close 以完成握手，
    // 否則客戶端會永遠卡在 CLOSING 狀態
    try {
      ws.close(1000);
    } catch {}
  }

  webSocketError() {}

  sendToUsers(userIds, event) {
    const str = JSON.stringify(event);
    for (const uid of new Set(userIds)) {
      for (const ws of this.ctx.getWebSockets(`u:${uid}`)) {
        try {
          ws.send(str);
        } catch {}
      }
    }
  }

  broadcastAll(event) {
    const str = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(str);
      } catch {}
    }
  }
}
