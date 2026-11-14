// 晴耕谷的雙人瀏覽器驗收（階段 2～4）：兩個瀏覽器、兩個帳號進同一座農場，
// 建立角色、互相看到走動和泡泡、翻土播種澆水、清雜草、出貨、買種子、進農舍、換衣服、倉庫箱、睡覺換日、斷線重連、離線摘要。
// 需要 Playwright。用法：rm -rf .wrangler/state && npm run dev，另開終端機：node scripts/test-farmgame-sync-e2e.cjs 截圖資料夾
const { chromium } = require('playwright');
(async () => {
  const B = 'http://localhost:8787', S = process.argv[2] || '.';
  const j = async (p, b, t, m) => (await fetch(B + p, { method: m || (b ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
  for (let i = 0; i < 40; i++) { try { await j('/api/app-info'); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  // 外觀零件的清單（LPC）：換髮型、換帽子按一下「下一個」會變成清單上的下一款
  const PARTS = await (await fetch(B + '/games/farm/data/doll/parts.json')).json();
  const nextId = (list, id) => { const l = list.filter((v) => !v.hidden), i = l.findIndex((v) => v.id === id); return l[(i + 1) % l.length].id; };
  const HAIR2 = nextId(PARTS.hair, PARTS.presets.girl.hair), HAT2 = nextId(PARTS.hat, PARTS.presets.girl.hat);
  const a = await j('/api/register', { username: 'sy_a', password: 'pass123456', displayName: '小晴' });
  await j('/api/admin/settings', { inviteCode: 'inv-2' }, a.token, 'PATCH');
  const b = await j('/api/register', { username: 'sy_b', password: 'pass123456', displayName: '阿耕', inviteCode: 'inv-2' });
  const dm = (await j('/api/conversations', { type: 'dm', userId: b.user.id }, a.token)).conversation;
  const br = await chromium.launch(); let fails = 0;
  const ok = (l, c, extra) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l + (!c && extra ? '  →  ' + extra : '')); };
  const errs = [];
  const enter = async (tok, look) => {
    const cx = await br.newContext({ viewport: { width: 1000, height: 700 } }), p = await cx.newPage();
    p.on('pageerror', (e) => { errs.push(e.message); console.log('PAGEERROR ' + e.message); }); p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto(B + '/games/farm/?test'); await p.evaluate((t) => localStorage.setItem('cim_token', t), tok);
    await p.goto(B + `/games/farm/?conv=${dm.id}&test`); await p.waitForFunction(() => window.__game && window.__game.data, null, { timeout: 30000 }); await p.waitForTimeout(400); // 等圖集載完、標題畫面出來
    await p.locator('#stage').click({ position: { x: 300, y: 350 } }); await p.waitForTimeout(700);
    if (await p.locator('.maker').count()) { if (look) await look(p); await p.locator('.maker [data-act=done]').click(); }
    await p.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 });
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
  ok('建立角色：A 選女生、換髮型、改名字，B 看到一樣的造型和名字', sa.me.look.gender === 'girl' && sa.me.look.hair === HAIR2 && sb.other && sb.other.look.hair === HAIR2 && sb.other.name === '晴晴' && sa.other.look.gender === 'boy');
  await pa.keyboard.down('KeyD'); await pa.waitForTimeout(900); await pa.keyboard.up('KeyD'); await pa.waitForTimeout(500);
  sa = await st(pa); sb = await st(pb);
  ok(`A 走動，B 畫面上的 A 跟著走到差不多的位置（A ${sa.me.x.toFixed(2)}、B 看到 ${sb.other.x.toFixed(2)}）`, sa.me.x > 11 && Math.abs(sb.other.x - sa.me.x) < 0.25 && Math.abs(sb.other.y - sa.me.y) < 0.25);
  await pa.keyboard.press('KeyT'); await pa.keyboard.type('今天種什麼'); await pa.keyboard.press('Enter'); await pb.waitForTimeout(500);
  ok('A 說一句話，B 看到頭上的泡泡；打字的時候角色不會亂走', (await st(pb)).bubbles.includes('今天種什麼') && Math.abs((await st(pa)).me.x - sa.me.x) < 0.01);
  await pb.locator('.side button').nth(1).click(); await pb.locator('.emotes button').first().click(); await pa.waitForTimeout(500);
  ok('B 按表情，A 看到', (await st(pa)).bubbles.includes('😊'));
  // 階段 9：新手教學提示、設定、音效
  ok('一進來就有新手教學提示（第 1 步），不擋畫面', /📖 1\/11　清掉一根雜草或樹枝/.test(await pa.locator('.guide').textContent()) && !(await pa.locator('.card').count()));
  await pa.locator('.guide').click(); await pa.waitForTimeout(200);
  ok('點教學提示：展開說明和整張清單', /鐮刀/.test(await pa.locator('.card').textContent()) && /在便條板留一句話/.test(await pa.locator('.card').textContent())); await pa.locator('.card button').last().click();
  await pa.locator('.side [data-act=settings]').click(); await pa.waitForTimeout(200);
  ok('⚙️ 設定面板：音量、畫質、字體、搖桿、戀愛內容、教學、一天的長度', (await pa.locator('.settings .setrow').count()) === 9 && (await pa.locator('.settings [data-set=dayLen] button').count()) === 4 && /on/.test(await pa.locator('.settings [data-set=dayLen] button[data-value="15"]').getAttribute('class')));
  await pa.screenshot({ path: S + '/s9-settings.png' });
  await pa.locator('.settings [data-set=font] button[data-value=l]').click(); await pa.locator('.settings [data-set=low] button[data-value=true]').click(); await pa.waitForTimeout(200);
  ok('字體改大、畫質改省電：馬上生效（畫布像素變少），重新整理後還記得', (await pa.evaluate(() => document.getElementById('ui').classList.contains('font-l') && window.__game.view.dpr === 1 && JSON.parse(localStorage.getItem('farm-settings')).low === true)));
  await pa.locator('.settings [data-set=font] button[data-value=m]').click(); await pa.locator('.settings [data-set=low] button[data-value=false]').click();
  await pa.locator('.settings [data-set=dayLen] button[data-value="30"]').click(); await pb.waitForTimeout(500);
  ok('一天的長度改成 30 分鐘：兩邊的時鐘一起變慢，對方看到提示', (await pb.evaluate(() => window.__game.world.farm.opts.dayLen)) === 30 && Math.abs((await pa.evaluate(() => window.__game.world.farm.minutesPerSecond)) - 1200 / 1800) < 0.001 && /一天的長度改成 30 分鐘/.test(await pb.locator('.toast').textContent()));
  await pa.locator('.settings [data-set=dayLen] button[data-value="15"]').click(); await pa.waitForTimeout(300); await pa.keyboard.press('Escape');
  // 雙人：便條板、互送東西、拍照傳到聊天室
  await tp(pa, 13.5, 10.4, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  await pa.locator('.card .minput').fill('記得澆水喔'); await pa.locator('.card button').last().click(); await pb.waitForTimeout(500);
  ok('A 對著便條板留一句話，B 那邊收到', (await pb.evaluate(() => window.__game.world.farm.notes.map((n) => n.text).join())) === '記得澆水喔');
  await tp(pb, 13.5, 10.4, 'up'); await pb.keyboard.press('Space'); await pb.waitForTimeout(300);
  ok('B 打開便條板看得到 A 寫的', /晴晴：記得澆水喔/.test(await pb.locator('.card').textContent())); await pb.locator('.card button').first().click();
  await tp(pb, 12.6, 10.4, 'right'); await pa.keyboard.press('KeyE'); await pa.waitForTimeout(200);
  await pa.locator('.panel .cell').nth(await slotOf(pa, 'seed_spinach')).click(); await pa.waitForTimeout(150); await pa.locator('.panel [data-act=give]').click(); await pb.waitForTimeout(500);
  ok('站在一起時背包裡可以把東西送給對方：A 沒了、B 多 6 個並看到提示', (await count(pa, 'seed_spinach')) === 0 && (await count(pb, 'seed_spinach')) === 12 && /送你/.test(await pb.locator('.toast').textContent().catch(() => '')));
  await pa.keyboard.press('Escape'); await pb.evaluate(async () => { const w = window.__game.world; await w.room.req({ t: 'give', slot: w.self.inv.findIndex((x) => x && x.id === 'seed_spinach'), n: 6 }); }); await pa.waitForTimeout(300);
  await pa.locator('.side button').nth(2).click(); await pa.waitForTimeout(500); await pa.locator('.card button').last().click(); await pa.waitForTimeout(900);
  const msgs = (await j(`/api/conversations/${dm.id}/messages`, null, a.token)).messages || [];
  ok('按 📷 拍照：照片以圖片訊息傳到這個聊天室', msgs.some((m) => m.type === 'image' && !!(m.meta && m.meta.media)) && (await count(pa, 'seed_spinach')) === 6);
  // 種田：找一格沒有東西擋著的田
  const sfxB0 = await pb.evaluate(() => window.__game.audio.count);
  const F = await pa.evaluate(() => { const w = window.__game.world; for (let y = 13; y < 21; y++) for (let x = 15; x < 27; x++) if (!w.obj('farm', x, y) && !w.obj('farm', x, y - 1) && !w.obj('farm', x + 1, y)) return { x, y }; });
  await tp(pa, F.x + 0.5, F.y - 0.5, 'down'); await tp(pb, F.x + 1.5, F.y - 0.5, 'down');
  await hold(pa, 'hoe'); await pa.keyboard.press('Space'); await pb.waitForTimeout(500);
  await hold(pa, 'seed_carrot'); await pa.keyboard.press('Space'); await pb.waitForTimeout(500);
  await hold(pa, 'can'); await pa.keyboard.press('Space'); await pb.waitForTimeout(500);
  sa = await st(pa); sb = await st(pb); const tb = sb.tiles.find((t) => t.x === F.x && t.y === F.y);
  ok('A 翻土、播種、澆水（切快捷列＋空白鍵），B 看到那一格有剛種下的紅蘿蔔而且是濕的', !!tb && tb.c && tb.c.id === 'carrot' && tb.c.s === 0 && tb.w === 1 && (await count(pa, 'seed_carrot')) === 7 && sa.energy < 100);
  await pa.keyboard.press('Space'); await pa.waitForTimeout(400);
  ok('重複澆水會被伺服器拒絕並提示', /已經弄好/.test(await pa.locator('.toast').textContent()));
  ok('翻土、播種、澆水各有音效，被拒絕也有；B 那邊沒有因為 A 的動作出聲', (await pa.evaluate(() => window.__game.audio.count)) >= 4 && (await pb.evaluate(() => window.__game.audio.count)) === sfxB0, `A ${await pa.evaluate(() => window.__game.audio.count)}、B ${await pb.evaluate(() => window.__game.audio.count)}`);
  await pa.screenshot({ path: S + '/s4-farm.png' });
  // 清雜草
  const weed = await pa.evaluate(([fx, fy]) => { const w = window.__game.world; return [...w.objs.values()].filter((o) => o.map === 'farm' && o.type === 'weed').sort((p, q) => Math.hypot(p.x - fx, p.y - fy) - Math.hypot(q.x - fx, q.y - fy))[0]; }, [F.x, F.y]);
  const n0 = sb.objs; await tp(pa, weed.x + 0.5, weed.y + 1.4, 'up'); await hold(pa, 'hoe'); await pa.keyboard.press('Space'); await pa.waitForTimeout(400);
  ok('用錯工具會提示要用哪一種', /鐮刀/.test(await pa.locator('.toast').textContent()));
  await hold(pa, 'sickle'); await pa.keyboard.press('Space'); await pb.waitForTimeout(500);
  ok('鐮刀割掉雜草：兩邊都少一個東西，A 拿到纖維', (await st(pb)).objs === n0 - 1 && (await count(pa, 'fiber')) === 1);
  ok('教學跟著進度往前（兩個人共用）：B 的提示也到下一步了', /📖 5\/11　把東西放進出貨箱/.test(await pb.locator('.guide').textContent()), await pb.locator('.guide').textContent());
  // 背包
  await pa.keyboard.press('KeyE'); await pa.waitForTimeout(300); await pa.screenshot({ path: S + '/s4-bag.png' });
  const fi = await slotOf(pa, 'fiber'); await pa.locator('.panel .cell').nth(fi).click(); await pa.locator('.panel .cell').nth(25).click(); await pa.waitForTimeout(400);
  ok('背包裡把纖維搬到別格', (await slotOf(pa, 'fiber')) === 25); await pa.keyboard.press('Escape');
  // 出貨箱
  await tp(pa, 12.5, 10.4, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  await pa.locator('.panel .cell').nth(25).click(); await pb.waitForTimeout(500);
  ok('對著出貨箱按空白鍵打開，點纖維放進去：B 也看得到箱子裡有東西', (await st(pb)).ship.length === 1 && (await count(pa, 'fiber')) === 0); await pa.keyboard.press('Escape');
  // 製作台
  await tp(pa, 14.5, 10.4, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('對著製作台按空白鍵：列出 11 種加工機和要的材料，材料不夠的按不下去', (await pa.locator('.panel .shoprow').count()) === 11 && (await pa.locator('.panel .shoprow .pbtn:disabled').count()) === 11 && /木材×20/.test(await pa.locator('.panel .shoprow[data-item=jam]').textContent()));
  await pa.screenshot({ path: S + '/s5-craft.png' }); await pa.keyboard.press('Escape');
  // 雞舍：領養小狗（買雞要 300 元，留給伺服器測試）
  await tp(pa, 34, 22.7, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('對著雞舍按空白鍵：可以買雞和鴨、餵食、放牧、領養寵物', (await pa.locator('.panel .shoprow[data-item=chicken]').count()) === 1 && (await pa.locator('.panel [data-act=feed]').count()) === 1 && (await pa.locator('.panel [data-adopt]').count()) === 2);
  await pa.locator('.panel .minput').fill('阿福'); await pa.locator('.panel [data-adopt=dog]').click(); await pb.waitForTimeout(500);
  const pets = await pb.evaluate(() => window.__game.world.farm.pets);
  ok('A 領養小狗取名阿福，B 那邊也有了', pets.length === 1 && pets[0].name === '阿福'); await pa.keyboard.press('Escape');
  const dog = await pa.evaluate(() => { const b = window.__game.scenes.current.beasts()[0]; return { x: b.x, y: b.y }; });
  await tp(pa, dog.x, dog.y + 1.0, 'up'); await pa.evaluate(([x, y]) => window.__game.scenes.current.act({ x: Math.floor(x), y: Math.floor(y - 0.4) }), [dog.x, dog.y]); await pa.waitForTimeout(500);
  ok('走到小狗旁邊按動作鍵摸摸牠 → ' + (await pa.locator('.toast').textContent()), /阿福/.test(await pa.locator('.toast').textContent()));
  await pa.screenshot({ path: S + '/s5-pet.png' });
  // 斷線重連
  await pa.evaluate(() => window.__game.world.room.drop()); await pb.waitForTimeout(500);
  ok('A 斷線：B 那邊 A 消失', (await st(pb)).n === 0);
  await pa.waitForFunction(() => window.__game.world.ready === true && window.__game.world.net === 'online', null, { timeout: 20000 }); await pb.waitForTimeout(500);
  sa = await st(pa);
  ok('A 自動重連：格子、背包都照伺服器的回來，B 又看到 A', sa.tiles.length === 1 && sa.inv.filter(Boolean).length >= 7 && (await st(pb)).n === 1);
  // 走到出口：往小鎮的路，買種子
  await tp(pa, 42.3, 16, 'right'); await pa.keyboard.down('KeyD'); await pa.waitForTimeout(500); await pa.keyboard.up('KeyD'); await pa.waitForTimeout(700);
  sa = await st(pa);
  ok('走到東邊出口會換到「往小鎮的路」，B 知道 A 在別的地圖', sa.me.map === 'road' && (await st(pb)).other.map === 'road' && /往小鎮的路/.test(await pa.locator('.clock small').first().textContent()));
  await tp(pa, 14, 6.6, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300); await pa.screenshot({ path: S + '/s4-shop.png' });
  await pa.locator('.shoprow[data-item=seed_cabbage] .pbtn').first().click(); await pb.waitForTimeout(500);
  ok('種子攤買高麗菜種子：背包多一包，錢兩邊都變成 450', (await count(pa, 'seed_cabbage')) === 1 && (await st(pa)).money === 450 && (await st(pb)).money === 450); await pa.keyboard.press('Escape');
  // 小鎮與居民
  await tp(pa, 28.6, 7, 'right'); await pa.keyboard.down('KeyD'); await pa.waitForTimeout(500); await pa.keyboard.up('KeyD'); await pa.waitForTimeout(700);
  ok('沿著路往東走到小鎮', (await st(pa)).me.map === 'town');
  const folk = await pa.evaluate(() => window.__game.scenes.current.folks().map((f) => ({ id: f.id, x: f.x, y: f.y })));
  ok('小鎮上有 24 位居民', folk.length === 24);
  const ahe = folk.find((f) => f.id === 'ahe'); await tp(pa, ahe.x, ahe.y + 1.0, 'up'); await hold(pa, 'seed_carrot'); await pa.keyboard.press('Space'); await pa.waitForTimeout(600);
  ok('走到阿禾旁邊按空白鍵：對話框有大頭像、名字、職業和愛心', (await pa.locator('.dialog').count()) === 1 && /阿禾/.test(await pa.locator('.dialog h2').textContent()) && /雜貨店老闆/.test(await pa.locator('.dialog .dsub').textContent()) && (await pa.locator('.dialog .dface .icon').count()) === 1);
  await pa.keyboard.press('Space'); await pa.waitForTimeout(200); const hello = await pa.locator('.dialog .dtext').textContent();
  ok('字是一個一個跑出來的，再按一次空白鍵整句顯示；第一次見面說的是自我介紹 → ' + hello.slice(0, 20), /我是雜貨店的阿禾/.test(hello));
  await pa.screenshot({ path: S + '/s6-talk.png' });
  await pa.locator('.dialog button', { hasText: '送他' }).click(); await pa.waitForTimeout(500); await pa.keyboard.press('Space'); await pa.waitForTimeout(200);
  const thanks = await pa.locator('.dialog .dtext').textContent();
  ok('把手上的東西送給他：他有反應，好感變多，種子少一包 → ' + thanks.slice(0, 20), thanks.length > 3 && (await pa.evaluate(() => window.__game.world.self.friend.ahe.pts)) === 40 && (await count(pa, 'seed_carrot')) === 6);
  await pa.locator('.dialog button').last().click(); await pa.waitForTimeout(200);
  // 劇情事件（畫面流程；測試裡把畫面上的好感調高來觸發，伺服器那邊好感不夠所以不會真的記下來）
  const xm = folk.find((f) => f.id === 'xiaoman'); await tp(pa, xm.x, xm.y + 1.0, 'up');
  await pa.evaluate(() => { window.__game.world.self.friend.xiaoman = { pts: 600 }; window.__game.room = window.__game.world.room; const r = window.__game.world.room, req = r.req.bind(r); r.req = async (m) => { const out = await req(m); if (m.t === 'talk') window.__game.world.self.friend.xiaoman = { pts: 600 }; return out; }; });
  await pa.keyboard.press('Space'); await pa.waitForTimeout(900);
  ok('好感夠了去找小滿：先淡出顯示旁白', (await pa.locator('.fade').count()) === 1 && /焦味/.test(await pa.locator('.fade').textContent()));
  await pa.waitForSelector('.dialog', { timeout: 6000 }); await pa.keyboard.press('Space'); await pa.waitForTimeout(150);
  ok('接著是她的台詞（難過的表情）', /又烤焦了/.test(await pa.locator('.dialog .dtext').textContent()));
  await pa.locator('.dialog button').click(); await pa.waitForTimeout(300); await pa.keyboard.press('Space'); await pa.locator('.dialog button').click(); await pa.waitForTimeout(300);
  ok('出現三個選項', (await pa.locator('.dialog button').count()) === 3);
  await pa.screenshot({ path: S + '/s6-event.png' });
  await pa.locator('.dialog button', { hasText: '試吃' }).click(); await pa.waitForTimeout(300); await pa.keyboard.press('Space'); await pa.waitForTimeout(100);
  ok('選「幫你試吃」跳到對應的那一段', /吃邊邊沒有焦的地方/.test(await pa.locator('.dialog .dtext').textContent()));
  for (let i = 0; i < 6 && (await pa.locator('.dialog').count()); i++) { await pa.keyboard.press('Space'); await pa.waitForTimeout(80); await pa.locator('.dialog button').first().click().catch(() => {}); await pa.waitForTimeout(900); }
  ok('劇情演完回到遊戲', (await pa.locator('.dialog').count()) === 0);
  // 節慶（把畫面上的日子當成節慶、時間縮成 3 秒來看流程；伺服器知道今天不是節慶，所以不會給獎）
  await pa.evaluate(() => { const g = window.__game; g.world.farm.festival = 'flower'; g.data.festivals.flower.seconds = 3; g.data.festivals.egg.seconds = 3; });
  await tp(pa, 22, 21.6, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('節慶當天廣場有舞台，對著它按空白鍵：說明規則', /花見祭/.test(await pa.locator('.card h2').textContent()) && /接花瓣/.test(await pa.locator('.card').textContent()));
  await pa.locator('.card button', { hasText: '開始' }).click(); await pa.waitForTimeout(600);
  ok('開始接花瓣：畫面換成小遊戲，上面有倒數和分數', /花見祭　\d 秒/.test(await pa.locator('.timer').textContent()));
  await pa.keyboard.down('KeyD'); await pa.waitForTimeout(800); await pa.keyboard.up('KeyD'); await pa.screenshot({ path: S + '/s6-petals.png' });
  await pa.waitForSelector('.card', { timeout: 20000 });
  ok('時間到：顯示分數，按回去回到小鎮', /花見祭：\d+ 分/.test(await pa.locator('.card h2').textContent()));
  await pa.locator('.card button').click(); await pa.waitForTimeout(600);
  await pa.evaluate(() => { window.__game.world.farm.festival = 'egg'; }); await tp(pa, 22, 21.6, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300); await pa.locator('.card button', { hasText: '開始' }).click(); await pa.waitForTimeout(400);
  const eggs = await pa.evaluate(() => window.__game.scenes.current.hunt.eggs.length); const e0 = await pa.evaluate(() => window.__game.scenes.current.hunt.eggs[0]);
  await tp(pa, e0.x + 0.5, e0.y + 0.5, 'down'); await pa.waitForTimeout(300);
  ok(`尋蛋節：地圖上藏了 ${eggs} 顆彩蛋，走過去就撿到`, eggs === 14 && /1／14 顆/.test(await pa.locator('.timer').textContent()));
  await pa.waitForSelector('.card', { timeout: 20000 });
  ok('時間到結算', /找到 1 顆/.test(await pa.locator('.card h2').textContent())); await pa.locator('.card button').click(); await pa.evaluate(() => { window.__game.world.farm.festival = null; });
  await tp(pa, 25.5, 14.5, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300); await pa.locator('.card button', { hasText: '修復小鎮' }).click(); await pa.waitForTimeout(300);
  ok('佈告欄 → 修復小鎮：列出八個設施和各自需要的東西', (await pa.locator('.panel .frow').count()) === 8 && /木材 0.120/.test(await pa.locator('.panel .frow[data-item=clocktower]').textContent()));
  await pa.locator('.panel .frow[data-item=market]').click(); await pa.locator('.panel .grid .cell').nth(await slotOf(pa, 'seed_spinach')).click(); await pa.waitForTimeout(400);
  ok('設施不需要的東西不會收', /不需要/.test(await pa.locator('.toast').textContent()) && (await count(pa, 'seed_spinach')) === 6);
  await pa.screenshot({ path: S + '/s7-restore.png' }); await pa.keyboard.press('Escape');
  await tp(pa, 25.5, 14.5, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300); await pa.locator('.card button', { hasText: '今天的委託' }).click(); await pa.waitForTimeout(300);
  ok('佈告欄：今天的委託（誰要幾個什麼、報酬多少） → ' + (await pa.locator('.card').textContent()).slice(0, 40), /今天的委託/.test(await pa.locator('.card h2').textContent()) && /報酬 \d+ 元/.test(await pa.locator('.card').textContent()));
  await pa.keyboard.press('Escape');
  await tp(pa, 7, 9.7, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('雜貨店先問要看什麼：果樹苗、溫室種子、或種子和雜貨', /想看什麼/.test(await pa.locator('.card').textContent()) && (await pa.locator('.card button').count()) === 3);
  await pa.locator('.card button').first().click(); await pa.waitForTimeout(300);
  ok('果樹苗圃：20 種果樹苗，寫著多久長大', (await pa.locator('.panel .shoprow').count()) === 20 && /蘋果樹苗/.test(await pa.locator('.panel .shoprow').first().textContent()) && /8 天長大/.test(await pa.locator('.panel').textContent()));
  await pa.screenshot({ path: S + '/s9-nursery.png' }); await pa.keyboard.press('Escape'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300); await pa.locator('.card button').last().click(); await pa.waitForTimeout(300);
  ok('雜貨店：早上 8 點才開，面板會寫營業時間，買的按鈕按不下去', /雜貨店/.test(await pa.locator('.panel h2').textContent()) && /8:00～18:00/.test(await pa.locator('.panel .hint').first().textContent()) && (await pa.locator('.panel .pbtn:not(:disabled)').count()) === 0);
  await pa.keyboard.press('Escape');
  await tp(pa, 37, 9.7, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('木工屋：可以擴建農舍、開墾南邊的田、蓋溫室，寫出要多少錢和材料', (await pa.locator('.panel .shoprow').count()) === 3 && /15000 元/.test(await pa.locator('.panel .shoprow[data-item=greenhouse]').textContent()) && /3000 元/.test(await pa.locator('.panel .shoprow[data-item=house]').textContent()) && /8000 元/.test(await pa.locator('.panel .shoprow[data-item=field2]').textContent()));
  await pa.keyboard.press('Escape');
  await pa.keyboard.press('KeyE'); await pa.waitForTimeout(200); await pa.locator('.panel [data-act=codex]').click(); await pa.waitForTimeout(300);
  ok('背包 → 圖鑑與成就：六類圖鑑、54 個成就、紀念冊、三種劇情', (await pa.locator('.panel h3').count()) === 11 && /居民的故事 \d+／\d+\|晴耕谷的故事 \d+／\d+\|兩個人的回憶 \d+／\d+/.test((await pa.locator('.panel h3').allTextContents()).join('|')) && /成就 0／54/.test((await pa.locator('.panel h3').allTextContents()).join('|')) && /紀念冊 \d+／\d+/.test((await pa.locator('.panel h3').allTextContents()).join('|')) && (await pa.locator('.panel .cell.unknown').count()) >= 50);
  await pa.screenshot({ path: S + '/s7-codex.png' }); await pa.keyboard.press('Escape');
  await tp(pa, 30, 9.7, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('鐵匠鋪：列出六種工具現在的等級和升級要的錠', (await pa.locator('.panel .shoprow').count()) === 6 && /銅錠×5、1000 元/.test(await pa.locator('.panel .shoprow[data-item=hoe]').textContent()));
  await pa.screenshot({ path: S + '/s6-smith.png' }); await pa.keyboard.press('Escape');
  await tp(pa, 0.7, 15.5, 'left'); await pa.keyboard.down('KeyA'); await pa.waitForTimeout(500); await pa.keyboard.up('KeyA'); await pa.waitForTimeout(700);
  ok('往西走回路上', (await st(pa)).me.map === 'road');
  // 湖邊：採集、釣魚
  await tp(pa, 20.6, 0.7, 'up'); await pa.keyboard.down('KeyW'); await pa.waitForTimeout(500); await pa.keyboard.up('KeyW'); await pa.waitForTimeout(700);
  ok('從路上往北走到湖邊', (await st(pa)).me.map === 'lake');
  const fo = await pa.evaluate(() => [...window.__game.world.objs.values()].find((o) => o.map === 'lake' && o.type === 'forage'));
  await tp(pa, fo.x + 0.5, fo.y + 1.3, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(500);
  ok('湖邊有採集物，走過去按空白鍵撿起來', (await count(pa, fo.item)) === 1);
  await tp(pa, 18.5, 14.6, 'up'); await hold(pa, 'rod'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('拿釣竿對著湖面按空白鍵：拋竿，浮標在水上', (await pa.evaluate(() => window.__game.scenes.current.fishing.state)) === 'wait');
  await pa.screenshot({ path: S + '/s5-fishing.png' });
  await pa.waitForFunction(() => window.__game.scenes.current.fishing.state === 'bite', null, { timeout: 20000 }); await pa.keyboard.press('Space'); await pa.waitForTimeout(150);
  ok('看到「！」按空白鍵：進入小遊戲', (await pa.locator('.fishgame').count()) === 1);
  await pa.screenshot({ path: S + '/s5-fishgame.png' });
  for (let i = 0; i < 3; i++) { await pa.evaluate(() => window.__game.scenes.current.fishing.debug.aim()); await pa.keyboard.press('Space'); await pa.waitForTimeout(120); }
  await pa.waitForTimeout(500); const caught = await pa.locator('.toast').textContent();
  ok('指針在綠色的地方按三次：釣到了 → ' + caught, /釣到/.test(caught) && (await pa.locator('.fishgame').count()) === 0 && (await st(pa)).inv.some((x) => x && (x.id.startsWith('fish_') || x.id === 'junk')));
  await tp(pa, 18.5, 14.6, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('還沒上鉤就拉：魚跑掉', /太早/.test(await pa.locator('.toast').textContent()));
  // 礦坑
  await tp(pa, 31.5, 18.7, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('對著礦坑入口按空白鍵：可以進第 1 層（還沒有電梯樓層）', (await pa.locator('.card button').count()) === 2);
  await pa.locator('.card button', { hasText: '第 1 層' }).click(); await pa.waitForTimeout(700);
  const mine = await pa.evaluate(() => { const w = window.__game.world; return { map: w.me.map, rocks: w.mine && w.mine.rocks.length, mons: w.mine && w.mine.mons.length, hp: w.self.hp }; });
  ok(`進到礦坑第 1 層：${mine.rocks} 顆石頭、${mine.mons} 隻怪物，畫面上出現血量`, mine.map === 'mine' && mine.rocks >= 30 && (await pa.locator('.chip.hp:not(.hidden)').count()) === 1 && /礦坑第 1 層/.test(await pa.locator('.clock small').first().textContent()));
  const rk = await pa.evaluate(() => { const s = window.__game.world.mine; return s.rocks.filter((r) => r.type === 'stone' && !s.rocks.some((q) => q.x === r.x && q.y === r.y + 1)).sort((a, b) => Math.hypot(a.x - 10, a.y - 12) - Math.hypot(b.x - 10, b.y - 12))[0]; });
  await tp(pa, rk.x + 0.5, rk.y + 1.5, 'up'); await hold(pa, 'pick'); await pa.keyboard.press('Space'); await pa.waitForTimeout(350); await pa.keyboard.press('Space'); await pa.waitForTimeout(500);
  ok('用十字鎬敲兩下石頭：石頭少一顆、拿到石頭', (await pa.evaluate(() => window.__game.world.mine.rocks.length)) === mine.rocks - 1 && (await count(pa, 'stone')) >= 1);
  await pa.screenshot({ path: S + '/s5-mine.png' });
  ok('B 知道 A 在礦坑裡', (await st(pb)).other.map === 'mine');
  await tp(pa, 10.5, 12.5, 'down'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300); await pa.locator('.card button', { hasText: '出去' }).click(); await pa.waitForTimeout(700);
  ok('對著梯子按空白鍵選「出去」：回到湖邊', (await st(pa)).me.map === 'lake' && (await pa.locator('.chip.hp.hidden').count()) === 1);
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
  ok('衣櫃換裝（換一頂帽子），B 馬上看到；回到農舍畫面時看得到 B 剛翻的土', sa.me.look.hat === HAT2 && sb.other.look.hat === HAT2 && sa.tiles.length === 2);
  await tp(pa, 8.5, 2.5, 'up'); await pa.keyboard.press('Space'); await pa.waitForTimeout(300);
  ok('對著爐灶按空白鍵：列出 20 道料理，等級不夠的會寫幾級才會煮', (await pa.locator('.panel .shoprow').count()) === 20 && /料理 8 級才會煮/.test(await pa.locator('.panel .shoprow[data-item=strawberry_cake]').textContent()));
  await pa.screenshot({ path: S + '/s5-cook.png' }); await pa.keyboard.press('Escape');
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
  ok('重新進來不用再建立角色，造型和名字還在，人還在農舍裡', (await st(pa2)).me.look.hat === HAT2 && (await st(pa2)).me.name === '晴晴' && (await st(pa2)).me.map === 'house');
  const card = await pa2.locator('.card').textContent().catch(() => '');
  ok('A 回來看到「你不在時發生的事」：' + card, /你不在時發生的事/.test(card) && /阿耕/.test(card) && /清理 1 次/.test(card));
  ok('沒有錯誤訊息 ' + errs.join(' | '), errs.length === 0);
  await br.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('SCRIPT ERROR', e.message.slice(0, 300)); process.exit(1); });
