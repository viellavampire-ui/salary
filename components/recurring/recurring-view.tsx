"use client";

import { useLayoutEffect, useState, useTransition } from "react";
import { Pause, Play, Plus, Repeat } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/categories/category-icon";
import { EmptyState } from "@/components/layout/empty-state";
import type { FormCategory } from "@/components/transactions/types";
import { Button } from "@/components/ui/button";
import type { RecurringFrequency } from "@/db/schema";
import type { CategoryColor, CategoryType } from "@/lib/categories";
import { formatSigned } from "@/lib/money";
import { formatDate } from "@/lib/period";
import { describeSchedule, nextOccurrence } from "@/lib/recurring";
import { cn } from "@/lib/utils";
import { setRecurringPausedAction } from "@/server/actions/recurring";
import { RecurringSheet, type RecurringSheetState } from "./recurring-sheet";

export type RecurringItem = {
  id: string;
  type: CategoryType;
  amount: number;
  note: string | null;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  occurrences: number;
  isPaused: boolean;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: CategoryColor;
  categoryArchived: boolean;
};

export function RecurringView({
  items,
  categories,
  currency,
  today,
}: {
  items: RecurringItem[];
  categories: FormCategory[];
  currency: string;
  today: string;
}) {
  const [sheet, setSheet] = useState<RecurringSheetState>(null);
  // Страница скрывается через <Activity> при уходе — закрываем панель
  useLayoutEffect(() => () => setSheet(null), []);

  const newButton = (
    <Button onClick={() => setSheet({ mode: "create" })}>
      <Plus />
      Новая регулярная операция
    </Button>
  );

  return (
    <>
      {items.length === 0 ? (
        <EmptyState
          Icon={Repeat}
          title="Регулярных операций пока нет"
          description="Аренда, подписки, зарплата — добавьте их один раз, и операции будут появляться сами по расписанию."
          action={newButton}
        />
      ) : (
        <>
          <div>{newButton}</div>
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((r) => (
              <li key={r.id}>
                <RecurringCard
                  item={r}
                  currency={currency}
                  onEdit={() =>
                    setSheet({
                      mode: "edit",
                      rule: {
                        id: r.id,
                        type: r.type,
                        amount: r.amount,
                        categoryId: r.categoryId,
                        frequency: r.frequency,
                        startDate: r.startDate,
                        endDate: r.endDate,
                        note: r.note,
                      },
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <RecurringSheet
        state={sheet}
        categories={categories}
        currency={currency}
        today={today}
        onClose={() => setSheet(null)}
      />
    </>
  );
}

function RecurringCard({
  item: r,
  currency,
  onEdit,
}: {
  item: RecurringItem;
  currency: string;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const next = nextOccurrence(r);
  const status = r.categoryArchived
    ? "Категория в архиве — операции не создаются"
    : r.isPaused
      ? "На паузе"
      : next
        ? `Следующая: ${formatDate(next)}`
        : "Завершена";

  function togglePause() {
    startTransition(async () => {
      const result = await setRecurringPausedAction({
        id: r.id,
        paused: !r.isPaused,
      });
      if (!result.ok) toast.error(result.error);
      else toast(r.isPaused ? "Возобновлено" : "Поставлено на паузу");
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4",
        (r.isPaused || !next) && "opacity-80",
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex items-start gap-3 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <CategoryIcon icon={r.categoryIcon} color={r.categoryColor} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {r.note || r.categoryName}
          </span>
          <span className="block text-xs text-muted-foreground">
            {r.note ? `${r.categoryName} · ` : ""}
            {describeSchedule(r.frequency, r.startDate)}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 font-medium whitespace-nowrap tabular-nums",
            r.type === "income" && "text-income",
          )}
        >
          {formatSigned(r.amount, r.type, currency)}
        </span>
      </button>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{status}</span>
        {next && !r.categoryArchived && (
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePause}
            disabled={pending}
            aria-label={`${r.isPaused ? "Возобновить" : "Пауза"}: ${r.note || r.categoryName}`}
          >
            {r.isPaused ? <Play /> : <Pause />}
            {r.isPaused ? "Возобновить" : "Пауза"}
          </Button>
        )}
      </div>
    </div>
  );
}
