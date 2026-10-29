const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../checkout/order.js'), 'utf8')
  .replace("import {API_ORIGIN, CHECKOUT_ENABLED} from './config.js';", '');
const order = 'anri-full-' + 'a'.repeat(32);
const credential = 'c'.repeat(43);
const key = ['ANRI', 'ABCDE', 'FGHJK', 'LMNPQ', 'RSTUV'].join('-');
const flush = () => new Promise(resolve => setImmediate(resolve));

const fields = [
  ['do', 'pay'],
  ['currency', 'kzt'],
  ['order_id', order],
  ['customer_email', 'buyer@example.invalid'],
  ['sys', 'anriaudio'],
  ['urlSuccess', 'https://anriaudio.com/ru/checkout/'],
  ['urlReturn', 'https://anriaudio.com/ru/checkout/'],
  ['urlNotification', 'https://anri-cloud.onrender.com/v1/payments/proeducation/webhook'],
  ['payments_limit', '1'],
  ['products[0][name]', 'ANRI AUDIO MIDI — Perpetual FULL License'],
  ['products[0][sku]', 'ANRI_AUDIO_MIDI_MAC_AUV2'],
  ['products[0][price]', '18000.00'],
  ['products[0][quantity]', '1'],
  ['signature', 'a'.repeat(64)]
].map(([name, value]) => ({name, value}));

function quote() {
  return {
    order_num: order,
    claim_credential: credential,
    amount_minor: 1800000,
    currency: 'KZT',
    merchant_form_action: 'https://anriprod.proeducation.kz/',
    method: 'POST',
    fields
  };
}

function fixture({saved = true, enabled = true, checkoutEnabled = false, fetcher, storageThrows = false} = {}) {
  const elements = new Map();
  const events = {};
  const timers = new Map();
  const calls = [];
  let timerId = 0;
  let copied = '';
  let submitted = false;

  function ensure(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id, value: '', textContent: '', hidden: false, checked: false, disabled: false,
        handlers: {},
        addEventListener(name, fn) { this.handlers[name] = fn; },
        after(node) { if (node.id) elements.set(node.id, node); },
        append() {}, reset() {}, focus() {}, select() {},
        reportValidity() { return true; },
        submit() { submitted = true; }
      });
    }
    return elements.get(id);
  }

  const storage = new Map(saved ? [[
    'anri-private-order',
    JSON.stringify({order_num: order, claim_credential: credential})
  ]] : []);

  const document = {
    documentElement: {lang: 'ru'},
    hidden: false,
    getElementById(id) { return elements.get(id) || null; },
    createElement(type) {
      return {
        id: '', type, value: '', name: '', textContent: '', hidden: false,
        handlers: {},
        addEventListener(name, fn) { this.handlers[name] = fn; },
        append() {},
        submit() { submitted = true; }
      };
    },
    addEventListener(name, fn) { events[name] = fn; },
    body: {append() { submitted = true; }}
  };

  for (const id of ['recover-link', 'buy', 'pay', 'save-label', 'prepared', 'amount',
                    'result', 'key', 'create', 'email']) ensure(id);

  const sessionStorage = {
    getItem(name) {
      if (storageThrows) throw new Error('storage unavailable');
      return storage.get(name) || null;
    },
    setItem(name, value) {
      if (storageThrows) throw new Error('storage unavailable');
      storage.set(name, value);
    },
    removeItem(name) {
      if (storageThrows) throw new Error('storage unavailable');
      storage.delete(name);
    }
  };

  const context = {
    API_ORIGIN: enabled ? 'https://anriaudio.com' : '',
    CHECKOUT_ENABLED: checkoutEnabled,
    document,
    location: {origin: 'https://anriaudio.com', pathname: '/ru/checkout/'},
    history: {replaceState(_a, _b, url) { calls.push({cleanURL: url}); }},
    sessionStorage,
    navigator: {clipboard: {writeText: async value => { copied = value; }}},
    AbortController,
    addEventListener(name, fn) { events[name] = fn; },
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, {fn, ms}); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch: async (url, options) => {
      calls.push({url, options});
      if (fetcher) return fetcher(url, options);
      return {ok: true, json: async () => ({status: 'fulfilled', license_key: key})};
    },
    Intl, Set, Error, URL, Number, JSON, RegExp, String, Math
  };

  vm.runInNewContext(source, context);

  const trigger = async (id, event = 'click') => {
    const node = ensure(id);
    await node.handlers[event]?.({preventDefault() {}});
    await flush();
  };

  return {
    ensure, events, timers, calls, storage, context, document, trigger,
    get copied() { return copied; },
    get submitted() { return submitted; }
  };
}

