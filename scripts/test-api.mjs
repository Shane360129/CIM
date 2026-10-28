#!/usr/bin/env node
// API 煙霧測試：驗證帳號可見性（隱私）規則與核心流程。
//
// 用法（需先在另一個終端機啟動本機伺服器）：
//   rm -rf .wrangler/state && npm run dev      # 乾淨資料庫，第一位註冊者自動成為管理員
//   npm test                                    # 預設打 http://127.0.0.1:8787
//
// 若資料庫已有資料，請提供既有管理員帳密：
//   TEST_ADMIN_USER=shane TEST_ADMIN_PASS=xxxxxx npm test

const B = process.env.BASE_URL || 'http://127.0.0.1:8787';
const PASS = 'pass123456';
const suffix = Date.now().toString(36).slice(-5);
const u = (n) => `t${suffix}_${n}`;

const j = async (path, opts = {}, token) => {
  const r = await fetch(B + path, {
    method: opts.method || 'GET',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const reg = (username, displayName, inviteCode) =>
  j('/api/register', { method: 'POST', body: { username, password: PASS, displayName, inviteCode } });
const seen = async (tok) => (await j('/api/users', {}, tok)).data.users.map((x) => x.username);
const has = (arr, name) => arr.includes(name);

let pass = 0, fail = 0;
const check = (label, ok, extra = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? '  →  ' + extra : ''}`);
};

const info = (await j('/api/app-info')).data;
let A0, adminUser;
if (info.firstRun) {
  const r = await reg(u('admin'), '測試管理員');
  A0 = r.data.token; adminUser = r.data.user;
  check('第一位註冊者自動成為管理員', !!adminUser?.isAdmin);
} else {
  const user = process.env.TEST_ADMIN_USER, pw = process.env.TEST_ADMIN_PASS;
  if (!user || !pw) {
    console.error('資料庫已有資料。請用乾淨資料庫（rm -rf .wrangler/state）或提供 TEST_ADMIN_USER / TEST_ADMIN_PASS。');
    process.exit(2);
  }
  const r = await j('/api/login', { method: 'POST', body: { username: user, password: pw } });
  if (r.status !== 200 || !r.data.user?.isAdmin) { console.error('管理員登入失敗或不是管理員'); process.exit(2); }
  A0 = r.data.token; adminUser = r.data.user;
}
const INVITE = 'test-' + suffix;
check('管理員設定邀請碼', (await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: INVITE } }, A0)).status === 200);

const fa = await reg(u('a'), '朋友A', INVITE);
const fb = await reg(u('b'), '朋友B', INVITE);
const fc = await reg(u('c'), '朋友C', INVITE);
check('朋友用邀請碼註冊', fa.status === 200 && fb.status === 200 && fc.status === 200);
check('沒有邀請碼不能註冊', (await reg(u('x'), 'X')).status >= 400);
const [TA, TB, TC] = [fa.data.token, fb.data.token, fc.data.token];
const [IA, IB, IC] = [fa.data.user.id, fb.data.user.id, fc.data.user.id];

console.log('\n--- 帳號可見性 ---');
const adminSees = await seen(A0);
check('管理員看得到所有新成員', has(adminSees, u('a')) && has(adminSees, u('b')) && has(adminSees, u('c')));
const aSees = await seen(TA);
check('朋友A 只看到管理員與自己', has(aSees, adminUser.username) && has(aSees, u('a')) && !has(aSees, u('b')) && !has(aSees, u('c')), aSees.join(', '));
let r = await j('/api/conversations', { method: 'POST', body: { type: 'dm', userId: IB } }, TA);
check('朋友A 私訊朋友B 被擋（403）', r.status === 403);
r = await j('/api/conversations', { method: 'POST', body: { type: 'group', name: '偷偷建群', memberIds: [IB, IC] } }, TA);
check('朋友A 建群拉 B、C 被擋（403）', r.status === 403);
r = await j('/api/conversations', { method: 'POST', body: { type: 'dm', userId: adminUser.id } }, TA);
check('朋友A 可以私訊管理員', r.status === 200);

console.log('\n--- 管理員把 A、B 拉進同一群組 ---');
r = await j('/api/conversations', { method: 'POST', body: { type: 'group', name: '測試群', memberIds: [IA, IB] } }, A0);
check('管理員建群', r.status === 200);
const groupId = r.data.conversation?.id;
check('朋友A 現在看得到 B', has(await seen(TA), u('b')));
check('朋友B 現在看得到 A', has(await seen(TB), u('a')));
check('朋友C 仍看不到 A、B', !has(await seen(TC), u('a')) && !has(await seen(TC), u('b')));
r = await j(`/api/conversations/${groupId}/members`, { method: 'POST', body: { userIds: [IC] } }, TA);
check('朋友A 想拉看不到的 C 進群被擋（403）', r.status === 403);
r = await j(`/api/conversations/${groupId}/members`, { method: 'POST', body: { userIds: [IC] } }, A0);
check('管理員可以拉 C 進群', r.status === 200);
check('C 進群後看得到 A、B', has(await seen(TC), u('a')) && has(await seen(TC), u('b')));

console.log('\n--- 訊息與權限 ---');
r = await j(`/api/conversations/${groupId}/messages`, { method: 'POST', body: { type: 'text', content: '哈囉' } }, TA);
check('群組傳訊息', r.status === 200);
const dmAdminA = (await j('/api/conversations', {}, TA)).data.conversations.find((c) => c.type === 'dm');
r = await j(`/api/conversations/${dmAdminA.id}/messages`, {}, TB);
check('朋友B 讀不到 A 與管理員的私訊（404）', r.status === 404);
check('無效 token → 401', (await j('/api/users', {}, 'bogus')).status === 401);
check('一般成員存取管理員設定 → 403', (await j('/api/admin/settings', {}, TA)).status === 403);
check('錯誤密碼登入 → 401', (await j('/api/login', { method: 'POST', body: { username: u('a'), password: 'wrong' } })).status === 401);
check('正確密碼登入 → 200', (await j('/api/login', { method: 'POST', body: { username: u('a'), password: PASS } })).status === 200);
r = await j('/api/shopping', { method: 'POST', body: { text: '測試品項 ' + suffix } }, TC);
check('購物清單附上建立者名稱', r.data.item?.createdByName === '朋友C');

console.log('\n--- 小遊戲 ---');
const newGame = (kind, tok) =>
  j(`/api/conversations/${groupId}/messages`, { method: 'POST', body: { type: 'game', content: '', game: { kind } } }, tok);
const act = (mid, body, tok) => j(`/api/messages/${mid}/game`, { method: 'POST', body }, tok);

r = await newGame('ooxx', TA);
const ooxxId = r.data.message?.id;
check('開一局圈圈叉叉，開局者自動入座', r.status === 200 && r.data.message?.game?.seats?.[0] === IA);
check('不支援的遊戲被擋', (await newGame('chess', TA)).status === 400);
check('非成員不能在別人的聊天室開遊戲', (await j(`/api/conversations/${dmAdminA.id}/messages`, { method: 'POST', body: { type: 'game', content: '', game: { kind: 'ooxx' } } }, TB)).status === 404);
check('沒入座不能下', (await act(ooxxId, { action: 'move', i: 0 }, TC)).status === 403);
check('對手加入座位', (await act(ooxxId, { action: 'join' }, TB)).data.game?.seats?.[1] === IB);
check('座位滿了不能再加入', (await act(ooxxId, { action: 'join' }, TC)).status === 400);
await act(ooxxId, { action: 'move', i: 0 }, TA);
check('還沒輪到不能下', (await act(ooxxId, { action: 'move', i: 1 }, TA)).status === 400);
check('已經有子的格子不能下', (await act(ooxxId, { action: 'move', i: 0 }, TB)).status === 400);
await act(ooxxId, { action: 'move', i: 3 }, TB);
await act(ooxxId, { action: 'move', i: 1 }, TA);
await act(ooxxId, { action: 'move', i: 4 }, TB);
r = await act(ooxxId, { action: 'move', i: 2 }, TA);
check('連成一線就判勝', r.data.game?.winner === 0 && r.data.game?.score?.[0] === 1 && r.data.game?.line?.length === 3);
check('分出勝負後不能再下', (await act(ooxxId, { action: 'move', i: 5 }, TB)).status === 400);
r = await act(ooxxId, { action: 'restart' }, TB);
check('再來一局：換先手、戰績留著', r.data.game?.turn === 1 && r.data.game?.round === 2 && r.data.game?.score?.[0] === 1);

r = await newGame('2048', TA);
const g2048 = r.data.message?.id;
check('開一局 2048（開局兩格、開局者先操作）',
  r.data.message?.game?.tiles?.filter(Boolean).length === 2 && r.data.message?.game?.holder === IA);
check('不是操作者不能動', (await act(g2048, { action: 'move', dir: 'left' }, TB)).status === 403);
check('別人操作中不能硬搶', (await act(g2048, { action: 'claim' }, TB)).status === 400);
check('方向不合法被擋', (await act(g2048, { action: 'move', dir: 'sideways' }, TA)).status === 400);
check('操作者可以換手', (await act(g2048, { action: 'release' }, TA)).status === 200);
check('換手後別人接得到', (await act(g2048, { action: 'claim' }, TB)).data.game?.holder === IB);
check('接手後可以操作', (await act(g2048, { action: 'move', dir: 'left' }, TB)).status === 200);
r = await j(`/api/conversations/${groupId}/messages`, {}, TC);
check('讀訊息會一起帶出遊戲狀態',
  r.data.messages?.filter((m) => m.type === 'game').every((m) => m.game && m.game.kind));

// 四子棋：只指定直行，棋子自己落到底；連成四顆就贏
r = await newGame('connect4', TA);
const c4 = r.data.message?.id;
check('開一局四子棋（7×6 空盤）', r.data.message?.game?.board?.length === 42);
await act(c4, { action: 'join' }, TB);
const drop = (tok, col) => act(c4, { action: 'move', col }, tok);
check('沒有這一行會被擋', (await drop(TA, 9)).status === 400);
for (let k = 0; k < 3; k++) { await drop(TA, k); await drop(TB, 6); }
r = await drop(TA, 3);
check('底列連成四顆就贏', r.data.game?.winner === 0 && r.data.game?.line?.length === 4);

// 黑白棋：只能下在夾得到對手棋子的地方
r = await newGame('reversi', TA);
const rv = r.data.message?.id;
check('黑白棋開局中央四子＋四個合法點',
  r.data.message?.game?.counts?.join() === '2,2' && r.data.message?.game?.legal?.length === 4);
await act(rv, { action: 'join' }, TB);
check('夾不到的位置被擋', (await act(rv, { action: 'move', i: 0 }, TA)).status === 400);
r = await act(rv, { action: 'move', i: 19 }, TA);
check('夾住就翻面（黑 4 白 1）', r.data.game?.counts?.join() === '4,1' && r.data.game?.turn === 1);

// 記憶翻翻樂：蓋著的牌伺服器不會送牌面
r = await newGame('memory', TA);
const mem = r.data.message?.id;
check('記憶翻翻樂發 20 張、全部蓋著',
  r.data.message?.game?.cards?.length === 20 &&
  r.data.message.game.cards.every((c) => c === null));
await act(mem, { action: 'join' }, TB);
r = await act(mem, { action: 'move', i: 0 }, TA);
check('翻開的那張才看得到圖案',
  typeof r.data.game?.cards?.[0] === 'string' && r.data.game.cards[1] === null);
check('同一張不能翻兩次', (await act(mem, { action: 'move', i: 0 }, TA)).status === 400);

// 踩地雷：雷區不會外洩，第一下保證安全
r = await newGame('mine', TA);
const ms = r.data.message?.id;
check('踩地雷開局 81 格全蓋著、沒有雷區資料',
  r.data.message?.game?.view?.length === 81 &&
  r.data.message.game.view.every((v) => v === null) &&
  r.data.message.game.layout === undefined);
r = await act(ms, { action: 'move', i: 40 }, TA);
check('第一下一定不會爆炸', r.data.game?.over === false && r.data.game?.view?.[40] !== 'X');
check('傳給前端的狀態仍然不含雷區', r.data.game?.layout === undefined);
// 第一下會把一整片空白翻開，所以要挑一個「還蓋著」的格子來插旗
const stillCovered = r.data.game.view.findIndex((v) => v === null);
r = await act(ms, { action: 'move', i: stillCovered, flag: true }, TA);
check('可以插旗', r.data.game?.view?.[stillCovered] === 'F');
check('插旗會從剩餘雷數扣掉',
  r.data.game.view.filter((v) => v === 'F').length === 1);
check('不是操作者不能翻', (await act(ms, { action: 'move', i: 8 }, TB)).status === 403);

// 猜數字：大家都能猜，答案不會先送出去
r = await newGame('guess', TA);
const gs = r.data.message?.id;
check('猜數字開局不會洩漏答案', r.data.message?.game?.secret === null);
check('位數不對被擋', (await act(gs, { action: 'move', guess: '123' }, TB)).status === 400);
check('數字重複被擋', (await act(gs, { action: 'move', guess: '1123' }, TB)).status === 400);
r = await act(gs, { action: 'move', guess: '0123' }, TC);
const hint = r.data.game?.guesses?.[0];
check('任何成員都能猜，並算出 A／B',
  hint?.userId === IC && hint.a + hint.b <= 4 && r.data.game.secret === null);
// 用 A／B 回饋一路縮小候選，驗證猜中會公布答案（通常 6～8 次就中）
const ab = (secret, guess) => {
  let a = 0, b = 0;
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) a++;
    else if (secret.includes(guess[i])) b++;
  }
  return a + '/' + b;
};
let cands = [];
for (const p1 of '0123456789') for (const p2 of '0123456789') for (const p3 of '0123456789') for (const p4 of '0123456789') {
  const g4 = p1 + p2 + p3 + p4;
  if (new Set(g4).size === 4) cands.push(g4);
}
let solved = null;
let tries = 0;
let guess = cands[0];
while (!solved && tries < 30 && cands.length) { // 依序挑候選最壞情況約 11 次，留寬一點
  tries++;
  const res = await act(gs, { action: 'move', guess }, TA);
  if (res.data.game?.winner) { solved = res.data.game; break; }
  const last = res.data.game.guesses.at(-1);
  const want = last.a + '/' + last.b;
  cands = cands.filter((c) => ab(c, guess) === want);
  guess = cands[0];
}
check(`用 A／B 提示 ${tries} 次內猜中，並公布答案`, solved?.winner === IA && typeof solved?.secret === 'string');
check('猜中後不能再猜', (await act(gs, { action: 'move', guess: '9876' }, TB)).status === 400);
r = await act(gs, { action: 'restart' }, TB);
check('換一題會重新出題', r.data.game?.round === 2 && r.data.game?.guesses?.length === 0 && r.data.game?.secret === null);

console.log('\n--- 單人邏輯題與排行榜 ---');
// 數獨：大家解同一題，答案不會送到前端，完成時間上排行榜
r = await newGame('sudoku', TA);
const sk = r.data.message?.id;
const skGame = r.data.message?.game;
check('開一題數獨（9×9、挖 45 格）',
  skGame?.puzzle?.length === 81 && skGame.puzzle.filter((v) => !v).length === 45);
check('數獨答案不會送到前端', skGame?.solution === undefined && skGame?.board === null);
check('沒按開始不能填', (await act(sk, { action: 'move', i: 0, v: 1 }, TA)).status === 400);
r = await act(sk, { action: 'start' }, TA);
check('開始挑戰後拿到自己的盤面', r.data.game?.board?.length === 81 && r.data.game?.mine?.moves === 0);
const firstHole = r.data.game.puzzle.findIndex((v) => !v);
const firstGiven = r.data.game.puzzle.findIndex((v) => v);
check('題目原本就有的數字不能改',
  (await act(sk, { action: 'move', i: firstGiven, v: 5 }, TA)).status === 400);
check('只能填 1–9', (await act(sk, { action: 'move', i: firstHole, v: 10 }, TA)).status === 400);
r = await act(sk, { action: 'move', i: firstHole, v: 7 }, TA);
check('填得進去、會算步數', r.data.game?.board?.[firstHole] === 7 && r.data.game?.mine?.moves === 1);
// B 也開同一題，看到的是自己的空盤面
r = await act(sk, { action: 'start' }, TB);
check('每個人各自一盤（B 的盤面沒有 A 填的字）',
  r.data.game?.board?.[firstHole] === 0 && r.data.game?.mine?.moves === 0);
check('B 看到的排行榜還是空的', (r.data.game?.leaderboard || []).length === 0);

// 關燈：把伺服器給的盤面照著按回去，完成就上排行榜
r = await newGame('lights', TA);
const lg = r.data.message?.id;
r = await act(lg, { action: 'start' }, TA);
let cells = r.data.game.board.slice();
check('關燈開局不是全暗', cells.some((v) => v));
const toggle = (arr, i) => {
  const rr = Math.floor(i / 5), cc = i % 5;
  for (const [a, b] of [[rr, cc], [rr - 1, cc], [rr + 1, cc], [rr, cc - 1], [rr, cc + 1]])
    if (a >= 0 && a < 5 && b >= 0 && b < 5) arr[a * 5 + b] ^= 1;
};
// 逐列往下推，最後一列用查表解；這裡直接暴力試 32 種第一列按法
let lightsSol = null;
for (let mask = 0; mask < 32 && !lightsSol; mask++) {
  const sim = cells.slice();
  const press = [];
  for (let c = 0; c < 5; c++) if (mask & (1 << c)) { toggle(sim, c); press.push(c); }
  for (let rr = 1; rr < 5; rr++)
    for (let c = 0; c < 5; c++)
      if (sim[(rr - 1) * 5 + c]) { toggle(sim, rr * 5 + c); press.push(rr * 5 + c); }
  if (sim.every((v) => !v)) lightsSol = press;
}
check('關燈盤面一定有解', !!lightsSol);
let lgGame = null;
for (const i of lightsSol) lgGame = (await act(lg, { action: 'move', i }, TA)).data.game;
check('全部關掉就完成，並記下步數',
  lgGame?.mine?.doneAt > 0 && lgGame?.mine?.score === lightsSol.length);
check('完成後上排行榜',
  lgGame?.leaderboard?.[0]?.userId === IA && lgGame.leaderboard[0].score === lightsSol.length);
check('完成後不能再按', (await act(lg, { action: 'move', i: 0 }, TA)).status === 400);

// 推盤：把空格旁邊的數字推過去
r = await newGame('slide', TA);
const sp = r.data.message?.id;
r = await act(sp, { action: 'start' }, TA);
const tiles = r.data.game.board;
check('推盤發 16 格、含一個空格', tiles.length === 16 && tiles.includes(0));
const blank = tiles.indexOf(0);
const far = [...Array(16).keys()].find((i) => {
  const d = Math.abs(Math.floor(i / 4) - Math.floor(blank / 4)) + Math.abs((i % 4) - (blank % 4));
  return d > 1;
});
check('離空格太遠的推不動', (await act(sp, { action: 'move', i: far }, TA)).status === 400);
const near = [...Array(16).keys()].find((i) => {
  const d = Math.abs(Math.floor(i / 4) - Math.floor(blank / 4)) + Math.abs((i % 4) - (blank % 4));
  return d === 1;
});
r = await act(sp, { action: 'move', i: near }, TA);
check('空格旁邊的推得動', r.data.game?.board?.[near] === 0 && r.data.game?.mine?.moves === 1);

// 換一題：排行榜歸零
r = await act(lg, { action: 'restart' }, TB);
check('換一題後排行榜歸零、盤面換新',
  (r.data.game?.leaderboard || []).length === 0 && r.data.game?.round === 2 && r.data.game?.board === null);

// 收尾：關閉邀請碼
await j('/api/admin/settings', { method: 'PATCH', body: { inviteCode: '' } }, A0);

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
