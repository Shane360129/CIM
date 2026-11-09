// 32×32 高解析度像素圖（第一期：地面、田、作物、人物、動物、樹）
// 畫法：先用平塗的顏色畫出形狀，再自動補上明暗（左上亮一階偏暖、右下暗兩階偏冷），最後描一圈同色系的深色外框。
// 每張圖都是 32×32（樹是 32×40），在遊戲裡畫成一格（16 個單位）大小：c.hd = 2 表示「兩個像素算一個單位」，
// c.oy 表示要往上多畫幾個像素（樹比較高）。還沒換的圖照舊用 farm-sprites.js 的 16×16
const cache = new Map();
const rnd = (s) => () => ((s = (s * 9301 + 49297) % 233280) / 233280);

// ---------- 顏色：HSL、亮部偏暖（黃）、暗部偏冷（藍） ----------
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  return [h, s, l];
}
function toRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
}
const toward = (h, t, k) => { const d = ((t - h + 540) % 360) - 180; return (h + d * k + 360) % 360; };
const shadeRgb = (rgb, dl) => {
  if (!dl) return rgb;
  const [h, s, l] = toHsl(rgb);
  // 色相只偏一點點：偏太多的話橘色、膚色的暗部會變成很刺眼的紅色
  return toRgb([toward(h, dl > 0 ? 55 : 235, Math.min(0.12, Math.abs(dl) * 0.5)), Math.min(1, s * (dl > 0 ? 0.95 : 1.02)), Math.max(0, Math.min(1, l + dl))]);
};
export const shade = (col, dl) => toHex(shadeRgb(hex(col), dl));
// 一個顏色的五階：最暗、暗、本色、亮、最亮
const ramp = (base) => [shade(base, -0.2), shade(base, -0.1), base, shade(base, 0.08), shade(base, 0.18)];

// ---------- 畫布工具 ----------
function px(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const r = (col, x, y, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  const disc = (col, cx, cy, rx, ry = rx) => {
    for (let y = -ry; y <= ry; y++) { const ww = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01)))); r(col, cx - ww, cy + y, ww * 2 + 1, 1); }
  };
  draw(r, disc, g);
  return c;
}
// 自動明暗：左上邊緣亮一階、右下邊緣暗一階、再往裡一點點暗半階
function autoShade(c, hi = 0.11, lo = -0.13) {
  const g = c.getContext('2d'), w = c.width, h = c.height, d = g.getImageData(0, 0, w, h), a = d.data, src = new Uint8ClampedArray(a);
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 128;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (!op(x, y) || src[i + 3] < 250) continue;
    let dl = 0;
    if (!op(x - 1, y) || !op(x, y - 1)) dl = hi; else if (!op(x + 1, y) || !op(x, y + 1)) dl = lo; else if (!op(x + 2, y + 1) || !op(x + 1, y + 2)) dl = lo / 2;
    if (dl) { const [R, G, B] = shadeRgb([src[i], src[i + 1], src[i + 2]], dl); a[i] = R; a[i + 1] = G; a[i + 2] = B; }
  }
  g.putImageData(d, 0, 0); return c;
}
// 外框：用旁邊最深的那個顏色再暗下去（偏冷），不是純黑
function outline(c, k = -0.4) {
  const g = c.getContext('2d'), w = c.width, h = c.height, d = g.getImageData(0, 0, w, h), a = d.data, src = new Uint8ClampedArray(a);
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 200 ? (y * w + x) * 4 : -1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (src[i + 3] > 40) continue;
    const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].filter((v) => v >= 0); if (!n.length) continue;
    const j = n.reduce((m, v) => (src[v] + src[v + 1] + src[v + 2] < src[m] + src[m + 1] + src[m + 2] ? v : m), n[0]);
    // 外框一律很深、不要太鮮豔（膚色、橘貓的外框才不會變成紅色）
    const [hh, ss, ll] = toHsl([src[j], src[j + 1], src[j + 2]]);
    const [R, G, B] = toRgb([toward(hh, 235, 0.08), ss * 0.7, Math.max(0.06, Math.min(0.22, ll + k))]); a[i] = R; a[i + 1] = G; a[i + 2] = B; a[i + 3] = 255;
  }
  g.putImageData(d, 0, 0); return c;
}
const flipped = (c) => { const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const g = f.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return f; };
const obj = (w, h, draw) => outline(autoShade(px(w, h, draw)));
const hd = (c, oy = 0) => { c.hd = 2; c.oy = oy; return c; };

