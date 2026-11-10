// 美術第二期：房子、動物小屋、商店、溫室、小鎮的建築、柵欄、石板路、池塘（兩倍解析度的像素圖）
// 跟第一期一樣全部用程式畫：先畫屋頂瓦片、木板、石頭、窗戶這些零件，再自動補明暗、描外框。
// 每張圖都是原本的兩倍大（c.hd = 2），在地圖上佔的格子不變。
import { shade, rnd, px, autoShade, outline, hd } from './farm-art.js';

const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
// 建築：畫完補明暗（比人物淡一點）、描外框
const build = (w, h, draw) => hd(outline(autoShade(px(w, h, draw), 0.07, -0.09)));
// 地面：不描框
const flat = (w, h, draw) => hd(px(w, h, draw));

// ---------- 零件 ----------
// 斜屋頂的瓦片：一排 4 像素高、瓦片 6 像素寬，上下排錯開；span(y) 回傳這一排從哪裡到哪裡
function tiles(r, top, bottom, span, base, w = 6) {
  const D = shade(base, -0.16), L = shade(base, 0.1), S = shade(base, -0.08);
  for (let y = top; y < bottom; y++) {
    const [a, b] = span(y); if (b <= a) continue;
    const row = Math.floor((y - top) / 4), k = (y - top) % 4;
    r(k === 3 ? D : k === 0 ? L : base, a, y, b - a, 1);
    if (k !== 3) for (let x = a + (row % 2 ? 3 : 0); x < b; x += w) r(S, x, y, 1, 1);
  }
}
// 梯形的屋頂：上緣 top、下緣 bottom，往下每兩排左右各寬一格
const slope = (top, bottom, x0, x1) => (y) => { const i = Math.floor((bottom - y) / 2); return [x0 + i, x1 - i]; };
function plaster(r, x, y, w, h, base, seed = 1) {
  r(base, x, y, w, h); const q = rnd(seed), d = shade(base, -0.05), l = shade(base, 0.04);
  for (let i = 0; i < (w * h) / 36; i++) r(q() > 0.5 ? d : l, x + Math.floor(q() * (w - 1)), y + Math.floor(q() * h), 2, 1);
}
function planks(r, x, y, w, h, base, vertical = false, seed = 2) {
  r(base, x, y, w, h); const q = rnd(seed), d = shade(base, -0.13), l = shade(base, 0.07);
  if (vertical) for (let i = x + 5; i < x + w; i += 6) { r(d, i, y, 1, h); r(l, i + 1, y, 1, h); }
  else for (let j = y; j < y + h; j += 5) { r(l, x, j, w, 1); if (j + 4 < y + h) r(d, x, j + 4, w, 1); }
  for (let i = 0; i < (w * h) / 110; i++) r(d, x + 1 + Math.floor(q() * (w - 3)), y + 1 + Math.floor(q() * (h - 2)), 2, 1); // 木頭的節
}
function stones(r, x, y, w, h, base, seed = 3) {
  r(shade(base, -0.2), x, y, w, h); const q = rnd(seed);
  for (let j = y, row = 0; j < y + h; j += 6, row++) {
    for (let i = x - (row % 2) * 4; i < x + w;) {
      const sw = 6 + Math.floor(q() * 5), a = Math.max(x, i), b = Math.min(x + w, i + sw - 1), hh = Math.min(5, y + h - j);
      if (b > a) { const c = shade(base, (q() - 0.5) * 0.1); r(c, a, j, b - a, hh); r(shade(c, 0.09), a, j, b - a, 1); r(shade(c, -0.06), a, j + hh - 1, b - a, 1); }
      i += sw;
    }
  }
}
function bricks(r, x, y, w, h, base) {
  r(shade(base, -0.22), x, y, w, h);
  for (let j = y, row = 0; j < y + h; j += 4, row++) for (let i = x - (row % 2) * 3; i < x + w; i += 7) {
    const a = Math.max(x, i), b = Math.min(x + w, i + 6); if (b > a) { r(base, a, j, b - a, Math.min(3, y + h - j)); r(shade(base, 0.08), a, j, b - a, 1); }
  }
}
// 窗戶：木框、玻璃上亮下暗、十字窗格、兩道反光、窗台
function windowBox(r, x, y, w, h, frame = '#5e3b20', glass = '#9ad6f6') {
  r(frame, x, y, w, h);
  const gx = x + 2, gy = y + 2, gw = w - 4, gh = h - 4;
  r(glass, gx, gy, gw, gh); r(shade(glass, 0.07), gx, gy, gw, Math.floor(gh / 2)); r(shade(glass, -0.12), gx, gy + gh - 2, gw, 2);
  for (let i = 0; i < Math.min(5, gh - 2); i++) { r('#ffffff', gx + 1 + i, gy + Math.min(5, gh - 2) - i, 1, 1); if (gx + 4 + i < gx + gw) r('#e4f4fc', gx + 4 + i, gy + Math.min(6, gh - 1) - i, 1, 1); }
  r(frame, gx + Math.floor(gw / 2) - 1, gy, 2, gh); r(frame, gx, gy + Math.floor(gh / 2) - 1, gw, 2);
  r(shade(frame, 0.2), x - 1, y + h, w + 2, 2); r(shade(frame, -0.1), x - 1, y + h + 2, w + 2, 1);
}
// 木門：門框、直的木紋、上面一條亮邊、門把
function door(r, x, y, w, h, col, knob = '#f6d34a') {
  r(shade(col, -0.22), x - 2, y - 2, w + 4, h + 2);
  r(col, x, y, w, h); for (let i = x + 4; i < x + w - 1; i += 5) r(shade(col, -0.1), i, y + 1, 1, h - 1);
  r(shade(col, 0.12), x + 1, y + 1, w - 2, 1); r(shade(col, -0.08), x + 3, y + Math.floor(h * 0.45), w - 6, 1);
  r(knob, x + w - 5, y + Math.floor(h * 0.55), 2, 2); r(shade(knob, 0.2), x + w - 5, y + Math.floor(h * 0.55), 1, 1);
}
// 遮雨棚：兩色條紋、下緣是一個一個的半圓
function awning(r, x, y, w, h, c1, c2 = '#ffffff', sw = 6) {
  for (let i = 0; i * sw < w; i++) {
    const col = i % 2 ? c2 : c1, xx = x + i * sw, ww = Math.min(sw, w - i * sw);
    r(col, xx, y, ww, h); r(shade(col, -0.12), xx, y + h - 2, ww, 2);
    if (ww > 3) { r(col, xx + 1, y + h, ww - 2, 2); r(shade(col, -0.15), xx + 2, y + h + 2, ww - 4, 1); }
  }
  r(shade(c1, 0.18), x, y, w, 1);
}
const eaveShadow = (r, x, y, w, h = 4) => { r('rgba(50,25,10,0.22)', x, y, w, h); r('rgba(50,25,10,0.12)', x, y + h, w, 2); };
// 花箱：木盒子、綠葉、紅黃的小花
function flowerBox(r, x, y, w) {
  r('#8d5d32', x, y, w, 5); r('#a8743f', x, y, w, 1); r('#5e3b20', x, y + 4, w, 1);
  for (let i = 0; i < w - 2; i += 3) { r('#4f9d3f', x + 1 + i, y - 2, 3, 2); r(i % 2 ? '#f6d34a' : '#e0393e', x + 1 + i + (i % 6 ? 1 : 0), y - 4, 2, 2); }
}
function lantern(r, x, y, col = '#e0393e') {
  r('#3a2818', x + 3, y - 3, 1, 3); r('#c9a227', x + 1, y, 6, 2);
  r(col, x, y + 2, 8, 9); r(shade(col, 0.15), x + 1, y + 3, 2, 6); r(shade(col, -0.18), x + 6, y + 3, 1, 7);
  r('#c9a227', x + 1, y + 11, 6, 2); r('#f6d34a', x + 3, y + 13, 2, 3);
}

