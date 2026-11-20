"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SheetBody,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ActionResult } from "@/lib/action-result";
import type { CategoryType } from "@/lib/categories";
import { currencySymbol, minorToInput } from "@/lib/money";
import { addDays, toISODate } from "@/lib/period";
import { cn } from "@/lib/utils";
import {
  transactionSchema,
  type TransactionFormValues,
  type TransactionInput,
} from "@/lib/validations";
import {
  createTransactionAction,
  deleteTransactionAction,
  restoreTransactionAction,
  updateTransactionAction,
} from "@/server/actions/transactions";
import type { EditableTransaction, FormCategory } from "./types";

const LAST_CATEGORY_KEY = (type: CategoryType) =>
  `salary:last-category:${type}`;

function readLastCategory(type: CategoryType) {
  try {
    return localStorage.getItem(LAST_CATEGORY_KEY(type));
  } catch {
    return null;
  }
}

function rememberCategory(type: CategoryType, id: string) {
  try {
    localStorage.setItem(LAST_CATEGORY_KEY(type), id);
  } catch {
    // не страшно — просто не запомним
  }
}

/** Категория по умолчанию: последняя использованная или первая в списке. */
function defaultCategory(categories: FormCategory[], type: CategoryType) {
  const active = categories.filter((c) => c.type === type && !c.isArchived);
  const last = readLastCategory(type);
  return (active.find((c) => c.id === last) ?? active[0])?.id ?? "";
}

/**
 * Форма операции (docs/design.md §7.3). Рендерится только внутри открытой
 * панели — то есть в браузере, поэтому localStorage и текущая дата доступны.
 */
