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

// 地形：T 樹、. 草地、= 小路、F 田、f 柵欄、H 房子、S 商店、B 出貨箱、W 池塘、A 動物小屋、E 往小鎮的出口、
// J 溫室（蓋好之後點它走進去）、M 加工機的位置（攤位下面到池塘一排七台）、
// Y 種果樹的位置（最下面一排）、Z 放蜂箱的位置（左下角）、n 家庭留言板（房子右邊）
// 動物小屋下面用柵欄圍了一塊草地給雞和牛散步，左邊 (22,13) 是門；左下角的小路走出去是小鎮，
// 動物小屋右邊 (29,7) 走出去是後山
export const FARM_MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TT......T.JJJJJ..............T',
  'T..HHHH.n.JJJJJ.SS....T......T',
  'T..HHHH...JJJJJ.SS......WWW..T',
  'T..HHHH..B.......MMMMMMMWWWW.T',
  'T....=..................WWW..T',
  'T....=================.......T',
  'T....=...............=.AAAA..E',
  'T..ffffffffffffffff..=.AAAA..T',
  'T..fFFFFFFFFFFFFFFf..=fAAAAffT',
  'T..fFFFFFFFFFFFFFFf..=f.....fT',
  'T..fFFFFFFFFFFFFFFf..=f.....fT',
  'T.TfFFFFFFFFFFFFFFf..=f.....fT',
  'T..fFFFFFFFFFFFFFFf..=......fT',
  'T..fFFFFFFFFFFFFFFf..=f.....fT',
  'T..fffffff..fffffff..=f.....fT',
  'T....=...............=fffffffT',
  'T.ZZZ=================.......T',
  'T....=.Y.Y..T.Y.Y.Y.Y.Y.Y.Y.YT',
  'TTTTTETTTTTTTTTTTTTTTTTTTTTTTT',
];
// 動物活動的範圍（柵欄裡面）
export const PEN = { x0: 23, y0: 10, x1: 27, y1: 15 };
export const PEN_GATE = { x: 22, y: 13 };
export const FARM_W = FARM_MAP[0].length;
export const FARM_H = FARM_MAP.length;
export const FARM_SPAWN = { x: 5, y: 5 }; // 家門口

// 小鎮：G 阿福伯的雜貨店、R 美玲姐的小吃店、Q 民宅、p 廣場石板、O 噴水池、N 委託告示板、, 花圃、E 回牧場、b 阿鐵師傅的鐵匠鋪
export const TOWN_MAP = [
  'TTTTTETTTTTTTTTTTTTTTTTTTTTTTT',
  'T....=.......................T',
  'T.UU.=..GGGG......RRRR.II.bb.T',
  'T.UU.=..GGGG......RRRR.II.bb.T',
  'T....=..GGGG......RRRR.......T',
  'T....========================T',
  'T..............=.............T',
  'T..,,,...pppppppppppp...,,,..T',
  'T..,,,...pNpppppppppp...,,,..T',
  'T........pppppOOppppp........E',
  'T........pppppOOppppp........T',
  'T........pppppppppppp........T',
  'T..............=.............T',
  'T...======================...T',
  'T..QQQ......QQQ......QQQ.LL..T',
  'T..QQQ......QQQ......QQQ.LL..T',
  'T............................T',
  'T..,,,..T........,,,....T....T',
  'T............................T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
// 後山：左上是湖（釣魚），右上是採石場 q（每天會冒出新的石頭和礦石），左邊 E 回牧場
export const HILL_MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T..T......T.....qqqqqqqqqqqq.T',
  'T.......T.......qqqqqqqqqqqq.T',
  'T...WWWWWW......qqqqqqqqqqqq.T',
  'T..WWWWWWWW.....qqqqqqqqqqqq.T',
  'T..WWWWWWWWW....qqqqqqqqqqqq.T',
  'T..WWWWWWWWW....qqqqqqqqqqqq.T',
  'T...WWWWWWW.....=..........TTT',
  'T....WWWWW......=....T....VV.T',
  'T...............=.........VV.T',
  'T....T..........=......T.....T',
  'E================............T',
  'T.......T....................T',
  'T...........T........T.......T',
  'T..T.........................T',
  'T.......T.........T......T...T',
  'T...T.............,,,........T',
  'T..........T......,,,....T...T',
  'T....T.......................T',
  'TTTTTTTTTTTTTTTETTTTTTTTTTTTTT',
];
// 溫室裡面：K 玻璃牆、F 溫室的田（四季都能種、不會被雨淋到，要自己澆水）、, 盆栽、E 回牧場。
// 溫室田地的座標故意跟牧場的田不重疊（牧場的田在第 9～14 列），所以兩邊的田可以存在同一張表、用 x,y 分得出來
export const GH_MAP = [
  'KKKKKKKKKKKKKKKK',
  'K,............,K',
  'K.FFFFF..FFFFF.K',
  'K.FFFFF..FFFFF.K',
  'K..............K',
  'K.FFFFF..FFFFF.K',
  'K.FFFFF..FFFFF.K',
  'K..............K',
  'K,.....==.....,K',
  'KKKKKKKEKKKKKKKK',
];
// 海邊：從小鎮東邊走過去。左邊是草地，中間沙灘（s），退潮時才走得過去的潮間帶（d），
// 右邊是海（W）；防波堤（P）伸進海裡，站在堤的最前面可以釣到大魚。k 是礁石
export const BEACH_MAP = [
  'TTTTTTTTTTkksssssddddWWWWWWWWW',
  'T......T...sssssssdddWWWWWWWWW',
  'T..,,.......ssssssdddWWWWWWWWW',
  'T..,,......sssssssddddWWWWWWWW',
  'T.....T....sssPPPPPPPPPPPPWWWW',
  'T..........ssssssdddWWWWWWWWWW',
  'T..T..DD...sssssskddWWWWWWWWWW',
  'T.....DD...sssssssdddWWWWWWWWW',
  'T.........ssssssssdddWWWWWWWWW',
  'E=========sssssssssddWWWWWWWWW',
  'T.........ssssssssdddWWWWWWWWW',
  'T...T.....sssssssddddWWWWWWWWW',
  'T..........sssssskdddWWWWWWWWW',
  'T..,,......ssssssdddWWWWWWWWWW',
  'T..,,.....ssssssddddWWWWWWWWWW',
  'T.....T...sssssssdddWWWWWWWWWW',
  'T.........ssssssskddWWWWWWWWWW',
  'T...T......sssssddddWWWWWWWWWW',
  'T..........ssssssdddWWWWWWWWWW',
  'TTTTTTTTTTkksssssddddWWWWWWWWW',
];
// 屋子裡（從廚房走進去）：X 是牆、E 是門
export const HOME_MAP = [
  'XXXXXXXXXXXX',
  'X..........X',
  'X..........X',
  'X..........X',
  'X..........X',
  'X..........X',
  'X..........X',
  'XXXXXEXXXXXX',
];
// 梯田：後山最下面往下走。左上是茶園（e 茶樹，每天可以採茶菁），下面和右邊是一層一層的水田（r，只能種稻子）。
// 水田的座標跟牧場、溫室的田不重疊（田地存在同一張表，用座標分是哪一塊田）
export const TERRACE_MAP = [
  'TTTTTTTTTTTTTTTETTTTTTTTTTTTTT',
  'T..............=.............T',
  'T....T.........=.....T.......T',
  'T..eeeeeeee....=.............T',
  'T..............=.......T.....T',
  'T..eeeeeeee....=.............T',
  'T..............=..T..........T',
  'T..T...........=.............T',
  'T..............=......T......T',
  'T......T.......=.............T',
  'T..............=..........T..T',
  'T..............=..rrrrrrrrrr.T',
  'T..T...........=..rrrrrrrrrr.T',
  'T..............=.............T',
  'T........T.....=.............T',
  'T..rrrrrrrrrr..=..rrrrrrrrrr.T',
  'T..rrrrrrrrrr..=..rrrrrrrrrr.T',
  'T..............=.............T',
  'T....T.........=........T....T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
export const MAPS = { farm: FARM_MAP, town: TOWN_MAP, hill: HILL_MAP, gh: GH_MAP, beach: BEACH_MAP, home: HOME_MAP, terrace: TERRACE_MAP };
export const AREAS = ['farm', 'town', 'hill', 'gh', 'beach', 'home', 'terrace'];
// 即時位置的「在哪裡」：四張地圖，或洞窟的某一層（cave1～cave20）
export const isAreaKey = (a) => AREAS.includes(a) || /^cave([1-9]|1[0-9]|20)$/.test(String(a));
// 走到 E 就換地圖。EXITS：每張地圖的出口通到哪；ARRIVE['從>到']：換過去之後站在哪
export const EXITS = {
  farm: [{ x: 5, y: 19, to: 'town' }, { x: 29, y: 7, to: 'hill' }],
  town: [{ x: 5, y: 0, to: 'farm' }, { x: 29, y: 9, to: 'beach' }],
  beach: [{ x: 0, y: 9, to: 'town' }],
  home: [{ x: 5, y: 7, to: 'farm' }],
  hill: [{ x: 0, y: 11, to: 'farm' }, { x: 15, y: 19, to: 'terrace' }],
  terrace: [{ x: 15, y: 0, to: 'hill' }],
  gh: [{ x: 7, y: 9, to: 'farm' }],
};
// 溫室沒有走進去的出口格：在牧場點溫室（J）就會走進去
export const ARRIVE = {
  'farm>town': { x: 5, y: 1 }, 'town>farm': { x: 5, y: 18 },
  'farm>hill': { x: 1, y: 11 }, 'hill>farm': { x: 28, y: 7 },
  'farm>gh': { x: 7, y: 8 }, 'gh>farm': { x: 12, y: 4 },
  'cave>hill': { x: 26, y: 10 },
  'town>beach': { x: 1, y: 9 }, 'beach>town': { x: 28, y: 9 },
  'farm>home': { x: 5, y: 6 }, 'home>farm': { x: 5, y: 5 },
  'hill>terrace': { x: 15, y: 1 }, 'terrace>hill': { x: 15, y: 18 },
};
const WALKABLE = new Set(['.', '=', 'F', 'p', ',', 'E', 'q', 's', 'P', 'r']);

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
  // 稻子：一期稻作（春）、二期稻作（夏），只能插秧在梯田的水田裡（不用翻土、不用澆水），收成的是稻穀，碾米機碾成白米
  rice: { name: '稻穀', seedName: '秧苗', seed: 40, sell: 110, hours: 36, seasons: ['spring', 'summer'], paddy: true },
};
export const inSeason = (crop, season) => !!CROPS[crop] && CROPS[crop].seasons.includes(season);

// 動物：在動物小屋買，買的時候幫牠取名字。每天餵一次飼料，過幾個小時就有雞蛋／牛奶可以收。
// 每天摸摸、餵飯會讓牠更喜歡你（愛心），愛心夠多，產品會變成高級的（比較值錢）。
// 沒餵只是那天沒有產品，不會生病、也不會跑掉。
// 鴨子在池塘那一帶游泳（zone: 'pond'），其他的在柵欄裡
export const ANIMALS = {
  chicken: { name: '雞', price: 300, max: 6, hours: 4, product: 'egg', best: 'egg_l', baby: '小雞' },
  duck: { name: '鴨', price: 600, max: 6, hours: 5, product: 'duck_egg', best: 'duck_egg_l', baby: '小鴨', zone: 'pond' },
  cow: { name: '牛', price: 1200, max: 4, hours: 6, product: 'milk', best: 'milk_l', baby: '小牛' },
  sheep: { name: '羊', price: 2000, max: 4, hours: 10, product: 'wool', best: 'wool_l', baby: '小羊' },
};
// 鴨子活動的範圍：池塘和旁邊的草地（池塘正中間的水格太遠，點不到，不算）
export const POND_ZONE = { x0: 23, y0: 2, x1: 28, y1: 6 };
export const PRODUCTS = {
  egg: { name: '雞蛋', sell: 50 },
  egg_l: { name: '大顆雞蛋', sell: 80 },
  milk: { name: '牛奶', sell: 100 },
  milk_l: { name: '濃醇牛奶', sell: 160 },
  duck_egg: { name: '鴨蛋', sell: 90 },
  duck_egg_l: { name: '雙黃鴨蛋', sell: 140 },
  wool: { name: '羊毛', sell: 300 },
  wool_l: { name: '高級羊毛', sell: 450 },
  honey: { name: '百花蜜', sell: 200 },
  honey_l: { name: '龍眼蜜', sell: 320 },
};
export const FEED_PRICE = 10;      // 一包飼料，一隻動物吃一天
export const LOVE_MAX = 20;        // 每 4 點一顆愛心，最多 5 顆
export const LOVE_BEST = 12;       // 3 顆愛心以上，產品變高級
export const hearts = (love) => Math.floor(Math.min(LOVE_MAX, Math.max(0, love || 0)) / 4);
export const productOf = (kind, love) => (love >= LOVE_BEST ? ANIMALS[kind].best : ANIMALS[kind].product);
// 動物寶寶：滿愛心（5 顆）的動物收產品時，如果動物小屋還有位子、離上一胎超過一週，就會生一隻寶寶；
// 寶寶 3 天長大，長大前吃飯、摸摸都可以，但還沒有產品
export const BABY_DAYS = 3;
export const BABY_EVERY_DAYS = 7;
export const isBaby = (a, now) => !!a.baby_until && now < a.baby_until;
export const canHaveBaby = (a, now, count, scale = 1) => (a.love || 0) >= LOVE_MAX && !isBaby(a, now) && count < ANIMALS[a.kind].max
  && (!a.last_baby_at || now - a.last_baby_at >= (BABY_EVERY_DAYS * DAY) / scale);
export const babyName = (parent) => [...parent].slice(0, 6).join('') + '寶寶';

// 寵物：小狗、小貓，免費領養（一種一隻）。誰摸牠，牠就跟著誰走（全家看到的一樣）；
// 每天第一次被摸，可能會叼東西回來，愛心越多越常找到、找到的越好
export const PETS = {
  dog: { name: '小狗', emoji: '🐶' },
  cat: { name: '小貓', emoji: '🐱' },
};
// 沒人帶的時候，寵物在家門口這一帶玩
export const PET_ZONE = { x0: 2, y0: 5, x1: 9, y1: 7 };
export function petFind(kind, farmId, day, love, season) {
  const rnd = seededRandom(`${farmId}|${day}|pet|${kind}`);
  const h = hearts(love);
  if (rnd() >= 0.3 + 0.1 * h) return null;
  const seeds = Object.keys(CROPS).filter((c) => inSeason(c, season));
  const list = kind === 'dog'
    ? [['feed', 2, 40], [`seed:${seeds[Math.floor(rnd() * seeds.length)]}`, 1, 25], ['ore:copper', 1, 15], ['fish:junk', 1, 15],
      ['ore:silver', 1, h >= 3 ? 8 : 0], ['ore:gold', 1, h >= 5 ? 3 : 0]]
    : [['fish:tilapia', 1, 40], ['fish:crucian', 1, 25], ['fish:junk', 1, 15], ['fish:catfish', 1, h >= 3 ? 10 : 0], ['fish:goldfish', 1, h >= 5 ? 4 : 0]];
  const id = pickWeighted(list.filter(([, , w]) => w > 0).map(([item, , w]) => ({ id: item, w })), rnd());
  return { item: id, qty: list.find(([item]) => item === id)[1] };
}

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
// 房子擴建之後，每人每天的體力上限變多（1 原本的房子、2 大臥室、3 二樓）
export const HOUSE_ENERGY = [0, 60, 80, 100];
export const energyMaxOf = (houseLevel) => HOUSE_ENERGY[houseLevel] || ENERGY_MAX;
export const ENERGY_COST = { till: 2, dig: 1, plant: 1, water: 1, harvest: 0, feed: 1, pet: 0, collect: 0, fish: 2, mine: 2 };
export const WATER_HOURS = 24;

// ---------------- 果樹、蜂箱 ----------------
// 果樹種一次就好：幾天後長大，之後只要是它的季節，每天可以摘一次（不用澆水）
export const TREE_SPOTS = [[7, 18], [9, 18], [14, 18], [16, 18], [18, 18], [20, 18], [22, 18], [24, 18], [26, 18], [28, 18]]
  .map(([x, y]) => ({ x, y }));
