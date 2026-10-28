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
const expected='https://anri-cloud-api-staging-staging.up.railway.app';
const enabled=PILOT_ENABLED && API_ORIGIN===expected;
$('createForm').hidden=true;
$('prepared').hidden=true;
$('checkButton').disabled=!enabled;
$('credential').minLength=64;$('credential').maxLength=64;
$('intro').textContent={
 en:'Enter your private order number and code. The owner confirms the merchant statement before your FULL key is available.',
 ru:'Введите номер заказа и секретный код. FULL-ключ станет доступен после ручной сверки поступления владельцем.',
 kk:'Жеке тапсырыс нөмірі мен құпия кодты енгізіңіз. FULL кілті иесі төлемді тексергеннен кейін беріледі.'
}[lang];
$('claimForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!enabled)return;
 $('key').hidden=true;$('key').textContent='';$('checkButton').disabled=true;
 try{
  const order=$('order').value.trim(), secret=$('credential').value.trim();
  if(!/^ANRI100-[A-Z0-9]{16,40}$/.test(order)||! /^[0-9a-f]{64}$/.test(secret))throw Error();
  const r=await fetch(expected+'/v1/seller-pilot/claim',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({order_num:order,claim_secret:secret}),
   cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'
  });
  if(!r.ok)throw Error();
  const data=await r.json(), key=data.license?.key;
  if(data.order_num!==order||data.license?.edition!=='full'||
     !/^ANRI-[A-Z2-9]{5}(?:-[A-Z2-9]{5}){3}$/.test(key))throw Error();
  $('key').textContent=key;$('key').hidden=false;$('message').textContent=strings.key;
 }catch{$('message').textContent=strings.error;}
 finally{$('checkButton').disabled=!enabled;}
});
$('clearButton').addEventListener('click',()=>{
 $('order').value='';$('credential').value='';$('key').textContent='';
 $('key').hidden=true;$('message').textContent='';
});
addEventListener('pagehide',()=>{
 $('credential').value='';$('key').textContent='';$('key').hidden=true;
});
