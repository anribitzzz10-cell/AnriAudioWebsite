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

test('support page exposes Kaspi, Boosty, PayPal and ProEducation', async ({page}) => {
  await page.goto(base+'/support-development/');
  await expect(page.locator('#kaspi')).toContainText('Voluntary support through Kaspi Pay');
  await expect(page.locator('#kaspi a[href="https://pay.kaspi.kz/pay/zxqekc5w"]')).toBeVisible();
  await expect(page.locator('#boosty a.pay-link[href="https://boosty.to/anriproduct"]')).toBeVisible();
  await expect(page.locator('#paypal a.pay-link[href="https://paypal.me/anribeats"]')).toBeVisible();
  await expect(page.locator('#proeducation a.pay-link')).toHaveAttribute('href', /https:\/\/proeducation\.kz\/fqaIO5\/\?customer_extra=/);
});

for (const path of ['/', '/ru/', '/kk/']) {
  test('stable product branding and optional Kaspi link '+path, async ({page}) => {
    await page.goto(base+path);
    await expect(page).toHaveTitle(/ANRI AUDIO MIDI/);
    await expect(page.locator('body')).not.toContainText('ANRI AUDIO MIDI FREE');
    await expect(page.locator('body')).not.toContainText('1.0.0');
    await expect(page.locator('#support-development a[href="https://pay.kaspi.kz/pay/zxqekc5w"]')).toBeVisible();
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
  test('ProEducation support stays hidden when the activation gate is disabled '+path, async ({page}) => {
    await page.route('**/support-development/proeducation-support.js', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace('approved: true', 'approved: false');
      await route.fulfill({response, body});
    });
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
      .replace('url: "https://proeducation.kz/fqaIO5/"', 'url: "https://mp.e.proeducation.kz/u/CI_TEST_ONLY"');
    await route.fulfill({response, body});
  });
  await page.goto(base+'/ru/support-development/');
  await expect(page.locator('#proeducation a.pay-link')).toHaveAttribute('href', /https:\/\/mp\.e\.proeducation\.kz\/u\/CI_TEST_ONLY\?customer_extra=/);
  await expect(page.locator('#proeducation .status')).toHaveCount(0);
  await expect(page.locator('#proeducation')).toContainText('не выдаёт лицензию ANRI AUDIO MIDI');
});

test('ProEducation support refuses an untrusted destination', async ({page}) => {
  await page.route('**/support-development/proeducation-support.js', async route => {
    const response = await route.fetch();
    const body = (await response.text())
      .replace('approved: false', 'approved: true')
      .replace('url: "https://proeducation.kz/fqaIO5/"', 'url: "https://example.invalid/untrusted"');
    await route.fulfill({response, body});
  });
  await page.goto(base+'/support-development/');
  await expect(page.locator('#proeducation .status')).toBeVisible();
  await expect(page.locator('#proeducation a.pay-link')).toHaveCount(0);
});

