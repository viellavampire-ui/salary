/**
 * Математика для лёгкого SVG-графика (components/charts/line-chart.tsx):
 * «круглые» деления оси, пути линий с разрывами, выбор подписей оси X.
 */

/** Шаг деления 1 / 2 / 2.5 / 5 × 10ⁿ, при котором выходит ~count делений. */
export function niceStep(range: number, count: number): number {
  if (range <= 0 || !Number.isFinite(range)) return 1;
  const raw = range / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice =
    fraction <= 1
      ? 1
      : fraction <= 2
        ? 2
        : fraction <= 2.5
          ? 2.5
          : fraction <= 5
            ? 5
            : 10;
  return nice * power;
}

/**
 * Деления оси Y от min до max (ноль всегда включён).
 * Возвращает деления и границы домена, совпадающие с крайними делениями.
 */
export function yTicks(
  minValue: number,
  maxValue: number,
  count = 4,
): { ticks: number[]; min: number; max: number } {
  const lo = Math.min(0, minValue);
  const hi = Math.max(0, maxValue);
  if (lo === hi) return { ticks: [0, 1], min: 0, max: 1 };
  const step = niceStep(hi - lo, count);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) {
    ticks.push(Math.round(v / step) * step);
  }
  return { ticks, min, max };
}

export type Point = { x: number; y: number } | null;

/** SVG-путь линии; null — разрыв (будущие дни, нет данных). */
export function linePath(points: Point[]): string {
  let d = "";
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${round(p.x)},${round(p.y)}`;
    pen = true;
  }
  return d;
}

/** Путь заливки под линией до базовой линии y0 — по каждому непрерывному куску. */
export function areaPath(points: Point[], y0: number): string {
  let d = "";
  let segment: { x: number; y: number }[] = [];
  const flush = () => {
    if (segment.length > 0) {
      const first = segment[0];
      const last = segment[segment.length - 1];
      d += `M${round(first.x)},${round(y0)}`;
      for (const p of segment) d += `L${round(p.x)},${round(p.y)}`;
      d += `L${round(last.x)},${round(y0)}Z`;
    }
    segment = [];
  };
  for (const p of points) {
    if (p) segment.push(p);
    else flush();
  }
  flush();
  return d;
}

/** Индексы для подписей оси X: первый, последний и равномерно между ними. */
export function xTickIndices(n: number, maxTicks: number): number[] {
  if (n <= 0) return [];
  if (n <= maxTicks) return Array.from({ length: n }, (_, i) => i);
  const step = (n - 1) / (maxTicks - 1);
  return Array.from({ length: maxTicks }, (_, i) => Math.round(i * step));
}

/** Ближайший индекс точки к координате x (для подсказки). */
export function nearestIndex(x: number, width: number, n: number): number {
  if (n <= 1 || width <= 0) return 0;
  return Math.min(n - 1, Math.max(0, Math.round((x / width) * (n - 1))));
}

function round(v: number) {
  return Math.round(v * 10) / 10;
}
