// 相機：跟著一個目標走，不會拍到地圖外面；zoom 是「地圖上的一個像素等於畫面上幾個 CSS 像素」
// 像素圖要清楚：一個 LPC 像素一定剛好畫成整數個螢幕像素，所以鏡頭遠近只有幾段可以選（steps，由遠到近）。
// 選哪一段記在這台裝置上（localStorage 的 farm-zoom，記的是「一格在畫面上幾個 CSS 像素」，換了視窗大小也照這個找最接近的）
import { setPixelGrid } from '../render/pixel.js';
const ART = 32; // LPC 一格 32 像素
const KEY = 'farm-zoom';
export function createCamera() {
  let want = 0; try { want = Number(localStorage.getItem(KEY)) || 0; } catch { /* 讀不到就用預設的遠近 */ }
  return {
    x: 0, y: 0, zoom: 1, steps: [1], step: 0,
    // 這個畫面可以選哪幾段：一格在畫面上 bal.zoom 的 min～max 個 CSS 像素之間（電腦、手機各一組）；沒選過就用最接近 prefer 的那一段
    fit(view, bal) {
      const touch = matchMedia('(pointer: coarse)').matches, Z = bal.zoom[view.w < 720 || touch ? 'phone' : 'desktop'];
      // 一個 LPC 像素畫成 n 個螢幕像素時，一格是幾個 CSS 像素。手機開省電模式（畫布只有 1 倍像素）時整數倍太粗，改成半個像素一段，
      // 這樣開不開省電看到的範圍都一樣（省電模式本來就比較不細）
      const unit = ART / view.dpr * (touch && view.dpr < 1.5 ? 0.5 : 1), size = (n) => n * unit;
      let list = []; for (let n = 1; n <= 48; n++) if (size(n) >= Z.min && size(n) <= Z.max) list.push(size(n));
      const tall = list.filter((s) => view.h / s >= bal.viewTilesMin); if (tall.length) list = tall; // 太扁的視窗（手機橫放）：至少看得到 viewTilesMin 格高
      if (!list.length) list = [size(Math.max(1, Math.round(Z.prefer / unit)))];
      const goal = want || Z.prefer, far = (s) => Math.abs(Math.log(s / goal)); let best = 0;
      list.forEach((s, i) => { if (far(s) < far(list[best]) - 1e-9) best = i; }); // 一樣接近的話用比較遠的那一段（看得到比較多）
      this.steps = list.map((s) => s / bal.tile); this.step = best; this.zoom = this.steps[best];
    },
    // 換一段遠近：dir 是 +1 拉近、-1 拉遠、0 換下一段（最近的再按一次回到最遠）。有換才回傳 true
    nudge(dir, bal) {
      const n = this.steps.length, i = dir ? Math.max(0, Math.min(n - 1, this.step + dir)) : (this.step + 1) % n;
      if (i === this.step) return false;
      this.step = i; this.zoom = this.steps[i]; want = this.zoom * bal.tile;
      try { localStorage.setItem(KEY, String(want)); } catch { /* 存不了：這次有效，下次回到預設 */ }
      return true;
    },
    follow(tx, ty, view, worldW, worldH, ease = 1) {
      const vw = view.w / this.zoom, vh = view.h / this.zoom;
      let cx = tx - vw / 2, cy = ty - vh / 2;
      cx = worldW <= vw ? (worldW - vw) / 2 : Math.max(0, Math.min(worldW - vw, cx));
      cy = worldH <= vh ? (worldH - vh) / 2 : Math.max(0, Math.min(worldH - vh, cy));
      this.x += (cx - this.x) * ease; this.y += (cy - this.y) * ease;
    },
    // 鏡頭的位置對到螢幕像素上：地面、樹、房子的每個像素都落在整數的位置，捲動時不會閃
    apply(view) { const k = this.zoom * view.dpr; setPixelGrid(k, view.dpr); view.ctx.setTransform(k, 0, 0, k, -Math.round(this.x * k), -Math.round(this.y * k)); },
    toWorld(sx, sy) { return { x: this.x + sx / this.zoom, y: this.y + sy / this.zoom }; },
  };
}
