// 世界的狀態：伺服器說的每一件事都記在這裡（兩個人、格子、時間、泡泡）。不管現在在哪個畫面（遊戲、換衣服），這裡都一直在聽，
// 所以從衣櫃回到農場時，期間發生的事不會漏掉。畫面只管照這裡的資料畫。
import { createRoom } from '../net/room.js';
const key = (x, y) => x + ',' + y;

export function createWorld(session, bal) {
  const room = createRoom(session.convId), handlers = {};
  const emit = (name, arg) => (handlers[name] || []).forEach((f) => f(arg));
  const other = (p) => ({ ...p, tx: p.x, ty: p.y, px: p.x, py: p.y, anim: 0, moving: !!(p.vx || p.vy) });
  const w = {
    room, ready: false, net: 'connecting', partner: null, farm: null,
    me: { id: session.me.id, name: session.me.displayName, look: null, x: 0, y: 0, px: 0, py: 0, dir: 'down', moving: false, anim: 0, asleep: false, action: null, actionT: 0 },
    others: new Map(), tiles: new Map(), bubbles: new Map(), mark: null,
    on(name, fn) { (handlers[name] ||= []).push(fn); return () => { handlers[name] = handlers[name].filter((f) => f !== fn); }; },
    setTiles(list) { for (const t of list) { if (t.t) w.tiles.set(key(t.x, t.y), t); else w.tiles.delete(key(t.x, t.y)); } },
    // 現在幾點：伺服器每 10 秒說一次，中間自己照速度往前推
    minute() { const f = w.farm; return f ? Math.min(f.dayEnd, f.minute + (w.ready ? (performance.now() - f.at) / 1000 * f.minutesPerSecond : 0)) : 0; },
    setLook(look, name) { w.me.look = look; if (name) w.me.name = name; room.send({ t: 'look', look, name }); },
    who(id) { return id === w.me.id ? w.me : w.others.get(id); },
  };
  room.on('status', (s) => { w.net = s; if (s !== 'online') w.ready = false; emit('status', s); });
  room.on('snapshot', (m) => {
    // 第一次連上、或斷線重連：全部照伺服器的重來
    Object.assign(w.me, { x: m.you.x, y: m.you.y, px: m.you.x, py: m.you.y, dir: m.you.dir, asleep: false, look: m.you.look, name: m.you.name });
    w.partner = m.partner; w.others.clear(); for (const o of m.players) w.others.set(o.id, other(o));
    w.tiles.clear(); w.setTiles(m.tiles); w.farm = { ...m.farm, at: performance.now() }; w.ready = true;
    emit('snapshot', m);
  });
  room.on('join', (m) => { w.others.set(m.p.id, other(m.p)); emit('toast', `${m.p.name} 來了`); });
  room.on('leave', (m) => { const o = w.others.get(m.id); if (o) emit('toast', `${o.name} 離開了`); w.others.delete(m.id); w.bubbles.delete(m.id); });
  room.on('move', (m) => { const o = w.others.get(m.id); if (!o) return; Object.assign(o, { tx: m.x, ty: m.y, vx: m.vx, vy: m.vy, dir: m.dir }); if (Math.hypot(o.x - m.x, o.y - m.y) > 4) { o.x = m.x; o.y = m.y; } });
  room.on('tiles', (m) => {
    w.setTiles(m.list);
    const who = w.who(m.by); if (who) { who.action = m.kind === 'water' ? 'water' : 'swing'; who.actionT = 0; who.tool = m.kind; } // 對方看得到你在揮鋤頭、澆水
    if (m.by !== w.me.id && m.list[0]) w.mark = { x: m.list[0].x, y: m.list[0].y, life: 0.6, color: '#ffd76a' };
  });
  room.on('no', (m) => { if (m.tile) w.setTiles([m.tile]); });
  room.on('look', (m) => { const who = w.who(m.id); if (who) { who.look = m.look; who.name = m.name; } });
  room.on('bubble', (m) => w.bubbles.set(m.id, { text: m.text, life: bal.bubbleSeconds }));
  room.on('emote', (m) => { w.bubbles.set(m.id, { text: m.e, life: 2.5, big: true }); const who = w.who(m.id); if (who && m.e === '😊') { who.action = 'happy'; who.actionT = 0; } });
  room.on('time', (m) => { if (w.farm) Object.assign(w.farm, { day: m.day, minute: m.minute, at: performance.now() }); });
  room.on('sleep', (m) => { const who = w.who(m.id); if (who) who.asleep = m.on; });
  room.on('newday', (m) => {
    w.farm = { ...m.farm, at: performance.now() }; w.tiles.clear(); w.setTiles(m.tiles);
    w.me.asleep = false; for (const o of w.others.values()) o.asleep = false;
    emit('newday', m);
  });
  room.connect();
  return w;
}
