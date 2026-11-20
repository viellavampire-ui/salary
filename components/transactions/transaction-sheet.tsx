"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { CategoryType } from "@/lib/categories";
import { TransactionForm } from "./transaction-form";
import type { EditableTransaction, FormCategory } from "./types";

export type TransactionSheetState =
  | { mode: "create"; type?: CategoryType }
  | { mode: "edit"; transaction: EditableTransaction }
  | null;

/** Панель операции: справа на компьютере, снизу на телефоне. */
export function TransactionSheet({
  state,
  categories,
  currency,
  onClose,
}: {
  state: TransactionSheetState;
  categories: FormCategory[];
  currency: string;
  onClose: () => void;
}) {
  return (
    <Sheet open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          // Новая операция — сразу в поле суммы
          if (state?.mode !== "create") return;
          e.preventDefault();
          document.getElementById("tx-amount")?.focus();
        }}
      >
        {state && (
          <TransactionForm
            key={state.mode === "edit" ? state.transaction.id : "new"}
            categories={categories}
            currency={currency}
            editing={state.mode === "edit" ? state.transaction : undefined}
            defaultType={state.mode === "create" ? state.type : undefined}
            onDone={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
