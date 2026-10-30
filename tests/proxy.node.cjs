const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createServer,upstreamOrigin}=require('../server.cjs');
const route='/v1/checkout/proeducation/claim';
const headers={'Content-Type':'application/json',Origin:'https://anriaudio.com','Sec-Fetch-Site':'same-origin'};
async function site(t,options={}){const s=createServer(options);await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>s.close(r)));return 'http://127.0.0.1:'+s.address().port;}
test('official checkout pages are private and the ProEducation client gate is configured',async t=>{
 const base=await site(t);
 for(const p of ['/checkout/','/ru/checkout/','/kk/checkout/','/kaspi/','/checkout/config.js']){
  const r=await fetch(base+p);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.ok(r.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  if(p.endsWith('.js'))assert.match(await r.text(),/CHECKOUT_ENABLED = true/);
 }
 for(const p of [route,'/v1/checkout/proeducation/create']){const r=await fetch(base+p,{method:'POST',headers,body:'{}'});assert.equal(r.status,503);}
});

test('localized license status pages are public, no-store and linked from checkout',async t=>{
 const base=await site(t);
 for(const p of ['/license/','/ru/license/','/kk/license/','/license/status.js','/license/status.css','/ru/checkout/']){
  const r=await fetch(base+p);assert.equal(r.status,200,p);
  assert.equal(r.headers.get('cache-control'),'no-store',p);
  assert.equal(r.headers.get('referrer-policy'),'no-referrer',p);
  assert.ok(r.headers.get('content-security-policy')?.includes("connect-src 'self'"),p);
  if(p.endsWith('/license/')){
   const html=await r.text();
   assert.ok(html.includes('id="recovery-request-form"'),p);
   assert.ok(html.includes('id="recovery-verify-form"'),p);
   assert.ok(html.includes('type="email" required'),p);
  }
 }
 for(const [p,link] of [['/','href="/license/">Check license'],['/ru/','href="/ru/license/">Проверить лицензию'],['/kk/','href="/kk/license/">Лицензияны тексеру']]){
  const html=await (await fetch(base+p)).text();assert.ok(html.includes(link),p);
 }
 const ru=await (await fetch(base+'/ru/checkout/')).text();
 assert.ok(ru.includes('href="/ru/license/">Проверить статус лицензии'));
});

test('license check uses only its dedicated upstream; commerce remains closed',async t=>{
 let call;
 const base=await site(t,{upstream:'',licenseUpstream:'https://anri-cloud.onrender.com',salesEnabled:false,fetcher:async(url,opts)=>{
  call={url,opts};return new Response(JSON.stringify({ok:false,license:null}),{status:200,headers:{'Content-Type':'application/json'}});
 }});
 const key='ANRI-ABCDE-FGHJK-LMNPQ-RSTUV';
 const r=await fetch(base+'/v1/license/check',{method:'POST',headers,body:JSON.stringify({license_key:key})});
 assert.equal(r.status,200);assert.equal(call.url,'https://anri-cloud.onrender.com/v1/license/check');
 assert.equal(call.opts.method,'POST');assert.deepEqual(call.opts.headers,{'Content-Type':'application/json'});
 assert.equal(call.opts.redirect,'error');assert.equal(call.opts.body.toString(),JSON.stringify({license_key:key}));
 for(const p of ['/v1/checkout/proeducation/create',route]){
  const closed=await fetch(base+p,{method:'POST',headers,body:'{}'});assert.equal(closed.status,503,p);
 }
});

test('license check does not fall back to the commerce upstream',async t=>{
 let calls=0;
 const base=await site(t,{upstream:'https://commerce.example.invalid',licenseUpstream:'',salesEnabled:false,fetcher:async()=>{calls++;throw Error('must not call');}});
 const r=await fetch(base+'/v1/license/check',{method:'POST',headers,body:JSON.stringify({license_key:'ANRI-ABCDE-FGHJK-LMNPQ-RSTUV'})});
 assert.equal(r.status,503);assert.equal(calls,0);
});

test('email recovery endpoints use the dedicated license upstream, not commerce',async t=>{
 const calls=[];
 const base=await site(t,{
  upstream:'https://commerce.example.invalid',
  licenseUpstream:'https://license.example.invalid',
  salesEnabled:false,
  fetcher:async(url,opts)=>{
   calls.push({url,opts});
   return new Response(JSON.stringify({ok:true,message:'If a matching purchase exists, a 6-digit verification code has been sent.',expires_in_seconds:600}),{headers:{'Content-Type':'application/json'}});
  }
 });
 for(const [route,data] of [
  ['/v1/license/recovery/request',{email:'buyer@example.invalid'}],
  ['/v1/license/recovery/verify',{email:'buyer@example.invalid',code:'123456'}]
 ]){
  const r=await fetch(base+route,{method:'POST',headers,body:JSON.stringify(data)});
  assert.equal(r.status,200,route);
  assert.equal(r.headers.get('cache-control'),'no-store');
  assert.equal(r.headers.get('referrer-policy'),'no-referrer');
 }
 assert.equal(calls.length,2);
 assert.deepEqual(calls.map(c=>c.url),[
  'https://license.example.invalid/v1/license/recovery/request',
  'https://license.example.invalid/v1/license/recovery/verify'
 ]);
 assert.deepEqual(JSON.parse(calls[0].opts.body),{email:'buyer@example.invalid'});
 assert.deepEqual(JSON.parse(calls[1].opts.body),{email:'buyer@example.invalid',code:'123456'});
 assert.ok(calls.every(c=>JSON.stringify(c.opts.headers)==='{"Content-Type":"application/json"}'));
});
test('proxy strips ambient credentials and preserves private POST body',async t=>{
 let call;const secret='c'.repeat(43);
 const base=await site(t,{upstream:'https://issuer.example.invalid',fetcher:async(url,opts)=>{call={url,opts};return new Response(JSON.stringify({status:'pending',license_key:null}));}});
 const data={order_num:'anri-full-'+'a'.repeat(32),claim_credential:secret};
 const r=await fetch(base+route,{method:'POST',headers:{...headers,Cookie:'session=private',Authorization:'Bearer not-forwarded'},body:JSON.stringify(data)});
 assert.equal(r.status,200);assert.equal(call.url,'https://issuer.example.invalid'+route);assert.deepEqual(JSON.parse(call.opts.body),data);assert.deepEqual(call.opts.headers,{'Content-Type':'application/json'});assert.equal(call.opts.redirect,'error');assert.equal(r.headers.get('cache-control'),'no-store');
});
test('proxy denies alternate paths, origin, query, method and malformed body',async t=>{
 let calls=0;const base=await site(t,{upstream:'https://issuer.example.invalid',fetcher:async()=>{calls++;throw Error();}});
 for(const [p,opts,status] of [
  ['/v1/payments/proeducation/webhook',{method:'POST',headers,body:'{}'},404],
  [route,{method:'GET'},405],
  [route+'?secret=private',{method:'POST',headers,body:'{}'},400],
  [route,{method:'POST',headers:{...headers,Origin:'https://attacker.invalid'},body:'{}'},403],
  [route,{method:'POST',headers:{...headers,'Sec-Fetch-Site':'cross-site'},body:'{}'},403],
  [route,{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body:'{}'},415],
  [route,{method:'POST',headers,body:'not-json'},400],
  [route,{method:'POST',headers,body:'x'.repeat(4097)},400],
  ['/v1/checkout/proeducation/create',{method:'POST',headers,body:'{}'},503],\n  ['/v1/kaspi/orders',{method:'POST',headers,body:'{}'},503]
 ]){const r=await fetch(base+p,opts);assert.equal(r.status,status,p);assert.equal(r.headers.get('cache-control'),'no-store');}
 assert.equal(calls,0);
});

test('Kaspi checkout proxy signs the exact order body server-side',async t=>{
 let call;
 const secret='a'.repeat(64);
 const base=await site(t,{
  upstream:'https://anri-cloud.example.invalid',
  kaspiSalesEnabled:true,
  kaspiGatewaySecret:secret,
  fetcher:async(url,opts)=>{call={url,opts};return new Response(JSON.stringify({order_id:'KSP-'+'A'.repeat(32),amount_kzt:5000,currency:'KZT',payment_url:'https://pay.kaspi.kz/pay/zxqekc5w'}));}
 });
 const data={customer_email:'buyer@example.invalid',idempotency_key:'kaspi-order-idem-00000001'};
 const body=JSON.stringify(data);
 const r=await fetch(base+'/v1/kaspi/orders',{method:'POST',headers,body});
 assert.equal(r.status,200);
 assert.equal(call.url,'https://anri-cloud.example.invalid/v1/kaspi/orders');
 assert.equal(call.opts.method,'POST');
 assert.equal(call.opts.body.toString(),body);
 assert.equal(call.opts.redirect,'error');
 assert.equal(call.opts.headers['Content-Type'],'application/json');
 const ts=call.opts.headers['X-Anri-Gateway-Timestamp'];
 const nonce=call.opts.headers['X-Anri-Gateway-Nonce'];
 const signature=call.opts.headers['X-Anri-Gateway-Signature'];
 assert.match(ts,/^[0-9]{10,11}$/);
 assert.match(nonce,/^[a-f0-9]{32}$/);
 const canonical=Buffer.concat([
  Buffer.from('POST\\n'),Buffer.from('/v1/kaspi/orders'),Buffer.from('\\n\\n'+ts+'\\n'+nonce+'\\n'),
  Buffer.from(require('node:crypto').createHash('sha256').update(Buffer.from(body)).digest('hex'))
 ]);
 const expected=require('node:crypto').createHmac('sha256',secret).update(canonical).digest('hex');
 assert.equal(signature,expected);
 assert.equal(Object.keys(call.opts.headers).length,4);
 assert.equal(r.headers.get('cache-control'),'no-store');
});

test('Kaspi checkout proxy refuses missing gateway secret even when the site gate is open',async t=>{
 let calls=0;
 const base=await site(t,{upstream:'https://anri-cloud.example.invalid',kaspiSalesEnabled:true,kaspiGatewaySecret:'',fetcher:async()=>{calls++;throw Error('must not call');}});
 const r=await fetch(base+'/v1/kaspi/orders',{method:'POST',headers,body:'{}'});
 assert.equal(r.status,503);
 assert.equal(calls,0);
});
\ntest('upstream failures never expose error bodies, cookies or location',async t=>{
 for(const reply of [()=>new Response('private upstream data',{status:500,headers:{'Set-Cookie':'secret','Location':'https://other.invalid'}}),()=>new Response('x'.repeat(32769)),()=>{throw Error('secret');}]){
  const base=await site(t,{upstream:'https://issuer.example.invalid',fetcher:async()=>reply()});
  const r=await fetch(base+route,{method:'POST',headers,body:'{}'});assert.equal(r.status,502);assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('location'),null);assert.equal(await r.text(),'{"detail":"Order unavailable"}');
 }
});
test('source files and traversal stay private; existing homepage bytes are preserved',async t=>{
 const base=await site(t);
 for(const p of ['/server.cjs','/Dockerfile','/package.json','/.git/config','/tests/checkout.spec.js','/%2e%2e%5cserver.cjs'])assert.equal((await fetch(base+p)).status,404,p);
 for(const p of ['/','/ru/','/kk/','/terms/','/support-development/']){
  const r=await fetch(base+p);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),await fs.readFile(path.join(__dirname,'..',p,'index.html')));
 }
});
test('upstream cannot be a URL credential, redirect target, HTTP or official site loop',()=>{
 assert.equal(upstreamOrigin(),null);
 for(const p of ['http://example.invalid','https://user:secret@example.invalid','https://example.invalid/private','https://example.invalid/?x=1','https://anriaudio.com'])assert.throws(()=>upstreamOrigin(p));
});