// ---------- 季節的顏色 ----------
const GROUND = { spring: '#68b44f', summer: '#62ad4b', autumn: '#93a04b', winter: '#adbda6', snow: '#e8eff6' }; // snow：下雪的山上，路邊的雪
const groundOf = (season) => GROUND[season] || GROUND.summer;
const LEAF = ['#1f4f2c', '#2f7a36', '#4fa043', '#7cc75a', '#b3e27f'];
const TREE_LEAF = {
  spring: ['#24572f', '#35823a', '#55a948', '#80cc5e', '#b8e584'], summer: LEAF,
  autumn: ['#5e3a12', '#8f5a1d', '#c98a2b', '#e8b04a', '#f6d27a'], winter: ['#14302a', '#1f4a3a', '#2f6f48', '#4f8f62', '#9fc4a8'],
  cherry: ['#8a3a5a', '#c25a86', '#e88ab0', '#f6b6cf', '#ffe0ec'], maple: ['#5e140c', '#8f2a1d', '#cc4a2e', '#ec7b3e', '#f6a65a'],
};
const BARK = ['#3e2618', '#5e3b22', '#7d5232', '#9c6b45'];
const DIRT = ['#8a6440', '#b08454', '#cfa772', '#e3c592', '#f1dcb0'];
const SOIL = ['#4a2e1c', '#6a4428', '#8a5a34', '#a8744a'], WSOIL = ['#2e1d14', '#4a2f1d', '#5f3e26', '#76502f'];

// ---------- 地面 ----------
function grass(v, season) {
  const G = ramp(groundOf(season));
  return px(32, 32, (r) => {
    r(G[2], 0, 0, 32, 32); const q = rnd(v * 31 + 7);
    for (let i = 0; i < 24; i++) { const x = Math.floor(q() * 30) + 1, y = Math.floor(q() * 28) + 3; r(G[1], x, y, 1, 2); r(G[1], x + 1, y + 1, 1, 1); r(q() > 0.5 ? G[3] : G[4], x, y - 1, 1, 1); }
    for (let i = 0; i < 10; i++) r(G[3], Math.floor(q() * 31), Math.floor(q() * 31), 2, 1);
    for (let i = 0; i < 4; i++) r(G[0], Math.floor(q() * 31), Math.floor(q() * 31), 1, 1);
    if (season === 'winter') for (let i = 0; i < 6; i++) r('#f4f8fc', Math.floor(q() * 31), Math.floor(q() * 31), 1, 1); // 冬天的霜
  });
}
const FLOWER_COLORS = { spring: ['#ff5a5a', '#ffd84a', '#ffffff', '#ff9ec7', '#b98cff'], summer: ['#ff5a5a', '#ffd84a', '#ffffff', '#ff9ec7', '#ff8a3a'],
  autumn: ['#f6a03a', '#ffd84a', '#c86a2a', '#ffffff', '#e05a3a'], winter: ['#ffffff', '#e8eef6', '#ffd8e8', '#ffffff', '#d8e8ff'] };
