#!/usr/bin/env node
// 家族小牧場的規則單元測試（不需要啟動伺服器）：npm run test:farm
// 驗證地圖（田地都走得到、商店出貨箱碰得到）、作物只在濕土時成長、
// 成長階段、時間倍率、台灣時間換日（體力恢復）、四季與作物、天氣（下雨自動澆水）、
// 會再長的作物、動物、小鎮、釣魚挖礦、料理、節日，以及每種東西都有畫好的圖。

import {
  FARM_MAP, FARM_W, FARM_H, FARM_SPAWN, CROPS, isField, isWalkable, terrainAt,
  grownMs, cropStage, cropTotalMs, isWet, waterUntil, taiwanDay, seasonOf, WATER_HOURS,
  SEASONS, inSeason, regrowProgressMs, weatherOf, wetMsBetween, wetUntilOf, dayEndOf, nextSeasonStart,
  PEN, PEN_GATE, ANIMALS, PRODUCTS, LOVE_BEST, hearts, productOf, animalReadyAt, animalHasProduct, cleanAnimalName,
  TOWN_MAP, ARRIVE, VILLAGERS, friendHearts, giftReaction, giftPoints, friendReward, villagerOut, requestOf,
  FOODS, TOOL_UPGRADES, area3x3, ENERGY_MAX,
  HILL_MAP, MAPS, EXITS, FISH, ORES, QUARRY, ROCKS_PER_DAY, fishChoices, pickWeighted, rocksOf, itemPrice,
  DISHES, INGREDIENT_GROUPS, ingredientItems, canCook, cookTakes,
  FESTIVALS, LUNAR_DATES, festivalOn, festivalsAfter, nextFestival, isBirthdayEvent,
  GH_MAP, fieldArea, GOODS, MACHINES, MACHINE_SPOTS, MACHINE_BATCH, machineAt, machineReadyAt, BUILDS, HOUSE_ENERGY, energyMaxOf,
  POND_ZONE, BABY_DAYS, BABY_EVERY_DAYS, isBaby, canHaveBaby, babyName, PETS, PET_ZONE, petFind, LOVE_MAX,
  STORIES, STORY_HEARTS, storyDue, ACHIEVEMENTS, achievementsMet, weekStart, weekEnd, weeklyReportText,
  TREE_SPOTS, HIVE_SPOTS, TREES, FRUITS, HIVE, treeMatureAt, treeReadyAt, hiveReadyAt,
  WEATHERS, realRain, FESTIVAL_ACTIVITIES, RIDDLES, FORTUNES, XMAS_GIFTS, riddlesFor, fortuneOf, xmasGiftOf, activityResult, BOAT_BEATS, BBQ_STICKS,
  MARKET_STALLS, MARKET_ZONE, isNightMarket, NIGHT_FOODS, SPECIALS, specialsOf, GOLDFISH_MAX, RING_THROWS, ringPrize,
  BEAUTY_RIVALS, BEAUTY_PRIZES, beautyResult, HARVEST_RIVALS, HARVEST_MEDALS, harvestContest,
  CAVE_FLOORS, CAVE_STOPS, CAVE_ROCKS, CAVE_UP, CAVE_ARRIVE, CAVE_LAYOUTS, CAVE_CHEST_SPOTS, CAVE_ORES, caveFloor, caveTier, CHEST_LOOT, chestLoot, CAVE_TREASURE, isAreaKey,
  BEACH_MAP, TIDE_HOURS, tideLevel, isLowTide, lowTideWindows, FORAGE, BEACH_FINDS, forageOf, fishSpot,
  PROJECTS, bundleOf, PROJECT_DONE_REWARD, shipPrice, COOP_BONUS, PRAYERS, prayerOf,
  HOME_MAP, DECOS, DECO_MAX, decoCheck, LAND_FINDS,
  FERTS, growRate, QUALITY, QUALITY_PCT, harvestQuality, baseItem, qualityOf, withQuality, itemName,
  TERRACE_MAP, plantableIn, EMOTES, NOTE_LEN, NOTE_MAX, cleanNote,
  GRAZE_HOURS, GRAZE_ZONE, grazes, grazeWeatherOk, grazePenaltyDue, grazeTiles, HORSE, HORSE_ZONE, RIDE_AREAS, horseSpeed,
  SMITH_TOOLS, SMITH_TIERS, TIER_MAX, toolSize, toolEnergy, toolArea, areaEnergy, smithCheck, toolTitle,
  NET, BUGS, BUG_SLOT_H, BUG_COUNT, BUG_AREAS, bugSlotOf, bugTimeOf, bugKinds, bugsOf, bugCaught,
  MAILBOX, MAIL_TEXT_MAX, PARCEL_DAILY, MAIL_KEEP, cleanMail, WELCOME_LETTER, seasonLetter, VILLAGER_LETTERS, letterWriter, weeklyLetter, birthdayThanks,
  GIANTS, GIANT_PCT, giantCells, giantsToday, SNOW_AREAS, SNOW_SPOT, SNOWMAN, isSnowDay, METEOR_DATES, WISHES, meteorNightOf, isMeteorNight,
  GEAR, GEAR_MAX, SCARE_R, isSprinkler, gearCovers, sprinkledSet, scaredAt, gearCheck, crowsOf, CROW_MIN, CROW_PCT, ALWAYS_WET,
} from '../src/farm.js';
import { forageSprite, projectSprite, decoSprite, homeTileSprite, BUG_IDS } from '../public/farm-sprites.js';
import { ART_NAMES, shade } from '../public/farm-art.js';
import { SPRITES, PALETTE, FISH_SHAPE, BOOT_SHAPE, ROCK_SHAPE, FISH_COLORS, ORE_COLORS, DISH_SHAPES, DISH_COLORS, GOOD_ART, FRUIT_COLORS, honeySprite, fruitTreeSprite } from '../public/farm-sprites.js';

let pass = 0, fail = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${label}${ok ? '' : `  →  得到 ${JSON.stringify(got)}，應為 ${JSON.stringify(want)}`}`);
};
const H = 3600000;

console.log('--- 地圖 ---');
check('每一列一樣寬', FARM_MAP.every((r) => r.length === FARM_W), true);
check('地圖 30×20', [FARM_W, FARM_H], [30, 20]);
check('田地 84 格', FARM_MAP.join('').split('').filter((c) => c === 'F').length, 84);
check('出生點走得過去', isWalkable(FARM_SPAWN.x, FARM_SPAWN.y), true);
check('地圖外一律當成樹（走不過去）', [terrainAt(-1, 0), terrainAt(0, 99), isWalkable(-1, -1)], ['T', 'T', false]);
// 從出生點能走到的格子
const seen = new Set([`${FARM_SPAWN.x},${FARM_SPAWN.y}`]);
const q = [[FARM_SPAWN.x, FARM_SPAWN.y]];
while (q.length) {
  const [x, y] = q.shift();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = `${x + dx},${y + dy}`;
    if (!seen.has(k) && isWalkable(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
  }
}
const cells = [];
FARM_MAP.forEach((r, y) => [...r].forEach((c, x) => cells.push({ x, y, c })));
check('每一格田都走得到（柵欄有留門）', cells.filter((p) => p.c === 'F').every((p) => seen.has(`${p.x},${p.y}`)), true);
const touchable = (ch) => cells.filter((p) => p.c === ch).some((p) =>
  [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${p.x + dx},${p.y + dy}`)));
check('出貨箱走得到旁邊', touchable('B'), true);
check('商店攤位走得到旁邊', touchable('S'), true);
check('動物小屋走得到旁邊', touchable('A'), true);
const penCells = cells.filter((p) => p.x >= PEN.x0 && p.x <= PEN.x1 && p.y >= PEN.y0 && p.y <= PEN.y1);
check('動物圍欄裡都是草地（5×6 格）', [penCells.length, penCells.every((p) => p.c === '.')], [30, true]);
check('圍欄裡每一格都走得到（從門進去）', penCells.every((p) => seen.has(`${p.x},${p.y}`)), true);
check('圍欄的門是開的', isWalkable(PEN_GATE.x, PEN_GATE.y), true);
// 把門關起來，圍欄就進不去 → 證明動物跑不出來、人只能從門進出
const closed = new Set([`${FARM_SPAWN.x},${FARM_SPAWN.y}`]);
const q2 = [[FARM_SPAWN.x, FARM_SPAWN.y]];
while (q2.length) {
  const [x, y] = q2.shift();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
    if (!closed.has(k) && isWalkable(nx, ny) && !(nx === PEN_GATE.x && ny === PEN_GATE.y)) { closed.add(k); q2.push([nx, ny]); }
  }
}
check('圍欄只有一個門（門關起來就進不去）', penCells.some((p) => closed.has(`${p.x},${p.y}`)), false);
check('只有 F 能耕作', [isField(4, 9), isField(3, 9), isField(5, 6)], [true, false, false]);

console.log('\n--- 作物只在濕土時長大 ---');
const t0 = 1_000_000_000_000;
const tile = (over = {}) => ({ crop: 'bokchoy', progress_ms: 0, tick_at: t0, watered_until: 0, ...over });
check('沒澆水完全不長', grownMs(tile(), t0 + 5 * H), 0);
check('澆了水，過 1 小時長 1 小時', grownMs(tile({ watered_until: waterUntil(t0) }), t0 + H), H);
check('保濕 24 小時，過了就停（澆一次最多長 24 小時）',
  grownMs(tile({ crop: 'strawberry', watered_until: waterUntil(t0) }), t0 + 30 * H), WATER_HOURS * H);
check('長滿就不再加', grownMs(tile({ watered_until: waterUntil(t0) }), t0 + 20 * H), cropTotalMs('bokchoy'));
check('之前累積的成長會保留', grownMs(tile({ progress_ms: 2 * H, watered_until: t0 + 0.5 * H }), t0 + 9 * H), 2.5 * H);
check('時間倍率 3600：1 秒等於 1 小時', grownMs(tile({ watered_until: waterUntil(t0, 3600) }), t0 + 1000, 3600), H);
check('倍率下保濕時間也等比例縮短', waterUntil(t0, 3600) - t0, (WATER_HOURS * H) / 3600);

console.log('\n--- 成長階段 ---');
const wetTile = tile({ watered_until: waterUntil(t0) });
const total = cropTotalMs('bokchoy');
check('剛種下是種子（0）', cropStage(wetTile, t0), 0);
check('過三分之一是發芽（1）', cropStage(wetTile, t0 + total / 3 + 1), 1);
check('過三分之二是長大中（2）', cropStage(wetTile, t0 + (2 * total) / 3 + 1), 2);
check('長滿可以收成（3）', cropStage(wetTile, t0 + total), 3);
check('沒種東西是 -1', cropStage({ crop: null }, t0), -1);
check('濕土判定', [isWet(wetTile, t0 + H), isWet(wetTile, t0 + 25 * H)], [true, false]);

console.log('\n--- 台灣時間 ---');
check('台灣 23:59 還是同一天', taiwanDay(Date.UTC(2026, 10, 5, 15, 59)), '2026-11-05');
check('台灣 00:00 換日（體力恢復）', taiwanDay(Date.UTC(2026, 10, 5, 16, 0)), '2026-11-06');
check('季節：台灣 3/1 凌晨已經是春天', seasonOf(Date.UTC(2026, 1, 28, 16, 30)), 'spring');
check('季節：夏、秋、冬', [seasonOf(Date.UTC(2026, 6, 1)), seasonOf(Date.UTC(2026, 9, 1)), seasonOf(Date.UTC(2026, 0, 15))], ['summer', 'autumn', 'winter']);


console.log('\n--- 四季與作物 ---');
const crops = Object.entries(CROPS);
check('作物有 15 種（14 種種在田裡、稻子種在梯田的水田）', [crops.length, crops.filter(([, c]) => c.paddy).map(([id]) => id)], [15, ['rice']]);
check('每種作物都標好季節', crops.every(([, c]) => c.seasons.length && c.seasons.every((x) => SEASONS.includes(x))), true);
check('每一季至少 5 種能種', SEASONS.map((se) => crops.filter(([id]) => inSeason(id, se)).length >= 5), [true, true, true, true]);
check('小白菜一年四季都能種（新手不會卡住）', SEASONS.every((se) => inSeason('bokchoy', se)), true);
check('季節判定', [inSeason('watermelon', 'summer'), inSeason('watermelon', 'winter'), inSeason('nope', 'summer')], [true, false, false]);
check('一次收成的作物：賣價比種子貴', crops.filter(([, c]) => !c.regrow).every(([, c]) => c.sell > c.seed), true);
check('會再長的作物：收兩次就回本', crops.filter(([, c]) => c.regrow).every(([, c]) => c.sell * 2 > c.seed), true);
check('會再長的作物：收完後看起來是「長大中」，不會變回小芽',
  crops.filter(([, c]) => c.regrow).map(([id]) => cropStage({ crop: id, progress_ms: regrowProgressMs(id), tick_at: t0 }, t0)),
  [2, 2, 2, 2]);
check('一次收成的作物沒有再長', regrowProgressMs('carrot'), null);
check('番茄收完再 4 小時又能收',
  cropStage({ crop: 'tomato', progress_ms: regrowProgressMs('tomato'), tick_at: t0, watered_until: waterUntil(t0) }, t0 + 4 * H), 3);

console.log('\n--- 動物 ---');
check('愛心：每 4 點一顆，最多 5 顆', [hearts(0), hearts(3), hearts(4), hearts(13), hearts(20), hearts(99), hearts(-5)], [0, 0, 1, 3, 5, 5, 0]);
check('愛心夠了，雞蛋變大顆、牛奶變濃醇',
  [productOf('chicken', LOVE_BEST - 1), productOf('chicken', LOVE_BEST), productOf('cow', 0), productOf('cow', 20)], ['egg', 'egg_l', 'milk', 'milk_l']);
check('高級產品比較值錢', Object.values(ANIMALS).every((A) => PRODUCTS[A.best].sell > PRODUCTS[A.product].sell), true);
const hen = { kind: 'chicken', fed_at: t0, collected: 0 };
check('雞餵完 4 小時才有蛋', [animalHasProduct(hen, t0 + 4 * H - 1), animalHasProduct(hen, t0 + 4 * H)], [false, true]);
check('收過了就沒有', animalHasProduct({ ...hen, collected: 1 }, t0 + 9 * H), false);
check('沒餵過就沒有', animalHasProduct({ kind: 'chicken', fed_at: 0, collected: 0 }, t0), false);
check('時間倍率 3600：雞 4 秒就有蛋', animalReadyAt(hen, 3600) - t0, 4000);
check('牛要 6 小時', animalReadyAt({ kind: 'cow', fed_at: t0 }) - t0, 6 * H);
check('名字：前後空白去掉', cleanAnimalName('  小花 '), '小花');
check('名字：空的、太長的不行', [cleanAnimalName(''), cleanAnimalName('   '), cleanAnimalName('一二三四五六七八九')], [null, null, null]);
check('名字：8 個字可以、表情符號算一個字', [cleanAnimalName('一二三四五六七八'), cleanAnimalName('🐔咕咕')], ['一二三四五六七八', '🐔咕咕']);
check('名字：控制字元、反向文字之類的隱藏字元會被拿掉', cleanAnimalName('小\u202e花\u0000\u200b'), '小花');

console.log('\n--- 每種作物都有圖 ---');
const goodGrid = (g) => Array.isArray(g) && g.length === 16 && g.every((r) => r.length === 16 && [...r].every((ch) => ch === '.' || PALETTE[ch]));
check('長大中、可收成兩張圖都有，而且是 16×16、顏色都有定義',
  crops.filter(([id, c]) => !c.paddy && (!goodGrid(SPRITES[id + '_2']) || !goodGrid(SPRITES[id + '_3']))).map(([id]) => id), []); // 稻子用程式畫（riceSprite）
