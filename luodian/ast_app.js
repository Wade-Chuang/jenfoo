// 分科分發落點（與申請入學共用學測 15 級分、學校分級、地區）
(function(){
const L=window.__LD, D=window.AST_DATA||[], Q=window.AST_RESQ||[], TOP60=window.AST_TOP||{}, TOP15=window.LD_TOP||{}, META=window.AST_META||{};
if(!L||!D.length)return;
const S60=["國文","英文","數學A","數學B","社會","自然","數學甲","數學乙","物理","化學","生物","歷史","地理","公民與社會"];
const AB=["國","英","數A","數B","社","自","數甲","數乙","物","化","生","歷","地","公"];
const SUBJ15=["國文","英文","數學A","數學B","社會","自然"], LV=["頂標","前標","均標","後標","底標"];
const CAT={safe:["穩上",0,"var(--safe)"],good:["可上",1,"var(--good)"],reach:["可衝",2,"var(--reach)"],no:["不建議",3,"var(--no)"],fail:["未過檢定",4,"var(--no)"],miss:["缺考科目",5,"var(--gray)"],chg:["採計改變",6,"var(--gray)"],nodata:["無歷年資料",7,"var(--gray)"],art:["術科校系",8,"var(--gray)"]};
const PMAX=.85;   // 回測：最高區間偏樂觀，機率最高顯示 85%
const TIERS=L.TIERS, RG=L.RG, RN=L.RN, GN=L.GN||[];
const RANK={},TIER={};let rk=0;TIERS.forEach(([t,a],ti)=>a.forEach(c=>{RANK[c]=rk++;TIER[c]=ti}));
const rankOf=d=>RANK[d.sid]??999, tierOf=d=>TIER[d.sid]??4, BYC={};D.forEach(d=>BYC[d.c]=d);
let A={g60:[null,null,null,null,null,null],a60:[null,null,null,null,null,null,null,null],wish:[],cat:"ok",shown:40,mode:"apply"};
try{const v=JSON.parse(localStorage.getItem("ldast")||"null");if(v)Object.assign(A,{g60:v.g60||A.g60,a60:v.a60||A.a60,wish:v.wish||[],mode:v.mode||"apply"})}catch(e){}
const save=()=>{try{localStorage.setItem("ldast",JSON.stringify({g60:A.g60,a60:A.a60,wish:A.wish,mode:A.mode}))}catch(e){}};
const $=id=>document.getElementById(id);

// ---------- 學測 60 級分估計（同一個全國百分位）----------
function est60(i){const v=L.st.sc[i];if(v==null)return null;const t=TOP15[String(i)],u=TOP60[String(i)];if(!t||!u)return Math.max(0,v*4-2);
  const p=((t[v]||0)+(v<15?(t[v+1]||0):0))/2;for(let k=60;k>=0;k--){if(u[k]!=null&&u[k]>=p)return k}return 0}
const g60=i=>A.g60[i]!=null?A.g60[i]:est60(i);
const sc60=s=>s<6?g60(s):A.a60[s-6];

// ---------- 判斷 ----------
function judge(d,o){o=o||{};const sc=s=>(o.bump&&o.bump[0]===s)?Math.min(60,(sc60(s)??NaN)+o.bump[1]):sc60(s);
  if(d.art)return{cat:"art",p:null};
  for(const item of d.std){   // item＝[[科目,標準],…]，任一科達到該科標準即可
    if(!item.some(([s])=>L.st.sc[s]!=null))return{cat:"miss",p:null,mw:`檢定要有${item.map(([s])=>SUBJ15[s]).join("或")}成績`};
    if(!item.some(([s,lv])=>L.st.sc[s]!=null&&L.st.sc[s]>=L.S5.v[SUBJ15[s]][LV.indexOf(lv)]))return{cat:"fail",p:null,why:item.map(([s,lv])=>SUBJ15[s]+lv).join("或")+" 未達"}}
  if(d.lt){if(!L.st.lt)return{cat:"miss",p:null,mw:"檢定要有英聽成績"};if("ABCF".indexOf(L.st.lt)>"ABCF".indexOf(d.lt))return{cat:"fail",p:null,why:`英聽未達${d.lt}級`}}
  let S=0,W=0;for(const [s,w] of d.w){const v=sc(s);if(v==null||isNaN(v))return{cat:"miss",p:null,mw:`採計要有${d.w.filter(([x])=>{const y=sc(x);return y==null||isNaN(y)}).map(([x])=>S60[x]+(x<6?"(學測)":"")).join("、")}成績`};S+=v*w;W+=w}
  S=Math.round(S*100)/100;
  if(d.pr==null)return{cat:Object.values(d.h).some(h=>!h[2])?"chg":"nodata",p:null,S};
  let n=0;for(const r of Q)if(d.pr+r*W<S)n++;
  const p=Math.min(PMAX,Math.max(.01,n/Q.length));
  return{cat:p>=.75?"safe":p>=.5?"good":p>=.2?"reach":"no",p,S,m:S-d.pr};
}
let R=[],RJ={};
const compute=()=>{R=D.map(d=>({d,j:judge(d)}));RJ={};R.forEach(r=>RJ[r.d.c]=r.j)};
const pct=p=>p==null?"—":(p>=PMAX?"85%+":Math.round(p*100)+"%");
const probBar=j=>j.p==null?"":`<div class="prob"><div class="bar"><i style="width:${Math.round(j.p/PMAX*100)}%;background:${CAT[j.cat][2]}"></i></div><b style="color:${CAT[j.cat][2]}">${pct(j.p)}</b></div>`;
const wTxt=d=>d.w.map(([s,w])=>`${typeof s==="number"?AB[s]:s}×${w}`).join(" ");
const stdTxt=d=>d.std.map(item=>item.map(([s,lv])=>AB[s]+lv.replace("標","")).join("或")).join(" ")+(d.lt?` 英聽${d.lt}級`:"");
const inPool=d=>(!A.fg||d.g.includes(+A.fg))&&(!A.fr||RG[d.sid]===A.fr);

// ---------- 畫面 ----------
const box=$("modeAst");
box.innerHTML=`
<nav class="tabs no-print"><div class="wrap"><a href="#aIn">輸入級分</a><a href="#aRep">落點報告</a><a href="#aWish">分發志願<b id="awc" hidden></b></a><a href="#aExp">找系組</a><a href="#aHow">準確度</a></div></nav>
<div class="wrap">
 <div class="print-only" id="aPrintHead"></div>
 <section class="panel no-print" id="aIn">
  <h2><span class="n">1</span>輸入成績 <small>分科還沒考？先填模擬考試算</small></h2>
  <div class="lbl">學測 15 級分（檢定用，和申請入學共用）</div><div class="scores" id="aSc15"></div>
  <div class="lbl">學測 60 級分（分發用；空白會依 15 級分自動估計，灰色斜體是估計值，有成績單請填實際分數）</div><div class="ast-in" id="aG60"></div>
  <div class="lbl">分科測驗 60 級分</div><div class="ast-in" id="aA60"></div>
  <div class="lbl">想讀的學群／地區</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><select id="afg"><option value="">全部學群</option></select><select id="afr"><option value="">全部地區</option></select></div>
 </section>
 <div class="panel no-print" id="aEmpty"><span class="note">輸入學測和分科成績後，下面會出現分發落點報告。分發是「直接錄取」，沒有面試；機率是指以你的加權總分錄取的機會。</span></div>
 <section class="report" id="aRep">
  <div class="panel"><div class="rp-head"><h2 style="margin:0"><span class="n">2</span>分科分發落點報告</h2>
   <div class="no-print" style="display:flex;gap:8px"><button class="btn navy" onclick="window.print()">列印／存 PDF 給家長</button><button class="btn gold" data-ashare>分享</button></div></div>
   <div class="kpis" id="aKpi"></div></div>
  <div class="two">
   <div class="panel" style="margin-top:0"><h2>各科位置（60 級分）</h2><div style="overflow-x:auto"><table class="t" id="aSubj"></table></div></div>
   <div class="panel" style="margin-top:0"><h2>哪一科多考 3 級分最划算？</h2><div id="aPlus"></div><p class="note">其他科不變，只把這一科加 3 級分（60 級分制），機率 50% 以上的系組會多幾個（已套用學群、地區）。</p></div>
  </div>
  <div class="panel"><h2>你能上的學校等級</h2><div id="aTier"></div>
   <div class="legend"><span><i style="background:var(--safe)"></i>穩上（75% 以上）</span><span><i style="background:var(--good)"></i>可上（50～75%）</span><span><i style="background:var(--reach)"></i>可衝（20～50%）</span></div></div>
  <div class="panel"><h2>推薦分發志願序 <small>由衝到保：6 衝・8 穩・6 保，每段依學校排名</small></h2><div id="aPick" class="wish"></div>
   <div class="no-print" style="margin-top:8px"><button class="btn ghost" id="aUsePick">把這 20 個放進我的分發志願</button></div></div>
  <div class="panel" id="aWish"><h2><span class="n">3</span>我的分發志願 <small>最多 100 個，依你想讀的順序排</small></h2>
   <div class="wish" id="aWishList"></div><div id="aWishCheck"></div>
   <div class="no-print" style="margin-top:10px"><a class="btn" style="background:#06c755;color:#fff;text-decoration:none" href="https://line.me/R/ti/p/@chuanglaomath" target="_blank" rel="noopener">想請莊老師幫你排分發志願？加官方 LINE @chuanglaomath</a></div></div>
 </section>
 <section class="panel no-print" id="aExp"><h2><span class="n">4</span>找系組</h2>
  <div class="filters"><input type="search" id="akw" placeholder="搜尋：醫學、資工、台大、會計…"><select id="ast"><option value="">全部等級</option></select><select id="asch"><option value="">全部學校</option></select>
   <select id="asub"><option value="">採計科目：不限</option></select></div>
  <select id="asort" hidden><option value="rank">依學校排名</option><option value="prob">依機率高→低</option><option value="probAsc">依機率低→高</option><option value="min">依預估最低分高→低</option></select>
  <div class="chips" id="aSortbar" style="margin-top:10px;align-items:center"></div>
  <div class="chips" id="aChips" style="margin-top:10px"></div><div class="list" id="aList"></div><button class="more" id="aMore" hidden>顯示更多</button>
 </section>
 <section class="panel no-print" id="aHow"><h2>準不準？公開回測</h2>
  <div class="acc"><div><b>${(META.mae||0).toFixed(1)} 級分</b>回測平均誤差（每科）：用前一年資料預測 113～115 年最低錄取分數；只看去年原始分數的做法是 2.1 級分</div>
   <div><b>逐科換算 PR</b>把歷年最低分換成各科「全國前百分之幾」，再換回今年級分，消掉每科每年難易度差異</div>
   <div><b>最高顯示 85%</b>回測發現最高機率區間偏樂觀（少數系組門檻會突然大跳），所以不給「九成以上」的保證</div></div>
  <table class="t" style="margin-top:10px" id="aCal"></table>
  <p class="note">只用「採計科目與加權跟 116 年完全一樣」的年度；採計改了的系組標「採計改變」。術科校系（音樂、美術、體育）沒有機率。最低登記標準由考分會在登記前公告，本工具未納入。</p></section>
 <div class="cta no-print"><p>落點分析免費，你的一個讚，就是下一個工具的動力！</p>
  <a class="b-yt" href="https://www.youtube.com/@chuanglaomath?sub_confirmation=1" target="_blank" rel="noopener">▶ 訂閱 YouTube</a><button class="b-share" data-ashare>分享給同學</button><a class="b-line" href="https://line.me/R/ti/p/@chuanglaomath" target="_blank" rel="noopener">加官方 LINE 問莊老師</a></div>
</div>`;
// 校準表（輪流留一年回測）
const cv=META.cal||[];$("aCal").innerHTML=`<tr><th class="l">預測機率</th><th>0～20%</th><th>20～40%</th><th>40～60%</th><th>60～80%</th><th>80% 以上</th></tr><tr><td class="l">113～115 年實際錄取</td>${cv.map(v=>`<td>${v==null?"—":Math.round(v*100)+"%"}</td>`).join("")}</tr>`;

// 輸入欄
function renderInputs(){
  $("aSc15").innerHTML="";SUBJ15.forEach((s,i)=>{const l=document.createElement("label");l.textContent=s;const e=document.createElement("select");
    e.innerHTML='<option value="">未考</option>'+Array.from({length:16},(_,k)=>`<option>${15-k}</option>`).join("");e.value=L.st.sc[i]==null?"":L.st.sc[i];
    e.onchange=()=>{L.st.sc[i]=e.value===""?null:+e.value;L.save();L.all();renderInputs();all()};l.appendChild(e);$("aSc15").appendChild(l)});
  {const l=document.createElement("label");l.textContent="英聽";const e=document.createElement("select");e.innerHTML='<option value="">未考</option><option>A</option><option>B</option><option>C</option><option>F</option>';e.value=L.st.lt||"";
   e.onchange=()=>{L.st.lt=e.value||null;L.save();L.all();all()};l.appendChild(e);$("aSc15").appendChild(l)}
  $("aG60").innerHTML=SUBJ15.map((s,i)=>{const est=est60(i);return`<label>${s}<input type="number" min="0" max="60" inputmode="numeric" data-g="${i}" value="${A.g60[i]??""}" placeholder="${est!=null?"估 "+est:"未考"}"></label>`}).join("");
  $("aA60").innerHTML=S60.slice(6).map((s,i)=>`<label>${s}<input type="number" min="0" max="60" inputmode="numeric" data-a="${i}" value="${A.a60[i]??""}" placeholder="未考"></label>`).join("");
  box.querySelectorAll("[data-g]").forEach(e=>e.oninput=()=>{const v=e.value===""?null:Math.max(0,Math.min(60,Math.round(+e.value)));A.g60[+e.dataset.g]=v;save();all()});
  box.querySelectorAll("[data-a]").forEach(e=>e.oninput=()=>{const v=e.value===""?null:Math.max(0,Math.min(60,Math.round(+e.value)));A.a60[+e.dataset.a]=v;save();all()});
}
GN.forEach((g,i)=>$("afg").add(new Option(g+"學群",i)));RN.forEach(r=>$("afr").add(new Option(r,r)));TIERS.forEach(([t],i)=>$("ast").add(new Option(t,i)));
[...new Map(D.map(d=>[d.sid,d.s])).entries()].sort((a,b)=>(RANK[a[0]]??999)-(RANK[b[0]]??999)).forEach(([k,v])=>$("asch").add(new Option(v,k)));
S60.slice(6).forEach((s,i)=>$("asub").add(new Option("採計有"+s,i+6)));
["afg","afr"].forEach(id=>$(id).addEventListener("input",()=>{A[id.slice(1)]=$(id).value;all()}));
["akw","ast","asch","asub","asort"].forEach(id=>$(id).addEventListener("input",()=>{A.shown=40;renderList()}));
$("aMore").onclick=()=>{A.shown+=40;renderList()};

const any=()=>A.a60.some(v=>v!=null)||L.st.sc.some(v=>v!=null);
function renderReport(){
  const show=A.a60.some(v=>v!=null);$("aRep").classList.toggle("show",show);$("aEmpty").hidden=show;if(!show)return;
  const pool=R.filter(r=>inPool(r.d));const cnt=c=>pool.filter(r=>r.j.cat===c).length;
  const best=TIERS.findIndex((_,ti)=>pool.some(r=>tierOf(r.d)===ti&&(r.j.cat==="safe"||r.j.cat==="good")));
  $("aKpi").innerHTML=`<div class="kpi"><div class="k">穩上＋可上</div><div class="v">${cnt("safe")+cnt("good")} 系組</div><div class="s">機率 50% 以上</div></div>
   <div class="kpi"><div class="k">可衝</div><div class="v">${cnt("reach")} 系組</div><div class="s">機率 20～50%</div></div>
   <div class="kpi"><div class="k">最高可上等級</div><div class="v" style="font-size:19px">${best>=0?TIERS[best][0]:"—"}</div><div class="s">機率 50% 以上</div></div>
   <div class="kpi"><div class="k">你的科目能報的</div><div class="v">${pool.filter(r=>r.j.cat!=="miss"&&r.j.cat!=="art").length} 系組</div><div class="s">另有 ${cnt("miss")} 系組要考你沒考的科目</div></div>`;
  $("aSubj").innerHTML=`<tr><th class="l">科目</th><th>60 級分</th><th>贏過</th></tr>`+S60.map((s,i)=>{const v=sc60(i);if(v==null)return"";const t=TOP60[String(i)];const p=t&&t[v]!=null?Math.round(100-t[v]+((t[v]-(v<60&&t[v+1]!=null?t[v+1]:0))/2)):null;
    return`<tr><td class="l">${s}${i<6&&A.g60[i]==null?' <span class="note">(估計)</span>':""}</td><td><b>${v}</b></td><td>${p==null?"—":p+"%"}</td></tr>`}).join("");
  const cntP=b=>D.reduce((n,d)=>{if(!inPool(d))return n;const j=judge(d,{bump:b});return n+(j.p!=null&&j.p>=.5?1:0)},0);
  const base=cntP(null);const gains=S60.map((s,i)=>sc60(i)==null||sc60(i)>=60?null:[i,cntP([i,3])-base]).filter(Boolean).sort((a,b)=>b[1]-a[1]);const mx=Math.max(1,...gains.map(g=>g[1]));
  $("aPlus").innerHTML=gains.length?gains.slice(0,8).map(([i,g],k)=>`<div class="plus ${k===0&&g>0?"top":""}"><span>${AB[i]} +3</span><div class="bar"><i style="width:${g/mx*100}%"></i></div><span>+${g} 系</span></div>`).join("")+
   (gains[0][1]>0?`<div class="callout">最划算：<b>${S60[gains[0][0]]}</b>，多 3 級分就多 <b>${gains[0][1]}</b> 個系組有機會。${[2,3,6,7].includes(gains[0][0])?"數學是最能拉開差距的一科，現在開始補還來得及。":""}</div>`:""):'<div class="note">—</div>';
  $("aTier").innerHTML=TIERS.map(([t],ti)=>{const rs=pool.filter(r=>tierOf(r.d)===ti&&r.j.p!=null||tierOf(r.d)===ti&&["fail","no"].includes(r.j.cat));const ks=["safe","good","reach"];const a=ks.map(c=>rs.filter(r=>r.j.cat===c).length);const tot=rs.length||1;
    return`<div class="trow"><span>${t}</span><div class="tbar">${a.map((v,i)=>`<span title="${CAT[ks[i]][0]} ${v}" style="width:${v/tot*100}%;background:${CAT[ks[i]][2]}"></span>`).join("")}</div><span class="note">${a[0]+a[1]+a[2]}/${rs.length}</span></div>`}).join("");
  const byRank=(a,b)=>rankOf(a.d)-rankOf(b.d)||b.j.p-a.j.p;
  const pick=(lo,hi,n)=>pool.filter(r=>r.j.p!=null&&r.j.p>=lo&&r.j.p<hi).sort(byRank).slice(0,n);
  window._apick=[...pick(.2,.5,6),...pick(.5,.75,8),...pick(.75,1,6)];
  $("aPick").innerHTML=window._apick.map(({d,j},i)=>`<div class="wi"><span class="no">${i+1}</span><div><b style="color:var(--navy)">${d.s} ${d.n}</b> <span class="note">${TIERS[tierOf(d)][0]}・${wTxt(d)}</span>${probBar(j)}</div><div></div></div>`).join("")||'<div class="note">沒有符合的系組，可以放寬學群或地區。</div>';
  $("aPrintHead").innerHTML=`<h2 style="margin:0 0 4px;color:#0f2747">分科分發落點報告｜莊老數學教室・正賦文理</h2><div class="note">學測 60 級分：${SUBJ15.map((s,i)=>g60(i)==null?"":s+" "+g60(i)+(A.g60[i]==null?"(估)":"")).filter(Boolean).join("、")}　分科：${S60.slice(6).map((s,i)=>A.a60[i]==null?"":s+" "+A.a60[i]).filter(Boolean).join("、")}　產生日期：${new Date().toLocaleDateString("zh-TW")}　僅供參考，不保證錄取。</div>`;
}
$("aUsePick").onclick=()=>{const cs=(window._apick||[]).map(r=>r.d.c);if(!cs.length)return;A.wish=cs;save();renderWish();renderList();$("aWish").scrollIntoView();L.toast("已放進分發志願")};
function renderWish(){
  A.wish=A.wish.filter(c=>BYC[c]);$("awc").hidden=!A.wish.length;$("awc").textContent=A.wish.length;
  $("aWishList").innerHTML=A.wish.length?A.wish.map((c,i)=>{const d=BYC[c],j=RJ[c]||{};return`<div class="wi"><span class="no">${i+1}</span><div><b style="color:var(--navy)">${d.s} ${d.n}</b> <span class="note">${TIERS[tierOf(d)][0]}</span>
    <div class="note">${wTxt(d)}${j.S!=null?`・你的加權總分 ${j.S.toFixed(2)}`:""}${d.pr!=null?`・預估最低 ${d.pr.toFixed(1)}`:""}</div>${j.p!=null?probBar(j):`<div class="note">${j.cat?CAT[j.cat][0]:""}</div>`}</div>
    <div class="ops no-print"><button data-au="${i}">↑</button><button data-ad="${i}">↓</button><button data-ax="${i}">✕</button></div></div>`}).join(""):'<div class="empty">還沒有分發志願。在「找系組」按「＋志願」，或用上面的推薦志願序。</div>';
  box.querySelectorAll("[data-au]").forEach(b=>b.onclick=()=>{const i=+b.dataset.au;if(i>0){[A.wish[i-1],A.wish[i]]=[A.wish[i],A.wish[i-1]];save();renderWish()}});
  box.querySelectorAll("[data-ad]").forEach(b=>b.onclick=()=>{const i=+b.dataset.ad;if(i<A.wish.length-1){[A.wish[i+1],A.wish[i]]=[A.wish[i],A.wish[i+1]];save();renderWish()}});
  box.querySelectorAll("[data-ax]").forEach(b=>b.onclick=()=>{A.wish.splice(+b.dataset.ax,1);save();renderWish();renderList()});
  const ps=A.wish.map(c=>RJ[c]&&RJ[c].p).filter(p=>p!=null);const msgs=[];
  if(A.wish.length){
    if(!ps.some(p=>p>=.75))msgs.push(`<div class="warn">⚠ 沒有「穩上」志願（機率 75% 以上），建議在後段放幾個保底。</div>`);
    let inv=0;for(let i=1;i<A.wish.length;i++){const a=RJ[A.wish[i-1]],b=RJ[A.wish[i]];if(a&&b&&a.p!=null&&b.p!=null&&a.p>=.75&&b.p<.5)inv++}
    if(inv)msgs.push(`<div class="warn">💡 有 ${inv} 處是「穩上的系排在想衝的系前面」。分發會依志願序錄取，穩上的系排太前面，後面想衝的系就沒機會了；想讀的、難的放前面，保底放後面。</div>`);
    const none=ps.length?ps.reduce((a,p)=>a*(1-p),1):1;
    if(!msgs.length)msgs.push(`<div class="ok">✔ 衝穩保順序 OK。</div>`);
    msgs.push(`<div class="note" style="margin-top:6px">${ps.length?`至少錄取 1 個的機率約 <b>${1-none>=.99?"99% 以上":Math.round((1-none)*100)+"%"}</b>（各系組視為獨立估計）・`:""}已填 ${A.wish.length}/100 個</div>`);
  }
  $("aWishCheck").innerHTML=msgs.join("");
}
function toggleWish(c){if(A.wish.includes(c))A.wish=A.wish.filter(x=>x!==c);else{if(A.wish.length>=100){L.toast("最多 100 個志願");return}A.wish.push(c);L.toast("已加入分發志願")}save();renderWish();renderList()}
function card(d,j){
  const hist=Object.keys(d.h).sort().reverse().map(y=>{const [mn,n,same]=d.h[y];return`<div class="yr"${same?"":' style="color:#9aa3b2"'}><span class="k">${y}年</span>${mn==null?"沒有錄取（名額 0）":mn.toFixed(2)}${n!=null?`（錄取 ${n} 人）`:""}${same?"":"（採計和今年不同，不列入計算）"}</div>`}).join("");
  const pred=d.pr!=null?`<div><span class="k">預估最低</span><b>${d.pr.toFixed(1)}</b>（${d.use.join("、")} 年最低分逐科換算 PR）${j&&j.S!=null?`；你的加權總分 <b>${j.S.toFixed(2)}</b>，${j.m>=0?"高":"低"} ${Math.abs(j.m).toFixed(1)}`:""}</div>`:"";
  return`<div class="item ${j?j.cat:""}"><div class="it-top"><div class="nm"><span class="tl">${TIERS[tierOf(d)][0]}</span>${d.s} ${d.n}<small>${d.c}・名額 ${d.q}${RG[d.sid]?"・"+RG[d.sid]:""}</small></div>
   <div style="display:flex;gap:6px;align-items:center">${j?`<span class="tag ${j.cat}">${CAT[j.cat][0]}</span>`:""}<button class="add ${A.wish.includes(d.c)?"on":""}" data-aw="${d.c}">${A.wish.includes(d.c)?"✓ 志願":"＋志願"}</button></div></div>
   ${j&&j.p!=null?probBar(j):""}
   <div class="meta">${j&&j.mw?`<div><span class="k">缺考</span><b style="color:var(--no)">${j.mw}，你沒有填</b></div>`:""}<div><span class="k">採計加權</span>${wTxt(d)}</div>${d.std.length||d.lt?`<div><span class="k">檢定</span>${stdTxt(d)}${j&&j.why?` <b style="color:var(--no)">（${j.why}）</b>`:""}</div>`:""}${pred}
   ${d.q<=5?`<div class="note">名額 ${d.q} 個，名額少的系組每年波動較大。</div>`:""}
   <details class="more-info"><summary>歷年最低錄取分數</summary>${hist||'<div class="note">沒有歷年資料</div>'}</details></div></div>`;
}
function renderList(){
  const has=any();const kw=$("akw").value.trim().replace(/臺/g,"台"),t=$("ast").value,sc=$("asch").value,sub=$("asub").value,sort=$("asort").value;
  let rows=R.filter(({d})=>inPool(d)&&(!kw||(d.s+d.n).replace(/臺/g,"台").includes(kw)||d.c===kw)&&(t===""||tierOf(d)==t)&&(!sc||d.sid===sc)&&(!sub||d.w.some(([s])=>s===+sub)));
  const cnt={};rows.forEach(r=>cnt[r.j.cat]=(cnt[r.j.cat]||0)+1);
  $("aChips").innerHTML="";const okN=(cnt.safe||0)+(cnt.good||0)+(cnt.reach||0);if(has)[["ok","有機會",okN],["all","全部",rows.length],...Object.entries(CAT).map(([k,v])=>[k,v[0],cnt[k]||0])].forEach(([k,tx,c])=>{if(!["all","ok"].includes(k)&&!c)return;
    const b=document.createElement("button");b.className="chip"+(A.cat===k?" on":"");b.innerHTML=`${tx}<b>${c}</b>`;b.onclick=()=>{A.cat=k;A.shown=40;renderList()};$("aChips").appendChild(b)});
  if(has&&A.cat==="ok")rows=rows.filter(r=>["safe","good","reach"].includes(r.j.cat));else if(has&&A.cat!=="all")rows=rows.filter(r=>r.j.cat===A.cat);
  $("aSortbar").innerHTML='<span style="font-weight:700;font-size:14px;margin-right:2px">排序</span>'+[["rank","學校排名"],["prob","機率高→低"],["probAsc","機率低→高"],["min","預估最低分高→低"]].map(([k,tx])=>`<button class="chip${sort===k?" on":""}" data-sort="${k}">${tx}</button>`).join("")+(!has&&sort.startsWith("prob")?'<span class="note" style="margin:0">先輸入成績，才能依機率排序</span>':"");
  $("aSortbar").querySelectorAll("[data-sort]").forEach(b=>b.onclick=()=>{$("asort").value=b.dataset.sort;A.shown=40;renderList()});
  rows.sort(sort==="prob"&&has?(a,b)=>(b.j.p??-1)-(a.j.p??-1)||rankOf(a.d)-rankOf(b.d):sort==="probAsc"&&has?(a,b)=>(a.j.p??999)-(b.j.p??999)||rankOf(a.d)-rankOf(b.d):sort==="min"?(a,b)=>((b.d.pr??-1)/b.d.w.reduce((x,w)=>x+w[1],0))-((a.d.pr??-1)/a.d.w.reduce((x,w)=>x+w[1],0)):(a,b)=>rankOf(a.d)-rankOf(b.d)||a.d.c.localeCompare(b.d.c));
  $("aList").innerHTML=rows.slice(0,A.shown).map(({d,j})=>card(d,has?j:null)).join("")||'<div class="note">沒有符合的系組。</div>';
  $("aMore").hidden=rows.length<=A.shown;$("aMore").textContent=`顯示更多（還有 ${Math.max(0,rows.length-A.shown)} 個）`;
  box.querySelectorAll("#aList .add").forEach(b=>b.onclick=()=>toggleWish(b.dataset.aw));
}
function all(){compute();renderReport();renderWish();renderList();
  box.querySelectorAll("[data-g]").forEach(e=>{const i=+e.dataset.g,est=est60(i);e.placeholder=est!=null?"估 "+est:"未考"})}
box.querySelectorAll("[data-ashare]").forEach(b=>b.onclick=L.share);

// ---------- 模式切換 ----------
function setMode(m){A.mode=m;save();$("modeApply").hidden=m!=="apply";box.hidden=m!=="ast";
  $("heroApply").hidden=m!=="apply";$("heroAst").hidden=m!=="ast";$("badgesApply").hidden=m!=="apply";$("badgesAst").hidden=m!=="ast";
  document.querySelectorAll(".mode").forEach(b=>b.classList.toggle("on",b.dataset.mode===m));
  document.title=(m==="ast"?"分科分發落點分析":"學測落點分析")+"｜莊老數學教室・正賦文理";
  if(m==="ast"){renderInputs();all()}
  else{   // 切回申請入學：把共用的學測 15 級分、英聽同步回申請入學的下拉選單
    const sels=[...document.querySelectorAll("#scores select")];
    sels.forEach((e,i)=>{e.value=i<6?(L.st.sc[i]==null?"":String(L.st.sc[i])):(L.st.lt||"")});L.all()}}
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
if(location.hash==="#ast")A.mode="ast";
setMode(A.mode);
window.__AST={judge,est60,sc60,A,D,all,setMode,PMAX};   // 測試用
})();
