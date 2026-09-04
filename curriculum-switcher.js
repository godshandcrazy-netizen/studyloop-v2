(() => {
  let ready=false;
  const esc2=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function modal(){
    let m=document.getElementById('curriculumSwitcher');
    if(m)return m;
    m=document.createElement('div');
    m.id='curriculumSwitcher';
    m.style.cssText='display:none;position:fixed;inset:0;z-index:9500;background:#10262b;color:#fff;overflow:auto;padding:env(safe-area-inset-top) 0 100px';
    m.innerHTML=`
      <div style="width:min(520px,100%);min-height:100vh;margin:auto">
        <div style="position:sticky;top:0;background:#10262b;border-bottom:2px solid #294047;padding:20px 22px;display:flex;align-items:center;gap:18px;z-index:2">
          <button id="currSwitchClose" aria-label="닫기" style="width:48px;height:48px;border:0;background:none;color:#71868d;font-size:42px;line-height:1">×</button>
          <b style="font-size:24px;color:#c1ced2">커리큘럼 선택</b>
        </div>
        <div id="currSwitchList" style="padding:26px 22px"></div>
      </div>`;
    document.body.appendChild(m);
    document.getElementById('currSwitchClose').onclick=()=>m.style.display='none';
    return m;
  }

  async function progressOf(c){
    try{
      const lr=await sb.from('curriculum_lessons').select('id').eq('curriculum_id',c.id);
      const ids=(lr.data||[]).map(x=>x.id);
      if(!ids.length)return{done:0,total:0,pct:0};
      const pr=await sb.from('curriculum_lesson_progress').select('lesson_id,completed').eq('user_id',user.id).in('lesson_id',ids);
      const done=(pr.data||[]).filter(x=>x.completed).length;
      return{done,total:ids.length,pct:Math.round(done/ids.length*100)};
    }catch{return{done:0,total:0,pct:0}}
  }

  async function open(){
    const m=modal(),list=document.getElementById('currSwitchList');
    m.style.display='block';
    list.innerHTML='<div style="padding:35px;text-align:center;color:#91a4aa;font-weight:800">불러오는 중...</div>';

    let rows=[];
    try{rows=await getAccessibleCurricula()}catch(e){console.warn(e)}
    if(!rows.length){
      list.innerHTML='<div style="padding:30px;border:2px solid #40545b;border-radius:24px;text-align:center;color:#91a4aa">선택할 커리큘럼이 없어.</div>';
      return;
    }

    const ps=await Promise.all(rows.map(progressOf));
    list.innerHTML=rows.map((x,i)=>{
      const active=String(currentCurriculum?.id||document.getElementById('activeCurriculum')?.value)===String(x.id);
      const p=ps[i];
      const mine=x.owner_id===user.id;
      return `<button class="currSwitchCard" data-id="${esc2(x.id)}" style="display:block;width:100%;text-align:left;margin:0 0 24px;padding:0;border:3px solid ${active?'#58cc42':'#40545b'};border-radius:26px;overflow:hidden;background:#172f35;color:#fff;box-shadow:0 6px 0 ${active?'#3da52f':'#0a1d21'}">
        <div style="min-height:170px;padding:26px;background:#203b42;display:flex;flex-direction:column;justify-content:flex-end">
          <div style="font-size:13px;font-weight:950;color:${active?'#88e76f':'#7f969d'};margin-bottom:8px">${mine?'내 커리큘럼':'공유 커리큘럼'}${active?' · 현재 선택됨':''}</div>
          <div style="font-size:29px;font-weight:950;line-height:1.15;word-break:break-word">${esc2(x.title||'커리큘럼')}</div>
          <div style="margin-top:11px;color:#b8c7cc;font-weight:800">목표 ${x.target_score??90}점${x.exam_date?` · ${esc2(x.exam_date)}`:''}</div>
        </div>
        <div style="padding:18px 22px 21px;background:#13272d">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><b style="font-size:18px">진도 ${p.done}/${p.total}</b><b style="color:#63c7eb">${p.pct}%</b></div>
          <div style="height:14px;background:#40545b;border-radius:99px;margin-top:12px;overflow:hidden"><div style="height:100%;width:${p.pct}%;background:#58cc42;border-radius:99px"></div></div>
          <div style="font-size:17px;font-weight:950;color:${active?'#79dc35':'#31b8ee'};margin-top:14px">${active?'학습 중':'여기로 이동'}</div>
        </div>
      </button>`;
    }).join('');

    list.querySelectorAll('.currSwitchCard').forEach(b=>b.onclick=async()=>{
      b.disabled=true;
      await selectCurriculum(b.dataset.id);
      m.style.display='none';
    });
  }

  function init(){
    if(ready)return;
    if(typeof sb==='undefined'||typeof user==='undefined'||!user||typeof getAccessibleCurricula!=='function'||typeof selectCurriculum!=='function'){
      setTimeout(init,150);return;
    }
    const unit=document.querySelector('#home .unit');
    if(!unit){setTimeout(init,150);return}
    ready=true;
    unit.style.cursor='pointer';
    unit.setAttribute('role','button');
    unit.setAttribute('tabindex','0');
    unit.title='커리큘럼 바꾸기';
    unit.onclick=e=>{if(e.target.closest('button,a,select,input'))return;open()};
    unit.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}};
    const hint=document.createElement('div');
    hint.textContent='커리큘럼 바꾸기  ›';
    hint.style.cssText='margin-top:12px;font-size:14px;font-weight:950;opacity:.82';
    unit.appendChild(hint);
  }

  init();
})();