export function TransactionForm({
  categories,
  currency,
  editing,
  defaultType = "expense",
  onDone,
}: {
  categories: FormCategory[];
  currency: string;
  editing?: EditableTransaction;
  defaultType?: CategoryType;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const today = toISODate(new Date());

  const {
    register,
    handleSubmit,
    getValues,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues, unknown, TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: editing
      ? {
          type: editing.type,
          amount: minorToInput(editing.amount),
          categoryId: editing.categoryId,
          date: editing.date,
          note: editing.note ?? "",
        }
      : {
          type: defaultType,
          amount: "",
          categoryId: defaultCategory(categories, defaultType),
          date: today,
          note: "",
        },
  });

  const [type, categoryId, date] = useWatch({
    control,
    name: ["type", "categoryId", "date"],
  });

  // Активные категории выбранного типа + архивная, если операция уже в ней
  const options = categories.filter(
    (c) =>
      c.type === type &&
      (!c.isArchived || (editing && c.id === editing.categoryId)),
  );

  function switchType(next: CategoryType) {
    if (next === type) return;
    setValue("type", next);
    const current = categories.find((c) => c.id === categoryId);
    if (current?.type !== next) {
      setValue("categoryId", defaultCategory(categories, next));
    }
  }

  function applyResult(result: ActionResult<unknown>) {
    if (result.ok) return true;
    setServerError(result.error);
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof TransactionFormValues, { message: messages[0] });
    }
    return false;
  }

  async function onSubmit(values: TransactionInput) {
    setServerError(null);
    // На сервер — исходные значения полей: сервер сам проверит их той же
    // схемой и переведёт сумму в копейки (клиенту не доверяем)
    const raw = getValues();
    if (editing) {
      const result = await updateTransactionAction({ ...raw, id: editing.id });
      if (!applyResult(result)) return;
      toast.success("Операция сохранена");
      onDone();
      return;
    }

    const result = await createTransactionAction(raw);
    if (!applyResult(result)) return;
    rememberCategory(values.type, values.categoryId);
    onDone();
    if (result.ok) {
      const { id } = result.data;
      toast.success("Операция добавлена", {
        action: {
          label: "Отменить",
          onClick: async () => {
            const undo = await deleteTransactionAction({ id });
            if (!undo.ok) toast.error(undo.error);
          },
        },
      });
    }
  }

  function onDelete() {
    if (!editing) return;
    setServerError(null);
    startDelete(async () => {
      const result = await deleteTransactionAction({ id: editing.id });
      if (!applyResult(result)) return;
      onDone();
      if (result.ok) {
        const snapshot = result.data;
        toast("Операция удалена", {
          action: {
            label: "Отменить",
            onClick: async () => {
              const undo = await restoreTransactionAction(snapshot);
              if (!undo.ok) toast.error(undo.error);
            },
          },
        });
      }
    });
  }

  const busy = isSubmitting || deleting;
  const symbol = currencySymbol(currency);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SheetHeader>
        <SheetTitle>{editing ? "Операция" : "Новая операция"}</SheetTitle>
        <SheetDescription className="sr-only">
          Тип, сумма, категория, дата и комментарий
        </SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-6">
        {/* Тип */}
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

        {/* Сумма */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="tx-amount">Сумма</Label>
          <div className="relative">
            <Input
              id="tx-amount"
              // форма грузится лениво — фокус ставим при её появлении
              autoFocus={!editing}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? "tx-amount-error" : undefined}
              className={cn(
                "h-14 pr-10 text-[28px] leading-9 font-semibold tabular-nums",
                type === "expense" ? "text-expense" : "text-income",
              )}
              {...register("amount")}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xl text-muted-foreground"
            >
              {symbol}
            </span>
          </div>
          {errors.amount && (
            <p id="tx-amount-error" className="text-xs leading-4 text-expense">
              {errors.amount.message}
            </p>
          )}
        </div>

        {/* Категория */}
        <fieldset aria-invalid={Boolean(errors.categoryId)}>
          <legend className="mb-2 text-sm font-medium">Категория</legend>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Нет активных категорий этого типа.{" "}
              <Link
                href="/categories"
                className="text-primary underline-offset-4 hover:underline"
              >
                Создать категорию
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {options.map((c) => (
                <label key={c.id} className="relative">
                  <input
                    type="radio"
                    value={c.id}
                    className="peer sr-only"
                    {...register("categoryId")}
                  />
                  <span
                    className={cn(
                      "flex h-full cursor-pointer flex-col items-center gap-1.5 rounded-md border border-transparent p-2 text-center text-xs leading-4 transition-colors duration-150 hover:bg-surface",
                      "peer-checked:border-primary peer-checked:bg-primary-soft peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                    )}
                  >
                    <CategoryIcon icon={c.icon} color={c.color} />
                    <span className="line-clamp-2 break-words">{c.name}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {errors.categoryId && (
            <p className="mt-2 text-xs leading-4 text-expense">
              {errors.categoryId.message}
            </p>
          )}
        </fieldset>

        {/* Дата */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="tx-date">Дата</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="tx-date"
              type="date"
              className="w-auto"
              aria-invalid={Boolean(errors.date)}
              {...register("date")}
            />
            {(
              [
                [today, "Сегодня"],
                [addDays(today, -1), "Вчера"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={date === value ? "default" : "secondary"}
                aria-pressed={date === value}
                onClick={() =>
                  setValue("date", value, { shouldValidate: true })
                }
              >
                {label}
              </Button>
            ))}
          </div>
          {errors.date && (
            <p className="text-xs leading-4 text-expense">
              {errors.date.message}
            </p>
          )}
        </div>

        {/* Комментарий */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="tx-note">
            Комментарий{" "}
            <span className="font-normal text-muted-foreground">
              (необязательно)
            </span>
          </Label>
          <Input
            id="tx-note"
            maxLength={200}
            autoComplete="off"
            placeholder="Например, продукты на неделю"
            aria-invalid={Boolean(errors.note)}
            {...register("note")}
          />
          {errors.note && (
            <p className="text-xs leading-4 text-expense">
              {errors.note.message}
            </p>
          )}
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
            className="text-muted-foreground hover:text-expense"
          >
            {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
            Удалить
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
            {editing ? "Сохранить" : "Добавить"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  );
}
