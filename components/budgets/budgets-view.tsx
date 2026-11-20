"use client";

import { useLayoutEffect, useState } from "react";
import { PiggyBank, Plus } from "lucide-react";

import { CategoryIcon } from "@/components/categories/category-icon";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { formatMoney, formatPercent } from "@/lib/money";
import { budgetStatus } from "@/lib/budgets";
import { plural } from "@/lib/plural";
import type { BudgetProgress } from "@/server/data/budgets";
import {
  BudgetSheet,
  type BudgetCategory,
  type BudgetSheetState,
} from "./budget-sheet";
import { BudgetMeter, BudgetStatusLabel } from "./budget-status";

export function BudgetsView({
  progress,
  unbudgeted,
  currency,
  periodLabel,
  daysLeft,
}: {
  progress: BudgetProgress[];
  unbudgeted: BudgetCategory[];
  currency: string;
  periodLabel: string;
  /** Сколько дней осталось в текущем месяце; null — месяц не текущий */
  daysLeft: number | null;
}) {
  const [sheet, setSheet] = useState<BudgetSheetState>(null);
  // Страница скрывается через <Activity> при уходе — закрываем панель
  useLayoutEffect(() => () => setSheet(null), []);

  const totalLimit = progress.reduce((s, b) => s + b.limit, 0);
  const totalSpent = progress.reduce((s, b) => s + b.spent, 0);
  const totalStatus = budgetStatus(totalSpent, totalLimit);
  const newButton = (
    <Button
      onClick={() => setSheet({ mode: "create" })}
      disabled={unbudgeted.length === 0}
    >
      <Plus />
      Новый бюджет
    </Button>
  );

  return (
    <>
      {progress.length === 0 ? (
        <EmptyState
          Icon={PiggyBank}
          title="Бюджетов пока нет"
          description="Задайте месячный лимит на категорию — и Salary подскажет, когда траты приблизятся к нему."
          action={newButton}
        />
      ) : (
        <>
          <section
            aria-label="Итого по бюджетам"
            className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:p-6"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs leading-4 font-medium text-muted-foreground">
                  {periodLabel} · {progress.length}{" "}
                  {plural(progress.length, "бюджет", "бюджета", "бюджетов")}
                </p>
                <p className="mt-1 text-2xl leading-8 font-semibold">
                  {formatMoney(totalSpent, currency)}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    из {formatMoney(totalLimit, currency)}
                  </span>
                </p>
              </div>
              {newButton}
            </div>
            <BudgetMeter
              spent={totalSpent}
              limit={totalLimit}
              status={totalStatus}
              label="Все бюджеты"
            />
            <p className="text-sm text-muted-foreground">
              {totalSpent > totalLimit
                ? `Общий перерасход ${formatMoney(totalSpent - totalLimit, currency)}`
                : `Осталось ${formatMoney(totalLimit - totalSpent, currency)}`}
              {daysLeft !== null &&
                ` · до конца месяца ${daysLeft} ${plural(daysLeft, "день", "дня", "дней")}`}
            </p>
          </section>

          <ul className="grid gap-3 md:grid-cols-2">
            {progress.map((b) => (
              <li key={b.categoryId}>
                <BudgetCard
                  budget={b}
                  currency={currency}
                  daysLeft={daysLeft}
                  onEdit={() =>
                    setSheet({
                      mode: "edit",
                      category: {
                        id: b.categoryId,
                        name: b.name,
                        icon: b.icon,
                        color: b.color,
                        spent: b.spent,
                      },
                      limit: b.limit,
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {unbudgeted.length > 0 && (
        <section
          aria-labelledby="unbudgeted-title"
          className="flex flex-col gap-3"
        >
          <h2 id="unbudgeted-title" className="text-lg leading-7 font-semibold">
            Без бюджета
          </h2>
          <ul className="overflow-hidden rounded-lg border">
            {unbudgeted.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 not-last:border-b"
              >
                <CategoryIcon icon={c.icon} color={c.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.spent > 0
                      ? `Потрачено ${formatMoney(c.spent, currency)}`
                      : "Трат нет"}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSheet({ mode: "create", categoryId: c.id })}
                  aria-label={`Задать лимит: ${c.name}`}
                >
                  <Plus />
                  Лимит
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BudgetSheet
        state={sheet}
        available={unbudgeted}
        currency={currency}
        onClose={() => setSheet(null)}
      />
    </>
  );
}

function BudgetCard({
  budget: b,
  currency,
  daysLeft,
  onEdit,
}: {
  budget: BudgetProgress;
  currency: string;
  daysLeft: number | null;
  onEdit: () => void;
}) {
  const left = b.limit - b.spent;
  // Сколько можно тратить в день до конца месяца — в целых рублях, вниз
  const perDay =
    daysLeft && left > 0 ? Math.floor(left / daysLeft / 100) * 100 : null;

  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${b.name}: потрачено ${formatMoney(b.spent, currency)} из ${formatMoney(b.limit, currency)}. Изменить лимит`}
      className="flex w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors duration-150 outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex items-center gap-3">
        <CategoryIcon icon={b.icon} color={b.color} />
        <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
        <BudgetStatusLabel status={b.status} />
      </span>
      <BudgetMeter
        spent={b.spent}
        limit={b.limit}
        status={b.status}
        label={b.name}
      />
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span>
          <span className="font-medium tabular-nums">
            {formatMoney(b.spent, currency)}
          </span>{" "}
          <span className="text-muted-foreground">
            из {formatMoney(b.limit, currency)} · {formatPercent(b.ratio)}
          </span>
        </span>
        <span
          className={
            left < 0 ? "font-medium text-expense" : "text-muted-foreground"
          }
        >
          {left < 0
            ? `Перерасход ${formatMoney(-left, currency)}`
            : perDay !== null
              ? `≈ ${formatMoney(perDay, currency)} в день`
              : `Осталось ${formatMoney(left, currency)}`}
        </span>
      </span>
    </button>
  );
}
