// 遊戲場景（階段 4）：自家農場、農舍裡、往小鎮的路。自己的走動在這裡先動；格子、物品、錢、時間都聽伺服器的（資料在 core/world.js）
import { buildGround } from '../render/ground.js';
import { drawObject, drawPlayer, drawBubble, drawTilled, drawShadow, drawName } from '../render/placeholder.js';
import { drawDoll } from '../render/doll.js';
import { drawSprite } from '../render/sprites.js';
import { groundAt, levelOf, sellPrice, animalPos, hearts, mineMap, monPos, npcPos, seasonIndex, rng } from '../shared/rules.js';
import { iconEl } from '../render/sprites.js';
import { openPanel, itemIcon, setToolLv } from '../ui/panels.js';
import { create } from './create.js';
import { createFishing } from '../systems/fishing.js';
import { runEvent } from '../systems/cutscene.js';
import { minigame } from './minigame.js';

const NO_TEXT = { far: '太遠了，走近一點', ground: '這裡不行', locked: '這塊地還沒開墾（之後才能用）', already: '這裡已經弄好了', untilled: '要先用鋤頭翻土', offline: '連線中斷，稍等一下', timeout: '伺服器沒有回應',
  tired: '太累了，體力不夠', gone: '魚跑掉了', machine: '這個放不進這台機器', place: '加工機要放在農場的空地上', full: '背包滿了', season: '這個季節種不活', crop: '上面還有作物', late: '已經發芽了，來不及施肥', nothing: '', out: '', unknown: '', closed: '那邊還沒開放' };
const TOOL_NAME = { axe: '斧頭', pick: '十字鎬', sickle: '鐮刀', rod: '釣竿', sword: '劍', brush: '動物刷' };
const ACT_NAME = { till: '翻土', water: '澆水', plant: '播種', harvest: '收成', clear: '清理', ship: '出貨', buy: '買東西', forage: '採集', fish: '釣魚' };
const DIR = (dx, dy, cur) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : dy > 0 ? 'down' : cur);
const key = (x, y) => x + ',' + y;

