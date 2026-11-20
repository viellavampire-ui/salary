import "server-only";

import { db } from "@/db";
import {
  bucketByMonth,
  compareCategories,
  cumulative,
  fillDays,
  trendGranularity,
} from "@/lib/analytics";
import {
  addDays,
  comparableLabel,
  comparableRange,
  daysInRange,
  monthKeyForDate,
  previousPeriod,
  type ISODate,
  type Period,
} from "@/lib/period";
import { getDailyTotals, getTopTransactions } from "@/server/data/analytics";
import { getCategoryTotals, getKpis } from "@/server/data/dashboard";

/** Всё для страницы аналитики за период. userId — из сессии. */
export async function getAnalytics(
  userId: string,
  period: Period,
  monthStartDay: number,
  today: ISODate,
) {
  const prev = previousPeriod(period, monthStartDay);
  // Идущий период сравниваем с тем же числом первых дней прошлого
  const compare = comparableRange(period, prev, today);

  const [kpis, daily, prevDaily, expenses, prevExpenses, incomes, top] =
    await Promise.all([
      getKpis(db, userId, period, compare),
      getDailyTotals(db, userId, period, "expense"),
      getDailyTotals(db, userId, prev, "expense"),
      getCategoryTotals(db, userId, period, "expense"),
      getCategoryTotals(db, userId, compare, "expense"),
      getCategoryTotals(db, userId, period, "income"),
      getTopTransactions(db, userId, period, "expense", 5),
    ]);

  // Динамика: по дням для коротких периодов, по месяцам для длинных
  const granularity = trendGranularity(period);
  // Будущее не рисуем как «ноль трат»: null — разрыв линии до конца оси
  const currentMonth = monthKeyForDate(today, monthStartDay);
  const trend =
    granularity === "day"
      ? fillDays(period, daily).map((d) => ({
          key: d.date,
          total: d.date > today ? null : d.total,
        }))
      : bucketByMonth(period, daily, monthStartDay).map((m) => ({
          key: m.month,
          total: m.month > currentMonth ? null : m.total,
        }));

  // Накопленные расходы: день N текущего периода против дня N прошлого
  // Будущие дни текущего периода не рисуем — иначе линия «замрёт» до конца
  const elapsed =
    today < period.from
      ? 0
      : today > period.to
        ? daysInRange(period)
        : daysInRange({ from: period.from, to: today });
  const current = cumulative(fillDays(period, daily).map((d) => d.total)).slice(
    0,
    elapsed,
  );
  const previous = cumulative(fillDays(prev, prevDaily).map((d) => d.total));
  const length = Math.max(current.length, previous.length);
  const pace = Array.from({ length }, (_, i) => ({
    day: i + 1,
    current: i < current.length ? current[i] : null,
    date: addDays(period.from, i),
    prevDate: addDays(prev.from, i),
    previous: i < previous.length ? previous[i] : null,
  }));

  return {
    prev,
    /** «к 1–20 окт.» — если сравнение с частью прошлого периода */
    compareText: comparableLabel(compare),
    kpis,
    days: daysInRange(period),
    granularity,
    trend,
    pace,
    comparison: compareCategories(expenses, prevExpenses),
    expenses,
    incomes,
    top,
  };
}