function flowers(season) {
  const base = grass(5, season), cols = FLOWER_COLORS[season] || FLOWER_COLORS.summer;
  const f = obj(32, 32, (r) => {
    [[6, 9], [21, 6], [13, 19], [25, 21], [6, 25]].forEach(([x, y], i) => {
      r(LEAF[1], x, y + 3, 1, 5); r(LEAF[3], x + 1, y + 5, 2, 1);
      const c = cols[i % cols.length]; r(c, x - 1, y, 3, 3); r(c, x - 2, y + 1, 5, 1); r(c, x, y - 1, 1, 5); r('#f6c73a', x, y + 1, 1, 1);
    });
  });
  base.getContext('2d').drawImage(f, 0, 0); return base;
}
function path(v) {
  return px(32, 32, (r) => {
    r(DIRT[3], 0, 0, 32, 32); const q = rnd(v * 17 + 3);
    for (let i = 0; i < 40; i++) r(q() > 0.5 ? DIRT[2] : DIRT[4], Math.floor(q() * 32), Math.floor(q() * 32), 1, 1);
    for (let i = 0; i < 5; i++) { const x = Math.floor(q() * 27) + 2, y = Math.floor(q() * 26) + 3; r(DIRT[1], x, y, 4, 2); r(DIRT[2], x, y, 3, 1); r(DIRT[4], x, y, 1, 1); r(DIRT[0], x + 1, y + 2, 3, 1); }
  });
}
// 小路旁邊的草：草尖垂到路上
function fringe(side, season) {
  const G = ramp(groundOf(season));
  return px(32, 32, (r) => {
    const q = rnd(side.length * 7 + 1);
    for (let i = 0; i < 32; i += 2) {
      const L = 1 + Math.floor(q() * 3);
      if (side === 'top') { r(G[2], i, 0, 2, L); r(G[1], i, L, 1, 1); }
      else if (side === 'bottom') { r(G[2], i, 32 - L, 2, L); r(G[3], i, 32 - L - 1, 1, 1); }
      else if (side === 'left') { r(G[2], 0, i, L, 2); r(G[1], L, i, 1, 1); }
      else { r(G[2], 32 - L, i, L, 2); r(G[1], 31 - L, i, 1, 1); }
    }
  });
}
// 還沒翻的田：土裡冒出一點草
function field(season) {
  const G = ramp(groundOf(season));
  return px(32, 32, (r) => {
    r('#b08a5a', 0, 0, 32, 32); const q = rnd(23);
    for (let i = 0; i < 50; i++) r(q() > 0.5 ? '#9a7448' : '#c4a070', Math.floor(q() * 32), Math.floor(q() * 32), 1, 1);
    for (let i = 0; i < 12; i++) { const x = Math.floor(q() * 30) + 1, y = Math.floor(q() * 28) + 3; r(G[1], x, y, 1, 2); r(G[3], x, y - 1, 1, 1); r(G[2], x + 1, y, 1, 1); }
  });
}
function soil(wet) {
  const S = wet ? WSOIL : SOIL;
  return px(32, 32, (r) => {
    r(S[2], 0, 0, 32, 32); const q = rnd(wet ? 5 : 9);
    for (let y = 2; y < 32; y += 8) { r(S[3], 1, y, 30, 2); r(S[1], 1, y + 4, 30, 2); r(S[0], 2, y + 5, 28, 1); }
    for (let i = 0; i < 14; i++) { const x = Math.floor(q() * 30), y = Math.floor(q() * 30); r(S[3], x, y, 2, 1); r(S[1], x, y + 1, 2, 1); }
    if (wet) for (let i = 0; i < 5; i++) r('#9cc4e8', Math.floor(q() * 30) + 1, Math.floor(q() * 30) + 1, 2, 1);
  });
}

// ---------- 樹（32×40，往上多畫 8 個像素） ----------
function tree(kind) {
  const L = TREE_LEAF[kind === 'snow' ? 'winter' : kind] || LEAF;
  const BLOBS = [[16, 15, 12], [9, 19, 7], [23, 19, 7], [16, 7, 8], [10, 11, 6], [22, 11, 6]];
  const c = obj(32, 40, (r, disc) => {
    r(BARK[2], 13, 22, 6, 16); r(BARK[1], 17, 22, 2, 16); r(BARK[3], 14, 24, 1, 12); r(BARK[1], 10, 36, 4, 2); r(BARK[1], 18, 36, 4, 2);
    r(BARK[0], 15, 28, 2, 1); r(BARK[0], 16, 33, 2, 1);
    for (const [x, y, rr] of BLOBS) disc(L[2], x, y, rr);
    // 葉子的紋路只畫在樹冠裡面（畫到外面會變成一根一根翹起來的雜點）
    const inside = (x, y) => BLOBS.some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 <= (rr - 1.5) ** 2);
    const dot = (col, x, y) => { if (inside(x, y) && inside(x + 1, y)) r(col, x, y, 2, 1); };
    const q = rnd(9);
    for (let i = 0; i < 40; i++) { const x = Math.floor(q() * 26) + 3, y = Math.floor(q() * 22) + 2; dot(x + y < 26 ? L[3] : L[1], x, y); }
    for (const [x, y] of [[8, 9], [12, 5], [6, 14], [15, 3]]) dot(L[4], x, y);
    if (kind === 'spring') for (const [x, y] of [[9, 10], [20, 6], [24, 15], [13, 18], [18, 13]]) { r('#ffffff', x, y, 1, 1); r('#ffd0e0', x + 1, y, 1, 1); }
    if (kind === 'winter') for (let i = 0; i < 14; i++) dot('#f4f8fc', Math.floor(q() * 22) + 5, Math.floor(q() * 10) + 2);
    if (kind === 'snow') { // 下雪天：每一團葉子上面都積了一層雪
      for (const [x, y, rr] of BLOBS) { const h = Math.max(2, Math.round(rr / 2)); disc('#eef4fa', x, y - rr + h, rr - 1, h); }
      for (const [x, y] of [[7, 20], [24, 22], [13, 25], [19, 17]]) r('#eef4fa', x, y, 2, 1);
    }
  });
  return hd(c, 8);
}

