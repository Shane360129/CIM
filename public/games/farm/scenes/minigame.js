// 節慶小遊戲「接花瓣」：籃子在下面左右移動，接飄下來的花瓣。粉紅 1 分、金色 3 分，毛毛蟲扣 2 分。
// 時間到把分數交給伺服器換獎品，再回到農場畫面。鍵盤、搖桿、手指左右滑都能玩。
import { play } from './play.js';
import { rng } from '../shared/rules.js';

export const minigame = {
  enter(ctx, { fest, id }) {
    this.ctx = ctx; this.fest = fest; this.id = id; this.t = 0; this.left = fest.seconds; this.score = 0; this.x = 0.5; this.items = []; this.next = 0; this.done = false; this.rand = rng(Date.now() & 0xffff);
    this.timer = document.createElement('div'); this.timer.className = 'timer'; document.getElementById('ui').append(this.timer);
    this.off = [ctx.input.on('tap', (p) => { this.x = Math.max(0.05, Math.min(0.95, p.x / ctx.view.w)); })];
  },
  exit() { this.timer.remove(); this.off.forEach((f) => f()); },
  async finish() {
    this.done = true; const { hud, world: W, data } = this.ctx;
    const r = await W.room.req({ t: 'fest-score', fest: this.id, score: Math.max(0, this.score) });
    const p = r.t === 'ok' ? r.prize : null;
    await hud.card(`${this.fest.name}：${Math.max(0, this.score)} 分`, [p ? `獎品：${p.money ? p.money + ' 元' : ''}${p.item ? `、${data.items[p.item[0]].name}×${p.item[1]}` : ''}` : r.reason === 'already' ? '今年已經領過獎了，這次只是玩玩。' : '成績沒有送出去。'], [{ label: '回去', value: true }]);
    this.ctx.scenes.go(play);
  },
  update(dt, ctx) {
    if (this.done) return;
    this.t += dt; this.left -= dt; const a = ctx.input.axis(); this.x = Math.max(0.05, Math.min(0.95, this.x + a.x * dt * 0.9));
    if (this.t >= this.next) { const r = this.rand(); this.items.push({ x: 0.06 + this.rand() * 0.88, y: -0.05, v: 0.28 + this.rand() * 0.22 + this.t * 0.004, kind: r < 0.12 ? 'bug' : r < 0.27 ? 'gold' : 'petal', sway: this.rand() * 6 }); this.next = this.t + 0.28 + this.rand() * 0.3; }
    for (const it of this.items) {
      it.y += it.v * dt; it.x += Math.sin(this.t * 2 + it.sway) * dt * 0.05;
      if (!it.hit && it.y > 0.8 && it.y < 0.9 && Math.abs(it.x - this.x) < 0.075) { it.hit = true; this.score += it.kind === 'gold' ? 3 : it.kind === 'bug' ? -2 : 1; this.pop = { t: 0.5, text: it.kind === 'gold' ? '+3' : it.kind === 'bug' ? '-2' : '+1' }; }
    }
    this.items = this.items.filter((it) => !it.hit && it.y < 1.05);
    if (this.pop && (this.pop.t -= dt) <= 0) this.pop = null;
    this.timer.textContent = `${this.fest.name}　${Math.max(0, Math.ceil(this.left))} 秒　${Math.max(0, this.score)} 分`;
    if (this.left <= 0) this.finish();
  },
  render({ view }) {
    const g = view.ctx, k = view.dpr, w = view.w, h = view.h; g.setTransform(k, 0, 0, k, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, '#ffe9f1'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8fca6b'; g.fillRect(0, h * 0.9, w, h * 0.1);
    for (const tx of [0.12, 0.5, 0.88]) { g.fillStyle = '#8a5a36'; g.fillRect(w * tx - 9, h * 0.1, 18, h * 0.82); g.fillStyle = '#f6b6cf'; g.beginPath(); g.ellipse(w * tx, h * 0.12, w * 0.2, h * 0.14, 0, 0, 7); g.fill(); }
    for (const it of this.items) {
      const x = it.x * w, y = it.y * h, r = Math.max(9, w * 0.016);
      if (it.kind === 'bug') { g.fillStyle = '#6fb357'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + (i - 1) * r * 0.9, y, r * 0.6, 0, 7); g.fill(); } g.fillStyle = '#3b2f22'; g.beginPath(); g.arc(x + r * 1.1, y - 2, 2, 0, 7); g.fill(); }
      else { g.fillStyle = it.kind === 'gold' ? '#f6d34a' : '#f08ab0'; g.strokeStyle = '#5a3d22'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, r, r * 0.62, Math.sin(this.t * 3 + it.sway), 0, 7); g.fill(); g.stroke(); }
    }
    const bx = this.x * w, by = h * 0.86, bw = w * 0.075;
    g.fillStyle = '#c98a3c'; g.strokeStyle = '#5a3d22'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx - bw, by - 14); g.lineTo(bx + bw, by - 14); g.lineTo(bx + bw * 0.75, by + 22); g.lineTo(bx - bw * 0.75, by + 22); g.closePath(); g.fill(); g.stroke();
    if (this.pop) { g.font = '700 26px sans-serif'; g.textAlign = 'center'; g.fillStyle = this.pop.text.startsWith('-') ? '#c0392b' : '#5a3d22'; g.fillText(this.pop.text, bx, by - 30 - (0.5 - this.pop.t) * 40); }
  },
};
