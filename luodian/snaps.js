/* 學測落點：模擬考成績紀錄、趨勢、離目標還差多少
 *
 * 為什麼要這一支：
 *   高三一路要考好幾次模擬考，每次範圍都比上次大（第一二冊 → 第一到三冊 → 全範圍）。
 *   學生真正想知道的不是「這次幾級分」，是「我有沒有在往上、離想上的系還差多少」。
 *   原本的工具只存一組成績，換一組就把上一組蓋掉，什麼都看不出來。
 *
 * 存的是整組級分（六科＋英聽），不是算出來的結果——資料每年會更新，
 * 存結果會過期，存成績才永遠能重算。
 *
 * 排序依「考試日期」而不是存檔時間：學生很可能同一天把前幾次模擬考一起補存，
 * 照存檔順序會把先打的那筆當成最新，結論整個反過來（明明進步卻說你退步了）。
 *
 * 可上校系數要和報告區 KPI 的「穩上＋可上」同一個定義，不能用 poolCount()：
 * poolCount 刻意排除「沒有篩選門檻」的校系（那種系人人都過一階、分數變了也不會變，
 * 它是給「多 1 級分最划算」用的）。兩個數字並排卻不一樣，看的人只會以為有一邊算錯。
 *
 * 效能：poolOf 要掃 2240 個校系，一次 render 會用到四次。所以
 *   ① 同一組（成績＋英聽＋篩選條件）的結果記在 MEMO 裡不重算
 *   ② render 做防抖，使用者連點六科下拉時只重算一次（原本會算六次）
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

/* ---------- 資料（分科那支也用同一套，不要各寫一份，不然 bug 要修兩次）---------- */
// ok(r) 判斷一筆紀錄是不是完整的——學測看 sc，分科看 a60，所以由呼叫端決定。
function makeStore(key,ok){
  return {
    load:function(){
      try{
        const v=JSON.parse(localStorage.getItem(key)||'[]');
        if(!Array.isArray(v))return [];
        // 舊版沒有考試日期欄位，補一個，不然排序和列表會是空白
        return v.filter(r=>r&&ok(r)).map(function(r){
          if(!r.at)r.at=r.saved?new Date(r.saved).toISOString().slice(0,10):today();
          return r;
        });
      }catch(e){return []}
    },
    // 存不進去要讓使用者知道。無痕視窗、關掉網站資料、容量滿都會失敗，
    // 原本吞掉例外還照樣跳「已存」，使用者會以為存好了，其實什麼都沒有。
    store:function(a){
      try{localStorage.setItem(key,JSON.stringify(a));return true}catch(e){return false}
    }
  };
}
const DB=makeStore(KEY,r=>Array.isArray(r.sc));
const load=DB.load,store=DB.store;
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

// 掃 2240 系很慢，同一組條件只算一次。篩選條件變了就換一個 key，等於自動失效。
const MEMO={};
const filterKey=()=>JSON.stringify([L.st.g,L.st.r,L.st.sp]);
// lt＝那一次的英聽等級，要用該筆紀錄自己的，不是現在輸入欄裡的
function poolOf(sc,lt){
  const k=filterKey()+'|'+JSON.stringify(sc)+'|'+(lt||'');
  if(k in MEMO)return MEMO[k];
  let out=null;
  try{
    if(!L.inPool||!L.judgeWith)out=L.poolCount?L.poolCount(sc):null;
    else{
      let n=0;
      for(const d of L.D){
        if(!L.inPool(d))continue;
        const j=L.judgeWith(d,sc,lt==null?L.st.lt:lt);
        if(j&&(j.cat==='safe'||j.cat==='good'))n++;
      }
      out=n;
    }
  }catch(e){out=null}
  MEMO[k]=out;
  return out;
}

