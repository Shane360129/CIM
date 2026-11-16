// 晴耕谷：高級工具的瀏覽器驗收（接在 scripts/test-farmroom-tools.mjs 後面跑，用那時升到金、鋤頭升到晶的玩家 ft_a）。
// 看：拿著工具時面前會動到的格子有框、範圍按鈕（按 R 也可以）切換一次弄幾格、按下去整片翻好、翻過的田連成一片、鐵匠鋪寫著晶。
// 用法：照 test-farmroom-tools.mjs 的說明跑完之後（npm run dev 還開著），node scripts/test-farmgame-tools-e2e.cjs 截圖資料夾
const { chromium } = require('playwright');
(async () => {
  const B = 'http://localhost:8787', S = process.argv[2] || '.';
  const j = async (p, b, t) => (await fetch(B + p, { method: b ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
  const a = await j('/api/login', { username: 'ft_a', password: 'pass123456' }), b = await j('/api/login', { username: 'ft_b', password: 'pass123456' });
  if (!a.token) { console.log('SCRIPT ERROR 先跑 scripts/test-farmroom-tools.mjs'); process.exit(1); }
  const dm = (await j('/api/conversations', null, a.token)).conversations.find((c) => c.type === 'dm' && c.members.some((m) => m.userId === b.user.id));
  const br = await chromium.launch(); let fails = 0; const errs = [];
  const ok = (l, c, extra) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l + (!c && extra ? '  →  ' + extra : '')); };
  const p = await (await br.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errs.push(m.text()); });
  await p.goto(B + '/games/farm/?test'); await p.evaluate((t) => localStorage.setItem('cim_token', t), a.token);
  await p.goto(B + `/games/farm/?conv=${dm.id}&test`); await p.waitForFunction(() => window.__game && window.__game.data, null, { timeout: 30000 });
  await p.waitForTimeout(300); await p.locator('#stage').click({ position: { x: 150, y: 200 } }); await p.waitForSelector('.maker, .hud', { timeout: 15000 }).catch(() => {});
  if (await p.locator('.maker').count()) { await p.locator('.maker [data-preset="1"]').click(); await p.locator('.maker [data-act=done]').click(); }
  await p.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 });
  for (let i = 0; i < 4 && await p.locator('.card').count(); i++) { await p.locator('.card button').last().click(); await p.waitForTimeout(250); }
  const W = (f, arg) => p.evaluate(f, arg);
  // 換地圖：站到出入口，請伺服器帶過去
  const warp = async (x, y, i, map) => { await W(async ([x, y, i]) => { const w = window.__game.world; Object.assign(w.me, { x, y, px: x, py: y }); w.room.send({ t: 'move', x, y, dir: 'down', vx: 0, vy: 0 }); await new Promise((r) => setTimeout(r, 120)); await w.room.req({ t: 'warp', i }); }, [x, y, i]); await p.waitForFunction((m) => window.__game.world.me.map === m, map, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(400); };
  // 鐵匠鋪寫著晶（測試結束時人在小鎮的鐵匠鋪前面）
  if ((await W(() => window.__game.world.me.map)) === 'town') {
    await W(() => { const w = window.__game.world; Object.assign(w.me, { x: 30, y: 9.7, px: 30, py: 9.7, dir: 'up' }); w.room.send({ t: 'move', x: 30, y: 9.7, dir: 'up', vx: 0, vy: 0 }); });
    await p.waitForTimeout(300); await p.keyboard.press('Space'); await p.waitForSelector('.panel', { timeout: 4000 }).catch(() => {});
    const txt = (await p.locator('.panel').count()) ? await p.locator('.panel').innerText() : '';
    ok('鐵匠鋪：五個等級到晶、鋤頭已經是晶、播種器也能升級、寫著一次幾格', /晶/.test(txt) && /鋤頭（晶・5×5）/.test(txt) && /播種器/.test(txt) && /一次 \d×\d 格/.test(txt), txt.slice(0, 300));
    await p.screenshot({ path: S + '/tools-smith.png' }); await p.keyboard.press('Escape');
    await warp(0.5, 15, 0, 'road'); await warp(0.5, 7, 0, 'farm');
  }
  ok('回到農場', (await W(() => window.__game.world.me.map)) === 'farm');
  // 找翻過的那一片（伺服器測試翻的），站在旁邊一塊空的田上面
  const info = await W(() => { const w = window.__game.world, t = [...w.tiles.values()].filter((q) => q.map === 'farm'); const xs = t.map((q) => q.x), ys = t.map((q) => q.y); return { n: t.length, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; });
  const stand = { x: info.x1 + 3.5, y: info.y0 - 0.5 }; // 右邊三格的空地上面，面向下
  await W(([x, y]) => { const w = window.__game.world; Object.assign(w.me, { x, y, px: x, py: y, dir: 'down' }); w.room.send({ t: 'move', x, y, dir: 'down', vx: 0, vy: 0 }); }, [stand.x, stand.y]);
  const hoe = await W(() => window.__game.world.self.inv.findIndex((s) => s && s.id === 'hoe')); await p.keyboard.press('Digit' + ((hoe + 1) % 10)); await p.waitForTimeout(500);
  const r1 = (await p.locator('.rangebtn:not(.hidden)').count()) ? await p.locator('.rangebtn').innerText() : '';
  ok('拿著晶的鋤頭：出現範圍按鈕，預設最大 5×5 → ' + r1, /5×5/.test(r1));
  await p.screenshot({ path: S + '/tools-aim-5x5.png' });
  await p.keyboard.press('KeyR'); await p.waitForTimeout(200); const r2 = await p.locator('.rangebtn').innerText();
  ok('按 R 換成下一種範圍（從最大繞回 1×1） → ' + r2, /1×1/.test(r2));
  await p.locator('.rangebtn').click(); await p.waitForTimeout(150); await p.locator('.rangebtn').click(); await p.waitForTimeout(150); const r3 = await p.locator('.rangebtn').innerText();
  ok('點範圍按鈕也可以換 → ' + r3, /1×3/.test(r3) || /3×3/.test(r3));
  for (let i = 0; i < 6 && !/5×5/.test(await p.locator('.rangebtn').innerText()); i++) { await p.keyboard.press('KeyR'); await p.waitForTimeout(120); } // 換回 5×5
  const before = await W(() => [...window.__game.world.tiles.values()].filter((q) => q.map === 'farm').length);
  await p.keyboard.press('Space'); await p.waitForTimeout(900);
  const after = await W(() => [...window.__game.world.tiles.values()].filter((q) => q.map === 'farm').length);
  ok(`按一下就翻好一整片（多了 ${after - before} 格）`, after - before >= 10, `${before} → ${after}`);
  // 再往上站一點，讓畫面看得到整塊田（翻過、播種、澆水的那片和剛翻的這片）
  await W(([x, y]) => { const w = window.__game.world; Object.assign(w.me, { x, y, px: x, py: y, dir: 'down' }); w.room.send({ t: 'move', x, y, dir: 'down', vx: 0, vy: 0 }); }, [stand.x - 2, stand.y - 1]);
  const can = await W(() => window.__game.world.self.inv.findIndex((s) => s && s.id === 'can')); await p.keyboard.press('Digit' + ((can + 1) % 10)); await p.waitForTimeout(700);
  await p.screenshot({ path: S + '/tools-field.png' });
  // 範圍選擇記在這台裝置上：選 3×3、重新整理，拿起鋤頭還是 3×3
  await p.keyboard.press('Digit' + ((hoe + 1) % 10)); await p.waitForTimeout(300);
  for (let i = 0; i < 6 && !/3×3/.test(await p.locator('.rangebtn').innerText()); i++) { await p.keyboard.press('KeyR'); await p.waitForTimeout(120); }
  await p.reload(); await p.waitForFunction(() => window.__game && window.__game.data, null, { timeout: 30000 }); await p.waitForTimeout(300);
  await p.locator('#stage').click({ position: { x: 150, y: 200 } }); await p.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 });
  for (let i = 0; i < 4 && await p.locator('.card').count(); i++) { await p.locator('.card button').last().click(); await p.waitForTimeout(250); }
  await p.keyboard.press('Digit' + ((hoe + 1) % 10)); await p.waitForTimeout(500);
  const r4 = (await p.locator('.rangebtn:not(.hidden)').count()) ? await p.locator('.rangebtn').innerText() : '';
  ok('範圍選擇記在這台裝置上：重新整理之後還是 3×3 → ' + r4, /3×3/.test(r4));
  ok('沒有錯誤訊息 ' + errs.join(' | '), errs.length === 0);
  await br.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('SCRIPT ERROR', e.message.slice(0, 400)); process.exit(1); });
