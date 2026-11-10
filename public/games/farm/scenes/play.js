// 遊戲場景（階段 1）：一張測試地圖，暫代角色可以走動、相機跟著、依腳的位置排前後
import { buildGround, groundAt } from '../render/ground.js';
import { drawObject, drawPlayer } from '../render/placeholder.js';

const GROUND_NAME = { grass: '草地', path: '小路', soil: '田', water: '水' };
const DIR = (dx, dy, cur) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : dy > 0 ? 'down' : cur);

export const play = {
  enter(ctx) {
    const { map, objects, balance } = ctx.data;
    this.map = map; this.bal = balance; this.T = balance.tile;
    this.ground = buildGround(map, this.T);
    // 擋路的格子：實心的東西佔的格子（房子這種佔很多格的寫在 tiles），加上水
    this.solid = new Set();
    this.things = map.objects.map((o) => {
      const def = objects[o.type], [tw, th] = def.tiles || [1, 1];
      if (def.solid) for (let x = 0; x < tw; x++) for (let y = 0; y < th; y++) this.solid.add((o.x + x) + ',' + (o.y - y));
      return { def, fx: o.x + tw / 2, fy: o.y + 0.92 }; // 腳底中心（排前後用）
    });
    this.player = { x: map.spawn.x, y: map.spawn.y, px: map.spawn.x, py: map.spawn.y, dir: 'down', moving: false, anim: 0, name: ctx.session.me.displayName };
    this.mark = null;
    ctx.camera.fit(ctx.view, balance);
    ctx.camera.follow(this.player.x * this.T, this.player.y * this.T, ctx.view, map.w * this.T, map.h * this.T, 1);
    ctx.view.onResize = (v) => ctx.camera.fit(v, balance);
    ctx.hud.show(true);
    this.off = [
      ctx.input.on('slot', (i) => ctx.hud.select(i)),
      ctx.input.on('bag', () => ctx.hud.toast('背包還沒做好（階段 4）')),
      ctx.input.on('esc', () => { if (window.parent !== window) window.parent.postMessage({ type: 'farm-close' }, location.origin); }),
      ctx.input.on('action', () => this.act(ctx, this.facingTile())),
      ctx.input.on('tap', (p) => { const w = ctx.camera.toWorld(p.x, p.y); this.act(ctx, { x: Math.floor(w.x / this.T), y: Math.floor(w.y / this.T) }); }),
    ];
  },
  exit(ctx) { this.off.forEach((f) => f()); ctx.hud.show(false); ctx.view.onResize = null; },

  blocked(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    return tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h || this.solid.has(tx + ',' + ty) || groundAt(this.map, tx, ty) === 'water';
  },
  // 身體是一個小方塊：四個角都沒被擋住才走得過去
  free(x, y) {
    const r = this.bal.playerRadius;
    return !this.blocked(x - r, y - r) && !this.blocked(x + r, y - r) && !this.blocked(x - r, y + r) && !this.blocked(x + r, y + r);
  },
  facingTile() {
    const p = this.player, d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[p.dir];
    return { x: Math.floor(p.x) + d[0], y: Math.floor(p.y) + d[1] };
  },
  // 動作（階段 1 還沒有工具）：先標出那一格、說那是什麼地面，確認「點哪裡就是哪裡」
  act(ctx, t) {
    if (t.x < 0 || t.y < 0 || t.x >= this.map.w || t.y >= this.map.h) return;
    this.mark = { ...t, life: 0.6 };
    ctx.hud.toast(`${GROUND_NAME[groundAt(this.map, t.x, t.y)] || '地面'}（${t.x}, ${t.y}）`, 900);
  },

  update(dt, ctx) {
    const p = this.player, a = ctx.input.axis(), sp = this.bal.walkSpeed * dt;
    p.px = p.x; p.py = p.y;
    // 左右、上下分開試：斜著撞到牆會沿著牆滑過去，不會整個卡住
    if (a.x && this.free(p.x + a.x * sp, p.y)) p.x += a.x * sp;
    if (a.y && this.free(p.x, p.y + a.y * sp)) p.y += a.y * sp;
    p.moving = !!(a.x || a.y);
    if (p.moving) { p.dir = DIR(a.x, a.y, p.dir); p.anim += dt; } else p.anim = 0;
    if (this.mark && (this.mark.life -= dt) <= 0) this.mark = null;
  },

  render(ctx, alpha) {
    const { view, camera } = ctx, g = view.ctx, T = this.T, p = this.player;
    // 兩次更新之間用內插的位置畫，更新率比螢幕低也不會一頓一頓
    const ix = p.px + (p.x - p.px) * alpha, iy = p.py + (p.y - p.py) * alpha;
    camera.follow(ix * T, iy * T, view, this.map.w * T, this.map.h * T, 0.18);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#5f9c4a'; g.fillRect(0, 0, view.canvas.width, view.canvas.height);
    camera.apply(view);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.ground, 0, 0, this.ground.width * this.ground.scale, this.ground.height * this.ground.scale);
    if (this.mark) {
      g.globalAlpha = Math.min(1, this.mark.life * 3); g.lineWidth = 4; g.strokeStyle = '#fff';
      g.beginPath(); g.roundRect(this.mark.x * T + 4, this.mark.y * T + 4, T - 8, T - 8, 10); g.stroke(); g.globalAlpha = 1;
    }
    // 只畫看得到的，依腳的位置由遠到近畫
    const x0 = camera.x / T - 3, x1 = (camera.x + view.w / camera.zoom) / T + 3, y0 = camera.y / T - 1, y1 = (camera.y + view.h / camera.zoom) / T + 4;
    const list = this.things.filter((t) => t.fx > x0 && t.fx < x1 && t.fy > y0 && t.fy < y1).map((t) => ({ y: t.fy, t }));
    list.push({ y: iy, me: true });
    list.sort((u, v) => u.y - v.y);
    for (const it of list) {
      if (it.me) drawPlayer(g, { ...p, x: ix, y: iy }, T);
      else drawObject(g, it.t.def, it.t.fx * T, it.t.fy * T, T);
    }
    this.drawn = list.length;
  },
};
