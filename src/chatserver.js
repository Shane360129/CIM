// CIM 聊天伺服器 — 單一 Durable Object（SQLite 儲存 + WebSocket Hibernation）。
// Worker 會把所有 /api/* 與 /ws 請求轉送到名為 "main" 的唯一實例。
// 家庭／親友規模（數十人）用單一實例最簡單也最一致：所有資料與連線都在同一處，
// 不需要 D1、不需要設定任何密鑰，`wrangler deploy` 完即可使用。

import {
  FARM_MAP, FARM_W, FARM_H, FARM_SPAWN, CROPS, ENERGY_MAX, ENERGY_COST, WATER_HOURS,
  START_MONEY, START_ITEMS, grownMs, cropStage, cropTotalMs, waterUntil,
  taiwanDay, seasonOf, SEASONS, WEATHERS, inSeason, regrowProgressMs, weatherOf, realRain, NO_RAIN,
  wetUntilOf, dayEndOf, nextSeasonStart,
  ANIMALS, PRODUCTS, FEED_PRICE, LOVE_MAX, hearts, productOf, animalReadyAt, animalHasProduct, cleanAnimalName, PEN,
  TOWN_MAP, AREAS, ARRIVE, VILLAGERS, FRIEND_MAX, friendHearts, giftPoints, friendReward, villagerOut, requestOf,
  TALK_POINTS, REQUEST_POINTS, FOODS, TOOL_UPGRADES, area3x3, isBirthday,
  HILL_MAP, EXITS, FISH, ORES, fishSpot, isDaytime, fishChoices, pickWeighted, rocksOf, itemPrice, itemName, terrainAt,
  DISHES, INGREDIENT_GROUPS, cookTakes, FESTIVALS, festivalOn, festivalsAfter, nextFestival, isBirthdayEvent,
  GH_MAP, fieldArea, GOODS, MACHINES, MACHINE_SPOTS, MACHINE_BATCH, machineReadyAt, BUILDS, energyMaxOf,
  POND_ZONE, BABY_DAYS, isBaby, canHaveBaby, babyName, PETS, PET_ZONE, petFind,
  STORIES, STORY_HEARTS, storyDue, ACHIEVEMENTS, achievementsMet, weekStart, weeklyReportText,
  isWetWeather, FESTIVAL_ACTIVITIES, RIDDLES, riddlesFor, activityResult, BOAT_BEATS, BBQ_STICKS,
  TREE_SPOTS, HIVE_SPOTS, TREES, FRUITS, HIVE, treeMatureAt, treeReadyAt, hiveReadyAt,
  MARKET_STALLS, MARKET_ZONE, isNightMarket, NIGHT_FOODS, specialsOf, GOLDFISH_MAX, RING_THROWS, ringPrize,
  BEAUTY_RIVALS, beautyResult, HARVEST_RIVALS, harvestContest,
  CAVE_FLOORS, CAVE_STOPS, CAVE_UP, CAVE_ARRIVE, CAVE_LAYOUTS, caveFloor, caveTier, chestLoot, CAVE_TREASURE, isAreaKey,
} from './farm.js';
const ANIMAL_EMOJI = { chicken: '🐔', duck: '🦆', cow: '🐄', sheep: '🐑' };

const SEASON_NAME = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const SEASON_EMOJI = { spring: '🌸', summer: '🌻', autumn: '🍂', winter: '⛄' };
const seasonsText = (list) => list.map((x) => SEASON_NAME[x]).join('、');

const SESSION_TTL = 1000 * 60 * 60 * 24 * 60; // 60 天未使用即需重新登入
const UNSEND_WINDOW = 1000 * 60 * 60 * 24; // 送出後 24 小時內可收回
const DAY = 86400000;
const MEDIA_TTL_DAYS = 30; // 圖片／語音簽章網址的有效天數
const EXPORT_PAGE_BYTES = 8 * 1024 * 1024; // 備份每頁最多約 8MB 內容（伺服器記憶體上限 128MB）
const EXPORT_MAX_ROWS = 200;               // 純文字訊息時，每頁最多幾則
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

// v6：登入／邀請碼的失敗次數改存資料庫。原本放在記憶體裡，Durable Object
// 一被回收就整個歸零，等於鎖定可以被繞過。
const SCHEMA_V6 = `
CREATE TABLE IF NOT EXISTS guards (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope, key)
);
`;

// v7：家族小牧場（一個聊天室一座）。錢與倉庫全家共用，體力每人各自計算
const SCHEMA_V7 = `
CREATE TABLE IF NOT EXISTS farms (
  conversation_id INTEGER PRIMARY KEY,
  money INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS farm_tiles (
  conversation_id INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  tilled INTEGER NOT NULL DEFAULT 0,
  crop TEXT,
  progress_ms INTEGER NOT NULL DEFAULT 0,
  tick_at INTEGER NOT NULL DEFAULT 0,
  watered_until INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, x, y)
);
CREATE TABLE IF NOT EXISTS farm_items (
  conversation_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  qty INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, item)
);
CREATE TABLE IF NOT EXISTS farm_players (
  conversation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  energy INTEGER NOT NULL,
  energy_day TEXT NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);
`;

// 牧場記住「上次是哪一季」，換季後第一次有人打開時在聊天室說一聲
const SCHEMA_V8 = `ALTER TABLE farms ADD COLUMN season_seen TEXT;`;

// 牧場的動物：fed_at 最近一次餵的時間、fed_day 那天（台灣日期）、collected 這次的產品收了沒、
// love 喜歡程度（0～20）、petted_day 最近一次被摸的日期
const SCHEMA_V9 = `
CREATE TABLE IF NOT EXISTS farm_animals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  bought_at INTEGER NOT NULL,
  fed_at INTEGER NOT NULL DEFAULT 0,
  fed_day TEXT NOT NULL DEFAULT '',
  collected INTEGER NOT NULL DEFAULT 1,
  love INTEGER NOT NULL DEFAULT 0,
  petted_day TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_farm_animals_conv ON farm_animals(conversation_id);
`;

// 小鎮：跟每位村民的感情（全家共用）、今天聊過／送過禮了沒、謝禮送到第幾級；
// 牧場記住哪天完成了委託、工具升級到幾級
const SCHEMA_V10 = `
CREATE TABLE IF NOT EXISTS farm_friends (
  conversation_id INTEGER NOT NULL,
  villager TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  talk_day TEXT NOT NULL DEFAULT '',
  gift_day TEXT NOT NULL DEFAULT '',
  reward_level INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, villager)
);
ALTER TABLE farms ADD COLUMN request_day TEXT;
ALTER TABLE farms ADD COLUMN hoe_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE farms ADD COLUMN can_level INTEGER NOT NULL DEFAULT 1;
`;

// 後山：今天挖掉了哪幾顆石頭（只留當天的）；圖鑑：每種魚、礦石第一次是誰、什麼時候拿到的
const SCHEMA_V11 = `
CREATE TABLE IF NOT EXISTS farm_mined (
  conversation_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, day, x, y)
);
CREATE TABLE IF NOT EXISTS farm_dex (
  conversation_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  by_user INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, item)
);
`;

// 節慶：今天的節日說過了沒、節慶禮物領了沒、行事曆上的家人生日慶祝過了沒（都記日期）
const SCHEMA_V12 = `
ALTER TABLE farms ADD COLUMN festival_seen TEXT;
ALTER TABLE farms ADD COLUMN festival_claim TEXT;
ALTER TABLE farms ADD COLUMN bday_seen TEXT;
`;

// 加工機（一種一台，有這一列就是買了；input 是正在做的材料，NULL 是空著）、溫室蓋好了沒、房子擴建到第幾級
const SCHEMA_V13 = `
CREATE TABLE IF NOT EXISTS farm_machines (
  conversation_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  input TEXT,
  qty INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL DEFAULT 0,
  by_user INTEGER,
  PRIMARY KEY (conversation_id, kind)
);
ALTER TABLE farms ADD COLUMN gh_built INTEGER NOT NULL DEFAULT 0;
ALTER TABLE farms ADD COLUMN house_level INTEGER NOT NULL DEFAULT 1;
`;

// 動物寶寶（baby_until：什麼時候長大，0＝大人；last_baby_at：上一胎）；寵物（一種一隻，誰最後摸就跟著誰）
const SCHEMA_V14 = `
ALTER TABLE farm_animals ADD COLUMN baby_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE farm_animals ADD COLUMN last_baby_at INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS farm_pets (
  conversation_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  love INTEGER NOT NULL DEFAULT 0,
  petted_day TEXT NOT NULL DEFAULT '',
  follow_user INTEGER,
  adopted_at INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, kind)
);
`;

// 村民的故事聽到第幾段；全家的累計（收成、出貨、委託、寶寶）；每週每人的紀錄（週報用）；達成的成就；上次週報是哪一週
const SCHEMA_V15 = `
ALTER TABLE farm_friends ADD COLUMN story_level INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS farm_stats (
  conversation_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, key)
);
CREATE TABLE IF NOT EXISTS farm_weekly (
  conversation_id INTEGER NOT NULL,
  week TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  actions INTEGER NOT NULL DEFAULT 0,
  harvest INTEGER NOT NULL DEFAULT 0,
  shipped INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, week, user_id)
);
CREATE TABLE IF NOT EXISTS farm_achievements (
  conversation_id INTEGER NOT NULL,
  id TEXT NOT NULL,
  by_user INTEGER,
  at INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, id)
);
ALTER TABLE farms ADD COLUMN report_week TEXT;
`;

// 颱風：哪天吹過了（熟了沒收的作物被吹倒）、前一天預報過了沒；節慶活動：每人每個節日玩一次
const SCHEMA_V16 = `
ALTER TABLE farms ADD COLUMN typhoon_seen TEXT;
ALTER TABLE farms ADD COLUMN typhoon_warned TEXT;
CREATE TABLE IF NOT EXISTS farm_festival_play (
  conversation_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, day, user_id)
);
`;

// 果樹（種在第幾個位置、什麼時候種、上次什麼時候摘）、蜂箱（放在第幾個位置、上次什麼時候收）
const SCHEMA_V17 = `
CREATE TABLE IF NOT EXISTS farm_trees (
  conversation_id INTEGER NOT NULL,
  spot INTEGER NOT NULL,
  kind TEXT NOT NULL,
  planted_at INTEGER NOT NULL,
  picked_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, spot)
);
CREATE TABLE IF NOT EXISTS farm_hives (
  conversation_id INTEGER NOT NULL,
  spot INTEGER NOT NULL,
  placed_at INTEGER NOT NULL,
  collected_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, spot)
);
`;

// 夜市：每人每晚每個攤位玩一次（撈金魚、套圈圈）；動物選美：每座牧場每週報名一隻
const SCHEMA_V18 = `
CREATE TABLE IF NOT EXISTS farm_market_play (
  conversation_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  stall TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, day, user_id, stall)
);
CREATE TABLE IF NOT EXISTS farm_beauty (
  conversation_id INTEGER NOT NULL,
  week TEXT NOT NULL,
  animal_id INTEGER NOT NULL,
  animal_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  love INTEGER NOT NULL,
  entered_by INTEGER NOT NULL,
  decided INTEGER NOT NULL DEFAULT 0,
  place INTEGER,
  PRIMARY KEY (conversation_id, week)
);
`;

