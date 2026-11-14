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
  const btnPhoto = mk('button', '', '📷'); btnPhoto.type = 'button'; btnPhoto.title = '拍一張照片傳到聊天室';
  const btnSet = mk('button', '', '⚙️'); btnSet.type = 'button'; btnSet.title = '設定'; btnSet.dataset.act = 'settings';
  side.append(btnSay, btnEmote, btnPhoto, btnSet); ui.append(side);
  const guide = mk('button', 'guide hidden'); guide.type = 'button'; ui.append(guide); // 新手教學：時鐘下面一行小字，不擋畫面，點了才展開
  const emotes = mk('div', 'emotes hidden'); ui.append(emotes);
  const say = mk('form', 'say hidden'), sayInput = mk('input'), sayBtn = mk('button', '', '送出');
  sayInput.type = 'text'; sayInput.placeholder = '說一句話…'; sayInput.autocomplete = 'off'; say.append(sayInput, sayBtn); ui.append(say);
  let card = null, panel = null, panelClose = null, onSay = null, onEmote = null;
  const chips = mk('div', 'chips hidden'), chipMoney = mk('span', 'chip'), chipEnergy = mk('span', 'chip energy'), efill = mk('i'), btnBag = mk('button', 'chip', '🎒');
  const ebar = mk('span', 'ebar'); ebar.append(efill); chipEnergy.append('⚡', ebar); btnBag.type = 'button'; btnBag.title = '背包（E）'; const chipHp = mk('span', 'chip hp hidden'), hfill = mk('i'), hbar = mk('span', 'ebar'); hbar.append(hfill); chipHp.append('❤', hbar); chipHp.title = '血量（只有在礦坑裡會用到）';
  chips.append(chipMoney, chipEnergy, chipHp, btnBag); ui.append(chips);
  const closeSay = () => { say.classList.add('hidden'); sayInput.blur(); };
  say.addEventListener('submit', (e) => { e.preventDefault(); const t = sayInput.value.trim(); sayInput.value = ''; closeSay(); if (t && onSay) onSay(t); });
  sayInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSay(); e.stopPropagation(); } });
  btnSay.addEventListener('click', () => hud.openSay());
  btnEmote.addEventListener('click', () => emotes.classList.toggle('hidden'));
  // 用 defineProperties 而不是 Object.assign：後者會把 get typing 這種「每次問才算」的屬性當場算一次、變成固定的值
  Object.defineProperties(hud, Object.getOwnPropertyDescriptors({
    showPlay(on) { for (const n of [clock, side, chips]) n.classList.toggle('hidden', !on); if (!on) { guide.classList.add('hidden'); emotes.classList.add('hidden'); closeSay(); hud.closeCard(); hud.closePanel(); } },
    onBag(fn) { btnBag.onclick = fn; },
    setStatus(money, energy, max, hp = null, hpMax = 100) { chipHp.classList.toggle('hidden', hp == null); if (hp != null) hfill.style.width = Math.round(100 * hp / hpMax) + '%'; const m = `💰 ${money}`; if (chipMoney.textContent !== m) chipMoney.textContent = m; efill.style.width = Math.round(100 * energy / max) + '%'; chipEnergy.classList.toggle('low', energy < max * 0.2); chipEnergy.title = `體力 ${energy}/${max}`; },
    // 快捷列：背包的前 10 格。make(i) 回傳那一格要放的圖示（沒有東西回傳 null）
    setHotbar(inv, make) { cells.forEach((c, i) => { c.textContent = ''; const s = inv[i]; if (s) { c.append(make(s)); if (s.n > 1) { const n = mk('span', 'count', String(s.n)); c.append(n); } } else c.append(mk('span', 'num', String((i + 1) % 10))); }); },
    openPanel(node, onClose) { hud.closePanel(); panel = node; panelClose = onClose; ui.append(node); },
    closePanel() { if (panel) { panel.remove(); panel = null; if (panelClose) panelClose(); panelClose = null; } },
    get hasPanel() { return !!panel; },
    // 問一句話（寫便條用）：回傳打的字，取消回傳 null
    ask(title, lines, placeholder, max) {
      hud.closeCard();
      return new Promise((resolve) => {
        card = mk('div', 'card'); card.append(mk('h2', '', title)); for (const l of lines) card.append(mk('p', '', l));
        const input = mk('input', 'minput'); input.type = 'text'; input.maxLength = max; input.placeholder = placeholder; card.append(input);
        const row = mk('div', 'row'), fin = (v) => { card.resolve = () => {}; hud.closeCard(); resolve(v); };
        const no = mk('button', 'ghost', '關閉'), yes = mk('button', '', '貼上去'); no.type = yes.type = 'button'; no.addEventListener('click', () => fin(null)); yes.addEventListener('click', () => fin(input.value.trim() || null));
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') fin(input.value.trim() || null); e.stopPropagation(); });
        row.append(no, yes); card.append(row); card.resolve = resolve; ui.append(card); setTimeout(() => input.focus(), 50);
      });
    },
    onPhoto(fn) { btnPhoto.onclick = fn; },
    onSettings(fn) { btnSet.onclick = fn; },
    onGuide(fn) { guide.onclick = fn; },
    setGuide(text) { guide.classList.toggle('hidden', !text || clock.classList.contains('hidden')); if (text && guide.textContent !== text) guide.textContent = text; },
    hideAll(on) { ui.classList.toggle('hidden', on); },
    // 對話框：左邊大頭像、名字、一個字一個字跑出來的話（點一下或按動作鍵就全部顯示）、下面幾個按鈕。回傳按了哪一個
    dialog({ portrait, name, sub, text, buttons = [{ label: '好', value: true }] }) {
      hud.closeCard();
      return new Promise((resolve) => {
        card = mk('div', 'dialog'); const face = mk('div', 'dface'), body = mk('div', 'dbody'), txt = mk('p', 'dtext'), row = mk('div', 'row');
        if (portrait) face.append(portrait); else card.classList.add('noface'); // 沒有頭像（旁白）：字放滿整個框
        body.append(name ? mk('h2', '', name) : '', sub ? mk('small', 'dsub', sub) : '', txt, row); card.append(face, body);
        let i = 0; const full = () => { i = text.length; txt.textContent = text; clearInterval(timer); row.classList.remove('hidden'); };
        const timer = setInterval(() => { i += 1; txt.textContent = text.slice(0, i); if (i >= text.length) full(); }, 28);
        row.classList.add('hidden'); card.typing = () => i < text.length; card.skip = full;
        card.addEventListener('click', (e) => { if (i < text.length && e.target.tagName !== 'BUTTON') full(); });
        for (const b of buttons) { const n = mk('button', b.ghost ? 'ghost' : '', b.label); n.type = 'button'; n.addEventListener('click', () => { clearInterval(timer); card.resolve = () => {}; hud.closeCard(); resolve(b.value); }); row.append(n); }
        card.resolve = (v) => { clearInterval(timer); resolve(v); }; ui.append(card);
      });
    },
    // 對話還在跑字的時候按動作鍵：先把整句顯示出來
    skipDialog() { if (card && card.typing && card.typing()) { card.skip(); return true; } return false; },
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
