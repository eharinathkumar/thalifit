(function(){'use strict';
const VERSION='5.6.8';
const STYLE_ID='v568-stamp-pulse-style';
const css=`
#v568Greeting{margin:14px 2px 4px;display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
#v568Greeting .v568-greet{font:650 24px/1.12 'Fraunces',Georgia,serif;color:var(--text);letter-spacing:-.02em}
#v568Greeting .v568-date{font-size:11px;color:var(--muted);margin-top:5px;line-height:1.35}
#v566PulseHead.v568-daynav{margin:4px 0 8px!important;min-height:32px;justify-content:flex-end!important}
#v566PulseHead.v568-daynav .v566-pulse-title{display:none!important}
#v566PulseHead.v568-daynav .v566-dayctrl{margin-left:0!important;width:100%;justify-content:flex-end}
.daily-score.v568-score{min-height:0!important;padding:14px 14px 13px!important;overflow:hidden}
.daily-score.v568-score::after{width:150px!important;height:150px!important;right:-75px!important;top:-80px!important;opacity:.72}
.daily-score.v568-score>.score-head{display:none!important}
.daily-score.v568-score>.rings{display:none!important}
.v568-pulse-hero{display:grid;grid-template-columns:minmax(0,1fr) 98px;gap:14px;align-items:center;padding-bottom:11px;border-bottom:1px solid var(--line);position:relative;z-index:1}
.v568-cal-zone{display:flex;align-items:center;gap:12px;min-width:0}
.v568-cal-copy{min-width:68px}
.v568-cal-copy .v568-kicker{font-size:10px;font-weight:800;letter-spacing:.11em;color:var(--muted);text-transform:uppercase}
.v568-cal-copy .v568-small{font-size:10.5px;color:var(--faint);line-height:1.4;margin-top:4px}
.v568-cal-zone .ring{gap:0;flex:0 0 auto}
.v568-cal-zone .ring svg{width:84px!important;height:84px!important}
.v568-cal-zone .ring .lbl{display:none!important}
.v568-cal-zone .ring .sub2{font-size:9px!important;margin-top:-2px;color:var(--faint)}
.v568-stamp{width:92px;height:92px;display:grid;place-items:center;justify-self:end;filter:drop-shadow(0 8px 18px color-mix(in srgb,var(--turmeric) 12%,transparent))}
.v568-stamp svg{width:92px;height:92px;display:block;overflow:visible}
.v568-stamp .stamp-ring{fill:color-mix(in srgb,var(--cardsoft) 88%,transparent);stroke:var(--turmeric);stroke-width:2}
.v568-stamp .stamp-ring2{fill:none;stroke:color-mix(in srgb,var(--turmeric) 55%,var(--line));stroke-width:1}
.v568-stamp .stamp-word{fill:var(--text);font-family:'Public Sans',system-ui,sans-serif;font-size:15px;font-weight:800;letter-spacing:.04em}
.v568-stamp .stamp-arc{fill:var(--turmeric);font-family:'Public Sans',system-ui,sans-serif;font-size:7px;font-weight:800;letter-spacing:.16em}
.v568-stamp .stamp-star{fill:var(--turmeric)}
.daily-score.v568-score #mealBarWrap{margin-top:9px}
.daily-score.v568-score .mealbar{margin-top:9px!important;height:6px!important}
.daily-score.v568-score .legend{margin-top:5px!important;gap:5px 10px!important}
.daily-score.v568-score .legend div{font-size:9.5px!important}
.daily-score.v568-score #macroPie>div{margin-top:10px!important;padding-top:10px!important;gap:11px!important}
.daily-score.v568-score #macroPie>div>div:first-child{width:68px!important;height:68px!important}
.daily-score.v568-score #macroPie>div>div:first-child>div{width:40px!important;height:40px!important;font-size:7.5px!important}
.daily-score.v568-score #macroPie>div>div:last-child{font-size:11px!important}
.daily-score.v568-score #macroPie>div>div:last-child>div{padding:2px 0!important}
.daily-score.v568-score .sugar-block{margin-top:10px!important;padding-top:10px!important}
.daily-score.v568-score .sugar-value{font-size:20px!important}
.daily-score.v568-score .sugar-meter{height:8px!important;margin-top:8px!important}
.daily-score.v568-score .sugar-note{font-size:9.5px!important;margin-top:5px!important;line-height:1.35!important}
.daily-score.v568-score .sugar-scale{font-size:9px!important;margin-top:5px!important}
@media(max-width:365px){
  #v568Greeting .v568-greet{font-size:21px}
  .v568-pulse-hero{grid-template-columns:minmax(0,1fr) 82px;gap:8px}
  .v568-stamp,.v568-stamp svg{width:80px;height:80px}
  .v568-cal-zone{gap:7px}.v568-cal-copy{min-width:58px}
  .v568-cal-zone .ring svg{width:78px!important;height:78px!important}
}
`;
function injectStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=css;document.head.appendChild(s)}
function E(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}
function todaySafe(){try{return typeof todayKey==='function'?todayKey():new Date().toISOString().slice(0,10)}catch{return new Date().toISOString().slice(0,10)}}
function viewedDay(){try{return typeof dateKey!=='undefined'?dateKey:todaySafe()}catch{return todaySafe()}}
function currentGreeting(){
  const h=new Date().getHours(),base=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  let name='';try{name=String(profile?.name||'').trim()}catch{}
  return name?`${base}, ${name}`:base;
}
function dateText(key){
  const d=new Date(key+'T12:00:00');
  return d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
}
function renderGreeting(){
  const tab=document.getElementById('tab-today');if(!tab)return;
  let box=document.getElementById('v568Greeting');
  if(!box){box=document.createElement('div');box.id='v568Greeting';const nav=document.getElementById('dayNav');if(nav)nav.insertAdjacentElement('afterend',box);else tab.prepend(box)}
  const key=viewedDay(),today=todaySafe(),isToday=key===today;
  box.innerHTML=isToday
    ?`<div><div class="v568-greet">${E(currentGreeting())}</div><div class="v568-date">${E(dateText(key))}</div></div>`
    :`<div><div class="v568-greet">Past day</div><div class="v568-date">${E(dateText(key))} · your logs and totals for this day</div></div>`;
}
function stampMarkup(){return `<div class="v568-stamp" aria-label="Thalify daily fuel stamp">
<svg viewBox="0 0 100 100" role="img" aria-hidden="true">
<defs><path id="v568TopArc" d="M 20,50 A 30,30 0 0,1 80,50"/><path id="v568BottomArc" d="M 80,56 A 30,30 0 0,1 20,56"/></defs>
<circle class="stamp-ring" cx="50" cy="50" r="43"/><circle class="stamp-ring2" cx="50" cy="50" r="36"/>
<text class="stamp-arc"><textPath href="#v568TopArc" startOffset="50%" text-anchor="middle">FUEL THE GOAL</textPath></text>
<text class="stamp-word" x="50" y="55" text-anchor="middle">THALIFY</text>
<text class="stamp-arc"><textPath href="#v568BottomArc" startOffset="50%" text-anchor="middle">EVERY DAY</textPath></text>
<path class="stamp-star" d="M50 28l1.6 3.2 3.5.5-2.5 2.4.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.4 3.5-.5z"/>
<path class="stamp-star" d="M50 68l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z"/>
</svg></div>`}
function enhancePulseCard(){
  const card=document.querySelector('#tab-today .daily-score');if(!card)return;
  card.classList.add('v568-score');
  let hero=card.querySelector('.v568-pulse-hero');
  if(!hero){
    const rings=card.querySelector('.rings'),calRing=rings?.querySelector('.ring');if(!calRing)return;
    hero=document.createElement('div');hero.className='v568-pulse-hero';
    hero.innerHTML=`<div class="v568-cal-zone"><div class="v568-cal-copy"><div class="v568-kicker">Calories</div><div class="v568-small">Daily target progress</div></div></div>${stampMarkup()}`;
    hero.querySelector('.v568-cal-zone').appendChild(calRing);
    const scoreHead=card.querySelector('.score-head');
    if(scoreHead)scoreHead.insertAdjacentElement('afterend',hero);else card.prepend(hero);
  }
}
function relocateDayControls(){
  const g=document.getElementById('v568Greeting'),h=document.getElementById('v566PulseHead');if(!g||!h)return;
  h.classList.add('v568-daynav');
  if(g.nextElementSibling!==h)g.insertAdjacentElement('afterend',h);
}
function enhance(){injectStyle();renderGreeting();enhancePulseCard();relocateDayControls();const dl=document.getElementById('dateLabel');if(dl)dl.style.display='none'}
function wrap(name,after){
  const old=window[name];if(typeof old!=='function'||old.__v568Wrapped)return;
  const fn=function(){const out=old.apply(this,arguments);try{after.apply(this,arguments)}catch{}return out};fn.__v568Wrapped=true;window[name]=fn;
}
wrap('renderTotals',()=>setTimeout(enhance,0));
wrap('renderDayNav',()=>setTimeout(enhance,0));
wrap('refreshDayView',()=>setTimeout(enhance,0));
wrap('showTab',(name)=>{if(name==='today')setTimeout(enhance,0)});
wrap('renderProfile',()=>setTimeout(enhance,0));
injectStyle();setTimeout(enhance,0);setTimeout(enhance,120);document.documentElement.dataset.thalifyTwaFeatureRelease=VERSION;
})();
