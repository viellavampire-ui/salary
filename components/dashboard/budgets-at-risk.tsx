import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";

import {
  BudgetMeter,
  BudgetStatusLabel,
} from "@/components/budgets/budget-status";
import { CategoryIcon } from "@/components/categories/category-icon";
import { formatMoney } from "@/lib/money";
import { plural } from "@/lib/plural";
import type { BudgetProgress } from "@/server/data/budgets";

/**
 * «Бюджеты под угрозой» на дашборде (шаг 11.3): бюджеты, где потрачено
 * 80% и больше. Если бюджетов нет — блок не показывается.
 */
export function BudgetsAtRisk({
  budgets,
  currency,
  href,
}: {
  budgets: BudgetProgress[];
  currency: string;
  href: string;
}) {
  if (budgets.length === 0) return null;
  const atRisk = budgets.filter((b) => b.status !== "ok");

  return (
    <section
      aria-label="Бюджеты под угрозой"
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:p-6"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-base leading-6 font-semibold sm:text-lg sm:leading-7">
          Бюджеты под угрозой
        </h2>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-medium whitespace-nowrap text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Все бюджеты
          <ArrowRight className="size-4" />
        </Link>
      </header>

      {atRisk.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleCheck className="size-4 text-income" aria-hidden />
          {budgets.length === 1
            ? "Бюджет в норме"
            : `Все ${budgets.length} ${plural(budgets.length, "бюджет", "бюджета", "бюджетов")} в норме`}{" "}
          — потрачено меньше 80% лимита
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {atRisk.slice(0, 6).map((b) => (
            <li key={b.categoryId} className="flex flex-col gap-2">
              <span className="flex items-center gap-2">
                <CategoryIcon icon={b.icon} color={b.color} size={24} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {b.name}
                </span>
                <BudgetStatusLabel status={b.status} />
              </span>
              <BudgetMeter
                spent={b.spent}
                limit={b.limit}
                status={b.status}
                label={b.name}
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatMoney(b.spent, currency)} из{" "}
                {formatMoney(b.limit, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
