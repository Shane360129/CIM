// 地圖：把一張地圖縮小畫出來（地面、田、樹、房子），標出建築的名字、出入口通到哪裡，還有自己、對方、居民在哪裡。
// 上面一排可以切換看別張地圖，不用走過去就知道店在哪裡、對方在哪裡。開著的時候每秒重畫一次，人會跟著動。
import { buildGround } from '../render/ground.js';
import { drawSprite } from '../render/sprites.js';
import { drawObject } from '../render/placeholder.js';
import { setPixelGrid } from '../render/pixel.js';
const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const F = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
const grounds = new Map(); // 每張地圖的地面（照季節、南邊的田開了沒）拼一次就記著

export function openMap(ctx, scene) {
  const { hud, data, world: W, view } = ctx, T = data.balance.tile, objects = data.objects, maps = data.maps;
  const root = mk('div', 'panel mappanel'), head = mk('div', 'phead'), title = mk('h2', '', '地圖'), close = mk('button', 'pclose', '✕');
  close.type = 'button'; close.setAttribute('aria-label', '關閉'); close.addEventListener('click', () => hud.closePanel()); head.append(title, close);
  const tabs = mk('div', 'maptabs'), cv = mk('canvas', 'mapcv'), where = mk('p', 'hint mapwhere'), legend = mk('p', 'hint maplegend');
  root.append(head, tabs, cv, where, legend);
  // 一排地圖的名字：戶外的地圖都列出來；人在室內的話那一間也列出來。礦坑沒有地圖（每一層都不一樣）
  const here = maps[scene.mapId] ? scene.mapId : null;
  const list = Object.keys(maps).filter((id) => maps[id].outdoor || id === here);
  let shown = here || 'farm';
  const season = () => (W.farm && W.farm.season) || 'spring';
  const ground = (id) => {
    const unlocked = !!(W.farm && (W.farm.land || {}).field2), k = `${id}|${season()}|${unlocked}`;
    if (!grounds.has(k)) { if (grounds.size > 24) grounds.clear(); grounds.set(k, buildGround(maps[id], T, unlocked, season())); }
    return grounds.get(k);
  };
  // 哪些東西要寫名字：掛招牌的、可以進去或可以用的房子和攤子；室內的家具全部都寫
  const landmark = (def, indoor) => (def.sign || (def.use && def.use !== 'home' && (indoor || (def.tiles || [1, 1])[0] >= 2 || ['bin', 'board'].includes(def.use))) ? def.name : null);

  function draw() {
    const map = maps[shown], dpr = Math.min(2, window.devicePixelRatio || 1);
    // 一格畫多大：寬度塞滿面板，高度留位置給上面的按鈕和下面的說明。畫面不夠高（手機橫放）時地圖名字排在左邊、地圖在右邊（樣式在 farm.css）
    const flat = view.h <= 520, availW = Math.max(160, root.clientWidth - 34 - (flat ? 186 : 0)), availH = Math.max(120, view.h - (flat ? 96 : 250));
    const s = Math.min(32, availW / map.w, availH / map.h), cw = Math.round(map.w * s), ch = Math.round(map.h * s);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    const g = cv.getContext('2d'), k = s * dpr / T; // 地圖上的一個像素 → 這張小圖的幾個像素
    g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; setPixelGrid(0);
    g.fillStyle = map.outdoor ? '#5f9c4a' : '#3b2f22'; g.fillRect(0, 0, map.w * T, map.h * T);
    const gr = ground(shown); g.drawImage(gr, 0, 0, gr.width * gr.scale, gr.height * gr.scale);
    // 翻過的田（深色）、上面的作物（綠點；熟了是黃點）
    for (const t of W.tiles.values()) {
      if (t.map !== shown) continue;
      g.fillStyle = t.w ? '#5b3a1e' : '#7a4f2a'; g.fillRect(t.x * T + 2, t.y * T + 2, T - 4, T - 4);
      if (t.c) { g.fillStyle = t.c.s < 0 ? '#8a6a44' : t.c.s === 4 ? '#ffd84a' : '#58b947'; g.beginPath(); g.arc((t.x + 0.5) * T, (t.y + 0.5) * T, T * 0.3, 0, 7); g.fill(); }
    }
    // 樹、石頭、房子：照遊戲裡的樣子畫，由遠到近
    const things = [], labels = [], sn = season();
    for (const o of map.objects) { const def = objects[o.type]; if (def.tool) continue; const [tw] = def.tiles || [1, 1]; things.push({ def, fx: o.x + tw / 2, fy: o.y + 0.92 }); const name = landmark(def, !map.outdoor); if (name) labels.push({ name, x: o.x + tw / 2, y: o.y + 0.2 }); }
    for (const o of W.objs.values()) if (o.map === shown) things.push({ def: scene.objDef(o), fx: o.x + 0.5, fy: o.y + 0.92 });
    things.sort((a, b) => (a.def.flat ? -1e9 : a.fy) - (b.def.flat ? -1e9 : b.fy));
    for (const t of things) { const d = t.def, art = d.art && d.art.replace('{season}', sn); if (!(art && drawSprite(g, art, t.fx * T, t.fy * T, d.w * T, d.h * T, d.hue || 0))) drawObject(g, d, t.fx * T, t.fy * T, T); }
    // 下面開始用畫面的像素畫（字和點不跟著地圖縮小）
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 名牌：字放在一塊小底色上才看得清楚；跟已經放好的名牌疊在一起的話往上或往下挪一行
    const placed = [];
    const tag = (str, x, y, { size = 11, color = '#3b2a1a', bg = 'rgba(255, 250, 235, .9)', line = 'rgba(90, 61, 34, .55)' } = {}) => {
      g.font = `700 ${size}px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = g.measureText(str).width + 8, h = size + 5; x = Math.max(w / 2 + 1, Math.min(cw - w / 2 - 1, x));
      const hit = (yy) => placed.some((r) => Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - yy) < (r.h + h) / 2);
      const y0 = Math.max(h / 2 + 1, Math.min(ch - h / 2 - 1, y)); y = y0;
      for (const d of [0, -1, 1, -2, 2]) { const yy = y0 + d * (h + 1); if (yy > h / 2 && yy < ch - h / 2 && !hit(yy)) { y = yy; break; } }
      placed.push({ x, y, w, h });
      g.fillStyle = bg; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 4); g.fill(); g.stroke();
      g.fillStyle = color; g.fillText(str, x, y + 0.5);
    };
    for (const l of labels) tag(l.name, l.x * s, l.y * s - 6);
    // 出入口：通到哪裡（箭頭指向地圖外面）
    for (const e of map.exits || []) {
      if (!e.to) continue;
      const arrow = e.x <= 0 ? '←' : e.x + e.w >= map.w ? '→' : e.y <= 0 ? '↑' : '↓', name = (maps[e.to] || {}).name || e.label;
      tag(arrow === '→' ? `${name} ${arrow}` : `${arrow} ${name}`, (e.x + e.w / 2) * s, (e.y + e.h / 2) * s, { color: '#fff', bg: 'rgba(40, 110, 190, .92)', line: '#fff' });
    }
    // 人：居民是小白點＋名字，對方藍色，自己橘色（畫在最上面）
    const dot = (x, y, r, color) => { g.fillStyle = color; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x * s, y * s, r, 0, 7); g.fill(); g.stroke(); };
    const mates = [...W.others.values()].filter((o) => o.map === shown), meHere = W.me.map === shown;
    // 先放自己和對方的名牌（最重要，位置不讓），再放居民的
    for (const o of mates) tag(o.name, o.x * s, (o.y - 0.3) * s - 15, { size: 12, color: '#fff', bg: '#2f7fd6', line: '#fff' });
    if (meHere) tag('你', W.me.x * s, (W.me.y - 0.3) * s - 16, { size: 12, color: '#fff', bg: '#e8872e', line: '#fff' });
    for (const n of scene.folks(shown)) { g.fillStyle = '#fff'; g.strokeStyle = '#5a3d22'; g.lineWidth = 1.5; g.beginPath(); g.arc(n.x * s, (n.y - 0.3) * s, 3, 0, 7); g.fill(); g.stroke(); if (s >= 9) tag(n.n.name, n.x * s, (n.y - 0.3) * s - 11, { size: 10, color: '#5a3d22', bg: 'rgba(255, 255, 255, .82)', line: 'rgba(90, 61, 34, .3)' }); }
    for (const o of mates) dot(o.x, o.y - 0.3, 5.5, '#2f7fd6');
    if (meHere) dot(W.me.x, W.me.y - 0.3, 6, '#e8872e');
    // 字：這張是哪裡、兩個人各在哪裡
    title.textContent = `地圖・${map.name}`;
    const place = (p) => (p.map === 'mine' ? '礦坑' : (maps[p.map] || {}).name || '');
    const other = [...W.others.values()][0], pn = (W.partner && W.partner.name) || '對方';
    const lines = [`你在：${place(W.me)}`, other ? `${other.name}在：${place(other)}` : `${pn}現在不在線上`];
    if (where.dataset.text !== lines.join('|')) { where.dataset.text = lines.join('|'); where.textContent = ''; for (const l of lines) where.append(mk('span', '', l)); }
    for (const b of tabs.children) { b.classList.toggle('on', b.dataset.map === shown); b.classList.toggle('me', b.dataset.map === W.me.map); }
  }
  for (const id of list) { const b = mk('button', '', maps[id].name); b.type = 'button'; b.dataset.map = id; b.addEventListener('click', () => { shown = id; draw(); }); tabs.append(b); }
  legend.textContent = '橘色是你、藍色是對方、白點是居民。上面一排可以看別張地圖。';
  const timer = setInterval(() => { if (root.isConnected) draw(); }, 1000), off = W.on('map', (id) => { if (maps[id]) shown = id; });
  hud.openPanel(root, () => { clearInterval(timer); off(); });
  draw();
}
