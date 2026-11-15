#!/usr/bin/env node
// 紙娃娃自動對位：把每一款髮型、帽子「套」到素體的頭上，找出最合適的大小和位置，寫進 public/games/farm/data/doll/fit.json。
// 做法：把頭和零件都變成「哪些像素有東西」的遮罩，試很多種大小和位置，打分數挑最好的：
//   頭髮：要蓋住頭頂和後腦勺、不能蓋到眼睛和嘴巴、不能離頭太遠（浮在上面或太大）
//   帽子：要蓋住頭頂、不能蓋到眼睛、越小越好（剛好戴上去）
//   頭飾（髮箍、蝴蝶結、耳罩…）：照 parts.json 寫的規則放（寬度、放在頭的哪一段）
// 素材換了或加了新的髮型、帽子，重跑一次：node tools/farm-assets/fit-doll.mjs
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..'), A = path.join(ROOT, 'public/games/farm/assets');
const parts = JSON.parse(await readFile(path.join(ROOT, 'public/games/farm/data/doll/parts.json'), 'utf8'));
const atlases = {};
for (const b of ['b1', 'b5']) { const meta = JSON.parse(await readFile(path.join(A, b + '.json'), 'utf8')); const { data, info } = await sharp(path.join(A, meta.image)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); atlases[b] = { meta, data, W: info.width }; }
const DS = 3; // 縮小幾倍來算（快很多，準度夠）
function mask(name, mirror = false) {
  for (const a of Object.values(atlases)) { const r = a.meta.sprites[name]; if (!r) continue;
    const [x0, y0, w, h] = r, mw = Math.ceil(w / DS), mh = Math.ceil(h / DS), m = new Uint8Array(mw * mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const sx = x0 + Math.min(w - 1, x * DS), sy = y0 + Math.min(h - 1, y * DS); if (a.data[(sy * a.W + sx) * 4 + 3] > 100) m[y * mw + (mirror ? mw - 1 - x : x)] = 1; }
    return { m, w: mw, h: mh, pw: w, ph: h }; }
  return null;
}
const heads = { front: mask('base/head/front'), back: mask('base/head/back'), side: mask('base/head/side') };
// 頭上的區域（比例都是相對於頭的寬高）
const regions = (H, view) => {
  const at = (fx0, fx1, fy0, fy1) => { const out = []; for (let y = Math.floor(fy0 * H.h); y < Math.ceil(fy1 * H.h); y++) for (let x = Math.floor(fx0 * H.w); x < Math.ceil(fx1 * H.w); x++) if (H.m[y * H.w + x]) out.push([x, y]); return out; };
  if (view === 'front') return { top: at(0.12, 0.88, 0, 0.28), face: at(0.26, 0.74, 0.47, 0.92), cheek: [] };
  if (view === 'back') return { top: at(0.1, 0.9, 0, 0.86), face: [] }; // 背面：整個後腦勺（耳朵以外）都要蓋住
  return { top: [...at(0.05, 0.9, 0, 0.26), ...at(0, 0.38, 0.26, 0.72), ...at(0.55, 0.85, 0.12, 0.3)], face: at(0.62, 1, 0.45, 0.9) }; // 側面：頭頂、後腦勺、額頭上緣都要蓋住 // 側面：頭頂＋後腦勺要蓋住，臉（右邊）不能蓋
};
const R = Object.fromEntries(Object.entries(heads).map(([v, H]) => [v, regions(H, v)]));
// 頭的外框往外擴一圈：頭髮可以有一點蓬，但不能超出太多
function grow(H, by) { const o = new Uint8Array(H.w * H.h); for (let y = 0; y < H.h; y++) for (let x = 0; x < H.w; x++) if (H.m[y * H.w + x]) for (let dy = -by; dy <= by; dy++) for (let dx = -by; dx <= by; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < H.w && Y < H.h) o[Y * H.w + X] = 1; } return o; }
const near = Object.fromEntries(Object.entries(heads).map(([v, H]) => [v, grow(H, Math.round(H.w * 0.1))]));
// 零件放在 (ox, oy)、大小 s 倍時，頭上某一點有沒有被蓋到
const hit = (P, s, ox, oy, x, y) => { const u = Math.floor((x - ox) / s), v = Math.floor((y - oy) / s); return u >= 0 && v >= 0 && u < P.w && v < P.h && P.m[v * P.w + u]; };
function overflow(P, s, ox, oy, H, nr, maxRow) { // 頭髮在頭上半部超出頭外框太多的面積
  let n = 0; const step = Math.max(1, Math.round(s));
  for (let v = 0; v < P.h; v += 1) for (let u = 0; u < P.w; u += 1) { if (!P.m[v * P.w + u]) continue; const x = Math.floor(ox + u * s), y = Math.floor(oy + v * s); if (y > maxRow * H.h) continue; if (x < 0 || y < 0 || x >= H.w || y >= H.h || !nr[y * H.w + x]) n += s * s; }
  return n / (H.w * H.h);
}
function scoreHair(P, s, ox, oy, view) {
  const H = heads[view], r = R[view]; let c = 0, f = 0;
  for (const [x, y] of r.top) if (hit(P, s, ox, oy, x, y)) c++;
  for (const [x, y] of r.face) if (hit(P, s, ox, oy, x, y)) f++;
  const cov = c / r.top.length, fc = r.face.length ? f / r.face.length : 0, ov = overflow(P, s, ox, oy, H, near[view], view === 'back' ? 0.7 : 0.45);
  return 3 * cov - 5 * fc - 2.2 * ov;
}
function best(P, view, scales, fn) {
  const H = heads[view]; let top = { sc: -1e9 };
  for (const s of scales) for (let oy = -Math.round(0.45 * H.h); oy <= Math.round(0.15 * H.h); oy += 2) for (let ox = Math.round(-0.35 * H.w); ox <= Math.round(0.35 * H.w); ox += 2) {
    const cx = ox + P.w * s / 2 - H.w / 2; if (Math.abs(cx) > 0.25 * H.w) continue; // 中心不會偏太多
    const sc = fn(P, s, ox, oy, view); if (sc > top.sc) top = { sc, s, ox, oy };
  }
  // 細調
  const c0 = { ...top }; // 細調：大小只在選好的上下 0.03 內，位置在 2 格內
  for (const ds of [-0.03, 0, 0.03]) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const s = c0.s + ds, sc = fn(P, s, c0.ox + dx, c0.oy + dy, view); if (sc > top.sc) top = { sc, s, ox: c0.ox + dx, oy: c0.oy + dy }; }
  return top;
}
const out = { note: '自動對位的結果（tools/farm-assets/fit-doll.mjs 產生）。s：零件放大幾倍（相對於素體圖的像素）；x、y：零件左上角相對於頭的左上角，單位是頭的寬、高', hair: {}, hat: {} };
const S = []; for (let s = 0.75; s <= 1.5; s += 0.05) S.push(+s.toFixed(2));
const views = { ff: 'front', bk: 'back', sf: 'side' };
for (const h of parts.hair) {
  const P = { ff: mask(`hair/${h.id}/ff`), bk: mask(`hair/${h.id}/bk`), sf: mask(`hair/${h.id}/sf`, true), fb: mask(`hair/${h.id}/fb`), sb: mask(`hair/${h.id}/sb`, true) };
  if (!P.ff || !P.bk || !P.sf) continue;
  // 同一款的三個角度用同一個大小：試每一種大小，三個角度各自找最好的位置，加起來最高的那個大小
  // 側面的圖大多畫成面向左，但有幾款是面向右：兩個方向都試，挑套得比較好的
  const sfR = mask(`hair/${h.id}/sf`), sbR = mask(`hair/${h.id}/sb`);
  let pick = null;
  for (const s of S) for (const flip of [true, false]) {
    const PP = { ...P, sf: flip ? P.sf : sfR };
    const r = Object.fromEntries(Object.entries(views).map(([k, v]) => [k, best(PP[k], v, [s], scoreHair)])); const tot = r.ff.sc + r.bk.sc + r.sf.sc; if (!pick || tot > pick.tot) pick = { tot, s, r, flip };
  }
  const rel = (k, v) => { const H = heads[v], b = pick.r[k]; return [+(b.ox / H.w).toFixed(4), +(b.oy / H.h).toFixed(4), +b.s.toFixed(3)]; };
  const f = { ff: rel('ff', 'front'), bk: rel('bk', 'back'), sf: rel('sf', 'side') };
  // 後髮（畫在頭後面）跟前髮用同一個大小：正面的後髮跟前髮頂端對齊、左右置中；側面的後髮跟側面前髮頂端對齊、靠後腦那一邊對齊
  if (P.fb) { const [x, y, s] = f.ff, H = heads.front; f.fb = [+(x + (P.ff.w - P.fb.w) * s / 2 / H.w).toFixed(4), y, s]; }
  if (P.sb) { const [x, y, s] = f.sf; f.sb = [x, y, s]; }
  f.sideFlip = pick.flip; out.hair[h.id] = f;
  console.log('髮型', h.id, h.name, 's=' + pick.s, 'score=' + pick.tot.toFixed(2), JSON.stringify(f));
}
// ---- 帽子 ----
function scoreHat(P, s, ox, oy, view) {
  const H = heads[view], r = R[view], top = view === 'back' ? R.front.top : r.top; let c = 0, f = 0;
  for (const [x, y] of top) if (hit(P, s, ox, oy, x, y)) c++;
  for (const [x, y] of r.face) if (hit(P, s, ox, oy, x, y)) f++;
  return 3 * (c / top.length) - 6 * (r.face.length ? f / r.face.length : 0) - 0.9 * s; // 蓋住頭頂、不蓋眼睛、越小越好
}
const HS = []; for (let s = 0.55; s <= 1.6; s += 0.05) HS.push(+s.toFixed(2));
const hatViews = { front: 'front', back: 'back', side: 'side' };
for (const h of parts.hat) {
  if (h.id === 'none') continue;
  const P = { front: mask(`hat/${h.id}/front`), back: mask(`hat/${h.id}/back`), side: mask(`hat/${h.id}/side`, true) };
  if (!P.front) continue;
  const f = {};
  if (h.band) { // 頭飾：照規則放。w：寬是頭寬的幾倍；at：零件底部（或中心）在頭的哪一個高度；mid：用中心對齊
    // 三個角度用同一個大小。高度：正面和背面照圖的高度；側面的圖可能被畫得比較大（零件旁邊的空白不同），所以側面照「跟正面一樣高」換算
    const s0 = (h.band.w * heads.front.w) / P.front.w, hF = P.front.h * s0;
    for (const [k, v] of Object.entries(hatViews)) { if (!P[k]) continue; const H = heads[v];
      if (k === 'side' && h.band.side) { const b = h.band.side, s = b.h * H.h / P[k].h; f[k] = [+((H.w * b.sx - P[k].w * s / 2) / H.w).toFixed(4), +((b.bottom * H.h - P[k].h * s) / H.h).toFixed(4), +s.toFixed(3)]; continue; } // 側面另外指定：高度佔頭的幾成、底部在哪
      const s = k === 'side' ? Math.min(s0, hF / P[k].h) : s0, hh = P[k].h * s;
      const x = k === 'side' ? (H.w * (h.band.sx ?? 0.45) - P[k].w * s / 2) : (H.w - P[k].w * s) / 2; // 側面：頭飾在頭頂偏後一點
      const y = h.band.at * H.h - (h.band.mid ? hh / 2 : hh); f[k] = [+(x / H.w).toFixed(4), +(y / H.h).toFixed(4), +s.toFixed(3)]; }
  } else {
    let pick = null; // 帽子也是三個角度同一個大小
    for (const s of HS) { const r = Object.fromEntries(Object.entries(hatViews).filter(([k]) => P[k]).map(([k, v]) => [k, best(P[k], v, [s], scoreHat)])); const tot = Object.values(r).reduce((a, b) => a + b.sc, 0); if (!pick || tot > pick.tot) pick = { tot, s, r }; }
    for (const [k, v] of Object.entries(hatViews)) { const b = pick.r[k]; if (!b) continue; const H = heads[v]; f[k] = [+(b.ox / H.w).toFixed(4), +(b.oy / H.h).toFixed(4), +b.s.toFixed(3)]; }
  }
  out.hat[h.id] = f; console.log('帽子', h.id, h.name, JSON.stringify(f));
}
// fit.json 已經逐款手動修過（manual: true）：不加 --force 就不覆蓋，結果另外寫到 fit.auto.json 給人參考
const FIT = path.join(ROOT, 'public/games/farm/data/doll/fit.json');
const manual = await readFile(FIT, 'utf8').then((t) => JSON.parse(t).manual === true, () => false);
const dest = manual && !process.argv.includes('--force') ? path.join(ROOT, 'public/games/farm/data/doll/fit.auto.json') : FIT;
await writeFile(dest, JSON.stringify(out, null, 1));
console.log('寫好了', path.relative(ROOT, dest), manual && dest !== FIT ? '（fit.json 是手動修過的，沒有覆蓋；要覆蓋請加 --force）' : '');
