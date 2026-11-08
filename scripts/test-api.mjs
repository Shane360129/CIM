#!/usr/bin/env node
// API 煙霧測試：驗證帳號可見性（隱私）規則、聊天核心功能、待辦行事曆、家族牧場、管理員功能，以及速度與備份上限。
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

console.log('\n--- 聊天核心功能 ---');
const postIn = (cid, body, tok) => j(`/api/conversations/${cid}/messages`, { method: 'POST', body }, tok);
const listIn = async (cid, tok) => (await j(`/api/conversations/${cid}/messages`, {}, tok)).data.messages || [];

r = await postIn(groupId, { type: 'text', content: '晚上回家吃飯嗎？' }, TA);
const askMsg = r.data.message;
check('傳文字訊息', r.status === 200 && askMsg?.content === '晚上回家吃飯嗎？');

r = await postIn(groupId, { type: 'text', content: '會！', replyTo: askMsg.id }, TB);
check('回覆會帶著被引用訊息的摘要', r.data.message?.meta?.reply?.text === '晚上回家吃飯嗎？');

r = await j(`/api/messages/${askMsg.id}/react`, { method: 'POST', body: { emoji: '👍' } }, TB);
check('表情回應', r.status === 200 && r.data.reactions?.some((x) => x.emoji === '👍' && x.users.includes(IB)));

r = await j(`/api/conversations/${groupId}/read`, { method: 'POST', body: { lastMessageId: askMsg.id } }, TC);
const readInfo = await j(`/api/conversations/${groupId}/messages`, {}, TA);
check('已讀進度有記錄', readInfo.data.members?.some((x) => x.userId === IC && x.lastReadId >= askMsg.id));

r = await postIn(groupId, { type: 'poll', content: '', poll: { q: '週末去哪？', options: ['爬山', '看電影'] } }, TA);
const pollMsg = r.data.message;
check('發起投票', r.status === 200 && pollMsg?.type === 'poll');
r = await j(`/api/messages/${pollMsg.id}/vote`, { method: 'POST', body: { opt: 1 } }, TB);
check('投票', r.status === 200 && r.data.votes?.some((v) => v.userId === IB && v.opt === 1));
check('投不存在的選項被擋', (await j(`/api/messages/${pollMsg.id}/vote`, { method: 'POST', body: { opt: 9 } }, TB)).status === 400);

r = await j(`/api/conversations/${groupId}/pin`, { method: 'POST', body: { messageId: askMsg.id } }, TA);
check('設定公告', r.status === 200);
check('公告出現在聊天室資訊裡',
  (await j(`/api/conversations/${groupId}/messages`, {}, TB)).data.pinned?.id === askMsg.id);

r = await postIn(groupId, { type: 'text', content: '打錯字了' }, TA);
const oops = r.data.message;
check('收回自己的訊息', (await j(`/api/messages/${oops.id}/unsend`, { method: 'POST' }, TA)).status === 200);
check('收回後內容清空', (await listIn(groupId, TB)).find((x) => x.id === oops.id)?.deleted === true);

r = await j('/api/search?q=' + encodeURIComponent('回家吃飯'), {}, TB);
check('搜尋得到群組裡的訊息', (r.data.results || []).some((x) => x.id === askMsg.id));

// 1×1 的 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
r = await postIn(groupId, { type: 'image', content: PNG }, TA);
const imgMsg = r.data.message;
check('傳照片後訊息只帶網址、不夾帶圖片內容', imgMsg?.content === '' && String(imgMsg?.meta?.media).startsWith('/api/media/'));
const fetched = await fetch(B + imgMsg.meta.media);
check('照片網址拿得到圖', fetched.status === 200 && fetched.headers.get('content-type') === 'image/png');
const convList = (await j('/api/conversations', {}, TB)).data.conversations || [];
check('聊天室清單的最後一則不夾帶圖片內容', convList.find((c) => c.id === groupId)?.lastMessage?.content === '');

const AUDIO = 'data:audio/webm;base64,' + Buffer.from('fake-audio').toString('base64');
r = await postIn(groupId, { type: 'audio', content: AUDIO, duration: 3 }, TA);
check('傳語音訊息', r.status === 200 && r.data.message?.meta?.duration === 3);

check('已移除的小遊戲訊息類型會被拒絕', (await postIn(groupId, { type: 'game', content: '', game: { kind: 'ooxx' } }, TA)).status === 400);

console.log('\n--- 貼圖、待辦、行事曆 ---');
r = await j('/api/stickers', { method: 'POST', body: { image: PNG } }, TA);
const stk = r.data.sticker;
check('新增自訂貼圖', r.status === 200 && !!stk?.id);
check('別人不能刪我的貼圖', (await j(`/api/stickers/${stk.id}`, { method: 'DELETE' }, TB)).status === 403);
check('自己可以刪自己的貼圖', (await j(`/api/stickers/${stk.id}`, { method: 'DELETE' }, TA)).status === 200);

r = await j('/api/shopping', { method: 'POST', body: { text: '買牛奶' } }, TA);
const item = r.data.item;
r = await j(`/api/shopping/${item.id}`, { method: 'PATCH', body: { done: true } }, TB);
check('待辦打勾並記下是誰完成的', r.data.item?.done === true && r.data.item?.doneByName === '朋友B');
check('刪除待辦', (await j(`/api/shopping/${item.id}`, { method: 'DELETE' }, TA)).status === 200);

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
r = await j('/api/events', { method: 'POST', body: { title: '阿嬤生日', date: tomorrow, time: '18:00', remindAt: Date.now() + 86400000 } }, TA);
const ev = r.data.event;
check('新增行事曆', r.status === 200 && ev?.title === '阿嬤生日' && ev?.reminded === false);
check('行事曆所有人都看得到', ((await j('/api/events', {}, TB)).data.events || []).some((x) => x.id === ev.id));
check('日期格式錯誤被擋', (await j('/api/events', { method: 'POST', body: { title: 'x', date: '明天', remindAt: Date.now() } }, TA)).status === 400);
check('刪除行事曆', (await j(`/api/events/${ev.id}`, { method: 'DELETE' }, TA)).status === 200);

const medianMs = async (fn, reps = 7) => {
  const t = [];
  for (let k = 0; k < reps; k++) { const s0 = performance.now(); await fn(); t.push(performance.now() - s0); }
  return t.sort((x, y) => x - y)[Math.floor(reps / 2)];
};

console.log('\n--- 家族牧場 ---');
const farmGet = (cid, tok) => j(`/api/farm/${cid}`, {}, tok);
const farmDo = (cid, body, tok) => j(`/api/farm/${cid}`, { method: 'POST', body }, tok);
r = await farmGet(groupId, TA);
const fs0 = r.data;
check('第一次打開就開墾牧場（500 元、9 包小白菜種子、體力 60）',
  r.status === 200 && fs0.farm?.money === 500 && fs0.items?.['seed:bokchoy'] === 9 && fs0.energy?.now === 60 && fs0.energy?.max === 60);
