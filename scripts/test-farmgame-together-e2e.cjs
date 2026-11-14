// 晴耕谷：兩個人「同時」進同一座農場的瀏覽器驗收。
// 兩個帳號在同一秒打開農場、同時建立角色（各選一個現成角色）、互相看到對方和造型、同時走動、同時離開再一起回來；
// 另外試同一個帳號在第二個地方打開（舊的那個會被請出去，不會有兩個自己）。
// 需要 Playwright。用法：rm -rf .wrangler/state && npm run dev，另開終端機：node scripts/test-farmgame-together-e2e.cjs 截圖資料夾
const { chromium } = require('playwright');
(async () => {
  const B = 'http://localhost:8787', S = process.argv[2] || '.';
  const j = async (p, b, t, m) => (await fetch(B + p, { method: m || (b ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
  for (let i = 0; i < 40; i++) { try { await j('/api/app-info'); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  const u = 'tg' + (Date.now() % 100000);
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
    await p.goto(B + `/games/farm/?conv=${dm.id}&test`); await p.waitForFunction(() => window.__game && window.__game.data, null, { timeout: 30000 });
    return p;
  };
  const start = async (p) => { await p.waitForTimeout(300); await p.locator('#stage').click({ position: { x: 150, y: 200 } }); await p.waitForSelector('.maker, .hud', { timeout: 15000 }).catch(() => {}); };
  const st = (p) => p.evaluate(() => { const w = window.__game.world, o = [...w.others.values()][0]; return { me: { map: w.me.map, x: w.me.x, y: w.me.y, look: w.me.look, name: w.me.name }, other: o && { name: o.name, look: o.look, x: o.x, y: o.y, map: o.map }, n: w.others.size, scene: window.__game.scenes.current.ready === true }; });
  const same = (x, y) => !!x && !!y && Object.keys(y).every((k) => x[k] === y[k]);

  // 1. 兩個人同一時間打開農場（一個電腦、一個手機）
  const [pa, pb] = await Promise.all([open(a.token, false), open(b.token, true)]);
  await Promise.all([start(pa), start(pb)]);
  ok('兩個人同時打開農場：都進到建立角色的畫面', (await pa.locator('.maker').count()) === 1 && (await pb.locator('.maker').count()) === 1);
  ok('建角畫面最上面有一排現成的角色（' + PARTS.gallery.length + ' 個）', (await pa.locator('.maker .mpreset').count()) === PARTS.gallery.length && PARTS.gallery.length >= 8);
  await pa.waitForTimeout(1200); await pa.screenshot({ path: S + '/t1-create-gallery.png' }); await pb.screenshot({ path: S + '/t1-create-gallery-phone.png' });
  // 2. 同時選現成角色、同時按完成
  const GA = PARTS.gallery[4], GB = PARTS.gallery[9];
  await Promise.all([pa.locator('.maker [data-preset="4"]').click(), pb.locator('.maker [data-preset="9"]').click()]);
  await Promise.all([pa.locator('.maker .minput').fill('晴晴'), pb.locator('.maker .minput').fill('阿耕')]);
  ok('點現成角色會整套換上（體型、臉型、髮型、衣服）', same(await pa.evaluate(() => window.__game.scenes.current.look), GA.look) && same(await pb.evaluate(() => window.__game.scenes.current.look), GB.look));
  await Promise.all([pa.locator('.maker [data-act=done]').click(), pb.locator('.maker [data-act=done]').click()]);
  await Promise.all([pa.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 }), pb.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 })]);
  for (const p of [pa, pb]) for (let i = 0; i < 4 && await p.locator('.card').count(); i++) { await p.locator('.card button').last().click(); await p.waitForTimeout(250); }
  await pa.waitForTimeout(900);
  let sa = await st(pa), sb = await st(pb);
  ok('同時建好角色：兩邊都在農場裡，而且看得到對方', sa.scene && sb.scene && sa.n === 1 && sb.n === 1 && sa.me.map === 'farm' && sb.me.map === 'farm');
  ok('對方看到的造型和名字跟自己選的一樣', same(sb.other.look, GA.look) && same(sa.other.look, GB.look) && sb.other.name === '晴晴' && sa.other.name === '阿耕', JSON.stringify({ a: sb.other, b: sa.other }).slice(0, 300));
  // 3. 同時走動：各自往不同方向走，對方那邊看得到位置變了
  const a0 = sa.me, b0 = sb.me;
  await Promise.all([(async () => { await pa.keyboard.down('KeyD'); await pa.waitForTimeout(700); await pa.keyboard.up('KeyD'); })(), (async () => { await pb.evaluate(() => { const w = window.__game.world; w.me.x -= 2; w.room.send({ t: 'move', x: w.me.x, y: w.me.y, dir: 'left', vx: 0, vy: 0 }); }); })()]);
  await pa.waitForTimeout(900); sa = await st(pa); sb = await st(pb);
  ok('同時走動：兩邊都看到對方移動了', Math.abs(sb.other.x - sa.me.x) < 0.6 && Math.abs(sa.other.x - sb.me.x) < 0.6 && sa.me.x !== a0.x && sb.me.x !== b0.x, JSON.stringify({ a: sa.me.x, aSeenByB: sb.other.x, b: sb.me.x, bSeenByA: sa.other.x }));
  await pa.screenshot({ path: S + '/t2-together.png' }); await pb.screenshot({ path: S + '/t2-together-phone.png' });
  // 4. 同時離開，再同時回來：不用再建角色，造型還在
  await Promise.all([pa.close(), pb.close()]);
  const [pa2, pb2] = await Promise.all([open(a.token, false), open(b.token, true)]);
  await Promise.all([start(pa2), start(pb2)]);
  await Promise.all([pa2.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 }), pb2.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 })]);
  await pa2.waitForTimeout(900); sa = await st(pa2); sb = await st(pb2);
  ok('同時離開再一起回來：不用再建角色，兩邊又看到對方，造型還在', (await pa2.locator('.maker').count()) === 0 && sa.n === 1 && sb.n === 1 && same(sa.me.look, GA.look) && same(sb.me.look, GB.look));
  // 5. 同一個帳號在第二個地方打開：舊的那個被請出去，對方那邊只有一個「晴晴」
  const pa3 = await open(a.token, false); await start(pa3); await pa3.waitForFunction(() => window.__game.scenes.current.ready === true, null, { timeout: 20000 }); await pa3.waitForTimeout(900);
  sb = await st(pb2);
  ok('同一個帳號在第二個地方打開：對方那邊只有一個你，不會有兩個', sb.n === 1 && sb.other.name === '晴晴');
  ok('沒有錯誤訊息 ' + errs.join(' | '), errs.length === 0);
  await br.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('SCRIPT ERROR', e.message.slice(0, 400)); process.exit(1); });
