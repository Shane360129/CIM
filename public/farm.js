// 家族小牧場（獨立視窗）：畫面、走路、工具、商店與出貨箱。
// 規則都在伺服器（src/farm.js）判定，這裡只負責畫與送出動作；
// 作物成長在兩次同步之間由這裡用同一套公式往後推算，畫面才會即時長大。
import {
  sprite, cropSprite, houseSprite, shopSprite, barnSprite, storeSprite, eaterySprite, homeSprite, fountainSprite, SEASON_GROUND,
  greenhouseSprite, machineSprite, machineSpotSprite, ghTileSprite, fruitTreeSprite, treeSpotSprite, hiveSprite, hiveSpotSprite,
  stallSprite, caveMouthSprite, caveTileSprite, caveLadderSprite, chestSprite, beachTileSprite, forageSprite, projectSprite, decoSprite, homeTileSprite,
  gearSprite, crowSprite, paddySprite, teaBushSprite, teaBudsSprite, smithSprite, bugSprite, mailboxSprite,
  snowCoverSprite, snowmanSprite,
} from '/farm-sprites.js';

const T = 16;            // 一格 16 像素
const SPEED = 4.5;       // 每秒走幾格
const WALK = new Set(['.', '=', 'F', 'p', ',', 'E', 's', 'P', 'r']); // s 沙灘、P 防波堤、r 水田；潮間帶 d 退潮才走得過去
// 點了會走過去互動的東西：田、出貨箱、攤位、房子、動物小屋、溫室、加工機；小鎮的雜貨店、小吃店、民宅、噴水池、告示板；
// 後山的洞窟入口；洞窟裡往上、往下的梯子和寶箱；小鎮修復計畫的土地公廟、老車站、農會、海邊的漁會
const TARGETS = 'FBSHAGRQONWJMYZV^vCUILDrenbxw'; // r 水田、e 茶樹、n 家庭留言板、b 鐵匠鋪、x 信箱、w 雪人小丘
const PROJECT_AT = { U: 'temple', I: 'station', L: 'coop', D: 'harbor' };
const EXIT_LABEL = { town: '🏘️ 往小鎮', farm: '🌾 回牧場', hill: '⛰️ 往後山', beach: '🌊 往海邊', terrace: '🍵 往梯田' };
const SEASON = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_MONTHS = { spring: '3～5 月', summer: '6～8 月', autumn: '9～11 月', winter: '12～2 月' };
const WEATHER = { sun: ['☀️', '晴天'], cloud: ['⛅', '多雲'], rain: ['🌧️', '下雨'], typhoon: ['🌀', '颱風'], cold: ['🥶', '寒流'] };
const wetSky = (w) => w === 'rain' || w === 'typhoon';
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
  machines: {}, machineKinds: {}, machineSpots: {}, machineBatch: 5, goods: {}, builds: {}, ghBuilt: false, houseLevel: 1,
  gear: [], gearKinds: {}, ferts: {}, quality: {}, crows: [],
  notes: [], emoteList: [], emotes: new Map(),
  graze: { day: null, out: false }, grazeTiles: [], horse: null, horseInfo: {}, rideAreas: [],
  smithTools: {}, smithTiers: [],
  bugs: { areas: {} }, bugKinds: {}, net: false, netInfo: {},
  mail: { list: [], unread: 0 }, mailInfo: {},
  giants: [], giantKinds: {}, snow: { day: false, parts: 0, nose: false }, snowman: { parts: 3, energy: 2 },
  meteor: { active: false }, wishes: {}, wishMoney: 0,
  pondTiles: [], pets: {}, petKinds: {}, petZoneTiles: [], petPos: {}, trails: new Map(),
  stories: {}, storyHearts: [2, 5, 8], achievementList: [], achievements: {}, thisWeek: null, activity: null, game: null,
  trees: [], hives: [], treeKinds: {}, fruits: {}, treeSpots: [], hiveSpots: [], hive: { price: 1500, max: 3, days: 3 },
  market: null, beauty: null, harvestContest: { count: 0, rivals: [] }, marketOn: false,
  cave: null, caveInfo: { best: 0, stops: [1], floors: 20 },
  tide: { override: null, windows: [] }, lowTide: false, forage: {}, forageKinds: {},
  projects: { list: {}, done: {}, given: {}, prayed: false, onsen: false },
  decos: [], decoKinds: {}, placing: null,
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
// 後山採石場的石頭、洞窟這一層的石頭
const rocksHere = () => (S.area === 'hill' ? S.rocks : S.area === 'cave' && S.cave ? S.cave.rocks : []);
const rockAt = (x, y) => rocksHere().find((r) => r.x === x && r.y === y);
// 洞窟的每一層算不同的地方：家人要在同一層才看得到彼此
const areaKey = () => (S.area === 'cave' && S.cave ? 'cave' + S.cave.floor : S.area);
// 夜市：每個星期六晚上 5 點到 12 點（本機測試可以強迫開著／關著）
function marketOpen() {
  const m = S.market;
  if (!m) return false;
  if (m.override) return m.override === 'open';
  const d = new Date(serverNow() + 8 * 3600000);
  return d.getUTCDay() === 6 && d.getUTCHours() >= 17;
}
// 夜市的攤位在小鎮南邊，每攤佔兩格，開著的時候不能走過去
const stallOn = (x, y) => S.marketOn && Object.keys(S.market.stalls)
  .find((id) => { const st = S.market.stalls[id]; return y === st.y && x >= st.x && x < st.x + (st.w || 2); });
const stallAt = (x, y) => S.area === 'town' && stallOn(x, y);
// 後山的石頭擋路，挖掉才過得去
// 擺出去的裝飾、家具（地毯可以踩過去）
const decoAt = (x, y) => S.decos.find((d) => d.area === S.area && d.x === x && d.y === y);
const decoBlocks = (x, y) => { const d = decoAt(x, y); return !!d && !(S.decoKinds[d.kind] || {}).flat; };
const walkable = (x, y) => { const c = terrain(x, y); return (WALK.has(c) || (c === 'd' && S.lowTide)) && !rockAt(x, y) && !stallAt(x, y) && !decoBlocks(x, y); };
// 潮汐：伺服器給接下來兩天的退潮時段，這裡照時間算現在是不是退潮
function lowTideNow() {
  if (S.tide.override) return S.tide.override === 'low';
  const now = serverNow();
  return S.tide.windows.some(([a, b]) => now >= a && now < b);
}
// 海邊、後山、小鎮今天撿得到的東西（潮間帶的只有退潮看得到）
const forageAt = (x, y) => (S.forage[S.area] || []).find((f) => f.x === x && f.y === y && (!f.tidal || S.lowTide));
const serverNow = () => Date.now() + S.offset;
const inSeason = (id) => !!S.crops[id] && S.crops[id].seasons.includes(S.season);
// 溫室裡什麼季節的種子都能種
const canPlantHere = (id) => !!S.crops[id] && !!S.crops[id].paddy === (S.area === 'terrace') && (S.area === 'gh' || inSeason(id));
const seedName = (id) => (S.crops[id] ? S.crops[id].seedName || `${S.crops[id].name}種子` : '種子');
const machineAt = (x, y) => S.area === 'farm' && Object.keys(S.machineSpots).find((id) => S.machineSpots[id].x === x && S.machineSpots[id].y === y);
const seasonsText = (list) => (list.length === 4 ? '一年四季' : list.map((x) => SEASON[x] + '天').join('、'));
const cropMeta = (c) => `${c.hours} 小時成熟・賣 ${c.sell} 元` + (c.regrow ? `・收成後每 ${c.regrow} 小時再收一次` : '')
  + (c.paddy ? '・插在梯田的水田裡，不用翻土、不用澆水，碾米機碾成白米' : '');
const PRODUCT_EMOJI = { egg: '🥚', egg_l: '🥚', milk: '🥛', milk_l: '🥛', duck_egg: '🥚', duck_egg_l: '🥚', wool: '🧶', wool_l: '🧶' };
// 倉庫裡的東西：seed:作物、crop:作物、prod:雞蛋牛奶、feed 飼料
function itemInfo(item) {
  const [full, q] = item.split('@');
  const [kind, id] = full.split(':');
  if (item === 'feed') return { name: '飼料', icon: 'feed', sell: 0 };
  // 有星級的作物：crop:番茄@3 是金星番茄，賣得比較貴
  if (q) {
    const Q = kind === 'crop' && S.crops[id] && S.quality[q];
    return Q ? { name: Q.name + S.crops[id].name, icon: `${id}_3@q${q}`, sell: Math.round(S.crops[id].sell * Q.mult), quality: Number(q) } : null;
  }
  if (kind === 'fert' && S.ferts[id]) return { name: S.ferts[id].name, icon: 'fert_' + id, sell: 0, fert: id };
  if (kind === 'gear' && S.gearKinds[id]) return { name: S.gearKinds[id].name, icon: 'gear_' + id, sell: 0, gear: id };
  if (kind === 'seed' && S.crops[id]) return { name: seedName(id), icon: 'seed', sell: 0, crop: id };
  if (kind === 'crop' && S.crops[id]) return { name: S.crops[id].name, icon: id + '_3', sell: S.crops[id].sell };
  if (kind === 'prod' && S.products[id]) return { name: S.products[id].name, icon: id, sell: S.products[id].sell };
  if (kind === 'fish' && S.fishData[id]) return { name: S.fishData[id].name, icon: 'fish_' + id, sell: S.fishData[id].sell };
  if (kind === 'ore' && S.oreData[id]) return { name: S.oreData[id].name, icon: 'ore_' + id, sell: S.oreData[id].sell };
  if (kind === 'dish' && S.dishes[id]) return { name: S.dishes[id].name, icon: `dish_${id}@${S.dishes[id].shape}`, sell: S.dishes[id].sell, dish: id };
  if (kind === 'good' && S.goods[id]) return { name: S.goods[id].name, icon: 'good_' + id, sell: S.goods[id].sell, good: id };
  if (kind === 'fruit' && S.fruits[id]) return { name: S.fruits[id].name, icon: 'fruit_' + id, sell: S.fruits[id].sell };
  if (kind === 'deco' && S.decoKinds[id]) return { name: S.decoKinds[id].name, icon: 'deco_' + id, sell: 0, deco: id };
  if (kind === 'forage' && S.forageKinds[id]) return { name: S.forageKinds[id].name, icon: 'forage_' + id, sell: S.forageKinds[id].sell };
  if (kind === 'bug' && S.bugKinds[id]) return { name: S.bugKinds[id].name, icon: 'bug_' + id, sell: S.bugKinds[id].sell };
  if (kind === 'giant' && S.giantKinds[id]) return { name: S.giantKinds[id].name, icon: id + '_3', sell: S.giantKinds[id].sell, giant: id };
  if (kind === 'sapling' && S.treeKinds[id]) return { name: `${S.treeKinds[id].name}苗`, icon: `tree_${id}_0`, sell: 0, sapling: id };
  return null;
}
// 料理的材料：egg／milk 普通的、高級的都算
// 有星級的作物也能用（先用普通的、再用星級低的），跟伺服器一樣
const ingItems = (k) => (S.ingGroups[k] ? S.ingGroups[k].items : [k])
  .flatMap((i) => (i.startsWith('crop:') && !i.includes('@') ? [i, `${i}@1`, `${i}@2`, `${i}@3`] : [i]));
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

// 溫室蓋好了沒、房子擴建到第幾級（體力上限跟著變）
function applyBuild(b) {
  if (!b || b.houseLevel === undefined) return;
  S.ghBuilt = !!b.ghBuilt; S.houseLevel = b.houseLevel;
  if (b.energyMax) S.energyMax = b.energyMax;
}

function applyTown(t) {
  if (!t) return;
  S.friends = t.friends; S.request = t.request; S.tools = t.tools;
  if (t.festivalClaimed !== undefined) S.festivalClaimed = t.festivalClaimed;
}

function applyState(st) {
  // 兩張地圖：牧場和小鎮；重新同步時留在原本那一張
  S.maps = { farm: st.map, town: st.town || st.map, hill: st.hill || st.map, gh: st.greenhouse || st.map, beach: st.beach || st.map,
    home: st.home || st.map, terrace: st.terrace || st.map, cave: S.cave ? S.cave.map : st.map };
  S.decos = st.decos || []; S.decoKinds = st.decoKinds || {};
  if (st.tide) { S.tide = st.tide; S.lowTide = lowTideNow(); }
  S.forage = st.forage || {}; S.forageKinds = st.forageKinds || {};
  if (st.projects) S.projects = st.projects;
  if (st.cave) S.caveInfo = st.cave;
  S.exits = st.exits || {}; S.fishData = st.fish || {}; S.oreData = st.ores || {};
  S.rocks = st.rocks || []; S.dex = st.dex || [];
  S.dishes = st.dishes || {}; S.ingGroups = st.ingredientGroups || {};
  S.festivals = st.festivals || {}; S.festival = st.festival || null; S.nextFestival = st.nextFestival || null;
  S.todayEvents = st.todayEvents || []; S.birthdays = st.birthdays || [];
  for (const id of Object.keys(villagerTiles)) delete villagerTiles[id]; // 節日村民會換到廣場
  S.machines = st.machines || {}; S.machineKinds = st.machineKinds || {}; S.machineSpots = st.machineSpots || {};
  S.machineBatch = st.machineBatch || 5; S.goods = st.goods || {}; S.builds = st.builds || {};
  applyBuild(st);
  S.pets = st.pets || {}; S.petKinds = st.petKinds || {};
  S.stories = st.stories || {}; S.storyHearts = st.storyHearts || [2, 5, 8];
  S.achievementList = st.achievementList || []; S.achievements = st.achievements || {}; S.thisWeek = st.thisWeek || null;
  S.activity = st.activity || null;
  S.trees = st.trees || []; S.hives = st.hives || []; S.treeKinds = st.treeKinds || {}; S.fruits = st.fruits || {};
  S.treeSpots = st.treeSpots || []; S.hiveSpots = st.hiveSpots || []; if (st.hive) S.hive = st.hive;
  S.market = st.market || null; bulbCache = null; S.beauty = st.beauty || null; S.harvestContest = st.harvestContest || { count: 0, rivals: [] };
  S.marketOn = marketOpen();
  // 鴨子游泳的範圍：池塘邊的水和旁邊的草地；寵物沒人帶時在家門口玩
  const tilesIn = (z, ok) => {
    const out = [];
    if (z) for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) if (ok(x, y, ((st.map[y] || '')[x]))) out.push({ x, y });
    return out;
  };
  const W_ = (x, y) => (st.map[y] || '')[x] === 'W';
  S.pondTiles = tilesIn(st.pond, (x, y, c) => c === '.' || (c === 'W' && !(W_(x + 1, y) && W_(x - 1, y) && W_(x, y + 1) && W_(x, y - 1))));
  S.petZoneTiles = tilesIn(st.petZone, (x, y, c) => c === '.' || c === '=');
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
  // 手上的種子不是這一季的，就換成這一季有的（優先選倉庫裡有的）；在溫室裡什麼種子都能種，不用換
  S.notes = st.notes || []; S.emoteList = st.emotes || [];
  S.smithTools = st.smithTools || {}; S.smithTiers = st.smithTiers || [];
  S.bugs = st.bugs || { areas: {} }; S.bugKinds = st.bugKinds || {}; S.net = !!st.net; S.netInfo = st.netInfo || {};
  S.mail = st.mail || { list: [], unread: 0 }; S.mailInfo = st.mailInfo || {};
  S.giants = st.giants || []; S.giantKinds = st.giantKinds || {}; S.snow = st.snow || { day: false, parts: 0, nose: false }; S.snowman = st.snowman || S.snowman;
  S.meteor = st.meteor || { active: false }; S.wishes = st.wishes || {}; S.wishMoney = st.wishMoney || 0;
  S.graze = st.graze || { day: null, out: false }; S.horse = st.horse || null; S.horseInfo = st.horseInfo || {}; S.rideAreas = st.rideAreas || [];
  // 放牧的草地：後山南邊（跟伺服器的 grazeTiles 一樣）
  S.grazeTiles = [];
  for (let y = 12; y <= 18; y++) for (let x = 1; x <= 28; x++) if ((S.maps.hill[y] || '')[x] === '.') S.grazeTiles.push({ x, y });
  renderRide();
  S.gear = st.gear || []; S.gearKinds = st.gearKinds || {}; S.ferts = st.ferts || {}; S.quality = st.quality || {}; S.crows = st.crows || [];
  if (!isFert(S.seed) && !canPlantHere(S.seed)) {
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
  return Math.min(t.total, t.progress + Math.max(0, wetEnd - t.at) * S.scale * (t.rate || 1)); // 速效肥料長得比較快
}
// 「種子」工具也可以拿肥料：S.seed 是 fert:種類
const isFert = (seed) => String(seed).startsWith('fert:');
// 擺在田裡的灑水器、稻草人（只在 F 上，牧場和溫室的座標不會重疊）
const gearAt = (x, y) => (terrain(x, y) === 'F' ? S.gear.find((g) => g.x === x && g.y === y) : null);
const GEAR_REACH = { cross: [[0, -1], [0, 1], [-1, 0], [1, 0]], square: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] };
const gearCovers = (g) => (GEAR_REACH[(S.gearKinds[g.kind] || {}).range] || [])
  .map(([dx, dy]) => ({ x: g.x + dx, y: g.y + dy })).filter((c) => terrain(c.x, c.y) === 'F');
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
    (S.festival && S.festivals[S.festival] ? ` ${S.festivals[S.festival].emoji}` : '') + (S.birthdays.length ? ' 🎂' : '') + (S.marketOn ? ' 🏮' : '');
}

// 工具打到第幾級（鐵匠鋪）；一次處理的範圍
const tierOf = (k) => ((S.tools && S.tools.tiers) || {})[k] || 0;
const sizeOf = (tier, big) => (tier > 0 && S.smithTiers[tier] ? S.smithTiers[tier].size : big ? [3, 3] : [1, 1]);
const wideTool = (k) => S.tools[k] >= 2 || tierOf(k) > 0;
// 工具列上的名字：大鋤頭 3×3、銅鋤頭 3×3、金澆水 5×5、銀鐮刀 5×3（收成那一格變鐮刀）
function toolLabel(key, name) {
  const tk = key === 'hand' ? 'sickle' : key;
  if (!['hoe', 'can', 'sickle'].includes(tk)) return null;
  const tier = tierOf(tk), big = tk !== 'sickle' && S.tools[tk] >= 2;
  if (!tier && !big) return null;
  const [w, h] = sizeOf(tier, big);
  const pre = tier ? (S.smithTiers[tier] || {}).name || '' : '大';
  return { name: pre + (tk === 'sickle' ? '鐮刀' : name), count: `${w}×${h}`, ico: tk === 'sickle' ? '🌾' : null };
}

