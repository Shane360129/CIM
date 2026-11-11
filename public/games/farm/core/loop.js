// 遊戲迴圈：規則用固定步長更新（每秒 60 次），畫面跟著螢幕的更新率畫；兩者分開，慢的手機只會少畫幾張，不會走得比較慢
export function startLoop({ update, render, step = 1 / 60, maxSteps = 5, half = () => false }) {
  let last = performance.now(), acc = 0, running = true, odd = false;
  function frame(now) {
    if (!running) return;
    acc += Math.min(0.25, (now - last) / 1000); last = now; // 切到別的分頁再回來：最多補 0.25 秒
    let n = 0;
    while (acc >= step && n++ < maxSteps) { update(step); acc -= step; }
    if (n > maxSteps) acc = 0;
    odd = !odd; if (!(half() && odd)) render(acc / step); // 省電模式：每兩張只畫一張（規則照常更新）
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return () => { running = false; };
}
