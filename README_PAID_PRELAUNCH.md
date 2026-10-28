# ANRI AUDIO MIDI — paid website prelaunch (2026-10-20)

This branch prepares the existing public website for a **future paid** ANRI AUDIO MIDI release. It is **not a live store** and must not be deployed as a functioning checkout before the prerequisites below are completed.

## Preserve

- Existing dark visual identity with red accent #ED1F3D.
- Real ANRI AUDIO MIDI interface screenshots, waveform/Piano Roll, features and articulations.
- Current favicon, mobile-friendly layout, links to real media assets.
- Separate optional Support Development page and existing support channels.

## Commercial messaging

- ANRI AUDIO MIDI is moving toward a one-time perpetual license, with two-device activation intended.
- **Original price: $39 USD; proposed launch offer: $15 USD** for a one-time perpetual license (full version), with intended activation on up to two devices and no subscription. Page prominently shows proposed $15 launch offer, with $39 as previous price.
- No working purchase link is confirmed. The **Buy for $15 — coming soon** button is visibly disabled, with no checkout event handler. Boosty official profile `https://boosty.to/anriproduct` is listed only as a profile, **not** as checkout.
- Boosty currently requires manual independent payment confirmation; no official payment-verifying webhook is integrated.
- Paddle Sandbox code has been excluded from the rendered main page; production Paddle checkout is not operational/verified.
- No installer is published yet and the public license lookup/email recovery workflow is still under testing.
- The existing 14-day offline token refresh window is not advertised as a 14-day free trial.
- No promise of a free trial, upgrade rights, update policy or refunds is invented.
- Optional donations/creator support are distinct from acquiring a paid license.

## Files changed

- `index.html`: $15 USD introductory offer and crossed-out $39 USD price block, permanently disabled prelaunch Buy button, how-to-buy, license details, downloads and safe prelaunch copy. No active Paddle JavaScript, paid transaction fetches, or free-mode dialogs.
- `support-development/index.html`: clear warnings that donations/transfers never create or reserve a license.

Other files including screenshots, favicons and webmanifest remain untouched.

## Release gates (not fulfilled)

1. Regular price is **$39 USD**; proposed introductory price is **$15 USD**. Final provider KZT amount/currency still require independent verification. Before checkout opens, confirm user-approved Terms of Sale, refund policy, privacy policy, merchant identity/contact, any payment-provider fees/taxes disclosures, and support contact.
2. Complete payment route validation for target markets, independent proof of payment and merchant payout.
3. Confirm license activation in the signed ANRI AUDIO MIDI plugin, with two-device policy and secure recovery.
4. Finish Resend delivery and receipt tests, sender/recipient controls and safe retry behavior.
5. Approve signed installer, stable download URL, first-user flow and technical help.
6. Test and approve mobile/desktop browser behavior, link destinations and accessibility.
7. Stage site on a non-production preview domain and obtain explicit approval before touching Railway service `AnriAudioWebsite` branch `main` or live `anriaudio.com`.

Railway production uses branch `main` with auto-deploy. Never merge directly without the release gates and an explicit production approval. Railway new builds were reported paused on 20 Oct 2026; no live site deployment is attempted here.

The payment and license feature implementations live in **separate** `anribitzzz10-cell/Anri-cloud` branches and are NOT included or exposed in this static website branch.

## 2026-10-28 sale preparation
The $15/USD promotional UI is draft only, across EN/RU/KK and purchase terms. ProEducation checkout remains unavailable in the live merchant settings (DEMO selected, notification URL blank). Never activate purchase links or fulfill permanent licenses based on test-mode redirects. See docs/PROEDUCATION_LAUNCH_OFFER_15USD_GATE_20261028_RU.md.
