// 紙娃娃：把角色拆成零件一層一層畫，動作全部用程式讓零件動（位移、旋轉、彈跳），不畫逐格動畫。
// 目前每個零件都是程式畫的暫代圖（美術的零件要有原圖才切得出來）；之後換成圖，圖層順序和動作不用改。
// 圖層（後到前）：後髮 → 後手臂 → 身體 → 下身 → 鞋 → 上衣 → 前手臂 → 五官 → 前髮 → 帽子 → 配件 → 手上的工具
// 座標：以腳底中心為原點，U 是「一個頭的直徑」。整個人大約 2.5 個頭高。
import { sprite } from './sprites.js';
const OUT = '#5a3d22';
// 美術零件（白底，照外觀的顏色染色）要畫多大、放哪裡：單位是 U（一個頭的直徑）。w 是正面／背面的寬，ws 是側面的寬；dy 是比基準點高（負）或低多少
const HAIR = { px: 222, top: -0.80, sx: -0.17, sxArt: -0.13, wrap: 1.06, lift: 0.25, liftBack: 0.1 }; // wrap：後腦勺那片比頭寬多少；lift：頭髮頂端比頭頂高多少（U） // px：原圖裡一個頭的直徑大約幾個像素；top：頭髮頂端比頭的中心高多少（U）
const FIT = { top: { w: 1.02, ws: 0.62, dy: -0.1 }, dress: { w: 0.8, ws: 0.5, dy: -0.08 }, bottom: { w: 0.72, ws: 0.5, dy: -0.2 }, hat: { straw: { w: 1.3, ws: 1.3, dy: -0.78 }, beanie: { w: 1.12, ws: 1.12, dy: -1.36, dys: -1.02 }, cap: { w: 1.15, ws: 1.15, dy: -1.06, dys: -0.78, flipSide: true }, other: { w: 1.2, ws: 1.2, dy: -1.02 } } };
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
  else if (action === 'fishing') { p.armF = -1.3 + s(t * 1.5) * 0.06; p.tool = 1; }                                                                                  // 釣魚：竿子往前伸，等魚上鉤
  else if (action === 'sweep') { p.armF = -0.6 + s(t * 5) * 0.35; p.lean = 0.08; p.tool = 1; p.bob = Math.abs(s(t * 5)) * 0.01; }                             // 掃地：掃把左右揮
  else if (action === 'happy') { const k = Math.min(1, t / 0.5); p.hop = s(k * Math.PI) * 0.35; p.armF = -2.6; p.armB = -2.6; p.squash = k < 0.12 || k > 0.9 ? 0.08 : -0.05; }   // 開心跳一下
  else { p.bob = s(t * 2.2) * 0.012; p.squash = s(t * 2.2) * 0.012; }                                                                                             // 待機：呼吸
  return p;
}

