// 登入身分：遊戲和聊天室是同一個網域，直接讀聊天室存在 localStorage 的登入 token（不用父頁 postMessage 傳，
// 這樣遊戲頁自己重新整理也還是登入的，也不必處理「父頁還沒準備好」的時間差）。
// 進遊戲前向伺服器確認：token 有效、這個對話是一對一、自己是成員。真正的把關在伺服器（階段 2 的 FarmRoom 會再驗一次）。
const token = () => localStorage.getItem('cim_token') || localStorage.getItem('chat_token');

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (token() || '') },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `連線失敗（${res.status}）`);
  return data;
}

export async function signIn(convId) {
  if (!token()) throw new Error('請先在聊天室登入');
  if (!convId) throw new Error('請從好友聊天右上角的選單打開農場');
  const [me, convs] = await Promise.all([api('/api/me'), api('/api/conversations')]);
  const conv = (convs.conversations || []).find((c) => c.id === convId);
  if (!conv) throw new Error('你不是這個聊天的成員');
  if (conv.type !== 'dm' || conv.members.length !== 2) throw new Error('農場只開在一對一的好友聊天裡');
  const partnerId = conv.members.map((m) => m.userId).find((id) => id !== me.user.id);
  let partnerName = '';
  try { partnerName = ((await api('/api/users')).users || []).find((u) => u.id === partnerId)?.displayName || ''; } catch { /* 拿不到名字不影響遊戲 */ }
  return { me: me.user, convId, partnerId, partnerName };
}