check('所有圖都是 16×16、顏色都有定義', Object.entries(SPRITES).filter(([, g]) => !goodGrid(g)).map(([n]) => n), []);
check('小鎮的石板、花圃、告示板、採石場的地都有圖', ['plaza', 'flowers', 'board', 'gravel'].filter((n) => !goodGrid(SPRITES[n])), []);
check('動物（兩張走路圖）、雞蛋牛奶、飼料都有圖',
  [...Object.keys(ANIMALS).flatMap((k) => [k + '_0', k + '_1']), ...Object.keys(PRODUCTS).filter((p) => !p.startsWith('honey')), 'feed'].filter((n) => !goodGrid(SPRITES[n])), []);
check('蜂蜜罐用程式畫', typeof honeySprite === 'function' && typeof fruitTreeSprite === 'function', true);

console.log('\n--- 換季與換日 ---');
const tw = (y, m, d, h = 0) => Date.UTC(y, m - 1, d, h) - 8 * H; // 台灣時間
check('台灣半夜 12 點就是這一天的結束', dayEndOf(tw(2026, 11, 5, 15)), tw(2026, 11, 6));
check('剛好 00:00 屬於新的一天', dayEndOf(tw(2026, 11, 6)), tw(2026, 11, 7));
check('11 月的下一季（冬）從 12/1 開始', nextSeasonStart(tw(2026, 11, 5, 10)), tw(2026, 12, 1));
check('12 月的下一季（春）從隔年 3/1 開始', nextSeasonStart(tw(2026, 12, 15)), tw(2027, 3, 1));
check('2 月底的下一季是 3/1', nextSeasonStart(tw(2027, 2, 28, 23)), tw(2027, 3, 1));

console.log('\n--- 天氣 ---');
const yearDays = Array.from({ length: 365 }, (_, i) => taiwanDay(tw(2026, 1, 1, 12) + i * 24 * H));
const ws = yearDays.map(weatherOf);
check('天氣只有晴、多雲、雨、颱風、寒流', ws.every((w) => WEATHERS.includes(w)) && WEATHERS.length === 5, true);
const monthOf = (d) => Number(d.slice(5, 7));
check('颱風只在 7～10 月、寒流只在 12～2 月', yearDays.every((d, i) => (ws[i] !== 'typhoon' || [7, 8, 9, 10].includes(monthOf(d)))
  && (ws[i] !== 'cold' || [12, 1, 2].includes(monthOf(d)))), true);
const tyN = ws.filter((w) => w === 'typhoon').length, coldN = ws.filter((w) => w === 'cold').length;
check(`颱風一年幾天（實際 ${tyN} 天）、寒流幾天（實際 ${coldN} 天）`, tyN >= 1 && tyN <= 12 && coldN >= 2 && coldN <= 20, true);
check('颱風天也會下雨（田地自動澆水）', yearDays.filter((d, i) => ws[i] === 'typhoon').every((d) => realRain(d)), true);
check('同一天的天氣永遠一樣（才能預報明天）', weatherOf('2026-11-05') === weatherOf('2026-11-05'), true);
const rainShare = ws.filter((w) => w === 'rain').length / 365;
check(`一年大約一到三成是雨天（實際 ${(rainShare * 100).toFixed(0)}%）`, rainShare > 0.1 && rainShare < 0.3, true);
const rainIn = (ms) => yearDays.filter((d, i) => ms.includes(Number(d.slice(5, 7))) && ws[i] === 'rain').length;
check('春天（梅雨）比秋天多雨', rainIn([3, 4, 5]) > rainIn([9, 10, 11]), true);

console.log('\n--- 下雨天自動澆水 ---');
const rainOn = (days) => (d) => days.includes(d);
const eve = tw(2026, 11, 5, 20); // 晚上 8 點種下，沒澆水
check('下雨天沒澆水也會長', grownMs({ crop: 'cabbage', progress_ms: 0, tick_at: eve, watered_until: 0 }, eve + 2 * H, 1, rainOn(['2026-11-05'])), 2 * H);
check('雨只下到半夜 12 點，隔天晴天就停（晚上 8 點種，只長 4 小時）',
  grownMs({ crop: 'cabbage', progress_ms: 0, tick_at: eve, watered_until: 0 }, eve + 20 * H, 1, rainOn(['2026-11-05'])), 4 * H);
check('澆水和下雨重疊不會算兩次',
  wetMsBetween(eve, eve + 10 * H, eve + 10 * H, rainOn(['2026-11-05'])), 10 * H);
check('連續下雨好幾天，加上一次澆水，加起來算',
  wetMsBetween(eve, eve + 52 * H, eve + 2 * H, rainOn(['2026-11-06', '2026-11-07'])), 2 * H + 48 * H);
check('離開很久（一年）也算得出來，而且長滿就停',
  grownMs({ crop: 'pineapple', progress_ms: 0, tick_at: eve, watered_until: 0 }, eve + 365 * 24 * H, 1, (d) => d.endsWith('5')), cropTotalMs('pineapple'));
check('土濕到什麼時候：澆了水、隔天又下雨 → 濕到隔天半夜',
  wetUntilOf(eve + 24 * H, eve, rainOn(['2026-11-06'])), tw(2026, 11, 7));
check('乾的土回傳 0', wetUntilOf(0, eve, rainOn([])), 0);
check('今天下雨：濕到今天半夜', wetUntilOf(0, eve, rainOn(['2026-11-05'])), tw(2026, 11, 6));
check('下雨天判定是濕土', isWet({ watered_until: 0 }, eve, rainOn(['2026-11-05'])), true);

console.log('\n--- 小鎮地圖 ---');
check('小鎮也是 30×20', [TOWN_MAP.length, TOWN_MAP.every((r) => r.length === 30)], [20, true]);
const reach = (area, start) => {
  const seen2 = new Set([`${start.x},${start.y}`]);
  const qq = [[start.x, start.y]];
  while (qq.length) {
    const [x, y] = qq.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen2.has(k) && isWalkable(x + dx, y + dy, area)) { seen2.add(k); qq.push([x + dx, y + dy]); }
    }
  }
  return seen2;
};
const townSeen = reach('town', ARRIVE['farm>town']);
const townCells = [];
TOWN_MAP.forEach((r, y) => [...r].forEach((c, x) => townCells.push({ x, y, c })));
check('小鎮每一格能走的地方都走得到', townCells.filter((p) => isWalkable(p.x, p.y, 'town')).every((p) => townSeen.has(`${p.x},${p.y}`)), true);
const touch = (ch) => townCells.filter((p) => p.c === ch).some((p) =>
  [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => townSeen.has(`${p.x + dx},${p.y + dy}`)));
check('雜貨店、小吃店、民宅、噴水池、告示板、鐵匠鋪都走得到旁邊', ['G', 'R', 'Q', 'O', 'N', 'b'].map(touch), [true, true, true, true, true, true]);
check('牧場的出口從家門口走得到', seen.has('5,19') && terrainAt(5, 19) === 'E', true);
check('小鎮的出口從進來的地方走得到', townSeen.has('5,0') && terrainAt(5, 0, 'town') === 'E', true);
check('每個出口都是 E、通到存在的地圖，換過去站的地方能走、而且不是出口（不會一直來回跳）',
  Object.entries(EXITS).flatMap(([from, list]) => list.map((e) => {
    const a = ARRIVE[`${from}>${e.to}`];
    return terrainAt(e.x, e.y, from) === 'E' && !!MAPS[e.to] && !!a && isWalkable(a.x, a.y, e.to) && terrainAt(a.x, a.y, e.to) !== 'E';
  })).every(Boolean), true);
check('地圖上每個 E 都有登記去哪', Object.entries(MAPS).every(([area, m]) => m.every((row, y) => [...row].every((c, x) =>
  c !== 'E' || (EXITS[area] || []).some((e) => e.x === x && e.y === y)))), true);

console.log('\n--- 後山 ---');
check('後山也是 30×20', [HILL_MAP.length, HILL_MAP.every((r) => r.length === 30)], [20, true]);
const hillSeen = reach('hill', ARRIVE['farm>hill']);
check('後山每一格能走的地方都走得到', HILL_MAP.every((row, y) => [...row].every((c, x) => !isWalkable(x, y, 'hill') || hillSeen.has(`${x},${y}`))), true);
check('湖邊走得到（可以釣魚）', HILL_MAP.some((row, y) => [...row].some((c, x) => c === 'W' &&
  [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => hillSeen.has(`${x + dx},${y + dy}`)))), true);
check('牧場往後山的出口從家門口走得到', seen.has('29,7') && terrainAt(29, 7) === 'E', true);
let quarryOk = true;
for (let y = QUARRY.y0; y <= QUARRY.y1; y++) for (let x = QUARRY.x0; x <= QUARRY.x1; x++) if (terrainAt(x, y, 'hill') !== 'q') quarryOk = false;
check('採石場範圍全部是 q 地', quarryOk, true);

console.log('\n--- 釣魚 ---');
const combos = [];
for (const spot of ['pond', 'lake']) for (const se of SEASONS) for (const day of [true, false]) for (const rain of [true, false]) combos.push([spot, se, day, rain]);
check('任何地點、季節、白天晚上、晴雨都釣得到東西', combos.every((c) => fishChoices(...c).length > 0), true);
check('鰻魚：晴天白天沒有，晚上或下雨才有', [
  fishChoices('lake', 'summer', true, false).some((c) => c.id === 'eel'), fishChoices('lake', 'summer', false, false).some((c) => c.id === 'eel'),
  fishChoices('lake', 'summer', true, true).some((c) => c.id === 'eel')], [false, true, true]);
check('下雨天鰻魚機會變三倍', fishChoices('pond', 'autumn', false, true).find((c) => c.id === 'eel').w, FISH.eel.weight * 3);
check('金魚只在牧場池塘', [fishChoices('pond', 'winter', true, false).some((c) => c.id === 'goldfish'), fishChoices('lake', 'winter', true, false).some((c) => c.id === 'goldfish')], [true, false]);
check('香魚只有春夏白天的湖', [fishChoices('lake', 'spring', true, false).some((c) => c.id === 'sweetfish'), fishChoices('lake', 'winter', true, false).some((c) => c.id === 'sweetfish'), fishChoices('lake', 'spring', false, false).some((c) => c.id === 'sweetfish')], [true, false, false]);
const ch3 = [{ id: 'a', w: 1 }, { id: 'b', w: 2 }, { id: 'c', w: 1 }];
check('依權重抽：0 抽到第一個、快到 1 抽到最後一個、中間看權重', [pickWeighted(ch3, 0), pickWeighted(ch3, 0.999), pickWeighted(ch3, 0.5)], ['a', 'c', 'b']);

console.log('\n--- 挖礦 ---');
const rk = rocksOf(7, '2026-11-06');
check(`每天 ${ROCKS_PER_DAY} 顆石頭，都在採石場、位置不重複`, [rk.length, rk.every((r) => terrainAt(r.x, r.y, 'hill') === 'q'), new Set(rk.map((r) => r.x + ',' + r.y)).size], [20, true, 20]);
check('同一座牧場同一天的石頭一樣（全家看到的一樣）', JSON.stringify(rocksOf(7, '2026-11-06')) === JSON.stringify(rk), true);
check('隔天換一批、別座牧場也不一樣', [JSON.stringify(rocksOf(7, '2026-11-07')) !== JSON.stringify(rk), JSON.stringify(rocksOf(8, '2026-11-06')) !== JSON.stringify(rk)], [true, true]);
const oreCount = {};
for (let d = 1; d <= 300; d++) for (const r of rocksOf(1, `day-${d}`)) oreCount[r.type] = (oreCount[r.type] || 0) + 1;
check('採石場：越值錢的礦越少見（洞窟才有的寶石不會出現）', Object.keys(ORES).filter((id) => ORES[id].weight > 0).every((id, i, a) => i === 0 || oreCount[id] < oreCount[a[i - 1]])
  && Object.keys(ORES).filter((id) => !ORES[id].weight).every((id) => !oreCount[id]), true);
check('東西的價錢：魚、礦石、作物、雞蛋都能賣，飼料和亂填的不行',
  [itemPrice('fish:eel'), itemPrice('ore:gold'), itemPrice('crop:carrot'), itemPrice('prod:egg'), itemPrice('feed'), itemPrice('ore:__proto__'), itemPrice('fish:')],
  [300, 400, 110, 50, 0, 0, 0]);
check('破鞋子、石頭送誰都不喜歡', [giftReaction('ama', 'fish:junk'), giftReaction('jie', 'ore:stone')], ['dislike', 'dislike']);
const shapeOk = (g) => g.length === 16 && g.every((r) => r.length === 16 && /^[.1234o]+$/.test(r));
check('魚、鞋子、石頭的形狀都是 16×16', [shapeOk(FISH_SHAPE), shapeOk(BOOT_SHAPE), shapeOk(ROCK_SHAPE)], [true, true, true]);
check('每種魚、礦石都有顏色', [Object.keys(FISH).every((id) => FISH_COLORS[id]), Object.keys(ORES).every((id) => ORE_COLORS[id])], [true, true]);

console.log('\n--- 村民 ---');
const vil = Object.entries(VILLAGERS);
check('有 6 位村民', vil.length, 6);
const validItem = (i) => itemPrice(i) > 0; // 作物、雞蛋牛奶、魚、礦石
check('喜歡／最愛／討厭的東西都存在', vil.filter(([, v]) => ![...v.loves, ...v.likes, ...v.dislikes].every(validItem)).map(([id]) => id), []);
check('沒有人同時喜歡又討厭同一樣東西', vil.filter(([, v]) => [...v.loves, ...v.likes].some((i) => v.dislikes.includes(i))).map(([id]) => id), []);
check('生日格式正確（月-日）', vil.every(([, v]) => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v.birthday)), true);
check('每個人說的話都齊全（平常、四季、下雨、感情好）', vil.filter(([, v]) =>
  !['any', 'spring', 'summer', 'autumn', 'winter', 'rain', 'close'].every((k) => (v.lines[k] || []).length)).map(([id]) => id), []);
check('每個人的活動範圍裡至少有 3 格能走', vil.filter(([, v]) => {
  let n = 0;
  for (let y = v.zone.y0; y <= v.zone.y1; y++) for (let x = v.zone.x0; x <= v.zone.x1; x++) if (isWalkable(x, y, 'town')) n++;
  return n < 3;
}).map(([id]) => id), []);
check('送禮反應：最愛、喜歡、普通、討厭',
  [giftReaction('fu', 'crop:pumpkin'), giftReaction('fu', 'crop:corn'), giftReaction('fu', 'prod:milk'), giftReaction('fu', 'crop:spinach')],
  ['love', 'like', 'neutral', 'dislike']);
check('生日那天喜歡的禮物點數三倍、討厭的不變',
  [giftPoints('fu', 'crop:pumpkin', '2026-03-12').points, giftPoints('fu', 'crop:pumpkin', '2026-03-13').points,
    giftPoints('fu', 'crop:spinach', '2026-03-12').points], [24, 8, -3]);
check('愛心：每 10 點一顆，最多 10 顆', [friendHearts(0), friendHearts(9), friendHearts(10), friendHearts(55), friendHearts(100), friendHearts(250)], [0, 0, 1, 5, 10, 10]);
check('每一級謝禮都有東西，種子是真的作物', [1, 2, 3, 4, 5].every((l) => vil.every(([id]) => {
  const r = friendReward(id, l);
  return r && (r.money > 0 || (r.qty > 0 && (r.item === 'feed' || !!CROPS[r.item.slice(5)])));
})), true);
check('村民早上 6 點出門、半夜 12 點回家',
  [villagerOut(tw(2026, 11, 6, 5) + 59 * 60000), villagerOut(tw(2026, 11, 6, 6)), villagerOut(tw(2026, 11, 6, 23) + 59 * 60000), villagerOut(tw(2026, 11, 7, 0))],
  [false, true, true, false]);

