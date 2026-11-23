/* 統測落點：模擬考紀錄、趨勢、離目標還差多少
 *
 * 和學測（snaps.js）、分科（ast_snaps.js）是同一件事，但統測有兩個地方不一樣：
 *   ・成績是五科分數（0～100）不是級分。級分是「該群滿分基準的幾成」換算出來的：
 *     國英數的基準全 21 個群都是 100，所以換算一致；專業科目的基準各群不同
 *     （94～100），同一個分數可能差一級。所以紀錄要連群別一起存。
 *   ・同一組成績要服務兩種模式（甄選一階／登記分發），切換模式時可上校系數會變。
 *     所以成績本身只存一份，統計是依「你現在看的那個模式」算的，畫面上會標明。
 *
 * 通用的部分（存檔、排序、舊資料補日期、走勢折線、列印規則）都用 snaps.js
 * 匯出的 __SNAPLIB，不要各寫一份，不然同一個 bug 要修三次。
 *
 * 判斷一筆紀錄時要把分數暫時換進去：tc_app 的 judgeA/judgeU/lv 都是讀全域 st 的，
 * 不吃參數。換進去、算完、還原，全程同步，中間不會有別人去讀。
 *
 * 依賴：window.__TC（st, judgeA, judgeU, lv, DATA, inGrp, catOf, wishArr, KN, GNAME,
 *       catName, toast, save）與 window.__SNAPLIB（由 snaps.js 匯出，tc.html 也要載）
 */
(function(){
const T=window.__TC,LIB=window.__SNAPLIB;
if(!T||!LIB||!T.DATA||!T.inGrp)return;
const st=T.st,KN=T.KN;
const K=['c','e','m','p1','p2'];
const KS={c:'國',e:'英',m:'數',p1:'專一',p2:'專二'};
const esc=LIB.esc,today=LIB.today,sorted=LIB.sorted,arrow=LIB.arrow,MAX=LIB.MAX;
const DB=LIB.makeStore('ld_snaps_tc',r=>r.sc&&typeof r.sc==='object');
const load=DB.load,store=DB.store;
const $=id=>document.getElementById(id);
let pickA=null,pickB=null;

/* ---------- 把某一筆紀錄的成績暫時換進去再算 ---------- */
function withSnap(r,fn){
  const sc=st.sc,gc=st.gc;
  st.sc=Object.assign({},r.sc);
  if(r.gc)st.gc=r.gc;
  try{return fn()}finally{st.sc=sc;st.gc=gc}
}
// 掃整個群別的校系很慢，同一筆＋同一個模式只算一次
const MEMO={};
function poolOf(r){
  const k=st.mode+'|'+JSON.stringify([r.gc,r.sc]);
  if(k in MEMO)return MEMO[k];
  let n=null;
  try{
    n=withSnap(r,function(){
      const D=T.DATA(),f=st.mode==='a'?T.judgeA:T.judgeU;
      let c=0;
      for(const d of D){
        if(!T.inGrp(d))continue;
        const j=f(d);
        if(j&&(j.cat==='safe'||j.cat==='good'))c++;
      }
      return c;
    });
  }catch(e){n=null}
  MEMO[k]=n;
  return n;
}
const clearMemo=()=>Object.keys(MEMO).forEach(k=>delete MEMO[k]);
// 一筆紀錄的五科級分（依那一筆自己的群別換算）
function levels(r){
  try{return withSnap(r,()=>K.map(k=>T.lv(st.gc,k)))}catch(e){return []}
}
const modeName=()=>st.mode==='a'?'甄選入學一階':'登記分發';

/* ---------- 存檔 ---------- */
const hasAny=sc=>K.some(k=>sc[k]!=null);
function add(){
  if(!st.gc){T.toast('先選群（類）別');return}
  if(!hasAny(st.sc)){T.toast('先在上面填成績，才有東西可以存');return}
  const a=load();
  if(a.length>=MAX){T.toast('紀錄最多 '+MAX+' 筆，先刪掉用不到的再存');return}
  const el=$('tsnapName'),dt=$('tsnapDate');
  const name=((el&&el.value.trim())||defaultName()).slice(0,30);
  const at=(dt&&/^\d{4}-\d{2}-\d{2}$/.test(dt.value))?dt.value:today();
  const sc={};K.forEach(k=>sc[k]=st.sc[k]==null?null:st.sc[k]);
  a.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),
          name:name,at:at,saved:Date.now(),gc:st.gc,sc:sc});
  if(!store(a)){T.toast('存不起來：你的瀏覽器不讓這個網站保存資料（無痕視窗常常這樣）。換一般視窗再試一次。');return}
  if(el)el.value='';
  pickA=pickB=null;
  render();
  T.toast('已存「'+name+'」。下次考完再存一次就能比較');
}
function defaultName(){const d=new Date();return (d.getMonth()+1)+'/'+d.getDate()+' 模擬考'}
function apply(id){
  const r=load().find(x=>x.id===id);if(!r)return;
  const g=$('grp');
  if(g&&r.gc&&g.value!==r.gc){g.value=r.gc;g.dispatchEvent(new Event('change',{bubbles:true}))}
  K.forEach(function(k){
    const e=$('s_'+k);if(!e)return;
    const v=r.sc[k]==null?'':String(r.sc[k]);
    if(e.value===v)return;
    e.value=v;
    e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true}));
  });
  T.toast('已套用「'+r.name+'」，下面的報告是這一次的成績');
  const t=$('kpis');if(t&&t.scrollIntoView)t.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(render,250);
}
function del(id){
  const a=load(),r=a.find(x=>x.id===id);if(!r)return;
  if(!confirm('刪掉「'+r.name+'」這筆紀錄？'))return;
  if(!store(a.filter(x=>x.id!==id))){T.toast('刪不掉：瀏覽器不讓這個網站保存資料');return}
  if(pickA===id)pickA=null;
  if(pickB===id)pickB=null;
  render();
}
function unsaved(a){
  if(!st.gc||!hasAny(st.sc))return false;
  return !a.some(r=>r.gc===st.gc&&K.every(k=>(r.sc[k]==null?null:r.sc[k])===(st.sc[k]==null?null:st.sc[k])));
}

