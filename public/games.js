// 🎮 小遊戲：開在另一個頁面（從聊天室選單打開），一個聊天室可以同時開好幾桌。
// 盤面、輪到誰、輸贏全部由伺服器判定，這一頁只負責畫出來、把「我要下哪一格」送出去；
// 家人下了一步，伺服器透過 WebSocket 送來新的盤面，畫面馬上更新。
const params = new URLSearchParams(location.search);
const convId = Number(params.get('c'));
const token = localStorage.getItem('cim_token');
const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) n.append(c);
  return n;
};
const state = { me: { id: 0 }, members: new Map(), tables: [], title: '', open: Number(params.get('t')) || null };
const nameOf = (uid) => (state.members.get(uid) || {}).name || '家人';

function toast(msg) {
  const t = el('div', { class: 'toast', text: msg });
  $('toast-root').append(t);
  setTimeout(() => t.remove(), 2400);
}
// 確定／取消的小視窗
function confirmModal(title, text) {
  return new Promise((resolve) => {
    const done = (ok) => { root.remove(); resolve(ok); };
    const root = el('div', { class: 'modal-root', onclick: (e) => { if (e.target === root) done(false); } },
      el('div', { class: 'modal' }, el('h2', { text: title }), el('p', { text }),
        el('div', { class: 'modal-actions' },
          el('button', { class: 'btn btn-ghost', type: 'button', text: '取消', onclick: () => done(false) }),
          el('button', { class: 'btn btn-primary', type: 'button', text: '確定', onclick: () => done(true) }))));
    document.body.append(root);
  });
}
async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: { authorization: 'Bearer ' + token, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('登入已過期，請回聊天室重新登入');
  if (!res.ok) throw new Error(data.error || `發生錯誤（${res.status}）`);
  return data;
}
// 淺色／深色跟著聊天室的設定
(() => {
  const t = localStorage.getItem('cim_theme') || 'auto';
  document.body.classList.toggle('theme-dark', t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches));
})();

/* ---------- 每一款遊戲的畫法（盤面、座位、狀態文字、排行榜） ----------
   三種玩法：對戰（兩個座位輪流）、一起玩（輪流接手操作）、大家一起（誰都能出手），還有單人比排行榜。
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
  sudoku: {
    title: '數獨', emoji: '🔢', desc: '9×9 填數字，全家解同一題比誰快', tag: '單人・比時間',
  },
  slide: {
    title: '數字推盤', emoji: '🧩', desc: '把 1–15 推回順序，比誰步數少', tag: '單人・比步數',
  },
  lights: {
    title: '關燈遊戲', emoji: '💡', desc: '按一下連旁邊一起翻，把燈全部關掉', tag: '單人・比步數',
  },
};

// 對戰型遊戲在選單裡排前面，合作／開放型排後面
const GAME_GROUPS = [
  { label: '兩人對戰（兩個座位輪流）', kinds: ['ooxx', 'connect4', 'gomoku', 'reversi', 'memory'] },
  { label: '大家一起玩', kinds: ['2048', 'mine', 'guess'] },
  { label: '一個人玩・比排行榜（大家解同一題）', kinds: ['sudoku', 'slide', 'lights'] },
];

// 伺服器早期版本只存 size（正方形盤），新版存 cols／rows
const gameDims = (g) => ({ cols: g.cols || g.size, rows: g.rows || g.size });

const gameKindOf = (t) => t.kind;

function gameTitle(m) {
  const def = GAME_DEFS[gameKindOf(m)];
  return def ? def.title : '小遊戲';
}

// 下棋、加入、重來…都送到伺服器，回來的盤面直接換上（其他人會從 WebSocket 收到同一盤）
function gameAct(t, body) {
  return api(`/api/games/${convId}/${t.id}`, { method: 'POST', body })
    .then((r) => { if (r.table) upsert(r.table); })
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
  g.mode === 'versus' ? versusStatus(g)
    : g.mode === 'coop' ? coopStatus(g)
      : g.mode === 'solo' ? soloStatus(g) : openStatus(g);

/* ----- 單人邏輯題（數獨、數字推盤、關燈）：大家解同一題，比分數 ----- */

// 數獨要選格子再按數字；選到哪一格記在卡片外面，盤面更新後不會跑掉
const soloSel = new Map();
let soloTimer = null; // 計時中的那顆計時器（同時只會有一個遊戲視窗）

const fmtSec = (s) => (s >= 60 ? `${Math.floor(s / 60)} 分 ${s % 60} 秒` : `${s} 秒`);

