import {API_ORIGIN, CHECKOUT_ENABLED} from './config.js';
// Never use provider return parameters as payment proof or credentials.
history.replaceState(null, '', location.pathname);
const $ = id => document.getElementById(id);
const lang = document.documentElement.lang;
const translations = {
 en: ['Your order','Checkout is closed. Secure order access will be enabled after verification.','Email (required; used for license recovery)','Create order','Save your order number and private credential before payment.','Copy credential','I saved my order number and private credential.','Continue to payment','Check order / recover key','Order number','Private order credential','Check order','Clear this browser session','Keep your credential private. If you lose the order number or credential, recover the license by email on the license status page. A return from the payment page does not confirm payment.','Payment has not been confirmed yet.','Your license key:','Order unavailable. Check your private credential or contact support.','Credential copied.','Credential ready. Save it before payment.'],
 ru: ['Ваш заказ','Покупка закрыта. Защищённый доступ к заказу будет включён после проверки.','Email (обязательно; для восстановления лицензии)','Создать заказ','До оплаты сохраните номер заказа и его секретный код.','Копировать код','Я сохранил номер заказа и секретный код.','Перейти к оплате','Проверить заказ / восстановить ключ','Номер заказа','Секретный код заказа','Проверить заказ','Очистить эту сессию браузера','Храните код в тайне. Если потеряете номер заказа или код, восстановите лицензию по email на странице проверки лицензии. Возврат со страницы оплаты не подтверждает платёж.','Оплата пока не подтверждена.','Ваш лицензионный ключ:','Заказ недоступен. Проверьте секретный код или обратитесь в поддержку.','Код скопирован.','Код готов. Сохраните его до оплаты.'],
 kk: ['Сіздің тапсырысыңыз','Сатып алу жабық. Тапсырысқа қауіпсіз қол жеткізу тексеруден кейін қосылады.','Email (міндетті; лицензияны қалпына келтіру үшін)','Тапсырыс жасау','Төлемге дейін тапсырыс нөмірі мен құпия кодын сақтаңыз.','Кодты көшіру','Тапсырыс нөмірі мен құпия кодын сақтадым.','Төлемге өту','Тапсырысты тексеру / кілтті қалпына келтіру','Тапсырыс нөмірі','Тапсырыстың құпия коды','Тексеру','Браузердің осы сессиясын тазалау','Құпия кодты сақтаңыз. Нөмірді немесе кодты жоғалтсаңыз, лицензияны тексеру бетіндегі email арқылы қалпына келтіріңіз. Төлем бетінен оралу төлемді растамайды.','Төлем әлі расталған жоқ.','Лицензиялық кілтіңіз:','Тапсырыс қолжетімсіз. Құпия кодты тексеріңіз немесе қолдау қызметіне хабарласыңыз.','Код көшірілді.','Код дайын. Төлемге дейін сақтаңыз.']
};
const t = translations[lang] || translations.en;
['heading','notice','email-label','buy','save-label','copy','saved-label','pay','recover-heading','order-label','credential-label','check','forget','privacy'].forEach((id,i)=>$(id).textContent=t[i]);
const enabled = API_ORIGIN === location.origin;
$('check').disabled = !enabled;
$('buy').disabled = !(enabled && CHECKOUT_ENABLED);
const storageKey = 'anri-private-order';
let prepared;
const validOrder = value => /^anri-full-[0-9a-f]{32}$/.test(value);
const validCredential = value => /^[A-Za-z0-9_-]{43}$/.test(value);
const validKey = value => typeof value === 'string' && /^ANRI-[A-Z2-9]{5}(?:-[A-Z2-9]{5}){3}$/.test(value);
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
  Number.isSafeInteger(q.amount_minor) && q.amount_minor>0 && q.amount_minor<=100000000 &&
  q.merchant_form_action==='https://anriprod.proeducation.kz/' && q.method==='POST' && Array.isArray(q.fields) &&
  q.fields.length>0 && q.fields.length<=100 &&
  q.fields.every(f=>typeof f.name==='string' && typeof f.value==='string' &&
   /^(?:do|currency|order_id|customer_email|sys|urlSuccess|urlReturn|urlNotification|payments_limit|signature|products\[0\]\[(?:name|sku|price|quantity)\])$/.test(f.name) &&
   !f.value.includes(q.claim_credential)) &&
  new Set(q.fields.map(f=>f.name)).size===q.fields.length &&
  q.fields.some(f=>f.name==='order_id'&&f.value===q.order_num) &&
  q.fields.some(f=>f.name==='currency'&&f.value==='kzt') &&
  q.fields.some(f=>f.name==='signature'&&/^[a-f0-9]{64}$/.test(f.value));
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
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('new-credential').value);$('result').textContent=t[17];}catch{$('new-credential').focus();$('new-credential').select();}});
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
$('forget').addEventListener('click',()=>{stopClaim();try{sessionStorage.removeItem(storageKey);}catch{}prepared=null;for(const id of ['credential','new-credential','order'])$(id).value='';clearKey();$('prepared').hidden=true;$('result').textContent='';$('create').reset();$('saved').checked=false;$('pay').disabled=true;$('buy').disabled=!(enabled&&CHECKOUT_ENABLED);});
addEventListener('pagehide',()=>{stopClaim();clearKey();$('credential').value='';$('new-credential').value='';});
addEventListener('pageshow',()=>{
 if(!$('credential').value){try{const s=JSON.parse(sessionStorage.getItem(storageKey));if(s && validOrder(s.order_num)&&validCredential(s.claim_credential)){$('order').value=s.order_num;$('credential').value=s.claim_credential;}}catch{}}
 startClaim();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopClaim();clearKey();}else startClaim();});
// pageshow starts authorized recovery using the saved credential, never the return query.

