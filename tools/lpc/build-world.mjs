#!/usr/bin/env node
// 晴耕谷的 LPC 場景素材工具：照 tools/lpc/world/*.json 的對照表，從 OpenGameArt 的 LPC 素材包（art-src/lpc/oga/，不進 git）
// 切出遊戲要的每一張圖（名字跟以前的手繪圖一樣，程式不用改），排成一張像素圖集。
//
//   node tools/lpc/build-world.mjs                       做 public/games/farm/assets/w1.png ＋ w1.json，整理素材來源
//   node tools/lpc/build-world.mjs --preview 圖.png [--only 開頭,開頭] [--file 對照表.json]   只畫一張檢查圖（每張小圖＋名字），不動遊戲的圖集
//
// 對照表（tools/lpc/world/*.json）的格式：{ "sprites": { "遊戲的圖名": 設定, … } }
//   src    素材包裡的檔案（art-src/lpc/oga/ 底下的路徑，第一段是素材包代號，作者名單照這個找）
//   rect   [x, y, 寬, 高]（像素）；或 grid [格寬, 格高] ＋ cell [第幾欄, 第幾列]；都沒寫就是整張
//   名字裡有 {i} 的，用 cells: [[欄, 列], …] 或 rects: [[x, y, 寬, 高], …] 一次做好幾張（{i} 換成 0、1、2…）
//   native 場景裡的東西（樹、石頭、房子、作物、動物）照原本像素大小畫，預設 true；道具圖示這類要塞進框裡的寫 false
//   trim   切掉四周透明的邊，預設 true（場景裡的東西底部就是腳踩的地方）
//   flip   左右翻；hue 色相轉幾度（只轉比較鮮豔的顏色）；recolor [["#原色","#新色"], …]；key "#rrggbb" 這個顏色當成透明；scale 整數放大
//   isolate 只留最大的那一塊（切的範圍裡混進隔壁東西的一角時用；影子跟本體連在一起會一起留下）
//   parts  拼圖：[{ src, rect / grid+cell, at: [x, y], flip, hue, recolor, key }, …] 疊在 size: [寬, 高] 的透明畫布上（建築用）
import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OGA = path.join(ROOT, 'art-src/lpc/oga');
const OUT = path.join(ROOT, 'public/games/farm/assets');
const argv = process.argv.slice(2), arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const preview = arg('--preview'), only = (arg('--only') || '').split(',').filter(Boolean), onlyFile = arg('--file');
const exists = (p) => access(p).then(() => true, () => false);
const PACKS = JSON.parse(await readFile(path.join(import.meta.dirname, 'oga-packs.json'), 'utf8')).packs;

// ---------- 讀對照表 ----------
const dir = path.join(import.meta.dirname, 'world'), specs = new Map();
for (const f of (await readdir(dir)).filter((f) => f.endsWith('.json') && (!onlyFile || f === onlyFile)).sort()) {
  let m; try { m = JSON.parse(await readFile(path.join(dir, f), 'utf8')); } catch (e) { if (!preview) throw new Error(`${f} 不是正確的 JSON：${e.message}`); console.log(`略過 ${f}（JSON 有錯：${e.message}）`); continue; }
  for (const [name, s] of Object.entries(m.sprites || {})) {
    const add = (n, spec) => { if (specs.has(n)) throw new Error(`${n} 在兩個對照表裡都有（${f}）`); specs.set(n, { ...(m.defaults || {}), ...spec, from: f }); };
    if (name.includes('{i}') && (s.cells || s.rects)) (s.cells || s.rects).forEach((c, i) => add(name.replace('{i}', i), { ...s, cells: undefined, rects: undefined, ...(s.cells ? { cell: c } : { rect: c }) }));
    else add(name, s);
  }
}