// look：外觀（data/doll/parts.json 的 presets 那種物件）；dir：down 正面、up 背面、left／right 側面（左邊是右邊的鏡像）
// 美術素體：膚色換成玩家選的、白色布料（袖子）換成衣服的顏色。一次算好快取起來
const paintCache = new Map(); let baseSkin = null;
function skinOf(s) { // 素體本來的膚色：取頭部正中間一小塊的平均
  const c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(s.img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
  const d = g.getImageData(Math.round(s.w * 0.42), Math.round(s.h * 0.5), Math.round(s.w * 0.16), Math.round(s.h * 0.16)).data, sum = [0, 0, 0]; let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; n++; }
  return n ? sum.map((v) => v / n) : [246, 207, 163];
}
function paint(s, skin, cloth) {
  const key = `${s.x},${s.y}|${skin}|${cloth || ''}`; if (paintCache.has(key)) return paintCache.get(key);
  if (!baseSkin) { const h = sprite('base/head/front'); baseSkin = h ? skinOf(h) : [246, 207, 163]; }
  const c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(s.img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
  const d = g.getImageData(0, 0, s.w, s.h), a = d.data, hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const sk = hex(skin).map((v, i) => v / baseSkin[i]), cl = cloth ? hex(cloth) : null;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue; const r = a[i], gg = a[i + 1], b = a[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    if (r >= gg && gg >= b && r > 120 && r - b > 22 && r - b < 140) { a[i] = Math.min(255, r * sk[0]); a[i + 1] = Math.min(255, gg * sk[1]); a[i + 2] = Math.min(255, b * sk[2]); } // 皮膚
    else if (cl && mx - mn < 40 && mx >= 120) { const l = mx / 255; a[i] = cl[0] * l; a[i + 1] = cl[1] * l; a[i + 2] = cl[2] * l; } // 白色布料
  }
  g.putImageData(d, 0, 0); paintCache.set(key, c); return c;
}
// 身體比例（單位 U）：頭的高度、身體長、腿長、手長、身體寬（倍數）、手腳粗細（倍數）。data/doll/parts.json 的 body 可以覆寫（紙娃娃對位台調出來的）
export const BODY_DEFAULT = { head: 1.04, torso: 0.62, leg: 0.62, arm: 0.62, width: 1, limb: 1 };
const headPx = () => { const h = sprite('base/head/front'); return h ? h.h : 217; }; // 素體圖裡頭的高度（像素）

export function drawDoll(g, look, parts, x, y, U, dir = 'down', action = 'idle', t = 0, tool = null) {
  const p = poseOf(action, t), side = dir === 'left' || dir === 'right', back = dir === 'up';
  const top = parts.top.find((v) => v.id === look.top) || parts.top[0];
  const skin = look.skin, skinD = shade(skin, -0.14), lw = Math.max(1.5, U * 0.055);
  g.save(); g.translate(x, y - p.hop * U); if (dir === 'left') g.scale(-1, 1);
  g.lineWidth = lw; g.strokeStyle = OUT; g.lineJoin = 'round'; g.lineCap = 'round';
  const sq = 1 + p.squash; g.scale(1 / Math.sqrt(sq), sq); g.rotate(p.lean);
  const BASE = !!sprite('base/head/front') && !look.plain;  // 有美術素體（沒有的話用程式畫的身體）
  const B = BASE ? { ...BODY_DEFAULT, ...(parts.body || {}) } : BODY_DEFAULT;
  const HU = U * B.head / 1.04;                             // 頭的單位：頭、五官、頭髮、帽子跟著頭的大小
  const by = -(B.leg - p.sit * 0.22) * U - p.bob * U;      // 屁股的高度（腿的上端）
  const sh = by - B.torso * U, hy = sh - 0.52 * HU;        // 肩膀、頭的中心
  const fill = (c) => { g.fillStyle = c; g.fill(); g.stroke(); };
  const rr = (x0, y0, w, h, r) => { g.beginPath(); g.roundRect(x0, y0, w, h, r); };
  // 美術零件：有圖就畫圖（染成 color），沒有回傳 false 讓呼叫的人畫暫代的
  const view = back ? 'back' : side ? 'side' : 'front';
  const art = (name, color, fit, baseY, maxH = 0, fitBox = 0) => {
    const s = sprite(`${name}/${view}`); if (!s) return false;
    let w = (side ? fit.ws : fit.w) * U, h = w * s.h / s.w;
    if (maxH && h > maxH) h = maxH;                                   // 長褲：不要蓋過鞋子（只壓高度）
    if (fitBox && h > fitBox) { w *= fitBox / h; h = fitBox; }        // 很高的頭飾：整個等比例縮小
    const flip = side && fit.flipSide; if (flip) { g.save(); g.scale(-1, 1); } // 有些零件的側面圖畫反了（面向左），翻過來
    dS(s, color, -w / 2, baseY + (side && fit.dys != null ? fit.dys : fit.dy) * U, w, h);
    if (flip) g.restore(); return true;
  };
  const topArt = !!sprite(`top/${top.id}/${view}`);
  // 美術的側面零件（頭髮、衣服、鞋、帽子、配件）大多畫成面向左，素體是面向右：側面時把這些零件左右翻過來
  const dI = (src, sx, sy, sw, sh, dx, dy, dw, dh) => {
    if (!side) { if (sx == null) g.drawImage(src, dx, dy, dw, dh); else g.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh); return; }
    g.save(); g.translate(dx + dw / 2, 0); g.scale(-1, 1); if (sx == null) g.drawImage(src, -dw / 2, dy, dw, dh); else g.drawImage(src, sx, sy, sw, sh, -dw / 2, dy, dw, dh); g.restore();
  };
  const dS = (s, color, dx, dy, dw, dh, clean = false) => (color ? dI(tintSprite(s.img, s.x, s.y, s.w, s.h, color, clean), null, null, null, null, dx, dy, dw, dh) : dI(s.img, s.x, s.y, s.w, s.h, dx, dy, dw, dh));
  // ---- 美術素體（頭、臉、身體、手腳）：素材到了就用，沒有就用下面程式畫的 ----
  const k0 = U / headPx(), kH = HU / headPx(), mirror = dir === 'left';
  const put = (name, cx, top, opt = {}) => { // 畫一張零件：以 (cx, top) 為上緣中心；可以指定寬高、旋轉（繞上緣中心）、換色
    const s = sprite(name); if (!s) return false;
    const sc = (opt.k || 1) * k0, w = opt.w || s.w * sc, h = opt.h || s.h * sc;
    const src = opt.raw ? null : paint(s, skin, opt.cloth || null);
    g.save(); g.translate(cx, top); if (opt.ang) g.rotate(opt.ang); if (opt.flip) g.scale(-1, 1);
    if (src) g.drawImage(src, -w / 2, opt.mid ? -h / 2 : 0, w, h); else g.drawImage(s.img, s.x, s.y, s.w, s.h, -w / 2, opt.mid ? -h / 2 : 0, w, h);
    g.restore(); return true;
  };
  const vk = back ? 'b' : side ? 's' : 'f', FT = parts.fit || {};
  const armArt = (front) => {
    const ang = front ? p.armF : p.armB, ax = side ? (front ? 0.04 : -0.06) * U : (front ? 0.3 : -0.3) * U * B.width;
    const rot = side ? ang : (front ? -1 : 1) * 0.1 + (action === 'walk' ? ang * 0.25 : front || action === 'happy' ? ang * (front ? 1 : -1) * 0.5 : 0);
    const sl = topArt && top.sleeve !== 'long' ? 'arm' : top.sleeve === 'long' ? 'arml' : 'arms', who = side ? (front ? 'sf' : 'sb') : back ? (front ? 'br' : 'bl') : (front ? 'fr' : 'fl');
    const L = B.arm * U, s = sprite(`base/${sl}/${who}`); if (!s) return false;
    const w = L * s.w / s.h * B.limb;
    put(`base/${sl}/${who}`, ax, sh - 0.02 * U, { w, h: L, ang: rot, cloth: sl === 'arm' ? null : look.topColor });
    if (front && tool && p.tool) { g.save(); g.translate(ax, sh); g.rotate(rot); g.translate(0, L * 0.9); g.rotate(-0.5); rr(-0.03 * U, -0.75 * U, 0.06 * U, 0.85 * U, 0.02 * U); fill('#8a5a34'); rr(-0.14 * U, -0.86 * U, 0.3 * U, 0.16 * U, 0.04 * U); fill(tool === 'water' ? '#6aa8e8' : tool === 'broom' ? '#d9b45a' : tool === 'rod' ? '#8a5a34' : '#a9a59c'); if (tool === 'rod') { g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, U * 0.02); g.beginPath(); g.moveTo(0.02 * U, -0.86 * U); g.lineTo(0.5 * U, -0.1 * U); g.stroke(); g.strokeStyle = OUT; } g.restore(); }
    return true;
  };
  const legArt = (sx, ang) => {
    const who = side ? (sx > 0 ? 'sf' : 'sb') : back ? (sx > 0 ? 'br' : 'bl') : (sx > 0 ? 'fr' : 'fl');
    const L = -by + 0.02 * U - (side ? 0 : Math.max(0, ang * sx) * 0.1 * U), s = sprite(`base/leg/${who}`); if (!s) return false;
    const lx = side ? 0 : sx * 0.14 * U * B.width;
    put(`base/leg/${who}`, lx, by - 0.02 * U, { w: L * s.w / s.h * B.limb, h: L, ang: side ? ang : 0 });
    const sc = look.shoesColor, tall = look.shoes === 'boot' || look.shoes === 'rain' || (parts.shoes.find((v) => v.id === look.shoes) || {}).tall;
    const ss = sprite(`shoes/${look.shoes}/${view}`);
    if (ss) { // 美術鞋子：每隻腳一隻，鞋底貼著腳底；長靴比較高
      const sk = (FT.shoes && FT.shoes.k) || 1, sw = (side ? 0.4 : 0.3) * U * B.limb * sk, sh2 = Math.min(sw * ss.h / ss.w, (tall ? 0.42 : 0.24) * U * B.limb * sk), sw2 = sh2 * ss.w / ss.h;
      g.save(); g.translate(lx, by - 0.02 * U); g.rotate(side ? ang : 0); dI(paint(ss, skin, sc), null, null, null, null, -sw2 / 2 + (side ? 0.04 * U : 0), L - sh2 + 0.02 * U, sw2, sh2); g.restore();
      return true;
    }
    g.save(); g.translate(lx, by - 0.02 * U); g.rotate(side ? ang : 0); rr(-0.13 * U, L - (tall ? 0.24 : 0.13) * U, 0.26 * U + (side ? 0.06 * U : 0), (tall ? 0.24 : 0.13) * U, 0.06 * U); fill(look.shoes === 'sandal' ? shade(sc, -0.2) : sc); g.restore();
    return true;
  };
  // 美術衣服：跟素體用同一個比例（parts.fit），上衣從脖子下面對齊、褲裙從腰對齊，所以會剛好套在身上
  const torsoTop = hy + 0.42 * HU, torsoH = by + 0.12 * U - torsoTop, tStretch = torsoH / (0.84 * U), lStretch = B.leg / 0.62; // 身體、腿比預設長多少
  const wear = (name, color, k, topY, dx = 0, maxH = 0, hs = 1) => {
    const s = sprite(`${name}/${view}`); if (!s) return false;
    let w = s.w * k0 * k * B.width, h = s.h * k0 * k * hs; if (maxH && h > maxH) { w *= maxH / h; h = maxH; }
    dS(s, color, dx - w / 2, topY, w, h); return true;
  };
  const topWear = () => { const f = FT.top || { k: 1, y: 0 }; return wear(`top/${top.id}`, look.topColor, f.k, torsoTop + f.y * U, side ? (f.sx || 0) * U : 0, 0, tStretch); };
  const bottomWear = () => {
    if (top.dress) return true; const f = FT.bottom || { k: 1, y: -0.2 }, b = parts.bottom.find((v) => v.id === look.bottom) || {};
    return wear(`bottom/${look.bottom}`, look.bottomColor, f.k, by + f.y * U, side ? (f.sx || 0) * U : 0, -by - (f.y * U) - 0.06 * U, lStretch);
  };
  const hatWear = () => {
    if (look.hat === 'none') return true; const f = FT.hat || { k: 1 }, s = sprite(`hat/${look.hat}/${view}`), hp = parts.hat.find((v) => v.id === look.hat) || {}; if (!s) return false;
    const tf = parts.fitTable && parts.fitTable.hat[look.hat] && parts.fitTable.hat[look.hat][view], hb = tf && headBox();
    const col = look.hat === 'straw' || hp.art ? null : look.hatColor;
    if (hb) { const x = hb.x + tf[0] * hb.w, y = hb.y + tf[1] * hb.h, w = s.w * tf[2] * hb.k, h = s.h * tf[2] * hb.k;
      if (side && parts.fitTable.hat[look.hat].sideFlip === false) g.drawImage(col ? tintSprite(s.img, s.x, s.y, s.w, s.h, col) : s.img, ...(col ? [] : [s.x, s.y, s.w, s.h]), x, y, w, h); // 這頂的側面圖本來就面向右
      else dS(s, col, x, y, w, h);
      return true; }
    const w = s.w * kH * f.k, h = s.h * kH * f.k, dy = hp.dy != null ? hp.dy : (FT.hatY && FT.hatY[look.hat] != null ? FT.hatY[look.hat] : -0.38);
    dS(s, col, -w / 2 + (side ? 0.02 * HU : 0), hy + dy * HU - h / 2, w, h); return true;
  };
  const bodyArt = () => { const s = sprite(`base/torso/${view}`); if (!s) return false; put(`base/torso/${view}`, side ? -0.02 * U : 0, torsoTop, { w: torsoH * s.w / s.h * B.width, h: torsoH }); return true; };
  const headArt = () => put(`base/head/${view}`, side ? -0.03 * HU : 0, hy - 0.52 * HU, { h: 1.04 * HU, w: 1.04 * HU * sprite(`base/head/${view}`).w / sprite(`base/head/${view}`).h });
  const faceArt = () => {
    if (back) return true;
    const blink = action !== 'happy' && (t % 4.3) < 0.14, eyes = look.asleep || blink ? 'closed' : action === 'happy' ? 'happy' : look.eyes;
    const fs = (name, cx, cy, k) => { const s = sprite(name); if (!s) return; const w = s.w * kH * k, h = s.h * kH * k; g.drawImage(s.img, s.x, s.y, s.w, s.h, cx - w / 2, cy - h / 2, w, h); };
    if (side) { const fx = 0.24 * HU; fs(`face/s/mouth/blush`, fx - 0.08 * HU, hy + 0.22 * HU, 0.3); fs(`face/s/eyes/${eyes}`, fx, hy + 0.06 * HU, 0.42); fs(`face/s/brows/${look.brows}`, fx, hy - 0.17 * HU, 0.42); fs(`face/s/mouth/${look.mouths}`, fx + 0.06 * HU, hy + 0.3 * HU, 0.38); return true; }
    fs('face/f/mouth/blush', 0, hy + 0.2 * HU, 0.85); fs(`face/f/eyes/${eyes}`, 0, hy + 0.06 * HU, 0.82); fs(`face/f/brows/${look.brows}`, 0, hy - 0.16 * HU, 0.82); fs(`face/s/mouth/${look.mouths}`, 0, hy + 0.3 * HU, 0.38);
    return true;
  };
  // 髮型的圖：五個零件（正面前髮 ff、正面後髮 fb、背面 bk、側面前髮 sf、側面後髮 sb）都照原圖的比例畫，頂端對齊頭頂上方一點
  // 髮型：每一款照「後腦勺那一片（bk）的寬度」對齊頭的寬度（各款的圖大小不一，這樣才會剛好包住頭），頂端貼著頭頂上方一點
  // 頭畫在哪裡（跟 headArt 一樣的算法）：髮型、帽子照 fit.json 對齊到這個框
  const headBox = () => { const hs = sprite(`base/head/${view}`); if (!hs) return null; const h = 1.04 * HU, w = h * hs.w / hs.h; return { x: (side ? -0.03 * HU : 0) - w / 2, y: hy - 0.52 * HU, w, h, k: h / hs.h }; };
  // 髮型：照 data/doll/fit.json（tools/farm-assets/fit-doll.mjs 自動對位算出來的）放；沒有對位資料的用舊的算法
  const hairArt = (v) => {
    const s = sprite(`hair/${look.hair}/${v}`); if (!s) return false;
    const art = !!sprite('base/head/front') && !look.plain, F = art && parts.fitTable && parts.fitTable.hair[look.hair], f = F && F[v], hb = f && headBox();
    if (hb) { const w = s.w * f[2] * hb.k, h = s.h * f[2] * hb.k, x = hb.x + f[0] * hb.w, y = hb.y + f[1] * hb.h;
      if (side && F.sideFlip === false) g.drawImage(tintSprite(s.img, s.x, s.y, s.w, s.h, look.hairColor, true), x, y, w, h); // 這款的側面圖本來就面向右，不用翻
      else dS(s, look.hairColor, x, y, w, h, true);
      return true; }
    const ref = sprite(`hair/${look.hair}/bk`) || s, headW = art ? 1.04 * HU * 245 / 217 : 1.06 * U;
    const k = art ? Math.min(1.25, Math.max(0.85, headW * HAIR.wrap / ref.w / (HU / HAIR.px))) * HU / HAIR.px : U / HAIR.px;
    const w = s.w * k, h = s.h * k, top = art ? hy - 0.52 * HU - (v === 'bk' ? HAIR.liftBack : HAIR.lift) * HU : hy + HAIR.top * U;
    dS(s, look.hairColor, -w / 2 + (side ? (art ? HAIR.sxArt * HU : HAIR.sx * U) : 0), top, w, h, true); return true;
  };
  // ---- 各個零件 ----
  const hairBack = () => {
    if (!back && hairArt(side ? 'sb' : 'fb')) return; if (sprite(`hair/${look.hair}/bk`)) return; // 有美術圖：背面的整頭頭髮在 hairFront 畫
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
    if (!(topArt && top.sleeve !== 'long')) { rr(-W / 2 - 1, -1, W + 2, sl, W / 2); fill(look.topColor); } // 短袖的美術上衣自己帶袖子
    if (front && tool && p.tool) { g.translate(0, L * 0.92); g.rotate(-0.5); rr(-0.03 * U, -0.75 * U, 0.06 * U, 0.85 * U, 0.02 * U); fill('#8a5a34'); rr(-0.14 * U, -0.86 * U, 0.3 * U, 0.16 * U, 0.04 * U); fill(tool === 'water' ? '#6aa8e8' : tool === 'broom' ? '#d9b45a' : tool === 'rod' ? '#8a5a34' : '#a9a59c'); if (tool === 'rod') { g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, U * 0.02); g.beginPath(); g.moveTo(0.02 * U, -0.86 * U); g.lineTo(0.5 * U, -0.1 * U); g.stroke(); g.strokeStyle = OUT; } }
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
    if ((['shorts', 'skirt', 'longskirt'].includes(look.bottom) || (parts.bottom.find((v) => v.id === look.bottom) || {}).art) && art(`bottom/${look.bottom}`, c, FIT.bottom, by, -by - FIT.bottom.dy * U - 0.1 * U)) return; // 長褲跟著腿動，還是用畫的
    if (look.bottom === 'skirt' || look.bottom === 'longskirt') { const h = (look.bottom === 'longskirt' ? 0.5 : 0.26) * U; g.beginPath(); g.moveTo(-0.3 * U, by - 0.12 * U); g.lineTo(0.3 * U, by - 0.12 * U); g.lineTo(0.42 * U, by + h); g.lineTo(-0.42 * U, by + h); g.closePath(); fill(c); }
    else { rr(-0.32 * U, by - 0.16 * U, 0.64 * U, 0.3 * U, 0.1 * U); fill(c); }
  };
  const topL = () => {
    const c = look.topColor, h = by - sh + (top.dress ? 0.2 : 0.02) * U;
    if (art(`top/${top.id}`, c, top.dress ? FIT.dress : FIT.top, sh, 0, top.dress ? 0 : by - sh + 0.32 * U)) return; // 上衣太長的（畫得像洋裝）等比例縮小
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
    if (back && sprite(`hair/${h}/bk`)) { g.beginPath(); g.arc(0, hy, 0.5 * (BASE ? HU : U), 0, 7); fill(shade(c, -0.12)); } // 背面：後腦勺先塗成髮色，短髮才不會露出光頭
    if (hairArt(back ? 'bk' : side ? 'sf' : 'ff')) return;
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
    const hp = parts.hat.find((v) => v.id === look.hat) || {};
    if (look.hat !== 'none' && art(`hat/${look.hat}`, look.hat === 'straw' || hp.art ? null : c, FIT.hat[look.hat] || FIT.hat.other, hy, 0, 1.15 * U)) return; // 第 5 批的帽子本來就有顏色，不染
    if (look.hat === 'straw') { g.beginPath(); g.ellipse(0, hy - 0.32 * U, 0.82 * U, 0.2 * U, 0, 0, 7); fill('#f1d58a'); g.beginPath(); g.arc(0, hy - 0.36 * U, 0.42 * U, Math.PI, 0); g.closePath(); fill('#f1d58a'); rr(-0.42 * U, hy - 0.46 * U, 0.84 * U, 0.1 * U, 0.03 * U); fill(c); }
    else if (look.hat === 'beanie') { g.beginPath(); g.arc(0, hy - 0.12 * U, 0.54 * U, Math.PI, 0); g.closePath(); fill(c); rr(-0.56 * U, hy - 0.22 * U, 1.12 * U, 0.16 * U, 0.07 * U); fill(shade(c, 0.3)); g.beginPath(); g.arc(0, hy - 0.68 * U, 0.12 * U, 0, 7); fill(shade(c, 0.3)); }
    else if (look.hat === 'cap') { g.beginPath(); g.arc(0, hy - 0.14 * U, 0.53 * U, Math.PI, 0); g.closePath(); fill(c); if (!back) { rr(side ? 0.2 * U : -0.36 * U, hy - 0.2 * U, (side ? 0.55 : 0.72) * U, 0.11 * U, 0.05 * U); fill(shade(c, -0.18)); } }
  };
  const accArt = (layer) => { // 美術配件：位置照 parts.json 的 slots（臉上、脖子、胸前、腰、背後…）
    const a = parts.acc.find((v) => v.id === look.acc); if (!a || !a.art) return false;
    const sl = parts.slots[a.slot] || {}; if (!!sl.behind !== (layer === 'behind')) return true;
    if (sl.behind && layer === 'behind' && back) return true; // 背面時，背包和翅膀改到身體前面畫（離鏡頭比較近）
    const sv = sl.behind ? (back ? 'front' : side ? 'side' : 'back') : view, s = sprite(`acc/${a.id}/${sv}`); if (!s) return true;
    if (!sl.behind && back && ['face', 'cheek', 'bow', 'tie', 'necklace', 'badge', 'apron'].includes(a.slot)) return true; // 背面看不到臉上和胸前的東西
    const AU = sl.y === 'hy' ? HU : U, base = sl.y === 'hy' ? hy : sl.y === 'by' ? by : sh, w = a.w * (side ? sl.sw || 0.7 : 1) * AU * (sl.y === 'hy' ? 1 : B.width), h = w * s.h / s.w;
    const cx = (side ? sl.sx || 0 : sl.dx || 0) * AU, cy = base + (sl.dy || 0) * AU;
    dI(s.img, s.x, s.y, s.w, s.h, cx - w / 2, cy - h / 2, w, h); return true;
  };
  const acc = () => {
    if (accArt('front')) return;
    if (look.acc === 'glasses' && !back) { g.lineWidth = lw * 0.9; g.strokeStyle = '#3a2e22'; for (const sx of side ? [0.26] : [-0.2, 0.2]) { g.beginPath(); g.arc(sx * U, hy + 0.06 * U, 0.13 * U, 0, 7); g.stroke(); } if (!side) { g.beginPath(); g.moveTo(-0.07 * U, hy + 0.06 * U); g.lineTo(0.07 * U, hy + 0.06 * U); g.stroke(); } g.strokeStyle = OUT; }
    if (look.acc === 'scarf') { g.lineWidth = lw; rr(-0.34 * U, sh - 0.1 * U, 0.68 * U, 0.2 * U, 0.09 * U); fill('#e5484d'); if (!back) { rr(0.08 * U, sh + 0.02 * U, 0.16 * U, 0.3 * U, 0.05 * U); fill('#e5484d'); } }
  };
  // ---- 照圖層順序畫 ----
  if (BASE) { // 美術素體
    accArt('behind'); hairBack();
    const dressed = topArt; // 上衣有美術圖：手臂畫在衣服後面，袖子蓋住手臂、只露出手
    if (side) armArt(false); else if (back || dressed) { armArt(true); armArt(false); }
    if (side) { legArt(-1, p.legB); legArt(1, p.legA); } else { legArt(-1, p.legA); legArt(1, p.legB); }
    bodyArt(); if (!bottomWear()) bottom(); if (side && dressed) armArt(true); if (!topWear()) topL();
    if (!back && !dressed) { if (!side) armArt(false); armArt(true); }
    if (!back && dressed && (p.tool || action === 'happy' || action === 'eat')) armArt(true); // 舉手、拿工具的時候前面那隻手要在衣服前面
    // 頭套類的帽子（貓耳帽、小雞帽、青蛙帽…）正面時套在頭後面，臉從開口露出來；瀏海只畫在頭的範圍內，不會蓋到頭套
    const hood = !side && !back && look.hat !== 'none' && (parts.hat.find((v) => v.id === look.hat) || {}).hood && hatWear();
    headArt(); faceArt();
    if (hood) { g.save(); g.beginPath(); g.ellipse(0, hy, 0.48 * HU, 0.53 * HU, 0, 0, 7); g.clip(); hairFront(); g.restore(); } else hairFront();
    if (!hood && !hatWear()) hat(); acc(); if (back) { const a = parts.acc.find((v) => v.id === look.acc); if (a && a.art && (parts.slots[a.slot] || {}).behind) { const s = sprite(`acc/${a.id}/front`); if (s) { const sl = parts.slots[a.slot], w = a.w * U * B.width, h = w * s.h / s.w; g.drawImage(s.img, s.x, s.y, s.w, s.h, -w / 2, sh + sl.dy * U - h / 2, w, h); } } }
  } else {
  hairBack();
  if (side) arm(false); else if (back) { arm(true); arm(false); }
  if (side) { leg(-1, p.legB); leg(1, p.legA); } else { leg(-1, p.legA); leg(1, p.legB); }
  body(); bottom(); topL();
  if (!back) { if (!side) arm(false); arm(true); }
  head(); face(); hairFront(); hat(); acc();
  }
  g.restore();
}
// 換色（給之後的圖用）：白到淺灰的像素換成目標顏色、保留明暗；描邊和本來就有顏色的部分不動。結果快取起來，同一張圖同一個顏色只算一次。
// 不用 ctx.filter（舊手機不支援），直接改像素。
const tintCache = new Map();
// clean：頭髮的原圖只有灰階，帶洋紅色的像素是去背留下的邊，改成灰色並依程度變淡（不然換色後會有粉紅雜點）
export function tintSprite(img, sx, sy, w, h, color, clean = false) {
  const key = `${img.src}|${sx},${sy},${w},${h}|${color}|${clean ? 1 : 0}`; if (tintCache.has(key)) return tintCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), a = d.data, [tr, tg, tb] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    if (clean) { const m = Math.min(a[i], a[i + 2]) - a[i + 1]; if (m > 20) { a[i] = a[i + 2] = a[i + 1]; a[i + 3] *= Math.max(0, 1 - m / 160); } }
    const mx = Math.max(a[i], a[i + 1], a[i + 2]), mn = Math.min(a[i], a[i + 1], a[i + 2]);
    if (mx - mn > 75 || mx < 110) continue;            // 彩度高的（圖案）或很深的（描邊）：不換。米白色的布料也算白，要換
    const l = mx / 255; a[i] = tr * l; a[i + 1] = tg * l; a[i + 2] = tb * l;
  }
  g.putImageData(d, 0, 0); tintCache.set(key, c); return c;
}