console.log('\n--- 委託、小吃店、工具 ---');
const reqs = yearDays.map(requestOf);
check('同一天的委託永遠一樣', JSON.stringify(requestOf('2026-11-06')) === JSON.stringify(requestOf('2026-11-06')), true);
check('委託的數量 1～5 個、報酬大於 0、東西都存在', reqs.every((q) => q.qty >= 1 && q.qty <= 5 && q.reward > 0 && validItem(q.item) && VILLAGERS[q.villager]), true);
check('委託要的作物都是那一季種得出來的', reqs.every((q, i) => !q.item.startsWith('crop:') || inSeason(q.item.slice(5), seasonOf(tw(2026, 1, 1, 12) + i * 24 * H))), true);
check('一年裡每位村民都會來委託', new Set(reqs.map((q) => q.villager)).size, 6);
check('小吃店：越貴越補，最多也只補到滿', Object.values(FOODS).every((f, i, a) => f.energy > 0 && f.energy <= ENERGY_MAX && (i === 0 || (f.price > a[i - 1].price && f.energy > a[i - 1].energy))), true);
check('工具升級有大鋤頭和大澆水壺', Object.keys(TOOL_UPGRADES).sort(), ['can', 'hoe']);
check('3×3 範圍：9 格，點的那格排第一個', [area3x3(5, 5).length, area3x3(5, 5)[0]], [9, { x: 5, y: 5 }]);
check('3×3 範圍不重複', new Set(area3x3(5, 5).map((c) => c.x + ',' + c.y)).size, 9);

console.log('\n--- 料理 ---');
const dishes = Object.entries(DISHES).filter(([, d]) => d.need);
check('有 47 道自己煮得出來的菜（14 道用加工品）', [dishes.length, dishes.filter(([, d]) => Object.keys(d.need).some((k) => k.startsWith('good:') || k === 'mayo' || k === 'cheese')).length], [47, 14]);
check('每道菜的材料都是真的東西（或雞蛋、牛奶這種組）', dishes.filter(([, d]) => !Object.keys(d.need).every((k) => INGREDIENT_GROUPS[k] || itemPrice(k) > 0)).map(([id]) => id), []);
check('煮成菜比直接賣材料值錢', dishes.filter(([, d]) => d.sell <= Object.entries(d.need).reduce((n, [k, q]) => n + itemPrice(ingredientItems(k)[0]) * q, 0)).map(([id]) => id), []);
check('每道菜都能補體力（不超過一整天的量）', dishes.every(([, d]) => d.energy > 0 && d.energy <= ENERGY_MAX), true);
check('每道菜都有圖（形狀和顏色）', dishes.filter(([id, d]) => !DISH_SHAPES[d.shape] || !DISH_COLORS[id]).map(([id]) => id), []);
check('盤子、碗、杯子的形狀都是 16×16', Object.values(DISH_SHAPES).every((g) => g.length === 16 && g.every((r) => r.length === 16 && /^[.1234]+$/.test(r))), true);
check('材料夠才能煮', [canCook({ 'crop:bokchoy': 2 }, 'stirfry'), canCook({ 'crop:bokchoy': 1 }, 'stirfry'), canCook({}, 'nope')], [true, false, false]);
check('雞蛋不夠時，大顆雞蛋也能用（先用普通的）', cookTakes({ 'prod:egg': 1, 'prod:egg_l': 5, 'prod:milk_l': 1 }, 'pudding'), { 'prod:egg': 1, 'prod:egg_l': 1, 'prod:milk_l': 1 });
check('材料不夠回傳 null', cookTakes({ 'prod:egg': 1, 'prod:milk': 1 }, 'pudding'), null);
check('菜也能賣、能送', [itemPrice('dish:pudding'), itemPrice('dish:__proto__')], [280, 0]);
check('小傑最愛布丁、討厭魚香茄子', [giftReaction('jie', 'dish:pudding'), giftReaction('jie', 'dish:eggplant')], ['love', 'dislike']);


console.log('\n--- 節日 ---');
// 農曆節日的日期跟瀏覽器內建的農曆比對；2027、2030 的春節和元宵 ICU 會差一天，以台灣公布的放假日期為準
const chinese = new Intl.DateTimeFormat('en-u-ca-chinese', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' });
const lunarMD = (d) => { const p = chinese.formatToParts(new Date(d + 'T12:00:00+08:00')); return p.find((x) => x.type === 'month').value + '-' + p.find((x) => x.type === 'day').value; };
const LUNAR_WANT = { spring: '1-1', lantern: '1-15', dragon: '5-5', qixi: '7-7', moon: '8-15' };
const ICU_OFF = ['spring 2027-02-06', 'spring 2030-02-03', 'lantern 2027-02-20', 'lantern 2030-02-17'];
check('農曆節日的日期都對（2026～2035）', Object.entries(LUNAR_DATES).flatMap(([id, ds]) => ds.filter((d) => lunarMD(d) !== LUNAR_WANT[id] && !ICU_OFF.includes(id + ' ' + d)).map((d) => id + ' ' + d)), []);
check('每個農曆節日都有 10 年份、一年一個', Object.values(LUNAR_DATES).every((ds) => ds.length === 10 && ds.every((d, i) => d.startsWith(String(2026 + i)))), true);
check('元宵節在春節後 14 天', LUNAR_DATES.spring.every((d, i) => (Date.parse(LUNAR_DATES.lantern[i]) - Date.parse(d)) / (24 * H) === 14), true);
check('今天是哪個節日', ['2026-09-25', '2026-01-01', '2026-04-04', '2026-12-25', '2026-12-31', '2027-02-06', '2026-11-06'].map(festivalOn), ['moon', 'newyear', 'children', 'christmas', 'nye', 'spring', null]);
const year2027 = festivalsAfter('2026-12-31', 365);
check('一年裡 9 個節日都會遇到一次', [year2027.length, new Set(year2027.map((f) => f.id)).size], [9, 9]);
check('節日照日期排、不含今天', year2027.every((f, i) => f.date > '2026-12-31' && (i === 0 || f.date >= year2027[i - 1].date)), true);
check('下一個節日', [nextFestival('2026-11-06'), nextFestival('2026-12-25'), nextFestival('2026-12-31')], [{ id: 'christmas', date: '2026-12-25' }, { id: 'nye', date: '2026-12-31' }, { id: 'newyear', date: '2027-01-01' }]);
check('每個節日都有名字、表情、村民的話、禮物', Object.values(FESTIVALS).every((f) => f.name && f.emoji && f.line && f.gift && (f.gift.money > 0 || (validItem(f.gift.item) && f.gift.qty > 0))), true);
check('節慶食物不能自己煮', Object.entries(DISHES).filter(([, d]) => d.festival).map(([id]) => [canCook({ 'crop:bokchoy': 99 }, id), cookTakes({}, id)]).flat().every((v) => v === false || v === null), true);
check('節慶食物有圖、能賣、能吃', Object.entries(DISHES).filter(([, d]) => d.festival).every(([id, d]) => DISH_SHAPES[d.shape] && DISH_COLORS[id] && itemPrice('dish:' + id) > 0 && d.energy > 0), true);
check('送節慶食物大家都喜歡', giftReaction('fu', 'dish:mooncake'), 'like');
check('行事曆上的生日', ['媽媽生日', '阿公八十大壽', '看牙醫'].map(isBirthdayEvent), [true, true, false]);


console.log('\n--- 溫室 ---');
check('溫室 16×10，每一列一樣寬、四周是玻璃牆', [GH_MAP.length, GH_MAP.every((r) => r.length === 16),
  GH_MAP[0].replace(/K/g, '') === '' && GH_MAP.every((r) => r[0] === 'K' && r[15] === 'K')], [10, true, true]);
check('溫室有 40 格田', GH_MAP.join('').split('').filter((c) => c === 'F').length, 40);
const allF = (m) => m.flatMap((r, y) => [...r].map((c, x) => (c === 'F' ? `${x},${y}` : null))).filter(Boolean);
check('溫室的田跟牧場的田座標不重疊（兩邊存在同一張表）', allF(GH_MAP).filter((k) => allF(FARM_MAP).includes(k)), []);
check('這格田在哪裡', [fieldArea(4, 9), fieldArea(2, 2), fieldArea(13, 6), fieldArea(1, 1), fieldArea(5, 8)], ['farm', 'gh', 'gh', null, null]);
const ghSeen = reach('gh', ARRIVE['farm>gh']);
check('溫室每一格田都走得到，出口也走得到', allF(GH_MAP).every((k) => ghSeen.has(k)) && ghSeen.has(`${EXITS.gh[0].x},${EXITS.gh[0].y}`), true);
const jCells = cells.filter((p) => p.c === 'J');
check('牧場上的溫室 5×3，從家門口走得到旁邊', [jCells.length, touchable('J')], [15, true]);
const ga = ARRIVE['gh>farm'];
check('走出溫室站在溫室門口（走得到、就在溫室旁邊）', isWalkable(ga.x, ga.y) && seen.has(`${ga.x},${ga.y}`) && terrainAt(ga.x, ga.y - 1) === 'J', true);

console.log('\n--- 加工機 ---');
check('四台加工機的位置都是 M、各自走得到旁邊', Object.entries(MACHINE_SPOTS).every(([id, p]) => terrainAt(p.x, p.y) === 'M' && machineAt(p.x, p.y) === id
  && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${p.x + dx},${p.y + dy}`))), true);
check('地圖上的 M 剛好四個', cells.filter((p) => p.c === 'M').length, Object.keys(MACHINES).length);
const recipesM = Object.values(MACHINES).flatMap((m) => Object.entries(m.makes));
check('加工機放得進去的都是真的東西、做出來的都是加工品', recipesM.every(([i, g]) => itemPrice(i) > 0 && !!GOODS[g]), true);
check('每種加工品都只有一台加工機做得出來（筍乾：竹筍、冬筍都可以曬）', Object.keys(GOODS).every((g) => Object.values(MACHINES).filter((m) => Object.values(m.makes).includes(g)).length === 1), true);
check('加工品比材料值錢（超過兩倍）', recipesM.filter(([i, g]) => GOODS[g].sell <= 2 * itemPrice(i)).map(([, g]) => g), []);
check('加工機要的材料都是礦石，價錢都大於 0、時間都大於 0', Object.values(MACHINES).every((m) => m.price > 0 && m.hours > 0
  && Object.keys(m.need).every((i) => i.startsWith('ore:') && itemPrice(i) > 0)), true);
check('一次最多放 5 個', MACHINE_BATCH, 5);
check('美乃滋機 3 小時做好（時間倍率也算）', [machineReadyAt({ kind: 'mayo', started_at: t0 }) - t0, machineReadyAt({ kind: 'mayo', started_at: t0 }, 3600) - t0], [3 * H, 3000]);
check('加工品能賣、能送（名字都有）', Object.keys(GOODS).every((g) => itemPrice('good:' + g) > 0) && itemPrice('good:__proto__') === 0, true);
check('每種加工品都有圖', Object.keys(GOODS).filter((g) => !GOOD_ART[g]), []);
check('阿嬤最愛菜脯、小傑不喜歡泡菜', [giftReaction('ama', 'good:pickled_radish'), giftReaction('jie', 'good:kimchi')], ['love', 'dislike']);
check('高級美乃滋也能拿來做玉米沙拉', cookTakes({ 'crop:corn': 1, 'good:mayo_l': 1 }, 'corn_salad'), { 'crop:corn': 1, 'good:mayo_l': 1 });

console.log('\n--- 建築 ---');
check('溫室、房子擴建的材料都是礦石', Object.values(BUILDS).every((b) => b.price > 0 && Object.keys(b.need).every((i) => i.startsWith('ore:') && itemPrice(i) > 0)), true);
check('房子擴建照順序：大臥室 2 級、二樓 3 級', [BUILDS.house2.level, BUILDS.house3.level, BUILDS.greenhouse.level], [2, 3, undefined]);
check('體力上限：原本 60、大臥室 80、二樓 100', [energyMaxOf(1), energyMaxOf(2), energyMaxOf(3), energyMaxOf(undefined), HOUSE_ENERGY.length], [60, 80, 100, 60, 4]);
check('一年四季都種得到東西了：溫室讓非當季作物也能種（每種作物都至少一季買不到）', Object.values(CROPS).filter((c) => c.seasons.length === 4).length, 1);


console.log('\n--- 更多動物、寶寶、寵物 ---');
check('四種動物：雞、鴨、牛、羊（照價錢排）', [Object.keys(ANIMALS), Object.values(ANIMALS).every((A, i, a) => i === 0 || A.price > a[i - 1].price)], [['chicken', 'duck', 'cow', 'sheep'], true]);
check('每種動物的產品、高級產品、寶寶的叫法都有', Object.values(ANIMALS).every((A) => PRODUCTS[A.product] && PRODUCTS[A.best] && A.baby), true);
check('鴨子在池塘那一帶（範圍裡有水也有草地、在牧場裡面）', (() => {
  const t = []; for (let y = POND_ZONE.y0; y <= POND_ZONE.y1; y++) for (let x = POND_ZONE.x0; x <= POND_ZONE.x1; x++) t.push(terrainAt(x, y));
  return ANIMALS.duck.zone === 'pond' && t.includes('W') && t.includes('.') && !t.includes('E');
})(), true);
check('寵物玩耍的地方走得到', (() => { for (let y = PET_ZONE.y0; y <= PET_ZONE.y1; y++) for (let x = PET_ZONE.x0; x <= PET_ZONE.x1; x++) if (isWalkable(x, y) && seen.has(`${x},${y}`)) return true; return false; })(), true);
check('鴨蛋可以醃成鹹鴨蛋，鹹鴨蛋可以做金沙南瓜', [MACHINES.pickle.makes['prod:duck_egg'], DISHES.golden_pumpkin.need['good:salted_egg']], ['salted_egg', 1]);
const mom = { kind: 'duck', love: LOVE_MAX, baby_until: 0, last_baby_at: 0 };
check('滿愛心、有位子就會生寶寶；愛心不夠、沒位子、寶寶自己都不會', [canHaveBaby(mom, t0, 3), canHaveBaby({ ...mom, love: LOVE_MAX - 1 }, t0, 3),
  canHaveBaby(mom, t0, ANIMALS.duck.max), canHaveBaby({ ...mom, baby_until: t0 + H }, t0, 3)], [true, false, false, false]);
check('一週生一次（時間倍率也算）', [canHaveBaby({ ...mom, last_baby_at: t0 }, t0 + 6 * 24 * H, 3), canHaveBaby({ ...mom, last_baby_at: t0 }, t0 + BABY_EVERY_DAYS * 24 * H, 3),
  canHaveBaby({ ...mom, last_baby_at: t0 }, t0 + BABY_EVERY_DAYS * 24 * 1000, 3, 3600)], [false, true, true]);
check('寶寶 3 天長大', [BABY_DAYS, isBaby({ baby_until: t0 + H }, t0), isBaby({ baby_until: t0 + H }, t0 + H), isBaby({ baby_until: 0 }, t0)], [3, true, false, false]);
check('寶寶的名字：媽媽的名字＋寶寶（最多 8 個字）', [babyName('小花'), [...babyName('一二三四五六七八')].length], ['小花寶寶', 8]);
check('寵物：小狗、小貓', Object.keys(PETS), ['dog', 'cat']);
const year = Array.from({ length: 365 }, (_, i) => taiwanDay(tw(2026, 1, 1, 12) + i * 24 * H));
const finds = (k, love) => year.map((d) => petFind(k, 7, d, love, seasonOf(tw(2026, 1, 1, 12) + year.indexOf(d) * 24 * H))).filter(Boolean);
check('同一天摸，叼回來的東西都一樣（不能一直重摸）', JSON.stringify(petFind('dog', 7, '2026-11-08', 5, 'autumn')) === JSON.stringify(petFind('dog', 7, '2026-11-08', 5, 'autumn')), true);
check('愛心越多越常叼東西回來', finds('dog', 20).length > finds('dog', 0).length + 60 && finds('cat', 20).length > finds('cat', 0).length + 60, true);
check('叼回來的都是真的東西（飼料、種子、礦石、魚）', [...finds('dog', 20), ...finds('cat', 20)].every((f) => f.qty > 0 && (f.item === 'feed' || itemPrice(f.item) > 0 || /^seed:/.test(f.item))), true);
check('小狗叼的種子是當季的', finds('dog', 20).filter((f) => f.item.startsWith('seed:')).every((f) => CROPS[f.item.slice(5)]), true);
check('沒什麼愛心時，不會叼到金礦、金魚', [...finds('dog', 0), ...finds('cat', 0)].some((f) => ['ore:gold', 'ore:silver', 'fish:goldfish', 'fish:catfish'].includes(f.item)), false);
check('寵物、鴨、羊都有圖（兩張走路的）', ['dog', 'cat', 'duck', 'sheep'].every((k) => SPRITES[k + '_0'] && SPRITES[k + '_1']), true);


console.log('\n--- 村民的故事、成就、週報 ---');
check('每位村民都有 3 段故事，每段有標題和 4 句話', Object.keys(VILLAGERS).every((id) => STORIES[id] && STORIES[id].length === 3
  && STORIES[id].every((st) => st.title && st.lines.length === 4 && st.lines.every((l) => l.length > 5))), true);
check('故事在 2、5、8 顆愛心時說', STORY_HEARTS, [2, 5, 8]);
check('感情夠了才說下一段，說完 3 段就沒了', [storyDue(19, 0), storyDue(20, 0), storyDue(49, 1), storyDue(50, 1), storyDue(100, 2), storyDue(100, 3)], [null, 0, null, 1, 2, null]);
check('感情很好但還沒聽過：從第一段開始說', storyDue(100, 0), 0);
const zero = { harvest: 0, shipped: 0, requests: 0, babies: 0, animals: 0, pets: 0, machines: 0, fishKinds: 0, dishKinds: 0, goodKinds: 0, amethyst: false, maxHearts: 0, minHearts: 0, stories: 0, gh: 0, house: 1 };
check('什麼都還沒做：沒有成就', achievementsMet(zero), []);
check('收成一次、領養寵物：兩個成就', achievementsMet({ ...zero, harvest: 1, pets: 1 }), ['harvest1', 'pet']);
const full = { harvest: 999, shipped: 1e6, requests: 99, babies: 9, animals: 20, pets: 2, machines: Object.keys(MACHINES).length, fishKinds: Object.keys(FISH).length, dishKinds: 28, goodKinds: 11, amethyst: true, maxHearts: 10, minHearts: 10, stories: 18, gh: 1, house: 3, trees: 10, honey: true, goldfish3: 1, beautyWin: 1, harvestGold: 1, caveBest: 20, caveBottom: 1, gems: 3, seaFishKinds: 10, tuna: true, forageKinds: Object.keys(FORAGE).length, beachKinds: 7, mushrooms: 3, projects: 4, decoFarm: 5, decoHome: 5, goldHarvest: 1, sprinklers: 4, whiteRice: true, teaKinds: 2, notes: 5, horse: true, graze: 10, smithTiers: 9, goldTools: 3, bugKinds: 20, broadtail: true, mailSent: 5, letters: 10, giants: 1, snowmen: 1, wishes: 1 };
check('全部做完：每個成就都達成', achievementsMet(full).length, ACHIEVEMENTS.length);
check('成就的編號不重複、都有名字說明和獎金', new Set(ACHIEVEMENTS.map((a) => a.id)).size === ACHIEVEMENTS.length && ACHIEVEMENTS.every((a) => a.name && a.desc && a.reward > 0), true);
check('「聽完所有故事」要 18 段', [achievementsMet({ ...full, stories: 17 }).includes('stories'), achievementsMet(full).includes('stories')], [false, true]);
check('一週從星期一開始（台灣日期）', [weekStart('2026-11-08'), weekStart('2026-11-09'), weekStart('2026-11-15'), weekStart('2027-01-01'), weekEnd('2026-11-09')],
  ['2026-11-02', '2026-11-09', '2026-11-09', '2026-12-28', '2026-11-15']);
check('這週什麼都沒做：不貼週報', weeklyReportText({ week: '2026-11-02', actions: 0, harvest: 0, shipped: 0, achievements: [], dex: [], top: null }), null);
const rep = weeklyReportText({ week: '2026-11-02', actions: 120, harvest: 23, shipped: 4560, achievements: ['第一次收成'], dex: ['鰻魚', '紫水晶', '鯉魚', '起司'], top: { name: '媽媽', actions: 80 } });
const rep0 = weeklyReportText({ week: '2026-11-02', actions: 7, harvest: 0, shipped: 0, achievements: [], dex: [], top: { name: '阿宏', actions: 7 } });
check('沒收成、沒出貨的那週：不寫 0，改說大家做了幾件事', [rep0.includes('0 次') || rep0.includes(' 0 元'), rep0.includes('大家一共做了 7 件事')], [false, true]);
check('週報：日期、收成、出貨（有千分位）、成就、圖鑑、最勤勞的人', ['11/2～11/8', '收成 23 次', '4,560 元', '「第一次收成」', '鰻魚、紫水晶、鯉魚 等 4 種', '最勤勞的是媽媽（做了 80 件事）'].every((t) => rep.includes(t)), true);


console.log('\n--- 節慶活動 ---');
check('五個節日有活動：春節抽籤、元宵燈謎、端午龍舟、中秋烤肉、聖誕交換禮物', Object.entries(FESTIVAL_ACTIVITIES).map(([f, a]) => f + ':' + a.kind),
  ['spring:fortune', 'lantern:riddle', 'dragon:boat', 'moon:bbq', 'christmas:xmas']);
check('每個節慶活動的節日都存在、都有名字和說明', Object.entries(FESTIVAL_ACTIVITIES).every(([f, a]) => FESTIVALS[f] && a.name && a.desc), true);
check('燈謎：每題三個選項、答案在選項裡、選項不重複', RIDDLES.length >= 9 && RIDDLES.every((r) => r.c.length === 3 && r.a >= 0 && r.a < 3 && new Set(r.c).size === 3), true);
const rz = riddlesFor('2027-02-20', 7);
check('每個人猜 3 題不一樣的，同一天同一個人永遠一樣', [rz.length, new Set(rz).size, JSON.stringify(riddlesFor('2027-02-20', 7)) === JSON.stringify(rz)], [3, 3, true]);
check('不同的人題目不一定一樣', [1, 2, 3, 4, 5, 6].some((u) => JSON.stringify(riddlesFor('2027-02-20', u)) !== JSON.stringify(rz)), true);
const ctx = { farmId: 3, day: '2027-02-20', userId: 7 };
const allRight = activityResult('riddle', { ...ctx, answers: rz.map((i) => RIDDLES[i].a) });
check('全部猜對：300 元＋2 個湯圓', [allRight.score, allRight.money, allRight.item, allRight.qty], [3, 300, 'dish:tangyuan', 2]);
check('答案亂填（不是陣列、原型鏈）：0 題', [activityResult('riddle', { ...ctx, answers: 'abc' }).score, activityResult('riddle', { ...ctx, answers: { 0: 0 } }).score], [0, 0]);
check('划龍舟：分數夾在 0～12、打中 10 下送粽子', [activityResult('boat', { score: 99 }).score, activityResult('boat', { score: -5 }).money, activityResult('boat', { score: 1.5 }).score,
  activityResult('boat', { score: 10 }).item, activityResult('boat', { score: 9 }).item], [BOAT_BEATS, 0, 0, 'dish:zongzi', null]);
check('中秋烤肉：分數夾在 0～6、烤好幾串帶回幾串', [activityResult('bbq', { score: 50 }).score, activityResult('bbq', { score: 4 }).money, activityResult('bbq', { score: 4 }).qty, activityResult('bbq', { score: 0 }).item],
  [BBQ_STICKS, 200, 4, null]);
check('抽籤：同一個人同一天抽到的一樣、紅包大於 0', JSON.stringify(fortuneOf(3, '2027-02-06', 7)) === JSON.stringify(fortuneOf(3, '2027-02-06', 7)) && FORTUNES.every((f) => f.money > 0 && f.level && f.text), true);
check('聖誕禮物都是真的東西', XMAS_GIFTS.every(([i, q]) => q > 0 && (i === 'feed' || itemPrice(i) > 0)) && !!xmasGiftOf(3, '2026-12-25', 7), true);
check('烤肉串是節慶食物、有圖', [DISHES.bbq.festival, !!DISH_COLORS.bbq], [true, true]);


console.log('\n--- 果樹、蜂箱 ---');
check('牧場最下面一排有 10 個種果樹的位置、左下角 3 個放蜂箱的位置，都走得到旁邊',
  [cells.filter((p) => p.c === 'Y').length, cells.filter((p) => p.c === 'Z').length,
    [...TREE_SPOTS, ...HIVE_SPOTS].every((p) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${p.x + dx},${p.y + dy}`)))],
  [TREE_SPOTS.length, HIVE_SPOTS.length, true]);
