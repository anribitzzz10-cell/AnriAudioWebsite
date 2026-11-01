// Anri Audio MIDI — ProEducation voluntary-support link (NOT product checkout).
// Do not turn this on with a product-purchase, FULL-license, demo, or pilot link.
// Only use a provider-approved, separately generated GENERAL link for optional support.
// URL must be independently inspected before publishing. No secrets belong here.
const PROEDUCATION_VOLUNTARY_SUPPORT = Object.freeze({
  approved: true,
  url: "https://proeducation.kz/akaILk/",
  qrUrl: "https://proeducation.kz/alaILl/"
});

(() => {
  "use strict";
  const config = PROEDUCATION_VOLUNTARY_SUPPORT;
  if (!config.approved || typeof config.url !== "string" || !config.url) return;

  let target;
  try {
    target = new URL(config.url);
  } catch {
    return;
  }

  const knownHosts = new Set(["anriprod.proeducation.kz", "mp.e.proeducation.kz", "proeducation.kz"]);
  if (target.protocol !== "https:" || !knownHosts.has(target.hostname)
      || target.username || target.password || target.hash
      || (target.pathname === "/" && !target.search)) return;

  let qrTarget;
  try {
    qrTarget = new URL(config.qrUrl);
  } catch {
    return;
  }
  if (qrTarget.protocol !== "https:" || !knownHosts.has(qrTarget.hostname)
      || qrTarget.username || qrTarget.password || qrTarget.hash
      || (qrTarget.pathname === "/" && !qrTarget.search)) return;

  const section = document.getElementById("proeducation");
  if (!section || section.querySelector(".pay-link")) return;

  const locales = {
    en: {
      title: "ProEducation · Russia (RF)",
      intro: "Voluntary development support for supporters in Russia (RF).",
      note: "This is an optional contribution. It is not a plugin purchase and does not issue an ANRI AUDIO MIDI license.",
      action: "Open ProEducation payment link",
      qrLabel: "Or scan the ProEducation payment QR code · Russia (RF)",
      qrAlt: "ProEducation payment QR code for Russia (RF)"
    },
    ru: {
      title: "ProEducation · Россия (РФ)",
      intro: "Добровольная поддержка разработки для пользователей из России (РФ).",
      note: "Это необязательный перевод на поддержку. Он не является покупкой плагина и не выдаёт лицензию ANRI AUDIO MIDI.",
      action: "Открыть ссылку ProEducation",
      qrLabel: "Или отсканируйте QR-код для оплаты · Россия (РФ)",
      qrAlt: "QR-код ProEducation для оплаты из России"
    },
    kk: {
      title: "ProEducation · Ресей (РФ)",
      intro: "Ресейдегі (РФ) қолдаушыларға арналған әзірлеуге ерікті қолдау.",
      note: "Бұл ерікті аударым. Ол плагинді сатып алу болып саналмайды және ANRI AUDIO MIDI лицензиясын бермейді.",
      action: "ProEducation төлем сілтемесін ашу",
      qrLabel: "Немесе төлем QR-кодын сканерлеңіз · Ресей (РФ)",
      qrAlt: "Ресейден төлеуге арналған ProEducation QR-коды"
    }
  };
  const t = locales[document.documentElement.lang] || locales.en;
  const heading = section.querySelector("h2");
  const intro = section.querySelector(".group-intro");
  const note = section.querySelector(".payment-note");
  const status = section.querySelector(".status");
  if (!heading || !intro || !note || !status) return;

  const row = document.createElement("div");
  row.className = "payment-row";
  const anchor = document.createElement("a");
  anchor.className = "pay-link";
  anchor.href = target.href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.textContent = t.action;
  row.append(anchor);
  const layout = document.createElement("div");
  layout.className = "proeducation-support-layout";
  const qr = document.createElement("div");
  qr.className = "proeducation-qr";
  const qrLabel = document.createElement("p");
  qrLabel.className = "proeducation-qr-label";
  qrLabel.textContent = t.qrLabel;
  const qrLink = document.createElement("a");
  qrLink.href = qrTarget.href;
  qrLink.target = "_blank";
  qrLink.rel = "noopener noreferrer";
  qrLink.setAttribute("aria-label", t.qrAlt);
  const qrImage = document.createElement("img");
  qrImage.src = "/support-development/proeducation-support-qr.svg";
  qrImage.alt = t.qrAlt;
  qrImage.width = 185;
  qrImage.height = 185;
  qrImage.loading = "lazy";
  qrImage.decoding = "async";
  qrLink.append(qrImage);
  qr.append(qrLabel, qrLink);

  const style = document.createElement("style");
  style.textContent = ".proeducation-support-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(170px,210px);gap:22px;align-items:center;margin-top:14px}.proeducation-qr{display:grid;justify-items:center;gap:9px;text-align:center}.proeducation-qr-label{font-size:12px;line-height:1.5;color:var(--muted);margin:0!important}.proeducation-qr a{display:block;width:min(100%,190px);padding:10px;border-radius:14px;background:#fff;border:1px solid rgba(255,255,255,.16)}.proeducation-qr img{display:block;width:100%;height:auto;image-rendering:pixelated}@media(max-width:600px){.proeducation-support-layout{grid-template-columns:1fr;gap:14px}.proeducation-qr{justify-items:start;text-align:left}.proeducation-qr a{width:min(100%,170px)}}";
  layout.append(row, qr);
  heading.textContent = t.title;
  intro.textContent = t.intro;
  note.textContent = t.note;
  status.remove();
  section.append(style, layout);
})();
