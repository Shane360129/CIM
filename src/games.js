// 小遊戲的規則：盤面、輪到誰、連線判定、2048 新數字長在哪、踩地雷的雷區、數獨題目…全部在伺服器算，
// 瀏覽器只送「我要下哪一格」。以前放在聊天訊息裡，現在搬到獨立的「🎮 小遊戲」頁面（一個聊天室可以同時開好幾桌）。
// 這個檔案只有規則（純函式），存取資料庫、權限、廣播在 chatserver.js。

// 規則不合（這一格有人下了、還沒輪到你…）丟出來的錯誤：chatserver 換成 400 回給瀏覽器
export class GameError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const HttpError = GameError;
const GAME_KINDS = {
  ooxx: { title: '圈圈叉叉', mode: 'versus', cols: 3, rows: 3, need: 3 },
  gomoku: { title: '五子棋', mode: 'versus', cols: 13, rows: 13, need: 5 },
  connect4: { title: '四子棋', mode: 'versus', cols: 7, rows: 6, need: 4 },
  reversi: { title: '黑白棋', mode: 'versus', cols: 8, rows: 8 },
  memory: { title: '記憶翻翻樂', mode: 'versus', cols: 5, rows: 4 },
  '2048': { title: '2048', mode: 'coop', cols: 4, rows: 4 },
  mine: { title: '踩地雷', mode: 'coop', cols: 9, rows: 9, mines: 10 },
  guess: { title: '猜數字 1A2B', mode: 'open', len: 4 },
  sudoku: { title: '數獨', mode: 'solo', cols: 9, rows: 9, holes: 45 },
  slide: { title: '數字推盤', mode: 'solo', cols: 4, rows: 4 },
  lights: { title: '關燈遊戲', mode: 'solo', cols: 5, rows: 5, minPresses: 6, maxPresses: 14 },
};
const GAME_IDLE = 60000; // 合作遊戲：操作者閒置超過 1 分鐘，其他人可直接接手
const MEMORY_FACES = [
  '🍎', '🍌', '🍇', '🍓', '🍑', '🍉', '🥝', '🍍', '🥑', '🌽',
  '🍔', '🍟', '🍕', '🍩', '🍰', '🍦', '🧋', '☕', '🐶', '🐱',
  '🐼', '🐸', '🐧', '🐙', '🦄', '⚽', '🚗', '🚀', '⭐', '🌈',
];

// 舊資料只存 size（正方形盤）；新資料存 cols／rows，讀取時一律正規化
const dimsOf = (g) => ({ cols: g.cols || g.size, rows: g.rows || g.size });

const randInt = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 從 idx 往四個方向數同色棋子，達到 need 顆就回傳整條連線
// （圈圈叉叉 3 顆、四子棋 4 顆、五子棋 5 顆）
function winLine(board, cols, rows, idx, player, need) {
  const r0 = Math.floor(idx / cols);
  const c0 = idx % cols;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [idx];
    for (const sign of [1, -1]) {
      let r = r0 + dr * sign;
      let c = c0 + dc * sign;
      while (r >= 0 && r < rows && c >= 0 && c < cols && board[r * cols + c] === player) {
        cells.push(r * cols + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (cells.length >= need) return cells.sort((a, b) => a - b);
  }
  return null;
}

// 2048：依移動方向把每一列／行拆成「由前往後」的索引順序
function linesFor(size, dir) {
  const lines = [];
  for (let a = 0; a < size; a++) {
    const line = [];
    for (let b = 0; b < size; b++) {
      let r, c;
      if (dir === 'left') { r = a; c = b; }
      else if (dir === 'right') { r = a; c = size - 1 - b; }
      else if (dir === 'up') { r = b; c = a; }
      else { r = size - 1 - b; c = a; }
      line.push(r * size + c);
    }
    lines.push(line);
  }
  return lines;
}

// 2048：把數字往 dir 推、相同的合併一次，回傳新盤面與這一步得分
function move2048(tiles, size, dir) {
  const out = tiles.slice();
  let gained = 0;
  let moved = false;
  for (const line of linesFor(size, dir)) {
    const vals = line.map((i) => out[i]).filter((v) => v);
    const merged = [];
    for (let k = 0; k < vals.length; k++) {
      if (k + 1 < vals.length && vals[k] === vals[k + 1]) {
        merged.push(vals[k] * 2);
        gained += vals[k] * 2;
        k++;
      } else {
        merged.push(vals[k]);
      }
    }
    while (merged.length < size) merged.push(0);
    line.forEach((idx, k) => {
      if (out[idx] !== merged[k]) moved = true;
      out[idx] = merged[k];
    });
  }
  return { tiles: out, gained, moved };
}

// 2048：在空格隨機長出一個 2（九成）或 4（一成）
function spawnTile(tiles) {
  const empty = [];
  tiles.forEach((v, i) => { if (!v) empty.push(i); });
  if (!empty.length) return -1;
  const idx = empty[randInt(empty.length)];
  tiles[idx] = randInt(10) === 0 ? 4 : 2;
  return idx;
}

// 2048：沒有空格、也沒有相鄰同數字可合併 → 結束
function stuck2048(tiles, size) {
  if (tiles.some((v) => !v)) return false;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = tiles[r * size + c];
      if (c + 1 < size && tiles[r * size + c + 1] === v) return false;
      if (r + 1 < size && tiles[(r + 1) * size + c] === v) return false;
    }
  }
  return true;
}

