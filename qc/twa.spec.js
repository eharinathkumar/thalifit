const { test, expect } = require('@playwright/test');
const { personas, buildStorage } = require('./personas');

const AI_ORIGIN='https://thalifit-ai.harinathkumar.workers.dev';

async function mockAi(page){
  // Browser-level routing catches Chromium requests, but WebKit service-worker
  // initiated fetches can bypass page.route(). Install a deterministic window
  // fetch shim too, before app code runs, while leaving the real SW enabled.
  await page.route(`${AI_ORIGIN}/**`, async route=>{
    const req=route.request();
    if(req.method()!=='POST') return route.continue();
    let body={};try{body=req.postDataJSON()}catch{}
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mockAiBody(body))});
  });
  await page.addInitScript(({origin})=>{
    const realFetch=window.fetch.bind(window);
    const responseFor=body=>{
      if(body&&body.type==='checkin'){
        const p=body.progress||{};
        const direction=p.goal==='gain'?75:p.goal==='lose'?-75:25;
        return {checkin:{
          message:`${p.name||'Your'} QC check-in is complete. Your logged week is internally consistent.`,
          focus_habit:p.goal==='gain'?'Add protein to the first meal.':'Keep the current logging rhythm and activity pattern.',
          status:'on_track',
          adjusted_calories:Number(p.calorie_target||2000)+direction,
          adjusted_protein:Number(p.protein_target||100)+5,
          updated_coach_notes:'Deterministic QC check-in response.'
        }};
      }
      if(body&&body.type==='exercise_met')return{name:body.name||'Exercise',met:6};
      return{};
    };
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:(input&&input.url)||'';
      const method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
      if(url.startsWith(origin)&&method==='POST'){
        let body={};
        try{
          const raw=(init&&init.body)||'';
          body=typeof raw==='string'?JSON.parse(raw):{};
        }catch{}
        return new Response(JSON.stringify(responseFor(body)),{status:200,headers:{'content-type':'application/json'}});
      }
      return realFetch(input,init);
    };
  },{origin:AI_ORIGIN});
}

function mockAiBody(body){
  if(body&&body.type==='checkin'){
    const p=body.progress||{};
    const direction=p.goal==='gain'?75:p.goal==='lose'?-75:25;
    return {checkin:{
      message:`${p.name||'Your'} QC check-in is complete. Your logged week is internally consistent.`,
      focus_habit:p.goal==='gain'?'Add protein to the first meal.':'Keep the current logging rhythm and activity pattern.',
      status:'on_track',
      adjusted_calories:Number(p.calorie_target||2000)+direction,
      adjusted_protein:Number(p.protein_target||100)+5,
      updated_coach_notes:'Deterministic QC check-in response.'
    }};
  }
  if(body&&body.type==='exercise_met')return{name:body.name||'Exercise',met:6};
  return{};
}

async function boot(page,storage){
  await mockAi(page);
  await page.addInitScript(({storage})=>{
    if(sessionStorage.getItem('__thalify_qc_seeded'))return;
    localStorage.clear();
    for(const [k,v] of Object.entries(storage))localStorage.setItem(k,v);
    sessionStorage.setItem('__thalify_qc_seeded','1');
  },{storage});
  await page.goto('/index.html?qc=1',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{if('serviceWorker'in navigator)await navigator.serviceWorker.ready;});
  for(let i=0;i<3;i++){
    const ready=await page.evaluate(()=>!!window.__thalifyQC&&document.documentElement.dataset.thalifyTwaFeatureRelease==='5.6.17');
    if(ready)break;
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForTimeout(250);
  }
  await page.waitForFunction(()=>!!window.__thalifyQC&&window.__thalifyQC.version==='5.6.17');
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
}

function watch(page){
  const nativeDialogs=[];const pageErrors=[];const consoleErrors=[];
  page.on('dialog',async d=>{nativeDialogs.push(`${d.type()}: ${d.message()}`);await d.dismiss();});
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/i.test(m.text()))consoleErrors.push(m.text())});
  return{nativeDialogs,pageErrors,consoleErrors};
}

async function noHorizontalOverflow(page,label){
  const x=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(x.scroll,`${label} horizontal overflow ${JSON.stringify(x)}`).toBeLessThanOrEqual(x.client+2);
}
async function snap(page,testInfo,name){await page.screenshot({path:testInfo.outputPath(`${name}.png`),fullPage:true});}
async function show(page,tab){await page.evaluate(tab=>showTab(tab),tab);await page.waitForTimeout(100);}

