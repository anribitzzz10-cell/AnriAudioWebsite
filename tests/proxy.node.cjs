const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createServer,upstreamOrigin}=require('../server.cjs');
const route='/v1/checkout/proeducation/claim';
const headers={'Content-Type':'application/json',Origin:'https://anriaudio.com','Sec-Fetch-Site':'same-origin'};
async function site(t,options={}){const s=createServer(options);await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>s.close(r)));return 'http://127.0.0.1:'+s.address().port;}
test('official checkout is served closed in all languages with private headers',async t=>{
 const base=await site(t);
 for(const p of ['/checkout/','/ru/checkout/','/kk/checkout/','/checkout/config.js']){
  const r=await fetch(base+p);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.ok(r.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  if(p.endsWith('.js'))assert.match(await r.text(),/CHECKOUT_ENABLED = false/);
 }
 for(const p of [route,'/v1/checkout/proeducation/create']){const r=await fetch(base+p,{method:'POST',headers,body:'{}'});assert.equal(r.status,503);}
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
  ['/v1/checkout/proeducation/create',{method:'POST',headers,body:'{}'},503]
 ]){const r=await fetch(base+p,opts);assert.equal(r.status,status,p);assert.equal(r.headers.get('cache-control'),'no-store');}
 assert.equal(calls,0);
});
test('upstream failures never expose error bodies, cookies or location',async t=>{
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
