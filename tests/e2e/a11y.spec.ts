import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import {
  addTransaction,
  expectNoHorizontalScroll,
  register,
  uniqueEmail,
} from "./helpers";

/**
 * Доступность (WCAG 2.1 AA, axe) во всех разделах в светлой и тёмной теме
 * и отсутствие горизонтальной прокрутки на ширинах 360–1440 (14.4–14.5).
 */
const PUBLIC_PAGES = ["/", "/login", "/register"];
const APP_PAGES = [
  "/dashboard",
  "/transactions",
  "/transactions/recurring",
  "/categories",
  "/budgets",
  "/analytics",
  "/settings",
];

const STATE = "test-results/a11y-user.json";

/** axe работает только со страницами из browser.newContext() */
async function newPage(
  browser: Browser,
  options: Parameters<Browser["newContext"]>[0] = {},
) {
  const context = await browser.newContext(options);
  return context.newPage();
}

test.beforeAll(async ({ browser }) => {
  const page = await newPage(browser);
  await register(page, "Доступность", uniqueEmail("a11y"));
  await addTransaction(page, {
    type: "income",
    amount: "100000",
    category: "Зарплата",
  });
  await addTransaction(page, {
    type: "expense",
    amount: "9500",
    category: "Продукты",
    note: "Неделя",
  });
  await addTransaction(page, {
    type: "expense",
    amount: "30000",
    category: "Жильё",
  });
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Задать лимит: Продукты" }).click();
  await page.getByLabel("Лимит в месяц").fill("10000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Создать" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.context().storageState({ path: STATE });
  await page.context().close();
});

async function openReady(page: Page, path: string, theme: "light" | "dark") {
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
  await page.goto(path);
  // дождаться, пока заглушки загрузки сменятся содержимым и анимации закончатся
  await page.waitForFunction(() => !document.querySelector("[aria-busy]"));
  await page.waitForTimeout(400);
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help} — ${v.nodes
        .map((n) => `${n.target.join(" ")} ${n.html.slice(0, 120)}`)
        .join(", ")}`,
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`axe, ${theme === "light" ? "светлая" : "тёмная"} тема`, () => {
    for (const path of PUBLIC_PAGES) {
      test(`публичная ${path}`, async ({ browser }) => {
        const page = await newPage(browser);
        await openReady(page, path, theme);
        await expectNoAxeViolations(page);
        await page.context().close();
      });
    }

    for (const path of APP_PAGES) {
      test(`раздел ${path}`, async ({ browser }) => {
        const page = await newPage(browser, { storageState: STATE });
        await openReady(page, path, theme);
        await expectNoAxeViolations(page);
        await page.context().close();
      });
    }

    test("форма регулярной операции", async ({ browser }) => {
      const page = await newPage(browser, { storageState: STATE });
      await openReady(page, "/transactions/recurring", theme);
      await page
        .getByRole("button", { name: "Новая регулярная операция" })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.waitForTimeout(300);
      await expectNoAxeViolations(page);
      await page.context().close();
    });

    test("список уведомлений", async ({ browser }) => {
      const page = await newPage(browser, { storageState: STATE });
      await openReady(page, "/dashboard", theme);
      await page
        .locator("aside")
        .getByRole("button", { name: /Уведомления/ })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.waitForTimeout(300);
      await expectNoAxeViolations(page);
      await page.context().close();
    });

    test("форма новой операции", async ({ browser }) => {
      const page = await newPage(browser, { storageState: STATE });
      await openReady(page, "/dashboard?new=1", theme);
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.waitForTimeout(300);
      await expectNoAxeViolations(page);
      await page.context().close();
    });
  });
}

test.describe("адаптивность: нет горизонтальной прокрутки", () => {
  for (const width of [360, 768, 1024, 1440]) {
    test(`ширина ${width}px`, async ({ browser }) => {
      const page = await newPage(browser, {
        storageState: STATE,
        viewport: { width, height: 900 },
      });
      for (const path of [...APP_PAGES, ...PUBLIC_PAGES]) {
        if (PUBLIC_PAGES.includes(path)) await page.context().clearCookies();
        await openReady(page, path, "light");
        await expectNoHorizontalScroll(page);
      }
      await page.context().close();
    });
  }
});
