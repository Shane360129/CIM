// LPC 角色：照外觀把零件圖（assets/lpc/）一層一層疊起來、換成選的顏色，拼好的整張動作圖快取起來，每一格畫面只要貼一小塊。
// 零件有哪些圖層、前後順序、怎麼換色，寫在 data/doll/lpc.json（tools/lpc/build-characters.mjs 產生）。
// 圖還沒下載好的時候先回傳 false，呼叫的人畫暫代的樣子；下載好之後自動換成真的。
import { upgradeLook } from '../shared/look.js';

const ROOT = new URL('../assets/lpc/', import.meta.url).href;
const ROW = { up: 0, left: 1, down: 2, right: 3 }; // LPC 每張動作圖由上到下：背面、向左、正面、向右
export const FOOT = 62; // 64 像素的一格裡，腳底在第幾列
let LPC = null, PARTS = null;
export function initLPC(lpc, parts) { LPC = lpc; PARTS = parts; }
export const lpcReady = () => !!LPC;

// ---------- 圖：要用的時候才下載，下載好就記著 ----------
const imgs = new Map();
function img(src) {
  let e = imgs.get(src);
  if (!e) {
    e = { im: null, failed: false }; imgs.set(src, e);
    const i = new Image(); i.decoding = 'async';
    i.onload = () => { e.im = i; }; i.onerror = () => { e.failed = true; };
    i.src = ROOT + src;
  }
  return e;
}
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ---------- 換色：把原本那組顏色（色票）換成目標那組，同一個位置的深淺對應；換好的圖記著 ----------
const recolors = new Map();
function recolor(im, pairs, key) {
  if (!pairs.length) return im;
  let c = recolors.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data, memo = new Map();
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const k = (a[i] << 16) | (a[i + 1] << 8) | a[i + 2];
    let to = memo.get(k);
    if (to === undefined) { to = null; for (const [f, t] of pairs) if (Math.abs(f[0] - a[i]) <= 3 && Math.abs(f[1] - a[i + 1]) <= 3 && Math.abs(f[2] - a[i + 2]) <= 3) { to = t; break; } memo.set(k, to); }
    if (to) { a[i] = to[0]; a[i + 1] = to[1]; a[i + 2] = to[2]; }
  }
  g.putImageData(d, 0, 0);
  if (recolors.size > 400) recolors.delete(recolors.keys().next().value);
  recolors.set(key, c); return c;
}

// ---------- 外觀 → 要畫的圖層 ----------
// look 可以多帶 body（male／female／teen）、head（男、女、小、老…）給居民用；玩家只有性別
const resolved = new Map();
function resolve(look) {
  const sig = JSON.stringify(look); let r = resolved.get(sig); if (r) return r;
  const L = upgradeLook(look, PARTS), gd = PARTS.genders[L.gender] || PARTS.genders.boy;
  const body = L.body && LPC.body[L.body] ? L.body : gd.body, head = L.head && LPC.heads[L.head] ? L.head : gd.head;
  const P = LPC.palettes, color = { skin: PARTS.lpcColors.skin[L.skin] || 'light', eye: L.eyes, hair: PARTS.lpcColors.hair[L.hairColor] || 'dark_brown' };
  const cloth = (hex) => PARTS.lpcColors.cloth[hex] || 'white';
  const layers = [];
  const add = (list, slot) => {
    for (const l of list || []) {
      const pairs = [];
      for (const [mat, base, use] of l.mats) {
        const to = use === 'skin' ? color.skin : use === 'eye' ? color.eye : use === 'hair' ? color.hair : use === 'cloth' ? slot : use.startsWith('fixed:') ? use.slice(6) : base;
        if (!to || to === base || !P[mat] || !P[mat][base] || !P[mat][to]) continue;
        P[mat][base].forEach((f, i) => pairs.push([hexRgb(f), hexRgb(P[mat][to][i])]));
      }
      layers.push({ ...l, pairs, pkey: pairs.length ? l.mats.map(([m, b, u]) => `${m}:${u === 'cloth' ? slot : u}`).join(',') + '|' + Object.values(color).join(',') : '' });
    }
  };
  const part = (cat, id) => { let e = LPC.parts[cat][id]; if (e && !e[body] && e.else) e = LPC.parts[cat][e.else]; return e ? e[body] : null; };
  add(LPC.body[body]); add(LPC.heads[head] && LPC.heads[head][body]);
  if (L.mouths === 'blush') add(face('blush', head, body));
  add(part('brows', L.brows)); add(part('hair', L.hair));
  add(part('top', L.top), cloth(L.topColor)); add(part('bottom', L.bottom), cloth(L.bottomColor)); add(part('shoes', L.shoes), cloth(L.shoesColor));
  add(part('hat', L.hat), cloth(L.hatColor)); add(part('acc', L.acc));
  r = { sig, body, head, layers, look: L };
  if (resolved.size > 300) resolved.delete(resolved.keys().next().value);
  resolved.set(sig, r); return r;
}
function face(expr, head, body) { const f = LPC.faces[expr], k = LPC.heads[head] && LPC.heads[head].face; return f && f[k] ? f[k][body] : null; }