/* ---------- 趨勢 ---------- */
function bySubject(f,n){
  const lf=levels(f),ln=levels(n);
  const items=K.map(function(k,i){
    if(lf[i]==null||ln[i]==null)return null;
    return [KS[k],ln[i]-lf[i]];
  }).filter(Boolean);
  if(!items.length)return '';
  return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">'+items.map(function(x){
    const d=x[1];
    const bg=d>0?'rgba(30,142,78,.12)':d<0?'rgba(192,57,43,.1)':'rgba(0,0,0,.05)';
    const fg=d>0?'var(--safe,#1e8e4e)':d<0?'var(--no,#c0392b)':'var(--mute,#6b7280)';
    return '<span style="background:'+bg+';color:'+fg+';border-radius:999px;padding:3px 10px;font-size:13.5px;font-weight:700">'+
      x[0]+' '+(d>0?'+'+d:d===0?'±0':d)+'</span>';
  }).join('')+'</div><div class="note">上面是「級分」的增減（滿級分 15），不是分數。</div>';
}
function trend(a){
  if(a.length<2)return '';
  const f=a[0],n=a[a.length-1];
  const pf=poolOf(f),pn=poolOf(n);
  const pts=a.map(r=>{const v=poolOf(r);return v==null?null:{name:r.name,v:v,txt:v+' 個'}}).filter(Boolean);
  const line=(pf!=null&&pn!=null)?'可上的校系 '+pf+' → <b>'+pn+'</b> 個':'';
  return '<div style="margin-top:16px">'+
    '<div class="lbl">整體走勢：'+esc(f.name)+' 到 '+esc(n.name)+'（共 '+a.length+' 次，依「'+modeName()+'」算）</div>'+
    LIB.spark(pts,{lowerBetter:false,label:'可上的校系數走勢'})+bySubject(f,n)+
    (line?'<div>'+line+'</div>':'')+
    '<p class="note" style="margin-top:4px">線往上走＝機率 50% 以上的校系變多。<span class="snap-ui">圓點可以停上去看是哪一次。</span>'+
    '切換上面的「甄選入學／登記分發」，這條線會跟著換算。模擬考每次範圍不一樣，看趨勢不要看單點。</p></div>';
}

