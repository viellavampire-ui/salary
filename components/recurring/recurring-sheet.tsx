"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CategoryRadioGrid } from "@/components/categories/category-radio-grid";
import { showBudgetAlerts } from "@/components/notifications/alert-toasts";
import type { FormCategory } from "@/components/transactions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RecurringFrequency } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import type { CategoryType } from "@/lib/categories";
import { currencySymbol, minorToInput } from "@/lib/money";
import { formatDate } from "@/lib/period";
import { plural } from "@/lib/plural";
import {
  FREQUENCY_LABELS,
  describeSchedule,
  dueOccurrences,
} from "@/lib/recurring";
import { cn } from "@/lib/utils";
import {
  recurringSchema,
  type RecurringFormValues,
  type RecurringInput,
} from "@/lib/validations";
import {
  createRecurringAction,
  deleteRecurringAction,
  updateRecurringAction,
} from "@/server/actions/recurring";

export type EditableRecurring = {
  id: string;
  type: CategoryType;
  amount: number;
  categoryId: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  note: string | null;
};

export type RecurringSheetState =
  { mode: "create" } | { mode: "edit"; rule: EditableRecurring } | null;

export function RecurringSheet({
  state,
  categories,
  currency,
  today,
  onClose,
}: {
  state: RecurringSheetState;
  categories: FormCategory[];
  currency: string;
  /** Сегодня (YYYY-MM-DD) с сервера */
  today: string;
  onClose: () => void;
}) {
  return (
    <Sheet open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          if (state?.mode !== "create") return;
          e.preventDefault();
          document.getElementById("rec-amount")?.focus();
        }}
      >
        {state && (
          <RecurringForm
            key={state.mode === "edit" ? state.rule.id : "new"}
            state={state}
            categories={categories}
            currency={currency}
            today={today}
            onDone={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

const FREQUENCIES: RecurringFrequency[] = ["weekly", "monthly", "yearly"];

function RecurringForm({
  state,
  categories,
  currency,
  today,
  onDone,
}: {
  state: NonNullable<RecurringSheetState>;
  categories: FormCategory[];
  currency: string;
  today: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const editing = state.mode === "edit" ? state.rule : null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  const firstExpense = categories.find(
    (c) => c.type === "expense" && !c.isArchived,
  );

  const {
    register,
    handleSubmit,
    getValues,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RecurringFormValues, unknown, RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: editing
      ? {
          type: editing.type,
          amount: minorToInput(editing.amount),
          categoryId: editing.categoryId,
          frequency: editing.frequency,
          startDate: editing.startDate,
          endDate: editing.endDate ?? "",
          note: editing.note ?? "",
        }
      : {
          type: "expense",
          amount: "",
          categoryId: firstExpense?.id ?? "",
          frequency: "monthly",
          startDate: today,
          endDate: "",
          note: "",
        },
  });

  const [type, categoryId, frequency, startDate, endDate] = useWatch({
    control,
    name: ["type", "categoryId", "frequency", "startDate", "endDate"],
  });

  const options = categories.filter(
    (c) =>
      c.type === type &&
      (!c.isArchived || (editing && c.id === editing.categoryId)),
  );

  function switchType(next: CategoryType) {
    if (next === type) return;
    setValue("type", next);
    if (categories.find((c) => c.id === categoryId)?.type !== next) {
      setValue(
        "categoryId",
        categories.find((c) => c.type === next && !c.isArchived)?.id ?? "",
      );
    }
  }

  // Подсказка: расписание и сколько прошедших операций будет добавлено
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate ?? "");
  const backfill =
    !editing && validStart
      ? dueOccurrences(
          {
            startDate: startDate!,
            frequency: frequency as RecurringFrequency,
            endDate: endDate || null,
            occurrences: 0,
            isPaused: false,
          },
          today,
        ).dates.length
      : 0;

  function applyResult(result: ActionResult<unknown>) {
    if (result.ok) return true;
    setServerError(result.error);
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof RecurringFormValues, { message: messages[0] });
    }
    return false;
  }

  async function onSubmit() {
    setServerError(null);
    // На сервер — исходные значения: сумму в копейки переводит сервер
    const raw = getValues();
    const result = editing
      ? await updateRecurringAction({ ...raw, id: editing.id })
      : await createRecurringAction(raw);
    if (!applyResult(result) || !result.ok) return;
    const { created, alerts } = result.data;
    toast.success(
      editing ? "Правило сохранено" : "Регулярная операция создана",
      {
        description:
          created > 0
            ? `Добавлено ${created} ${plural(created, "операция", "операции", "операций")}`
            : undefined,
      },
    );
    showBudgetAlerts(alerts, currency, (href) => router.push(href));
    onDone();
  }

  function onDelete() {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startDelete(async () => {
      const result = await deleteRecurringAction({ id: editing.id });
      if (!applyResult(result)) return;
      toast("Правило удалено", {
        description: "Уже созданные операции остались в списке",
      });
      onDone();
    });
  }

  const busy = isSubmitting || deleting;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SheetHeader>
        <SheetTitle>
          {editing ? "Регулярная операция" : "Новая регулярная операция"}
        </SheetTitle>
        <SheetDescription>
          Подписка, аренда, зарплата — то, что повторяется по расписанию
        </SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-6">
        <div
          role="radiogroup"
          aria-label="Тип операции"
          className="grid grid-cols-2 gap-1 rounded-md border bg-surface p-1"
        >
          {(
            [
              ["expense", "Расход"],
              ["income", "Доход"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => switchType(t)}
              className={cn(
                "h-8 rounded-sm text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                type === t && "bg-background shadow-sm",
                type === t &&
                  (t === "expense" ? "text-expense" : "text-income"),
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="rec-amount">Сумма</Label>
          <div className="relative">
            <Input
              id="rec-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              aria-invalid={Boolean(errors.amount)}
              className="h-12 pr-10 text-2xl leading-8 font-semibold tabular-nums"
              {...register("amount")}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg text-muted-foreground"
            >
              {currencySymbol(currency)}
            </span>
          </div>
          {errors.amount && (
            <p className="text-xs leading-4 text-expense">
              {errors.amount.message}
            </p>
          )}
        </div>

        <CategoryRadioGrid
          options={options}
          registration={register("categoryId")}
          error={errors.categoryId?.message}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Повторять каждый</legend>
          <div className="grid grid-cols-3 gap-1 rounded-md border bg-surface p-1">
            {FREQUENCIES.map((f) => (
              <label key={f} className="relative">
                <input
                  type="radio"
                  value={f}
                  className="peer sr-only"
                  {...register("frequency")}
                />
                <span className="flex h-8 cursor-pointer items-center justify-center rounded-sm text-sm font-medium text-muted-foreground transition-colors duration-150 peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">
                  {FREQUENCY_LABELS[f].toLowerCase()}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rec-start">
              {editing ? "Дата начала" : "Первая операция"}
            </Label>
            <Input
              id="rec-start"
              type="date"
              className="w-auto"
              aria-invalid={Boolean(errors.startDate)}
              {...register("startDate")}
            />
            {errors.startDate && (
              <p className="text-xs leading-4 text-expense">
                {errors.startDate.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rec-end">
              Закончить{" "}
              <span className="font-normal text-muted-foreground">
                (необязательно)
              </span>
            </Label>
            <Input
              id="rec-end"
              type="date"
              className="w-auto"
              aria-invalid={Boolean(errors.endDate)}
              {...register("endDate")}
            />
            {errors.endDate && (
              <p className="text-xs leading-4 text-expense">
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>

        {validStart && (
          <p
            className="rounded-md border bg-surface px-3 py-2 text-sm"
            aria-live="polite"
          >
            {describeSchedule(frequency as RecurringFrequency, startDate!)}
            {backfill > 0 && (
              <span className="block text-xs text-muted-foreground">
                Сразу будут добавлены уже наступившие операции (с{" "}
                {formatDate(startDate!)} по сегодня): {backfill}{" "}
                {plural(backfill, "операция", "операции", "операций")}
              </span>
            )}
            {editing && (
              <span className="block text-xs text-muted-foreground">
                Изменения действуют на будущие операции, созданные остаются как
                есть
              </span>
            )}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="rec-note">
            Название{" "}
            <span className="font-normal text-muted-foreground">
              (необязательно)
            </span>
          </Label>
          <Input
            id="rec-note"
            maxLength={200}
            autoComplete="off"
            placeholder="Например, аренда квартиры или Netflix"
            {...register("note")}
          />
        </div>

        {serverError && !Object.keys(errors).length && (
          <p role="alert" className="text-xs leading-4 text-expense">
            {serverError}
          </p>
        )}
      </SheetBody>

      <SheetFooter>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={busy}
            className={cn(
              "text-muted-foreground hover:text-expense",
              confirmDelete && "text-expense",
            )}
          >
            {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
            {confirmDelete ? "Точно удалить?" : "Удалить"}
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onDone}
            disabled={busy}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={busy || options.length === 0}>
            {isSubmitting && <LoaderCircle className="animate-spin" />}
            {editing ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  );
}
