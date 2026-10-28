import { API_ORIGIN, PILOT_ENABLED } from './config.js';
// Browser return values NEVER prove payment and NEVER carry credentials.
if (location.search || location.hash) history.replaceState(null, '', location.pathname);
const $ = id => document.getElementById(id);
const lang = ['ru','kk'].includes(document.documentElement.lang) ? document.documentElement.lang : 'en';
const strings = {
 en: {title:'Private payment test · 100 ₸',intro:'One real payment test. The ProEducation page will ask for a phone number. Email is not needed. Your key appears only after verified payment.',invite:'Private invite code',create:'Create the only test order',order:'Order number',secret:'Private order code',save:'Copy and save both values before paying.',copy:'Copy private code',saved:'I saved my order number and private code',pay:'Pay 100 ₸ with ProEducation',check:'Check payment and get FULL key',clear:'Clear this browser session',pending:'Payment is not yet verified. You can check again later.',key:'Your ANRI AUDIO MIDI FULL license:',error:'Order unavailable or pilot closed. Check your private code.',created:'Private order created. Save both values before paying.',privacy:'A return to this page never confirms payment. Do not share your private code.'},
 ru: {title:'Закрытый платёжный тест · 100 ₸',intro:'Один настоящий пробный платёж. На странице ProEducation потребуется телефон; email не нужен. Ключ появится только после подтверждённой оплаты.',invite:'Код доступа к пилоту',create:'Создать единственный тестовый заказ',order:'Номер заказа',secret:'Секретный код заказа',save:'Сохраните номер заказа и секретный код до оплаты.',copy:'Копировать секретный код',saved:'Я сохранил номер заказа и секретный код',pay:'Оплатить 100 ₸ через ProEducation',check:'Проверить оплату и получить FULL-ключ',clear:'Очистить сессию браузера',pending:'Оплата ещё не подтверждена. Можно повторить проверку позже.',key:'Ваша FULL-лицензия ANRI AUDIO MIDI:',error:'Заказ недоступен или пилот закрыт. Проверьте секретный код.',created:'Заказ создан. Сохраните оба значения до оплаты.',privacy:'Возврат на эту страницу не подтверждает оплату. Никому не сообщайте секретный код.'},
 kk: {title:'Жабық төлем сынағы · 100 ₸',intro:'Бір нақты сынақ төлемі. ProEducation парағында телефон нөмірі қажет, email міндетті емес. Кілт тек төлем расталғаннан кейін беріледі.',invite:'Жеке шақыру коды',create:'Бір сынақ тапсырысын жасау',order:'Тапсырыс нөмірі',secret:'Тапсырыстың құпия коды',save:'Төлеу алдында нөмір мен құпия кодты сақтаңыз.',copy:'Құпия кодты көшіру',saved:'Нөмір мен құпия кодты сақтадым',pay:'ProEducation арқылы 100 ₸ төлеу',check:'Төлемді тексеру және FULL кілтін алу',clear:'Браузер сеансын тазарту',pending:'Төлем әлі расталмаған. Кейін қайта тексеріңіз.',key:'ANRI AUDIO MIDI FULL лицензияңыз:',error:'Тапсырыс қолжетімсіз немесе сынақ жабық. Құпия кодты тексеріңіз.',created:'Тапсырыс жасалды. Төлеу алдында екі мәнді де сақтаңыз.',privacy:'Осы параққа қайту төлемді растамайды. Құпия кодты ешкімге бермеңіз.'}
}[lang];
for(const [id,key] of Object.entries({title:'title',intro:'intro',labelInvite:'invite',createButton:'create',labelOrder:'order',labelSecret:'secret',saveHint:'save',copyButton:'copy',labelSaved:'saved',payButton:'pay',checkButton:'check',clearButton:'clear',privacy:'privacy'})) $(id).textContent=strings[key];
const enabled = PILOT_ENABLED && API_ORIGIN === location.origin;
$('createButton').disabled=!enabled;
$('checkButton').disabled=!enabled;
const store='anri-private-micro-100kzt';
let merchantFields=null;
try {
 const x=JSON.parse(sessionStorage.getItem(store));
 if(x && /^anri-micro-[0-9a-f]{32}$/.test(x.order_num) && /^[A-Za-z0-9_-]{43}$/.test(x.claim_credential)){
   $('order').value=x.order_num;
   $('credential').value=x.claim_credential;
 }
} catch {}
async function post(action,payload){
 const r=await fetch(API_ORIGIN+'/v1/checkout/proeducation/'+action,{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload),cache:'no-store',credentials:'omit',
  referrerPolicy:'no-referrer',redirect:'error'
 });
 if(!r.ok)throw new Error('Request unavailable');
 return r.json();
}
$('createForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!enabled)return;
 $('createButton').disabled=true;
 try{
  const result=await post('micro/create',{invite_code:$('invite').value,locale:lang});
  if(!/^anri-micro-[0-9a-f]{32}$/.test(result.order_num) ||
     !/^[A-Za-z0-9_-]{43}$/.test(result.claim_credential) ||
     result.amount_minor!==10000 || result.currency!=='KZT' ||
     result.method!=='POST' || result.merchant_form_action!=='https://anriprod.proeducation.kz/' ||
     !Array.isArray(result.fields)) throw new Error('Invalid fixed pilot');
  const stored={order_num:result.order_num,claim_credential:result.claim_credential};
  sessionStorage.setItem(store,JSON.stringify(stored));
  $('order').value=result.order_num;
  $('credential').value=result.claim_credential;
  $('invite').value='';
  $('preparedOrder').textContent=result.order_num;
  $('preparedSecret').value=result.claim_credential;
  merchantFields=result.fields;
  $('prepared').hidden=false;
  $('message').textContent=strings.created;
 }catch{
  $('message').textContent=strings.error;
  $('createButton').disabled=false;
 }finally{$('invite').value='';}
});
$('copyButton').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText($('preparedSecret').value);}
 catch{$('preparedSecret').focus();$('preparedSecret').select();}
});
$('saved').addEventListener('change',()=>{$('payButton').disabled=!(merchantFields && $('saved').checked);});
$('payButton').addEventListener('click',()=>{
 if(!enabled||!$('saved').checked||!merchantFields)return;
 const names=new Set();
 const form=document.createElement('form');
 form.method='POST';form.action='https://anriprod.proeducation.kz/';
 for(const item of merchantFields){
  if(typeof item.name!=='string'||typeof item.value!=='string' ||
     item.name==='claim_credential'||item.name==='invite_code'||names.has(item.name))return;
  names.add(item.name);
  const input=document.createElement('input');input.type='hidden';
  input.name=item.name;input.value=item.value;form.append(input);
 }
 if(!names.has('order_id')||!names.has('signature')||!names.has('currency'))return;
 document.body.append(form);form.submit();
});
$('claimForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!enabled)return;
 $('key').textContent='';$('key').hidden=true;$('checkButton').disabled=true;
 try{
  const r=await post('claim',{order_num:$('order').value,claim_credential:$('credential').value});
  if(r.status==='fulfilled' && /^ANRI-[A-Z2-9]{5}(?:-[A-Z2-9]{5}){3}$/.test(r.license_key)){
   $('message').textContent=strings.key;
   $('key').textContent=r.license_key;$('key').hidden=false;
  }else{$('message').textContent=strings.pending;}
 }catch{$('message').textContent=strings.error;}
 finally{$('checkButton').disabled=false;}
});
$('clearButton').addEventListener('click',()=>{
 sessionStorage.removeItem(store);merchantFields=null;
 $('invite').value='';$('order').value='';$('credential').value='';
 $('preparedSecret').value='';$('preparedOrder').textContent='';
 $('prepared').hidden=true;$('key').hidden=true;$('key').textContent='';
 $('saved').checked=false;$('payButton').disabled=true;$('message').textContent='';
 $('createButton').disabled=!enabled;
});
addEventListener('pagehide',()=>{$('key').textContent='';$('key').hidden=true;});