function renderToolbar() {
  const bar = $('toolbar');
  bar.textContent = '';
  TOOLS.forEach((tool, i) => {
    let ico = tool.ico, name = tool.name, count = null;
    const lab = toolLabel(tool.key, name);
    if (lab) { name = lab.name; count = lab.count; if (lab.ico) ico = lab.ico; }
    if (tool.key === 'seed' && isFert(S.seed)) {
      ico = '🧪'; name = S.ferts[S.seed.slice(5)] ? S.ferts[S.seed.slice(5)].name : '肥料';
      count = S.items[S.seed] || 0;
    } else if (tool.key === 'seed') {
      name = S.crops[S.seed] ? S.crops[S.seed].seedName || S.crops[S.seed].name : '種子'; // 稻子寫「秧苗」
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
  // 流星雨的晚上（還沒許願）：工具列最後多一個「🌠 許願」
  if (S.meteor && S.meteor.active && !S.meteor.wished) bar.append(el('button', { class: 'tool wish', type: 'button', 'aria-label': '對流星許願', onclick: openWish },
    el('span', { class: 'ico', text: '🌠' }), el('span', { text: '許願' })));
}

/* ---------- 彈窗：商店、出貨箱、倉庫、選種子 ---------- */

function closeModal() {
  S.game = null; // 小遊戲（划龍舟、烤肉）跟著關掉
  $('modal-root').textContent = '';
}
function openModal(...kids) {
  const root = $('modal-root');
  root.textContent = '';
  const box = el('div', { class: 'modal', role: 'dialog' }, ...kids);
  root.append(box);
  root.onclick = (e) => { if (e.target === root) closeModal(); };
  return box;
}
function icon(name, shirt, tint) {
  const src = sprite(name, shirt, false, tint || ''); // 32×32 的新圖就用 32×32 的畫布，比較清楚
  const c = el('canvas', { width: src.width, height: src.height });
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

function openShop() {
  // 蓋了溫室：別季的種子也買得到（排在後面，寫著「溫室用」）
  const list = Object.entries(S.crops).filter(([id]) => inSeason(id) || S.ghBuilt)
    .sort(([a], [b]) => (inSeason(b) ? 1 : 0) - (inSeason(a) ? 1 : 0));
  const rows = list.map(([id, c]) => {
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
      el('div', { class: 'grow' }, el('div', { class: 'name', text: seedName(id) }),
        el('div', { class: 'meta', text: `${c.seed} 元・${inSeason(id) ? '' : '🌱 溫室用・'}${cropMeta(c)}` })),
      el('span', { class: 'qty' },
        el('button', { type: 'button', text: '−', onclick: () => { n = Math.max(1, n - 1); sync(); } }), qtyB,
        el('button', { type: 'button', text: '＋', onclick: () => { n = Math.min(99, n + 1); sync(); } })),
      buy);
  });
  const next = SEASON_ORDER[(SEASON_ORDER.indexOf(S.season) + 1) % 4];
  const coming = Object.entries(S.crops).filter(([id, c]) => !inSeason(id) && c.seasons.includes(next)).map(([, c]) => c.name);
  // 果樹苗（一年四季都有賣）、蜂箱
  const treeRows = Object.entries(S.treeKinds).map(([id, t]) => el('div', { class: 'row' }, icon(`tree_${id}_2_r`),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: `${t.name}苗` }),
      el('div', { class: 'meta', text: `${t.price} 元・${t.days} 天長大，之後${t.seasons.length === 4 ? '一年四季' : seasonsText(t.seasons)}每天可以摘 ${t.yield} 個${S.fruits[t.fruit].name}（${S.fruits[t.fruit].sell} 元）・倉庫有 ${S.items['sapling:' + id] || 0} 棵` })),
    el('button', {
      class: 'btn primary', type: 'button', text: `買 ${t.price}`, disabled: t.price > S.money,
      onclick: async () => { try { await doAct({ action: 'buy_sapling', tree: id, qty: 1 }); toast(`買了${t.name}苗，到牧場最下面一排種下去`); openShop(); } catch {} },
    })));
  const hiveFull = S.hives.length >= S.hive.max;
  const hiveRow = el('div', { class: 'row' }, icon('honey'),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: `蜂箱（${S.hives.length}/${S.hive.max}）` }),
      el('div', { class: 'meta', text: `${S.hive.price} 元・放在牧場左下角，每 ${S.hive.days} 天收一罐蜂蜜（冬天休息）；有長大的龍眼樹會變成龍眼蜜` })),
    el('button', {
      class: 'btn primary', type: 'button', text: hiveFull ? '滿了' : `買 ${S.hive.price}`, disabled: hiveFull || S.hive.price > S.money,
      onclick: async () => { try { await doAct({ action: 'buy_hive' }); toast('蜂箱放好了 🐝'); openShop(); } catch {} },
    }));
  const fertRows = Object.entries(S.ferts).map(([id, f]) => {
    let n = 1;
    const qtyB = el('b', { text: '1' });
    const buy = el('button', { class: 'btn primary', type: 'button', text: `買 ${f.price}` });
    const sync = () => { qtyB.textContent = n; buy.textContent = `買 ${f.price * n}`; buy.disabled = f.price * n > S.money; };
    buy.onclick = async () => {
      try { await doAct({ action: 'buy', item: 'fert:' + id, qty: n }); toast(`買了 ${n} 包${f.name}，在「種子」工具裡選肥料，點翻好的土施肥`); sync(); } catch {}
    };
    sync();
    return el('div', { class: 'row' }, icon('fert_' + id),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: f.name }),
        el('div', { class: 'meta', text: `${f.price} 元・${f.desc}・倉庫有 ${S.items['fert:' + id] || 0} 包` })),
      el('span', { class: 'qty' },
        el('button', { type: 'button', text: '−', onclick: () => { n = Math.max(1, n - 1); sync(); } }), qtyB,
        el('button', { type: 'button', text: '＋', onclick: () => { n = Math.min(99, n + 1); sync(); } })),
      buy);
  });
  openModal(el('h2', { text: `🏪 種子店・${SEASON[S.season]}天` }),
    el('p', { class: 'sub', text: `全家共用的錢包：${S.money.toLocaleString()} 元。作物都要土是濕的才會長。` }),
    ...rows, feedRow(),
    el('h2', { class: 'section', text: '🧪 肥料' }),
    el('p', { class: 'note', text: '施在翻好的土上，有效到收成為止（會再長的作物一直有效）。施了肥料，收成比較容易有銅星、銀星、金星，賣得更貴。' }),
    ...fertRows,
    el('h2', { class: 'section', text: '🌳 果樹苗' }), ...treeRows,
    el('h2', { class: 'section', text: '🐝 蜂箱' }), hiveRow,
    coming.length && !S.ghBuilt ? el('p', { class: 'note', text: `${SEASON[next]}天會上架：${coming.join('、')}（蓋了溫室就什麼季節的種子都買得到）` }) : null,
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 出貨的價錢：農會修好了，作物、水果多一成
const shipPrice = (item) => { const c = itemInfo(item); return c ? (S.projects.done.coop && /^(crop|fruit):/.test(item) ? Math.round(c.sell * 1.1) : c.sell) : 0; };
function openBin() {
  const sellable = Object.keys(S.items).filter((item) => (itemInfo(item) || {}).sell).sort();
  const rows = sellable.map((item) => {
    const c = { ...itemInfo(item), sell: shipPrice(item) };
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
  openModal(el('h2', { text: '📦 出貨箱' }), el('p', { class: 'sub', text: '放進來的東西會馬上換成錢，存進全家共用的錢包' + (S.projects.done.coop ? '（農會幫忙賣：作物、水果多一成）' : '') }),
    ...(rows.length ? rows : [el('div', { class: 'empty', text: '倉庫裡還沒有作物或雞蛋牛奶，先去收成吧' })]),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

function openBag() {
  const rows = Object.entries(S.items).sort().map(([item, qty]) => {
    const c = itemInfo(item);
    if (!c) return null;
    const meta = item === 'feed' ? '去動物小屋餵動物，一隻吃一包'
      : c.fert ? `${S.ferts[c.fert].desc}：按兩下「種子」工具選肥料，點翻好的土施肥`
      : c.gear ? `${S.gearKinds[c.gear].desc}：擺在牧場或溫室的田裡`
      : c.quality ? `${S.quality[c.quality].name}的，一個賣 ${c.sell} 元（普通的 ${S.crops[item.split(':')[1].split('@')[0]].sell} 元），也能煮菜、送人`
      : c.sapling ? '點牧場最下面一排的空位種下去'
      : c.crop ? (inSeason(c.crop) ? '用「種子」工具種在翻好的土上' : `${seasonsText(S.crops[c.crop].seasons)}才能種${S.ghBuilt ? '，溫室裡現在就能種' : '，先收著'}`)
      : c.dish ? `吃了體力 +${S.dishes[c.dish].energy}，或出貨賣 ${c.sell} 元`
      : c.good ? `加工品・出貨賣 ${c.sell} 元，也能送人、拿來做菜`
      : c.deco ? (S.decoKinds[c.deco].where === 'home' ? '家具：到屋子裡擺（從廚房走進去）' : '裝飾：擺在牧場的草地上')
      : `可以拿去出貨箱賣 ${c.sell} 元`;
    return el('div', { class: 'row' }, icon(c.icon),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: c.name }), el('div', { class: 'meta', text: meta })),
      el('b', { text: '×' + qty }),
      c.dish ? el('button', { class: 'btn', type: 'button', text: '吃', disabled: S.energy >= S.energyMax, onclick: () => eatDish(c.dish, openBag) }) : null,
      c.deco ? el('button', { class: 'btn', type: 'button', text: '擺出去', onclick: () => startPlacing(c.deco) }) : null,
      c.gear ? el('button', { class: 'btn', type: 'button', text: '擺到田裡', onclick: () => startPlacingGear(c.gear) }) : null);
  });
  openModal(el('h2', { text: '🎒 全家的倉庫' }), el('p', { class: 'sub', text: '種子和收成大家共用' }),
    ...(rows.filter(Boolean).length ? rows : [el('div', { class: 'empty', text: '倉庫是空的' })]),
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', text: '📖 圖鑑', onclick: openDex }),
      el('button', { class: 'btn', type: 'button', text: '🏆 成就', onclick: openAchievements }),
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
  if (a.babyUntil > serverNow()) {
    const days = Math.max(1, Math.ceil((a.babyUntil - serverNow()) * S.scale / 86400000));
    return `${S.animalKinds[a.kind].baby}寶寶，再 ${days} 天長大${a.fedToday ? '・今天吃飽了' : '・肚子餓了'}`;
  }
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
      el('div', { class: 'meta', text: animalStatus(a) + (a.pettedToday ? '' : '・今天還沒摸摸') })),
    el('button', { class: 'btn', type: 'button', text: '改名', onclick: () => openRename(a) })));
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
          toast('收到 ' + Object.entries(r.gained.items).map(([it, n]) => `${itemInfo(it).name} ×${n}`).join('、')
            + ((r.gained.babies || []).length ? `，還生了 ${r.gained.babies.length} 隻寶寶 🐣` : ''));
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
    el('p', { class: 'sub', text: `飼料 ${S.items.feed || 0} 包・錢包 ${S.money.toLocaleString()} 元。走到動物旁邊點牠：摸摸、餵飯、收產品。滿 5 顆愛心的動物，每週會生一隻寶寶（小屋有位子的話）。` }),
    ...(rows.length ? [...rows, actions] : [el('div', { class: 'empty', text: '還沒有動物，先買一隻雞吧 🐣' })]),
    el('h2', { class: 'section', text: '🌿 放牧' }), grazeRow(),
    el('h2', { class: 'section', text: '🐴 馬' }), ...horseRows(openBarn),
    el('h2', { class: 'section', text: '🐾 寵物' }), ...petRows(),
    el('h2', { class: 'section', text: '買動物' }), ...buyRows,
    el('h2', { class: 'section', text: '飼料' }), feedRow(openBarn),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 改名字（動物）
function openRename(a) {
  const input = el('input', { type: 'text', maxlength: '8', value: a.name, 'aria-label': '新的名字' });
  openModal(el('h2', { text: `幫${a.name}改名字` }), input,
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', text: '算了', onclick: openBarn }),
      el('button', {
        class: 'btn primary', type: 'button', text: '好了',
        onclick: async () => {
          const name = input.value.trim();
          if (!name) return toast('名字不能空白');
          try { await doAct({ action: 'rename_animal', animalId: a.id, name }); toast(`現在叫「${name}」了`); openBarn(); } catch {}
        },
      })));
  input.focus();
}
// 寵物：還沒領養的可以領養（免費），領養了的看愛心、跟著誰
function petRows() {
  return Object.entries(S.petKinds).map(([k, P]) => {
    const pet = S.pets[k];
    if (pet) {
      const who = pet.follow === S.meId ? '你' : (S.members.get(pet.follow) || {}).name;
      return el('div', { class: 'row' }, icon(k + '_0'),
        el('div', { class: 'grow' }, el('div', { class: 'name', text: `${pet.name}　${heartsText(pet.hearts)}` }),
          el('div', { class: 'meta', text: `${pet.pettedToday ? '今天摸過了' : '今天還沒摸摸（摸了可能會叼東西回來）'}${who ? `・跟著${who}` : ''}` })));
    }
    const input = el('input', { type: 'text', maxlength: '8', placeholder: '幫牠取名字', 'aria-label': `${P.name}的名字` });
    return el('div', { class: 'row' }, icon(k + '_0'),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `領養一隻${P.name}（免費）` }),
        el('div', { class: 'meta', text: '誰摸牠就跟著誰走，每天摸摸可能會叼東西回來' }), input),
      el('button', {
        class: 'btn primary', type: 'button', text: '領養',
        onclick: async () => {
          const name = input.value.trim();
          if (!name) { input.focus(); return toast('先幫牠取個名字吧'); }
          try { await doAct({ action: 'adopt_pet', pet: k, name }); toast(`${P.emoji} ${name}來到牧場了！`); openBarn(); } catch {}
        },
      }));
  });
}

/* ---------- 寵物 ---------- */

// 寵物跟著最後摸牠的人（照那個人走過的路跟在後面）；那個人不在牧場就在家門口玩，晚上在門口睡覺
function trailOf(uid) {
  if (uid === S.meId) return S.area === 'farm' ? S.trails.get(uid) : null;
  const o = S.others.get(uid);
  return o && (o.a || 'farm') === 'farm' ? S.trails.get(uid) : null;
}
function petTarget(k, now) {
  const pet = S.pets[k];
  const tr = pet && pet.follow ? trailOf(pet.follow) : null;
  // 兩隻都跟著同一個人：一前一後排隊，不要疊在一起
  const rank = Object.keys(S.petKinds).filter((x) => S.pets[x] && S.pets[x].follow === pet.follow).indexOf(k);
  if (tr && tr.length) return { ...tr[Math.max(0, tr.length - 5 - rank * 4)], follow: true };
  const hour = new Date(now + 8 * 3600000).getUTCHours();
  if (hour >= 21 || hour < 6) return { x: k === 'dog' ? 3 : 7, y: 5, sleep: true };
  const tiles = S.petZoneTiles;
  if (!tiles.length) return { x: 4, y: 5 };
  const n = k === 'dog' ? 11 : 23;
  const slot = Math.floor((now + n * 997) / 6000);
  return tiles[hash32(n * 100003 + slot) % tiles.length];
}
function updatePets(dt, now) {
  for (const id of [S.meId, ...S.others.keys()]) {
    const p = id === S.meId ? S.me : S.others.get(id);
    const tr = S.trails.get(id) || [];
    const last = tr[tr.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) >= 0.25) { tr.push({ x: p.x, y: p.y }); if (tr.length > 12) tr.shift(); }
    S.trails.set(id, tr);
  }
  for (const k of Object.keys(S.pets)) {
    const t = petTarget(k, now);
    const p = S.petPos[k] || (S.petPos[k] = { x: t.x, y: t.y });
    const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
    if (d > 10) { p.x = t.x; p.y = t.y; }
    else if (d > 0.02) {
      const step = Math.min(d, dt * SPEED * (t.follow ? 1.3 : 0.6));
      p.x += (dx / d) * step; p.y += (dy / d) * step;
      if (Math.abs(dx) > 0.05) p.flip = dx < 0;
    }
    p.moving = d > 0.05; p.sleep = !!t.sleep; p.follow = !!t.follow;
  }
}
function petAt(tx, ty) {
  if (S.area !== 'farm') return null;
  return Object.keys(S.pets).find((k) => S.petPos[k] && Math.hypot(S.petPos[k].x - tx, S.petPos[k].y - ty) < 0.8) || null;
}
async function patPet(k) {
  const pet = S.pets[k], p = S.petPos[k] || { x: 0, y: 0 };
  try {
    const r = await doAct({ action: 'pat', pet: k });
    floatAt(p.x, p.y, '❤️', '#ff8fa3');
    const f = r.gained.find && itemInfo(r.gained.find.item);
    if (f) toast(`${pet.name}叼了${f.name}${r.gained.find.qty > 1 ? ` ×${r.gained.find.qty}` : ''}回來！放進倉庫了`);
    else toast(r.gained.first ? `${pet.name}好開心，跟著你走了 🐾` : `${pet.name}跟著你走 🐾`);
  } catch {}
}

// 動物在柵欄裡散步：位置由「動物編號＋現在時間」算出來，全家看到的位置一樣，不用一直傳
function hash32(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
const SLOT = 7000;
// 放牧中：雞、牛、羊在後山的草地上（鴨子還是在池塘）
const grazing = (a) => S.graze.out && (S.animalKinds[a.kind] || {}).zone !== 'pond';
const animalArea = (a) => (grazing(a) ? 'hill' : 'farm');
function animalPos(a, now) {
  const tiles = (S.animalKinds[a.kind] || {}).zone === 'pond' ? S.pondTiles : grazing(a) && S.grazeTiles.length ? S.grazeTiles : S.penTiles;
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
    if (animalArea(a) !== S.area) continue;
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
      if (r.gained.baby) toast(`🐣 ${a.name}生了一隻${S.animalKinds[a.kind].baby}「${r.gained.baby.name}」！`);
    } else if (!a.pettedToday) {
      await doAct({ action: 'pet', animalId: a.id });
      floatAt(p.x, p.y, '❤️', '#ff8fa3');
      toast(`${a.name}很開心！`);
    } else if (!a.fedToday) {
      if (!S.items.feed) return toast(`${a.name}肚子餓了，去攤位或動物小屋買飼料吧`);
      await doAct({ action: 'feed', animalId: a.id });
      floatAt(p.x, p.y, '🍽️ -1⚡', '#ffffff');
      toast(a.babyUntil > serverNow() ? `${a.name}吃飽了，快快長大 🍼` : `${a.name}吃飽了，${S.animalKinds[a.kind].hours} 小時後有${pname}`);
    } else {
      toast(`${a.name} ${heartsText(a.hearts)}：${animalStatus(a)}`);
    }
  } catch {}
}

/* ---------- 小鎮 ---------- */

const BIG = { H: 1, S: 1, A: 1, G: 1, R: 1, Q: 1, O: 1, J: 1, V: 1, U: 1, I: 1, L: 1, D: 1, b: 1 };
const HOMES = ['ama', 'lin', 'jie'];   // 三間民宅由左到右：王阿嬤、林老師、小傑家
function homeIndex(x, y) {
  const tops = [];
  for (let yy = 0; yy < S.H; yy++) for (let xx = 0; xx < S.W; xx++)
    if (terrain(xx, yy) === 'Q' && terrain(xx - 1, yy) !== 'Q' && terrain(xx, yy - 1) !== 'Q') tops.push([xx, yy]);
  return tops.findIndex(([tx, ty]) => x >= tx && x < tx + 3 && y >= ty && y < ty + 2);
}

