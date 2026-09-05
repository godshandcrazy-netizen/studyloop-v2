(()=>{
  let patched=false;
  const clampRounds=n=>Math.max(3,Math.min(5,Number(n||4)));
  const generationGuide=`[강제 제작 지침 - 아래는 학습자료가 아니라 커리큘럼 생성 규칙임]
1) 지식의 출처는 업로드된 PDF/사진뿐이다. 외부 상식, 교과서 일반지식, 웹 지식, 모델의 배경지식을 학습 내용이나 정답 근거로 추가하지 말 것.
2) 원본 시험범위의 내용을 절대 생략하지 말 것. 작은 문장, 괄호 속 설명, 날짜, 인명, 지명, 제도명, 원인·결과, 비교, 예시, 표·그림의 핵심 정보까지 전체 커리큘럼 어딘가에 반드시 들어가야 한다.
3) '핵심만 골라 요약'하지 말 것. 목표는 요약본이 아니라 원본 전체 내용을 짧은 학습 조각으로 재배치하는 것이다.
4) 먼저 원본을 순서대로 훑어 사실 단위로 나눈 뒤, 각 사실 단위가 어느 레슨 content에 들어갔는지 내부적으로 대조한다. 하나라도 빠졌으면 레슨을 추가해서 포함한다.
5) 레슨 개수에 상한을 두지 않는다. 원본이 길면 20개, 30개 이상으로 늘려도 된다. 내용 누락보다 레슨 수 증가를 항상 우선한다.
6) 한 레슨의 content(제시문)는 한국어 기준 약 50~110자 또는 1~3문장 정도를 목표로 한다. 너무 길어지면 같은 주제를 여러 레슨으로 나눈다.
7) content는 원본 의미를 유지하되 읽기 쉽게 문장을 다듬을 수 있다. 원본에 없는 새 사실을 보태면 안 된다.
8) OCR/스캔 때문에 글자가 깨졌다면 주변 문맥으로 복원할 수 있다. 역사 인명·지명·왕조·제도·사료 용어는 통용 표기를 참고해 복원하되, 확신이 낮으면 추측해 새 사실을 만들지 않는다.
9) 각 레슨마다 짧은 문제를 6~10개 만든다. 같은 사실만 말 바꿔 반복하지 않는다.
10) 매우 중요: 각 문제의 정답 근거는 반드시 그 레슨의 content에 명시적으로 존재해야 한다. 현재 content에 없는 사실을 묻는 문제는 절대 만들지 않는다.
11) 예: content에 '색목인은 재정과 행정을 담당했다'가 없으면 '재정과 행정을 담당한 계층은?' 같은 문제를 만들면 안 된다.
12) 다른 레슨, 원본의 다른 페이지, 외부 배경지식을 기억해야 풀 수 있는 문제를 만들지 않는다. visual_required=true인 경우만 현재 content와 연결된 이미지 자체의 정보까지 사용할 수 있다.
13) 문제를 만든 뒤 각 문항마다 '정답 근거 문장이 현재 content 안에 있는지' 자체 점검하고, 없으면 해당 문항을 삭제하거나 content를 원본 근거에 맞게 분리·재구성한다.
14) concept_summary는 시험 직전용 매우 짧은 요약이고, content는 반드시 해당 구간의 원본 내용을 빠짐없이 담는다.
15) 최종 출력 직전에 전체 PDF의 사실 단위와 생성된 모든 content를 다시 대조해 누락된 내용이 있으면 반드시 추가 레슨을 생성한다.`;
  async function upgradedGenerateLessons(curriculum,filesOverride=null){
    setText('curriculumMsg','PDF 전체 내용을 빠짐없이 짧은 레슨으로 나누는 중...');
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
    const strategy=String(generated.study_strategy||'원본 전체를 짧은 제시문으로 나눠 학습하고, 제시문을 가린 뒤 인출 문제를 푼다.');
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
      console.log('StudyLoop complete PDF-only curriculum generator enabled');
    }catch{setTimeout(patch,100)}
  }
  patch();
})();