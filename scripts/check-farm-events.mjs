// 晴耕谷：檢查劇情檔（data/events/hearts.json、story.json、duo.json）寫得對不對。寫完新劇情跑一次：
//   node scripts/check-farm-events.mjs
// 檢查：格式、說話的人是不是居民（或 @me、@partner、@a、@b）、表情、跳轉的標籤在不在、選項、條件（when）、獎勵的物品在不在、字數
import { readFileSync } from 'node:fs';
const D = new URL('../public/games/farm/data/', import.meta.url);
const load = (p) => JSON.parse(readFileSync(new URL(p, D), 'utf8'));
const NPCS = load('npcs/residents.json'), BAL = load('balance.json'), ITEMS = load('items.json'), RESTORE = load('restore.json');
const MAPS = ['farm', 'house', 'road', 'lake', 'town', 'forest', 'beach', 'greenhouse', 'uptown'];
const FILES = { heart: 'events/hearts.json', story: 'events/story.json', duo: 'events/duo.json' };
const FACES = ['normal', 'happy', 'sad', 'shy', 'closed'], ROLES = ['@me', '@partner', '@a', '@b'];
const WHEN = ['map', 'at', 'day', 'season', 'weather', 'hour', 'after', 'flags', 'notFlags', 'stats', 'restored', 'fixed', 'hearts', 'houseLv', 'together'];
const WEATHER = [...new Set(Object.values(BAL.weather).flatMap((w) => Object.keys(w)))];
const STEP = ['say', 'narrate', 'choice', 'label', 'goto', 'emote', 'wait', 'fade', 'end'];
const LIMIT = { text: 70, title: 12, choice: 16, album: 22 };
const len = (s) => [...String(s)].length;
const list = (v) => (Array.isArray(v) ? v : [v]);
let errs = 0, warns = 0; const err = (id, m) => { errs++; console.log(`✗ ${id}: ${m}`); }, warn = (id, m) => { warns++; console.log(`△ ${id}: ${m}`); };
const all = {};
// 另外要一起檢查的檔案（還沒放進遊戲的草稿）：node scripts/check-farm-events.mjs heart:草稿.json story:草稿.json duo:草稿.json
const extra = process.argv.slice(2).map((a) => { const [kind, ...rest] = a.split(':'); return [kind, rest.join(':')]; });
for (const [kind, f] of [...Object.entries(FILES).map(([k, f]) => [k, new URL(f, D)]), ...extra]) {
  if (!FILES[kind]) { console.log(`不認得「${kind}」，要寫 heart:、story: 或 duo:`); process.exit(2); }
  const evs = JSON.parse(readFileSync(f, 'utf8'));
  for (const [id, ev] of Object.entries(evs)) { if (all[id]) err(id, `跟 ${all[id].kind} 的劇情同一個 id`); all[id] = { ...ev, kind }; }
}
const count = { heart: 0, story: 0, duo: 0 }, words = { heart: 0, story: 0, duo: 0 };
for (const [id, ev] of Object.entries(all)) {
  const k = ev.kind; count[k]++;
  if (typeof ev.title !== 'string' || !ev.title) err(id, '沒有 title'); else if (len(ev.title) > LIMIT.title) warn(id, `標題太長（${len(ev.title)} 字）`);
  if (!Array.isArray(ev.steps) || !ev.steps.length) { err(id, '沒有 steps'); continue; }
  if (k === 'heart') {
    if (!NPCS[ev.npc]) err(id, `npc「${ev.npc}」不是居民`);
    if (!(Number.isInteger(ev.hearts) && ev.hearts >= 1 && ev.hearts <= 10)) err(id, `hearts 要是 1～10：${ev.hearts}`);
    if (id !== `${ev.npc}_${ev.hearts}`) warn(id, `心事件的 id 最好是「居民_心數」（${ev.npc}_${ev.hearts}）`);
    if (ev.when || ev.reward || ev.album) warn(id, '心事件不用 when／reward／album（說話時觸發，好感照選項加）');
  } else {
    if (!ev.when || typeof ev.when !== 'object') err(id, '主線、兩個人的劇情要有 when（什麼時候發生）');
    if (ev.npc && !NPCS[ev.npc]) err(id, `npc「${ev.npc}」不是居民`);
    if (k === 'duo' && !(ev.when && ev.when.together)) err(id, '兩個人的劇情 when 要有 together: true');
    if (ev.shared != null && ev.shared !== true) err(id, 'shared 只能是 true');
    if (ev.album != null && (typeof ev.album !== 'string' || len(ev.album) > LIMIT.album)) warn(id, `album 要是 ${LIMIT.album} 字以內的一句話`);
    const w = ev.when || {};
    for (const key of Object.keys(w)) if (!WHEN.includes(key)) err(id, `when 裡沒有「${key}」這個條件`);
    if (w.map) for (const m of list(w.map)) if (!MAPS.includes(m)) err(id, `when.map「${m}」不是地圖`);
    if (w.at && !(Array.isArray(w.at) && w.at.length >= 2 && w.at.every((v) => typeof v === 'number'))) err(id, 'when.at 要是 [x, y, 半徑]');
    if (w.at && !w.map) err(id, 'when.at 要配 when.map');
    if (w.season) for (const s of list(w.season)) if (!BAL.seasonIds.includes(s)) err(id, `when.season「${s}」不對（${BAL.seasonIds.join('、')}）`);
    if (w.weather) for (const s of list(w.weather)) if (!WEATHER.includes(s)) err(id, `when.weather「${s}」不對（${WEATHER.join('、')}）`);
    if (w.hour && !(Array.isArray(w.hour) && w.hour.length === 2 && w.hour[0] >= 6 && w.hour[1] <= 26 && w.hour[0] < w.hour[1])) err(id, 'when.hour 要是 [從, 到)，6～26 之間');
    if (w.fixed) for (const f of list(w.fixed)) if (!RESTORE[f]) err(id, `when.fixed「${f}」不是設施`);
    if (w.hearts) for (const n of Object.keys(w.hearts)) if (!NPCS[n]) err(id, `when.hearts「${n}」不是居民`);
    const R = ev.reward || {};
    for (const [item, n] of R.items || []) if (!ITEMS[item] || !(n > 0)) err(id, `獎勵的物品「${item}」不存在或數量不對`);
    for (const n of Object.keys(R.pts || {})) if (!NPCS[n]) err(id, `獎勵的好感「${n}」不是居民`);
    if (R.money != null && !(R.money > 0 && R.money <= 5000)) warn(id, `獎金 ${R.money} 好像太多或太少`);
  }
  const labels = new Set(ev.steps.filter((s) => s.label).map((s) => s.label)), used = new Set();
  ev.steps.forEach((s, i) => {
    const keys = Object.keys(s).filter((x) => STEP.includes(x)), at = `${id} 第 ${i} 步`;
    if (keys.length !== 1) return err(at, `每一步只能有一個動作（${STEP.join('、')}），這一步有：${Object.keys(s).join('、')}`);
    const t = keys[0];
    if (t === 'say') {
      if (!NPCS[s.say] && !ROLES.includes(s.say)) err(at, `說話的人「${s.say}」不是居民也不是 @me／@partner／@a／@b`);
      if (ROLES.includes(s.say) && k === 'heart' && s.say !== '@me') warn(at, '心事件是一個人看的，只用 @me');
      if (['@partner', '@a', '@b'].includes(s.say) && k === 'story' && !(ev.when || {}).together) warn(at, '這段主線不一定兩個人都在，對方說話要寫在 together 的劇情裡');
      if (typeof s.text !== 'string' || !s.text) err(at, '沒有 text'); else { words[k] += len(s.text); if (len(s.text) > LIMIT.text) warn(at, `一句太長（${len(s.text)} 字），拆成兩句`); }
      if (s.face && !FACES.includes(s.face)) err(at, `表情「${s.face}」不對（${FACES.join('、')}）`);
    } else if (t === 'narrate') { if (typeof s.narrate !== 'string' || !s.narrate) err(at, 'narrate 要是一句話'); else { words[k] += len(s.narrate); if (len(s.narrate) > LIMIT.text) warn(at, `旁白太長（${len(s.narrate)} 字）`); } }
    else if (t === 'choice') {
      if (!Array.isArray(s.choice) || s.choice.length < 2 || s.choice.length > 3) return err(at, '選項要 2～3 個');
      if (s.ask && !NPCS[s.ask] && !ROLES.includes(s.ask)) err(at, `ask「${s.ask}」不對`);
      for (const o of s.choice) {
        if (typeof o.text !== 'string' || !o.text) err(at, '選項沒有 text'); else if (len(o.text) > LIMIT.choice) warn(at, `選項太長（${len(o.text)} 字）：${o.text}`);
        if (o.pts != null && !(Number.isInteger(o.pts) && o.pts >= -60 && o.pts <= 120)) err(at, `pts 要是 -60～120 的整數：${o.pts}`);
        if (o.npc && !NPCS[o.npc]) err(at, `選項的 npc「${o.npc}」不是居民`);
        if (o.pts && !o.npc && !ev.npc) warn(at, '選項有 pts 但這段劇情沒有 npc（不知道要加給誰）');
        if (o.goto) { used.add(o.goto); if (!labels.has(o.goto)) err(at, `選項跳到「${o.goto}」，但沒有這個標籤`); }
      }
    } else if (t === 'goto') { used.add(s.goto); if (!labels.has(s.goto)) err(at, `跳到「${s.goto}」，但沒有這個標籤`); }
    else if (t === 'emote') { if (!BAL.emotes.includes(s.emote)) err(at, `表情符號「${s.emote}」不在清單（${BAL.emotes.join(' ')}）`); if (s.who && !ROLES.includes(s.who)) err(at, `emote 的 who「${s.who}」只能是 @me／@partner／@a／@b`); }
    else if (t === 'wait') { if (!(s.wait > 0 && s.wait <= 3)) err(at, 'wait 要是 0～3 秒'); }
    else if (t === 'fade') { if (typeof s.fade !== 'string' && s.fade !== true) err(at, 'fade 要是一句話或 true'); else if (typeof s.fade === 'string' && len(s.fade) > LIMIT.text) warn(at, `fade 太長（${len(s.fade)} 字）`); }
  });
  for (const l of labels) if (!used.has(l)) warn(id, `標籤「${l}」沒有人跳過來`);
  if (k !== 'heart') for (const a of list((ev.when || {}).after || [])) if (!all[a]) err(id, `when.after「${a}」沒有這段劇情`);
}
// 同一位居民的心事件要照心數排（說話時先演心數小的）
const order = {}; for (const [id, ev] of Object.entries(all)) if (ev.kind === 'heart') { const prev = order[ev.npc]; if (prev != null && prev > ev.hearts) err(id, `${ev.npc} 的心事件要照心數排（${ev.hearts} 心排在 ${prev} 心後面）`); order[ev.npc] = ev.hearts; }
const per = {}; for (const ev of Object.values(all)) if (ev.kind === 'heart') (per[ev.npc] ||= []).push(ev.hearts);
console.log(`\n居民的故事 ${count.heart} 段、主線 ${count.story} 段、兩個人的劇情 ${count.duo} 段；字數：${words.heart}／${words.story}／${words.duo}`);
console.log('每位居民的心事件：' + Object.keys(NPCS).map((n) => `${NPCS[n].name} ${(per[n] || []).join('、') || '—'}`).join('　'));
console.log(errs ? `\n${errs} 個錯誤、${warns} 個提醒` : `\n沒有錯誤（${warns} 個提醒）`);
process.exit(errs ? 1 : 0);