// ---------- 牧場 ----------
// 房子（4×3 格）：紅瓦屋頂、磚頭煙囪、米色灰泥牆、木柱、牆腳石頭；擴建後多花箱、門燈，二樓多老虎窗、藍色的門
export function houseArt(level = 1) {
  return once('house' + level, () => build(128, 96, (r) => {
    bricks(r, 92, 4, 12, 26, '#a8503a'); r('#5e2a1e', 90, 2, 16, 3); r('#7a3a2a', 90, 2, 16, 1);
    tiles(r, 6, 44, slope(6, 44, 4, 124), '#c8553d');
    r(shade('#c8553d', 0.18), 42, 6, 44, 2);                                       // 屋脊
    r('#8f3424', 0, 44, 128, 4); r('#b0493a', 0, 44, 128, 1);                       // 屋簷
    plaster(r, 8, 48, 112, 48, '#f2e2c4'); eaveShadow(r, 8, 48, 112);
    for (const x of [8, 116]) { r('#b98a5a', x, 48, 4, 40); r('#d4a876', x, 48, 1, 40); }
    stones(r, 8, 86, 112, 10, '#b4ada2');
    for (const wx of [18, 86]) windowBox(r, wx, 58, 24, 20);
    door(r, 52, 60, 24, 36, level >= 3 ? '#3b6ea8' : '#7a4e2d');
    r('#c9c2b6', 48, 94, 32, 2);                                                   // 門口的台階
    if (level >= 2) {
      for (const wx of [17, 85]) flowerBox(r, wx, 82, 26);
      r('#3a3a40', 80, 60, 1, 3); r('#3a3a40', 78, 63, 6, 1); r('#f6d34a', 79, 64, 4, 6); r('#fff3b0', 80, 65, 2, 3); r('#3a3a40', 79, 70, 4, 1); // 門燈
    }
    if (level >= 3) {                                                              // 老虎窗
      tiles(r, 16, 30, slope(16, 30, 50, 78), '#a8432f', 5);
      plaster(r, 54, 30, 20, 14, '#f2e2c4', 5); windowBox(r, 57, 31, 14, 11);
    }
  }));
}
// 動物小屋（4×3 格）：深紅的瓦片屋頂、紅色直木板牆、白色的邊、大門上的白色 X、放乾草的小窗
export function barnArt() {
  return once('barn', () => build(128, 96, (r) => {
    tiles(r, 4, 32, (y) => { const i = Math.floor((y - 4) / 2); return [36 - i * 2, 92 + i * 2]; }, '#7a2e22');
    r(shade('#7a2e22', 0.2), 36, 4, 56, 2);
    r('#5e2219', 2, 32, 124, 4); r('#8a3a2c', 2, 32, 124, 1);
    planks(r, 8, 36, 112, 60, '#b8432f', true, 7); eaveShadow(r, 8, 36, 112);
    r('#f4efe6', 8, 36, 112, 2); r('#f4efe6', 8, 36, 2, 60); r('#f4efe6', 118, 36, 2, 60);
    r('#f4efe6', 50, 10, 28, 20); r('#e8c26a', 53, 13, 22, 14);                   // 乾草窗
    for (let i = 0; i < 10; i++) r(i % 2 ? '#c99a2e' : '#f2d27a', 54 + i * 2, 18 + (i % 3), 1, 9 - (i % 3));
    for (const wx of [16, 98]) windowBox(r, wx, 50, 14, 12, '#f4efe6', '#5a3a2a');
    r('#f4efe6', 42, 52, 44, 44); planks(r, 46, 56, 36, 40, '#8f2a1d', true, 3);    // 大門
    for (let i = 0; i < 36; i++) { const y = 56 + Math.floor(i * 40 / 36); r('#f4efe6', 46 + i, y, 2, 2); r('#f4efe6', 80 - i, y, 2, 2); }
    r('#f4efe6', 63, 56, 2, 40);
    r('#e8c26a', 22, 90, 10, 6); r('#c99a2e', 22, 94, 10, 2); r('#f2d27a', 23, 90, 4, 1); // 門口一捆乾草
  }));
}
// 種子店的攤位（2×2 格）：紅白遮陽棚、招牌上一棵小苗、木櫃台上擺著一箱一箱的菜
export function shopArt() {
  return once('shop', () => build(64, 64, (r, disc) => {
    for (const x of [6, 54]) { r('#8d5d32', x, 22, 4, 42); r('#a8743f', x, 22, 1, 42); }
    r('#c9a227', 16, 0, 32, 12); r('#8d5d32', 16, 0, 32, 2); r('#8d5d32', 16, 10, 32, 2); r('#f6d34a', 18, 2, 28, 8);
    r('#3f8a34', 31, 4, 2, 6); disc('#6cc25a', 29, 5, 2, 1); disc('#6cc25a', 35, 4, 2, 1);
    awning(r, 0, 12, 64, 12, '#e0393e', '#ffffff', 8);
    planks(r, 2, 42, 60, 22, '#bd864f', false, 4); r('#8d5d32', 2, 40, 60, 3); r('#d9a46a', 2, 40, 60, 1);
    const crate = (x, col, hi) => { r('#a8743f', x, 32, 12, 9); r('#7a4e2d', x, 40, 12, 1); for (let i = 0; i < 3; i++) { disc(col, x + 2 + i * 4, 32, 2, 2); r(hi, x + 1 + i * 4, 31, 1, 1); } };
    crate(5, '#e0393e', '#ffb0a0'); crate(19, '#f28b2c', '#ffd0a0'); crate(33, '#6cc25a', '#c8f0a0'); crate(47, '#f6d34a', '#fff3b0');
  }));
}
// 溫室（5×3 格）：還沒蓋是一塊圍起來的空地和牌子；蓋好是白框玻璃屋，看得到裡面的菜
export function greenhouseArt(built) {
  return once('gh' + (built ? 1 : 0), () => build(160, 96, (r, disc) => {
    if (!built) {
      r('#a77b4f', 8, 28, 144, 64); const q = rnd(11);
      for (let i = 0; i < 90; i++) r(q() > 0.5 ? '#946a40' : '#b88c5c', 8 + Math.floor(q() * 143), 28 + Math.floor(q() * 63), 2, 1);
      for (const [x, y] of [[24, 44], [60, 72], [104, 52], [128, 80], [40, 80]]) { disc('#9c968b', x, y, 4, 3); r('#c9c5bf', x - 2, y - 2, 3, 1); }
      for (let x = 4; x < 160; x += 20) { r('#8d5d32', x, 20, 4, 16); r('#8d5d32', x, 80, 4, 16); r('#a8743f', x, 20, 1, 16); }
      r('#d9b07a', 4, 24, 152, 2); r('#d9b07a', 4, 84, 152, 2);                   // 圍起來的繩子
      r('#8d5d32', 78, 36, 4, 34); r('#e8c28a', 62, 28, 36, 20); r('#8d5d32', 62, 28, 36, 2); r('#8d5d32', 62, 46, 36, 2);
      for (const x of [70, 78, 86]) { r('#3f8a34', x + 1, 34, 2, 8); disc('#6cc25a', x, 34, 2, 1); disc('#6cc25a', x + 4, 33, 2, 1); }
      return;
    }
    tiles(r, 2, 34, slope(2, 34, 16, 144), '#bfe6f6', 16);
    for (let y = 2; y < 34; y += 8) { const [a, b] = slope(2, 34, 16, 144)(y); r('#ffffff', a, y, b - a, 1); }
    r('#ffffff', 78, 0, 4, 34); r('#e8f4fa', 4, 32, 152, 4);
    r('#9fd0ea', 8, 36, 144, 60); r('#b6e0f2', 8, 36, 144, 14);                     // 玻璃牆
    const q = rnd(5);
    for (let x = 12; x < 150; x += 9) { const h = 8 + Math.floor(q() * 8); disc(q() > 0.4 ? '#4f9d3f' : '#6cc25a', x, 80 - h / 2, 4, h / 2); if (q() > 0.6) disc('#e0393e', x + 1, 78 - h / 2, 1, 1); }
    r('#7a5a3a', 8, 84, 144, 4);                                                    // 裡面的田
    for (let x = 8; x < 154; x += 24) { r('#ffffff', x, 36, 3, 60); r('#d8e8f0', x + 2, 36, 1, 60); }
    r('#ffffff', 8, 60, 144, 2); r('#ffffff', 8, 92, 144, 4);
    for (let i = 0; i < 6; i++) { r('rgba(255,255,255,0.55)', 20 + i, 46 - i, 1, 1); r('rgba(255,255,255,0.55)', 110 + i, 48 - i, 1, 1); }
    r('#ffffff', 62, 48, 36, 48); r('#bfe6f6', 66, 52, 28, 44); r('#ffffff', 79, 52, 2, 44); r('#f6d34a', 74, 74, 3, 3); r('#f6d34a', 83, 74, 3, 3); // 門
  }));
}

