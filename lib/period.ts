/**
 * Периоды и календарные даты (docs/SPEC.md §8).
 *
 * Даты операций хранятся строками YYYY-MM-DD (без времени и часового пояса),
 * поэтому вся арифметика здесь календарная: через Date.UTC, чтобы часовой
 * пояс сервера или браузера ничего не сдвигал.
 *
 * «Финансовый месяц» может начинаться не 1-го числа (monthStartDay, например
 * в день зарплаты). Месяц называется по тому календарному месяцу, в котором
 * он начинается: при monthStartDay = 10 «Ноябрь 2026» — это 10.11–09.12.
 */

/** YYYY-MM-DD */
export type ISODate = string;
/** YYYY-MM */
export type MonthKey = string;

export type DateRange = { from: ISODate; to: ISODate };

export type PeriodKind = "month" | "quarter" | "year" | "custom";

export type Period = DateRange & {
  kind: PeriodKind;
  /** Значение для URL: «2026-11», «2026-Q4», «2026», «2026-10-01_2026-11-15» */
  key: string;
  label: string;
};

export const MIN_MONTH_START_DAY = 1;
/** Не больше 28, чтобы день существовал в любом месяце, включая февраль. */
export const MAX_MONTH_START_DAY = 28;

/** Самый длинный произвольный период — 5 лет. */
const MAX_CUSTOM_DAYS = 366 * 5;

const DAY_MS = 86_400_000;

/* ───────────── Календарные даты ───────────── */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const QUARTER_RE = /^(\d{4})-Q([1-4])$/;
const YEAR_RE = /^(\d{4})$/;

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseDate(iso: ISODate) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toUTC(iso: ISODate) {
  const { y, m, d } = parseDate(iso);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): ISODate {
  const date = new Date(ms);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Проверяет формат YYYY-MM-DD и что такая дата существует (нет 31.02). */
export function isISODate(value: string | null | undefined): value is ISODate {
  const match = value ? DATE_RE.exec(value) : null;
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** Локальная календарная дата объекта Date (как её видит пользователь). */
export function toISODate(date: Date): ISODate {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromUTC(toUTC(iso) + days * DAY_MS);
}

/** Количество дней в диапазоне включительно: 01.11–30.11 → 30. */
export function daysInRange({ from, to }: DateRange): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS) + 1;
}

/** Сдвиг на месяцы с «прилипанием» к последнему дню: 31.01 + 1 мес → 28.02. */
export function addMonths(iso: ISODate, months: number): ISODate {
  const { y, m, d } = parseDate(iso);
  const index = y * 12 + (m - 1) + months;
  const ny = Math.floor(index / 12);
  const nm = (index % 12) + 1;
  return `${pad(ny, 4)}-${pad(nm)}-${pad(Math.min(d, daysInMonth(ny, nm)))}`;
}

/* ───────────── Месяцы ───────────── */

export function isMonthKey(
  value: string | null | undefined,
): value is MonthKey {
  return !!value && MONTH_RE.test(value);
}

