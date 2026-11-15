// 角色（紙娃娃）：用 LPC 像素角色（render/lpc.js 把零件圖依外觀疊起來、換色）。
// 呼叫的人照舊傳 U（以前紙娃娃的單位，一格的 0.62 倍）；LPC 一格是 32 像素，所以一個 LPC 像素 = U / (0.62 × 32)。
// 圖還沒下載好的時候先畫一個淡淡的小人影子，下載好就換成真的。
import { drawLPC, portraitLPC } from './lpc.js';

export function drawDoll(g, look, parts, x, y, U, dir = 'down', action = 'idle', t = 0, tool = null) {
  const px = U / (0.62 * 32);
  if (drawLPC(g, look, x, y, px, dir, action, t, tool)) return;
  g.fillStyle = 'rgba(60, 50, 40, .25)'; // 暫代：還在下載的時候
  g.beginPath(); g.ellipse(x, y - 14 * px, 9 * px, 13 * px, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(x, y - 36 * px, 9 * px, 0, 7); g.fill();
}

// 對話框的頭像（居民、劇情）：LPC 角色正面的頭放大；圖還沒好就回傳 null（對話框就不放頭像）
export function portraitEl(look, expr = 'normal', size = 96) {
  const c = portraitLPC(look, expr, size); if (!c) return null;
  c.className = 'icon pixel'; c.style.width = c.style.height = size + 'px';
  return c;
}
