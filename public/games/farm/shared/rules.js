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