// 走到 E：牧場 ↔ 小鎮、後山；溫室是在牧場點它走進去（goArea('gh')）
function switchArea() {
  const ex = (S.exits[S.area] || []).find((e) => e.x === Math.round(S.me.x) && e.y === Math.round(S.me.y));
  if (ex && ex.to === 'hill' && S.weather.today === 'typhoon') return toast('🌀 颱風天不要上山，很危險！');
  if (ex && ex.to === 'beach' && S.weather.today === 'typhoon') return toast('🌀 颱風天不要去海邊，很危險！');
  if (ex) goArea(ex.to);
}
function goArea(to) {
  const from = S.area;
  S.area = to;
  S.map = S.maps[to]; S.H = S.map.length; S.W = S.map[0].length;
  const p = S.arrive[`${from}>${to}`] || S.spawn;
  const d = p.y <= 1 ? 'd' : p.y >= S.H - 2 ? 'u' : p.x <= 1 ? 'r' : 'l';
  Object.assign(S.me, { x: p.x, y: p.y, step: null, path: [], pending: null, d });
  S.floats = [];
  S.fishing = null;
  closeModal();
  // 走進不能騎馬的地方（屋子、溫室、洞窟）：先下馬，家人那邊也不會再看到你騎在馬上
  const offHorse = riding() && !S.rideAreas.includes(to);
  if (offHorse) { S.horse.rider = null; renderRide(); }
  sendPos(false);
  toast({ town: '🏘️ 來到小鎮了', farm: '🌾 回到牧場了', hill: '⛰️ 來到後山了', gh: '🌱 進到溫室了', beach: '🌊 來到海邊了', home: '🏠 進到屋子裡了', terrace: '🍵 來到梯田了：上面是茶園，下面是水田' }[to]);
  if (offHorse) { doAct({ action: 'dismount' }).catch(() => {}); toast(`先下馬，${S.horse.name}在外面等你`); }
  // 到梯田：倉庫有秧苗就直接拿秧苗；離開梯田：換回這一季的種子
  if (to === 'terrace' && S.items['seed:rice'] && !isFert(S.seed)) S.seed = 'rice';
  else if (from === 'terrace' && S.seed === 'rice') S.seed = Object.keys(S.crops).find((id) => canPlantHere(id) && S.items['seed:' + id]) || 'bokchoy';
  renderToolbar();
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
  if (f.state === 'wait' && now >= f.bite) { f.state = 'bite'; f.end = now + (S.projects.done.harbor ? 2500 : 1500); }
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
    const r = await doAct(S.area === 'cave' ? { action: 'cave_mine', floor: S.cave.floor, x, y } : { action: 'mine', x, y });
    const c = itemInfo(r.gained.item);
    floatAt(x, y, `+1 ${c.name}`, '#fff3b0');
    if (r.gained.ladder) toast('🪜 石頭底下有往下的梯子！點梯子到下一層');
    else if (r.gained.first && r.gained.item !== 'ore:stone') toast(`🎉 第一次挖到${c.name}！圖鑑新增一種`);
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
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '🛋️ 進屋裡', onclick: () => goArea('home') }),
      el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
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
        el('div', { class: 'meta', text: got ? `賣 ${d.sell} 元${kind === 'fish' ? fishHint(d) : ''}` : kind === 'fish' ? fishHint(d, true)
          : d.deep ? `後山洞窟第 ${d.deep} 層以下才挖得到` : '在後山的採石場或洞窟挖挖看' })));
  });
  const nf = Object.keys(S.fishData).filter((id) => have.has('fish:' + id)).length;
  const no = Object.keys(S.oreData).filter((id) => have.has('ore:' + id)).length;
  openModal(el('h2', { text: '📖 圖鑑' }),
    el('p', { class: 'sub', text: `魚 ${nf}/${Object.keys(S.fishData).length}・礦石 ${no}/${Object.keys(S.oreData).length}・料理 ${recipeIds().filter((id) => have.has('dish:' + id)).length}/${recipeIds().length}・加工品 ${Object.keys(S.goods).filter((id) => have.has('good:' + id)).length}/${Object.keys(S.goods).length}。第一次拿到會在聊天室說一聲。` }),
    el('h2', { class: 'section', text: '🎣 魚' }), ...section('fish', S.fishData),
    el('h2', { class: 'section', text: '⛏️ 礦石' }), ...section('ore', S.oreData),
    el('h2', { class: 'section', text: `🐚 採集 ${Object.keys(S.forageKinds).filter((id) => have.has('forage:' + id)).length}/${Object.keys(S.forageKinds).length}` }),
    ...Object.entries(S.forageKinds).map(([id, d]) => {
      const got = have.has('forage:' + id);
      return el('div', { class: 'row' + (got ? '' : ' off') }, got ? icon('forage_' + id) : el('span', { class: 'big', text: '❔' }),
        el('div', { class: 'grow' }, el('div', { class: 'name', text: got ? d.name : '？？？' }),
          el('div', { class: 'meta', text: got ? `賣 ${d.sell} 元` : d.where === 'tide' ? '提示：海邊的潮間帶，退潮時撿' : d.where === 'sand' ? '提示：海邊的沙灘'
            : d.where === 'tea' ? `提示：梯田的茶園（後山往下走）・${d.seasons.map((x) => SEASON[x]).join('')}天`
            : `提示：${d.where === 'hill' ? '後山' : '小鎮'}的草地・${d.seasons.length === 4 ? '一年四季（很少見）' : d.seasons.map((x) => SEASON[x]).join('') + '天'}` })));
    }),
    el('h2', { class: 'section', text: `🦋 昆蟲 ${Object.keys(S.bugKinds).filter((id) => have.has('bug:' + id)).length}/${Object.keys(S.bugKinds).length}` }),
    ...Object.entries(S.bugKinds).map(([id, d]) => {
      const got = have.has('bug:' + id);
      return el('div', { class: 'row' + (got ? '' : ' off') }, got ? icon('bug_' + id) : el('span', { class: 'big', text: '❔' }),
        el('div', { class: 'grow' }, el('div', { class: 'name', text: got ? d.name : '？？？' }),
          el('div', { class: 'meta', text: got ? `賣 ${d.sell} 元・${bugHint(d)}` : `提示：${bugHint(d)}${d.catch && d.catch < 0.7 ? '（很少見）' : ''}` })));
    }),
    el('h2', { class: 'section', text: `🌳 水果 ${Object.keys(S.fruits).filter((id) => have.has('fruit:' + id)).length}/${Object.keys(S.fruits).length}` }),
    ...Object.entries(S.fruits).map(([id, d]) => {
      const got = have.has('fruit:' + id);
      const tree = Object.values(S.treeKinds).find((t) => t.fruit === id);
      return el('div', { class: 'row' + (got ? '' : ' off') }, got ? icon('fruit_' + id) : el('span', { class: 'big', text: '❔' }),
        el('div', { class: 'grow' }, el('div', { class: 'name', text: got ? d.name : '？？？' }),
          el('div', { class: 'meta', text: got ? `賣 ${d.sell} 元` : `種一棵${tree ? tree.name : '果樹'}看看` })));
    }),
    el('h2', { class: 'section', text: `🫙 加工品 ${Object.keys(S.goods).filter((id) => have.has('good:' + id)).length}/${Object.keys(S.goods).length}` }),
    ...Object.entries(S.goods).map(([id, d]) => {
      const got = have.has('good:' + id);
      const mk = Object.values(S.machineKinds).find((m) => Object.values(m.makes).includes(id));
      return el('div', { class: 'row' + (got ? '' : ' off') }, got ? icon('good_' + id) : el('span', { class: 'big', text: '❔' }),
        el('div', { class: 'grow' }, el('div', { class: 'name', text: got ? d.name : '？？？' }),
          el('div', { class: 'meta', text: got ? `賣 ${d.sell} 元` : `用${mk ? mk.name : '加工機'}做做看` })));
    }),
    el('h2', { class: 'section', text: `🍳 料理 ${recipeIds().filter((id) => have.has('dish:' + id)).length}/${recipeIds().length}` }),
    ...recipeIds().map((id) => [id, S.dishes[id]]).map(([id, d]) => {
      const got = have.has('dish:' + id);
      return el('div', { class: 'row' + (got ? '' : ' off') }, got ? icon(`dish_${id}@${d.shape}`) : el('span', { class: 'big', text: '❔' }),
        el('div', { class: 'grow' }, el('div', { class: 'name', text: got ? d.name : '？？？' }),
          el('div', { class: 'meta', text: got ? `賣 ${d.sell} 元・體力 +${d.energy}` : '到家裡的廚房看看食譜' })));
    }),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
// 家族成就＋這一週的紀錄（打開時重新拿一次，這週的數字才是最新的）
async function openAchievements() {
  try { await loadState(); } catch {}
  const got = S.achievements, w = S.thisWeek;
  const n = S.achievementList.filter((a) => got[a.id]).length;
  const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const rows = S.achievementList.map((a) => {
    const g = got[a.id];
    return el('div', { class: 'row' + (g ? '' : ' off') }, el('span', { class: 'big', text: g ? '🏆' : '🔒' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: a.name }),
        el('div', { class: 'meta', text: g ? `${a.desc}・${g.by || '家人'} ${md(new Date(g.at + 8 * 3600000).toISOString().slice(0, 10))} 達成・獎勵 ${a.reward} 元`
          : `${a.desc}・獎勵 ${a.reward} 元` })));
  });
  openModal(el('h2', { text: `🏆 家族成就 ${n}/${S.achievementList.length}` }),
    w ? el('p', { class: 'note', text: `📰 這一週（${md(w.week)} 起）：收成 ${w.harvest} 次・出貨賺了 ${w.shipped.toLocaleString()} 元${w.top ? `・最勤勞：${w.top.name}（${w.top.actions} 件事）` : ''}。每週第一次有人打開牧場，聊天室會貼上週的週報。` }) : null,
    ...rows,
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
function fishHint(d, unknown) {
  const WHERE = { pond: '牧場池塘', lake: '後山的湖', sea: '海邊', deep: '防波堤最前面' };
  const where = d.where.filter((w) => !(w === 'deep' && d.where.includes('sea'))).map((w) => WHERE[w] || w).join('、');
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
  // 夜市大家都去逛（雜貨店的阿福伯還是顧店）；節日大家都到廣場（雜貨店、小吃店的老闆還是顧店）
  const z = S.marketOn && id !== 'fu' ? S.market.zone : S.festival && id !== 'fu' && id !== 'mei' ? PLAZA : S.villagers[id].zone, out = [];
  for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++)
    if (WALK.has(((S.maps.town || [])[y] || '')[x]) && !stallOn(x, y)) out.push({ x, y });
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
  let r;
  try { r = await doAct({ action: 'talk', villager: id }); } catch { return; }
  S.talks++;
  // 感情夠了：先說一段故事，聽完再回到平常的聊天
  if (r.gained && r.gained.story) return openStory(id, r.gained.story, () => showVillager(id, r));
  showVillager(id, r);
}
function showVillager(id, r) {
  const v = S.villagers[id];
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
// 村民的故事：一頁一句，按「繼續」往下，最後一頁按「聽完了」
function openStory(id, story, after) {
  const v = S.villagers[id];
  let i = 0;
  const show = () => {
    const last = i >= story.lines.length - 1;
    openModal(
      el('div', { class: 'talk-head' }, icon('char_d0', v.color, v.hair),
        el('div', { class: 'grow' }, el('h2', { text: `📖 ${v.name}的故事（${story.chapter + 1}/${S.storyHearts.length}）` }),
          el('div', { class: 'sub', text: `「${story.title}」` }))),
      el('p', { class: 'speech story', text: story.lines[i] }),
      el('p', { class: 'note', text: `${i + 1} / ${story.lines.length}` }),
      el('div', { class: 'actions' }, el('button', {
        class: 'btn primary', type: 'button', text: last ? '聽完了' : '繼續 ▸',
        onclick: () => { if (last) { if (after) after(); else closeModal(); } else { i++; show(); } },
      })));
  };
  show();
}
// 聽過的故事（告示板上可以重看）
function openStoryList(id) {
  const v = S.villagers[id], f = S.friends[id] || {};
  const seen = (S.stories[id] || []).slice(0, f.storyLevel || 0);
  openModal(el('h2', { text: `📖 ${v.name}的故事` }),
    ...seen.map((st, n) => el('div', { class: 'row' }, el('span', { class: 'big', text: '📖' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${n + 1}. ${st.title}` })),
      el('button', { class: 'btn', type: 'button', text: '再看一次', onclick: () => openStory(id, { ...st, chapter: n }, () => openStoryList(id)) }))),
    ...(S.stories[id] || []).slice(seen.length).map((st, n) => el('div', { class: 'row off' }, el('span', { class: 'big', text: '🔒' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: '？？？' }),
        el('div', { class: 'meta', text: `感情 ${S.storyHearts[seen.length + n]} 顆愛心時找他聊天` })))),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '回告示板', onclick: openBoard })));
}

// 感情：每 10 點一顆愛心（最多 10 顆），也顯示點數，送禮後看得出有進步
const friendText = (f) => `❤️×${(f && f.hearts) || 0}・感情 ${(f && f.points) || 0}/100`;

function openGift(id) {
  const v = S.villagers[id];
  // 作物、雞蛋牛奶、魚、礦石、料理、加工品都能送（種子、飼料不行）
  const list = Object.keys(S.items).filter((item) => (itemInfo(item) || {}).sell > 0).sort();
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
    const A = S.activity;
    if (A) rows.push(el('div', { class: 'row festival' }, el('span', { class: 'big', text: '🎪' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `節慶活動：${A.name}` }),
        el('div', { class: 'meta', text: A.played ? '你今天已經玩過了，明年再來' : `${A.desc}（每人玩一次）` })),
      A.played ? null : el('button', { class: 'btn primary', type: 'button', text: '參加', onclick: openActivity })));
  }
  if (q) {
    const c = itemInfo(q.item) || { name: q.item, icon: 'seed' };
    const have = ingHave(q.item);
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
        el('div', { class: 'meta', text: `${v.role}・生日 ${Number(v.birthday.slice(0, 2))}/${Number(v.birthday.slice(3))}・${friendText(f)}${f.talkedToday ? '・今天聊過了' : ''}` })),
      el('button', { class: 'btn', type: 'button', text: `📖 ${f.storyLevel || 0}/${S.storyHearts.length}`, 'aria-label': `${v.name}的故事`, onclick: () => openStoryList(id) }));
  });
  if (S.marketOn) rows.unshift(el('div', { class: 'row festival' }, el('span', { class: 'big', text: '🏮' }),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: '今晚有夜市！' }),
      el('div', { class: 'meta', text: '就在小鎮南邊：撈金魚、套圈圈、夜市小吃、夜市限定，晚上 12 點收攤' }))));
  openModal(el('h2', { text: '📋 委託告示板' }), ...rows,
    el('h2', { class: 'section', text: '比賽' }), ...contestRows(),
    el('h2', { class: 'section', text: '🏗️ 小鎮修復計畫' }), ...projectRows(),
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
      el('div', { class: 'grow' }, el('div', { class: 'name', text: t.name }), el('div', { class: 'meta', text: `${t.desc}（只做需要的格子，體力照格子算）。之後可以拿到鐵匠鋪打成銅、銀、金的` })),
      el('button', {
        class: 'btn primary', type: 'button', text: have ? '已經有了' : `買 ${t.price}`, disabled: have || t.price > S.money,
        onclick: async () => { try { await doAct({ action: 'upgrade_tool', tool: id }); toast(`買了${t.name}！`); renderToolbar(); openStore(); } catch {} },
      }));
  });
  // 建築和加工機：要錢，也要後山挖的礦石
  const needText = (need) => Object.entries(need).map(([i, q]) => `${(itemInfo(i) || { name: i }).name} ${Math.min(S.items[i] || 0, q)}/${q}`).join('・');
  const enough = (price, need) => price <= S.money && Object.entries(need).every(([i, q]) => (S.items[i] || 0) >= q);
  const buildRow = (id) => {
    const b = S.builds[id];
    const done = id === 'greenhouse' ? S.ghBuilt : S.houseLevel >= b.level;
    const locked = b.level && S.houseLevel < b.level - 1;
    return el('div', { class: 'row' + (locked ? ' off' : '') }, el('span', { class: 'big', text: id === 'greenhouse' ? '🌱' : '🏠' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: b.name }),
        el('div', { class: 'meta', text: done ? b.desc : `${b.desc}。要 ${b.price.toLocaleString()} 元・${needText(b.need)}${locked ? '（先擴建大臥室）' : ''}` })),
      el('button', {
        class: 'btn primary', type: 'button', text: done ? '蓋好了' : '請阿福伯蓋', disabled: done || locked || !enough(b.price, b.need),
        onclick: async () => { try { await doAct({ action: 'build', what: id }); toast(`${b.name}蓋好了！`); openStore(); } catch {} },
      }));
  };
  const gearRow = (id) => {
    const G = S.gearKinds[id];
    const placed = S.gear.filter((g) => g.kind === id).length, have = S.items['gear:' + id] || 0;
    return el('div', { class: 'row' }, icon('gear_' + id),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: G.name }),
        el('div', { class: 'meta', text: `${G.desc}。要 ${G.price.toLocaleString()} 元${Object.keys(G.need).length ? '・' + needText(G.need) : ''}・田裡 ${placed} 個、倉庫 ${have} 個` })),
      el('button', {
        class: 'btn primary', type: 'button', text: '買', disabled: !enough(G.price, G.need),
        onclick: async () => { try { await doAct({ action: 'buy_gear', kind: id }); toast(`買了${G.name}，在倉庫按「擺到田裡」`); openStore(); } catch {} },
      }));
  };
  const machineRow = (id) => {
    const m = S.machineKinds[id];
    const have = !!S.machines[id];
    const what = Object.keys(m.makes).map((i) => `${(itemInfo(i) || { name: i }).name}→${S.goods[m.makes[i]].name}`).join('、');
    return el('div', { class: 'row' }, icon(`good_${Object.values(m.makes)[0]}`),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: m.name }),
        el('div', { class: 'meta', text: `${what}（${m.hours} 小時）${have ? '' : `。要 ${m.price.toLocaleString()} 元・${needText(m.need)}`}` })),
      el('button', {
        class: 'btn primary', type: 'button', text: have ? '已經有了' : '買', disabled: have || !enough(m.price, m.need),
        onclick: async () => { try { await doAct({ action: 'buy_machine', machine: id }); toast(`買了${m.name}，放在牧場攤位的旁邊`); openStore(); } catch {} },
      }));
  };
  openModal(el('h2', { text: '🏪 阿福伯的雜貨店' }),
    el('p', { class: 'sub', text: `錢包 ${S.money.toLocaleString()} 元。工具、建築、加工機都是全家共用的。礦石在後山的採石場挖。` }),
    ...rows, netRow(),
    el('h2', { class: 'section', text: '🏗️ 建築' }), ...Object.keys(S.builds).map(buildRow),
    el('h2', { class: 'section', text: '⚙️ 加工機' }), ...Object.keys(S.machineKinds).map(machineRow),
    el('h2', { class: 'section', text: '🚿 灑水器、稻草人' }), ...Object.keys(S.gearKinds).map(gearRow),
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', text: '🪑 裝飾與家具', onclick: openDecoShop }),
      el('button', { class: 'btn', type: 'button', text: '買種子、飼料', onclick: openShop }),
      el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 這一季能種的都列出來；別季的種子倉庫裡有的話也列，但要等季節到了才能用
function openSeedPicker() {
  const list = Object.entries(S.crops).filter(([id]) => inSeason(id) || S.items['seed:' + id]);
  const rows = list.map(([id, c]) => {
    const n = S.items['seed:' + id] || 0;
    const ok = canPlantHere(id);
    return el('div', { class: 'row' + (ok ? '' : ' off') }, icon(id + '_3'),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: seedName(id) }),
        el('div', { class: 'meta', text: ok ? `還有 ${n} 包・${cropMeta(c)}` : c.paddy ? `還有 ${n} 把・插在梯田的水田裡（後山往下走）`
          : S.area === 'terrace' ? `還有 ${n} 包・水田只能種稻子` : `還有 ${n} 包・${seasonsText(c.seasons)}才能種${S.ghBuilt ? '（溫室裡隨時能種）' : ''}` })),
      el('button', {
        class: 'btn' + (S.seed === id ? ' primary' : ''), type: 'button', disabled: !ok,
        text: S.seed === id ? '使用中' : ok ? '用這個' : c.paddy || S.area === 'terrace' ? '不能種' : '等季節',
        onclick: () => { S.seed = id; S.tool = 'seed'; renderToolbar(); closeModal(); },
      }));
  });
  const ferts = Object.entries(S.ferts).filter(([id]) => S.items['fert:' + id]).map(([id, f]) => el('div', { class: 'row' }, icon('fert_' + id),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: f.name }), el('div', { class: 'meta', text: `還有 ${S.items['fert:' + id]} 包・${f.desc}` })),
    el('button', {
      class: 'btn' + (S.seed === 'fert:' + id ? ' primary' : ''), type: 'button', text: S.seed === 'fert:' + id ? '使用中' : '用這個',
      onclick: () => { S.seed = 'fert:' + id; S.tool = 'seed'; renderToolbar(); closeModal(); toast(`點翻好的土施${f.name}`); },
    })));
  openModal(el('h2', { text: '🌱 要種什麼？' }), ...rows,
    ferts.length ? el('h2', { class: 'section', text: '🧪 肥料' }) : null, ...ferts,
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '去商店買種子、肥料', onclick: openShop })));
}

// 天氣預報與季節：點 HUD 上的時鐘打開
function openForecast() {
  const now = serverNow();
  const w = (k) => WEATHER[S.weather[k]] || WEATHER.sun;
  const rainNote = (k) => (S.weather[k] === 'typhoon' ? '，整天大雨大風：外面熟了沒收的作物會被吹倒，村民待在家裡，不能上山、不能釣魚'
    : S.weather[k] === 'cold' ? '，天氣很冷：在外面的田做事多花 1 點體力（溫室裡不會），喝熱湯特別補'
    : S.weather[k] === 'rain' ? '，田地整天都是濕的，不用澆水' : '');
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
        el('div', { class: 'meta', text: S.weather.tomorrow === 'typhoon' ? '⚠️ 明天颱風！外面田裡熟了的作物今天先收起來，溫室裡的沒關係'
          : S.weather.tomorrow === 'cold' ? '明天寒流，在外面做事會比較累，可以先煮好熱湯' 
          : S.weather.tomorrow === 'rain' ? '明天會下雨，今天晚上可以省一次澆水' : '記得早上出門前澆水' }))),
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
  const lows = S.tide.windows.filter(([a, b]) => b > serverNow() && a < serverNow() + 24 * 3600000)
    .map(([a, b]) => `${fmtClock(a)}～${fmtClock(b)}`);
  out.push(el('p', { class: 'note', text: S.tide.override ? `🌊 海邊現在${S.lowTide ? '退潮' : '漲潮'}（測試模式）` : `🌊 接下來的退潮：${lows.join('、') || '—'}（退潮時潮間帶撿得到蛤蜊、螃蟹）` }));
  out.push(el('p', { class: 'note', text: S.marketOn ? '🏮 今晚小鎮南邊有夜市，晚上 12 點收攤！' : '🏮 每個星期六晚上 5 點，小鎮南邊有夜市。' }));
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

const FIELD_ACTIONS = ['till', 'dig', 'plant', 'water', 'harvest', 'fertilize', 'place_gear', 'pickup_gear'];
async function doAct(body) {
  if (S.busy) return;
  S.busy = true;
  if (FIELD_ACTIONS.includes(body.action)) body = { ...body, map: S.area }; // 田在牧場還是溫室
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
    if (r.machines) S.machines = r.machines;
    if (r.trees) S.trees = r.trees;
    if (r.hives) S.hives = r.hives;
    if (r.pets) S.pets = r.pets;
    if (r.achievements) S.achievements = r.achievements;
    if (r.market) S.market = r.market;
    if (r.beauty) S.beauty = r.beauty;
    if (r.seasonHarvest != null) S.harvestContest.count = r.seasonHarvest;
    if (r.cave) applyCave(r.cave);
    if (r.forage) S.forage = r.forage;
    if (r.projects) S.projects = r.projects;
    if (r.decos) S.decos = r.decos;
    if (r.gear) S.gear = r.gear;
    if (r.notes) S.notes = r.notes;
    if (r.bugs) S.bugs = r.bugs;
    if (r.net) S.net = true;
    if (r.mail) S.mail = r.mail;
    if (r.giants) S.giants = r.giants;
    if (r.snow) S.snow = r.snow;
    if (r.meteor) { S.meteor = r.meteor; renderWish(); }
    if (r.graze) S.graze = r.graze;
    if (r.horse !== undefined) { S.horse = r.horse; renderRide(); }
    if (r.crows) S.crows = r.crows;
    if (r.caveBest != null) S.caveInfo.best = r.caveBest;
    for (const a of r.newAchievements || []) setTimeout(() => toast(`🏆 達成成就「${a.name}」！全家拿到 ${a.reward} 元`), 900);
    if (r.build) applyBuild(r.build);
    if (r.energyMax) S.energyMax = r.energyMax;
    // 田地上的動作：收成飄出「+1 作物」，其他飄出扣了幾點體力（釣魚、挖礦自己處理）
    if (body.x != null && body.action !== 'fish' && body.action !== 'mine') {
      const got = r.gained && r.gained.item && itemInfo(r.gained.item);
      if (got) floatAt(body.x, body.y, r.gained.items && r.gained.qty > 1 ? `+${r.gained.qty} 收成` : `+1 ${got.name}`, '#fff3b0');
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
  const stall = stallAt(x, y);
  if (stall) return openStall(stall);
  if (ch === 'V') return openMinecart();
  if (PROJECT_AT[ch]) return openProject(PROJECT_AT[ch]);
  if (S.area === 'cave') {
    if (ch === '^') return leaveCave();
    if (ch === 'v') return enterCave(S.cave.floor + 1);
    if (ch === 'C') return openChest();
  }
  if (ch === 'B') return openBin();
  if (ch === 'n') return openNotes();
  if (ch === 'x') return openMailbox();
  if (ch === 'w') return openSnowman();
  if (ch === 'S') return openShop();
  if (ch === 'H') return openKitchen();
  if (ch === 'A') return openBarn();
  if (ch === 'J') return S.ghBuilt ? goArea('gh') : openGreenhouseLot();
  if (ch === 'M') return useMachine(machineAt(x, y));
  if (ch === 'Y') return useTree(S.treeSpots.findIndex((p) => p.x === x && p.y === y));
  if (ch === 'Z') return useHive(S.hiveSpots.findIndex((p) => p.x === x && p.y === y));
  if (forageAt(x, y)) return pickForage(x, y);
  if (ch === 'e') return toast('這棵茶樹今天採過了，明天會再冒新芽');
  if (decoAt(x, y)) return openDeco(decoAt(x, y));
  if (ch === 'W' || (ch === 'd' && !S.lowTide)) return startFishing(x, y);
  if (rockAt(x, y)) return mineRock(x, y);
  if (ch === 'G') return openStore();
  if (ch === 'b') return openSmith();
  if (ch === 'R') return openEatery();
  if (ch === 'N') return openBoard();
  if (ch === 'O') return toast('噴水池裡有好多硬幣，許個願吧 ✨');
  if (ch === 'Q') { const who = HOMES[homeIndex(x, y)]; return toast(who ? `這是${S.villagers[who].name}的家` : '別人的家'); }
  if (ch !== 'F' && ch !== 'r') return;
  const paddy = ch === 'r'; // 水田：不用翻土、不用澆水，只能種稻子
  if (gearAt(x, y)) return openGear(gearAt(x, y));
  const t = S.tiles.get(key(x, y)) || { tilled: false, crop: null };
  const now = serverNow();
  if (t.crop && stage(t, now) === 3) {
    return doAct({ action: 'harvest', x, y, ...(tierOf('sickle') > 0 ? { area: true } : {}) }).then((r) => {
      const q = r && r.gained && r.gained.quality;
      if (r && r.gained && r.gained.giant) toast(`🎉 收成了一顆${itemInfo(r.gained.item).name}！可以賣 ${itemInfo(r.gained.item).sell.toLocaleString()} 元`);
      else if (r && r.gained && r.gained.qty > 1 && r.gained.items) toast(`🌾 一次收成了 ${r.gained.qty} 個${q >= 2 ? `，最好的是${itemInfo(r.gained.item).name}` : ''}`);
      else if (q >= 2) toast(`${q === 3 ? '🌟' : '⭐'} 收成了${itemInfo(r.gained.item).name}！賣 ${itemInfo(r.gained.item).sell} 元`);
    }).catch(() => {});
  }
  if (paddy && S.tool === 'hoe' && !t.crop) return toast('水田不用翻土，拿「種子」工具選秧苗直接插秧');
  if (paddy && S.tool === 'can') return toast('水田裡都是水，不用澆');
  if (S.tool === 'hoe') {
    if (!t.tilled) return doAct({ action: 'till', x, y, ...(wideTool('hoe') ? { area: true } : {}) }).catch(() => {});
    if (t.crop) return confirmDig(t, x, y);
    // 大鋤頭：點翻好的地，也會把旁邊還沒翻的一起翻好
    if (wideTool('hoe')) return doAct({ action: 'till', x, y, area: true }).catch(() => {});
    return toast('這塊已經翻好了，換「種子」來播種');
  }
  if (S.tool === 'can') {
    if (!t.tilled) return toast('要先用鋤頭翻土');
    // 下雨天第一次澆水先提醒一下（省體力）；真的要澆再點一次
    if (wetSky(S.weather.today) && S.area !== 'gh' && !S.rainWarned) {
      S.rainWarned = true;
      return toast('今天下雨，田地整天都是濕的，不用澆水 ☔（真的要澆再點一次）');
    }
    return doAct({ action: 'water', x, y, ...(wideTool('can') ? { area: true } : {}) }).catch(() => {});
  }
  if (S.tool === 'seed' && isFert(S.seed)) {
    const F = S.ferts[S.seed.slice(5)];
    if (!t.tilled && !paddy) return toast('要先用鋤頭翻土');
    if (t.fert) return toast(`這格已經施了${(S.ferts[t.fert] || F).name}，收成之後才能再施`);
    if (!S.items[S.seed]) return toast(`沒有${F.name}了，去攤位買`);
    return doAct({ action: 'fertilize', x, y, fert: S.seed.slice(5) }).then(() => renderToolbar()).catch(() => {});
  }
  if (S.tool === 'seed') {
    if (!t.tilled && !paddy) return toast('要先用鋤頭翻土');
    if (t.crop) return describe(t, now);
    const sc = S.crops[S.seed];
    if (paddy && !sc.paddy) return toast('水田只能種稻子，按「種子」換成秧苗（攤位有賣）');
    if (!paddy && sc.paddy) return toast('秧苗要插在梯田的水田裡（後山往下走）');
    if (!canPlantHere(S.seed)) return toast(`${sc.name}要${seasonsText(sc.seasons)}才能種，按「種子」換一種${S.ghBuilt ? '（溫室裡隨時能種）' : ''}`);
    if (!S.items['seed:' + S.seed]) { toast(`沒有${seedName(S.seed)}了，去攤位買吧`); return; }
    return doAct({ action: 'plant', x, y, crop: S.seed }).catch(() => {});
  }
  if (t.crop) return describe(t, now);
  toast(t.tilled ? `翻好的土${t.fert ? `（施了${S.ferts[t.fert].name}）` : ''}，可以播種` : '還沒翻土的田');
}

function describe(t, now) {
  const c = S.crops[t.crop];
  const left = (t.total - grown(t, now)) / S.scale / (t.rate || 1);
  const fert = t.fert && S.ferts[t.fert] ? `・施了${S.ferts[t.fert].name}` : '';
  if (!wet(t, now)) return toast(`${c.name}：土乾了，澆水才會繼續長（還差 ${fmtLeft(left)}${fert}）`);
  toast(`${c.name}：再 ${fmtLeft(left)} 就能收成${c.regrow ? '（收完會再長）' : ''}${fert}`);
}

// 表情：選一個，頭上冒泡泡，在線的家人都看得到
function openEmotes() {
  openModal(el('h2', { text: '😊 打個招呼' }), el('p', { class: 'sub', text: '頭上會冒出泡泡，同一座牧場在線的家人都看得到' }),
    el('div', { class: 'emote-grid' }, ...S.emoteList.map((e, i) => el('button', { type: 'button', text: e, 'aria-label': e, onclick: () => sendEmote(i) }))),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
function sendEmote(i) {
  closeModal();
  S.emotes.set(S.meId, { e: S.emoteList[i], until: performance.now() + 3000 });
  try { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'emote', e: i })); } catch {}
}

// 拍照：把現在的牧場畫面加上一條字（牧場名字、日期），縮小成 JPEG，可以傳到聊天室或存下來
function takePhoto() {
  const src = canvas;
  const top = Math.min(src.height - 1, Math.round((S.padTop || 0) * dpr)); // 上面被狀態列擋住的那一條不要
  const scale = Math.min(1, 1280 / src.width);
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * scale); c.height = Math.round((src.height - top) * scale);
  const pg = c.getContext('2d');
  pg.drawImage(src, 0, top, src.width, src.height - top, 0, 0, c.width, c.height);
  const d = new Date(serverNow() + 8 * 3600000);
  const label = `🌾 ${S.title}・${d.getUTCMonth() + 1}/${d.getUTCDate()}・${SEASON[S.season]}天`;
  const fs = Math.max(14, Math.round(c.width / 40));
  pg.fillStyle = 'rgba(0,0,0,0.45)'; pg.fillRect(0, c.height - fs * 2, c.width, fs * 2);
  pg.fillStyle = '#ffffff'; pg.font = `bold ${fs}px sans-serif`; pg.textBaseline = 'middle';
  pg.fillText(label, fs * 0.7, c.height - fs);
  let url = '';
  for (const q of [0.85, 0.7, 0.55, 0.4]) { url = c.toDataURL('image/jpeg', q); if (url.length <= 650000) break; }
  const share = el('button', { class: 'btn primary', type: 'button', text: '傳到聊天室' });
  share.onclick = async () => {
    share.disabled = true;
    try {
      await api(`/api/conversations/${convId}/messages`, { method: 'POST', body: { type: 'image', content: url } });
      toast('📷 照片傳到聊天室了'); closeModal();
    } catch (e) { toast(e.message); share.disabled = false; }
  };
  openModal(el('h2', { text: '📷 牧場的照片' }), el('img', { class: 'photo-preview', src: url, alt: '牧場的照片' }),
    el('div', { class: 'actions' },
      el('a', { class: 'btn', href: url, download: `牧場-${d.getUTCMonth() + 1}-${d.getUTCDate()}.jpg`, text: '存到手機／電腦' }),
      share, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 家庭留言板：寫小紙條給家人（聊天室也會說一聲），自己寫的可以拿掉
function openNotes() {
  const input = el('input', { type: 'text', maxlength: '60', placeholder: '寫給家人的話（最多 60 個字）', 'aria-label': '留言' });
  const post = el('button', { class: 'btn primary', type: 'button', text: '貼上去' });
  post.onclick = async () => {
    if (!input.value.trim()) return toast('寫點什麼吧');
    try { await doAct({ action: 'note_add', text: input.value }); toast('📌 貼好了，聊天室也說了一聲'); openNotes(); } catch {}
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') post.click(); });
  const ago = (t) => { const m = Math.round((serverNow() - t) / 60000); return m < 1 ? '剛剛' : m < 60 ? `${m} 分鐘前` : m < 1440 ? `${Math.round(m / 60)} 小時前` : `${Math.round(m / 1440)} 天前`; };
  const rows = S.notes.map((n) => el('div', { class: 'row' }, el('span', { class: 'big', text: '📝' }),
    el('div', { class: 'grow' }, el('div', { class: 'note-text', text: n.text }), el('div', { class: 'meta', text: `${n.name}・${ago(n.at)}` })),
    n.userId === S.meId ? el('button', {
      class: 'btn', type: 'button', text: '拿掉', 'aria-label': '拿掉這則留言',
      onclick: async () => { try { await doAct({ action: 'note_del', id: n.id }); openNotes(); } catch {} },
    }) : null));
  openModal(el('h2', { text: '📌 家庭留言板' }), el('p', { class: 'sub', text: '寫給家人的小紙條，大家打開牧場都看得到（最多留 20 張）' }),
    el('div', { class: 'row' }, input, post),
    ...(rows.length ? rows : [el('div', { class: 'empty', text: '還沒有人留言，寫第一張吧' })]),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
  setTimeout(() => input.focus(), 50);
}

// ---------- 巨大作物、冬天的雪、流星雨（第二十六期） ----------
const inGiant = (x, y) => S.area === 'farm' && S.giants.some((gi) => x >= gi.x && x <= gi.x + 2 && y >= gi.y && y <= gi.y + 2);
const snowHere = () => !!(S.snow && S.snow.day) && (S.area === 'hill' || S.area === 'terrace');
// 山上的大雪：比寒流的小雪多、飄得慢
function drawSnow(vw, vh) {
  g.fillStyle = 'rgba(210,225,245,0.16)'; g.fillRect(0, 0, vw, vh);
  const t = performance.now() / 1000, n = Math.round((vw * vh) / (dpr * dpr) / 2500);
  for (let i = 0; i < n; i++) {
    const sz = (i % 3 === 0 ? 3.5 : 2.2) * dpr;
    const y = ((i * 0.4142 + t * (0.05 + ((i * 0.618) % 1) * 0.05)) % 1) * vh;
    const x = (((i * 0.7548) % 1) * vw + Math.sin(t * 0.8 + i) * 16 * dpr + vw) % vw;
    g.fillStyle = i % 4 ? 'rgba(255,255,255,0.9)' : 'rgba(235,242,255,0.75)';
    g.fillRect(x, y, sz, sz);
  }
}
// 流星：每隔一會兒從右上往左下劃過一道
const meteors = [];
function drawMeteors(vw, vh) {
  if (!S.meteor || !S.meteor.active) return;
  const t = performance.now();
  if (meteors.length < 3 && Math.random() < 0.025) meteors.push({ x: (0.3 + Math.random() * 0.7) * vw, y: Math.random() * 0.35 * vh, born: t, len: (60 + Math.random() * 80) * dpr });
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i], age = (t - m.born) / 900;
    if (age > 1) { meteors.splice(i, 1); continue; }
    const hx = m.x - age * 260 * dpr, hy = m.y + age * 140 * dpr;
    const grad = g.createLinearGradient(hx, hy, hx + m.len, hy - m.len * 0.54);
    grad.addColorStop(0, `rgba(255,255,230,${(1 - age).toFixed(2)})`); grad.addColorStop(1, 'rgba(255,255,230,0)');
    g.strokeStyle = grad; g.lineWidth = 2.5 * dpr;
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + m.len, hy - m.len * 0.54); g.stroke();
  }
}
function openSnowman() {
  const S0 = S.snow, max = S.snowman.parts || 3;
  if (!S0.day) {
    return openModal(el('h2', { text: '⛄ 雪人小丘' }),
      el('p', { class: 'sub', text: '冬天寒流或下雨的日子，後山和梯田會下雪（平地只是很冷）。下雪的時候來這裡堆一個雪人吧！' }),
      el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
  }
  const done = S0.parts >= max;
  const carrot = Object.keys(S.items).find((k) => k.split('@')[0] === 'crop:carrot' && S.items[k] > 0);
  const step = async (body, msg) => { try { await doAct({ action: 'snowman', ...body }); toast(msg()); openSnowman(); } catch {} };
  openModal(el('h2', { text: '⛄ 堆雪人' }),
    el('p', { class: 'sub', text: done ? `雪人堆好了！${S0.nose ? '還插上了紅蘿蔔鼻子。' : ''}雪停了就會融化，趁現在多看幾眼。`
      : `下雪了！一次堆一段（${S.snowman.energy} 點體力）：底座、身體、頭，三段堆好就完成，家人也可以一起堆。現在堆了 ${S0.parts}/${max} 段。` }),
    el('div', { class: 'actions' },
      done ? null : el('button', { class: 'btn primary', type: 'button', text: ['堆底座', '堆身體', '堆頭'][S0.parts] || '堆一段',
        onclick: () => step({ step: 'roll' }, () => (S.snow.parts >= max ? '⛄ 雪人堆好了！' : `堆好第 ${S.snow.parts} 段了`)) }),
      done && !S0.nose ? el('button', { class: 'btn', type: 'button', text: carrot ? '🥕 插上紅蘿蔔鼻子' : '🥕 鼻子（倉庫沒有紅蘿蔔）', disabled: !carrot,
        onclick: () => step({ step: 'nose' }, () => '🥕 插上鼻子了，好可愛！') }) : null,
      el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
function renderWish() { renderToolbar(); }
function openWish() {
  const M = S.meteor || {};
  if (!M.active) return toast('今晚沒有流星雨');
  const rows = Object.entries(S.wishes).map(([id, w]) => el('div', { class: 'row' }, el('span', { class: 'big', text: w.emoji }),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: w.name }), el('div', { class: 'meta', text: w.desc })),
    M.wished ? null : el('button', { class: 'btn primary', type: 'button', text: '許這個願', onclick: async () => {
      try {
        const r = await doAct({ action: 'wish', wish: id });
        toast(`🌠 ${w.name}！${id === 'health' ? '體力補滿了' : id === 'wealth' ? `錢包 +${S.wishMoney} 元` : id === 'harvest' ? `收到 3 包${seedName(r.gained.seed)}` : '村民們都更喜歡你們了'}`);
        closeModal();
      } catch {}
    } })));
  openModal(el('h2', { text: '🌠 流星雨' }),
    el('p', { class: 'sub', text: M.wished ? `今晚已經許過願了：${(S.wishes[M.wished] || {}).name || ''}。` : '今晚有流星雨！看到流星的時候許一個願望吧（每個人一晚一次）。' }),
    ...rows, el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// ---------- 信箱（第二十五期） ----------
const mailFrom = (m) => (m.fromUser ? (S.members.get(m.fromUser) || {}).name || '家人'
  : m.from && S.villagers[m.from] ? S.villagers[m.from].name : '郵差志明');
const mailDate = (t) => { const d = new Date(t + 8 * 3600000); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const mailItem = (m) => (m.item ? `${(itemInfo(m.item) || { name: m.item }).name}${m.qty > 1 ? ' ×' + m.qty : ''}` : '');
function openMailbox() {
  const rows = (S.mail.list || []).map((m) => el('div', { class: 'row' + (m.read ? '' : ' unread') },
    el('span', { class: 'big', text: m.fromUser ? '💌' : '✉️' }),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: (m.read ? '' : '🔴 ') + m.title }),
      el('div', { class: 'meta', text: `${mailFrom(m)}・${mailDate(m.at)}${m.item ? `・附上${mailItem(m)}${m.claimed ? '（收下了）' : ''}` : ''}` })),
    el('button', { class: 'btn', type: 'button', text: '打開', onclick: () => openLetter(m) })));
  openModal(el('h2', { text: '📮 信箱' }),
    el('p', { class: 'sub', text: '郵差志明會把鎮上的人寄來的信送到這裡。家人之間也可以互相寄信，還可以附上一道菜：對方打開信就會吃掉、補體力。' }),
    ...(rows.length ? rows : [el('div', { class: 'empty', text: '還沒有信' })]),
    el('div', { class: 'actions' },
      el('button', { class: 'btn primary', type: 'button', text: '✏️ 寄信給家人', onclick: openWriteMail }),
      el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
async function openLetter(m) {
  let g = null;
  if (!m.read || (m.item && !m.claimed)) {
    try { g = (await doAct({ action: 'mail_open', id: m.id })).gained; } catch { return; }
  }
  const got = g && g.item ? (g.ate ? `🍽️ 吃了${itemInfo(g.item).name}，體力 +${g.energy}` : `📦 收下了${mailItem(g)}，放進倉庫了`)
    : m.item && m.claimed ? `附上的${mailItem(m)}已經收下了` : null;
  openModal(el('h2', { text: `✉️ ${m.title}` }),
    el('div', { class: 'letter' }, el('p', { text: m.body }), el('p', { class: 'sign', text: `— ${mailFrom(m)}` })),
    got ? el('p', { class: 'note', text: got }) : null,
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', text: '回信箱', onclick: openMailbox }),
      el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
function openWriteMail() {
  const others = [...S.members.values()].filter((m) => m.id !== S.meId);
  if (!others.length) return toast('這個聊天室只有你一個人');
  const to = el('select', { 'aria-label': '寄給誰' }, ...others.map((m) => el('option', { value: String(m.id), text: m.name })));
  const dishes = Object.keys(S.items).filter((k) => k.startsWith('dish:') && S.items[k] > 0 && S.dishes[k.slice(5)]);
  const item = el('select', { 'aria-label': '附上一道菜' }, el('option', { value: '', text: '不附東西' }),
    ...dishes.map((k) => el('option', { value: k, text: `${itemInfo(k).name}（體力 +${S.dishes[k.slice(5)].energy}，倉庫有 ${S.items[k]} 份）` })));
  const max = S.mailInfo.textMax || 80;
  const text = el('input', { type: 'text', maxlength: String(max), placeholder: `想說的話（最多 ${max} 個字）`, 'aria-label': '信的內容' });
  const send = el('button', { class: 'btn primary', type: 'button', text: '寄出' });
  send.onclick = async () => {
    if (!text.value.trim()) return toast('寫幾句話吧');
    try {
      await doAct({ action: 'mail_send', to: Number(to.value), text: text.value, ...(item.value ? { item: item.value } : {}) });
      toast('📮 寄出去了！'); openMailbox();
    } catch {}
  };
  openModal(el('h2', { text: '✏️ 寄信給家人' }),
    el('p', { class: 'sub', text: `附上的菜，對方打開信就會吃掉補體力（體力是滿的就放進倉庫）。一個人一天最多寄 ${S.mailInfo.daily || 5} 封。` }),
    el('div', { class: 'row' }, el('span', { class: 'big', text: '👤' }), el('div', { class: 'grow' }, el('div', { class: 'name', text: '寄給' }), to)),
    el('div', { class: 'row' }, el('span', { class: 'big', text: '🍱' }), el('div', { class: 'grow' }, el('div', { class: 'name', text: '附上一道菜' }), item)),
    el('div', { class: 'row' }, el('span', { class: 'big', text: '✏️' }), el('div', { class: 'grow' }, el('div', { class: 'name', text: '想說的話' }), text)),
    el('div', { class: 'actions' }, send, el('button', { class: 'btn', type: 'button', text: '取消', onclick: openMailbox })));
  setTimeout(() => text.focus(), 50);
}

// ---------- 捕蟲（第二十四期） ----------
const BUG_AREA_NAME = { farm: '牧場', town: '小鎮', hill: '後山', beach: '海邊', terrace: '梯田' };
const bugsHere = () => ((S.bugs && S.bugs.areas) || {})[S.area] || [];
const bugAt = (x, y) => bugsHere().find((b) => b.x === x && b.y === y) || null;
// 圖鑑上的提示：在哪裡、什麼季節、白天還是晚上
const bugHint = (B) => `${B.where.map((a) => BUG_AREA_NAME[a]).join('、')}・${B.seasons.length === 4 ? '一年四季' : B.seasons.map((x) => SEASON[x]).join('') + '天'}`
  + (B.rain ? '・下雨天' : B.time === 'day' ? '・白天' : B.time === 'night' ? '・晚上' : '');
async function catchBug(idx) {
  const b = bugsHere().find((x) => x.idx === idx);
  if (!b) return toast('蟲飛走了');
  if (!S.net) return toast(`要先到阿福伯的雜貨店買一支捕蟲網（${S.netInfo.price || 500} 元）`);
  const B = S.bugKinds[b.kind] || { name: '蟲' };
  try {
    const r = await doAct({ action: 'catch', area: S.area, idx });
    if (r.gained.escaped) toast(`💨 ${B.name}飛走了……下一批 2 小時後出來`);
    else toast(r.gained.first ? `🎉 第一次抓到${B.name}！圖鑑新增一種` : `🦋 抓到${B.name}了！賣 ${B.sell} 元`);
  } catch {}
}
function netRow() {
  const price = S.netInfo.price || 500;
  return el('div', { class: 'row' }, el('span', { class: 'big', text: '🦋' }),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: '捕蟲網' }),
      el('div', { class: 'meta', text: '看到蟲就點牠，走過去揮網（1 點體力）。牧場、後山、小鎮、海邊、梯田每 2 小時換一批，白天晚上、季節、天氣不一樣' })),
    el('button', {
      class: 'btn primary', type: 'button', text: S.net ? '已經有了' : `買 ${price}`, disabled: S.net || S.money < price,
      onclick: async () => { try { await doAct({ action: 'buy_net' }); toast('🦋 買了捕蟲網！看到蟲就點牠'); openStore(); } catch {} },
    }));
}

// ---------- 阿鐵師傅的鐵匠鋪（第二十三期） ----------
const SMITH_ICO = { hoe: '⛏️', can: '💧', sickle: '🌾' };
// 這把工具（第幾級）能做什麼：一次翻 5×3，體力少一半
function smithPerk(tool, tier, big) {
  const [w, h] = sizeOf(tier, big);
  const T = S.smithTools[tool] || {}, m = tier > 0 && S.smithTiers[tier] ? S.smithTiers[tier].energy : 1;
  if (w === 1) return tool === 'sickle' ? '一次收成一格' : '一次一格';
  return `一次${T.verb} ${w}×${h}` + (tool !== 'sickle' && m < 1 ? `，體力${m === 0.5 ? '少一半' : '只要四分之一'}` : '');
}
function openSmith() {
  const job = S.tools.smith;
  const title = (id, tier, big) => (tier > 0 ? S.smithTiers[tier].name : big ? '大' : '') + S.smithTools[id].name;
  const rows = Object.entries(S.smithTools).map(([id, T]) => {
    const tier = tierOf(id), big = id !== 'sickle' && S.tools[id] >= 2, next = S.smithTiers[tier + 1];
    const busy = !!job && job.tool === id;
    let meta, ok = false;
    if (!next) meta = `${smithPerk(id, tier, big)}。已經是最好的了 ✨`;
    else if (T.needBig && !big) meta = `${smithPerk(id, tier, big)}。要先到阿福伯的雜貨店換大${id === 'can' ? '澆水壺' : T.name}，再拿來打`;
    else {
      const have = Math.min(S.items[next.ore] || 0, next.qty);
      ok = !job && S.money >= next.price && have >= next.qty;
      meta = `現在${smithPerk(id, tier, big)}。打成${next.name}${T.name}：${smithPerk(id, tier + 1, true)}。要 ${next.price.toLocaleString()} 元・${itemInfo(next.ore).name} ${have}/${next.qty}`;
    }
    return el('div', { class: 'row' + (next ? '' : ' off') }, el('span', { class: 'big', text: SMITH_ICO[id] || '🔨' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: title(id, tier, big) + (busy ? `（師傅正在打成${next.name}的）` : '') }), el('div', { class: 'meta', text: meta })),
      next ? el('button', {
        class: 'btn primary', type: 'button', text: busy ? '明天來拿' : '交給師傅', disabled: !ok,
        onclick: async () => {
          try {
            const r = await doAct({ action: 'smith', tool: id });
            toast(r.gained.ready ? `🔨 ${title(id, r.gained.tier, true)}打好了！` : `🔨 交給阿鐵師傅了，明天就打好${title(id, r.gained.tier, true)}`);
            renderToolbar(); openSmith();
          } catch {}
        },
      }) : null);
  });
  openModal(el('h2', { text: '🔨 阿鐵師傅的鐵匠鋪' }),
    el('p', { class: 'sub', text: `用後山、洞窟挖到的礦石，把工具打成銅、銀、金的：一次做一大片，還比較省體力。打一把要一天（明天來拿），師傅打的時候舊的先借你用，一次只能打一把。錢包 ${S.money.toLocaleString()} 元。` }),
    job && S.smithTools[job.tool] ? el('p', { class: 'note', text: `🔥 師傅正在打${title(job.tool, tierOf(job.tool) + 1, true)}，明天就好了` }) : null,
    ...rows, el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// ---------- 放牧、騎馬（第二十二期） ----------
const riding = () => !!(S.horse && S.horse.rider === S.meId);
const rideSpeed = () => (16 + Math.floor(Math.min(S.horseInfo.loveMax || 20, (S.horse && S.horse.love) || 0) / 4)) / 10;
// 馬平常走的路：動物小屋和池塘中間那一條（第 6 列，x 22～28）
function horsePos(now) {
  const SL = 9000, t = now, slot = Math.floor(t / SL);
  const xs = (k) => 22 + (hash32(77 + k) % 7);
  const from = xs(slot - 1), to = xs(slot), walk = Math.min(1, ((t % SL) / SL) / 0.5);
  return { x: from + (to - from) * walk, y: 6, moving: walk < 1 && from !== to, flip: to < from };
}
function renderRide() {
  const b = $('btn-ride');
  if (!b) return;
  b.classList.toggle('hidden', !S.horse);
  b.classList.toggle('on', riding());
  b.title = riding() ? '下馬' : S.horse ? `騎${S.horse.name}` : '騎馬';
}
async function toggleRide() {
  if (!S.horse) return toast('還沒有馬，到動物小屋買一匹');
  if (riding()) {
    try { await doAct({ action: 'dismount' }); toast(`下馬了，${S.horse.name}自己走回動物小屋旁邊`); } catch {}
    sendPos(false);
    return;
  }
  if (!S.rideAreas.includes(S.area)) return toast('這裡不能騎馬，到外面再騎');
  try { await doAct({ action: 'ride', area: S.area }); toast(`🐴 騎上${S.horse.name}了，走得比較快！再按一次 🐴 下馬`); } catch {}
  sendPos(false);
}
function grazeRow() {
  const herd = S.animals.filter((a) => (S.animalKinds[a.kind] || {}).zone !== 'pond').length;
  const today = new Date(serverNow() + 8 * 3600000).toISOString().slice(0, 10);
  const meta = S.graze.out ? '雞、牛、羊在後山南邊的草地上吃草，晚上 8 點前記得趕回來（不然會嚇到，愛心 -1）'
    : S.graze.day === today ? '今天已經放牧過了，明天再帶牠們出去'
    : '天氣好的白天（6～16 點）把雞、牛、羊放到後山吃草：算今天餵過了（不用飼料），愛心還多 +1。鴨子留在池塘';
  const btn = S.graze.out
    ? el('button', { class: 'btn primary', type: 'button', text: '趕回小屋', onclick: async () => { try { await doAct({ action: 'graze_in' }); toast('動物都回到小屋了 🏠'); openBarn(); } catch {} } })
    : el('button', { class: 'btn primary', type: 'button', text: '放到後山吃草', disabled: !herd || S.graze.day === today,
      onclick: async () => { try { const r = await doAct({ action: 'graze_out' }); toast(`🌿 ${r.gained.grazed} 隻動物到後山吃草了${r.gained.fed ? `（${r.gained.fed} 隻算今天餵過了）` : ''}`); openBarn(); } catch {} } });
  return el('div', { class: 'row' }, el('span', { class: 'big', text: '🌿' }), el('div', { class: 'grow' }, el('div', { class: 'meta', text: meta })), btn);
}
function horseRows(back) {
  if (!S.horse) {
    const input = el('input', { type: 'text', maxlength: '8', placeholder: '幫馬取名字', 'aria-label': '馬的名字' });
    return [el('div', { class: 'row' }, icon('horse_0'),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `一匹馬　${S.horseInfo.price.toLocaleString()} 元` }),
        el('div', { class: 'meta', text: '騎上去走得快很多（每天摸摸，愛心越多跑越快），全家共用，同時只能一個人騎' }), input),
      el('button', {
        class: 'btn primary', type: 'button', text: '買', disabled: S.money < S.horseInfo.price,
        onclick: async () => {
          if (!input.value.trim()) return toast('幫牠取個名字');
          try { await doAct({ action: 'buy_horse', name: input.value }); toast(`🐴 ${S.horse.name}來到牧場了！`); back(); } catch {}
        },
      }))];
  }
  const H = S.horse, who = H.rider && H.rider !== S.meId ? (S.members.get(H.rider) || {}).name || '家人' : '';
  return [el('div', { class: 'row' }, icon('horse_0'),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: `${H.name}　${heartsText(H.hearts)}` }),
      el('div', { class: 'meta', text: riding() ? '你正在騎' : who ? `${who}正在騎` : `在動物小屋旁邊・騎上去快 ${rideSpeed().toFixed(1)} 倍${H.pettedToday ? '・今天摸過了' : ''}` })),
    H.pettedToday ? null : el('button', { class: 'btn', type: 'button', text: '摸摸', onclick: async () => { try { await doAct({ action: 'horse_pet' }); toast(`${H.name}很開心！`); back(); } catch {} } }),
    who ? null : el('button', { class: 'btn primary', type: 'button', text: riding() ? '下馬' : '騎上去', onclick: async () => { closeModal(); await toggleRide(); } }))];
}
function openHorse() {
  if (!S.horse) return;
  openModal(el('h2', { text: `🐴 ${S.horse.name}` }), ...horseRows(openHorse),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}

// 點擺在田裡的灑水器、稻草人：說明、收起來
function openGear(g) {
  const G = S.gearKinds[g.kind] || { name: g.kind, desc: '' };
  const n = gearCovers(g).length;
  openModal(el('div', { class: 'talk-head' }, icon('gear_' + g.kind),
    el('div', { class: 'grow' }, el('h2', { text: G.name }),
      el('div', { class: 'sub', text: G.range === 'scare' ? G.desc : `${G.desc}（這裡澆得到 ${n} 格），被澆到的田一直是濕的，不用自己澆` }))),
  el('p', { class: 'note', text: '收起來會放回倉庫，可以再擺到別的地方' }),
  el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '好', onclick: closeModal }),
    el('button', {
      class: 'btn', type: 'button', text: '收起來',
      onclick: async () => { try { await doAct({ action: 'pickup_gear', x: g.x, y: g.y }); toast(`${G.name}收回倉庫了`); closeModal(); } catch {} },
    })));
}
// 把灑水器、稻草人擺到田裡：跟擺裝飾一樣，先選、再點一格
function startPlacingGear(kind) {
  const G = S.gearKinds[kind];
  if (S.area !== 'farm' && S.area !== 'gh') return toast(`${G.name}要擺在牧場或溫室的田裡`);
  S.placing = { gear: kind };
  closeModal();
  let bar = document.getElementById('place-banner');
  if (!bar) {
    bar = el('div', { id: 'place-banner', class: 'place-banner' });
    document.body.append(bar);
  }
  bar.textContent = '';
  bar.append(el('span', { text: `🚿 點一格空的田擺「${G.name}」` }),
    el('button', { class: 'btn', type: 'button', text: '取消', onclick: stopPlacing }));
}
async function placeGear(x, y) {
  const kind = S.placing.gear;
  try { await doAct({ action: 'place_gear', kind, x, y }); } catch { return; }
  toast(`擺好${S.gearKinds[kind].name}了！`);
  stopPlacing();
}

/* ---------- 節慶活動 ---------- */

async function playActivity(body) {
  try {
    const r = await doAct({ action: 'festival_play', ...body });
    S.activity = { ...S.activity, played: true };
    return r.gained;
  } catch { return null; }
}
function prizeText(g) {
  const it = g.item && itemInfo(g.item);
  return [g.money ? `${g.money} 元` : null, it ? `${it.name}${g.qty > 1 ? ` ×${g.qty}` : ''}` : null].filter(Boolean).join('、') || '一個好回憶';
}
function activityDone(title, g) {
  S.game = null;
  if (!g) return closeModal();
  openModal(el('h2', { text: title }), el('p', { class: 'speech story', text: g.text }),
    el('p', { class: 'note', text: `拿到：${prizeText(g)}` }),
    el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'button', text: '好開心！', onclick: closeModal })));
}
function openActivity() {
  const A = S.activity;
  if (!A || A.played) return;
  const close = el('button', { class: 'btn', type: 'button', text: '等一下再玩', onclick: () => { S.game = null; openBoard(); } });
  if (A.kind === 'fortune' || A.kind === 'xmas') {
    const fortune = A.kind === 'fortune';
    return openModal(el('h2', { text: fortune ? '🏮 新春抽籤' : '🎄 交換禮物' }),
      el('p', { class: 'sub', text: fortune ? '雙手合十，誠心抽一支籤。' : '聖誕樹下有好多禮物，挑一個吧！' }),
      el('div', { class: 'actions' }, close, el('button', {
        class: 'btn primary', type: 'button', text: fortune ? '抽籤' : '拆禮物',
        onclick: async () => activityDone(fortune ? '🏮 新春抽籤' : '🎄 交換禮物', await playActivity({})),
      })));
  }
  if (A.kind === 'riddle') {
    const picks = A.riddles.map(() => -1);
    const rows = A.riddles.map((r, i) => el('div', { class: 'riddle' }, el('p', { class: 'name', text: `${i + 1}. ${r.q}` }),
      el('div', { class: 'actions wrap' }, ...r.c.map((c, k) => el('button', {
        class: 'btn', type: 'button', text: c, 'data-q': String(i),
        onclick: (e) => {
          picks[i] = k;
          for (const b of e.target.parentNode.children) b.classList.toggle('primary', b === e.target);
        },
      })))));
    return openModal(el('h2', { text: '🏮 猜燈謎' }), el('p', { class: 'sub', text: '每題選一個答案，選好按「交答案」。' }), ...rows,
      el('div', { class: 'actions' }, close, el('button', {
        class: 'btn primary', type: 'button', text: '交答案',
        onclick: async () => {
          if (picks.includes(-1)) return toast('還有題目沒選喔');
          activityDone('🏮 猜燈謎', await playActivity({ answers: picks }));
        },
      })));
  }
  if (A.kind === 'boat') {
    // 划龍舟：鼓聲一拍一秒，綠色的格子跑到中間（框框裡）時按「划！」或空白鍵
    const BEAT = 1000;
    const marker = el('div', { class: 'boat-marker' });
    const info = el('p', { class: 'note', text: `0 / ${A.beats}` });
    const g = S.game = { kind: 'boat', start: performance.now() + 1200, hits: 0, lastBeat: -1, done: false, phase: 0, beat: -1 };
    const finish = async () => { g.done = true; activityDone('🐉 划龍舟', await playActivity({ score: g.hits })); };
    g.tap = () => {
      if (g.done || g.beat < 0 || g.beat === g.lastBeat) return;
      g.lastBeat = g.beat;
      if (g.phase >= 0.38 && g.phase <= 0.62) { g.hits++; marker.classList.add('hit'); setTimeout(() => marker.classList.remove('hit'), 150); }
      info.textContent = `打中 ${g.hits} 下`;
    };
    const tick = () => {
      if (g.done || S.game !== g) return;
      const t = performance.now() - g.start;
      g.beat = t < 0 ? -1 : Math.floor(t / BEAT);
      g.phase = t < 0 ? 0 : (t % BEAT) / BEAT;
      marker.style.left = `${g.phase * 100}%`;
      if (g.beat >= A.beats) return finish();
      info.textContent = g.beat < 0 ? '準備……' : `第 ${g.beat + 1} / ${A.beats} 拍・打中 ${g.hits} 下`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return openModal(el('h2', { text: '🐉 划龍舟' }),
      el('p', { class: 'sub', text: '咚！咚！綠色的鼓點跑到中間的框框時按「划！」（電腦可以按空白鍵），每一拍只能按一次。' }),
      el('div', { class: 'boat-track' }, el('div', { class: 'boat-zone' }), marker), info,
      el('div', { class: 'actions' }, el('button', { class: 'btn primary big-btn', type: 'button', text: '🚣 划！', onclick: () => g.tap() })));
  }
  // 中秋烤肉：6 串肉一串一串放上去，從生的變成金黃色就按一下收起來；太晚會烤焦
  const g = S.game = { kind: 'bbq', start: performance.now(), sticks: [], done: false };
  const btns = [];
  for (let i = 0; i < A.sticks; i++) {
    const s0 = i * 700 + Math.floor(Math.random() * 400);
    g.sticks.push({ start: s0, state: 'wait', taken: false, good: false });
    btns.push(el('button', { class: 'btn stick', type: 'button', text: '⬜', onclick: () => takeStick(i) }));
  }
  const info = el('p', { class: 'note', text: '' });
  const stateOf = (st, t) => (st.taken ? (st.good ? 'good' : 'bad') : t < st.start ? 'wait' : t < st.start + 2200 ? 'raw' : t < st.start + 3700 ? 'golden' : 'burnt');
  const LOOK = { wait: '⬜', raw: '🥩', golden: '🍢', burnt: '🔥', good: '✅', bad: '❌' };
  const finish = async () => { g.done = true; activityDone('🥮 中秋烤肉', await playActivity({ score: g.sticks.filter((x) => x.good).length })); };
  function takeStick(i) {
    const st = g.sticks[i], t = performance.now() - g.start;
    if (g.done || st.taken || stateOf(st, t) === 'wait') return;
    st.good = stateOf(st, t) === 'golden';
    st.taken = true;
  }
  g.take = takeStick;
  const tick = () => {
    if (g.done || S.game !== g) return;
    const t = performance.now() - g.start;
    g.sticks.forEach((st, i) => {
      st.state = stateOf(st, t);
      if (st.state === 'burnt') { st.taken = true; st.good = false; st.state = 'bad'; }
      btns[i].textContent = LOOK[st.state];
      btns[i].classList.toggle('primary', st.state === 'golden');
    });
    info.textContent = `烤好 ${g.sticks.filter((x) => x.good).length} 串`;
    if (g.sticks.every((x) => x.taken)) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  openModal(el('h2', { text: '🥮 中秋烤肉' }),
    el('p', { class: 'sub', text: '肉串一串一串放上烤架，變成金黃色的 🍢 就快按下去收起來！太早是生的，太晚會烤焦。' }),
    el('div', { class: 'bbq-grill' }, ...btns), info);
}

/* ---------- 夜市 ---------- */

const NIGHT_EMOJI = { chicken: '🍗', tea: '🧋', tofu: '🍢', oyster: '🍳' };
const RING_PRIZES = [['5 個全中', '紫水晶'], ['3～4 個', '金礦'], ['1～2 個', '飼料 ×10'], ['都沒中', '一顆糖果']];
const stallTitle = (id) => `${STALL_EMOJI[id] || '🏮'} ${S.market.stalls[id].name}`;
async function playMarket(stall, score) {
  try {
    const r = await doAct({ action: 'market', stall, score });
    return r.gained;
  } catch { return null; }
}
function marketDone(id, g) {
  S.game = null;
  if (!g) return closeModal();
  const it = g.item && itemInfo(g.item);
  const text = id === 'goldfish'
    ? (g.score ? `撈到 ${g.score} 隻金魚！帶回家放在倉庫裡。` : '紙網破了，一隻都沒撈到……老闆說下次再來！')
    : `套中 ${g.score} 個！老闆給了你${it ? it.name : ''}${g.qty > 1 ? ` ×${g.qty}` : ''}。`;
  openModal(el('h2', { text: stallTitle(id) }), el('p', { class: 'speech story', text }),
    el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'button', text: '好好玩！', onclick: closeModal })));
}
function openStall(id) {
  const M = S.market;
  if (!M || !S.marketOn) return toast('夜市收攤了');
  const st = M.stalls[id];
  const close = el('button', { class: 'btn', type: 'button', text: '走了', onclick: closeModal });
  if (id === 'goldfish' || id === 'ring') {
    if ((M.played || []).includes(id))
      return openModal(el('h2', { text: stallTitle(id) }), el('p', { class: 'speech', text: '今晚已經玩過了，下個星期六再來！' }),
        el('div', { class: 'actions' }, close));
    const intro = id === 'goldfish'
      ? `一支紙網 ${st.price} 元。金魚停下來發亮的時候撈最準，游來游去的時候撈會跑掉。撈 ${M.goldfishMax} 下紙網就破了，撈到的金魚帶回家。`
      : `${st.price} 元 ${M.ringThrows} 個圈圈。箭頭對到瓶子的時候按「丟！」（電腦可以按空白鍵），套中越多獎品越好。`;
    return openModal(el('h2', { text: stallTitle(id) }), el('p', { class: 'sub', text: intro }),
      id === 'ring' ? el('div', { class: 'list' }, ...RING_PRIZES.map(([a, b]) => el('div', { class: 'row' },
        el('div', { class: 'grow' }, el('div', { class: 'name', text: a }), el('div', { class: 'meta', text: `獎品：${b}` }))))) : null,
      el('p', { class: 'note', text: '每個人每晚可以玩一次' }),
      el('div', { class: 'actions' }, close, el('button', {
        class: 'btn primary', type: 'button', text: `付 ${st.price} 元開始`,
        onclick: () => (S.money < st.price ? toast('錢不夠') : id === 'goldfish' ? playGoldfish() : playRing()),
      })));
  }
  if (id === 'snack') {
    const full = S.energy >= S.energyMax;
    const rows = Object.entries(M.foods).map(([fid, f]) => el('div', { class: 'row' }, el('span', { class: 'big', text: NIGHT_EMOJI[fid] || '🍽️' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: f.name }), el('div', { class: 'meta', text: `${f.price} 元・體力 +${f.energy}` })),
      el('button', {
        class: 'btn primary', type: 'button', text: '吃', disabled: full || S.money < f.price,
        onclick: async () => {
          try { await doAct({ action: 'market', stall: 'snack', food: fid }); toast(`${NIGHT_EMOJI[fid] || ''} 好好吃！體力 +${f.energy}`); openStall('snack'); } catch {}
        },
      })));
    return openModal(el('h2', { text: stallTitle(id) }),
      el('p', { class: 'sub', text: full ? `體力是滿的（${S.energy}/${S.energyMax}），等累了再來吃吧` : `現在體力 ${S.energy}/${S.energyMax}。夜市小吃比小吃店貴一點，但是很好吃！` }),
      ...rows, el('div', { class: 'actions' }, close));
  }
  // 夜市限定：每週換三樣
  const rows = M.specials.map((sp) => {
    const c = itemInfo(sp.item) || { name: sp.item, icon: 'seed' };
    return el('div', { class: 'row' }, icon(c.icon),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: c.name }),
        el('div', { class: 'meta', text: `${sp.price} 元・這週限定・倉庫有 ${S.items[sp.item] || 0} 個` })),
      el('button', {
        class: 'btn primary', type: 'button', text: '買', disabled: S.money < sp.price,
        onclick: async () => { try { await doAct({ action: 'market', stall: 'special', item: sp.item }); toast(`買了${c.name}！`); openStall('special'); } catch {} },
      }));
  });
  openModal(el('h2', { text: stallTitle(id) }), el('p', { class: 'sub', text: '平常買不到的東西，每個星期換一批。' }), ...rows,
    el('div', { class: 'actions' }, close));
}
// 撈金魚：六隻金魚在水盆裡游，停下來（發亮）的時候點牠就撈到；游的時候點，牠會嚇跑。紙網撈三下就破
function playGoldfish() {
  const M = S.market, tub = el('div', { class: 'tub' });
  const info = el('p', { class: 'note', text: `紙網還能撈 ${M.goldfishMax} 下` });
  const g = S.game = { kind: 'goldfish', dips: 0, caught: 0, done: false, fish: [] };
  const swim = (f) => {
    const a = Math.random() * Math.PI * 2, sp = 22 + Math.random() * 22;
    f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; f.swim = 0.8 + Math.random() * 1.4; f.rest = 0;
  };
  for (let i = 0; i < 6; i++) {
    const f = { x: 12 + Math.random() * 76, y: 18 + Math.random() * 64, vx: 0, vy: 0, swim: 0, rest: 0, gone: false };
    if (Math.random() < 0.4) f.rest = 0.5 + Math.random(); else swim(f);
    f.el = el('button', { class: 'gfish', type: 'button', 'aria-label': '金魚', onclick: () => dip(i) }, icon('fish_goldfish'));
    tub.append(f.el); g.fish.push(f);
  }
  const finish = async () => { g.done = true; marketDone('goldfish', await playMarket('goldfish', g.caught)); };
  function dip(i) {
    const f = g.fish[i];
    if (g.done || f.gone || g.dips >= M.goldfishMax) return;
    g.dips++;
    if (f.rest > 0) { f.gone = true; g.caught++; f.el.classList.add('caught'); }
    else { swim(f); f.vx *= 3; f.vy *= 3; f.swim = 0.6; f.el.classList.add('miss'); setTimeout(() => f.el.classList.remove('miss'), 400); }
    info.textContent = g.dips >= M.goldfishMax ? `紙網破了！撈到 ${g.caught} 隻` : `撈到 ${g.caught} 隻・紙網還能撈 ${M.goldfishMax - g.dips} 下`;
    if (g.dips >= M.goldfishMax) setTimeout(finish, 700);
  }
  g.dip = dip;
  let last = performance.now();
  const tick = (t) => {
    if (g.done || S.game !== g) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    for (const f of g.fish) {
      if (f.gone) continue;
      if (f.rest > 0) { f.rest -= dt; if (f.rest <= 0) swim(f); }
      else {
        f.x += f.vx * dt; f.y += f.vy * dt; f.swim -= dt;
        if (f.x < 8 || f.x > 92) { f.vx = -f.vx; f.x = Math.max(8, Math.min(92, f.x)); }
        if (f.y < 12 || f.y > 88) { f.vy = -f.vy; f.y = Math.max(12, Math.min(88, f.y)); }
        if (f.swim <= 0) { f.rest = 0.7 + Math.random() * 0.9; f.vx = f.vy = 0; }
      }
      f.el.style.left = `${f.x}%`; f.el.style.top = `${f.y}%`;
      f.el.classList.toggle('rest', f.rest > 0);
      if (f.vx) f.el.classList.toggle('flip', f.vx > 0);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  openModal(el('h2', { text: '🐟 撈金魚' }),
    el('p', { class: 'sub', text: '金魚停下來、身邊發亮的時候點牠！' }), tub, info);
}
// 套圈圈：箭頭在五個瓶子上面左右跑，按「丟！」圈圈就落在箭頭的位置；一個瓶子只能套一次，越丟箭頭跑越快
function playRing() {
  const M = S.market, SPOTS = [0.1, 0.3, 0.5, 0.7, 0.9];
  const bottles = SPOTS.map((p) => { const b = el('span', { class: 'bottle' }); b.style.left = `${p * 100}%`; return b; });
  const arrow = el('div', { class: 'ring-arrow', text: '▼' });
  const info = el('p', { class: 'note', text: `還有 ${M.ringThrows} 個圈圈` });
  const g = S.game = { kind: 'ring', throws: 0, hits: 0, ringed: [], pos: 0.02, dir: 1, done: false, cool: false };
  const finish = async () => { g.done = true; marketDone('ring', await playMarket('ring', g.hits)); };
  g.tap = () => {
    if (g.done || g.cool || g.throws >= M.ringThrows) return;
    g.throws++;
    const hit = SPOTS.findIndex((p, i) => !g.ringed.includes(i) && Math.abs(p - g.pos) <= 0.05);
    if (hit >= 0) { g.ringed.push(hit); g.hits++; bottles[hit].classList.add('ringed'); }
    const mark = el('span', { class: 'ring-drop' + (hit >= 0 ? ' hit' : '') });
    mark.style.left = `${g.pos * 100}%`;
    arrow.parentNode.append(mark); setTimeout(() => mark.remove(), 600);
    info.textContent = `套中 ${g.hits} 個・還有 ${M.ringThrows - g.throws} 個圈圈`;
    g.cool = true; setTimeout(() => { g.cool = false; }, 300);
    if (g.throws >= M.ringThrows) setTimeout(finish, 700);
  };
  let last = performance.now();
  const tick = (t) => {
    if (g.done || S.game !== g) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    g.pos += g.dir * dt * (0.55 + g.throws * 0.08);
    if (g.pos > 0.98) { g.pos = 0.98; g.dir = -1; } else if (g.pos < 0.02) { g.pos = 0.02; g.dir = 1; }
    arrow.style.left = `${g.pos * 100}%`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  openModal(el('h2', { text: '⭕ 套圈圈' }),
    el('p', { class: 'sub', text: '箭頭對到瓶子的時候按「丟！」' }),
    el('div', { class: 'ring-track' }, arrow, ...bottles), info,
    el('div', { class: 'actions' }, el('button', { class: 'btn primary big-btn', type: 'button', text: '⭕ 丟！', onclick: () => g.tap() })));
}

/* ---------- 裝飾與家具 ---------- */

// 傍晚到清晨：路燈、石燈籠會亮
const isEvening = (t) => { const h = new Date(t + 8 * 3600000).getUTCHours(); return h >= 17 || h < 6; };

function openDecoShop() {
  const row = ([id, d]) => el('div', { class: 'row' }, icon('deco_' + id),
    el('div', { class: 'grow' }, el('div', { class: 'name', text: d.name }),
      el('div', { class: 'meta', text: `${d.price} 元・倉庫有 ${S.items['deco:' + id] || 0} 個・擺出去 ${S.decos.filter((x) => x.kind === id).length} 個` })),
    el('button', {
      class: 'btn primary', type: 'button', text: '買', disabled: d.price > S.money,
      onclick: async () => { try { await doAct({ action: 'buy_deco', kind: id }); toast(`買了${d.name}！到倉庫按「擺出去」`); openDecoShop(); } catch {} },
    }));
  const list = Object.entries(S.decoKinds);
  openModal(el('h2', { text: '🪑 裝飾與家具' }),
    el('p', { class: 'sub', text: `錢包 ${S.money.toLocaleString()} 元。買了放在倉庫，按「擺出去」再點一塊地方就擺好了；點擺好的東西可以收起來。` }),
    el('h2', { class: 'section', text: '🌷 牧場的裝飾（擺在草地上）' }), ...list.filter(([, d]) => d.where === 'farm').map(row),
    el('h2', { class: 'section', text: '🛋️ 屋子裡的家具（從廚房走進去）' }), ...list.filter(([, d]) => d.where === 'home').map(row),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '回雜貨店', onclick: openStore })));
}
function startPlacing(kind) {
  const D = S.decoKinds[kind];
  if (D.where !== S.area) return toast(D.where === 'home' ? '家具要到屋子裡擺：點房子（廚房）→「進屋裡」' : '裝飾要回牧場擺在草地上');
  S.placing = { kind };
  closeModal();
  let bar = document.getElementById('place-banner');
  if (!bar) {
    bar = el('div', { id: 'place-banner', class: 'place-banner' });
    document.body.append(bar);
  }
  bar.textContent = '';
  bar.append(el('span', { text: `🪑 點一塊${D.where === 'home' ? '地板' : '草地'}擺「${D.name}」` }),
    el('button', { class: 'btn', type: 'button', text: '取消', onclick: stopPlacing }));
}
function stopPlacing() {
  S.placing = null;
  const bar = document.getElementById('place-banner');
  if (bar) bar.remove();
}
async function placeDeco(x, y) {
  const kind = S.placing.kind;
  if (Math.round(S.me.x) === x && Math.round(S.me.y) === y) return toast('自己站的地方不能擺，往旁邊走一步再擺');
  try { await doAct({ action: 'place_deco', kind, area: S.area, x, y }); } catch { return; }
  toast(`擺好${S.decoKinds[kind].name}了！`);
  stopPlacing();
}
function openDeco(d) {
  const D = S.decoKinds[d.kind] || { name: d.kind };
  openModal(el('div', { class: 'talk-head' }, icon('deco_' + d.kind),
    el('div', { class: 'grow' }, el('h2', { text: D.name }), el('div', { class: 'sub', text: '收起來會放回倉庫，可以再擺到別的地方' }))),
  el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '好', onclick: closeModal }),
    el('button', {
      class: 'btn primary', type: 'button', text: '收起來',
      onclick: async () => { try { await doAct({ action: 'pickup_deco', id: d.id }); toast(`${D.name}收進倉庫了`); closeModal(); } catch {} },
    })));
}

/* ---------- 小鎮修復計畫 ---------- */

const bundleProgress = (bid, B) => Object.entries(B.need).filter(([k, q]) => ((S.projects.given[bid] || {})[k] || 0) >= q).length;
const bundleDone = (bid, B) => bundleProgress(bid, B) === Object.keys(B.need).length;
function projectRows() {
  return Object.entries(S.projects.list).map(([pid, P]) => {
    const done = S.projects.done[pid];
    const nb = Object.entries(P.bundles).filter(([bid, B]) => bundleDone(bid, B)).length;
    return el('div', { class: 'row' + (done ? '' : ' festival') }, el('span', { class: 'big', text: P.emoji }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${P.name}${done ? '：修好了 ✅' : `：清單 ${nb}/${Object.keys(P.bundles).length}`}` }),
        el('div', { class: 'meta', text: done ? P.reward : `${P.area === 'beach' ? '在海邊' : '在小鎮'}・修好以後：${P.reward}` })),
      el('button', { class: 'btn', type: 'button', text: done ? '看看' : '看清單', onclick: () => openProject(pid, openBoard) }));
  });
}
function openProject(pid, back) {
  const P = S.projects.list[pid];
  if (!P) return;
  const done = S.projects.done[pid];
  const backBtn = el('button', { class: 'btn', type: 'button', text: back ? '回告示板' : '關閉', onclick: () => (back ? back() : closeModal()) });
  if (done) {
    const act = pid === 'temple'
      ? el('button', { class: 'btn primary', type: 'button', text: S.projects.prayed ? '今天拜過了' : '🙏 拜拜', disabled: S.projects.prayed, onclick: () => prayTemple(back) })
      : pid === 'station'
        ? el('button', { class: 'btn primary', type: 'button', text: S.projects.onsen ? '今天泡過了' : '♨️ 坐火車去泡溫泉（100 元）',
          disabled: S.projects.onsen || S.energy >= S.energyMax, onclick: () => goOnsen(back) })
        : null;
    return openModal(el('h2', { text: `${P.emoji} ${P.name}` }),
      el('p', { class: 'sub', text: `${done.by ? `${done.by}交了最後一份清單，` : ''}修好了！${P.reward}。` }),
      pid === 'station' && S.energy >= S.energyMax ? el('p', { class: 'note', text: '體力是滿的，等累了再來坐火車' }) : null,
      el('div', { class: 'actions' }, backBtn, act));
  }
  const sections = Object.entries(P.bundles).flatMap(([bid, B]) => {
    const given = S.projects.given[bid] || {};
    const ok = bundleDone(bid, B);
    return [el('h2', { class: 'section', text: `${ok ? '✅' : '📦'} ${B.name}（${bundleProgress(bid, B)}/${Object.keys(B.need).length}）` }),
      ...Object.entries(B.need).map(([k, q]) => {
        const got = Math.min(q, given[k] || 0), have = ingHave(k), c = itemInfo(ingItems(k)[0]) || { icon: 'seed' };
        return el('div', { class: 'row' + (got >= q ? ' off' : '') }, icon(c.icon),
          el('div', { class: 'grow' }, el('div', { class: 'name', text: `${ingName(k)} ${got}/${q}` }),
            el('div', { class: 'meta', text: got >= q ? '交齊了' : `倉庫有 ${have} 個` })),
          got >= q ? null : el('button', {
            class: 'btn primary', type: 'button', text: '交出', disabled: !have,
            onclick: async () => {
              let r;
              try { r = await doAct({ action: 'donate', bundle: bid, item: k }); } catch { return; }
              const g = r.gained;
              toast(g.allDone ? '🎉 小鎮的四個地方都修好了！' : g.projectDone ? `${P.emoji} ${P.name}修好了！` : g.bundleDone ? `📦 「${B.name}」交齊了！` : `交了 ${g.donated} 個${ingName(k)}`);
              openProject(pid, back);
            },
          }));
      })];
  });
  openModal(el('h2', { text: `${P.emoji} ${P.name}（年久失修）` }),
    el('p', { class: 'sub', text: `全家一起把下面三份清單交齊，就能把${P.name}修好。修好以後：${P.reward}。` }),
    ...sections, el('div', { class: 'actions' }, backBtn));
}
async function prayTemple(back) {
  let r;
  try { r = await doAct({ action: 'pray' }); } catch { return; }
  const g = r.gained, it = g.gift && itemInfo(g.gift.item);
  openModal(el('h2', { text: `🏯 今天的運勢：${g.prayer.level}` }), el('p', { class: 'speech story', text: g.prayer.text }),
    el('p', { class: 'note', text: `體力 +15${it ? `，土地公送了${it.name} ×${g.gift.qty}！` : ''}` }),
    el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'button', text: '謝謝土地公', onclick: () => (back ? back() : closeModal()) })));
}
async function goOnsen(back) {
  try { await doAct({ action: 'onsen' }); } catch { return; }
  openModal(el('h2', { text: '♨️ 泡溫泉' }), el('p', { class: 'speech story', text: '小火車搖搖晃晃開進山裡，泡完熱呼呼的溫泉，整個人都輕鬆了！' }),
    el('p', { class: 'note', text: `體力全滿（${S.energy}/${S.energyMax}）` }),
    el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'button', text: '好舒服', onclick: () => (back ? back() : closeModal()) })));
}

