// 統測聯合登記分發：照你排的志願序跑一次，看最可能落在第幾個志願
// 和分科版（ast_order.js）同一個想法：分發是依序比對、第一個分數夠的就錄取，
// 所以重點不是單一個系的機率，是「會停在哪一個」。
// 同一次模擬套用同一個殘差 —— 同一年的門檻會一起高或一起低（同一屆、同一份考題），
// 當成各系獨立會把「至少上一個」算得太樂觀。
(function(){
const T=window.__TC;if(!T||!T.R||!T.lg)return;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function sim(){
  const items=(T.st.wish||[]).map(i=>T.U[i]).filter(Boolean).map(d=>{const j=T.judgeU(d);
    return{d,j,ok:j&&j.p!=null&&d.p!=null&&j.f!=null}});
  if(!items.length)return null;
  const usable=items.filter(x=>x.ok).length;
  const hit=new Array(items.length).fill(0);let miss=0;
  for(const r of T.R){let got=-1;
    for(let i=0;i<items.length;i++){const x=items[i];
      if(x.ok&&T.lg(x.d.p)+r>=T.lg(x.j.f)){got=i;break}}
    if(got<0)miss++;else hit[got]++}
  return{items,usable,hit:hit.map(n=>n/T.R.length),miss:miss/T.R.length}}

function render(){
  const host=document.getElementById("tcorder");if(!host)return;
  if(T.st.mode!=="u"){host.innerHTML="";return}
  const s=sim();
  if(!s||!s.usable){host.innerHTML="";return}
  const best=s.hit.reduce((a,p,i)=>p>s.hit[a]?i:a,0);
  const rows=s.hit.map((p,i)=>({p,i,d:s.items[i].d,ok:s.items[i].ok}))
    .filter(x=>x.ok&&x.p>=.005)
    .map(x=>`<div class="aorow"><span class="aono">${x.i+1}</span><span class="aonm">${esc(x.d.s+" "+x.d.n)}</span>
      <span class="aobar"><i style="width:${Math.round(x.p*100)}%"></i></span><b>${Math.round(x.p*100)}%</b></div>`).join("");
  const skipped=s.items.length-s.usable;
  host.innerHTML=`<div style="margin-top:12px;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px">
    <b style="color:var(--navy)">🎯 照你排的這個順序跑一次</b>
    <div class="note" style="margin:4px 0 8px">登記分發是依序比對、第一個分數夠的就錄取。下面是照你現在的順序，最後落在每一個志願的機會。</div>
    <div class="aobig">${s.miss>s.hit[best]
      ?`照這個順序，最可能的結果是<b style="color:#c0392b">一個都沒上（${Math.round(s.miss*100)}%）</b>　後面一定要加保底`
      :`最可能錄取：<b>第 ${best+1} 志願　${esc(s.items[best].d.s)} ${esc(s.items[best].d.n)}</b>（${Math.round(s.hit[best]*100)}%）`}</div>
    <div class="aolist">${rows}
      <div class="aorow miss"><span class="aono">—</span><span class="aonm">一個都沒上</span><span class="aobar"><i style="width:${Math.round(s.miss*100)}%"></i></span><b>${Math.round(s.miss*100)}%</b></div></div>
    <div class="note" style="margin-top:6px">只列出機會 1% 以上的志願。錄取到其中一個的機會約 <b>${Math.round((1-s.miss)*100)}%</b>。${skipped?`有 ${skipped} 個志願缺採計科目成績或沒有歷年資料，沒有列入模擬。`:""}</div>
    ${s.miss>=.15?`<div class="warn" style="margin-top:6px">⚠ 一個都沒上的機會還有 ${Math.round(s.miss*100)}%，建議在最後面再放幾個「穩上」的校系保底。登記分發填越多越不吃虧，後面多填不會影響前面的錄取。</div>`:""}
    <div class="note" style="margin-top:6px">用的是跟每個校系機率同一套回測殘差，同一次模擬套用同一個殘差。116 採計科目改變的校系是用排名推估，誤差比較大。</div></div>`}

const wl=document.getElementById("wishList");
if(wl&&!document.getElementById("tcorder")){const c=document.createElement("div");c.id="tcorder";c.className="no-print";
  const cal=document.getElementById("tccal");(cal||wl).after(c);
  new MutationObserver(render).observe(wl,{childList:true,subtree:true})}
const css=document.createElement("style");
css.textContent=".aobig{font-size:15px;margin:6px 0 8px;padding:8px 10px;background:#fdf7e8;border-radius:8px}"
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
window.__TCORD={sim};
})();
