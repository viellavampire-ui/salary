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

export const auth = betterAuth({
  appName: "Salary",
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
  // nextCookies должен быть последним плагином
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
