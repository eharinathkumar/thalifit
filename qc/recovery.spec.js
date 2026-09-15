const { test, expect } = require('@playwright/test');
const { personas, buildStorage } = require('./personas');

const CURRENT_VERSION='5.6.17';
const CURRENT_CACHE='thalify-v5.6.17-dialogs-qc';

function watch(page){
  const nativeDialogs=[];const pageErrors=[];const consoleErrors=[];
  page.on('dialog',async d=>{nativeDialogs.push(`${d.type()}: ${d.message()}`);await d.dismiss();});
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/i.test(m.text()))consoleErrors.push(m.text())});
  return{nativeDialogs,pageErrors,consoleErrors};
}

async function boot(page,storage){
  await page.addInitScript(({storage})=>{
    if(sessionStorage.getItem('__thalify_recovery_seeded'))return;
    localStorage.clear();
    for(const [k,v] of Object.entries(storage))localStorage.setItem(k,v);
    sessionStorage.setItem('__thalify_recovery_seeded','1');
  },{storage});
  await page.goto('/index.html?qc=recovery',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{if('serviceWorker'in navigator)await navigator.serviceWorker.ready;});
  for(let i=0;i<3;i++){
    const ready=await page.evaluate(()=>!!window.__thalifyQC&&window.__thalifyQC.version==='5.6.17');
    if(ready)break;
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForTimeout(250);
  }
  await page.waitForFunction(()=>!!window.__thalifyQC&&window.__thalifyQC.version==='5.6.17');
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
}

async function mdpSnapshot(page){
  return page.evaluate(()=>{
    const out={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith('mdp_'))out[k]=localStorage.getItem(k);
    }
    return Object.fromEntries(Object.entries(out).sort(([a],[b])=>a.localeCompare(b)));
  });
}

test('backup -> erase local data -> restore -> verify full Thalify state',async({page},testInfo)=>{
  const seen=watch(page);
  const seeded=buildStorage(personas[0]);
  await boot(page,seeded);

  const before=await mdpSnapshot(page);
  expect(Object.keys(before).length).toBeGreaterThan(5);
  await page.screenshot({path:testInfo.outputPath('recovery-before-backup.png'),fullPage:true});

  const backup=await page.evaluate(()=>{
    const data={schema:'thalify-qc-backup-v1',createdAt:'2026-09-15T00:00:00Z',storage:{}};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith('mdp_'))data.storage[k]=localStorage.getItem(k);
    }
    return JSON.stringify(data);
  });
  expect(backup).toContain('thalify-qc-backup-v1');

  await page.evaluate(()=>{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('mdp_'))keys.push(k)}
    for(const k of keys)localStorage.removeItem(k);
  });
  expect(Object.keys(await mdpSnapshot(page))).toHaveLength(0);

  await page.evaluate(raw=>{
    const parsed=JSON.parse(raw);
    if(parsed.schema!=='thalify-qc-backup-v1'||!parsed.storage)throw new Error('Invalid QC backup');
    for(const [k,v] of Object.entries(parsed.storage))localStorage.setItem(k,v);
  },backup);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__thalifyQC);

  const after=await mdpSnapshot(page);
  expect(after).toEqual(before);
  await expect(page.locator('body')).toContainText(personas[0].name);
  await page.screenshot({path:testInfo.outputPath('recovery-after-restore.png'),fullPage:true});

  expect(seen.nativeDialogs).toEqual([]);
  expect(seen.pageErrors).toEqual([]);
  expect(seen.consoleErrors).toEqual([]);
});

test('old installed PWA cache is superseded by the current service worker baseline',async({page},testInfo)=>{
  const seen=watch(page);
  await page.goto('/index.html?qc=upgrade',{waitUntil:'domcontentloaded'});

  await page.evaluate(async()=>{
    const old=await caches.open('thalify-v5.6.16-old-installed-pwa');
    await old.put('/index.html',new Response('<html><body>OLD THALIFY SHELL</body></html>',{headers:{'content-type':'text/html'}}));
    localStorage.setItem('mdp_qc_previous_version','5.6.16');
    if('serviceWorker'in navigator)await navigator.serviceWorker.ready;
  });

  await page.reload({waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{if('serviceWorker'in navigator)await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>!!window.__thalifyQC&&window.__thalifyQC.version==='5.6.17');
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);

  const state=await page.evaluate(async()=>({
    version:window.__thalifyQC?.version,
    dialogs:document.documentElement.dataset.thalifyDialogs,
    caches:await caches.keys(),
    body:document.body.innerText.slice(0,5000)
  }));
  // Per-feature release markers can intentionally remain at the feature's own
  // version (for example the meal-pack layer is 5.6.14). The authoritative
  // current shell/QC version is window.__thalifyQC.version from the newest layer.
  expect(state.version).toBe(CURRENT_VERSION);
  expect(state.dialogs).toBe('branded');
  expect(state.caches).toContain(CURRENT_CACHE);
  expect(state.caches).not.toContain('thalify-v5.6.16-old-installed-pwa');
  expect(state.body).not.toContain('OLD THALIFY SHELL');
  await page.screenshot({path:testInfo.outputPath('upgrade-current-shell.png'),fullPage:true});

  expect(seen.nativeDialogs).toEqual([]);
  expect(seen.pageErrors).toEqual([]);
  expect(seen.consoleErrors).toEqual([]);
});
