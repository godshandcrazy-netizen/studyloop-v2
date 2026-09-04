/* StudyLoop v2 loader */
(() => {
  const patchSupabase = () => {
    if (!window.supabase || !window.supabase.createClient) return false;
    if (window.supabase.__studyloopPatched) return true;
    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    window.supabase.createClient = (...args) => {
      const client = originalCreateClient(...args);
      const originalInvoke = client.functions.invoke.bind(client.functions);
      client.functions.invoke = (functionName, options) => {
        const actualName = functionName === 'studyloop-lessons' ? 'bright-handler' : functionName;
        return originalInvoke(actualName, options);
      };
      return client;
    };
    window.supabase.__studyloopPatched = true;
    return true;
  };

  const enhanceLessonUI = () => {
    const concept = document.getElementById('concept');
    const question = document.getElementById('question');
    if (!concept || !question || document.querySelector('.studyloop-label')) return;
    const passageLabel = document.createElement('div');
    passageLabel.className = 'studyloop-label';
    passageLabel.textContent = '📖 제시문';
    concept.parentNode.insertBefore(passageLabel, concept);
    const questionLabel = document.createElement('div');
    questionLabel.className = 'studyloop-label question-label';
    questionLabel.textContent = '❓ 문제';
    question.parentNode.insertBefore(questionLabel, question);
  };

  const enhanceRoomFeatures = () => {
    const chatList = document.getElementById('chatList');
    if (chatList) {
      chatList.style.maxHeight = '360px';
      chatList.style.overflowY = 'auto';
    }

    window.studyloopLoadChatV2 = async () => {
      if (!currentRoom) {
        if (chatList) chatList.innerHTML = '<p class="msg">방에 들어가면 채팅 가능.</p>';
        return;
      }
      const m = await sb.from('room_messages').select('*')
        .eq('room_id', currentRoom.id).order('created_at', {ascending:false}).limit(80);
      const rows = (m.data || []).reverse();
      const ids = [...new Set(rows.map(x => x.user_id))];
      let names = {};
      if (ids.length) {
        const p = await sb.from('profiles').select('id,name').in('id', ids);
        (p.data || []).forEach(x => names[x.id] = x.name);
      }
      const visible = rows.slice(-10);
      if (chatList) {
        chatList.innerHTML = visible.map(x => `<div><b>${esc(names[x.user_id] || '사용자')}</b> ${esc(x.message)}</div>`).join('') || '<p class="msg">아직 메시지가 없어.</p>';
        chatList.scrollTop = chatList.scrollHeight;
      }
    };

    window.studyloopTrimChatV2 = async () => {
      if (!currentRoom) return;
      const q = await sb.from('room_messages').select('id').eq('room_id', currentRoom.id)
        .order('created_at', {ascending:false}).range(80, 999);
      const oldIds = (q.data || []).map(x => x.id);
      if (oldIds.length) await sb.from('room_messages').delete().in('id', oldIds);
    };

    const send = document.getElementById('sendChat');
    if (send) send.onclick = async () => {
      if (!currentRoom) { setText('chatMsg','먼저 방에 들어가.'); return; }
      const input = document.getElementById('chatInput');
      const msg = input.value.trim();
      if (!msg) return;
      const r = await sb.from('room_messages').insert({room_id:currentRoom.id,user_id:user.id,message:msg});
      if (r.error) { setText('chatMsg','전송 실패: '+r.error.message); return; }
      input.value = '';
      await window.studyloopTrimChatV2();
      await window.studyloopLoadChatV2();
    };

    const originalRoomLoader = loadRoomCurricula;
    loadRoomCurricula = async function(){
      await originalRoomLoader();
      if (!currentRoom) return;
      const s = await sb.from('room_curricula').select('curriculum_id,shared_by')
        .eq('room_id', currentRoom.id);
      const mine = new Set((s.data || []).filter(x => x.shared_by === user.id).map(x => String(x.curriculum_id)));
      document.querySelectorAll('.studyShared').forEach(btn => {
        if (!mine.has(String(btn.dataset.id)) || btn.parentNode.querySelector(`.unshareCurr[data-id="${btn.dataset.id}"]`)) return;
        const del = document.createElement('button');
        del.className = 'danger unshareCurr';
        del.dataset.id = btn.dataset.id;
        del.textContent = '공유 삭제';
        del.style.marginLeft = '8px';
        del.onclick = async () => {
          if (!confirm('이 커리큘럼을 방에서 공유 해제할까?')) return;
          const d = await sb.from('room_curricula').delete()
            .eq('room_id', currentRoom.id).eq('curriculum_id', btn.dataset.id).eq('shared_by', user.id);
          if (d.error) { alert('공유 삭제 실패: '+d.error.message); return; }
          if (String(currentCurriculum?.id) === String(btn.dataset.id)) clearCurriculum();
          await loadRoomCurricula();
          await loadCurriculumSelect();
        };
        btn.insertAdjacentElement('afterend', del);
      });
    };

    window.studyloopLoadChatV2();
    window.studyloopTrimChatV2();
    loadRoomCurricula();

    if (chatChannel && currentRoom) {
      sb.removeChannel(chatChannel).then(() => {
        chatChannel = sb.channel('chat-v2-'+currentRoom.id).on('postgres_changes', {
          event:'*', schema:'public', table:'room_messages', filter:`room_id=eq.${currentRoom.id}`
        }, () => window.studyloopLoadChatV2()).subscribe();
      });
    }
  };

  const enhanceAnnouncements = () => {
    const app = document.getElementById('app');
    const header = app?.querySelector('header');
    if (!app || !header || document.getElementById('globalAnnouncement')) return;

    const banner = document.createElement('div');
    banner.id = 'globalAnnouncement';
    banner.style.cssText = 'display:none;margin:0 12px 12px;padding:14px 16px;border-radius:16px;background:#fff3cd;color:#3b3320;border:2px solid #f3c94b;font-weight:800;line-height:1.45;white-space:pre-wrap;';
    header.insertAdjacentElement('afterend', banner);

    const profilePanel = document.querySelector('#profile .panel');
    const adminBox = document.createElement('div');
    adminBox.id = 'serverAdminBox';
    adminBox.style.cssText = 'display:none;margin-top:22px;padding:16px;border:2px solid #22afe8;border-radius:16px;background:#f7fbfd;color:#203037;';
    adminBox.innerHTML = `
      <h3 style="margin:0 0 10px">📢 서버 전체 공지</h3>
      <p class="msg" style="margin-top:0">관리자 아이디: yegeon2919</p>
      <textarea id="serverAnnouncementInput" maxlength="500" placeholder="모든 사용자에게 표시할 공지" style="width:100%;min-height:90px;resize:vertical;padding:12px;border:2px solid #dbe5e8;border-radius:12px;font:inherit"></textarea>
      <button id="sendServerAnnouncement" class="secondary" style="width:100%;margin-top:8px">전체 공지 보내기</button>
      <p id="serverAnnouncementMsg" class="msg"></p>
      <div id="announcementAdminList"></div>`;
    profilePanel?.appendChild(adminBox);

    const isAdminSession = session => {
      const email = String(session?.user?.email || '').toLowerCase();
      return email === 'yegeon2919@studyloop.local';
    };

    const loadAnnouncements = async () => {
      const {data:{session}} = await sb.auth.getSession();
      if (!session) {
        banner.style.display = 'none';
        adminBox.style.display = 'none';
        return;
      }
      const r = await sb.from('server_announcements').select('id,message,created_at,created_by')
        .order('created_at', {ascending:false}).limit(10);
      const rows = r.data || [];
      if (rows.length) {
        banner.textContent = '📢 공지 · ' + rows[0].message;
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
      const admin = isAdminSession(session);
      adminBox.style.display = admin ? 'block' : 'none';
      if (admin) {
        const list = document.getElementById('announcementAdminList');
        list.innerHTML = rows.map(x => `<div style="padding:10px 0;border-top:1px solid #dfe7ea"><div style="white-space:pre-wrap">${esc(x.message)}</div><button class="danger deleteAnnouncement" data-id="${x.id}" style="margin-top:6px">공지 삭제</button></div>`).join('') || '<p class="msg">아직 공지가 없어.</p>';
        list.querySelectorAll('.deleteAnnouncement').forEach(btn => {
          btn.onclick = async () => {
            const d = await sb.from('server_announcements').delete().eq('id', btn.dataset.id);
            if (d.error) { setText('serverAnnouncementMsg','삭제 실패: '+d.error.message); return; }
            setText('serverAnnouncementMsg','공지를 삭제했어.');
            await loadAnnouncements();
          };
        });
      }
    };

    const sendBtn = document.getElementById('sendServerAnnouncement');
    if (sendBtn) sendBtn.onclick = async () => {
      const {data:{session}} = await sb.auth.getSession();
      if (!isAdminSession(session)) { setText('serverAnnouncementMsg','이 아이디에는 관리자 권한이 없어.'); return; }
      const input = document.getElementById('serverAnnouncementInput');
      const message = input.value.trim();
      if (!message) return;
      sendBtn.disabled = true;
      const r = await sb.from('server_announcements').insert({created_by:session.user.id,message});
      sendBtn.disabled = false;
      if (r.error) { setText('serverAnnouncementMsg','공지 실패: '+r.error.message); return; }
      input.value = '';
      setText('serverAnnouncementMsg','서버 전체 공지를 보냈어.');
      await loadAnnouncements();
    };

    sb.auth.onAuthStateChange(() => setTimeout(loadAnnouncements, 0));
    loadAnnouncements();
    setInterval(loadAnnouncements, 15000);
  };

  const loadMainApp = () => {
    patchSupabase();
    const script = document.createElement('script');
    script.src = 'https://godshandcrazy-netizen.github.io/studyloop/app.js?v=20260904-2';
    script.async = false;
    script.onload = () => { enhanceLessonUI(); enhanceRoomFeatures(); enhanceAnnouncements(); };
    script.onerror = () => {
      const el = document.getElementById('setupMsg');
      if (el) el.textContent = '앱 로직을 불러오지 못했어. 잠시 후 새로고침해 줘.';
    };
    document.body.appendChild(script);
  };

  if (patchSupabase()) loadMainApp();
  else {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (patchSupabase()) { clearInterval(timer); loadMainApp(); }
      else if (tries >= 100) {
        clearInterval(timer);
        const el = document.getElementById('setupMsg');
        if (el) el.textContent = 'Supabase 라이브러리를 불러오지 못했어.';
      }
    }, 50);
  }
})();