async function run() {
  const passed = [];
  async function check(name, fn) { await fn(); passed.push(name); }

  await check('same-tab return automatically claims once and clears private credential after fulfillment', async () => {
    const f = fixture();
    f.events.pageshow();
    await flush();
    assert.equal(f.ensure('key').textContent, key);
    assert.equal(f.ensure('key').hidden, false);
    const call = f.calls.find(item => item.url);
    assert.equal(call.options.method, 'POST');
    assert.equal(call.options.referrerPolicy, 'no-referrer');
    assert.equal(call.options.cache, 'no-store');
    assert.equal(call.options.credentials, 'omit');
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.url.includes(credential), false);
    assert.deepEqual(JSON.parse(call.options.body), {order_num: order, claim_credential: credential});
    assert.equal(f.calls[0].cleanURL, '/ru/checkout/');
    assert.equal(f.storage.size, 0);
    await f.trigger('copy-key');
    assert.equal(f.copied, key);
  });

  await check('without same-tab order reference, page makes no claim and buyer can use email recovery', async () => {
    const f = fixture({saved: false});
    f.events.pageshow();
    await flush();
    assert.equal(f.calls.filter(item => item.url).length, 0);
    assert.equal(f.ensure('key').hidden, true);
    assert.equal(f.ensure('recover-link').textContent.length > 0, true);
  });

  await check('closed checkout origin performs no claim', async () => {
    const f = fixture({enabled: false});
    f.events.pageshow();
    await flush();
    assert.equal(f.calls.filter(item => item.url).length, 0);
  });

  await check('pending payment polls and then displays the same license key', async () => {
    let n = 0;
    const f = fixture({fetcher: async () => ({
      ok: true,
      json: async () => ++n === 1
        ? {status: 'pending', license_key: null}
        : {status: 'fulfilled', license_key: key}
    })});
    f.events.pageshow();
    await flush();
    assert.equal(f.ensure('key').hidden, true);
    const timer = [...f.timers.values()].find(item => item.ms === 5000);
    assert.ok(timer);
    timer.fn();
    await flush();
    assert.equal(f.ensure('key').textContent, key);
  });

  await check('paid hold never pretends that a license was issued', async () => {
    const f = fixture({fetcher: async () => ({
      ok: true, json: async () => ({status: 'paid_hold', license_key: null})
    })});
    f.events.pageshow();
    await flush();
    assert.equal(f.ensure('key').hidden, true);
    assert.equal(f.ensure('result').textContent.includes('Оплата получена'), true);
    assert.equal(f.timers.size, 0);
  });

  await check('payment does not require browser storage or saving an order credential', async () => {
    const f = fixture({saved: false, checkoutEnabled: true, storageThrows: true,
      fetcher: async () => ({ok: true, json: async () => quote()})});
    f.ensure('email').value = 'buyer@example.invalid';
    await f.trigger('create', 'submit');
    assert.equal(f.ensure('prepared').hidden, false);
    assert.equal(f.ensure('pay').disabled, false);
    assert.equal(f.ensure('save-label').textContent.includes('Сохранять номер заказа'), true);
    assert.equal(f.ensure('email').value, 'buyer@example.invalid');
  });

  await check('pagehide cancels polling and clears the displayed key', async () => {
    const f = fixture();
    f.events.pageshow();
    await flush();
    f.events.pagehide();
    assert.equal(f.ensure('key').hidden, true);
    assert.equal(f.timers.size, 0);
    assert.equal(f.storage.size, 1);
  });

  return passed;
}

module.exports = run;
if (require.main === module) {
  run().then(p => console.log(p.length + ' order recovery checks PASS'))
    .catch(error => { console.error(error); process.exitCode = 1; });
}
