// CIM 聊天伺服器 — 單一 Durable Object（SQLite 儲存 + WebSocket Hibernation）。
// Worker 會把所有 /api/* 與 /ws 請求轉送到名為 "main" 的唯一實例。
// 家庭／親友規模（數十人）用單一實例最簡單也最一致：所有資料與連線都在同一處，
// 不需要 D1、不需要設定任何密鑰，`wrangler deploy` 完即可使用。

const SESSION_TTL = 1000 * 60 * 60 * 24 * 60; // 60 天未使用即需重新登入
const UNSEND_WINDOW = 1000 * 60 * 60 * 24; // 送出後 24 小時內可收回
const MAX_TEXT = 4000;
const MAX_IMAGE = 700000; // data URL 長度上限（約 500KB 圖檔）
const MAX_GIF = 1900000; // GIF 原檔直傳以保留動畫，上限約 1.4MB 檔案
const MAX_AVATAR = 80000;
const MAX_STICKER = 20;
const MAX_AUDIO = 900000; // 語音 data URL 上限（約 60 秒 opus）
const MAX_REACTION = 16;
const MAX_STICKER_IMG = 90000; // 自訂貼圖 data URL 上限（約 65KB 圖檔）
const MAX_STICKERS = 100;
const MAX_WALLPAPER = 450000; // 聊天室背景 data URL 上限（約 330KB 圖檔）
const LINK_FETCH_BYTES = 262144; // 連結預覽最多讀 256KB HTML
const LINK_IMAGE_BYTES = 3000000; // 連結預覽縮圖代理上限（約 3MB）
const PUSH_THROTTLE = 60000; // 每人離線推播最小間隔

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

// v2：表情回應、回覆、投票、公告、離線推播、購物清單、行事曆、停用帳號
const SCHEMA_V2 = `
ALTER TABLE messages ADD COLUMN reply_to INTEGER;
ALTER TABLE messages ADD COLUMN meta TEXT;
ALTER TABLE conversations ADD COLUMN pinned_message_id INTEGER;
ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS reactions (
  message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_msg ON reactions (message_id);
CREATE TABLE IF NOT EXISTS poll_votes (
  message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  opt INTEGER NOT NULL,
  PRIMARY KEY (message_id, user_id)
);
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  sub TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subs (user_id);
CREATE TABLE IF NOT EXISTS shopping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  done_by INTEGER,
  done_at INTEGER
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  note TEXT NOT NULL DEFAULT '',
  remind_at INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  reminded INTEGER NOT NULL DEFAULT 0
);
`;

// 日系低彩度頭像色盤（柿、芥子、抹茶、青磁、藍鼠…）
const AVATAR_COLORS = [
  '#C97E6C', '#C9A46C', '#A8B078', '#7FA88B', '#5E9C6B',
  '#6C9FA8', '#7C8BB0', '#9B85AD', '#B07C93', '#8D8578',
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
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randomHex = (bytes) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));

const PBKDF2_ITERS = 100000; // Cloudflare Workers 正式環境的 PBKDF2 迭代上限

async function hashPassword(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERS }, key, 256);
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
  disabled: !!row.disabled,
  createdAt: row.created_at,
});

// v3：聊天室置頂、聊天室背景、群組頭像、自訂貼圖
const SCHEMA_V3 = `
ALTER TABLE members ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN wallpaper TEXT;
ALTER TABLE conversations ADD COLUMN avatar TEXT;
CREATE TABLE IF NOT EXISTS stickers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  added_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
`;

// v4：好友隱私制（親友互相看不見，需自行加好友）
const SCHEMA_V4 = `
CREATE TABLE IF NOT EXISTS contacts (
  owner_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, friend_id)
);
`;

// 訊息中的網址：http(s):// 或 www. 開頭，遇到空白、引號或中文標點即結束
// （與前端 public/app.js 的 URL_RE / trimUrlTail 保持一致）
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'`\u3000、，。！？：；（）「」『』【】《》〈〉…]+/i;

// 去掉黏在網址尾端的英文標點（句號、逗號、右括號…）；
// 成對括號內的右括號保留，例如維基百科的 /wiki/Foo_(bar)
function trimUrlTail(u) {
  for (;;) {
    const last = u[u.length - 1];
    if (!last) return u;
    if ('.,;:!?\'"'.includes(last)) { u = u.slice(0, -1); continue; }
    const open = { ')': '(', ']': '[', '}': '{' }[last];
    if (open && u.split(open).length < u.split(last).length) { u = u.slice(0, -1); continue; }
    return u;
  }
}

// www. 開頭的網址補上 https://
function normalizeUrl(raw) {
  const u = trimUrlTail(raw);
  return /^https?:\/\//i.test(u) ? u : 'https://' + u;
}

// 可安全由伺服器抓取的網址（只允許 http/https；擋 IP、無點主機名、帳密夾帶、內網名稱）
function safeRemoteUrl(str) {
  try {
    const u = new URL(str);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    const host = u.hostname;
    if (!host.includes('.') || /^[\d.]+$/.test(host) || /^\[/.test(host) ||
        /\.(local|localhost|internal|lan|home|arpa)$/i.test(host))
      return null;
    return u.href;
  } catch { return null; }
}

// 訊息中第一個可抓取預覽的網址
function firstHttpUrl(text) {
  const m = String(text).match(URL_RE);
  return m ? safeRemoteUrl(normalizeUrl(m[0])) : null;
}

// 帶逾時的 fetch：外站沒回應時不拖住 Durable Object
async function fetchWithTimeout(url, ms, init) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally { clearTimeout(timer); }
}

// 最多讀取 max 位元組後就取消串流（不把整個大檔載入記憶體）
async function readCapped(body, max) {
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  try { await reader.cancel(); } catch {}
  const out = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

function htmlDecode(str) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (x, k) => {
    if (k[0] === '#') {
      const code = k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : x;
    }
    return named[k.toLowerCase()] ?? x;
  });
}

