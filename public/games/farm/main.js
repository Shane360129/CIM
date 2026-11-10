// 晴耕谷：遊戲入口。把各個部分接起來，然後從載入畫面開始
import { startLoop } from './core/loop.js';
import { createView } from './core/view.js';
import { createScenes } from './core/scenes.js';
import { createCamera } from './core/camera.js';
import { createInput } from './core/input.js';
import { createHud } from './ui/hud.js';
import { loading } from './scenes/loading.js';

const canvas = document.getElementById('stage'), ui = document.getElementById('ui');
const ctx = { view: createView(canvas), camera: createCamera(), input: createInput(canvas, ui), hud: createHud(ui, 10), data: null, session: null };
ctx.scenes = createScenes(ctx);
startLoop({ update: (dt) => ctx.scenes.update(dt), render: (alpha) => ctx.scenes.render(alpha) });
ctx.scenes.go(loading);
// 自動化測試用：網址帶 &test 時，讓測試程式看得到遊戲的狀態（正常使用不會出現）
if (new URLSearchParams(location.search).has('test')) window.__game = ctx;
