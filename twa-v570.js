(function(){'use strict';
const VERSION='5.6.10';
const STYLE_ID='v570-header-greeting-style';
const css=`
#v569Greeting{display:none!important}
.hdr.v570-header-card{align-items:center!important;gap:12px}
.hdr.v570-header-card>div:first-child{flex:1;min-width:0}
#v570HeaderMeta{margin-top:4px;display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;max-width:100%}
#v570HeaderMeta .v570-greet{font-size:13px;font-weight:650;color:var(--text);line-height:1.25;white-space:nowrap}
#v570HeaderMeta .v570-date{font-size:10.5px;color:var(--muted);line-height:1.25;white-space:nowrap}
@media(max-width:365px){
  #v570HeaderMeta{gap:3px;flex-direction:column;align-items:flex-start;margin-top:3px}
  #v570HeaderMeta .v570-greet{font-size:12.5px}
  #v570HeaderMeta .v570-date{font-size:10px}
}
`;
function injectStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=css;document.head.appendChild(s)}
function E(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}
function todaySafe(){try{return typeof todayKey==='function'?todayKey():new Date().toISOString().slice(0,10)}catch{return new Date().toISOString().slice(0,10)}}
function viewedDay(){try{return typeof dateKey!=='undefined'?dateKey:todaySafe()}catch{return todaySafe()}}
function greeting(){const h=new Date().getHours(),base=h<12?'Good morning':h<17?'Good afternoon':'Good evening';let name='';try{name=String(profile?.name||'').trim()}catch{}return name?`${base}, ${name}`:base}
function dateText(key){return new Date(key+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}
function renderHeaderMeta(){
  document.getElementById('v569Greeting')?.remove();
  const hdr=document.querySelector('.hdr');if(!hdr)return;hdr.classList.add('v570-header-card');
  const left=hdr.firstElementChild;if(!left)return;
  let meta=document.getElementById('v570HeaderMeta');if(!meta){meta=document.createElement('div');meta.id='v570HeaderMeta';const h1=left.querySelector('.h1');if(h1)h1.insertAdjacentElement('afterend',meta);else left.appendChild(meta)}
  const key=viewedDay(),today=todaySafe();
  meta.innerHTML=key===today
    ?`<span class="v570-greet">${E(greeting())}</span><span class="v570-date">${E(dateText(key))}</span>`
    :`<span class="v570-greet">Past day</span><span class="v570-date">${E(dateText(key))}</span>`;
  const dl=document.getElementById('dateLabel');if(dl)dl.style.display='none';
}
function enhance(){injectStyle();renderHeaderMeta()}
function wrap(name,after){const old=window[name];if(typeof old!=='function'||old.__v570Wrapped)return;const fn=function(){const out=old.apply(this,arguments);try{after.apply(this,arguments)}catch{}return out};fn.__v570Wrapped=true;window[name]=fn}
wrap('renderDayNav',()=>setTimeout(enhance,0));
wrap('refreshDayView',()=>setTimeout(enhance,0));
wrap('showTab',(name)=>{if(name==='today')setTimeout(enhance,0)});
wrap('renderProfile',()=>setTimeout(enhance,0));
injectStyle();setTimeout(enhance,0);setTimeout(enhance,120);document.documentElement.dataset.thalifyTwaFeatureRelease=VERSION;
})();
