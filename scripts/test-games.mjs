#!/usr/bin/env node
// 小遊戲規則的單元測試（不需要啟動伺服器）：
//   npm run test:games
// 直接匯入 src/chatserver.js 匯出的純函式，驗證 2048 的滑動合併與死局判定、
// 圈圈叉叉／四子棋／五子棋共用的連線判定、黑白棋夾翻規則、
// 猜數字的 A／B 計算，以及踩地雷的佈雷與周圍雷數。

import {
  move2048, stuck2048, winLine, reversiFlips, reversiLegal, reversiStart,
  abOf, newSecret, mineLayout, mineNear, mineNeighbors, GAME_KINDS,
  newSudoku, sudokuCount, newSlide, slideSolvable, slideSolved, newLights, lightsToggle,
} from '../src/chatserver.js';

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

console.log('\n--- 連線判定（圈圈叉叉 3 顆／四子棋 4 顆／五子棋 5 顆）---');
check('圈圈叉叉：直行三顆', winLine([1, 0, 0, 1, 0, 0, 1, 0, 0], 3, 3, 6, 1, 3), [0, 3, 6]);
check('圈圈叉叉：斜線三顆', winLine([2, 0, 0, 0, 2, 0, 0, 0, 2], 3, 3, 4, 2, 3), [0, 4, 8]);
check('圈圈叉叉：只有兩顆不算', winLine([1, 0, 0, 1, 0, 0, 0, 0, 0], 3, 3, 3, 1, 3), null);

const board = new Array(169).fill(0);
[3, 16, 29, 42, 55].forEach((i) => { board[i] = 2; });
check('五子棋：直排五顆', winLine(board, 13, 13, 42, 2, 5), [3, 16, 29, 42, 55]);
const diag = new Array(169).fill(0);
[28, 42, 56, 70, 84].forEach((i) => { diag[i] = 1; });
check('五子棋：斜線五顆', winLine(diag, 13, 13, 56, 1, 5), [28, 42, 56, 70, 84]);
const four = new Array(169).fill(0);
[28, 42, 56, 70].forEach((i) => { four[i] = 1; });
check('五子棋：四顆還不算贏', winLine(four, 13, 13, 56, 1, 5), null);
// 棋盤邊界不會繞回下一列
const edge = new Array(169).fill(0);
[10, 11, 12, 13, 14].forEach((i) => { edge[i] = 1; });
check('五子棋：跨列不算連線', winLine(edge, 13, 13, 12, 1, 5), null);

// 四子棋是 7 行 6 列的長方形盤，索引換算不能用正方形假設
const c4 = new Array(42).fill(0);
[35, 29, 23, 17].forEach((i) => { c4[i] = 1; });   // 左下往右上的斜線
check('四子棋：斜線四顆', winLine(c4, 7, 6, 23, 1, 4), [17, 23, 29, 35]);
const c4row = new Array(42).fill(0);
[36, 37, 38, 39].forEach((i) => { c4row[i] = 2; }); // 底列連四
check('四子棋：橫排四顆', winLine(c4row, 7, 6, 38, 2, 4), [36, 37, 38, 39]);
const c4wrap = new Array(42).fill(0);
[5, 6, 7, 8].forEach((i) => { c4wrap[i] = 1; });    // 5,6 在第一列、7,8 在第二列
check('四子棋：跨列不算連線', winLine(c4wrap, 7, 6, 6, 1, 4), null);

console.log('\n--- 黑白棋 ---');
const rv = reversiStart(8);
check('開局中央四子', [rv[27], rv[28], rv[35], rv[36]], [2, 1, 1, 2]);
check('開局黑棋有四個合法點', reversiLegal(rv, 8, 1).sort((a, b) => a - b), [19, 26, 37, 44]);
check('下在 19 會夾翻 27', reversiFlips(rv, 8, 19, 1), [27]);
check('夾不到就不能下', reversiFlips(rv, 8, 20, 1), []);
check('已經有子的地方不能下', reversiFlips(rv, 8, 27, 1), []);

