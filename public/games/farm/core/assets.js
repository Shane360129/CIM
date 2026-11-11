// 資源載入：JSON 和圖片。圖還沒畫好的東西 image() 回傳 null，畫面會用暫代圖（色塊＋名字）
const json = new Map(), images = new Map();
const base = new URL('../', import.meta.url);

export async function loadJSON(path) {
  if (json.has(path)) return json.get(path);
  const res = await fetch(new URL(path, base), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`讀不到 ${path}（${res.status}）`);
  const data = await res.json();
  json.set(path, data);
  return data;
}
export async function loadImage(path) {
  if (images.has(path)) return images.get(path);
  const img = new Image();
  img.src = new URL(path, base).href;
  try { await img.decode(); images.set(path, img); } catch { images.set(path, null); }
  return images.get(path);
}
export const image = (path) => images.get(path) || null;
// 一次載入很多個，回報進度（0～1）
export async function loadAll(list, onProgress) {
  let done = 0; const out = {};
  await Promise.all(list.map(async ([key, path]) => {
    out[key] = path.endsWith('.json') ? await loadJSON(path) : await loadImage(path);
    if (onProgress) onProgress(++done / list.length);
  }));
  return out;
}
