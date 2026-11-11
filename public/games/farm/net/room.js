// 跟 FarmRoom 的連線：連上就收到完整快照；斷線自動重連（重連後重新拿快照）。協定見 docs/farm-game/協定.md
const token = () => localStorage.getItem('cim_token') || localStorage.getItem('chat_token') || '';

export function createRoom(convId) {
  const handlers = {}; let ws = null, retry = 1000, closed = false, nextId = 1, pingTimer = 0;
  const pending = new Map(); // 送出去還沒回覆的動作：id → { resolve }
  const emit = (name, arg) => (handlers[name] || []).forEach((f) => f(arg));
  function connect() {
    if (closed) return;
    emit('status', 'connecting');
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/farm/ws?conv=${convId}`, ['farm.v1', 'token.' + token()]);
    ws.onopen = () => { retry = 1000; emit('status', 'online'); clearInterval(pingTimer); pingTimer = setInterval(() => { if (ws && ws.readyState === 1) ws.send('ping'); }, 25000); };
    ws.onmessage = (e) => {
      if (e.data === 'pong') return;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'replaced') { closed = true; emit('status', 'replaced'); try { ws.close(); } catch {} return; } // 同一個帳號在別的分頁打開了：這邊不再重連
      if (m.t === 'ok' || m.t === 'no') { const p = pending.get(m.id); if (p) { pending.delete(m.id); p(m); } }
      emit(m.t, m);
    };
    ws.onclose = (e) => {
      clearInterval(pingTimer); ws = null;
      for (const p of pending.values()) p({ t: 'no', reason: 'offline' }); pending.clear();
      if (closed) return;
      if (e.code === 4001) { closed = true; emit('status', 'replaced'); return; } // 在別的分頁打開了
      emit('status', 'offline');
      setTimeout(connect, retry); retry = Math.min(retry * 2, 15000);
    };
  }
  window.addEventListener('online', () => { if (!ws && !closed) { retry = 1000; connect(); } });
  return {
    on(name, fn) { (handlers[name] ||= []).push(fn); },
    connect,
    get online() { return !!ws && ws.readyState === 1; },
    send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); },
    // 請求：送出去，等伺服器說可以（ok）或不行（no）。動作、買東西、出貨都走這裡
    req(msg) {
      return new Promise((resolve) => {
        if (!ws || ws.readyState !== 1) return resolve({ t: 'no', reason: 'offline' });
        const id = nextId++; pending.set(id, resolve); ws.send(JSON.stringify({ ...msg, id }));
        setTimeout(() => { if (pending.delete(id)) resolve({ t: 'no', reason: 'timeout' }); }, 6000);
      });
    },
    close() { closed = true; clearInterval(pingTimer); if (ws) ws.close(); },
    // 測試用：模擬斷線（伺服器那邊會當成一般的斷線，這邊照正常流程自動重連）
    drop() { if (ws) ws.close(); },
  };
}
