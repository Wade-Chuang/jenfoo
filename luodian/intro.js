/* 落點分析：第一次用的人看的三步驟＋範例成績＋「這些數字是什麼意思」
 *
 * 為什麼要這一支：
 *   三個工具第一次打開都是一整排空的下拉選單，不填就什麼都不會出現；
 *   填了之後又會冒出「通過機率 62%」「可衝／穩上」「前標」「85%+」這些詞。
 *   高三生看得懂，家長和第一次用的人看不懂——而看不懂的人就直接關掉了。
 *
 * 做三件事：
 *   ① 三步驟卡片（按「知道了」就不再出現，記在這台裝置上）
 *   ② 「先用範例成績看一次」——不填自己的成績也能先看到報告長什麼樣。
 *      範例值不是我隨便編的：學測用官方五標的「前標」，分科用全國累計人數表
 *      換算到同一個位置（全國前 25%）。統測不一樣——統測級分是「該群最高分的
 *      幾成」而不是百分位，換不出全國前幾%，所以統測的範例老實寫成「五科都
 *      11 級分」，不假裝它等於前 25%。
 *   ③ 名詞小字典，按了「知道了」之後還是留著。
 *
 * 同一支檔案服務三個工具，靠 CTX() 判斷現在在哪一個。
 */
(function(){
const $=id=>document.getElementById(id);
const KEY='ld_intro_done';
const PCT=25;                      // 範例成績的位置：全國前 25%（＝學測前標）

/* ---------- 名詞小字典 ---------- */
const G_COMMON=[
 ['通過機率是什麼？不是錄取率嗎？',
  '這個數字是「用你的分數去跑過去幾年的門檻，有幾成的情況會過」。它不是保證，也不是錄取率——門檻每年都會動，今年比去年高或低，誰都不知道。'],
 ['你們怎麼算的？',
  '把歷年最低錄取分數先換成「全國前百分之幾」，消掉每年題目難易度的差別，再換回今年的分數。然後用回測出來的誤差分布，把你的分數丟進去跑幾千次，數出有幾次會過。'],
 ['為什麼最高只寫 85%？',
  '回測發現機率最高的那一段偏樂觀：少數校系門檻會突然大跳。與其寫「99% 穩上」讓人放心到不填保底，不如誠實停在 85%。'],
 ['衝、穩、保是怎麼分的？',
  '機率 20～50% 叫「可衝」、50～75% 叫「可上」、75% 以上叫「穩上」。志願表裡三種都要有，只填穩上的會浪費分數，只填可衝的會落榜。'],
 ['我的成績會被傳出去嗎？',
  '不會。全部算在你自己的瀏覽器裡，沒有帳號、沒有後端，關掉分頁就只留在這台裝置的本機儲存。']
];
const CTXS={
 ld:{   // 學測申請入學
  name:'學測落點分析',
  before:'input',
  steps:['填你的學測級分。還沒考、或還沒拿到成績，就填最近一次模擬考。',
         '下面會長出落點報告：各科在全國的位置、能上的學校等級、推薦 6 個志願。',
         '把想讀的放進「我的志願」，展開每一個的「二階怎麼拿分（試算）」，看備審和面試要拉幾分。',
         '最後下載甄試行事曆（.ics）丟進手機日曆——最容易忘的是繳件截止日，它比甄試日早一個星期。'],
  g:[['一階、二階差在哪？',
      '一階是用學測級分篩選，過了才有資格進二階；二階才看備審、面試、筆試。這一頁的機率算的是「一階會不會過」，二階請看每個校系的「二階怎麼拿分」。'],
     ['五標（頂標、前標、均標）是什麼？',
      '全國考生成績的位置線。前標＝全國前 25%、均標＝前 50%、底標＝前 88%。校系的「檢定」就是用這個當門檻，沒過檢定連篩選都不會進。']],
  demo:'六科都剛好在前標（全國前 25%）的同學'},
 ast:{  // 分科測驗登記分發
  name:'分科落點分析',
  before:'aIn',
  steps:['先填學測級分——分科的「檢定」還是看學測。',
         '再填分科測驗各科的 60 級分。沒有成績就填模擬考，空白的學測 60 級分會自動估。',
         '把志願照「你真的想讀的順序」排（最多 100 個，順序就是分發順序）。',
         '看「照你排的順序跑一次」：分發是依序比對、第一個分數夠的就錄取，所以重點是會停在第幾個。'],
  g:[['分發和申請入學差在哪？',
      '分發沒有面試也沒有備審，電腦直接照你排的順序比分數，第一個夠的就錄取，錄取了後面都不看。所以志願序排法比單一個系的機率更重要。'],
     ['為什麼要填「60 級分」？',
      '分科測驗和學測採計都用 60 級分制加權。學測那幾科你如果只有 15 級分，系統會依全國人數表自動估一個 60 級分，有成績單的話請填實際分數比較準。']],
  demo:'學測前標、分科各科也在全國前 25% 的同學'},
 tc:{   // 四技二專
  name:'統測落點分析',
  before:null,
  steps:['先選你報名的群（類）別——群別不同，比的對象和校系完全不一樣。',
         '填國文、英文、數學、專業(一)、專業(二)五科的分數。',
         '上面可以切「甄選入學」（看一階篩選會不會過）和「聯合登記分發」（看加權總分夠不夠）。',
         '排好志願後，登記分發會算「照你排的順序跑一次」會停在第幾個；甄選的二階時程在志願清單下面。'],
  g:[['甄選入學和登記分發差在哪？',
      '甄選是先用統測成績篩一階，過了要到校參加二階（備審＋面試或實作），錄取看二階總成績。登記分發不用到校，照加權總分和你排的志願序直接分發。'],
     ['加權是什麼意思？',
      '很多校系會把專業科目乘以 2 倍或 1.5 倍。同樣的總分，加權後的分數在不同校系差很多，所以要看每個校系自己的加權。']],
  demo:'電機類、五科都是 11 級分（滿級分 15）的同學'}
};
function CTX(){
  if(window.__TC)return 'tc';
  const A=window.__AST&&window.__AST.A;
  return (A&&A.mode==='ast')?'ast':'ld';
}

/* ---------- 範例成績 ---------- */
// 學測：官方五標的前標（＝全國前 25%）
function demoLD(){
  const L=window.__LD;if(!L||!L.S5)return false;
  const NM=['國文','英文','數學A','數學B','社會','自然'],V=L.S5.v||{};
  const sel=[...document.querySelectorAll('#scores select')];
  if(sel.length<6)return false;
  NM.forEach((n,i)=>{const v=(V[n]||[])[1];if(v==null)return;sel[i].value=String(v);sel[i].dispatchEvent(new Event('change',{bubbles:true}))});
  if(sel[6]){sel[6].value='A';sel[6].dispatchEvent(new Event('change',{bubbles:true}))}
  return true;
}
// 分科：學測同上，分科各科取全國累計人數表上最接近前 25% 的那一個 60 級分
function top60At(idx,pct){
  const u=(window.AST_TOP||{})[String(idx)];if(!u)return null;
  for(let k=60;k>=0;k--)if(u[k]!=null&&u[k]>=pct)return k;
  return null;
}
function demoAST(){
  const NM=['國文','英文','數學A','數學B','社會','自然'],L=window.__LD;
  const V=(L&&L.S5&&L.S5.v)||{};
  const s15=[...document.querySelectorAll('#aSc15 select')];
  NM.forEach((n,i)=>{const v=(V[n]||[])[1];if(v==null||!s15[i])return;s15[i].value=String(v);s15[i].dispatchEvent(new Event('change',{bubbles:true}))});
  const ins=[...document.querySelectorAll('#aA60 [data-a]')];
  if(!ins.length)return false;
  let any=false;
  ins.forEach(e=>{const k=top60At(+e.dataset.a+6,PCT);if(k==null)return;any=true;
    e.value=String(k);e.dispatchEvent(new Event('input',{bubbles:true}))});
  return any;
}
// 統測：用工具自己的 lv() 反查「第 11 級分」要幾分（15 級距裡的前 25% 位置）
function demoTC(){
  const T=window.__TC;if(!T)return false;
  const grp=$('grp');
  if(grp&&!grp.value){
    const want=[...grp.options].find(o=>/電機類/.test(o.textContent))||grp.options[1];
    if(want){grp.value=want.value;grp.dispatchEvent(new Event('change',{bubbles:true}))}
  }
  const gc=T.st.gc;if(!gc)return false;
  const KEYS=['c','e','m','p1','p2'],TARGET=11;
  let ok=false;
  KEYS.forEach(k=>{
    const keep=T.st.sc[k];
    let found=null;
    for(let s=1;s<=100;s++){T.st.sc[k]=s;if(T.lv(gc,k)>=TARGET){found=s;break}}
    T.st.sc[k]=keep;
    const el=$('s_'+k);if(found==null||!el)return;
    ok=true;el.value=String(found);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  return ok;
}
function hasData(c){
  if(c==='tc')return !!(window.__TC&&window.__TC.st.gc&&['c','e','m','p1','p2'].some(k=>window.__TC.st.sc[k]!=null));
  const L=window.__LD;if(!L)return false;
  if(c==='ast'){const A=window.__AST&&window.__AST.A;return !!(A&&(A.a60.some(v=>v!=null)||L.st.sc.some(v=>v!=null)))}
  return L.st.sc.some(v=>v!=null);
}

/* ---------- 畫面 ---------- */
const CSS=`.ldx{border:1px solid var(--line,#dfd8c8);border-radius:12px;padding:14px 16px;margin:0 0 14px;background:var(--paper,#fbf8f1)}
.ldx h3{margin:0;font-size:17px}
.ldx ol{margin:10px 0 0;padding-left:1.25em}
.ldx li{margin:5px 0;font-size:14.5px;line-height:1.65}
.ldx .ldx-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}
.ldx .ldx-x{margin-left:auto;background:none;border:0;color:var(--mute,#6b7280);font-size:13.5px;cursor:pointer;padding:4px}
.ldx .ldx-x:hover{text-decoration:underline}
.ldx details{margin-top:10px}
.ldx summary{cursor:pointer;font-weight:700;font-size:14.5px}
.ldx dl{margin:8px 0 0}
.ldx dt{font-weight:700;margin-top:10px;font-size:14px}
.ldx dd{margin:2px 0 0;font-size:13.5px;line-height:1.7;color:var(--mute,#4b5563)}
.ldx .ldx-note{font-size:12.5px;color:var(--mute,#6b7280)}
@media(max-width:520px){.ldx{padding:12px 13px}.ldx .ldx-x{margin-left:0}}`;

function glossary(c){
  const rows=CTXS[c].g.concat(G_COMMON);
  return '<details><summary>這些數字是什麼意思？</summary><dl>'+
    rows.map(x=>'<dt>'+x[0]+'</dt><dd>'+x[1]+'</dd>').join('')+
    '</dl></details>';
}
function html(c,done){
  const X=CTXS[c];
  if(done)return '<div class="ldx" style="padding:9px 14px">'+glossary(c)+'</div>';
  return '<div class="ldx"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">'+
    '<h3>第一次用？三十秒看懂</h3><button class="ldx-x" data-ldx-close>知道了，不要再顯示</button></div>'+
    '<ol>'+X.steps.map(s=>'<li>'+s+'</li>').join('')+'</ol>'+
    '<div class="ldx-row"><button class="btn ghost" data-ldx-demo>▶ 先用範例成績看一次</button>'+
    '<span class="ldx-note">範例是「'+X.demo+'」。按了會填進上面的欄位，可以直接改成你自己的。</span></div>'+
    glossary(c)+
    '<p class="ldx-note" style="margin:10px 0 0">全部算在你自己的瀏覽器裡，沒有帳號也不會上傳。</p></div>';
}
function anchor(c){
  const id=CTXS[c].before;
  if(id&&$(id))return $(id);
  const g=$('grp');
  if(g&&g.closest('.panel'))return g.closest('.panel');
  return document.querySelector('.wrap .panel');
}
function done(){try{return localStorage.getItem(KEY)==='1'}catch(e){return false}}
function render(){
  const c=CTX(),a=anchor(c);if(!a)return;
  let el=$('ldxBox');
  if(!el){el=document.createElement('div');el.id='ldxBox';el.className='no-print'}
  if(el.previousElementSibling!==a.previousElementSibling||el.nextElementSibling!==a)a.parentNode.insertBefore(el,a);
  el.dataset.c=c;
  el.innerHTML=html(c,done()||hasData(c));
}
/* 從學群探索帶學群過來：#g=資訊,工程
   直接點真正的 chip，不要去改 st.g——chip 的 onclick 裡有存檔和重算，自己設狀態會漏掉。 */
function applyGroups(){
  const m=String(location.hash||'').match(/[#&]g=([^&]+)/);
  if(!m)return;
  const want=m[1].split(',').map(x=>{try{return decodeURIComponent(x)}catch(e){return x}}).filter(Boolean);
  // 從學群探索過來的人多半還沒考，固定帶到申請入學；
  // 不然上次停在分科模式的人會落在分科頁，而學群籤是申請入學那一區的，等於沒作用
  try{if(window.__AST&&window.__AST.A.mode!=='apply')window.__AST.setMode('apply')}catch(e){}
  if(!document.querySelectorAll('#gchips .chip').length)return;
  // 換成這幾個學群，不是加上去：上次留下的勾選要先拿掉，不然清單會混進別的方向。
  // 每點一下 chips() 會整個重畫，所以每一輪都要重新查，不能用快取的節點。
  let n=0;
  for(let i=0;i<40;i++){
    const chips=[...document.querySelectorAll('#gchips .chip')];
    const b=chips.find(function(x){
      const nm=x.textContent.trim(),on=x.classList.contains('on');
      return want.indexOf(nm)>=0?!on:on;
    });
    if(!b)break;
    b.click();n++;
  }
  history.replaceState(null,'',location.pathname+location.search);
  const say=window.__LD&&window.__LD.toast;
  if(n&&say)say('已經幫你勾好「'+want.join('、')+'」，下面只會列這幾個學群的校系');
  if(n){const i=document.getElementById('input');if(i&&i.scrollIntoView)i.scrollIntoView({behavior:'smooth',block:'start'})}
}

function boot(){
  const s=document.createElement('style');s.textContent=CSS;document.head.appendChild(s);
  try{applyGroups()}catch(e){}
  render();
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-ldx-close]')){try{localStorage.setItem(KEY,'1')}catch(_){}render();return}
    const b=e.target.closest('[data-ldx-demo]');if(!b)return;
    const c=CTX();
    const ok=c==='tc'?demoTC():c==='ast'?demoAST():demoLD();
    const say=(window.__TC&&window.__TC.toast)||(window.__LD&&window.__LD.toast);
    if(!ok){if(say)say('範例資料載入失敗，請直接填自己的成績');return}
    try{localStorage.setItem(KEY,'1')}catch(_){}
    setTimeout(render,60);
    if(say)say('這是範例成績（'+CTXS[c].demo+'），直接改成你自己的就是你的落點');
    setTimeout(function(){const r=$('report')||$('aRep')||$('kpis');if(r&&r.scrollIntoView)r.scrollIntoView({behavior:'smooth',block:'start'})},250);
  });
  // 切換申請／分科、或輸入成績之後，卡片要跟著換內容
  document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setTimeout(render,0)));
  window.addEventListener('hashchange',()=>setTimeout(render,0));
  document.addEventListener('change',function(e){
    if(e.target&&(e.target.closest('#scores')||e.target.closest('#aSc15')||e.target.id==='grp'||/^s_/.test(e.target.id||'')))setTimeout(render,0);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.__LDX={render:render,CTX:CTX,demoLD:demoLD,demoAST:demoAST,demoTC:demoTC,top60At:top60At};
})();
