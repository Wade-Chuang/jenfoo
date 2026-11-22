// 學測落點分析：分享結果給家長＋更新通知
// 連結格式：#s=模式|學測15級分6科|英聽|學群.學群|地區.地區|特殊身分|學測60級分6科|分科8科（分科模式才有後兩段）
// 打開時由 <head> 的小程式先寫進 localStorage 再載入，所以學群、地區、分科成績都會還原。成績只在網址 # 後面，不會傳到伺服器。
(function(){
const L=window.__LD,AS=window.__AST,$=id=>document.getElementById(id);
function link(){const s=L.st,A=AS&&AS.A,ast=A&&A.mode==="ast";
  const parts=[ast?"ast":"apply",s.sc.map(v=>v==null?"":v).join(","),s.lt||"",(s.g||[]).join("."),(s.r||[]).join("."),s.sp?1:0];
  if(ast)parts.push(A.g60.map(v=>v==null?"":v).join(","),A.a60.map(v=>v==null?"":v).join(","));
  return location.href.split("#")[0]+"#s="+parts.join("|")}
function box(after,id){if($(id))return $(id);const d=document.createElement("div");d.id=id;d.className="no-print";d.hidden=true;d.style.marginTop="8px";
  d.innerHTML='<div class="note">把這個連結傳給家長，打開就會看到同一份結果（成績只放在連結裡，不會上傳到任何伺服器）：</div><input readonly onclick="this.select()" style="margin-top:4px;width:100%;font-size:13px;padding:6px 8px;border:1.5px solid var(--line);border-radius:8px">';
  after.parentElement.after(d);return d}
function addBtn(anchorId,boxId){const a=$(anchorId);if(!a||a.dataset.sh)return;a.dataset.sh=1;
  const b=document.createElement("button");b.className="btn ghost";b.textContent="🔗 分享結果給家長";b.style.marginLeft="8px";
  b.onclick=()=>{if(!L.st.sc.some(v=>v!=null)){L.toast("先輸入成績");return}const d=box(a,boxId),inp=d.querySelector("input");inp.value=link();d.hidden=false;inp.focus();inp.select();
    let ok=false;try{ok=document.execCommand("copy")}catch(e){}L.toast(ok?"連結已複製，貼給家長就能看到同一份結果":"連結已選取，請按 Ctrl+C（手機長按）複製")};
  a.after(b)}
function notice(afterId,ast){const a=$(afterId);if(!a||$(afterId+"_n"))return;const d=document.createElement("div");d.id=afterId+"_n";d.className="panel no-print";d.style.cssText="background:#eefaf2;border-color:#bfe6cc";
  d.innerHTML=ast?'<b>🔔 分科分發資料每年 7 月底更新</b><div class="note" style="margin:4px 0 8px">考分會每年 7 月底公布當年最低錄取分數，公布後本站會重新計算。加 LINE 官方帳號，更新時第一時間通知你，也可以直接問莊老師分發志願怎麼排。</div><a class="btn line" href="https://line.me/R/ti/p/@chuanglaomath" target="_blank" rel="noopener" style="background:#06c755;color:#fff;text-decoration:none">加 LINE @chuanglaomath 收更新通知</a>'
    :'<b>🔔 116 學測五標公布後，機率會更新</b><div class="note" style="margin:4px 0 8px">116 學測的五標和級分分布預計 2027 年 2 月下旬公布，公布後本站會重新計算（現在的檢定標準暫用 115 年五標）。加 LINE 官方帳號，更新時第一時間通知你，也可以直接問莊老師志願怎麼排。</div><a class="btn line" href="https://line.me/R/ti/p/@chuanglaomath" target="_blank" rel="noopener" style="background:#06c755;color:#fff;text-decoration:none">加 LINE @chuanglaomath 收更新通知</a>';
  a.after(d)}
addBtn("usePicks","shareBoxA");addBtn("aUsePick","shareBoxB");notice("wish",false);notice("aWish",true);
window.__SHARE={link};
})();
