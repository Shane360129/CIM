// 個人設定：存在這台裝置上（localStorage），不會影響對方。兩個人共用的設定（一天的長度）存在伺服器，不在這裡
const KEY = 'farm-settings';
export const DEFAULTS = { sfx: 70, music: 50, low: false, font: 'm', hand: 'right', stick: 'auto', romance: true, tutorial: true };
export function createSettings() {
  const v = { ...DEFAULTS }, subs = [];
  try { const saved = JSON.parse(localStorage.getItem(KEY) || '{}'); for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === typeof DEFAULTS[k]) v[k] = saved[k]; } catch { /* 讀不到就用預設值 */ }
  return {
    get: (k) => v[k],
    set(k, val) { if (!(k in DEFAULTS) || v[k] === val) return; v[k] = val; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 存不了：這次有效，下次回到預設 */ } subs.forEach((f) => f(k, val)); },
    on(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; },
  };
}
