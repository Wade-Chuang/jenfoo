// 統測落點分析（四技二專）：甄選入學一階＋聯合登記分發
(function(){
const $=id=>document.getElementById(id);
const G=window.TC_G, U=window.TC_U, R=window.TC_R, CAL=window.TC_CAL;
const AU=window.AP_U, ARC=window.AP_RC||[], AR=window.AP_R, ACAL=window.AP_CAL, ATOP=window.AP_TOP;
const K=["c","e","m","p1","p2"], KN={c:"國文",e:"英文",m:"數學",p1:"專業(一)",p2:"專業(二)",tot:"總級分"}, KS={c:"國",e:"英",m:"數",p1:"專一",p2:"專二",tot:"總級分"};
const TIERS=[["頂尖科大",["國立臺灣科技大學","國立臺北科技大學"]],["國立前段",["國立雲林科技大學","國立高雄科技大學","國立虎尾科技大學","國立勤益科技大學","國立臺中科技大學","國立臺北商業大學","國立臺北護理健康大學","國立屏東科技大學","國立高雄餐旅大學","國立臺灣師範大學","國立彰化師範大學"]],["其他公立",[]],["私立前段",["明志科技大學","長庚科技大學","南臺科技大學","朝陽科技大學","龍華科技大學","輔英科技大學","弘光科技大學","正修科技大學","中國科技大學","明新科技大學","健行科技大學"]],["其他私立",[]]];
const tierOf=d=>{for(let i=0;i<TIERS.length;i++)if(TIERS[i][1].some(s=>d.s.includes(s)))return i;return /國立|市立/.test(d.s)?2:4};
const CAT={safe:["穩上","var(--safe)"],good:["可上","var(--good)"],reach:["可衝","var(--reach)"],no:["不建議","var(--no)"],unf:["去年未額滿","var(--gray)"],chg:["116 採計改變","var(--gray)"],gone:["116 查不到","var(--gray)"],miss:["缺考科目","var(--gray)"],nodata:["無歷年資料","var(--gray)"]};
const CATA={safe:"一階穩過",good:"一階可過",reach:"可衝",no:"不建議",unf:"去年未超額"};
const catName=(m,c)=>m==="a"&&CATA[c]||CAT[c][0];
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// 群別：兩位數代碼；登記分發用字母 A~T
const GNAME={};U.forEach(d=>GNAME[String(d.g.charCodeAt(0)-64).padStart(2,"0")]=d.gn);GNAME["21"]="21資管類（甄選）";
const letter=gc=>+gc<=20?String.fromCharCode(64+ +gc):null;
let st={mode:"a",gc:"",sc:{},wish:[],wishA:[],favA:[],favU:[],cat:"ok",sort:"rank",shown:40};
try{const v=JSON.parse(localStorage.getItem("tc1")||"{}");Object.assign(st,v);if(v.g&&!v.gc)st.gc=String(v.g.charCodeAt(0)-64).padStart(2,"0");st.cat="ok";st.shown=40}catch(e){}
const save=()=>{try{localStorage.setItem("tc1",JSON.stringify({mode:st.mode,gc:st.gc,sc:st.sc,wish:st.wish,wishA:st.wishA,favA:st.favA,favU:st.favU,sort:st.sort}))}catch(e){}};
$("grp").innerHTML='<option value="">請選擇</option>'+Object.keys(GNAME).sort().map(g=>`<option value="${g}">${esc(GNAME[g])}</option>`).join("");
$("grp").value=st.gc||"";K.forEach(k=>{const v=st.sc[k];$("s_"+k).value=v==null?"":v});
$("ftier").innerHTML+=TIERS.map((t,i)=>`<option value="${i}">${t[0]}</option>`).join("");
$("farea").innerHTML+=[...new Set(U.map(d=>d.area).concat(AU.map(d=>d.area)).filter(Boolean))].map(a=>`<option>${a}</option>`).join("");
const mk=(cal)=>{const P=[[0,0],...cal.map((c,i)=>[i/10+.05,c]),[1,Math.max(cal[9],.99)]];return p=>{for(let i=1;i<P.length;i++){const[a,ca]=P[i-1],[b,cb]=P[i];if(p<=b)return ca+(cb-ca)*(p-a)/(b-a)}return P[P.length-1][1]}};
const calU=mk(CAL), calA=mk(ACAL);
const catOf=p=>p>=.75?"safe":p>=.5?"good":p>=.2?"reach":"no";
// ---- 登記分發 ----
const lg=p=>{p=Math.min(Math.max(p,1e-4),1-1e-4);return Math.log(p/(1-p))};
function topFrac(g,w,total){const M=G[g];const wv=K.map(k=>w[k]||0);let m=0,v=0;for(let i=0;i<5;i++){m+=wv[i]*M.mu[i];for(let j=0;j<5;j++)v+=wv[i]*wv[j]*M.S[i][j]}
  const z=(total-m)/Math.sqrt(Math.max(v,1e-9));const zs=M.z,fr=M.f;if(z<=zs[0])return fr[0];if(z>=zs[zs.length-1])return fr[fr.length-1];
  let i=0;while(zs[i+1]<z)i++;return fr[i]+(fr[i+1]-fr[i])*(z-zs[i])/(zs[i+1]-zs[i])}
function judgeU(d){
  const subj=d.subj||K;const w={};subj.forEach(k=>w[k]=d.w[k]);
  for(const k of subj)if(st.sc[k]==null)return{cat:"miss",why:"要有"+subj.filter(k=>st.sc[k]==null).map(k=>KN[k]).join("、")};
  const changed=d.subj&&d.subj.length<5;
  if(d.p==null)return{cat:d.adm<d.q||d.min==null?"unf":"nodata"};
  const total=subj.reduce((a,k)=>a+w[k]*st.sc[k],0);const f=topFrac(d.g,w,total);
  const lp=lg(d.p),lf=lg(f);let n=0;for(const r of R)if(lp+r>=lf)n++;let p=calU(n/R.length);
  if(changed)p=Math.min(.9,Math.max(.02,p));
  return{cat:catOf(p),p,total:Math.round(total*100)/100,f,changed}}
// ---- 甄選入學一階 ----
const lv=(g,k)=>{const s=st.sc[k];if(s==null)return null;if(s<=0)return 0;const top=(ATOP[g]||ATOP["01"])[k];return Math.min(15,Math.ceil(s*15/top-1e-9))};
const nsub=subs=>subs.includes("tot")?5:Math.min(subs.length,4);
function pickR(k){for(const kk of [k,...[4,3,2,1].filter(j=>j<k),...[2,3].filter(j=>j>k)])if((AR[kk]||[]).length>=200)return AR[kk];return AR[1]}
function stepP(t,s,Rk,mx){let n=0;for(const r of Rk)if(Math.min(t-r,mx)<s+.5)n++;return n/Rk.length}  // 門檻不會超過這關滿級分 mx  // 達到最低級分就過
const stepSum=(g,subs)=>{let t=0;for(const k of subs){if(k==="tot"){for(const kk of K){const v=lv(g,kk);if(v==null)return null;t+=v}}else{const v=lv(g,k);if(v==null)return null;t+=v}}return t};
function judgeA(d){
  if(!d.s116)return{cat:"gone"};
  if(d.s116.join()!==d.used.join()){
    if(!d.predSub)return{cat:"chg"};
    // 116 只拿掉科目：用留下科目的歷年關卡估計（誤差用「倍率改了、同科目關卡」的回測分布），限制 5～90%
    const m2=d.s116.filter(k=>st.sc[k]==null);if(m2.length)return{cat:"miss",why:"要有"+m2.map(k=>KN[k]).join("、")};
    if(d.st==="unf")return{cat:"unf"};
    const s2=d.predSub.map(([subs])=>stepSum(d.g,subs));let P2=1;d.predSub.forEach(([subs,t],i)=>P2*=stepP(t,s2[i],ARC,15*subs.length));
    const p2=Math.min(.9,Math.max(.05,calA(P2)));return{cat:catOf(p2),p:p2,sums:s2,est:true}}
  const miss=d.used.filter(k=>st.sc[k]==null);if(miss.length)return{cat:"miss",why:"要有"+miss.map(k=>KN[k]).join("、")};
  if(d.st==="unf")return{cat:"unf"};
  if(!d.pred||!d.pred.length)return{cat:"nodata"};
  const sums=d.pred.map(([subs])=>stepSum(d.g,subs));if(sums.some(v=>v==null))return{cat:"miss",why:"總級分要五科都有成績"};
  let P=1;d.pred.forEach(([subs,t],i)=>P*=stepP(t,sums[i],pickR(nsub(subs)),15*(subs.includes("tot")?5:subs.length)));
  const p=calA(P);return{cat:catOf(p),p,sums}}
// ---- 共用畫面 ----
function toast(t){let e=document.getElementById("toast");if(!e){e=document.createElement("div");e.id="toast";e.style.cssText="position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#0f2747;color:#fff;padding:9px 18px;border-radius:99px;font-size:14px;z-index:50;box-shadow:0 6px 20px rgba(0,0,0,.25);transition:opacity .3s;max-width:calc(100% - 32px);text-align:center";document.body.appendChild(e)}
  e.textContent=t;e.style.opacity=1;clearTimeout(e._t);e._t=setTimeout(()=>e.style.opacity=0,2200)}
const probBar=j=>`<div class="prob"><div class="bar"><i style="width:${Math.round(j.p*100)}%;background:${CAT[j.cat][1]}"></i></div><b style="color:${CAT[j.cat][1]}">${Math.round(j.p*100)}%</b></div>`;
const subjTxtU=d=>K.map(k=>`<span class="sb ${d.subj&&!d.subj.includes(k)?"off":""}">${KN[k]}${(!d.subj||d.subj.includes(k))?"×"+d.w[k]:""}</span>`).join("");
const stepName=subs=>subs.map(k=>KS[k]).join("+");
const wishArr=()=>st.mode==="a"?st.wishA:st.wish;
function cardU(d,j,i){
  const hist=Object.entries(d.h).sort().reverse().map(([y,[mn,q,a,same]])=>`<tr><td>${y}</td><td>${q}</td><td>${a}</td><td>${mn==null?"—":mn}</td><td>${same?"":"加權不同"}</td></tr>`).join("");
  return`<div class="item ${j?j.cat:""}"><div class="top"><div class="nm"><span class="tl">${TIERS[tierOf(d)][0]}</span>${esc(d.s)} ${esc(d.n)}<small>${esc(d.gn)}${d.area?"・"+esc(d.area):""}${d.type?"・"+d.type:""}・115 名額 ${d.q}</small></div>
   <div style="display:flex;gap:6px;align-items:center">${j?`<span class="tag ${j.cat}">${catName("u",j.cat)}</span>`:""}<button class="add no-print ${st.wish.includes(i)?"on":""}" data-w="${i}">${st.wish.includes(i)?"✓ 志願":"＋志願"}</button><button class="fav no-print ${st.favU.includes(i)?"on":""}" data-f="${i}" title="收藏比較">♥</button></div></div>
   ${j&&j.p!=null?probBar(j):""}
   <div class="meta"><div><span class="k">116 採計</span>${d.subj?subjTxtU(d):"<span class='note'>116 查不到這個系（可能停招或改名）</span>"} ${j&&j.changed?'<span class="est">科目改變・估計・倍率暫用 115</span>':""}</div>
   ${j&&j.why?`<div><span class="k">缺考</span><b style="color:var(--no)">${esc(j.why)}</b></div>`:""}
   ${j&&j.total!=null?`<div><span class="k">你的總分</span>${j.total}（在同群登記考生約前 ${Math.max(1,Math.round(j.f*100))}%；這個系近年錄取到前 ${Math.max(1,Math.round(d.p*100))}%）</div>`:d.p!=null?`<div><span class="k">錄取排名</span>近 ${d.py} 年平均錄取到同群登記考生前 ${Math.max(1,Math.round(d.p*100))}%</div>`:""}
   <div><span class="k">115 最低</span>${d.min==null?"—（0 人錄取）":d.min}${d.subj&&d.subj.length<5&&d.min!=null?'<span class="note">（115 採計五科，116 改了，不能和你的總分直接比）</span>':""}${d.adm<d.q?`<span class="est">　錄取 ${d.adm}／名額 ${d.q}，未額滿</span>`:""}</div></div>
   <details class="h"><summary>歷年錄取資料</summary><table class="t"><tr><th>年</th><th>名額</th><th>錄取</th><th>最低總分</th><th></th></tr>${hist}</table></details></div>`}
function cardA(d,j,i){
  const mult=["c","e","m","p1","p2","tot"].filter(k=>d.mult[k]).map(k=>`<span class="sb">${KN[k]}×${d.mult[k]}</span>`).join("");
  const s116=d.s116?d.s116.map(k=>`<span class="sb">${KN[k]}</span>`).join(""):"";
  const hist=Object.entries(d.h).sort().reverse().map(([y,[q,ne,full,steps,same]])=>`<tr><td>${y}</td><td>${q}</td><td>${ne}</td><td>${full?"是":"否"}</td><td style="text-align:left">${steps.map(([s,v])=>stepName(s)+(v==null?"":"≧"+v)).join(" → ")||"—"}${same?"":"（倍率不同）"}</td></tr>`).join("");
  const PP=j&&j.est?d.predSub:d.pred;
  const pred=PP&&PP.length?PP.map(([s,t],k)=>`${stepName(s)} ≧ ${Math.round(t*10)/10}${j&&j.sums?`<b style="color:${j.sums[k]>=Math.round(t)?"var(--safe)":"var(--no)"}">（你 ${j.sums[k]}）</b>`:""}`).join(" → "):"";
  return`<div class="item ${j?j.cat:""}"><div class="top"><div class="nm"><span class="tl">${TIERS[tierOf(d)][0]}</span>${esc(d.s)} ${esc(d.n)}<small>${esc(d.gn)}${d.area?"・"+esc(d.area):""}${d.type?"・"+d.type:""}・115 名額 ${d.q}、預計甄試 ${d.ne} 人</small></div>
   <div style="display:flex;gap:6px;align-items:center">${j?`<span class="tag ${j.cat}">${catName("a",j.cat)}</span>`:""}<button class="add no-print ${st.wishA.includes(i)?"on":""}" data-w="${i}">${st.wishA.includes(i)?"✓ 志願":"＋志願"}</button><button class="fav no-print ${st.favA.includes(i)?"on":""}" data-f="${i}" title="收藏比較">♥</button></div></div>
   ${j&&j.p!=null?probBar(j):""}
   <div class="meta"><div><span class="k">115 篩選</span>${mult}</div>
   <div><span class="k">116 選採</span>${s116||"<span class='note'>116 查不到（可能停招或改名）</span>"}${j&&j.cat==="chg"?'<span class="est">　116 新增了 115 沒篩的科目，舊門檻不能直接比</span>':""}</div>
   ${j&&j.why?`<div><span class="k">缺考</span><b style="color:var(--no)">${esc(j.why)}</b></div>`:""}
   ${pred?`<div><span class="k">預測門檻</span>${pred}<span class="note">（級分，近 ${d.py} 年平均）</span>${j&&j.est?'<span class="est">　116 拿掉部分科目・只看留下科目的歷年門檻・估計</span>':""}</div>`:d.st==="unf"?`<div><span class="k">115</span>沒有超額，有報名的都進二階</div>`:""}
   ${d.r2?`<div><span class="k">二階計分</span>統測 ${d.r2.tp}%${d.r2.it.map(([a,b])=>`＋${esc(a.replace(/\(含技能領域\)/,""))} ${b}%`).join("")}</div><div><span class="k">115 日程</span>備審上傳截止 ${esc(d.r2.due)}・${d.r2.ed?"甄試 "+esc(d.r2.ed):"不用到校"}${d.r2.fee&&d.r2.fee!=="0"?"・甄試費 "+esc(d.r2.fee)+" 元":""}<span class="note">（116 簡章公布後更新）</span></div>`:""}</div>
   ${d.r2&&d.r2.tp?`<details class="h s2 no-print" data-s2="${i}"><summary>🎯 二階總成績試算（備審、面試要拿幾分？）</summary><div class="s2b"></div></details>`:""}
   ${d.r2?`<div class="no-print" style="margin-top:4px"><a href="${BEISHEN}#import=T${d.code}.${d.g}${j&&j.p!=null?"-"+Math.round(j.p*100):""}" target="${BT}" rel="noopener" style="font-size:13px;color:var(--navy2)">📝 用備審小幫手準備這個系的二階資料 →</a></div>`:""}
   <details class="h"><summary>歷年篩選資料</summary><table class="t"><tr><th>年</th><th>名額</th><th>預計甄試</th><th>超額</th><th>篩選門檻（級分）</th></tr>${hist}</table></details></div>`}
let J=[];
const any=()=>st.gc&&K.some(k=>st.sc[k]!=null);
const DATA=()=>st.mode==="a"?AU:U, inGrp=d=>st.mode==="a"?d.g===st.gc:d.g===letter(st.gc);
function compute(){const D=DATA(),f=st.mode==="a"?judgeA:judgeU,W=new Set(wishArr());J=D.map((d,i)=>({d,i,j:(inGrp(d)||W.has(i))&&any()?f(d):null}))}   // 志願不管目前選哪個群類都算（有人跨群類報考）
function render(){
  document.querySelectorAll(".mode").forEach(b=>b.classList.toggle("on",b.dataset.mode===st.mode));
  const A=st.mode==="a";
  $("heroTxt").textContent=A?"甄選入學第一階段：用 111～115 年官方「統測篩選標準」，把你的統測分數換成級分，照每個系的篩選順序逐關比對，算出通過一階的機率。":"聯合登記分發：用 111～115 年官方最低錄取總成績，加上全體登記考生的總分分布，換算排名後算出每個校系的錄取機率。";
  $("nDept").textContent=(A?AU.length:U.length).toLocaleString()+" 個校系";
  compute();const has=any();$("report").hidden=!has;
  const pool=J.filter(r=>inGrp(r.d));
  if(has){const c=k=>pool.filter(r=>r.j&&r.j.cat===k).length;
    if(A){const lvs=K.map(k=>lv(st.gc,k));
      $("kpis").innerHTML=`<div class="kpi"><div class="k">你的級分</div><div class="v" style="font-size:18px">${K.map((k,i)=>KS[k]+" "+(lvs[i]??"—")).join("・")}</div><div class="s">依 115 年級距表換算</div></div>
       <div class="kpi"><div class="k">一階穩過＋可過</div><div class="v">${c("safe")+c("good")} 系</div><div class="s">機率 50% 以上</div></div>
       <div class="kpi"><div class="k">可衝</div><div class="v">${c("reach")} 系</div><div class="s">機率 20～50%</div></div>
       <div class="kpi"><div class="k">去年未超額</div><div class="v">${c("unf")} 系</div><div class="s">有報名就進二階</div></div>`;
      const miss=K.filter(k=>st.sc[k]==null).map(k=>KN[k]);
      $("kpinote").innerHTML=(miss.length?`<b style="color:var(--reach)">你還有 ${miss.join("、")} 沒填</b>，有篩選這些科目的系會顯示「缺考科目」。116 自主選考如果你本來就不考，可以不填。<br>`:"")+`群（類）別：${esc(GNAME[st.gc])}。116 採計科目改變、而且多了新科目的 ${c("chg")} 個系，舊門檻不能比，只列歷年資料；只拿掉科目的系標「估計」。`}
    else if(!letter(st.gc)){$("kpis").innerHTML='<div class="kpi" style="grid-column:1/-1"><div class="k">資管類</div><div class="v" style="font-size:18px">登記分發沒有資管類，請改選你報名的群類</div></div>';$("kpinote").textContent=""}
    else{const eq=K.every(k=>st.sc[k]!=null)?topFrac(letter(st.gc),{c:1,e:1,m:1,p1:2,p2:2},K.reduce((a,k)=>a+(k[0]=="p"?2:1)*st.sc[k],0)):null;
      $("kpis").innerHTML=`<div class="kpi"><div class="k">同群登記考生位置</div><div class="v">${eq==null?"—":"前 "+Math.max(1,Math.round(eq*100))+"%"}</div><div class="s">${eq==null?"五科都填才算":"以常見加權 1:1:1:2:2 估計"}</div></div>
       <div class="kpi"><div class="k">穩上＋可上</div><div class="v">${c("safe")+c("good")} 系</div><div class="s">機率 50% 以上</div></div>
       <div class="kpi"><div class="k">可衝</div><div class="v">${c("reach")} 系</div><div class="s">機率 20～50%</div></div>
       <div class="kpi"><div class="k">去年未額滿</div><div class="v">${c("unf")} 系</div><div class="s">登記就有機會</div></div>`;
      const miss=K.filter(k=>st.sc[k]==null).map(k=>KN[k]);
      $("kpinote").innerHTML=(miss.length?`<b style="color:var(--reach)">你還有 ${miss.join("、")} 沒填</b>，有採計這些科目的系會顯示「缺考科目」。<br>`:"")+`群（類）別：${esc(GNAME[st.gc])}。採計科目改變的校系是估計值（倍率暫用 115），116 簡章公布後會更新。`}}
  // 準確度
  const AA=window.AP_ACC||{},UA=window.TC_ACC||{};
  $("acc1").textContent=A?(AA.err+" 級分"):(UA.err+" 分");$("acc2").textContent=A?(AA.in1+"%"):(UA.raw+" 分");
  $("acc1").nextSibling.textContent=A?"平均誤差：用之前年度預測 113～115 年第一關門檻（級分）":"平均誤差（每科分數）：用之前年度預測 113～115 年最低錄取分數";
  $("acc2").nextSibling.textContent=A?"預測門檻和真實門檻差 1 級分以內的比例":"只看去年最低分的誤差";
  const cal=A?ACAL:CAL;$("acc3").textContent=Math.round(cal[9]*100)+"%";
  $("calT").innerHTML="<tr><th>我們算出的機率</th>"+cal.map((_,i)=>`<th>${i*10}～${i*10+10}%</th>`).join("")+"</tr><tr><td>校準後實際"+(A?"通過":"錄取")+"</td>"+cal.map(c=>`<td>${Math.round(c*100)}%</td>`).join("")+"</tr>";
  $("howA").textContent=A?"甄選算法：統測分數依 115 年級距表換成級分；每個系的每一關門檻取最近 2 個「篩選倍率完全相同」年度的平均；用回測誤差（依這一關採計幾科分組）算每關通過機率再相乘，最後輪流留一年校準。116 採計科目改變的系不給機率。":"";
  renderPicks();renderWish();renderList()}
// 推薦志願：甄選 2 衝・2 穩・2 保（最多報 6 個、避開同一天甄試）；登記分發 6 衝・8 穩・6 保。每段依學校等級、不同學校優先
let PICKS=[];
function renderPicks(){const A=st.mode==="a",has=any();$("pickPanel").hidden=!has;if(!has)return;
  const pool=J.filter(r=>inGrp(r.d)&&r.j&&r.j.p!=null);
  const hard=r=>A?(r.d.pred&&r.d.pred.length?-r.d.pred[0][1]/nsub(r.d.pred[0][0]):0):(r.d.p==null?9:r.d.p);
  const bands=A?[["衝","var(--reach)","機率 20～50%",.2,.5,2],["穩","var(--good)","機率 50～75%",.5,.75,2],["保","var(--safe)","機率 75% 以上",.75,1.01,2]]
               :[["衝","var(--reach)","機率 20～50%",.2,.5,6],["穩","var(--good)","機率 50～75%",.5,.75,8],["保","var(--safe)","機率 75% 以上",.75,1.01,6]];
  const used=new Set(),days=new Set();PICKS=[];
  const out=bands.map(([t,c,lab,lo,hi,n])=>{const cand=pool.filter(r=>r.j.p>=lo&&r.j.p<hi).sort((a,b)=>tierOf(a.d)-tierOf(b.d)||hard(a)-hard(b));const got=[];
    for(const pass of [0,1])for(const r of cand){if(got.length>=n)break;if(got.includes(r))continue;const day=A&&r.d.r2&&r.d.r2.ed;
      if(pass===0&&(used.has(r.d.s)||(day&&days.has(day))))continue;got.push(r);used.add(r.d.s);if(day)days.add(day)}
    PICKS.push(...got.map(r=>r.i));return[t,c,lab,got]});window.__TC_PICKS=PICKS;
  const bs=$("pickBS");if(bs){const W=st.wishA.filter(i=>AU[i]),use=A&&(W.length||PICKS.length);bs.hidden=!use;
    if(use){const L=(W.length?W:PICKS.slice(0,6)).map(i=>{const d=AU[i],jj=J[i]&&J[i].j;return"T"+d.code+"."+d.g+(jj&&jj.p!=null?"-"+Math.round(jj.p*100):"")}).join(",");
      bs.innerHTML=`<b style="color:var(--navy)">📝 下一步：準備二階備審</b><div class="note" style="margin:4px 0 8px">把${W.length?"你的 "+W.length+" 個甄選志願":"上面推薦的 "+Math.min(6,PICKS.length)+" 個系"}帶到備審小幫手，每個系的二階比例、要上傳的學習歷程、件數上限和甄試日期會自動帶進去。</div><a class="btn navy" href="${BEISHEN}#import=${L}" target="${BT}">帶到備審小幫手開始準備 →</a>`}}
  $("pickTitle").innerHTML=A?'推薦 6 個甄選志願 <small style="color:var(--mute);font-weight:normal;font-size:13px">2 衝・2 穩・2 保，不同學校、避開同一天甄試</small>':'推薦登記分發志願 <small style="color:var(--mute);font-weight:normal;font-size:13px">6 衝・8 穩・6 保，依學校等級</small>';
  $("picks").innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">${out.map(([t,c,lab,got])=>`<div style="border:1px solid var(--line);border-radius:12px;padding:10px"><div style="font-weight:bold"><span style="display:inline-block;background:${c};color:#fff;border-radius:6px;padding:0 8px;margin-right:6px">${t}</span>${lab}</div>
    ${got.length?got.map(r=>`<div style="margin-top:8px"><div style="font-weight:bold;color:var(--navy);font-size:14px">${esc(r.d.s)} ${esc(r.d.n)}</div><div class="note">${TIERS[tierOf(r.d)][0]}${A&&r.d.r2&&r.d.r2.ed?"・115 甄試 "+esc(r.d.r2.ed.replace(/\s*\(.\)/,"")):""}${r.j.est?"・估計":""}</div>${probBar(r.j)}</div>`).join(""):'<div class="note" style="margin-top:6px">這段沒有符合的系，可以調整成績或看「找校系」。</div>'}</div>`).join("")}</div>`}
function renderList(){
  const kw=$("kw").value.trim().replace(/臺/g,"台"),t=$("ftier").value,pb=$("fpub").value,ar=$("farea").value,has=any(),A=st.mode==="a";
  let rows=J.filter(r=>(!st.gc||inGrp(r.d))&&(!kw||(r.d.s+r.d.n).replace(/臺/g,"台").includes(kw))&&(t===""||tierOf(r.d)==t)&&(!pb||r.d.pub===pb||(!r.d.pub&&(pb==="公立")===/國立|市立/.test(r.d.s)))&&(!ar||r.d.area===ar));
  const cnt={};rows.forEach(r=>{if(r.j)cnt[r.j.cat]=(cnt[r.j.cat]||0)+1});const okN=(cnt.safe||0)+(cnt.good||0)+(cnt.reach||0);
  $("cchips").innerHTML=has?[["ok","有機會",okN],["all","全部",rows.length],...Object.keys(CAT).map(k=>[k,catName(st.mode,k),cnt[k]||0])].filter(([k,,c])=>k==="ok"||k==="all"||c).map(([k,tx,c])=>`<button class="chip ${st.cat===k?"on":""}" data-c="${k}">${tx}<b>${c}</b></button>`).join(""):"";
  if(has&&st.cat==="ok")rows=rows.filter(r=>r.j&&["safe","good","reach"].includes(r.j.cat));else if(has&&st.cat!=="all")rows=rows.filter(r=>r.j&&r.j.cat===st.cat);
  const S=[["prob","機率高→低"],["probAsc","機率低→高"],["rank","學校等級"],["hard",A?"門檻（難→易）":"錄取排名（難→易）"]];
  $("sortbar").innerHTML='<span style="font-weight:bold;font-size:14px">排序</span>'+S.map(([k,t])=>`<button class="chip ${st.sort===k?"on":""}" data-s="${k}">${t}</button>`).join("");
  const pv=r=>r.j&&r.j.p!=null?r.j.p:null, hd=r=>A?(r.d.pred&&r.d.pred.length?-r.d.pred[0][1]/nsub(r.d.pred[0][0]):99):(r.d.p==null?9:r.d.p);
  rows.sort(st.sort==="prob"&&has?(a,b)=>(pv(b)??-1)-(pv(a)??-1)||tierOf(a.d)-tierOf(b.d):st.sort==="probAsc"&&has?(a,b)=>(pv(a)??9)-(pv(b)??9)||tierOf(a.d)-tierOf(b.d):st.sort==="hard"?(a,b)=>hd(a)-hd(b):(a,b)=>tierOf(a.d)-tierOf(b.d)||hd(a)-hd(b));
  const card=A?cardA:cardU;
  $("list").innerHTML=st.gc?rows.slice(0,st.shown).map(r=>card(r.d,r.j,r.i)).join("")||'<div class="empty">沒有符合的校系。</div>':'<div class="empty">先在上面選群（類）別。</div>';
  $("more").hidden=!st.gc||rows.length<=st.shown;$("more").textContent=`顯示更多（還有 ${Math.max(0,rows.length-st.shown)} 個）`}
function renderWish(){
  const A=st.mode==="a",D=DATA(),W=wishArr().filter(i=>D[i]);if(A)st.wishA=W;else st.wish=W;
  $("wishList").innerHTML=W.length?W.map((i,n)=>{const d=D[i],j=J[i]&&J[i].j;return`<div class="wi"><span class="no">${n+1}</span><div><b>${esc(d.s)} ${esc(d.n)}</b> <span class="note">${esc(d.gn)}${inGrp(d)?"":"（和目前選的群類不同）"}</span>${j&&j.p!=null?probBar(j):j?`<div class="note">${catName(st.mode,j.cat)}</div>`:""}</div><div class="x no-print"><button data-u="${n}">↑</button><button data-d="${n}">↓</button><button data-x="${n}">✕</button></div></div>`}).join(""):`<div class="empty">還沒有${A?"甄選":"登記分發"}志願。在「找校系」按「＋志願」。${A?"甄選入學最多可以報名 6 個校系。":""}</div>`;
  if(A&&W.length>6)$("wishList").innerHTML+='<div class="warnbox">甄選入學最多只能報名 6 個校系，請刪到 6 個。</div>';
  $("wishSub").textContent=A?"甄選入學最多報名 6 個校系；依想讀的順序排":"登記分發可以填很多志願；依想讀的順序排";
  if(A){const codes=tcCodes(),url=BEISHEN+(codes?"#import="+codes:"#targets");
    $("wishList").innerHTML+=`<div class="no-print" style="margin-top:12px;padding:12px 14px;border:1.5px dashed var(--gold);border-radius:12px;background:var(--gold3)"><b style="color:var(--navy)">📝 下一步：準備二階備審資料</b>
    <div class="note" style="margin:4px 0 8px">把甄選志願帶到「備審小幫手」，每個系的二階計分比例、要上傳哪些學習歷程（A 修課紀錄、B 課程學習成果、C 多元表現、D 自述）、件數上限和甄試說明會自動帶進去，還會整理哪些資料幾個系可以共用。</div>
    ${codes?`<a class="btn navy" href="${url}" target="${BT}" rel="noopener">帶到備審小幫手開始準備 →</a> <button class="btn ghost" id="copyCodes">複製志願代碼</button>
    <div class="note" style="margin-top:8px">如果打開後沒有自動帶入：在備審小幫手的「目標校系」按「從落點分析匯入」，貼上這串代碼（點一下就會全選）：</div>
    <input id="codeBox" readonly value="${codes}" style="margin-top:4px;font-family:monospace;font-size:13px" onclick="this.select()">`
    :`<div class="note">先在下面「找校系」按「＋志願」把系加進來，這裡就會出現帶入按鈕。也可以直接 <a href="${BEISHEN}" target="${BT}" rel="noopener">打開備審小幫手</a>。</div>`}</div>`}
  else $("wishList").innerHTML+=`<p class="note" style="margin-top:10px">登記分發只看統測加權總分，不用交備審資料。要準備甄選入學的備審，請切到「甄選入學」分頁。</p>`}
// ---- 串接備審小幫手 ----
// 私人預覽：備審小幫手和本頁放在同一個預覽（portfolio/ 子頁），同一個框架內跳轉，志願代碼一定帶得過去
const IN_ART=location.port!=="8772"&&!/github\.io$/.test(location.hostname);
const BEISHEN=location.port==="8772"?"http://localhost:8771/":/github\.io$/.test(location.hostname)?"../portfolio/":"portfolio/index.html?b=tc";
const BT=IN_ART?"_self":"_blank";
const tcCodes=()=>st.wishA.filter(i=>AU[i]).map(i=>{const d=AU[i],j=J[i]&&J[i].j;return "T"+d.code+"."+d.g+(j&&j.p!=null?"-"+Math.round(j.p*100):"")}).join(",");
// 事件
$("grp").onchange=e=>{st.gc=e.target.value;save();render()};
K.forEach(k=>$("s_"+k).addEventListener("input",e=>{const v=e.target.value.trim();st.sc[k]=v===""?null:Math.min(100,Math.max(0,+v));save();clearTimeout(window._t);window._t=setTimeout(render,250)}));
["kw","ftier","fpub","farea"].forEach(id=>$(id).addEventListener("input",()=>{st.shown=40;renderList()}));
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const W=wishArr();
  if(b.dataset.mode){st.mode=b.dataset.mode;st.cat="ok";st.shown=40;save();render()}
  else if(b.dataset.c){st.cat=b.dataset.c;st.shown=40;renderList()}
  else if(b.dataset.s){st.sort=b.dataset.s;save();renderList()}
  else if(b.dataset.w!=null){const i=+b.dataset.w,add=!W.includes(i),nw=add?[...W,i]:W.filter(x=>x!==i);if(st.mode==="a")st.wishA=nw;else st.wish=nw;save();renderWish();renderList();
    toast(add?`已加入${st.mode==="a"?"甄選":"登記分發"}志願（第 ${nw.length} 個）${st.mode==="a"&&nw.length>6?"，甄選最多報 6 個":""}`:"已從志願移除")}
  else if(b.dataset.u!=null){const n=+b.dataset.u;if(n>0){[W[n-1],W[n]]=[W[n],W[n-1]];save();renderWish()}}
  else if(b.dataset.d!=null){const n=+b.dataset.d;if(n<W.length-1){[W[n+1],W[n]]=[W[n],W[n+1]];save();renderWish()}}
  else if(b.dataset.x!=null){W.splice(+b.dataset.x,1);save();renderWish();renderList()}
  else if(b.id==="more"){st.shown+=40;renderList()}
  else if(b.id==="usePicks"){if(!PICKS.length){toast("目前沒有可推薦的系");return}if(st.mode==="a")st.wishA=PICKS.slice(0,6);else st.wish=PICKS.slice();save();renderWish();renderList();$("wish").scrollIntoView({behavior:"smooth"});toast(`已放進${st.mode==="a"?"甄選":"登記分發"}志願（${PICKS.length} 個）`)}
  else if(b.id==="shareParent"){const q=[st.mode,st.gc,...K.map(k=>st.sc[k]==null?"":st.sc[k])].join(",");const u=location.href.split("#")[0]+"#s="+q;$("shareLink").value=u;$("shareBox").hidden=false;
    const box=$("shareLink");box.focus();box.select();let ok=false;try{ok=document.execCommand("copy")}catch(e){}toast(ok?"連結已複製，貼給家長就能看到同一份結果":"連結已選取，請按 Ctrl+C（手機長按）複製")}
  else if(b.id==="copyCodes"){const box=$("codeBox");if(!box)return;box.focus();box.select();let ok=false;try{ok=document.execCommand("copy")}catch(e){}
    const done=()=>toast("已複製！到備審小幫手「目標校系」按「從落點分析匯入」貼上"),fail=()=>toast("代碼已選取，請按 Ctrl+C（手機長按）複製");
    if(ok)done();else if(navigator.clipboard)navigator.clipboard.writeText(box.value).then(done,fail);else fail()}
  else if(b.id==="share"||b.id==="share2"){const t="統測落點分析：輸入統測成績，看四技二專甄選入學一階通過機率和登記分發錄取機率，免費👇",u=location.href.split("#")[0];
    if(navigator.share)navigator.share({title:"統測落點分析",text:t,url:u}).catch(()=>{});else navigator.clipboard&&navigator.clipboard.writeText(t+"\n"+u).then(()=>toast("已複製連結"),()=>toast("請複製網址列的網址分享"))}});
// 打開家長分享連結：#s=模式,群類,國,英,數,專一,專二
// 從官網／學習中心直接指定分頁：#a 甄選入學、#u 聯合登記分發
(function(){const h=location.hash;if(h==="#a"||h==="#u")st.mode=h.slice(1)})();
(function(){const m=location.hash.match(/^#s=([au]),(\d{2}),([\d.,]*)$/);if(!m)return;const v=m[3].split(",");st.mode=m[1];st.gc=m[2];K.forEach((k,i)=>st.sc[k]=v[i]===""||v[i]==null?null:Math.min(100,Math.max(0,+v[i])));
  $("grp").value=st.gc;K.forEach(k=>$("s_"+k).value=st.sc[k]==null?"":st.sc[k]);history.replaceState(null,"",location.pathname+location.search+"#report");save()})();
window.__TC={judgeU,judgeA,topFrac,lv,st,U,AU,R,lg,DATA,inGrp,letter,catOf,wishArr,GNAME,J:()=>J,render,tcCodes,BEISHEN,toast,TIERS,tierOf,stepName,catName,CAT,KN,save,renderWish,renderList};
render();
})();