export const HIVE_SPOTS = [[2, 17], [3, 17], [4, 17]].map(([x, y]) => ({ x, y }));
export const TREES = {
  guava: { name: '芭樂樹', fruit: 'guava', price: 600, days: 5, yield: 2, seasons: ALL },
  orange: { name: '柳丁樹', fruit: 'orange', price: 800, days: 6, yield: 3, seasons: ['autumn', 'winter'] },
  mango: { name: '芒果樹', fruit: 'mango', price: 1200, days: 8, yield: 2, seasons: ['summer'] },
  lychee: { name: '荔枝樹', fruit: 'lychee', price: 1000, days: 7, yield: 3, seasons: ['summer'] },
  longan: { name: '龍眼樹', fruit: 'longan', price: 1000, days: 7, yield: 3, seasons: ['summer', 'autumn'] },
};
export const FRUITS = {
  guava: { name: '芭樂', sell: 45 },
  orange: { name: '柳丁', sell: 60 },
  mango: { name: '芒果', sell: 140 },
  lychee: { name: '荔枝', sell: 90 },
  longan: { name: '龍眼', sell: 80 },
};
// 蜂箱：在攤位買，一座牧場最多 3 個；每 3 天可以收一罐蜂蜜，冬天蜜蜂休息不產蜜。
// 牧場有長大的龍眼樹，收到的就是龍眼蜜（比較值錢）
export const HIVE = { price: 1500, max: 3, days: 3 };
export const treeMatureAt = (t, scale = 1, hours = null) => t.planted_at + ((hours ?? TREES[t.kind].days * 24) * HOUR) / scale;
// 下一次可以摘的時間（還沒長大＝長大的時間；摘過＝摘完過一天）；不是它的季節回傳 0
export function treeReadyAt(t, season, scale = 1, hours = null) {
  if (!TREES[t.kind].seasons.includes(season)) return 0;
  const again = t.picked_at ? t.picked_at + ((hours ?? 24) * HOUR) / scale : 0;
  return Math.max(treeMatureAt(t, scale, hours), again);
}
export const hiveReadyAt = (h, scale = 1, hours = null) => (h.collected_at || h.placed_at) + ((hours ?? HIVE.days * 24) * HOUR) / scale;
export const START_MONEY = 500;
export const START_ITEMS = { 'seed:bokchoy': 9 };

export const terrainAt = (x, y, area = 'farm') => (MAPS[area][y] && MAPS[area][y][x]) || 'T';
export const isField = (x, y) => terrainAt(x, y) === 'F';
// 這格田在牧場還是溫室（都不是回傳 null）
export const fieldArea = (x, y) => (terrainAt(x, y) === 'F' ? 'farm' : terrainAt(x, y, 'gh') === 'F' ? 'gh'
  : terrainAt(x, y, 'terrace') === 'r' ? 'terrace' : null);
