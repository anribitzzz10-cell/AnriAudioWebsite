(() => {
  "use strict";
  const API = "https://anri-cloud.onrender.com/v1/license/check";
  const messages = {
    en: {
      checking: "Checking license status…",
      notFound: "No matching license was found. Check the key and try again.",
      unavailable: "The license service is temporarily unavailable. Please try again later.",
      found: "License found",
      product: "Product",
      edition: "Edition",
      status: "Status",
      active: "Active",
      revoked: "Revoked",
      expired: "Expired",
      unknown: "Unknown",
      activations: "Active activations",
      expiry: "Expiry",
      perpetual: "No expiry",
      full: "FULL",
      demo: "DEMO",
      invalid: "The response could not be verified. Please try again."
    },
    ru: {
      checking: "Проверяем статус лицензии…",
      notFound: "Лицензия не найдена. Проверьте ключ и попробуйте ещё раз.",
      unavailable: "Сервис лицензий временно недоступен. Попробуйте позже.",
      found: "Лицензия найдена",
      product: "Продукт",
      edition: "Редакция",
      status: "Статус",
      active: "Действует",
      revoked: "Отозвана",
      expired: "Истекла",
      unknown: "Неизвестен",
      activations: "Активных устройств",
      expiry: "Срок действия",
      perpetual: "Бессрочно",
      full: "FULL",
      demo: "DEMO",
      invalid: "Не удалось проверить ответ сервера. Попробуйте ещё раз."
    },
    kk: {
      checking: "Лицензия мәртебесі тексерілуде…",
      notFound: "Лицензия табылмады. Кілтті тексеріп, қайта көріңіз.",
      unavailable: "Лицензия қызметі уақытша қолжетімсіз. Кейінірек қайталап көріңіз.",
      found: "Лицензия табылды",
      product: "Өнім",
      edition: "Нұсқа",
      status: "Мәртебесі",
      active: "Белсенді",
      revoked: "Күші жойылған",
      expired: "Мерзімі аяқталған",
      unknown: "Белгісіз",
      activations: "Белсенді құрылғылар",
      expiry: "Жарамдылық мерзімі",
      perpetual: "Мерзімсіз",
      full: "FULL",
      demo: "DEMO",
      invalid: "Сервер жауабын тексеру мүмкін болмады. Қайта көріңіз."
    }
  };
  const lang = messages[document.documentElement.lang] ? document.documentElement.lang : "en";
  const t = messages[lang];
  const form = document.getElementById("license-check-form");
  const input = document.getElementById("license-key");
  const button = document.getElementById("check-button");
  const result = document.getElementById("license-result");
  if (!form || !input || !button || !result) return;

  function show(text, state) {
    result.textContent = text;
    result.dataset.state = state || "";
    result.hidden = false;
  }
  function expiryLabel(value) {
    if (!value) return t.perpetual;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t.unknown;
    try {
      return new Intl.DateTimeFormat(lang === "kk" ? "kk-KZ" : lang === "ru" ? "ru-RU" : "en-US", {
        year: "numeric", month: "short", day: "numeric", timeZone: "UTC"
      }).format(date);
    } catch {
      return value;
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = input.value.trim();
    input.value = "";
    if (key.length < 10 || key.length > 128) {
      show(t.notFound, "error");
      return;
    }
    button.disabled = true;
    show(t.checking, "");
    try {
      const response = await fetch(API, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({license_key: key}),
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error"
      });
      if (!response.ok) throw new Error("unavailable");
      const payload = await response.json();
      if (payload?.ok !== true || !payload.license || typeof payload.license !== "object") {
        show(t.notFound, "error");
        return;
      }
      const lic = payload.license;
      const status = ({active: t.active, revoked: t.revoked, expired: t.expired})[lic.status] || t.unknown;
      const edition = lic.edition === "full" ? t.full : lic.edition === "demo" ? t.demo : t.unknown;
      if (typeof lic.product !== "string" ||
          !["active", "revoked", "expired"].includes(lic.status) ||
          !Number.isInteger(lic.active_activations) ||
          !Number.isInteger(lic.max_activations)) {
        show(t.invalid, "error");
        return;
      }
      show([
        t.found,
        t.product + ": ANRI AUDIO MIDI",
        t.edition + ": " + edition,
        t.status + ": " + status,
        t.activations + ": " + lic.active_activations + " / " + lic.max_activations,
        t.expiry + ": " + expiryLabel(lic.expires_at)
      ].join("\n"), lic.status === "active" ? "active" : "error");
    } catch {
      show(t.unavailable, "error");
    } finally {
      button.disabled = false;
    }
  });
  window.addEventListener("pagehide", () => {
    input.value = "";
    result.textContent = "";
    result.hidden = true;
  });
})();