/* ---------- 離目標還差多少 ---------- */
function goal(a){
  const w=T.wishArr?T.wishArr():[];
  if(!w.length)
    return '<div class="note" style="margin-top:14px">把想讀的校系放進下面的「我的志願」，這裡就會告訴你每次模擬考有沒有拉近。</div>';
  const D=T.DATA(),d=D[w[0]];
  if(!d)return '';
  const f=st.mode==='a'?T.judgeA:T.judgeU;
  const one=r=>{try{return withSnap(r,()=>f(d))||null}catch(e){return null}};
  const n=a.length?one(a[a.length-1]):null;
  const o=a.length>1?one(a[a.length-2]):null;
  if(!n)return '';
  const nm='<b>'+esc(d.s)+' '+esc(d.n)+'</b>';
  if(n.cat==='miss')
    return '<div class="callout" style="margin-top:14px">🎯 你排第一的 '+nm+'：'+esc(n.why||'還有科目沒填')+'，所以算不出進度。</div>';
  if(n.p==null)
    return '<div class="callout" style="margin-top:14px">🎯 你排第一的 '+nm+'：'+
      esc(T.catName?T.catName(st.mode,n.cat):n.cat)+'，沒有可以比較的歷年門檻。</div>';
  const pc=v=>Math.round(v*100)+'%';
  let move='';
  if(o&&o.p!=null){
    const d1=Math.round(n.p*100)-Math.round(o.p*100);
    // 括號裡已經寫了上一次是多少，一樣的時候不用再補一句「和上一次一樣」
    move=d1>0?'　比上一次多了 <b style="color:var(--safe,#1e8e4e)">'+d1+'</b> 個百分點'
      :d1<0?'　比上一次少了 <b style="color:var(--no,#c0392b)">'+Math.abs(d1)+'</b> 個百分點'
      :'';
  }
  // 登記分發才有「加權總分」這個看得到的數字，甄選是逐關篩選沒有單一總分
  let tot='';
  if(st.mode==='u'&&n.total!=null){
    tot='　加權總分 '+(o&&o.total!=null?o.total+' → <b>'+n.total+'</b>':'<b>'+n.total+'</b>');
  }
  return '<div class="callout" style="margin-top:14px">🎯 你排第一的 '+nm+'：'+
    (st.mode==='a'?'一階通過機率':'錄取機率')+'約 <b>'+pc(n.p)+'</b>'+
    (o&&o.p!=null?'（上一次 '+pc(o.p)+'）':'')+move+tot+
    '<div class="note" style="margin-top:4px">用「'+modeName()+'」算的。門檻是歷年資料換算後的估計，今年會上下浮動，當方向看就好。</div></div>';
}