// ---------- 作物 ----------
const PLANT = (draw) => obj(32, 32, draw);
const sproutArt = (seed) => PLANT((r, disc) => {
  if (seed) { r(SOIL[3], 11, 22, 10, 3); r(SOIL[1], 12, 24, 8, 1); r(LEAF[1], 15, 18, 2, 5); disc(LEAF[3], 13, 18, 2, 1); disc(LEAF[3], 18, 17, 2, 1); return; }
  r(LEAF[1], 15, 16, 2, 9); disc(LEAF[3], 11, 15, 4, 2); disc(LEAF[3], 20, 14, 4, 2); r(LEAF[4], 9, 14, 3, 1); r(LEAF[4], 19, 13, 3, 1); r(LEAF[2], 15, 11, 2, 4);
});
const CROP_ART = {
  bokchoy: (s) => PLANT((r, disc) => {
    const n = s - 1;
    for (let i = -n; i <= n; i++) { const x = 15 + i * 3; r('#e8f2d6', x, 20 - Math.abs(i) * 2 - n, 3, 9 + n); r('#c8dcb0', x + 2, 22 - Math.abs(i) * 2 - n, 1, 7 + n); }
    for (let i = -n; i <= n; i++) { const x = 16 + i * (4 + n), y = 12 - n * 2 + Math.abs(i) * 3; disc(LEAF[2], x, y, 3 + n, 4 + n); r('#d8eebc', x, y - 2 - n, 1, 5 + n * 2); }
  }),
  cabbage: (s) => PLANT((r, disc) => {
    if (s === 2) { for (const [x, y] of [[9, 18], [23, 18], [16, 12]]) { disc(LEAF[2], x, y, 6, 5); r('#9ad08a', x, y - 3, 1, 6); } disc('#a6d878', 16, 20, 5, 4); return; }
    disc(LEAF[2], 16, 20, 13, 9); disc(LEAF[1], 16, 23, 12, 5); disc('#a6d878', 16, 17, 9, 8); disc('#c6e8a0', 14, 14, 5, 4);
    r('#86bd5c', 16, 10, 1, 14); for (const [x, y] of [[11, 15], [20, 14], [12, 20], [20, 20]]) r('#86bd5c', x, y, 3, 1);
  }),
  tomato: (s) => PLANT((r, disc) => {
    r(BARK[3], 22, 3, 2, 26); r(LEAF[1], 15, 6, 2, 23); r(LEAF[1], 16, 12, 6, 1); r(LEAF[1], 10, 16, 6, 1);
    for (const [x, y] of [[9, 9], [21, 9], [8, 21], [20, 19], [14, 4]]) { disc(LEAF[2], x, y, 4, 2); r(LEAF[3], x - 2, y - 1, 3, 1); }
    for (const [x, y] of [[11, 13], [20, 13], [12, 24], [19, 24]]) { disc(s === 3 ? '#d83a32' : '#8cc44f', x, y, 3); r(s === 3 ? '#ffb0a0' : '#d6f0a6', x - 1, y - 2, 1, 1); r(LEAF[1], x, y - 3, 1, 1); }
  }),
  carrot: (s) => PLANT((r, disc) => {
    const n = s === 3 ? 7 : 5;
    for (let i = 0; i < n; i++) { const x = (16 - n) + i * 2 + 1; r(LEAF[2], x, 6 + (i % 3) + (s === 2 ? 4 : 0), 1, 14 - (i % 3)); r(LEAF[3], x - 1, 7 + (i % 3) * 2 + (s === 2 ? 4 : 0), 3, 1); }
    if (s === 3) { disc('#ef8a2e', 16, 22, 6, 3); r('#ef8a2e', 12, 22, 9, 5); r('#ffb060', 13, 21, 3, 2); r('#c86a1e', 12, 25, 9, 1); r('#c86a1e', 14, 27, 5, 2); }
  }),
  strawberry: (s) => PLANT((r, disc) => {
    for (const [x, y] of [[9, 17], [22, 17], [16, 12], [12, 22], [21, 23]]) { disc(LEAF[2], x, y, 4, 3); r(LEAF[3], x - 2, y - 1, 2, 1); r(LEAF[1], x, y + 1, 3, 1); }
    if (s === 2) for (const [x, y] of [[13, 15], [19, 19]]) { disc('#ffffff', x, y, 2); r('#f6d34a', x, y, 1, 1); }
    if (s === 3) for (const [x, y] of [[12, 24], [20, 25], [16, 20]]) { disc('#e0303a', x, y, 3, 3); r('#e0303a', x - 1, y + 3, 3, 1); r('#ffd84a', x - 1, y, 1, 1); r('#ffd84a', x + 1, y + 1, 1, 1); r(LEAF[3], x - 2, y - 3, 5, 1); }
  }),
  corn: (s) => PLANT((r, disc) => {
    r(LEAF[1], 15, 2, 3, 28); for (const [y, d] of [[10, -1], [15, 1], [20, -1], [24, 1]]) { for (let i = 0; i < 9; i++) r(LEAF[2], 16 + d * (i + 1), y - Math.floor(i / 3), 1, 2); }
    if (s === 3) { r('#e8c25a', 15, 0, 3, 3); r('#c9a03a', 14, 1, 1, 2); r('#c9a03a', 18, 1, 1, 2);
      for (const x of [10, 19]) { r('#7ab84f', x, 12, 4, 10); r('#f6d34a', x + 1, 13, 2, 7); for (let y = 13; y < 20; y += 2) r('#e8b42a', x + 1, y, 2, 1); r('#e8d8a0', x + 1, 11, 2, 2); } }
  }),
  watermelon: (s) => PLANT((r, disc) => {
    for (const [x, y] of [[6, 14], [24, 12], [14, 8], [26, 22]]) { disc(LEAF[2], x, y, 4, 3); r(LEAF[3], x - 2, y - 1, 2, 1); }
    r(LEAF[1], 4, 18, 24, 1); r(LEAF[1], 18, 10, 1, 9);
    if (s === 2) { disc('#5fae3f', 14, 22, 5, 4); for (let x = 11; x < 18; x += 3) r('#2f7a36', x, 19, 1, 7); return; }
    disc('#3f9a3f', 15, 21, 11, 8); for (let x = 6; x < 26; x += 4) for (let y = 14; y < 29; y++) if (((x - 15) ** 2) / 121 + ((y - 21) ** 2) / 64 < 0.9) r('#1f6a2a', x + ((y % 3) === 0 ? 1 : 0), y, 2, 1);
    r('#8fd16a', 9, 16, 4, 1);
  }),
  eggplant: (s) => PLANT((r, disc) => {
    r(LEAF[1], 15, 6, 2, 24); r(LEAF[1], 16, 12, 6, 1); r(LEAF[1], 10, 16, 6, 1);
    for (const [x, y] of [[9, 9], [22, 9], [8, 20], [23, 19], [15, 4]]) { disc(LEAF[2], x, y, 5, 3); r('#5e8a4a', x, y - 1, 3, 1); }
    if (s === 2) { for (const [x, y] of [[12, 14], [20, 15]]) { disc('#b56ee0', x, y, 2); r('#f6d34a', x, y, 1, 1); } return; }
    for (const [x, y] of [[11, 15], [20, 17]]) { r('#3f8a34', x - 1, y - 2, 4, 2); disc('#6a2a8a', x + 1, y + 5, 3, 6); r('#9a5ac6', x, y + 2, 1, 5); }
  }),
  pumpkin: (s) => PLANT((r, disc) => {
    for (const [x, y] of [[6, 12], [25, 14], [13, 7], [24, 6]]) { disc(LEAF[2], x, y, 5, 4); r(LEAF[3], x - 2, y - 2, 3, 1); }
    r(LEAF[1], 4, 15, 24, 1);
    if (s === 2) { disc('#7cbc48', 15, 22, 5, 4); r('#5a9a3a', 15, 18, 1, 8); return; }
    disc('#e8802e', 16, 21, 12, 8); for (const x of [10, 16, 22]) r('#c8601e', x, 14, 1, 15); r('#ffaa5a', 9, 16, 3, 2); r(BARK[1], 15, 11, 3, 4); r(LEAF[2], 18, 11, 4, 2);
  }),
  sweetpotato: (s) => PLANT((r, disc) => {
    for (const [x, y] of [[8, 10], [22, 9], [15, 15], [7, 20], [24, 20]]) { disc(LEAF[2], x, y, 4, 3); r(LEAF[2], x, y + 3, 1, 1); r('#a8d878', x - 1, y - 1, 2, 1); }
    r('#7a4a8a', 6, 16, 22, 1);
    if (s === 3) for (const [x, y] of [[10, 25], [20, 26]]) { disc('#a8405a', x, y, 5, 3); r('#d8708a', x - 2, y - 2, 3, 1); }
  }),
  radish: (s) => PLANT((r, disc) => {
    for (const a of [-2, -1, 0, 1, 2]) { const x = 16 + a * 4; disc(LEAF[2], x, 11 + Math.abs(a) * 2 + (s === 2 ? 3 : 0), 3, 6); r('#a8d878', x, 7 + Math.abs(a) * 2 + (s === 2 ? 3 : 0), 1, 9); }
    if (s === 3) { r('#f4f4ea', 12, 20, 9, 8); r('#ffffff', 13, 20, 3, 6); r('#d8d8c8', 18, 22, 2, 6); r('#a6d878', 12, 19, 9, 2); }
  }),
  spinach: (s) => PLANT((r, disc) => {
    const n = s === 3 ? 6 : 4;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = Math.round(16 + Math.cos(a) * (s === 3 ? 8 : 6)), y = Math.round(18 + Math.sin(a) * (s === 3 ? 6 : 4));
      disc('#2f7a36', x, y, s === 3 ? 5 : 4, s === 3 ? 4 : 3); r('#5fae3f', x, y - 2, 1, 4); r('#a8405a', x, y + 3, 1, 2); }
    disc('#3f8f3a', 16, 17, 3);
  }),
  potato: (s) => PLANT((r, disc) => {
    for (const [x, y] of [[9, 12], [22, 11], [16, 7], [8, 19], [23, 18], [15, 16]]) { disc(LEAF[2], x, y, 4, 3); r(LEAF[3], x - 2, y - 1, 2, 1); }
    if (s === 2) { for (const [x, y] of [[12, 6], [20, 5]]) { disc('#ffffff', x, y, 2); r('#f6d34a', x, y, 1, 1); } return; }
    for (const [x, y] of [[10, 25], [17, 26], [23, 24]]) { disc('#c49a64', x, y, 4, 3); r('#8a6a40', x - 1, y, 1, 1); r('#e0c08a', x - 2, y - 2, 2, 1); }
  }),
  pineapple: (s) => PLANT((r) => {
    for (let i = 0; i < 9; i++) { const a = -1 + i * 0.25, len = 10 + (i % 2) * 3; for (let t = 0; t < len; t++) r(i % 2 ? '#4f8f4a' : '#6aa860', Math.round(16 + Math.sin(a) * t * 0.9), Math.round(28 - Math.cos(a) * t * 0.9), 2, 1); }
    if (s === 3) { r('#e8a83a', 12, 12, 9, 12); for (let y = 12; y < 24; y += 3) for (let x = 12 + ((y / 3) % 2) * 1; x < 21; x += 3) { r('#b8761e', x, y, 1, 1); r('#f6d27a', x + 1, y + 1, 1, 1); }
      for (let i = 0; i < 5; i++) r('#3f8a34', 13 + i * 2, 5 + (i % 2) * 2, 1, 7 - (i % 2) * 2); }
  }),
};
function crop(name) {
  const m = /^([a-z]+)_([0-3])$/.exec(name); if (!m) return null;
  const [, id, st] = m, s = Number(st);
  if (s <= 1 && ['bokchoy', 'carrot', 'strawberry'].includes(id)) return hd(sproutArt(s === 0));
  if (s <= 1 || !CROP_ART[id]) return null;
  return hd(CROP_ART[id](s));
}

