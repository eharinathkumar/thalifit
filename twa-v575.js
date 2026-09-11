(function(){'use strict';
const V='5.6.15';
let targetMeal=null;
const style=`.mp-add-shortcut{width:100%;margin:10px 0 4px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--turmeric) 34%,var(--line));border-radius:12px;background:color-mix(in srgb,var(--turmeric) 7%,var(--cardsoft));color:var(--text);display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left}.mp-add-shortcut .l{display:flex;align-items:center;gap:9px;min-width:0}.mp-add-shortcut .i{color:var(--turmeric);font-size:18px}.mp-add-shortcut .t{font-size:12px;font-weight:800}.mp-add-shortcut .s{display:block;margin-top:2px;font-size:10px;font-weight:500;color:var(--muted)}.mp-add-shortcut .a{color:var(--turmeric);font-size:16px;flex-shrink:0}`;
function packs(){try{const a=JSON.parse(localStorage.getItem('mdp_meal_packs_v1')||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
function inject(){
  document.querySelectorAll('#meals .meal[data-meal] .panel').forEach(panel=>{
    if(panel.querySelector('.mp-add-shortcut'))return;
    const meal=panel.closest('.meal')?.dataset?.meal||'Other';
    const relevant=packs().filter(p=>p.defaultMeal===meal).length;
    const total=packs().length;
    const b=document.createElement('button');
    b.type='button';b.className='mp-add-shortcut';
    b.innerHTML=`<span class="l"><span class="i">▣</span><span><span class="t">Meal packs</span><span class="s">${relevant?relevant+' saved for '+meal:total?total+' saved · log into '+meal:'Create or log a reusable meal'}</span></span></span><span class="a">›</span>`;
    b.onclick=()=>window.openMealPacksForMeal?.(meal);
    const searchRow=panel.firstElementChild;
    if(searchRow)searchRow.insertAdjacentElement('afterend',b);else panel.prepend(b);
  });
}
function addContextNote(meal){
  const body=document.getElementById('mealPackBody');
  if(!body||body.querySelector('.mp-context-note'))return;
  const n=document.createElement('div');
  n.className='mp-context-note mpc';
  n.style.cssText='padding:10px 12px;margin-bottom:10px';
  n.innerHTML=`<div class="mpm" style="margin:0">Logging from <b style="color:var(--text)">${meal}</b>. Choose any pack; it will be logged into ${meal} unless you change it on the review screen.</div>`;
  body.prepend(n);
}
function boot(){
  if(!document.getElementById('v575style')){const s=document.createElement('style');s.id='v575style';s.textContent=style;document.head.appendChild(s)}
  const originalOpen=window.openMealPacks;
  const originalReview=window.reviewMealPack;
  if(typeof originalOpen==='function'&&!originalOpen.__mealContext){
    const normal=function(){targetMeal=null;return originalOpen.apply(this,arguments)};normal.__mealContext=1;window.openMealPacks=normal;
    window.openMealPacksForMeal=function(meal){targetMeal=meal;const r=originalOpen();setTimeout(()=>addContextNote(meal),0);return r};
  }
  if(typeof originalReview==='function'&&!originalReview.__mealContext){
    const review=function(){const r=originalReview.apply(this,arguments);if(targetMeal){try{window.mpTarget?.(targetMeal)}catch{}const sel=document.querySelector('#mealPackBody select');if(sel)sel.value=targetMeal}return r};review.__mealContext=1;window.reviewMealPack=review;
  }
  const originalRender=window.renderMeals;
  if(typeof originalRender==='function'&&!originalRender.__mpAddEntry){
    const render=function(){const r=originalRender.apply(this,arguments);setTimeout(inject,0);return r};render.__mpAddEntry=1;window.renderMeals=render;
  }
  inject();
  document.documentElement.dataset.thalifyTwaMealPackEntryRelease=V;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();
