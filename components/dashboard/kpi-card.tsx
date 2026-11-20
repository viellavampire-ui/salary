import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Карточка показателя (stat tile): подпись, значение, изменение к прошлому
 * периоду. Цвет изменения = направление × «хорошо ли это» (рост расходов —
 * плохо), и рядом всегда стрелка и слова — цвет не единственный носитель смысла.
 * Крупное значение — пропорциональными цифрами (tabular-nums только в столбцах).
 */
export function KpiCard({
  label,
  value,
  valueClassName,
  delta,
  goodWhenUp = true,
  compareLabel,
  footer,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  /** Изменение в долях: 0.12 = +12%. null — не с чем сравнить */
  delta?: number | null;
  goodWhenUp?: boolean;
  compareLabel?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-4 md:p-5">
      <p className="text-xs leading-4 font-medium text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "truncate text-2xl leading-8 font-semibold md:text-[32px] md:leading-10",
          valueClassName,
        )}
      >
        {value}
      </p>
      {delta !== undefined && (
        <Delta
          delta={delta}
          goodWhenUp={goodWhenUp}
          compareLabel={compareLabel}
        />
      )}
      {footer}
    </div>
  );
}

function Delta({
  delta,
  goodWhenUp,
  compareLabel,
}: {
  delta: number | null;
  goodWhenUp: boolean;
  compareLabel?: string;
}) {
  const suffix = compareLabel ? ` ${compareLabel}` : "";
  if (delta === null) {
    return (
      <p className="text-xs leading-4 text-muted-foreground">
        Нет данных для сравнения
      </p>
    );
  }

  const percent = Math.round(Math.abs(delta) * 100);
  if (percent === 0) {
    return (
      <p className="flex items-center gap-1 text-xs leading-4 text-muted-foreground">
        <Minus className="size-3.5" aria-hidden />
        Без изменений{suffix}
      </p>
    );
  }

  const up = delta > 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs leading-4 font-medium",
        good ? "text-income" : "text-expense",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span>
        {up ? "Рост" : "Снижение"} на {percent}%
        <span className="font-normal text-muted-foreground">{suffix}</span>
      </span>
    </p>
  );
}

/** Полоска прогресса для нормы сбережений (meter). */
export function Meter({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className="h-2 overflow-hidden rounded-full bg-primary-soft"
    >
      <div
        className="h-full rounded-full bg-chart-bar transition-[width] duration-250 ease-out"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
