/* 學測落點：模擬考成績紀錄、趨勢與比較
 *
 * 為什麼要這一支：
 *   高三一路要考好幾次模擬考，每次範圍都比上次大（第一二冊 → 第一到三冊 → 全範圍）。
 *   學生真正想知道的不是「這次幾級分」，是「我有沒有在往上」。
 *   原本的工具只存一組成績，換一組就把上一組蓋掉，看不出變化。
 *
 * 存的是整組級分（六科＋英聽），不是算出來的結果——因為資料每年會更新，
 * 存結果會過期，存成績才永遠能重算。
 *
 * 排序依「考試日期」而不是存檔時間：學生很可能同一天把前幾次模擬考一起補存，
 * 照存檔順序會把先打的那筆當成最新，結論整個反過來（明明進步卻說你退步了）。
 *
 * 可上校系數要和報告區 KPI 的「穩上＋可上」同一個定義，不能用 poolCount()：
 * poolCount 刻意排除「沒有篩選門檻」的校系（那種系人人都過一階、分數變了也不會變，
 * 它是給「多 1 級分最划算」用的）。兩個數字並排卻不一樣，看的人只會以為有一邊算錯。
 *
 * 依賴主程式全域匯出：window.__LD（st, save, all, toast, poolCount, inPool, judgeWith, D）
 * 與 window.LD_TOP
 */
(function(){
const L=window.__LD;
if(!L||!L.D)return;
const KEY='ld_snaps';
const MAX=12;                       // 一屆最多考不到十次，留點餘裕就好
const SUBJ=['國文','英文','數學A','數學B','社會','自然'];
const AB=['國','英','數A','數B','社','自'];
// 和主程式報告區同一組科目組合（官方只公布 2～4 科的人數累計表）
const COMBOS=[[0,1,2,5],[0,1,3,4],[0,1,2,4],[0,1,3,5],[0,1,2,3],[0,1,2],[0,1,3],[0,1,4],[0,1,5]];
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};

let pickA=null,pickB=null;          // 使用者選的比較對象（存 id）

function load(){
  try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}
}
// 存不進去要讓使用者知道。無痕視窗、關掉網站資料、容量滿都會失敗，
// 原本吞掉例外還照樣跳「已存」，使用者會以為存好了，其實什麼都沒有。
function store(a){
  try{localStorage.setItem(KEY,JSON.stringify(a));return true}catch(e){return false}
}
// 依考試日期排序；同一天的照存檔先後
const sorted=a=>a.slice().sort((x,y)=>(x.at||'').localeCompare(y.at||'')||(x.saved||0)-(y.saved||0));

function topOf(sc){
  const T=window.LD_TOP||{};
  const c=COMBOS.find(a=>a.every(i=>sc[i]!=null));
  if(!c)return null;
  const t=T[c.join(',')];if(!t)return null;
  const s=c.reduce((a,i)=>a+sc[i],0),v=t[s];
  return v==null?null:{pc:v,sum:s,nm:c.map(i=>AB[i]).join('')};
}
const pcTxt=v=>v==null?'—':'前 '+(v<1?v.toFixed(1):Math.round(v))+'%';
// lt＝那一次的英聽等級，要用該筆紀錄自己的，不是現在輸入欄裡的
function poolOf(sc,lt){
  try{
    if(!L.inPool||!L.judgeWith)return L.poolCount?L.poolCount(sc):null;
    let n=0;
    for(const d of L.D){
      if(!L.inPool(d))continue;
      const j=L.judgeWith(d,sc,lt==null?L.st.lt:lt);
      if(j&&(j.cat==='safe'||j.cat==='good'))n++;
    }
    return n;
  }catch(e){return null}
}

