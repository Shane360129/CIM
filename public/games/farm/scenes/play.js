// 遊戲場景（階段 4）：自家農場、農舍裡、往小鎮的路。自己的走動在這裡先動；格子、物品、錢、時間都聽伺服器的（資料在 core/world.js）
import { buildGround } from '../render/ground.js';
import { drawObject, drawPlayer, drawBubble, drawTilled, drawShadow, drawName } from '../render/placeholder.js';
import { drawDoll } from '../render/doll.js';
import { drawSprite } from '../render/sprites.js';
import { groundAt, levelOf, sellPrice } from '../shared/rules.js';
import { openPanel, itemIcon } from '../ui/panels.js';
import { create } from './create.js';

const NO_TEXT = { far: '太遠了，走近一點', ground: '這裡不能翻土', locked: '這塊地還沒開墾（之後才能用）', already: '這裡已經弄好了', untilled: '要先用鋤頭翻土', offline: '連線中斷，稍等一下', timeout: '伺服器沒有回應',
  tired: '太累了，體力不夠', full: '背包滿了', season: '這個季節種不活', crop: '上面還有作物', late: '已經發芽了，來不及施肥', nothing: '', out: '', unknown: '', closed: '那邊還沒開放' };
const TOOL_NAME = { axe: '斧頭', pick: '十字鎬', sickle: '鐮刀' };
const ACT_NAME = { till: '翻土', water: '澆水', plant: '播種', harvest: '收成', clear: '清理', ship: '出貨', buy: '買東西' };
const DIR = (dx, dy, cur) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : dy > 0 ? 'down' : cur);
const key = (x, y) => x + ',' + y;

