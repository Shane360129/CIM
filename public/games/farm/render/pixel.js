// 像素對齊：畫像素圖（角色、動物）的時候把位置對到螢幕像素上，走動時邊緣不會糊、不會一下胖一下瘦。
// K 是「地圖上的一個像素等於幾個螢幕像素」，每一格畫面開始畫之前由相機（或自己設座標的場景）告訴這裡；
// ZOOM 是「地圖上的一個像素等於幾個 CSS 像素」，鏡頭拉遠的時候用來把字撐住，不會小到看不清楚
let K = 0, ZOOM = 0;
export const setPixelGrid = (k, dpr = 1) => { K = k > 0 ? k : 0; ZOOM = K / dpr; };
export const snap = (v) => (K ? Math.round(v * K) / K : v);
// 畫在地圖上的字：size 是地圖上的大小，換算到畫面上至少要 min 個 CSS 像素
export const textSize = (size, min = 11) => (ZOOM ? Math.max(size, min / ZOOM) : size);
