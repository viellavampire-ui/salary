import "server-only";

import { db } from "@/db";
import {
  comparableLabel,
  comparableRange,
  lastMonths,
  monthKeyForDate,
  previousPeriod,
  type ISODate,
  type Period,
} from "@/lib/period";
import { listBudgetProgress } from "@/server/data/budgets";
import {
  getCategoryTotals,
  getKpis,
  getMonthlyTrend,
  getRecentTransactions,
  hasAnyTransactions,
} from "@/server/data/dashboard";

/** Все данные дашборда за период одним вызовом. userId — из сессии. */
export async function getDashboard(
  userId: string,
  period: Period,
  monthStartDay: number,
  today: ISODate,
) {
  const prev = previousPeriod(period, monthStartDay);
  // Идущий период сравниваем с тем же числом первых дней прошлого
  const compare = comparableRange(period, prev, today);
  const endMonth = monthKeyForDate(period.to, monthStartDay);

  const [hasAny, kpis, expenses, incomes, trend, recent, budgets] =
    await Promise.all([
      hasAnyTransactions(db, userId),
      getKpis(db, userId, period, compare),
      getCategoryTotals(db, userId, period, "expense"),
      getCategoryTotals(db, userId, period, "income"),
      getMonthlyTrend(db, userId, lastMonths(endMonth, 12), monthStartDay),
      getRecentTransactions(db, userId, period, 5),
      // Бюджеты месячные: показываем их только для месяца
      period.kind === "month"
        ? listBudgetProgress(db, userId, period)
        : Promise.resolve([]),
    ]);

  return {
    hasAny,
    kpis,
    expenses,
    incomes,
    trend,
    recent,
    budgets,
    prev,
    endMonth,
    /** «к 1–20 окт.» — если сравнение с частью прошлого периода */
    compareText: comparableLabel(compare),
  };
}
