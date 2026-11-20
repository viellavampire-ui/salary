"use client";

import { useState } from "react";
import { ChartColumn, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Карточка графика с переключателем «График / Таблица»: у каждого графика
 * есть табличный двойник — значения доступны без наведения и для программ
 * чтения экрана (docs/design.md §8).
 */
export function ChartCard({
  title,
  description,
  legend,
  chart,
  table,
  className,
}: {
  title: string;
  description?: string;
  legend?: React.ReactNode;
  chart: React.ReactNode;
  table: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section
      aria-label={title}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 md:p-6",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg leading-7 font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div
          role="group"
          aria-label="Вид"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md border bg-background p-0.5"
        >
          {(
            [
              ["chart", "График", ChartColumn],
              ["table", "Таблица", Table2],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              title={label}
              onClick={() => setView(value)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                view === value && "bg-surface text-foreground shadow-sm",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">{label}</span>
            </button>
          ))}
        </div>
      </header>
      {view === "chart" && legend}
      {view === "chart" ? chart : table}
    </section>
  );
}

/** Таблица-двойник графика. */
export function DataTable({
  columns,
  rows,
}: {
  columns: { label: string; align?: "right" }[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={cn(
                  "border-b px-2 py-2 font-medium",
                  c.align === "right" && "text-right",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="not-last:border-b">
              {cells.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-2 py-2",
                    columns[j]?.align === "right" &&
                      "text-right whitespace-nowrap tabular-nums",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
