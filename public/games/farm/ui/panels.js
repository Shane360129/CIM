// 遊戲裡的面板：背包、出貨箱、倉庫箱、種子攤。都是一般的網頁元素，蓋在畫面中間；內容每次有變化就整個重畫。
import { iconEl } from '../render/sprites.js';
import { sellPrice, planTake, levelOf, hearts } from '../shared/rules.js';
const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

// 一個物品的小圖：有圖用圖（種子是「種子袋＋作物」疊起來），沒有圖用名字的第一個字
export function itemIcon(items, id, size = 34) {
  const it = items[id], box = mk('span', 'iicon'); if (!it) return box;
  const base = iconEl(it.art, size);
  if (base) { box.append(base); if (it.overlay) { const o = iconEl(it.overlay, size * 0.55); if (o) { o.classList.add('over'); box.append(o); } } }
  else box.append(mk('span', 'ifallback', it.name.slice(0, 1)));
  return box;
}
function slotEl(items, bal, s, onClick, extraCls = '') {
  const b = mk('button', 'cell ' + extraCls); b.type = 'button';
  if (s) { b.append(itemIcon(items, s.id)); if (s.n > 1) b.append(mk('span', 'count', String(s.n))); if (s.q) b.append(mk('span', 'qual q' + s.q, '★')); b.title = items[s.id].name + (s.q ? `（${bal.quality.names[s.q]}）` : ''); }
  b.addEventListener('click', onClick); return b;
}

export function openPanel(ctx, mode) {
  const { hud, world: W } = ctx, { items, balance: bal } = ctx.data, room = W.room;
  const root = mk('div', 'panel'), title = { bag: '背包', ship: '出貨箱', chest: '倉庫箱', shop: '種子攤', cook: '爐灶', craft: '製作台', coop: '雞舍', barn: '畜舍' }[mode];
  let picked = -1, info = '';
  const say = (r) => { if (r.t === 'no') hud.toast({ full: '放不下了', money: '錢不夠', materials: '材料不夠', level: '料理等級還不夠', housefull: '住滿了', nohay: '沒有乾草了（種子攤有賣）', already: '已經弄好了', closed: '現在沒有營業（6:00～18:00）', far: '太遠了', unsellable: '這個不能賣' }[r.reason] || '沒辦法', 1300); };
  const grid = (list, n, onClick, cls) => { const g = mk('div', 'grid'); for (let i = 0; i < n; i++) g.append(slotEl(items, bal, list[i], () => onClick(i), (i === picked && cls === 'inv' ? 'on ' : '') + (i < bal.hotbarSlots && cls === 'inv' ? 'hot' : ''))); return g; };
  function draw() {
    root.textContent = '';
    const head = mk('div', 'phead'); head.append(mk('h2', '', title), mk('span', 'money', `💰 ${W.farm.money}`));
    const x = mk('button', 'pclose', '✕'); x.type = 'button'; x.setAttribute('aria-label', '關閉'); x.addEventListener('click', () => hud.closePanel()); head.append(x); root.append(head);
    const inv = W.self.inv;
    const needText = (need) => Object.entries(need).map(([spec, n]) => `${spec === '@crop' ? '任何作物' : spec.startsWith('@') ? { veg: '蔬菜', fruit: '水果', fish: '魚', egg: '蛋', milk: '牛奶', forage: '採集物', flower: '花' }[spec.slice(1)] || spec : spec.startsWith('g:') ? ctx.data.machines[spec.slice(2)].name + '做的' : items[spec].name}×${n}`).join('、');
    if (mode === 'coop' || mode === 'barn') {
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
        const out = cook ? 'dish_' + id : 'm_' + id, it = items[out], need = cook ? rc.in : rc.craft, row = mk('div', 'shoprow'); row.dataset.item = id;
        const locked = cook && lv < rc.level, can = !locked && !!planTake(items, W.self.inv, need);
        row.append(itemIcon(items, out), mk('span', 'sname', it.name), mk('span', 'sdesc', locked ? `料理 ${rc.level} 級才會煮` : needText(need) + (cook ? `・體力 +${it.energy}${it.buff ? '・' + bal.buffNames[it.buff[0]] : ''}` : '')));
        const b = mk('button', 'pbtn', cook ? '煮' : '做'); b.type = 'button'; b.disabled = !can;
        b.addEventListener('click', async () => { const r = await room.req(cook ? { t: 'cook', recipe: id } : { t: 'craft', kind: id }); if (r.t === 'ok') hud.toast(cook ? `煮好了 ${it.name}${r.together ? ' ★（一起煮的）' : ''}` : `做好了 ${it.name}`, 1400); else say(r); });
        row.append(b); list.append(row);
      }
      root.append(list);
    } else if (mode === 'shop') {
      const min = W.minute(), open = min >= bal.shop.open && min < bal.shop.close;
      root.append(mk('p', 'hint', open ? '種子要種在翻過的土上。現在是春天，這些都是春天的作物。' : '現在沒有營業（6:00～18:00）。'));
      const list = mk('div', 'shoplist');
      for (const id of bal.shop.items) {
        const it = items[id], row = mk('div', 'shoprow'); row.dataset.item = id;
        const crop = it.crop && ctx.data.crops[it.crop], days = crop ? crop.stageDays.reduce((a, b) => a + b, 0) : 0;
        row.append(itemIcon(items, id), mk('span', 'sname', it.name), mk('span', 'sdesc', crop ? `${days} 天${crop.regrowDays ? '・會再長' : ''}・賣 ${items[it.crop].sell}` : it.desc || ''), mk('span', 'sprice', `${it.buy} 元`));
        for (const n of [1, 5]) { const b = mk('button', 'pbtn', `買 ${n}`); b.type = 'button'; b.disabled = !open || W.farm.money < it.buy * n; b.addEventListener('click', async () => say(await room.req({ t: 'buy', item: id, n }))); row.append(b); }
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
      const buffs = Object.keys(bal.buffNames).filter((k) => W.buff(k)).map((k) => bal.buffNames[k]); if (mode === 'bag' && buffs.length) root.append(mk('p', 'hint', '料理的效果：' + buffs.join('、')));
      if (mode === 'bag') { const sk = Object.entries(bal.skills).map(([k, name]) => `${name} ${ctx.level(k)} 級`).join('　'); root.append(mk('p', 'hint', sk)); }
    }
  }
  draw();
  const off = [W.on('self', draw), W.on('farm', draw)];
  hud.openPanel(root, () => off.forEach((f) => f()));
}