/* ---------- 海邊 ---------- */

function tideText() {
  if (S.tide.override) return S.lowTide ? '🏖️ 退潮中' : '🌊 漲潮中';
  const now = serverNow();
  const cur = S.tide.windows.find(([a, b]) => now >= a && now < b);
  if (cur) return `🏖️ 退潮中（${fmtClock(cur[1])} 開始漲潮）`;
  const next = S.tide.windows.find(([a]) => a > now);
  return next ? `🌊 漲潮中（${fmtClock(next[0])} 退潮）` : '🌊 漲潮中';
}
async function pickForage(x, y) {
  let r;
  try { r = await doAct({ action: 'forage', area: S.area, x, y }); } catch { return; }
  const c = itemInfo(r.gained.item);
  floatAt(x, y, `+1 ${c.name}`, '#fff3b0');
  if (r.gained.first) toast(`🎉 第一次撿到${c.name}！圖鑑新增一種`);
}

/* ---------- 後山洞窟 ---------- */

function applyCave(c) {
  S.cave = c;
  S.maps.cave = c.map;
  if (S.area === 'cave') { S.map = c.map; S.H = c.map.length; S.W = c.map[0].length; }
}
// 礦車：第 1 層隨時可以去，第 5、10、15、20 層要全家有人到過
function openMinecart() {
  const I = S.caveInfo;
  openModal(el('h2', { text: '⛏️ 後山洞窟' }),
    el('p', { class: 'sub', text: `洞窟有 ${I.floors} 層，每層每天會長出新的石頭，越深的礦越好，深處還有寶石。有一顆石頭底下藏著往下的梯子；` +
      `有的樓層有寶箱。${I.best ? `全家最深到過第 ${I.best} 層。` : '還沒有人進去過。'}` }),
    el('p', { class: 'note', text: '🚃 礦車可以直接到去過的第 1、5、10、15、20 層。挖一顆石頭花 2 點體力。' }),
    el('div', { class: 'actions wrap' }, ...I.stops.map((f) => el('button', {
      class: 'btn' + (f === 1 || I.best >= f ? ' primary' : ''), type: 'button', disabled: f !== 1 && I.best < f,
      text: f === 1 ? '第 1 層' : I.best >= f ? `🚃 第 ${f} 層` : `🔒 第 ${f} 層`, onclick: () => enterCave(f),
    }))),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '不進去了', onclick: closeModal })));
}
async function enterCave(floor) {
  let r;
  try { r = await doAct({ action: 'cave_go', floor }); } catch { return; }
  applyCave(r.cave);
  S.area = 'cave';
  S.map = S.cave.map; S.H = S.map.length; S.W = S.map[0].length;
  Object.assign(S.me, { x: S.cave.arrive.x, y: S.cave.arrive.y, step: null, path: [], pending: null, d: 'd' });
  S.floats = []; S.fishing = null;
  closeModal();
  sendPos(false);
  toast(S.cave.last ? `⛏️ 洞窟的最深處（第 ${floor} 層）！` : `⛏️ 洞窟第 ${floor} 層`);
}
function leaveCave() { goArea('hill'); }
// 換日或回到視窗：重新拿一次這一層，進不去了（梯子是昨天挖到的）就回地面
async function refreshCave() {
  try {
    const r = await api(`/api/farm/${convId}`, { method: 'POST', body: { action: 'cave_go', floor: S.cave.floor } });
    applyCave(r.cave);
  } catch { goArea('hill'); toast('換了一天，洞窟的石頭都換新了，從入口再進去吧'); }
}
async function openChest() {
  const c = S.cave.chest;
  if (!c || c.opened) return toast('這個寶箱今天已經打開過了，明天再來');
  let r;
  try { r = await doAct({ action: 'cave_chest', floor: S.cave.floor }); } catch { return; }
  const g = r.gained.chest, it = g.item && itemInfo(g.item);
  const got = [g.money ? `${g.money.toLocaleString()} 元` : null, it ? `${it.name}${g.qty > 1 ? ` ×${g.qty}` : ''}` : null].filter(Boolean).join('和');
  openModal(el('h2', { text: g.treasure ? '💎 古老的寶箱' : '🎁 寶箱' }),
    g.treasure ? el('p', { class: 'speech story', text: '箱子上積滿了灰塵，好像幾百年沒有人打開過。你小心翼翼地掀開蓋子……' }) : null,
    el('p', { class: g.treasure ? 'speech' : 'speech story', text: `裡面有${got}！` }),
    it ? el('div', { class: 'row' }, icon(it.icon), el('div', { class: 'grow' }, el('div', { class: 'name', text: it.name }),
      el('div', { class: 'meta', text: `賣 ${it.sell} 元${g.first ? '・圖鑑新增一種！' : ''}` }))) : null,
    el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'button', text: '太好了！', onclick: closeModal })));
}

