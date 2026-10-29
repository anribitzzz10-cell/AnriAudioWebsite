// Local CI server: no external traffic and no Python runtime.
const http=require('node:http'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const aliases={'/license':'/checkout/index.html','/license/':'/checkout/index.html','/ru/license':'/ru/checkout/index.html','/ru/license/':'/ru/checkout/index.html','/kk/license':'/kk/checkout/index.html','/kk/license/':'/kk/checkout/index.html'};
http.createServer((req,res)=>{
 let file;
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+(aliases[pathname]||pathname));}
 catch{res.writeHead(400);res.end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 if(file.endsWith(path.sep)||path.extname(file)==='')file=path.join(file,'index.html');
 fs.readFile(file,(error,body)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(error?'Not found':body);});
}).listen(8765,'127.0.0.1');
