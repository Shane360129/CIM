// 家族小牧場（獨立視窗）：畫面、走路、工具、商店與出貨箱。
// 規則都在伺服器（src/farm.js）判定，這裡只負責畫與送出動作；
// 作物成長在兩次同步之間由這裡用同一套公式往後推算，畫面才會即時長大。
import { sprite, houseSprite, shopSprite } from '/farm-sprites.js';

const T = 16;            // 一格 16 像素
const SPEED = 4.5;       // 每秒走幾格
const WALK = new Set(['.', '=', 'F']);
const SEASON = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const TOOLS = [
  { key: 'hoe', ico: '⛏️', name: '鋤頭' },
  { key: 'can', ico: '💧', name: '澆水' },
  { key: 'seed', ico: '🌱', name: '種子' },
  { key: 'hand', ico: '✋', name: '收成' },
];

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const convId = Number(params.get('c'));
// 聊天室的登入資訊存在同一個網域的 localStorage（兩個版本的鍵名不同）
const token = localStorage.getItem('cim_token') || localStorage.getItem('chat_token');

const S = {
  map: [], W: 0, H: 0, crops: {}, tiles: new Map(), items: {}, money: 0,
  energy: 0, energyMax: 60, members: new Map(), meId: 0, myColor: '#d9544d',
  offset: 0, scale: 1, title: '', season: 'spring',
  tool: 'hoe', seed: 'bokchoy', busy: false,
  me: { x: 5, y: 5, d: 'd', step: null, path: [], pending: null, anim: 0 },
  others: new Map(), floats: [], keys: [], view: 3, cam: { x: 0, y: 0 },
};

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const c of kids) if (c != null) n.append(c);
  return n;
};
const key = (x, y) => x + ',' + y;
const terrain = (x, y) => (S.map[y] && S.map[y][x]) || 'T';
const walkable = (x, y) => WALK.has(terrain(x, y));
const serverNow = () => Date.now() + S.offset;

function toast(msg) {
  const t = el('div', { class: 'toast', text: msg });
  $('toast-root').append(t);
  setTimeout(() => t.remove(), 2400);
}

/* ---------- 伺服器 ---------- */

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: { authorization: 'Bearer ' + token, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw Object.assign(new Error('登入已過期，請回聊天室重新登入'), { fatal: true });
  if (!res.ok) throw new Error(data.error || `發生錯誤（${res.status}）`);
  return data;
}

function setTile(t, at) {
  S.tiles.set(key(t.x, t.y), { ...t, at });
}

function applyState(st) {
  S.map = st.map; S.H = st.map.length; S.W = st.map[0].length;
  S.crops = st.crops; S.items = st.items; S.money = st.farm.money;
  S.energy = st.energy.now; S.energyMax = st.energy.max;
  S.scale = st.scale; S.season = st.season; S.title = st.farm.title;
  S.offset = st.now - Date.now();
  S.tiles.clear();
  for (const t of st.tiles) setTile(t, st.now);
  S.members = new Map(st.members.map((m) => [m.id, m]));
  S.spawn = st.spawn;
  if (!S.crops[S.seed]) S.seed = Object.keys(S.crops)[0];
  renderHud();
}

async function loadState() {
  applyState(await api(`/api/farm/${convId}`));
}

/* ---------- 作物成長（跟伺服器同一套公式） ---------- */

function grown(t, now) {
  if (!t || !t.crop) return 0;
  const wetEnd = Math.min(now, t.wetUntil);
  return Math.min(t.total, t.progress + Math.max(0, wetEnd - t.at) * S.scale);
}
function stage(t, now) {
  if (!t || !t.crop) return -1;
  const g = grown(t, now);
  if (g >= t.total) return 3;
  return Math.min(2, Math.floor((g / t.total) * 3));
}
const wet = (t, now) => !!t && t.wetUntil > now;

function fmtLeft(ms) {
  const h = ms / 3600000;
  if (h >= 1) return `${Math.floor(h)} 小時${Math.round((h % 1) * 60) ? ` ${Math.round((h % 1) * 60)} 分` : ''}`;
  return `${Math.max(1, Math.round(ms / 60000))} 分鐘`;
}

/* ---------- HUD 與工具列 ---------- */

