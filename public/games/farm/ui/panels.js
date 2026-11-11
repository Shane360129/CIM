// 遊戲裡的面板：背包、出貨箱、倉庫箱、種子攤。都是一般的網頁元素，蓋在畫面中間；內容每次有變化就整個重畫。
import { iconEl } from '../render/sprites.js';
import { sellPrice, planTake, levelOf, hearts, shopItems } from '../shared/rules.js';
const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

// 一個物品的小圖：有圖用圖（種子是「種子袋＋作物」疊起來），沒有圖用名字的第一個字
let toolLv = {}; // 自己的工具等級：升到銅以上的工具換一張圖
export const setToolLv = (lv) => { toolLv = lv || {}; };
export function itemIcon(items, id, size = 34) {
  const it = items[id], box = mk('span', 'iicon'); if (!it) return box;
  const base = (it.tool && (toolLv[it.tool] || 1) >= 2 && iconEl(it.art + '_copper', size)) || iconEl(it.art, size);
  if (base) { box.append(base); if (it.overlay) { const o = iconEl(it.overlay, size * 0.55); if (o) { o.classList.add('over'); box.append(o); } } }
  else box.append(mk('span', 'ifallback', it.name.slice(0, 1)));
  return box;
}
function slotEl(items, bal, s, onClick, extraCls = '') {
  const b = mk('button', 'cell ' + extraCls); b.type = 'button';
  if (s) { b.append(itemIcon(items, s.id)); if (s.n > 1) b.append(mk('span', 'count', String(s.n))); if (s.q) b.append(mk('span', 'qual q' + s.q, '★')); b.title = items[s.id].name + (s.q ? `（${bal.quality.names[s.q]}）` : ''); }
  b.addEventListener('click', onClick); return b;
}

