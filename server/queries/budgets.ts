import "server-only";

import { db } from "@/db";
import type { DateRange } from "@/lib/period";
import { listBudgetProgress } from "@/server/data/budgets";
import { listCategoriesWithTotals } from "@/server/data/categories";

/**
 * Данные страницы бюджетов: бюджеты с тратами за месяц и категории расходов
 * без бюджета (с их тратами) — чтобы предложить задать лимит.
 */
export async function getBudgetsPage(userId: string, range: DateRange) {
  const [progress, categories] = await Promise.all([
    listBudgetProgress(db, userId, range),
    listCategoriesWithTotals(db, userId, range),
  ]);

  const withBudget = new Set(progress.map((b) => b.categoryId));
  const unbudgeted = categories
    .filter(
      (c) => c.type === "expense" && !c.isArchived && !withBudget.has(c.id),
    )
    .sort((a, b) => b.total - a.total);

  return { progress, unbudgeted };
}

/** Бюджеты для дашборда. */
export async function getBudgetProgress(userId: string, range: DateRange) {
  return listBudgetProgress(db, userId, range);
}
