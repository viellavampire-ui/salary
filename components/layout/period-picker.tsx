"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  currentMonthKey,
  formatMonthLabel,
  isMonthKey,
  shiftMonth,
  type MonthKey,
} from "@/lib/period";
import { cn } from "@/lib/utils";

const arrowClass =
  "inline-flex size-9 items-center justify-center text-muted-foreground transition-colors duration-150 outline-none hover:bg-surface hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50";

/**
 * Переключатель месяца ◀ Ноябрь 2026 ▶. Выбранный месяц хранится в URL
 * (?period=YYYY-MM); без параметра — текущий финансовый месяц
 * (monthStartDay — день его начала из настроек). Будущие месяцы недоступны.
 */
export function PeriodPicker({
  className,
  monthStartDay = 1,
}: {
  className?: string;
  monthStartDay?: number;
}) {
  // useSearchParams и текущая дата известны только во время запроса
  return (
    <Suspense fallback={<Skeleton className={cn("h-9 w-56", className)} />}>
      <PeriodPickerInner className={className} monthStartDay={monthStartDay} />
    </Suspense>
  );
}

function PeriodPickerInner({
  className,
  monthStartDay,
}: {
  className?: string;
  monthStartDay: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = currentMonthKey(new Date(), monthStartDay);
  const raw = searchParams.get("period");
  const period = isMonthKey(raw) && raw <= current ? raw : current;

  const prev = shiftMonth(period, -1);
  const next = shiftMonth(period, 1);
  const hasNext = next <= current;

  function hrefFor(key: MonthKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === current) params.delete("period");
    else params.set("period", key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div
      role="group"
      aria-label="Период"
      className={cn(
        "inline-flex h-9 items-center overflow-hidden rounded-md border bg-background",
        className,
      )}
    >
      <Link
        href={hrefFor(prev)}
        scroll={false}
        aria-label={`Предыдущий месяц: ${formatMonthLabel(prev)}`}
        className={arrowClass}
      >
        <ChevronLeft className="size-4" />
      </Link>
      <span
        aria-live="polite"
        className="min-w-36 px-2 text-center text-sm font-medium tabular-nums"
      >
        {formatMonthLabel(period)}
      </span>
      {hasNext ? (
        <Link
          href={hrefFor(next)}
          scroll={false}
          aria-label={`Следующий месяц: ${formatMonthLabel(next)}`}
          className={arrowClass}
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <button
          type="button"
          disabled
          aria-label="Следующий месяц недоступен"
          className={cn(arrowClass, "opacity-40")}
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}
