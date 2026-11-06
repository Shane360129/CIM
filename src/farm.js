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

// 地形：T 樹、. 草地、= 小路、F 田、f 柵欄、H 房子、S 商店、B 出貨箱、W 池塘、A 動物小屋、E 往小鎮的出口
// 動物小屋下面用柵欄圍了一塊草地給雞和牛散步，左邊 (22,13) 是門；左下角的小路走出去是小鎮，
// 動物小屋右邊 (29,7) 走出去是後山
export const FARM_MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TT......T....................T',
  'T..HHHH.........SS....T......T',
  'T..HHHH.........SS......WWW..T',
  'T..HHHH..B..............WWWW.T',
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
  'T....=================.......T',
  'T....=......T................T',
  'TTTTTETTTTTTTTTTTTTTTTTTTTTTTT',
];
// 動物活動的範圍（柵欄裡面）
export const PEN = { x0: 23, y0: 10, x1: 27, y1: 15 };
export const PEN_GATE = { x: 22, y: 13 };
export const FARM_W = FARM_MAP[0].length;
export const FARM_H = FARM_MAP.length;
export const FARM_SPAWN = { x: 5, y: 5 }; // 家門口

// 小鎮：G 阿福伯的雜貨店、R 美玲姐的小吃店、Q 民宅、p 廣場石板、O 噴水池、N 委託告示板、, 花圃、E 回牧場
export const TOWN_MAP = [
  'TTTTTETTTTTTTTTTTTTTTTTTTTTTTT',
  'T....=.......................T',
  'T....=..GGGG......RRRR....T..T',
  'T....=..GGGG......RRRR.......T',
  'T....=..GGGG......RRRR.......T',
  'T....========================T',
  'T..............=.............T',
  'T..,,,...pppppppppppp...,,,..T',
  'T..,,,...pNpppppppppp...,,,..T',
  'T........pppppOOppppp........T',
  'T........pppppOOppppp........T',
  'T........pppppppppppp........T',
  'T..............=.............T',
  'T...======================...T',
  'T..QQQ......QQQ......QQQ.....T',
  'T..QQQ......QQQ......QQQ.....T',
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
  'T....WWWWW......=....T.......T',
  'T...............=............T',
  'T....T..........=......T.....T',
  'E================............T',
  'T.......T....................T',
  'T...........T........T.......T',
  'T..T.........................T',
  'T.......T.........T......T...T',
  'T...T.............,,,........T',
  'T..........T......,,,....T...T',
  'T....T.......................T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
export const MAPS = { farm: FARM_MAP, town: TOWN_MAP, hill: HILL_MAP };
export const AREAS = ['farm', 'town', 'hill'];
// 走到 E 就換地圖。EXITS：每張地圖的出口通到哪；ARRIVE['從>到']：換過去之後站在哪
export const EXITS = {
  farm: [{ x: 5, y: 19, to: 'town' }, { x: 29, y: 7, to: 'hill' }],
  town: [{ x: 5, y: 0, to: 'farm' }],
  hill: [{ x: 0, y: 11, to: 'farm' }],
};
export const ARRIVE = {
  'farm>town': { x: 5, y: 1 }, 'town>farm': { x: 5, y: 18 },
  'farm>hill': { x: 1, y: 11 }, 'hill>farm': { x: 28, y: 7 },
};
const WALKABLE = new Set(['.', '=', 'F', 'p', ',', 'E', 'q']);

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
export const ENERGY_COST = { till: 2, dig: 1, plant: 1, water: 1, harvest: 0, feed: 1, pet: 0, collect: 0, fish: 2, mine: 2 };
export const WATER_HOURS = 24;
export const START_MONEY = 500;
export const START_ITEMS = { 'seed:bokchoy': 9 };

export const terrainAt = (x, y, area = 'farm') => (MAPS[area][y] && MAPS[area][y][x]) || 'T';
export const isField = (x, y) => terrainAt(x, y) === 'F';
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

// ---------------- 小鎮的村民 ----------------
// 每位村民：喜歡／最愛／討厭的東西（送禮用，不會傳給前端，要自己發現）、生日、白天在哪一帶走動、說的話。
// 說的話依季節、天氣、跟你們家的感情（愛心）變化，每天換一句。
// item 用倉庫的寫法：crop:作物、prod:雞蛋牛奶
export const VILLAGERS = {
  fu: {
    name: '阿福伯', role: '雜貨店老闆', color: '#3b6ea8', hair: 'gray', birthday: '03-12',
    zone: { x0: 7, y0: 5, x1: 13, y1: 6 },
    loves: ['crop:pumpkin'], likes: ['crop:sweetpotato', 'crop:corn', 'prod:egg', 'fish:carp'], dislikes: ['crop:spinach'],
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
    loves: ['prod:egg_l'], likes: ['crop:cabbage', 'prod:egg', 'crop:bokchoy', 'prod:milk', 'fish:bass'], dislikes: ['crop:pineapple'],
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
    loves: ['crop:watermelon'], likes: ['crop:strawberry', 'crop:corn', 'crop:tomato', 'fish:goldfish', 'ore:amethyst'], dislikes: ['crop:spinach', 'crop:eggplant'],
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
    loves: ['prod:milk'], likes: ['crop:radish', 'crop:cabbage', 'crop:sweetpotato', 'crop:bokchoy', 'fish:crucian'], dislikes: ['crop:pineapple'],
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
    loves: ['crop:strawberry'], likes: ['crop:tomato', 'crop:carrot', 'crop:potato', 'ore:amethyst'], dislikes: ['crop:corn'],
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
    loves: ['crop:pineapple'], likes: ['prod:egg', 'crop:potato', 'crop:watermelon', 'fish:eel'], dislikes: ['crop:radish'],
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
  return 'neutral';
}
// 生日那天送禮，喜歡的東西點數三倍
export const isBirthday = (villager, day) => VILLAGERS[villager].birthday === day.slice(5);
export function giftPoints(villager, item, day) {
  const r = giftReaction(villager, item);
  const p = GIFT_POINTS[r];
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
  junk: { name: '破鞋子', sell: 2, seasons: ALL, where: ['pond', 'lake'], time: 'any', weight: 6 },
};
export const FISH_WINDOW_MS = 1500;     // 看到 ❗ 之後幾毫秒內要拉
export const fishSpot = (area) => (area === 'farm' ? 'pond' : area === 'hill' ? 'lake' : null);
export const isDaytime = (now) => { const h = new Date(now + TW).getUTCHours(); return h >= 6 && h < 18; };
// 這一刻在這裡可能釣到哪些魚，各自的機會（權重）
export function fishChoices(spot, season, day, rain) {
  const out = [];
  for (const [id, f] of Object.entries(FISH)) {
    if (!f.where.includes(spot) || !f.seasons.includes(season)) continue;
    let w = f.weight;
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
  const oreList = Object.entries(ORES).map(([id, o]) => ({ id, w: o.weight }));
  const out = [];
  while (out.length < ROCKS_PER_DAY && spots.length) {
    const p = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
    out.push({ ...p, type: pickWeighted(oreList, rnd()) });
  }
  return out;
}

// 倉庫裡的東西能賣多少（賣不了的回傳 0）：作物、雞蛋牛奶、魚、礦石
export function itemPrice(item) {
  const [kind, id] = String(item).split(':');
  const table = { crop: CROPS, prod: PRODUCTS, fish: FISH, ore: ORES }[kind];
  return table && Object.hasOwn(table, id) ? table[id].sell : 0;
}
export const itemName = (item) => {
  const [kind, id] = String(item).split(':');
  const table = { crop: CROPS, prod: PRODUCTS, fish: FISH, ore: ORES }[kind];
  return table && Object.hasOwn(table, id) ? table[id].name : item;
};
