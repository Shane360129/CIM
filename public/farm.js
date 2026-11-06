// 家族小牧場（獨立視窗）：畫面、走路、工具、商店與出貨箱。
// 規則都在伺服器（src/farm.js）判定，這裡只負責畫與送出動作；
// 作物成長在兩次同步之間由這裡用同一套公式往後推算，畫面才會即時長大。
import {
  sprite, cropSprite, houseSprite, shopSprite, barnSprite, storeSprite, eaterySprite, homeSprite, fountainSprite, SEASON_GROUND,
} from '/farm-sprites.js';

const T = 16;            // 一格 16 像素
const SPEED = 4.5;       // 每秒走幾格
const WALK = new Set(['.', '=', 'F', 'p', ',', 'E']);
// 點了會走過去互動的東西：田、出貨箱、攤位、房子、動物小屋；小鎮的雜貨店、小吃店、民宅、噴水池、告示板
const TARGETS = 'FBSHAGRQONW';
const EXIT_LABEL = { town: '🏘️ 往小鎮', farm: '🌾 回牧場', hill: '⛰️ 往後山' };
const SEASON = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_MONTHS = { spring: '3～5 月', summer: '6～8 月', autumn: '9～11 月', winter: '12～2 月' };
const WEATHER = { sun: ['☀️', '晴天'], cloud: ['⛅', '多雲'], rain: ['🌧️', '下雨'] };
// 春天有些樹是櫻花、秋天有些樹是紅楓
const TREE_ALT = { spring: 'cherry', autumn: 'maple' };
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
  offset: 0, scale: 1, title: '', season: 'spring', seasonEndsAt: 0, weather: { today: 'sun', tomorrow: 'sun' },
  rainWarned: false,
  animals: [], animalKinds: {}, products: {}, feedPrice: 10, penTiles: [],
  area: 'farm', maps: {}, arrive: {}, villagers: {}, friends: {}, request: null, tools: { hoe: 1, can: 1 },
  foods: {}, toolShop: {}, villagersOut: true, talks: 0,
  exits: {}, fishData: {}, oreData: {}, rocks: [], dex: [], fishing: null, dishes: {}, ingGroups: {},
  festivals: {}, festival: null, festivalClaimed: false, nextFestival: null, todayEvents: [], birthdays: [],
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
const rockAt = (x, y) => S.area === 'hill' && S.rocks.find((r) => r.x === x && r.y === y);
// 後山的石頭擋路，挖掉才過得去
const walkable = (x, y) => WALK.has(terrain(x, y)) && !rockAt(x, y);
const serverNow = () => Date.now() + S.offset;
const inSeason = (id) => !!S.crops[id] && S.crops[id].seasons.includes(S.season);
const seasonsText = (list) => (list.length === 4 ? '一年四季' : list.map((x) => SEASON[x] + '天').join('、'));
const cropMeta = (c) => `${c.hours} 小時成熟・賣 ${c.sell} 元` + (c.regrow ? `・收成後每 ${c.regrow} 小時再收一次` : '');
const PRODUCT_EMOJI = { egg: '🥚', egg_l: '🥚', milk: '🥛', milk_l: '🥛' };
// 倉庫裡的東西：seed:作物、crop:作物、prod:雞蛋牛奶、feed 飼料
function itemInfo(item) {
  const [kind, id] = item.split(':');
  if (item === 'feed') return { name: '飼料', icon: 'feed', sell: 0 };
  if (kind === 'seed' && S.crops[id]) return { name: `${S.crops[id].name}種子`, icon: 'seed', sell: 0, crop: id };
  if (kind === 'crop' && S.crops[id]) return { name: S.crops[id].name, icon: id + '_3', sell: S.crops[id].sell };
  if (kind === 'prod' && S.products[id]) return { name: S.products[id].name, icon: id, sell: S.products[id].sell };
  if (kind === 'fish' && S.fishData[id]) return { name: S.fishData[id].name, icon: 'fish_' + id, sell: S.fishData[id].sell };
  if (kind === 'ore' && S.oreData[id]) return { name: S.oreData[id].name, icon: 'ore_' + id, sell: S.oreData[id].sell };
  if (kind === 'dish' && S.dishes[id]) return { name: S.dishes[id].name, icon: `dish_${id}@${S.dishes[id].shape}`, sell: S.dishes[id].sell, dish: id };
  return null;
}
// 料理的材料：egg／milk 普通的、高級的都算
const ingItems = (k) => (S.ingGroups[k] ? S.ingGroups[k].items : [k]);
const ingName = (k) => (S.ingGroups[k] ? S.ingGroups[k].name : (itemInfo(k) || { name: k }).name);
const ingHave = (k) => ingItems(k).reduce((n, i) => n + (S.items[i] || 0), 0);
const canCook = (id) => !!S.dishes[id].need && Object.entries(S.dishes[id].need).every(([k, q]) => ingHave(k) >= q);
const heartsText = (n) => '❤️'.repeat(n) + '🤍'.repeat(5 - n);

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

function applyTown(t) {
  if (!t) return;
  S.friends = t.friends; S.request = t.request; S.tools = t.tools;
  if (t.festivalClaimed !== undefined) S.festivalClaimed = t.festivalClaimed;
}

function applyState(st) {
  // 兩張地圖：牧場和小鎮；重新同步時留在原本那一張
  S.maps = { farm: st.map, town: st.town || st.map, hill: st.hill || st.map };
  S.exits = st.exits || {}; S.fishData = st.fish || {}; S.oreData = st.ores || {};
  S.rocks = st.rocks || []; S.dex = st.dex || [];
  S.dishes = st.dishes || {}; S.ingGroups = st.ingredientGroups || {};
  S.festivals = st.festivals || {}; S.festival = st.festival || null; S.nextFestival = st.nextFestival || null;
  S.todayEvents = st.todayEvents || []; S.birthdays = st.birthdays || [];
  for (const id of Object.keys(villagerTiles)) delete villagerTiles[id]; // 節日村民會換到廣場
  S.map = S.maps[S.area]; S.H = S.map.length; S.W = S.map[0].length;
  S.arrive = st.arrive || {}; S.villagers = st.villagers || {}; S.foods = st.foods || {}; S.toolShop = st.toolShop || {};
  S.villagersOut = st.villagersOut !== false;
  applyTown(st);
  S.crops = st.crops; S.items = st.items; S.money = st.farm.money;
  S.energy = st.energy.now; S.energyMax = st.energy.max;
  S.scale = st.scale; S.season = st.season; S.title = st.farm.title;
  S.weather = st.weather; S.seasonEndsAt = st.seasonEndsAt;
  S.animals = st.animals || []; S.animalKinds = st.animalKinds || {}; S.products = st.products || {};
  S.feedPrice = st.feedPrice || 10;
  if (st.pen && !S.penTiles.length)
    for (let y = st.pen.y0; y <= st.pen.y1; y++) for (let x = st.pen.x0; x <= st.pen.x1; x++) S.penTiles.push({ x, y });
  S.offset = st.now - Date.now();
  S.tiles.clear();
  for (const t of st.tiles) setTile(t, st.now);
  S.members = new Map(st.members.map((m) => [m.id, m]));
  S.spawn = st.spawn;
  // 手上的種子不是這一季的，就換成這一季有的（優先選倉庫裡有的）
  if (!inSeason(S.seed)) {
    const ids = Object.keys(S.crops).filter(inSeason);
    S.seed = ids.find((id) => S.items['seed:' + id]) || ids[0] || 'bokchoy';
  }
  renderHud(); renderClock();
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
    `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEK[d.getUTCDay()]}）${hh}:${mm}・${SEASON[S.season] || ''} ${(WEATHER[S.weather.today] || WEATHER.sun)[0]}` +
    (S.festival && S.festivals[S.festival] ? ` ${S.festivals[S.festival].emoji}` : '') + (S.birthdays.length ? ' 🎂' : '');
}