// ---------- 小鎮 ----------
// 阿福伯的雜貨店：招牌、綠白遮雨棚、櫥窗裡的鋤頭和澆水壺、玻璃門
export function storeArt() {
  return once('store', () => build(128, 96, (r) => {
    r('#7a4e2d', 4, 8, 120, 6); r('#9a6a40', 4, 8, 120, 1); r('#8d5d32', 8, 14, 112, 6);
    r('#8d5d32', 26, 0, 76, 14); r('#f6d34a', 28, 2, 72, 10); r('#fff0a0', 28, 2, 72, 1);
    for (let x = 34; x < 96; x += 8) { r('#7a4e2d', x, 4, 4, 6); r('#9a6a40', x, 4, 4, 1); }
    plaster(r, 8, 20, 112, 76, '#e8dcc0', 3);
    awning(r, 8, 22, 112, 12, '#3f9a3f', '#ffffff', 8);
    r('#5e3b20', 14, 44, 46, 36); r('#bfe6f6', 16, 46, 42, 32); r('#d8f0fa', 16, 46, 42, 10);   // 櫥窗
    r('#8d5d32', 22, 56, 3, 20); r('#9aa3a8', 18, 54, 12, 4); r('#c3c8cc', 18, 54, 12, 1);         // 鋤頭
    r('#4aa3df', 36, 62, 14, 12); r('#4aa3df', 48, 60, 6, 3); r('#3487c6', 36, 72, 14, 2); r('#7ac0ea', 38, 63, 4, 4); r('#3487c6', 38, 58, 8, 2); // 澆水壺
    for (let i = 0; i < 6; i++) r('#ffffff', 44 + i, 52 - i, 1, 1);
    r('#5e3b20', 13, 80, 48, 3);
    door(r, 76, 46, 32, 50, '#7a4e2d'); r('#bfe6f6', 80, 50, 24, 16); r('#5e3b20', 91, 50, 2, 16);
    stones(r, 8, 90, 64, 6, '#b4ada2', 9);
  }));
}
// 美玲姐的小吃店：深紅瓦片、紅底金字招牌、兩盞紅燈籠、紅布簾、門口的蒸籠在冒煙
export function eateryArt() {
  return once('eatery', () => build(128, 96, (r) => {
    tiles(r, 6, 18, (y) => [4, 124], '#5e2219', 6);
    r('#7a2e22', 8, 18, 112, 5); r('#9a3e30', 8, 18, 112, 1);
    r('#a8252b', 20, 0, 88, 12); r('#c8553d', 22, 2, 84, 8); for (let x = 30; x < 100; x += 12) r('#f6d34a', x, 4, 6, 4);
    plaster(r, 8, 23, 112, 73, '#f2e2c4', 6); eaveShadow(r, 8, 23, 112);
    lantern(r, 14, 28); lantern(r, 106, 28);
    for (let i = 0; i < 7; i++) { const x = 36 + i * 8; r('#c8302e', x, 28, 7, 18); r('#e0393e', x, 28, 7, 2); r('#9a2222', x + 6, 30, 1, 16); }
    r('#ffffff', 58, 34, 12, 2); r('#ffffff', 63, 31, 2, 8);                          // 布簾上的白字
    door(r, 44, 48, 40, 48, '#7a4e2d');
    r('#c9a96a', 14, 70, 22, 8); r('#d8b878', 14, 62, 22, 8); r('#b8955a', 14, 78, 22, 4); r('#e8c890', 14, 62, 22, 1); r('#a8854a', 14, 69, 22, 1); // 蒸籠
    for (const [x, y] of [[18, 54], [24, 50], [30, 55]]) { r('#ffffff', x, y, 2, 5); r('#f4f4f4', x + 1, y - 3, 2, 3); }
    stones(r, 8, 90, 112, 6, '#b4ada2', 4);
  }));
}
// 民宅（3×2 格）：藍、綠、粉紅三種屋頂，門口各擺不一樣的東西
const HOME_ROOFS = ['#3b6ea8', '#4f9d6b', '#b8656e'];
export function homeArt(i = 0) {
  const roof = HOME_ROOFS[i % HOME_ROOFS.length];
  return once('home' + (i % 3), () => build(96, 64, (r, disc) => {
    tiles(r, 4, 24, (y) => { const k = Math.floor((y - 4) / 2); return [28 - k * 2, 68 + k * 2]; }, roof);
    r(shade(roof, 0.2), 28, 4, 40, 2);
    r(shade(roof, -0.3), 4, 24, 88, 3);
    plaster(r, 8, 27, 80, 37, '#f6efe0', 8 + i); eaveShadow(r, 8, 27, 80);
    windowBox(r, 14, 34, 18, 14); windowBox(r, 66, 34, 18, 14);
    door(r, 40, 38, 18, 26, ['#7a4e2d', '#5e3b20', '#8d5d32'][i % 3]);
    stones(r, 8, 60, 80, 4, '#b4ada2', 12 + i);
    if (i % 3 === 0) { r('#c8553d', 62, 54, 8, 7); r('#a8432e', 62, 54, 8, 1); disc('#4f9d3f', 66, 51, 4, 3); r('#e0393e', 64, 49, 2, 2); }   // 盆栽
    else if (i % 3 === 1) { r('#5e3b20', 62, 58, 14, 2); for (let k = 0; k < 4; k++) disc(['#f6d34a', '#ffffff', '#f6b6c9', '#e0393e'][k], 64 + k * 3, 55, 1, 1); } // 一排小花
    else { r('#4aa3df', 62, 54, 10, 8); r('#3487c6', 62, 61, 10, 1); r('#7ac0ea', 63, 55, 3, 3); r('#3487c6', 71, 52, 4, 2); } // 小水桶
  }));
}
// 鐵匠鋪（2×2 格）：石頭牆、冒煙的煙囪、門口的爐火（兩張輪流畫，火會閃）、鐵鎚招牌、鐵砧
export function smithArt(f = 0) {
  return once('smith' + f, () => build(64, 64, (r, disc) => {
    stones(r, 44, 6, 12, 14, '#8a857c', 2);
    disc('#d8d4cc', f ? 48 : 51, 3, 3, 2); disc('#e8e4dc', f ? 54 : 46, 1, 2, 1);
    tiles(r, 10, 24, (y) => { const k = Math.floor((y - 10) / 2); return [12 - k, 52 + k]; }, '#8a3e2c');
    r('#5e2a1e', 2, 23, 60, 3);
    stones(r, 4, 26, 56, 36, '#a8a196', 6);
    r('#2b2421', 24, 34, 18, 28); r('#5e3b20', 22, 32, 22, 3);
    r(f ? '#f6a04a' : '#e0763a', 27, 46, 12, 12); r(f ? '#f6d34a' : '#f6b04a', 30, 49, 6, 7); r('#fff3b0', 32, 52, 2, 3);
    r('#3a2818', 6, 32, 12, 2); r('#8d5d32', 7, 34, 14, 10); r('#a8743f', 7, 34, 14, 1);   // 招牌
    r('#c3c8cc', 9, 36, 8, 3); r('#5e3b20', 12, 39, 2, 4);
    r('#4a4a52', 46, 50, 14, 3); r('#5e5e66', 46, 50, 14, 1); r('#3a3a40', 49, 53, 8, 4); r('#2b2b30', 46, 57, 14, 3); // 鐵砧
    r('#6e6a64', 2, 62, 60, 2);
  }));
}
// 噴水池（2×2 格）：圓形石頭池子、中間的石柱、水柱（兩張輪流畫，水會動）
export function fountainArt(frame = 0) {
  return once('fountain' + frame, () => build(64, 64, (r, disc) => {
    disc('#8a857c', 32, 38, 29, 22); disc('#b4ada2', 32, 36, 28, 21); disc('#9c968b', 32, 38, 23, 16);
    disc('#4aa3df', 32, 38, 22, 15); disc('#6ab8e8', 30, 35, 16, 9);
    for (const [x, y] of [[18, 40], [42, 44], [24, 48], [44, 34]]) r('#bfe6f6', x + (frame ? 1 : 0), y, 5, 1);
    r('#c9c2b6', 28, 20, 8, 22); r('#e0dad0', 28, 20, 3, 22); disc('#d6d1c7', 32, 20, 6, 3);
    const h = frame ? 0 : 2;
    r('#bfe6f6', 31, 4 + h, 2, 15); r('#ffffff', 31, 4 + h, 1, 6);
    for (const d of [-1, 1]) for (let i = 0; i < 6; i++) r('#9ad6f6', 32 + d * (3 + i * 2), 9 + h + i * 2 + (i * i) / 4, 2, 2);
    for (const [x, y] of [[20, 30], [44, 30]]) r('#ffffff', x, y + (frame ? 1 : 0), 2, 1);
  }));
}
// 小鎮修復計畫的四棟建築（2×2 格）：修好之前顏色舊舊的、門窗釘著木板、旁邊立著施工牌
const PROJECT_LOOK = {
  temple: { roof: '#c8302e', trim: '#f2c94a', wall: '#f2e2c4', door: '#8a2a20', old: ['#7a6a5e', '#9c8e80', '#b8ab98'] },
  station: { roof: '#3b6ea8', trim: '#f4f1e8', wall: '#e8e4dc', door: '#5e3b20', old: ['#5e6670', '#8a8e92', '#b4b0a8'] },
  coop: { roof: '#3f7a3a', trim: '#f6d34a', wall: '#f4efe0', door: '#7a4e2d', old: ['#5e6a58', '#8e9484', '#b8b4a4'] },
  harbor: { roof: '#7a4e2d', trim: '#4aa3df', wall: '#c9a477', door: '#5e3b20', old: ['#5e5048', '#7e7064', '#a09280'] },
};
export function projectArt(kind, restored) {
  return once(`project_${kind}_${restored ? 1 : 0}`, () => build(64, 64, (r, disc) => {
    const L = PROJECT_LOOK[kind] || PROJECT_LOOK.coop;
    const roof = restored ? L.roof : L.old[0], trim = restored ? L.trim : L.old[1], wall = restored ? L.wall : L.old[2];
    if (kind === 'temple') {
      // 土地公廟：兩邊翹起來的屋簷、屋脊上的金色裝飾、紅柱子、香爐
      tiles(r, 8, 20, (y) => [8 - Math.max(0, 12 - (y - 8)) / 3, 56 + Math.max(0, 12 - (y - 8)) / 3], roof, 5);
      r(roof, 0, 8, 8, 3); r(roof, 56, 8, 8, 3); r(roof, 0, 6, 3, 2); r(roof, 61, 6, 3, 2);
      tiles(r, 2, 8, (y) => [14, 50], roof, 5); r(trim, 24, 0, 16, 4); r(trim, 12, 2, 4, 3); r(trim, 48, 2, 4, 3);
      r(trim, 6, 20, 52, 2);
      plaster(r, 8, 22, 48, 38, wall, 4);
      for (const x of [10, 48]) { r(restored ? '#c8302e' : L.old[1], x, 22, 6, 38); r(shade(restored ? '#c8302e' : L.old[1], 0.15), x, 22, 1, 38); }
      door(r, 24, 32, 16, 28, L.door, restored ? '#f6d34a' : '#8a8680');
      r(restored ? '#f6d34a' : '#8a8680', 26, 25, 12, 5); r(restored ? '#c8302e' : '#6e6a64', 28, 26, 8, 3);
      if (restored) { r('#8d5d32', 26, 54, 12, 6); r('#c9a227', 27, 52, 10, 2); r('#ffffff', 30, 42, 1, 10); r('#ffffff', 34, 44, 1, 8); r('#e8e4dc', 31, 40, 1, 2); }
    } else if (kind === 'station') {
      // 老車站：斜屋頂、山牆上的時鐘、兩扇窗、月台
      tiles(r, 8, 20, (y) => [0, 64], roof, 6); r(trim, 0, 20, 64, 2);
      r(trim, 24, 0, 16, 12); r(shade(trim, -0.2), 24, 10, 16, 2);
      disc(restored ? '#ffffff' : L.old[2], 32, 6, 5, 4); r(restored ? '#2b2421' : L.old[0], 32, 3, 1, 4); r(restored ? '#2b2421' : L.old[0], 32, 6, 3, 1);
      plaster(r, 4, 22, 56, 34, wall, 7);
      door(r, 26, 36, 12, 20, L.door);
      windowBox(r, 8, 30, 12, 12, '#5e3b20', restored ? '#9ad6f6' : L.old[0]); windowBox(r, 44, 30, 12, 12, '#5e3b20', restored ? '#9ad6f6' : L.old[0]);
      if (restored) { r('#3b6ea8', 8, 24, 48, 4); r('#f4f1e8', 16, 25, 32, 2); }
      stones(r, 0, 56, 64, 8, '#a8a196', 8);
    } else if (kind === 'coop') {
      // 農會：倉庫式的屋頂、黃色招牌、門口的稻穀袋
      tiles(r, 2, 20, (y) => { const k = Math.floor((y - 2) / 2); return [16 - k * 2, 48 + k * 2]; }, roof);
      r(shade(roof, -0.25), 2, 20, 60, 2);
      plaster(r, 4, 22, 56, 40, wall, 9);
      r(trim, 12, 24, 40, 7); r(shade(trim, -0.2), 12, 30, 40, 1);
      if (restored) for (let x = 16; x < 48; x += 6) r('#3f8a34', x, 26, 3, 2);
      planks(r, 24, 36, 16, 26, L.door, true, 5); r('#5e3b20', 31, 36, 2, 26);
      if (restored) { for (const x of [6, 46]) { r('#e8d29a', x, 50, 10, 12); r('#c9a96a', x, 50, 10, 2); r('#b8955a', x + 9, 52, 1, 10); } r('#4f9d3f', 18, 24, 6, 2); }
    } else {
      // 漁會：木頭小屋、晾著的漁網、船錨
      tiles(r, 6, 22, (y) => [y < 12 ? 8 : 0, y < 12 ? 56 : 64], roof, 6);
      planks(r, 4, 22, 56, 38, wall, true, 6);
      door(r, 26, 36, 12, 24, L.door);
      windowBox(r, 8, 28, 12, 10, '#5e3b20', trim); windowBox(r, 44, 28, 12, 10, '#5e3b20', trim);
      if (restored) { for (let x = 44; x < 60; x += 3) r('#e8e4dc', x, 42, 1, 16); for (let y = 42; y < 58; y += 3) r('#e8e4dc', 44, y, 16, 1);
        r('#5e5a54', 9, 44, 2, 12); r('#5e5a54', 5, 52, 10, 2); r('#5e5a54', 7, 44, 6, 2); disc('#5e5a54', 10, 42, 2, 2); }
    }
    if (!restored) {
      // 釘起來的木板、裂痕、施工中的牌子
      r('#a8743f', 20, 40, 24, 4); r('#a8743f', 22, 50, 20, 4); r('#c9925a', 20, 40, 24, 1); r('#5e3b20', 21, 41, 2, 2); r('#5e3b20', 41, 51, 2, 2);
      r('#2b2421', 12, 28, 1, 6); r('#2b2421', 13, 33, 1, 5); r('#2b2421', 14, 37, 1, 3); r('#2b2421', 50, 26, 5, 1); r('#2b2421', 54, 27, 1, 3);
      r('#f6d34a', 1, 50, 16, 10); r('#2b2421', 3, 52, 12, 2); r('#2b2421', 3, 56, 12, 2); r('#5e3b20', 7, 60, 4, 4);
    }
  }));
}
// 後山的洞窟入口（2×2 格）：岩壁、黑黑的洞口、木頭框、油燈、鐵軌
export function caveMouthArt() {
  return once('cave_mouth', () => build(64, 64, (r, disc) => {
    disc('#6e6a64', 32, 34, 32, 30); stones(r, 2, 8, 60, 56, '#8a8680', 13);
    disc('#a4a09a', 14, 10, 6, 3); disc('#a4a09a', 46, 10, 7, 3);
    r('#120e0c', 16, 20, 32, 44); r('#120e0c', 20, 16, 24, 4); r('#241c18', 16, 20, 4, 44);
    r('#7a4e2d', 14, 18, 4, 46); r('#7a4e2d', 46, 18, 4, 46); r('#8d5d32', 14, 16, 36, 4); r('#a8743f', 14, 16, 36, 1);
    r('#2b2421', 42, 20, 1, 4); r('#f6d34a', 40, 24, 6, 6); r('#fff3b0', 42, 26, 2, 2); r('#3a3a40', 40, 30, 6, 1);
    r('#9aa3a8', 22, 56, 2, 8); r('#9aa3a8', 40, 56, 2, 8);
    for (let y = 57; y < 64; y += 3) r('#5e3b20', 20, y, 24, 2);
  }));
}
// 夜市的攤位（2×2 格，往上多畫 12 個像素）：條紋遮雨棚、木頭檯面、每一攤擺的東西不一樣
const STALL_STRIPE = { goldfish: '#3a8fd6', ring: '#e0393e', snack: '#f28b2c', special: '#8a4fc0' };
export function stallArt(kind) {
  return once('stall_' + kind, () => build(64, 56, (r, disc) => {
    const c = STALL_STRIPE[kind] || '#e0393e';
    for (const x of [4, 56]) { r('#5e3b20', x, 12, 4, 44); r('#7a4e2d', x, 12, 1, 44); }
    awning(r, 0, 0, 64, 14, c, '#ffffff', 8);
    r('#8d5d32', 2, 36, 60, 6); r('#a8743f', 2, 36, 60, 2);
    r('#7a4e2d', 4, 42, 56, 14); r(c, 8, 44, 48, 8); r('#ffffff', 12, 46, 40, 4);
    if (kind === 'goldfish') {
      disc('#c9dde6', 32, 32, 22, 6); disc('#9ad6f6', 32, 31, 20, 4); r('#4aa3df', 12, 30, 40, 1);
      for (const [x, y] of [[18, 31], [28, 29], [38, 32], [46, 30]]) { r('#f28b2c', x, y, 4, 2); r('#e0393e', x + 4, y, 2, 2); r('#ffffff', x + 1, y, 1, 1); }
    } else if (kind === 'ring') {
      for (let i = 0; i < 5; i++) { const x = 10 + i * 10; r(i % 2 ? '#7a4e2d' : '#3f9a3f', x, 22, 6, 14); r(shade(i % 2 ? '#7a4e2d' : '#3f9a3f', 0.15), x, 22, 2, 14); r('#c9dde6', x + 2, 18, 2, 4); }
      r('#f6d34a', 22, 30, 10, 2); r('#f6d34a', 22, 34, 10, 2);
    } else if (kind === 'snack') {
      r('#3a3a3a', 10, 30, 24, 6); r('#5a5a5a', 12, 28, 20, 2); r('#f2b33d', 16, 26, 12, 4); r('#d8902a', 16, 29, 12, 1);
      for (const x of [18, 24]) r('#ffffff', x, 18, 2, 6);
      r('#f6efe0', 42, 22, 10, 14); r('#8d5d32', 42, 28, 10, 8); r('#2b2421', 44, 32, 2, 2); r('#2b2421', 48, 34, 2, 2); r('#e0393e', 46, 16, 2, 8);
    } else {
      r('#e0393e', 10, 24, 12, 12); r('#f6d34a', 14, 24, 4, 12); r('#f6d34a', 10, 28, 12, 2);
      r('#b98ae0', 28, 24, 8, 12); r('#e0c8f6', 30, 24, 2, 4);
      r('#f2b33d', 42, 24, 10, 12); r('#8d5d32', 42, 22, 10, 2); r('#ffe08a', 44, 26, 2, 6);
    }
  }));
}

