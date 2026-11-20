"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { ChartCard, DataTable } from "@/components/dashboard/chart-card";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatDate, formatMonthLabel } from "@/lib/period";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

const shortMonth = new Intl.DateTimeFormat("ru-RU", {
  month: "short",
  timeZone: "UTC",
});

function monthTick(key: string) {
  const [y, m] = key.split("-").map(Number);
  const name = shortMonth.format(Date.UTC(y, m - 1, 1));
  return m === 1 ? `${name} ${String(y).slice(2)}` : name;
}

const axisProps = {
  tickLine: false,
  tick: { fontSize: 12, fill: "var(--muted-foreground)" },
} as const;

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-40 rounded-md border bg-card px-3 py-2 text-xs shadow-popover">
      {children}
    </div>
  );
}

/* ───────────── Динамика расходов (одна серия → area) ───────────── */

export type TrendPoint = { key: string; total: number | null };

/**
 * Расходы по дням (короткий период) или по месяцам (длинный).
 * Одна серия: линия 2px + заливка ~10%, легенда не нужна — её роль у заголовка.
 */
export function ExpenseTrendChart({
  data,
  granularity,
  currency,
}: {
  data: TrendPoint[];
  granularity: "day" | "month";
  currency: string;
}) {
  const reducedMotion = useReducedMotion();
  const label = (key: string) =>
    granularity === "day" ? formatDate(key) : formatMonthLabel(key);
  const tick = (key: string) =>
    granularity === "day" ? String(Number(key.slice(8))) : monthTick(key);

  const chart = (
    <div className="h-[260px] w-full">
      <AreaChart
        responsive
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        style={{ width: "100%", height: "100%" }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="key"
          tickFormatter={tick}
          axisLine={{ stroke: "var(--border)" }}
          interval="preserveStartEnd"
          minTickGap={16}
          {...axisProps}
        />
        <YAxis
          tickFormatter={(v: number) => formatCompact(v)}
          axisLine={false}
          width={48}
          {...axisProps}
        />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
          isAnimationActive={false}
          content={({ active, payload }: TooltipContentProps) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as TrendPoint;
            if (p.total === null) return null;
            return (
              <TooltipBox>
                <p className="mb-1 font-medium text-muted-foreground">
                  {label(p.key)}
                </p>
                <p className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-0.5 w-3 rounded-full bg-chart-bar"
                  />
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatMoney(p.total, currency)}
                  </span>
                  <span className="text-muted-foreground">расходы</span>
                </p>
              </TooltipBox>
            );
          }}
        />
        <Area
          dataKey="total"
          type="linear"
          stroke="var(--chart-bar)"
          strokeWidth={2}
          fill="var(--chart-bar)"
          fillOpacity={0.1}
          activeDot={{
            r: 5,
            fill: "var(--chart-bar)",
            stroke: "var(--surface)",
            strokeWidth: 2,
          }}
          isAnimationActive={!reducedMotion}
          animationDuration={250}
        />
      </AreaChart>
    </div>
  );

  const table = (
    <DataTable
      columns={[
        { label: granularity === "day" ? "День" : "Месяц" },
        { label: "Расходы", align: "right" },
      ]}
      rows={data
        .filter(
          (d) => d.total !== null && (granularity === "month" || d.total > 0),
        )
        .map((d) => [label(d.key), formatMoney(d.total ?? 0, currency)])}
    />
  );

  return (
    <ChartCard
      title="Динамика расходов"
      description={granularity === "day" ? "По дням" : "По месяцам"}
      chart={chart}
      table={table}
    />
  );
}

/* ───────────── Накопленные расходы: текущий vs прошлый ───────────── */

export type PacePoint = {
  day: number;
  current: number | null;
  previous: number | null;
  date: string;
  prevDate: string;
};

/**
 * Приём «выделение»: текущий период — акцентный цвет, прошлый — серый.
 * День N текущего периода сравнивается с днём N прошлого.
 */
export function PaceChart({
  data,
  currency,
  currentLabel,
  previousLabel,
}: {
  data: PacePoint[];
  currency: string;
  currentLabel: string;
  previousLabel: string;
}) {
  const reducedMotion = useReducedMotion();
  const series = [
    { key: "current", label: currentLabel, color: "var(--chart-bar)" },
    { key: "previous", label: previousLabel, color: "var(--chart-previous)" },
  ] as const;

  const legend = (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-0.5 w-3.5 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );

  const chart = (
    <div className="h-[260px] w-full">
      <LineChart
        responsive
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        style={{ width: "100%", height: "100%" }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="day"
          axisLine={{ stroke: "var(--border)" }}
          interval="preserveStartEnd"
          minTickGap={16}
          tickFormatter={(d: number) => `${d}`}
          {...axisProps}
        />
        <YAxis
          tickFormatter={(v: number) => formatCompact(v)}
          axisLine={false}
          width={48}
          {...axisProps}
        />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
          isAnimationActive={false}
          content={({ active, payload }: TooltipContentProps) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PacePoint;
            return (
              <TooltipBox>
                <p className="mb-1 font-medium text-muted-foreground">
                  День {p.day}
                </p>
                <ul className="flex flex-col gap-1">
                  {series.map((s) => {
                    const value = p[s.key];
                    return (
                      <li key={s.key} className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-0.5 w-3 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="font-semibold text-foreground tabular-nums">
                          {value === null ? "—" : formatMoney(value, currency)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDate(
                            s.key === "current" ? p.date : p.prevDate,
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </TooltipBox>
            );
          }}
        />
        <Line
          dataKey="previous"
          stroke="var(--chart-previous)"
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 4,
            fill: "var(--chart-previous)",
            stroke: "var(--surface)",
            strokeWidth: 2,
          }}
          isAnimationActive={!reducedMotion}
          animationDuration={250}
        />
        <Line
          dataKey="current"
          stroke="var(--chart-bar)"
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 5,
            fill: "var(--chart-bar)",
            stroke: "var(--surface)",
            strokeWidth: 2,
          }}
          isAnimationActive={!reducedMotion}
          animationDuration={250}
        />
      </LineChart>
    </div>
  );

  const last = [...data].reverse().find((d) => d.current !== null);
  const table = (
    <DataTable
      columns={[
        { label: "День" },
        { label: currentLabel, align: "right" },
        { label: previousLabel, align: "right" },
      ]}
      rows={data
        .filter((d) => d.day % 5 === 0 || d.day === 1 || d === last)
        .map((d) => [
          String(d.day),
          d.current === null ? "—" : formatMoney(d.current, currency),
          d.previous === null ? "—" : formatMoney(d.previous, currency),
        ])}
    />
  );

  return (
    <ChartCard
      title="Накопленные расходы"
      description="Сколько потрачено к N-му дню периода"
      legend={legend}
      chart={chart}
      table={table}
    />
  );
}
