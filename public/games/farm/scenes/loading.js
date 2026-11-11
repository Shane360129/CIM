// 載入畫面：讀設定和地圖、確認登入身分，畫一條進度條；出錯就停在這裡把原因寫出來
import { loadAll } from '../core/assets.js';
import { signIn } from '../net/auth.js';
import { loadAtlas } from '../render/sprites.js';
import { makeItems } from '../shared/rules.js';
import { title } from './title.js';

export const loading = {
  progress: 0, error: '',
  async enter(ctx) {
    this.progress = 0; this.error = '';
    try {
      const convId = Number(new URLSearchParams(location.search).get('conv')) || 0;
      const [data, session] = await Promise.all([
        loadAll([['balance', 'data/balance.json'], ['objects', 'data/objects.json'], ['parts', 'data/doll/parts.json'], ['items', 'data/items.json'], ['crops', 'data/crops.json'],
          ['map_farm', 'data/maps/farm.json'], ['map_house', 'data/maps/house.json'], ['map_road', 'data/maps/road.json'], ['map_lake', 'data/maps/lake.json'], ['fish', 'data/fish.json'], ['machines', 'data/machines.json'], ['recipes', 'data/recipes.json'], ['animals', 'data/animals.json'], ['map_town', 'data/maps/town.json'], ['npcs', 'data/npcs/residents.json'], ['shops', 'data/shops.json']], (p) => { this.progress = p * 0.8; }),
        signIn(convId),
      ]);
      data.items = makeItems(data.items, data.machines); // 加工品的名字和價錢是算出來的
      data.maps = { farm: data.map_farm, house: data.map_house, road: data.map_road, lake: data.map_lake, town: data.map_town };
      await loadAtlas('b4');
      await loadAtlas('b3');
      await loadAtlas('b2'); // 第 2 批素材（目前是縮圖做的，畫質是暫時的）；載不到就全部用暫代圖
      Object.assign(ctx, { data, session });
      this.progress = 1;
      await ctx.scenes.go(title);
    } catch (e) { this.error = e.message || '載入失敗'; }
  },
  render({ view }) {
    const g = view.ctx, k = view.dpr; g.setTransform(k, 0, 0, k, 0, 0);
    g.fillStyle = '#a8d98a'; g.fillRect(0, 0, view.w, view.h);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#4a3423';
    g.font = '700 22px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    if (this.error) {
      g.fillText('打不開農場', view.w / 2, view.h / 2 - 18);
      g.font = '16px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif'; g.fillText(this.error, view.w / 2, view.h / 2 + 14);
      return;
    }
    g.fillText('農場準備中…', view.w / 2, view.h / 2 - 26);
    const w = Math.min(260, view.w * 0.6), x = (view.w - w) / 2, y = view.h / 2 + 2;
    g.fillStyle = '#f3e6c8'; g.strokeStyle = '#5a3d22'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, y, w, 16, 8); g.fill(); g.stroke();
    g.fillStyle = '#e8872e'; g.beginPath(); g.roundRect(x + 2, y + 2, Math.max(0, (w - 4) * this.progress), 12, 6); g.fill();
  },
};