for (const path of ['/support-development/', '/ru/support-development/', '/kk/support-development/']) {
  test('current ProEducation payment link is visible in '+path, async ({page}) => {
    await page.goto(base+path);
    await expect(page.locator('#proeducation a.pay-link')).toHaveAttribute('href', /https:\/\/proeducation\.kz\/fqaIO5\/\?customer_extra=/);
    await expect(page.locator('#proeducation .status')).toHaveCount(0);
    await expect(page.locator('#proeducation h2')).toContainText(path.startsWith('/ru') ? 'Россия (РФ)' : path.startsWith('/kk') ? 'Ресей (РФ)' : 'Russia (RF)');
    await expect(page.locator('#proeducation .proeducation-qr img')).toHaveAttribute('src', '/support-development/proeducation-support-qr.svg');
    await expect(page.locator('#proeducation .proeducation-qr img')).toBeVisible();
    // Visibility alone does not guarantee the SVG actually loaded in the browser.
    await expect(page.locator('#proeducation .proeducation-qr img')).toHaveJSProperty('complete', true);
    await expect.poll(async () => page.locator('#proeducation .proeducation-qr img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('#proeducation .proeducation-qr a')).toHaveAttribute('href', /https:\/\/proeducation\.kz\/fraIO6\/\?customer_extra=/);
  });
}

test('ProEducation link carries voluntary-support guidance in customer_extra', async ({page}) => {
  await page.goto(base+'/ru/support-development/');
  for (const selector of ['#proeducation a.pay-link','#proeducation .proeducation-qr a']) {
    const href = await page.locator(selector).getAttribute('href');
    const u = new URL(href);
    expect(u.hostname).toBe('proeducation.kz');
    const value = u.searchParams.get('customer_extra');
    expect(value).toContain('Добровольная поддержка разработки Anri Audio MIDI');
    expect(value).toContain('Очистить');
    expect(value).toContain('Сумма к оплате');
    expect(value).toContain('не является покупкой лицензии');
  }
});

for (const route of ['/', '/ru/', '/kk/']) {
  test('product and info panels preserve scoped contrast in '+route, async ({page}) => {
    await page.goto(base+route);
    await expect(page.locator('link[rel="stylesheet"][href="/assets/anri-product-info-panels.css"]')).toHaveCount(1);
    await expect(page.locator('#price .anri-english-support-box')).toHaveCSS('border-top-color', 'rgba(239, 74, 101, 0.23)');
    await expect(page.locator('#download .anri-english-support-box')).toHaveCSS('border-top-color', 'rgba(239, 74, 101, 0.23)');
    await expect(page.locator('#compatibility .anri-english-support-box')).toHaveCSS('border-top-color', 'rgba(210, 219, 235, 0.12)');
    await expect(page.locator('#support .anri-english-support-box')).toHaveCSS('border-top-color', 'rgba(210, 219, 235, 0.12)');
    await expect(page.locator('#seller .anri-english-support-box')).toHaveCSS('border-top-color', 'rgba(210, 219, 235, 0.12)');
    await expect(page.locator('#support-development .anri-english-support-box')).toHaveCSS('border-top-color', 'rgba(210, 219, 235, 0.12)');
    await expect(page.locator('#download .notice')).toHaveCSS('border-left-color', 'rgb(216, 164, 92)');
    await expect(page.locator('#download .notice')).toHaveCSS('border-left-width', '3px');
    await expect(page.locator('#price .grid .box').first()).toHaveCSS('border-top-color', 'rgba(219, 224, 237, 0.1)');
    // The download is prominent; the optional support link retains a quiet fill.
    await expect(page.locator('#download .anri-section-actions a.anri-pkg-download')).toHaveCSS('border-top-color', 'rgba(245, 100, 124, 0.68)');
    await expect(page.locator('#download .anri-section-actions a:not(.anri-pkg-download)')).toHaveCSS('background-color', 'rgb(17, 18, 23)');
    await expect(page.locator('#download .anri-section-actions .placeholder')).toHaveCount(0);
    await expect(page.locator('#support-development .anri-section-actions a').first()).toHaveCSS('background-color', 'rgb(23, 17, 22)');
    await expect(page.locator('#support-development .anri-section-actions a').last()).toHaveCSS('background-color', 'rgb(17, 18, 23)');
    await expect(page.locator('#seller .anri-section-actions a')).toHaveCSS('background-color', 'rgb(17, 18, 23)');
    // The product feature cards now share a dark neutral gradient, not the older grey fill.
    const featureBackground = await page.locator('#price .grid .box').first().evaluate(el => getComputedStyle(el).backgroundImage);
    expect(featureBackground).toContain('rgb(17, 18, 23)');
    expect(featureBackground).toContain('rgb(11, 12, 17)');
    // Product showcase and FAQ retain their original styling.
    await expect(page.locator('.anri-artbox')).toHaveCSS('border-top-color', 'rgba(237, 31, 61, 0.25)');
    await expect(page.locator('#faq .box').first()).toHaveCSS('border-top-color', 'rgba(255, 255, 255, 0.075)');
  });
}

const macosDownloadHref = 'https://github.com/anribitzzz10-cell/AnriAudioWebsite/releases/download/macos-free-1.0.2-rc1/ANRI_AUDIO_MIDI_FREE_COMPONENT.pkg';
const macosDownloads = [
  ['/', 'Download macOS installer'],
  ['/ru/', 'Скачать установщик macOS'],
  ['/kk/', 'macOS орнатқышын жүктеу']
];
for (const [route, label] of macosDownloads) {
  test('free macOS download points to public release in '+route, async ({page}) => {
    await page.goto(base+route);
    const download = page.locator('#download a.anri-pkg-download');
    await expect(download).toHaveCount(1);
    await expect(download).toHaveAttribute('href', macosDownloadHref);
    await expect(download).toHaveAttribute('target', '_blank');
    await expect(download).toContainText(label);
    await expect(page.locator('.cta-row a[href="#download"]')).toBeVisible();
    await expect(page.locator('#download')).not.toContainText(/coming shortly|ссылка на скачивание готовится|сілтемесі дайындалып жатыр/i);
    await expect(page.locator('#download')).toContainText('arm64');
    await expect(page.locator('#download')).not.toContainText(/license activation required|требуется активация/i);
  });
}

test('new scoped stylesheet is delivered publicly as CSS', async ({page, request}) => {
  const response = await request.get(base+'/assets/anri-product-info-panels.css');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/text\/css/);
  const css = await response.text();
  expect(css).toContain('#price .anri-english-support-box');
  expect(css).toContain('#download .notice');
  expect(css).not.toContain('.anri-artbox{');
  expect(css).not.toContain('#faq .box{');
});

test('English legal information describes the free ANRI AUDIO MIDI release', async ({page}) => {
  await page.goto(base+'/legal/');
  await expect(page.getByRole('heading',{name:'Free software and optional support'})).toBeVisible();
  await expect(page.locator('main')).toContainText('No purchase, subscription, account registration, license key, or activation is required');
  await expect(page.locator('a[href="/ru/contacts/"]')).toHaveCount(2);
  await expect(page.locator('a[href="/kk/contacts/"]')).toHaveCount(2);
  await expect(page.locator('main')).not.toContainText(/5\s?000\s?KZT|Pre-release purchase information|perpetual software license/i);
});

for (const route of ['/ru/contacts/','/kk/contacts/']) {
  test('linked business contacts are consistent with free release '+route, async ({page}) => {
    await page.goto(base+route);
    await expect(page.locator('main')).toContainText('ANRI AUDIO MIDI');
    await expect(page.locator('main')).not.toContainText(/5\s?000\s?KZT|коммерческий выпуск|Коммерциялық нұсқа/i);
    await expect(page.locator('main a[href="../support-development/"]').first()).toBeVisible();
    await expect(page.locator('main')).toContainText(route.startsWith('/ru/') ? 'Бесплатно' : 'Тегін');
  });
}

const pagesWithIconHeaders = [
  ['/', '/support-development/', 'Donation'],
  ['/ru/', '/ru/support-development/', 'Поддержать'],
  ['/kk/', '/kk/support-development/', 'Қолдау']
];

for (const [route, donationHref, donationName] of pagesWithIconHeaders) {
  test('header icons and donation CTA are accessible in '+route, async ({page}) => {
    await page.goto(base+route);
    const nav = page.locator('.anri-header-icons');
    await expect(nav.locator('a.anri-social-icon')).toHaveCount(5);
    await expect(nav.getByRole('link', {name: 'Telegram'})).toHaveAttribute('href', 'https://t.me/anriproduct');
    await expect(nav.getByRole('link', {name: 'Boosty'})).toHaveAttribute('href', 'https://boosty.to/anriproduct');
    await expect(nav.getByRole('link', {name: 'Kaspi Pay'})).toHaveAttribute('href', 'https://pay.kaspi.kz/pay/zxqekc5w');
    await expect(nav.getByRole('link', {name: 'PayPal'})).toHaveAttribute('href', 'https://paypal.me/anribeats');
    await expect(nav.getByRole('link', {name: 'ProEducation'})).toHaveAttribute('href', donationHref+'#proeducation');
    await expect(page.locator('.cta-row').getByRole('link', {name: donationName})).toHaveAttribute('href', donationHref);
    const donation = page.locator('.cta-row').getByRole('link', {name: donationName});
    await expect(donation).toHaveClass(/btn-donate-glow/);
    await expect(donation).toHaveCSS('border-top-color', 'rgba(216, 164, 92, 0.82)');
    await expect(donation).toHaveCSS('color', 'rgb(245, 223, 181)');
    const shadow = await donation.evaluate(element => getComputedStyle(element).boxShadow);
    expect(shadow).toContain('rgba(216, 164, 92, 0.13)');
    await expect(page.locator('.cta-row a[href="#download"]')).not.toHaveClass(/btn-donate-glow/);
    await expect(page.locator('.cta-row a[href="#functions"]')).not.toHaveClass(/btn-donate-glow/);
    const features = page.locator('.cta-row a[href="#functions"]');
    await expect(features).toHaveClass(/btn-features-glow/);
    await expect(features).toHaveCSS('border-top-color', 'rgba(104, 151, 239, 0.67)');
    const featuresShadow = await features.evaluate(element => getComputedStyle(element).boxShadow);
    expect(featuresShadow).toContain('rgba(83, 132, 237, 0.14)');
    await expect(page.locator('.cta-row a[href="#download"]')).not.toHaveClass(/btn-features-glow/);
    await expect(donation).not.toHaveClass(/btn-features-glow/);
    await expect(page.locator('#support a[href="https://t.me/anriproduct"]')).toBeVisible();
    await expect(page.locator('link[href="/assets/anri-header-socials.css"]')).toHaveCount(1);
  });
}

for (const route of ['/legal/', '/ru/contacts/', '/kk/contacts/']) {
  test('legal contact pages use one Telegram account: '+route, async ({page}) => {
    await page.goto(base+route);
    await expect(page.locator('main a[href="https://t.me/anriproduct"]')).toBeVisible();
    await expect(page.locator('main')).not.toContainText('anribitzzz10@gmail.com');
    await expect(page.locator('main a[href="https://t.me/anriprod"]')).toHaveCount(0);
    await expect(page.locator('.anri-header-icons a.anri-social-icon')).toHaveCount(5);
  });
}
