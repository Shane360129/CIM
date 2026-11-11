// 劇情事件：照 data/events/*.json 寫的小腳本一步一步演。腳本的每一步是：
//   say（誰說、什麼表情、說什麼）、choice（選項：可以加好感 pts、記旗標 flag、跳到標籤 goto）、label、goto、
//   emote（自己頭上冒表情）、wait（等幾秒）、fade（畫面暗下來，中間顯示一句旁白）、end
// 演完回傳玩家選了哪些選項（給伺服器算好感）。之後的心事件、主線都用這個寫，不用改程式。
import { iconEl } from '../render/sprites.js';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runEvent(ctx, ev) {
  const { hud, world: W } = ctx, npcs = ctx.data.npcs, ui = document.getElementById('ui'), picks = [];
  const labels = new Map(ev.steps.map((s, i) => [s.label, i]).filter(([k]) => k));
  const face = (who, expr) => iconEl(`${npcs[who].portrait}/${expr || 'normal'}`, 96) || iconEl(`${npcs[who].portrait}/normal`, 96);
  for (let i = 0, guard = 0; i < ev.steps.length && guard < 200; i++, guard++) {
    const s = ev.steps[i];
    if (s.say) await hud.dialog({ portrait: face(s.say, s.face), name: npcs[s.say].name, sub: ev.title, text: s.text, buttons: [{ label: '▶', value: true }] });
    else if (s.choice) {
      const k = await hud.dialog({ portrait: face(ev.npc, 'normal'), name: npcs[ev.npc].name, sub: ev.title, text: '（要怎麼回答？）', buttons: s.choice.map((c, n) => ({ label: c.text, value: n, ghost: n > 0 })) });
      const opt = s.choice[k == null ? 0 : k]; picks.push({ step: i, opt: k == null ? 0 : k });
      if (opt.goto && labels.has(opt.goto)) i = labels.get(opt.goto);
    } else if (s.goto && labels.has(s.goto)) i = labels.get(s.goto);
    else if (s.emote) { W.bubbles.set(W.me.id, { text: s.emote, life: 2, big: true }); await sleep(700); }
    else if (s.wait) await sleep(s.wait * 1000);
    else if (s.fade) {
      const el = document.createElement('div'); el.className = 'fade'; el.textContent = typeof s.fade === 'string' ? s.fade : ''; ui.append(el);
      await sleep(30); el.classList.add('on'); await sleep(typeof s.fade === 'string' ? 2000 : 700); el.classList.remove('on'); await sleep(450); el.remove();
    } else if (s.end) break;
  }
  return picks;
}
