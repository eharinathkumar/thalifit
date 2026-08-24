(function(){'use strict';
const VERSION='5.6.11';
const nativeBarcodeSupported=typeof window.BarcodeDetector==='function';
const STYLE_ID='v571-barcode-fallback-style';
const PANEL_ID='v571BarcodeFallback';
const css=`
#${PANEL_ID}{position:absolute;left:16px;right:16px;bottom:calc(28px + env(safe-area-inset-bottom));z-index:5;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;box-shadow:0 14px 44px rgba(0,0,0,.38)}
#${PANEL_ID} .v571-title{font:650 17px/1.2 'Fraunces',Georgia,serif;color:var(--text)}
#${PANEL_ID} .v571-help{font-size:11.5px;line-height:1.45;color:var(--muted);margin-top:5px}
#${PANEL_ID} .v571-row{display:flex;gap:8px;margin-top:11px}
#${PANEL_ID} input{flex:1;min-width:0;font-size:16px;background:var(--cardsoft)}
#${PANEL_ID} button{flex:0 0 auto;background:var(--turmeric);color:#1a1508;font-weight:700;padding:9px 12px}
.v571-inline-barcode{width:100%;margin:8px 0 2px;background:var(--cardsoft);border:1px solid var(--line);color:var(--turmeric);padding:9px 11px;font-size:12px;font-weight:700}
`;
function injectStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=css;document.head.appendChild(s)}
function validBarcode(value){const code=String(value||'').replace(/\s+/g,'');return /^\d{8,14}$/.test(code)?code:null}
function ensurePanel(){
  let panel=document.getElementById(PANEL_ID);if(panel)return panel;
  const overlay=document.getElementById('scanOverlay');if(!overlay)return null;
  panel=document.createElement('div');panel.id=PANEL_ID;panel.className='hide';
  panel.innerHTML='<div class="v571-title">Enter package barcode</div><div class="v571-help">This browser does not provide Thalify\'s built-in camera barcode detector. Type the 8–14 digit UPC/EAN number printed below the bars. Only that number is sent to Open Food Facts.</div><div class="v571-row"><input id="v571BarcodeInput" inputmode="numeric" autocomplete="off" aria-label="Barcode number" placeholder="e.g. 012345678905"><button id="v571BarcodeLookup" type="button">Look up</button></div>';
  overlay.appendChild(panel);
  panel.querySelector('#v571BarcodeLookup').addEventListener('click',lookupManual);
  panel.querySelector('#v571BarcodeInput').addEventListener('keydown',e=>{if(e.key==='Enter')lookupManual()});
  return panel;
}
async function lookupManual(){
  const input=document.getElementById('v571BarcodeInput');const code=validBarcode(input?.value);const status=document.getElementById('scanStatus');
  if(!code){if(status)status.textContent='Enter the 8–14 digit number printed below the barcode.';input?.focus();return}
  if(status)status.textContent='Looking up '+code+'…';
  try{await barcodeLookup(code)}catch(_){if(status)status.textContent='Could not look up that barcode. Try again or use manual food entry.'}
}
function openFallback(meal){
  try{scanMeal=meal}catch(_){}
  const overlay=document.getElementById('scanOverlay');const video=document.getElementById('scanVideo');const status=document.getElementById('scanStatus');const panel=ensurePanel();
  if(!overlay||!panel)return;
  overlay.classList.remove('hide');panel.classList.remove('hide');
  if(video)video.style.visibility='hidden';
  if(status)status.textContent='Camera barcode detection is not available in this browser. Enter the barcode below.';
  const input=document.getElementById('v571BarcodeInput');if(input){input.value='';setTimeout(()=>input.focus(),80)}
}
function makeScanVisible(){
  const b=document.getElementById('quickScanBtn');if(b)b.classList.remove('hide');
}
function wrap(){
  const oldOpenQuickLog=window.openQuickLog;if(typeof oldOpenQuickLog==='function'&&!oldOpenQuickLog.__v571){
    const fn=function(){const out=oldOpenQuickLog.apply(this,arguments);makeScanVisible();return out};fn.__v571=true;window.openQuickLog=fn;
  }
  const oldOpenScanner=window.openScanner;if(typeof oldOpenScanner==='function'&&!oldOpenScanner.__v571){
    const fn=function(meal){document.getElementById(PANEL_ID)?.classList.add('hide');const v=document.getElementById('scanVideo');if(v)v.style.visibility='';return nativeBarcodeSupported?oldOpenScanner.call(this,meal):openFallback(meal)};fn.__v571=true;window.openScanner=fn;
  }
  window.quickScanFood=function(){try{closeQuickLog()}catch(_){};window.openScanner(typeof guessMeal==='function'?guessMeal():'Other')};
  const oldCloseScanner=window.closeScanner;if(typeof oldCloseScanner==='function'&&!oldCloseScanner.__v571){
    const fn=function(){document.getElementById(PANEL_ID)?.classList.add('hide');const v=document.getElementById('scanVideo');if(v)v.style.visibility='';return oldCloseScanner.apply(this,arguments)};fn.__v571=true;window.closeScanner=fn;
  }
  const oldAddPanel=window.addPanel;if(typeof oldAddPanel==='function'&&!oldAddPanel.__v571){
    const fn=function(meal){let html=oldAddPanel.apply(this,arguments);if(!nativeBarcodeSupported&&!html.includes('v571-inline-barcode'))html=html.replace('<div class="results" id="results"></div>',`<button type="button" class="v571-inline-barcode" onclick="openScanner('${String(meal).replace(/'/g,"\\'")}')">▣ Scan package / enter barcode</button><div class="results" id="results"></div>`);return html};fn.__v571=true;window.addPanel=fn;
  }
}
injectStyle();wrap();makeScanVisible();document.documentElement.dataset.thalifyTwaFeatureRelease=VERSION;
})();
