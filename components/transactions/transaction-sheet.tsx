"use client";

import dynamic from "next/dynamic";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryType } from "@/lib/categories";
import type { EditableTransaction, FormCategory } from "./types";

// Форма (Zod, react-hook-form, Server Actions) нужна только после нажатия
// «+», поэтому грузится отдельно и не утяжеляет каждую страницу
const TransactionForm = dynamic(
  () => import("./transaction-form").then((m) => m.TransactionForm),
  {
    loading: () => (
      <div className="flex flex-col gap-6 p-6" aria-busy>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    ),
  },
);

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
