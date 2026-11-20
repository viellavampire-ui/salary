import { expect, test } from "@playwright/test";

import { addTransaction, login, register, uniqueEmail } from "./helpers";

test.describe("безопасность", () => {
  test("закрытые страницы и экспорт без входа недоступны", async ({
    page,
    request,
  }) => {
    for (const path of [
      "/dashboard",
      "/transactions",
      "/categories",
      "/budgets",
      "/analytics",
      "/settings",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(
        new RegExp(
          `/login\\?next=${encodeURIComponent(path).replace(/\//g, "%2F")}`,
        ),
      );
    }
    const res = await request.get("/api/export");
    expect(res.status()).toBe(401);
  });

  test("заголовки безопасности", async ({ request }) => {
    const res = await request.get("/login");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("после входа ?next= ведёт только на свои страницы", async ({ page }) => {
    const email = uniqueEmail("next");
    await register(page, "Next", email);
    await page.context().clearCookies();
    await page.goto("/login?next=https://evil.example/steal");
    await login(page, email);
    await expect(page).toHaveURL(/localhost:3100\/dashboard$/);
  });

  test("данные одного пользователя не видны другому", async ({ browser }) => {
    const alice = await browser.newPage();
    await register(alice, "Алиса", uniqueEmail("alice"));
    await addTransaction(alice, {
      type: "expense",
      amount: "777",
      category: "Продукты",
      note: "секрет-алисы",
    });

    const bob = await browser.newPage();
    await register(bob, "Боб", uniqueEmail("bob"));
    await expect(
      bob.getByText("Здесь появится ваша финансовая картина"),
    ).toBeVisible();

    await bob.goto("/transactions?q=секрет");
    await expect(bob.getByText("Ничего не найдено")).toBeVisible();

    const csv = await (await bob.request.get("/api/export")).text();
    expect(csv).not.toContain("секрет-алисы");
    expect(csv.trim().split("\r\n")).toHaveLength(1); // только заголовок

    await alice.close();
    await bob.close();
  });
});