/** Календарный месяц локальной даты: 15.01.2026 → «2026-01». */
export function monthKeyFromDate(date: Date): MonthKey {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}`;
}

function parseMonth(key: MonthKey) {
  const [y, m] = key.split("-").map(Number);
  return { y, m };
}

/** Сдвиг месяца на delta (может быть отрицательным). */
export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const { y, m } = parseMonth(key);
  const index = y * 12 + (m - 1) + delta;
  return `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`;
}

/** Приводит день начала месяца к допустимому диапазону 1–28. */
export function normalizeStartDay(day: number | null | undefined): number {
  if (!Number.isInteger(day)) return MIN_MONTH_START_DAY;
  return Math.min(
    MAX_MONTH_START_DAY,
    Math.max(MIN_MONTH_START_DAY, day as number),
  );
}

/** Границы финансового месяца. */
export function monthRange(key: MonthKey, monthStartDay = 1): DateRange {
  const start = normalizeStartDay(monthStartDay);
  const { y, m } = parseMonth(key);
  const from = `${pad(y, 4)}-${pad(m)}-${pad(start)}`;
  const nextStart = `${shiftMonth(key, 1)}-${pad(start)}`;
  return { from, to: addDays(nextStart, -1) };
}

/** К какому финансовому месяцу относится дата. */
export function monthKeyForDate(iso: ISODate, monthStartDay = 1): MonthKey {
  const { y, m, d } = parseDate(iso);
  const key = `${pad(y, 4)}-${pad(m)}`;
  return d >= normalizeStartDay(monthStartDay) ? key : shiftMonth(key, -1);
}

/** Текущий финансовый месяц пользователя. */
export function currentMonthKey(today: Date = new Date(), monthStartDay = 1) {
  return monthKeyForDate(toISODate(today), monthStartDay);
}

/** n месяцев, заканчивая endKey, по возрастанию: для графика «12 месяцев». */
export function lastMonths(endKey: MonthKey, n: number): MonthKey[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(endKey, i - n + 1));
}

/* ───────────── Подписи ───────────── */

const monthName = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const shortDateYear = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** «Ноябрь 2026» */
export function formatMonthLabel(key: MonthKey): string {
  const { y, m } = parseMonth(key);
  return `${capitalize(monthName.format(Date.UTC(y, m - 1, 1)))} ${y}`;
}

/** «20 нояб. 2026 г.» → «20 нояб. 2026» */
export function formatDate(iso: ISODate): string {
  return shortDateYear.format(toUTC(iso)).replace(/\s?г\.$/, "");
}

/** «1 окт. – 15 нояб. 2026», «20 дек. 2025 – 10 янв. 2026» */
export function formatRangeLabel({ from, to }: DateRange): string {
  if (from === to) return formatDate(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const left = sameYear ? shortDate.format(toUTC(from)) : formatDate(from);
  return `${left} – ${formatDate(to)}`;
}

const ROMAN = ["I", "II", "III", "IV"];

/* ───────────── Периоды ───────────── */

export function monthPeriod(key: MonthKey, monthStartDay = 1): Period {
  return {
    kind: "month",
    key,
    label: formatMonthLabel(key),
    ...monthRange(key, monthStartDay),
  };
}

export function quarterPeriod(
  year: number,
  quarter: number,
  monthStartDay = 1,
): Period {
  const first = `${pad(year, 4)}-${pad(quarter * 3 - 2)}`;
  return {
    kind: "quarter",
    key: `${pad(year, 4)}-Q${quarter}`,
    label: `${ROMAN[quarter - 1]} квартал ${year}`,
    from: monthRange(first, monthStartDay).from,
    to: monthRange(shiftMonth(first, 2), monthStartDay).to,
  };
}

export function yearPeriod(year: number, monthStartDay = 1): Period {
  const first = `${pad(year, 4)}-01`;
  return {
    kind: "year",
    key: pad(year, 4),
    label: `${year} год`,
    from: monthRange(first, monthStartDay).from,
    to: monthRange(shiftMonth(first, 11), monthStartDay).to,
  };
}

export function customPeriod(range: DateRange): Period {
  return {
    kind: "custom",
    key: `${range.from}_${range.to}`,
    label: formatRangeLabel(range),
    ...range,
  };
}

/** Корректен ли произвольный диапазон: обе даты существуют, from ≤ to, не длиннее 5 лет. */
export function isValidRange(
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  return (
    isISODate(from) &&
    isISODate(to) &&
    from <= to &&
    daysInRange({ from, to }) <= MAX_CUSTOM_DAYS
  );
}

/**
 * Период из параметров URL. Поддерживает:
 *   ?period=2026-11 | 2026-Q4 | 2026     — месяц, квартал, год
 *   ?from=2026-10-01&to=2026-11-15        — произвольный (приоритетнее period)
 * Если ничего не задано или значение некорректно — текущий финансовый месяц.
 */
export function parsePeriod(
  params: {
    period?: string | null;
    from?: string | null;
    to?: string | null;
  },
  {
    today = new Date(),
    monthStartDay = 1,
  }: { today?: Date; monthStartDay?: number } = {},
): Period {
  const { period, from, to } = params;

  if (isValidRange(from, to)) {
    return customPeriod({ from: from!, to: to! });
  }
  if (period) {
    if (isMonthKey(period)) return monthPeriod(period, monthStartDay);

    const q = QUARTER_RE.exec(period);
    if (q) return quarterPeriod(Number(q[1]), Number(q[2]), monthStartDay);

    if (YEAR_RE.test(period)) return yearPeriod(Number(period), monthStartDay);
  }
  return monthPeriod(currentMonthKey(today, monthStartDay), monthStartDay);
}

/** Предыдущий период такой же длины — для сравнения «к прошлому периоду». */
export function previousPeriod(p: Period, monthStartDay = 1): Period {
  switch (p.kind) {
    case "month":
      return monthPeriod(shiftMonth(p.key, -1), monthStartDay);
    case "quarter": {
      const [y, q] = p.key.split("-Q").map(Number);
      return q === 1
        ? quarterPeriod(y - 1, 4, monthStartDay)
        : quarterPeriod(y, q - 1, monthStartDay);
    }
    case "year":
      return yearPeriod(Number(p.key) - 1, monthStartDay);
    case "custom": {
      const length = daysInRange(p);
      const to = addDays(p.from, -1);
      return customPeriod({ from: addDays(to, -(length - 1)), to });
    }
  }
}

/** Входит ли дата в диапазон (включительно). */
export function inRange(iso: ISODate, { from, to }: DateRange): boolean {
  return iso >= from && iso <= to;
}

const dayHeader = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** Заголовок дня в списке операций: «пт, 20 ноября» (+ год, если не текущий). */
export function formatDayHeader(iso: ISODate, currentYear?: number): string {
  const label = dayHeader.format(toUTC(iso));
  const year = Number(iso.slice(0, 4));
  return currentYear && year !== currentYear ? `${label} ${year}` : label;
}
