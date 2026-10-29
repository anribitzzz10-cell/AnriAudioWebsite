"""Offline-only smoke checker tests. No merchant, DNS, proxy or live request."""
import io
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import checkout_proxy_smoke as smoke


class CheckoutProxySmokeTests(unittest.TestCase):
    def test_origin_allowlist(self):
        for host in ("anriaudio.com", "www.anriaudio.com",
                     "anri-synthetic-checkout-20261029.onrender.com"):
            self.assertEqual(smoke.origin_checked("https://" + host), "https://" + host)
        for bad in (
            "http://anriaudio.com", "https://evil.invalid",
            "https://anriaudio.com.evil.invalid",
            "https://user:pass@anriaudio.com",
            "https://anriaudio.com:443", "https://anriaudio.com/path",
            "https://anriaudio.com?credential=secret",
            "https://anriaudio.com/#secret",
        ):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                smoke.origin_checked(bad)

    @staticmethod
    def valid_response(opener, url, method, body=None):
        if method == "GET":
            return (200, {"Content-Type": "text/html"},
                    b'<html><h1 id="heading">Order</h1><script src="/checkout/order.js"></script></html>')
        assert body == b"{}"  # invalid request cannot create an order
        return (422, {
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
        }, b'{"detail":"Invalid order request"}')

    def test_exact_route_and_security_response_pass(self):
        with patch.object(smoke, "checked_request", self.valid_response):
            output = io.StringIO()
            with redirect_stdout(output):
                self.assertTrue(smoke.check("https://anriaudio.com"))
            self.assertEqual(output.getvalue().count("PASS "), 5)
            self.assertNotIn("credential=", output.getvalue())

    def test_redirect_or_unexpected_proxy_rejected(self):
        def wrong(opener, url, method, body=None):
            if method == "POST":
                return (302, {"Location": "https://other.invalid/"}, b"")
            return self.valid_response(opener, url, method, body)
        with patch.object(smoke, "checked_request", wrong):
            with redirect_stdout(io.StringIO()):
                self.assertFalse(smoke.check("https://anriaudio.com"))

    def test_generic_422_without_backend_privacy_headers_rejected(self):
        def wrong(opener, url, method, body=None):
            status, headers, payload = self.valid_response(opener, url, method, body)
            if method == "POST":
                headers = {}
            return status, headers, payload
        with patch.object(smoke, "checked_request", wrong):
            with redirect_stdout(io.StringIO()):
                self.assertFalse(smoke.check("https://anriaudio.com"))


if __name__ == "__main__":
    unittest.main()
