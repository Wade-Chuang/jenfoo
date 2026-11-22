/* 學測落點：模擬考成績紀錄與比較
 *
 * 為什麼要這一支：
 *   高三一路要考好幾次模擬考，每次範圍都比上次大（第一二冊 → 第一到三冊 → 全範圍）。
 *   學生真正想知道的不是「這次幾級分」，是「我有沒有在往上」。
 *   原本的工具只存一組成績，換一組就把上一組蓋掉，看不出變化。
 *
 * 存的是整組級分（六科＋英聽），不是算出來的結果——因為資料每年會更新，
 * 存結果會過期，存成績才永遠能重算。
 *
 * 可上校系數用主程式的 poolCount()，它吃現在的學群／地區篩選。
 * 兩次用同一組篩選算，才比得起來，所以文案要寫明「符合你篩選條件的」。
 *
 * 依賴主程式全域匯出：window.__LD（st, save, all, toast, poolCount）與 window.LD_TOP
 */
(function(){
const L=window.__LD;
if(!L||!L.poolCount)return;
const KEY='ld_snaps';
const SUBJ=['國文','英文','數學A','數學B','社會','自然'];
const AB=['國','英','數A','數B','社','自'];
// 和主程式報告區同一組科目組合（官方只公布 2～4 科的人數累計表）
const COMBOS=[[0,1,2,5],[0,1,3,4],[0,1,2,4],[0,1,3,5],[0,1,2,3],[0,1,2],[0,1,3],[0,1,4],[0,1,5]];
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function store(a){try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){}}

function topOf(sc){
  const T=window.LD_TOP||{};
  const c=COMBOS.find(a=>a.every(i=>sc[i]!=null));
  if(!c)return null;
  const t=T[c.join(',')];if(!t)return null;
  const s=c.reduce((a,i)=>a+sc[i],0),v=t[s];
  return v==null?null:{pc:v,sum:s,nm:c.map(i=>AB[i]).join('')};
}
const pcTxt=v=>v==null?'—':'前 '+(v<1?v.toFixed(1):Math.round(v))+'%';
// 要和上面 KPI 的「穩上＋可上」用同一個定義，不能用 poolCount()：
// poolCount 刻意排除「沒有篩選門檻」的校系（那種系人人都過一階，分數變了也不會變，
// 它是給「多 1 級分最划算」用的）。兩個數字並排卻不一樣，看的人只會以為有一邊算錯。
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
function curScores(){return L.st.sc.slice()}
function hasAny(sc){return sc.some(v=>v!=null)}
function add(){
  const sc=curScores();
  if(!hasAny(sc)){L.toast('先在上面填級分，才有東西可以存');return}
  const el=$('snapName');
  const name=(el&&el.value.trim())||defaultName();
  const a=load();
  a.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),
          name:name.slice(0,30),at:new Date().toISOString().slice(0,10),sc:sc,lt:L.st.lt||null});
  store(a);
  if(el)el.value='';
  render();
  L.toast('已存「'+name+'」。下次考完再存一次就能比較');
}
function defaultName(){
  const d=new Date();
  return (d.getMonth()+1)+'/'+d.getDate()+' 模擬考';
}
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
  store(a.filter(x=>x.id!==id));render();
}

