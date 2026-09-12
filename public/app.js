/* CIM — LINE 風格網頁聊天室（前端） */
'use strict';

/* ---------- 小工具 ---------- */

const $ = (id) => document.getElementById(id);

function el(tag, attrs, ...children) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v; // 只用於內建 SVG 圖示
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, ''); // disabled、hidden 這類布林屬性
      else if (v === false) continue;             // false 代表不要這個屬性
      else n.setAttribute(k, v);
    }
  }
  for (const c of children.flat(9)) {
    if (c === null || c === undefined || c === false) continue;
    n.append(c.nodeType ? c : String(c));
  }
  return n;
}

const ICONS = {
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  back: '<polyline points="15 18 9 12 15 6"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  tools: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  pin: '<path d="M3 10v4h3l6 4V6l-6 4H3z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  reply: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
};

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

function icon(name, size) {
  const s = el('span', { class: 'ic', html: iconSvg(name) });
  if (size) { s.style.width = s.style.height = size + 'px'; }
  return s;
}

function injectIcons() {
  document.querySelectorAll('[data-icon]').forEach((node) => {
    node.innerHTML = node.classList.contains('ic')
      ? iconSvg(node.dataset.icon)
      : '';
    if (!node.classList.contains('ic')) node.append(icon(node.dataset.icon));
  });
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const timeFmt = new Intl.DateTimeFormat('zh-TW', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtTime = (ts) => timeFmt.format(ts);
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function fmtListTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (sameDay(ts, now)) return fmtTime(ts);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (sameDay(ts, yesterday)) return '昨天';
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtDateSep(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (sameDay(ts, now)) return '今天';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (sameDay(ts, yesterday)) return '昨天';
  const base = `${d.getMonth() + 1}月${d.getDate()}日（週${WEEKDAYS[d.getDay()]}）`;
  return d.getFullYear() === now.getFullYear() ? base : `${d.getFullYear()}年${base}`;
}

function toast(msg) {
  const t = el('div', { class: 'toast', text: msg });
  $('toast-root').append(t);
  setTimeout(() => t.remove(), 2600);
}

// 訊息中的網址：http(s):// 或 www. 開頭，遇到空白、引號或中文標點即結束
// （與伺服器 src/chatserver.js 的 URL_RE / trimUrlTail 保持一致）
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'`\u3000、，。！？：；（）「」『』【】《》〈〉…]+/gi;

// 去掉黏在網址尾端的英文標點（句號、逗號、右括號…）；
// 成對括號內的右括號保留，例如維基百科的 /wiki/Foo_(bar)
function trimUrlTail(u) {
  for (;;) {
    const last = u[u.length - 1];
    if (!last) return u;
    if ('.,;:!?\'"'.includes(last)) { u = u.slice(0, -1); continue; }
    const open = { ')': '(', ']': '[', '}': '{' }[last];
    if (open && u.split(open).length < u.split(last).length) { u = u.slice(0, -1); continue; }
    return u;
  }
}

// 只允許 http/https 連結；擋掉 javascript:/data: 等偽裝網址（避免點擊執行程式碼）。
// 協定驗證通過就回傳原字串，保留使用者看到的網址原樣（不做正規化）
function safeHttpUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? u : null;
  } catch { return null; }
}

// 把文字中的網址轉成可點的超連結（新分頁開啟），其餘維持純文字
function renderText(text) {
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const raw = trimUrlTail(m[0]);
    if (!raw) continue;
    const href = safeHttpUrl(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    if (!href) continue;
    if (m.index > last) frag.append(text.slice(last, m.index));
    frag.append(el('a', {
      class: 'msg-link', href, target: '_blank', rel: 'noopener noreferrer nofollow', text: raw,
    }));
    last = m.index + raw.length;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}

/* ---------- 狀態 ---------- */

const state = {
  token: localStorage.getItem('cim_token') || null,
  me: null,
  users: new Map(),          // userId -> user
  convs: [],                 // 聊天室清單（伺服器格式）
  currentConv: null,         // 目前開啟的聊天室 id
  msgCache: new Map(),       // convId -> { messages, members, hasMore }
  ws: null,
  wsRetry: 0,
  wsAlive: false,
  heartbeat: null,
  lastReadSent: new Map(),   // convId -> 已回報的已讀訊息 id
  typingTimer: null,
  lastTypingSent: 0,
  tab: 'chats',
  authMode: 'login',
  appInfo: null,
  sound: localStorage.getItem('cim_sound') !== '0',
  notify: localStorage.getItem('cim_notify') !== '0',
  notifDismissed: localStorage.getItem('cim_notif_dismissed') === '1',
  theme: localStorage.getItem('cim_theme') || 'auto',
  skin: localStorage.getItem('cim_skin') || 'techo',
  fontSize: localStorage.getItem('cim_font') || 'md',
  typeface: localStorage.getItem('cim_typeface') || 'default',
  stealth: localStorage.getItem('cim_stealth') === '1',
  pushOn: localStorage.getItem('cim_push') === '1',
  installPrompt: null,        // beforeinstallprompt 事件（Android／桌面 Chrome 可一鍵安裝）
  installDismissed: localStorage.getItem('cim_install_dismissed') === '1',
  replyTarget: null,          // { id, convId, name, preview }
  unreadMarker: null,         // { convId, afterId }：本次打開聊天室的未讀分隔線位置
  customStickers: null,       // 自訂貼圖清單（懶載入）
  stickerMap: new Map(),      // sticker id -> data URL
  toolTab: 'shopping',
  toolsOpen: false,          // 聊天室小工具彈窗是否開著（決定要不要即時重畫）
  openGame: null,            // 放大遊玩中的小遊戲：{ id, convId, render }
  foodGroups: null,          // 「今天吃什麼」勾選的類別（懶載入自 localStorage）
  rec: null,                  // 錄音中：{ recorder, chunks, timer, seconds, stream }
  audio: null,                // 播放中：{ el, mid, posEl, btnEl }
};

const userOf = (id) => state.users.get(id) || null;
const nameOf = (id, fallback) => { const u = userOf(id); return u ? u.displayName : (fallback || '未知'); };
const convById = (id) => state.convs.find((c) => c.id === id) || null;
const isMemo = (conv) => conv.type === 'dm' && conv.members.length === 1;

function dmPartner(conv) {
  if (conv.type !== 'dm') return null;
  const other = conv.members.find((m) => m.userId !== state.me.id);
  return other ? userOf(other.userId) : state.me;
}

function convTitle(conv) {
  if (conv.type === 'group') return conv.name || '群組';
  if (isMemo(conv)) return '我的記事本';
  const partner = dmPartner(conv);
  return partner ? partner.displayName : '對話';
}

function msgPreview(m) {
  if (!m) return '尚無訊息';
  if (m.deleted) return '已收回訊息';
  if (m.type === 'system') return m.content;
  if (m.type === 'image') return '[圖片]';
  if (m.type === 'sticker') return m.content.startsWith('sid:') ? '[貼圖]' : '[貼圖] ' + m.content;
  if (m.type === 'audio') return '[語音訊息]';
  if (m.type === 'poll') {
    try { return '[投票] ' + JSON.parse(m.content).q; } catch { return '[投票]'; }
  }
  if (m.type === 'game') return '[小遊戲] ' + gameTitle(m);
  return m.content.replace(/\n/g, ' ');
}

/* ---------- API ---------- */

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options = { ...options, body: JSON.stringify(options.body) };
  }
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new Error('無法連線到伺服器，請檢查網路');
  }
  let data = null;
  try { data = await res.json(); } catch { /* 非 JSON */ }
  if (res.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/register')) {
    sessionExpired();
    throw new Error((data && data.error) || '請重新登入');
  }
  if (!res.ok) throw new Error((data && data.error) || `發生錯誤（${res.status}）`);
  return data;
}

function sessionExpired() {
  if (!state.token) return;
  state.token = null;
  localStorage.removeItem('cim_token');
  stopWs();
  showAuth();
  toast('登入已過期，請重新登入');
}

/* ---------- 頭像 ---------- */

function avatarEl(user, size, extraClass) {
  const d = el('div', { class: 'avatar' + (extraClass ? ' ' + extraClass : '') });
  d.style.width = d.style.height = size + 'px';
  if (user && user.avatar) {
    d.append(el('img', { src: user.avatar, alt: '' }));
  } else {
    d.style.background = (user && user.avatarColor) || '#98A2B3';
    d.style.fontSize = Math.round(size * 0.42) + 'px';
    d.textContent = user ? [...user.displayName][0] : '?';
  }
  return d;
}

function groupAvatarEl(size) {
  const d = el('div', { class: 'avatar group-avatar' });
  d.style.width = d.style.height = size + 'px';
  d.append(icon('users', Math.round(size * 0.55)));
  return d;
}

function convAvatarEl(conv, size) {
  if (conv.type === 'group') {
    if (conv.avatar) {
      const d = el('div', { class: 'avatar' });
      d.style.width = d.style.height = size + 'px';
      d.append(el('img', { src: conv.avatar, alt: '' }));
      return d;
    }
    return groupAvatarEl(size);
  }
  return avatarEl(dmPartner(conv), size);
}

/* ---------- 登入／註冊 ---------- */

function showAuth() {
  state.authMode = 'login';
  $('app').classList.add('hidden');
  $('auth').classList.remove('hidden');
  document.body.classList.remove('chat-open');
  refreshAppInfo();
}

async function refreshAppInfo() {
  try {
    state.appInfo = await api('/api/app-info');
  } catch {
    state.appInfo = { firstRun: false, registrationOpen: true };
  }
  if (state.appInfo.firstRun) setAuthMode('register');
  else renderAuthMode();
}

function setAuthMode(mode) {
  state.authMode = mode;
  renderAuthMode();
}

function renderAuthMode() {
  const reg = state.authMode === 'register';
  const info = state.appInfo || {};
  $('auth-tab-login').classList.toggle('active', !reg);
  $('auth-tab-register').classList.toggle('active', reg);
  $('f-displayname').classList.toggle('hidden', !reg);
  $('firstrun-hint').classList.toggle('hidden', !(reg && info.firstRun));
  $('f-invite').classList.toggle('hidden', !(reg && !info.firstRun && info.registrationOpen));
  $('reg-closed').classList.toggle('hidden', !(reg && !info.firstRun && !info.registrationOpen));
  $('auth-submit').textContent = reg ? '註冊' : '登入';
  $('auth-submit').disabled = reg && !info.firstRun && !info.registrationOpen;
  $('f-password').autocomplete = reg ? 'new-password' : 'current-password';
  $('auth-error').classList.add('hidden');
}

async function submitAuth(e) {
  e.preventDefault();
  const errBox = $('auth-error');
  errBox.classList.add('hidden');
  const username = $('f-username').value.trim();
  const password = $('f-password').value;
  try {
    $('auth-submit').disabled = true;
    let data;
    if (state.authMode === 'register') {
      data = await api('/api/register', {
        method: 'POST',
        body: {
          username,
          password,
          displayName: $('f-displayname').value.trim(),
          inviteCode: $('f-invite').value.trim(),
        },
      });
    } else {
      data = await api('/api/login', { method: 'POST', body: { username, password } });
    }
    state.token = data.token;
    localStorage.setItem('cim_token', data.token);
    state.me = data.user;
    $('f-password').value = '';
    await enterApp();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  } finally {
    const info = state.appInfo || {};
    $('auth-submit').disabled =
      state.authMode === 'register' && !info.firstRun && !info.registrationOpen;
  }
}

/* ---------- 進入主畫面 ---------- */

async function enterApp() {
  $('auth').classList.add('hidden');
  $('app').classList.remove('hidden');
  await Promise.all([loadUsers(), loadConvs()]);
  renderFriends();
  renderSettings();
  switchTab('chats');
  connectWs();
  updateNotifBanner();
  syncPushSubscription();
  if (state.appInfo === null) {
    api('/api/app-info').then((i) => { state.appInfo = i; }).catch(() => {});
  }
}

async function loadUsers() {
  const data = await api('/api/users');
  state.users = new Map(data.users.map((u) => [u.id, u]));
  state.usersPrivacy = !!data.privacy;
}

let convsLoading = null;
async function loadConvs() {
  if (convsLoading) return convsLoading;
  convsLoading = (async () => {
    try {
      const data = await api('/api/conversations');
      state.convs = data.conversations;
      renderChatList();
      updateUnreadBadges();
      if (state.currentConv) {
        const conv = convById(state.currentConv);
        if (!conv) closeChat();
        else { updateChatHeader(conv); applyWallpaper(conv); }
      }
    } finally {
      convsLoading = null;
    }
  })();
  return convsLoading;
}

let convsChangedTimer = null;
function scheduleConvReload() {
  clearTimeout(convsChangedTimer);
  convsChangedTimer = setTimeout(async () => {
    await loadUsers().catch(() => {});
    await loadConvs().catch(() => {});
    renderFriends();
  }, 200);
}

/* ---------- 分頁切換 ---------- */

function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.nav-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.tab === tab));
  $('tab-chats').classList.toggle('hidden', tab !== 'chats');
  $('tab-friends').classList.toggle('hidden', tab !== 'friends');
  $('tab-settings').classList.toggle('hidden', tab !== 'settings');
  if (tab === 'friends') renderFriends();
  if (tab === 'settings') renderSettings();
  document.body.classList.remove('chat-open');
}

/* ---------- 聊天清單 ---------- */

function renderChatList() {
  const box = $('chat-list');
  box.textContent = '';
  if (!state.convs.length) {
    box.append(el('div', { class: 'list-empty', text: '還沒有任何聊天。\n到「好友」找人開始聊天，或按右上角＋建立群組。' }));
    return;
  }
  for (const conv of state.convs) {
    const row = el('button', { class: 'row', onclick: () => openConv(conv.id) },
      convAvatarEl(conv, 52),
      el('div', { class: 'row-main' },
        el('div', { class: 'row-title-line' },
          conv.pinnedChat ? el('span', { class: 'row-pin' }, icon('pin', 14)) : null,
          el('div', { class: 'row-name', text: convTitle(conv) }),
          conv.type === 'group' ? el('span', { class: 'row-count', text: String(conv.members.length) }) : null),
        el('div', { class: 'row-sub', text: previewWithSender(conv) })),
      el('div', { class: 'row-side' },
        el('div', { class: 'row-time', text: conv.lastMessage ? fmtListTime(conv.lastActivity) : '' }),
        conv.unread > 0 ? el('span', { class: 'badge', text: conv.unread > 99 ? '99+' : String(conv.unread) }) : null));
    bindLongPress(row, () => convMenuModal(conv));
    box.append(row);
  }
}

/* ---------- 聊天室長按選單（置頂／背景） ---------- */

async function toggleConvPin(conv) {
  try {
    await api(`/api/conversations/${conv.id}/prefs`, {
      method: 'PATCH', body: { pinned: !conv.pinnedChat },
    });
    conv.pinnedChat = !conv.pinnedChat;
    await loadConvs().catch(() => {});
    toast(conv.pinnedChat ? '已置頂' : '已取消置頂');
  } catch (e2) { toast(e2.message); }
}

function convMenuModal(conv) {
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: convTitle(conv) }),
    el('div', { class: 'modal-body' },
      el('button', {
        class: 'set-item', onclick: () => { close(); toggleConvPin(conv); },
      }, el('span', { class: 'grow', text: conv.pinnedChat ? '取消置頂' : '置頂聊天室' })),
      el('button', {
        class: 'set-item', onclick: () => { close(); wallpaperModal(conv); },
      }, el('span', { class: 'grow', text: '聊天室背景' }))),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '關閉', onclick: () => close() }))));
}

const WALLPAPER_COLORS = ['#F0E9D8', '#F3E3E7', '#E2EBF2', '#E4EFE1', '#EFE8F5', '#F6EFDD'];

async function setWallpaper(conv, value) {
  await api(`/api/conversations/${conv.id}/prefs`, { method: 'PATCH', body: { wallpaper: value } });
  conv.wallpaper = value;
  if (state.currentConv === conv.id) applyWallpaper(conv);
}

function wallpaperModal(conv) {
  const dots = el('div', { class: 'wp-dots' });
  for (const c of WALLPAPER_COLORS) {
    const d = el('button', { type: 'button', class: 'wp-dot', 'aria-label': '背景顏色' });
    d.style.background = c;
    if (conv.wallpaper === 'c:' + c) d.classList.add('active');
    d.addEventListener('click', async () => {
      try { await setWallpaper(conv, 'c:' + c); close(); toast('背景已更換'); }
      catch (e2) { toast(e2.message); }
    });
    dots.append(d);
  }
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: '聊天室背景' }),
    el('div', { class: 'modal-body' },
      el('div', { class: 'set-note', text: '只改變你自己看到的背景，親友不受影響。' }),
      dots,
      el('button', {
        class: 'set-item', onclick: () => pickWallpaperPhoto(conv, () => close()),
      }, el('span', { class: 'grow', text: '🖼️ 用自己的照片' })),
      conv.wallpaper ? el('button', {
        class: 'set-item', onclick: async () => {
          try { await setWallpaper(conv, null); close(); toast('已恢復預設背景'); }
          catch (e2) { toast(e2.message); }
        },
      }, el('span', { class: 'grow', text: '恢復預設背景' })) : null),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '關閉', onclick: () => close() }))));
}

function pickFile(accept, onFile) {
  const input = el('input', { type: 'file', accept, hidden: '' });
  document.body.append(input);
  input.addEventListener('change', () => {
    const f = input.files && input.files[0];
    input.remove();
    if (f) onFile(f);
  });
  input.click();
}

function pickWallpaperPhoto(conv, done) {
  pickFile('image/*', async (file) => {
    try {
      toast('圖片處理中…');
      const dataUrl = await compressImage(file, 1080, 430000);
      await setWallpaper(conv, dataUrl);
      done();
      toast('背景已更換');
    } catch (e2) { toast(e2.message || '無法設定背景'); }
  });
}

function previewWithSender(conv) {
  const m = conv.lastMessage;
  if (!m) return '尚無訊息';
  if (conv.type === 'group' && m.type !== 'system' && !m.deleted) {
    const who = m.senderId === state.me.id ? '我' : nameOf(m.senderId);
    return `${who}：${msgPreview(m)}`;
  }
  return msgPreview(m);
}

function updateUnreadBadges() {
  const total = state.convs.reduce((s, c) => s + (c.unread || 0), 0);
  const badge = $('nav-unread');
  badge.classList.toggle('hidden', total === 0);
  badge.textContent = total > 99 ? '99+' : String(total);
  const base = state.stealth ? '線上文件' : 'CHAT';
  document.title = total > 0 ? `(${total}) ${base}` : base;
}

/* ---------- 好友 ---------- */

function renderFriends() {
  if (!state.me) return;
  const box = $('friend-list');
  box.textContent = '';
  // 隱私模式下（非管理員）才需要「加好友」按鈕；管理員本來就看得到全部
  $('btn-add-friend').classList.toggle('hidden', !(state.usersPrivacy && !state.me.isAdmin));

  const meRow = el('button', {
    class: 'row',
    onclick: () => openDmWith(state.me.id),
  },
    avatarEl(state.me, 52),
    el('div', { class: 'row-main' },
      el('div', { class: 'row-name' },
        el('span', { text: state.me.displayName }),
        state.me.isAdmin ? el('span', { class: 'role-badge', text: '👑 管理員' }) : null),
      el('div', { class: 'row-sub', text: '我的記事本 — 傳訊息給自己做筆記' })));
  box.append(meRow);

  const others = [...state.users.values()].filter((u) => u.id !== state.me.id && !u.disabled);
  box.append(el('div', { class: 'list-section', text: `好友 ${others.length}` }));
  if (!others.length) {
    const emptyText = state.usersPrivacy && !state.me.isAdmin
      ? '還沒有其他好友。\n點右上「＋」輸入親友的帳號加好友，\n或請管理員把你拉進群組。'
      : '還沒有其他成員。\n到「設定」複製邀請訊息，傳給親友請他們註冊！';
    box.append(el('div', { class: 'list-empty', text: emptyText }));
    return;
  }
  for (const u of others) {
    const row = el('button', { class: 'row', onclick: () => showProfile(u) },
      avatarEl(u, 52),
      el('div', { class: 'row-main' },
        el('div', { class: 'row-name' },
          el('span', { text: u.displayName }),
          u.isAdmin ? el('span', { class: 'role-badge', text: '👑 管理員' }) : null),
        el('div', { class: 'row-sub', text: u.statusMessage || '@' + u.username })));
    if (state.usersPrivacy && !state.me.isAdmin && !u.isAdmin) {
      bindLongPress(row, async () => {
        const v = await openSheet([{ label: `移除好友「${u.displayName}」`, value: 'rm', danger: true }]);
        if (v !== 'rm') return;
        try {
          await api(`/api/contacts/${u.id}`, { method: 'DELETE' });
          await loadUsers();
          renderFriends();
          toast('已移除好友');
        } catch (e2) { toast(e2.message); }
      });
    }
    box.append(row);
  }
  box.append(el('div', {
    class: 'list-note',
    text: state.me.isAdmin
      ? '你是管理員，看得到所有成員。其他成員只會看到你，以及跟他同一個群組的人。'
      : '為了保護隱私，這裡只會顯示管理員，以及跟你同一個群組的成員。',
  }));
}

