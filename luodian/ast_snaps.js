/* 分科落點：模擬考紀錄、趨勢、離目標還差多少
 *
 * 和學測那支（snaps.js）是同一件事，但指標不一樣：
 *   ・分科沒有「幾科合計的全國位置」對照表（官方的累計人數表是逐科的），
 *     所以走勢改看「可上的系組數」——數字越大越好，剛好和學測那條線相反。
 *   ・分科是登記分發，差距用加權總分算出來的，除以權重總和才是「平均每科差幾級」。
 *
 * 通用的部分（存檔、排序、舊資料補日期、走勢折線、列印規則）都用 snaps.js
 * 匯出的 __SNAPLIB，不要各寫一份，不然同一個 bug 要修兩次。
 *
 * 判斷一筆紀錄時要把分數暫時換進去：ast_app 的 judge() 是讀全域 A 和學測級分的，
 * 不吃參數。換進去、算完、還原，全程同步，中間不會有別人去讀。
 *
 * 依賴：window.__AST（judge, A, D, inPool, sc60, S60, AB, all, renderInputs）、
 *       window.__LD（st, save, all, toast）、window.__SNAPLIB
 */
(function(){
const AST=window.__AST,L=window.__LD,LIB=window.__SNAPLIB;
if(!AST||!L||!LIB||!AST.inPool)return;
const A=AST.A;
const S60=AST.S60,AB=AST.AB;                 // 14 科：前 6 是學測、後 8 是分科
const esc=LIB.esc,today=LIB.today,sorted=LIB.sorted,arrow=LIB.arrow,MAX=LIB.MAX;
const DB=LIB.makeStore('ld_snaps_ast',r=>Array.isArray(r.a60));
const load=DB.load,store=DB.store;
const $=id=>document.getElementById(id);
let pickA=null,pickB=null;

/* ---------- 把某一筆紀錄的分數暫時換進去再算 ---------- */
function withSnap(r,fn){
  const g=A.g60,a=A.a60,sc=L.st.sc,lt=L.st.lt;
  A.g60=r.g60||[null,null,null,null,null,null];
  A.a60=r.a60;
  L.st.sc=r.sc||[null,null,null,null,null,null];
  L.st.lt=r.lt||null;
  try{return fn()}finally{A.g60=g;A.a60=a;L.st.sc=sc;L.st.lt=lt}
}
// 掃 1700 多個系組很慢，同一筆＋同一組篩選只算一次
const MEMO={};
const fkey=()=>String(A.fg||'')+'|'+String(A.fr||'');
function poolOf(r){
  const k=fkey()+'|'+JSON.stringify([r.g60,r.a60,r.sc,r.lt]);
  if(k in MEMO)return MEMO[k];
  let n=0;
  try{
    n=withSnap(r,function(){
      let c=0;
      for(const d of AST.D){
        if(!AST.inPool(d))continue;
        const j=AST.judge(d);
        if(j&&(j.cat==='safe'||j.cat==='good'))c++;
      }
      return c;
    });
  }catch(e){n=null}
  MEMO[k]=n;
  return n;
}
// 一筆紀錄的 14 科 60 級分（學測那 6 科沒填的話會用 15 級分推估，和報告區一致）
function all60(r){
  try{return withSnap(r,()=>Array.from({length:14},(_,i)=>AST.sc60(i)))}catch(e){return []}
}

/* ---------- 存檔 ---------- */
function cur(){return{g60:A.g60.slice(),a60:A.a60.slice(),sc:L.st.sc.slice(),lt:L.st.lt||null}}
function hasAny(c){return c.a60.some(v=>v!=null)||c.g60.some(v=>v!=null)||c.sc.some(v=>v!=null)}
function add(){
  const c=cur();
  if(!hasAny(c)){L.toast('先在上面填成績，才有東西可以存');return}
  const a=load();
  if(a.length>=MAX){L.toast('紀錄最多 '+MAX+' 筆，先刪掉用不到的再存');return}
  const el=$('asnapName'),dt=$('asnapDate');
  const name=((el&&el.value.trim())||defaultName()).slice(0,30);
  const at=(dt&&/^\d{4}-\d{2}-\d{2}$/.test(dt.value))?dt.value:today();
  a.push(Object.assign({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),
                        name:name,at:at,saved:Date.now()},c));
  if(!store(a)){L.toast('存不起來：你的瀏覽器不讓這個網站保存資料（無痕視窗常常這樣）。換一般視窗再試一次。');return}
  if(el)el.value='';
  pickA=pickB=null;
  render();
  L.toast('已存「'+name+'」。下次考完再存一次就能比較');
}
function defaultName(){const d=new Date();return (d.getMonth()+1)+'/'+d.getDate()+' 模擬考'}
function apply(id){
  const r=load().find(x=>x.id===id);if(!r)return;
  // 先灌學測 15 級分：它的 onchange 會順手重畫 60 級分那兩排欄位，
  // 所以一定要先做，不然等一下填好的 60 級分會被洗掉。
  const s15=[...document.querySelectorAll('#aSc15 select')];
  s15.forEach(function(e,i){
    const v=i<6?(r.sc&&r.sc[i]!=null?String(r.sc[i]):''):(r.lt||'');
    if(e.value!==v){e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))}
  });
  document.querySelectorAll('#aG60 [data-g]').forEach(function(e){
    const v=(r.g60&&r.g60[+e.dataset.g]!=null)?String(r.g60[+e.dataset.g]):'';
    if(e.value!==v){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}
  });
  document.querySelectorAll('#aA60 [data-a]').forEach(function(e){
    const v=(r.a60&&r.a60[+e.dataset.a]!=null)?String(r.a60[+e.dataset.a]):'';
    if(e.value!==v){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}
  });
  // 學測級分是申請入學共用的，套用舊紀錄會把那邊也改回去，一定要講
  L.toast('已套用「'+r.name+'」。注意：學測級分也跟著回到那一次，申請入學那邊的報告會一起變。');
  const t=$('aRep');if(t&&t.scrollIntoView)t.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(render,250);
}
function del(id){
  const a=load(),r=a.find(x=>x.id===id);if(!r)return;
  if(!confirm('刪掉「'+r.name+'」這筆紀錄？'))return;
  if(!store(a.filter(x=>x.id!==id))){L.toast('刪不掉：瀏覽器不讓這個網站保存資料');return}
  if(pickA===id)pickA=null;
  if(pickB===id)pickB=null;
  render();
}
function unsaved(a){
  const c=cur();
  if(!hasAny(c))return false;
  const same=(x,y)=>(x||[]).length===(y||[]).length&&(x||[]).every((v,i)=>v===(y||[])[i]);
  return !a.some(r=>same(r.a60,c.a60)&&same(r.g60,c.g60)&&same(r.sc,c.sc)&&(r.lt||null)===c.lt);
}

