import {API_ORIGIN, CHECKOUT_ENABLED} from './config.js';
// Never use provider return parameters as payment proof or credentials.
history.replaceState(null, '', location.pathname);
const $ = id => document.getElementById(id);
const lang = document.documentElement.lang;
const translations = {
 en: ['Your order','Checkout is closed. Secure order access will be enabled after verification.','Email','Create order','Save your order number and private credential before payment.','Copy credential','I saved my order number and private credential.','Continue to payment','Check order / recover key','Order number','Private order credential','Check order','Clear this browser session','Keep your credential private. It restores the same key. A return from the payment page does not confirm payment.','Payment has not been confirmed yet.','Your license key:','Order unavailable. Check your private credential or contact support.','Credential copied.','Credential ready. Save it before payment.'],
 ru: ['Ваш заказ','Покупка закрыта. Защищённый доступ к заказу будет включён после проверки.','Email','Создать заказ','До оплаты сохраните номер заказа и его секретный код.','Копировать код','Я сохранил номер заказа и секретный код.','Перейти к оплате','Проверить заказ / восстановить ключ','Номер заказа','Секретный код заказа','Проверить заказ','Очистить эту сессию браузера','Храните код в тайне. Он восстанавливает тот же ключ. Возврат со страницы оплаты не подтверждает платёж.','Оплата пока не подтверждена.','Ваш лицензионный ключ:','Заказ недоступен. Проверьте секретный код или обратитесь в поддержку.','Код скопирован.','Код готов. Сохраните его до оплаты.'],
 kk: ['Сіздің тапсырысыңыз','Сатып алу жабық. Тапсырысқа қауіпсіз қол жеткізу тексеруден кейін қосылады.','Email','Тапсырыс жасау','Төлемге дейін тапсырыс нөмірі мен құпия кодын сақтаңыз.','Кодты көшіру','Тапсырыс нөмірі мен құпия кодын сақтадым.','Төлемге өту','Тапсырысты тексеру / кілтті қалпына келтіру','Тапсырыс нөмірі','Тапсырыстың құпия коды','Тексеру','Браузердің осы сессиясын тазалау','Кодты құпия сақтаңыз. Ол сол кілтті қалпына келтіреді. Төлем бетінен оралу төлемді растамайды.','Төлем әлі расталған жоқ.','Лицензиялық кілтіңіз:','Тапсырыс қолжетімсіз. Құпия кодты тексеріңіз немесе қолдау қызметіне хабарласыңыз.','Код көшірілді.','Код дайын. Төлемге дейін сақтаңыз.']
};
const t = translations[lang] || translations.en;
['heading','notice','email-label','buy','save-label','copy','saved-label','pay','recover-heading','order-label','credential-label','check','forget','privacy'].forEach((id,i)=>$(id).textContent=t[i]);
const enabled = API_ORIGIN === location.origin;
$('check').disabled = !enabled;
$('buy').disabled = !(enabled && CHECKOUT_ENABLED);
$('notice').textContent = ({en:'SYNTHETIC STAGING — no real payments or email. Use buyer@example.invalid.',ru:'СИНТЕТИЧЕСКИЙ STAGING — без реальных платежей и писем. Используйте buyer@example.invalid.',kk:'СИНТЕТИКАЛЫҚ STAGING — нақты төлемдер мен хаттар жоқ. buyer@example.invalid қолданыңыз.'})[lang] || 'SYNTHETIC ONLY';
$('email').placeholder='buyer@example.invalid';
$('pay').hidden=true;
const storageKey = 'anri-private-order';
let prepared;
try { const saved = JSON.parse(sessionStorage.getItem(storageKey)); if(saved){$('order').value=saved.order_num;$('credential').value=saved.claim_credential;} } catch {}
async function post(path, data){
 const r=await fetch(API_ORIGIN+'/v1/checkout/proeducation/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});
 if(!r.ok) throw new Error('Order unavailable');
 return r.json();
}
$('create').addEventListener('submit', async e=>{
 e.preventDefault(); if(!(enabled && CHECKOUT_ENABLED)) return;
 $('buy').disabled=true;
 try {
  prepared=await post('create',{customer_email:$('email').value});
  if(!/^anri-full-[0-9a-f]{32}$/.test(prepared.order_num)||!/^[A-Za-z0-9_-]{43}$/.test(prepared.claim_credential))throw new Error();
  const local={order_num:prepared.order_num,claim_credential:prepared.claim_credential};
  sessionStorage.setItem(storageKey,JSON.stringify(local));
  $('order').value=local.order_num;$('credential').value=local.claim_credential;
  $('order-reference').textContent=local.order_num;$('new-credential').value=local.claim_credential;
  $('amount').textContent=new Intl.NumberFormat(lang,{style:'currency',currency:'KZT'}).format(prepared.amount_minor/100);
  $('prepared').hidden=false;$('result').textContent=t[18];
 } catch {prepared=null;$('result').textContent=t[16];$('buy').disabled=false;}
});
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('new-credential').value);$('result').textContent=t[17];}catch{$('new-credential').focus();$('new-credential').select();}});
$('saved').addEventListener('change',()=>{$('pay').disabled=!$('saved').checked;});
$('claim').addEventListener('submit',async e=>{
 e.preventDefault(); if(!enabled) return;
 $('key').hidden=true;$('key').textContent='';$('check').disabled=true;
 try {const r=await post('claim',{order_num:$('order').value,claim_credential:$('credential').value});
  if(r.status==='fulfilled'&&typeof r.license_key==='string'){$('result').textContent=t[15];$('key').textContent=r.license_key;$('key').hidden=false;}else{$('result').textContent=t[14];}
 }catch{$('result').textContent=t[16];}finally{$('check').disabled=false;}
});
$('forget').addEventListener('click',()=>{sessionStorage.removeItem(storageKey);prepared=null;for(const id of ['credential','new-credential','order'])$(id).value='';$('key').textContent='';$('key').hidden=true;$('prepared').hidden=true;$('result').textContent='';$('create').reset();$('saved').checked=false;$('pay').disabled=true;$('buy').disabled=!(enabled&&CHECKOUT_ENABLED);});
addEventListener('pagehide',()=>{$('key').textContent='';$('key').hidden=true;});
