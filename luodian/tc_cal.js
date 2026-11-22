// 統測甄選：我的志願的重要日期時間軸
// 和學測版（cal.js）不同的地方：116 簡章 12 月初才公布，現在手上的 ed／due／res
// 都是 115 學年度的日期（已經過去了），所以這裡**只給時間軸看相對順序**，
// 不提供加到手機日曆——放一個去年的日期進日曆還跳提醒，比沒有更糟。
// 116 簡章進來之後把 TC_CAL_READY 打開就會一起長出下載按鈕。
(function(){
const T=window.__TC;if(!T)return;
const READY=false;      // 116 簡章日期進來後改 true
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const roc=x=>{const m=String(x||"").match(/(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/);
  return m?{y:+m[1],m:+m[2],d:+m[3]}:null};
const KN={due:["繳件截止","#c0392b"],ed:["甄試","#13463f"],res:["放榜","#2a8f72"]};
function render(){
  const host=document.getElementById("tccal");if(!host)return;
  if(T.st.mode!=="a"){host.innerHTML="";return}
  const W=(T.st.wishA||[]).filter(i=>T.AU[i]);
  const ev=[];
  W.forEach(i=>{const d=T.AU[i],r=d.r2||{},nm=d.s+" "+d.n;
    [["due",r.due,"備審資料上傳截止"],["ed",r.ed,"指定項目甄試"],["res",r.res,"正備取放榜"]].forEach(([k,v])=>{
      const o=roc(v);if(o)ev.push({kind:k,at:o,nm})})});
  if(!ev.length){host.innerHTML="";return}
  ev.sort((a,b)=>(a.at.y-b.at.y)||(a.at.m-b.at.m)||(a.at.d-b.at.d)||a.kind.localeCompare(b.kind));
  const g=[];ev.forEach(e=>{const l=g[g.length-1];
    if(l&&l.kind===e.kind&&l.at.m===e.at.m&&l.at.d===e.at.d)l.nms.push(e.nm);else g.push({kind:e.kind,at:e.at,nms:[e.nm]})});
  host.innerHTML=`<div style="margin-top:12px;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px">
    <b style="color:var(--navy)">📅 這 ${W.length} 個志願的時程順序</b>
    <div class="note" style="margin:4px 0 8px">最容易出事的是<b>備審資料上傳截止</b>，比甄試日早一週左右。下面是 <b>115 學年度</b>簡章的日期，116 簡章預計 12 月初公布${READY?"":"，公布後這裡會換成 116 的日期並開放加到手機日曆"}。先看「哪一個先、間隔幾天」就好，不要照這個日期排行程。</div>
    <div class="caltl">${g.map(e=>`<div class="calrow"><span class="caldate">${e.at.m}/${e.at.d}</span><span class="caltag" style="background:${KN[e.kind][1]}">${KN[e.kind][0]}</span><span class="calnm">${e.nms.map(esc).join("、")}</span></div>`).join("")}</div>
    <div class="note" style="margin-top:6px">日期依 115 學年度四技二專甄選入學簡章，僅供看順序；一律以技專校院招生委員會聯合會公告為準。</div></div>`}
const wl=document.getElementById("wishList");
if(wl&&!document.getElementById("tccal")){const c=document.createElement("div");c.id="tccal";c.className="no-print";wl.after(c);
  new MutationObserver(render).observe(wl,{childList:true,subtree:true})}
const css=document.createElement("style");
css.textContent=".caltl{display:flex;flex-direction:column;gap:4px}"
 +".calrow{display:flex;align-items:center;gap:8px;font-size:13.5px;padding:5px 8px;background:#f7f9fc;border-radius:8px;flex-wrap:wrap}"
 +".caldate{font-weight:700;color:var(--navy);min-width:46px;font-variant-numeric:tabular-nums}"
 +".caltag{color:#fff;font-size:12px;font-weight:700;border-radius:5px;padding:1px 7px}"
 +".calnm{flex:1;min-width:140px}";
document.head.appendChild(css);
render();
})();
