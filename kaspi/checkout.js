const $ = id => document.getElementById(id);
const lang = new URLSearchParams(location.search).get('lang');
const locale = ['ru','kk','en'].includes(lang) ? lang : 'ru';
document.documentElement.lang = locale;
const copy = {
 ru: {
  heading:'Оплата через Kaspi Pay',
  lead:'ANRI AUDIO MIDI для Logic Pro. Бессрочная FULL-лицензия — 5 000 ₸, до двух активаций.',
  warning:'Платёжная ссылка не фиксирует сумму автоматически. В Kaspi.kz нужно вручную ввести ровно 5 000 ₸ и указать номер заказа в сообщении к платежу.',
  email:'Email для получения и восстановления лицензии',
  create:'Создать заказ на 5 000 ₸',
  order:'Номер заказа',
  copy:'Скопировать номер заказа',
  copied:'Номер заказа скопирован.',
  pay:'Открыть Kaspi Pay',
  note:'После оплаты ANRI AUDIO вручную сверяет поступление в собственном Kaspi POS → История. Скриншот, сообщение покупателя или возврат на сайт не подтверждают оплату. После проверки ANRI Cloud создаёт FULL-ключ; письмо отправляется на email заказа, если почтовая доставка настроена.',
  support:'Поддержка ANRI AUDIO',
  amount:'К оплате: 5 000 ₸',
  instructions:'В Kaspi.kz проверь получателя ИП «Анрипрод», введи ровно 5 000 ₸ и вставь номер заказа в сообщение к платежу. Не оплачивай, если получатель или сумма отличаются.',
  error:'Не удалось создать заказ. Проверь подключение и попробуй ещё раз. Оплата не инициирована.',
  closed:'Kaspi Pay пока настраивается. Не оплачивай по ссылке напрямую — сначала нужно создать заказ ANRI.'
 },
 kk: {
  heading:'Kaspi Pay арқылы төлеу',
  lead:'Logic Pro үшін ANRI AUDIO MIDI. Мерзімсіз FULL лицензия — 5 000 ₸, екі құрылғыға дейін.',
  warning:'Төлем сілтемесі соманы автоматты түрде бекітпейді. Kaspi.kz ішінде дәл 5 000 ₸ енгізіп, төлем хабарламасына тапсырыс нөмірін жазу керек.',
  email:'Лицензияны алу және қалпына келтіру үшін email',
  create:'5 000 ₸ сомасына тапсырыс жасау',
  order:'Тапсырыс нөмірі',
  copy:'Тапсырыс нөмірін көшіру',
  copied:'Тапсырыс нөмірі көшірілді.',
  pay:'Kaspi Pay ашу',
  note:'Төлемнен кейін ANRI AUDIO түсімді өзінің Kaspi POS → Тарих бөлімінде қолмен тексереді. Скриншот немесе сайтқа қайта оралу төлемді растамайды. Тексеруден кейін ANRI Cloud FULL кілтін жасайды; email жіберу пошта қызметі бапталған жағдайда орындалады.',
  support:'ANRI AUDIO қолдау қызметі',
  amount:'Төлем сомасы: 5 000 ₸',
  instructions:'Kaspi.kz ішінде алушы «Анрипрод» ЖК екенін тексеріп, дәл 5 000 ₸ енгізіп, тапсырыс нөмірін төлем хабарламасына қой. Алушы немесе сома сәйкес келмесе, төлем жасама.',
  error:'Тапсырыс жасау мүмкін болмады. Байланысты тексеріп, қайта көр. Төлем басталған жоқ.',
  closed:'Kaspi Pay төлемі әлі бапталып жатыр. ANRI тапсырысын жасамай тұрып тікелей төлем жасамаңыз.'
 },
 en: {
  heading:'Pay with Kaspi Pay',
  lead:'ANRI AUDIO MIDI for Logic Pro. Perpetual FULL license — 5,000 KZT, up to two activations.',
  warning:'The Kaspi payment link does not lock the amount. Enter exactly 5,000 KZT in Kaspi.kz and include the order ID in the payment message.',
  email:'Email for license delivery and recovery',
  create:'Create 5,000 KZT order',
  order:'Order ID',
  copy:'Copy order ID',
  copied:'Order ID copied.',
  pay:'Open Kaspi Pay',
  note:'After payment, ANRI AUDIO manually verifies the incoming transaction in its own Kaspi POS → History. A screenshot, buyer message or return to the website is not proof of payment. ANRI Cloud creates the FULL key after verification; email delivery depends on the production mail configuration.',
  support:'ANRI AUDIO support',
  amount:'Amount due: 5,000 KZT',
  instructions:'In Kaspi.kz, verify the recipient is IP Anriprod, enter exactly 5,000 KZT and paste the order ID into the payment message. Do not pay if the recipient or amount differs.',
  error:'Could not create the order. Check your connection and try again. No payment was initiated.',
  closed:'Kaspi Pay checkout is still being configured. Do not pay directly from the link; create an ANRI order first.'
 }
}[locale];
for (const [id,key] of [['heading','heading'],['lead','lead'],['warning','warning'],['email-label','email'],['create','create'],['order-label','order'],['copy-order','copy'],['pay-link','pay'],['manual-note','note'],['support','support']]) $(id).textContent=copy[key];
const storedKey='anri-kaspi-idempotency-'+locale;
let idempotency='';
let idempotencyEmail='';
try {
 const saved=JSON.parse(sessionStorage.getItem(storedKey)||'null');
 if(saved&&typeof saved.key==='string'&&typeof saved.email==='string'&&/^[A-Za-z0-9._:-]{16,128}$/.test(saved.key)){
  idempotency=saved.key;idempotencyEmail=saved.email;
 }
} catch {}
function newIdempotency(email){
 idempotency=crypto.randomUUID().replaceAll('-','');
 idempotencyEmail=email;
 try{sessionStorage.setItem(storedKey,JSON.stringify({key:idempotency,email}));}catch{}
}
let order=null;
$('create').disabled=true;
$('result').textContent=copy.closed;
async function checkConfig(){
 try{
  const response=await fetch('/v1/kaspi/config',{
   method:'GET',headers:{'Accept':'application/json'},
   cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'
  });
  if(!response.ok)throw Error('Kaspi checkout disabled');
  const config=await response.json();
  if(config.currency!=='KZT'||config.amount_kzt!==5000||
     config.payment_url!=='https://pay.kaspi.kz/pay/zxqekc5w'||
     config.manual_pos_verification!==true)throw Error('Unexpected Kaspi configuration');
  $('create').disabled=false;
  $('result').textContent='';
 }catch{
  $('create').disabled=true;
  $('result').textContent=copy.closed;
 }
}
void checkConfig();
function showOrder(q){
 if(!q||!/^KSP-[A-F0-9]{32}$/.test(q.order_id)||q.amount_kzt!==5000||q.currency!=='KZT'||q.payment_url!=='https://pay.kaspi.kz/pay/zxqekc5w')throw Error('Invalid order response');
 order=q;
 $('order-amount').textContent=copy.amount;
 $('order-id').textContent=q.order_id;
 $('pay-link').href=q.payment_url;
 $('pay-instructions').textContent=copy.instructions;
 $('prepared').hidden=false;
 $('order-form').hidden=true;
 $('result').textContent='';
}
$('order-form').addEventListener('submit',async e=>{
 e.preventDefault();
 if($('create').disabled||!$('email').reportValidity())return;
 $('create').disabled=true;
 $('result').textContent='';
 try{
  const email=$('email').value.trim().toLowerCase();
  if(!idempotency||idempotencyEmail!==email)newIdempotency(email);
  const response=await fetch('/v1/kaspi/orders',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({customer_email:email,idempotency_key:idempotency}),
   cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'
  });
  if(!response.ok)throw Error('order');
  showOrder(await response.json());
 }catch{
  $('result').textContent=copy.error;
  $('create').disabled=false;
 }
});
$('copy-order').addEventListener('click',async()=>{
 if(!order)return;
 try{await navigator.clipboard.writeText(order.order_id);$('result').textContent=copy.copied;}
 catch{$('result').textContent=order.order_id;}
});
