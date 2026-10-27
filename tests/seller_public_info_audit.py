"""Read-only diagnostics for publicly deployed ANRI AUDIO website.
Do not print registration identifiers or personal details.
"""
import re
import ssl
import urllib.request

ctx = ssl.create_default_context()
paths = {
    "home_en": "https://anriaudio.com/",
    "home_ru": "https://anriaudio.com/ru/",
    "contacts_ru": "https://anriaudio.com/ru/contacts/",
    "contacts_kk": "https://anriaudio.com/kk/contacts/",
}

def main():
    for label, url in paths.items():
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 ANRI-AUDIO-Seller-Info-QA"})
            with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
                txt = r.read(150000).decode("utf-8", "replace")
                visible_name = bool(re.search(r"Безручкин\s+Андрей\s+Александрович", txt))
                registration_id = bool(re.search(r"(?i)(?:ИИН|БИН|ЖСН|БСН)\s*(?:/|\x2F)?\s*(?:БИН|БСН)?\s*</?[^>]*>\s*\d{12}", txt))
                registration_id = registration_id or ("921007301843" in txt)
                print(f"{label}: HTTP {r.status} / FIO={'YES' if visible_name else 'NO'} / registration={'YES' if registration_id else 'NO'} / bytes={len(txt)}")
        except Exception as exc:
            print(f"{label}: UNVERIFIED ({type(exc).__name__})")
    print("Seller-info public-page diagnostics complete. No changes made.")

if __name__ == "__main__":
    main()
