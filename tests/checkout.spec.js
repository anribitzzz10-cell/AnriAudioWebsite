const {test, expect} = require('@playwright/test');
const base = 'http://127.0.0.1:8765';
const order = 'anri-full-'+'a'.repeat(32);
const credential = 'c'.repeat(43);
const key = ['ANRI','ABCDE','FGHJK','LMNPQ','RSTUV'].join('-');
const fields = [
 {name:'order_id',value:order},
 {name:'currency',value:'kzt'},
 {name:'customer_email',value:'buyer@example.invalid'},
 {name:'sys',value:'anriaudio'},
 {name:'urlSuccess',value:'https://anriaudio.com/checkout/'},
 {name:'urlReturn',value:'https://anriaudio.com/checkout/'},
 {name:'urlNotification',value:'https://anri-cloud.onrender.com/v1/payments/proeducation/webhook'},
 {name:'signature',value:'a'.repeat(64)}
];

for (const [path, heading] of [['/checkout/','Your order'],['/ru/checkout/','Ваш заказ'],['/kk/checkout/','Тапсырысыңыз']]) {
 test('closed checkout '+path, async ({page})=>{
  await page.goto(base+path+'?order=untrusted&success=true');
  await expect(page.locator('#heading')).toHaveText(heading);
  await expect(page.locator('#buy')).toBeDisabled();
  await expect(page).toHaveURL(base+path);
  await expect(page.locator('#key')).toBeHidden();
 });
}

test('purchase email is sufficient; buyer never saves order number or private code', async ({page})=>{
 await page.route('**/checkout/config.js', route=>route.fulfill({contentType:'text/javascript',body:`export const API_ORIGIN='${base}'; export const CHECKOUT_ENABLED=true;`}));
 let calls=[];
 await page.route('**/v1/checkout/proeducation/**', async route=>{
  const req=route.request(); calls.push(req);
  expect(req.method()).toBe('POST');
  expect(req.url()).not.toContain(credential);
  expect(req.headers()['referer']).toBeUndefined();
  if(req.url().endsWith('/create')){
   expect(req.postDataJSON()).toEqual({customer_email:'buyer@example.invalid',locale:'en'});
   await route.fulfill({json:{order_num:order,claim_credential:credential,amount_minor:650000,currency:'KZT',merchant_form_action:'https://anriprod.proeducation.kz/',method:'POST',fields}});
  }else{
   expect(req.postDataJSON()).toEqual({order_num:order,claim_credential:credential});
   await route.fulfill({json:{status:'fulfilled',license_key:key}});
  }
 });
 await page.goto(base+'/checkout/');
 await page.locator('#email').fill('buyer@example.invalid');
 await page.locator('#buy').click();
 await expect(page.locator('#prepared')).toBeVisible();
 await expect(page.locator('#pay')).toBeEnabled();
 await expect(page.locator('#amount')).toContainText('6,500');
 await expect(page.locator('#credential')).toHaveCount(0);
 await expect(page.locator('#order')).toHaveCount(0);
 await expect(page.locator('#saved')).toHaveCount(0);
 await expect(page.locator('#new-credential')).toHaveCount(0);
 await expect(page.locator('#prepared')).not.toContainText(order);
 await expect(page.locator('#prepared')).not.toContainText(credential);
 await expect(page).toHaveURL(base+'/checkout/');
 await page.reload();
 await expect(page.locator('#key')).toHaveText(key);
 expect(calls.length).toBe(2);
 expect(await page.evaluate(()=>sessionStorage.getItem('anri-private-order'))).toBeNull();
});

for (const [path, locale] of [['/ru/checkout/','ru'],['/kk/checkout/','kk']]) {
 test('server receives order language '+locale, async ({page})=>{
  await page.route('**/checkout/config.js', route=>route.fulfill({contentType:'text/javascript',body:`export const API_ORIGIN='${base}'; export const CHECKOUT_ENABLED=true;`}));
  await page.route('**/v1/checkout/proeducation/create', async route=>{
   const req=route.request();
   expect(req.method()).toBe('POST');
   expect(req.postDataJSON()).toEqual({customer_email:'buyer@example.invalid',locale});
   await route.fulfill({json:{order_num:order,claim_credential:credential,amount_minor:650000,currency:'KZT',merchant_form_action:'https://anriprod.proeducation.kz/',method:'POST',fields}});
  });
  await page.goto(base+path);
  await page.locator('#email').fill('buyer@example.invalid');
  await page.locator('#buy').click();
  await expect(page.locator('#prepared')).toBeVisible();
  await expect(page).toHaveURL(base+path);
 });
}

