#!/usr/bin/env python3
"""External, read-only/invalid-POST smoke check of isolated preview.

Never creates an order: empty JSON cannot pass required create/claim fields.
This script has no credentials, tokens, merchant URL or live payment operations.
"""
import json
import sys
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPRedirectHandler

ORIGIN = "https://anri-audio-checkout-gateway-preview.onrender.com"
PAGES = ("/", "/checkout/", "/ru/checkout/", "/kk/checkout/")
API = ("/v1/checkout/proeducation/create", "/v1/checkout/proeducation/claim")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(opener, path, *, invalid_post=False):
    headers = {"User-Agent": "ANRI-preview-no-payment-smoke/1.0"}
    if invalid_post:
        headers["Content-Type"] = "application/json"
    req = Request(
        ORIGIN + path, data=b"{}" if invalid_post else None,
        method="POST" if invalid_post else "GET", headers=headers,
    )
    try:
        r = opener.open(req, timeout=90)
    except HTTPError as exc:
        r = exc
    with r:
        content = r.read(262145)
        return r.status, dict(r.headers), content[:262145]


def main():
    opener = build_opener(NoRedirect())
    failures = []
    for path in PAGES:
        try:
            status, headers, body = request(opener, path)
            ok = (status == 200 and b'id="heading"' in body) if path != "/" else (status == 200 and b"ANRI" in body)
            ok &= "no-store" in headers.get("Cache-Control", "")
        except Exception:
            ok = False
        print(("PASS " if ok else "FAIL ") + "GET " + path, flush=True)
        if not ok:
            failures.append(path)
    try:
        status, _, data = request(opener, "/health")
        body = json.loads(data.decode())
        ok = status == 200 and body.get("mode") == "preview" and body.get("checkout_enabled") is False and body.get("proxy_configured") is False and body.get("external_payment_verified") is False
    except Exception:
        ok = False
    print(("PASS " if ok else "FAIL ") + "GET /health (checkout off)", flush=True)
    if not ok:
        failures.append("/health")
    try:
        status, _, body = request(opener, "/checkout/config.js")
        ok = status == 200 and b"CHECKOUT_ENABLED=false" in body and b"API_ORIGIN=''" in body
    except Exception:
        ok = False
    print(("PASS " if ok else "FAIL ") + "GET /checkout/config.js (closed)", flush=True)
    if not ok:
        failures.append("/checkout/config.js")
    for path in API:
        try:
            status, headers, data = request(opener, path, invalid_post=True)
            body = json.loads(data.decode())
            ok = status == 503 and body == {"detail": "Commerce proxy disabled"}
            ok &= "no-store" in headers.get("Cache-Control", "")
            ok &= headers.get("Referrer-Policy") == "no-referrer"
        except Exception:
            ok = False
        print(("PASS " if ok else "FAIL ") + "POST " + path + " (disabled)", flush=True)
        if not ok:
            failures.append(path)
    print("PREVIEW_NO_PAYMENT_SMOKE_" + ("FAIL" if failures else "PASS"))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