check('地圖 30×20', fs0.map?.length === 20 && fs0.map.every((row) => row.length === 30));
check('有季節、今天和明天的天氣、換季時間',
  ['spring', 'summer', 'autumn', 'winter'].includes(fs0.season) && ['sun', 'cloud', 'rain'].includes(fs0.weather?.today)
  && ['sun', 'cloud', 'rain'].includes(fs0.weather?.tomorrow) && fs0.seasonEndsAt > Date.now(), `${fs0.season} ${JSON.stringify(fs0.weather)}`);
// 測試要在一年四季都能跑：從伺服器給的作物表挑「這一季有賣」和「這一季沒賣」的
const cropIds = Object.keys(fs0.crops || {});
const inSeasonNow = (id) => fs0.crops[id].seasons.includes(fs0.season);
const buyable = cropIds.filter((id) => id !== 'bokchoy' && inSeasonNow(id) && !fs0.crops[id].regrow)
  .sort((a, b) => fs0.crops[a].seed - fs0.crops[b].seed)[0];
const offSeason = cropIds.find((id) => !inSeasonNow(id));
const regrowCrop = cropIds.filter((id) => inSeasonNow(id) && fs0.crops[id].regrow).sort((a, b) => fs0.crops[a].hours - fs0.crops[b].hours)[0];
check('這一季有別的種子可以買、也有不是這一季的、也有會再長的', !!buyable && !!offSeason && !!regrowCrop, `${buyable} / ${offSeason} / ${regrowCrop}`);
await farmGet(groupId, TB);
const farmSys = (await listIn(groupId, TA)).filter((m) => m.type === 'system' && m.content.includes('開墾了家族牧場'));
check('聊天室出現「開墾了家族牧場」，而且只出現一次', farmSys.length === 1, farmSys.map((m) => m.content).join(' / '));
const fields = [];
fs0.map.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'F') fields.push({ x, y }); }));
const [f1, f2] = fields;
r = await farmDo(groupId, { action: 'till', ...f1 }, TA);
check('翻土花 2 點體力', r.status === 200 && r.data.energy === 58 && r.data.tile?.tilled === true);
check('同一塊不能再翻一次', (await farmDo(groupId, { action: 'till', ...f1 }, TA)).status === 400);
check('田地外面不能翻土', (await farmDo(groupId, { action: 'till', x: 5, y: 5 }, TA)).status === 400);
check('座標亂填被擋', (await farmDo(groupId, { action: 'till', x: 'a', y: 1.5 }, TA)).status === 400);
check('沒翻土不能播種', (await farmDo(groupId, { action: 'plant', crop: 'bokchoy', ...f2 }, TA)).status === 400);
check('沒有的種子不能種', (await farmDo(groupId, { action: 'plant', crop: buyable, ...f1 }, TA)).status === 400);
r = await farmDo(groupId, { action: 'plant', crop: offSeason, ...f1 }, TA);
check('不是這一季的作物不能種', r.status === 400 && /才能種/.test(r.data.error || ''), r.data.error);
r = await farmDo(groupId, { action: 'plant', crop: 'bokchoy', ...f1 }, TA);
check('播種用掉一包種子', r.status === 200 && r.data.items['seed:bokchoy'] === 8 && r.data.tile?.crop === 'bokchoy' && r.data.tile.stage === 0);
check('已經種了的地不能再種', (await farmDo(groupId, { action: 'plant', crop: 'bokchoy', ...f1 }, TA)).status === 400);
r = await farmDo(groupId, { action: 'water', ...f1 }, TA);
check('澆水後土是濕的（約 24 小時）', r.status === 200 && r.data.tile.wetUntil > Date.now());
check('還沒成熟不能收成', (await farmDo(groupId, { action: 'harvest', ...f1 }, TA)).status === 400);
r = await farmGet(groupId, TB);
check('朋友B 看到同一塊田（全家共用）', r.data.tiles?.some((t) => t.x === f1.x && t.y === f1.y && t.crop === 'bokchoy'));
check('體力是每人各自的（朋友B 還是 60）', r.data.energy?.now === 60);
const price1 = fs0.crops[buyable].seed;
r = await farmDo(groupId, { action: 'buy', item: 'seed:' + buyable, qty: 1 }, TB);
check(`買 1 包${fs0.crops[buyable].name}種子 500 → ${500 - price1}（錢全家共用）`,
  r.status === 200 && r.data.money === 500 - price1 && r.data.items['seed:' + buyable] === 1);
let money = 500 - price1;
r = await farmDo(groupId, { action: 'buy', item: 'seed:' + offSeason, qty: 1 }, TB);
check('這一季沒賣的種子買不到', r.status === 400 && /才有賣/.test(r.data.error || ''), r.data.error);
check('錢不夠不能買', (await farmDo(groupId, { action: 'buy', item: 'seed:' + buyable, qty: 99 }, TB)).status === 400);
check('商店不賣作物', (await farmDo(groupId, { action: 'buy', item: 'crop:' + buyable, qty: 1 }, TB)).status === 400);
check('數量亂填被擋', (await farmDo(groupId, { action: 'buy', item: 'seed:' + buyable, qty: -1 }, TB)).status === 400
  && (await farmDo(groupId, { action: 'buy', item: 'seed:' + buyable, qty: 1.5 }, TB)).status === 400);
check('沒這種東西被擋', (await farmDo(groupId, { action: 'buy', item: 'seed:durian', qty: 1 }, TB)).status === 400);
check('倉庫沒作物不能出貨', (await farmDo(groupId, { action: 'ship', item: 'crop:bokchoy', qty: 1 }, TB)).status === 400);
check('不認識的動作被擋', (await farmDo(groupId, { action: 'steal' }, TB)).status === 400);
// 朋友B 不在「管理員 ↔ 朋友A」的私訊裡
check('不是成員看不到牧場（404）', (await farmGet(dmAdminA.id, TB)).status === 404);
check('不是成員不能動牧場（404）', (await farmDo(dmAdminA.id, { action: 'till', ...f2 }, TB)).status === 404);
let tills = 0;
for (const f of fields.slice(1, 31)) if ((await farmDo(groupId, { action: 'till', ...f }, TB)).status === 200) tills++;
r = await farmDo(groupId, { action: 'till', ...fields[31] }, TB);
check('體力 60 剛好翻 30 塊，第 31 塊說體力用完', tills === 30 && r.status === 400 && /體力/.test(r.data.error || ''), `${tills} 塊；${r.data.error}`);

