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
};

const userOf = (id) => state.users.get(id) || null;
const nameOf = (id) => (userOf(id) ? userOf(id).displayName : '未知');
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
  convsChangedTimer = setTimeout(() => loadConvs().catch(() => {}), 200);
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
  document.title = total > 0 ? `(${total}) CIM` : 'CIM';
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

  const others = [...state.users.values()].filter((u) => u.id !== state.me.id);
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

  // 通知
  box.append(el('div', { class: 'set-group' },
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
    }),
    el('div', { class: 'set-note', text: '通知只在瀏覽器（或安裝的 App）開著時出現。上班時把分頁開著、手機把 CIM 加到主畫面，就不會漏訊息。' })));

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
          const text = `邀請你加入我們的 CIM 聊天室！\n1. 打開 ${location.origin}\n2. 點「註冊」建立帳號\n3. 邀請碼：${s.inviteCode}`;
          await navigator.clipboard.writeText(text);
          toast('邀請訊息已複製，貼給親友吧！');
        } catch (e2) { toast(e2.message); }
      }),
      setItem('成員', `${state.users.size} 位`, () => {
        openListModal('所有成員', [...state.users.values()].map((u) =>
          el('div', { class: 'row' },
            avatarEl(u, 44),
            el('div', { class: 'row-main' },
              el('div', { class: 'row-name', text: u.displayName + (u.isAdmin ? '　👑 管理員' : '') }),
              el('div', { class: 'row-sub', text: '@' + u.username })))));
      }),
      setItem('下載聊天備份', null, async () => {
        try {
          const data = await api('/api/admin/export');
          const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
          const a = el('a', { href: URL.createObjectURL(blob), download: 'cim-backup.json' });
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

  box.append(el('div', { class: 'set-note', text: 'CIM v1.0 — 手機瀏覽器選單中點「加入主畫面」，就能像 App 一樣使用。' }));
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
  updateChatHeader(conv);

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
  });
  if (state.currentConv === convId) {
    renderMessages(convId);
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

  let content;
  if (m.deleted) {
    content = el('div', { class: 'bubble deleted', text: '已收回訊息' });
  } else if (m.type === 'image') {
    content = el('img', {
      class: 'msg-img', src: m.content, alt: '圖片',
      onclick: () => openViewer(m.content),
    });
  } else if (m.type === 'sticker') {
    content = el('div', { class: 'msg-sticker', text: m.content });
  } else {
    content = el('div', { class: 'bubble' }, renderText(m.content));
  }

  const meta = el('div', { class: 'meta' },
    el('span', { class: 'read', text: readLabelFor(conv, cache, m) }),
    el('span', { class: 'time', text: fmtTime(m.createdAt) }));

  const line = el('div', { class: 'msg-line' }, content, meta);
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

function attachMsgMenu(node, m) {
  if (m.type === 'system') return;
  const open = (e) => {
    e.preventDefault();
    const items = [];
    if (!m.deleted && m.type === 'text') items.push({ label: '複製', value: 'copy' });
    if (!m.deleted && m.senderId === state.me.id && Date.now() - m.createdAt < 24 * 3600 * 1000) {
      items.push({ label: '收回', value: 'unsend', danger: true });
    }
    if (!items.length) return;
    openSheet(items).then(async (v) => {
      if (v === 'copy') {
        try { await navigator.clipboard.writeText(m.content); toast('已複製'); } catch { toast('無法複製'); }
      }
      if (v === 'unsend') {
        try { await api(`/api/messages/${m.id}/unsend`, { method: 'POST' }); } catch (e2) { toast(e2.message); }
      }
    });
  };
  node.addEventListener('contextmenu', open);
  let pressTimer = null;
  node.addEventListener('touchstart', (e) => {
    pressTimer = setTimeout(() => open(e), 550);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach((evt) =>
    node.addEventListener(evt, () => clearTimeout(pressTimer), { passive: true }));
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

async function postMessage(convId, type, content) {
  const data = await api(`/api/conversations/${convId}/messages`, {
    method: 'POST', body: { type, content },
  });
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
  const others = [...state.users.values()].filter((u) => u.id !== state.me.id);
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
  const candidates = [...state.users.values()].filter((u) => !memberIds.has(u.id));
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
  ws.onclose = () => {
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
  }
}

function handleIncomingMessage(m, fromSelfPost) {
  const conv = convById(m.conversationId);
  const cache = state.msgCache.get(m.conversationId);

  // 更新訊息快取（避免 POST 回應與 WS 事件重複加入）
  let added = false;
  if (cache) {
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
    if (stick) scrollToBottom(m.senderId !== state.me.id);
    else $('btn-jump').classList.remove('hidden');
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
    const title = conv
      ? convTitle(conv) + (conv.type === 'group' && sender ? `｜${sender.displayName}` : '')
      : (sender ? sender.displayName : '新訊息');
    const n = new Notification(title, {
      body: msgPreview(m),
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
  $('btn-jump').addEventListener('click', () => scrollToBottom());
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
    await ensureNotifPermission();
    updateNotifBanner();
  });
  $('btn-notif-dismiss').addEventListener('click', () => {
    state.notifDismissed = true;
    localStorage.setItem('cim_notif_dismissed', '1');
    updateNotifBanner();
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
