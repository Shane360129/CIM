#!/usr/bin/env node
// 晴耕谷的 LPC 角色素材工具：從 LPC 角色產生器（Universal LPC Spritesheet Character Generator）
// 把 tools/lpc/characters.json 列的零件圖複製進遊戲，並整理成遊戲讀的 data/doll/lpc.json、作者名單。
//
//   node tools/lpc/build-characters.mjs [產生器資料夾]
//
// 產生器資料夾預設是 art-src/lpc/generator（不進 git）。第一次用先下載：
//   git clone --filter=blob:none --no-checkout https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator art-src/lpc/generator
//   git -C art-src/lpc/generator checkout <characters.json 裡的 commit>（只會抓定義檔，圖這個工具會自己抓需要的）
//
// 產出：
//   public/games/farm/assets/lpc/…             零件圖（原檔照抄，只留用得到的動作；同一張圖不同顏色的只留一張，遊戲裡再換色）
//   public/games/farm/data/doll/lpc.json        每個零件在每種體型要畫哪些圖層、圖層順序、怎麼換色
//   public/games/farm/assets/lpc/CREDITS.csv    用到的圖的作者、授權、出處（CC-BY-SA 等授權規定要附上）
//   public/games/farm/data/credits-lpc.json     遊戲「素材來源」畫面用的作者名單
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const GEN = path.resolve(process.argv[2] || path.join(ROOT, 'art-src/lpc/generator'));
const CAT = JSON.parse(await readFile(path.join(import.meta.dirname, 'characters.json'), 'utf8'));
const OUT_IMG = path.join(ROOT, 'public/games/farm/assets/lpc');
const OUT_DATA = path.join(ROOT, 'public/games/farm/data/doll/lpc.json');
const exists = (p) => access(p).then(() => true, () => false);
if (!(await exists(path.join(GEN, 'sheet_definitions')))) { console.error(`找不到產生器：${GEN}（說明在這個檔案開頭）`); process.exit(2); }

const readJSON = async (p) => JSON.parse(await readFile(p, 'utf8'));
const defCache = new Map();
const def = async (p) => { if (!defCache.has(p)) defCache.set(p, await readJSON(path.join(GEN, 'sheet_definitions', p))); return defCache.get(p); };
const MATS = ['body', 'cloth', 'hair', 'eye', 'metal', 'wood'];
const META = {}, PAL = {};
for (const m of MATS) { META[m] = await readJSON(path.join(GEN, 'palette_definitions', m, `meta_${m}.json`)); PAL[m] = await readJSON(path.join(GEN, 'palette_definitions', m, `${m}_ulpc.json`)); }

// 換色：定義檔的 recolors 寫了這張圖用哪種材質（膚色、頭髮、布料…）、原本是哪個顏色
// 回傳 [材質, 原本的顏色, 用途]；用途決定遊戲裡套哪個顏色（skin 膚色、eye 眼睛、hair 髮色、cloth 這個部位的顏色）
function matsOf(d, opt = {}) {
  const r = d.recolors, out = [], use = (mat) => (mat === 'body' ? 'skin' : mat === 'eye' ? 'eye' : mat === 'hair' ? 'hair' : mat === 'cloth' ? 'cloth' : 'fixed');
  if (r && r.material) out.push([r.material, r.base || META[r.material].base, use(r.material)]);
  else if (r) for (const v of Object.values(r)) if (v && v.material) out.push([v.material, v.base || META[v.material].base, out.length && v.material === 'cloth' ? 'fixed' : use(v.material)]);
  const v = d.variants ? (opt.variant || (d.variants.includes('white') ? 'white' : d.variants[0])) : null;
  if (!out.length && v && PAL.cloth[v]) out.push(['cloth', v, 'cloth']); // 用很多張不同顏色圖的（吊帶褲、圍裙、帽子）：只留一張，用布料的色票換色
  return out;
}
// 這個零件在這種體型要畫的圖層（定義檔的 layer_1、layer_2…，各有前後順序 zPos）
function layersOf(d, body, opt = {}) {
  const out = [];
  for (const [k, L] of Object.entries(d)) {
    if (!/^layer_\d+$/.test(k) || !L[body]) continue;
    let src = L[body]; if (opt.face) src = src.replace('${head}', opt.face);
    out.push({ z: L.zPos ?? 100, src, custom: L.custom_animation || null, variant: d.variants ? (opt.variant || (d.variants.includes('white') ? 'white' : d.variants[0])) : null });
  }
  return out;
}