export const play = {
  enter(ctx) {
    const { balance } = ctx.data, W = (this.world = ctx.world), hud = ctx.hud;
    this.ctx = ctx; this.bal = balance; this.T = balance.tile; this.player = W.me; this.room = W.room; this.sent = { t: 0, vx: 0, vy: 0 }; this.warping = 0;
    ctx.level = (skill) => levelOf(W.self.skills[skill] || 0, balance).lv;
    // 釣魚結束：r 是伺服器的回覆
    this.fishing = createFishing(ctx, (r, win, diff, why) => {
      const items = ctx.data.items;
      if (why === 'early') return hud.toast('太早拉了，魚跑掉了', 1300);
      if (why === 'late') return hud.toast('慢了一步，魚跑掉了', 1300);
      if (!r || r.t !== 'ok') return hud.toast(r && r.reason === 'full' ? '背包滿了，魚放回去了' : '魚跑掉了', 1300);
      if (!r.got) return hud.toast('沒拉上來…', 1300);
      const it = items[r.got.id]; W.me.action = 'happy'; W.me.actionT = 0;
      hud.toast(r.got.size ? `釣到 ${it.name}（${r.got.size} 公分）${r.got.record ? '・新紀錄！' : ''}` : `釣到 ${it.name}`, 1800);
    });
    this.setMap(W.me.map || 'farm');
    ctx.view.onResize = (v) => ctx.camera.fit(v, balance);
    hud.show(true); hud.showPlay(true);
    hud.setChat({ maxChars: balance.bubbleMaxChars, emoteList: balance.emotes, say: (text) => this.room.send({ t: 'bubble', text }), emote: (e) => this.room.send({ t: 'emote', e }) });
    hud.onBag(() => { this.fishing.cancel(); this.togglePanel('bag'); });
    const refresh = () => { setToolLv(W.self.toolLv); hud.setHotbar(W.self.inv, (s) => itemIcon(ctx.data.items, s.id, 30)); if (W.farm) hud.setStatus(W.farm.money, W.self.energy, W.self.energyMax, W.me.map === 'mine' ? W.self.hp : null, W.self.hpMax); };
    refresh();
    const net = (s) => hud.setNet(s === 'online' ? '' : s === 'replaced' ? '已在別的分頁打開' : '連線中斷，重新連線中…');
    net(W.net);
    this.off = [
      ctx.input.on('slot', (i) => hud.select(i)),
      ctx.input.on('bag', () => this.togglePanel('bag')),
      ctx.input.on('say', () => hud.openSay()),
      ctx.input.on('esc', () => { if (hud.hasPanel) hud.closePanel(); else if (hud.hasCard) hud.closeCard(); else if (window.parent !== window) window.parent.postMessage({ type: 'farm-close' }, location.origin); }),
      ctx.input.on('action', () => { if (hud.skipDialog()) return; if (this.fishing.active) this.fishing.press(); else this.act(this.facingTile()); }),
      ctx.input.on('tap', (p) => { if (this.fishing.active) return this.fishing.press(); const w = ctx.camera.toWorld(p.x, p.y); this.act({ x: Math.floor(w.x / this.T), y: Math.floor(w.y / this.T) }); }),
      W.on('status', (s) => { net(s); if (s === 'replaced') hud.card('農場在別的地方打開了', ['同一個帳號一次只能在一個分頁玩。'], [{ label: '知道了', value: true }]); }),
      W.on('snapshot', (m) => { this.sent = { t: 0, vx: 0, vy: 0 }; this.setMap(W.me.map); refresh(); if (m.summary) this.showSummary(m.summary, m.partner); }),
      W.on('map', (id) => { this.fishing.cancel(); this.setMap(id); hud.closePanel(); refresh(); }),
      W.on('self', refresh), W.on('farm', refresh),
      W.on('toast', (t) => hud.toast(t)),
      W.on('restored', (m) => { const r = ctx.data.restore[m.fac]; hud.closePanel(); hud.card(`「${r.name}」修好了！`, [r.perkText, ...(m.all ? [balance.restore.allDone.text + `（${balance.restore.allDone.money} 元）`] : [])], [{ label: '太好了', value: true }]); }),
      W.on('faint', () => hud.card('昏倒了…', ['被怪物打到沒力氣，醒來已經在礦坑外面。東西都還在，只是體力剩一半。'], [{ label: '好', value: true }])),
      W.on('mine-upd', (m) => { if (m.by === W.me.id && m.drops) hud.toast('拿到 ' + Object.entries(m.drops).map(([id, n]) => `${ctx.data.items[id].name}×${n}`).join('、'), 1300); if (m.stairs && m.stairs.open && m.rock && m.rock.x === m.stairs.x && m.rock.y === m.stairs.y) hud.toast('石頭下面有往下的樓梯！', 1600); }),
      W.on('objs', (m) => { if (m.by === W.me.id && m.drops) hud.toast('拿到 ' + Object.entries(m.drops).map(([id, n]) => `${ctx.data.items[id].name}×${n}`).join('、'), 1300); }),
      W.on('newday', (m) => { refresh(); hud.closePanel(); hud.closeCard(); this.morning(m); }),
    ];
    if (ctx.pendingSummary) { this.showSummary(ctx.pendingSummary.summary, ctx.pendingSummary.partner); ctx.pendingSummary = null; }
  },
  exit(ctx) { this.fishing.cancel(); if (this.hunt) { this.hunt.timer.remove(); this.hunt = null; } this.off.forEach((f) => f()); ctx.hud.show(false); ctx.hud.showPlay(false); ctx.view.onResize = null; },

  // 換地圖：地面重畫，不會動的東西（房子、家具）和它們擋住的格子、可以互動的格子重算。樹、石頭這些會被清掉的在 world.objs 裡
  setMap(id) {
    const { ctx } = this, mine = id === 'mine' && this.world.mine, map = mine ? mineMap(this.bal, mine.floor) : ctx.data.maps[id] || ctx.data.maps.farm, objects = ctx.data.objects;
    this.mapId = mine ? 'mine' : ctx.data.maps[id] ? id : 'farm'; this.map = map; this.ground = buildGround(map, this.T);
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
    const { hud, data } = this.ctx, f = m.farm, W = this.world, born = (f.newborn || []).length ? [`${f.newborn.join('、')} 出生了！`] : [];
    const head = m.reason === 'late' ? '太晚了，累得昏倒了… 已經是隔天早上' : m.reason === 'restore' ? '農場回復到備份的樣子了' : `早安！第 ${f.day} 天`;
    const lines = [`今天的天氣：${this.bal.weatherNames[f.weather]}`];
    if (f.festival) lines.push(`今天是${data.festivals[f.festival].name}！到小鎮廣場的舞台參加活動。`);
    if (f.lastShip && f.lastShip.day === f.day - 1 && m.reason !== 'restore') {
      for (const l of f.lastShip.lines) lines.push(`${l.by === W.me.id ? '你' : (W.partner && W.partner.name) || '對方'}：${data.items[l.id].name}${l.q ? `（${this.bal.quality.names[l.q]}）` : ''}×${l.n} → ${l.sum} 元`);
      lines.push(`出貨收入一共 ${f.lastShip.total} 元。`);
    }
    hud.card(head, [...lines, ...born], [{ label: '開始新的一天', value: true }]);
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
    if (m.mine) return !!this.world.mine && this.world.mine.rocks.some((r) => r.x === tx && r.y === ty);
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
    if (this.map.mine) return this.actMine(t);
    const fe = this.fest(); if (fe && !this.hunt && Math.abs(t.x + 0.5 - (fe.d.stage.x + 1)) <= 1.6 && Math.abs(t.y - fe.d.stage.y) <= 1) return this.festival(fe);
    const use = this.useAt.get(key(t.x, t.y));
    if (use) {
      if (Math.hypot(t.x + 0.5 - pl.x, t.y + 0.5 - pl.y) > this.bal.reach + 1) return hud.toast('走近一點', 900);
      if (use.startsWith('door:')) { const r = await this.room.req({ t: 'warp', i: Number(use.slice(5)) }); if (r.t === 'no') hud.toast(NO_TEXT[r.reason] || '進不去', 1000); return; }
      if (use === 'bin') return openPanel(this.ctx, 'ship');
      if (use === 'chest') return openPanel(this.ctx, 'chest');
      if (use === 'shop') return openPanel(this.ctx, 'shop', { shop: 'stall' });
      if (data.shops[use]) return openPanel(this.ctx, 'shop', { shop: use });
      if (use === 'smith') return openPanel(this.ctx, 'smith');
      if (use === 'carpenter') return hud.toast('桐伯：蓋房子、擴建的生意還在準備，過陣子再來！', 1600);
      if (use === 'board') return this.board();
      if (use === 'mail') return this.mail();
      if (use === 'stove') return openPanel(this.ctx, 'cook');
      if (use === 'coop' || use === 'barn') return openPanel(this.ctx, use);
      if (use === 'workbench') return openPanel(this.ctx, 'craft');
      if (use === 'wardrobe') return this.ctx.scenes.go(create, { edit: true });
      if (use === 'bed') return this.bed();
      if (use === 'mine') return this.elevator(false);
      return;
    }
    pl.dir = DIR(t.x + 0.5 - pl.x, t.y + 0.5 - pl.y, pl.dir);
    const held = W.self.inv[hud.selected], heldDef = held && data.items[held.id];
    // 對著居民：聊天或送禮
    const folk = this.folks().find((n) => Math.hypot(n.x - (t.x + 0.5), n.y - 0.5 - (t.y + 0.5)) < 1.0);
    if (folk) return this.talk(folk);
    // 對著動物：有產品先收，今天還沒摸就摸摸，手上拿刷子就刷毛
    const beast = this.beasts().find((b) => Math.hypot(b.x - (t.x + 0.5), b.y - 0.4 - (t.y + 0.5)) < 0.85);
    if (beast) {
      const an = beast.an, brush = heldDef && heldDef.tool === 'brush';
      const msg = beast.pet ? { t: 'pet', aid: an.id } : { t: 'animal', aid: an.id, act: an.ready ? 'collect' : brush && an.brushDay !== W.farm.day ? 'brush' : 'pet', slot: hud.selected };
      const r = await this.room.req(msg);
      if (r.t === 'ok') { if (r.got) hud.toast(`拿到 ${data.items[r.got.id].name}${r.got.q ? `（${this.bal.quality.names[r.got.q]}）` : ''}`, 1300); else { W.floaters.push({ map: this.mapId, x: beast.x, y: beast.y - 0.6, heart: true, life: 1.1 }); hud.toast(`${an.name} 很開心 ${'♥'.repeat(hearts(r.love, this.bal)) || '♡'}`, 1200); } }
      else hud.toast(r.reason === 'already' ? `${an.name}：${'♥'.repeat(hearts(an.love, this.bal)) || '♡'}（今天摸過了）` : r.reason === 'full' ? '背包滿了' : NO_TEXT[r.reason] || '', 1300);
      return;
    }
    if (heldDef && heldDef.tool === 'rod' && !W.obj(this.mapId, t.x, t.y)) { // 釣竿：對著水面拋竿（可以丟遠一點：面前直直看過去最近的水）
      let w = groundAt(this.map, t.x, t.y) === 'water' ? t : null;
      if (!w) { const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[pl.dir]; for (let i = 1; i <= 3 && !w; i++) { const x = Math.floor(pl.x) + d[0] * i, y = Math.floor(pl.y) + d[1] * i; if (groundAt(this.map, x, y) === 'water') w = { x, y }; } }
      if (!w) return hud.toast('要對著水面才能釣魚', 1100);
      const r = await this.fishing.cast(hud.selected, w.x, w.y);
      if (r && r.t === 'no') hud.toast(NO_TEXT[r.reason] || '這裡釣不到', 1200); else if (r) { pl.action = 'cast'; pl.actionT = 0; pl.tool = 'cast'; }
      return;
    }
    const r = await this.room.req({ t: 'use', slot: hud.selected, x: t.x, y: t.y });
    if (r.t === 'ok' && r.got) hud.toast(`收成了 ${data.items[r.got.id].name}${r.got.q ? `（${this.bal.quality.names[r.got.q]}）` : ''}`, 1200);
    if (r.t === 'no' && r.reason === 'busy') return hud.toast(`還在做，大約還要 ${r.left >= 60 ? Math.round(r.left / 60) + ' 小時' : r.left + ' 分鐘'}`, 1300);
    if (r.t === 'no') { const tool = r.reason.startsWith('tool:') && TOOL_NAME[r.reason.slice(5)]; const text = tool ? `這個要用${tool}` : NO_TEXT[r.reason]; if (text) hud.toast(text, 1300); }
  },
  // 礦坑入口／礦坑裡的梯子：從第 1 層進去，或坐電梯到去過的第 5、10、15… 層；在裡面的話也可以出去
  async elevator(inside) {
    const { hud } = this.ctx, W = this.world, M = this.bal.mine, deep = W.farm.mineDeepest || 1, btns = [];
    if (inside) btns.push({ label: '出去', value: 'exit', ghost: true }); else btns.push({ label: '第 1 層', value: 1 });
    for (let n = M.elevatorEvery; n <= Math.min(deep, M.floors); n += M.elevatorEvery) if (!inside || n !== W.mine.floor) btns.push({ label: `第 ${n} 層`, value: n, ghost: true });
    btns.push({ label: '先不要', value: null, ghost: true });
    const pick = await hud.card(inside ? `礦坑第 ${W.mine.floor} 層` : '礦坑入口', [inside ? '要出去，還是坐電梯到別層？' : `用十字鎬敲石頭，樓梯藏在某一顆下面。每 ${M.elevatorEvery} 層有電梯。目前最深到過第 ${deep} 層。小心怪物，帶著劍。`], btns);
    if (pick === 'exit') await this.room.req({ t: 'mine-exit' }); else if (pick) { const r = await this.room.req({ t: 'mine-enter', floor: pick }); if (r.t === 'no') hud.toast('進不去', 1000); }
  },
  // 在礦坑裡按動作鍵：怪物 → 揮劍；石頭 → 敲；樓梯 → 下去；入口的梯子 → 出去或坐電梯
  async actMine(t) {
    const { hud, data } = this.ctx, W = this.world, s = W.mine, pl = this.player; if (!s) return;
    pl.dir = DIR(t.x + 0.5 - pl.x, t.y + 0.5 - pl.y, pl.dir);
    const now = W.serverNow(), mon = s.mons.map((m) => ({ m, p: monPos(m, now) })).filter((q) => Math.hypot(q.p.x - pl.x, q.p.y - pl.y) < this.bal.reach + 0.3).sort((a, b) => Math.hypot(a.p.x - t.x - 0.5, a.p.y - t.y - 0.5) - Math.hypot(b.p.x - t.x - 0.5, b.p.y - t.y - 0.5))[0];
    const held = W.self.inv[hud.selected], tool = held && data.items[held.id].tool;
    let r = null;
    if (mon && (tool === 'sword' || Math.hypot(mon.p.x - t.x - 0.5, mon.p.y - t.y - 0.5) < 0.9)) r = await this.room.req({ t: 'mon-hit', mid: mon.m.id, slot: hud.selected });
    else if (s.rocks.some((k) => k.x === t.x && k.y === t.y)) r = await this.room.req({ t: 'mine-hit', x: t.x, y: t.y, slot: hud.selected });
    else if (s.stairs.open && s.stairs.x === t.x && s.stairs.y === t.y) r = await this.room.req({ t: 'mine-down' });
    else if (Math.abs(t.x - s.spawn.x) <= 1 && t.y >= s.spawn.y) return this.elevator(true);
    if (r && r.t === 'no') { const need = r.reason.startsWith('tool:') && TOOL_NAME[r.reason.slice(5)]; const text = need ? `這個要用${need}` : NO_TEXT[r.reason]; if (text) hud.toast(text, 1200); }
  },
  // 今天這張地圖上有沒有節慶
  fest() { const W = this.world, id = W.farm && W.farm.festival, d = id && this.ctx.data.festivals[id]; return d && d.map === this.mapId ? { id, d } : null; },
  // 對著節慶的舞台按動作鍵：說明規則，開始小遊戲
  async festival(fe) {
    const { hud } = this.ctx, W = this.world, year = Math.floor((W.farm.day - 1) / (this.bal.seasonDays * 4)), played = (W.self.fest || {})[`${year}:${fe.id}`];
    const go = await hud.card(fe.d.name, [fe.d.intro, played != null ? `你今年已經拿過獎了（${played} 分），再玩一次不會再給獎。` : '獎品一年只能領一次。'], [{ label: '先不要', value: false, ghost: true }, { label: '開始！', value: true }]);
    if (!go) return;
    if (fe.d.game === 'catch') return this.ctx.scenes.go(minigame, { fest: fe.d, id: fe.id });
    // 尋蛋：彩蛋藏在這張地圖上能走到的地方（位置用天數算，兩個人看到的一樣），走過去就撿起來
    const r = rng(W.farm.day * 7919 + 31), eggs = [];
    for (let tries = 0; eggs.length < fe.d.eggs && tries < 800; tries++) { const x = 2 + Math.floor(r() * (this.map.w - 4)), y = 3 + Math.floor(r() * (this.map.h - 6)); if (!this.blocked(x + 0.5, y + 0.5) && !eggs.some((e) => e.x === x && e.y === y)) eggs.push({ x, y, hue: Math.floor(r() * 360) }); }
    const timer = document.createElement('div'); timer.className = 'timer'; document.getElementById('ui').append(timer);
    this.hunt = { fe, left: fe.d.seconds, eggs, score: 0, timer };
  },
  async endHunt() {
    const { hud, data } = this.ctx, h = this.hunt; this.hunt = null; h.timer.remove();
    const r = await this.room.req({ t: 'fest-score', fest: h.fe.id, score: h.score }), p = r.t === 'ok' ? r.prize : null;
    hud.card(`${h.fe.d.name}：找到 ${h.score} 顆`, [p ? `獎品：${p.money ? p.money + ' 元' : ''}${p.item ? `、${data.items[p.item[0]].name}×${p.item[1]}` : ''}` : r.reason === 'already' ? '今年已經領過獎了，這次只是玩玩。' : '成績沒有送出去。'], [{ label: '好', value: true }]);
  },
  // 佈告欄：今天的委託（某位居民想要幾個某種東西）
  async board() {
    const { hud, data } = this.ctx, W = this.world, q = W.farm.quest;
    const which = await hud.card('佈告欄', ['上面貼著今天的委託，旁邊是「修復小鎮」的募集清單。'], [{ label: '修復小鎮', value: 'restore', ghost: true }, { label: '今天的委託', value: 'quest' }]);
    if (which === 'restore') return openPanel(this.ctx, 'restore'); if (which !== 'quest') return;
    if (!q || q.day !== W.farm.day) return hud.card('佈告欄', ['今天沒有委託。'], [{ label: '好', value: null }]);
    const npc = data.npcs[q.npc], it = data.items[q.item], have = W.self.inv.filter((s) => s && s.id === q.item).reduce((n, s) => n + s.n, 0);
    if (q.done) return hud.card('佈告欄', [`今天的委託已經完成了（${q.done === W.me.id ? '你' : '對方'}交的）。明天再來看看。`], [{ label: '好', value: null }]);
    const go = await hud.card('今天的委託', [`${npc.name}：「我需要 ${it.name} ${q.n} 個，可以幫我找嗎？」`, `報酬 ${q.reward} 元，${npc.name}也會更喜歡你。你身上有 ${have} 個。`], [{ label: '先不要', value: false, ghost: true }, ...(have >= q.n ? [{ label: '交給他', value: true }] : [])]);
    if (!go) return; const r = await this.room.req({ t: 'quest-done' });
    hud.toast(r.t === 'ok' ? `完成委託！拿到 ${r.reward} 元` : '交不出去', 1600);
  },
  // 信箱：居民寄來的信，有些附了東西
  async mail() {
    const { hud, data } = this.ctx, W = this.world, list = (W.self.mail || []).filter((m) => !m.got);
    if (!list.length) return hud.card('信箱', ['沒有新的信。'], [{ label: '好', value: null }]);
    const m = list[0], from = data.npcs[m.from] ? data.npcs[m.from].name : '小鎮', gift = m.item ? `（附了 ${data.items[m.item[0]].name}×${m.item[1]}）` : '';
    const ok = await hud.card(`${from}寄來的信`, [m.text, gift, list.length > 1 ? `還有 ${list.length - 1} 封沒看。` : ''].filter(Boolean), [{ label: m.item ? '收下' : '看完了', value: true }]);
    if (ok) { const r = await this.room.req({ t: 'mail-open', mid: m.id }); if (r.t === 'no') hud.toast(r.reason === 'full' ? '背包滿了，信先放著' : '打不開', 1300); else if (list.length > 1) this.mail(); }
  },
  // 現在在小鎮上的居民和他們的位置（照行程用時間算）
  folks() {
    const W = this.world, npcs = this.ctx.data.npcs; if (this.mapId !== 'town' || !W.farm) return [];
    const min = W.minute(), walk = this.bal.friend.walkMinutes;
    return Object.entries(npcs).filter(([, n]) => n.full).map(([id, n]) => ({ id, n, ...npcPos(n, min, walk) }));
  },
  // 跟居民說話：每天第一次聊天加好感；可以把手上的東西送給他（一天一次、一週兩次）
  async talk(folk) {
    const { hud, data } = this.ctx, W = this.world, n = folk.n, F = this.bal.friend, pl = this.player;
    if (Math.hypot(folk.x - pl.x, folk.y - pl.y) > this.bal.reach + 1) return hud.toast('走近一點再說話', 900);
    const face = (expr) => iconEl(`${n.portrait}/${expr}`, 96) || iconEl(`${n.portrait}/normal`, 96);
    const r = await this.room.req({ t: 'talk', npc: folk.id }); if (r.t !== 'ok') return hud.toast('他好像沒聽到', 900);
    const fr = W.self.friend[folk.id] || { pts: 0 }, h = Math.floor(fr.pts / F.heart);
    // 好感夠了、還沒看過的劇情：先演那一段
    const evId = Object.keys(data.events).find((k) => data.events[k].npc === folk.id && h >= data.events[k].hearts && !(W.self.events || {})[k]);
    if (evId) { const picks = await runEvent(this.ctx, data.events[evId]); const d = await this.room.req({ t: 'event-done', event: evId, picks }); if (d.t === 'ok' && d.gain) hud.toast(`${n.name} 更喜歡你了 ♥`, 1600); return; }
    const wet = ['rain', 'storm'].includes(W.farm.weather);
    const pool = [...n.talk.any, ...(wet ? n.talk.rain : []), ...(h >= 3 ? n.talk.h3 : []), ...(h >= 6 ? n.talk.h6 : [])];
    const text = r.first ? n.talk.first : r.bday && r.daily ? n.talk.birthday : pool[(W.farm.day * 7 + folk.id.length * 3 + (this.talkN = (this.talkN || 0) + 1)) % pool.length];
    const held = W.self.inv[hud.selected], it = held && data.items[held.id], canGift = it && it.kind !== 'tool';
    const sub = `${n.job}・${'♥'.repeat(h)}${'♡'.repeat(Math.max(0, 10 - h))}`;
    const pick = await hud.dialog({ portrait: face(r.bday ? 'happy' : 'normal'), name: n.name, sub, text, buttons: [...(canGift ? [{ label: `送他 ${it.name}`, value: 'gift', ghost: true }] : []), { label: '再見', value: null }] });
    if (pick !== 'gift') return;
    const g = await this.room.req({ t: 'gift', npc: folk.id, slot: hud.selected });
    if (g.t !== 'ok') return hud.dialog({ portrait: face('normal'), name: n.name, sub, text: g.reason === 'giftday' ? '今天已經收過你的禮物了，明天再說吧。' : g.reason === 'giftweek' ? '這個星期收你太多東西了，不好意思再收啦。' : '……？' });
    const line = g.taste === 'love' ? n.talk.gift_love : g.taste === 'like' ? n.talk.gift_like : g.taste === 'dislike' ? n.talk.gift_dislike : '謝謝你，我收下了。';
    await hud.dialog({ portrait: face(g.taste === 'love' || g.taste === 'like' ? 'happy' : g.taste === 'dislike' ? 'sad' : 'normal'), name: n.name, sub: `${n.job}・${'♥'.repeat(Math.floor(g.pts / F.heart))}`, text: (g.bday ? n.talk.birthday + ' ' : '') + line });
  },
  // 現在這張地圖上的家畜和寵物在哪裡（位置是用時間算的，兩個人算出來一樣）
  beasts() {
    const W = this.world, f = W.farm, A = this.ctx.data.animals, pens = this.map.pens; if (!f || !pens || this.mapId !== 'farm') return [];
    const now = W.abs(), out = [];
    for (const an of f.animals || []) { const d = A.livestock[an.kind]; out.push({ an, d, baby: f.day - an.born < d.growDays, ...animalPos(pens[d.home], an.id, now) }); }
    for (const an of f.pets || []) out.push({ an, d: A.pets[an.kind], pet: true, ...animalPos(pens.pet, an.id, now) });
    return out;
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
    const { ctx } = this, W = this.world, p = this.player, hud = ctx.hud, a = hud.typing || hud.hasCard || !W.ready || this.fishing.state === 'game' ? { x: 0, y: 0 } : ctx.input.axis(), sp = this.bal.walkSpeed * dt * (W.buff('speed') ? this.bal.buffs.speed : 1);
    this.fishing.update(dt); if ((a.x || a.y) && this.fishing.active) this.fishing.cancel(); // 一走動就收竿
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
    // 礦坑裡碰到怪物會痛：隔一小段時間才會再痛一次
    if (this.map.mine && W.mine && W.ready && now > (this.hurtAt || 0)) {
      const t = W.serverNow(), hit = W.mine.mons.find((m) => { const q = monPos(m, t); return Math.hypot(q.x - p.x, q.y - p.y) < 0.7; });
      if (hit) { this.hurtAt = now + this.bal.mine.hurtEveryMs; this.flash = 0.35; this.room.req({ t: 'hurt', mid: hit.id }); }
    }
    if (this.flash > 0) this.flash -= dt;
    if (this.hunt) { // 尋蛋進行中：走到彩蛋旁邊就撿起來，時間到結算
      const h = this.hunt; h.left -= dt;
      for (const e of h.eggs) if (!e.got && Math.hypot(e.x + 0.5 - p.x, e.y + 0.5 - p.y) < 0.8) { e.got = true; h.score++; W.floaters.push({ map: this.mapId, x: e.x + 0.5, y: e.y, heart: true, life: 0.9 }); }
      h.timer.textContent = `${h.fe.d.name}　${Math.max(0, Math.ceil(h.left))} 秒　${h.score}／${h.eggs.length} 顆`;
      if (h.left <= 0 || h.score >= h.eggs.length || this.mapId !== h.fe.d.map) this.endHunt();
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
    for (const o of W.objs.values()) if (o.map === mapId && o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1) list.push({ y: o.y + 0.92, o, t: { def: o.item ? { ...data.objects[o.type], art: data.items[o.item].art, name: data.items[o.item].name } : o.kind ? { ...data.objects[o.type], art: data.machines[o.kind].art, name: data.machines[o.kind].name } : data.objects[o.type], fx: o.x + 0.5, fy: o.y + 0.92 } });
    for (const b of this.beasts()) list.push({ y: b.y, beast: b });
    const fe = this.fest();
    if (fe) { // 節慶：廣場上搭了舞台、掛了三角旗
      const st = fe.d.stage; list.push({ y: st.y + 0.95, t: { def: { name: fe.d.name + '舞台', shape: 'block', w: 2.6, h: 2.0, color: '#c98a3c', art: 'obj/stage' }, fx: st.x + 1, fy: st.y + 0.95 } });
      for (const [bx, by] of [[st.x - 4, st.y - 6], [st.x + 1, st.y - 7], [st.x + 6, st.y - 6]]) list.push({ y: by + 0.9, t: { def: { name: '旗', shape: 'blob', w: 2.2, h: 1.0, color: '#e5484d', art: 'obj/bunting' }, fx: bx, fy: by + 0.9 } });
    }
    if (this.hunt) for (const e of this.hunt.eggs) if (!e.got) list.push({ y: e.y + 0.8, egg: e });
    for (const n of this.folks()) list.push({ y: n.y, pp: { q: { id: 'npc:' + n.id, x: n.x, y: n.y, dir: n.dir, moving: n.moving, anim: performance.now() / 1000, look: n.n.look, name: n.n.name }, color: '#ccc' } });
    if (this.map.mine && W.mine) { // 礦坑：石頭、打開的樓梯、入口的梯子、怪物
      const s = W.mine, RT = this.bal.mine.rockTypes, MT = this.bal.mine.monsters, tnow = W.serverNow();
      g.fillStyle = '#3b2f22'; g.fillRect((s.spawn.x - 0.3) * T, (s.spawn.y + 1) * T, T * 1.6, T * 0.9); drawName(g, '梯子（出去／電梯）', (s.spawn.x + 0.5) * T, (s.spawn.y + 1.5) * T, T);
      if (s.stairs.open && !drawSprite(g, 'mine/stairs_down', (s.stairs.x + 0.5) * T, (s.stairs.y + 0.95) * T, T, T)) { g.fillStyle = '#2b2421'; g.beginPath(); g.ellipse((s.stairs.x + 0.5) * T, (s.stairs.y + 0.55) * T, T * 0.36, T * 0.26, 0, 0, 7); g.fill(); }
      for (const r of s.rocks) list.push({ y: r.y + 0.92, t: { def: { name: RT[r.type].name, shape: 'blob', w: r.type === 'stone' ? 0.85 : 1.0, h: r.type === 'stone' ? 0.75 : 0.95, color: '#a9a59c', art: RT[r.type].art }, fx: r.x + 0.5, fy: r.y + 0.95 } });
      for (const m of s.mons) { const q = monPos(m, tnow); list.push({ y: q.y, mon: { m, d: MT[m.type], ...q } }); }
    }
    const myFloor = W.mine ? W.mine.floor : 0;
    const people = [{ q: me, color: '#f0a04a' }, ...[...W.others.values()].filter((o) => o.map === mapId && (mapId !== 'mine' || o.floor === myFloor)).map((o) => ({ q: lerp(o), color: '#6aa8e8' }))];
    for (const pp of people) list.push({ y: pp.q.y, pp });
    list.sort((u, v) => u.y - v.y);
    const parts = data.parts, U = T * 0.62;
    for (const it of list) {
      if (it.crop) { this.drawCrop(g, it.crop, T); continue; }
      if (it.egg) { const ex = (it.egg.x + 0.5) * T, ey = (it.egg.y + 0.6) * T; g.fillStyle = `hsl(${it.egg.hue} 80% 70%)`; g.strokeStyle = '#5a3d22'; g.lineWidth = Math.max(1.5, T * 0.04); g.beginPath(); g.ellipse(ex, ey, T * 0.17, T * 0.22, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(ex - T * 0.15, ey - T * 0.03, T * 0.3, T * 0.05); continue; }
      if (it.mon) { // 怪物：被打到的那一下換成「被打」的表情
        const q = it.mon, sz = q.d.size * T, hit = q.m.hitAt && performance.now() - q.m.hitAt < 300, by = q.y * T - Math.abs(Math.sin(performance.now() / 260 + q.m.id)) * T * 0.08;
        drawShadow(g, q.x * T, q.y * T, sz * 0.7);
        if (!drawSprite(g, `${q.d.art}/${hit ? 'hit' : 'front'}`, q.x * T, by, sz, sz)) { g.fillStyle = hit ? '#fff' : '#7dbb5a'; g.strokeStyle = '#5a3d22'; g.lineWidth = Math.max(1.5, T * 0.04); g.beginPath(); g.arc(q.x * T, by - sz * 0.4, sz * 0.4, 0, 7); g.fill(); g.stroke(); }
        continue;
      }
      if (it.beast) { // 家畜、寵物：有圖用圖（側面，往左走就翻過來），小時候畫小一點；有產品可以收的頭上冒泡泡
        const b = it.beast, sz = b.d.size * (b.baby ? 0.6 : 1) * T, bx = b.x * T, by = b.y * T - (b.moving ? Math.abs(Math.sin(performance.now() / 130 + b.an.id)) * T * 0.04 : 0);
        drawShadow(g, bx, b.y * T, sz * 0.7);
        g.save(); g.translate(bx, by); if (b.flip) g.scale(-1, 1);
        if (!drawSprite(g, `${b.d.art}/${b.baby ? 'baby_side' : 'side'}`, 0, 0, sz, sz)) { g.fillStyle = b.an.color; g.strokeStyle = '#5a3d22'; g.lineWidth = Math.max(1.5, T * 0.04); g.beginPath(); g.ellipse(0, -sz * 0.3, sz * 0.38, sz * 0.28, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(sz * 0.3, -sz * 0.5, sz * 0.17, 0, 7); g.fill(); g.stroke(); }
        g.restore();
        if (b.an.ready) { drawBubble(g, ' ', bx, by - sz * 1.0, T, true); if (!drawSprite(g, data.items[b.d.product].art, bx, by - sz * 1.0 - T * 0.13, T * 0.45, T * 0.45)) drawName(g, '！', bx, by - sz - T * 0.3, T); }
        continue;
      }
      if (it.t) {
        const d = it.t.def; if (!(d.art && drawSprite(g, d.art.replace('{season}', season), it.t.fx * T, it.t.fy * T, d.w * T, d.h * T))) drawObject(g, d, it.t.fx * T, it.t.fy * T, T);
        if (it.t.def.use === 'mail' && (W.self.mail || []).some((m) => !m.got)) drawBubble(g, '✉', it.t.fx * T, it.t.fy * T - T * 1.2, T, true); // 信箱有新的信
        // 加工機：做好了頭上冒出成品，還在做就冒小點點
        if (it.o && it.o.kind && it.o.out) { if (W.abs() >= it.o.doneAt) { const oi = data.items[it.o.out]; drawBubble(g, ' ', it.t.fx * T, it.t.fy * T - T * 1.25, T, true); if (!drawSprite(g, oi.art, it.t.fx * T, it.t.fy * T - T * 1.38, T * 0.5, T * 0.5)) drawName(g, '好了', it.t.fx * T, it.t.fy * T - T * 1.6, T); } else drawName(g, '・'.repeat(1 + Math.floor(performance.now() / 500) % 3), it.t.fx * T, it.t.fy * T - T * 1.35, T); }
        continue;
      }
      const q = it.pp.q;
      if (!q.look) { drawPlayer(g, q, T, it.pp.color); continue; } // 對方還在建立角色：先畫暫代的圓圓人
      drawShadow(g, q.x * T, q.y * T, T * 0.62);
      drawDoll(g, q.look, parts, q.x * T, q.y * T, U, q.dir, q.action || (q.asleep ? 'sit' : q.moving ? 'walk' : 'idle'), q.action ? q.actionT : q.anim, q.tool);
      drawName(g, q.asleep ? q.name + ' Zzz' : q.name, q.x * T, q.y * T - U * 2.72, T);
    }
    // 浮標：自己的和對方的
    const bobs = []; if (this.fishing.bobber) bobs.push(this.fishing.bobber); for (const o of W.others.values()) if (o.map === mapId && o.fishing && !o.moving) bobs.push({ ...o.fishing, t: performance.now() / 1000 });
    for (const b of bobs) { const bx = (b.x + 0.5) * T, by = (b.y + 0.5) * T + Math.sin(b.t * (b.bite ? 22 : 3)) * T * (b.bite ? 0.08 : 0.03); g.fillStyle = '#fff'; g.strokeStyle = '#5a3d22'; g.lineWidth = Math.max(1.5, T * 0.04); g.beginPath(); g.arc(bx, by, T * 0.11, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#e5484d'; g.beginPath(); g.arc(bx, by, T * 0.11, Math.PI, 0); g.fill(); if (b.bite) drawBubble(g, '！', bx, by - T * 0.5, T, true); }
    for (const f of W.floaters) { if (f.map !== mapId) continue; g.globalAlpha = Math.min(1, f.life * 2); if (f.heart) { drawName(g, '♥', f.x * T, (f.y - (1.1 - f.life) * 0.9) * T, T * 1.6); g.globalAlpha = 1; continue; } const it = data.items[f.item]; if (!drawSprite(g, it.art, f.x * T, (f.y - (1.1 - f.life) * 0.9) * T, T * 0.6, T * 0.6)) drawName(g, it.name, f.x * T, (f.y - (1.1 - f.life) * 0.9) * T, T); g.globalAlpha = 1; }
    for (const pp of people) { const b = W.bubbles.get(pp.q.id); if (b) drawBubble(g, b.text, pp.q.x * T, pp.q.y * T - T * (pp.q.look ? 1.95 : 1.45), T, b.big); }
    if (this.flash > 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(230, 60, 60, ${this.flash})`; g.fillRect(0, 0, view.canvas.width, view.canvas.height); } // 被怪物打到：畫面紅一下
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
