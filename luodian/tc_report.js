// 統測落點分析：正式報告書（A4，列印成 PDF）。比照學測版 report_pdf.js。
(function(){
const $=id=>document.getElementById(id), T=window.__TC, QR=window.REPORT_QR||{};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const K=["c","e","m","p1","p2"],KN={c:"國文",e:"英文",m:"數學",p1:"專業(一)",p2:"專業(二)"};
const BRAND="莊老數學教室｜正賦文理";
const st=document.createElement("style");
st.textContent=`#tcRpt{display:none}
@media print{body.fp{background:#fff!important}body.fp>*:not(#tcRpt){display:none!important}body.fp #tcRpt{display:block!important}body.fp *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@page{size:A4;margin:11mm 12mm 13mm}
#tcRpt{font-size:12.5px;color:#1d2433}#tcRpt .pg{break-after:page}#tcRpt .pg:last-child{break-after:auto}
#tcRpt .ph{font-size:10px;color:#8a93a3;display:flex;justify-content:space-between;border-bottom:1px solid #e3e6ec;padding-bottom:3px;margin-bottom:4px}
#tcRpt h2.sec{font-size:16px;color:#0f2747;border-left:5px solid #c9a23a;padding-left:9px;margin:12px 0 7px}
#tcRpt .cover{background:#0f2747;color:#fff;border-radius:14px;padding:20px 22px}#tcRpt .cover .b{color:#f3e3b0;font-size:13px;letter-spacing:.12em}
#tcRpt .cover h1{font-size:26px;margin:6px 0 2px}#tcRpt .cover h1 b{color:#c9a23a}#tcRpt .cover .sub{color:#c9d1de;font-size:13px}
#tcRpt .m3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}#tcRpt .m3 div{background:rgba(255,255,255,.08);border-radius:8px;padding:7px 10px;font-size:12px;color:#c9d1de}#tcRpt .m3 b{display:block;font-size:15px;color:#fff}
#tcRpt .sc{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}#tcRpt .sc div{border:1px solid #f3e3b0;background:#fbf5e3;border-radius:8px;text-align:center;padding:6px 2px;font-size:11.5px;color:#6b7280}#tcRpt .sc b{display:block;font-size:19px;color:#0f2747}#tcRpt .sc small{color:#8a6a12}
#tcRpt .boss{border:2px solid #c0392b;border-radius:12px;padding:9px 13px;margin-top:10px;break-inside:avoid}#tcRpt .boss .t{color:#c0392b;font-size:20px;font-weight:bold}#tcRpt .boss .tag{float:right;background:#c0392b;color:#fff;border-radius:99px;padding:1px 10px;font-size:11px}#tcRpt .boss ol{margin:6px 0 0;padding-left:20px;line-height:1.75}
#tcRpt .howto{background:#f4f5f8;border-radius:10px;padding:8px 12px;font-size:11.5px;line-height:1.7;margin-top:10px}
#tcRpt table.lt{width:100%;border-collapse:collapse;font-size:11.5px}#tcRpt table.lt th{background:#0f2747;color:#fff;font-weight:normal;padding:4px 6px;text-align:left}#tcRpt table.lt td{border-bottom:1px solid #e3e6ec;padding:4px 6px;vertical-align:top}#tcRpt table.lt td.p{text-align:right;font-weight:bold;white-space:nowrap}#tcRpt table.lt tr{break-inside:avoid}#tcRpt small{color:#6b7280}
#tcRpt .adv{list-style:none;margin:0;padding:0;counter-reset:a}#tcRpt .adv li{position:relative;padding:8px 12px 8px 40px;border:1px solid #e3e6ec;border-radius:10px;margin-bottom:7px;line-height:1.7;break-inside:avoid}#tcRpt .adv li::before{counter-increment:a;content:counter(a);position:absolute;left:12px;top:9px;width:20px;height:20px;border-radius:50%;background:#0f2747;color:#fff;text-align:center;line-height:20px;font-size:12px}#tcRpt .adv b.h{display:block;color:#0f2747}
#tcRpt .qrs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}#tcRpt .qrs div{border:1px solid #e3e6ec;border-radius:10px;text-align:center;padding:8px;font-size:12px}#tcRpt .qrs img{width:92px;height:92px;display:block;margin:0 auto 4px}#tcRpt .qrs b{display:block;color:#0f2747}
#tcRpt .note2{font-size:10.5px;color:#6b7280;line-height:1.7}
.tc-name{font-size:14px;padding:7px 10px;border:1.5px solid var(--line);border-radius:8px;width:150px}`;
document.head.appendChild(st);
const today=()=>{const d=new Date();return`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`};
const pct=p=>Math.round(p*100)+"%";
function rows(list){return list.map((r,k)=>`<tr><td style="width:22px;text-align:center;color:#6b7280">${k+1}</td><td><b>${esc(r.d.s)} ${esc(r.d.n)}</b><br><small>${esc(r.extra||"")}</small></td><td class="p">${r.j&&r.j.p!=null?pct(r.j.p)+(r.j.est?"<br><small>估計</small>":""):"<small>"+esc(r.cat||"—")+"</small>"}</td></tr>`).join("")}
function build(){
  const S=T.st,A=S.mode==="a",J=T.J(),D=A?T.AU:T.U,name=($("tcName")||{}).value||"";
  const gname=$("grp").selectedOptions[0]?$("grp").selectedOptions[0].textContent:"";
  const ex=r=>A?[r.d.r2?`二階：統測 ${r.d.r2.tp}%${r.d.r2.it.map(([a,b])=>"＋"+a.replace(/\(含技能領域\)/,"")+" "+b+"%").join("")}`:"",r.d.r2&&r.d.r2.ed?`115 甄試 ${r.d.r2.ed}`:""].filter(Boolean).join("；"):`115 最低 ${r.d.min??"—"}・名額 ${r.d.q}`;
  const CN={unf:A?"去年未超額":"去年未額滿",chg:"116 採計改變",gone:"116 查不到",miss:"缺考科目",nodata:"無歷年資料"};
  const wish=(A?S.wishA:S.wish).filter(i=>D[i]).map(i=>{const j=J[i]&&J[i].j;return{d:D[i],j,extra:ex({d:D[i]}),cat:j&&CN[j.cat]}});
  const pk=(window.__TC_PICKS||[]).map(i=>({d:D[i],j:J[i]&&J[i].j,extra:ex({d:D[i]})}));
  const kp=[...document.querySelectorAll("#kpis .kpi")].map(k=>[k.querySelector(".k").textContent,k.querySelector(".v").textContent]);
  // 數學比例
  // 數學比例：越好的學校越看數學（116 選採科目）
  const TOP=["國立臺灣科技大學","國立臺北科技大學"],MID=TOP.concat(["國立雲林科技大學","國立高雄科技大學","國立虎尾科技大學","國立勤益科技大學","國立臺中科技大學","國立臺北商業大學","國立屏東科技大學"]);
  const subOf=d=>A?d.s116:d.subj,grpOf=d=>A?d.g===S.gc:d.g===String.fromCharCode(64+ +S.gc);
  const share=f=>{const L=D.filter(d=>subOf(d)&&f(d));return L.length?Math.round(100*L.filter(d=>subOf(d).includes("m")).length/L.length):null};
  const mTop=share(d=>TOP.includes(d.s)),mMid=share(d=>MID.includes(d.s)),mAll=share(()=>true),mG=share(grpOf),mGTop=share(d=>grpOf(d)&&MID.includes(d.s));
  const lv=K.map(k=>T.lv(S.gc,k));
  const adv=[];
  if(kp.length)adv.push(`<b class="h">你現在的位置</b>${kp.map(x=>`${esc(x[0])}：<b>${esc(x[1])}</b>`).join("　")}。`);
  adv.push(A?`<b class="h">甄選入學怎麼排</b>最多報 6 個系。建議 2 衝・2 穩・2 保，而且注意二階甄試日期不要撞期；報名前一定要確認每個系 116 的「選採科目」你都有考。`
            :`<b class="h">登記分發怎麼排</b>志願可以填很多，依「真的想讀」的順序排，前面放可衝的、後面一定要有幾個穩上的保底。`);
  adv.push(`<b class="h">接下來最該補的</b>統測前每一分都還能改變結果。想衝國立科大，數學就是門票（國立前段科大 ${mMid}% 的系要看數學），建議把複習時間優先排給數學和專業科目。`);
  if(A)adv.push(`<b class="h">一階過了之後</b>二階看備審和指定項目（面試、實作）。把志願帶到「備審小幫手」，各系要上傳的學習歷程和件數會自動整理好，一題一題陪你寫 D-2 學習歷程自述。`);
  adv.push(`<b class="h">116 簡章公布後</b>倍率、名額和二階規定會更新，機率也會重算。加 LINE 官方帳號 <b>@chuanglaomath</b>，更新時通知你，也可以把這份報告傳給莊老師一起討論。`);
  const qrs=[["line","加 LINE 官方帳號","@chuanglaomath 問莊老師"],A?["portfolio","備審小幫手","二階備審自動整理"]:["luodian","落點分析（線上版）","改成績重新試算"],["learn","免費數學練習","線上練習・真題詳解"]].filter(q=>QR[q[0]]).map(([k,t,s])=>`<div><img src="${QR[k]}" alt="${t}"><b>${t}</b>${s}</div>`).join("");
  const ph=n=>`<div class="ph"><span>${BRAND}・統測落點分析報告書${name?"・"+esc(name):""}</span><span>LINE 官方帳號 @chuanglaomath</span></div>`;
  const R=$("tcRpt")||document.body.appendChild(Object.assign(document.createElement("div"),{id:"tcRpt"}));
  R.innerHTML=`<section class="pg">
    <div class="cover"><div class="b">${BRAND}</div><h1>116 四技二專 <b>統測落點分析</b>報告書</h1><div class="sub">${A?"甄選入學（第一階段篩選）":"聯合登記分發"}・官方資料 111～115 年・公開回測</div>
      <div class="m3"><div>學生<b>${esc(name)||"　"}</b></div><div>產生日期<b>${today()}</b></div><div>群（類）別<b style="font-size:13px">${esc(gname)}</b></div></div></div>
    <h2 class="sec">本次使用的成績</h2><div class="sc">${K.map((k,i)=>`<div>${KN[k]}<b>${S.sc[k]??"—"}</b>${A&&lv[i]!=null?`<small>${lv[i]} 級分</small>`:""}</div>`).join("")}</div>
    <h2 class="sec">重點結果</h2><div class="sc" style="grid-template-columns:repeat(4,1fr)">${kp.map(x=>`<div>${esc(x[0])}<b style="font-size:16px">${esc(x[1])}</b></div>`).join("")}</div>
    <div class="boss"><span class="tag">數學強化・本教室主科</span><div class="t">數學，是目前的大魔王！</div><ol>
      <li><b>越好的學校越看數學</b>：116 年${A?"甄選一階":"登記分發"}，臺科大、北科大有 <b>${mTop}%</b> 的系要看數學，國立前段科大 <b>${mMid}%</b>（全部校系平均只有 ${mAll}%）。</li>
      ${mGTop!=null?`<li>你的群類（${esc(gname.replace(/^\d+/,""))}）在國立前段科大，有 <b>${mGTop}%</b> 的系要看數學。</li>`:""}
      <li>數學分數落差大、專業科目（電學、會計、統計…）也都用得到，數學穩了，總分和專業科目一起往上。</li></ol></div>
    <div class="howto"><b>這份報告怎麼讀：</b>${A?"機率＝通過第一階段篩選、進入二階的機會（用 111～115 年篩選標準、回測誤差與校準計算；第一關門檻平均誤差 1.5 級分）。二階備審、面試不在預測範圍內。":"機率＝以你的加權總分錄取的機會（用 111～115 年最低錄取總分換算成全體登記考生的排名）。"}標「估計」的是 116 採計科目有改變的系，誤差比較大；倍率暫用 115，簡章公布後更新。</div>
  </section>
  <section class="pg">${ph(2)}
    <h2 class="sec">${A?"推薦 6 個甄選志願":"推薦登記分發志願"}</h2>${pk.length?`<table class="lt"><tr><th>#</th><th>校系</th><th style="text-align:right">機率</th></tr>${rows(pk)}</table>`:'<div class="note2">目前沒有可推薦的系。</div>'}
    <h2 class="sec">我的志願</h2>${wish.length?`<table class="lt"><tr><th>#</th><th>校系</th><th style="text-align:right">機率</th></tr>${rows(wish)}</table>`:'<div class="note2">還沒有排志願。可以先用推薦志願一鍵放入，再重新下載這份報告。</div>'}
  </section>
  <section class="pg">${ph(3)}
    <h2 class="sec">莊老師的建議</h2><ol class="adv">${adv.map(a=>`<li>${a}</li>`).join("")}</ol>
    <h2 class="sec">掃 QR code，繼續準備</h2><div class="qrs">${qrs}</div>
    <p class="note2" style="margin-top:10px">資料來源：技專校院招生委員會聯合會 111～115 學年度${A?"甄選入學第一階段統一入學測驗篩選標準、115 學年度甄選入學簡章分則":"聯合登記分發各校系錄取總成績統計表、成績權重組合人數累計表"}、116 學年度統測選採科目查詢系統；技專校院入學測驗中心級距表。由 ${BRAND} 整理計算，僅供參考，不保證錄取；請以官方簡章為準。</p>
  </section>`}
function go(){if(!T.st.gc||!K.some(k=>T.st.sc[k]!=null)){T.toast&&T.toast("先輸入成績");return}build();document.body.classList.add("fp");
  const done=()=>{document.body.classList.remove("fp");removeEventListener("afterprint",done)};addEventListener("afterprint",done);
  setTimeout(()=>{try{window.print()}catch(e){}setTimeout(()=>{if(!matchMedia("print").matches)done()},1500)},60)}
const bar=document.querySelector('#report .top .no-print');
if(bar){bar.style.flexWrap="wrap";const pb=bar.querySelector('[onclick="print()"]');if(pb){pb.textContent="快速列印";pb.classList.remove("navy");pb.classList.add("ghost")}
  const inp=Object.assign(document.createElement("input"),{id:"tcName",className:"tc-name",placeholder:"學生姓名（選填）"});
  const nb=Object.assign(document.createElement("button"),{className:"btn navy",textContent:"📄 下載正式報告書（PDF）"});nb.onclick=go;bar.prepend(inp,nb)}
window.__TCR={build,go};
})();
