// 設定面板。上半是這台裝置自己的設定（音量、畫質、字體、操作），下半是兩個人共用的（一天的長度，改了對方也會變）
const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export function openSettings(ctx) {
  const { hud, settings, world: W } = ctx, bal = ctx.data.balance, root = mk('div', 'panel settings');
  const row = (label, control, hint) => { const r = mk('div', 'setrow'); const l = mk('span', 'setlabel', label); if (hint) l.append(mk('small', '', hint)); r.append(l, control); return r; };
  const slider = (key) => { const i = mk('input'); i.type = 'range'; i.min = '0'; i.max = '100'; i.step = '10'; i.value = String(settings.get(key)); i.dataset.set = key; i.addEventListener('change', () => settings.set(key, Number(i.value))); return i; };
  const choice = (key, opts, get = () => settings.get(key), set = (v) => settings.set(key, v)) => {
    const box = mk('div', 'seg'); box.dataset.set = key;
    for (const [value, label] of opts) { const b = mk('button', get() === value ? 'on' : '', label); b.type = 'button'; b.dataset.value = String(value); b.addEventListener('click', async () => { await set(value); draw(); }); box.append(b); }
    return box;
  };
  function draw() {
    root.textContent = '';
    const head = mk('div', 'phead'); head.append(mk('h2', '', '設定')); const x = mk('button', 'pbtn', '關閉'); x.type = 'button'; x.addEventListener('click', () => hud.closePanel()); head.append(x); root.append(head);
    root.append(mk('h3', '', '這台裝置'));
    root.append(row('音效音量', slider('sfx')), row('音樂音量', slider('music')),
      row('畫質', choice('low', [[false, '一般'], [true, '省電']]), '省電：畫面比較不細、少一些效果，舊手機比較順'),
      row('字體大小', choice('font', [['s', '小'], ['m', '中'], ['l', '大']])),
      row('觸控搖桿', choice('stick', [['auto', '碰螢幕才出現'], ['always', '一直顯示']])),
      row('搖桿位置', choice('hand', [['right', '左邊搖桿'], ['left', '右邊搖桿']]), '慣用左手可以換邊'),
      row('戀愛內容', choice('romance', [[true, '開'], [false, '關']]), '關掉後不會出現交往相關的劇情'),
      row('新手教學', choice('tutorial', [[true, '顯示'], [false, '不顯示']])));
    root.append(mk('h3', '', '兩個人共用'));
    const cur = (W.farm.opts || {}).dayLen || bal.dayMinutesReal;
    root.append(row('一天的長度', choice('dayLen', bal.dayLenOptions.map((m) => [m, `${m} 分鐘`]), () => cur, async (v) => { const r = await W.room.req({ t: 'set', key: 'dayLen', value: v }); if (r.t !== 'ok') hud.toast('改不了，等一下再試', 1300); }), '現實的幾分鐘是遊戲的一天。改了對方那邊也會一起變'));
    root.append(mk('p', 'hint', '鍵盤：WASD／方向鍵走路、空白鍵動作、E 背包、T 說話、1～0 切換快捷列、Esc 關閉。'));
    // 素材來源：LPC 的圖用 CC-BY-SA 等授權，規定要在遊戲裡看得到作者
    const cr = ctx.data.creditsLpc;
    if (cr) { root.append(mk('h3', '', '素材來源')); const p = mk('p', 'hint credits', `角色圖：Liberated Pixel Cup（LPC）的素材（${cr.licenses.join('、')}）。作者：${cr.authors.join('、')}。`); const a = mk('a', '', '完整名單（每張圖的作者、授權、出處）'); a.href = 'assets/lpc/CREDITS.csv'; a.target = '_blank'; a.rel = 'noopener'; root.append(p, a); }
  }
  draw();
  const off = W.on('farm', (m) => { if (m && m.t === 'opts') draw(); });
  hud.openPanel(root, off);
}