async function addFriendModal() {
  const v = await promptModal('加好友', {
    placeholder: '輸入對方的帳號（英文小寫）', maxlength: 20,
  });
  if (v === null || !v.trim()) return;
  try {
    const data = await api('/api/contacts', { method: 'POST', body: { username: v.trim() } });
    await loadUsers();
    renderFriends();
    toast(`已加入「${data.user.displayName}」！`);
  } catch (e2) { toast(e2.message); }
}

function showProfile(user) {
  const close = openModal(
    el('div', { class: 'modal' },
      el('div', { class: 'modal-body' },
        el('div', { class: 'profile-card' },
          avatarEl(user, 88),
          el('div', { class: 'p-name', text: user.displayName }),
          user.isAdmin ? el('div', { class: 'role-badge profile-badge', text: '👑 管理員' }) : null,
          user.statusMessage ? el('div', { class: 'p-status', text: user.statusMessage }) : null,
          el('div', { class: 'p-username', text: '@' + user.username }))),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-ghost', text: '關閉', onclick: () => close() }),
        el('button', {
          class: 'btn btn-primary', text: '傳訊息',
          onclick: () => { close(); openDmWith(user.id); },
        }))));
}

async function openDmWith(userId) {
  try {
    const data = await api('/api/conversations', { method: 'POST', body: { type: 'dm', userId } });
    if (!convById(data.conversation.id)) {
      state.convs.unshift(data.conversation);
    }
    await loadConvs().catch(() => {});
    switchTab('chats');
    openConv(data.conversation.id);
  } catch (err) {
    toast(err.message);
  }
}

/* ---------- 設定 ---------- */

// 設定頁的「字型」列：值用該字型本身顯示
function typefaceSettingItem() {
  const tf = typefaceOf(state.typeface);
  const item = setItem('字型', tf.name, openTypefacePicker);
  const value = item.querySelector('.value');
  if (value) value.style.fontFamily = `var(${tf.body})`;
  return item;
}

function setItem(label, value, onclick) {
  return el('button', { class: 'set-item', onclick },
    el('span', { class: 'grow', text: label }),
    value !== null ? el('span', { class: 'value', text: value }) : null);
}

function switchItem(label, checked, onchange) {
  const input = el('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onchange(input.checked));
  return el('div', { class: 'set-item' },
    el('span', { class: 'grow', text: label }),
    el('label', { class: 'switch' }, input, el('span', { class: 'track' })));
}

function renderSettings() {
  if (!state.me) return;
  const box = $('settings-body');
  box.textContent = '';

  // 個人檔案
  const avatarWrap = avatarEl(state.me, 64);
  avatarWrap.style.cursor = 'pointer';
  avatarWrap.addEventListener('click', changeAvatar);
  box.append(el('div', { class: 'set-group' },
    el('div', { class: 'set-profile' },
      avatarWrap,
      el('div', { class: 'set-profile-info' },
        el('div', { class: 'set-profile-name', text: state.me.displayName }),
        el('div', { class: 'set-profile-status', text: state.me.statusMessage || '（尚未設定狀態消息）' })),
      icon('camera')),
    setItem('暱稱', state.me.displayName, async () => {
      const v = await promptModal('修改暱稱', { value: state.me.displayName, maxlength: 30 });
      if (v === null) return;
      patchMe({ displayName: v });
    }),
    setItem('狀態消息', state.me.statusMessage || '未設定', async () => {
      const v = await promptModal('狀態消息', {
        value: state.me.statusMessage, maxlength: 100, placeholder: '寫點什麼給大家看…', allowEmpty: true,
      });
      if (v === null) return;
      patchMe({ statusMessage: v });
    })));

  // 外觀
  box.append(el('div', { class: 'set-group' },
    el('div', { class: 'set-group-title', text: '外觀' }),
    skinRow(),
    el('div', { class: 'set-item' },
      el('span', { text: '主題' }),
      segControl([['auto', '自動'], ['light', '淺色'], ['dark', '深色']], state.theme, (v) => {
        state.theme = v;
        localStorage.setItem('cim_theme', v);
        applyAppearance();
        renderSettings();
      })),
    el('div', { class: 'set-item' },
      el('span', { text: '字體大小' }),
      segControl([['sm', '小'], ['md', '標準'], ['lg', '大'], ['xl', '特大']], state.fontSize, (v) => {
        state.fontSize = v;
        localStorage.setItem('cim_font', v);
        applyAppearance();
        renderSettings();
      })),
    typefaceSettingItem()));

  // 加入主畫面
  if (canInstall()) {
    box.append(el('div', { class: 'set-group' },
      el('div', { class: 'set-group-title', text: '加入主畫面' }),
      setItem('📲 把 CHAT 加到主畫面', null, doInstall),
      el('div', { class: 'set-note', text: '加入後從主畫面圖示開啟，就像一般 App。Android 按下直接安裝；iPhone 會顯示 Safari 操作步驟。' })));
  }

  // 通知
  const notifGroup = el('div', { class: 'set-group' },
    el('div', { class: 'set-group-title', text: '通知' }),
    switchItem('桌面通知', state.notify, async (on) => {
      state.notify = on;
      localStorage.setItem('cim_notify', on ? '1' : '0');
      if (on) await ensureNotifPermission();
      updateNotifBanner();
    }),
    switchItem('新訊息音效', state.sound, (on) => {
      state.sound = on;
      localStorage.setItem('cim_sound', on ? '1' : '0');
      if (on) ding();
    }));
  if (pushSupported()) {
    notifGroup.append(
      switchItem('離線推播（網頁沒開也通知）', state.pushOn, async (on) => {
        if (on) {
          const ok2 = await enablePush();
          if (!ok2) { renderSettings(); return; }
          toast('離線推播已開啟');
        } else {
          await disablePush();
        }
        renderSettings();
      }),
      el('div', { class: 'set-note', text: 'iPhone 要先用 Safari「加入主畫面」、從主畫面開啟後才能開離線推播。推播內容一律只顯示「新訊息」，不會外洩聊天內容。' }));
  }
  notifGroup.append(
    switchItem('上班低調模式', state.stealth, (on) => {
      state.stealth = on;
      localStorage.setItem('cim_stealth', on ? '1' : '0');
      applyAppearance();
      toast(on ? '低調模式開啟：標題與通知都會偽裝' : '低調模式已關閉');
    }),
    el('div', { class: 'set-note', text: '低調模式：分頁標題顯示「線上文件」、分頁圖示換成文件樣式、通知只顯示「有新內容」。只影響這台裝置。' }));
  box.append(notifGroup);

  // 管理員
  if (state.me.isAdmin) {
    const codeInput = el('input', { placeholder: '設定邀請碼（親友註冊時要輸入）', maxlength: 50 });
    codeInput.style.cssText = 'flex:1;border:1px solid var(--line);border-radius:8px;padding:8px 10px;outline:none;min-width:0';
    api('/api/admin/settings').then((s) => { codeInput.value = s.inviteCode || ''; }).catch(() => {});
    const saveBtn = el('button', {
      class: 'btn btn-small btn-primary', text: '儲存',
      onclick: async () => {
        try {
          const r = await api('/api/admin/settings', { method: 'PATCH', body: { inviteCode: codeInput.value } });
          toast(r.inviteCode ? '邀請碼已更新' : '已關閉註冊');
        } catch (e2) { toast(e2.message); }
      },
    });
    const privacySwitch = switchItem('好友名單隱私', true, async (on) => {
      try {
        await api('/api/admin/settings', { method: 'PATCH', body: { privacyContacts: on } });
        toast(on ? '已開啟：親友需自行加好友才互相看得見' : '已關閉：所有成員互相看得見');
      } catch (e2) { toast(e2.message); renderSettings(); }
    });
    api('/api/admin/settings').then((s2) => {
      const input = privacySwitch.querySelector('input');
      if (input) input.checked = !!s2.privacyContacts;
    }).catch(() => {});
    box.append(el('div', { class: 'set-group' },
      el('div', { class: 'set-group-title', text: '管理員' }),
      el('div', { class: 'set-item' }, codeInput, saveBtn),
      privacySwitch,
      el('div', { class: 'set-note', text: '好友名單隱私開啟時：親友只看得到你、同聊天室的成員、以及自己輸入帳號加的好友；你（管理員）永遠看得到全部成員。' }),
      setItem('複製邀請訊息', null, async () => {
        try {
          const s = await api('/api/admin/settings');
          if (!s.inviteCode) return toast('請先設定邀請碼');
          const text = `邀請你加入我們的 CHAT 聊天室！\n1. 打開 ${location.origin}\n2. 點「註冊」建立帳號\n3. 邀請碼：${s.inviteCode}`;
          await navigator.clipboard.writeText(text);
          toast('邀請訊息已複製，貼給親友吧！');
        } catch (e2) { toast(e2.message); }
      }),
      setItem('成員管理', `${[...state.users.values()].filter((u) => !u.disabled).length} 位`, manageMembersModal),
      setItem('下載聊天備份', null, async () => {
        try {
          const data = await api('/api/admin/export');
          const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
          const a = el('a', { href: URL.createObjectURL(blob), download: 'chat-backup.json' });
          a.click();
          URL.revokeObjectURL(a.href);
        } catch (e2) { toast(e2.message); }
      }),
      el('div', { class: 'set-note', text: '邀請碼留空並儲存＝關閉註冊。已註冊的人不受影響。' })));
  }

  // 帳號
  box.append(el('div', { class: 'set-group' },
    el('div', { class: 'set-group-title', text: '帳號' }),
    setItem('帳號', '@' + state.me.username, () => {}),
    setItem('變更密碼', null, changePasswordModal),
    setItem('登出', null, async () => {
      if (!(await confirmModal('登出', '確定要登出嗎？'))) return;
      try { await api('/api/logout', { method: 'POST' }); } catch {}
      state.token = null;
      localStorage.removeItem('cim_token');
      stopWs();
      closeChat();
      showAuth();
    })));

  box.append(el('div', { class: 'set-note', text: 'CHAT v1.0 — 手機瀏覽器選單中點「加入主畫面」，就能像 App 一樣使用。' }));
}

async function patchMe(body) {
  try {
    const data = await api('/api/me', { method: 'PATCH', body });
    state.me = data.user;
    state.users.set(data.user.id, data.user);
    renderSettings();
    renderFriends();
  } catch (err) { toast(err.message); }
}

function changeAvatar() {
  const items = [{ label: '選擇照片', value: 'pick' }];
  if (state.me.avatar) items.push({ label: '移除頭像', value: 'remove', danger: true });
  openSheet(items).then((v) => {
    if (v === 'pick') $('avatar-input').click();
    if (v === 'remove') patchMe({ avatar: null });
  });
}

function changePasswordModal() {
  const oldIn = el('input', { type: 'password', placeholder: '目前密碼', autocomplete: 'current-password' });
  const newIn = el('input', { type: 'password', placeholder: '新密碼（至少 6 個字元）', autocomplete: 'new-password' });
  const new2In = el('input', { type: 'password', placeholder: '再輸入一次新密碼', autocomplete: 'new-password' });
  const err = el('div', { class: 'modal-error hidden' });
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: '變更密碼' }),
    el('div', { class: 'modal-body' }, oldIn, newIn, new2In, err),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '取消', onclick: () => close() }),
      el('button', {
        class: 'btn btn-primary', text: '確定',
        onclick: async () => {
          err.classList.add('hidden');
          if (newIn.value !== new2In.value) {
            err.textContent = '兩次輸入的新密碼不一樣';
            return err.classList.remove('hidden');
          }
          try {
            await api('/api/me/password', {
              method: 'POST',
              body: { oldPassword: oldIn.value, newPassword: newIn.value },
            });
            close();
            toast('密碼已更新');
          } catch (e2) {
            err.textContent = e2.message;
            err.classList.remove('hidden');
          }
        },
      }))));
}

/* ---------- 聊天視窗 ---------- */

function openConv(convId) {
  const conv = convById(convId);
  if (!conv) return;
  state.currentConv = convId;
  document.body.classList.add('chat-open');
  $('chat-empty').classList.add('hidden');
  $('chat-view').classList.remove('hidden');
  $('typing').classList.add('hidden');
  $('btn-jump').classList.add('hidden');
  hidePicker();
  clearReply();
  cancelRec();
  updateChatHeader(conv);
  updatePinBanner(convId);
  applyWallpaper(conv);
  const mineMember = conv.members.find((x) => x.userId === state.me.id);
  state.unreadMarker = conv.unread > 0 && mineMember
    ? { convId, afterId: mineMember.lastReadId }
    : null;

  const cached = state.msgCache.get(convId);
  renderMessages(convId);
  if (cached) scrollToBottom(false);
  fetchMessages(convId).catch((e) => toast(e.message));
  if (!isTouch()) $('input').focus();
}

function closeChat() {
  state.currentConv = null;
  state.unreadMarker = null;
  applyWallpaper(null);
  document.body.classList.remove('chat-open');
  $('chat-view').classList.add('hidden');
  $('chat-empty').classList.remove('hidden');
  hidePicker();
}

function applyWallpaper(conv) {
  const sc = $('msg-scroll');
  const w = conv && conv.wallpaper;
  if (w && w.startsWith('c:')) {
    sc.style.background = w.slice(2);
  } else if (w) {
    sc.style.background = `url("${w}") center / cover no-repeat`;
  } else {
    sc.style.background = '';
  }
}

function updateChatHeader(conv) {
  $('chat-title').textContent = convTitle(conv);
  let sub = '';
  if (conv.type === 'group') sub = `${conv.members.length} 位成員`;
  else if (isMemo(conv)) sub = '只有你看得到的小空間';
  else {
    const p = dmPartner(conv);
    sub = (p && p.statusMessage) || '';
  }
  $('chat-sub').textContent = sub;
  $('chat-sub').classList.toggle('hidden', !sub);
}

async function fetchMessages(convId) {
  const data = await api(`/api/conversations/${convId}/messages?limit=50`);
  state.msgCache.set(convId, {
    messages: data.messages,
    members: data.members,
    hasMore: data.hasMore,
    pinned: data.pinned || null,
    aroundMode: false,
    hasNewer: false,
  });
  if (state.currentConv === convId) {
    renderMessages(convId);
    updatePinBanner(convId);
    const sep = document.getElementById('unread-sep');
    if (sep) $('msg-scroll').scrollTop = Math.max(0, sep.offsetTop - 72);
    else scrollToBottom(false);
    sendReadIfNeeded(convId);
  }
}

async function loadOlder() {
  const convId = state.currentConv;
  const cache = state.msgCache.get(convId);
  if (!convId || !cache || !cache.hasMore || !cache.messages.length) return;
  const scroller = $('msg-scroll');
  const prevHeight = scroller.scrollHeight;
  try {
    const data = await api(`/api/conversations/${convId}/messages?limit=50&before=${cache.messages[0].id}`);
    cache.messages = [...data.messages, ...cache.messages];
    cache.hasMore = data.hasMore;
    cache.members = data.members;
    renderMessages(convId);
    scroller.scrollTop = scroller.scrollHeight - prevHeight + scroller.scrollTop;
  } catch (e) { toast(e.message); }
}

function readLabelFor(conv, cache, m) {
  if (m.senderId !== state.me.id || m.deleted || m.type === 'system') return '';
  if (isMemo(conv)) return '';
  const readers = cache.members.filter((x) => x.userId !== state.me.id && x.lastReadId >= m.id).length;
  if (readers === 0) return '';
  return conv.type === 'group' ? `已讀 ${readers}` : '已讀';
}

function buildMessageContent(m) {
  if (m.deleted) return el('div', { class: 'bubble deleted', text: '已收回訊息' });
  if (m.type === 'image')
    return el('img', {
      class: 'msg-img', src: m.content, alt: '圖片',
      onclick: () => openViewer(m.content),
    });
  if (m.type === 'sticker') {
    if (m.content.startsWith('sid:')) return buildCustomSticker(m.content.slice(4));
    return el('div', { class: 'msg-sticker', text: m.content });
  }
  if (m.type === 'audio') return buildAudioMsg(m);
  if (m.type === 'poll') return buildPollCard(m);
  if (m.type === 'game') return buildGameChip(m);
  const frag = document.createDocumentFragment();
  frag.append(el('div', { class: 'bubble' }, renderText(m.content)));
  if (m.meta && m.meta.link && m.meta.link.title) frag.append(buildLinkCard(m.meta.link));
  return frag;
}

