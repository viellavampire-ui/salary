import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  currentMonthKey,
  daysInRange,
  formatDate,
  formatMonthLabel,
  formatRangeLabel,
  inRange,
  isISODate,
  isMonthKey,
  isValidRange,
  lastMonths,
  monthKeyForDate,
  monthKeyFromDate,
  monthRange,
  normalizeStartDay,
  parsePeriod,
  previousPeriod,
  shiftMonth,
} from "@/lib/period";

const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("календарные даты", () => {
  it("isISODate проверяет существование даты", () => {
    expect(isISODate("2026-11-20")).toBe(true);
    expect(isISODate("2028-02-29")).toBe(true);
    expect(isISODate("2026-02-29")).toBe(false);
    expect(isISODate("2026-04-31")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
    expect(isISODate("2026-1-1")).toBe(false);
    expect(isISODate(null)).toBe(false);
  });

  it("addDays переходит через месяц и год", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("addMonths прилипает к последнему дню месяца", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-11-20", 12)).toBe("2027-11-20");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
  });

  it("daysInRange считает включительно", () => {
    expect(daysInRange({ from: "2026-11-01", to: "2026-11-30" })).toBe(30);
    expect(daysInRange({ from: "2026-11-20", to: "2026-11-20" })).toBe(1);
  });

  it("inRange", () => {
    const r = { from: "2026-11-01", to: "2026-11-30" };
    expect(inRange("2026-11-01", r)).toBe(true);
    expect(inRange("2026-11-30", r)).toBe(true);
    expect(inRange("2026-12-01", r)).toBe(false);
  });
});

describe("месяцы", () => {
  it("проверяет формат YYYY-MM", () => {
    expect(isMonthKey("2026-11")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
    expect(isMonthKey("evil")).toBe(false);
    expect(isMonthKey(null)).toBe(false);
  });

  it("строит ключ месяца из даты", () => {
    expect(monthKeyFromDate(new Date(2026, 0, 15))).toBe("2026-01");
  });

  it("сдвигает месяц через границу года", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(shiftMonth("2026-11", -12)).toBe("2025-11");
  });

  it("календарный месяц (начало 1-го)", () => {
    expect(monthRange("2026-02")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(monthRange("2028-02")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
    expect(monthRange("2026-12")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("финансовый месяц с 10-го числа", () => {
    expect(monthRange("2026-11", 10)).toEqual({
      from: "2026-11-10",
      to: "2026-12-09",
    });
    expect(monthRange("2026-12", 10)).toEqual({
      from: "2026-12-10",
      to: "2027-01-09",
    });
  });

  it("день начала приводится к 1–28", () => {
    expect(normalizeStartDay(31)).toBe(28);
    expect(normalizeStartDay(0)).toBe(1);
    expect(normalizeStartDay(2.5)).toBe(1);
    expect(normalizeStartDay(undefined)).toBe(1);
    expect(monthRange("2026-01", 31)).toEqual({
      from: "2026-01-28",
      to: "2026-02-27",
    });
  });

  it("monthKeyForDate учитывает день начала", () => {
    expect(monthKeyForDate("2026-11-05")).toBe("2026-11");
    expect(monthKeyForDate("2026-11-05", 10)).toBe("2026-10");
    expect(monthKeyForDate("2026-11-10", 10)).toBe("2026-11");
    expect(monthKeyForDate("2026-01-05", 10)).toBe("2025-12");
    expect(currentMonthKey(new Date(2026, 10, 5), 10)).toBe("2026-10");
  });

  it("lastMonths — по возрастанию, через границу года", () => {
    expect(lastMonths("2026-02", 4)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(lastMonths("2026-11", 12)).toHaveLength(12);
  });
});

describe("подписи", () => {
  it("форматирует название месяца по-русски", () => {
    expect(formatMonthLabel("2026-11")).toBe("Ноябрь 2026");
    expect(formatMonthLabel("2026-03")).toBe("Март 2026");
  });

  it("formatDate и formatRangeLabel", () => {
    expect(plain(formatDate("2026-11-20"))).toBe("20 нояб. 2026");
    expect(
      plain(formatRangeLabel({ from: "2026-10-01", to: "2026-11-15" })),
    ).toBe("1 окт. – 15 нояб. 2026");
    expect(
      plain(formatRangeLabel({ from: "2025-12-20", to: "2026-01-10" })),
    ).toBe("20 дек. 2025 – 10 янв. 2026");
  });
});

describe("parsePeriod", () => {
  const today = new Date(2026, 10, 20); // 20 ноября 2026

  it("без параметров — текущий месяц", () => {
    expect(parsePeriod({}, { today })).toMatchObject({
      kind: "month",
      key: "2026-11",
      from: "2026-11-01",
      to: "2026-11-30",
      label: "Ноябрь 2026",
    });
  });

  it("без параметров, начало месяца 25-го — текущий финансовый месяц", () => {
    expect(parsePeriod({}, { today, monthStartDay: 25 })).toMatchObject({
      key: "2026-10",
      from: "2026-10-25",
      to: "2026-11-24",
    });
  });

  it("месяц, квартал, год", () => {
    expect(parsePeriod({ period: "2026-03" }, { today })).toMatchObject({
      kind: "month",
      from: "2026-03-01",
      to: "2026-03-31",
    });
    expect(parsePeriod({ period: "2026-Q4" }, { today })).toMatchObject({
      kind: "quarter",
      label: "IV квартал 2026",
      from: "2026-10-01",
      to: "2026-12-31",
    });
    expect(parsePeriod({ period: "2026" }, { today })).toMatchObject({
      kind: "year",
      label: "2026 год",
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("год при начале месяца 10-го", () => {
    expect(
      parsePeriod({ period: "2026" }, { today, monthStartDay: 10 }),
    ).toMatchObject({
      from: "2026-01-10",
      to: "2027-01-09",
    });
  });

  it("произвольный период приоритетнее period", () => {
    expect(
      parsePeriod(
        { period: "2026-03", from: "2026-10-01", to: "2026-11-15" },
        { today },
      ),
    ).toMatchObject({ kind: "custom", key: "2026-10-01_2026-11-15" });
  });

  it.each([
    [{ period: "evil" }],
    [{ period: "2026-Q5" }],
    [{ from: "2026-11-15", to: "2026-10-01" }],
    [{ from: "2026-02-30", to: "2026-03-01" }],
    [{ from: "2000-01-01", to: "2026-01-01" }],
    [{ from: "2026-10-01" }],
  ])("некорректное %j → текущий месяц", (params) => {
    expect(parsePeriod(params, { today }).key).toBe("2026-11");
  });

  it("isValidRange ограничивает длину пятью годами", () => {
    expect(isValidRange("2021-01-01", "2025-12-31")).toBe(true);
    expect(isValidRange("2019-01-01", "2025-12-31")).toBe(false);
  });
});

describe("previousPeriod", () => {
  const today = new Date(2026, 10, 20);

  it("месяц → прошлый месяц", () => {
    const p = parsePeriod({ period: "2026-01" }, { today });
    expect(previousPeriod(p)).toMatchObject({
      key: "2025-12",
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("квартал → прошлый квартал, через год", () => {
    const p = parsePeriod({ period: "2026-Q1" }, { today });
    expect(previousPeriod(p)).toMatchObject({
      key: "2025-Q4",
      from: "2025-10-01",
      to: "2025-12-31",
    });
  });

  it("год → прошлый год", () => {
    expect(previousPeriod(parsePeriod({ period: "2026" }, { today })).key).toBe(
      "2025",
    );
  });

  it("произвольный → столько же дней непосредственно перед ним", () => {
    const p = parsePeriod({ from: "2026-11-01", to: "2026-11-10" }, { today });
    expect(previousPeriod(p)).toMatchObject({
      from: "2026-10-22",
      to: "2026-10-31",
    });
  });

  it("учитывает день начала месяца", () => {
    const p = parsePeriod({ period: "2026-11" }, { today, monthStartDay: 10 });
    expect(previousPeriod(p, 10)).toMatchObject({
      from: "2026-10-10",
      to: "2026-11-09",
    });
  });
});
