// 場景管理：一次只有一個場景在跑（載入 → 標題 → 遊戲）。場景是有 enter／exit／update／render 的物件，都可以不寫
export function createScenes(ctx) {
  let current = null;
  return {
    get current() { return current; },
    async go(scene, arg) {
      if (current && current.exit) current.exit(ctx);
      current = scene;
      if (scene.enter) await scene.enter(ctx, arg);
    },
    update(dt) { if (current && current.update) current.update(dt, ctx); },
    render(alpha) { if (current && current.render) current.render(ctx, alpha); },
  };
}