function renderToolbar() {
  const bar = $('toolbar');
  bar.textContent = '';
  TOOLS.forEach((tool, i) => {
    let ico = tool.ico, name = tool.name, count = null;
    if ((tool.key === 'hoe' || tool.key === 'can') && S.tools[tool.key] >= 2) { name = '大' + name; count = '3×3'; }
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
      count != null ? el('span', { class: 'count', text: typeof count === 'number' ? '×' + count : count }) : null));
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
function icon(name, shirt, tint) {
  const c = el('canvas', { width: 16, height: 16 });
  c.getContext('2d').drawImage(sprite(name, shirt, false, tint || ''), 0, 0);
  return c;
}

function openShop() {
  const rows = Object.entries(S.crops).filter(([id]) => inSeason(id)).map(([id, c]) => {
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
        el('div', { class: 'meta', text: `${c.seed} 元・${cropMeta(c)}` })),
      el('span', { class: 'qty' },
        el('button', { type: 'button', text: '−', onclick: () => { n = Math.max(1, n - 1); sync(); } }), qtyB,
        el('button', { type: 'button', text: '＋', onclick: () => { n = Math.min(99, n + 1); sync(); } })),
      buy);
  });
  const next = SEASON_ORDER[(SEASON_ORDER.indexOf(S.season) + 1) % 4];
  const coming = Object.entries(S.crops).filter(([id, c]) => !inSeason(id) && c.seasons.includes(next)).map(([, c]) => c.name);
  openModal(el('h2', { text: `🏪 種子店・${SEASON[S.season]}天` }),
    el('p', { class: 'sub', text: `全家共用的錢包：${S.money.toLocaleString()} 元。作物都要土是濕的才會長。` }),
    ...rows, feedRow(),
    coming.length ? el('p', { class: 'note', text: `${SEASON[next]}天會上架：${coming.join('、')}` }) : null,
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

function openBin() {
  const sellable = Object.keys(S.items).filter((item) => (itemInfo(item) || {}).sell).sort();
  const rows = sellable.map((item) => {
    const c = itemInfo(item);
    const have = S.items[item];
    return el('div', { class: 'row' }, icon(c.icon),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${c.name} ×${have}` }),
        el('div', { class: 'meta', text: `一個 ${c.sell} 元，全部 ${c.sell * have} 元` })),
      el('button', {
        class: 'btn primary', type: 'button', text: '全部出貨',
        onclick: async () => {
          try {
            await doAct({ action: 'ship', item, qty: have });
            toast(`出貨 ${c.name} ×${have}，賺了 ${c.sell * have} 元 💰`);
            openBin();
          } catch {}
        },
      }));
  });
  openModal(el('h2', { text: '📦 出貨箱' }), el('p', { class: 'sub', text: '放進來的作物會馬上換成錢，存進全家共用的錢包' }),
    ...(rows.length ? rows : [el('div', { class: 'empty', text: '倉庫裡還沒有作物或雞蛋牛奶，先去收成吧' })]),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

function openBag() {
  const rows = Object.entries(S.items).sort().map(([item, qty]) => {
    const c = itemInfo(item);
    if (!c) return null;
    const meta = item === 'feed' ? '去動物小屋餵動物，一隻吃一包'
      : c.crop ? (inSeason(c.crop) ? '用「種子」工具種在翻好的土上' : `${seasonsText(S.crops[c.crop].seasons)}才能種，先收著`)
      : c.dish ? `吃了體力 +${S.dishes[c.dish].energy}，或出貨賣 ${c.sell} 元`
      : `可以拿去出貨箱賣 ${c.sell} 元`;
    return el('div', { class: 'row' }, icon(c.icon),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: c.name }), el('div', { class: 'meta', text: meta })),
      el('b', { text: '×' + qty }),
      c.dish ? el('button', { class: 'btn', type: 'button', text: '吃', disabled: S.energy >= S.energyMax, onclick: () => eatDish(c.dish, openBag) }) : null);
  });
  openModal(el('h2', { text: '🎒 全家的倉庫' }), el('p', { class: 'sub', text: '種子和收成大家共用' }),
    ...(rows.filter(Boolean).length ? rows : [el('div', { class: 'empty', text: '倉庫是空的' })]),
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', text: '📖 圖鑑', onclick: openDex }),
      el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 飼料（攤位和動物小屋都買得到）
function feedRow(after) {
  let n = 10;
  const qtyB = el('b', { text: '10' });
  const buy = el('button', { class: 'btn primary', type: 'button' });
  const sync = () => { qtyB.textContent = n; buy.textContent = `買 ${S.feedPrice * n}`; buy.disabled = S.feedPrice * n > S.money; };
  buy.onclick = async () => {
    try { await doAct({ action: 'buy', item: 'feed', qty: n }); toast(`買了 ${n} 包飼料`); sync(); if (after) after(); } catch {}
  };
  sync();
  return el('div', { class: 'row' }, icon('feed'),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: '動物飼料' }),
      el('div', { class: 'meta', text: `${S.feedPrice} 元・一隻動物一天吃一包・倉庫有 ${S.items.feed || 0} 包` })),
    el('span', { class: 'qty' },
      el('button', { type: 'button', text: '−', onclick: () => { n = Math.max(1, n - 1); sync(); } }), qtyB,
      el('button', { type: 'button', text: '＋', onclick: () => { n = Math.min(99, n + 1); sync(); } })),
    buy);
}

/* ---------- 動物 ---------- */

const animalReady = (a, now = serverNow()) => !!a.readyAt && now >= a.readyAt;
const fmtClock = (t) => { const d = new Date(t + 8 * 3600000); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
function animalStatus(a) {
  const pname = S.products[a.product] ? S.products[a.product].name : '';
  if (animalReady(a)) return `有${pname}可以收！`;
  if (a.readyAt) return `今天吃飽了，${pname}大約 ${fmtClock(a.readyAt)} 好`;
  if (!a.fedToday) return '肚子餓了，等你餵飯';
  return `今天的${pname}收過了，明天再餵`;
}

// 動物小屋：看每隻動物、一次餵完、一次收完、買新動物、買飼料
function openBarn() {
  const kinds = S.animalKinds;
  const count = (k) => S.animals.filter((a) => a.kind === k).length;
  const hungry = S.animals.filter((a) => !a.fedToday && !(a.readyAt && !animalReady(a))).length;
  const ready = S.animals.filter((a) => animalReady(a)).length;
  const rows = S.animals.map((a) => el('div', { class: 'row' }, icon(a.kind + '_0'),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: `${a.name}　${heartsText(a.hearts)}` }),
      el('div', { class: 'meta', text: animalStatus(a) + (a.pettedToday ? '' : '・今天還沒摸摸') }))));
  const actions = el('div', { class: 'actions wrap' },
    el('button', {
      class: 'btn primary', type: 'button', text: `全部餵飯（${hungry} 隻）`, disabled: !hungry,
      onclick: async () => { try { const r = await doAct({ action: 'feed_all' }); toast(`餵了 ${r.gained.count} 隻 🍽️`); openBarn(); } catch {} },
    }),
    el('button', {
      class: 'btn primary', type: 'button', text: `全部收（${ready}）`, disabled: !ready,
      onclick: async () => {
        try {
          const r = await doAct({ action: 'collect_all' });
          toast('收到 ' + Object.entries(r.gained.items).map(([it, n]) => `${itemInfo(it).name} ×${n}`).join('、'));
          openBarn();
        } catch {}
      },
    }));
  const buyRows = Object.entries(kinds).map(([k, A]) => {
    const p = S.products[A.product];
    const input = el('input', { type: 'text', maxlength: '8', placeholder: '幫牠取名字', 'aria-label': `新的${A.name}的名字` });
    const full = count(k) >= A.max;
    const buy = el('button', {
      class: 'btn primary', type: 'button', text: full ? '滿了' : `買 ${A.price}`, disabled: full || A.price > S.money,
      onclick: async () => {
        const name = input.value.trim();
        if (!name) { input.focus(); return toast('先幫牠取個名字吧'); }
        try { await doAct({ action: 'buy_animal', kind: k, name }); toast(`${name}來到牧場了！`); openBarn(); } catch {}
      },
    });
    return el('div', { class: 'row' }, icon(k + '_0'),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${A.name}・${A.price} 元（${count(k)}/${A.max}）` }),
        el('div', { class: 'meta', text: `每天餵一次，${A.hours} 小時後有${p.name}（${p.sell} 元，很喜歡你的話更值錢）` }),
        input),
      buy);
  });
  openModal(el('h2', { text: '🐔 動物小屋 🐄' }),
    el('p', { class: 'sub', text: `飼料 ${S.items.feed || 0} 包・錢包 ${S.money.toLocaleString()} 元。走到動物旁邊點牠：摸摸、餵飯、收雞蛋牛奶。` }),
    ...(rows.length ? [...rows, actions] : [el('div', { class: 'empty', text: '還沒有動物，先買一隻雞吧 🐣' })]),
    el('h2', { class: 'section', text: '買動物' }), ...buyRows,
    el('h2', { class: 'section', text: '飼料' }), feedRow(openBarn),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 動物在柵欄裡散步：位置由「動物編號＋現在時間」算出來，全家看到的位置一樣，不用一直傳
function hash32(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
const SLOT = 7000;
function animalPos(a, now) {
  const tiles = S.penTiles;
  if (!tiles.length) return { x: 0, y: 0, moving: false, flip: false };
  const hour = new Date(now + 8 * 3600000).getUTCHours();
  if (hour >= 20 || hour < 6) { // 晚上睡覺，不走動
    const p = tiles[hash32(a.id * 31 + Math.floor((now + 8 * 3600000) / 86400000)) % tiles.length];
    return { x: p.x, y: p.y, moving: false, flip: false, sleep: true };
  }
  const t = now + (hash32(a.id * 7919) % SLOT);
  const slot = Math.floor(t / SLOT);
  const from = tiles[hash32(a.id * 100003 + slot - 1) % tiles.length];
  const to = tiles[hash32(a.id * 100003 + slot) % tiles.length];
  const walk = Math.min(1, ((t % SLOT) / SLOT) / 0.45);
  return { x: from.x + (to.x - from.x) * walk, y: from.y + (to.y - from.y) * walk,
    moving: walk < 1 && (from.x !== to.x || from.y !== to.y), flip: to.x < from.x };
}
function animalAt(tx, ty, now = serverNow()) {
  let best = null, bd = 0.8;
  for (const a of S.animals) {
    const p = animalPos(a, now);
    const d = Math.hypot(p.x - tx, p.y - ty);
    if (d < bd) { best = a; bd = d; }
  }
  return best;
}

// 點動物：有產品就收 → 今天還沒摸就摸摸 → 還沒吃就餵 → 不然說說牠的狀況
async function useOnAnimal(a) {
  const p = animalPos(a, serverNow());
  const pname = S.products[a.product] ? S.products[a.product].name : '';
  try {
    if (animalReady(a)) {
      const r = await doAct({ action: 'collect', animalId: a.id });
      floatAt(p.x, p.y, `+1 ${itemInfo(r.gained.item).name}`, '#fff3b0');
    } else if (!a.pettedToday) {
      await doAct({ action: 'pet', animalId: a.id });
      floatAt(p.x, p.y, '❤️', '#ff8fa3');
      toast(`${a.name}很開心！`);
    } else if (!a.fedToday) {
      if (!S.items.feed) return toast(`${a.name}肚子餓了，去攤位或動物小屋買飼料吧`);
      await doAct({ action: 'feed', animalId: a.id });
      floatAt(p.x, p.y, '🍽️ -1⚡', '#ffffff');
      toast(`${a.name}吃飽了，${S.animalKinds[a.kind].hours} 小時後有${pname}`);
    } else {
      toast(`${a.name} ${heartsText(a.hearts)}：${animalStatus(a)}`);
    }
  } catch {}
}

/* ---------- 小鎮 ---------- */

const BIG = { H: 1, S: 1, A: 1, G: 1, R: 1, Q: 1, O: 1 };
const HOMES = ['ama', 'lin', 'jie'];   // 三間民宅由左到右：王阿嬤、林老師、小傑家
function homeIndex(x, y) {
  const tops = [];
  for (let yy = 0; yy < S.H; yy++) for (let xx = 0; xx < S.W; xx++)
    if (terrain(xx, yy) === 'Q' && terrain(xx - 1, yy) !== 'Q' && terrain(xx, yy - 1) !== 'Q') tops.push([xx, yy]);
  return tops.findIndex(([tx, ty]) => x >= tx && x < tx + 3 && y >= ty && y < ty + 2);
}

// 走到 E：牧場 ↔ 小鎮
function switchArea() {
  const from = S.area;
  const ex = (S.exits[from] || []).find((e) => e.x === Math.round(S.me.x) && e.y === Math.round(S.me.y));
  if (!ex) return;
  const to = ex.to;
  S.area = to;
  S.map = S.maps[to];
  const p = S.arrive[`${from}>${to}`] || S.spawn;
  const d = p.y <= 1 ? 'd' : p.y >= S.H - 2 ? 'u' : p.x <= 1 ? 'r' : 'l';
  Object.assign(S.me, { x: p.x, y: p.y, step: null, path: [], pending: null, d });
  S.floats = [];
  S.fishing = null;
  closeModal();
  sendPos(false);
  toast({ town: '🏘️ 來到小鎮了', farm: '🌾 回到牧場了', hill: '⛰️ 來到後山了' }[to]);
}

/* ---------- 釣魚、挖礦 ---------- */

// 拋竿 → 等魚上鉤（1～4 秒）→ 出現 ❗ 之後 1.5 秒內點畫面（或按空白鍵）就拉到；太早點會把魚嚇跑
function startFishing(x, y) {
  if (S.fishing || S.busy) return;
  if (S.energy < 2) return toast('體力不夠了，明天再來釣吧 😴');
  const now = performance.now();
  S.fishing = { x, y, state: 'wait', bite: now + 1000 + Math.random() * 3000, end: 0 };
  toast('拋竿！看到 ❗ 就趕快點畫面');
}
function fishTick() {
  const f = S.fishing;
  if (!f) return;
  const now = performance.now();
  if (f.state === 'wait' && now >= f.bite) { f.state = 'bite'; f.end = now + 1500; }
  else if (f.state === 'bite' && now > f.end) finishFishing(false, '太慢了，魚跑掉了');
}
async function finishFishing(hooked, why) {
  const f = S.fishing;
  if (!f) return;
  S.fishing = null;
  try {
    const r = await doAct({ action: 'fish', area: S.area, x: f.x, y: f.y, hooked });
    if (r.gained && r.gained.item) {
      const c = itemInfo(r.gained.item);
      floatAt(f.x, f.y, `+1 ${c.name}`, '#fff3b0');
      toast(r.gained.first ? `🎉 第一次釣到${c.name}！圖鑑新增一種` : `釣到${c.name}了！`);
    } else toast(why);
  } catch {}
}
// 釣魚中點畫面：看到 ❗ 才拉，不然太早
function fishTap() {
  const f = S.fishing;
  if (!f) return false;
  if (f.state === 'bite') finishFishing(true);
  else finishFishing(false, '太早拉了，魚被嚇跑了');
  return true;
}
async function mineRock(x, y) {
  try {
    const r = await doAct({ action: 'mine', x, y });
    const c = itemInfo(r.gained.item);
    floatAt(x, y, `+1 ${c.name}`, '#fff3b0');
    if (r.gained.first && r.gained.item !== 'ore:stone') toast(`🎉 第一次挖到${c.name}！圖鑑新增一種`);
  } catch {}
}

const recipeIds = () => Object.keys(S.dishes).filter((id) => S.dishes[id].need);
// 家裡的廚房：用倉庫裡的東西煮菜（不花體力），煮好的菜可以吃、賣、送人
function openKitchen() {
  const ids = recipeIds().sort((a, b) => (canCook(b) ? 1 : 0) - (canCook(a) ? 1 : 0));
  const rows = ids.map((id) => {
    const d = S.dishes[id];
    const need = Object.entries(d.need).map(([k, q]) => `${ingName(k)} ${Math.min(ingHave(k), q)}/${q}`).join('・');
    const ok = canCook(id);
    return el('div', { class: 'row' + (ok ? '' : ' off') }, icon(`dish_${id}@${d.shape}`),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: d.name + (S.dex.includes('dish:' + id) ? '' : '　🆕') }),
        el('div', { class: 'meta', text: `${need}｜體力 +${d.energy}・賣 ${d.sell} 元` })),
      el('button', {
        class: 'btn primary', type: 'button', text: '煮', disabled: !ok,
        onclick: async () => {
          try {
            const r = await doAct({ action: 'cook', dish: id });
            toast(r.gained.first ? `🎉 第一次做${d.name}！聊天室也知道了` : `煮好了：${d.name}`);
            openKitchen();
          } catch {}
        },
      }));
  });
  const cooked = Object.keys(S.items).filter((i) => i.startsWith('dish:') && itemInfo(i));
  openModal(el('h2', { text: '🍳 家裡的廚房' }),
    el('p', { class: 'sub', text: `用自己種的、養的、釣的東西煮菜（不花體力）。煮好的菜可以吃、拿去出貨、送村民。體力 ${S.energy}/${S.energyMax}` }),
    ...(cooked.length ? [el('h2', { class: 'section', text: '煮好的菜' }), ...cooked.map((i) => {
      const c = itemInfo(i);
      return el('div', { class: 'row' }, icon(c.icon),
        el('div', { class: 'grow' }, el('div', { class: 'name', text: `${c.name} ×${S.items[i]}` }),
          el('div', { class: 'meta', text: `吃了體力 +${S.dishes[c.dish].energy}` })),
        el('button', { class: 'btn', type: 'button', text: '吃', disabled: S.energy >= S.energyMax, onclick: () => eatDish(c.dish, openKitchen) }));
    })] : []),
    el('h2', { class: 'section', text: '食譜' }), ...rows,
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
async function eatDish(id, after) {
  try { await doAct({ action: 'eat_dish', dish: id }); toast(`好吃！體力 ${S.energy}/${S.energyMax}`); if (after) after(); } catch {}
}

// 圖鑑：釣過、挖過的魚和礦石
function openDex() {
  const have = new Set(S.dex);
  const section = (kind, data) => Object.entries(data).map(([id, d]) => {
    const got = have.has(`${kind}:${id}`);
    return el('div', { class: 'row' + (got ? '' : ' off') }, got ? icon((kind === 'fish' ? 'fish_' : 'ore_') + id) : el('span', { class: 'big', text: '❔' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: got ? d.name : '？？？' }),
        el('div', { class: 'meta', text: got ? `賣 ${d.sell} 元${kind === 'fish' ? fishHint(d) : ''}` : kind === 'fish' ? fishHint(d, true) : '在後山的採石場挖挖看' })));
  });
  const nf = Object.keys(S.fishData).filter((id) => have.has('fish:' + id)).length;
  const no = Object.keys(S.oreData).filter((id) => have.has('ore:' + id)).length;
  openModal(el('h2', { text: '📖 圖鑑' }),
    el('p', { class: 'sub', text: `魚 ${nf}/${Object.keys(S.fishData).length}・礦石 ${no}/${Object.keys(S.oreData).length}・料理 ${recipeIds().filter((id) => have.has('dish:' + id)).length}/${recipeIds().length}。第一次拿到會在聊天室說一聲。` }),
    el('h2', { class: 'section', text: '🎣 魚' }), ...section('fish', S.fishData),
    el('h2', { class: 'section', text: '⛏️ 礦石' }), ...section('ore', S.oreData),
    el('h2', { class: 'section', text: `🍳 料理 ${recipeIds().filter((id) => have.has('dish:' + id)).length}/${recipeIds().length}` }),
    ...recipeIds().map((id) => [id, S.dishes[id]]).map(([id, d]) => {
      const got = have.has('dish:' + id);
      return el('div', { class: 'row' + (got ? '' : ' off') }, got ? icon(`dish_${id}@${d.shape}`) : el('span', { class: 'big', text: '❔' }),
        el('div', { class: 'grow' }, el('div', { class: 'name', text: got ? d.name : '？？？' }),
          el('div', { class: 'meta', text: got ? `賣 ${d.sell} 元・體力 +${d.energy}` : '到家裡的廚房看看食譜' })));
    }),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
function fishHint(d, unknown) {
  const where = d.where.map((w) => (w === 'pond' ? '牧場池塘' : '後山的湖')).join('、');
  const when = d.time === 'day' ? '白天' : d.time === 'night' ? '晚上' : '';
  const seasons = d.seasons.length === 4 ? '' : d.seasons.map((x) => SEASON[x]).join('') + '天';
  const hint = [where, seasons, when].filter(Boolean).join('・');
  return unknown ? `提示：${hint}` : `・${hint}`;
}

// 村民在自己那一帶走來走去，位置由「村民＋時間」算出來，全家看到的一樣
const villagerTiles = {};
const PLAZA = { x0: 9, y0: 7, x1: 20, y1: 11 };
function zoneTiles(id) {
  if (villagerTiles[id]) return villagerTiles[id];
  // 節日大家都到廣場（雜貨店、小吃店的老闆還是顧店）
  const z = S.festival && id !== 'fu' && id !== 'mei' ? PLAZA : S.villagers[id].zone, out = [];
  for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++)
    if (WALK.has(((S.maps.town || [])[y] || '')[x])) out.push({ x, y });
  return (villagerTiles[id] = out);
}
const idNum = (id) => [...id].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) % 100000;
function villagerPos(id, now) {
  const tiles = zoneTiles(id);
  if (!tiles.length) return { x: 0, y: 0, moving: false, d: 'd' };
  const VSLOT = 9000, n = idNum(id);
  const t = now + (hash32(n * 7919) % VSLOT);
  const slot = Math.floor(t / VSLOT);
  const from = tiles[hash32(n * 100003 + slot - 1) % tiles.length];
  const to = tiles[hash32(n * 100003 + slot) % tiles.length];
  const walk = Math.min(1, ((t % VSLOT) / VSLOT) / 0.4);
  const moving = walk < 1 && (from.x !== to.x || from.y !== to.y);
  const dx = to.x - from.x, dy = to.y - from.y;
  const d = !moving ? 'd' : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
  return { x: from.x + dx * walk, y: from.y + dy * walk, moving, d };
}
function villagerAt(tx, ty, now = serverNow()) {
  if (!S.villagersOut) return null;
  let best = null, bd = 0.8;
  for (const id of Object.keys(S.villagers)) {
    const p = villagerPos(id, now);
    const d = Math.hypot(p.x - tx, p.y - ty);
    if (d < bd) { best = id; bd = d; }
  }
  return best;
}
const todayTW = () => new Date(serverNow() + 8 * 3600000).toISOString().slice(0, 10);
const isBirthdayToday = (id) => S.villagers[id] && S.villagers[id].birthday === todayTW().slice(5);
// 今天要說的話：依季節、天氣、感情挑，每天不一樣，同一天多聊幾次也會換
function lineOf(id) {
  const v = S.villagers[id], L = v.lines, f = S.friends[id] || { hearts: 0 };
  if (isBirthdayToday(id)) return '今天是我的生日耶！你記得嗎？';
  // 節日、家人生日：一半的時候說應景的話
  const F = S.festival && S.festivals[S.festival];
  if (F && S.talks % 2 === 0) return F.line;
  if (S.birthdays.length && S.talks % 2 === 1) return `聽說今天是「${S.birthdays[0]}」？替我說聲生日快樂！`;
  const pool = [...L.any, ...(L[S.season] || []), ...(L[S.season] || [])];
  if (S.weather.today === 'rain') pool.push(...L.rain, ...L.rain);
  if (f.hearts >= 6) pool.push(...L.close, ...L.close);
  const day = Number(todayTW().replace(/-/g, '')) % 997;
  return pool[(hash32(day * 31 + idNum(id)) + S.talks) % pool.length];
}
const REACTION = {
  love: ['哇！這是我最喜歡的！你怎麼知道？謝謝你！', '😍'],
  like: ['謝謝你，我很喜歡！', '😊'],
  neutral: ['謝謝你，你人真好。', '🙂'],
  dislike: ['呃……謝謝，這個我不太喜歡……', '😅'],
};
function rewardText(rs) {
  return (rs || []).map((r) => `💌 ${S.villagers[r.villager].name}送了你們家${r.money ? r.money + ' 元' : r.item === 'feed' ? r.qty + ' 包飼料' : `${r.qty} 包${itemInfo(r.item).name}`}！`).join(' ');
}

