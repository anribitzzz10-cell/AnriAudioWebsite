# ANRI AUDIO MIDI — Kaspi Pay for Kazakhstan (manual verified route)

Date: 2026-10-28. Draft only. **No live payment published.**

## Approved model

- Kazakhstan buyers only, via the seller's *own* Kaspi Pay business merchant account and **official remote payment link**. No personal Kaspi Gold card transfers.
- Customer receives a **perpetual FULL license**, with up to two activated devices, **only after the seller independently verifies the exact incoming payment in Kaspi POS → History**.
- This route is separate from ProEducation and voluntary donations. No new API credential, unofficial cashier automation, screenshot-based fulfillment, or silent license issuance.
- $15 USD is the separate launch-offer display price. A merchant-approved **fixed exact amount in KZT** must be set before enabling the Kaspi link; the old private 456 KZT ProEducation pilot is NOT the product price.

## Official documentation

- Kaspi Pay: https://kaspi.kz/kaspipay
- Link generation: https://guide.kaspi.kz/partner/ru/pos/payments/remote/q2019
- Website placement: https://guide.kaspi.kz/partner/ru/pos/payments/remote/q2021
- Payment confirmation: https://guide.kaspi.kz/partner/ru/pos/payments/remote/q2022

The buyer **manually enters the amount** when using a Kaspi Pay payment link. The public merchant link alone cannot enforce a product price, cannot convey a trusted paid-status webhook, and does not provide an authenticated software entitlement.

## Staging implementation

- `kaspi/index.html`: trilingual RU/KK/EN offer, displays approved KZT price, links to official merchant only when all gates pass, prominently explains manual reconciliation and entitlement.
- `kaspi/config.js`: **disabled by default** and intentionally contains no payment link or price.
- `index.html`, `ru/index.html`, `kk/index.html`: informational links in the how-to-buy section. Main paid-release button remains disabled, and the site remains unlaunched.

## Activation checklist (before publishing)

1. In *your own* Kaspi Pay app, as manager: Kaspi Pay → Удаленная оплата → Ссылка для оплаты. Copy the actual merchant-owned link for the correct store location. Do not guess its suffix.
2. Independently confirm with your account and legal documents that remote payments for commercial software licensing are supported. Prior Kaspi support indicated payment links for the business's own services were accepted; retain any supporting response.
3. Set exact merchant-approved KZT price for the public $15 launch offer. Never copy the 456 KZT private test price as the public price.
4. Verify the merchant recipient shown in Kaspi.kz is IP «Анрипрод» / expected business. For this staging implementation the link must be `https://pay.kaspi.kz/pay/...`, with no query, fragment, username, password, or redirect domain.
5. Change **only** `kaspi/config.js` after approval: `enabled: true`, `paymentUrl: "https://pay.kaspi.kz/pay/..." `, `amountKzt: <approved integer>`. Review language and terms. Do NOT change ProEducation staging, production license keys, AUv2, Broker or Keychain.
6. Verify an actual customer-facing pay page on a disposable draft/deployment; check merchant, amount entered manually, receipt and correct account, refusal/wrong-sum behavior.
7. After buyer email arrives, privately match **merchant POS history**: transaction reference, credited account, paid status, exact KZT amount, payer, date/time and product comment. Check a **private unique-transaction ledger** before any issuance. Do not trust screenshots, client redirects or messages alone.
8. Only then create **one** perpetual FULL key via the authorized ANRI Cloud process; record the exact reference and license ID privately, and deliver the key to the buyer's verified email. Existing `/admin/licenses` is a manual privileged issuance mechanism; do not assume it auto-mails or provides order-level idempotency. Establish an audited Kaspi reconciliation workflow before selling at scale.
9. Refund/underpayment: follow Kaspi Pay POS procedures. Never grant FULL automatically on a partial payment.
10. Launch only when the installer, sales terms, taxes/receipts and full issue/restore process are approved.

## Safety

No API route was enabled, no Kaspi transactions were created, no store was published, no server secrets or card data were added, and no payment was accepted. This is a code-only PR for a separate customer path.
