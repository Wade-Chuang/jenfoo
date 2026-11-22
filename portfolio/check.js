/* 備審小幫手：① 送出前最後檢查（匯出頁）② 像範本自檢＋朗讀校稿（寫作頁）
 *
 * 為什麼要這一支：
 *   學生最常出事的不是「寫得不好」，是「送錯」——給 A 校的稿忘記把校名改成 B 校、
 *   官方必備的那一項沒寫、超過分則規定的字數、或是漏了「AI 使用聲明」這份表。
 *   116 學年度的分則裡有 87 處提到 AI 使用聲明，學生幾乎不會自己翻到。
 *   這些都是「送出前一分鐘可以救」的錯，所以集中成一塊紅綠燈。
 *
 * 像範本自檢不是在判斷有沒有用 AI（做不到，也不該假裝做得到），
 * 是把「誰都能寫的句子」標出來。判斷依據寫在 TMPL 和三個結構訊號裡。
 *
 * 依賴主程式全域：S, SECTIONS, SECNAME, analyze, countChars, esc, $, toast, deptCore
 */
(function(){
const SECK=['reflect','motive','plan','multi'];
const CODE={reflect:'O',motive:'P',plan:'Q',multi:'N'};
const cur=()=>{const sel=$('#exportTarget');return sel?S.targets.find(x=>x.id===sel.value):null};

/* ===================== ① 送出前最後檢查 ===================== */
// 回傳 [等級, 標題, 說明]；等級 0=一定要改 1=請確認 2=提醒
// 草稿一定要從傳進來的 t 取（不要回頭讀下拉選單：選單還沒填好時會整批讀成空字串，
// 變成「必備項目沒寫」的誤報，同時漏掉校名寫錯這種真正要擋的錯）
function audit(t){
  const out=[],r=t.rv,tc=t.tc,D=S.drafts[t.id]||{};
  const txtOf=k=>(D[k]&&D[k].text)||'';
  const all=SECK.map(k=>[k,txtOf(k)]);
  const note=[r&&r.nt,r&&r.ot,r&&(r.ws||[]).join('　'),tc&&tc.un,tc&&tc.en].filter(Boolean).join('　');

  // 1. 別的志願的校名／系名跑到這一篇裡（最致命，而且最常發生）
  const others=S.targets.filter(x=>x.id!==t.id);
  all.forEach(function(p){
    const k=p[0],s=p[1];
    if(!s)return;
    others.forEach(function(o){
      if(o.school&&o.school!==t.school&&s.indexOf(o.school)>=0)
        out.push([0,'「'+SECNAME[k]+'」裡出現「'+o.school+'」','這一篇是要給 '+t.school+' 的。複製別的志願的稿子時最容易漏掉校名，一定要改。']);
      const dc=deptCore(o.dept||'');
      if(dc.length>=3&&dc!==deptCore(t.dept||'')&&s.indexOf(dc)>=0)
        out.push([1,'「'+SECNAME[k]+'」裡出現「'+dc+'」','這是 '+o.school+o.dept+' 的系名。如果是故意提到的（例如比較兩個方向）可以留，否則要改掉。']);
    });
  });

  // 2. 範例或佔位文字沒改到
  const PH=['範例大學','範例科技大學','（範例）','○○','××','ＸＸ','XX大學','某大學'];
  all.forEach(function(p){
    const hit=PH.filter(x=>p[1].indexOf(x)>=0);
    if(hit.length)out.push([0,'「'+SECNAME[p[0]]+'」還留著「'+hit[0]+'」','這是範例或佔位的字，送出前一定要換成真的名稱。']);
  });

  // 3. 官方必備的項目還沒寫（依分則 req 欄）
  if(r&&(r.req||[]).length){
    SECK.forEach(function(k){
      if((r.req||[]).indexOf(CODE[k])<0)return;
      const n=countChars(txtOf(k));
      if(n<100)out.push([0,CODE[k]+' '+SECNAME[k]+'是這個系的必備項目',n?('現在只有 '+n+' 字，等於沒有交。'):'還完全沒寫。必備項目沒上傳，審查分數會直接受影響。']);
    });
  }

  // 4. 超過官方字數（分則明寫的，不是我們預設的 800）
  if(r&&r.lim){
    SECK.forEach(function(k){
      const L=r.lim[CODE[k]];if(!L)return;
      const n=countChars(txtOf(k));
      if(n>L)out.push([0,'「'+SECNAME[k]+'」超過分則規定 '+(n-L)+' 字','這個系規定 '+L+' 字以內，你現在 '+n+' 字。超字數有的系會直接不計分。']);
    });
  }

  // 5. AI 使用聲明（116 分則有 87 處提到，學生不會自己翻到）
  if(/AI|人工智慧/.test(note)){
    const sent=note.split(/[。\n　]/).filter(x=>/AI|人工智慧/.test(x)).slice(0,2);
    out.push([1,'這個系有提到 AI 使用聲明／AI 相關規定',
      (sent.length?'分則原文：'+sent.map(x=>'「'+x.trim()+'」').join('　')+' ':'')+'這通常是另外一份表，要自己下載填好上傳，不在備審正文裡。到「目標校系」看完整原文。']);
  }

  // 6. 件數上限（引用分則原文，不自己換算）
  const cnt=note.match(/[^。\n　]{0,18}(?:至多|最多)\s*\d+\s*件[^。\n　]{0,12}/g);
  if(cnt){
    const uniq=[];cnt.forEach(x=>{if(uniq.indexOf(x)<0)uniq.push(x)});
    out.push([2,'分則有寫件數上限','原文：'+uniq.slice(0,3).map(x=>'「'+x.trim()+'」').join('　')]);
  }
  if(tc&&tc.upl){
    const u=Object.keys(tc.upl).map(k=>k+' 最多 '+tc.upl[k]+' 件').join('、');
    if(u)out.push([2,'上傳件數上限（115 簡章）',u+'。勾超過會被退件或只採計前幾件。']);
  }

  // 7. 還沒寫完的段落（必備的已經在第 3 條講過）
  SECK.forEach(function(k){
    if(r&&(r.req||[]).indexOf(CODE[k])>=0)return;
    const n=countChars(txtOf(k));
    if(!n||n>=100)return;                                   // 完全沒動的不算「沒寫完」
    out.push([1,'「'+SECNAME[k]+'」只有 '+n+' 字','寫了但沒寫完，比空著更可惜。補到一百字以上再送。']);
  });

  // 8. 健檢還在紅燈
  SECK.forEach(function(k){
    const d=S.drafts[t.id]&&S.drafts[t.id][k];if(!d)return;
    const a=analyze(t,d,k);if(!a)return;
    if(a.score<60)out.push([1,'「'+SECNAME[k]+'」健檢還是紅燈（'+a.score+' 分）','到「寫作」頁照健檢的提示再修一輪，紅燈通常是因為沒有具體例子。']);
  });

  // 9. 這個系的名字一次都沒出現
  const dc=deptCore(t.dept||''),mo=txtOf('motive');
  if(dc&&mo&&mo.indexOf(dc)<0&&mo.indexOf('貴系')<0)
    out.push([1,'就讀動機裡沒有出現這個系的名字','教授最怕看到「每一系都能投」的動機。至少要寫出系名和一門課名。']);

  // 10. 名字
  if(!String(S.name||'').trim())out.push([2,'還沒填自己的名字','到首頁填，匯出的 Word 和列印稿上面才會有名字。']);

  // 11. 繳件倒數
  const due=(r&&r.due)||(tc&&tc.due);
  if(due){
    const s=String(due);
    let iso=null,m=s.match(/(\d{3})\D+(\d{1,2})\D+(\d{1,2})/);
    if(m)iso=(+m[1]+1911)+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');
    else{m=s.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);if(m)iso='2027-'+String(m[1]).padStart(2,'0')+'-'+String(m[2]).padStart(2,'0')}
    if(iso){
      const t0=new Date();t0.setHours(0,0,0,0);
      const dd=Math.round((new Date(iso+'T00:00:00')-t0)/864e5);
      if(dd>=0)out.push([dd<=14?1:2,'繳件截止還有 '+dd+' 天（'+s+'）','備審上傳截止日比甄試日早一個星期左右，最容易記錯的就是這一天。']);
      else out.push([2,'分則上的繳件截止日是 '+s,'這是上一個年度的日期，新簡章公布後會更新。']);
    }
  }
  return out;
}

const LV=[['要改','#c0392b','🔴'],['請確認','#d98c00','🟠'],['提醒','#5b6b86','ℹ️']];
function panel(){
  const t=cur();if(!t)return'';
  const rows=audit(t).sort((a,b)=>a[0]-b[0]);
  const bad=rows.filter(x=>x[0]===0).length,ask=rows.filter(x=>x[0]===1).length;
  const head=bad?'<b style="color:#c0392b">有 '+bad+' 件一定要改</b>'+(ask?'，另外 '+ask+' 件請確認':'')
    :ask?'<b style="color:#d98c00">沒有致命錯誤，有 '+ask+' 件請確認</b>'
    :'<b style="color:#1e8e4e">都檢查過了，可以送 ✅</b>';
  return '<div class="card" id="chkCard" style="margin-top:14px;padding:13px 15px;background:var(--paper,#fbf8f1)">'+
    '<div class="row" style="gap:8px;flex-wrap:wrap"><b>🚦 送出前最後檢查</b><span class="sp"></span><span class="muted">'+esc(t.school)+' '+esc(t.dept)+'</span></div>'+
    '<div style="margin-top:6px">'+head+'</div>'+
    rows.map(function(x){const L=LV[x[0]];
      return '<div style="margin-top:8px;padding-left:22px;position:relative;font-size:14px">'+
        '<span style="position:absolute;left:0;top:0">'+L[2]+'</span>'+
        '<b style="color:'+L[1]+'">'+esc(x[1])+'</b><div class="muted" style="margin-top:1px">'+esc(x[2])+'</div></div>'}).join('')+
    '<p class="muted" style="margin-top:10px;font-size:12.5px">檢查的是最容易出事的地方：校名改到了沒、必備項目有沒有交、字數有沒有超、AI 使用聲明有沒有填。內容好不好請看「寫作」頁的健檢。規定一律以簡章與各校系準備指引為準。</p></div>';
}
function mount(){
  const host=$('#exportCheck');if(!host)return;
  let c=document.getElementById('chkWrap');
  if(!c){c=document.createElement('div');c.id='chkWrap';host.parentNode.insertBefore(c,host.nextSibling)}
  c.innerHTML=panel();
}

/* ===================== ② 像範本自檢 ===================== */
const TMPL=[
 ['整齊的對仗句',/不僅[^。\n]{0,30}(?:更|也|還)|既[^。\n]{0,20}又|不但[^。\n]{0,30}而且|一方面[^。\n]{0,30}另一方面|藉由[^。\n]{0,20}使我/g,
  '這種左右對稱的句子看起來漂亮，但是每一本範本都這樣寫。改成一句話講一件事。'],
 ['範本開場',/隨著[^。\n]{0,20}的(?:發展|進步|興起|普及)|在當今(?:社會|世界|時代)|身為一(?:名|位)|眾所(?:皆|週|周)知|俗話說|古人(?:云|曾說)|常言道/g,
  '開頭就用這種大詞，教授會直接跳過。第一句改成一個只有你會寫的場景。'],
 ['抽象形容',/核心素養|跨領域整合|多元視角|國際視野|接軌國際|軟實力|團隊合作精神|溝通協調能力|批判性思維|批判思考能力|自主學習能力|終身學習|全人發展|賦能|深耕/g,
  '這些詞沒有畫面。與其說「培養團隊合作精神」，不如寫那次意見不合時你做了什麼。'],
 ['萬用句',/充滿熱情|奠定(?:良好|扎實|紮實)?基礎|打下(?:扎實|紮實)基礎|成為更好的自己|發揮所長|貢獻(?:社會|國家)|回饋社會|不遺餘力|追求卓越|精進自我/g,
  '這些句子貼到任何科系、任何人身上都成立，等於沒有資訊。刪掉不會變差。']
];
function tmplCheck(txt){
  const n=countChars(txt),hits=[];
  if(n<80)return null;
  TMPL.forEach(function(x){
    const m=txt.match(x[1]);if(!m)return;
    const uniq=[];m.forEach(w=>{if(uniq.indexOf(w)<0)uniq.push(w)});
    hits.push([x[0],uniq.slice(0,3),x[2]]);
  });
  const sents=txt.split(/[。！？\n]/).map(s=>countChars(s.trim())).filter(x=>x>3);
  if(sents.length>=6){
    const mean=sents.reduce((a,b)=>a+b,0)/sents.length;
    const sd=Math.sqrt(sents.reduce((a,b)=>a+(b-mean)*(b-mean),0)/sents.length);
    if(mean>0&&sd/mean<0.3)hits.push(['每句都差不多長',[sents.length+' 句，平均 '+Math.round(mean)+' 字'],
      '句子長度太平均，讀起來像填格子。真人寫的東西會有長有短，重點的地方放一個短句最有力。']);
  }
  const hasNum=/[0-9０-９]/.test(txt)||/[一二兩三四五六七八九十百千]+\s*(?:分|名|人|次|小時|天|週|周|個月|件|篇|頁|位|場|組|題|年)/.test(txt);
  const hasProper=/「[^」]{2,12}」/.test(txt)||/(?:課|社|系|組|隊|館|室)/.test(txt);
  if(!hasNum)hits.push(['整篇沒有一個數字',['—'],'數字是最便宜的真實感：幾個人、幾小時、第幾名、進步幾分，有一個就差很多。']);
  else if(!hasProper)hits.push(['沒有專有名詞',['—'],'課名、社團名、書名、工具名——寫出至少一個別人抄不走的名字。']);
  const lv=hits.length>=4?2:hits.length>=2?1:hits.length?0:-1;
  return {hits:hits,lv:lv,n:n};
}
const TLV=[['有一點像','#5b6b86'],['有點像','#d98c00'],['很像','#c0392b']];
function tmplBlock(txt){
  const r=tmplCheck(txt);
  const read='<div class="row" style="margin-top:10px;gap:6px"><button class="btn ghost small" id="sayDraft">🔊 唸給我聽</button><span class="muted" style="font-size:12.5px">唸起來卡住的地方，就是要改的地方。</span></div>';
  if(!r)return '<div class="card" style="margin-top:16px"><h3 style="font-size:17px">🪞 像範本自檢</h3><p class="muted" style="margin-top:6px">寫到 80 字以上就會開始檢查「這幾句是不是誰都能寫」。</p>'+read+'</div>';
  const t=r.lv>=0?TLV[r.lv]:['看起來是你自己的話','#1e8e4e'];
  return '<div class="card" style="margin-top:16px"><div class="row"><h3 style="font-size:17px">🪞 像範本自檢</h3><span class="sp"></span><b style="color:'+t[1]+'">'+t[0]+'</b></div>'+
    (r.hits.length?r.hits.map(function(h){
      return '<div class="tip" style="margin-top:8px"><b>'+esc(h[0])+(h[1][0]!=='—'?'：'+h[1].map(w=>'「'+esc(w)+'」').join('、'):'')+'</b>'+esc(h[2])+'</div>'}).join('')
      :'<div class="tip good" style="margin-top:8px"><b>沒有抓到範本句 👍</b>再唸一遍，確認每一段都有一個具體的例子。</div>')+
    '<p class="muted" style="margin-top:10px;font-size:12.5px">這不是在判斷你有沒有用 AI——那種判斷沒人做得準。這裡只抓「換成任何人、任何科系都成立」的句子。'+
    '提醒：備審必須本人撰寫，而且不少校系另外要求填「AI 使用聲明」，在「目標校系」卡片裡可以看到原文。</p>'+read+'</div>';
}
let saying=false;
function sayBtn(label){const b=document.getElementById('sayDraft');if(b)b.textContent=label}
function say(txt){
  const sp=window.speechSynthesis;
  if(!sp){toast('這個瀏覽器不能朗讀，可以自己唸一遍');return}
  if(saying||sp.speaking){sp.cancel();saying=false;sayBtn('🔊 唸給我聽');return}
  const s=String(txt||'').trim();
  if(!s){toast('草稿還是空的');return}
  const u=new SpeechSynthesisUtterance(s.slice(0,1200));
  u.lang='zh-TW';u.rate=.95;
  const vs=sp.getVoices()||[];
  const v=vs.filter(x=>/zh[-_]TW/i.test(x.lang))[0]||vs.filter(x=>/^zh/i.test(x.lang))[0];
  if(v)u.voice=v;
  u.onend=u.onerror=function(){saying=false;sayBtn('🔊 唸給我聽')};
  saying=true;sp.speak(u);sayBtn('⏹ 停止朗讀');
}

/* ===================== 掛載 ===================== */
let lastTxt=null;
const _upd=window.updateDraftUI;
if(typeof _upd==='function')window.updateDraftUI=function(t,d){
  _upd.apply(this,arguments);
  try{
    const h=$('#health');if(!h)return;
    const card=h.closest('.card');if(!card)return;
    let w=document.getElementById('tmplWrap');
    if(!w){w=document.createElement('div');w.id='tmplWrap';card.parentNode.insertBefore(w,card.nextSibling);lastTxt=null}
    const txt=(d&&d.text)||'';
    if(txt!==lastTxt){lastTxt=txt;w.innerHTML=tmplBlock(txt)}
    const b=document.getElementById('sayDraft');
    if(b)b.onclick=function(){const ta=$('#draft');say((ta&&ta.value)||txt)};
  }catch(e){}
};
const safe=()=>{try{mount()}catch(e){}};
const _rx=window.renderExportCheck;
if(typeof _rx==='function')window.renderExportCheck=function(){_rx.apply(this,arguments);safe()};
const host=document.getElementById('exportCheck');
if(host)new MutationObserver(safe).observe(host,{childList:true});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='exportTarget')setTimeout(safe,0)});
window.addEventListener('hashchange',function(){if(location.hash==='#export')setTimeout(safe,0)});
if(location.hash==='#export')setTimeout(safe,200);
window.__CHK={audit:audit,tmplCheck:tmplCheck,panel:panel,mount:mount};
})();
