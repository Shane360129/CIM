// 伺服器和畫面共用的規則（純計算，不碰畫面也不碰資料庫）。兩邊用同一份，算出來才會一樣。
export const groundAt = (map, x, y) => { let t = map.ground || 'grass'; for (const p of map.patches || []) if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) t = p.locked ? 'locked' : p.type; return t; };
export const seasonIndex = (day, bal) => Math.floor((day - 1) / bal.seasonDays) % 4;
export const seasonId = (day, bal) => bal.seasonIds[seasonIndex(day, bal)];
// 確定性亂數：同一個種子算出來的結果永遠一樣（天氣、之後的礦坑地形都靠它，兩個人看到的才會相同）
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function weatherOf(seed, day, bal) {
  if (day === 1) return 'sun'; // 第一天一定是晴天
  const table = bal.weather[seasonId(day, bal)], r = rng(seed * 31 + day * 7919)(); let acc = 0;
  for (const [k, p] of Object.entries(table)) { acc += p; if (r < acc) return k; }
  return 'sun';
}
export const isWet = (w) => w === 'rain' || w === 'storm';
// 作物長到第幾階段：0 剛種下 … 4 成熟。g 是已經長了幾天（有澆水的那幾天才算）
export function cropStage(def, g) { let acc = 0; for (let i = 0; i < def.stageDays.length; i++) { acc += def.stageDays[i]; if (g < acc) return i; } return 4; }
export const cropTotal = (def) => def.stageDays.reduce((a, b) => a + b, 0);
// 技能等級：每一級需要的經驗比上一級多一點
export function levelOf(xp, bal) { const [base, grow] = bal.xpPerLevel; let lv = 1, need = base; while (xp >= need && lv < 100) { xp -= need; lv++; need = Math.round(need * grow); } return { lv, into: xp, need }; }
// 收成的品質：肥料和農耕等級讓好品質的機會變高。回傳 0 普通 … 4 傳說
export function rollQuality(rand, fert, level, bal) {
  const q = bal.quality;
  for (let i = 3; i >= 0; i--) if (rand() < q.base[i] + q.perFert[i] * (fert || 0) + q.perLevel[i] * (level - 1)) return i + 1;
  return 0;
}
// 背包：放得下就放進去（同一種、同品質的疊在一起，一格最多 99 個），放不下回傳 false、什麼都不動
export function invAdd(inv, slots, id, n = 1, q = 0, max = 99) {
  const plan = []; let left = n;
  for (let i = 0; i < slots && left > 0; i++) { const s = inv[i]; if (s && s.id === id && (s.q || 0) === q && s.n < max) { const k = Math.min(left, max - s.n); plan.push([i, k]); left -= k; } }
  for (let i = 0; i < slots && left > 0; i++) if (!inv[i]) { const k = Math.min(left, max); plan.push([i, k, true]); left -= k; }
  if (left > 0) return false;
  for (const [i, k, fresh] of plan) { if (fresh) inv[i] = { id, n: k, ...(q ? { q } : {}) }; else inv[i].n += k; }
  return true;
}
export function invTake(inv, slot, n = 1) { const s = inv[slot]; if (!s || s.n < n) return false; s.n -= n; if (s.n <= 0) inv[slot] = null; return true; }
export const sellPrice = (item, q, bal) => Math.round((item.sell || 0) * bal.quality.mult[q || 0]);