console.log('\n--- 猜數字 1A2B ---');
check('位置與數字都對＝A', abOf('1234', '1234'), { a: 4, b: 0 });
check('數字對位置錯＝B', abOf('1234', '4321'), { a: 0, b: 4 });
check('混合計算', abOf('1234', '1243'), { a: 2, b: 2 });
check('完全沒中', abOf('1234', '5678'), { a: 0, b: 0 });
const secret = newSecret(4);
check('出題為 4 位不重複數字', secret.length === 4 && new Set(secret).size === 4, true);

console.log('\n--- 踩地雷 ---');
const { cols, rows, mines } = GAME_KINDS.mine;
const layout = mineLayout(cols, rows, mines, 40);
check('雷數正確', layout.filter(Boolean).length, mines);
check('第一下與周圍八格保證無雷',
  [40, ...mineNeighbors(cols, rows, 40)].some((i) => layout[i]), false);
const tiny = [0, 1, 0, 1, 0, 0, 0, 0, 0]; // 3×3，兩顆雷在 1、3
check('周圍雷數：中央', mineNear(tiny, 3, 3, 4), 2);
check('周圍雷數：角落', mineNear(tiny, 3, 3, 8), 0);
check('邊界不會繞到另一邊', mineNear([1, 0, 0, 0, 0, 0, 0, 0, 0], 3, 3, 5), 0);

console.log('\n--- 單人邏輯題 ---');
const t0 = Date.now();
const sd = newSudoku(GAME_KINDS.sudoku.holes);
check('數獨出題：解答填滿 81 格', sd.solution.filter(Boolean).length, 81);
check('數獨出題：挖掉 45 格', sd.puzzle.filter((v) => !v).length, GAME_KINDS.sudoku.holes);
check('數獨出題：題目與解答不衝突',
  sd.puzzle.every((v, i) => !v || v === sd.solution[i]), true);
check('數獨出題：解答唯一', sudokuCount(sd.puzzle.slice(), 3), 1);
const rows9 = [...Array(9).keys()].map((r) => sd.solution.slice(r * 9, r * 9 + 9));
check('數獨解答：每列 1–9 不重複',
  rows9.every((r) => new Set(r).size === 9), true);
check('數獨解答：每行 1–9 不重複',
  [...Array(9).keys()].every((c) => new Set(rows9.map((r) => r[c])).size === 9), true);
check('數獨解答：每宮 1–9 不重複',
  [...Array(9).keys()].every((b) => {
    const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3;
    const cells = [];
    for (let k = 0; k < 9; k++) cells.push(sd.solution[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)]);
    return new Set(cells).size === 9;
  }), true);
console.log(`   （出一題花了 ${Date.now() - t0} ms）`);

const sl = newSlide(4);
check('推盤：16 格不重複', new Set(sl).size, 16);
check('推盤：一定推得回來', slideSolvable(sl, 4), true);
check('推盤：開局不能剛好已完成', slideSolved(sl), false);
check('推盤完成判定', slideSolved([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0]), true);
// 已知不可解的排法（只交換最後兩塊）
check('推盤：不可解的排法會被擋掉',
  slideSolvable([1,2,3,4,5,6,7,8,9,10,11,12,13,15,14,0], 4), false);

const { minPresses, maxPresses } = GAME_KINDS.lights;
const lt = newLights(5, minPresses, maxPresses);
check('關燈：開局不是全暗', lt.some((v) => v), true);
// 出題按的次數是隨機的，題目才不會一千多題就開始重複
check('關燈：出題盤面會變化', new Set(
  [...Array(200).keys()].map(() => newLights(5, minPresses, maxPresses).join(''))).size > 150, true);
const cells = [0,0,0, 0,0,0, 0,0,0];
lightsToggle(cells, 3, 4);
check('關燈：按中間會連十字一起翻', cells, [0,1,0, 1,1,1, 0,1,0]);
lightsToggle(cells, 3, 0);
check('關燈：角落只翻三格（不繞到另一邊）', cells, [1,0,0, 0,1,1, 0,1,0]);

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