for(const persona of personas){
  test(`${persona.name}: three-day food/activity journey + weekly check-in`,async({page},testInfo)=>{
    const seen=watch(page);await boot(page,buildStorage(persona));
    await expect(page.locator('body')).toContainText(persona.foods[2][0].name);
    await noHorizontalOverflow(page,`${persona.id} today`);await snap(page,testInfo,`${persona.id}-today`);

    await show(page,'kitchen');
    await expect(page.locator('#kitchenContent')).toContainText(/Pantry|Kitchen/);
    await noHorizontalOverflow(page,`${persona.id} kitchen`);await snap(page,testInfo,`${persona.id}-kitchen`);

    await show(page,'trends');
    await expect(page.locator('#activityTrendCard')).toBeVisible();
    await expect(page.locator('#activityTrendCard')).not.toBeEmpty();
    await noHorizontalOverflow(page,`${persona.id} trends`);await snap(page,testInfo,`${persona.id}-trends`);

    await show(page,'profile');
    await expect(page.locator('#profileContent')).toContainText(persona.name);
    await expect(page.locator('#profileContent')).toContainText('Data & Backup');
    await noHorizontalOverflow(page,`${persona.id} profile`);await snap(page,testInfo,`${persona.id}-profile`);

    await page.evaluate(()=>runCheckin());
    await expect(page.locator('#checkinResultSheet')).toBeVisible();
    await expect(page.locator('#checkinResultSheet')).toContainText('Your review is ready');
    await snap(page,testInfo,`${persona.id}-checkin`);
    if(['priya','marcus'].includes(persona.id))await page.getByRole('button',{name:'Apply changes'}).click();
    else await page.getByRole('button',{name:'Keep current'}).click();
    await expect(page.locator('#checkinResultSheet')).toHaveClass(/hide/);

    const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('mdp_profile')||'{}'));
    expect(Array.isArray(persisted.checkinHistory)).toBe(true);
    expect(persisted.checkinHistory.length).toBeGreaterThanOrEqual(1);
    expect(await page.evaluate(()=>window.__thalifyQC.blockedNativeDialogs)).toBe(0);
    expect(seen.nativeDialogs,`native browser dialogs: ${seen.nativeDialogs.join(' | ')}`).toEqual([]);
    expect(seen.pageErrors,`page errors: ${seen.pageErrors.join(' | ')}`).toEqual([]);
    expect(seen.consoleErrors,`console errors: ${seen.consoleErrors.join(' | ')}`).toEqual([]);
  });
}

test('branded confirmations and inputs replace browser hostname popups',async({page},testInfo)=>{
  const seen=watch(page);const storage=buildStorage(personas[0]);await boot(page,storage);
  await show(page,'kitchen');
  await page.evaluate(()=>openShoppingList());
  await expect(page.locator('#shoppingMode')).toBeVisible();

  await page.evaluate(()=>{void deleteShoppingList();});
  await expect(page.getByTestId('thalify-dialog')).toBeVisible();
  await expect(page.locator('#thalifyDialogTitle')).toHaveText('Delete shopping list?');
  await expect(page.locator('#thalifyDialogCopy')).toContainText('5 grocery items');
  await expect(page.getByTestId('thalify-dialog')).not.toContainText('eharinathkumar.github.io');
  await snap(page,testInfo,'shopping-delete-confirmation');
  await page.getByTestId('thalify-dialog-cancel').click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mdp_kitchen_groceries')||'[]').length)).toBe(5);

  await page.evaluate(()=>{void deleteShoppingList();});
  await page.getByTestId('thalify-dialog-confirm').click();
  await expect(page.locator('#thalifyDialogRoot')).not.toHaveClass(/open/);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mdp_kitchen_groceries')||'[]').length)).toBe(0);

  await page.evaluate(()=>localStorage.setItem('mdp_meal_packs_v1',JSON.stringify([{id:'qc-pack',name:'QC breakfast',defaultMeal:'Morning',items:[{name:'Oatmeal',cal:300,protein:12,carbs:50,fat:7,qty:1}],createdAt:Date.now(),updatedAt:Date.now(),lastUsedAt:0}])));
  await page.evaluate(()=>openMealPacks());
  await page.evaluate(()=>{void deleteMealPack('qc-pack');});
  await expect(page.locator('#thalifyDialogTitle')).toHaveText('Delete this meal pack?');
  await expect(page.locator('#thalifyDialogCopy')).toContainText('Historical food logs will stay unchanged');
  await page.getByTestId('thalify-dialog-confirm').click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mdp_meal_packs_v1')||'[]').length)).toBe(0);

  await page.evaluate(()=>{void logWeightPrompt();});
  await expect(page.locator('#thalifyDialogTitle')).toHaveText('Log today’s weight');
  await page.getByTestId('thalify-dialog-input').fill('67.9');
  await page.getByTestId('thalify-dialog-confirm').click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mdp_profile')).weightKg)).toBe(67.9);

  await page.evaluate(()=>{void logReading('bp');});
  await expect(page.locator('#thalifyDialogTitle')).toHaveText('Log blood pressure');
  await page.getByTestId('thalify-dialog-input').fill('118');
  await page.getByTestId('thalify-dialog-confirm').click();
  await expect(page.getByTestId('thalify-dialog-input')).toBeVisible();
  await page.getByTestId('thalify-dialog-input').fill('76');
  await page.getByTestId('thalify-dialog-confirm').click();
  const readings=await page.evaluate(()=>JSON.parse(localStorage.getItem('mdp_readings')||'[]'));
  expect(readings.at(-1).value).toBe(118);expect(readings.at(-1).value2).toBe(76);

  expect(await page.evaluate(()=>window.__thalifyQC.blockedNativeDialogs)).toBe(0);
  expect(seen.nativeDialogs,`native browser dialogs: ${seen.nativeDialogs.join(' | ')}`).toEqual([]);
  expect(seen.pageErrors,`page errors: ${seen.pageErrors.join(' | ')}`).toEqual([]);
});