/* ---------- 存檔 ---------- */
function add(){
  const sc=L.st.sc.slice();
  if(!sc.some(v=>v!=null)){L.toast('先在上面填級分，才有東西可以存');return}
  const a=load();
  if(a.length>=MAX){L.toast('紀錄最多 '+MAX+' 筆，先刪掉用不到的再存');return}
  const el=$('snapName'),dt=$('snapDate');
  const name=((el&&el.value.trim())||defaultName()).slice(0,30);
  const at=(dt&&/^\d{4}-\d{2}-\d{2}$/.test(dt.value))?dt.value:today();
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
// 現在輸入欄裡這組成績，是不是任何一筆紀錄都沒有
function unsaved(a){
  const sc=L.st.sc,lt=L.st.lt||null;
  if(!sc.some(v=>v!=null))return false;
  return !a.some(r=>(r.lt||null)===lt&&r.sc.length===sc.length&&r.sc.every((v,i)=>v===sc[i]));
}

/* ---------- 趨勢 ---------- */
/* 走勢折線。pts＝[{name, v, txt}]，opts.lowerBetter＝數字越小越好（例如「全國前 X%」）。
   畫的時候「好」永遠在上面，所以 lowerBetter 的要上下顛倒。分科那支也用這個。 */
function spark(pts,opts){
  opts=opts||{};
  pts=(pts||[]).filter(p=>p&&p.v!=null&&isFinite(p.v));
  if(pts.length<2)return '';
  const low=!!opts.lowerBetter;
  const vs=pts.map(p=>p.v);
  let lo=Math.min(...vs),hi=Math.max(...vs);
  if(hi-lo<1e-9){lo=lo-1;hi=hi+1}
  const W=100,H=34,pad=3;
  const xy=pts.map(function(p,i){
    const px=pad+i*(W-pad*2)/(pts.length-1);
    const f=(p.v-lo)/(hi-lo);                       // 0＝最小、1＝最大
    const py=pad+(low?f:1-f)*(H-pad*2);             // 好的畫在上面
    return [px,py];
  });
  const a=pts[0].v,b=pts[pts.length-1].v;
  const better=low?b<a:b>a, worse=low?b>a:b<a;
  const col=better?'var(--safe,#1e8e4e)':worse?'var(--no,#c0392b)':'var(--gold,#c69e46)';
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" '+
    'aria-label="'+esc(opts.label||'走勢')+'，從 '+esc(pts[0].txt)+' 到 '+esc(pts[pts.length-1].txt)+'" '+
    'style="width:100%;max-width:420px;height:46px;display:block;margin:6px 0">'+
    '<polyline fill="none" stroke="'+col+'" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="'+
    xy.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'"/>'+
    xy.map((p,i)=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="1.8" fill="'+col+'" vector-effect="non-scaling-stroke"><title>'+
      esc(pts[i].name)+'：'+esc(pts[i].txt)+'</title></circle>').join('')+
    '</svg>';
}
// 學測用的是「全國前 X%」，數字越小越前面
function sparkLD(a){
  return spark(a.map(function(r){const t=topOf(r.sc);return t?{name:r.name,v:t.pc,txt:pcTxt(t.pc)}:null}).filter(Boolean),
               {lowerBetter:true,label:'全國位置走勢'});
}
// 各科從第一次到最新進步幾級——學生最想知道的是「我數學到底有沒有在動」
function bySubject(f,n){
  const items=SUBJ.map((s,i)=>{
    if(f.sc[i]==null||n.sc[i]==null)return null;
    return [AB[i],n.sc[i]-f.sc[i]];
  }).filter(Boolean);
  if(!items.length)return '';
  return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">'+items.map(x=>{
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
  const tf=topOf(f.sc),tn=topOf(n.sc);
  const pf=poolOf(f.sc,f.lt),pn=poolOf(n.sc,n.lt);
  let line='';
  if(tf&&tn&&tf.nm===tn.nm)line='全國位置 '+pcTxt(tf.pc)+' → <b>'+pcTxt(tn.pc)+'</b>';
  if(pf!=null&&pn!=null)line+=(line?'　｜　':'')+'可上的校系 '+pf+' → <b>'+pn+'</b> 個';
  return '<div style="margin-top:16px">'+
    '<div class="lbl">整體走勢：'+esc(f.name)+' 到 '+esc(n.name)+'（共 '+a.length+' 次）</div>'+
    sparkLD(a)+bySubject(f,n)+
    (line?'<div>'+line+'</div>':'')+
    '<p class="note" style="margin-top:4px">線往上走＝全國排名往前。<span class="snap-ui">圓點可以停上去看是哪一次。</span>'+
    '模擬考範圍每次都不一樣，級分不是同一把尺，看趨勢不要看單點。</p></div>';
}

/* ---------- 離目標還差多少 ---------- */
// 用「我的志願」第一個當目標。這是把紀錄和真正想上的系連起來的地方：
// 進步幾級分很抽象，「離台大資工還差 1.5 級」才是學生真的在問的事。
function goal(a){
  const codes=L.st.wish||[];
  if(!codes.length)
    return '<div class="note" style="margin-top:14px">把想讀的系放進下面的「我的志願」，這裡就會告訴你離它還差幾級分、每次模擬考有沒有拉近。</div>';
  const d=L.D.find(x=>x.c===codes[0]);
  if(!d||!d.p||!d.p.length||!d.pr||!d.pr.length||d.pr[0][0]==null)
    return '<div class="note" style="margin-top:14px">你排第一的那個系沒有可以比較的歷年門檻，換一個志願排第一就看得到進度。</div>';
  const nm=d.p[0][0].map(i=>AB[i]).join('');
  const one=r=>{try{return L.judgeWith(d,r.sc,r.lt)||null}catch(e){return null}};
  const n=a.length?one(a[a.length-1]):null;
  const o=a.length>1?one(a[a.length-2]):null;
  if(!n)return '';
  // 檢定沒過是硬門檻：總級分再高也會被刷掉，這時候更要講，不能整塊不顯示。
  if(n.cat==='fail')
    return '<div class="callout" style="margin-top:14px">🎯 你排第一的 <b>'+esc(d.s)+' '+esc(d.n)+'</b>：'+
      '<b style="color:var(--no,#c0392b)">'+esc(n.why||'檢定沒過')+'</b>。'+
      '檢定是硬門檻，沒過的話總級分再高也會被刷掉，這一科要優先補。'+
      '<div class="note" style="margin-top:4px">檢定標準是「頂標／前標／均標」這種全國位置，不是固定級分，每年會動。</div></div>';
  if(n.cat==='miss')
    return '<div class="callout" style="margin-top:14px">🎯 你排第一的 <b>'+esc(d.s)+' '+esc(d.n)+'</b>：'+
      esc(n.mw||'還有科目沒填')+'，所以算不出離它還差多少。把那一科的級分補上去就看得到。</div>';
  if(n.m==null)return '';
  const gap=n.m;                                   // 正＝已經超過門檻，負＝還差
  const now=gap>=0?'已經高出 <b>'+gap.toFixed(1)+'</b> 級'
                  :'還差 <b>'+Math.abs(gap).toFixed(1)+'</b> 級';
  let move='';
  if(o&&o.m!=null){
    const dm=+(n.m-o.m).toFixed(1);
    if(dm>0)move='　比上一次拉近了 <b style="color:var(--safe,#1e8e4e)">'+dm+'</b> 級';
    else if(dm<0)move='　比上一次退了 <b style="color:var(--no,#c0392b)">'+Math.abs(dm)+'</b> 級';
    else move='　和上一次一樣';
  }else if(o&&o.cat==='fail'){
    // 上次卡在檢定、這次過了，是最值得講的好消息，不要默默跳過
    move='　<b style="color:var(--safe,#1e8e4e)">上一次還卡在「'+esc(o.why||'檢定')+'」，這次檢定過了</b>';
  }
  const pt=n.p==null?'':'　一階通過機率約 <b>'+Math.round(n.p*100)+'%</b>'+
    (o&&o.p!=null?'（上一次 '+Math.round(o.p*100)+'%）':'');
  return '<div class="callout" style="margin-top:14px">'+
    '🎯 你排第一的 <b>'+esc(d.s)+' '+esc(d.n)+'</b>：第一關看 '+esc(nm)+'，'+
    '門檻大約 '+d.pr[0][0].toFixed(1)+' 級，你'+now+'。'+move+pt+
    '<div class="note" style="margin-top:4px">門檻是近 '+d.pr[0][1]+' 年換算後的平均，今年會上下浮動，當方向看就好。</div></div>';
}

/* ---------- 比較 ---------- */
const arrow=d=>d>0?'<b style="color:var(--safe,#1e8e4e)">▲ '+d+'</b>':d<0?'<b style="color:var(--no,#c0392b)">▼ '+Math.abs(d)+'</b>':'<span class="note">—</span>';
function picker(a,o,n){
  const opt=sel=>a.map(r=>'<option value="'+r.id+'"'+(r.id===sel.id?' selected':'')+'>'+esc(r.name)+'</option>').join('');
  return '<div class="lbl snap-ui">比較：</div><div class="snap-ui" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
    '<select id="snapA" style="flex:0 1 auto;max-width:46%">'+opt(o)+'</select><span>對</span>'+
    '<select id="snapB" style="flex:0 1 auto;max-width:46%">'+opt(n)+'</select></div>';
}
function cmpBlock(a){
  if(a.length<2)return '';
  const byId=id=>a.find(x=>x.id===id);
  const o=byId(pickA)||a[a.length-2];
  const n=byId(pickB)||a[a.length-1];
  if(o.id===n.id)return '<div style="margin-top:16px">'+picker(a,o,n)+'<div class="note" style="margin-top:8px">比較的兩次是同一筆，換一個就會出現比較表。</div></div>';
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
  return '<div style="margin-top:16px">'+picker(a,o,n)+
    '<div style="overflow-x:auto;margin-top:8px"><table class="t"><tr><th class="l">科目</th><th>'+esc(o.name)+'</th><th>'+esc(n.name)+'</th><th>變化</th></tr>'+rows+
    '<tr><td class="l"><b>全國位置</b></td><td>'+pcTxt(to&&to.pc)+'</td><td>'+pcTxt(tn&&tn.pc)+'</td><td>'+(same?arrow(tn.sum-to.sum)+' 級分':'<span class="note">科目組合不同</span>')+'</td></tr>'+
    '<tr><td class="l"><b>可上的校系</b></td><td>'+(po==null?'—':po+' 個')+'</td><td>'+(pn==null?'—':pn+' 個')+'</td><td>'+((po!=null&&pn!=null)?arrow(pn-po)+' 個':'—')+'</td></tr>'+
    '</table></div>'+
    (say?'<div class="callout" style="margin-top:8px">'+say+'</div>':'')+
    '<p class="note" style="margin-top:6px">「可上的校系」是機率 55% 以上、而且符合你現在選的學群與地區的數量，兩次都用同一組條件算。</p></div>';
}

/* ---------- 畫面 ---------- */
function render(){
  const box=$('snapBox');if(!box)return;
  const a=sorted(load());
  box.dataset.empty=a.length?'0':'1';
  const warn=unsaved(a)?'<div class="callout snap-ui" style="margin-top:10px">上面這組成績還沒有存起來。按「存下現在這組成績」才留得住，重新整理或改分數就沒了。</div>':'';
  const list=a.length?('<div style="overflow-x:auto;margin-top:10px"><table class="t"><tr><th class="l">紀錄</th><th>考試日期</th><th>級分</th><th>全國位置</th><th class="snap-ui"></th></tr>'+
    a.map(r=>{const t=topOf(r.sc);
      return '<tr><td class="l">'+esc(r.name)+'</td><td style="white-space:nowrap">'+esc(r.at)+'</td><td>'+
        SUBJ.map((s,i)=>r.sc[i]==null?'':AB[i]+r.sc[i]).filter(Boolean).join(' ')+(r.lt?' 英聽'+r.lt:'')+'</td><td>'+pcTxt(t&&t.pc)+'</td>'+
        '<td class="snap-ui" style="white-space:nowrap"><button class="btn ghost" data-snap-apply="'+r.id+'">套用</button> '+
        '<button class="btn ghost" data-snap-del="'+r.id+'">刪除</button></td></tr>'}).join('')+
    '</table></div>'+(a.length>=MAX?'<p class="note snap-ui" style="margin-top:6px">已經存到上限 '+MAX+' 筆，要再存請先刪掉用不到的。</p>':''))
    :'<div class="empty snap-ui" style="margin-top:10px">還沒有紀錄。填好這次模擬考的級分，按上面的按鈕存起來，下次考完再存一次就能比較。</div>';
  box.innerHTML='<h2>📈 模擬考紀錄 <small class="snap-ui">存起來，下次考完就看得出有沒有在往上</small></h2>'+
    '<div class="snap-ui" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">'+
    '<input id="snapName" type="text" maxlength="30" placeholder="例如：11月模擬考（一～三冊）" style="flex:1 1 200px;min-width:0;padding:8px 10px;border:1px solid var(--line,#dfd8c8);border-radius:8px;font-family:inherit;font-size:15px">'+
    '<input id="snapDate" type="date" value="'+today()+'" aria-label="考試日期" style="flex:0 1 auto;padding:8px 10px;border:1px solid var(--line,#dfd8c8);border-radius:8px;font-family:inherit;font-size:15px">'+
    '<button class="btn navy" id="snapAdd">存下現在這組成績</button></div>'+
    '<p class="note snap-ui" style="margin-top:4px">日期填那次模擬考考的時間。補存以前的場次時記得改，順序是照考試日期排的。</p>'+
    warn+list+trend(a)+goal(a)+cmpBlock(a)+
    '<p class="note snap-ui" style="margin-top:8px">紀錄只存在這台裝置的瀏覽器裡，不會上傳，手機和電腦不互通。存的是級分本身，所以資料更新後重新套用一次，算出來的都是最新的。</p>';
}
// 使用者連點六科下拉時，原本會重算六次（一次掃 2240 系）。合併成一次。
let timer=null;
function later(ms){clearTimeout(timer);timer=setTimeout(render,ms||150)}
// 列印給家長看的時候，家長要看的就是「有沒有在進步」，所以走勢和目標要印出來，
// 但輸入框、套用／刪除按鈕、比較下拉這些操作介面不該出現在紙上。
// 一筆紀錄都沒有時整塊不印，免得版面多一塊空的。
function printCSS(boxId){
  const id=boxId||'snapBox',sid='snapPrintCSS_'+id;
  if($(sid))return;
  const s=document.createElement('style');
  s.id=sid;
  s.textContent='@media print{#'+id+' .snap-ui{display:none!important}'+
    '#'+id+'[data-empty="1"]{display:none!important}'+
    '#'+id+' .btn,#'+id+' select,#'+id+' input{display:none!important}'+
    '#'+id+' svg{max-width:340px}}';
  document.head.appendChild(s);
}
function mount(){
  const anchor=$('input');if(!anchor)return;
  let box=$('snapBox');
  if(!box){
    box=document.createElement('section');
    box.id='snapBox';box.className='panel';
    anchor.parentNode.insertBefore(box,anchor.nextSibling);
  }
  printCSS();
  render();
}
document.addEventListener('click',function(e){
  const t=e.target;if(!t||!t.closest)return;
  if(t.closest('#snapAdd')){add();return}
  const ap=t.closest('[data-snap-apply]');if(ap){apply(ap.getAttribute('data-snap-apply'));later(200);return}
  const dl=t.closest('[data-snap-del]');if(dl){del(dl.getAttribute('data-snap-del'));return}
  // 換學群／地區、或動了「我的志願」，都會影響可上校系數與目標進度
  if(t.closest('#gchips,#rchips,[data-w]'))later(200);
});
document.addEventListener('change',function(e){
  const t=e.target;if(!t)return;
  if(t.id==='snapA'||t.id==='snapB'){
    pickA=$('snapA')?$('snapA').value:null;
    pickB=$('snapB')?$('snapB').value:null;
    render();return;
  }
  if(t.id==='spOn'){later(200);return}
  if(t.closest&&t.closest('#scores'))later(150);
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.__SNAP={load:load,sorted:sorted,add:add,apply:apply,topOf:topOf,poolOf:poolOf,render:render,unsaved:unsaved,MAX:MAX};
// 分科那支共用這些，不要各寫一份
window.__SNAPLIB={makeStore:makeStore,sorted:sorted,arrow:arrow,printCSS:printCSS,
                  esc:esc,today:today,MAX:MAX,spark:spark};
})();
