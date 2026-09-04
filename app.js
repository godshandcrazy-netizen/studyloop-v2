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
  const loadMainApp = () => {
    patchSupabase();
    const script = document.createElement('script');
    script.src = 'https://godshandcrazy-netizen.github.io/studyloop/app.js?v=20260904-2';
    script.async = false;
    script.onload = enhanceLessonUI;
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