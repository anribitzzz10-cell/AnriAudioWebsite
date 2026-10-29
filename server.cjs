// Official site runtime. Commerce is closed unless explicitly configured after review.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = __dirname;
const official = 'https://anriaudio.com';
const apiPaths = new Set(['/v1/checkout/proeducation/create', '/v1/checkout/proeducation/claim']);
const privateHeaders = {'Cache-Control':'no-store', 'Pragma':'no-cache', 'Referrer-Policy':'no-referrer', 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY'};
const csp = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; form-action https://anriprod.proeducation.kz; base-uri 'none'; object-src 'none'; frame-ancestors 'none'";
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
function fail(res, code, message) { res.writeHead(code, {...privateHeaders,'Content-Type':'application/json'});res.end(JSON.stringify({detail:message})); }
function upstreamOrigin(value) {
  if (!value) return null;
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || u.pathname !== '/' || u.origin === official) throw Error('Invalid commerce upstream');
  return u.origin;
}
async function body(req) {
  const chunks=[];let size=0;
  for await (const chunk of req) {size+=chunk.length;if(size>4096)throw Error('size');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
function createServer({upstream=process.env.ANRI_COMMERCE_UPSTREAM, salesEnabled=process.env.ANRI_SALES_ENABLED==='1', fetcher=fetch}={}) {
  const target=upstreamOrigin(upstream);
  return http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://site.invalid');
      if(url.pathname.startsWith('/v1/')) {
        if(!apiPaths.has(url.pathname))return fail(res,404,'Unavailable');
        if(req.method!=='POST')return fail(res,405,'POST required');
        if(url.search)return fail(res,400,'Query parameters forbidden');
        // No cookies or ambient credentials are accepted or forwarded.
        if(req.headers.origin!==official || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site']!=='same-origin'))return fail(res,403,'Official site required');
        if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return fail(res,415,'JSON required');
        if(!target || (url.pathname.endsWith('/create')&&!salesEnabled))return fail(res,503,'Checkout is closed');
        let raw;
        try{raw=await body(req);JSON.parse(raw);}catch{return fail(res,400,'Invalid order request');}
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
        try {
          // Fixed paths only. Never proxy merchant webhooks, admin, activation or arbitrary URLs.
          const reply=await fetcher(target+url.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:raw,redirect:'error',signal:controller.signal});
          if(!reply.ok)return fail(res,[400,403,404,409,422,429,503].includes(reply.status)?reply.status:502,'Order unavailable');
          const reader=reply.body.getReader();let bytes=0;const chunks=[];
          for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>32768){await reader.cancel();throw Error('response');}chunks.push(Buffer.from(value));}
          const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
          res.writeHead(200,{...privateHeaders,'Content-Type':'application/json'});res.end(JSON.stringify(value));
        } catch {fail(res,502,'Order unavailable');}finally{clearTimeout(timer);}
        return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return fail(res,405,'Method unavailable');
      let pathname;
      try{pathname=decodeURIComponent(url.pathname);}catch{return fail(res,400,'Invalid path');}
      const segments=pathname.split('/').filter(Boolean);
      if(segments.some(s=>s.startsWith('.')||s.includes('\\')) || pathname.includes('\0'))return fail(res,404,'Not found');
      const isCheckout=/^\/(?:ru\/|kk\/)?checkout(?:\/|$)/.test(pathname);
      let file=path.resolve(root,'.'+pathname);
      if(!file.startsWith(root+path.sep)) {if(pathname==='/')file=path.join(root,'index.html');else return fail(res,404,'Not found');}
      if(!path.extname(file))file=path.join(file,'index.html');
      // Serve only the site's public asset types; source/config/test files stay private.
      if(!mime[path.extname(file)])return fail(res,404,'Not found');
      if(segments[0]==='tests')return fail(res,404,'Not found');
      let contents;
      try{contents=await fs.readFile(file);}catch{return fail(res,404,'Not found');}
      const headers={'Content-Type':mime[path.extname(file)],'X-Content-Type-Options':'nosniff'};
      if(isCheckout)Object.assign(headers,privateHeaders,{'Content-Security-Policy':csp});
      res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:contents);
    } catch {if(!res.headersSent)fail(res,500,'Unavailable');else res.end();}
  });
}
module.exports={createServer,upstreamOrigin};
if(require.main===module){const server=createServer();server.requestTimeout=15000;server.headersTimeout=10000;server.listen(Number(process.env.PORT)||8080,'0.0.0.0');}
