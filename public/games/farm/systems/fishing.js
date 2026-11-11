// 釣魚（畫面這一邊）：拋竿 → 等魚上鉤（浮標在水上漂）→ 看到「！」趕快按動作鍵 → 小遊戲（指針來回跑，跑到綠色的地方按，一隻手就能玩）→ 告訴伺服器結果。
// 是哪條魚、多久上鉤是伺服器決定的；這裡只管畫面和小遊戲。
const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export function createFishing(ctx, onDone) {
  const F = ctx.data.balance.fishing, ui = document.getElementById('ui');
  const f = { state: 'idle', x: 0, y: 0, t: 0, wait: 0, diff: 1, hits: 0, misses: 0, pos: 0, dir: 1, zone: [0.4, 0.6], el: null, bar: null, zoneEl: null, needle: null, label: null };
  const close = () => { if (f.el) f.el.remove(); f.el = null; f.state = 'idle'; };
  const finish = async (win) => {
    const diff = f.diff; close();
    const r = await ctx.world.room.req({ t: 'reel', win });
    onDone(r, win, diff);
  };
  function startGame() {
    f.state = 'game'; f.hits = 0; f.misses = 0; f.pos = 0; f.dir = 1;
    const w = Math.max(0.14, 0.3 - f.diff * 0.035) + (ctx.world.buff('fishing') ? ctx.data.balance.buffs.fishing : 0) + (f.rodPower || 0) * 0.06, a = 0.15 + Math.random() * (0.7 - w); f.zone = [a, a + w]; // 越難的魚，綠色的地方越窄
    f.el = mk('div', 'fishgame'); f.label = mk('div', 'fglabel', '指針到綠色的地方就按！'); f.bar = mk('div', 'fgbar'); f.zoneEl = mk('i', 'fgzone'); f.needle = mk('i', 'fgneedle');
    f.zoneEl.style.left = f.zone[0] * 100 + '%'; f.zoneEl.style.width = w * 100 + '%';
    f.bar.append(f.zoneEl, f.needle); f.el.append(f.label, f.bar); ui.append(f.el);
  }
  return {
    get active() { return f.state !== 'idle'; },
    get state() { return f.state; }, get bobber() { return f.state === 'wait' || f.state === 'bite' ? { x: f.x, y: f.y, bite: f.state === 'bite', t: f.t } : null; },
    // 對著水面用釣竿
    async cast(slot, x, y) {
      if (f.state !== 'idle') return null;
      const held = ctx.world.self.inv[slot]; f.rodPower = (held && ctx.data.items[held.id].power) || 0; // 好一點的釣竿：綠色的地方比較寬
      f.state = 'casting';
      const r = await ctx.world.room.req({ t: 'fish', slot, x, y });
      if (r.t !== 'ok') { f.state = 'idle'; return r; }
      Object.assign(f, { state: 'wait', x, y, t: 0, wait: r.wait / 1000, diff: r.diff });
      if (r.duo) ctx.hud.toast('水面下有兩道影子並排游過來…', 2200);
      return r;
    },
    // 按了動作鍵（或點畫面）
    press() {
      if (f.state === 'wait') { ctx.world.room.req({ t: 'reel', win: false }); close(); onDone(null, false, 0, 'early'); }  // 還沒上鉤就拉：魚跑了
      else if (f.state === 'bite') startGame();
      else if (f.state === 'game') {
        if (f.pos >= f.zone[0] && f.pos <= f.zone[1]) { f.hits++; f.label.textContent = `拉！（${f.hits}/${F.hitsNeeded}）`; const w = f.zone[1] - f.zone[0], a = 0.1 + Math.random() * (0.8 - w); f.zone = [a, a + w]; f.zoneEl.style.left = a * 100 + '%'; }
        else { f.misses++; f.label.textContent = `沒抓準…（還可以失誤 ${Math.max(0, F.missesAllowed - f.misses)} 次）`; }
        if (f.hits >= F.hitsNeeded) finish(true); else if (f.misses > F.missesAllowed) finish(false);
      }
    },
    cancel() { if (f.state === 'wait' || f.state === 'bite') ctx.world.room.req({ t: 'reel', win: false }); close(); },
    update(dt) {
      f.t += dt;
      if (f.state === 'wait' && f.t >= f.wait) { f.state = 'bite'; f.t = 0; }
      else if (f.state === 'bite' && f.t * 1000 > F.biteWindowMs) { ctx.world.room.req({ t: 'reel', win: false }); close(); onDone(null, false, 0, 'late'); } // 太慢了
      else if (f.state === 'game') {
        f.pos += f.dir * dt * (0.55 + f.diff * 0.17); if (f.pos > 1) { f.pos = 1; f.dir = -1; } if (f.pos < 0) { f.pos = 0; f.dir = 1; }
        f.needle.style.left = f.pos * 100 + '%';
      }
    },
    // 測試用：直接看狀態、把指針放到綠色中間
    debug: { get f() { return f; }, aim() { f.pos = (f.zone[0] + f.zone[1]) / 2; } },
  };
}