// 黑白棋：往八個方向找「一段對手棋子後接自己棋子」，回傳所有會被夾住翻面的位置
const REVERSI_DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

function reversiFlips(board, size, idx, player) {
  const flips = [];
  if (board[idx]) return flips;
  const r0 = Math.floor(idx / size);
  const c0 = idx % size;
  const other = player === 1 ? 2 : 1;
  for (const [dr, dc] of REVERSI_DIRS) {
    const run = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === other) {
      run.push(r * size + c);
      r += dr;
      c += dc;
    }
    if (run.length && r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === player)
      flips.push(...run);
  }
  return flips;
}

const reversiLegal = (board, size, player) => {
  const out = [];
  for (let i = 0; i < board.length; i++)
    if (!board[i] && reversiFlips(board, size, i, player).length) out.push(i);
  return out;
};

const reversiCounts = (board) => [
  board.filter((v) => v === 1).length,
  board.filter((v) => v === 2).length,
];

function reversiStart(size) {
  const board = new Array(size * size).fill(0);
  const m = size / 2;
  board[(m - 1) * size + (m - 1)] = 2;
  board[(m - 1) * size + m] = 1;
  board[m * size + (m - 1)] = 1;
  board[m * size + m] = 2;
  return board;
}

// 記憶翻翻樂：抽 N 種圖案、每種兩張，洗牌後發下去
function newMemoryCards(cols, rows) {
  const faces = shuffle(MEMORY_FACES.slice()).slice(0, (cols * rows) / 2);
  return shuffle([...faces, ...faces]);
}

// 踩地雷：第一次點開之後才佈雷，保證第一下與它周圍八格一定安全
const mineNeighbors = (cols, rows, i) => {
  const r0 = Math.floor(i / cols);
  const c0 = i % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = r0 + dr;
      const c = c0 + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) out.push(r * cols + c);
    }
  }
  return out;
};

function mineLayout(cols, rows, mines, safeIdx) {
  const safe = new Set([safeIdx, ...mineNeighbors(cols, rows, safeIdx)]);
  const pool = [];
  for (let i = 0; i < cols * rows; i++) if (!safe.has(i)) pool.push(i);
  shuffle(pool);
  const layout = new Array(cols * rows).fill(0);
  for (const i of pool.slice(0, Math.min(mines, pool.length))) layout[i] = 1;
  return layout;
}

const mineNear = (layout, cols, rows, i) =>
  mineNeighbors(cols, rows, i).filter((n) => layout[n]).length;

// 點到空白（周圍 0 顆雷）就一路往外翻開
function mineFlood(g, start) {
  const { cols, rows } = dimsOf(g);
  const queue = [start];
  while (queue.length) {
    const i = queue.pop();
    if (g.revealed[i]) continue;
    g.revealed[i] = 1;
    g.flags[i] = 0;
    if (mineNear(g.layout, cols, rows, i) === 0)
      for (const n of mineNeighbors(cols, rows, i)) if (!g.revealed[n]) queue.push(n);
  }
}

