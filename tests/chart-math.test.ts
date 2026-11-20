import { describe, expect, it } from "vitest";

import {
  areaPath,
  linePath,
  nearestIndex,
  niceStep,
  xTickIndices,
  yTicks,
} from "@/lib/chart-math";

describe("niceStep / yTicks", () => {
  it("шаг кратен 1 / 2 / 2.5 / 5 × 10ⁿ", () => {
    expect(niceStep(100, 4)).toBe(25);
    expect(niceStep(8_600_000, 4)).toBe(2_500_000);
    expect(niceStep(3, 4)).toBe(1);
    expect(niceStep(0, 4)).toBe(1);
  });

  it("деления от нуля до «круглого» максимума", () => {
    expect(yTicks(0, 86)).toEqual({
      ticks: [0, 25, 50, 75, 100],
      min: 0,
      max: 100,
    });
  });

  it("отрицательные значения тоже попадают в домен, ноль — всегда", () => {
    const r = yTicks(-140, 100);
    expect(r.min).toBeLessThanOrEqual(-140);
    expect(r.max).toBeGreaterThanOrEqual(100);
    expect(r.ticks).toContain(0);
  });

  it("все нули — домен 0..1", () => {
    expect(yTicks(0, 0)).toEqual({ ticks: [0, 1], min: 0, max: 1 });
  });
});

describe("пути", () => {
  const pts = [
    { x: 0, y: 10 },
    { x: 5, y: 5 },
    null,
    { x: 15, y: 1 },
    { x: 20, y: 2 },
  ];

  it("linePath разрывает линию на null", () => {
    expect(linePath(pts)).toBe("M0,10L5,5M15,1L20,2");
    expect(linePath([])).toBe("");
  });

  it("areaPath замыкает каждый кусок на базовую линию", () => {
    expect(areaPath(pts, 20)).toBe(
      "M0,20L0,10L5,5L5,20ZM15,20L15,1L20,2L20,20Z",
    );
  });
});

describe("ось X и подсказка", () => {
  it("xTickIndices: первый, последний и равномерно", () => {
    expect(xTickIndices(30, 6)).toEqual([0, 6, 12, 17, 23, 29]);
    expect(xTickIndices(3, 6)).toEqual([0, 1, 2]);
    expect(xTickIndices(0, 6)).toEqual([]);
  });

  it("nearestIndex находит ближайшую точку и не выходит за края", () => {
    expect(nearestIndex(0, 300, 31)).toBe(0);
    expect(nearestIndex(300, 300, 31)).toBe(30);
    expect(nearestIndex(151, 300, 31)).toBe(15);
    expect(nearestIndex(-20, 300, 31)).toBe(0);
    expect(nearestIndex(999, 300, 31)).toBe(30);
    expect(nearestIndex(10, 300, 1)).toBe(0);
  });
});
