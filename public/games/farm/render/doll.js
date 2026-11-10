// 紙娃娃：把角色拆成零件一層一層畫，動作全部用程式讓零件動（位移、旋轉、彈跳），不畫逐格動畫。
// 目前每個零件都是程式畫的暫代圖（美術的零件要有原圖才切得出來）；之後換成圖，圖層順序和動作不用改。
// 圖層（後到前）：後髮 → 後手臂 → 身體 → 下身 → 鞋 → 上衣 → 前手臂 → 五官 → 前髮 → 帽子 → 配件 → 手上的工具
// 座標：以腳底中心為原點，U 是「一個頭的直徑」。整個人大約 2.5 個頭高。
const OUT = '#5a3d22';
const shade = (hex, k) => { const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return '#' + n.map((v) => Math.round(Math.max(0, Math.min(255, k > 0 ? v + (255 - v) * k : v * (1 + k)))).toString(16).padStart(2, '0')).join(''); };

// 這個動作在時間 t（秒）的姿勢：每個部位偏多少、轉多少
export function poseOf(action, t) {
  const p = { bob: 0, legA: 0, legB: 0, armF: 0, armB: 0, lean: 0, squash: 0, sit: 0, hop: 0, tool: 0 };
  const s = Math.sin;
  if (action === 'walk') { const w = t * 9; p.bob = Math.abs(s(w)) * 0.06; p.legA = s(w) * 0.5; p.legB = -s(w) * 0.5; p.armF = -s(w) * 0.55; p.armB = s(w) * 0.55; }
  else if (action === 'swing') { const k = Math.min(1, t / 0.35); p.armF = -2.4 + k * 3.1; p.lean = (k - 0.5) * 0.18; p.tool = 1; p.bob = s(k * Math.PI) * 0.04; }      // 揮工具：舉高再揮下
  else if (action === 'water') { const k = Math.min(1, t / 0.6); p.armF = -1.1 + s(k * Math.PI * 2) * 0.12; p.lean = 0.12; p.tool = 1; }                          // 澆水：手往前伸、微微晃
  else if (action === 'cast') { const k = Math.min(1, t / 0.5); p.armF = -2.6 + k * 1.9; p.lean = -0.15 + k * 0.3; p.tool = 1; }                                  // 拋竿
  else if (action === 'eat') { p.armF = -2.0 + s(t * 10) * 0.12; p.bob = Math.abs(s(t * 10)) * 0.02; }                                                              // 吃東西：手舉到嘴邊
  else if (action === 'sit') { p.sit = 1; }
  else if (action === 'happy') { const k = Math.min(1, t / 0.5); p.hop = s(k * Math.PI) * 0.35; p.armF = -2.6; p.armB = -2.6; p.squash = k < 0.12 || k > 0.9 ? 0.08 : -0.05; }   // 開心跳一下
  else { p.bob = s(t * 2.2) * 0.012; p.squash = s(t * 2.2) * 0.012; }                                                                                             // 待機：呼吸
  return p;
}

