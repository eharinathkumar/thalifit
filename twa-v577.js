(function(){
'use strict';
const V='5.6.17';
const state={blockedNative:0,legacyNotices:0,events:[]};
let active=null;

const css=`
#thalifyDialogRoot{position:fixed;inset:0;z-index:1200;display:none;align-items:flex-end;justify-content:center;background:rgba(6,8,5,.72);padding:18px 12px calc(18px + env(safe-area-inset-bottom));backdrop-filter:blur(4px)}
#thalifyDialogRoot.open{display:flex}
.thd-card{width:min(100%,430px);background:var(--card);border:1px solid var(--line);border-radius:22px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.38)}
.thd-kicker{font-size:9px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--turmeric);margin-bottom:5px}
.thd-title{font:650 21px/1.15 'Fraunces',Georgia,serif;color:var(--text)}
.thd-copy{font-size:13px;line-height:1.5;color:var(--muted);margin-top:8px}
.thd-field{margin-top:14px}.thd-field label{display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px}.thd-field input{width:100%;font-size:16px;padding:11px 12px}
.thd-actions{display:flex;gap:8px;margin-top:16px}.thd-actions button{flex:1;padding:11px 12px;font-weight:700;border-radius:10px}.thd-cancel{background:var(--cardsoft);border:1px solid var(--line);color:var(--text)}.thd-confirm{background:var(--turmeric);color:#1a1508}.thd-confirm.danger{background:var(--chili);color:#fff}
@media(min-width:560px){#thalifyDialogRoot{align-items:center}.thd-card{border-radius:20px}}
`;

function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function ensure(){
  if(!document.getElementById('thalifyDialogStyle')){const s=document.createElement('style');s.id='thalifyDialogStyle';s.textContent=css;document.head.appendChild(s)}
  if(document.getElementById('thalifyDialogRoot'))return;
  const root=document.createElement('div');root.id='thalifyDialogRoot';root.setAttribute('role','presentation');root.innerHTML='<div class="thd-card" role="dialog" aria-modal="true" aria-labelledby="thalifyDialogTitle" aria-describedby="thalifyDialogCopy" data-testid="thalify-dialog"><div class="thd-kicker">Thalify</div><div class="thd-title" id="thalifyDialogTitle"></div><div class="thd-copy" id="thalifyDialogCopy"></div><div id="thalifyDialogField"></div><div class="thd-actions"><button type="button" class="thd-cancel" data-testid="thalify-dialog-cancel">Cancel</button><button type="button" class="thd-confirm" data-testid="thalify-dialog-confirm">OK</button></div></div>';
  document.body.appendChild(root);
  root.addEventListener('click',e=>{if(e.target===root)finish(active?.kind==='notice'?true:null)});
  root.querySelector('.thd-cancel').addEventListener('click',()=>finish(null));
  root.querySelector('.thd-confirm').addEventListener('click',()=>{
    if(!active)return;
    if(active.kind==='prompt'){const i=root.querySelector('#thalifyDialogInput');finish(i?i.value:'');}
    else finish(true);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)finish(active.kind==='notice'?true:null)});
}
function finish(value){
  if(!active)return;
  const {resolve,returnFocus}=active;active=null;
  const root=document.getElementById('thalifyDialogRoot');root?.classList.remove('open');
  if(returnFocus&&typeof returnFocus.focus==='function')setTimeout(()=>returnFocus.focus(),0);
  resolve(value);
}
function openDialog(o){
  ensure();
  if(active)finish(active.kind==='notice'?true:null);
  return new Promise(resolve=>{
    const root=document.getElementById('thalifyDialogRoot');
    const title=String(o.title||'Thalify');const message=String(o.message||'');
    state.events.push({kind:o.kind||'notice',title,message,at:Date.now()});
    if(state.events.length>80)state.events.shift();
    active={resolve,kind:o.kind||'notice',returnFocus:document.activeElement};
    root.querySelector('#thalifyDialogTitle').textContent=title;
    const copy=root.querySelector('#thalifyDialogCopy');copy.textContent=message;copy.style.display=message?'block':'none';
    const field=root.querySelector('#thalifyDialogField');field.innerHTML='';
    const cancel=root.querySelector('.thd-cancel'),confirm=root.querySelector('.thd-confirm');
    cancel.textContent=o.cancelLabel||'Cancel';confirm.textContent=o.confirmLabel||(o.kind==='notice'?'Got it':'Continue');confirm.classList.toggle('danger',!!o.danger);
    cancel.style.display=o.kind==='notice'?'none':'block';
    if(o.kind==='prompt'){
      field.innerHTML=`<div class="thd-field"><label for="thalifyDialogInput">${esc(o.label||'Value')}</label><input id="thalifyDialogInput" data-testid="thalify-dialog-input" type="${esc(o.type||'text')}" inputmode="${esc(o.inputMode||'text')}" value="${esc(o.defaultValue??'')}" autocomplete="off"></div>`;
      setTimeout(()=>{const i=root.querySelector('#thalifyDialogInput');i?.focus();i?.select()},20);
    }else setTimeout(()=>confirm.focus(),20);
    root.classList.add('open');
  });
}
window.thalifyNotice=function(o){if(typeof o==='string')o={message:o};return openDialog({kind:'notice',title:o?.title||'Thalify',message:o?.message||'',confirmLabel:o?.buttonLabel||'Got it'})};
window.thalifyConfirm=function(o){return openDialog({kind:'confirm',title:o?.title||'Are you sure?',message:o?.message||'',confirmLabel:o?.confirmLabel||'Continue',cancelLabel:o?.cancelLabel||'Cancel',danger:!!o?.danger})};
window.thalifyPrompt=function(o){return openDialog({kind:'prompt',title:o?.title||'Enter a value',message:o?.message||'',label:o?.label||'Value',defaultValue:o?.defaultValue??'',type:o?.type||'text',inputMode:o?.inputMode||'text',confirmLabel:o?.confirmLabel||'Save',cancelLabel:o?.cancelLabel||'Cancel'})};

function mappedNotice(message){
  const m=String(message||'');
  if(/weigh-in/i.test(m))return{title:'Add a weigh-in first',message:m};
  if(/coach|check-in/i.test(m))return{title:'Check-in unavailable',message:m};
  if(/backup/i.test(m))return{title:'Backup couldn’t be restored',message:m};
  if(/choose at least one food/i.test(m))return{title:'Choose at least one food',message:'Select a food before logging this meal pack.'};
  if(/meal pack a name/i.test(m))return{title:'Name your meal pack',message:'Add a name before saving this meal pack.'};
  if(/add at least one food/i.test(m))return{title:'Add food to your meal pack',message:'A meal pack needs at least one food before it can be saved.'};
  if(/no foods are logged/i.test(m))return{title:'Nothing to replace',message:m};
  return{title:'Thalify',message:m};
}
const browserAlert=window.alert?.bind(window),browserConfirm=window.confirm?.bind(window),browserPrompt=window.prompt?.bind(window);
window.alert=function(message){state.legacyNotices++;window.thalifyNotice(mappedNotice(message));};
window.confirm=function(message){state.blockedNative++;window.thalifyNotice({title:'Action safely stopped',message:'This action used an outdated confirmation path. Nothing was changed.'});return false;};
window.prompt=function(message){state.blockedNative++;window.thalifyNotice({title:'Action safely stopped',message:'This input used an outdated browser prompt. Nothing was changed.'});return null;};

function withLegacyConfirmTrue(fn,args,ctx){const prev=window.confirm;window.confirm=()=>true;try{return fn.apply(ctx,args)}finally{window.confirm=prev}}
function wrapConfirmAction(name,builder){
  const old=window[name];if(typeof old!=='function'||old.__thalifyDialogWrapped)return;
  const wrapped=async function(...args){const o=builder(args);const ok=await window.thalifyConfirm(o);if(!ok)return;return withLegacyConfirmTrue(old,args,this)};wrapped.__thalifyDialogWrapped=true;window[name]=wrapped;
}
function groceryCount(){try{const a=JSON.parse(localStorage.getItem('mdp_kitchen_groceries')||'[]');return Array.isArray(a)?a.length:0}catch{return 0}}
wrapConfirmAction('deleteShoppingList',()=>{const n=groceryCount();return{title:'Delete shopping list?',message:`This will remove all ${n} grocery item${n===1?'':'s'} from this list. This can’t be undone.`,confirmLabel:'Delete list',danger:true}});
wrapConfirmAction('updatePackFromReview',()=>({title:'Update this meal pack?',message:'Replace the saved foods, quantities, and default meal with what is shown here. Existing food logs will not change.',confirmLabel:'Update pack'}));
wrapConfirmAction('updatePackFromMeal',args=>({title:'Replace this saved meal pack?',message:`Use the foods currently logged in ${args[1]||'this meal'} as the new saved contents. Existing food logs will not change.`,confirmLabel:'Replace pack'}));
wrapConfirmAction('replacePackFromMeal',()=>({title:'Replace the foods in this meal pack?',message:'Use the foods currently logged in the selected meal as this pack’s saved contents. Existing food logs will not change.',confirmLabel:'Replace foods'}));
wrapConfirmAction('deleteMealPack',()=>({title:'Delete this meal pack?',message:'This removes the saved shortcut only. Historical food logs will stay unchanged.',confirmLabel:'Delete pack',danger:true}));

window.logWeightPrompt=async function(){
  if(!profile)return;
  const unit=profile.units==='metric'?'kg':'lb';
  const v=await window.thalifyPrompt({title:'Log today’s weight',label:`Weight (${unit})`,inputMode:'decimal',confirmLabel:'Save weight'});if(v==null||String(v).trim()==='')return;
  const num=Number(v);if(!Number.isFinite(num)||num<=0){await window.thalifyNotice({title:'Check the weight',message:'Enter a number greater than zero.'});return;}
  const kg=profile.units==='metric'?num:lbToKg(num);weights=weights.filter(w=>w.date!==dateKey);weights.push({date:dateKey,kg:Math.round(kg*10)/10});weights.sort((a,b)=>a.date<b.date?-1:1);LS.set('mdp_weights',weights);profile.weightKg=Math.round(kg*10)/10;LS.set('mdp_profile',profile);renderProfile();
};
window.logReading=async function(k){
  const t=READING_TYPES.find(x=>x.k===k);if(!t)return;
  if(k==='bp'){
    const s=await window.thalifyPrompt({title:'Log blood pressure',label:'Systolic (top number)',inputMode:'numeric',confirmLabel:'Next'});if(s==null)return;
    const d=await window.thalifyPrompt({title:'Log blood pressure',label:'Diastolic (bottom number)',inputMode:'numeric',confirmLabel:'Save reading'});if(d==null)return;
    const sn=Number(s),dn=Number(d);if(!sn||!dn){await window.thalifyNotice({title:'Check the reading',message:'Enter both systolic and diastolic values.'});return;}
    readings.push({id:uid(),type:k,value:Math.round(sn),value2:Math.round(dn),date:todayKey(),ts:Date.now()});
  }else{
    const v=await window.thalifyPrompt({title:`Log ${t.label.toLowerCase()}`,label:`${t.label} (${t.unit})`,inputMode:'decimal',confirmLabel:'Save reading'});if(v==null)return;
    const n=Number(v);if(!n){await window.thalifyNotice({title:'Check the reading',message:'Enter a valid number.'});return;}
    readings.push({id:uid(),type:k,value:Math.round(n*10)/10,date:todayKey(),ts:Date.now()});
  }
  LS.set('mdp_readings',readings);renderProfile();
};
window.editQty=async function(id){
  const entry=log.find(x=>x.id===id);if(!entry)return;const info=foodUnitInfo(entry.name),current=entry.qty||1;const currentShown=info?Math.round(info.amount*current*100)/100:current;
  const v=await window.thalifyPrompt({title:`Adjust ${entry.name}`,label:info?`Amount (${info.unit}${info.unit==='cup'?'s':''})`:'Serving amount',defaultValue:currentShown,inputMode:'decimal',confirmLabel:'Update amount'});if(v==null)return;
  const value=Number(v);if(!value)return;const multiplier=info?value/info.amount:value;entry.qty=Math.min(10,Math.max(.25,Math.round(multiplier*4)/4));persistLog();
};

window.__thalifyQC=Object.freeze({version:V,get blockedNativeDialogs(){return state.blockedNative},get legacyNotices(){return state.legacyNotices},get dialogEvents(){return state.events.slice()},hasDialogApi:true});
document.documentElement.dataset.thalifyTwaFeatureRelease=V;
document.documentElement.dataset.thalifyDialogs='branded';
})();