// 物品查詢：一般物品直接查表；加工品是「機器＋原料」拼出來的（id 長得像 g:jam:strawberry），名字、價錢、圖示在這裡算出來，所以不用一種一種寫
// 一間店這一季賣什麼：種子照季節（seeds 是 "season" 表示這一季所有的種子，或是每一季各自的清單），後面接一年到頭都賣的東西
export function shopItems(shop, season, crops) {
  const seeds = shop.seeds === 'season' ? Object.keys(crops).filter((id) => crops[id].seasons.includes(season)).map((id) => 'seed_' + id) : (shop.seeds && shop.seeds[season]) || [];
  return [...seeds, ...shop.items];
}
export function makeItems(items, machines) {
  const cache = new Map();
  return new Proxy(items, { get(t, id) {
    if (typeof id !== 'string' || !id.startsWith('g:')) return t[id];
    if (cache.has(id)) return cache.get(id);
    const [, mid, src] = id.split(':'), m = machines[mid], s = t[src];
    const it = m && s && m.out ? { name: m.out.replace('{src}', s.name), kind: 'good', machine: mid, src, sell: Math.round((s.sell || 0) * m.mult + m.add), art: m.good, tint: src, tags: ['good'] } : undefined;
    cache.set(id, it); return it;
  } });
}
// 這個東西算不算某一種材料：物品 id、@類別（tags）、g:機器（那台機器做的加工品）
export function matches(items, id, spec) {
  const it = items[id]; if (!it) return false;
  if (spec === '@crop') return it.kind === 'crop';
  if (spec.startsWith('@')) return (it.tags || []).includes(spec.slice(1));
  if (spec.startsWith('g:') && spec.split(':').length === 2) return id.startsWith(spec + ':');
  return id === spec;
}
// 背包裡夠不夠做這個（回傳要從哪幾格各拿幾個；不夠回傳 null）。品質好的留到最後才用
export function planTake(items, inv, need) {
  const plan = [], left = inv.map((s) => (s ? s.n : 0));
  for (const [spec, n] of Object.entries(need)) {
    let want = n; const idx = inv.map((s, i) => i).filter((i) => inv[i] && matches(items, inv[i].id, spec)).sort((a, b) => (inv[a].q || 0) - (inv[b].q || 0));
    for (const i of idx) { const k = Math.min(want, left[i]); if (k > 0) { plan.push([i, k]); left[i] -= k; want -= k; } if (!want) break; }
    if (want > 0) return null;
  }
  return plan;
}
// 現在的絕對時間（遊戲分鐘）：加工機、料理效果用它記什麼時候好、什麼時候結束
export const absMinute = (day, minute, bal) => (day - 1) * (bal.dayEndMinute - bal.dayStartMinute) + (minute - bal.dayStartMinute);

// 動物現在在哪裡：在自己的圍欄裡慢慢走來走去。位置只用「牠的編號＋現在的時間」算，所以兩個人看到的一樣，伺服器不用一直同步
export function animalPos(pen, id, absMin) {
  const step = 40, k = Math.floor(absMin / step), f = (absMin / step) - k, at = (n) => { const r = rng(id * 7919 + n * 104729); return { x: pen.x + 0.5 + r() * (pen.w - 1), y: pen.y + 0.5 + r() * (pen.h - 1) }; };
  const a = at(k), b = at(k + 1), t = Math.min(1, f * 2.2); // 每一段時間前半在走、後半停著
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, moving: t < 1, flip: b.x < a.x };
}
export const hearts = (love, bal) => Math.floor(Math.max(0, love) / bal.animals.heart);

// 礦坑的一層：石頭在哪、各是什麼、樓梯藏在哪顆石頭下面、有哪些怪物。只用「農場的種子＋第幾層＋第幾天」算，
// 所以兩個人進同一層看到的一模一樣；隔天會重新長出來
export function genFloor(seed, floor, day, bal) {
  const M = bal.mine, r = rng(seed * 13 + floor * 7919 + day * 104729), W = M.w, H = M.h, used = new Set(), rocks = [];
  const spawn = { x: Math.floor(W / 2), y: H - 2 }, free = (x, y) => !used.has(x + ',' + y) && Math.hypot(x - spawn.x, y - spawn.y) > 2.2;
  const types = Object.entries(M.rockTypes).filter(([, t]) => floor >= t.from).map(([id, t]) => [id, Math.max(1, t.weight + t.perFloor * floor)]), total = types.reduce((a, [, w]) => a + w, 0);
  const n = M.rocks[0] + Math.floor(r() * (M.rocks[1] - M.rocks[0]));
  for (let i = 0, tries = 0; i < n && tries < 600; tries++) {
    const x = 1 + Math.floor(r() * (W - 2)), y = 1 + Math.floor(r() * (H - 3)); if (!free(x, y)) continue;
    let k = r() * total, type = types[0][0]; for (const [id, w] of types) { k -= w; if (k <= 0) { type = id; break; } }
    used.add(x + ',' + y); rocks.push({ x, y, type, hp: M.rockTypes[type].hp }); i++;
  }
  const stairs = rocks[Math.floor(r() * rocks.length)], mons = [];
  const kinds = Object.entries(M.monsters).filter(([, m]) => floor >= m.from).map(([id]) => id), count = M.monsterCount[0] + Math.floor(r() * Math.min(M.monsterCount[1] - M.monsterCount[0] + 1, 1 + floor / 4));
  for (let i = 0, tries = 0; i < count && tries < 200; tries++) { const x = 1 + Math.floor(r() * (W - 2)), y = 1 + Math.floor(r() * (H - 4)); if (!free(x, y)) continue; const type = kinds[Math.floor(r() * kinds.length)]; mons.push({ id: i + 1, type, hp: M.monsters[type].hp, x: x + 0.5, y: y + 0.5 }); i++; }
  return { floor, w: W, h: H, spawn, rocks, stairs: { x: stairs.x, y: stairs.y, open: false }, mons };
}
// 怪物現在在哪：繞著牠的家慢慢晃（跟動物一樣用時間算，兩個人看到的一樣）
export function monPos(m, absMs) { const t = absMs / 1000, k = m.id * 1.7; return { x: m.x + Math.sin(t * 0.7 + k) * 1.3, y: m.y + Math.cos(t * 0.5 + k * 2) * 0.9 }; }
// 礦坑那一層當成一張地圖（給走路、畫面用）
export const mineMap = (bal, floor) => ({ name: `礦坑第 ${floor} 層`, w: bal.mine.w, h: bal.mine.h, ground: 'cave', outdoor: false, patches: [], objects: [], exits: [], mine: true });

