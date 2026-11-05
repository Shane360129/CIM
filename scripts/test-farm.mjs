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
} from '../src/farm.js';
import { SPRITES, PALETTE } from '../public/farm-sprites.js';

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

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
