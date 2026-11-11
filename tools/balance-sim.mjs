#!/usr/bin/env node
// 經濟模擬：兩個人照「正常節奏」玩 10 年，看收入、花費、各個目標大概第幾天達成。數值有問題就回去調 data/balance.json 和各資料檔。
// 用法：node tools/balance-sim.mjs            （結果印在畫面上，也可以 > docs/farm-game/平衡模擬.txt）
// 這是很粗的模型，假設寫在下面的 ASSUME；它的用途是抓出「太快／太慢／某一季沒事做」這種大問題，不是精算。
import { readFileSync } from 'node:fs';
const D = (p) => JSON.parse(readFileSync(new URL('../public/games/farm/data/' + p, import.meta.url), 'utf8'));
const bal = D('balance.json'), crops = D('crops.json'), items = D('items.json'), fish = D('fish.json'), animals = D('animals.json'), restore = D('restore.json'), ach = D('achievements.json');
const ASSUME = { players: 2, playDaysPerWeek: 7, energyOnFarming: 0.55, energyOnOther: 0.35, fishSuccess: 0.7, mineRocksPerEnergy: 0.5, avgRockValue: 14, sellAnimalDaily: true };
const SEASONS = bal.seasonIds, YEARS = 10, DAYS = bal.seasonDays * 4 * YEARS;
const cropInfo = Object.entries(crops).map(([id, c]) => { const days = c.stageDays.reduce((a, b) => a + b, 0), sell = items[id].sell, seed = items['seed_' + id].buy; const perDay = c.regrowDays ? (sell / c.regrowDays) : (sell - seed) / days; return { id, name: c.name, seasons: c.seasons, days, sell, seed, regrow: c.regrowDays, perDay }; });
const avgFish = (map, season) => { const pool = Object.entries(fish).filter(([, f]) => f.maps.includes(map) && f.seasons.includes(season)); const w = pool.reduce((s, [, f]) => s + f.weight, 0); return w ? pool.reduce((s, [id, f]) => s + f.weight * items['fish_' + id].sell, 0) / w : 0; };
const S = { money: bal.startMoney, tiles: 0, fieldCap: 160, toolLv: 1, houseLv: 1, animals: [], land2: false, restored: 0, harvests: 0, shipTotal: 0 }, milestones = [], yearly = [];
const mark = (day, text) => milestones.push([day, text]);
let energyMax = bal.energyMax, yearIncome = 0, yearSpend = 0, seasonIncome = { spring: 0, summer: 0, autumn: 0, winter: 0 };
const plots = []; // { crop, readyDay, regrow }
for (let day = 1; day <= DAYS; day++) {
  const season = SEASONS[Math.floor((day - 1) / bal.seasonDays) % 4], energy = energyMax * ASSUME.players;
  let income = 0, spend = 0;
  if ((day - 1) % bal.seasonDays === 0) plots.length = 0; // 換季：作物枯掉
  // 種田：體力的一部分拿來澆水（一格 1 點，工具越好越省），種這一季每天賺最多的作物
  const waterCost = Math.max(0.4, 1 - bal.tools.energyCut * (S.toolLv - 1)), canTend = Math.floor(energy * ASSUME.energyOnFarming / waterCost), cap = Math.min(canTend, S.fieldCap + (S.land2 ? 80 : 0));
  const best = cropInfo.filter((c) => c.seasons.includes(season)).sort((a, b) => b.perDay - a.perDay)[0];
  for (const p of plots) if (day >= p.readyDay) { income += p.crop.sell; S.harvests++; if (p.crop.regrow) p.readyDay = day + p.crop.regrow; else p.dead = true; }
  for (let i = plots.length - 1; i >= 0; i--) if (plots[i].dead) plots.splice(i, 1);
  const seasonEnd = Math.ceil(day / bal.seasonDays) * bal.seasonDays;
  while (best && plots.length < cap && S.money - spend >= best.seed && day + best.days <= seasonEnd) { plots.push({ crop: best, readyDay: day + best.days }); spend += best.seed; }
  // 其他時間：釣魚（湖邊）或採礦，取兩者的平均
  const other = energy * ASSUME.energyOnOther, fishIncome = (other / bal.fishing.energy) * ASSUME.fishSuccess * avgFish('lake', season), mineIncome = other * ASSUME.mineRocksPerEnergy * ASSUME.avgRockValue;
  income += (fishIncome + mineIncome) / 2;
  // 動物：每隻每 every 天一個產品
  for (const a of S.animals) if (day % animals.livestock[a].every === 0) income += items[animals.livestock[a].product].sell * 1.25;
  income *= 1 + (S.restored >= 4 ? 0.1 : 0);
  S.money += income - spend;
  // 花錢的順序：動物 → 工具 → 開墾 → 房子 → 修復設施（用錢估算材料）
  const buy = (cost, fn, text) => { if (S.money >= cost * 1.3) { S.money -= cost; spend += cost; fn(); mark(day, text); return true; } return false; };
  if (S.animals.length < 8) { const kind = S.animals.length < 4 ? (S.animals.length % 2 ? 'duck' : 'chicken') : (S.animals.length % 2 ? 'sheep' : 'cow'); buy(animals.livestock[kind].price, () => S.animals.push(kind), `買第 ${S.animals.length + 1} 隻動物（${animals.livestock[kind].name}）`); }
  if (S.toolLv < 4) { const c = bal.tools.cost[S.toolLv]; buy(c.money * 3 + c.n * 3 * items[c.bar].sell, () => { S.toolLv++; }, `常用的三種工具升到${bal.tools.levels[S.toolLv]}`); }
  if (!S.land2) buy(bal.land.field2.money + 400, () => { S.land2 = true; }, '開墾南邊的田');
  if (S.houseLv < 6) { const c = bal.house.levels[S.houseLv]; buy(c.money + (c.wood || 0) * 8 + (c.stone || 0) * 6, () => { S.houseLv++; energyMax += bal.house.perLevel.energyMax; }, `農舍擴建到第 ${S.houseLv + 1} 級`); }
  if (S.restored < 8) { const r = Object.values(restore)[S.restored], cost = Object.entries(r.need).reduce((s, [k, n]) => s + n * ((items[k] && items[k].sell) || 40), 0) * 1.5; buy(cost, () => { S.restored++; if (S.restored === 8) S.money += bal.restore.allDone.money; }, `修好「${r.name}」`); }
  S.shipTotal += income; yearIncome += income; yearSpend += spend; seasonIncome[season] += income;
  if (day % (bal.seasonDays * 4) === 0) { yearly.push({ year: day / (bal.seasonDays * 4), income: Math.round(yearIncome), spend: Math.round(yearSpend), money: Math.round(S.money), ...Object.fromEntries(Object.entries(seasonIncome).map(([k, v]) => [k, Math.round(v)])) }); yearIncome = yearSpend = 0; seasonIncome = { spring: 0, summer: 0, autumn: 0, winter: 0 }; }
}
const realHours = (d) => (d * bal.dayMinutesReal / 60).toFixed(0);
console.log('晴耕谷 經濟模擬（兩個人、10 年）\n假設：' + JSON.stringify(ASSUME) + '\n');
console.log('作物每天每格的淨收入（春季）：\n' + cropInfo.sort((a, b) => b.perDay - a.perDay).map((c) => `  ${c.name.padEnd(4, '　')} ${c.perDay.toFixed(1).padStart(6)} 元／天（${c.days} 天${c.regrow ? '、之後每 ' + c.regrow + ' 天一次' : ''}，種子 ${c.seed}、賣 ${c.sell}）`).join('\n'));
console.log('\n每年的收入與花費：\n' + yearly.map((y) => `  第 ${String(y.year).padStart(2)} 年：收入 ${String(y.income).padStart(8)}（春 ${y.spring}／夏 ${y.summer}／秋 ${y.autumn}／冬 ${y.winter}），花費 ${String(y.spend).padStart(8)}，年底存款 ${y.money}`).join('\n'));
console.log('\n目標達成的時間：\n' + milestones.map(([d, t]) => `  第 ${String(d).padStart(4)} 天（第 ${Math.ceil(d / (bal.seasonDays * 4))} 年，約玩了 ${realHours(d)} 小時）：${t}`).join('\n'));
const last = milestones.length ? milestones[milestones.length - 1][0] : 0;
console.log(`\n最後一個目標在第 ${last} 天（約 ${realHours(last)} 小時）。10 年是 ${DAYS} 天、約 ${realHours(DAYS)} 小時。`);
console.log(`成就 ${ach.length} 個裡，照這個節奏 10 年內達得到的收成類：收成 ${S.harvests} 次（最高一級要 10000 次）、出貨累積約 ${Math.round(S.shipTotal)} 元（最高一級要 1000000 元）。`);
