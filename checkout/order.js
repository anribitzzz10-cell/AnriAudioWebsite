import {API_ORIGIN, CHECKOUT_ENABLED} from './config.js';

// A provider return is never treated as proof of payment or as a credential.
history.replaceState(null, '', location.pathname);
const $ = id => document.getElementById(id);
const lang = document.documentElement.lang;
const messages = {
  en: {
    ready: 'Order prepared. You do not need to save an order number or private code. Your purchase email is enough to recover the license.',
    pending: 'Payment has not been confirmed yet. We will keep checking this order.',
    paidHold: 'Payment was received, but license delivery is not complete yet. Use email recovery or contact support.',
    unavailable: 'The license is not available in this browser. Recover it using your purchase email.',
    license: 'Your license key:',
    copy: 'Copy license key',
    copied: 'License key copied.',
    recovery: 'Recover a license by email'
  },
  ru: {
    ready: 'Заказ подготовлен. Сохранять номер заказа или секретный код не нужно. Для восстановления лицензии достаточно почты, указанной при покупке.',
    pending: 'Оплата ещё не подтверждена. Мы продолжим проверять заказ.',
    paidHold: 'Оплата получена, но выдача лицензии ещё не завершена. Воспользуйтесь восстановлением по email или обратитесь в поддержку.',
    unavailable: 'Лицензия не получена в этом браузере. Восстановите её по email, указанному при покупке.',
    license: 'Ваш лицензионный ключ:',
    copy: 'Скопировать ключ',
    copied: 'Лицензионный ключ скопирован.',
    recovery: 'Восстановить лицензию по email'
  },
  kk: {
    ready: 'Тапсырыс дайын. Тапсырыс нөмірін немесе құпия кодты сақтаудың қажеті жоқ. Лицензияны сатып алу кезінде көрсетілген email арқылы қалпына келтіруге болады.',
    pending: 'Төлем әлі расталған жоқ. Тапсырысты тексеруді жалғастырамыз.',
    paidHold: 'Төлем қабылданды, бірақ лицензияны беру әлі аяқталған жоқ. Email арқылы қалпына келтіріңіз немесе қолдау қызметіне хабарласыңыз.',
    unavailable: 'Бұл браузерде лицензия алынбады. Оны сатып алу кезінде көрсетілген email арқылы қалпына келтіріңіз.',
    license: 'Лицензия кілтіңіз:',
    copy: 'Лицензия кілтін көшіру',
    copied: 'Лицензия кілті көшірілді.',
    recovery: 'Лицензияны email арқылы қалпына келтіру'
  }
};
const t = messages[lang] || messages.en;
const enabled = API_ORIGIN === location.origin;
const storageKey = 'anri-private-order';
let prepared = null;
let generation = 0;
let timer = null;
let activeRequest = null;
let currentOrder = '';
let currentCredential = '';

const validOrder = value => /^anri-full-[0-9a-f]{32}$/.test(value);
const validCredential = value => /^[A-Za-z0-9_-]{43}$/.test(value);
const validKey = value => typeof value === 'string' && /^ANRI-[A-Z2-9]{5}(?:-[A-Z2-9]{5}){3}$/.test(value);

function loadPrivateOrder() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    if (saved && validOrder(saved.order_num) && validCredential(saved.claim_credential)) {
      currentOrder = saved.order_num;
      currentCredential = saved.claim_credential;
    }
  } catch {
    // Browser storage is optional; email recovery remains the durable fallback.
  }
}

function setResult(value) {
  $('result').textContent = value;
}

function clearKey() {
  $('key').textContent = '';
  $('key').hidden = true;
  if ($('copy-key')) $('copy-key').hidden = true;
}

function stopClaim() {
  generation += 1;
  clearTimeout(timer);
  activeRequest?.abort();
  activeRequest = null;
}

function identity() {
  return {order_num: currentOrder, claim_credential: currentCredential};
}

function sameIdentity(a, b) {
  return a.order_num === b.order_num && a.claim_credential === b.claim_credential;
}

function validQuote(q, expectedEmail) {
  if (!q || !validOrder(q.order_num) || !validCredential(q.claim_credential) ||
      q.currency !== 'KZT' || !Number.isSafeInteger(q.amount_minor) ||
      q.amount_minor <= 0 || q.amount_minor > 100000000 ||
      q.merchant_form_action !== 'https://anriprod.proeducation.kz/' ||
      q.method !== 'POST' || !Array.isArray(q.fields) ||
      q.fields.length < 1 || q.fields.length > 100) return false;

  const allowed = /^(?:do|currency|order_id|customer_email|sys|urlSuccess|urlReturn|urlNotification|payments_limit|signature|products\[0\]\[(?:name|sku|price|quantity)\])$/;
  if (!q.fields.every(f => typeof f.name === 'string' && typeof f.value === 'string' &&
      allowed.test(f.name) && !f.value.includes(q.claim_credential))) return false;
  if (new Set(q.fields.map(f => f.name)).size !== q.fields.length) return false;

  const field = name => q.fields.find(f => f.name === name)?.value;
  if (field('order_id') !== q.order_num || field('currency') !== 'kzt' ||
      field('sys') !== 'anriaudio' ||
      field('customer_email')?.trim().toLowerCase() !== expectedEmail.trim().toLowerCase() ||
      !/^[a-f0-9]{64}$/.test(field('signature') || '')) return false;

  for (const name of ['urlSuccess', 'urlReturn', 'urlNotification']) {
    try {
      const url = new URL(field(name));
      if (url.protocol !== 'https:' || url.username || url.password ||
          url.search || url.hash) return false;
      if (name === 'urlNotification' && url.pathname !== '/v1/payments/proeducation/webhook') return false;
    } catch {
      return false;
    }
  }
  return true;
}

