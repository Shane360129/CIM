// 家族小牧場：地圖、作物、成長與體力規則（純函式，伺服器與單元測試共用）
//
// 設計重點：
// - 全家共用一座牧場（一個聊天室一座），錢與倉庫共用，體力每人各自計算
// - 跟現實時間走：作物只在「土是濕的」那段時間成長，澆一次水保濕 24 小時，
//   所以早上出門前澆水、晚上回家收成；忘了澆水只會暫停成長，不會枯死
// - 四季跟著台灣的月份走，每一季商店賣的種子不一樣；下雨天整天自動幫田地澆水
// - 不需要計時器：成長量一律用時間戳算出來，免費方案很省

const HOUR = 3600000;
const DAY = 24 * HOUR;
const TW = 8 * HOUR; // 台灣時間 UTC+8

// 地形：T 樹、. 草地、= 小路、F 田、f 柵欄、H 房子、S 商店、B 出貨箱、W 池塘、A 動物小屋
// 動物小屋下面用柵欄圍了一塊草地給雞和牛散步，左邊 (22,13) 是門
export const FARM_MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TT......T....................T',
  'T..HHHH.........SS....T......T',
  'T..HHHH.........SS......WWW..T',
  'T..HHHH..B..............WWWW.T',
  'T....=..................WWW..T',
  'T....=================.......T',
  'T....=...............=.AAAA..T',
  'T..ffffffffffffffff..=.AAAA..T',
  'T..fFFFFFFFFFFFFFFf..=fAAAAffT',
  'T..fFFFFFFFFFFFFFFf..=f.....fT',
  'T..fFFFFFFFFFFFFFFf..=f.....fT',
  'T.TfFFFFFFFFFFFFFFf..=f.....fT',
  'T..fFFFFFFFFFFFFFFf..=......fT',
  'T..fFFFFFFFFFFFFFFf..=f.....fT',
  'T..fffffff..fffffff..=f.....fT',
  'T....=...............=fffffffT',
  'T....=================.......T',
  'T...........T................T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
// 動物活動的範圍（柵欄裡面）
export const PEN = { x0: 23, y0: 10, x1: 27, y1: 15 };
export const PEN_GATE = { x: 22, y: 13 };
export const FARM_W = FARM_MAP[0].length;
export const FARM_H = FARM_MAP.length;
export const FARM_SPAWN = { x: 5, y: 5 }; // 家門口
const WALKABLE = new Set(['.', '=', 'F']);

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const ALL = SEASONS;

// 作物：種子價、賣價、需要「濕土」幾小時才成熟、哪幾季能買能種。
// regrow：收成後不用重種，再長幾個小時又能收（番茄、茄子、玉米、草莓）。
// 季節換了，已經種下的作物會繼續長完，只是商店不賣、也不能再種。
export const CROPS = {
  bokchoy: { name: '小白菜', seed: 20, sell: 45, hours: 3, seasons: ALL },
  spinach: { name: '菠菜', seed: 25, sell: 60, hours: 4, seasons: ['winter', 'spring'] },
  radish: { name: '白蘿蔔', seed: 30, sell: 85, hours: 7, seasons: ['winter'] },
  sweetpotato: { name: '地瓜', seed: 30, sell: 90, hours: 8, seasons: ['autumn'] },
  potato: { name: '馬鈴薯', seed: 40, sell: 100, hours: 9, seasons: ['spring'] },
  carrot: { name: '紅蘿蔔', seed: 40, sell: 110, hours: 10, seasons: ['autumn', 'winter', 'spring'] },
  eggplant: { name: '茄子', seed: 50, sell: 55, hours: 15, regrow: 5, seasons: ['summer', 'autumn'] },
  cabbage: { name: '高麗菜', seed: 60, sell: 180, hours: 20, seasons: ['winter'] },
  tomato: { name: '番茄', seed: 60, sell: 50, hours: 12, regrow: 4, seasons: ['spring', 'summer'] },
  corn: { name: '玉米', seed: 80, sell: 80, hours: 18, regrow: 6, seasons: ['summer', 'autumn'] },
  strawberry: { name: '草莓', seed: 80, sell: 90, hours: 30, regrow: 10, seasons: ['winter', 'spring'] },
  pumpkin: { name: '南瓜', seed: 100, sell: 360, hours: 36, seasons: ['autumn'] },
  watermelon: { name: '西瓜', seed: 120, sell: 420, hours: 40, seasons: ['summer'] },
  pineapple: { name: '鳳梨', seed: 150, sell: 520, hours: 48, seasons: ['summer'] },
};
export const inSeason = (crop, season) => !!CROPS[crop] && CROPS[crop].seasons.includes(season);

