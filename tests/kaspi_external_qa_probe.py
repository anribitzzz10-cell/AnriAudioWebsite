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

    # A separate public QA preview acts as read-only frontend; it can call
    # only the QA API /health endpoint. Never test real merchant checkout here.
    preview = "https://anri-kaspi-preview-qa-staging.up.railway.app"
    preview_last = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(preview + "/", context=HTTPS, timeout=15) as result:
                html = result.read(15000).decode("utf-8")
                assert result.status == 200, f"Preview status {result.status}"
                assert "ANRI AUDIO MIDI" in html
                assert "Оплата пока недоступна" in html
                assert "QA API доступен" in html, "Preview cannot reach its own API backend"
                assert "https://pay.kaspi.kz/pay/" not in html
                print("PASS public preview HTML and server-to-server QA API health integration")
                break
        except (urllib.error.URLError, TimeoutError, ValueError, AssertionError) as exc:
            preview_last = str(exc)
        if attempt < 4:
            time.sleep(3)
    else:
        raise AssertionError("Public QA preview not healthy: " + str(preview_last))

    with urllib.request.urlopen(preview + "/health", context=HTTPS, timeout=12) as result:
        details = json.load(result)
        assert result.status == 200
        assert details.get("payments_enabled") is False
        assert details.get("ok") is True
    print("PASS preview /health reports payments_enabled=false")

    req = urllib.request.Request(preview + "/", data=b"", method="POST")
    try:
        with urllib.request.urlopen(req, context=HTTPS, timeout=12) as result:
            post_status = result.status
    except urllib.error.HTTPError as exc:
        post_status = exc.code
    assert post_status == 405, f"SECURITY: QA preview accepted POST ({post_status})"
    print("PASS preview refuses POST; no orders, no payment")
    print("PASS six existing external QA checks")

    # One synthetic order inserted by a one-time Railway QA seed script.
    # The public lookup must never reveal email, payment ref or license key.
    test_id = "KSP-QA-20261023-PENDING-00001"
    status, headers, body = request("/v1/kaspi/orders/" + test_id)
    assert status == 200, f"QA pending-order lookup returned HTTP {status}"
    test_order = json.loads(body)
    assert test_order == {
        "order_id": test_id,
        "status": "pending",
        "currency": "KZT",
        "amount_kzt": 20000,
    }, f"Unexpected QA order data: {test_order}"
    assert b"qa-20261023@example.invalid" not in body, "Email exposed in public order status"
    assert b"license_key" not in body and b"payment_reference" not in body
    print("PASS persisted pending QA order read via public API without PII or license")
    print("PASS all 7 external QA checks")



if __name__ == "__main__":
    main()
