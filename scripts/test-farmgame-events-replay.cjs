// 晴耕谷：每一段劇情（居民的故事、主線、兩個人的回憶）都用「再看一次」在瀏覽器裡演一遍，點完每一句（選項都選第一個）。
// 看有沒有錯誤、說話的人有沒有頭像，並且對照劇本算出來的句數（每一句都有演到）。四個瀏覽器分著演，每演完一段印一行。
// 需要 Playwright。用法：rm -rf .wrangler/state && npm run dev，另開終端機：node scripts/test-farmgame-events-replay.cjs
const { chromium } = require('playwright');
(async () => {
  const B = 'http://localhost:8787', N = 4;
  const j = async (p, b, t, m) => (await fetch(B + p, { method: m || (b ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
  for (let i = 0; i < 40; i++) { try { await j('/api/app-info'); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  const tag = 'rp' + (Date.now() % 1e5), admin = await j('/api/register', { username: tag + 'z', password: 'pass123456', displayName: '對方' });
  await j('/api/admin/settings', { inviteCode: 'inv-' + tag }, admin.token, 'PATCH');
  const br = await chromium.launch(), errs = [];
  const one = async (k) => {
    const u = await j('/api/register', { username: tag + k, password: 'pass123456', displayName: '玩家' + k, inviteCode: 'inv-' + tag });
    const dm = (await j('/api/conversations', { type: 'dm', userId: admin.user.id }, u.token)).conversation;
    const p = await (await br.newContext({ viewport: { width: 900, height: 640 } })).newPage();
    p.on('pageerror', (e) => errs.push(k + ' ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errs.push(k + ' ' + m.text()); });
    await p.goto(B + '/games/farm/?test'); await p.evaluate((t) => localStorage.setItem('cim_token', t), u.token);
    await p.goto(B + `/games/farm/?conv=${dm.id}&test`); await p.waitForFunction(() => window.__game && window.__game.data, null, { timeout: 30000 });
    await p.waitForTimeout(300); await p.locator('#stage').click({ position: { x: 150, y: 200 } }); await p.waitForSelector('.maker');
    await p.locator('.maker [data-preset="' + k + '"]').click(); await p.locator('.maker [data-act=done]').click(); await p.waitForFunction(() => window.__game.scenes.current.ready === true);
    for (let i = 0; i < 4 && await p.locator('.card').count(); i++) { await p.locator('.card button').last().click(); await p.waitForTimeout(200); }
    await p.evaluate(async () => { const { warmLPC } = await import('/games/farm/render/lpc.js'); warmLPC(Object.values(window.__game.data.npcs).map((x) => x.look), ['walk']); });
    await p.waitForTimeout(3000);
    const ids = (await p.evaluate(() => Object.keys(window.__game.data.events))).filter((_, i) => i % N === k);
    let lines = 0; const noFace = [], per = [];
    for (const id of ids) {
      const t0 = Date.now(); let n = 0;
      await p.evaluate((x) => { window.__game.replayEvent(x); }, id); // 不要等它演完（要點完才會演完）
      for (let g = 0; g < 150; g++) {
        if (!(await p.locator('.dialog').count())) { if (!(await p.evaluate(() => !!window.__game.scenes.current.eventing))) break; await p.waitForTimeout(120); continue; }
        const info = await p.evaluate(() => { const d = document.querySelector('.dialog'); return { name: (d.querySelector('h2') || {}).textContent || '', face: !!d.querySelector('.dface canvas'), noface: d.classList.contains('noface') }; });
        n++; if (!info.noface && !info.face) noFace.push(id + ':' + info.name);
        await p.locator('.dialog').click({ position: { x: 20, y: 15 }, timeout: 2000 }).catch(() => {});
        await p.locator('.dialog .row button').first().click({ timeout: 2000 }).catch(() => {});
      }
      lines += n; per.push([id, n]); console.log(`${k} ${id} ${n} 句 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    return { k, events: ids.length, lines, noFace, per };
  };
  const res = await Promise.all([...Array(N).keys()].map(one));
  // 劇本算出來的句數（選項都選第一個）：跟實際演出來的對不對得上
  const all = await (async () => { const out = {}; for (const f of ['hearts', 'story', 'duo']) Object.assign(out, await (await fetch(`${B}/games/farm/data/events/${f}.json`)).json()); return out; })();
  const expect = (ev) => { const at = new Map(ev.steps.map((s, i) => [s.label, i]).filter(([l]) => l)); let n = 0; for (let i = 0, g = 0; i < ev.steps.length && g < 300; i++, g++) { const s = ev.steps[i]; if (s.say || s.narrate) n++; else if (s.choice) { n++; const o = s.choice[0]; if (o.goto && at.has(o.goto)) i = at.get(o.goto); } else if (s.goto && at.has(s.goto)) i = at.get(s.goto); else if (s.end) break; } return n; };
  const got = Object.fromEntries(res.flatMap((r) => r.per)), off = Object.keys(all).filter((id) => got[id] !== expect(all[id]));
  const noFace = res.flatMap((r) => r.noFace);
  console.log(`總共：${res.reduce((s, r) => s + r.events, 0)} 段、${res.reduce((s, r) => s + r.lines, 0)} 句；沒有頭像的 ${noFace.length} 句 ${noFace.slice(0, 8).join(' ')}`);
  console.log(off.length ? `句數對不上的 ${off.length} 段：${off.slice(0, 8).map((id) => `${id}（劇本 ${expect(all[id])}、演了 ${got[id]}）`).join('、')}` : '每一段演出來的句數都跟劇本一樣');
  console.log(errs.length ? '錯誤：' + errs.slice(0, 5).join(' | ') : '沒有錯誤');
  await br.close(); process.exit(errs.length || noFace.length || off.length ? 1 : 0);
})().catch((e) => { console.log('SCRIPT ERROR', e.message.slice(0, 300)); process.exit(1); });
