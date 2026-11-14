// 建立角色／衣櫃換裝：左邊（手機是上面）預覽，右邊一列一列選零件和顏色。按「完成」存到伺服器，對方馬上看到。
// 第一次進農場還沒有角色時會先到這裡；之後在家裡選「換衣服」也是這個畫面（edit: true）。
import { drawDoll } from '../render/doll.js';
import { upgradeLook } from '../shared/look.js';
import { play } from './play.js';

const ROWS = [['hair', '髮型', 'hairColor', 'hair'], ['eyes', '眼睛'], ['brows', '眉毛'], ['mouths', '表情'], ['top', '上衣', 'topColor', 'cloth'], ['bottom', '下身', 'bottomColor', 'cloth'],
  ['shoes', '鞋子', 'shoesColor', 'cloth'], ['hat', '帽子', 'hatColor', 'cloth'], ['acc', '配件']];
const DIRS = ['down', 'right', 'up', 'left'];
const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export const create = {
  enter(ctx, arg = {}) {
    const parts = (this.parts = ctx.data.parts), W = ctx.world;
    this.t = 0; this.dir = 0; this.walk = true; this.edit = !!arg.edit;
    this.look = upgradeLook({ ...(W.me.look || parts.presets.boy) }, parts); // 舊角色的舊零件名稱先換成新的，存檔時伺服器才收
    const root = (this.root = mk('div', 'maker')), ui = document.getElementById('ui');
    root.append(mk('h2', '', this.edit ? '換衣服' : '建立你的角色'));
    const refresh = [];
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
    const act = mk('div', 'mrow actions');
    const b = (text, cls, fn) => { const n = mk('button', 'mbtn ' + cls, text); n.type = 'button'; n.addEventListener('click', fn); act.append(n); return n; };
    b('🎲 隨機', 'ghost', () => {
      const pick = (l) => l[Math.floor(Math.random() * l.length)];
      for (const [key, , colorKey, colorList] of ROWS) { this.look[key] = pick(parts[key]).id; if (colorKey) this.look[colorKey] = pick(parts.colors[colorList]); }
      this.look.skin = pick(parts.colors.skin); refresh.forEach((f) => f());
    }).dataset.act = 'random';
    b('↻ 轉身', 'ghost', () => { this.dir = (this.dir + 1) % 4; });
    const wb = b('走路', 'ghost', () => { this.walk = !this.walk; wb.classList.toggle('on', this.walk); }); wb.classList.add('on');
    if (this.edit) b('取消', 'ghost', () => ctx.scenes.go(play));
    b('完成', 'go', () => {
      const name = input.value.replace(/\s+/g, ' ').trim().slice(0, 10) || W.me.name;
      W.setLook({ ...this.look }, name); ctx.scenes.go(play);
    }).dataset.act = 'done';
    root.append(act); ui.append(root);
    refresh.forEach((f) => f());
  },
  exit() { this.root.remove(); },
  update(dt) { this.t += dt; },
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
