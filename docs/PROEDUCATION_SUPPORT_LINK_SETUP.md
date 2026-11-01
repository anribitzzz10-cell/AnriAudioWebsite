# ProEducation — optional development support (PREPARED, NOT LIVE)

**Product name:** Anri Audio MIDI
**Purpose:** Optional support of independent development. This is not a purchase of the plugin, a perpetual FULL license, or an upgrade.
**Merchant cabinet:** https://anriprod.proeducation.kz/
**Status:** Merchant-generated, provider-approved support payment URL does not yet exist in the checked sources. No real payment link is published by this change.

## Prepare the merchant link

1. In the existing merchant cabinet, confirm that a separately named voluntary-support contribution is permitted for this merchant profile. Do not reuse the existing `Доступ к аудиоплагинам` product/payment form.
2. Create a separate item with an accurate receipt description, suggested wording `Поддержка разработки Anri Audio MIDI` subject to ProEducation's permitted categories.
3. Choose a **general/multi-use payment link**, in **KZT**, without buyer-specific details and without recurring billing. Choose and verify the intended amount in the merchant cabinet; no amount is assumed in this repository.
4. Explain clearly in the merchant checkout description that the payment is voluntary, it is not necessary to use Anri Audio MIDI, and it does not issue a license key or unlock any functions.
5. Do not set a delivery webhook, fulfillment hook, FULL-license issuer, or sales success URL on this item. Keep older license and digital-product payment flows unchanged. Do not connect support payments to automated license issuance.
6. Generate the actual merchant URL using **Отправить счёт → Получить ссылку**. Verify the URL and checkout page, particularly recipient, description, amount/currency, and merchant approval, without making an unapproved payment.

## Website activation (only when verified)

The three localized support pages load `/support-development/proeducation-support.js`. Its dormant configuration is:

```js
const PROEDUCATION_VOLUNTARY_SUPPORT = Object.freeze({
  approved: false,
  url: ""
});
```

After verifying a **separate support item**, insert its provider-issued HTTPS payment URL into `url`, set `approved: true`, test all three locales, and release via reviewed PR. Allowed hosts currently include `anriprod.proeducation.kz` and `mp.e.proeducation.kz`; if the real provider-generated short link uses a different verified host, add that exact host only after inspection. Never put API or signing secrets in frontend files.

When not approved, the ProEducation card remains visibly **coming soon**, and no payment button is inserted. This change does not enable commercial checkout, payments API, or license issuance.

## Release checklist

- Confirm the payment form is **not** for `Доступ к аудиоплагинам` or a pilot/test invoice.
- Confirm provider permits this support purpose and receipt description.
- Confirm the public amount, currency KZT, and reusable link behavior.
- Confirm optional support does not issue an ANRI license.
- Confirm EN, RU, KK show one correct action, and no broken button when disabled.
- Confirm Kaspi Pay, Boosty and PayPal remain unchanged.
- Confirm Playwright/browser tests and existing website proxy tests pass.
- Only merge to `main` after the above checks.
