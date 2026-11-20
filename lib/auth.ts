import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { seedDefaultCategories } from "@/db/seed";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/** Включён ли вход через Google (заданы ли ключи в окружении). */
export const isGoogleEnabled = Boolean(googleClientId && googleClientSecret);

// Адрес сайта: BETTER_AUTH_URL (свой домен) → на Vercel основной адрес
// проекта (VERCEL_PROJECT_PRODUCTION_URL) для Production → адрес конкретной
// публикации (VERCEL_URL) для preview. Системные переменные Vercel
// подставляются автоматически — для *.vercel.app ничего настраивать не нужно.
const https = (host?: string) => (host ? `https://${host}` : undefined);
const vercelUrl = https(process.env.VERCEL_URL);
const vercelBranchUrl = https(process.env.VERCEL_BRANCH_URL);
const vercelProductionUrl = https(process.env.VERCEL_PROJECT_PRODUCTION_URL);

export const auth = betterAuth({
  appName: "Salary",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_ENV === "production"
      ? vercelProductionUrl
      : undefined) ||
    vercelUrl,
  trustedOrigins: [vercelUrl, vercelBranchUrl, vercelProductionUrl].filter(
    (origin): origin is string => Boolean(origin),
  ),
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: isGoogleEnabled
    ? {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        },
      }
    : {},
  user: {
    // Удаление аккаунта из настроек: с паролем (или «свежей» сессией для
    // входа через Google). Данные удаляются каскадом по внешним ключам.
    deleteUser: { enabled: true },
    additionalFields: {
      currency: {
        type: "string",
        defaultValue: "RUB",
        input: false,
      },
      monthStartDay: {
        type: "number",
        defaultValue: 1,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Новый пользователь сразу получает стандартные категории (SPEC §5.6)
        after: async (createdUser) => {
          await seedDefaultCategories(db, createdUser.id);
        },
      },
    },
  },
  // Ограничение частоты запросов (в т.ч. не больше 3 входов/регистраций за
  // 10 секунд) — защита от перебора паролей. Отключается только для
  // сквозных тестов (playwright.config.ts), которые создают много аккаунтов.
  rateLimit:
    process.env.E2E_DISABLE_RATE_LIMIT === "1" ? { enabled: false } : undefined,
  // nextCookies должен быть последним плагином
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
