// 產生 PWA 用的 PNG 圖示（不依賴任何套件；用 node:zlib 直接編出 PNG）。
// 執行：npm run icons  →  輸出到 public/icons/
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BRAND = [0x4a, 0x8f, 0xbf]; // 海洋藍
const WHITE = [0xff, 0xff, 0xff];

// ---- 形狀（以 0..1 正規化座標描述，與 public/icon.svg 相同構圖） ----

function roundedRectSDF(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function inTriangle(px, py, a, b, c) {
  const s = (p1, p2) => (px - p2[0]) * (p1[1] - p2[1]) - (p1[0] - p2[0]) * (py - p2[1]);
  const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// 泡泡內的愛心（兩圓＋三角形近似，座標對應 public/icon.svg 的心形）
function inHeart(u, v) {
  if (Math.hypot(u - 0.416, v - 0.392) < 0.088) return true;
  if (Math.hypot(u - 0.584, v - 0.392) < 0.088) return true;
  return inTriangle(u, v, [0.338, 0.413], [0.662, 0.413], [0.5, 0.594]);
}

// 回傳 [r,g,b,a]；fullBleed=true 時整張填滿綠色（maskable / iOS 用）
function sample(x, y, fullBleed) {
  const bg = fullBleed ? 0 : roundedRectSDF(x, y, 0.5, 0.5, 0.5, 0.5, 0.225);
  if (!fullBleed && bg > 0) return [0, 0, 0, 0];
  // maskable 安全區：圖案縮小置中
  const s = fullBleed ? 0.78 : 1;
  const u = (x - 0.5) / s + 0.5;
  const v = (y - 0.5) / s + 0.5;
  const bubble = roundedRectSDF(u, v, 0.5, 0.47, 0.31, 0.19, 0.19);
  const tail = inTriangle(u, v, [0.324, 0.605], [0.299, 0.782], [0.48, 0.645]);
  if (bubble <= 0 || tail) {
    if (inHeart(u, v)) return [...BRAND, 255];
    return [...WHITE, 255];
  }
  return [...BRAND, 255];
}

function render(size, fullBleed) {
  const data = new Uint8Array(size * size * 4);
  const SS = 3; // 3x3 supersampling 抗鋸齒
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb, pa] = sample(
            (x + (sx + 0.5) / SS) / size,
            (y + (sy + 0.5) / SS) / size,
            fullBleed);
          r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
        }
      }
      const i = (y * size + x) * 4;
      data[i] = a ? Math.round(r / a) : 0;
      data[i + 1] = a ? Math.round(g / a) : 0;
      data[i + 2] = a ? Math.round(b / a) : 0;
      data[i + 3] = Math.round(a / (SS * SS));
    }
  }
  return data;
}

// ---- 最小 PNG 編碼器 ----

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, payload) {
  const out = Buffer.alloc(12 + payload.length);
  out.writeUInt32BE(payload.length, 0);
  out.write(type, 4, 'ascii');
  payload.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + payload.length)), 8 + payload.length);
  return out;
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const jobs = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];
for (const [name, size, fullBleed] of jobs) {
  const png = encodePng(size, render(size, fullBleed));
  writeFileSync(join(outDir, name), png);
  console.log(`✓ public/icons/${name} (${png.length} bytes)`);
}