// 踩地雷送給前端的樣子：沒翻開的格子不透露有沒有雷（結束才全部掀開）
function mineView(g) {
  const { cols, rows } = dimsOf(g);
  return g.revealed.map((rev, i) => {
    if (g.over && g.layout && g.layout[i]) return i === g.boom ? 'X' : 'M';
    if (rev) return mineNear(g.layout || [], cols, rows, i);
    if (g.flags[i]) return 'F';
    return null;
  });
}

// 猜數字：不重複的 len 位數字；A＝位置與數字都對，B＝數字有但位置不對
const newSecret = (len) => shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, len).join('');

function abOf(secret, guess) {
  let a = 0;
  let b = 0;
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) a++;
    else if (secret.includes(guess[i])) b++;
  }
  return { a, b };
}

// ---------- 單人邏輯題（大家解同一題，比誰快／誰步數少） ----------

// 數獨：先用隨機回溯填出一張完整解答，再一格一格挖洞，
// 每挖一格就確認「解答仍然唯一」，不唯一就把數字放回去。
function sudokuCands(board, i) {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  const used = new Set();
  for (let k = 0; k < 9; k++) {
    used.add(board[r * 9 + k]);
    used.add(board[k * 9 + c]);
    used.add(board[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)]);
  }
  const out = [];
  for (let v = 1; v <= 9; v++) if (!used.has(v)) out.push(v);
  return out;
}

function sudokuFill(board) {
  const i = board.indexOf(0);
  if (i < 0) return true;
  for (const v of shuffle(sudokuCands(board, i))) {
    board[i] = v;
    if (sudokuFill(board)) return true;
    board[i] = 0;
  }
  return false;
}

// 數最多 limit 個解就提早收工（只想知道「是不是唯一解」）
function sudokuCount(board, limit) {
  let best = -1;
  let bestCands = null;
  for (let i = 0; i < 81; i++) {
    if (board[i]) continue;
    const cands = sudokuCands(board, i);
    if (!cands.length) return 0;
    if (!bestCands || cands.length < bestCands.length) {
      best = i;
      bestCands = cands;
      if (cands.length === 1) break;
    }
  }
  if (best < 0) return 1; // 填滿了
  let found = 0;
  for (const v of bestCands) {
    board[best] = v;
    found += sudokuCount(board, limit - found);
    board[best] = 0;
    if (found >= limit) break;
  }
  return found;
}

function newSudoku(holes) {
  const solution = new Array(81).fill(0);
  sudokuFill(solution);
  const puzzle = solution.slice();
  let removed = 0;
  for (const i of shuffle([...Array(81).keys()])) {
    if (removed >= holes) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (sudokuCount(puzzle.slice(), 2) === 1) removed++;
    else puzzle[i] = keep;
  }
  return { puzzle, solution };
}

// 數字推盤：0 是空格，完成時是 1..n-1 後面接 0
const slideSolved = (tiles) =>
  tiles.every((v, i) => (i === tiles.length - 1 ? v === 0 : v === i + 1));

// 逆序數判斷可解性（不可解的排法永遠拼不回來）
function slideSolvable(tiles, size) {
  const arr = tiles.filter((v) => v);
  let inv = 0;
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++) if (arr[i] > arr[j]) inv++;
  if (size % 2) return inv % 2 === 0;
  const fromBottom = size - Math.floor(tiles.indexOf(0) / size);
  return (fromBottom % 2 === 0) !== (inv % 2 === 0);
}

function newSlide(size) {
  let tiles;
  do {
    tiles = shuffle([...Array(size * size).keys()]);
  } while (!slideSolvable(tiles, size) || slideSolved(tiles));
  return tiles;
}