// 這種作物能不能種在這塊田：稻子只能種水田，水田只能種稻子
export const plantableIn = (crop, area) => !!CROPS[crop] && !!CROPS[crop].paddy === (area === 'terrace');
export const isWalkable = (x, y, area = 'farm') => WALKABLE.has(terrainAt(x, y, area));

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
// typhoon 颱風（7～10 月偶爾來，整天下雨、熟了沒收的作物會被吹倒）、cold 寒流（12～2 月，在外面做事比較累）
export const WEATHERS = ['sun', 'cloud', 'rain', 'typhoon', 'cold'];
const TYPHOON_MONTHS = [7, 8, 9, 10], TYPHOON_PCT = 4;
const COLD_MONTHS = [12, 1, 2], COLD_PCT = 8;
const RAIN_PCT = { spring: 30, summer: 25, autumn: 12, winter: 20 }; // 春天梅雨、夏天午後雷陣雨
const CLOUD_PCT = { spring: 25, summer: 20, autumn: 25, winter: 30 };
function hashDay(day) {
  let h = 2166136261;
  for (const ch of day + '|farm-weather') { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function weatherOf(day) {
  const month = Number(day.slice(5, 7));
  const season = seasonOfMonth(month);
  const h = hashDay(day);
  const special = Math.floor(h / 100) % 100;
  if (TYPHOON_MONTHS.includes(month) && special < TYPHOON_PCT) return 'typhoon';
  if (COLD_MONTHS.includes(month) && special < COLD_PCT) return 'cold';
  const r = h % 100;
  if (r < RAIN_PCT[season]) return 'rain';
  if (r < RAIN_PCT[season] + CLOUD_PCT[season]) return 'cloud';
  return 'sun';
}
export const isWetWeather = (w) => w === 'rain' || w === 'typhoon';
export const realRain = (day) => isWetWeather(weatherOf(day));
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
  const rate = scale * growRate(tile); // 施了速效肥料長得比較快
  const wet = wetMsBetween(from, now, tile.watered_until || 0, rainy, (total - have) / rate);
  return Math.min(total, have + wet * rate);
}
// 有灑水器澆的田：每天都是濕的（跟下雨天一樣）
export const ALWAYS_WET = () => true;

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

// ---------------- 小鎮的村民 ----------------
// 每位村民：喜歡／最愛／討厭的東西（送禮用，不會傳給前端，要自己發現）、生日、白天在哪一帶走動、說的話。
// 說的話依季節、天氣、跟你們家的感情（愛心）變化，每天換一句。
// item 用倉庫的寫法：crop:作物、prod:雞蛋牛奶、fish:魚、ore:礦石、dish:料理、good:加工品
export const VILLAGERS = {
  fu: {
    name: '阿福伯', role: '雜貨店老闆', color: '#3b6ea8', hair: 'gray', birthday: '03-12',
    zone: { x0: 7, y0: 5, x1: 13, y1: 6 },
    loves: ['crop:pumpkin', 'dish:pumpkin_soup'], likes: ['crop:sweetpotato', 'crop:corn', 'prod:egg', 'fish:carp', 'dish:corn_grill', 'good:mayo', 'dish:corn_salad', 'dish:golden_pumpkin', 'fruit:longan', 'prod:honey'], dislikes: ['crop:spinach'],
    lines: {
      any: ['今天要買什麼？鋤頭、澆水壺都有好貨喔。', '年輕人肯種田，阿伯看了就歡喜。', '店裡的東西都是實在價，不會騙你啦。',
        '以前這一帶都是田，現在剩你們家還在種。', '要是田太大澆不完，可以來看看大澆水壺。'],
      spring: ['春天到了，種子賣得特別好。'], summer: ['這麼熱，記得多喝水，別中暑了。'],
      autumn: ['秋天的南瓜最甜，阿伯最愛吃南瓜了。'], winter: ['冬天冷，阿伯的老腰又在痠了。'],
      rain: ['下雨天生意比較清淡，剛好休息一下。'],
      close: ['你們家的菜，阿伯吃過都說讚！', '有空常來坐，阿伯泡茶給你喝。'],
    },
  },
  mei: {
    name: '美玲姐', role: '小吃店老闆娘', color: '#e86a5c', hair: 'brown', birthday: '07-21',
    zone: { x0: 16, y0: 5, x1: 23, y1: 6 },
    loves: ['prod:egg_l', 'dish:bass_soup', 'good:kimchi'], likes: ['crop:cabbage', 'prod:egg', 'crop:bokchoy', 'prod:milk', 'fish:bass', 'dish:tomato_egg', 'dish:kimchi_pot', 'good:salted_greens', 'prod:duck_egg', 'good:salted_egg', 'fruit:orange', 'dish:honey_potato'], dislikes: ['crop:pineapple', 'fruit:guava'],
    lines: {
      any: ['餓了吧？進來吃碗麵，吃飽才有力氣種田！', '我們家的滷肉飯，是我阿母傳下來的味道。', '茶葉蛋剛滷好，香不香？',
        '你們家的雞蛋，拿來做菜最好吃了。', '累了就來店裡坐一下，不用客氣。'],
      spring: ['春天的高麗菜還沒到，好想念喔。'], summer: ['夏天客人都點冰的，我的麵都賣不出去啦。'],
      autumn: ['秋天胃口好，今天的麵多給你一點。'], winter: ['冬天最適合來碗熱騰騰的牛肉麵了。'],
      rain: ['下雨天，客人都想吃熱的。'],
      close: ['你就像我自己的弟弟妹妹一樣。', '下次帶家人一起來，我請客！'],
    },
  },
  jie: {
    name: '小傑', role: '國小三年級', color: '#f2b33d', hair: 'black', birthday: '08-08',
    zone: { x0: 9, y0: 7, x1: 20, y1: 11 },
    loves: ['crop:watermelon', 'dish:pudding', 'dish:pancake', 'bug:rhino_beetle', 'bug:stag_beetle'], likes: ['bug:cicada', 'bug:mantis', 'bug:firefly', 'crop:strawberry', 'crop:corn', 'crop:tomato', 'fish:goldfish', 'ore:amethyst', 'dish:watermelon_juice', 'dish:strawberry_milk', 'dish:fries', 'good:jam_strawberry', 'good:ketchup', 'dish:mango_ice', 'fruit:mango'], dislikes: ['crop:spinach', 'crop:eggplant', 'dish:eggplant', 'good:kimchi'],
    lines: {
      any: ['你好！我今天考試考一百分喔！', '噴水池裡面有硬幣，是誰丟的啊？', '我長大也要當農夫，種好大的西瓜！',
        '你們家的雞會不會咬人？', '老師說要多吃青菜……可是菠菜好難吃。'],
      spring: ['春天的草莓好好吃！'], summer: ['放暑假了！可以一直玩！'],
      autumn: ['開學了……好想放假喔。'], winter: ['好冷喔，可是我不想穿外套。'],
      rain: ['下雨不能踢球，好無聊喔。'],
      close: ['你是我最好的朋友！', '我跟同學說你們家有牛，他們都好羨慕！'],
    },
  },
  ama: {
    name: '王阿嬤', role: '住在鎮上五十年', color: '#8e6bb8', hair: 'gray', birthday: '01-25',
    zone: { x0: 3, y0: 12, x1: 12, y1: 13 },
    loves: ['prod:milk', 'dish:sweetpotato_congee', 'good:pickled_radish', 'dish:caipu_egg', 'prod:wool_l', 'prod:honey_l'], likes: ['crop:radish', 'crop:cabbage', 'crop:sweetpotato', 'crop:bokchoy', 'fish:crucian', 'dish:radish_soup', 'good:salted_greens', 'prod:wool'], dislikes: ['crop:pineapple'],
    lines: {
      any: ['乖孫，有沒有吃飽？', '阿嬤年輕的時候，也是每天天還沒亮就去田裡。', '慢慢來，做田人不要急。',
        '你們家阿嬤身體好嗎？替我問候一下。', '有空多陪陪家裡的人，比賺錢卡要緊。'],
      spring: ['春天到了，又要拜拜了。'], summer: ['天氣熱，要記得戴斗笠喔。'],
      autumn: ['秋天的地瓜，烤起來最香了。'], winter: ['冬天冷，蘿蔔燉湯最補了。'],
      rain: ['下雨了，田裡的菜就不用澆水了，真好。'],
      close: ['你就像阿嬤的親孫一樣。', '阿嬤最喜歡你們家的牛奶，喝了身體都好起來了。'],
    },
  },
  lin: {
    name: '林老師', role: '國小老師', color: '#4f9d6b', hair: 'black', birthday: '09-28',
    zone: { x0: 9, y0: 11, x1: 20, y1: 13 },
    loves: ['crop:strawberry', 'dish:tomato_egg', 'good:cheese_l'], likes: ['crop:tomato', 'crop:carrot', 'crop:potato', 'ore:amethyst', 'dish:strawberry_milk', 'good:cheese', 'good:jam_strawberry', 'dish:cheese_potato', 'fruit:lychee', 'dish:honey_cake'], dislikes: ['crop:corn'],
    lines: {
      any: ['小傑上課又在畫西瓜了，真拿他沒辦法。', '種田跟教書一樣，都要耐心等它長大。', '讀書累了，就來廣場走走。',
        '你們家的番茄好紅，做成番茄炒蛋一定很好吃。', '我小時候也住在鄉下，好懷念喔。'],
      spring: ['春天是讀書的好季節。'], summer: ['暑假不用改作業，好開心。'],
      autumn: ['教師節快到了，學生會送卡片給我呢。'], winter: ['寒假快到了，孩子們都坐不住了。'],
      rain: ['下雨天，最適合在家看書了。'],
      close: ['謝謝你們家一直照顧小傑。', '你們家的草莓，是我吃過最甜的。'],
    },
  },
  zhi: {
    name: '志明', role: '郵差', color: '#2f8f5b', hair: 'black', birthday: '11-19',
    zone: { x0: 5, y0: 5, x1: 28, y1: 6 },
    loves: ['crop:pineapple', 'dish:eel_rice', 'good:jam_pineapple'], likes: ['prod:egg', 'crop:potato', 'crop:watermelon', 'fish:eel', 'dish:pineapple_cake', 'good:kimchi', 'dish:fries', 'fruit:mango', 'dish:orange_juice'], dislikes: ['crop:radish', 'good:pickled_radish'],
    lines: {
      any: ['有你們家的信喔！……騙你的啦，哈哈。', '每天騎車送信，整個鎮我都熟。', '告示板上有大家的委託，有空去看看。',
        '聽說阿福伯的店有賣新的澆水壺。', '送信送到肚子餓，等一下去美玲姐那裡吃飯。'],
      spring: ['春天騎車最舒服了。'], summer: ['夏天騎車，衣服都濕透了。'],
      autumn: ['秋天風好大，信差點被吹走。'], winter: ['冬天的手好冰，信都拿不穩。'],
      rain: ['下雨天還是要送信，這就是郵差的命啦。'],
      close: ['你們家的信，我都第一個送。', '鳳梨是我的最愛，你怎麼知道的？'],
    },
  },
};
export const FRIEND_MAX = 100;          // 每 10 點一顆愛心，最多 10 顆
export const friendHearts = (points) => Math.floor(Math.min(FRIEND_MAX, Math.max(0, points || 0)) / 10);
export const GIFT_POINTS = { love: 8, like: 5, neutral: 2, dislike: -3 };
export const TALK_POINTS = 1;
export const REQUEST_POINTS = 10;
export function giftReaction(villager, item) {
  const v = VILLAGERS[villager];
  if (v.loves.includes(item)) return 'love';
  if (v.likes.includes(item)) return 'like';
  if (v.dislikes.includes(item) || item === 'fish:junk' || item === 'ore:stone') return 'dislike'; // 破鞋子、石頭誰都不要
  if (item.startsWith('dish:') && DISHES[item.slice(5)] && DISHES[item.slice(5)].festival) return 'like'; // 節慶的食物大家都喜歡
  return 'neutral';
}
// 生日那天送禮，喜歡的東西點數三倍
export const isBirthday = (villager, day) => VILLAGERS[villager].birthday === day.slice(5);
export function giftPoints(villager, item, day) {
  const r = giftReaction(villager, baseItem(item));
  const p = GIFT_POINTS[r] > 0 ? GIFT_POINTS[r] + qualityOf(item) : GIFT_POINTS[r]; // 有星級的作物，對方更開心
  return { reaction: r, points: p > 0 && isBirthday(villager, day) ? p * 3 : p };
}
// 感情每到 2、4、6、8、10 顆愛心，村民會送你們家一份謝禮（每一級只送一次）
export function friendReward(villager, level) {
  const v = VILLAGERS[villager];
  const fav = [...v.loves, ...v.likes].find((i) => i.startsWith('crop:')).slice(5);
  return [null,
    { money: 200 }, { item: 'feed', qty: 10 }, { item: `seed:${fav}`, qty: 3 }, { money: 800 }, { money: 2000 }][level];
}

// 村民早上 6 點出門，半夜 12 點回家睡覺（上班族晚上才有空玩，所以晚上還遇得到）
export const villagerOut = (now) => new Date(now + TW).getUTCHours() >= 6;

// 委託告示板：每天一個委託，由日期算出來（全家都看到同一個，也不用存）
const VILLAGER_IDS = Object.keys(VILLAGERS);
export function requestOf(day) {
  let h = 2166136261;
  for (const ch of day + '|farm-request') { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h >>>= 0;
  const season = seasonOfMonth(Number(day.slice(5, 7)));
  const items = [...Object.keys(CROPS).filter((c) => inSeason(c, season)).map((c) => 'crop:' + c), 'prod:egg', 'prod:milk'];
  const item = items[(h >>> 8) % items.length];
  const [kind, id] = item.split(':');
  const sell = kind === 'crop' ? CROPS[id].sell : PRODUCTS[id].sell;
  const qty = Math.max(1, Math.min(5, Math.round(250 / sell)));
  return { villager: VILLAGER_IDS[h % VILLAGER_IDS.length], item, qty, reward: Math.round((sell * qty * 2) / 10) * 10 };
}

// 美玲姐的小吃店：吃了馬上恢復體力（最多到滿）
export const FOODS = {
  egg: { name: '茶葉蛋', price: 30, energy: 10 },
  rice: { name: '滷肉飯', price: 80, energy: 25 },
  noodle: { name: '牛肉麵', price: 150, energy: 50 },
};

// 阿福伯的雜貨店：工具升級（全家共用），升級後一次處理 3×3 的田
export const TOOL_UPGRADES = {
  hoe: { name: '大鋤頭', price: 2500, desc: '一次翻 3×3 九格田' },
  can: { name: '大澆水壺', price: 2000, desc: '一次澆 3×3 九格田' },
};
// 3×3 的範圍，中間那格先做（體力不夠時至少做到點的那一格）
export const area3x3 = (x, y) => [[0, 0], [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
  .map(([dx, dy]) => ({ x: x + dx, y: y + dy }));

// ---------------- 釣魚 ----------------
// 牧場的池塘（pond）和後山的湖（lake）都能釣。什麼魚會上鉤看季節、白天晚上（6～18 點是白天）、下雨、在哪裡釣
export const FISH = {
  tilapia: { name: '吳郭魚', sell: 40, seasons: ALL, where: ['pond', 'lake'], time: 'any', weight: 40 },
  crucian: { name: '鯽魚', sell: 60, seasons: ALL, where: ['pond', 'lake'], time: 'any', weight: 25 },
  catfish: { name: '鯰魚', sell: 100, seasons: ALL, where: ['lake'], time: 'night', weight: 15 },
  carp: { name: '鯉魚', sell: 120, seasons: ['spring', 'summer', 'autumn'], where: ['lake'], time: 'day', weight: 12 },
  sweetfish: { name: '香魚', sell: 150, seasons: ['spring', 'summer'], where: ['lake'], time: 'day', weight: 8 },
  bass: { name: '鱸魚', sell: 180, seasons: ['autumn', 'winter'], where: ['lake'], time: 'any', weight: 8 },
  goldfish: { name: '金魚', sell: 250, seasons: ALL, where: ['pond'], time: 'any', weight: 3 },
  eel: { name: '鰻魚', sell: 300, seasons: ['summer', 'autumn'], where: ['pond', 'lake'], time: 'night', weight: 5 }, // 下雨天白天也有
  junk: { name: '破鞋子', sell: 2, seasons: ALL, where: ['pond', 'lake', 'sea'], time: 'any', weight: 6 },
  // 海魚：在海邊釣（sea），站在防波堤最前面還釣得到大魚（deep）
  mackerel: { name: '鯖魚', sell: 60, seasons: ALL, where: ['sea', 'deep'], time: 'any', weight: 30, sea: true },
  porgy: { name: '黑鯛', sell: 120, seasons: ALL, where: ['sea', 'deep'], time: 'any', weight: 18, sea: true },
  saury: { name: '秋刀魚', sell: 90, seasons: ['autumn'], where: ['sea', 'deep'], time: 'any', weight: 22, sea: true },
  hairtail: { name: '白帶魚', sell: 150, seasons: ['autumn', 'winter'], where: ['sea', 'deep'], time: 'night', weight: 14, sea: true },
  squid: { name: '小卷', sell: 130, seasons: ['spring', 'summer'], where: ['sea', 'deep'], time: 'night', weight: 14, sea: true },
  mullet: { name: '烏魚', sell: 200, seasons: ['winter'], where: ['sea', 'deep'], time: 'any', weight: 12, sea: true },
  octopus: { name: '章魚', sell: 180, seasons: ALL, where: ['sea'], time: 'any', weight: 6, sea: true },
  mahi: { name: '鬼頭刀', sell: 220, seasons: ['spring', 'summer'], where: ['deep'], time: 'day', weight: 12, sea: true },
  grouper: { name: '石斑魚', sell: 400, seasons: ALL, where: ['deep'], time: 'any', weight: 5, sea: true },
  tuna: { name: '黑鮪魚', sell: 2500, seasons: ['spring', 'summer'], where: ['deep'], time: 'day', weight: 1, sea: true },
};
export const FISH_WINDOW_MS = 1500;     // 看到 ❗ 之後幾毫秒內要拉
// 海邊：在防波堤的最前面（x ≥ 24）釣是外海（deep），其他地方是近海（sea）
export const fishSpot = (area, x = 0) => (area === 'farm' ? 'pond' : area === 'hill' ? 'lake' : area === 'beach' ? (x >= 24 ? 'deep' : 'sea') : null);
export const isDaytime = (now) => { const h = new Date(now + TW).getUTCHours(); return h >= 6 && h < 18; };
// 這一刻在這裡可能釣到哪些魚，各自的機會（權重）
export function fishChoices(spot, season, day, rain, goodRod = false) {
  const out = [];
  for (const [id, f] of Object.entries(FISH)) {
    if (!f.where.includes(spot) || !f.seasons.includes(season)) continue;
    let w = goodRod && f.weight <= 6 && id !== 'junk' ? f.weight * 2 : f.weight;
    if (id === 'eel') { if (!day || rain) w *= rain ? 3 : 1; else continue; }
    else if (f.time === 'day' && !day) continue;
    else if (f.time === 'night' && day) continue;
    out.push({ id, w });
  }
  return out;
}
// 依權重抽一條（r 是 0～1 的亂數）
export function pickWeighted(choices, r) {
  const total = choices.reduce((n, c) => n + c.w, 0);
  let x = r * total;
  for (const c of choices) { if ((x -= c.w) < 0) return c.id; }
  return choices[choices.length - 1].id;
}

// ---------------- 挖礦 ----------------
// 後山的採石場每天（台灣時間）冒出 20 顆石頭，位置和種類由「牧場＋日期」算出來，
// 所以全家看到的一樣、隔天換一批。挖掉的記在資料庫（只記當天的）
export const ORES = {
  stone: { name: '石頭', sell: 5, weight: 55 },
  copper: { name: '銅礦', sell: 60, weight: 25 },
  silver: { name: '銀礦', sell: 150, weight: 12 },
  gold: { name: '金礦', sell: 400, weight: 6 },
  amethyst: { name: '紫水晶', sell: 700, weight: 2 },
  jade: { name: '台灣玉', sell: 900, weight: 0, deep: 11 },
  ruby: { name: '紅寶石', sell: 1200, weight: 0, deep: 16 },
  sapphire: { name: '藍寶石', sell: 1200, weight: 0, deep: 16 },
  diamond: { name: '鑽石', sell: 3000, weight: 0, deep: 16 },
};
export const QUARRY = { x0: 16, y0: 1, x1: 27, y1: 6 };
export const ROCKS_PER_DAY = 20;
function seededRandom(seedText) {
  let h = 2166136261;
  for (const ch of seedText) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => { // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function rocksOf(farmId, day) {
  const rnd = seededRandom(`${farmId}|${day}|rocks`);
  const spots = [];
  for (let y = QUARRY.y0; y <= QUARRY.y1; y++) for (let x = QUARRY.x0; x <= QUARRY.x1; x++) spots.push({ x, y });
  const oreList = Object.entries(ORES).map(([id, o]) => ({ id, w: o.weight })).filter((o) => o.w > 0);
  const out = [];
  while (out.length < ROCKS_PER_DAY && spots.length) {
    const p = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
    out.push({ ...p, type: pickWeighted(oreList, rnd()) });
  }
  return out;
}

// ---------------- 加工機、溫室、房子擴建 ----------------
// 加工品：用加工機把雞蛋、牛奶、水果、蔬菜做成更值錢的東西（賣的價錢都超過材料的兩倍）
export const GOODS = {
  mayo: { name: '美乃滋', sell: 130 },
  mayo_l: { name: '高級美乃滋', sell: 210 },
  cheese: { name: '起司', sell: 260 },
  cheese_l: { name: '高級起司', sell: 400 },
  jam_strawberry: { name: '草莓果醬', sell: 240 },
  jam_pineapple: { name: '鳳梨果醬', sell: 1150 },
  ketchup: { name: '番茄醬', sell: 140 },
  pickled_radish: { name: '菜脯', sell: 220 },
  kimchi: { name: '台式泡菜', sell: 420 },
  salted_greens: { name: '鹹菜', sell: 120 },
  dried_shiitake: { name: '乾香菇', sell: 220 },
  dried_woodear: { name: '乾木耳', sell: 160 },
  dried_shoot: { name: '筍乾', sell: 200 },
  oolong: { name: '烏龍茶', sell: 120 },
  black_tea: { name: '蜜香紅茶', sell: 160 },
  white_rice: { name: '白米', sell: 240 },
  salted_egg: { name: '鹹鴨蛋', sell: 220 },
};
// 加工機：在小鎮的雜貨店買（錢＋後山挖的礦石），放在牧場攤位右邊。一次最多放 MACHINE_BATCH 個同一種東西，
// 過幾個小時（跟著現實時間）全部做好，拿出來放進倉庫。不花體力
export const MACHINE_BATCH = 5;
export const MACHINES = {
  mayo: { name: '美乃滋機', price: 1500, need: { 'ore:copper': 3 }, hours: 3, makes: { 'prod:egg': 'mayo', 'prod:egg_l': 'mayo_l' } },
  cheese: { name: '起司機', price: 2500, need: { 'ore:silver': 3 }, hours: 5, makes: { 'prod:milk': 'cheese', 'prod:milk_l': 'cheese_l' } },
  jam: { name: '果醬鍋', price: 2000, need: { 'ore:copper': 5 }, hours: 6,
    makes: { 'crop:strawberry': 'jam_strawberry', 'crop:pineapple': 'jam_pineapple', 'crop:tomato': 'ketchup' } },
  pickle: { name: '醃漬罈', price: 1000, need: { 'ore:stone': 10 }, hours: 12,
    makes: { 'crop:radish': 'pickled_radish', 'crop:cabbage': 'kimchi', 'crop:bokchoy': 'salted_greens', 'prod:duck_egg': 'salted_egg' } },
  // 曬架：把山上採的香菇、木耳、竹筍曬乾
  dryer: { name: '曬架', price: 1200, need: { 'ore:stone': 15, 'ore:copper': 2 }, hours: 8,
    makes: { 'forage:shiitake': 'dried_shiitake', 'forage:wood_ear': 'dried_woodear', 'forage:bamboo_shoot': 'dried_shoot', 'forage:winter_shoot': 'dried_shoot' } },
  // 製茶機：茶菁做成烏龍茶；夏天小綠葉蟬咬過的夏茶菁做成蜜香紅茶
  tea: { name: '製茶機', price: 1800, need: { 'ore:copper': 4 }, hours: 6, makes: { 'forage:tea_leaf': 'oolong', 'forage:tea_summer': 'black_tea' } },
  // 碾米機：稻穀碾成白米
  mill: { name: '碾米機', price: 1500, need: { 'ore:stone': 10, 'ore:copper': 2 }, hours: 2, makes: { 'crop:rice': 'white_rice' } },
};
// 加工機在牧場上的位置（地圖上的 M）
export const MACHINE_SPOTS = { tea: { x: 17, y: 4 }, mayo: { x: 18, y: 4 }, cheese: { x: 19, y: 4 }, jam: { x: 20, y: 4 }, pickle: { x: 21, y: 4 }, dryer: { x: 22, y: 4 }, mill: { x: 23, y: 4 } };
export const machineAt = (x, y) => Object.keys(MACHINE_SPOTS).find((id) => MACHINE_SPOTS[id].x === x && MACHINE_SPOTS[id].y === y) || null;
// 放進去的東西什麼時候做好（scale 一樣只給本機測試）
export const machineReadyAt = (m, scale = 1) => (m.started_at || 0) + (MACHINES[m.kind].hours * HOUR) / scale;
// 建築：溫室、房子擴建（要照順序：先大臥室再二樓）
export const BUILDS = {
  greenhouse: { name: '溫室', price: 8000, need: { 'ore:stone': 30, 'ore:copper': 10, 'ore:silver': 5 },
    desc: '40 格田，一年四季什麼都能種（雨淋不到，要自己澆水）' },
  house2: { name: '房子擴建：大臥室', price: 5000, need: { 'ore:stone': 20, 'ore:copper': 5 }, level: 2,
    desc: `睡得更好，每人每天體力 ${HOUSE_ENERGY[2]}` },
  house3: { name: '房子擴建：二樓', price: 15000, need: { 'ore:silver': 5, 'ore:gold': 3 }, level: 3,
    desc: `全家住得更舒服，每人每天體力 ${HOUSE_ENERGY[3]}` },
};

// 倉庫裡的東西能賣多少（賣不了的回傳 0）：作物、雞蛋牛奶、魚、礦石、料理、加工品
// 有星級的作物寫成 crop:番茄@3（1 銅星、2 銀星、3 金星），只有作物有星級
const ITEM_TABLES = () => ({ crop: CROPS, prod: PRODUCTS, fish: FISH, ore: ORES, dish: DISHES, good: GOODS, fruit: FRUITS, forage: FORAGE, bug: BUGS });
const ITEM_RE = /^([a-z]+):([a-z0-9_]+)(?:@([123]))?$/;
export function itemPrice(item) {
  const m = ITEM_RE.exec(String(item));
  if (!m || (m[3] && m[1] !== 'crop')) return 0;
  const table = ITEM_TABLES()[m[1]];
  if (!table || !Object.hasOwn(table, m[2])) return 0;
  return m[3] ? Math.round(table[m[2]].sell * QUALITY[m[3]].mult) : table[m[2]].sell;
}
export const itemName = (item) => {
  const m = ITEM_RE.exec(String(item));
  const table = m && { ...ITEM_TABLES(), fert: FERTS, gear: GEAR }[m[1]];
  if (!table || !Object.hasOwn(table, m[2]) || (m[3] && m[1] !== 'crop')) return item;
  return (m[3] ? QUALITY[m[3]].name : '') + table[m[2]].name;
};
export const baseItem = (item) => String(item).split('@')[0];
export const qualityOf = (item) => { const m = ITEM_RE.exec(String(item)); return m && m[3] ? Number(m[3]) : 0; };
export const withQuality = (item, q) => (q ? `${item}@${q}` : item);

// ---------------- 料理 ----------------
// 在家裡的廚房用自己種的、養的、釣的東西煮菜。煮好的菜可以吃（恢復體力）、賣（比材料值錢）、送人。
// need 的 key：倉庫裡的東西（crop:番茄），或 egg／milk（普通的、高級的都可以用，先用普通的）
export const INGREDIENT_GROUPS = {
  egg: { name: '雞蛋', items: ['prod:egg', 'prod:egg_l'] },
  milk: { name: '牛奶', items: ['prod:milk', 'prod:milk_l'] },
  honey: { name: '蜂蜜', items: ['prod:honey', 'prod:honey_l'] },
  mayo: { name: '美乃滋', items: ['good:mayo', 'good:mayo_l'] },
  cheese: { name: '起司', items: ['good:cheese', 'good:cheese_l'] },
};
export const DISHES = {
  stirfry: { name: '炒青菜', need: { 'crop:bokchoy': 2 }, energy: 12, sell: 110, shape: 'plate' },
  tomato_egg: { name: '番茄炒蛋', need: { 'crop:tomato': 1, egg: 1 }, energy: 20, sell: 150, shape: 'plate' },
  carrot_egg: { name: '紅蘿蔔炒蛋', need: { 'crop:carrot': 1, egg: 1 }, energy: 18, sell: 220, shape: 'plate' },
  eggplant: { name: '魚香茄子', need: { 'crop:eggplant': 2 }, energy: 18, sell: 150, shape: 'plate' },
  potato_salad: { name: '馬鈴薯沙拉', need: { 'crop:potato': 1, egg: 1 }, energy: 20, sell: 200, shape: 'plate' },
  corn_grill: { name: '烤玉米', need: { 'crop:corn': 2 }, energy: 15, sell: 200, shape: 'plate' },
  cabbage_rice: { name: '高麗菜飯', need: { 'crop:cabbage': 1 }, energy: 25, sell: 240, shape: 'bowl' },
  sweetpotato_congee: { name: '地瓜粥', need: { 'crop:sweetpotato': 1 }, energy: 15, sell: 120, shape: 'bowl' },
  radish_soup: { name: '蘿蔔湯', need: { 'crop:radish': 2 }, energy: 18, sell: 230, shape: 'bowl' },
  pumpkin_soup: { name: '南瓜濃湯', need: { 'crop:pumpkin': 1, milk: 1 }, energy: 35, sell: 600, shape: 'bowl' },
  fish_braised: { name: '紅燒吳郭魚', need: { 'fish:tilapia': 1 }, energy: 20, sell: 70, shape: 'plate' },
  bass_soup: { name: '薑絲鱸魚湯', need: { 'fish:bass': 1 }, energy: 35, sell: 260, shape: 'bowl' },
  eel_rice: { name: '鰻魚飯', need: { 'fish:eel': 1 }, energy: 45, sell: 420, shape: 'bowl' },
  pudding: { name: '雞蛋布丁', need: { egg: 2, milk: 1 }, energy: 25, sell: 280, shape: 'cup' },
  strawberry_milk: { name: '草莓牛奶', need: { 'crop:strawberry': 2, milk: 1 }, energy: 25, sell: 360, shape: 'cup' },
  watermelon_juice: { name: '西瓜汁', need: { 'crop:watermelon': 1 }, energy: 20, sell: 500, shape: 'cup' },
  pineapple_cake: { name: '鳳梨酥', need: { 'crop:pineapple': 1, egg: 2 }, energy: 25, sell: 800, shape: 'plate' },
  // 用加工品做的菜
  caipu_egg: { name: '菜脯蛋', need: { 'good:pickled_radish': 1, egg: 1 }, energy: 25, sell: 330, shape: 'plate' },
  kimchi_pot: { name: '泡菜鍋', need: { 'good:kimchi': 1, 'crop:bokchoy': 1, egg: 1 }, energy: 40, sell: 600, shape: 'bowl' },
  cheese_potato: { name: '焗烤地瓜', need: { cheese: 1, 'crop:sweetpotato': 1 }, energy: 35, sell: 420, shape: 'plate' },
  pancake: { name: '草莓鬆餅', need: { 'good:jam_strawberry': 1, egg: 1, milk: 1 }, energy: 40, sell: 470, shape: 'plate' },
  fries: { name: '薯條', need: { 'crop:potato': 2, 'good:ketchup': 1 }, energy: 20, sell: 400, shape: 'plate' },
  corn_salad: { name: '玉米沙拉', need: { 'crop:corn': 1, mayo: 1 }, energy: 20, sell: 250, shape: 'bowl' },
  golden_pumpkin: { name: '金沙南瓜', need: { 'crop:pumpkin': 1, 'good:salted_egg': 1 }, energy: 35, sell: 750, shape: 'plate' },
  // 用果樹的水果、蜂蜜做的
  mango_ice: { name: '芒果冰', need: { 'fruit:mango': 2, milk: 1 }, energy: 30, sell: 480, shape: 'bowl' },
  orange_juice: { name: '柳丁汁', need: { 'fruit:orange': 3 }, energy: 20, sell: 260, shape: 'cup' },
  honey_potato: { name: '蜜地瓜', need: { 'crop:sweetpotato': 2, honey: 1 }, energy: 30, sell: 450, shape: 'plate' },
  honey_cake: { name: '蜂蜜蛋糕', need: { honey: 1, egg: 2, milk: 1 }, energy: 40, sell: 520, shape: 'plate' },
  // 海鮮：海邊釣的魚、撿的蛤蜊螃蟹
  saury_grill: { name: '鹽烤秋刀魚', need: { 'fish:saury': 1 }, energy: 25, sell: 200, shape: 'plate' },
  clam_soup: { name: '蛤蜊湯', need: { 'forage:clam': 3 }, energy: 25, sell: 260, shape: 'bowl' },
  squid_sanbei: { name: '三杯小卷', need: { 'fish:squid': 2 }, energy: 35, sell: 420, shape: 'plate' },
  hairtail_sweet: { name: '糖醋白帶魚', need: { 'fish:hairtail': 1, 'good:ketchup': 1 }, energy: 35, sell: 400, shape: 'plate' },
  seafood_congee: { name: '海鮮粥', need: { 'forage:crab': 1, 'forage:clam': 2, egg: 1 }, energy: 45, sell: 520, shape: 'bowl' },
  karasumi: { name: '烏魚子', need: { 'fish:mullet': 2 }, energy: 30, sell: 900, shape: 'plate' },
  tuna_sashimi: { name: '黑鮪魚生魚片', need: { 'fish:tuna': 1 }, energy: 60, sell: 3200, shape: 'plate' },
  // 山上採的：竹筍、山蘇、香菇、栗子、木耳、靈芝
  bamboo_soup: { name: '竹筍湯', need: { 'forage:bamboo_shoot': 2 }, energy: 25, sell: 220, shape: 'bowl' },
  fern_stirfry: { name: '炒山蘇', need: { 'forage:fern': 2 }, energy: 20, sell: 180, shape: 'plate' },
  shiitake_egg: { name: '香菇蒸蛋', need: { 'forage:shiitake': 1, egg: 1 }, energy: 30, sell: 260, shape: 'bowl' },
  chestnut_roast: { name: '糖炒栗子', need: { 'forage:chestnut': 3 }, energy: 25, sell: 260, shape: 'plate' },
  woodear_drink: { name: '木耳露', need: { 'forage:wood_ear': 2, honey: 1 }, energy: 25, sell: 420, shape: 'cup' },
  lingzhi_tea: { name: '靈芝茶', need: { 'forage:lingzhi': 1 }, energy: 60, sell: 1500, shape: 'cup' },
  // 自己種的米、自己做的茶
  fried_rice: { name: '蛋炒飯', need: { 'good:white_rice': 1, egg: 1 }, energy: 30, sell: 380, shape: 'plate' },
  veg_rice: { name: '菜飯', need: { 'good:white_rice': 1, 'crop:bokchoy': 1 }, energy: 25, sell: 320, shape: 'bowl' },
  oil_rice: { name: '香菇油飯', need: { 'good:white_rice': 1, 'good:dried_shiitake': 1 }, energy: 40, sell: 560, shape: 'bowl' },
  rice_ball: { name: '菜脯飯糰', need: { 'good:white_rice': 1, 'good:pickled_radish': 1 }, energy: 35, sell: 520, shape: 'plate' },
  oolong_honey: { name: '蜂蜜烏龍茶', need: { 'good:oolong': 1, honey: 1 }, energy: 20, sell: 420, shape: 'cup' },
  milk_tea: { name: '鮮奶茶', need: { 'good:black_tea': 1, milk: 1 }, energy: 25, sell: 360, shape: 'cup' },
  // 節慶的食物：不能自己煮，節日或家人生日時收到（吃、賣、送人都可以）
  niangao: { name: '年糕', need: null, festival: true, energy: 30, sell: 120, shape: 'plate' },
  tangyuan: { name: '湯圓', need: null, festival: true, energy: 25, sell: 100, shape: 'bowl' },
  zongzi: { name: '粽子', need: null, festival: true, energy: 35, sell: 150, shape: 'plate' },
  mooncake: { name: '月餅', need: null, festival: true, energy: 30, sell: 150, shape: 'plate' },
  candy: { name: '糖果', need: null, festival: true, energy: 10, sell: 30, shape: 'plate' },
  cake: { name: '蛋糕', need: null, festival: true, energy: 50, sell: 300, shape: 'plate' },
  bbq: { name: '烤肉串', need: null, festival: true, energy: 20, sell: 80, shape: 'plate' },
};
const withStars = (i) => (i.startsWith('crop:') && !i.includes('@') ? [i, `${i}@1`, `${i}@2`, `${i}@3`] : [i]);
export const ingredientItems = (key) => (INGREDIENT_GROUPS[key] ? INGREDIENT_GROUPS[key].items : [key]).flatMap(withStars);
export const ingredientName = (key) => (INGREDIENT_GROUPS[key] ? INGREDIENT_GROUPS[key].name : itemName(key));
export const ingredientHave = (items, key) => ingredientItems(key).reduce((n, i) => n + (items[i] || 0), 0);
export const canCook = (items, dish) => !!DISHES[dish] && !!DISHES[dish].need && Object.entries(DISHES[dish].need).every(([k, q]) => ingredientHave(items, k) >= q);
// 要扣掉哪些東西：同一組先用普通的、不夠再用高級的
export function cookTakes(items, dish) {
  if (!DISHES[dish] || !DISHES[dish].need) return null;
  const take = {};
  for (const [k, q] of Object.entries(DISHES[dish].need)) {
    let left = q;
    for (const i of ingredientItems(k)) {
      const n = Math.min(left, (items[i] || 0) - (take[i] || 0));
      if (n > 0) { take[i] = (take[i] || 0) + n; left -= n; }
    }
    if (left > 0) return null;
  }
  return take;
}

// ---------------- 節慶 ----------------
// 農曆節日換算成國曆的日期（依中央氣象署公告）。用程式內建的農曆（ICU）算，在新月剛好接近半夜的年份
// 會差一天：2027、2030 年的春節（和元宵）ICU 算成 2/7、2/2，實際是 2/6、2/3，這裡用正確的日期
const LUNAR_DATES = {
  spring: ['2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31', '2034-02-19', '2035-02-08'],
  lantern: ['2026-03-03', '2027-02-20', '2028-02-09', '2029-02-27', '2030-02-17', '2031-02-06', '2032-02-25', '2033-02-14', '2034-03-05', '2035-02-22'],
  dragon: ['2026-06-19', '2027-06-09', '2028-05-28', '2029-06-16', '2030-06-05', '2031-06-24', '2032-06-12', '2033-06-01', '2034-06-20', '2035-06-10'],
  qixi: ['2026-08-19', '2027-08-08', '2028-08-26', '2029-08-16', '2030-08-05', '2031-08-24', '2032-08-12', '2033-08-01', '2034-08-20', '2035-08-10'],
  moon: ['2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12', '2031-10-01', '2032-09-19', '2033-09-08', '2034-09-27', '2035-09-16'],
};
export { LUNAR_DATES };
// gift：節日當天在小鎮告示板領的禮物（每座牧場每個節日一份）；line：村民當天會說的話
export const FESTIVALS = {
  newyear: { name: '元旦', emoji: '🎉', fixed: '01-01', gift: { money: 200 }, line: '新年快樂！今年也一起把田種好吧！' },
  spring: { name: '春節', emoji: '🧧', gift: { money: 888, item: 'dish:niangao', qty: 2 }, line: '新年快樂！恭喜發財，紅包拿去！' },
  lantern: { name: '元宵節', emoji: '🏮', gift: { item: 'dish:tangyuan', qty: 4 }, line: '元宵節快樂！吃完湯圓，晚上一起去看花燈。' },
  children: { name: '兒童節', emoji: '🎈', fixed: '04-04', gift: { item: 'dish:candy', qty: 6 }, line: '兒童節快樂！大人小孩今天都可以吃糖果！' },
  dragon: { name: '端午節', emoji: '🐉', gift: { item: 'dish:zongzi', qty: 4 }, line: '端午節快樂！今年的粽子包得特別好吃。' },
  qixi: { name: '七夕', emoji: '💕', gift: { item: 'ore:amethyst', qty: 1 }, line: '七夕快樂！這顆紫水晶，送給你最重要的人吧。' },
  moon: { name: '中秋節', emoji: '🥮', gift: { item: 'dish:mooncake', qty: 4 }, line: '中秋節快樂！晚上大家一起烤肉賞月吧。' },
  christmas: { name: '聖誕節', emoji: '🎄', fixed: '12-25', gift: { item: 'dish:cake', qty: 1 }, line: '聖誕快樂！廣場的聖誕樹好漂亮喔。' },
  nye: { name: '跨年', emoji: '🎆', fixed: '12-31', gift: { money: 300 }, line: '今天跨年！晚上一起倒數吧！' },
};
const festivalDate = (id, year) => {
  const f = FESTIVALS[id];
  if (f.fixed) return `${year}-${f.fixed}`;
  return (LUNAR_DATES[id] || []).find((d) => d.startsWith(year + '-')) || null;
};
// 這一天（台灣日期 YYYY-MM-DD）是哪個節日
export function festivalOn(day) {
  const y = Number(day.slice(0, 4));
  return Object.keys(FESTIVALS).find((id) => festivalDate(id, y) === day) || null;
}
// day 之後（不含 day）到 days 天內的節日，照日期排
export function festivalsAfter(day, days = 366) {
  const end = new Date(Date.parse(day + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10);
  const y = Number(day.slice(0, 4));
  const out = [];
  for (const yy of [y, y + 1, y + 2]) for (const id of Object.keys(FESTIVALS)) {
    const d = festivalDate(id, yy);
    if (d && d > day && d <= end) out.push({ id, date: d });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}
export const nextFestival = (day) => festivalsAfter(day, 400)[0] || null;
// 行事曆上今天的事情裡，有「生日」的就是有家人生日
export const isBirthdayEvent = (title) => /生日|壽/.test(String(title));

// ---------------- 村民的故事 ----------------
// 跟村民的感情到 2、5、8 顆愛心時，找他聊天會說一段自己的故事（每座牧場各聽一次，聽過的可以在告示板重看）
export const STORY_HEARTS = [2, 5, 8];
export const STORIES = {
  fu: [
    { title: '雜貨店的招牌', lines: ['你有沒有注意到店門口那塊招牌？', '那是我牽手年輕時候親手寫的字，一筆一畫，寫了整個下午。', '後來好幾次颱風，招牌被吹歪了，我都爬上去扶正。', '她走了以後，我更捨不得換。看到那幾個字，就好像她還在店裡幫我顧店。'] },
    { title: '第一把鋤頭', lines: ['開店第一天，賣出去的第一把鋤頭，你猜是賣給誰？', '是你們家以前的老主人。他說：「阿福仔，你的鋤頭要是不耐用，我天天來找你。」', '結果那把鋤頭用了二十幾年，他一次都沒來找我算帳，倒是天天來找我泡茶。', '現在看你們在那塊地上種東西，阿伯真的很歡喜。'] },
    { title: '交棒', lines: ['阿伯年紀大了，有時候搬一箱肥料，腰就痠好幾天。', '我那個在台北做電腦的孫子，上個月打電話說，想回來接這間店。', '我跟他說：「回來好啊，但是要先學會怎麼跟客人聊天，不是只會賣東西。」', '到時候你們要多照顧他喔。這間店，是整個鎮的灶腳。'] },
  ],
  mei: [
    { title: '阿母的滷肉', lines: ['我們家的滷肉飯，是我阿母傳下來的。', '小時候我最愛蹲在灶邊，看她一邊攪鍋子一邊哼歌。', '她說滷肉不能急，火要小、心要定，跟做人一樣。', '每次有客人說「這個味道跟我小時候吃的一樣」，我就覺得阿母還在身邊。'] },
    { title: '差點關店的那一年', lines: ['有一年生意真的很差，我連房租都快付不出來。', '我在門口貼了「本月底歇業」，心想就這樣了吧。', '結果隔天，阿福伯、王阿嬤、林老師……整條街的人都跑來吃飯，一吃就是一個月。', '志明還幫我把傳單送到每一戶。那張歇業的紙，最後被小傑撕下來畫圖了。'] },
    { title: '牧場特餐', lines: ['我想在菜單上加一道新的菜，叫做「牧場特餐」。', '用的都是你們家種的菜、你們家的雞蛋，客人一吃就知道是我們鎮上的味道。', '以前大家都說，鄉下沒什麼好吃的。我想讓他們知道，鄉下最好吃。', '名字我已經寫好了，就差你們家的菜了。'] },
  ],
  jie: [
    { title: '西瓜日記', lines: ['我跟你說一個祕密，我有一本「西瓜日記」！', '每天放學我都會畫一顆西瓜，有大的、有小的、還有被我吃掉一半的。', '老師說要寫字不要只畫圖……可是西瓜比較好看啊。', '等你們家的西瓜長大了，我可以畫進去嗎？'] },
    { title: '躲在噴水池後面', lines: ['……你有看到我剛剛在哭嗎？沒有喔？那就好。', '我爸爸在很遠的城市工作，一個月才回來一次。', '今天是他說要回來的日子，可是他打電話說不能回來了。', '……謝謝你陪我坐在這裡。我現在好一點了，我們去看噴水池裡的硬幣好不好？'] },
    { title: '我的夢想', lines: ['老師今天要我們寫「我的夢想」。', '我寫的是：我想跟你們家一樣，有一塊田、一間動物小屋，還有一隻會跟著我走的狗。', '同學都笑我，說當農夫很累。', '可是我覺得，能把東西種出來、讓大家吃飽，是世界上最厲害的事。你說對不對？'] },
  ],
  ama: [
    { title: '嫁過來的那天', lines: ['阿嬤十九歲那年，從山的那一邊嫁過來。', '那時候沒有車，是坐牛車，走了一整天才到。', '一進村子，整條路的人都出來看新娘，我害羞得頭都不敢抬。', '一轉眼五十年了。這個鎮，比我出生的地方還要像家。'] },
    { title: '阿公的斗笠', lines: ['你看我家牆上那頂斗笠，是你阿公……我是說，我們家阿公的。', '他一輩子都在田裡，夏天再熱也戴著它，說斗笠比冷氣還涼。', '他走的那天，斗笠還掛在門口，好像等一下就要出門下田。', '我一直沒收起來。看到你們每天下田，我就想到他。'] },
    { title: '乖孫', lines: ['來，這給你。阿嬤用你們家的羊毛打的圍巾……還沒打完啦，先給你看看。', '阿嬤的孩子都在外地，過年才回來一次。', '你們常常來陪我說話、送東西給我，阿嬤早就把你們當自己的孫子了。', '以後不管多忙，記得常回家看看，家裡的人會一直等你。'] },
  ],
  lin: [
    { title: '第一次上台', lines: ['我第一次站上講台的時候，緊張到把粉筆折斷了三支。', '台下的孩子一直笑，我的臉紅到耳朵。', '後來有個小女生舉手說：「老師，你不要怕，我們會乖乖的。」', '從那天起我就知道，不是只有老師在教學生，學生也在教老師。'] },
    { title: '畢業紀念冊', lines: ['我抽屜裡收著每一屆的畢業紀念冊。', '有的孩子現在當醫生，有的開了麵包店，還有一個去當了太空工程師。', '他們偶爾寄卡片回來，說：「老師，你說的話我一直記得。」', '其實我早就忘了自己說過什麼，但他們記得，就夠了。'] },
    { title: '回到鄉下', lines: ['以前我在城市的大學校教書，一班四十幾個學生。', '有一天我回老家，看到鎮上的小學只剩一個老師，要教六個年級。', '我想了一個晚上，隔天就遞了調職申請。', '大家都說我傻。可是看到小傑在作文裡寫「我的夢想是當農夫」，我覺得這是我做過最對的決定。'] },
  ],
  zhi: [
    { title: '每天兩百封', lines: ['你知道我一天要送多少封信嗎？兩百封！', '有帳單、有明信片、有喜帖，偶爾還有情書，信封上會畫愛心。', '每一封信背後都有一個在等的人，所以我從來不敢遲到。', '下雨天我會把信包兩層塑膠袋，濕掉的話，人家的心意也濕掉了。'] },
    { title: '寄不出去的信', lines: ['我的郵差包裡，一直放著一封寄不出去的信。', '收件人的地址是一間已經拆掉的老房子，寄件人也找不到了。', '我每年都去附近問一次，看有沒有人認得這個名字。', '說不定哪一天就找到了。郵差的工作，就是讓每一句話都送得到。'] },
    { title: '最後一站', lines: ['我每天送信的路線，最後一站都是你們家牧場。', '送完最後一封，我會在你們家田邊站一下，看看今天又長了什麼。', '騎了一整天的車，看到綠油油的田，什麼累都忘了。', '所以啊，你們家的信，我永遠第一個送……然後最後一個來看。'] },
  ],
};
// 這次聊天要不要說故事：感情夠了、還有下一段沒聽過，就回傳那一段的編號（0～2），不然 null
export function storyDue(points, storyLevel) {
  const lv = storyLevel || 0;
  return lv < STORY_HEARTS.length && friendHearts(points) >= STORY_HEARTS[lv] ? lv : null;
}

// ---------------- 家族成就 ----------------
// stats：全家的累計（收成次數、出貨賺的錢、完成的委託、生的寶寶）＋現在的牧場狀況，算出達成了哪些成就
export const ACHIEVEMENTS = [
  { id: 'harvest1', name: '第一次收成', desc: '收成一次', reward: 100, test: (s) => s.harvest >= 1 },
  { id: 'harvest100', name: '豐收', desc: '收成 100 次', reward: 1000, test: (s) => s.harvest >= 100 },
  { id: 'harvest500', name: '田園大師', desc: '收成 500 次', reward: 3000, test: (s) => s.harvest >= 500 },
  { id: 'goldStar', name: '金星農夫', desc: '收成一顆金星作物', reward: 500, test: (s) => (s.goldHarvest || 0) >= 1 },
  { id: 'sprinklers', name: '自動灑水', desc: '田裡擺了 4 個灑水器', reward: 800, test: (s) => (s.sprinklers || 0) >= 4 },
  { id: 'ship10k', name: '小有積蓄', desc: '出貨賺到 1 萬元', reward: 500, test: (s) => s.shipped >= 10000 },
  { id: 'ship100k', name: '牧場大亨', desc: '出貨賺到 10 萬元', reward: 3000, test: (s) => s.shipped >= 100000 },
  { id: 'animals5', name: '熱鬧的小屋', desc: '同時養 5 隻動物', reward: 500, test: (s) => s.animals >= 5 },
  { id: 'baby', name: '新生命', desc: '動物生了寶寶', reward: 300, test: (s) => s.babies >= 1 },
  { id: 'pet', name: '毛小孩', desc: '領養一隻寵物', reward: 100, test: (s) => s.pets >= 1 },
  { id: 'fish5', name: '釣魚新手', desc: '釣到 5 種魚', reward: 300, test: (s) => s.fishKinds >= 5 },
  { id: 'fishAll', name: '釣魚達人', desc: '圖鑑裡的魚全部釣過', reward: 2000, test: (s) => s.fishKinds >= Object.keys(FISH).length },
  { id: 'amethyst', name: '挖到寶了', desc: '挖到紫水晶', reward: 500, test: (s) => !!s.amethyst },
  { id: 'dish10', name: '家常好味道', desc: '煮過 10 道不同的菜', reward: 800, test: (s) => s.dishKinds >= 10 },
  { id: 'goods5', name: '加工小達人', desc: '做過 5 種加工品', reward: 500, test: (s) => s.goodKinds >= 5 },
  { id: 'friend10', name: '好鄰居', desc: '跟一位村民 10 顆愛心', reward: 1000, test: (s) => s.maxHearts >= 10 },
  { id: 'friendsAll', name: '全鎮的好朋友', desc: '跟每位村民都有 5 顆愛心', reward: 2000, test: (s) => s.minHearts >= 5 },
  { id: 'requests10', name: '熱心助人', desc: '完成 10 個委託', reward: 800, test: (s) => s.requests >= 10 },
  { id: 'greenhouse', name: '四季如春', desc: '蓋好溫室', reward: 500, test: (s) => !!s.gh },
  { id: 'house3', name: '溫暖的家', desc: '房子擴建到二樓', reward: 1000, test: (s) => s.house >= 3 },
  { id: 'machines', name: '加工專家', desc: '加工機全部買齊', reward: 1000, test: (s) => s.machines >= Object.keys(MACHINES).length },
  { id: 'orchard', name: '果園主人', desc: '同時種 5 棵果樹', reward: 800, test: (s) => (s.trees || 0) >= 5 },
  { id: 'honey', name: '甜蜜蜜', desc: '收到第一罐蜂蜜', reward: 300, test: (s) => !!s.honey },
  { id: 'goldfish3', name: '撈金魚高手', desc: '在夜市一次撈到 3 隻金魚', reward: 300, test: (s) => (s.goldfish3 || 0) >= 1 },
  { id: 'beauty', name: '選美冠軍', desc: '動物選美拿到第一名', reward: 500, test: (s) => (s.beautyWin || 0) >= 1 },
  { id: 'harvestGold', name: '豐收金牌', desc: '豐收比賽拿到金牌', reward: 1000, test: (s) => (s.harvestGold || 0) >= 1 },
  { id: 'cave10', name: '勇敢的探險家', desc: '下到洞窟第 10 層', reward: 800, test: (s) => (s.caveBest || 0) >= 10 },
  { id: 'caveBottom', name: '洞窟的最深處', desc: '打開洞窟第 20 層古老的寶箱', reward: 3000, test: (s) => (s.caveBottom || 0) >= 1 },
  { id: 'gems', name: '寶石收藏家', desc: '挖到紅寶石、藍寶石和鑽石', reward: 1500, test: (s) => (s.gems || 0) >= 3 },
  { id: 'seaFish5', name: '海釣新手', desc: '釣到 5 種海魚', reward: 500, test: (s) => (s.seaFishKinds || 0) >= 5 },
  { id: 'tuna', name: '黑鮪魚', desc: '在防波堤釣到黑鮪魚', reward: 2000, test: (s) => !!s.tuna },
  { id: 'beachcomber', name: '海邊撿寶', desc: '撿過 6 種海邊的東西', reward: 300, test: (s) => (s.beachKinds || 0) >= 6 },
  { id: 'restore1', name: '小鎮的好幫手', desc: '修好小鎮的第一個地方', reward: 500, test: (s) => (s.projects || 0) >= 1 },
  { id: 'restoreAll', name: '小鎮重生', desc: '小鎮修復計畫的四個地方都修好', reward: 3000, test: (s) => (s.projects || 0) >= 4 },
  { id: 'deco5', name: '佈置牧場', desc: '在牧場擺 5 個裝飾', reward: 300, test: (s) => (s.decoFarm || 0) >= 5 },
  { id: 'cozyHome', name: '溫暖的小窩', desc: '在屋子裡擺 5 件家具', reward: 300, test: (s) => (s.decoHome || 0) >= 5 },
  { id: 'rice', name: '粒粒皆辛苦', desc: '碾出第一包白米', reward: 500, test: (s) => !!s.whiteRice },
  { id: 'tea', name: '茶園主人', desc: '做出烏龍茶和蜜香紅茶', reward: 800, test: (s) => (s.teaKinds || 0) >= 2 },
  { id: 'mushrooms', name: '菇菇採集家', desc: '採到木耳、香菇和靈芝', reward: 800, test: (s) => (s.mushrooms || 0) >= 3 },
  { id: 'forageAll', name: '採集達人', desc: '採集圖鑑全部撿過', reward: 2000, test: (s) => (s.forageKinds || 0) >= Object.keys(FORAGE).length },
  { id: 'notes5', name: '家人的小紙條', desc: '在牧場的留言板寫了 5 則留言', reward: 300, test: (s) => (s.notes || 0) >= 5 },
  { id: 'horse', name: '我的愛駒', desc: '買了一匹馬', reward: 300, test: (s) => !!s.horse },
  { id: 'graze10', name: '青青草原', desc: '放牧 10 天', reward: 800, test: (s) => (s.graze || 0) >= 10 },
  { id: 'smith', name: '打鐵趁熱', desc: '在鐵匠鋪打好第一把工具', reward: 300, test: (s) => (s.smithTiers || 0) >= 1 },
  { id: 'goldtools', name: '金光閃閃', desc: '鋤頭、澆水壺、鐮刀都打成金的', reward: 2000, test: (s) => (s.goldTools || 0) >= 3 },
  { id: 'bugs10', name: '小小昆蟲學家', desc: '抓到 10 種昆蟲', reward: 500, test: (s) => (s.bugKinds || 0) >= 10 },
  { id: 'broadtail', name: '國寶蝴蝶', desc: '抓到寬尾鳳蝶', reward: 1000, test: (s) => !!s.broadtail },
  { id: 'stories', name: '說故事的人', desc: '聽完所有村民的故事', reward: 2000, test: (s) => s.stories >= Object.keys(STORIES).length * STORY_HEARTS.length },
];
export const achievementsMet = (stats) => ACHIEVEMENTS.filter((a) => a.test(stats)).map((a) => a.id);

// ---------------- 牧場週報 ----------------
// 一週從星期一開始（台灣時間）。week 用那個星期一的日期當名字
export function weekStart(day) {
  const t = Date.parse(day + 'T00:00:00Z');
  const dow = (new Date(t).getUTCDay() + 6) % 7; // 星期一＝0
  return new Date(t - dow * DAY).toISOString().slice(0, 10);
}
export const weekEnd = (week) => new Date(Date.parse(week + 'T00:00:00Z') + 6 * DAY).toISOString().slice(0, 10);
// 週報的一句話。r：{ week, harvest, shipped, achievements: [名字], dex: [名字], top: { name, actions } }；這週什麼都沒做回傳 null
export function weeklyReportText(r) {
  if (!r.actions) return null;
  const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const parts = [];
  if (r.harvest) parts.push(`收成 ${r.harvest} 次`);
  if (r.shipped) parts.push(`出貨賺了 ${r.shipped.toLocaleString('en-US')} 元`);
  if (r.achievements.length) parts.push(`達成成就「${r.achievements.join('」「')}」`);
  if (r.dex.length) parts.push(`圖鑑多了${r.dex.slice(0, 3).join('、')}${r.dex.length > 3 ? ` 等 ${r.dex.length} 種` : ''}`);
  if (!parts.length) parts.push(`大家一共做了 ${r.actions} 件事`);
  const top = r.top ? `；最勤勞的是${r.top.name}（做了 ${r.top.actions} 件事）` : '';
  return `📰 家族牧場週報（${md(r.week)}～${md(weekEnd(r.week))}）：${parts.join('、')}${top}！新的一週也一起加油 💪`;
}

// ---------------- 節慶活動 ----------------
// 節日當天在小鎮的告示板參加活動，每個人每個節日玩一次：
// 春節抽籤、元宵猜燈謎、端午划龍舟（跟著鼓聲按）、中秋烤肉（烤到金黃色就翻）、聖誕交換禮物
export const FESTIVAL_ACTIVITIES = {
  spring: { kind: 'fortune', name: '新春抽籤', desc: '抽一支籤，看看今年的運氣（有紅包）' },
  lantern: { kind: 'riddle', name: '猜燈謎', desc: '猜 3 個燈謎，猜中一題 100 元，全對再送湯圓' },
  dragon: { kind: 'boat', name: '划龍舟', desc: '跟著鼓聲划槳，12 下拍子，打中一下 20 元，打中 10 下以上再送粽子' },
  moon: { kind: 'bbq', name: '中秋烤肉', desc: '6 串肉烤到金黃色就收起來，一串 50 元，還能帶回家吃' },
  christmas: { kind: 'xmas', name: '交換禮物', desc: '從聖誕樹下拿一份禮物' },
};
export const BOAT_BEATS = 12;
export const BBQ_STICKS = 6;
export const RIDDLES = [
  { q: '身穿綠衣裳，肚裡水汪汪，生的子兒多，個個黑臉膛。（猜一種水果）', c: ['西瓜', '木瓜', '芭樂'], a: 0 },
  { q: '麻屋子，紅帳子，裡面住個白胖子。（猜一種食物）', c: ['紅豆', '花生', '蒜頭'], a: 1 },
  { q: '小時穿黑衣，大時穿綠袍，水裡過日子，岸上來睡覺。（猜一種動物）', c: ['烏龜', '鴨子', '青蛙'], a: 2 },
  { q: '一身都是刺，頭上戴綠帽，切開黃澄澄，又酸又甜。（猜一種水果）', c: ['鳳梨', '榴槤', '楊桃'], a: 0 },
  { q: '兄弟七八個，圍著柱子坐，大家一分手，衣服就扯破。（猜一種蔬菜）', c: ['洋蔥', '蒜頭', '高麗菜'], a: 1 },
  { q: '紅公雞，綠尾巴，身體鑽到地底下。（猜一種蔬菜）', c: ['白蘿蔔', '地瓜', '紅蘿蔔'], a: 2 },
  { q: '圓圓臉兒像蘋果，又酸又甜營養多，能做菜也能當水果。（猜一種蔬果）', c: ['番茄', '柿子', '草莓'], a: 0 },
  { q: '千條線，萬條線，掉到水裡看不見。（猜一種天氣）', c: ['風', '雨', '雪'], a: 1 },
  { q: '有面沒有口，有腳沒有手，大家吃飯時，靠它來幫忙。（猜一樣家具）', c: ['椅子', '櫃子', '桌子'], a: 2 },
  { q: '白白像雪，鹹鹹像海，煮菜少不了它。（猜一種調味料）', c: ['鹽', '糖', '味精'], a: 0 },
  { q: '一個老公公，天天起得早，嘴裡喊喔喔，叫大家起床。（猜一種動物）', c: ['小狗', '公雞', '鴨子'], a: 1 },
  { q: '小小紅房子，外面長滿黑點點，咬一口又酸又甜。（猜一種水果）', c: ['芒果', '香蕉', '草莓'], a: 2 },
];
export const FORTUNES = [
  { level: '大吉', text: '今年種什麼都大豐收，倉庫裝不下！', money: 168 },
  { level: '大吉', text: '全家平安，天天笑口常開。', money: 168 },
  { level: '中吉', text: '動物都健健康康，雞蛋一顆接一顆。', money: 88 },
  { level: '中吉', text: '多跟村民聊天，會遇到好事。', money: 88 },
  { level: '小吉', text: '記得每天澆水，努力就有收穫。', money: 66 },
  { level: '小吉', text: '後山的石頭裡，好像藏著寶貝。', money: 66 },
  { level: '吉', text: '慢慢來，做田人不要急。', money: 36 },
];
export const XMAS_GIFTS = [['ore:gold', 1], ['dish:cake', 1], ['good:jam_strawberry', 2], ['fish:goldfish', 1], ['feed', 20], ['prod:milk_l', 2], ['ore:amethyst', 1]];
const pick = (seed, n) => Math.floor(seededRandom(seed)() * n);
export const fortuneOf = (farmId, day, userId) => FORTUNES[pick(`${farmId}|${day}|${userId}|fortune`, FORTUNES.length)];
export const xmasGiftOf = (farmId, day, userId) => XMAS_GIFTS[pick(`${farmId}|${day}|${userId}|xmas`, XMAS_GIFTS.length)];
// 每個人每年元宵猜的 3 題（不一樣的 3 題，同一天同一個人永遠一樣）
export function riddlesFor(day, userId) {
  const rnd = seededRandom(`${day}|${userId}|riddle`);
  const ids = RIDDLES.map((_, i) => i);
  const out = [];
  while (out.length < 3) out.push(ids.splice(Math.floor(rnd() * ids.length), 1)[0]);
  return out;
}
const clampInt = (v, max) => Math.max(0, Math.min(max, Number.isInteger(v) ? v : 0));
// 活動的結果：錢、東西、一句說明（score 由前端的小遊戲送來，伺服器只負責夾在合理範圍、算獎勵）
export function activityResult(kind, { farmId, day, userId, answers, score }) {
  if (kind === 'fortune') {
    const f = fortuneOf(farmId, day, userId);
    return { score: 0, money: f.money, item: null, qty: 0, level: f.level, text: `抽到「${f.level}」：${f.text}` };
  }
  if (kind === 'riddle') {
    const ids = riddlesFor(day, userId);
    const a = Array.isArray(answers) ? answers : [];
    const correct = ids.filter((id, i) => a[i] === RIDDLES[id].a).length;
    return { score: correct, money: correct * 100, item: correct === 3 ? 'dish:tangyuan' : null, qty: correct === 3 ? 2 : 0, text: `猜中了 ${correct} 題燈謎` };
  }
  if (kind === 'boat') {
    const n = clampInt(score, BOAT_BEATS);
    return { score: n, money: n * 20, item: n >= 10 ? 'dish:zongzi' : null, qty: n >= 10 ? 2 : 0, text: `划龍舟打中了 ${n} 下鼓聲` };
  }
  if (kind === 'bbq') {
    const n = clampInt(score, BBQ_STICKS);
    return { score: n, money: n * 50, item: n ? 'dish:bbq' : null, qty: n, text: `烤好了 ${n} 串肉` };
  }
  const [item, qty] = xmasGiftOf(farmId, day, userId);
  return { score: 0, money: 0, item, qty, text: `拆到了${itemName(item)}${qty > 1 ? ` ×${qty}` : ''}` };
}

// ---------------- 夜市 ----------------
// 每個星期六晚上 5 點到半夜 12 點，小鎮南邊的空地有夜市：撈金魚、套圈圈、夜市小吃、夜市限定
// 每個攤位佔兩格（x、x+1），擺在民宅中間的空地，不會擋到民宅的門
export const MARKET_STALLS = {
  goldfish: { name: '撈金魚', x: 6, y: 16, w: 2, price: 100 },
  ring: { name: '套圈圈', x: 9, y: 16, w: 2, price: 100 },
  snack: { name: '夜市小吃', x: 16, y: 16, w: 2 },
  special: { name: '夜市限定', x: 19, y: 16, w: 2 },
};
// 村民逛夜市：在攤位前面那兩排走來走去
export const MARKET_ZONE = { x0: 3, y0: 17, x1: 26, y1: 18 };
export const isNightMarket = (now) => { const d = new Date(now + TW); return d.getUTCDay() === 6 && d.getUTCHours() >= 17; };
export const NIGHT_FOODS = {
  chicken: { name: '雞排', price: 80, energy: 30 },
  tea: { name: '珍珠奶茶', price: 60, energy: 20 },
  tofu: { name: '臭豆腐', price: 70, energy: 25 },
  oyster: { name: '蚵仔煎', price: 90, energy: 35 },
};
// 夜市限定：每週換 3 樣（價錢都比賣出去的價錢高，不能套利）
export const SPECIALS = [['ore:amethyst', 900], ['sapling:mango', 1000], ['good:jam_pineapple', 1300], ['prod:honey_l', 400], ['fish:eel', 380], ['dish:cake', 400]];
export function specialsOf(week) {
  const rnd = seededRandom(`${week}|night-market`);
  const list = SPECIALS.slice();
  const out = [];
  while (out.length < 3) out.push(list.splice(Math.floor(rnd() * list.length), 1)[0]);
  return out.map(([item, price]) => ({ item, price }));
}
export const GOLDFISH_MAX = 3;   // 紙網撈 3 下就破
export const RING_THROWS = 5;
export function ringPrize(score) {
  const n = Math.max(0, Math.min(RING_THROWS, Number.isInteger(score) ? score : 0));
  const [item, qty] = n >= 5 ? ['ore:amethyst', 1] : n >= 3 ? ['ore:gold', 1] : n >= 1 ? ['feed', 10] : ['dish:candy', 1];
  return { score: n, item, qty };
}

// ---------------- 比賽 ----------------
// 動物選美：每週報名一隻動物，週末過後評審。分數＝愛心 ×4 ＋評審的心情（0～20），跟另外三戶人家的動物比
export const BEAUTY_RIVALS = [
  { owner: '隔壁村的陳家', name: '阿花', kind: 'cow' },
  { owner: '山腳下的老王', name: '大白', kind: 'sheep' },
  { owner: '鎮上的林家', name: '咕咕', kind: 'chicken' },
];
export const BEAUTY_PRIZES = [800, 400, 200, 50];
const luck = (seed, n) => Math.floor(seededRandom(seed)() * n);
export function beautyResult(week, farmId, entry) {
  const mine = Math.min(LOVE_MAX, entry.love || 0) * 4 + luck(`${week}|${farmId}|${entry.animal_id}|beauty`, 21);
  const rivals = BEAUTY_RIVALS.map((r, i) => ({ ...r, score: 40 + luck(`${week}|rival${i}|beauty`, 50) }));
  const place = 1 + rivals.filter((r) => r.score > mine).length;
  return { score: mine, rivals, place, prize: BEAUTY_PRIZES[place - 1] };
}
// 豐收比賽：每一季全家收成（作物＋水果）幾次，換季時跟另外三戶人家比
export const HARVEST_RIVALS = [
  { owner: '隔壁村的陳家', score: 40 },
  { owner: '鎮上的林家', score: 120 },
  { owner: '山腳下的老王', score: 250 },
];
export const HARVEST_MEDALS = [['金牌', 3000], ['銀牌', 1500], ['銅牌', 500], ['參加獎', 100]];
export function harvestContest(count) {
  const place = 1 + HARVEST_RIVALS.filter((r) => r.score >= count).length;
  const [medal, prize] = HARVEST_MEDALS[place - 1];
  return { count, place, medal, prize };
}

// ---------------- 後山洞窟 ----------------
// 後山右邊的山壁有洞窟入口（V）。洞窟有 20 層，每層每天長出一批石頭，越深的礦越好、還有寶石；
// 其中一顆石頭底下藏著往下的梯子（第 20 層是最深處，沒有梯子）。
// 礦車可以直接到「去過的」第 1、5、10、15、20 層；有的樓層有寶箱，每 5 層一定有。
export const CAVE_FLOORS = 20;
export const CAVE_STOPS = [1, 5, 10, 15, 20];
export const CAVE_ROCKS = 14;
export const CAVE_UP = { x: 1, y: 1 };       // 往上爬回後山的梯子
export const CAVE_ARRIVE = { x: 2, y: 1 };   // 下到新的一層時站的地方
// 三種洞窟的樣子輪流出現：X 是岩壁、^ 是往上的梯子
export const CAVE_LAYOUTS = [
  [
    'XXXXXXXXXXXXXXXX',
    'X^.....X.......X',
    'X......X.......X',
    'X..XX......XX..X',
    'X..XX......XX..X',
    'X..............X',
    'X......XX......X',
    'X......XX......X',
    'X..XX......XX..X',
    'X..XX..........X',
    'X.........X....X',
    'XXXXXXXXXXXXXXXX',
  ],
  [
    'XXXXXXXXXXXXXXXX',
    'X^.............X',
    'X.....XXXX.....X',
    'X..............X',
    'XXX.......XX...X',
    'X......X.......X',
    'X..X...X...X...X',
    'X..X.......X...X',
    'X..XXX.........X',
    'X.........XXX..X',
    'X..............X',
    'XXXXXXXXXXXXXXXX',
  ],
  [
    'XXXXXXXXXXXXXXXX',
    'X^..X..........X',
    'X...X...XX.....X',
    'X.......XX..X..X',
    'X..XX.......X..X',
    'X..............X',
    'XXX....XX....XXX',
    'X......XX......X',
    'X..X........X..X',
    'X..X...XX...X..X',
    'X......XX......X',
    'XXXXXXXXXXXXXXXX',
  ],
];
export const CAVE_CHEST_SPOTS = [{ x: 14, y: 10 }, { x: 14, y: 1 }, { x: 14, y: 10 }];
export const caveLayout = (floor) => (floor - 1) % CAVE_LAYOUTS.length;
export const caveTier = (floor) => Math.min(3, Math.floor((floor - 1) / 5));
// 每 5 層一段，越深越好：1～5 層多是石頭銅礦；16～20 層有紅寶石、藍寶石，運氣好挖到鑽石
export const CAVE_ORES = [
  { stone: 50, copper: 35, silver: 12, gold: 3 },
  { stone: 35, copper: 28, silver: 22, gold: 12, amethyst: 3 },
  { stone: 25, copper: 12, silver: 24, gold: 24, amethyst: 7, jade: 8 },
  { stone: 18, silver: 14, gold: 30, amethyst: 12, jade: 12, ruby: 6, sapphire: 6, diamond: 2 },
];
export function caveFloor(farmId, day, floor) {
  const layout = caveLayout(floor), map = CAVE_LAYOUTS[layout];
  const rnd = seededRandom(`${farmId}|${day}|cave|${floor}`);
  const hasChest = floor % 5 === 0 || rnd() < 0.25;
  const chest = hasChest ? CAVE_CHEST_SPOTS[layout] : null;
  // 梯子旁邊留空（剛下來不會被擋住）、寶箱那格不放石頭
  const spots = [];
  for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++)
    if (map[y][x] === '.' && Math.abs(x - CAVE_UP.x) + Math.abs(y - CAVE_UP.y) > 2 && !(chest && chest.x === x && chest.y === y)) spots.push({ x, y });
  const ores = Object.entries(CAVE_ORES[caveTier(floor)]).map(([id, w]) => ({ id, w }));
  const rocks = [];
  while (rocks.length < CAVE_ROCKS && spots.length) {
    const p = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
    rocks.push({ ...p, type: pickWeighted(ores, rnd()) });
  }
  const lr = floor < CAVE_FLOORS ? rocks[Math.floor(rnd() * rocks.length)] : null;
  return { layout, rocks, ladder: lr ? { x: lr.x, y: lr.y } : null, chest };
}
// 寶箱：每層每天一個（有寶箱的那層），越深越好
export const CHEST_LOOT = [
  [['money', 150], ['feed', 10], ['ore:copper', 4], ['ore:silver', 1]],
  [['money', 400], ['ore:silver', 3], ['ore:gold', 1], ['ore:amethyst', 1]],
  [['money', 800], ['ore:gold', 2], ['ore:jade', 1], ['ore:amethyst', 2]],
  [['money', 1500], ['ore:ruby', 1], ['ore:sapphire', 1], ['ore:gold', 4]],
];
export function chestLoot(farmId, day, floor) {
  const t = CHEST_LOOT[caveTier(floor)];
  const [item, qty] = t[Math.floor(seededRandom(`${farmId}|${day}|chest|${floor}`)() * t.length)];
  return item === 'money' ? { money: qty } : { item, qty };
}
// 第 20 層第一次打開的「古老的寶箱」（每座牧場一次）
export const CAVE_TREASURE = { money: 5000, item: 'ore:diamond', qty: 1 };

// ---------------- 海邊：潮汐、撿東西 ----------------
// 潮汐大約每 12 小時 25 分鐘漲退一次（簡化：以 2026-01-01 03:00 台灣時間為乾潮），
// 退潮時潮間帶（d）露出來可以走過去，撿得到蛤蜊、螃蟹；漲潮時那裡是淺海，可以釣魚
export const TIDE_HOURS = 12.42;
const TIDE_EPOCH = Date.parse('2026-01-01T03:00:00+08:00');
export const tideLevel = (now) => -Math.cos(2 * Math.PI * ((now - TIDE_EPOCH) / HOUR) / TIDE_HOURS); // -1 乾潮、1 滿潮
export const isLowTide = (now) => tideLevel(now) < -0.35;
// 某段時間裡的退潮時段 [[開始, 結束], ...]（每次大約 4 小時 50 分鐘）
export function lowTideWindows(from, to) {
  const period = TIDE_HOURS * HOUR, half = (Math.acos(0.35) / (2 * Math.PI)) * period;
  const out = [];
  for (let k = Math.floor((from - TIDE_EPOCH) / period) - 1; TIDE_EPOCH + k * period - half < to; k++) {
    const c = TIDE_EPOCH + k * period;
    if (c + half > from) out.push([Math.round(c - half), Math.round(c + half)]);
  }
  return out;
}
// 撿得到的東西（之後的野外採集也放在這裡）：where 是沙灘（sand）或潮間帶（tide，退潮才撿得到）
export const FORAGE = {
  shell: { name: '貝殼', sell: 20, where: 'sand', weight: 40 },
  conch: { name: '海螺', sell: 60, where: 'sand', weight: 18 },
  seaweed: { name: '海菜', sell: 30, where: 'tide', weight: 25 },
  sea_glass: { name: '海玻璃', sell: 150, where: 'sand', weight: 5 },
  clam: { name: '蛤蜊', sell: 40, where: 'tide', weight: 35 },
  crab: { name: '螃蟹', sell: 120, where: 'tide', weight: 15 },
  oyster: { name: '野生牡蠣', sell: 80, where: 'tide', weight: 12 },
  // 野外採集：後山（hill）、小鎮（town）的草地上，看季節長出來
  bamboo_shoot: { name: '竹筍', sell: 60, where: 'hill', seasons: ['spring', 'summer'], weight: 30 },
  fern: { name: '山蘇', sell: 50, where: 'hill', seasons: ['spring', 'summer'], weight: 25 },
  raspberry: { name: '野莓', sell: 45, where: 'hill', seasons: ['summer'], weight: 25 },
  wood_ear: { name: '木耳', sell: 55, where: 'hill', seasons: ['summer', 'autumn'], weight: 25, mushroom: true },
  shiitake: { name: '香菇', sell: 80, where: 'hill', seasons: ['autumn', 'winter'], weight: 30, mushroom: true },
  chestnut: { name: '栗子', sell: 65, where: 'hill', seasons: ['autumn'], weight: 25 },
  winter_shoot: { name: '冬筍', sell: 90, where: 'hill', seasons: ['winter'], weight: 25 },
  lingzhi: { name: '靈芝', sell: 600, where: 'hill', seasons: ['spring', 'summer', 'autumn', 'winter'], weight: 2, mushroom: true },
  dandelion: { name: '蒲公英', sell: 20, where: 'town', seasons: ['spring'], weight: 30 },
  ginger_lily: { name: '野薑花', sell: 70, where: 'town', seasons: ['summer', 'autumn'], weight: 25 },
  kumquat: { name: '金桔', sell: 40, where: 'town', seasons: ['winter'], weight: 25 },
  // 梯田的茶園：每棵茶樹每天採一次（不花體力）。春、秋、冬採茶菁，夏天採小綠葉蟬咬過的夏茶菁
  tea_leaf: { name: '茶菁', sell: 30, where: 'tea', seasons: ['spring', 'autumn', 'winter'], weight: 0 },
  tea_summer: { name: '夏茶菁', sell: 40, where: 'tea', seasons: ['summer'], weight: 0 },
};
export const BEACH_FINDS = { sand: 8, tide: 6 };
export const LAND_FINDS = { hill: 8, town: 4 };
// 海邊今天哪裡有東西可以撿（全家看到的一樣，隔天換一批）
export function forageOf(farmId, day, area, season = 'spring') {
  if (area === 'hill' || area === 'town') return landForageOf(farmId, day, area, season);
  if (area === 'terrace') return teaOf(season);
  if (area !== 'beach') return [];
  const rnd = seededRandom(`${farmId}|${day}|forage|${area}`);
  const out = [];
  for (const [where, ch] of [['sand', 's'], ['tide', 'd']]) {
    const spots = [];
    BEACH_MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) spots.push({ x, y }); }));
    const kinds = Object.entries(FORAGE).filter(([, f]) => f.where === where).map(([id, f]) => ({ id, w: f.weight }));
    for (let n = 0; n < BEACH_FINDS[where] && spots.length; n++) {
      const p = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
      out.push({ ...p, item: `forage:${pickWeighted(kinds, rnd())}`, tidal: where === 'tide' });
    }
  }
  return out;
}

// ---------------- 小鎮修復計畫 ----------------
// 小鎮有四個年久失修的地方。每個地方有三份「收集清單」，全家一起把清單上的東西交齊就修好，
// 修好了各有用處。四個都修好，小鎮辦一場慶典。清單的 key 跟料理一樣：倉庫裡的東西，或 egg／milk／honey 這種組
export const PROJECTS = {
  temple: {
    name: '土地公廟', emoji: '🏯', area: 'town', x: 2, y: 2,
    reward: '每個人每天可以來拜拜一次：體力 +15，還會抽到今天的運勢，大吉的時候土地公會送種子',
    bundles: {
      offer_spring: { name: '春天的供品', need: { 'crop:bokchoy': 5, 'crop:potato': 3, 'crop:strawberry': 3 } },
      offer_summer: { name: '夏天的供品', need: { 'crop:tomato': 3, 'crop:corn': 3, 'crop:watermelon': 1 } },
      offer_autumn: { name: '秋冬的供品', need: { 'crop:sweetpotato': 3, 'crop:pumpkin': 1, 'crop:cabbage': 1 } },
    },
  },
  harbor: {
    name: '漁會', emoji: '⚓', area: 'beach', x: 6, y: 6,
    reward: '漁會送全家一支好釣竿：魚上鉤以後有比較久的時間可以拉，稀有的魚也比較容易上鉤',
    bundles: {
      fish_lake: { name: '湖裡的魚', need: { 'fish:tilapia': 2, 'fish:crucian': 2, 'fish:carp': 1 } },
      fish_sea: { name: '海裡的魚', need: { 'fish:mackerel': 2, 'fish:porgy': 1, 'fish:hairtail': 1 } },
      beach_finds: { name: '海邊的寶', need: { 'forage:shell': 5, 'forage:clam': 3, 'forage:crab': 1 } },
    },
  },
  station: {
    name: '老車站', emoji: '🚉', area: 'town', x: 23, y: 2,
    reward: '小火車又開了：每個人每天可以花 100 元坐火車去泡溫泉，體力一下子全滿',
    bundles: {
      ores: { name: '修鐵軌的礦石', need: { 'ore:copper': 5, 'ore:silver': 3, 'ore:gold': 1 } },
      goods: { name: '車站商店的貨', need: { mayo: 1, cheese: 1, 'good:pickled_radish': 1 } },
      bento: { name: '鐵路便當', need: { 'dish:stirfry': 1, 'dish:tomato_egg': 1, 'dish:sweetpotato_congee': 1 } },
    },
  },
  coop: {
    name: '農會', emoji: '🏬', area: 'town', x: 25, y: 14,
    reward: '農會幫忙賣東西：作物、水果出貨的價錢多一成（+10%）',
    bundles: {
      animal: { name: '動物的禮物', need: { egg: 5, milk: 3, 'prod:wool': 1 } },
      fruits: { name: '當季水果', need: { 'fruit:guava': 3, 'fruit:orange': 3, 'fruit:mango': 1 } },
      sweets: { name: '甜蜜的東西', need: { honey: 1, 'good:jam_strawberry': 1, 'dish:pudding': 1 } },
    },
  },
};
export const bundleOf = (id) => { for (const [pid, P] of Object.entries(PROJECTS)) if (Object.hasOwn(P.bundles, id)) return { project: pid, ...P.bundles[id] }; return null; };
export const PROJECT_DONE_REWARD = 10000;   // 四個都修好：小鎮慶典的謝禮
export const COOP_BONUS = 1.1;              // 農會：作物、水果出貨 +10%
export const shipPrice = (item, coop) => {
  const p = itemPrice(item);
  return coop && /^(crop|fruit):/.test(item) ? Math.round(p * COOP_BONUS) : p;
};
export const ONSEN_PRICE = 100;
export const PRAY_ENERGY = 15;
// 土地公廟的運勢：同一個人同一天抽到的一樣；大吉送種子
export const PRAYERS = [
  { level: '大吉', text: '土地公笑咪咪：今年風調雨順，作物會長得又大又好！', gift: true },
  { level: '中吉', text: '出門遇貴人，今天跟村民聊天特別開心。' },
  { level: '小吉', text: '慢慢來比較快，一步一步把田顧好。' },
  { level: '吉', text: '家和萬事興，記得跟家人說說話。' },
  { level: '平', text: '平平安安就是福，多喝水、別太累。' },
];
export function prayerOf(farmId, day, userId, season) {
  const rnd = seededRandom(`${farmId}|${day}|${userId}|pray`);
  const p = PRAYERS[Math.floor(rnd() * PRAYERS.length)];
  if (!p.gift) return { ...p, giftItem: null };
  const ids = Object.keys(CROPS).filter((c) => inSeason(c, season));
  return { ...p, giftItem: { item: `seed:${ids[Math.floor(rnd() * ids.length)]}`, qty: 3 } };
}

// ---------------- 裝飾與家具 ----------------
// 在雜貨店買裝飾和家具，擺在牧場的草地上、或屋子裡。擺好的東西全家看到的一樣，可以收起來再擺
export const DECOS = {
  // 牧場的裝飾
  flowerbed: { name: '花圃', price: 200, where: 'farm' },
  bench: { name: '長椅', price: 300, where: 'farm' },
  lamp: { name: '路燈', price: 400, where: 'farm', light: true },
  scarecrow: { name: '稻草人', price: 250, where: 'farm' },
  windmill: { name: '小風車', price: 800, where: 'farm' },
  swing: { name: '鞦韆', price: 600, where: 'farm' },
  stone_lantern: { name: '石燈籠', price: 500, where: 'farm', light: true },
  mailbox: { name: '信箱', price: 200, where: 'farm' },
  birdhouse: { name: '鳥屋', price: 300, where: 'farm' },
  umbrella: { name: '遮陽傘', price: 350, where: 'farm' },
  // 屋子裡的家具
  bed: { name: '床', price: 600, where: 'home' },
  sofa: { name: '沙發', price: 500, where: 'home' },
  tv: { name: '電視', price: 800, where: 'home' },
  table: { name: '餐桌', price: 400, where: 'home' },
  teatable: { name: '泡茶桌', price: 500, where: 'home' },
  bookshelf: { name: '書櫃', price: 450, where: 'home' },
  plant: { name: '盆栽', price: 150, where: 'home' },
  rug: { name: '地毯', price: 300, where: 'home', flat: true },   // 地毯可以踩過去
  floor_lamp: { name: '落地燈', price: 250, where: 'home', light: true },
  photo: { name: '全家福相框', price: 200, where: 'home' },
};
export const DECO_MAX = { farm: 40, home: 20 };
// 不能擺的地方：動物小屋的柵欄裡、鴨子游泳的池塘邊、寵物玩的地方、出生點、屋子門口
const inZone = (z, x, y) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
const DECO_WALK = new Set(['.', '=', 'F', 'p', ',', 'E', 'q', 's', 'P']);
// 從出生點（屋裡從門口）走得到的格子；decos 擋路（地毯除外）
function decoReach(area, blocked) {
  const map = MAPS[area], start = area === 'home' ? ARRIVE['farm>home'] : FARM_SPAWN;
  const ok = (x, y) => DECO_WALK.has((map[y] || '')[x]) && !blocked.has(`${x},${y}`);
  const seen = new Set([`${start.x},${start.y}`]), q = [[start.x, start.y]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && ok(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
    }
  }
  return seen;
}
// 這一格能不能擺這個裝飾（不行的話回傳原因）。placed：這張地圖上已經擺的 [{x, y, kind}]
export function decoCheck(area, kind, x, y, placed) {
  const D = DECOS[kind];
  if (!D) return '沒有這種裝飾';
  if (D.where !== area) return D.where === 'home' ? '家具要擺在屋子裡' : '這個要擺在牧場的草地上';
  const map = MAPS[area];
  if (!Number.isInteger(x) || !Number.isInteger(y) || (map[y] || '')[x] !== '.') return area === 'home' ? '只能擺在屋裡的地板上' : '只能擺在草地上';
  if (placed.some((d) => d.x === x && d.y === y)) return '這裡已經擺了東西';
  if (placed.length >= DECO_MAX[area]) return `最多擺 ${DECO_MAX[area]} 個`;
  if (area === 'farm' && ([PEN, POND_ZONE, PET_ZONE].some((z) => inZone(z, x, y)) || (x === FARM_SPAWN.x && y === FARM_SPAWN.y)))
    return '這裡是動物、寵物活動的地方，換個地方擺吧';
  if (area === 'home' && x === ARRIVE['farm>home'].x && y === ARRIVE['farm>home'].y) return '門口不能擋住';
  if (D.flat) return null;
  // 擺了之後不能把路擋住：原本走得到的地方都還要走得到、建築和田旁邊也都還有地方站
  const blocked = new Set(placed.filter((d) => !DECOS[d.kind]?.flat).map((d) => `${d.x},${d.y}`));
  const before = decoReach(area, blocked);
  blocked.add(`${x},${y}`);
  const after = decoReach(area, blocked);
  if (after.size !== before.size - 1) return '擺在這裡會把路擋住';
  for (let yy = 0; yy < map.length; yy++) for (let xx = 0; xx < map[yy].length; xx++) {
    if (!'BSHAJMYZW'.includes(map[yy][xx])) continue;
    const near = (s) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => s.has(`${xx + dx},${yy + dy}`));
    if (near(before) && !near(after)) return '擺在這裡會擋住旁邊的東西';
  }
  return null;
}
// 後山、小鎮的野外採集：每天在草地上冒出幾個這一季的東西（小鎮南邊夜市那一帶不放）
function landForageOf(farmId, day, area, season) {
  const map = MAPS[area];
  const kinds = Object.entries(FORAGE).filter(([, f]) => f.where === area && f.seasons.includes(season)).map(([id, f]) => ({ id, w: f.weight }));
  if (!kinds.length) return [];
  const rnd = seededRandom(`${farmId}|${day}|forage|${area}`);
  const spots = [];
  map.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '.' && c !== ',') return;
    if (area === 'town' && y >= 15) return;
    if (area === 'hill' && x >= QUARRY.x0 - 1 && x <= QUARRY.x1 + 1 && y >= QUARRY.y0 && y <= QUARRY.y1 + 1) return;
    spots.push({ x, y });
  }));
  const out = [];
  for (let n = 0; n < LAND_FINDS[area] && spots.length; n++) {
    const p = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
    out.push({ ...p, item: `forage:${pickWeighted(kinds, rnd())}`, tidal: false });
  }
  return out;
}

