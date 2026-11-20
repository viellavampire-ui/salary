import { expect, type Page } from "@playwright/test";

let counter = 0;

/** Уникальный email для теста. */
export function uniqueEmail(prefix = "user") {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@e2e.test`;
}

export const PASSWORD = "password123";

/** Регистрация через форму; после неё открыт дашборд. */
export async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("Имя").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(PASSWORD);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
}

/** Добавить операцию через кнопку «+ Операция» на текущей странице. */
export async function addTransaction(
  page: Page,
  t: {
    type: "income" | "expense";
    amount: string;
    category: string;
    note?: string;
  },
) {
  await page.getByRole("button", { name: "Операция", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("radio", { name: t.type === "income" ? "Доход" : "Расход" })
    .click();
  await dialog.getByLabel("Сумма").fill(t.amount);
  await dialog.locator("label", { hasText: t.category }).click();
  if (t.note) await dialog.getByLabel(/Комментарий/).fill(t.note);
  await dialog.getByRole("button", { name: "Добавить" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Операция добавлена").last()).toBeVisible();
}

/** Нет горизонтальной прокрутки страницы. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "горизонтальная прокрутка").toBeLessThanOrEqual(0);
}

/** Текст без неразрывных пробелов — для сравнения сумм. */
export const plain = (s: string) =>
  s.replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