/* ---------- 趨勢 ---------- */
function bySubject(f,n){
  const vf=all60(f),vn=all60(n);
  const items=S60.map(function(s,i){
    if(vf[i]==null||vn[i]==null)return null;
    return [AB[i],vn[i]-vf[i]];
  }).filter(Boolean);
  if(!items.length)return '';
  return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">'+items.map(function(x){
    const d=x[1];
    const bg=d>0?'rgba(30,142,78,.12)':d<0?'rgba(192,57,43,.1)':'rgba(0,0,0,.05)';
    const fg=d>0?'var(--safe,#1e8e4e)':d<0?'var(--no,#c0392b)':'var(--mute,#6b7280)';
    return '<span style="background:'+bg+';color:'+fg+';border-radius:999px;padding:3px 10px;font-size:13.5px;font-weight:700">'+
      x[0]+' '+(d>0?'+'+d:d===0?'±0':d)+'</span>';
  }).join('')+'</div>';
}
function trend(a){
  if(a.length<2)return '';
  const f=a[0],n=a[a.length-1];
  const pf=poolOf(f),pn=poolOf(n);
  // 分科沒有合併的全國位置表，所以走勢看「可上的系組數」，越多越好
  const pts=a.map(r=>{const v=poolOf(r);return v==null?null:{name:r.name,v:v,txt:v+' 個'}}).filter(Boolean);
  const line=(pf!=null&&pn!=null)?'可上的系組 '+pf+' → <b>'+pn+'</b> 個':'';
  return '<div style="margin-top:16px">'+
    '<div class="lbl">整體走勢：'+esc(f.name)+' 到 '+esc(n.name)+'（共 '+a.length+' 次）</div>'+
    LIB.spark(pts,{lowerBetter:false,label:'可上的系組數走勢'})+bySubject(f,n)+
    (line?'<div>'+line+'</div>':'')+
    '<p class="note" style="margin-top:4px">線往上走＝機率 50% 以上的系組變多。<span class="snap-ui">圓點可以停上去看是哪一次。</span>'+
    '分科模擬考每次範圍不一樣，看趨勢不要看單點。</p></div>';
}