// ---------------- 肥料、作物星級、灑水器、稻草人（第十九期） ----------------
// 肥料：在攤位買，施在翻好的土上（種之前、種下去之後都可以，一格施一種）。
// 一直有效到這一格收成（會再長的作物一直有效，挖掉才沒有）
export const FERTS = {
  basic: { name: '普通肥料', price: 30, quality: 1, desc: '收成比較容易有星級' },
  speed: { name: '速效肥料', price: 60, speed: 1.25, desc: '作物長快 25%' },
  quality: { name: '高級肥料', price: 120, quality: 2, desc: '收成很容易有銀星、金星' },
};
export const growRate = (tile) => (tile && Object.hasOwn(FERTS, tile.fert || '') && FERTS[tile.fert].speed) || 1;
// 作物的星級：收成那一刻決定，賣的價錢乘上 mult
export const QUALITY = { 1: { name: '銅星', mult: 1.25 }, 2: { name: '銀星', mult: 1.5 }, 3: { name: '金星', mult: 2 } };
// 收成出現 [銅星, 銀星, 金星] 的機率（%）：沒施肥、普通肥料、高級肥料
export const QUALITY_PCT = { 0: [10, 3, 1], 1: [25, 10, 4], 2: [25, 30, 15] };
export function harvestQuality(farmId, x, y, at, fert) {
  const pct = QUALITY_PCT[(Object.hasOwn(FERTS, fert || '') && FERTS[fert].quality) || 0];
  const r = seededRandom(`${farmId}|${x},${y}|${at}|quality`)() * 100;
  if (r < pct[2]) return 3;
  if (r < pct[2] + pct[1]) return 2;
  return r < pct[2] + pct[1] + pct[0] ? 1 : 0;
}

