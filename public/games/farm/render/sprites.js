// 圖集裡的圖：素材工具（tools/farm-assets/build.mjs）做出來的 assets/bN.webp ＋ bN.json。
// 有圖就畫圖，沒有圖回傳 false，呼叫的人再畫暫代的色塊。圖還沒載入完、或某一批還沒做，遊戲都照樣能跑。
import { loadImage, loadJSON } from '../core/assets.js';
const sprites = new Map(); // 名字 → { img, x, y, w, h }
export async function loadAtlas(name) {
  try {
    const meta = await loadJSON(`assets/${name}.json`), img = await loadImage(`assets/${meta.image}`);
    if (!img) return 0;
    // 像素圖集（LPC，meta.pixel）：放大時不要糊；第 5 個數字是 1 的是「場景裡的東西」，照原本的像素大小畫（一格 32 像素），不塞進框裡
    for (const [k, [x, y, w, h, f]] of Object.entries(meta.sprites)) sprites.set(k, { img, x, y, w, h, src: `assets/${meta.image}`, aw: meta.w, ah: meta.h, pixel: !!meta.pixel, native: f === 1 });
    return Object.keys(meta.sprites).length;
  } catch { return 0; }
}
export const sprite = (name) => sprites.get(name) || null;
let PX = 2; // 一個 LPC 像素在世界裡多大（一格 = balance.tile，LPC 一格 32 像素）
export const setPixelScale = (tile) => { PX = tile / 32; };
// 畫在一個框裡：腳底中心在 (x, y)，最寬 w、最高 h，保持比例、貼著底。像素圖的「場景裡的東西」照原本的像素大小畫，scale 可以再縮放（例如小動物）
export function drawSprite(g, name, x, y, w, h, hue = 0, scale = 1) {
  const s = sprites.get(name); if (!s) return false;
  const k = s.native ? PX * scale : Math.min(w / s.w, h / s.h), dw = s.w * k, dh = s.h * k;
  const was = g.imageSmoothingEnabled; if (s.pixel) g.imageSmoothingEnabled = false;
  if (hue) g.drawImage(hueSprite(s, hue), x - dw / 2, y - dh, dw, dh); else g.drawImage(s.img, s.x, s.y, s.w, s.h, x - dw / 2, y - dh, dw, dh);
  if (s.pixel) g.imageSmoothingEnabled = was;
  return true;
}
// 同一張建築圖換個顏色：把鮮豔的部分（屋頂、門、窗框）的色相轉 hue 度，米白色的牆和描邊不動。算一次就記起來
const hueCache = new Map();
function hueSprite(s, hue) {
  const key = `${s.src}|${s.x},${s.y}|${hue}`; if (hueCache.has(key)) return hueCache.get(key);
  const c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(s.img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
  const d = g.getImageData(0, 0, s.w, s.h), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue; const r = a[i] / 255, gg = a[i + 1] / 255, b = a[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, dl = mx - mn;
    if (dl < 0.32 || l < 0.22 || l > 0.82) continue; // 只換很鮮豔的地方（屋頂、遮雨棚、門），牆、木頭、描邊都不動
    const sat = dl / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((gg - b) / dl) % 6 : mx === gg ? (b - r) / dl + 2 : (r - gg) / dl + 4; h = (h * 60 + hue + 360) % 360;
    const C = (1 - Math.abs(2 * l - 1)) * sat, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - C / 2, [R, G, B] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
    a[i] = (R + m) * 255; a[i + 1] = (G + m) * 255; a[i + 2] = (B + m) * 255;
  }
  g.putImageData(d, 0, 0); hueCache.set(key, c); return c;
}
// 木頭招牌：建築門口上方掛一塊寫著名字的牌子
export function drawSign(g, text, x, y, T) {
  const fs = Math.round(T * 0.26); g.font = `700 ${fs}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  const w = g.measureText(text).width + T * 0.36, h = fs + T * 0.18;
  g.fillStyle = '#7a5232'; g.fillRect(x - w * 0.32, y - h / 2 - T * 0.14, T * 0.05, T * 0.16); g.fillRect(x + w * 0.32 - T * 0.05, y - h / 2 - T * 0.14, T * 0.05, T * 0.16);
  g.fillStyle = '#c99a5f'; g.strokeStyle = '#5a3d22'; g.lineWidth = Math.max(2, T * 0.045); g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, T * 0.08); g.fill(); g.stroke();
  g.fillStyle = '#3b2a1a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + T * 0.01);
}
// 介面上的小圖示（一般的網頁元素）：用圖集當背景，移到那張小圖的位置
export function iconEl(name, size = 34) {
  const s = sprites.get(name), el = document.createElement('span'); el.className = s && s.pixel ? 'icon pixel' : 'icon';
  if (!s) return null;
  const k = Math.min(size / s.w, size / s.h);
  el.style.width = s.w * k + 'px'; el.style.height = s.h * k + 'px';
  el.style.backgroundImage = `url(${new URL('../' + s.src, import.meta.url).href})`;
  el.style.backgroundSize = `${s.aw * k}px ${s.ah * k}px`; el.style.backgroundPosition = `-${s.x * k}px -${s.y * k}px`;
  return el;
}
