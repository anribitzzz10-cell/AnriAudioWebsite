const { test, expect } = require("@playwright/test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const base = "https://checkout-preview.example.test";
const template = readFileSync(resolve(__dirname, "../kaspi-checkout-preview/index.html"), "utf8");
const demoLink = "https://pay.kaspi.kz/pay/DEMOONLY";
const orderId = "KSP-DEMO-OPAQUE-123456789";

async function openMockCheckout(page, {
  enabled = true, postStatus = 201, link = demoLink, state = "pending"
} = {}) {
  const view = {
    created: 0, checked: 0, state, receivedEmail: null
  };
  await page.route(`${base}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/v1/kaspi/orders" && request.method() === "POST") {
      view.created++;
      view.receivedEmail = request.postDataJSON()?.customer_email;
      return route.fulfill({
        status: postStatus,
        contentType: "application/json",
        body: JSON.stringify(postStatus === 201 ? {
          order_id: orderId,
          amount_kzt: 20000,
          currency: "KZT",
          status: "pending",
          payment_url: link
        } : { detail: "Kaspi checkout is not enabled" })
      });
    }
    if (url.pathname === `/v1/kaspi/orders/${orderId}` && request.method() === "GET") {
      view.checked++;
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          order_id: orderId, amount_kzt: 20000,
          status: view.state, currency: "KZT"
        })
      });
    }
    if (url.pathname === "/") {
      const html = enabled ?
        template.replace('data-checkout-api=""', `data-checkout-api="${base}"`) :
        template;
      return route.fulfill({
        status: 200, contentType: "text/html; charset=utf-8",
        body: html
      });
    }
    return route.fulfill({ status: 404, body: "Not found" });
  });
  await page.goto(base + "/");
  return view;
}

test("safe default: checkout disabled; form cannot call server", async ({ page }) => {
  const view = await openMockCheckout(page, { enabled: false });
  await expect(page.locator("#create")).toBeDisabled();
  await expect(page.locator("#order-result")).toBeHidden();
  await page.locator("#email").fill("sample@example.org");
  await expect(page.locator("#feedback")).toContainText("платежи не принимаются");
  expect(view.created).toBe(0);
});

test("pending order exposes amount and optional payment link, not a paid license", async ({ page }) => {
  const view = await openMockCheckout(page);
  await page.locator("#email").fill("buyer@example.org");
  await page.locator("#create").click();
  await expect(page.locator("#order-result")).toBeVisible();
  await expect(page.locator("#order-id")).toHaveText(orderId);
  await expect(page.locator("#order-amount")).toContainText("20 000");
  await expect(page.locator("#order-state")).toContainText("Ожидает");
  await expect(page.locator("#feedback")).toContainText("НЕ подтверждение оплаты");
  await expect(page.locator("#kaspi-link")).toHaveAttribute("href", demoLink);
  expect(view.created).toBe(1);
  expect(view.receivedEmail).toBe("buyer@example.org");
  expect(await page.locator("body").innerText()).not.toContain("ANRI-ABCDE");
  // Never click the payment link in tests: the provider is real.
});

test("disabled server rejects checkout and leaves payment unavailable", async ({ page }) => {
  const view = await openMockCheckout(page, { postStatus: 503 });
  await page.locator("#email").fill("buyer@example.org");
  await page.locator("#create").click();
  await expect(page.locator("#feedback")).toContainText("Kaspi checkout is not enabled");
  await expect(page.locator("#order-result")).toBeHidden();
  await expect(page.locator("#create")).toBeEnabled();
  expect(view.created).toBe(1);
});

test("untrusted merchant redirect is not activated", async ({ page }) => {
  await openMockCheckout(page, { link: "javascript:alert(1)" });
  await page.locator("#email").fill("buyer@example.org");
  await page.locator("#create").click();
  await expect(page.locator("#order-result")).toBeVisible();
  await expect(page.locator("#kaspi-link")).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("#kaspi-link")).toHaveAttribute("href", "#");
});

test("status reflects server verification; browser never issues the license", async ({ page }) => {
  const view = await openMockCheckout(page);
  await page.locator("#email").fill("buyer@example.org");
  await page.locator("#create").click();
  await page.locator("#check").click();
  await expect(page.locator("#order-state")).toContainText("Ожидает");
  view.state = "paid"; // Only simulated *server* changes this.
  await page.locator("#check").click();
  await expect(page.locator("#order-state")).toContainText("Подтверждён продавцом");
  expect(view.checked).toBe(2);
  await expect(page.locator("body")).not.toContainText("license_key");
});