// 灑水器、稻草人：在雜貨店買（錢＋礦石），擺在田裡（牧場或溫室的田；那一格就不能種東西），可以收起來換位置。
// 灑水器每天自動幫旁邊的田澆水（被澆到的田一直是濕的）；稻草人顧著附近 9×9 的田，烏鴉不敢來
export const GEAR = {
  sprinkler: { name: '灑水器', price: 800, need: { 'ore:copper': 3 }, range: 'cross', desc: '每天自動幫上下左右 4 格田澆水' },
  sprinkler2: { name: '高級灑水器', price: 2500, need: { 'ore:silver': 2, 'ore:gold': 1 }, range: 'square', desc: '每天自動幫周圍 8 格田澆水' },
  scarecrow: { name: '稻草人', price: 300, need: { 'ore:stone': 5 }, range: 'scare', desc: '附近 9×9 的田，烏鴉不敢來偷吃' },
};
export const GEAR_MAX = 30;
export const SCARE_R = 4;
export const isSprinkler = (kind) => !!GEAR[kind] && GEAR[kind].range !== 'scare';
// 灑水器澆得到的格子：同一塊田（牧場或溫室）裡的 F
export function gearCovers(g) {
  const R = GEAR[g.kind] && GEAR[g.kind].range;
  const d = R === 'cross' ? [[0, -1], [0, 1], [-1, 0], [1, 0]]
    : R === 'square' ? [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] : [];
  const area = fieldArea(g.x, g.y);
  return d.map(([dx, dy]) => ({ x: g.x + dx, y: g.y + dy })).filter((c) => area && fieldArea(c.x, c.y) === area);
}
// 有灑水器幫忙澆水的格子（'x,y'）
export function sprinkledSet(gear) {
  const out = new Set();
  for (const g of gear) if (isSprinkler(g.kind)) for (const c of gearCovers(g)) out.add(`${c.x},${c.y}`);
  return out;
}
export const scaredAt = (gear, x, y) => gear.some((g) => g.kind === 'scarecrow' && Math.abs(g.x - x) <= SCARE_R && Math.abs(g.y - y) <= SCARE_R);
// 擺得下嗎：要是田、上面沒種東西、沒擺別的，總數有上限
export function gearCheck(kind, x, y, gear, tile) {
  if (!Object.hasOwn(GEAR, kind)) return '沒有這種東西';
  if (!Number.isInteger(x) || !Number.isInteger(y) || !fieldArea(x, y)) return '要擺在田裡';
  if (fieldArea(x, y) === 'terrace') return '水田不用灑水器，也沒有烏鴉';
  if (gear.some((g) => g.x === x && g.y === y)) return '這裡已經擺了東西';
  if (tile && tile.crop) return '這格種了東西，換一格空的';
  if (gear.length >= GEAR_MAX) return `田裡最多擺 ${GEAR_MAX} 個`;
  return null;
}

