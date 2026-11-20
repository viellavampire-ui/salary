/**
 * Чистые функции для страницы аналитики: превращают суммы по дням в ряды
 * для графиков и сравнивают категории с прошлым периодом.
 */
import {
  addDays,
  daysInRange,
  monthKeyForDate,
  monthRange,
  shiftMonth,
  type DateRange,
  type ISODate,
  type MonthKey,
} from "./period";

export type DayTotal = { date: ISODate; total: number };

/** Каждый день диапазона по порядку; дни без операций — 0. */
export function fillDays(range: DateRange, rows: DayTotal[]): DayTotal[] {
  const byDate = new Map(rows.map((r) => [r.date, r.total]));
  return Array.from({ length: daysInRange(range) }, (_, i) => {
    const date = addDays(range.from, i);
    return { date, total: byDate.get(date) ?? 0 };
  });
}

/** Накопительный итог: [1, 2, 3] → [1, 3, 6]. */
export function cumulative(values: number[]): number[] {
  let sum = 0;
  return values.map((v) => (sum += v));
}

/** Суммы по финансовым месяцам, которые пересекаются с диапазоном. */
export function bucketByMonth(
  range: DateRange,
  rows: DayTotal[],
  monthStartDay = 1,
): { month: MonthKey; total: number }[] {
  const first = monthKeyForDate(range.from, monthStartDay);
  const last = monthKeyForDate(range.to, monthStartDay);
  const months: MonthKey[] = [];
  for (let m = first; m <= last; m = shiftMonth(m, 1)) months.push(m);

  const totals = new Map(months.map((m) => [m, 0]));
  for (const r of rows) {
    const key = monthKeyForDate(r.date, monthStartDay);
    if (totals.has(key)) totals.set(key, totals.get(key)! + r.total);
  }
  return months.map((month) => ({ month, total: totals.get(month)! }));
}

/** До ~2 месяцев динамика по дням, длиннее — по месяцам. */
export function trendGranularity(range: DateRange): "day" | "month" {
  return daysInRange(range) <= 62 ? "day" : "month";
}

/** Месяц целиком входит в диапазон? (для подписи «неполный месяц») */
export function isFullMonth(
  month: MonthKey,
  range: DateRange,
  monthStartDay = 1,
) {
  const m = monthRange(month, monthStartDay);
  return m.from >= range.from && m.to <= range.to;
}

export type CategoryAmount = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  total: number;
};

export type CategoryComparison = CategoryAmount & {
  previous: number;
  /** Изменение в долях; null — в прошлом периоде трат не было */
  delta: number | null;
};

/**
 * Сравнение категорий с прошлым периодом. Категории, которые были только
 * в прошлом периоде, тоже попадают в список (с нулём сейчас).
 * Сортировка — по текущей сумме, затем по прошлой.
 */
export function compareCategories(
  current: CategoryAmount[],
  previous: CategoryAmount[],
): CategoryComparison[] {
  const prevById = new Map(previous.map((c) => [c.categoryId, c]));
  const rows: CategoryComparison[] = current.map((c) => {
    const prev = prevById.get(c.categoryId)?.total ?? 0;
    return {
      ...c,
      previous: prev,
      delta: prev > 0 ? (c.total - prev) / prev : null,
    };
  });
  const seen = new Set(current.map((c) => c.categoryId));
  for (const p of previous) {
    if (!seen.has(p.categoryId)) {
      rows.push({ ...p, total: 0, previous: p.total, delta: -1 });
    }
  }
  return rows.sort((a, b) => b.total - a.total || b.previous - a.previous);
}
