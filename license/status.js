(() => {
  "use strict";
  // The official Railway site is a dynamic Node server; it proxies private
  // license requests to ANRI Cloud over fixed same-origin POST routes.
  const API = "/v1/license/check";
  const RECOVERY_REQUEST_API = "/v1/license/recovery/request";
  const RECOVERY_VERIFY_API = "/v1/license/recovery/verify";
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
      invalid: "The response could not be verified. Please try again.",
      licenseKey: "License key",
      order: "Order",
      recoverySent: "If a matching purchase exists, a 6-digit verification code has been sent to that email. Enter it below.",
      recoveryChecking: "Verifying the code and retrieving licenses…",
      recoveryUnavailable: "Recovery could not be completed. Check the code or try again later.",
      recoveryCodeInvalid: "The code is invalid or expired. Request a new code and try again.",
      recoveryTooMany: "Too many attempts. Request a new code and try again.",
      recoveryNoLicenses: "No licenses were found for this email. Check the address or contact support."
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
      invalid: "Не удалось проверить ответ сервера. Попробуйте ещё раз.",
      licenseKey: "Лицензионный ключ",
      order: "Номер заказа",
      recoverySent: "Если для этого адреса есть покупка, на почту отправлен 6-значный код. Введите его ниже.",
      recoveryChecking: "Проверяем код и получаем лицензии…",
      recoveryUnavailable: "Не удалось завершить восстановление. Проверьте код или попробуйте позже.",
      recoveryCodeInvalid: "Код неверный или срок его действия истёк. Запросите новый код.",
      recoveryTooMany: "Слишком много попыток. Запросите новый код и попробуйте снова.",
      recoveryNoLicenses: "Для этой почты лицензии не найдены. Проверьте адрес или обратитесь в поддержку."
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
      invalid: "Сервер жауабын тексеру мүмкін болмады. Қайта көріңіз.",
      licenseKey: "Лицензия кілті",
      order: "Тапсырыс",
      recoverySent: "Егер осы поштаға сатып алу байланыстырылса, 6 таңбалы код жіберілді. Оны төменде енгізіңіз.",
      recoveryChecking: "Код тексеріліп, лицензиялар алынуда…",
      recoveryUnavailable: "Қалпына келтіру аяқталмады. Кодты тексеріп, кейінірек қайталаңыз.",
      recoveryCodeInvalid: "Код қате немесе оның мерзімі аяқталған. Жаңа код сұратыңыз.",
      recoveryTooMany: "Әрекет саны тым көп. Жаңа код сұратып, қайталап көріңіз.",
      recoveryNoLicenses: "Бұл поштаға лицензия табылмады. Мекенжайды тексеріңіз немесе қолдау қызметіне жүгініңіз."
    }
  };
  const lang = messages[document.documentElement.lang] ? document.documentElement.lang : "en";
  const t = messages[lang];
  const form = document.getElementById("license-check-form");
  const input = document.getElementById("license-key");
  const button = document.getElementById("check-button");
  const result = document.getElementById("license-result");
  const recoveryRequestForm = document.getElementById("recovery-request-form");
  const recoveryEmail = document.getElementById("recovery-email");
  const recoverySendButton = document.getElementById("recovery-send-button");
  const recoveryVerifyForm = document.getElementById("recovery-verify-form");
  const recoveryCode = document.getElementById("recovery-code");
  const recoveryVerifyButton = document.getElementById("recovery-verify-button");
  const recoveryResult = document.getElementById("recovery-result");
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
  function showRecovery(text, state) {
    if (!recoveryResult) return;
    recoveryResult.textContent = text;
    recoveryResult.dataset.state = state || "";
    recoveryResult.hidden = false;
  }

  function recoveryPost(path, data) {
    return fetch(path, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data),
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error"
    });
  }

  if (recoveryRequestForm && recoveryEmail && recoverySendButton &&
      recoveryVerifyForm && recoveryCode && recoveryVerifyButton && recoveryResult) {
    recoveryRequestForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = recoveryEmail.value.trim();
      if (!email) return;
      recoverySendButton.disabled = true;
      showRecovery(t.recoveryChecking, "");
      try {
        const response = await recoveryPost(RECOVERY_REQUEST_API, {email});
        if (!response.ok) {
          showRecovery(response.status === 429 ? t.recoveryTooMany : t.recoveryUnavailable, "error");
          return;
        }
        const payload = await response.json();
        if (payload?.ok !== true) {
          showRecovery(t.recoveryUnavailable, "error");
          return;
        }
        recoveryVerifyForm.hidden = false;
        recoveryCode.value = "";
        showRecovery(t.recoverySent, "");
        recoveryCode.focus();
      } catch {
        showRecovery(t.recoveryUnavailable, "error");
      } finally {
        recoverySendButton.disabled = false;
      }
    });

    recoveryVerifyForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = recoveryEmail.value.trim();
      const code = recoveryCode.value.trim();
      if (!email || !/^\d{6}$/.test(code)) {
        showRecovery(t.recoveryCodeInvalid, "error");
        return;
      }
      recoveryVerifyButton.disabled = true;
      showRecovery(t.recoveryChecking, "");
      try {
        const response = await recoveryPost(RECOVERY_VERIFY_API, {email, code});
        if (response.status === 400) {
          showRecovery(t.recoveryCodeInvalid, "error");
          return;
        }
        if (response.status === 429) {
          showRecovery(t.recoveryTooMany, "error");
          return;
        }
        if (response.status === 404) {
          showRecovery(t.recoveryNoLicenses, "error");
          return;
        }
        if (!response.ok) {
          showRecovery(t.recoveryUnavailable, "error");
          return;
        }
        const payload = await response.json();
        if (payload?.ok !== true || !Array.isArray(payload.licenses) || payload.licenses.length === 0) {
          showRecovery(t.recoveryNoLicenses, "error");
          return;
        }
        const lines = [];
        for (const [index, lic] of payload.licenses.entries()) {
          if (!lic || typeof lic.key !== "string" ||
              !/^ANRI-[A-Z2-9]{5}(?:-[A-Z2-9]{5}){3}$/.test(lic.key) ||
              !["active", "revoked", "expired"].includes(lic.status) ||
              !Number.isInteger(lic.active_activations) ||
              !Number.isInteger(lic.max_activations)) {
            showRecovery(t.invalid, "error");
            return;
          }
          const status = ({active: t.active, revoked: t.revoked, expired: t.expired})[lic.status] || t.unknown;
          const edition = lic.edition === "full" ? t.full : lic.edition === "demo" ? t.demo : t.unknown;
          const item = [
            "#" + (index + 1),
            t.licenseKey + ": " + lic.key,
            t.edition + ": " + edition,
            t.status + ": " + status,
            t.activations + ": " + lic.active_activations + " / " + lic.max_activations,
            t.expiry + ": " + expiryLabel(lic.expires_at)
          ];
          if (typeof lic.order_num === "string") item.push(t.order + ": " + lic.order_num);
          lines.push(item.join("\n"));
        }
        recoveryCode.value = "";
        showRecovery(lines.join("\n\n"), payload.licenses.every(lic => lic.status === "active") ? "active" : "error");
      } catch {
        showRecovery(t.recoveryUnavailable, "error");
      } finally {
        recoveryVerifyButton.disabled = false;
      }
    });
  }

  window.addEventListener("pagehide", () => {
    input.value = "";
    result.textContent = "";
    result.hidden = true;
    if (recoveryEmail) recoveryEmail.value = "";
    if (recoveryCode) recoveryCode.value = "";
    if (recoveryResult) {
      recoveryResult.textContent = "";
      recoveryResult.hidden = true;
    }
  });
})();
