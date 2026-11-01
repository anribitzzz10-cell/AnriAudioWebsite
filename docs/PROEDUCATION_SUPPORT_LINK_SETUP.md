# ProEducation — current voluntary-support link

**Product name:** Anri Audio MIDI
**Purpose:** Optional support of independent development. This is not a purchase of the plugin, a perpetual FULL license, or an upgrade.
**Merchant cabinet:** https://anriprod.proeducation.kz/
**Current link supplied by the merchant:** `https://proeducation.kz/akaILk/` (user confirmed the text link and QR link are both valid; they may change when a new payment QR/link is generated). The website publishes the text link and embeds the supplied QR code as `support-development/proeducation-support-qr.svg`. The QR code destination is `https://proeducation.kz/alaILl/`. Both URLs are kept separately because the provider may regenerate them independently.

## Merchant link and future refreshes

1. In the existing merchant cabinet, confirm that a separately named voluntary-support contribution is permitted for this merchant profile. Do not reuse the existing `Доступ к аудиоплагинам` product/payment form.
2. Create a separate item with an accurate receipt description, suggested wording `Поддержка разработки Anri Audio MIDI` subject to ProEducation's permitted categories.
3. Choose a **general/multi-use payment link**, in **KZT**, without buyer-specific details and without recurring billing. Choose and verify the intended amount in the merchant cabinet; no amount is assumed in this repository.
4. Explain clearly in the merchant checkout description that the payment is voluntary, it is not necessary to use Anri Audio MIDI, and it does not issue a license key or unlock any functions.
5. Do not set a delivery webhook, fulfillment hook, FULL-license issuer, or sales success URL on this item. Keep older license and digital-product payment flows unchanged. Do not connect support payments to automated license issuance.
6. Generate the actual merchant URL using **Отправить счёт → Получить ссылку**. Verify the URL and checkout page, particularly recipient, description, amount/currency, and merchant approval, without making an unapproved payment.

## Website link configuration

The three localized support pages load `/support-development/proeducation-support.js`. Its current configuration is:

```js
const PROEDUCATION_VOLUNTARY_SUPPORT = Object.freeze({
  approved: true,
  url: "https://proeducation.kz/akaILk/",
  qrUrl: "https://proeducation.kz/alaILl/"
});
```

The current text URL and QR destination are stored separately in `support-development/proeducation-support.js`, with `approved: true`. The QR itself is a vector asset at `support-development/proeducation-support-qr.svg`. The support card identifies ProEducation as a Russia (RF) option in English, Russian and Kazakh. When the merchant generates new links/QR, replace both URL values and the QR asset together, re-run the locale tests, and publish through a reviewed PR. Never put API or signing secrets in frontend files.

If the activation gate is switched off, the ProEducation card returns to **coming soon** and no payment button is inserted. The current activation adds only a link to the provider page; it does not enable website checkout, a payments API, or license issuance.

## Release checklist

- Confirm the payment form is **not** for `Доступ к аудиоплагинам` or a pilot/test invoice.
- Confirm provider permits this support purpose and receipt description.
- Confirm the public amount, currency KZT, and reusable link behavior.
- Confirm optional support does not issue an ANRI license.
- Confirm EN, RU, KK show one correct action, and no broken button when disabled.
- Confirm Kaspi Pay, Boosty and PayPal remain unchanged.
- Confirm Playwright/browser tests and existing website proxy tests pass.
- Only merge to `main` after the above checks.
