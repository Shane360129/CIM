// 畫布：跟著視窗大小和螢幕的像素密度（devicePixelRatio）調整，畫出來才不會糊
export function createView(canvas) {
  const view = { canvas, ctx: canvas.getContext('2d'), w: 0, h: 0, dpr: 1, onResize: null };
  function resize() {
    view.dpr = Math.min(3, window.devicePixelRatio || 1);
    view.w = Math.max(1, window.innerWidth); view.h = Math.max(1, window.innerHeight); // CSS 像素
    canvas.width = Math.round(view.w * view.dpr); canvas.height = Math.round(view.h * view.dpr);
    if (view.onResize) view.onResize(view);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  resize();
  return view;
}
