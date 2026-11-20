import type { NotificationKind } from "@/db/schema";
import { formatMoney, formatPercent } from "./money";
import { formatMonthLabel } from "./period";

export type BudgetAlert = {
  kind: NotificationKind;
  categoryId: string;
  categoryName: string;
  month: string;
  spent: number;
  limit: number;
};

/** «Бюджет «Кафе» превышен» / «Бюджет «Кафе»: потрачено 90%» */
export function alertTitle(
  a: Pick<BudgetAlert, "kind" | "categoryName" | "spent" | "limit">,
) {
  if (a.kind === "budget_over") return `Бюджет «${a.categoryName}» превышен`;
  return `Бюджет «${a.categoryName}»: потрачено ${formatPercent(a.spent / a.limit)}`;
}

/** «4 500 ₽ из 5 000 ₽ · Ноябрь 2026» */
export function alertDescription(
  a: Pick<BudgetAlert, "spent" | "limit" | "month">,
  currency: string,
) {
  return `${formatMoney(a.spent, currency)} из ${formatMoney(a.limit, currency)} · ${formatMonthLabel(a.month)}`;
}