// 關燈：從全暗開始亂按幾下，按出來的盤面一定有解
function lightsToggle(cells, size, i) {
  const r = Math.floor(i / size);
  const c = i % size;
  for (const [rr, cc] of [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
    if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
    cells[rr * size + cc] ^= 1;
  }
}

// 出題：從全暗開始亂按幾下，按出來的盤面保證解得開。
// 按的次數固定的話題目變化太少（固定 8 下大約一千多題就開始重複），
// 所以每題隨機取 min–max 下。
function newLights(size, minPresses, maxPresses = minPresses) {
  const cells = new Array(size * size).fill(0);
  const span = Math.max(1, maxPresses - minPresses + 1);
  do {
    cells.fill(0);
    const presses = minPresses + randInt(span);
    for (let k = 0; k < presses; k++) lightsToggle(cells, size, randInt(size * size));
  } while (cells.every((v) => !v));
  return cells;
}

function newSoloPuzzle(kind, def) {
  if (kind === 'sudoku') return newSudoku(def.holes);
  if (kind === 'slide') return { puzzle: newSlide(def.cols), solution: null };
  return { puzzle: newLights(def.cols, def.minPresses, def.maxPresses), solution: null };
}

// 每個人自己的一盤：board 是他的進度，score 是個人最佳（都是越小越好）
const newRun = (g, now) => ({
  board: g.puzzle.slice(), moves: 0, startedAt: now, doneAt: null, lastScore: null,
});

const soloBest = (g) => Object.entries(g.players || {})
  .filter(([, p]) => p.score != null)
  .map(([uid, p]) => ({ userId: Number(uid), score: p.score, seconds: p.seconds, doneAt: p.doneAt }))
  .sort((a, b) => a.score - b.score || a.seconds - b.seconds || a.doneAt - b.doneAt);

function soloFinish(g, p, now) {
  const seconds = Math.max(1, Math.round((now - p.startedAt) / 1000));
  // 數獨比時間，推盤與關燈比步數（同分再比時間）
  const score = g.kind === 'sudoku' ? seconds : p.moves;
  p.doneAt = now;
  p.lastScore = score;
  p.seconds = p.score == null || score < p.score ? seconds : p.seconds;
  p.score = p.score == null ? score : Math.min(p.score, score);
  p.plays = (p.plays || 0) + 1;
}

function newGameState(kind, creatorId) {
  const def = GAME_KINDS[kind];
  const cells = def.cols * def.rows;
  if (def.mode === 'versus') {
    const g = {
      kind, mode: 'versus', cols: def.cols, rows: def.rows, need: def.need || null,
      seats: [creatorId, null], // 座位 0 先手；盤面的 1／2 對應座位 0／1
      turn: 0, first: 0, winner: null, line: [], last: null, moves: 0,
      score: [0, 0], draws: 0, round: 1,
    };
    if (kind === 'memory') {
      g.cards = newMemoryCards(def.cols, def.rows);
      g.owner = new Array(cells).fill(0);
      g.flipped = [];
      g.pairs = [0, 0];
    } else if (kind === 'reversi') {
      g.board = reversiStart(def.cols);
      g.counts = reversiCounts(g.board);
      g.legal = reversiLegal(g.board, def.cols, 1);
      g.passed = false;
    } else {
      g.board = new Array(cells).fill(0);
    }
    return g;
  }
  if (def.mode === 'coop') {
    const g = {
      kind, mode: 'coop', cols: def.cols, rows: def.rows,
      over: false, won: false, moves: 0,
      holder: creatorId, holderAt: Date.now(), contrib: {},
    };
    if (kind === 'mine') {
      g.mines = def.mines;
      g.layout = null; // 第一次翻開才佈雷
      g.revealed = new Array(cells).fill(0);
      g.flags = new Array(cells).fill(0);
      g.boom = -1;
      g.cleared = 0;
      g.best = 0; // 最快通關秒數
      g.startedAt = 0;
    } else {
      g.tiles = new Array(cells).fill(0);
      spawnTile(g.tiles);
      spawnTile(g.tiles);
      g.score = 0;
      g.best = 0;
    }
    return g;
  }
  if (def.mode === 'open') {
    return {
      kind, mode: 'open', len: def.len, secret: newSecret(def.len),
      guesses: [], winner: null, round: 1, moves: 0,
    };
  }
  const { puzzle, solution } = newSoloPuzzle(kind, def);
  return {
    kind, mode: 'solo', cols: def.cols, rows: def.rows,
    puzzle, solution, players: {}, round: 1, createdBy: creatorId,
  };
}

// 再來一局：對戰型換先手、保留戰績；合作型保留最佳紀錄
function resetGameState(g) {
  const { cols, rows } = dimsOf(g);
  const cells = cols * rows;
  if (g.mode === 'versus') {
    g.first = g.first ? 0 : 1;
    g.turn = g.first;
    g.winner = null;
    g.line = [];
    g.last = null;
    g.moves = 0;
    g.round += 1;
    if (g.kind === 'memory') {
      g.cards = newMemoryCards(cols, rows);
      g.owner = new Array(cells).fill(0);
      g.flipped = [];
      g.pairs = [0, 0];
    } else if (g.kind === 'reversi') {
      g.board = reversiStart(cols);
      g.counts = reversiCounts(g.board);
      g.legal = reversiLegal(g.board, cols, g.turn + 1);
      g.passed = false;
    } else {
      g.board = new Array(cells).fill(0);
    }
    return g;
  }
  if (g.mode === 'coop') {
    g.over = false;
    g.won = false;
    g.moves = 0;
    if (g.kind === 'mine') {
      g.layout = null;
      g.revealed = new Array(cells).fill(0);
      g.flags = new Array(cells).fill(0);
      g.boom = -1;
      g.cleared = 0;
      g.startedAt = 0;
    } else {
      g.best = Math.max(g.best || 0, g.score || 0);
      g.tiles = new Array(cells).fill(0);
      spawnTile(g.tiles);
      spawnTile(g.tiles);
      g.score = 0;
      g.contrib = {};
    }
    return g;
  }
  if (g.mode === 'open') {
    g.secret = newSecret(g.len);
    g.guesses = [];
    g.winner = null;
    g.moves = 0;
    g.round += 1;
    return g;
  }
  const fresh = newSoloPuzzle(g.kind, GAME_KINDS[g.kind]);
  g.puzzle = fresh.puzzle;
  g.solution = fresh.solution;
  g.players = {}; // 換新題目，排行榜跟著重來
  g.round += 1;
  return g;
}

// 送給前端前先把藏起來的資訊拿掉（牌面、雷區、答案）
function publicGame(g, viewerId) {
  if (!g) return null;
  if (g.mode === 'solo') {
    const { solution, players, ...rest } = g;
    const mine = players && viewerId != null ? players[viewerId] : null;
    return {
      ...rest,
      board: mine ? mine.board : null,
      mine: mine
        ? { moves: mine.moves, startedAt: mine.startedAt, doneAt: mine.doneAt,
            score: mine.score ?? null, seconds: mine.seconds ?? null,
            lastScore: mine.lastScore ?? null, plays: mine.plays || 0 }
        : null,
      leaderboard: soloBest(g),
      playing: Object.keys(players || {}).length,
    };
  }
  if (g.kind === 'memory') {
    const shown = new Set(g.flipped || []);
    return { ...g, cards: g.cards.map((face, i) => (g.owner[i] || shown.has(i) ? face : null)) };
  }
  if (g.kind === 'mine') {
    const { layout, ...rest } = g;
    return { ...rest, view: mineView(g) };
  }
  if (g.kind === 'guess') return g.winner ? g : { ...g, secret: null };
  return g;
}

// 圈圈叉叉／五子棋：落子後判斷連線或平手
function applyLineMove(g, seat, i) {
  const { cols, rows } = dimsOf(g);
  if (!Number.isInteger(i) || i < 0 || i >= cols * rows) throw new HttpError(400, '位置不正確');
  if (g.board[i]) throw new HttpError(400, '這一格已經有人下了');
  placePiece(g, seat, i, cols, rows);
}

// 四子棋：只指定要投哪一直行，棋子自己落到該行最底下的空格
function applyDropMove(g, seat, col) {
  const { cols, rows } = dimsOf(g);
  if (!Number.isInteger(col) || col < 0 || col >= cols) throw new HttpError(400, '沒有這一行');
  for (let r = rows - 1; r >= 0; r--) {
    const i = r * cols + col;
    if (!g.board[i]) return placePiece(g, seat, i, cols, rows);
  }
  throw new HttpError(400, '這一行滿了，換一行吧');
}

function placePiece(g, seat, i, cols, rows) {
  g.board[i] = seat + 1;
  g.last = i;
  g.moves += 1;
  const line = winLine(g.board, cols, rows, i, seat + 1, g.need);
  if (line) {
    g.winner = seat;
    g.line = line;
    g.score[seat] += 1;
  } else if (g.board.every((v) => v)) {
    g.winner = 'draw';
    g.draws += 1;
  } else {
    g.turn = seat ? 0 : 1;
  }
}

// 黑白棋：下的地方必須夾得到對手的棋子；沒地方下就自動 pass，兩邊都沒得下就數子
function applyReversiMove(g, seat, i) {
  const { cols } = dimsOf(g);
  const player = seat + 1;
  if (!Number.isInteger(i) || i < 0 || i >= g.board.length) throw new HttpError(400, '位置不正確');
  const flips = reversiFlips(g.board, cols, i, player);
  if (!flips.length) throw new HttpError(400, '這裡夾不到對方的棋子，換一格');
  g.board[i] = player;
  for (const f of flips) g.board[f] = player;
  g.last = i;
  g.line = flips;
  g.moves += 1;
  g.counts = reversiCounts(g.board);

  const next = seat ? 0 : 1;
  const nextLegal = reversiLegal(g.board, cols, next + 1);
  if (nextLegal.length) {
    g.turn = next;
    g.legal = nextLegal;
    g.passed = false;
    return;
  }
  const mineAgain = reversiLegal(g.board, cols, player);
  if (mineAgain.length) { // 對手沒得下 → 跳過對手，自己再下一手
    g.turn = seat;
    g.legal = mineAgain;
    g.passed = true;
    return;
  }
  g.legal = [];
  g.passed = false;
  const [black, white] = g.counts;
  if (black === white) {
    g.winner = 'draw';
    g.draws += 1;
  } else {
    g.winner = black > white ? 0 : 1;
    g.score[g.winner] += 1;
  }
}

// 記憶翻翻樂：翻兩張，配對成功就收下並繼續翻；翻錯換人（錯的兩張留在桌上到下次翻牌）
function applyMemoryMove(g, seat, i) {
  if (!Number.isInteger(i) || i < 0 || i >= g.cards.length) throw new HttpError(400, '沒有這張牌');
  if (g.flipped.length >= 2) g.flipped = []; // 上一輪沒配對到的兩張，這時蓋回去
  if (g.owner[i]) throw new HttpError(400, '這張已經被收走了');
  if (g.flipped.includes(i)) throw new HttpError(400, '這張已經翻開了');
  g.flipped.push(i);
  g.last = i;
  g.moves += 1;
  if (g.flipped.length < 2) return;
  const [a, b] = g.flipped;
  if (g.cards[a] === g.cards[b]) {
    g.owner[a] = seat + 1;
    g.owner[b] = seat + 1;
    g.pairs[seat] += 1;
    g.flipped = [];
    if (g.owner.every((v) => v)) {
      if (g.pairs[0] === g.pairs[1]) {
        g.winner = 'draw';
        g.draws += 1;
      } else {
        g.winner = g.pairs[0] > g.pairs[1] ? 0 : 1;
        g.score[g.winner] += 1;
      }
    }
    return; // 配對成功可以繼續翻
  }
  g.turn = seat ? 0 : 1;
}

// 踩地雷：flag 為插旗／拔旗，否則是翻開
function applyMineMove(g, i, flag, now) {
  const { cols, rows } = dimsOf(g);
  if (!Number.isInteger(i) || i < 0 || i >= cols * rows) throw new HttpError(400, '位置不正確');
  if (g.revealed[i]) throw new HttpError(400, '這一格已經翻開了');
  if (flag) {
    g.flags[i] = g.flags[i] ? 0 : 1;
    return;
  }
  if (g.flags[i]) throw new HttpError(400, '這格插了旗，要先拔旗才能翻');
  if (!g.layout) {
    g.layout = mineLayout(cols, rows, g.mines, i);
    g.startedAt = now;
  }
  g.moves += 1;
  if (g.layout[i]) {
    g.revealed[i] = 1;
    g.boom = i;
    g.over = true;
    return;
  }
  mineFlood(g, i);
  g.cleared = g.revealed.filter(Boolean).length;
  if (g.cleared >= cols * rows - g.mines) {
    g.over = true;
    g.won = true;
    const secs = Math.max(1, Math.round((now - (g.startedAt || now)) / 1000));
    g.best = g.best ? Math.min(g.best, secs) : secs;
    g.time = secs;
  }
}


function applyVersusAction(g, me, action, body) {
  const seat = g.seats.indexOf(me.id);
  if (action === 'join') {
    if (seat >= 0) throw new HttpError(400, '你已經在場上了');
    const free = g.seats.indexOf(null);
    if (free < 0) throw new HttpError(400, '兩個位子都有人了，先看他們下這局吧');
    g.seats[free] = me.id;
    return;
  }
  if (action === 'leave') {
    if (seat < 0) throw new HttpError(400, '你本來就不在場上');
    g.seats[seat] = null;
    return;
  }
  if (action === 'restart') {
    if (seat < 0 && g.seats.some((x) => x !== null))
      throw new HttpError(403, '只有場上的兩位可以重新開始');
    resetGameState(g);
    if (seat < 0) g.seats[0] = me.id;
    return;
  }
  if (action !== 'move') throw new HttpError(400, '不支援的動作');
  if (seat < 0) throw new HttpError(403, '先按「加入對戰」才能下');
  if (g.winner !== null) throw new HttpError(400, '這一局結束了，按「再來一局」吧');
  if (g.seats.some((x) => x === null)) throw new HttpError(400, '等對手加入才能開始');
  if (g.turn !== seat) throw new HttpError(400, '還沒輪到你');
  if (g.kind === 'connect4') applyDropMove(g, seat, Number(body.col));
  else if (g.kind === 'reversi') applyReversiMove(g, seat, Number(body.i));
  else if (g.kind === 'memory') applyMemoryMove(g, seat, Number(body.i));
  else applyLineMove(g, seat, Number(body.i));
}

// 開放型（猜數字）：不分座位，聊天室裡誰都能猜
function applyOpenAction(g, me, action, body) {
  if (action === 'restart') {
    resetGameState(g);
    return;
  }
  if (action !== 'move') throw new HttpError(400, '不支援的動作');
  if (g.winner) throw new HttpError(400, '這題被猜中了，按「換一題」再來一局');
  const guess = String(body.guess || '').trim();
  if (!new RegExp(`^\\d{${g.len}}$`).test(guess))
    throw new HttpError(400, `請輸入 ${g.len} 個數字`);
  if (new Set(guess).size !== g.len) throw new HttpError(400, '數字不能重複');
  const { a, b } = abOf(g.secret, guess);
  g.guesses.push({ userId: me.id, guess, a, b, at: Date.now() });
  if (g.guesses.length > 60) g.guesses = g.guesses.slice(-60);
  g.moves += 1;
  if (a === g.len) g.winner = me.id;
}

// 單人題（數獨、數字推盤、關燈）：大家解同一題，各自一盤、各自計時
function applySoloAction(g, me, action, body, now) {
  const { cols } = dimsOf(g);
  if (action === 'restart') {
    resetGameState(g);
    return;
  }
  if (action === 'start') { // 開始挑戰／重來（自己這盤）
    g.players[me.id] = { ...newRun(g, now), score: g.players[me.id]?.score ?? null,
      seconds: g.players[me.id]?.seconds ?? null, plays: g.players[me.id]?.plays || 0 };
    return;
  }
  if (action !== 'move') throw new HttpError(400, '不支援的動作');
  const p = g.players[me.id];
  if (!p) throw new HttpError(400, '請先按「開始挑戰」');
  if (p.doneAt) throw new HttpError(400, '你已經完成這題了，按「再挑戰一次」可以刷新紀錄');
  const i = Number(body.i);
  if (!Number.isInteger(i) || i < 0 || i >= p.board.length)
    throw new HttpError(400, '位置不正確');

  if (g.kind === 'sudoku') {
    if (g.puzzle[i]) throw new HttpError(400, '題目本來就有的數字不能改');
    const v = Number(body.v);
    if (!Number.isInteger(v) || v < 0 || v > 9) throw new HttpError(400, '只能填 1–9');
    if (p.board[i] === v) return;
    p.board[i] = v;
    p.moves += 1;
    if (p.board.every((x, k) => x === g.solution[k])) soloFinish(g, p, now);
    return;
  }
  if (g.kind === 'slide') {
    const blank = p.board.indexOf(0);
    const near = Math.abs(Math.floor(i / cols) - Math.floor(blank / cols)) +
      Math.abs((i % cols) - (blank % cols));
    if (near !== 1) throw new HttpError(400, '只能推動空格旁邊的數字');
    p.board[blank] = p.board[i];
    p.board[i] = 0;
    p.moves += 1;
    if (slideSolved(p.board)) soloFinish(g, p, now);
    return;
  }
  lightsToggle(p.board, cols, i);
  p.moves += 1;
  if (p.board.every((x) => !x)) soloFinish(g, p, now);
}

// 合作型（2048、踩地雷）：同一時間只有一位操作者，其他人要等他換手（閒置 1 分鐘可接手）
function applyCoopAction(g, me, action, body, now) {
  const idle = now - (g.holderAt || 0) > GAME_IDLE;
  const blocked = g.holder && g.holder !== me.id && !idle;
  if (action === 'claim') {
    if (blocked) throw new HttpError(400, '現在是別人在玩，等他按「換人玩」再接手');
    g.holder = me.id;
    g.holderAt = now;
    return;
  }
  if (action === 'release') {
    if (g.holder !== me.id) throw new HttpError(400, '你現在不是操作的人');
    g.holder = null;
    g.holderAt = now;
    return;
  }
  if (action === 'restart') {
    if (blocked) throw new HttpError(403, '現在由別人操作，不能重新開始');
    resetGameState(g);
    g.holder = me.id;
    g.holderAt = now;
    return;
  }
  if (action !== 'move') throw new HttpError(400, '不支援的動作');
  if (g.holder !== me.id) {
    throw new HttpError(403, g.holder
      ? '現在由別人操作，先請他按「換人玩」'
      : '請先按「我要玩」接手操作');
  }
  if (g.over) throw new HttpError(400, '這局結束了，按「重新開始」再來一次');
  g.holderAt = now;
  g.contrib[me.id] = (g.contrib[me.id] || 0) + 1;
  if (g.kind === 'mine') {
    applyMineMove(g, Number(body.i), !!body.flag, now);
    return;
  }
  const dir = String(body.dir || '');
  if (!['up', 'down', 'left', 'right'].includes(dir)) throw new HttpError(400, '方向不正確');
  const { cols } = dimsOf(g);
  const r = move2048(g.tiles, cols, dir);
  if (!r.moved) return; // 這個方向推不動：不算一步
  g.tiles = r.tiles;
  g.score += r.gained;
  g.moves += 1;
  spawnTile(g.tiles);
  if (g.tiles.some((v) => v >= 2048)) g.won = true;
  if (stuck2048(g.tiles, cols)) g.over = true;
  g.best = Math.max(g.best || 0, g.score);
}

// 加入座位／落子／滑動／接手／重來：依玩法分給上面四種
export function applyGameAction(g, me, body, now = Date.now()) {
  const action = String(body.action || '');
  if (g.mode === 'versus') applyVersusAction(g, me, action, body);
  else if (g.mode === 'coop') applyCoopAction(g, me, action, body, now);
  else if (g.mode === 'open') applyOpenAction(g, me, action, body);
  else applySoloAction(g, me, action, body, now);
}
export { newGameState, resetGameState, publicGame };
// 給測試用的規則小零件
export { GAME_KINDS, winLine, move2048, stuck2048, reversiFlips, reversiLegal, reversiStart, abOf, newSecret, mineLayout, mineNear, mineNeighbors };
export { newSudoku, sudokuCount, newSlide, slideSolvable, slideSolved, newLights, lightsToggle };
