"""ANRI AUDIO website + same-origin commerce POST gateway.

Deploy as a separate reviewed Render web service before switching the custom
domain from the current static site. No server here issues licenses, initiates
a payment or knows a merchant signing secret. Default: checkout OFF.
"""
from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
ROOT = Path(__file__).resolve().parent
SYNTHETIC = "https://anri-synthetic-api-20261029.onrender.com"
MERCHANT_PREVIEW = "https://anri-proeducation-full-18000-staging.up.railway.app"
LIVE = "https://api.anriaudio.com"
MODES = {"preview", "merchant_preview", "production"}
PAGE_PATHS = {
    "": "index.html",
    "index.html": "index.html",
    "ru": "ru/index.html",
    "ru/": "ru/index.html",
    "kk": "kk/index.html",
    "kk/": "kk/index.html",
    "checkout": "checkout/index.html",
    "checkout/": "checkout/index.html",
    "ru/checkout": "ru/checkout/index.html",
    "ru/checkout/": "ru/checkout/index.html",
    "kk/checkout": "kk/checkout/index.html",
    "kk/checkout/": "kk/checkout/index.html",
    "terms": "terms/index.html",
    "terms/": "terms/index.html",
    "ru/terms": "ru/terms/index.html",
    "ru/terms/": "ru/terms/index.html",
    "kk/terms": "kk/terms/index.html",
    "kk/terms/": "kk/terms/index.html",
    "legal": "legal/index.html",
    "legal/": "legal/index.html",
    "support-development": "support-development/index.html",
    "support-development/": "support-development/index.html",
    "ru/support-development": "ru/support-development/index.html",
    "ru/support-development/": "ru/support-development/index.html",
    "kk/support-development": "kk/support-development/index.html",
    "kk/support-development/": "kk/support-development/index.html",
    "ru/contacts": "ru/contacts/index.html",
    "ru/contacts/": "ru/contacts/index.html",
    "kk/contacts": "kk/contacts/index.html",
    "kk/contacts/": "kk/contacts/index.html",
}
ROOT_ASSETS = {
    "favicon.ico", "favicon-16x16.png", "favicon-32x32.png",
    "apple-touch-icon.png", "icon-192.png", "icon-512.png",
    "site.webmanifest",
}
CHECKOUT_ASSETS = {"checkout/order.js", "checkout/style.css"}
# Do not accidentally expose internal staging, PR docs or pilot checkout.
PRIVATE_PREFIXES = ("staging/", "docs/", "tests/", ".github/", "pilot/")
CHECKOUT_CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self'; "
    "connect-src 'self'; img-src 'self'; "
    "form-action https://anriprod.proeducation.kz; "
    "base-uri 'none'; object-src 'none'; frame-ancestors 'none'"
)


def mode():
    return os.getenv("ANRI_GATEWAY_MODE", "preview")


def backend_config():
    """Exactly one trusted destination per deployment mode; never a URL param."""
    selected = mode()
    target = os.getenv("ANRI_COMMERCE_API_ORIGIN", "").strip()
    if selected not in MODES:
        return None
    trusted = {"preview": SYNTHETIC, "merchant_preview": MERCHANT_PREVIEW, "production": LIVE}
    if target != trusted[selected]:
        return None
    parts = urlsplit(target)
    if (parts.scheme != "https" or parts.netloc != parts.hostname
            or parts.path or parts.query or parts.fragment):
        return None
    if selected == "preview":
        token = os.getenv("ANRI_SYNTHETIC_PROXY_TOKEN", "")
        if len(token) < 64:
            return None
    return target


def public_checkout_enabled():
    return (
        mode() == "production"
        and backend_config() == LIVE
        and os.getenv("ANRI_PUBLIC_CHECKOUT_ENABLED", "0") == "1"
    )


