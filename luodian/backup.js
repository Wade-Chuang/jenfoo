/* 落點分析：換手機／換電腦時把資料帶過去
 *
 * 為什麼要這一支：
 *   所有東西都存在瀏覽器裡（這是刻意的——成績不上傳、不用註冊），
 *   代價就是換裝置什麼都沒有。學生在學校電腦算完、回家用手機看，是空的。
 *   模擬考紀錄存了半年，手機摔壞就全沒了。
 *
 *   備審小幫手早就有備份檔，落點這邊一直沒有，所以補上，而且三個工具
 *   （學測申請、分科分發、統測）的資料一起包，換裝置只要搬一個檔。
 *
 * 備份的是 localStorage 裡這幾把鑰匙的原始內容，不做任何轉換——
 * 轉換就會有版本相容問題，直接搬原件最不會出事。
 *
 * 依賴：window.__LD.toast（沒有就退回 alert）
 */
(function(){
// 加新的模擬考紀錄時，這兩行一定要一起加——漏了的話畫面會說「已備份」，
// 但那份資料其實沒有被包進去，學生換手機才會發現不見了。
const KEYS=['ld3','ldast','ld_snaps','ld_snaps_ast','tc1','ld_snaps_tc'];
const APP='jenfoo-luodian';
const NAME={ld3:'學測成績與志願',ldast:'分科成績與志願',ld_snaps:'學測模擬考紀錄',
            ld_snaps_ast:'分科模擬考紀錄',tc1:'統測成績與志願',ld_snaps_tc:'統測模擬考紀錄'};
const $=id=>document.getElementById(id);
const say=t=>{const L=window.__LD,T=window.__TC;
  if(L&&L.toast)L.toast(t);else if(T&&T.toast)T.toast(t);else alert(t)};

function grab(){
  const d={};
  KEYS.forEach(k=>{try{const v=localStorage.getItem(k);if(v!=null)d[k]=v}catch(e){}});
  return d;
}
function summary(){
  const d=grab(),out=[];
  Object.keys(d).forEach(k=>{
    let n='';
    try{
      const v=JSON.parse(d[k]);
      if(Array.isArray(v))n='（'+v.length+' 筆）';
      else if(v&&Array.isArray(v.wish))n='（志願 '+v.wish.length+' 個）';
    }catch(e){}
    out.push((NAME[k]||k)+n);
  });
  return out;
}
function today(){const x=new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}

function download(){
  const d=grab();
  if(!Object.keys(d).length){say('現在還沒有資料可以備份，先填成績或存一次模擬考紀錄');return}
  const blob=new Blob([JSON.stringify({app:APP,v:1,at:new Date().toISOString(),data:d},null,1)],
                      {type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='落點備份_'+today()+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  say('已下載備份檔，用 LINE 傳給自己就能在另一台讀回來');
}
// 抽成純函式，壞檔案的各種情況才測得到
function parseBackup(text){
  let o=null;
  try{o=JSON.parse(text)}catch(e){return{err:'這不是一個 JSON 檔。'}}
  if(!o||typeof o!=='object')return{err:'檔案內容不對。'};
  if(o.app!==APP)return{err:'這不是落點分析的備份檔。\n（備審小幫手的備份檔要到備審小幫手那邊讀。）'};
  if(!o.data||typeof o.data!=='object')return{err:'這個備份檔裡沒有資料。'};
  const has=Object.keys(o.data).filter(k=>KEYS.indexOf(k)>=0&&typeof o.data[k]==='string');
  if(!has.length)return{err:'這個備份檔裡沒有可以讀的資料。'};
  // 每一把鑰匙的內容都要是能解析的 JSON，不然寫進去會把工具弄壞
  for(const k of has){try{JSON.parse(o.data[k])}catch(e){return{err:'備份檔裡的「'+(NAME[k]||k)+'」壞掉了，沒有讀進去。'}}}
  return{ok:true,keys:has,at:String(o.at||''),data:o.data};
}
function restore(file){
  const r=new FileReader();
  r.onload=function(){
    const p=parseBackup(r.result);
    if(p.err){alert(p.err);return}
    const o={data:p.data,at:p.at},has=p.keys;
    if(!confirm('讀取備份會「取代」這台裝置上現在的落點資料：\n\n'+
                has.map(k=>'・'+(NAME[k]||k)).join('\n')+
                '\n\n備份時間：'+String(o.at||'').slice(0,10)+'\n\n確定要取代嗎？'))return;
    let bad=false;
    has.forEach(k=>{try{localStorage.setItem(k,o.data[k])}catch(e){bad=true}});
    if(bad){alert('有些資料寫不進去（瀏覽器不讓這個網站保存資料，無痕視窗常常這樣）。請換一般視窗再試。');return}
    alert('讀取完成，重新整理一次就會看到。');
    location.reload();
  };
  r.readAsText(file);
}

function html(id){
  const s=summary();
  return '<h2>💾 換手機、換電腦 <small>把資料帶過去</small></h2>'+
    '<p class="note" style="margin-top:6px">成績和模擬考紀錄都只存在你現在用的這台裝置裡（這樣才不用註冊、也不會上傳）。'+
    '換裝置、或怕手機摔壞，就下載一個備份檔，用 LINE 傳給自己，在另一台讀回來。</p>'+
    (s.length?'<p class="note" style="margin-top:6px">這台現在有：'+s.join('、')+'</p>'
             :'<p class="note" style="margin-top:6px">這台現在還沒有資料。</p>')+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'+
    '<button class="btn navy" data-bk-save>下載備份檔</button>'+
    '<label class="btn ghost" style="cursor:pointer">讀取備份檔'+
    '<input type="file" accept=".json,application/json" data-bk-load hidden></label></div>'+
    '<p class="note" style="margin-top:8px">備份檔裡只有你自己填的成績和志願，沒有名字也沒有聯絡方式。'+
    '讀取會蓋掉這台現在的資料，所以讀之前可以先下載一份現在的。</p>';
}
function mount(){
  // 申請入學、分科、統測三個畫面各放一塊（它們是互相隱藏的區塊，不會同時出現）
  [['bkApply','how'],['bkAst','aHow']].forEach(function(p){
    const anchor=$(p[1]);if(!anchor||$(p[0]))return;
    const el=document.createElement('section');
    el.id=p[0];el.className='panel no-print';
    el.innerHTML=html(p[0]);
    anchor.parentNode.insertBefore(el,anchor);
  });
}
function refresh(){['bkApply','bkAst'].forEach(id=>{const el=$(id);if(el)el.innerHTML=html(id)})}

let t=null;
const later=()=>{clearTimeout(t);t=setTimeout(refresh,400)};
document.addEventListener('click',function(e){
  const x=e.target;if(!x||!x.closest)return;
  if(x.closest('[data-bk-save]')){download();return}
  // 存了／刪了模擬考紀錄、或動了志願之後，「這台現在有什麼」要跟著更新
  if(x.closest('#snapAdd,[data-snap-del],[data-snap-apply],[data-w],.mode'))later();
});
addEventListener('storage',function(e){if(KEYS.indexOf(e.key)>=0)later()});
document.addEventListener('change',function(e){
  const t=e.target;
  if(!t||!t.matches||!t.matches('[data-bk-load]'))return;
  const f=t.files&&t.files[0];
  t.value='';
  if(f)restore(f);
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.__BK={grab:grab,summary:summary,download:download,parseBackup:parseBackup,
             KEYS:KEYS,APP:APP,mount:mount,refresh:refresh};
})();
