// 建立角色／衣櫃換裝：左邊（手機是上面）預覽，右邊一列一列選零件和顏色。按「完成」存到伺服器，對方馬上看到。
// 第一次進農場還沒有角色時會先到這裡；之後在家裡選「換衣服」也是這個畫面（edit: true）。
import { drawDoll } from '../render/doll.js';
import { drawLPC } from '../render/lpc.js';
import { upgradeLook } from '../shared/look.js';
import { play } from './play.js';

const ROWS = [['hair', '髮型', 'hairColor', 'hair'], ['eyes', '眼睛'], ['brows', '眉毛'], ['mouths', '表情'], ['top', '上衣', 'topColor', 'cloth'], ['bottom', '下身', 'bottomColor', 'cloth'],
  ['shoes', '鞋子', 'shoesColor', 'cloth'], ['hat', '帽子', 'hatColor', 'cloth'], ['acc', '配件']];
const DIRS = ['down', 'right', 'up', 'left'];
const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export const create = {
  enter(ctx, arg = {}) {
    const parts = (this.parts = ctx.data.parts), W = ctx.world;
    this.t = 0; this.dir = 0; this.walk = true; this.edit = !!arg.edit; this.outKey = null;
    this.look = upgradeLook({ ...(W.me.look || parts.presets.boy) }, parts); // 舊角色的舊零件名稱先換成新的，存檔時伺服器才收
    const root = (this.root = mk('div', 'maker')), ui = document.getElementById('ui');
    root.append(mk('h2', '', this.edit ? '換衣服' : '建立你的角色'));
    const refresh = [];
    // 現成的角色：一排小圖，點一下整套換上（名字不變），之後每一項都還能改
    const same = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => a[k] === b[k]);
    const gal = mk('div', 'mgallery'); this.thumbs = [];
    (parts.gallery || []).forEach((gp, i) => {
      const b = mk('button', 'mpreset'), c = document.createElement('canvas'); b.type = 'button'; b.dataset.preset = String(i); b.setAttribute('aria-label', '換成「' + gp.name + '」');
      c.width = 120; c.height = 136; b.append(c, mk('span', '', gp.name)); gal.append(b);
      b.addEventListener('click', () => { this.look = upgradeLook({ ...gp.look }, parts); refresh.forEach((f) => f()); });
      refresh.push(() => b.classList.toggle('on', same(this.look, gp.look)));
      this.thumbs.push({ c, look: gp.look, done: false });
    });
    // 我的穿搭：自己存起來的幾套（存在伺服器，換手機也在）。點一下整套換上，✕ 刪掉，最下面可以把現在這套存起來
    const outBox = mk('div', 'moutfits'), refreshAll = () => refresh.forEach((f) => f());
    const drawOutfits = () => {
      const list = W.self.outfits || [], max = ctx.data.balance.outfits.max, key = JSON.stringify(list);
      if (key === this.outKey) return; // 伺服器的 self 不是穿搭變了（例如體力）：不用重畫
      this.outKey = key; outBox.textContent = ''; this.outThumbs = [];
      outBox.append(mk('p', 'mhint', list.length ? `我的穿搭（${list.length}／${max}）：點一下整套換上` : '我的穿搭：配好一套之後按最下面的「存成穿搭」，之後就能一鍵換上'));
      if (list.length) {
        const row = mk('div', 'mgallery');
        list.forEach((o, i) => {
          const wrap = mk('div', 'moutfit'), b = mk('button', 'mpreset'), c = document.createElement('canvas'), del = mk('button', 'mdel', '✕');
          b.type = del.type = 'button'; b.dataset.outfit = String(i); del.dataset.del = String(i); b.setAttribute('aria-label', '換上「' + o.name + '」'); del.setAttribute('aria-label', '刪掉「' + o.name + '」');
          c.width = 120; c.height = 136; b.append(c, mk('span', '', o.name)); wrap.append(b, del); row.append(wrap);
          b.addEventListener('click', () => { this.look = upgradeLook({ ...o.look }, parts); refreshAll(); });
          del.addEventListener('click', async () => { del.disabled = true; const r = await W.room.req({ t: 'outfit', op: 'del', slot: i }); if (r.t !== 'ok') { del.disabled = false; ctx.hud.toast('刪不掉，再試一次', 1200); } });
          this.outThumbs.push({ c, b, look: o.look, done: false });
        });
        outBox.append(row);
      }
      refreshAll();
    };
    refresh.push(() => (this.outThumbs || []).forEach((t) => t.b.classList.toggle('on', same(this.look, t.look))));
    if (this.edit) root.append(outBox);
    if (this.thumbs.length) root.append(mk('p', 'mhint', '選一個現成的角色，或在下面一項一項自己配'), gal);
    if (!this.edit) root.append(outBox);
    // 男生／女生：決定預設的五官、髮型、服裝（之後每一項都還能改，所有服裝男女都能穿）
    const g = mk('div', 'mrow'); g.append(mk('span', 'mlabel', '角色'));
    for (const [id, name] of [['boy', '男生'], ['girl', '女生']]) {
      const b = mk('button', 'mbtn', name); b.type = 'button'; b.dataset.gender = id;
      b.addEventListener('click', () => { this.look = { ...parts.presets[id] }; refresh.forEach((f) => f()); });
      refresh.push(() => b.classList.toggle('on', this.look.gender === id)); g.append(b);
    }
    root.append(g);
    const colorRow = (key, list) => {
      const row = mk('div', 'swatches');
      for (const c of parts.colors[list]) { const s = mk('button', 'swatch'); s.type = 'button'; s.style.background = c; s.title = c; s.addEventListener('click', () => { this.look[key] = c; refresh.forEach((f) => f()); }); refresh.push(() => s.classList.toggle('on', this.look[key] === c)); row.append(s); }
      return row;
    };
    const skin = mk('div', 'mrow'); skin.append(mk('span', 'mlabel', '膚色'), colorRow('skin', 'skin')); root.append(skin);
    // 體型（男生、女生、少年）和臉型（男、女、娃娃臉、圓臉、瘦臉、爺爺、奶奶）：沒選的話照上面的男生／女生
    const pickRow = (key, label, list) => {
      if (!list || !list.length) return;
      const row = mk('div', 'mrow'), prev = mk('button', 'marrow', '◀'), next = mk('button', 'marrow', '▶'), name = mk('span', 'mname');
      prev.type = next.type = 'button'; prev.setAttribute('aria-label', '上一個' + label); next.setAttribute('aria-label', '下一個' + label); next.dataset.next = key;
      const cur = () => this.look[key] || (parts.genders[this.look.gender] || parts.genders.boy)[key];
      const step = (d) => { const i = list.findIndex((v) => v.id === cur()); this.look[key] = list[(i + d + list.length) % list.length].id; refresh.forEach((f) => f()); };
      prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
      refresh.push(() => { name.textContent = (list.find((v) => v.id === cur()) || {}).name || ''; });
      row.append(mk('span', 'mlabel', label), prev, name, next); root.append(row);
    };
    pickRow('body', '體型', parts.bodies); pickRow('head', '臉型', parts.heads);
    for (const [key, label, colorKey, colorList] of ROWS) {
      const row = mk('div', 'mrow'), prev = mk('button', 'marrow', '◀'), next = mk('button', 'marrow', '▶'), name = mk('span', 'mname');
      prev.type = next.type = 'button'; prev.setAttribute('aria-label', '上一個' + label); next.setAttribute('aria-label', '下一個' + label); next.dataset.next = key;
      // hidden：使用者挑掉不要的款式不列出來（已經穿著的照樣能顯示）
      const step = (d) => { const list = parts[key].filter((v) => !v.hidden), i = list.findIndex((v) => v.id === this.look[key]); this.look[key] = list[(i + d + list.length) % list.length].id; refresh.forEach((f) => f()); };
      prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
      refresh.push(() => { name.textContent = (parts[key].find((v) => v.id === this.look[key]) || {}).name || ''; });
      row.append(mk('span', 'mlabel', label), prev, name, next); root.append(row);
      if (colorKey) { const cr = mk('div', 'mrow sub'); cr.append(mk('span', 'mlabel', ''), colorRow(colorKey, colorList)); root.append(cr); }
    }
    const nameRow = mk('div', 'mrow'), input = (this.input = mk('input', 'minput'));
    input.type = 'text'; input.maxLength = 10; input.value = W.me.name || ''; input.placeholder = '名字（最多 10 個字）';
    nameRow.append(mk('span', 'mlabel', '名字'), input); root.append(nameRow);
    // 存成穿搭：取個名字（不取就叫「穿搭 1」），滿了要先刪一套
    const saveRow = mk('div', 'mrow'), oname = mk('input', 'oinput'), sb = mk('button', 'mbtn ghost', '👕 存成穿搭');
    oname.type = 'text'; oname.maxLength = 8; oname.placeholder = '這套叫什麼（最多 8 個字）'; sb.type = 'button'; sb.dataset.act = 'save-outfit';
    sb.addEventListener('click', async () => {
      if ((W.self.outfits || []).length >= ctx.data.balance.outfits.max) return ctx.hud.toast(`最多存 ${ctx.data.balance.outfits.max} 套，先刪掉一套`, 1600);
      sb.disabled = true; const r = await W.room.req({ t: 'outfit', op: 'save', name: oname.value.trim(), look: { ...this.look } }); sb.disabled = false;
      if (r.t === 'ok') { oname.value = ''; ctx.hud.toast('存好了！在背包裡也能一鍵換上', 1600); } else ctx.hud.toast(r.reason === 'full' ? '穿搭滿了，先刪掉一套' : '存不起來，再試一次', 1400);
    });
    saveRow.append(mk('span', 'mlabel', '穿搭'), oname, sb); root.append(saveRow);
    const act = mk('div', 'mrow actions');
    const b = (text, cls, fn) => { const n = mk('button', 'mbtn ' + cls, text); n.type = 'button'; n.addEventListener('click', fn); act.append(n); return n; };
    b('🎲 隨機', 'ghost', () => {
      const pick = (l) => l[Math.floor(Math.random() * l.length)];
      for (const [key, , colorKey, colorList] of ROWS) { this.look[key] = pick(parts[key]).id; if (colorKey) this.look[colorKey] = pick(parts.colors[colorList]); }
      this.look.skin = pick(parts.colors.skin);
      if (parts.bodies) { this.look.body = pick(parts.bodies).id; this.look.head = pick(parts.heads.filter((h) => !/elderly/.test(h.id) || Math.random() < 0.3)).id; } // 老人臉少一點
      refresh.forEach((f) => f());
    }).dataset.act = 'random';
    b('↻ 轉身', 'ghost', () => { this.dir = (this.dir + 1) % 4; });
    const wb = b('走路', 'ghost', () => { this.walk = !this.walk; wb.classList.toggle('on', this.walk); }); wb.classList.add('on');
    if (this.edit) b('取消', 'ghost', () => ctx.scenes.go(play));
    b('完成', 'go', () => {
      const name = input.value.replace(/\s+/g, ' ').trim().slice(0, 10) || W.me.name;
      W.setLook({ ...this.look }, name); ctx.scenes.go(play);
    }).dataset.act = 'done';
    root.append(act); ui.append(root);
    drawOutfits(); this.offSelf = W.on('self', drawOutfits); // 存好、刪掉之後伺服器回傳新的清單，重畫
  },
  exit() { this.root.remove(); if (this.offSelf) this.offSelf(); this.offSelf = null; },
  update(dt) {
    this.t += dt;
    // 現成角色的小圖：零件圖下載好了才畫得出來，畫好的就不再畫
    for (const th of [...(this.thumbs || []), ...(this.outThumbs || [])]) {
      if (th.done) continue;
      const g = th.c.getContext('2d'); g.clearRect(0, 0, th.c.width, th.c.height);
      th.done = drawLPC(g, th.look, th.c.width / 2, th.c.height - 6, 2, 'down', 'idle', 0);
    }
  },
  render({ view }) {
    const g = view.ctx, k = view.dpr; g.setTransform(k, 0, 0, k, 0, 0);
    g.fillStyle = '#cfe8b0'; g.fillRect(0, 0, view.w, view.h);
    // 預覽放在沒有被面板蓋住的那一塊：寬螢幕在左半邊，直的手機在上面
    const wide = view.w > 720, cx = wide ? (view.w - Math.min(420, view.w * 0.5)) / 2 : view.w / 2, areaH = wide ? view.h : view.h * 0.36;
    const U = Math.min(areaH * 0.26, (wide ? view.w * 0.2 : view.w * 0.22)), cy = wide ? view.h * 0.5 + U * 1.3 : areaH - U * 0.2;
    g.fillStyle = '#a8d98a'; g.beginPath(); g.ellipse(cx, cy, U * 1.3, U * 0.36, 0, 0, 7); g.fill();
    drawDoll(g, this.look, this.parts, cx, cy, U, DIRS[this.dir], this.walk ? 'walk' : 'idle', this.t);
  },
};
