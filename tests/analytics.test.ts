import { describe, expect, it } from "vitest";

import {
  bucketByMonth,
  compareCategories,
  cumulative,
  fillDays,
  isFullMonth,
  trendGranularity,
} from "@/lib/analytics";
import {
  nextPeriod,
  parsePeriod,
  periodOfKind,
  periodSearch,
  previousPeriod,
} from "@/lib/period";

const today = new Date(2026, 10, 20);

describe("периоды для аналитики", () => {
  it("periodOfKind сохраняет якорную дату при смене типа", () => {
    expect(periodOfKind("month", "2026-11-20")).toMatchObject({
      key: "2026-11",
    });
    expect(periodOfKind("quarter", "2026-11-20")).toMatchObject({
      key: "2026-Q4",
      from: "2026-10-01",
      to: "2026-12-31",
    });
    expect(periodOfKind("year", "2026-11-20")).toMatchObject({ key: "2026" });
    // финансовый месяц с 10-го: 05.01 — ещё декабрь прошлого года
    expect(periodOfKind("quarter", "2026-01-05", 10)).toMatchObject({
      key: "2025-Q4",
    });
  });

  it("nextPeriod — обратная к previousPeriod", () => {
    for (const params of [
      { period: "2026-01" },
      { period: "2026-Q1" },
      { period: "2026" },
      { from: "2026-11-01", to: "2026-11-10" },
    ]) {
      const p = parsePeriod(params, { today });
      expect(nextPeriod(previousPeriod(p))).toEqual(p);
    }
    expect(nextPeriod(parsePeriod({ period: "2026-Q4" }, { today })).key).toBe(
      "2027-Q1",
    );
  });

  it("periodSearch строит параметры URL", () => {
    expect(periodSearch(parsePeriod({ period: "2026-Q4" }, { today }))).toBe(
      "period=2026-Q4",
    );
    expect(
      periodSearch(
        parsePeriod({ from: "2026-10-01", to: "2026-11-15" }, { today }),
      ),
    ).toBe("from=2026-10-01&to=2026-11-15");
  });
});

describe("ряды для графиков", () => {
  it("fillDays заполняет пропущенные дни нулями", () => {
    expect(
      fillDays({ from: "2026-11-01", to: "2026-11-04" }, [
        { date: "2026-11-02", total: 5 },
        { date: "2026-11-04", total: 7 },
        { date: "2026-12-01", total: 99 },
      ]),
    ).toEqual([
      { date: "2026-11-01", total: 0 },
      { date: "2026-11-02", total: 5 },
      { date: "2026-11-03", total: 0 },
      { date: "2026-11-04", total: 7 },
    ]);
  });

  it("cumulative", () => {
    expect(cumulative([1, 2, 3, 0])).toEqual([1, 3, 6, 6]);
  });

  it("bucketByMonth учитывает финансовый месяц и включает пустые месяцы", () => {
    const rows = [
      { date: "2026-01-05", total: 1 }, // при начале 10-го — декабрь 2025
      { date: "2026-01-15", total: 2 },
      { date: "2026-03-05", total: 4 }, // при начале 10-го — февраль
    ];
    expect(
      bucketByMonth({ from: "2026-01-01", to: "2026-03-31" }, rows),
    ).toEqual([
      { month: "2026-01", total: 3 },
      { month: "2026-02", total: 0 },
      { month: "2026-03", total: 4 },
    ]);
    expect(
      bucketByMonth({ from: "2025-12-10", to: "2026-03-09" }, rows, 10).map(
        (m) => [m.month, m.total],
      ),
    ).toEqual([
      ["2025-12", 1],
      ["2026-01", 2],
      ["2026-02", 4],
    ]);
  });

  it("trendGranularity и isFullMonth", () => {
    expect(trendGranularity({ from: "2026-11-01", to: "2026-11-30" })).toBe(
      "day",
    );
    expect(trendGranularity({ from: "2026-01-01", to: "2026-12-31" })).toBe(
      "month",
    );
    expect(
      isFullMonth("2026-11", { from: "2026-11-01", to: "2026-11-30" }),
    ).toBe(true);
    expect(
      isFullMonth("2026-11", { from: "2026-11-05", to: "2026-12-31" }),
    ).toBe(false);
  });
});

describe("compareCategories", () => {
  const c = (id: string, total: number) => ({
    categoryId: id,
    name: id,
    icon: "Ellipsis",
    color: "slate",
    total,
  });

  it("считает изменение и добавляет категории, исчезнувшие в этом периоде", () => {
    const rows = compareCategories(
      [c("food", 1200), c("cafe", 500)],
      [c("food", 1000), c("taxi", 300)],
    );
    expect(
      rows.map((r) => [r.categoryId, r.total, r.previous, r.delta]),
    ).toEqual([
      ["food", 1200, 1000, 0.2],
      ["cafe", 500, 0, null],
      ["taxi", 0, 300, -1],
    ]);
  });
});

describe("comparableRange", () => {
  const nov = { from: "2026-11-01", to: "2026-11-30" };
  const oct = { from: "2026-10-01", to: "2026-10-31" };

  it("идущий период сравнивается с тем же числом первых дней", async () => {
    const { comparableRange, comparableLabel } = await import("@/lib/period");
    const r = comparableRange(nov, oct, "2026-11-20");
    expect(r).toEqual({ from: "2026-10-01", to: "2026-10-20", partial: true });
    expect(comparableLabel(r)?.replace(/ /g, " ")).toBe("к 1–20 окт.");
  });

  it("для года — полный диапазон в подписи", async () => {
    const { comparableRange, comparableLabel } = await import("@/lib/period");
    const r = comparableRange(
      { from: "2026-01-01", to: "2026-12-31" },
      { from: "2025-01-01", to: "2025-12-31" },
      "2026-11-20",
    );
    expect(r).toEqual({ from: "2025-01-01", to: "2025-11-20", partial: true });
    expect(comparableLabel(r)?.replace(/[\u00a0\u202f]/g, " ")).toBe(
      "к 1 янв. – 20 нояб. 2025",
    );
  });

  it("не выходит за конец прошлого периода (31 марта ↔ февраль)", async () => {
    const { comparableRange } = await import("@/lib/period");
    expect(
      comparableRange(
        { from: "2026-03-01", to: "2026-03-31" },
        { from: "2026-02-01", to: "2026-02-28" },
        "2026-03-30",
      ),
    ).toEqual({ from: "2026-02-01", to: "2026-02-28", partial: true });
  });

  it("завершённый период — прошлый целиком", async () => {
    const { comparableRange, comparableLabel } = await import("@/lib/period");
    const r = comparableRange(
      oct,
      { from: "2026-09-01", to: "2026-09-30" },
      "2026-11-20",
    );
    expect(r).toEqual({ from: "2026-09-01", to: "2026-09-30", partial: false });
    expect(comparableLabel(r)).toBeNull();
    // последний день периода — период уже полный
    expect(comparableRange(nov, oct, "2026-11-30").partial).toBe(false);
  });
});
