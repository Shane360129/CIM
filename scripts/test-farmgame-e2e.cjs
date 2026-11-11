// 晴耕谷階段 1 的瀏覽器驗收（電腦＋手機模擬）：入口選單、面板、走路、紅點、關閉、權限。
// 需要 Playwright（專案沒有把它列為相依套件，要自己裝）。用法：
//   rm -rf .wrangler/state && npm run dev        # 一定要乾淨的資料庫
//   node scripts/test-farmgame-e2e.cjs 截圖要放的資料夾
const { chromium, devices } = require('playwright');
(async()=>{
const B='http://localhost:8787', S=process.argv[2];
const j=async(p,b,t,m)=>{const r=await fetch(B+p,{method:m||(b?'POST':'GET'),headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined});return r.json()};
for(let i=0;i<40;i++){try{await j('/api/app-info');break}catch{await new Promise(r=>setTimeout(r,1000))}}
const a=await j('/api/register',{username:'e2e_a',password:'pass123456',displayName:'小晴'});
await j('/api/admin/settings',{inviteCode:'inv-1'},a.token,'PATCH');
const b=await j('/api/register',{username:'e2e_b',password:'pass123456',displayName:'阿耕',inviteCode:'inv-1'});
const dm=(await j('/api/conversations',{type:'dm',userId:b.user.id},a.token)).conversation;
const memo=(await j('/api/conversations',{type:'dm',userId:a.user.id},a.token)).conversation;
const grp=(await j('/api/conversations',{type:'group',name:'一家人',memberIds:[b.user.id]},a.token)).conversation;
for(const c of [dm,grp]) await j(`/api/conversations/${c.id}/messages`,{type:'text',content:'嗨'},a.token);
console.log('dm',dm.id,'memo',memo.id,'group',grp&&grp.id);
const hdr=await fetch(B+'/games/farm/'); console.log('XFO game:',hdr.headers.get('x-frame-options'),hdr.status,'| index:',(await fetch(B+'/')).headers.get('x-frame-options'));
const br=await chromium.launch();
const ok=(l,c)=>console.log((c?'PASS ':'FAIL ')+l);
// ---- 電腦 ----
const p=await br.newPage({viewport:{width:1280,height:800}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(B+'/'); await p.evaluate(t=>localStorage.setItem('cim_token',t),a.token); await p.goto(B+'/?test'); await p.waitForTimeout(1500);
const items=async(title)=>{ await p.locator('#chat-list .row').filter({hasText:title}).first().click(); await p.waitForTimeout(500); await p.click('#btn-chat-info'); await p.waitForTimeout(300); const t=await p.locator('.feature-label').allTextContents(); return t; };
let t=await items('阿耕'); ok('一對一選單有「我們的農場」、沒有家族牧場: '+t.join(','), t.includes('我們的農場')&&!t.includes('家族牧場'));
await p.locator('.feature-item',{hasText:'我們的農場'}).click(); await p.waitForTimeout(2500);
ok('面板出現、iframe 載入', await p.locator('.farm-panel iframe').count()===1);
const f=p.frame({url:/games\/farm/});
await p.screenshot({path:S+'/s1-title.png'});
const scene=()=>f.evaluate(()=>window.__game?.scenes.current?.player?'play':(window.__game?.session?'title':'loading'));
ok('停在標題畫面', await scene()==='title');
await f.locator('#stage').click({position:{x:300,y:300}}); await p.waitForTimeout(600);
ok('第一次進去先到建立角色畫面', await f.locator('.maker').count()===1);
await f.locator('.maker [data-act=done]').click(); await p.waitForTimeout(600);
ok('按完成進入遊戲', await scene()==='play');
const pos=()=>f.evaluate(()=>{const q=window.__game.scenes.current.player;return {x:q.x,y:q.y,dir:q.dir}});
const p0=await pos();
await p.keyboard.down('KeyD'); await p.waitForTimeout(700); await p.keyboard.up('KeyD');
const p1=await pos(); ok(`D 往右走 ${p0.x.toFixed(2)}→${p1.x.toFixed(2)}`, p1.x>p0.x+1.5&&p1.dir==='right');
await p.keyboard.down('ArrowDown'); await p.waitForTimeout(700); await p.keyboard.up('ArrowDown');
const p2=await pos(); ok(`方向鍵往下走 ${p1.y.toFixed(2)}→${p2.y.toFixed(2)}`, p2.y>p1.y+1.5);
await p.keyboard.down('ArrowUp'); await p.waitForTimeout(3000); await p.keyboard.up('ArrowUp');
const p3=await pos(); ok(`往上走會被房子／樹擋住 y=${p3.y.toFixed(2)}`, p3.y>2);
await p.keyboard.press('Digit3'); ok('數字鍵切快捷列', await f.evaluate(()=>window.__game.hud.selected)===2);
await p.keyboard.press('KeyE'); await p.waitForTimeout(300); ok('E 打開背包，裡面有工具和種子', await f.locator('.panel .cell .iicon').count()>=7); await p.keyboard.press('KeyE'); await p.waitForTimeout(200); ok('再按一次關掉', await f.locator('.panel').count()===0);
ok('相機跟著角色', await f.evaluate(()=>{const g=window.__game;const q=g.scenes.current.player;const c=g.camera;const sx=(q.x*64-c.x)*c.zoom;return sx>100&&sx<g.view.w-100}));
await p.waitForTimeout(400); await p.screenshot({path:S+'/s1-play.png'});
// 對方傳訊息 → 紅點
await j(`/api/conversations/${dm.id}/messages`,{type:'text',content:'你在農場嗎'},b.token); await p.waitForTimeout(900);
ok('聊天室有新訊息時面板紅點亮起', await p.locator('.farm-dot:not(.hidden)').count()===1);
await p.locator('.farm-btn[aria-label="全螢幕"]').click(); ok('可切全螢幕', await p.locator('.farm-panel.full').count()===1);
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
ok('在遊戲裡按 Esc 關閉面板', await p.locator('.farm-panel').count()===0);
ok('關閉後看得到剛才的訊息', await p.locator('#chat-view').getByText('你在農場嗎').count()>=1);
await p.fill('#input','我回來了'); await p.click('#btn-send'); await p.waitForTimeout(700);
ok('關閉後聊天照常可以傳訊息', await p.locator('#chat-view').getByText('我回來了').count()>=1);
await p.keyboard.press('Escape');
t=await items('一家人'); ok('群組選單維持家族牧場: '+t.join(','), t.includes('家族牧場')&&!t.includes('我們的農場')); await p.keyboard.press('Escape');
// 權限：第三個對話 id、群組都進不去
const bad=await br.newPage(); await bad.goto(B+'/'); await bad.evaluate(t=>localStorage.setItem('cim_token',t),a.token);
await bad.goto(B+`/games/farm/?conv=${grp.id}&test`); await bad.waitForTimeout(1500);
ok('群組的 id 進不了農場: '+await bad.evaluate(()=>window.__game.scenes.current.error), !!(await bad.evaluate(()=>window.__game.scenes.current.error)));
await bad.close();
ok('電腦版沒有錯誤訊息 '+errs.join(' | '), errs.length===0);
// ---- 手機 ----
const cx=await br.newContext({...devices['Pixel 7']}); const m=await cx.newPage(); const merr=[]; m.on('pageerror',e=>merr.push(e.message));
await m.goto(B+'/'); await m.evaluate(t=>localStorage.setItem('cim_token',t),b.token); await m.goto(B+'/?test'); await m.waitForTimeout(1500);
await m.locator('#chat-list .row').filter({hasText:'小晴'}).first().tap(); await m.waitForTimeout(600);
await m.tap('#btn-chat-info'); await m.waitForTimeout(300); await m.locator('.feature-item',{hasText:'我們的農場'}).tap(); await m.waitForTimeout(2500);
const mf=m.frame({url:/games\/farm/});
const box=await m.locator('.farm-panel').boundingBox(); const vp=m.viewportSize();
ok(`手機面板全螢幕 ${box.width}x${box.height}`, box.width===vp.width&&Math.abs(box.height-vp.height)<2);
await mf.locator('#stage').tap({position:{x:150,y:200}}); await m.waitForTimeout(900);
ok('手機：建立角色的面板在下面、看得到預覽', await mf.locator('.maker').count()===1 && (await mf.locator('.maker').boundingBox()).y > 200);
await m.screenshot({path:S+'/s3-create-phone.png'});
await mf.locator('.maker [data-act=done]').scrollIntoViewIfNeeded(); await mf.locator('.maker [data-act=done]').tap(); await m.waitForTimeout(600);
ok('手機有搖桿和動作鈕', await mf.locator('.stick').count()===1&&await mf.locator('.act-btn').count()===1);
const mp=()=>mf.evaluate(()=>{const q=window.__game.scenes.current.player;return {x:q.x,y:q.y}});
const m0=await mp(); const sb=await mf.locator('.stick').boundingBox();
const cdp=await cx.newCDPSession(m); const fb=await m.locator('.farm-frame').boundingBox();
const X=fb.x+sb.x+sb.width/2, Y=fb.y+sb.y+sb.height/2;
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:X,y:Y}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:X+40,y:Y}]}); await m.waitForTimeout(700);
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
const m1=await mp(); ok(`搖桿往右推角色會走 ${m0.x.toFixed(2)}→${m1.x.toFixed(2)}`, m1.x>m0.x+1);
await m.screenshot({path:S+'/s1-phone.png'});
await m.goBack(); await m.waitForTimeout(600);
ok('手機按返回鍵：關掉遊戲、留在聊天', await m.locator('.farm-panel').count()===0 && await m.locator('#chat-view:not(.hidden)').count()===1);
ok('手機沒有錯誤訊息 '+merr.join(' | '), merr.length===0);
await br.close();
})().catch(e=>{console.log('SCRIPT ERROR',e.message);process.exit(1)});
