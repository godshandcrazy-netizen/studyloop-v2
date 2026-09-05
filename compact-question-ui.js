(()=>{
const $=id=>document.getElementById(id);
const css=`
#adaptiveQuestionArea>div:nth-child(3){font-size:17px!important;line-height:1.45!important;padding:14px!important}
#adaptiveQuestionArea .ans{padding:12px 13px!important;margin:7px 0!important;line-height:1.35!important;font-size:15px!important}
#adaptiveExplain{background:#f5f8f9;border-radius:12px;padding:10px 12px!important;font-size:14px!important;line-height:1.45!important}
#adaptiveConceptArea .compact-full{display:none;margin-top:10px;background:#fff;border:2px solid #dbe7eb;border-radius:14px;padding:14px;white-space:pre-wrap;line-height:1.6}
#adaptiveConceptArea .compact-summary{font-size:17px;line-height:1.55}
`;const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
function compactConcept(){const a=$('adaptiveConceptArea');if(!a||a.dataset.compacted==='1')return;const blocks=[...a.querySelectorAll('div')];if(blocks.length<2)return;const text=a.textContent||'';if(text.length<180)return;a.dataset.compacted='1';const btn=[...a.querySelectorAll('button')].find(x=>x.id==='adaptiveBegin');const candidates=[...a.children].filter(x=>x.tagName==='DIV');if(candidates.length>=2){const full=candidates[candidates.length-1];if(full.textContent.length>160){full.classList.add('compact-full');const toggle=document.createElement('button');toggle.className='smallBtn wide';toggle.style.marginTop='10px';toggle.textContent='자세한 개념 보기';toggle.onclick=()=>{const open=full.style.display==='block';full.style.display=open?'none':'block';toggle.textContent=open?'자세한 개념 보기':'자세한 개념 접기'};full.insertAdjacentElement('afterend',toggle);if(btn)toggle.insertAdjacentElement('afterend',btn)}}}
}
function collapseExplanation(){const e=$('adaptiveExplain');if(!e||e.dataset.collapsed==='1'||!e.textContent.trim()||e.textContent.length<90)return;e.dataset.collapsed='1';const full=e.textContent;e.textContent=full.slice(0,75).trim()+'… ';const b=document.createElement('button');b.className='smallBtn';b.style.cssText='min-height:30px;padding:4px 8px;margin-left:4px';b.textContent='해설 보기';b.onclick=()=>{e.textContent=full};e.appendChild(b)}
let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{compactConcept();collapseExplanation()},40)}).observe(document.body,{childList:true,subtree:true,characterData:true});
})();