/* ---------- 比賽：動物選美、豐收比賽（在告示板報名、看結果） ---------- */

const PLACE = ['', '第一名 🥇', '第二名 🥈', '第三名 🥉', '第四名'];
function contestRows() {
  const B = S.beauty, H = S.harvestContest, rows = [];
  if (B) {
    const e = B.entry, l = B.last;
    const can = S.animals.some((a) => !(a.babyUntil > serverNow()));
    rows.push(el('div', { class: 'row' }, el('span', { class: 'big', text: '🎀' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: e ? `動物選美：這週報名了${e.name}` : '動物選美：這週還沒報名' }),
        el('div', { class: 'meta', text: `每週報名一隻，下週一公布名次（愛心越多分數越高）${l ? `・上一次：${l.name}${PLACE[l.place] || ''}` : ''}` })),
      el('button', { class: 'btn' + (e ? '' : ' primary'), type: 'button', text: e ? '換一隻' : '報名', disabled: !can, onclick: openBeauty })));
  }
  if (H) {
    const place = 1 + H.rivals.filter((r) => r.score >= H.count).length;
    rows.push(el('div', { class: 'row' }, el('span', { class: 'big', text: '🌾' }),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `豐收比賽：這一季收成了 ${H.count} 次` }),
        el('div', { class: 'meta', text: `換季的時候比（${H.rivals.map((r) => `${r.owner} ${r.score} 次`).join('、')}）${H.count ? `・現在排${PLACE[place] || ''}` : ''}` }))));
  }
  return rows;
}
function openBeauty() {
  const list = S.animals.filter((a) => !(a.babyUntil > serverNow()));
  const e = S.beauty && S.beauty.entry;
  openModal(el('h2', { text: '🎀 要讓誰參加動物選美？' }),
    el('p', { class: 'sub', text: '評審看動物跟你們有多親（愛心），也看當天的心情。對手：' + S.beauty.rivals.map((r) => `${r.owner}的${r.name}`).join('、') }),
    ...list.map((a) => el('div', { class: 'row' }, icon(`${a.kind}_0`),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${a.name}${e && e.animalId === a.id ? '（已報名）' : ''}` }),
        el('div', { class: 'meta', text: `${(S.animalKinds[a.kind] || {}).name || ''}・${heartsText(a.hearts || 0)}` })),
      el('button', {
        class: 'btn primary', type: 'button', text: '就是牠', disabled: !!e && e.animalId === a.id,
        onclick: async () => { try { await doAct({ action: 'beauty_enter', animalId: a.id }); toast(`🎀 ${a.name}報名了！下週一公布結果`); openBoard(); } catch {} },
      }))),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '回告示板', onclick: openBoard })));
}

/* ---------- 果樹、蜂箱 ---------- */

const treeAt = (spot) => S.trees.find((t) => t.spot === spot);
const treeRipe = (t, now = serverNow()) => !!t && !!t.readyAt && now >= t.readyAt;
// 0 小樹苗（前半段）、1 小樹（後半段）、2 長大了
const treeStage = (t, now) => (now >= t.matureAt ? 2 : now - t.plantedAt < (t.matureAt - t.plantedAt) / 2 ? 0 : 1);
const hiveAt = (spot) => S.hives.find((h) => h.spot === spot);
const hiveReady = (h, now = serverNow()) => !!h && S.season !== 'winter' && now >= h.readyAt;
async function useTree(spot) {
  if (spot < 0) return;
  const t = treeAt(spot);
  if (!t) return openPlantTree(spot);
  if (treeRipe(t)) {
    try {
      const r = await doAct({ action: 'pick', spot });
      const p = S.treeSpots[spot], f = itemInfo(r.gained.item);
      floatAt(p.x, p.y, `+${r.gained.qty} ${f ? f.name : ''}`, '#fff3b0');
      if (r.gained.first) toast(`第一次摘到${f.name}！`);
    } catch {}
    return;
  }
  openTreeInfo(spot);
}
function openPlantTree(spot) {
  const have = Object.keys(S.treeKinds).filter((id) => S.items['sapling:' + id]);
  openModal(el('h2', { text: '🌳 種一棵果樹' }),
    el('p', { class: 'sub', text: have.length ? '種下去之後不用澆水，幾天後長大，季節到了每天都能摘。' : '倉庫裡沒有果樹苗，到攤位買（一年四季都有賣）。' }),
    ...have.map((id) => { const t = S.treeKinds[id]; return el('div', { class: 'row' }, icon(`tree_${id}_0`),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${t.name}苗 ×${S.items['sapling:' + id]}` }),
        el('div', { class: 'meta', text: `${t.days} 天長大・${t.seasons.length === 4 ? '一年四季' : seasonsText(t.seasons)}結果` })),
      el('button', { class: 'btn primary', type: 'button', text: '種這棵', onclick: async () => { try { await doAct({ action: 'plant_tree', spot, tree: id }); toast(`種好了！${t.days} 天後長大`); closeModal(); } catch {} } })); }),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
