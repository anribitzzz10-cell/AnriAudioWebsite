# Отдельный HTTPS checkout staging — 29.10.2026

Развёрнутый код: d7bc605b0723c27d234caa7ea72032bb87db6c5d, branch feature/proeducation-website-prelaunch-20261027. Backend: aba3866654cd80e3fc2a712000273e2cd012a6c9, branch feature/anri-existing-bot-proedu-kaspi-integration-20261028.

EN https://anri-synthetic-checkout-20261029.onrender.com/checkout/
RU https://anri-synthetic-checkout-20261029.onrender.com/ru/checkout/
KK https://anri-synthetic-checkout-20261029.onrender.com/kk/checkout/
Health https://anri-synthetic-checkout-20261029.onrender.com/health — HTTP 200, backend_ready=true.
Backend health https://anri-synthetic-api-20261029.onrender.com/health — HTTP 200, database=postgresql, real_payments=false, email=false.

staging/server.py обслуживает только EN/RU/KK checkout, allowlisted assets и same-origin POST create/claim. Подключение жёстко привязано к новому isolated backend. Proxy token только серверный. CSP form-action 'none', Cache-Control no-store, Referrer-Policy no-referrer. Нет analytics или provider form. Только @example.invalid; цена 100.00 KZT синтетическая.
Обычный checkout/config.js, public BUY и main не включались. Auto-deploy OFF; этот documentation commit не меняет deployed code.

Фактический HTTPS E2E: create 200; восемь signed synthetic callbacks 8x200 (1 выдача, 7 duplicate); claim/recovery 200, одинаковый ключ. На первом заказе в PostgreSQL ровно одна лицензия; email_deliveries=0. Неверные signature/currency/amount/issuer/credential, unknown order и cross-origin отклонены. Реальный ProEducation webhook не смонтирован.
Browser suite на deployed frontend SHA PASS: https://github.com/anribitzzz10-cell/AnriAudioWebsite/actions/runs/40752027696
Полная backend evidence: https://github.com/anribitzzz10-cell/Anri-cloud/blob/feature/anri-existing-bot-proedu-kaspi-integration-20261028/docs/ISOLATED_SYNTHETIC_STAGING_20261029_RU.md

Новый staging использует отдельную FREE PG17 anri-synthetic-commerce-20261029 с ограниченным сроком жизни до 28.11.2026 00:08 Asia/Qyzylorda. Никакой production durability этим не подтверждается.
Live по-прежнему NO-GO: точный официальный KZ callback с подписанной валютой или reconciliation API; backup/restore старой SQLite; production issuer/client pin и история лицензий.
Никаких реальных платежей, customer email, AU-проверок, merge или изменений pilot.
