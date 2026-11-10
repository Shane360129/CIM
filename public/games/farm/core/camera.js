// 相機：跟著一個目標走，不會拍到地圖外面；zoom 是「地圖上的一個像素等於畫面上幾個 CSS 像素」
export function createCamera() {
  return {
    x: 0, y: 0, zoom: 1,
    // 手機大約看得到 9 格寬，電腦 16 格；太扁的視窗至少看得到 viewTilesMin 格高
    fit(view, bal) {
      const phone = view.w < 720 || matchMedia('(pointer: coarse)').matches;
      const wide = phone ? bal.viewTilesWide.phone : bal.viewTilesWide.desktop;
      this.zoom = Math.min(view.w / (wide * bal.tile), view.h / (bal.viewTilesMin * bal.tile));
    },
    follow(tx, ty, view, worldW, worldH, ease = 1) {
      const vw = view.w / this.zoom, vh = view.h / this.zoom;
      let cx = tx - vw / 2, cy = ty - vh / 2;
      cx = worldW <= vw ? (worldW - vw) / 2 : Math.max(0, Math.min(worldW - vw, cx));
      cy = worldH <= vh ? (worldH - vh) / 2 : Math.max(0, Math.min(worldH - vh, cy));
      this.x += (cx - this.x) * ease; this.y += (cy - this.y) * ease;
    },
    apply(view) { const k = this.zoom * view.dpr; view.ctx.setTransform(k, 0, 0, k, -this.x * k, -this.y * k); },
    toWorld(sx, sy) { return { x: this.x + sx / this.zoom, y: this.y + sy / this.zoom }; },
  };
}
