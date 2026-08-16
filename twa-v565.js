(function(){'use strict';
const VERSION='5.6.5';
const STYLE_ID='v565-added-sugar-style';
const css=`
.sugar-block{margin-top:15px;padding-top:14px;border-top:1px solid var(--line)}
.sugar-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.sugar-kicker{font-size:10px;font-weight:800;letter-spacing:.13em;color:var(--muted)}
.sugar-value{font:650 22px/1.1 'Fraunces',Georgia,serif;margin-top:4px}.sugar-right{text-align:right;font-size:11px;color:var(--muted);line-height:1.45}.sugar-state{font-weight:700}
.sugar-meter{position:relative;height:10px;border-radius:999px;background:var(--line);overflow:visible;margin-top:10px}.sugar-fill{height:100%;border-radius:999px;min-width:0}.sugar-mark{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--text);opacity:.55}.sugar-mark.six{left:60%}.sugar-mark.ten{right:0}
.sugar-scale{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:var(--faint);margin-top:6px}.sugar-note{font-size:10.5px;color:var(--muted);line-height:1.45;margin-top:7px}.sugar-note.warn{color:var(--turmeric)}
#addedSugarTrendCard{grid-column:1/-1}.sugar-trend-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.sugar-mini{background:var(--cardsoft);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center}.sugar-mini b{display:block;font:650 20px 'Fraunces',Georgia,serif}.sugar-mini span{font-size:9.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
`;
function injectStyle(){if(document.getElementById(STYLE_ID))return;const st=document.createElement('style');st.id=STYLE_ID;st.textContent=css;document.head.appendChild(st)}
function finite(v){const n=Number(v);return Number.isFinite(n)?n:null}
function round1(v){return Math.round(Number(v)*10)/10}
function sugarInference(name,calories){
  const nameText=String(name||'').trim(), cal=Math.max(0,Number(calories)||0), lower=nameText.toLowerCase();
  if(cal<=0)return {g:0,estimated:false,source:'identity'};
  const zero=[
    /^(apple|banana|orange|pear|peach|plum|kiwi|guava)(?:\s|\(|$)/i,
    /^(blueberries|blackberries|strawberries|grapes|watermelon|papaya|pineapple|pomegranate)(?:\s|\(|$)/i,
    /^(boiled egg|hard-boiled eggs|egg whites|tofu|firm tofu|silken tofu|tempeh|seitan)(?:\s|\(|$)/i,
    /^(lentils|black beans|kidney beans|white beans|chickpeas|split peas|edamame)(?:,|\s|\(|$)/i,
    /^(brown rice|white rice|quinoa|broccoli|corn|sweet potato|veggies, mixed|salad, plain)(?:\s|\(|$)/i,
    /^(black coffee|black tea|cold brew, black|unsweetened tea|diet soda|creatine)(?:\s|\(|$)/i
  ];
  if(zero.some(r=>r.test(nameText)))return {g:0,estimated:false,source:'identity'};
  let share=null;
  if(/\b(sugar|honey|jaggery|syrup)\b/i.test(lower))share=.95;
  else if(/\b(soda|sweet tea|sweetened coffee|milk tea|boba|frappuccino|frosty|milkshake|sweet lassi|thai iced tea|thai iced coffee|rose milk|badam milk|jigarthanda|falooda|horchata)\b/i.test(lower))share=.80;
  else if(/\b(gulab jamun|rasgulla|rasmalai|laddu|jalebi|jangiri|badusha|kaju katli|barfi|peda|sandesh|kalakand|soan papdi|mysore pak|baklava|churro|brownie|sundae|candy)\b/i.test(lower))share=.55;
  else if(/\b(ice cream|gelato|sorbet|frozen yogurt|kulfi|mcflurry)\b/i.test(lower))share=.32;
  else if(/\b(cookie|donut|muffin|cake|cheesecake|pie|tiramisu|cannoli|banana bread|croissant)\b/i.test(lower))share=.28;
  else if(/\b(halwa|kesari|kheer|payasam|sweet pongal|pudding)\b/i.test(lower))share=.35;
  if(share==null)return {g:null,estimated:false,source:'unknown'};
  return {g:round1(Math.min(cal/4,cal*share/4)),estimated:true,source:'estimated'};
}
function foodSugarByName(name){
  try{
    const f=(foods||[]).find(x=>x&&x.name===name&&finite(x.addedSugarG)!=null);
    return f?{g:finite(f.addedSugarG),estimated:!!f.addedSugarEstimated,source:f.addedSugarSource||'saved'}:null;
  }catch{return null}
}
function sugarForEntry(e){
  const exact=finite(e?.addedSugarG);
  if(exact!=null)return {g:Math.max(0,exact),estimated:!!e.addedSugarEstimated,source:e.addedSugarSource||'saved'};
  const personal=foodSugarByName(e?.name);if(personal)return personal;
  return sugarInference(e?.name,e?.cal);
}
function enrichEntry(e){
  if(!e||typeof e!=='object'||finite(e.addedSugarG)!=null)return false;
  const info=foodSugarByName(e.name)||sugarInference(e.name,e.cal);
  if(info.g==null)return false;
  e.addedSugarG=info.g;e.addedSugarEstimated=!!info.estimated;e.addedSugarSource=info.source;return true;
}
function enrichCurrentLog(){let changed=false;try{(log||[]).forEach(e=>{if(enrichEntry(e))changed=true})}catch{}return changed}
function enrichStoredLogs(){
  try{
    const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('mdp_log_'))keys.push(k)}
    keys.forEach(k=>{const rows=LS.get(k,[]);if(!Array.isArray(rows))return;let changed=false;rows.forEach(e=>{if(enrichEntry(e))changed=true});if(changed)LS.set(k,rows)});
  }catch{}
}
function sugarTotals(rows){
  let calories=0,knownCalories=0,sugarG=0,estimatedItems=0,knownItems=0;
  (rows||[]).forEach(e=>{if(!e)return;const q=Number(e.qty)||1,cal=Math.max(0,(Number(e.cal)||0)*q);calories+=cal;const info=sugarForEntry(e);if(info.g==null)return;knownItems++;knownCalories+=cal;sugarG+=Math.max(0,info.g)*q;if(info.estimated)estimatedItems++});
  return {calories,knownCalories,sugarG:round1(sugarG),estimatedItems,knownItems,coverage:calories>0?Math.min(100,knownCalories/calories*100):0};
}
function guideValues(){const cal=Math.max(1,Number(targets?.cal)||2000);return {cal,sixG:cal*.06/4,tenG:cal*.10/4}}
function sugarState(percent){if(percent<=6)return {label:'Within 6% guide',color:'var(--leaf)'};if(percent<=10)return {label:'Above 6% guide',color:'var(--turmeric)'};return {label:'Above 10% reference',color:'var(--chili)'}}
function renderDailySugar(){
  const pie=document.getElementById('macroPie');if(!pie)return;
  let el=document.getElementById('addedSugarDaily');if(!el){el=document.createElement('div');el.id='addedSugarDaily';el.className='sugar-block';pie.insertAdjacentElement('afterend',el)}
  let rows=[];try{rows=Array.isArray(log)?log:[]}catch{}const t=sugarTotals(rows),g=guideValues();
  if(!t.calories){el.innerHTML='<div class="sugar-kicker">ADDED SUGAR</div><div class="sugar-value">—</div><div class="sugar-note">Log food to see your daily added-sugar pattern.</div>';return}
  if(!t.knownCalories){el.innerHTML='<div class="sugar-kicker">ADDED SUGAR</div><div class="sugar-value" style="color:var(--turmeric)">Unknown</div><div class="sugar-note warn">These foods do not yet have supported added-sugar data. Thalify does not assume zero.</div>';return}
  const pct=t.sugarG*4/g.cal*100,state=sugarState(pct),fill=Math.min(100,pct/10*100);
  el.innerHTML=`<div class="sugar-head"><div><div class="sugar-kicker">ADDED SUGAR</div><div class="sugar-value">${round1(t.sugarG)} g</div></div><div class="sugar-right"><b>${round1(pct)}% of calorie target</b><br><span class="sugar-state" style="color:${state.color}">${state.label}</span></div></div><div class="sugar-meter"><div class="sugar-fill" style="width:${fill}%;background:${state.color}"></div><span class="sugar-mark six"></span><span class="sugar-mark ten"></span></div><div class="sugar-scale"><span>Lower is better</span><span>6% ≈ ${Math.round(g.sixG)}g · 10% ≈ ${Math.round(g.tenG)}g</span></div><div class="sugar-note ${t.coverage<80?'warn':''}">Sugar data covers ${Math.round(t.coverage)}% of today's logged calories${t.estimatedItems?` · ${t.estimatedItems} estimated item${t.estimatedItems===1?'':'s'}`:''}. Unknown foods are excluded, not counted as zero.</div>`;
}
function renderSugarTrends(){
  const root=document.getElementById('tab-trends');if(!root)return;let card=document.getElementById('addedSugarTrendCard');
  if(!card){card=document.createElement('div');card.id='addedSugarTrendCard';card.className='card';const first=root.querySelector('.card');if(first)first.insertAdjacentElement('afterend',card);else root.appendChild(card)}
  const days=Number(typeof trendPeriod!=='undefined'?trendPeriod:7)||7,g=guideValues(),records=[];
  for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=dayKeyOf(d),rows=LS.get('mdp_log_'+k,[]);const t=sugarTotals(rows);if(t.calories>0&&t.knownCalories>0){const pct=t.sugarG*4/g.cal*100;records.push({pct,sugar:t.sugarG,coverage:t.coverage})}}
  if(!records.length){card.innerHTML='<div class="serif" style="font-size:18px">Added sugar</div><div class="empty" style="margin-top:8px">No supported added-sugar data in this period yet.</div>';return}
  const avgPct=records.reduce((s,r)=>s+r.pct,0)/records.length,avgG=records.reduce((s,r)=>s+r.sugar,0)/records.length,coverage=records.reduce((s,r)=>s+r.coverage,0)/records.length,onGuide=records.filter(r=>r.pct<=6).length,overTen=records.filter(r=>r.pct>10).length;
  card.innerHTML=`<div class="serif" style="font-size:18px">Added sugar</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${days===7?'Week':days===30?'Month':'3 Months'} · percent of your current calorie target</div><div class="sugar-trend-grid"><div class="sugar-mini"><b>${round1(avgG)}g</b><span>Avg / tracked day</span></div><div class="sugar-mini"><b>${round1(avgPct)}%</b><span>Avg of target</span></div><div class="sugar-mini"><b>${onGuide}/${records.length}</b><span>Days ≤ 6%</span></div></div><div class="sugar-note">${overTen?`${overTen} tracked day${overTen===1?'':'s'} above the 10% reference. `:'No tracked days above the 10% reference. '}Average sugar-data coverage: ${Math.round(coverage)}%.</div>`;
}
function refreshSugarViews(){try{renderDailySugar()}catch{}try{if(typeof currentTab!=='undefined'&&currentTab==='trends')renderSugarTrends()}catch{}}

injectStyle();enrichStoredLogs();try{enrichCurrentLog()}catch{}
try{
  const oldPersist=persistLog;
  persistLog=function(){enrichCurrentLog();const out=oldPersist.apply(this,arguments);refreshSugarViews();return out};
}catch{}
try{
  const oldTotals=renderTotals;
  renderTotals=function(){const out=oldTotals.apply(this,arguments);renderDailySugar();return out};
}catch{}
try{
  const oldTrends=renderTrends;
  renderTrends=function(){const out=oldTrends.apply(this,arguments);renderSugarTrends();return out};
}catch{}
try{
  const oldPanel=addPanel;
  addPanel=function(meal){
    const html=oldPanel(meal);if(html.includes('mAddedSugar'))return html;
    return html.replace('<label class="checkline"><input type="checkbox" id="mSave" checked>', '<div class="row2"><label>Added sugar (g, optional)<input type="number" id="mAddedSugar" inputmode="decimal" placeholder="unknown"></label><label style="display:flex;align-items:flex-end;font-size:10px;line-height:1.4">Use the Nutrition Facts “Added Sugars” value when available.</label></div><label class="checkline"><input type="checkbox" id="mSave" checked>');
  };
  const oldManual=addManual;
  addManual=function(meal){
    const field=document.getElementById('mAddedSugar'),raw=field?field.value.trim():'',exact=raw===''?null:finite(raw),name=(document.getElementById('mName')?.value||'').trim(),before=Array.isArray(log)?log.length:0;
    const out=oldManual.apply(this,arguments);
    if(exact!=null&&exact>=0&&Array.isArray(log)&&log.length>before){const e=log[log.length-1];e.addedSugarG=exact;e.addedSugarEstimated=false;e.addedSugarSource='manual';try{const f=(foods||[]).slice().reverse().find(x=>x&&x.name===e.name);if(f){f.addedSugarG=exact;f.addedSugarEstimated=false;f.addedSugarSource='manual';LS.set('mdp_foods',foods)}}catch{}LS.set('mdp_log_'+dateKey,log);renderTotals();renderMeals()}
    return out;
  };
}catch{}

try{
  barcodeLookup=async function(code){
    const status=document.getElementById('scanStatus');
    try{
      const fields='product_name,brands,nutriments,serving_size';
      const r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields='+fields),data=await r.json();
      if(!data||data.status!==1||!data.product)throw new Error('not found');
      const prod=data.product,n=prod.nutriments||{},perServing=n['energy-kcal_serving']!=null,cal=Math.round(perServing?n['energy-kcal_serving']:(n['energy-kcal_100g']||0)),pro=Math.round((perServing?n['proteins_serving']:n['proteins_100g'])||0),carbs=Math.round((perServing?n['carbohydrates_serving']:n['carbohydrates_100g'])||0),fat=Math.round((perServing?n['fat_serving']:n['fat_100g'])||0);
      if(!cal)throw new Error('no nutrition data');
      const addedRaw=perServing?n['added-sugars_serving']:n['added-sugars_100g'],added=finite(addedRaw),brand=(prod.brands||'').split(',')[0].trim(),base=(brand?brand+' ':'')+(prod.product_name||'Scanned item'),portion=perServing?(prod.serving_size?'1 serving, '+prod.serving_size:'1 serving'):'per 100 g',name=normalizeSpecialPortionName((base+' ('+portion+')').slice(0,100));
      closeScanner();let f=foods.find(x=>x.name===name);if(!f){f={id:uid(),name,cal,protein:pro,carbs,fat,meal:scanMeal};foods.push(f)}
      if(added!=null&&added>=0){f.addedSugarG=round1(added);f.addedSugarEstimated=false;f.addedSugarSource='label/database'}else{const info=sugarInference(name,cal);if(info.g!=null){f.addedSugarG=info.g;f.addedSugarEstimated=info.estimated;f.addedSugarSource=info.source}}
      LS.set('mdp_foods',foods);addEntry(name,cal,pro,scanMeal,carbs,fat);renderMeals();
    }catch(e){status.textContent='Not in the product database — close and use ✨ Ask AI or manual entry instead.';scanBusy=false;scanRAF=requestAnimationFrame(async function retry(){scanBusy=false;const video=document.getElementById('scanVideo');if(scanStream)openScannerLoop(video)})}
  };
}catch{}

refreshSugarViews();
document.documentElement.dataset.thalifyTwaFeatureRelease=VERSION;
})();
