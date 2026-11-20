"use client";

import dynamic from "next/dynamic";

import { PlotPlaceholder } from "@/components/charts/plot-placeholder";
import { WhenVisible } from "@/components/charts/when-visible";
import { formatMoney } from "@/lib/money";
import { formatMonthLabel, type MonthKey } from "@/lib/period";
import { ChartCard, DataTable } from "./chart-card";
import { SERIES, type TrendPoint } from "./income-expense-series";

export type { TrendPoint };

// Recharts (~130 КБ) грузится отдельно и не задерживает первую отрисовку
const IncomeExpensePlot = dynamic(() => import("./income-expense-plot"), {
  ssr: false,
  loading: () => <PlotPlaceholder height={280} />,
});

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
    <WhenVisible placeholder={<PlotPlaceholder height={280} />}>
      <IncomeExpensePlot data={data} currency={currency} selected={selected} />
    </WhenVisible>
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
