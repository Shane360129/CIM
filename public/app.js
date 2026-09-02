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

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
function renderText(text) {
  const frag = document.createDocumentFragment();
  const parts = text.split(URL_RE);
  parts.forEach((part, i) => {
    if (i % 2 === 1) frag.append(el('a', { href: part, target: '_blank', rel: 'noopener noreferrer', text: part }));
    else if (part) frag.append(part);
  });
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
  skin: localStorage.getItem('cim_skin') || 'ocean',
  fontSize: localStorage.getItem('cim_font') || 'md',
  stealth: localStorage.getItem('cim_stealth') === '1',
  pushOn: localStorage.getItem('cim_push') === '1',
  replyTarget: null,          // { id, convId, name, preview }
  toolTab: 'shopping',
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
  if (m.type === 'sticker') return '[貼圖] ' + m.content;
  if (m.type === 'audio') return '[語音訊息]';
  if (m.type === 'poll') {
    try { return '[投票] ' + JSON.parse(m.content).q; } catch { return '[投票]'; }
  }
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
  if (conv.type === 'group') return groupAvatarEl(size);
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
        else updateChatHeader(conv);
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
  $('tab-tools').classList.toggle('hidden', tab !== 'tools');
  $('tab-settings').classList.toggle('hidden', tab !== 'settings');
  if (tab === 'friends') renderFriends();
  if (tab === 'settings') renderSettings();
  if (tab === 'tools') renderTools();
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
          el('div', { class: 'row-name', text: convTitle(conv) }),
          conv.type === 'group' ? el('span', { class: 'row-count', text: String(conv.members.length) }) : null),
        el('div', { class: 'row-sub', text: previewWithSender(conv) })),
      el('div', { class: 'row-side' },
        el('div', { class: 'row-time', text: conv.lastMessage ? fmtListTime(conv.lastActivity) : '' }),
        conv.unread > 0 ? el('span', { class: 'badge', text: conv.unread > 99 ? '99+' : String(conv.unread) }) : null));
    box.append(row);
  }
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

  const meRow = el('button', {
    class: 'row',
    onclick: () => openDmWith(state.me.id),
  },
    avatarEl(state.me, 52),
    el('div', { class: 'row-main' },
      el('div', { class: 'row-name', text: state.me.displayName }),
      el('div', { class: 'row-sub', text: '我的記事本 — 傳訊息給自己做筆記' })));
  box.append(meRow);

  const others = [...state.users.values()].filter((u) => u.id !== state.me.id && !u.disabled);
  box.append(el('div', { class: 'list-section', text: `好友 ${others.length}` }));
  if (!others.length) {
    box.append(el('div', { class: 'list-empty', text: '還沒有其他成員。\n到「設定」複製邀請訊息，傳給親友請他們註冊！' }));
    return;
  }
  for (const u of others) {
    box.append(el('button', { class: 'row', onclick: () => showProfile(u) },
      avatarEl(u, 52),
      el('div', { class: 'row-main' },
        el('div', { class: 'row-name', text: u.displayName + (u.isAdmin ? '　👑' : '') }),
        el('div', { class: 'row-sub', text: u.statusMessage || '@' + u.username }))));
  }
  box.append(el('div', {
    class: 'list-note',
    text: state.me.isAdmin
      ? '你是管理員，看得到所有成員。其他成員只會看到你，以及跟他同一個群組的人。'
      : '為了保護隱私，這裡只會顯示管理員，以及跟你同一個群組的成員。',
  }));
}