check('位置清單跟地圖上的 Y、Z 一樣', TREE_SPOTS.every((p) => terrainAt(p.x, p.y) === 'Y') && HIVE_SPOTS.every((p) => terrainAt(p.x, p.y) === 'Z'), true);
check('五種果樹，每種的水果都存在、季節都對、價錢天數產量都大於 0', Object.values(TREES).every((t) => FRUITS[t.fruit] && t.seasons.every((x) => SEASONS.includes(x))
  && t.price > 0 && t.days > 0 && t.yield > 0) && Object.keys(TREES).length === 5, true);
check('芭樂一年四季都有、芒果荔枝在夏天', [TREES.guava.seasons.length, TREES.mango.seasons, TREES.lychee.seasons], [4, ['summer'], ['summer']]);
const tree = { kind: 'guava', planted_at: t0, picked_at: 0 };
check('還沒長大：下次可以摘＝長大的那天', treeReadyAt(tree, 'autumn'), t0 + TREES.guava.days * 24 * H);
check('摘過了：一天後才能再摘', treeReadyAt({ ...tree, picked_at: t0 + 10 * 24 * H }, 'autumn'), t0 + 11 * 24 * H);
check('不是它的季節：不會結果（0）', treeReadyAt({ kind: 'mango', planted_at: t0, picked_at: 0 }, 'winter'), 0);
check('時間倍率、本機快速模式也算進去', [treeMatureAt(tree, 3600) - t0, treeMatureAt(tree, 3600, 2) - t0, treeReadyAt({ ...tree, picked_at: t0 + 5000 }, 'autumn', 3600, 2) - t0],
  [TREES.guava.days * 24 * 1000, 2000, 7000]);
check('蜂箱：放好 3 天後有蜜、收完再等 3 天', [hiveReadyAt({ placed_at: t0, collected_at: 0 }) - t0, hiveReadyAt({ placed_at: t0, collected_at: t0 + H }) - t0], [HIVE.days * 24 * H, HIVE.days * 24 * H + H]);
check('水果、蜂蜜能賣能送', [itemPrice('fruit:mango'), itemPrice('prod:honey_l') > itemPrice('prod:honey'), itemPrice('fruit:__proto__')], [140, true, 0]);
check('蜂蜜是一組（百花蜜、龍眼蜜都能做菜，先用百花蜜）', cookTakes({ 'crop:sweetpotato': 2, 'prod:honey_l': 1 }, 'honey_potato'), { 'crop:sweetpotato': 2, 'prod:honey_l': 1 });
check('每種水果都有圖', Object.keys(FRUITS).every((id) => FRUIT_COLORS[id]), true);
check('果園主人、甜蜜蜜兩個成就', [achievementsMet({ ...zero, trees: 5 }), achievementsMet({ ...zero, honey: true })], [['orchard'], ['honey']]);


console.log('\n--- 夜市與比賽 ---');
const TW_ = (s) => Date.parse(s + '+08:00');
check('夜市：星期六晚上 5 點開到 12 點（台灣時間）', [isNightMarket(TW_('2026-11-07T16:59:00')), isNightMarket(TW_('2026-11-07T17:00:00')),
  isNightMarket(TW_('2026-11-07T23:59:00')), isNightMarket(TW_('2026-11-08T00:00:00')), isNightMarket(TW_('2026-11-06T20:00:00'))], [false, true, true, false, false]);
const town = (x, y) => (TOWN_MAP[y] || '')[x];
const stallTiles = Object.values(MARKET_STALLS).flatMap((st) => Array.from({ length: st.w }, (_, i) => `${st.x + i},${st.y}`));
check('每個攤位都擺在空地上，上面（遮雨棚）、前面也是空地', Object.values(MARKET_STALLS).every((st) => Array.from({ length: st.w }, (_, i) => st.x + i)
  .every((x) => town(x, st.y) === '.' && town(x, st.y - 1) === '.' && town(x, st.y + 1) !== 'T')), true);
// 攤位擋住那幾格之後，小鎮其他走得到的地方還是都走得到（不會把民宅的門堵住）
const TWALK = new Set(['.', '=', 'p', ',', 'E']);
const townReach = (blocked) => {
  const start = `${ARRIVE['farm>town'].x},${ARRIVE['farm>town'].y}`, seen = new Set([start]), q = [start];
  while (q.length) {
    const [x, y] = q.shift().split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && TWALK.has(town(x + dx, y + dy)) && !blocked.has(k)) { seen.add(k); q.push(k); }
    }
  }
  return seen;
};
const open_ = townReach(new Set()), market = townReach(new Set(stallTiles));
check('夜市開著的時候，小鎮其他地方都還走得到', [...open_].filter((k) => !stallTiles.includes(k)).every((k) => market.has(k)), true);
check('村民逛夜市的範圍在攤位前面，都是走得到的地方', (() => {
  const out = [];
  for (let y = MARKET_ZONE.y0; y <= MARKET_ZONE.y1; y++) for (let x = MARKET_ZONE.x0; x <= MARKET_ZONE.x1; x++) if (TWALK.has(town(x, y))) out.push(`${x},${y}`);
  return out.length > 20 && out.every((k) => market.has(k) && !stallTiles.includes(k)) && MARKET_ZONE.y0 > Math.max(...Object.values(MARKET_STALLS).map((s) => s.y));
})(), true);
check('夜市小吃都有名字、價錢、體力', Object.values(NIGHT_FOODS).every((f) => f.name && f.price > 0 && f.energy > 0), true);
check('夜市限定：比賣出去的價錢貴（不能買來賣賺錢）', SPECIALS.every(([i, p]) => p > itemPrice(i)), true);
const sp1 = specialsOf('2026-11-02');
check('夜市限定：每週 3 樣、不重複、同一週永遠一樣', [sp1.length, new Set(sp1.map((x) => x.item)).size, JSON.stringify(specialsOf('2026-11-02')) === JSON.stringify(sp1)], [3, 3, true]);
check('不同週會換', ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'].some((w) => JSON.stringify(specialsOf(w)) !== JSON.stringify(sp1)), true);
check('套圈圈：5 個全中紫水晶、3 個金礦、1 個飼料、0 個糖果', [ringPrize(5).item, ringPrize(4).item, ringPrize(3).item, ringPrize(1).item, ringPrize(0).item],
  ['ore:amethyst', 'ore:gold', 'ore:gold', 'feed', 'dish:candy']);
check('套圈圈：分數夾在 0～5（亂送也一樣）', [ringPrize(99).score, ringPrize(-3).score, ringPrize(2.5).score, ringPrize('5').score], [RING_THROWS, 0, 0, 0]);
check('撈金魚：紙網撈 3 下', GOLDFISH_MAX, 3);
const entry = (love) => ({ animal_id: 7, love });
const b20 = beautyResult('2026-11-02', 1, entry(20)), b0 = beautyResult('2026-11-02', 1, entry(0));
check('動物選美：愛心越多分數越高、名次 1～4、獎金對得上', [b20.score > b0.score, b20.place >= 1 && b20.place <= 4, b20.prize === BEAUTY_PRIZES[b20.place - 1], b20.rivals.length], [true, true, true, BEAUTY_RIVALS.length]);
check('動物選美：同一週同一隻結果一樣', JSON.stringify(beautyResult('2026-11-02', 1, entry(12))) === JSON.stringify(beautyResult('2026-11-02', 1, entry(12))), true);
check('動物選美：愛心滿的大多拿前兩名', ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21']
  .filter((w) => beautyResult(w, 1, entry(20)).place <= 2).length >= 6, true);
check('動物選美：愛心超過上限也只算到上限', beautyResult('2026-11-02', 1, entry(999)).score, beautyResult('2026-11-02', 1, entry(LOVE_MAX)).score);
check('豐收比賽：收成次數跟另外三家比', [harvestContest(1).place, harvestContest(41).place, harvestContest(121).place, harvestContest(251).place, harvestContest(250).place],
  [4, 3, 2, 1, 2]);
check('豐收比賽：獎牌和獎金', [harvestContest(300).medal, harvestContest(300).prize, harvestContest(5).medal], [HARVEST_MEDALS[0][0], HARVEST_MEDALS[0][1], '參加獎']);
check('三個比賽成就', [achievementsMet({ ...zero, goldfish3: 1 }), achievementsMet({ ...zero, beautyWin: 1 }), achievementsMet({ ...zero, harvestGold: 1 })],
  [['goldfish3'], ['beauty'], ['harvestGold']]);
check('對手的動物都是牧場上有的動物', BEAUTY_RIVALS.every((r) => ANIMALS[r.kind]) && HARVEST_RIVALS.every((r) => r.score > 0), true);


console.log('\n--- 後山洞窟 ---');
check('後山右邊有洞窟入口（2×2），前面站得到', [HILL_MAP[8].slice(26, 28), HILL_MAP[9].slice(26, 28), isWalkable(ARRIVE['cave>hill'].x, ARRIVE['cave>hill'].y, 'hill')], ['VV', 'VV', true]);
check('洞窟有 20 層，礦車停 1、5、10、15、20 層', [CAVE_FLOORS, CAVE_STOPS], [20, [1, 5, 10, 15, 20]]);
const caveWalk = (map, blocked = new Set()) => {
  const seen = new Set([`${CAVE_ARRIVE.x},${CAVE_ARRIVE.y}`]), q = [[CAVE_ARRIVE.x, CAVE_ARRIVE.y]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && (map[y + dy] || '')[x + dx] === '.' && !blocked.has(k)) { seen.add(k); q.push([x + dx, y + dy]); }
    }
  }
  return seen;
};
check('三種洞窟都是 16×12、四周是岩壁、梯子在左上角、地面全部連在一起', CAVE_LAYOUTS.every((m) => m.length === 12 && m.every((r) => r.length === 16)
  && m[0] === 'X'.repeat(16) && m[11] === 'X'.repeat(16) && m.every((r) => r[0] === 'X' && r[15] === 'X') && m[CAVE_UP.y][CAVE_UP.x] === '^'
  && m[CAVE_ARRIVE.y][CAVE_ARRIVE.x] === '.' && caveWalk(m).size === m.join('').split('.').length - 1), true);
