"""External QA API probe. Read-only plus explicit fail-closed checkout test.

No secrets, no Kaspi POS, no admin endpoints and no production domain.
"""
import json
import ssl
import time
import urllib.error
import urllib.request

HOST = "https://anri-kaspi-api-qa-staging.up.railway.app"
HTTPS = ssl.create_default_context()


def request(path, method="GET", data=None, headers=None):
    req = urllib.request.Request(
        HOST + path,
        data=data,
        method=method,
        headers=headers or {},
    )
    try:
        with urllib.request.urlopen(req, context=HTTPS, timeout=12) as resp:
            return resp.status, resp.headers, resp.read(4000)
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read(4000)


def main():
    last = None
    for attempt in range(5):
        try:
            status, headers, body = request("/health")
            if status == 200:
                data = json.loads(body)
                assert data.get("ok") is True, f"Unexpected /health JSON: {data}"
                print("PASS external HTTPS /health: 200 ok=true; certificate validated")
                break
            last = f"/health HTTP {status}: {body[:160]!r}"
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            last = str(exc)
        if attempt < 4:
            time.sleep(3)
    else:
        raise AssertionError("External HTTPS QA health could not be verified: " + str(last))

    # Intentional negative test; endpoint is disabled by feature flag.
    # Email uses invalid TLD; no real person or money is involved.
    payload = json.dumps({"customer_email": "qa-probe@example.invalid"}).encode()
    status, headers, body = request(
        "/v1/kaspi/orders",
        method="POST",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    assert status == 503, f"SECURITY: checkout unexpectedly enabled: HTTP {status}"
    detail = json.loads(body).get("detail", "")
    assert detail == "Kaspi checkout is not enabled", f"Unexpected disabled response: {detail}"
    print("PASS checkout endpoint returns 503 (disabled, no order, no payment)")

    # API must not allow arbitrary browser origins in isolated QA.
    status, headers, body = request(
        "/health", headers={"Origin": "https://malicious.example.invalid"}
    )
    assert status == 200
    assert headers.get("Access-Control-Allow-Origin") is None, "SECURITY: wildcard CORS"
    print("PASS arbitrary browser origin not authorized in QA")
    print("PASS all 3 external QA checks; no real payment attempted")


if __name__ == "__main__":
    main()
