const $ = id => document.getElementById(id);
const endpoint = '/v1/checkout/proeducation/private-five-rub/create';
const claimEndpoint = '/v1/checkout/proeducation/claim';
const storage = 'anri-private-five-rub-order';
let quote = null;
let busy = false;
let polls = 0;
let timer = null;
history.replaceState(null, '', location.pathname);

function field(q, name) { return q.fields.find(f => f.name === name)?.value; }
function valid(q) {
  if (!q || typeof q !== 'object' ||
      !/^anri-pilot-[0-9a-f]{32}$/.test(q.order_num) ||
      !/^[A-Za-z0-9_-]{43}$/.test(q.claim_credential) ||
      q.currency !== 'RUB' || q.amount_minor !== 500 ||
      q.method !== 'POST' ||
      q.merchant_form_action !== 'https://anriprod.proeducation.kz/' ||
      !Array.isArray(q.fields) || q.fields.length < 5 || q.fields.length > 100 ||
      !q.fields.every(f => typeof f.name === 'string' && typeof f.value === 'string') ||
      new Set(q.fields.map(f => f.name)).size !== q.fields.length) return false;
  return field(q, 'currency') === 'rub' &&
    field(q, 'order_id') === q.order_num &&
    field(q, 'sys') === 'anriaudio' &&
    field(q, 'products[0][name]') === 'ANRI AUDIO MIDI — Perpetual FULL License' &&
    field(q, 'products[0][sku]') === 'ANRI_AUDIO_MIDI_MAC_AUV2' &&
    field(q, 'products[0][price]') === '5.00' &&
    field(q, 'products[0][quantity]') === '1' &&
    field(q, 'urlNotification') === 'https://anri-cloud.onrender.com/v1/payments/proeducation/webhook' &&
    /^[a-f0-9]{64}$/.test(field(q, 'signature') || '');
}
function message(text) { $('status').textContent = text; }
function save(q) { try { sessionStorage.setItem(storage, JSON.stringify(q)); } catch {} }
function remove() { try { sessionStorage.removeItem(storage); } catch {} }
function show(q) {
  quote = q;
  $('prepared').hidden = false;
  $('pilot-order').hidden = true;
}
async function check() {
  if (!quote || polls++ >= 24) return;
  try {
    const r = await fetch(claimEndpoint, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({order_num:quote.order_num, claim_credential:quote.claim_credential}),
      cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'
    });
    if (!r.ok) throw Error('claim failed');
    const v=await r.json();
    if (v.status==='fulfilled' && typeof v.license_key==='string' &&
        /^ANRI-[A-Z2-9]{5}(?:-[A-Z2-9]{5}){3}$/.test(v.license_key)) {
      $('key').textContent=v.license_key;
      $('key').hidden=false;
      $('copy').hidden=false;
      $('pay').disabled=true;
      message('FULL-лицензия выдана. Сохраните ключ.');
      remove();
      quote=null;
      return;
    }
    if (v.status==='paid_hold') {
      message('Оплата подтверждена, выдача лицензии ещё обрабатывается. Восстановление доступно по email.');
    } else if (v.status==='pending') {
      message('Заказ ожидает подтверждения оплаты.');
    } else {
      message('Статус заказа не подтверждён. Обратитесь в поддержку.');
      return;
    }
  } catch {
    message('Проверка временно недоступна. Лицензию можно восстановить по email.');
  }
  timer=setTimeout(check,5000);
}
try {
  const saved=JSON.parse(sessionStorage.getItem(storage));
  if(valid(saved)) { show(saved); void check(); }
} catch {}

$('pilot-order').addEventListener('submit', async e => {
  e.preventDefault();
  if(busy || quote) return;
  busy=true; $('create').disabled=true;
  message('Создаём единственный контрольный заказ...');
  try {
    const email=$('email').value.trim();
    const access=$('access').value;
    const r=await fetch(endpoint,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({customer_email:email,locale:'ru',access_token:access}),
      cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'
    });
    $('access').value='';
    if(!r.ok) throw Error('Order unavailable: '+r.status);
    const q=await r.json();
    if(!valid(q) || field(q,'customer_email')?.toLowerCase()!==email.toLowerCase()) {
      throw Error('Unexpected price or order');
    }
    save(q);show(q);
    message('Заказ подготовлен. На стороне ProEducation проверьте сумму 5,00 ₽ до оплаты.');
  } catch(err) {
    message('Не удалось создать контрольный заказ: '+err.message+'. Деньги не списаны.');
    $('create').disabled=false;
  } finally {busy=false;}
});
$('pay').addEventListener('click',()=>{
  if(!valid(quote))return;
  $('pay').disabled=true;
  const f=document.createElement('form');
  f.action=quote.merchant_form_action;
  f.method='POST';
  for(const item of quote.fields){
    const i=document.createElement('input');
    i.type='hidden';i.name=item.name;i.value=item.value;f.append(i);
  }
  document.body.append(f);
  f.submit();
});
$('copy').addEventListener('click',()=>{
  if(!$('key').hidden) void navigator.clipboard.writeText($('key').textContent).catch(()=>{});
});
window.addEventListener('pagehide',()=>{clearTimeout(timer);});