// ---------- 人物（32×32）：衣服顏色、髮色、三個方向、走路兩張 ----------
const HAIR = { '': '#4a3020', black: '#2e2420', brown: '#8a5a32', gray: '#c4c4c4' };
function character(dir, frame, shirt, hair) {
  const H = HAIR[hair] || HAIR[''], SK = '#f6c9a0', PANTS = '#3b5b8c', SHOE = '#4a3222';
  return obj(32, 32, (r, disc) => {
    // 腳：走路時一前一後
    const lA = frame ? -1 : 0, lB = frame ? 1 : 0;
    if (dir === 'r') {
      r(PANTS, 13, 24, 7, 4); r(PANTS, 12 + (frame ? -2 : 0), 27, 4, 3); r(PANTS, 17 + (frame ? 2 : 0), 27, 4, 3);
      r(SHOE, 11 + (frame ? -2 : 0), 30, 5, 2); r(SHOE, 17 + (frame ? 2 : 0), 30, 5, 2);
      r(shirt, 12, 16, 9, 9); r(shade(shirt, 0.12), 12, 16, 9, 2);
      r(shirt, 14 + (frame ? 2 : -1), 17, 4, 6); r(SK, 14 + (frame ? 2 : -1), 23, 4, 2);
      disc(SK, 17, 10, 6, 6); r(SK, 22, 11, 2, 2);
      r(H, 11, 3, 11, 5); r(H, 11, 7, 5, 7); r(H, 21, 5, 2, 2);
      r('#2b2421', 19, 10, 2, 3); r('#ffffff', 19, 10, 1, 1); r('#f0907e', 18, 14, 2, 1);
      return;
    }
    r(PANTS, 10, 24, 12, 4);
    r(PANTS, 11, 27 + lA, 4, 3); r(PANTS, 17, 27 + lB, 4, 3); r(SHOE, 10, 30 + lA, 5, 2); r(SHOE, 17, 30 + lB, 5, 2);
    r(shirt, 9, 16, 14, 9); r(shade(shirt, 0.12), 9, 16, 14, 2);
    r(shirt, 6, 17, 3, 6); r(shirt, 23, 17, 3, 6); r(SK, 6, 23 + lB, 3, 2); r(SK, 23, 23 + lA, 3, 2);
    disc(SK, 16, 10, 7, 6);
    if (dir === 'u') { disc(H, 16, 9, 7, 6); r(H, 9, 10, 14, 4); r(shade(H, 0.12), 12, 5, 6, 1); return; }
    r(dir === 'd' ? shade(shirt, -0.05) : shirt, 14, 16, 4, 2); // 領口
    r(H, 9, 3, 14, 5); r(H, 9, 7, 2, 6); r(H, 21, 7, 2, 6); r(H, 13, 7, 3, 2); r(shade(H, 0.14), 12, 4, 5, 1);
    r('#2b2421', 12, 10, 2, 3); r('#2b2421', 18, 10, 2, 3); r('#ffffff', 12, 10, 1, 1); r('#ffffff', 18, 10, 1, 1);
    r('#f0907e', 10, 13, 2, 1); r('#f0907e', 20, 13, 2, 1); r('#b8604a', 15, 14, 2, 1);
  });
}