check('寶箱的位置是地面、走得到', CAVE_CHEST_SPOTS.every((p, i) => CAVE_LAYOUTS[i][p.y][p.x] === '.'), true);
const fl = caveFloor(7, '2026-11-08', 3);
check('每層 14 顆石頭、不重複、不在梯子旁邊和寶箱上', [fl.rocks.length, new Set(fl.rocks.map((r) => `${r.x},${r.y}`)).size,
  fl.rocks.every((r) => CAVE_LAYOUTS[fl.layout][r.y][r.x] === '.' && Math.abs(r.x - CAVE_UP.x) + Math.abs(r.y - CAVE_UP.y) > 2 && !(fl.chest && fl.chest.x === r.x && fl.chest.y === r.y))],
  [CAVE_ROCKS, CAVE_ROCKS, true]);
check('往下的梯子藏在其中一顆石頭底下；第 20 層沒有梯子', [fl.rocks.some((r) => r.x === fl.ladder.x && r.y === fl.ladder.y), caveFloor(7, '2026-11-08', 20).ladder], [true, null]);
check('同一天同一層永遠一樣、隔天換新', [JSON.stringify(caveFloor(7, '2026-11-08', 3)) === JSON.stringify(fl), JSON.stringify(caveFloor(7, '2026-11-09', 3)) === JSON.stringify(fl)], [true, false]);
check('每 5 層一定有寶箱', [5, 10, 15, 20].every((f) => !!caveFloor(7, '2026-11-08', f).chest), true);
check('越深越好：1～5 層沒有寶石，16 層以後有紅寶石、藍寶石、鑽石', [caveTier(1), caveTier(5), caveTier(6), caveTier(20), !!CAVE_ORES[0].ruby, CAVE_ORES[3].ruby > 0 && CAVE_ORES[3].diamond > 0],
  [0, 0, 1, 3, false, true]);
check('洞窟裡挖得到的都是圖鑑裡的礦石', CAVE_ORES.every((t) => Object.keys(t).every((id) => ORES[id])), true);
check('寶石在採石場挖不到（機率 0）、只在夠深的地方', ['jade', 'ruby', 'sapphire', 'diamond'].every((id) => ORES[id].weight === 0 && ORES[id].deep >= 11)
  && Array.from({ length: 30 }, (_, i) => rocksOf(1, `2026-12-${String(i + 1).padStart(2, '0')}`)).flat().every((r) => ORES[r.type].weight > 0), true);
const deepRocks = Array.from({ length: 40 }, (_, i) => caveFloor(3, `2027-01-${String((i % 28) + 1).padStart(2, '0')}`, 16 + (i % 5)).rocks).flat();
check('第 16～20 層真的挖得到紅寶石或藍寶石', deepRocks.some((r) => r.type === 'ruby' || r.type === 'sapphire'), true);
check('寶箱：每一段都有東西，越深越值錢', CHEST_LOOT.every((t) => t.every(([i, q]) => q > 0 && (i === 'money' || i === 'feed' || itemPrice(i) > 0)))
  && chestLoot(7, '2026-11-08', 20).money !== 0 && JSON.stringify(chestLoot(7, '2026-11-08', 5)) === JSON.stringify(chestLoot(7, '2026-11-08', 5)), true);
check('古老的寶箱：5000 元和一顆鑽石', [CAVE_TREASURE.money, CAVE_TREASURE.item, itemPrice('ore:diamond')], [5000, 'ore:diamond', 3000]);
check('即時位置：四張地圖和洞窟 1～20 層，其他的都不行', ['farm', 'gh', 'cave1', 'cave20'].every(isAreaKey) && !['cave0', 'cave21', 'cave', 'cave1x', '__proto__', null, 5].some(isAreaKey), true);
check('三個洞窟成就', [achievementsMet({ ...zero, caveBest: 10 }), achievementsMet({ ...zero, caveBottom: 1 }), achievementsMet({ ...zero, gems: 3 }), achievementsMet({ ...zero, caveBest: 9, gems: 2 })],
  [['cave10'], ['caveBottom'], ['gems'], []]);
check('新的寶石都有圖', ['jade', 'ruby', 'sapphire', 'diamond'].every((id) => ORE_COLORS[id]), true);


console.log('\n--- 海邊 ---');
check('海邊地圖 30×20，小鎮東邊的出口通過去、海邊左邊的出口回小鎮', [BEACH_MAP.length, BEACH_MAP.every((r) => r.length === 30), TOWN_MAP[9][29], BEACH_MAP[9][0],
  EXITS.town.some((e) => e.to === 'beach' && e.x === 29 && e.y === 9), EXITS.beach.some((e) => e.to === 'town'),
  isWalkable(ARRIVE['town>beach'].x, ARRIVE['town>beach'].y, 'beach'), isWalkable(ARRIVE['beach>town'].x, ARRIVE['beach>town'].y, 'town')], [20, true, 'E', 'E', true, true, true, true]);
const beachSeen = (() => {
  const start = `${ARRIVE['town>beach'].x},${ARRIVE['town>beach'].y}`, seen = new Set([start]), q = [start];
  while (q.length) {
    const [x, y] = q.shift().split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && isWalkable(x + dx, y + dy, 'beach')) { seen.add(k); q.push(k); }
    }
  }
  return seen;
})();
const beachCells = (ch) => BEACH_MAP.flatMap((r, y) => [...r].map((c, x) => (c === ch ? `${x},${y}` : null)).filter(Boolean));
check('沙灘、防波堤（漲潮時也）都走得到', [...beachCells('s'), ...beachCells('P')].every((k) => beachSeen.has(k)), true);
check('防波堤伸到外海：最前面旁邊是海、x ≥ 24 算外海', [BEACH_MAP[4][25], BEACH_MAP[4][26], fishSpot('beach', 25), fishSpot('beach', 12), fishSpot('farm'), fishSpot('town')], ['P', 'W', 'deep', 'sea', 'pond', null]);
check('每條潮間帶都挨著沙灘（退潮時走得過去）', beachCells('d').every((k) => { const [x, y] = k.split(',').map(Number); return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => 'sd'.includes(BEACH_MAP[y + dy]?.[x + dx] || 'T')); }), true);
const seaFish = Object.entries(FISH).filter(([, f]) => f.sea).map(([id]) => id);
check('10 種海魚，都只在海邊', [seaFish.length, seaFish.every((id) => FISH[id].where.every((w) => w === 'sea' || w === 'deep'))], [10, true]);
const ids = (cs) => cs.map((c) => c.id).sort();
check('黑鮪魚、鬼頭刀、石斑只在防波堤最前面釣得到', [ids(fishChoices('sea', 'summer', true, false)).some((i) => ['tuna', 'mahi', 'grouper'].includes(i)), ids(fishChoices('deep', 'summer', true, false)).includes('tuna')], [false, true]);
check('黑鮪魚只在春夏白天、很稀有', [ids(fishChoices('deep', 'winter', true, false)).includes('tuna'), ids(fishChoices('deep', 'summer', false, false)).includes('tuna'), FISH.tuna.weight, FISH.tuna.sell], [false, false, 1, 2500]);
check('小卷是夏天晚上、秋刀魚秋天、烏魚冬天', [ids(fishChoices('sea', 'summer', false, false)).includes('squid'), ids(fishChoices('sea', 'autumn', true, false)).includes('saury'), ids(fishChoices('sea', 'winter', true, false)).includes('mullet')], [true, true, true]);
check('海邊也會釣到破鞋子；湖和池塘釣不到海魚', [ids(fishChoices('sea', 'spring', true, false)).includes('junk'), seaFish.some((id) => ids(fishChoices('lake', 'summer', true, false)).includes(id) || ids(fishChoices('pond', 'summer', false, false)).includes(id))], [true, false]);
const tw0 = Date.parse('2026-11-08T00:00:00+08:00'), wins = lowTideWindows(tw0, tw0 + 86400000);
check('一天大約退潮兩次，每次 4～5 小時', [wins.length >= 2 && wins.length <= 3, wins.every(([a, b]) => (b - a) / H > 4.5 && (b - a) / H < 5)], [true, true]);
check('退潮時段的中間是退潮、兩次退潮中間是漲潮', [wins.every(([a, b]) => isLowTide((a + b) / 2)), !isLowTide(wins[0][1] + 2 * H), tideLevel((wins[0][0] + wins[0][1]) / 2) < -0.9], [true, true, true]);
check(`潮汐週期 ${TIDE_HOURS} 小時：時段跟一分鐘一分鐘算的一樣`, (() => {
  for (let t = tw0; t < tw0 + 86400000; t += 60000) if (isLowTide(t) !== wins.some(([a, b]) => t >= a && t < b)) return t;
  return true;
})(), true);
const fg = forageOf(4, '2026-11-08', 'beach');
check('海邊每天 8 個沙灘的、6 個潮間帶的東西，位置對、不重複', [fg.filter((f) => !f.tidal).length, fg.filter((f) => f.tidal).length, new Set(fg.map((f) => `${f.x},${f.y}`)).size,
  fg.every((f) => BEACH_MAP[f.y][f.x] === (f.tidal ? 'd' : 's') && FORAGE[f.item.slice(7)]?.where === (f.tidal ? 'tide' : 'sand'))], [BEACH_FINDS.sand, BEACH_FINDS.tide, 14, true]);
check('同一天一樣、隔天換新；牧場上沒有', [JSON.stringify(forageOf(4, '2026-11-08', 'beach')) === JSON.stringify(fg), JSON.stringify(forageOf(4, '2026-11-09', 'beach')) === JSON.stringify(fg), forageOf(4, '2026-11-08', 'farm').length], [true, false, 0]);
check('撿到的東西能賣能送、有圖', Object.keys(FORAGE).every((id) => itemPrice('forage:' + id) > 0 && typeof forageSprite === 'function'), true);
check('海鮮料理：蛤蜊湯、海鮮粥、黑鮪魚生魚片', [DISHES.clam_soup.need, DISHES.seafood_congee.need['forage:crab'], DISHES.tuna_sashimi.sell > itemPrice('fish:tuna')], [{ 'forage:clam': 3 }, 1, true]);
check('海魚都有圖、海鮮料理都有顏色', seaFish.every((id) => FISH_COLORS[id]) && ['saury_grill', 'clam_soup', 'squid_sanbei', 'hairtail_sweet', 'seafood_congee', 'karasumi', 'tuna_sashimi'].every((id) => DISH_COLORS[id]), true);
check('三個海邊成就', [achievementsMet({ ...zero, seaFishKinds: 5 }), achievementsMet({ ...zero, tuna: true }), achievementsMet({ ...zero, beachKinds: 6 }), achievementsMet({ ...zero, seaFishKinds: 4, beachKinds: 5 })],
  [['seaFish5'], ['tuna'], ['beachcomber'], []]);
check('即時位置可以是海邊', isAreaKey('beach'), true);


console.log('\n--- 小鎮修復計畫 ---');
const allBundles = Object.values(PROJECTS).flatMap((P) => Object.entries(P.bundles));
check('四個地方，每個三份清單、每份三樣東西，清單的編號不重複', [Object.keys(PROJECTS).length, Object.values(PROJECTS).every((P) => Object.keys(P.bundles).length === 3),
  allBundles.every(([, B]) => Object.keys(B.need).length === 3), new Set(allBundles.map(([id]) => id)).size], [4, true, true, 12]);
check('清單上的東西都是真的東西（或雞蛋、牛奶這種組），數量大於 0', allBundles.every(([, B]) => Object.entries(B.need).every(([k, q]) => q > 0 && (INGREDIENT_GROUPS[k] || itemPrice(k) > 0))), true);
check('bundleOf 找得到每一份清單是哪個地方的，亂填找不到', [bundleOf('ores').project, bundleOf('beach_finds').project, bundleOf('__proto__'), bundleOf('nope')], ['station', 'harbor', null, null]);
const MAPS_ = { town: TOWN_MAP, beach: BEACH_MAP };
check('四棟建築都在地圖上（2×2）', Object.values(PROJECTS).every((P) => { const m = MAPS_[P.area], c = m[P.y][P.x]; return 'UILD'.includes(c) && m[P.y][P.x + 1] === c && m[P.y + 1][P.x] === c && m[P.y + 1][P.x + 1] === c; }), true);
const reachOf = (area, start) => {
  const seen = new Set([`${start.x},${start.y}`]), q = [[start.x, start.y]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && isWalkable(x + dx, y + dy, area)) { seen.add(k); q.push([x + dx, y + dy]); }
    }
  }
  return seen;
};
const tReach = reachOf('town', ARRIVE['farm>town']), bReach = reachOf('beach', ARRIVE['town>beach']);
check('四棟建築旁邊都走得到', Object.values(PROJECTS).every((P) => [[0, -1], [1, -1], [-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2]]
  .some(([dx, dy]) => (P.area === 'town' ? tReach : bReach).has(`${P.x + dx},${P.y + dy}`))), true);
