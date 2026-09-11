#!/usr/bin/env node
// 小遊戲規則的單元測試（不需要啟動伺服器）：
//   npm run test:games
// 直接匯入 src/chatserver.js 匯出的純函式，驗證 2048 的滑動合併與死局判定、
// 以及圈圈叉叉／五子棋共用的連線判定。

import { move2048, stuck2048, winLine } from '../src/chatserver.js';

let pass = 0;
let fail = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${label}${ok ? '' : `  →  得到 ${JSON.stringify(got)}，應為 ${JSON.stringify(want)}`}`);
};
const row = (tiles, r) => tiles.slice(r * 4, r * 4 + 4);
const col = (tiles, c) => [0, 1, 2, 3].map((r) => tiles[r * 4 + c]);
const grid = (...rows) => rows.flat();
const empty = [0, 0, 0, 0];

console.log('--- 2048 ---');
let r = move2048(grid([2, 2, 4, 4], empty, empty, empty), 4, 'left');
check('往左：相同數字合併', row(r.tiles, 0), [4, 8, 0, 0]);
check('往左：合併的數字就是得分', r.gained, 12);
check('有東西動到就算一步', r.moved, true);

r = move2048(grid([4, 4, 8, 0], empty, empty, empty), 4, 'left');
check('同一步不會連鎖合併兩次', row(r.tiles, 0), [8, 8, 0, 0]);

r = move2048(grid([0, 2, 0, 2], empty, empty, empty), 4, 'right');
check('往右：靠右合併', row(r.tiles, 0), [0, 0, 0, 4]);

const column = grid([2, 0, 0, 0], [2, 0, 0, 0], [4, 0, 0, 0], empty);
check('往上：直行合併', col(move2048(column, 4, 'up').tiles, 0), [4, 4, 0, 0]);
check('往下：直行合併', col(move2048(column, 4, 'down').tiles, 0), [0, 0, 4, 4]);

const jammed = grid([2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]);
check('推不動時不算一步', move2048(jammed, 4, 'left').moved, false);
check('滿盤又無法合併 → 結束', stuck2048(jammed, 4), true);
check('還有得合併就沒結束', stuck2048(grid([2, 2, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]), 4), false);
check('還有空格就沒結束', stuck2048(grid([0, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]), 4), false);

console.log('\n--- 連線判定（圈圈叉叉 3 顆／五子棋 5 顆）---');
check('圈圈叉叉：直行三顆', winLine([1, 0, 0, 1, 0, 0, 1, 0, 0], 3, 6, 1, 3), [0, 3, 6]);
check('圈圈叉叉：斜線三顆', winLine([2, 0, 0, 0, 2, 0, 0, 0, 2], 3, 4, 2, 3), [0, 4, 8]);
check('圈圈叉叉：只有兩顆不算', winLine([1, 0, 0, 1, 0, 0, 0, 0, 0], 3, 3, 1, 3), null);

const board = new Array(169).fill(0);
[3, 16, 29, 42, 55].forEach((i) => { board[i] = 2; });
check('五子棋：直排五顆', winLine(board, 13, 42, 2, 5), [3, 16, 29, 42, 55]);
const diag = new Array(169).fill(0);
[28, 42, 56, 70, 84].forEach((i) => { diag[i] = 1; });
check('五子棋：斜線五顆', winLine(diag, 13, 56, 1, 5), [28, 42, 56, 70, 84]);
const four = new Array(169).fill(0);
[28, 42, 56, 70].forEach((i) => { four[i] = 1; });
check('五子棋：四顆還不算贏', winLine(four, 13, 56, 1, 5), null);
// 棋盤邊界不會繞回下一列
const edge = new Array(169).fill(0);
[10, 11, 12, 13, 14].forEach((i) => { edge[i] = 1; });
check('五子棋：跨列不算連線', winLine(edge, 13, 12, 1, 5), null);

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
