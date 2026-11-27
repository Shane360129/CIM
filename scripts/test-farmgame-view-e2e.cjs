// 晴耕谷：鏡頭、地圖、手機排版的瀏覽器驗收（電腦、直的手機、橫的手機各看一次）。
// 看：像素圖是整數倍放大（一個 LPC 像素剛好是整數個螢幕像素）、鏡頭遠近可以切換而且記得住（按鈕、滾輪、+／-）、
// 鏡頭拉遠時字不會小到看不清楚、地圖面板（M）畫得出每張地圖、面前可以互動的東西有名字、室內地板的圖、
// 直的手機快捷列十格都看得到、橫的手機快捷列和按鈕不會擋到人或互相壓到、省電模式看到的範圍不變。
// 需要 Playwright。用法：rm -rf .wrangler/state && npm run dev，另開終端機：node scripts/test-farmgame-view-e2e.cjs 截圖資料夾
const { chromium, devices } = require('playwright');
(async () => {
  const B = 'http://localhost:8787', S = process.argv[2] || '.';
  const j = async (p, b, t, m) => (await fetch(B + p, { method: m || (b ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
  for (let i = 0; i < 40; i++) { try { await j('/api/app-info'); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  const u = 'vw' + (Date.now() % 100000);
  const a = await j('/api/register', { username: u + 'a', password: 'pass123456', displayName: '小晴' });
  if (!a.token) { console.log('SCRIPT ERROR 註冊失敗（要用乾淨的資料庫）：' + JSON.stringify(a)); process.exit(1); }
  await j('/api/admin/settings', { inviteCode: 'inv-' + u }, a.token, 'PATCH');
  const b = await j('/api/register', { username: u + 'b', password: 'pass123456', displayName: '阿耕', inviteCode: 'inv-' + u });
  const dm = (await j('/api/conversations', { type: 'dm', userId: b.user.id }, a.token)).conversation;
  const br = await chromium.launch(); let fails = 0; const errs = [];
  const ok = (l, c, extra) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l + (!c && extra !== undefined ? '  →  ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
  // 打開遊戲、進到農場（第一次會先建立角色）
  const enter = async (opts, token) => {
    const p = await (await br.newContext(opts)).newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto(B + '/games/farm/?test'); await p.evaluate((t) => localStorage.setItem('cim_token', t), token);
    const start = async () => {
      await p.goto(B + `/games/farm/?conv=${dm.id}&test`); await p.waitForFunction(() => window.__game && window.__game.data, null, { timeout: 30000 });
      await p.waitForTimeout(300); await p.locator('#stage').click({ position: { x: 150, y: 320 } }); await p.waitForSelector('.maker, .side:not(.hidden)', { timeout: 15000 }).catch(() => {});
      if (await p.locator('.maker').count()) { await p.locator('.maker [data-preset="1"]').click(); await p.locator('.maker [data-act=done]').click(); }
      await p.waitForFunction(() => window.__game.world && window.__game.world.ready && window.__game.scenes.current.player, null, { timeout: 20000 });
      for (let i = 0; i < 4 && await p.locator('.card').count(); i++) { await p.locator('.card button').last().click(); await p.waitForTimeout(250); }
    };
    await start();
    return { p, start, W: (f, arg) => p.evaluate(f, arg) };
  };
  const cam = (W) => W(() => { const g = window.__game, c = g.camera; return { step: c.step, n: c.steps.length, tile: c.zoom * g.data.balance.tile, art: c.zoom * g.view.dpr * g.data.balance.tile / 32, sizes: c.steps.map((s) => s * g.data.balance.tile), dpr: g.view.dpr }; });
  const tp = async (p, W, x, y, dir = 'down') => { await W(([x, y, dir]) => { const w = window.__game.world; Object.assign(w.me, { x, y, px: x, py: y, dir }); w.room.send({ t: 'move', x, y, dir, vx: 0, vy: 0 }); }, [x, y, dir]); await p.waitForTimeout(500); };
  const box = async (p, sel) => p.locator(sel).first().boundingBox();
  const hits = (r, q) => !!r && !!q && r.x < q.x + q.width && q.x < r.x + r.width && r.y < q.y + q.height && q.y < r.y + r.height;

  // ---------- 電腦 ----------
  {
    const { p, start, W } = await enter({ viewport: { width: 1280, height: 800 } }, a.token);
    let c = await cam(W);
    ok(`電腦：預設一格 64 像素、可以選 3 段遠近 → ${c.sizes.join('／')}`, c.tile === 64 && c.n === 3 && c.sizes.join() === '32,64,96', c);
    ok('一個 LPC 像素剛好是整數個螢幕像素（每一段都是）', (await W(() => { const g = window.__game; return g.camera.steps.every((s) => Number.isInteger(s * g.view.dpr * g.data.balance.tile / 32)); })));
    await tp(p, W, 20.37, 14.21);
    const tr = await W(() => { const g = window.__game; g.camera.x += 0.37; g.camera.apply(g.view); const m = g.view.ctx.getTransform(); return [m.a, m.e, m.f]; });
    ok('鏡頭的位置對在螢幕像素上（捲動時像素圖不會糊）', Number.isInteger(tr[1]) && Number.isInteger(tr[2]), tr);
    const atlas = await W(async () => { const m = await (await fetch('assets/w1.json')).json(), sp = await import('./render/sprites.js'), s = sp.sprite('terrain/floor'); return { image: m.image, floor: m.sprites['terrain/floor'], loaded: !!(s && s.img && s.img.naturalWidth > 0) }; });
    ok('圖集是無損的 WebP、載得進來；室內地板用同一種顏色的木板（32 像素寬，不會一條深一條淺）', /\.webp$/.test(atlas.image) && atlas.loaded && atlas.floor[2] === 32, atlas);
    await p.screenshot({ path: S + '/view-pc-default.png' });
    // 按鈕：換下一段；記在這台裝置上
    await p.locator('.side [data-act=zoom]').click(); await p.waitForTimeout(300); c = await cam(W);
    ok('按 🔍 換到下一段（近）', c.step === 2 && c.tile === 96, c);
    await p.locator('.side [data-act=zoom]').click(); await p.waitForTimeout(300); c = await cam(W);
    ok('最近的再按一次回到最遠', c.step === 0 && c.tile === 32, c);
    await p.waitForTimeout(900); await p.screenshot({ path: S + '/view-pc-far.png' });
    const far = await W(async () => { const g = window.__game, px = await import('./render/pixel.js'); return { name: px.textSize(g.data.balance.tile * 0.2) * g.camera.zoom, saved: localStorage.getItem('farm-zoom') }; });
    ok(`鏡頭拉到最遠時名字還有 ${far.name.toFixed(1)} 像素大（至少 11）`, far.name >= 10.99, far);
    await start(); c = await cam(W);
    ok('重新整理之後還是上次選的遠近', c.step === 0 && far.saved === '32', c);
    // 滾輪、鍵盤
    await p.mouse.move(640, 400); await p.mouse.wheel(0, -200); await p.waitForTimeout(350); c = await cam(W);
    ok('滑鼠滾輪往前：拉近一段', c.step === 1, c);
    await p.keyboard.press('Equal'); await p.waitForTimeout(250); const c2 = await cam(W); await p.keyboard.press('Minus'); await p.waitForTimeout(250); c = await cam(W);
    ok('鍵盤 + 拉近、- 拉遠', c2.step === 2 && c.step === 1, [c2.step, c.step]);
    // 地圖
    await p.keyboard.press('KeyM'); await p.waitForSelector('.mappanel', { timeout: 3000 }).catch(() => {});
    const tabs = await p.locator('.maptabs button').allTextContents();
    ok('按 M 打開地圖：列出七張戶外地圖 → ' + tabs.join('、'), tabs.length === 7 && tabs.includes('小鎮') && tabs.includes('自家農場'), tabs);
    const drawn = () => W(() => { const cv = document.querySelector('.mapcv'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, set = new Set(); for (let i = 0; i < d.length; i += 4 * 97) set.add((d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3)); return { colors: set.size, w: cv.width, h: cv.height, title: document.querySelector('.mappanel h2').textContent, where: document.querySelector('.mapwhere').textContent }; });
    let m = await drawn();
    ok(`地圖畫出了農場（${m.w}×${m.h}，${m.colors} 種顏色），寫著兩個人各在哪裡`, m.colors > 40 && m.title === '地圖・自家農場' && /你在：自家農場/.test(m.where) && /阿耕現在不在線上/.test(m.where), m);
    await p.screenshot({ path: S + '/view-pc-map-farm.png' });
    await p.locator('.maptabs button[data-map=town]').click(); await p.waitForTimeout(300); m = await drawn();
    ok('可以切換看小鎮的地圖', m.colors > 40 && m.title === '地圖・小鎮', m);
    await p.screenshot({ path: S + '/view-pc-map-town.png' });
    await p.keyboard.press('KeyM'); await p.waitForTimeout(200);
    ok('再按一次 M 關掉', await p.locator('.mappanel').count() === 0);
    await p.locator('.side [data-act=map]').click(); await p.waitForTimeout(250); ok('按 🗺️ 也能打開', await p.locator('.mappanel').count() === 1); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // 面前可以互動的東西有名字
    const names = await W(() => { const s = window.__game.scenes.current; return { door: s.useName.get('9,8'), bin: s.useName.get('12,9'), wall: s.useName.get('7,8') || null, mail: s.useName.get('6,9') }; });
    ok(`站在可以互動的東西前面會寫出名字：${names.door}、${names.bin}、${names.mail}（農舍的牆不會）`, names.door === '進去：農舍裡' && names.bin === '出貨箱' && names.mail === '信箱' && names.wall === null, names);
    await tp(p, W, 9.5, 9.6, 'up'); await p.screenshot({ path: S + '/view-pc-door.png' });
    await W(() => localStorage.removeItem('farm-zoom')); await p.context().close();
  }
  // ---------- 直的手機 ----------
  {
    const { p, W } = await enter({ ...devices['iPhone 13'] }, b.token);
    let c = await cam(W);
    ok(`直的手機：預設一格 48 像素、可以選 3 段 → ${c.sizes.join('／')}`, c.tile === 48 && c.sizes.join() === '32,48,64', c);
    const vp = p.viewportSize(), slots = await p.locator('.hotbar .slot').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }));
    ok('快捷列十格都在畫面裡（兩排，不用左右滑）', slots.length === 10 && slots.every((r) => r[0] >= 0 && r[2] <= vp.width && r[1] >= 0 && r[3] <= vp.height) && new Set(slots.map((r) => r[1])).size === 2, slots);
    ok('教學提示在快捷列下面，沒有壓到', !hits(await box(p, '.hotbar'), await box(p, '.guide')), [await box(p, '.hotbar'), await box(p, '.guide')]);
    await tp(p, W, 20, 14); await p.screenshot({ path: S + '/view-phone-default.png' });
    await W(() => window.__game.settings.set('low', true)); await p.waitForTimeout(400); const low = await cam(W);
    ok(`開省電模式看到的範圍不變（一格還是 ${low.tile} 像素）`, low.tile === 48 && low.dpr === 1, low);
    await W(() => window.__game.settings.set('low', false)); await p.waitForTimeout(300);
    await p.locator('.side [data-act=zoom]').tap(); await p.waitForTimeout(250); await p.locator('.side [data-act=zoom]').tap(); await p.waitForTimeout(800); c = await cam(W);
    ok('按兩次 🔍：到最遠（一格 32 像素，看得到 12 格寬）', c.step === 0 && c.tile === 32, c);
    await p.screenshot({ path: S + '/view-phone-far.png' });
    await p.locator('.side [data-act=map]').tap(); await p.waitForSelector('.mappanel', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300);
    const mb = await box(p, '.mapcv');
    ok('手機打開地圖：整張地圖都在畫面裡', !!mb && mb.x >= 0 && mb.x + mb.width <= vp.width && mb.width > 250, mb);
    await p.screenshot({ path: S + '/view-phone-map.png' });
    await W(() => localStorage.removeItem('farm-zoom')); await p.context().close();
  }
  // ---------- 橫的手機 ----------
  {
    const { p, W } = await enter({ ...devices['iPhone 13 landscape'] }, b.token);
    const c = await cam(W), vp = p.viewportSize();
    ok(`橫的手機：至少看得到 7 格高（一格 ${c.tile} 像素，畫面高 ${vp.height}）`, vp.height / c.tile >= 7, c);
    await tp(p, W, 20, 14);
    const hb = await box(p, '.hotbar'), center = { x: vp.width / 2 - 20, y: vp.height / 2 - 40, width: 40, height: 60 };
    ok('快捷列在下面中間，沒有擋到畫面中間的人', !hits(hb, center) && hb.y > vp.height * 0.6, hb);
    ok('快捷列沒有壓到搖桿和動作鈕', !hits(hb, await box(p, '.stick')) && !hits(hb, await box(p, '.act-btn')), [hb, await box(p, '.stick'), await box(p, '.act-btn')]);
    const ls = await p.locator('.hotbar .slot').evaluateAll((els) => { const b = document.querySelector('.hotbar').getBoundingClientRect(); return els.filter((e) => { const r = e.getBoundingClientRect(); return r.left >= b.left && r.right <= b.right; }).length; });
    ok(`橫的手機快捷列十格都看得到（${ls} 格）`, ls === 10, ls);
    const side = await p.locator('.side button').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; })), act = await box(p, '.act-btn');
    ok(`右邊 ${side.length} 顆按鈕排成兩排，沒有壓到動作鈕、沒有超出畫面`, side.length === 6 && side.every((r) => !hits(r, act) && r.x >= 0 && r.x + r.width <= vp.width && r.y + r.height <= vp.height) && new Set(side.map((r) => Math.round(r.x))).size === 2, side);
    ok('教學提示沒有壓到搖桿', !hits(await box(p, '.guide'), await box(p, '.stick')), [await box(p, '.guide'), await box(p, '.stick')]);
    // 範圍鈕（拿著高級工具才會出現）：先讓它顯示出來量位置
    const rb = await W(() => { const e = document.querySelector('.rangebtn'); e.textContent = '▦ 5×5'; e.classList.remove('hidden'); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    ok('範圍鈕在動作鈕左邊，沒有壓到動作鈕、右邊的按鈕、快捷列', !hits(rb, act) && side.every((r) => !hits(r, rb)) && !hits(rb, hb) && rb.x + rb.width <= vp.width, [rb, act, hb]);
    await p.screenshot({ path: S + '/view-land-default.png' });
    await p.locator('.side [data-act=map]').tap(); await p.waitForSelector('.mappanel', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300);
    const mb = await box(p, '.mapcv'), pb = await box(p, '.mappanel');
    ok('橫的手機打開地圖：面板和地圖都在畫面裡，地圖至少 200 像素高', !!mb && pb.y >= 0 && pb.y + pb.height <= vp.height && mb.y + mb.height <= vp.height && mb.height >= 200, [mb, pb]);
    await p.screenshot({ path: S + '/view-land-map.png' });
    await p.context().close();
  }
  ok('沒有程式錯誤', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? `\n有 ${fails} 項沒過` : '\n全部通過');
  await br.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('SCRIPT ERROR ' + (e && e.stack || e)); process.exit(1); });