// ---------- 動物（32×32，頭朝右；往左走的時候左右翻轉） ----------
const ANIMAL_ART = {
  chicken: (f) => obj(32, 32, (r, disc) => {
    r('#f08a3a', 13 + f, 23, 1, 5); r('#f08a3a', 18 - f, 23, 1, 5); r('#f08a3a', 12 + f, 27, 3, 1); r('#f08a3a', 17 - f, 27, 3, 1);
    disc('#e8e2d6', 8, 12, 3, 6); disc('#ffffff', 15, 17, 8, 7); disc('#ffffff', 21, 10 + f, 5);
    r('#e0393e', 20, 3 + f, 2, 3); r('#e0393e', 22, 2 + f, 2, 4); r('#e0393e', 24, 4 + f, 2, 2); r('#f6a03a', 25, 10 + f, 4, 2); r('#e0393e', 24, 13 + f, 2, 3);
    r('#2b2421', 22, 9 + f, 2, 2); r('#ffffff', 23, 9 + f, 1, 1);
    for (const [x, y] of [[12, 17], [15, 18], [12, 20], [15, 21]]) r('#d8d0c2', x, y, 3, 1);
  }),
  duck: (f) => obj(32, 32, (r, disc) => {
    r('#f08a3a', 12 + f, 25, 2, 3); r('#f08a3a', 17 - f, 25, 2, 3);
    disc('#ffffff', 15, 19, 10, 6); disc('#f4f4f0', 6, 16, 3, 3); disc('#ffffff', 22, 11 + f, 5, 5);
    r('#f6a03a', 26, 12 + f, 5, 2); r('#e08a2a', 26, 14 + f, 4, 1); r('#2b2421', 23, 10 + f, 2, 2); r('#ffffff', 24, 10 + f, 1, 1);
    r('#e8e4dc', 10, 19, 9, 1); r('#e8e4dc', 11, 21, 7, 1);
  }),
  cow: (f) => obj(32, 32, (r, disc) => {
    for (const [x, d] of [[7, f], [11, -f], [19, f], [23, -f]]) { r('#f4f4ee', x, 22, 3, 7 + d); r('#3a3430', x, 28 + d, 3, 2); }
    disc('#f4f4ee', 15, 17, 11, 7); r('#2b2421', 8, 13, 6, 5); r('#2b2421', 17, 18, 5, 4); r('#2b2421', 12, 21, 3, 2);
    r('#f4f4ee', 3, 14, 2, 8); r('#2b2421', 2, 21, 2, 2);
    disc('#f4f4ee', 25, 11, 5, 5); r('#2b2421', 23, 7, 4, 3); r('#e8b0a0', 26, 14, 5, 3); r('#b8706a', 27, 15, 1, 1); r('#b8706a', 29, 15, 1, 1);
    r('#2b2421', 26, 10, 2, 2); r('#ffffff', 27, 10, 1, 1); r('#d8c8a8', 21, 5, 2, 2); r('#d8c8a8', 28, 5, 2, 2); r('#f4f4ee', 19, 8, 3, 2);
    r('#f0b0c0', 14, 23, 4, 2);
  }),
  sheep: (f) => obj(32, 32, (r, disc) => {
    for (const [x, d] of [[9, f], [13, -f], [18, f], [22, -f]]) r('#3a3430', x, 22, 2, 7 + d);
    for (const [x, y, rr] of [[9, 16, 6], [16, 13, 7], [22, 16, 6], [15, 19, 7], [9, 20, 4], [21, 21, 4]]) disc('#f4f0e6', x, y, rr);
    const q = rnd(4); for (let i = 0; i < 14; i++) r('#ded8c8', Math.floor(q() * 18) + 6, Math.floor(q() * 12) + 9, 2, 1);
    disc('#3a3430', 26, 13, 4, 5); r('#3a3430', 22, 10, 3, 2); r('#ffffff', 27, 12, 1, 1); r('#f0b0a0', 27, 16, 2, 1); disc('#f4f0e6', 24, 8, 3, 2);
  }),
  dog: (f) => obj(32, 32, (r, disc) => {
    for (const [x, d] of [[9, f], [13, -f], [19, f], [22, -f]]) { r('#c98a4a', x, 21, 3, 7 + d); r('#f4e0c0', x, 27 + d, 3, 1); }
    disc('#c98a4a', 15, 18, 9, 5); r('#f4e0c0', 11, 20, 9, 3);
    r('#c98a4a', 4, 12 + f, 2, 6); r('#c98a4a', 5, 11 + f, 3, 2); // 捲起來的尾巴
    disc('#c98a4a', 24, 11, 5, 5); r('#a86a34', 20, 4, 3, 5); r('#a86a34', 26, 4, 3, 5); r('#f4e0c0', 26, 13, 5, 3);
    r('#2b2421', 29, 12, 2, 2); r('#2b2421', 24, 10, 2, 2); r('#ffffff', 25, 10, 1, 1); r('#e05a6a', 27, 15 + f, 2, 2);
  }),
  cat: (f) => obj(32, 32, (r, disc) => {
    for (const [x, d] of [[10, f], [13, -f], [19, f], [22, -f]]) r('#f0a04a', x, 21, 2, 7 + d);
    disc('#f0a04a', 16, 18, 8, 5); for (const x of [12, 16, 20]) r('#c87a2a', x, 14, 2, 6);
    r('#f0a04a', 6, 8 - f, 2, 12); r('#c87a2a', 6, 10 - f, 2, 1); r('#c87a2a', 6, 14 - f, 2, 1);
    disc('#f0a04a', 24, 12, 5, 5); r('#f0a04a', 20, 6, 3, 4); r('#f0a04a', 26, 6, 3, 4); r('#f6c0b0', 21, 7, 1, 2); r('#f6c0b0', 27, 7, 1, 2);
    r('#3f8a34', 22, 11, 2, 2); r('#3f8a34', 26, 11, 2, 2); r('#2b2421', 23, 11, 1, 2); r('#2b2421', 27, 11, 1, 2);
    r('#e07a8a', 25, 14, 1, 1); r('#ffffff', 21, 15, 3, 1); r('#f4e0c0', 22, 15, 6, 2);
  }),
};