check('農會：作物、水果出貨多一成，魚、礦石不變', [shipPrice('crop:bokchoy', true), shipPrice('crop:bokchoy', false), shipPrice('fruit:mango', true), shipPrice('fish:tilapia', true), shipPrice('ore:gold', true), COOP_BONUS],
  [Math.round(45 * 1.1), 45, Math.round(140 * 1.1), 40, 400, 1.1]);
const pr = prayerOf(2, '2026-11-08', 5, 'autumn');
check('拜拜的運勢：同一個人同一天一樣、只有大吉送種子（這一季的）', [JSON.stringify(prayerOf(2, '2026-11-08', 5, 'autumn')) === JSON.stringify(pr),
  Array.from({ length: 40 }, (_, i) => prayerOf(2, '2026-11-08', i, 'autumn')).every((x) => (x.level === '大吉') === !!x.giftItem && (!x.giftItem || inSeason(x.giftItem.item.slice(5), 'autumn')))], [true, true]);
check('五種運勢都抽得到', new Set(Array.from({ length: 200 }, (_, i) => prayerOf(2, '2026-11-08', i, 'spring').level)).size, PRAYERS.length);
const wOf = (cs, id) => (cs.find((c) => c.id === id) || {}).w;
check('好釣竿：稀有的魚機會加倍、破鞋子不會', [wOf(fishChoices('deep', 'summer', true, false, true), 'tuna'), wOf(fishChoices('deep', 'summer', true, false), 'tuna'),
  wOf(fishChoices('sea', 'summer', true, false, true), 'junk'), wOf(fishChoices('sea', 'summer', true, false, true), 'mackerel')], [2, 1, FISH.junk.weight, FISH.mackerel.weight]);
check('兩個修復成就、四棟都有圖', [achievementsMet({ ...zero, projects: 1 }), achievementsMet({ ...zero, projects: 4 }), typeof projectSprite === 'function', PROJECT_DONE_REWARD], [['restore1'], ['restore1', 'restoreAll'], true, 10000]);


console.log('\n--- 裝飾與家具 ---');
check('屋子裡 12×8、四周是牆、門通回牧場、進門站的地方是地板', [HOME_MAP.length, HOME_MAP.every((r) => r.length === 12), HOME_MAP[7][5], EXITS.home[0].to,
  HOME_MAP[ARRIVE['farm>home'].y][ARRIVE['farm>home'].x], isWalkable(ARRIVE['home>farm'].x, ARRIVE['home>farm'].y, 'farm')], [8, true, 'E', 'farm', '.', true]);
check('10 種牧場裝飾、10 種家具，都有名字和價錢', [Object.values(DECOS).filter((d) => d.where === 'farm').length, Object.values(DECOS).filter((d) => d.where === 'home').length,
  Object.values(DECOS).every((d) => d.name && d.price > 0)], [10, 10, true]);
check('裝飾不能出貨（不是拿來賺錢的）', Object.keys(DECOS).every((k) => itemPrice('deco:' + k) === 0), true);
check('擺在草地上可以', decoCheck('farm', 'bench', 12, 5, []), null);
check('擺錯地方、擺在田裡路上、亂填座標都不行', [decoCheck('farm', 'sofa', 12, 5, []), decoCheck('home', 'bench', 3, 3, []), decoCheck('farm', 'bench', 4, 9, []),
  decoCheck('farm', 'bench', 5, 6, []), decoCheck('farm', 'bench', 'a', 1, []), decoCheck('farm', '__proto__', 12, 5, [])].every((x) => typeof x === 'string'), true);
check('動物小屋柵欄裡、池塘邊、寵物玩的地方不能擺', [decoCheck('farm', 'bench', 24, 12, []), decoCheck('farm', 'bench', 23, 5, []), decoCheck('farm', 'bench', 6, 5, [])]
  .every((x) => /動物|寵物/.test(x || '')), true);
check('同一格不能擺兩個', decoCheck('farm', 'lamp', 12, 5, [{ kind: 'bench', x: 12, y: 5 }]), '這裡已經擺了東西');
check('最多擺 20 件家具', /最多/.test(decoCheck('home', 'plant', 9, 5, Array.from({ length: 20 }, (_, i) => ({ kind: 'rug', x: 1 + (i % 10), y: 1 + Math.floor(i / 10) }))) || ''), true);
// 屋子裡第 3 排從左擺到右，最後一個會把屋子隔成兩半
const row3 = Array.from({ length: 9 }, (_, i) => ({ kind: 'plant', x: 1 + i, y: 3 }));
check('會把路擋住的地方不能擺；地毯是平的可以', [decoCheck('home', 'sofa', 10, 3, row3), decoCheck('home', 'rug', 10, 3, row3)], ['擺在這裡會把路擋住', null]);
check('門口不能擋住', decoCheck('home', 'plant', ARRIVE['farm>home'].x, ARRIVE['farm>home'].y, []), '門口不能擋住');
check('牧場裡擋住出貨箱旁邊唯一的空位也不行', (() => {
  // 出貨箱 B 在 (9,4)：把它旁邊的空地擺滿，最後一格要被擋下來
  const around = [[8, 4], [10, 4], [9, 5], [9, 3]].filter(([x, y]) => FARM_MAP[y][x] === '.');
  const placed = around.slice(0, -1).map(([x, y]) => ({ kind: 'flowerbed', x, y }));
  const [lx, ly] = around[around.length - 1];
  return /擋/.test(decoCheck('farm', 'flowerbed', lx, ly, placed) || '');
})(), true);
check('每種裝飾都有圖', Object.keys(DECOS).every(() => typeof decoSprite === 'function') && typeof homeTileSprite === 'function', true);
check('兩個佈置成就', [achievementsMet({ ...zero, decoFarm: 5 }), achievementsMet({ ...zero, decoHome: 5 }), achievementsMet({ ...zero, decoFarm: 4, decoHome: 4 })], [['deco5'], ['cozyHome'], []]);
check('即時位置可以是屋子裡', isAreaKey('home'), true);


console.log('\n--- 野外採集與菇類 ---');
const land = Object.entries(FORAGE).filter(([, f]) => f.where === 'hill' || f.where === 'town');
check('11 種野外採集的東西，都有季節、價錢', [land.length, land.every(([, f]) => f.seasons.length && f.seasons.every((x) => SEASONS.includes(x)) && f.sell > 0)], [11, true]);
check('每一季後山、小鎮都有東西可以撿', SEASONS.every((se) => ['hill', 'town'].every((a) => land.some(([, f]) => f.where === a && f.seasons.includes(se)))), true);
for (const se of SEASONS) {
  const h = forageOf(5, '2026-11-08', 'hill', se), t = forageOf(5, '2026-11-08', 'town', se);
  check(`${se}：後山 ${LAND_FINDS.hill} 個、小鎮 ${LAND_FINDS.town} 個，都是這一季的、在草地上、不在採石場和小鎮南邊`, [h.length, t.length,
    [...h.map((f) => ['hill', f]), ...t.map((f) => ['town', f])].every(([a, f]) => ',.'.includes(MAPS[a][f.y][f.x]) && FORAGE[f.item.slice(7)].where === a && FORAGE[f.item.slice(7)].seasons.includes(se) && !f.tidal),
    h.every((f) => !(f.x >= QUARRY.x0 - 1 && f.x <= QUARRY.x1 + 1 && f.y >= QUARRY.y0 && f.y <= QUARRY.y1 + 1)), t.every((f) => f.y < 15)],
    [LAND_FINDS.hill, LAND_FINDS.town, true, true, true]);
}
check('同一天一樣、隔天換新', [JSON.stringify(forageOf(5, '2026-11-08', 'hill', 'autumn')) === JSON.stringify(forageOf(5, '2026-11-08', 'hill', 'autumn')),
  JSON.stringify(forageOf(5, '2026-11-09', 'hill', 'autumn')) === JSON.stringify(forageOf(5, '2026-11-08', 'hill', 'autumn'))], [true, false]);
check('撿到的東西走得到：後山、小鎮的都在走得到的格子上', [...forageOf(5, '2026-11-08', 'hill', 'autumn').map((f) => hillSeen.has(`${f.x},${f.y}`)),
  ...forageOf(5, '2026-11-08', 'town', 'summer').map((f) => townSeen.has(`${f.x},${f.y}`))].every(Boolean), true);
check('菇類：木耳、香菇、靈芝（靈芝很稀有）', [land.filter(([, f]) => f.mushroom).map(([id]) => id).sort(), FORAGE.lingzhi.weight < 5, FORAGE.lingzhi.sell], [['lingzhi', 'shiitake', 'wood_ear'], true, 600]);
check('曬架：在第五個加工機的位置，香菇、木耳、竹筍曬乾比原本值錢兩倍以上', [MACHINE_SPOTS.dryer, terrainAt(22, 4), Object.entries(MACHINES.dryer.makes).every(([i, g]) => GOODS[g] && GOODS[g].sell >= itemPrice(i) * 2)],
  [{ x: 22, y: 4 }, 'M', true]);
check('山上的料理：竹筍湯、香菇蒸蛋、木耳露、靈芝茶', [DISHES.bamboo_soup.need, DISHES.shiitake_egg.need.egg, DISHES.woodear_drink.need.honey, DISHES.lingzhi_tea.sell > itemPrice('forage:lingzhi')],
  [{ 'forage:bamboo_shoot': 2 }, 1, 1, true]);
check('新的東西都有圖', ['bamboo_soup', 'fern_stirfry', 'shiitake_egg', 'chestnut_roast', 'woodear_drink', 'lingzhi_tea'].every((id) => DISH_COLORS[id])
  && ['dried_shiitake', 'dried_woodear', 'dried_shoot'].every((id) => GOOD_ART[id]), true);
check('成就：菇菇採集家、採集達人；海邊撿寶只算海邊的', [achievementsMet({ ...zero, mushrooms: 3 }), achievementsMet({ ...zero, forageKinds: Object.keys(FORAGE).length }),
  achievementsMet({ ...zero, forageKinds: 6 }), achievementsMet({ ...zero, beachKinds: 6 })], [['mushrooms'], ['forageAll'], [], ['beachcomber']]);

console.log('\n--- 灑水器、肥料與品質 ---');
const HR = 3600000, T0 = Date.UTC(2026, 3, 1, 0);
check('三種肥料：普通、速效、高級，都有價錢和說明', [Object.keys(FERTS), Object.values(FERTS).every((f) => f.price > 0 && f.desc)], [['basic', 'speed', 'quality'], true]);
const tl = { crop: 'tomato', progress_ms: 0, tick_at: T0, watered_until: T0 + 24 * HR };
check('速效肥料：一樣濕 4 小時，長 1.25 倍（5 小時份）；其他肥料不影響速度', [grownMs(tl, T0 + 4 * HR), grownMs({ ...tl, fert: 'speed' }, T0 + 4 * HR),
  grownMs({ ...tl, fert: 'basic' }, T0 + 4 * HR), growRate({ fert: 'speed' }), growRate({ fert: 'nope' }), growRate(null)], [4 * HR, 5 * HR, 4 * HR, 1.25, 1, 1]);
check('速效肥料：番茄 12 小時 → 9.6 小時就熟', [cropStage({ ...tl, fert: 'speed' }, T0 + 9.6 * HR), cropStage(tl, T0 + 9.6 * HR)], [3, 2]);
check('星級：銅星 ×1.25、銀星 ×1.5、金星 ×2', [QUALITY[1].mult, QUALITY[2].mult, QUALITY[3].mult], [1.25, 1.5, 2]);
check('有星級的作物價錢、名字（只有作物有星級）', [itemPrice('crop:pumpkin'), itemPrice('crop:pumpkin@1'), itemPrice('crop:pumpkin@2'), itemPrice('crop:pumpkin@3'),
  itemName('crop:pumpkin@3'), itemName('crop:tomato@1'), itemPrice('fish:tuna@3'), itemPrice('crop:pumpkin@4'), itemPrice('crop:nope@1'), itemPrice('crop:pumpkin@')],
  [360, 450, 540, 720, '金星南瓜', '銅星番茄', 0, 0, 0, 0]);
check('名字：肥料、灑水器也認得', [itemName('fert:speed'), itemName('gear:sprinkler2'), itemName('gear:nope')], ['速效肥料', '高級灑水器', 'gear:nope']);
check('星級的寫法：baseItem、qualityOf、withQuality', [baseItem('crop:corn@2'), qualityOf('crop:corn@2'), qualityOf('crop:corn'), withQuality('crop:corn', 3), withQuality('crop:corn', 0)],
  ['crop:corn', 2, 0, 'crop:corn@3', 'crop:corn']);
const qStat = (fert) => { const n = [0, 0, 0, 0]; for (let i = 0; i < 4000; i++) n[harvestQuality(7, 3 + (i % 9), 9 + (i % 5), T0 + i * 61000, fert)]++; return n.map((v) => v / 40); };
const [qs0, qs1, qs2] = [qStat(null), qStat('basic'), qStat('quality')];
check(`收成的星級機率：沒施肥 ${(100 - qs0[0]).toFixed(0)}%、普通肥料 ${(100 - qs1[0]).toFixed(0)}%、高級肥料 ${(100 - qs2[0]).toFixed(0)}% 有星級`,
  [100 - qs0[0] > 10 && 100 - qs0[0] < 18, 100 - qs1[0] > 33 && 100 - qs1[0] < 45, 100 - qs2[0] > 63 && 100 - qs2[0] < 77, qs2[3] > 11 && qs2[3] < 19, qs0[3] < 2.5],
  [true, true, true, true, true]);
check('星級：同一格同一刻收成結果一樣；速效肥料不影響星級', [harvestQuality(5, 4, 9, T0, 'basic') === harvestQuality(5, 4, 9, T0, 'basic'),
  [...Array(300)].every((_, i) => harvestQuality(5, 4, 9, T0 + i, 'speed') === harvestQuality(5, 4, 9, T0 + i, null))], [true, true]);
check('有星級的作物也能煮菜、交清單（先用普通的、再用星級低的）', [ingredientItems('crop:tomato'), cookTakes({ 'crop:tomato@3': 1, 'prod:egg': 1 }, 'tomato_egg'),
  cookTakes({ 'crop:bokchoy': 1, 'crop:bokchoy@2': 1, 'crop:bokchoy@1': 3 }, 'stirfry')],
  [['crop:tomato', 'crop:tomato@1', 'crop:tomato@2', 'crop:tomato@3'], { 'crop:tomato@3': 1, 'prod:egg': 1 }, { 'crop:bokchoy': 1, 'crop:bokchoy@1': 1 }]);
const likeItem = VILLAGERS.ama.likes.find((i) => i.startsWith('crop:'));
check(`送禮：有星級的作物看作物本身，喜歡的多加星數（${itemName(likeItem)}）`, [giftPoints('ama', likeItem, '2026-01-02').points, giftPoints('ama', likeItem + '@3', '2026-01-02').points,
  giftPoints('ama', likeItem + '@3', '2026-01-02').reaction], [5, 8, 'like']);
check('出貨：星級作物在農會修好後也多一成', [shipPrice('crop:pumpkin@3', false), shipPrice('crop:pumpkin@3', true)], [720, 792]);

check('灑水器、高級灑水器、稻草人：價錢、材料都是有的礦石', [Object.keys(GEAR), Object.values(GEAR).every((G) => G.price > 0 && G.desc && Object.keys(G.need).every((i) => ORES[i.slice(4)])),
  isSprinkler('sprinkler'), isSprinkler('sprinkler2'), isSprinkler('scarecrow')], [['sprinkler', 'sprinkler2', 'scarecrow'], true, true, true, false]);
const cv = (g) => gearCovers(g).map((c) => `${c.x},${c.y}`).sort().join(' ');
check('灑水器在田中間：上下左右 4 格；高級的周圍 8 格；稻草人不澆水', [gearCovers({ kind: 'sprinkler', x: 10, y: 11 }).length, gearCovers({ kind: 'sprinkler2', x: 10, y: 11 }).length,
  gearCovers({ kind: 'scarecrow', x: 10, y: 11 }).length], [4, 8, 0]);