// 連結預覽卡片：縮圖（由伺服器簽章的同源代理供應）＋標題／摘要／站名，整張可點
function buildLinkCard(L) {
  const href = safeHttpUrl(L.url);
  if (!href) return null;
  let host = L.site || '';
  if (!host) { try { host = new URL(href).hostname; } catch {} }
  // 只接受伺服器產生的代理路徑，避免載入任意外站圖片（CSP 也只允許同源）
  const imgSrc = typeof L.image === 'string' && L.image.startsWith('/api/link-image?') ? L.image : null;
  const card = el('a', {
    class: 'link-card' + (imgSrc ? ' has-img' : ''), href, target: '_blank',
    rel: 'noopener noreferrer nofollow', title: href,
  });
  if (imgSrc) {
    const img = el('img', { class: 'lc-img', src: imgSrc, alt: '', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => { img.remove(); card.classList.remove('has-img'); });
    card.append(img);
  }
  card.append(el('div', { class: 'lc-body' },
    el('div', { class: 'lc-title', text: L.title }),
    L.desc ? el('div', { class: 'lc-desc', text: L.desc }) : null,
    el('div', { class: 'lc-site' }, icon('globe', 12), el('span', { class: 'lc-host', text: host }))));
  return card;
}

function buildCustomSticker(sid) {
  const id = Number(sid);
  const src = state.stickerMap.get(id);
  if (src) {
    return el('img', {
      class: 'msg-sticker-img', src, alt: '貼圖',
      onclick: () => openViewer(src),
    });
  }
  // 尚未載入貼圖清單：先放占位，載入完成後重畫
  ensureStickers().then(() => {
    if (state.currentConv) renderMessagesKeepScroll(state.currentConv);
  }).catch(() => {});
  return el('div', { class: 'msg-sticker-img loading', text: '…' });
}

function renderMessagesKeepScroll(convId) {
  const sc = $('msg-scroll');
  const atBottom = nearBottom();
  const top = sc.scrollTop;
  renderMessages(convId);
  if (atBottom) scrollToBottom(false);
  else sc.scrollTop = top;
}

function buildMessageNode(conv, cache, m, prev) {
  const frag = document.createDocumentFragment();
  if (!prev || !sameDay(prev.createdAt, m.createdAt)) {
    frag.append(el('div', { class: 'date-sep', text: fmtDateSep(m.createdAt) }));
  }
  if (m.type === 'system') {
    frag.append(el('div', { class: 'sys-msg', text: m.content, 'data-mid': m.id }));
    return frag;
  }

  const mine = m.senderId === state.me.id;
  const head = !prev || prev.senderId !== m.senderId || prev.type === 'system' ||
    (m.createdAt - prev.createdAt) > 5 * 60 * 1000 || !sameDay(prev.createdAt, m.createdAt);

  const stack = el('div', { class: 'msg-stack' });
  if (m.meta && m.meta.reply) {
    const r = m.meta.reply;
    stack.append(el('div', { class: 'quote', onclick: () => scrollToMessage(r.id) },
      el('div', { class: 'qname', text: nameOf(r.senderId) }),
      el('div', { class: 'qtext', text: r.text })));
  }
  stack.append(buildMessageContent(m));

  const meta = el('div', { class: 'meta' },
    el('span', { class: 'read', text: readLabelFor(conv, cache, m) }),
    el('span', { class: 'time', text: fmtTime(m.createdAt) }));

  const line = el('div', { class: 'msg-line' }, stack, meta);
  attachMsgMenu(line, m);

  const row = el('div', { class: `msg-row ${mine ? 'mine' : 'theirs'}${head ? ' head' : ''}`, 'data-mid': m.id });
  if (!mine) {
    const slot = el('div', { class: 'msg-avatar-slot' });
    if (head) slot.append(avatarEl(userOf(m.senderId), 36));
    row.append(slot);
  }
  const body = el('div', { class: 'msg-body' });
  if (!mine && head && conv.type === 'group') {
    body.append(el('div', { class: 'msg-name', text: nameOf(m.senderId) }));
  }
  body.append(line);
  const chips = renderReactionChips(m);
  if (chips) body.append(chips);
  row.append(body);
  frag.append(row);
  return frag;
}

function renderMessages(convId) {
  const conv = convById(convId);
  const cache = state.msgCache.get(convId);
  const list = $('msg-list');
  list.textContent = '';
  $('btn-load-more').classList.toggle('hidden', !(cache && cache.hasMore));
  if (!conv || !cache) return;
  let prev = null;
  let sepDone = !(state.unreadMarker && state.unreadMarker.convId === convId);
  for (const m of cache.messages) {
    if (!sepDone && m.type !== 'system' && m.id > state.unreadMarker.afterId) {
      list.append(el('div', { class: 'unread-sep', id: 'unread-sep' },
        el('span', { text: '以下是未讀訊息' })));
      sepDone = true;
    }
    list.append(buildMessageNode(conv, cache, m, prev));
    prev = m;
  }
}

function appendMessage(convId, m) {
  const conv = convById(convId);
  const cache = state.msgCache.get(convId);
  if (!conv || !cache) return;
  const prev = cache.messages.length >= 2 ? cache.messages[cache.messages.length - 2] : null;
  $('msg-list').append(buildMessageNode(conv, cache, m, prev));
}

function updateReadLabels(convId) {
  if (state.currentConv !== convId) return;
  const conv = convById(convId);
  const cache = state.msgCache.get(convId);
  if (!conv || !cache) return;
  const byId = new Map(cache.messages.map((m) => [m.id, m]));
  document.querySelectorAll('#msg-list .msg-row.mine').forEach((row) => {
    const m = byId.get(Number(row.dataset.mid));
    const span = row.querySelector('.read');
    if (m && span) span.textContent = readLabelFor(conv, cache, m);
  });
}

function nearBottom(px = 150) {
  const s = $('msg-scroll');
  return s.scrollHeight - s.scrollTop - s.clientHeight < px;
}

function scrollToBottom(smooth = true) {
  const s = $('msg-scroll');
  s.scrollTo({ top: s.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  $('btn-jump').classList.add('hidden');
}

function sendReadIfNeeded(convId) {
  if (document.visibilityState !== 'visible') return;
  const cache = state.msgCache.get(convId);
  if (!cache || !cache.messages.length) return;
  const lastId = cache.messages[cache.messages.length - 1].id;
  if ((state.lastReadSent.get(convId) || 0) >= lastId) return;
  state.lastReadSent.set(convId, lastId);
  api(`/api/conversations/${convId}/read`, { method: 'POST', body: { lastMessageId: lastId } })
    .catch(() => state.lastReadSent.delete(convId));
  const conv = convById(convId);
  if (conv && conv.unread) {
    conv.unread = 0;
    renderChatList();
    updateUnreadBadges();
  }
}

/* ---------- 訊息選單（收回／複製） ---------- */

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

function bindLongPress(node, fn) {
  node.addEventListener('contextmenu', (e) => { e.preventDefault(); fn(e); });
  let timer = null;
  node.addEventListener('touchstart', (e) => {
    timer = setTimeout(() => fn(e), 550);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach((evt) =>
    node.addEventListener(evt, () => clearTimeout(timer), { passive: true }));
}

function attachMsgMenu(node, m) {
  if (m.type === 'system') return;
  const open = (e) => {
    e.preventDefault();
    if (!m.deleted) openMsgSheet(m);
  };
  node.addEventListener('contextmenu', open);
  let pressTimer = null;
  node.addEventListener('touchstart', (e) => {
    pressTimer = setTimeout(() => open(e), 550);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach((evt) =>
    node.addEventListener(evt, () => clearTimeout(pressTimer), { passive: true }));
}

function openMsgSheet(m) {
  const sheet = el('div', { class: 'sheet' });
  const emojiRow = el('div', { class: 'sheet-emojis' });
  for (const emo of QUICK_REACTIONS) {
    emojiRow.append(el('button', {
      type: 'button', text: emo,
      onclick: async () => {
        close();
        try {
          await api(`/api/messages/${m.id}/react`, { method: 'POST', body: { emoji: emo } });
        } catch (e2) { toast(e2.message); }
      },
    }));
  }
  sheet.append(emojiRow);
  const add = (label, danger, fn) => sheet.append(el('button', {
    class: danger ? 'danger' : '', text: label,
    onclick: () => { close(); fn(); },
  }));
  add('回覆', false, () => setReply(m));
  if (m.type === 'text') {
    add('複製', false, async () => {
      try { await navigator.clipboard.writeText(m.content); toast('已複製'); } catch { toast('無法複製'); }
    });
  }
  add('設為公告', false, async () => {
    try {
      await api(`/api/conversations/${m.conversationId}/pin`, {
        method: 'POST', body: { messageId: m.id },
      });
    } catch (e2) { toast(e2.message); }
  });
  if (m.senderId === state.me.id && Date.now() - m.createdAt < 24 * 3600 * 1000) {
    add('收回', true, async () => {
      try { await api(`/api/messages/${m.id}/unsend`, { method: 'POST' }); } catch (e2) { toast(e2.message); }
    });
  }
  sheet.append(el('button', { class: 'cancel', text: '取消', onclick: () => close() }));
  const close = openModal(sheet);
}

/* ---------- 傳送訊息 ---------- */

let sending = false;
async function sendText() {
  const input = $('input');
  const text = input.value.replace(/\s+$/, '');
  if (!text.trim() || !state.currentConv || sending) return;
  input.value = '';
  autoGrow();
  hidePicker();
  sending = true;
  try {
    await postMessage(state.currentConv, 'text', text);
  } catch (err) {
    input.value = text;
    autoGrow();
    toast(err.message);
  } finally {
    sending = false;
    if (!isTouch()) input.focus();
  }
}

async function postMessage(convId, type, content, extra = {}) {
  const body = { type, content, ...extra };
  if (state.replyTarget && state.replyTarget.convId === convId) body.replyTo = state.replyTarget.id;
  const data = await api(`/api/conversations/${convId}/messages`, { method: 'POST', body });
  clearReply();
  handleIncomingMessage(data.message, true);
  return data.message;
}

async function sendSticker(sticker) {
  if (!state.currentConv) return;
  hidePicker();
  try { await postMessage(state.currentConv, 'sticker', sticker); }
  catch (err) { toast(err.message); }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('無法讀取檔案'));
    r.readAsDataURL(file);
  });
}

async function sendImageFile(file) {
  if (!state.currentConv || !file) return;
  try {
    let dataUrl;
    if (file.type === 'image/gif') {
      // GIF 直接原檔傳送，保留動畫（經過 canvas 壓縮會變成靜態圖）
      if (file.size > 1400000) throw new Error('GIF 檔太大（上限約 1.4MB），請選小一點的');
      dataUrl = await fileToDataUrl(file);
    } else {
      toast('圖片處理中…');
      dataUrl = await compressImage(file, 1280, 620000);
    }
    await postMessage(state.currentConv, 'image', dataUrl);
  } catch (err) {
    toast(err.message || '圖片無法傳送');
  }
}

async function compressImage(file, maxDim, maxLen) {
  if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name || '')) {
    throw new Error('請選擇圖片檔');
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('不支援這種圖片格式'));
      img.src = URL.createObjectURL(file);
    });
  }
  const w = bitmap.width, h = bitmap.height;
  if (!w || !h) throw new Error('無法讀取圖片');
  let dim = Math.min(1, maxDim / Math.max(w, h));
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * dim));
    canvas.height = Math.max(1, Math.round(h * dim));
    const ctx2 = canvas.getContext('2d');
    ctx2.fillStyle = '#fff';
    ctx2.fillRect(0, 0, canvas.width, canvas.height);
    ctx2.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let q = 0.85;
    let out = canvas.toDataURL('image/jpeg', q);
    while (out.length > maxLen && q > 0.42) {
      q -= 0.12;
      out = canvas.toDataURL('image/jpeg', q);
    }
    if (out.length <= maxLen) return out;
    dim *= 0.72;
  }
  throw new Error('圖片太大，無法傳送');
}

/* ---------- 輸入框 ---------- */

const isTouch = () => matchMedia('(pointer: coarse)').matches;

function autoGrow() {
  const input = $('input');
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
}

function notifyTyping() {
  const convId = state.currentConv;
  if (!convId || !$('input').value.trim()) return;
  const nowTs = Date.now();
  if (nowTs - state.lastTypingSent < 3500) return;
  state.lastTypingSent = nowTs;
  api(`/api/conversations/${convId}/typing`, { method: 'POST' }).catch(() => {});
}

/* ---------- 表情／貼圖 ---------- */

const EMOJIS = ('😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤗 🤭 🤫 🤔 🤐 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 😵 🤯 🥳 🥺 😳 😱 😨 😰 😥 😢 😭 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 💀 💩 🤡 👻 👽 🤖 😺 😸 😹 😻 😼 🙈 🙉 🙊 💋 💌 💘 💝 💖 💗 💓 💞 💕 ❣️ 💔 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💯 💢 💥 💫 💦 💨 👋 🤚 ✋ 🖖 👌 🤌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 👏 🙌 🤝 🙏 💪 🎉 🎊 🎂 🎁 🌹 🌸 🌞 🌝 🌈 ⭐ 🔥 ✨ ☔ ⚡ 🍀 🍺 🍻 ☕ 🧋 🍜 🍱 🍰 🍦 🐶 🐱 🐰 🐻 🐼 🐷 ✅ ❌ ⭕ ❓ ❗ 💤').split(' ');

const STICKERS = ('🥰 😂 😭 😡 😴 🤔 😱 🥳 👍 👎 🙏 👏 💪 🫶 ❤️ 💔 🎉 🌸 ☀️ 🌙 ⭐ 🔥 💯 ✅ 🐶 🐱 🐻 🐼 🍀 🍺 ☕ 🎂 😺 💩 👻 🤖').split(' ');

let pickerBuilt = false;
function buildPicker() {
  if (pickerBuilt) return;
  pickerBuilt = true;
  const eg = $('picker-emoji');
  for (const e of EMOJIS) {
    eg.append(el('button', { type: 'button', text: e, onclick: () => insertEmoji(e) }));
  }
  rebuildStickerGrid();
  ensureStickers().catch(() => {});
}

async function ensureStickers(force) {
  if (!force && state.customStickers !== null) return;
  const data = await api('/api/stickers');
  state.customStickers = data.stickers;
  state.stickerMap = new Map(data.stickers.map((x) => [x.id, x.image]));
  rebuildStickerGrid();
}

function rebuildStickerGrid() {
  if (!pickerBuilt) return;
  const sg = $('picker-sticker');
  sg.textContent = '';

  // 自訂貼圖（長按可刪除自己新增的）
  for (const st of state.customStickers || []) {
    const b = el('button', { type: 'button', class: 'sticker-tile', onclick: () => sendSticker('sid:' + st.id) },
      el('img', { src: st.image, alt: '貼圖' }));
    if (st.addedBy === state.me?.id || state.me?.isAdmin) {
      bindLongPress(b, async () => {
        if (!(await confirmModal('刪除貼圖', '要把這張貼圖從全家的貼圖包移除嗎？', true))) return;
        try { await api(`/api/stickers/${st.id}`, { method: 'DELETE' }); await ensureStickers(true); }
        catch (e2) { toast(e2.message); }
      });
    }
    sg.append(b);
  }

  // 新增貼圖
  const add = el('button', { type: 'button', class: 'sticker-tile sticker-add', title: '新增自訂貼圖' },
    el('span', { text: '＋' }));
  add.addEventListener('click', () => {
    pickFile('image/*', async (file) => {
      try {
        toast('貼圖處理中…');
        const dataUrl = await compressSticker(file);
        await api('/api/stickers', { method: 'POST', body: { image: dataUrl } });
        await ensureStickers(true);
        toast('貼圖已加入，全家都能用！');
      } catch (e2) { toast(e2.message || '無法新增貼圖'); }
    });
  });
  sg.append(add);

  for (const s of STICKERS) {
    sg.append(el('button', { type: 'button', text: s, onclick: () => sendSticker(s) }));
  }
}

// 自訂貼圖壓縮：240px、保留透明（webp／png），退回 jpeg；小 GIF 原檔保留動畫
async function compressSticker(file) {
  if (!/^image\//.test(file.type)) throw new Error('請選擇圖片檔');
  if (file.type === 'image/gif' && file.size <= 64000) {
    return fileToDataUrl(file); // 動態貼圖！
  }
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('不支援這種圖片格式'); }
  const scale = Math.min(1, 240 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let out = canvas.toDataURL('image/webp', 0.9);
  if (!out.startsWith('data:image/webp') || out.length > 88000) {
    const png = canvas.toDataURL('image/png');
    out = png.length <= 88000 ? png : canvas.toDataURL('image/jpeg', 0.85);
  }
  if (out.length > 88000) throw new Error('圖片太複雜，請換一張或先裁小一點');
  return out;
}

function insertEmoji(emoji) {
  const input = $('input');
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  input.selectionStart = input.selectionEnd = start + emoji.length;
  autoGrow();
  if (!isTouch()) input.focus();
}

function togglePicker() {
  buildPicker();
  const p = $('picker');
  const willShow = p.classList.contains('hidden');
  p.classList.toggle('hidden');
  if (willShow) scrollToBottom(false);
}

function hidePicker() {
  $('picker').classList.add('hidden');
}

/* ---------- 群組 ---------- */

function memberPickRows(users, selected) {
  return users.map((u) => {
    const row = el('button', { class: 'check-row', type: 'button' },
      el('span', { class: 'check-box' }, icon('check', 14)),
      avatarEl(u, 40),
      el('span', { class: 'row-name', text: u.displayName }));
    row.addEventListener('click', () => {
      if (selected.has(u.id)) { selected.delete(u.id); row.removeAttribute('data-checked'); }
      else { selected.add(u.id); row.setAttribute('data-checked', '1'); }
    });
    return row;
  });
}

function newGroupModal() {
  const others = [...state.users.values()].filter((u) => u.id !== state.me.id && !u.disabled);
  if (!others.length) return toast('目前還沒有其他成員可以加入群組');
  const nameIn = el('input', { placeholder: '群組名稱', maxlength: 30 });
  const selected = new Set();
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: '建立群組' }),
    el('div', { class: 'modal-body' },
      nameIn,
      el('div', { class: 'member-list' }, memberPickRows(others, selected))),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '取消', onclick: () => close() }),
      el('button', {
        class: 'btn btn-primary', text: '建立',
        onclick: async () => {
          try {
            const data = await api('/api/conversations', {
              method: 'POST',
              body: { type: 'group', name: nameIn.value.trim(), memberIds: [...selected] },
            });
            close();
            await loadConvs().catch(() => {});
            switchTab('chats');
            openConv(data.conversation.id);
          } catch (e2) { toast(e2.message); }
        },
      }))));
}

// 聊天室選單裡的功能區：吃什麼、小遊戲、待辦、行事曆（私訊與群組都有）
function chatFeatureItems(conv, close) {
  const item = (emoji, label, sub, onclick) => el('button', {
    class: 'set-item feature-item', onclick: () => { close(); onclick(); },
  },
    el('span', { class: 'feature-emoji', text: emoji }),
    el('span', { class: 'grow' },
      el('span', { class: 'feature-label', text: label }),
      el('span', { class: 'feature-sub', text: sub })));
  return [
    el('div', { class: 'list-section', text: '聊天室功能' }),
    item('🍽️', '今天吃什麼', '隨機抽一個類別，省得想破頭', () => foodPickModal(conv)),
    item('🎮', '小遊戲', '圈圈叉叉、五子棋、2048，大家一起玩', () => gamePickModal(conv)),
    item('✅', '待辦清單', '要做的、要買的，成員都看得到', () => openToolsModal('shopping')),
    item('📅', '行事曆', '生日、聚餐、提醒，到時通知大家', () => openToolsModal('calendar')),
  ];
}

function chatInfoModal() {
  const conv = convById(state.currentConv);
  if (!conv) return;

  if (conv.type === 'dm') {
    const partner = dmPartner(conv);
    const close = openModal(el('div', { class: 'modal' },
      el('div', { class: 'modal-title', text: convTitle(conv) }),
      el('div', { class: 'modal-body' },
        partner && partner.id !== state.me.id ? el('button', {
          class: 'set-item', onclick: () => { close(); showProfile(partner); },
        }, el('span', { class: 'grow', text: '查看對方資料' })) : null,
        el('button', {
          class: 'set-item', onclick: () => { close(); toggleConvPin(conv); },
        }, el('span', { class: 'grow', text: conv.pinnedChat ? '取消置頂' : '置頂聊天室' })),
        el('button', {
          class: 'set-item', onclick: () => { close(); wallpaperModal(conv); },
        }, el('span', { class: 'grow', text: '聊天室背景' })),
        chatFeatureItems(conv, () => close())),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-ghost', text: '關閉', onclick: () => close() }))));
    return;
  }

  const memberRows = conv.members.map((m) => {
    const u = userOf(m.userId);
    return el('div', { class: 'row' },
      avatarEl(u, 44),
      el('div', { class: 'row-main' },
        el('div', { class: 'row-name' },
          el('span', { text: (u ? u.displayName : '未知') + (m.userId === state.me.id ? '（我）' : '') }),
          u && u.isAdmin ? el('span', { class: 'role-badge', text: '👑 管理員' }) : null)));
  });

  const avatarWrap = el('div', { class: 'group-avatar-wrap' }, convAvatarEl(conv, 72));
  avatarWrap.title = '更換群組照片';
  avatarWrap.addEventListener('click', () => {
    pickFile('image/*', async (file) => {
      try {
        toast('圖片處理中…');
        const dataUrl = await compressImage(file, 256, 76000);
        await api(`/api/conversations/${conv.id}`, { method: 'PATCH', body: { avatar: dataUrl } });
        close();
        loadConvs().catch(() => {});
      } catch (e2) { toast(e2.message || '無法更換群組照片'); }
    });
  });

  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: conv.name || '群組' }),
    el('div', { class: 'modal-body' },
      el('div', { class: 'group-avatar-row' }, avatarWrap,
        el('div', { class: 'set-note', text: '點照片可更換群組頭像' })),
      el('button', {
        class: 'set-item', onclick: () => { close(); toggleConvPin(conv); },
      }, el('span', { class: 'grow', text: conv.pinnedChat ? '取消置頂' : '置頂聊天室' })),
      el('button', {
        class: 'set-item', onclick: () => { close(); wallpaperModal(conv); },
      }, el('span', { class: 'grow', text: '聊天室背景' })),
      el('button', {
        class: 'set-item', onclick: async () => {
          const v = await promptModal('修改群組名稱', { value: conv.name || '', maxlength: 30 });
          if (v === null || !v.trim()) return;
          try {
            await api(`/api/conversations/${conv.id}`, { method: 'PATCH', body: { name: v.trim() } });
            close();
          } catch (e2) { toast(e2.message); }
        },
      }, el('span', { class: 'grow', text: '修改群組名稱' }), el('span', { class: 'value', text: conv.name || '' })),
      el('button', {
        class: 'set-item', onclick: () => { close(); inviteToGroupModal(conv); },
      }, el('span', { class: 'grow', text: '邀請成員加入' })),
      el('button', {
        class: 'set-item', onclick: () => { close(); pollCreateModal(conv); },
      }, el('span', { class: 'grow', text: '發起投票' })),
      chatFeatureItems(conv, () => close()),
      el('div', { class: 'list-section', text: `成員 ${conv.members.length}` }),
      el('div', { class: 'member-list' }, memberRows)),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '關閉', onclick: () => close() }),
      el('button', {
        class: 'btn btn-ghost btn-danger-text', text: '離開群組',
        onclick: async () => {
          if (!(await confirmModal('離開群組', '離開後就看不到這個群組的訊息了，確定嗎？', true))) return;
          try {
            await api(`/api/conversations/${conv.id}/leave`, { method: 'POST' });
            close();
            closeChat();
            loadConvs().catch(() => {});
          } catch (e2) { toast(e2.message); }
        },
      }))));
}

