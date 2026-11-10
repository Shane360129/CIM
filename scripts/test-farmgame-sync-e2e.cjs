// 晴耕谷階段 2 的瀏覽器驗收：兩個瀏覽器、兩個帳號進同一座農場，互相看到走動、泡泡、翻土；斷線重連；睡覺換日。
// 需要 Playwright。用法：rm -rf .wrangler/state && npm run dev，另開終端機：node scripts/test-farmgame-sync-e2e.cjs 截圖資料夾
const { chromium } = require('playwright');
(async () => {
  const B = 'http://localhost:8787', S = process.argv[2] || '.';
  const j = async (p, b, t, m) => (await fetch(B + p, { method: m || (b ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
  for (let i = 0; i < 40; i++) { try { await j('/api/app-info'); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  const a = await j('/api/register', { username: 'sy_a', password: 'pass123456', displayName: '小晴' });
  await j('/api/admin/settings', { inviteCode: 'inv-2' }, a.token, 'PATCH');
  const b = await j('/api/register', { username: 'sy_b', password: 'pass123456', displayName: '阿耕', inviteCode: 'inv-2' });
  const dm = (await j('/api/conversations', { type: 'dm', userId: b.user.id }, a.token)).conversation;
  const br = await chromium.launch(); let fails = 0;
  const ok = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
  const errs = [];
  const enter = async (tok) => {
    const cx = await br.newContext({ viewport: { width: 1000, height: 700 } }), p = await cx.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto(B + '/games/farm/?test'); await p.evaluate((t) => localStorage.setItem('cim_token', t), tok);
    await p.goto(B + `/games/farm/?conv=${dm.id}&test`); await p.waitForTimeout(1200);
    await p.locator('#stage').click({ position: { x: 500, y: 350 } }); await p.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 8000 });
    return p;
  };
  const st = (p) => p.evaluate(() => { const s = window.__game.scenes.current; return { me: { x: s.player.x, y: s.player.y, asleep: s.player.asleep }, others: [...s.others.values()].map((o) => ({ name: o.name, x: o.x, y: o.y, asleep: o.asleep })), tiles: [...s.tiles.values()], day: s.farm.day, minute: s.minute(), bubbles: [...s.bubbles.values()].map((x) => x.text), ready: s.ready }; });
  const pa = await enter(a.token), pb = await enter(b.token); await pa.waitForTimeout(500);
  let sa = await st(pa), sb = await st(pb);
  ok('兩邊都看得到對方', sa.others.length === 1 && sa.others[0].name === '阿耕' && sb.others.length === 1 && sb.others[0].name === '小晴');
  await pa.keyboard.down('KeyD'); await pa.waitForTimeout(900); await pa.keyboard.up('KeyD'); await pa.waitForTimeout(500);
  sa = await st(pa); sb = await st(pb);
  ok(`A 走動，B 畫面上的 A 跟著走到差不多的位置（A ${sa.me.x.toFixed(2)}、B 看到 ${sb.others[0].x.toFixed(2)}）`, sa.me.x > 13 && Math.abs(sb.others[0].x - sa.me.x) < 0.25 && Math.abs(sb.others[0].y - sa.me.y) < 0.25);
  const sent = await pa.evaluate(() => window.__moveCount ?? null);
  // 泡泡與表情
  await pa.keyboard.press('KeyT'); await pa.keyboard.type('今天種什麼'); await pa.keyboard.press('Enter'); await pb.waitForTimeout(500);
  ok('A 說一句話，B 看到頭上的泡泡', (await st(pb)).bubbles.includes('今天種什麼') && (await st(pa)).bubbles.includes('今天種什麼'));
  ok('打字的時候角色不會亂走', Math.abs((await st(pa)).me.x - sa.me.x) < 0.01);
  await pb.locator('.side button').nth(1).click(); await pb.locator('.emotes button').first().click(); await pa.waitForTimeout(500);
  ok('B 按表情，A 看到', (await st(pa)).bubbles.includes('😊'));
  await pa.screenshot({ path: S + '/s2-two.png' });
  // 翻土：A 走到田邊，用鋤頭翻一格；B 看到
  await pa.evaluate(() => { const s = window.__game.scenes.current; s.player.x = s.player.px = 15.5; s.player.y = s.player.py = 12.5; s.player.dir = 'down'; s.room.send({ t: 'move', x: 15.5, y: 12.5, dir: 'down', vx: 0, vy: 0 }); });
  await pa.waitForTimeout(300); await pa.keyboard.press('Digit1'); await pa.keyboard.press('Space'); await pb.waitForTimeout(600);
  sa = await st(pa); sb = await st(pb);
  ok('A 翻土（空白鍵），兩邊都看到那一格', sa.tiles.length === 1 && sb.tiles.length === 1 && sb.tiles[0].x === 15 && sb.tiles[0].y === 13);
  await pa.keyboard.press('Digit2'); await pa.keyboard.press('Space'); await pb.waitForTimeout(500);
  ok('A 澆水，B 看到變濕', (await st(pb)).tiles[0].w === 1);
  await pa.keyboard.press('Space'); await pa.waitForTimeout(400);
  ok('重複澆水會被伺服器拒絕並提示', /先做了/.test(await pa.locator('.toast').textContent()));
  // 斷線重連
  await pa.evaluate(() => window.__game.scenes.current.room.drop()); await pb.waitForTimeout(400);
  ok('A 斷線：B 那邊 A 消失', (await st(pb)).others.length === 0);
  await pb.evaluate(() => { const s = window.__game.scenes.current; s.room.act('till', 16, 13); }); // B 太遠 → 會被拒絕，不影響
  await pa.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 8000 }); await pb.waitForTimeout(400);
  sa = await st(pa);
  ok('A 自動重連：位置、格子都照伺服器的回來，B 又看到 A', sa.tiles.length === 1 && Math.abs(sa.me.x - 15.5) < 0.01 && (await st(pb)).others.length === 1);
  // 睡覺換日
  const bed = async (p) => { await p.evaluate(() => { const s = window.__game.scenes.current; s.player.x = s.player.px = 10.5; s.player.y = s.player.py = 8.5; s.player.dir = 'up'; s.room.send({ t: 'move', x: 10.5, y: 8.5, dir: 'up', vx: 0, vy: 0 }); }); await p.waitForTimeout(200); await p.keyboard.press('Space'); await p.waitForTimeout(300); await p.locator('.card button', { hasText: '睡覺' }).click(); await p.waitForTimeout(400); };
  await bed(pa); sa = await st(pa); sb = await st(pb);
  ok('A 先上床：還是第 1 天，B 看到 A 睡了', sa.day === 1 && sa.me.asleep && sb.others[0].asleep);
  await bed(pb); await pa.waitForTimeout(600); sa = await st(pa); sb = await st(pb);
  ok(`B 也上床：兩邊都到第 2 天早上（${sa.day} / ${sb.day}，${Math.floor(sa.minute / 60)} 點），澆的水乾了`, sa.day === 2 && sb.day === 2 && sa.minute < 380 && sa.tiles[0].w === 0 && !sa.me.asleep);
  ok('時鐘顯示正確', /^6:\d0$/.test(await pa.locator('.clock span').textContent()) && /第 1 年 春 2 日/.test(await pa.locator('.clock small').first().textContent()));
  // 離線摘要
  await pa.close(); await pb.waitForTimeout(300);
  await pb.evaluate(async () => { const s = window.__game.scenes.current; s.player.x = 15.5; s.player.y = 12.5; s.room.send({ t: 'move', x: 15.5, y: 12.5, dir: 'down', vx: 0, vy: 0 }); await new Promise((r) => setTimeout(r, 200)); await s.room.act('till', 16, 13); await s.room.act('water', 16, 13); });
  const pa2 = await enter(a.token);
  const card = await pa2.locator('.card').textContent().catch(() => '');
  ok('A 回來看到「你不在時發生的事」：' + card, /你不在時發生的事/.test(card) && /阿耕/.test(card) && /翻土 1 次/.test(card));
  await pa2.screenshot({ path: S + '/s2-summary.png' });
  ok('沒有錯誤訊息 ' + errs.join(' | '), errs.length === 0);
  await br.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('SCRIPT ERROR', e.message); process.exit(1); });
