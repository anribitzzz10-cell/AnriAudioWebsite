const {test, expect} = require('@playwright/test');
const base='http://127.0.0.1:8765';
const order='anri-micro-'+'a'.repeat(32);
const credential='C'.repeat(43);
const invite='owner-private-invite-only-100-kzt';

for (const [path, lang] of [['/pilot/','en'],['/ru/pilot/','ru'],['/kk/pilot/','kk']]) {
 test('private real payment pilot defaults OFF: '+lang,async ({page})=>{
  await page.goto(base+path+'?success=true&claim_credential=untrusted');
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.locator('#createButton')).toBeDisabled();
  await expect(page.locator('#checkButton')).toBeDisabled();
  await expect(page).toHaveURL(base+path);
  await expect(page.locator('#key')).toBeHidden();
 });
}

test('RU phone-only private pilot keeps secret off provider and URL',async ({page})=>{
 await page.route('**/pilot/config.js',r=>r.fulfill({
  contentType:'text/javascript',
  body:`export const API_ORIGIN='${base}';export const PILOT_ENABLED=true;`
 }));
 const calls=[];
 await page.route('**/v1/checkout/proeducation/**',async route=>{
  const req=route.request();
  calls.push(req);
  expect(req.method()).toBe('POST');
  expect(req.url()).not.toContain(invite);
  expect(req.url()).not.toContain(credential);
  expect(req.headers()['referer']).toBeUndefined();
  if(req.url().endsWith('micro/create')){
   expect(req.postDataJSON()).toEqual({invite_code:invite,locale:'ru'});
   await route.fulfill({json:{
    order_num:order,claim_credential:credential,amount_minor:10000,currency:'KZT',
    merchant_form_action:'https://anriprod.proeducation.kz/',method:'POST',
    fields:[{name:'order_id',value:order},{name:'currency',value:'kzt'},
     {name:'signature',value:'s'.repeat(64)},{name:'sys',value:'micro-synthetic'}]
   }});
  }else{
   expect(req.postDataJSON()).toEqual({order_num:order,claim_credential:credential});
   await route.fulfill({json:{status:'fulfilled',license_key:'ANRI-23456-23456-23456-23456'}});
  }
 });
 await page.goto(base+'/ru/pilot/');
 await page.locator('#invite').fill(invite);
 await page.locator('#createButton').click();
 await expect(page.locator('#prepared')).toBeVisible();
 await expect(page.locator('#payButton')).toBeDisabled();
 await expect(page.locator('#preparedOrder')).toHaveText(order);
 await expect(page.locator('#credential')).toHaveValue(credential);
 await expect(page).toHaveURL(base+'/ru/pilot/');
 await expect(page.locator('#invite')).toHaveValue('');
 await page.locator('#saved').check();
 await expect(page.locator('#payButton')).toBeEnabled();
 const providerData=await page.evaluate(()=>{
  const str=sessionStorage.getItem('anri-private-micro-100kzt');
  return {str,body:document.querySelector('#prepared').innerText};
 });
 expect(providerData.str).not.toContain(invite);
 await page.reload();
 await expect(page.locator('#order')).toHaveValue(order);
 await expect(page.locator('#credential')).toHaveValue(credential);
 await page.locator('#checkButton').click();
 await expect(page.locator('#key')).toHaveText('ANRI-23456-23456-23456-23456');
 await page.locator('#checkButton').click();
 await expect(page.locator('#key')).toHaveText('ANRI-23456-23456-23456-23456');
 await page.locator('#clearButton').click();
 await expect(page.locator('#key')).toBeHidden();
 expect(await page.evaluate(()=>sessionStorage.getItem('anri-private-micro-100kzt'))).toBeNull();
 expect(calls.length).toBe(3);
});
