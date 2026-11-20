"use client";

import { CategoryIcon } from "@/components/categories/category-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CategoryColor } from "@/lib/categories";
import { formatMoney, formatPercent } from "@/lib/money";
import { ChartCard, DataTable } from "./chart-card";

export type CategoryBar = {
  categoryId: string;
  name: string;
  icon: string;
  color: CategoryColor;
  total: number;
};

const MAX_BARS = 8;

/** Топ-7 категорий + «Остальные (N)» (всего не больше 8 столбцов, docs/design.md §8). */
export function foldCategories(items: CategoryBar[]): CategoryBar[] {
  if (items.length <= MAX_BARS) return items;
  const head = items.slice(0, MAX_BARS - 1);
  const rest = items.slice(MAX_BARS - 1);
  return [
    ...head,
    {
      categoryId: "__other",
      name: `Остальные (${rest.length})`,
      icon: "Ellipsis",
      color: "slate",
      total: rest.reduce((s, c) => s + c.total, 0),
    },
  ];
}

/**
 * Горизонтальные столбцы по категориям, по убыванию.
 * Один ряд данных с номинальными категориями → один цвет для всех столбцов;
 * категорию узнают по подписи и иконке в её цвете рядом. Значение — у конца
 * столбца, доля — в подсказке и в таблице.
 */
export function CategoryBarsCard({
  title,
  description,
  items,
  currency,
  emptyText,
  totalLabel,
}: {
  title: string;
  description?: string;
  items: CategoryBar[];
  currency: string;
  emptyText: string;
  totalLabel: string;
}) {
  const bars = foldCategories(items);
  const total = items.reduce((s, c) => s + c.total, 0);
  const max = Math.max(1, ...bars.map((b) => b.total));

  const chart =
    bars.length === 0 ? (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    ) : (
      <TooltipProvider>
        <ul className="flex flex-col gap-1">
          {bars.map((b) => {
            const share = total > 0 ? b.total / total : 0;
            return (
              <li key={b.categoryId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      tabIndex={0}
                      aria-label={`${b.name}: ${formatMoney(b.total, currency)}, ${formatPercent(share)} ${totalLabel}`}
                      className="group grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-md px-1 py-1.5 outline-none hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:grid-cols-[minmax(0,11rem)_1fr]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CategoryIcon icon={b.icon} color={b.color} size={24} />
                        <span className="truncate text-sm">{b.name}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="h-3 min-w-[2px] rounded-r-[4px] bg-chart-bar transition-[width,opacity] duration-250 ease-out group-hover:opacity-80"
                          style={{ width: `${(b.total / max) * 100}%` }}
                        />
                        <span className="shrink-0 text-sm font-medium whitespace-nowrap tabular-nums">
                          {formatMoney(b.total, currency)}
                        </span>
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span className="font-semibold">
                      {formatMoney(b.total, currency)}
                    </span>{" "}
                    · {formatPercent(share)} {totalLabel} · {b.name}
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </TooltipProvider>
    );

  const table = (
    <DataTable
      columns={[
        { label: "Категория" },
        { label: "Сумма", align: "right" },
        { label: "Доля", align: "right" },
      ]}
      rows={items.map((c) => [
        c.name,
        formatMoney(c.total, currency),
        formatPercent(total > 0 ? c.total / total : 0),
      ])}
    />
  );

  return (
    <ChartCard
      title={title}
      description={description}
      chart={chart}
      table={items.length ? table : chart}
    />
  );
}
