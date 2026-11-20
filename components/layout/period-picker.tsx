"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMonthLabel,
  isMonthKey,
  monthKeyFromDate,
  shiftMonth,
  type MonthKey,
} from "@/lib/period";
import { cn } from "@/lib/utils";

const arrowClass =
  "inline-flex size-9 items-center justify-center text-muted-foreground transition-colors duration-150 outline-none hover:bg-surface hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50";

/**
 * Переключатель месяца ◀ Ноябрь 2026 ▶. Выбранный месяц хранится в URL
 * (?period=YYYY-MM); без параметра — текущий месяц. Будущие месяцы недоступны.
 */
export function PeriodPicker({ className }: { className?: string }) {
  // useSearchParams и текущая дата известны только во время запроса
  return (
    <Suspense fallback={<Skeleton className={cn("h-9 w-56", className)} />}>
      <PeriodPickerInner className={className} />
    </Suspense>
  );
}

function PeriodPickerInner({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = monthKeyFromDate(new Date());
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
        <span
          aria-disabled
          aria-label="Следующий месяц недоступен"
          className={cn(arrowClass, "pointer-events-none opacity-40")}
        >
          <ChevronRight className="size-4" />
        </span>
      )}
    </div>
  );
}