function renderHud() {
  $('hud-title').textContent = `🌾 ${S.title}`;
  $('hud-money').textContent = S.money.toLocaleString();
  $('hud-energy').textContent = `${S.energy}/${S.energyMax}`;
  $('hud-energy-bar').style.width = `${(S.energy / S.energyMax) * 100}%`;
  document.querySelector('.energy').classList.toggle('low', S.energy <= S.energyMax * 0.15);
  renderToolbar();
}

function renderClock() {
  const d = new Date(serverNow() + 8 * 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  $('hud-clock').textContent =
    `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEK[d.getUTCDay()]}）${hh}:${mm}・${SEASON[S.season] || ''}`;
}

function renderToolbar() {
  const bar = $('toolbar');
  bar.textContent = '';
  TOOLS.forEach((tool, i) => {
    let ico = tool.ico, name = tool.name, count = null;
    if (tool.key === 'seed') {
      name = S.crops[S.seed] ? S.crops[S.seed].name : '種子';
      count = S.items['seed:' + S.seed] || 0;
    }
    bar.append(el('button', {
      class: 'tool' + (S.tool === tool.key ? ' active' : ''), type: 'button', 'aria-label': name,
      onclick: () => {
        // 種子已經選中時再按一次 → 換種子
        if (tool.key === 'seed' && S.tool === 'seed') return openSeedPicker();
        S.tool = tool.key;
        renderToolbar();
      },
    }, el('kbd', { text: String(i + 1) }), el('span', { class: 'ico', text: ico }), el('span', { text: name }),
      count != null ? el('span', { class: 'count', text: '×' + count }) : null));
  });
}

/* ---------- 彈窗：商店、出貨箱、倉庫、選種子 ---------- */

function closeModal() { $('modal-root').textContent = ''; }
function openModal(...kids) {
  const root = $('modal-root');
  root.textContent = '';
  const box = el('div', { class: 'modal', role: 'dialog' }, ...kids);
  root.append(box);
  root.onclick = (e) => { if (e.target === root) closeModal(); };
  return box;
}
function icon(name) {
  const c = el('canvas', { width: 16, height: 16 });
  c.getContext('2d').drawImage(sprite(name), 0, 0);
  return c;
}

function openShop() {
  const rows = Object.entries(S.crops).map(([id, c]) => {
    let n = 1;
    const qtyB = el('b', { text: '1' });
    const buy = el('button', { class: 'btn primary', type: 'button', text: `買 ${c.seed}` });
    const sync = () => { qtyB.textContent = n; buy.textContent = `買 ${c.seed * n}`; buy.disabled = c.seed * n > S.money; };
    buy.onclick = async () => {
      try {
        await doAct({ action: 'buy', item: 'seed:' + id, qty: n });
        toast(`買了 ${n} 包${c.name}種子`);
        sync();
      } catch {}
    };
    sync();
    return el('div', { class: 'row' }, icon(id + '_3'),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${c.name}種子` }),
        el('div', { class: 'meta', text: `${c.seed} 元・濕土 ${c.hours} 小時成熟・賣 ${c.sell} 元` })),
      el('span', { class: 'qty' },
        el('button', { type: 'button', text: '−', onclick: () => { n = Math.max(1, n - 1); sync(); } }), qtyB,
        el('button', { type: 'button', text: '＋', onclick: () => { n = Math.min(99, n + 1); sync(); } })),
      buy);
  });
  openModal(el('h2', { text: '🏪 種子店' }), el('p', { class: 'sub', text: `全家共用的錢包：${S.money.toLocaleString()} 元` }),
    ...rows, el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

function openBin() {
  const crops = Object.entries(S.crops).filter(([id]) => S.items['crop:' + id]);
  const rows = crops.map(([id, c]) => {
    const have = S.items['crop:' + id];
    return el('div', { class: 'row' }, icon(id + '_3'),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${c.name} ×${have}` }),
        el('div', { class: 'meta', text: `一個 ${c.sell} 元，全部 ${c.sell * have} 元` })),
      el('button', {
        class: 'btn primary', type: 'button', text: '全部出貨',
        onclick: async () => {
          try {
            await doAct({ action: 'ship', item: 'crop:' + id, qty: have });
            toast(`出貨 ${c.name} ×${have}，賺了 ${c.sell * have} 元 💰`);
            openBin();
          } catch {}
        },
      }));
  });
  openModal(el('h2', { text: '📦 出貨箱' }), el('p', { class: 'sub', text: '放進來的作物會馬上換成錢，存進全家共用的錢包' }),
    ...(rows.length ? rows : [el('div', { class: 'empty', text: '倉庫裡還沒有作物，先去田裡收成吧' })]),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

function openBag() {
  const rows = Object.entries(S.items).sort().map(([item, qty]) => {
    const [kind, id] = item.split(':');
    const c = S.crops[id];
    if (!c) return null;
    return el('div', { class: 'row' }, icon(kind === 'seed' ? 'seed' : id + '_3'),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: kind === 'seed' ? `${c.name}種子` : c.name }),
        el('div', { class: 'meta', text: kind === 'seed' ? '用「種子」工具種在翻好的土上' : `可以拿去出貨箱賣 ${c.sell} 元` })),
      el('b', { text: '×' + qty }));
  });
  openModal(el('h2', { text: '🎒 全家的倉庫' }), el('p', { class: 'sub', text: '種子和收成大家共用' }),
    ...(rows.filter(Boolean).length ? rows : [el('div', { class: 'empty', text: '倉庫是空的' })]),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

function openSeedPicker() {
  const rows = Object.entries(S.crops).map(([id, c]) => {
    const n = S.items['seed:' + id] || 0;
    return el('div', { class: 'row' }, icon(id + '_3'),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${c.name}種子` }), el('div', { class: 'meta', text: `還有 ${n} 包` })),
      el('button', {
        class: 'btn' + (S.seed === id ? ' primary' : ''), type: 'button', text: S.seed === id ? '使用中' : '用這個',
        onclick: () => { S.seed = id; S.tool = 'seed'; renderToolbar(); closeModal(); },
      }));
  });
  openModal(el('h2', { text: '🌱 要種什麼？' }), ...rows,
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '去商店買種子', onclick: openShop })));
}

function confirmDig(t, x, y) {
  const c = S.crops[t.crop];
  openModal(el('h2', { text: `要挖掉這株${c.name}嗎？` }), el('p', { class: 'sub', text: '挖掉就沒有了，種子不會退回。' }),
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', text: '算了', onclick: closeModal }),
      el('button', { class: 'btn primary', type: 'button', text: '挖掉', onclick: () => { closeModal(); doAct({ action: 'dig', x, y }).catch(() => {}); } })));
}

/* ---------- 動作 ---------- */

async function doAct(body) {
  if (S.busy) return;
  S.busy = true;
  try {
    const r = await api(`/api/farm/${convId}`, { method: 'POST', body });
    const spent = S.energy - r.energy;
    S.energy = r.energy; S.money = r.money; S.items = r.items;
    if (r.tile) setTile(r.tile, r.now);
    if (body.x != null) {
      if (r.gained) floatAt(body.x, body.y, `+1 ${S.crops[r.gained.item.split(':')[1]].name}`, '#fff3b0');
      else if (spent > 0) floatAt(body.x, body.y, `-${spent}⚡`, '#ffffff');
    }
    renderHud();
    return r;
  } catch (e) {
    toast(e.message);
    if (e.fatal) setTimeout(() => location.replace('/'), 1500);
    throw e;
  } finally {
    S.busy = false;
  }
}

function floatAt(x, y, text, color) {
  S.floats.push({ x: x + 0.5, y, text, color, t: 0 });
}

// 對某一格使用目前的工具（成熟的作物不管拿什麼工具都直接收成，省得換來換去）
function useOn(x, y) {
  const ch = terrain(x, y);
  if (ch === 'B') return openBin();
  if (ch === 'S') return openShop();
  if (ch === 'H') return toast('家裡還在整理中，下一期就能進去了 🏠');
  if (ch !== 'F') return;
  const t = S.tiles.get(key(x, y)) || { tilled: false, crop: null };
  const now = serverNow();
  if (t.crop && stage(t, now) === 3) return doAct({ action: 'harvest', x, y }).catch(() => {});
  if (S.tool === 'hoe') {
    if (!t.tilled) return doAct({ action: 'till', x, y }).catch(() => {});
    if (t.crop) return confirmDig(t, x, y);
    return toast('這塊已經翻好了，換「種子」來播種');
  }
  if (S.tool === 'can') {
    if (!t.tilled) return toast('要先用鋤頭翻土');
    return doAct({ action: 'water', x, y }).catch(() => {});
  }
  if (S.tool === 'seed') {
    if (!t.tilled) return toast('要先用鋤頭翻土');
    if (t.crop) return describe(t, now);
    if (!S.items['seed:' + S.seed]) { toast(`沒有${S.crops[S.seed].name}種子了，去商店買吧`); return; }
    return doAct({ action: 'plant', x, y, crop: S.seed }).catch(() => {});
  }
  if (t.crop) return describe(t, now);
  toast(t.tilled ? '翻好的土，可以播種' : '還沒翻土的田');
}

function describe(t, now) {
  const c = S.crops[t.crop];
  const left = (t.total - grown(t, now)) / S.scale;
  if (!wet(t, now)) return toast(`${c.name}：土乾了，澆水才會繼續長（還差 ${fmtLeft(left)}）`);
  toast(`${c.name}：再 ${fmtLeft(left)} 就能收成`);
}

/* ---------- 走路 ---------- */

// 從 (sx, sy) 走到 goals 裡任一格的最短路徑（地圖只有 30×20，用 BFS 就夠了）
function findPath(sx, sy, isGoal) {
  if (isGoal(sx, sy)) return [];
  const prev = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k) || !walkable(nx, ny)) continue;
      prev.set(k, [x, y]);
      if (isGoal(nx, ny)) {
        const path = [[nx, ny]];
        let p = [x, y];
        while (p && !(p[0] === sx && p[1] === sy)) { path.unshift(p); p = prev.get(key(p[0], p[1])); }
        return path;
      }
      q.push([nx, ny]);
    }
  }
  return null;
}

const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
const dirTo = (fx, fy, tx, ty) => (tx > fx ? 'r' : tx < fx ? 'l' : ty > fy ? 'd' : 'u');

function tapTile(tx, ty) {
  const me = S.me;
  const cx = Math.round(me.x), cy = Math.round(me.y);
  const ch = terrain(tx, ty);
  const target = ch === 'F' || ch === 'B' || ch === 'S' || ch === 'H';
  if (target) {
    // 走到旁邊（上下左右）再面向它動作
    const adj = (x, y) => Math.abs(x - tx) + Math.abs(y - ty) === 1;
    const path = findPath(cx, cy, adj);
    if (!path) return toast('走不過去');
    me.path = path;
    me.pending = { x: tx, y: ty };
    if (!path.length && !me.step) arrive();
  } else if (walkable(tx, ty)) {
    const path = findPath(cx, cy, (x, y) => x === tx && y === ty);
    if (path) { me.path = path; me.pending = null; }
  }
}

function arrive() {
  const me = S.me;
  const p = me.pending;
  me.pending = null;
  if (!p) return;
  me.d = dirTo(me.x, me.y, p.x, p.y);
  useOn(p.x, p.y);
}

function update(dt) {
  const me = S.me;
  if (!me.step) {
    // 鍵盤：按著方向鍵就一格一格走
    const k = S.keys[S.keys.length - 1];
    if (k && !document.querySelector('.modal')) {
      me.path = []; me.pending = null;
      me.d = k;
      const [dx, dy] = DIRS[k];
      const nx = Math.round(me.x) + dx, ny = Math.round(me.y) + dy;
      if (walkable(nx, ny)) me.step = { fx: me.x, fy: me.y, tx: nx, ty: ny, t: 0 };
    } else if (me.path.length) {
      const [nx, ny] = me.path.shift();
      me.d = dirTo(Math.round(me.x), Math.round(me.y), nx, ny);
      me.step = { fx: me.x, fy: me.y, tx: nx, ty: ny, t: 0 };
    }
  }
  if (me.step) {
    me.step.t += dt * SPEED;
    me.anim += dt;
    const s = me.step;
    const t = Math.min(1, s.t);
    me.x = s.fx + (s.tx - s.fx) * t;
    me.y = s.fy + (s.ty - s.fy) * t;
    if (s.t >= 1) {
      me.x = s.tx; me.y = s.ty; me.step = null;
      if (!me.path.length && !S.keys.length) { sendPos(false); if (me.pending) arrive(); }
    }
    if (me.step) sendPos(true);
  }
  // 其他家人：往最新收到的位置平滑移動
  for (const o of S.others.values()) {
    const dx = o.tx - o.x, dy = o.ty - o.y, dist = Math.hypot(dx, dy);
    if (dist > 6) { o.x = o.tx; o.y = o.ty; }
    else if (dist > 0.01) {
      const stepLen = Math.min(dist, dt * SPEED * 1.15);
      o.x += (dx / dist) * stepLen; o.y += (dy / dist) * stepLen; o.anim += dt;
    } else if (!o.m) o.anim = 0;
  }
  for (const f of S.floats) f.t += dt;
  S.floats = S.floats.filter((f) => f.t < 1.2);
}

/* ---------- 即時連線：看到家人走來走去 ---------- */

let ws = null, wsRetry = 1000, lastPosSent = 0, lastMoving = false;

function sendPos(moving) {
  if (!ws || ws.readyState !== 1) return;
  const now = performance.now();
  if (moving && lastMoving && now - lastPosSent < 120) return;
  lastPosSent = now; lastMoving = moving;
  ws.send(JSON.stringify({ t: 'pos', x: +S.me.x.toFixed(2), y: +S.me.y.toFixed(2), d: S.me.d, m: moving }));
}

function otherOf(id) {
  if (!S.others.has(id)) {
    const m = S.members.get(id);
    S.others.set(id, { x: S.me.x, y: S.me.y, tx: S.me.x, ty: S.me.y, d: 'd', m: false, anim: 0,
      name: m ? m.name : '家人', color: (m && m.color) || '#7a8ca8' });
  }
  return S.others.get(id);
}

function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  // 兩個版本的子協定名稱不同，兩個都附上，伺服器會選它認得的那個
  ws = new WebSocket(`${proto}${location.host}/ws?farm=${convId}`, ['cim.v1', 'chat.v1', 'token.' + token]);
  ws.onopen = () => { wsRetry = 1000; sendPos(false); };
  ws.onmessage = (e) => {
    if (e.data === 'pong') return;
    let ev;
    try { ev = JSON.parse(e.data); } catch { return; }
    if (ev.type === 'farm-presence') {
      for (const p of ev.players) { const o = otherOf(p.userId); o.x = o.tx = p.x; o.y = o.ty = p.y; o.d = p.d; }
    } else if (ev.type === 'farm-pos') {
      if (ev.userId === S.meId) return;
      const o = otherOf(ev.userId);
      if (!o.seen) { o.x = ev.x; o.y = ev.y; o.seen = true; }
      o.tx = ev.x; o.ty = ev.y; o.d = ev.d; o.m = ev.m;
    } else if (ev.type === 'farm-leave') {
      S.others.delete(ev.userId);
    } else if (ev.type === 'farm-update') {
      for (const t of ev.tiles) setTile(t, ev.now);
      S.money = ev.money; S.items = ev.items;
      if (ev.by !== S.meId && ev.action === 'harvest' && ev.tiles[0]) {
        const who = S.members.get(ev.by);
        floatAt(ev.tiles[0].x, ev.tiles[0].y, `${who ? who.name : '家人'} 收成了！`, '#fff3b0');
      }
      renderHud();
    }
  };
  ws.onclose = (e) => {
    ws = null;
    if (e.code === 4003) return fatal('你已經不是這個聊天室的成員了');
    setTimeout(connectWs, wsRetry);
    wsRetry = Math.min(wsRetry * 2, 15000);
  };
}
setInterval(() => { if (ws && ws.readyState === 1) ws.send('ping'); }, 25000);

/* ---------- 畫面 ---------- */

const canvas = $('world');
const g = canvas.getContext('2d');
let dpr = 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  // 手機約看得到 12 格寬，電腦視窗約 15 格；一律整數倍放大，像素才不會糊
  S.view = Math.max(2, Math.min(6, Math.floor(Math.min(innerWidth / (T * 13), innerHeight / (T * 10)))));
}

function baseSprite(x, y, ch) {
  if (ch === '=') return sprite('path');
  if (ch === 'W') return sprite(((Date.now() / 600) | 0) % 2 ? 'water1' : 'water0');
  if (ch === 'F') {
    const t = S.tiles.get(key(x, y));
    if (t && t.tilled) return sprite(wet(t, serverNow()) ? 'soil_wet' : 'soil_dry');
    return sprite('field');
  }
  return sprite('grass' + ((x * 7 + y * 13) % 3));
}

function draw() {
  const k = S.view * dpr;                          // 一個像素放大成幾個裝置像素
  const vw = canvas.width, vh = canvas.height;
  const worldW = S.W * T * k, worldH = S.H * T * k;
  const me = S.me;
  let camX = (me.x + 0.5) * T * k - vw / 2;
  let camY = (me.y + 0.5) * T * k - vh / 2;
  camX = worldW <= vw ? (worldW - vw) / 2 : Math.max(0, Math.min(worldW - vw, camX));
  camY = worldH <= vh ? (worldH - vh) / 2 : Math.max(0, Math.min(worldH - vh, camY));
  camX = Math.round(camX); camY = Math.round(camY);
  S.cam = { x: camX, y: camY };

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#2b7a33';
  g.fillRect(0, 0, vw, vh);
  g.imageSmoothingEnabled = false;
  g.setTransform(k, 0, 0, k, -camX, -camY);

  const x0 = Math.max(0, Math.floor(camX / (T * k)) - 1), x1 = Math.min(S.W - 1, Math.ceil((camX + vw) / (T * k)) + 1);
  const y0 = Math.max(0, Math.floor(camY / (T * k)) - 1), y1 = Math.min(S.H - 1, Math.ceil((camY + vh) / (T * k)) + 1);
  const now = serverNow();
  const blink = ((Date.now() / 400) | 0) % 2;

  // 地面
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.drawImage(baseSprite(x, y, terrain(x, y)), x * T, y * T);
  // 作物與物件
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ch = terrain(x, y);
      if (ch === 'T') g.drawImage(sprite('tree'), x * T, y * T);
      else if (ch === 'f') g.drawImage(sprite('fence'), x * T, y * T);
      else if (ch === 'B') g.drawImage(sprite('bin'), x * T, y * T);
      else if (ch === 'F') {
        const t = S.tiles.get(key(x, y));
        if (t && t.crop) {
          const st = stage(t, now);
          g.drawImage(sprite(`${t.crop}_${st}`), x * T, y * T);
          if (st === 3 && blink) g.drawImage(sprite('sparkle'), x * T, y * T);
        }
      }
    }
  }
  // 房子與商店（多格的大圖，左上角那一格畫一次）
  outer: for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (terrain(x, y) === 'H') { g.drawImage(houseSprite(), x * T, y * T); break outer; }
  outer2: for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (terrain(x, y) === 'S') { g.drawImage(shopSprite(), x * T, y * T); break outer2; }

  // 面前那一格的框（鍵盤操作時看得到要對哪一格動作）
  if (!me.step && !me.path.length) {
    const [dx, dy] = DIRS[me.d];
    const fx = Math.round(me.x) + dx, fy = Math.round(me.y) + dy;
    if ('FBSH'.includes(terrain(fx, fy))) g.drawImage(sprite('cursor'), fx * T, fy * T);
  }

  // 角色：依 y 排序，後面的先畫
  const people = [{ ...me, color: S.myColor, mine: true, moving: !!me.step }];
  for (const [id, o] of S.others) people.push({ ...o, id, moving: Math.hypot(o.tx - o.x, o.ty - o.y) > 0.01 });
  people.sort((a, b) => a.y - b.y);
  for (const p of people) {
    const frame = p.moving ? (((p.anim * 6) | 0) % 2) : 0;
    const dir = p.d === 'l' ? 'r' : p.d;
    g.drawImage(sprite(`char_${dir}${frame}`, p.color, p.d === 'l'), p.x * T, p.y * T - 5);
  }

  // 文字（名字、飄字）用螢幕座標畫，字才清楚
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.textAlign = 'center';
  g.font = `bold ${Math.round(11 * dpr)}px sans-serif`;
  for (const p of people) {
    if (p.mine) continue;
    const sx = (p.x + 0.5) * T * k - camX, sy = (p.y * T - 6) * k - camY;
    const w = g.measureText(p.name).width + 8 * dpr;
    g.fillStyle = 'rgba(43,36,33,.7)';
    g.fillRect(sx - w / 2, sy - 13 * dpr, w, 15 * dpr);
    g.fillStyle = '#fff';
    g.fillText(p.name, sx, sy - 2 * dpr);
  }
  g.font = `bold ${Math.round(13 * dpr)}px sans-serif`;
  for (const f of S.floats) {
    const sx = f.x * T * k - camX, sy = (f.y * T - f.t * 12) * k - camY;
    g.globalAlpha = Math.max(0, 1 - f.t / 1.2);
    g.lineWidth = 3 * dpr; g.strokeStyle = 'rgba(0,0,0,.6)';
    g.strokeText(f.text, sx, sy);
    g.fillStyle = f.color; g.fillText(f.text, sx, sy);
  }
  g.globalAlpha = 1;

  // 跟現實時間走：傍晚偏橘、晚上變暗
  const hour = new Date(now + 8 * 3600000).getUTCHours() + new Date(now).getUTCMinutes() / 60;
  let tint = null;
  if (hour >= 17 && hour < 19) tint = `rgba(255,140,60,${0.08 + (hour - 17) * 0.05})`;
  else if (hour >= 19 || hour < 5) tint = 'rgba(20,30,80,0.32)';
  else if (hour >= 5 && hour < 6) tint = 'rgba(255,170,120,0.12)';
  if (tint) { g.fillStyle = tint; g.fillRect(0, 0, vw, vh); }
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

/* ---------- 輸入 ---------- */

const KEYMAP = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return closeModal();
  if (document.querySelector('.modal')) return;
  const dir = KEYMAP[e.key];
  if (dir) {
    e.preventDefault();
    if (!S.keys.includes(dir)) S.keys.push(dir);
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    const [dx, dy] = DIRS[S.me.d];
    if (!S.me.step) useOn(Math.round(S.me.x) + dx, Math.round(S.me.y) + dy);
    return;
  }
  const n = Number(e.key);
  if (n >= 1 && n <= TOOLS.length) { S.tool = TOOLS[n - 1].key; renderToolbar(); }
});
addEventListener('keyup', (e) => {
  const dir = KEYMAP[e.key];
  if (dir) S.keys = S.keys.filter((k) => k !== dir);
});
addEventListener('blur', () => { S.keys = []; });

let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) { down = null; return; }
  down = null;
  const k = S.view * dpr;
  const wx = (e.clientX * dpr + S.cam.x) / k, wy = (e.clientY * dpr + S.cam.y) / k;
  tapTile(Math.floor(wx / T), Math.floor(wy / T));
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
$('btn-bag').addEventListener('click', openBag);
// 從聊天室開的新視窗直接關掉；直接打開網址的話回聊天室
$('btn-close').addEventListener('click', () => {
  if (window.opener) window.close();
  else location.href = '/';
});
addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') loadState().catch(() => {}); });

/* ---------- 啟動 ---------- */

function fatal(msg) {
  const boot = $('boot');
  boot.classList.remove('hidden');
  boot.textContent = '';
  boot.append(el('div', { text: msg }), el('a', { href: '/', text: '回聊天室' }));
}

async function boot() {
  if (!token) return fatal('請先在聊天室登入，再從聊天室右上角 ☰ 打開牧場');
  if (!convId) return fatal('找不到要打開哪一座牧場，請從聊天室右上角 ☰ 打開');
  try {
    const [meRes] = await Promise.all([api('/api/me'), loadState()]);
    S.meId = meRes.user.id;
    if (meRes.user.avatarColor) S.myColor = meRes.user.avatarColor;
  } catch (e) {
    return fatal(e.message);
  }
  S.me.x = S.spawn.x; S.me.y = S.spawn.y;
  document.title = `🌾 ${S.title}・家族小牧場`;
  resize();
  $('hud').classList.remove('hidden');
  $('toolbar').classList.remove('hidden');
  $('boot').classList.add('hidden');
  renderHud(); renderClock();
  setInterval(renderClock, 15000);
  setInterval(() => loadState().catch(() => {}), 60000);
  connectWs();
  requestAnimationFrame(frame);
}
// 自動化測試用：網址帶 ?test 時，讓測試程式知道某一格在螢幕上的哪裡（正常使用不會出現）
if (params.has('test')) {
  window.__farm = {
    S,
    tileToScreen(x, y) {
      const k = S.view * dpr;
      return { x: ((x + 0.5) * T * k - S.cam.x) / dpr, y: ((y + 0.5) * T * k - S.cam.y) / dpr };
    },
    stageAt(x, y) { return stage(S.tiles.get(key(x, y)), serverNow()); },
  };
}
boot();
