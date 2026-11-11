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
  // ---- 階段 2：時鐘、聊天泡泡、表情、卡片 ----
  const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const clock = mk('div', 'clock hidden'), clockMain = mk('span'), clockSub = mk('small'), clockNet = mk('small', 'net hidden');
  clock.append(clockMain, clockSub, clockNet); ui.append(clock);
  const side = mk('div', 'side hidden'), btnSay = mk('button', '', '💬'), btnEmote = mk('button', '', '😊');
  btnSay.type = btnEmote.type = 'button'; btnSay.title = '說一句話（T）'; btnEmote.title = '表情';
  side.append(btnSay, btnEmote); ui.append(side);
  const emotes = mk('div', 'emotes hidden'); ui.append(emotes);
  const say = mk('form', 'say hidden'), sayInput = mk('input'), sayBtn = mk('button', '', '送出');
  sayInput.type = 'text'; sayInput.placeholder = '說一句話…'; sayInput.autocomplete = 'off'; say.append(sayInput, sayBtn); ui.append(say);
  let card = null, panel = null, panelClose = null, onSay = null, onEmote = null;
  const chips = mk('div', 'chips hidden'), chipMoney = mk('span', 'chip'), chipEnergy = mk('span', 'chip energy'), efill = mk('i'), btnBag = mk('button', 'chip', '🎒');
  const ebar = mk('span', 'ebar'); ebar.append(efill); chipEnergy.append('⚡', ebar); btnBag.type = 'button'; btnBag.title = '背包（E）'; chips.append(chipMoney, chipEnergy, btnBag); ui.append(chips);
  const closeSay = () => { say.classList.add('hidden'); sayInput.blur(); };
  say.addEventListener('submit', (e) => { e.preventDefault(); const t = sayInput.value.trim(); sayInput.value = ''; closeSay(); if (t && onSay) onSay(t); });
  sayInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSay(); e.stopPropagation(); } });
  btnSay.addEventListener('click', () => hud.openSay());
  btnEmote.addEventListener('click', () => emotes.classList.toggle('hidden'));
  // 用 defineProperties 而不是 Object.assign：後者會把 get typing 這種「每次問才算」的屬性當場算一次、變成固定的值
  Object.defineProperties(hud, Object.getOwnPropertyDescriptors({
    showPlay(on) { for (const n of [clock, side, chips]) n.classList.toggle('hidden', !on); if (!on) { emotes.classList.add('hidden'); closeSay(); hud.closeCard(); hud.closePanel(); } },
    onBag(fn) { btnBag.onclick = fn; },
    setStatus(money, energy, max) { const m = `💰 ${money}`; if (chipMoney.textContent !== m) chipMoney.textContent = m; efill.style.width = Math.round(100 * energy / max) + '%'; chipEnergy.classList.toggle('low', energy < max * 0.2); chipEnergy.title = `體力 ${energy}/${max}`; },
    // 快捷列：背包的前 10 格。make(i) 回傳那一格要放的圖示（沒有東西回傳 null）
    setHotbar(inv, make) { cells.forEach((c, i) => { c.textContent = ''; const s = inv[i]; if (s) { c.append(make(s)); if (s.n > 1) { const n = mk('span', 'count', String(s.n)); c.append(n); } } else c.append(mk('span', 'num', String((i + 1) % 10))); }); },
    openPanel(node, onClose) { hud.closePanel(); panel = node; panelClose = onClose; ui.append(node); },
    closePanel() { if (panel) { panel.remove(); panel = null; if (panelClose) panelClose(); panelClose = null; } },
    get hasPanel() { return !!panel; },
    setClock(main, sub) { if (clockMain.textContent !== main) clockMain.textContent = main; if (clockSub.textContent !== sub) clockSub.textContent = sub; },
    setNet(text) { clockNet.textContent = text || ''; clockNet.classList.toggle('hidden', !text); },
    setChat({ maxChars, emoteList, say: s, emote: e }) {
      sayInput.maxLength = maxChars; onSay = s; onEmote = e; emotes.textContent = '';
      for (const em of emoteList) { const b = mk('button', '', em); b.type = 'button'; b.addEventListener('click', () => { emotes.classList.add('hidden'); if (onEmote) onEmote(em); }); emotes.append(b); }
    },
    openSay() { emotes.classList.add('hidden'); say.classList.remove('hidden'); sayInput.focus(); },
    get typing() { return !say.classList.contains('hidden'); },
    // 一張卡片：標題、幾行字、幾個按鈕。回傳按了哪一個（Promise）
    card(title, lines, buttons = [{ label: '好', value: true }]) {
      hud.closeCard();
      return new Promise((resolve) => {
        card = mk('div', 'card'); card.append(mk('h2', '', title)); for (const l of lines) card.append(mk('p', '', l));
        const row = mk('div', 'row');
        for (const b of buttons) { const n = mk('button', b.ghost ? 'ghost' : '', b.label); n.type = 'button'; n.addEventListener('click', () => { card.resolve = () => {}; hud.closeCard(); resolve(b.value); }); row.append(n); } // 按按鈕時先把「被關掉」的回覆拿掉，不然會搶在按鈕的答案前面
        card.append(row); card.resolve = resolve; ui.append(card);
      });
    },
    closeCard() { if (card) { card.remove(); const r = card.resolve; card = null; r(null); } },
    get hasCard() { return !!card || !!panel; },
  }));
  hud.select(0);
  return hud;
}
