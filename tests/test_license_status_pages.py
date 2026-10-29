from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LicenseStatusPagesTests(unittest.TestCase):
    def test_all_localized_pages_have_correct_routes_and_security_metadata(self):
        pages = {
            "license/index.html": (
                "lang=\"en\"", "https://anriaudio.com/license/", 'href="/license/"',
                "Check license status",
            ),
            "ru/license/index.html": (
                "lang=\"ru\"", "https://anriaudio.com/ru/license/", 'href="/ru/license/"',
                "Проверить статус лицензии",
            ),
            "kk/license/index.html": (
                "lang=\"kk\"", "https://anriaudio.com/kk/license/", 'href="/kk/license/"',
                "Лицензия мәртебесін тексеру",
            ),
        }
        for path, required in pages.items():
            with self.subTest(path=path):
                html = (ROOT / path).read_text(encoding="utf-8")
                for item in required:
                    self.assertIn(item, html)
                self.assertIn('name="referrer" content="no-referrer"', html)
                self.assertIn('type="password"', html)
                self.assertIn('autocomplete="off"', html)
                self.assertIn('maxlength="128"', html)
                self.assertIn('src="/license/status.js"', html)
                self.assertIn('href="/license/status.css"', html)
                self.assertIn('id="license-check-form"', html)

    def test_homepages_link_to_the_correct_localized_checker(self):
        links = {
            "index.html": 'href="/license/">Check license status',
            "ru/index.html": 'href="/ru/license/">Проверить статус лицензии',
            "kk/index.html": 'href="/kk/license/">Лицензия мәртебесін тексеру',
        }
        for path, expected in links.items():
            with self.subTest(path=path):
                self.assertIn(expected, (ROOT / path).read_text(encoding="utf-8"))

    def test_client_posts_directly_without_persisting_or_logging_key(self):
        js = (ROOT / "license/status.js").read_text(encoding="utf-8")
        self.assertIn('https://anri-cloud.onrender.com/v1/license/check', js)
        self.assertIn('method: "POST"', js)
        self.assertIn('cache: "no-store"', js)
        self.assertIn('credentials: "omit"', js)
        self.assertIn('referrerPolicy: "no-referrer"', js)
        self.assertIn('input.value = "";', js)
        self.assertNotIn("localStorage", js)
        self.assertNotIn("sessionStorage", js)
        self.assertNotIn("console.log", js)
        self.assertNotIn("location.search", js)
        self.assertNotIn("URLSearchParams", js)
        self.assertNotIn("innerHTML", js)


if __name__ == "__main__":
    unittest.main()