const soloScoreText = (g, r) =>
  g.kind === 'sudoku' ? fmtSec(r.score) : `${r.score} 步・${fmtSec(r.seconds || 0)}`;

function soloStatus(g) {
  const m = g.mine;
  if (!m) return { text: '按「開始挑戰」就開始計時', hot: true };
  if (m.doneAt) {
    const rank = (g.leaderboard || []).findIndex((r) => r.userId === state.me.id) + 1;
    const best = soloScoreText(g, { score: m.score, seconds: m.seconds });
    return { text: `完成了！目前第 ${rank} 名・最佳 ${best}`, hot: true };
  }
  return { text: g.kind === 'sudoku' ? '計時中…' : `進行中・已經走了 ${m.moves} 步`, hot: true };
}

// 排行榜：前三名，自己沒進前三就補在後面
function leaderboardList(g) {
  const rows = g.leaderboard || [];
  const wrap = el('div', { class: 'g-rank' });
  wrap.append(el('div', { class: 'g-rank-head' },
    el('span', { class: 'grow', text: rows.length ? `排行榜（${rows.length} 人完成）` : '還沒有人完成，第一名等你拿' }),
    el('span', { text: g.kind === 'sudoku' ? '比時間' : '比步數' })));
  const show = rows.slice(0, 3);
  const myIdx = rows.findIndex((r) => r.userId === state.me.id);
  if (myIdx >= 3) show.push(rows[myIdx]);
  for (const r of show) {
    const idx = rows.indexOf(r);
    wrap.append(el('div', { class: 'g-rank-row' + (r.userId === state.me.id ? ' me' : '') },
      el('span', { class: 'g-rank-no', text: ['🥇', '🥈', '🥉'][idx] || `${idx + 1}` }),
      el('span', { class: 'g-rank-name', text: nameOf(r.userId) }),
      el('span', { class: 'g-rank-score', text: soloScoreText(g, r) })));
  }
  return wrap;
}

// 同一列／行／宮裡重複的數字（自己填錯會標紅）
function sudokuBad(board) {
  const bad = new Set();
  const mark = (cells) => {
    const seen = new Map();
    for (const i of cells) {
      const v = board[i];
      if (!v) continue;
      if (seen.has(v)) { bad.add(i); bad.add(seen.get(v)); } else seen.set(v, i);
    }
  };
  for (let k = 0; k < 9; k++) {
    mark([...Array(9).keys()].map((x) => k * 9 + x));
    mark([...Array(9).keys()].map((x) => x * 9 + k));
    const br = Math.floor(k / 3) * 3;
    const bc = (k % 3) * 3;
    mark([...Array(9).keys()].map((x) => (br + Math.floor(x / 3)) * 9 + bc + (x % 3)));
  }
  return bad;
}

function sudokuBoard(m, g, redraw) {
  const wrap = el('div', { class: 'g-sudoku' });
  const board = g.board;
  const playing = !!board && !(g.mine && g.mine.doneAt);
  const grid = el('div', { class: 'g-board sudoku' });
  sizeBoard(grid, g);
  const sel = soloSel.get(m.id);
  const bad = board ? sudokuBad(board) : new Set();
  const show = board || g.puzzle;
  show.forEach((v, i) => {
    const given = !!g.puzzle[i];
    const r = Math.floor(i / 9);
    const c = i % 9;
    const cell = el('button', {
      class: 'g-scell' + (given ? ' given' : '') + (bad.has(i) && !given ? ' bad' : '') +
        (sel === i ? ' sel' : '') +
        (sel != null && show[sel] && show[sel] === v ? ' same' : '') +
        (c % 3 === 2 && c !== 8 ? ' rb' : '') + (r % 3 === 2 && r !== 8 ? ' bb' : ''),
      type: 'button', text: v ? String(v) : '',
      'aria-label': `第 ${r + 1} 列第 ${c + 1} 格`,
    });
    if (playing && !given) {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        soloSel.set(m.id, sel === i ? null : i);
        redraw();
      });
    } else {
      cell.disabled = true;
    }
    grid.append(cell);
  });
  wrap.append(grid);

  const pad = el('div', { class: 'g-pad' });
  const key = (label, cls, onPress) => {
    const b = el('button', { class: 'g-padkey' + cls, type: 'button', text: label });
    if (playing) b.addEventListener('click', (e) => { e.stopPropagation(); onPress(); });
    else b.disabled = true;
    return b;
  };
  for (let v = 1; v <= 9; v++) {
    pad.append(key(String(v), '', () => {
      const at = soloSel.get(m.id);
      if (at == null) return toast('先點一個空格，再按數字');
      gameAct(m, { action: 'move', i: at, v });
    }));
  }
  pad.append(key('⌫', ' erase', () => {
    const at = soloSel.get(m.id);
    if (at == null) return toast('先點一個要清掉的格子');
    gameAct(m, { action: 'move', i: at, v: 0 });
  }));
  wrap.append(pad);
  return wrap;
}