function ogTag(html, prop) {
  const re = new RegExp(`<meta\\s[^>]*?(?:property|name)\\s*=\\s*["']?${prop.replace(/[.:]/g, '\\$&')}["'\\s][^>]*>`, 'gi');
  let m;
  while ((m = re.exec(html))) {
    const c = m[0].match(/content\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
    const v = c && (c[1] ?? c[2] ?? c[3]);
    if (v && v.trim()) return htmlDecode(v).trim();
  }
  return null;
}

// 依序嘗試多個 meta 名稱，回傳第一個有值的
function metaOf(html, names) {
  for (const n of names) {
    const v = ogTag(html, n);
    if (v) return v;
  }
  return null;
}

// 從 content-type 或 HTML <meta charset> 取得編碼；Workers 的 TextDecoder 支援 big5/gbk 等
function pickCharset(ctype, headBytes) {
  const fromHeader = ctype.match(/charset=["']?([\w-]+)/i);
  if (fromHeader) return fromHeader[1];
  const ascii = new TextDecoder('latin1').decode(headBytes.subarray(0, 4096));
  const fromMeta = ascii.match(/<meta[^>]+charset=["']?([\w-]+)/i);
  return fromMeta ? fromMeta[1] : 'utf-8';
}

// 將 base64url 字串解回位元組；格式不合回傳 null
function fromB64url(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch { return null; }
}

const pubMessage = (row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  type: row.type,
  content: row.deleted ? '' : row.content,
  createdAt: row.created_at,
  deleted: !!row.deleted,
  replyTo: row.reply_to || null,
  meta: row.deleted || !row.meta ? null : JSON.parse(row.meta),
});

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

// 各訊息類型在清單與引用中的簡短預覽
function previewOf(row) {
  if (row.deleted) return '已收回訊息';
  if (row.type === 'image') return '[圖片]';
  if (row.type === 'sticker')
    return row.content.startsWith('sid:') ? '[貼圖]' : '[貼圖] ' + row.content;
  if (row.type === 'audio') return '[語音訊息]';
  if (row.type === 'poll') {
    try { return '[投票] ' + JSON.parse(row.content).q; } catch { return '[投票]'; }
  }
  return String(row.content).slice(0, 60);
}

export { firstHttpUrl, trimUrlTail, normalizeUrl, safeRemoteUrl, ogTag, metaOf, pickCharset, fromB64url };

export class ChatServer {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.loginGuard = new Map(); // username -> {fails, lockedUntil}（記憶體內、盡力而為）
    this.registerGuard = new Map(); // ip -> {fails, lockedUntil}：防邀請碼暴力猜測
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(SCHEMA);
      const v = Number(this.getSetting('schema_version') || 1);
      if (v < 2) {
        this.sql.exec(SCHEMA_V2);
        this.setSetting('schema_version', '2');
      }
      if (v < 3) {
        this.sql.exec(SCHEMA_V3);
        this.setSetting('schema_version', '3');
      }
      if (v < 4) {
        this.sql.exec(SCHEMA_V4);
        this.setSetting('schema_version', '4');
      }
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
    // "Can't read from request stream after response has been sent"。
    // 用 arrayBuffer() 實際讀完，讓 Worker→DO 代理兩端的串流都被吸乾
    if (request.body && !request.bodyUsed) {
      try { await request.arrayBuffer(); } catch {}
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
    if (method === 'GET' && pathname === '/api/link-image') return this.serveLinkImage(request, url);
    if (method === 'POST' && pathname === '/api/register') return this.register(request);
    if (method === 'POST' && pathname === '/api/login') return this.login(request);

    // 其餘皆需登入
    const me = this.requireAuth(request);
    let m;

    if (method === 'POST' && pathname === '/api/logout') return this.logout(me);
    if (method === 'GET' && pathname === '/api/me') return json({ user: pubUser(me) });
    if (method === 'PATCH' && pathname === '/api/me') return this.updateMe(request, me);
    if (method === 'POST' && pathname === '/api/me/password') return this.changePassword(request, me);
    if (method === 'GET' && pathname === '/api/users') return this.listUsers(me);
    if (method === 'GET' && pathname === '/api/conversations') return this.listConversations(me);
    if (method === 'POST' && pathname === '/api/conversations') return this.createConversation(request, me);
    if (method === 'GET' && pathname === '/api/search') return this.search(url, me);

    if (method === 'GET' && pathname === '/api/push/key') return this.pushKey();
    if (method === 'POST' && pathname === '/api/push/subscribe') return this.pushSubscribe(request, me);
    if (method === 'POST' && pathname === '/api/push/unsubscribe') return this.pushUnsubscribe(request, me);

    if (pathname === '/api/shopping') {
      if (method === 'GET') return this.listShopping();
      if (method === 'POST') return this.addShopping(request, me);
    }
    if ((m = pathname.match(/^\/api\/shopping\/(\d+)$/))) {
      if (method === 'PATCH') return this.toggleShopping(request, me, +m[1]);
      if (method === 'DELETE') return this.deleteShopping(me, +m[1]);
    }
    if (pathname === '/api/events') {
      if (method === 'GET') return this.listEvents();
      if (method === 'POST') return this.addEvent(request, me);
    }
    if ((m = pathname.match(/^\/api\/events\/(\d+)$/)) && method === 'DELETE')
      return this.deleteEvent(me, +m[1]);

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
    if ((m = pathname.match(/^\/api\/conversations\/(\d+)\/prefs$/)) && method === 'PATCH')
      return this.updateConvPrefs(request, me, +m[1]);
    if (pathname === '/api/stickers') {
      if (method === 'GET') return this.listStickers();
      if (method === 'POST') return this.addSticker(request, me);
    }
    if ((m = pathname.match(/^\/api\/stickers\/(\d+)$/)) && method === 'DELETE')
      return this.deleteSticker(me, +m[1]);
    if ((m = pathname.match(/^\/api\/messages\/(\d+)\/unsend$/)) && method === 'POST')
      return this.unsend(me, +m[1]);
    if ((m = pathname.match(/^\/api\/messages\/(\d+)\/react$/)) && method === 'POST')
      return this.react(request, me, +m[1]);
    if ((m = pathname.match(/^\/api\/messages\/(\d+)\/vote$/)) && method === 'POST')
      return this.vote(request, me, +m[1]);
    if ((m = pathname.match(/^\/api\/conversations\/(\d+)\/pin$/)) && method === 'POST')
      return this.pinMessage(request, me, +m[1]);
    if ((m = pathname.match(/^\/api\/admin\/users\/(\d+)$/)) && method === 'DELETE') {
      this.requireAdmin(me);
      return this.removeUser(me, +m[1]);
    }
    if ((m = pathname.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/)) && method === 'POST') {
      this.requireAdmin(me);
      return this.resetPassword(+m[1]);
    }

    if (pathname === '/api/admin/settings') {
      this.requireAdmin(me);
      if (method === 'GET')
        return json({ inviteCode: this.getSetting('invite_code'), privacyContacts: this.privacyOn() });
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
    if (!row || row.disabled) return null;
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
      name: 'CHAT',
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
      const ip = request.headers.get('CF-Connecting-IP') || 'local';
      const guard = this.registerGuard.get(ip);
      if (guard && guard.lockedUntil > Date.now())
        throw new HttpError(429, '嘗試次數過多，請 15 分鐘後再試');
      const invite = this.getSetting('invite_code');
      if (!invite) throw new HttpError(403, '目前未開放註冊，請聯絡管理員');
      if (String(body.inviteCode || '').trim() !== invite) {
        const g = this.registerGuard.get(ip) || { fails: 0, lockedUntil: 0 };
        g.fails += 1;
        if (g.fails >= 5) {
          g.lockedUntil = Date.now() + 1000 * 60 * 15;
          g.fails = 0;
        }
        this.registerGuard.set(ip, g);
        throw new HttpError(403, '邀請碼不正確');
      }
      this.registerGuard.delete(ip);
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

    this.sendToUsers(this.audienceOf(row), { type: 'user', user: pubUser(row) });
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
    if (row.disabled) throw new HttpError(403, '這個帳號已被管理員停用');
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
    this.sendToUsers(this.audienceOf(row), { type: 'user', user: pubUser(row) });
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

  // ---------- 成員可見性 ----------
  // 規則：管理員看得到所有人；一般成員只看得到「管理員」與「跟自己同一個聊天室的人」。
  // 親友之間若沒被管理員拉進同一個群組，彼此完全看不到對方的帳號。

  adminIds() {
    return this.sql.exec(`SELECT id FROM users WHERE is_admin = 1`).toArray().map((r) => r.id);
  }

  // 與 userId 同在任一聊天室的其他成員 id
  coMemberIds(userId) {
    return this.sql
      .exec(
        `SELECT DISTINCT m2.user_id AS id FROM members m1
         JOIN members m2 ON m2.conversation_id = m1.conversation_id
         WHERE m1.user_id = ? AND m2.user_id != ?`, userId, userId)
      .toArray()
      .map((r) => r.id);
  }

  // me 看得到的使用者 id 集合；管理員回傳 null 代表「全部」
  // 管理員設定「好友名單隱私」：開啟（預設）時親友只看得到管理員與同群組成員；關閉則全部互相可見
  privacyOn() {
    return this.getSetting('privacy_contacts') !== '0';
  }

  // me 看得見哪些使用者；null 代表全部
  visibleUserIds(me) {
    if (me.is_admin || !this.privacyOn()) return null;
    return new Set([me.id, ...this.adminIds(), ...this.coMemberIds(me.id)]);
  }

  canSee(me, userId) {
    if (me.is_admin || userId === me.id) return true;
    const visible = this.visibleUserIds(me);
    return !visible || visible.has(userId);
  }

  // 哪些人看得到 userRow（決定 'user' 即時事件要推播給誰）
  audienceOf(userRow) {
    if (userRow.is_admin || !this.privacyOn())
      return this.sql.exec(`SELECT id FROM users`).toArray().map((r) => r.id);
    return [...new Set([userRow.id, ...this.adminIds(), ...this.coMemberIds(userRow.id)])];
  }

  // id → 暱稱（購物清單／行事曆為全家共用，建立者可能不在對方的可見名單內，所以直接附上名字）
  userNames() {
    const map = new Map();
    for (const r of this.sql.exec(`SELECT id, display_name FROM users`).toArray())
      map.set(r.id, r.display_name);
    return map;
  }

  listUsers(me) {
    const rows = this.sql.exec(`SELECT * FROM users ORDER BY created_at`).toArray();
    const visible = this.visibleUserIds(me);
    const list = visible ? rows.filter((r) => visible.has(r.id)) : rows;
    return json({ users: list.map(pubUser) });
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
    const memberRows = this.sql
      .exec(
        `SELECT user_id, last_read_id, pinned, wallpaper FROM members WHERE conversation_id = ?`,
        conv.id)
      .toArray();
    const members = memberRows.map((r) => ({ userId: r.user_id, lastReadId: r.last_read_id }));
    const mineRow = memberRows.find((r) => r.user_id === userId);
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
      pinnedMessageId: conv.pinned_message_id || null,
      avatar: conv.avatar || null,
      pinnedChat: mineRow ? !!mineRow.pinned : false,
      wallpaper: (mineRow && mineRow.wallpaper) || null,
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
    list.sort((a, b) => (b.pinnedChat - a.pinnedChat) || (b.lastActivity - a.lastActivity));
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
      if (!this.canSee(me, otherId)) throw new HttpError(403, '你無法與這位使用者建立聊天室');
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
      for (const uid of ids) {
        if (!this.sql.exec(`SELECT id FROM users WHERE id = ?`, uid).toArray().length)
          throw new HttpError(404, '有成員不存在，請重新整理後再試');
        if (!this.canSee(me, uid)) throw new HttpError(403, '只能邀請你看得到的成員加入群組');
      }

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
      this.sendToUsers([...ids], { type: 'users-changed' });
      return json({ conversation: this.convFor(conv, me.id) });
    }

    throw new HttpError(400, '不支援的聊天室類型');
  }

  listMessages(url, me, conversationId) {
    const conv = this.requireMember(conversationId, me.id);
    const before = Number(url.searchParams.get('before')) || null;
    const around = Number(url.searchParams.get('around')) || null;
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);
    let rows;
    let hasMore = false;
    let hasNewer = false;
    if (around) {
      const older = this.sql
        .exec(
          `SELECT * FROM messages WHERE conversation_id = ? AND id <= ?
           ORDER BY id DESC LIMIT ?`, conversationId, around, 26)
        .toArray();
      hasMore = older.length > 25;
      if (hasMore) older.pop();
      older.reverse();
      const newer = this.sql
        .exec(
          `SELECT * FROM messages WHERE conversation_id = ? AND id > ?
           ORDER BY id ASC LIMIT ?`, conversationId, around, 26)
        .toArray();
      hasNewer = newer.length > 25;
      if (hasNewer) newer.pop();
      rows = [...older, ...newer];
    } else if (before) {
      rows = this.sql
        .exec(
          `SELECT * FROM messages WHERE conversation_id = ? AND id < ?
           ORDER BY id DESC LIMIT ?`, conversationId, before, limit + 1)
        .toArray();
      hasMore = rows.length > limit;
      if (hasMore) rows.pop();
      rows.reverse();
    } else {
      rows = this.sql
        .exec(
          `SELECT * FROM messages WHERE conversation_id = ?
           ORDER BY id DESC LIMIT ?`, conversationId, limit + 1)
        .toArray();
      hasMore = rows.length > limit;
      if (hasMore) rows.pop();
      rows.reverse();
    }
    const members = this.sql
      .exec(`SELECT user_id, last_read_id FROM members WHERE conversation_id = ?`, conversationId)
      .toArray()
      .map((r) => ({ userId: r.user_id, lastReadId: r.last_read_id }));
    let pinned = null;
    if (conv.pinned_message_id) {
      const p = this.sql
        .exec(`SELECT * FROM messages WHERE id = ?`, conv.pinned_message_id).toArray()[0];
      if (p && !p.deleted) pinned = pubMessage(p);
    }
    return json({
      conversation: {
        id: conv.id, type: conv.type, name: conv.name,
        pinnedMessageId: conv.pinned_message_id || null,
      },
      messages: this.attachExtras(rows.map(pubMessage)),
      members,
      hasMore,
      hasNewer,
      pinned,
    });
  }

  // 一次補上訊息的表情回應與投票資料
  attachExtras(messages) {
    if (!messages.length) return messages;
    const ids = messages.map((m) => m.id);
    const ph = ids.map(() => '?').join(',');
    const reactions = this.sql
      .exec(`SELECT * FROM reactions WHERE message_id IN (${ph}) ORDER BY created_at`, ...ids)
      .toArray();
    const votes = this.sql
      .exec(`SELECT * FROM poll_votes WHERE message_id IN (${ph})`, ...ids)
      .toArray();
    for (const m of messages) {
      const mine = reactions.filter((r) => r.message_id === m.id);
      const byEmoji = new Map();
      for (const r of mine) {
        if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
        byEmoji.get(r.emoji).push(r.user_id);
      }
      m.reactions = [...byEmoji.entries()].map(([emoji, users]) => ({ emoji, users }));
      if (m.type === 'poll')
        m.votes = votes.filter((v) => v.message_id === m.id).map((v) => ({ userId: v.user_id, opt: v.opt }));
    }
    return messages;
  }

  reactionsOf(messageId) {
    const rows = this.sql
      .exec(`SELECT * FROM reactions WHERE message_id = ? ORDER BY created_at`, messageId)
      .toArray();
    const byEmoji = new Map();
    for (const r of rows) {
      if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
      byEmoji.get(r.emoji).push(r.user_id);
    }
    return [...byEmoji.entries()].map(([emoji, users]) => ({ emoji, users }));
  }

  votesOf(messageId) {
    return this.sql
      .exec(`SELECT * FROM poll_votes WHERE message_id = ?`, messageId)
      .toArray()
      .map((v) => ({ userId: v.user_id, opt: v.opt }));
  }

  async postMessage(request, me, conversationId) {
    this.requireMember(conversationId, me.id);
    const body = await this.readJson(request, MAX_GIF + 100000);
    const type = String(body.type || 'text');
    let content = String(body.content || '');
    const meta = {};

    if (type === 'text') {
      content = content.replace(/\r\n/g, '\n');
      if (!content.trim()) throw new HttpError(400, '訊息不能是空的');
      if (content.length > MAX_TEXT) throw new HttpError(400, '訊息太長了（上限 4000 字）');
    } else if (type === 'image') {
      const isGif = content.startsWith('data:image/gif');
      const cap = isGif ? MAX_GIF : MAX_IMAGE;
      if (!content.startsWith('data:image/') || content.length > cap)
        throw new HttpError(400, isGif ? 'GIF 檔太大（上限約 1.4MB），請選小一點的' : '圖片格式不符或太大');
    } else if (type === 'sticker') {
      if (content.startsWith('sid:')) {
        const sid = Number(content.slice(4));
        const found = Number.isInteger(sid) &&
          this.sql.exec(`SELECT id FROM stickers WHERE id = ?`, sid).toArray().length;
        if (!found) throw new HttpError(400, '貼圖不存在（可能已被刪除）');
      } else if (!content.trim() || content.length > MAX_STICKER) {
        throw new HttpError(400, '貼圖格式不符');
      }
    } else if (type === 'audio') {
      if (!content.startsWith('data:audio/') || content.length > MAX_AUDIO)
        throw new HttpError(400, '語音格式不符或太長');
      const dur = Math.round(Number(body.duration));
      if (!Number.isFinite(dur) || dur < 1 || dur > 180)
        throw new HttpError(400, '語音長度不正確');
      meta.duration = dur;
    } else if (type === 'poll') {
      const q = String((body.poll && body.poll.q) || '').trim();
      const options = (Array.isArray(body.poll && body.poll.options) ? body.poll.options : [])
        .map((o) => String(o).trim())
        .filter(Boolean);
      if (!q || [...q].length > 100) throw new HttpError(400, '投票問題需為 1–100 個字');
      if (options.length < 2 || options.length > 6)
        throw new HttpError(400, '投票選項需為 2–6 個');
      if (options.some((o) => [...o].length > 30))
        throw new HttpError(400, '每個選項最長 30 個字');
      content = JSON.stringify({ q, options });
    } else {
      throw new HttpError(400, '不支援的訊息類型');
    }

    // 回覆／引用：存下被回覆訊息的快照
    const replyTo = Number(body.replyTo) || null;
    if (replyTo) {
      const orig = this.sql
        .exec(`SELECT * FROM messages WHERE id = ? AND conversation_id = ?`, replyTo, conversationId)
        .toArray()[0];
      if (!orig) throw new HttpError(404, '找不到要回覆的訊息');
      if (orig.deleted) throw new HttpError(400, '無法回覆已收回的訊息');
      meta.reply = { id: orig.id, senderId: orig.sender_id, type: orig.type, text: previewOf(orig) };
    }

    const row = this.sql
      .exec(
        `INSERT INTO messages (conversation_id, sender_id, type, content, created_at, reply_to, meta)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        conversationId, me.id, type, content, Date.now(),
        replyTo, Object.keys(meta).length ? JSON.stringify(meta) : null)
      .one();
    // 自己送出的訊息視同已讀
    this.sql.exec(
      `UPDATE members SET last_read_id = MAX(last_read_id, ?)
       WHERE conversation_id = ? AND user_id = ?`, row.id, conversationId, me.id);

    const message = this.attachExtras([pubMessage(row)])[0];
    this.sendToUsers(this.memberIds(conversationId), { type: 'message', message });
    this.notifyOffline(conversationId, me.id);
    if (type === 'text') {
      const url = firstHttpUrl(content);
      if (url) this.ctx.waitUntil(this.attachLinkPreview(row.id, conversationId, url));
    }
    return json({ message });
  }

  // 送出含網址的訊息後，背景抓取網頁標題／摘要／縮圖，補進 meta.link 並廣播更新
  async attachLinkPreview(messageId, conversationId, url) {
    try {
      const link = await this.fetchLinkPreview(url);
      if (!link) return;
      const row = this.sql.exec(`SELECT * FROM messages WHERE id = ?`, messageId).toArray()[0];
      if (!row || row.deleted) return;
      const meta = row.meta ? JSON.parse(row.meta) : {};
      meta.link = link;
      this.sql.exec(`UPDATE messages SET meta = ? WHERE id = ?`, JSON.stringify(meta), messageId);
      const message = this.attachExtras([pubMessage({ ...row, meta: JSON.stringify(meta) })])[0];
      this.sendToUsers(this.memberIds(conversationId), { type: 'message-updated', message });
    } catch (e) {
      console.warn('link preview failed:', url, e && e.message);
    }
  }

  // 抓取網頁並解析 Open Graph／Twitter Card／<title>；沒有標題就不做卡片
  async fetchLinkPreview(url) {
    const resp = await fetchWithTimeout(url, 6000, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; CHAT-LinkPreview/1.0; +https://github.com/Shane360129/CIM)',
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
      },
    });
    const ctype = resp.headers.get('content-type') || '';
    if (!resp.ok || !/text\/html|application\/xhtml/i.test(ctype) || !resp.body) return null;
    const bytes = await readCapped(resp.body, LINK_FETCH_BYTES);
    let html;
    try { html = new TextDecoder(pickCharset(ctype, bytes)).decode(bytes); }
    catch { html = new TextDecoder().decode(bytes); }
    // 只看 <body> 之前的部分即可，避免正文裡的假 meta
    const headEnd = html.search(/<body[\s>]/i);
    const head = headEnd > 0 ? html.slice(0, headEnd) : html;

    let title = metaOf(head, ['og:title', 'twitter:title']);
    if (!title) {
      const t = head.match(/<title[^>]*>([^<]*)<\/title>/i);
      title = t && t[1] ? htmlDecode(t[1]).trim() : null;
    }
    if (!title) return null;
    const desc = metaOf(head, ['og:description', 'twitter:description', 'description']);
    const site = metaOf(head, ['og:site_name', 'application-name']);
    const finalUrl = safeRemoteUrl(resp.url) || url;

    // 縮圖：解析相對路徑、只留可安全代理的 http(s) 圖片，並簽章後經由 /api/link-image 供應
    let image = null;
    const rawImg = metaOf(head, ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']);
    if (rawImg) {
      try {
        const abs = safeRemoteUrl(new URL(rawImg, finalUrl).href);
        if (abs && abs.length <= 2000) image = await this.signLinkImage(abs);
      } catch {}
    }
    return {
      url,
      title: [...title].slice(0, 120).join(''),
      desc: desc ? [...desc.replace(/\s+/g, ' ')].slice(0, 200).join('') : null,
      site: [...(site || new URL(finalUrl).hostname)].slice(0, 60).join(''),
      image,
    };
  }

  // 縮圖代理簽章金鑰：首次使用時隨機產生並存入 settings，之後所有實例共用
  async linkImageKey() {
    if (this._linkImageKey) return this._linkImageKey;
    let secret = this.getSetting('link_image_secret');
    if (!secret) {
      secret = randomHex(32);
      this.setSetting('link_image_secret', secret);
    }
    this._linkImageKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    return this._linkImageKey;
  }

  async signLinkImage(imgUrl) {
    const key = await this.linkImageKey();
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(imgUrl));
    return `/api/link-image?u=${encodeURIComponent(imgUrl)}&s=${b64url(sig)}`;
  }

  // 連結預覽縮圖代理：瀏覽器的 <img> 不會帶登入權杖，改以 HMAC 簽章驗證，
  // 只有伺服器產生預覽時簽過的網址才能透過這裡取圖（不是開放代理）。
  // 好處：CSP 維持只允許同源圖片、外站看不到親友的 IP、可被 Cloudflare 快取。
  async serveLinkImage(request, url) {
    const target = url.searchParams.get('u') || '';
    const sigBytes = fromB64url(url.searchParams.get('s') || '');
    if (!target || !sigBytes || sigBytes.length !== 32) throw new HttpError(403, '簽章無效');
    const key = await this.linkImageKey();
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(target));
    if (!ok) throw new HttpError(403, '簽章無效');
    if (!safeRemoteUrl(target)) throw new HttpError(400, '網址不合法');

    let cache = null;
    try { cache = caches.default; } catch {}
    if (cache) {
      const hit = await cache.match(request.url).catch(() => null);
      if (hit) return hit;
    }

    let resp;
    try {
      resp = await fetchWithTimeout(target, 8000, {
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; CHAT-LinkPreview/1.0)', accept: 'image/*' },
      });
    } catch { throw new HttpError(502, '無法取得圖片'); }
    const ctype = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!resp.ok || !resp.body || !/^image\/(jpeg|png|gif|webp|avif)$/.test(ctype))
      throw new HttpError(502, '不是支援的圖片');
    const declared = Number(resp.headers.get('content-length'));
    if (declared > LINK_IMAGE_BYTES) throw new HttpError(502, '圖片過大');
    const bytes = await readCapped(resp.body, LINK_IMAGE_BYTES + 1);
    if (bytes.byteLength > LINK_IMAGE_BYTES) throw new HttpError(502, '圖片過大');

    const out = new Response(bytes, {
      headers: {
        'content-type': ctype,
        'cache-control': 'public, max-age=604800, immutable',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'",
        'content-disposition': 'inline',
      },
    });
    if (cache) this.ctx.waitUntil(cache.put(request.url, out.clone()).catch(() => {}));
    return out;
  }

  // 個人化設定：聊天室置頂、聊天室背景（只影響自己，跨裝置同步）
  async updateConvPrefs(request, me, conversationId) {
    this.requireMember(conversationId, me.id);
    const body = await this.readJson(request, MAX_WALLPAPER + 20000);
    if (body.pinned !== undefined) {
      this.sql.exec(
        `UPDATE members SET pinned = ? WHERE conversation_id = ? AND user_id = ?`,
        body.pinned ? 1 : 0, conversationId, me.id);
    }
    if (body.wallpaper !== undefined) {
      const w = body.wallpaper === null ? null : String(body.wallpaper);
      if (w !== null) {
        const okColor = /^c:#[0-9A-Fa-f]{6}$/.test(w);
        const okImage = w.startsWith('data:image/') && w.length <= MAX_WALLPAPER;
        if (!okColor && !okImage) throw new HttpError(400, '背景格式不符或圖片太大');
      }
      this.sql.exec(
        `UPDATE members SET wallpaper = ? WHERE conversation_id = ? AND user_id = ?`,
        w, conversationId, me.id);
    }
    this.sendToUsers([me.id], { type: 'conversations-changed' });
    return json({ ok: true });
  }

  // ---------- 自訂貼圖 ----------

  listStickers() {
    const rows = this.sql.exec(`SELECT * FROM stickers ORDER BY id`).toArray();
    return json({ stickers: rows.map((r) => ({ id: r.id, image: r.image, addedBy: r.added_by })) });
  }

  async addSticker(request, me) {
    const body = await this.readJson(request, MAX_STICKER_IMG + 20000);
    const image = String(body.image || '');
    if (!image.startsWith('data:image/') || image.length > MAX_STICKER_IMG)
      throw new HttpError(400, '貼圖格式不符或太大，請換一張圖');
    const count = this.sql.exec(`SELECT COUNT(*) AS c FROM stickers`).one().c;
    if (count >= MAX_STICKERS)
      throw new HttpError(400, `貼圖最多 ${MAX_STICKERS} 張，請先刪掉幾張`);
    const row = this.sql.exec(
      `INSERT INTO stickers (image, added_by, created_at) VALUES (?, ?, ?) RETURNING *`,
      image, me.id, Date.now()).one();
    this.broadcastAll({ type: 'stickers-changed' });
    return json({ sticker: { id: row.id, image: row.image, addedBy: row.added_by } });
  }

  deleteSticker(me, id) {
    const row = this.sql.exec(`SELECT * FROM stickers WHERE id = ?`, id).toArray()[0];
    if (!row) throw new HttpError(404, '找不到這張貼圖');
    if (row.added_by !== me.id && !me.is_admin)
      throw new HttpError(403, '只能刪除自己新增的貼圖');
    this.sql.exec(`DELETE FROM stickers WHERE id = ?`, id);
    this.broadcastAll({ type: 'stickers-changed' });
    return json({ ok: true });
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
      if (!this.canSee(me, uid)) throw new HttpError(403, '只能邀請你看得到的成員加入群組');
      this.sql.exec(
        `INSERT INTO members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`,
        conversationId, uid, now);
      added.push(user);
    }
    if (added.length) {
      const names = added.map((u) => u.display_name).join('、');
      this.addSystemMessage(conversationId, `${me.display_name} 邀請 ${names} 加入群組`);
      this.sendToUsers(this.memberIds(conversationId), { type: 'conversations-changed' });
      this.sendToUsers(this.memberIds(conversationId), { type: 'users-changed' });
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
    if (conv.type !== 'group') throw new HttpError(400, '只有群組可以修改');
    const body = await this.readJson(request, MAX_AVATAR + 20000);
    let changed = false;
    if (body.name !== undefined) {
      const name = String(body.name || '').trim();
      if (!name || [...name].length > 30) throw new HttpError(400, '群組名稱需為 1–30 個字');
      this.sql.exec(`UPDATE conversations SET name = ? WHERE id = ?`, name, conversationId);
      this.addSystemMessage(conversationId, `${me.display_name} 將群組名稱改為「${name}」`);
      changed = true;
    }
    if (body.avatar !== undefined) {
      const avatar = body.avatar === null ? null : String(body.avatar);
      if (avatar !== null && (!avatar.startsWith('data:image/') || avatar.length > MAX_AVATAR))
        throw new HttpError(400, '圖片格式不符或太大');
      this.sql.exec(`UPDATE conversations SET avatar = ? WHERE id = ?`, avatar, conversationId);
      this.addSystemMessage(conversationId, avatar
        ? `${me.display_name} 更換了群組照片`
        : `${me.display_name} 移除了群組照片`);
      changed = true;
    }
    if (!changed) throw new HttpError(400, '沒有要修改的內容');
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
    const conv = this.sql
      .exec(`SELECT pinned_message_id FROM conversations WHERE id = ?`, row.conversation_id)
      .toArray()[0];
    if (conv && conv.pinned_message_id === messageId) {
      this.sql.exec(
        `UPDATE conversations SET pinned_message_id = NULL WHERE id = ?`, row.conversation_id);
      this.sendToUsers(this.memberIds(row.conversation_id), {
        type: 'pin', conversationId: row.conversation_id, pinned: null,
      });
    }
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
    if (body.privacyContacts !== undefined) {
      this.setSetting('privacy_contacts', body.privacyContacts ? '1' : '0');
      this.broadcastAll({ type: 'users-changed' });
    }
    return json({ inviteCode: this.getSetting('invite_code'), privacyContacts: this.privacyOn() });
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

  // ---------- 表情回應、投票、公告 ----------

  async react(request, me, messageId) {
    const row = this.sql.exec(`SELECT * FROM messages WHERE id = ?`, messageId).toArray()[0];
    if (!row || row.deleted) throw new HttpError(404, '找不到這則訊息');
    this.requireMember(row.conversation_id, me.id);
    const body = await this.readJson(request, 5000);
    const emoji = String(body.emoji || '').trim();
    if (!emoji || emoji.length > MAX_REACTION) throw new HttpError(400, '表情格式不符');
    const existing = this.sql
      .exec(`SELECT 1 AS x FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
        messageId, me.id, emoji)
      .toArray()[0];
    if (existing) {
      this.sql.exec(
        `DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
        messageId, me.id, emoji);
    } else {
      const mine = this.sql
        .exec(`SELECT COUNT(*) AS c FROM reactions WHERE message_id = ? AND user_id = ?`,
          messageId, me.id)
        .one().c;
      if (mine >= 6) throw new HttpError(400, '每則訊息最多加 6 種表情');
      this.sql.exec(
        `INSERT INTO reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)`,
        messageId, me.id, emoji, Date.now());
    }
    const reactions = this.reactionsOf(messageId);
    this.sendToUsers(this.memberIds(row.conversation_id), {
      type: 'reaction', conversationId: row.conversation_id, messageId, reactions,
    });
    return json({ reactions });
  }

  async vote(request, me, messageId) {
    const row = this.sql.exec(`SELECT * FROM messages WHERE id = ?`, messageId).toArray()[0];
    if (!row || row.deleted || row.type !== 'poll') throw new HttpError(404, '找不到這個投票');
    this.requireMember(row.conversation_id, me.id);
    const body = await this.readJson(request, 5000);
    const opt = Number(body.opt);
    const poll = JSON.parse(row.content);
    if (!Number.isInteger(opt) || opt < 0 || opt >= poll.options.length)
      throw new HttpError(400, '選項不正確');
    const cur = this.sql
      .exec(`SELECT opt FROM poll_votes WHERE message_id = ? AND user_id = ?`, messageId, me.id)
      .toArray()[0];
    if (cur && cur.opt === opt) {
      this.sql.exec(`DELETE FROM poll_votes WHERE message_id = ? AND user_id = ?`, messageId, me.id);
    } else {
      this.sql.exec(
        `INSERT INTO poll_votes (message_id, user_id, opt) VALUES (?, ?, ?)
         ON CONFLICT(message_id, user_id) DO UPDATE SET opt = excluded.opt`,
        messageId, me.id, opt);
    }
    const votes = this.votesOf(messageId);
    this.sendToUsers(this.memberIds(row.conversation_id), {
      type: 'vote', conversationId: row.conversation_id, messageId, votes,
    });
    return json({ votes });
  }

  async pinMessage(request, me, conversationId) {
    this.requireMember(conversationId, me.id);
    const body = await this.readJson(request, 5000);
    let pinned = null;
    if (body.messageId === null || body.messageId === undefined || body.messageId === 0) {
      this.sql.exec(`UPDATE conversations SET pinned_message_id = NULL WHERE id = ?`, conversationId);
    } else {
      const mid = Number(body.messageId);
      const row = this.sql
        .exec(`SELECT * FROM messages WHERE id = ? AND conversation_id = ?`, mid, conversationId)
        .toArray()[0];
      if (!row || row.deleted || row.type === 'system')
        throw new HttpError(404, '找不到要設為公告的訊息');
      this.sql.exec(`UPDATE conversations SET pinned_message_id = ? WHERE id = ?`, mid, conversationId);
      pinned = pubMessage(row);
      this.addSystemMessage(conversationId, `${me.display_name} 設定了新公告`);
    }
    this.sendToUsers(this.memberIds(conversationId), {
      type: 'pin', conversationId, pinned,
    });
    return json({ ok: true });
  }

  // ---------- 訊息搜尋 ----------

  search(url, me) {
    const q = String(url.searchParams.get('q') || '').trim();
    if (!q || q.length > 50) throw new HttpError(400, '請輸入 1–50 個字的關鍵字');
    const esc = q.replace(/[\\%_]/g, (c) => '\\' + c);
    const rows = this.sql
      .exec(
        `SELECT m.* FROM messages m
         JOIN members mb ON mb.conversation_id = m.conversation_id AND mb.user_id = ?
         WHERE m.deleted = 0 AND m.type = 'text' AND m.content LIKE ? ESCAPE '\\'
         ORDER BY m.id DESC LIMIT 30`,
        me.id, `%${esc}%`)
      .toArray();
    return json({ results: rows.map(pubMessage) });
  }

  // ---------- 購物清單 ----------

  pubShopping(row, names = this.userNames()) {
    return {
      id: row.id, text: row.text, done: !!row.done,
      createdBy: row.created_by, createdAt: row.created_at, doneBy: row.done_by,
      createdByName: names.get(row.created_by) || null,
      doneByName: row.done_by ? names.get(row.done_by) || null : null,
    };
  }

  listShopping() {
    const rows = this.sql
      .exec(`SELECT * FROM shopping ORDER BY done ASC, id DESC LIMIT 200`).toArray();
    const names = this.userNames();
    return json({ items: rows.map((r) => this.pubShopping(r, names)) });
  }

  async addShopping(request, me) {
    const body = await this.readJson(request, 5000);
    const text = String(body.text || '').trim();
    if (!text || [...text].length > 60) throw new HttpError(400, '項目需為 1–60 個字');
    const row = this.sql
      .exec(
        `INSERT INTO shopping (text, created_by, created_at) VALUES (?, ?, ?) RETURNING *`,
        text, me.id, Date.now())
      .one();
    this.broadcastAll({ type: 'shopping-changed' });
    return json({ item: this.pubShopping(row) });
  }

  async toggleShopping(request, me, id) {
    const body = await this.readJson(request, 5000);
    const done = body.done ? 1 : 0;
    const row = this.sql
      .exec(
        `UPDATE shopping SET done = ?, done_by = ?, done_at = ? WHERE id = ? RETURNING *`,
        done, done ? me.id : null, done ? Date.now() : null, id)
      .toArray()[0];
    if (!row) throw new HttpError(404, '找不到這個項目');
    this.broadcastAll({ type: 'shopping-changed' });
    return json({ item: this.pubShopping(row) });
  }

  deleteShopping(me, id) {
    this.sql.exec(`DELETE FROM shopping WHERE id = ?`, id);
    this.broadcastAll({ type: 'shopping-changed' });
    return json({ ok: true });
  }

  // ---------- 家庭行事曆（DO Alarm 到時提醒）----------

  pubEvent(row, names = this.userNames()) {
    return {
      id: row.id, title: row.title, date: row.date, time: row.time, note: row.note,
      remindAt: row.remind_at, createdBy: row.created_by, createdAt: row.created_at,
      reminded: !!row.reminded,
      createdByName: names.get(row.created_by) || null,
    };
  }

  listEvents() {
    const rows = this.sql.exec(`SELECT * FROM events ORDER BY remind_at ASC LIMIT 200`).toArray();
    const names = this.userNames();
    return json({ events: rows.map((r) => this.pubEvent(r, names)) });
  }

  async addEvent(request, me) {
    const body = await this.readJson(request, 8000);
    const title = String(body.title || '').trim();
    const date = String(body.date || '');
    const time = body.time ? String(body.time) : null;
    const note = String(body.note || '').trim();
    const remindAt = Number(body.remindAt);
    if (!title || [...title].length > 60) throw new HttpError(400, '標題需為 1–60 個字');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, '日期格式不正確');
    if (time && !/^\d{2}:\d{2}$/.test(time)) throw new HttpError(400, '時間格式不正確');
    if ([...note].length > 200) throw new HttpError(400, '備註最長 200 個字');
    if (!Number.isFinite(remindAt)) throw new HttpError(400, '提醒時間不正確');
    const row = this.sql
      .exec(
        `INSERT INTO events (title, date, time, note, remind_at, created_by, created_at, reminded)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        title, date, time, note, remindAt, me.id, Date.now(),
        remindAt <= Date.now() ? 1 : 0)
      .one();
    this.scheduleNextAlarm();
    this.broadcastAll({ type: 'events-changed' });
    return json({ event: this.pubEvent(row) });
  }

  deleteEvent(me, id) {
    this.sql.exec(`DELETE FROM events WHERE id = ?`, id);
    this.scheduleNextAlarm();
    this.broadcastAll({ type: 'events-changed' });
    return json({ ok: true });
  }

  scheduleNextAlarm() {
    const next = this.sql
      .exec(`SELECT MIN(remind_at) AS t FROM events WHERE reminded = 0`).one().t;
    if (next) this.ctx.storage.setAlarm(Math.max(next, Date.now() + 1000));
    else this.ctx.storage.deleteAlarm();
  }

  async alarm() {
    const due = this.sql
      .exec(`SELECT * FROM events WHERE reminded = 0 AND remind_at <= ?`, Date.now())
      .toArray();
    for (const e of due) {
      this.sql.exec(`UPDATE events SET reminded = 1 WHERE id = ?`, e.id);
      this.broadcastAll({ type: 'event-reminder', event: this.pubEvent(e) });
    }
    if (due.length) {
      const users = this.sql.exec(`SELECT id FROM users WHERE disabled = 0`).toArray();
      const offline = users
        .filter((u) => this.ctx.getWebSockets(`u:${u.id}`).length === 0)
        .map((u) => u.id);
      const p = this.sendPushTo(offline);
      if (this.ctx.waitUntil) this.ctx.waitUntil(p);
    }
    this.scheduleNextAlarm();
  }

  // ---------- 管理員：移除成員 ----------

  removeUser(me, userId) {
    if (userId === me.id) throw new HttpError(400, '不能移除自己');
    const row = this.sql
      .exec(`SELECT * FROM users WHERE id = ? AND disabled = 0`, userId).toArray()[0];
    if (!row) throw new HttpError(404, '找不到這位成員');
    const updated = this.sql
      .exec(`UPDATE users SET disabled = 1 WHERE id = ? RETURNING *`, userId).one();
    this.sql.exec(`DELETE FROM sessions WHERE user_id = ?`, userId);
    this.sql.exec(`DELETE FROM push_subs WHERE user_id = ?`, userId);
    for (const ws of this.ctx.getWebSockets(`u:${userId}`)) {
      try { ws.close(4003, 'removed'); } catch {}
    }
    this.sendToUsers(this.audienceOf(updated), { type: 'user', user: pubUser(updated) });
    return json({ ok: true });
  }

  // 管理員重設成員密碼：產生一次性臨時密碼，舊登入全部失效
  async resetPassword(userId) {
    const row = this.sql
      .exec(`SELECT * FROM users WHERE id = ? AND disabled = 0`, userId).toArray()[0];
    if (!row) throw new HttpError(404, '找不到這位成員');
    // 好唸好抄的字元集（去掉 0/O、1/l 等易混淆字）
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    const rand = crypto.getRandomValues(new Uint8Array(8));
    const tempPassword = [...rand].map((b) => chars[b % chars.length]).join('');
    const salt = randomHex(16);
    const hash = await hashPassword(tempPassword, salt);
    this.sql.exec(`UPDATE users SET password_hash = ?, salt = ? WHERE id = ?`, hash, salt, userId);
    this.sql.exec(`DELETE FROM sessions WHERE user_id = ?`, userId);
    for (const ws of this.ctx.getWebSockets(`u:${userId}`)) {
      try { ws.close(1000, 'password reset'); } catch {}
    }
    return json({ tempPassword });
  }

  // ---------- 離線推播（Web Push / VAPID，自動產生金鑰）----------

  async ensureVapid() {
    const pub = this.getSetting('vapid_public');
    const priv = this.getSetting('vapid_private');
    if (pub && priv) return { pub, priv: JSON.parse(priv) };
    const pair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const rawPub = await crypto.subtle.exportKey('raw', pair.publicKey);
    const jwkPriv = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const pubB64 = b64url(rawPub);
    this.setSetting('vapid_public', pubB64);
    this.setSetting('vapid_private', JSON.stringify(jwkPriv));
    return { pub: pubB64, priv: jwkPriv };
  }

  async pushKey() {
    const { pub } = await this.ensureVapid();
    return json({ key: pub });
  }

  async pushSubscribe(request, me) {
    const body = await this.readJson(request, 10000);
    const sub = body.subscription;
    if (!sub || typeof sub.endpoint !== 'string' ||
        !sub.endpoint.startsWith('https://') || sub.endpoint.length > 1000)
      throw new HttpError(400, '訂閱資料不正確');
    this.sql.exec(
      `INSERT INTO push_subs (endpoint, user_id, sub, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, sub = excluded.sub`,
      sub.endpoint, me.id, JSON.stringify(sub), Date.now());
    // 每人最多 8 個裝置訂閱，超過刪最舊的
    this.sql.exec(
      `DELETE FROM push_subs WHERE user_id = ? AND endpoint NOT IN (
         SELECT endpoint FROM push_subs WHERE user_id = ? ORDER BY created_at DESC LIMIT 8)`,
      me.id, me.id);
    return json({ ok: true });
  }

  async pushUnsubscribe(request, me) {
    const body = await this.readJson(request, 10000);
    this.sql.exec(
      `DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?`,
      String(body.endpoint || ''), me.id);
    return json({ ok: true });
  }

  async vapidJwt(origin) {
    this.jwtCache = this.jwtCache || new Map();
    const cached = this.jwtCache.get(origin);
    if (cached && cached.expMs > Date.now() + 60000) return cached.jwt;
    const { priv } = await this.ensureVapid();
    const key = await crypto.subtle.importKey(
      'jwk', priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const exp = Math.floor(Date.now() / 1000) + 3600 * 12;
    const data = b64urlJson({ typ: 'JWT', alg: 'ES256' }) + '.' +
      b64urlJson({ aud: origin, exp, sub: 'mailto:admin@example.com' });
    const sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(data));
    const jwt = data + '.' + b64url(sig);
    this.jwtCache.set(origin, { jwt, expMs: exp * 1000 });
    return jwt;
  }

  // 送「無內容」推播喚醒 service worker（不需加密 payload；SW 顯示通用通知）
  async sendPushTo(userIds) {
    if (!userIds.length) return;
    const now = Date.now();
    this.pushLast = this.pushLast || new Map();
    const targets = userIds.filter((id) => (this.pushLast.get(id) || 0) < now - PUSH_THROTTLE);
    if (!targets.length) return;
    for (const id of targets) this.pushLast.set(id, now);
    const ph = targets.map(() => '?').join(',');
    const subs = this.sql
      .exec(`SELECT * FROM push_subs WHERE user_id IN (${ph})`, ...targets).toArray();
    if (!subs.length) return;
    const { pub } = await this.ensureVapid();
    await Promise.all(subs.map(async (s) => {
      try {
        const origin = new URL(s.endpoint).origin;
        const jwt = await this.vapidJwt(origin);
        const res = await fetch(s.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `vapid t=${jwt}, k=${pub}`,
            'TTL': '86400',
            'Urgency': 'normal',
          },
        });
        if (res.status === 404 || res.status === 410)
          this.sql.exec(`DELETE FROM push_subs WHERE endpoint = ?`, s.endpoint);
      } catch {}
    }));
  }

  notifyOffline(conversationId, senderId) {
    const offline = this.memberIds(conversationId)
      .filter((id) => id !== senderId && this.ctx.getWebSockets(`u:${id}`).length === 0);
    if (!offline.length) return;
    const p = this.sendPushTo(offline);
    if (this.ctx.waitUntil) this.ctx.waitUntil(p);
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
