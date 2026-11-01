const {test, expect} = require('@playwright/test');
const base = 'http://127.0.0.1:8765';

const checkoutPages = [
  ['/checkout/', 'Paid checkout is paused', '/#download'],
  ['/ru/checkout/', 'Платное оформление заказов приостановлено', '/ru/#download'],
  ['/kk/checkout/', 'Ақылы тапсырыс беру уақытша тоқтатылды', '/kk/#download']
];

for (const [path, heading, downloadHref] of checkoutPages) {
  test('legacy checkout is safely replaced with free-release notice: '+path, async ({page}) => {
    await page.goto(base+path+'?order=untrusted&success=true');
    await expect(page.locator('h1')).toHaveText(heading);
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('script[src*="order.js"]')).toHaveCount(0);
    await expect(page.locator('a[href="'+downloadHref+'"]')).toBeVisible();
    await expect(page.locator('body')).toContainText(/FREE 1\\.0\\.0|бесплатен|тегін/i);
    await expect(page).toHaveURL(base+path);
  });
}

test('Kaspi route is voluntary support only, never a license checkout', async ({page}) => {
  await page.goto(base+'/kaspi/');
  await expect(page.locator('h1')).toHaveText('Kaspi Pay — добровольная поддержка');
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('a[href="https://pay.kaspi.kz/pay/zxqekc5w"]')).toBeVisible();
  await expect(page.locator('body')).toContainText('не выдаёт лицензию');
});

test('support page exposes Kaspi, Boosty and PayPal; ProEducation is clearly pending', async ({page}) => {
  await page.goto(base+'/support-development/');
  await expect(page.locator('a[href="https://pay.kaspi.kz/pay/zxqekc5w"]')).toBeVisible();
  await expect(page.locator('a[href="https://boosty.to/anriproduct"]')).toBeVisible();
  await expect(page.locator('a[href="https://paypal.me/anribeats"]')).toBeVisible();
  await expect(page.locator('#proeducation')).toContainText('A separate voluntary-support payment link is being prepared');
});
