"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatRangeLabel,
  isISODate,
  periodOfKind,
  previousPeriod,
  type DateRange,
} from "@/lib/period";
import { cn } from "@/lib/utils";
import { FieldError, selectClass } from "./section";

type Preset = "month" | "prev-month" | "year" | "all" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "month", label: "Текущий месяц" },
  { value: "prev-month", label: "Прошлый месяц" },
  { value: "year", label: "Текущий год" },
  { value: "all", label: "За всё время" },
  { value: "custom", label: "Свой период" },
];

/** Скачать операции в CSV: открывается в Excel, Numbers, Google Таблицах. */
export function ExportForm({
  monthStartDay,
  today,
}: {
  monthStartDay: number;
  /** Сегодня (YYYY-MM-DD) с сервера — одинаково при SSR и в браузере */
  today: string;
}) {
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);

  let range: DateRange | null = null;
  let error: string | undefined;
  if (preset === "month") range = periodOfKind("month", today, monthStartDay);
  else if (preset === "prev-month")
    range = previousPeriod(
      periodOfKind("month", today, monthStartDay),
      monthStartDay,
    );
  else if (preset === "year")
    range = periodOfKind("year", today, monthStartDay);
  else if (preset === "custom") {
    if (!isISODate(from) || !isISODate(to)) error = "Укажите обе даты";
    else if (from > to) error = "Дата начала позже даты окончания";
    else range = { from, to };
  }

  const href =
    preset === "all"
      ? "/api/export"
      : range
        ? `/api/export?from=${range.from}&to=${range.to}`
        : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="export-preset">Период</Label>
        <select
          id="export-preset"
          value={preset}
          onChange={(e) => setPreset(e.target.value as Preset)}
          className={selectClass}
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {range && preset !== "custom" && (
          <p className="text-xs text-muted-foreground">
            {formatRangeLabel(range)}
          </p>
        )}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="export-from">С</Label>
            <Input
              id="export-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="export-to">По</Label>
            <Input
              id="export-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="basis-full">
            <FieldError message={error} />
          </div>
        </div>
      )}

      <div>
        <a
          href={href ?? undefined}
          download
          aria-disabled={!href}
          className={cn(
            buttonVariants({ variant: "secondary" }),
            !href && "pointer-events-none opacity-50",
          )}
        >
          <Download />
          Скачать CSV
        </a>
      </div>
    </div>
  );
}