/* ---------- 比較 ---------- */
function picker(a,o,n){
  const opt=sel=>a.map(r=>'<option value="'+r.id+'"'+(r.id===sel.id?' selected':'')+'>'+esc(r.name)+'</option>').join('');
  return '<div class="lbl snap-ui">比較：</div><div class="snap-ui" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
    '<select id="tsnapA" style="flex:0 1 auto;max-width:46%">'+opt(o)+'</select><span>對</span>'+
    '<select id="tsnapB" style="flex:0 1 auto;max-width:46%">'+opt(n)+'</select></div>';
}
function cmpBlock(a){
  if(a.length<2)return '';
  const byId=id=>a.find(x=>x.id===id);
  const o=byId(pickA)||a[a.length-2];
  const n=byId(pickB)||a[a.length-1];
  if(o.id===n.id)return '<div style="margin-top:16px">'+picker(a,o,n)+'<div class="note" style="margin-top:8px">比較的兩次是同一筆，換一個就會出現比較表。</div></div>';
  const lo=levels(o),ln=levels(n);
  const rows=K.map(function(k,i){
    const ov=o.sc[k],nv=n.sc[k];
    if(ov==null&&nv==null)return '';
    const dd=(ov==null||nv==null)?null:+(nv-ov).toFixed(2);
    const lvtxt=(x,j)=>x==null?'未考':x+(j[i]!=null?'（'+j[i]+'級）':'');
    return '<tr><td class="l">'+KN[k]+'</td><td>'+lvtxt(ov,lo)+'</td><td>'+lvtxt(nv,ln)+'</td><td>'+
      (dd==null?'<span class="note">沒得比</span>':arrow(dd))+'</td></tr>';
  }).join('');
  const po=poolOf(o),pn=poolOf(n);
  let say='';
  if(po!=null&&pn!=null){
    say=pn>po?'機率 50% 以上的校系，從 '+po+' 個變成 '+pn+' 個。'
      :pn<po?'機率 50% 以上的校系，從 '+po+' 個變成 '+pn+' 個。模擬考範圍每次都在變大，退一點很正常，看接下來能不能追回來。'
      :'可上的校系數一樣。';
  }
  const diffG=o.gc&&n.gc&&o.gc!==n.gc;
  return '<div style="margin-top:16px">'+picker(a,o,n)+
    '<div style="overflow-x:auto;margin-top:8px"><table class="t"><tr><th class="l">科目（分數）</th><th>'+esc(o.name)+'</th><th>'+esc(n.name)+'</th><th>分數變化</th></tr>'+rows+
    '<tr><td class="l"><b>可上的校系</b></td><td>'+(po==null?'—':po+' 個')+'</td><td>'+(pn==null?'—':pn+' 個')+'</td><td>'+
    ((po!=null&&pn!=null)?arrow(pn-po)+' 個':'—')+'</td></tr></table></div>'+
    (diffG?'<div class="callout" style="margin-top:8px">這兩次報的群（類）別不一樣（'+esc((T.GNAME||{})[o.gc]||o.gc)+' vs '+esc((T.GNAME||{})[n.gc]||n.gc)+'）。'+
      '國文、英文、數學的級分換算全國一樣，可以直接比；專業科目因為各群的滿分基準不同，同一個分數可能差一級。'+
      '最重要的是兩群比的是不同的人、不同的校系，所以「可上的校系」不能直接比。</div>'
      :(say?'<div class="callout" style="margin-top:8px">'+say+'</div>':''))+
    '<p class="note" style="margin-top:6px">括號裡是級分（滿級分 15）。國英數的換算全國一樣，專業科目會依各群的滿分基準換算。'+
    '「可上的校系」是機率 50% 以上、而且是你選的群（類）別，用「'+modeName()+'」算的。</p></div>';
}

