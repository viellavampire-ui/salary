"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from "lucide-react";

import { CategoryIcon } from "@/components/categories/category-icon";
import { EmptyState } from "@/components/layout/empty-state";
import { NewTransactionButton } from "@/components/layout/new-transaction-button";
import { buttonVariants } from "@/components/ui/button";
import type { CategoryColor, CategoryType } from "@/lib/categories";
import { formatMoney, formatSigned } from "@/lib/money";
import { formatDate, formatDayHeader } from "@/lib/period";
import { cn } from "@/lib/utils";
import { TransactionFilters } from "./transaction-filters";
import {
  TransactionSheet,
  type TransactionSheetState,
} from "./transaction-sheet";
import type { FormCategory } from "./types";

export type TransactionRow = {
  id: string;
  type: CategoryType;
  amount: number;
  date: string;
  note: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: CategoryColor;
};

export function TransactionsView({
  items,
  total,
  income,
  expense,
  page,
  pageCount,
  pageSize,
  categories,
  currency,
  periodLabel,
  filters,
  currentYear,
}: {
  items: TransactionRow[];
  total: number;
  income: number;
  expense: number;
  page: number;
  pageCount: number;
  pageSize: number;
  categories: FormCategory[];
  currency: string;
  periodLabel: string;
  filters: { type?: CategoryType; categoryId?: string; q?: string };
  currentYear: number;
}) {
  const [sheet, setSheet] = useState<TransactionSheetState>(null);
  // Страница скрывается через <Activity> при уходе — закрываем панель
  useLayoutEffect(() => () => setSheet(null), []);

  const hasFilters = Boolean(filters.type || filters.categoryId || filters.q);
  const edit = (t: TransactionRow) =>
    setSheet({
      mode: "edit",
      transaction: {
        id: t.id,
        type: t.type,
        amount: t.amount,
        categoryId: t.categoryId,
        date: t.date,
        note: t.note,
      },
    });

  // Группировка по дням для мобильного списка
  const days: { date: string; rows: TransactionRow[] }[] = [];
  for (const t of items) {
    const last = days.at(-1);
    if (last?.date === t.date) last.rows.push(t);
    else days.push({ date: t.date, rows: [t] });
  }

  return (
    <>
      <TransactionFilters
        key={`${filters.type}-${filters.categoryId}`}
        type={filters.type}
        categoryId={filters.categoryId}
        q={filters.q}
        categories={categories}
      />

      <dl className="-mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <div className="flex gap-1.5">
          <dt>{periodLabel}:</dt>
          <dd>
            {total} {plural(total, "операция", "операции", "операций")}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Доходы</dt>
          <dd className="font-medium text-income tabular-nums">
            {formatMoney(income, currency, { sign: "always" })}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Расходы</dt>
          <dd className="font-medium text-expense tabular-nums">
            {formatMoney(-expense, currency)}
          </dd>
        </div>
      </dl>

      {items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            Icon={SearchX}
            title="Ничего не найдено"
            description="Попробуйте изменить фильтры или период."
          />
        ) : (
          <EmptyState
            Icon={ArrowLeftRight}
            title="Нет операций за этот период"
            description="Добавьте доход или расход — он сразу появится здесь и на дашборде."
            action={
              <NewTransactionButton
                variant="inline"
                label="Добавить операцию"
              />
            }
          />
        )
      ) : (
        <>
          {/* Планшет и десктоп: таблица */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Дата
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Категория
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Комментарий
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right font-medium"
                  >
                    Сумма
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => edit(t)}
                    className="cursor-pointer border-t transition-colors duration-150 hover:bg-surface"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          edit(t);
                        }}
                        className="flex items-center gap-3 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <CategoryIcon
                          icon={t.categoryIcon}
                          color={t.categoryColor}
                        />
                        <span className="font-medium">{t.categoryName}</span>
                      </button>
                    </td>
                    <td className="max-w-0 px-4 py-3 text-muted-foreground">
                      <span className="block truncate">{t.note ?? "—"}</span>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums",
                        t.type === "income" ? "text-income" : "text-foreground",
                      )}
                    >
                      {formatSigned(t.amount, t.type, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Телефон: список по дням */}
          <div className="flex flex-col gap-4 md:hidden">
            {days.map((day) => (
              <section key={day.date} aria-label={formatDate(day.date)}>
                <h2 className="mb-1 px-1 text-xs font-medium text-muted-foreground">
                  {formatDayHeader(day.date, currentYear)}
                </h2>
                <ul className="overflow-hidden rounded-lg border">
                  {day.rows.map((t) => (
                    <li key={t.id} className="not-last:border-b">
                      <button
                        type="button"
                        onClick={() => edit(t)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left outline-none focus-visible:bg-surface"
                      >
                        <CategoryIcon
                          icon={t.categoryIcon}
                          color={t.categoryColor}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {t.categoryName}
                          </span>
                          {t.note && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {t.note}
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-medium tabular-nums",
                            t.type === "income" && "text-income",
                          )}
                        >
                          {formatSigned(t.amount, t.type, currency)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {pageCount > 1 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              from={(page - 1) * pageSize + 1}
              to={Math.min(page * pageSize, total)}
              total={total}
            />
          )}
        </>
      )}

      <TransactionSheet
        state={sheet}
        categories={categories}
        currency={currency}
        onClose={() => setSheet(null)}
      />
    </>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function href(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const linkClass = buttonVariants({ variant: "secondary", size: "sm" });
  const disabled = "pointer-events-none opacity-50";

  return (
    <nav
      aria-label="Страницы"
      className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <span className="tabular-nums">
        {from}–{to} из {total}
      </span>
      <div className="flex gap-2">
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(linkClass, page <= 1 && disabled)}
        >
          <ChevronLeft />
          Назад
        </Link>
        <Link
          href={href(page + 1)}
          aria-disabled={page >= pageCount}
          tabIndex={page >= pageCount ? -1 : undefined}
          className={cn(linkClass, page >= pageCount && disabled)}
        >
          Вперёд
          <ChevronRight />
        </Link>
      </div>
    </nav>
  );
}