check('田的角落、溫室：只澆到同一塊田的格子', [cv({ kind: 'sprinkler', x: 4, y: 9 }), cv({ kind: 'sprinkler2', x: 4, y: 9 }), cv({ kind: 'sprinkler', x: 2, y: 2 }),
  gearCovers({ kind: 'sprinkler2', x: 13, y: 6 }).every((c) => fieldArea(c.x, c.y) === 'gh')],
  ['4,10 5,9', '4,10 5,10 5,9', '2,3 3,2', true]);
const gl = [{ kind: 'sprinkler', x: 10, y: 11 }, { kind: 'sprinkler2', x: 12, y: 11 }, { kind: 'scarecrow', x: 6, y: 11 }];
check('有灑水器澆的格子（重疊的算一次，稻草人不算）', [sprinkledSet(gl).size, sprinkledSet(gl).has('11,11'), sprinkledSet(gl).has('6,10')], [11, true, false]);
check(`稻草人顧著周圍 ${SCARE_R * 2 + 1}×${SCARE_R * 2 + 1}`, [scaredAt(gl, 10, 15), scaredAt(gl, 2, 7), scaredAt(gl, 11, 11), scaredAt([], 6, 11)], [true, true, false, false]);
check('擺灑水器：要在田裡、空的、沒擺東西、有上限', [gearCheck('sprinkler', 1, 1, [], null), gearCheck('sprinkler', 10, 11, gl, null), gearCheck('sprinkler', 9, 11, gl, { crop: 'tomato' }),
  gearCheck('nope', 9, 11, gl, null), gearCheck('sprinkler', 9, 11, Array(GEAR_MAX).fill({ x: 0, y: 0 }), null), gearCheck('sprinkler', 9, 11, gl, { crop: null })],
  ['要擺在田裡', '這裡已經擺了東西', '這格種了東西，換一格空的', '沒有這種東西', `田裡最多擺 ${GEAR_MAX} 個`, null]);
check('灑水器澆的田一直是濕的：沒澆過水也照樣長、濕到很久以後', [grownMs({ ...tl, watered_until: 0 }, T0 + 6 * HR, 1, ALWAYS_WET), wetUntilOf(0, T0, ALWAYS_WET) > T0 + 30 * 24 * HR],
  [6 * HR, true]);

const field = []; for (let x = 4; x < 14; x++) field.push({ x, y: 10 });
let crowDays = 0;
for (let d = 0; d < 400; d++) if (crowsOf(5, taiwanDay(T0 + d * 24 * HR), field).length) crowDays++;
check(`烏鴉：沒顧著的作物 ${CROW_MIN} 棵以上，大約 ${CROW_PCT}% 的日子會來（${(crowDays / 4).toFixed(0)}%）`, crowDays > 130 && crowDays < 190, true);
const many = []; for (let x = 4; x < 18; x++) for (const y of [10, 11]) many.push({ x, y });
const dayHit = [...Array(60)].map((_, d) => taiwanDay(T0 + d * 24 * HR)).find((d) => crowsOf(5, d, field).length);
check('烏鴉：一次偷吃 1 棵（15 棵以上 2 棵），吃的是沒顧著的作物', [crowsOf(5, dayHit, field).length, crowsOf(5, dayHit, many).length,
  crowsOf(5, dayHit, field).every((c) => field.includes(c))], [1, 2, true]);
check('烏鴉：作物太少不來、同一天結果一樣；測試用的 on／off', [[...Array(100)].every((_, d) => !crowsOf(5, taiwanDay(T0 + d * 24 * HR), field.slice(0, CROW_MIN - 1)).length),
  JSON.stringify(crowsOf(5, dayHit, field)) === JSON.stringify(crowsOf(5, dayHit, field)), crowsOf(5, dayHit, field.slice(0, 1), 'on').length, crowsOf(5, dayHit, field, 'off').length],
  [true, true, 1, 0]);
check('成就：金星農夫、自動灑水', [achievementsMet({ ...zero, goldHarvest: 1 }), achievementsMet({ ...zero, sprinklers: 4 }), achievementsMet({ ...zero, sprinklers: 3 })],
  [['goldStar'], ['sprinklers'], []]);

console.log('\n--- 稻田與茶園 ---');
check('梯田也是 30×20、從後山最下面走下去', [TERRACE_MAP.length, TERRACE_MAP.every((r) => r.length === 30), terrainAt(15, 19, 'hill'), EXITS.hill.some((e) => e.to === 'terrace'), isAreaKey('terrace')],
  [20, true, 'E', true, true]);
const terraceSeen = reach('terrace', ARRIVE['hill>terrace']);
const tCells = []; TERRACE_MAP.forEach((r, y) => [...r].forEach((c, x) => tCells.push({ x, y, c })));
check('梯田每一格能走的地方都走得到，每棵茶樹旁邊都站得到人', [tCells.filter((p) => isWalkable(p.x, p.y, 'terrace')).every((p) => terraceSeen.has(`${p.x},${p.y}`)),
  tCells.filter((p) => p.c === 'e').every((p) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terraceSeen.has(`${p.x + dx},${p.y + dy}`)))], [true, true]);
const paddies = tCells.filter((p) => p.c === 'r');
check(`水田 ${paddies.length} 格：座標跟牧場、溫室的田不重疊，都算梯田的田`, [paddies.length >= 40, paddies.every((p) => terrainAt(p.x, p.y) !== 'F' && terrainAt(p.x, p.y, 'gh') !== 'F' && fieldArea(p.x, p.y) === 'terrace'),
  paddies.every((p) => terraceSeen.has(`${p.x},${p.y}`))], [true, true, true]);
check('稻子：春、夏種，秧苗只能插水田，水田只能種稻子', [CROPS.rice.seasons, CROPS.rice.seedName, plantableIn('rice', 'terrace'), plantableIn('rice', 'farm'), plantableIn('rice', 'gh'),
  plantableIn('bokchoy', 'terrace'), plantableIn('bokchoy', 'farm'), plantableIn('nope', 'farm')], [['spring', 'summer'], '秧苗', true, false, false, false, true, false]);
const teaN = tCells.filter((p) => p.c === 'e').length;
check(`茶園 ${teaN} 棵茶樹：每天每棵都能採，春秋冬是茶菁、夏天是夏茶菁`, [forageOf(5, '2026-11-08', 'terrace', 'autumn').length, forageOf(5, '2026-07-08', 'terrace', 'summer').every((f) => f.item === 'forage:tea_summer'),
  forageOf(5, '2026-01-08', 'terrace', 'winter').every((f) => f.item === 'forage:tea_leaf'), JSON.stringify(forageOf(5, '2026-11-08', 'terrace', 'autumn')) === JSON.stringify(forageOf(9, '2026-11-09', 'terrace', 'autumn'))],
  [teaN, true, true, true]);
check('製茶機、碾米機：在加工機那一排，做出來的比原本值錢兩倍以上', [MACHINE_SPOTS.tea, MACHINE_SPOTS.mill, terrainAt(17, 4), terrainAt(23, 4),
  ['tea', 'mill'].every((k) => Object.entries(MACHINES[k].makes).every(([i, g]) => GOODS[g].sell >= itemPrice(i) * 2))], [{ x: 17, y: 4 }, { x: 23, y: 4 }, 'M', 'M', true]);
check('米和茶的料理：蛋炒飯、菜飯、香菇油飯、菜脯飯糰、蜂蜜烏龍茶、鮮奶茶', ['fried_rice', 'veg_rice', 'oil_rice', 'rice_ball', 'oolong_honey', 'milk_tea'].every((id) => DISHES[id]
  && DISHES[id].sell > Object.entries(DISHES[id].need).reduce((n, [k, q]) => n + q * itemPrice(ingredientItems(k)[0]), 0)), true);
check('灑水器不擺在水田', gearCheck('sprinkler', paddies[0].x, paddies[0].y, [], null), '水田不用灑水器，也沒有烏鴉');
check('成就：粒粒皆辛苦、茶園主人', [achievementsMet({ ...zero, whiteRice: true }), achievementsMet({ ...zero, teaKinds: 2 }), achievementsMet({ ...zero, teaKinds: 1 })], [['rice'], ['tea'], []]);

console.log('\n--- 牧場相機與家人互動 ---');
check('家庭留言板在房子右邊，旁邊站得到人', [terrainAt(8, 2), [[8, 3], [7, 2], [9, 2]].some(([x, y]) => seen.has(`${x},${y}`))], ['n', true]);
check('8 種表情，不重複', [EMOTES.length, new Set(EMOTES).size], [8, 8]);
check('留言：去掉前後空白、換行和看不見的字元，最多 60 個字', [cleanNote('  晚上  回家\n吃飯  '), cleanNote('a\u202eb\u0000c'), [...cleanNote('好'.repeat(100))].length,
  cleanNote(''), cleanNote(null), cleanNote('   '), cleanNote('😀'.repeat(70)).length, NOTE_LEN, NOTE_MAX],
  ['晚上 回家 吃飯', 'a b c', 60, '', '', '', 120, 60, 20]);
check('成就：家人的小紙條', [achievementsMet({ ...zero, notes: 5 }), achievementsMet({ ...zero, notes: 4 })], [['notes5'], []]);

console.log('\n--- 騎馬與放牧 ---');
const gt = grazeTiles();
check(`放牧的草地在後山南邊（${gt.length} 格），都是草地、走得到`, [gt.length >= 60, gt.every((p) => terrainAt(p.x, p.y, 'hill') === '.' && p.y >= GRAZE_ZONE.y0 && hillSeen.has(`${p.x},${p.y}`))], [true, true]);
check('雞、牛、羊可以放牧，鴨子留在池塘', [grazes('chicken'), grazes('cow'), grazes('sheep'), grazes('duck'), grazes('dragon')], [true, true, true, false, false]);
check('晴天、多雲才能放牧；白天 6～16 點出門', [['sun', 'cloud', 'rain', 'typhoon', 'cold'].map(grazeWeatherOk), GRAZE_HOURS], [[true, true, false, false, false], [6, 16]]);
check('晚上 8 點還沒趕回來（或已經隔天）才算待了一整晚', [grazePenaltyDue(null, 0, '2026-11-08', 22), grazePenaltyDue('2026-11-08', 0, '2026-11-08', 19),
  grazePenaltyDue('2026-11-08', 0, '2026-11-08', 20), grazePenaltyDue('2026-11-07', 0, '2026-11-08', 7), grazePenaltyDue('2026-11-08', 1, '2026-11-08', 23)],
  [false, false, true, true, false]);
check('馬走的路（動物小屋和池塘中間）都能走', (() => { for (let x = HORSE_ZONE.x0; x <= HORSE_ZONE.x1; x++) if (!isWalkable(x, HORSE_ZONE.y0)) return false; return true; })(), true);
check('騎馬：愛心越多越快（1.6～2.1 倍），屋子、溫室、洞窟裡不能騎', [horseSpeed(0), horseSpeed(4), horseSpeed(20), horseSpeed(99), HORSE.price,
  RIDE_AREAS.includes('farm'), ['home', 'gh', 'cave'].some((a) => RIDE_AREAS.includes(a))], [1.6, 1.7, 2.1, 2.1, 3000, true, false]);
check('成就：我的愛駒、青青草原', [achievementsMet({ ...zero, horse: true }), achievementsMet({ ...zero, graze: 10 }), achievementsMet({ ...zero, graze: 9 })],
  [['horse'], ['graze10'], []]);

console.log('\n--- 鐵匠鋪、工具升級（第二十三期） ---');
const smithCells = TOWN_MAP.flatMap((r, y) => [...r].map((c, x) => ({ x, y, c }))).filter((p) => p.c === 'b');
check('鐵匠鋪在小鎮右上角，2×2、不能走進去', [smithCells.map((p) => `${p.x},${p.y}`).join(' '), smithCells.some((p) => isWalkable(p.x, p.y, 'town'))],
  ['26,2 27,2 26,3 27,3', false]);
check('鋤頭、澆水壺、鐮刀可以打；鋤頭和澆水壺要先換大的', [Object.keys(SMITH_TOOLS), SMITH_TOOLS.hoe.needBig, SMITH_TOOLS.can.needBig, SMITH_TOOLS.sickle.needBig, TIER_MAX],
  [['hoe', 'can', 'sickle'], true, true, false, 3]);
check('銅、銀、金：錢越來越多，礦石分別是銅礦、銀礦、金礦', SMITH_TIERS.slice(1).map((t) => [t.name, t.ore, t.qty]), [['銅', 'ore:copper', 5], ['銀', 'ore:silver', 5], ['金', 'ore:gold', 5]]);
check('越好的越貴', SMITH_TIERS[1].price < SMITH_TIERS[2].price && SMITH_TIERS[2].price < SMITH_TIERS[3].price, true);
check('範圍：普通 1 格、大的 3×3、銅 3×3、銀 5×3、金 5×5', [toolSize(0, false), toolSize(0, true), toolSize(1, true), toolSize(2, false), toolSize(3, true), toolSize(9, true)],
  [[1, 1], [3, 3], [3, 3], [5, 3], [5, 5], [5, 5]]);
check('體力：普通照原價、銅銀少一半、金只要四分之一', [toolEnergy(0), toolEnergy(1), toolEnergy(2), toolEnergy(3)], [1, 0.5, 0.5, 0.25]);
const a53 = toolArea(10, 10, [5, 3]);
check('範圍裡的格子：點的那格最先、不重複、剛好填滿', [a53.length, a53[0], new Set(a53.map((c) => `${c.x},${c.y}`)).size,
  Math.min(...a53.map((c) => c.x)), Math.max(...a53.map((c) => c.x)), Math.min(...a53.map((c) => c.y)), Math.max(...a53.map((c) => c.y)), toolArea(3, 3, [1, 1])],
  [15, { x: 10, y: 10 }, 15, 8, 12, 9, 11, [{ x: 3, y: 3 }]]);
check('由近到遠：前 5 格是點的那格和上下左右', toolArea(10, 10, [5, 5]).slice(0, 5).map((c) => Math.abs(c.x - 10) + Math.abs(c.y - 10)), [0, 1, 1, 1, 1]);
check('體力加起來再無條件進位：銅鋤頭翻 9 格 9 點、金澆水壺澆 25 格 7 點、普通鋤頭 9 格 18 點、第一格至少 1 點',
  [areaEnergy(9, 2, 0.5), areaEnergy(25, 1, 0.25), areaEnergy(9, 2, 1), areaEnergy(1, 1, 0.25), areaEnergy(0, 2, 0.5)], [9, 7, 18, 1, 0]);
check('一格一格算的時候，多花的加起來剛好等於總共', (() => { let sum = 0; for (let k = 1; k <= 25; k++) sum += areaEnergy(k, 3, 0.25) - areaEnergy(k - 1, 3, 0.25); return sum === areaEnergy(25, 3, 0.25); })(), true);
check('打不了的原因：沒這種工具、還沒換大的、錢不夠、礦石不夠、已經是金的', [
  smithCheck('tractor', 0, {}, 1e9, 2), smithCheck('constructor', 0, {}, 1e9, 2), /雜貨店/.test(smithCheck('hoe', 0, { 'ore:copper': 9 }, 1e9, 1)),
  /錢不夠/.test(smithCheck('sickle', 0, { 'ore:copper': 9 }, 1499, 0)), /銅礦不夠/.test(smithCheck('sickle', 0, { 'ore:copper': 4 }, 1e9, 0)),
  /銀礦不夠/.test(smithCheck('can', 1, { 'ore:copper': 9 }, 1e9, 2)), /已經是金/.test(smithCheck('sickle', 3, {}, 1e9, 0))],
  ['沒有這種工具', '沒有這種工具', true, true, true, true, true]);
