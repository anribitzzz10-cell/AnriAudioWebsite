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
    await expect(page.locator('body')).toContainText(/ANRI AUDIO MIDI|бесплатен|тегін/i);
    await expect(page).toHaveURL(base+path+'?order=untrusted&success=true');
  });
}

test('Kaspi route is voluntary support only, never a license checkout', async ({page}) => {
  await page.goto(base+'/kaspi/');
  await expect(page.locator('h1')).toHaveText('Kaspi Pay — добровольная поддержка');
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('body')).toContainText('Добровольная поддержка разработки через Kaspi Pay');
  await expect(page.locator('a[href="https://pay.kaspi.kz/pay/zxqekc5w"]')).toHaveCount(1);
  await expect(page.locator('body')).toContainText('не выдаёт лицензию');
});

test('support page exposes Kaspi, Boosty and PayPal; ProEducation is clearly pending', async ({page}) => {
  await page.goto(base+'/support-development/');
  await expect(page.locator('#kaspi')).toContainText('Voluntary support through Kaspi Pay');
  await expect(page.locator('#kaspi a[href="https://pay.kaspi.kz/pay/zxqekc5w"]')).toBeVisible();
  await expect(page.locator('a[href="https://boosty.to/anriproduct"]')).toBeVisible();
  await expect(page.locator('a[href="https://paypal.me/anribeats"]')).toBeVisible();
  await expect(page.locator('#proeducation')).toContainText('A separate voluntary-support payment link is being prepared');
});

for (const path of ['/', '/ru/', '/kk/']) {
  test('stable product branding and optional Kaspi link '+path, async ({page}) => {
    await page.goto(base+path);
    await expect(page).toHaveTitle(/ANRI AUDIO MIDI/);
    await expect(page.locator('body')).not.toContainText('ANRI AUDIO MIDI FREE');
    await expect(page.locator('body')).not.toContainText('1.0.0');
    await expect(page.locator('a[href="https://pay.kaspi.kz/pay/zxqekc5w"]')).toBeVisible();
  });
}
for (const path of ['/support-development/','/ru/support-development/','/kk/support-development/']) {
  test('Kaspi is available for optional support '+path, async ({page}) => {
    await page.goto(base+path);
    await expect(page.locator('#kaspi a[href="https://pay.kaspi.kz/pay/zxqekc5w"]')).toBeVisible();
    await expect(page.locator('#kaspi')).toContainText('Kaspi Pay');
    await expect(page.locator('body')).not.toContainText('ANRI AUDIO MIDI FREE');
  });
}

for (const path of ['/support-development/', '/ru/support-development/', '/kk/support-development/']) {
  test('ProEducation support remains inactive without approved separate payment URL '+path, async ({page}) => {
    await page.goto(base+path);
    await expect(page.locator('#proeducation .status')).toBeVisible();
    await expect(page.locator('#proeducation a.pay-link')).toHaveCount(0);
    await expect(page.locator('script[src="/support-development/proeducation-support.js"]')).toHaveCount(1);
  });
}

test('ProEducation support activates only with an approved provider link', async ({page}) => {
  await page.route('**/support-development/proeducation-support.js', async route => {
    const response = await route.fetch();
    const body = (await response.text())
      .replace('approved: false', 'approved: true')
      .replace('url: ""', 'url: "https://mp.e.proeducation.kz/u/CI_TEST_ONLY"');
    await route.fulfill({response, body});
  });
  await page.goto(base+'/ru/support-development/');
  await expect(page.locator('#proeducation a.pay-link')).toHaveAttribute('href', 'https://mp.e.proeducation.kz/u/CI_TEST_ONLY');
  await expect(page.locator('#proeducation .status')).toHaveCount(0);
  await expect(page.locator('#proeducation')).toContainText('лицензии не предусмотрены');
});

test('ProEducation support refuses an untrusted destination', async ({page}) => {
  await page.route('**/support-development/proeducation-support.js', async route => {
    const response = await route.fetch();
    const body = (await response.text())
      .replace('approved: false', 'approved: true')
      .replace('url: ""', 'url: "https://example.invalid/untrusted"');
    await route.fulfill({response, body});
  });
  await page.goto(base+'/support-development/');
  await expect(page.locator('#proeducation .status')).toBeVisible();
  await expect(page.locator('#proeducation a.pay-link')).toHaveCount(0);
});
