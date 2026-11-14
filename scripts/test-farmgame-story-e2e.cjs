// 晴耕谷：劇情和換裝的瀏覽器驗收（兩個帳號、一個電腦一個手機）。
// 1. 主線第一章：剛建好角色、站在家門口就自己開始；兩個人剛好在一起，所以一起看（shared）；看完有獎勵、紀念冊多一頁
// 2. 換裝：背包裡的「換衣服」→ 存成穿搭 → 換別套 → 背包裡一鍵換回存好的那套；對方看到的也跟著換
// 3. 兩個人的劇情：第一次翻土之後兩個人站在一起，兩邊同時開始「第一塊田」；兩邊的 @a／@b 是同一個人
// 4. 圖鑑：紀念冊、看過的劇情可以再看一次
// 需要 Playwright。用法：rm -rf .wrangler/state && npm run dev，另開終端機：node scripts/test-farmgame-story-e2e.cjs 截圖資料夾
const { chromium } = require('playwright');
(async () => {
  const B = 'http://localhost:8787', S = process.argv[2] || '.';
  const j = async (p, b, t, m) => (await fetch(B + p, { method: m || (b ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
  for (let i = 0; i < 40; i++) { try { await j('/api/app-info'); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  const u = 'st' + (Date.now() % 100000);
  const a = await j('/api/register', { username: u + 'a', password: 'pass123456', displayName: '小晴' });
  if (!a.token) { console.log('SCRIPT ERROR 註冊失敗（要用乾淨的資料庫）：' + JSON.stringify(a)); process.exit(1); }
  await j('/api/admin/settings', { inviteCode: 'inv-' + u }, a.token, 'PATCH');
  const b = await j('/api/register', { username: u + 'b', password: 'pass123456', displayName: '阿耕', inviteCode: 'inv-' + u });
  const dm = (await j('/api/conversations', { type: 'dm', userId: b.user.id }, a.token)).conversation;
  const PARTS = await (await fetch(B + '/games/farm/data/doll/parts.json')).json();
  const br = await chromium.launch(); let fails = 0; const errs = [];
  const ok = (l, c, extra) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l + (!c && extra ? '  →  ' + extra : '')); };
  const open = async (tok, mobile) => {
    const cx = await br.newContext(mobile ? { viewport: { width: 390, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1000, height: 700 } }), p = await cx.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto(B + '/games/farm/?test'); await p.evaluate((t) => localStorage.setItem('cim_token', t), tok);
    await p.goto(B + `/games/farm/?conv=${dm.id}&test&story`); await p.waitForFunction(() => window.__game && window.__game.data, null, { timeout: 30000 });
    return p;
  };
  const start = async (p) => { await p.waitForTimeout(300); await p.locator('#stage').click({ position: { x: 150, y: 200 } }); await p.waitForSelector('.maker', { timeout: 15000 }); };
  const sub = (p) => p.evaluate(() => { const d = document.querySelector('.dialog .dsub'); return d ? d.textContent : null; });
  // 把劇情一句一句點完（選項選第一個）；回傳看到的劇情標題和說話的人
  const playThrough = async (p, max = 80) => {
    const seen = { titles: new Set(), names: [] };
    for (let i = 0; i < max; i++) {
      const has = await p.locator('.dialog').count();
      if (!has) { if (!(await p.evaluate(() => !!window.__game.scenes.current.eventing))) break; await p.waitForTimeout(200); continue; } // 冒表情、換場的時候沒有對話框，等劇情演完
      const t = await sub(p); if (t) seen.titles.add(t);
      seen.names.push(await p.evaluate(() => { const h = document.querySelector('.dialog h2'); return h ? h.textContent : ''; }));
      await p.locator('.dialog').click({ position: { x: 30, y: 20 } }).catch(() => {}); // 先把字全部顯示
      await p.locator('.dialog .row button').first().click({ timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(120);
    }
    return seen;
  };
  const closeCards = async (p) => { await p.waitForTimeout(500); for (let i = 0; i < 6 && await p.locator('.card').count(); i++) { await p.locator('.card button').last().click(); await p.waitForTimeout(250); } };
  const self = (p) => p.evaluate(() => { const W = window.__game.world; return { events: W.self.events || {}, outfits: W.self.outfits || [], look: W.me.look, inv: W.self.inv, album: (W.farm.album || []).map((e) => e.key), x: W.me.x, y: W.me.y }; });
  const same = (x, y) => !!x && !!y && Object.keys(y).every((k) => x[k] === y[k]);

  // ---- 建角色：兩個人一起進農場 ----
  const [pa, pb] = await Promise.all([open(a.token, false), open(b.token, true)]);
  await Promise.all([start(pa), start(pb)]);
  await Promise.all([pa.locator('.maker [data-preset="2"]').click(), pb.locator('.maker [data-preset="7"]').click()]);
  await Promise.all([pa.locator('.maker .minput').fill('晴晴'), pb.locator('.maker .minput').fill('阿耕')]);
  ok('建角畫面有「存成穿搭」', (await pa.locator('.maker [data-act=save-outfit]').count()) === 1);
  await Promise.all([pa.locator('.maker [data-act=done]').click(), pb.locator('.maker [data-act=done]').click()]);
  await Promise.all([pa.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 }), pb.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 })]);

  // ---- 1. 主線第一章：家門口自己開始，兩個人一起看 ----
  const both = await Promise.all([pa.waitForSelector('.dialog', { timeout: 15000 }).then(() => true).catch(() => false), pb.waitForSelector('.dialog', { timeout: 15000 }).then(() => true).catch(() => false)]);
  const ta = await sub(pa), tb = await sub(pb);
  ok('剛進農場、站在家門口：主線第一章自己開始，兩個人一起看', both[0] && both[1] && ta === tb && !!ta, `${ta} / ${tb}`);
  await pa.waitForTimeout(600); await pa.screenshot({ path: S + '/s1-story-arrive.png' }); await pb.screenshot({ path: S + '/s1-story-arrive-phone.png' });
  ok('演劇情的時候不能走動', await (async () => { const x0 = (await self(pa)).x; await pa.keyboard.down('KeyD'); await pa.waitForTimeout(500); await pa.keyboard.up('KeyD'); return Math.abs((await self(pa)).x - x0) < 0.01; })());
  await Promise.all([playThrough(pa), playThrough(pb)]);
  const rc = await pa.locator('.card').count() ? await pa.locator('.card').innerText() : '';
  ok('看完：卡片說拿到什麼、紀念冊多一頁', /拿到/.test(rc) && /紀念冊/.test(rc), rc.slice(0, 120));
  await pa.screenshot({ path: S + '/s2-story-reward.png' });
  await closeCards(pa); await closeCards(pb);
  let sa = await self(pa), sb = await self(pb);
  ok('兩個人都記下看過第一章，紀念冊有這一頁', !!sa.events.story_arrive && !!sb.events.story_arrive && sa.album.includes('ev:story_arrive'), JSON.stringify({ a: sa.events, b: sb.events, al: sa.album }));
  await pa.waitForTimeout(2600);
  ok('看過的不會再演一次', (await pa.locator('.dialog').count()) === 0 && (await pb.locator('.dialog').count()) === 0);

  // ---- 2. 換裝：背包 → 換衣服 → 存成穿搭 → 換別套 → 背包一鍵換回來 ----
  await pa.locator('.chips button').last().click(); await pa.waitForSelector('.panel');
  ok('背包裡有「換衣服」', (await pa.locator('.panel [data-act=wardrobe]').count()) === 1);
  await pa.locator('.panel [data-act=wardrobe]').click(); await pa.waitForSelector('.maker');
  ok('按「換衣服」打開換衣服的畫面', (await pa.locator('.maker h2').innerText()) === '換衣服');
  const mine = (await self(pa)).look;
  await pa.locator('.maker .oinput').fill('種田裝'); await pa.locator('.maker [data-act=save-outfit]').click();
  await pa.waitForSelector('.maker [data-outfit="0"]', { timeout: 5000 }).catch(() => {});
  sa = await self(pa);
  ok('存成穿搭：我的穿搭多一套（名字、樣子都對）', sa.outfits.length === 1 && sa.outfits[0].name === '種田裝' && same(sa.outfits[0].look, mine) && (await pa.locator('.maker [data-outfit="0"]').count()) === 1);
  await pa.locator('.maker [data-preset="10"]').click(); await pa.waitForTimeout(400);
  await pa.screenshot({ path: S + '/s3-wardrobe-outfits.png' });
  await pa.locator('.maker [data-act=done]').click(); await pa.waitForFunction(() => window.__game.scenes.current.ready === true);
  await pa.waitForTimeout(500);
  ok('換成別套：對方也看到新的樣子', same((await pb.evaluate(() => [...window.__game.world.others.values()][0].look)), PARTS.gallery[10].look));
  await pa.locator('.chips button').last().click(); await pa.waitForSelector('.panel [data-wear="0"]');
  await pa.waitForTimeout(500); await pa.locator('.chips button').last().click(); await pa.locator('.chips button').last().click(); await pa.waitForSelector('.panel [data-wear="0"]'); // 頭像下載好再開一次（截圖好看）
  await pa.screenshot({ path: S + '/s4-bag-outfits.png' });
  await pa.locator('.panel [data-wear="0"]').click(); await pa.waitForTimeout(500);
  ok('背包裡點「種田裝」一鍵換回來；對方也看到', same((await self(pa)).look, mine) && same((await pb.evaluate(() => [...window.__game.world.others.values()][0].look)), mine) && (await pa.locator('.panel [data-wear="0"].on').count()) === 1);
  await pa.keyboard.press('Escape');

  // ---- 3. 兩個人的劇情：第一次翻土、兩個人站在一起 ----
  await pa.waitForTimeout(500);
  const till = await pa.evaluate(async () => {
    const W = window.__game.world; W.me.x = 15.5; W.me.y = 11.4; W.room.send({ t: 'move', x: 15.5, y: 11.4, dir: 'down', vx: 0, vy: 0 });
    await new Promise((r) => setTimeout(r, 150)); return W.room.req({ t: 'use', slot: W.self.inv.findIndex((s) => s && s.id === 'hoe'), x: 15, y: 12 });
  });
  await pb.evaluate(() => { const W = window.__game.world; W.me.x = 16.5; W.me.y = 11.4; W.room.send({ t: 'move', x: 16.5, y: 11.4, dir: 'down', vx: 0, vy: 0 }); });
  const duo = await Promise.all([pa.waitForFunction(() => { const d = document.querySelector('.dialog .dsub'); return d && d.textContent === '第一塊田'; }, null, { timeout: 40000 }).then(() => true).catch(() => false), pb.waitForFunction(() => { const d = document.querySelector('.dialog .dsub'); return d && d.textContent === '第一塊田'; }, null, { timeout: 40000 }).then(() => true).catch(() => false)]);
  ok('翻了第一塊田、兩個人站在一起：「第一塊田」兩邊同時開始', till && till.t === 'ok' && duo[0] && duo[1], JSON.stringify(till));
  await pa.locator('.dialog').click({ position: { x: 30, y: 20 } }); await pa.locator('.dialog .row button').first().click(); await pb.locator('.dialog').click({ position: { x: 30, y: 20 } }); await pb.locator('.dialog .row button').first().click();
  await pa.waitForTimeout(700);
  const n1 = await Promise.all([pa, pb].map((p) => p.evaluate(() => document.querySelector('.dialog h2') && document.querySelector('.dialog h2').textContent)));
  ok('兩邊畫面上是同一個人說第一句（@a）', !!n1[0] && n1[0] === n1[1] && ['晴晴', '阿耕'].includes(n1[0]), JSON.stringify(n1));
  await pa.screenshot({ path: S + '/s5-duo.png' }); await pb.screenshot({ path: S + '/s5-duo-phone.png' });
  await Promise.all([playThrough(pa), playThrough(pb)]);
  await closeCards(pa); await closeCards(pb);
  sa = await self(pa); sb = await self(pb);
  ok('兩個人都記下看過「第一塊田」，紀念冊多一頁', !!sa.events.duo_first && !!sb.events.duo_first && sa.album.includes('ev:duo_first'));

  // ---- 4. 圖鑑：紀念冊、再看一次 ----
  await pa.locator('.chips button').last().click(); await pa.locator('.panel [data-act=codex]').click(); await pa.waitForSelector('.panel [data-replay]');
  const txt = await pa.locator('.panel').innerText();
  ok('圖鑑的紀念冊有劇情的那幾頁，看過的劇情列出來', /搬進晴耕谷的那一天/.test(txt) && /翻好了第一塊田/.test(txt) && (await pa.locator('.panel [data-replay="story_arrive"]').count()) === 1 && (await pa.locator('.panel [data-replay="duo_first"]').count()) === 1);
  await pa.locator('.panel [data-replay="story_arrive"]').scrollIntoViewIfNeeded(); await pa.screenshot({ path: S + '/s6-codex-story.png' });
  await pa.locator('.panel [data-replay="story_arrive"]').click();
  ok('再看一次：劇情重新演', await pa.waitForSelector('.dialog', { timeout: 5000 }).then(() => true).catch(() => false));
  const again = await playThrough(pa); await pa.waitForTimeout(500);
  ok('重看完不會再給獎勵（沒有獎勵的卡片）', again.titles.size === 1 && (await pa.locator('.card').count()) === 0);
  ok('沒有錯誤訊息 ' + errs.join(' | '), errs.length === 0);
  await br.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('SCRIPT ERROR', e.message.slice(0, 400)); process.exit(1); });
