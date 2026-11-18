/* 備審小幫手 × 落點分析 串接
 * - 從落點分析帶入志願（網址 #import=代碼-機率,… 或貼上代碼）
 * - 116 官方審查資料（review_116.js，甄選會校系分則整理）：審查項目、必備、字數、二階比例、日期
 * - 多系備審總表、官方字數自動套用、時程自動加入、面試題型依二階方式
 * 依賴主程式的全域：S, save, uid, esc, toast, openDlg, readForm, GROUPS, SECTIONS, draftOf, renderTargets, ivQuestions, go, route
 */
(function(){
const LUODIAN=location.port==='8771'?'http://localhost:8765/':/github\.io$/.test(location.hostname)?'../luodian/':'https://claude.ai/artifact/UxtCxaotGL7RKAXmLmasNp';
const RV_SRC='review_116.js?v=1184e705';
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
  const g=(r.g||[]).find(x=>GROUPS.includes(x))||GROUPS[0];
  S.targets.push({id:uid(),school:r.s,dept:r.n,group:g,focus:'',courses:'',stage2:stage2Text(r),code:r.c,prob:prob==null?null:prob,from:'落點分析',rv:snap(r)});
  addDate(`${r.s} ${r.n}：繳交審查資料截止`,roc(r.due));
  if(r.ed&&r.ed.length)addDate(`${r.s} ${r.n}：第二階段甄試${r.em?'（日期擇一或分組，看簡章）':''}`,dayISO(r.ed[0]));
  return true}
function parseCodes(str){return String(str||'').split(/[,，\s]+/).map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^(\d{6})(?:-(\d{1,2}))?$/);return m?{c:m[1],p:m[2]!=null?+m[2]/100:null}:null}).filter(Boolean)}
function importDialog(list){
  loadRV().then(()=>{
    const rows=list.map(x=>({...x,r:rvOf(x.c)})).filter(x=>x.r);
    if(!rows.length){toast('沒有找到可匯入的校系代碼');return}
    openDlg('從落點分析帶入志願',`<p class="muted" style="margin-top:8px">會自動帶入 116 學年度官方的審查資料項目、二階比例、繳件截止與甄試日期。已經在清單裡的校系會略過。</p>
      <div style="margin-top:10px;display:grid;gap:6px">${rows.map((x,i)=>`<label class="chk" style="margin:0"><input type="checkbox" data-imp="${i}" ${S.targets.some(t=>t.code===x.c)?'disabled':'checked'}> ${esc(x.r.s)} ${esc(x.r.n)}${x.p!=null?`　<span class="muted">落點機率 ${Math.round(x.p*100)}%</span>`:''}${S.targets.some(t=>t.code===x.c)?' <span class="muted">（已在清單）</span>':''}</label>`).join('')}</div>`,
      d=>{let n=0;d.querySelectorAll('[data-imp]').forEach(cb=>{if(cb.checked){const x=rows[+cb.dataset.imp];if(addFromRV(x.r,x.p))n++}});save();go('targets');renderTargets();toast(n?`已帶入 ${n} 個校系，並加入繳件與甄試日期`:'沒有新增校系')},'帶入');
  }).catch(()=>toast('官方資料載入失敗，請重新整理再試'))}

// ---------- 草稿：官方字數自動套用 ----------
const _draftOf=draftOf;
draftOf=function(tid,k){const had=!!(S.drafts[tid]&&S.drafts[tid][k]);const d=_draftOf(tid,k);
  if(!had||d.limitAuto===undefined){const t=S.targets.find(x=>x.id===tid),L=t&&t.rv&&t.rv.lim&&t.rv.lim[SECMAP[k]];
    if(L&&(!had||d.limit===SECTIONS[k].limit)){d.limit=L;d.limitAuto=true}else if(d.limitAuto===undefined)d.limitAuto=false}
  return d};

