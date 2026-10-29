#!/usr/bin/env python3
"""Real Railway issuer <-> Render website integration check, NO payments.

GET public health/pin/config and POST invalid JSON only. Never creates an
order, issues a key, uses a merchant secret or accesses private licenses.
"""
import base64
import hashlib
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

API = "https://anri-proeducation-full-18000-staging.up.railway.app"
SITE = "https://anri-audio-checkout-gateway-preview.onrender.com"
PIN = "eae7a2d04226f9d10040110b796b54ae8247e7ae531bd7e5cd0f4fbd15392f8e"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, url):
        return None


def request(url, post=False):
    payload = b"{}" if post else None
    req = Request(url, data=payload, method="POST" if post else "GET",
                  headers={"User-Agent": "ANRI-FULL-no-payment-live-check/1.0",
                           **({"Content-Type": "application/json"} if post else {})})
    try:
        response = build_opener(NoRedirect()).open(req, timeout=90)
    except HTTPError as exc:
        response = exc
    with response:
        raw = response.read(65536)
        return response.status, dict(response.headers), raw


def run():
    errors = []
    try:
        code, _, raw = request(API + "/health")
        health = json.loads(raw)
        expected = (
            code == 200 and health.get("ok") is True
            and health.get("database_isolated") is True
            and health.get("real_postgresql") is True
            and health.get("price_minor_kzt") == 1800000
            and health.get("sys") == "anriaudio"
        )
        for flag in ["merchant_sign_configured", "issuer_client_pin_matches",
                     "license_encryption_ready", "license_pepper_ready",
                     "checkout_enabled", "fulfillment_enabled"]:
            print("RAILWAY_" + flag.upper() + ":", bool(health.get(flag)))
        print("RAILWAY_API_HEALTH:", "PASS" if expected else "FAIL")
        if not expected:
            errors.append("railway health")
    except (URLError, HTTPError, ValueError, OSError):
        errors.append("railway health unavailable")
    try:
        status, _, data = request(API + "/v1/license/public-key")
        obj = json.loads(data)
        raw = base64.urlsafe_b64decode(obj["public_key"] + "=")
        pinned = status == 200 and len(raw) == 32 and hashlib.sha256(raw).hexdigest() == PIN
        print("RAILWAY_AGENT_PIN_MATCH:", "PASS" if pinned else "FAIL")
        if not pinned: errors.append("agent issuer pin")
    except (URLError, HTTPError, ValueError, KeyError, OSError):
        errors.append("issuer key unavailable")
    try:
        status, _, raw = request(SITE + "/health")
        site = json.loads(raw)
        linked = (status == 200 and site.get("mode") == "merchant_preview"
                  and site.get("proxy_configured") is True
                  and site.get("checkout_enabled") is False)
        print("WEBSITE_SAME_ORIGIN_PROXY:", "PASS" if linked else "FAIL")
        if not linked: errors.append("site proxy")
    except (URLError, HTTPError, ValueError, OSError):
        errors.append("site health unavailable")
    for endpoint in ("/v1/checkout/proeducation/create","/v1/checkout/proeducation/claim"):
        try:
            # Empty JSON fails Pydantic before any database write or payment.
            status, _, raw = request(SITE + endpoint, post=True)
            safe = status == 422
            print("SAFE_INVALID_POST_" + endpoint.split("/")[-1].upper() + ":", "PASS" if safe else "FAIL")
            if not safe: errors.append(endpoint)
        except (URLError, HTTPError, OSError):
            errors.append(endpoint)
    print("REAL_COMMERCE_LINK_" + ("PASS" if not errors else "FAIL"))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(run())