// 居民現在在哪：照每日行程（[幾點起, x, y]…），到了時間就花一小段時間走過去。只用時間算，兩個人看到的一樣
export function npcPos(npc, minute, walk = 40) {
  const sch = npc.schedule; let i = 0; for (let k = 0; k < sch.length; k++) if (minute >= sch[k][0]) i = k;
  const cur = sch[i], prev = sch[i > 0 ? i - 1 : sch.length - 1], t = Math.min(1, Math.max(0, (minute - cur[0]) / walk));
  if (minute < sch[0][0]) return { x: prev[1], y: prev[2], moving: false, dir: 'down' };
  const face = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
  if (t < 1) return { x: prev[1] + (cur[1] - prev[1]) * t, y: prev[2] + (cur[2] - prev[2]) * t, moving: true, dir: face(cur[1] - prev[1], cur[2] - prev[2]) };
  // 到了：做這一段行程的事（行程第四個欄位）。全部用時間算，伺服器和兩個玩家看到的一樣
  const act = cur[3] || 'wander', since = minute - cur[0] - walk;
  let h = 0; for (const ch of npc.name) h = (h * 31 + ch.codePointAt(0)) % 9973;
  if (act === 'farm') { // 在菜園：每 25 分鐘換一格，走過去（5 分鐘）→ 翻土或澆水
    const slot = Math.floor(since / 25), ph = since % 25, col = slot % 4, from = slot > 0 ? (slot - 1) % 4 : col;
    if (ph < 5 && from !== col) { const k = ph / 5; return { x: cur[1] + from + (col - from) * k, y: cur[2], moving: true, dir: col > from ? 'right' : 'left' }; }
    return { x: cur[1] + col, y: cur[2], moving: false, dir: 'up', action: slot % 2 ? 'water' : 'swing', tool: slot % 2 ? 'water' : 'hoe' };
  }
  if (act === 'sit') return { x: cur[1], y: cur[2], moving: false, dir: 'down', action: 'sit' };
  if (act === 'eat') return { x: cur[1], y: cur[2], moving: false, dir: 'down', action: Math.floor(since / 20) % 2 ? 'eat' : null };
  if (act === 'stay') return { x: cur[1], y: cur[2], moving: false, dir: 'down' };
  // 沒有特別的事：在附近晃。每 30 分鐘換一個點（離定點不到一格），走過去 6 分鐘，然後站著東看西看
  const spot = (n) => { const r = rng(h * 131 + i * 17 + n * 7919); return [cur[1] + (r() - 0.5) * 1.7, cur[2] + (r() - 0.5) * 1.1, r()]; };
  const slot = Math.floor(since / 30), ph = since % 30, a = slot > 0 ? spot(slot - 1) : [cur[1], cur[2], 0], b = spot(slot);
  if (ph < 6) { const k = ph / 6; return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, moving: true, dir: face(b[0] - a[0], b[1] - a[1]) }; }
  return { x: b[0], y: b[1], moving: false, dir: ['down', 'left', 'right', 'down'][Math.floor(b[2] * 4)] };
}
// 送這個東西給他，他的反應：love 最喜歡、like 喜歡、dislike 討厭、neutral 普通
export function giftTaste(items, npc, id) { for (const k of ['loves', 'likes', 'dislikes']) if ((npc[k] || []).some((spec) => matches(items, id, spec))) return k === 'loves' ? 'love' : k === 'likes' ? 'like' : 'dislike'; return 'neutral'; }
