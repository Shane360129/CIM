// 外觀資料的轉換：伺服器和畫面共用。
// 美術從手繪紙娃娃換成 LPC 之後，零件名稱和顏色都換了：舊角色、舊資料裡的舊名稱用 parts.legacy 對到新的零件，
// 對不到的用同性別的預設造型；顏色不在清單裡的換成清單裡最接近的顏色。
const IDS = ['eyes', 'brows', 'mouths', 'hair', 'top', 'bottom', 'shoes', 'hat', 'acc'];
const COLORS = [['skin', 'skin'], ['hairColor', 'hair'], ['topColor', 'cloth'], ['bottomColor', 'cloth'], ['shoesColor', 'cloth'], ['hatColor', 'cloth']];
const rgb = (h) => (/^#[0-9a-f]{6}$/i.test(h || '') ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : null);
function nearest(hex, list) {
  const c = rgb(hex); if (!c) return null;
  let best = null, bd = Infinity;
  for (const x of list) { const v = rgb(x), d = (v[0] - c[0]) ** 2 + (v[1] - c[1]) ** 2 + (v[2] - c[2]) ** 2; if (d < bd) { bd = d; best = x; } }
  return best;
}
export function upgradeLook(look, parts) {
  if (!look || typeof look !== 'object') return look;
  const gender = parts.presets[look.gender] ? look.gender : 'boy', base = parts.presets[gender], out = { ...look, gender };
  for (const k of IDS) {
    const has = (id) => parts[k].some((v) => v.id === id);
    if (!has(out[k])) out[k] = (parts.legacy[k] && parts.legacy[k][out[k]]) || base[k];
    if (!has(out[k])) out[k] = base[k];
  }
  for (const [k, list] of COLORS) if (!parts.colors[list].includes(out[k])) out[k] = nearest(out[k], parts.colors[list]) || base[k];
  // 體型、臉型可以不選（照男生／女生）；選了但清單上沒有的拿掉
  if (out.body != null && !(parts.bodies || []).some((v) => v.id === out.body)) delete out.body;
  if (out.head != null && !(parts.heads || []).some((v) => v.id === out.head)) delete out.head;
  return out;
}
