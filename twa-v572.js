(function(){'use strict';
const VERSION='5.6.12';
const P='mdp_kitchen_pantry',G='mdp_kitchen_groceries',M='mdp_kitchen_planned';
let activeSection=null,applying=false,shopObserver=null;

const css=`
/* v5.6.12 — native-inspired Kitchen hub + grocery lifecycle polish */
#tab-kitchen{gap:12px!important}
#tab-kitchen .khero{align-items:flex-start;padding:2px 2px 0}
#tab-kitchen .khero h2{font-size:24px!important;margin-top:3px!important}
#tab-kitchen .khero p{max-width:360px}
#tab-kitchen .kcount{display:none!important}
.k572-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:2px}
.k572-tile{min-width:0;min-height:112px;background:var(--card);border:1px solid var(--line);border-radius:18px;color:var(--text);padding:13px 12px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;gap:10px;box-shadow:0 1px 0 rgba(255,255,255,.02)}
.k572-tile:active{transform:translateY(1px)}
.k572-tile.on{border-color:color-mix(in srgb,var(--turmeric) 72%,var(--line));background:color-mix(in srgb,var(--turmeric) 6%,var(--card))}
.k572-tiletop{display:flex;justify-content:space-between;align-items:center;gap:8px}
.k572-icon{width:34px;height:34px;border-radius:11px;background:var(--cardsoft);border:1px solid var(--line);display:grid;place-items:center;color:var(--turmeric);flex:0 0 34px}
.k572-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.k572-arrow{color:var(--faint);font-size:16px}
.k572-title{font:600 16px/1.15 'Fraunces',Georgia,serif}
.k572-meta{font-size:10.5px;color:var(--muted);line-height:1.35;margin-top:4px}
.k572-focushead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px}
.k572-focushead b{font:600 17px 'Fraunces',Georgia,serif}
.k572-focushead button{background:none;color:var(--turmeric);font-size:11px;font-weight:700;padding:7px 4px}
.k572-source{display:none!important}
.k572-source.k572-show{display:block!important;margin-top:0!important}
.k572-source.k572-show+.k572-source.k572-show{margin-top:10px!important}
.k572-home-note{font-size:10.5px;color:var(--faint);line-height:1.45;padding:2px 2px 0}
.shop-delete-list{width:100%;margin:0 0 12px;background:none;border:1px solid color-mix(in srgb,var(--chili) 48%,var(--line));color:var(--chili);padding:10px 12px;font-weight:700;font-size:12px}
.shop-close-note{font-size:10px;color:var(--faint);text-align:center;line-height:1.4;margin:-2px 0 10px}
@media(max-width:350px){.k572-grid{gap:8px}.k572-tile{min-height:106px;padding:11px 10px}.k572-title{font-size:15px}}
`;

function injectStyle(){if(document.getElementById('v572style'))return;const s=document.createElement('style');s.id='v572style';s.textContent=css;document.head.appendChild(s)}
function read(k,fb){try{const raw=localStorage.getItem(k);return raw?JSON.parse(raw):fb}catch{return fb}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function pantry(){const a=read(P,[]);return Array.isArray(a)?a:[]}
function groceries(){const a=read(G,[]);return Array.isArray(a)?a:[]}
function planned(){const a=read(M,[]);return Array.isArray(a)?a:[]}
function kitchenVisible(){const t=document.getElementById('tab-kitchen');return !!t&&!t.classList.contains('hide')}
function shoppingVisible(){const t=document.getElementById('shoppingMode');return !!t&&!t.classList.contains('hide')}
function purgeCompletedGroceries(){const a=groceries(),keep=a.filter(x=>!x.done);if(keep.length!==a.length){write(G,keep);return a.length-keep.length}return 0}
function icon(name){
  const paths={
    pantry:'<path d="M5 8h14l-1.2 11H6.2L5 8Z"/><path d="M9 8V6.5A3 3 0 0 1 12 3.5a3 3 0 0 1 3 3V8"/>',
    groceries:'<path d="M4 6h2l1.6 9.2a2 2 0 0 0 2 1.7h6.9a2 2 0 0 0 2-1.6L20 9H7"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
    recipes:'<path d="M7 4h10v16H7z"/><path d="M10 8h4M10 12h4M10 16h3"/>',
    match:'<path d="M8 5h8M6 9h12M8 13h8M10 17h4"/><path d="M4 4l1 1 2-2M17 18l1 1 2-2"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.pantry}</svg>`;
}
function findCards(root){
  const cards=[...root.children].filter(el=>el.classList?.contains('kcard'));
  return {
    pantry:cards.find(c=>c.querySelector('.serif')?.textContent.trim()==='Pantry')||null,
    recipes:cards.find(c=>c.querySelector('.kcollapse b')?.textContent.trim()==='Meals you can make')||null,
    match:cards.find(c=>c.querySelector('.kcollapse b')?.textContent.trim()==='Best matches')||null,
    planned:cards.find(c=>c.querySelector('.kcollapse b')?.textContent.trim()==='Planned')||null,
    groceries:cards.find(c=>c.querySelector('.kcollapse b')?.textContent.trim()==='Groceries')||null
  };
}
function tile(section,title,meta,iconName){return `<button type="button" class="k572-tile ${activeSection===section?'on':''}" data-k572-section="${section}" onclick="openKitchenSection('${section}')"><span class="k572-tiletop"><span class="k572-icon">${icon(iconName)}</span><span class="k572-arrow">›</span></span><span><span class="k572-title">${esc(title)}</span><span class="k572-meta">${esc(meta)}</span></span></button>`}
function focusLabel(){return activeSection==='pantry'?'Pantry':activeSection==='recipes'?'Recipes':activeSection==='match'?'Meal Match':''}
function applyKitchenLayout(){
  if(applying||!kitchenVisible())return;
  const root=document.getElementById('kitchenContent');if(!root)return;
  const c=findCards(root);if(!c.pantry||!c.recipes||!c.match||!c.planned||!c.groceries)return;
  applying=true;
  try{
    const hero=root.querySelector('.khero');if(hero){hero.classList.add('k572-hero');const h=hero.querySelector('h2'),p=hero.querySelector('p');if(h)h.textContent='Cook with what you have.';if(p)p.textContent='Pantry, groceries, recipes and meal matching — in one place.'}
    [c.pantry,c.recipes,c.match,c.planned,c.groceries].forEach(x=>{x.classList.add('k572-source');x.classList.remove('k572-show')});
    let hub=document.getElementById('k572Hub');
    if(!hub){hub=document.createElement('div');hub.id='k572Hub';hub.className='k572-grid';hero?.insertAdjacentElement('afterend',hub)}
    const ready=c.recipes.querySelectorAll('.kmeal').length,matched=c.match.querySelectorAll('.kmeal').length,pc=planned().length,g=groceries(),pending=g.filter(x=>!x.done).length;
    hub.innerHTML=tile('pantry','Pantry',`${pantry().length} ingredient${pantry().length===1?'':'s'}`,'pantry')+tile('groceries','Groceries',pending?`${pending} to pick up`:'List is clear','groceries')+tile('recipes','Recipes',pc?`${ready} ready · ${pc} planned`:`${ready} ready now`,'recipes')+tile('match','Meal Match',matched?`${matched} pantry-fit suggestion${matched===1?'':'s'}`:'Add pantry items to match','match');
    let fh=document.getElementById('k572FocusHead');
    if(activeSection&&activeSection!=='groceries'){
      if(!fh){fh=document.createElement('div');fh.id='k572FocusHead';fh.className='k572-focushead';hub.insertAdjacentElement('afterend',fh)}
      fh.innerHTML=`<b>${focusLabel()}</b><button type="button" onclick="closeKitchenSection()">Close</button>`;
      if(activeSection==='pantry')c.pantry.classList.add('k572-show');
      if(activeSection==='recipes'){c.recipes.classList.add('k572-show');c.planned.classList.add('k572-show')}
      if(activeSection==='match')c.match.classList.add('k572-show');
      const target=activeSection==='pantry'?c.pantry:activeSection==='recipes'?c.recipes:c.match;
      if(fh.nextElementSibling!==target)fh.insertAdjacentElement('afterend',target);
      if(activeSection==='recipes'&&c.recipes.nextElementSibling!==c.planned)c.recipes.insertAdjacentElement('afterend',c.planned);
    }else if(fh){fh.remove()}
    let note=document.getElementById('k572HomeNote');if(!note){note=document.createElement('div');note.id='k572HomeNote';note.className='k572-home-note';note.textContent='Planning stays separate from what you have eaten today.';root.appendChild(note)}
  }finally{applying=false}
}
window.openKitchenSection=function(section){
  if(section==='groceries'){activeSection=null;applyKitchenLayout();if(typeof window.openShoppingList==='function')window.openShoppingList();return}
  activeSection=activeSection===section?null:section;applyKitchenLayout();
  if(activeSection)setTimeout(()=>document.getElementById('k572FocusHead')?.scrollIntoView({behavior:'smooth',block:'nearest'}),20)
};
window.closeKitchenSection=function(){activeSection=null;applyKitchenLayout();setTimeout(()=>document.getElementById('k572Hub')?.scrollIntoView({behavior:'smooth',block:'nearest'}),20)};

function decorateShopping(){
  const body=document.getElementById('shoppingBody');if(!body)return;
  let btn=body.querySelector('.shop-delete-list');
  if(groceries().length){
    if(!btn){btn=document.createElement('button');btn.type='button';btn.className='shop-delete-list';btn.textContent='Delete list';btn.onclick=window.deleteShoppingList;const footer=body.querySelector('.shop-footer');if(footer)footer.insertAdjacentElement('afterend',btn);else body.appendChild(btn)}
  }else btn?.remove();
  let note=body.querySelector('.shop-close-note');if(!note&&groceries().some(x=>x.done)){note=document.createElement('div');note.className='shop-close-note';note.textContent='Checked items will clear when you close the shopping list.';const del=body.querySelector('.shop-delete-list');(del||body.querySelector('.shop-footer'))?.insertAdjacentElement('afterend',note)}
  if(note&&!groceries().some(x=>x.done))note.remove();
}
function watchShopping(){const body=document.getElementById('shoppingBody');if(!body)return;if(shopObserver)shopObserver.disconnect();shopObserver=new MutationObserver(()=>setTimeout(decorateShopping,0));shopObserver.observe(body,{childList:true,subtree:true});decorateShopping()}
window.deleteShoppingList=function(){const a=groceries();if(!a.length)return;const ok=window.confirm(`Delete all ${a.length} grocery item${a.length===1?'':'s'}?`);if(!ok)return;write(G,[]);if(typeof window.openShoppingList==='function')window.openShoppingList();setTimeout(()=>{decorateShopping();applyKitchenLayout()},0)};

function wrapShopping(){
  const oldOpen=window.openShoppingList;if(typeof oldOpen==='function')window.openShoppingList=function(){const out=oldOpen.apply(this,arguments);setTimeout(()=>{watchShopping();decorateShopping()},0);return out};
  const oldToggle=window.toggleShoppingItem;if(typeof oldToggle==='function')window.toggleShoppingItem=function(){const out=oldToggle.apply(this,arguments);setTimeout(decorateShopping,0);return out};
  const oldRemove=window.removeShoppingItem;if(typeof oldRemove==='function')window.removeShoppingItem=function(){const out=oldRemove.apply(this,arguments);setTimeout(decorateShopping,0);return out};
  const oldAdd=window.addShoppingItem;if(typeof oldAdd==='function')window.addShoppingItem=function(){const out=oldAdd.apply(this,arguments);setTimeout(decorateShopping,0);return out};
  const oldClose=window.closeShoppingList;if(typeof oldClose==='function')window.closeShoppingList=function(){purgeCompletedGroceries();const out=oldClose.apply(this,arguments);setTimeout(applyKitchenLayout,0);return out};
}
function wrapTabs(){const oldShow=window.showTab;if(typeof oldShow!=='function')return;window.showTab=function(n){const wasKitchen=kitchenVisible();const out=oldShow.apply(this,arguments);if(n==='kitchen'){if(!wasKitchen)activeSection=null;setTimeout(applyKitchenLayout,0)}return out}}
function observeKitchen(){const root=document.getElementById('kitchenContent');if(!root||root.dataset.v572Observed)return;root.dataset.v572Observed='1';new MutationObserver(()=>setTimeout(applyKitchenLayout,0)).observe(root,{childList:true,subtree:true})}
function boot(){injectStyle();wrapShopping();wrapTabs();setTimeout(()=>{observeKitchen();applyKitchenLayout();if(shoppingVisible())watchShopping()},0);document.documentElement.dataset.thalifyTwaFeatureRelease=VERSION}

if(typeof window.showTab==='function'&&document.getElementById('tab-kitchen'))boot();else{
  let tries=0;const t=setInterval(()=>{tries++;if(typeof window.showTab==='function'&&document.getElementById('tab-kitchen')){clearInterval(t);boot()}else if(tries>80)clearInterval(t)},50)
}
})();