function showProfile(user) {
  const close = openModal(
    el('div', { class: 'modal' },
      el('div', { class: 'modal-body' },
        el('div', { class: 'profile-card' },
          avatarEl(user, 88),
          el('div', { class: 'p-name', text: user.displayName }),
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
      }))));

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
    box.append(el('div', { class: 'set-group' },
      el('div', { class: 'set-group-title', text: '管理員' }),
      el('div', { class: 'set-item' }, codeInput, saveBtn),
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

  const cached = state.msgCache.get(convId);
  renderMessages(convId);
  if (cached) scrollToBottom(false);
  fetchMessages(convId).catch((e) => toast(e.message));
  if (!isTouch()) $('input').focus();
}

function closeChat() {
  state.currentConv = null;
  document.body.classList.remove('chat-open');
  $('chat-view').classList.add('hidden');
  $('chat-empty').classList.remove('hidden');
  hidePicker();
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
    scrollToBottom(false);
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
  if (m.type === 'sticker') return el('div', { class: 'msg-sticker', text: m.content });
  if (m.type === 'audio') return buildAudioMsg(m);
  if (m.type === 'poll') return buildPollCard(m);
  return el('div', { class: 'bubble' }, renderText(m.content));
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
  for (const m of cache.messages) {
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
}

async function sendSticker(sticker) {
  if (!state.currentConv) return;
  hidePicker();
  try { await postMessage(state.currentConv, 'sticker', sticker); }
  catch (err) { toast(err.message); }
}

async function sendImageFile(file) {
  if (!state.currentConv || !file) return;
  try {
    toast('圖片處理中…');
    const dataUrl = await compressImage(file, 1280, 620000);
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
  const sg = $('picker-sticker');
  for (const s of STICKERS) {
    sg.append(el('button', { type: 'button', text: s, onclick: () => sendSticker(s) }));
  }
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

function chatInfoModal() {
  const conv = convById(state.currentConv);
  if (!conv) return;

  if (conv.type === 'dm') {
    const partner = dmPartner(conv);
    if (partner && partner.id !== state.me.id) showProfile(partner);
    return;
  }

  const memberRows = conv.members.map((m) => {
    const u = userOf(m.userId);
    return el('div', { class: 'row' },
      avatarEl(u, 44),
      el('div', { class: 'row-main' },
        el('div', { class: 'row-name', text: (u ? u.displayName : '未知') + (m.userId === state.me.id ? '（我）' : '') })));
  });

  const close = openModal(el('div', { class: 'modal' },
    el('div', { class: 'modal-title', text: conv.name || '群組' }),
    el('div', { class: 'modal-body' },
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

function openModal(modalNode) {
  const backdrop = el('div', { class: 'modal-backdrop' }, modalNode);
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
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
    case 'user': {
      state.users.set(ev.user.id, ev.user);
      if (state.me && ev.user.id === state.me.id) state.me = ev.user;
      renderFriends();
      renderChatList();
      if (state.tab === 'settings') renderSettings();
      const conv = state.currentConv && convById(state.currentConv);
      if (conv) updateChatHeader(conv);
      break;
    }
    case 'conversations-changed': scheduleConvReload(); break;
    case 'reaction': handleReaction(ev); break;
    case 'vote': handleVote(ev); break;
    case 'pin': handlePin(ev); break;
    case 'shopping-changed': if (state.tab === 'tools' && state.toolTab === 'shopping') renderShopping(); break;
    case 'events-changed': if (state.tab === 'tools' && state.toolTab === 'calendar') renderCalendar(); break;
    case 'event-reminder': handleEventReminder(ev); break;
  }
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

let systemDarkMq = null;
function applyAppearance() {
  document.body.classList.remove('font-sm', 'font-lg', 'font-xl');
  if (state.fontSize !== 'md') document.body.classList.add('font-' + state.fontSize);
  for (const [key] of SKINS) document.body.classList.remove('skin-' + key);
  if (state.skin !== 'washi') document.body.classList.add('skin-' + state.skin);
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
    metaTheme.content = panel || (dark ? '#171E25' : '#F4F7FA');
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

/* ---------- 小工具：購物清單與行事曆 ---------- */

function renderTools() {
  setToolTab(state.toolTab);
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
  if (state.tab === 'tools' && state.toolTab === 'calendar') renderCalendar();
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

  // 搜尋
  $('btn-search').addEventListener('click', () => toggleSearch());
  $('btn-search-close').addEventListener('click', () => toggleSearch(false));
  $('search-input').addEventListener('input', runSearch);

  // 小工具
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
