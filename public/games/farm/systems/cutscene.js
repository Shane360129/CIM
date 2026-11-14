// 劇情事件：照 data/events/*.json 寫的小腳本一步一步演。腳本的每一步是：
//   say（誰說：居民的 id；@me 自己、@partner 對方；兩個人的劇情裡 @a 是先開始的那個人、@b 是另一個，兩邊畫面一樣）、face 表情、text 說什麼
//   narrate（旁白，沒有頭像）、choice（選項：pts 加好感（給 npc，不寫就給這段劇情的居民）、flag 記旗標、goto 跳到標籤；
//     prompt 換掉「要怎麼回答？」、ask 是誰在問）、label、goto、emote（頭上冒表情，who 是誰，不寫就是自己）、
//   wait（等幾秒）、fade（畫面暗下來，中間顯示一句旁白）、end
// 文字裡的 {me}、{partner}、{a}、{b} 會換成名字。演完回傳玩家選了哪些選項（給伺服器算好感、記旗標）。寫新劇情不用改程式。
import { portraitEl } from '../render/doll.js';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// opts.cast：兩個人的劇情開始時伺服器給的 { a: {id, name, look}, b: {...} }；重看的時候沒有，就用現在的自己和對方
export async function runEvent(ctx, ev, opts = {}) {
  const { hud, world: W } = ctx, npcs = ctx.data.npcs, parts = ctx.data.parts, ui = document.getElementById('ui'), picks = [];
  const labels = new Map(ev.steps.map((s, i) => [s.label, i]).filter(([k]) => k));
  const cast = opts.cast || null, mate = [...W.others.values()][0];
  const me = { id: W.me.id, name: W.me.name, look: W.me.look };
  const castMate = cast && [cast.a, cast.b].find((c) => c && c.id !== W.me.id);
  // 對方：在線上就用現在的樣子；不在就用劇情開始時記下的樣子；再沒有就用預設角色
  const other = mate ? { id: mate.id, name: mate.name, look: mate.look } : castMate ? { ...castMate } : { id: 0, name: (W.partner && W.partner.name) || '對方', look: null };
  if (!other.look) other.look = parts.presets[me.look && me.look.gender === 'girl' ? 'boy' : 'girl'];
  const byRole = (c) => (c && c.id === W.me.id ? me : other);
  const person = (k) => (k === '@me' ? me : k === '@partner' ? other : k === '@a' ? (cast ? byRole(cast.a) : me) : k === '@b' ? (cast ? byRole(cast.b) : other) : null);
  const fill = (t) => String(t || '').replace(/\{(me|partner|a|b)\}/g, (_, k) => person('@' + k).name);
  const speaker = (k, expr) => {
    const p = person(k), n = !p && npcs[k];
    return p ? { portrait: portraitEl(p.look, expr || 'normal', 96), name: p.name } : n ? { portrait: portraitEl(n.look, expr || 'normal', 96), name: n.name } : { portrait: null, name: '' };
  };
  const next = [{ label: '▶', value: true }];
  for (let i = 0, guard = 0; i < ev.steps.length && guard < 300; i++, guard++) {
    const s = ev.steps[i];
    if (s.say) await hud.dialog({ ...speaker(s.say, s.face), sub: ev.title, text: fill(s.text), buttons: next });
    else if (s.narrate) await hud.dialog({ portrait: null, name: '', sub: ev.title, text: fill(s.narrate), buttons: next });
    else if (s.choice) {
      const asker = speaker(s.ask || ev.npc || '@me', 'normal');
      const k = await hud.dialog({ ...asker, sub: ev.title, text: fill(s.prompt || '（要怎麼回答？）'), buttons: s.choice.map((c, n) => ({ label: fill(c.text), value: n, ghost: n > 0 })) });
      const opt = s.choice[k == null ? 0 : k]; picks.push({ step: i, opt: k == null ? 0 : k });
      if (opt.goto && labels.has(opt.goto)) i = labels.get(opt.goto);
    } else if (s.goto && labels.has(s.goto)) i = labels.get(s.goto);
    else if (s.emote) { const p = person(s.who || '@me'); if (p && p.id) W.bubbles.set(p.id, { text: s.emote, life: 2, big: true }); await sleep(700); }
    else if (s.wait) await sleep(s.wait * 1000);
    else if (s.fade) {
      const el = document.createElement('div'); el.className = 'fade'; el.textContent = typeof s.fade === 'string' ? fill(s.fade) : ''; ui.append(el);
      await sleep(30); el.classList.add('on'); await sleep(typeof s.fade === 'string' ? 2000 : 700); el.classList.remove('on'); await sleep(450); el.remove();
    } else if (s.end) break;
  }
  return picks;
}
