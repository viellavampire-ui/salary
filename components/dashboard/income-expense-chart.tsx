"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { formatCompact, formatMoney } from "@/lib/money";
import { formatMonthLabel, type MonthKey } from "@/lib/period";
import { ChartCard, DataTable } from "./chart-card";

export type TrendPoint = {
  month: MonthKey;
  income: number;
  expense: number;
  balance: number;
};

const SERIES = [
  { key: "income", label: "Доходы", color: "var(--chart-income)", mark: "bar" },
  {
    key: "expense",
    label: "Расходы",
    color: "var(--chart-expense)",
    mark: "bar",
  },
  {
    key: "balance",
    label: "Баланс",
    color: "var(--chart-balance)",
    mark: "line",
  },
] as const;

const shortMonth = new Intl.DateTimeFormat("ru-RU", {
  month: "short",
  timeZone: "UTC",
});

/** «нояб.», а для января и первой точки — с годом: «янв. 27». */
function tickLabel(month: MonthKey, index: number) {
  const [y, m] = month.split("-").map(Number);
  const name = shortMonth.format(Date.UTC(y, m - 1, 1));
  return index === 0 || m === 1 ? `${name} ${String(y).slice(2)}` : name;
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

/**
 * Доходы и расходы по месяцам (сгруппированные столбцы) + линия баланса.
 * Одна ось: все три ряда в одной валюте. Легенда всегда видна, значения —
 * в подсказке (вся тройка сразу) и в табличном виде.
 */
export function IncomeExpenseChart({
  data,
  currency,
  selected,
}: {
  data: TrendPoint[];
  currency: string;
  selected: MonthKey;
}) {
  const reducedMotion = useReducedMotion();
  const hasNegative = data.some((d) => d.balance < 0);

  const legend = (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {SERIES.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={
              s.mark === "bar"
                ? "size-2.5 rounded-[2px]"
                : "h-0.5 w-3.5 rounded-full"
            }
            style={{ backgroundColor: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );

  const chart = (
    <div className="h-[280px] w-full">
      <ComposedChart
        responsive
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barGap={2}
        barCategoryGap="28%"
        style={{ width: "100%", height: "100%" }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickFormatter={tickLabel}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={({ x, y, payload, index }) => (
            <text
              x={x}
              y={Number(y) + 14}
              textAnchor="middle"
              fontSize={12}
              fill={
                payload.value === selected
                  ? "var(--foreground)"
                  : "var(--muted-foreground)"
              }
              fontWeight={payload.value === selected ? 600 : 400}
            >
              {tickLabel(payload.value, index)}
            </text>
          )}
          interval="preserveStartEnd"
          minTickGap={8}
        />
        <YAxis
          tickFormatter={(v: number) => formatCompact(v)}
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        {hasNegative && (
          <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        )}
        <Tooltip
          cursor={{ fill: "var(--border)", fillOpacity: 0.5 }}
          content={(props) => <TrendTooltip {...props} currency={currency} />}
          isAnimationActive={false}
        />
        <Bar
          dataKey="income"
          name="Доходы"
          fill="var(--chart-income)"
          radius={[4, 4, 0, 0]}
          maxBarSize={16}
          isAnimationActive={!reducedMotion}
          animationDuration={250}
        />
        <Bar
          dataKey="expense"
          name="Расходы"
          fill="var(--chart-expense)"
          radius={[4, 4, 0, 0]}
          maxBarSize={16}
          isAnimationActive={!reducedMotion}
          animationDuration={250}
        />
        <Line
          dataKey="balance"
          name="Баланс"
          type="monotone"
          stroke="var(--chart-balance)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{
            r: 4,
            fill: "var(--chart-balance)",
            stroke: "var(--surface)",
            strokeWidth: 2,
          }}
          activeDot={{
            r: 5,
            fill: "var(--chart-balance)",
            stroke: "var(--surface)",
            strokeWidth: 2,
          }}
          isAnimationActive={!reducedMotion}
          animationDuration={250}
        />
      </ComposedChart>
    </div>
  );

  const table = (
    <DataTable
      columns={[
        { label: "Месяц" },
        { label: "Доходы", align: "right" },
        { label: "Расходы", align: "right" },
        { label: "Баланс", align: "right" },
      ]}
      rows={[...data]
        .reverse()
        .map((d) => [
          formatMonthLabel(d.month),
          formatMoney(d.income, currency),
          formatMoney(d.expense, currency),
          formatMoney(d.balance, currency),
        ])}
    />
  );

  return (
    <ChartCard
      title="Доходы и расходы"
      description="За последние 12 месяцев"
      legend={legend}
      chart={chart}
      table={table}
    />
  );
}

/** Подсказка: значение — главное, название ряда — второстепенное, ключ-линия цвета. */
function TrendTooltip({
  active,
  payload,
  label,
  currency,
}: TooltipContentProps & { currency: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TrendPoint;
  return (
    <div className="min-w-44 rounded-md border bg-card px-3 py-2 text-xs shadow-popover">
      <p className="mb-1.5 font-medium text-muted-foreground">
        {formatMonthLabel(String(label))}
      </p>
      <ul className="flex flex-col gap-1">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-semibold text-foreground tabular-nums">
              {formatMoney(point[s.key], currency)}
            </span>
            <span className="text-muted-foreground">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
