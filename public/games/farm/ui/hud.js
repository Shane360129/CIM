// 畫面上的介面（用一般的網頁元素疊在畫布上）：快捷列、提示訊息
export function createHud(ui, slots) {
  const bar = document.createElement('div'); bar.className = 'hotbar hidden';
  const cells = [];
  let selected = 0, onSelect = null;
  for (let i = 0; i < slots; i++) {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'slot'; c.textContent = String((i + 1) % 10);
    c.addEventListener('click', () => { hud.select(i); });
    bar.append(c); cells.push(c);
  }
  ui.append(bar);
  let toastEl = null, toastTimer = 0;
  const hud = {
    show(on) { bar.classList.toggle('hidden', !on); },
    get selected() { return selected; },
    onSelect(fn) { onSelect = fn; },
    select(i) {
      selected = Math.max(0, Math.min(slots - 1, i));
      cells.forEach((c, k) => c.classList.toggle('on', k === selected));
      cells[selected].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (onSelect) onSelect(selected);
    },
    toast(text, ms = 1600) {
      if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; ui.append(toastEl); }
      toastEl.textContent = text; toastEl.classList.remove('hidden');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.add('hidden'), ms);
    },
  };
  hud.select(0);
  return hud;
}
