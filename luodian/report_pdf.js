// 正式報告書（A4 多頁，列印成 PDF）：封面＋數學重點、成績分析、志願、莊老師的建議
// 不改原本的「快速列印」；按「下載正式報告書」才組出 #formalRpt，列印時只印它。
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const QR=window.REPORT_QR||{};
const S60=["國文","英文","數學A","數學B","社會","自然","數學甲","數學乙","物理","化學","生物","歷史","地理","公民與社會"];
const SUBJ=["國文","英文","數學A","數學B","社會","自然"];
const BRAND="莊老數學教室｜正賦文理";

const st=document.createElement("style");
st.textContent=`
#formalRpt{display:none}
.fp-name{font-size:14px;padding:7px 10px;border:1.5px solid var(--line);border-radius:8px;width:150px}
@media print{
 body.fp{background:#fff!important}
 body.fp>*:not(#formalRpt){display:none!important}
 body.fp #formalRpt{display:block!important}
 body.fp *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
@page{size:A4;margin:11mm 12mm 15mm}
#formalRpt{font-size:13px;color:#1d2433}
#formalRpt .pg{break-after:page;position:relative}
#formalRpt .pg:last-child{break-after:auto}
#formalRpt .ph{font-size:10px;color:#8a93a3;display:flex;justify-content:space-between;border-bottom:1px solid #e3e6ec;padding-bottom:3px;margin-bottom:4px}
#formalRpt table.lt{width:100%;border-collapse:collapse;font-size:11.5px}
#formalRpt table.lt th{background:#0f2747;color:#fff;font-weight:normal;padding:4px 6px;text-align:left}
#formalRpt table.lt td{border-bottom:1px solid #e3e6ec;padding:4px 6px;vertical-align:top}
#formalRpt table.lt td.n{text-align:center;color:#6b7280;width:22px}
#formalRpt table.lt td.p{text-align:right;font-weight:bold;white-space:nowrap;width:46px}
#formalRpt table.lt td small{color:#6b7280}
#formalRpt table.lt tr{break-inside:avoid}
#formalRpt h2.sec{font-size:17px;color:#0f2747;border-left:5px solid #c9a23a;padding-left:9px;margin:14px 0 8px}
#formalRpt h2.sec small{font-size:12px;color:#6b7280;font-weight:normal;margin-left:6px}
#formalRpt .box{border:1px solid #e3e6ec;border-radius:10px;padding:10px 12px;break-inside:avoid;margin-bottom:8px}
#formalRpt .cover{background:#0f2747;color:#fff;border-radius:14px;padding:22px 24px 20px}
#formalRpt .cover .b{color:#f3e3b0;font-size:13px;letter-spacing:.12em}
#formalRpt .cover h1{font-size:28px;margin:6px 0 2px;color:#fff}
#formalRpt .cover h1 b{color:#c9a23a}
#formalRpt .cover .sub{color:#c9d1de;font-size:13px}
#formalRpt .meta3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
#formalRpt .meta3 div{background:rgba(255,255,255,.08);border-radius:8px;padding:7px 10px;font-size:12px;color:#c9d1de}
#formalRpt .meta3 b{display:block;font-size:15px;color:#fff;margin-top:2px}
#formalRpt .sc{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:10px}
#formalRpt .sc.w{grid-template-columns:repeat(7,1fr)}
#formalRpt .sc div{border:1px solid #f3e3b0;background:#fbf5e3;border-radius:8px;text-align:center;padding:6px 2px;font-size:11.5px;color:#6b7280}
#formalRpt .sc b{display:block;font-size:19px;color:#0f2747}
#formalRpt .sc .est b{color:#9aa3b2;font-style:italic}
#formalRpt .boss{border:2px solid #c0392b;border-radius:12px;padding:10px 14px;margin-top:10px;break-inside:avoid}
#formalRpt .boss .t{color:#c0392b;font-size:21px;font-weight:bold}
#formalRpt .boss .tag{float:right;background:#c0392b;color:#fff;border-radius:99px;padding:1px 10px;font-size:11px}
#formalRpt .boss ol{margin:6px 0 0;padding-left:20px;line-height:1.75}
#formalRpt .howto{background:#f4f5f8;border-radius:10px;padding:9px 12px;font-size:12px;line-height:1.75;margin-top:10px;break-inside:avoid}
#formalRpt .adv{counter-reset:a;margin:0;padding:0;list-style:none}
#formalRpt .adv li{position:relative;padding:9px 12px 9px 42px;border:1px solid #e3e6ec;border-radius:10px;margin-bottom:8px;line-height:1.7;break-inside:avoid}
#formalRpt .adv li::before{counter-increment:a;content:counter(a);position:absolute;left:12px;top:10px;width:21px;height:21px;border-radius:50%;background:#0f2747;color:#fff;text-align:center;line-height:21px;font-size:12px}
#formalRpt .adv li b.h{color:#0f2747;display:block}
#formalRpt .qrs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:6px}
#formalRpt .qrs div{border:1px solid #e3e6ec;border-radius:10px;text-align:center;padding:8px;font-size:12px;break-inside:avoid}
#formalRpt .qrs img{width:96px;height:96px;display:block;margin:0 auto 4px}
#formalRpt .qrs b{display:block;color:#0f2747;font-size:13px}
#formalRpt .note2{font-size:11px;color:#6b7280;line-height:1.7}
#formalRpt .kpis{grid-template-columns:repeat(4,1fr)!important}
#formalRpt .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#formalRpt .picks{grid-template-columns:repeat(3,1fr)!important}
#formalRpt .wi{grid-template-columns:28px 1fr!important;break-inside:avoid;padding:6px 9px}
#formalRpt .ops,#formalRpt .no-print{display:none!important}
#formalRpt table.t{width:100%}
`;
document.head.appendChild(st);

