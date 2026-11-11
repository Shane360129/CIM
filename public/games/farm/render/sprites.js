// 圖集裡的圖：素材工具（tools/farm-assets/build.mjs）做出來的 assets/bN.webp ＋ bN.json。
// 有圖就畫圖，沒有圖回傳 false，呼叫的人再畫暫代的色塊。圖還沒載入完、或某一批還沒做，遊戲都照樣能跑。
import { loadImage, loadJSON } from '../core/assets.js';
const sprites = new Map(); // 名字 → { img, x, y, w, h }
export async function loadAtlas(name) {
  try {
    const meta = await loadJSON(`assets/${name}.json`), img = await loadImage(`assets/${meta.image}`);
    if (!img) return 0;
    for (const [k, [x, y, w, h]] of Object.entries(meta.sprites)) sprites.set(k, { img, x, y, w, h, src: `assets/${meta.image}`, aw: meta.w, ah: meta.h });
    return Object.keys(meta.sprites).length;
  } catch { return 0; }
}
export const sprite = (name) => sprites.get(name) || null;
// 畫在一個框裡：腳底中心在 (x, y)，最寬 w、最高 h，保持比例、貼著底
export function drawSprite(g, name, x, y, w, h) {
  const s = sprites.get(name); if (!s) return false;
  const k = Math.min(w / s.w, h / s.h), dw = s.w * k, dh = s.h * k;
  g.drawImage(s.img, s.x, s.y, s.w, s.h, x - dw / 2, y - dh, dw, dh);
  return true;
}
// 介面上的小圖示（一般的網頁元素）：用圖集當背景，移到那張小圖的位置
export function iconEl(name, size = 34) {
  const s = sprites.get(name), el = document.createElement('span'); el.className = 'icon';
  if (!s) return null;
  const k = Math.min(size / s.w, size / s.h);
  el.style.width = s.w * k + 'px'; el.style.height = s.h * k + 'px';
  el.style.backgroundImage = `url(${new URL('../' + s.src, import.meta.url).href})`;
  el.style.backgroundSize = `${s.aw * k}px ${s.ah * k}px`; el.style.backgroundPosition = `-${s.x * k}px -${s.y * k}px`;
  return el;
}
