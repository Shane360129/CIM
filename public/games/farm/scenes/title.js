// 標題畫面（之後這裡會接「建立角色」）。標題插畫還沒到，先用色塊
import { play } from './play.js';
import { create } from './create.js';
import { createWorld } from '../core/world.js';
import { wireAudio } from '../core/audio.js';

export const title = {
  t: 0,
  enter(ctx) {
    this.t = 0;
    // 在標題畫面就先連上農場，按開始時通常已經拿到資料了。還沒進到農場畫面時收到的「你不在時發生的事」先留著，進去再顯示
    if (!ctx.world) { ctx.world = createWorld(ctx.session, ctx.data.balance); wireAudio(ctx.audio, ctx.world.room, () => ctx.world.me.id); ctx.world.on('snapshot', (m) => { if (m.summary && ctx.scenes.current !== play) ctx.pendingSummary = m; }); }
    this.wait = false;
    const go = () => ctx.scenes.go(ctx.world.me.look ? play : create); // 還沒有角色：先去建立
    const start = () => { if (ctx.world.ready) go(); else if (!this.wait) { this.wait = true; const off = ctx.world.on('snapshot', () => { off(); if (ctx.scenes.current === this) go(); }); } };
    this.off = [ctx.input.on('action', start), ctx.input.on('tap', start)];
  },
  exit() { this.off.forEach((f) => f()); },
  update(dt) { this.t += dt; },
  render({ view, session }) {
    const g = view.ctx, k = view.dpr; g.setTransform(k, 0, 0, k, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, view.h); sky.addColorStop(0, '#ffd9a0'); sky.addColorStop(0.6, '#ffeec8'); sky.addColorStop(1, '#a8d98a');
    g.fillStyle = sky; g.fillRect(0, 0, view.w, view.h);
    g.fillStyle = '#8fca6b'; g.beginPath(); g.ellipse(view.w * 0.3, view.h * 1.05, view.w * 0.7, view.h * 0.4, 0, 0, 7); g.fill();
    g.fillStyle = '#7dbb5a'; g.beginPath(); g.ellipse(view.w * 0.85, view.h * 1.1, view.w * 0.6, view.h * 0.42, 0, 0, 7); g.fill();
    const F = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif', size = Math.min(72, view.w * 0.16);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${size}px ${F}`; g.lineWidth = size * 0.16; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.strokeText('晴耕谷', view.w / 2, view.h * 0.36);
    g.fillStyle = '#5a3d22'; g.fillText('晴耕谷', view.w / 2, view.h * 0.36);
    g.font = `700 18px ${F}`; g.fillStyle = '#5a3d22';
    g.fillText(session.partnerName ? `${session.me.displayName} 和 ${session.partnerName} 的農場` : '我們的農場', view.w / 2, view.h * 0.36 + size * 0.85);
    g.globalAlpha = 0.55 + 0.45 * Math.sin(this.t * 3.2);
    g.font = `16px ${F}`; g.fillText(this.wait ? '連線中…' : '點一下畫面，或按空白鍵開始', view.w / 2, view.h * 0.7);
    g.globalAlpha = 1;
  },
};
