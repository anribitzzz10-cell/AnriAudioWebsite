// Anri Audio MIDI — ProEducation voluntary-support link (NOT product checkout).
// Do not turn this on with a product-purchase, FULL-license, demo, or pilot link.
// Only use a provider-approved, separately generated GENERAL link for optional support.
// URL must be independently inspected before publishing. No secrets belong here.
const PROEDUCATION_VOLUNTARY_SUPPORT = Object.freeze({
  approved: true,
  url: "https://proeducation.kz/akaILk/"
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

  const section = document.getElementById("proeducation");
  if (!section || section.querySelector(".pay-link")) return;

  const locales = {
    en: {
      intro: "Optional development support via ProEducation. No purchase or license is issued.",
      note: "This is a separate voluntary-support link, not the ANRI AUDIO MIDI digital-product checkout.",
      action: "Open ProEducation"
    },
    ru: {
      intro: "Добровольная поддержка разработки через ProEducation. Покупка и выдача лицензии не предусмотрены.",
      note: "Это отдельная ссылка поддержки, не оформление заказа на цифровой продукт ANRI AUDIO MIDI.",
      action: "Открыть ProEducation"
    },
    kk: {
      intro: "ProEducation арқылы әзірлеуге ерікті қолдау. Сатып алу немесе лицензия беру көзделмеген.",
      note: "Бұл ANRI AUDIO MIDI цифрлық өнімін сатып алу емес, ерікті қолдаудың жеке сілтемесі.",
      action: "ProEducation ашу"
    }
  };
  const t = locales[document.documentElement.lang] || locales.en;
  const intro = section.querySelector(".group-intro");
  const note = section.querySelector(".payment-note");
  const status = section.querySelector(".status");
  if (!intro || !note || !status) return;

  const row = document.createElement("div");
  row.className = "payment-row";
  const anchor = document.createElement("a");
  anchor.className = "pay-link";
  anchor.href = target.href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.textContent = t.action;
  row.append(anchor);
  intro.textContent = t.intro;
  note.textContent = t.note;
  status.remove();
  section.append(row);
})();