async function createOrder(data) {
  const response = await fetch(API_ORIGIN + '/v1/checkout/proeducation/create', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    redirect: 'error'
  });
  if (!response.ok) throw new Error('Order unavailable');
  return response.json();
}

$('create').addEventListener('submit', async event => {
  event.preventDefault();
  if (!(enabled && CHECKOUT_ENABLED)) return;

  const email = $('email').value.trim();
  if (!email || !$('email').reportValidity()) return;

  $('buy').disabled = true;
  setResult('');
  try {
    const quote = await createOrder({customer_email: email, locale: lang});
    if (!validQuote(quote, email)) throw new Error('Invalid order response');

    stopClaim();
    clearKey();
    prepared = quote;
    currentOrder = quote.order_num;
    currentCredential = quote.claim_credential;

    // This short-lived same-tab reference enables automatic retrieval after the
    // provider redirect. It is never shown to the buyer and is not required:
    // the buyer can always recover through the purchase email.
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        order_num: currentOrder,
        claim_credential: currentCredential
      }));
    } catch {
      // No browser storage must never block a valid payment.
    }

    $('amount').textContent = new Intl.NumberFormat(
      lang === 'kk' ? 'kk-KZ' : lang === 'ru' ? 'ru-RU' : 'en-US',
      {style: 'currency', currency: 'KZT'}
    ).format(quote.amount_minor / 100);
    $('prepared').hidden = false;
    $('pay').disabled = false;
    $('save-label').textContent = t.ready;
    setResult(t.ready);
  } catch {
    prepared = null;
    $('prepared').hidden = true;
    $('pay').disabled = true;
    setResult(t.unavailable);
    $('buy').disabled = !(enabled && CHECKOUT_ENABLED);
  }
});

$('pay').addEventListener('click', () => {
  if (!enabled || !CHECKOUT_ENABLED || !prepared ||
      !validQuote(prepared, $('email').value.trim())) return;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = prepared.merchant_form_action;
  for (const field of prepared.fields) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = field.name;
    input.value = field.value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
});

async function claimOrder(attempt, run, owner) {
  if (!enabled || run !== generation || document.hidden ||
      !sameIdentity(owner, identity())) return;

  const controller = new AbortController();
  activeRequest = controller;
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(API_ORIGIN + '/v1/checkout/proeducation/claim', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(owner),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
      signal: controller.signal
    });
    if (!response.ok) throw new Error('Claim unavailable');

    const result = await response.json();
    if (run !== generation || !sameIdentity(owner, identity())) return;

    if (result.status === 'fulfilled' && validKey(result.license_key)) {
      $('key').textContent = result.license_key;
      $('key').hidden = false;
      if (!$('copy-key')) {
        const button = document.createElement('button');
        button.id = 'copy-key';
        button.type = 'button';
        button.textContent = t.copy;
        button.addEventListener('click', async () => {
          if ($('key').hidden || !validKey($('key').textContent)) return;
          try {
            await navigator.clipboard.writeText($('key').textContent);
            setResult(t.copied);
          } catch {
            setResult(t.license);
          }
        });
        $('key').after(button);
      }
      $('copy-key').hidden = false;
      setResult(t.license);
    } else if (result.status === 'paid_hold') {
      setResult(t.paidHold);
    } else if (result.status === 'pending' && result.license_key == null) {
      setResult(t.pending);
      if (attempt < 23) timer = setTimeout(() => claimOrder(attempt + 1, run, owner), 5000);
      else setResult(t.unavailable);
    } else {
      clearKey();
      setResult(t.unavailable);
    }
  } catch {
    if (run === generation) {
      clearKey();
      setResult(t.unavailable);
    }
  } finally {
    clearTimeout(timeout);
    if (activeRequest === controller) activeRequest = null;
  }
}

function startClaim() {
  stopClaim();
  clearKey();
  loadPrivateOrder();
  const owner = identity();
  if (enabled && validOrder(owner.order_num) && validCredential(owner.claim_credential)) {
    void claimOrder(0, generation, owner);
  }
}

$('recover-link').textContent = t.recovery;
$('buy').disabled = !(enabled && CHECKOUT_ENABLED);
$('pay').disabled = true;
loadPrivateOrder();

addEventListener('pagehide', () => {
  stopClaim();
  clearKey();
  currentCredential = '';
});

addEventListener('pageshow', () => {
  startClaim();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopClaim();
    clearKey();
  } else {
    startClaim();
  }
});
