"""Separate synthetic checkout host; exposes only two fixed same-origin proxy routes."""
import os
from pathlib import Path
from urllib.parse import urlparse
import httpx
from fastapi import FastAPI, Request
from starlette.responses import Response, JSONResponse
if os.getenv("APP_ENV") != "synthetic_staging":
    raise RuntimeError("Staging host only")
BACKEND=os.environ["SYNTHETIC_BACKEND_ORIGIN"]
if BACKEND!="https://anri-synthetic-api-20261029.onrender.com":
    raise RuntimeError("Only the isolated synthetic backend is permitted")
TOKEN=os.environ["SYNTHETIC_PROXY_TOKEN"]
if len(TOKEN)<64: raise RuntimeError("Proxy credential missing")
app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)
CSP="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"
@app.middleware("http")
async def privacy(request,call_next):
    response=await call_next(request)
    response.headers.update({"Cache-Control":"no-store","Pragma":"no-cache","Referrer-Policy":"no-referrer",
        "Content-Security-Policy":CSP,"X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"})
    return response
@app.get("/health")
async def health():
    async with httpx.AsyncClient(follow_redirects=False,timeout=45) as c:
        try:
            r=await c.get(BACKEND+"/health")
            if r.status_code!=200: raise ValueError()
            data=r.json()
            if data.get("mode")!="synthetic-only": raise ValueError()
        except (httpx.HTTPError,ValueError):
            return JSONResponse({"ok":False,"backend_ready":False},status_code=503)
    return {"ok":True,"mode":"synthetic-only","backend_ready":True,"commit":os.getenv("RENDER_GIT_COMMIT","unknown")}
@app.post("/v1/checkout/proeducation/{action}")
async def proxy(action:str,request:Request):
    if action not in ("create","claim") or request.url.query: return Response(status_code=404)
    origin=request.headers.get("origin")
    if origin and origin != str(request.base_url).rstrip("/"):
        return Response(status_code=403)
    raw=await request.body()
    if len(raw)>4096: return Response(status_code=413)
    if not request.headers.get("content-type","").startswith("application/json"): return Response(status_code=415)
    async with httpx.AsyncClient(follow_redirects=False,timeout=50) as c:
        try:
            r=await c.post(BACKEND+"/v1/checkout/proeducation/"+action,content=raw,
                headers={"Content-Type":"application/json","X-Staging-Token":TOKEN})
        except httpx.HTTPError:
            return JSONResponse({"detail":"Staging backend unavailable"},status_code=503)
    return Response(r.content,status_code=r.status_code,media_type="application/json")
@app.get("/{path:path}")
async def assets(path:str):
    allowed={"":"checkout/index.html","checkout":"checkout/index.html","checkout/":"checkout/index.html",
        "ru/checkout":"ru/checkout/index.html","ru/checkout/":"ru/checkout/index.html",
        "kk/checkout":"kk/checkout/index.html","kk/checkout/":"kk/checkout/index.html",
        "checkout/order.js":"staging/order.js","checkout/style.css":"checkout/style.css"}
    if path=="checkout/config.js":
        return Response("export const API_ORIGIN=location.origin; export const CHECKOUT_ENABLED=true;",media_type="text/javascript")
    if path not in allowed: return Response(status_code=404)
    content=Path(allowed[path]).read_text()
    media="text/javascript" if path.endswith(".js") else "text/css" if path.endswith(".css") else "text/html"
    if media=="text/html":
        content=content.replace("form-action https://anriprod.proeducation.kz","form-action 'none'")
    return Response(content,media_type=media)
