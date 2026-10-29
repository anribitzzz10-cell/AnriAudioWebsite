#!/usr/bin/env python3
"""One integration request: prepare 18k KZT checkout on REAL services, NO PAYMENT.

Creates exactly ONE unpaid pending test order in isolated Railway database.
No merchant POST, no charge, no key issuance, no claim credential in logs.
"""
import json
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

SITE="https://anri-audio-checkout-gateway-preview.onrender.com"
MERCHANT="https://anriprod.proeducation.kz/"
NOTIFY="https://anri-proeducation-full-18000-staging.up.railway.app/v1/payments/proeducation/webhook"


def main():
    try:
        with urlopen(SITE+"/health",timeout=85) as r:
            health=json.loads(r.read(4096))
        assert health["checkout_enabled"] is True, "Preview not enabled yet"
        assert health["proxy_configured"] is True, "Proxy missing"
        body=json.dumps({"customer_email":"unpaid-integration-test@example.invalid","locale":"ru"}).encode()
        request=Request(SITE+"/v1/checkout/proeducation/create",data=body,method="POST",
                        headers={"Content-Type":"application/json",
                                 "Origin":SITE,
                                 "Referrer-Policy":"no-referrer"})
        with urlopen(request,timeout=85) as r:
            assert r.status==200
            order=json.loads(r.read(32768))
        f={x["name"]:x["value"] for x in order.get("fields",[])}
        assert order.get("order_num","").startswith("anri-full-")
        assert len(order.get("claim_credential",""))==43
        assert order.get("currency")=="KZT" and order.get("amount_minor")==1800000
        assert order.get("merchant_form_action")==MERCHANT
        assert f.get("sys")=="anriaudio"
        assert f.get("products[0][price]")=="18000.00"
        assert f.get("currency")=="kzt"
        assert f.get("urlNotification")==NOTIFY
        assert f.get("urlSuccess")==SITE+"/ru/checkout/"
        assert len(f.get("signature",""))==64
        print("REAL_UNPAID_FULL_ORDER_CREATE_PASS")
        print("PRICE: 18000 KZT")
        print("MERCHANT: ProEducation")
        print("PRIVATE_CLAIM: generated (not logged)")
        print("PAYMENT_EXECUTED: NO")
        print("LICENSE_ISSUED: NO")
        return 0
    except (HTTPError,URLError,ValueError,AssertionError,KeyError,OSError) as exc:
        # Only sanitized diagnostics; do not log order body or private claim.
        if isinstance(exc, HTTPError):
            print("REAL_UNPAID_FULL_ORDER_CREATE_FAIL_HTTP",exc.code)
            try:
                detail=json.loads(exc.read(2048)).get("detail","")
                allowed=("Commerce not configured:", "License delivery not enabled",
                         "Secure claim disabled", "Durable commercial license storage",
                         "Merchant return origin", "Callback URL",
                         "Fixed checkout amount", "Merchant signing credentials",
                         "Approved ProEducation SYS", "FULL retail price")
                if isinstance(detail,str) and any(detail.startswith(x) for x in allowed):
                    print("CONFIGURATION_BLOCKER:",detail[:140])
            except (ValueError,AttributeError,UnicodeError):
                pass
        else:
            print("REAL_UNPAID_FULL_ORDER_CREATE_FAIL",type(exc).__name__)
        return 1

if __name__=="__main__":
    sys.exit(main())