/* ---------- 離目標還差多少 ---------- */
function goal(a){
  const codes=A.wish||[];
  if(!codes.length)
    return '<div class="note" style="margin-top:14px">把想讀的系組放進下面的「我的分發志願」，這裡就會告訴你離它還差幾級分、每次模擬考有沒有拉近。</div>';
  const d=AST.D.find(x=>x.c===codes[0]);
  if(!d||d.pr==null)
    return '<div class="note" style="margin-top:14px">你排第一的那個系組沒有可以比較的歷年分數，換一個排第一就看得到進度。</div>';
  const W=(d.w||[]).reduce((s,x)=>s+x[1],0)||1;
  const one=r=>{try{return withSnap(r,()=>AST.judge(d))||null}catch(e){return null}};
  const n=a.length?one(a[a.length-1]):null;
  const o=a.length>1?one(a[a.length-2]):null;
  if(!n)return '';
  if(n.cat==='fail')
    return '<div class="callout" style="margin-top:14px">🎯 你排第一的 <b>'+esc(d.s)+' '+esc(d.n)+'</b>：'+
      '<b style="color:var(--no,#c0392b)">'+esc(n.why||'檢定沒過')+'</b>。'+
      '分科也看學測檢定，沒過的話加權總分再高也會被刷掉，這一科要優先補。</div>';
  if(n.cat==='miss')
    return '<div class="callout" style="margin-top:14px">🎯 你排第一的 <b>'+esc(d.s)+' '+esc(d.n)+'</b>：'+
      esc(n.mw||'還有科目沒填')+'，所以算不出離它還差多少。</div>';
  if(n.m==null)return '';
  const per=v=>(v/W).toFixed(1);                    // 加權總分差 ÷ 權重總和 ＝ 平均每科差幾級
  const now=n.m>=0?'已經高出 <b>'+per(n.m)+'</b> 級':'還差 <b>'+per(-n.m)+'</b> 級';
  let move='';
  if(o&&o.m!=null){
    const dm=+( (n.m-o.m)/W ).toFixed(1);
    if(dm>0)move='　比上一次拉近了 <b style="color:var(--safe,#1e8e4e)">'+dm+'</b> 級';
    else if(dm<0)move='　比上一次退了 <b style="color:var(--no,#c0392b)">'+Math.abs(dm)+'</b> 級';
    else move='　和上一次一樣';
  }else if(o&&o.cat==='fail'){
    move='　<b style="color:var(--safe,#1e8e4e)">上一次還卡在「'+esc(o.why||'檢定')+'」，這次過了</b>';
  }
  const pt=n.p==null?'':'　錄取機率約 <b>'+Math.round(n.p*100)+'%</b>'+
    (o&&o.p!=null?'（上一次 '+Math.round(o.p*100)+'%）':'');
  return '<div class="callout" style="margin-top:14px">🎯 你排第一的 <b>'+esc(d.s)+' '+esc(d.n)+'</b>：'+
    '採計 '+(d.w||[]).map(x=>S60[x[0]]+'×'+x[1]).join('、')+'，你'+now+'（平均每科，60 級分制）。'+move+pt+
    '<div class="note" style="margin-top:4px">門檻是歷年最低錄取分數換算後的估計，今年會上下浮動，當方向看就好。</div></div>';
}

