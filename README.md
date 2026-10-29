# ANRI AUDIO — official website

Official domain: https://anriaudio.com

**Source branch:** `feature/automatic-order-claim-20261029` (draft PR #22, not production).
The public `main` site is still hosted as an existing Render Static Site.

## Commerce integration (current as of 29 October 2026)

- ProEducation KZ merchant `anriprod.proeducation.kz`: LIVE confirmed 27 Oct; `sys=anriaudio` approved 29 Oct.
- ANRI AUDIO MIDI FULL perpetual: **$39 USD** product price, paid in a server-approved **fixed KZT amount**, max **2 devices**, no trial or subscription.
- The current branch includes localized `/checkout/`, `/ru/checkout/`, `/kk/checkout/`, private order claim and browser security checks. **Checkout defaults to OFF.**
- Same-origin production-capable gateway: `commerce_gateway.py` and `requirements-commerce.txt`. An isolated Render preview is deployed at https://anri-audio-checkout-gateway-preview.onrender.com/ . Preview is closed for payment and has no merchant credentials.
- ProEducation KZ callback verification and automatic FULL licensing are implemented in **ANRI Cloud PR #26**. It accepts the confirmed provider's RF-card `currency=rub` and optional callback `sys` only when the server-created signed FULL KZT order matches exactly.
- Actual historical manual 100 ₸ payment is not an automatic order and must never issue a commercial license.

**Current integration contract and outstanding operational work:**
[ProEducation KZ contract / release checklist](docs/PROEDUCATION_COMMERCIAL_GO_NO_GO_20261029_RU.md).

**Never** merge PRs or switch `anriaudio.com`/Anri-cloud production before issuer, historical-license migration, KZT price and the new signed checkout are verified. No keys via email or in return URLs.
