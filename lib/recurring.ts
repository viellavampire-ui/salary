/**
 * Расписание регулярных операций. k-й повтор считается от даты начала
 * (а не цепочкой от предыдущего), поэтому «31 января каждый месяц» даёт
 * 28/29 февраля, 31 марта, 30 апреля… — день не «сползает».
 */
import type { RecurringFrequency } from "@/db/schema";
import { addDays, addMonths, type ISODate } from "./period";

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Неделя",
  monthly: "Месяц",
  yearly: "Год",
};

/** Сколько пропущенных повторов создавать за одну синхронизацию. */
export const MAX_CATCH_UP = 120;

export function occurrenceDate(
  start: ISODate,
  frequency: RecurringFrequency,
  k: number,
): ISODate {
  switch (frequency) {
    case "weekly":
      return addDays(start, 7 * k);
    case "monthly":
      return addMonths(start, k);
    case "yearly":
      return addMonths(start, 12 * k);
  }
}

export type Schedule = {
  startDate: ISODate;
  frequency: RecurringFrequency;
  endDate: ISODate | null;
  occurrences: number;
  isPaused: boolean;
};

/**
 * Даты, которые пора создать (не позже today и не позже endDate), и новое
 * значение счётчика обработанных повторов.
 */
export function dueOccurrences(
  s: Schedule,
  today: ISODate,
  cap = MAX_CATCH_UP,
): { dates: ISODate[]; occurrences: number } {
  const dates: ISODate[] = [];
  let k = s.occurrences;
  if (s.isPaused) return { dates, occurrences: k };
  while (dates.length < cap) {
    const d = occurrenceDate(s.startDate, s.frequency, k);
    if (d > today || (s.endDate && d > s.endDate)) break;
    dates.push(d);
    k += 1;
  }
  return { dates, occurrences: k };
}

/** Первый повтор не раньше date — чтобы не догонять пропущенное (пауза, смена расписания). */
export function firstIndexOnOrAfter(
  start: ISODate,
  frequency: RecurringFrequency,
  date: ISODate,
): number {
  let k = 0;
  while (occurrenceDate(start, frequency, k) < date) k += 1;
  return k;
}

/** Дата следующего повтора; null — правило завершено. */
export function nextOccurrence(s: Schedule): ISODate | null {
  const d = occurrenceDate(s.startDate, s.frequency, s.occurrences);
  return s.endDate && d > s.endDate ? null : d;
}

const WEEKDAYS_DATIVE = [
  "воскресеньям",
  "понедельникам",
  "вторникам",
  "средам",
  "четвергам",
  "пятницам",
  "субботам",
];

const dayMonth = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** «Каждый месяц, 5-го числа», «Каждую неделю, по пятницам», «Каждый год, 5 ноября». */
export function describeSchedule(
  frequency: RecurringFrequency,
  start: ISODate,
): string {
  const [y, m, d] = start.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  switch (frequency) {
    case "weekly":
      return `Каждую неделю, по ${WEEKDAYS_DATIVE[new Date(utc).getUTCDay()]}`;
    case "monthly":
      return d > 28
        ? `Каждый месяц, ${d}-го числа (в коротких месяцах — в последний день)`
        : `Каждый месяц, ${d}-го числа`;
    case "yearly":
      return `Каждый год, ${dayMonth.format(utc)}`;
  }
}