// 動物：在動物小屋買、取名字、每天摸摸和餵飯，過幾個小時收雞蛋
check('一開始沒有動物，有雞和牛可以買', fs0.animals?.length === 0 && !!fs0.animalKinds?.chicken && !!fs0.animalKinds?.cow);
check('買動物要取名字', (await farmDo(groupId, { action: 'buy_animal', kind: 'chicken', name: '  ' }, TA)).status === 400);
check('名字太長不行', (await farmDo(groupId, { action: 'buy_animal', kind: 'chicken', name: '一二三四五六七八九' }, TA)).status === 400);
check('沒有這種動物', (await farmDo(groupId, { action: 'buy_animal', kind: 'dragon', name: '小龍' }, TA)).status === 400);
r = await farmDo(groupId, { action: 'buy_animal', kind: 'chicken', name: '小花' }, TA);
money -= fs0.animalKinds.chicken.price;
const hen = r.data.animals?.[0];
check(`買一隻雞取名「小花」，錢 → ${money}`, r.status === 200 && r.data.money === money && hen?.name === '小花' && hen.kind === 'chicken');
check('聊天室說誰帶了雞回來、叫什麼名字',
  (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('帶了一隻雞回牧場，取名「小花」')));
check('朋友B 也看到小花', ((await farmGet(groupId, TB)).data.animals || []).some((a) => a.name === '小花'));
r = await farmDo(groupId, { action: 'feed', animalId: hen.id }, TA);
check('沒有飼料不能餵', r.status === 400 && /飼料/.test(r.data.error || ''), r.data.error);
r = await farmDo(groupId, { action: 'buy', item: 'feed', qty: 2 }, TA);
money -= 2 * fs0.feedPrice;
check(`買 2 包飼料，錢 → ${money}`, r.status === 200 && r.data.items.feed === 2 && r.data.money === money);
r = await farmDo(groupId, { action: 'pet', animalId: hen.id }, TA);
check('摸摸小花，牠更喜歡你了', r.status === 200 && r.data.animals[0].love === 1 && r.data.animals[0].pettedToday);
check('一天只能摸一次', (await farmDo(groupId, { action: 'pet', animalId: hen.id }, TA)).status === 400);
check('還沒餵就沒有雞蛋可以收', (await farmDo(groupId, { action: 'collect', animalId: hen.id }, TA)).status === 400);
const eBefore = (await farmGet(groupId, TA)).data.energy.now;
r = await farmDo(groupId, { action: 'feed', animalId: hen.id }, TA);
check('餵飯：用掉一包飼料、1 點體力，雞蛋幾小時後好',
  r.status === 200 && r.data.items.feed === 1 && r.data.energy === eBefore - 1 && r.data.animals[0].fedToday && r.data.animals[0].readyAt > Date.now() - 5000);
check('一天只能餵一次', (await farmDo(groupId, { action: 'feed', animalId: hen.id }, TA)).status === 400);
check('全部餵：大家都吃飽了會說', /吃飽/.test((await farmDo(groupId, { action: 'feed_all' }, TA)).data.error || ''));
check('雞蛋還沒好不能收', (await farmDo(groupId, { action: 'collect', animalId: hen.id }, TA)).status === 400);
check('全部收：現在沒有可以收的', (await farmDo(groupId, { action: 'collect_all' }, TA)).status === 400);
check('動物編號亂填被擋', (await farmDo(groupId, { action: 'pet', animalId: 'abc' }, TA)).status === 400
  && (await farmDo(groupId, { action: 'pet', animalId: 999999 }, TA)).status === 400);
// 朋友A 也在「管理員 ↔ 朋友A」的私訊裡，那邊是另一座牧場：不能拿這邊的小花去那邊摸
await farmGet(dmAdminA.id, TA);
check('不能隔著別座牧場碰這隻雞', (await farmDo(dmAdminA.id, { action: 'pet', animalId: hen.id }, TA)).status === 400);
check('不是成員不能碰小花（404）', (await farmDo(dmAdminA.id, { action: 'feed', animalId: hen.id }, TB)).status === 404);
check('攤位不賣雞蛋', (await farmDo(groupId, { action: 'buy', item: 'prod:egg', qty: 1 }, TA)).status === 400);
check('出貨箱不收飼料', (await farmDo(groupId, { action: 'ship', item: 'feed', qty: 1 }, TA)).status === 400);
check('沒有雞蛋不能出貨', (await farmDo(groupId, { action: 'ship', item: 'prod:egg', qty: 1 }, TA)).status === 400);

// 小鎮：村民、聊天、送禮、委託、小吃店、工具店
check('有小鎮地圖和 6 位村民（不會洩漏村民喜歡什麼）',
  fs0.town?.length === 20 && Object.keys(fs0.villagers || {}).length === 6 && !('likes' in fs0.villagers.ama) && !('loves' in fs0.villagers.ama));
check('有今天的委託、工具一開始是一般的', !!fs0.request?.item && fs0.request.qty > 0 && fs0.tools?.hoe === 1 && fs0.tools?.can === 1);
if (fs0.villagersOut) {
  r = await farmDo(groupId, { action: 'talk', villager: 'ama' }, TA);
  check('跟王阿嬤聊天，感情 +1', r.status === 200 && r.data.town.friends.ama.points === 1 && r.data.town.friends.ama.talkedToday);
  r = await farmDo(groupId, { action: 'talk', villager: 'ama' }, TB);
  check('同一天家人再聊，不會再加（全家一天算一次）', r.status === 200 && r.data.town.friends.ama.points === 1);
  check('種子不能當禮物', (await farmDo(groupId, { action: 'gift', villager: 'ama', item: 'seed:bokchoy' }, TA)).status === 400);
  check('沒有的東西不能送', (await farmDo(groupId, { action: 'gift', villager: 'ama', item: 'crop:pineapple' }, TA)).status === 400);
} else {
  r = await farmDo(groupId, { action: 'talk', villager: 'ama' }, TA);
  check('半夜村民在睡覺，聊不到', r.status === 400 && /睡覺/.test(r.data.error || ''), r.data.error);
}
check('沒有這位村民', (await farmDo(groupId, { action: 'talk', villager: 'nobody' }, TA)).status === 400
  && (await farmDo(groupId, { action: 'talk', villager: '__proto__' }, TA)).status === 400);
check('東西不夠不能交委託', (await farmDo(groupId, { action: 'request_fill' }, TA)).status === 400);
check('沒有這道菜', (await farmDo(groupId, { action: 'eat', food: 'steak' }, TA)).status === 400
  && (await farmDo(groupId, { action: 'eat', food: 'constructor' }, TA)).status === 400);
r = await farmDo(groupId, { action: 'eat', food: 'egg' }, TA);
money -= fs0.foods.egg.price;
check(`吃茶葉蛋：體力 +10（最多到滿）、錢 → ${money}`, r.status === 200 && r.data.energy <= 60 && r.data.money === money);
check('錢不夠買不起大鋤頭', /錢不夠/.test((await farmDo(groupId, { action: 'upgrade_tool', tool: 'hoe' }, TA)).data.error || ''));
check('沒有這種工具', (await farmDo(groupId, { action: 'upgrade_tool', tool: 'tractor' }, TA)).status === 400);
r = await farmDo(groupId, { action: 'water', ...f1, area: true }, TA);
check('還沒升級不能一次澆 3×3', r.status === 400 && /升級/.test(r.data.error || ''), r.data.error);

