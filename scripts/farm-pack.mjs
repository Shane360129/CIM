#!/usr/bin/env node
// 家族牧場的外掛圖包：把繪圖程式畫的圖（AI 生圖、Aseprite、手繪掃描…）切成遊戲用的小圖。
//
// 用法：npm run farm:pack            （讀 art-src/farm-pack/pack.json，寫 public/farm-pack/atlas.png 和 manifest.json）
//       npm run farm:pack -- --preview 某個路徑.png   （另外存一張放大的預覽圖，方便挑要重畫的）
//
// 原圖的規矩：純色背景（預設洋紅 #FF00FF，紫色的東西改用青色 #00FFFF）、一張圖可以放很多個東西、彼此留空隙。
// pack.json 裡每張原圖列出「由上到下、由左到右」每個東西的名字和大小，名字就是遊戲裡 sprite() 用的名字。
// 做的事：去背 → 找出每個東西 → 縮到遊戲的大小 → 減色（像素圖才不會糊）→ 補深色外框 → 拼成一大張。
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const SRC = 'art-src/farm-pack', OUT = 'public/farm-pack';
const HD = 2, TILE = 16 * HD; // 遊戲一格 16 個單位，圖包一個單位畫 2 個像素
const args = process.argv.slice(2);
const previewPath = args.includes('--preview') ? args[args.indexOf('--preview') + 1] : null;

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (r, g, b) => (r * 0.299 + g * 0.587 + b * 0.114) / 255;
function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  }
  return [h, s, l];
}
function toRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
}

// ---------- 去背 ----------
// 跟背景色很像的算背景；邊緣混到背景色的那一圈（縮圖時糊進去的）也削掉，外框最後再補
function keyOut(px, w, h, bg, tol = 110) {
  const n = w * h, alpha = new Uint8Array(n).fill(255);
  const spillOf = (i) => { // 這個像素「染到背景色」的程度：0～1
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    const d = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
    return d;
  };
  for (let i = 0; i < n; i++) if (spillOf(i) < tol) alpha[i] = 0;
  // 背景是洋紅／青色：邊緣上「紅藍都比綠高很多」（或青色：綠藍比紅高很多）的像素是染色，削掉，最多削兩圈
  const tinted = (i) => {
    const c = [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];
    const hi = bg.map((v, k) => (v > 127 ? c[k] : null)).filter((v) => v !== null), lo = bg.map((v, k) => (v <= 127 ? c[k] : null)).filter((v) => v !== null);
    if (!hi.length || !lo.length) return false;
    return Math.min(...hi) - Math.max(...lo) > 45 && Math.max(...hi) - Math.min(...hi) < 70;
  };
  for (let pass = 0; pass < 2; pass++) {
    const kill = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!alpha[i] || !tinted(i)) continue;
      if ((x > 0 && !alpha[i - 1]) || (x < w - 1 && !alpha[i + 1]) || (y > 0 && !alpha[i - w]) || (y < h - 1 && !alpha[i + w])) kill.push(i);
    }
    for (const i of kill) alpha[i] = 0;
  }
  for (let i = 0; i < n; i++) px[i * 4 + 3] = alpha[i];
  return alpha;
}

// ---------- 找出每個東西 ----------
// 先把不透明的地方往外長 gap 個像素（一對眼睛、樹旁邊飄的花瓣才會算同一個），再找連在一起的區塊
function findObjects(alpha, w, h, gap = 4, minArea = 60) {
  let mask = Uint8Array.from(alpha, (a) => (a ? 1 : 0));
  for (let k = 0; k < gap; k++) {
    const m2 = new Uint8Array(mask);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (mask[i]) continue;
      if ((x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w])) m2[i] = 1;
    }
    mask = m2;
  }
  const label = new Int32Array(w * h), boxes = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s]) continue;
    const id = boxes.length + 1, st = [s]; label[s] = id;
    const b = { x0: w, y0: h, x1: 0, y1: 0, area: 0 };
    while (st.length) {
      const i = st.pop(), x = i % w, y = (i - x) / w;
      if (alpha[i]) { b.area++; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; }
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && mask[j] && !label[j]) { label[j] = id; st.push(j); }
    }
    boxes.push(b);
  }
  const big = boxes.filter((b) => b.area >= minArea);
  // 排成「由上到下、由左到右」：上緣差不多的算同一列
  big.sort((a, b) => a.y0 - b.y0);
  const rows = [];
  for (const b of big) {
    const row = rows[rows.length - 1];
    if (row && b.y0 < row.bottom - (row.bottom - row.top) * 0.4) { row.items.push(b); row.bottom = Math.max(row.bottom, b.y1); }
    else rows.push({ top: b.y0, bottom: b.y1, items: [b] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0));
}

