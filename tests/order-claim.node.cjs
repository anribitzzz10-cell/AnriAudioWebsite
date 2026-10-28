const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../checkout/order.js'),'utf8')
 .replace("import {API_ORIGIN, CHECKOUT_ENABLED} from './config.js';",'');
const order='anri-full-'+'a'.repeat(32), credential='c'.repeat(43), key='ANRI-ABCDE-FGHJK-LMNPQ-RSTUV';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({saved=true,enabled=true,fetcher}={}){
 const elements=new Map(), events={}, timers=new Map(), calls=[];let timerId=0, copied, submitted=false;
 function element(id){const named=[...elements.values()].find(e=>e.id===id);if(named)return named;if(!elements.has(id))elements.set(id,{value:'',textContent:'',hidden:true,checked:false,disabled:false,
  handlers:{},addEventListener(n,f){this.handlers[n]=f;},after(){},append(){},reset(){},focus(){},select(){}});return elements.get(id);}
 const storage=new Map(saved?[['anri-private-order',JSON.stringify({order_num:order,claim_credential:credential})]]:[]);
 const document={documentElement:{lang:'ru'},hidden:false,getElementById:element,
  createElement(type){const e=element('created-'+elements.size);e.submit=()=>{submitted=true;};return e;},
  addEventListener(n,f){events[n]=f;},body:{append(){}}};
 const context={API_ORIGIN:enabled?'https://anriaudio.com':'',CHECKOUT_ENABLED:false,
  document,location:{origin:'https://anriaudio.com',pathname:'/ru/checkout/'},
  history:{replaceState(a,b,url){calls.push({cleanURL:url});}},
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  navigator:{clipboard:{writeText:async v=>{copied=v;}}},AbortController,
  addEventListener(n,f){events[n]=f;},
  setTimeout(f,ms){const id=++timerId;timers.set(id,{f,ms});return id;},clearTimeout:id=>timers.delete(id),
  fetch:async(url,options)=>{calls.push({url,options});return fetcher?fetcher(url,options):{ok:true,json:async()=>({status:'fulfilled',license_key:key})};},Intl,Set,Error};
 vm.runInNewContext(source,context);
 const trigger=async(id,event='click')=>{await element(id).handlers[event]?.({preventDefault(){}});await flush();};
 return {element,events,timers,calls,storage,context,trigger,document,get copied(){return copied;},get submitted(){return submitted;}};
}
async function run(){
 const passed=[];
 async function check(name,fn){await fn();passed.push(name);}
 await check('saved owner auto claims, copy key, POST only, no URL secret',async()=>{
  const f=fixture();f.events.pageshow();await flush();
  assert.equal(f.element('key').textContent,key);assert.equal(f.element('key').hidden,false);
  const c=f.calls.find(c=>c.url);assert.equal(c.options.method,'POST');assert.equal(c.options.referrerPolicy,'no-referrer');
  assert.equal(c.options.cache,'no-store');assert.equal(c.options.credentials,'omit');assert.equal(c.options.redirect,'error');
  assert.equal(c.url.includes(credential),false);assert.deepEqual(JSON.parse(c.options.body),{order_num:order,claim_credential:credential});
  assert.equal(f.calls[0].cleanURL,'/ru/checkout/');
  await f.trigger('copy-key');assert.equal(f.copied,key);
 });
 await check('return query without owner credential performs no claim',async()=>{
  const f=fixture({saved:false});f.events.pageshow();await flush();assert.equal(f.calls.filter(c=>c.url).length,0);assert.equal(f.element('key').hidden,true);
 });
 await check('closed API origin performs no claim',async()=>{
  const f=fixture({enabled:false});f.events.pageshow();await flush();assert.equal(f.calls.filter(c=>c.url).length,0);
 });
 await check('pending polls then same key is displayed',async()=>{
  let n=0;const f=fixture({fetcher:async()=>({ok:true,json:async()=>++n===1?{status:'pending',license_key:null}:{status:'fulfilled',license_key:key}})});
  f.events.pageshow();await flush();assert.equal(f.element('key').hidden,true);
  const timer=[...f.timers.values()].find(t=>t.ms===5000);assert.ok(timer);timer.f();await flush();assert.equal(f.element('key').textContent,key);
 });
 await check('forget cancels late key response and clears saved access',async()=>{
  let resolve;const f=fixture({fetcher:()=>new Promise(r=>{resolve=r;})});f.events.pageshow();await flush();
  await f.trigger('forget');resolve({ok:true,json:async()=>({status:'fulfilled',license_key:key})});await flush();
  assert.equal(f.element('key').hidden,true);assert.equal(f.storage.size,0);assert.equal(f.element('credential').value,'');
 });
 await check('edited owner cannot receive previous request result',async()=>{
  let resolve;const f=fixture({fetcher:()=>new Promise(r=>{resolve=r;})});f.events.pageshow();await flush();
  f.element('credential').value='d'.repeat(43);await f.trigger('credential','input');
  resolve({ok:true,json:async()=>({status:'fulfilled',license_key:key})});await flush();assert.equal(f.element('key').hidden,true);
 });
 await check('untrusted key and network error are never displayed',async()=>{
  for(const fetcher of [async()=>({ok:true,json:async()=>({status:'fulfilled',license_key:'<script>bad</script>'})}),async()=>{throw Error();}]){
   const f=fixture({fetcher});f.events.pageshow();await flush();assert.equal(f.element('key').hidden,true);assert.equal(f.element('check').disabled,false);
  }
 });
 await check('pagehide clears key and aborts polling',async()=>{
  const f=fixture();f.events.pageshow();await flush();f.events.pagehide();assert.equal(f.element('key').hidden,true);assert.equal(f.element('credential').value,'');assert.equal(f.timers.size,0);
 });
 return passed;
}
module.exports=run;
if(require.main===module)run().then(p=>console.log(`${p.length} order recovery checks PASS`)).catch(e=>{console.error(e);process.exitCode=1;});
