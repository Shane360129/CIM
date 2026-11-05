// 家族小牧場：地圖、作物、成長與體力規則（純函式，伺服器與單元測試共用）
//
// 設計重點：
// - 全家共用一座牧場（一個聊天室一座），錢與倉庫共用，體力每人各自計算
// - 跟現實時間走：作物只在「土是濕的」那段時間成長，澆一次水保濕 24 小時，
//   所以早上出門前澆水、晚上回家收成；忘了澆水只會暫停成長，不會枯死
// - 不需要計時器：成長量一律用時間戳算出來，免費方案很省

const HOUR = 3600000;

// 地形：T 樹、. 草地、= 小路、F 田、f 柵欄、H 房子、S 商店、B 出貨箱、W 池塘
export const FARM_MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TT......T....................T',
  'T..HHHH.........SS....T......T',
  'T..HHHH.........SS......WWW..T',
  'T..HHHH..B..............WWWW.T',
  'T....=..................WWW..T',
  'T....=================.......T',
  'T....=...............=.......T',
  'T..ffffffffffffffff..=.......T',
  'T..fFFFFFFFFFFFFFFf..=.....T.T',
  'T..fFFFFFFFFFFFFFFf..=.......T',
  'T..fFFFFFFFFFFFFFFf..=.......T',
  'T.TfFFFFFFFFFFFFFFf..=.......T',
  'T..fFFFFFFFFFFFFFFf..=.......T',
  'T..fFFFFFFFFFFFFFFf..=....T..T',
  'T..fffffff..fffffff..=.......T',
  'T....=...............=.......T',
  'T....=================.......T',
  'T...........T................T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
export const FARM_W = FARM_MAP[0].length;
export const FARM_H = FARM_MAP.length;
export const FARM_SPAWN = { x: 5, y: 5 }; // 家門口
const WALKABLE = new Set(['.', '=', 'F']);

// 作物：種子價、賣價、需要「濕土」幾小時才成熟
export const CROPS = {
  bokchoy: { name: '小白菜', seed: 20, sell: 45, hours: 3 },
  carrot: { name: '紅蘿蔔', seed: 40, sell: 110, hours: 10 },
  strawberry: { name: '草莓', seed: 80, sell: 260, hours: 30 },
};

export const ENERGY_MAX = 60;
export const ENERGY_COST = { till: 2, dig: 1, plant: 1, water: 1, harvest: 0 };
export const WATER_HOURS = 24;
export const START_MONEY = 500;
export const START_ITEMS = { 'seed:bokchoy': 9 };

export const terrainAt = (x, y) => (FARM_MAP[y] && FARM_MAP[y][x]) || 'T';
export const isField = (x, y) => terrainAt(x, y) === 'F';
export const isWalkable = (x, y) => WALKABLE.has(terrainAt(x, y));

export const cropTotalMs = (crop) => CROPS[crop].hours * HOUR;

// 作物到 now 為止長了多少（毫秒）。只有 [tick_at, min(now, watered_until)] 這段算數；
// scale 是時間倍率，只在本機測試時設定（正式環境永遠是 1）
export function grownMs(tile, now, scale = 1) {
  if (!tile || !tile.crop || !CROPS[tile.crop]) return 0;
  const from = tile.tick_at || now;
  const wetEnd = Math.min(now, tile.watered_until || 0);
  const gained = Math.max(0, wetEnd - from) * scale;
  return Math.min(cropTotalMs(tile.crop), (tile.progress_ms || 0) + gained);
}

// 0 種子、1 發芽、2 長大中、3 可以收成
export function cropStage(tile, now, scale = 1) {
  if (!tile || !tile.crop || !CROPS[tile.crop]) return -1;
  const total = cropTotalMs(tile.crop);
  const g = grownMs(tile, now, scale);
  if (g >= total) return 3;
  return Math.min(2, Math.floor((g / total) * 3));
}

export const isWet = (tile, now) => !!tile && (tile.watered_until || 0) > now;
export const waterUntil = (now, scale = 1) => now + (WATER_HOURS * HOUR) / scale;

// 台灣時間的日期，體力每天 00:00 恢復
export const taiwanDay = (now) => new Date(now + 8 * HOUR).toISOString().slice(0, 10);

// 現實月份對應季節（目前只顯示，之後作物會分季節）
export function seasonOf(now) {
  const m = new Date(now + 8 * HOUR).getUTCMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}
