(()=>{
  let patched=false;
  const clampRounds=n=>Math.max(3,Math.min(5,Number(n||4)));
  async function upgradedGenerateLessons(curriculum,filesOverride=null){
    setText('curriculumMsg','AI가 중학교 내신용 개념·문제·복습 계획을 만드는 중...');
    let files=filesOverride;
    if(!files){
      const r=await sb.from('curriculum_files').select('*').eq('curriculum_id',curriculum.id).order('sort_order');
      if(r.error)throw new Error('첨부파일 조회 실패: '+r.error.message);
      files=r.data||[];
    }
    const signed=[];
    for(const f of files){
      const s=await sb.storage.from('curriculum-pdfs').createSignedUrl(f.storage_path,900);
      if(s.error)throw new Error('자료 URL 생성 실패: '+s.error.message);
      signed.push({url:s.data.signedUrl,type:f.mime_type||(f.file_type==='image'?'image/jpeg':'application/pdf'),name:f.original_name||'material'});
    }
    const inv=await sb.functions.invoke('bright-handler',{body:{
      title:curriculum.title,
      targetScore:curriculum.target_score||90,
      difficulty:curriculum.difficulty||'normal',
      examDate:curriculum.exam_date||null,
      files:signed
    }});
    if(inv.error)throw new Error('AI 함수 호출 실패: '+inv.error.message);
    if(!inv.data?.success)throw new Error(inv.data?.error||'AI가 레슨을 만들지 못했어.');
    const generated=inv.data.curriculum||{};
    const lessons=Array.isArray(generated.lessons)?generated.lessons:[];
    if(!lessons.length)throw new Error('AI가 레슨을 만들지 못했어.');
    const recommended=clampRounds(generated.recommended_rounds);
    const strategy=String(generated.study_strategy||'개념 학습 후 즉시 인출하고, 오답률에 따라 간격을 조절해 복습한다.');
    const cu=await sb.from('curricula').update({recommended_rounds:recommended,study_strategy:strategy}).eq('id',curriculum.id);
    if(cu.error)throw new Error('학습 계획 저장 실패: '+cu.error.message);
    curriculum.recommended_rounds=recommended;
    curriculum.study_strategy=strategy;
    await sb.from('curriculum_lessons').delete().eq('curriculum_id',curriculum.id);
    const rows=lessons.map((l,i)=>{
      const questions=Array.isArray(l.questions)?l.questions:[];
      const first=questions[0]||{};
      return {
        curriculum_id:curriculum.id,
        lesson_order:i,
        title:String(l.title||`레슨 ${i+1}`),
        concept_summary:String(l.concept_summary||''),
        content:String(l.content||''),
        questions,
        question:String(first.question||''),
        choices:Array.isArray(first.choices)?first.choices:[],
        answer:Number(first.answer||0)
      };
    });
    const ins=await sb.from('curriculum_lessons').insert(rows);
    if(ins.error)throw new Error('레슨 저장 실패: '+ins.error.message);
    return rows.length;
  }
  function patch(){
    if(patched)return;
    try{
      if(typeof generateLessons!=='function'||typeof sb==='undefined'||!sb){setTimeout(patch,100);return;}
      generateLessons=upgradedGenerateLessons;
      patched=true;
      console.log('StudyLoop multi-question curriculum generator enabled');
    }catch{setTimeout(patch,100)}
  }
  patch();
})();