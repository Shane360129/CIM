// 世界的狀態：伺服器說的每一件事都記在這裡（兩個人、格子、時間、泡泡）。不管現在在哪個畫面（遊戲、換衣服），這裡都一直在聽，
// 所以從衣櫃回到農場時，期間發生的事不會漏掉。畫面只管照這裡的資料畫。
import { createRoom } from '../net/room.js';
const key = (map, x, y) => `${map}:${x},${y}`;

export function createWorld(session, bal) {
  const room = createRoom(session.convId), handlers = {};
  const emit = (name, arg) => (handlers[name] || []).forEach((f) => f(arg));
  const other = (p) => ({ ...p, tx: p.x, ty: p.y, px: p.x, py: p.y, anim: 0, moving: !!(p.vx || p.vy) });
  const w = {
    room, ready: false, net: 'connecting', partner: null, farm: null,
    me: { id: session.me.id, name: session.me.displayName, look: null, x: 0, y: 0, px: 0, py: 0, dir: 'down', moving: false, anim: 0, asleep: false, action: null, actionT: 0 },
    others: new Map(), tiles: new Map(), objs: new Map(), bubbles: new Map(), mark: null, floaters: [], mine: null, clockOff: 0,
    // 伺服器的時鐘（毫秒）：怪物的位置用它算，兩個人和伺服器才會一樣
    serverNow() { return Date.now() + w.clockOff; },
    self: { inv: [], energy: 0, energyMax: 100, skills: {} },
    on(name, fn) { (handlers[name] ||= []).push(fn); return () => { handlers[name] = handlers[name].filter((f) => f !== fn); }; },
    setTiles(list) { for (const t of list) { if (t.t) w.tiles.set(key(t.map, t.x, t.y), t); else w.tiles.delete(key(t.map, t.x, t.y)); } },
    setObjs(list) { for (const o of list) { if (o.type) w.objs.set(key(o.map, o.x, o.y), o); else w.objs.delete(key(o.map, o.x, o.y)); } w.objsVersion = (w.objsVersion || 0) + 1; },
    tile(map, x, y) { return w.tiles.get(key(map, x, y)); }, obj(map, x, y) { return w.objs.get(key(map, x, y)); },
    // 現在幾點：伺服器每 10 秒說一次，中間自己照速度往前推
    // 絕對時間（遊戲分鐘）：加工機什麼時候好、料理效果什麼時候結束都用它比
    abs() { const f = w.farm; return f ? (f.day - 1) * (f.dayEnd - f.dayStart) + (w.minute() - f.dayStart) : 0; },
    buff(k) { return ((w.self.buffs || {})[k] || 0) > w.abs(); },
    minute() { const f = w.farm; return f ? Math.min(f.dayEnd, f.minute + (w.ready ? (performance.now() - f.at) / 1000 * f.minutesPerSecond : 0)) : 0; },
    setLook(look, name) { w.me.look = look; if (name) w.me.name = name; room.send({ t: 'look', look, name }); },
    who(id) { return id === w.me.id ? w.me : w.others.get(id); },
  };
  room.on('status', (s) => { w.net = s; if (s !== 'online') w.ready = false; emit('status', s); });
  room.on('snapshot', (m) => {
    // 第一次連上、或斷線重連：全部照伺服器的重來
    Object.assign(w.me, { map: m.you.map, x: m.you.x, y: m.you.y, px: m.you.x, py: m.you.y, dir: m.you.dir, asleep: false, look: m.you.look, name: m.you.name });
    w.self = m.self; w.objs.clear(); w.setObjs(m.objs); if (m.farm.now) w.clockOff = m.farm.now - Date.now(); w.mine = null;
    w.partner = m.partner; w.others.clear(); for (const o of m.players) w.others.set(o.id, other(o));
    w.tiles.clear(); w.setTiles(m.tiles); w.farm = { ...m.farm, at: performance.now() }; w.ready = true;
    emit('snapshot', m);
  });
  room.on('join', (m) => { w.others.set(m.p.id, other(m.p)); emit('toast', `${m.p.name} 來了`); });
  room.on('leave', (m) => { const o = w.others.get(m.id); if (o) emit('toast', `${o.name} 離開了`); w.others.delete(m.id); w.bubbles.delete(m.id); });
  room.on('move', (m) => { const o = w.others.get(m.id); if (!o) return; if (o.map !== m.map) { o.map = m.map; o.x = m.x; o.y = m.y; } Object.assign(o, { tx: m.x, ty: m.y, vx: m.vx, vy: m.vy, dir: m.dir }); if (Math.hypot(o.x - m.x, o.y - m.y) > 4) { o.x = m.x; o.y = m.y; } });
  room.on('tiles', (m) => { w.setTiles(m.list); emit('tiles', m); });
  room.on('objs', (m) => { w.setObjs(m.list); emit('objs', m); });
  room.on('self', (m) => { if (w.farm) { const cx = (w.farm.codex ||= {}); for (const it of m.inv) if (it && !cx[it.id]) cx[it.id] = w.farm.day; } w.self = { inv: m.inv, energy: m.energy, energyMax: m.energyMax, skills: m.skills, fishRec: m.fishRec || {}, buffs: m.buffs || {}, hp: m.hp, hpMax: m.hpMax, friend: m.friend || {}, toolLv: m.toolLv || {}, mail: m.mail || [], events: m.events || {}, fest: m.fest || {} }; emit('self', m); });
  room.on('farm', (m) => { if (w.farm) Object.assign(w.farm, { money: m.money, ship: m.ship, chest: m.chest, quest: m.quest, restore: m.restore || w.farm.restore, houseLv: m.houseLv || w.farm.houseLv, land: m.land || w.farm.land }); emit('farm', m); });
  room.on('animals', (m) => { if (w.farm) Object.assign(w.farm, { animals: m.animals, pets: m.pets, graze: m.graze, money: m.money }); emit('farm', m); });
  room.on('mine', (m) => { w.mine = m.state; if (w.farm) w.farm.mineDeepest = m.deepest; emit('map', 'mine'); });
  room.on('mine-upd', (m) => {
    const s = w.mine; if (!s || s.floor !== m.floor) return;
    if (m.rock) { if (m.rock.hp <= 0) s.rocks = s.rocks.filter((r) => !(r.x === m.rock.x && r.y === m.rock.y)); else { const r = s.rocks.find((r) => r.x === m.rock.x && r.y === m.rock.y); if (r) r.hp = m.rock.hp; } }
    if (m.stairs) s.stairs = m.stairs;
    if (m.mon) { if (m.mon.hp <= 0) s.mons = s.mons.filter((x) => x.id !== m.mon.id); else { const x = s.mons.find((x) => x.id === m.mon.id); if (x) { x.hp = m.mon.hp; x.hitAt = performance.now(); } } }
    emit('mine-upd', m);
  });
  room.on('restored', (m) => emit('restored', m));
  room.on('notes', (m) => { if (w.farm) w.farm.notes = m.notes; emit('farm', m); });
  room.on('given', (m) => emit('given', m));
  room.on('built', (m) => { if (w.farm) Object.assign(w.farm, { houseLv: m.houseLv, land: m.land }); emit('built', m); });
  room.on('fest', (m) => { const who = w.who(m.id); if (who && m.id !== w.me.id) emit('toast', `${who.name} 在節慶活動拿到 ${m.score} 分！`); });
  room.on('warp', (m) => {
    const who = w.who(m.id); if (!who) return;
    Object.assign(who, { map: m.map, floor: m.floor || 0, x: m.x, y: m.y, px: m.x, py: m.y, tx: m.x, ty: m.y, vx: 0, vy: 0, dir: m.dir, asleep: false, fishing: null });
    if (m.id === w.me.id && m.map !== 'mine') w.mine = null;
    if (m.id === w.me.id && m.faint) emit('faint');
    if (m.id === w.me.id) emit('map', m.map);
  });
  // 有人做了動作：播他的動作（揮工具、澆水），收成的時候頭上冒出收到的東西
  room.on('fx', (m) => {
    const who = w.who(m.id); if (!who) return;
    who.action = m.kind === 'water' ? 'water' : m.kind === 'cast' ? 'cast' : m.kind === 'pick' || m.kind === 'sword' ? 'swing' : m.kind === 'eat' || m.kind === 'cook' ? 'eat' : m.kind === 'harvest' || m.kind === 'plant' || m.kind === 'fertilize' ? 'eat' : 'swing'; who.actionT = 0; who.tool = m.kind;
    if (m.kind === 'push' && m.id !== w.me.id && m.map === w.me.map) emit('toast', `${who.name} 在搬大傢伙，快過去一起動手！`);
    if (m.id !== w.me.id && m.map === w.me.map) w.mark = { x: m.x, y: m.y, life: 0.6, color: '#ffd76a' };
    who.fishing = m.kind === 'cast' ? { x: m.x, y: m.y } : null; // 對方在釣魚：看得到他的浮標
    if (m.kind === 'harvest' || m.kind === 'cook') w.floaters.push({ map: m.map, x: m.x + 0.5, y: m.y, item: m.item, q: m.q, life: 1.1 });
  });
  room.on('no', (m) => { if (m.tile) w.setTiles([m.tile]); if (m.obj) w.setObjs([m.obj]); });
  room.on('look', (m) => { const who = w.who(m.id); if (who) { who.look = m.look; who.name = m.name; } });
  room.on('bubble', (m) => w.bubbles.set(m.id, { text: m.text, life: bal.bubbleSeconds }));
  room.on('emote', (m) => { w.bubbles.set(m.id, { text: m.e, life: 2.5, big: true }); const who = w.who(m.id); if (who && m.e === '😊') { who.action = 'happy'; who.actionT = 0; } });
  room.on('time', (m) => { if (w.farm) Object.assign(w.farm, { day: m.day, minute: m.minute, at: performance.now() }); });
  room.on('sleep', (m) => { const who = w.who(m.id); if (who) who.asleep = m.on; });
  room.on('newday', (m) => {
    w.farm = { ...m.farm, at: performance.now() }; w.tiles.clear(); w.setTiles(m.tiles); w.self = m.self; if (m.objs) { w.objs.clear(); w.setObjs(m.objs); }
    const moved = w.me.map !== m.you.map;
    Object.assign(w.me, { asleep: false, map: m.you.map }); if (moved || m.reason === 'restore') Object.assign(w.me, { x: m.you.x, y: m.you.y, px: m.you.x, py: m.you.y });
    for (const p of m.players) { const o = w.others.get(p.id); if (o) Object.assign(o, { asleep: false, map: p.map, x: p.x, y: p.y, tx: p.x, ty: p.y, px: p.x, py: p.y, vx: 0, vy: 0 }); }
    if (moved) emit('map', w.me.map);
    emit('newday', m);
  });
  room.connect();
  return w;
}
