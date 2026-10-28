# ANRI AUDIO MIDI — separate PRIVATE 300 KZT Kaspi Pay → staging FULL pilot
Date: 2026-10-28. **Private payment test only; not a public sale.**

## Pilot
- Merchant link provided by owner: `https://pay.kaspi.kz/pay/zxqekc5w`.
- Pilot price: **exactly 300 KZT**. Buyer must manually enter this amount in Kaspi.kz. The permanent public promotion is **$15 USD** (regular $39 USD); do NOT change the public Kaspi configuration or enable its checkout using this price.
- Payment comment if available: `ANRI-MIDI-FULL-KZ300-20261028`.
- The person paying must independently check that the recipient shown in Kaspi.kz is their actual merchant, IP Anriprod. No payment initiated by this change.
- Only the seller's own Kaspi Pay → POS → History → Paid independently confirms an actual credited payment of 300 KZT. Save the transaction reference for accounting.
- No trusted webhook or official transaction-verification API has been established for this link. Never issue FULL based on screenshot, URL return, self-asserted HTTP field or customer message.
- After manual POS verification, the **owner** on the clean SSD can use a separate, downloadable `ANRI_KASPI_300KZT_FULL_PILOT.zip` that checks the existing staging signature pin and uses **existing authenticated** staging `/admin/licenses` (already tested) to create one perpetual FULL license with max two activations. A private local attempt lock prevents blind duplicate issuance. No automatic online fulfillment. Key is placed in the macOS clipboard and pasted into ANRI License > Activate.
- The staging issue endpoint currently has no merchant-transaction-level idempotency; if a request fails ambiguously, DO NOT retry before inspecting staging records. This is suitable **only for a single manually supervised diagnostic**.
- No payment or license issuance has yet been confirmed.

## Scope / safety
- Website `kaspi/config.js` **stays disabled** with `amountKzt:null`; no 300 KZT public checkout is enabled.
- Separate from the live ProEducation Russia flow and the 456 KZT private ProEducation test; no merchant variables or webhooks changed.
- Working AUv2, Broker, Keychain, existing staging service, normal production service, and TerraB 2 backup #2 unchanged.
- Verify first with a legitimate genuine Kaspi payment before using the downloaded `Finish` command.

Official guide: https://guide.kaspi.kz/partner/ru/pos/payments/remote/q2098 ; paid-transaction checking: https://guide.kaspi.kz/partner/ru/pos/payments/remote/q2022.
