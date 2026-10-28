/* ANRI AUDIO / Kazakhstan-only Kaspi Pay. FAIL-CLOSED until real merchant link and fixed KZT price are approved.
 * Never put merchant passwords, API tokens, customer details, or card data here.
 * Link must be copied from the seller's own Kaspi Pay → Удаленная оплата → Ссылка для оплаты.
 * Do not use a personal Kaspi Gold transfer, test link, or guessed merchant link.
 */
window.ANRI_KASPI_KZ = Object.freeze({
  enabled: false,
  paymentUrl: "https://pay.kaspi.kz/pay/zxqekc5w",
  amountKzt: null
});
