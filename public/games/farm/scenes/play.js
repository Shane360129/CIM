// 遊戲場景（階段 2）：測試地圖＋雙人同步。自己的走動在這裡先動；格子、時間、換日都聽伺服器的
import { buildGround, groundAt } from '../render/ground.js';
import { drawObject, drawPlayer, drawBubble, drawTilled } from '../render/placeholder.js';
import { createRoom } from '../net/room.js';

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
    const me = ctx.session.me;
    this.player = { id: me.id, x: map.spawn.x, y: map.spawn.y, px: map.spawn.x, py: map.spawn.y, dir: 'down', moving: false, anim: 0, name: me.displayName, asleep: false };
    this.others = new Map(); this.tiles = new Map(); this.bubbles = new Map(); this.mark = null;
    this.farm = null; this.ready = false; this.sent = { t: 0, vx: 0, vy: 0 };
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
    this.connect();
  },
  exit(ctx) { this.off.forEach((f) => f()); this.room.close(); ctx.hud.show(false); ctx.hud.showPlay(false); ctx.view.onResize = null; },

  // ---------- 連線：伺服器說的每一件事 ----------
  connect() {
    const { ctx } = this, room = (this.room = createRoom(ctx.session.convId)), hud = ctx.hud;
    const setTiles = (list) => { for (const t of list) { if (t.t) this.tiles.set(key(t.x, t.y), t); else this.tiles.delete(key(t.x, t.y)); } };
    const other = (p) => ({ ...p, tx: p.x, ty: p.y, px: p.x, py: p.y, anim: 0, moving: !!(p.vx || p.vy) });
    room.on('status', (s) => {
      hud.setNet(s === 'online' ? '' : s === 'replaced' ? '已在別的分頁打開' : '連線中斷，重新連線中…');
      if (s !== 'online') this.ready = false;
      if (s === 'replaced') hud.card('農場在別的地方打開了', ['同一個帳號一次只能在一個分頁玩。'], [{ label: '知道了', value: true }]);
    });
    room.on('snapshot', (m) => {
      // 第一次連上、或斷線重連：全部照伺服器的重來
      const p = this.player; Object.assign(p, { x: m.you.x, y: m.you.y, px: m.you.x, py: m.you.y, dir: m.you.dir, asleep: false });
      this.others.clear(); for (const o of m.players) this.others.set(o.id, other(o));
      this.tiles.clear(); setTiles(m.tiles); this.farm = { ...m.farm, at: performance.now() }; this.ready = true; this.sent = { t: 0, vx: 0, vy: 0 };
      if (m.summary) this.showSummary(m.summary, m.partner);
    });
    room.on('join', (m) => { this.others.set(m.p.id, other(m.p)); hud.toast(`${m.p.name} 來了`); });
    room.on('leave', (m) => { const o = this.others.get(m.id); if (o) hud.toast(`${o.name} 離開了`); this.others.delete(m.id); this.bubbles.delete(m.id); });
    room.on('move', (m) => { const o = this.others.get(m.id); if (!o) return; Object.assign(o, { tx: m.x, ty: m.y, vx: m.vx, vy: m.vy, dir: m.dir }); if (Math.hypot(o.x - m.x, o.y - m.y) > 4) { o.x = m.x; o.y = m.y; } });
    room.on('tiles', (m) => { setTiles(m.list); if (m.by !== this.player.id && m.list[0]) this.mark = { x: m.list[0].x, y: m.list[0].y, life: 0.6, color: '#ffd76a' }; });
    room.on('no', (m) => { if (m.tile) setTiles([m.tile]); });
    room.on('bubble', (m) => this.bubbles.set(m.id, { text: m.text, life: this.bal.bubbleSeconds }));
    room.on('emote', (m) => this.bubbles.set(m.id, { text: m.e, life: 2.5, big: true }));
    room.on('time', (m) => { if (this.farm) Object.assign(this.farm, { day: m.day, minute: m.minute, at: performance.now() }); });
    room.on('sleep', (m) => { const who = m.id === this.player.id ? this.player : this.others.get(m.id); if (who) who.asleep = m.on; });
    room.on('newday', (m) => {
      this.farm = { ...m.farm, at: performance.now() }; this.tiles.clear(); setTiles(m.tiles);
      this.player.asleep = false; for (const o of this.others.values()) o.asleep = false;
      hud.closeCard();
      hud.toast(m.reason === 'late' ? '太晚了，累得昏倒了… 已經是隔天早上' : m.reason === 'restore' ? '農場回復到備份的樣子了' : `早安！第 ${m.farm.day} 天`, 2600);
    });
    room.connect();
  },
  showSummary(s, partner) {
    const lines = [], who = (partner && partner.name) || '對方';
    if (s.days > 0) lines.push(`過了 ${s.days} 天。`);
    const acts = Object.entries(s.acts || {}).filter(([k]) => ACT_NAME[k]).map(([k, n]) => `${ACT_NAME[k]} ${n} 次`);
    if (acts.length) lines.push(`${who}：${acts.join('、')}。`);
    if (s.money) lines.push(`錢${s.money > 0 ? '多了' : '少了'} ${Math.abs(s.money)} 元。`);
    if (lines.length) this.ctx.hud.card('你不在時發生的事', lines);
  },

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
    this.mark = { ...t, life: 0.6, color: '#fff' };
    if (this.solid.get(key(t.x, t.y)) === 'house') return this.bed();
    const g = groundAt(this.map, t.x, t.y), tool = this.bal.hotbar[hud.selected];
    if (g !== 'soil' || !tool) return hud.toast(g === 'soil' ? '這一格沒有工具' : `${GROUND_NAME[g] || '地面'}（${t.x}, ${t.y}）`, 900);
    const r = await this.room.act(tool.kind, t.x, t.y);
    if (r.t === 'no' && NO_TEXT[r.reason]) hud.toast(NO_TEXT[r.reason], 1300);
  },
  // 回家睡覺：兩個人都在線時，要兩個人都上床才換日
  async bed() {
    const { hud } = this.ctx, p = this.player;
    if (Math.hypot(p.x - 10, p.y - 8.5) > 3) return hud.toast('走到門口再進去', 1000);
    if (p.asleep) return hud.toast('已經躺在床上了，等對方也上床', 1400);
    const awake = [...this.others.values()].filter((o) => !o.asleep).map((o) => o.name);
    const yes = await hud.card('要睡覺了嗎？', [awake.length ? `${awake.join('、')} 還沒睡，要等對方也上床才會到隔天。走動就會起床。` : '睡了就到隔天早上。'],
      [{ label: '再等等', value: false, ghost: true }, { label: '睡覺', value: true }]);
    if (yes) this.room.send({ t: 'sleep', on: true });
  },
  // 現在幾點：伺服器每 10 秒說一次，中間自己照速度往前推
  minute() { const f = this.farm; return f ? Math.min(f.dayEnd, f.minute + (this.ready ? (performance.now() - f.at) / 1000 * f.minutesPerSecond : 0)) : 0; },

  update(dt) {
    const { ctx } = this, p = this.player, hud = ctx.hud, a = hud.typing || hud.hasCard || !this.ready ? { x: 0, y: 0 } : ctx.input.axis(), sp = this.bal.walkSpeed * dt;
    p.px = p.x; p.py = p.y;
    // 左右、上下分開試：斜著撞到牆會沿著牆滑過去，不會整個卡住
    if (a.x && this.free(p.x + a.x * sp, p.y)) p.x += a.x * sp;
    if (a.y && this.free(p.x, p.y + a.y * sp)) p.y += a.y * sp;
    p.moving = !!(a.x || a.y);
    if (p.moving) { p.dir = DIR(a.x, a.y, p.dir); p.anim += dt; } else p.anim = 0;
    // 把自己的位置告訴對方：方向一變（包含停下來）馬上送，一直走的時候大約每秒補送一次，不必每一步都送
    const now = performance.now(), s = this.sent, changed = Math.abs(a.x - s.vx) > 0.25 || Math.abs(a.y - s.vy) > 0.25 || (!p.moving && (s.vx || s.vy));
    if (this.ready && ((changed && now - s.t > this.bal.moveSendMs) || (p.moving && now - s.t > this.bal.moveKeepaliveMs))) {
      this.room.send({ t: 'move', x: +p.x.toFixed(3), y: +p.y.toFixed(3), dir: p.dir, vx: +a.x.toFixed(2), vy: +a.y.toFixed(2) });
      this.sent = { t: now, vx: a.x, vy: a.y };
    }
    // 對方：照他最後說的速度往前推，畫面上的位置平滑地追過去
    for (const o of this.others.values()) {
      o.px = o.x; o.py = o.y;
      o.tx += o.vx * sp; o.ty += o.vy * sp;
      const k = Math.min(1, dt * 12); o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k;
      o.moving = !!(o.vx || o.vy) || Math.hypot(o.tx - o.x, o.ty - o.y) > 0.05;
      o.anim = o.moving ? o.anim + dt : 0;
    }
    for (const [id, b] of this.bubbles) if ((b.life -= dt) <= 0) this.bubbles.delete(id);
    if (this.mark && (this.mark.life -= dt) <= 0) this.mark = null;
    if (this.farm) {
      const m = this.minute(), h = Math.floor(m / 60), mm = Math.floor((m % 60) / 10) * 10, day = this.farm.day - 1, sd = this.bal.seasonDays;
      hud.setClock(`${h >= 24 ? '凌晨 ' + (h - 24) : h}:${String(mm).padStart(2, '0')}`, `第 ${Math.floor(day / (sd * 4)) + 1} 年 ${this.bal.seasons[Math.floor(day / sd) % 4]} ${day % sd + 1} 日`);
    }
  },

  render(ctx, alpha) {
    const { view, camera } = ctx, g = view.ctx, T = this.T, p = this.player;
    // 兩次更新之間用內插的位置畫，更新率比螢幕低也不會一頓一頓
    const lerp = (q) => ({ ...q, x: q.px + (q.x - q.px) * alpha, y: q.py + (q.y - q.py) * alpha });
    const me = lerp(p);
    camera.follow(me.x * T, me.y * T, view, this.map.w * T, this.map.h * T, 0.18);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#5f9c4a'; g.fillRect(0, 0, view.canvas.width, view.canvas.height);
    camera.apply(view);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.ground, 0, 0, this.ground.width * this.ground.scale, this.ground.height * this.ground.scale);
    for (const t of this.tiles.values()) drawTilled(g, t.x, t.y, T, !!t.w);
    if (this.mark) {
      g.globalAlpha = Math.min(1, this.mark.life * 3); g.lineWidth = 4; g.strokeStyle = this.mark.color;
      g.beginPath(); g.roundRect(this.mark.x * T + 4, this.mark.y * T + 4, T - 8, T - 8, 10); g.stroke(); g.globalAlpha = 1;
    }
    // 只畫看得到的，依腳的位置由遠到近畫
    const x0 = camera.x / T - 3, x1 = (camera.x + view.w / camera.zoom) / T + 3, y0 = camera.y / T - 1, y1 = (camera.y + view.h / camera.zoom) / T + 4;
    const list = this.things.filter((t) => t.fx > x0 && t.fx < x1 && t.fy > y0 && t.fy < y1).map((t) => ({ y: t.fy, t }));
    const people = [{ q: me, color: '#f0a04a' }, ...[...this.others.values()].map((o) => ({ q: lerp(o), color: '#6aa8e8' }))];
    for (const pp of people) list.push({ y: pp.q.y, pp });
    list.sort((u, v) => u.y - v.y);
    for (const it of list) {
      if (it.pp) drawPlayer(g, it.pp.q, T, it.pp.color);
      else drawObject(g, it.t.def, it.t.fx * T, it.t.fy * T, T);
    }
    for (const pp of people) { const b = this.bubbles.get(pp.q.id); if (b) drawBubble(g, b.text, pp.q.x * T, pp.q.y * T - T * 1.45, T, b.big); }
    // 天色：傍晚慢慢變橘、晚上變暗
    const m = this.minute();
    if (m > 1020) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      const k = Math.min(1, (m - 1020) / 240);
      g.fillStyle = m < 1140 ? `rgba(255, 150, 60, ${0.16 * k})` : `rgba(20, 30, 80, ${0.12 + 0.3 * Math.min(1, (m - 1140) / 180)})`;
      g.fillRect(0, 0, view.canvas.width, view.canvas.height);
    }
  },
};