// 後山洞窟：礦車到過最深第幾層；每天每層挖掉的石頭、打開的寶箱（隔天整批換新）
const SCHEMA_V19 = `
ALTER TABLE farms ADD COLUMN cave_best INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS farm_cave_mined (
  conversation_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  floor INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, day, floor, x, y)
);
CREATE TABLE IF NOT EXISTS farm_cave_chests (
  conversation_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  floor INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, day, floor)
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

// 自己跟轉址：每一跳都要重新通過 safeRemoteUrl 檢查。
// 交給 fetch 的 redirect:'follow' 只會檢查第一個網址，外站可以用 302 把我們
// 導去內網（例如 http://127.0.0.1/），把不該外流的內容變成聊天室裡的預覽卡。
async function fetchSafeFollow(url, ms, init, maxHops = 3) {
  let current = url;
  for (let hop = 0; ; hop++) {
    const resp = await fetchWithTimeout(current, ms, { ...init, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(resp.status)) return { resp, finalUrl: current };
    const loc = resp.headers.get('location');
    if (!loc) return { resp, finalUrl: current };
    if (hop >= maxHops) throw new HttpError(400, '轉址太多次');
    let next;
    try { next = safeRemoteUrl(new URL(loc, current).href); } catch { next = null; }
    if (!next) throw new HttpError(400, '轉址到不允許的網址');
    current = next;
  }
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

// 把 data:image/jpeg;base64,xxxx 拆成 { mime, bytes }；格式不符回傳 null
// 解碼用一般迴圈：Uint8Array.from(字串, 回呼) 對每個位元組呼叫一次函式，
// 一張 450KB 的照片要 37ms，迴圈只要 2ms 多，結果完全相同。
function parseDataUrl(str) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.*)$/is.exec(str || '');
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime: m[1].toLowerCase(), bytes };
  } catch { return null; }
}

// 只看開頭判斷是不是可以走 /api/media 的照片／語音。列訊息時用這個，
// 不要整張解碼 —— 解碼 30 張照片要 1.3 秒 CPU，只看開頭不到 0.01ms。
const isMediaDataUrl = (str) => /^data:(image|audio)\/[a-z0-9.+-]+;base64,/i.test(str || '');

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

// 聊天室清單只需要「[圖片]」「[語音訊息]」這種一行預覽，不必把整包 data URL
// 一起送。原本一個結尾是圖片的聊天室，光清單就要傳幾百 KB。
const HEAVY_TYPES = new Set(['image', 'audio']);
const pubMessageLite = (row) => {
  const m = pubMessage(row);
  if (HEAVY_TYPES.has(m.type)) m.content = '';
  return m;
};

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
  // 小遊戲已移除，但以前開過的遊戲訊息還留在資料庫裡
  if (row.type === 'game') return '[小遊戲]';
  return String(row.content).slice(0, 60);
}

export { firstHttpUrl, trimUrlTail, normalizeUrl, safeRemoteUrl, ogTag, metaOf, pickCharset, fromB64url };

export class ChatServer {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
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
      if (v < 6) {
        this.sql.exec(SCHEMA_V6);
        this.setSetting('schema_version', '6');
      }
      if (v < 7) {
        this.sql.exec(SCHEMA_V7);
        this.setSetting('schema_version', '7');
      }
      if (v < 8) {
        this.sql.exec(SCHEMA_V8);
        this.setSetting('schema_version', '8');
      }
      if (v < 9) {
        this.sql.exec(SCHEMA_V9);
        this.setSetting('schema_version', '9');
      }
      if (v < 10) {
        this.sql.exec(SCHEMA_V10);
        this.setSetting('schema_version', '10');
      }
      if (v < 11) {
        this.sql.exec(SCHEMA_V11);
        this.setSetting('schema_version', '11');
      }
      if (v < 12) {
        this.sql.exec(SCHEMA_V12);
        this.setSetting('schema_version', '12');
      }
      if (v < 13) {
        this.sql.exec(SCHEMA_V13);
        this.setSetting('schema_version', '13');
      }
      if (v < 14) {
        this.sql.exec(SCHEMA_V14);
        this.setSetting('schema_version', '14');
      }
      if (v < 15) {
        this.sql.exec(SCHEMA_V15);
        this.setSetting('schema_version', '15');
      }
      if (v < 16) {
        this.sql.exec(SCHEMA_V16);
        this.setSetting('schema_version', '16');
      }
      if (v < 17) {
        this.sql.exec(SCHEMA_V17);
        this.setSetting('schema_version', '17');
      }
      if (v < 18) {
        this.sql.exec(SCHEMA_V18);
        this.setSetting('schema_version', '18');
      }
      if (v < 19) {
        this.sql.exec(SCHEMA_V19);
        this.setSetting('schema_version', '19');
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
    let m;

    if (pathname === '/ws') return this.handleWs(request);

    // 公開端點
    if (method === 'GET' && pathname === '/api/app-info') return this.appInfo();
    if (method === 'GET' && pathname === '/api/link-image') return this.serveLinkImage(request, url);
    // 圖片／語音：<img>、<audio> 帶不了登入權杖，改以簽章網址取用（授權仍每次重查）
    if (method === 'GET' && (m = pathname.match(/^\/api\/media\/(\d+)$/)))
      return this.serveMedia(request, url, +m[1]);
    if (method === 'POST' && pathname === '/api/register') return this.register(request);
    if (method === 'POST' && pathname === '/api/login') return this.login(request);

    // 其餘皆需登入
    const me = this.requireAuth(request);

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

    // 今天吃什麼：這個聊天室的牧場煮過哪些菜（只讀，沒有牧場就是空的，不會順便開墾）
    if (method === 'GET' && (m = pathname.match(/^\/api\/farm\/(\d+)\/dishes$/))) return this.farmDishes(me, +m[1]);
    if ((m = pathname.match(/^\/api\/farm\/(\d+)$/))) {
      if (method === 'GET') return this.farmState(me, +m[1]);
      if (method === 'POST') return this.farmAction(request, me, +m[1]);
    }
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
      return this.exportData(url);
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
      if (this.guardLocked('register', ip))
        throw new HttpError(429, '嘗試次數過多，請 15 分鐘後再試');
      const invite = this.getSetting('invite_code');
      if (!invite) throw new HttpError(403, '目前未開放註冊，請聯絡管理員');
      if (!timingSafeEqual(String(body.inviteCode || '').trim(), invite)) {
        this.guardFail('register', ip, 5, 1000 * 60 * 15);
        throw new HttpError(403, '邀請碼不正確');
      }
      this.guardClear('register', ip);
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

    if (this.guardLocked('login', username, now))
      throw new HttpError(429, '嘗試次數過多，請 10 分鐘後再試');

    const row = this.sql.exec(`SELECT * FROM users WHERE username = ?`, username).toArray()[0];
    const hash = row ? await hashPassword(password, row.salt) : null;
    if (!row || !timingSafeEqual(hash, row.password_hash)) {
      this.guardFail('login', username, 8, 1000 * 60 * 10, now);
      throw new HttpError(401, '帳號或密碼錯誤');
    }
    this.guardClear('login', username);
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
      lastMessage: last ? pubMessageLite(last) : null,
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

  async listMessages(url, me, conversationId) {
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
      if (p && !p.deleted) pinned = (await this.attachExtras([pubMessage(p)], me.id))[0];
    }
    return json({
      conversation: {
        id: conv.id, type: conv.type, name: conv.name,
        pinnedMessageId: conv.pinned_message_id || null,
      },
      messages: await this.attachExtras(rows.map(pubMessage), me.id),
      members,
      hasMore,
      hasNewer,
      pinned,
    });
  }

  // 一次補上訊息的表情回應與投票資料
  // 圖片／語音不再把整包 data URL 塞進訊息裡，只給一個簽給這位收件者的網址。
  // 原本打開一個有 30 張圖的聊天室，一次要傳 18MB。
  async attachExtras(messages, viewerId) {
    if (!messages.length) return messages;
    if (viewerId) {
      await Promise.all(messages.map(async (m) => {
        if (m.deleted || (m.type !== 'image' && m.type !== 'audio')) return;
        // 舊資料若不是標準的 base64 data URL，/api/media 解不開，就維持原樣內嵌
        if (!isMediaDataUrl(m.content)) return;
        m.meta = { ...(m.meta || {}), media: await this.signMedia(m.id, viewerId) };
        m.content = '';
      }));
    }
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

  // 廣播一則訊息：圖片／語音的網址是按收件者簽的，所以逐一送
  async sendMessageToMembers(conversationId, evType, row) {
    for (const uid of this.memberIds(conversationId)) {
      const message = (await this.attachExtras([pubMessage(row)], uid))[0];
      this.sendToUsers([uid], { type: evType, message });
    }
  }

  // ---------- 失敗次數鎖定（存資料庫，DO 被回收也不會歸零）----------

  guardOf(scope, key) {
    const row = this.sql
      .exec(`SELECT fails, locked_until FROM guards WHERE scope = ? AND key = ?`, scope, key)
      .toArray()[0];
    return row ? { fails: row.fails, lockedUntil: row.locked_until } : { fails: 0, lockedUntil: 0 };
  }

  guardLocked(scope, key, now = Date.now()) {
    return this.guardOf(scope, key).lockedUntil > now;
  }

  // 記一次失敗；累積到 max 次就鎖 lockMs 毫秒並把計數歸零
  guardFail(scope, key, max, lockMs, now = Date.now()) {
    const g = this.guardOf(scope, key);
    g.fails += 1;
    if (g.fails >= max) {
      g.lockedUntil = now + lockMs;
      g.fails = 0;
    }
    this.sql.exec(
      `INSERT INTO guards (scope, key, fails, locked_until, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(scope, key) DO UPDATE SET fails = ?, locked_until = ?, updated_at = ?`,
      scope, key, g.fails, g.lockedUntil, now, g.fails, g.lockedUntil, now);
    // 順手清掉一天以上沒動過、也沒在鎖定中的舊資料
    this.sql.exec(
      `DELETE FROM guards WHERE updated_at < ? AND locked_until < ?`, now - DAY, now);
  }

  guardClear(scope, key) {
    this.sql.exec(`DELETE FROM guards WHERE scope = ? AND key = ?`, scope, key);
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

    // 每位收件者拿到的是簽給自己的圖片網址，所以逐一送出
    await this.sendMessageToMembers(conversationId, 'message', row);
    this.notifyOffline(conversationId, me.id);
    if (type === 'text') {
      const url = firstHttpUrl(content);
      if (url) this.ctx.waitUntil(this.attachLinkPreview(row.id, conversationId, url));
    }
    const message = (await this.attachExtras([pubMessage(row)], me.id))[0];
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
      await this.sendMessageToMembers(
        conversationId, 'message-updated', { ...row, meta: JSON.stringify(meta) });
    } catch (e) {
      console.warn('link preview failed:', url, e && e.message);
    }
  }

  // 抓取網頁並解析 Open Graph／Twitter Card／<title>；沒有標題就不做卡片
  async fetchLinkPreview(url) {
    const { resp, finalUrl: landed } = await fetchSafeFollow(url, 6000, {
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
    const finalUrl = landed || url;

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

  // 圖片／語音簽章金鑰（與縮圖代理分開，互不牽連）
  async mediaKey() {
    if (this._mediaKey) return this._mediaKey;
    let secret = this.getSetting('media_secret');
    if (!secret) {
      secret = randomHex(32);
      this.setSetting('media_secret', secret);
    }
    this._mediaKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    return this._mediaKey;
  }

  // 圖片／語音的取用網址。<img src> 帶不了登入權杖，所以改用 HMAC 簽章，
  // 並把收件者綁進簽章裡；到期時間以「天」對齊，同一個人一整天拿到的網址
  // 都一樣，瀏覽器才快取得住（不然每次列訊息都會重抓一次圖）。
  async signMedia(messageId, userId) {
    const exp = (Math.floor(Date.now() / DAY) + MEDIA_TTL_DAYS) * DAY;
    const sig = await crypto.subtle.sign(
      'HMAC', await this.mediaKey(), new TextEncoder().encode(`${messageId}.${userId}.${exp}`));
    return `/api/media/${messageId}?u=${userId}&e=${exp}&s=${b64url(sig)}`;
  }

  // 供應訊息裡的圖片／語音。簽章只說明「這個網址指向哪一則訊息、是簽給誰的」，
  // 真正的授權仍然每次重新檢查：帳號還在、沒被停用、而且現在仍是該聊天室的成員。
  // 所以把人移出聊天室或停用帳號之後，舊網址會立刻失效。
  async serveMedia(request, url, messageId) {
    const uid = Number(url.searchParams.get('u'));
    const exp = Number(url.searchParams.get('e'));
    const sigBytes = fromB64url(url.searchParams.get('s') || '');
    if (!Number.isInteger(uid) || !Number.isFinite(exp) || !sigBytes || sigBytes.length !== 32)
      throw new HttpError(403, '簽章無效');
    if (exp < Date.now()) throw new HttpError(403, '網址已過期，請重新整理');
    const ok = await crypto.subtle.verify(
      'HMAC', await this.mediaKey(), sigBytes, new TextEncoder().encode(`${messageId}.${uid}.${exp}`));
    if (!ok) throw new HttpError(403, '簽章無效');

    const row = this.sql
      .exec(`SELECT * FROM messages WHERE id = ?`, messageId).toArray()[0];
    if (!row || row.deleted || (row.type !== 'image' && row.type !== 'audio'))
      throw new HttpError(404, '找不到這個檔案');
    const user = this.sql
      .exec(`SELECT id, disabled FROM users WHERE id = ?`, uid).toArray()[0];
    if (!user || user.disabled) throw new HttpError(403, '沒有權限');
    const member = this.sql
      .exec(`SELECT 1 AS ok FROM members WHERE conversation_id = ? AND user_id = ?`,
        row.conversation_id, uid).toArray()[0];
    if (!member) throw new HttpError(403, '沒有權限');

    const parsed = parseDataUrl(row.content);
    if (!parsed) throw new HttpError(404, '找不到這個檔案');
    const prefix = row.type === 'image' ? 'image/' : 'audio/';
    if (!parsed.mime.startsWith(prefix)) throw new HttpError(404, '找不到這個檔案');

    return new Response(parsed.bytes, {
      headers: {
        'content-type': parsed.mime,
        // 訊息內容不會變，簽章網址本身就帶版本資訊，可以放心長快取
        'cache-control': 'private, max-age=604800, immutable',
        'content-length': String(parsed.bytes.byteLength),
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'",
        'content-disposition': 'inline',
      },
    });
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
      ({ resp } = await fetchSafeFollow(target, 8000, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; CHAT-LinkPreview/1.0)', accept: 'image/*' },
      }));
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(502, '無法取得圖片');
    }
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
    this.closeFarmSockets(me.id, conversationId);
    if (remaining.length === 0) {
      this.sql.exec(`DELETE FROM messages WHERE conversation_id = ?`, conversationId);
      this.sql.exec(`DELETE FROM conversations WHERE id = ?`, conversationId);
      for (const t of ['farms', 'farm_tiles', 'farm_items', 'farm_players', 'farm_animals', 'farm_friends', 'farm_mined', 'farm_dex', 'farm_machines', 'farm_pets', 'farm_stats', 'farm_weekly', 'farm_achievements', 'farm_festival_play', 'farm_trees', 'farm_hives', 'farm_market_play', 'farm_beauty', 'farm_cave_mined', 'farm_cave_chests'])
        this.sql.exec(`DELETE FROM ${t} WHERE conversation_id = ?`, conversationId);
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

  // 下載聊天備份，分頁取：
  //   GET /api/admin/export            → 帳號、聊天室、成員與訊息總數（很小）
  //   GET /api/admin/export?after=<id> → 編號大於 id 的下一頁訊息，最多約 EXPORT_PAGE_BYTES
  // 原本一次把全部訊息（含照片）組成一個 JSON：100 張照片時伺服器多吃 219MB，
  // 超過 Cloudflare 每個執行環境 128MB 的上限，大約 50～60 張照片之後備份就會失敗。
  // 試過串流回應，但執行環境不會等瀏覽器讀完才要下一批（300 張照片 1.7 秒就全部排進去），
  // 記憶體一樣沒有上限；分頁則保證每次請求碰到的內容有固定上限，跟照片總數無關。
  exportData(url) {
    const afterParam = url.searchParams.get('after');
    if (afterParam === null) {
      return json({
        exportedAt: Date.now(),
        users: this.sql
          .exec(`SELECT id, username, display_name, status_message, avatar_color, is_admin, created_at FROM users`)
          .toArray(),
        conversations: this.sql.exec(`SELECT * FROM conversations`).toArray(),
        members: this.sql.exec(`SELECT * FROM members`).toArray(),
        farms: this.sql.exec(`SELECT * FROM farms`).toArray(),
        farmTiles: this.sql.exec(`SELECT * FROM farm_tiles`).toArray(),
        farmItems: this.sql.exec(`SELECT * FROM farm_items`).toArray(),
        farmAnimals: this.sql.exec(`SELECT * FROM farm_animals`).toArray(),
        farmFriends: this.sql.exec(`SELECT * FROM farm_friends`).toArray(),
        farmDex: this.sql.exec(`SELECT * FROM farm_dex`).toArray(),
        farmMachines: this.sql.exec(`SELECT * FROM farm_machines`).toArray(),
        farmPets: this.sql.exec(`SELECT * FROM farm_pets`).toArray(),
        farmStats: this.sql.exec(`SELECT * FROM farm_stats`).toArray(),
        farmAchievements: this.sql.exec(`SELECT * FROM farm_achievements`).toArray(),
        farmTrees: this.sql.exec(`SELECT * FROM farm_trees`).toArray(),
        farmHives: this.sql.exec(`SELECT * FROM farm_hives`).toArray(),
        farmBeauty: this.sql.exec(`SELECT * FROM farm_beauty`).toArray(),
        farmCave: this.sql.exec(`SELECT conversation_id, cave_best FROM farms WHERE cave_best > 0`).toArray(),
        messageCount: this.sql.exec(`SELECT COUNT(*) AS c FROM messages`).one().c,
      });
    }
    const after = Number(afterParam);
    if (!Number.isInteger(after) || after < 0) throw new HttpError(400, '參數錯誤');
    // 先只看每則的大小（不把內容讀進記憶體），湊到 EXPORT_PAGE_BYTES 為止。
    // 純文字一頁可以有很多則；照片一頁十幾張；GIF（最大 1.9MB）一頁只放幾張。
    const sizes = this.sql
      .exec(
        `SELECT id, length(content) + length(coalesce(meta, '')) AS n FROM messages
         WHERE id > ? ORDER BY id LIMIT ?`, after, EXPORT_MAX_ROWS)
      .toArray();
    if (!sizes.length) return json({ messages: [], next: null });
    let used = 0;
    let upto = 0;
    let taken = 0;
    for (const r of sizes) {
      if (taken && used + r.n > EXPORT_PAGE_BYTES) break; // 至少放一則，單則最大也才 1.9MB
      used += r.n;
      upto = r.id;
      taken++;
    }
    const messages = this.sql
      .exec(`SELECT * FROM messages WHERE id > ? AND id <= ? ORDER BY id`, after, upto)
      .toArray();
    const more = taken < sizes.length || sizes.length === EXPORT_MAX_ROWS;
    return json({ messages, next: more ? upto : null });
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
      pinned = row;
      this.addSystemMessage(conversationId, `${me.display_name} 設定了新公告`);
    }
    for (const uid of this.memberIds(conversationId)) {
      const forUser = pinned ? (await this.attachExtras([pubMessage(pinned)], uid))[0] : null;
      this.sendToUsers([uid], { type: 'pin', conversationId, pinned: forUser });
    }
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
    this.closeFarmSockets(userId);
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
    this.closeFarmSockets(userId);
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
    // 牧場視窗：只收這座牧場的事件（大家走來走去、田地變化），不收聊天訊息
    const farmId = Number(new URL(request.url).searchParams.get('farm')) || 0;
    if (farmId) {
      if (!this.memberOf(farmId, user.id)) return new Response('Forbidden', { status: 403 });
      this.ctx.acceptWebSocket(server, [`f:${farmId}`, `fu:${user.id}`]);
      server.serializeAttachment({ userId: user.id, farm: farmId, x: FARM_SPAWN.x, y: FARM_SPAWN.y, d: 'd', a: 'farm' });
      // 告訴新來的人，現在誰在牧場、站在哪裡
      const here = [];
      for (const ws of this.ctx.getWebSockets(`f:${farmId}`)) {
        const a = ws.deserializeAttachment();
        if (a && ws !== server && a.userId !== user.id) here.push({ userId: a.userId, x: a.x, y: a.y, d: a.d, a: a.a || 'farm' });
      }
      queueMicrotask(() => { try { server.send(JSON.stringify({ type: 'farm-presence', players: here })); } catch {} });
    } else {
      this.ctx.acceptWebSocket(server, [`u:${user.id}`]);
      server.serializeAttachment({ userId: user.id });
    }

    const headers = {};
    if (protocols.includes('cim.v1')) headers['Sec-WebSocket-Protocol'] = 'cim.v1';
    return new Response(null, { status: 101, webSocket: client, headers });
  }

  // 客戶端到伺服器一律走 HTTP API；"ping" 由 auto-response 處理。
  // 唯一例外是牧場的「我走到哪了」：每秒好幾次、不存資料庫，只轉給同一座牧場的其他人
  webSocketMessage(ws, raw) {
    const a = ws.deserializeAttachment();
    if (!a || !a.farm || typeof raw !== 'string' || raw.length > 200) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || msg.t !== 'pos') return;
    const x = Number(msg.x), y = Number(msg.y);
    const d = ['u', 'd', 'l', 'r'].includes(msg.d) ? msg.d : 'd';
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > FARM_W || y > FARM_H) return;
    const area = isAreaKey(msg.a) ? msg.a : 'farm'; // 在哪張地圖（溫室比較小、洞窟每一層是 cave1～cave20，也在這個範圍內）
    ws.serializeAttachment({ ...a, x, y, d, a: area });
    const out = JSON.stringify({ type: 'farm-pos', userId: a.userId, x, y, d, a: area, m: !!msg.m });
    for (const other of this.ctx.getWebSockets(`f:${a.farm}`)) {
      if (other !== ws) { try { other.send(out); } catch {} }
    }
  }

  webSocketClose(ws) {
    const a = ws.deserializeAttachment();
    if (a && a.farm) {
      const still = this.ctx.getWebSockets(`f:${a.farm}`)
        .some((o) => o !== ws && (o.deserializeAttachment() || {}).userId === a.userId);
      if (!still) this.sendToFarm(a.farm, { type: 'farm-leave', userId: a.userId }, ws);
    }
    // 客戶端發起關閉時，伺服器須回應 close 以完成握手，
    // 否則客戶端會永遠卡在 CLOSING 狀態
    try {
      ws.close(1000);
    } catch {}
  }

  webSocketError() {}

  // ---------- 家族小牧場 ----------
  // 規則在 src/farm.js；這裡負責存取資料、檢查權限、通知同一座牧場的人

  // 時間倍率：只給本機測試用（wrangler dev --var FARM_TIME_SCALE:3600 → 1 秒＝1 小時）。
  // 正式環境沒有設定，永遠是 1
  farmScale() {
    const s = Number(this.env && this.env.FARM_TIME_SCALE);
    return Number.isFinite(s) && s >= 1 ? Math.min(s, 100000) : 1;
  }

  // 季節與天氣跟著現實走。FARM_SEASON／FARM_WEATHER 也只給本機測試用，
  // 例如 --var FARM_SEASON:winter --var FARM_WEATHER:rain 看冬天下雨的畫面
  farmSeason(now) {
    const o = this.env && this.env.FARM_SEASON;
    return SEASONS.includes(o) ? o : seasonOf(now);
  }
  farmWeather(day) {
    const o = this.env && this.env.FARM_WEATHER;
    return WEATHERS.includes(o) ? o : weatherOf(day);
  }
  // FARM_REQUEST 也只給本機測試用：指定今天的委託，例如 jie,crop:bokchoy,1（村民,東西,數量）
  farmRequest(today) {
    const o = this.env && this.env.FARM_REQUEST;
    if (typeof o === 'string' && o) {
      const [villager, item, qty] = o.split(',');
      if (Object.hasOwn(VILLAGERS, villager) && Number(qty) > 0) return { villager, item, qty: Number(qty), reward: 100 };
    }
    return requestOf(today);
  }
  // FARM_FESTIVAL 也只給本機測試用：假裝今天是某個節日，例如 moon（中秋節）
  farmFestival(today) {
    const o = this.env && this.env.FARM_FESTIVAL;
    if (typeof o === 'string' && Object.hasOwn(FESTIVALS, o)) return o;
    return festivalOn(today);
  }
  // 節慶禮物說明：「888 元、2 個年糕」
  farmGiftText(g) {
    return [g.money ? `${g.money} 元` : null, g.item ? `${g.qty} 個${itemName(g.item)}` : null].filter(Boolean).join('、');
  }
  // FARM_START_MONEY 也只給本機測試用：新開的牧場一開始有多少錢（測試買工具升級用）
  farmStartMoney() {
    const m = Number(this.env && this.env.FARM_START_MONEY);
    return Number.isInteger(m) && m > 0 ? Math.min(m, 10000000) : START_MONEY;
  }
  // FARM_START_ITEMS 也只給本機測試用：新牧場多放一些東西，例如 ore:copper*20,prod:egg_l*5
  farmStartItems() {
    const o = this.env && this.env.FARM_START_ITEMS;
    if (typeof o !== 'string' || !o) return [];
    return o.split(',').map((x) => x.split('*')).map(([item, q]) => [item, Number(q)])
      .filter(([item, q]) => itemPrice(item) > 0 && Number.isInteger(q) && q > 0 && q <= 999);
  }
  // FARM_START_LOVE 也只給本機測試用：某種動物買來就很喜歡你，例如 duck:20（測試生寶寶）
  farmStartLove(kind) {
    const o = this.env && this.env.FARM_START_LOVE;
    if (typeof o !== 'string') return 0;
    const hit = o.split(',').map((x) => x.split(':')).find(([k]) => k === kind);
    const n = hit ? Number(hit[1]) : 0;
    return Number.isInteger(n) && n > 0 ? Math.min(LOVE_MAX, n) : 0;
  }
  // FARM_START_FRIEND 也只給本機測試用：跟某位村民一開始就有感情，例如 lin:50（測試村民的故事）
  farmStartFriend(villager) {
    const o = this.env && this.env.FARM_START_FRIEND;
    if (typeof o !== 'string') return 0;
    const hit = o.split(',').map((x) => x.split(':')).find(([k]) => k === villager);
    const n = hit ? Number(hit[1]) : 0;
    return Number.isInteger(n) && n > 0 ? Math.min(FRIEND_MAX, n) : 0;
  }
  // FARM_WEEK 也只給本機測試用：假裝現在是哪一週（例如 2099-01-05），測試換週時的週報
  farmWeek(today) {
    const o = this.env && this.env.FARM_WEEK;
    return weekStart(typeof o === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o) ? o : today);
  }
  // FARM_FAST_TREES 也只給本機測試用：果樹幾個（遊戲）小時就長大、再結果，蜂箱幾小時就有蜜
  farmFastTrees() {
    const n = Number(this.env && this.env.FARM_FAST_TREES);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  // FARM_START_CAVE 也只給本機測試用：新開的牧場洞窟已經到過第幾層（測試礦車、最深處的寶箱）
  farmStartCave() {
    const n = Number(this.env && this.env.FARM_START_CAVE);
    return Number.isInteger(n) && n >= 0 && n <= CAVE_FLOORS ? n : 0;
  }
  // FARM_NIGHT_MARKET=open／closed 也只給本機測試用：不管今天星期幾，夜市都開著／都沒開
  farmMarketOpen(now) {
    const o = this.env && this.env.FARM_NIGHT_MARKET;
    return o === 'open' ? true : o === 'closed' ? false : isNightMarket(now);
  }
  // FARM_VILLAGERS=out／home 也只給本機測試用：不管幾點，村民都在外面／都在家
  farmVillagersOut(now) {
    const o = this.env && this.env.FARM_VILLAGERS;
    if (o !== 'out' && this.farmWeather(taiwanDay(now)) === 'typhoon') return false; // 颱風天大家都待在家裡
    return o === 'out' ? true : o === 'home' ? false : villagerOut(now);
  }
  farmRainy() {
    const o = this.env && this.env.FARM_WEATHER;
    if (WEATHERS.includes(o)) return isWetWeather(o) ? () => true : NO_RAIN;
    return realRain;
  }

  ensureFarm(conversationId, me) {
    const f = this.sql.exec(`SELECT * FROM farms WHERE conversation_id = ?`, conversationId).toArray()[0];
    if (f) return f;
    const now = Date.now();
    const row = this.sql
      .exec(`INSERT INTO farms (conversation_id, money, created_by, created_at, season_seen, cave_best)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        conversationId, this.farmStartMoney(), me.id, now, this.farmSeason(now), this.farmStartCave())
      .one();
    for (const [item, qty] of Object.entries(START_ITEMS)) this.farmAddItem(conversationId, item, qty);
    for (const [item, qty] of this.farmStartItems()) this.farmAddItem(conversationId, item, qty);
    this.addSystemMessage(conversationId, `${me.display_name} 開墾了家族牧場 🌾`);
    return row;
  }

  farmItems(conversationId) {
    const out = {};
    for (const r of this.sql.exec(`SELECT item, qty FROM farm_items WHERE conversation_id = ?`, conversationId))
      out[r.item] = r.qty;
    return out;
  }

  farmAddItem(conversationId, item, delta) {
    this.sql.exec(
      `INSERT INTO farm_items (conversation_id, item, qty) VALUES (?, ?, ?)
       ON CONFLICT(conversation_id, item) DO UPDATE SET qty = qty + excluded.qty`,
      conversationId, item, delta);
    this.sql.exec(`DELETE FROM farm_items WHERE conversation_id = ? AND item = ? AND qty <= 0`, conversationId, item);
  }

  // 體力：每人每天（台灣時間）max 點（房子擴建後變多），隔天自動恢復
  farmPlayer(conversationId, userId, now, max = ENERGY_MAX) {
    const today = taiwanDay(now);
    let p = this.sql
      .exec(`SELECT * FROM farm_players WHERE conversation_id = ? AND user_id = ?`, conversationId, userId)
      .toArray()[0];
    if (!p || p.energy_day !== today) {
      this.sql.exec(
        `INSERT INTO farm_players (conversation_id, user_id, energy, energy_day) VALUES (?, ?, ?, ?)
         ON CONFLICT(conversation_id, user_id) DO UPDATE SET energy = excluded.energy, energy_day = excluded.energy_day`,
        conversationId, userId, max, today);
      p = { conversation_id: conversationId, user_id: userId, energy: max, energy_day: today };
    }
    return p;
  }

  // 送給前端的田地：progress 是「到 now 為止」的成長量（含下雨天），
  // wetUntil 是土會一直濕到什麼時候，前端用這兩個自己往後推算
  farmTilePub(t, now, scale, rainy) {
    rainy = this.tileRain(t.x, t.y, rainy);
    return {
      x: t.x, y: t.y, tilled: !!t.tilled, crop: t.crop || null,
      stage: t.crop ? cropStage(t, now, scale, rainy) : -1,
      progress: t.crop ? grownMs(t, now, scale, rainy) : 0,
      total: t.crop ? cropTotalMs(t.crop) : 0,
      wetUntil: t.tilled ? wetUntilOf(t.watered_until || 0, now, rainy) : 0,
    };
  }

  // 溫室裡的田雨淋不到：天氣永遠當作沒下雨
  tileRain(x, y, rainy) {
    return fieldArea(x, y) === 'gh' ? NO_RAIN : rainy;
  }

  // 加工機：買了哪幾台、正在做什麼、什麼時候好
  farmMachinesPub(conversationId, scale) {
    const out = {};
    for (const m of this.sql.exec(`SELECT * FROM farm_machines WHERE conversation_id = ?`, conversationId)) {
      if (!Object.hasOwn(MACHINES, m.kind)) continue;
      out[m.kind] = m.input
        ? { input: m.input, output: `good:${MACHINES[m.kind].makes[m.input]}`, qty: m.qty, readyAt: machineReadyAt(m, scale) }
        : { input: null };
    }
    return out;
  }
  // 房子、溫室、加工機用的材料：錢＋倉庫裡的礦石。先全部檢查夠不夠，再一起扣
  farmPay(conversationId, price, need) {
    const items = this.farmItems(conversationId);
    const lack = Object.entries(need).filter(([i, q]) => (items[i] || 0) < q).map(([i, q]) => `${itemName(i)} ${items[i] || 0}/${q}`);
    if (lack.length) throw new HttpError(400, `材料不夠：${lack.join('、')}（礦石在後山的採石場挖）`);
    this.farmSpend(conversationId, price);
    for (const [i, q] of Object.entries(need)) this.farmAddItem(conversationId, i, -q);
  }
  // 颱風：前一天在聊天室預報；當天第一次有人打開或動作時，外面田裡熟了沒收的作物被吹倒（溫室裡的沒事）
  farmTyphoon(conversationId, farm, now, scale, rainy) {
    const today = taiwanDay(now);
    const tomorrow = taiwanDay(dayEndOf(now));
    if (this.farmWeather(tomorrow) === 'typhoon' && farm.typhoon_warned !== today && this.farmWeather(today) !== 'typhoon') {
      this.sql.exec(`UPDATE farms SET typhoon_warned = ? WHERE conversation_id = ?`, today, conversationId);
      farm.typhoon_warned = today;
      this.addSystemMessage(conversationId, '🌀 氣象報告：明天颱風要來！外面田裡熟了的作物記得今天先收起來，溫室裡的不用擔心');
    }
    if (this.farmWeather(today) !== 'typhoon' || farm.typhoon_seen === today) return [];
    this.sql.exec(`UPDATE farms SET typhoon_seen = ? WHERE conversation_id = ?`, today, conversationId);
    farm.typhoon_seen = today;
    const blown = [];
    for (const t of this.sql.exec(`SELECT * FROM farm_tiles WHERE conversation_id = ? AND crop IS NOT NULL`, conversationId).toArray()) {
      if (fieldArea(t.x, t.y) !== 'farm' || cropStage(t, now, scale, rainy) < 3) continue;
      blown.push(CROPS[t.crop] ? CROPS[t.crop].name : t.crop);
      this.sql.exec(`UPDATE farm_tiles SET crop = NULL, progress_ms = 0, tick_at = ? WHERE conversation_id = ? AND x = ? AND y = ?`,
        now, conversationId, t.x, t.y);
    }
    this.addSystemMessage(conversationId, blown.length
      ? `🌀 颱風來了！外面田裡 ${blown.length} 顆熟了還沒收的作物被吹倒了（${[...new Set(blown)].join('、')}）。今天村民都待在家裡，後山也別去喔`
      : '🌀 颱風來了！還好田裡熟的作物都收好了。今天村民都待在家裡，後山也別去喔');
    return blown;
  }
  // 全家的累計數字（收成次數、出貨賺的錢、完成的委託、生的寶寶）
  farmStat(conversationId, key, delta) {
    this.sql.exec(`INSERT INTO farm_stats (conversation_id, key, value) VALUES (?, ?, ?)
      ON CONFLICT(conversation_id, key) DO UPDATE SET value = value + excluded.value`, conversationId, key, delta);
  }
  // 算成就要用的數字：累計＋現在的牧場（動物、寵物、圖鑑、感情、建築、加工機、聽過的故事）
  farmStatsSnapshot(conversationId) {
    const st = {};
    for (const r of this.sql.exec(`SELECT key, value FROM farm_stats WHERE conversation_id = ?`, conversationId)) st[r.key] = r.value;
    const one = (q, ...a) => this.sql.exec(q, ...a).one().n;
    const dex = this.farmDex(conversationId);
    const pts = Object.keys(VILLAGERS).map((id) => this.farmFriendRow(conversationId, id));
    const farm = this.sql.exec(`SELECT gh_built, house_level FROM farms WHERE conversation_id = ?`, conversationId).one();
    return {
      harvest: st.harvest || 0, shipped: st.shipped || 0, requests: st.requests || 0, babies: st.babies || 0,
      animals: one(`SELECT COUNT(*) AS n FROM farm_animals WHERE conversation_id = ?`, conversationId),
      pets: one(`SELECT COUNT(*) AS n FROM farm_pets WHERE conversation_id = ?`, conversationId),
      machines: one(`SELECT COUNT(*) AS n FROM farm_machines WHERE conversation_id = ?`, conversationId),
      fishKinds: dex.filter((i) => i.startsWith('fish:')).length, dishKinds: dex.filter((i) => i.startsWith('dish:')).length,
      goodKinds: dex.filter((i) => i.startsWith('good:')).length, amethyst: dex.includes('ore:amethyst'),
      maxHearts: Math.max(...pts.map((f) => friendHearts(f.points))), minHearts: Math.min(...pts.map((f) => friendHearts(f.points))),
      stories: pts.reduce((n, f) => n + (f.story_level || 0), 0), gh: farm.gh_built, house: farm.house_level,
      trees: one(`SELECT COUNT(*) AS n FROM farm_trees WHERE conversation_id = ?`, conversationId),
      honey: dex.includes('prod:honey') || dex.includes('prod:honey_l'),
      goldfish3: st.goldfish3 || 0, beautyWin: st.beauty_win || 0, harvestGold: st.harvest_gold || 0,
      caveBest: one(`SELECT cave_best AS n FROM farms WHERE conversation_id = ?`, conversationId), caveBottom: st.cave_bottom || 0,
      gems: ['ore:ruby', 'ore:sapphire', 'ore:diamond'].filter((i) => dex.includes(i)).length,
    };
  }
  // 新達成的成就：記下來、發獎金、在聊天室說一聲
  farmCheckAchievements(conversationId, me, now) {
    const have = new Set(this.sql.exec(`SELECT id FROM farm_achievements WHERE conversation_id = ?`, conversationId).toArray().map((r) => r.id));
    const fresh = achievementsMet(this.farmStatsSnapshot(conversationId)).filter((id) => !have.has(id));
    return fresh.map((id) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      this.sql.exec(`INSERT INTO farm_achievements (conversation_id, id, by_user, at) VALUES (?, ?, ?, ?)`, conversationId, id, me.id, now);
      this.sql.exec(`UPDATE farms SET money = money + ? WHERE conversation_id = ?`, a.reward, conversationId);
      this.addSystemMessage(conversationId, `🏆 家族牧場達成成就「${a.name}」（${a.desc}）！${me.display_name} 幫全家拿到獎勵 ${a.reward} 元`);
      return { id, name: a.name, reward: a.reward };
    });
  }
  farmAchievementsGot(conversationId) {
    const names = this.userNames();
    const out = {};
    for (const r of this.sql.exec(`SELECT id, by_user, at FROM farm_achievements WHERE conversation_id = ?`, conversationId))
      out[r.id] = { by: names.get(r.by_user) || null, at: r.at };
    return out;
  }
  // 這一週到現在的紀錄（成就畫面的「本週」）與週報的資料
  farmWeekSummary(conversationId, week) {
    const rows = this.sql.exec(`SELECT user_id, actions, harvest, shipped FROM farm_weekly WHERE conversation_id = ? AND week = ?`,
      conversationId, week).toArray();
    const names = this.userNames();
    const top = rows.slice().sort((a, b) => b.actions - a.actions)[0];
    const from = Date.parse(week + 'T00:00:00Z') - 8 * 3600000, to = from + 7 * 86400000;
    return {
      week,
      actions: rows.reduce((n, r) => n + r.actions, 0), harvest: rows.reduce((n, r) => n + r.harvest, 0),
      shipped: rows.reduce((n, r) => n + r.shipped, 0),
      top: top ? { name: names.get(top.user_id) || '家人', actions: top.actions } : null,
      achievements: this.sql.exec(`SELECT id FROM farm_achievements WHERE conversation_id = ? AND at >= ? AND at < ? ORDER BY at`,
        conversationId, from, to).toArray().map((r) => (ACHIEVEMENTS.find((a) => a.id === r.id) || { name: r.id }).name),
      dex: this.sql.exec(`SELECT item FROM farm_dex WHERE conversation_id = ? AND at >= ? AND at < ? ORDER BY at`, conversationId, from, to)
        .toArray().map((r) => itemName(r.item)),
    };
  }
  // 今天的節慶活動（沒有就 null）、我玩過了沒；元宵給我的 3 題燈謎（不給答案）
  farmActivityPub(conversationId, me, fest, today) {
    const A = fest && FESTIVAL_ACTIVITIES[fest];
    if (!A) return null;
    const played = this.sql.exec(`SELECT score FROM farm_festival_play WHERE conversation_id = ? AND day = ? AND user_id = ?`,
      conversationId, today, me.id).toArray()[0];
    return {
      festival: fest, ...A, played: !!played, beats: BOAT_BEATS, sticks: BBQ_STICKS,
      riddles: A.kind === 'riddle' ? riddlesFor(today, me.id).map((i) => ({ q: RIDDLES[i].q, c: RIDDLES[i].c })) : undefined,
    };
  }
  // 果樹：每個位置種了什麼、長大了沒、下次什麼時候可以摘（不是它的季節＝0）
  farmTreesPub(conversationId, season, scale) {
    const fast = this.farmFastTrees();
    return this.sql.exec(`SELECT * FROM farm_trees WHERE conversation_id = ?`, conversationId).toArray()
      .filter((t) => Object.hasOwn(TREES, t.kind) && TREE_SPOTS[t.spot])
      .map((t) => ({ spot: t.spot, kind: t.kind, plantedAt: t.planted_at, matureAt: treeMatureAt(t, scale, fast), readyAt: treeReadyAt(t, season, scale, fast) }));
  }
  // 蜂箱：下次什麼時候有蜜、會是哪一種（有長大的龍眼樹＝龍眼蜜）
  farmHivesPub(conversationId, scale, now) {
    const fast = this.farmFastTrees();
    const kind = this.farmHoneyKind(conversationId, scale, now);
    return this.sql.exec(`SELECT * FROM farm_hives WHERE conversation_id = ?`, conversationId).toArray()
      .filter((h) => HIVE_SPOTS[h.spot]).map((h) => ({ spot: h.spot, readyAt: hiveReadyAt(h, scale, fast), honey: kind }));
  }
  farmHoneyKind(conversationId, scale, now) {
    const fast = this.farmFastTrees();
    const longan = this.sql.exec(`SELECT * FROM farm_trees WHERE conversation_id = ? AND kind = 'longan'`, conversationId).toArray()
      .some((t) => now >= treeMatureAt(t, scale, fast));
    return longan ? 'honey_l' : 'honey';
  }
  // 夜市：開了沒、攤位、小吃、這週的限定商品、我今晚玩過哪些
  farmMarketPub(conversationId, me, now, week) {
    const day = taiwanDay(now);
    const played = this.sql.exec(`SELECT stall FROM farm_market_play WHERE conversation_id = ? AND day = ? AND user_id = ?`, conversationId, day, me.id)
      .toArray().map((r) => r.stall);
    const o = this.env && this.env.FARM_NIGHT_MARKET;
    return { open: this.farmMarketOpen(now), override: o === 'open' || o === 'closed' ? o : null, stalls: MARKET_STALLS, zone: MARKET_ZONE, foods: NIGHT_FOODS,
      specials: specialsOf(week), played, goldfishMax: GOLDFISH_MAX, ringThrows: RING_THROWS };
  }
  // 洞窟的某一層（今天）：還剩哪些石頭、往下的梯子挖出來了沒、寶箱開了沒；地圖上 v 是梯子、C 是寶箱
  farmCaveFloorPub(conversationId, today, floor) {
    const f = caveFloor(conversationId, today, floor);
    const mined = new Set(this.sql.exec(`SELECT x, y FROM farm_cave_mined WHERE conversation_id = ? AND day = ? AND floor = ?`,
      conversationId, today, floor).toArray().map((r) => `${r.x},${r.y}`));
    const ladder = f.ladder && mined.has(`${f.ladder.x},${f.ladder.y}`) ? f.ladder : null;
    const opened = !!f.chest && this.sql.exec(`SELECT 1 FROM farm_cave_chests WHERE conversation_id = ? AND day = ? AND floor = ?`,
      conversationId, today, floor).toArray().length > 0;
    const map = CAVE_LAYOUTS[f.layout].map((row, y) => [...row].map((c, x) => (ladder && ladder.x === x && ladder.y === y ? 'v'
      : f.chest && f.chest.x === x && f.chest.y === y ? 'C' : c)).join(''));
    return { floor, tier: caveTier(floor), map, rocks: f.rocks.filter((r) => !mined.has(`${r.x},${r.y}`)), ladder,
      chest: f.chest ? { ...f.chest, opened } : null, up: CAVE_UP, arrive: CAVE_ARRIVE, last: floor === CAVE_FLOORS };
  }
  // 今天進得去這一層嗎：第 1 層隨時可以；礦車站要曾經到過；其他的要今天有人在上一層挖到往下的梯子
  farmCaveCanEnter(conversationId, today, floor, best) {
    if (floor === 1 || (CAVE_STOPS.includes(floor) && best >= floor)) return true;
    const up = caveFloor(conversationId, today, floor - 1).ladder;
    return !!up && this.sql.exec(`SELECT 1 FROM farm_cave_mined WHERE conversation_id = ? AND day = ? AND floor = ? AND x = ? AND y = ?`,
      conversationId, today, floor - 1, up.x, up.y).toArray().length > 0;
  }
  // 動物選美：這週報名了誰、上一次的結果
  farmBeautyPub(conversationId, week) {
    const cur = this.sql.exec(`SELECT animal_id, animal_name, kind FROM farm_beauty WHERE conversation_id = ? AND week = ?`, conversationId, week).toArray()[0];
    const last = this.sql.exec(`SELECT week, animal_name, kind, place FROM farm_beauty WHERE conversation_id = ? AND decided = 1 ORDER BY week DESC LIMIT 1`, conversationId).toArray()[0];
    return { week, entry: cur ? { animalId: cur.animal_id, name: cur.animal_name, kind: cur.kind } : null,
      last: last ? { week: last.week, name: last.animal_name, kind: last.kind, place: last.place } : null, rivals: BEAUTY_RIVALS };
  }
  // 過了那一週的動物選美就評審：在聊天室公布名次、發獎金
  farmJudgeBeauty(conversationId, week) {
    let judged = false;
    for (const e of this.sql.exec(`SELECT * FROM farm_beauty WHERE conversation_id = ? AND decided = 0 AND week < ?`, conversationId, week).toArray()) {
      // 報名後這週繼續照顧，愛心會算到評審那天（動物不在了就用報名時的）
      const cur = this.sql.exec(`SELECT love FROM farm_animals WHERE id = ? AND conversation_id = ?`, e.animal_id, conversationId).toArray()[0];
      const res = beautyResult(e.week, conversationId, { ...e, love: cur ? Math.max(cur.love, e.love) : e.love });
      this.sql.exec(`UPDATE farm_beauty SET decided = 1, place = ? WHERE conversation_id = ? AND week = ?`, res.place, conversationId, e.week);
      if (res.place === 1) this.farmStat(conversationId, 'beauty_win', 1);
      judged = true;
      this.sql.exec(`UPDATE farms SET money = money + ? WHERE conversation_id = ?`, res.prize, conversationId);
      const others = res.rivals.map((r) => `${r.owner}的${r.name} ${r.score} 分`).join('、');
      this.addSystemMessage(conversationId, `🎀 動物選美結果：${e.animal_name}（${ANIMALS[e.kind] ? ANIMALS[e.kind].name : ''}）得了 ${res.score} 分，`
        + `第 ${res.place} 名！（${others}）獎金 ${res.prize} 元`);
    }
    return judged;
  }
  farmBuildPub(farm) {
    return { ghBuilt: !!farm.gh_built, houseLevel: farm.house_level, energyMax: energyMaxOf(farm.house_level) };
  }

  farmAnimalRows(conversationId) {
    return this.sql.exec(`SELECT * FROM farm_animals WHERE conversation_id = ? ORDER BY id`, conversationId).toArray();
  }

  // 送給前端的動物：readyAt 是這次產品好的時間（0＝還沒餵或已經收了）
  farmAnimalPub(a, scale, today) {
    return {
      id: a.id, kind: a.kind, name: a.name, love: a.love, hearts: hearts(a.love),
      fedToday: a.fed_day === today, pettedToday: a.petted_day === today,
      readyAt: a.fed_at && !a.collected ? animalReadyAt(a, scale) : 0,
      product: productOf(a.kind, a.love),
      babyUntil: isBaby(a, Date.now()) ? a.baby_until : 0,
    };
  }
  // 寵物：名字、愛心、今天摸過了沒、跟著誰
  farmPetsPub(conversationId, today) {
    const out = {};
    for (const p of this.sql.exec(`SELECT * FROM farm_pets WHERE conversation_id = ?`, conversationId)) {
      if (!Object.hasOwn(PETS, p.kind)) continue;
      out[p.kind] = { name: p.name, love: p.love, hearts: hearts(p.love), pettedToday: p.petted_day === today, follow: p.follow_user || null };
    }
    return out;
  }

  // ---- 小鎮 ----
  farmFriendRow(conversationId, villager) {
    return this.sql.exec(`SELECT * FROM farm_friends WHERE conversation_id = ? AND villager = ?`, conversationId, villager)
      .toArray()[0] || { conversation_id: conversationId, villager, points: this.farmStartFriend(villager), talk_day: '', gift_day: '', reward_level: 0, story_level: 0 };
  }
  farmSaveFriend(f) {
    this.sql.exec(
      `INSERT INTO farm_friends (conversation_id, villager, points, talk_day, gift_day, reward_level, story_level) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(conversation_id, villager) DO UPDATE SET points = excluded.points, talk_day = excluded.talk_day,
         gift_day = excluded.gift_day, reward_level = excluded.reward_level, story_level = excluded.story_level`,
      f.conversation_id, f.villager, f.points, f.talk_day, f.gift_day, f.reward_level, f.story_level || 0);
  }
  // 加減感情；每到 2、4、6、8、10 顆愛心送一次謝禮，並在聊天室說一聲
  farmFriendAdd(conversationId, f, delta) {
    f.points = Math.max(0, Math.min(FRIEND_MAX, f.points + delta));
    const level = Math.floor(friendHearts(f.points) / 2);
    const rewards = [];
    while (f.reward_level < level) {
      f.reward_level++;
      const r = friendReward(f.villager, f.reward_level);
      const v = VILLAGERS[f.villager];
      let what;
      if (r.money) {
        this.sql.exec(`UPDATE farms SET money = money + ? WHERE conversation_id = ?`, r.money, conversationId);
        what = `${r.money} 元`;
      } else {
        this.farmAddItem(conversationId, r.item, r.qty);
        what = r.item === 'feed' ? `${r.qty} 包飼料` : `${r.qty} 包${CROPS[r.item.slice(5)].name}種子`;
      }
      rewards.push({ villager: f.villager, ...r });
      this.addSystemMessage(conversationId, `💌 ${v.name}很喜歡你們家（❤️×${f.reward_level * 2}），送了${what}`);
    }
    return rewards;
  }
  farmFriendsPub(conversationId, today) {
    const out = {};
    for (const id of Object.keys(VILLAGERS)) {
      const f = this.farmFriendRow(conversationId, id);
      out[id] = { points: f.points, hearts: friendHearts(f.points), talkedToday: f.talk_day === today, giftedToday: f.gift_day === today,
        storyLevel: f.story_level || 0 };
    }
    return out;
  }
  // 送給前端的村民資料：喜歡什麼不告訴你，要自己送送看
  farmVillagersPub() {
    const out = {};
    for (const [id, v] of Object.entries(VILLAGERS)) {
      out[id] = { name: v.name, role: v.role, color: v.color, hair: v.hair, birthday: v.birthday, zone: v.zone, lines: v.lines };
    }
    return out;
  }
  farmTownPub(conversationId, today) {
    const farm = this.sql.exec(`SELECT * FROM farms WHERE conversation_id = ?`, conversationId).one();
    return {
      friends: this.farmFriendsPub(conversationId, today),
      request: { ...this.farmRequest(today), done: farm.request_day === today },
      tools: { hoe: farm.hoe_level, can: farm.can_level },
      festivalClaimed: farm.festival_claim === today,
    };
  }
  // 後山：今天還在的石頭
  farmRocks(conversationId, today) {
    const mined = new Set(this.sql.exec(`SELECT x, y FROM farm_mined WHERE conversation_id = ? AND day = ?`, conversationId, today)
      .toArray().map((r) => `${r.x},${r.y}`));
    return rocksOf(conversationId, today).filter((r) => !mined.has(`${r.x},${r.y}`));
  }
  farmDex(conversationId) {
    return this.sql.exec(`SELECT item FROM farm_dex WHERE conversation_id = ?`, conversationId).toArray().map((r) => r.item);
  }
  // 第一次拿到某種魚／礦石：記進圖鑑，在聊天室說一聲（破鞋子、石頭就不說了）
  // quiet：已經有別的訊息說過了（例如夜市撈到金魚），就不再說「第一次釣到」
  farmDexAdd(conversationId, item, me, now, quiet = false) {
    const had = this.sql.exec(`SELECT 1 FROM farm_dex WHERE conversation_id = ? AND item = ?`, conversationId, item).toArray().length;
    if (had) return false;
    this.sql.exec(`INSERT INTO farm_dex (conversation_id, item, by_user, at) VALUES (?, ?, ?, ?)`, conversationId, item, me.id, now);
    if (quiet) return true;
    if (item.startsWith('dish:')) {
      this.addSystemMessage(conversationId, `🍳 ${me.display_name} 第一次做了${itemName(item)}！今天晚餐要不要也吃這個？`);
    } else if (item.startsWith('good:')) {
      this.addSystemMessage(conversationId, `🫙 ${me.display_name} 第一次做出了${itemName(item)}！`);
    } else if (item.startsWith('fruit:')) {
      this.addSystemMessage(conversationId, `🌳 ${me.display_name} 摘到了第一批${itemName(item)}！`);
    } else if (item.startsWith('prod:honey')) {
      this.addSystemMessage(conversationId, `🍯 ${me.display_name} 收到了第一罐${itemName(item)}！`);
    } else if (item !== 'fish:junk' && item !== 'ore:stone') {
      const fish = item.startsWith('fish:');
      this.addSystemMessage(conversationId, `${fish ? '🎣' : '⛏️'} ${me.display_name} 第一次${fish ? '釣到' : '挖到'}了${itemName(item)}！`);
    }
    return true;
  }

  farmDishes(me, conversationId) {
    this.requireMember(conversationId, me.id);
    const names = this.userNames();
    const dishes = this.sql
      .exec(`SELECT item, by_user, at FROM farm_dex WHERE conversation_id = ? AND item LIKE 'dish:%' ORDER BY at`, conversationId)
      .toArray()
      .filter((r) => Object.hasOwn(DISHES, r.item.slice(5)))
      .map((r) => ({ id: r.item.slice(5), name: DISHES[r.item.slice(5)].name, by: names.get(r.by_user) || null, at: r.at }));
    return json({ dishes });
  }

  farmTileRow(conversationId, x, y, now) {
    return this.sql
      .exec(`SELECT * FROM farm_tiles WHERE conversation_id = ? AND x = ? AND y = ?`, conversationId, x, y)
      .toArray()[0] || { conversation_id: conversationId, x, y, tilled: 0, crop: null, progress_ms: 0, tick_at: now, watered_until: 0 };
  }
  farmSaveTile(conversationId, t) {
    this.sql.exec(
      `INSERT INTO farm_tiles (conversation_id, x, y, tilled, crop, progress_ms, tick_at, watered_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(conversation_id, x, y) DO UPDATE SET tilled = excluded.tilled, crop = excluded.crop,
         progress_ms = excluded.progress_ms, tick_at = excluded.tick_at, watered_until = excluded.watered_until`,
      conversationId, t.x, t.y, t.tilled, t.crop, t.progress_ms, t.tick_at, t.watered_until);
  }

  sendToFarm(conversationId, event, except = null) {
    const str = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets(`f:${conversationId}`)) {
      if (ws !== except) { try { ws.send(str); } catch {} }
    }
  }

  // 被移出聊天室、停用或重設密碼時，牧場視窗的連線也要斷掉
  closeFarmSockets(userId, conversationId = null) {
    for (const ws of this.ctx.getWebSockets(`fu:${userId}`)) {
      const a = ws.deserializeAttachment() || {};
      if (conversationId === null || a.farm === conversationId) {
        try { ws.close(4003, 'farm access revoked'); } catch {}
      }
    }
  }

  farmState(me, conversationId) {
    const conv = this.requireMember(conversationId, me.id);
    const farm = this.ensureFarm(conversationId, me);
    const now = Date.now();
    const scale = this.farmScale();
    const rainy = this.farmRainy();
    const season = this.farmSeason(now);
    // 換季後第一次有人打開：在聊天室說一聲，並列出這一季能種什麼
    let contested = false;
    if (farm.season_seen !== season) {
      this.sql.exec(`UPDATE farms SET season_seen = ? WHERE conversation_id = ?`, season, conversationId);
      if (farm.season_seen) {
        const names = Object.keys(CROPS).filter((c) => inSeason(c, season)).map((c) => CROPS[c].name);
        this.addSystemMessage(conversationId,
          `${SEASON_EMOJI[season]} 家族牧場進入${SEASON_NAME[season]}天了！這一季可以種：${names.join('、')}`);
        // 上一季的豐收比賽：全家收成幾次，跟另外三戶人家比（一次都沒收就不算參加）
        const count = this.sql.exec(`SELECT value FROM farm_stats WHERE conversation_id = ? AND key = 'season_harvest'`, conversationId).toArray()[0]?.value || 0;
        if (count > 0) {
          const res = harvestContest(count);
          this.sql.exec(`UPDATE farms SET money = money + ? WHERE conversation_id = ?`, res.prize, conversationId);
          if (res.place === 1) this.farmStat(conversationId, 'harvest_gold', 1);
          contested = true;
          this.addSystemMessage(conversationId, `🏆 ${SEASON_NAME[farm.season_seen]}季豐收比賽：你們家收成了 ${count} 次，`
            + `第 ${res.place} 名（${HARVEST_RIVALS.map((r) => `${r.owner} ${r.score} 次`).join('、')}），拿到${res.medal}，獎金 ${res.prize} 元！`);
        }
      }
      this.sql.exec(`DELETE FROM farm_stats WHERE conversation_id = ? AND key = 'season_harvest'`, conversationId);
    }
    const energyMax = energyMaxOf(farm.house_level);
    const p = this.farmPlayer(conversationId, me.id, now, energyMax);
    const names = this.userNames();
    const memberRows = this.sql
      .exec(`SELECT u.id, u.display_name, u.avatar_color FROM members m JOIN users u ON u.id = m.user_id
             WHERE m.conversation_id = ?`, conversationId)
      .toArray();
    let title = conv.name || '';
    if (conv.type === 'dm') {
      const other = memberRows.find((r) => r.id !== me.id);
      title = other ? `${me.display_name} 和 ${other.display_name}` : `${me.display_name} 的牧場`;
    }
    this.farmTyphoon(conversationId, farm, now, scale, rainy);
    const tiles = this.sql
      .exec(`SELECT * FROM farm_tiles WHERE conversation_id = ?`, conversationId)
      .toArray()
      .map((t) => this.farmTilePub(t, now, scale, rainy));
    const today = taiwanDay(now);
    // 節日當天第一次有人打開：在聊天室說一聲
    const fest = this.farmFestival(today);
    if (fest && farm.festival_seen !== today) {
      const F = FESTIVALS[fest];
      this.sql.exec(`UPDATE farms SET festival_seen = ? WHERE conversation_id = ?`, today, conversationId);
      this.addSystemMessage(conversationId, `${F.emoji} 今天是${F.name}！${F.line}到小鎮的告示板可以領節慶禮物。`);
    }
    // 行事曆上今天有家人生日：小鎮的大家幫忙慶生，美玲姐送一個生日蛋糕（一天一次）
    const todayEvents = this.sql.exec(`SELECT title FROM events WHERE date = ? ORDER BY remind_at LIMIT 10`, today).toArray().map((r) => r.title);
    const bdays = todayEvents.filter(isBirthdayEvent);
    if (bdays.length && farm.bday_seen !== today) {
      this.sql.exec(`UPDATE farms SET bday_seen = ? WHERE conversation_id = ?`, today, conversationId);
      this.farmAddItem(conversationId, 'dish:cake', 1);
      this.addSystemMessage(conversationId,
        `🎂 行事曆上今天是「${bdays.join('、')}」！小鎮的大家都說生日快樂，美玲姐送來一個生日蛋糕，放在倉庫了。`);
    }
    // 換週後第一次有人打開：在聊天室貼上週的週報（那週什麼都沒做就不貼），只留最近 8 週的紀錄
    const week = this.farmWeek(today);
    // 比賽結果出來了：拿到第一名的成就現在就算
    if (this.farmJudgeBeauty(conversationId, week) || contested) this.farmCheckAchievements(conversationId, me, now);
    // 星期六晚上夜市開了：第一個打開牧場的人在聊天室說一聲（一晚一次）
    if (this.farmMarketOpen(now) && !this.sql.exec(`SELECT 1 FROM farm_market_play WHERE conversation_id = ? AND day = ? AND user_id = 0`, conversationId, today).toArray().length) {
      this.sql.exec(`INSERT INTO farm_market_play (conversation_id, day, user_id, stall) VALUES (?, ?, 0, 'announce')`, conversationId, today);
      this.addSystemMessage(conversationId, '🏮 今晚小鎮南邊有夜市！撈金魚、套圈圈、雞排珍奶，晚上 12 點收攤');
    }
    if (farm.report_week !== week) {
      this.sql.exec(`UPDATE farms SET report_week = ? WHERE conversation_id = ?`, week, conversationId);
      const text = farm.report_week ? weeklyReportText(this.farmWeekSummary(conversationId, farm.report_week)) : null;
      if (text) this.addSystemMessage(conversationId, text);
      const old = new Date(Date.parse(week + 'T00:00:00Z') - 56 * 86400000).toISOString().slice(0, 10);
      this.sql.exec(`DELETE FROM farm_weekly WHERE conversation_id = ? AND week < ?`, conversationId, old);
    }
    const animals = this.farmAnimalRows(conversationId).map((a) => this.farmAnimalPub(a, scale, today));
    return json({
      farm: { id: conversationId, title, money: farm.money, createdBy: names.get(farm.created_by) || null },
      map: FARM_MAP, spawn: FARM_SPAWN,
      crops: CROPS, energy: { now: p.energy, max: energyMax }, costs: ENERGY_COST,
      tiles, items: this.farmItems(conversationId),
      members: memberRows.map((r) => ({ id: r.id, name: r.display_name, color: r.avatar_color })),
      now, scale, waterHours: WATER_HOURS, season, day: today,
      seasonEndsAt: nextSeasonStart(now),
      animals, animalKinds: ANIMALS, products: PRODUCTS, feedPrice: FEED_PRICE, pen: PEN,
      town: TOWN_MAP, arrive: ARRIVE, villagers: this.farmVillagersPub(), foods: FOODS, toolShop: TOOL_UPGRADES,
      villagersOut: this.farmVillagersOut(now),
      hill: HILL_MAP, exits: EXITS, fish: FISH, ores: ORES, dishes: DISHES, ingredientGroups: INGREDIENT_GROUPS,
      rocks: this.farmRocks(conversationId, today), dex: this.farmDex(conversationId),
      festivals: FESTIVALS, festival: fest,
      greenhouse: GH_MAP, goods: GOODS, machineKinds: MACHINES, machineSpots: MACHINE_SPOTS, machineBatch: MACHINE_BATCH, builds: BUILDS,
      machines: this.farmMachinesPub(conversationId, scale), ...this.farmBuildPub(farm),
      pond: POND_ZONE, petKinds: PETS, petZone: PET_ZONE, pets: this.farmPetsPub(conversationId, today),
      activity: this.farmActivityPub(conversationId, me, fest, today),
      market: this.farmMarketPub(conversationId, me, now, week), beauty: this.farmBeautyPub(conversationId, week),
      cave: { best: farm.cave_best || 0, stops: CAVE_STOPS, floors: CAVE_FLOORS },
      harvestContest: { count: this.sql.exec(`SELECT value FROM farm_stats WHERE conversation_id = ? AND key = 'season_harvest'`, conversationId).toArray()[0]?.value || 0, rivals: HARVEST_RIVALS },
      treeSpots: TREE_SPOTS, hiveSpots: HIVE_SPOTS, treeKinds: TREES, fruits: FRUITS, hive: HIVE,
      trees: this.farmTreesPub(conversationId, season, scale), hives: this.farmHivesPub(conversationId, scale, now),
      stories: STORIES, storyHearts: STORY_HEARTS, achievementList: ACHIEVEMENTS.map(({ id, name, desc, reward }) => ({ id, name, desc, reward })),
      achievements: this.farmAchievementsGot(conversationId), thisWeek: this.farmWeekSummary(conversationId, week),
      nextFestival: nextFestival(today), todayEvents, birthdays: bdays,
      ...this.farmTownPub(conversationId, today),
      weather: { today: this.farmWeather(today), tomorrow: this.farmWeather(taiwanDay(dayEndOf(now))) },
    });
  }

  async farmAction(request, me, conversationId) {
    this.requireMember(conversationId, me.id);
    const farm = this.ensureFarm(conversationId, me);
    const body = await this.readJson(request, 2000);
    const action = String(body.action || '');
    const now = Date.now();
    const scale = this.farmScale();
    const rainy = this.farmRainy();
    const season = this.farmSeason(now);
    const energyMax = energyMaxOf(farm.house_level);
    const p = this.farmPlayer(conversationId, me.id, now, energyMax);
    this.farmTyphoon(conversationId, farm, now, scale, rainy);
    const weatherToday = this.farmWeather(taiwanDay(now));
    const spend = (n) => {
      if (p.energy < n) throw new HttpError(400, '體力用完了，明天再來吧 😴');
      p.energy -= n;
    };
    let tileOut = null;
    let tilesOut = null;
    let gained = null;
    let animalsChanged = false;
    let townChanged = false;
    let rocksChanged = false;
    let dexChanged = false;
    let machinesChanged = false;
    let buildChanged = false;
    let petsChanged = false;
    let treesChanged = false;
    let marketChanged = false;
    let beautyChanged = false;
    let caveOut = null;
    const weekAdd = { harvest: 0, shipped: 0 };
    const today = taiwanDay(now);
    // 田在牧場還是溫室：溫室要先蓋好；溫室的田雨淋不到
    const fieldOf = (x, y) => {
      const area = Number.isInteger(x) && Number.isInteger(y) ? fieldArea(x, y) : null;
      // map：前端說它在哪張地圖（farm／gh），對不上就不做（溫室和牧場的座標是分開的，但說清楚比較保險）
      if (!area || (body.map !== undefined && body.map !== area)) throw new HttpError(400, '這裡不能耕作');
      if (area === 'gh' && !farm.gh_built) throw new HttpError(400, '溫室還沒蓋好');
      return area;
    };
    // 寒流天在外面的田做事比較累：翻土、澆水、播種、挖掉多花 1 點體力（溫室裡不會）
    const coldExtra = (area, act) => (weatherToday === 'cold' && area === 'farm' && ENERGY_COST[act] > 0 ? 1 : 0);
    const villagerOf = (raw) => {
      const id = String(raw || '');
      if (!Object.hasOwn(VILLAGERS, id)) throw new HttpError(400, '沒有這位村民');
      if (!this.farmVillagersOut(now)) {
        throw new HttpError(400, this.farmWeather(today) === 'typhoon' ? `颱風天，${VILLAGERS[id].name}待在家裡不出門`
          : `${VILLAGERS[id].name}已經回家睡覺了，早上 6 點以後再來`);
      }
      return id;
    };

    if ((action === 'till' || action === 'water') && body.area === true) {
      // 升級過的大鋤頭／大澆水壺：一次處理 3×3，只做需要的格子，體力不夠就做到哪算到哪
      if ((action === 'till' ? farm.hoe_level : farm.can_level) < 2)
        throw new HttpError(400, '要先到小鎮阿福伯的雜貨店升級工具');
      const x = Number(body.x), y = Number(body.y);
      const area = fieldOf(x, y);
      const fresh = (20 * 3600000) / scale; // 4 小時內才澆過的就跳過
      tilesOut = [];
      let tired = false;
      for (const c of area3x3(x, y)) {
        if (fieldArea(c.x, c.y) !== area) continue;
        const t = this.farmTileRow(conversationId, c.x, c.y, now);
        if (action === 'till' ? t.tilled : (!t.tilled || t.watered_until - now > fresh)) continue;
        const cost = ENERGY_COST[action] + coldExtra(area, action);
        if (p.energy < cost) { tired = true; break; }
        p.energy -= cost;
        if (action === 'till') Object.assign(t, { tilled: 1, crop: null, progress_ms: 0, tick_at: now });
        else Object.assign(t, { progress_ms: grownMs(t, now, scale, this.tileRain(c.x, c.y, rainy)), tick_at: now, watered_until: waterUntil(now, scale) });
        this.farmSaveTile(conversationId, t);
        tilesOut.push(this.farmTilePub(t, now, scale, rainy));
      }
      if (!tilesOut.length) {
        if (tired) throw new HttpError(400, '體力用完了，明天再來吧 😴');
        throw new HttpError(400, action === 'till' ? '這附近的田都翻好了' : '這附近的田都澆過了');
      }
    } else if (['till', 'dig', 'plant', 'water', 'harvest'].includes(action)) {
      const x = Number(body.x), y = Number(body.y);
      const area = fieldOf(x, y);
      const tr = this.tileRain(x, y, rainy);
      const t = this.sql
        .exec(`SELECT * FROM farm_tiles WHERE conversation_id = ? AND x = ? AND y = ?`, conversationId, x, y)
        .toArray()[0] || { conversation_id: conversationId, x, y, tilled: 0, crop: null, progress_ms: 0, tick_at: now, watered_until: 0 };

      if (action === 'till') {
        if (t.tilled) throw new HttpError(400, '這塊已經翻好土了');
        spend(ENERGY_COST.till + coldExtra(area, 'till'));
        Object.assign(t, { tilled: 1, crop: null, progress_ms: 0, tick_at: now });
      } else if (action === 'dig') {
        if (!t.crop) throw new HttpError(400, '這裡沒有種東西');
        spend(ENERGY_COST.dig + coldExtra(area, 'dig'));
        Object.assign(t, { crop: null, progress_ms: 0, tick_at: now });
      } else if (action === 'plant') {
        const crop = String(body.crop || '');
        if (!CROPS[crop]) throw new HttpError(400, '沒有這種種子');
        if (area !== 'gh' && !inSeason(crop, season))
          throw new HttpError(400, `${CROPS[crop].name}要${seasonsText(CROPS[crop].seasons)}天才能種（溫室裡什麼時候都能種）`);
        if (!t.tilled) throw new HttpError(400, '要先用鋤頭翻土');
        if (t.crop) throw new HttpError(400, '這裡已經種了東西');
        if ((this.farmItems(conversationId)[`seed:${crop}`] || 0) < 1)
          throw new HttpError(400, `沒有${CROPS[crop].name}種子了，去商店買吧`);
        spend(ENERGY_COST.plant + coldExtra(area, 'plant'));
        this.farmAddItem(conversationId, `seed:${crop}`, -1);
        Object.assign(t, { crop, progress_ms: 0, tick_at: now }); // 土本來就濕的話繼續算
      } else if (action === 'water') {
        if (!t.tilled) throw new HttpError(400, '要先用鋤頭翻土');
        spend(ENERGY_COST.water + coldExtra(area, 'water'));
        // 先把舊的濕土時間結算進成長量，再重新保濕
        Object.assign(t, { progress_ms: grownMs(t, now, scale, tr), tick_at: now, watered_until: waterUntil(now, scale) });
      } else {
        if (!t.crop) throw new HttpError(400, '這裡沒有種東西');
        if (cropStage(t, now, scale, tr) < 3) throw new HttpError(400, '還沒成熟喔');
        spend(ENERGY_COST.harvest);
        this.farmAddItem(conversationId, `crop:${t.crop}`, 1);
        this.farmStat(conversationId, 'harvest', 1);
        this.farmStat(conversationId, 'season_harvest', 1);
        weekAdd.harvest = 1;
        gained = { item: `crop:${t.crop}`, qty: 1 };
        // 番茄、草莓這類收完會再長；其他的收完就空出來
        const again = regrowProgressMs(t.crop);
        if (again != null) Object.assign(t, { progress_ms: again, tick_at: now });
        else Object.assign(t, { crop: null, progress_ms: 0, tick_at: now });
      }
      this.sql.exec(
        `INSERT INTO farm_tiles (conversation_id, x, y, tilled, crop, progress_ms, tick_at, watered_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(conversation_id, x, y) DO UPDATE SET tilled = excluded.tilled, crop = excluded.crop,
           progress_ms = excluded.progress_ms, tick_at = excluded.tick_at, watered_until = excluded.watered_until`,
        conversationId, x, y, t.tilled, t.crop, t.progress_ms, t.tick_at, t.watered_until);
      tileOut = this.farmTilePub(t, now, scale, rainy);
    } else if (action === 'buy' || action === 'ship') {
      const item = String(body.item || '');
      const qty = Number(body.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 999) throw new HttpError(400, '數量不正確');
      const [kind, id] = item.split(':');
      if (action === 'buy') {
        let cost;
        if (item === 'feed') cost = FEED_PRICE * qty;
        else {
          if (kind !== 'seed' || !CROPS[id]) throw new HttpError(400, '攤位只賣種子和飼料');
          if (!inSeason(id, season) && !farm.gh_built)
            throw new HttpError(400, `${CROPS[id].name}種子要${seasonsText(CROPS[id].seasons)}天才有賣（蓋了溫室就什麼時候都買得到）`);
          cost = CROPS[id].seed * qty;
        }
        this.farmSpend(conversationId, cost);
        this.farmAddItem(conversationId, item, qty);
      } else {
        const price = itemPrice(item);
        if (!price) throw new HttpError(400, '出貨箱只收作物、雞蛋牛奶、魚、礦石、料理和加工品');
        if ((this.farmItems(conversationId)[item] || 0) < qty) throw new HttpError(400, '倉庫裡沒有那麼多');
        this.farmAddItem(conversationId, item, -qty);
        this.sql.exec(`UPDATE farms SET money = money + ? WHERE conversation_id = ?`, price * qty, conversationId);
        this.farmStat(conversationId, 'shipped', price * qty);
        weekAdd.shipped = price * qty;
      }
    } else if (action === 'buy_animal') {
      const kind = String(body.kind || '');
      const A = ANIMALS[kind];
      if (!A) throw new HttpError(400, '沒有這種動物');
      const name = cleanAnimalName(body.name);
      if (!name) throw new HttpError(400, '幫牠取個名字吧（1～8 個字）');
      const have = this.sql.exec(`SELECT COUNT(*) AS n FROM farm_animals WHERE conversation_id = ? AND kind = ?`,
        conversationId, kind).one().n;
      if (have >= A.max) throw new HttpError(400, `動物小屋最多養 ${A.max} 隻${A.name}`);
      this.farmSpend(conversationId, A.price);
      this.sql.exec(`INSERT INTO farm_animals (conversation_id, kind, name, bought_at, love) VALUES (?, ?, ?, ?, ?)`,
        conversationId, kind, name, now, this.farmStartLove(kind));
      animalsChanged = true;
      this.addSystemMessage(conversationId, `${ANIMAL_EMOJI[kind]} ${me.display_name} 帶了一隻${A.name}回牧場，取名「${name}」`);
    } else if (['feed', 'pet', 'collect'].includes(action)) {
      const animalId = Number(body.animalId);
      const a = Number.isInteger(animalId) && this.sql
        .exec(`SELECT * FROM farm_animals WHERE id = ? AND conversation_id = ?`, animalId, conversationId).toArray()[0];
      if (!a) throw new HttpError(400, '找不到這隻動物');
      const today = taiwanDay(now);
      if (action === 'feed') gained = this.farmFeed(conversationId, a, now, scale, today, spend);
      else if (action === 'pet') {
        if (a.petted_day === today) throw new HttpError(400, `今天已經摸過${a.name}了，明天再來 ❤️`);
        spend(ENERGY_COST.pet);
        a.love = Math.min(LOVE_MAX, a.love + 1);
        a.petted_day = today;
      } else {
        if (!a.fed_at || a.collected) throw new HttpError(400, `${a.name}還沒有${PRODUCTS[productOf(a.kind, a.love)].name}，先餵牠吃飯`);
        if (!animalHasProduct(a, now, scale)) throw new HttpError(400, `${a.name}的${PRODUCTS[productOf(a.kind, a.love)].name}還沒好，等一下再來`);
        gained = this.farmCollect(conversationId, a, now, scale);
      }
      this.farmSaveAnimal(a);
      animalsChanged = true;
    } else if (action === 'rename_animal') {
      const animalId = Number(body.animalId);
      const a = Number.isInteger(animalId) && this.sql
        .exec(`SELECT * FROM farm_animals WHERE id = ? AND conversation_id = ?`, animalId, conversationId).toArray()[0];
      if (!a) throw new HttpError(400, '找不到這隻動物');
      const name = cleanAnimalName(body.name);
      if (!name) throw new HttpError(400, '名字要 1～8 個字');
      this.sql.exec(`UPDATE farm_animals SET name = ? WHERE id = ?`, name, a.id);
      gained = { name };
      animalsChanged = true;
    } else if (action === 'adopt_pet') {
      const kind = String(body.pet || '');
      if (!Object.hasOwn(PETS, kind)) throw new HttpError(400, '沒有這種寵物');
      const name = cleanAnimalName(body.name);
      if (!name) throw new HttpError(400, '幫牠取個名字吧（1～8 個字）');
      if (this.sql.exec(`SELECT 1 FROM farm_pets WHERE conversation_id = ? AND kind = ?`, conversationId, kind).toArray().length)
        throw new HttpError(400, `牧場已經有${PETS[kind].name}了`);
      this.sql.exec(`INSERT INTO farm_pets (conversation_id, kind, name, follow_user, adopted_at) VALUES (?, ?, ?, ?, ?)`,
        conversationId, kind, name, me.id, now);
      this.addSystemMessage(conversationId, `${PETS[kind].emoji} ${me.display_name} 領養了一隻${PETS[kind].name}，取名「${name}」！`);
      gained = { pet: kind };
      petsChanged = true;
    } else if (action === 'pat') {
      // 摸寵物：牠就跟著你走；每天第一次摸會加愛心，還可能叼東西回來
      const kind = String(body.pet || '');
      if (!Object.hasOwn(PETS, kind)) throw new HttpError(400, '沒有這種寵物');
      const pet = this.sql.exec(`SELECT * FROM farm_pets WHERE conversation_id = ? AND kind = ?`, conversationId, kind).toArray()[0];
      if (!pet) throw new HttpError(400, `還沒有${PETS[kind].name}，到動物小屋領養`);
      const first = pet.petted_day !== today;
      let find = null;
      if (first) {
        find = petFind(kind, conversationId, today, pet.love, season);
        if (find) this.farmAddItem(conversationId, find.item, find.qty);
        pet.love = Math.min(LOVE_MAX, pet.love + 1);
      }
      this.sql.exec(`UPDATE farm_pets SET love = ?, petted_day = ?, follow_user = ? WHERE conversation_id = ? AND kind = ?`,
        pet.love, today, me.id, conversationId, kind);
      gained = { pet: kind, first, find };
      petsChanged = true;
    } else if ((action === 'fish' || action === 'mine') && weatherToday === 'typhoon') {
      throw new HttpError(400, action === 'fish' ? '颱風天水邊很危險，今天不要釣魚' : '颱風天不要上山，很危險！');
    } else if (action === 'fish') {
      // 拋竿：前端負責「看到 ❗ 有沒有及時拉」的小遊戲，hooked 告訴伺服器有沒有拉到；體力照扣
      const area = String(body.area || '');
      const spot = fishSpot(area);
      const x = Number(body.x), y = Number(body.y);
      if (!spot || !Number.isInteger(x) || !Number.isInteger(y) || terrainAt(x, y, area) !== 'W')
        throw new HttpError(400, '這裡不能釣魚');
      spend(ENERGY_COST.fish);
      if (body.hooked === true) {
        const id = pickWeighted(fishChoices(spot, season, isDaytime(now), rainy(today)), Math.random());
        const item = `fish:${id}`;
        this.farmAddItem(conversationId, item, 1);
        gained = { item, qty: 1, first: this.farmDexAdd(conversationId, item, me, now) };
      } else {
        gained = { missed: true };
      }
      dexChanged = true;
    } else if (action === 'mine') {
      const x = Number(body.x), y = Number(body.y);
      const rock = Number.isInteger(x) && Number.isInteger(y) && this.farmRocks(conversationId, today).find((r) => r.x === x && r.y === y);
      if (!rock) throw new HttpError(400, '這裡沒有石頭（今天的可能已經挖完了）');
      spend(ENERGY_COST.mine);
      this.sql.exec(`DELETE FROM farm_mined WHERE conversation_id = ? AND day <> ?`, conversationId, today);
      this.sql.exec(`INSERT INTO farm_mined (conversation_id, day, x, y) VALUES (?, ?, ?, ?)`, conversationId, today, x, y);
      const item = `ore:${rock.type}`;
      this.farmAddItem(conversationId, item, 1);
      gained = { item, qty: 1, first: this.farmDexAdd(conversationId, item, me, now) };
      rocksChanged = true;
      dexChanged = true;
    } else if (action === 'festival_claim') {
      // 節日當天到告示板領禮物：每座牧場每個節日一份
      const fest = this.farmFestival(today);
      if (!fest) throw new HttpError(400, '今天不是節日，下次節日再來');
      if (farm.festival_claim === today) throw new HttpError(400, '今天的節慶禮物已經領過了');
      const g = FESTIVALS[fest].gift;
      if (g.money) this.sql.exec(`UPDATE farms SET money = money + ? WHERE conversation_id = ?`, g.money, conversationId);
      if (g.item) this.farmAddItem(conversationId, g.item, g.qty);
      this.sql.exec(`UPDATE farms SET festival_claim = ? WHERE conversation_id = ?`, today, conversationId);
      this.addSystemMessage(conversationId, `🎁 ${me.display_name} 領了${FESTIVALS[fest].name}的禮物：${this.farmGiftText(g)}`);
      gained = { festival: fest, ...g };
      townChanged = true;
    } else if (action === 'buy_sapling' || action === 'buy_hive') {
      // 攤位賣果樹苗（一年四季都買得到）和蜂箱（買了自動放在左下角的空位）
      if (action === 'buy_sapling') {
        const kind = String(body.tree || '');
        const qty = Number(body.qty || 1);
        if (!Object.hasOwn(TREES, kind)) throw new HttpError(400, '沒有這種果樹');
        if (!Number.isInteger(qty) || qty < 1 || qty > TREE_SPOTS.length) throw new HttpError(400, '數量不正確');
        this.farmSpend(conversationId, TREES[kind].price * qty);
        this.farmAddItem(conversationId, `sapling:${kind}`, qty);
        gained = { item: `sapling:${kind}`, qty };
      } else {
        const used = new Set(this.sql.exec(`SELECT spot FROM farm_hives WHERE conversation_id = ?`, conversationId).toArray().map((r) => r.spot));
        const spot = HIVE_SPOTS.findIndex((_, i) => !used.has(i));
        if (spot < 0) throw new HttpError(400, `蜂箱最多 ${HIVE.max} 個`);
        this.farmSpend(conversationId, HIVE.price);
        this.sql.exec(`INSERT INTO farm_hives (conversation_id, spot, placed_at) VALUES (?, ?, ?)`, conversationId, spot, now);
        this.addSystemMessage(conversationId, `🐝 ${me.display_name} 在牧場左下角放了一個蜂箱，${HIVE.days} 天後就有蜂蜜了`);
        gained = { hive: spot };
      }
      treesChanged = true;
    } else if (['plant_tree', 'pick', 'remove_tree', 'collect_honey'].includes(action)) {
      const spot = Number(body.spot);
      const fast = this.farmFastTrees();
      if (action === 'collect_honey') {
        const h = Number.isInteger(spot) && this.sql.exec(`SELECT * FROM farm_hives WHERE conversation_id = ? AND spot = ?`, conversationId, spot).toArray()[0];
        if (!h) throw new HttpError(400, '這裡沒有蜂箱');
        if (season === 'winter') throw new HttpError(400, '冬天蜜蜂在休息，春天再來收');
        if (now < hiveReadyAt(h, scale, fast)) throw new HttpError(400, '蜂蜜還沒好，再等幾天');
        const item = `prod:${this.farmHoneyKind(conversationId, scale, now)}`;
        this.farmAddItem(conversationId, item, 1);
        this.sql.exec(`UPDATE farm_hives SET collected_at = ? WHERE conversation_id = ? AND spot = ?`, now, conversationId, spot);
        gained = { item, qty: 1, first: this.farmDexAdd(conversationId, item, me, now) };
        dexChanged = true;
      } else {
        if (!Number.isInteger(spot) || !TREE_SPOTS[spot]) throw new HttpError(400, '這裡不能種果樹');
        const t = this.sql.exec(`SELECT * FROM farm_trees WHERE conversation_id = ? AND spot = ?`, conversationId, spot).toArray()[0];
        if (action === 'plant_tree') {
          const kind = String(body.tree || '');
          if (!Object.hasOwn(TREES, kind)) throw new HttpError(400, '沒有這種果樹');
          if (t) throw new HttpError(400, '這裡已經種了果樹');
          if ((this.farmItems(conversationId)[`sapling:${kind}`] || 0) < 1) throw new HttpError(400, `沒有${TREES[kind].name}苗，去攤位買`);
          spend(ENERGY_COST.plant);
          this.farmAddItem(conversationId, `sapling:${kind}`, -1);
          this.sql.exec(`INSERT INTO farm_trees (conversation_id, spot, kind, planted_at) VALUES (?, ?, ?, ?)`, conversationId, spot, kind, now);
          this.addSystemMessage(conversationId, `🌱 ${me.display_name} 種了一棵${TREES[kind].name}，${TREES[kind].days} 天後長大`);
          gained = { tree: kind };
        } else if (action === 'remove_tree') {
          if (!t) throw new HttpError(400, '這裡沒有果樹');
          spend(ENERGY_COST.dig);
          this.sql.exec(`DELETE FROM farm_trees WHERE conversation_id = ? AND spot = ?`, conversationId, spot);
          gained = { removed: t.kind };
        } else {
          if (!t) throw new HttpError(400, '這裡沒有果樹');
          const T = TREES[t.kind];
          if (now < treeMatureAt(t, scale, fast)) throw new HttpError(400, `${T.name}還沒長大`);
          const ready = treeReadyAt(t, season, scale, fast);
          if (!ready) throw new HttpError(400, `${T.name}要${seasonsText(T.seasons)}天才會結果`);
          if (now < ready) throw new HttpError(400, `今天已經摘過了，明天再來`);
          spend(ENERGY_COST.harvest);
          const item = `fruit:${T.fruit}`;
          this.farmAddItem(conversationId, item, T.yield);
          this.sql.exec(`UPDATE farm_trees SET picked_at = ? WHERE conversation_id = ? AND spot = ?`, now, conversationId, spot);
          this.farmStat(conversationId, 'harvest', 1);
          this.farmStat(conversationId, 'season_harvest', 1);
          weekAdd.harvest = 1;
          gained = { item, qty: T.yield, first: this.farmDexAdd(conversationId, item, me, now) };
          dexChanged = true;
        }
      }
      treesChanged = true;
    } else if (action === 'market') {
      // 夜市：撈金魚、套圈圈（每人每晚各玩一次，分數由前端小遊戲送來）、小吃、限定商品
      if (!this.farmMarketOpen(now)) throw new HttpError(400, '夜市星期六晚上 5 點才開');
      const stall = String(body.stall || '');
      if (!Object.hasOwn(MARKET_STALLS, stall)) throw new HttpError(400, '沒有這個攤位');
      if (stall === 'goldfish' || stall === 'ring') {
        if (this.sql.exec(`SELECT 1 FROM farm_market_play WHERE conversation_id = ? AND day = ? AND user_id = ? AND stall = ?`,
          conversationId, today, me.id, stall).toArray().length) throw new HttpError(400, `今晚已經玩過${MARKET_STALLS[stall].name}了，下週六再來`);
        this.farmSpend(conversationId, MARKET_STALLS[stall].price);
        const n = Number.isInteger(body.score) ? body.score : 0;
        let res;
        if (stall === 'goldfish') {
          const caught = Math.max(0, Math.min(GOLDFISH_MAX, n));
          res = { score: caught, item: caught ? 'fish:goldfish' : null, qty: caught };
        } else res = ringPrize(n);
        if (res.item) this.farmAddItem(conversationId, res.item, res.qty);
        if (res.item === 'fish:goldfish') this.farmDexAdd(conversationId, 'fish:goldfish', me, now, true);
        if (stall === 'goldfish' && res.score >= GOLDFISH_MAX) this.farmStat(conversationId, 'goldfish3', 1);
        this.sql.exec(`INSERT INTO farm_market_play (conversation_id, day, user_id, stall, score) VALUES (?, ?, ?, ?, ?)`,
          conversationId, today, me.id, stall, res.score);
        this.addSystemMessage(conversationId, stall === 'goldfish'
          ? `🐟 ${me.display_name} 在夜市撈金魚，撈到 ${res.score} 隻！`
          : `⭕ ${me.display_name} 在夜市套圈圈，套中 ${res.score} 個，拿到${itemName(res.item)}${res.qty > 1 ? ` ×${res.qty}` : ''}！`);
        gained = { stall, ...res };
        dexChanged = true;
        marketChanged = true;
      } else if (stall === 'snack') {
        const food = NIGHT_FOODS[Object.hasOwn(NIGHT_FOODS, String(body.food || '')) ? String(body.food) : ''];
        if (!food) throw new HttpError(400, '沒有這種小吃');
        if (p.energy >= energyMax) throw new HttpError(400, '體力是滿的，等累了再來吃吧');
        this.farmSpend(conversationId, food.price);
        p.energy = Math.min(energyMax, p.energy + food.energy);
        gained = { stall, food: body.food };
      } else {
        const sp = specialsOf(this.farmWeek(today)).find((x) => x.item === String(body.item || ''));
        if (!sp) throw new HttpError(400, '這週沒有賣這個');
        this.farmSpend(conversationId, sp.price);
        this.farmAddItem(conversationId, sp.item, 1);
        gained = { stall, item: sp.item, qty: 1 };
      }
    } else if (action === 'cave_go' || action === 'cave_mine' || action === 'cave_chest') {
      // 後山洞窟：下到某一層、挖石頭（其中一顆底下是往下的梯子）、開寶箱
      if (weatherToday === 'typhoon') throw new HttpError(400, '颱風天不要上山，很危險！');
      const floor = Number(body.floor);
      if (!Number.isInteger(floor) || floor < 1 || floor > CAVE_FLOORS) throw new HttpError(400, '洞窟沒有這一層');
      const best = farm.cave_best || 0;
      if (!this.farmCaveCanEnter(conversationId, today, floor, best))
        throw new HttpError(400, `要先在第 ${floor - 1} 層挖到往下的梯子`);
      const f = caveFloor(conversationId, today, floor);
      if (action === 'cave_go') {
        if (floor > best) {
          this.sql.exec(`UPDATE farms SET cave_best = ? WHERE conversation_id = ?`, floor, conversationId);
          if (floor === CAVE_FLOORS) this.addSystemMessage(conversationId, `⛏️ ${me.display_name} 下到洞窟的最深處（第 ${floor} 層）了！聽說那裡有一個古老的寶箱……`);
          else if (CAVE_STOPS.includes(floor)) this.addSystemMessage(conversationId, `⛏️ ${me.display_name} 下到洞窟第 ${floor} 層了！以後礦車可以直接到這一層`);
        }
      } else if (action === 'cave_mine') {
        const x = Number(body.x), y = Number(body.y);
        const rock = Number.isInteger(x) && Number.isInteger(y) && f.rocks.find((r) => r.x === x && r.y === y);
        if (!rock || this.sql.exec(`SELECT 1 FROM farm_cave_mined WHERE conversation_id = ? AND day = ? AND floor = ? AND x = ? AND y = ?`,
          conversationId, today, floor, x, y).toArray().length) throw new HttpError(400, '這裡沒有石頭了');
        spend(ENERGY_COST.mine);
        this.sql.exec(`DELETE FROM farm_cave_mined WHERE conversation_id = ? AND day <> ?`, conversationId, today);
        this.sql.exec(`INSERT INTO farm_cave_mined (conversation_id, day, floor, x, y) VALUES (?, ?, ?, ?, ?)`, conversationId, today, floor, x, y);
        const item = `ore:${rock.type}`;
        this.farmAddItem(conversationId, item, 1);
        gained = { item, qty: 1, first: this.farmDexAdd(conversationId, item, me, now), ladder: !!f.ladder && f.ladder.x === x && f.ladder.y === y };
        dexChanged = true;
      } else {
        if (!f.chest) throw new HttpError(400, '這一層沒有寶箱');
        if (this.sql.exec(`SELECT 1 FROM farm_cave_chests WHERE conversation_id = ? AND day = ? AND floor = ?`, conversationId, today, floor).toArray().length)
          throw new HttpError(400, '這個寶箱今天已經打開過了，明天再來');
        this.sql.exec(`DELETE FROM farm_cave_chests WHERE conversation_id = ? AND day <> ?`, conversationId, today);
        this.sql.exec(`INSERT INTO farm_cave_chests (conversation_id, day, floor) VALUES (?, ?, ?)`, conversationId, today, floor);
        // 第 20 層第一次打開的是古老的寶箱（每座牧場一次）
        const treasure = floor === CAVE_FLOORS && !this.sql.exec(`SELECT value FROM farm_stats WHERE conversation_id = ? AND key = 'cave_bottom'`, conversationId).toArray()[0]?.value;
        const loot = treasure ? CAVE_TREASURE : chestLoot(conversationId, today, floor);
        if (loot.money) this.sql.exec(`UPDATE farms SET money = money + ? WHERE conversation_id = ?`, loot.money, conversationId);
        let first = false;
        if (loot.item) {
          this.farmAddItem(conversationId, loot.item, loot.qty);
          if (loot.item.startsWith('ore:')) { first = this.farmDexAdd(conversationId, loot.item, me, now, true); dexChanged = true; }
        }
        if (treasure) {
          this.farmStat(conversationId, 'cave_bottom', 1);
          this.addSystemMessage(conversationId, `💎 ${me.display_name} 在洞窟最深處打開了古老的寶箱：${loot.money} 元和一顆${itemName(loot.item)}！`);
        }
        gained = { chest: { ...loot, treasure, first } };
      }
      caveOut = this.farmCaveFloorPub(conversationId, today, floor);
    } else if (action === 'beauty_enter') {
      // 動物選美：這週報名一隻（評審前可以換），寶寶不能參加
      const animalId = Number(body.animalId);
      const a = Number.isInteger(animalId) && this.sql
        .exec(`SELECT * FROM farm_animals WHERE id = ? AND conversation_id = ?`, animalId, conversationId).toArray()[0];
      if (!a) throw new HttpError(400, '找不到這隻動物');
      if (isBaby(a, now)) throw new HttpError(400, '寶寶還太小，長大再來參加');
      const week = this.farmWeek(today);
      this.sql.exec(`INSERT INTO farm_beauty (conversation_id, week, animal_id, animal_name, kind, love, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(conversation_id, week) DO UPDATE SET animal_id = excluded.animal_id, animal_name = excluded.animal_name,
          kind = excluded.kind, love = excluded.love, entered_by = excluded.entered_by`,
        conversationId, week, a.id, a.name, a.kind, a.love, me.id);
      this.addSystemMessage(conversationId, `🎀 ${me.display_name} 幫${a.name}報名了這週的動物選美，下週一公布結果`);
      gained = { beauty: { animalId: a.id, name: a.name, kind: a.kind } };
      beautyChanged = true;
    } else if (action === 'festival_play') {
      // 節慶活動：每人每個節日一次，結果由伺服器算（小遊戲的分數由前端送來，夾在合理範圍）
      const fest = this.farmFestival(today);
      const A = fest && FESTIVAL_ACTIVITIES[fest];
      if (!A) throw new HttpError(400, '今天沒有節慶活動');
      if (this.sql.exec(`SELECT 1 FROM farm_festival_play WHERE conversation_id = ? AND day = ? AND user_id = ?`, conversationId, today, me.id).toArray().length)
        throw new HttpError(400, `今天已經玩過${A.name}了，明年再來`);
      const res = activityResult(A.kind, { farmId: conversationId, day: today, userId: me.id, answers: body.answers, score: body.score });
      if (res.money) this.sql.exec(`UPDATE farms SET money = money + ? WHERE conversation_id = ?`, res.money, conversationId);
      if (res.item) this.farmAddItem(conversationId, res.item, res.qty);
      this.sql.exec(`INSERT INTO farm_festival_play (conversation_id, day, user_id, kind, score) VALUES (?, ?, ?, ?, ?)`,
        conversationId, today, me.id, A.kind, res.score);
      const prize = [res.money ? `${res.money} 元` : null, res.item ? `${itemName(res.item)}${res.qty > 1 ? ` ×${res.qty}` : ''}` : null].filter(Boolean).join('、');
      this.addSystemMessage(conversationId, `🎪 ${me.display_name} 參加${A.name}：${res.text}${prize ? `，拿到 ${prize}` : ''}！`);
      gained = { activity: A.kind, ...res };
    } else if (action === 'festival_calendar') {
      // 把接下來一年的節日加到家裡的行事曆（已經有同名同日的就跳過），當天早上 9 點提醒
      let added = 0;
      for (const f of festivalsAfter(today, 366)) {
        const F = FESTIVALS[f.id];
        const title = `${F.emoji} ${F.name}`;
        if (this.sql.exec(`SELECT 1 FROM events WHERE date = ? AND title = ?`, f.date, title).toArray().length) continue;
        const [y, m, d] = f.date.split('-').map(Number);
        const remindAt = Date.UTC(y, m - 1, d, 1, 0); // 台灣早上 9 點
        this.sql.exec(
          `INSERT INTO events (title, date, time, note, remind_at, created_by, created_at, reminded) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
          title, f.date, '家族牧場加的節慶', remindAt, me.id, now, remindAt <= now ? 1 : 0);
        added++;
      }
      if (added) { this.scheduleNextAlarm(); this.broadcastAll({ type: 'events-changed' }); }
      gained = { added };
    } else if (action === 'cook') {
      // 在家裡的廚房煮菜：材料夠就煮一份（不花體力），第一次煮會進圖鑑、在聊天室說一聲
      const dish = String(body.dish || '');
      if (!Object.hasOwn(DISHES, dish)) throw new HttpError(400, '沒有這道菜');
      if (!DISHES[dish].need) throw new HttpError(400, `${DISHES[dish].name}是節慶的食物，不能自己煮`);
      const take = cookTakes(this.farmItems(conversationId), dish);
      if (!take) throw new HttpError(400, `材料不夠，煮不了${DISHES[dish].name}`);
      for (const [i, q] of Object.entries(take)) this.farmAddItem(conversationId, i, -q);
      const item = `dish:${dish}`;
      this.farmAddItem(conversationId, item, 1);
      gained = { item, qty: 1, first: this.farmDexAdd(conversationId, item, me, now) };
      dexChanged = true;
    } else if (action === 'eat_dish') {
      const dish = String(body.dish || '');
      if (!Object.hasOwn(DISHES, dish)) throw new HttpError(400, '沒有這道菜');
      if ((this.farmItems(conversationId)[`dish:${dish}`] || 0) < 1) throw new HttpError(400, `倉庫裡沒有${DISHES[dish].name}`);
      if (p.energy >= energyMax) throw new HttpError(400, '體力是滿的，等累了再吃吧');
      this.farmAddItem(conversationId, `dish:${dish}`, -1);
      // 寒流天喝湯（碗裝的菜）特別補：體力 ×1.5
      const boost = weatherToday === 'cold' && DISHES[dish].shape === 'bowl' ? 1.5 : 1;
      p.energy = Math.min(energyMax, p.energy + Math.round(DISHES[dish].energy * boost));
    } else if (action === 'talk') {
      // 每天第一次聊天 +1（全家一天算一次）；之後再聊只是聽他說話
      const id = villagerOf(body.villager);
      const f = this.farmFriendRow(conversationId, id);
      let rewards = [];
      if (f.talk_day !== today) { f.talk_day = today; rewards = this.farmFriendAdd(conversationId, f, TALK_POINTS); }
      // 感情夠了就說下一段故事（一次聊天說一段）
      const due = storyDue(f.points, f.story_level);
      let story = null;
      if (due != null) {
        f.story_level = due + 1;
        story = { villager: id, chapter: due, ...STORIES[id][due] };
        this.addSystemMessage(conversationId, `📖 ${me.display_name} 聽${VILLAGERS[id].name}說了「${story.title}」的故事`);
      }
      this.farmSaveFriend(f);
      gained = { rewards, story };
      townChanged = true;
    } else if (action === 'gift') {
      const id = villagerOf(body.villager);
      const item = String(body.item || '');
      if (!itemPrice(item)) throw new HttpError(400, '只能送作物、雞蛋牛奶、魚或礦石');
      const f = this.farmFriendRow(conversationId, id);
      if (f.gift_day === today) throw new HttpError(400, `今天已經送過${VILLAGERS[id].name}禮物了，明天再送`);
      if ((this.farmItems(conversationId)[item] || 0) < 1) throw new HttpError(400, '倉庫裡沒有這樣東西');
      this.farmAddItem(conversationId, item, -1);
      const g = giftPoints(id, item, today);
      f.gift_day = today;
      const rewards = this.farmFriendAdd(conversationId, f, g.points);
      this.farmSaveFriend(f);
      gained = { reaction: g.reaction, points: g.points, birthday: isBirthday(id, today), rewards };
      townChanged = true;
    } else if (action === 'request_fill') {
      const req = this.farmRequest(today);
      if (farm.request_day === today) throw new HttpError(400, '今天的委託已經完成了，明天再來看看');
      const have = this.farmItems(conversationId)[req.item] || 0;
      if (have < req.qty) throw new HttpError(400, `倉庫裡還差 ${req.qty - have} 個`);
      this.farmAddItem(conversationId, req.item, -req.qty);
      this.sql.exec(`UPDATE farms SET money = money + ?, request_day = ? WHERE conversation_id = ?`, req.reward, today, conversationId);
      this.farmStat(conversationId, 'requests', 1);
      const f = this.farmFriendRow(conversationId, req.villager);
      const rewards = this.farmFriendAdd(conversationId, f, REQUEST_POINTS);
      this.farmSaveFriend(f);
      const [kind, cid] = req.item.split(':');
      const iname = kind === 'crop' ? CROPS[cid].name : PRODUCTS[cid].name;
      this.addSystemMessage(conversationId,
        `📋 ${me.display_name} 完成了${VILLAGERS[req.villager].name}的委託（${iname} ×${req.qty}），拿到 ${req.reward} 元`);
      gained = { money: req.reward, rewards };
      townChanged = true;
    } else if (action === 'eat') {
      const food = FOODS[String(body.food || '')];
      if (!Object.hasOwn(FOODS, String(body.food || ''))) throw new HttpError(400, '沒有這道菜');
      if (p.energy >= energyMax) throw new HttpError(400, '體力是滿的，等累了再來吃吧');
      this.farmSpend(conversationId, food.price);
      p.energy = Math.min(energyMax, p.energy + food.energy);
    } else if (action === 'upgrade_tool') {
      const key = String(body.tool || '');
      if (!Object.hasOwn(TOOL_UPGRADES, key)) throw new HttpError(400, '沒有這種工具');
      const col = key === 'hoe' ? 'hoe_level' : 'can_level';
      if (farm[col] >= 2) throw new HttpError(400, `已經有${TOOL_UPGRADES[key].name}了`);
      this.farmSpend(conversationId, TOOL_UPGRADES[key].price);
      this.sql.exec(`UPDATE farms SET ${col} = 2 WHERE conversation_id = ?`, conversationId);
      this.addSystemMessage(conversationId,
        `🛠️ ${me.display_name} 在阿福伯的雜貨店買了${TOOL_UPGRADES[key].name}，現在${TOOL_UPGRADES[key].desc}`);
      townChanged = true;
    } else if (action === 'build') {
      // 在雜貨店請阿福伯蓋：溫室、房子擴建（大臥室 → 二樓，要照順序）
      const what = String(body.what || '');
      if (!Object.hasOwn(BUILDS, what)) throw new HttpError(400, '沒有這種建築');
      const B = BUILDS[what];
      if (what === 'greenhouse' && farm.gh_built) throw new HttpError(400, '溫室已經蓋好了');
      if (B.level && farm.house_level >= B.level) throw new HttpError(400, '房子已經擴建過了');
      if (B.level && farm.house_level !== B.level - 1) throw new HttpError(400, `要先擴建${BUILDS.house2.name.split('：')[1]}`);
      this.farmPay(conversationId, B.price, B.need);
      if (what === 'greenhouse') {
        this.sql.exec(`UPDATE farms SET gh_built = 1 WHERE conversation_id = ?`, conversationId);
        farm.gh_built = 1;
        this.addSystemMessage(conversationId, `🌱 ${me.display_name} 請阿福伯蓋好了溫室！現在一年四季什麼都能種（記得自己澆水）`);
      } else {
        // 擴建好的那天，今天已經打開過牧場的人體力也一起變多
        const add = energyMaxOf(B.level) - energyMaxOf(farm.house_level);
        this.sql.exec(`UPDATE farms SET house_level = ? WHERE conversation_id = ?`, B.level, conversationId);
        this.sql.exec(`UPDATE farm_players SET energy = energy + ? WHERE conversation_id = ? AND energy_day = ? AND user_id != ?`,
          add, conversationId, today, me.id);
        p.energy += add;
        farm.house_level = B.level;
        this.addSystemMessage(conversationId, `🏠 ${me.display_name} 把房子擴建成${B.name.split('：')[1]}了！全家每人每天的體力變成 ${energyMaxOf(B.level)}（今天也多了 ${add} 點）`);
      }
      gained = { build: what };
      buildChanged = true;
    } else if (action === 'buy_machine') {
      const kind = String(body.machine || '');
      if (!Object.hasOwn(MACHINES, kind)) throw new HttpError(400, '沒有這種加工機');
      const M = MACHINES[kind];
      if (this.sql.exec(`SELECT 1 FROM farm_machines WHERE conversation_id = ? AND kind = ?`, conversationId, kind).toArray().length)
        throw new HttpError(400, `已經有${M.name}了`);
      this.farmPay(conversationId, M.price, M.need);
      this.sql.exec(`INSERT INTO farm_machines (conversation_id, kind) VALUES (?, ?)`, conversationId, kind);
      this.addSystemMessage(conversationId, `⚙️ ${me.display_name} 買了${M.name}，放在牧場的攤位旁邊`);
      gained = { machine: kind };
      machinesChanged = true;
    } else if (action === 'machine_put' || action === 'machine_take') {
      const kind = String(body.machine || '');
      if (!Object.hasOwn(MACHINES, kind)) throw new HttpError(400, '沒有這種加工機');
      const M = MACHINES[kind];
      const m = this.sql.exec(`SELECT * FROM farm_machines WHERE conversation_id = ? AND kind = ?`, conversationId, kind).toArray()[0];
      if (!m) throw new HttpError(400, `還沒有${M.name}，到小鎮的雜貨店買`);
      if (action === 'machine_put') {
        if (m.input) throw new HttpError(400, `${M.name}正在做東西，做好拿出來才能再放`);
        const item = String(body.item || '');
        const qty = Number(body.qty);
        if (!Object.hasOwn(M.makes, item)) throw new HttpError(400, `${M.name}不能放這個`);
        if (!Number.isInteger(qty) || qty < 1 || qty > MACHINE_BATCH) throw new HttpError(400, `一次可以放 1～${MACHINE_BATCH} 個`);
        if ((this.farmItems(conversationId)[item] || 0) < qty) throw new HttpError(400, '倉庫裡沒有那麼多');
        this.farmAddItem(conversationId, item, -qty);
        this.sql.exec(`UPDATE farm_machines SET input = ?, qty = ?, started_at = ?, by_user = ? WHERE conversation_id = ? AND kind = ?`,
          item, qty, now, me.id, conversationId, kind);
        gained = { machine: kind, readyAt: machineReadyAt({ kind, started_at: now }, scale) };
      } else {
        if (!m.input) throw new HttpError(400, `${M.name}是空的`);
        if (now < machineReadyAt(m, scale)) throw new HttpError(400, `${M.name}還在做，等一下再來拿`);
        const item = `good:${M.makes[m.input]}`;
        this.farmAddItem(conversationId, item, m.qty);
        this.sql.exec(`UPDATE farm_machines SET input = NULL, qty = 0, started_at = 0 WHERE conversation_id = ? AND kind = ?`, conversationId, kind);
        gained = { item, qty: m.qty, first: this.farmDexAdd(conversationId, item, me, now) };
        dexChanged = true;
      }
      machinesChanged = true;
    } else if (action === 'feed_all' || action === 'collect_all') {
      // 動物小屋裡一次餵完／一次收完：能做幾隻做幾隻，一隻都沒辦法才回錯誤
      const today = taiwanDay(now);
      let done = 0, firstError = null;
      const got = {}, babies = [];
      for (const a of this.farmAnimalRows(conversationId)) {
        try {
          let g = null;
          if (action === 'feed_all') {
            if (a.fed_day === today) continue;
            g = this.farmFeed(conversationId, a, now, scale, today, spend);
          } else {
            if (!animalHasProduct(a, now, scale)) continue;
            g = this.farmCollect(conversationId, a, now, scale);
          }
          this.farmSaveAnimal(a);
          if (g) got[g.item] = (got[g.item] || 0) + 1;
          if (g && g.baby) babies.push(g.baby);
          done++;
        } catch (e) {
          if (!(e instanceof HttpError)) throw e;
          firstError = firstError || e;
          if (/飼料|體力/.test(e.message)) break; // 飼料或體力用完，後面的也不用試了
        }
      }
      if (!done) throw firstError || new HttpError(400, action === 'feed_all' ? '大家今天都吃飽了 😊' : '現在沒有可以收的');
      gained = { count: done, items: got, babies };
      animalsChanged = true;
    } else {
      throw new HttpError(400, '不支援的動作');
    }

    this.sql.exec(`UPDATE farm_players SET energy = ? WHERE conversation_id = ? AND user_id = ?`,
      p.energy, conversationId, me.id);
    // 週報用的紀錄、成就（達成了就發獎金、在聊天室說一聲）
    this.sql.exec(
      `INSERT INTO farm_weekly (conversation_id, week, user_id, actions, harvest, shipped) VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(conversation_id, week, user_id) DO UPDATE SET actions = actions + 1, harvest = harvest + excluded.harvest,
         shipped = shipped + excluded.shipped`,
      conversationId, this.farmWeek(today), me.id, weekAdd.harvest, weekAdd.shipped);
    const newAchievements = this.farmCheckAchievements(conversationId, me, now);
    const money = this.sql.exec(`SELECT money FROM farms WHERE conversation_id = ?`, conversationId).one().money;
    const items = this.farmItems(conversationId);
    const animals = animalsChanged
      ? this.farmAnimalRows(conversationId).map((a) => this.farmAnimalPub(a, scale, taiwanDay(now))) : undefined;
    const town = townChanged ? this.farmTownPub(conversationId, today) : undefined;
    const rocks = rocksChanged ? this.farmRocks(conversationId, today) : undefined;
    const dex = dexChanged ? this.farmDex(conversationId) : undefined;
    const tiles = tilesOut || (tileOut ? [tileOut] : []);
    const machines = machinesChanged ? this.farmMachinesPub(conversationId, scale) : undefined;
    const build = buildChanged ? this.farmBuildPub(farm) : undefined;
    const pets = petsChanged ? this.farmPetsPub(conversationId, today) : undefined;
    const achievements = newAchievements.length ? this.farmAchievementsGot(conversationId) : undefined;
    const trees = treesChanged ? this.farmTreesPub(conversationId, season, scale) : undefined;
    const hives = treesChanged ? this.farmHivesPub(conversationId, scale, now) : undefined;
    const market = marketChanged ? this.farmMarketPub(conversationId, me, now, this.farmWeek(today)) : undefined;
    const beauty = beautyChanged ? this.farmBeautyPub(conversationId, this.farmWeek(today)) : undefined;
    // 這一季全家收成幾次（豐收比賽用）：有收成才送
    const caveBest = caveOut ? this.sql.exec(`SELECT cave_best FROM farms WHERE conversation_id = ?`, conversationId).one().cave_best : undefined;
    const seasonHarvest = weekAdd.harvest ? this.sql.exec(`SELECT value FROM farm_stats WHERE conversation_id = ? AND key = 'season_harvest'`, conversationId).one().value : undefined;
    // 同一座牧場的其他人：田地、錢、倉庫、動物、小鎮的感情、加工機、建築即時同步（體力是個人的，不廣播）
    this.sendToFarm(conversationId, {
      type: 'farm-update', by: me.id, action, tiles, money, items, animals, town, rocks, dex, machines, build, pets,
      achievements, newAchievements, trees, hives, beauty, seasonHarvest, cave: caveOut || undefined, caveBest, now,
    });
    return json({ ok: true, energy: p.energy, energyMax: energyMaxOf(farm.house_level), tile: tileOut, tiles, money, items,
      animals, town, rocks, dex, machines, build, pets, achievements, newAchievements, trees, hives, market, beauty, seasonHarvest, cave: caveOut || undefined, caveBest, gained, now });
  }

  farmSpend(conversationId, cost) {
    const money = this.sql.exec(`SELECT money FROM farms WHERE conversation_id = ?`, conversationId).one().money;
    if (money < cost) throw new HttpError(400, '錢不夠');
    this.sql.exec(`UPDATE farms SET money = money - ? WHERE conversation_id = ?`, cost, conversationId);
  }

  // 餵一隻動物。先檢查完（吃過了沒、還在消化、有沒有飼料、體力），再動資料，
  // 中途出錯才不會只做一半。上一次的產品還沒收的話，順手收進倉庫
  farmFeed(conversationId, a, now, scale, today, spend) {
    if (a.fed_day === today) throw new HttpError(400, `${a.name}今天吃過了`);
    const pending = a.fed_at && !a.collected;
    if (pending && !animalHasProduct(a, now, scale)) throw new HttpError(400, `${a.name}還在消化，等一下再餵`);
    if ((this.farmItems(conversationId).feed || 0) < 1) throw new HttpError(400, '沒有飼料了，去攤位或動物小屋買');
    spend(ENERGY_COST.feed);
    const got = pending ? this.farmCollect(conversationId, a, now, scale) : null;
    this.farmAddItem(conversationId, 'feed', -1);
    // 寶寶吃了會長愛心，但還沒有產品（collected = 1）
    Object.assign(a, { fed_at: now, fed_day: today, collected: isBaby(a, now) ? 1 : 0, love: Math.min(LOVE_MAX, a.love + 1) });
    return got;
  }

  // 收產品；滿愛心的動物、小屋還有位子、離上一胎超過一週，就生一隻寶寶
  farmCollect(conversationId, a, now, scale) {
    const item = `prod:${productOf(a.kind, a.love)}`;
    this.farmAddItem(conversationId, item, 1);
    a.collected = 1;
    const count = this.sql.exec(`SELECT COUNT(*) AS n FROM farm_animals WHERE conversation_id = ? AND kind = ?`, conversationId, a.kind).one().n;
    if (!canHaveBaby(a, now, count, scale)) return { item, qty: 1 };
    const name = babyName(a.name);
    this.farmStat(conversationId, 'babies', 1);
    this.sql.exec(`INSERT INTO farm_animals (conversation_id, kind, name, bought_at, baby_until) VALUES (?, ?, ?, ?, ?)`,
      conversationId, a.kind, name, now, now + (BABY_DAYS * 86400000) / scale);
    a.last_baby_at = now;
    this.addSystemMessage(conversationId,
      `🐣 ${a.name}生了一隻${ANIMALS[a.kind].baby}「${name}」！${BABY_DAYS} 天後長大，可以到動物小屋幫牠改名字`);
    return { item, qty: 1, baby: { kind: a.kind, name } };
  }

  farmSaveAnimal(a) {
    this.sql.exec(`UPDATE farm_animals SET fed_at = ?, fed_day = ?, collected = ?, love = ?, petted_day = ?, last_baby_at = ? WHERE id = ?`,
      a.fed_at, a.fed_day, a.collected, a.love, a.petted_day, a.last_baby_at || 0, a.id);
  }

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