const cloneHTML=id=>{const e=$(id);if(!e)return"";const c=e.cloneNode(true);c.removeAttribute("id");
  c.querySelectorAll("[id]").forEach(x=>x.removeAttribute("id"));c.querySelectorAll(".no-print,.ops,button").forEach(x=>x.remove());return c.outerHTML};
const txt=sel=>{const e=document.querySelector(sel);return e?e.textContent.trim():""};
const today=()=>{const d=new Date();return`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`};
const isAst=()=>!$("modeAst").hidden;

function mathStats(){
  if(isAst()){const D=(window.__AST&&__AST.D)||[];const n=D.length||1;
    const has=D.filter(d=>d.w&&d.w.some(([s])=>[2,3,6,7].includes(s))).length;
    const top=D.filter(d=>{if(!d.w||!d.w.length)return false;const mx=Math.max(...d.w.map(x=>x[1]));return d.w.some(([s,w])=>[2,3,6,7].includes(s)&&w===mx)}).length;
    return{n:D.length,has,top,pHas:Math.round(has/n*100),pTop:Math.round(top/n*100)}}
  const D=(window.__LD&&__LD.D)||[];const n=D.length||1;
  const first=D.filter(d=>d.p&&d.p[0]&&d.p[0][0].some(x=>x===2||x===3)).length;
  const any=D.filter(d=>d.p&&d.p.some(s=>s[0].some(x=>x===2||x===3))).length;
  return{n:D.length,first,any,pFirst:Math.round(first/n*100),pAny:Math.round(any/n*100)}
}

function scoreGrid(){
  if(isAst()){const A=__AST.A;let h="";
    for(let i=0;i<14;i++){const v=__AST.sc60(i);if(v==null||isNaN(v))continue;const est=i<6&&A.g60[i]==null;
      h+=`<div class="${est?"est":""}">${S60[i]}${i<6?"<br>(學測60)":"<br>(分科)"}<b>${Math.round(v*100)/100}${est?"*":""}</b></div>`}
    const L=window.__LD&&__LD.st;let h15="";if(L)SUBJ.forEach((s,i)=>{if(L.sc[i]!=null)h15+=`<div>${s}<br>(學測15)<b>${L.sc[i]}</b></div>`});
    if(L&&L.lt)h15+=`<div>英聽<b>${L.lt}</b></div>`;
    return`<div class="sc">${h}</div>${h15?`<div class="sc" style="margin-top:6px">${h15}</div>`:""}${h.includes('class="est"')?`<div class="note2" style="margin-top:4px">* 沒有填學測 60 級分，用 15 級分的同百分位估計。</div>`:""}`}
  const L=__LD.st;let h="";SUBJ.forEach((s,i)=>{if(L.sc[i]!=null)h+=`<div>${s}<b>${L.sc[i]}</b></div>`});if(L.lt)h+=`<div>英聽<b>${L.lt}</b></div>`;
  return`<div class="sc">${h}</div>`
}