// 烏鴉：沒下雨的日子，外面的田沒有稻草人顧著的作物有 CROW_MIN 棵以上，那天可能被偷吃 1 棵（15 棵以上會偷吃 2 棵）。
// crops 是沒被顧著的作物位置；force 只給本機測試（'on' 一定來、'off' 不來）
export const CROW_MIN = 6;
export const CROW_PCT = 40;
export function crowsOf(farmId, day, crops, force = '') {
  if (!crops.length || force === 'off') return [];
  const rnd = seededRandom(`${farmId}|${day}|crows`);
  const roll = rnd() * 100;
  if (force !== 'on' && (crops.length < CROW_MIN || roll >= CROW_PCT)) return [];
  const pool = [...crops].sort((a, b) => a.y - b.y || a.x - b.x);
  const out = [];
  for (let n = crops.length >= 15 ? 2 : 1; n > 0 && pool.length; n--) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
// 梯田的茶園：每棵茶樹（e）每天都可以採一次，採到什麼看季節
function teaOf(season) {
  const item = season === 'summer' ? 'forage:tea_summer' : 'forage:tea_leaf';
  const out = [];
  TERRACE_MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'e') out.push({ x, y, item, tidal: false }); }));
  return out;
}

// ---------------- 牧場相機與家人互動（第二十一期） ----------------
// 表情：在牧場頭上冒一個泡泡，同一座牧場在線的家人都看得到（不存資料庫）
export const EMOTES = ['👋', '❤️', '👍', '😂', '😮', '🎉', '😴', '🙏'];
export const EMOTE_MS = 3000;
// 家庭留言板：每則最多 60 個字，最多留 20 則（滿了把最舊的拿掉）
export const NOTE_LEN = 60;
export const NOTE_MAX = 20;
export function cleanNote(raw) {
  const t = [...String(raw ?? '').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim()];
  return t.length ? t.slice(0, NOTE_LEN).join('') : '';
}

