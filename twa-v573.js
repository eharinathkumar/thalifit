(function(){'use strict';
const VERSION='5.6.13';
let decorating=false,observer=null;

const css=`
/* v5.6.13 — calmer, cleaner Kitchen visual polish */
body.k573-kitchen-active{
  background:
    radial-gradient(circle at 88% -8%,color-mix(in srgb,var(--turmeric) 8%,transparent),transparent 25rem),
    radial-gradient(circle at -12% 46%,color-mix(in srgb,var(--aqua) 5%,transparent),transparent 24rem),
    var(--bg)!important;
}
body.k573-kitchen-active::before{opacity:.10!important}
body.k573-kitchen-active .quick-fab{display:none!important}
body.k573-kitchen-active .hdr{box-shadow:0 10px 30px rgba(0,0,0,.10)!important}
#tab-kitchen{gap:10px!important}
#tab-kitchen .khero{padding:1px 3px 0!important;margin-bottom:0!important}
#tab-kitchen .khero h2{font-size:clamp(27px,7.2vw,33px)!important;line-height:1.04!important;letter-spacing:-.035em!important;margin:3px 0 8px!important}
#tab-kitchen .khero p{font-size:12.5px!important;line-height:1.45!important;max-width:390px!important;color:var(--muted)!important}
#tab-kitchen .card-kicker{font-size:9px!important;letter-spacing:.16em!important}
.k572-grid{gap:10px!important;margin-top:4px!important}
.k572-tile{
  position:relative!important;overflow:hidden!important;isolation:isolate;
  min-height:126px!important;padding:13px 13px 14px!important;
  border-radius:20px!important;
  background:color-mix(in srgb,var(--card) 95%,transparent)!important;
  border-color:color-mix(in srgb,var(--line) 82%,transparent)!important;
  box-shadow:0 8px 28px rgba(0,0,0,.08)!important;
}
.k572-tile::before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:linear-gradient(145deg,color-mix(in srgb,var(--turmeric) 3%,transparent),transparent 50%);
}
.k572-tile.on{border-color:color-mix(in srgb,var(--turmeric) 60%,var(--line))!important;background:color-mix(in srgb,var(--turmeric) 5%,var(--card))!important}
.k572-tiletop{position:relative;z-index:2;width:100%;align-items:flex-start!important}
.k572-icon{width:36px!important;height:36px!important;flex-basis:36px!important;border-radius:12px!important;background:color-mix(in srgb,var(--turmeric) 8%,var(--cardsoft))!important;color:var(--turmeric)!important}
.k572-icon svg{width:18px!important;height:18px!important}
.k572-arrow{font-size:19px!important;line-height:1!important;opacity:.72}
.k572-tile>span:last-child{position:relative;z-index:2;display:block;max-width:78%;min-width:0}
.k572-title{
  display:block!important;
  font-family:'Public Sans',system-ui,sans-serif!important;
  font-size:16px!important;font-weight:750!important;line-height:1.14!important;
  letter-spacing:-.018em!important;color:var(--text)!important;
}
.k572-meta{
  display:inline-flex!important;align-items:center!important;width:max-content;max-width:100%;
  margin-top:7px!important;padding:4px 7px!important;border-radius:999px!important;
  border:1px solid color-mix(in srgb,var(--line) 82%,transparent)!important;
  background:color-mix(in srgb,var(--cardsoft) 84%,transparent)!important;
  color:var(--muted)!important;font-size:9.5px!important;font-weight:650!important;line-height:1.15!important;
  white-space:normal!important;
}
.k573-art{position:absolute;right:9px;bottom:8px;width:58px;height:58px;z-index:1;opacity:.34;pointer-events:none;transform:rotate(-2deg)}
.k573-art svg{width:100%;height:100%;overflow:visible}
.k573-art .line{fill:none;stroke:var(--turmeric);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.k573-art .leaf{fill:color-mix(in srgb,var(--leaf) 78%,transparent);stroke:none}
.k573-art .warm{fill:color-mix(in srgb,var(--chili) 72%,transparent);stroke:none}
.k573-art .soft{fill:color-mix(in srgb,var(--turmeric) 28%,transparent);stroke:none}
#kitchenContent>.knote{display:none!important}
#k572HomeNote{font-size:10px!important;line-height:1.45!important;color:var(--faint)!important;text-align:center!important;padding:4px 18px 0!important}
.k572-focushead{margin-top:4px!important;padding:2px 2px!important}
.k572-focushead b{font-family:'Public Sans',system-ui,sans-serif!important;font-size:15px!important;font-weight:750!important}
@media(max-width:350px){
  .k572-grid{gap:8px!important}.k572-tile{min-height:118px!important;padding:11px!important}.k572-title{font-size:15px!important}.k572-meta{font-size:9px!important}.k573-art{width:52px;height:52px;right:7px;bottom:7px}
}
`;

function injectStyle(){if(document.getElementById('v573style'))return;const s=document.createElement('style');s.id='v573style';s.textContent=css;document.head.appendChild(s)}
function art(section){
  const a={
    pantry:`<svg viewBox="0 0 64 64" aria-hidden="true"><path class="line" d="M13 27h38l-4 24H17z"/><path class="line" d="M21 27c1-8 5-12 11-12s10 4 11 12"/><circle class="warm" cx="27" cy="35" r="6"/><path class="leaf" d="M27 28c-1-5 4-8 8-5-1 4-4 6-8 5Z"/><path class="leaf" d="M37 38c2-6 8-7 11-3-2 5-6 6-11 3Z"/></svg>`,
    groceries:`<svg viewBox="0 0 64 64" aria-hidden="true"><path class="line" d="M16 19h32l-3 34H19z"/><path class="line" d="M23 20c0-7 3-11 9-11s9 4 9 11"/><circle class="warm" cx="28" cy="34" r="6"/><path class="leaf" d="M28 27c1-5 6-7 9-3-2 4-5 5-9 3Z"/><path class="soft" d="M37 36c5-5 11-1 9 5-2 5-8 8-13 5-4-3-1-8 4-10Z"/></svg>`,
    recipes:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="line" cx="31" cy="34" r="17"/><circle class="soft" cx="31" cy="34" r="10"/><path class="line" d="M53 17v34M49 17v12c0 4 8 4 8 0V17M9 17v12M5 17v7c0 5 8 5 8 0v-7M9 29v22"/><path class="leaf" d="M28 31c-1-6 5-9 10-6-1 5-5 8-10 6Z"/><circle class="warm" cx="27" cy="37" r="4"/></svg>`,
    match:`<svg viewBox="0 0 64 64" aria-hidden="true"><path class="line" d="M15 29h34c-1 14-7 22-17 22S16 43 15 29Z"/><path class="line" d="M12 29h40"/><path class="leaf" d="M25 27c-3-7 4-11 10-8-1 6-5 9-10 8Z"/><circle class="warm" cx="39" cy="25" r="5"/><path class="line" d="M50 9v8M46 13h8M12 12v6M9 15h6"/></svg>`
  };return a[section]||'';
}
function syncBodyState(){const k=document.getElementById('tab-kitchen');document.body.classList.toggle('k573-kitchen-active',!!k&&!k.classList.contains('hide'))}
function decorate(){
  if(decorating)return;decorating=true;
  try{
    syncBodyState();
    const hub=document.getElementById('k572Hub');if(!hub)return;
    hub.querySelectorAll('.k572-tile').forEach(tile=>{
      const section=tile.dataset.k572Section;if(!section)return;
      let a=tile.querySelector('.k573-art');if(!a){a=document.createElement('span');a.className='k573-art';a.innerHTML=art(section);tile.appendChild(a)}
    });
    const note=document.getElementById('k572HomeNote');if(note)note.textContent="Planning stays separate from Today's food log. Kitchen data stays on this device.";
  }finally{decorating=false}
}
function observe(){const root=document.getElementById('kitchenContent');if(!root||root.dataset.v573Observed)return;root.dataset.v573Observed='1';observer=new MutationObserver(()=>{clearTimeout(window._v573Decorate);window._v573Decorate=setTimeout(decorate,0)});observer.observe(root,{childList:true,subtree:true})}
function wrapTabs(){const old=window.showTab;if(typeof old!=='function'||old.__v573Wrapped)return;const fn=function(){const out=old.apply(this,arguments);setTimeout(decorate,0);return out};fn.__v573Wrapped=true;window.showTab=fn}
function boot(){injectStyle();wrapTabs();setTimeout(()=>{observe();decorate()},0);setTimeout(decorate,120);document.documentElement.dataset.thalifyTwaFeatureRelease=VERSION}
if(document.getElementById('tab-kitchen')&&typeof window.showTab==='function')boot();else{let n=0,t=setInterval(()=>{n++;if(document.getElementById('tab-kitchen')&&typeof window.showTab==='function'){clearInterval(t);boot()}else if(n>100)clearInterval(t)},50)}
})();