function inviteToGroupModal(conv) {
  const memberIds = new Set(conv.members.map((m) => m.userId));
  const candidates = [...state.users.values()].filter((u) => !memberIds.has(u.id) && !u.disabled);
  if (!candidates.length) return toast('所有成員都已經在群組裡了');
  const selected = new Set();
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: '邀請成員加入' }),
    el('div', { class: 'modal-body' },
      el('div', { class: 'member-list' }, memberPickRows(candidates, selected))),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '取消', onclick: () => close() }),
      el('button', {
        class: 'btn btn-primary', text: '邀請',
        onclick: async () => {
          if (!selected.size) return;
          try {
            await api(`/api/conversations/${conv.id}/members`, {
              method: 'POST', body: { userIds: [...selected] },
            });
            close();
          } catch (e2) { toast(e2.message); }
        },
      }))));
}

/* ---------- 彈窗基礎 ---------- */

let openModals = 0;

function openModal(modalNode, onClose) {
  const backdrop = el('div', { class: 'modal-backdrop' }, modalNode);
  let closed = false;
  openModals++;
  document.body.classList.add('modal-open');
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    openModals = Math.max(0, openModals - 1);
    if (!openModals) document.body.classList.remove('modal-open');
    if (onClose) onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);
  $('modal-root').append(backdrop);
  return close;
}

function confirmModal(title, text, danger = false) {
  return new Promise((resolve) => {
    const close = openModal(el('div', { class: 'modal' },
      el('div', { class: 'modal-title', text: title }),
      el('div', { class: 'modal-body' }, el('p', { text })),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-ghost', text: '取消', onclick: () => { close(); resolve(false); } }),
        el('button', {
          class: 'btn btn-primary' + (danger ? '' : ''), text: '確定',
          onclick: () => { close(); resolve(true); },
        }))));
  });
}

function promptModal(title, { value = '', placeholder = '', maxlength = 100, allowEmpty = false } = {}) {
  return new Promise((resolve) => {
    const input = el('input', { placeholder, maxlength });
    input.value = value || '';
    const close = openModal(el('div', { class: 'modal' },
      el('div', { class: 'modal-title', text: title }),
      el('div', { class: 'modal-body' }, input),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-ghost', text: '取消', onclick: () => { close(); resolve(null); } }),
        el('button', {
          class: 'btn btn-primary', text: '確定',
          onclick: () => {
            const v = input.value.trim();
            if (!v && !allowEmpty) return;
            close();
            resolve(v);
          },
        }))));
    setTimeout(() => input.focus(), 50);
  });
}

function openSheet(items) {
  return new Promise((resolve) => {
    const sheet = el('div', { class: 'sheet' });
    for (const it of items) {
      sheet.append(el('button', {
        class: it.danger ? 'danger' : '',
        text: it.label,
        onclick: () => { close(); resolve(it.value); },
      }));
    }
    sheet.append(el('button', { class: 'cancel', text: '取消', onclick: () => { close(); resolve(null); } }));
    const close = openModal(sheet);
  });
}

function openListModal(title, rows) {
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: title }),
    el('div', { class: 'modal-body' }, el('div', { class: 'member-list' }, rows)),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '關閉', onclick: () => close() }))));
}

function openViewer(src) {
  $('viewer-img').src = src;
  $('viewer').classList.remove('hidden');
}

/* ---------- WebSocket ---------- */

function connectWs() {
  if (!state.token || state.ws) return;
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  let ws;
  try {
    ws = new WebSocket(url, ['cim.v1', 'token.' + state.token]);
  } catch {
    scheduleReconnect();
    return;
  }
  state.ws = ws;
  ws.onopen = () => {
    state.wsRetry = 0;
    state.wsAlive = true;
    $('conn-banner').classList.add('hidden');
    startHeartbeat();
    resync();
  };
  ws.onmessage = (e) => {
    if (e.data === 'pong') { state.wsAlive = true; return; }
    try { handleWsEvent(JSON.parse(e.data)); } catch {}
  };
  ws.onclose = (ev) => {
    if (ev && ev.code === 4003) {
      forceLogout('你已被管理員移出聊天室');
      return;
    }
    if (state.ws === ws) handleWsDown();
  };
  ws.onerror = () => {
    // token 失效時握手會被拒絕：檢查一次登入狀態
    api('/api/me').catch(() => {});
  };
}

function stopWs() {
  stopHeartbeat();
  if (state.ws) {
    const ws = state.ws;
    state.ws = null;
    try { ws.close(); } catch {}
  }
}

// 連線視為中斷：清狀態、顯示提示、排程重連（不等 close 握手完成）
function handleWsDown() {
  stopHeartbeat();
  state.ws = null;
  if (state.token) {
    $('conn-banner').classList.remove('hidden');
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (!state.token) return;
  const delay = Math.min(30000, 1000 * 2 ** Math.min(state.wsRetry, 5)) + Math.random() * 500;
  state.wsRetry += 1;
  setTimeout(() => { if (state.token && !state.ws) connectWs(); }, delay);
}

function startHeartbeat() {
  stopHeartbeat();
  state.heartbeat = setInterval(() => {
    if (!state.ws || state.ws.readyState !== 1) return;
    if (!state.wsAlive) {
      // 心跳沒回應：立刻視為斷線並重連，不苦等 close 握手
      const dead = state.ws;
      handleWsDown();
      try { dead.close(); } catch {}
      return;
    }
    state.wsAlive = false;
    try { state.ws.send('ping'); } catch {}
  }, 25000);
}

function stopHeartbeat() {
  clearInterval(state.heartbeat);
  state.heartbeat = null;
}

async function resync() {
  try {
    await Promise.all([loadUsers(), loadConvs()]);
    renderFriends();
    if (state.currentConv) await fetchMessages(state.currentConv);
  } catch {}
}

/* ---------- 即時事件 ---------- */

function handleWsEvent(ev) {
  switch (ev.type) {
    case 'message': handleIncomingMessage(ev.message, false); break;
    case 'read': handleRead(ev); break;
    case 'typing': handleTyping(ev); break;
    case 'unsend': handleUnsend(ev); break;
    case 'message-updated': handleMessageUpdated(ev.message); break;
    case 'stickers-changed':
      state.customStickers = null;
      state.stickerMap = new Map();
      if (pickerBuilt && !$('picker').classList.contains('hidden')) ensureStickers().catch(() => {});
      break;
    case 'user': {
      state.users.set(ev.user.id, ev.user);
      if (state.me && ev.user.id === state.me.id) state.me = ev.user;
      renderFriends();
      renderChatList();
      if (state.tab === 'settings') renderSettings();
      const conv = state.currentConv && convById(state.currentConv);
      if (conv) {
        updateChatHeader(conv);
        // 訊息旁的頭像也即時換新（例如對方剛換了大頭貼）
        renderMessagesKeepScroll(state.currentConv);
      }
      break;
    }
    case 'users-changed':
      loadUsers().then(() => {
        renderFriends();
        renderChatList();
        if (state.currentConv) renderMessagesKeepScroll(state.currentConv);
      }).catch(() => {});
      break;
    case 'conversations-changed': scheduleConvReload(); break;
    case 'reaction': handleReaction(ev); break;
    case 'vote': handleVote(ev); break;
    case 'pin': handlePin(ev); break;
    case 'game': handleGame(ev); break;
    case 'shopping-changed': if (state.toolsOpen && state.toolTab === 'shopping') renderShopping(); break;
    case 'events-changed': if (state.toolsOpen && state.toolTab === 'calendar') renderCalendar(); break;
    case 'event-reminder': handleEventReminder(ev); break;
  }
}

function handleMessageUpdated(m) {
  const cache = state.msgCache.get(m.conversationId);
  if (!cache) return;
  const idx = cache.messages.findIndex((x) => x.id === m.id);
  if (idx < 0) return;
  cache.messages[idx] = m;
  if (state.currentConv === m.conversationId) renderMessagesKeepScroll(m.conversationId);
}

function handleIncomingMessage(m, fromSelfPost) {
  const conv = convById(m.conversationId);
  const cache = state.msgCache.get(m.conversationId);

  // 更新訊息快取（避免 POST 回應與 WS 事件重複加入）。
  // 檢視搜尋跳轉的舊訊息時（與最新之間有缺口）不插入，回到最新時整批重抓。
  let added = false;
  if (cache && cache.aroundMode && cache.hasNewer) {
    cache.stale = true;
  } else if (cache) {
    if (!cache.messages.some((x) => x.id === m.id)) {
      cache.messages.push(m);
      cache.messages.sort((a, b) => a.id - b.id);
      added = true;
    }
    if (m.senderId !== 0) {
      const mem = cache.members.find((x) => x.userId === m.senderId);
      if (mem && mem.lastReadId < m.id) mem.lastReadId = m.id;
    }
  }

  // 更新聊天清單
  if (!conv) {
    scheduleConvReload();
  } else {
    conv.lastMessage = m;
    conv.lastActivity = m.createdAt;
    const mem = conv.members.find((x) => x.userId === m.senderId);
    if (mem && mem.lastReadId < m.id) mem.lastReadId = m.id;
    const isOpen = state.currentConv === m.conversationId && document.visibilityState === 'visible';
    if (m.senderId !== state.me.id && !isOpen) conv.unread += 1;
    state.convs.sort((a, b) => b.lastActivity - a.lastActivity);
    renderChatList();
    updateUnreadBadges();
  }

  // 更新開啟中的聊天視窗
  if (state.currentConv === m.conversationId && added) {
    const stick = nearBottom() || m.senderId === state.me.id;
    appendMessage(m.conversationId, m);
    hideTyping();
    if (stick) {
      scrollToBottom(m.senderId !== state.me.id);
    } else {
      setJumpLabel('新訊息');
      $('btn-jump').classList.remove('hidden');
    }
    if (document.visibilityState === 'visible' && m.senderId !== state.me.id) {
      sendReadIfNeeded(m.conversationId);
    }
  }

  // 通知與音效
  if (!fromSelfPost && m.senderId !== state.me.id && m.senderId !== 0) {
    const focused = document.hasFocus() && state.currentConv === m.conversationId;
    if (!focused) {
      if (state.sound) ding();
      showNotification(m, conv);
    }
  }
}

function handleRead(ev) {
  const conv = convById(ev.conversationId);
  if (conv) {
    const mem = conv.members.find((x) => x.userId === ev.userId);
    if (mem && mem.lastReadId < ev.lastReadId) mem.lastReadId = ev.lastReadId;
    if (ev.userId === state.me.id) {
      conv.unread = 0;
      renderChatList();
      updateUnreadBadges();
    }
  }
  const cache = state.msgCache.get(ev.conversationId);
  if (cache) {
    const mem = cache.members.find((x) => x.userId === ev.userId);
    if (mem && mem.lastReadId < ev.lastReadId) mem.lastReadId = ev.lastReadId;
    updateReadLabels(ev.conversationId);
  }
}

let typingHideTimer = null;
function handleTyping(ev) {
  if (state.currentConv !== ev.conversationId || ev.userId === state.me.id) return;
  $('typing').textContent = `${ev.displayName} 正在輸入…`;
  $('typing').classList.remove('hidden');
  clearTimeout(typingHideTimer);
  typingHideTimer = setTimeout(hideTyping, 6000);
}

function hideTyping() {
  clearTimeout(typingHideTimer);
  $('typing').classList.add('hidden');
}

function handleUnsend(ev) {
  const cache = state.msgCache.get(ev.conversationId);
  if (cache) {
    const m = cache.messages.find((x) => x.id === ev.messageId);
    if (m) { m.deleted = true; m.content = ''; }
    if (state.currentConv === ev.conversationId) {
      const s = $('msg-scroll');
      const stick = nearBottom();
      const keep = s.scrollTop;
      renderMessages(ev.conversationId);
      if (stick) scrollToBottom(false); else s.scrollTop = keep;
    }
  }
  const conv = convById(ev.conversationId);
  if (conv && conv.lastMessage && conv.lastMessage.id === ev.messageId) {
    conv.lastMessage.deleted = true;
    conv.lastMessage.content = '';
    renderChatList();
  }
}

/* ---------- 通知與音效 ---------- */

function updateNotifBanner() {
  const show = 'Notification' in window &&
    Notification.permission === 'default' &&
    state.notify && !state.notifDismissed && state.me;
  $('notif-banner').classList.toggle('hidden', !show);
}

async function ensureNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    toast('通知被封鎖了，請到瀏覽器網站設定開啟');
    return false;
  }
  const result = await Notification.requestPermission();
  updateNotifBanner();
  return result === 'granted';
}

function showNotification(m, conv) {
  if (!state.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const sender = userOf(m.senderId);
    let title, bodyText;
    if (state.stealth) {
      title = '提醒';
      bodyText = '有新內容';
    } else {
      title = conv
        ? convTitle(conv) + (conv.type === 'group' && sender ? `｜${sender.displayName}` : '')
        : (sender ? sender.displayName : '新訊息');
      bodyText = msgPreview(m);
    }
    const n = new Notification(title, {
      body: bodyText,
      icon: '/icons/icon-192.png',
      tag: 'cim-conv-' + m.conversationId,
    });
    n.onclick = () => {
      window.focus();
      switchTab('chats');
      openConv(m.conversationId);
      n.close();
    };
  } catch {}
}

let audioCtx = null;
function ding() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    beep(t, 987.77, 0.1);
    beep(t + 0.11, 783.99, 0.22);
  } catch {}
}

function beep(start, freq, dur) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

/* ---------- 外觀（主題／字體／低調模式） ---------- */

// 可選風格：[代號, 名稱, 預覽底色, 預覽主色]
const SKINS = [
  ['techo', '手札', '#F0E9D8', '#B98A5E'],
  ['ocean', '海洋', '#E7EDF2', '#4A8FBF'],
  ['washi', '和紙抹茶', '#EAE6DD', '#5E9C6B'],
  ['classic', '經典綠', '#7b94bd', '#06C755'],
  ['sakura', '櫻花', '#F6ECEA', '#D77A8C'],
  ['sumi', '墨白', '#F1F0EE', '#4A4A46'],
  ['americana', '美式復古', '#F3ECDD', '#C24D3A'],
  ['aizome', '日式藍染', '#ECEBE2', '#35608D'],
  ['techo', '手札', '#F0E7D8', '#9A6B45'],
  ['lavender', '薰衣草', '#EEECF4', '#8B79C1'],
  ['sunset', '夕陽', '#F9EDE2', '#D0703A'],
];

/* ---------- 字型（設定 → 外觀 → 字型） ----------
 * 只套用在本機（localStorage）。字型檔按需下載：
 *  - Google Fonts 字型：選擇器打開時只下載「預覽會用到的那幾十個字」的子集（text= 參數），
 *    真正選用時才載入完整字型
 *  - 自架字型（public/fonts/）：已切成上百個 woff2 小檔，CSS 以 unicode-range 標示，
 *    瀏覽器只抓畫面上真的用到的那幾片，第一次看到的字才下載
 *  - 系統字體完全不需下載
 * 日系手寫字缺少的繁體字（你、說、嗎…）會自動改用芫荽顯示，所以一併載入芫荽當備援。
 */
const TF_SAMPLE = '晚餐吃什麼？記得帶傘喔 Aa 123';
const TF_GROUPS = [
  { key: 'basic', name: '基本', note: null },
  { key: 'hand', name: '手寫・繁體完整', note: '台灣設計、免費開源的手寫字，每個繁體字都有。' },
  { key: 'jp', name: '日系手寫', note: '日本字型，少數繁體字會自動改用「芫荽」顯示。' },
];
const TYPEFACES = [
  // 基本
  { key: 'default', group: 'basic', name: '粉圓＋黑體', desc: '標題圓潤、內文清楚（預設）',
    families: ['Huninn', 'Noto Sans TC:wght@300;400;500;700'], display: '--tf-round', body: '--tf-sans' },
  { key: 'sans', group: 'basic', name: '黑體', desc: '全部用思源黑體，最清楚好讀，長輩推薦',
    families: ['Noto Sans TC:wght@300;400;500;700'], display: '--tf-sans', body: '--tf-sans' },
  { key: 'serif', group: 'basic', name: '宋體', desc: '思源宋體，書卷氣',
    families: ['Noto Serif TC:wght@400;600;700'], display: '--tf-serif', body: '--tf-serif' },
  { key: 'kai', group: 'basic', name: '楷書', desc: '霞鶩文楷，像用毛筆寫的字',
    families: ['LXGW WenKai TC:wght@400;700'], display: '--tf-kai', body: '--tf-kai' },
  { key: 'system', group: 'basic', name: '系統字體', desc: '用手機／電腦內建字體，開啟最快、不需下載',
    families: [], display: '--tf-system', body: '--tf-system' },
  // 手寫（繁體完整）
  { key: 'hand', group: 'hand', name: '芫荽', desc: '輕鬆自然的手寫感，筆畫清楚',
    families: ['Iansui'], display: '--tf-hand', body: '--tf-hand' },
  { key: 'chenyu', group: 'hand', name: '辰宇落雁體', desc: '台灣人氣手寫字，秀氣又工整',
    families: [], css: '/fonts/chenyuluoyan.css', local: 'Chenyuluoyan',
    display: '--tf-chenyu', body: '--tf-chenyu' },
  { key: 'jason', group: 'hand', name: '清松手寫體', desc: '隨性的日常筆跡，像朋友寫的便條',
    families: [], css: '/fonts/jason-handwriting.css', local: 'JasonHandwriting',
    display: '--tf-jason', body: '--tf-jason' },
  { key: 'marker', group: 'hand', name: '霞鶩漫黑', desc: '麥克筆手寫感，筆畫粗一點更好讀',
    families: ['LXGW Marker Gothic'], display: '--tf-marker', body: '--tf-marker' },
  // 日系手寫（缺字以芫荽補）
  { key: 'klee', group: 'jp', name: 'Klee 硬筆', desc: '像用鉛筆寫在筆記本上，整齊',
    families: ['Klee One', 'Iansui'], display: '--tf-klee', body: '--tf-klee' },
  { key: 'yomogi', group: 'jp', name: 'Yomogi 隨筆', desc: '隨手寫的鉛筆字，輕鬆',
    families: ['Yomogi', 'Iansui'], display: '--tf-yomogi', body: '--tf-yomogi' },
  { key: 'hachi', group: 'jp', name: '八丸 POP', desc: '圓圓的可愛少女字',
    families: ['Hachi Maru Pop', 'Iansui'], display: '--tf-hachi', body: '--tf-hachi' },
  { key: 'yuji', group: 'jp', name: 'Yuji 毛筆', desc: '毛筆書法，適合寫祝福',
    families: ['Yuji Syuku', 'Iansui'], display: '--tf-yuji', body: '--tf-yuji' },
];
const typefaceOf = (key) => TYPEFACES.find((t) => t.key === key) || TYPEFACES[0];
const familyName = (f) => f.split(':')[0];
const fontsUrl = (families, text) =>
  'https://fonts.googleapis.com/css2?' +
  families.map((f) => 'family=' + f.replace(/ /g, '+')).join('&') +
  (text ? '&text=' + encodeURIComponent(text) : '') + '&display=swap';

