#!/usr/bin/env node
// 家族小牧場的規則單元測試（不需要啟動伺服器）：npm run test:farm
// 驗證地圖（田地都走得到、商店出貨箱碰得到）、作物只在濕土時成長、
// 成長階段、時間倍率、台灣時間換日（體力恢復）、四季與作物、天氣（下雨自動澆水）、
// 會再長的作物，以及每種作物都有畫好的圖。

import {
  FARM_MAP, FARM_W, FARM_H, FARM_SPAWN, CROPS, isField, isWalkable, terrainAt,
  grownMs, cropStage, cropTotalMs, isWet, waterUntil, taiwanDay, seasonOf, WATER_HOURS,
  SEASONS, inSeason, regrowProgressMs, weatherOf, wetMsBetween, wetUntilOf, dayEndOf, nextSeasonStart,
  PEN, PEN_GATE, ANIMALS, PRODUCTS, LOVE_BEST, hearts, productOf, animalReadyAt, animalHasProduct, cleanAnimalName,
  TOWN_MAP, ARRIVE, VILLAGERS, friendHearts, giftReaction, giftPoints, friendReward, villagerOut, requestOf,
  FOODS, TOOL_UPGRADES, area3x3, ENERGY_MAX,
  HILL_MAP, MAPS, EXITS, FISH, ORES, QUARRY, ROCKS_PER_DAY, fishChoices, pickWeighted, rocksOf, itemPrice,
  DISHES, INGREDIENT_GROUPS, ingredientItems, canCook, cookTakes,
} from '../src/farm.js';
import { SPRITES, PALETTE, FISH_SHAPE, BOOT_SHAPE, ROCK_SHAPE, FISH_COLORS, ORE_COLORS, DISH_SHAPES, DISH_COLORS } from '../public/farm-sprites.js';

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
  [...Object.keys(ANIMALS).flatMap((k) => [k + '_0', k + '_1']), ...Object.keys(PRODUCTS), 'feed'].filter((n) => !goodGrid(SPRITES[n])), []);

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
check('天氣只有晴、多雲、雨', ws.every((w) => ['sun', 'cloud', 'rain'].includes(w)), true);
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
const dishes = Object.entries(DISHES);
check('有 17 道菜', dishes.length, 17);
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

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
