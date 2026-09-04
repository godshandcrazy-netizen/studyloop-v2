(() => {
  let shownAnnouncementId = null;
  let initialized = false;

  const escHtml = s => String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  function ensureModal(){
    let modal = document.getElementById('serverAnnouncementModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'serverAnnouncementModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.62);padding:20px;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="width:min(440px,100%);max-height:80vh;overflow:auto;background:#fff;color:#203037;border-radius:22px;padding:22px;box-shadow:0 18px 60px rgba(0,0,0,.35)">
        <div style="font-size:23px;font-weight:950;margin-bottom:14px">📢 서버 공지</div>
        <div id="serverAnnouncementModalText" style="white-space:pre-wrap;line-height:1.65;font-size:17px"></div>
        <button id="serverAnnouncementModalClose" style="width:100%;margin-top:20px;border:0;border-radius:13px;padding:13px 14px;font:inherit;font-weight:900;background:#22afe8;color:#fff">확인</button>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('serverAnnouncementModalClose').onclick = () => {
      modal.style.display = 'none';
    };
    return modal;
  }

  async function showLatestAnnouncement(force=false){
    try{
      if (typeof sb === 'undefined' || !sb) return;
      const {data:{session}} = await sb.auth.getSession();
      if (!session) return;

      const r = await sb.from('global_announcements')
        .select('id,message,created_at')
        .order('created_at',{ascending:false})
        .limit(1);
      if (r.error || !r.data?.length) return;

      const latest = r.data[0];
      if (!force && shownAnnouncementId === latest.id) return;
      shownAnnouncementId = latest.id;

      const modal = ensureModal();
      const text = document.getElementById('serverAnnouncementModalText');
      text.textContent = latest.message;
      modal.style.display = 'flex';
    } catch(e){
      console.warn('announcement popup', e);
    }
  }

  function init(){
    if (initialized) return;
    if (typeof sb === 'undefined' || !sb) {
      setTimeout(init,100);
      return;
    }
    initialized = true;

    showLatestAnnouncement(true);

    sb.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setTimeout(() => showLatestAnnouncement(true), 50);
      }
    });

    sb.channel('global-announcement-popup-v1')
      .on('postgres_changes', {event:'INSERT',schema:'public',table:'global_announcements'}, () => {
        showLatestAnnouncement(true);
      })
      .subscribe();
  }

  init();
})();