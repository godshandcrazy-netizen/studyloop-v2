(() => {
  let initialized=false, shownForThisLoad=false, currentNotice=null, currentUserId=null;
  const snoozeKey=(uid,id)=>`studyloop_notice_snooze_${uid}_${id}`;
  const snoozed=(uid,id)=>{
    const until=Number(localStorage.getItem(snoozeKey(uid,id))||0);
    if(!until)return false;
    if(until<=Date.now()){localStorage.removeItem(snoozeKey(uid,id));return false;}
    return true;
  };
  const hideLegacy=()=>{const x=document.getElementById('announcementPopup');if(x)x.style.display='none'};

  function ensureModal(){
    let modal=document.getElementById('serverAnnouncementEntryModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='serverAnnouncementEntryModal';
    modal.style.cssText='display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.62);padding:20px;align-items:center;justify-content:center;';
    modal.innerHTML=`<div style="width:min(440px,100%);max-height:80vh;overflow:auto;background:#fff;color:#203037;border-radius:22px;padding:22px;box-shadow:0 18px 60px rgba(0,0,0,.35)"><div style="font-size:23px;font-weight:950;margin-bottom:14px">📢 서버 공지</div><div id="serverAnnouncementEntryText" style="white-space:pre-wrap;line-height:1.65;font-size:17px"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px"><button id="serverAnnouncementSnooze" style="border:2px solid #d9e2e5;border-radius:13px;padding:13px 8px;font:inherit;font-weight:900;background:#f4f7f8;color:#34464c">1일 동안 안 보기</button><button id="serverAnnouncementEntryClose" style="border:0;border-radius:13px;padding:13px 8px;font:inherit;font-weight:900;background:#22afe8;color:#fff">확인</button></div></div>`;
    document.body.appendChild(modal);
    document.getElementById('serverAnnouncementEntryClose').onclick=()=>modal.style.display='none';
    document.getElementById('serverAnnouncementSnooze').onclick=()=>{
      if(currentNotice&&currentUserId)localStorage.setItem(snoozeKey(currentUserId,currentNotice.id),String(Date.now()+86400000));
      modal.style.display='none';hideLegacy();
    };
    return modal;
  }

  async function showLatest(force=false){
    try{
      hideLegacy();
      if(typeof sb==='undefined'||!sb)return;
      const {data:{session}}=await sb.auth.getSession();
      if(!session)return;
      currentUserId=session.user.id;
      if(shownForThisLoad&&!force)return;
      const r=await sb.from('server_announcements').select('id,message,created_at').order('created_at',{ascending:false}).limit(1);
      if(r.error||!r.data?.length)return;
      const latest=r.data[0];
      if(snoozed(currentUserId,latest.id)){shownForThisLoad=true;hideLegacy();return;}
      currentNotice=latest;shownForThisLoad=true;
      const modal=ensureModal(),text=document.getElementById('serverAnnouncementEntryText');
      if(text)text.textContent=latest.message;
      modal.style.display='flex';hideLegacy();
    }catch(e){console.warn('announcement entry popup',e)}
  }

  function init(){
    if(initialized)return;
    if(typeof sb==='undefined'||!sb){setTimeout(init,100);return}
    initialized=true;
    new MutationObserver(hideLegacy).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});
    showLatest(false);
    sb.auth.onAuthStateChange((event,session)=>{if(session&&(event==='SIGNED_IN'||event==='INITIAL_SESSION'))setTimeout(()=>showLatest(false),20)});
    sb.channel('server-announcement-entry-popup-v4').on('postgres_changes',{event:'INSERT',schema:'public',table:'server_announcements'},()=>{shownForThisLoad=false;showLatest(true)}).subscribe();
  }
  init();
})();