function openTreeInfo(spot) {
  const t = treeAt(spot), T = S.treeKinds[t.kind], now = serverNow();
  const status = now < t.matureAt ? `還在長大，大約 ${fmtLeft(t.matureAt - now)}後長大`
    : !t.readyAt ? `現在不是它的季節，${seasonsText(T.seasons)}才會結果`
      : `今天摘過了，${fmtClock(t.readyAt)} 之後可以再摘`;
  openModal(el('h2', { text: `🌳 ${T.name}` }), el('p', { class: 'sub', text: status }),
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', text: '把樹移走', onclick: () => {
        openModal(el('h2', { text: `確定要移走${T.name}嗎？` }), el('p', { class: 'sub', text: '移走就沒了，要重新買樹苗種。' }),
          el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '不要', onclick: () => openTreeInfo(spot) }),
            el('button', { class: 'btn primary', type: 'button', text: '移走', onclick: async () => { try { await doAct({ action: 'remove_tree', spot }); toast('樹移走了'); closeModal(); } catch {} } })));
      } }),
      el('button', { class: 'btn primary', type: 'button', text: '好', onclick: closeModal })));
}
async function useHive(spot) {
  if (spot < 0) return;
  const h = hiveAt(spot);
  if (!h) return toast(`這裡可以放蜂箱，到攤位買（${S.hive.price} 元）`);
  if (S.season === 'winter') return toast('冬天蜜蜂在休息，春天再來收 🐝');
  if (!hiveReady(h)) return toast(`蜜蜂正在採蜜，大約 ${fmtLeft(h.readyAt - serverNow())}後有蜂蜜`);
  try {
    const r = await doAct({ action: 'collect_honey', spot });
    const p = S.hiveSpots[spot], f = itemInfo(r.gained.item);
    floatAt(p.x, p.y, `+1 ${f ? f.name : ''}`, '#fff3b0');
    toast(r.gained.first ? `第一次收到${f.name}！🍯` : `收到一罐${f.name} 🍯`);
  } catch {}
}