// ---------- 讀圖、切圖、修圖 ----------
const imgCache = new Map();
async function load(src) {
  if (!imgCache.has(src)) {
    const file = path.join(OGA, src);
    if (!(await exists(file))) throw new Error(`找不到素材：${src}`);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    imgCache.set(src, { data, w: info.width, h: info.height });
  }
  return imgCache.get(src);
}
const rectOf = (s, im) => s.rect || (s.grid && s.cell ? [s.cell[0] * s.grid[0], s.cell[1] * s.grid[1], s.grid[0], s.grid[1]] : [0, 0, im.w, im.h]);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function crop(im, [x, y, w, h]) {
  const out = Buffer.alloc(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx = x + i, sy = y + j; if (sx < 0 || sy < 0 || sx >= im.w || sy >= im.h) continue;
    im.data.copy(out, (j * w + i) * 4, (sy * im.w + sx) * 4, (sy * im.w + sx) * 4 + 4);
  }
  return { data: out, w, h };
}
function ops(b, s) {
  const { data: a, w, h } = b;
  if (s.key) { const k = hex(s.key); for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - k[0]) < 4 && Math.abs(a[i + 1] - k[1]) < 4 && Math.abs(a[i + 2] - k[2]) < 4) a[i + 3] = 0; }
  if (s.recolor) { const P = s.recolor.map(([f, t]) => [hex(f), hex(t)]); for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; for (const [f, t] of P) if (Math.abs(a[i] - f[0]) <= 3 && Math.abs(a[i + 1] - f[1]) <= 3 && Math.abs(a[i + 2] - f[2]) <= 3) { a[i] = t[0]; a[i + 1] = t[1]; a[i + 2] = t[2]; break; } } }
  if (s.hue) for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const [r, g, bb] = hueRotate(a[i], a[i + 1], a[i + 2], s.hue); a[i] = r; a[i + 1] = g; a[i + 2] = bb; }
  if (s.flip) for (let j = 0; j < h; j++) for (let i = 0; i < w >> 1; i++) { const p = (j * w + i) * 4, q = (j * w + (w - 1 - i)) * 4; for (let k = 0; k < 4; k++) { const t = a[p + k]; a[p + k] = a[q + k]; a[q + k] = t; } }
  let out = b;
  if (s.scale && s.scale > 1) { const k = s.scale, o = Buffer.alloc(w * k * h * k * 4); for (let j = 0; j < h * k; j++) for (let i = 0; i < w * k; i++) a.copy(o, (j * w * k + i) * 4, (Math.floor(j / k) * w + Math.floor(i / k)) * 4, (Math.floor(j / k) * w + Math.floor(i / k)) * 4 + 4); out = { data: o, w: w * k, h: h * k }; }
  return out;
}
function hueRotate(r, g, b, deg) { // 只轉比較鮮豔的顏色，灰色、描邊不動
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, d = mx - mn; if (d < 0.12) return [r, g, b];
  const s = d / (1 - Math.abs(2 * l - 1)); let hh = mx === r / 255 ? (((g - b) / 255 / d) % 6) : mx === g / 255 ? (b - r) / 255 / d + 2 : (r - g) / 255 / d + 4; hh = (hh * 60 + deg + 360) % 360;
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs(((hh / 60) % 2) - 1)), m = l - C / 2;
  const [R, G, B] = hh < 60 ? [C, X, 0] : hh < 120 ? [X, C, 0] : hh < 180 ? [0, C, X] : hh < 240 ? [0, X, C] : hh < 300 ? [X, 0, C] : [C, 0, X];
  return [Math.round((R + m) * 255), Math.round((G + m) * 255), Math.round((B + m) * 255)];
}
function paste(dst, src, x0, y0) {
  for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
    const x = x0 + i, y = y0 + j; if (x < 0 || y < 0 || x >= dst.w || y >= dst.h) continue;
    const p = (j * src.w + i) * 4, q = (y * dst.w + x) * 4, a = src.data[p + 3] / 255; if (!a) continue;
    for (let k = 0; k < 3; k++) dst.data[q + k] = Math.round(src.data[p + k] * a + dst.data[q + k] * (1 - a));
    dst.data[q + 3] = Math.max(dst.data[q + 3], src.data[p + 3]);
  }
}
function isolate(b) { // 只留最大的一塊（不透明的點八方向連在一起算一塊）
  const { w, h, data: a } = b, lab = new Int32Array(w * h).fill(-1), sizes = []; let best = -1;
  for (let i = 0; i < w * h; i++) {
    if (lab[i] >= 0 || !a[i * 4 + 3]) continue;
    const id = sizes.length, st = [i]; lab[i] = id; let n = 0;
    while (st.length) { const p = st.pop(); n++; const x = p % w, y = (p - x) / w; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const q = ny * w + nx; if (lab[q] < 0 && a[q * 4 + 3]) { lab[q] = id; st.push(q); } } }
    sizes.push(n); if (best < 0 || n > sizes[best]) best = id;
  }
  for (let i = 0; i < w * h; i++) if (lab[i] !== best) a[i * 4 + 3] = 0;
  return b;
}
function trim(b) {
  let x0 = b.w, y0 = b.h, x1 = -1, y1 = -1;
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) if (b.data[(j * b.w + i) * 4 + 3]) { x0 = Math.min(x0, i); y0 = Math.min(y0, j); x1 = Math.max(x1, i); y1 = Math.max(y1, j); }
  return x1 < 0 ? null : crop(b, [x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
}
async function make(s) {
  let b;
  if (s.parts) { b = { data: Buffer.alloc(s.size[0] * s.size[1] * 4), w: s.size[0], h: s.size[1] }; for (const p of s.parts) { const im = await load(p.src); paste(b, ops(crop(im, rectOf(p, im)), p), p.at[0], p.at[1]); } b = ops(b, { ...s, recolor: s.recolor, hue: s.hue, flip: s.flip, key: null }); }
  else { const im = await load(s.src); b = ops(crop(im, rectOf(s, im)), s); }
  if (s.isolate) b = isolate(b);
  return s.trim === false ? b : trim(b);
}

// ---------- 做每一張、排成圖集 ----------
const made = [], used = new Set(), problems = [];
for (const [name, s] of specs) {
  if (only.length && !only.some((o) => name.startsWith(o))) continue;
  try { const b = await make(s); if (!b) { problems.push(`${name}：切出來是空的`); continue; } made.push({ name, b, native: s.native !== false }); for (const p of s.parts || [s]) used.add(p.src.split('/')[0]); }
  catch (e) { problems.push(`${name}：${e.message}`); }
}
made.sort((a, b) => b.b.h - a.b.h || b.b.w - a.b.w);
const PAD = 2, MAXW = 2048; let x = PAD, y = PAD, rowH = 0, W = 0;
for (const m of made) { if (x + m.b.w + PAD > MAXW) { x = PAD; y += rowH + PAD; rowH = 0; } m.x = x; m.y = y; x += m.b.w + PAD; rowH = Math.max(rowH, m.b.h); W = Math.max(W, x); }
const H = y + rowH + PAD, atlas = { data: Buffer.alloc(W * H * 4), w: W, h: H };
for (const m of made) paste(atlas, m.b, m.x, m.y);

if (preview) { // 檢查圖：每張小圖放大兩倍，下面寫名字
  const cell = 150, cols = 8, rows = Math.ceil(made.length / cols), pv = { data: Buffer.alloc(cols * cell * rows * cell * 4), w: cols * cell, h: rows * cell };
  for (let i = 0; i < pv.data.length; i += 4) { pv.data[i] = 167; pv.data[i + 1] = 212; pv.data[i + 2] = 137; pv.data[i + 3] = 255; }
  const sorted = [...made].sort((a, b) => a.name.localeCompare(b.name)); const labels = [];
  sorted.forEach((m, i) => { const k = Math.max(1, Math.min(2, Math.floor(Math.min((cell - 10) / m.b.w, (cell - 26) / m.b.h)))), sc = k > 1 ? ops({ ...m.b, data: Buffer.from(m.b.data) }, { scale: k }) : m.b; const cx = (i % cols) * cell, cy = Math.floor(i / cols) * cell; paste(pv, sc, cx + Math.floor((cell - sc.w) / 2), cy + Math.max(2, cell - 20 - sc.h)); labels.push(`<text x="${cx + 4}" y="${cy + cell - 6}" font-size="11" font-family="sans-serif" fill="#1d1d1d">${m.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`); });
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pv.w}" height="${pv.h}">${labels.join('')}</svg>`);
  await sharp(pv.data, { raw: { width: pv.w, height: pv.h, channels: 4 } }).composite([{ input: svg }]).png().toFile(preview);
  console.log(`檢查圖 ${preview}：${made.length} 張`);
} else {
  const png = await sharp(atlas.data, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  await writeFile(path.join(OUT, 'w1.png'), png);
  await writeFile(path.join(OUT, 'w1.json'), JSON.stringify({ image: 'w1.png', w: W, h: H, pixel: true, sprites: Object.fromEntries(made.map((m) => [m.name, [m.x, m.y, m.b.w, m.b.h, m.native ? 1 : 0]])) }) + '\n');
  // 素材來源：用到的素材包的作者、授權、出處；素材包規定要附的說明檔照抄一份
  const credits = [], authors = new Set();
  await mkdir(path.join(OUT, 'credits'), { recursive: true });
  for (const slug of [...used].sort()) {
    const p = PACKS[slug]; if (!p) { problems.push(`素材包 ${slug} 不在 oga-packs.json`); continue; }
    const files = [];
    for (const f of p.creditFiles || []) { const from = path.join(OGA, slug, f); if (!(await exists(from))) continue; const to = path.join(OUT, 'credits', slug, path.basename(f)); await mkdir(path.dirname(to), { recursive: true }); await copyFile(from, to); files.push(`assets/credits/${slug}/${path.basename(f)}`); }
    credits.push({ title: p.title, url: p.url, authors: p.authors, licenses: p.licenses, attribution: p.attribution, files }); p.authors.forEach((a) => authors.add(a));
  }
  await writeFile(path.join(ROOT, 'public/games/farm/data/credits-world.json'), JSON.stringify({ note: '場景、作物、動物、道具的圖（LPC，OpenGameArt）的素材來源，由 tools/lpc/build-world.mjs 產生', authors: [...authors].sort((a, b) => a.localeCompare(b)), packs: credits }, null, 1));
  console.log(`圖集 w1.png：${made.length} 張小圖、${W}×${H}、${(png.length / 1024).toFixed(0)} KB；用到 ${used.size} 個素材包`);
}
if (problems.length) { console.log(`有 ${problems.length} 個問題：`); problems.slice(0, 40).forEach((p) => console.log('  ' + p)); }