/* ---------- 比較 ---------- */
function picker(a,o,n){
  const opt=sel=>a.map(r=>'<option value="'+r.id+'"'+(r.id===sel.id?' selected':'')+'>'+esc(r.name)+'</option>').join('');
  return '<div class="lbl snap-ui">比較：</div><div class="snap-ui" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
    '<select id="asnapA" style="flex:0 1 auto;max-width:46%">'+opt(o)+'</select><span>對</span>'+
    '<select id="asnapB" style="flex:0 1 auto;max-width:46%">'+opt(n)+'</select></div>';
}
function cmpBlock(a){
  if(a.length<2)return '';
  const byId=id=>a.find(x=>x.id===id);
  const o=byId(pickA)||a[a.length-2];
  const n=byId(pickB)||a[a.length-1];
  if(o.id===n.id)return '<div style="margin-top:16px">'+picker(a,o,n)+'<div class="note" style="margin-top:8px">比較的兩次是同一筆，換一個就會出現比較表。</div></div>';
  const vo=all60(o),vn=all60(n);
  const rows=S60.map(function(s,i){
    if(vo[i]==null&&vn[i]==null)return '';
    const d=(vo[i]==null||vn[i]==null)?null:vn[i]-vo[i];
    return '<tr><td class="l">'+s+'</td><td>'+(vo[i]==null?'未考':vo[i])+'</td><td>'+(vn[i]==null?'未考':vn[i])+'</td><td>'+
      (d==null?'<span class="note">沒得比</span>':arrow(d))+'</td></tr>';
  }).join('');
  const po=poolOf(o),pn=poolOf(n);
  let say='';
  if(po!=null&&pn!=null){
    say=pn>po?'機率 50% 以上的系組，從 '+po+' 個變成 '+pn+' 個。'
      :pn<po?'機率 50% 以上的系組，從 '+po+' 個變成 '+pn+' 個。分科模擬考範圍每次都在變大，退一點很正常，看接下來能不能追回來。'
      :'可上的系組數一樣。';
  }
  return '<div style="margin-top:16px">'+picker(a,o,n)+
    '<div style="overflow-x:auto;margin-top:8px"><table class="t"><tr><th class="l">科目（60 級分）</th><th>'+esc(o.name)+'</th><th>'+esc(n.name)+'</th><th>變化</th></tr>'+rows+
    '<tr><td class="l"><b>可上的系組</b></td><td>'+(po==null?'—':po+' 個')+'</td><td>'+(pn==null?'—':pn+' 個')+'</td><td>'+
    ((po!=null&&pn!=null)?arrow(pn-po)+' 個':'—')+'</td></tr></table></div>'+
    (say?'<div class="callout" style="margin-top:8px">'+say+'</div>':'')+
    '<p class="note" style="margin-top:6px">學測那六科沒填 60 級分的話，是依 15 級分推估的（和上面報告區一致）。'+
    '「可上的系組」是機率 50% 以上、而且符合你現在選的學群與地區的數量。</p></div>';
}

