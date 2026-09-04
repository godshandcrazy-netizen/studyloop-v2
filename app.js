/* StudyLoop v2 recovery bridge. */
(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    let url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    if (url.includes('/functions/v1/bright-handler')) {
      url = url.replace('/functions/v1/bright-handler', '/functions/v1/studyloop-lessons');
      if (typeof input === 'string') input = url;
      else input = new Request(url, input);
    }
    return originalFetch(input, init);
  };

  const script = document.createElement('script');
  script.src = 'https://godshandcrazy-netizen.github.io/studyloop/app.js?v=20260904';
  script.async = false;
  script.onerror = () => {
    const el = document.getElementById('setupMsg');
    if (el) el.textContent = '앱 로직을 불러오지 못했어. 잠시 후 새로고침해 줘.';
  };
  document.body.appendChild(script);
})();