function slideBoard(m, g) {
  const { cols } = gameDims(g);
  const grid = el('div', { class: 'g-board slide' });
  sizeBoard(grid, g);
  const board = g.board || g.puzzle;
  const playing = !!g.board && !(g.mine && g.mine.doneAt);
  const blank = board.indexOf(0);
  board.forEach((v, i) => {
    const near = Math.abs(Math.floor(i / cols) - Math.floor(blank / cols)) +
      Math.abs((i % cols) - (blank % cols)) === 1;
    const cell = el('button', {
      class: 'g-stile' + (v ? '' : ' blank') + (v && v === i + 1 ? ' home' : ''),
      type: 'button', text: v ? String(v) : '',
    });
    if (playing && v && near) {
      cell.addEventListener('click', (e) => { e.stopPropagation(); gameAct(m, { action: 'move', i }); });
    } else {
      cell.disabled = true;
    }
    grid.append(cell);
  });
  return grid;
}

function lightsBoard(m, g) {
  const grid = el('div', { class: 'g-board lights' });
  sizeBoard(grid, g);
  const board = g.board || g.puzzle;
  const playing = !!g.board && !(g.mine && g.mine.doneAt);
  board.forEach((v, i) => {
    const cell = el('button', { class: 'g-bulb' + (v ? ' on' : ''), type: 'button',
      'aria-label': `第 ${Math.floor(i / 5) + 1} 列第 ${i % 5 + 1} 盞` });
    if (playing) {
      cell.addEventListener('click', (e) => { e.stopPropagation(); gameAct(m, { action: 'move', i }); });
    } else {
      cell.disabled = true;
    }
    grid.append(cell);
  });
  return grid;
}

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
  if (g.kind === 'sudoku') return sudokuBoard(m, g, opts.redraw);
  if (g.kind === 'slide') return slideBoard(m, g);
  if (g.kind === 'lights') return lightsBoard(m, g);
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

function buildGameCard(m) {
  const g = m.game;
  const kind = gameKindOf(m);
  const def = GAME_DEFS[kind];
  if (!g || !def) return el('div', { class: 'bubble', text: '[小遊戲]' });

  const card = el('div', { class: 'game-card big' });
  clearInterval(soloTimer); // 重畫就把上一顆計時器收掉
  soloTimer = null;
  // 遊戲卡自己吃掉長按／右鍵，免得下棋時跳出訊息選單
  card.addEventListener('contextmenu', (e) => e.stopPropagation());
  card.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

  const versus = g.mode === 'versus';
  const st = gameStatus(g);
  const rightLabel = versus ? `第 ${g.round} 局`
    : g.kind === 'guess' || g.mode === 'solo' ? `第 ${g.round} 題` : `${g.moves} 步`;
  card.append(el('div', { class: 'g-head' },
    el('span', { class: 'g-title', text: `${def.emoji} ${def.title}` }),
    el('span', { class: 'g-round', text: rightLabel })));

  if (versus) card.append(seatPills(m, g));
  const scores = gameScores(g);
  if (scores) {
    card.append(el('div', { class: 'g-scores' }, scores.map(([label, val]) =>
      el('div', { class: 'g-score' }, el('b', { text: String(val) }), el('span', { text: label })))));
  }

  const statusEl = el('div', { class: 'g-status' + (st.hot ? ' hot' : ''), text: st.text });
  card.append(statusEl);
  // 數獨是比時間的，計時中就讓秒數自己跳
  if (g.mode === 'solo' && g.kind === 'sudoku' && g.mine && !g.mine.doneAt) {
    const tick = () => {
      const secs = Math.max(0, Math.round((Date.now() - g.mine.startedAt) / 1000));
      statusEl.textContent = `計時中…${fmtSec(secs)}`;
    };
    tick();
    soloTimer = setInterval(tick, 1000);
  }

  const interactive = true; // 這一頁就是遊戲桌，一律可以操作
  const boardWrap = el('div', { class: 'g-boardwrap' });
  const drawBoard = () => {
    boardWrap.textContent = '';
    boardWrap.append(gameBoard(m, g, interactive,
      { flagMode: flagModes.get(m.id) === true, redraw: drawBoard }));
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
  if (g.mode === 'solo') card.append(leaderboardList(g));

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
  } else if (g.mode === 'open') {
    acts.append(gameButton('換一題',
      async () => {
        if (g.winner || await confirmModal('換一題', '現在這題會作廢，重新出一組數字，確定嗎？'))
          gameAct(m, { action: 'restart' });
      }, g.winner ? 'btn-primary' : 'btn-ghost'));
  } else {
    const mine = g.mine;
    if (!mine || mine.doneAt) {
      acts.append(gameButton(mine ? '再挑戰一次' : '開始挑戰',
        () => { soloSel.delete(m.id); gameAct(m, { action: 'start' }); }, 'btn-primary'));
    } else {
      acts.append(gameButton('重來', async () => {
        if (await confirmModal('重來', '這題會回到一開始，計時也重新算，確定嗎？')) {
          soloSel.delete(m.id);
          gameAct(m, { action: 'start' });
        }
      }));
    }
    acts.append(gameButton('換一題', async () => {
      if (await confirmModal('換一題', '會出一題新的給大家，這一題的排行榜也會歸零，確定嗎？')) {
        soloSel.delete(m.id);
        gameAct(m, { action: 'restart' });
      }
    }));
  }
  card.append(acts);

  const hint = gameHint(g);
  if (hint) card.append(el('div', { class: 'g-foot', text: hint }));
  return card;
}

