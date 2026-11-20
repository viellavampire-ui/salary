import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/**
 * Сквозные тесты: собственный продакшен-сервер на порту 3100 с отдельной
 * базой e2e.db (пересоздаётся перед запуском). Локальная local.db не трогается.
 * Запуск: pnpm test:e2e (первый раз: pnpm exec playwright install chromium).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node scripts/e2e-db.mjs && pnpm build && pnpm start -p ${PORT}`,
    url: `${baseURL}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      TURSO_DATABASE_URL: "file:e2e.db",
      TURSO_AUTH_TOKEN: "",
      BETTER_AUTH_SECRET: "e2e-secret-not-for-production-0123456789",
      BETTER_AUTH_URL: baseURL,
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      // тесты регистрируют много пользователей подряд
      E2E_DISABLE_RATE_LIMIT: "1",
    },
  },
});
