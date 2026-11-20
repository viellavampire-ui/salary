/**
 * Данные для аналитики. Все запросы — по userId.
 * Без "server-only" — проверяется тестами на базе в памяти.
 */
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { categories, transactions } from "@/db/schema";
import type { DayTotal } from "@/lib/analytics";
import type { CategoryType } from "@/lib/categories";
import type { DateRange } from "@/lib/period";

function where(userId: string, range: DateRange, type: CategoryType) {
  return and(
    eq(transactions.userId, userId),
    eq(transactions.type, type),
    gte(transactions.date, range.from),
    lte(transactions.date, range.to),
  );
}

/** Суммы операций типа по дням (только дни с операциями). */
export async function getDailyTotals(
  db: Database,
  userId: string,
  range: DateRange,
  type: CategoryType,
): Promise<DayTotal[]> {
  return db
    .select({
      date: transactions.date,
      total: sql<number>`sum(${transactions.amount})`.mapWith(Number),
    })
    .from(transactions)
    .where(where(userId, range, type))
    .groupBy(transactions.date)
    .orderBy(transactions.date);
}

/** Самые крупные операции периода. */
export async function getTopTransactions(
  db: Database,
  userId: string,
  range: DateRange,
  type: CategoryType,
  limit = 5,
) {
  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      note: transactions.note,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(where(userId, range, type))
    .orderBy(desc(transactions.amount), desc(transactions.date))
    .limit(limit);
}