function gameHint(g) {
  if (g.kind === 'sudoku') return '點空格再按數字，填錯會標紅';
  if (g.kind === 'slide') return '把數字推進空格，排成 1–15 就完成';
  if (g.kind === 'lights') return '按一格會連上下左右一起翻，全部關掉就完成';
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


/* ---------- 大廳與遊戲桌 ---------- */

// 還沒分出勝負／還沒結束的那幾桌
const gameLive = (g) =>
  g.mode === 'versus' ? g.winner === null
    : g.mode === 'coop' ? !g.over
      : g.mode === 'solo' ? true : !g.winner;

function upsert(t) {
  const i = state.tables.findIndex((x) => x.id === t.id);
  if (i >= 0) state.tables[i] = t; else state.tables.push(t);
  state.tables.sort((a, b) => b.updatedAt - a.updatedAt);
  render();
}
function removeTable(id) {
  state.tables = state.tables.filter((t) => t.id !== id);
  if (state.open === id) { state.open = null; toast('這一桌已經收起來了'); }
  render();
}
const render = () => (state.open ? renderTable() : renderLobby());

function tableRow(t) {
  const def = GAME_DEFS[t.kind];
  const st = gameStatus(t.game);
  const live = gameLive(t.game);
  return el('button', { class: 'game-pick' + (live ? ' live' : ''), type: 'button', 'data-table': t.id, onclick: () => openTable(t.id) },
    el('span', { class: 'gp-emoji', text: def.emoji }),
    el('span', { class: 'gp-main' },
      el('span', { class: 'gp-title', text: `${def.title}・${nameOf(t.createdBy)}開的` }),
      el('span', { class: 'gp-desc' + (st.hot ? ' hot' : ''), text: st.text })),
    el('span', { class: 'gp-tag', text: live ? '回到這桌' : '看結果' }));
}

function renderLobby() {
  clearInterval(soloTimer);
  soloTimer = null;
  $('btn-back').classList.add('hidden');
  $('title').textContent = `🎮 小遊戲・${state.title}`;
  document.title = `小遊戲・${state.title}`;
  const main = $('main');
  main.textContent = '';
  const live = state.tables.filter((t) => gameLive(t.game));
  const done = state.tables.filter((t) => !gameLive(t.game));
  main.append(el('div', { class: 'section', text: '這個聊天室進行中的遊戲' }));
  if (!live.length) main.append(el('div', { class: 'empty-hint', text: '還沒有人開桌，從下面挑一款開始吧！開好之後聊天室的家人都能加入。' }));
  for (const t of live) main.append(tableRow(t));
  for (const group of GAME_GROUPS) {
    main.append(el('div', { class: 'section', text: '開新的一桌：' + group.label }));
    for (const kind of group.kinds) {
      const def = GAME_DEFS[kind];
      main.append(el('button', { class: 'game-pick', type: 'button', 'data-kind': kind, onclick: () => createTable(kind) },
        el('span', { class: 'gp-emoji', text: def.emoji }),
        el('span', { class: 'gp-main' }, el('span', { class: 'gp-title', text: def.title }), el('span', { class: 'gp-desc', text: def.desc })),
        el('span', { class: 'gp-tag', text: def.tag })));
    }
  }
  if (done.length) {
    main.append(el('div', { class: 'section', text: '最近玩完的' }));
    for (const t of done) main.append(tableRow(t));
  }
}

async function createTable(kind) {
  try {
    const r = await api(`/api/games/${convId}`, { method: 'POST', body: { kind } });
    state.open = r.table.id;
    upsert(r.table);
    window.scrollTo(0, 0);
  } catch (e) { toast(e.message); }
}
function openTable(id) {
  state.open = id;
  render();
  window.scrollTo(0, 0);
}

function renderTable() {
  const t = state.tables.find((x) => x.id === state.open);
  if (!t) { state.open = null; renderLobby(); return; }
  const def = GAME_DEFS[t.kind];
  $('btn-back').classList.remove('hidden');
  $('title').textContent = `${def.emoji} ${def.title}`;
  document.title = `${def.title}・小遊戲`;
  const main = $('main');
  // 正在輸入猜的數字時，盤面更新不要把打到一半的字清掉
  const focused = document.activeElement && document.activeElement.classList.contains('g-ginput');
  const typed = focused ? document.activeElement.value : null;
  const y = window.scrollY;
  main.textContent = '';
  main.append(buildGameCard(t));
  main.append(el('div', { class: 'g-by', text: `${nameOf(t.createdBy)} 開的這一桌` }));
  main.append(el('div', { class: 'table-tools' },
    el('button', {
      class: 'btn btn-ghost btn-small', type: 'button', text: '📣 在聊天室邀請大家',
      onclick: async () => {
        try { await api(`/api/games/${convId}/${t.id}`, { method: 'POST', body: { action: 'invite' } }); toast('已經在聊天室說一聲了'); } catch (e) { toast(e.message); }
      },
    }),
    t.createdBy === state.me.id ? el('button', {
      class: 'btn btn-danger btn-small', type: 'button', text: '收起這一桌',
      onclick: async () => {
        if (!(await confirmModal('收起這一桌', '這一桌會從列表拿掉，大家都看不到了，確定嗎？'))) return;
        try { await api(`/api/games/${convId}/${t.id}`, { method: 'DELETE' }); removeTable(t.id); } catch (e) { toast(e.message); }
      },
    }) : null));
  window.scrollTo(0, y);
  if (typed !== null) {
    const input = main.querySelector('.g-ginput');
    if (input) { input.value = typed; input.focus(); }
  }
}

// 2048 可以用鍵盤的方向鍵
document.addEventListener('keydown', (e) => {
  const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
  const t = state.open && state.tables.find((x) => x.id === state.open);
  if (!dir || !t || t.kind !== '2048' || t.game.holder !== state.me.id || t.game.over) return;
  e.preventDefault();
  gameAct(t, { action: 'move', dir });
});
$('btn-back').addEventListener('click', () => { state.open = null; render(); window.scrollTo(0, 0); });
$('btn-close').addEventListener('click', () => {
  window.close();
  setTimeout(() => { location.href = '/'; }, 200); // 不是用新視窗開的（關不掉），就回到聊天室
});

/* ---------- 伺服器 ---------- */

async function load() {
  const r = await api(`/api/games/${convId}`);
  state.me.id = r.me;
  state.members = new Map(r.members.map((m) => [m.id, m]));
  state.title = r.title;
  state.tables = r.tables;
  render();
}

// 只收這個聊天室的遊戲事件（不收聊天訊息）
let ws = null;
let wsRetry = 1000;
function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  ws = new WebSocket(`${proto}${location.host}/ws?games=${convId}`, ['cim.v1', 'token.' + token]);
  ws.onopen = () => {
    if (wsRetry > 1000) load().catch(() => {}); // 斷線重連：重新拿一次，補上斷線時錯過的那幾步
    wsRetry = 1000;
  };
  ws.onmessage = (e) => {
    if (e.data === 'pong') return;
    let ev;
    try { ev = JSON.parse(e.data); } catch { return; }
    if (ev.conversationId !== convId) return;
    if (ev.type === 'gametable') upsert(ev.table);
    else if (ev.type === 'gametable-removed') removeTable(ev.tableId);
  };
  ws.onclose = (e) => {
    ws = null;
    if (e.code === 4003) { $('main').textContent = '你已經不是這個聊天室的成員了'; return; }
    setTimeout(connectWs, wsRetry);
    wsRetry = Math.min(wsRetry * 2, 15000);
  };
}
setInterval(() => { if (ws && ws.readyState === 1) ws.send('ping'); }, 25000);

if (!token || !convId) {
  $('main').textContent = '請從聊天室的選單打開小遊戲';
} else {
  load().then(connectWs).catch((e) => { $('main').textContent = e.message; });
}
window.__games = { state };
