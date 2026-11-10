// 暫代圖：美術還沒到的時候，用色塊加名字先頂著，遊戲照樣能跑。素材到了之後這裡會先找圖，沒有圖才畫色塊。
// 所有東西都以「腳底中心」為基準畫（x、y 是腳踩的那一點），這樣依 y 排序就會有正確的前後遮擋
const OUTLINE = '#5a3d22';

function label(g, text, x, y, size) {
  g.font = `700 ${size}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = size * 0.28; g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeText(text, x, y);
  g.fillStyle = OUTLINE; g.fillText(text, x, y);
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
  if (p.name) label(g, p.name, x, y - r * 3.75 - bob, T * 0.2);
}
