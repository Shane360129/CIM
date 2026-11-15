// 晴耕谷：遊戲入口。把各個部分接起來，然後從載入畫面開始
import { startLoop } from './core/loop.js';
import { createView } from './core/view.js';
import { createScenes } from './core/scenes.js';
import { createCamera } from './core/camera.js';
import { createInput } from './core/input.js';
import { createHud } from './ui/hud.js';
import { loading } from './scenes/loading.js';
import { createSettings } from './core/settings.js';
import { createAudio } from './core/audio.js';

const canvas = document.getElementById('stage'), ui = document.getElementById('ui');
const ctx = { view: createView(canvas), camera: createCamera(), input: createInput(canvas, ui), hud: createHud(ui, 10), data: null, session: null };
ctx.settings = createSettings(); ctx.audio = createAudio(ctx.settings);
// 個人設定套到畫面上：字體大小、搖桿左右、畫質
function applySettings() {
  const s = ctx.settings;
  ui.classList.toggle('font-s', s.get('font') === 's'); ui.classList.toggle('font-l', s.get('font') === 'l'); ui.classList.toggle('lefty', s.get('hand') === 'left');
  if (s.get('stick') === 'always') ctx.input.showTouch();
  // 一般模式最多 2 倍像素：3 倍的手機看不出差別，卻要多畫一倍多的像素
  const max = s.get('low') ? 1 : 2; if (ctx.view.maxDpr !== max) { ctx.view.maxDpr = max; ctx.view.resize(); }
}
applySettings(); ctx.settings.on(applySettings);
ctx.scenes = createScenes(ctx);
startLoop({ update: (dt) => ctx.scenes.update(dt), render: (alpha) => ctx.scenes.render(alpha), half: () => ctx.settings.get('low') });
ctx.scenes.go(loading);
// 自動化測試用：網址帶 &test 時，讓測試程式看得到遊戲的狀態（正常使用不會出現）
// 舊的測試不想被劇情打斷：帶 &test 時主線、兩個人的劇情不會自己發生，除非也帶 &story（劇情的測試用）
const qs = new URLSearchParams(location.search);
if (qs.has('test')) { window.__game = ctx; ctx.noStory = !qs.has('story'); }

// 聊天室（外面那一頁）說有新訊息：在遊戲裡提示一下，按 Esc 或右上角的 ✕ 就能回去看
window.addEventListener('message', (e) => { if (e.origin === location.origin && e.data && e.data.type === 'chat-message') ctx.hud.toast('💬 聊天室有新訊息', 2500); });
