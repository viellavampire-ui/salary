import { describe, expect, it } from "vitest";

import {
  describeSchedule,
  dueOccurrences,
  firstIndexOnOrAfter,
  nextOccurrence,
  occurrenceDate,
} from "@/lib/recurring";

const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("occurrenceDate", () => {
  it("месяц: день не сползает после короткого месяца", () => {
    const dates = [0, 1, 2, 3].map((k) =>
      occurrenceDate("2026-01-31", "monthly", k),
    );
    expect(dates).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("неделя и год", () => {
    expect(occurrenceDate("2026-11-20", "weekly", 2)).toBe("2026-12-04");
    expect(occurrenceDate("2024-02-29", "yearly", 1)).toBe("2025-02-28");
    expect(occurrenceDate("2024-02-29", "yearly", 4)).toBe("2028-02-29");
  });
});

describe("dueOccurrences", () => {
  const base = {
    startDate: "2026-09-05",
    frequency: "monthly" as const,
    endDate: null,
    occurrences: 0,
    isPaused: false,
  };

  it("догоняет прошедшие повторы до сегодняшнего дня включительно", () => {
    expect(dueOccurrences(base, "2026-11-05")).toEqual({
      dates: ["2026-09-05", "2026-10-05", "2026-11-05"],
      occurrences: 3,
    });
    expect(dueOccurrences(base, "2026-11-04").dates).toHaveLength(2);
  });

  it("продолжает с уже обработанных и ничего не повторяет", () => {
    expect(dueOccurrences({ ...base, occurrences: 3 }, "2026-11-20")).toEqual({
      dates: [],
      occurrences: 3,
    });
  });

  it("учитывает дату окончания, паузу и лимит догоняния", () => {
    expect(
      dueOccurrences({ ...base, endDate: "2026-10-31" }, "2026-12-31").dates,
    ).toEqual(["2026-09-05", "2026-10-05"]);
    expect(
      dueOccurrences({ ...base, isPaused: true }, "2026-12-31").dates,
    ).toEqual([]);
    const weekly = {
      ...base,
      frequency: "weekly" as const,
      startDate: "2020-01-01",
    };
    const r = dueOccurrences(weekly, "2026-11-20", 120);
    expect(r.dates).toHaveLength(120);
    expect(r.occurrences).toBe(120);
  });

  it("будущая дата начала — ничего не создаётся", () => {
    expect(
      dueOccurrences({ ...base, startDate: "2027-01-01" }, "2026-11-20").dates,
    ).toEqual([]);
  });
});

describe("firstIndexOnOrAfter / nextOccurrence", () => {
  it("пропускает прошедшие повторы", () => {
    expect(firstIndexOnOrAfter("2026-01-10", "monthly", "2026-11-20")).toBe(11); // 10 декабря
    expect(firstIndexOnOrAfter("2026-01-10", "monthly", "2026-11-10")).toBe(10); // сегодня
    expect(firstIndexOnOrAfter("2027-01-10", "monthly", "2026-11-20")).toBe(0);
  });

  it("следующая дата и завершение", () => {
    const s = {
      startDate: "2026-09-05",
      frequency: "monthly" as const,
      endDate: null,
      occurrences: 3,
      isPaused: false,
    };
    expect(nextOccurrence(s)).toBe("2026-12-05");
    expect(nextOccurrence({ ...s, endDate: "2026-11-30" })).toBeNull();
  });
});

describe("describeSchedule", () => {
  it("по-русски", () => {
    expect(describeSchedule("monthly", "2026-11-05")).toBe(
      "Каждый месяц, 5-го числа",
    );
    expect(describeSchedule("monthly", "2026-01-31")).toBe(
      "Каждый месяц, 31-го числа (в коротких месяцах — в последний день)",
    );
    expect(describeSchedule("weekly", "2026-11-20")).toBe(
      "Каждую неделю, по пятницам",
    );
    expect(plain(describeSchedule("yearly", "2026-11-05"))).toBe(
      "Каждый год, 5 ноября",
    );
  });
});
