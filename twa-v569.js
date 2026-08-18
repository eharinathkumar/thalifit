(function(){'use strict';
const VERSION='5.6.9';
const STYLE_ID='v569-greeting-only-style';
const css=`
#v569Greeting{margin:14px 2px 6px}
#v569Greeting .v569-greet{font:650 24px/1.12 'Fraunces',Georgia,serif;color:var(--text);letter-spacing:-.02em}
#v569Greeting .v569-date{font-size:11px;color:var(--muted);margin-top:5px;line-height:1.35}
@media(max-width:365px){#v569Greeting .v569-greet{font-size:21px}}
`;
function injectStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=css;document.head.appendChild(s)}
function E(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}
function todaySafe(){try{return typeof todayKey==='function'?todayKey():new Date().toISOString().slice(0,10)}catch{return new Date().toISOString().slice(0,10)}}
function viewedDay(){try{return typeof dateKey!=='undefined'?dateKey:todaySafe()}catch{return todaySafe()}}
function greeting(){const h=new Date().getHours(),base=h<12?'Good morning':h<17?'Good afternoon':'Good evening';let name='';try{name=String(profile?.name||'').trim()}catch{}return name?`${base}, ${name}`:base}
function dateText(key){return new Date(key+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}
function renderGreeting(){const tab=document.getElementById('tab-today');if(!tab)return;let box=document.getElementById('v569Greeting');if(!box){box=document.createElement('div');box.id='v569Greeting';const nav=document.getElementById('dayNav');if(nav)nav.insertAdjacentElement('afterend',box);else tab.prepend(box)}const key=viewedDay(),today=todaySafe();box.innerHTML=key===today?`<div class="v569-greet">${E(greeting())}</div><div class="v569-date">${E(dateText(key))}</div>`:`<div class="v569-greet">Past day</div><div class="v569-date">${E(dateText(key))} · your logs and totals for this day</div>`}
function enhance(){injectStyle();renderGreeting();const dl=document.getElementById('dateLabel');if(dl)dl.style.display='none'}
function wrap(name,after){const old=window[name];if(typeof old!=='function'||old.__v569Wrapped)return;const fn=function(){const out=old.apply(this,arguments);try{after.apply(this,arguments)}catch{}return out};fn.__v569Wrapped=true;window[name]=fn}
wrap('renderDayNav',()=>setTimeout(enhance,0));
wrap('refreshDayView',()=>setTimeout(enhance,0));
wrap('showTab',(name)=>{if(name==='today')setTimeout(enhance,0)});
wrap('renderProfile',()=>setTimeout(enhance,0));
injectStyle();setTimeout(enhance,0);setTimeout(enhance,120);document.documentElement.dataset.thalifyTwaFeatureRelease=VERSION;
})();
