"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/categories/category-icon";
import { showBudgetAlerts } from "@/components/notifications/alert-toasts";
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
import type { ActionResult } from "@/lib/action-result";
import type { CategoryColor } from "@/lib/categories";
import { currencySymbol, formatMoney, minorToInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  budgetSchema,
  type BudgetFormValues,
  type BudgetInput,
} from "@/lib/validations";
import {
  deleteBudgetAction,
  restoreBudgetAction,
  upsertBudgetAction,
} from "@/server/actions/budgets";

export type BudgetCategory = {
  id: string;
  name: string;
  icon: string;
  color: CategoryColor;
  /** Потрачено за текущий месяц — подсказка при выборе лимита */
  spent: number;
};

export type BudgetSheetState =
  | { mode: "create"; categoryId?: string }
  | { mode: "edit"; category: BudgetCategory; limit: number }
  | null;

export function BudgetSheet({
  state,
  available,
  currency,
  onClose,
}: {
  state: BudgetSheetState;
  /** Категории расходов без бюджета — для создания */
  available: BudgetCategory[];
  currency: string;
  onClose: () => void;
}) {
  return (
    <Sheet open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById("budget-amount")?.focus();
        }}
      >
        {state && (
          <BudgetForm
            key={
              state.mode === "edit"
                ? state.category.id
                : `new-${state.categoryId ?? ""}`
            }
            state={state}
            available={available}
            currency={currency}
            onDone={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BudgetForm({
  state,
  available,
  currency,
  onDone,
}: {
  state: NonNullable<BudgetSheetState>;
  available: BudgetCategory[];
  currency: string;
  onDone: () => void;
}) {
  const editing = state.mode === "edit" ? state : null;
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const [deleting, startDelete] = useTransition();

  const {
    register,
    handleSubmit,
    getValues,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues, unknown, BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: editing
      ? {
          categoryId: editing.category.id,
          amount: minorToInput(editing.limit),
        }
      : {
          categoryId:
            (state.mode === "create" && state.categoryId) ||
            available[0]?.id ||
            "",
          amount: "",
        },
  });

  const categoryId = useWatch({ control, name: "categoryId" });
  const selected = editing
    ? editing.category
    : available.find((c) => c.id === categoryId);

  function applyResult(result: ActionResult<unknown>) {
    if (result.ok) return true;
    setServerError(result.error);
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof BudgetFormValues, { message: messages[0] });
    }
    return false;
  }

  async function onSubmit() {
    setServerError(null);
    // На сервер — исходные значения: сумму в копейки переводит сервер
    const result = await upsertBudgetAction(getValues());
    if (!applyResult(result)) return;
    toast.success(editing ? "Лимит изменён" : "Бюджет создан");
    if (result.ok) {
      showBudgetAlerts(result.data.alerts, currency, (href) =>
        router.push(href),
      );
    }
    onDone();
  }

  function onDelete() {
    if (!editing) return;
    startDelete(async () => {
      const result = await deleteBudgetAction({
        categoryId: editing.category.id,
      });
      if (!applyResult(result)) return;
      onDone();
      if (result.ok) {
        const snapshot = result.data;
        toast("Бюджет удалён", {
          action: {
            label: "Отменить",
            onClick: async () => {
              const undo = await restoreBudgetAction(snapshot);
              if (!undo.ok) toast.error(undo.error);
            },
          },
        });
      }
    });
  }

  const busy = isSubmitting || deleting;
  const nothingToBudget = !editing && available.length === 0;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SheetHeader>
        <SheetTitle>
          {editing ? `Бюджет: ${editing.category.name}` : "Новый бюджет"}
        </SheetTitle>
        <SheetDescription>Месячный лимит трат по категории</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-6">
        {nothingToBudget ? (
          <p className="text-sm text-muted-foreground">
            У всех категорий расходов уже есть бюджет.
          </p>
        ) : (
          <>
            {!editing && (
              <fieldset aria-invalid={Boolean(errors.categoryId)}>
                <legend className="mb-2 text-sm font-medium">Категория</legend>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {available.map((c) => (
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
                        <span className="line-clamp-2 break-words">
                          {c.name}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.categoryId && (
                  <p className="mt-2 text-xs leading-4 text-expense">
                    {errors.categoryId.message}
                  </p>
                )}
              </fieldset>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="budget-amount">Лимит в месяц</Label>
              <div className="relative">
                <Input
                  id="budget-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby="budget-amount-hint"
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
              {errors.amount ? (
                <p className="text-xs leading-4 text-expense">
                  {errors.amount.message}
                </p>
              ) : (
                selected && (
                  <p
                    id="budget-amount-hint"
                    className="text-xs leading-4 text-muted-foreground"
                  >
                    В этом месяце уже потрачено{" "}
                    {formatMoney(selected.spent, currency)}
                  </p>
                )
              )}
            </div>
          </>
        )}

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
          <Button type="submit" disabled={busy || nothingToBudget}>
            {isSubmitting && <LoaderCircle className="animate-spin" />}
            {editing ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  );
}
