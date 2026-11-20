import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

import type { CategoryColor, CategoryType } from "@/lib/categories";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull();

/* ───────────── Better Auth (docs/SPEC.md §5.1) ───────────── */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  // Дополнительные поля (lib/auth.ts → user.additionalFields)
  currency: text("currency").default("RUB").notNull(),
  monthStartDay: integer("month_start_day").default(1).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ───────────── Приложение (docs/SPEC.md §5.2–5.4) ───────────── */

export const categories = sqliteTable(
  "category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").$type<CategoryType>().notNull(),
    icon: text("icon").notNull(),
    color: text("color").$type<CategoryColor>().notNull(),
    isArchived: integer("is_archived", { mode: "boolean" })
      .default(false)
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("category_user_type_name_uq").on(t.userId, t.type, t.name),
    index("category_user_type_idx").on(t.userId, t.type),
  ],
);

export const transactions = sqliteTable(
  "transaction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    type: text("type").$type<CategoryType>().notNull(),
    /** Сумма в минимальных единицах валюты (копейках), всегда > 0 */
    amount: integer("amount").notNull(),
    /** YYYY-MM-DD */
    date: text("date").notNull(),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("transaction_user_date_idx").on(t.userId, t.date),
    index("transaction_user_category_date_idx").on(
      t.userId,
      t.categoryId,
      t.date,
    ),
  ],
);

export const budgets = sqliteTable(
  "budget",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    /** Месячный лимит в копейках */
    amount: integer("amount").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("budget_user_category_uq").on(t.userId, t.categoryId)],
);

/**
 * Уведомления в приложении (сейчас — о бюджетах). Уникальный индекс
 * гарантирует: не больше одного уведомления на порог, бюджет и месяц.
 */
export const notifications = sqliteTable(
  "notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** budget_warning — потрачено ≥ 80%, budget_over — лимит превышен */
    kind: text("kind").$type<NotificationKind>().notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    /** Финансовый месяц YYYY-MM */
    month: text("month").notNull(),
    /** Потрачено и лимит в момент срабатывания, в копейках */
    spent: integer("spent").notNull(),
    limit: integer("limit_amount").notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("notification_once_uq").on(
      t.userId,
      t.categoryId,
      t.month,
      t.kind,
    ),
    index("notification_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export type NotificationKind = "budget_warning" | "budget_over";

export type User = typeof user.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