@app.middleware("http")
async def privacy(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if request.url.path in ("/checkout/", "/ru/checkout/", "/kk/checkout/"):
        response.headers["Content-Security-Policy"] = (
            CHECKOUT_CSP if mode() == "production"
            else CHECKOUT_CSP.replace(
                "form-action https://anriprod.proeducation.kz",
                "form-action 'none'",
            )
        )
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


@app.get("/health")
async def health():
    # Configuration only, no network call, transaction or licensing.
    return {
        "ok": bool(backend_config()),
        "mode": mode(),
        "proxy_configured": bool(backend_config()),
        "checkout_enabled": public_checkout_enabled(),
        "external_payment_verified": False,
    }


async def forward(action: str, body: bytes):
    origin = backend_config()
    if not origin:
        return JSONResponse({"detail": "Commerce proxy disabled"}, status_code=503)
    headers = {"Content-Type": "application/json"}
    if mode() == "preview":
        headers["X-Staging-Token"] = os.getenv("ANRI_SYNTHETIC_PROXY_TOKEN", "")
    try:
        async with httpx.AsyncClient(follow_redirects=False, timeout=15) as client:
            upstream = await client.post(
                origin + "/v1/checkout/proeducation/" + action,
                content=body, headers=headers,
            )
        if (not 200 <= upstream.status_code <= 599
                or 300 <= upstream.status_code < 400
                or len(upstream.content) > 65536
                or not upstream.headers.get("Content-Type", "").lower().startswith("application/json")):
            raise ValueError("Unexpected upstream response")
    except (httpx.HTTPError, ValueError):
        return JSONResponse({"detail": "Commerce backend unavailable"}, status_code=503)
    # Do not log or transform a signed quote, claim code or licensed key.
    return Response(upstream.content, status_code=upstream.status_code,
                    media_type="application/json")


@app.post("/v1/checkout/proeducation/{action}")
async def proxy(action: str, request: Request):
    if action not in ("create", "claim") or request.url.query:
        return JSONResponse({"detail": "Invalid route"}, status_code=404)
    supplied_origin = request.headers.get("origin")
    # Render terminates TLS upstream of uvicorn. request.url.scheme can be
    # internal http, so compare browser Origin to explicitly trusted external
    # sites rather than the internal scheme or an attacker-controlled Host.
    expected_origins = (
        {"https://anriaudio.com", "https://www.anriaudio.com"}
        if mode() == "production"
        else {"https://anri-audio-checkout-gateway-preview.onrender.com"}
    )
    if supplied_origin and supplied_origin not in expected_origins:
        return JSONResponse({"detail": "Origin forbidden"}, status_code=403)
    if not request.headers.get("content-type", "").lower().startswith("application/json"):
        return JSONResponse({"detail": "JSON required"}, status_code=415)
    body = await request.body()
    if len(body) > 4096:
        return JSONResponse({"detail": "Request too large"}, status_code=413)
    return await forward(action, body)


@app.get("/{raw_path:path}")
async def static_pages(raw_path: str):
    if raw_path == "checkout/config.js":
        available = bool(backend_config())
        origin = "location.origin" if available else "''"
        buy = "true" if public_checkout_enabled() else "false"
        return Response(
            f"export const API_ORIGIN={origin}; export const CHECKOUT_ENABLED={buy};",
            media_type="text/javascript",
        )
    if raw_path in PAGE_PATHS:
        relative = PAGE_PATHS[raw_path]
    elif raw_path in CHECKOUT_ASSETS or raw_path in ROOT_ASSETS:
        relative = raw_path
    elif (raw_path.startswith("assets/")
          and raw_path.endswith((".png", ".webp", ".jpg", ".jpeg", ".svg"))
          and not any(part.startswith(".") for part in raw_path.split("/"))):
        relative = raw_path
    else:
        return Response(status_code=404)
    if any(relative.startswith(prefix) for prefix in PRIVATE_PREFIXES):
        return Response(status_code=404)
    target = (ROOT / relative).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        return Response(status_code=404)
    return FileResponse(target)
