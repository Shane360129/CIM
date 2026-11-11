#!/usr/bin/env node
// 晴耕谷的素材工具：把生圖（一張圖很多個東西、純色背景）切成遊戲用的小圖，拼成圖集。
//
//   node tools/farm-assets/build.mjs 1            處理 art-src/farm/第1批/
//   node tools/farm-assets/build.mjs 1 --boxes    只列出每張圖找到幾個東西、各在哪裡（寫 sheets.json 時用）
//
// 每張原圖：art-src/farm/第N批/N-XX.png（原圖）；沒有原圖時用 N-XX.thumb.png（200 像素縮圖，畫質差，只是先頂著）。
// 每張圖裡有哪些東西、叫什麼名字，寫在 tools/farm-assets/sheets.json（由上到下、由左到右）。
// 做的事：去背 → 找出每個東西 → 對名字 → 修邊、太大的縮小 → 拼成 public/games/farm/assets/bN.webp ＋ bN.json → 產生預覽頁。
import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const batch = process.argv[2], onlyBoxes = process.argv.includes('--boxes');
if (!/^\d+$/.test(batch || '')) { console.error('用法：node tools/farm-assets/build.mjs 批次號碼 [--boxes]'); process.exit(2); }
const SRC = path.join(ROOT, `art-src/farm/第${batch}批`), OUT = path.join(ROOT, 'public/games/farm/assets');
const cfg = JSON.parse(await readFile(path.join(import.meta.dirname, 'sheets.json'), 'utf8'));
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ---------- 去背：跟背景色很像的算背景；邊緣被背景色染到的那一圈也削掉 ----------
function keyOut(px, w, h, bg, tol = 110) {
  const n = w * h, alpha = new Uint8Array(n).fill(255);
  for (let i = 0; i < n; i++) { if (px[i * 4 + 3] < 128 || Math.hypot(px[i * 4] - bg[0], px[i * 4 + 1] - bg[1], px[i * 4 + 2] - bg[2]) < tol) alpha[i] = 0; }
  const tinted = (i) => {
    const c = [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];
    const hi = bg.map((v, k) => (v > 127 ? c[k] : null)).filter((v) => v !== null), lo = bg.map((v, k) => (v <= 127 ? c[k] : null)).filter((v) => v !== null);
    return hi.length && lo.length && Math.min(...hi) - Math.max(...lo) > 45 && Math.max(...hi) - Math.min(...hi) < 70;
  };
  for (let pass = 0; pass < 2; pass++) {
    const kill = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!alpha[i] || !tinted(i)) continue;
      if ((x > 0 && !alpha[i - 1]) || (x < w - 1 && !alpha[i + 1]) || (y > 0 && !alpha[i - w]) || (y < h - 1 && !alpha[i + w])) kill.push(i);
    }
    for (const i of kill) alpha[i] = 0;
  }
  // 透明的地方連顏色也清掉：不然縮放時邊緣會透出背景色，檔案也比較大
  for (let i = 0; i < n; i++) { px[i * 4 + 3] = alpha[i]; if (!alpha[i]) px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 0; }
  return alpha;
}
// ---------- 找出每個東西：靠很近的小塊算同一個（一對眼睛、樹旁邊的花瓣），再排成由上到下、由左到右 ----------
function findObjects(alpha, w, h, gap, minArea) {
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
  return boxes.filter((b) => b.area >= minArea);
}
// 排列：rows = 一列一列（上緣差不多的算同一列）；cols = 一欄一欄（左緣差不多的算同一欄，欄內由上到下）
function order(boxes, mode) {
  const [lo, hi, along] = mode === 'cols' ? ['x0', 'x1', 'y0'] : ['y0', 'y1', 'x0'];
  // 從最高（最寬）的開始分組：中心落在某一組的範圍裡就算那一組。這樣同一列裡很矮的東西（剛發芽的小苗）不會被當成另一列
  const groups = [];
  for (const b of [...boxes].sort((p, q) => (q[hi] - q[lo]) - (p[hi] - p[lo]))) {
    const c = (b[lo] + b[hi]) / 2, g = groups.find((r) => c >= r.lo && c <= r.hi);
    if (g) g.items.push(b); else groups.push({ lo: b[lo], hi: b[hi], items: [b] });
  }
  return groups.sort((p, q) => p.lo - q.lo).map((g) => g.items.sort((p, q) => p[along] - q[along]));
}