function filters(){
  const L=window.__LD&&__LD.st;if(!L)return"全部";
  const g=L.g.map(i=>__LD.GN[i]).join("、")||"全部學群",r=L.r.map(i=>__LD.RN[i]).join("、")||"全部地區";
  return`${g}・${r}`
}

function listTable(sel){
  const rows=[...document.querySelectorAll(sel+" .wi")].map((w,i)=>{const b=w.querySelector("b");const tier=b&&b.nextElementSibling&&b.nextElementSibling.classList.contains("note")?b.nextElementSibling.textContent:"";
    const meta=[...w.querySelectorAll("div.note")].map(x=>x.textContent.trim()).filter(Boolean).join("・");const p=w.querySelector(".prob b");
    return`<tr><td class="n">${i+1}</td><td><b>${esc(b?b.textContent:"")}</b> <small>${esc(tier)}</small><br><small>${esc(meta)}</small></td><td class="p">${esc(p?p.textContent:"—")}</td></tr>`}).join("");
  return rows?`<table class="lt"><tr><th>#</th><th>校系・甄試／採計</th><th style="text-align:right">機率</th></tr>${rows}</table>`:""
}

function build(){
  const ast=isAst(),ms=mathStats(),name=((($(ast?"fpNameA":"fpName"))||{}).value||"").trim();
  const kind=ast?"分科分發":"申請入學（第一階段篩選）";
  const kp=[...document.querySelectorAll((ast?"#aKpi":"#kpis")+" .kpi")].map(k=>[k.querySelector(".k")?.textContent,k.querySelector(".v")?.textContent,k.querySelector(".s")?.textContent]);
  const plusTxt=txt(ast?"#aPlus .callout":"#plusBox .callout");
  const wishN=document.querySelectorAll((ast?"#aWishList":"#wishList")+" .wi").length;
  const checks=[...document.querySelectorAll((ast?"#aWishCheck":"#wishCheck")+" .warn, "+(ast?"#aWishCheck":"#wishCheck")+" .ok")].map(e=>e.textContent.trim());
  const sumNote=txt((ast?"#aWishCheck":"#wishCheck")+" .note");
  const ph=n=>`<div class="ph"><span>${BRAND}・大學落點分析報告書${name?"・"+esc(name):""}</span><span>LINE 官方帳號 @chuanglaomath</span></div>`;

  const boss=ast
   ?`<div class="boss"><span class="tag">數學強化・本教室主科</span><div class="t">數學，是目前的大魔王！</div>
     <ol><li>116 分發的 ${ms.n.toLocaleString()} 個系組裡，<b>${ms.pHas}%</b> 採計數學（學測數A/數B 或分科數甲/數乙）。</li>
     <li>其中 <b>${ms.pTop}%</b> 的系組，數學是加權最重（或並列最重）的科目，多一點分數就差很多。</li>
     <li>數學的級分落差最大，同樣努力，數學最能把總分拉開。</li></ol></div>`
   :`<div class="boss"><span class="tag">數學強化・本教室主科</span><div class="t">數學，是目前的大魔王！</div>
     <ol><li>116 申請入學 ${ms.n.toLocaleString()} 個校系裡，<b>${ms.pAny}%</b> 的校系篩選要看數學A或數學B。</li>
     <li><b>${ms.pFirst}%</b> 的校系「第一關」就篩數學，數學不夠，後面的科目再好也進不了二階。</li>
     <li>數學的級分落差最大，多 1 級分能多過的系往往最多，是最划算的一科。</li></ol></div>`;

  const howto=ast
   ?`<b>這份報告怎麼讀：</b>機率＝用你的加權總分錄取該系組的機會（用 111～115 年最低錄取分數，逐科換算成全國排名後估計；最高顯示 85%）。分發是直接錄取，沒有面試。穩上＝75% 以上、可上＝50～75%、可衝＝20～50%。`
   :`<b>這份報告怎麼讀：</b>機率＝通過第一階段篩選、進入二階甄試的機會（用 111～115 年篩選結果換算成全國排名後估計；平均誤差 1.41 級分）。二階書審、面試不在預測範圍內。穩上＝80% 以上、可上＝55～80%、可衝＝25～55%。`;

  // 莊老師的建議（依結果產生）
  const adv=[];
  if(kp.length)adv.push(`<b class="h">你現在的位置</b>${kp.map(x=>`${x[0]}：<b>${esc(x[1])}</b>`).join("　")}。`);
  if(plusTxt)adv.push(`<b class="h">接下來最該補的一科</b>${esc(plusTxt)}${/數學/.test(plusTxt)?"":"不過別忘了，數學是落差最大的一科，穩住數學，其他科的努力才不會被抵銷。"}`);
  if(wishN)adv.push(`<b class="h">志願安排</b>${checks.length?checks.map(esc).join(" "):"目前志願沒有明顯問題。"} ${esc(sumNote)}`);
  else adv.push(`<b class="h">志願安排</b>還沒排「我的志願」。可以先參考第 3 頁的推薦志願，${ast?"由衝到保依序排，最多 100 個":"2 衝・2 穩・2 保，再注意甄試日期不要撞期"}。`);
  adv.push(ast
   ?`<b class="h">分科前的時間怎麼用</b>先確認每個志願的採計科目和加權，把時間放在「加權高、你又還有進步空間」的科目；數甲／數乙通常是加權最重的科目之一，最值得投資。`
   :`<b class="h">學測前的時間怎麼用</b>這份報告是用目前的成績算的，學測前每一級分都還能改變結果。數學每多 1 級分，能多過的校系通常最多，建議把複習時間優先排給數學，再補第 2 頁「最划算」的科目。`);
  if(!ast)adv.push(`<b class="h">一階過了之後</b>二階看書審和面試。把志願帶到「備審小幫手」，116 官方審查項目、字數規定、繳件與甄試日期會自動帶入，一題一題陪你寫備審、練面試。`);
  adv.push(`<b class="h">需要人幫忙看？</b>加 LINE 官方帳號 <b>@chuanglaomath</b>，把這份報告傳給莊老師，可以一起討論志願怎麼排。`);

  const qrs=[["line","加 LINE 官方帳號","@chuanglaomath 問莊老師"],ast?["luodian","落點分析（線上版）","改成績、重新試算"]:["portfolio","備審小幫手","官方審查項目自動帶入"],["learn","免費數學練習","線上練習・真題詳解・影片"]]
    .filter(q=>QR[q[0]]).map(([k,t,s])=>`<div><img src="${QR[k]}" alt="${t} QR code"><b>${t}</b>${s}</div>`).join("");

  const R=$("formalRpt")||document.body.appendChild(Object.assign(document.createElement("div"),{id:"formalRpt"}));
  R.innerHTML=`
  <section class="pg">
    <div class="cover"><div class="b">${BRAND}</div>
      <h1>116 學年度 大學<b>落點分析</b>報告書</h1><div class="sub">${kind}・官方資料 111～115 年・公開回測</div>
      <div class="meta3"><div>學生<b>${esc(name)||"　"}</b></div><div>產生日期<b>${today()}</b></div><div>篩選條件<b style="font-size:12.5px">${esc(ast?"全部系組（依網頁上的篩選）":filters())}</b></div></div>
    </div>
    <h2 class="sec">本次使用的成績</h2>${scoreGrid()}
    <h2 class="sec">重點結果</h2>${cloneHTML(ast?"aKpi":"kpis")}
    ${boss}
    <div class="howto">${howto}</div>
  </section>
  <section class="pg">${ph(2)}
    <h2 class="sec">各科位置</h2>
    <div class="two"><div class="box">${cloneHTML(ast?"aSubj":"subjTbl")}${ast?"":cloneHTML("convNote")}</div>
      <div class="box"><b style="color:#0f2747">${ast?"哪一科多考 3 級分最划算？":"哪一科多 1 級分最划算？"}</b>${cloneHTML(ast?"aPlus":"plusBox")}</div></div>
    <h2 class="sec">你能上的學校等級 <small>穩上／可上／可衝佔該等級的比例</small></h2>
    <div class="box">${cloneHTML(ast?"aTier":"tierchart")}
      <div class="legend"><span><i style="background:var(--safe)"></i>穩上</span><span><i style="background:var(--good)"></i>可上</span><span><i style="background:var(--reach)"></i>可衝</span></div></div>
  </section>
  <section class="pg">${ph(3)}
    <h2 class="sec">${ast?"推薦分發志願序":"推薦 6 志願"} <small>${ast?"6 衝・8 穩・6 保，每段依學校排名":"2 衝・2 穩・2 保，不同學校、甄試不撞期"}</small></h2>
    ${ast?(wishN?`<div class="box note2">推薦志願序（6 衝・8 穩・6 保）請看網頁；下面是你自己排的志願。</div>`:listTable("#aPick")):cloneHTML("picks")}
    <h2 class="sec">我的志願 <small>${wishN?`共 ${wishN} 個`:"還沒有填"}</small></h2>
    ${wishN?listTable(ast?"#aWishList":"#wishList")+cloneHTML(ast?"aWishCheck":"wishCheck"):`<div class="box note2">還沒排「我的志願」。到網頁的${ast?"「找系組」":"「找校系」"}按「＋志願」，或用推薦志願一鍵放入，再重新下載這份報告。</div>`}
  </section>
  <section class="pg">${ph(4)}
    <h2 class="sec">莊老師的建議</h2>
    <ol class="adv">${adv.map(a=>`<li>${a}</li>`).join("")}</ol>
    <h2 class="sec">掃 QR code，繼續準備</h2><div class="qrs">${qrs}</div>
    <p class="note2" style="margin-top:12px">資料來源：${ast?"大學分發入學委員會 111～115 學年度各校系分發最低錄取分數、116 學年度招生簡章；大學入學考試中心各科級分人數累計表":"大學甄選入學委員會 111～115 學年度申請入學篩選結果、116 學年度校系分則；大學入學考試中心各科及 2 至 4 科組合級分人數累計表"}。由 ${BRAND} 整理計算，僅供參考，不保證錄取；填志願前請以官方公告為準。線上版：wade-chuang.github.io/jenfoo/luodian/</p>
  </section>`;
}

