import "server-only";

import { db } from "@/db";
import {
  lastMonths,
  monthKeyForDate,
  previousPeriod,
  type Period,
} from "@/lib/period";
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
) {
  const prev = previousPeriod(period, monthStartDay);
  const endMonth = monthKeyForDate(period.to, monthStartDay);

  const [hasAny, kpis, expenses, incomes, trend, recent] = await Promise.all([
    hasAnyTransactions(db, userId),
    getKpis(db, userId, period, prev),
    getCategoryTotals(db, userId, period, "expense"),
    getCategoryTotals(db, userId, period, "income"),
    getMonthlyTrend(db, userId, lastMonths(endMonth, 12), monthStartDay),
    getRecentTransactions(db, userId, period, 5),
  ]);

  return { hasAny, kpis, expenses, incomes, trend, recent, prev, endMonth };
}
