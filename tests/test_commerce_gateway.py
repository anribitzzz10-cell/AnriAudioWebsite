"""Offline tests for a separate same-origin ANRI website gateway. NO network."""
import asyncio
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from fastapi.responses import JSONResponse
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import commerce_gateway as gateway


class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {
            "ANRI_GATEWAY_MODE": "preview",
            "ANRI_COMMERCE_API_ORIGIN": "",
            "ANRI_PUBLIC_CHECKOUT_ENABLED": "0",
            "ANRI_SYNTHETIC_PROXY_TOKEN": "",
        })
        self.env.start()
        self.client = TestClient(gateway.app)

    def tearDown(self):
        self.env.stop()
        self.client.close()

    def configure_synthetic(self):
        os.environ["ANRI_COMMERCE_API_ORIGIN"] = gateway.SYNTHETIC
        os.environ["ANRI_SYNTHETIC_PROXY_TOKEN"] = "synthetic-test-only-not-live-" + "x" * 65

    def test_closed_checkout_and_real_public_static_files(self):
        for page in ["/", "/ru/", "/kk/", "/checkout/", "/ru/checkout/", "/kk/checkout/", "/license/", "/ru/license/", "/kk/license/"]:
            r = self.client.get(page)
            self.assertEqual(r.status_code, 200, page)
            self.assertIn("no-store", r.headers["cache-control"])
        config = self.client.get("/checkout/config.js")
        self.assertIn("CHECKOUT_ENABLED=false", config.text)
        self.assertIn("API_ORIGIN=''", config.text)
        self.assertFalse(self.client.get("/health").json()["external_payment_verified"])
        self.assertFalse(self.client.get("/health").json()["proxy_configured"])
        for blocked in ["/docs", "/openapi.json", "/.github/workflows/checkout.yml",
                        "/docs/PROEDUCATION_COMMERCIAL_GO_NO_GO_20261029_RU.md",
                        "/staging/server.py", "/pilot/", "/tests/checkout.spec.js",
                        "/requirements-commerce.txt"]:
            self.assertEqual(self.client.get(blocked).status_code, 404, blocked)

    def test_proxy_disabled_and_untrusted_origin_blocked(self):
        r = self.client.post("/v1/checkout/proeducation/claim", json={})
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["detail"], "Commerce proxy disabled")
        self.assertEqual(r.headers["referrer-policy"], "no-referrer")
        self.assertEqual(self.client.post(
            "/v1/checkout/proeducation/create",
            headers={"Origin": "https://attacker.invalid"},
            json={}).status_code, 403)
        self.assertEqual(self.client.post(
            "/v1/checkout/proeducation/create?token=private", json={}).status_code, 404)
        self.assertEqual(self.client.post(
            "/v1/checkout/proeducation/not-allowed", json={}).status_code, 404)
        self.assertEqual(self.client.post(
            "/v1/checkout/proeducation/create",
            data="not json", headers={"Content-Type": "text/plain"}).status_code, 415)
        self.assertEqual(self.client.post(
            "/v1/checkout/proeducation/create",
            content=b"x" * 5000, headers={"Content-Type": "application/json"}).status_code, 413)

    def test_synthetic_live_proxy_shape_no_charge(self):
        self.configure_synthetic()
        config = self.client.get("/checkout/config.js")
        self.assertIn("API_ORIGIN=location.origin", config.text)
        self.assertIn("CHECKOUT_ENABLED=false", config.text)
        self.assertIn("form-action 'none'", self.client.get("/checkout/").headers["content-security-policy"])
        observed = []

        async def only_invalid(action, body):
            observed.append((action, body))
            return JSONResponse({"detail": "Invalid order request"}, status_code=422)
        with patch.object(gateway, "forward", only_invalid):
            for action in ("create", "claim"):
                response = self.client.post(
                    "/v1/checkout/proeducation/" + action,
                    content=b"{}", headers={
                        "Content-Type": "application/json",
                        "Origin": "https://anri-audio-checkout-gateway-preview.onrender.com",
                    })
                self.assertEqual(response.status_code, 422)
                self.assertEqual(response.json(), {"detail": "Invalid order request"})
                self.assertEqual(response.headers["cache-control"], "no-store")
            self.assertEqual(observed, [("create", b"{}"), ("claim", b"{}")])

    def test_upstream_json_only_and_never_follow_redirect(self):
        self.configure_synthetic()
        calls = []
        class FakeClient:
            def __init__(self, **kwargs):
                self.kwargs = kwargs
                self.status = 422
                self.media_type = "application/json"
            async def __aenter__(self):
                selftest.assertFalse(self.kwargs["follow_redirects"])
                return self
            async def __aexit__(self, *_):
                pass
            async def post(self, url, content, headers):
                calls.append((url, content, dict(headers)))
                return httpx.Response(self.status, json={"detail": "Invalid order request"},
                                      headers={"Content-Type": self.media_type})
        selftest = self
        with patch.object(gateway.httpx, "AsyncClient", FakeClient):
            r = self.client.post("/v1/checkout/proeducation/create", json={})
        self.assertEqual(r.status_code, 422)
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][0], gateway.SYNTHETIC + "/v1/checkout/proeducation/create")
        self.assertEqual(calls[0][1], b"{}")
        self.assertTrue(calls[0][2]["X-Staging-Token"].startswith("synthetic-test-only"))
        self.assertNotIn("X-Admin-Key", calls[0][2])

        class RedirectClient(FakeClient):
            async def post(self, url, content, headers):
                return httpx.Response(302, headers={
                    "Location": "https://evil.invalid/",
                    "Content-Type": "application/json",
                })
        with patch.object(gateway.httpx, "AsyncClient", RedirectClient):
            r = self.client.post("/v1/checkout/proeducation/claim", json={})
        self.assertEqual(r.status_code, 503)
        self.assertNotIn("evil.invalid", r.text)

    def test_production_checkout_requires_explicit_release_switch(self):
        os.environ["ANRI_GATEWAY_MODE"] = "production"
        os.environ["ANRI_COMMERCE_API_ORIGIN"] = gateway.LIVE
        os.environ["ANRI_PUBLIC_CHECKOUT_ENABLED"] = "0"
        self.assertIn("CHECKOUT_ENABLED=false", self.client.get("/checkout/config.js").text)
        os.environ["ANRI_PUBLIC_CHECKOUT_ENABLED"] = "1"
        self.assertIn("CHECKOUT_ENABLED=true", self.client.get("/checkout/config.js").text)
        self.assertIn("form-action https://anriprod.proeducation.kz",
                      self.client.get("/checkout/").headers["content-security-policy"])
        os.environ["ANRI_COMMERCE_API_ORIGIN"] = "https://anri-cloud.onrender.com"
        self.assertIn("CHECKOUT_ENABLED=false", self.client.get("/checkout/config.js").text)
        self.assertFalse(self.client.get("/health").json()["proxy_configured"])


if __name__ == "__main__":
    unittest.main()