async function openVillager(id) {
  const v = S.villagers[id];
  let r;
  try { r = await doAct({ action: 'talk', villager: id }); } catch { return; }
  S.talks++;
  const f = S.friends[id] || { hearts: 0, giftedToday: false };
  const line = lineOf(id);
  openModal(
    el('div', { class: 'talk-head' }, icon('char_d0', v.color, v.hair),
      el('div', { class: 'grow' }, el('h2', { text: `${v.name}${isBirthdayToday(id) ? ' 🎂' : ''}` }),
        el('div', { class: 'sub', text: `${v.role}・${friendText(f)}` }))),
    el('p', { class: 'speech', text: line }),
    rewardText(r.gained && r.gained.rewards) ? el('p', { class: 'note', text: rewardText(r.gained.rewards) }) : null,
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', text: '再見', onclick: closeModal }),
      el('button', {
        class: 'btn primary', type: 'button', disabled: f.giftedToday,
        text: f.giftedToday ? '今天送過禮了' : '🎁 送禮物', onclick: () => openGift(id),
      })));
}
// 感情：每 10 點一顆愛心（最多 10 顆），也顯示點數，送禮後看得出有進步
const friendText = (f) => `❤️×${(f && f.hearts) || 0}・感情 ${(f && f.points) || 0}/100`;