export const play = {
  enter(ctx) {
    const { balance } = ctx.data, W = (this.world = ctx.world), hud = ctx.hud;
    this.ctx = ctx; this.bal = balance; this.T = balance.tile; this.player = W.me; this.room = W.room; this.sent = { t: 0, vx: 0, vy: 0 }; this.warping = 0;
    ctx.level = (skill) => levelOf(W.self.skills[skill] || 0, balance).lv;
    this.setMap(W.me.map || 'farm');
    ctx.view.onResize = (v) => ctx.camera.fit(v, balance);
    hud.show(true); hud.showPlay(true);
    hud.setChat({ maxChars: balance.bubbleMaxChars, emoteList: balance.emotes, say: (text) => this.room.send({ t: 'bubble', text }), emote: (e) => this.room.send({ t: 'emote', e }) });
    hud.onBag(() => this.togglePanel('bag'));
    const refresh = () => { hud.setHotbar(W.self.inv, (s) => itemIcon(ctx.data.items, s.id, 30)); if (W.farm) hud.setStatus(W.farm.money, W.self.energy, W.self.energyMax); };
    refresh();
    const net = (s) => hud.setNet(s === 'online' ? '' : s === 'replaced' ? '已在別的分頁打開' : '連線中斷，重新連線中…');
    net(W.net);
    this.off = [
      ctx.input.on('slot', (i) => hud.select(i)),
      ctx.input.on('bag', () => this.togglePanel('bag')),
      ctx.input.on('say', () => hud.openSay()),
      ctx.input.on('esc', () => { if (hud.hasPanel) hud.closePanel(); else if (hud.hasCard) hud.closeCard(); else if (window.parent !== window) window.parent.postMessage({ type: 'farm-close' }, location.origin); }),
      ctx.input.on('action', () => this.act(this.facingTile())),
      ctx.input.on('tap', (p) => { const w = ctx.camera.toWorld(p.x, p.y); this.act({ x: Math.floor(w.x / this.T), y: Math.floor(w.y / this.T) }); }),
      W.on('status', (s) => { net(s); if (s === 'replaced') hud.card('農場在別的地方打開了', ['同一個帳號一次只能在一個分頁玩。'], [{ label: '知道了', value: true }]); }),
      W.on('snapshot', (m) => { this.sent = { t: 0, vx: 0, vy: 0 }; this.setMap(W.me.map); refresh(); if (m.summary) this.showSummary(m.summary, m.partner); }),
      W.on('map', (id) => { this.setMap(id); hud.closePanel(); }),
      W.on('self', refresh), W.on('farm', refresh),
      W.on('toast', (t) => hud.toast(t)),
      W.on('objs', (m) => { if (m.by === W.me.id && m.drops) hud.toast('拿到 ' + Object.entries(m.drops).map(([id, n]) => `${ctx.data.items[id].name}×${n}`).join('、'), 1300); }),
      W.on('newday', (m) => { refresh(); hud.closePanel(); hud.closeCard(); this.morning(m); }),
    ];
    if (ctx.pendingSummary) { this.showSummary(ctx.pendingSummary.summary, ctx.pendingSummary.partner); ctx.pendingSummary = null; }
  },
  exit(ctx) { this.off.forEach((f) => f()); ctx.hud.show(false); ctx.hud.showPlay(false); ctx.view.onResize = null; },

  // 換地圖：地面重畫，不會動的東西（房子、家具）和它們擋住的格子、可以互動的格子重算。樹、石頭這些會被清掉的在 world.objs 裡
  setMap(id) {
    const { ctx } = this, map = ctx.data.maps[id] || ctx.data.maps.farm, objects = ctx.data.objects;
    this.mapId = ctx.data.maps[id] ? id : 'farm'; this.map = map; this.ground = buildGround(map, this.T);
    this.solid = new Set(); this.useAt = new Map(); this.things = [];
    for (const o of map.objects) {
      const def = objects[o.type]; if (def.tool) continue;
      const [tw, th] = def.tiles || [1, 1];
      for (let x = 0; x < tw; x++) for (let y = 0; y < th; y++) { if (def.solid) this.solid.add(key(o.x + x, o.y - y)); if (def.use) this.useAt.set(key(o.x + x, o.y - y), def.use); }
      this.things.push({ def, fx: o.x + tw / 2, fy: o.y + 0.92 }); // 腳底中心（排前後用）
    }
    (map.doors || []).forEach((d, i) => this.useAt.set(key(d.x, d.y), 'door:' + ((map.exits || []).length + i)));
    ctx.camera.fit(ctx.view, this.bal);
    ctx.camera.follow(this.player.x * this.T, this.player.y * this.T, ctx.view, map.w * this.T, map.h * this.T, 1);
  },
  showSummary(s, partner) {
    const lines = [], who = (partner && partner.name) || '對方';
    if (s.days > 0) lines.push(`過了 ${s.days} 天。`);
    const acts = Object.entries(s.acts || {}).filter(([k]) => ACT_NAME[k]).map(([k, n]) => `${ACT_NAME[k]} ${n} 次`);
    if (acts.length) lines.push(`${who}：${acts.join('、')}。`);
    if (s.money) lines.push(`錢${s.money > 0 ? '多了' : '少了'} ${Math.abs(s.money)} 元。`);
    if (lines.length) this.ctx.hud.card('你不在時發生的事', lines);
  },
  // 早上：昨天出貨箱賣了多少（兩個人各放了什麼都看得到）
  morning(m) {
    const { hud, data } = this.ctx, f = m.farm, W = this.world;
    const head = m.reason === 'late' ? '太晚了，累得昏倒了… 已經是隔天早上' : m.reason === 'restore' ? '農場回復到備份的樣子了' : `早安！第 ${f.day} 天`;
    const lines = [`今天的天氣：${this.bal.weatherNames[f.weather]}`];
    if (f.lastShip && f.lastShip.day === f.day - 1 && m.reason !== 'restore') {
      for (const l of f.lastShip.lines) lines.push(`${l.by === W.me.id ? '你' : (W.partner && W.partner.name) || '對方'}：${data.items[l.id].name}${l.q ? `（${this.bal.quality.names[l.q]}）` : ''}×${l.n} → ${l.sum} 元`);
      lines.push(`出貨收入一共 ${f.lastShip.total} 元。`);
    }
    hud.card(head, lines, [{ label: '開始新的一天', value: true }]);
  },
  togglePanel(mode) { const hud = this.ctx.hud; if (hud.hasPanel) hud.closePanel(); else if (!hud.hasCard) openPanel(this.ctx, mode); },
  // 測試程式用的捷徑（資料其實都在 world 裡）
  get ready() { return this.world.ready; }, get others() { return this.world.others; }, get tiles() { return this.world.tiles; },
  get farm() { return this.world.farm; }, get bubbles() { return this.world.bubbles; }, minute() { return this.world.minute(); },

  // ---------- 規則 ----------
  blocked(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y), m = this.map;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || (m.walls && ty < 1)) return true;
    if (this.solid.has(key(tx, ty)) || groundAt(m, tx, ty) === 'water') return true;
    const o = this.world.obj(this.mapId, tx, ty); return !!o && !!this.ctx.data.objects[o.type].solid;
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
  // 動作：先看那一格是不是可以互動的東西（門、出貨箱、床…），不是的話就用手上的東西對那一格做事（送請求給伺服器）
  async act(t) {
    const { hud, data } = this.ctx, W = this.world, pl = this.player;
    if (hud.hasCard || !W.ready || t.x < 0 || t.y < 0 || t.x >= this.map.w || t.y >= this.map.h) return;
    W.mark = { ...t, life: 0.6, color: '#fff' };
    const use = this.useAt.get(key(t.x, t.y));
    if (use) {
      if (Math.hypot(t.x + 0.5 - pl.x, t.y + 0.5 - pl.y) > this.bal.reach + 1) return hud.toast('走近一點', 900);
      if (use.startsWith('door:')) { const r = await this.room.req({ t: 'warp', i: Number(use.slice(5)) }); if (r.t === 'no') hud.toast(NO_TEXT[r.reason] || '進不去', 1000); return; }
      if (use === 'bin') return openPanel(this.ctx, 'ship');
      if (use === 'chest') return openPanel(this.ctx, 'chest');
      if (use === 'shop') return openPanel(this.ctx, 'shop');
      if (use === 'wardrobe') return this.ctx.scenes.go(create, { edit: true });
      if (use === 'bed') return this.bed();
      return;
    }
    pl.dir = DIR(t.x + 0.5 - pl.x, t.y + 0.5 - pl.y, pl.dir);
    const r = await this.room.req({ t: 'use', slot: hud.selected, x: t.x, y: t.y });
    if (r.t === 'ok' && r.got) hud.toast(`收成了 ${data.items[r.got.id].name}${r.got.q ? `（${this.bal.quality.names[r.got.q]}）` : ''}`, 1200);
    if (r.t === 'no') { const tool = r.reason.startsWith('tool:') && TOOL_NAME[r.reason.slice(5)]; const text = tool ? `這個要用${tool}` : NO_TEXT[r.reason]; if (text) hud.toast(text, 1300); }
  },
  // 上床睡覺：兩個人都在線時，要兩個人都上床才換日
  async bed() {
    const { hud } = this.ctx, p = this.player;
    if (p.asleep) return hud.toast('已經躺在床上了，等對方也上床', 1400);
    const awake = [...this.world.others.values()].filter((o) => !o.asleep).map((o) => o.name);
    const yes = await hud.card('要睡覺了嗎？', [awake.length ? `${awake.join('、')} 還沒睡，要等對方也上床才會到隔天。走動就會起床。` : '睡了就到隔天早上，出貨箱的東西會結算。'],
      [{ label: '再等等', value: false, ghost: true }, { label: '睡覺', value: true }]);
    if (yes) { const r = await this.room.req({ t: 'sleep', on: true }); if (r.t === 'no' && r.reason !== 'timeout') hud.toast('走到床邊再睡', 1000); }
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
    // 走到地圖的出入口：換地圖（請伺服器帶過去）
    if (p.moving && now > this.warping) (this.map.exits || []).forEach((e, i) => {
      if (p.x >= e.x && p.x < e.x + e.w && p.y >= e.y && p.y < e.y + e.h) {
        this.warping = now + 1200;
        if (!e.to) hud.toast(e.label, 1200); else { this.room.send({ t: 'move', x: +p.x.toFixed(3), y: +p.y.toFixed(3), dir: p.dir, vx: 0, vy: 0 }); this.room.req({ t: 'warp', i }); }
      }
    });
    // 對方：照他最後說的速度往前推，畫面上的位置平滑地追過去
    for (const o of W.others.values()) {
      o.px = o.x; o.py = o.y;
      o.tx += o.vx * sp; o.ty += o.vy * sp;
      const k = Math.min(1, dt * 12); o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k;
      o.moving = !!(o.vx || o.vy) || Math.hypot(o.tx - o.x, o.ty - o.y) > 0.05;
      o.anim += dt;
    }
    for (const [id, b] of W.bubbles) if ((b.life -= dt) <= 0) W.bubbles.delete(id);
    W.floaters = W.floaters.filter((f) => (f.life -= dt) > 0);
    if (W.mark && (W.mark.life -= dt) <= 0) W.mark = null;
    if (W.farm) {
      const m = W.minute(), h = Math.floor(m / 60), mm = Math.floor((m % 60) / 10) * 10, day = W.farm.day - 1, sd = this.bal.seasonDays;
      hud.setClock(`${h >= 24 ? '凌晨 ' + (h - 24) : h}:${String(mm).padStart(2, '0')}　${this.bal.weatherNames[W.farm.weather] || ''}`, `第 ${Math.floor(day / (sd * 4)) + 1} 年 ${this.bal.seasons[Math.floor(day / sd) % 4]} ${day % sd + 1} 日・${this.map.name}`);
    }
  },

  render(ctx, alpha) {
    const W = this.world, { view, camera, data } = ctx, g = view.ctx, T = this.T, p = this.player, mapId = this.mapId, season = (W.farm && W.farm.season) || 'spring';
    // 兩次更新之間用內插的位置畫，更新率比螢幕低也不會一頓一頓
    const lerp = (q) => ({ ...q, x: q.px + (q.x - q.px) * alpha, y: q.py + (q.y - q.py) * alpha });
    const me = lerp(p);
    camera.follow(me.x * T, me.y * T, view, this.map.w * T, this.map.h * T, 0.18);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = this.map.outdoor ? '#5f9c4a' : '#3b2f22'; g.fillRect(0, 0, view.canvas.width, view.canvas.height);
    camera.apply(view);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.ground, 0, 0, this.ground.width * this.ground.scale, this.ground.height * this.ground.scale);
    if (this.map.walls) { g.fillStyle = '#b08a5e'; g.fillRect(0, 0, this.map.w * T, T); g.fillStyle = '#8a6a44'; g.fillRect(0, T * 0.86, this.map.w * T, T * 0.14); }
    const x0 = camera.x / T - 3, x1 = (camera.x + view.w / camera.zoom) / T + 3, y0 = camera.y / T - 1, y1 = (camera.y + view.h / camera.zoom) / T + 4;
    const list = [];
    for (const t of W.tiles.values()) {
      if (t.map !== mapId || t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      drawTilled(g, t.x, t.y, T, !!t.w);
      if (t.f) { g.fillStyle = t.f > 1 ? '#ffe36a' : '#f3ead2'; for (const [dx, dy] of [[0.25, 0.3], [0.7, 0.42], [0.45, 0.72]]) { g.beginPath(); g.arc((t.x + dx) * T, (t.y + dy) * T, T * 0.035, 0, 7); g.fill(); } }
      if (t.c) list.push({ y: t.y + 0.8, crop: t });
    }
    if (W.mark) {
      g.globalAlpha = Math.min(1, W.mark.life * 3); g.lineWidth = 4; g.strokeStyle = W.mark.color;
      g.beginPath(); g.roundRect(W.mark.x * T + 4, W.mark.y * T + 4, T - 8, T - 8, 10); g.stroke(); g.globalAlpha = 1;
    }
    // 出入口的字
    for (const e of this.map.exits || []) { g.font = `700 ${T * 0.22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(e.label, clampX((e.x + e.w / 2) * T, this.map.w * T, T * 1.6), (e.y + e.h / 2) * T - T * 1.1 * (e.h > 1 ? 1 : 0.2)); }
    // 只畫看得到的，依腳的位置由遠到近畫
    for (const t of this.things) if (t.fx > x0 && t.fx < x1 && t.fy > y0 && t.fy < y1) list.push({ y: t.fy, t });
    for (const o of W.objs.values()) if (o.map === mapId && o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1) list.push({ y: o.y + 0.92, t: { def: data.objects[o.type], fx: o.x + 0.5, fy: o.y + 0.92 } });
    const people = [{ q: me, color: '#f0a04a' }, ...[...W.others.values()].filter((o) => o.map === mapId).map((o) => ({ q: lerp(o), color: '#6aa8e8' }))];
    for (const pp of people) list.push({ y: pp.q.y, pp });
    list.sort((u, v) => u.y - v.y);
    const parts = data.parts, U = T * 0.62;
    for (const it of list) {
      if (it.crop) { this.drawCrop(g, it.crop, T); continue; }
      if (it.t) { const d = it.t.def; if (!(d.art && drawSprite(g, d.art.replace('{season}', season), it.t.fx * T, it.t.fy * T, d.w * T, d.h * T))) drawObject(g, d, it.t.fx * T, it.t.fy * T, T); continue; }
      const q = it.pp.q;
      if (!q.look) { drawPlayer(g, q, T, it.pp.color); continue; } // 對方還在建立角色：先畫暫代的圓圓人
      drawShadow(g, q.x * T, q.y * T, T * 0.62);
      drawDoll(g, q.look, parts, q.x * T, q.y * T, U, q.dir, q.action || (q.asleep ? 'sit' : q.moving ? 'walk' : 'idle'), q.action ? q.actionT : q.anim, q.tool);
      drawName(g, q.asleep ? q.name + ' Zzz' : q.name, q.x * T, q.y * T - U * 2.72, T);
    }
    for (const f of W.floaters) { if (f.map !== mapId) continue; g.globalAlpha = Math.min(1, f.life * 2); const it = data.items[f.item]; if (!drawSprite(g, it.art, f.x * T, (f.y - (1.1 - f.life) * 0.9) * T, T * 0.6, T * 0.6)) drawName(g, it.name, f.x * T, (f.y - (1.1 - f.life) * 0.9) * T, T); g.globalAlpha = 1; }
    for (const pp of people) { const b = W.bubbles.get(pp.q.id); if (b) drawBubble(g, b.text, pp.q.x * T, pp.q.y * T - T * (pp.q.look ? 1.95 : 1.45), T, b.big); }
    // 天色（只有戶外）：傍晚慢慢變橘、晚上變暗；下雨天灰一點、畫雨絲
    if (!this.map.outdoor || !W.farm) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const m = W.minute(), wet = W.farm.weather === 'rain' || W.farm.weather === 'storm';
    if (wet || W.farm.weather === 'cloud') { g.fillStyle = wet ? 'rgba(60, 80, 110, .22)' : 'rgba(90, 100, 110, .12)'; g.fillRect(0, 0, view.canvas.width, view.canvas.height); }
    if (wet) { g.strokeStyle = 'rgba(210, 230, 255, .55)'; g.lineWidth = view.dpr * 1.5; const t = performance.now() / 1000; g.beginPath(); for (let i = 0; i < 70; i++) { const rx = ((i * 137.5 + t * 260) % (view.canvas.width + 80)) - 40, ry = ((i * 71.3 + t * 900) % (view.canvas.height + 60)) - 30; g.moveTo(rx, ry); g.lineTo(rx - 6 * view.dpr, ry + 16 * view.dpr); } g.stroke(); }
    if (m > 1020) {
      const k = Math.min(1, (m - 1020) / 240);
      g.fillStyle = m < 1140 ? `rgba(255, 150, 60, ${0.16 * k})` : `rgba(20, 30, 80, ${0.12 + 0.3 * Math.min(1, (m - 1140) / 180)})`;
      g.fillRect(0, 0, view.canvas.width, view.canvas.height);
    }
  },
  // 作物：有圖用圖（五個成長階段），沒有圖畫暫代的小苗；枯掉的畫成褐色
  drawCrop(g, t, T) {
    const c = t.c, def = this.ctx.data.crops[c.id], x = (t.x + 0.5) * T, y = (t.y + 0.9) * T, s = c.s < 0 ? 2 : c.s;
    if (c.s >= 0 && drawSprite(g, `${def.art}/${s}`, x, y, T * 0.95, T * (0.5 + s * 0.2))) { if (c.s === 4) { g.fillStyle = 'rgba(255, 240, 150, .9)'; const tw = (Math.sin(performance.now() / 300 + t.x) + 1) * 0.5; g.beginPath(); g.arc(x + T * 0.3, y - T * 0.75, T * 0.05 * (0.5 + tw), 0, 7); g.fill(); } return; }
    g.fillStyle = c.s < 0 ? '#8a6a44' : '#4f9d3f'; g.strokeStyle = '#5a3d22'; g.lineWidth = Math.max(1.5, T * 0.04);
    g.beginPath(); g.ellipse(x, y - T * (0.1 + s * 0.07), T * (0.1 + s * 0.05), T * (0.1 + s * 0.08), 0, 0, 7); g.fill(); g.stroke();
    if (c.s === 4) { g.fillStyle = '#f0a04a'; g.beginPath(); g.arc(x, y - T * 0.42, T * 0.1, 0, 7); g.fill(); g.stroke(); }
  },
};
const clampX = (x, w, pad) => Math.max(pad, Math.min(w - pad, x));