// 後山：釣魚、挖礦、圖鑑
check('有後山地圖、出口、今天的 20 顆石頭、魚和礦石的資料', fs0.hill?.length === 20 && fs0.exits?.farm?.length === 2
  && fs0.rocks?.length === 20 && Array.isArray(fs0.dex) && !!fs0.fish?.eel && !!fs0.ores?.gold);
check('小鎮沒有水可以釣', (await farmDo(groupId, { action: 'fish', area: 'town', x: 14, y: 9, hooked: true }, TA)).status === 400);
check('不是水的地方不能釣', (await farmDo(groupId, { action: 'fish', area: 'farm', x: 5, y: 5, hooked: true }, TA)).status === 400);
check('地圖亂填被擋', (await farmDo(groupId, { action: 'fish', area: '__proto__', x: 24, y: 3, hooked: true }, TA)).status === 400);
let eF = (await farmGet(groupId, TA)).data.energy.now;
r = await farmDo(groupId, { action: 'fish', area: 'farm', x: 24, y: 3, hooked: false }, TA);
check('沒拉到：魚跑掉，體力照扣 2', r.status === 200 && r.data.gained?.missed === true && r.data.energy === eF - 2);
r = await farmDo(groupId, { action: 'fish', area: 'farm', x: 24, y: 3, hooked: true }, TA);
const fishItem = r.data.gained?.item;
check(`在牧場池塘釣到 ${fishItem}，進倉庫、進圖鑑`, r.status === 200 && /^fish:/.test(fishItem || '') && r.data.items[fishItem] === 1
  && r.data.dex.includes(fishItem) && r.data.gained.first === true);
if (fishItem && fishItem !== 'fish:junk')
  check('聊天室說第一次釣到什麼', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('第一次釣到了')));
const rk0 = fs0.rocks[0];
r = await farmDo(groupId, { action: 'mine', x: rk0.x, y: rk0.y }, TA);
check(`挖石頭得到 ore:${rk0.type}，剩 19 顆`, r.status === 200 && r.data.gained.item === `ore:${rk0.type}` && r.data.rocks.length === 19
  && !r.data.rocks.some((x) => x.x === rk0.x && x.y === rk0.y));
check('同一顆不能挖兩次', (await farmDo(groupId, { action: 'mine', x: rk0.x, y: rk0.y }, TA)).status === 400);
check('沒石頭的地方挖不到', (await farmDo(groupId, { action: 'mine', x: 1, y: 1 }, TA)).status === 400);
check('朋友B 看到的石頭也少了一顆（全家同一座採石場）', (await farmGet(groupId, TB)).data.rocks.length === 19);
r = await farmDo(groupId, { action: 'ship', item: fishItem, qty: 1 }, TA);
money += fs0.fish[fishItem.slice(5)].sell;
check(`魚可以出貨（+${fs0.fish[fishItem.slice(5)].sell} 元）`, r.status === 200 && r.data.money === money);
check('沒有的礦石不能出貨', (await farmDo(groupId, { action: 'ship', item: 'ore:amethyst', qty: 1 }, TA)).status === 400);
if (fs0.villagersOut) {
  r = await farmDo(groupId, { action: 'gift', villager: 'fu', item: `ore:${rk0.type}` }, TA);
  check('礦石也能送人', r.status === 200 && ['love', 'like', 'neutral', 'dislike'].includes(r.data.gained.reaction));
}

// 料理
check('有 24 道菜的食譜', Object.values(fs0.dishes || {}).filter((d) => d.need).length === 24 && !!fs0.ingredientGroups?.egg);
check('沒有這道菜', (await farmDo(groupId, { action: 'cook', dish: 'steak' }, TA)).status === 400
  && (await farmDo(groupId, { action: 'cook', dish: 'constructor' }, TA)).status === 400);
r = await farmDo(groupId, { action: 'cook', dish: 'pumpkin_soup' }, TA);
check('材料不夠煮不了', r.status === 400 && /材料不夠/.test(r.data.error || ''), r.data.error);
check('沒有的菜不能吃', (await farmDo(groupId, { action: 'eat_dish', dish: 'pudding' }, TA)).status === 400);
r = await j(`/api/farm/${groupId}/dishes`, {}, TA);
check('今天吃什麼：還沒煮過菜，清單是空的', r.status === 200 && Array.isArray(r.data.dishes) && r.data.dishes.length === 0);
check('不是成員看不到別人家煮過什麼（404）', (await j(`/api/farm/${dmAdminA.id}/dishes`, {}, TB)).status === 404);
const dmAB = (await j('/api/conversations', { method: 'POST', body: { type: 'dm', userId: IB } }, A0)).data.conversation;
r = await j(`/api/farm/${dmAB.id}/dishes`, {}, A0);
check('沒開過牧場的聊天室：清單是空的，也不會因此開墾牧場',
  r.status === 200 && r.data.dishes.length === 0 && !(await listIn(dmAB.id, A0)).some((m) => m.content.includes('開墾')));