function openGift(id) {
  const v = S.villagers[id];
  const list = Object.keys(S.items).filter((item) => /^(crop|prod):/.test(item) && itemInfo(item)).sort();
  const rows = list.map((item) => {
    const c = itemInfo(item);
    return el('div', { class: 'row' }, icon(c.icon),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${c.name} ×${S.items[item]}` })),
      el('button', {
        class: 'btn primary', type: 'button', text: '送這個',
        onclick: async () => {
          let r;
          try { r = await doAct({ action: 'gift', villager: id, item }); } catch { return; }
          const [say, face] = REACTION[r.gained.reaction];
          openModal(el('div', { class: 'talk-head' }, icon('char_d0', v.color, v.hair),
            el('div', { class: 'grow' }, el('h2', { text: `${v.name} ${face}` }),
              el('div', { class: 'sub', text: `${friendText(S.friends[id])}（${r.gained.points > 0 ? '+' : ''}${r.gained.points}）` }))),
            el('p', { class: 'speech', text: (r.gained.birthday && r.gained.points > 0 ? '還記得我的生日！' : '') + say }),
            rewardText(r.gained.rewards) ? el('p', { class: 'note', text: rewardText(r.gained.rewards) }) : null,
            el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '好', onclick: closeModal })));
        },
      }));
  });
  openModal(el('h2', { text: `🎁 要送${v.name}什麼？` }),
    el('p', { class: 'sub', text: '每個人喜歡的東西不一樣，送他喜歡的感情會增加比較多。生日那天送更有心意喔！' }),
    ...(rows.length ? rows : [el('div', { class: 'empty', text: '倉庫裡沒有作物或雞蛋牛奶可以送' })]),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '算了', onclick: closeModal })));
}

// 委託告示板：今天的委託＋村民名冊（感情、生日）
function openBoard() {
  const q = S.request;
  const rows = [];
  const F = S.festival && S.festivals[S.festival];
  if (F) {
    const g = F.gift;
    const giftText = [g.money ? `${g.money} 元` : null, g.item ? `${(itemInfo(g.item) || { name: g.item }).name} ×${g.qty}` : null].filter(Boolean).join('、');
    rows.push(el('div', { class: 'row festival' }, el('span', { class: 'big', text: F.emoji }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `今天是${F.name}！` }),
        el('div', { class: 'meta', text: S.festivalClaimed ? '今天的節慶禮物已經領了' : `節慶禮物：${giftText}（全家一份）` })),
      S.festivalClaimed ? null : el('button', {
        class: 'btn primary', type: 'button', text: '領禮物',
        onclick: async () => { try { await doAct({ action: 'festival_claim' }); toast(`🎁 領到${giftText}！`); openBoard(); } catch {} },
      })));
  }
  if (q) {
    const c = itemInfo(q.item) || { name: q.item, icon: 'seed' };
    const have = S.items[q.item] || 0;
    rows.push(el('div', { class: 'row' }, icon(c.icon),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${S.villagers[q.villager].name}：想要 ${c.name} ×${q.qty}` }),
        el('div', { class: 'meta', text: q.done ? '今天的委託完成了，明天再來看看！' : `報酬 ${q.reward} 元，還能增加感情・倉庫有 ${have} 個` })),
      q.done ? null : el('button', {
        class: 'btn primary', type: 'button', text: '交給他', disabled: have < q.qty,
        onclick: async () => {
          try { const r = await doAct({ action: 'request_fill' }); toast(`拿到 ${r.gained.money} 元！`); openBoard(); } catch {}
        },
      })));
  }
  const people = Object.entries(S.villagers).map(([id, v]) => {
    const f = S.friends[id] || { hearts: 0 };
    return el('div', { class: 'row' }, icon('char_d0', v.color, v.hair),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${v.name}${isBirthdayToday(id) ? ' 🎂 今天生日！' : ''}` }),
        el('div', { class: 'meta', text: `${v.role}・生日 ${Number(v.birthday.slice(0, 2))}/${Number(v.birthday.slice(3))}・${friendText(f)}${f.talkedToday ? '・今天聊過了' : ''}` })));
  });
  openModal(el('h2', { text: '📋 委託告示板' }), ...rows,
    el('h2', { class: 'section', text: '小鎮的人' }), ...people,
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 美玲姐的小吃店：吃了恢復體力
function openEatery() {
  const rows = Object.entries(S.foods).map(([id, f]) => el('div', { class: 'row' },
    el('span', { class: 'big', text: { egg: '🥚', rice: '🍚', noodle: '🍜' }[id] || '🍽️' }),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: f.name }), el('div', { class: 'meta', text: `${f.price} 元・體力 +${f.energy}` })),
    el('button', {
      class: 'btn primary', type: 'button', text: `吃 ${f.price}`, disabled: f.price > S.money || S.energy >= S.energyMax,
      onclick: async () => { try { await doAct({ action: 'eat', food: id }); toast(`好吃！體力 ${S.energy}/${S.energyMax}`); openEatery(); } catch {} },
    })));
  openModal(el('h2', { text: '🍜 美玲姐的小吃店' }),
    el('p', { class: 'sub', text: `累了就來吃一碗，體力馬上恢復（最多到滿）。現在體力 ${S.energy}/${S.energyMax}，錢包 ${S.money.toLocaleString()} 元。` }),
    ...rows, el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 阿福伯的雜貨店：工具升級，也可以買種子和飼料
function openStore() {
  const rows = Object.entries(S.toolShop).map(([id, t]) => {
    const have = S.tools[id] >= 2;
    return el('div', { class: 'row' }, el('span', { class: 'big', text: id === 'hoe' ? '⛏️' : '💧' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: t.name }), el('div', { class: 'meta', text: `${t.desc}（只做需要的格子，體力照格子算）` })),
      el('button', {
        class: 'btn primary', type: 'button', text: have ? '已經有了' : `買 ${t.price}`, disabled: have || t.price > S.money,
        onclick: async () => { try { await doAct({ action: 'upgrade_tool', tool: id }); toast(`買了${t.name}！`); renderToolbar(); openStore(); } catch {} },
      }));
  });
  openModal(el('h2', { text: '🏪 阿福伯的雜貨店' }),
    el('p', { class: 'sub', text: `錢包 ${S.money.toLocaleString()} 元。工具是全家共用的，一個人買全家都能用。` }),
    ...rows,
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', text: '買種子、飼料', onclick: openShop }),
      el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 這一季能種的都列出來；別季的種子倉庫裡有的話也列，但要等季節到了才能用
function openSeedPicker() {
  const list = Object.entries(S.crops).filter(([id]) => inSeason(id) || S.items['seed:' + id]);
  const rows = list.map(([id, c]) => {
    const n = S.items['seed:' + id] || 0;
    const ok = inSeason(id);
    return el('div', { class: 'row' + (ok ? '' : ' off') }, icon(id + '_3'),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${c.name}種子` }),
        el('div', { class: 'meta', text: ok ? `還有 ${n} 包・${cropMeta(c)}` : `還有 ${n} 包・${seasonsText(c.seasons)}才能種` })),
      el('button', {
        class: 'btn' + (S.seed === id ? ' primary' : ''), type: 'button', disabled: !ok,
        text: S.seed === id ? '使用中' : ok ? '用這個' : '等季節',
        onclick: () => { S.seed = id; S.tool = 'seed'; renderToolbar(); closeModal(); },
      }));
  });
  openModal(el('h2', { text: '🌱 要種什麼？' }), ...rows,
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '去商店買種子', onclick: openShop })));
}