/* ---------- 加工機、溫室 ---------- */

const machineReady = (m, now = serverNow()) => !!m && !!m.input && now >= m.readyAt;
// 點加工機：好了就直接拿出來；空的就選要放什麼；還在做就看還要多久；還沒買就說去哪裡買
async function useMachine(id) {
  if (!id) return;
  const M = S.machineKinds[id], m = S.machines[id];
  if (!m) return openMachine(id);
  if (machineReady(m)) {
    try {
      const r = await doAct({ action: 'machine_take', machine: id });
      const sp = S.machineSpots[id], got = itemInfo(r.gained.item);
      floatAt(sp.x, sp.y, `+${r.gained.qty} ${got ? got.name : ''}`, '#fff3b0');
      toast(r.gained.first ? `第一次做出${got.name}！放進倉庫了` : `${M.name}做好了：${got.name} ×${r.gained.qty}`);
    } catch {}
    return;
  }
  openMachine(id);
}
function openMachine(id) {
  const M = S.machineKinds[id], m = S.machines[id];
  const head = [el('h2', { text: `⚙️ ${M.name}` })];
  if (!m) {
    const need = Object.entries(M.need).map(([i, q]) => `${(itemInfo(i) || { name: i }).name} ×${q}`).join('、');
    return openModal(...head, el('p', { class: 'sub', text: `這裡可以放${M.name}。到小鎮阿福伯的雜貨店買：${M.price.toLocaleString()} 元＋${need}（礦石在後山挖）。` }),
      el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
  }
  if (m.input) {
    const out = itemInfo(m.output) || { name: m.output, icon: 'seed' };
    const left = m.readyAt - serverNow();
    return openModal(...head,
      el('div', { class: 'row' }, icon(out.icon), el('div', { class: 'grow' }, el('div', { class: 'name', text: `正在做 ${out.name} ×${m.qty}` }),
        el('div', { class: 'meta', text: left > 0 ? `還要 ${fmtLeft(left)}（大約 ${fmtClock(m.readyAt)} 好）` : '做好了！' }))),
      el('div', { class: 'actions' },
        left > 0 ? null : el('button', { class: 'btn primary', type: 'button', text: '拿出來', onclick: () => { closeModal(); useMachine(id); } }),
        el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
  }
  const rows = Object.entries(M.makes).map(([input, good]) => {
    const inf = itemInfo(input) || { name: input, icon: 'seed' }, g = S.goods[good];
    const have = S.items[input] || 0, n = Math.min(have, S.machineBatch);
    return el('div', { class: 'row' + (have ? '' : ' off') }, icon('good_' + good),
      el('div', { class: 'grow' }, el('div', { class: 'name', text: `${inf.name} → ${g.name}` }),
        el('div', { class: 'meta', text: `一個賣 ${g.sell} 元（${inf.name}只賣 ${inf.sell} 元）・倉庫有 ${have} 個` })),
      el('button', {
        class: 'btn primary', type: 'button', text: n ? `放 ${n} 個` : '沒有', disabled: !n,
        onclick: async () => {
          try {
            await doAct({ action: 'machine_put', machine: id, item: input, qty: n });
            toast(`放進去了，${M.hours} 小時後做好 ${g.name} ×${n}`);
            closeModal();
          } catch {}
        },
      }));
  });
  openModal(...head, el('p', { class: 'sub', text: `一次最多放 ${S.machineBatch} 個同一種東西，${M.hours} 小時後一起做好（跟著現實時間，不花體力）。` }),
    ...rows, el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
}
// 還沒蓋的溫室：說明要什麼材料
function openGreenhouseLot() {
  const b = S.builds.greenhouse;
  if (!b) return;
  const need = Object.entries(b.need).map(([i, q]) => `${(itemInfo(i) || { name: i }).name} ${Math.min(S.items[i] || 0, q)}/${q}`).join('、');
  openModal(el('h2', { text: '🌱 溫室預定地' }),
    el('p', { class: 'sub', text: `${b.desc}。到小鎮請阿福伯蓋：${b.price.toLocaleString()} 元，還要 ${need}。礦石在後山的採石場挖。` }),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: '關閉', onclick: closeModal })));
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
  if (S.placing) return S.placing.gear ? placeGear(tx, ty) : placeDeco(tx, ty);
  const me = S.me;
  const cx = Math.round(me.x), cy = Math.round(me.y);
  const ch = terrain(tx, ty);
  // 點到寵物：走到牠旁邊摸摸
  const pk = petAt(fx - 0.5, fy - 0.5);
  if (pk) {
    const p = S.petPos[pk];
    const ax = Math.round(p.x), ay = Math.round(p.y);
    const path = findPath(cx, cy, (x, y) => Math.abs(x - ax) + Math.abs(y - ay) <= 1);
    if (!path) return toast('走不過去');
    me.path = path;
    me.pending = { pet: pk };
    if (!path.length && !me.step) arrive();
    return;
  }
  // 點到馬：走到牠旁邊
  if (S.area === 'farm' && S.horse && !S.horse.rider) {
    const hp = horsePos(serverNow());
    if (Math.hypot(hp.x - (fx - 0.5), hp.y - (fy - 0.5)) < 0.8) {
      const ax = Math.round(hp.x), ay = Math.round(hp.y);
      const path = findPath(cx, cy, (x, y) => Math.abs(x - ax) + Math.abs(y - ay) <= 1);
      if (!path) return toast('走不過去');
      me.path = path;
      me.pending = { horse: true };
      if (!path.length && !me.step) arrive();
      return;
    }
  }
  // 點到動物：走到牠旁邊再跟牠互動
  const an = animalAt(fx - 0.5, fy - 0.5);
  if (an && (S.area === 'farm' || S.area === 'hill')) {
    const p = animalPos(an, serverNow());
    const ax = Math.round(p.x), ay = Math.round(p.y);
    const path = findPath(cx, cy, (x, y) => Math.abs(x - ax) + Math.abs(y - ay) <= 1);
    if (!path) return toast('走不過去');
    me.path = path;
    me.pending = { animal: an.id };
    if (!path.length && !me.step) arrive();
    return;
  }
  // 蟲：走到旁邊揮網
  const bug = bugAt(tx, ty);
  if (bug) {
    const path = findPath(cx, cy, (x, y) => Math.abs(x - bug.x) + Math.abs(y - bug.y) <= 1);
    if (!path) return toast('走不過去');
    me.path = path;
    me.pending = { bug: bug.idx };
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
  // 夜市的攤位：走到攤位前面或旁邊（不要繞到後面，會被遮雨棚擋住）
  const stall = stallAt(tx, ty);
  if (stall) {
    const st = S.market.stalls[stall];
    const front = (x, y) => [[0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => stallAt(x + dx, y + dy) === stall);
    const path = findPath(cx, cy, front) || findPath(cx, cy, (x, y) => stallAt(x, y + 1) === stall);
    if (!path) return toast('走不過去');
    me.path = path;
    me.pending = { stall, x: st.x, y: st.y };
    if (!path.length && !me.step) arrive();
    return;
  }
  // 擺好的裝飾、家具：走到旁邊看看（可以收起來）
  const dk = decoAt(tx, ty);
  if (dk) {
    const path = findPath(cx, cy, (x, y) => Math.abs(x - tx) + Math.abs(y - ty) <= 1);
    if (!path) return toast('走不過去');
    me.path = path;
    me.pending = { x: tx, y: ty, deco: dk.id };
    if (!path.length && !me.step) arrive();
    return;
  }
  // 海邊的貝殼、螃蟹：走過去撿（站在旁邊或上面都可以）
  if (forageAt(tx, ty)) {
    const path = findPath(cx, cy, (x, y) => Math.abs(x - tx) + Math.abs(y - ty) <= 1);
    if (!path) return toast('走不過去');
    me.path = path;
    me.pending = { x: tx, y: ty, forage: true };
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
  const target = TARGETS.includes(ch) || (ch === 'd' && !S.lowTide); // 漲潮的潮間帶是水，可以釣魚
  if (target) {
    // 走到旁邊（上下左右）再面向它動作。房子、攤位、動物小屋好幾格大，
    // 點到中間那格也算：走到這棟建築任何一格的旁邊就好
    const parts = 'FBMYZ'.includes(ch) ? new Set([key(tx, ty)]) : buildingTiles(tx, ty, ch); // 水也是：走到湖邊就好
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
  if (p.horse) return openHorse();
  if (p.bug !== undefined) return catchBug(p.bug);
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
  if (p.pet) {
    const pp = S.petPos[p.pet];
    if (!pp || Math.hypot(pp.x - me.x, pp.y - me.y) > 2.5) return toast('牠跑走了，再點一次');
    me.d = dirTo(me.x, me.y, Math.round(pp.x), Math.round(pp.y));
    return patPet(p.pet);
  }
  if (p.rock) { me.d = dirTo(me.x, me.y, p.x, p.y); return mineRock(p.x, p.y); }
  if (p.deco) { const d = S.decos.find((x) => x.id === p.deco); return d ? openDeco(d) : null; }
  if (p.forage) { if (p.x !== me.x || p.y !== me.y) me.d = dirTo(me.x, me.y, p.x, p.y); return pickForage(p.x, p.y); }
  if (p.stall) {
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nx = Math.round(me.x) + dx, ny = Math.round(me.y) + dy;
      if (stallAt(nx, ny) === p.stall) { me.d = dirTo(me.x, me.y, nx, ny); break; }
    }
    return openStall(p.stall);
  }
  // 面向建築（或湖）裡離自己最近的那一格
  const ch = terrain(p.x, p.y);
  let fx = p.x, fy = p.y;
  for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const nx = Math.round(me.x) + dx, ny = Math.round(me.y) + dy;
    if (terrain(nx, ny) === ch && (ch !== 'F' || (nx === p.x && ny === p.y))) { fx = nx; fy = ny; break; }
  }
  me.d = dirTo(me.x, me.y, fx, fy);
  if (ch === 'W' || ch === 'd') return useOn(fx, fy); // 釣竿拋到面前那一格水
  useOn(p.x, p.y);
}

function update(dt) {
  const me = S.me;
  fishTick();
  const lt = lowTideNow();
  if (lt !== S.lowTide) { S.lowTide = lt; if (S.area === 'beach') toast(lt ? '🏖️ 退潮了！潮間帶可以走過去撿蛤蜊、螃蟹' : '🌊 漲潮了，潮間帶淹起來了'); }
  // 夜市開了／收攤了：村民換地方逛、時鐘旁邊的 🏮
  const mo = marketOpen();
  if (mo !== S.marketOn) {
    S.marketOn = mo;
    for (const id of Object.keys(villagerTiles)) delete villagerTiles[id];
    renderClock();
  }
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
    me.step.t += dt * SPEED * (riding() ? rideSpeed() : 1); // 騎馬走得快
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
      const stepLen = Math.min(dist, dt * SPEED * 1.15 * (o.h ? 2.2 : 1));
      o.x += (dx / dist) * stepLen; o.y += (dy / dist) * stepLen; o.anim += dt;
    } else if (!o.m) o.anim = 0;
  }
  updatePets(dt, serverNow());
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
  ws.send(JSON.stringify({ t: 'pos', x: +S.me.x.toFixed(2), y: +S.me.y.toFixed(2), d: S.me.d, m: moving, a: areaKey(), h: riding() }));
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
      o.tx = ev.x; o.ty = ev.y; o.d = ev.d; o.m = ev.m; o.a = area; o.h = !!ev.h;
    } else if (ev.type === 'farm-mail') {
      // 家人寄信給我：重新拿一次信箱（別人的信看不到）
      if (ev.to === S.meId) loadState().then(() => toast('📮 有人寄信給你，到房子旁邊的信箱看看')).catch(() => {});
    } else if (ev.type === 'farm-horse') {
      S.horse = ev.horse; renderRide();
    } else if (ev.type === 'farm-emote') {
      if (S.emoteList[ev.e]) S.emotes.set(ev.userId, { e: S.emoteList[ev.e], until: performance.now() + 3000 });
    } else if (ev.type === 'farm-leave') {
      S.others.delete(ev.userId);
    } else if (ev.type === 'farm-update') {
      for (const t of ev.tiles) setTile(t, ev.now);
      S.money = ev.money; S.items = ev.items;
      if (ev.animals) S.animals = ev.animals;
      if (ev.town) applyTown(ev.town);
      if (ev.rocks) S.rocks = ev.rocks;
      if (ev.dex) S.dex = ev.dex;
      if (ev.machines) S.machines = ev.machines;
      if (ev.trees) S.trees = ev.trees;
      if (ev.hives) S.hives = ev.hives;
      if (ev.pets) S.pets = ev.pets;
      if (ev.achievements) S.achievements = ev.achievements;
      if (ev.beauty) S.beauty = ev.beauty;
      if (ev.seasonHarvest != null) S.harvestContest.count = ev.seasonHarvest;
      // 家人在同一層挖石頭、開寶箱：這邊的畫面也跟著變
      if (ev.cave && S.cave && ev.cave.floor === S.cave.floor) applyCave(ev.cave);
      if (ev.forage) S.forage = ev.forage;
      if (ev.projects) S.projects = { ...S.projects, ...ev.projects }; // 家人交了東西、修好了地方
      if (ev.decos) S.decos = ev.decos;
      if (ev.gear) S.gear = ev.gear;
      if (ev.notes) S.notes = ev.notes;
      if (ev.bugs) S.bugs = ev.bugs;
      if (ev.net) S.net = true;
      if (ev.giants) S.giants = ev.giants;
      if (ev.snow) S.snow = ev.snow;
      if (ev.graze) S.graze = ev.graze;
      if (ev.horse !== undefined) { S.horse = ev.horse; renderRide(); }
      if (ev.crows) S.crows = ev.crows;
      if (ev.caveBest != null) S.caveInfo.best = ev.caveBest;
      if (ev.by !== S.meId) for (const a of ev.newAchievements || []) toast(`🏆 達成成就「${a.name}」！全家拿到 ${a.reward} 元`);
      if (ev.build) {
        // 家人擴建了房子：伺服器已經幫今天打開過牧場的人加了體力
        const add = (ev.build.energyMax || S.energyMax) - S.energyMax;
        applyBuild(ev.build);
        if (add > 0) S.energy += add;
      }
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
// 32×32 的新圖（img.hd = 2）畫在地圖上一樣佔一格：兩個像素算一個單位；比較高的圖（樹）往上多畫 img.oy 個像素
const rawDraw = g.drawImage.bind(g);
g.drawImage = (img, ...a) => (img && img.hd && a.length === 2
  ? rawDraw(img, a[0], a[1] - (img.oy || 0) / img.hd, img.width / img.hd, img.height / img.hd)
  : rawDraw(img, ...a));
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
  if (S.area === 'cave') return caveTileSprite(ch === 'X' ? 'X' : '.', (x * 7 + y * 13) % 3);
  if (S.area === 'home') return homeTileSprite(ch === 'X' || ch === 'E' ? ch : '.', (x * 7 + y * 13) % 3);
  if (S.area === 'beach') {
    const v = (x * 7 + y * 13) % 3, fr = Math.floor(Date.now() / 700) % 2;
    if (ch === 's' || ch === 'P' || ch === 'k') return beachTileSprite(ch, v);
    if (ch === 'd') return beachTileSprite(S.lowTide ? 'dl' : 'dh', v, fr);
    if (ch === 'W') return beachTileSprite('W', v, fr);
  }
  if (S.area === 'gh') {
    // 溫室裡：玻璃牆、石板地，田不會跟著季節變色
    if (ch === 'K' || ch === '.') return ghTileSprite(ch);
    if (ch === ',') return sprite('flowers');
  }
  if (ch === '=' || ch === 'E') return sprite('path');
  if (ch === 'p' || (S.area === 'town' && (ch === 'O' || ch === 'N'))) return sprite('plaza'); // 噴水池、布告欄底下也是石板，不會露出一塊草地
  if (ch === 'q') return sprite('gravel');
  if (ch === ',') return sprite('flowers', undefined, false, S.season);
  if (ch === 'W') return sprite(Math.floor(Date.now() / 600) % 2 ? 'water1' : 'water0');
  if (ch === 'r') return paddySprite((x * 7 + y * 13) % 3, Math.floor(Date.now() / 900) % 2);
  if (ch === 'F') {
    const t = S.tiles.get(key(x, y));
    if (t && t.tilled) return sprite(wet(t, serverNow()) ? 'soil_wet' : 'soil_dry');
    return sprite('field', undefined, false, S.area === 'gh' ? '' : S.season);
  }
  return sprite('grass' + ((x * 7 + y * 13) % 3), undefined, false, S.season);
}
// 小路旁邊的草地（草尖垂到路上）：哪些格子算草地、四個方向、哪些地方有草地
const GRASSY = ['.', ',', 'T'];
const FRINGE = [[0, -1, 'top'], [0, 1, 'bottom'], [-1, 0, 'left'], [1, 0, 'right']];
const OUTDOOR_GRASS = (area) => area !== 'cave' && area !== 'home' && area !== 'beach' && area !== 'gh';
// 柵欄：上右下左哪幾格也是柵欄（1、2、4、8 加起來）
const fenceMask = (x, y) => (terrain(x, y - 1) === 'f' ? 1 : 0) | (terrain(x + 1, y) === 'f' ? 2 : 0) | (terrain(x, y + 1) === 'f' ? 4 : 0) | (terrain(x - 1, y) === 'f' ? 8 : 0);
// 樹：依位置挑一些變成櫻花（春）或紅楓（秋），其他照季節變色
function treeSprite(x, y) {
  const alt = TREE_ALT[S.season];
  return sprite('tree', undefined, false, alt && (x * 5 + y * 3) % 4 === 0 ? alt : S.season);
}

// 下雨：畫面暗一點，加上斜斜的雨絲；多雲：稍微灰一點
function drawWeather(vw, vh) {
  const w = S.weather.today;
  if (S.area === 'gh') return; // 溫室裡淋不到雨
  if (snowHere()) { drawSnow(vw, vh); return; } // 冬天的山上：下雨變下雪
  if (w === 'cloud') { g.fillStyle = 'rgba(90,100,115,0.14)'; g.fillRect(0, 0, vw, vh); return; }
  const t = performance.now() / 1000;
  if (w === 'cold') {
    // 寒流：畫面偏藍、飄著小雪
    g.fillStyle = 'rgba(170,200,240,0.18)'; g.fillRect(0, 0, vw, vh);
    const n = Math.round((vw * vh) / (dpr * dpr) / 5000);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < n; i++) {
      const y = ((i * 0.4142 + t * (0.08 + ((i * 0.618) % 1) * 0.06)) % 1) * vh;
      const x = (((i * 0.7548) % 1) * vw + Math.sin(t + i) * 12 * dpr + vw) % vw;
      g.fillRect(x, y, 2.5 * dpr, 2.5 * dpr);
    }
    return;
  }
  if (!wetSky(w)) return;
  // 下雨；颱風更暗、雨更大、被風吹得更斜
  const ty = w === 'typhoon';
  g.fillStyle = ty ? 'rgba(25,35,60,0.35)' : 'rgba(40,60,95,0.2)';
  g.fillRect(0, 0, vw, vh);
  const n = Math.round((vw * vh) / (dpr * dpr) / (ty ? 1400 : 3500));
  const slant = ty ? 0.6 + Math.sin(t * 0.7) * 0.15 : 0.12;
  g.strokeStyle = ty ? 'rgba(200,215,245,0.7)' : 'rgba(210,225,255,0.6)';
  g.lineWidth = 1.2 * dpr;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = (ty ? 1.6 : 0.9) + ((i * 0.618) % 1) * 0.6;
    const y = (((i * 0.4142 + t * sp) % 1) * (vh + 40 * dpr)) - 20 * dpr;
    const x = ((i * 0.7548) % 1) * (vw + 60 * dpr + vh * slant) - y * slant;
    g.moveTo(x, y);
    g.lineTo(x - 14 * slant * dpr - 3 * dpr, y + 14 * dpr);
  }
  g.stroke();
}
// 元旦、跨年、春節的晚上：天上放煙火（溫室裡看不到）
const fireworks = [];
function drawFireworks(vw, vh, now) {
  const hour = new Date(now + 8 * 3600000).getUTCHours();
  if (S.area === 'gh' || !['newyear', 'nye', 'spring'].includes(S.festival) || !(hour >= 19 || hour < 1)) return;
  const t = performance.now();
  if (fireworks.length < 5 && Math.random() < 0.05) {
    const cols = ['#ff5a5a', '#ffd84a', '#7ad0ff', '#b98cff', '#7dff9a'];
    fireworks.push({ x: (0.15 + Math.random() * 0.7) * vw, y: (0.1 + Math.random() * 0.3) * vh, born: t, col: cols[Math.floor(Math.random() * cols.length)] });
  }
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const f = fireworks[i], age = (t - f.born) / 1400;
    if (age > 1) { fireworks.splice(i, 1); continue; }
    g.fillStyle = f.col; g.globalAlpha = 1 - age;
    for (let ring = 0; ring < 2; ring++) {          // 兩圈：外圈大、內圈小，往下掉一點
      const n = ring ? 14 : 22, rr = (ring ? 55 : 110) * age * dpr, size = (ring ? 3 : 4.5) * dpr;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.2;
        g.fillRect(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr + age * age * 40 * dpr, size, size);
      }
    }
  }
  g.globalAlpha = 1;
}

