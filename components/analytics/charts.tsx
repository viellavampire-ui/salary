"use client";

import { LineChart, type LineSeries } from "@/components/charts/line-chart";
import { ChartCard, DataTable } from "@/components/dashboard/chart-card";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatDate, formatMonthLabel } from "@/lib/period";

/*
 * Графики аналитики на лёгком SVG-компоненте (components/charts/line-chart),
 * без Recharts: на этой странице оба графика на первом экране, и библиотека
 * в ~130 КБ заметно задерживала страницу на телефонах.
 */

const shortMonth = new Intl.DateTimeFormat("ru-RU", {
  month: "short",
  timeZone: "UTC",
});

function monthTick(key: string) {
  const [y, m] = key.split("-").map(Number);
  const name = shortMonth.format(Date.UTC(y, m - 1, 1));
  return m === 1 ? `${name} ${String(y).slice(2)}` : name;
}

/* ───────────── Динамика расходов (одна серия → area) ───────────── */

export type TrendPoint = { key: string; total: number | null };

/**
 * Расходы по дням (короткий период) или по месяцам (длинный).
 * Одна серия: линия 2px + заливка ~10%, легенда не нужна — её роль у заголовка.
 * Будущие дни/месяцы — null: линия обрывается, а не падает в ноль.
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
  const label = (key: string) =>
    granularity === "day" ? formatDate(key) : formatMonthLabel(key);
  const tick = (key: string) =>
    granularity === "day" ? String(Number(key.slice(8))) : monthTick(key);

  const series: LineSeries[] = [
    {
      key: "total",
      label: "расходы",
      color: "var(--chart-bar)",
      area: true,
    },
  ];

  const chart = (
    <LineChart
      rows={data.map((d) => ({ total: d.total }))}
      series={series}
      height={260}
      ariaLabel={`Динамика расходов ${granularity === "day" ? "по дням" : "по месяцам"}. Стрелки влево и вправо показывают значения, все значения — в табличном виде.`}
      xLabel={(i) => tick(data[i].key)}
      tooltipTitle={(i) => label(data[i].key)}
      formatValue={(v) => formatMoney(v, currency)}
      formatTick={formatCompact}
    />
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
  // Серый — первым, чтобы акцентная линия рисовалась поверх
  const series: LineSeries[] = [
    { key: "previous", label: previousLabel, color: "var(--chart-previous)" },
    { key: "current", label: currentLabel, color: "var(--chart-bar)" },
  ];

  const legend = (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {[...series].reverse().map((s) => (
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
    <LineChart
      rows={data.map((d) => ({ current: d.current, previous: d.previous }))}
      series={series}
      height={260}
      ariaLabel={`Накопленные расходы: ${currentLabel} против ${previousLabel}. Стрелки влево и вправо показывают значения, все значения — в табличном виде.`}
      xLabel={(i) => String(data[i].day)}
      tooltipTitle={(i) => `День ${data[i].day}`}
      seriesNote={(key, i) =>
        formatDate(key === "current" ? data[i].date : data[i].prevDate)
      }
      formatValue={(v) => formatMoney(v, currency)}
      formatTick={formatCompact}
    />
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