/* ---------- 畫面 ---------- */
// 只有一筆的時候畫面上什麼都不會出現，使用者不知道還差什麼。講清楚。
const needMore=a=>a.length===1?'<div class="note snap-ui" style="margin-top:10px">只有一筆，還看不出趨勢。下次模擬考考完再存一次，這裡就會出現走勢和兩次的比較。</div>':'';
function render(){
  const box=$('astSnapBox');if(!box)return;
  const a=sorted(load());
  box.dataset.empty=a.length?'0':'1';
  const warn=unsaved(a)?'<div class="callout snap-ui" style="margin-top:10px">上面這組成績還沒有存起來。按「存下現在這組成績」才留得住，重新整理或改分數就沒了。</div>':'';
  const list=a.length?('<div style="overflow-x:auto;margin-top:10px"><table class="t"><tr><th class="l">紀錄</th><th>考試日期</th><th>分科各科（60 級分）</th><th>可上系組</th><th class="snap-ui"></th></tr>'+
    a.map(function(r){
      const v=poolOf(r);
      return '<tr><td class="l">'+esc(r.name)+'</td><td style="white-space:nowrap">'+esc(r.at)+'</td><td>'+
        (r.a60||[]).map((x,i)=>x==null?'':AB[i+6]+x).filter(Boolean).join(' ')+'</td><td>'+(v==null?'—':v+' 個')+'</td>'+
        '<td class="snap-ui" style="white-space:nowrap"><button class="btn ghost" data-asnap-apply="'+r.id+'">套用</button> '+
        '<button class="btn ghost" data-asnap-del="'+r.id+'">刪除</button></td></tr>'}).join('')+
    '</table></div>'+(a.length>=MAX?'<p class="note snap-ui" style="margin-top:6px">已經存到上限 '+MAX+' 筆，要再存請先刪掉用不到的。</p>':''))
    :'<div class="empty snap-ui" style="margin-top:10px">還沒有紀錄。填好這次模擬考的成績，按上面的按鈕存起來，下次考完再存一次就能比較。</div>';
  box.innerHTML='<h2>📈 模擬考紀錄 <small class="snap-ui">存起來，下次考完就看得出有沒有在往上</small></h2>'+
    '<div class="snap-ui" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">'+
    '<input id="asnapName" type="text" maxlength="30" placeholder="例如：11月分科模擬考" style="flex:1 1 200px;min-width:0;padding:8px 10px;border:1px solid var(--line,#dfd8c8);border-radius:8px;font-family:inherit;font-size:15px">'+
    '<input id="asnapDate" type="date" value="'+today()+'" aria-label="考試日期" style="flex:0 1 auto;padding:8px 10px;border:1px solid var(--line,#dfd8c8);border-radius:8px;font-family:inherit;font-size:15px">'+
    '<button class="btn navy" id="asnapAdd">存下現在這組成績</button></div>'+
    '<p class="note snap-ui" style="margin-top:4px">日期填那次模擬考考的時間。補存以前的場次時記得改，順序是照考試日期排的。</p>'+
    warn+list+needMore(a)+trend(a)+goal(a)+cmpBlock(a)+
    '<p class="note snap-ui" style="margin-top:8px">紀錄只存在這台裝置的瀏覽器裡，不會上傳。要換手機或換電腦，用下面的「換手機、換電腦」下載備份檔帶過去。</p>';
}
let timer=null;
const later=ms=>{clearTimeout(timer);timer=setTimeout(render,ms||150)};
function mount(){
  const anchor=$('aIn');if(!anchor)return;
  let box=$('astSnapBox');
  if(!box){
    box=document.createElement('section');
    box.id='astSnapBox';box.className='panel';
    anchor.parentNode.insertBefore(box,anchor.nextSibling);
  }
  LIB.printCSS('astSnapBox');
  render();
}
document.addEventListener('click',function(e){
  const t=e.target;if(!t||!t.closest)return;
  if(t.closest('#asnapAdd')){add();return}
  const ap=t.closest('[data-asnap-apply]');if(ap){apply(ap.getAttribute('data-asnap-apply'));return}
  const dl=t.closest('[data-asnap-del]');if(dl){del(dl.getAttribute('data-asnap-del'));return}
  if(t.closest('.mode,[data-aw]'))later(250);         // 切換模式、動了分發志願
});
document.addEventListener('change',function(e){
  const t=e.target;if(!t)return;
  if(t.id==='asnapA'||t.id==='asnapB'){
    pickA=$('asnapA')?$('asnapA').value:null;
    pickB=$('asnapB')?$('asnapB').value:null;
    render();return;
  }
  if(t.id==='afg'||t.id==='afr'){Object.keys(MEMO).forEach(k=>delete MEMO[k]);later(200);return}
  if(t.closest&&t.closest('#aSc15'))later(200);
});
document.addEventListener('input',function(e){
  const t=e.target;if(!t||!t.closest)return;
  if(t.closest('#aG60,#aA60'))later(250);
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.__ASNAP={load:load,sorted:sorted,add:add,apply:apply,poolOf:poolOf,all60:all60,render:render,unsaved:unsaved,withSnap:withSnap,MAX:MAX};
})();
