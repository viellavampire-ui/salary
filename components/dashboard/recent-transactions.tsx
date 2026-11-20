import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryIcon } from "@/components/categories/category-icon";
import type { CategoryColor, CategoryType } from "@/lib/categories";
import { formatSigned } from "@/lib/money";
import { formatDate } from "@/lib/period";
import { cn } from "@/lib/utils";

export type RecentItem = {
  id: string;
  type: CategoryType;
  amount: number;
  date: string;
  note: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: CategoryColor;
};

/** Последние операции периода со ссылкой на полный список. */
export function RecentTransactions({
  items,
  currency,
  allHref,
}: {
  items: RecentItem[];
  currency: string;
  allHref: string;
}) {
  return (
    <section
      aria-label="Последние операции"
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:p-6"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-base leading-6 font-semibold sm:text-lg sm:leading-7">
          Последние операции
        </h2>
        <Link
          href={allHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-medium whitespace-nowrap text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Все операции
          <ArrowRight className="size-4" />
        </Link>
      </header>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          В этом периоде операций нет
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 py-2.5 not-last:border-b"
            >
              <CategoryIcon icon={t.categoryIcon} color={t.categoryColor} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {t.categoryName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {formatDate(t.date)}
                  {t.note ? ` · ${t.note}` : ""}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 font-medium whitespace-nowrap tabular-nums",
                  t.type === "income" && "text-income",
                )}
              >
                {formatSigned(t.amount, t.type, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
