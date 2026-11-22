// 分科分發：照你排的志願序跑一次，看最可能落在第幾個志願
// 分發是「依序比對，第一個分數夠的就錄取」，所以真正重要的不是單一系的機率，
// 是「照這個順序，我會停在哪裡」。這支做的就是這件事。
//
// 怎麼算（和每個系顯示的機率是同一套假設，不是另外一個模型）：
//   每個系的機率來自回測殘差 Q（門檻每年會上下跑多少）。這裡**同一次模擬用同一個殘差**
//   從第一志願往下比，第一個「門檻+殘差 < 你的加權總分」的就錄取。
//   用同一個殘差，是因為同一年的門檻會一起高或一起低（同一屆、同一份考題），
//   當成各系獨立會把「至少上一個」算得太樂觀。
(function(){
const AST=window.__AST,D=window.AST_DATA||[],Q=window.AST_RESQ||[];
if(!AST||!D.length||!Q.length)return;
const A=AST.A,BYC={};D.forEach(d=>BYC[d.c]=d);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const wsum=d=>d.w.reduce((a,[,w])=>a+w,0);

function sim(){
  const items=A.wish.map(c=>BYC[c]).filter(Boolean).map(d=>{const j=AST.judge(d);
    return{d,S:j.S,ok:j.S!=null&&d.pr!=null&&!j.mw&&j.cat!=="fail"&&j.cat!=="art",W:wsum(d)}});
  if(!items.length)return null;
  const usable=items.filter(x=>x.ok).length;
  const hit=new Array(items.length).fill(0);let miss=0;
  for(const r of Q){let got=-1;
    for(let i=0;i<items.length;i++){const x=items[i];
      if(x.ok&&x.d.pr+r*x.W<x.S){got=i;break}}
    if(got<0)miss++;else hit[got]++}
  return{items,usable,hit:hit.map(n=>n/Q.length),miss:miss/Q.length}}

function render(){
  const host=document.getElementById("aorder");if(!host)return;
  const s=sim();
  if(!s||!s.usable){host.innerHTML="";return}
  const best=s.hit.reduce((a,p,i)=>p>s.hit[a]?i:a,0);
  const rows=s.hit.map((p,i)=>{const d=s.items[i].d;
    return{p,i,nm:d.s+" "+d.n,ok:s.items[i].ok}})
    .filter(x=>x.ok&&x.p>=.005)
    .map(x=>`<div class="aorow"><span class="aono">${x.i+1}</span><span class="aonm">${esc(x.nm)}</span>
      <span class="aobar"><i style="width:${Math.round(x.p*100)}%"></i></span><b>${Math.round(x.p*100)}%</b></div>`).join("");
  const got=1-s.miss;
  const skipped=s.items.length-s.usable;
  host.innerHTML=`<div style="margin-top:12px;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px">
    <b style="color:var(--navy)">🎯 照你排的這個順序跑一次</b>
    <div class="note" style="margin:4px 0 8px">分發是依序比對、第一個分數夠的就錄取，所以重點不是單一個系的機率，是「會停在哪一個」。下面是照你現在的順序，最後落在每一個志願的機會。</div>
    <div class="aobig">${s.miss>s.hit[best]
      ?`照這個順序，最可能的結果是<b style="color:#c0392b">一個都沒上（${Math.round(s.miss*100)}%）</b>　後面一定要加保底`
      :`最可能錄取：<b>第 ${best+1} 志願　${esc(s.items[best].d.s)} ${esc(s.items[best].d.n)}</b>（${Math.round(s.hit[best]*100)}%）`}</div>
    <div class="aolist">${rows}
      <div class="aorow miss"><span class="aono">—</span><span class="aonm">一個都沒上</span><span class="aobar"><i style="width:${Math.round(s.miss*100)}%"></i></span><b>${Math.round(s.miss*100)}%</b></div></div>
    <div class="note" style="margin-top:6px">只列出機會 1% 以上的志願（沒有列出來的，表示照這個順序幾乎輪不到）。錄取到其中一個的機會約 <b>${Math.round(got*100)}%</b>。${skipped?`有 ${skipped} 個志願缺採計科目成績或沒有歷年資料，沒有列入模擬。`:""}</div>
    ${s.miss>=.15?`<div class="warn" style="margin-top:6px">⚠ 一個都沒上的機會還有 ${Math.round(s.miss*100)}%，建議在最後面再放幾個「穩上」（機率 75% 以上）的系組保底。分發志願填越多越不吃虧，填到 100 個也不會影響前面的錄取。</div>`:""}
    <div class="note" style="margin-top:6px">用的是跟每個系機率同一套回測殘差，同一次模擬套用同一個殘差（同一年的門檻會一起高或一起低）。每個系卡片上的機率最高只顯示到 85%（回測顯示那一區偏樂觀），這段模擬用的是沒有上限的原始估計，所以「一個都沒上」會比你拿卡片上的數字自己推算再低一點。</div></div>`}

const wl=document.getElementById("aWishCheck");
if(wl&&!document.getElementById("aorder")){const c=document.createElement("div");c.id="aorder";c.className="no-print";wl.after(c);
  new MutationObserver(render).observe(wl.previousElementSibling||wl,{childList:true,subtree:true});
  new MutationObserver(render).observe(wl,{childList:true,subtree:true})}
const css=document.createElement("style");
css.textContent=".aobig{font-size:15px;margin:6px 0 8px;padding:8px 10px;background:var(--gold3,#fdf7e8);border-radius:8px}"
 +".aolist{display:flex;flex-direction:column;gap:3px}"
 +".aorow{display:flex;align-items:center;gap:8px;font-size:13.5px}"
 +".aono{min-width:22px;text-align:center;font-weight:700;color:var(--navy)}"
 +".aonm{flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
 +".aobar{width:110px;height:9px;border-radius:5px;background:#eef1f6;overflow:hidden;flex:none}"
 +".aobar>i{display:block;height:100%;background:var(--navy)}"
 +".aorow.miss .aobar>i{background:#c0392b}.aorow.miss{color:#c0392b}"
 +".aorow>b{min-width:38px;text-align:right}";
document.head.appendChild(css);
render();
window.__AORD={sim};
})();
