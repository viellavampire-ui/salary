"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  customPeriod,
  isValidRange,
  nextPeriod,
  periodOfKind,
  periodSearch,
  previousPeriod,
  type Period,
  type PeriodKind,
} from "@/lib/period";
import { cn } from "@/lib/utils";

const KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: "month", label: "Месяц" },
  { kind: "quarter", label: "Квартал" },
  { kind: "year", label: "Год" },
  { kind: "custom", label: "Свой период" },
];

const arrowClass =
  "inline-flex size-9 items-center justify-center text-muted-foreground transition-colors duration-150 outline-none hover:bg-surface hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40";

/**
 * Выбор периода аналитики: тип (месяц/квартал/год/свой) + стрелки.
 * Смена типа сохраняет «якорь» — конец текущего периода (ноябрь → IV квартал).
 * Всё состояние — в URL, предыдущий результат остаётся на экране до загрузки.
 */
export function PeriodControls({
  period,
  monthStartDay,
  today,
}: {
  period: Period;
  monthStartDay: number;
  /** Сегодня (YYYY-MM-DD) — будущие периоды недоступны */
  today: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<PeriodKind>(period.kind);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [error, setError] = useState<string | null>(null);

  function go(p: Period) {
    setError(null);
    startTransition(() => {
      router.push(`${pathname}?${periodSearch(p)}`, { scroll: false });
    });
  }

  function selectKind(next: PeriodKind) {
    setKind(next);
    if (next === "custom") return; // ждём «Показать»
    const anchor = period.to > today ? today : period.to;
    go(periodOfKind(next, anchor, monthStartDay));
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidRange(from, to)) {
      setError(
        from > to
          ? "Дата начала позже даты окончания"
          : "Укажите период не длиннее 5 лет",
      );
      return;
    }
    go(customPeriod({ from, to }));
  }

  const prev = previousPeriod(period, monthStartDay);
  const next = nextPeriod(period, monthStartDay);
  const hasNext = next.from <= today;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Тип периода"
          className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-surface p-0.5"
        >
          {KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              aria-pressed={kind === k.kind}
              onClick={() => selectKind(k.kind)}
              className={cn(
                "inline-flex h-full items-center rounded-sm px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                kind === k.kind && "bg-background text-foreground shadow-sm",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>

        {kind !== "custom" && (
          <div
            role="group"
            aria-label="Период"
            className="inline-flex h-9 items-center overflow-hidden rounded-md border bg-background"
          >
            <button
              type="button"
              className={arrowClass}
              onClick={() => go(prev)}
              aria-label={`Предыдущий период: ${prev.label}`}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span
              aria-live="polite"
              className="min-w-40 px-2 text-center text-sm font-medium"
            >
              {period.kind === kind ? period.label : "…"}
            </span>
            <button
              type="button"
              className={arrowClass}
              onClick={() => go(next)}
              disabled={!hasNext}
              aria-label={
                hasNext
                  ? `Следующий период: ${next.label}`
                  : "Следующий период недоступен"
              }
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {pending && (
          <LoaderCircle
            className="size-4 animate-spin text-muted-foreground"
            aria-label="Загрузка"
          />
        )}
      </div>

      {kind === "custom" && (
        <form
          onSubmit={applyCustom}
          className="flex flex-wrap items-end gap-3"
          noValidate
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            С
            <Input
              type="date"
              value={from}
              max={today}
              onChange={(e) => setFrom(e.target.value)}
              className="w-auto"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            По
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-auto"
              required
            />
          </label>
          <Button type="submit" variant="secondary">
            Показать
          </Button>
          {error && (
            <p role="alert" className="basis-full text-xs text-expense">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