// ---------------- 騎馬與放牧（第二十二期） ----------------
// 放牧：天氣好（晴天、多雲）的白天 6～16 點，把小屋裡的雞、牛、羊放到後山南邊的草地上吃草（鴨子留在池塘）。
// 吃青草算今天餵過了（不用飼料），曬太陽心情特別好（愛心多 +1）。
// 晚上 8 點以前要趕回小屋，不然在外面待一整晚會嚇到（愛心 -1）
export const GRAZE_HOURS = [6, 16];
export const GRAZE_BACK_HOUR = 20;
export const GRAZE_ZONE = { area: 'hill', x0: 1, y0: 12, x1: 28, y1: 18 };
export const grazes = (kind) => !!ANIMALS[kind] && ANIMALS[kind].zone !== 'pond';
export const grazeWeatherOk = (w) => w === 'sun' || w === 'cloud';
// 放出去了、還沒趕回來，而且已經過了晚上 8 點（或已經是隔天）
export const grazePenaltyDue = (day, back, today, hour) => !!day && !back && (day !== today || hour >= GRAZE_BACK_HOUR);
// 後山草地上動物可以走的格子（不踩花、不踩出口）
export function grazeTiles() {
  const out = [];
  for (let y = GRAZE_ZONE.y0; y <= GRAZE_ZONE.y1; y++) for (let x = GRAZE_ZONE.x0; x <= GRAZE_ZONE.x1; x++) {
    if (terrainAt(x, y, 'hill') === '.') out.push({ x, y });
  }
  return out;
}
// 馬：一座牧場一匹，在動物小屋買（要取名字）。平常在動物小屋和池塘中間的路上走來走去。
// 騎上去走得快（愛心越多越快），同時只能一個人騎；屋子、溫室、洞窟裡不能騎
export const HORSE = { price: 3000, loveMax: 20 };
export const HORSE_ZONE = { x0: 22, y0: 6, x1: 28, y1: 6 };
export const RIDE_AREAS = ['farm', 'town', 'hill', 'beach', 'terrace'];
export const horseSpeed = (love) => (16 + Math.floor(Math.min(HORSE.loveMax, Math.max(0, love || 0)) / 4)) / 10; // 0～5 顆愛心：1.6～2.1 倍

