"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TransactionSheet } from "./transaction-sheet";
import type { FormCategory } from "./types";

/**
 * Новая операция открывается с любой страницы: к текущему адресу добавляется
 * ?new=1, а панель живёт в общем каркасе (app/(app)/layout.tsx).
 * Открытое состояние хранится в URL — так его не «залипает» в скрытых
 * страницах (<Activity>), а кнопка «Назад» закрывает панель.
 */
export const NEW_PARAM = "new";

export function useOpenNewTransaction() {
  const router = useRouter();
  const pathname = usePathname();

  return () => {
    const params = new URLSearchParams(window.location.search);
    params.set(NEW_PARAM, "1");
    router.push(`${pathname}?${params}`, { scroll: false });
  };
}

export function NewTransactionSheet({
  categories,
  currency,
}: {
  categories: FormCategory[];
  currency: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get(NEW_PARAM) === "1";

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(NEW_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return (
    <TransactionSheet
      state={open ? { mode: "create" } : null}
      categories={categories}
      currency={currency}
      onClose={close}
    />
  );
}