// ---------- 拼一整張動作圖 ----------
const sheets = new Map(), lastSheet = new WeakMap();
// 這個外觀做得出這個動作嗎：每一層都要有這個動作的圖（例如洋裝沒有坐下的圖，就改用站著）
const canPlay = (r, anim) => r.layers.every((l) => l.custom || !l.anims.length || l.anims.includes(anim));
function sheet(r, anim, extra = []) {
  const key = r.sig + '|' + anim + '|' + extra.map((l) => l.src).join(',');
  let c = sheets.get(key); if (c) return c;
  const list = [...r.layers, ...extra.map((l) => (l.pairs ? l : { ...l, pairs: [], pkey: '' }))].filter((l) => !l.custom && l.anims.includes(anim)).sort((a, b) => a.z - b.z); // 工具那幾層不換色
  const ims = list.map((l) => img(`${l.src}${anim}.png`));
  if (ims.some((e) => !e.im && !e.failed)) return null; // 還在下載
  const first = ims.find((e) => e.im); if (!first) return null;
  c = document.createElement('canvas'); c.width = (LPC.anims[anim] || 1) * 64; c.height = 256;
  const g = c.getContext('2d');
  list.forEach((l, i) => { const e = ims[i]; if (e.im) g.drawImage(recolor(e.im, l.pairs, `${l.src}${anim}|${l.pkey}`), 0, 0); });
  if (sheets.size > 160) sheets.delete(sheets.keys().next().value);
  sheets.set(key, c); return c;
}
// 揮斧頭、鎬、釣竿：工具的圖一格 128 像素，人物用揮砍／刺的那幾格放在中間（照產生器的 custom animation）
function customSheet(r, name, tool) {
  const key = r.sig + '|' + name + '|' + tool; let c = sheets.get(key); if (c) return c;
  const def = LPC.custom[name], base = sheet(r, def.base); if (!base) return null;
  const tl = (LPC.tools[tool] && LPC.tools[tool][r.body] || []).filter((l) => l.custom === name);
  const ims = tl.map((l) => img(`${l.src}.png`)); if (ims.some((e) => !e.im && !e.failed)) return null;
  const fs = def.frame, n = def.cols.length, off = (fs - 64) / 2;
  c = document.createElement('canvas'); c.width = n * fs; c.height = 4 * fs; const g = c.getContext('2d');
  for (let row = 0; row < 4; row++) for (let i = 0; i < n; i++) {
    // 工具圖有兩種排法：跟這個動作一樣多格（釣竿 13 格）就照順序拿；只有原本動作的格數（斧頭、鎬是揮砍的 6 格）就照對應的那一格拿
    const col = (im) => (im.width / fs >= n ? i : def.cols[i]);
    tl.forEach((l, k) => { if (l.z < 10 && ims[k].im) g.drawImage(ims[k].im, col(ims[k].im) * fs, row * fs, fs, fs, i * fs, row * fs, fs, fs); }); // 在人後面的那層（例如斧頭揮到背後）
    g.drawImage(base, def.cols[i] * 64, row * 64, 64, 64, i * fs + off, row * fs + off, 64, 64);
    tl.forEach((l, k) => { if (l.z >= 10 && ims[k].im) g.drawImage(ims[k].im, col(ims[k].im) * fs, row * fs, fs, fs, i * fs, row * fs, fs, fs); });
  }
  if (sheets.size > 160) sheets.delete(sheets.keys().next().value);
  sheets.set(key, c); return c;
}

