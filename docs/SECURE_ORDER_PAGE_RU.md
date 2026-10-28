# Страница защищённого заказа — draft, продажи выключены

Новые `/checkout/`, `/ru/checkout/`, `/kk/checkout/` используют одну локальную реализацию без аналитики, внешних шрифтов и session replay. Номер заказа и отдельный 256-битный credential передаются только в POST JSON. На возврате параметры URL удаляются и не используются как доказательство оплаты. Ключ выводится через textContent; в sessionStorage сохраняются только номер/credential, не лицензионный ключ. После закрытия сессии покупатель может вручную ввести сохранённые номер и credential. Потерянный credential не восстанавливается по одному номеру заказа.

Перед переходом к провайдеру пользователь должен сохранить номер/credential и подтвердить это. Форма провайдеру отправляется POST и не содержит credential. Цена отображается из серверного заказа в KZT. Resend не требуется. Кнопки BUY основных страниц остаются disabled.

`checkout/config.js`: API_ORIGIN пустой, CHECKOUT_ENABLED=false. Поэтому create/claim в опубликованном проекте пока закрыты. Для staging требуется SAME-ORIGIN proxy `/v1/checkout/proeducation/*` к отдельному backend (не текущему production) и API_ORIGIN равный точному HTTPS origin сайта; CSP разрешает только same-origin fetch. Не подставлять существующий pilot, его секреты или QA лицензии.

На host необходимо установить HTTP Cache-Control: no-store и Referrer-Policy: no-referrer для всех трёх checkout страниц и отключить body logging для create/claim proxy. HTML уже задаёт no-referrer, CSP и noindex. API выставляет no-store даже на ошибках. Credential не включать в URL, сообщения об ошибках, письма, аналитику или логи.

Backend: Anri-cloud draft PR #23, docs/SECURE_CHECKOUT_CLAIM_RU.md. Главные блокеры: backup/restore истории production SQLite, подтверждённый контракт KZ ProEducation (включая подписанную KZT currency), отдельное staging и настройки безопасного host/proxy. Документация Prodamus сама по себе не доказывает совместимость KZ. Не включать CHECKOUT_ENABLED или публичный BUY до выполнения этих условий и отдельного разрешения live.

Browser CI работает только с локальной статической страницей и перехваченными синтетическими ответами API. Проверяет три языка, закрытый BUY, удаление return query, no-referrer POST, отсутствие credential в URL, восстановление в той же сессии, повторное получение одного ключа и очистку сессии. Это не live/staging end-to-end.
