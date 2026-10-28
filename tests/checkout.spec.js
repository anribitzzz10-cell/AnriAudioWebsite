const {test, expect} = require('@playwright/test');
const base = 'http://127.0.0.1:8765';
const order = 'anri-full-'+'a'.repeat(32);
const credential = 'c'.repeat(43);

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
   await route.fulfill({json:{order_num:order,claim_credential:credential,amount_minor:650000,currency:'KZT',merchant_form_action:'https://anriprod.proeducation.kz/',method:'POST',fields:[{name:'order_id',value:order}]}});
  }else{
   expect(req.postDataJSON()).toEqual({order_num:order,claim_credential:credential});
   await route.fulfill({json:{status:'fulfilled',license_key:'ANRI-SYNTHETIC-EXISTING-KEY'}});
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
 await expect(page.locator('#key')).toHaveText('ANRI-SYNTHETIC-EXISTING-KEY');
 await page.locator('#check').click();
 await expect(page.locator('#key')).toHaveText('ANRI-SYNTHETIC-EXISTING-KEY');
 await page.locator('#forget').click();
 await expect(page.locator('#credential')).toHaveValue('');
 await expect(page.locator('#key')).toBeHidden();
 expect(calls.length).toBe(3);
 expect(await page.evaluate(()=>sessionStorage.getItem('anri-private-order'))).toBeNull();
});

for (const [path, locale] of [['/ru/checkout/','ru'],['/kk/checkout/','kk']]) {
 test('server receives order language '+locale, async ({page})=>{
  await page.route('**/checkout/config.js', route=>route.fulfill({contentType:'text/javascript',body:`export const API_ORIGIN='${base}'; export const CHECKOUT_ENABLED=true;`}));
  await page.route('**/v1/checkout/proeducation/create', async route=>{
   const req=route.request();
   expect(req.method()).toBe('POST');
   expect(req.postDataJSON()).toEqual({customer_email:'buyer@example.invalid',locale});
   await route.fulfill({json:{order_num:order,claim_credential:credential,amount_minor:650000,currency:'KZT',merchant_form_action:'https://anriprod.proeducation.kz/',method:'POST',fields:[]}});
  });
  await page.goto(base+path);
  await page.locator('#email').fill('buyer@example.invalid');
  await page.locator('#buy').click();
  await expect(page.locator('#prepared')).toBeVisible();
  await expect(page).toHaveURL(base+path);
 });
}
