"use client";

import { Plus } from "lucide-react";

import { useOpenNewTransaction } from "@/components/transactions/new-transaction";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Кнопка «+ Операция». variant="header" — в шапке страницы (на телефоне
 * скрыта: там есть «+» в нижней панели), variant="inline" — видна всегда.
 */
export function NewTransactionButton({
  variant = "header",
  label = "Операция",
}: {
  variant?: "header" | "inline";
  label?: string;
}) {
  const open = useOpenNewTransaction();
  return (
    <Button
      onClick={open}
      className={cn(variant === "header" && "hidden md:inline-flex")}
    >
      <Plus />
      {label}
    </Button>
  );
}
