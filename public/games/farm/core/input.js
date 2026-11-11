// 輸入：鍵盤（WASD／方向鍵走路、空白或 Enter 動作、E 背包、數字鍵快捷列、Esc）、滑鼠點畫面、觸控（左下搖桿、右下動作鈕）
// 遊戲只問兩件事：現在往哪個方向走（axis），以及發生了什麼事（on）
export function createInput(canvas, ui) {
  const keys = new Set(), handlers = {};
  const emit = (name, arg) => (handlers[name] || []).forEach((f) => f(arg));
  const stick = { x: 0, y: 0, id: null };
  const KEY_DIR = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return; // 正在打字（聊天泡泡）：按鍵不算遊戲操作
    if (KEY_DIR[e.code]) { keys.add(e.code); e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'Enter') { emit('action'); e.preventDefault(); }
    else if (e.code === 'KeyE') emit('bag');
    else if (e.code === 'KeyT') { emit('say'); e.preventDefault(); }
    else if (e.code === 'Escape') emit('esc');
    else if (/^Digit[0-9]$/.test(e.code)) emit('slot', (Number(e.code.slice(5)) + 9) % 10); // 1～9 是第 1～9 格，0 是第 10 格
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); stick.x = stick.y = 0; });

  // 點畫面：滑鼠和手指都算（搖桿和按鈕是另外的元素，不會走到這裡）
  canvas.addEventListener('pointerdown', (e) => { emit('tap', { x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' }); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // 觸控：第一次碰到螢幕才把搖桿和動作鈕放出來，用滑鼠的電腦不會看到
  let touchUi = null;
  function showTouchUi() {
    if (touchUi) return;
    const base = document.createElement('div'); base.className = 'stick';
    const knob = document.createElement('div'); knob.className = 'stick-knob'; base.append(knob);
    const act = document.createElement('button'); act.className = 'act-btn'; act.type = 'button'; act.textContent = '動作';
    ui.append(base, act); touchUi = { base, knob, act };
    const R = 46; // 搖桿頭最多離中心幾個像素
    const move = (e) => {
      const r = base.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const dead = 0.18; // 中間一小圈不算，手指抖一下不會亂走
      stick.x = Math.abs(dx / R) < dead ? 0 : dx / R; stick.y = Math.abs(dy / R) < dead ? 0 : dy / R;
    };
    const end = (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
    base.addEventListener('pointerdown', (e) => { stick.id = e.pointerId; base.setPointerCapture(e.pointerId); move(e); e.preventDefault(); });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) move(e); });
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
    act.addEventListener('pointerdown', (e) => { act.classList.add('down'); emit('action'); e.preventDefault(); });
    const up = () => act.classList.remove('down');
    act.addEventListener('pointerup', up); act.addEventListener('pointercancel', up); act.addEventListener('pointerleave', up);
  }
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') showTouchUi(); }, true);
  if (matchMedia('(pointer: coarse)').matches) showTouchUi();

  return {
    showTouch: showTouchUi, // 設定裡選「一直顯示搖桿」
    on(name, fn) { (handlers[name] ||= []).push(fn); return () => { handlers[name] = handlers[name].filter((f) => f !== fn); }; },
    clear() { for (const k of Object.keys(handlers)) delete handlers[k]; },
    // 往哪走：長度最多 1（斜著走不會比較快）
    axis() {
      let x = stick.x, y = stick.y;
      for (const code of keys) { x += KEY_DIR[code][0]; y += KEY_DIR[code][1]; }
      const d = Math.hypot(x, y);
      return d > 1 ? { x: x / d, y: y / d } : { x, y };
    },
  };
}
