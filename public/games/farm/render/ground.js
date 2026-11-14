// 地面：整張地圖先畫到一張離線畫布上，每一格畫面只要貼一次。有 LPC 地形圖就用圖拼（lpcGround），沒有就用程式畫（色塊＋柔和邊緣＋少量雜訊）
import { sprite } from './sprites.js';
const COLORS = {
  grass: ['#8fca6b', '#84c061', '#9bd277'],
  path: ['#e3cf9f', '#d8c290', '#ecdab0'],
  soil: ['#a9774c', '#9c6b42', '#b58457'],
  water: ['#7cc6e6', '#6db9dc', '#92d3ee'],
  floor: ['#d9b98a', '#cfae7e', '#e3c598'],
  cave: ['#6f6a66', '#625d59', '#7c7772'],
  rug: ['#c8553d', '#b84a34', '#d9695a'],
  sand: ['#f0dfae', '#e6d29a', '#f7e9c3'],
  garden: ['#a9774c', '#9c6b42', '#b58457'], // 小鎮的菜園：看起來跟田一樣，但玩家不能在這裡種（居民在照顧）
};
const rnd = (s) => () => ((s = (s * 9301 + 49297) % 233280) / 233280);

// ---------- LPC 地形（像素圖） ----------
// data/terrain.json：每種地面用哪張圖。layout 'lpc' 是 LPC 標準的 3×6 格地形圖（上面兩列是凹角和小點綴，中間 3×3 是一塊地的四角、四邊、中間，最下面一列是三種中間的變化）；
// 'fill' 是整張重複鋪滿（室內地板、礦坑）。一塊長方形的地，四邊畫在格線往外半格的地方，看起來邊緣剛好在格子邊上，一格寬的路也畫得出來。
let TERRAIN = null;
export const setTerrain = (t) => { TERRAIN = t; };
function lpcGround(map, tile, unlocked) {
  const P = 32, c = document.createElement('canvas'); c.width = map.w * P; c.height = map.h * P;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const q = rnd(7);
  const tex = (type) => { const t = TERRAIN[type] || TERRAIN.grass; const s = sprite(t.sprite); return s && { ...t, s }; };
  const piece = (s, col, row, dx, dy, w = 1, h = 1) => g.drawImage(s.img, s.x + col * P, s.y + row * P, P * w, P * h, dx, dy, P * w, P * h);
  const fill = (t, x, y, w, h) => { // 鋪滿：中間那格和最下面一列的三種變化隨機用
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
      if (t.layout === 'fill') { const tw = t.s.w / P, th = t.s.h / P; piece(t.s, (x + i) % tw, (y + j) % th, (x + i) * P, (y + j) * P); continue; }
      const r = q(); if (r < 0.7) piece(t.s, 1, 3, (x + i) * P, (y + j) * P); else piece(t.s, Math.floor((r - 0.7) / 0.1), 5, (x + i) * P, (y + j) * P);
    }
  };
  const patch = (t, x, y, w, h) => {
    if (t.layout === 'fill') return fill(t, x, y, w, h);
    for (let i = 0; i <= w; i++) for (let j = 0; j <= h; j++) {
      const col = i === 0 ? 0 : i === w ? 2 : 1, row = j === 0 ? 2 : j === h ? 4 : 3, dx = (x - 0.5 + i) * P, dy = (y - 0.5 + j) * P;
      if (col === 1 && row === 3) { const r = q(); if (r < 0.7) piece(t.s, 1, 3, dx, dy); else piece(t.s, Math.floor((r - 0.7) / 0.1), 5, dx, dy); }
      else piece(t.s, col, row, dx, dy);
    }
  };
  const base = tex(map.ground || 'grass'); if (!base) return null;
  fill(base, 0, 0, map.w, map.h);
  for (const p of map.patches || []) {
    const t = tex(p.type); if (!t) continue;
    if (p.locked && !unlocked) { g.globalAlpha = 0.35; patch(t, p.x, p.y, p.w, p.h); g.globalAlpha = 1; continue; } // 還沒開墾的田：淡淡的，看得出以後可以開墾
    patch(t, p.x, p.y, p.w, p.h);
  }
  c.scale = tile / P; c.pixel = true;
  return c;
}

export function buildGround(map, tile, unlocked = false) {
  if (TERRAIN) { const c = lpcGround(map, tile, unlocked); if (c) return c; } // 地形圖還沒載到就先用下面程式畫的
  // 還沒開墾的田（locked）先當草地畫，上面蓋一層淡淡的土色，看得出以後可以開墾
  // 手機的畫布有大小上限：離線畫布每格最多 32 像素，畫的時候再放大（地面本來就是柔和的色塊，看不出來）
  const px = Math.min(tile, 32), c = document.createElement('canvas');
  c.width = map.w * px; c.height = map.h * px;
  const g = c.getContext('2d'), q = rnd(11);
  const fill = (type, x, y, w, h, soft) => {
    const [base, dark, light] = COLORS[type] || COLORS.grass;
    g.fillStyle = base;
    if (soft) { g.beginPath(); g.roundRect(x * px - 3, y * px - 3, w * px + 6, h * px + 6, px * 0.45); g.fill(); }
    else g.fillRect(x * px, y * px, w * px, h * px);
    // 雜訊：一些深一點、淺一點的小圓點
    const n = Math.round(w * h * 2.2);
    for (let i = 0; i < n; i++) {
      g.fillStyle = q() > 0.5 ? dark : light; g.globalAlpha = 0.55;
      const r = px * (0.05 + q() * 0.09);
      g.beginPath(); g.ellipse((x + 0.1 + q() * (w - 0.2)) * px, (y + 0.1 + q() * (h - 0.2)) * px, r * 1.6, r, 0, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  };
  fill(map.ground || 'grass', 0, 0, map.w, map.h, false);
  for (const p of map.patches || []) {
    // 邊緣：先畫一圈深色的邊，再畫本體，看起來像陷下去一點
    if (!p.locked || unlocked) { g.fillStyle = 'rgba(70, 50, 30, 0.18)'; g.beginPath(); g.roundRect(p.x * px - 5, p.y * px - 4, p.w * px + 10, p.h * px + 10, px * 0.5); g.fill(); }
    if (p.locked && !unlocked) { g.fillStyle = 'rgba(150, 110, 70, 0.28)'; g.beginPath(); g.roundRect(p.x * px, p.y * px, p.w * px, p.h * px, px * 0.45); g.fill(); continue; }
    fill(p.type, p.x, p.y, p.w, p.h, true);
  }
  c.scale = tile / px;
  return c;
}
