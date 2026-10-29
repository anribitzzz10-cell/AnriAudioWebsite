import {API_ORIGIN, CHECKOUT_ENABLED} from './config.js';
// Never use provider return parameters as payment proof or credentials.
history.replaceState(null, '', location.pathname);
const $ = id => document.getElementById(id);
const lang = document.documentElement.lang;
const translations = {
 en: ['Your order','Checkout is closed. Secure order access will be enabled after verification.','Email','Create order','Save your order number and private credential before payment.','Copy order details','I saved my order number and private credential.','Continue to payment','Check order / recover key','Order number','Private order credential','Check order','Clear this browser session','Keep your credential private. It restores the same key. A return from the payment page does not confirm payment.','Payment has not been confirmed yet.','Your license key:','Order unavailable. Check your private credential or contact support.','Order number and private code copied.','Credential ready. Save it before payment.'],
 ru: ['Ваш заказ','Покупка закрыта. Защищённый доступ к заказу будет включён после проверки.','Email','Создать заказ','До оплаты сохраните номер заказа и его секретный код.','Копировать номер заказа и код','Я сохранил номер заказа и секретный код.','Перейти к оплате','Проверить заказ / восстановить ключ','Номер заказа','Секретный код заказа','Проверить заказ','Очистить эту сессию браузера','Храните код в тайне. Он восстанавливает тот же ключ. Возврат со страницы оплаты не подтверждает платёж.','Оплата пока не подтверждена.','Ваш лицензионный ключ:','Заказ недоступен. Проверьте секретный код или обратитесь в поддержку.','Номер заказа и секретный код скопированы.','Код готов. Сохраните его до оплаты.'],
 kk: ['Сіздің тапсырысыңыз','Сатып алу жабық. Тапсырысқа қауіпсіз қол жеткізу тексеруден кейін қосылады.','Email','Тапсырыс жасау','Төлемге дейін тапсырыс нөмірі мен құпия кодын сақтаңыз.','Тапсырыс нөмірі мен кодын көшіру','Тапсырыс нөмірі мен құпия кодын сақтадым.','Төлемге өту','Тапсырысты тексеру / кілтті қалпына келтіру','Тапсырыс нөмірі','Тапсырыстың құпия коды','Тексеру','Браузердің осы сессиясын тазалау','Кодты құпия сақтаңыз. Ол сол кілтті қалпына келтіреді. Төлем бетінен оралу төлемді растамайды.','Төлем әлі расталған жоқ.','Лицензиялық кілтіңіз:','Тапсырыс қолжетімсіз. Құпия кодты тексеріңіз немесе қолдау қызметіне хабарласыңыз.','Тапсырыс нөмірі мен құпия коды көшірілді.','Код дайын. Төлемге дейін сақтаңыз.']
};
const t = translations[lang] || translations.en;
const licensePaths = {en:'/license/',ru:'/ru/license/',kk:'/kk/license/'};
const checkoutPaths = {en:'/checkout/',ru:'/ru/checkout/',kk:'/kk/checkout/'};
const isLicensePage = location.pathname.split('/').filter(Boolean).at(-1) === 'license';
const licenseCopy = {
 en:{heading:'Check License / View License',notice:'Enter the order number and private order code you saved before payment. ANRI Cloud will return the same license key after verified payment.',section:'Check License / View License',check:'Check license',link:'Back to checkout',viewLink:'Check License / View License'},
 ru:{heading:'Проверить лицензию / Посмотреть ключ',notice:'Введите номер заказа и секретный код, сохранённый до оплаты. ANRI Cloud вернёт тот же ключ только после подтверждения платежа.',section:'Проверить лицензию / Посмотреть ключ',check:'Проверить лицензию',link:'Вернуться к оформлению',viewLink:'Проверить лицензию / Посмотреть ключ'},
 kk:{heading:'Лицензияны тексеру / Кілтті көру',notice:'Төлемге дейін сақталған тапсырыс нөмірі мен құпия кодты енгізіңіз. ANRI Cloud төлем расталғаннан кейін сол кілтті қайтарады.',section:'Лицензияны тексеру / Кілтті көру',check:'Лицензияны тексеру',link:'Тапсырысқа оралу',viewLink:'Лицензияны тексеру / Кілтті көру'}
};
const statusCopy = {
 en:{heading:'Check an existing license',notice:'Enter your ANRI license key to check its current status. This is read-only: it does not activate, renew, or change anything.',label:'License key',button:'Check license status',checking:'Checking current status…',invalid:'Enter a valid ANRI license key.',notFound:'No matching license was found.',unavailable:'License status is temporarily unavailable.',active:'License is active',inactive:'License is not active',status:'Status',product:'Product',edition:'Edition',activations:'Active activations',expires:'Expires',perpetual:'Perpetual',states:{active:'Active',revoked:'Revoked',expired:'Expired',inactive:'Inactive'}},
 ru:{heading:'Проверить действующую лицензию',notice:'Введите ключ ANRI, чтобы проверить его текущее состояние. Проверка только читает данные: она ничего не активирует и не изменяет.',label:'Лицензионный ключ',button:'Проверить статус',checking:'Проверяем текущее состояние…',invalid:'Введите корректный ключ ANRI.',notFound:'Лицензия с таким ключом не найдена.',unavailable:'Проверка лицензии временно недоступна.',active:'Лицензия действующая',inactive:'Лицензия не действует',status:'Статус',product:'Продукт',edition:'Редакция',activations:'Активных устройств',expires:'Истекает',perpetual:'Бессрочная',states:{active:'Действует',revoked:'Отозвана',expired:'Истекла',inactive:'Неактивна'}},
 kk:{heading:'Қолданыстағы лицензияны тексеру',notice:'Ағымдағы күйін тексеру үшін ANRI кілтін енгізіңіз. Бұл тек оқуға арналған тексеріс: лицензияны белсендірмейді және өзгертпейді.',label:'Лицензия кілті',button:'Күйін тексеру',checking:'Ағымдағы күй тексерілуде…',invalid:'Дұрыс ANRI кілтін енгізіңіз.',notFound:'Мұндай лицензия табылмады.',unavailable:'Лицензияны тексеру уақытша қолжетімсіз.',active:'Лицензия белсенді',inactive:'Лицензия белсенді емес',status:'Күйі',product:'Өнім',edition:'Нұсқа',activations:'Белсенді құрылғылар',expires:'Жарамдылық мерзімі',perpetual:'Мерзімсіз',states:{active:'Белсенді',revoked:'Кері қайтарылған',expired:'Мерзімі өткен',inactive:'Белсенді емес'}}
};
['heading','notice','email-label','buy','save-label','copy','saved-label','pay','recover-heading','order-label','credential-label','check','forget','privacy'].forEach((id,i)=>$(id).textContent=t[i]);
$('license-link').href = isLicensePage ? (checkoutPaths[lang] || checkoutPaths.en) : (licensePaths[lang] || licensePaths.en);
$('license-link').textContent = isLicensePage ? (licenseCopy[lang] || licenseCopy.en).link : (licenseCopy[lang] || licenseCopy.en).viewLink;
const statusText = statusCopy[lang] || statusCopy.en;
$('license-check-heading').textContent = statusText.heading;
$('license-check-notice').textContent = statusText.notice;
$('license-key-label').textContent = statusText.label;
$('check-license').textContent = statusText.button;
for (const anchor of document.querySelectorAll('nav a[lang]')) {
  anchor.href = isLicensePage ? (licensePaths[anchor.lang] || licensePaths.en) : (checkoutPaths[anchor.lang] || checkoutPaths.en);
}
if (isLicensePage) {
  const copy = licenseCopy[lang] || licenseCopy.en;
  document.title = 'ANRI AUDIO — ' + copy.heading;
  $('heading').textContent = copy.heading;
  $('notice').textContent = copy.notice;
  $('create').hidden = true;
  $('prepared').hidden = true;
  $('recover-heading').textContent = copy.section;
  $('check').textContent = copy.check;
}
const enabled = API_ORIGIN === location.origin;
if (enabled && CHECKOUT_ENABLED) {
  const liveText = {
    en:'18,000 KZT one-time ProEducation payment. Save the private order code before paying. A FULL license appears only after verified payment.',
    ru:'Разовая оплата 18 000 ₸ через ProEducation. Сохраните секретный код заказа до оплаты. FULL-ключ появится только после подтверждения платежа.',
    kk:'ProEducation арқылы біржолғы төлем — 18 000 ₸. Төлемге дейін құпия тапсырыс кодын сақтаңыз. FULL-кілт тек төлем расталғаннан кейін беріледі.'
  };
  $('notice').textContent = liveText[lang] || liveText.en;
}
$('check').disabled = !enabled;
$('check-license').disabled = !enabled;
$('buy').disabled = !(enabled && CHECKOUT_ENABLED);
const storageKey = 'anri-private-order';
let prepared;
const validOrder = value => /^anri-full-[0-9a-f]{32}$/.test(value);
const validCredential = value => /^[A-Za-z0-9_-]{43}$/.test(value);
const validKey = value => typeof value === 'string' && /^ANRI-[A-Z2-9]{5}(?:-[A-Z2-9]{5}){3}$/.test(value);
$('license-check').addEventListener('submit', async e => {
 e.preventDefault();
 if (!enabled) return;
 const key = $('license-key-check').value.trim().toUpperCase();
 const copy = statusCopy[lang] || statusCopy.en;
 if (!validKey(key)) { $('license-status').textContent = copy.invalid; return; }
 const button = $('check-license');
 button.disabled = true;
 $('license-status').textContent = copy.checking;
 try {
  const response = await fetch(API_ORIGIN + '/v1/license/check', {
   method:'POST', headers:{'Content-Type':'application/json'},
   body:JSON.stringify({license_key:key}), cache:'no-store',
   credentials:'omit', referrerPolicy:'no-referrer', redirect:'error'
  });
  if (!response.ok) throw new Error('Unavailable');
  const result = await response.json();
  if (!result.ok || !result.license) {
   $('license-status').textContent = copy.notFound;
   return;
  }
  const lic = result.license;
  const state = copy.states[lic.status] || copy.states.inactive;
  const product = lic.product === 'anri_audio_midi' ? 'ANRI AUDIO MIDI' : String(lic.product || '—');
  const edition = lic.edition === 'full' ? 'FULL' : String(lic.edition || '—');
  const expiry = lic.expires_at ? String(lic.expires_at) : copy.perpetual;
  $('license-status').textContent = [
   lic.active ? copy.active : copy.inactive,
   copy.status + ': ' + state,
   copy.product + ': ' + product + ' (' + edition + ')',
   copy.activations + ': ' + String(lic.active_activations) + ' / ' + String(lic.max_activations),
   copy.expires + ': ' + expiry
  ].join(String.fromCharCode(10));
 } catch {
  $('license-status').textContent = copy.unavailable;
 } finally {
  button.disabled = !enabled;
 }
});
try { const saved = JSON.parse(sessionStorage.getItem(storageKey)); if(saved && validOrder(saved.order_num) && validCredential(saved.claim_credential)){$('order').value=saved.order_num;$('credential').value=saved.claim_credential;} } catch {}
const extra = ({
 en:['Copy license key','License key copied.','Payment verification paused. Use Check order to retry.'],
 ru:['Скопировать ключ','Ключ скопирован.','Проверка оплаты приостановлена. Нажмите «Проверить заказ» для повтора.'],
 kk:['Кілтті көшіру','Кілт көшірілді.','Төлемді тексеру тоқтатылды. Қайталау үшін «Тексеру» түймесін басыңыз.']
})[lang] || ['Copy license key','License key copied.','Use Check order to retry.'];
const copyKey = document.createElement('button');
copyKey.id='copy-key';copyKey.type='button';copyKey.textContent=extra[0];copyKey.hidden=true;
$('key').after(copyKey);
let generation=0, timer, activeRequest;
function clearKey(){ $('key').textContent='';$('key').hidden=true;copyKey.hidden=true; }
function stopClaim(){ generation++;clearTimeout(timer);activeRequest?.abort();activeRequest=null;$('check').disabled=!enabled; }
function identity(){ return {order_num:$('order').value.trim(),claim_credential:$('credential').value.trim()}; }
function sameIdentity(a,b){return a.order_num===b.order_num && a.claim_credential===b.claim_credential;}
function validQuote(q){
 return q && validOrder(q.order_num) && validCredential(q.claim_credential) && q.currency==='KZT' &&
  // Fixed commercial KZT price approved 2026-10-29. Never submit an
  // incorrect quote, even if a proxy or deployment is misconfigured.
  Number.isSafeInteger(q.amount_minor) && q.amount_minor===1800000 &&
  q.merchant_form_action==='https://anriprod.proeducation.kz/' && q.method==='POST' && Array.isArray(q.fields) &&
  q.fields.length>0 && q.fields.length<=100 &&
  q.fields.every(f=>typeof f.name==='string' && typeof f.value==='string' &&
   /^(?:do|currency|order_id|customer_email|sys|urlSuccess|urlReturn|urlNotification|payments_limit|signature|products\[0\]\[(?:name|sku|price|quantity)\])$/.test(f.name) &&
   !f.value.includes(q.claim_credential)) &&
  new Set(q.fields.map(f=>f.name)).size===q.fields.length &&
  (() => {
   const f=new Map(q.fields.map(entry=>[entry.name,entry.value]));
   const price=String(Math.floor(q.amount_minor/100))+'.'+String(q.amount_minor%100).padStart(2,'0');
   const returnUrl=location.origin+location.pathname;
   return f.size===14 &&
    f.get('do')==='pay' && f.get('sys')==='anriaudio' &&
    f.get('order_id')===q.order_num && f.get('currency')==='kzt' &&
    f.get('customer_email')===$('email').value.trim() && f.get('payments_limit')==='1' &&
    f.get('urlSuccess')===returnUrl && f.get('urlReturn')===returnUrl &&
    /^https:\/\/[A-Za-z0-9.-]+\/v1\/payments\/proeducation\/webhook$/.test(f.get('urlNotification')||'') &&
    f.get('products[0][name]')==='ANRI AUDIO MIDI — Perpetual FULL License' &&
    f.get('products[0][sku]')==='ANRI_AUDIO_MIDI_MAC_AUV2' &&
    f.get('products[0][price]')===price &&
    f.get('products[0][quantity]')==='1' &&
    /^[a-f0-9]{64}$/.test(f.get('signature')||'');
  })();
}
async function post(path, data){
 const r=await fetch(API_ORIGIN+'/v1/checkout/proeducation/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});
 if(!r.ok) throw new Error('Order unavailable');
 return r.json();
}
$('create').addEventListener('submit', async e=>{
 e.preventDefault(); if(!(enabled && CHECKOUT_ENABLED)) return;
 $('buy').disabled=true;
 try {
  prepared=await post('create',{customer_email:$('email').value,locale:lang});
  if(!validQuote(prepared))throw new Error();
  stopClaim();clearKey();$('saved').checked=false;$('pay').disabled=true;
  const local={order_num:prepared.order_num,claim_credential:prepared.claim_credential};
  sessionStorage.setItem(storageKey,JSON.stringify(local));
  $('order').value=local.order_num;$('credential').value=local.claim_credential;
  $('order-reference').textContent=local.order_num;$('new-credential').value=local.claim_credential;
  $('amount').textContent=new Intl.NumberFormat(lang,{style:'currency',currency:'KZT'}).format(prepared.amount_minor/100);
  $('prepared').hidden=false;$('result').textContent=t[18];
 } catch {prepared=null;$('prepared').hidden=true;$('pay').disabled=true;$('result').textContent=t[16];$('buy').disabled=!(enabled&&CHECKOUT_ENABLED);}
});
$('copy').addEventListener('click',async()=>{
 const number=$('order-reference').textContent.trim();
 const credential=$('new-credential').value;
 if(!validOrder(number)||!validCredential(credential))return;
 // The buyer must retain BOTH factors. Never put this bearer credential in a
 // URL, email, analytics event or server log. Clipboard write is user initiated.
 const details='ANRI AUDIO MIDI\nOrder: '+number+'\nPrivate credential: '+credential;
 try{await navigator.clipboard.writeText(details);$('result').textContent=t[17];}
 catch{$('new-credential').focus();$('new-credential').select();}
});
$('saved').addEventListener('change',()=>{$('pay').disabled=!(prepared && validQuote(prepared) && $('saved').checked);});
$('pay').addEventListener('click',()=>{
 if(!enabled||!validQuote(prepared)||!$('saved').checked||!CHECKOUT_ENABLED) return;
 const form=document.createElement('form');form.method='POST';form.action=prepared.merchant_form_action;
 for(const field of prepared.fields){const input=document.createElement('input');input.type='hidden';input.name=field.name;input.value=field.value;form.append(input);}
 document.body.append(form);form.submit();
});
async function claimOrder(attempt=0, run, owner){
 if(!enabled || run!==generation || document.hidden || !sameIdentity(owner,identity()))return;
 $('check').disabled=true;
 const controller=new AbortController();activeRequest=controller;
 const timeout=setTimeout(()=>controller.abort(),15000);
 try {
  const response=await fetch(API_ORIGIN+'/v1/checkout/proeducation/claim',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(owner),
   cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:controller.signal
  });
  if(!response.ok)throw Error();
  const result=await response.json();
  if(run!==generation || !sameIdentity(owner,identity()))return;
  if(result.status==='fulfilled' && validKey(result.license_key)){
   $('result').textContent=t[15];$('key').textContent=result.license_key;$('key').hidden=false;copyKey.hidden=false;
  }else if(['pending','paid_hold'].includes(result.status) && result.license_key==null){
   $('result').textContent=attempt<23?t[14]:extra[2];
   if(attempt<23)timer=setTimeout(()=>claimOrder(attempt+1,run,owner),5000);
  }else{clearKey();$('result').textContent=t[16];}
 }catch{if(run===generation){clearKey();$('result').textContent=extra[2];}}
 finally{clearTimeout(timeout);if(activeRequest===controller)activeRequest=null;if(run===generation)$('check').disabled=!enabled;}
}
function startClaim(){
 stopClaim();clearKey();const owner=identity();
 if(enabled && validOrder(owner.order_num) && validCredential(owner.claim_credential))void claimOrder(0,generation,owner);
}
$('claim').addEventListener('submit',e=>{e.preventDefault();startClaim();});
for(const id of ['order','credential'])$(id).addEventListener('input',()=>{stopClaim();clearKey();});
copyKey.addEventListener('click',async()=>{if(!$('key').hidden && validKey($('key').textContent)){
 try{await navigator.clipboard.writeText($('key').textContent);$('result').textContent=extra[1];}
 catch{$('result').textContent=t[15];}
}});
$('forget').addEventListener('click',()=>{stopClaim();try{sessionStorage.removeItem(storageKey);}catch{}prepared=null;for(const id of ['credential','new-credential','order','license-key-check'])$(id).value='';clearKey();$('license-status').textContent='';$('prepared').hidden=true;$('result').textContent='';$('create').reset();$('saved').checked=false;$('pay').disabled=true;$('buy').disabled=!(enabled&&CHECKOUT_ENABLED);});
addEventListener('pagehide',()=>{stopClaim();clearKey();$('credential').value='';$('new-credential').value='';$('license-key-check').value='';});
addEventListener('pageshow',()=>{
 if(!$('credential').value){try{const s=JSON.parse(sessionStorage.getItem(storageKey));if(s && validOrder(s.order_num)&&validCredential(s.claim_credential)){$('order').value=s.order_num;$('credential').value=s.claim_credential;}}catch{}}
 startClaim();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopClaim();clearKey();}else startClaim();});
// pageshow starts authorized recovery using the saved credential, never the return query.

