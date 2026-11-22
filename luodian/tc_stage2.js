// 統測甄選：二階總成績試算＋統測在同群的位置
// 官方沒有公布二階錄取最低總成績，所以這裡不給錄取機率，只做：
//  1) 二階總成績＝統測佔比×加權統測成績＋各項目（拉桿自己估）
//  2) 每科贏過同卷考生幾%（統測中心 115 成績人數累計表）、加權統測在同群登記考生的位置
//  3) 備審／面試多 10 分＝總成績多幾分＝統測要多考幾分
(function(){
const T=window.__TC,B=window.AP_B2,AU=window.AP_U,$=id=>document.getElementById(id);
if(!T||!B||!AU)return;
const K=["c","e","m","p1","p2"],KN={c:"國文",e:"英文",m:"數學",p1:"專業(一)",p2:"專業(二)"};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const r1=x=>Math.round(x*10)/10, r2=x=>Math.round(x*100)/100;
const VAL={},COL=["#f0a020","#3aa776","#c25b8a","#5b7fc2"],dot=c=>`<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${c};margin-right:5px"></span>`;   // 拉桿值：code → [各項目分數]
const short=a=>a.replace(/\(含技能領域\)/,"").replace(/、實習科目學習成果/,"").replace(/學習歷程備審資料審查/,"備審資料").replace(/指定項目甄試/,"");
// 贏過同卷考生的比例：ge[s]＝分數落在 s 這格(含)以上的比例
function beat(g,k,s){const pg=B.G[g];if(!pg||s==null)return null;const ge=B.P[pg[K.indexOf(k)]];const i=Math.min(100,Math.max(0,Math.ceil(s)));
  if(i===0)return 0;const above=ge[i]/1000, inBin=(ge[i]-(i<100?ge[i+1]:0))/1000;return Math.max(0,Math.min(1,1-above+inBin/2))}
function calc(d,vals){
  const tw=d.r2.tw||[0,0,0,0,0],sw=tw.reduce((a,b)=>a+b,0),sc=T.st.sc;
  const need=K.filter((k,i)=>tw[i]>0),miss=need.filter(k=>sc[k]==null);
  const tcAvg=sw&&!miss.length?K.reduce((a,k,i)=>a+tw[i]*(sc[k]||0),0)/sw:null;    // 加權平均（0~100）
  const tcPart=tcAvg==null?null:d.r2.tp*tcAvg/100;
  const others=d.r2.it.map(([n,p],i)=>p*vals[i]/100);
  const total=tcPart==null?null:tcPart+others.reduce((a,b)=>a+b,0);
  return{tw,sw,need,miss,tcAvg,tcPart,others,total}}
function body(d){
  const code=d.code+"."+d.g, vals=VAL[code]||(VAL[code]=d.r2.it.map(()=>75)), c=calc(d,vals), sc=T.st.sc, g=d.g;
  const twTxt=c.need.length?c.need.map(k=>KN[k]+(c.tw[K.indexOf(k)]!==1?"×"+c.tw[K.indexOf(k)]:"")).join("＋"):"（簡章未列）";
  let h=`<div class="note" style="margin:6px 0">官方沒有公布二階錄取最低總成績，這裡<b>不是錄取機率</b>，是讓你看清楚「統測已經拿到幾分、備審面試還要拿幾分」。拉桿調你預估的分數（預設 75）。</div>`;
  // 統測部分
  h+=`<div class="s2row">${dot("var(--navy)")}<b>統測（佔 ${d.r2.tp}%）</b>　採計 ${twTxt}`;
  if(c.miss.length)h+=`<br><b style="color:var(--no)">要先填 ${c.miss.map(k=>KN[k]).join("、")} 才能算</b>（116 自主選考若不考這科，以 116 簡章為準）`;
  else if(c.tcAvg!=null)h+=`<br>加權平均 <b>${r1(c.tcAvg)}</b> 分 → 二階拿 <b style="color:var(--navy)">${r2(c.tcPart)}</b> / ${d.r2.tp} 分`;
  h+=`</div>`;
  // 每科位置
  if(B.G[g]){const cells=c.need.filter(k=>sc[k]!=null).map(k=>{const b=beat(g,k,sc[k]);return`<span class="sb">${KN[k]} ${sc[k]} 分・贏過 ${Math.round(b*100)}%</span>`}).join("");
    let pos="";
    if(c.tcAvg!=null&&+g<=20&&T.topFrac){const w={};K.forEach((k,i)=>{if(c.tw[i])w[k]=c.tw[i]});const f=T.topFrac(String.fromCharCode(64+ +g),w,K.reduce((a,k,i)=>a+c.tw[i]*(sc[k]||0),0));
      pos=`<br>用這個系的二階加權算，你的統測在同群登記考生約<b>前 ${Math.max(1,Math.round(f*100))}%</b>${f<=.2?"，統測是你的優勢，備審面試穩穩拿就好":f<=.5?"，統測中上，備審面試多拉幾分就有機會":"，統測比較吃虧，備審、面試、專題實作要拉高分才補得回來"}。`}
    if(cells)h+=`<div class="s2row"><b>你的統測在同卷考生中</b><div style="margin-top:4px">${cells}</div>${pos}<div class="note">以 115 統測成績分布估計（技專校院入學測驗中心），116 成績公布後更新。</div></div>`}
  // 各項目拉桿
  h+=d.r2.it.map(([n,p],i)=>`<div class="s2row">${dot(COL[i%4])}<b>${esc(short(n))}（佔 ${p}%）</b>　預估 <input type="range" min="0" max="100" step="1" value="${vals[i]}" data-s2v="${i}" style="width:150px;vertical-align:middle"> <b data-s2o="${i}">${vals[i]}</b> 分 → <b data-s2p="${i}">${r2(c.others[i])}</b> / ${p} 分</div>`).join("");
  // 合計
  const tot=c.total==null?"—":r2(c.total);
  const bar=c.total==null?"":`<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin:6px 0;background:#eef1f6">${[[c.tcPart,"var(--navy)"],...c.others.map((v,i)=>[v,COL[i%4]])].map(([v,col])=>`<div style="width:${v}%;background:${col}"></div>`).join("")}</div>`;
  h+=`<div class="s2row" style="font-size:15px"><b>二階總成績 <span data-s2t style="color:var(--navy);font-size:18px">${tot}</span> / 100</b>${bar}</div>`;
  // 多 10 分值多少
  if(c.sw&&d.r2.tp){const ki=c.tw.indexOf(Math.max(...c.tw)),per=d.r2.tp*c.tw[ki]/(100*c.sw);
    const lines=d.r2.it.filter(([n,p])=>p>0).map(([n,p])=>`<li>${esc(short(n))}多 10 分 ＝ 總成績多 <b>${r2(p/10)}</b> 分 ≈ 統測${KN[K[ki]]}多考 <b>${r1(p/10/per)}</b> 分</li>`).join("");
    if(lines)h+=`<div class="s2row"><b>💡 哪裡最值得拚？</b><ul style="margin:4px 0 0 18px;padding:0">${lines}</ul><div class="note">統測已經考完分數不會變，二階能努力的就是這些項目。用「📝 備審小幫手」照這個系的審查重點準備。</div></div>`}
  return h}
function draw(det){const d=AU[+det.dataset.s2];if(!d||!d.r2)return;det.querySelector(".s2b").innerHTML=body(d)}
document.addEventListener("toggle",e=>{const det=e.target;if(det.matches&&det.matches("details.s2")&&det.open)draw(det)},true);
document.addEventListener("input",e=>{const r=e.target;if(!r.dataset||r.dataset.s2v==null)return;const det=r.closest("details.s2"),d=AU[+det.dataset.s2],code=d.code+"."+d.g;
  VAL[code][+r.dataset.s2v]=+r.value;const c=calc(d,VAL[code]),i=r.dataset.s2v;
  det.querySelector(`[data-s2o="${i}"]`).textContent=r.value;det.querySelector(`[data-s2p="${i}"]`).textContent=r2(c.others[i]);
  if(c.total!=null){det.querySelector("[data-s2t]").textContent=r2(c.total);const bars=det.querySelectorAll(".s2row div[style*='display:flex'] > div");if(bars[+i+1])bars[+i+1].style.width=c.others[i]+"%"}});
const css=document.createElement("style");css.textContent=".s2row{margin:6px 0;padding:8px 10px;background:#f7f9fc;border-radius:8px;font-size:13.5px;line-height:1.7}.s2row .sb{margin:2px 4px 2px 0}";document.head.appendChild(css);
window.__S2={calc,beat};
})();
