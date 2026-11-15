// 標題畫面：LPC 像素風的小農場（農舍、樹、田、動物，兩個人站在門口），上面寫遊戲名字；點一下開始（還沒有角色就先去建立）
import { play } from './play.js';
import { buildGround } from '../render/ground.js';
import { drawSprite } from '../render/sprites.js';
import { drawTilled, drawShadow } from '../render/placeholder.js';
import { drawDoll } from '../render/doll.js';
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
  // 小農場的場景（世界座標：一格 64），整張地面先拼好記著，季節變了才重拼
  scene(ctx, season) {
    if (this.bg && this.bg.season === season) return this.bg;
    const map = { w: 16, h: 12, ground: 'grass', patches: [{ type: 'path', x: 3, y: 5, w: 2, h: 7 }, { type: 'path', x: 5, y: 8, w: 11, h: 2 }, { type: 'soil', x: 9, y: 4, w: 6, h: 3 }, { type: 'water', x: 12, y: 0, w: 4, h: 2 }] };
    this.bg = { season, ground: buildGround(map, 64, true, season), w: 16 * 64, h: 12 * 64 };
    return this.bg;
  },
  render({ view, session, data, world }) {
    const g = view.ctx, k = view.dpr, F = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    const season = (world && world.farm && world.farm.season) || 'spring', bg = this.scene(null, season);
    g.setTransform(k, 0, 0, k, 0, 0); g.fillStyle = '#5f9c4a'; g.fillRect(0, 0, view.w, view.h);
    // 場景蓋滿整個畫面；看不完的時候對準農舍門口的兩個人
    const s = Math.max(view.w / bg.w, view.h / bg.h), fx = 4.6 * 64, fy = 5.6 * 64;
    const ox = Math.min(0, Math.max(view.w - bg.w * s, view.w / 2 - fx * s)), oy = Math.min(0, Math.max(view.h - bg.h * s, view.h / 2 - fy * s));
    g.setTransform(k * s, 0, 0, k * s, k * ox, k * oy); g.imageSmoothingEnabled = false;
    g.drawImage(bg.ground, 0, 0, bg.w, bg.h);
    const T = 64, list = [], t = this.t;
    const thing = (art, x, y) => list.push({ y, draw: () => drawSprite(g, art.replace('{season}', season), x * T, y * T, T * 3, T * 3) });
    for (let x = 9; x < 15; x++) for (let y = 4; y < 7; y++) { drawTilled(g, x, y, T, false); const c = ['carrot', 'cabbage', 'pumpkin'][y - 4]; list.push({ y: y + 0.8, draw: () => drawSprite(g, `crop/${c}/${(x + y) % 3 === 0 ? 3 : 4}`, (x + 0.5) * T, (y + 0.9) * T, T, T) }); }
    thing('building/house1', 4, 4.9); thing('obj/mailbox', 6, 5.3); thing('obj/bin', 7.4, 4.6); thing('obj/scarecrow', 12, 3.6);
    thing('tree/oak/{season}', 0.6, 3.4); thing('tree/oak/{season}', 8.2, 2.2); thing('tree/maple/{season}', 1.2, 8.6); thing('tree/pine/{season}', 15.4, 5.6);
    thing('obj/flower_yellow', 2.2, 6.2); thing('obj/flower_red', 6.6, 7.2); thing('obj/grass_l', 10.4, 9.6); thing('obj/flower_white', 14, 7.6);
    thing('obj/well', 1.4, 11.2); thing('obj/bench', 6.6, 10.9); thing('obj/flower_yellow', 8.4, 11.1); thing('obj/barrel', 13.2, 10.8); thing('obj/flower_red', 11.6, 11.4); thing('tree/oak/{season}', 15.2, 11.8);
    // 雞走來走去、乳牛在吃草（輕輕彈一下）
    [[6.2, 6.6, 0], [7.1, 7.0, 1.3], [5.6, 7.4, 2.1]].forEach(([x, y, ph]) => list.push({ y, draw: () => { const dx = Math.sin(t * 0.6 + ph) * 0.4, hop = Math.abs(Math.sin(t * 6 + ph)) * 2; g.save(); g.translate((x + dx) * T, y * T - hop); if (Math.cos(t * 0.6 + ph) < 0) g.scale(-1, 1); drawSprite(g, 'animal/chicken/side', 0, 0, T, T); g.restore(); } }));
    list.push({ y: 9.4, draw: () => drawSprite(g, 'animal/cow/side', 8.6 * T, 9.4 * T, T * 2, T * 2) });
    // 兩個人站在農舍門口：自己（已經有角色的話）和對方；還沒有角色的先用男生、女生的預設造型
    const others = world ? [...world.others.values()].filter((o) => o.look) : [], me = world && world.me && world.me.look;
    const pair = [me || data.parts.presets.boy, (others[0] && others[0].look) || data.parts.presets.girl];
    pair.forEach((look, i) => list.push({ y: 6.4, draw: () => { drawShadow(g, (3.5 + i) * T, 6.4 * T, T * 0.62); drawDoll(g, look, data.parts, (3.5 + i) * T, 6.4 * T, T * 0.62, 'down', 'idle', t + i); } }));
    list.sort((a, b) => a.y - b.y); for (const it of list) it.draw();
    // 字：遊戲名字放在上面的木牌上，開始的提示放在下面
    g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = true;
    const size = Math.min(64, view.w * 0.15), cx = view.w / 2, ty = Math.max(size * 0.95, view.h * 0.15), bw = Math.min(view.w - 32, size * 5.6), bh = size * 1.95;
    g.fillStyle = 'rgba(255, 246, 225, .93)'; g.strokeStyle = '#5a3d22'; g.lineWidth = 3; g.beginPath(); g.roundRect(cx - bw / 2, ty - size * 0.75, bw, bh, 18); g.fill(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${size}px ${F}`; g.lineWidth = size * 0.14; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.strokeText('晴耕谷', cx, ty);
    g.fillStyle = '#5a3d22'; g.fillText('晴耕谷', cx, ty);
    g.font = `700 ${Math.max(14, size * 0.27)}px ${F}`;
    g.fillText(session.partnerName ? `${session.me.displayName} 和 ${session.partnerName} 的農場` : '我們的農場', cx, ty + size * 0.78);
    const msg = this.wait ? '連線中…' : '點一下畫面，或按空白鍵開始', fs = 16; g.font = `700 ${fs}px ${F}`;
    const mw = g.measureText(msg).width + 36, my = view.w < view.h ? ty + bh - size * 0.75 + 30 : view.h * 0.86; // 直的手機放在名字下面，才不會被搖桿擋到
    g.globalAlpha = 0.65 + 0.35 * Math.sin(this.t * 3.2);
    g.fillStyle = 'rgba(60, 40, 22, .72)'; g.beginPath(); g.roundRect(cx - mw / 2, my - 18, mw, 36, 18); g.fill();
    g.fillStyle = '#fff'; g.fillText(msg, cx, my + 1); g.globalAlpha = 1;
  },
};
