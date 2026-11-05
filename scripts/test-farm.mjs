#!/usr/bin/env node
// 家族小牧場的規則單元測試（不需要啟動伺服器）：npm run test:farm
// 驗證地圖（田地都走得到、商店出貨箱碰得到）、作物只在濕土時成長、
// 成長階段、時間倍率、台灣時間換日（體力恢復）、季節。

import {
  FARM_MAP, FARM_W, FARM_H, FARM_SPAWN, CROPS, isField, isWalkable, terrainAt,
  grownMs, cropStage, cropTotalMs, isWet, waterUntil, taiwanDay, seasonOf, WATER_HOURS,
} from '../src/farm.js';

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
check('作物資料：成熟時間越久越值錢',
  Object.values(CROPS).every((c, i, a) => i === 0 || (c.hours > a[i - 1].hours && c.sell > a[i - 1].sell)), true);

console.log('\n--- 台灣時間 ---');
check('台灣 23:59 還是同一天', taiwanDay(Date.UTC(2026, 10, 5, 15, 59)), '2026-11-05');
check('台灣 00:00 換日（體力恢復）', taiwanDay(Date.UTC(2026, 10, 5, 16, 0)), '2026-11-06');
check('季節：台灣 3/1 凌晨已經是春天', seasonOf(Date.UTC(2026, 1, 28, 16, 30)), 'spring');
check('季節：夏、秋、冬', [seasonOf(Date.UTC(2026, 6, 1)), seasonOf(Date.UTC(2026, 9, 1)), seasonOf(Date.UTC(2026, 0, 15))], ['summer', 'autumn', 'winter']);

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
