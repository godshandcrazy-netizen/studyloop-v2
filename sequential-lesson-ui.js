(()=>{
  const byId=id=>document.getElementById(id);
  let armed=false,lastLessonVisible=false;
  function ensureButton(){
    const lesson=byId('lesson'),concept=byId('concept'),question=byId('question'),answers=byId('answers');
    if(!lesson||!concept||!question||!answers)return;
    let btn=byId('startQuestionsOnly');
    if(!btn){
      btn=document.createElement('button');
      btn.id='startQuestionsOnly';
      btn.className='primary wide';
      btn.textContent='문제 풀기 →';
      btn.style.margin='18px 0 8px';
      btn.onclick=()=>showQuestionOnly();
      concept.insertAdjacentElement('afterend',btn);
    }
  }
  function showPassageOnly(){
    ensureButton();
    const concept=byId('concept'),question=byId('question'),answers=byId('answers'),feedback=byId('feedback'),next=byId('next'),btn=byId('startQuestionsOnly');
    const passageLabel=document.querySelector('.studyloop-label:not(.question-label)');
    const questionLabel=document.querySelector('.question-label');
    if(concept)concept.style.display='block';
    if(passageLabel)passageLabel.style.display='block';
    if(btn)btn.style.display='block';
    if(question)question.style.display='none';
    if(questionLabel)questionLabel.style.display='none';
    if(answers)answers.style.display='none';
    if(feedback)feedback.style.display='none';
    if(next)next.style.display='none';
    armed=true;
  }
  function showQuestionOnly(){
    const concept=byId('concept'),question=byId('question'),answers=byId('answers'),feedback=byId('feedback'),next=byId('next'),btn=byId('startQuestionsOnly');
    const passageLabel=document.querySelector('.studyloop-label:not(.question-label)');
    const questionLabel=document.querySelector('.question-label');
    if(concept)concept.style.display='none';
    if(passageLabel)passageLabel.style.display='none';
    if(btn)btn.style.display='none';
    if(question)question.style.display='block';
    if(questionLabel)questionLabel.style.display='block';
    if(answers)answers.style.display='block';
    if(feedback)feedback.style.display='block';
    if(next&&!next.classList.contains('hidden'))next.style.display='block';
  }
  const obs=new MutationObserver(()=>{
    const lesson=byId('lesson');
    if(!lesson)return;
    const visible=!lesson.classList.contains('hidden');
    if(visible&&!lastLessonVisible){setTimeout(showPassageOnly,60)}
    if(visible&&armed){
      const q=byId('question');
      if(q&&q.textContent.trim()&&byId('startQuestionsOnly')?.style.display==='none')showQuestionOnly();
    }
    lastLessonVisible=visible;
  });
  const start=()=>{
    const lesson=byId('lesson');
    if(!lesson){setTimeout(start,120);return}
    obs.observe(lesson,{subtree:true,childList:true,attributes:true,characterData:true});
    ensureButton();
  };
  start();
})();