// 動物：在動物小屋買，買的時候幫牠取名字。每天餵一次飼料，過幾個小時就有雞蛋／牛奶可以收。
// 每天摸摸、餵飯會讓牠更喜歡你（愛心），愛心夠多，產品會變成高級的（比較值錢）。
// 沒餵只是那天沒有產品，不會生病、也不會跑掉。
export const ANIMALS = {
  chicken: { name: '雞', price: 300, max: 6, hours: 4, product: 'egg', best: 'egg_l' },
  cow: { name: '牛', price: 1200, max: 4, hours: 6, product: 'milk', best: 'milk_l' },
};
export const PRODUCTS = {
  egg: { name: '雞蛋', sell: 50 },
  egg_l: { name: '大顆雞蛋', sell: 80 },
  milk: { name: '牛奶', sell: 100 },
  milk_l: { name: '濃醇牛奶', sell: 160 },
};
export const FEED_PRICE = 10;      // 一包飼料，一隻動物吃一天
export const LOVE_MAX = 20;        // 每 4 點一顆愛心，最多 5 顆
export const LOVE_BEST = 12;       // 3 顆愛心以上，產品變高級
export const hearts = (love) => Math.floor(Math.min(LOVE_MAX, Math.max(0, love || 0)) / 4);
export const productOf = (kind, love) => (love >= LOVE_BEST ? ANIMALS[kind].best : ANIMALS[kind].product);
// 餵完之後產品什麼時候好（scale 一樣只給本機測試）
export const animalReadyAt = (a, scale = 1) => (a.fed_at || 0) + (ANIMALS[a.kind].hours * HOUR) / scale;
export const animalHasProduct = (a, now, scale = 1) => !!a.fed_at && !a.collected && now >= animalReadyAt(a, scale);