// ---------- 縮放、減色、外框 ----------
async function fitInto(px, w, h, box, spec) {
  const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
  const crop = Buffer.alloc(bw * bh * 4);
  for (let y = 0; y < bh; y++) px.copy(crop, y * bw * 4, ((box.y0 + y) * w + box.x0) * 4, ((box.y0 + y) * w + box.x0 + bw) * 4);
  const W = spec.w, H = spec.h, pad = spec.outline === false ? 0 : 1;
  const k = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
  const tw = Math.max(1, Math.round(bw * k)), th = Math.max(1, Math.round(bh * k));
  let img = sharp(crop, { raw: { width: bw, height: bh, channels: 4 } });
  if (spec.flip) img = img.flop();
  // 減色：縮小之後顏色會糊成幾百種，壓回二十幾種才像一張像素圖
  const small = await img.resize(tw, th, { kernel: k < 1 ? 'lanczos3' : 'nearest' }).png({ palette: true, colours: spec.colours || 32, dither: 0 }).toBuffer();
  const { data } = await sharp(small).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(W * H * 4);
  const ox = Math.floor((W - tw) / 2), oy = H - th - pad; // 靠下、左右置中
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const s = (y * tw + x) * 4, d = ((oy + y) * W + ox + x) * 4;
    if (data[s + 3] < 128) continue;
    out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = 255;
  }
  if (spec.outline !== false) outline(out, W, H);
  return out;
}
// 外框：跟遊戲裡程式畫的圖同一種畫法（旁邊那個顏色再暗下去、偏冷），旁邊已經是深色外框就不再加
function outline(px, w, h) {
  const src = Buffer.from(px);
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] ? (y * w + x) * 4 : -1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (src[i + 3]) continue;
    const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].filter((v) => v >= 0); if (!nb.length) continue;
    const j = nb.reduce((m, v) => (lum(src[v], src[v + 1], src[v + 2]) < lum(src[m], src[m + 1], src[m + 2]) ? v : m), nb[0]);
    if (lum(src[j], src[j + 1], src[j + 2]) < 0.3) continue;
    const [hh, ss, ll] = toHsl(src[j], src[j + 1], src[j + 2]);
    const [r, g, b] = toRgb(hh + (235 - hh) * 0.08, ss * 0.7, Math.max(0.06, Math.min(0.2, ll - 0.4)));
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  }
}

// ---------- 從一張圖變出另一張 ----------
// recolor：只改某一段色相的像素（例如樹葉的綠色），樹幹不動 → 夏天的樹變出春天、秋天、冬天的樹
// bob：上半身往下壓一個像素 → 動物走路的第二張圖
function derive(base, w, h, d) {
  const px = Buffer.from(base);
  if (d.recolor) {
    const { from: [h0, h1], hue = 0, to = null, sat = 1, light = 0 } = d.recolor;
    for (let i = 0; i < w * h * 4; i += 4) {
      if (!px[i + 3]) continue;
      const [hh, ss, ll] = toHsl(px[i], px[i + 1], px[i + 2]);
      if (hh < h0 || hh > h1 || ss < 0.12) continue;
      // to：整片葉子收到同一個色相附近（原本偏黃、偏藍的差別只留三成），顏色才不會花掉；hue：照原本的色相轉幾度
      const nh = to == null ? hh + hue : to + (hh - (h0 + h1) / 2) * 0.3;
      const [r, g, b] = toRgb(nh, Math.min(1, ss * sat), Math.max(0, Math.min(1, ll + light)));
      px[i] = r; px[i + 1] = g; px[i + 2] = b;
    }
  }
  if (d.bob) {
    const cut = Math.round(h * (d.at || 0.72)); // 這一列以上整個往下移一個像素，腳不動
    for (let y = cut; y > 0; y--) px.copy(px, y * w * 4, (y - 1) * w * 4, y * w * 4);
    px.fill(0, 0, w * 4);
  }
  return px;
}