// 節日與行事曆（本機測試時用 FARM_FESTIVAL 假裝今天是某個節日）
check('有 9 個節日的資料、下一個節日', Object.keys(fs0.festivals || {}).length === 9 && !!fs0.nextFestival?.date && fs0.nextFestival.date > fs0.day);
check('節慶食物不能自己煮', /節慶/.test((await farmDo(groupId, { action: 'cook', dish: 'mooncake' }, TA)).data.error || ''));
if (fs0.festival) {
  const F = fs0.festivals[fs0.festival];
  check(`今天是${F.name}：聊天室說一聲（只說一次）`, (await listIn(groupId, TA)).filter((m) => m.type === 'system' && m.content.includes(`今天是${F.name}`)).length === 1);
  check('還沒領節慶禮物', fs0.festivalClaimed === false);
  r = await farmDo(groupId, { action: 'festival_claim' }, TB);
  money += F.gift.money || 0;
  check(`朋友B 領${F.name}的禮物`, r.status === 200 && r.data.money === money && r.data.town.festivalClaimed === true
    && (!F.gift.item || r.data.items[F.gift.item] >= F.gift.qty));
  check('聊天室說誰領了禮物', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes(`領了${F.name}的禮物`)));
  check('一座牧場一個節日只能領一份', /領過了/.test((await farmDo(groupId, { action: 'festival_claim' }, TA)).data.error || ''));
  check('朋友A 打開也看到已經領了', (await farmGet(groupId, TA)).data.festivalClaimed === true);
} else {
  check('不是節日不能領禮物', /不是節日/.test((await farmDo(groupId, { action: 'festival_claim' }, TA)).data.error || ''));
}
// 行事曆上今天有人生日 → 美玲姐送蛋糕（一天一次）
const cake0 = (await farmGet(groupId, TA)).data.items['dish:cake'] || 0;
r = await j('/api/events', { method: 'POST', body: { title: '爸爸生日', date: fs0.day, remindAt: Date.now() + 3600000 } }, TA);
const bdayEv = r.data.event;
const fBday = (await farmGet(groupId, TB)).data;
check('行事曆上今天有人生日：牧場知道、送來一個生日蛋糕', fBday.birthdays?.includes('爸爸生日') && fBday.todayEvents.includes('爸爸生日') && fBday.items['dish:cake'] === cake0 + 1);
check('聊天室說小鎮幫忙慶生', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('爸爸生日') && m.content.includes('生日蛋糕')));
check('再打開不會再送一個', (await farmGet(groupId, TA)).data.items['dish:cake'] === cake0 + 1);
await j(`/api/events/${bdayEv.id}`, { method: 'DELETE' }, TA);
// 把接下來一年的節日加到行事曆
r = await farmDo(groupId, { action: 'festival_calendar' }, TA);
const addedFest = r.data.gained?.added;
check(`把接下來一年的節日加到行事曆（加了 ${addedFest} 個）`, r.status === 200 && addedFest >= 9 && addedFest <= 10);
const nf = fs0.nextFestival, nfF = fs0.festivals[nf.id];
const evs = (await j('/api/events', {}, TB)).data.events || [];
check(`行事曆有「${nfF.emoji} ${nfF.name}」${nf.date}`, evs.some((e) => e.title === `${nfF.emoji} ${nfF.name}` && e.date === nf.date && e.note === '家族牧場加的節慶'));
check('再按一次不會重複加', (await farmDo(groupId, { action: 'festival_calendar' }, TB)).data.gained?.added === 0);
for (const e of evs.filter((x) => x.note === '家族牧場加的節慶')) await j(`/api/events/${e.id}`, { method: 'DELETE' }, TA);

// 加工機、溫室、房子擴建
check('一開始：沒有加工機、溫室還沒蓋、房子原本的樣子（體力上限 60）、有溫室的地圖',
  JSON.stringify(fs0.machines) === '{}' && fs0.ghBuilt === false && fs0.houseLevel === 1 && fs0.energyMax === 60
  && fs0.greenhouse?.length === 10 && Object.keys(fs0.machineKinds || {}).length === 4 && Object.keys(fs0.builds || {}).length === 3);
check('溫室還沒蓋，不能在溫室的田翻土', /溫室還沒蓋好/.test((await farmDo(groupId, { action: 'till', x: 2, y: 2, map: 'gh' }, TA)).data.error || ''));
check('說在牧場卻點溫室的座標：不能耕作', /不能耕作/.test((await farmDo(groupId, { action: 'till', x: 2, y: 2, map: 'farm' }, TA)).data.error || ''));
check('還沒買加工機不能放東西', /還沒有/.test((await farmDo(groupId, { action: 'machine_put', machine: 'mayo', item: 'prod:egg', qty: 1 }, TA)).data.error || ''));
check('沒有這種加工機、沒有這種建築', (await farmDo(groupId, { action: 'buy_machine', machine: 'oven' }, TA)).status === 400
  && (await farmDo(groupId, { action: 'build', what: '__proto__' }, TA)).status === 400
  && (await farmDo(groupId, { action: 'machine_take', machine: 'constructor' }, TA)).status === 400);
check('要先擴建大臥室才能蓋二樓', /要先擴建/.test((await farmDo(groupId, { action: 'build', what: 'house3' }, TA)).data.error || ''));
r = await farmDo(groupId, { action: 'build', what: 'greenhouse' }, TA);
check('材料或錢不夠蓋不了溫室', r.status === 400 && /材料不夠|錢不夠/.test(r.data.error || ''), r.data.error);
if (!fs0.items['ore:copper']) check('材料不夠會說缺什麼', /銅礦 0\/3/.test((await farmDo(groupId, { action: 'buy_machine', machine: 'mayo' }, TA)).data.error || ''));

// 更多動物、寵物、改名
check('四種動物（雞、鴨、牛、羊）、兩種寵物、鴨子的池塘', Object.keys(fs0.animalKinds || {}).join() === 'chicken,duck,cow,sheep'
  && Object.keys(fs0.petKinds || {}).join() === 'dog,cat' && JSON.stringify(fs0.pets) === '{}' && !!fs0.pond);
check('領養要取名字、沒有這種寵物', (await farmDo(groupId, { action: 'adopt_pet', pet: 'dog', name: ' ' }, TA)).status === 400
  && (await farmDo(groupId, { action: 'adopt_pet', pet: 'hamster', name: '小倉' }, TA)).status === 400
  && (await farmDo(groupId, { action: 'adopt_pet', pet: '__proto__', name: '小倉' }, TA)).status === 400);
r = await farmDo(groupId, { action: 'adopt_pet', pet: 'dog', name: '小黑' }, TA);
check('領養一隻小狗「小黑」（免費）', r.status === 200 && r.data.pets.dog?.name === '小黑' && r.data.pets.dog.love === 0 && r.data.money === money);
check('聊天室說領養了小狗', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('領養了一隻小狗，取名「小黑」')));
check('一種只能養一隻', /已經有/.test((await farmDo(groupId, { action: 'adopt_pet', pet: 'dog', name: '小白' }, TB)).data.error || ''));
check('還沒領養的小貓摸不到', /還沒有/.test((await farmDo(groupId, { action: 'pat', pet: 'cat' }, TA)).data.error || ''));
const itemsBeforePat = (await farmGet(groupId, TB)).data.items;
r = await farmDo(groupId, { action: 'pat', pet: 'dog' }, TB);
const find = r.data.gained?.find;
check(`朋友B 摸小黑：愛心 +1、跟著朋友B${find ? `、叼回來 ${find.item} ×${find.qty}` : '（今天沒叼東西）'}`, r.status === 200 && r.data.gained.first === true
  && r.data.pets.dog.love === 1 && r.data.pets.dog.pettedToday && r.data.pets.dog.follow === IB
  && (!find || (r.data.items[find.item] || 0) === (itemsBeforePat[find.item] || 0) + find.qty));
r = await farmDo(groupId, { action: 'pat', pet: 'dog' }, TA);
check('同一天再摸：愛心不會再加、也不會再叼東西，但改跟著朋友A', r.status === 200 && r.data.gained.first === false && r.data.gained.find === null
  && r.data.pets.dog.love === 1 && r.data.pets.dog.follow === IA);
