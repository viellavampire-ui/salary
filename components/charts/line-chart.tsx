"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  areaPath,
  linePath,
  nearestIndex,
  xTickIndices,
  yTicks,
  type Point,
} from "@/lib/chart-math";

export type LineSeries = {
  key: string;
  label: string;
  /** CSS-цвет, например var(--chart-bar) */
  color: string;
  /** Заливка ~10% под линией (только для одиночного ряда) */
  area?: boolean;
};

const MARGIN = { top: 8, right: 12, bottom: 24, left: 48 };

/**
 * Лёгкий SVG-график линий/площади без внешних библиотек (вместо ~130 КБ
 * Recharts на странице аналитики). Правила оформления — docs/design.md §8:
 * линии 2px, заливка ~10%, сплошная сетка-волосок, точки r=4 с кольцом цвета
 * фона. Подсказка — вертикальная линия по ближайшей точке и значения всех
 * рядов сразу; с клавиатуры — стрелки ←/→, Home/End.
 */
export function LineChart({
  rows,
  series,
  height,
  ariaLabel,
  xLabel,
  tooltipTitle,
  seriesNote,
  formatValue,
  formatTick,
  maxXTicks = 7,
}: {
  rows: Record<string, number | null>[];
  series: LineSeries[];
  height: number;
  ariaLabel: string;
  /** Подпись деления оси X для точки i */
  xLabel: (i: number) => string;
  /** Заголовок подсказки для точки i */
  tooltipTitle: (i: number) => string;
  /** Пояснение к значению ряда в подсказке (например, дата) */
  seriesNote?: (key: string, i: number) => string;
  formatValue: (v: number) => string;
  formatTick: (v: number) => string;
  maxXTicks?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tipWidth, setTipWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = rows.length;
  const values = rows.flatMap((r) =>
    series.map((s) => r[s.key]).filter((v): v is number => v !== null),
  );
  const domain = yTicks(Math.min(0, ...values), Math.max(0, ...values));
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const x = (i: number) => (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) =>
    innerH - ((v - domain.min) / (domain.max - domain.min)) * innerH;

  const pointsFor = (key: string): Point[] =>
    rows.map((r, i) => {
      const v = r[key];
      return v === null || v === undefined ? null : { x: x(i), y: y(v) };
    });

  const tickIdx = xTickIndices(n, width < 480 ? 5 : maxXTicks);

  function onPointer(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    setActive(nearestIndex(e.clientX - box.left, box.width, n));
  }

  // Последняя точка, где есть хоть одно значение (будущие дни — null)
  let lastData = n - 1;
  while (lastData > 0 && series.every((s) => rows[lastData]?.[s.key] == null)) {
    lastData -= 1;
  }

  function onKey(e: React.KeyboardEvent) {
    const last = n - 1;
    const map: Record<string, (i: number) => number> = {
      ArrowRight: (i) => Math.min(last, i + 1),
      ArrowLeft: (i) => Math.max(0, i - 1),
      Home: () => 0,
      End: () => lastData,
    };
    const move = map[e.key];
    if (!move || n === 0) return;
    e.preventDefault();
    setActive((i) => move(i ?? lastData));
  }

  // Подсказка справа от линии; если не помещается — слева; на узком экране
  // прижимается к краям графика, чтобы не вылезать за карточку
  const lineX = active === null ? 0 : MARGIN.left + x(active);
  const rightSide = lineX + 12;
  const leftSide = lineX - 12 - tipWidth;
  const preferred = rightSide + tipWidth <= width ? rightSide : leftSide;
  const tipLeft = Math.max(0, Math.min(preferred, width - tipWidth));

  useLayoutEffect(() => {
    if (tipRef.current) setTipWidth(tipRef.current.offsetWidth);
  }, [active]);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      aria-roledescription="график"
      tabIndex={0}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
      className="relative w-full rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      style={{ height }}
    >
      {width > 0 && (
        <svg width={width} height={height} aria-hidden className="block">
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {domain.ticks.map((t) => (
              <g key={t}>
                <line
                  x1={0}
                  x2={innerW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? "var(--muted-foreground)" : "var(--border)"}
                  strokeOpacity={t === 0 && domain.min < 0 ? 1 : undefined}
                  shapeRendering="crispEdges"
                />
                <text
                  x={-8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={12}
                  fill="var(--muted-foreground)"
                >
                  {formatTick(t)}
                </text>
              </g>
            ))}

            {tickIdx.map((i, k) => (
              <text
                key={i}
                x={x(i)}
                y={innerH + 16}
                textAnchor={
                  k === 0 && n > 1
                    ? "start"
                    : k === tickIdx.length - 1 && n > 1
                      ? "end"
                      : "middle"
                }
                fontSize={12}
                fill="var(--muted-foreground)"
              >
                {xLabel(i)}
              </text>
            ))}

            {series.map((s) => {
              const pts = pointsFor(s.key);
              return (
                <g key={s.key}>
                  {s.area && (
                    <path
                      d={areaPath(pts, y(Math.max(domain.min, 0)))}
                      fill={s.color}
                      fillOpacity={0.1}
                    />
                  )}
                  <path
                    d={linePath(pts)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {active !== null && (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={0}
                  y2={innerH}
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                />
                {series.map((s) => {
                  const v = rows[active]?.[s.key];
                  if (v === null || v === undefined) return null;
                  return (
                    <circle
                      key={s.key}
                      cx={x(active)}
                      cy={y(v)}
                      r={4}
                      fill={s.color}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    />
                  );
                })}
              </g>
            )}

            {/* Зона наведения шире линий: целиться в 2px не нужно */}
            <rect
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onPointer}
              onPointerDown={onPointer}
              onPointerLeave={() => setActive(null)}
            />
          </g>
        </svg>
      )}

      {active !== null && rows[active] && (
        <div
          ref={tipRef}
          role="status"
          className="pointer-events-none absolute top-2 z-10 max-w-full min-w-40 rounded-md border bg-card px-3 py-2 text-xs shadow-popover"
          style={{ left: tipLeft }}
        >
          <p className="mb-1 font-medium text-muted-foreground">
            {tooltipTitle(active)}
          </p>
          <ul className="flex flex-col gap-1">
            {series.map((s) => {
              const v = rows[active][s.key];
              return (
                <li key={s.key} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-0.5 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">
                    {v === null || v === undefined ? "—" : formatValue(v)}
                  </span>
                  <span className="whitespace-nowrap text-muted-foreground">
                    {seriesNote && v !== null && v !== undefined
                      ? seriesNote(s.key, active)
                      : s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