// ---------- 主程式 ----------
const cfg = JSON.parse(await readFile(path.join(SRC, 'pack.json'), 'utf8'));
const made = new Map(); // 名字 → { px, w, h, ox, oy }
let bad = 0;
for (const sheet of cfg.sheets) {
  const { data, info } = await sharp(path.join(SRC, sheet.src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const alpha = keyOut(data, w, h, hexRgb(sheet.bg || '#ff00ff'), sheet.tolerance);
  const boxes = findObjects(alpha, w, h, sheet.gap, sheet.minArea);
  if (boxes.length !== sheet.sprites.length) {
    console.error(`❌ ${sheet.src}：pack.json 寫了 ${sheet.sprites.length} 個東西，圖上找到 ${boxes.length} 個`);
    boxes.forEach((b, i) => console.error(`   第 ${i + 1} 個：左上 (${b.x0}, ${b.y0})，${b.x1 - b.x0 + 1}×${b.y1 - b.y0 + 1}`));
    bad++; continue;
  }
  for (let i = 0; i < boxes.length; i++) {
    const sp = sheet.sprites[i]; if (!sp || sp.skip) continue;
    const tw = sp.tiles ? sp.tiles[0] : 1, th = sp.tiles ? sp.tiles[1] : 1;
    const spec = { w: sp.w || tw * TILE, h: sp.h || th * TILE, flip: sp.flip, colours: sp.colours, outline: sp.outline };
    const px = await fitInto(data, w, h, boxes[i], spec);
    made.set(sp.name, { px, w: spec.w, h: spec.h, ox: Math.round((spec.w - tw * TILE) / 2), oy: spec.h - th * TILE });
  }
  console.log(`✅ ${sheet.src}：${boxes.length} 個`);
}
for (const d of cfg.derive || []) {
  const b = made.get(d.from);
  if (!b) { console.error(`❌ derive：找不到 ${d.from}（要做 ${d.name}）`); bad++; continue; }
  made.set(d.name, { ...b, px: derive(b.px, b.w, b.h, d) });
}
if (bad) process.exit(1);

// 拼成一大張：一列一列排，高的排前面
const list = [...made.entries()].sort((a, b) => b[1].h - a[1].h || a[0].localeCompare(b[0]));
const AW = 512; let x = 0, y = 0, rowH = 0; const sprites = {};
for (const [name, s] of list) {
  if (x + s.w > AW) { x = 0; y += rowH; rowH = 0; }
  sprites[name] = { x, y, w: s.w, h: s.h, ...(s.ox ? { ox: s.ox } : {}), ...(s.oy ? { oy: s.oy } : {}) };
  x += s.w; rowH = Math.max(rowH, s.h);
}
const AH = y + rowH, atlas = Buffer.alloc(AW * AH * 4);
for (const [name, s] of list) { const p = sprites[name]; for (let r = 0; r < s.h; r++) s.px.copy(atlas, ((p.y + r) * AW + p.x) * 4, r * s.w * 4, (r + 1) * s.w * 4); }
const png = await sharp(atlas, { raw: { width: AW, height: AH, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'atlas.png'), png);
const v = createHash('sha1').update(png).digest('hex').slice(0, 10);
await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({ v, hd: HD, atlas: 'atlas.png', sprites }, null, 1) + '\n');
console.log(`圖包：${list.length} 張圖，atlas ${AW}×${AH}（${(png.length / 1024).toFixed(1)} KB）→ ${OUT}/`);
if (previewPath) {
  await sharp(atlas, { raw: { width: AW, height: AH, channels: 4 } }).flatten({ background: '#6aa84f' }).resize(AW * 3, AH * 3, { kernel: 'nearest' }).png().toFile(previewPath);
  console.log('預覽圖：' + previewPath);
}
