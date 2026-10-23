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
                assert "KSP-QA-20261023-PENDING-00001" in html, "QA order ID missing from read-only preview"
                assert "тест успешно прочитан из PostgreSQL" in html, "QA order cannot be read by preview"
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
    # Re-check the live staged backend after its security deployment:
    # unauthenticated attempts cannot confirm the known synthetic QA order.
    fake_confirmation = json.dumps({
        "payment_reference": "SYNTHETIC-NO-POS-NO-MONEY-00001",
        "actual_amount_kzt": 20000,
    }).encode()
    confirm_status, _, _ = request(
        "/admin/kaspi/orders/" + test_id + "/confirm",
        method="POST",
        data=fake_confirmation,
        headers={"Content-Type": "application/json", "X-Admin-Key": "invalid-test-only"},
    )
    assert confirm_status == 401, f"SECURITY: unauthenticated admin allowed: {confirm_status}"
    status, _, raw_after = request("/v1/kaspi/orders/" + test_id)
    assert status == 200 and json.loads(raw_after)["status"] == "pending"
    print("PASS invalid admin confirmation rejected; QA order remains pending")
    # Operator queue exists on the deployed QA server, but access is private.
    list_status, _, _ = request("/admin/kaspi/orders?status_filter=pending")
    assert list_status == 401, f"SECURITY: public Kaspi order queue allowed HTTP {list_status}"
    wrong_status, _, _ = request(
        "/admin/kaspi/orders?status_filter=all",
        headers={"X-Admin-Key": "invalid-test-only"},
    )
    assert wrong_status == 401, f"SECURITY: fake admin key allowed HTTP {wrong_status}"
    print("PASS operator reconciliation queue requires admin authentication")
    audit_status, _, _ = request("/admin/kaspi/audit")
    assert audit_status == 401, f"SECURITY: public audit exposed HTTP {audit_status}"
    audit_fake_status, _, _ = request(
        "/admin/kaspi/audit", headers={"X-Admin-Key": "invalid-test-only"}
    )
    assert audit_fake_status == 401, f"SECURITY: fake admin key exposed audit HTTP {audit_fake_status}"
    print("PASS new Kaspi admin audit endpoint requires authentication")

    attempt_status, _, attempt_body = request(
        "/v1/kaspi/orders",
        method="POST",
        data=json.dumps({"customer_email": "qa-antispam@example.invalid"}).encode(),
        headers={
            "Content-Type": "application/json",
            "Idempotency-Key": "QA-OFF-NO-CHECKOUT-20261023",
        },
    )
    assert attempt_status == 503, f"SECURITY: staging checkout enabled HTTP {attempt_status}"
    print("PASS staging checkout remains disabled even with valid idempotency token")
    # Seller HTML remains inaccessible until a dedicated operator password is
    # provisioned. The powerful admin API secret is NOT a panel password.
    hidden_panel, _, hidden_body = request("/internal/kaspi")
    assert hidden_panel == 404, f"SECURITY: disabled seller panel returned {hidden_panel}"
    assert b"customer_email" not in hidden_body and b"<table" not in hidden_body
    print("PASS seller panel fails closed until its separate operator password exists")

    malformed_status, _, _ = request("/v1/kaspi/orders/not-a-real-order")
    assert malformed_status == 404, f"Malformed public order ID returned {malformed_status}"
    print("PASS malformed public order lookup rejected without reaching order data")

    valid_status, valid_headers, valid_body = request("/v1/kaspi/orders/" + test_id)
    assert valid_status == 200 and json.loads(valid_body)["status"] == "pending"
    assert valid_headers.get("Cache-Control") == "private, no-store", "QA buyer status is cacheable"
    print("PASS public status no-store and synthetic pending order preserved")
    # Probe the new status-throttling path gently: one opaque, correctly
    # shaped unknown order only. Do NOT flood the shared QA fixture.
    candidate_id = "KSP-" + "F" * 32
    unknown_status, unknown_headers, unknown_body = request(
        "/v1/kaspi/orders/" + candidate_id
    )
    assert unknown_status == 404, (
        f"SECURITY: unexpected result for an unknown opaque ID: {unknown_status}"
    )
    assert b"license_key" not in unknown_body and b"customer_email" not in unknown_body
    print("PASS unknown opaque order ID rejected without disclosure; no QA flood test")
    # Hostile visitor-supplied forwarding headers must NOT affect the QA
    # route's effective client identity (socket mode is default). This
    # deliberately uses one harmless negative lookup, not a traffic flood.
    spoof_status, _, spoof_payload = request(
        "/v1/kaspi/orders/KSP-" + "E" * 32,
        headers={
            "X-Real-IP": "8.8.8.8",
            "X-Forwarded-For": "9.9.9.9",
            "CF-Connecting-IP": "1.1.1.1",
        },
    )
    assert spoof_status == 404, f"SECURITY: unsafe forwarding header path {spoof_status}"
    assert b"license_key" not in spoof_payload and b"customer_email" not in spoof_payload
    print("PASS forged forwarding headers do not expose customer data in disabled QA")
    # A spoofed peer header must never turn a staged checkout back on.
    # One synthetic .invalid request, no real merchant bank transaction.
    spoof_create_status, _, spoof_create_body = request(
        "/v1/kaspi/orders", method="POST",
        data=json.dumps({"customer_email": "qa-proxy-guard@example.invalid"}).encode(),
        headers={
            "Content-Type": "application/json",
            "Idempotency-Key": "QA-INDEPENDENT-LAUNCH-GATE-20261023",
            "X-Real-IP": "8.8.8.8",
            "X-Forwarded-For": "9.9.9.9",
        },
    )
    assert spoof_create_status == 503, (
        f"SECURITY: spoofed headers enabled Kaspi checkout {spoof_create_status}"
    )
    assert b"payment_url" not in spoof_create_body and b"license_key" not in spoof_create_body
    print("PASS commercial Kaspi checkout stays disabled with attacker forwarding headers")
    print("PASS all 17 external QA checks")

    # Seller verification diagnostic: public site only; does not print identifiers.
    from seller_public_info_audit import main as seller_audit
    seller_audit()



if __name__ == "__main__":
    main()
