// 遊戲場景（階段 2）：測試地圖＋雙人同步。自己的走動在這裡先動；格子、時間、換日都聽伺服器的
import { buildGround, groundAt } from '../render/ground.js';
import { drawObject, drawPlayer, drawBubble, drawTilled, drawShadow, drawName } from '../render/placeholder.js';
import { drawDoll } from '../render/doll.js';
import { create } from './create.js';

const GROUND_NAME = { grass: '草地', path: '小路', soil: '田', water: '水' };
const NO_TEXT = { far: '太遠了，走近一點', ground: '這裡不是田', already: '對方已經先做了', untilled: '要先用鋤頭翻土', offline: '連線中斷，稍等一下', timeout: '伺服器沒有回應', out: '', unknown: '' };
const ACT_NAME = { till: '翻土', water: '澆水', clear: '鏟平' };
const DIR = (dx, dy, cur) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : dy > 0 ? 'down' : cur);
const key = (x, y) => x + ',' + y;

export const play = {
  enter(ctx) {
    const { map, objects, balance } = ctx.data;
    this.ctx = ctx; this.map = map; this.bal = balance; this.T = balance.tile;
    this.ground = buildGround(map, this.T);
    // 擋路的格子：實心的東西佔的格子（房子這種佔很多格的寫在 tiles），加上水
    this.solid = new Map();
    this.things = map.objects.map((o) => {
      const def = objects[o.type], [tw, th] = def.tiles || [1, 1];
      if (def.solid) for (let x = 0; x < tw; x++) for (let y = 0; y < th; y++) this.solid.set(key(o.x + x, o.y - y), o.type);
      return { def, fx: o.x + tw / 2, fy: o.y + 0.92 }; // 腳底中心（排前後用）
    });
    const W = (this.world = ctx.world); this.player = W.me; this.room = W.room; this.sent = { t: 0, vx: 0, vy: 0 };
    ctx.camera.fit(ctx.view, balance);
    ctx.camera.follow(this.player.x * this.T, this.player.y * this.T, ctx.view, map.w * this.T, map.h * this.T, 1);
    ctx.view.onResize = (v) => ctx.camera.fit(v, balance);
    ctx.hud.show(true); ctx.hud.showPlay(true); ctx.hud.setSlots(balance.hotbar);
    ctx.hud.setChat({ maxChars: balance.bubbleMaxChars, emoteList: balance.emotes, say: (text) => this.room.send({ t: 'bubble', text }), emote: (e) => this.room.send({ t: 'emote', e }) });
    this.off = [
      ctx.input.on('slot', (i) => ctx.hud.select(i)),
      ctx.input.on('bag', () => ctx.hud.toast('背包還沒做好（階段 4）')),
      ctx.input.on('say', () => ctx.hud.openSay()),
      ctx.input.on('esc', () => { if (ctx.hud.hasCard) ctx.hud.closeCard(); else if (window.parent !== window) window.parent.postMessage({ type: 'farm-close' }, location.origin); }),
      ctx.input.on('action', () => this.act(this.facingTile())),
      ctx.input.on('tap', (p) => { const w = ctx.camera.toWorld(p.x, p.y); this.act({ x: Math.floor(w.x / this.T), y: Math.floor(w.y / this.T) }); }),
    ];
    const hud = ctx.hud, net = (s) => hud.setNet(s === 'online' ? '' : s === 'replaced' ? '已在別的分頁打開' : '連線中斷，重新連線中…');
    net(W.net);
    this.off.push(
      W.on('status', (s) => { net(s); if (s === 'replaced') hud.card('農場在別的地方打開了', ['同一個帳號一次只能在一個分頁玩。'], [{ label: '知道了', value: true }]); }),
      W.on('snapshot', (m) => { this.sent = { t: 0, vx: 0, vy: 0 }; if (m.summary) this.showSummary(m.summary, m.partner); }),
      W.on('toast', (t) => hud.toast(t)),
      W.on('newday', (m) => { hud.closeCard(); hud.toast(m.reason === 'late' ? '太晚了，累得昏倒了… 已經是隔天早上' : m.reason === 'restore' ? '農場回復到備份的樣子了' : `早安！第 ${m.farm.day} 天`, 2600); }),
    );
    if (ctx.pendingSummary) { this.showSummary(ctx.pendingSummary.summary, ctx.pendingSummary.partner); ctx.pendingSummary = null; }
  },
  exit(ctx) { this.off.forEach((f) => f()); ctx.hud.show(false); ctx.hud.showPlay(false); ctx.view.onResize = null; },

  showSummary(s, partner) {
    const lines = [], who = (partner && partner.name) || '對方';
    if (s.days > 0) lines.push(`過了 ${s.days} 天。`);
    const acts = Object.entries(s.acts || {}).filter(([k]) => ACT_NAME[k]).map(([k, n]) => `${ACT_NAME[k]} ${n} 次`);
    if (acts.length) lines.push(`${who}：${acts.join('、')}。`);
    if (s.money) lines.push(`錢${s.money > 0 ? '多了' : '少了'} ${Math.abs(s.money)} 元。`);
    if (lines.length) this.ctx.hud.card('你不在時發生的事', lines);
  },

  // 測試程式用的捷徑（資料其實都在 world 裡）
  get ready() { return this.world.ready; }, get others() { return this.world.others; }, get tiles() { return this.world.tiles; },
  get farm() { return this.world.farm; }, get bubbles() { return this.world.bubbles; }, minute() { return this.world.minute(); },

  // ---------- 規則 ----------
  blocked(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    return tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h || this.solid.has(key(tx, ty)) || groundAt(this.map, tx, ty) === 'water';
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
  // 動作：送請求給伺服器，伺服器說可以，格子才會變（結果用 tiles 訊息廣播給兩個人）
  async act(t) {
    const { hud } = this.ctx;
    if (hud.hasCard || t.x < 0 || t.y < 0 || t.x >= this.map.w || t.y >= this.map.h) return;
    this.world.mark = { ...t, life: 0.6, color: '#fff' };
    if (this.solid.get(key(t.x, t.y)) === 'house') return this.bed();
    const g = groundAt(this.map, t.x, t.y), tool = this.bal.hotbar[hud.selected];
    if (g !== 'soil' || !tool) return hud.toast(g === 'soil' ? '這一格沒有工具' : `${GROUND_NAME[g] || '地面'}（${t.x}, ${t.y}）`, 900);
    const pl = this.player; pl.dir = DIR(t.x + 0.5 - pl.x, t.y + 0.5 - pl.y, pl.dir);
    const r = await this.room.act(tool.kind, t.x, t.y);
    if (r.t === 'no' && NO_TEXT[r.reason]) hud.toast(NO_TEXT[r.reason], 1300);
  },
  // 回家睡覺：兩個人都在線時，要兩個人都上床才換日
  async bed() {
    const { hud } = this.ctx, p = this.player;
    if (Math.hypot(p.x - 10, p.y - 8.5) > 3) return hud.toast('走到門口再進去', 1000);
    if (p.asleep) return hud.toast('已經躺在床上了，等對方也上床', 1400);
    const awake = [...this.world.others.values()].filter((o) => !o.asleep).map((o) => o.name);
    const pick = await hud.card('回到家了', [awake.length ? `要睡覺的話：${awake.join('、')} 還沒睡，要等對方也上床才會到隔天。走動就會起床。` : '睡了就到隔天早上。'],
      [{ label: '出門', value: null, ghost: true }, { label: '換衣服', value: 'wardrobe', ghost: true }, { label: '睡覺', value: 'sleep' }]);
    if (pick === 'sleep') this.room.send({ t: 'sleep', on: true });
    if (pick === 'wardrobe') this.ctx.scenes.go(create, { edit: true });
  },

  update(dt) {
    const { ctx } = this, W = this.world, p = this.player, hud = ctx.hud, a = hud.typing || hud.hasCard || !W.ready ? { x: 0, y: 0 } : ctx.input.axis(), sp = this.bal.walkSpeed * dt;
    p.px = p.x; p.py = p.y;
    // 左右、上下分開試：斜著撞到牆會沿著牆滑過去，不會整個卡住
    if (a.x && this.free(p.x + a.x * sp, p.y)) p.x += a.x * sp;
    if (a.y && this.free(p.x, p.y + a.y * sp)) p.y += a.y * sp;
    p.moving = !!(a.x || a.y);
    if (p.moving) { p.dir = DIR(a.x, a.y, p.dir); p.anim += dt; p.action = null; } else p.anim += dt;
    for (const q of [p, ...W.others.values()]) if (q.action && (q.actionT += dt) > 0.7) q.action = null; // 揮工具、開心跳：做完就回到平常的樣子
    // 把自己的位置告訴對方：方向一變（包含停下來）馬上送，一直走的時候大約每秒補送一次，不必每一步都送
    const now = performance.now(), s = this.sent, changed = Math.abs(a.x - s.vx) > 0.25 || Math.abs(a.y - s.vy) > 0.25 || (!p.moving && (s.vx || s.vy));
    if (W.ready && ((changed && now - s.t > this.bal.moveSendMs) || (p.moving && now - s.t > this.bal.moveKeepaliveMs))) {
      this.room.send({ t: 'move', x: +p.x.toFixed(3), y: +p.y.toFixed(3), dir: p.dir, vx: +a.x.toFixed(2), vy: +a.y.toFixed(2) });
      this.sent = { t: now, vx: a.x, vy: a.y };
    }
    // 對方：照他最後說的速度往前推，畫面上的位置平滑地追過去
    for (const o of W.others.values()) {
      o.px = o.x; o.py = o.y;
      o.tx += o.vx * sp; o.ty += o.vy * sp;
      const k = Math.min(1, dt * 12); o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k;
      o.moving = !!(o.vx || o.vy) || Math.hypot(o.tx - o.x, o.ty - o.y) > 0.05;
      o.anim += dt;
    }
    for (const [id, b] of W.bubbles) if ((b.life -= dt) <= 0) W.bubbles.delete(id);
    if (W.mark && (W.mark.life -= dt) <= 0) W.mark = null;
    if (W.farm) {
      const m = W.minute(), h = Math.floor(m / 60), mm = Math.floor((m % 60) / 10) * 10, day = W.farm.day - 1, sd = this.bal.seasonDays;
      hud.setClock(`${h >= 24 ? '凌晨 ' + (h - 24) : h}:${String(mm).padStart(2, '0')}`, `第 ${Math.floor(day / (sd * 4)) + 1} 年 ${this.bal.seasons[Math.floor(day / sd) % 4]} ${day % sd + 1} 日`);
    }
  },

  render(ctx, alpha) {
    const W = this.world, { view, camera } = ctx, g = view.ctx, T = this.T, p = this.player;
    // 兩次更新之間用內插的位置畫，更新率比螢幕低也不會一頓一頓
    const lerp = (q) => ({ ...q, x: q.px + (q.x - q.px) * alpha, y: q.py + (q.y - q.py) * alpha });
    const me = lerp(p);
    camera.follow(me.x * T, me.y * T, view, this.map.w * T, this.map.h * T, 0.18);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#5f9c4a'; g.fillRect(0, 0, view.canvas.width, view.canvas.height);
    camera.apply(view);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.ground, 0, 0, this.ground.width * this.ground.scale, this.ground.height * this.ground.scale);
    for (const t of W.tiles.values()) drawTilled(g, t.x, t.y, T, !!t.w);
    if (W.mark) {
      g.globalAlpha = Math.min(1, W.mark.life * 3); g.lineWidth = 4; g.strokeStyle = W.mark.color;
      g.beginPath(); g.roundRect(W.mark.x * T + 4, W.mark.y * T + 4, T - 8, T - 8, 10); g.stroke(); g.globalAlpha = 1;
    }
    // 只畫看得到的，依腳的位置由遠到近畫
    const x0 = camera.x / T - 3, x1 = (camera.x + view.w / camera.zoom) / T + 3, y0 = camera.y / T - 1, y1 = (camera.y + view.h / camera.zoom) / T + 4;
    const list = this.things.filter((t) => t.fx > x0 && t.fx < x1 && t.fy > y0 && t.fy < y1).map((t) => ({ y: t.fy, t }));
    const people = [{ q: me, color: '#f0a04a' }, ...[...W.others.values()].map((o) => ({ q: lerp(o), color: '#6aa8e8' }))];
    for (const pp of people) list.push({ y: pp.q.y, pp });
    list.sort((u, v) => u.y - v.y);
    const parts = ctx.data.parts, U = T * 0.62;
    for (const it of list) {
      if (!it.pp) { drawObject(g, it.t.def, it.t.fx * T, it.t.fy * T, T); continue; }
      const q = it.pp.q;
      if (!q.look) { drawPlayer(g, q, T, it.pp.color); continue; } // 對方還在建立角色：先畫暫代的圓圓人
      drawShadow(g, q.x * T, q.y * T, T * 0.62);
      drawDoll(g, q.look, parts, q.x * T, q.y * T, U, q.dir, q.action || (q.asleep ? 'sit' : q.moving ? 'walk' : 'idle'), q.action ? q.actionT : q.anim, q.tool);
      drawName(g, q.asleep ? q.name + ' Zzz' : q.name, q.x * T, q.y * T - U * 2.72, T);
    }
    for (const pp of people) { const b = W.bubbles.get(pp.q.id); if (b) drawBubble(g, b.text, pp.q.x * T, pp.q.y * T - T * (pp.q.look ? 1.95 : 1.45), T, b.big); }
    // 天色：傍晚慢慢變橘、晚上變暗
    const m = W.minute();
    if (m > 1020) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      const k = Math.min(1, (m - 1020) / 240);
      g.fillStyle = m < 1140 ? `rgba(255, 150, 60, ${0.16 * k})` : `rgba(20, 30, 80, ${0.12 + 0.3 * Math.min(1, (m - 1140) / 180)})`;
      g.fillRect(0, 0, view.canvas.width, view.canvas.height);
    }
  },
};
