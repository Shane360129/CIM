// 外掛圖包：用繪圖程式（AI 生圖、Aseprite、手繪…）畫好的圖，蓋過用程式畫的圖。
// 圖放在 /farm-pack/atlas.png（一大張），manifest.json 記每張小圖的位置；兩個檔都是 scripts/farm-pack.mjs 產生的。
// 圖包裡有的名字用圖包的，沒有的照舊用程式畫，所以可以一批一批慢慢換；整個資料夾刪掉遊戲也照樣能跑。
// 每張圖帶三個數字：hd（幾個像素算遊戲裡的一個單位）、oy（比佔的格子高出多少像素，往上長）、ox（比佔的格子寬出多少，左右各一半）
const sprites = new Map(), flips = new Map();

export async function loadPack(base = '/farm-pack/') {
  try {
    const res = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    if (!res.ok) return 0;
    const m = await res.json();
    const img = new Image();
    img.src = base + m.atlas + '?v=' + encodeURIComponent(m.v || '');
    await img.decode();
    for (const [name, s] of Object.entries(m.sprites || {})) {
      const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
      c.getContext('2d').drawImage(img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
      c.hd = s.hd || m.hd || 2; c.oy = s.oy || 0; c.ox = s.ox || 0;
      sprites.set(name, c);
    }
  } catch { /* 沒有圖包、或圖包壞了：全部用程式畫的圖 */ }
  return sprites.size;
}

// 有圖就回傳畫布，沒有回傳 null。season 有給的話先找「名字@季節」（例如 tree@autumn），再找不分季節的
export function packSprite(name, flip = false, season = '') {
  if (!sprites.size) return null;
  const c = (season && sprites.get(name + '@' + season)) || sprites.get(name);
  if (!c) return null;
  if (!flip) return c;
  let f = flips.get(c);
  if (!f) {
    f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
    const g = f.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
    f.hd = c.hd; f.oy = c.oy; f.ox = c.ox; flips.set(c, f);
  }
  return f;
}
export const packSize = () => sprites.size;