// ---------- 校系卡片：官方審查資料 ----------
function officialBlock(t){const r=t.rv;if(!r)return'';const C=CODES();
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

const _renderTargets=renderTargets;
renderTargets=function(){_renderTargets();
  document.querySelectorAll('#targetList .item').forEach(card=>{const b=card.querySelector('[data-act][data-id]');if(!b)return;const t=S.targets.find(x=>x.id===b.dataset.id);
    if(t&&t.rv&&!card.querySelector('.rv-block')){const div=document.createElement('div');div.className='rv-block';div.innerHTML=officialBlock(t);card.appendChild(div)}});
  let m=document.getElementById('rvMatrix');if(!m){m=document.createElement('div');m.id='rvMatrix';document.getElementById('cmpWrap').before(m)}m.innerHTML=matrix();
};

// ---------- 目標校系頁：匯入按鈕、連回落點 ----------
(function(){const head=document.querySelector('#v-targets .row');if(!head)return;
  const b1=document.createElement('button');b1.className='btn ghost';b1.textContent='從落點分析匯入';b1.style.marginRight='6px';
  b1.onclick=()=>openDlg('從落點分析匯入',`<p class="muted" style="margin-top:8px">在落點分析的「我的志願」按「複製志願代碼」，貼到下面。也可以直接輸入 6 位數校系代碼，用逗號分開。</p><textarea name="codes" rows="3" placeholder="例如：001572-80,004112-55"></textarea>`,d=>{const l=parseCodes(readForm(d).codes);if(!l.length){toast('沒有讀到代碼');return}setTimeout(()=>importDialog(l),50)},'下一步');
  head.insertBefore(b1,document.getElementById('addTarget'));
  const p=document.createElement('div');p.className='tip info';p.style.marginTop='10px';
  p.innerHTML=`<b>🎯 還沒決定校系？</b>先用 <a href="${LUODIAN}" target="_blank" rel="noopener">學測落點分析</a> 看每個系的一階通過機率、排好 6 個志願，再按「帶到備審小幫手」，官方審查項目、二階比例和日期會自動帶進來。`;
  document.querySelector('#v-targets p.muted').after(p)})();

// ---------- 新增校系：從官方清單搜尋 ----------
const addBtn=document.getElementById('addTarget');
addBtn.onclick=()=>{loadRV().catch(()=>{});
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

// ---------- 面試：依二階方式出題型 ----------
const _iv=ivQuestions;
ivQuestions=function(t){const qs=_iv(t);const r=t&&t.rv;if(!r)return qs;const s2=(r.s2||[]).map(x=>x[0]).join('、');const add=[];
  if(/英文面試|英語面試/.test(s2))add.push(['動機','Please introduce yourself in one minute.'],['動機',`Why do you want to study ${t.dept}?`],['背景','Tell us about a challenge you overcame in high school.']);
  if(/團體/.test(s2))add.push(['臨場','（團體面試）小組 5 分鐘討論：如果要為學校設計一個改善生活的方案，你會提什麼？你在小組裡扮演什麼角色？'],['臨場','（團體面試）別人的意見跟你相反時，你會怎麼回應？']);
  if(/筆試/.test(s2))add.push(['臨場',`（這系二階有筆試）先查歷屆考古題或系網公告，確認範圍與題型。`]);
  if(/口試|面試|面談/.test(s2)&&!add.length)add.push(['動機',`（這系二階：${s2}）你對${t.dept}未來的發展有什麼想像？`]);
  return add.concat(qs)};

// ---------- 網址帶入 ----------
function checkHash(){const m=location.hash.match(/^#import=([\d,\-]+)/);if(!m)return;history.replaceState(null,'',location.pathname+location.search+'#targets');route();importDialog(parseCodes(m[1]))}
checkHash();addEventListener('hashchange',checkHash);
if((location.hash||'').startsWith('#targets'))renderTargets();
window.__BS={loadRV,addFromRV,parseCodes,matrix,officialBlock,rvOf,LUODIAN};   // 測試用
})();