const files = (await readdir(SRC)).filter((f) => f.endsWith('.png'));
const ids = [...new Set(files.map((f) => f.replace(/(\.thumb)?\.png$/, '')))].sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
const sprites = [], problems = []; let usedThumb = 0;
for (const id of ids) {
  const sc = cfg.sheets[id];
  if (!sc && !onlyBoxes) continue;
  const full = files.includes(id + '.png'), file = path.join(SRC, id + (full ? '.png' : '.thumb.png'));
  if (!full) usedThumb++;
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, k = w / 200; // 門檻是照 200 像素寬的縮圖訂的，原圖照比例放大
  if (sc && sc.kind === 'scene') { sprites.push({ name: sc.names[0], px: data, w, h, kind: 'scene', id }); continue; }
  const alpha = keyOut(data, w, h, hexRgb((sc && sc.bg) || '#ff00ff'), sc && sc.tolerance);
  const groups = order(findObjects(alpha, w, h, Math.round(((sc && sc.gap) ?? 2) * k), Math.round(((sc && sc.minArea) ?? 14) * k * k)), (sc && sc.order) || 'rows');
  if (onlyBoxes) { console.log(`${id}（${full ? '原圖' : '縮圖'} ${w}×${h}）：` + groups.map((g) => g.length).join(' + ') + ` = ${groups.flat().length} 個`); continue; }
  // splitCols：一列裡有東西黏在一起（找到的比欄數少）時，把這一列照欄數平均切開
  if (sc.splitCols) for (let gi = 0; gi < groups.length; gi++) if (groups[gi].length < sc.splitCols) { const r = groups[gi], b = { ...r[0], x0: Math.min(...r.map((q) => q.x0)), x1: Math.max(...r.map((q) => q.x1)), y0: Math.min(...r.map((q) => q.y0)), y1: Math.max(...r.map((q) => q.y1)) }, cw = (b.x1 - b.x0 + 1) / sc.splitCols; groups[gi] = Array.from({ length: sc.splitCols }, (_, i) => ({ ...b, x0: Math.round(b.x0 + cw * i), x1: Math.round(b.x0 + cw * (i + 1)) - 1 })); }
  const want = sc.names.map((r) => r.length), got = groups.map((g) => g.length);
  if (want.join() !== got.join()) { problems.push(`${id}：sheets.json 寫的是每列 ${want.join('、')} 個，圖上找到的是 ${got.join('、')} 個 → 這張沒有處理`); continue; }
  groups.forEach((g, r) => g.forEach((b, c) => {
    const name = sc.names[r][c]; if (!name) return; // 名字留空：這個東西不要
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1, crop = Buffer.alloc(bw * bh * 4);
    for (let y = 0; y < bh; y++) data.copy(crop, y * bw * 4, ((b.y0 + y) * w + b.x0) * 4, ((b.y0 + y) * w + b.x0 + bw) * 4);
    sprites.push({ name, px: crop, w: bw, h: bh, kind: sc.kind, id });
  }));
}
if (onlyBoxes) process.exit(0);