for(const path of ['/checkout/','/ru/checkout/','/kk/checkout/']){
 test('saved owner automatically receives key '+path,async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.addInitScript(({order,credential})=>sessionStorage.setItem('anri-private-order',JSON.stringify({order_num:order,claim_credential:credential})),{order,credential});
  await page.route('**/checkout/config.js',r=>r.fulfill({contentType:'text/javascript',body:`export const API_ORIGIN='${base}'; export const CHECKOUT_ENABLED=false;`}));
  let claims=0;
  await page.route('**/v1/checkout/proeducation/claim',async r=>{
   claims++;expect(r.request().method()).toBe('POST');
   expect(r.request().postDataJSON()).toEqual({order_num:order,claim_credential:credential});
   await r.fulfill({json:claims===1?{status:'pending',license_key:null}:{status:'fulfilled',license_key:key}});
  });
  await page.goto(base+path+'?success=true&order=untrusted#discarded');
  await expect(page).toHaveURL(base+path);
  await expect(page.locator('#key')).toHaveText(key,{timeout:10000});
  expect(claims).toBe(2);
  await page.locator('#copy-key').click();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(key);
  expect(await page.evaluate(()=>sessionStorage.getItem('anri-private-order'))).toBeNull();
 });
}



test('email recovery restores a paid ProEducation license without order credentials', async ({page}) => {
 const licenseKey='ANRI-ABCDE-FGHJK-LMNPQ-RSTUV';
 const calls=[];
 await page.route('**/v1/license/recovery/request', async route=>{
  const request=route.request();
  expect(request.method()).toBe('POST');
  expect(request.url()).toBe(base+'/v1/license/recovery/request');
  expect(request.url()).not.toContain('buyer@example.invalid');
  calls.push({path:'/request',body:request.postDataJSON()});
  await route.fulfill({json:{ok:true,message:'If a matching purchase exists, a 6-digit verification code has been sent.',expires_in_seconds:600}});
 });
 await page.route('**/v1/license/recovery/verify', async route=>{
  const request=route.request();
  expect(request.method()).toBe('POST');
  expect(request.url()).toBe(base+'/v1/license/recovery/verify');
  expect(request.url()).not.toContain('123456');
  calls.push({path:'/verify',body:request.postDataJSON()});
  await route.fulfill({json:{ok:true,email:'buyer@example.invalid',licenses:[{
   key:licenseKey,product:'anri_audio_midi',edition:'full',status:'active',
   active_activations:1,max_activations:2,expires_at:null,order_num:'anri-full-'+'a'.repeat(32)
  }]}});
 });
 await page.goto(base+'/ru/license/');
 await page.locator('#recovery-email').fill('buyer@example.invalid');
 await page.locator('#recovery-send-button').click();
 await expect(page.locator('#recovery-verify-form')).toBeVisible();
 await expect(page.locator('#recovery-result')).toContainText('6-значный код');
 await page.locator('#recovery-code').fill('123456');
 await page.locator('#recovery-verify-button').click();
 await expect(page.locator('#recovery-result')).toContainText(licenseKey);
 await expect(page.locator('#recovery-result')).toContainText('Действует');
 await expect(page.locator('#recovery-result')).toContainText('Номер заказа');
 expect(calls).toEqual([
  {path:'/request',body:{email:'buyer@example.invalid'}},
  {path:'/verify',body:{email:'buyer@example.invalid',code:'123456'}}
 ]);
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
 await page.reload();
 await expect(page.locator('#recovery-email')).toHaveValue('');
 await expect(page.locator('#recovery-result')).toBeHidden();
});

test('public license status checker posts the key only to same-origin API and clears the field', async ({page}) => {
 const licenseKey='ANRI-ABCDE-FGHJK-LMNPQ-RSTUV';
 let posted;
 await page.route('**/v1/license/check', async route => {
  const request=route.request();
  expect(request.method()).toBe('POST');
  expect(request.url()).toBe(base+'/v1/license/check');
  expect(request.url()).not.toContain(licenseKey);
  posted=request.postDataJSON();
  await route.fulfill({json:{ok:true,license:{product:'anri_audio_midi',edition:'full',status:'active',active_activations:1,max_activations:2,expires_at:null}}});
 });
 await page.goto(base+'/ru/license/');
 await expect(page.locator('#license-check-form')).toBeVisible();
 await page.locator('#license-key').fill(licenseKey);
 await page.locator('#check-button').click();
 await expect(page.locator('#license-key')).toHaveValue('');
 await expect(page.locator('#license-result')).toContainText('Действует');
 await expect(page.locator('#license-result')).toContainText('1 / 2');
 await expect(page).toHaveURL(base+'/ru/license/');
 expect(posted).toEqual({license_key:licenseKey});
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
});