// ---------- 小東西（一格） ----------
// 柵欄：看旁邊哪幾格也是柵欄，橫的接橫條、直的接直條（mask：1 上、2 右、4 下、8 左）
function fenceArt(mask) {
  return once('fence' + mask, () => build(32, 32, (r) => {
    const W = '#8d5d32', L = '#bd864f', D = '#6b4426';
    const horiz = mask & 10 || !(mask & 5);
    if (mask & 8 || (horiz && !(mask & 2) && !(mask & 8))) { r(L, 0, 9, 16, 4); r(D, 0, 12, 16, 1); r(L, 0, 18, 16, 4); r(D, 0, 21, 16, 1); }
    if (mask & 2 || (horiz && !(mask & 2) && !(mask & 8))) { r(L, 16, 9, 16, 4); r(D, 16, 12, 16, 1); r(L, 16, 18, 16, 4); r(D, 16, 21, 16, 1); }
    if (mask & 1) { r(L, 13, 0, 3, 8); r(L, 18, 0, 3, 8); r(D, 15, 0, 1, 8); r(D, 20, 0, 1, 8); }
    if (mask & 4) { r(L, 13, 22, 3, 10); r(L, 18, 22, 3, 10); r(D, 15, 22, 1, 10); r(D, 20, 22, 1, 10); }
    r(W, 12, 4, 8, 22); r(L, 12, 4, 2, 22); r(D, 18, 4, 2, 22); r('#a8743f', 12, 3, 8, 2); r(D, 13, 24, 6, 2);
  }));
}
// 出貨箱：木箱、鐵條、蓋子
const binArt = () => once('bin', () => build(32, 32, (r) => {
  planks(r, 3, 10, 26, 18, '#bd864f', false, 21); r('#9a6a3a', 2, 6, 28, 5); r('#d9a46a', 2, 6, 28, 1);
  for (const x of [6, 24]) { r('#7a7a82', x, 6, 2, 22); r('#a8a8b0', x, 6, 1, 22); }
  r('#5e3b20', 4, 28, 3, 2); r('#5e3b20', 25, 28, 3, 2); r('#f6d34a', 14, 8, 4, 2);
}));
// 布告欄：木框、釘著幾張紙
const boardArt = () => once('board', () => build(32, 32, (r) => {
  for (const x of [6, 23]) { r('#7a4e2d', x, 20, 3, 12); r('#9a6a40', x, 20, 1, 12); }
  r('#7a4e2d', 2, 2, 28, 22); r('#c9a477', 4, 4, 24, 18); const q = rnd(31);
  for (let i = 0; i < 18; i++) r('#b8925e', 4 + Math.floor(q() * 23), 4 + Math.floor(q() * 17), 2, 1);
  for (const [x, y, w, h, c] of [[6, 6, 8, 9, '#ffffff'], [16, 6, 9, 6, '#f6e08a'], [17, 14, 8, 6, '#f4a3b5']]) {
    r(c, x, y, w, h); r(shade(c, -0.1), x, y + h - 1, w, 1); for (let k = 2; k < h - 1; k += 2) r('#9c968b', x + 1, y + k, w - 2, 1); r('#e0393e', x + Math.floor(w / 2), y, 1, 1);
  }
}));
// 信箱：紅色的信箱、旗子豎起來表示有信
const mailboxArt = (up) => once('mailbox' + (up ? 1 : 0), () => build(32, 32, (r) => {
  r('#5e3b20', 14, 18, 4, 14); r('#7a4e2d', 14, 18, 1, 14); r('#3a2818', 11, 30, 10, 2);
  r('#b8442e', 5, 6, 22, 14); r('#d9583e', 5, 6, 22, 4); r('#e8705a', 7, 7, 18, 1); r('#8d2e20', 5, 18, 22, 2); r('#2b2421', 10, 12, 12, 2);
  if (up) { r('#c9a227', 26, 0, 2, 14); r('#e0393e', 26, 0, 6, 6); r('#ff6a6a', 26, 0, 6, 1); }
  else { r('#c9a227', 26, 12, 6, 2); r('#e0393e', 28, 12, 4, 4); }
}));
// 家庭留言板：軟木板，貼了幾張就畫幾張（最多 6 張）
const familyBoardArt = (n) => once('familyboard' + n, () => build(32, 32, (r) => {
  for (const x of [6, 23]) { r('#7a4e2d', x, 22, 3, 10); r('#9a6a40', x, 22, 1, 10); }
  r('#8d5d32', 2, 2, 28, 22); r('#d4a876', 4, 4, 24, 18); const q = rnd(7);
  for (let i = 0; i < 20; i++) r('#c09060', 4 + Math.floor(q() * 23), 4 + Math.floor(q() * 17), 1, 1);
  const spots = [[6, 6], [14, 6], [22, 6], [8, 14], [16, 14], [22, 14]], cols = ['#f6e08a', '#f6b6c9', '#a8d8f0', '#c8f0a8', '#f2c8a0', '#e0c8f0'];
  for (let i = 0; i < Math.min(6, n); i++) { const [x, y] = spots[i]; r(cols[i], x, y, 6, 6); r(shade(cols[i], -0.12), x, y + 5, 6, 1); r('#d9344a', x + 2, y, 2, 1); }
}));

