/**
 * Агрегаты для дашборда (docs/SPEC.md §8). Все запросы — по userId.
 * Без "server-only" — проверяется тестами на базе в памяти.
 */
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { categories, transactions } from "@/db/schema";
import type { CategoryType } from "@/lib/categories";
import {
  monthKeyForDate,
  monthRange,
  type DateRange,
  type MonthKey,
} from "@/lib/period";

const sumOf = (type: CategoryType) =>
  sql<number>`coalesce(sum(case when ${transactions.type} = ${type} then ${transactions.amount} end), 0)`.mapWith(
    Number,
  );

function inRange(userId: string, range: DateRange) {
  return and(
    eq(transactions.userId, userId),
    gte(transactions.date, range.from),
    lte(transactions.date, range.to),
  );
}

/** Доходы и расходы за диапазон. */
export async function sumTotals(
  db: Database,
  userId: string,
  range: DateRange,
) {
  const [row] = await db
    .select({ income: sumOf("income"), expense: sumOf("expense") })
    .from(transactions)
    .where(inRange(userId, range));
  return row;
}

export type Kpis = {
  income: number;
  expense: number;
  balance: number;
  /** Доля сбережений: (доход − расход) / доход; null, если доходов нет */
  savingsRate: number | null;
  /** Изменение к прошлому периоду в долях (0.12 = +12%); null, если не с чем сравнить */
  incomeDelta: number | null;
  expenseDelta: number | null;
  previous: { income: number; expense: number; balance: number };
};

function delta(current: number, previous: number) {
  return previous > 0 ? (current - previous) / previous : null;
}

/** Показатели за период и сравнение с предыдущим периодом. */
export async function getKpis(
  db: Database,
  userId: string,
  period: DateRange,
  previous: DateRange,
): Promise<Kpis> {
  const [cur, prev] = await Promise.all([
    sumTotals(db, userId, period),
    sumTotals(db, userId, previous),
  ]);
  return {
    income: cur.income,
    expense: cur.expense,
    balance: cur.income - cur.expense,
    savingsRate:
      cur.income > 0 ? (cur.income - cur.expense) / cur.income : null,
    incomeDelta: delta(cur.income, prev.income),
    expenseDelta: delta(cur.expense, prev.expense),
    previous: {
      income: prev.income,
      expense: prev.expense,
      balance: prev.income - prev.expense,
    },
  };
}

/** Суммы по категориям за диапазон, по убыванию. */
export async function getCategoryTotals(
  db: Database,
  userId: string,
  range: DateRange,
  type: CategoryType,
) {
  return db
    .select({
      categoryId: categories.id,
      name: categories.name,
      icon: categories.icon,
      color: categories.color,
      total: sql<number>`sum(${transactions.amount})`.mapWith(Number),
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(inRange(userId, range), eq(transactions.type, type)))
    .groupBy(categories.id)
    .orderBy(desc(sql`sum(${transactions.amount})`), categories.name);
}

export type CategoryTotal = Awaited<
  ReturnType<typeof getCategoryTotals>
>[number];

export type MonthPoint = {
  month: MonthKey;
  income: number;
  expense: number;
  balance: number;
};

/**
 * Доходы, расходы и баланс по финансовым месяцам (по возрастанию).
 * Суммы считаются по дням в SQL и раскладываются по месяцам здесь —
 * так корректно учитывается месяц, начинающийся не 1-го числа.
 */
export async function getMonthlyTrend(
  db: Database,
  userId: string,
  months: MonthKey[],
  monthStartDay = 1,
): Promise<MonthPoint[]> {
  if (months.length === 0) return [];
  const range = {
    from: monthRange(months[0], monthStartDay).from,
    to: monthRange(months.at(-1)!, monthStartDay).to,
  };

  const days = await db
    .select({
      date: transactions.date,
      income: sumOf("income"),
      expense: sumOf("expense"),
    })
    .from(transactions)
    .where(inRange(userId, range))
    .groupBy(transactions.date);

  const byMonth = new Map(
    months.map((m) => [m, { month: m, income: 0, expense: 0, balance: 0 }]),
  );
  for (const d of days) {
    const point = byMonth.get(monthKeyForDate(d.date, monthStartDay));
    if (!point) continue;
    point.income += d.income;
    point.expense += d.expense;
  }
  for (const p of byMonth.values()) p.balance = p.income - p.expense;
  return [...byMonth.values()];
}

/** Последние операции периода. */
export async function getRecentTransactions(
  db: Database,
  userId: string,
  range: DateRange,
  limit = 5,
) {
  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      note: transactions.note,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(inRange(userId, range))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);
}

/** Есть ли у пользователя хоть одна операция (для пустого состояния). */
export async function hasAnyTransactions(db: Database, userId: string) {
  const [row] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .limit(1);
  return Boolean(row);
}
