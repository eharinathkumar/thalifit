(function(){'use strict';
const VERSION='5.6.4';
function healthToast(message){
  let el=document.getElementById('healthReadingToast');
  if(!el){
    el=document.createElement('div');
    el.id='healthReadingToast';
    Object.assign(el.style,{position:'fixed',left:'50%',bottom:'calc(96px + env(safe-area-inset-bottom))',transform:'translate(-50%,8px)',zIndex:'280',background:'var(--text)',color:'var(--bg)',borderRadius:'999px',padding:'9px 14px',fontSize:'11.5px',fontWeight:'700',opacity:'0',pointerEvents:'none',transition:'opacity .18s, transform .18s',boxShadow:'0 8px 30px rgba(0,0,0,.25)'});
    document.body.appendChild(el);
  }
  el.textContent=message;
  el.style.opacity='1';el.style.transform='translate(-50%,0)';
  clearTimeout(window._healthReadingToastTimer);
  window._healthReadingToastTimer=setTimeout(()=>{el.style.opacity='0';el.style.transform='translate(-50%,8px)'},1500);
}
function refreshHealthViews(){
  try{if(typeof renderDueNudge==='function')renderDueNudge()}catch{}
  try{if(typeof currentTab!=='undefined'&&currentTab==='trends'&&typeof renderTrends==='function')renderTrends()}catch{}
  try{if(typeof currentTab!=='undefined'&&currentTab==='profile'&&typeof renderProfile==='function')renderProfile()}catch{}
  try{const p=document.getElementById('profileFull');if(p&&!p.classList.contains('hide')&&typeof renderProfileFull==='function')renderProfileFull()}catch{}
}
try{
  lastReading=function(k){
    const r=(readings||[]).filter(x=>x&&x.type===k).slice().sort((a,b)=>(Number(a.ts)||0)-(Number(b.ts)||0));
    return r.length?r[r.length-1]:null;
  };
}catch{}
const oldLog=window.logReading;
if(typeof oldLog==='function')window.logReading=function(k){
  let before=0;try{before=Array.isArray(readings)?readings.length:0}catch{}
  const out=oldLog.apply(this,arguments);
  let after=before;try{after=Array.isArray(readings)?readings.length:before}catch{}
  refreshHealthViews();
  if(after>before)healthToast('Health reading saved ✓');
  return out;
};
['setReadingInterval','enableReadings','disableReadings','toggleReadingsCard'].forEach(name=>{
  const old=window[name];
  if(typeof old!=='function')return;
  window[name]=function(){const out=old.apply(this,arguments);refreshHealthViews();return out};
});
document.documentElement.dataset.thalifyTwaFeatureRelease=VERSION;
})();
