(()=>{
  let timer=null;
  function ensure(){
    if(document.getElementById('sharedCurrLoading'))return document.getElementById('sharedCurrLoading');
    const o=document.createElement('div');
    o.id='sharedCurrLoading';
    o.style.cssText='display:none;position:fixed;inset:0;z-index:14000;background:rgba(8,22,27,.66);align-items:center;justify-content:center;padding:22px';
    o.innerHTML=`<div style="width:min(410px,100%);background:#fff;color:#203037;border-radius:22px;padding:24px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.28)"><div style="font-size:36px">⏳</div><h2 style="margin:10px 0 8px">커리큘럼 불러오는 중</h2><p style="margin:0;line-height:1.6;color:#6c7f86;font-weight:750">공유된 커리큘럼은 자료가 많으면<br><b>약 3분 정도 걸릴 수 있어.</b></p><div style="height:9px;background:#e7eef0;border-radius:99px;overflow:hidden;margin-top:18px"><i id="sharedLoadBar" style="display:block;height:100%;width:18%;background:#22afe8;border-radius:99px;transition:width 1s linear"></i></div></div>`;
    document.body.appendChild(o);
    return o;
  }
  function show(){
    const o=ensure();o.style.display='flex';
    const bar=document.getElementById('sharedLoadBar');let w=18;clearInterval(timer);timer=setInterval(()=>{w=Math.min(92,w+Math.random()*8);if(bar)bar.style.width=w+'%'},900);
  }
  function hide(){const o=document.getElementById('sharedCurrLoading');if(o)o.style.display='none';clearInterval(timer)}
  document.addEventListener('click',e=>{
    const b=e.target.closest('.studyShared');
    if(!b)return;
    show();
    setTimeout(hide,180000);
  },true);
  const wrap=()=>{
    if(typeof selectCurriculum!=='function'){setTimeout(wrap,200);return}
    if(selectCurriculum.__sharedLoadingWrapped)return;
    const old=selectCurriculum;
    selectCurriculum=async function(id){
      try{return await old.apply(this,arguments)}
      finally{hide()}
    };
    selectCurriculum.__sharedLoadingWrapped=true;
  };
  wrap();
})();