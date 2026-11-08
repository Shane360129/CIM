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
} from '../src/farm.js';
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
check('作物有 14 種', crops.length, 14);
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
  crops.filter(([id]) => !goodGrid(SPRITES[id + '_2']) || !goodGrid(SPRITES[id + '_3'])).map(([id]) => id), []);
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
check('雜貨店、小吃店、民宅、噴水池、告示板都走得到旁邊', ['G', 'R', 'Q', 'O', 'N'].map(touch), [true, true, true, true, true]);
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
check('越值錢的礦越少見', Object.keys(ORES).every((id, i, a) => i === 0 || oreCount[id] < oreCount[a[i - 1]]), true);
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
check('有 28 道自己煮得出來的菜（7 道用加工品）', [dishes.length, dishes.filter(([, d]) => Object.keys(d.need).some((k) => k.startsWith('good:') || k === 'mayo' || k === 'cheese')).length], [28, 7]);
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
check('每種加工品都只有一台加工機做得出來', Object.keys(GOODS).map((g) => recipesM.filter(([, x]) => x === g).length).every((n) => n === 1), true);
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
const full = { harvest: 999, shipped: 1e6, requests: 99, babies: 9, animals: 20, pets: 2, machines: 4, fishKinds: 9, dishKinds: 28, goodKinds: 11, amethyst: true, maxHearts: 10, minHearts: 10, stories: 18, gh: 1, house: 3, trees: 10, honey: true };
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

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
