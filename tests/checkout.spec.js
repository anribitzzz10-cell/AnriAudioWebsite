const {test, expect} = require('@playwright/test');
const base = 'http://127.0.0.1:8765';
const order = 'anri-full-'+'a'.repeat(32);
const credential = 'c'.repeat(43);
const key = 'ANRI-ABCDE-FGHJK-LMNPQ-RSTUV';
const fields = [{name:'order_id',value:order},{name:'currency',value:'kzt'},{name:'signature',value:'a'.repeat(64)}];

for (const [path, heading] of [['/checkout/','Your order'],['/ru/checkout/','Ваш заказ'],['/kk/checkout/','Сіздің тапсырысыңыз']]) {
 test('closed checkout '+path, async ({page})=>{
  await page.goto(base+path+'?order=untrusted&success=true');
  await expect(page.locator('#heading')).toHaveText(heading);
  await expect(page.locator('#buy')).toBeDisabled();
  await expect(page.locator('#check')).toBeDisabled();
  await expect(page).toHaveURL(base+path);
  await expect(page.locator('#key')).toBeHidden();
 });
}

test('secret stays in POST body and recovery returns existing key', async ({page})=>{
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
 await expect(page.locator('#pay')).toBeDisabled();
 await expect(page.locator('#amount')).toContainText('6,500');
 await expect(page).toHaveURL(base+'/checkout/');
 await page.reload();
 await expect(page.locator('#credential')).toHaveValue(credential);
 await page.locator('#check').click();
 await expect(page.locator('#key')).toHaveText(key);
 await page.locator('#check').click();
 await expect(page.locator('#key')).toHaveText(key);
 await page.locator('#forget').click();
 await expect(page.locator('#credential')).toHaveValue('');
 await expect(page.locator('#key')).toBeHidden();
 expect(calls.length).toBe(4);
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
  await page.locator('#forget').click();
  await expect(page.locator('#copy-key')).toBeHidden();
 });
}



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
