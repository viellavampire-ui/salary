import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";

import { CategoryIcon } from "@/components/categories/category-icon";
import type { CategoryComparison } from "@/lib/analytics";
import type { CategoryColor } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Расходы по категориям против прошлого периода. Это числа, а не график:
 * рядом сумма сейчас, сумма тогда и изменение. Рост расходов — красный,
 * снижение — зелёный, и всегда со стрелкой и знаком.
 */
export function CategoryComparisonCard({
  rows,
  currency,
  currentLabel,
  previousLabel,
}: {
  rows: CategoryComparison[];
  currency: string;
  currentLabel: string;
  previousLabel: string;
}) {
  return (
    <section
      aria-label="Сравнение по категориям"
      className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4 md:p-6"
    >
      <header>
        <h2 className="text-lg leading-7 font-semibold">
          Сравнение по категориям
        </h2>
        <p className="text-sm text-muted-foreground">
          Расходы: {currentLabel} против {previousLabel}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Расходов нет ни в этом, ни в прошлом периоде
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="border-b py-2 pr-2 font-medium">
                  Категория
                </th>
                <th
                  scope="col"
                  className="w-28 border-b px-2 py-2 text-right font-medium"
                >
                  Сейчас
                </th>
                <th
                  scope="col"
                  className="hidden w-28 border-b px-2 py-2 text-right font-medium sm:table-cell"
                >
                  Было
                </th>
                <th
                  scope="col"
                  className="w-[4.5rem] border-b py-2 pl-2 text-right font-medium sm:w-24"
                >
                  <span aria-hidden className="sm:hidden">
                    Изм.
                  </span>
                  <span className="sr-only sm:not-sr-only">Изменение</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.categoryId} className="not-last:border-b">
                  <td className="min-w-0 py-2.5 pr-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryIcon
                        icon={r.icon}
                        color={r.color as CategoryColor}
                        size={24}
                      />
                      <span className="truncate">{r.name}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-medium whitespace-nowrap tabular-nums">
                    {formatMoney(r.total, currency)}
                  </td>
                  <td className="hidden px-2 py-2.5 text-right whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                    {formatMoney(r.previous, currency)}
                  </td>
                  <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                    <Change delta={r.delta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Change({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" aria-hidden />
        Новая
      </span>
    );
  }
  const percent = Math.round(Math.abs(delta) * 100);
  if (percent === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3.5" aria-hidden />
        0%
      </span>
    );
  }
  const up = delta > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        up ? "text-expense" : "text-income",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : "−"}
      {percent}%
    </span>
  );
}
