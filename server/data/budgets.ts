/**
 * Бюджеты: месячный лимит на категорию расходов. Все запросы — по userId.
 * Без "server-only" — проверяется тестами на базе в памяти.
 */
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { budgetStatus } from "@/lib/budgets";
import type { DateRange } from "@/lib/period";

export { WARNING_RATIO, budgetStatus, type BudgetStatus } from "@/lib/budgets";

/**
 * Бюджеты активных категорий с тратами за период, самые «горящие» сверху.
 * Бюджеты архивных категорий сохраняются в базе, но не показываются.
 */
export async function listBudgetProgress(
  db: Database,
  userId: string,
  range: DateRange,
) {
  const rows = await db
    .select({
      categoryId: categories.id,
      name: categories.name,
      icon: categories.icon,
      color: categories.color,
      limit: budgets.amount,
      spent: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(budgets)
    .innerJoin(
      categories,
      and(
        eq(categories.id, budgets.categoryId),
        eq(categories.userId, userId),
        eq(categories.isArchived, false),
      ),
    )
    .leftJoin(
      transactions,
      and(
        eq(transactions.categoryId, budgets.categoryId),
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, range.from),
        lte(transactions.date, range.to),
      ),
    )
    .where(eq(budgets.userId, userId))
    .groupBy(budgets.id)
    .orderBy(asc(categories.sortOrder));

  return rows
    .map((r) => ({
      ...r,
      ratio: r.spent / r.limit,
      status: budgetStatus(r.spent, r.limit),
    }))
    .sort((a, b) => b.ratio - a.ratio);
}

export type BudgetProgress = Awaited<
  ReturnType<typeof listBudgetProgress>
>[number];

async function checkExpenseCategory(
  db: Database,
  userId: string,
  categoryId: string,
) {
  const [category] = await db
    .select({ type: categories.type, isArchived: categories.isArchived })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);

  const error = (message: string) =>
    fail<never>(message, { categoryId: [message] });
  if (!category) return error("Выберите категорию");
  if (category.type !== "expense") {
    return error("Бюджет задаётся только для категорий расходов");
  }
  if (category.isArchived) return error("Категория в архиве");
  return null;
}

/** Создаёт или меняет лимит категории (один бюджет на категорию). */
export async function upsertBudget(
  db: Database,
  userId: string,
  input: { categoryId: string; amount: number },
): Promise<ActionResult<{ categoryId: string }>> {
  const error = await checkExpenseCategory(db, userId, input.categoryId);
  if (error) return error;

  await db
    .insert(budgets)
    .values({ userId, categoryId: input.categoryId, amount: input.amount })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId],
      set: { amount: input.amount },
    });
  return ok({ categoryId: input.categoryId });
}

/** Удаляет бюджет и возвращает его — для кнопки «Отменить». */
export async function deleteBudget(
  db: Database,
  userId: string,
  categoryId: string,
): Promise<ActionResult<{ categoryId: string; amount: number }>> {
  const [deleted] = await db
    .delete(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.categoryId, categoryId)))
    .returning({ categoryId: budgets.categoryId, amount: budgets.amount });
  if (!deleted) return fail("Бюджет не найден");
  return ok(deleted);
}
