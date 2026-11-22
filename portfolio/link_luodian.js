/* 備審小幫手 × 落點分析 串接
 * - 從落點分析帶入志願（網址 #import=代碼-機率,… 或貼上代碼）
 * - 116 官方審查資料（review_116.js，甄選會校系分則整理）：審查項目、必備、字數、二階比例、日期
 * - 多系備審總表、官方字數自動套用、時程自動加入、面試題型依二階方式
 * 依賴主程式的全域：S, save, uid, esc, toast, openDlg, readForm, GROUPS, SECTIONS, draftOf, renderTargets, ivQuestions, go, route
 */
(function(){
// 私人預覽：備審放在學測（?b=hs）或統測（?b=tc）預覽的 portfolio/ 子頁，回落點就回同一個預覽（同框架跳轉，資料帶得過去）
const BUNDLE=(function(){let b=(location.search.match(/[?&]b=(hs|tc)/)||[])[1];try{if(b)sessionStorage.setItem('bs_bundle',b);else b=sessionStorage.getItem('bs_bundle')}catch(e){}return /\/portfolio\//.test(location.pathname)?b:null})();
const LUODIAN=location.port==='8771'?'http://localhost:8765/':/github\.io$/.test(location.hostname)?'../luodian/':BUNDLE==='hs'?'../index.html':'https://claude.ai/artifact/UxtCxaotGL7RKAXmLmasNp';
const RV_SRC='review_116.js?v=791137de';
const TC_SRC='review_tc.js?v=8e7e0424';
const LUODIAN_TC=location.port==='8771'?'http://localhost:8772/tc.html':/github\.io$/.test(location.hostname)?'../luodian/tc.html':BUNDLE==='tc'?'../tc.html':'https://claude.ai/artifact/MzULvEkEPYXiUwpEYGodrb';
const TCG={'01':'工程','02':'工程','03':'工程','04':'資訊','05':'工程','06':'工程','07':'建築與設計','08':'工程','09':'管理','10':'醫藥衛生','11':'生物資源','12':'教育','13':'藝術','14':'生物資源','15':'外語','16':'外語','17':'遊憩與運動','18':'工程','19':'生物資源','20':'大眾傳播','21':'資訊'};
const TCGN={'01':'機械群','02':'動力機械群','03':'電機與電子群電機類','04':'電機與電子群資電類','05':'化工群','06':'土木與建築群','07':'設計群','08':'工程與管理類','09':'商業與管理群','10':'衛生與護理類','11':'食品群','12':'家政群幼保類','13':'家政群生活應用類','14':'農業群','15':'外語群英語類','16':'外語群日語類','17':'餐旅群','18':'海事群','19':'水產群','20':'藝術群影視類','21':'資管類'};
let tcReady=null;
function loadTC(){if(window.TC_RV)return Promise.resolve();if(tcReady)return tcReady;
  tcReady=new Promise((ok,bad)=>{const s=document.createElement('script');s.src=TC_SRC;s.onload=()=>ok();s.onerror=()=>{tcReady=null;bad()};document.head.appendChild(s)});return tcReady}
const tcOf=(c,g)=>(window.TC_RV||[]).find(x=>x.code===c&&x.g===g);
const TCK=['A','B-1','B-2','C','D-1','D-2','D-3'];
function tcStage2(r){return `統測 ${r.tp}%`+r.items.map(([a,b])=>`、${a} ${b}%`).join('')+`；${r.ed?'甄試 '+r.ed:'不用到校'}（115 簡章）`}
function addFromTC(r,prob){const code='T'+r.code+'.'+r.g;if(S.targets.some(t=>t.code===code))return false;
  if(!S.track&&window.__TRACK)window.__TRACK.setTrack('vs',true);   // 第一次帶入統測志願：自動切成高職版
  S.targets.push({id:uid(),school:r.s,dept:r.n,group:(S.track==='vs'&&window.__TRACK?window.__TRACK.VSG[r.g]:TCG[r.g])||GROUPS[0],focus:'',courses:'',stage2:tcStage2(r),code,prob:prob==null?null:prob,from:'統測落點分析',tcg:r.g,tc:{tp:r.tp,items:r.items,upl:r.upl,cs:r.cs,ed:r.ed,due:r.due,res:r.res,fee:r.fee,un:r.un,en:r.en,q:r.q,ne:r.ne}});
  return true}
const SECMAP={reflect:'O',motive:'P',plan:'Q',multi:'N'};
const CATS=['修課紀錄','課程學習成果','多元表現','學習歷程自述'];
let rvReady=null;
function loadRV(){if(window.RV116)return Promise.resolve();if(rvReady)return rvReady;
  rvReady=new Promise((ok,bad)=>{const s=document.createElement('script');s.src=RV_SRC;s.onload=()=>ok();s.onerror=()=>{rvReady=null;bad()};document.head.appendChild(s)});return rvReady}
const rvOf=c=>(window.RV116||[]).find(x=>x.c===c);
const CODES=()=>window.RV_CODES||{};
const roc=s=>{const m=String(s||'').match(/(\d{3})\.(\d{1,2})\.(\d{1,2})/);return m?`${+m[1]+1911}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:null};
const dayISO=md=>{const [m,d]=md.split('/');return `2027-${m.padStart(2,'0')}-${d.padStart(2,'0')}`};
function snap(r){return{it:r.it,ot:r.ot,nt:r.nt,req:r.req,lim:r.lim,ws:r.ws||[],gs:r.gs,s2:r.s2,ed:r.ed,em:r.em,due:r.due,res:r.res,fee:r.fee}}
function stage2Text(r){const it=(r.s2||[]).map(([a,b])=>`${a} ${b}`).join('、');const d=r.ed&&r.ed.length?`甄試 ${r.ed.join(r.em?' 或 ':'～')}`:'不用到校';return `學測 ${r.gs||'—'}${it?'、'+it:''}；${d}；繳件截止 ${r.due||'—'}`}
function addDate(title,date){if(!date||S.dates.some(x=>x.title===title))return;S.dates.push({id:uid(),title,date})}
function addFromRV(r,prob){
  if(S.targets.some(t=>t.code===r.c))return false;
  if(!S.track&&window.__TRACK)window.__TRACK.setTrack('hs',true);   // 第一次帶入學測志願：自動設成高中版
  const g=(r.g||[]).find(x=>GROUPS.includes(x))||GROUPS[0];
  S.targets.push({id:uid(),school:r.s,dept:r.n,group:g,focus:'',courses:'',stage2:stage2Text(r),code:r.c,prob:prob==null?null:prob,from:'落點分析',rv:snap(r)});
  addDate(`${r.s} ${r.n}：繳交審查資料截止`,roc(r.due));
  if(r.ed&&r.ed.length)addDate(`${r.s} ${r.n}：第二階段甄試${r.em?'（日期擇一或分組，看簡章）':''}`,dayISO(r.ed[0]));
  return true}
function parseCodes(str){return String(str||'').split(/[,，\s]+/).map(x=>x.trim()).filter(Boolean).map(x=>{let m=x.match(/^(\d{6})(?:-(\d{1,2}))?$/);if(m)return{c:m[1],p:m[2]!=null?+m[2]/100:null};
  m=x.match(/^[Tt](\d{6})\.(\d{2})(?:-(\d{1,2}))?$/);return m?{tc:true,c:m[1],g:m[2],p:m[3]!=null?+m[3]/100:null}:null}).filter(Boolean)}
function importDialog(list){
  const needRV=list.some(x=>!x.tc),needTC=list.some(x=>x.tc);
  Promise.all([needRV?loadRV():0,needTC?loadTC():0]).then(()=>{
    const rows=list.map(x=>x.tc?{...x,r:tcOf(x.c,x.g),key:'T'+x.c+'.'+x.g}:{...x,r:rvOf(x.c),key:x.c}).filter(x=>x.r);
    if(!rows.length){toast('沒有找到可匯入的校系代碼');return}
    const tc=rows.some(x=>x.tc);
    openDlg('從落點分析帶入志願',`<p class="muted" style="margin-top:8px">${tc?'會自動帶入四技二專甄選入學各系的二階計分比例、學習歷程上傳項目與件數、甄試說明（目前是 115 學年度簡章，116 簡章公布後更新）。':'會自動帶入 116 學年度官方的審查資料項目、二階比例、繳件截止與甄試日期。'}已經在清單裡的校系會略過。</p>
      <div style="margin-top:10px;display:grid;gap:6px">${rows.map((x,i)=>{const has=S.targets.some(t=>t.code===x.key);return `<label class="chk" style="margin:0"><input type="checkbox" data-imp="${i}" ${has?'disabled':'checked'}> ${esc(x.r.s)} ${esc(x.r.n)}${x.tc?`<span class="muted">（${esc(TCGN[x.g]||'')}）</span>`:''}${x.p!=null?`　<span class="muted">${x.tc?'一階機率':'落點機率'} ${Math.round(x.p*100)}%</span>`:''}${has?' <span class="muted">（已在清單）</span>':''}</label>`}).join('')}</div>`,
      d=>{let n=0;d.querySelectorAll('[data-imp]').forEach(cb=>{if(cb.checked){const x=rows[+cb.dataset.imp];if(x.tc?addFromTC(x.r,x.p):addFromRV(x.r,x.p))n++}});save();go('targets');renderTargets();toast(n?(tc?`已帶入 ${n} 個校系的二階備審規定`:`已帶入 ${n} 個校系，並加入繳件與甄試日期`):'沒有新增校系')},'帶入');
  }).catch(()=>toast('官方資料載入失敗，請重新整理再試'))}

// ---------- 草稿：官方字數自動套用 ----------
const _draftOf=draftOf;
draftOf=function(tid,k){const had=!!(S.drafts[tid]&&S.drafts[tid][k]);const d=_draftOf(tid,k);
  if(!had||d.limitAuto===undefined){const t=S.targets.find(x=>x.id===tid),L=t&&t.rv&&t.rv.lim&&t.rv.lim[SECMAP[k]];
    if(L&&(!had||d.limit===SECTIONS[k].limit)){d.limit=L;d.limitAuto=true}else if(d.limitAuto===undefined)d.limitAuto=false}
  return d};

// ---------- 校系卡片：官方審查資料 ----------
function tcBlock(t){const r=t.tc,C=window.TC_RV_CODES||{};
  const up=TCK.filter(k=>r.upl&&r.upl[k]).map(k=>k==='C'?`<div style="margin-top:4px"><b>C 多元表現</b>（最多 ${r.upl.C} 件）：${(r.cs||[]).map(c=>`<span class="pill" style="margin:2px 2px 0 0" title="${esc(C[c]||'')}">${c} ${esc(C[c]||'')}</span>`).join('')||'<span class="muted">看簡章</span>'}</div>`
    :`<div style="margin-top:4px"><span class="pill" style="margin:2px 2px 0 0;${k==='B-1'?'background:var(--brass);color:#fff':''}">${k} ${esc(C[k]||'')}${k==='B-1'?'（至少 1 件・獨立計分）':''}</span> <span class="muted">最多 ${r.upl[k]} 件</span></div>`).join('');
  return `<div class="card" style="margin-top:10px;padding:12px 14px;background:var(--paper,#fbf8f1)">
    <div class="row" style="gap:8px;flex-wrap:wrap"><b>📋 四技二專甄選・二階規定</b>${t.prob!=null?`<span class="pill">一階機率 ${Math.round(t.prob*100)}%</span>`:''}<span class="muted">${esc(TCGN[t.tcg]||'')}・115 學年度簡章（116 公布後更新）</span></div>
    <div class="muted" style="margin-top:4px">二階計分：統測 ${r.tp}%${r.items.map(([a,b])=>`、${esc(a)} ${b}%`).join('')}</div>
    <div class="muted">115 日程：備審上傳截止 ${esc(r.due||'—')}・${r.ed?`甄試 ${esc(r.ed)}`:'不用到校'}・公告總成績 ${esc(r.res||'—')}${r.fee&&r.fee!=='0'?`・甄試費 ${esc(r.fee)} 元`:''}</div>
    ${up||'<div class="muted" style="margin-top:4px">分則沒有列出上傳件數，請看簡章。</div>'}
    ${r.en?`<details style="margin-top:6px" open><summary class="muted" style="cursor:pointer">指定項目甄試說明（審查重點）</summary><p class="muted" style="white-space:pre-wrap;margin-top:6px">${esc(r.en)}</p></details>`:''}
    ${r.un?`<details style="margin-top:6px"><summary class="muted" style="cursor:pointer">學習歷程備審資料上傳說明</summary><p class="muted" style="white-space:pre-wrap;margin-top:6px">${esc(r.un)}</p></details>`:''}
    <p class="muted" style="margin-top:6px;font-size:12.5px">「D-2 學習歷程自述」包含學習歷程反思、就讀動機、未來學習計畫與生涯規劃，可以用「寫作＋健檢」的三段來準備；B-1 專題實作／實習成果是獨立計分，一定要上傳。</p></div>`}
function officialBlock(t){if(t.tc)return tcBlock(t);const r=t.rv;if(!r)return'';const C=CODES();
  const items=CATS.filter(c=>r.it&&r.it[c]).map(c=>`<div style="margin-top:4px"><b>${c}</b>：${r.it[c].map(cd=>`<span class="pill" style="margin:2px 2px 0 0;${(r.req||[]).includes(cd)?'background:var(--brass);color:#fff':''}" title="${esc(C[cd]||'')}">${cd} ${esc(C[cd]||'')}${(r.req||[]).includes(cd)?'（必備）':''}${r.lim&&r.lim[cd]?`・${r.lim[cd]}字`:''}</span>`).join('')}</div>`).join('');
  const s2=(r.s2||[]).map(([a,b])=>`${esc(a)} ${esc(b)}`).join('、');
  return `<div class="card" style="margin-top:10px;padding:12px 14px;background:var(--paper,#fbf8f1)">
    <div class="row" style="gap:8px;flex-wrap:wrap"><b>📋 116 官方審查資料</b>${t.prob!=null?`<span class="pill">落點機率 ${Math.round(t.prob*100)}%</span>`:''}<span class="muted">甄選會校系分則</span></div>
    <div class="muted" style="margin-top:4px">二階計分：學測 ${esc(r.gs||'—')}${s2?'、'+s2:''}</div>
    <div class="muted">繳件截止 ${esc(r.due||'—')}・${r.ed&&r.ed.length?`甄試 ${esc(r.ed.join(r.em?' 或 ':'～'))}${r.em?'（擇一或分組）':''}`:'不用到校'}・榜示 ${esc(r.res||'—')}${r.fee&&r.fee!=='--'?`・甄試費 ${esc(r.fee)} 元`:''}</div>
    ${items||'<div class="muted" style="margin-top:4px">分則沒有列出審查項目，請看簡章。</div>'}
    ${r.ot?`<div style="margin-top:4px"><b>其他</b>：${esc(r.ot)}</div>`:''}
    ${(r.ws||[]).length?`<div class="tip" style="margin-top:8px"><b>✍️ 字數／格式規定（原文）</b>${r.ws.map(w=>`<div>・${esc(w)}</div>`).join('')}</div>`:''}
    ${r.nt?`<details style="margin-top:6px"><summary class="muted" style="cursor:pointer">分則說明原文</summary><p class="muted" style="white-space:pre-wrap;margin-top:6px">${esc(r.nt)}</p></details>`:''}
    <p class="muted" style="margin-top:6px;font-size:12.5px">（必備）只標分則明寫「必備」的項目；其餘請看說明原文與該校系「審查資料準備指引」。代碼：A 修課紀錄、B～E 課程學習成果、F～N 多元表現、O～Q 學習歷程自述。</p></div>`}

// ---------- 多系備審總表 ----------
function matrix(){const ts=S.targets.filter(t=>t.rv);if(ts.length<2)return'';const C=CODES();
  const codes=[...'ABCDEFGHIJKLMNOPQ'].filter(cd=>ts.some(t=>CATS.some(c=>t.rv.it&&t.rv.it[c]&&t.rv.it[c].includes(cd))));
  const has=(t,cd)=>CATS.some(c=>t.rv.it&&t.rv.it[c]&&t.rv.it[c].includes(cd));
  const rows=codes.map(cd=>{const n=ts.filter(t=>has(t,cd)).length;return `<tr><th style="text-align:left;white-space:nowrap">${cd} ${esc(C[cd]||'')}</th>${ts.map(t=>`<td style="text-align:center">${has(t,cd)?((t.rv.req||[]).includes(cd)?'<b>必</b>':'✓'):'<span class="muted">—</span>'}</td>`).join('')}<td style="text-align:center"><b>${n}</b>/${ts.length}</td></tr>`}).join('');
  const all=codes.filter(cd=>ts.every(t=>has(t,cd))),shareable=all.filter(cd=>'ABCDEFGHIJKLM'.includes(cd)),per=codes.filter(cd=>'NOPQ'.includes(cd));
  // 力氣分配：審查資料佔比 × 機率落在可衝～可上
  const w=t=>{const it=(t.rv.s2||[]).find(([a])=>/審查/.test(a));const pct=it?parseFloat(it[1]):0;const p=t.prob;const mid=p==null?.6:(p>=.25&&p<.8?1:p>=.8?.5:.3);return{pct,score:pct*mid}};
  const pri=[...ts].map(t=>({t,...w(t)})).sort((a,b)=>b.score-a.score);
  return `<h3 style="font-size:19px;margin:22px 0 10px">🗂️ ${ts.length} 系備審總表</h3>
   <div class="cmp card" style="padding:0;overflow-x:auto"><table><tr><th></th>${ts.map(t=>`<th style="width:auto;font-size:13px">${esc(t.school)}<br>${esc(t.dept)}</th>`).join('')}<th>幾系要</th></tr>${rows}</table></div>
   <div class="tip info" style="margin-top:10px"><b>💡 怎麼省力</b>
    ${shareable.length?`<div>・<b>${shareable.map(cd=>cd+' '+(C[cd]||'')).join('、')}</b>：${ts.length} 系都要，準備一份、挑最好的就能共用。</div>`:''}
    ${per.length?`<div>・<b>${per.map(cd=>cd+' '+(C[cd]||'')).join('、')}</b>：每系要分開寫，尤其「就讀動機」一定要寫出這個系的特色。</div>`:''}
    <div>・建議花最多時間的順序（審查資料佔比高、而且落點在可衝～可上的優先）：${pri.map((x,i)=>`${i+1}. ${esc(x.t.school)}${esc(x.t.dept)}${x.pct?`（審查 ${x.pct}%）`:''}`).join('　')}</div></div>
   <p class="muted" style="margin-top:6px">「必」＝分則明寫必備；「✓」＝有列出（可能是選備），細節看各校系卡片的說明原文。</p>`}

function tcMatrix(){const ts=S.targets.filter(t=>t.tc);if(ts.length<2)return'';const C=window.TC_RV_CODES||{};
  const keys=['A','B-1','B-2','C-1','C-2','C-3','C-4','C-5','C-6','C-7','C-8','D-1','D-2','D-3'];
  const cell=(t,k)=>k.startsWith('C-')?((t.tc.cs||[]).includes(k)):(t.tc.upl&&t.tc.upl[k]);
  const rows=keys.filter(k=>ts.some(t=>cell(t,k))).map(k=>{const n=ts.filter(t=>cell(t,k)).length;return `<tr><th style="text-align:left;white-space:nowrap">${k} ${esc((C[k]||'').replace(/（.*/,''))}</th>${ts.map(t=>{const v=cell(t,k);return `<td style="text-align:center">${v?(k.startsWith('C-')?'✓':v+' 件'):'<span class="muted">—</span>'}</td>`}).join('')}<td style="text-align:center"><b>${n}</b>/${ts.length}</td></tr>`}).join('');
  const wt=x=>x.pct*(x.p==null?.6:x.p>=.25&&x.p<.8?1:.5);
  const sum=ts.map(t=>{const it=t.tc.items.find(([a])=>/備審|審查/.test(a));return{t,pct:it?it[1]:0,p:t.prob}}).sort((a,b)=>wt(b)-wt(a));
  const allC=['C-1','C-2','C-3','C-4','C-5','C-6','C-7','C-8'].filter(k=>ts.every(t=>(t.tc.cs||[]).includes(k)));
  return `<h3 style="font-size:19px;margin:22px 0 10px">🗂️ 四技二專 ${ts.length} 系備審總表</h3>
   <div class="cmp card" style="padding:0;overflow-x:auto"><table><tr><th></th>${ts.map(t=>`<th style="width:auto;font-size:13px">${esc(t.school)}<br>${esc(t.dept)}</th>`).join('')}<th>幾系要</th></tr>${rows}</table></div>
   <div class="tip info" style="margin-top:10px"><b>💡 怎麼省力</b>
    <div>・<b>A 修課紀錄</b>由學校或學習歷程資料庫提供；<b>B-1 專題實作／實習成果</b>每系都獨立計分，挑最能代表你的一件，${ts.length} 系可以共用。</div>
    ${allC.length?`<div>・多元表現 <b>${allC.map(k=>k+' '+(C[k]||'').replace(/（.*/,'')).join('、')}</b> 每系都採計，優先整理這幾類。</div>`:''}
    <div>・<b>D-2 學習歷程自述</b>的就讀動機要每系分開寫，寫出這個系的特色。</div>
    <div>・建議花最多時間的順序（備審佔比高、而且一階在可衝～可過的優先）：${sum.map((x,i)=>`${i+1}. ${esc(x.t.school)}${esc(x.t.dept)}${x.pct?`（備審 ${x.pct}%）`:''}`).join('　')}</div></div>`}
const _renderTargets=renderTargets;
renderTargets=function(){_renderTargets();
  document.querySelectorAll('#targetList .item').forEach(card=>{const b=card.querySelector('[data-act][data-id]');if(!b)return;const t=S.targets.find(x=>x.id===b.dataset.id);
    if(t&&(t.rv||t.tc)&&!card.querySelector('.rv-block')){const div=document.createElement('div');div.className='rv-block';div.innerHTML=officialBlock(t);card.appendChild(div)}});
  let m=document.getElementById('rvMatrix');if(!m){m=document.createElement('div');m.id='rvMatrix';document.getElementById('cmpWrap').before(m)}m.innerHTML=matrix()+tcMatrix();
};

// ---------- 目標校系頁：匯入按鈕、連回落點 ----------
(function(){const head=document.querySelector('#v-targets .row');if(!head)return;
  const b1=document.createElement('button');b1.className='btn ghost';b1.textContent='從落點分析匯入';b1.style.marginRight='6px';
  b1.onclick=()=>openDlg('從落點分析匯入',`<p class="muted" style="margin-top:8px">在學測或統測落點分析的「我的志願」按「複製志願代碼」，貼到下面。學測是 6 位數校系代碼；統測甄選是 T 開頭（例如 T105062.09）。</p><textarea name="codes" rows="3" placeholder="例如：001572-80,004112-55 或 T105062.09-60"></textarea>`,d=>{const l=parseCodes(readForm(d).codes);if(!l.length){toast('沒有讀到代碼');return}setTimeout(()=>importDialog(l),50)},'下一步');
  head.insertBefore(b1,document.getElementById('addTarget'));
  const p=document.createElement('div');p.className='tip info';p.style.marginTop='10px';
  p.innerHTML=`<b>🎯 還沒決定校系？</b>高中生用 <a href="${LUODIAN}" target="_blank" rel="noopener">學測落點分析</a>、高職生用 <a href="${LUODIAN_TC}" target="_blank" rel="noopener">統測落點分析（甄選入學）</a> 看每個系的一階通過機率、排好志願，再按「帶到備審小幫手」，官方審查項目、二階比例和日期會自動帶進來。`;
  document.querySelector('#v-targets p.muted').after(p)})();

// ---------- 新增校系：從官方清單搜尋 ----------
const addBtn=document.getElementById('addTarget');
addBtn.onclick=()=>{if(S.track==='vs')return addTC();loadRV().catch(()=>{});
  openDlg('新增校系',`<label class="f">從 116 官方校系清單搜尋 <small>選了會自動帶入審查項目、二階比例、日期；找不到也可以自己填下面</small></label>
    <input type="text" id="rvSearch" list="rvList" placeholder="打學校或科系，例如：清華 資工"><datalist id="rvList"></datalist>`+targetForm(),d=>{
    const o=readForm(d);if(!o.school||!o.dept){toast('學校和科系都要填');return}
    const code=d.dataset.code;const r=code&&rvOf(code);
    if(r&&r.s===o.school&&r.n===o.dept){addFromRV(r,null);const t=S.targets.find(x=>x.code===code);Object.assign(t,{group:o.group,focus:o.focus,courses:o.courses,stage2:o.stage2||t.stage2})}
    else S.targets.push({id:uid(),...o});
    save();renderTargets();toast('已新增')});
  const dlg=document.getElementById('dlg');dlg.dataset.code='';
  const inp=document.getElementById('rvSearch'),dl=document.getElementById('rvList');
  inp.addEventListener('input',()=>{const q=inp.value.trim().replace(/臺/g,'台').split(/\s+/).filter(Boolean);
    if(!window.RV116||!q.length){dl.innerHTML='';return}
    const hit=window.RV116.filter(x=>{const s=(x.s+x.n).replace(/臺/g,'台');return q.every(w=>s.includes(w))}).slice(0,30);
    dl.innerHTML=hit.map(x=>`<option value="${esc(x.s)}｜${esc(x.n)}｜${x.c}">`).join('');
    const m=inp.value.match(/(\d{6})$/);if(m){const r=rvOf(m[1]);if(r){dlg.dataset.code=r.c;
      dlg.querySelector('[name=school]').value=r.s;dlg.querySelector('[name=dept]').value=r.n;
      const g=(r.g||[]).find(x=>GROUPS.includes(x));if(g)dlg.querySelector('[name=group]').value=g;
      dlg.querySelector('[name=stage2]').value=stage2Text(r)}}});
};

// 高職版：從四技二專甄選清單搜尋（115 簡章）
function addTC(){loadTC().catch(()=>{});
  openDlg('新增校系',`<label class="f">從四技二專甄選入學校系清單搜尋 <small>選了會自動帶入二階計分、上傳項目與件數（115 簡章）；找不到也可以自己填下面</small></label>
    <input type="text" id="tcSearch" list="tcList" placeholder="打學校或科系，例如：北科 電機"><datalist id="tcList"></datalist>`+targetForm(),d=>{
    const o=readForm(d);if(!o.school||!o.dept){toast('學校和科系都要填');return}
    const k=d.dataset.tc;const r=k&&tcOf(...k.split('.'));
    if(r&&r.s===o.school&&r.n===o.dept){addFromTC(r,null);const t=S.targets.find(x=>x.code==='T'+k);Object.assign(t,{focus:o.focus,courses:o.courses})}
    else S.targets.push({id:uid(),...o});
    save();renderTargets();toast('已新增')});
  const dlg=document.getElementById('dlg');dlg.dataset.tc='';
  const inp=document.getElementById('tcSearch'),dl=document.getElementById('tcList');
  inp.addEventListener('input',()=>{const q=inp.value.trim().replace(/臺/g,'台').split(/\s+/).filter(Boolean);
    if(!window.TC_RV||!q.length){dl.innerHTML='';return}
    const hit=window.TC_RV.filter(x=>{const s=(x.s+x.n+TCGN[x.g]).replace(/臺/g,'台');return q.every(w=>s.includes(w))}).slice(0,30);
    dl.innerHTML=hit.map(x=>`<option value="${esc(x.s)}｜${esc(x.n)}｜${TCGN[x.g]}｜${x.code}.${x.g}">`).join('');
    const m=inp.value.match(/(\d{6})\.(\d{2})$/);if(m){const r=tcOf(m[1],m[2]);if(r){dlg.dataset.tc=m[1]+'.'+m[2];
      dlg.querySelector('[name=school]').value=r.s;dlg.querySelector('[name=dept]').value=r.n;
      const g=window.__TRACK&&window.__TRACK.VSG[r.g];if(g)dlg.querySelector('[name=group]').value=g;
      dlg.querySelector('[name=stage2]').value=tcStage2(r)}}});
}

// ---------- 面試：依二階方式出題型 ----------
const _iv=ivQuestions;
ivQuestions=function(t){const qs=_iv(t);if(t&&t.tc){const its=t.tc.items.map(x=>x[0]).filter(n=>!/專題實作|學習成果|備審/.test(n)).join('、'),add=[];   // 「專題實作、實習科目學習成果」是書審項目，不是實作考試
    if(/面試|口試/.test(its))add.push(['動機',`（這系二階有面試）為什麼選${t.dept}？你的專業科目哪一部分學得最好？`],['背景','請介紹你的專題實作：你負責哪一部分？遇到什麼困難？']);
    if(/實作|術科/.test(its))add.push(['臨場','（這系二階有實作）先查系網公告的實作內容，用學校實習課的器材練習流程與時間。']);
    if(/筆試/.test(its))add.push(['臨場','（這系二階有筆試）查系網或簡章確認範圍，練歷屆題。']);
    add.push(['背景','你考過哪些檢定證照？準備過程中學到什麼？']);
    return add.concat(qs)}
  const r=t&&t.rv;if(!r)return qs;const s2=(r.s2||[]).map(x=>x[0]).join('、');const add=[];
  if(/英文面試|英語面試/.test(s2))add.push(['動機','Please introduce yourself in one minute.'],['動機',`Why do you want to study ${t.dept}?`],['背景','Tell us about a challenge you overcame in high school.']);
  if(/團體/.test(s2))add.push(['臨場','（團體面試）小組 5 分鐘討論：如果要為學校設計一個改善生活的方案，你會提什麼？你在小組裡扮演什麼角色？'],['臨場','（團體面試）別人的意見跟你相反時，你會怎麼回應？']);
  if(/筆試/.test(s2))add.push(['臨場',`（這系二階有筆試）先查歷屆考古題或系網公告，確認範圍與題型。`]);
  if(/口試|面試|面談/.test(s2)&&!add.length)add.push(['動機',`（這系二階：${s2}）你對${t.dept}未來的發展有什麼想像？`]);
  return add.concat(qs)};

// ---------- 網址帶入 ----------
function checkHash(){const m=location.hash.match(/^#import=([\dTt,.\-]+)/);if(!m)return;history.replaceState(null,'',location.pathname+location.search+'#targets');route();importDialog(parseCodes(m[1]))}
checkHash();addEventListener('hashchange',checkHash);
if((location.hash||'').startsWith('#targets'))renderTargets();
window.__BS={loadRV,addFromRV,parseCodes,matrix,officialBlock,rvOf,LUODIAN,loadTC,tcOf,addFromTC,tcMatrix,LUODIAN_TC};   // 測試用
})();