// 太大的縮小（各類別的上限寫在 sheets.json 的 kinds），不會放大
for (const s of sprites) {
  const max = (cfg.kinds[s.kind] || {}).max || 256, k = Math.min(1, max / Math.max(s.w, s.h));
  if (k < 1) {
    const nw = Math.max(1, Math.round(s.w * k)), nh = Math.max(1, Math.round(s.h * k));
    s.px = await sharp(s.px, { raw: { width: s.w, height: s.h, channels: 4 } }).resize(nw, nh, { kernel: 'lanczos3' }).raw().toBuffer(); s.w = nw; s.h = nh;
  }
}
const dup = sprites.map((s) => s.name).filter((n, i, a) => a.indexOf(n) !== i);
if (dup.length) problems.push('名字重複：' + [...new Set(dup)].join('、'));
// 拼圖集：高的排前面，一列一列排，每張之間留 2 像素（縮放時才不會沾到隔壁）
const list = [...sprites].sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
const AW = Math.min(2048, Math.max(256, 2 ** Math.ceil(Math.log2(Math.sqrt(list.reduce((n, s) => n + (s.w + 2) * (s.h + 2), 0)) * 1.25)))), PAD = 2;
let x = PAD, y = PAD, rowH = 0; const map = {};
for (const s of list) {
  if (x + s.w + PAD > AW) { x = PAD; y += rowH + PAD; rowH = 0; }
  map[s.name] = [x, y, s.w, s.h]; x += s.w + PAD; rowH = Math.max(rowH, s.h);
}
const AH = y + rowH + PAD, atlas = Buffer.alloc(AW * AH * 4);
for (const s of list) { const [sx, sy] = map[s.name]; for (let r = 0; r < s.h; r++) s.px.copy(atlas, ((sy + r) * AW + sx) * 4, r * s.w * 4, (r + 1) * s.w * 4); }
await mkdir(OUT, { recursive: true });
const webp = await sharp(atlas, { raw: { width: AW, height: AH, channels: 4 } }).webp({ quality: 88, alphaQuality: 100, effort: 5 }).toBuffer();
await writeFile(path.join(OUT, `b${batch}.webp`), webp);
await writeFile(path.join(OUT, `b${batch}.json`), JSON.stringify({ image: `b${batch}.webp`, w: AW, h: AH, quality: usedThumb ? 'thumb' : 'full', sprites: map }) + '\n');
// 預覽頁（只在本機看，不部署）：每張小圖、名字、大小，方便挑要重畫的
const prev = path.join(import.meta.dirname, 'preview'); await mkdir(prev, { recursive: true });
await writeFile(path.join(prev, `b${batch}.png`), await sharp(atlas, { raw: { width: AW, height: AH, channels: 4 } }).png().toBuffer());
const cells = list.map((s) => { const [sx, sy] = map[s.name]; return `<figure><div style="width:${s.w}px;height:${s.h}px;background:url(b${batch}.png) -${sx}px -${sy}px"></div><figcaption>${s.name}<br><small>${s.w}×${s.h}・${s.id}</small></figcaption></figure>`; }).join('\n');
await writeFile(path.join(prev, `b${batch}.html`), `<!doctype html><meta charset="utf-8"><title>第 ${batch} 批素材預覽</title><style>body{font-family:sans-serif;background:#8fca6b;margin:16px}main{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}figure{margin:0;text-align:center;font-size:12px;background:rgba(255,255,255,.55);padding:6px;border-radius:8px}figure div{margin:0 auto 4px;image-rendering:auto}</style><h1>第 ${batch} 批：${list.length} 張小圖（${usedThumb ? '用的是縮圖，畫質只是暫時的' : '原圖'}）</h1>${problems.length ? '<ul><li>' + problems.join('<li>') + '</ul>' : ''}<main>\n${cells}\n</main>\n`);
console.log(`第 ${batch} 批：${list.length} 張小圖 → public/games/farm/assets/b${batch}.webp（${AW}×${AH}，${(webp.length / 1024).toFixed(0)} KB）${usedThumb ? `；有 ${usedThumb} 張用的是縮圖` : ''}`);
console.log(`預覽頁：tools/farm-assets/preview/b${batch}.html`);
for (const p of problems) console.log('⚠️  ' + p);
process.exitCode = problems.length ? 1 : 0;
