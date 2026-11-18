#!/usr/bin/env node
// 測試工具：把本機（wrangler dev）農場裡「第一個玩家」（最早註冊的）的工具升到指定等級，背包放進播種器、種子、肥料和升晶級的材料，錢加多一點。
// 只動 .wrangler/state 裡的本機資料，跟正式環境無關。給 scripts/test-farmroom-tools.mjs 用。
// 本機資料放在別的資料夾（wrangler dev --persist-to 資料夾）的話，用環境變數 FARM_STATE=資料夾 指過去。
// 用法：先停掉 npm run dev，再跑 node scripts/farm-give-tools.mjs [等級，預設 4（金）] [工具=等級 …]，然後重開 npm run dev
//   例如 node scripts/farm-give-tools.mjs 4 pick=5：全部升到金，十字鎬升到晶
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
const BAL = JSON.parse(readFileSync(new URL('../public/games/farm/data/balance.json', import.meta.url), 'utf8'));
const dir = (process.env.FARM_STATE || '.wrangler/state') + '/v3/do/chat-FarmRoom', top = BAL.tools.levels.length, lv = Math.max(1, Math.min(top, Number(process.argv[2]) || 4));
const only = Object.fromEntries(process.argv.slice(3).map((x) => x.split('=')).filter(([t, v]) => t && v).map(([t, v]) => [t, Math.max(1, Math.min(top, Number(v) || lv))])); // 個別指定
const GIVE = [['seeder', 1], ['seed_carrot', 40], ['fertilizer', 30], ['gold_bar', 10], ['diamond', 1], ['moonstone', 2]];
let n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sqlite') && x !== 'metadata.sqlite')) {
  const db = new DatabaseSync(`${dir}/${f}`);
  try {
    const row = db.prepare(`SELECT user_id, data FROM players ORDER BY user_id LIMIT 1`).get(); if (!row) { db.close(); continue; }
    const p = JSON.parse(row.data);
    p.toolLv = Object.fromEntries(['hoe', 'can', 'axe', 'pick', 'sickle', 'seeder'].map((t) => [t, only[t] || lv]));
    for (const [id, k] of GIVE) { const s = p.inv.find((x) => x && x.id === id); if (s) s.n = Math.max(s.n, k); else { const i = p.inv.findIndex((x, j) => !x && j < BAL.invSlots); if (i >= 0) p.inv[i] = { id, n: k }; else p.inv.push({ id, n: k }); } }
    p.energy = BAL.energyMax;
    db.prepare(`UPDATE players SET data = ? WHERE user_id = ?`).run(JSON.stringify(p), row.user_id);
    const farm = db.prepare(`SELECT value FROM meta WHERE key = 'farm'`).get();
    if (farm) { const fm = JSON.parse(farm.value); fm.money = Math.max(fm.money, 100000); db.prepare(`UPDATE meta SET value = ? WHERE key = 'farm'`).run(JSON.stringify(fm)); }
    n++;
  } catch (e) { console.log(f, String(e).slice(0, 160)); }
  db.close();
}
console.log(`升到第 ${lv} 級（${BAL.tools.levels[lv - 1]}）的玩家：${n} 個${Object.keys(only).length ? '；另外 ' + Object.entries(only).map(([t, v]) => `${t} 第 ${v} 級`).join('、') : ''}`);
