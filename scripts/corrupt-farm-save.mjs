#!/usr/bin/env node
// 測試工具：把本機（wrangler dev）農場的存檔故意弄壞，用來驗證「存檔損毀保護」。只動 .wrangler/state 裡的本機資料，跟正式環境無關。
// 用法：先停掉 npm run dev，再跑 node scripts/corrupt-farm-save.mjs [farm|player|chunk]，然後重開 npm run dev、跑 npm run test:farmroom -- after-corrupt
import { DatabaseSync } from 'node:sqlite';
import { readdirSync } from 'node:fs';
const dir = '.wrangler/state/v3/do/chat-FarmRoom', what = process.argv[2] || 'farm';
let n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sqlite') && x !== 'metadata.sqlite')) {
  const db = new DatabaseSync(`${dir}/${f}`);
  try {
    if (what === 'farm') n += db.prepare(`UPDATE meta SET value = '{"day": 3, "money": 12' WHERE key = 'farm'`).run().changes;
    if (what === 'player') n += db.prepare(`UPDATE players SET data = 'xx{' WHERE user_id = (SELECT MIN(user_id) FROM players)`).run().changes;
    if (what === 'chunk') n += db.prepare(`UPDATE mapchunks SET data = '[oops'`).run().changes;
  } catch (e) { console.log(f, String(e).slice(0, 120)); }
  db.close();
}
console.log(`弄壞了 ${n} 筆（${what}）`);
