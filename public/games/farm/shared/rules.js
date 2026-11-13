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
// ---- 居民找路：地圖上哪些格子走得到（建築、家具、樹、水都擋路），兩點之間沿著走得到的格子走 ----
export function walkGrid(map, objects) {
  const w = map.w, h = map.h, b = new Uint8Array(w * h), cache = new Map();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (groundAt(map, x, y) === 'water') b[y * w + x] = 1; // 水上鋪了路（碼頭、木橋）的地方走得過去
  for (const o of map.objects) { const d = objects[o.type]; if (!d || !d.solid) continue; const [tw, th] = d.tiles || [1, 1]; for (let x = 0; x < tw; x++) for (let y = 0; y < th; y++) { const X = o.x + x, Y = o.y - y; if (X >= 0 && Y >= 0 && X < w && Y < h) b[Y * w + X] = 1; } }
  return { w, h, b, cache };
}
const free = (G, x, y) => x >= 0 && y >= 0 && x < G.w && y < G.h && !G.b[y * G.w + x];
// 最近的走得到的格子（站的位置剛好在建築上時，挪到旁邊）
export function snapFree(G, x, y) {
  const tx = Math.floor(x), ty = Math.floor(y); if (free(G, tx, ty)) return [x, y];
  for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && free(G, tx + dx, ty + dy)) return [tx + dx + 0.5, ty + dy + 0.5];
  return [x, y];
}
// 兩點之間的路：一串轉折點（格子中心），走斜的不會切過牆角。算過的記起來
export function findPath(G, ax, ay, bx, by) {
  const key = `${ax},${ay},${bx},${by}`; if (G.cache.has(key)) return G.cache.get(key);
  const [sx, sy] = snapFree(G, ax, ay), [ex, ey] = snapFree(G, bx, by), S = Math.floor(sy) * G.w + Math.floor(sx), E = Math.floor(ey) * G.w + Math.floor(ex);
  const prev = new Int32Array(G.w * G.h).fill(-1), q = [S]; prev[S] = S;
  for (let qi = 0; qi < q.length && prev[E] < 0; qi++) {
    const c = q[qi], cx = c % G.w, cy = (c / G.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy, n = ny * G.w + nx; if (!free(G, nx, ny) || prev[n] >= 0) continue;
      if (dx && dy && (!free(G, cx + dx, cy) || !free(G, cx, cy + dy))) continue; prev[n] = c; q.push(n);
    }
  }
  let pts;
  if (prev[E] < 0) pts = [[ax, ay], [bx, by]]; // 走不到（不應該發生）：直接過去
  else {
    const cells = []; for (let c = E; c !== S; c = prev[c]) cells.push(c); cells.reverse();
    pts = [[sx, sy]]; let ldx = 0, ldy = 0;
    cells.forEach((c, i) => { const x = (c % G.w) + 0.5, y = ((c / G.w) | 0) + 0.5, last = i === cells.length - 1; const pv = i ? cells[i - 1] : S, dx = (c % G.w) - (pv % G.w), dy = ((c / G.w) | 0) - ((pv / G.w) | 0);
      if (i && (dx !== ldx || dy !== ldy)) pts.push([(pv % G.w) + 0.5, ((pv / G.w) | 0) + 0.5]); ldx = dx; ldy = dy; if (last) pts.push([ex, ey]); });
    if (!cells.length) pts.push([ex, ey]);
  }
  let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const r = { pts, len }; G.cache.set(key, r); return r;
}
const along = (path, d) => { // 沿著路走了 d 格的位置和方向
  for (let i = 1; i < path.pts.length; i++) { const [x0, y0] = path.pts[i - 1], [x1, y1] = path.pts[i], L = Math.hypot(x1 - x0, y1 - y0); if (d <= L || i === path.pts.length - 1) { const k = L ? Math.min(1, d / L) : 1; return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, dx: x1 - x0, dy: y1 - y0 }; } d -= L; }
  const e = path.pts[path.pts.length - 1]; return { x: e[0], y: e[1], dx: 0, dy: 1 };
};
// 這一天的行程：下雨天不去菜園、不坐在外面（留在原本的地方）；節慶那天白天大家都到舞台旁邊
export function daySchedule(npc, opts = {}) {
  let sch = npc.schedule.map((e) => [e[0], e[1], e[2], e[3] || 'wander', e[4] || 'town']); // 第五個欄位：在哪張地圖（沒寫就是小鎮）
  if (opts.wet) sch = sch.filter((e) => !['farm', 'sit', 'fish'].includes(e[3]));
  if (opts.fest) {
    let h = 0; for (const ch of npc.name) h = (h * 31 + ch.codePointAt(0)) % 9973;
    const a = (h % 360) * Math.PI / 180, r = 3 + (h % 3) * 0.7, spot = [opts.fest.x + 1 + Math.cos(a) * r, opts.fest.y + 1.5 + Math.sin(a) * r * 0.6];
    sch = [...sch.filter((e) => e[0] < 540 || e[0] >= 1020), [540, spot[0], spot[1], 'cheer', 'town'], ...(sch.some((e) => e[0] >= 1020) ? [] : [])].sort((p, q) => p[0] - q[0]);
    if (!sch.some((e) => e[0] >= 1020)) sch.push([1020, ...npc.schedule[npc.schedule.length - 1].slice(1, 3), 'stay', 'town']);
  }
  return sch;
}
// 居民現在在哪、在做什麼：全部用時間算，伺服器和兩個玩家看到的一樣。grids 是「地圖 → walkGrid」（有給才會繞路）；entries 是「地圖 → 從小鎮過去時出現的位置」
// 回傳的 map 是他現在在哪張地圖
export function npcPos(npc, minute, walk = 40, grids = null, opts = {}) {
  const sch = opts.sch || daySchedule(npc, opts); let i = 0; for (let k = 0; k < sch.length; k++) if (minute >= sch[k][0]) i = k;
  return { map: sch[i][4], ...npcPos1(npc, minute, walk, grids, { ...opts, sch }) };
}
function npcPos1(npc, minute, walk, grids, opts) {
  const sch = opts.sch || daySchedule(npc, opts); let i = 0; for (let k = 0; k < sch.length; k++) if (minute >= sch[k][0]) i = k;
  const cur = sch[i], prev0 = sch[i > 0 ? i - 1 : sch.length - 1], map = cur[4], G = grids && (grids[map] || (grids.w ? grids : null));
  // 換地圖：從那張地圖的入口走進來（在原本的地圖上就消失了）
  const ent = prev0[4] !== map && opts.entries && opts.entries[map], prev = ent ? [prev0[0], ent[0], ent[1]] : prev0;
  const face = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
  if (minute < sch[0][0]) return { x: prev0[1], y: prev0[2], moving: false, dir: 'down', map: prev0[4] };
  // 走過去：有地圖就沿著路走（每分鐘 0.7 格），沒有就照原本的直線
  const path = G ? findPath(G, prev[1], prev[2], cur[1], cur[2]) : null, dur = path ? Math.max(4, path.len / 0.7) : walk, el = minute - cur[0];
  if (el < dur) {
    if (path) { const p = along(path, el / dur * path.len); return { x: p.x, y: p.y, moving: true, dir: face(p.dx, p.dy) }; }
    const t = el / dur; return { x: prev[1] + (cur[1] - prev[1]) * t, y: prev[2] + (cur[2] - prev[2]) * t, moving: true, dir: face(cur[1] - prev[1], cur[2] - prev[2]) };
  }
  // 到了：做這一段行程的事（行程第四個欄位）
  const act = cur[3] || 'wander', since = el - dur, [hx, hy] = G ? snapFree(G, cur[1], cur[2]) : [cur[1], cur[2]];
  let h = 0; for (const ch of npc.name) h = (h * 31 + ch.codePointAt(0)) % 9973;
  if (act === 'farm') { // 在菜園：每 25 分鐘換一格，走過去（5 分鐘）→ 翻土或澆水
    const slot = Math.floor(since / 25), ph = since % 25, col = slot % 4, from = slot > 0 ? (slot - 1) % 4 : col;
    if (ph < 5 && from !== col) { const k = ph / 5; return { x: cur[1] + from + (col - from) * k, y: cur[2], moving: true, dir: col > from ? 'right' : 'left' }; }
    return { x: cur[1] + col, y: cur[2], moving: false, dir: 'up', action: slot % 2 ? 'water' : 'swing', tool: slot % 2 ? 'water' : 'hoe' };
  }
  if (act === 'fish') return { x: hx, y: hy, moving: false, dir: 'right', action: 'fishing', tool: 'rod' };
  if (act === 'sweep') { const sw = Math.sin(since * 0.9) * 0.6; return { x: hx + sw, y: hy, moving: false, dir: 'down', action: 'sweep', tool: 'broom' }; }
  if (act === 'cheer') return { x: hx, y: hy, moving: false, dir: 'up', action: Math.floor(since / 6) % 3 === 0 ? 'happy' : null };
  if (act === 'sit') return { x: hx, y: hy, moving: false, dir: 'down', action: 'sit' };
  if (act === 'eat') return { x: hx, y: hy, moving: false, dir: 'down', action: Math.floor(since / 20) % 2 ? 'eat' : null };
  if (act === 'stay') return { x: hx, y: hy, moving: false, dir: 'down' };
  // 沒有特別的事：在附近晃。每 30 分鐘換一個點（離定點不到一格、要走得到），走過去 6 分鐘，然後站著東看西看
  const spot = (n) => { const r = rng(h * 131 + i * 17 + n * 7919), x = hx + (r() - 0.5) * 1.7, y = hy + (r() - 0.5) * 1.1, z = r(); return G && !free(G, Math.floor(x), Math.floor(y)) ? [hx, hy, z] : [x, y, z]; };
  const slot = Math.floor(since / 30), ph = since % 30, a = slot > 0 ? spot(slot - 1) : [hx, hy, 0], b = spot(slot);
  if (ph < 6) { const k = ph / 6; return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, moving: true, dir: face(b[0] - a[0], b[1] - a[1]) }; }
  return { x: b[0], y: b[1], moving: false, dir: ['down', 'left', 'right', 'down'][Math.floor(b[2] * 4)] };
}
// 送這個東西給他，他的反應：love 最喜歡、like 喜歡、dislike 討厭、neutral 普通
export function giftTaste(items, npc, id) { for (const k of ['loves', 'likes', 'dislikes']) if ((npc[k] || []).some((spec) => matches(items, id, spec))) return k === 'loves' ? 'love' : k === 'likes' ? 'like' : 'dislike'; return 'neutral'; }