// 已載入完整字型的 family（index.html 靜態載入的預設字型也算）
const loadedFamilies = new Set();
for (const link of document.querySelectorAll('link[href*="fonts.googleapis.com"]')) {
  if (link.href.includes('text=')) continue;
  for (const m of link.href.matchAll(/family=([^&:]+)/g))
    loadedFamilies.add(decodeURIComponent(m[1]).replace(/\+/g, ' '));
}
const fontLinkPromises = new Map();
function addFontLink(href) {
  if (fontLinkPromises.has(href)) return fontLinkPromises.get(href);
  const p = new Promise((resolve, reject) => {
    const link = el('link', { rel: 'stylesheet', href });
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('font css failed'));
    document.head.append(link);
  });
  fontLinkPromises.set(href, p);
  return p;
}

// 這個字型是否還有東西要下載
function typefaceNeedsDownload(tf) {
  if (tf.css && !loadedFamilies.has(tf.local)) return true;
  return tf.families.some((f) => !loadedFamilies.has(familyName(f)));
}

// 載入某個字型的完整檔案；回傳的 Promise 在字型真的可用時才 resolve
async function ensureTypefaceLoaded(key) {
  const tf = typefaceOf(key);
  const jobs = [];
  if (tf.css && !loadedFamilies.has(tf.local)) {
    jobs.push(addFontLink(tf.css).then(() => { loadedFamilies.add(tf.local); }));
  }
  const missing = tf.families.filter((f) => !loadedFamilies.has(familyName(f)));
  if (missing.length) {
    jobs.push(addFontLink(fontsUrl(missing)).then(() => {
      for (const f of missing) loadedFamilies.add(familyName(f));
    }));
  }
  if (!jobs.length) return;
  await Promise.all(jobs);
  if (document.fonts && document.fonts.load) {
    const fams = [...missing.map(familyName), ...(tf.local ? [tf.local] : [])];
    await Promise.all(fams.map((f) => document.fonts.load(`16px "${f}"`, TF_SAMPLE)));
  }
}

// 選擇器預覽：Google 字型只下載預覽字串用到的字元子集；自架字型掛上 CSS 即可（只會抓用到的切片）
let previewFontsRequested = false;
function loadTypefacePreviews() {
  if (previewFontsRequested) return;
  previewFontsRequested = true;
  const fams = [];
  for (const tf of TYPEFACES) {
    if (tf.css) addFontLink(tf.css).then(() => { loadedFamilies.add(tf.local); }).catch(() => {});
    for (const f of tf.families)
      if (!loadedFamilies.has(familyName(f)) && !fams.includes(f)) fams.push(f);
  }
  if (!fams.length) return;
  const text = [...new Set((TYPEFACES.map((t) => t.name).join('') + TF_SAMPLE + '（預設）').split(''))].join('');
  addFontLink(fontsUrl(fams, text)).catch(() => {});
}

// 選擇器頂端的即時預覽：用目前選到的字型畫兩句對話
function buildTypefacePreview(tf) {
  const line = (mine, text) => el('div', { class: 'tfp-line' + (mine ? ' mine' : '') },
    el('div', { class: 'tfp-bubble', text }));
  const box = el('div', { class: 'tf-preview', 'aria-hidden': 'true' },
    el('div', { class: 'tfp-name', text: '家庭群組' }),
    line(false, '晚餐吃什麼？'),
    line(true, '想吃火鍋 🍲 記得帶傘喔'));
  box.style.setProperty('--font-body', `var(${tf.body})`);
  box.style.setProperty('--font-display', `var(${tf.display})`);
  box.style.setProperty('--tf-scale', tf.group === 'basic' ? '1' : '1.08');
  return box;
}

function openTypefacePicker() {
  loadTypefacePreviews();
  const preview = el('div');
  const list = el('div', { class: 'tf-list', role: 'radiogroup', 'aria-label': '字型' });
  const loading = new Set();
  const render = () => {
    preview.textContent = '';
    preview.append(buildTypefacePreview(typefaceOf(state.typeface)));
    list.textContent = '';
    for (const g of TF_GROUPS) {
      list.append(el('div', { class: 'tf-group' },
        el('div', { class: 'tf-group-name', text: g.name }),
        g.note ? el('div', { class: 'tf-group-note', text: g.note }) : null));
      for (const tf of TYPEFACES) {
        if (tf.group !== g.key) continue;
        const active = state.typeface === tf.key;
        const name = el('div', { class: 'tf-name', text: tf.name + (tf.key === 'default' ? '（預設）' : '') });
        const sample = el('div', { class: 'tf-sample', text: TF_SAMPLE });
        name.style.fontFamily = `var(${tf.display})`;
        sample.style.fontFamily = `var(${tf.body})`;
        const tags = [];
        if (!tf.families.length && !tf.css) tags.push('免下載');
        else if (loading.has(tf.key)) tags.push('下載中…');
        list.append(el('button', {
          type: 'button', role: 'radio', 'aria-checked': String(active),
          class: 'tf-row' + (active ? ' active' : '') + (loading.has(tf.key) ? ' loading' : ''),
          onclick: () => choose(tf.key),
        },
          el('div', { class: 'tf-main' }, name, sample,
            el('div', { class: 'tf-desc' }, tf.desc,
              tags.map((t) => el('span', { class: 'tf-tag', text: t })))),
          el('span', { class: 'tf-check' }, icon('check', 14))));
      }
    }
  };
  const choose = async (key) => {
    if (state.typeface === key) return;
    state.typeface = key;
    localStorage.setItem('cim_typeface', key);
    applyAppearance();       // 立即套用（字型下載完成前先以備用字體顯示）
    renderSettings();        // 更新設定頁「字型」欄位的值
    const tf = typefaceOf(key);
    const needsDownload = typefaceNeedsDownload(tf);
    if (needsDownload) loading.add(key);
    render();
    if (!needsDownload) return;
    try {
      await ensureTypefaceLoaded(key);
    } catch {
      toast('字型下載失敗，先用備用字體顯示');
    } finally {
      loading.delete(key);
      if (list.isConnected) render();
    }
  };
  render();
  const close = openModal(el('div', { class: 'modal modal-tf' },
    el('div', { class: 'modal-title', text: '字型' }),
    el('div', { class: 'modal-body' },
      preview,
      el('p', { text: '點一下立即套用，只影響這台裝置。第一次使用某個字型需要下載，可能要等幾秒。' }),
      list),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-primary', text: '完成', onclick: () => close() }))));
}

let systemDarkMq = null;
function applyAppearance() {
  document.body.classList.remove('font-sm', 'font-lg', 'font-xl');
  if (state.fontSize !== 'md') document.body.classList.add('font-' + state.fontSize);
  for (const [key] of SKINS) document.body.classList.remove('skin-' + key);
  if (state.skin !== 'washi') document.body.classList.add('skin-' + state.skin);
  for (const t of TYPEFACES) document.body.classList.remove('typeface-' + t.key);
  if (state.typeface !== 'default') document.body.classList.add('typeface-' + state.typeface);
  ensureTypefaceLoaded(state.typeface).catch(() => {});
  if (!systemDarkMq) {
    systemDarkMq = matchMedia('(prefers-color-scheme: dark)');
    systemDarkMq.addEventListener('change', () => {
      if (state.theme === 'auto') applyAppearance();
    });
  }
  const dark = state.theme === 'dark' || (state.theme === 'auto' && systemDarkMq.matches);
  document.body.classList.toggle('theme-dark', dark);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const panel = getComputedStyle(document.body).getPropertyValue('--panel').trim();
    metaTheme.content = panel || (dark ? '#201B12' : '#F6F1E3');
  }
  const iconLink = document.querySelector('link[rel="icon"]');
  if (iconLink) iconLink.href = state.stealth ? '/doc.svg' : '/icon.svg';
  updateUnreadBadges();
}

function skinRow() {
  const row = el('div', { class: 'skin-row' });
  for (const [key, label, roomBg, accent] of SKINS) {
    const dot = el('span', { class: 'dot' });
    dot.style.background = `linear-gradient(135deg, ${roomBg} 50%, ${accent} 50%)`;
    row.append(el('button', {
      type: 'button',
      class: 'skin-swatch' + (state.skin === key ? ' active' : ''),
      onclick: () => {
        state.skin = key;
        localStorage.setItem('cim_skin', key);
        applyAppearance();
        renderSettings();
      },
    }, dot, label));
  }
  return row;
}

/* ---------- 加入主畫面（PWA 安裝） ---------- */

function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function canInstall() {
  return !isStandalone() && (state.installPrompt !== null || isIOS());
}

function updateInstallUi() {
  const showBanner = canInstall() && !state.installDismissed && matchMedia('(max-width: 700px)').matches;
  $('install-banner').classList.toggle('hidden', !showBanner);
}

async function doInstall() {
  if (state.installPrompt) {
    const ev = state.installPrompt;
    ev.prompt();
    const choice = await ev.userChoice.catch(() => null);
    if (choice && choice.outcome === 'accepted') {
      state.installPrompt = null;
      updateInstallUi();
    }
    return;
  }
  if (isIOS()) {
    const close = openModal(
      el('div', { class: 'modal' },
        el('div', { class: 'modal-title', text: '加入主畫面（iPhone）' }),
        el('div', { class: 'modal-body' },
          el('div', { class: 'install-steps' },
            el('div', { class: 'install-step', text: '1️⃣ 用 Safari 開啟本網頁' }),
            el('div', { class: 'install-step', text: '2️⃣ 點下方中間的「分享」按鈕（方框加向上箭頭）' }),
            el('div', { class: 'install-step', text: '3️⃣ 往下捲，選「加入主畫面」' }),
            el('div', { class: 'install-step', text: '4️⃣ 右上角按「新增」就完成了' }),
            el('div', { class: 'set-note', text: '之後從主畫面的 CHAT 圖示開啟就是全螢幕 App，也才能開啟離線推播（Apple 的規定）。' }))),
        el('div', { class: 'modal-actions' },
          el('button', { class: 'btn btn-primary', text: '知道了', onclick: () => close() }))));
    return;
  }
  toast('請用手機瀏覽器選單裡的「加到主畫面」');
}

function forceLogout(msg) {
  state.token = null;
  localStorage.removeItem('cim_token');
  stopWs();
  closeChat();
  showAuth();
  if (msg) toast(msg);
}

function segControl(options, value, onChange) {
  const seg = el('div', { class: 'seg' });
  for (const [val, label] of options) {
    seg.append(el('button', {
      type: 'button', class: val === value ? 'active' : '', text: label,
      onclick: () => onChange(val),
    }));
  }
  return seg;
}

/* ---------- 回覆／引用 ---------- */

function setReply(m) {
  state.replyTarget = { id: m.id, convId: m.conversationId };
  $('reply-name').textContent = '回覆 ' + nameOf(m.senderId);
  $('reply-text').textContent = msgPreview(m);
  $('reply-bar').classList.remove('hidden');
  if (!isTouch()) $('input').focus();
}

function clearReply() {
  state.replyTarget = null;
  $('reply-bar').classList.add('hidden');
}

function scrollToMessage(mid) {
  const row = document.querySelector(`#msg-list [data-mid="${mid}"]`);
  if (!row) { toast('這則訊息在更早的紀錄裡'); return; }
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  row.classList.remove('flash');
  void row.offsetWidth;
  row.classList.add('flash');
}

// 重新渲染單一訊息（表情回應／投票更新時用，不動整個列表）
function rerenderMessage(convId, mid) {
  if (state.currentConv !== convId) return;
  const conv = convById(convId);
  const cache = state.msgCache.get(convId);
  if (!conv || !cache) return;
  const idx = cache.messages.findIndex((x) => x.id === mid);
  if (idx < 0) return;
  const old = document.querySelector(`#msg-list [data-mid="${mid}"]`);
  if (!old) return;
  const frag = buildMessageNode(conv, cache, cache.messages[idx], idx > 0 ? cache.messages[idx - 1] : null);
  const fresh = frag.querySelector(`[data-mid="${mid}"]`);
  if (fresh) old.replaceWith(fresh);
}

/* ---------- 表情回應、投票、公告（即時事件） ---------- */

function renderReactionChips(m) {
  if (!m.reactions || !m.reactions.length) return null;
  const wrap = el('div', { class: 'reaction-chips' });
  for (const r of m.reactions) {
    const own = r.users.includes(state.me.id);
    wrap.append(el('button', {
      class: 'rchip' + (own ? ' own' : ''), type: 'button',
      title: r.users.map(nameOf).join('、'),
      onclick: () => api(`/api/messages/${m.id}/react`, { method: 'POST', body: { emoji: r.emoji } })
        .catch((e) => toast(e.message)),
    }, `${r.emoji} ${r.users.length}`));
  }
  return wrap;
}

function handleReaction(ev) {
  const cache = state.msgCache.get(ev.conversationId);
  if (!cache) return;
  const m = cache.messages.find((x) => x.id === ev.messageId);
  if (!m) return;
  m.reactions = ev.reactions;
  rerenderMessage(ev.conversationId, ev.messageId);
}

function handleVote(ev) {
  const cache = state.msgCache.get(ev.conversationId);
  if (!cache) return;
  const m = cache.messages.find((x) => x.id === ev.messageId);
  if (!m) return;
  m.votes = ev.votes;
  rerenderMessage(ev.conversationId, ev.messageId);
}

function handlePin(ev) {
  const conv = convById(ev.conversationId);
  if (conv) conv.pinnedMessageId = ev.pinned ? ev.pinned.id : null;
  const cache = state.msgCache.get(ev.conversationId);
  if (cache) cache.pinned = ev.pinned;
  if (state.currentConv === ev.conversationId) updatePinBanner(ev.conversationId);
}

function updatePinBanner(convId) {
  const banner = $('pin-banner');
  const cache = state.msgCache.get(convId);
  const p = cache && cache.pinned;
  if (!p) { banner.classList.add('hidden'); return; }
  $('pin-text').textContent = `${nameOf(p.senderId)}：${msgPreview(p)}`;
  banner.classList.remove('hidden');
}

/* ---------- 語音訊息 ---------- */

const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function stopAudio() {
  if (!state.audio) return;
  try { state.audio.el.pause(); } catch {}
  const { posEl, btnEl } = state.audio;
  if (posEl) posEl.style.width = '0';
  if (btnEl) { btnEl.textContent = ''; btnEl.append(icon('play', 18)); }
  state.audio = null;
}

function buildAudioMsg(m) {
  const playBtn = el('button', { class: 'audio-play', type: 'button', 'aria-label': '播放語音' }, icon('play', 18));
  const pos = el('div', { class: 'apos' });
  const track = el('div', { class: 'audio-track' }, pos);
  const durLabel = el('span', { class: 'audio-dur', text: fmtDur((m.meta && m.meta.duration) || 0) });
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.audio && state.audio.mid === m.id) { stopAudio(); return; }
    stopAudio();
    const a = new Audio(m.content);
    state.audio = { el: a, mid: m.id, posEl: pos, btnEl: playBtn };
    playBtn.textContent = '';
    playBtn.append(icon('pause', 18));
    a.addEventListener('timeupdate', () => {
      const d = a.duration && isFinite(a.duration) ? a.duration : ((m.meta && m.meta.duration) || 1);
      pos.style.width = Math.min(100, (a.currentTime / d) * 100) + '%';
    });
    a.addEventListener('ended', stopAudio);
    a.play().catch(() => { stopAudio(); toast('無法播放語音'); });
  });
  return el('div', { class: 'audio-msg' }, playBtn, track, durLabel);
}

async function startRec() {
  if (!state.currentConv || state.rec) return;
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    toast('這個瀏覽器不支援錄音');
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    toast(err && err.name === 'NotFoundError'
      ? '找不到麥克風裝置'
      : '需要麥克風權限才能錄語音訊息');
    return;
  }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    .find((t) => MediaRecorder.isTypeSupported(t)) || '';
  const recorder = new MediaRecorder(
    stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
  const chunks = [];
  recorder.addEventListener('dataavailable', (e) => { if (e.data.size) chunks.push(e.data); });
  state.rec = { recorder, chunks, seconds: 0, stream, timer: null };
  recorder.start(250);
  $('rec-time').textContent = '0:00';
  $('rec-bar').classList.remove('hidden');
  document.querySelector('.composer').classList.add('hidden');
  hidePicker();
  state.rec.timer = setInterval(() => {
    if (!state.rec) return;
    state.rec.seconds += 1;
    $('rec-time').textContent = fmtDur(state.rec.seconds);
    if (state.rec.seconds >= 60) finishRec(true);
  }, 1000);
}

function teardownRec() {
  if (!state.rec) return;
  clearInterval(state.rec.timer);
  try { state.rec.stream.getTracks().forEach((t) => t.stop()); } catch {}
  state.rec = null;
  $('rec-bar').classList.add('hidden');
  document.querySelector('.composer').classList.remove('hidden');
}

function cancelRec() {
  if (!state.rec) return;
  try { state.rec.recorder.stop(); } catch {}
  teardownRec();
}

function finishRec(send) {
  const rec = state.rec;
  if (!rec) return;
  const seconds = Math.max(1, rec.seconds);
  const convId = state.currentConv;
  rec.recorder.addEventListener('stop', async () => {
    if (!send || !convId) return;
    const blob = new Blob(rec.chunks, { type: rec.recorder.mimeType || 'audio/webm' });
    if (blob.size > 650000) { toast('錄音檔太大，請縮短一點'); return; }
    try {
      const dataUrl = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = () => rej(new Error('讀取錄音失敗'));
        fr.readAsDataURL(blob);
      });
      await postMessage(convId, 'audio', dataUrl, { duration: seconds });
    } catch (e) { toast(e.message); }
  }, { once: true });
  try { rec.recorder.stop(); } catch {}
  teardownRec();
}

/* ---------- 投票 ---------- */

function buildPollCard(m) {
  let poll;
  try { poll = JSON.parse(m.content); } catch { return el('div', { class: 'bubble', text: '[投票]' }); }
  const votes = m.votes || [];
  const total = votes.length;
  const card = el('div', { class: 'poll-card' });
  card.append(el('div', { class: 'poll-q', text: poll.q }));
  poll.options.forEach((label, i) => {
    const count = votes.filter((v) => v.opt === i).length;
    const mineVote = votes.some((v) => v.userId === state.me.id && v.opt === i);
    const fill = el('div', { class: 'fill' });
    fill.style.width = total ? Math.round((count / total) * 100) + '%' : '0';
    card.append(el('button', {
      class: 'poll-opt' + (mineVote ? ' voted' : ''), type: 'button',
      onclick: (e) => {
        e.stopPropagation();
        api(`/api/messages/${m.id}/vote`, { method: 'POST', body: { opt: i } })
          .catch((e2) => toast(e2.message));
      },
    }, fill,
      el('span', { class: 'olabel', text: label }),
      el('span', { class: 'ocount', text: String(count) })));
  });
  card.append(el('div', { class: 'poll-total', text: `${total} 人投票 · 點選項投票，再點一次取消` }));
  return card;
}

function pollCreateModal(conv) {
  const qIn = el('input', { placeholder: '想問大家什麼？（例：晚餐吃什麼）', maxlength: 100 });
  const optWrap = el('div');
  const optInputs = [];
  const addOpt = (val = '') => {
    if (optInputs.length >= 6) return;
    const inp = el('input', { placeholder: `選項 ${optInputs.length + 1}`, maxlength: 30 });
    inp.value = val;
    optInputs.push(inp);
    optWrap.append(inp);
  };
  addOpt(); addOpt();
  const err = el('div', { class: 'modal-error hidden' });
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: '發起投票' }),
    el('div', { class: 'modal-body' }, qIn, optWrap,
      el('button', {
        class: 'btn btn-ghost btn-small', type: 'button', text: '＋ 增加選項',
        onclick: () => addOpt(),
      }),
      err),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '取消', onclick: () => close() }),
      el('button', {
        class: 'btn btn-primary', text: '送出',
        onclick: async () => {
          const q = qIn.value.trim();
          const options = optInputs.map((i2) => i2.value.trim()).filter(Boolean);
          if (!q || options.length < 2) {
            err.textContent = '請輸入問題和至少 2 個選項';
            err.classList.remove('hidden');
            return;
          }
          try {
            await postMessage(conv.id, 'poll', '', { poll: { q, options } });
            close();
          } catch (e2) {
            err.textContent = e2.message;
            err.classList.remove('hidden');
          }
        },
      }))));
}

