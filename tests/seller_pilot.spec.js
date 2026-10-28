const {test,expect}=require('@playwright/test');
for(const locale of ['','ru/','kk/']){
 test('private claim '+locale,async({page})=>{
  const requests=[];
  await page.route('**/pilot/config.js',r=>r.fulfill({contentType:'application/javascript',
   body:"export const API_ORIGIN='https://anri-cloud-api-staging-staging.up.railway.app'; export const PILOT_ENABLED=true;"}));
  await page.route('https://anri-cloud-api-staging-staging.up.railway.app/**',r=>{
   requests.push(r.request());
   return r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},
    body:JSON.stringify({ok:true,order_num:'ANRI100-ABCDEFGHIJKLMNOP',
     license:{key:'ANRI-ABCDE-FGHJK-LMNPQ-RSTUV',edition:'full'}})});
  });
  await page.goto('http://127.0.0.1:8765/'+locale+'pilot/?secret=discarded#discarded');
  await expect(page).toHaveURL(new RegExp('/'+locale+'pilot/$'));
  await expect(page.locator('#createForm')).toBeHidden();
  await expect(page.locator('#payButton')).toBeHidden();
  await page.locator('#order').fill('ANRI100-ABCDEFGHIJKLMNOP');
  await page.locator('#credential').fill('a'.repeat(64));
  await page.locator('#checkButton').click();
  await expect(page.locator('#key')).toHaveText('ANRI-ABCDE-FGHJK-LMNPQ-RSTUV');
  expect(requests.length).toBe(1);
  expect(requests[0].url()).toBe('https://anri-cloud-api-staging-staging.up.railway.app/v1/seller-pilot/claim');
  expect(requests[0].postDataJSON()).toEqual({order_num:'ANRI100-ABCDEFGHIJKLMNOP',claim_secret:'a'.repeat(64)});
  await page.locator('#checkButton').click();
  await expect(page.locator('#key')).toBeVisible();
  await page.locator('#clearButton').click();
  await expect(page.locator('#credential')).toHaveValue('');
  await expect(page.locator('#key')).toBeHidden();
 });
}
test('default closed',async({page})=>{
 await page.goto('http://127.0.0.1:8765/ru/pilot/');
 await expect(page.locator('#checkButton')).toBeDisabled();
});
