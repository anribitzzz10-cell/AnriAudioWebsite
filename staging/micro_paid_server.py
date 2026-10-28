"""Private single-payment ProEducation pilot frontend, isolated from public site.

Serve only with APP_ENV=micro_pilot_checkout on its own HTTPS Render service:
  uvicorn staging.micro_paid_server:app --host 0.0.0.0 --port $PORT --no-access-log
No merchant/issuer/admin/invite secrets are embedded in JS or returned in HTML.
"""
import os
from pathlib import Path
from urllib.parse import urlsplit
import httpx
from fastapi import FastAPI, Request
from starlette.responses import Response, JSONResponse

if os.getenv("APP_ENV") != "micro_pilot_checkout":
    raise RuntimeError("Private micro pilot frontend only")

BACKEND = os.environ.get("MICRO_BACKEND_ORIGIN", "").rstrip("/")
FRONTEND = os.environ.get("MICRO_FRONTEND_ORIGIN", "").rstrip("/")


def private_onrender_origin(value: str) -> bool:
    p = urlsplit(value)
    return (p.scheme == "https"
            and bool(p.hostname)
            and p.hostname.startswith("anri-micro-")
            and p.hostname.endswith(".onrender.com")
            and p.port is None and not p.username and not p.password
            and not p.path and not p.query and not p.fragment)


if not private_onrender_origin(BACKEND) or not private_onrender_origin(FRONTEND) or BACKEND == FRONTEND:
    raise RuntimeError("Distinct private HTTPS origins required")

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
CSP = ("default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; "
       "img-src 'self'; form-action https://anriprod.proeducation.kz; "
       "base-uri 'none'; object-src 'none'; frame-ancestors 'none'")


@app.middleware("http")
async def private_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.update({
        "Cache-Control": "no-store", "Pragma": "no-cache",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": CSP,
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
    })
    return response


@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=40, follow_redirects=False) as client:
            result = await client.get(BACKEND + "/health")
        data = result.json() if result.status_code == 200 else {}
        ready = (data.get("mode") == "private-micro-paid-pilot"
                 and data.get("database") == "postgresql"
                 and data.get("amount_minor") == 10000
                 and data.get("issuer_pin_verified") is True)
    except (httpx.HTTPError, ValueError):
        ready = False
    return JSONResponse(
        {"ok": ready, "mode": "private-micro-paid-pilot",
         "backend_ready": ready, "public_sales": False},
        status_code=200 if ready else 503,
    )


@app.post("/v1/checkout/proeducation/{action:path}")
async def proxy(action: str, request: Request):
    if action not in ("micro/create", "claim") or request.url.query:
        return Response(status_code=404)
    if request.headers.get("origin") not in ("", None, FRONTEND):
        return Response(status_code=403)
    if not request.headers.get("content-type", "").startswith("application/json"):
        return Response(status_code=415)
    raw = await request.body()
    if len(raw) > 4096:
        return Response(status_code=413)
    try:
        async with httpx.AsyncClient(timeout=45, follow_redirects=False) as client:
            result = await client.post(
                BACKEND + "/v1/checkout/proeducation/" + action,
                content=raw, headers={"Content-Type": "application/json"},
            )
    except httpx.HTTPError:
        return JSONResponse({"detail": "Private pilot unavailable"}, status_code=503)
    # No access logging or response introspection: responses can hold claim secrets.
    return Response(result.content, status_code=result.status_code,
                    media_type="application/json")


@app.get("/{path:path}")
async def static_assets(path: str):
    allowed = {
        "": "pilot/index.html", "pilot": "pilot/index.html",
        "pilot/": "pilot/index.html",
        "ru/pilot": "ru/pilot/index.html", "ru/pilot/": "ru/pilot/index.html",
        "kk/pilot": "kk/pilot/index.html", "kk/pilot/": "kk/pilot/index.html",
        "pilot/order.js": "pilot/order.js",
        "checkout/style.css": "checkout/style.css",
    }
    if path == "pilot/config.js":
        return Response(
            "export const API_ORIGIN=location.origin; export const PILOT_ENABLED=true;",
            media_type="text/javascript",
        )
    if path not in allowed:
        return Response(status_code=404)
    target = Path(allowed[path])
    content = target.read_text(encoding="utf-8")
    mime = "text/html" if target.suffix == ".html" else "text/javascript" if target.suffix == ".js" else "text/css"
    return Response(content, media_type=mime)