// ---------- 地面 ----------
// 石板廣場：大小石板交錯、灰縫、每塊顏色有一點不一樣
const plazaArt = () => once('plaza', () => flat(32, 32, (r) => {
  r('#9c968b', 0, 0, 32, 32); const q = rnd(17);
  for (const [x, y, w, h] of [[0, 0, 15, 15], [16, 0, 15, 15], [0, 16, 7, 15], [8, 16, 15, 15], [24, 16, 7, 15]]) {
    const c = shade('#d6d1c7', (q() - 0.5) * 0.06); r(c, x, y, w, h); r(shade(c, 0.05), x, y, w, 1); r(shade(c, 0.05), x, y, 1, h); r(shade(c, -0.07), x, y + h - 1, w, 1);
    for (let i = 0; i < 4; i++) r(shade(c, -0.05), x + 1 + Math.floor(q() * (w - 2)), y + 1 + Math.floor(q() * (h - 2)), 1, 1);
  }
}));
const gravelArt = () => once('gravel', () => flat(32, 32, (r) => {
  r('#dcbb87', 0, 0, 32, 32); const q = rnd(23);
  for (let i = 0; i < 46; i++) { const x = Math.floor(q() * 31), y = Math.floor(q() * 31), c = ['#c9a571', '#b8956a', '#e8d0a4', '#a8a196'][Math.floor(q() * 4)]; r(c, x, y, 2, 1); if (q() > 0.6) r(shade(c, -0.1), x, y + 1, 2, 1); }
}));
// 池塘的水：深淺兩層、會動的波紋（兩張輪流畫）
const waterArt = (f) => once('water' + f, () => flat(32, 32, (r) => {
  r('#4aa3df', 0, 0, 32, 32); const q = rnd(41);
  for (let i = 0; i < 10; i++) r('#3f96d2', Math.floor(q() * 28), Math.floor(q() * 30), 5, 2);
  for (const [x, y] of [[4, 5], [20, 9], [9, 18], [24, 24], [2, 27]]) { const xx = (x + f * 2) % 28; r('#9ad6f6', xx, y, 5, 1); r('#7ac0ea', xx + 1, y + 1, 3, 1); }
  if (f) r('#ffffff', 14, 14, 2, 1); else r('#ffffff', 27, 4, 2, 1);
}));
// 水邊：靠岸那一側一條淺淺的水花和一條比較深的水
const shoreArt = (side) => once('shore_' + side, () => flat(32, 32, (r) => {
  const band = (a, b) => { if (side === 'top') { r(a, 0, 0, 32, 2); r(b, 0, 2, 32, 2); } else if (side === 'bottom') { r(a, 0, 30, 32, 2); r(b, 0, 28, 32, 2); }
    else if (side === 'left') { r(a, 0, 0, 2, 32); r(b, 2, 0, 2, 32); } else { r(a, 30, 0, 2, 32); r(b, 28, 0, 2, 32); } };
  band('#d8f0fa', '#3487c6');
}));

// ---------- 對外 ----------
// sprite() 用名字找圖：有第二期的新圖就回傳，沒有回傳 null
export function townSprite(name) {
  let m;
  if ((m = /^fence_(\d+)$/.exec(name))) return fenceArt(Number(m[1]) & 15);
  if (name === 'fence') return fenceArt(10);
  if (name === 'bin') return binArt();
  if (name === 'board') return boardArt();
  if (name === 'plaza') return plazaArt();
  if (name === 'gravel') return gravelArt();
  if (name === 'water0' || name === 'water1') return waterArt(Number(name.slice(5)));
  if ((m = /^shore_(top|bottom|left|right)$/.exec(name))) return shoreArt(m[1]);
  return null;
}
export { mailboxArt, familyBoardArt, PROJECT_LOOK, STALL_STRIPE };
export const TOWN_ART = ['house', 'barn', 'shop', 'greenhouse', 'store', 'eatery', 'home', 'smith', 'fountain', 'project', 'cave_mouth', 'stall', 'fence', 'bin', 'board', 'mailbox', 'familyboard', 'plaza', 'gravel', 'water', 'shore'];
