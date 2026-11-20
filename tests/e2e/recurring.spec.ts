import { expect, test } from "@playwright/test";

import { register, uniqueEmail } from "./helpers";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test("регулярная операция: прошедшие даты, значок, удаление", async ({
  page,
}) => {
  await register(page, "Регуляр", uniqueEmail("recurring"));

  await page.goto("/transactions/recurring");
  await expect(page.getByText("Регулярных операций пока нет")).toBeVisible();
  await page
    .getByRole("button", { name: "Новая регулярная операция" })
    .first()
    .click();

  const dialog = page.getByRole("dialog");
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  await dialog.getByLabel("Сумма").fill("45000");
  await dialog.locator("label", { hasText: "Жильё" }).click();
  await dialog.getByLabel("Первая операция").fill(iso(start));
  await dialog.getByLabel(/Название/).fill("Аренда");
  await expect(dialog.locator("p[aria-live]")).toContainText(
    "Каждый месяц, 1-го числа",
  );
  await expect(dialog.locator("p[aria-live]")).toContainText("3 операции");
  await dialog.getByRole("button", { name: "Создать" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Добавлено 3 операции")).toBeVisible();

  const card = page.locator("main ul.grid > li:visible").first();
  await expect(card).toContainText("Аренда");
  await expect(card).toContainText("Следующая:");

  // операции появились и помечены значком
  await page.goto(`/transactions?period=${iso(start).slice(0, 7)}`);
  await expect(
    page.locator('main table tbody tr:visible [aria-label="регулярная"]'),
  ).toHaveCount(1);

  // удаление правила — операции остаются
  await page.goto("/transactions/recurring");
  await page
    .locator("main ul.grid > li:visible")
    .first()
    .locator("button")
    .first()
    .click();
  await dialog.getByRole("button", { name: "Удалить" }).click();
  await dialog.getByRole("button", { name: "Точно удалить?" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Регулярных операций пока нет")).toBeVisible();

  await page.goto(`/transactions?period=${iso(start).slice(0, 7)}`);
  await expect(page.locator("main table tbody tr:visible")).toHaveCount(1);
});
