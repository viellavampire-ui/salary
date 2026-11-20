import { describe, expect, it } from "vitest";

import {
  formatMonthLabel,
  isMonthKey,
  monthKeyFromDate,
  shiftMonth,
} from "@/lib/period";

describe("period", () => {
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

  it("форматирует название месяца по-русски", () => {
    expect(formatMonthLabel("2026-11")).toBe("Ноябрь 2026");
    expect(formatMonthLabel("2026-03")).toBe("Март 2026");
  });
});
