// 聲音：音效用 WebAudio 當場合成（不用下載檔案）；背景音樂之後放檔案進 assets/music/，在 data/music.json 登記就會依地點和季節切換
// 瀏覽器規定要使用者先點過畫面才能出聲，所以第一次按鍵或點擊時才真的啟動
const SFX = {
  // 每個音效是幾個音：[頻率, 開始秒, 長度秒, 波形, 音量, 結束頻率（滑音，可省略）]；波形 noise 是沙沙聲
  tap: [[660, 0, 0.05, 'triangle', 0.5]],
  no: [[200, 0, 0.09, 'square', 0.35], [150, 0.09, 0.12, 'square', 0.35]],
  till: [[0, 0, 0.09, 'noise', 0.5], [140, 0, 0.1, 'triangle', 0.6, 70]],
  water: [[0, 0, 0.22, 'noise', 0.3], [900, 0, 0.2, 'sine', 0.2, 500]],
  plant: [[420, 0, 0.06, 'sine', 0.5, 300], [0, 0.03, 0.05, 'noise', 0.2]],
  harvest: [[520, 0, 0.07, 'triangle', 0.5], [780, 0.07, 0.1, 'triangle', 0.5]],
  chop: [[0, 0, 0.06, 'noise', 0.6], [180, 0, 0.08, 'square', 0.3, 90]],
  coin: [[990, 0, 0.06, 'square', 0.3], [1320, 0.06, 0.14, 'square', 0.3]],
  pick: [[600, 0, 0.05, 'sine', 0.5], [800, 0.05, 0.07, 'sine', 0.5]],
  gift: [[660, 0, 0.08, 'triangle', 0.5], [880, 0.08, 0.08, 'triangle', 0.5], [1100, 0.16, 0.14, 'triangle', 0.5]],
  bite: [[880, 0, 0.05, 'square', 0.4], [880, 0.1, 0.05, 'square', 0.4]],
  hit: [[0, 0, 0.07, 'noise', 0.6], [220, 0, 0.07, 'sawtooth', 0.3, 110]],
  hurt: [[300, 0, 0.16, 'sawtooth', 0.4, 120]],
  talk: [[500, 0, 0.04, 'triangle', 0.4], [620, 0.05, 0.04, 'triangle', 0.4]],
  done: [[523, 0, 0.1, 'triangle', 0.5], [659, 0.1, 0.1, 'triangle', 0.5], [784, 0.2, 0.1, 'triangle', 0.5], [1047, 0.3, 0.22, 'triangle', 0.5]],
  day: [[392, 0, 0.16, 'sine', 0.5], [523, 0.16, 0.16, 'sine', 0.5], [659, 0.32, 0.16, 'sine', 0.5], [784, 0.48, 0.3, 'sine', 0.5]],
};
// 伺服器答應了哪種請求 → 播哪個音效（use 另外看做了什麼）
const REPLY = { buy: 'coin', ship: 'coin', upgrade: 'done', build: 'done', donate: 'gift', gift: 'gift', give: 'gift', note: 'tap', craft: 'pick', cook: 'pick', eat: 'pick', chest: 'tap', swap: 'tap', talk: 'talk', pet: 'talk', feed: 'pick', 'animal-buy': 'coin', 'quest-done': 'done', 'mine-hit': 'chop', 'mon-hit': 'hit', reel: 'harvest', sleep: 'tap' };
const USE = { till: 'till', water: 'water', plant: 'plant', harvest: 'harvest', clear: 'chop', forage: 'pick', collect: 'pick' };

export function createAudio(settings) {
  let ac = null, noise = null, played = 0, track = null, trackKey = '', tracks = null;
  const AC = window.AudioContext || window.webkitAudioContext;
  const start = () => { if (!AC) return; if (!ac) { try { ac = new AC(); } catch { return; } } if (ac.state === 'suspended') ac.resume().catch(() => {}); if (track && track.paused) track.play().catch(() => {}); };
  window.addEventListener('pointerdown', start, true); window.addEventListener('keydown', start, true);
  function noiseBuf() { if (!noise) { noise = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noise; }
  const audio = {
    get count() { return played; }, // 測試用：播過幾次
    play(name) {
      const notes = SFX[name], vol = settings.get('sfx') / 100; if (!notes) return; played++;
      if (!ac || ac.state !== 'running' || vol <= 0) return;
      const t0 = ac.currentTime;
      for (const [f, at, len, wave, v, f2] of notes) {
        const g = ac.createGain(); g.gain.setValueAtTime(v * vol * 0.5, t0 + at); g.gain.exponentialRampToValueAtTime(0.001, t0 + at + len); g.connect(ac.destination);
        let src;
        if (wave === 'noise') { src = ac.createBufferSource(); src.buffer = noiseBuf(); }
        else { src = ac.createOscillator(); src.type = wave; src.frequency.setValueAtTime(f, t0 + at); if (f2) src.frequency.exponentialRampToValueAtTime(f2, t0 + at + len); }
        src.connect(g); src.start(t0 + at); src.stop(t0 + at + len + 0.02);
      }
    },
    // 背景音樂：tracks 是 data/music.json 的內容（{ "地圖:季節" | "地圖" | "季節" | "default": "檔名" }），沒有登記任何檔案時什麼都不做
    setTracks(t) { tracks = t || {}; },
    music(map, season) {
      const file = tracks && (tracks[`${map}:${season}`] || tracks[map] || tracks[season] || tracks.default) || '';
      if (file === trackKey) return; trackKey = file;
      if (track) { track.pause(); track = null; }
      if (!file) return;
      track = new Audio(`assets/music/${file}`); track.loop = true; track.volume = settings.get('music') / 100; track.play().catch(() => {});
    },
    get musicKey() { return trackKey; },
  };
  settings.on((k, v) => { if (k === 'music' && track) track.volume = v / 100; if (k === 'sfx') audio.play('tap'); });
  return audio;
}
// 把音效接到連線上：自己的請求被答應或拒絕、收到東西、換日
export function wireAudio(audio, room, myId) {
  room.on('reply', ({ req, res }) => {
    if (res.t === 'no') { if (res.reason !== 'offline' && res.reason !== 'timeout') audio.play('no'); return; }
    const name = req.t === 'use' ? (res.waiting ? 'chop' : '') : REPLY[req.t]; if (name) audio.play(name);
  });
  // 用工具做了什麼，伺服器是用「哪一格變了」告訴大家的：自己做的才出聲
  room.on('tiles', (m) => { if (m.by === myId() && USE[m.kind]) audio.play(USE[m.kind]); });
  room.on('objs', (m) => { if (m.by === myId()) audio.play(m.drops ? 'pick' : 'chop'); });
  room.on('given', () => audio.play('gift')); room.on('newday', () => audio.play('day')); room.on('restored', () => audio.play('done'));
  room.on('faint', () => audio.play('hurt')); room.on('notes', () => audio.play('tap'));
}