/* ---------- 今天吃什麼（隨機選餐） ----------
   只列「類別大項」（乾鍋、海鮮粥…），不列單一菜名；可以先勾要不要哪幾類再抽。 */

const FOOD_GROUPS = [
  { key: 'breakfast', label: '早餐', items: [
    '中式早餐店', '西式早餐店', '豆漿店', '燒餅油條', '鹹豆漿', '飯糰', '蛋餅',
    '蘿蔔糕', '清粥小菜', '早午餐', '美式早餐', '三明治', '貝果', '可頌',
    '吐司專賣', '法式吐司', '麥片燕麥', '水果優格', '包子饅頭', '油條'] },
  { key: 'latenight', label: '宵夜', items: [
    '鹹酥雞', '鹽水雞', '雞排', '滷味', '熱滷味', '燒烤攤', '串燒', '烤肉串',
    '熱炒宵夜', '麻辣燙', '關東煮', '夜市小吃', '宵夜粥', '泡麵', '便利商店',
    '炸物拼盤', '烤玉米', '蔥抓餅', '雞蛋糕'] },
  { key: 'snack', label: '台式小吃', items: [
    '滷肉飯', '雞肉飯', '爌肉飯', '排骨飯', '雞腿飯', '控肉飯', '肉燥飯',
    '牛肉麵', '擔仔麵', '陽春麵', '切仔麵', '乾麵', '米粉湯', '米苔目',
    '大腸麵線', '肉羹', '魷魚羹', '花枝羹', '碗粿', '肉圓', '刈包', '蔥油餅',
    '水餃', '鍋貼', '小籠包', '臭豆腐', '蚵仔煎', '蚵仔麵線', '棺材板',
    '筒仔米糕', '油飯', '甜不辣', '黑白切'] },
  { key: 'rice', label: '飯食・便當', items: [
    '便當', '自助餐', '快餐', '燴飯', '炒飯', '咖哩飯', '豬排飯', '雞排飯',
    '焗烤飯', '煲仔飯', '油雞飯', '海南雞飯', '蛋包飯', '牛丼',
    '親子丼', '咖哩烏龍'] },
  { key: 'noodle', label: '麵食', items: [
    '拉麵', '烏龍麵', '蕎麥麵', '義大利麵', '刀削麵', '炸醬麵', '涼麵',
    '炒麵', '炒米粉', '麻醬麵', '酸辣粉', '米線', '河粉', '意麵',
    '鐵板麵', '手工麵疙瘩'] },
  { key: 'hot', label: '鍋物', items: [
    '火鍋', '麻辣鍋', '乾鍋', '涮涮鍋', '個人小火鍋', '石頭火鍋', '酸菜白肉鍋',
    '藥膳鍋', '薑母鴨', '羊肉爐', '藥燉排骨', '壽喜燒', '起司鍋',
    '泰式酸辣鍋', '牛奶鍋', '酸菜魚', '海鮮鍋'] },
  { key: 'soup', label: '粥品・湯品', items: [
    '海鮮粥', '廣東粥', '地瓜粥', '皮蛋瘦肉粥', '白粥配菜', '雞湯', '魚湯',
    '牛肉湯', '藥燉湯品', '四神湯', '貢丸湯', '味噌湯定食', '燉湯專賣'] },
  { key: 'taiwanese', label: '台菜・合菜', items: [
    '台菜餐廳', '熱炒快炒', '客家菜', '眷村菜', '桌菜合菜', '辦桌菜',
    '土雞城', '甕仔雞', '三杯料理', '古早味餐廳'] },
  { key: 'chinese', label: '中式各省', items: [
    '川菜', '粵菜', '江浙菜', '上海菜', '湘菜', '北平菜', '東北菜', '雲南料理',
    '新疆料理', '北方麵食', '烤鴨', '獅子頭', '麻辣香鍋', '水煮魚', '宮保料理'] },
  { key: 'hk', label: '港式', items: [
    '港式茶餐廳', '港式飲茶', '燒臘', '叉燒飯', '港式蘿蔔糕', '腸粉', '雲吞麵',
    '煲湯', '菠蘿油', '絲襪奶茶簡餐'] },
  { key: 'jp', label: '日式', items: [
    '壽司', '迴轉壽司', '生魚片', '丼飯', '日式咖哩', '炸豬排', '天婦羅',
    '燒肉', '居酒屋', '鐵板燒', '日式定食', '大阪燒', '章魚燒',
    '日式火鍋', '鰻魚飯', '日式家庭料理'] },
  { key: 'kr', label: '韓式', items: [
    '韓式烤肉', '韓式炸雞', '石鍋拌飯', '辣炒年糕', '韓式炸醬麵', '韓式湯飯',
    '部隊鍋', '韓式定食', '泡菜鍋', '韓式小吃'] },
  { key: 'sea', label: '東南亞', items: [
    '泰式料理', '泰式打拋飯', '越南河粉', '越式法國麵包', '越式料理',
    '印尼料理', '馬來料理', '新加坡叻沙', '南洋咖哩', '海南料理', '緬甸料理'] },
  { key: 'india', label: '印度・中東', items: [
    '印度咖哩', '印度烤餅', '坦都里烤雞', '中東烤肉', '沙威瑪', '土耳其料理',
    '印度素食', '中東拌盤'] },
  { key: 'us', label: '美式', items: [
    '美式漢堡', '美式餐廳', '炸雞', '熱狗堡', '潛艇堡', '美式烤肉',
    '肋排', '美式三明治', '美式家庭餐廳', '雞翅'] },
  { key: 'eu', label: '義式・歐陸', items: [
    '義式料理', '披薩', '燉飯', '焗烤', '法式料理', '法式小館', '西班牙料理',
    '德式豬腳', '地中海料理', '希臘料理', '歐式自助餐'] },
  { key: 'latin', label: '墨西哥・中南美', items: [
    '墨西哥捲餅', '塔可', '墨西哥料理', '巴西烤肉', '祕魯料理', '拉丁風味餐'] },
  { key: 'steak', label: '牛排・排餐', items: [
    '牛排', '平價牛排', '夜市牛排', '排餐', '豬排餐', '雞排餐', '海陸大餐',
    '鐵板排餐'] },
  { key: 'sea_food', label: '海鮮', items: [
    '海產店', '生魚片丼', '烤魚', '清蒸海鮮', '螃蟹料理', '蝦料理', '生蠔',
    '海鮮燒烤', '龍蝦餐', '漁港小吃'] },
  { key: 'bbq', label: '燒烤・BBQ', items: [
    '中式燒烤', '碳烤', '烤肉吃到飽', '美式 BBQ', '烤全雞', '鹽烤台式'] },
  { key: 'veg', label: '素食・蔬食', items: [
    '素食自助餐', '蔬食料理', '素食麵店', '素食火鍋', '蔬食早午餐', '純素餐廳',
    '養生餐', '素食便當'] },
  { key: 'light', label: '輕食・健康', items: [
    '沙拉', '健康餐盒', '舒肥餐', '水煮餐', '低卡便當', '減脂餐', '生酮餐',
    '高蛋白餐', '穀物碗', '希臘優格餐'] },
  { key: 'fast', label: '速食・炸物', items: [
    '速食店', '連鎖速食', '炸物專賣', '薯條漢堡', '熱狗堡攤',
    '炸雞塊', '熱壓吐司'] },
  { key: 'sweet', label: '甜點・下午茶', items: [
    '甜點店', '蛋糕', '鬆餅', '可麗餅', '冰淇淋', '剉冰', '豆花', '甜湯',
    '燒仙草', '紅豆湯', '蛋塔', '泡芙', '布丁', '銅鑼燒', '下午茶套餐'] },
  { key: 'drink', label: '飲料・咖啡', items: [
    '手搖飲', '珍珠奶茶', '咖啡廳', '咖啡簡餐', '果汁', '冰沙', '氣泡飲',
    '茶館', '豆漿米漿', '調酒小酌'] },
];

function foodGroupKeys() {
  if (!state.foodGroups) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('cim_food_groups') || 'null'); } catch {}
    const all = FOOD_GROUPS.map((g) => g.key);
    const keep = Array.isArray(saved) ? saved.filter((k) => all.includes(k)) : [];
    state.foodGroups = new Set(keep.length ? keep : all);
  }
  return state.foodGroups;
}

function saveFoodGroups() {
  try { localStorage.setItem('cim_food_groups', JSON.stringify([...foodGroupKeys()])); } catch {}
}

function foodPool() {
  const on = foodGroupKeys();
  const pool = FOOD_GROUPS.filter((g) => on.has(g.key)).flatMap((g) => g.items);
  return pool.length ? pool : FOOD_GROUPS.flatMap((g) => g.items);
}

const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 抽 n 個不重複的類別（不夠就有幾個給幾個）
function pickMany(arr, n) {
  const rest = arr.slice();
  const out = [];
  while (out.length < n && rest.length) out.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  return out;
}

function foodPickModal(conv) {
  let current = null;
  let timer = null;
  const result = el('div', { class: 'food-result', text: '？' });
  const note = el('div', { class: 'food-note', text: '按下面的按鈕，讓它幫你決定' });
  const chips = el('div', { class: 'food-chips' });
  const poolNote = el('div', { class: 'food-poolnote' });
  const setAll = (all) => {
    const on = foodGroupKeys();
    on.clear();
    if (all) for (const g of FOOD_GROUPS) on.add(g.key);
    saveFoodGroups();
    renderChips();
  };

  const renderChips = () => {
    const on = foodGroupKeys();
    chips.textContent = '';
    for (const g of FOOD_GROUPS) {
      chips.append(el('button', {
        class: 'food-chip' + (on.has(g.key) ? ' on' : ''), type: 'button',
        onclick: () => {
          if (on.has(g.key)) on.delete(g.key); else on.add(g.key);
          saveFoodGroups();
          renderChips();
        },
      }, `${g.label} ${g.items.length}`));
    }
    poolNote.textContent = `目前會從 ${foodPool().length} 個選項裡抽` +
      (on.size ? '' : '（沒勾＝全部都抽）');
  };
  renderChips();

  const draw = () => {
    const pool = foodPool();
    clearInterval(timer);
    result.classList.add('spinning');
    let ticks = 0;
    timer = setInterval(() => {
      result.textContent = pickOne(pool);
      if (++ticks < 14) return;
      clearInterval(timer);
      timer = null;
      current = pickOne(pool);
      result.textContent = current;
      result.classList.remove('spinning');
      result.classList.remove('pop');
      void result.offsetWidth;
      result.classList.add('pop');
      note.textContent = `從 ${pool.length} 個選項裡抽中的 — 不喜歡就再抽一次`;
      shareBtn.disabled = false;
    }, 65);
  };

  const shareBtn = el('button', {
    class: 'btn btn-primary', text: '分享到聊天室', disabled: true,
    onclick: async () => {
      if (!current) return;
      try {
        await postMessage(conv.id, 'text', `🍽️ 今天吃「${current}」！（隨機抽的）`);
        close();
      } catch (e) { toast(e.message); }
    },
  });

  const close = openModal(el('div', { class: 'modal modal-food' },
    el('div', { class: 'modal-title', text: '🍽️ 今天吃什麼' }),
    el('div', { class: 'modal-body' },
      result, note,
      el('div', { class: 'food-acts' },
        el('button', { class: 'btn btn-primary btn-block', text: '隨機抽一個！', onclick: draw }),
        el('button', {
          class: 'btn btn-ghost btn-block', text: '抽 3 個給大家投票',
          onclick: async () => {
            const options = pickMany(foodPool(), 3);
            if (options.length < 2) return;
            try {
              await postMessage(conv.id, 'poll', '', { poll: { q: '今天吃什麼？', options } });
              close();
            } catch (e) { toast(e.message); }
          },
        })),
      el('div', { class: 'food-sec' },
        el('span', { class: 'grow', text: '要抽哪幾類（點一下開關）' }),
        el('button', { class: 'food-all', type: 'button', text: '全選', onclick: () => setAll(true) }),
        el('button', { class: 'food-all', type: 'button', text: '全不選', onclick: () => setAll(false) })),
      poolNote,
      chips),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '關閉', onclick: () => close() }),
      shareBtn)),
    () => clearInterval(timer));

  draw();
}

/* ---------- 小遊戲 ----------
   盤面由伺服器保管、動作由伺服器判定，所以聊天室裡每個人看到的都是同一盤。
   三種玩法：對戰（兩個座位輪流）、一起玩（輪流接手操作）、大家一起（誰都能出手）。
   會藏資訊的遊戲（記憶翻翻樂的牌面、踩地雷的雷區、猜數字的答案）由伺服器過濾後才送來。 */

const GAME_DEFS = {
  ooxx: {
    title: '圈圈叉叉', emoji: '⭕', desc: '3×3 連成一線就贏', tag: '兩人對戰',
    marks: ['⭕', '❌'],
  },
  connect4: {
    title: '四子棋', emoji: '🔴', desc: '投進直行，先連成四顆就贏', tag: '兩人對戰',
    marks: ['🔴', '🟡'],
  },
  gomoku: {
    title: '五子棋', emoji: '⚫', desc: '13 路棋盤，先連成五顆就贏', tag: '兩人對戰',
    marks: ['⚫', '⚪'],
  },
  reversi: {
    title: '黑白棋', emoji: '🔳', desc: '夾住就翻面，最後子多的贏', tag: '兩人對戰',
    marks: ['⚫', '⚪'],
  },
  memory: {
    title: '記憶翻翻樂', emoji: '🃏', desc: '翻兩張配對，配到就再翻一次', tag: '兩人對戰',
    marks: ['🟣', '🟠'],
  },
  '2048': {
    title: '2048', emoji: '🔢', desc: '滑動合併數字，一起挑戰高分', tag: '輪流接手',
  },
  mine: {
    title: '踩地雷', emoji: '💣', desc: '9×9 十顆雷，一起把安全格翻完', tag: '輪流接手',
  },
  guess: {
    title: '猜數字 1A2B', emoji: '🔡', desc: '猜 4 位不重複數字，誰先猜中誰贏', tag: '大家一起猜',
  },
};

// 對戰型遊戲在選單裡排前面，合作／開放型排後面
const GAME_GROUPS = [
  { label: '兩人對戰（兩個座位輪流）', kinds: ['ooxx', 'connect4', 'gomoku', 'reversi', 'memory'] },
  { label: '大家一起玩', kinds: ['2048', 'mine', 'guess'] },
];

// 伺服器早期版本只存 size（正方形盤），新版存 cols／rows
const gameDims = (g) => ({ cols: g.cols || g.size, rows: g.rows || g.size });

function gameKindOf(m) {
  if (m.game && m.game.kind) return m.game.kind;
  try { return JSON.parse(m.content).kind; } catch { return null; }
}

function gameTitle(m) {
  const def = GAME_DEFS[gameKindOf(m)];
  return def ? def.title : '小遊戲';
}

function gameAct(m, body) {
  return api(`/api/messages/${m.id}/game`, { method: 'POST', body })
    .catch((e) => toast(e.message));
}

/* ----- 狀態文字 ----- */

function versusStatus(g) {
  if (g.winner === 'draw') return { text: '平手，再來一局！', hot: false };
  if (g.winner !== null && g.winner !== undefined) {
    const w = g.seats[g.winner];
    return { text: w === state.me.id ? '你贏了 🎉' : `${nameOf(w)} 獲勝 🎉`, hot: true };
  }
  if (g.seats.some((x) => x === null)) return { text: '等一位對手加入…', hot: false };
  const who = g.seats[g.turn];
  const mine = who === state.me.id;
  const pass = g.kind === 'reversi' && g.passed ? '（對方沒地方下，跳過）' : '';
  return { text: (mine ? '輪到你了' : `輪到 ${nameOf(who)}`) + pass, hot: mine };
}

function coopStatus(g) {
  if (g.kind === 'mine' && g.over)
    return { text: g.won ? `全部排完，${g.time || 0} 秒 🎉` : '踩到地雷了 💥', hot: g.won };
  if (g.over) return { text: `結束了，這局 ${g.score} 分`, hot: false };
  if (!g.holder) return { text: '還沒人接手 — 按「我要玩」開始', hot: true };
  return g.holder === state.me.id
    ? { text: '現在由你操作', hot: true }
    : { text: `現在由 ${nameOf(g.holder)} 操作，請等他換手`, hot: false };
}

function openStatus(g) {
  if (g.winner)
    return {
      text: (g.winner === state.me.id ? '你猜中了 🎉' : `${nameOf(g.winner)} 猜中了 🎉`) +
        `　答案 ${g.secret || ''}`,
      hot: true,
    };
  return { text: `已經猜了 ${g.guesses.length} 次 — 大家都能猜`, hot: false };
}

const gameStatus = (g) =>
  g.mode === 'versus' ? versusStatus(g) : g.mode === 'coop' ? coopStatus(g) : openStatus(g);

/* ----- 座位與盤面 ----- */

// 明確告訴 grid 有幾欄幾列：列高平均分配，沒有內容的格子（例如 2048 的空格）
// 才不會被壓扁成一條
function sizeBoard(board, g) {
  const { cols, rows } = gameDims(g);
  board.style.setProperty('--n', cols);
  board.style.setProperty('--rows', rows);
}

// 對戰型的兩張座位牌：空位可以直接點進去坐
function seatPills(m, g) {
  const def = GAME_DEFS[g.kind];
  const wrap = el('div', { class: 'g-seats' });
  g.seats.forEach((uid, i) => {
    const active = g.winner === null && !g.seats.some((x) => x === null) && g.turn === i;
    // 黑白棋看目前子數、記憶翻翻樂看收到幾對，其他看累積勝場
    const num = g.kind === 'reversi' ? (g.counts || [0, 0])[i]
      : g.kind === 'memory' ? (g.pairs || [0, 0])[i]
        : g.score[i];
    wrap.append(el('button', {
      class: 'g-seat' + (active ? ' turn' : '') + (uid === state.me.id ? ' me' : '') +
        (g.winner === i ? ' win' : ''),
      type: 'button',
      onclick: (e) => { e.stopPropagation(); if (!uid) gameAct(m, { action: 'join' }); },
    },
      el('span', { class: 'g-mark', text: def.marks[i] }),
      el('span', { class: 'g-seat-name', text: uid ? nameOf(uid) : '空位（點我加入）' }),
      el('span', { class: 'g-seat-score', text: String(num) })));
  });
  return wrap;
}

// 圈圈叉叉、五子棋：點格子落子
function lineBoard(m, g, interactive) {
  const def = GAME_DEFS[g.kind];
  const { cols } = gameDims(g);
  const board = el('div', { class: 'g-board ' + g.kind });
  sizeBoard(board, g);
  const mySeat = g.seats.indexOf(state.me.id);
  const myTurn = interactive && g.winner === null && mySeat >= 0 && g.turn === mySeat &&
    !g.seats.some((x) => x === null);
  g.board.forEach((v, i) => {
    const cell = el('button', {
      class: 'g-cell' + (g.line.includes(i) ? ' win' : '') + (g.last === i ? ' last' : ''),
      type: 'button', 'aria-label': `第 ${Math.floor(i / cols) + 1} 列第 ${i % cols + 1} 格`,
    });
    if (v) {
      cell.append(g.kind === 'ooxx'
        ? el('span', { class: 'g-mark', text: def.marks[v - 1] })
        : el('span', { class: 'g-stone s' + v }));
    }
    if (myTurn && !v) {
      cell.classList.add('open');
      cell.addEventListener('click', (e) => { e.stopPropagation(); gameAct(m, { action: 'move', i }); });
    } else {
      cell.disabled = true;
    }
    board.append(cell);
  });
  return board;
}

