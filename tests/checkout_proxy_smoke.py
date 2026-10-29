#!/usr/bin/env python3
"""Opt-in safe HTTP smoke check for public checkout pages and POST reverse proxy.

NO real order, valid claim credential, payment, activation or merchant request.
Run manually only after an approved staging/public deployment. An empty JSON
object is rejected by Pydantic before any order/claim handler can run.
"""
import argparse
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


_ALLOWED = {
    "anriaudio.com", "www.anriaudio.com",
    "anri-synthetic-checkout-20261029.onrender.com",
}
_PAGES = ("/checkout/", "/ru/checkout/", "/kk/checkout/")
_ACTIONS = ("/v1/checkout/proeducation/create", "/v1/checkout/proeducation/claim")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def origin_checked(value):
    parts = urlsplit(value)
    if (
        parts.scheme != "https"
        or parts.netloc not in _ALLOWED
        or parts.path not in ("", "/")
        or parts.query or parts.fragment
        or parts.username is not None or parts.password is not None
    ):
        raise ValueError("Origin must be an approved HTTPS hostname without path or credentials")
    return "https://" + parts.netloc


def checked_request(opener, url, method, body=None):
    headers = {
        "User-Agent": "ANRI-commerce-proxy-preflight/1.0",
        "Accept": "application/json" if method == "POST" else "text/html",
    }
    if method == "POST":
        headers["Content-Type"] = "application/json"
    req = Request(url, data=body, headers=headers, method=method)
    try:
        response = opener.open(req, timeout=15)
    except HTTPError as exc:
        response = exc
    status = response.code
    response_headers = response.headers
    data = response.read(262145)
    response.close()
    if len(data) > 262144:
        raise ValueError("Response size limit exceeded")
    return status, response_headers, data


def check(origin):
    opener = build_opener(NoRedirect())
    all_ok = True
    for path in _PAGES:
        try:
            status, headers, data = checked_request(opener, origin + path, "GET")
            valid = (status == 200 and b'id="heading"' in data
                     and b'/checkout/order.js' in data)
        except (URLError, OSError, ValueError):
            valid = False
        print(f"{'PASS' if valid else 'FAIL'} GET {path} (localized checkout page)")
        all_ok &= valid
    for path in _ACTIONS:
        try:
            status, headers, data = checked_request(opener, origin + path, "POST", b"{}")
            parsed = json.loads(data.decode("utf-8"))
            valid = (
                status == 422
                and parsed == {"detail": "Invalid order request"}
                and "no-store" in headers.get("Cache-Control", "").lower()
                and headers.get("Referrer-Policy", "").lower() == "no-referrer"
                and headers.get("X-Content-Type-Options", "").lower() == "nosniff"
            )
        except (URLError, OSError, ValueError, UnicodeError, json.JSONDecodeError):
            valid = False
        # Never include response bodies, URLs with query, credentials or keys.
        print(f"{'PASS' if valid else 'FAIL'} POST {path} (empty-body rejection, no-store, no redirect)")
        all_ok &= valid
    return all_ok


def main():
    parser = argparse.ArgumentParser(description="Safe, opt-in ANRI checkout proxy test; never creates orders")
    parser.add_argument("--origin", required=True, help="Approved HTTPS site origin")
    args = parser.parse_args()
    try:
        origin = origin_checked(args.origin)
    except ValueError as exc:
        parser.error(str(exc))
    if not check(origin):
        print("CHECKOUT_PROXY_NO_GO: browser checkout must remain disabled")
        return 1
    print("CHECKOUT_PROXY_SMOKE_PASS: routing only; not merchant/payment/issuer GO")
    return 0


if __name__ == "__main__":
    sys.exit(main())