// 天氣預報與季節：點 HUD 上的時鐘打開
function openForecast() {
  const now = serverNow();
  const w = (k) => WEATHER[S.weather[k]] || WEATHER.sun;
  const rainNote = (k) => (S.weather[k] === 'rain' ? '，田地整天都是濕的，不用澆水' : '');
  const days = Math.max(1, Math.ceil((S.seasonEndsAt - now) / 86400000));
  const next = SEASON_ORDER[(SEASON_ORDER.indexOf(S.season) + 1) % 4];
  const now_ = Object.values(S.crops).filter((c) => c.seasons.includes(S.season)).map((c) => c.name);
  const coming = Object.values(S.crops).filter((c) => !c.seasons.includes(S.season) && c.seasons.includes(next)).map((c) => c.name);
  openModal(el('h2', { text: '📺 天氣預報' }),
    el('div', { class: 'row forecast' }, el('span', { class: 'big', text: w('today')[0] }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `今天：${w('today')[1]}` }),
        el('div', { class: 'meta', text: `每天的天氣都不一樣${rainNote('today')}` }))),
    el('div', { class: 'row forecast' }, el('span', { class: 'big', text: w('tomorrow')[0] }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `明天：${w('tomorrow')[1]}` }),
        el('div', { class: 'meta', text: S.weather.tomorrow === 'rain' ? '明天會下雨，今天晚上可以省一次澆水' : '記得早上出門前澆水' }))),
    el('h2', { text: `${{ spring: '🌸', summer: '🌻', autumn: '🍂', winter: '⛄' }[S.season]} 現在是${SEASON[S.season]}天` }),
    el('p', { class: 'sub', text: `${SEASON_MONTHS[S.season]}・再 ${days} 天進入${SEASON[next]}天` }),
    el('p', { class: 'note', text: `這一季可以種：${now_.join('、')}` }),
    coming.length ? el('p', { class: 'note', text: `${SEASON[next]}天會上架：${coming.join('、')}` }) : null,
    el('p', { class: 'note', text: '換季時，已經種下去的作物會繼續長完，不會枯掉。' }),
    ...festivalInfo(),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
