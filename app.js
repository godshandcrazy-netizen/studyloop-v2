/* StudyLoop v2 recovery bridge.
   Uses the last working application logic from the original StudyLoop repository
   while v2 keeps its own clean interface and configuration. */
(() => {
  const script = document.createElement('script');
  script.src = 'https://godshandcrazy-netizen.github.io/studyloop/app.js?v=20260904';
  script.async = false;
  script.onerror = () => {
    const el = document.getElementById('setupMsg');
    if (el) el.textContent = '앱 로직을 불러오지 못했어. 잠시 후 새로고침해 줘.';
  };
  document.body.appendChild(script);
})();