/* ---------- 存檔 ---------- */
function add(){
  const sc=L.st.sc.slice();
  if(!sc.some(v=>v!=null)){L.toast('先在上面填級分，才有東西可以存');return}
  const a=load();
  if(a.length>=MAX){L.toast('紀錄最多 '+MAX+' 筆，先刪掉用不到的再存');return}
  const el=$('snapName'),dt=$('snapDate');
  const name=((el&&el.value.trim())||defaultName()).slice(0,30);
  const at=(dt&&dt.value)||today();
  a.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),
          name:name,at:at,saved:Date.now(),sc:sc,lt:L.st.lt||null});
  if(!store(a)){
    L.toast('存不起來：你的瀏覽器不讓這個網站保存資料（無痕視窗常常這樣）。換一般視窗再試一次。');
    return;
  }
  if(el)el.value='';
  pickA=pickB=null;                 // 新增之後回到預設（比最近兩次）
  render();
  L.toast('已存「'+name+'」。下次考完再存一次就能比較');
}
function defaultName(){const d=new Date();return (d.getMonth()+1)+'/'+d.getDate()+' 模擬考'}
function apply(id){
  const r=load().find(x=>x.id===id);if(!r)return;
  const sel=[...document.querySelectorAll('#scores select')];
  if(sel.length<6){L.toast('找不到級分欄位');return}
  // 走真正的下拉選單，讓主程式自己存檔與重算，不要自己改狀態
  SUBJ.forEach((_,i)=>{
    const v=r.sc[i]==null?'':String(r.sc[i]);
    if(sel[i].value===v)return;
    sel[i].value=v;sel[i].dispatchEvent(new Event('change',{bubbles:true}));
  });
  if(sel[6]){const v=r.lt||'';if(sel[6].value!==v){sel[6].value=v;sel[6].dispatchEvent(new Event('change',{bubbles:true}))}}
  L.toast('已套用「'+r.name+'」，下面的報告是這一次的成績');
  const i=$('report');if(i&&i.scrollIntoView)i.scrollIntoView({behavior:'smooth',block:'start'});
  render();
}
function del(id){
  const a=load(),r=a.find(x=>x.id===id);
  if(!r)return;
  if(!confirm('刪掉「'+r.name+'」這筆紀錄？'))return;
  if(!store(a.filter(x=>x.id!==id))){L.toast('刪不掉：瀏覽器不讓這個網站保存資料');return}
  if(pickA===id)pickA=null;
  if(pickB===id)pickB=null;
  render();
}