// ---------- 遊戲的動作 → LPC 的動作和第幾格 ----------
// t：這個動作開始後過了幾秒（走路、待機是一直在跑的時間）
function pick(r, action, t, tool) {
  const once = (n, dur) => Math.min(n - 1, Math.floor((t / dur) * n));
  const toolLayers = (id, anim) => (LPC.tools[id] && LPC.tools[id][r.body] || []).filter((l) => !l.custom && l.anims.includes(anim));
  switch (action) {
    case 'walk': return { anim: 'walk', f: 1 + (Math.floor(t * 11) % 8) };
    case 'swing':
      if ((tool === 'axe' || tool === 'pick') && LPC.tools[tool] && LPC.tools[tool][r.body]) return { custom: 'tool_axe', tool, f: once(LPC.custom.tool_axe.cols.length, 0.5) };
      if (tool === 'hoe') return { anim: 'thrust', extra: toolLayers('hoe', 'thrust'), f: once(8, 0.45) };
      return { anim: 'slash', extra: toolLayers('blade', 'slash'), f: once(6, 0.35) };
    case 'water': { const k = Math.floor(t * 8); return { anim: 'thrust', extra: toolLayers('can', 'thrust'), f: k < 4 ? [0, 1, 4, 5][k] : 4 + (k % 2) }; } // 澆水壺只畫在刺的第 0、1、4、5 格
    case 'cast': return LPC.tools.rod[r.body] ? { custom: 'tool_rod', tool: 'rod', f: once(7, 0.55) } : { anim: 'thrust', f: once(8, 0.55) };
    case 'fishing': return LPC.tools.rod[r.body] ? { custom: 'tool_rod', tool: 'rod', f: 6 + (Math.floor(t * 1.5) % 3) } : { anim: 'idle', f: 0 };
    case 'sweep': { const k = Math.floor(t * 7) % 6; return { anim: 'thrust', f: [3, 4, 5, 6, 5, 4][k] }; }
    case 'sit': return { anim: 'sit', f: 0 };
    case 'happy': return { anim: 'idle', f: 0, hop: Math.sin(Math.min(1, t / 0.5) * Math.PI) * 6 };
    default: return { anim: 'idle', f: Math.floor(t * 1.6) % 2 };
  }
}

// 畫一個角色：(x, y) 是腳底中心；px 是一個 LPC 像素在畫面上多大；dir：down、up、left、right
export function drawLPC(g, look, x, y, px, dir, action, t, tool) {
  if (!LPC || !look) return false;
  const r = resolve(look); let p = pick(r, action, t, tool);
  if (!p.custom && !canPlay(r, p.anim)) p = { anim: canPlay(r, 'idle') ? 'idle' : 'walk', f: 0 };
  let c = p.custom ? customSheet(r, p.custom, p.tool) : sheet(r, p.anim, p.extra);
  let fs = p.custom ? LPC.custom[p.custom].frame : 64;
  if (!c && p.custom) { c = sheet(r, 'idle') || sheet(r, 'walk'); fs = 64; p = { f: 0 }; } // 工具的圖還沒好：先站著
  if (!c) { const prev = lastSheet.get(look); if (!prev) return false; c = prev.c; fs = prev.fs; p = { f: 0 }; } // 換裝中：先畫上一次的樣子
  else lastSheet.set(look, { c, fs });
  const row = ROW[dir] ?? 2, f = Math.max(0, Math.min(p.f, c.width / fs - 1)), foot = FOOT + (fs - 64) / 2;
  const was = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  g.drawImage(c, f * fs, row * fs, fs, fs, x - (fs / 2) * px, y - (foot + (p.hop || 0)) * px, fs * px, fs * px);
  g.imageSmoothingEnabled = was;
  return true;
}
// 先把這些外觀要用的圖下載好（進遊戲時先叫一次，角色出來就不會閃）
export function warmLPC(looks, anims = ['walk', 'idle']) {
  for (const look of looks) { if (!look) continue; const r = resolve(look); for (const a of anims) for (const l of r.layers) if (!l.custom && l.anims.includes(a)) img(`${l.src}${a}.png`); }
}
// 對話框的頭像：正面站著那一格的頭和肩膀放大；表情 happy／sad 疊在臉上
export function portraitLPC(look, expr = 'normal', size = 96) {
  if (!LPC || !look) return null;
  const r = resolve(look), extra = expr === 'happy' || expr === 'sad' ? face(expr, r.head, r.body) || [] : [];
  const fr = extra.length ? { ...r, sig: r.sig + '|' + expr, layers: [...r.layers, ...resolveExtra(r, extra)] } : r;
  const c = sheet(fr, 'walk'); if (!c) return null;
  const out = document.createElement('canvas'); out.width = out.height = size; const g = out.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(c, 14, 2 * 64 + 6, 36, 36, 0, 0, size, size); // 正面第 0 格：頭在 x 14～50、y 6～42 這一塊
  return out;
}
function resolveExtra(r, list) {
  const P = LPC.palettes, skin = PARTS.lpcColors.skin[r.look.skin] || 'light';
  return list.map((l) => { const pairs = []; for (const [mat, base, use] of l.mats) if (use === 'skin' && skin !== base && P[mat][skin]) P[mat][base].forEach((f, i) => pairs.push([hexRgb(f), hexRgb(P[mat][skin][i])])); return { ...l, pairs, pkey: 'skin:' + skin }; });
}