function go(){
  const ast=isAst();const L=window.__LD&&__LD.st;
  const hasScore=ast?(__AST.A.a60||[]).some(v=>v!=null):(L&&L.sc.some(v=>v!=null));
  if(!hasScore){alert("先輸入成績，才能產生報告書。");return}
  build();document.body.classList.add("fp");
  const done=()=>{document.body.classList.remove("fp");removeEventListener("afterprint",done)};
  addEventListener("afterprint",done);
  setTimeout(()=>{try{window.print()}catch(e){}setTimeout(()=>{if(!matchMedia("print").matches)done()},1500)},60);
}

// 在兩個「列印」按鈕旁邊加：學生姓名＋下載正式報告書
function addButtons(){
  document.querySelectorAll('button[onclick="window.print()"]').forEach((b,i)=>{
    if(b.dataset.fp)return;b.dataset.fp=1;b.textContent="快速列印";b.classList.remove("navy");b.classList.add("ghost");
    const inp=Object.assign(document.createElement("input"),{className:"fp-name",placeholder:"學生姓名（選填）",id:i?"fpNameA":"fpName"});
    const nb=Object.assign(document.createElement("button"),{className:"btn navy",textContent:"📄 下載正式報告書（PDF）"});
    nb.onclick=go;b.before(inp,nb);
    const p=b.parentElement;p.style.flexWrap="wrap";p.style.alignItems="center";
  });
}
addButtons();new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true});
window.__FP={build,go};
})();
