"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SUPPORTED_CURRENCIES, currencySymbol } from "@/lib/money";
import {
  MAX_MONTH_START_DAY,
  formatRangeLabel,
  monthKeyForDate,
  monthPeriod,
} from "@/lib/period";
import { updateSettingsAction } from "@/server/actions/settings";
import { FieldError, selectClass } from "./section";

/** Валюта и первый день финансового месяца. */
export function PreferencesForm({
  currency: initialCurrency,
  monthStartDay: initialDay,
  today,
}: {
  currency: string;
  monthStartDay: number;
  /** Сегодня (YYYY-MM-DD) с сервера — одинаково при SSR и в браузере */
  today: string;
}) {
  const [currency, setCurrency] = useState(initialCurrency);
  const [day, setDay] = useState(initialDay);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const dirty = currency !== initialCurrency || day !== initialDay;
  // Живой пример: каким будет текущий месяц при выбранном дне начала
  const example = monthPeriod(monthKeyForDate(today, day), day);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await updateSettingsAction({
        currency,
        monthStartDay: day,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success("Настройки сохранены");
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-currency">Валюта</Label>
        <select
          id="settings-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className={selectClass}
          aria-describedby="settings-currency-hint"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} ({currencySymbol(c.code)})
            </option>
          ))}
        </select>
        <p
          id="settings-currency-hint"
          className="text-xs text-muted-foreground"
        >
          Меняется только обозначение: суммы не пересчитываются по курсу.
        </p>
        <FieldError message={errors.currency?.[0]} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-day">Финансовый месяц начинается</Label>
        <select
          id="settings-day"
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className={selectClass}
          aria-describedby="settings-day-hint"
        >
          {Array.from({ length: MAX_MONTH_START_DAY }, (_, i) => i + 1).map(
            (d) => (
              <option key={d} value={d}>
                {d === 1 ? "1-го числа (календарный месяц)" : `${d}-го числа`}
              </option>
            ),
          )}
        </select>
        <p id="settings-day-hint" className="text-xs text-muted-foreground">
          Удобно поставить день зарплаты. Сейчас «{example.label}» — это{" "}
          <span className="font-medium text-foreground">
            {formatRangeLabel(example)}
          </span>
          .
        </p>
        <FieldError message={errors.monthStartDay?.[0]} />
      </div>

      <div>
        <Button type="submit" disabled={!dirty || pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Сохранить
        </Button>
      </div>
    </form>
  );
}
