(()=>{
const CSS=`
#home .path{position:relative;min-height:360px;padding:14px 0 42px;overflow:visible}
#home .lessonNode{--node:#9b59f6;--nodeDark:#7139bd;display:flex!important;align-items:center;justify-content:center;width:86px!important;height:78px!important;margin:26px auto!important;border:0!important;border-radius:50%!important;background:linear-gradient(145deg,#b86cff 0%,var(--node) 62%,#8749df 100%)!important;box-shadow:0 8px 0 var(--nodeDark),0 12px 20px rgba(0,0,0,.20)!important;color:#fff!important;font-size:0!important;font-weight:950;position:relative;transition:transform .14s ease,filter .14s ease;z-index:2}
#home .lessonNode:active{transform:translateY(5px);box-shadow:0 3px 0 var(--nodeDark),0 7px 12px rgba(0,0,0,.16)!important}
#home .lessonNode::before{content:'📖';font-size:35px;line-height:1;filter:drop-shadow(0 2px 0 rgba(0,0,0,.08))}
#home .lessonNode::after{content:'';position:absolute;left:16px;right:16px;top:10px;height:11px;border-radius:50%;background:rgba(255,255,255,.16);transform:rotate(-7deg);pointer-events:none}
#home .lessonNode:nth-child(6n+1){transform:translateX(-42px)}
#home .lessonNode:nth-child(6n+2){transform:translateX(22px)}
#home .lessonNode:nth-child(6n+3){transform:translateX(54px)}
#home .lessonNode:nth-child(6n+4){transform:translateX(12px)}
#home .lessonNode:nth-child(6n+5){transform:translateX(-50px)}
#home .lessonNode:nth-child(6n){transform:translateX(-12px)}
#home .lessonNode.done{--node:#58cc42;--nodeDark:#3d9c2e!important;background:linear-gradient(145deg,#78e65f,#58cc42 65%,#49b537)!important}
#home .lessonNode.done::before{content:'★';font-family:Arial,sans-serif;font-size:42px;text-shadow:0 2px 0 rgba(0,0,0,.10)}
#home .lessonNode.review1{--node:#a95df5;--nodeDark:#7739bd!important;background:linear-gradient(145deg,#c26fff,#a95df5 65%,#9148de)!important}
#home .lessonNode.review1::before{content:'✎';font-family:Arial,sans-serif;font-size:43px;transform:rotate(-10deg)}
#home .lessonNode.review2{--node:#586b75;--nodeDark:#394a52!important;background:linear-gradient(145deg,#70858f,#586b75 68%,#465860)!important;filter:saturate(.55)}
#home .lessonNode.review2::before{content:'🔒';font-size:31px;filter:grayscale(1) brightness(1.6)}
#home .lessonNode .badge{right:-27px!important;top:-9px!important;z-index:4;font-size:10px!important;background:#ff735a!important;box-shadow:0 3px 0 #cf4d3b;padding:5px 8px!important}
#home .lessonNode.path-current{outline:7px solid rgba(189,95,255,.25);outline-offset:7px;animation:pathPulse 1.8s ease-in-out infinite}
#home .lessonNode.path-current::before{content:'✎';font-family:Arial,sans-serif;font-size:43px;transform:rotate(-10deg)}
#home .pathDot{position:absolute;width:11px;height:11px;border-radius:50%;background:#3c515a;opacity:.8;z-index:1;pointer-events:none}
#home .pathLabel{position:absolute;z-index:5;background:#20343b;color:#eaf4f7;border:2px solid #40565f;border-radius:18px;padding:8px 12px;font-size:12px;font-weight:850;box-shadow:0 5px 12px rgba(0,0,0,.15);pointer-events:none;white-space:nowrap}
@keyframes pathPulse{0%,100%{outline-color:rgba(189,95,255,.20)}50%{outline-color:rgba(189,95,255,.48)}}
@media(max-width:390px){#home .lessonNode:nth-child(6n+1){transform:translateX(-34px)}#home .lessonNode:nth-child(6n+3){transform:translateX(43px)}#home .lessonNode:nth-child(6n+5){transform:translateX(-40px)}}
`;
function installCss(){if(document.getElementById('duoPathStyle'))return;const s=document.createElement('style');s.id='duoPathStyle';s.textContent=CSS;document.head.appendChild(s)}
function decorate(){const path=document.getElementById('path');if(!path)return;const nodes=[...path.querySelectorAll('.lessonNode')];if(!nodes.length)return;path.querySelectorAll('.pathDot,.pathLabel').forEach(x=>x.remove());nodes.forEach(x=>x.classList.remove('path-current'));const firstOpen=nodes.find(n=>!n.classList.contains('done')&&!n.disabled)||nodes[nodes.length-1];firstOpen?.classList.add('path-current');requestAnimationFrame(()=>{const pr=path.getBoundingClientRect();for(let i=0;i<nodes.length-1;i++){const a=nodes[i].getBoundingClientRect(),b=nodes[i+1].getBoundingClientRect();for(let k=1;k<=2;k++){const d=document.createElement('i');d.className='pathDot';const t=k/3;d.style.left=`${a.left-pr.left+a.width/2+(b.left+b.width/2-a.left-a.width/2)*t-5.5}px`;d.style.top=`${a.top-pr.top+a.height/2+(b.top+b.height/2-a.top-a.height/2)*t-5.5}px`;path.appendChild(d)}}if(firstOpen){const r=firstOpen.getBoundingClientRect(),lab=document.createElement('div');lab.className='pathLabel';lab.textContent='지금 학습';lab.style.left=`${Math.min(pr.width-78,r.right-pr.left+10)}px`;lab.style.top=`${r.top-pr.top+20}px`;path.appendChild(lab)}})}
installCss();let timer;const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(decorate,60)});const start=()=>{const p=document.getElementById('path');if(p){obs.observe(p,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});decorate()}else setTimeout(start,150)};start();
})();