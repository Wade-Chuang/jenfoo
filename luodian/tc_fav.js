// 統測：♥ 收藏比較（甄選、登記各自一份），校系並排；自動標最好的、甄試撞期
(function(){
const T=window.__TC,$=id=>document.getElementById(id);if(!T)return;
const st=T.st,AU=T.AU,U=T.U,K=["c","e","m","p1","p2"];
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const favs=()=>st.mode==="a"?st.favA:st.favU, D=()=>st.mode==="a"?AU:U;
const pct=p=>Math.round(p*100)+"%";
const day=s=>(s||"").replace(/\s*\(.\)/,"").replace(/^115年/,"");
const UPN={"A":"修課紀錄","B-1":"專題實作／實習成果","B-2":"其他課程成果","C":"多元表現"};
const any=()=>K.some(k=>st.sc[k]!=null);
function cell(j){if(!any()||!j)return'<span class="note">先輸入成績</span>';if(j.p==null)return`<b style="color:${T.CAT[j.cat][1]}">${T.catName(st.mode,j.cat)}</b>`;
  return`<b style="color:${T.CAT[j.cat][1]};font-size:17px">${pct(j.p)}</b><br><span class="note">${T.catName(st.mode,j.cat)}${j.est?"・估計":""}</span>`}
function render(){
  const box=$("favBox");if(!box)return;const A=st.mode==="a",data=D(),F=favs().filter(i=>data[i]);
  $("favSub").textContent=A?"甄選入學：按校系右上角 ♥ 收藏，並排比較一階機率、二階比例、甄試日期":"登記分發：按校系右上角 ♥ 收藏，並排比較機率、採計科目、去年最低分";
  if(!F.length){box.innerHTML='<p class="note">還沒有收藏。到「找校系」按校系右上角的 ♥，就會出現在這裡並排比較。</p>';return}
  const J=F.map(i=>({i,d:data[i],j:any()?(A?T.judgeA(data[i]):T.judgeU(data[i])):null}));
  const best=J.filter(x=>x.j&&x.j.p!=null).reduce((a,x)=>!a||x.j.p>a.j.p?x:a,null);
  const W=A?st.wishA:st.wish;
  const rows=[];
  const row=(name,f)=>rows.push(`<tr><th>${name}</th>${J.map(x=>`<td>${f(x)}</td>`).join("")}</tr>`);
  row("校系",x=>`<b>${esc(x.d.s)}</b><br>${esc(x.d.n)}<br><span class="note">${T.TIERS[T.tierOf(x.d)][0]}・${esc(x.d.area||"")}</span>`);
  row(A?"一階通過機率":"錄取機率",x=>cell(x.j)+(best&&x===best&&J.length>1?'<br><span class="best">★ 機率最高</span>':""));
  if(A){
    row("116 選採",x=>x.d.s116?x.d.s116.map(k=>T.KN[k]).join("、"):'<span class="note">116 查不到</span>');
    row("預測門檻",x=>{const P=x.j&&x.j.est?x.d.predSub:x.d.pred;if(!P||!P.length)return x.d.st==="unf"?"115 未超額":"—";
      return P.map(([s,t],k)=>`${T.stepName(s)} ≧ ${Math.round(t*10)/10}${x.j&&x.j.sums?`<b style="color:${x.j.sums[k]>=Math.round(t)?"var(--safe)":"var(--no)"}">（你 ${x.j.sums[k]}）</b>`:""}`).join("<br>")});
    row("115 名額／甄試",x=>`${x.d.q} 名・甄試 ${x.d.ne} 人<br><span class="note">二階約 ${x.d.q?Math.round(x.d.ne/x.d.q*10)/10:"—"} 取 1</span>`);
    row("二階計分",x=>x.d.r2?`統測 ${x.d.r2.tp}%<br>`+x.d.r2.it.map(([a,b])=>`${esc(a.replace(/\(含技能領域\)/,"").replace(/、實習科目學習成果/,"").replace(/學習歷程備審資料審查/,"備審資料"))} ${b}%`).join("<br>"):"—");
    row("你的統測在二階拿",x=>{if(!x.d.r2||!window.__S2)return"—";const c=window.__S2.calc(x.d,x.d.r2.it.map(()=>75));
      return c.tcPart==null?(c.miss.length?'<span class="note">缺 '+c.miss.map(k=>T.KN[k]).join("、")+"</span>":"—"):`<b>${Math.round(c.tcPart*10)/10}</b> / ${x.d.r2.tp}<br><span class="note">其他項都拿 75 → 總成績 ${Math.round(c.total*10)/10}</span>`});
    const days={};J.forEach(x=>{const e=x.d.r2&&x.d.r2.ed&&day(x.d.r2.ed);if(e)(days[e]=days[e]||[]).push(x.i)});
    row("115 甄試日期",x=>{const e=x.d.r2&&x.d.r2.ed&&day(x.d.r2.ed);if(!x.d.r2)return"—";if(!e)return"不用到校";return days[e].length>1?`<b style="color:var(--no)">${esc(e)}</b><br><span class="warnc">⚠ 撞期</span>`:esc(e)});
    row("備審截止／放榜",x=>x.d.r2?`${esc(day(x.d.r2.due))}<br><span class="note">放榜 ${esc(day(x.d.r2.res))}</span>`:"—");
    row("甄試費",x=>x.d.r2&&x.d.r2.fee?esc(x.d.r2.fee)+" 元":"—");
    row("備審要上傳",x=>{const a=x.d.r2&&x.d.r2.up;if(!a)return"—";const u={};["A","B-1","B-2","C","D-1","D-2","D-3"].forEach((k,i)=>{if(a[i])u[k]=a[i]});const d=["D-1","D-2","D-3"].filter(k=>u[k]).length;
      return Object.keys(UPN).filter(k=>u[k]).map(k=>UPN[k]+(k==="C"?`（≤${u[k]} 件）`:"")).concat(d?["自述 "+d+" 項"]:[]).join("<br>")});
  }else{
    row("116 採計",x=>x.d.subj?x.d.subj.map(k=>T.KN[k]+"×"+x.d.w[k]).join("、"):'<span class="note">116 查不到</span>');
    row("你的加權總分",x=>x.j&&x.j.total!=null?`<b>${x.j.total}</b><br><span class="note">同群前 ${Math.max(1,Math.round(x.j.f*100))}%</span>`:"—");
    row("近年錄取到",x=>x.d.p!=null?`同群前 ${Math.max(1,Math.round(x.d.p*100))}%`:"—");
    row("115 最低／名額",x=>`${x.d.min==null?"—":x.d.min}${x.d.subj&&x.d.subj.length<5&&x.d.min!=null?'<br><span class="note">115 採計五科，不能和你的總分直接比</span>':""}<br><span class="note">名額 ${x.d.q}${x.d.adm<x.d.q?`・錄取 ${x.d.adm} 未額滿`:""}</span>`);
  }
  row("",x=>`<button class="add ${W.includes(x.i)?"on":""}" data-w="${x.i}">${W.includes(x.i)?"✓ 志願":"＋志願"}</button> <button class="add" data-fx="${x.i}" title="取消收藏">✕</button>`);
  const clash=A&&J.some(x=>{const e=x.d.r2&&x.d.r2.ed&&day(x.d.r2.ed);return e&&J.filter(y=>y.d.r2&&y.d.r2.ed&&day(y.d.r2.ed)===e).length>1});
  box.innerHTML=(clash?'<div class="warnbox" style="margin-bottom:8px">有校系甄試撞期（同一天），二階只能去一間，報名前要先決定。日期是 115 年的，116 簡章公布後更新。</div>':"")+
    `<div style="overflow-x:auto"><table class="cmpT"><tbody>${rows.join("")}</tbody></table></div><p class="note" style="margin-top:6px">最多建議比較 6 個；表格可以左右滑動。</p>`}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  if(b.dataset.f!=null){const i=+b.dataset.f,F=favs(),on=!F.includes(i),nf=on?[...F,i]:F.filter(x=>x!==i);if(st.mode==="a")st.favA=nf;else st.favU=nf;T.save();
    document.querySelectorAll(`button.fav[data-f="${i}"]`).forEach(x=>x.classList.toggle("on",on));T.toast(on?`已收藏（${nf.length} 個），到「收藏比較」並排看`:"已取消收藏")}
  else if(b.dataset.fx!=null){const i=+b.dataset.fx;if(st.mode==="a")st.favA=st.favA.filter(x=>x!==i);else st.favU=st.favU.filter(x=>x!==i);T.save();T.renderList()}
  setTimeout(render,0)});
document.addEventListener("input",e=>{if(/^s_/.test(e.target.id)){clearTimeout(render._t);render._t=setTimeout(render,300)}});
$("grp")&&$("grp").addEventListener("change",()=>setTimeout(render,0));
const css=document.createElement("style");css.textContent=`.fav{border:0;background:none;font-size:20px;cursor:pointer;color:#c4c9d4;padding:0 2px;line-height:1}.fav.on{color:#e0245e}
.cmpT{border-collapse:collapse;font-size:13px;min-width:100%}.cmpT th{background:#f3f5f9;color:var(--navy);text-align:left;white-space:nowrap;padding:7px 8px;position:sticky;left:0;z-index:1;border-bottom:1px solid #e3e7ee}
.cmpT td{padding:7px 8px;border-bottom:1px solid #e3e7ee;vertical-align:top;min-width:140px;line-height:1.55}.best{color:#b8860b;font-weight:bold;font-size:12px}.warnc{color:var(--no);font-size:12px;font-weight:bold}`;document.head.appendChild(css);
render();window.__FAV={render};
})();
