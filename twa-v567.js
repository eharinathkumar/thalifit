(function(){'use strict';
const VERSION='5.6.7';
const css=`
#dayNav{display:none!important}
.v567-pulse-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:-2px 0 12px}
.v567-pulse-title{font-size:9.5px;font-weight:800;letter-spacing:.12em;color:var(--faint)}
.v567-dayctrl{display:flex;align-items:center;gap:4px;margin-left:auto}
.v567-daybtn{width:28px;height:28px;display:grid;place-items:center;background:var(--cardsoft);border:1px solid var(--line);color:var(--muted);border-radius:9px;padding:0;font-size:16px}
.v567-daybtn:disabled{opacity:.28;cursor:default}
.v567-daypill{background:var(--cardsoft);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:6px 9px;min-width:112px;text-align:center;line-height:1.05}
.v567-daypill b{display:block;font-size:11.5px}.v567-daypill small{display:block;font-size:8.5px;color:var(--faint);margin-top:3px;font-weight:600}
.v567-daypill.past{border-color:color-mix(in srgb,var(--turmeric) 65%,var(--line));color:var(--turmeric)}
@media(max-width:365px){.v567-daypill{min-width:100px;padding-left:7px;padding-right:7px}}
`;
function injectStyle(){if(document.getElementById('v567style'))return;const s=document.createElement('style');s.id='v567style';s.textContent=css;document.head.appendChild(s)}
function E(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function currentDayKey(){try{return dateKey||todayKey()}catch{return new Date().toISOString().slice(0,10)}}
function todayKeySafe(){try{return todayKey()}catch{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}}
function dayNice(k){const d=new Date(k+'T12:00:00');return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}
function isTodayTab(){const t=document.getElementById('tab-today');return !!t&&!t.classList.contains('hide')}
function pulseCard(){return document.getElementById('macroPie')?.closest('.card')||document.querySelector('#tab-today > .card:not(#targetsPanel)')}
function syncPulseDate(){
  const nav=document.getElementById('dayNav');if(nav)nav.style.display='none';
  const card=pulseCard();if(!card)return;let h=document.getElementById('v567PulseHead');if(!h){h=document.createElement('div');h.id='v567PulseHead';h.className='v567-pulse-head';const rings=card.querySelector('.rings');card.insertBefore(h,rings||card.firstChild)}
  const key=currentDayKey(),today=todayKeySafe(),isToday=key===today,label=isToday?`Today · ${new Date(today+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}`:dayNice(key);
  h.innerHTML=`<div class="v567-pulse-title">DAILY PULSE</div><div class="v567-dayctrl"><button class="v567-daybtn" onclick="goDay(-1)" aria-label="Previous day">‹</button><button class="v567-daypill ${isToday?'':'past'}" ${isToday?'disabled':'onclick="goToday()"'} aria-label="${isToday?'Today':`Viewing ${E(label)}. Return to today`}"><b>${E(label)}</b>${isToday?'':'<small>tap to return to Today</small>'}</button><button class="v567-daybtn" onclick="goDay(1)" ${isToday?'disabled':''} aria-label="Next day">›</button></div>`;
  const dl=document.getElementById('dateLabel');if(dl)dl.style.display=isTodayTab()?'none':'';
}
function wrap(){
  const oldDay=window.renderDayNav;if(typeof oldDay==='function')window.renderDayNav=function(){const out=oldDay.apply(this,arguments);syncPulseDate();return out};
  const oldRefresh=window.refreshDayView;if(typeof oldRefresh==='function')window.refreshDayView=function(){const out=oldRefresh.apply(this,arguments);syncPulseDate();return out};
  const oldTotals=window.renderTotals;if(typeof oldTotals==='function')window.renderTotals=function(){const out=oldTotals.apply(this,arguments);syncPulseDate();return out};
  const oldShow=window.showTab;if(typeof oldShow==='function')window.showTab=function(name){const out=oldShow.apply(this,arguments);setTimeout(()=>{const dl=document.getElementById('dateLabel');if(dl)dl.style.display=name==='today'?'none':'';if(name==='today')syncPulseDate()},0);return out};
}
injectStyle();wrap();syncPulseDate();document.documentElement.dataset.thalifyTwaFeatureRelease=VERSION;
})();