// 節慶與行事曆：今天的節日、下一個節日、行事曆上今天的事，以及把節日加到行事曆
function festivalInfo() {
  const out = [el('h2', { class: 'section', text: '🎊 節慶與行事曆' })];
  const F = S.festival && S.festivals[S.festival];
  if (F) out.push(el('p', { class: 'note', text: `${F.emoji} 今天是${F.name}！到小鎮的告示板領節慶禮物${S.festivalClaimed ? '（今天已經領過了）' : ''}。` }));
  if (S.nextFestival && S.festivals[S.nextFestival.id]) {
    const N = S.festivals[S.nextFestival.id];
    const days = Math.round((Date.parse(S.nextFestival.date) - Date.parse(todayTW())) / 86400000);
    const [, m, d] = S.nextFestival.date.split('-').map(Number);
    out.push(el('p', { class: 'note', text: `下一個節日：${N.emoji} ${N.name}（${m}/${d}，還有 ${days} 天）` }));
  }
  out.push(el('p', { class: 'note', text: S.todayEvents.length ? `📅 行事曆上的今天：${S.todayEvents.join('、')}` : '📅 行事曆上今天沒有事情。行事曆寫了家人生日，當天牧場也會幫忙慶生喔！' }));
  out.push(el('div', { class: 'actions wrap' }, el('button', {
    class: 'btn', type: 'button', text: '📅 把接下來一年的節日加到行事曆',
    onclick: async () => {
      try {
        const r = await doAct({ action: 'festival_calendar' });
        toast(r.gained.added ? `加了 ${r.gained.added} 個節日到行事曆，當天早上 9 點會提醒大家` : '行事曆上已經都有了');
      } catch {}
    },
  })));
  return out;
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
    if (r.animals) S.animals = r.animals;
    if (r.tiles) for (const t of r.tiles) setTile(t, r.now);
    if (r.town) applyTown(r.town);
    if (r.rocks) S.rocks = r.rocks;
    if (r.dex) S.dex = r.dex;
    // 田地上的動作：收成飄出「+1 作物」，其他飄出扣了幾點體力（釣魚、挖礦自己處理）
    if (body.x != null && body.action !== 'fish' && body.action !== 'mine') {
      const got = r.gained && r.gained.item && itemInfo(r.gained.item);
      if (got) floatAt(body.x, body.y, `+1 ${got.name}`, '#fff3b0');
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
  if (ch === 'H') return openKitchen();
  if (ch === 'A') return openBarn();
  if (ch === 'W') return startFishing(x, y);
  if (rockAt(x, y)) return mineRock(x, y);
  if (ch === 'G') return openStore();
  if (ch === 'R') return openEatery();
  if (ch === 'N') return openBoard();
  if (ch === 'O') return toast('噴水池裡有好多硬幣，許個願吧 ✨');
  if (ch === 'Q') { const who = HOMES[homeIndex(x, y)]; return toast(who ? `這是${S.villagers[who].name}的家` : '別人的家'); }
  if (ch !== 'F') return;
  const t = S.tiles.get(key(x, y)) || { tilled: false, crop: null };
  const now = serverNow();
  if (t.crop && stage(t, now) === 3) return doAct({ action: 'harvest', x, y }).catch(() => {});
  if (S.tool === 'hoe') {
    if (!t.tilled) return doAct({ action: 'till', x, y, ...(S.tools.hoe >= 2 ? { area: true } : {}) }).catch(() => {});
    if (t.crop) return confirmDig(t, x, y);
    // 大鋤頭：點翻好的地，也會把旁邊還沒翻的一起翻好
    if (S.tools.hoe >= 2) return doAct({ action: 'till', x, y, area: true }).catch(() => {});
    return toast('這塊已經翻好了，換「種子」來播種');
  }
  if (S.tool === 'can') {
    if (!t.tilled) return toast('要先用鋤頭翻土');
    // 下雨天第一次澆水先提醒一下（省體力）；真的要澆再點一次
    if (S.weather.today === 'rain' && !S.rainWarned) {
      S.rainWarned = true;
      return toast('今天下雨，田地整天都是濕的，不用澆水 ☔（真的要澆再點一次）');
    }
    return doAct({ action: 'water', x, y, ...(S.tools.can >= 2 ? { area: true } : {}) }).catch(() => {});
  }
  if (S.tool === 'seed') {
    if (!t.tilled) return toast('要先用鋤頭翻土');
    if (t.crop) return describe(t, now);
    const sc = S.crops[S.seed];
    if (!inSeason(S.seed)) return toast(`${sc.name}要${seasonsText(sc.seasons)}才能種，按「種子」換一種`);
    if (!S.items['seed:' + S.seed]) { toast(`沒有${sc.name}種子了，去商店買吧`); return; }
    return doAct({ action: 'plant', x, y, crop: S.seed }).catch(() => {});
  }
  if (t.crop) return describe(t, now);
  toast(t.tilled ? '翻好的土，可以播種' : '還沒翻土的田');
}

function describe(t, now) {
  const c = S.crops[t.crop];
  const left = (t.total - grown(t, now)) / S.scale;
  if (!wet(t, now)) return toast(`${c.name}：土乾了，澆水才會繼續長（還差 ${fmtLeft(left)}）`);
  toast(`${c.name}：再 ${fmtLeft(left)} 就能收成${c.regrow ? '（收完會再長）' : ''}`);
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

function tapTile(tx, ty, fx = tx + 0.5, fy = ty + 0.5) {
  const me = S.me;
  const cx = Math.round(me.x), cy = Math.round(me.y);
  const ch = terrain(tx, ty);
  // 點到動物：走到牠旁邊再跟牠互動
  const an = animalAt(fx - 0.5, fy - 0.5);
  if (an && S.area === 'farm') {
    const p = animalPos(an, serverNow());
    const ax = Math.round(p.x), ay = Math.round(p.y);
    const path = findPath(cx, cy, (x, y) => Math.abs(x - ax) + Math.abs(y - ay) <= 1);
    if (!path) return toast('走不過去');
    me.path = path;
    me.pending = { animal: an.id };
    if (!path.length && !me.step) arrive();
    return;
  }
  // 小鎮的村民：跟動物一樣，走到旁邊再聊天
  const vi = S.area === 'town' && villagerAt(fx - 0.5, fy - 0.5);
  if (vi) {
    const p = villagerPos(vi, serverNow());
    const ax = Math.round(p.x), ay = Math.round(p.y);
    const path = findPath(cx, cy, (x, y) => Math.abs(x - ax) + Math.abs(y - ay) <= 1);
    if (!path) return toast('走不過去');
    me.path = path;
    me.pending = { villager: vi };
    if (!path.length && !me.step) arrive();
    return;
  }
  // 後山的石頭：走到旁邊挖
  if (rockAt(tx, ty)) {
    const path = findPath(cx, cy, (x, y) => Math.abs(x - tx) + Math.abs(y - ty) === 1);
    if (!path) return toast('被別的石頭擋住了，先挖外面的');
    me.path = path;
    me.pending = { x: tx, y: ty, rock: true };
    if (!path.length && !me.step) arrive();
    return;
  }
  const target = TARGETS.includes(ch);
  if (target) {
    // 走到旁邊（上下左右）再面向它動作。房子、攤位、動物小屋好幾格大，
    // 點到中間那格也算：走到這棟建築任何一格的旁邊就好
    const parts = ch === 'F' || ch === 'B' ? new Set([key(tx, ty)]) : buildingTiles(tx, ty, ch); // 水也是：走到湖邊就好
    const adj = (x, y) => [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => parts.has(key(x + dx, y + dy)));
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

// 同一棟建築（相連的同一種地形）的所有格子
function buildingTiles(tx, ty, ch) {
  const seen = new Set([key(tx, ty)]);
  const q = [[tx, ty]];
  while (q.length && seen.size < 40) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const k = key(x + dx, y + dy);
      if (!seen.has(k) && terrain(x + dx, y + dy) === ch) { seen.add(k); q.push([x + dx, y + dy]); }
    }
  }
  return seen;
}

function arrive() {
  const me = S.me;
  const p = me.pending;
  me.pending = null;
  if (!p) return;
  if (p.villager) {
    const vp = villagerPos(p.villager, serverNow());
    if (!S.villagersOut) return toast('大家都回家睡覺了');
    if (Math.hypot(vp.x - me.x, vp.y - me.y) > 2.5) return toast(`${S.villagers[p.villager].name}走開了，再點一次`);
    me.d = dirTo(me.x, me.y, Math.round(vp.x), Math.round(vp.y));
    return openVillager(p.villager);
  }
  if (p.animal) {
    const a = S.animals.find((x) => x.id === p.animal);
    if (!a) return;
    const ap = animalPos(a, serverNow());
    if (Math.hypot(ap.x - me.x, ap.y - me.y) > 2.5) return toast(`${a.name}跑走了，再點一次牠`);
    me.d = dirTo(me.x, me.y, Math.round(ap.x), Math.round(ap.y));
    return useOnAnimal(a);
  }
  if (p.rock) { me.d = dirTo(me.x, me.y, p.x, p.y); return mineRock(p.x, p.y); }
  // 面向建築（或湖）裡離自己最近的那一格
  const ch = terrain(p.x, p.y);
  let fx = p.x, fy = p.y;
  for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const nx = Math.round(me.x) + dx, ny = Math.round(me.y) + dy;
    if (terrain(nx, ny) === ch && (ch !== 'F' || (nx === p.x && ny === p.y))) { fx = nx; fy = ny; break; }
  }
  me.d = dirTo(me.x, me.y, fx, fy);
  if (ch === 'W') return useOn(fx, fy); // 釣竿拋到面前那一格水
  useOn(p.x, p.y);
}

function update(dt) {
  const me = S.me;
  fishTick();
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
      if (terrain(me.x, me.y) === 'E') { switchArea(); return; }
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
  ws.send(JSON.stringify({ t: 'pos', x: +S.me.x.toFixed(2), y: +S.me.y.toFixed(2), d: S.me.d, m: moving, a: S.area }));
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
      for (const p of ev.players) { const o = otherOf(p.userId); o.x = o.tx = p.x; o.y = o.ty = p.y; o.d = p.d; o.a = p.a || 'farm'; }
    } else if (ev.type === 'farm-pos') {
      if (ev.userId === S.meId) return;
      const o = otherOf(ev.userId);
      const area = ev.a || 'farm';
      if (!o.seen || o.a !== area) { o.x = ev.x; o.y = ev.y; o.seen = true; } // 換地圖了就直接出現在新位置
      o.tx = ev.x; o.ty = ev.y; o.d = ev.d; o.m = ev.m; o.a = area;
    } else if (ev.type === 'farm-leave') {
      S.others.delete(ev.userId);
    } else if (ev.type === 'farm-update') {
      for (const t of ev.tiles) setTile(t, ev.now);
      S.money = ev.money; S.items = ev.items;
      if (ev.animals) S.animals = ev.animals;
      if (ev.town) applyTown(ev.town);
      if (ev.rocks) S.rocks = ev.rocks;
      if (ev.dex) S.dex = ev.dex;
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
  // 上面的狀態列、下面的工具列會蓋住地圖邊緣，鏡頭要能多捲一點，最上排、最下排才看得到、點得到
  S.padTop = $('hud').offsetHeight || 0;
  S.padBottom = ($('toolbar').offsetHeight || 0) + 14;
}

function baseSprite(x, y, ch) {
  if (ch === '=' || ch === 'E') return sprite('path');
  if (ch === 'p') return sprite('plaza');
  if (ch === 'q') return sprite('gravel');
  if (ch === ',') return sprite('flowers', undefined, false, S.season);
  if (ch === 'W') return sprite(Math.floor(Date.now() / 600) % 2 ? 'water1' : 'water0');
  if (ch === 'F') {
    const t = S.tiles.get(key(x, y));
    if (t && t.tilled) return sprite(wet(t, serverNow()) ? 'soil_wet' : 'soil_dry');
    return sprite('field', undefined, false, S.season);
  }
  return sprite('grass' + ((x * 7 + y * 13) % 3), undefined, false, S.season);
}
// 樹：依位置挑一些變成櫻花（春）或紅楓（秋），其他照季節變色
function treeSprite(x, y) {
  const alt = TREE_ALT[S.season];
  return sprite('tree', undefined, false, alt && (x * 5 + y * 3) % 4 === 0 ? alt : S.season);
}

// 下雨：畫面暗一點，加上斜斜的雨絲；多雲：稍微灰一點
function drawWeather(vw, vh) {
  const w = S.weather.today;
  if (w === 'cloud') { g.fillStyle = 'rgba(90,100,115,0.14)'; g.fillRect(0, 0, vw, vh); return; }
  if (w !== 'rain') return;
  g.fillStyle = 'rgba(40,60,95,0.2)';
  g.fillRect(0, 0, vw, vh);
  const t = performance.now() / 1000;
  const n = Math.round((vw * vh) / (dpr * dpr) / 3500);
  g.strokeStyle = 'rgba(210,225,255,0.6)';
  g.lineWidth = 1.2 * dpr;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 0.9 + ((i * 0.618) % 1) * 0.6;
    const y = (((i * 0.4142 + t * sp) % 1) * (vh + 40 * dpr)) - 20 * dpr;
    const x = ((i * 0.7548) % 1) * (vw + 60 * dpr) - y * 0.12;
    g.moveTo(x, y);
    g.lineTo(x - 3 * dpr, y + 14 * dpr);
  }
  g.stroke();
}

