import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import {
  PASSWORD,
  addTransaction,
  login,
  plain,
  register,
  uniqueEmail,
} from "./helpers";

/**
 * Главный путь пользователя (docs/task.md 14.2):
 * регистрация → доход и расходы → дашборд → категории → поиск операций →
 * бюджет → аналитика → экспорт CSV → настройки → выход и вход.
 */
test("путь пользователя от регистрации до экспорта", async ({ page }) => {
  const email = uniqueEmail("journey");

  await test.step("регистрация и пустой дашборд", async () => {
    await register(page, "Анна", email);
    await expect(
      page.getByText("Здесь появится ваша финансовая картина"),
    ).toBeVisible();
  });

  await test.step("доход и два расхода через «+ Операция»", async () => {
    await addTransaction(page, {
      type: "income",
      amount: "200 000",
      category: "Зарплата",
    });
    await addTransaction(page, {
      type: "expense",
      amount: "1 250,50",
      category: "Продукты",
      note: "Молоко и хлеб",
    });
    await addTransaction(page, {
      type: "expense",
      amount: "45000",
      category: "Жильё",
    });
  });

  await test.step("дашборд считает показатели", async () => {
    await page.reload();
    const kpis = page.locator("main .grid.grid-cols-2 > div:visible");
    await expect(kpis.nth(0)).toContainText(/200\s000\s₽/);
    await expect(kpis.nth(1)).toContainText(/46\s250,50\s₽/);
    await expect(kpis.nth(2)).toContainText(/\+153\s749,50\s₽/);
    await expect(kpis.nth(3)).toContainText(/77\s%/);
    await expect(
      page.getByRole("region", { name: "Расходы по категориям" }),
    ).toContainText("Жильё");
  });

  await test.step("категории показывают суммы", async () => {
    await page
      .locator("aside")
      .getByRole("link", { name: "Категории" })
      .click();
    const tile = page
      .locator("main ul.grid > li:visible")
      .filter({ hasText: "Продукты" });
    await expect(tile).toContainText(/1\s250,50\s₽/);
    await expect(tile).toContainText("1 операция");
  });

  await test.step("поиск операций без учёта регистра", async () => {
    await page.locator("aside").getByRole("link", { name: "Операции" }).click();
    await expect(page.locator("main table tbody tr:visible")).toHaveCount(3);
    await page.getByRole("searchbox").fill("МОЛОКО");
    await expect(page).toHaveURL(/q=/);
    await expect(page.locator("main table tbody tr:visible")).toHaveCount(1);
    await expect(page.locator("main table tbody tr:visible")).toContainText(
      "Молоко и хлеб",
    );
  });

  await test.step("бюджет близко к лимиту и блок на дашборде", async () => {
    await page.locator("aside").getByRole("link", { name: "Бюджеты" }).click();
    await page.getByRole("button", { name: "Задать лимит: Продукты" }).click();
    await page.getByLabel("Лимит в месяц").fill("1500");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Создать" })
      .click();
    const card = page
      .locator("main ul.grid > li:visible")
      .filter({ hasText: "Продукты" });
    await expect(card).toContainText("Близко к лимиту");
    await expect(card).toContainText(/83\s%/);

    await page.locator("aside").getByRole("link", { name: "Дашборд" }).click();
    await expect(
      page.getByRole("region", { name: "Бюджеты под угрозой" }),
    ).toContainText("Продукты");
  });

  await test.step("аналитика: смена периода", async () => {
    await page
      .locator("aside")
      .getByRole("link", { name: "Аналитика" })
      .click();
    await expect(
      page.getByRole("region", { name: "Сравнение по категориям" }),
    ).toContainText("Жильё");
    await page.getByRole("button", { name: "Квартал" }).click();
    await expect(page).toHaveURL(/period=\d{4}-Q[1-4]/);
    await page.getByRole("button", { name: "Год", exact: true }).click();
    await expect(page).toHaveURL(/period=\d{4}$/);
  });

  await test.step("экспорт CSV", async () => {
    await page
      .locator("aside")
      .getByRole("link", { name: "Настройки" })
      .click();
    await page.locator("#export-preset").selectOption("all");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Скачать CSV" }).click();
    const file = await (await download).path();
    const csv = await readFile(file!, "utf8");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).trim().split("\r\n");
    expect(lines[0]).toBe("Дата;Тип;Категория;Сумма;Валюта;Комментарий");
    expect(lines).toHaveLength(4);
    expect(csv).toContain(";Расход;Продукты;-1250,50;RUB;Молоко и хлеб");
    expect(csv).toContain(";Доход;Зарплата;200000,00;RUB;");
  });

  await test.step("смена валюты меняет суммы", async () => {
    await page.getByLabel("Валюта").selectOption("KZT");
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Настройки сохранены")).toBeVisible();
    await page.locator("aside").getByRole("link", { name: "Дашборд" }).click();
    await expect(
      page.locator("main .grid.grid-cols-2 > div:visible").nth(0),
    ).toContainText(/200\s000\s₸/);
  });

  await test.step("выход и повторный вход", async () => {
    await page
      .locator("aside")
      .getByRole("button", { name: "Меню профиля" })
      .click();
    await page.getByRole("menuitem", { name: "Выйти" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(plain(await page.locator("main h1:visible").innerText())).toBe(
      "Дашборд",
    );
  });
});