const wanted = new Map(); // 要抄的圖：目的地相對路徑 → 產生器裡的檔案
const usedDefs = new Map(); // 定義檔 → 用到的圖路徑（整理作者名單用）
async function plan(defPath, body, opt = {}) {
  const d = await def(defPath), mats = matsOf(d, opt), out = [];
  for (const L of layersOf(d, body, opt)) {
    const anims = [];
    if (L.custom) { const src = `${L.src.replace(/\/$/, '')}.png`; wanted.set(src, src); anims.push(L.custom); }
    else for (const a of CAT.anims) {
      const from = L.variant ? `${L.src}${a}/${L.variant}.png` : `${L.src}${a}.png`;
      wanted.set(`${L.src}${a}.png`, from); anims.push(a);
    }
    const layer = { z: L.z, src: L.src.replace(/\/$/, '') + (L.custom ? '' : '/'), anims, mats: opt.color ? mats.map(([m, b]) => [m, b, `fixed:${opt.color}`]) : mats };
    if (L.custom) layer.custom = L.custom;
    out.push(layer);
    if (!usedDefs.has(defPath)) usedDefs.set(defPath, new Set()); usedDefs.get(defPath).add(L.src);
  }
  return out;
}

const data = { note: '由 tools/lpc/build-characters.mjs 產生，不要手改；零件清單改 tools/lpc/characters.json', anims: { walk: 9, idle: 2, thrust: 8, slash: 6, sit: 3 }, custom: CAT.custom, palettes: {}, body: {}, heads: {}, faces: {}, parts: {}, tools: {} };
for (const b of CAT.bodies) data.body[b] = await plan(CAT.body, b);
for (const [id, h] of Object.entries(CAT.heads)) { data.heads[id] = { face: h.face }; for (const b of CAT.bodies) data.heads[id][b] = await plan(h.def, b); }
const faceKeys = [...new Set(Object.values(CAT.heads).map((h) => h.face))];
for (const [id, p] of Object.entries(CAT.faces)) { data.faces[id] = {}; for (const f of faceKeys) for (const b of CAT.bodies) { const l = await plan(p, b, { face: f }); if (l.length) (data.faces[id][f] ||= {})[b] = l; } }
for (const [cat, list] of Object.entries(CAT.parts)) {
  data.parts[cat] = {};
  for (const it of list) {
    const e = (data.parts[cat][it.id] = {});
    if (it.else) e.else = it.else;
    if (it.hairColor) e.hairColor = true;
    for (const b of CAT.bodies) {
      const specs = it.layers || (it.def ? [{ def: it.def, variant: it.variant, color: it.color }] : []);
      let all = [];
      for (const s of specs) all = all.concat(await plan(s.def, b, { variant: s.variant, color: s.color }));
      if (all.length || !specs.length) e[b] = all;
    }
  }
}
for (const [id, t] of Object.entries(CAT.tools)) { data.tools[id] = { anim: t.anim }; for (const b of CAT.bodies) { const l = await plan(t.def, b); if (l.length) data.tools[id][b] = l; } }