// 夜市的燈泡：從第一攤拉到最後一攤，攤位中間的電線往下垂一點
const STALL_EMOJI = { goldfish: '🐟', ring: '⭕', snack: '🍗', special: '🎁' };
const BULB_COLORS = ['#ff5a4a', '#ffd84a', '#7ee06a', '#5ac8ff'];
let bulbCache = null;
function marketBulbs() {
  if (bulbCache) return bulbCache;
  const st = Object.values(S.market.stalls).sort((a, b) => a.x - b.x);
  // 靠在一起的攤位（中間沒有房子）拉同一條電線
  const groups = [];
  for (const s of st) {
    const g = groups[groups.length - 1], prev = g && g[g.length - 1];
    if (prev && s.x - (prev.x + (prev.w || 2)) <= 2) g.push(s); else groups.push([s]);
  }
  const out = [];
  let i = 0;
  for (const g of groups) {
    const x0 = g[0].x * T + 1, x1 = (g[g.length - 1].x + (g[g.length - 1].w || 2)) * T - 2, y0 = g[0].y * T - 14;
    const poles = g.flatMap((s) => [s.x * T + 2, (s.x + (s.w || 2)) * T - 2]);
    for (let x = x0; x <= x1; x += 6, i++) {
      // 在攤位上面是平的，攤位跟攤位之間垂下來
      const left = poles.filter((p) => p <= x).pop(), right = poles.find((p) => p > x);
      const inGap = poles.indexOf(left) % 2 === 1 && right != null;
      const sag = inGap ? Math.round(Math.sin(Math.PI * (x - left) / (right - left)) * 5) : 0;
      out.push({ x, y: y0 + sag, c: BULB_COLORS[i % BULB_COLORS.length] });
    }
  }
  return (bulbCache = out);
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
  g.fillStyle = S.area === 'cave' ? '#0c0a09' : '#2b7a33'; // 洞窟外面是一片黑
  g.fillRect(0, 0, vw, vh);
  g.imageSmoothingEnabled = false;
  g.setTransform(k, 0, 0, k, -camX, -camY);

  const x0 = Math.max(0, Math.floor(camX / (T * k)) - 1), x1 = Math.min(S.W - 1, Math.ceil((camX + vw) / (T * k)) + 1);
  const y0 = Math.max(0, Math.floor(camY / (T * k)) - 1), y1 = Math.min(S.H - 1, Math.ceil((camY + vh) / (T * k)) + 1);
  const now = serverNow();
  const blink = Math.floor(Date.now() / 400) % 2;
  const spraying = Math.floor(Date.now() / 1000) % 6 === 0; // 灑水器每 6 秒噴一下水

  // 地面
  const snowy = snowHere();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const ch0 = terrain(x, y);
    g.drawImage(baseSprite(x, y, ch0), x * T, y * T);
    if ((ch0 === '=' || ch0 === 'E') && OUTDOOR_GRASS(S.area)) { // 小路旁邊是草地：草尖垂到路上，不會切得方方正正
      for (const [dx, dy, side] of FRINGE) if (GRASSY.includes(terrain(x + dx, y + dy))) g.drawImage(sprite('fringe_' + side, undefined, false, snowy ? 'snow' : S.season), x * T, y * T);
    }
    if (ch0 === 'W' && OUTDOOR_GRASS(S.area)) { // 池塘靠岸的那一側：淺淺的水花
      for (const [dx, dy, side] of FRINGE) if (terrain(x + dx, y + dy) !== 'W') g.drawImage(sprite('shore_' + side), x * T, y * T);
    }
    if (snowy && (ch0 === '.' || ch0 === ',' || ch0 === 'T' || ch0 === 'w')) g.drawImage(snowCoverSprite((x * 7 + y * 3) % 3), x * T, y * T); // 下雪的山上白白一片
  }
  // 作物與物件
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ch = terrain(x, y);
      if (ch === 'T') g.drawImage(snowy ? sprite('tree', undefined, false, 'snow') : treeSprite(x, y), x * T, y * T); // 下雪的山上：樹頂積雪
      else if (ch === 'w') g.drawImage(snowmanSprite(S.snow.day, S.snow.parts, S.snow.nose), x * T, y * T - 8);
      else if (ch === 'e') g.drawImage(teaBushSprite(S.season), x * T, y * T);
      else if (ch === 'n') g.drawImage(sprite('familyboard_' + Math.min(6, S.notes.length)), x * T, y * T);
      else if (ch === 'x') g.drawImage(mailboxSprite(S.mail.unread > 0), x * T, y * T);
      else if (ch === '^' || ch === 'v') g.drawImage(caveLadderSprite(ch === 'v'), x * T, y * T);
      else if (ch === 'C') g.drawImage(chestSprite(!!(S.cave && S.cave.chest && S.cave.chest.opened)), x * T, y * T);
      else if (ch === 'f') g.drawImage(sprite('fence_' + fenceMask(x, y)), x * T, y * T); // 柵欄跟旁邊的柵欄接起來
      else if (ch === 'B') g.drawImage(sprite('bin'), x * T, y * T);
      else if (ch === 'N') g.drawImage(sprite('board'), x * T, y * T);
      else if (ch === 'Y') {
        const sp = S.treeSpots.findIndex((p) => p.x === x && p.y === y), t = treeAt(sp);
        g.drawImage(t ? fruitTreeSprite(t.kind, treeStage(t, now), treeRipe(t, now)) : treeSpotSprite(), x * T, y * T);
      } else if (ch === 'Z') {
        const h = hiveAt(S.hiveSpots.findIndex((p) => p.x === x && p.y === y));
        g.drawImage(h ? hiveSprite(hiveReady(h, now), blink) : hiveSpotSprite(), x * T, y * T);
      } else if (ch === 'M') {
        const id = machineAt(x, y), m = id && S.machines[id];
        g.drawImage(m ? machineSprite(id, !!m.input && !machineReady(m, now), blink) : machineSpotSprite(), x * T, y * T);
      }
      const rk = rockAt(x, y);
      if (rk) g.drawImage(sprite('ore_' + rk.type), x * T, y * T);
      else if (ch === 'F' || ch === 'r') {
        const t = S.tiles.get(key(x, y));
        const gr = gearAt(x, y);
        if (gr) { g.drawImage(gearSprite(gr.kind, spraying && gr.kind !== 'scarecrow' ? 1 : 0), x * T, y * T); continue; }
        if (t && t.tilled && t.fert) g.drawImage(sprite('fertdots_' + t.fert), x * T, y * T);
        if (t && t.crop && !inGiant(x, y)) {
          const st = stage(t, now);
          g.drawImage(cropSprite(t.crop, st), x * T, y * T);
          if (st === 3 && blink) g.drawImage(sprite('sparkle'), x * T, y * T);
        }
      }
    }
  }
  // 灑水器噴水的時候，澆到的田冒出小水珠；今天烏鴉來偷吃過的地方站著一隻烏鴉
  if (spraying) for (const gr of S.gear) if (terrain(gr.x, gr.y) === 'F') for (const c of gearCovers(gr)) g.drawImage(sprite('spray'), c.x * T, c.y * T);
  if (S.area === 'farm') for (const c of S.crows) g.drawImage(crowSprite(blink), c.x * T, c.y * T - 2);
  // 地毯平平的，畫在地上
  for (const d of S.decos) if (d.area === S.area && (S.decoKinds[d.kind] || {}).flat) g.drawImage(decoSprite(d.kind), d.x * T, d.y * T);
  // 蟲：會飛的飄來飄去、在地上的腳動一動；螢火蟲會發光（光畫在夜色上面）
  const bt = Date.now(), bugGlow = [];
  for (const b of bugsHere()) {
    const B = S.bugKinds[b.kind] || {};
    const ph = (b.x * 7 + b.y * 13 + b.idx * 5) % 10;
    const ox = B.fly ? Math.sin(bt / 700 + ph) * 3 : 0, oy = B.fly ? Math.cos(bt / 500 + ph) * 2 - 3 : 0;
    const fr = Math.floor(bt / (B.fly ? 160 : 450) + ph) % 2;
    if (B.glow) bugGlow.push({ x: b.x * T + 7 + ox, y: b.y * T + 10 + oy, c: '#e8f67a', r: 6 + 2.5 * Math.sin(bt / 300 + ph) });
    g.drawImage(bugSprite(b.kind, fr), Math.round(b.x * T + ox), Math.round(b.y * T + oy));
  }
  // 撿得到的東西（海邊、後山、小鎮）
  for (const f of S.forage[S.area] || []) {
    if (f.tidal && !S.lowTide) continue;
    if (f.item.startsWith('forage:tea')) { g.drawImage(teaBudsSprite(f.item === 'forage:tea_summer'), f.x * T, f.y * T); continue; } // 茶樹冒新芽
    g.drawImage(sprite('forage_' + f.item.slice(7)), f.x * T, f.y * T + (Math.floor(Date.now() / 500 + f.x) % 2));
  }
  // 巨大作物：佔 3×3，畫一顆放大的作物和影子
  if (S.area === 'farm') for (const gi of S.giants) {
    g.fillStyle = 'rgba(40,30,20,0.25)'; g.beginPath(); g.ellipse((gi.x + 1.5) * T, (gi.y + 2.7) * T, T * 1.4, T * 0.35, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(cropSprite(gi.crop, 3), gi.x * T - 2, gi.y * T - 6, T * 3 + 4, T * 3 + 4);
    if (blink) g.drawImage(sprite('sparkle'), (gi.x + 2) * T, gi.y * T);
  }
  // 好幾格大的建築：每一棟在它左上角那一格畫一次
  const ground = SEASON_GROUND[S.season];
  let homes = 0;
  for (let y = 0; y < S.H; y++) {
    for (let x = 0; x < S.W; x++) {
      const ch = terrain(x, y);
      if (!BIG[ch] || terrain(x - 1, y) === ch || terrain(x, y - 1) === ch) continue;
      const img = PROJECT_AT[ch] ? projectSprite(PROJECT_AT[ch], !!S.projects.done[PROJECT_AT[ch]]) : ch === 'V' ? caveMouthSprite() : ch === 'H' ? houseSprite(ground, S.houseLevel) : ch === 'S' ? shopSprite() : ch === 'A' ? barnSprite(ground)
        : ch === 'J' ? greenhouseSprite(S.ghBuilt, ground)
        : ch === 'G' ? storeSprite() : ch === 'R' ? eaterySprite() : ch === 'Q' ? homeSprite(homes++)
        : ch === 'b' ? smithSprite(Math.floor(Date.now() / 400) % 2)
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
    if (TARGETS.includes(terrain(fx, fy)) || rockAt(fx, fy) || stallAt(fx, fy) || forageAt(fx, fy)) g.drawImage(sprite('cursor'), fx * T, fy * T);
  }

  // 角色：依 y 排序，後面的先畫
  const people = [{ ...me, color: S.myColor, mine: true, moving: !!me.step }];
  for (const [id, o] of S.others) if ((o.a || 'farm') === areaKey()) people.push({ ...o, id, moving: Math.hypot(o.tx - o.x, o.ty - o.y) > 0.01 });
  const beasts = S.animals.filter((a) => animalArea(a) === S.area).map((a) => ({ a, ...animalPos(a, now) }));
  // 沒人騎的時候，馬在動物小屋和池塘中間的路上走來走去
  if (S.area === 'farm' && S.horse && !S.horse.rider) beasts.push({ a: { kind: 'horse', name: S.horse.name }, ...horsePos(now) });
  // 寵物也一起排前後（畫法跟動物一樣，名字底下標 🐾）
  if (S.area === 'farm') for (const [k, pet] of Object.entries(S.pets)) {
    const p = S.petPos[k];
    if (p) beasts.push({ a: { kind: k, name: pet.name + (p.follow ? ' 🐾' : ''), pet: true }, x: p.x, y: p.y, moving: p.moving, flip: p.flip, sleep: p.sleep });
  }
  // 小鎮的村民也一起排前後，用跟家人一樣的小人圖、各自的衣服和髮色
  if (S.area === 'town' && S.villagersOut) {
    for (const id of Object.keys(S.villagers)) {
      const v = S.villagers[id], vp = villagerPos(id, now);
      people.push({ x: vp.x, y: vp.y, d: vp.d, moving: vp.moving, anim: now / 1000, color: v.color, hair: v.hair, name: v.name, villager: id });
    }
  }
  // 夜市的攤位也一起排前後：站在攤位後面的人會被遮雨棚擋住
  const stalls = S.area === 'town' && S.marketOn ? Object.entries(S.market.stalls).map(([id, st]) => ({ id, ...st })) : [];
  const decosHere = S.decos.filter((d) => d.area === S.area && !(S.decoKinds[d.kind] || {}).flat);
  const sprites = [...people.map((p) => ({ p, y: p.y })), ...beasts.map((b) => ({ b, y: b.y })), ...stalls.map((st) => ({ st, y: st.y })),
    ...decosHere.map((d) => ({ d, y: d.y - 0.01 }))].sort((u, v) => u.y - v.y);
  const spin = Math.floor(Date.now() / 300) % 2;
  for (const it of sprites) {
    if (it.d) {
      g.drawImage(decoSprite(it.d.kind, it.d.kind === 'windmill' ? spin : 0), it.d.x * T, it.d.y * T);
    } else if (it.st) {
      g.drawImage(stallSprite(it.st.id), it.st.x * T, it.st.y * T - 12);
    } else if (it.p) {
      const p = it.p;
      const frame = p.moving ? Math.floor(p.anim * 6) % 2 : 0;
      const dir = p.d === 'l' ? 'r' : p.d;
      const onHorse = p.mine ? riding() : !!p.h;
      if (onHorse) g.drawImage(sprite(`horse_${frame}`, undefined, p.d === 'l'), p.x * T, p.y * T - 1);
      g.drawImage(sprite(`char_${dir}${frame}`, p.color, p.d === 'l', p.hair || ''), p.x * T, p.y * T - (onHorse ? 11 : 5));
    } else {
      const b = it.b;
      const frame = b.moving ? Math.floor(Date.now() / 220) % 2 : 0;
      const img = sprite(`${b.a.kind}_${frame}`, undefined, b.flip);
      if (b.a.babyUntil > now) g.drawImage(img, b.x * T + 3, b.y * T + 3, 10, 10); // 寶寶小一號
      else g.drawImage(img, b.x * T, b.y * T - 2);
    }
  }
  // 表情泡泡：頭上冒 3 秒
  const tnow = performance.now();
  for (const p of people) {
    const em = !p.villager && S.emotes.get(p.mine ? S.meId : p.id);
    if (!em || em.until < tnow) continue;
    const bx = p.x * T + 8, by = p.y * T - 19; // 名字的上面
    g.fillStyle = '#3a2a1c'; g.fillRect(bx - 8, by - 7, 16, 13); g.fillRect(bx - 2, by + 6, 4, 2);
    g.fillStyle = '#ffffff'; g.fillRect(bx - 7, by - 6, 14, 11); g.fillRect(bx - 1, by + 5, 2, 2);
    g.font = '9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(em.e, bx, by);
  }

  // 攤位之間拉一條電線，掛著紅黃綠的小燈泡（晚上會亮）
  const bulbs = [...(stalls.length ? marketBulbs() : []),
    ...decosHere.filter((d) => (S.decoKinds[d.kind] || {}).light && (S.area === 'home' || isEvening(now))).map((d) => ({ x: d.x * T + 7, y: d.y * T + 3, c: '#ffd884' })), ...bugGlow];
  if (stalls.length) {
    const mb = marketBulbs();
    g.fillStyle = '#2b2421';
    for (const b of mb) g.fillRect(b.x - 2, b.y - 2, 5, 1);
    for (const b of mb) { g.fillStyle = b.c; g.fillRect(b.x, b.y, 2, 2); }
  }

  // 文字（名字、飄字）用螢幕座標畫，字才清楚
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (S.area === 'cave') {
    const lx = (me.x + 0.5) * T * k - camX, ly = (me.y + 0.3) * T * k - camY;
    const flick = 1 + Math.sin(performance.now() / 180) * 0.03;
    const grad = g.createRadialGradient(lx, ly, T * k * 1.8, lx, ly, T * k * 6.5 * flick);
    grad.addColorStop(0, 'rgba(8,6,12,0)'); grad.addColorStop(1, 'rgba(8,6,12,0.78)');
    g.fillStyle = grad; g.fillRect(0, 0, vw, vh);
    g.fillStyle = 'rgba(255,190,90,0.07)'; g.beginPath(); g.arc(lx, ly, T * k * 2.2, 0, Math.PI * 2); g.fill();
  }
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
  // 洞窟入口、梯子的牌子
  const sign = (x, y, label) => {
    const w = g.measureText(label).width + 10 * dpr;
    const sx = (x + 0.5) * T * k - camX, sy = (y * T + 2) * k - camY;
    g.fillStyle = 'rgba(122,78,45,.9)'; g.fillRect(sx - w / 2, sy - 13 * dpr, w, 16 * dpr);
    g.fillStyle = '#fff'; g.fillText(label, sx, sy);
  };
  if (S.area === 'hill') for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++)
    if (terrain(x, y) === 'V' && terrain(x - 1, y) !== 'V' && terrain(x, y - 1) !== 'V') sign(x + 0.5, y, '⛏️ 洞窟');
  if (S.area === 'beach') {
    const label = tideText();
    g.font = `bold ${Math.round(13 * dpr)}px sans-serif`;
    const w = g.measureText(label).width + 16 * dpr, ty = (S.padTop || 0) * dpr + 22 * dpr;
    g.fillStyle = 'rgba(30,60,90,.85)'; g.fillRect(vw / 2 - w / 2, ty - 16 * dpr, w, 22 * dpr);
    g.fillStyle = '#e8f6fb'; g.fillText(label, vw / 2, ty);
    g.font = `bold ${Math.round(11 * dpr)}px sans-serif`;
  }
  if (S.area === 'cave' && S.cave) {
    sign(S.cave.up.x, S.cave.up.y, '🪜 回地面');
    if (S.cave.ladder) sign(S.cave.ladder.x, S.cave.ladder.y, `⬇️ 第 ${S.cave.floor + 1} 層`);
    // 現在在第幾層（畫面上方中間）
    const label = S.cave.last ? `⛏️ 洞窟最深處・第 ${S.cave.floor} 層` : `⛏️ 洞窟第 ${S.cave.floor} 層`;
    g.font = `bold ${Math.round(13 * dpr)}px sans-serif`;
    const w = g.measureText(label).width + 16 * dpr, ty = (S.padTop || 0) * dpr + 22 * dpr;
    g.fillStyle = 'rgba(30,24,20,.85)'; g.fillRect(vw / 2 - w / 2, ty - 16 * dpr, w, 22 * dpr);
    g.fillStyle = '#ffe08a'; g.fillText(label, vw / 2, ty);
    g.font = `bold ${Math.round(11 * dpr)}px sans-serif`;
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
    const label = (!b.a.pet && animalReady(b.a, now) ? (PRODUCT_EMOJI[b.a.product] || '✨') + ' ' : '') + b.a.name + (b.sleep ? ' 💤' : '');
    const w = g.measureText(label).width + 6 * dpr;
    const ready = !b.a.pet && animalReady(b.a, now);
    g.fillStyle = ready ? 'rgba(255,250,235,.92)' : 'rgba(43,36,33,.45)';
    g.fillRect(sx - w / 2, sy - 12 * dpr, w, 13 * dpr);
    g.fillStyle = ready ? '#2b2421' : '#fff';
    g.fillText(label, sx, sy - 2 * dpr);
  }
  // 夜市攤位的招牌（今晚玩過的打勾）
  for (const st of stalls) {
    const label = `${(S.market.played || []).includes(st.id) ? '✓ ' : ''}${STALL_EMOJI[st.id] || '🏮'} ${st.name}`;
    const sx = (st.x + 1) * T * k - camX, sy = (st.y * T - 13) * k - camY;
    const w = g.measureText(label).width + 8 * dpr;
    g.fillStyle = 'rgba(122,40,30,.92)'; g.fillRect(sx - w / 2, sy - 12 * dpr, w, 14 * dpr);
    g.fillStyle = '#ffe9a8'; g.fillText(label, sx, sy - 1 * dpr);
  }
  // 果樹熟了、蜂箱有蜜：上面冒出小牌子
  if (S.area === 'farm') {
    const tag = (x, y, label) => {
      const sx = (x + 0.5) * T * k - camX, sy = (y * T - 1) * k - camY;
      const w = g.measureText(label).width + 6 * dpr;
      g.fillStyle = 'rgba(255,250,235,.92)'; g.fillRect(sx - w / 2, sy - 12 * dpr, w, 13 * dpr);
      g.fillStyle = '#2b2421'; g.fillText(label, sx, sy - 2 * dpr);
    };
    for (const t of S.trees) if (treeRipe(t, now)) { const p = S.treeSpots[t.spot]; tag(p.x, p.y, `✨ ${(S.fruits[S.treeKinds[t.kind].fruit] || {}).name || ''}`); }
    for (const h of S.hives) if (hiveReady(h, now)) { const p = S.hiveSpots[h.spot]; tag(p.x, p.y, '🍯'); }
  }
  // 加工機：做好了冒出「✨ 美乃滋 ×3」，還在做的小小顯示 ⏳
  if (S.area === 'farm') {
    for (const [id, sp] of Object.entries(S.machineSpots)) {
      const m = S.machines[id];
      if (!m || !m.input) continue;
      const ready = machineReady(m, now), out = itemInfo(m.output);
      const label = ready ? `✨ ${out ? out.name : ''} ×${m.qty}` : '⏳';
      const sx = (sp.x + 0.5) * T * k - camX, sy = (sp.y * T - 1) * k - camY;
      const w = g.measureText(label).width + 6 * dpr;
      g.fillStyle = ready ? 'rgba(255,250,235,.92)' : 'rgba(43,36,33,.45)';
      g.fillRect(sx - w / 2, sy - 12 * dpr, w, 13 * dpr);
      g.fillStyle = ready ? '#2b2421' : '#fff';
      g.fillText(label, sx, sy - 2 * dpr);
    }
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
  if (tint && S.area !== 'cave' && S.area !== 'home') { g.fillStyle = tint; g.fillRect(0, 0, vw, vh); }
  // 夜市的燈泡在暗暗的天色裡發光
  if (bulbs.length) {
    g.globalCompositeOperation = 'lighter';
    for (const b of bulbs) {
      const sx = (b.x + 1) * k - camX, sy = (b.y + 1) * k - camY, rr = (b.r || 6) * k;
      const grad = g.createRadialGradient(sx, sy, 0, sx, sy, rr);
      grad.addColorStop(0, b.c + '88'); grad.addColorStop(1, b.c + '00');
      g.fillStyle = grad; g.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }
  if (S.area !== 'cave' && S.area !== 'home') { drawWeather(vw, vh); drawFireworks(vw, vh, now); drawMeteors(vw, vh); }
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
  if (e.key === 'Escape') { S.game = null; if (S.placing) stopPlacing(); return closeModal(); }
  if (S.game && (S.game.kind === 'boat' || S.game.kind === 'ring') && e.key === ' ') { e.preventDefault(); return S.game.tap(); }
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
    } else if (S.area === 'farm') {
      // 動物只在牧場：在後山、溫室、洞窟按空白鍵不會碰到牧場裡同一個位置的動物
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
$('btn-emote').addEventListener('click', openEmotes);
$('btn-photo').addEventListener('click', takePhoto);
$('btn-ride').addEventListener('click', toggleRide);
$('hud-clock').addEventListener('click', openForecast);
// 從聊天室開的新視窗直接關掉；直接打開網址的話回聊天室
$('btn-close').addEventListener('click', () => {
  if (window.opener) window.close();
  else location.href = '/';
});
addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  loadState().then(() => { if (S.area === 'cave') refreshCave(); }).catch(() => {});
});

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
    walkable, areaKey,
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