// 四子棋：點哪一直行，棋子就掉到那一行最底下
function connect4Board(m, g, interactive) {
  const { cols } = gameDims(g);
  const board = el('div', { class: 'g-board connect4' });
  sizeBoard(board, g);
  const mySeat = g.seats.indexOf(state.me.id);
  const myTurn = interactive && g.winner === null && mySeat >= 0 && g.turn === mySeat &&
    !g.seats.some((x) => x === null);
  g.board.forEach((v, i) => {
    const col = i % cols;
    const full = g.board[col] !== 0; // 該行最上面一格有子就是滿了
    const cell = el('button', {
      class: 'g-hole' + (v ? ' p' + v : '') + (g.line.includes(i) ? ' win' : '') +
        (g.last === i ? ' last' : ''),
      type: 'button', 'aria-label': `第 ${col + 1} 行`,
    });
    if (myTurn && !full) {
      cell.addEventListener('click', (e) => { e.stopPropagation(); gameAct(m, { action: 'move', col }); });
    } else {
      cell.disabled = true;
    }
    board.append(cell);
  });
  return board;
}

// 黑白棋：輪到自己時，合法的落點會標出來
function reversiBoard(m, g, interactive) {
  const { cols } = gameDims(g);
  const board = el('div', { class: 'g-board reversi' });
  sizeBoard(board, g);
  const mySeat = g.seats.indexOf(state.me.id);
  const myTurn = interactive && g.winner === null && mySeat >= 0 && g.turn === mySeat &&
    !g.seats.some((x) => x === null);
  const legal = new Set(myTurn ? (g.legal || []) : []);
  g.board.forEach((v, i) => {
    const cell = el('button', {
      class: 'g-cell' + (g.last === i ? ' last' : '') + (legal.has(i) ? ' hint' : ''),
      type: 'button', 'aria-label': `第 ${Math.floor(i / cols) + 1} 列第 ${i % cols + 1} 格`,
    });
    if (v) cell.append(el('span', { class: 'g-stone s' + v + (g.line.includes(i) ? ' flip' : '') }));
    if (legal.has(i)) {
      cell.addEventListener('click', (e) => { e.stopPropagation(); gameAct(m, { action: 'move', i }); });
    } else {
      cell.disabled = true;
    }
    board.append(cell);
  });
  return board;
}

// 記憶翻翻樂：蓋著的牌伺服器不會送牌面過來，所以看不到也偷不到
function memoryBoard(m, g, interactive) {
  const { cols } = gameDims(g);
  const board = el('div', { class: 'g-board memory' });
  sizeBoard(board, g);
  const mySeat = g.seats.indexOf(state.me.id);
  const myTurn = interactive && g.winner === null && mySeat >= 0 && g.turn === mySeat &&
    !g.seats.some((x) => x === null);
  const flipped = new Set(g.flipped || []);
  g.cards.forEach((face, i) => {
    const owned = g.owner[i];
    const open = owned || flipped.has(i);
    const cell = el('button', {
      class: 'g-card' + (open ? ' open' : '') + (owned ? ' owned o' + owned : ''),
      type: 'button', 'aria-label': open ? `${face}` : '蓋著的牌',
    }, el('span', { class: 'g-face', text: open ? (face || '⬜') : '' }));
    if (myTurn && !open) {
      cell.addEventListener('click', (e) => { e.stopPropagation(); gameAct(m, { action: 'move', i }); });
    } else {
      cell.disabled = true;
    }
    board.append(cell);
  });
  return board;
}

// 2048
function tilesBoard(m, g, interactive) {
  const { cols } = gameDims(g);
  const board = el('div', { class: 'g-board g2048' });
  sizeBoard(board, g);
  for (const v of g.tiles) {
    board.append(el('div', {
      class: 'g-tile' + (v ? ' v' + (v > 2048 ? 'max' : v) : ' empty'),
      text: v ? String(v) : '',
    }));
  }
  if (interactive && g.holder === state.me.id && !g.over)
    bindSwipe(board, (dir) => gameAct(m, { action: 'move', dir }));
  return board;
}

// 踩地雷：插旗模式打開時，點格子是插旗而不是翻開
const MINE_COLORS = ['', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];

function mineBoard(m, g, interactive, flagMode) {
  const { cols } = gameDims(g);
  const board = el('div', { class: 'g-board sweeper' });
  sizeBoard(board, g);
  const canPlay = interactive && g.holder === state.me.id && !g.over;
  (g.view || []).forEach((v, i) => {
    const hidden = v === null || v === 'F';
    const cell = el('button', {
      class: 'g-mcell' + (hidden ? ' covered' : ' open') +
        (typeof v === 'number' && v > 0 ? ' ' + MINE_COLORS[v] : '') +
        (v === 'X' ? ' boom' : ''),
      type: 'button', 'aria-label': `第 ${Math.floor(i / cols) + 1} 列第 ${i % cols + 1} 格`,
    });
    if (v === 'F') cell.textContent = '🚩';
    else if (v === 'M' || v === 'X') cell.textContent = '💣';
    else if (typeof v === 'number' && v > 0) cell.textContent = String(v);
    if (canPlay && hidden) {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        gameAct(m, { action: 'move', i, flag: flagMode });
      });
    } else {
      cell.disabled = true;
    }
    board.append(cell);
  });
  return board;
}

// 猜數字：誰都能猜，下面列出猜過的紀錄
function guessPanel(m, g, interactive) {
  const wrap = el('div', { class: 'g-guess' });
  const list = el('div', { class: 'g-glist' });
  const rows = g.guesses.slice(-8);
  if (!rows.length) {
    list.append(el('div', { class: 'g-ghint', text: `我出了一組 ${g.len} 位不重複的數字，猜猜看！` }));
  }
  for (const r of rows) {
    list.append(el('div', { class: 'g-grow' + (r.a === g.len ? ' hit' : '') },
      el('span', { class: 'g-gnum', text: r.guess }),
      el('span', { class: 'g-gab', text: `${r.a}A${r.b}B` }),
      el('span', { class: 'g-gwho', text: nameOf(r.userId) })));
  }
  wrap.append(list);
  setTimeout(() => { list.scrollTop = list.scrollHeight; }, 0); // 固定高度的紀錄區，永遠看最新一筆
  if (g.guesses.length > rows.length)
    wrap.append(el('div', { class: 'g-foot', text: `（只顯示最近 ${rows.length} 次，共猜了 ${g.guesses.length} 次）` }));
  if (!interactive || g.winner) return wrap;

  const input = el('input', {
    class: 'g-ginput', inputmode: 'numeric', maxlength: g.len,
    placeholder: '0'.repeat(g.len).slice(0, g.len), 'aria-label': '輸入你猜的數字',
  });
  const send = () => {
    const guess = input.value.trim();
    if (guess.length !== g.len) return toast(`請輸入 ${g.len} 個數字`);
    if (new Set(guess).size !== g.len) return toast('數字不能重複');
    input.value = '';
    gameAct(m, { action: 'move', guess });
  };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); send(); }
  });
  input.addEventListener('click', (e) => e.stopPropagation());
  wrap.append(el('div', { class: 'g-gform' }, input,
    el('button', {
      class: 'btn btn-primary btn-small', type: 'button', text: '猜！',
      onclick: (e) => { e.stopPropagation(); send(); },
    })));
  return wrap;
}

// 觸控滑動：位移超過 24px 就當成一次方向操作
function bindSwipe(node, onDir) {
  let sx = 0;
  let sy = 0;
  node.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    sx = t.clientX;
    sy = t.clientY;
  }, { passive: true });
  node.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });
}

function dpad(m, g) {
  const enabled = g.holder === state.me.id && !g.over;
  const btn = (dir, label) => {
    const b = el('button', {
      class: 'g-dir', type: 'button', 'aria-label': label,
      onclick: (e) => { e.stopPropagation(); gameAct(m, { action: 'move', dir }); },
    }, label);
    b.disabled = !enabled;
    return b;
  };
  return el('div', { class: 'g-dpad' },
    el('div', {}, btn('up', '↑')),
    el('div', {}, btn('left', '←'), btn('down', '↓'), btn('right', '→')));
}

function gameButton(label, onclick, cls) {
  return el('button', {
    class: 'btn btn-small ' + (cls || 'btn-ghost'), type: 'button',
    onclick: (e) => { e.stopPropagation(); onclick(); },
  }, label);
}

// 踩地雷的插旗模式：盤面每次收到更新都會重畫，開關狀態要記在卡片外面
const flagModes = new Map();

function gameBoard(m, g, interactive, opts) {
  if (g.kind === 'connect4') return connect4Board(m, g, interactive);
  if (g.kind === 'reversi') return reversiBoard(m, g, interactive);
  if (g.kind === 'memory') return memoryBoard(m, g, interactive);
  if (g.kind === 'mine') return mineBoard(m, g, interactive, opts.flagMode);
  if (g.kind === 'guess') return guessPanel(m, g, interactive);
  if (g.mode === 'coop') return tilesBoard(m, g, interactive);
  return lineBoard(m, g, interactive);
}

// 每種遊戲的小計分列（2048 分數、踩地雷剩幾顆雷…）
function gameScores(g) {
  if (g.kind === '2048') {
    return [['分數', g.score], ['最佳', g.best || 0]];
  }
  if (g.kind === 'mine') {
    const flags = (g.view || []).filter((v) => v === 'F').length;
    return [['剩餘雷數', Math.max(0, g.mines - flags)], ['最佳秒數', g.best || '—']];
  }
  return null;
}

// 聊天室裡只放一張小卡：寫清楚是誰開的、現在什麼狀況，按「開啟遊戲」才進去玩
function buildGameChip(m) {
  const g = m.game;
  const def = GAME_DEFS[gameKindOf(m)];
  if (!g || !def) return el('div', { class: 'bubble', text: '[小遊戲]' });
  const st = gameStatus(g);
  const chip = el('button', {
    class: 'game-chip', type: 'button',
    onclick: (e) => { e.stopPropagation(); openGameModal(m); },
  },
    el('span', { class: 'gc-emoji', text: def.emoji }),
    el('span', { class: 'gc-main' },
      el('span', { class: 'gc-title', text: def.title }),
      el('span', { class: 'gc-status' + (st.hot ? ' hot' : ''), text: st.text })),
    el('span', { class: 'gc-go', text: '開啟' }));
  chip.addEventListener('contextmenu', (e) => e.stopPropagation());
  return chip;
}

function buildGameCard(m) {
  const g = m.game;
  const kind = gameKindOf(m);
  const def = GAME_DEFS[kind];
  if (!g || !def) return el('div', { class: 'bubble', text: '[小遊戲]' });

  const card = el('div', { class: 'game-card big' });
  // 遊戲卡自己吃掉長按／右鍵，免得下棋時跳出訊息選單
  card.addEventListener('contextmenu', (e) => e.stopPropagation());
  card.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

  const versus = g.mode === 'versus';
  const st = gameStatus(g);
  const rightLabel = versus ? `第 ${g.round} 局`
    : g.kind === 'guess' ? `第 ${g.round} 題` : `${g.moves} 步`;
  card.append(el('div', { class: 'g-head' },
    el('span', { class: 'g-title', text: `${def.emoji} ${def.title}` }),
    el('span', { class: 'g-round', text: rightLabel })));

  if (versus) card.append(seatPills(m, g));
  const scores = gameScores(g);
  if (scores) {
    card.append(el('div', { class: 'g-scores' }, scores.map(([label, val]) =>
      el('div', { class: 'g-score' }, el('b', { text: String(val) }), el('span', { text: label })))));
  }

  card.append(el('div', { class: 'g-status' + (st.hot ? ' hot' : ''), text: st.text }));

  const interactive = true; // 盤面只出現在遊戲視窗裡，一律可以操作
  const boardWrap = el('div', { class: 'g-boardwrap' });
  const drawBoard = () => {
    boardWrap.textContent = '';
    boardWrap.append(gameBoard(m, g, interactive, { flagMode: flagModes.get(m.id) === true }));
  };
  drawBoard();
  card.append(boardWrap);

  if (g.kind === 'mine' && interactive && g.holder === state.me.id && !g.over) {
    const label = (on) => (on ? '🚩 插旗模式（開）' : '🚩 插旗模式');
    const on = flagModes.get(m.id) === true;
    const flagBtn = el('button', {
      class: 'g-flag' + (on ? ' on' : ''), type: 'button', 'aria-pressed': String(on),
    }, label(on));
    flagBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = flagModes.get(m.id) !== true;
      flagModes.set(m.id, next); // 記在卡片外面，插完旗重畫也不會被關掉
      flagBtn.classList.toggle('on', next);
      flagBtn.setAttribute('aria-pressed', String(next));
      flagBtn.textContent = label(next);
      drawBoard();
    });
    card.append(flagBtn);
  }
  if (g.kind === '2048') card.append(dpad(m, g));

  const acts = el('div', { class: 'g-acts' });
  if (versus) {
    const mySeat = g.seats.indexOf(state.me.id);
    if (mySeat < 0 && g.seats.some((x) => x === null))
      acts.append(gameButton('加入對戰', () => gameAct(m, { action: 'join' }), 'btn-primary'));
    if (g.winner !== null)
      acts.append(gameButton('再來一局', () => gameAct(m, { action: 'restart' }), 'btn-primary'));
    else if (mySeat >= 0 && g.moves > 0)
      acts.append(gameButton('重新開始', async () => {
        if (await confirmModal('重新開始', '這一局會全部清掉重來，確定嗎？')) gameAct(m, { action: 'restart' });
      }));
    if (mySeat >= 0 && g.winner === null)
      acts.append(gameButton('離開座位', () => gameAct(m, { action: 'leave' })));
  } else if (g.mode === 'coop') {
    if (g.holder === state.me.id) acts.append(gameButton('換人玩', () => gameAct(m, { action: 'release' })));
    else acts.append(gameButton('我要玩', () => gameAct(m, { action: 'claim' }), 'btn-primary'));
    acts.append(gameButton(g.over ? '再來一局' : '重新開始', async () => {
      if (g.over || await confirmModal('重新開始', '目前的進度會歸零（最佳紀錄會留著），確定嗎？'))
        gameAct(m, { action: 'restart' });
    }, g.over ? 'btn-primary' : 'btn-ghost'));
  } else {
    acts.append(gameButton('換一題',
      async () => {
        if (g.winner || await confirmModal('換一題', '現在這題會作廢，重新出一組數字，確定嗎？'))
          gameAct(m, { action: 'restart' });
      }, g.winner ? 'btn-primary' : 'btn-ghost'));
  }
  card.append(acts);

  const hint = gameHint(g);
  if (hint) card.append(el('div', { class: 'g-foot', text: hint }));
  return card;
}

function gameHint(g) {
  if (g.kind === 'gomoku') return `先連成五顆就贏 · 已下 ${g.moves} 手`;
  if (g.kind === 'connect4') return '點任一直行投下棋子，先連成四顆（橫、直、斜）就贏';
  if (g.kind === 'reversi') return '只能下在夾得到對方棋子的地方；沒地方下就自動跳過';
  if (g.kind === 'memory') return '配對成功可以再翻一次；翻錯的兩張會留到下次翻牌才蓋回去';
  if (g.kind === 'mine') return '數字代表周圍有幾顆雷；懷疑有雷就開「插旗模式」標起來';
  if (g.kind === 'guess') return 'A＝數字和位置都對，B＝數字對但位置不對';
  if (g.mode === 'coop') {
    const who = Object.entries(g.contrib || {})
      .map(([uid, n]) => `${nameOf(Number(uid))} ${n} 步`)
      .join('、');
    return who ? '出手：' + who : '用方向鍵、按鈕或滑動都可以操作';
  }
  return '';
}

function findMessage(convId, mid) {
  const cache = state.msgCache.get(convId);
  return cache ? cache.messages.find((x) => x.id === mid) || null : null;
}

// 放大遊玩：彈窗裡的盤面會跟著 WebSocket 事件即時更新
function openGameModal(m) {
  const convId = m.conversationId;
  const def = GAME_DEFS[gameKindOf(m)] || { title: '小遊戲', emoji: '🎮' };
  const body = el('div', { class: 'modal-body game-modal-body' });
  const render = () => {
    const cur = findMessage(convId, m.id) || m;
    const focused = document.activeElement && document.activeElement.classList.contains('g-ginput');
    const typed = focused ? document.activeElement.value : null;
    const top = body.scrollTop;
    body.textContent = '';
    body.append(buildGameCard(cur));
    body.scrollTop = top; // 更新盤面不把畫面彈回最上面
    if (typed !== null) {
      const input = body.querySelector('.g-ginput');
      if (input) { input.value = typed; input.focus(); }
    }
  };
  const onKey = (e) => {
    const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
    const cur = findMessage(convId, m.id);
    if (!dir || !cur || !cur.game || cur.game.kind !== '2048') return;
    if (cur.game.holder !== state.me.id || cur.game.over) return;
    e.preventDefault();
    gameAct(cur, { action: 'move', dir });
  };
  render();
  const win = el('div', { class: 'modal modal-game' },
    el('div', { class: 'modal-title', text: `${def.emoji} ${def.title}` }),
    body,
    el('div', { class: 'modal-actions' },
      el('button', {
        class: 'btn btn-ghost', text: '換個遊戲',
        onclick: () => { close(); const c = convById(convId); if (c) gamePickModal(c); },
      }),
      el('button', { class: 'btn btn-primary', text: '關閉', onclick: () => close() })));
  // 量一次高度就定住：視窗剛好包住這款遊戲，之後盤面更新都不會改變大小
  const freeze = () => {
    win.style.height = '';
    let h = Math.ceil(win.getBoundingClientRect().height);
    win.style.height = h + 'px';
    // 寫死高度後內容區可能被壓縮幾像素，補回去（超過 CSS 的 max-height 就讓它捲）
    for (let i = 0; i < 3 && body.scrollHeight > body.clientHeight; i++) {
      h += body.scrollHeight - body.clientHeight;
      win.style.height = h + 'px';
    }
  };
  const close = openModal(win, () => {
    state.openGame = null;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', freeze);
  });
  requestAnimationFrame(freeze);
  window.addEventListener('resize', freeze); // 轉向或視窗縮放後重新量一次
  state.openGame = { id: m.id, convId, render };
  document.addEventListener('keydown', onKey);
}

function handleGame(ev) {
  const m = findMessage(ev.conversationId, ev.messageId);
  if (m) {
    m.game = ev.game;
    rerenderMessage(ev.conversationId, ev.messageId);
  }
  if (state.openGame && state.openGame.id === ev.messageId) state.openGame.render();
}

// 還沒分出勝負／還沒結束的那幾局
const gameLive = (g) =>
  g.mode === 'versus' ? g.winner === null : g.mode === 'coop' ? !g.over : !g.winner;

function ongoingGames(conv) {
  const cache = state.msgCache.get(conv.id);
  if (!cache) return [];
  return cache.messages
    .filter((m) => m.type === 'game' && !m.deleted && m.game && gameLive(m.game))
    .slice(-5).reverse();
}

// 聊天室選單 →「小遊戲」：選一款就在聊天室裡開一局，成員都能加入
function gamePickModal(conv) {
  const rows = [];
  const live = ongoingGames(conv);
  if (live.length) {
    rows.push(el('div', { class: 'list-section', text: '這個聊天室進行中的遊戲' }));
    for (const m of live) {
      const def = GAME_DEFS[gameKindOf(m)];
      if (!def) continue;
      const st = gameStatus(m.game);
      rows.push(el('button', {
        class: 'game-pick live', type: 'button',
        onclick: () => { close(); openGameModal(m); },
      },
        el('span', { class: 'gp-emoji', text: def.emoji }),
        el('span', { class: 'gp-main' },
          el('span', { class: 'gp-title', text: def.title }),
          el('span', { class: 'gp-desc', text: st.text })),
        el('span', { class: 'gp-tag', text: '回到這局' })));
    }
    rows.push(el('div', { class: 'list-section', text: '開新的一局' }));
  }
  for (const group of GAME_GROUPS) {
    rows.push(el('div', { class: 'list-section', text: group.label }));
    for (const kind of group.kinds) {
      const def = GAME_DEFS[kind];
      rows.push(el('button', {
        class: 'game-pick', type: 'button',
        onclick: async () => {
          close();
          try {
            const msg = await postMessage(conv.id, 'game', '', { game: { kind } });
            if (msg) openGameModal(msg);
          } catch (e) { toast(e.message); }
        },
      },
        el('span', { class: 'gp-emoji', text: def.emoji }),
        el('span', { class: 'gp-main' },
          el('span', { class: 'gp-title', text: def.title }),
          el('span', { class: 'gp-desc', text: def.desc })),
        el('span', { class: 'gp-tag', text: def.tag })));
    }
  }

  const close = openModal(el('div', { class: 'modal modal-games' },
    el('div', { class: 'modal-title', text: '🎮 小遊戲' }),
    el('div', { class: 'modal-body' },
      el('p', { text: '選一款開局，聊天室裡的大家都看得到，也能一起玩。' }),
      ...rows),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '取消', onclick: () => close() }))));
}

