"""Read-only smoke test for the deployed public license status pages."""
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

BASE = "https://anriaudio.com"
PAGES = (
    ("/license/", "Check license status", "lang=\"en\""),
    ("/ru/license/", "Проверить статус лицензии", "lang=\"ru\""),
    ("/kk/license/", "Лицензия мәртебесін тексеру", "lang=\"kk\""),
)
HOME_LINKS = (
    ("/", 'href="/license/">Check license status'),
    ("/ru/", 'href="/ru/license/">Проверить статус лицензии'),
    ("/kk/", 'href="/kk/license/">Лицензия мәртебесін тексеру'),
)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = build_opener(NoRedirect())


def get(path):
    req = Request(BASE + path, method="GET", headers={
        "User-Agent": "ANRI-public-license-page-smoke/1.0",
        "Cache-Control": "no-cache",
    })
    try:
        with OPENER.open(req, timeout=20) as response:
            return response.status, response.headers, response.read(200_000).decode("utf-8")
    except HTTPError as exc:
        return exc.code, exc.headers, exc.read(200_000).decode("utf-8", errors="replace")


def main():
    # Render's static deploy and custom-domain edge propagation may be asynchronous.
    last = None
    for attempt in range(60):
        try:
            pages_ok = True
            for path, heading, language in PAGES:
                status, headers, body = get(path)
                if status != 200 or heading not in body or language not in body:
                    pages_ok = False
                    last = f"{path}: status={status}, heading={heading in body}, lang={language in body}"
                    break
                if 'src="/license/status.js"' not in body or 'href="/license/status.css"' not in body:
                    pages_ok = False
                    last = f"{path}: shared assets missing"
                    break
            if pages_ok:
                for path, link in HOME_LINKS:
                    status, _, body = get(path)
                    if status != 200 or link not in body:
                        pages_ok = False
                        last = f"{path}: status={status}, link={link in body}"
                        break
            if pages_ok:
                print("PASS: all three production license pages return 200 with localized headings and shared assets")
                print("PASS: all three production home pages link to the matching license page")
                print("GET-only public page checks; no license key, customer record, or payment data was sent.")
                return 0
        except (HTTPError, URLError, OSError, UnicodeError) as exc:
            last = type(exc).__name__
        time.sleep(5)
    print("PUBLIC_LICENSE_PAGES_SMOKE_FAIL:", last)
    return 1


if __name__ == "__main__":
    sys.exit(main())
