"""Read-only smoke test of the deployed production license-status endpoint."""
import base64
import hashlib
import json
import time
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

API = "https://anri-cloud.onrender.com"
EXPECTED_PUBLIC_KEY_SHA256 = "654d3e174db60e249a30250760780d62f4d7da38680706ebddd21ab484cee5c0"
SYNTHETIC_UNKNOWN_KEY = "ANRI-ABCDE-FGHJK-LMNPQ-RSTUV"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = build_opener(NoRedirect())


def request(path, method="GET", body=None, headers=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request_headers = {"User-Agent": "ANRI-readonly-license-smoke/1.0", "Accept": "application/json"}
    if data is not None:
        request_headers["Content-Type"] = "application/json"
    request_headers.update(headers or {})
    req = Request(API + path, data=data, headers=request_headers, method=method)
    try:
        with OPENER.open(req, timeout=25) as response:
            return response.status, response.headers, response.read(4096)
    except HTTPError as exc:
        return exc.code, exc.headers, exc.read(4096)


def main():
    ready = False
    last = None
    for _ in range(60):
        try:
            status, headers, raw = request("/v1/license/public-key")
            obj = json.loads(raw.decode("utf-8"))
            if status == 200 and obj.get("algorithm") == "Ed25519" and obj.get("encoding") == "base64url-raw-32":
                ready = True
                break
            last = f"public key response status={status}"
        except Exception as exc:
            last = type(exc).__name__
        time.sleep(5)
    if not ready:
        raise SystemExit("Production API did not become ready: " + str(last))

    raw_key = base64.urlsafe_b64decode(obj["public_key"] + "=")
    digest = hashlib.sha256(raw_key).hexdigest()
    if digest != EXPECTED_PUBLIC_KEY_SHA256:
        raise SystemExit("Production Ed25519 public-key fingerprint changed unexpectedly")
    print("PASS: production Ed25519 public-key fingerprint unchanged:", digest)

    status, headers, raw = request(
        "/v1/license/check",
        "POST",
        {"license_key": SYNTHETIC_UNKNOWN_KEY},
    )
    body = raw.decode("utf-8")
    if status != 200 or json.loads(body) != {"ok": False, "license": None}:
        raise SystemExit("Read-only unknown-key check failed; status=" + str(status))
    if SYNTHETIC_UNKNOWN_KEY in body:
        raise SystemExit("Response echoed the submitted test key")
    if headers.get("Cache-Control") != "no-store" or headers.get("Pragma") != "no-cache":
        raise SystemExit("License status response is cacheable")
    if headers.get("Referrer-Policy") != "no-referrer":
        raise SystemExit("License status response missing no-referrer")
    print("PASS: synthetic unknown key returns generic result without echo; privacy headers present")

    for origin in ("https://anriaudiowebsite.onrender.com", "https://anriaudio.com", "https://www.anriaudio.com"):
        status, headers, _ = request(
            "/v1/license/check",
            "OPTIONS",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        if status != 200 or headers.get("Access-Control-Allow-Origin") != origin:
            raise SystemExit("Official website CORS preflight failed for " + origin)
    status, headers, _ = request(
        "/v1/license/check",
        "OPTIONS",
        headers={
            "Origin": "https://attacker.invalid",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    if headers.get("Access-Control-Allow-Origin") is not None:
        raise SystemExit("Untrusted CORS origin was allowed")
    print("PASS: only the configured Render website and official ANRI domains pass CORS")
    print("No real license key, customer record, activation, database or payment route was accessed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