// 動物名字：去掉前後空白與控制字元，1～8 個字
export function cleanAnimalName(raw) {
  const s = [...String(raw || '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '').trim()];
  if (!s.length || s.length > 8) return null;
  return s.join('');
}

export const ENERGY_MAX = 60;
export const ENERGY_COST = { till: 2, dig: 1, plant: 1, water: 1, harvest: 0, feed: 1, pet: 0, collect: 0 };
export const WATER_HOURS = 24;
export const START_MONEY = 500;
export const START_ITEMS = { 'seed:bokchoy': 9 };

export const terrainAt = (x, y) => (FARM_MAP[y] && FARM_MAP[y][x]) || 'T';
export const isField = (x, y) => terrainAt(x, y) === 'F';
export const isWalkable = (x, y) => WALKABLE.has(terrainAt(x, y));

export const cropTotalMs = (crop) => CROPS[crop].hours * HOUR;
// 會再長的作物收成後，成長量退回到「還差 regrow 小時」
export const regrowProgressMs = (crop) => (CROPS[crop] && CROPS[crop].regrow
  ? cropTotalMs(crop) - CROPS[crop].regrow * HOUR : null);

// 台灣時間的日期，體力每天 00:00 恢復
export const taiwanDay = (now) => new Date(now + TW).toISOString().slice(0, 10);
// 這一天（台灣時間）結束的那一刻，也就是隔天 00:00
export const dayEndOf = (t) => Math.floor((t + TW) / DAY) * DAY + DAY - TW;

// 現實月份對應季節：3～5 春、6～8 夏、9～11 秋、12～2 冬
function seasonOfMonth(m) {
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}
export const seasonOf = (now) => seasonOfMonth(new Date(now + TW).getUTCMonth() + 1);
// 下一季從哪一天開始（台灣時間），HUD 顯示「還有幾天換季」用
export function nextSeasonStart(now) {
  const d = new Date(now + TW);
  const m = d.getUTCMonth(); // 0～11
  const nextM = [2, 5, 8, 11].find((x) => x > m) ?? 14; // 3/1、6/1、9/1、12/1，或明年 3/1
  return Date.UTC(d.getUTCFullYear(), nextM, 1) - TW;
}

// 天氣：每天（台灣時間）一種，全部牧場同一個天氣，由日期算出來（不用存、不用排程，
// 前後一致，所以可以有「明天的天氣預報」）。下雨天整天，所有翻好的土都是濕的。
export const WEATHERS = ['sun', 'cloud', 'rain'];
const RAIN_PCT = { spring: 30, summer: 25, autumn: 12, winter: 20 }; // 春天梅雨、夏天午後雷陣雨
const CLOUD_PCT = { spring: 25, summer: 20, autumn: 25, winter: 30 };
function hashDay(day) {
  let h = 2166136261;
  for (const ch of day + '|farm-weather') { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function weatherOf(day) {
  const season = seasonOfMonth(Number(day.slice(5, 7)));
  const r = hashDay(day) % 100;
  if (r < RAIN_PCT[season]) return 'rain';
  if (r < RAIN_PCT[season] + CLOUD_PCT[season]) return 'cloud';
  return 'sun';
}
export const realRain = (day) => weatherOf(day) === 'rain';
export const NO_RAIN = () => false;

// from～to 之間，土是濕的總共多久：澆水保濕的那段 [from, wateredUntil]，加上下雨的日子。
// need：只要知道「夠不夠長滿」時，超過就提早停（作物最多長 48 小時，不會一路算一整年）
export function wetMsBetween(from, to, wateredUntil, rainy = NO_RAIN, need = Infinity) {
  let total = 0;
  for (let t = from, guard = 0; t < to && total < need && guard < 2000; guard++) {
    const end = Math.min(to, dayEndOf(t));
    total += rainy(taiwanDay(t)) ? end - t : Math.max(0, Math.min(end, wateredUntil) - t);
    t = end;
  }
  return total;
}

// 作物到 now 為止長了多少（毫秒）。只有 tick_at 之後「土是濕的」時間算數；
// scale 是時間倍率，只在本機測試時設定（正式環境永遠是 1）；
// rainy(日期) 回答那天有沒有下雨（伺服器傳真正的天氣，單元測試可以自己指定）
export function grownMs(tile, now, scale = 1, rainy = NO_RAIN) {
  if (!tile || !tile.crop || !CROPS[tile.crop]) return 0;
  const total = cropTotalMs(tile.crop);
  const have = tile.progress_ms || 0;
  if (have >= total) return total;
  const from = tile.tick_at || now;
  const wet = wetMsBetween(from, now, tile.watered_until || 0, rainy, (total - have) / scale);
  return Math.min(total, have + wet * scale);
}

// 0 種子、1 發芽、2 長大中、3 可以收成
export function cropStage(tile, now, scale = 1, rainy = NO_RAIN) {
  if (!tile || !tile.crop || !CROPS[tile.crop]) return -1;
  const total = cropTotalMs(tile.crop);
  const g = grownMs(tile, now, scale, rainy);
  if (g >= total) return 3;
  return Math.min(2, Math.floor((g / total) * 3));
}

// 土從現在起會一直濕到什麼時候（澆水的保濕＋接連下雨的日子），乾的話回傳 0。
// 前端拿這個往後推算作物長大，不用知道過去的天氣
export function wetUntilOf(wateredUntil, now, rainy = NO_RAIN) {
  let end = now;
  for (let guard = 0; guard < 60; guard++) {
    if (wateredUntil > end) end = wateredUntil;
    else if (rainy(taiwanDay(end))) end = dayEndOf(end);
    else break;
  }
  return end > now ? end : 0;
}

export const isWet = (tile, now, rainy = NO_RAIN) => !!tile && wetUntilOf(tile.watered_until || 0, now, rainy) > now;
export const waterUntil = (now, scale = 1) => now + (WATER_HOURS * HOUR) / scale;