function draw() {
  const k = S.view * dpr;                          // 一個像素放大成幾個裝置像素
  const vw = canvas.width, vh = canvas.height;
  const worldW = S.W * T * k, worldH = S.H * T * k;
  const me = S.me;
  let camX = (me.x + 0.5) * T * k - vw / 2;
  let camY = (me.y + 0.5) * T * k - vh / 2;
  camX = worldW <= vw ? (worldW - vw) / 2 : Math.max(0, Math.min(worldW - vw, camX));
  const padT = (S.padTop || 0) * dpr, padB = (S.padBottom || 0) * dpr;
  camY = worldH + padT + padB <= vh ? (worldH - vh + padB - padT) / 2 : Math.max(-padT, Math.min(worldH - vh + padB, camY));
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
  const blink = Math.floor(Date.now() / 400) % 2;

  // 地面
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.drawImage(baseSprite(x, y, terrain(x, y)), x * T, y * T);
  // 作物與物件
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ch = terrain(x, y);
      if (ch === 'T') g.drawImage(treeSprite(x, y), x * T, y * T);
      else if (ch === 'f') g.drawImage(sprite('fence'), x * T, y * T);
      else if (ch === 'B') g.drawImage(sprite('bin'), x * T, y * T);
      else if (ch === 'N') g.drawImage(sprite('board'), x * T, y * T);
      const rk = rockAt(x, y);
      if (rk) g.drawImage(sprite('ore_' + rk.type), x * T, y * T);
      else if (ch === 'F') {
        const t = S.tiles.get(key(x, y));
        if (t && t.crop) {
          const st = stage(t, now);
          g.drawImage(cropSprite(t.crop, st), x * T, y * T);
          if (st === 3 && blink) g.drawImage(sprite('sparkle'), x * T, y * T);
        }
      }
    }
  }
  // 好幾格大的建築：每一棟在它左上角那一格畫一次
  const ground = SEASON_GROUND[S.season];
  let homes = 0;
  for (let y = 0; y < S.H; y++) {
    for (let x = 0; x < S.W; x++) {
      const ch = terrain(x, y);
      if (!BIG[ch] || terrain(x - 1, y) === ch || terrain(x, y - 1) === ch) continue;
      const img = ch === 'H' ? houseSprite(ground) : ch === 'S' ? shopSprite() : ch === 'A' ? barnSprite(ground)
        : ch === 'G' ? storeSprite() : ch === 'R' ? eaterySprite() : ch === 'Q' ? homeSprite(homes++)
        : fountainSprite(Math.floor(Date.now() / 500) % 2);
      g.drawImage(img, x * T, y * T);
    }
  }

  // 節日的小鎮：大馬路上掛彩旗；春節、元宵、端午、七夕、中秋在廣場掛燈籠
  if (S.area === 'town' && S.festival) {
    const cols = ['#e0393e', '#f6d34a', '#3f9a3f', '#4aa3df'];
    g.fillStyle = '#7a4e2d'; g.fillRect(5 * T, 5 * T + 1, 24 * T, 1);
    for (let i = 0; i < 24 * 2; i++) {
      g.fillStyle = cols[i % cols.length];
      const bx = 5 * T + i * 8 + 1;
      for (let r = 0; r < 4; r++) g.fillRect(bx + r, 5 * T + 2 + r, 6 - 2 * r, 1);
    }
    if (['spring', 'lantern', 'dragon', 'qixi', 'moon'].includes(S.festival)) {
      for (let x = 9; x <= 20; x += 2) {
        g.fillStyle = '#7a4e2d'; g.fillRect(x * T + 7, 7 * T - 4, 1, 3);
        g.fillStyle = '#e0393e'; g.fillRect(x * T + 4, 7 * T - 1, 8, 7);
        g.fillStyle = '#a8252b'; g.fillRect(x * T + 4, 7 * T + 1, 8, 1);
        g.fillStyle = '#f6d34a'; g.fillRect(x * T + 7, 7 * T + 6, 2, 3);
      }
    }
  }

  // 釣魚的浮標：等魚時輕輕上下、魚上鉤時往下沉
  if (S.fishing) {
    const f = S.fishing, bob = f.state === 'bite' ? 3 : Math.sin(performance.now() / 300) * 1;
    g.fillStyle = '#ffffff'; g.fillRect(f.x * T + 6, f.y * T + 6 + bob, 4, 2);
    g.fillStyle = '#e0393e'; g.fillRect(f.x * T + 6, f.y * T + 8 + bob, 4, 3);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(f.x * T + 3, f.y * T + 12, 10, 1);
  }

  // 面前那一格的框（鍵盤操作時看得到要對哪一格動作）
  if (!me.step && !me.path.length) {
    const [dx, dy] = DIRS[me.d];
    const fx = Math.round(me.x) + dx, fy = Math.round(me.y) + dy;
    if (TARGETS.includes(terrain(fx, fy)) || rockAt(fx, fy)) g.drawImage(sprite('cursor'), fx * T, fy * T);
  }

  // 角色：依 y 排序，後面的先畫
  const people = [{ ...me, color: S.myColor, mine: true, moving: !!me.step }];
  for (const [id, o] of S.others) if ((o.a || 'farm') === S.area) people.push({ ...o, id, moving: Math.hypot(o.tx - o.x, o.ty - o.y) > 0.01 });
  const beasts = S.area === 'farm' ? S.animals.map((a) => ({ a, ...animalPos(a, now) })) : [];
  // 小鎮的村民也一起排前後，用跟家人一樣的小人圖、各自的衣服和髮色
  if (S.area === 'town' && S.villagersOut) {
    for (const id of Object.keys(S.villagers)) {
      const v = S.villagers[id], vp = villagerPos(id, now);
      people.push({ x: vp.x, y: vp.y, d: vp.d, moving: vp.moving, anim: now / 1000, color: v.color, hair: v.hair, name: v.name, villager: id });
    }
  }
  const sprites = [...people.map((p) => ({ p, y: p.y })), ...beasts.map((b) => ({ b, y: b.y }))].sort((u, v) => u.y - v.y);
  for (const it of sprites) {
    if (it.p) {
      const p = it.p;
      const frame = p.moving ? Math.floor(p.anim * 6) % 2 : 0;
      const dir = p.d === 'l' ? 'r' : p.d;
      g.drawImage(sprite(`char_${dir}${frame}`, p.color, p.d === 'l', p.hair || ''), p.x * T, p.y * T - 5);
    } else {
      const b = it.b;
      const frame = b.moving ? Math.floor(Date.now() / 220) % 2 : 0;
      g.drawImage(sprite(`${b.a.kind}_${frame}`, undefined, b.flip), b.x * T, b.y * T - 2);
    }
  }

  // 文字（名字、飄字）用螢幕座標畫，字才清楚
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.textAlign = 'center';
  g.font = `bold ${Math.round(11 * dpr)}px sans-serif`;
  for (const p of people) {
    if (p.mine) continue;
    const sx = (p.x + 0.5) * T * k - camX, sy = (p.y * T - 6) * k - camY;
    const name = p.villager && isBirthdayToday(p.villager) ? `🎂 ${p.name}` : p.name;
    const w = g.measureText(name).width + 8 * dpr;
    g.fillStyle = 'rgba(43,36,33,.7)';
    g.fillRect(sx - w / 2, sy - 13 * dpr, w, 15 * dpr);
    g.fillStyle = '#fff';
    g.fillText(name, sx, sy - 2 * dpr);
  }
  // 出口的路牌
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
    if (terrain(x, y) !== 'E') continue;
    const ex = (S.exits[S.area] || []).find((e) => e.x === x && e.y === y);
    const label = EXIT_LABEL[ex ? ex.to : 'farm'];
    const w = g.measureText(label).width + 10 * dpr;
    // 在地圖最左、最右邊的出口，路牌往裡面挪，才不會被切掉
    const sx = Math.max(-camX + w / 2, Math.min(worldW - camX - w / 2, (x + 0.5) * T * k - camX));
    const sy = (y * T + (y === 0 ? 14 : 2)) * k - camY;
    g.fillStyle = 'rgba(122,78,45,.9)';
    g.fillRect(sx - w / 2, sy - 13 * dpr, w, 16 * dpr);
    g.fillStyle = '#fff';
    g.fillText(label, sx, sy);
  }
  // 魚上鉤了：浮標上面跳出大大的 ❗
  if (S.fishing && S.fishing.state === 'bite') {
    g.font = `bold ${Math.round(26 * dpr)}px sans-serif`;
    g.fillText('❗', (S.fishing.x + 0.5) * T * k - camX, (S.fishing.y * T - 2) * k - camY);
    g.font = `bold ${Math.round(11 * dpr)}px sans-serif`;
  }
  // 動物：名字小小的；有雞蛋牛奶可以收時，頭上冒出泡泡；晚上睡覺冒 z
  g.font = `${Math.round(10 * dpr)}px sans-serif`;
  for (const b of beasts) {
    const sx = (b.x + 0.5) * T * k - camX, sy = (b.y * T - 2) * k - camY;
    const label = (animalReady(b.a, now) ? (PRODUCT_EMOJI[b.a.product] || '✨') + ' ' : '') + b.a.name + (b.sleep ? ' 💤' : '');
    const w = g.measureText(label).width + 6 * dpr;
    g.fillStyle = animalReady(b.a, now) ? 'rgba(255,250,235,.92)' : 'rgba(43,36,33,.45)';
    g.fillRect(sx - w / 2, sy - 12 * dpr, w, 13 * dpr);
    g.fillStyle = animalReady(b.a, now) ? '#2b2421' : '#fff';
    g.fillText(label, sx, sy - 2 * dpr);
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
  drawWeather(vw, vh);
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
  if (dir && S.fishing) { e.preventDefault(); return; }
  if (dir) {
    e.preventDefault();
    if (!S.keys.includes(dir)) S.keys.push(dir);
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (fishTap()) return;
    const [dx, dy] = DIRS[S.me.d];
    if (S.me.step) return;
    const fx = Math.round(S.me.x) + dx, fy = Math.round(S.me.y) + dy;
    if (S.area === 'town') {
      const vi = villagerAt(fx, fy);
      if (vi) return openVillager(vi);
    } else {
      const an = animalAt(fx, fy);
      if (an) return useOnAnimal(an);
    }
    useOn(fx, fy);
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
  if (fishTap()) return; // 釣魚中：點畫面＝拉竿
  const k = S.view * dpr;
  const wx = (e.clientX * dpr + S.cam.x) / k, wy = (e.clientY * dpr + S.cam.y) / k;
  tapTile(Math.floor(wx / T), Math.floor(wy / T), wx / T, wy / T);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
$('btn-bag').addEventListener('click', openBag);
$('hud-clock').addEventListener('click', openForecast);
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
  resize(); // 狀態列、工具列出現之後再量一次高度
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
    villagerScreen(id) {
      const p = villagerPos(id, serverNow());
      const k = S.view * dpr;
      return { x: ((p.x + 0.5) * T * k - S.cam.x) / dpr, y: ((p.y + 0.5) * T * k - S.cam.y) / dpr, tx: p.x, ty: p.y };
    },
    animalScreen(id) {
      const a = S.animals.find((x) => x.id === id);
      const p = animalPos(a, serverNow());
      const k = S.view * dpr;
      return { x: ((p.x + 0.5) * T * k - S.cam.x) / dpr, y: ((p.y + 0.5) * T * k - S.cam.y) / dpr, tx: p.x, ty: p.y };
    },
  };
}
boot();