/* ---------- 比較 ---------- */
const arrow=d=>d>0?'<b style="color:var(--safe,#1e8e4e)">▲ '+d+'</b>':d<0?'<b style="color:var(--no,#c0392b)">▼ '+Math.abs(d)+'</b>':'<span class="note">—</span>';
function cmpBlock(a){
  if(a.length<2)return '';
  const o=a[a.length-2],n=a[a.length-1];           // 比最近兩次
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
  let say='';
  if(to&&tn&&to.nm===tn.nm){
    const ds=tn.sum-to.sum;
    say=ds>0?'這次 '+tn.nm+' 多了 '+ds+' 級分，全國位置從 '+pcTxt(to.pc)+' 進到 '+pcTxt(tn.pc)+'。'
      :ds<0?'這次 '+tn.nm+' 少了 '+Math.abs(ds)+' 級分。模擬考範圍每次都在變大，退一點很正常，看接下來能不能追回來。'
      :'兩次總級分一樣。';
    if(po!=null&&pn!=null&&pn!==po)
      say+='符合你篩選條件、機率 55% 以上的校系，從 '+po+' 個變成 '+pn+' 個。';
  }
  return '<div style="margin-top:14px">'+
    '<div class="lbl">最近兩次比較：'+esc(o.name)+' → '+esc(n.name)+'</div>'+
    '<div style="overflow-x:auto"><table class="t"><tr><th class="l">科目</th><th>'+esc(o.name)+'</th><th>'+esc(n.name)+'</th><th>變化</th></tr>'+rows+
    '<tr><td class="l"><b>全國位置</b></td><td>'+pcTxt(to&&to.pc)+'</td><td>'+pcTxt(tn&&tn.pc)+'</td><td>'+((to&&tn&&to.nm===tn.nm)?arrow(tn.sum-to.sum)+' 級分':'<span class="note">科目組合不同</span>')+'</td></tr>'+
    '<tr><td class="l"><b>可上的校系</b></td><td>'+(po==null?'—':po+' 個')+'</td><td>'+(pn==null?'—':pn+' 個')+'</td><td>'+((po!=null&&pn!=null)?arrow(pn-po)+' 個':'—')+'</td></tr>'+
    '</table></div>'+
    (say?'<div class="callout" style="margin-top:8px">'+say+'</div>':'')+
    '<p class="note" style="margin-top:6px">「可上的校系」是機率 55% 以上、而且符合你現在選的學群與地區的數量，兩次都用同一組條件算。'+
    '模擬考每次範圍不一樣，級分不能完全當成同一把尺，看趨勢就好。</p></div>';
}

/* ---------- 畫面 ---------- */
function render(){
  const box=$('snapBox');if(!box)return;
  const a=load();
  const list=a.length?('<div style="overflow-x:auto;margin-top:10px"><table class="t"><tr><th class="l">紀錄</th><th>日期</th><th>級分</th><th>全國位置</th><th></th></tr>'+
    a.map(r=>{const t=topOf(r.sc);
      return '<tr><td class="l">'+esc(r.name)+'</td><td>'+esc(r.at)+'</td><td>'+
        SUBJ.map((s,i)=>r.sc[i]==null?'':AB[i]+r.sc[i]).filter(Boolean).join(' ')+'</td><td>'+pcTxt(t&&t.pc)+'</td>'+
        '<td style="white-space:nowrap"><button class="btn ghost" data-snap-apply="'+r.id+'">套用</button> '+
        '<button class="btn ghost" data-snap-del="'+r.id+'">刪除</button></td></tr>'}).join('')+
    '</table></div>')
    :'<div class="empty" style="margin-top:10px">還沒有紀錄。填好這次模擬考的級分，按上面的按鈕存起來，下次考完再存一次就能比較。</div>';
  box.innerHTML='<h2>📈 模擬考紀錄 <small>存起來，下次考完就看得出有沒有在往上</small></h2>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">'+
    '<input id="snapName" type="text" placeholder="例如：11月模擬考（一～三冊）" style="flex:1 1 220px;min-width:0;padding:8px 10px;border:1px solid var(--line,#dfd8c8);border-radius:8px;font-family:inherit;font-size:15px">'+
    '<button class="btn navy" id="snapAdd">存下現在這組成績</button></div>'+
    list+cmpBlock(a)+
    '<p class="note" style="margin-top:8px">紀錄只存在這台裝置的瀏覽器裡，不會上傳。存的是級分本身，所以資料更新後重新套用一次，算出來的都是最新的。</p>';
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
// 改級分或換學群／地區之後，比較表裡的「可上的校系」要跟著重算
document.addEventListener('change',function(e){
  if(e.target&&e.target.closest&&e.target.closest('#scores'))setTimeout(render,80);
});
document.addEventListener('click',function(e){
  if(e.target&&e.target.closest&&e.target.closest('#gchips,#rchips'))setTimeout(render,120);
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.__SNAP={load:load,add:add,apply:apply,topOf:topOf,render:render};
})();