/* ---------- 訊息搜尋 ---------- */

let searchTimer = null;

function toggleSearch(show) {
  const bar = $('search-bar');
  const showing = show !== undefined ? show : bar.classList.contains('hidden');
  bar.classList.toggle('hidden', !showing);
  $('search-results').classList.toggle('hidden', !showing);
  $('chat-list').classList.toggle('hidden', showing);
  if (showing) {
    $('search-results').textContent = '';
    $('search-input').value = '';
    $('search-input').focus();
  }
}

function makeSnippet(text, q) {
  const one = text.replace(/\n/g, ' ');
  const idx = one.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, idx - 12);
  const seg = (start > 0 ? '…' : '') + one.slice(start, start + 60);
  const frag = document.createDocumentFragment();
  const pos = seg.toLowerCase().indexOf(q.toLowerCase());
  if (pos < 0) { frag.append(seg); return frag; }
  frag.append(seg.slice(0, pos));
  frag.append(el('mark', { text: seg.slice(pos, pos + q.length) }));
  frag.append(seg.slice(pos + q.length));
  return frag;
}

function runSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const q = $('search-input').value.trim();
    const box = $('search-results');
    if (!q) { box.textContent = ''; return; }
    try {
      const data = await api('/api/search?q=' + encodeURIComponent(q));
      box.textContent = '';
      if (!data.results.length) {
        box.append(el('div', { class: 'list-empty', text: `找不到含「${q}」的訊息` }));
        return;
      }
      for (const m of data.results) {
        const conv = convById(m.conversationId);
        box.append(el('button', {
          class: 'row',
          onclick: () => openConvAt(m.conversationId, m.id),
        },
          avatarEl(userOf(m.senderId), 44),
          el('div', { class: 'row-main' },
            el('div', { class: 'row-title-line' },
              el('div', { class: 'row-name', text: conv ? convTitle(conv) : nameOf(m.senderId) })),
            el('div', { class: 'row-sub search-snippet' }, makeSnippet(m.content, q))),
          el('div', { class: 'row-side' },
            el('div', { class: 'row-time', text: fmtListTime(m.createdAt) }))));
      }
    } catch (e) { toast(e.message); }
  }, 300);
}

function setJumpLabel(label) {
  const jump = $('btn-jump');
  jump.textContent = '';
  jump.append(icon('down', 16), ' ' + label);
}

function jumpToLatest() {
  const convId = state.currentConv;
  const cache = convId && state.msgCache.get(convId);
  if (cache && (cache.aroundMode || cache.stale)) {
    fetchMessages(convId).catch((e) => toast(e.message));
  } else {
    scrollToBottom();
  }
}

// 從搜尋結果跳到訊息所在位置（載入該訊息前後的紀錄）
async function openConvAt(convId, mid) {
  const conv = convById(convId);
  if (!conv) { toast('找不到這個聊天室'); return; }
  toggleSearch(false);
  state.currentConv = convId;
  document.body.classList.add('chat-open');
  $('chat-empty').classList.add('hidden');
  $('chat-view').classList.remove('hidden');
  $('typing').classList.add('hidden');
  hidePicker();
  clearReply();
  cancelRec();
  updateChatHeader(conv);
  try {
    const data = await api(`/api/conversations/${convId}/messages?around=${mid}`);
    state.msgCache.set(convId, {
      messages: data.messages, members: data.members, hasMore: data.hasMore,
      pinned: data.pinned || null, aroundMode: true, hasNewer: data.hasNewer,
    });
    renderMessages(convId);
    updatePinBanner(convId);
    scrollToMessage(mid);
    if (data.hasNewer) {
      setJumpLabel('回到最新');
      $('btn-jump').classList.remove('hidden');
    } else {
      $('btn-jump').classList.add('hidden');
    }
    sendReadIfNeeded(convId);
  } catch (e) { toast(e.message); }
}

/* ---------- 聊天室小工具：待辦清單與行事曆 ---------- */

// 待辦與行事曆從獨立分頁搬進聊天室：面板平常收在 #tools-holder，
// 開啟時整塊搬進彈窗（節點不重建，綁好的事件與捲動位置都留著）。
function openToolsModal(tab) {
  if (state.toolsOpen) return;
  const panel = $('tools-panel');
  const close = openModal(
    el('div', { class: 'modal modal-tools' },
      el('div', { class: 'modal-title', text: '待辦・行事曆' }),
      el('div', { class: 'modal-body tools-modal-body' }, panel),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-ghost', text: '關閉', onclick: () => close() }))),
    () => {
      state.toolsOpen = false;
      $('tools-holder').append(panel); // 收回暫存區，下次還能再開
    });
  state.toolsOpen = true;
  setToolTab(tab || state.toolTab);
}

function setToolTab(tab) {
  state.toolTab = tab;
  $('tool-tab-shopping').classList.toggle('active', tab === 'shopping');
  $('tool-tab-calendar').classList.toggle('active', tab === 'calendar');
  $('tool-shopping').classList.toggle('hidden', tab !== 'shopping');
  $('tool-calendar').classList.toggle('hidden', tab !== 'calendar');
  if (tab === 'shopping') renderShopping();
  else renderCalendar();
}

async function renderShopping() {
  try {
    const data = await api('/api/shopping');
    const box = $('shopping-list');
    box.textContent = '';
    if (!data.items.length) {
      box.append(el('div', { class: 'list-empty', text: '清單是空的。\n加入要買的東西，全家人都會即時看到！' }));
      return;
    }
    for (const it of data.items) {
      const check = el('button', { class: 'tcheck', type: 'button', 'aria-label': '完成' }, icon('check', 14));
      check.addEventListener('click', () =>
        api(`/api/shopping/${it.id}`, { method: 'PATCH', body: { done: !it.done } })
          .catch((e) => toast(e.message)));
      box.append(el('div', { class: 'titem' + (it.done ? ' done' : '') },
        check,
        el('div', { class: 'tmain' },
          el('div', { class: 'ttext', text: it.text }),
          el('div', { class: 'tsub', text: it.done ? `${nameOf(it.doneBy, it.doneByName)} 已買到` : `${nameOf(it.createdBy, it.createdByName)} 新增` })),
        el('button', {
          class: 'icon-btn', type: 'button', 'aria-label': '刪除',
          onclick: () => api(`/api/shopping/${it.id}`, { method: 'DELETE' })
            .catch((e) => toast(e.message)),
        }, icon('trash', 18))));
    }
  } catch (e) { toast(e.message); }
}

function eventSub(ev2) {
  const d = new Date(ev2.remindAt);
  const parts = [`週${WEEKDAYS[d.getDay()]}`];
  if (ev2.time) parts.push(ev2.time);
  if (ev2.note) parts.push(ev2.note);
  parts.push(`${nameOf(ev2.createdBy, ev2.createdByName)} 建立`);
  return parts.join(' · ');
}

function eventRow(ev2, isPast) {
  const d = new Date(ev2.remindAt);
  return el('div', { class: 'eitem' + (isPast ? ' past' : '') },
    el('div', { class: 'edate' },
      el('div', { class: 'em', text: `${d.getMonth() + 1}月` }),
      el('div', { class: 'ed', text: String(d.getDate()) })),
    el('div', { class: 'emain' },
      el('div', { class: 'etitle', text: ev2.title }),
      el('div', { class: 'esub', text: eventSub(ev2) })),
    el('button', {
      class: 'icon-btn', type: 'button', 'aria-label': '刪除',
      onclick: async () => {
        if (!(await confirmModal('刪除事項', `確定刪除「${ev2.title}」嗎？`))) return;
        api(`/api/events/${ev2.id}`, { method: 'DELETE' }).catch((e) => toast(e.message));
      },
    }, icon('trash', 18)));
}

async function renderCalendar() {
  try {
    const data = await api('/api/events');
    const box = $('event-list');
    box.textContent = '';
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const upcoming = data.events.filter((e) => e.remindAt >= todayStart.getTime());
    const past = data.events.filter((e) => e.remindAt < todayStart.getTime()).slice(-3).reverse();
    if (!upcoming.length && !past.length) {
      box.append(el('div', { class: 'list-empty', text: '還沒有任何事項。\n加入生日、聚餐、繳費提醒，到時全家都會收到通知！' }));
      return;
    }
    for (const e of upcoming) box.append(eventRow(e, false));
    if (past.length) {
      box.append(el('div', { class: 'list-section', text: '已過去' }));
      for (const e of past) box.append(eventRow(e, true));
    }
  } catch (e) { toast(e.message); }
}

function addEventModal() {
  const titleIn = el('input', { placeholder: '標題（例：媽媽生日、回診）', maxlength: 60 });
  const dateIn = el('input', { type: 'date' });
  const timeIn = el('input', { type: 'time' });
  const noteIn = el('input', { placeholder: '備註（可留空）', maxlength: 200 });
  const err = el('div', { class: 'modal-error hidden' });
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: '新增行事曆事項' }),
    el('div', { class: 'modal-body' },
      titleIn, dateIn, timeIn, noteIn,
      el('p', { text: '到了時間全家人都會收到提醒；沒填時間就是當天早上 8 點提醒。' }),
      err),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '取消', onclick: () => close() }),
      el('button', {
        class: 'btn btn-primary', text: '新增',
        onclick: async () => {
          const title = titleIn.value.trim();
          const date = dateIn.value;
          const time = timeIn.value || null;
          if (!title || !date) {
            err.textContent = '請填標題和日期';
            err.classList.remove('hidden');
            return;
          }
          const [y, mo, da] = date.split('-').map(Number);
          const [hh, mm2] = (time || '08:00').split(':').map(Number);
          const remindAt = new Date(y, mo - 1, da, hh, mm2).getTime();
          try {
            await api('/api/events', {
              method: 'POST',
              body: { title, date, time, note: noteIn.value.trim(), remindAt },
            });
            close();
          } catch (e2) {
            err.textContent = e2.message;
            err.classList.remove('hidden');
          }
        },
      }))));
}

function handleEventReminder(ev) {
  const e = ev.event;
  toast(`行事曆提醒：${e.title}`);
  if (state.sound) ding();
  if (state.notify && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(state.stealth ? '提醒' : '行事曆提醒', {
        body: state.stealth ? '有新內容' : e.title,
        icon: '/icons/icon-192.png',
        tag: 'cim-event-' + e.id,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  }
  if (state.toolsOpen && state.toolTab === 'calendar') renderCalendar();
}

/* ---------- 離線推播（客戶端） ---------- */

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlB64ToUint8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const base = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function enablePush() {
  if (!pushSupported()) { toast('這個瀏覽器不支援離線推播'); return false; }
  if (!(await ensureNotifPermission())) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api('/api/push/key');
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8(key),
    });
    await api('/api/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
    state.pushOn = true;
    localStorage.setItem('cim_push', '1');
    return true;
  } catch {
    toast('無法開啟離線推播（iPhone 需先「加入主畫面」後從主畫面開啟）');
    return false;
  }
}

async function disablePush() {
  state.pushOn = false;
  localStorage.setItem('cim_push', '0');
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } })
        .catch(() => {});
      await sub.unsubscribe();
    }
  } catch {}
}

// 登入後靜默續訂（訂閱可能被瀏覽器輪換）
async function syncPushSubscription() {
  if (!state.pushOn || !pushSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { key } = await api('/api/push/key');
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(key),
      });
    }
    await api('/api/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
  } catch {}
}

/* ---------- 管理員：成員管理 ---------- */

function manageMembersModal() {
  const rows = [...state.users.values()].filter((u) => !u.disabled).map((u) =>
    el('div', { class: 'row' },
      avatarEl(u, 44),
      el('div', { class: 'row-main' },
        el('div', { class: 'row-name', text: u.displayName + (u.isAdmin ? '　👑 管理員' : '') }),
        el('div', { class: 'row-sub', text: '@' + u.username })),
      u.id !== state.me.id ? el('button', {
        class: 'member-remove member-reset', type: 'button', text: '重設密碼',
        onclick: async () => {
          if (!(await confirmModal('重設密碼', `要幫「${u.displayName}」重設密碼嗎？舊密碼會立即失效，所有裝置都需要用新的臨時密碼重新登入。`))) return;
          try {
            const r = await api(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' });
            close();
            showTempPassword(u, r.tempPassword);
          } catch (e2) { toast(e2.message); }
        },
      }) : null,
      u.id !== state.me.id ? el('button', {
        class: 'member-remove', type: 'button', text: '移除',
        onclick: async () => {
          if (!(await confirmModal('移除成員', `確定將「${u.displayName}」移出聊天室嗎？移除後他將無法再登入（聊天紀錄會保留）。`, true))) return;
          try {
            await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
            toast('已移除');
            close();
            await loadUsers();
            renderSettings();
            renderFriends();
          } catch (e2) { toast(e2.message); }
        },
      }) : null));
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: '成員管理' }),
    el('div', { class: 'modal-body' }, el('div', { class: 'member-list' }, rows)),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost', text: '關閉', onclick: () => close() }))));
}

function showTempPassword(user, tempPassword) {
  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: `${user.displayName} 的臨時密碼` }),
    el('div', { class: 'modal-body' },
      el('div', { class: 'temp-pass', text: tempPassword }),
      el('p', { text: '請用其他方式（口頭、簡訊）把這組密碼交給他。他用「帳號＋這組密碼」登入後，記得到「設定 → 變更密碼」改成自己的密碼。' }),
      el('p', { text: '這組密碼只會顯示這一次。' })),
    el('div', { class: 'modal-actions' },
      el('button', {
        class: 'btn btn-ghost', text: '複製',
        onclick: async () => {
          try { await navigator.clipboard.writeText(tempPassword); toast('已複製'); } catch { toast('無法複製'); }
        },
      }),
      el('button', { class: 'btn btn-primary', text: '完成', onclick: () => close() }))));
}

/* ---------- 事件綁定與啟動 ---------- */

function bindEvents() {
  $('auth-tab-login').addEventListener('click', () => setAuthMode('login'));
  $('auth-tab-register').addEventListener('click', () => setAuthMode('register'));
  $('auth-form').addEventListener('submit', submitAuth);

  document.querySelectorAll('.nav-btn').forEach((b) =>
    b.addEventListener('click', () => switchTab(b.dataset.tab)));

  $('btn-new-group').addEventListener('click', newGroupModal);
  $('btn-back').addEventListener('click', closeChat);
  $('btn-chat-info').addEventListener('click', chatInfoModal);
  $('btn-load-more').addEventListener('click', loadOlder);
  $('btn-jump').addEventListener('click', jumpToLatest);
  $('btn-send').addEventListener('click', sendText);
  $('btn-emoji').addEventListener('click', togglePicker);
  $('btn-image').addEventListener('click', () => $('file-input').click());

  $('picker-tab-emoji').addEventListener('click', () => {
    $('picker-tab-emoji').classList.add('active');
    $('picker-tab-sticker').classList.remove('active');
    $('picker-emoji').classList.remove('hidden');
    $('picker-sticker').classList.add('hidden');
  });
  $('picker-tab-sticker').addEventListener('click', () => {
    $('picker-tab-sticker').classList.add('active');
    $('picker-tab-emoji').classList.remove('active');
    $('picker-sticker').classList.remove('hidden');
    $('picker-emoji').classList.add('hidden');
  });

  const input = $('input');
  input.addEventListener('input', () => { autoGrow(); notifyTyping(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && !isTouch()) {
      e.preventDefault();
      sendText();
    }
  });
  input.addEventListener('paste', (e) => {
    const file = [...(e.clipboardData?.files || [])].find((f) => /^image\//.test(f.type));
    if (file) { e.preventDefault(); sendImageFile(file); }
  });

  $('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) sendImageFile(file);
  });
  $('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 192, 70000);
      await patchMe({ avatar: dataUrl });
    } catch (err) { toast(err.message); }
  });

  const scroller = $('msg-scroll');
  scroller.addEventListener('scroll', () => {
    if (nearBottom()) $('btn-jump').classList.add('hidden');
  });
  scroller.addEventListener('dragover', (e) => e.preventDefault());
  scroller.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = [...(e.dataTransfer?.files || [])].find((f) => /^image\//.test(f.type));
    if (file) sendImageFile(file);
  });

  $('viewer').addEventListener('click', () => {
    $('viewer').classList.add('hidden');
    $('viewer-img').src = '';
  });

  $('btn-notif-on').addEventListener('click', async () => {
    const granted = await ensureNotifPermission();
    if (granted && pushSupported()) await enablePush();
    updateNotifBanner();
  });
  $('btn-notif-dismiss').addEventListener('click', () => {
    state.notifDismissed = true;
    localStorage.setItem('cim_notif_dismissed', '1');
    updateNotifBanner();
  });

  // 一鍵加入主畫面
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installPrompt = e;
    updateInstallUi();
  });
  window.addEventListener('appinstalled', () => {
    state.installPrompt = null;
    toast('已加入主畫面 🎉');
    updateInstallUi();
  });
  // 手機鍵盤彈出（可視區縮小）時，讓最新訊息貼齊輸入框上方
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (state.currentConv && document.activeElement === $('input')) {
        setTimeout(() => scrollToBottom(false), 60);
      }
    });
  }

  $('btn-add-friend').addEventListener('click', addFriendModal);
  $('btn-install').addEventListener('click', doInstall);
  $('btn-install-dismiss').addEventListener('click', () => {
    state.installDismissed = true;
    localStorage.setItem('cim_install_dismissed', '1');
    updateInstallUi();
  });
  updateInstallUi();

  // 搜尋
  $('btn-search').addEventListener('click', () => toggleSearch());
  $('btn-search-close').addEventListener('click', () => toggleSearch(false));
  $('search-input').addEventListener('input', runSearch);

  // 聊天室小工具（待辦清單／行事曆）：面板只有一份，事件在這裡綁一次
  $('tool-tab-shopping').addEventListener('click', () => setToolTab('shopping'));
  $('tool-tab-calendar').addEventListener('click', () => setToolTab('calendar'));
  $('shopping-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('shopping-input').value.trim();
    if (!text) return;
    $('shopping-input').value = '';
    try { await api('/api/shopping', { method: 'POST', body: { text } }); }
    catch (e2) { toast(e2.message); }
  });
  $('btn-add-event').addEventListener('click', addEventModal);

  // 語音訊息
  $('btn-mic').addEventListener('click', startRec);
  $('btn-rec-cancel').addEventListener('click', cancelRec);
  $('btn-rec-send').addEventListener('click', () => finishRec(true));

  // 回覆與公告
  $('btn-reply-cancel').addEventListener('click', clearReply);
  $('pin-banner').addEventListener('click', () => {
    const cache = state.msgCache.get(state.currentConv);
    if (cache && cache.pinned) scrollToMessage(cache.pinned.id);
  });
  $('btn-pin-clear').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!(await confirmModal('取消公告', '要撤下這則公告嗎？'))) return;
    try {
      await api(`/api/conversations/${state.currentConv}/pin`, {
        method: 'POST', body: { messageId: null },
      });
    } catch (e2) { toast(e2.message); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (state.token && !state.ws) connectWs();
      if (state.currentConv) sendReadIfNeeded(state.currentConv);
    }
  });
  window.addEventListener('focus', () => {
    if (state.currentConv) sendReadIfNeeded(state.currentConv);
  });
}

async function boot() {
  injectIcons();
  applyAppearance();
  bindEvents();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  if (state.token) {
    try {
      const data = await api('/api/me');
      state.me = data.user;
      state.appInfo = await api('/api/app-info').catch(() => null);
      await enterApp();
      return;
    } catch (err) {
      if (state.token) {
        // 網路問題（非 401）：稍後重試
        toast(err.message);
      }
    }
  }
  showAuth();
}

boot();
