// 學測申請入學：二階攻防試算（接在一階通過機率後面）
// 為什麼要這支：坊間落點網站都只算「一階會不會過」，過了之後就沒東西了。
// 可是申請入學真正決勝在二階——學測只佔 30~50%，剩下是備審與面試。
// 這裡做三件事（都是官方資料推得出來的，不猜錄取分數）：
//   1) 二階錄取率＝名額 ÷ 預計甄試人數（簡章有）
//   2) 你在「門檻以上的人」裡面大約排前幾%（用大考中心人數累計表換算）
//   3) 學測已經鎖住幾分、備審面試還要拿幾分（拉桿自己估）
// 官方不公布二階錄取最低總成績，所以這裡**不給錄取機率**，只給分數結構。
(function(){
const L=window.__LD,D=window.LD_DATA||[],TOP=window.LD_TOP;
if(!L||!D.length||!TOP)return;
const BY={};D.forEach(d=>BY[d.c]=d);
const SUBJ=["國文","英文","數學A","數學B","社會","自然"],AB=["國","英","數A","數B","社","自"];
const COL=["#f0a020","#3aa776","#c25b8a","#5b7fc2","#7a5f9e"],VAL={};
const r1=x=>Math.round(x*10)/10,r2=x=>Math.round(x*100)/100;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const dot=c=>`<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${c};margin-right:5px"></span>`;
const pc=s=>{const v=parseFloat(String(s==null?"":s).replace(/[^0-9.]/g,""));return isFinite(v)?v:0};
const topOf=(key,v)=>{const t=TOP[key];return t&&v!=null&&v>=0&&v<t.length?t[v]:null};
const fmtP=p=>p==null?"—":(p<1?p.toFixed(1):Math.round(p))+"%";
const short=a=>String(a).replace(/學習歷程備審資料審查|審查資料/,"備審資料").replace(/指定項目甄試/,"");

// 二階的學測採計科目：簡章只公布「學測成績佔 X%」，沒有逐科比例，
// 所以用一階篩選用到的科目當估算基礎（絕大多數系二階採計就是這幾科）。
function subjOf(d){const s=new Set();(d.p||[]).forEach(([a])=>a.forEach(x=>s.add(x)));
  if(!s.size)Object.keys(d.std||{}).forEach(k=>s.add(+k));
  return [...s].sort((a,b)=>a-b)}

function calc(d,vals){
  const gs=pc(d.s2.gs),its=(d.s2.it||[]).map(([n,p])=>[n,pc(p)]);
  const ks=subjOf(d),sc=L.st.sc;
  const miss=ks.filter(i=>sc[i]==null);
  const avg=(!ks.length||miss.length)?null:ks.reduce((a,i)=>a+sc[i],0)/ks.length;
  const gPart=avg==null?null:gs*avg/15;
  const others=its.map(([,p],i)=>p*(vals[i]??75)/100);
  const total=gPart==null?null:gPart+others.reduce((a,b)=>a+b,0);
  return{gs,its,ks,miss,avg,gPart,others,total}}

// 在「門檻以上的人」之中的位置。T＝門檻在全國前 T%、Y＝你在全國前 Y%
function rankInPass(d){
  if(!(d.p||[]).length||!(d.pr||[]).length||d.pr[0][0]==null)return null;
  const a=d.p[0][0],key=a.join(","),sc=L.st.sc;
  if(a.some(i=>sc[i]==null))return null;
  const mine=a.reduce((s,i)=>s+sc[i],0),thr=d.pr[0][0];
  const T=topOf(key,Math.ceil(thr)),Y=topOf(key,mine);
  if(T==null||Y==null||!T)return null;
  return{T,Y,mine,thr,below:mine<thr-.5,z:Math.max(.5,Math.min(100,Y/T*100)),nm:a.map(i=>SUBJ[i]).join("＋")}}

function body(code){
  const d=BY[code];if(!d||!d.s2)return"";
  const vals=VAL[code]||(VAL[code]=(d.s2.it||[]).map(()=>75)),c=calc(d,vals);
  let h=`<div class="note" style="margin:6px 0">官方不公布二階錄取的最低總成績，所以這裡<b>不是錄取機率</b>，是讓你看清楚「學測已經鎖住幾分、備審面試還要拿幾分」。拉桿調你預估的分數（預設 75）。</div>`;

  // 1) 二階錄取率
  const en=d.s2.en,q=d.q;
  if(en&&q)h+=`<div class="s2row"><b>二階錄取率</b>　名額 <b>${q}</b> 人、預計甄試 <b>${en}</b> 人 → 進到二階之後大約 <b style="color:var(--navy)">${Math.round(q/en*100)}%</b> 錄取（${r1(en/q)} 人搶 1 個）${en/q>=4?"，二階競爭很激烈，備審面試一定要認真準備":en/q<=2?"，只要一階過了就很有機會":""}</div>`;

  // 2) 在門檻以上的人裡面的位置
  const rk=rankInPass(d);
  if(rk){
    h+=`<div class="s2row"><b>你在門檻以上的人裡面</b>　`+(rk.below
      ?`你 ${rk.nm} ${rk.mine} 級分，還在預估門檻 ${rk.thr.toFixed(1)} 以下，先把一階過了再看這段。`
      :`這個系的預估門檻大約在全國前 <b>${fmtP(rk.T)}</b>，你在全國前 <b>${fmtP(rk.Y)}</b> → 門檻以上的人裡面你大約排前 <b style="color:var(--navy)">${Math.round(rk.z)}%</b>`
        +(rk.z<=30?"。學測是你的優勢，備審面試穩穩拿就好。":rk.z<=60?"。學測在中間，備審面試多拉幾分就會很有競爭力。":"。學測比較吃虧，備審、面試要拉高分才補得回來。"))
      +`<div class="note">用 ${rk.nm} 的全國成績人數累計表（大考中心）估算；實際一階通過的人還要扣掉沒選填、沒過檢定的，所以這是偏保守的估計。</div></div>`}

  // 3) 分數結構
  const ksTxt=c.ks.map(i=>SUBJ[i]).join("＋")||"（簡章未列）";
  if(!c.gs){
    h+=`<div class="s2row">${dot("var(--navy)")}<b>這個系二階不採計學測（0%）</b><br>一階過了之後，學測級分就完全不算了，成績全部來自下面這些項目——對級分比較低但很會表達、資料做得好的人特別有利。</div>`;
  }else{
  h+=`<div class="s2row">${dot("var(--navy)")}<b>學測（佔 ${c.gs}%）</b>　估算採計 ${ksTxt}`;
  if(c.miss.length)h+=`<br><b style="color:var(--no)">要先填 ${c.miss.map(i=>SUBJ[i]).join("、")} 才能算</b>`;
  else if(c.avg!=null)h+=`<br>平均 <b>${r1(c.avg)}</b> 級分（滿級 15）→ 二階拿 <b style="color:var(--navy)">${r2(c.gPart)}</b> / ${c.gs} 分`;
  h+=`<div class="note">簡章只公布「學測成績佔 ${c.gs}%」，沒有逐科比例，這裡用一階篩選的科目平均換算（級分 ÷ 15）。精確換算方式請看該系簡章的「學測成績採計」欄。</div></div>`;}
  h+=c.its.map(([n,p],i)=>`<div class="s2row">${dot(COL[i%5])}<b>${esc(short(n))}（佔 ${p}%）</b>　預估 <input type="range" min="0" max="100" step="1" value="${vals[i]}" data-s2v="${i}" style="width:150px;vertical-align:middle"> <b data-s2o="${i}">${vals[i]}</b> 分 → <b data-s2p="${i}">${r2(c.others[i])}</b> / ${p} 分</div>`).join("");

  const bar=c.total==null?"":`<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin:6px 0;background:#eef1f6">${[[c.gPart,"var(--navy)"],...c.others.map((v,i)=>[v,COL[i%5]])].map(([v,col])=>`<div style="width:${v}%;background:${col}"></div>`).join("")}</div>`;
  h+=`<div class="s2row" style="font-size:15px"><b>二階總成績 <span data-s2t style="color:var(--navy);font-size:18px">${c.total==null?"—":r2(c.total)}</span> / 100</b>${bar}</div>`;

  // 4) 哪裡最值得拚
  if(c.its.length){
    const per=(c.ks.length&&c.gs)?c.gs/15/c.ks.length:0;    // 一科多 1 級分，二階總成績多幾分
    const lines=c.its.filter(([,p])=>p>0).map(([n,p])=>`<li>${esc(short(n))}多 10 分 ＝ 總成績多 <b>${r2(p/10)}</b> 分${per?` ≈ 學測一科多考 <b>${r1(p/10/per)}</b> 級分`:""}</li>`).join("");
    if(lines)h+=`<div class="s2row"><b>💡 哪裡最值得拚？</b><ul style="margin:4px 0 0 18px;padding:0">${lines}</ul><div class="note">學測考完分數就不會變了，二階能努力的只有這些項目。照這個系佔分最重的項目去準備，用「📝 備審小幫手」查這個系的官方審查重點。</div></div>`}
  return h}

function draw(det){const b=det.querySelector(".s2b");if(b)b.innerHTML=body(det.dataset.s2a)}
document.addEventListener("toggle",e=>{const t=e.target;if(t.matches&&t.matches("details.s2a")&&t.open)draw(t)},true);
document.addEventListener("input",e=>{const r=e.target;if(!r.dataset||r.dataset.s2v==null)return;
  const det=r.closest("details.s2a");if(!det)return;const code=det.dataset.s2a,i=+r.dataset.s2v;
  (VAL[code]=VAL[code]||[])[i]=+r.value;const c=calc(BY[code],VAL[code]);
  det.querySelector(`[data-s2o="${i}"]`).textContent=r.value;
  det.querySelector(`[data-s2p="${i}"]`).textContent=r2(c.others[i]);
  if(c.total!=null){det.querySelector("[data-s2t]").textContent=r2(c.total);
    const bars=det.querySelectorAll("div[style*='display:flex'] > div");if(bars[i+1])bars[i+1].style.width=c.others[i]+"%"}});

const css=document.createElement("style");
css.textContent=".s2row{margin:6px 0;padding:8px 10px;background:#f7f9fc;border-radius:8px;font-size:13.5px;line-height:1.75}"
 +"details.s2a{margin-top:6px}details.s2a>summary{cursor:pointer;font-size:13.5px;font-weight:700;color:var(--navy);padding:4px 0}";
document.head.appendChild(css);
window.__S2A={calc,rankInPass,body};
})();