check('朋友B 打開也看到小黑跟著朋友A', (await farmGet(groupId, TB)).data.pets.dog.follow === IA);
r = await farmDo(groupId, { action: 'rename_animal', animalId: hen.id, name: '花花' }, TB);
check('幫小花改名叫花花', r.status === 200 && r.data.animals.find((a) => a.id === hen.id).name === '花花');
check('改名也要 1～8 個字', (await farmDo(groupId, { action: 'rename_animal', animalId: hen.id, name: '' }, TB)).status === 400);
r = await farmDo(groupId, { action: 'rename_animal', animalId: hen.id, name: '小花' }, TB);
check('再改回小花', r.status === 200 && r.data.animals.find((a) => a.id === hen.id).name === '小花');
check('別人家的動物不能改名（找不到）', (await farmDo(dmAdminA.id, { action: 'rename_animal', animalId: hen.id, name: '偷改' }, TA)).status === 400);

const farmMs = await medianMs(() => farmGet(groupId, TA));
check(`打開牧場在 150ms 內（實測 ${farmMs.toFixed(0)}ms）`, farmMs < 150);
if (fs0.scale >= 3600) {
  // 本機加速模式（FARM_TIME_SCALE）才跑：小白菜 3 小時 → 3 秒
  await new Promise((ok) => setTimeout(ok, 3500));
  r = await farmDo(groupId, { action: 'harvest', ...f1 }, TA);
  check('（加速模式）熟了可以收成，收進倉庫', r.status === 200 && r.data.items['crop:bokchoy'] === 1);
  r = await farmDo(groupId, { action: 'ship', item: 'crop:bokchoy', qty: 1 }, TB);
  money += 45;
  check(`（加速模式）出貨小白菜 +45 元 → ${money}`, r.status === 200 && r.data.money === money);
  await new Promise((ok) => setTimeout(ok, 800)); // 雞 4 小時＝4 秒，從餵飯到這裡大約 3.5 秒多
  r = await farmDo(groupId, { action: 'collect_all' }, TA);
  check('（加速模式）雞 4 小時後下蛋，全部收', r.status === 200 && r.data.items['prod:egg'] === 1 && r.data.gained.count === 1);
  r = await farmDo(groupId, { action: 'ship', item: 'prod:egg', qty: 1 }, TA);
  money += 50;
  check(`（加速模式）雞蛋出貨 +50 元 → ${money}`, r.status === 200 && r.data.money === money);
  if (fs0.villagersOut) {
    // 種兩顆小白菜：一顆送王阿嬤，一顆交委託（本機測試時用 FARM_REQUEST 指定委託）
    const [g1, g2] = [fields[40], fields[41]];
    for (const g of [g1, g2]) {
      await farmDo(groupId, { action: 'till', ...g }, TA);
      await farmDo(groupId, { action: 'plant', crop: 'bokchoy', ...g }, TA);
      await farmDo(groupId, { action: 'water', ...g }, TA);
    }
    await new Promise((ok) => setTimeout(ok, 3300));
    for (const g of [g1, g2]) await farmDo(groupId, { action: 'harvest', ...g }, TA);
    r = await farmDo(groupId, { action: 'gift', villager: 'ama', item: 'crop:bokchoy' }, TA);
    check('（加速模式）送王阿嬤小白菜：她喜歡，感情 +5', r.status === 200 && r.data.gained.reaction === 'like' && r.data.town.friends.ama.points === 6);
    check('（加速模式）一天只能送一次', (await farmDo(groupId, { action: 'gift', villager: 'ama', item: 'crop:bokchoy' }, TA)).status === 400);
    // 再種兩顆小白菜煮炒青菜
    for (const g of [fields[42], fields[43]]) {
      await farmDo(groupId, { action: 'till', ...g }, TA);
      await farmDo(groupId, { action: 'plant', crop: 'bokchoy', ...g }, TA);
      await farmDo(groupId, { action: 'water', ...g }, TA);
    }
    await new Promise((ok) => setTimeout(ok, 3300));
    for (const g of [fields[42], fields[43]]) await farmDo(groupId, { action: 'harvest', ...g }, TA);
    const bokBefore = (await farmGet(groupId, TA)).data.items['crop:bokchoy'] || 0;
    r = await farmDo(groupId, { action: 'cook', dish: 'stirfry' }, TA);
    check('（加速模式）兩顆小白菜煮成炒青菜，第一次煮進圖鑑', r.status === 200 && r.data.items['dish:stirfry'] === 1
      && (r.data.items['crop:bokchoy'] || 0) === bokBefore - 2 && r.data.gained.first && r.data.dex.includes('dish:stirfry'));
    check('（加速模式）聊天室：第一次做了炒青菜，問晚餐要不要吃', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('第一次做了炒青菜')));
    r = await j(`/api/farm/${groupId}/dishes`, {}, TB);
    check('（加速模式）今天吃什麼看得到家族牧場煮過炒青菜', r.status === 200 && r.data.dishes.some((d) => d.name === '炒青菜' && d.by === '朋友A'));
    const eD = (await farmGet(groupId, TA)).data.energy.now;
    r = await farmDo(groupId, { action: 'eat_dish', dish: 'stirfry' }, TA);
    check(`（加速模式）吃炒青菜體力 +12（${eD} → 最多 60）`, r.status === 200 && r.data.energy === Math.min(60, eD + 12) && !r.data.items['dish:stirfry']);
    const q = (await farmGet(groupId, TA)).data.request;
    if (q.item === 'crop:bokchoy' && q.qty === 1) {
      r = await farmDo(groupId, { action: 'request_fill' }, TA);
      money += q.reward;
      check(`（加速模式）交委託：拿到 ${q.reward} 元、感情 +10、今天完成`,
        r.status === 200 && r.data.money === money && r.data.town.request.done && r.data.town.friends[q.villager].points >= 10);
      check('（加速模式）委託一天只能交一次', (await farmDo(groupId, { action: 'request_fill' }, TA)).status === 400);
      check('（加速模式）聊天室說誰完成了誰的委託', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('完成了') && m.content.includes('的委託')));
    }
  }
  // 會再長的作物：收完還在田裡，再等一下又能收
  const rc = fs0.crops[regrowCrop];
  r = await farmDo(groupId, { action: 'buy', item: 'seed:' + regrowCrop, qty: 1 }, TA);
  money -= rc.seed;
  await farmDo(groupId, { action: 'plant', crop: regrowCrop, ...f1 }, TA);
  await farmDo(groupId, { action: 'water', ...f1 }, TA);
  await new Promise((ok) => setTimeout(ok, rc.hours * 1000 + 600));
  r = await farmDo(groupId, { action: 'harvest', ...f1 }, TA);
  check(`（加速模式）${rc.name}收成後還留在田裡，回到「長大中」`, r.status === 200 && r.data.tile?.crop === regrowCrop && r.data.tile.stage === 2);
  check(`（加速模式）${rc.name}剛收完不能馬上再收`, (await farmDo(groupId, { action: 'harvest', ...f1 }, TA)).status === 400);
  await new Promise((ok) => setTimeout(ok, rc.regrow * 1000 + 600));
  r = await farmDo(groupId, { action: 'harvest', ...f1 }, TA);
  check(`（加速模式）再等 ${rc.regrow} 小時又能收，倉庫有 2 個`, r.status === 200 && r.data.items['crop:' + regrowCrop] === 2);
  if ((fs0.items['ore:gold'] || 0) >= 100) {
    // 本機測試用 FARM_START_ITEMS 先放了礦石和大顆雞蛋：先賣金礦湊錢
    r = await farmDo(groupId, { action: 'ship', item: 'ore:gold', qty: 95 }, TA);
    money += 95 * fs0.ores.gold.sell;
    check(`（加速模式）賣 95 個金礦湊錢 → ${money}`, r.status === 200 && r.data.money === money, `實際 ${r.data.money}`);
    let it = r.data.items;
    r = await farmDo(groupId, { action: 'buy_machine', machine: 'mayo' }, TA);
    money -= fs0.machineKinds.mayo.price;
    check('（加速模式）買美乃滋機：扣錢、扣 3 個銅礦、放在牧場', r.status === 200 && r.data.money === money
      && r.data.items['ore:copper'] === it['ore:copper'] - 3 && r.data.machines.mayo?.input === null);
    check('（加速模式）聊天室說買了美乃滋機', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('買了美乃滋機')));
    check('（加速模式）同一種只能買一台', /已經有/.test((await farmDo(groupId, { action: 'buy_machine', machine: 'mayo' }, TA)).data.error || ''));
    check('（加速模式）美乃滋機不能放番茄、一次最多 5 個', /不能放/.test((await farmDo(groupId, { action: 'machine_put', machine: 'mayo', item: 'crop:tomato', qty: 1 }, TA)).data.error || '')
      && (await farmDo(groupId, { action: 'machine_put', machine: 'mayo', item: 'prod:egg_l', qty: 6 }, TA)).status === 400);
    r = await farmDo(groupId, { action: 'machine_put', machine: 'mayo', item: 'prod:egg_l', qty: 3 }, TB);
    check('（加速模式）朋友B 放 3 個大顆雞蛋進去', r.status === 200 && r.data.machines.mayo.input === 'prod:egg_l' && r.data.machines.mayo.qty === 3
      && r.data.machines.mayo.output === 'good:mayo_l' && r.data.items['prod:egg_l'] === 2);
    check('（加速模式）還在做不能拿、也不能再放', /還在做/.test((await farmDo(groupId, { action: 'machine_take', machine: 'mayo' }, TA)).data.error || '')
      && /正在做/.test((await farmDo(groupId, { action: 'machine_put', machine: 'mayo', item: 'prod:egg_l', qty: 1 }, TA)).data.error || ''));
    check('（加速模式）朋友A 打開也看到美乃滋機在做', (await farmGet(groupId, TA)).data.machines.mayo?.qty === 3);
    await new Promise((ok) => setTimeout(ok, fs0.machineKinds.mayo.hours * 1000 + 600));
    r = await farmDo(groupId, { action: 'machine_take', machine: 'mayo' }, TA);
    check('（加速模式）3 小時後拿出高級美乃滋 ×3，第一次做進圖鑑', r.status === 200 && r.data.items['good:mayo_l'] === 3 && r.data.gained.qty === 3
      && r.data.gained.first === true && r.data.dex.includes('good:mayo_l') && r.data.machines.mayo.input === null);
    check('（加速模式）聊天室說第一次做出了高級美乃滋', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('第一次做出了高級美乃滋')));
    r = await farmDo(groupId, { action: 'ship', item: 'good:mayo_l', qty: 3 }, TA);
    money += 3 * fs0.goods.mayo_l.sell;
    check(`（加速模式）加工品可以出貨（3 × ${fs0.goods.mayo_l.sell}）`, r.status === 200 && r.data.money === money);
    // 溫室
    it = r.data.items;
    r = await farmDo(groupId, { action: 'build', what: 'greenhouse' }, TA);
    money -= fs0.builds.greenhouse.price;
    check('（加速模式）蓋溫室：扣錢和礦石', r.status === 200 && r.data.build?.ghBuilt === true && r.data.money === money
      && Object.entries(fs0.builds.greenhouse.need).every(([i, q]) => (r.data.items[i] || 0) === it[i] - q));
    check('（加速模式）溫室只能蓋一次', /已經蓋好/.test((await farmDo(groupId, { action: 'build', what: 'greenhouse' }, TA)).data.error || ''));
    check('（加速模式）聊天室說蓋好了溫室、朋友B 也看到', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('蓋好了溫室'))
      && (await farmGet(groupId, TB)).data.ghBuilt === true);
    const off = cropIds.filter((id) => !inSeasonNow(id)).sort((a, b) => fs0.crops[a].hours - fs0.crops[b].hours)[0];
    r = await farmDo(groupId, { action: 'buy', item: 'seed:' + off, qty: 1 }, TA);
    money -= fs0.crops[off].seed;
    check(`（加速模式）蓋了溫室，別季的${fs0.crops[off].name}種子也買得到`, r.status === 200 && r.data.money === money);
    const out = fields[44];
    await farmDo(groupId, { action: 'till', ...out, map: 'farm' }, TA);
    check('（加速模式）別季的作物還是不能種在外面', /溫室/.test((await farmDo(groupId, { action: 'plant', crop: off, ...out, map: 'farm' }, TA)).data.error || ''));
    r = await farmDo(groupId, { action: 'till', x: 2, y: 2, map: 'gh' }, TA);
    check('（加速模式）溫室的田剛翻好是乾的（下雨也淋不到）', r.status === 200 && r.data.tile.tilled && r.data.tile.wetUntil === 0);
    r = await farmDo(groupId, { action: 'plant', crop: off, x: 2, y: 2, map: 'gh' }, TA);
    check(`（加速模式）溫室裡可以種別季的${fs0.crops[off].name}`, r.status === 200 && r.data.tile.crop === off);
    await farmDo(groupId, { action: 'water', x: 2, y: 2, map: 'gh' }, TA);
    await new Promise((ok) => setTimeout(ok, fs0.crops[off].hours * 1000 + 600));
    r = await farmDo(groupId, { action: 'harvest', x: 2, y: 2, map: 'gh' }, TB);
    check(`（加速模式）${fs0.crops[off].hours} 小時後在溫室收成`, r.status === 200 && r.data.items['crop:' + off] >= 1);
    check('（加速模式）溫室的田大家都看得到（存在同一個牧場）', (await farmGet(groupId, TA)).data.tiles.some((t) => t.x === 2 && t.y === 2 && t.tilled));
    // 房子擴建
    const eB = (await farmGet(groupId, TB)).data.energy.now;
    const eA = (await farmGet(groupId, TA)).data.energy.now;
    r = await farmDo(groupId, { action: 'build', what: 'house2' }, TA);
    money -= fs0.builds.house2.price;
    check('（加速模式）擴建大臥室：體力上限 80、今天的體力也 +20', r.status === 200 && r.data.build.houseLevel === 2 && r.data.energyMax === 80
      && r.data.energy === eA + 20 && r.data.money === money);
    r = await farmGet(groupId, TB);
    check('（加速模式）朋友B 的體力也多了 20', r.data.energy.now === eB + 20 && r.data.energy.max === 80 && r.data.houseLevel === 2);
    r = await farmDo(groupId, { action: 'build', what: 'house3' }, TB);
    money -= fs0.builds.house3.price;
    check('（加速模式）擴建二樓：體力上限 100', r.status === 200 && r.data.build.houseLevel === 3 && r.data.energyMax === 100 && r.data.money === money);
    check('（加速模式）已經擴建過的不能再蓋', /已經擴建/.test((await farmDo(groupId, { action: 'build', what: 'house2' }, TA)).data.error || ''));
    check('（加速模式）聊天室說擴建了房子', (await listIn(groupId, TA)).filter((m) => m.type === 'system' && m.content.includes('把房子擴建成')).length === 2);
    // 動物寶寶（本機測試用 FARM_START_LOVE=duck:20：買來的鴨子就是滿愛心）
    r = await farmDo(groupId, { action: 'buy_animal', kind: 'duck', name: '阿呱' }, TA);
    money -= fs0.animalKinds.duck.price;
    const duck = r.data.animals?.find((a) => a.name === '阿呱');
    check('（加速模式）買一隻鴨子', r.status === 200 && duck?.kind === 'duck' && r.data.money === money);
    if (duck && duck.love >= 20) {
      await farmDo(groupId, { action: 'buy', item: 'feed', qty: 5 }, TA);
      money -= 5 * fs0.feedPrice;
      await farmDo(groupId, { action: 'feed', animalId: duck.id }, TA);
      await new Promise((ok) => setTimeout(ok, fs0.animalKinds.duck.hours * 1000 + 600));
      r = await farmDo(groupId, { action: 'collect', animalId: duck.id }, TA);
      const baby = r.data.animals?.find((a) => a.name === '阿呱寶寶');
      check('（加速模式）滿愛心的鴨子收到雙黃鴨蛋，還生了一隻小鴨寶寶', r.status === 200 && r.data.gained.item === 'prod:duck_egg_l'
        && r.data.gained.baby?.name === '阿呱寶寶' && baby?.kind === 'duck' && baby.babyUntil > Date.now() && baby.love === 0);
      check('（加速模式）聊天室說生了小鴨', (await listIn(groupId, TA)).some((m) => m.type === 'system' && m.content.includes('生了一隻小鴨「阿呱寶寶」')));
      r = await farmDo(groupId, { action: 'feed', animalId: baby.id }, TB);
      const b2 = r.data.animals?.find((a) => a.id === baby.id);
      check('（加速模式）寶寶吃飯會長愛心，但還沒有產品', r.status === 200 && b2.love === 1 && b2.fedToday && b2.readyAt === 0);
      check('（加速模式）鴨子今天吃過了，不能再餵（一天一次）', /吃過了/.test((await farmDo(groupId, { action: 'feed', animalId: duck.id }, TA)).data.error || ''));
    }
  }
}

