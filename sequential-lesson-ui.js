(()=>{
  const $=id=>document.getElementById(id);
  const style=document.createElement('style');
  style.textContent=`
#lesson[data-phase="passage"] #question,
#lesson[data-phase="passage"] #answers,
#lesson[data-phase="passage"] #feedback,
#lesson[data-phase="passage"] #next,
#lesson[data-phase="passage"] .question-label{display:none!important}
#lesson[data-phase="passage"] #concept,
#lesson[data-phase="passage"] #startQuestionsOnly,
#lesson[data-phase="passage"] .studyloop-label:not(.question-label){display:block!important}
#lesson[data-phase="questions"] #concept,
#lesson[data-phase="questions"] #startQuestionsOnly,
#lesson[data-phase="questions"] .studyloop-label:not(.question-label){display:none!important}
#lesson[data-phase="questions"] #question,
#lesson[data-phase="questions"] #answers,
#lesson[data-phase="questions"] .question-label{display:block!important}
#lesson[data-phase="questions"] #feedback{display:block!important}
`;
  document.head.appendChild(style);
  let lastVisible=false,lastTitle='';
  function ensureButton(){
    const concept=$('concept'); if(!concept)return null;
    let b=$('startQuestionsOnly');
    if(!b){b=document.createElement('button');b.id='startQuestionsOnly';b.className='primary wide';b.textContent='문제 풀기 →';b.style.margin='18px 0 8px';b.onclick=()=>{const lesson=$('lesson');if(lesson)lesson.dataset.phase='questions';window.scrollTo({top:0,behavior:'instant'})};concept.insertAdjacentElement('afterend',b)}
    return b;
  }
  function startPassage(){const lesson=$('lesson');if(!lesson)return;ensureButton();lesson.dataset.phase='passage';const feedback=$('feedback');if(feedback)feedback.textContent='';window.scrollTo({top:0,behavior:'instant'})}
  const tick=()=>{
    const lesson=$('lesson');if(!lesson)return;
    const visible=!lesson.classList.contains('hidden');
    const title=$('ltitle')?.textContent||'';
    if(visible&&(!lastVisible||title!==lastTitle))startPassage();
    if(!visible)delete lesson.dataset.phase;
    lastVisible=visible;lastTitle=title;
  };
  const wait=()=>{const lesson=$('lesson');if(!lesson){setTimeout(wait,100);return}ensureButton();new MutationObserver(tick).observe(lesson,{subtree:true,childList:true,attributes:true,characterData:true});setInterval(tick,250);tick()};
  wait();
})();