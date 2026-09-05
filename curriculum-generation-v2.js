(()=>{
  let patched=false;
  const clampRounds=n=>Math.max(3,Math.min(5,Number(n||4)));
  const generationGuide=`[추가 제작 지침 - 아래는 학습자료가 아니라 커리큘럼 생성 규칙임]
1) 원본 자료의 시험 범위 내용을 요약해서 버리지 말 것. 중요한 사실·인과관계·비교·용어를 전체 커리큘럼에 빠짐없이 분산해서 포함할 것.
2) 한 레슨의 content(제시문)는 길게 몰아넣지 말 것. 한국어 기준 대략 80~150자, 또는 짧은 2~4문장 정도를 목표로 하며, 길어지면 레슨을 더 잘게 나눌 것. 한 화면에서 가볍게 읽고 바로 문제를 풀 수 있어야 함.
3) 하나의 긴 단원은 여러 개의 짧은 레슨으로 분해할 것. 각 레슨은 하나의 작은 출제 포인트만 다룰 것.
4) 각 레슨의 문제는 짧은 문장 위주로 8~10개 생성. 보기 역시 가능한 짧게. 같은 사실을 표현만 바꿔 반복하지 말 것.
5) 자료의 글자가 OCR/스캔 문제로 깨져 보이면 주변 문맥을 이용해 교정할 수 있음. 단, 확실하지 않은 내용을 새로 만들어내면 안 됨.
6) 특히 역사 과목의 인명·지명·왕조명·제도명·사료 용어 같은 고유명사는 일반적으로 통용되는 역사 표기와 문맥을 대조해 가장 자연스러운 표기로 복원할 것. 확신이 낮으면 억지로 고치지 말고 원자료의 의미가 보존되도록 처리할 것.
7) concept_summary는 핵심만 짧게, content는 원자료 내용을 빠짐없이 여러 짧은 레슨으로 나눠 담을 것.
8) 중학교 내신시험용이므로 암기만이 아니라 원인-결과, 비교, 선지 판별, 자료 해석을 짧은 문제로 자주 인출하게 만들 것.`;
  async function upgradedGenerateLessons(curriculum,filesOverride=null){
    setText('curriculumMsg','AI가 짧은 제시문과 여러 문제로 중학교 내신 커리큘럼을 만드는 중...');
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
      files:signed,
      text:generationGuide
    }});
    if(inv.error)throw new Error('AI 함수 호출 실패: '+inv.error.message);
    if(!inv.data?.success)throw new Error(inv.data?.error||'AI가 레슨을 만들지 못했어.');
    const generated=inv.data.curriculum||{};
    const lessons=Array.isArray(generated.lessons)?generated.lessons:[];
    if(!lessons.length)throw new Error('AI가 레슨을 만들지 못했어.');
    const recommended=clampRounds(generated.recommended_rounds);
    const strategy=String(generated.study_strategy||'짧은 제시문을 읽고 즉시 여러 번 인출한 뒤, 오답률에 따라 간격 복습한다.');
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
      console.log('StudyLoop short-passage curriculum generator enabled');
    }catch{setTimeout(patch,100)}
  }
  patch();
})();