console.log('\n--- 管理員 ---');
r = await j(`/api/admin/users/${IC}/reset-password`, { method: 'POST' }, A0);
const temp = r.data.tempPassword;
check('管理員幫成員重設密碼', r.status === 200 && typeof temp === 'string' && temp.length >= 6);
check('舊密碼不能用了', (await j('/api/login', { method: 'POST', body: { username: u('c'), password: PASS } })).status === 401);
check('臨時密碼可以登入', (await j('/api/login', { method: 'POST', body: { username: u('c'), password: temp } })).status === 200);
r = await j('/api/admin/export', {}, A0);
check('管理員可以下載備份', r.status === 200 && Array.isArray(r.data.users) && r.data.messageCount > 0);
check('備份包含牧場的動物', (r.data.farmAnimals || []).some((a) => a.name === '小花'));
check('備份包含跟村民的感情', Array.isArray(r.data.farmFriends));
check('備份包含圖鑑', (r.data.farmDex || []).length >= 2);
check('備份包含加工機', Array.isArray(r.data.farmMachines));

console.log('\n--- 速度與備份上限（防止效能退步）---');
// 這段會放 30 張約 450KB 的照片進去，量「打開聊天室」與「取照片」的時間，並檢查備份每頁大小有上限。
// 門檻抓得很寬（正常值的十倍左右），只抓「慢了好幾倍」這種退步，不會因為電腦慢一點就失敗。
// 例：曾經因為列訊息時把每張照片整張解碼，打開這個聊天室從 21ms 變成 1289ms。
const SPEED_PHOTO = 'data:image/jpeg;base64,' + Buffer.alloc(460000, 7).toString('base64');
const speedConv = (await j('/api/conversations', { method: 'POST', body: { type: 'group', name: '速度測試', memberIds: [IA, IB] } }, A0)).data.conversation.id;
for (let k = 0; k < 30; k++)
  await j(`/api/conversations/${speedConv}/messages`, { method: 'POST', body: { type: 'image', content: SPEED_PHOTO } }, A0);
