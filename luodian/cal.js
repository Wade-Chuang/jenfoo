// 我的志願 → 甄試行事曆（畫面時間軸 ＋ 下載 .ics 丟進手機日曆）
// 為什麼要這支：簡章把繳件截止、甄試日期、放榜分散在各系頁面，學生最常出事的
// 就是「忘記上傳截止日」。撞期檢查已經有了，但只有檢查沒有提醒。
// 資料來源就是各系簡章欄位（s2.due 繳件、s2.ed 甄試、s2.res 放榜），不自己推算。
(function(){
const L=window.__LD,D=window.LD_DATA||[];
if(!L||!D.length)return;
const BY={};D.forEach(d=>BY[d.c]=d);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pad=n=>String(n).padStart(2,"0");
// 民國年 116.5.4 → 2027-05-04
function roc(x){const m=String(x||"").match(/(\d{3})\D+(\d{1,2})\D+(\d{1,2})/);
  return m?{y:+m[1]+1911,m:+m[2],d:+m[3]}:null}
// 甄試欄位只有 5/14 這種月/日，年份跟著繳件或放榜那一年（都在同一個入學年）
function md(x,yr){const m=String(x||"").match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  return m?{y:yr,m:+m[1],d:+m[2]}:null}
const key=o=>`${o.y}${pad(o.m)}${pad(o.d)}`;
const show=o=>`${o.m}/${o.d}`;
const dnum=o=>Date.UTC(o.y,o.m-1,o.d);

function events(){
  const out=[];
  L.st.wish.filter(c=>BY[c]).forEach(c=>{
    const d=BY[c],s=d.s2||{},nm=d.s+" "+d.n;
    const due=roc(s.due),res=roc(s.res);
    const yr=(due||res||{}).y||new Date().getFullYear()+1;
    if(due)out.push({at:due,t:"繳件截止",nm,kind:"due",note:"學習歷程／備審資料上傳截止"});
    (s.ed||[]).forEach(x=>{const o=md(x,yr);if(o)out.push({at:o,t:"甄試",nm,kind:"ed",note:(s.em?"（兩天擇一或分組，依簡章）":"")+"　甄試費 "+(s.fee&&s.fee!=="--"?s.fee+" 元":"依簡章")})});
    if(res)out.push({at:res,t:"放榜",nm,kind:"res",note:"正備取名單公告"});
  });
  return out.sort((a,b)=>dnum(a.at)-dnum(b.at)||a.kind.localeCompare(b.kind))}

function ics(ev){
  const now=new Date(),st=now.getUTCFullYear()+pad(now.getUTCMonth()+1)+pad(now.getUTCDate())+"T"+pad(now.getUTCHours())+pad(now.getUTCMinutes())+"00Z";
  const L1=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//莊老數學教室 正賦文理//落點分析//ZH-TW","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:申請入學甄試行事曆"];
  ev.forEach((e,i)=>{const s=key(e.at),n=new Date(dnum(e.at)+864e5),en=`${n.getUTCFullYear()}${pad(n.getUTCMonth()+1)}${pad(n.getUTCDate())}`;
    L1.push("BEGIN:VEVENT","UID:ld"+s+"-"+i+"@jenfoo","DTSTAMP:"+st,"DTSTART;VALUE=DATE:"+s,"DTEND;VALUE=DATE:"+en,
      "SUMMARY:"+e.t+"｜"+e.nm,"DESCRIPTION:"+String(e.note||"").replace(/[,;]/g,"")+" (由莊老數學教室 學測落點分析產生，請以簡章為準)",
      "BEGIN:VALARM","TRIGGER:-P3D","ACTION:DISPLAY","DESCRIPTION:"+e.t+" "+e.nm,"END:VALARM","END:VEVENT")});
  L1.push("END:VCALENDAR");
  return L1.join("\r\n")}

const KN={due:["繳件截止","#c0392b"],ed:["甄試","#0f2747"],res:["放榜","#2d7ab0"]};
function render(){
  const host=document.getElementById("cal");if(!host)return;
  const ev=events();
  if(!ev.length){host.innerHTML="";return}
  const t0=Date.UTC(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
  // 同一天同一類的併成一行，志願一多才不會變成二十行
  const g=[];ev.forEach(e=>{const last=g[g.length-1];
    if(last&&last.kind===e.kind&&key(last.at)===key(e.at))last.nms.push(e.nm);else g.push({at:e.at,kind:e.kind,nms:[e.nm]})});
  const rows=g.map(e=>{const dd=Math.round((dnum(e.at)-t0)/864e5);
    return `<div class="calrow"><span class="caldate">${show(e.at)}</span><span class="caltag" style="background:${KN[e.kind][1]}">${KN[e.kind][0]}</span><span class="calnm">${e.nms.map(esc).join("、")}</span><span class="note" style="margin:0">${dd>=0?"還有 "+dd+" 天":"已過"}</span></div>`}).join("");
  host.innerHTML=`<div style="margin-top:12px;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px">
    <b style="color:var(--navy)">📅 這 ${L.st.wish.length} 個志願的重要日期</b>
    <div class="note" style="margin:4px 0 8px">繳件截止日最容易漏掉。按下面的按鈕可以一次丟進手機日曆（Google 日曆、iPhone 行事曆都支援），每一項會在 3 天前提醒你。</div>
    <div class="caltl">${rows}</div>
    <button class="btn navy" id="icsDl" style="margin-top:10px">下載行事曆（.ics）加到手機日曆</button>
    <div class="note" style="margin-top:6px">日期依 116 學年度簡章；簡章若更新請以甄選會公告為準。</div></div>`;
  document.getElementById("icsDl").onclick=()=>{
    const b=new Blob(["\ufeff"+ics(ev)],{type:"text/calendar;charset=utf-8"}),u=URL.createObjectURL(b);
    const a=document.createElement("a");a.href=u;a.download="申請入學甄試行事曆.ics";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),3000);L.toast&&L.toast("已下載，打開檔案就會問你要加到哪個日曆")}}

// 自己掛容器＋跟著志願重畫（renderWish 每次都會換掉 #wishList 的內容）
const chk=document.getElementById("wishCheck");
if(chk&&!document.getElementById("cal")){const c=document.createElement("div");c.id="cal";c.className="no-print";chk.after(c)}
const css=document.createElement("style");
css.textContent=".caltl{display:flex;flex-direction:column;gap:4px}"
 +".calrow{display:flex;align-items:center;gap:8px;font-size:13.5px;padding:5px 8px;background:#f7f9fc;border-radius:8px;flex-wrap:wrap}"
 +".caldate{font-weight:700;color:var(--navy);min-width:46px;font-variant-numeric:tabular-nums}"
 +".caltag{color:#fff;font-size:12px;font-weight:700;border-radius:5px;padding:1px 7px}"
 +".calnm{flex:1;min-width:140px}";
document.head.appendChild(css);
const wl=document.getElementById("wishList");
if(wl)new MutationObserver(render).observe(wl,{childList:true,subtree:true});
render();
})();
