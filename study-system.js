(() => {
  let initialized=false;
  let studyState=null;
  const E=id=>document.getElementById(id);
  const safe=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const asArray=v=>{if(Array.isArray(v))return v;if(typeof v==='string'){try{const x=JSON.parse(v);return Array.isArray(x)?x:[]}catch{return []}}return []};
  const rounds=()=>Math.max(3,Math.min(5,Number(currentCurriculum?.recommended_rounds||3)));
  const lessonQs=l=>{const q=asArray(l?.questions);if(q.length)return q;const c=asArray(l?.choices);return l?.question&&c.length?[{question:l.question,choices:c,answer:Number(l.answer||0),explanation:''}]:[]};
  const historyKey=l=>`studyloop_review_history_${user?.id||'x'}_${l.id}`;
  const reviewHistory=l=>{try{return JSON.parse(localStorage.getItem(historyKey(l))||'[]')}catch{return []}};
  const saveReviewHistory=(l,qs)=>{const old=reviewHistory(l),next=[...old,...qs.map(x=>String(x.question||''))].filter(Boolean).slice(-30);localStorage.setItem(historyKey(l),JSON.stringify(next))};

  function ensureStudyUI(){
    if(E('studyModeBox'))return;
    const home=E('home');if(!home)return;
    const unit=home.querySelector('.unit');
    const box=document.createElement('div');box.id='studyModeBox';box.className='box';
    box.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><b style="font-size:18px">📚 학습 모드</b><span id="roundSummary" style="font-size:13px;color:#6c7f86"></span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><button id="conceptCornerBtn" class="secondary" style="min-height:58px">📘 개념 학습</button><button id="reviewCornerBtn" class="primary" style="min-height:58px">🔁 복습 코너</button></div><p id="studyModeMsg" class="msg" style="margin-bottom:0"></p>`;
    unit.insertAdjacentElement('afterend',box);
    E('conceptCornerBtn').onclick=startNextConcept;
    E('reviewCornerBtn').onclick=openReviewCorner;

    const modal=document.createElement('div');modal.id='studyModal';modal.style.cssText='display:none;position:fixed;inset:0;z-index:12000;background:#eef3f5;color:#203037;overflow:auto';
    modal.innerHTML=`<div style="position:sticky;top:0;z-index:2;background:#eef3f5;padding:14px 16px;border-bottom:1px solid #dce5e8;display:flex;align-items:center;gap:10px"><button id="studyClose" class="smallBtn" style="font-size:24px">×</button><div style="flex:1"><div id="studyModeTitle" style="font-size:12px;font-weight:900;color:#6c7f86"></div><b id="studyLessonTitle"></b></div><div id="studyRoundBadge" style="font-size:13px;font-weight:900;color:#087aa8"></div></div><div style="max-width:520px;margin:auto;padding:18px 18px 44px"><div id="studyConceptArea"></div><div id="studyQuestionArea"></div><div id="studyResultArea"></div></div>`;
    document.body.appendChild(modal);E('studyClose').onclick=()=>modal.style.display='none';

    const review=document.createElement('div');review.id='reviewCornerModal';review.style.cssText='display:none;position:fixed;inset:0;z-index:11900;background:#10262b;color:#fff;overflow:auto;padding-bottom:90px';
    review.innerHTML=`<div style="position:sticky;top:0;background:#10262b;border-bottom:2px solid #294047;padding:18px 20px;display:flex;align-items:center;gap:14px;z-index:2"><button id="reviewCornerClose" style="border:0;background:none;color:#8aa0a6;font-size:38px">×</button><div><b style="font-size:23px">🔁 복습 코너</b><div id="reviewCornerSub" style="font-size:13px;color:#8aa0a6;margin-top:3px"></div></div></div><div id="reviewCornerList" style="padding:20px"></div>`;
    document.body.appendChild(review);E('reviewCornerClose').onclick=()=>review.style.display='none';
  }

  async function progressMap(){
    if(!currentLessons?.length)return new Map();
    const r=await sb.from('curriculum_lesson_progress').select('*').eq('user_id',user.id).in('lesson_id',currentLessons.map(x=>x.id));
    return new Map((r.data||[]).map(x=>[String(x.lesson_id),x]));
  }

  async function refreshStudyBox(){
    if(!E('studyModeBox'))return;
    if(!currentCurriculum){E('roundSummary').textContent='';E('studyModeMsg').textContent='커리큘럼을 선택해.';return;}
    const pm=await progressMap(), target=rounds();
    const done=currentLessons.filter(l=>pm.get(String(l.id))?.completed).length;
    const totalRounds=currentLessons.reduce((sum,l)=>{const p=pm.get(String(l.id));return sum+(p?.completed?1+Number(p.review_count||0):0)},0);
    E('roundSummary').textContent=`권장 ${target}회독`;
    E('studyModeMsg').textContent=`개념 완료 ${done}/${currentLessons.length} · 누적 회독 ${totalRounds}/${currentLessons.length*target}`;
  }

  async function startNextConcept(){
    if(!currentCurriculum||!currentLessons.length){E('studyModeMsg').textContent='먼저 커리큘럼을 선택해.';return;}
    const pm=await progressMap();
    const idx=currentLessons.findIndex(l=>!pm.get(String(l.id))?.completed);
    startConcept(idx>=0?idx:0);
  }

  async function startConcept(index){
    const l=currentLessons[index];if(!l)return;
    const qs=lessonQs(l);
    if(!qs.length){alert('이 레슨에는 문제가 없어. 새 형식으로 레슨 생성을 다시 해줘.');return;}
    studyState={mode:'concept',lesson:l,lessonIndex:index,questions:qs,qIndex:-1,correct:0,answered:false};
    E('studyModal').style.display='block';
    E('studyModeTitle').textContent='📘 개념 학습';
    E('studyLessonTitle').textContent=l.title||`레슨 ${index+1}`;
    const p=(await progressMap()).get(String(l.id));
    E('studyRoundBadge').textContent=`${p?.completed?1+Number(p.review_count||0):1}/${rounds()}회독`;
    renderConceptIntro();
  }

  function renderConceptIntro(){
    const s=studyState,l=s.lesson;
    E('studyQuestionArea').innerHTML='';E('studyResultArea').innerHTML='';
    E('studyConceptArea').innerHTML=`<div style="font-size:14px;font-weight:950;color:#087aa8;margin-bottom:8px">핵심 개념</div><div style="background:#e8f6fc;border:2px solid #b7e1f1;border-radius:16px;padding:15px;line-height:1.65;font-weight:800">${safe(l.concept_summary||'이 레슨의 핵심 개념')}</div><div style="font-size:14px;font-weight:950;color:#087aa8;margin:22px 0 8px">개념 학습</div><div style="background:#fff;border:2px solid #dbe7eb;border-radius:16px;padding:17px;white-space:pre-wrap;line-height:1.75">${safe(l.content||'')}</div><button id="beginLessonQuestions" class="primary wide" style="margin-top:18px">문제 ${s.questions.length}개 풀기 →</button>`;
    E('beginLessonQuestions').onclick=()=>{s.qIndex=0;renderQuestion()};
  }

  function renderQuestion(){
    const s=studyState,q=s.questions[s.qIndex];if(!q)return finishSet();
    s.answered=false;
    const showOriginal=s.mode==='review';
    E('studyConceptArea').innerHTML=showOriginal?`<button id="toggleOriginalConcept" class="smallBtn wide" style="margin-bottom:12px">📖 원래 개념 보기</button><div id="originalConceptBox" style="display:none;background:#fff;border:2px solid #dbe7eb;border-radius:16px;padding:16px;white-space:pre-wrap;line-height:1.7;margin-bottom:16px"><b>${safe(s.lesson.concept_summary||'핵심 개념')}</b><br><br>${safe(s.lesson.content||'')}</div>`:'';
    if(showOriginal)E('toggleOriginalConcept').onclick=()=>{const b=E('originalConceptBox');b.style.display=b.style.display==='none'?'block':'none'};
    E('studyResultArea').innerHTML='';
    E('studyQuestionArea').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b>${s.mode==='review'?'복습 문제':'확인 문제'} ${s.qIndex+1}/${s.questions.length}</b><span style="font-size:13px;color:#6c7f86">정답 ${s.correct}</span></div><div style="background:#fff;border:2px solid #dce8d9;border-radius:16px;padding:16px;line-height:1.6;font-weight:850">${safe(q.question||'')}</div><div id="studyChoices" style="margin-top:10px">${asArray(q.choices).map((c,i)=>`<button class="ans studyChoice" data-i="${i}">${i+1}. ${safe(c)}</button>`).join('')}</div><div id="studyExplain" class="msg" style="margin-top:12px"></div><button id="studyNextQuestion" class="primary wide hidden" style="margin-top:14px">${s.qIndex===s.questions.length-1?'결과 보기':'다음 문제'}</button>`;
    document.querySelectorAll('.studyChoice').forEach(b=>b.onclick=()=>answerQuestion(Number(b.dataset.i)));
    E('studyNextQuestion').onclick=()=>{s.qIndex++;renderQuestion()};
  }

  function answerQuestion(i){
    const s=studyState;if(s.answered)return;s.answered=true;
    const q=s.questions[s.qIndex],ans=Math.max(0,Math.min(3,Number(q.answer||0)));
    const bs=[...document.querySelectorAll('.studyChoice')];bs.forEach(x=>x.disabled=true);bs[ans]?.classList.add('good');
    if(i===ans){s.correct++;E('studyExplain').textContent='정답! '+(q.explanation||'')}else{bs[i]?.classList.add('bad');E('studyExplain').textContent='오답. '+(q.explanation||'정답을 확인해.')}
    E('studyNextQuestion').classList.remove('hidden');
  }

  async function finishSet(){
    const s=studyState,score=Math.round(s.correct/s.questions.length*100);
    E('studyConceptArea').innerHTML='';E('studyQuestionArea').innerHTML='';
    E('studyResultArea').innerHTML=`<div style="background:#fff;border:2px solid #dbe7eb;border-radius:18px;padding:20px;text-align:center"><div style="font-size:14px;color:#6c7f86">${s.mode==='review'?'복습':'개념 학습'} 결과</div><div style="font-size:38px;font-weight:950;margin:8px 0">${score}점</div><div>${s.correct}/${s.questions.length} 정답</div><p class="msg">저장 중...</p></div>`;
    await saveSetProgress(score);
    E('studyResultArea').querySelector('.msg').textContent=s.mode==='review'?`${s.reviewRound}회독 완료. 다음 복습에서는 또 다른 문제가 나와.`:'1회독 완료. 복습 코너에서 다른 문제로 다음 회독을 진행할 수 있어.';
    const btn=document.createElement('button');btn.className='primary wide';btn.style.marginTop='14px';btn.textContent='학습 화면으로 돌아가기';btn.onclick=()=>{E('studyModal').style.display='none'};E('studyResultArea').appendChild(btn);
  }

  async function saveSetProgress(score){
    const s=studyState,l=s.lesson,now=new Date().toISOString();
    const r=await sb.from('curriculum_lesson_progress').select('*').eq('user_id',user.id).eq('lesson_id',l.id).maybeSingle();
    const old=r.data;
    if(s.mode==='concept'){
      const row={user_id:user.id,lesson_id:l.id,completed:true,best_score:Math.max(Number(old?.best_score||0),score),review_count:Number(old?.review_count||0),first_completed_at:old?.first_completed_at||now,updated_at:now};
      const u=await sb.from('curriculum_lesson_progress').upsert(row);
      if(!u.error&&!old?.completed)await addXp(20);
    }else{
      const maxReviews=rounds()-1,next=Math.min(maxReviews,Math.max(Number(old?.review_count||0)+1,s.reviewRound-1));
      await sb.from('curriculum_lesson_progress').upsert({user_id:user.id,lesson_id:l.id,completed:true,best_score:Math.max(Number(old?.best_score||0),score),review_count:next,first_completed_at:old?.first_completed_at||now,last_reviewed_at:now,updated_at:now});
      await addXp(10);
      saveReviewHistory(l,s.questions);
    }
    await renderPath();await renderDaily();await refreshStudyBox();if(typeof loadRanking==='function')await loadRanking();
  }

  async function addXp(n){
    if(!profile)return;const nx=Number(profile.xp||0)+n;const r=await sb.from('profiles').update({xp:nx}).eq('id',user.id);if(!r.error){profile.xp=nx;if(typeof renderProfile==='function')renderProfile()}
  }

  async function openReviewCorner(){
    if(!currentCurriculum||!currentLessons.length){E('studyModeMsg').textContent='먼저 커리큘럼을 선택해.';return;}
    E('reviewCornerModal').style.display='block';
    E('reviewCornerSub').textContent=`${currentCurriculum.title} · 권장 ${rounds()}회독`;
    const list=E('reviewCornerList');list.innerHTML='<div style="padding:30px;text-align:center;color:#8aa0a6">불러오는 중...</div>';
    const pm=await progressMap(),target=rounds();
    list.innerHTML=currentLessons.map((l,i)=>{const p=pm.get(String(l.id)),cur=p?.completed?1+Number(p.review_count||0):0,done=cur>=target;return `<div style="margin-bottom:14px;border:2px solid ${done?'#58cc42':'#355159'};border-radius:18px;background:#173238;padding:16px"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>${i+1}. ${safe(l.title)}</b><div style="font-size:13px;color:#91a4aa;margin-top:5px">${cur}/${target}회독</div></div><div style="font-weight:950;color:${done?'#78da65':'#39b9ed'}">${done?'완료':p?.completed?'복습 가능':'개념 먼저'}</div></div><div style="height:8px;background:#0d2328;border-radius:99px;overflow:hidden;margin:12px 0"><div style="height:100%;width:${Math.min(100,cur/target*100)}%;background:${done?'#58cc42':'#22afe8'}"></div></div><button class="${p?.completed&&!done?'primary':'smallBtn'} reviewStart" data-i="${i}" ${!p?.completed||done?'disabled':''} style="width:100%">${done?'권장 회독 완료':p?.completed?`${cur+1}회독 새 문제 시작`:'1회독 개념 학습 필요'}</button></div>`}).join('');
    list.querySelectorAll('.reviewStart').forEach(b=>b.onclick=()=>startReview(Number(b.dataset.i)));
  }

  async function startReview(index){
    const l=currentLessons[index];if(!l)return;
    const pm=await progressMap(),p=pm.get(String(l.id));if(!p?.completed){alert('먼저 개념 학습 1회독을 끝내야 해.');return;}
    const nextRound=2+Number(p.review_count||0);if(nextRound>rounds()){alert('권장 회독을 모두 끝냈어.');return;}
    E('reviewCornerModal').style.display='none';E('studyModal').style.display='block';
    E('studyModeTitle').textContent='🔁 복습';E('studyLessonTitle').textContent=l.title||`레슨 ${index+1}`;E('studyRoundBadge').textContent=`${nextRound}/${rounds()}회독`;
    E('studyConceptArea').innerHTML='';E('studyQuestionArea').innerHTML='<div style="padding:50px 10px;text-align:center"><b>AI가 이전과 다른 복습 문제를 만드는 중...</b><p class="msg">같은 개념을 다른 각도로 묻는 문제를 준비하고 있어.</p></div>';E('studyResultArea').innerHTML='';
    const prev=[...lessonQs(l).map(x=>String(x.question||'')),...reviewHistory(l)];
    const inv=await sb.functions.invoke('bright-handler',{body:{action:'review',passage:l.content||l.concept_summary||'',round:nextRound,count:6,previousQuestions:prev}});
    if(inv.error||!inv.data?.success){E('studyQuestionArea').innerHTML=`<div class="msg">복습 문제 생성 실패: ${safe(inv.data?.error||inv.error?.message||'알 수 없는 오류')}</div>`;return;}
    const qs=asArray(inv.data.questions);if(!qs.length){E('studyQuestionArea').innerHTML='<div class="msg">복습 문제가 비어 있어.</div>';return;}
    studyState={mode:'review',lesson:l,lessonIndex:index,questions:qs,qIndex:0,correct:0,answered:false,reviewRound:nextRound};renderQuestion();
  }

  async function enhancedRenderPath(){
    if(!currentLessons.length){E('path').innerHTML='';E('emptyLessons')?.classList.remove('hidden');return;}
    E('emptyLessons')?.classList.add('hidden');
    const pm=await progressMap(),target=rounds();
    E('path').innerHTML=currentLessons.map((l,i)=>{const p=pm.get(String(l.id)),cur=p?.completed?1+Number(p.review_count||0):0,done=cur>=target,cls=done?'review2':p?.completed?(cur>=2?'review1':'done'):'';return `<button class="lessonNode ${cls}" data-study-li="${i}" title="${safe(l.title)}"><span>${done?'★':p?.completed?'✓':'📖'}</span>${p?.completed?`<span class="badge">${cur}/${target}회독</span>`:''}</button>`}).join('');
    document.querySelectorAll('[data-study-li]').forEach(b=>b.onclick=()=>startConcept(Number(b.dataset.studyLi)));
  }

  async function enhancedGenerateLessons(curriculum,filesOverride=null){
    setText('curriculumMsg','AI가 개념과 여러 문제를 만드는 중...');
    let files=filesOverride;
    if(!files){const r=await sb.from('curriculum_files').select('*').eq('curriculum_id',curriculum.id).order('sort_order');files=r.data||[];}
    const signed=[];
    for(const f of files){const s=await sb.storage.from('curriculum-pdfs').createSignedUrl(f.storage_path,900);if(s.error)throw new Error('자료 URL 생성 실패: '+s.error.message);signed.push({url:s.data.signedUrl,type:f.mime_type||(f.file_type==='image'?'image/jpeg':'application/pdf'),name:f.original_name||'material'})}
    const inv=await sb.functions.invoke('bright-handler',{body:{title:curriculum.title,targetScore:curriculum.target_score||90,difficulty:curriculum.difficulty||'normal',files:signed}});
    if(inv.error)throw new Error('AI 함수 호출 실패: '+inv.error.message);
    if(!inv.data?.success)throw new Error(inv.data?.error||'AI가 레슨을 만들지 못했어.');
    const data=inv.data.curriculum||{},lessons=asArray(data.lessons),rr=Math.max(3,Math.min(5,Number(data.recommended_rounds||3)));
    await sb.from('curricula').update({recommended_rounds:rr}).eq('id',curriculum.id);
    await sb.from('curriculum_lessons').delete().eq('curriculum_id',curriculum.id);
    const rows=lessons.map((l,i)=>{const qs=asArray(l.questions).slice(0,8),first=qs[0]||{};return {curriculum_id:curriculum.id,lesson_order:i,title:String(l.title||`레슨 ${i+1}`),content:String(l.content||''),concept_summary:String(l.concept_summary||''),questions:qs,question:String(first.question||''),choices:asArray(first.choices),answer:Number(first.answer||0)}});
    if(!rows.length)throw new Error('AI가 레슨을 만들지 못했어.');
    const ins=await sb.from('curriculum_lessons').insert(rows);if(ins.error)throw new Error('레슨 저장 실패: '+ins.error.message);
    curriculum.recommended_rounds=rr;return rows.length;
  }

  async function init(){
    if(initialized)return;
    if(typeof sb==='undefined'||!sb||typeof user==='undefined'||!user||typeof currentLessons==='undefined'||typeof generateLessons!=='function'||typeof renderPath!=='function'){setTimeout(init,120);return;}
    initialized=true;ensureStudyUI();
    generateLessons=enhancedGenerateLessons;
    renderPath=enhancedRenderPath;
    openLesson=i=>startConcept(i);
    const oldSelect=selectCurriculum;
    selectCurriculum=async function(id){const r=await oldSelect(id);await refreshStudyBox();return r};
    await refreshStudyBox();
    if(currentCurriculum)await enhancedRenderPath();
  }
  init();
})();