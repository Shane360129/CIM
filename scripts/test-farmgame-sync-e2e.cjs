// 晴耕谷的雙人瀏覽器驗收（階段 2～4）：兩個瀏覽器、兩個帳號進同一座農場，
// 建立角色、互相看到走動和泡泡、翻土播種澆水、清雜草、出貨、買種子、進農舍、換衣服、倉庫箱、睡覺換日、斷線重連、離線摘要。
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
  const enter = async (tok, look) => {
    const cx = await br.newContext({ viewport: { width: 1000, height: 700 } }), p = await cx.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto(B + '/games/farm/?test'); await p.evaluate((t) => localStorage.setItem('cim_token', t), tok);
    await p.goto(B + `/games/farm/?conv=${dm.id}&test`); await p.waitForTimeout(1200);
    await p.locator('#stage').click({ position: { x: 300, y: 350 } }); await p.waitForTimeout(700);
    if (await p.locator('.maker').count()) { if (look) await look(p); await p.locator('.maker [data-act=done]').click(); }
    await p.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 8000 });
    return p;
  };
  const st = (p) => p.evaluate(() => {
    const w = window.__game.world, o = [...w.others.values()][0];
    return { me: { map: w.me.map, x: w.me.x, y: w.me.y, asleep: w.me.asleep, look: w.me.look, name: w.me.name }, other: o && { map: o.map, name: o.name, x: o.x, y: o.y, asleep: o.asleep, look: o.look }, n: w.others.size,
      tiles: [...w.tiles.values()], objs: w.objs.size, day: w.farm.day, minute: w.minute(), money: w.farm.money, ship: w.farm.ship, chest: (w.farm.chest || []).filter(Boolean), inv: w.self.inv, energy: w.self.energy, bubbles: [...w.bubbles.values()].map((x) => x.text), ready: w.ready };
  });
  // 把角色放到某個位置、面向某個方向（測試用，省掉走路的時間；位置照樣會送給伺服器）
  const tp = async (p, x, y, dir = 'down') => { await p.evaluate(([x, y, dir]) => { const w = window.__game.world; Object.assign(w.me, { x, y, px: x, py: y, dir }); w.room.send({ t: 'move', x, y, dir, vx: 0, vy: 0 }); }, [x, y, dir]); await p.waitForTimeout(150); };
  const slotOf = async (p, id) => p.evaluate((id) => window.__game.world.self.inv.findIndex((s) => s && s.id === id), id);
  const hold = async (p, id) => { const i = await slotOf(p, id); await p.keyboard.press('Digit' + ((i + 1) % 10)); };
  const count = async (p, id) => p.evaluate((id) => (window.__game.world.self.inv.find((s) => s && s.id === id) || { n: 0 }).n, id);

  const pa = await enter(a.token, async (p) => { await p.locator('.maker [data-gender=girl]').click(); await p.locator('.maker [data-next=hair]').click(); await p.locator('.maker .minput').fill('晴晴'); await p.screenshot({ path: S + '/s3-create.png' }); });
  const pb = await enter(b.token); await pa.waitForTimeout(500);
  let sa = await st(pa), sb = await st(pb);
  ok('建立角色：A 選女生、換髮型、改名字，B 看到一樣的造型和名字', sa.me.look.gender === 'girl' && sa.me.look.hair === 'bob' && sb.other && sb.other.look.hair === 'bob' && sb.other.name === '晴晴' && sa.other.look.gender === 'boy');
  await pa.keyboard.down('KeyD'); await pa.waitForTimeout(900); await pa.keyboard.up('KeyD'); await pa.waitForTimeout(500);
  sa = await st(pa); sb = await st(pb);
  ok(`A 走動，B 畫面上的 A 跟著走到差不多的位置（A ${sa.me.x.toFixed(2)}、B 看到 ${sb.other.x.toFixed(2)}）`, sa.me.x > 11 && Math.abs(sb.other.x - sa.me.x) < 0.25 && Math.abs(sb.other.y - sa.me.y) < 0.25);
  await pa.keyboard.press('KeyT'); await pa.keyboard.type('今天種什麼'); await pa.keyboard.press('Enter'); await pb.waitForTimeout(500);
  ok('A 說一句話，B 看到頭上的泡泡；打字的時候角色不會亂走', (await st(pb)).bubbles.includes('今天種什麼') && Math.abs((await st(pa)).me.x - sa.me.x) < 0.01);
  await pb.locator('.side button').nth(1).click(); await pb.locator('.emotes button').first().click(); await pa.waitForTimeout(500);
  ok('B 按表情，A 看到', (await st(pa)).bubbles.includes('😊'));
  // 種田：找一格沒有東西擋著的田
  const F = await pa.evaluate(() => { const w = window.__game.world; for (let y = 13; y < 21; y++) for (let x = 15; x < 27; x++) if (!w.obj('farm', x, y) && !w.obj('farm', x, y - 1) && !w.obj('farm', x + 1, y)) return { x, y }; });
  await tp(pa, F.x + 0.5, F.y - 0.5, 'down'); await tp(pb, F.x + 1.5, F.y - 0.5, 'down');
  await hold(pa, 'hoe'); await pa.keyboard.press('Space'); await pb.waitForTimeout(500);
  await hold(pa, 'seed_carrot'); await pa.keyboard.press('Space'); await pb.waitForTimeout(500);
  await hold(pa, 'can'); await pa.keyboard.press('Space'); await pb.waitForTimeout(500);
  sa = await st(pa); sb = await st(pb); const tb = sb.tiles.find((t) => t.x === F.x && t.y === F.y);
  ok('A 翻土、播種、澆水（切快捷列＋空白鍵），B 看到那一格有剛種下的紅蘿蔔而且是濕的', !!tb && tb.c && tb.c.id === 'carrot' && tb.c.s === 0 && tb.w === 1 && (await count(pa, 'seed_carrot')) === 7 && sa.energy < 100);
  await pa.keyboard.press('Space'); await pa.waitForTimeout(400);
  ok('重複澆水會被伺服器拒絕並提示', /已經弄好/.test(await pa.locator('.toast').textContent()));
  await pa.screenshot({ path: S + '/s4-farm.png' });
  // 清雜草
  const weed = await pa.evaluate(([fx, fy]) => { const w = window.__game.world; return [...w.objs.values()].filter((o) => o.map === 'farm' && o.type === 'weed').sort((p, q) => Math.hypot(p.x - fx, p.y - fy) - Math.hypot(q.x - fx, q.y - fy))[0]; }, [F.x, F.y]);
  const n0 = sb.objs; await tp(pa, weed.x + 0.5, weed.y + 1.4, 'up'); await hold(pa, 'hoe'); await pa.keyboard.press('Space'); await pa.waitForTimeout(400);
  ok('用錯工具會提示要用哪一種', /鐮刀/.test(await pa.locator('.toast').textContent()));
  await hold(pa, 'sickle'); await pa.keyboard.press('Space'); await pb.waitForTimeout(500);
  ok('鐮刀割掉雜草：兩邊都少一個東西，A 拿到纖維', (await st(pb)).objs === n0 - 1 && (await count(pa, 'fiber')) === 1);
  // 背包
  await pa.keyboard.press('KeyE'); await pa.waitForTimeout(300); await pa.screenshot({ path: S + '/s4-bag.png' });
  const fi = await slotOf(pa, 'fiber'); await pa.locator('.panel .cell').nth(fi).click(); await pa.locator('.panel .cell').nth(25).click(); await pa.waitForTimeout(400);
  ok('背包裡把纖維搬到別格', (await slotOf(pa, 'fiber')) === 25); await pa.keyboard.press('Escape');
  // 出貨箱
  await tp(pa, 12.5, 10.4, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  await pa.locator('.panel .cell').nth(25).click(); await pb.waitForTimeout(500);
  ok('對著出貨箱按空白鍵打開，點纖維放進去：B 也看得到箱子裡有東西', (await st(pb)).ship.length === 1 && (await count(pa, 'fiber')) === 0); await pa.keyboard.press('Escape');
  // 斷線重連
  await pa.evaluate(() => window.__game.world.room.drop()); await pb.waitForTimeout(500);
  ok('A 斷線：B 那邊 A 消失', (await st(pb)).n === 0);
  await pa.waitForFunction(() => window.__game.world.ready === true && window.__game.world.net === 'online', null, { timeout: 8000 }); await pb.waitForTimeout(500);
  sa = await st(pa);
  ok('A 自動重連：格子、背包都照伺服器的回來，B 又看到 A', sa.tiles.length === 1 && sa.inv.filter(Boolean).length >= 7 && (await st(pb)).n === 1);
  // 走到出口：往小鎮的路，買種子
  await tp(pa, 42.3, 16, 'right'); await pa.keyboard.down('KeyD'); await pa.waitForTimeout(500); await pa.keyboard.up('KeyD'); await pa.waitForTimeout(700);
  sa = await st(pa);
  ok('走到東邊出口會換到「往小鎮的路」，B 知道 A 在別的地圖', sa.me.map === 'road' && (await st(pb)).other.map === 'road' && /往小鎮的路/.test(await pa.locator('.clock small').first().textContent()));
  await tp(pa, 14, 6.6, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300); await pa.screenshot({ path: S + '/s4-shop.png' });
  await pa.locator('.shoprow[data-item=seed_cabbage] .pbtn').first().click(); await pb.waitForTimeout(500);
  ok('種子攤買高麗菜種子：背包多一包，錢兩邊都變成 450', (await count(pa, 'seed_cabbage')) === 1 && (await st(pa)).money === 450 && (await st(pb)).money === 450); await pa.keyboard.press('Escape');
  // 湖邊：採集、釣魚
  await tp(pa, 20.6, 0.7, 'up'); await pa.keyboard.down('KeyW'); await pa.waitForTimeout(500); await pa.keyboard.up('KeyW'); await pa.waitForTimeout(700);
  ok('從路上往北走到湖邊', (await st(pa)).me.map === 'lake');
  const fo = await pa.evaluate(() => [...window.__game.world.objs.values()].find((o) => o.map === 'lake' && o.type === 'forage'));
  await tp(pa, fo.x + 0.5, fo.y + 1.3, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(500);
  ok('湖邊有採集物，走過去按空白鍵撿起來', (await count(pa, fo.item)) === 1);
  await tp(pa, 18.5, 14.6, 'up'); await hold(pa, 'rod'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('拿釣竿對著湖面按空白鍵：拋竿，浮標在水上', (await pa.evaluate(() => window.__game.scenes.current.fishing.state)) === 'wait');
  await pa.screenshot({ path: S + '/s5-fishing.png' });
  await pa.waitForFunction(() => window.__game.scenes.current.fishing.state === 'bite', null, { timeout: 8000 }); await pa.keyboard.press('Space'); await pa.waitForTimeout(150);
  ok('看到「！」按空白鍵：進入小遊戲', (await pa.locator('.fishgame').count()) === 1);
  await pa.screenshot({ path: S + '/s5-fishgame.png' });
  for (let i = 0; i < 3; i++) { await pa.evaluate(() => window.__game.scenes.current.fishing.debug.aim()); await pa.keyboard.press('Space'); await pa.waitForTimeout(120); }
  await pa.waitForTimeout(500); const caught = await pa.locator('.toast').textContent();
  ok('指針在綠色的地方按三次：釣到了 → ' + caught, /釣到/.test(caught) && (await pa.locator('.fishgame').count()) === 0 && (await st(pa)).inv.some((x) => x && (x.id.startsWith('fish_') || x.id === 'junk')));
  await tp(pa, 18.5, 14.6, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('還沒上鉤就拉：魚跑掉', /太早/.test(await pa.locator('.toast').textContent()));
  await tp(pa, 17.6, 25.3, 'down'); await pa.keyboard.down('KeyS'); await pa.waitForTimeout(500); await pa.keyboard.up('KeyS'); await pa.waitForTimeout(700);
  ok('往南走回路上', (await st(pa)).me.map === 'road');
  await tp(pa, 0.6, 7, 'left'); await pa.keyboard.down('KeyA'); await pa.waitForTimeout(500); await pa.keyboard.up('KeyA'); await pa.waitForTimeout(700);
  ok('往西走回農場', (await st(pa)).me.map === 'farm');
  // 農舍：門、衣櫃、倉庫箱、床
  const goHome = async (p) => { await tp(p, 9.5, 9.3, 'up'); await p.keyboard.press('Space'); await p.waitForTimeout(700); };
  await goHome(pa); ok('對著門按空白鍵進農舍', (await st(pa)).me.map === 'house');
  await pa.screenshot({ path: S + '/s4-house.png' });
  await tp(pa, 4.5, 2.5, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(400);
  await pb.evaluate(([x, y]) => window.__game.world.room.req({ t: 'use', slot: 0, x: x + 1, y }), [F.x, F.y]); // A 在衣櫃裡的時候，B 那邊照常運作
  await pa.locator('.maker [data-next=hat]').click(); await pa.locator('.maker [data-act=done]').click(); await pb.waitForTimeout(600);
  sa = await st(pa); sb = await st(pb);
  ok('衣櫃換裝（戴上草帽），B 馬上看到；回到農舍畫面時看得到 B 剛翻的土', sa.me.look.hat === 'straw' && sb.other.look.hat === 'straw' && sa.tiles.length === 2);
  await tp(pa, 6.5, 2.5, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  await pa.locator('.panel .grid').last().locator('.cell').nth(await slotOf(pa, 'seed_spinach')).click(); await pb.waitForTimeout(500);
  ok('倉庫箱：A 把菠菜種子放進去，B 那邊也看得到（共用）', (await st(pb)).chest.length === 1 && (await count(pa, 'seed_spinach')) === 0); await pa.keyboard.press('Escape');
  const bed = async (p) => { await tp(p, 2.2, 3.4, 'up'); await p.keyboard.press('Space'); await p.waitForTimeout(300); await p.locator('.card button', { hasText: '睡覺' }).click(); await p.waitForTimeout(500); };
  await bed(pa); sa = await st(pa); sb = await st(pb);
  ok('A 先上床：還是第 1 天，B 知道 A 睡了', sa.day === 1 && sa.me.asleep && sb.other.asleep);
  await goHome(pb); await bed(pb); await pa.waitForTimeout(700); sa = await st(pa); sb = await st(pb);
  ok(`B 也回家上床：兩邊都到第 2 天早上（${sa.day} / ${sb.day}）`, sa.day === 2 && sb.day === 2 && sa.minute < 380 && !sa.me.asleep);
  const morning = await pa.locator('.card').textContent();
  ok('早上的卡片：天氣和昨天的出貨收入 → ' + morning.slice(0, 60), /早安/.test(morning) && /今天的天氣/.test(morning) && /纖維×1 → 3 元/.test(morning) && sa.money === 453);
  await pa.screenshot({ path: S + '/s4-morning.png' });
  ok('有澆水的紅蘿蔔長大了一階段；體力補滿', sa.tiles.find((t) => t.x === F.x && t.y === F.y).c.s === 1 && sa.energy === 100);
  await pa.locator('.card button').click(); await pb.locator('.card button').click();
  ok('時鐘顯示正確', /^6:\d0/.test(await pa.locator('.clock span').textContent()) && /第 1 年 春 2 日/.test(await pa.locator('.clock small').first().textContent()));
  // 離線摘要
  await pa.close(); await pb.waitForTimeout(300);
  await pb.evaluate(async ([x, y]) => { const w = window.__game.world; w.room.send({ t: 'move', x: 5, y: 7.6, dir: 'down', vx: 0, vy: 0 }); await new Promise((r) => setTimeout(r, 200)); await w.room.req({ t: 'warp', i: 0 }); await new Promise((r) => setTimeout(r, 100)); w.room.send({ t: 'move', x: x + 1.5, y: y - 0.5, dir: 'down', vx: 0, vy: 0 }); await new Promise((r) => setTimeout(r, 200)); const pick = w.self.inv.findIndex((s) => s && s.id === 'pick'); await w.room.req({ t: 'use', slot: pick, x: x + 1, y }); }, [F.x, F.y]);
  const pa2 = await enter(a.token);
  ok('重新進來不用再建立角色，造型和名字還在，人還在農舍裡', (await st(pa2)).me.look.hat === 'straw' && (await st(pa2)).me.name === '晴晴' && (await st(pa2)).me.map === 'house');
  const card = await pa2.locator('.card').textContent().catch(() => '');
  ok('A 回來看到「你不在時發生的事」：' + card, /你不在時發生的事/.test(card) && /阿耕/.test(card) && /清理 1 次/.test(card));
  ok('沒有錯誤訊息 ' + errs.join(' | '), errs.length === 0);
  await br.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('SCRIPT ERROR', e.message.slice(0, 300)); process.exit(1); });
