import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/lib/budgets";

/**
 * Статус бюджета (docs/design.md §7.5). Цвет — только вместе с иконкой и
 * подписью: < 80% в норме, 80–100% близко к лимиту, > 100% превышен.
 */
const STATUS = {
  ok: {
    label: "В норме",
    Icon: CircleCheck,
    text: "text-muted-foreground",
    fill: "bg-chart-bar",
    track: "bg-primary-soft",
  },
  warning: {
    label: "Близко к лимиту",
    Icon: TriangleAlert,
    text: "text-warning",
    fill: "bg-warning",
    track: "bg-warning/15",
  },
  over: {
    label: "Превышен",
    Icon: CircleAlert,
    text: "text-expense",
    fill: "bg-expense",
    track: "bg-expense/15",
  },
} as const;

export function BudgetStatusLabel({
  status,
  className,
}: {
  status: BudgetStatus;
  className?: string;
}) {
  const { label, Icon, text } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs leading-4 font-medium whitespace-nowrap",
        text,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

/** Полоска «потрачено / лимит»: заливка несёт статус, дорожка — светлее того же цвета. */
export function BudgetMeter({
  spent,
  limit,
  status,
  label,
}: {
  spent: number;
  limit: number;
  status: BudgetStatus;
  label: string;
}) {
  const ratio = limit > 0 ? spent / limit : 0;
  const { fill, track } = STATUS[status];
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
      aria-valuetext={`${Math.round(ratio * 100)}%`}
      className={cn("h-2 overflow-hidden rounded-full", track)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-250 ease-out",
          fill,
        )}
        style={{ width: `${Math.min(ratio, 1) * 100}%` }}
      />
    </div>
  );
}