/* ---------- 趨勢 ---------- */
// 全國位置的走勢。數字越小越前面，所以畫的時候要上下顛倒過來。
function spark(a){
  const pts=a.map(r=>({r:r,t:topOf(r.sc)})).filter(x=>x.t);
  if(pts.length<2)return '';
  const vs=pts.map(x=>x.t.pc);
  let lo=Math.min(...vs),hi=Math.max(...vs);
  if(hi-lo<1){lo=Math.max(0,lo-1);hi=hi+1}
  const W=100,H=34,pad=3;
  const xy=pts.map((x,i)=>{
    const px=pts.length===1?W/2:pad+i*(W-pad*2)/(pts.length-1);
    const py=pad+(x.t.pc-lo)/(hi-lo)*(H-pad*2);      // 顛倒：pc 大＝排名後面＝畫在下面
    return [px,py];
  });
  const first=pts[0].t.pc,last=pts[pts.length-1].t.pc;
  const col=last<first?'var(--safe,#1e8e4e)':last>first?'var(--no,#c0392b)':'var(--gold,#c69e46)';
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" '+
    'aria-label="全國位置走勢，從 '+pcTxt(first)+' 到 '+pcTxt(last)+'" '+
    'style="width:100%;max-width:420px;height:46px;display:block;margin:6px 0">'+
    '<polyline fill="none" stroke="'+col+'" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="'+
    xy.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'"/>'+
    xy.map(p=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="1.8" fill="'+col+'" vector-effect="non-scaling-stroke"/>').join('')+
    '</svg>';
}
function trend(a){
  if(a.length<2)return '';
  const f=a[0],n=a[a.length-1];
  const tf=topOf(f.sc),tn=topOf(n.sc);
  const pf=poolOf(f.sc,f.lt),pn=poolOf(n.sc,n.lt);
  let line='';
  if(tf&&tn)line='全國位置 '+pcTxt(tf.pc)+' → <b>'+pcTxt(tn.pc)+'</b>';
  if(pf!=null&&pn!=null)line+=(line?'　｜　':'')+'可上的校系 '+pf+' → <b>'+pn+'</b> 個';
  return '<div style="margin-top:14px">'+
    '<div class="lbl">整體走勢：'+esc(f.name)+' 到 '+esc(n.name)+'（共 '+a.length+' 次）</div>'+
    spark(a)+
    (line?'<div>'+line+'</div>':'')+
    '<p class="note" style="margin-top:4px">線往上走＝全國排名往前。模擬考範圍每次都不一樣，級分不是同一把尺，看趨勢不要看單點。</p></div>';
}

/* ---------- 比較 ---------- */
const arrow=d=>d>0?'<b style="color:var(--safe,#1e8e4e)">▲ '+d+'</b>':d<0?'<b style="color:var(--no,#c0392b)">▼ '+Math.abs(d)+'</b>':'<span class="note">—</span>';
function cmpBlock(a){
  if(a.length<2)return '';
  const byId=id=>a.find(x=>x.id===id);
  const o=byId(pickA)||a[a.length-2];
  const n=byId(pickB)||a[a.length-1];
  if(o.id===n.id)return '<div class="note" style="margin-top:12px">比較的兩次是同一筆，請換一個。</div>'+picker(a,o,n);
  let rows=SUBJ.map((s,i)=>{
    if(o.sc[i]==null&&n.sc[i]==null)return '';
    const ov=o.sc[i],nv=n.sc[i];
    const d=(ov==null||nv==null)?null:nv-ov;
    return '<tr><td class="l">'+s+'</td><td>'+(ov==null?'未考':ov)+'</td><td>'+(nv==null?'未考':nv)+'</td><td>'+(d==null?'<span class="note">沒得比</span>':arrow(d))+'</td></tr>';
  }).join('');
  // 英聽也要列：很多校系拿它當檢定，差一級就直接篩掉
  if(o.lt||n.lt){
    const rank=x=>'FCBA'.indexOf(x);
    const d=(o.lt&&n.lt)?rank(n.lt)-rank(o.lt):null;
    rows+='<tr><td class="l">英聽</td><td>'+(o.lt||'未考')+'</td><td>'+(n.lt||'未考')+'</td><td>'+
      (d==null?'<span class="note">沒得比</span>':d>0?'<b style="color:var(--safe,#1e8e4e)">▲ 進步 '+d+' 級</b>':d<0?'<b style="color:var(--no,#c0392b)">▼ 退 '+Math.abs(d)+' 級</b>':'<span class="note">—</span>')+'</td></tr>';
  }
  const to=topOf(o.sc),tn=topOf(n.sc);
  const po=poolOf(o.sc,o.lt),pn=poolOf(n.sc,n.lt);
  const same=to&&tn&&to.nm===tn.nm;
  let say='';
  if(same){
    const ds=tn.sum-to.sum;
    say=ds>0?'這次 '+tn.nm+' 多了 '+ds+' 級分，全國位置從 '+pcTxt(to.pc)+' 進到 '+pcTxt(tn.pc)+'。'
      :ds<0?'這次 '+tn.nm+' 少了 '+Math.abs(ds)+' 級分。模擬考範圍每次都在變大，退一點很正常，看接下來能不能追回來。'
      :'兩次總級分一樣，位置也差不多。';
    if(po!=null&&pn!=null&&pn!==po)
      say+='符合你篩選條件、機率 55% 以上的校系，從 '+po+' 個變成 '+pn+' 個。';
  }else if(to&&tn){
    // 轉組、或某次沒考某一科，就會變成不同組合。不要默默不講話。
    say='這兩次採計到的科目組合不一樣（'+to.nm+' vs '+tn.nm+'），全國位置是兩把不同的尺，不能直接比。'+
        '上面逐科的增減還是看得出來。';
  }else{
    say='其中一次的科目填得不夠（官方的人數累計表至少要有國文、英文再加一科），所以算不出全國位置。';
  }
  return '<div style="margin-top:14px">'+picker(a,o,n)+
    '<div style="overflow-x:auto;margin-top:8px"><table class="t"><tr><th class="l">科目</th><th>'+esc(o.name)+'</th><th>'+esc(n.name)+'</th><th>變化</th></tr>'+rows+
    '<tr><td class="l"><b>全國位置</b></td><td>'+pcTxt(to&&to.pc)+'</td><td>'+pcTxt(tn&&tn.pc)+'</td><td>'+(same?arrow(tn.sum-to.sum)+' 級分':'<span class="note">科目組合不同</span>')+'</td></tr>'+
    '<tr><td class="l"><b>可上的校系</b></td><td>'+(po==null?'—':po+' 個')+'</td><td>'+(pn==null?'—':pn+' 個')+'</td><td>'+((po!=null&&pn!=null)?arrow(pn-po)+' 個':'—')+'</td></tr>'+
    '</table></div>'+
    (say?'<div class="callout" style="margin-top:8px">'+say+'</div>':'')+
    '<p class="note" style="margin-top:6px">「可上的校系」是機率 55% 以上、而且符合你現在選的學群與地區的數量，兩次都用同一組條件算。</p></div>';
}
function picker(a,o,n){
  const opt=(sel)=>a.map(r=>'<option value="'+r.id+'"'+(r.id===sel.id?' selected':'')+'>'+esc(r.name)+'</option>').join('');
  return '<div class="lbl">比較：</div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
    '<select id="snapA" style="flex:0 1 auto;max-width:46%">'+opt(o)+'</select><span>對</span>'+
    '<select id="snapB" style="flex:0 1 auto;max-width:46%">'+opt(n)+'</select></div>';
}

/* ---------- 畫面 ---------- */
function render(){
  const box=$('snapBox');if(!box)return;
  const a=sorted(load());
  const list=a.length?('<div style="overflow-x:auto;margin-top:10px"><table class="t"><tr><th class="l">紀錄</th><th>考試日期</th><th>級分</th><th>全國位置</th><th></th></tr>'+
    a.map(r=>{const t=topOf(r.sc);
      return '<tr><td class="l">'+esc(r.name)+'</td><td style="white-space:nowrap">'+esc(r.at)+'</td><td>'+
        SUBJ.map((s,i)=>r.sc[i]==null?'':AB[i]+r.sc[i]).filter(Boolean).join(' ')+(r.lt?' 英聽'+r.lt:'')+'</td><td>'+pcTxt(t&&t.pc)+'</td>'+
        '<td style="white-space:nowrap"><button class="btn ghost" data-snap-apply="'+r.id+'">套用</button> '+
        '<button class="btn ghost" data-snap-del="'+r.id+'">刪除</button></td></tr>'}).join('')+
    '</table></div>'+(a.length>=MAX?'<p class="note" style="margin-top:6px">已經存到上限 '+MAX+' 筆，要再存請先刪掉用不到的。</p>':''))
    :'<div class="empty" style="margin-top:10px">還沒有紀錄。填好這次模擬考的級分，按上面的按鈕存起來，下次考完再存一次就能比較。</div>';
  box.innerHTML='<h2>📈 模擬考紀錄 <small>存起來，下次考完就看得出有沒有在往上</small></h2>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">'+
    '<input id="snapName" type="text" maxlength="30" placeholder="例如：11月模擬考（一～三冊）" style="flex:1 1 200px;min-width:0;padding:8px 10px;border:1px solid var(--line,#dfd8c8);border-radius:8px;font-family:inherit;font-size:15px">'+
    '<input id="snapDate" type="date" value="'+today()+'" aria-label="考試日期" style="flex:0 1 auto;padding:8px 10px;border:1px solid var(--line,#dfd8c8);border-radius:8px;font-family:inherit;font-size:15px">'+
    '<button class="btn navy" id="snapAdd">存下現在這組成績</button></div>'+
    '<p class="note" style="margin-top:4px">日期填那次模擬考考的時間。補存以前的場次時記得改，順序是照考試日期排的。</p>'+
    list+trend(a)+cmpBlock(a)+
    '<p class="note" style="margin-top:8px">紀錄只存在這台裝置的瀏覽器裡，不會上傳，手機和電腦不互通。存的是級分本身，所以資料更新後重新套用一次，算出來的都是最新的。</p>';
}
function mount(){
  const anchor=$('input');if(!anchor)return;
  let box=$('snapBox');
  if(!box){
    box=document.createElement('section');
    box.id='snapBox';box.className='panel no-print';
    anchor.parentNode.insertBefore(box,anchor.nextSibling);
  }
  render();
}
document.addEventListener('click',function(e){
  const t=e.target;if(!t||!t.closest)return;
  if(t.closest('#snapAdd')){add();return}
  const ap=t.closest('[data-snap-apply]');if(ap){apply(ap.getAttribute('data-snap-apply'));return}
  const dl=t.closest('[data-snap-del]');if(dl){del(dl.getAttribute('data-snap-del'));return}
});
document.addEventListener('change',function(e){
  const t=e.target;if(!t)return;
  if(t.id==='snapA'||t.id==='snapB'){
    pickA=$('snapA')?$('snapA').value:null;
    pickB=$('snapB')?$('snapB').value:null;
    render();return;
  }
  // 改級分或換學群／地區之後，「可上的校系」要跟著重算
  if(t.closest&&t.closest('#scores'))setTimeout(render,80);
});
document.addEventListener('click',function(e){
  if(e.target&&e.target.closest&&e.target.closest('#gchips,#rchips'))setTimeout(render,120);
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.__SNAP={load:load,sorted:sorted,add:add,apply:apply,topOf:topOf,poolOf:poolOf,render:render,MAX:MAX};
})();
