"use client";

import { toast } from "sonner";

import {
  alertDescription,
  alertTitle,
  type BudgetAlert,
} from "@/lib/notifications";

/**
 * Всплывающие сообщения о только что сработавших порогах бюджета.
 * Превышение — как ошибка (красное), 80% — как предупреждение.
 */
export function showBudgetAlerts(
  alerts: BudgetAlert[] | undefined,
  currency: string,
  open: (href: string) => void,
) {
  for (const a of alerts ?? []) {
    const show = a.kind === "budget_over" ? toast.error : toast.warning;
    show(alertTitle(a), {
      description: alertDescription(a, currency),
      duration: 8000,
      action: {
        label: "Открыть",
        onClick: () => open(`/budgets?period=${a.month}`),
      },
    });
  }
}