export function openPanel(ctx, mode, arg = {}) {
  const { hud, world: W } = ctx, { items, balance: bal } = ctx.data, room = W.room;
  const root = mk('div', 'panel'), title = { bag: '背包', ship: '出貨箱', chest: '倉庫箱', cook: '爐灶', craft: '製作台', coop: '雞舍', barn: '畜舍', smith: '鐵匠鋪', restore: '修復小鎮', build: '木工屋', codex: '圖鑑與成就' }[mode] || (mode === 'shop' && ctx.data.shops[arg.shop || 'stall'].name);
  let picked = -1, info = '', fac = arg.fac || null;
  const say = (r) => { if (r.t === 'no') hud.toast({ full: '放不下了', money: '錢不夠', max: '已經是最高級了', unneeded: '這個設施不需要這個（或已經夠了）', closed: '現在沒有營業', materials: '材料不夠', level: '料理等級還不夠', housefull: '住滿了', nohay: '沒有乾草了（種子攤有賣）', already: '已經弄好了', far: '太遠了', unsellable: '這個不能賣' }[r.reason] || '沒辦法', 1300); };
  const grid = (list, n, onClick, cls) => { const g = mk('div', 'grid'); for (let i = 0; i < n; i++) g.append(slotEl(items, bal, list[i], () => onClick(i), (i === picked && cls === 'inv' ? 'on ' : '') + (i < bal.hotbarSlots && cls === 'inv' ? 'hot' : ''))); return g; };
  function draw() {
    root.textContent = '';
    const head = mk('div', 'phead'); head.append(mk('h2', '', title), mk('span', 'money', `💰 ${W.farm.money}`));
    const x = mk('button', 'pclose', '✕'); x.type = 'button'; x.setAttribute('aria-label', '關閉'); x.addEventListener('click', () => hud.closePanel()); head.append(x); root.append(head);
    const inv = W.self.inv;
    const needText = (need) => Object.entries(need).map(([spec, n]) => `${spec === '@crop' ? '任何作物' : spec.startsWith('@') ? { veg: '蔬菜', fruit: '水果', fish: '魚', egg: '蛋', milk: '牛奶', forage: '採集物', flower: '花' }[spec.slice(1)] || spec : spec.startsWith('g:') ? ctx.data.machines[spec.slice(2)].name + '做的' : items[spec].name}×${n}`).join('、');
    if (mode === 'build') {
      const f = W.farm, H = bal.house, lv = f.houseLv || 1, next = H.levels[lv], costText = (c) => Object.entries(c).filter(([k]) => k !== 'money' && k !== 'name').map(([k, n]) => `${items[k].name}×${n}`).join('、') + `、${c.money} 元`;
      const can = (c) => f.money >= c.money && !!planTake(items, W.self.inv, Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'money' && k !== 'name')));
      root.append(mk('p', 'hint', '桐伯：蓋房子、開墾，交給我！材料要帶在身上。'));
      const list = mk('div', 'shoplist'), row = (name, desc, cost, what) => { const r = mk('div', 'shoprow'); r.dataset.item = what; r.append(mk('span', 'sname', name), mk('span', 'sdesc', desc)); const b = mk('button', 'pbtn', '動工'); b.type = 'button'; b.disabled = !cost || !can(cost); b.addEventListener('click', async () => { const x = await room.req({ t: 'build', what }); if (x.t === 'ok') hud.toast('完工了！', 1500); else say(x); }); r.append(b); list.append(r); };
      row(`農舍（現在：${H.names[lv - 1]}）`, next ? `擴建成「${H.names[lv]}」：${costText(next)}。倉庫箱多 ${H.perLevel.chestSlots} 格、體力上限 +${H.perLevel.energyMax}` : '已經是最大的了', next, 'house');
      for (const [id, c] of Object.entries(bal.land)) row(c.name, (f.land || {})[id] ? '已經開墾好了' : `開墾：${costText(c)}。多一塊可以翻土的田`, (f.land || {})[id] ? null : c, id);
      root.append(list);
    } else if (mode === 'codex') {
      const f = W.farm, cx = f.codex || {}, groups = { 作物: 'crop', 魚: 'fish', 採集物: 'forage', 礦物: 'mineral', 料理: 'dish', 畜產: 'animal_product' };
      root.append(mk('p', 'hint', '拿到過的東西會記在圖鑑裡（兩個人共用）。成就達成時，獎金會在隔天早上進錢包。'));
      for (const [label, kind] of Object.entries(groups)) {
        const all = Object.keys(ctx.data.rawItems).filter((k) => ctx.data.rawItems[k].kind === kind), got = all.filter((k) => cx[k]);
        root.append(mk('h3', '', `${label} ${got.length}／${all.length}`)); const g2 = mk('div', 'grid'); for (const k of all) { const c = mk('span', 'cell' + (cx[k] ? '' : ' unknown')); c.title = cx[k] ? items[k].name : '？？？'; c.append(itemIcon(items, k)); g2.append(c); } root.append(g2);
      }
      const album = f.album || []; root.append(mk('h3', '', `紀念冊 ${album.length}／${Object.keys(bal.album).length}`));
      const ab = mk('div', 'shoplist'); for (const e of album) { const r = mk('div', 'shoprow'); r.append(mk('span', 'sname', `第 ${e.day} 天`), mk('span', 'sdesc', bal.album[e.key] || e.key)); ab.append(r); } root.append(ab);
      const ach = ctx.data.achievements, done = ach.filter((a) => (f.achieved || {})[a.id]); root.append(mk('h3', '', `成就 ${done.length}／${ach.length}`));
      const al = mk('div', 'shoplist'); for (const a of ach) { const r = mk('div', 'shoprow'); r.append(mk('span', 'sname', ((f.achieved || {})[a.id] ? '✔ ' : '') + a.name), mk('span', 'sdesc', a.desc), mk('span', 'sprice', `${a.money} 元`)); al.append(r); } root.append(al);
    } else if (mode === 'restore') {
      const R = ctx.data.restore, st = W.farm.restore || {}, doneN = Object.keys(R).filter((id) => st[id] && st[id].done).length;
      root.append(mk('p', 'hint', `小鎮有八個年久失修的地方，已經修好 ${doneN} 個。先點一個設施，再點下面背包裡的東西捐給它（一次捐整疊，多的不會收）。兩個人捐的算在一起。`));
      const list = mk('div', 'shoplist');
      for (const [id, r] of Object.entries(R)) {
        const s2 = st[id] || { given: {} }, row = mk('button', 'shoprow frow' + (fac === id ? ' on' : '')); row.type = 'button'; row.dataset.item = id;
        const need = Object.entries(r.need).map(([spec, n]) => `${spec === '@crop' ? '任何作物' : spec === '@good' ? '加工品' : spec.startsWith('@') ? { veg: '蔬菜', fruit: '水果', fish: '魚', forage: '採集物', flower: '花' }[spec.slice(1)] : spec.startsWith('g:') ? ctx.data.machines[spec.slice(2)].name + '做的' : items[spec].name} ${Math.min(n, s2.given[spec] || 0)}/${n}`).join('、');
        row.append(mk('span', 'sname', (s2.done ? '✔ ' : '') + r.name), mk('span', 'sdesc', s2.done ? r.perkText : (fac === id ? r.about + ' 需要：' : '') + need));
        row.addEventListener('click', () => { fac = fac === id ? null : id; draw(); }); list.append(row);
      }
      root.append(list, mk('h3', '', fac ? `捐給「${R[fac].name}」` : '背包'));
      root.append(grid(W.self.inv, bal.invSlots, async (i) => { if (!fac) return hud.toast('先點上面的一個設施', 1100); if (!W.self.inv[i]) return; const r = await room.req({ t: 'donate', fac, slot: i, n: 999 }); if (r.t === 'ok') hud.toast(r.done ? `「${R[fac].name}」的材料都齊了！` : `捐了 ${r.given} 個`, 1300); else say(r); }, 'inv'));
    } else if (mode === 'coop' || mode === 'barn') {
      const A = ctx.data.animals, f = W.farm, here = (f.animals || []).filter((x) => A.livestock[x.kind].home === mode), cap = bal.animals.capacity[mode];
      root.append(mk('p', 'hint', `住了 ${here.length}／${cap} 隻。每天餵一份乾草、摸摸牠；越喜歡你，產品品質越好。走到牠旁邊按動作鍵就能摸、收產品。`));
      const list = mk('div', 'shoplist');
      for (const an of here) {
        const d = A.livestock[an.kind], row = mk('div', 'shoprow'), baby = f.day - an.born < d.growDays;
        row.append(itemIcon(items, d.product), mk('span', 'sname', an.name), mk('span', 'sdesc', `${d.name}${baby ? '（小時候）' : ''}・${'♥'.repeat(hearts(an.love, bal)) || '♡'}・${an.traits.join('、')}・${an.fedDay === f.day ? '今天吃過了' : f.graze ? '放牧中' : '還沒吃'}`));
        list.append(row);
      }
      root.append(list);
      const act = mk('div', 'prow'), btn = (text, fn, off) => { const b = mk('button', 'pbtn', text); b.type = 'button'; b.disabled = !!off; b.addEventListener('click', fn); act.append(b); return b; };
      btn('餵乾草', async () => { const r = await room.req({ t: 'feed', home: mode }); if (r.t === 'ok') hud.toast(r.left ? `餵了 ${r.fed} 隻，還有 ${r.left} 隻沒吃到` : `餵了 ${r.fed} 隻`, 1300); else say(r); }, !here.length).dataset.act = 'feed';
      btn(f.graze ? '放牧：開（天氣好時自己吃草）' : '放牧：關', async () => say(await room.req({ t: 'graze', on: !f.graze }))).dataset.act = 'graze';
      root.append(act, mk('h3', '', '買新的'));
      const name = mk('input', 'minput'); name.type = 'text'; name.maxLength = 6; name.placeholder = '幫牠取名字（最多 6 個字）'; root.append(name);
      const buy = mk('div', 'shoplist');
      for (const [id, d] of Object.entries(A.livestock).filter(([, d]) => d.home === mode)) {
        const row = mk('div', 'shoprow'); row.dataset.item = id;
        row.append(itemIcon(items, d.product), mk('span', 'sname', d.name), mk('span', 'sdesc', `每 ${d.every} 天產一次${items[d.product].name}`), mk('span', 'sprice', `${d.price} 元`));
        const b = mk('button', 'pbtn', '買'); b.type = 'button'; b.disabled = f.money < d.price || here.length >= cap; b.addEventListener('click', async () => { const r = await room.req({ t: 'animal-buy', kind: id, name: name.value }); if (r.t === 'ok') { name.value = ''; hud.toast(`${d.name}來了！`, 1300); } else say(r); }); row.append(b); buy.append(row);
      }
      root.append(buy);
      const pets = Object.entries(A.pets).filter(([id]) => !(f.pets || []).some((x) => x.kind === id));
      if (pets.length) { root.append(mk('h3', '', '領養寵物（不用錢）')); const pr = mk('div', 'prow'); for (const [id, d] of pets) { const b = mk('button', 'pbtn', `領養${d.name}`); b.type = 'button'; b.dataset.adopt = id; b.addEventListener('click', async () => say(await room.req({ t: 'adopt', kind: id, name: name.value, color: d.colors[Math.floor(Math.random() * d.colors.length)] }))); pr.append(b); } root.append(pr); }
    } else if (mode === 'cook' || mode === 'craft') {
      const cook = mode === 'cook', lv = levelOf(W.self.skills.cooking || 0, bal).lv;
      root.append(mk('p', 'hint', cook ? `料理等級 ${lv}。對方也站在旁邊的話，一起煮出來的比較好吃（★）。煮好的料理在背包裡點它、再按「吃」。` : '用材料做加工機，做好後拿在手上，對著農場的空地按動作鍵放下去。'));
      const list = mk('div', 'shoplist');
      for (const [id, rc] of Object.entries(cook ? ctx.data.recipes : ctx.data.machines)) {
        if (!cook && !rc.craft) continue; // 果樹：買樹苗，不是在製作台做的
        const out = cook ? 'dish_' + id : 'm_' + id, it = items[out], need = cook ? rc.in : rc.craft, row = mk('div', 'shoprow'); row.dataset.item = id;
        const locked = cook && lv < rc.level, can = !locked && !!planTake(items, W.self.inv, need);
        row.append(itemIcon(items, out), mk('span', 'sname', it.name), mk('span', 'sdesc', locked ? `料理 ${rc.level} 級才會煮` : needText(need) + (cook ? `・體力 +${it.energy}${it.buff ? '・' + bal.buffNames[it.buff[0]] : ''}` : '')));
        const b = mk('button', 'pbtn', cook ? '煮' : '做'); b.type = 'button'; b.disabled = !can;
        b.addEventListener('click', async () => { const r = await room.req(cook ? { t: 'cook', recipe: id } : { t: 'craft', kind: id }); if (r.t === 'ok') hud.toast(cook ? `煮好了 ${it.name}${r.together ? ' ★（一起煮的）' : ''}` : `做好了 ${it.name}`, 1400); else say(r); });
        row.append(b); list.append(row);
      }
      root.append(list);
    } else if (mode === 'smith') {
      const T = bal.tools, lvs = W.self.toolLv || {};
      root.append(mk('p', 'hint', '石磊可以用錠把工具升級（木 → 銅 → 鐵 → 金）。越高級越省體力；斧頭、十字鎬、鐮刀、劍一下打得比較多。錠要用熔爐煉。'));
      const list = mk('div', 'shoplist');
      for (const tool of T.upgradable) {
        const id = Object.keys(items).find((k) => items[k].tool === tool && !items[k].power), it = items[id], lv = lvs[tool] || 1, cost = T.cost[lv], row = mk('div', 'shoprow'); row.dataset.item = tool;
        row.append(itemIcon(items, id), mk('span', 'sname', `${it.name}（${T.levels[lv - 1]}）`), mk('span', 'sdesc', cost ? `升到${T.levels[lv]}：${items[cost.bar].name}×${cost.n}、${cost.money} 元` : '已經是最高級'));
        const b = mk('button', 'pbtn', '升級'); b.type = 'button'; b.disabled = !cost || W.farm.money < cost.money || !planTake(items, W.self.inv, { [cost.bar]: cost.n });
        b.addEventListener('click', async () => { const r = await room.req({ t: 'upgrade', tool }); if (r.t === 'ok') hud.toast(`${it.name}升到${T.levels[r.lv - 1]}了！`, 1500); else say(r); }); row.append(b); list.append(row);
      }
      root.append(list);
    } else if (mode === 'shop') {
      const shop = ctx.data.shops[arg.shop || 'stall'], min = W.minute(), open = min >= shop.open && min < shop.close, hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
      root.append(mk('p', 'hint', open ? shop.hint : `現在沒有營業（${hm(shop.open)}～${hm(shop.close)}）。`));
      const list = mk('div', 'shoplist');
      for (const id of shopItems(shop, W.farm.season, ctx.data.crops)) {
        const it = items[id], row = mk('div', 'shoprow'); row.dataset.item = id;
        const crop = it.crop && ctx.data.crops[it.crop], days = crop ? crop.stageDays.reduce((a, b) => a + b, 0) : 0;
        row.append(itemIcon(items, id), mk('span', 'sname', it.name), mk('span', 'sdesc', crop ? `${days} 天${crop.regrowDays ? '・會再長' : ''}・賣 ${items[it.crop].sell}` : it.desc || (it.energy ? `體力 +${it.energy}` : '')), mk('span', 'sprice', `${it.buy} 元`));
        for (const n of it.kind === 'tool' ? [1] : [1, 5]) { const b = mk('button', 'pbtn', `買 ${n}`); b.type = 'button'; b.disabled = !open || W.farm.money < it.buy * n; b.addEventListener('click', async () => say(await room.req({ t: 'buy', shop: arg.shop || 'stall', item: id, n }))); row.append(b); }
        list.append(row);
      }
      root.append(list);
    } else {
      if (mode === 'ship') {
        const lines = W.farm.ship || [], total = lines.reduce((s, l) => s + sellPrice(items[l.id], l.q, bal) * l.n, 0);
        root.append(mk('p', 'hint', '點背包裡的東西放進出貨箱，明天早上結算，錢兩個人共用。'));
        root.append(mk('p', 'hint', lines.length ? `箱子裡：${lines.map((l) => `${items[l.id].name}${l.q ? '★' : ''}×${l.n}`).join('、')}（約 ${total} 元）` : '箱子裡還是空的。'));
      }
      if (mode === 'chest') { root.append(mk('p', 'hint', '倉庫箱兩個人共用。點一下就整疊搬過去。'), grid(W.farm.chest || [], bal.chestSlots, async (i) => say(await room.req({ t: 'chest', dir: 'out', slot: i, n: 999 })), 'chest'), mk('h3', '', '背包')); }
      root.append(grid(inv, bal.invSlots, async (i) => {
        const s = inv[i];
        if (mode === 'ship') { if (s) say(await room.req({ t: 'ship', slot: i, n: 999 })); return; }
        if (mode === 'chest') { if (s) say(await room.req({ t: 'chest', dir: 'in', slot: i, n: 999 })); return; }
        if (picked < 0) { if (s) { picked = i; info = items[s.id].name + (items[s.id].desc ? '：' + items[s.id].desc : items[s.id].sell ? `（賣 ${sellPrice(items[s.id], s.q, bal)} 元）` : ''); draw(); } }
        else { const a = picked; picked = -1; info = ''; if (a !== i) await room.req({ t: 'swap', slot: a, b: i }); else draw(); }
      }, 'inv'));
      if (mode === 'bag') root.append(mk('p', 'hint', info || '點一個東西再點另一格可以搬位置。第一排是快捷列。'));
      if (mode === 'bag' && picked >= 0 && inv[picked] && items[inv[picked].id].kind === 'dish') { // 選到料理：可以吃
        const it = items[inv[picked].id], b = mk('button', 'pbtn eat', `吃（體力 +${it.energy}${it.buff ? '・' + bal.buffNames[it.buff[0]] : ''}）`); b.type = 'button';
        b.addEventListener('click', async () => { const a = picked; picked = -1; info = ''; const r = await room.req({ t: 'eat', slot: a }); if (r.t === 'ok') hud.toast(r.buff ? `好吃！${bal.buffNames[r.buff[0]]}` : '好吃！', 1400); });
        root.append(b);
      }
      if (mode === 'bag' && picked >= 0 && inv[picked] && items[inv[picked].id].kind !== 'tool') { // 選到東西：對方在旁邊的話可以送給他
        const mate = [...W.others.values()].find((o) => o.map === W.me.map && Math.hypot(o.x - W.me.x, o.y - W.me.y) <= bal.duo.giveReach);
        if (mate) { const b = mk('button', 'pbtn eat', `送給 ${mate.name}（整疊）`); b.type = 'button'; b.dataset.act = 'give'; b.addEventListener('click', async () => { const a = picked; picked = -1; info = ''; const r = await room.req({ t: 'give', slot: a, n: 999 }); if (r.t === 'ok') hud.toast(`送給 ${mate.name} 了`, 1300); else say(r); }); root.append(b); }
      }
      const buffs = Object.keys(bal.buffNames).filter((k) => W.buff(k)).map((k) => bal.buffNames[k]); if (mode === 'bag' && buffs.length) root.append(mk('p', 'hint', '料理的效果：' + buffs.join('、')));
      if (mode === 'bag') { const cb = mk('button', 'pbtn', '圖鑑與成就'); cb.type = 'button'; cb.dataset.act = 'codex'; cb.addEventListener('click', () => { hud.closePanel(); openPanel(ctx, 'codex'); }); root.append(cb); }
      if (mode === 'bag') { const sk = Object.entries(bal.skills).map(([k, name]) => `${name} ${ctx.level(k)} 級`).join('　'); root.append(mk('p', 'hint', sk)); }
    }
  }
  draw();
  const off = [W.on('self', draw), W.on('farm', draw)];
  hud.openPanel(root, () => off.forEach((f) => f()));
}
