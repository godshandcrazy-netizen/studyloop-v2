(() => {
  let initialized=false;
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  async function isAdmin(){
    if(typeof sb==='undefined'||!sb)return false;
    const {data:{session}}=await sb.auth.getSession();
    return String(session?.user?.email||'').toLowerCase()==='yegeon2919@studyloop.local';
  }

  function ensureBox(){
    let box=document.getElementById('adminUserDirectory');
    if(box)return box;
    const panel=document.querySelector('#profile .panel');
    if(!panel)return null;
    box=document.createElement('div');
    box.id='adminUserDirectory';
    box.style.cssText='display:none;margin-top:22px;padding:16px;border:2px solid #58cc42;border-radius:16px;background:#f7fbfd;color:#203037';
    box.innerHTML=`
      <h3 style="margin:0 0 8px">👥 전체 유저 관리</h3>
      <p class="msg" style="margin-top:0">yegeon2919 계정에서만 보여.</p>
      <button id="refreshAdminUsers" class="secondary" style="width:100%;margin-bottom:10px">유저 목록 새로고침</button>
      <p id="adminUsersMsg" class="msg"></p>
      <div id="adminUsersList"></div>`;
    panel.appendChild(box);
    document.getElementById('refreshAdminUsers').onclick=loadUsers;
    return box;
  }

  async function loadUsers(){
    const box=ensureBox();
    if(!box)return;
    if(!(await isAdmin())){box.style.display='none';return;}
    box.style.display='block';
    const msg=document.getElementById('adminUsersMsg');
    const list=document.getElementById('adminUsersList');
    msg.textContent='불러오는 중...';
    const r=await sb.rpc('admin_list_users');
    if(r.error){msg.textContent='유저 목록 실패: '+r.error.message;return;}
    msg.textContent=`총 ${(r.data||[]).length}명`;
    const canInvite=!!(currentRoom&&String(currentRoom.owner_id)===String(user?.id));
    list.innerHTML=(r.data||[]).map(x=>{
      const self=String(x.user_id)===String(user?.id);
      return `<div style="padding:12px 0;border-top:1px solid #dfe7ea">
        <div><b>${esc(x.display_name)}</b> <span style="color:#6c7f86">@${esc(x.username)}</span>${self?' · 나':''}</div>
        <div style="font-size:13px;color:#6c7f86;margin-top:3px">${Number(x.xp||0)} XP · 목표 ${Number(x.target_score||90)}점</div>
        ${!self?`<button class="primary adminInviteUser" data-id="${x.user_id}" style="margin-top:8px" ${canInvite?'':'disabled'}>${canInvite?'내 방에 초대':'내가 만든 방에 들어가 있어야 초대 가능'}</button>`:''}
      </div>`;
    }).join('')||'<p class="msg">유저가 없어.</p>';
    list.querySelectorAll('.adminInviteUser').forEach(btn=>{
      btn.onclick=async()=>{
        if(!currentRoom||String(currentRoom.owner_id)!==String(user?.id)){alert('먼저 네가 만든 방에 들어가 있어야 해.');return;}
        btn.disabled=true;
        const rr=await sb.rpc('admin_invite_user_to_room',{p_room_id:currentRoom.id,p_user_id:btn.dataset.id});
        btn.disabled=false;
        if(rr.error){alert('초대 실패: '+rr.error.message);return;}
        btn.textContent='초대 완료';
        await loadRanking();
      };
    });
  }

  async function init(){
    if(initialized)return;
    if(typeof sb==='undefined'||!sb||typeof user==='undefined'){setTimeout(init,120);return;}
    initialized=true;
    ensureBox();
    await loadUsers();
    sb.auth.onAuthStateChange(()=>setTimeout(loadUsers,0));
    setInterval(()=>{if(document.querySelector('#profile.page.active'))loadUsers();},10000);
  }
  init();
})();