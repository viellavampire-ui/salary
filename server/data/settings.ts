/**
 * Настройки пользователя и выгрузка данных. Все запросы — по userId.
 * Без "server-only" — проверяется тестами на базе в памяти.
 */
import { and, asc, eq, gte, lte } from "drizzle-orm";

import type { Database } from "@/db";
import { account, categories, transactions, user } from "@/db/schema";
import type { ExportRow } from "@/lib/csv";
import type { CurrencyCode } from "@/lib/money";
import type { DateRange } from "@/lib/period";

export async function updateSettings(
  db: Database,
  userId: string,
  input: { currency: CurrencyCode; monthStartDay: number },
) {
  await db
    .update(user)
    .set({ currency: input.currency, monthStartDay: input.monthStartDay })
    .where(eq(user.id, userId));
}

/** Есть ли у пользователя вход по паролю (а не только через Google). */
export async function hasPasswordLogin(db: Database, userId: string) {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential")),
    )
    .limit(1);
  return Boolean(row);
}

/** Все операции для выгрузки, по дате. range = null — за всё время. */
export async function listForExport(
  db: Database,
  userId: string,
  range: DateRange | null,
): Promise<ExportRow[]> {
  return db
    .select({
      date: transactions.date,
      type: transactions.type,
      categoryName: categories.name,
      amount: transactions.amount,
      note: transactions.note,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        range ? gte(transactions.date, range.from) : undefined,
        range ? lte(transactions.date, range.to) : undefined,
      ),
    )
    .orderBy(asc(transactions.date), asc(transactions.createdAt));
}