// 色票：只留清單上用得到的顏色＋每種材質原本的顏色
const keepColors = { body: CAT.colors.skin, eye: CAT.colors.eye, hair: CAT.colors.hair, cloth: CAT.colors.cloth };
for (const m of MATS) { const keep = new Set([...(keepColors[m] || []), META[m].base]); data.palettes[m] = Object.fromEntries(Object.entries(PAL[m]).filter(([k]) => keep.has(k) || m === 'cloth' || m === 'metal' || m === 'wood').map(([k, v]) => [k, v.map((c) => c.toLowerCase())])); }

// 抄圖：先讓產生器的資料夾把需要的圖下載下來（git 稀疏下載），再一張一張抄
const dirs = [...new Set([...wanted.values()].map((f) => 'spritesheets/' + path.dirname(f) + '/'))];
if (await exists(path.join(GEN, '.git'))) for (let i = 0; i < dirs.length; i += 80) execFileSync('git', ['-C', GEN, 'sparse-checkout', 'add', ...dirs.slice(i, i + 80).map((d) => '/' + d)], { stdio: 'ignore' });
let copied = 0, missing = 0;
const have = new Set();
for (const [to, from] of wanted) {
  const src = path.join(GEN, 'spritesheets', from), dst = path.join(OUT_IMG, to);
  if (!(await exists(src))) { missing++; continue; }
  await mkdir(path.dirname(dst), { recursive: true }); await copyFile(src, dst); copied++; have.add(to);
}
// 定義檔沒寫原本顏色的，看圖裡實際用了哪一組色票（例如三角頭巾原本是棕色，不是布料預設的白色）
const sharp = (await import('sharp')).default;
const colorsIn = new Map();
async function colorsOf(file) {
  if (colorsIn.has(file)) return colorsIn.get(file);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), set = new Set();
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) set.add(((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]) >>> 0);
  colorsIn.set(file, set); return set;
}
const near = (set, hex) => { const v = parseInt(hex.slice(1), 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255; for (const c of set) if (Math.abs((c >> 16) - r) <= 3 && Math.abs(((c >> 8) & 255) - g) <= 3 && Math.abs((c & 255) - b) <= 3) return true; return false; };
async function fixBases(layers) {
  for (const L of layers || []) {
    const a = L.anims[0]; if (!a) continue;
    const file = path.join(OUT_IMG, L.custom ? L.src + '.png' : `${L.src}${a}.png`); if (!(await exists(file))) continue;
    const set = await colorsOf(file);
    for (const m of L.mats) {
      const score = (v) => PAL[m[0]][v].filter((h) => near(set, h)).length;
      if (score(m[1]) >= 4) continue;
      let best = m[1], bs = score(m[1]); for (const v of Object.keys(PAL[m[0]])) { const s2 = score(v); if (s2 > bs) { bs = s2; best = v; } }
      m[1] = best;
    }
  }
}
const walkFix = async (o) => { if (Array.isArray(o)) { if (o.length && o[0] && o[0].src) await fixBases(o); else for (const v of o) await walkFix(v); } else if (o && typeof o === 'object') for (const v of Object.values(o)) await walkFix(v); };
// 圖層的動作清單只留真的有圖的
const prune = (layers) => { for (const L of layers || []) L.anims = L.anims.filter((a) => (L.custom ? have.has(L.src + '.png') : have.has(`${L.src}${a}.png`))); };
const walkAll = (o) => { if (Array.isArray(o)) { if (o.length && o[0] && o[0].src) prune(o); else o.forEach(walkAll); } else if (o && typeof o === 'object') Object.values(o).forEach(walkAll); };
walkAll(data.body); walkAll(data.heads); walkAll(data.faces); walkAll(data.parts); walkAll(data.tools);
for (const k of ['body', 'heads', 'faces', 'parts', 'tools']) await walkFix(data[k]);
await writeFile(OUT_DATA, JSON.stringify(data));

// 遊戲的外觀選項（建角、衣櫃、伺服器檢查都讀這份）：顏色用色票裡一個代表色的色碼存，遊戲畫的時候再換回色票名稱
const REP = { body: 3, hair: 4, cloth: 4 }, hexOf = (m, v) => PAL[m][v][REP[m]].toLowerCase();
const colors = { skin: CAT.colors.skin.map((v) => hexOf('body', v)), hair: CAT.colors.hair.map((v) => hexOf('hair', v)), cloth: CAT.colors.cloth.map((v) => hexOf('cloth', v)) };
for (const [k, l] of Object.entries(colors)) if (new Set(l).size !== l.length) throw new Error(`${k} 的代表色有重複`);
const lpcColors = { skin: Object.fromEntries(CAT.colors.skin.map((v) => [hexOf('body', v), v])), hair: Object.fromEntries(CAT.colors.hair.map((v) => [hexOf('hair', v), v])), cloth: Object.fromEntries(CAT.colors.cloth.map((v) => [hexOf('cloth', v), v])) };
const listOf = (cat) => CAT.parts[cat].map((it) => ({ id: it.id, name: it.name, ...(it.else ? { else: it.else } : {}), ...(it.hidden ? { hidden: true } : {}) }));
const presetHex = (p) => ({ ...p, skin: hexOf('body', p.skin), hairColor: hexOf('hair', p.hairColor), topColor: hexOf('cloth', p.topColor), bottomColor: hexOf('cloth', p.bottomColor), shoesColor: hexOf('cloth', p.shoesColor), hatColor: hexOf('cloth', p.hatColor) });
const parts = {
  note: '由 tools/lpc/build-characters.mjs 從 tools/lpc/characters.json 產生，不要手改。顏色存的是 LPC 色票的代表色（lpcColors 對回色票名稱）；legacy 是舊零件名稱對到新零件',
  eyes: CAT.eyes, brows: listOf('brows'), mouths: CAT.mouths, hair: listOf('hair'), top: listOf('top'), bottom: listOf('bottom'), shoes: listOf('shoes'), hat: listOf('hat'), acc: listOf('acc'),
  colors, lpcColors, genders: CAT.genders, presets: { boy: presetHex(CAT.presets.boy), girl: presetHex(CAT.presets.girl) }, legacy: CAT.legacy,
};
await writeFile(path.join(ROOT, 'public/games/farm/data/doll/parts.json'), JSON.stringify(parts, null, 1));

// 作者名單：每個用到的定義檔的 credits，只留跟用到的圖有關的那幾筆
const rows = [], authors = new Set(), licenses = new Set();
for (const [p, srcs] of usedDefs) {
  const d = await def(p);
  const rel = (d.credits || []).filter((c) => [...srcs].some((s) => s.startsWith(c.file) || c.file.startsWith(s.replace(/\/$/, ''))));
  for (const c of rel.length ? rel : d.credits || []) {
    rows.push(c); (c.authors || []).forEach((a) => authors.add(a)); (c.licenses || []).forEach((l) => licenses.add(l));
  }
}
const seen = new Set(), uniq = rows.filter((c) => { const k = c.file + '|' + (c.authors || []).join(','); if (seen.has(k)) return false; seen.add(k); return true; });
const csv = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
await writeFile(path.join(OUT_IMG, 'CREDITS.csv'), 'filename,notes,authors,licenses,urls\n' + uniq.map((c) => [c.file, c.notes, (c.authors || []).join(', '), (c.licenses || []).join(', '), (c.urls || []).join(' ')].map(csv).join(',')).join('\n') + '\n');
await writeFile(path.join(ROOT, 'public/games/farm/data/credits-lpc.json'), JSON.stringify({ note: '角色圖（LPC）的作者名單，由 tools/lpc/build-characters.mjs 產生', source: CAT.generator.repo, authors: [...authors].sort((a, b) => a.localeCompare(b)), licenses: [...licenses].sort() }, null, 1));
console.log(`抄了 ${copied} 張圖（產生器裡沒有的 ${missing} 張）、${usedDefs.size} 個定義檔、${uniq.length} 筆作者資料 → ${path.relative(ROOT, OUT_DATA)}`);