let speedList;
const openMs = await medianMs(async () => { speedList = await j(`/api/conversations/${speedConv}/messages`, {}, A0); });
check(`打開 30 張照片的聊天室在 300ms 內（實測 ${openMs.toFixed(0)}ms）`, openMs < 300);
const speedMedia = speedList.data.messages.find((m) => m.type === 'image')?.meta?.media;
const photoMs = await medianMs(() => fetch(B + speedMedia).then((res) => res.arrayBuffer()));
check(`取一張照片在 50ms 內（實測 ${photoMs.toFixed(0)}ms）`, photoMs < 50);
// 備份：每頁內容要有上限（伺服器記憶體 128MB；一次全拿的話照片一多就會失敗）
const exMeta = (await j('/api/admin/export', {}, A0)).data;
let exAfter = 0, exTotal = 0, exMaxPage = 0;
for (;;) {
  const res = await fetch(`${B}/api/admin/export?after=${exAfter}`, { headers: { authorization: 'Bearer ' + A0 } });
  const text = await res.text();
  const page = JSON.parse(text);
  exTotal += page.messages.length;
  exMaxPage = Math.max(exMaxPage, text.length);
  if (page.next == null) break;
  exAfter = page.next;
}
check(`備份分頁拿完全部訊息（${exTotal} / ${exMeta.messageCount}）`, exTotal === exMeta.messageCount);
check(`備份每頁不超過 10.5MB（最大一頁 ${(exMaxPage / 1048576).toFixed(1)}MB）`, exMaxPage <= 10.5 * 1048576);

console.log(`\n結果：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