/* ---------- 畫面 ---------- */
// 只有一筆的時候畫面上什麼都不會出現，使用者不知道還差什麼。講清楚。
const needMore=a=>a.length===1?'<div class="note snap-ui" style="margin-top:10px">只有一筆，還看不出趨勢。下次模擬考考完再存一次，這裡就會出現走勢和兩次的比較。</div>':'';
function render(){
  const box=$('tcSnapBox');if(!box)return;
  const a=sorted(load());
  box.dataset.empty=a.length?'0':'1';
  const warn=unsaved(a)?'<div class="callout snap-ui" style="margin-top:10px">上面這組成績還沒有存起來。按「存下現在這組成績」才留得住，重新整理或改分數就沒了。</div>':'';
  const list=a.length?('<div style="overflow-x:auto;margin-top:10px"><table class="t"><tr><th class="l">紀錄</th><th>考試日期</th><th>五科分數</th><th>可上校系</th><th class="snap-ui"></th></tr>'+
    a.map(function(r){
      const v=poolOf(r);
      return '<tr><td class="l">'+esc(r.name)+'</td><td style="white-space:nowrap">'+esc(r.at)+'</td><td>'+
        K.map(k=>r.sc[k]==null?'':KS[k]+r.sc[k]).filter(Boolean).join(' ')+'</td><td>'+(v==null?'—':v+' 個')+'</td>'+
        '<td class="snap-ui" style="white-space:nowrap"><button class="btn ghost" data-tsnap-apply="'+r.id+'">套用</button> '+
        '<button class="btn ghost" data-tsnap-del="'+r.id+'">刪除</button></td></tr>'}).join('')+
    '</table></div>'+(a.length>=MAX?'<p class="note snap-ui" style="margin-top:6px">已經存到上限 '+MAX+' 筆，要再存請先刪掉用不到的。</p>':''))
    :'<div class="empty snap-ui" style="margin-top:10px">還沒有紀錄。填好這次模擬考的五科分數，按上面的按鈕存起來，下次考完再存一次就能比較。</div>';
  box.innerHTML='<h2>📈 模擬考紀錄 <small class="snap-ui">存起來，下次考完就看得出有沒有在往上</small></h2>'+
    '<div class="snap-ui" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">'+
    '<input id="tsnapName" type="text" maxlength="30" placeholder="例如：11月統測模擬考" style="flex:1 1 200px;min-width:0;padding:8px 10px;border:1px solid var(--line,#dfd8c8);border-radius:8px;font-family:inherit;font-size:15px">'+
    '<input id="tsnapDate" type="date" value="'+today()+'" aria-label="考試日期" style="flex:0 1 auto;padding:8px 10px;border:1px solid var(--line,#dfd8c8);border-radius:8px;font-family:inherit;font-size:15px">'+
    '<button class="btn navy" id="tsnapAdd">存下現在這組成績</button></div>'+
    '<p class="note snap-ui" style="margin-top:4px">日期填那次模擬考考的時間。補存以前的場次時記得改，順序是照考試日期排的。會連群（類）別一起存。</p>'+
    warn+list+needMore(a)+trend(a)+goal(a)+cmpBlock(a)+
    '<p class="note snap-ui" style="margin-top:8px">紀錄只存在這台裝置的瀏覽器裡，不會上傳。要換手機或換電腦，用下面的「換手機、換電腦」下載備份檔帶過去。</p>';
}
let timer=null;
const later=ms=>{clearTimeout(timer);timer=setTimeout(render,ms||150)};
function mount(){
  const anchor=$('input');if(!anchor)return;
  let box=$('tcSnapBox');
  if(!box){
    box=document.createElement('section');
    box.id='tcSnapBox';box.className='panel';
    anchor.parentNode.insertBefore(box,anchor.nextSibling);
  }
  LIB.printCSS('tcSnapBox');
  render();
}
document.addEventListener('click',function(e){
  const t=e.target;if(!t||!t.closest)return;
  if(t.closest('#tsnapAdd')){add();return}
  const ap=t.closest('[data-tsnap-apply]');if(ap){apply(ap.getAttribute('data-tsnap-apply'));return}
  const dl=t.closest('[data-tsnap-del]');if(dl){del(dl.getAttribute('data-tsnap-del'));return}
  // 切換甄選／分發會換一套校系和判斷方式，統計要重算
  if(t.closest('.mode')){clearMemo();later(250);return}
  if(t.closest('[data-w]'))later(250);
});
document.addEventListener('change',function(e){
  const t=e.target;if(!t)return;
  if(t.id==='tsnapA'||t.id==='tsnapB'){
    pickA=$('tsnapA')?$('tsnapA').value:null;
    pickB=$('tsnapB')?$('tsnapB').value:null;
    render();return;
  }
  if(t.id==='grp'){clearMemo();later(200);return}
  if(/^s_/.test(t.id||''))later(200);
});
document.addEventListener('input',function(e){
  if(e.target&&/^s_/.test(e.target.id||''))later(250);
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.__TSNAP={load:load,sorted:sorted,add:add,apply:apply,poolOf:poolOf,levels:levels,
                render:render,unsaved:unsaved,withSnap:withSnap,MAX:MAX};
})();
