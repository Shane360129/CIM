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