// ---------- 對外：有高解析度圖就回傳，沒有回傳 null（照舊用 16×16） ----------
export function artSprite(name, shirt = '#d9544d', flip = false, season = '') {
  const key = `${name}|${shirt}|${flip ? 1 : 0}|${season}`;
  if (cache.has(key)) return cache.get(key);
  let c = null;
  let m;
  if ((m = /^grass([0-2])$/.exec(name))) c = hd(grass(Number(m[1]), season));
  else if (name === 'flowers') c = hd(flowers(season || 'summer'));
  else if (name === 'path') c = hd(path(3));
  else if ((m = /^fringe_(top|bottom|left|right)$/.exec(name))) c = hd(fringe(m[1], season));
  else if (name === 'field') c = hd(field(season || 'summer'));
  else if (name === 'soil_dry' || name === 'soil_wet') c = hd(soil(name === 'soil_wet'));
  else if (name === 'tree') c = tree(season || 'summer');
  else if ((m = /^char_([dur])([01])$/.exec(name))) { c = character(m[1], Number(m[2]), shirt, season); if (flip) c = flipped(c); hd(c); }
  else if ((m = /^(chicken|duck|cow|sheep|dog|cat)_([01])$/.exec(name))) { c = ANIMAL_ART[m[1]](Number(m[2])); if (flip) c = flipped(c); hd(c); }
  else c = crop(name);
  cache.set(key, c);
  return c;
}
export const ART_NAMES = { crops: Object.keys(CROP_ART), animals: Object.keys(ANIMAL_ART) };