// ---------------- 鐵匠鋪：工具打成銅、銀、金（第二十三期） ----------------
// 阿鐵師傅的鐵匠鋪在小鎮右上角。工具全家共用；打一把要一天（明天來拿），師傅打的時候舊的先借你用，同時只能打一把。
// 鋤頭、澆水壺要先在雜貨店換成大的（3×3）才能拿來打；鐮刀（收成用）直接打
export const SMITH_TOOLS = {
  hoe: { name: '鋤頭', short: '鋤頭', verb: '翻', needBig: true },
  can: { name: '澆水壺', short: '澆水', verb: '澆', needBig: true },
  sickle: { name: '鐮刀', short: '鐮刀', verb: '收成', needBig: false },
};
// 第 1～3 級：要的錢和礦石、一次處理的範圍（寬×高）、體力打幾折
export const SMITH_TIERS = [
  null,
  { name: '銅', price: 1500, ore: 'ore:copper', qty: 5, size: [3, 3], energy: 0.5 },
  { name: '銀', price: 4000, ore: 'ore:silver', qty: 5, size: [5, 3], energy: 0.5 },
  { name: '金', price: 10000, ore: 'ore:gold', qty: 5, size: [5, 5], energy: 0.25 },
];
export const TIER_MAX = SMITH_TIERS.length - 1;
// 一次處理的範圍：打過的照材質；沒打過的大鋤頭／大澆水壺 3×3；其他一次一格
export const toolSize = (tier, big) => (tier > 0 ? SMITH_TIERS[Math.min(tier, TIER_MAX)].size : big ? [3, 3] : [1, 1]);
// 用這把工具的體力打幾折（沒打過的照原價）
export const toolEnergy = (tier) => (tier > 0 ? SMITH_TIERS[Math.min(tier, TIER_MAX)].energy : 1);
// 範圍裡的格子：點的那一格先做，再由近到遠（體力不夠時至少做到點的那一格）
export function toolArea(x, y, size) {
  const [w, h] = size, out = [];
  for (let dy = -Math.floor(h / 2); dy <= Math.floor(h / 2); dy++)
    for (let dx = -Math.floor(w / 2); dx <= Math.floor(w / 2); dx++) out.push({ x: x + dx, y: y + dy, d: Math.abs(dx) + Math.abs(dy) });
  return out.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x).map(({ x: ax, y: ay }) => ({ x: ax, y: ay }));
}
// 做完 k 格一共花多少體力：每格 base 點、打 mult 折，加起來無條件進位（第 k 格多花的就是 areaEnergy(k) - areaEnergy(k - 1)）
export const areaEnergy = (k, base, mult) => Math.ceil(k * base * mult - 1e-9);
// 能不能拿去打下一級：可以的話回傳 null，不行回傳原因
export function smithCheck(tool, tier, have, money, bigLevel) {
  const T = SMITH_TOOLS[tool];
  if (!T || !Object.hasOwn(SMITH_TOOLS, tool)) return '沒有這種工具';
  if (tier >= TIER_MAX) return `已經是金${T.name}了，沒辦法再好了`;
  if (T.needBig && bigLevel < 2) return `要先到阿福伯的雜貨店換大${T.short === '澆水' ? '澆水壺' : T.name}，再拿來打`;
  const next = SMITH_TIERS[tier + 1];
  if (money < next.price) return `錢不夠，打${next.name}${T.name}要 ${next.price.toLocaleString()} 元`;
  if ((have[next.ore] || 0) < next.qty) return `${ORES[next.ore.slice(4)].name}不夠，要 ${next.qty} 個（後山、洞窟挖得到）`;
  return null;
}
// 工具現在叫什麼：金鋤頭、大澆水壺、鐮刀（還沒打）
export const toolTitle = (tool, tier, big) => (tier > 0 ? SMITH_TIERS[Math.min(tier, TIER_MAX)].name : big ? '大' : '') + SMITH_TOOLS[tool].name;

// ---------------- 捕蟲、昆蟲圖鑑（第二十四期） ----------------
// 雜貨店買一支捕蟲網（全家共用）。牧場、後山、小鎮、海邊、梯田每 2 小時換一批蟲，全家看到的一樣；
// 點蟲走過去揮網（1 點體力），稀有的有機會飛走（飛走了就等下一批）
export const NET = { price: 500, energy: 1 };
// where：在哪幾張地圖；time：day（6～18 點）／night（18～6 點）／any；rain：下雨天才出來；catch：揮網抓得到的機會（沒寫就是一定抓得到）
export const BUGS = {
  cabbage_white: { name: '紋白蝶', sell: 30, seasons: ['spring', 'autumn'], where: ['farm', 'town'], time: 'day', weight: 30, fly: true },
  yellow_butterfly: { name: '黃蝶', sell: 40, seasons: ['spring', 'summer'], where: ['farm', 'hill'], time: 'day', weight: 25, fly: true },
  ladybug: { name: '瓢蟲', sell: 50, seasons: ['spring', 'winter'], where: ['farm', 'terrace'], time: 'day', weight: 20 },
  swallowtail: { name: '鳳蝶', sell: 120, seasons: ['spring', 'summer'], where: ['hill', 'town'], time: 'day', weight: 12, fly: true, catch: 0.8 },
  broadtail: { name: '寬尾鳳蝶', sell: 800, seasons: ['summer'], where: ['hill'], time: 'day', weight: 2, fly: true, catch: 0.5 },
  cicada: { name: '蟬', sell: 60, seasons: ['summer'], where: ['hill', 'town'], time: 'day', weight: 25 },
  longhorn: { name: '天牛', sell: 110, seasons: ['spring', 'summer'], where: ['hill'], time: 'day', weight: 12 },
  dragonfly: { name: '蜻蜓', sell: 70, seasons: ['summer', 'autumn'], where: ['farm', 'terrace'], time: 'day', weight: 20, fly: true },
  red_dragonfly: { name: '紅蜻蜓', sell: 100, seasons: ['autumn'], where: ['terrace', 'farm'], time: 'day', weight: 15, fly: true },
  mantis: { name: '螳螂', sell: 120, seasons: ['autumn'], where: ['farm', 'hill'], time: 'day', weight: 15, catch: 0.8 },
  leaf_butterfly: { name: '枯葉蝶', sell: 300, seasons: ['autumn', 'winter'], where: ['hill'], time: 'day', weight: 5, fly: true, catch: 0.6 },
  purple_crow: { name: '紫斑蝶', sell: 200, seasons: ['winter'], where: ['hill', 'town'], time: 'day', weight: 15, fly: true, catch: 0.8 },
  firefly: { name: '螢火蟲', sell: 150, seasons: ['spring', 'summer'], where: ['hill', 'terrace'], time: 'night', weight: 25, fly: true, glow: true },
  rhino_beetle: { name: '獨角仙', sell: 250, seasons: ['summer'], where: ['hill'], time: 'night', weight: 10, catch: 0.8 },
  stag_beetle: { name: '鍬形蟲', sell: 300, seasons: ['summer'], where: ['hill'], time: 'night', weight: 8, catch: 0.8 },
  katydid: { name: '紡織娘', sell: 90, seasons: ['summer', 'autumn'], where: ['hill'], time: 'night', weight: 15 },
  cricket: { name: '蟋蟀', sell: 60, seasons: ['autumn'], where: ['farm', 'town'], time: 'night', weight: 25 },
  atlas_moth: { name: '皇蛾', sell: 1000, seasons: ['summer'], where: ['hill'], time: 'night', weight: 2, fly: true, catch: 0.5 },
  hermit_crab: { name: '寄居蟹', sell: 80, seasons: ALL, where: ['beach'], time: 'any', weight: 20 },
  snail: { name: '蝸牛', sell: 20, seasons: ['spring', 'summer', 'autumn'], where: ['farm', 'town', 'hill'], time: 'any', weight: 20, rain: true },
};
export const BUG_SLOT_H = 2; // 每 2 小時換一批
export const BUG_COUNT = { farm: 3, hill: 5, town: 3, beach: 2, terrace: 3 };
export const BUG_AREAS = Object.keys(BUG_COUNT);
export const bugSlotOf = (now) => Math.floor(new Date(now + 8 * 3600000).getUTCHours() / BUG_SLOT_H);
// 這一批是白天還是晚上的蟲（看這一批開始的時間）
export const bugTimeOf = (slot) => { const h = slot * BUG_SLOT_H; return h >= 6 && h < 18 ? 'day' : 'night'; };
// 現在這張地圖會出現哪些蟲：颱風、寒流天都躲起來了；下雨天只有蝸牛
export function bugKinds(area, season, time, weather) {
  if (weather === 'typhoon' || weather === 'cold') return [];
  const wet = weather === 'rain';
  return Object.entries(BUGS).filter(([, b]) => b.where.includes(area) && b.seasons.includes(season)
    && (b.time === 'any' || b.time === time) && (wet ? !!b.rain : !b.rain)).map(([id, b]) => ({ id, w: b.weight }));
}
// 這一批蟲在哪裡（全家看到的一樣）：草地上（海邊是沙灘），避開撿得到的東西、動物小屋的圍欄、最上面兩排、採石場、夜市
export function bugsOf(farmId, day, slot, area, season, weather, time = bugTimeOf(slot)) {
  const kinds = bugKinds(area, season, time, weather);
  const map = MAPS[area];
  if (!kinds.length || !map || !BUG_COUNT[area]) return [];
  const busy = new Set(forageOf(farmId, day, area, season).map((f) => `${f.x},${f.y}`));
  const ground = area === 'beach' ? 's' : '.';
  const spots = [];
  map.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== ground || y <= 2 || busy.has(`${x},${y}`)) return;
    if (area === 'farm' && x >= 21 && y >= 8) return;
    if (area === 'town' && y >= 15) return;
    if (area === 'hill' && x >= QUARRY.x0 - 1 && x <= QUARRY.x1 + 1 && y >= QUARRY.y0 && y <= QUARRY.y1 + 1) return;
    spots.push({ x, y });
  }));
  const rnd = seededRandom(`${farmId}|${day}|bugs|${slot}|${area}`);
  const out = [];
  for (let i = 0; i < BUG_COUNT[area] && spots.length; i++) {
    const p = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
    out.push({ idx: i, x: p.x, y: p.y, kind: pickWeighted(kinds, rnd()) });
  }
  return out;
}
// 揮網抓不抓得到：同一隻蟲結果一樣（稀有的有機會飛走）
export const bugCaught = (farmId, day, slot, area, idx, kind) =>
  seededRandom(`${farmId}|${day}|net|${slot}|${area}|${idx}`)() < ((BUGS[kind] || {}).catch || 1);