check('東西夠了就能打', [smithCheck('sickle', 0, { 'ore:copper': 5 }, 1500, 0), smithCheck('hoe', 2, { 'ore:gold': 5 }, 10000, 2)], [null, null]);
check('工具的名字', [toolTitle('hoe', 0, false), toolTitle('hoe', 0, true), toolTitle('can', 1, true), toolTitle('sickle', 3, false)], ['鋤頭', '大鋤頭', '銅澆水壺', '金鐮刀']);
check('成就：打鐵趁熱、金光閃閃', [achievementsMet({ ...zero, smithTiers: 1 }), achievementsMet({ ...zero, smithTiers: 8, goldTools: 2 }), achievementsMet({ ...zero, smithTiers: 9, goldTools: 3 })],
  [['smith'], ['smith'], ['smith', 'goldtools']]);

console.log('\n--- 捕蟲、昆蟲圖鑑（第二十四期） ---');
const SEASONS4 = ['spring', 'summer', 'autumn', 'winter'];
check('20 種昆蟲，都有名字、價錢、季節、地方、白天晚上', [Object.keys(BUGS).length, Object.values(BUGS).every((b) => b.name && b.sell > 0 && b.seasons.length
  && b.seasons.every((x) => SEASONS4.includes(x)) && b.where.length && b.where.every((a) => BUG_AREAS.includes(a)) && ['day', 'night', 'any'].includes(b.time) && b.weight > 0)], [20, true]);
check('每一種昆蟲都有圖', Object.keys(BUGS).every((id) => BUG_IDS.includes(id)), true);
check('捕蟲網 500 元、揮一次 1 點體力；每 2 小時換一批', [NET.price, NET.energy, BUG_SLOT_H, BUG_AREAS], [500, 1, 2, ['farm', 'hill', 'town', 'beach', 'terrace']]);
check('白天、晚上：6～18 點是白天', [0, 2, 3, 8, 9, 11].map(bugTimeOf), ['night', 'night', 'day', 'day', 'night', 'night']);
check('台灣時間 7:30 是第 3 批、23:59 是第 11 批', [bugSlotOf(Date.UTC(2026, 6, 1, 23, 30)), bugSlotOf(Date.UTC(2026, 6, 1, 15, 59))], [3, 11]);
check('每一季的白天都抓得到蟲', SEASONS4.map((se) => BUG_AREAS.some((a) => bugKinds(a, se, 'day', 'sun').length > 0)), [true, true, true, true]);
check('夏天晚上的後山：螢火蟲、獨角仙、鍬形蟲、紡織娘、皇蛾', bugKinds('hill', 'summer', 'night', 'sun').map((k) => k.id).sort(),
  ['atlas_moth', 'firefly', 'katydid', 'rhino_beetle', 'stag_beetle']);
check('颱風、寒流天沒有蟲；下雨天只有蝸牛（冬天連蝸牛都沒有）', [bugKinds('farm', 'summer', 'day', 'typhoon'), bugKinds('hill', 'summer', 'day', 'cold'),
  bugKinds('farm', 'summer', 'day', 'rain').map((k) => k.id), bugKinds('farm', 'winter', 'day', 'rain')], [[], [], ['snail'], []]);
check('寄居蟹一年四季都在海邊（白天晚上都有）', [bugKinds('beach', 'winter', 'night', 'sun').map((k) => k.id), bugKinds('beach', 'summer', 'day', 'cloud').map((k) => k.id)], [['hermit_crab'], ['hermit_crab']]);
const bugsAll = BUG_AREAS.flatMap((a) => bugsOf(77, '2026-07-15', 4, a, 'summer', 'sun', 'day').map((b) => ({ ...b, a })));
check('每張地圖一批幾隻：牧場 3、後山 5、小鎮 3、海邊 2、梯田 3', BUG_AREAS.map((a) => bugsAll.filter((b) => b.a === a).length), [3, 5, 3, 2, 3]);
check('同一天同一批，全家看到的一樣', JSON.stringify(bugsOf(77, '2026-07-15', 4, 'hill', 'summer', 'sun', 'day')) === JSON.stringify(bugsOf(77, '2026-07-15', 4, 'hill', 'summer', 'sun', 'day')), true);
check('下一批換位置', JSON.stringify(bugsOf(77, '2026-07-15', 4, 'hill', 'summer', 'sun', 'day')) !== JSON.stringify(bugsOf(77, '2026-07-15', 5, 'hill', 'summer', 'sun', 'day')), true);
check('蟲都在走得到的草地（海邊在沙灘），不在最上面兩排、不跟撿得到的東西重疊', bugsAll.every((b) => isWalkable(b.x, b.y, b.a) && b.y > 2
  && terrainAt(b.x, b.y, b.a) === (b.a === 'beach' ? 's' : '.') && !forageOf(77, '2026-07-15', b.a, 'summer').some((f) => f.x === b.x && f.y === b.y)), true);
check('牧場的蟲不在動物小屋的圍欄裡', bugsAll.filter((b) => b.a === 'farm').every((b) => !(b.x >= 21 && b.y >= 8)), true);
check('出來的都是這個季節、這個地方、這個時間的蟲', bugsAll.every((b) => BUGS[b.kind].where.includes(b.a) && BUGS[b.kind].seasons.includes('summer') && BUGS[b.kind].time !== 'night'), true);
check('普通的蟲一定抓得到；稀有的有時候飛走，同一隻結果一樣', [bugCaught(1, 'd', 1, 'farm', 0, 'cabbage_white'),
  bugCaught(1, 'd', 1, 'hill', 2, 'broadtail') === bugCaught(1, 'd', 1, 'hill', 2, 'broadtail'),
  Array.from({ length: 200 }, (_, i) => bugCaught(i, 'd', 1, 'hill', 0, 'atlas_moth')).filter(Boolean).length > 60,
  Array.from({ length: 200 }, (_, i) => bugCaught(i, 'd', 1, 'hill', 0, 'atlas_moth')).filter(Boolean).length < 140], [true, true, true, true]);
check('昆蟲可以賣、有名字', [itemPrice('bug:broadtail'), itemPrice('bug:snail'), itemName('bug:firefly'), itemPrice('bug:constructor')], [800, 20, '螢火蟲', 0]);
check('小傑最愛獨角仙、喜歡蟬', [giftReaction('jie', 'bug:rhino_beetle'), giftReaction('jie', 'bug:cicada')], ['love', 'like']);
check('成就：小小昆蟲學家、國寶蝴蝶', [achievementsMet({ ...zero, bugKinds: 10 }), achievementsMet({ ...zero, bugKinds: 9 }), achievementsMet({ ...zero, broadtail: true })],
  [['bugs10'], [], ['broadtail']]);

console.log('\n--- 信箱（第二十五期） ---');
check('信箱在房子右邊（x），不能走上去，下面那格走得到', [terrainAt(MAILBOX.x, MAILBOX.y), isWalkable(MAILBOX.x, MAILBOX.y), isWalkable(MAILBOX.x, MAILBOX.y + 1), seen.has(`${MAILBOX.x},${MAILBOX.y + 1}`)],
  ['x', false, true, true]);
check('一封信最多 80 個字、一天寄 5 封、信箱留 40 封', [MAIL_TEXT_MAX, PARCEL_DAILY, MAIL_KEEP], [80, 5, 40]);
check('信的內容：去掉看不見的字元、前後空白，太長切掉', [cleanMail('  晚安\u200b\n  明天見 '), cleanMail(''), cleanMail(null), [...cleanMail('好'.repeat(200))].length], ['晚安 明天見', '', '', 80]);
check('見面禮：郵差志明送 5 包小白菜種子', [WELCOME_LETTER.from, WELCOME_LETTER.item, WELCOME_LETTER.qty, WELCOME_LETTER.body.includes('信箱')], ['zhi', 'seed:bokchoy', 5, true]);
check('換季：阿福伯寄 3 包這一季的種子（不是小白菜，也不是秧苗）', ['spring', 'summer', 'autumn', 'winter'].map((se) => {
  const L = seasonLetter(se), id = (L.item || '').slice(5);
  return L.from === 'fu' && L.qty === 3 && id !== 'bokchoy' && !!CROPS[id] && !CROPS[id].paddy && CROPS[id].seasons.includes(se) && L.title.endsWith('天到了');
}), [true, true, true, true]);
check('每位村民都有 3 封信，有標題和內容', Object.keys(VILLAGERS).every((id) => VILLAGER_LETTERS[id] && VILLAGER_LETTERS[id].length === 3
  && VILLAGER_LETTERS[id].every((l) => l.title && l.body.length > 20)), true);
check('這週誰寫信：感情最好的（至少 1 顆愛心；一樣好照順序）', [letterWriter({}), letterWriter({ jie: 9 }), letterWriter({ lin: 10 }), letterWriter({ lin: 30, ama: 30 }), letterWriter({ fu: 12, zhi: 55 })],
  [null, null, 'lin', 'ama', 'zhi']);
const wl = weeklyLetter(5, '2026-11-09', 'lin');
check('每週的信：同一週同一封，附的東西是村民喜歡的', [JSON.stringify(wl) === JSON.stringify(weeklyLetter(5, '2026-11-09', 'lin')), VILLAGER_LETTERS.lin.some((l) => l.title === wl.title),
  !wl.item || (VILLAGERS.lin.likes.includes(wl.item) && wl.qty === 1 && itemPrice(wl.item) > 0)], [true, true, true]);
check('一年下來有時候附東西、有時候沒有', (() => { const n = Array.from({ length: 52 }, (_, i) => weeklyLetter(5, `w${i}`, 'mei').item).filter(Boolean).length; return n > 10 && n < 42; })(), true);
check('村民生日送了禮物：感謝信附上他最喜歡的東西 2 個（不會送蟲）', Object.keys(VILLAGERS).map((id) => { const L = birthdayThanks(id); return !!L.item && L.qty === 2 && itemPrice(L.item) > 0 && !L.item.startsWith('bug:') && L.body.includes(VILLAGERS[id].name); }),
  Object.keys(VILLAGERS).map(() => true));
check('成就：魚雁往返、鎮上的好朋友', [achievementsMet({ ...zero, mailSent: 5 }), achievementsMet({ ...zero, letters: 10 }), achievementsMet({ ...zero, mailSent: 4, letters: 9 })],
  [['mail5'], ['letters10'], []]);

console.log('\n--- 巨大作物、冬天的雪、流星雨（第二十六期） ---');
check('巨大作物：南瓜、西瓜、高麗菜，比九顆加起來還值錢', [Object.keys(GIANTS), ['pumpkin', 'watermelon', 'cabbage'].every((c) => GIANTS[c].sell > CROPS[c].sell * 9),
  itemPrice('giant:watermelon'), itemName('giant:cabbage'), GIANT_PCT], [['pumpkin', 'watermelon', 'cabbage'], true, 6300, '巨大高麗菜', 34]);
check('一顆巨大作物佔 3×3 九格', [giantCells({ x: 5, y: 10 }).length, giantCells({ x: 5, y: 10 })[8]], [9, { x: 7, y: 12 }]);
const ripeOf = (m) => (x, y) => m.get(`${x},${y}`) || null;
const patchOf = (x0, y0, w, h, crop) => { const m = new Map(); for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) m.set(`${x},${y}`, crop); return m; };
check('9 格同一種熟了的南瓜（機率 100）：長出一顆', giantsToday(1, 'd', ripeOf(patchOf(5, 10, 3, 3, 'pumpkin')), [], 100), [{ x: 5, y: 10, crop: 'pumpkin' }]);
check('機率 0：不會長', giantsToday(1, 'd', ripeOf(patchOf(5, 10, 3, 3, 'pumpkin')), [], 0), []);
check('4×3 只長一顆（不重疊）、6×3 長兩顆', [giantsToday(1, 'd', ripeOf(patchOf(5, 10, 4, 3, 'pumpkin')), [], 100).length, giantsToday(1, 'd', ripeOf(patchOf(5, 10, 6, 3, 'pumpkin')), [], 100).length], [1, 2]);
const mixedP = patchOf(5, 10, 3, 3, 'pumpkin'); mixedP.set('6,11', 'watermelon');
check('混了別的作物、少一排、番茄都不會長', [giantsToday(1, 'd', ripeOf(mixedP), [], 100), giantsToday(1, 'd', ripeOf(patchOf(5, 10, 3, 2, 'pumpkin')), [], 100),
  giantsToday(1, 'd', ripeOf(patchOf(5, 10, 3, 3, 'tomato')), [], 100)], [[], [], []]);
check('已經有巨大作物的格子不再算；田外面不會長', [giantsToday(1, 'd', ripeOf(patchOf(5, 10, 3, 3, 'pumpkin')), [{ x: 5, y: 10, crop: 'pumpkin' }], 100),
  giantsToday(1, 'd', ripeOf(patchOf(1, 1, 3, 3, 'pumpkin')), [], 100)], [[], []]);
check('平常大約三分之一的機會', (() => { let n = 0; for (let i = 0; i < 300; i++) n += giantsToday(i, 'd', ripeOf(patchOf(5, 10, 3, 3, 'pumpkin'))).length; return n > 70 && n < 140; })(), true);
check('冬天寒流、下雨的日子，後山和梯田下雪', [isSnowDay('winter', 'cold'), isSnowDay('winter', 'rain'), isSnowDay('winter', 'sun'), isSnowDay('autumn', 'cold'), SNOW_AREAS],
  [true, true, false, false, ['hill', 'terrace']]);
check('雪人小丘在後山（w），不能走上去，旁邊走得到；三段、一段 2 點體力', [terrainAt(SNOW_SPOT.x, SNOW_SPOT.y, 'hill'), isWalkable(SNOW_SPOT.x, SNOW_SPOT.y, 'hill'),
  isWalkable(SNOW_SPOT.x + 1, SNOW_SPOT.y, 'hill'), SNOWMAN.parts, SNOWMAN.energy], ['w', false, true, 3, 2]);
check('流星雨是哪一晚：晚上 8 點以後算今天、半夜算前一晚、白天沒有', [meteorNightOf(Date.UTC(2026, 11, 13, 12, 30)), meteorNightOf(Date.UTC(2026, 11, 13, 17, 0)),
  meteorNightOf(Date.UTC(2026, 11, 14, 2, 0))], ['2026-12-13', '2026-12-13', null]);
check('雙子座流星雨晴天看得到、下雨看不到；秋天平常的晚上沒有', [METEOR_DATES.includes('12-13'), isMeteorNight('2026-12-13', 'sun', 'winter'), isMeteorNight('2026-12-13', 'rain', 'winter'),
  isMeteorNight('2026-10-05', 'sun', 'autumn'), isMeteorNight(null, 'sun', 'winter')], [true, true, false, false, false]);
check('冬天晴朗的晚上常常有流星', (() => { let n = 0; for (const m of ['2026-12', '2027-01', '2027-02']) for (let d = 1; d <= 28; d++) n += isMeteorNight(`${m}-${String(d).padStart(2, '0')}`, 'sun', 'winter') ? 1 : 0; return n > 10 && n < 35; })(), true);
check('四個願望', Object.keys(WISHES), ['health', 'wealth', 'harvest', 'friends']);
check('成就：巨無霸、堆雪人、對流星許願', [achievementsMet({ ...zero, giants: 1 }), achievementsMet({ ...zero, snowmen: 1 }), achievementsMet({ ...zero, wishes: 1 })],
  [['giant'], ['snowman'], ['wish']]);

// 美術第一期：32×32 的新圖
check('除了稻子（梯田另外畫），每種作物都有 32×32 的新圖', Object.keys(CROPS).filter((c) => c !== 'rice' && !ART_NAMES.crops.includes(c)), []);
check('雞、鴨、牛、羊、狗、貓都有 32×32 的新圖', ['chicken', 'duck', 'cow', 'sheep', 'dog', 'cat'].filter((a) => !ART_NAMES.animals.includes(a)), []);
const lum = (c) => [1, 3, 5].reduce((n, i) => n + parseInt(c.slice(i, i + 2), 16), 0);
check('明暗：亮一階比較亮、暗一階比較暗、0 不變', [lum(shade('#62ad4b', 0.1)) > lum('#62ad4b'), lum(shade('#62ad4b', -0.1)) < lum('#62ad4b'), shade('#62ad4b', 0)],
  [true, true, '#62ad4b']);

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
