/**
 * Месяц в формате YYYY-MM — так период хранится в URL (?period=2026-11).
 * Расширенные периоды (квартал, год, произвольный) — шаг 7.2.
 */
export type MonthKey = string;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(
  value: string | null | undefined,
): value is MonthKey {
  return !!value && MONTH_RE.test(value);
}

export function monthKeyFromDate(date: Date): MonthKey {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${m}`;
}

function parse(key: MonthKey) {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

/** Сдвиг месяца на delta (может быть отрицательным). */
export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parse(key);
  const index = year * 12 + (month - 1) + delta;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long" });

/** «Ноябрь 2026» */
export function formatMonthLabel(key: MonthKey): string {
  const { year, month } = parse(key);
  const name = monthName.format(new Date(year, month - 1, 1));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}
