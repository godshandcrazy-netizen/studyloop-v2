(() => {
  let initialized = false;
  let shownForThisLoad = false;

  function ensureModal(){
    let modal = document.getElementById('serverAnnouncementEntryModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'serverAnnouncementEntryModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.62);padding:20px;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="width:min(440px,100%);max-height:80vh;overflow:auto;background:#fff;color:#203037;border-radius:22px;padding:22px;box-shadow:0 18px 60px rgba(0,0,0,.35)">
        <div style="font-size:23px;font-weight:950;margin-bottom:14px">📢 서버 공지</div>
        <div id="serverAnnouncementEntryText" style="white-space:pre-wrap;line-height:1.65;font-size:17px"></div>
        <button id="serverAnnouncementEntryClose" style="width:100%;margin-top:20px;border:0;border-radius:13px;padding:13px 14px;font:inherit;font-weight:900;background:#22afe8;color:#fff">확인</button>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('serverAnnouncementEntryClose').onclick = () => { modal.style.display = 'none'; };
    return modal;
  }

  async function showLatest(force=false){
    try{
      if (typeof sb === 'undefined' || !sb) return;
      const {data:{session}} = await sb.auth.getSession();
      if (!session) return;
      if (shownForThisLoad && !force) return;

      const r = await sb.from('server_announcements')
        .select('id,message,created_at')
        .order('created_at',{ascending:false})
        .limit(1);
      if (r.error || !r.data?.length) return;

      shownForThisLoad = true;
      const modal = ensureModal();
      const text = document.getElementById('serverAnnouncementEntryText');
      if (text) text.textContent = r.data[0].message;
      modal.style.display = 'flex';
    } catch(e){
      console.warn('announcement entry popup', e);
    }
  }

  function init(){
    if (initialized) return;
    if (typeof sb === 'undefined' || !sb) { setTimeout(init,100); return; }
    initialized = true;

    showLatest(false);

    sb.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setTimeout(() => showLatest(false), 20);
      }
    });

    sb.channel('server-announcement-entry-popup-v2')
      .on('postgres_changes', {event:'INSERT',schema:'public',table:'server_announcements'}, () => {
        shownForThisLoad = false;
        showLatest(true);
      })
      .subscribe();
  }

  init();
})();