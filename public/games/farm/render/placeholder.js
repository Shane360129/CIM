// 暫代圖：美術還沒到的時候，用色塊加名字先頂著，遊戲照樣能跑。素材到了之後這裡會先找圖，沒有圖才畫色塊。
// 所有東西都以「腳底中心」為基準畫（x、y 是腳踩的那一點），這樣依 y 排序就會有正確的前後遮擋
import { sprite } from './sprites.js';
import { textSize } from './pixel.js';
const OUTLINE = '#5a3d22';

function label(g, text, x, y, size) {
  size = textSize(size); // 鏡頭拉遠時名字不會小到看不清楚
  g.font = `700 ${size}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = size * 0.28; g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeText(text, x, y);
  g.fillStyle = OUTLINE; g.fillText(text, x, y);
}
// 頭上的泡泡（聊天的一句話或表情）
export function drawBubble(g, text, x, y, T, big = false) {
  const size = textSize(T * (big ? 0.5 : 0.22), big ? 20 : 12);
  g.font = `700 ${size}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  const w = Math.max(T * 0.6, g.measureText(text).width + size * 1.1), h = size * 1.9;
  g.fillStyle = '#fff'; g.strokeStyle = OUTLINE; g.lineWidth = Math.max(2, T * 0.04); g.lineJoin = 'round';
  g.beginPath(); g.roundRect(x - w / 2, y - h, w, h, h * 0.45); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - size * 0.3, y - 1); g.lineTo(x, y + size * 0.45); g.lineTo(x + size * 0.3, y - 1); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.fillRect(x - size * 0.3 + 1, y - 4, size * 0.6 - 2, 4);
  g.fillStyle = OUTLINE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - h / 2 + size * 0.05);
}
// 翻過的田：有 LPC 的翻土圖（tilled/dry、tilled/wet）就用圖，沒有就畫深一點的土加幾道犁溝；澆過水顏色更深
// 翻過的田接成一片：LPC 的地形圖是畫在「格子的角」上的（一塊地的邊緣在格線往外一點），所以照每一個格子角四周的四格
// 有沒有翻過，挑一張角、邊或中間的圖，畫在那個角的位置（往左上偏半格）。澆過水的再疊一層半透明的深色，一樣照四周有沒有澆過。
// 一個角四周的樣子（四個位元：左上 1、右上 2、左下 4、右下 8）拼好的圖存起來，同樣的不用再拼。
const tilledCache = new Map();
// 有翻過的那幾格 → 用哪幾張圖疊起來（三格的內角用兩張邊疊出來；斜對角的兩格用兩個角）
const PIECES = { 1: ['22'], 2: ['02'], 4: ['20'], 8: ['00'], 3: ['12'], 12: ['10'], 5: ['21'], 10: ['01'], 15: ['11'], 9: ['22', '00'], 6: ['02', '20'], 7: ['12', '21'], 11: ['12', '01'], 13: ['21', '10'], 14: ['01', '10'] };
const QUAD = [[1, 0, 0], [2, 16, 0], [4, 0, 16], [8, 16, 16]]; // 位元、在這張圖裡的位置
function cornerCanvas(dry, wet) {
  const key = dry * 16 + wet; let c = tilledCache.get(key); if (c !== undefined) return c;
  if (!sprite('tilled/d11') || !sprite('tilled/w11')) return null; // 圖集裡還沒有接邊的圖
  c = document.createElement('canvas'); c.width = c.height = 32; const q = c.getContext('2d');
  for (const id of PIECES[dry] || []) { const sp = sprite('tilled/d' + id); q.drawImage(sp.img, sp.x, sp.y, 32, 32, 0, 0, 32, 32); }
  // 翻過的土跟田裡還沒翻的泥土顏色太像：只把翻過的土畫深一點（透明的地方不動），一眼看得出翻過了
  q.globalCompositeOperation = 'source-atop'; q.fillStyle = 'rgba(58, 26, 6, .26)'; q.fillRect(0, 0, 32, 32); q.globalCompositeOperation = 'source-over';
  if (wet) { // 半透明的那層不能疊兩次（會更深）：三格的內角改成用中間那張的三個小角
    const ids = PIECES[wet] || [];
    if (ids.length === 1 || wet === 9 || wet === 6) for (const id of ids) { const sp = sprite('tilled/w' + id); q.drawImage(sp.img, sp.x, sp.y, 32, 32, 0, 0, 32, 32); }
    else { const sp = sprite('tilled/w11'); for (const [b, ox, oy] of QUAD) if (wet & b) q.drawImage(sp.img, sp.x + ox, sp.y + oy, 16, 16, ox, oy, 16, 16); }
  }
  tilledCache.set(key, c); return c;
}
// 畫一片翻過的田：tiles 是要畫的那幾格（看得到的就好），has(x, y, wet) 問某一格有沒有翻過（wet：翻過而且澆過水）
export function drawTilledArea(g, T, tiles, has) {
  if (!sprite('tilled/d11')) { for (const t of tiles) drawTilled(g, t.x, t.y, T, has(t.x, t.y, true)); return; }
  const seen = new Set(), was = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  for (const t of tiles) for (const [cx, cy] of [[t.x, t.y], [t.x + 1, t.y], [t.x, t.y + 1], [t.x + 1, t.y + 1]]) {
    const k = cx + ',' + cy; if (seen.has(k)) continue; seen.add(k);
    const around = [[cx - 1, cy - 1, 1], [cx, cy - 1, 2], [cx - 1, cy, 4], [cx, cy, 8]];
    let dry = 0, wet = 0; for (const [x, y, b] of around) { if (has(x, y, false)) dry |= b; if (has(x, y, true)) wet |= b; }
    const c = dry && cornerCanvas(dry, wet); if (c) g.drawImage(c, (cx - 0.5) * T, (cy - 0.5) * T, T, T);
  }
  g.imageSmoothingEnabled = was;
}
// 一格一格畫（舊的畫法，接邊的圖不在的時候用）
export function drawTilled(g, x, y, T, wet) {
  const s = sprite(wet ? 'tilled/wet' : 'tilled/dry');
  if (s) { const was = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(s.img, s.x, s.y, s.w, s.h, x * T, y * T, T, T); g.imageSmoothingEnabled = was; return; }
  g.fillStyle = wet ? '#6b4526' : '#8a5a34'; g.beginPath(); g.roundRect(x * T + 3, y * T + 3, T - 6, T - 6, T * 0.14); g.fill();
  g.strokeStyle = wet ? '#523218' : '#734828'; g.lineWidth = T * 0.05; g.lineCap = 'round';
  for (let i = 1; i <= 3; i++) { g.beginPath(); g.moveTo(x * T + T * 0.18, y * T + T * i / 4); g.lineTo(x * T + T * 0.82, y * T + T * i / 4); g.stroke(); }
  if (wet) { g.fillStyle = 'rgba(160, 215, 255, .5)'; g.beginPath(); g.ellipse(x * T + T * 0.68, y * T + T * 0.3, T * 0.09, T * 0.05, 0, 0, 7); g.fill(); }
}
export function drawName(g, text, x, y, T) { label(g, text, x, y, T * 0.2); }
// 小名牌：面前可以互動的東西叫什麼（米色底、咖啡色框，壓在房子和家具上也看得清楚）
export function drawTag(g, text, x, y, T) {
  const size = textSize(T * 0.21, 12); g.font = `700 ${size}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  const w = g.measureText(text).width + size * 0.9, h = size * 1.55;
  g.fillStyle = 'rgba(255, 250, 235, .94)'; g.strokeStyle = OUTLINE; g.lineWidth = Math.max(1.5, size * 0.12); g.beginPath(); g.roundRect(x - w / 2, y - h, w, h, h * 0.35); g.fill(); g.stroke();
  g.fillStyle = OUTLINE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - h / 2 + size * 0.04);
}
export function drawShadow(g, x, y, w) {
  g.fillStyle = 'rgba(40, 60, 30, .22)';
  g.beginPath(); g.ellipse(x, y, w * 0.5, w * 0.17, 0, 0, 7); g.fill();
}
export function drawObject(g, def, x, y, T) {
  const w = def.w * T, h = def.h * T;
  g.lineWidth = Math.max(2, T * 0.05); g.strokeStyle = OUTLINE; g.lineJoin = 'round';
  if (def.shape === 'tree') {
    drawShadow(g, x, y, w * 0.8);
    g.fillStyle = def.trunk; g.beginPath(); g.roundRect(x - w * 0.09, y - h * 0.38, w * 0.18, h * 0.38, w * 0.05); g.fill(); g.stroke();
    g.fillStyle = def.color; g.beginPath(); g.ellipse(x, y - h * 0.64, w * 0.5, h * 0.36, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(x - w * 0.14, y - h * 0.74, w * 0.2, h * 0.13, -0.5, 0, 7); g.fill();
  } else if (def.shape === 'blob') {
    drawShadow(g, x, y, w);
    g.fillStyle = def.color; g.beginPath(); g.ellipse(x, y - h * 0.5, w * 0.5, h * 0.5, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x - w * 0.15, y - h * 0.65, w * 0.18, h * 0.14, -0.5, 0, 7); g.fill();
  } else {
    g.fillStyle = def.color; g.beginPath(); g.roundRect(x - w / 2, y - h * (def.roof ? 0.58 : 1), w, h * (def.roof ? 0.58 : 1), T * 0.08); g.fill(); g.stroke();
    if (def.roof) {
      g.fillStyle = def.roof; g.beginPath();
      g.moveTo(x - w * 0.56, y - h * 0.55); g.lineTo(x - w * 0.36, y - h); g.lineTo(x + w * 0.36, y - h); g.lineTo(x + w * 0.56, y - h * 0.55); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#7a4e2d'; g.beginPath(); g.roundRect(x - T * 0.3, y - T * 0.95, T * 0.6, T * 0.95, T * 0.06); g.fill(); g.stroke();
    }
    label(g, def.name, x, y - h * (def.roof ? 0.78 : 0.5), T * 0.24);
  }
}
// 暫代角色：一個圓圓的身體加一顆頭，臉朝走的方向；走路時上下彈
export function drawPlayer(g, p, T, color = '#f0a04a') {
  const bob = p.moving ? Math.abs(Math.sin(p.anim * 9)) * T * 0.06 : 0;
  const r = T * 0.3, x = p.x * T, y = p.y * T;
  drawShadow(g, x, y, T * 0.62);
  g.lineWidth = Math.max(2, T * 0.05); g.strokeStyle = OUTLINE;
  g.fillStyle = color; g.beginPath(); g.ellipse(x, y - r * 0.9 - bob, r * 0.85, r * 0.95, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#ffe0bd'; g.beginPath(); g.arc(x, y - r * 2.35 - bob, r * 0.92, 0, 7); g.fill(); g.stroke();
  if (p.dir !== 'up') { // 眼睛：背面看不到
    g.fillStyle = OUTLINE;
    const ex = p.dir === 'left' ? -0.3 : p.dir === 'right' ? 0.3 : 0, ey = y - r * 2.3 - bob;
    for (const s of p.dir === 'down' ? [-0.34, 0.34] : [0.12]) { g.beginPath(); g.ellipse(x + (ex + s * (p.dir === 'left' ? -1 : 1)) * r, ey, r * 0.1, r * 0.15, 0, 0, 7); g.fill(); }
  }
  if (p.asleep) label(g, 'Zzz', x + r * 1.3, y - r * 3.3 - bob, T * 0.24);
  if (p.name) label(g, p.name, x, y - r * 3.75 - bob, T * 0.2);
}