// look：外觀（data/doll/parts.json 的 presets 那種物件）；dir：down 正面、up 背面、left／right 側面（左邊是右邊的鏡像）
export function drawDoll(g, look, parts, x, y, U, dir = 'down', action = 'idle', t = 0, tool = null) {
  const p = poseOf(action, t), side = dir === 'left' || dir === 'right', back = dir === 'up';
  const top = parts.top.find((v) => v.id === look.top) || parts.top[0];
  const skin = look.skin, skinD = shade(skin, -0.14), lw = Math.max(1.5, U * 0.055);
  g.save(); g.translate(x, y - p.hop * U); if (dir === 'left') g.scale(-1, 1);
  g.lineWidth = lw; g.strokeStyle = OUT; g.lineJoin = 'round'; g.lineCap = 'round';
  const sq = 1 + p.squash; g.scale(1 / Math.sqrt(sq), sq); g.rotate(p.lean);
  const by = -(0.62 - p.sit * 0.22) * U - p.bob * U;      // 屁股的高度（腿的上端）
  const sh = by - 0.62 * U, hy = sh - 0.52 * U;            // 肩膀、頭的中心
  const fill = (c) => { g.fillStyle = c; g.fill(); g.stroke(); };
  const rr = (x0, y0, w, h, r) => { g.beginPath(); g.roundRect(x0, y0, w, h, r); };
  // ---- 各個零件 ----
  const hairBack = () => {
    const c = look.hairColor; if (look.hair === 'long') { rr(-0.56 * U, hy - 0.3 * U, 1.12 * U, 1.35 * U, 0.3 * U); fill(c); }
    else if (look.hair === 'twin') { for (const sx of side ? [-1] : [-1, 1]) { g.beginPath(); g.ellipse(sx * 0.62 * U, hy + 0.3 * U, 0.2 * U, 0.42 * U, sx * 0.25, 0, 7); fill(c); } }
    else if (look.hair === 'bob') { rr(-0.58 * U, hy - 0.25 * U, 1.16 * U, 0.78 * U, 0.3 * U); fill(c); }
  };
  const arm = (front) => {
    const ang = front ? p.armF : p.armB, ax = side ? (front ? 0.05 : -0.05) * U : (front ? 0.36 : -0.36) * U;
    if (!side && !front) { /* 正面、背面時兩隻手一左一右，都畫 */ }
    g.save(); g.translate(ax, sh + 0.1 * U); g.rotate(side ? ang : (front ? -1 : 1) * 0.12 + (action === 'walk' ? ang * 0.25 : front || action === 'happy' ? ang * (front ? 1 : -1) * 0.5 : 0));
    const L = 0.5 * U, W = 0.2 * U, sl = top.sleeve === 'long' ? L * 0.78 : L * 0.4;
    rr(-W / 2, 0, W, L, W / 2); fill(skin);
    rr(-W / 2 - 1, -1, W + 2, sl, W / 2); fill(look.topColor);
    if (front && tool && p.tool) { g.translate(0, L * 0.92); g.rotate(-0.5); rr(-0.03 * U, -0.75 * U, 0.06 * U, 0.85 * U, 0.02 * U); fill('#8a5a34'); rr(-0.14 * U, -0.86 * U, 0.3 * U, 0.16 * U, 0.04 * U); fill(tool === 'water' ? '#6aa8e8' : '#a9a59c'); }
    g.restore();
  };
  const leg = (sx, ang) => {
    g.save(); g.translate(side ? 0 : sx * 0.17 * U, by); g.rotate(side ? ang : 0);
    const L = (0.62 - p.sit * 0.22) * U - (side ? 0 : Math.max(0, ang * sx) * 0.1 * U), W = 0.22 * U;
    rr(-W / 2, 0, W, L, W / 2.2); fill(skin);
    const b = parts.bottom.find((v) => v.id === look.bottom) || parts.bottom[0];
    if (!top.dress && ['pants', 'jeans', 'work'].includes(b.id)) { rr(-W / 2 - 1, -1, W + 2, L * 0.8, W / 2.5); fill(look.bottomColor); }
    const sc = look.shoesColor, tall = look.shoes === 'boot' || look.shoes === 'rain';
    rr(-W / 2 - 1.5, L - (tall ? 0.24 : 0.13) * U, W + 3 + (side ? 0.08 * U : 0), (tall ? 0.24 : 0.13) * U, 0.06 * U); fill(look.shoes === 'sandal' ? shade(sc, -0.2) : sc);
    g.restore();
  };
  const body = () => { rr(-0.3 * U, sh, 0.6 * U, by - sh + 0.12 * U, 0.2 * U); fill(skin); };
  const bottom = () => {
    if (top.dress) return; const c = look.bottomColor;
    if (look.bottom === 'skirt' || look.bottom === 'longskirt') { const h = (look.bottom === 'longskirt' ? 0.5 : 0.26) * U; g.beginPath(); g.moveTo(-0.3 * U, by - 0.12 * U); g.lineTo(0.3 * U, by - 0.12 * U); g.lineTo(0.42 * U, by + h); g.lineTo(-0.42 * U, by + h); g.closePath(); fill(c); }
    else { rr(-0.32 * U, by - 0.16 * U, 0.64 * U, 0.3 * U, 0.1 * U); fill(c); }
  };
  const topL = () => {
    const c = look.topColor, h = by - sh + (top.dress ? 0.2 : 0.02) * U;
    rr(-0.33 * U, sh - 0.02 * U, 0.66 * U, h, 0.16 * U); fill(c);
    g.save(); g.beginPath(); g.roundRect(-0.33 * U, sh - 0.02 * U, 0.66 * U, h, 0.16 * U); g.clip(); g.lineWidth = lw * 0.9;
    if (top.id === 'stripe') { g.strokeStyle = shade(c, -0.28); for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-0.4 * U, sh + i * 0.15 * U); g.lineTo(0.4 * U, sh + i * 0.15 * U); g.stroke(); } }
    if (top.id === 'shirt') { g.strokeStyle = shade(c, -0.25); for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 0.14 * U, sh); g.lineTo(i * 0.14 * U, by + U); g.stroke(); } for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-0.4 * U, sh + i * 0.16 * U); g.lineTo(0.4 * U, sh + i * 0.16 * U); g.stroke(); } }
    if (top.id === 'sweater') { g.strokeStyle = shade(c, 0.45); g.beginPath(); for (let i = -3; i <= 3; i++) g.lineTo(i * 0.11 * U, sh + (i % 2 ? 0.2 : 0.3) * U); g.stroke(); }
    g.restore();
    if (top.id === 'hoodie' && !back) { g.beginPath(); g.arc(0, sh + 0.02 * U, 0.2 * U, 0, Math.PI); fill(shade(c, -0.12)); }
    if (top.id === 'hoodie' && back) { rr(-0.26 * U, sh - 0.1 * U, 0.52 * U, 0.3 * U, 0.14 * U); fill(shade(c, -0.12)); }
    if (top.id === 'overalls') { g.strokeStyle = OUT; for (const sx of [-1, 1]) { rr(sx * 0.17 * U - 0.05 * U, sh - 0.04 * U, 0.1 * U, 0.3 * U, 0.03 * U); fill(shade(c, -0.15)); } if (!back) { rr(-0.13 * U, sh + 0.22 * U, 0.26 * U, 0.2 * U, 0.04 * U); fill(shade(c, 0.2)); } }
  };
  const head = () => {
    g.beginPath(); g.arc(0, hy, 0.5 * U, 0, 7); fill(skin);
    if (!back) { for (const sx of side ? [-1] : [-1, 1]) { g.beginPath(); g.ellipse(sx * (side ? 0.1 : 0.5) * U, hy + 0.06 * U, 0.09 * U, 0.12 * U, 0, 0, 7); fill(side ? skinD : skin); } }
  };
  const face = () => {
    if (back) return;
    const ex = side ? [0.26] : [-0.2, 0.2], ey = hy + 0.06 * U; g.fillStyle = OUT; g.strokeStyle = OUT;
    for (const sx of ex) {
      const cx = sx * U, e = look.eyes;
      g.lineWidth = lw; g.beginPath();
      if (e === 'smile') { g.arc(cx, ey + 0.03 * U, 0.07 * U, Math.PI, 0); g.stroke(); }
      else if (e === 'cool') { g.ellipse(cx, ey, 0.085 * U, 0.04 * U, 0, 0, 7); g.fill(); }
      else { g.ellipse(cx, ey, (e === 'round' || e === 'lash' ? 0.07 : 0.06) * U, (e === 'round' || e === 'lash' ? 0.1 : 0.08) * U, e === 'soft' ? 0.25 * Math.sign(sx) : e === 'sharp' ? -0.25 * Math.sign(sx) : 0, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 0.02 * U, ey - 0.03 * U, 0.025 * U, 0, 7); g.fill(); g.fillStyle = OUT; }
      if (e === 'lash') { g.beginPath(); g.moveTo(cx + 0.06 * U * Math.sign(sx || 1), ey - 0.08 * U); g.lineTo(cx + 0.12 * U * Math.sign(sx || 1), ey - 0.13 * U); g.stroke(); }
      const bw = look.brows, byy = ey - 0.19 * U; g.lineWidth = bw === 'thick' ? lw * 1.7 : bw === 'thin' ? lw * 0.7 : lw; g.beginPath();
      const tilt = bw === 'worry' ? -0.05 * Math.sign(sx || 1) : 0; g.moveTo(cx - 0.08 * U, byy - tilt * U); if (bw === 'thin') g.quadraticCurveTo(cx, byy - 0.05 * U, cx + 0.08 * U, byy); else g.lineTo(cx + 0.08 * U, byy + tilt * U); g.stroke();
    }
    const mx = side ? 0.3 * U : 0, my = hy + 0.27 * U, m = look.mouths; g.lineWidth = lw; g.beginPath();
    if (m === 'open') { g.arc(mx, my - 0.03 * U, 0.09 * U, 0, Math.PI); g.closePath(); g.fillStyle = '#c0504d'; g.fill(); g.stroke(); }
    else if (m === 'o') { g.ellipse(mx, my, 0.04 * U, 0.055 * U, 0, 0, 7); g.fillStyle = '#c0504d'; g.fill(); g.stroke(); }
    else if (m === 'pout') { g.arc(mx, my, 0.035 * U, 0, 7); g.stroke(); }
    else { g.arc(mx, my - 0.05 * U, 0.09 * U, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
    g.fillStyle = 'rgba(240, 130, 130, .35)'; for (const sx of side ? [0.1] : [-0.33, 0.33]) { g.beginPath(); g.ellipse(sx * U, hy + 0.2 * U, 0.08 * U, 0.05 * U, 0, 0, 7); g.fill(); }
  };
  const hairFront = () => {
    const c = look.hairColor, h = look.hair; g.lineWidth = lw; g.strokeStyle = OUT;
    if (back) { g.beginPath(); g.arc(0, hy, 0.53 * U, 0, 7); fill(c); return; }                         // 背面：整顆後腦勺都是頭髮
    g.beginPath(); g.arc(0, hy, 0.53 * U, Math.PI * (side ? 0.72 : 1.0), Math.PI * (side ? 1.95 : 2.0)); // 頭頂
    const fr = h === 'spiky' ? 0.02 : h === 'curly' ? 0.12 : 0.16;                                        // 瀏海蓋到多低
    if (side) g.lineTo(0.3 * U, hy - (0.3 - fr) * U); else { g.lineTo(0.45 * U, hy - (0.12 - fr) * U); g.quadraticCurveTo(0, hy - (0.42 - fr * 1.6) * U, -0.45 * U, hy - (0.12 - fr) * U); }
    g.closePath(); fill(c);
    if (h === 'spiky') { for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo((i - 0.4) * 0.17 * U, hy - 0.45 * U); g.lineTo(i * 0.19 * U, hy - 0.72 * U); g.lineTo((i + 0.4) * 0.17 * U, hy - 0.45 * U); g.closePath(); fill(c); } }
    if (h === 'curly') { for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 0.2 * U, hy - (0.42 - Math.abs(i) * 0.06) * U, 0.14 * U, 0, 7); fill(c); } }
    if (h === 'bob' || h === 'long') { for (const sx of side ? [-1] : [-1, 1]) { rr(sx * 0.5 * U - 0.09 * U, hy - 0.15 * U, 0.18 * U, 0.5 * U, 0.08 * U); fill(c); } }
  };
  const hat = () => {
    const c = look.hatColor;
    if (look.hat === 'straw') { g.beginPath(); g.ellipse(0, hy - 0.32 * U, 0.82 * U, 0.2 * U, 0, 0, 7); fill('#f1d58a'); g.beginPath(); g.arc(0, hy - 0.36 * U, 0.42 * U, Math.PI, 0); g.closePath(); fill('#f1d58a'); rr(-0.42 * U, hy - 0.46 * U, 0.84 * U, 0.1 * U, 0.03 * U); fill(c); }
    else if (look.hat === 'beanie') { g.beginPath(); g.arc(0, hy - 0.12 * U, 0.54 * U, Math.PI, 0); g.closePath(); fill(c); rr(-0.56 * U, hy - 0.22 * U, 1.12 * U, 0.16 * U, 0.07 * U); fill(shade(c, 0.3)); g.beginPath(); g.arc(0, hy - 0.68 * U, 0.12 * U, 0, 7); fill(shade(c, 0.3)); }
    else if (look.hat === 'cap') { g.beginPath(); g.arc(0, hy - 0.14 * U, 0.53 * U, Math.PI, 0); g.closePath(); fill(c); if (!back) { rr(side ? 0.2 * U : -0.36 * U, hy - 0.2 * U, (side ? 0.55 : 0.72) * U, 0.11 * U, 0.05 * U); fill(shade(c, -0.18)); } }
  };
  const acc = () => {
    if (look.acc === 'glasses' && !back) { g.lineWidth = lw * 0.9; g.strokeStyle = '#3a2e22'; for (const sx of side ? [0.26] : [-0.2, 0.2]) { g.beginPath(); g.arc(sx * U, hy + 0.06 * U, 0.13 * U, 0, 7); g.stroke(); } if (!side) { g.beginPath(); g.moveTo(-0.07 * U, hy + 0.06 * U); g.lineTo(0.07 * U, hy + 0.06 * U); g.stroke(); } g.strokeStyle = OUT; }
    if (look.acc === 'scarf') { g.lineWidth = lw; rr(-0.34 * U, sh - 0.1 * U, 0.68 * U, 0.2 * U, 0.09 * U); fill('#e5484d'); if (!back) { rr(0.08 * U, sh + 0.02 * U, 0.16 * U, 0.3 * U, 0.05 * U); fill('#e5484d'); } }
  };
  // ---- 照圖層順序畫 ----
  hairBack();
  if (side) arm(false); else if (back) { arm(true); arm(false); }
  if (side) { leg(-1, p.legB); leg(1, p.legA); } else { leg(-1, p.legA); leg(1, p.legB); }
  body(); bottom(); topL();
  if (!back) { if (!side) arm(false); arm(true); }
  head(); face(); hairFront(); hat(); acc();
  g.restore();
}
// 換色（給之後的圖用）：白到淺灰的像素換成目標顏色、保留明暗；描邊和本來就有顏色的部分不動。結果快取起來，同一張圖同一個顏色只算一次。
// 不用 ctx.filter（舊手機不支援），直接改像素。
const tintCache = new Map();
export function tintSprite(img, sx, sy, w, h, color) {
  const key = `${img.src}|${sx},${sy},${w},${h}|${color}`; if (tintCache.has(key)) return tintCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), a = d.data, [tr, tg, tb] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const mx = Math.max(a[i], a[i + 1], a[i + 2]), mn = Math.min(a[i], a[i + 1], a[i + 2]);
    if (mx - mn > 28 || mx < 110) continue;            // 有彩度的（圖案）或很深的（描邊）：不換
    const l = mx / 255; a[i] = tr * l; a[i + 1] = tg * l; a[i + 2] = tb * l;
  }
  g.putImageData(d, 0, 0); tintCache.set(key, c); return c;
}
